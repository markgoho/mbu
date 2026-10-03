// Package migrations embeds the goose migration files so they can be
// applied programmatically (e.g. by the testcontainers-go test harness)
// without depending on a filesystem path at runtime.
//
// # The rule every migration in here is held to
//
// A migration's Up section may contain no statement whose success
// depends on the rows a table already holds, unless a safety note in
// safety/ says why those rows cannot break it.
//
// The reason is the shape of CI. Every pull request builds an empty
// Postgres per test process (internal/testdb), so a statement that only
// existing rows can refuse is green on the PR. The deploy (#260) applies
// the migrations to the Cloud SQL database, which has rows, as a blocking
// step: the statement fails there and the new revision never deploys.
// doula-cloud learned this the hard way: an
// `ALTER TABLE ... ADD COLUMN ... NOT NULL` with no DEFAULT was green on
// its PR and kept its trunk red across seven merges.
//
// RowDependent (rowsafety.go) reports every statement the rule forbids;
// rowClasses there enumerates the family, each member derived from a
// Postgres operation documented as scanning, rewriting or verifying
// existing rows, and each proved against a real populated Postgres in
// rowsafety_pg_test.go. guardrail_test.go is what fails the build.
package migrations

import "embed"

// FS holds the embedded goose migration files.
//
//go:embed *.sql
var FS embed.FS
