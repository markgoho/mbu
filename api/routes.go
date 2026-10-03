package main

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	"mbu/api/internal/apierr"
	"mbu/api/internal/authn"
	"mbu/api/internal/clientip"
	"mbu/api/internal/clock"
	"mbu/api/internal/idempotency"
)

// Deps is everything the route table needs to build itself. A struct, not
// a parameter list: a new dependency is a new field, and a test that does
// not use it leaves it at its zero value.
type Deps struct {
	// Verifier checks the Bearer ID token (ADR 0003). Tests substitute
	// authntest.Verifier.
	Verifier authn.Verifier

	// Now is the clock seam (#240 decision 9). routes() seeds it into
	// every request's context with clock.Middleware, and a handler reads
	// it with clock.Now(r.Context()). Nil falls back to clock.Real.
	Now clock.Clock

	// DB is the Postgres pool, logged in as a member of app_runtime
	// (ADR 0002). Tests pass testdb.New(t).App.
	DB *sql.DB

	// ClientIP reads the caller's address for ratelimit.IPRule (#293).
	// main() sets ProxyHops from CLIENT_IP_PROXY_HOPS; the zero value
	// trusts only Cloud Run's front end, the right value for tests.
	ClientIP clientip.Resolver

	// Accounts changes Firebase Auth accounts: account deletion deletes
	// the caller's (#249). main() passes the FirebaseVerifier; tests pass
	// *authntest.Accounts.
	Accounts authn.AccountManager
}

// routeClass is how a route is reached, which decides what guards it.
type routeClass string

const (
	// classPublic is a route anyone may call with no token. The guardrail
	// test holds these to a declared list.
	classPublic routeClass = "public"
	// classInternal is a route under /api/internal/, called by Cloud
	// Scheduler and guarded by its caller identity (ADR 0005), not by a
	// Firebase ID token.
	classInternal routeClass = "internal"
	// classAuthed is every other route: it runs behind authn.Middleware.
	classAuthed routeClass = "authed"
)

// stance is a POST route's declared idempotency behavior (#247,
// docs/api-design.md section 3). A POST is mounted with one: replayable,
// or exempt with a reason. The guardrail test fails a POST that has
// neither, so "nobody decided" cannot look like "decided not to".
type stance struct {
	// replayable mounts the handler behind idempotency.Wrap: a repeat
	// with the same Idempotency-Key replays the first response.
	replayable bool
	// exempt is why the route runs without idempotency.Wrap: it is safe
	// to repeat as is (a state-guarded transition, an upsert, a
	// unique-key create), or it has no caller uid to scope a key by.
	exempt string
}

// replayable is the stance of a POST that creates a record.
var replayable = stance{replayable: true}

// exempt is the stance of a POST that runs without idempotency.Wrap, for
// reason. It panics at startup when reason is empty.
func exempt(reason string) stance {
	if strings.TrimSpace(reason) == "" {
		panic("routes: exempt() needs a reason -- a POST left without idempotency.Wrap must say why")
	}
	return stance{exempt: reason}
}

// route is one entry of the route table.
type route struct {
	Pattern string
	Class   routeClass
	// Stance is the route's declared idempotency stance; the zero value
	// means none was declared.
	Stance stance
}

// router is the only thing that holds the mux. A route file gets a
// *router, not the mux, so it cannot mount a route that skips the table
// the guardrail test reads.
type router struct {
	mux         *http.ServeMux
	requireAuth func(http.Handler) http.Handler
	replay      func(http.Handler) http.Handler
	table       []route
}

func newRouter(d Deps) *router {
	return &router{
		mux:         http.NewServeMux(),
		requireAuth: authn.Middleware(d.Verifier),
		replay:      idempotency.Wrap(d.DB),
	}
}

// public mounts a route that needs no token. Only the routes the
// guardrail test declares may use it. A public POST can only be exempt:
// with no Caller there is no uid to scope a key by.
func (rt *router) public(pattern string, h http.Handler, s ...stance) {
	rt.mount(pattern, classPublic, h, s)
}

// internal mounts a route on the internal boundary. It panics at startup
// for a pattern outside /api/internal/, so the class cannot be used to
// skip authentication on an ordinary route. An internal POST can only be
// exempt, for the same reason as a public one.
func (rt *router) internal(pattern string, h http.Handler, s ...stance) {
	if !strings.HasPrefix(patternPath(pattern), "/api/internal/") {
		panic(fmt.Sprintf("routes: internal route %q is not under /api/internal/", pattern))
	}
	rt.mount(pattern, classInternal, h, s)
}

// authed mounts a route behind authn.Middleware: the handler runs only
// for a verified Caller, which it reads with authn.CallerFrom. mount puts
// a replayable route behind idempotency.Wrap inside the middleware,
// since Wrap scopes the key by the Caller.
func (rt *router) authed(pattern string, h http.Handler, s ...stance) {
	rt.mount(pattern, classAuthed, h, s)
}

// mount registers h and records the route. It panics at startup for more
// than one stance, or for replayable on a route with no Caller.
func (rt *router) mount(pattern string, class routeClass, h http.Handler, stances []stance) {
	r := route{Pattern: pattern, Class: class}
	if len(stances) > 1 {
		panic(fmt.Sprintf("routes: %q declares %d idempotency stances, want at most one", pattern, len(stances)))
	}
	if len(stances) == 1 {
		r.Stance = stances[0]
	}
	if r.Stance.replayable {
		if class != classAuthed {
			panic(fmt.Sprintf("routes: %q is replayable but %s -- idempotency.Wrap needs a Caller", pattern, class))
		}
		h = rt.replay(h)
	}
	if class == classAuthed {
		h = rt.requireAuth(h)
	}
	rt.mux.Handle(pattern, h)
	rt.table = append(rt.table, r)
}

// handler wraps the mux in the middleware every route shares: the
// panic-safe 500 outermost, so it also covers the clock, then the clock
// seam.
func (rt *router) handler(now clock.Clock) http.Handler {
	return apierr.Recover(clock.Middleware(now)(rt.mux))
}

// patternPath is the path of a ServeMux pattern such as
// "GET /api/health".
func patternPath(pattern string) string {
	fields := strings.Fields(pattern)
	return fields[len(fields)-1]
}

// buildRoutes registers every route. The registrations live in one file
// per area (routes_health.go, routes_users.go, ...), each with only the
// imports its own routes need, so two tickets that add routes to
// different areas do not edit the same import block and route list.
func buildRoutes(d Deps) *router {
	rt := newRouter(d)
	registerHealthRoutes(rt)
	registerUsersRoutes(rt, d)
	registerUniversitiesRoutes(rt, d)
	registerRegistrationsRoutes(rt, d)
	registerInternalRoutes(rt, d)
	return rt
}

// routes builds the API's route table.
func routes(d Deps) http.Handler {
	return buildRoutes(d).handler(d.Now)
}
