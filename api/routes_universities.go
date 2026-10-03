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
	// Mounted before the {id} routes. ServeMux picks the literal
	// segment over {id} in any order; the order is for the reader.
	rt.authed("GET /api/universities/badges", universities.ListBadges())
	rt.authed("GET /api/universities/{id}", universities.Detail(d.DB))
	rt.authed("PATCH /api/universities/{id}", universities.Patch(d.DB))
	rt.authed("DELETE /api/universities/{id}", universities.Delete(d.DB))
	rt.authed("PUT /api/universities/{id}/periods", universities.PutPeriods(d.DB))
	rt.authed("POST /api/universities/{id}/classes", universities.CreateClass(d.DB), replayable)
	rt.authed("PATCH /api/universities/{id}/classes/{classId}", universities.PatchClass(d.DB))
	rt.authed("DELETE /api/universities/{id}/classes/{classId}", universities.DeleteClass(d.DB))

	// Moderation (#253). A move is safe to repeat by its own status
	// check, so it runs without idempotency.Wrap.
	const guardedMove = "guarded by the status transition; a repeat answers 409"
	rt.authed("POST /api/universities/{id}/submit", universities.Submit(d.DB), exempt(guardedMove))
	rt.authed("POST /api/universities/{id}/close", universities.Close(d.DB), exempt(guardedMove))
	rt.authed("GET /api/admin/universities/review-queue", universities.ReviewQueue(d.DB))
	rt.authed("POST /api/admin/universities/{id}/approve", universities.Approve(d.DB), exempt(guardedMove))
	rt.authed("POST /api/admin/universities/{id}/reject", universities.Reject(d.DB), exempt(guardedMove))

	// The public read: anyone with the link, so it is rate limited by
	// address (docs/api-design.md section 6). NoStore is outside the
	// limit, so a 429 is not cached either.
	publicLimit := ratelimit.Wrap(d.DB, "universities-public", []ratelimit.Rule{ratelimit.IPRule(d.ClientIP, 600, time.Hour)})
	rt.public("GET /api/universities/{id}/public", universities.NoStore(publicLimit(universities.Public(d.DB))))
}
