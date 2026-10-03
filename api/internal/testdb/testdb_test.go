package testdb_test

import (
	"testing"

	"mbu/api/internal/testdb"
)

// TestHarness is the proof that the testcontainers-go harness works end
// to end: a real Postgres container starts, the goose migrations apply,
// and both connections can read a migrated table.
func TestHarness(t *testing.T) {
	db := testdb.New(t)

	var version int64
	if err := db.Admin.QueryRowContext(t.Context(), "SELECT max(version_id) FROM goose_db_version").Scan(&version); err != nil {
		t.Fatalf("query goose version: %v", err)
	}
	if version == 0 {
		t.Fatal("goose_db_version records no migration, want the template's migrations applied")
	}

	var count int
	if err := db.App.QueryRowContext(t.Context(), "SELECT count(*) FROM users").Scan(&count); err != nil {
		t.Fatalf("query users as the app role: %v", err)
	}
	if count != 0 {
		t.Fatalf("expected an empty users table, got %d rows", count)
	}
}
