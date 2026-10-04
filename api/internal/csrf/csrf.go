// Package csrf refuses a cross-site state-changing request by its Origin
// header (ADR 0007). SameSite=Lax on the session cookie already keeps
// the cookie off a cross-site POST, which covers the classic form
// attack; this check closes what Lax leaves open, for example a sibling
// subdomain. No CSRF token scheme. Copied from doula-cloud's csrf
// package.
package csrf

import (
	"net/http"
	"strings"

	"mbu/api/internal/apierr"
)

// stateChanging is the set of methods the check applies to. GET, HEAD
// and OPTIONS change nothing, so a cross-site GET is never refused here.
var stateChanging = map[string]bool{
	http.MethodPost:   true,
	http.MethodPut:    true,
	http.MethodPatch:  true,
	http.MethodDelete: true,
}

// MsgCrossSite is the message of the refusal.
const MsgCrossSite = "Cross-site request refused"

// Wrap refuses with 403 a state-changing request whose Origin header is
// present and is not one of expected. A request with no Origin header
// passes: Cloud Scheduler and curl send none, and this check stops a
// browser acting cross-site; it does not authenticate the caller. A
// browser sends Origin on each same-origin POST, PUT, PATCH and DELETE.
//
// It wraps the whole mux, not only the authenticated routes: POST
// /api/session is state-changing too, and a cross-site sign-in would
// put the attacker's session in the victim's browser.
func Wrap(expected []string, next http.Handler) http.Handler {
	allowed := make(map[string]bool, len(expected))
	for _, origin := range expected {
		if origin = strings.TrimSpace(origin); origin != "" {
			allowed[origin] = true
		}
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if stateChanging[r.Method] {
			if origin := r.Header.Get("Origin"); origin != "" && !allowed[origin] {
				apierr.Write(w, http.StatusForbidden, apierr.CodeForbidden, MsgCrossSite, nil)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}
