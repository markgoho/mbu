package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"mbu/api/internal/apierr"
	"mbu/api/internal/authn"
	"mbu/api/internal/authntest"
	"mbu/api/internal/clock"
	"mbu/api/internal/internalauth"
	"mbu/api/internal/mail"

	"github.com/jackc/pgx/v5"
)

// The ID tokens the fake verifier in testDeps knows. A route test signs
// in with one of the verified ones (authenticate); tokenUnverified is
// refused by POST /api/session. tokenNoSession is a cookie value that
// names no session.
const (
	tokenParent     = "token-parent"
	tokenUnverified = "token-unverified"
	tokenSuperAdmin = "token-super-admin"
	tokenNoSession  = "no-such-session"
	tokenNoEmail    = "token-no-email"
)

// testIdentities is the identity behind each ID token of the fake
// verifier.
var testIdentities = map[string]authn.Token{
	tokenParent:     {UID: "uid-parent", Email: "Parent@Example.com", EmailVerified: true},
	tokenUnverified: {UID: "uid-unverified", Email: emailNew},
	tokenSuperAdmin: {UID: uidAdmin, Email: emailAdmin, EmailVerified: true, SuperAdmin: true, DisplayName: "Ada Admin"},
	tokenNoEmail:    {UID: "uid-no-email", EmailVerified: true},
}

// emailAdmin is the Super-admin's address.
const emailAdmin = "admin@example.com"

// addSessionCookie sends value as the request's __session cookie, as a
// browser sends it: name and value only.
func addSessionCookie(req *http.Request, value string) {
	req.Header.Add("Cookie", authn.SessionCookieName+"="+value)
}

// testOrigin is the app's origin in the tests' ExpectedOrigins.
const testOrigin = "https://mbu-platform.web.app"

// authenticate signs req in as the caller token stands for. An OIDC
// token of the internal boundary goes as a Bearer header, as Cloud
// Scheduler sends it. A verified ID token is signed in as a browser is
// after POST /api/session: a session minted in db at now, sent as its
// cookie. Any other token is sent as the cookie value itself, so it
// names no session. "" sends nothing. A new session for each request
// lets a test move its clock as far as it likes.
func authenticate(t *testing.T, req *http.Request, db *sql.DB, now time.Time, token string) {
	t.Helper()
	switch token {
	case "":
		return
	case oidcScheduler, oidcOtherAudience, oidcStranger:
		req.Header.Set("Authorization", "Bearer "+token)
		return
	}
	identity, ok := testIdentities[token]
	if !ok || !identity.EmailVerified || db == nil {
		addSessionCookie(req, token)
		return
	}
	cookie, err := authn.MintSession(t.Context(), db, identity, now)
	if err != nil {
		t.Fatalf("mint a session for %s: %v", token, err)
	}
	addSessionCookie(req, cookie.Value)
}

// The internal boundary of the tests: the audience the guard asks for,
// the one service account it accepts, and the OIDC tokens fakeOIDC knows.
const (
	internalAudience = "https://mbu-api-test.a.run.app"
	schedulerCaller  = "scheduler@merit-badge-university.iam.gserviceaccount.com"

	oidcScheduler     = "oidc-scheduler"
	oidcOtherAudience = "oidc-other-audience"
	oidcStranger      = "oidc-stranger"
)

// fakeOIDC stands in for Google's token check (internalauth.GoogleValidator):
// each token it knows was minted for one audience and one email, and a
// token for another audience is refused, as Google refuses it.
func fakeOIDC(_ context.Context, token, audience string) (string, error) {
	minted := map[string]struct{ email, audience string }{
		oidcScheduler:     {schedulerCaller, internalAudience},
		oidcOtherAudience: {schedulerCaller, "https://elsewhere.a.run.app"},
		oidcStranger:      {"stranger@other-project.iam.gserviceaccount.com", internalAudience},
	}[token]
	if minted.email == "" || minted.audience != audience {
		return "", errors.New("fakeOIDC: token refused")
	}
	return minted.email, nil
}

// testNow is the instant every request in these tests reads.
var testNow = time.Date(2027, time.March, 6, 9, 0, 0, 0, time.UTC)

// testDeps is the Deps every route test builds the table from.
func testDeps() Deps {
	return Deps{
		Verifier:        authntest.Verifier{Tokens: testIdentities},
		Now:             func() time.Time { return testNow },
		ExpectedOrigins: []string{testOrigin},
		InternalAuth: internalauth.New(internalauth.Config{
			Audience: internalAudience,
			Callers:  []string{schedulerCaller},
			Validate: fakeOIDC,
		}),
		Mail: &mail.FakeSender{},
	}
}

// serve sends one request to h with no session. token is an OIDC token
// for an internal route, sent as a Bearer header; "" sends none.
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

