package main

import (
	"time"

	"mbu/api/internal/ratelimit"
	"mbu/api/internal/universities"
)

// registerUniversitiesRoutes mounts the routes for Universities, Periods,
// Classes and moderation (universities-api, #251 to #253).
func registerUniversitiesRoutes(rt *router, d Deps) {
	rt.authed("POST /api/universities", universities.Create(d.DB), replayable)
	rt.authed("GET /api/universities/mine", universities.ListMine(d.DB))
	rt.authed("GET /api/universities/{id}", universities.Detail(d.DB))
	rt.authed("PATCH /api/universities/{id}", universities.Patch(d.DB))
	rt.authed("DELETE /api/universities/{id}", universities.Delete(d.DB))

	// The public read: anyone with the link, so it is rate limited by
	// address (docs/api-design.md section 6). NoStore is outside the
	// limit, so a 429 is not cached either.
	publicLimit := ratelimit.Wrap(d.DB, "universities-public", []ratelimit.Rule{ratelimit.IPRule(d.ClientIP, 600, time.Hour)})
	rt.public("GET /api/universities/{id}/public", universities.NoStore(publicLimit(universities.Public(d.DB))))
}
