package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"mbu/api/internal/apierr"
	"mbu/api/internal/authn"
	"mbu/api/internal/csrf"
	"mbu/api/internal/session"
	"mbu/api/internal/testdb"
)

const pathSession = "/api/session"

// sessionCall is one request to the session routes: an optional cookie
// value and Origin header.
type sessionCall struct {
	method, body, cookie, origin string
}

// call sends c to pathSession, or to path when it is set.
func (f *usersFixture) call(c sessionCall, path ...string) *http.Response {
	f.t.Helper()
	target := pathSession
	if len(path) == 1 {
		target = path[0]
	}
	req := httptest.NewRequestWithContext(f.t.Context(), c.method, target, strings.NewReader(c.body))
	if c.cookie != "" {
		addSessionCookie(req, c.cookie)
	}
	if c.origin != "" {
		req.Header.Set("Origin", c.origin)
	}
	rec := httptest.NewRecorder()
	f.h.ServeHTTP(rec, req)
	return rec.Result()
}

// signIn exchanges token for a session and returns the cookie value.
func (f *usersFixture) signIn(token string) string {
	f.t.Helper()
	resp := f.call(sessionCall{method: http.MethodPost, body: `{"idToken":"` + token + `"}`, origin: testOrigin})
	defer resp.Body.Close()
	wantStatus(f.t, resp, http.StatusOK)
	return sessionCookie(f.t, resp).Value
}

// sessionCookie is the __session cookie resp sets.
func sessionCookie(t *testing.T, resp *http.Response) *http.Cookie {
	t.Helper()
	for _, c := range resp.Cookies() {
		if c.Name == authn.SessionCookieName {
			return c
		}
	}
	t.Fatalf("no %s cookie in %v", authn.SessionCookieName, resp.Header.Values("Set-Cookie"))
	return nil
}

func TestCreateSession_SetsTheCookieAndStoresOnlyItsDigest(t *testing.T) {
	f := newUsersFixture(t)
	resp := f.call(sessionCall{method: http.MethodPost, body: `{"idToken":"` + tokenSuperAdmin + `"}`, origin: testOrigin})
	defer resp.Body.Close()

	wantStatus(t, resp, http.StatusOK)
	want := session.Response{UID: uidAdmin, Email: emailAdmin, DisplayName: "Ada Admin", SuperAdmin: true}
	if got := decode[session.Response](t, resp); got != want {
		t.Fatalf("body = %+v, want %+v", got, want)
	}
	c := sessionCookie(t, resp)
	if !c.HttpOnly || !c.Secure || c.SameSite != http.SameSiteLaxMode || c.Path != "/" ||
		c.MaxAge != int(authn.SessionLifetime.Seconds()) || len(c.Value) < 20 {
		t.Fatalf("cookie = %+v, want an HttpOnly, Secure, Lax cookie on / for a week", c)
	}
	if n := f.count(`SELECT count(*) FROM sessions WHERE token_hash = $1`, c.Value); n != 0 {
		t.Fatal("the sessions table holds the plaintext token")
	}
	if n := f.count(`SELECT count(*) FROM sessions WHERE uid = $1 AND super_admin AND expires_at = $2`, uidAdmin,
		testNow.Add(authn.SessionLifetime)); n != 1 {
		t.Fatalf("session rows = %d, want 1 that ends a week from now", n)
	}
	if got := resp.Header.Get("RateLimit-Limit"); got != "120" {
		t.Fatalf("RateLimit-Limit = %q, want the sign-in limit 120", got)
	}
}

func TestGetSession_AnswersTheSignedInAdult(t *testing.T) {
	f := newUsersFixture(t)
	cookie := f.signIn(tokenParent)

	resp := f.call(sessionCall{method: http.MethodGet, cookie: cookie})
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	want := session.Response{UID: uidParent, Email: emailParent}
	if got := decode[session.Response](t, resp); got != want {
		t.Fatalf("body = %+v, want %+v", got, want)
	}
	if got := resp.Header.Get("Cache-Control"); got != "no-store" {
		t.Fatalf("Cache-Control = %q, want no-store", got)
	}
}

