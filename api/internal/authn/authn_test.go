package authn_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"mbu/api/internal/apierr"
	"mbu/api/internal/apierrtest"
	"mbu/api/internal/authn"
	"mbu/api/internal/authntest"
)

const (
	validToken = "valid-token"
	testUID    = "uid-1"
)

// setup builds the middleware around a handler that echoes the Caller
// it finds, and sends one GET with the given Authorization header ("" to
// send none). identity is what the fake verifier reports for validToken.
func setup(t *testing.T, authorization string, identity authn.Token) *http.Response {
	t.Helper()
	verifier := authntest.Verifier{Tokens: map[string]authn.Token{validToken: identity}}
	echo := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		caller, ok := authn.CallerFrom(r.Context())
		if !ok {
			t.Error("handler ran with no Caller in the context")
		}
		apierr.WriteJSON(w, http.StatusOK, caller)
	})
	req := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/api/protected", http.NoBody)
	if authorization != "" {
		req.Header.Set("Authorization", authorization)
	}
	rec := httptest.NewRecorder()
	authn.Middleware(verifier)(echo).ServeHTTP(rec, req)
	return rec.Result()
}

var verifiedParent = authn.Token{UID: testUID, Email: "Parent@Example.COM", EmailVerified: true}

func TestMiddleware_Refusals(t *testing.T) {
	tests := []struct {
		name          string
		authorization string
		identity      authn.Token
		status        int
		code          apierr.Code
		message       string
	}{
		{"no Authorization header", "", verifiedParent, http.StatusUnauthorized, apierr.CodeUnauthorized, "Missing Authorization header"},
		{"not the Bearer scheme", "Basic abc", verifiedParent, http.StatusUnauthorized, apierr.CodeUnauthorized, "Authorization header must use the Bearer scheme"},
		{"empty Bearer token", "Bearer   ", verifiedParent, http.StatusUnauthorized, apierr.CodeUnauthorized, "Missing auth token"},
		{"token the verifier refuses", "Bearer bad-token", verifiedParent, http.StatusUnauthorized, apierr.CodeUnauthorized, "Invalid auth token"},
		{"token with no email", "Bearer " + validToken, authn.Token{UID: testUID, EmailVerified: true}, http.StatusUnauthorized, apierr.CodeUnauthorized, "Authenticated account has no email address"},
		{"unverified email", "Bearer " + validToken, authn.Token{UID: testUID, Email: "a@b.test"}, http.StatusForbidden, apierr.CodeEmailNotVerified, "Email address is not verified"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := setup(t, tt.authorization, tt.identity)
			defer resp.Body.Close()

			if resp.StatusCode != tt.status {
				t.Fatalf("status = %d, want %d", resp.StatusCode, tt.status)
			}
			got := apierrtest.Decode(t, resp)
			if got.Code != tt.code || got.Message != tt.message {
				t.Fatalf("body = %+v, want {%s %s}", got, tt.code, tt.message)
			}
		})
	}
}

func TestMiddleware_PutsTheCallerInTheContext(t *testing.T) {
	tests := []struct {
		name     string
		identity authn.Token
		want     authn.Caller
	}{
		{"a Parent, email lowercased", verifiedParent, authn.Caller{UID: testUID, Email: "parent@example.com"}},
		{"a Super-admin", authn.Token{UID: "uid-2", Email: "op@example.com", EmailVerified: true, SuperAdmin: true}, authn.Caller{UID: "uid-2", Email: "op@example.com", SuperAdmin: true}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := setup(t, "Bearer "+validToken, tt.identity)
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				t.Fatalf("status = %d, want 200", resp.StatusCode)
			}
			var got authn.Caller
			if err := json.NewDecoder(resp.Body).Decode(&got); err != nil {
				t.Fatalf("decode: %v", err)
			}
			if got != tt.want {
				t.Fatalf("caller = %+v, want %+v", got, tt.want)
			}
		})
	}
}

func TestCallerFrom_ReportsFalseOutsideTheMiddleware(t *testing.T) {
	if _, ok := authn.CallerFrom(t.Context()); ok {
		t.Fatal("CallerFrom reported a Caller on a bare context")
	}
}
