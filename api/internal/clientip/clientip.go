// Package clientip resolves the caller's address behind Cloud Run's
// Google Front End (GFE), for use as a rate-limit key (ratelimit.IPRule).
//
// Each proxy appends to the X-Forwarded-For header it receives; it does
// not replace it. So the left entries are whatever the client sent, and
// only the entries that a proxy we trust appended are true. The GFE is
// the last proxy: it appends the address of its own TCP peer, so the
// rightmost entry is the only one a client can never write (#293).
//
// The two paths to mbu-api (#240, #259):
//
//   - Direct to the run.app URL: client -> GFE.
//     X-Forwarded-For is "<client's own entries>, <client>".
//     The client is the rightmost entry: ProxyHops 0.
//   - The Firebase Hosting rewrite (/api/** -> Cloud Run):
//     client -> Hosting -> GFE. Hosting appends the client, then the GFE
//     appends Hosting's egress address, which is a shared Google address.
//     X-Forwarded-For is "<client's own entries>, <client>, <Hosting>".
//     The client is one entry left of the rightmost: ProxyHops 1.
//
// ProxyHops counts the proxies in front of the GFE that each append one
// entry. Too low a value keys every Hosting caller on Hosting's egress
// address, so they share one bucket (loud: 429s for everyone). Too high a
// value reads an entry the client wrote (silent: a script gets a new
// bucket per request). So the default is 0, and the deployment sets 1.
//
// Observed on 2026-10-04 (#296), from Cloud Run's request log
// (httpRequest.remoteIp, the GFE's peer): on the run.app URL the peer is
// the caller, also when the caller sends its own X-Forwarded-For; on the
// Hosting rewrite it is a Google egress address (192.178.11.x, a
// different one per request). So one proxy sits in front of the GFE on
// the Hosting path, which agrees with ProxyHops 1. The full header was
// not echoed: the auto-mode classifier refused the temporary echo service.
//
// The run.app URL must stay public: Cloud Scheduler calls it directly
// (terraform/scheduler.tf), so default_uri_disabled is not an option. On
// that path, with ProxyHops 1, the entry the resolver reads is one the
// caller wrote. So each limited route also has ratelimit.PeerRule, keyed
// on the rightmost entry with a cap 10 times the IPRule cap: a direct
// caller that forges the entry still has one bucket there.
package clientip

import (
	"net"
	"net/http"
	"strings"
)

// Resolver reads the caller's address from a request. The zero value
// trusts only the GFE (ProxyHops 0).
type Resolver struct {
	// ProxyHops is how many proxies in front of Cloud Run's GFE append an
	// entry to X-Forwarded-For: 0 for a direct call, 1 behind the
	// Firebase Hosting rewrite. Set from CLIENT_IP_PROXY_HOPS.
	ProxyHops int
}

// From returns the caller's address: the X-Forwarded-For entry ProxyHops
// places left of the rightmost. A header with too few entries came by a
// shorter path than configured, so From takes the rightmost, the GFE's own
// peer, which no client can write. With no header (local and tests,
// with no proxy in front), it is the host of r.RemoteAddr.
func (rv Resolver) From(r *http.Request) string {
	// A client can send the header on more than one line, and a proxy
	// appends to the last; Get reads only the first. So read them all,
	// in order, as one list.
	if xff := strings.Join(r.Header.Values("X-Forwarded-For"), ","); xff != "" {
		entries := strings.Split(xff, ",")
		i := len(entries) - 1 - rv.ProxyHops
		if i < 0 {
			i = len(entries) - 1
		}
		return strings.TrimSpace(entries[i])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	// coverage:ignore reason: net/http always sets RemoteAddr in host:port form, not exercised by unit tests
	if err != nil {
		// coverage:ignore reason: net/http always sets RemoteAddr in host:port form, not exercised by unit tests
		return r.RemoteAddr
	}
	return host
}
