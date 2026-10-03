package users

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"mbu/api/internal/apierr"
	"mbu/api/internal/authn"
	"mbu/api/internal/clock"
	"mbu/api/internal/seats"
)

// errCloseEventsFirst refuses to delete the account of a Chancellor of a
// University that is neither draft nor closed.
var errCloseEventsFirst = &apierr.RefusalError{
	Status:  http.StatusForbidden,
	Code:    apierr.CodeCloseEventsFirst,
	Message: "Close your events first",
}

// Delete is DELETE /api/users/me: account deletion (docs/data-model.md,
// "Delete and purge behavior").
//
// The order is the database first, then the Firebase Auth account. One
// transaction refuses a Chancellor of an open University, cancels each
// active Registration of the account's Scouts (a freed seat goes to the
// Waitlist), and deletes the users row; the cascades remove the Scouts,
// their Registrations, the Role Grants, the class_counselors rows and the
// stored Idempotency-Key responses. After the commit the Auth account
// goes. If that fails, the answer is a 500 and the state is a login with
// no data: the ID token still verifies, so a retry finds no row, deletes
// nothing more, and deletes the Auth account. The other order could leave
// personal data with no login to delete it.
func Delete(db *sql.DB, accounts authn.AccountManager) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c := caller(r)
		if err := deleteAccountData(r.Context(), db, c.UID, clock.Now(r.Context())); err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		if err := accounts.DeleteAccount(r.Context(), c.UID); err != nil {
			apierr.WriteInternal(w, r, fmt.Errorf("users: delete auth account: %w", err))
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
}

// deleteAccountData is the database half of Delete, in one transaction.
// It takes the locks in the order of docs/data-model.md, "Lock order":
// the account's Scouts, then the Universities.
func deleteAccountData(ctx context.Context, db *sql.DB, uid string, now time.Time) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("users: begin delete: %w", err)
	}
	defer rollback(tx)

	scoutIDs, err := lockScouts(ctx, tx, uid)
	if err != nil {
		// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
		return err
	}

	// The Universities the account is a Chancellor of, locked FOR SHARE
	// first, so none moves out of draft or closed after the check and
	// before the grants go.
	if _, err := tx.ExecContext(ctx, `SELECT u.id FROM role_grants g JOIN universities u ON u.id = g.university_id
		WHERE g.uid = $1 AND g.role = 'chancellor' AND g.status = 'active'
		ORDER BY u.id FOR SHARE OF u`, uid); err != nil {
		// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
		return fmt.Errorf("users: lock chancellor universities: %w", err)
	}
	var open bool
	if err := tx.QueryRowContext(ctx, `SELECT EXISTS (
		SELECT 1 FROM role_grants g JOIN universities u ON u.id = g.university_id
		WHERE g.uid = $1 AND g.role = 'chancellor' AND g.status = 'active'
		  AND u.status NOT IN ('draft', 'closed'))`, uid).Scan(&open); err != nil {
		// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
		return fmt.Errorf("users: read chancellor grants: %w", err)
	}
	if open {
		return errCloseEventsFirst
	}

	// #257 writes the "promoted" mail for each Promotion here.
	if _, err := seats.CancelActiveOfScouts(ctx, tx, now, scoutIDs); err != nil {
		// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
		return err //nolint:wrapcheck // seats wraps it with its own context
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM users WHERE uid = $1`, uid); err != nil {
		// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
		return fmt.Errorf("users: delete user: %w", err)
	}
	if err := tx.Commit(); err != nil {
		// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
		return fmt.Errorf("users: commit delete: %w", err)
	}
	return nil
}

// lockScouts locks the account's Scouts FOR UPDATE in ascending id order
// and returns their ids.
func lockScouts(ctx context.Context, tx *sql.Tx, uid string) ([]string, error) {
	rows, err := tx.QueryContext(ctx, `SELECT id FROM scouts WHERE parent_uid = $1 ORDER BY id FOR UPDATE`, uid)
	if err != nil {
		// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
		return nil, fmt.Errorf("users: lock scouts: %w", err)
	}
	defer func() { _ = rows.Close() }()
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
			return nil, fmt.Errorf("users: scan scout: %w", err)
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
		return nil, fmt.Errorf("users: read scouts: %w", err)
	}
	return ids, nil
}
