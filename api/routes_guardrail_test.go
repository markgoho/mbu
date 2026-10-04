package main

import (
	"fmt"
	"net/http"
	"os"
	"regexp"
	"strings"
	"testing"

	"mbu/api/internal/apierr"
	"mbu/api/internal/apierrtest"
)

// declaredPublicRoutes is every route a caller may reach with no token.
// A route added to this list is a reviewed decision: an unauthenticated
// route also needs a rate limit, or a row in docs/api-design.md section
// 6 that says why not. GET /api/universities/{id}/public is declared by
// #242 and mounted by #251, which adds its rate limit.
var declaredPublicRoutes = map[string]bool{
	"GET /api/health":                   true,
	"GET /api/universities/{id}/public": true,
	"POST /api/session":                 true,
	"DELETE /api/session":               true,
}

// pathParam matches a {name} or {name...} wildcard in a pattern.
var pathParam = regexp.MustCompile(`\{[^}]+\}`)

// routeTableOffenses reads the route table rt built and reports each
// route in none of the three classes: (a) a declared public route, (b) a
// route under /api/internal/, which #256 guards with its own check, or
// (c) a route behind the auth middleware -- proved by calling it with no
// token through h and getting 401 UNAUTHORIZED. It also reports each
// POST with no idempotency stance: neither replayable nor exempt with a
// reason (#247).
func routeTableOffenses(t *testing.T, rt *router, h http.Handler) []string {
	t.Helper()
	var offenses []string
	for _, r := range rt.table {
		if strings.HasPrefix(r.Pattern, http.MethodPost+" ") && r.Stance == (stance{}) {
			offenses = append(offenses, r.Pattern+": a POST with no idempotency stance -- mount it with replayable or exempt(reason)")
		}
		switch r.Class {
		case classPublic:
			if !declaredPublicRoutes[r.Pattern] {
				offenses = append(offenses, r.Pattern+": public, but not a declared public route")
			}
		case classInternal:
			if !strings.HasPrefix(patternPath(r.Pattern), "/api/internal/") {
				offenses = append(offenses, r.Pattern+": internal, but not under /api/internal/")
			} else if answer := unauthorizedAnswer(t, h, r.Pattern); answer != "" {
				offenses = append(offenses, r.Pattern+": answered "+answer+" with no credentials, want 401 UNAUTHORIZED")
			}
		case classAuthed:
			if answer := unauthorizedAnswer(t, h, r.Pattern); answer != "" {
				offenses = append(offenses, r.Pattern+": answered "+answer+" with no token, want 401 UNAUTHORIZED")
			}
		default:
			offenses = append(offenses, r.Pattern+": in no route class")
		}
	}
	return offenses
}

// unauthorizedAnswer calls the route of pattern through h with no
// credentials of any kind. It returns "" when the answer is 401
// UNAUTHORIZED, else the status and code it got.
func unauthorizedAnswer(t *testing.T, h http.Handler, pattern string) string {
	t.Helper()
	method, path := http.MethodGet, pathParam.ReplaceAllString(patternPath(pattern), "x")
	if fields := strings.Fields(pattern); len(fields) == 2 {
		method = fields[0]
	}
	resp := serve(t, h, method, path, "")
	defer resp.Body.Close()
	var code apierr.Code
	if resp.StatusCode == http.StatusUnauthorized {
		code = apierrtest.Decode(t, resp).Code
	}
	if code == apierr.CodeUnauthorized {
		return ""
	}
	return strings.TrimSpace(fmt.Sprintf("%d %s", resp.StatusCode, code))
}

func TestRoutes_EveryRouteIsInAClass(t *testing.T) {
	d := testDeps()
	rt := buildRoutes(d)
	if len(rt.table) == 0 {
		t.Fatal("buildRoutes registered no routes -- did it stop calling the register functions?")
	}
	for _, offense := range routeTableOffenses(t, rt, routes(d)) {
		t.Error(offense)
	}
}

