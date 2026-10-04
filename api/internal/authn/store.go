// Session storage (ADR 0007, migration 00007_sessions.sql). A session is
// an opaque random token in the __session cookie plus one row in
// Postgres, so verification is a local read, renewal is an UPDATE, and
// revocation is a DELETE. Copied from doula-cloud's authn/store.go,
// with the identity the API needs on each request kept on the row.

package authn

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
)

// SessionCookieName is the name of the session cookie. It must be
// exactly this value: Firebase Hosting rewrites /api/** to Cloud Run and
// strips every Cookie on that hop except the one named "__session". Any
// other name works locally and fails only when deployed.
const SessionCookieName = "__session"

// SessionLifetime is how long a minted or renewed session is valid. A
// session in use is renewed (renewIfStale), so it ends only after a week
// with no request. ADR 0007 has the reasons for a week. It is both the
// row's expiry and the cookie's Max-Age, so the browser and Postgres
// agree on when a session ends.
const SessionLifetime = 7 * 24 * time.Hour

// MaxSessionAge is the longest a session lives, renewed or not: 30 days
// from its mint. Then the person signs in again, so a change of the
// identity on the row (a revoked superAdmin claim, a disabled account)
// takes effect within it at the latest (ADR 0007).
const MaxSessionAge = 30 * 24 * time.Hour

// Querier is the part of *sql.DB and *sql.Tx the session store uses.
type Querier interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

// ErrNoSession is what LookupSession returns when a token names no live
// session: it was never issued, it was ended, or it expired. The three
// are one answer on purpose; each means "sign in again".
var ErrNoSession = errors.New("authn: no live session for this token")

// Session is one live session row.
type Session struct {
	Caller
	// DisplayName is the token's `name` claim at sign-in (Token).
	DisplayName string
	ExpiresAt   time.Time
}

// NewSessionCookie is the cookie a minted or renewed session is sent as.
// HttpOnly keeps it from JavaScript; SameSite=Lax withholds it from a
// cross-site POST, and package csrf closes the rest.
func NewSessionCookie(token string) *http.Cookie {
	return &http.Cookie{
		Name:     SessionCookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   int(SessionLifetime.Seconds()),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	}
}

// ClearSessionCookie is the cookie that tells the browser to drop its
// session cookie.
func ClearSessionCookie() *http.Cookie {
	return &http.Cookie{
		Name:     SessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	}
}

// MintSession creates a session for the identity of a verified token
// that expires SessionLifetime after now, and returns the cookie that
// carries it. The token is made here and only its digest is stored, so
// this is the one moment the plaintext exists. The caller has already
// refused a token with no email or an unverified one.
//
// It sweeps the expired rows first. A mint is rare (a sign-in) and the
// sweep is one indexed DELETE, so the table keeps no dead sessions with
// no job to reap them.
func MintSession(ctx context.Context, q Querier, t Token, now time.Time) (*http.Cookie, error) {
	if _, err := q.ExecContext(ctx, `DELETE FROM sessions WHERE expires_at <= $1 OR created_at <= $2`,
		now, now.Add(-MaxSessionAge)); err != nil {
		return nil, fmt.Errorf("authn: sweep expired sessions: %w", err)
	}
	// rand.Text returns 128 or more bits of cryptographic randomness as
	// text and cannot fail.
	token := rand.Text()
	if _, err := q.ExecContext(ctx,
		`INSERT INTO sessions (token_hash, uid, email, display_name, super_admin, expires_at, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		tokenHash(token), t.UID, strings.ToLower(t.Email), t.DisplayName, t.SuperAdmin, now.Add(SessionLifetime), now,
	); err != nil {
		// coverage:ignore reason: the sweep above ran on the same connection, so only a failure between the two statements reaches this
		return nil, fmt.Errorf("authn: insert session: %w", err)
	}
	return NewSessionCookie(token), nil
}

// EndSession deletes the session token names. A token that names
// nothing is not an error: ending an ended session is the same outcome.
func EndSession(ctx context.Context, q Querier, token string) error {
	if _, err := q.ExecContext(ctx, `DELETE FROM sessions WHERE token_hash = $1`, tokenHash(token)); err != nil {
		return fmt.Errorf("authn: delete session: %w", err)
	}
	return nil
}

// EndAllSessions deletes every session of uid: each browser the account
// is signed in from. Account deletion calls it; a revoked Super-admin
// needs it too (docs/infrastructure.md).
func EndAllSessions(ctx context.Context, q Querier, uid string) error {
	if _, err := q.ExecContext(ctx, `DELETE FROM sessions WHERE uid = $1`, uid); err != nil {
		// coverage:ignore reason: its one caller, account deletion, has already written to the same pool, so only a failure between the two statements reaches this
		return fmt.Errorf("authn: delete sessions of an account: %w", err)
	}
	return nil
}

// LookupSession returns the session token names, or ErrNoSession when no
// row is live at now: expired, or minted MaxSessionAge or more ago. Such
// a row is skipped here, not deleted; the sweep in MintSession deletes
// it.
func LookupSession(ctx context.Context, q Querier, token string, now time.Time) (Session, error) {
	var s Session
	err := q.QueryRowContext(ctx,
		`SELECT uid, email, super_admin, display_name, expires_at FROM sessions
		 WHERE token_hash = $1 AND expires_at > $2 AND created_at > $3`,
		tokenHash(token), now, now.Add(-MaxSessionAge),
	).Scan(&s.UID, &s.Email, &s.SuperAdmin, &s.DisplayName, &s.ExpiresAt)
	if errors.Is(err, sql.ErrNoRows) {
		return Session{}, ErrNoSession
	}
	if err != nil {
		return Session{}, fmt.Errorf("authn: look up session: %w", err)
	}
	return s, nil
}

// renewIfStale moves the session's expiry to a full lifetime from now,
// and sends the cookie again with a new Max-Age, once less than half of
// a lifetime is left. The token does not change. The UPDATE runs on its
// own, outside any transaction of the handler, because renewal is about
// the credential, not about what the handler does next. A failed UPDATE
// keeps the old expiry and the old cookie: the session is still valid,
// and the next request tries again.
func renewIfStale(w http.ResponseWriter, r *http.Request, q Querier, token string, expiresAt, now time.Time) {
	if now.Before(expiresAt.Add(-SessionLifetime / 2)) {
		return
	}
	if _, err := q.ExecContext(r.Context(), `UPDATE sessions SET expires_at = $1 WHERE token_hash = $2`,
		now.Add(SessionLifetime), tokenHash(token)); err != nil {
		// coverage:ignore reason: the lookup just read this row on the same pool, so only a failure between the two statements reaches this
		log.Printf("authn: renew session: %v", err)
		// coverage:ignore reason: the lookup just read this row on the same pool, so only a failure between the two statements reaches this
		return
	}
	http.SetCookie(w, NewSessionCookie(token))
}

// tokenHash is what the sessions table stores in place of the token.
func tokenHash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