// protectedTable is the real route table over a fresh database plus one
// test-only route behind the auth middleware, which echoes the Caller
// and the request clock.
func protectedTable(t *testing.T) *usersFixture {
	t.Helper()
	f := newUsersFixture(t)
	d := testDeps()
	d.DB = f.db.App
	rt := buildRoutes(d)
	rt.authed("GET /api/test/caller", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		caller, _ := authn.CallerFrom(r.Context())
		apierr.WriteJSON(w, http.StatusOK, callerResponse{
			UID: caller.UID, Email: caller.Email, SuperAdmin: caller.SuperAdmin, Now: clock.Now(r.Context()),
		})
	}))
	f.h = rt.handler(d.Now)
	return f
}

func TestProtectedRoute_RefusesAMissingOrInvalidSession(t *testing.T) {
	f := protectedTable(t)
	tests := []struct {
		name    string
		token   string
		message string
	}{
		{"no cookie", "", authn.MsgMissingSession},
		{"a cookie that names no session", tokenNoSession, authn.MsgInvalidSession},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := f.send(http.MethodGet, "/api/test/caller", tt.token, "")
			defer resp.Body.Close()
			got := wantRefusal(t, resp, http.StatusUnauthorized, apierr.CodeUnauthorized)
			if got.Message != tt.message {
				t.Fatalf("message = %q, want %q", got.Message, tt.message)
			}
		})
	}
}

