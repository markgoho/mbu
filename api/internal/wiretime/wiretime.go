// Package wiretime writes a timestamp in a JSON body. Each one has the
// shape JavaScript's toISOString() gave the functions/ API, in UTC with
// milliseconds (docs/data-model.md, "Effects on the JSON contract", item
// 7), so the strings the app reads keep their shape.
package wiretime

import (
	"database/sql"
	"time"
)

// layout is toISOString()'s shape.
const layout = "2006-01-02T15:04:05.000Z"

// Format writes t in UTC with milliseconds.
func Format(t time.Time) string {
	return t.UTC().Format(layout)
}

// FormatNull is Format for a nullable column: NULL is a JSON null.
func FormatNull(t sql.NullTime) *string {
	if !t.Valid {
		return nil
	}
	s := Format(t.Time)
	return &s
}
