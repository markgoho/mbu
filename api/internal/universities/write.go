package universities

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"time"

	"mbu/api/internal/apierr"
	"mbu/api/internal/authn"
	"mbu/api/internal/authz"
	"mbu/api/internal/clock"
	"mbu/api/internal/pgerr"
)

// errNotBootstrapped is the 404 of a create for a caller with no users
// row: the Chancellor grant points at it. The app bootstraps the session
// first.
var errNotBootstrapped = &apierr.RefusalError{Status: http.StatusNotFound, Code: apierr.CodeNotFound,
	Message: "User not found; bootstrap the session first"}

// errExists is the 409 of a create whose id names a University that
// exists.
var errExists = &apierr.RefusalError{Status: http.StatusConflict, Code: apierr.CodeConflict, Message: "University already exists"}

// The constraints a create can break.
const (
	universitiesPkey = "universities_pkey"
	grantUIDFkey     = "role_grants_uid_fkey"
)

// wrongStatus is the 409 for a write the University's status does not
// allow (docs/api-design.md section 7: a University in the wrong status
// is a conflict). The TypeScript answered 400.
func wrongStatus(message string) *apierr.RefusalError {
	return &apierr.RefusalError{Status: http.StatusConflict, Code: apierr.CodeConflict, Message: message}
}

// assertEditable refuses a change to a University that is not draft or
// rejected: after submit, only moderation moves change it.
func assertEditable(status string) error {
	if status != "draft" && status != "rejected" {
		return wrongStatus("Only draft or rejected universities can be modified")
	}
	return nil
}

// Create is POST /api/universities: a draft University with the id the
// app made, and the caller's Chancellor grant on it, in one transaction.
// It answers 200, as the TypeScript did. The route is replayable, so it
// sets no header but Content-Type.
func Create(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		f, ok := decodeUniversity(w, r, true)
		if !ok {
			return
		}
		if details := checkOrder(*f.startDate, f.endDate.t, f.registrationOpensAt.t, *f.registrationClosesAt); len(details) > 0 {
			apierr.Write(w, http.StatusBadRequest, apierr.CodeInvalidArgument, msgCheckForm, details)
			return
		}
		u, err := createUniversity(r.Context(), db, caller(r).UID, f, clock.Now(r.Context()))
		if err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		apierr.WriteJSON(w, http.StatusOK, u.response())
	})
}

func createUniversity(ctx context.Context, db *sql.DB, uid string, f universityFields, now time.Time) (university, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return university{}, fmt.Errorf("universities: begin create: %w", err)
	}
	defer rollback(tx)

	l := f.location
	u, err := scanUniversity(tx.QueryRowContext(ctx, `INSERT INTO universities (id, title, status, timezone,
			start_date, end_date, registration_opens_at, registration_closes_at, location_name, location_address,
			location_city, location_state, location_zip, created_by_uid, created_at, updated_at)
		VALUES ($1, $2, 'draft', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)
		RETURNING `+universityColumns, *f.id, *f.title, *f.timezone, *f.startDate, f.endDate.t,
		f.registrationOpensAt.t, *f.registrationClosesAt, l.Name, l.Address, l.City, l.State, l.Zip, uid, now))
	if pgerr.IsUniqueViolationOn(err, universitiesPkey) {
		return university{}, errExists
	}
	if err != nil {
		// coverage:ignore reason: a database failure inside the create transaction, not reachable from a test
		return university{}, fmt.Errorf("universities: insert university: %w", err)
	}
	_, err = tx.ExecContext(ctx, `INSERT INTO role_grants (role, university_id, uid, status, created_at, updated_at)
		VALUES ('chancellor', $1, $2, 'active', $3, $3)`, u.id, uid, now)
	if pgerr.IsForeignKeyViolationOn(err, grantUIDFkey) {
		return university{}, errNotBootstrapped
	}
	if err != nil {
		// coverage:ignore reason: a database failure inside the create transaction, not reachable from a test
		return university{}, fmt.Errorf("universities: insert chancellor grant: %w", err)
	}
	if err := tx.Commit(); err != nil {
		// coverage:ignore reason: a database failure inside the create transaction, not reachable from a test
		return university{}, fmt.Errorf("universities: commit create: %w", err)
	}
	return u, nil
}

// Patch is PATCH /api/universities/{id}: it changes the fields the
// request names, on a draft or rejected University, for its Chancellor
// or a Super-admin. A field left out keeps its value; endDate and
// registrationOpensAt may be null to clear them. The field checks run
// first; the date-order rules run on the merged values, after the
// status check.
func Patch(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		f, ok := decodeUniversity(w, r, false)
		if !ok {
			return
		}
		u, details, err := patchUniversity(r.Context(), db, caller(r), r.PathValue("id"), f, clock.Now(r.Context()))
		if err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		if len(details) > 0 {
			apierr.Write(w, http.StatusBadRequest, apierr.CodeInvalidArgument, msgCheckForm, details)
			return
		}
		apierr.WriteJSON(w, http.StatusOK, u.response())
	})
}

