// Package seats cancels a Registration and gives its seat to the next
// Scout on the Waitlist. It is the one shared function of
// docs/data-model.md, "Cancel and promote (one function, shared)": the
// Registration cancel (#254), the Scout delete (#250) and the account
// delete (#249) all call it inside their own transaction.
//
// The callers hold the lock order of docs/data-model.md, "Lock order":
// the scouts rows, then the University, then the Class, then the
// registrations rows.
//
// A promotion writes the "promoted" mail to the outbox (regmail) in the
// same transaction, so every caller sends it.
package seats

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"mbu/api/internal/regmail"
)

// CancelAndPromote cancels the enrolled or waitlisted Registration of the
// Scout in the Class, in tx. When that Registration was enrolled, the
// oldest waitlisted Registration of the Class takes the seat, enrolled at
// now, and its "promoted" mail goes into the outbox. It returns cancelled
// false when the Class is not a Class of the University, or the
// Registration is absent or already cancelled (#254 answers 404 then).
//
// The caller holds the University row FOR SHARE. CancelAndPromote takes
// the Class row and the registrations rows FOR UPDATE. It does not lock
// the Scout: a cancel only removes a possible Period Conflict.
func CancelAndPromote(ctx context.Context, tx *sql.Tx, now time.Time, universityID, classID, scoutID string) (cancelled bool, err error) {
	var locked string
	err = tx.QueryRowContext(ctx,
		`SELECT id FROM classes WHERE id = $1 AND university_id = $2 FOR UPDATE`, classID, universityID).Scan(&locked)
	if errors.Is(err, sql.ErrNoRows) {
		// A Class of another University: its Registrations are not in
		// this University, so there is nothing to cancel here.
		return false, nil
	}
	if err != nil {
		// coverage:ignore reason: a database failure inside the cancel transaction, not reachable from a test
		return false, fmt.Errorf("seats: lock class: %w", err)
	}
	var status string
	err = tx.QueryRowContext(ctx, `SELECT status FROM registrations
		WHERE class_id = $1 AND scout_id = $2 FOR UPDATE`, classID, scoutID).Scan(&status)
	if errors.Is(err, sql.ErrNoRows) || (err == nil && status == "cancelled") {
		return false, nil
	}
	if err != nil {
		// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
		return false, fmt.Errorf("seats: lock registration: %w", err)
	}
	if _, err := tx.ExecContext(ctx, `UPDATE registrations SET status = 'cancelled', updated_at = $3
		WHERE class_id = $1 AND scout_id = $2`, classID, scoutID, now); err != nil {
		// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
		return false, fmt.Errorf("seats: cancel: %w", err)
	}
	if status != "enrolled" {
		return true, nil
	}

	var next string
	err = tx.QueryRowContext(ctx, `SELECT scout_id FROM registrations
		WHERE class_id = $1 AND status = 'waitlisted'
		ORDER BY waitlisted_at, scout_id
		LIMIT 1
		FOR UPDATE`, classID).Scan(&next)
	if errors.Is(err, sql.ErrNoRows) {
		return true, nil
	}
	if err != nil {
		// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
		return false, fmt.Errorf("seats: read waitlist: %w", err)
	}
	if _, err := tx.ExecContext(ctx, `UPDATE registrations
		SET status = 'enrolled', enrolled_at = $3, waitlisted_at = NULL, updated_at = $3
		WHERE class_id = $1 AND scout_id = $2`, classID, next, now); err != nil {
		// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
		return false, fmt.Errorf("seats: promote: %w", err)
	}
	if err := regmail.Enqueue(ctx, tx, now, regmail.KindPromoted, universityID, classID, next); err != nil {
		// coverage:ignore reason: a database failure inside the cancel transaction, not reachable from a test
		return false, err //nolint:wrapcheck // regmail wraps it with its own context
	}
	return true, nil
}

// CancelActiveOfScouts runs CancelAndPromote for each enrolled or
// waitlisted Registration of the Scouts, in tx. Each promotion writes
// its mail to the outbox. The caller holds the scouts rows FOR UPDATE, in ascending
// id order. The Registrations of all the Scouts are collected together
// and cancelled in ascending (University, Class) order, each after a
// FOR SHARE lock on its University: one Scout at a time could take Class
// locks out of order (docs/data-model.md, "Cancel and promote").
func CancelActiveOfScouts(ctx context.Context, tx *sql.Tx, now time.Time, scoutIDs []string) error {
	if len(scoutIDs) == 0 {
		return nil
	}
	rows, err := tx.QueryContext(ctx, `SELECT c.university_id, r.class_id, r.scout_id
		FROM registrations r JOIN classes c ON c.id = r.class_id
		WHERE r.scout_id = ANY($1::uuid[]) AND r.status IN ('enrolled', 'waitlisted')
		ORDER BY c.university_id, r.class_id, r.scout_id`, scoutIDs)
	if err != nil {
		// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
		return fmt.Errorf("seats: read active registrations: %w", err)
	}
	all, err := scanActive(rows)
	if err != nil {
		// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
		return err
	}

	for _, a := range all {
		if _, err := tx.ExecContext(ctx,
			`SELECT id FROM universities WHERE id = $1 FOR SHARE`, a.universityID); err != nil {
			// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
			return fmt.Errorf("seats: lock university: %w", err)
		}
		if _, err := CancelAndPromote(ctx, tx, now, a.universityID, a.classID, a.scoutID); err != nil {
			// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
			return err
		}
	}
	return nil
}

// active is one enrolled or waitlisted Registration to cancel.
type active struct{ universityID, classID, scoutID string }

// scanActive reads every row of rows and closes it.
func scanActive(rows *sql.Rows) ([]active, error) {
	defer func() { _ = rows.Close() }()
	var all []active
	for rows.Next() {
		var a active
		if err := rows.Scan(&a.universityID, &a.classID, &a.scoutID); err != nil {
			// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
			return nil, fmt.Errorf("seats: scan active registration: %w", err)
		}
		all = append(all, a)
	}
	if err := rows.Err(); err != nil {
		// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
		return nil, fmt.Errorf("seats: read active registrations: %w", err)
	}
	return all, nil
}
