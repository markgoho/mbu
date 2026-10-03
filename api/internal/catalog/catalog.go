// Package catalog is the Badge Catalog: the Merit Badges a Class can
// teach (#248). It is not a table (docs/data-model.md): badges.json is
// embedded in the binary.
//
// badges.json is generated from the one canonical list,
// scripts/merit-badges.ts, by `bun run generate:badge-catalog`. Do not
// edit it by hand. `bun run check:badge-catalog` fails CI when the file is
// not what the generator writes.
package catalog

import (
	_ "embed" // for the go:embed of badges.json
	"encoding/json"
	"errors"
	"fmt"
)

// Badge is one entry of the Badge Catalog. The JSON tags read badges.json;
// a handler maps a Badge to its own response DTO (docs/api-design.md).
type Badge struct {
	Slug          string `json:"slug"`
	Title         string `json:"title"`
	EagleRequired bool   `json:"eagleRequired"`
}

//go:embed badges.json
var badgesJSON []byte

var badges, bySlug = mustLoad(badgesJSON)

// All returns every badge in the catalog, in the order of
// scripts/merit-badges.ts. The slice is a copy: a caller can change it.
func All() []Badge {
	return append([]Badge(nil), badges...)
}

// Lookup returns the badge with the slug, and false when the catalog has
// no such badge (an unknown or discontinued slug).
func Lookup(slug string) (Badge, bool) {
	b, ok := bySlug[slug]
	return b, ok
}

func mustLoad(data []byte) ([]Badge, map[string]Badge) {
	list, index, err := load(data)
	// coverage:ignore reason: badges.json is generated and checked in CI; a broken file fails every test in this package
	if err != nil {
		panic(err)
	}
	return list, index
}

// load parses the catalog and refuses one that is empty or has an empty
// or duplicate slug or an empty title, so a broken file stops the service
// at startup and not at the first request that reads it.
func load(data []byte) ([]Badge, map[string]Badge, error) {
	var list []Badge
	if err := json.Unmarshal(data, &list); err != nil {
		return nil, nil, fmt.Errorf("catalog: parse badges.json: %w", err)
	}
	if len(list) == 0 {
		return nil, nil, errors.New("catalog: badges.json has no badges")
	}
	index := make(map[string]Badge, len(list))
	for i, b := range list {
		if b.Slug == "" || b.Title == "" {
			return nil, nil, fmt.Errorf("catalog: badge %d has an empty slug or title", i)
		}
		if _, dup := index[b.Slug]; dup {
			return nil, nil, fmt.Errorf("catalog: duplicate slug %q", b.Slug)
		}
		index[b.Slug] = b
	}
	return list, index, nil
}
