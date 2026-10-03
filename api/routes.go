package main

import (
	"fmt"
	"net/http"
	"strings"

	"mbu/api/internal/apierr"
	"mbu/api/internal/authn"
	"mbu/api/internal/clock"
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

// route is one entry of the route table.
type route struct {
	Pattern string
	Class   routeClass
}

// router is the only thing that holds the mux. A route file gets a
// *router, not the mux, so it cannot mount a route that skips the table
// the guardrail test reads.
type router struct {
	mux         *http.ServeMux
	requireAuth func(http.Handler) http.Handler
	table       []route
}

func newRouter(d Deps) *router {
	return &router{mux: http.NewServeMux(), requireAuth: authn.Middleware(d.Verifier)}
}

// public mounts a route that needs no token. Only the routes the
// guardrail test declares may use it.
func (rt *router) public(pattern string, h http.Handler) {
	rt.mount(pattern, classPublic, h)
}

// internal mounts a route on the internal boundary. It panics at startup
// for a pattern outside /api/internal/, so the class cannot be used to
// skip authentication on an ordinary route.
func (rt *router) internal(pattern string, h http.Handler) {
	if !strings.HasPrefix(patternPath(pattern), "/api/internal/") {
		panic(fmt.Sprintf("routes: internal route %q is not under /api/internal/", pattern))
	}
	rt.mount(pattern, classInternal, h)
}

// authed mounts a route behind authn.Middleware: the handler runs only
// for a verified Caller, which it reads with authn.CallerFrom.
func (rt *router) authed(pattern string, h http.Handler) {
	rt.mount(pattern, classAuthed, rt.requireAuth(h))
}

func (rt *router) mount(pattern string, class routeClass, h http.Handler) {
	rt.mux.Handle(pattern, h)
	rt.table = append(rt.table, route{Pattern: pattern, Class: class})
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
