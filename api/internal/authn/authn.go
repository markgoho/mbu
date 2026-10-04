// Package authn answers "who is calling?" for every route behind it. The
// API owns the session (ADR 0007): POST /api/session exchanges a
// Firebase Auth ID token for an opaque token in an HttpOnly __session
// cookie and one row in Postgres (store.go). Middleware reads that
// cookie, looks the row up, and puts a Caller in the request context. It
// does authentication only: whether that Caller may act on a University
// or a Class is authorization, decided later.
//
// Firebase Auth stays the identity provider behind one interface,
// Verifier, which only the session exchange calls. No other request
// carries an ID token.
package authn

import (
	"context"
	"errors"
	"net/http"

	"mbu/api/internal/apierr"
	"mbu/api/internal/clock"
)

// Token is what a Verifier reads off a valid ID token.
type Token struct {
	UID           string
	Email         string
	EmailVerified bool
	// SuperAdmin is the `superAdmin` custom claim (CONTEXT.md:
	// Super-admin).
	SuperAdmin bool
	// DisplayName is the `name` claim: the name a Google account
	// carries, empty for an email and password account. The app fills
	// the onboarding form with it.
	DisplayName string
}

// Verifier checks an ID token. FirebaseVerifier is the production one;
// tests use authntest.Verifier, so no test calls Firebase. Only the
// session exchange (package session) calls it.
type Verifier interface {
	VerifyIDToken(ctx context.Context, idToken string) (*Token, error)
}

// Caller is the verified adult a request runs as. Email is lowercase, so
// a comparison with a stored address needs no case folding.
type Caller struct {
	UID        string
	Email      string
	SuperAdmin bool
}

type contextKey struct{}

// CallerFrom returns the Caller Middleware put in ctx, and false for a
// request that did not pass through Middleware.
func CallerFrom(ctx context.Context) (Caller, bool) {
	s, ok := SessionFrom(ctx)
	return s.Caller, ok
}

// SessionFrom returns the session Middleware found for the request, and
// false for a request that did not pass through Middleware.
func SessionFrom(ctx context.Context) (Session, bool) {
	s, ok := ctx.Value(contextKey{}).(Session)
	return s, ok
}

// The refusals of Middleware. Each is a 401: the caller signs in again.
const (
	MsgMissingSession = "Missing session cookie"
	// MsgInvalidSession covers a token that was never issued, a session
	// that ended and one that expired: all three mean "sign in again",
	// and telling them apart helps nobody but a guesser.
	MsgInvalidSession = "Invalid session"
)

// Middleware refuses a request that carries no live session, and
// otherwise runs next with the session's Caller in the request context.
// A request with no __session cookie is refused before any database
// work. A session past half its lifetime is renewed on the way through
// (renewIfStale).
func Middleware(q Querier) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie(SessionCookieName)
			if err != nil || cookie.Value == "" {
				apierr.WriteError(w, MsgMissingSession, http.StatusUnauthorized)
				return
			}
			now := clock.Now(r.Context())
			s, err := LookupSession(r.Context(), q, cookie.Value, now)
			if errors.Is(err, ErrNoSession) {
				apierr.WriteError(w, MsgInvalidSession, http.StatusUnauthorized)
				return
			}
			if err != nil {
				// A database that cannot answer is a 500, not a 401: it
				// must not read as "you are signed out".
				apierr.WriteInternal(w, r, err)
				return
			}
			renewIfStale(w, r, q, cookie.Value, s.ExpiresAt, now)
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), contextKey{}, s)))
		})
	}
}
