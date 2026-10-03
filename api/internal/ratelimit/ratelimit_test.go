package ratelimit_test

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"mbu/api/internal/apierr"
	"mbu/api/internal/apierrtest"
	"mbu/api/internal/clientip"
	"mbu/api/internal/clock"
	"mbu/api/internal/ratelimit"
	"mbu/api/internal/testdb"
)

// start is the instant the first request of each test reads.
var start = time.Date(2027, time.March, 6, 9, 0, 0, 0, time.UTC)

// limited is a handler behind Wrap that counts the requests that reach it.
type limited struct {
	handler http.Handler
	reached int
}

func newLimited(db ratelimit.Querier, endpoint string, rules ...ratelimit.Rule) *limited {
	l := &limited{}
	l.handler = ratelimit.Wrap(db, endpoint, rules)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		l.reached++
		w.WriteHeader(http.StatusOK)
	}))
	return l
}

// get sends one GET from ip at the instant now.
func (l *limited) get(t *testing.T, ip string, now time.Time) *http.Response {
	t.Helper()
	req := httptest.NewRequestWithContext(clock.Into(t.Context(), func() time.Time { return now }), http.MethodGet, "/", http.NoBody)
	req.RemoteAddr = ip + ":40000"
	rec := httptest.NewRecorder()
	l.handler.ServeHTTP(rec, req)
	return rec.Result()
}

// mustPass sends a GET from ip at now and fails the test unless it is a
// 200 with remaining requests left in a window of limit.
func (l *limited) mustPass(t *testing.T, ip string, now time.Time, limit, remaining int) {
	t.Helper()
	resp := l.get(t, ip, now)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if got := resp.Header.Get("RateLimit-Limit"); got != strconv.Itoa(limit) {
		t.Fatalf("RateLimit-Limit = %q, want %d", got, limit)
	}
	if got := resp.Header.Get("RateLimit-Remaining"); got != strconv.Itoa(remaining) {
		t.Fatalf("RateLimit-Remaining = %q, want %d", got, remaining)
	}
}

// mustRefuse sends a GET from ip at now and fails the test unless it is
// a 429 RATE_LIMITED with the three headers.
func (l *limited) mustRefuse(t *testing.T, ip string, now time.Time, limit, retryAfter int) {
	t.Helper()
	resp := l.get(t, ip, now)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusTooManyRequests {
		t.Fatalf("status = %d, want 429", resp.StatusCode)
	}
	for header, want := range map[string]string{
		"RateLimit-Limit":     strconv.Itoa(limit),
		"RateLimit-Remaining": "0",
		"Retry-After":         strconv.Itoa(retryAfter),
	} {
		if got := resp.Header.Get(header); got != want {
			t.Errorf("%s = %q, want %q", header, got, want)
		}
	}
	if got := apierrtest.Decode(t, resp); got.Code != apierr.CodeRateLimited || got.Message == "" {
		t.Fatalf("body = %+v, want RATE_LIMITED with a message", got)
	}
}

func TestWrap_The51stRequestInAWindowIsRefused(t *testing.T) {
	db := testdb.New(t)
	l := newLimited(db.App, "test", ratelimit.IPRule(clientip.Resolver{}, 50, time.Hour))

	for i := 1; i <= 50; i++ {
		l.mustPass(t, "203.0.113.7", start.Add(time.Duration(i)*time.Second), 50, 50-i)
	}
	// The window started with the first request, at start+1s, so at
	// start+10m it has 50 minutes and 1 second left.
	l.mustRefuse(t, "203.0.113.7", start.Add(10*time.Minute), 50, 3001)

	if l.reached != 50 {
		t.Fatalf("handler ran %d times, want 50", l.reached)
	}
}

// TestWrap_TwoConnectionsShareOneCounter stands for two Cloud Run
// instances: each handler counts through its own database session, and
// the limit holds across both.
func TestWrap_TwoConnectionsShareOneCounter(t *testing.T) {
	db := testdb.New(t)
	conn := func() *sql.Conn {
		c, err := db.App.Conn(t.Context())
		if err != nil {
			t.Fatalf("conn: %v", err)
		}
		t.Cleanup(func() { _ = c.Close() })
		return c
	}
	instanceA := newLimited(conn(), "test", ratelimit.IPRule(clientip.Resolver{}, 2, time.Hour))
	instanceB := newLimited(conn(), "test", ratelimit.IPRule(clientip.Resolver{}, 2, time.Hour))

	instanceA.mustPass(t, "203.0.113.7", start, 2, 1)
	instanceB.mustPass(t, "203.0.113.7", start, 2, 0)
	instanceA.mustRefuse(t, "203.0.113.7", start, 2, 3600)
}

func TestWrap_ANewWindowStartsTheCountAgain(t *testing.T) {
	db := testdb.New(t)
	l := newLimited(db.App, "test", ratelimit.IPRule(clientip.Resolver{}, 1, time.Hour))

	l.mustPass(t, "203.0.113.7", start, 1, 0)
	l.mustRefuse(t, "203.0.113.7", start.Add(time.Hour-time.Second), 1, 1)
	l.mustPass(t, "203.0.113.7", start.Add(time.Hour), 1, 0)
}

func TestWrap_EachAddressAndEndpointHasItsOwnCount(t *testing.T) {
	db := testdb.New(t)
	public := newLimited(db.App, "public", ratelimit.IPRule(clientip.Resolver{}, 1, time.Hour))
	other := newLimited(db.App, "other", ratelimit.IPRule(clientip.Resolver{}, 1, time.Hour))

	public.mustPass(t, "203.0.113.7", start, 1, 0)
	public.mustPass(t, "198.51.100.4", start, 1, 0)
	other.mustPass(t, "203.0.113.7", start, 1, 0)
	public.mustRefuse(t, "203.0.113.7", start, 1, 3600)
}

// TestWrap_HeadersNameTheTightestRule proves a passing request reports
// the rule closest to its cap, and a breach of any one rule refuses.
func TestWrap_HeadersNameTheTightestRule(t *testing.T) {
	db := testdb.New(t)
	everyone := ratelimit.Rule{
		Dimension: "all",
		Key:       func(*http.Request) string { return "all" },
		Max:       2,
		Window:    time.Minute,
	}
	l := newLimited(db.App, "test", ratelimit.IPRule(clientip.Resolver{}, 10, time.Hour), everyone)

	l.mustPass(t, "203.0.113.7", start, 2, 1)
	l.mustPass(t, "198.51.100.4", start, 2, 0)
	l.mustRefuse(t, "192.0.2.1", start, 2, 60)
}

func TestWrap_ADatabaseFailureIsA500(t *testing.T) {
	down, err := sql.Open("pgx", "postgres://app:secret@127.0.0.1:1/mbu?sslmode=disable&connect_timeout=1")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	t.Cleanup(func() { _ = down.Close() })
	l := newLimited(down, "test", ratelimit.IPRule(clientip.Resolver{}, 1, time.Hour))

	resp := l.get(t, "203.0.113.7", start)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", resp.StatusCode)
	}
	if got := apierrtest.Decode(t, resp); got.Code != apierr.CodeInternal {
		t.Fatalf("code = %q, want INTERNAL", got.Code)
	}
	if l.reached != 0 {
		t.Fatal("the handler ran after the counter failed")
	}
}
