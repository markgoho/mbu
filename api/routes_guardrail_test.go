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
// 6 that says why not.
var declaredPublicRoutes = map[string]bool{
	"GET /api/health":                   true,
	"GET /api/universities/{id}/public": true,
}

// pathParam matches a {name} or {name...} wildcard in a pattern.
var pathParam = regexp.MustCompile(`\{[^}]+\}`)

// routeTableOffenses reads the route table rt built and reports each
// route in none of the three classes: (a) a declared public route, (b) a
// route under /api/internal/, which #256 guards with its own check, or
// (c) a route behind the auth middleware -- proved by calling it with no
// token through h and getting 401 UNAUTHORIZED.
func routeTableOffenses(t *testing.T, rt *router, h http.Handler) []string {
	t.Helper()
	var offenses []string
	for _, r := range rt.table {
		switch r.Class {
		case classPublic:
			if !declaredPublicRoutes[r.Pattern] {
				offenses = append(offenses, r.Pattern+": public, but not a declared public route")
			}
		case classInternal:
			if !strings.HasPrefix(patternPath(r.Pattern), "/api/internal/") {
				offenses = append(offenses, r.Pattern+": internal, but not under /api/internal/")
			}
		case classAuthed:
			method, path := http.MethodGet, pathParam.ReplaceAllString(patternPath(r.Pattern), "x")
			if fields := strings.Fields(r.Pattern); len(fields) == 2 {
				method = fields[0]
			}
			resp := serve(t, h, method, path, "")
			var code apierr.Code
			if resp.StatusCode == http.StatusUnauthorized {
				code = apierrtest.Decode(t, resp).Code
			}
			_ = resp.Body.Close()
			if code != apierr.CodeUnauthorized {
				answer := strings.TrimSpace(fmt.Sprintf("%d %s", resp.StatusCode, code))
				offenses = append(offenses, r.Pattern+": answered "+answer+" with no token, want 401 UNAUTHORIZED")
			}
		default:
			offenses = append(offenses, r.Pattern+": in no route class")
		}
	}
	return offenses
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
	rt.authed("POST /api/universities/{id}/classes", ok)
	rt.internal("POST /api/internal/retention/purge", ok)
	rt.public("GET /api/universities/{id}/roster", ok)
	// A route mounted behind no middleware, recorded as authed: the
	// shape a bypass of rt.authed would take.
	rt.mux.Handle("GET /api/users/me", ok)
	rt.table = append(rt.table,
		route{Pattern: "GET /api/users/me", Class: classAuthed},
		route{Pattern: "GET /api/internal-ish", Class: classInternal},
		route{Pattern: "GET /api/other", Class: "other"},
	)

	got := routeTableOffenses(t, rt, rt.handler(d.Now))

	want := []string{
		"GET /api/universities/{id}/roster: public, but not a declared public route",
		"GET /api/users/me: answered 200 with no token, want 401 UNAUTHORIZED",
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
