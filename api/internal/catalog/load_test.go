package catalog

import "testing"

// The embedded file is generated and checked in CI, so these cases cannot
// come from it. They test the guard that refuses a broken file at startup.
func TestLoadRejectsABrokenCatalog(t *testing.T) {
	for name, input := range map[string]string{
		"not JSON":       `{`,
		"empty list":     `[]`,
		"empty slug":     `[{"slug":"","title":"Camping","eagleRequired":true}]`,
		"empty title":    `[{"slug":"camping","title":"","eagleRequired":true}]`,
		"duplicate slug": `[{"slug":"camping","title":"Camping"},{"slug":"camping","title":"Camping 2"}]`,
	} {
		t.Run(name, func(t *testing.T) {
			if _, _, err := load([]byte(input)); err == nil {
				t.Errorf("load(%s) = nil error, want an error", input)
			}
		})
	}
}
