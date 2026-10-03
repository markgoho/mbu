// Package authn answers "who is calling?" for every route behind it. The
// app sends a Firebase Auth ID token as `Authorization: Bearer` (ADR
// 0003); Middleware verifies it through a Verifier and puts a Caller in
// the request context. It does authentication only: whether that Caller
// may act on a University or a Class is authorization, decided later.
//
// The rules are the ones functions/src/shared-api/plugins/require-auth.ts
// and services/auth/verify-token.ts apply today: 401 for a missing or
// invalid token, 401 for a token with no email, 403 EMAIL_NOT_VERIFIED
// for an unverified email.
package authn

import (
	"context"
	"log"
	"net/http"
	"strings"

	"mbu/api/internal/apierr"
)

// Token is what a Verifier reads off a valid ID token.
type Token struct {
	UID           string
	Email         string
	EmailVerified bool
	// SuperAdmin is the `superAdmin` custom claim (CONTEXT.md:
	// Super-admin).
	SuperAdmin bool
}

// Verifier checks an ID token. FirebaseVerifier is the production one;
// tests use authntest.Verifier, so no test calls Firebase.
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
	caller, ok := ctx.Value(contextKey{}).(Caller)
	return caller, ok
}

// Middleware refuses a request that carries no valid, verified identity,
// and otherwise runs next with the Caller in the request context.
func Middleware(v Verifier) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			caller, ok := authenticate(w, r, v)
			if !ok {
				return
			}
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), contextKey{}, caller)))
		})
	}
}

// authenticate writes the refusal and returns false when the request
// carries no usable identity.
func authenticate(w http.ResponseWriter, r *http.Request, v Verifier) (Caller, bool) {
	const scheme = "Bearer "
	header := r.Header.Get("Authorization")
	if header == "" {
		apierr.WriteError(w, "Missing Authorization header", http.StatusUnauthorized)
		return Caller{}, false
	}
	if !strings.HasPrefix(header, scheme) {
		apierr.WriteError(w, "Authorization header must use the Bearer scheme", http.StatusUnauthorized)
		return Caller{}, false
	}
	idToken := strings.TrimSpace(strings.TrimPrefix(header, scheme))
	if idToken == "" {
		apierr.WriteError(w, "Missing auth token", http.StatusUnauthorized)
		return Caller{}, false
	}

	token, err := v.VerifyIDToken(r.Context(), idToken)
	if err != nil {
		// Expired, revoked, malformed or signed by someone else: the
		// caller signs in again in every case, so one refusal covers
		// them. The reason goes to the log for diagnosis.
		log.Printf("authn: refused ID token: %v", err)
		apierr.WriteError(w, "Invalid auth token", http.StatusUnauthorized)
		return Caller{}, false
	}
	if token.Email == "" {
		apierr.WriteError(w, "Authenticated account has no email address", http.StatusUnauthorized)
		return Caller{}, false
	}
	if !token.EmailVerified {
		apierr.Write(w, http.StatusForbidden, apierr.CodeEmailNotVerified, "Email address is not verified", nil)
		return Caller{}, false
	}
	return Caller{UID: token.UID, Email: strings.ToLower(token.Email), SuperAdmin: token.SuperAdmin}, true
}
