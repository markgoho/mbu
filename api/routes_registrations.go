package main

import "mbu/api/internal/registrations"

// registerRegistrationsRoutes mounts the routes for Registrations and
// Schedules (registrations-api, #254), and Rosters (#255).
func registerRegistrationsRoutes(rt *router, d Deps) {
	rt.authed("POST /api/registrations/{universityId}/{classId}", registrations.Register(d.DB), replayable)
	rt.authed("DELETE /api/registrations/{universityId}/{classId}/{scoutId}", registrations.Cancel(d.DB))
	rt.authed("GET /api/registrations/{universityId}", registrations.Schedule(d.DB))
	// "roster" is a literal segment, so ServeMux prefers it to a
	// {classId} or {scoutId} wildcard at the same depth.
	rt.authed("GET /api/registrations/{universityId}/roster", registrations.Roster(d.DB))
}