func TestCreateSession_RefusesABadRequestOrToken(t *testing.T) {
	tests := []struct {
		name, body string
		status     int
		code       apierr.Code
	}{
		{"a body that is not JSON", `{`, http.StatusBadRequest, apierr.CodeInvalidArgument},
		{"no idToken", `{"idToken":"  "}`, http.StatusBadRequest, apierr.CodeInvalidArgument},
		{"a token the verifier refuses", `{"idToken":"forged"}`, http.StatusUnauthorized, apierr.CodeUnauthorized},
		{"a token with no email", `{"idToken":"` + tokenNoEmail + `"}`, http.StatusUnauthorized, apierr.CodeUnauthorized},
		{"an unverified email", `{"idToken":"` + tokenUnverified + `"}`, http.StatusForbidden, apierr.CodeEmailNotVerified},
	}
	f := newUsersFixture(t)
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := f.call(sessionCall{method: http.MethodPost, body: tt.body})
			defer resp.Body.Close()
			wantRefusal(t, resp, tt.status, tt.code)
			if len(resp.Cookies()) != 0 {
				t.Fatalf("a refused sign-in set %v", resp.Header.Values("Set-Cookie"))
			}
		})
	}
	if n := f.count(`SELECT count(*) FROM sessions`); n != 0 {
		t.Fatalf("session rows = %d, want 0", n)
	}
}

func TestCreateSession_EndsTheSessionTheBrowserHeldAndSweepsExpiredOnes(t *testing.T) {
	f := newUsersFixture(t)
	old := f.signIn(tokenParent)
	f.exec(`INSERT INTO sessions (token_hash, uid, email, expires_at) VALUES ('stale', 'uid-gone', 'g@example.com', $1)`, testNow)

	resp := f.call(sessionCall{method: http.MethodPost, body: `{"idToken":"` + tokenParent + `"}`, cookie: old})
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	if sessionCookie(t, resp).Value == old {
		t.Fatal("the sign-in sent the old token again")
	}
	if n := f.count(`SELECT count(*) FROM sessions`); n != 1 {
		t.Fatalf("session rows = %d, want only the new one", n)
	}
	resp = f.call(sessionCall{method: http.MethodGet, cookie: old})
	defer resp.Body.Close()
	wantRefusal(t, resp, http.StatusUnauthorized, apierr.CodeUnauthorized)
}

func TestSession_ExpiresAfterAWeekWithNoRequest(t *testing.T) {
	f := newUsersFixture(t)
	cookie := f.signIn(tokenParent)

	f.now = testNow.Add(authn.SessionLifetime)
	resp := f.call(sessionCall{method: http.MethodGet, cookie: cookie})
	defer resp.Body.Close()
	got := wantRefusal(t, resp, http.StatusUnauthorized, apierr.CodeUnauthorized)
	if got.Message != authn.MsgInvalidSession {
		t.Fatalf("message = %q, want %q", got.Message, authn.MsgInvalidSession)
	}
}

// A request renews the session once less than half of a week is left:
// the same token, a new Max-Age, and a new expiry in the row.
func TestSession_IsRenewedPastHalfItsLifetime(t *testing.T) {
	f := newUsersFixture(t)
	cookie := f.signIn(tokenParent)

	f.now = testNow.Add(24 * time.Hour)
	resp := f.call(sessionCall{method: http.MethodGet, cookie: cookie})
	_ = resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	if len(resp.Cookies()) != 0 {
		t.Fatal("a session with most of its lifetime left was renewed")
	}

	f.now = testNow.Add(authn.SessionLifetime/2 + time.Minute)
	resp = f.call(sessionCall{method: http.MethodGet, cookie: cookie})
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	if c := sessionCookie(t, resp); c.Value != cookie || c.MaxAge != int(authn.SessionLifetime.Seconds()) {
		t.Fatalf("renewed cookie = %+v, want the same token for a full week", c)
	}
	if n := f.count(`SELECT count(*) FROM sessions WHERE expires_at = $1`, f.now.Add(authn.SessionLifetime)); n != 1 {
		t.Fatal("the row's expiry did not move")
	}
}

func TestEndSession_EndsItAndClearsTheCookie(t *testing.T) {
	f := newUsersFixture(t)
	cookie := f.signIn(tokenParent)
	other := f.signIn(tokenParent)

	resp := f.call(sessionCall{method: http.MethodDelete, cookie: cookie, origin: testOrigin})
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusNoContent)
	if c := sessionCookie(t, resp); c.Value != "" || c.MaxAge >= 0 {
		t.Fatalf("cookie = %+v, want it cleared", c)
	}

	resp = f.call(sessionCall{method: http.MethodGet, cookie: cookie})
	defer resp.Body.Close()
	wantRefusal(t, resp, http.StatusUnauthorized, apierr.CodeUnauthorized)

	// Only this browser's session ends.
	resp = f.call(sessionCall{method: http.MethodGet, cookie: other})
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
}

