// Package regmail is the Registration mail outbox (#257, ADR 0004):
// table registration_mail_outbox. Register writes the "registered" or
// "waitlisted" row, and seats.CancelAndPromote the "promoted" row, in the
// transaction of the seat change (Enqueue). The drain sends them
// (Worker). It replaces the in-request Mailgun send and the emailLog of
// functions/src/registrations-api/services/notifier: the outbox row is
// the Youth-Protection audit record, with ids, the subject and the
// address, never a name or a mail body.
package regmail

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"time"

	"mbu/api/internal/clock"
	"mbu/api/internal/mail"
	"mbu/api/internal/outbox"
)

// Kind is which mail a row sends.
type Kind string

const (
	// KindRegistered is the mail of a Registration that took a seat.
	KindRegistered Kind = "registered"
	// KindWaitlisted is the mail of a Registration on the Waitlist.
	KindWaitlisted Kind = "waitlisted"
	// KindPromoted is the mail of a Scout that a cancel moved from the
	// Waitlist to enrolled.
	KindPromoted Kind = "promoted"
)

// ErrorMissingEmail is the error_id of a row whose Parent has no email
// address at send time, as the TypeScript recorded it. The row goes to
// the dead-letter state at once.
const ErrorMissingEmail = "missing_email"

// Name names this outbox in the drain's log and 500 body.
const Name = "registration-mail"

// The statuses of a row.
const (
	statusPending = "pending"
	statusSent    = "sent"
	statusFailed  = "failed"
)

// MaxBatch bounds how many rows one drain call sends.
const MaxBatch = 100

// claimBudget bounds how long one drain call keeps claiming rows. A row
// claimed before it ends still gets its send (at most 10 seconds), so one
// call stays under about a minute even when Mailgun hangs; the next
// Scheduler call takes the rest.
const claimBudget = 45 * time.Second

// Enqueue writes one pending mail of kind about the Scout's Registration
// in the Class, in tx, due at now. The Parent is the Scout's, read in the
// same statement; delivery reads the Parent's address at send time.
func Enqueue(ctx context.Context, tx *sql.Tx, now time.Time, kind Kind, universityID, classID, scoutID string) error {
	res, err := tx.ExecContext(ctx, `INSERT INTO registration_mail_outbox
		    (kind, to_parent_uid, scout_id, class_id, university_id, next_attempt_at, created_at)
		SELECT $1, parent_uid, id, $3, $4, $5, $5 FROM scouts WHERE id = $2`,
		string(kind), scoutID, classID, universityID, now)
	if err != nil {
		// coverage:ignore reason: a database failure inside the caller's transaction, not reachable from a test
		return fmt.Errorf("regmail: enqueue %s: %w", kind, err)
	}
	if n, err := res.RowsAffected(); err != nil || n != 1 {
		// coverage:ignore reason: each caller holds the Scout row, so the Scout exists
		return fmt.Errorf("regmail: enqueue %s: no Scout %s (rows %d): %w", kind, scoutID, n, err)
	}
	return nil
}

// Worker sends the due rows through Sender.
type Worker struct {
	Sender mail.Sender
}

// Registration is this outbox's entry in the drain's registry.
func (w Worker) Registration() outbox.Registration {
	return outbox.Registration{Name: Name, Worker: w}
}

// Process sends up to MaxBatch due rows, and claims none after
// claimBudget, each in its own transaction:
// claim one row FOR UPDATE SKIP LOCKED, send it, record the result,
// commit. Two drains at once never claim the same row, and a drain cut
// off mid-batch can send at most one mail twice. A failed send is
// recorded on the row and is not an error of Process.
func (w Worker) Process(ctx context.Context, db *sql.DB) error {
	budget, cancel := context.WithTimeout(ctx, claimBudget)
	defer cancel()
	for range MaxBatch {
		if budget.Err() != nil {
			// coverage:ignore reason: the 45-second claim budget, which a test does not wait for
			return ctx.Err() //nolint:wrapcheck // nil unless the request itself ended
		}
		more, err := w.sendOne(ctx, db)
		if err != nil || !more {
			return err
		}
	}
	return nil
}

