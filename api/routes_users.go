package main

import (
	"mbu/api/internal/scouts"
	"mbu/api/internal/users"
)

// registerUsersRoutes mounts the routes for the adult's own account
// (users-api, #249) and the Parent's Scouts under /api/users/me/scouts
// (#250).
func registerUsersRoutes(rt *router, d Deps) {
	rt.authed("POST /api/users/me", users.Bootstrap(d.DB),
		exempt("bootstrap upserts the caller's own users row and claims the pending invites; a repeat changes nothing more"))
	rt.authed("GET /api/users/me", users.Get(d.DB))
	rt.authed("PATCH /api/users/me", users.Onboard(d.DB))
	rt.authed("DELETE /api/users/me", users.Delete(d.DB, d.Accounts))
	rt.authed("POST /api/users/me/roster-export-ack", users.AckRosterExport(d.DB),
		exempt("the stamp is set only while it is empty; a repeat returns the same row"))
	rt.authed("GET /api/users/me/scouts", scouts.List(d.DB))
	rt.authed("POST /api/users/me/scouts", scouts.Create(d.DB), replayable)
	rt.authed("PATCH /api/users/me/scouts/{scoutId}", scouts.Update(d.DB))
	rt.authed("DELETE /api/users/me/scouts/{scoutId}", scouts.Delete(d.DB))
}
