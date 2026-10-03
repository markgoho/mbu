package universities

import (
	"net/http"

	"mbu/api/internal/apierr"
	"mbu/api/internal/catalog"
)

// BadgeCatalogEntry is one Merit Badge a Class can teach, as the app's
// BadgeCatalogEntry type reads it.
type BadgeCatalogEntry struct {
	Slug          string `json:"slug"`
	Title         string `json:"title"`
	EagleRequired bool   `json:"eagleRequired"`
}

// BadgeCatalogResponse is the body of GET /api/universities/badges.
type BadgeCatalogResponse struct {
	Badges []BadgeCatalogEntry `json:"badges"`
}

// ListBadges is GET /api/universities/badges: the Badge Catalog, in the
// order of scripts/merit-badges.ts, for any signed-in adult. It reads no
// database: the catalog is in the binary (#248).
func ListBadges() http.Handler {
	all := catalog.All()
	body := BadgeCatalogResponse{Badges: make([]BadgeCatalogEntry, 0, len(all))}
	for _, b := range all {
		body.Badges = append(body.Badges, BadgeCatalogEntry{Slug: b.Slug, Title: b.Title, EagleRequired: b.EagleRequired})
	}
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		apierr.WriteJSON(w, http.StatusOK, body)
	})
}
