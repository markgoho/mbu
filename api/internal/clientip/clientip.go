// Package clientip resolves the real caller address behind Cloud Run's
// Google Front End. Copied from doula-cloud (#247); ratelimit.IPRule is
// its one consumer.
//
// From trusts the first X-Forwarded-For entry, as doula-cloud does. A
// proxy appends to the header a client sends, so a client can set that
// entry itself and get a new rate-limit bucket on each request. Which
// entry a proxy wrote depends on the path to the service (direct Cloud
// Run, or the Firebase Hosting rewrite); #293 decides it from the
// deployed headers before #251 depends on IPRule.
package clientip

import (
	"net"
	"net/http"
	"strings"
)

// From returns the caller's address, for use as a rate-limit dimension
// (ratelimit): the first X-Forwarded-For entry (see the package comment
// for why that is not yet trusted), else the host of r.RemoteAddr, the
// local and test path with no proxy in front.
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
