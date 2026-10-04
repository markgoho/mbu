package main

import (
	"time"

	"mbu/api/internal/ratelimit"
	"mbu/api/internal/session"
)

// registerSessionRoutes mounts the API-owned session (ADR 0007, #265).
func registerSessionRoutes(rt *router, d Deps) {
	db := d.sessionDB()
	// The sign-in exchange runs with no session, so it is public and
	// limited by address (docs/api-design.md section 6).
	mintLimit := ratelimit.Wrap(d.DB, "session-create", []ratelimit.Rule{ratelimit.IPRule(d.ClientIP, 120, time.Hour)})
	rt.public("POST /api/session", mintLimit(session.Create(d.Verifier, db)),
		exempt("a sign-in mints a new session and ends the one the browser held; there is no Caller to scope a key by"))
	rt.authed("GET /api/session", session.Get())
	// Sign-out needs no live session: it ends what the cookie names, if
	// anything, and always clears the cookie.
	rt.public("DELETE /api/session", session.End(db))
}
