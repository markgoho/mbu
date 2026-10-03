package catalog_test

import (
	"testing"

	"mbu/api/internal/catalog"
)

func TestAllLoadsTheGeneratedCatalog(t *testing.T) {
	badges := catalog.All()
	if len(badges) == 0 {
		t.Fatal("All() returned no badges")
	}
	// The order is the order of scripts/merit-badges.ts.
	if got := badges[0].Slug; got != "american-business" {
		t.Errorf("first badge = %q, want %q", got, "american-business")
	}
}

func TestAllHasNoDuplicateSlug(t *testing.T) {
	seen := map[string]bool{}
	for _, b := range catalog.All() {
		if seen[b.Slug] {
			t.Errorf("duplicate slug %q", b.Slug)
		}
		seen[b.Slug] = true
	}
}

// A caller that changes the slice it gets must not change the catalog.
func TestAllReturnsACopy(t *testing.T) {
	catalog.All()[0].Slug = "changed"
	if got := catalog.All()[0].Slug; got != "american-business" {
		t.Errorf("first badge after a caller changed its copy = %q", got)
	}
}

func TestLookup(t *testing.T) {
	camping, ok := catalog.Lookup("camping")
	if !ok {
		t.Fatal(`Lookup("camping") found nothing`)
	}
	want := catalog.Badge{Slug: "camping", Title: "Camping", EagleRequired: true}
	if camping != want {
		t.Errorf(`Lookup("camping") = %+v, want %+v`, camping, want)
	}

	archery, ok := catalog.Lookup("archery")
	if !ok || archery.EagleRequired {
		t.Errorf(`Lookup("archery") = %+v, %v; want a badge that is not Eagle-required`, archery, ok)
	}

	// A discontinued badge is not in the catalog.
	if b, ok := catalog.Lookup("citizenship-in-society"); ok {
		t.Errorf(`Lookup("citizenship-in-society") = %+v, want not found`, b)
	}
	if b, ok := catalog.Lookup("no-such-badge"); ok {
		t.Errorf(`Lookup("no-such-badge") = %+v, want not found`, b)
	}
}