func TestProtectedRoute_FillsTheCaller(t *testing.T) {
	f := protectedTable(t)
	tests := []struct {
		name  string
		token string
		want  callerResponse
	}{
		{"a Parent, email lowercased", tokenParent, callerResponse{UID: "uid-parent", Email: "parent@example.com", Now: testNow}},
		{"a Super-admin", tokenSuperAdmin, callerResponse{UID: uidAdmin, Email: emailAdmin, SuperAdmin: true, Now: testNow}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := f.send(http.MethodGet, "/api/test/caller", tt.token, "")
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				t.Fatalf("status = %d, want 200", resp.StatusCode)
			}
			got := decode[callerResponse](t, resp)
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
	f := newUsersFixture(t)
	d := testDeps()
	d.DB = f.db.App
	rt := buildRoutes(d)
	rt.authed("GET /api/test/panic", http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("pq: password authentication failed for user app_runtime")
	}))
	f.h = rt.handler(d.Now)

	resp := f.send(http.MethodGet, "/api/test/panic", tokenParent, "")
	defer resp.Body.Close()

	got := wantRefusal(t, resp, http.StatusInternalServerError, apierr.CodeInternal)
	if got.Message != apierr.MsgInternalError || got.Details != nil {
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

func TestOpenDB(t *testing.T) {
	env := func(value string) func(string) string {
		return func(key string) string {
			if key == "DATABASE_URL" {
				return value
			}
			return ""
		}
	}
	for _, unset := range []string{"", "  "} {
		if _, err := openDB(env(unset)); !errors.Is(err, errNoDatabaseURL) {
			t.Fatalf("openDB(%q) error = %v, want errNoDatabaseURL", unset, err)
		}
	}
	if _, err := openDB(env("postgres://user@host:not-a-port/db")); err == nil {
		t.Fatal("openDB with a malformed DATABASE_URL = nil error, want the parse error")
	}
	// The pool does not connect yet, so a well-formed URL needs no server.
	db, err := openDB(env("postgres://app:secret@127.0.0.1:1/mbu?sslmode=disable"))
	if err != nil {
		t.Fatalf("openDB with a valid DATABASE_URL: %v", err)
	}
	if got := db.Stats().MaxOpenConnections; got != maxOpenConns {
		t.Errorf("MaxOpenConnections = %d, want %d (db-f1-micro budget, infrastructure.md)", got, maxOpenConns)
	}
	if err := db.Close(); err != nil {
		t.Fatalf("close: %v", err)
	}
}

// TestOpenDB_TheCloudRunDSNDialsTheCloudSQLSocket pins the shape of the
// DATABASE_URL secret value in api/docs/infrastructure.md: Cloud Run
// mounts the Cloud SQL socket under /cloudsql, and the URL has no host
// of its own.
func TestOpenDB_TheCloudRunDSNDialsTheCloudSQLSocket(t *testing.T) {
	const socketDir = "/cloudsql/merit-badge-university:us-east4:mbu-pg"
	dsn := "postgres://app_runtime_login:0123abcd@/mbu?host=" + socketDir + "&sslmode=disable"
	cfg, err := pgx.ParseConfig(dsn)
	if err != nil {
		t.Fatalf("parse the Cloud Run DSN: %v", err)
	}
	if cfg.Host != socketDir || cfg.Database != "mbu" || cfg.User != "app_runtime_login" {
		t.Errorf("Cloud Run DSN = host %q, database %q, user %q; want the socket dir, mbu, app_runtime_login",
			cfg.Host, cfg.Database, cfg.User)
	}
	db, err := openDB(func(key string) string {
		if key == "DATABASE_URL" {
			return dsn
		}
		return ""
	})
	if err != nil {
		t.Fatalf("openDB with the Cloud Run DSN: %v", err)
	}
	if err := db.Close(); err != nil {
		t.Fatalf("close: %v", err)
	}
}

func TestClientIPProxyHops(t *testing.T) {
	env := func(value string) func(string) string {
		return func(key string) string {
			if key == "CLIENT_IP_PROXY_HOPS" {
				return value
			}
			return ""
		}
	}
	for _, tc := range []struct {
		value string
		want  int
	}{{"", 0}, {"0", 0}, {"1", 1}, {"\t1\n", 1}} {
		if got, err := clientIPProxyHops(env(tc.value)); err != nil || got != tc.want {
			t.Errorf("clientIPProxyHops(%q) = %d, %v; want %d, nil", tc.value, got, err, tc.want)
		}
	}
	for _, bad := range []string{"-1", "one", "1.5"} {
		if _, err := clientIPProxyHops(env(bad)); !errors.Is(err, errBadProxyHops) {
			t.Errorf("clientIPProxyHops(%q) error = %v, want errBadProxyHops", bad, err)
		}
	}
}

// TestInternalGuard reads the guard from the environment: with nothing
// set (an unconfigured service) it refuses a Bearer token and the secret
// header; with INTERNAL_WORKER_SECRET set (the local stack) it takes that
// header; with INTERNAL_OIDC_AUDIENCE and INTERNAL_OIDC_CALLERS set (the
// deployed posture) it takes the allowlisted caller's token for that
// audience only.
func TestInternalGuard(t *testing.T) {
	request := func(header, value string) *http.Request {
		r := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/api/internal/retention/purge", http.NoBody)
		r.Header.Set(header, value)
		return r
	}
	none := internalGuard(func(string) string { return "" }, fakeOIDC)
	if none.Allow(request("Authorization", "Bearer anything")) || none.Allow(request("X-Internal-Secret", "")) {
		t.Error("an unconfigured guard allowed a request")
	}

	local := internalGuard(func(key string) string {
		if key == "INTERNAL_WORKER_SECRET" {
			return "local-worker-secret"
		}
		return ""
	}, fakeOIDC)
	if !local.Allow(request("X-Internal-Secret", "local-worker-secret")) {
		t.Error("the guard refused the configured INTERNAL_WORKER_SECRET")
	}
	if local.Allow(request("X-Internal-Secret", "guessed")) {
		t.Error("the guard allowed a wrong secret")
	}

	deployed := internalGuard(func(key string) string {
		return map[string]string{
			"INTERNAL_OIDC_AUDIENCE": internalAudience,
			"INTERNAL_OIDC_CALLERS":  "other@merit-badge-university.iam.gserviceaccount.com, " + schedulerCaller,
		}[key]
	}, fakeOIDC)
	if !deployed.Allow(request("Authorization", "Bearer "+oidcScheduler)) {
		t.Error("the deployed guard refused the allowlisted caller")
	}
	for _, token := range []string{oidcOtherAudience, oidcStranger} {
		if deployed.Allow(request("Authorization", "Bearer "+token)) {
			t.Errorf("the deployed guard allowed %s", token)
		}
	}
	if deployed.Allow(request("X-Internal-Secret", "")) {
		t.Error("the deployed guard allowed the secret header with no secret set")
	}
}

// envMailgunKey is the variable that turns real mail on.
const envMailgunKey = "MAILGUN_API_KEY"

// TestMailSender: with no MAILGUN_API_KEY the service sends no real
// mail (a FakeSender that logs each send); with a key it is a
// MailgunSender on the default domain and host, or the overrides.
func TestMailSender(t *testing.T) {
	env := func(vars map[string]string) func(string) string {
		return func(key string) string { return vars[key] }
	}
	var logged []string
	logf := func(format string, args ...any) { logged = append(logged, fmt.Sprintf(format, args...)) }

	fake, ok := mailSender(env(map[string]string{envMailgunKey: "  "}), logf).(*mail.FakeSender)
	if !ok {
		t.Fatal("mailSender with no key is not a FakeSender")
	}
	if id, err := fake.Send(t.Context(), mail.Message{To: "p@example.com", Subject: "Hi"}); err != nil || id != "fake-1" {
		t.Fatalf("fake send = %q, %v", id, err)
	}
	if len(logged) != 2 || logged[1] != `mail: fake send fake-1 to=p@example.com subject="Hi"` {
		t.Fatalf("logged = %q", logged)
	}

	for _, tc := range []struct {
		vars               map[string]string
		wantDomain, wantAt string
	}{
		{map[string]string{envMailgunKey: "k"}, "mg.merit-badge.university", "https://api.mailgun.net"},
		{map[string]string{envMailgunKey: "k", "MAILGUN_DOMAIN": " mg.example.org ", "MAILGUN_API_BASE": "https://api.eu.mailgun.net"},
			"mg.example.org", "https://api.eu.mailgun.net"},
	} {
		mg, ok := mailSender(env(tc.vars), logf).(*mail.MailgunSender)
		if !ok || mg.APIKey != "k" || mg.Domain != tc.wantDomain || mg.BaseURL != tc.wantAt || mg.HTTPClient.Timeout == 0 {
			t.Errorf("mailSender(%v) = %+v, want Mailgun on %s at %s", tc.vars, mg, tc.wantDomain, tc.wantAt)
		}
	}
}