// claimed is one due row and what its mail needs.
type claimed struct {
	id         string
	kind       Kind
	attempts   int
	email      string
	badgeTitle string
}

// sendOne sends the oldest due row. more is false when no row was due.
func (w Worker) sendOne(ctx context.Context, db *sql.DB) (more bool, err error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return false, fmt.Errorf("regmail: begin: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	now := clock.Now(ctx)
	var row claimed
	err = tx.QueryRowContext(ctx, `SELECT o.id, o.kind, o.attempts, u.email, c.badge_title
		FROM registration_mail_outbox o
		JOIN users u ON u.uid = o.to_parent_uid
		JOIN classes c ON c.id = o.class_id
		WHERE o.status = 'pending' AND o.next_attempt_at <= $1
		ORDER BY o.next_attempt_at, o.id
		LIMIT 1
		FOR UPDATE OF o SKIP LOCKED`, now).Scan(&row.id, &row.kind, &row.attempts, &row.email, &row.badgeTitle)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		// coverage:ignore reason: a database failure inside the drain transaction, not reachable from a test
		return false, fmt.Errorf("regmail: claim: %w", err)
	}

	if err := mark(ctx, tx, row, w.deliver(ctx, row), now); err != nil {
		// coverage:ignore reason: a database failure inside the drain transaction, not reachable from a test
		return false, err
	}
	if err := tx.Commit(); err != nil {
		// coverage:ignore reason: a database failure inside the drain transaction, not reachable from a test
		return false, fmt.Errorf("regmail: commit: %w", err)
	}
	return true, nil
}

// result is the outcome of one attempt.
type result struct {
	subject   string
	toEmail   string
	messageID string
	errorID   string
	permanent bool
}

// deliver renders the row's mail and sends it to the Parent's current
// address. An empty address is not sent: missing_email, permanent.
func (w Worker) deliver(ctx context.Context, row claimed) result {
	msg := render(row.kind, row.badgeTitle, row.email)
	res := result{subject: msg.Subject, toEmail: row.email}
	if row.email == "" {
		res.errorID, res.permanent = ErrorMissingEmail, true
		return res
	}
	id, err := w.Sender.Send(ctx, msg)
	if err != nil {
		res.errorID, res.permanent = mail.Classify(err)
		log.Printf("regmail: send %s (%s, attempt %d): %v", row.id, row.kind, row.attempts+1, err)
		return res
	}
	res.messageID = id
	return res
}

// mark records res on the row: sent; or failed and due again after the
// retry wait; or failed for good (the dead-letter state) when the error
// is permanent or no attempt is left.
func mark(ctx context.Context, tx *sql.Tx, row claimed, res result, now time.Time) error {
	attempts := row.attempts + 1
	status, next, sentAt := statusSent, sql.NullTime{}, sql.NullTime{Time: now, Valid: true}
	if res.errorID != "" {
		sentAt = sql.NullTime{}
		retryAt, deadLetter := outbox.Retry(attempts, now)
		if res.permanent || deadLetter {
			status = statusFailed
		} else {
			status, next = statusPending, sql.NullTime{Time: retryAt, Valid: true}
		}
	}
	if _, err := tx.ExecContext(ctx, `UPDATE registration_mail_outbox
		SET status = $2, attempts = $3, next_attempt_at = COALESCE($4, next_attempt_at), sent_at = $5,
		    mailgun_message_id = NULLIF($6, ''), error_id = NULLIF($7, ''), subject = $8, to_email = NULLIF($9, '')
		WHERE id = $1`,
		row.id, status, attempts, next, sentAt, res.messageID, res.errorID, res.subject, res.toEmail); err != nil {
		// coverage:ignore reason: a database failure inside the drain transaction, not reachable from a test
		return fmt.Errorf("regmail: mark %s: %w", row.id, err)
	}
	return nil
}
