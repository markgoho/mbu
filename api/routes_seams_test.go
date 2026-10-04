package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"mbu/api/internal/apierr"
	"mbu/api/internal/apierrtest"
	"mbu/api/internal/clientip"
	"mbu/api/internal/idempotency"
	"mbu/api/internal/ratelimit"
	"mbu/api/internal/testdb"
)

// seamDeps is testDeps with a fresh database that holds the Parent's
// account, so a stored Idempotency-Key response has its users row.
func seamDeps(t *testing.T) Deps {
	t.Helper()
	db := testdb.New(t)
	if _, err := db.Admin.ExecContext(t.Context(),
		`INSERT INTO users (uid, email) VALUES ('uid-parent', 'parent@example.com')`); err != nil {
		t.Fatalf("seed: %v", err)
	}
	d := testDeps()
	d.DB = db.App
	return d
}

// TestReplayableRoute_ReplaysThroughTheRouteTable proves the wiring of
// rt.authed with replayable: the Caller from authn.Middleware reaches
// idempotency.Wrap, and a repeat does not run the handler again.
func TestReplayableRoute_ReplaysThroughTheRouteTable(t *testing.T) {
	d := seamDeps(t)
	rt := buildRoutes(d)
	runs := 0
	rt.authed("POST /api/test/things", http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		runs++
		apierr.WriteJSON(w, http.StatusCreated, map[string]int{"run": runs})
	}), replayable)
	h := rt.handler(d.Now)

	post := func(body string) *http.Response {
		req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/api/test/things", strings.NewReader(body))
		authenticate(t, req, d.DB, testNow, tokenParent)
		req.Header.Set(idempotency.HeaderName, "key-1")
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		return rec.Result()
	}

	for range 2 {
		resp := post(`{"name":"x"}`)
		_ = resp.Body.Close()
		if resp.StatusCode != http.StatusCreated {
			t.Fatalf("status = %d, want 201", resp.StatusCode)
		}
	}
	if runs != 1 {
		t.Fatalf("handler ran %d times, want 1", runs)
	}

	resp := post(`{"name":"y"}`)
	defer resp.Body.Close()
	if got := apierrtest.Decode(t, resp); resp.StatusCode != http.StatusConflict || got.Code != apierr.CodeIdempotencyKeyReused {
		t.Fatalf("reuse = %d %s, want 409 %s", resp.StatusCode, got.Code, apierr.CodeIdempotencyKeyReused)
	}
}

// TestRateLimitedRoute_RefusesThe51stRequest is the one test route #247
// supplies: a public route behind ratelimit.Wrap with IPRule(50, 1h).
// #251 mounts GET /api/universities/{id}/public the same way, with the
// limit in docs/api-design.md section 6.
func TestRateLimitedRoute_RefusesThe51stRequest(t *testing.T) {
	d := seamDeps(t)
	rt := buildRoutes(d)
	limit := ratelimit.Wrap(d.DB, "test-limited", []ratelimit.Rule{ratelimit.IPRule(d.ClientIP, 50, time.Hour)})
	rt.public("GET /api/test/limited", limit(okHandler))
	h := rt.handler(d.Now)

	for i := 1; i <= 50; i++ {
		resp := serve(t, h, http.MethodGet, "/api/test/limited", "")
		_ = resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("request %d: status = %d, want 200", i, resp.StatusCode)
		}
	}

	resp := serve(t, h, http.MethodGet, "/api/test/limited", "")
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusTooManyRequests {
		t.Fatalf("request 51: status = %d, want 429", resp.StatusCode)
	}
	for header, want := range map[string]string{"RateLimit-Limit": "50", "RateLimit-Remaining": "0", "Retry-After": "3600"} {
		if got := resp.Header.Get(header); got != want {
			t.Errorf("%s = %q, want %q", header, got, want)
		}
	}
	if got := apierrtest.Decode(t, resp); got.Code != apierr.CodeRateLimited {
		t.Fatalf("code = %q, want %q", got.Code, apierr.CodeRateLimited)
	}
}

// TestRateLimitedRoute_ForgedForwardedForCountsAgainstTheCaller is #293's
// acceptance case through the route table: behind the Firebase Hosting
// rewrite (ProxyHops 1), a new forged first X-Forwarded-For entry on each
// request still counts against the caller's real address.
func TestRateLimitedRoute_ForgedForwardedForCountsAgainstTheCaller(t *testing.T) {
	d := seamDeps(t)
	d.ClientIP = clientip.Resolver{ProxyHops: 1}
	rt := buildRoutes(d)
	limit := ratelimit.Wrap(d.DB, "test-forged", []ratelimit.Rule{ratelimit.IPRule(d.ClientIP, 1, time.Hour)})
	rt.public("GET /api/test/forged", limit(okHandler))
	h := rt.handler(d.Now)

	get := func(forged string) int {
		req := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/api/test/forged", http.NoBody)
		req.Header.Set("X-Forwarded-For", forged+", 203.0.113.7, 35.191.0.1")
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		return rec.Code
	}
	if got := get("198.51.100.1"); got != http.StatusOK {
		t.Fatalf("first request: status = %d, want 200", got)
	}
	if got := get("198.51.100.2"); got != http.StatusTooManyRequests {
		t.Fatalf("second request, new forged entry: status = %d, want 429", got)
	}
}

// TestRateLimitedRoute_PeerRuleCapsADirectCallerThatForgesTheKey is #296:
// on the run.app URL the front end is the only proxy, so with the deployed
// ProxyHops 1 the entry IPRule reads is one the caller wrote. A new forged
// entry on each request gets a new IPRule bucket, but PeerRule keys the
// rightmost entry, the caller's real address, and refuses it.
func TestRateLimitedRoute_PeerRuleCapsADirectCallerThatForgesTheKey(t *testing.T) {
	d := seamDeps(t)
	d.ClientIP = clientip.Resolver{ProxyHops: 1}
	rt := buildRoutes(d)
	limit := ratelimit.Wrap(d.DB, "test-peer", []ratelimit.Rule{
		ratelimit.IPRule(d.ClientIP, 1, time.Hour),
		ratelimit.PeerRule(2, time.Hour),
	})
	rt.public("GET /api/test/peer", limit(okHandler))
	h := rt.handler(d.Now)

	get := func(forged string) int {
		req := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/api/test/peer", http.NoBody)
		req.Header.Set("X-Forwarded-For", forged+", 203.0.113.7")
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		return rec.Code
	}
	for i, forged := range []string{"198.51.100.1", "198.51.100.2"} {
		if got := get(forged); got != http.StatusOK {
			t.Fatalf("request %d, new forged entry: status = %d, want 200", i+1, got)
		}
	}
	if got := get("198.51.100.3"); got != http.StatusTooManyRequests {
		t.Fatalf("request 3, new forged entry: status = %d, want 429 from PeerRule", got)
	}
}

// okHandler answers 200 with a small JSON body: the handler behind each
// test route of this file.
var okHandler = http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
	apierr.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
})