// patchUniversity is the one transaction of Patch. It returns the date
// order problems, if any, in place of a change.
func patchUniversity(ctx context.Context, db *sql.DB, c authn.Caller, id string, f universityFields,
	now time.Time,
) (university, map[string]string, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return university{}, nil, fmt.Errorf("universities: begin patch: %w", err)
	}
	defer rollback(tx)

	if err := authz.AssertChancellorOf(ctx, tx, c, id); err != nil {
		return university{}, nil, err //nolint:wrapcheck // a refusal, or authz wraps it with its own context
	}
	u, err := scanUniversity(tx.QueryRowContext(ctx, `SELECT `+universityColumns+` FROM universities
		WHERE id = $1 FOR UPDATE`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return university{}, nil, errNotFound
	}
	if err != nil {
		// coverage:ignore reason: a database failure inside the patch transaction, not reachable from a test
		return university{}, nil, fmt.Errorf("universities: lock university: %w", err)
	}
	if err := assertEditable(u.status); err != nil {
		return university{}, nil, err
	}

	u.apply(f)
	if details := checkOrder(u.startDate, nullable(u.endDate), nullable(u.registrationOpensAt), u.registrationClosesAt); len(details) > 0 {
		return university{}, details, nil
	}
	l := u.location
	u, err = scanUniversity(tx.QueryRowContext(ctx, `UPDATE universities
		SET title = $2, timezone = $3, start_date = $4, end_date = $5, registration_opens_at = $6,
		    registration_closes_at = $7, location_name = $8, location_address = $9, location_city = $10,
		    location_state = $11, location_zip = $12, updated_at = $13
		WHERE id = $1
		RETURNING `+universityColumns, id, u.title, u.timezone, u.startDate, u.endDate, u.registrationOpensAt,
		u.registrationClosesAt, l.Name, l.Address, l.City, l.State, l.Zip, now))
	if err != nil {
		// coverage:ignore reason: a database failure inside the patch transaction, not reachable from a test
		return university{}, nil, fmt.Errorf("universities: update university: %w", err)
	}
	if err := tx.Commit(); err != nil {
		// coverage:ignore reason: a database failure inside the patch transaction, not reachable from a test
		return university{}, nil, fmt.Errorf("universities: commit patch: %w", err)
	}
	return u, nil, nil
}

// apply sets each field the patch names.
func (u *university) apply(f universityFields) {
	if f.title != nil {
		u.title = *f.title
	}
	if f.timezone != nil {
		u.timezone = *f.timezone
	}
	if f.startDate != nil {
		u.startDate = *f.startDate
	}
	if f.endDate.set {
		u.endDate = nullTime(f.endDate.t)
	}
	if f.registrationOpensAt.set {
		u.registrationOpensAt = nullTime(f.registrationOpensAt.t)
	}
	if f.registrationClosesAt != nil {
		u.registrationClosesAt = *f.registrationClosesAt
	}
	if f.location != nil {
		u.location = *f.location
	}
}

// nullTime is t as a nullable column value.
func nullTime(t *time.Time) sql.NullTime {
	if t == nil {
		return sql.NullTime{}
	}
	return sql.NullTime{Time: *t, Valid: true}
}

// nullable is a nullable column value as a pointer.
func nullable(t sql.NullTime) *time.Time {
	if !t.Valid {
		return nil
	}
	return &t.Time
}

// Delete is DELETE /api/universities/{id}: it deletes a draft University
// for its Chancellor or a Super-admin. The foreign keys cascade to its
// Periods, Classes (with their Registrations, Counselors and Period
// links) and Role Grants (docs/data-model.md, "Delete and purge
// behavior").
func Delete(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := deleteUniversity(r.Context(), db, caller(r), r.PathValue("id")); err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
}

// deleteUniversity is the one transaction of Delete: the role check, the
// University lock and its status check, then the DELETE.
func deleteUniversity(ctx context.Context, db *sql.DB, c authn.Caller, id string) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("universities: begin delete: %w", err)
	}
	defer rollback(tx)

	status, err := lockUniversity(ctx, tx, c, id)
	if err != nil {
		return err
	}
	if status != "draft" {
		return wrongStatus("Only draft universities can be deleted")
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM universities WHERE id = $1`, id); err != nil {
		// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
		return fmt.Errorf("universities: delete university: %w", err)
	}
	if err := tx.Commit(); err != nil {
		// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
		return fmt.Errorf("universities: commit delete: %w", err)
	}
	return nil
}
