// Package outbox is the machinery of ADR 0004: a request writes a mail
// row in the transaction of its state change, and one internal endpoint,
// POST /api/internal/outboxes/drain, sends the due rows. Copied from
// doula-cloud's internal/outbox (ADR-0010 with its #481 amendment)
// without the row-level-security doors, the Cloud Tasks nudge and the
// per-outbox endpoints: MBU has one outbox and no nudge in v1.
//
// What differs between outboxes (table, claim, recipient, copy) lives in
// each outbox's own package. This package holds what they share: the
// retry schedule, the registry and the drain.
package outbox

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"strings"
	"time"

	"mbu/api/internal/apierr"
)

// DrainPath is the one endpoint Cloud Scheduler calls each minute (#261).
const DrainPath = "/api/internal/outboxes/drain"

// MaxAttempts is how many sends a row gets. A row whose last attempt
// fails goes to the dead-letter state.
const MaxAttempts = 5

// retryWaits is the wait after failed attempt n (1-based) before
// attempt n+1: about nine hours from the first try to the last.
var retryWaits = [MaxAttempts - 1]time.Duration{
	5 * time.Minute,
	30 * time.Minute,
	2 * time.Hour,
	6 * time.Hour,
}

// Retry is when a row that has now failed attempts times is due again,
// or deadLetter true when it has no attempt left.
func Retry(attempts int, now time.Time) (next time.Time, deadLetter bool) {
	if attempts >= MaxAttempts {
		return time.Time{}, true
	}
	return now.Add(retryWaits[attempts-1]), false
}

// Processor sends the due rows of one outbox. It returns an error only
// when the outbox itself failed (the database, or the drain's context);
// a failed send is a fact the Processor records on the row.
type Processor interface {
	Process(ctx context.Context, db *sql.DB) error
}

// Registration is one outbox the drain runs: a name for the log and the
// 500 body, and its Processor.
type Registration struct {
	Name   string
	Worker Processor
}

// Drain is POST /api/internal/outboxes/drain. It runs each registered
// outbox in turn, also after one fails, and answers 200 only when each
// one succeeded; otherwise 500 INTERNAL naming the ones that failed, so
// the Scheduler job shows red and retries. The router puts it behind the
// caller identity guard (ADR 0005).
func Drain(db *sql.DB, registrations []Registration) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var failed []string
		for _, reg := range registrations {
			if err := reg.Worker.Process(r.Context(), db); err != nil {
				log.Printf("outbox: drain %s: %v", reg.Name, err)
				failed = append(failed, reg.Name)
			}
		}
		if len(failed) > 0 {
			apierr.Write(w, http.StatusInternalServerError, apierr.CodeInternal,
				"drain failed: "+strings.Join(failed, ", "), nil)
			return
		}
		w.WriteHeader(http.StatusOK)
	})
}
