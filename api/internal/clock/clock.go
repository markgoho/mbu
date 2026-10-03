// Package clock is the one seam api/ reads the current instant through
// (#240 decision 9). A bare time.Now() is a place a test cannot move, so
// the forbidigo rule in api/.golangci.yml refuses one in production code
// and every call site reads Now(ctx) or holds an injected Clock instead.
//
// # Shape
//
// Clock is a bare func returning time.Time -- a type alias, not a named
// type or an interface, so any "Now func() time.Time" field satisfies it
// with no change.
//
// # Delivery: request context, not a parameter on every handler
//
// Middleware seeds one Clock into every request's context, once, at the
// top of routes() in the route table; Now(ctx) reads it back at whatever
// depth needs the time. That keeps a Clock parameter off every
// middleware and handler constructor between routes() and the one line
// that reads the time. Nothing here is a package-level global: each
// request carries the Clock routes() was built with, so a test can seed
// a fixed instant through Deps.Now.
//
// # What this does not touch
//
// Firebase ID token verification (authn.FirebaseVerifier) reads no clock
// this package exposes, on purpose: the Admin SDK checks a token's
// freshness against real wall time inside itself, so a fake clock there
// would only make every valid token fail.
package clock

import (
	"context"
	"net/http"
	"time"
)

// Clock returns the current instant. A type alias, not a distinct named
// type, so any "Now func() time.Time" field already satisfies it.
type Clock = func() time.Time

// Real is the one sanctioned spelling of the wall clock in api/ --
// everywhere else calls Now(ctx) or holds an injected Clock instead of
// calling time.Now() directly, which is what the forbidigo rule in
// api/.golangci.yml enforces.
//
//nolint:forbidigo // the seam's own default value; every other production call site reads through Now(ctx) or an injected Clock instead
var Real Clock = time.Now

type contextKey struct{}

// Into returns a copy of ctx carrying now as the Clock later code on the
// same request reads back with Now. Exported mainly for tests that need
// a fixed instant without going through Middleware.
func Into(ctx context.Context, now Clock) context.Context {
	if now == nil {
		now = Real
	}
	return context.WithValue(ctx, contextKey{}, now)
}

// Now reads the current instant off ctx -- the Clock a test or routes()
// seeded with Into/Middleware, or Real when nothing seeded one.
// The fallback keeps every handler correct by default: a request that
// never passed through Middleware (a handler constructed directly in a
// unit test, say) reads real time, exactly what a bare time.Now() call
// would have returned.
func Now(ctx context.Context) time.Time {
	if now, ok := ctx.Value(contextKey{}).(Clock); ok && now != nil {
		return now()
	}
	return Real()
}

// Middleware seeds now into every request's context before it reaches
// next, so any handler downstream -- however many Mount/Middleware
// layers deep -- can read it back with Now(r.Context()) without a Clock
// parameter threaded through each of those layers. now nil (Deps.Now's
// zero value, which every test and every route table built before this
// ticket already has) falls back to Real, so an unset Deps.Now behaves
// exactly like the bare time.Now() calls it replaces.
func Middleware(now Clock) func(http.Handler) http.Handler {
	if now == nil {
		now = Real
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			next.ServeHTTP(w, r.WithContext(Into(r.Context(), now)))
		})
	}
}
