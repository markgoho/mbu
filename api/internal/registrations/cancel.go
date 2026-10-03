package registrations

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"

	"mbu/api/internal/apierr"
	"mbu/api/internal/authn"
	"mbu/api/internal/authz"
	"mbu/api/internal/clock"
	"mbu/api/internal/seats"
)

// errRegistrationNotFound is the 404 for a Registration that is absent,
// already cancelled, or in a Class of another University.
var errRegistrationNotFound = refusal(http.StatusNotFound, apierr.CodeNotFound, "Registration not found")

// Cancel is DELETE /api/registrations/{universityId}/{classId}/{scoutId}:
// it cancels the caller's Scout's enrolled or waitlisted Registration (a
// soft delete) and, when that frees a seat, enrolls the oldest Scout on
// the Waitlist. It answers 204.
func Cancel(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		err := cancel(r.Context(), db, caller(r), r.PathValue("universityId"), r.PathValue("classId"), r.PathValue("scoutId"))
		if err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
}

// cancel is the one transaction of Cancel, in the TypeScript order:
// University missing, Registration Window close, Scout ownership, then
// the Registration. It takes the University FOR SHARE, then
// seats.CancelAndPromote takes the Class and the registrations rows. It
// does not lock the Scout: a cancel cannot make a Period Conflict.
func cancel(ctx context.Context, db *sql.DB, c authn.Caller, universityID, classID, scoutID string) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("registrations: begin cancel: %w", err)
	}
	defer rollback(tx)

	win, found, err := lockUniversity(ctx, tx, universityID)
	if err != nil {
		// coverage:ignore reason: a database failure inside the cancel transaction, not reachable from a test
		return err
	}
	if !found {
		return errUniversityNotFound
	}
	now := clock.Now(ctx)
	bypass, err := authz.IsChancellorOf(ctx, tx, c, universityID)
	if err != nil {
		// coverage:ignore reason: a database failure inside the cancel transaction, not reachable from a test
		return err //nolint:wrapcheck // authz wraps it with its own context
	}
	if err := win.cancelRefusal(bypass, now); err != nil {
		return err
	}
	if err := authz.AssertOwnsScout(ctx, tx, c, scoutID); err != nil {
		return err //nolint:wrapcheck // a refusal, or an error authz wrapped
	}
	id, ok := parseID(classID)
	if !ok {
		return errRegistrationNotFound
	}
	cancelled, err := seats.CancelAndPromote(ctx, tx, now, universityID, id.String(), scoutID)
	if err != nil {
		// coverage:ignore reason: a database failure inside the cancel transaction, not reachable from a test
		return err //nolint:wrapcheck // seats wraps it with its own context
	}
	if !cancelled {
		return errRegistrationNotFound
	}
	if err := tx.Commit(); err != nil {
		// coverage:ignore reason: a database failure inside the cancel transaction, not reachable from a test
		return fmt.Errorf("registrations: commit cancel: %w", err)
	}
	return nil
}