// TestRouteTableOffenses_CatchesAViolation runs the check on a table that
// breaks each rule, so a check that had quietly stopped matching
// anything could not go on passing the test above.
func TestRouteTableOffenses_CatchesAViolation(t *testing.T) {
	d := testDeps()
	rt := newRouter(d)
	ok := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })
	rt.public("GET /api/health", ok)
	rt.authed("POST /api/universities/{id}/classes", ok, replayable)
	rt.authed("POST /api/universities/{id}/submit", ok, exempt("a state-guarded transition"))
	rt.internal("POST /api/internal/retention/purge", ok, exempt("the purge is idempotent"))
	rt.authed("POST /api/universities", ok)
	rt.public("GET /api/universities/{id}/roster", ok)
	// Routes mounted behind no middleware, recorded as authed and as
	// internal: the shape a bypass of rt.authed or rt.internal would take.
	rt.mux.Handle("GET /api/users/me", ok)
	rt.mux.Handle("POST /api/internal/open", ok)
	rt.table = append(rt.table,
		route{Pattern: "GET /api/users/me", Class: classAuthed},
		route{Pattern: "POST /api/internal/open", Class: classInternal, Stance: exempt("a test")},
		route{Pattern: "GET /api/internal-ish", Class: classInternal},
		route{Pattern: "GET /api/other", Class: "other"},
	)

	got := routeTableOffenses(t, rt, rt.handler(d.Now))

	want := []string{
		"POST /api/universities: a POST with no idempotency stance -- mount it with replayable or exempt(reason)",
		"GET /api/universities/{id}/roster: public, but not a declared public route",
		"GET /api/users/me: answered 200 with no token, want 401 UNAUTHORIZED",
		"POST /api/internal/open: answered 200 with no credentials, want 401 UNAUTHORIZED",
		"GET /api/internal-ish: internal, but not under /api/internal/",
		"GET /api/other: in no route class",
	}
	if strings.Join(got, "\n") != strings.Join(want, "\n") {
		t.Fatalf("offenses:\n%s\nwant:\n%s", strings.Join(got, "\n"), strings.Join(want, "\n"))
	}
}

func TestRouter_InternalRefusesARouteOutsideTheBoundary(t *testing.T) {
	defer func() {
		if recover() == nil {
			t.Fatal("rt.internal mounted a route outside /api/internal/")
		}
	}()
	newRouter(testDeps()).internal("GET /api/users/me", http.NotFoundHandler())
}

func TestRouter_RefusesABadStance(t *testing.T) {
	ok := http.NotFoundHandler()
	for name, mount := range map[string]func(rt *router){
		"exempt with no reason":  func(rt *router) { rt.authed("POST /api/universities", ok, exempt(" ")) },
		"two stances":            func(rt *router) { rt.authed("POST /api/universities", ok, replayable, exempt("why")) },
		"replayable with no uid": func(rt *router) { rt.internal("POST /api/internal/retention/purge", ok, replayable) },
		"replayable and public":  func(rt *router) { rt.public("POST /api/health", ok, replayable) },
	} {
		t.Run(name, func(t *testing.T) {
			defer func() {
				if recover() == nil {
					t.Fatal("the router accepted the stance")
				}
			}()
			mount(newRouter(testDeps()))
		})
	}
}

// muxRegistration finds a route mounted straight onto a ServeMux.
var muxRegistration = regexp.MustCompile(`\.(?:Handle|HandleFunc)\(`)

// TestRoutes_OnlyTheRouterMountsOnTheMux holds the arrangement the check
// above depends on: routes.go builds the mux and only router.mount
// registers on it, so every route lands in the table. A route file that
// called Handle on a mux would skip the table.
func TestRoutes_OnlyTheRouterMountsOnTheMux(t *testing.T) {
	entries, err := os.ReadDir(".")
	if err != nil {
		t.Fatalf("read package directory: %v", err)
	}
	for _, entry := range entries {
		name := entry.Name()
		if entry.IsDir() || !strings.HasSuffix(name, ".go") || strings.HasSuffix(name, "_test.go") || name == "routes.go" {
			continue
		}
		src, err := os.ReadFile(name) // #nosec G304 -- a file ReadDir listed in this package's own directory
		if err != nil {
			t.Fatalf("read %s: %v", name, err)
		}
		if muxRegistration.Match(src) {
			t.Errorf("%s mounts a route on a mux directly -- use rt.public, rt.internal or rt.authed", name)
		}
	}
}
