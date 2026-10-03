// Package idempotency is docs/api-design.md section 3's Idempotency-Key
// contract as one decorator: a repeat of a request with the same key
// replays the stored response, and a reuse of the key for a different
// request is a 409. Copied from doula-cloud (#247), scoped by the
// caller's uid instead of Practice and Staff, and without row-level
// security (#240 decision 4).
//
// Wrap must sit inside authn.Middleware: it reads the Caller. The route
// table mounts it for a route declared replayable (routes.go).
//
// Time comes from the clock seam and goes into the SQL as a parameter,
// so the TTL, the stored created_at and the purge read one clock.
//
// Two first requests with the same key at the same moment can both run
// the handler; the first save wins and later repeats replay it. The
// handlers behind Wrap keep their own guards (unique keys, state
// checks), so this is a gap in deduplication, not in correctness.
package idempotency

import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"mbu/api/internal/apierr"
	"mbu/api/internal/authn"
	"mbu/api/internal/clock"
)

// HeaderName is the request header that carries the key.
const HeaderName = "Idempotency-Key"

// maxKeyLength bounds the caller-chosen key so a long header cannot
// bloat the table. A longer key is a 400: running the request without
// replay protection would hide the client bug behind a duplicate write.
const maxKeyLength = 255

// TTL is how long a stored response replays (section 3: 24-48 hours).
// A row older than TTL is not found, and PurgeExpired deletes it.
const TTL = 48 * time.Hour

// errNoCaller is a wiring fault: Wrap was mounted outside
// authn.Middleware.
var errNoCaller = errors.New("idempotency: no Caller on the request -- mount Wrap inside authn.Middleware")

// Wrap returns the decorator that stores and replays responses in db.
// With no usable Idempotency-Key header, the handler runs as usual. With
// one, a stored response for the same caller and key replays (409
// IDEMPOTENCY_KEY_REUSED when the method, path or body differ), or the
// handler runs and its response is stored unless it is a 5xx.
//
// The replay sets Content-Type to application/json when there is a
// body: every handler writes its body through apierr.WriteJSON, so the
// status and body are all a replay needs. A replayable handler must not
// set other headers (Location, say): a replay does not keep them.
func Wrap(db *sql.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := r.Header.Get(HeaderName)
			if key == "" {
				next.ServeHTTP(w, r)
				return
			}
			if len(key) > maxKeyLength {
				apierr.WriteError(w, fmt.Sprintf("Idempotency-Key is longer than %d characters", maxKeyLength), http.StatusBadRequest)
				return
			}
			caller, ok := authn.CallerFrom(r.Context())
			if !ok {
				apierr.WriteInternal(w, r, errNoCaller)
				return
			}

			body, err := io.ReadAll(io.LimitReader(r.Body, apierr.MaxRequestBodyBytes+1))
			if err != nil {
				apierr.WriteError(w, "could not read the request body", http.StatusBadRequest)
				return
			}
			if len(body) > apierr.MaxRequestBodyBytes {
				// Too large to store or compare. The handler refuses it
				// with 413 when it decodes, so it gets the whole body.
				r.Body = io.NopCloser(io.MultiReader(bytes.NewReader(body), r.Body))
				next.ServeHTTP(w, r)
				return
			}
			r.Body = io.NopCloser(bytes.NewReader(body))

			now := clock.Now(r.Context())
			hash := requestHash(r, body)
			stored, found, err := lookup(r.Context(), db, caller.UID, key, now)
			if err != nil {
				apierr.WriteInternal(w, r, err)
				return
			}
			if found {
				if !bytes.Equal(stored.requestHash, hash) {
					apierr.Write(w, http.StatusConflict, apierr.CodeIdempotencyKeyReused,
						"this Idempotency-Key was already used for a different request", nil)
					return
				}
				if len(stored.body) > 0 {
					w.Header().Set("Content-Type", "application/json")
				}
				w.WriteHeader(stored.status)
				_, _ = w.Write(stored.body) //nolint:gosec // G705: the JSON body this caller's own first request got, replayed as is
				return
			}

			rec := &recorder{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(rec, r)

			// A 5xx is a failure the caller must be able to retry past,
			// so it is not stored. A 2xx or 4xx replays.
			if rec.status >= http.StatusInternalServerError {
				return
			}
			// An empty buffer's Bytes() is nil, which pgx sends as NULL;
			// response_body is NOT NULL, so store an empty slice instead.
			response := append([]byte{}, rec.body.Bytes()...)
			if err := save(r.Context(), db, caller.UID, key, hash, rec.status, response, now); err != nil {
				// The caller already has the response. A failed save
				// only means a retry runs the handler again.
				log.Printf("idempotency: %v", err)
			}
		})
	}
}

