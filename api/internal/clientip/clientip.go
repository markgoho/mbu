// Package clientip resolves the real caller address behind Cloud Run's
// Google Front End. Copied from doula-cloud (#247); ratelimit.IPRule is
// its one consumer.
//
// The trust in the first X-Forwarded-For entry is doula-cloud's, where
// the caller reaches Cloud Run directly. MBU's traffic comes through the
// Firebase Hosting rewrite, which adds its own hop; the deploy tickets
// (#259, #260) confirm which entry is the real caller before a rate
// limit depends on it.
package clientip

import (
	"net"
	"net/http"
	"strings"
)

// From returns the caller's address, for use as a rate-limit dimension
// (ratelimit). The service runs behind Cloud Run's Google Front End,
// which terminates the caller's own TLS
// connection and sets X-Forwarded-For's first entry to that connection's
// real peer address itself -- a caller can't spoof this the way it could
// a header GFE merely passed through, since GFE is the one writing it,
// not relaying client-supplied content. r.RemoteAddr, by contrast, is
// GFE's own proxy address at that point, not the caller's -- only useful
// as the local-dev/test fallback when there's no GFE in front of the
// process and the header is absent.
func From(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		first, _, _ := strings.Cut(xff, ",")
		return strings.TrimSpace(first)
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	// coverage:ignore reason: net/http always sets RemoteAddr in host:port form, not exercised by unit tests
	if err != nil {
		// coverage:ignore reason: net/http always sets RemoteAddr in host:port form, not exercised by unit tests
		return r.RemoteAddr
	}
	return host
}
