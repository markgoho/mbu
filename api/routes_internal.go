package main

import (
	"mbu/api/internal/outbox"
	"mbu/api/internal/regmail"
	"mbu/api/internal/retention"
)

// registerInternalRoutes mounts the routes for the internal boundary
// (/api/internal/**, ADR 0005). rt.internal puts each one behind
// Deps.InternalAuth, the caller identity guard; routes_internal_test.go
// holds them to a declared list.
func registerInternalRoutes(rt *router, d Deps) {
	// It replaces POST /api/retention/purge of the retention-api Cloud
	// Function. Cloud Scheduler calls it once a day (#261).
	rt.internal("POST /api/internal/retention/purge", retention.Purge(d.DB),
		exempt("the purge is idempotent: a repeat finds nothing left to purge"))
	// The mail drain (ADR 0004). Cloud Scheduler calls it each minute
	// (#261). It runs each registered outbox; MBU has one.
	rt.internal("POST "+outbox.DrainPath, outbox.Drain(d.DB, []outbox.Registration{
		regmail.Worker{Sender: d.Mail}.Registration(),
	}), exempt("each row is claimed under FOR UPDATE SKIP LOCKED: a repeat sends only what is still due"))
}