// requestHash identifies a request by its method, path with query, and
// body. A newline cannot occur in the method or the path, so the
// separators make the parts unambiguous.
func requestHash(r *http.Request, body []byte) []byte {
	h := sha256.New()
	_, _ = io.WriteString(h, r.Method+"\n"+r.URL.RequestURI()+"\n")
	_, _ = h.Write(body)
	return h.Sum(nil)
}

// storedResponse is one idempotency_keys row.
type storedResponse struct {
	requestHash []byte
	status      int
	body        []byte
}

// lookup returns the response stored for uid and key, if it is younger
// than TTL at now.
func lookup(ctx context.Context, db *sql.DB, uid, key string, now time.Time) (storedResponse, bool, error) {
	var s storedResponse
	err := db.QueryRowContext(ctx,
		`SELECT request_hash, status_code, response_body FROM idempotency_keys
		 WHERE uid = $1 AND key = $2 AND created_at > $3`,
		uid, key, now.Add(-TTL),
	).Scan(&s.requestHash, &s.status, &s.body)
	if errors.Is(err, sql.ErrNoRows) {
		return storedResponse{}, false, nil
	}
	if err != nil {
		return storedResponse{}, false, fmt.Errorf("idempotency: look up key: %w", err)
	}
	return s, true, nil
}

// save stores the response for uid and key. A row that a concurrent
// first request stored inside TTL stays; a row older than TTL (which
// lookup did not find) is replaced.
func save(ctx context.Context, db *sql.DB, uid, key string, hash []byte, status int, body []byte, now time.Time) error {
	_, err := db.ExecContext(ctx,
		`INSERT INTO idempotency_keys (uid, key, request_hash, status_code, response_body, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 ON CONFLICT (uid, key) DO UPDATE
		 SET request_hash = EXCLUDED.request_hash,
		     status_code = EXCLUDED.status_code,
		     response_body = EXCLUDED.response_body,
		     created_at = EXCLUDED.created_at
		 WHERE idempotency_keys.created_at <= $7`,
		uid, key, hash, status, body, now, now.Add(-TTL),
	)
	if err != nil {
		return fmt.Errorf("save response for key: %w", err)
	}
	return nil
}

// PurgeExpired deletes every stored response older than TTL at now and
// returns how many it deleted. The retention purge (#256) calls it.
func PurgeExpired(ctx context.Context, db *sql.DB, now time.Time) (int64, error) {
	var n int64
	err := db.QueryRowContext(ctx,
		`WITH purged AS (DELETE FROM idempotency_keys WHERE created_at <= $1 RETURNING 1)
		 SELECT count(*) FROM purged`,
		now.Add(-TTL),
	).Scan(&n)
	if err != nil {
		return 0, fmt.Errorf("idempotency: purge expired keys: %w", err)
	}
	return n, nil
}

// recorder passes the status and body through to the real
// ResponseWriter and keeps a copy for save.
type recorder struct {
	http.ResponseWriter
	status      int
	body        bytes.Buffer
	wroteHeader bool
}

func (rec *recorder) WriteHeader(status int) {
	rec.status = status
	rec.wroteHeader = true
	rec.ResponseWriter.WriteHeader(status)
}

// Unwrap lets http.ResponseController reach the real ResponseWriter.
func (rec *recorder) Unwrap() http.ResponseWriter {
	return rec.ResponseWriter
}

func (rec *recorder) Write(b []byte) (int, error) {
	if !rec.wroteHeader {
		rec.WriteHeader(http.StatusOK)
	}
	rec.body.Write(b)
	return rec.ResponseWriter.Write(b) //nolint:wrapcheck // implements http.ResponseWriter; callers expect the raw net/http error
}
