package main

import (
	"net/http"

	"mbu/api/internal/apierr"
)

// healthResponse is the body of GET /api/health, the same as the
// functions/ health API returns.
type healthResponse struct {
	Status string `json:"status"`
}

// registerHealthRoutes mounts the health probe. It needs no token and
// touches no database, so the image smoke test and the Cloud Run startup
// probe need no Postgres.
func registerHealthRoutes(rt *router) {
	rt.public("GET /api/health", http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		apierr.WriteJSON(w, http.StatusOK, healthResponse{Status: "ok"})
	}))
}
