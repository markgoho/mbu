// Package retention is the Retention Purge (CONTEXT.md), on the internal
// boundary: POST /api/internal/retention/purge. It was the retention-api
// Cloud Function (functions/src/retention-api). Cloud Scheduler calls it
// once a day (#261); the router puts it behind the caller identity guard
// (ADR 0005), so the handler has no auth code.
package retention

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"mbu/api/internal/apierr"
	"mbu/api/internal/clock"
	"mbu/api/internal/idempotency"
	"mbu/api/internal/policy"
	"mbu/api/internal/ratelimit"
)

// retentionWindow is how long after its effective end a University keeps the
// personal data of its Registrations.
const retentionWindow = policy.RetentionWindowDays * 24 * time.Hour

// PurgeResponse is the body of a purge, as the TypeScript sent it.
// UniversitiesProcessed counts each University past the window, also one
// with nothing left to purge; RegistrationsPurged counts the
// Registrations this run purged. A second run gives the same
// UniversitiesProcessed and 0.
type PurgeResponse struct {
	UniversitiesProcessed int64 `json:"universitiesProcessed"`
	RegistrationsPurged   int64 `json:"registrationsPurged"`
}

// Purge is POST /api/internal/retention/purge. It does three independent
// jobs, each idempotent: it purges the Registrations of each University
// whose effective end is more than the window before now, it deletes
// the idempotency keys older than 48 hours, and it deletes the
// rate-limit buckets whose window has ended. It runs all three when one
// fails, logs the counts (0 for a step that failed), and then answers
// 500, so the next run tries again.
func Purge(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		now := clock.Now(ctx)
		resp, purgeErr := purgeRegistrations(ctx, db, now)
		keys, keysErr := idempotency.PurgeExpired(ctx, db, now)
		buckets, bucketsErr := ratelimit.PurgeExpired(ctx, db, now)
		log.Printf("retention: purged %d registrations of %d universities, %d idempotency keys, %d rate-limit buckets",
			resp.RegistrationsPurged, resp.UniversitiesProcessed, keys, buckets)
		if err := errors.Join(purgeErr, keysErr, bucketsErr); err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		apierr.WriteJSON(w, http.StatusOK, resp)
	})
}

// purgeRegistrations sets the six snapshot columns of each Registration
// not yet purged to NULL and stamps purged_at, for each University whose
// effective end (end_date, else start_date) is before now minus the
// window. The row stays, with its status, timestamps and the consent
// record (parent_consent_at, accepted_policy_version). The same
// statement clears the Parent's address (to_email) of the University's
// mail outbox rows, which stay as the Youth-Protection audit record. It is one
// statement; docs/data-model.md says why it is outside the lock order.
func purgeRegistrations(ctx context.Context, db *sql.DB, now time.Time) (PurgeResponse, error) {
	var resp PurgeResponse
	err := db.QueryRowContext(ctx,
		`WITH due AS (
		     SELECT id FROM universities WHERE COALESCE(end_date, start_date) < $1
		 ), purged AS (
		     UPDATE registrations r
		     SET scout_first_name = NULL, scout_last_name = NULL, scout_unit = NULL,
		         accommodations = NULL, parent_name = NULL, parent_email = NULL,
		         purged_at = $2, updated_at = $2
		     FROM classes c
		     WHERE c.id = r.class_id AND c.university_id IN (SELECT id FROM due) AND r.purged_at IS NULL
		     RETURNING 1
		 ), mail AS (
		     UPDATE registration_mail_outbox SET to_email = NULL
		     WHERE university_id IN (SELECT id FROM due) AND to_email IS NOT NULL
		 )
		 SELECT (SELECT count(*) FROM due), (SELECT count(*) FROM purged)`,
		now.Add(-retentionWindow), now,
	).Scan(&resp.UniversitiesProcessed, &resp.RegistrationsPurged)
	if err != nil {
		return PurgeResponse{}, fmt.Errorf("retention: purge registrations: %w", err)
	}
	return resp, nil
}
