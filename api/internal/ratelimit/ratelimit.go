// Package ratelimit is docs/api-design.md section 6's defensive rate
// limit, applied as a decorator a handler wraps in -- the same shape as
// idempotency.Wrap. Copied from doula-cloud (#247), with IPRule as the
// one rule kind and a log line, not a table row, for a refusal.
//
// Counters live in Postgres (rate_limit_buckets), not in process memory:
// Cloud Run can run more than one instance, so an in-process counter
// would not limit anything. Wrap runs its own short statement, outside
// any transaction of the handler behind it.
//
// Time comes from the clock seam (clock.Now on the request context) and
// goes into the SQL as a parameter, so the window start and Retry-After
// are read from one clock, and a test can move it.
package ratelimit

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
	"time"

	"mbu/api/internal/apierr"
	"mbu/api/internal/clientip"
	"mbu/api/internal/clock"
)

// Querier is the one method Wrap needs from the database: *sql.DB in
// the service, and also *sql.Conn, so a test can count through two
// separate database sessions.
type Querier interface {
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

// Rule is one dimension a request is checked and counted against,
// independently of every other Rule passed to Wrap with it.
type Rule struct {
	// Dimension names this Rule in the bucket key and in the refusal
	// log line: "ip", for example.
	Dimension string
	// Key extracts this Rule's value from the request.
	Key func(r *http.Request) string
	// Max is how many requests within Window one key may make before
	// Wrap refuses the next one.
	Max int
	// Window is the fixed period Max applies over. It starts at the
	// first request of a key and restarts at the first request after it
	// ends.
	Window time.Duration
}

// IPRule limits by resolver.From(r), the caller's address. There is always an
// address, so the rule applies to every request. A route passes
// Deps.ClientIP, so the key trusts the proxy hops the deployment sets.
func IPRule(resolver clientip.Resolver, maxRequests int, window time.Duration) Rule {
	return Rule{Dimension: "ip", Key: resolver.From, Max: maxRequests, Window: window}
}

// Wrap enforces every rule in rules against db, keyed per rule by
// endpoint plus the rule's Dimension and key. A request over any one
// rule gets 429 RATE_LIMITED with the RateLimit-Limit,
// RateLimit-Remaining and Retry-After headers. Rules are checked in
// order and stop at the first breach. A request that passes carries
// RateLimit-Limit and RateLimit-Remaining of the rule closest to its cap.
func Wrap(db Querier, endpoint string, rules []Rule) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			now := clock.Now(r.Context())
			tightestLimit, tightestRemaining := 0, -1

			for _, rule := range rules {
				key := rule.Key(r)
				count, windowStart, err := touch(r.Context(), db, bucketKey(endpoint, rule.Dimension, key), now, rule.Window)
				if err != nil {
					apierr.WriteInternal(w, r, err)
					return
				}

				if count > rule.Max {
					retryAfter := retryAfterSeconds(windowStart, now, rule.Window)
					log.Printf("ratelimit: refused endpoint=%s dimension=%s key=%s", endpoint, rule.Dimension, key)
					w.Header().Set("Retry-After", strconv.Itoa(retryAfter))
					w.Header().Set("RateLimit-Limit", strconv.Itoa(rule.Max))
					w.Header().Set("RateLimit-Remaining", "0")
					apierr.Write(w, http.StatusTooManyRequests, apierr.CodeRateLimited,
						fmt.Sprintf("too many requests -- try again in %d seconds", retryAfter), nil)
					return
				}

				remaining := rule.Max - count
				if tightestRemaining < 0 || remaining < tightestRemaining {
					tightestLimit, tightestRemaining = rule.Max, remaining
				}
			}

			if tightestRemaining >= 0 {
				w.Header().Set("RateLimit-Limit", strconv.Itoa(tightestLimit))
				w.Header().Set("RateLimit-Remaining", strconv.Itoa(tightestRemaining))
			}
			next.ServeHTTP(w, r)
		})
	}
}

// bucketKey namespaces a rate_limit_buckets row by the endpoint and rule
// it belongs to, so one address is counted separately per endpoint.
func bucketKey(endpoint, dimension, key string) string {
	return endpoint + ":" + dimension + ":" + key
}

// touch increments the bucket named key, or starts a fresh window (count
// 1) when the stored one has ended. The read-modify-write is one
// statement, so two requests on the same key -- on two Cloud Run
// instances, not only two goroutines -- serialize on the row.
//
// No reaper deletes an old bucket: a key nobody touches again is a few
// idle bytes, and the next request on it resets it in place.
func touch(ctx context.Context, db Querier, key string, now time.Time, window time.Duration) (count int, windowStart time.Time, err error) {
	err = db.QueryRowContext(ctx,
		`INSERT INTO rate_limit_buckets (key, window_start, count)
		 VALUES ($1, $2, 1)
		 ON CONFLICT (key) DO UPDATE SET
		     count = CASE WHEN rate_limit_buckets.window_start <= $2::timestamptz - make_interval(secs => $3)
		                  THEN 1 ELSE rate_limit_buckets.count + 1 END,
		     window_start = CASE WHEN rate_limit_buckets.window_start <= $2::timestamptz - make_interval(secs => $3)
		                  THEN $2::timestamptz ELSE rate_limit_buckets.window_start END
		 RETURNING count, window_start`,
		key, now, window.Seconds(),
	).Scan(&count, &windowStart)
	if err != nil {
		return 0, time.Time{}, fmt.Errorf("ratelimit: touch bucket %q: %w", key, err)
	}
	return count, windowStart, nil
}

// retryAfterSeconds is how long the caller waits for the window to end,
// rounded up, and at least 1: a window start from an instance whose
// clock is ahead cannot give 0 or less.
func retryAfterSeconds(windowStart, now time.Time, window time.Duration) int {
	return max(1, int(math.Ceil(windowStart.Add(window).Sub(now).Seconds())))
}
