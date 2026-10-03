package clientip_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"mbu/api/internal/clientip"
)

// client is the caller's real address; hosting is a Firebase Hosting
// egress address, which Cloud Run's front end appends on the rewrite path.
const (
	client  = "203.0.113.7"
	hosting = "35.191.0.1"
)

// request is a GET with X-Forwarded-For set to xff ("" sends none) and
// a RemoteAddr of the Cloud Run front end's side of the connection.
func request(t *testing.T, xff string) *http.Request {
	t.Helper()
	r := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/", nil)
	r.RemoteAddr = "169.254.1.1:12345"
	if xff != "" {
		r.Header.Set("X-Forwarded-For", xff)
	}
	return r
}

func TestFrom(t *testing.T) {
	cases := []struct {
		name string
		hops int
		xff  string
		want string
	}{
		{
			// Direct Cloud Run: the GFE appends the peer it sees, so a
			// forged first entry is not the key.
			name: "direct, forged first entry",
			hops: 0, xff: "198.51.100.9, " + client, want: client,
		},
		{
			name: "direct, no client header",
			hops: 0, xff: client, want: client,
		},
		{
			// Firebase Hosting rewrite: Hosting appends the client, then
			// the GFE appends Hosting's egress address.
			name: "hosting, forged first entry",
			hops: 1, xff: "198.51.100.9, " + client + ", " + hosting, want: client,
		},
		{
			name: "hosting, no client header",
			hops: 1, xff: client + ", " + hosting, want: client,
		},
		{
			// Fewer entries than hops: a shorter path than configured,
			// so the rightmost entry is still the GFE's own peer.
			name: "fewer entries than hops",
			hops: 2, xff: client + ", " + hosting, want: hosting,
		},
		{
			name: "spaces around entries",
			hops: 1, xff: "  203.0.113.7 ,35.191.0.1 ", want: client,
		},
		{
			// Local and tests: no proxy, so no header.
			name: "no header falls back to RemoteAddr",
			hops: 1, xff: "", want: "169.254.1.1",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := clientip.Resolver{ProxyHops: tc.hops}.From(request(t, tc.xff))
			if got != tc.want {
				t.Fatalf("From() = %q, want %q", got, tc.want)
			}
		})
	}
}

// TestFrom_ReadsEveryHeaderLine proves a client that sends its own
// X-Forwarded-For line ahead of the one the proxies append to cannot
// make From read only its own line.
func TestFrom_ReadsEveryHeaderLine(t *testing.T) {
	r := request(t, "198.51.100.9")
	r.Header.Add("X-Forwarded-For", client+", "+hosting)

	if got := (clientip.Resolver{ProxyHops: 1}).From(r); got != client {
		t.Fatalf("From() = %q, want %q", got, client)
	}
}

// TestFrom_ForgedFirstEntryKeepsKey is #293's acceptance case: two
// requests from one caller with different forged first entries get the
// same key, on each path.
func TestFrom_ForgedFirstEntryKeepsKey(t *testing.T) {
	for hops, tail := range map[int]string{0: client, 1: client + ", " + hosting} {
		res := clientip.Resolver{ProxyHops: hops}
		a := res.From(request(t, "198.51.100.1, "+tail))
		b := res.From(request(t, "198.51.100.2, "+tail))
		if a != b || a != client {
			t.Fatalf("hops %d: keys = %q, %q, want both 203.0.113.7", hops, a, b)
		}
	}
}