func TestEndSession_NeedsNoLiveSession(t *testing.T) {
	f := newUsersFixture(t)
	for _, cookie := range []string{"", tokenNoSession} {
		resp := f.call(sessionCall{method: http.MethodDelete, cookie: cookie})
		_ = resp.Body.Close()
		wantStatus(t, resp, http.StatusNoContent)
		if c := sessionCookie(t, resp); c.MaxAge >= 0 {
			t.Fatalf("cookie = %+v, want it cleared", c)
		}
	}
}

func TestDeleteAccount_EndsEverySessionOfTheAccount(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	cookie := f.signIn(tokenParent)
	_ = f.signIn(tokenParent)
	f.signIn(tokenSuperAdmin)

	resp := f.call(sessionCall{method: http.MethodDelete, cookie: cookie}, pathMe)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusNoContent)
	if c := sessionCookie(t, resp); c.MaxAge >= 0 {
		t.Fatalf("cookie = %+v, want it cleared", c)
	}
	if n := f.count(`SELECT count(*) FROM sessions WHERE uid = $1`, uidParent); n != 0 {
		t.Fatalf("sessions of the deleted account = %d, want 0", n)
	}
	if n := f.count(`SELECT count(*) FROM sessions`); n != 1 {
		t.Fatalf("sessions = %d, want the other account's one kept", n)
	}
}

// csrf.Wrap refuses a state-changing request from another origin, before
// any route runs, and passes a read, the app's own origin, and a caller
// that sends no Origin (Cloud Scheduler, curl).
func TestCrossSiteCheck(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	signIn := `{"idToken":"` + tokenParent + `"}`

	resp := f.call(sessionCall{method: http.MethodPost, body: signIn, origin: "https://evil.example"})
	defer resp.Body.Close()
	if got := wantRefusal(t, resp, http.StatusForbidden, apierr.CodeForbidden); got.Message != csrf.MsgCrossSite {
		t.Fatalf("message = %q, want %q", got.Message, csrf.MsgCrossSite)
	}
	if n := f.count(`SELECT count(*) FROM sessions`); n != 0 {
		t.Fatal("a cross-site sign-in minted a session")
	}

	cookie := f.signIn(tokenParent)
	resp = f.call(sessionCall{method: http.MethodPatch, body: `{}`, cookie: cookie, origin: "http://localhost:4200"}, pathMe)
	defer resp.Body.Close()
	wantRefusal(t, resp, http.StatusForbidden, apierr.CodeForbidden)

	for _, c := range []sessionCall{
		{method: http.MethodGet, cookie: cookie, origin: "https://evil.example"},
		{method: http.MethodPost, body: signIn},
	} {
		resp := f.call(c)
		_ = resp.Body.Close()
		wantStatus(t, resp, http.StatusOK)
	}
}

// sessionsClosedFixture is the route table with a working DB (for the
// rate limit) and a session pool that fails every query.
func sessionsClosedFixture(t *testing.T) *usersFixture {
	t.Helper()
	f := &usersFixture{t: t, db: testdb.New(t), now: testNow}
	d := testDeps()
	d.DB = f.db.App
	d.SessionDB = closedDB(t)
	f.h = routes(d)
	return f
}

// someSession is a cookie value for a store that cannot be asked.
const someSession = "some-session"

// A session store that cannot answer is a 500, never a 401: it must not
// read as "signed out". Sign-out still clears the cookie.
func TestSession_ADatabaseFailure(t *testing.T) {
	f := sessionsClosedFixture(t)
	signIn := `{"idToken":"` + tokenParent + `"}`
	for _, c := range []sessionCall{
		{method: http.MethodGet, cookie: someSession},
		{method: http.MethodPost, body: signIn},
		{method: http.MethodPost, body: signIn, cookie: someSession},
	} {
		resp := f.call(c)
		_ = resp.Body.Close()
		wantStatus(t, resp, http.StatusInternalServerError)
	}

	resp := f.call(sessionCall{method: http.MethodDelete, cookie: someSession})
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusNoContent)
	if c := sessionCookie(t, resp); c.MaxAge >= 0 {
		t.Fatalf("cookie = %+v, want it cleared", c)
	}
}

func TestExpectedOrigins(t *testing.T) {
	env := func(v string) func(string) string { return func(string) string { return v } }
	for _, unset := range []string{"", " , "} {
		if _, err := expectedOrigins(env(unset)); err == nil {
			t.Errorf("expectedOrigins(%q) = nil error, want errNoExpectedOrigins", unset)
		}
	}
	got, err := expectedOrigins(env(" https://mbu-platform.web.app ,, https://mbu-platform.firebaseapp.com"))
	if err != nil || strings.Join(got, " ") != "https://mbu-platform.web.app https://mbu-platform.firebaseapp.com" {
		t.Fatalf("expectedOrigins = %q, %v", got, err)
	}
}
