package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"mbu/api/internal/apierr"
	"mbu/api/internal/apierrtest"
	"mbu/api/internal/authn"
	"mbu/api/internal/authntest"
	"mbu/api/internal/clock"
)

// The ID tokens the fake verifier in testDeps knows.
const (
	tokenParent     = "token-parent"
	tokenUnverified = "token-unverified"
	tokenSuperAdmin = "token-super-admin"
)

// testNow is the instant every request in these tests reads.
var testNow = time.Date(2027, time.March, 6, 9, 0, 0, 0, time.UTC)

// testDeps is the Deps every route test builds the table from.
func testDeps() Deps {
	return Deps{
		Verifier: authntest.Verifier{Tokens: map[string]authn.Token{
			tokenParent:     {UID: "uid-parent", Email: "Parent@Example.com", EmailVerified: true},
			tokenUnverified: {UID: "uid-unverified", Email: "new@example.com"},
			tokenSuperAdmin: {UID: "uid-admin", Email: "admin@example.com", EmailVerified: true, SuperAdmin: true},
		}},
		Now: func() time.Time { return testNow },
	}
}

// serve sends one request to h. token "" sends no Authorization header.
func serve(t *testing.T, h http.Handler, method, path, token string) *http.Response {
	t.Helper()
	req := httptest.NewRequestWithContext(t.Context(), method, path, http.NoBody)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec.Result()
}

func TestHealth(t *testing.T) {
	resp := serve(t, routes(testDeps()), http.MethodGet, "/api/health", "")
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	var body map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(body) != 1 || body["status"] != "ok" {
		t.Fatalf("body = %v, want {status: ok}", body)
	}
}

// callerResponse is what the test-only protected route answers with.
type callerResponse struct {
	UID        string    `json:"uid"`
	Email      string    `json:"email"`
	SuperAdmin bool      `json:"superAdmin"`
	Now        time.Time `json:"now"`
}

// protectedTable is the real route table plus one test-only route behind
// the auth middleware, which echoes the Caller and the request clock.
func protectedTable() http.Handler {
	d := testDeps()
	rt := buildRoutes(d)
	rt.authed("GET /api/test/caller", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		caller, _ := authn.CallerFrom(r.Context())
		apierr.WriteJSON(w, http.StatusOK, callerResponse{
			UID: caller.UID, Email: caller.Email, SuperAdmin: caller.SuperAdmin, Now: clock.Now(r.Context()),
		})
	}))
	return rt.handler(d.Now)
}

func TestProtectedRoute_Refusals(t *testing.T) {
	tests := []struct {
		name   string
		token  string
		status int
		code   apierr.Code
	}{
		{"no token", "", http.StatusUnauthorized, apierr.CodeUnauthorized},
		{"bad token", "not-a-token", http.StatusUnauthorized, apierr.CodeUnauthorized},
		{"unverified email", tokenUnverified, http.StatusForbidden, apierr.CodeEmailNotVerified},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := serve(t, protectedTable(), http.MethodGet, "/api/test/caller", tt.token)
			defer resp.Body.Close()

			if resp.StatusCode != tt.status {
				t.Fatalf("status = %d, want %d", resp.StatusCode, tt.status)
			}
			if got := apierrtest.Decode(t, resp); got.Code != tt.code {
				t.Fatalf("code = %q, want %q", got.Code, tt.code)
			}
		})
	}
}

func TestProtectedRoute_FillsTheCaller(t *testing.T) {
	tests := []struct {
		name  string
		token string
		want  callerResponse
	}{
		{"a Parent, email lowercased", tokenParent, callerResponse{UID: "uid-parent", Email: "parent@example.com", Now: testNow}},
		{"a Super-admin", tokenSuperAdmin, callerResponse{UID: "uid-admin", Email: "admin@example.com", SuperAdmin: true, Now: testNow}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := serve(t, protectedTable(), http.MethodGet, "/api/test/caller", tt.token)
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				t.Fatalf("status = %d, want 200", resp.StatusCode)
			}
			var got callerResponse
			if err := json.NewDecoder(resp.Body).Decode(&got); err != nil {
				t.Fatalf("decode: %v", err)
			}
			if !got.Now.Equal(tt.want.Now) {
				t.Fatalf("now = %v, want the Deps.Now instant %v", got.Now, tt.want.Now)
			}
			got.Now = tt.want.Now
			if got != tt.want {
				t.Fatalf("caller = %+v, want %+v", got, tt.want)
			}
		})
	}
}

func TestPanickingRoute_AnswersInternalWithNoDetail(t *testing.T) {
	d := testDeps()
	rt := buildRoutes(d)
	rt.authed("GET /api/test/panic", http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("pq: password authentication failed for user app_runtime")
	}))

	resp := serve(t, rt.handler(d.Now), http.MethodGet, "/api/test/panic", tokenParent)
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", resp.StatusCode)
	}
	got := apierrtest.Decode(t, resp)
	if got.Code != apierr.CodeInternal || got.Message != apierr.MsgInternalError || got.Details != nil {
		t.Fatalf("body = %+v, want INTERNAL with no detail", got)
	}
}

func TestResolvePort(t *testing.T) {
	env := func(port string) func(string) string {
		return func(key string) string {
			if key == "PORT" {
				return port
			}
			return ""
		}
	}
	if got := resolvePort(env("")); got != "8080" {
		t.Errorf("unset PORT = %q, want 8080", got)
	}
	if got := resolvePort(env("9090")); got != "9090" {
		t.Errorf("PORT=9090 = %q, want 9090", got)
	}
}

func TestFirebaseProjectID(t *testing.T) {
	env := func(value string) func(string) string {
		return func(key string) string {
			if key == "GCP_PROJECT_ID" {
				return value
			}
			return ""
		}
	}
	if got, err := firebaseProjectID(env("merit-badge-university")); err != nil || got != "merit-badge-university" {
		t.Fatalf("firebaseProjectID = %q, %v; want merit-badge-university, nil", got, err)
	}
	for _, unset := range []string{"", "  "} {
		if _, err := firebaseProjectID(env(unset)); !errors.Is(err, errNoProjectID) {
			t.Fatalf("firebaseProjectID(%q) error = %v, want errNoProjectID", unset, err)
		}
	}
}
