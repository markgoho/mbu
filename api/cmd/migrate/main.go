// Command migrate applies the embedded goose migrations directly against
// DATABASE_URL: a local Postgres (#246) or any database reachable with no
// Cloud SQL Auth Proxy. scripts/migrate.sh is the deploy path (#260).
package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/pressly/goose/v3"

	"mbu/api/db/migrations"

	// Registers the "pgx" driver with database/sql; never referenced by name.
	_ "github.com/jackc/pgx/v5/stdlib"
)

// connectTimeout bounds how long waitForConnection retries -- a local
// stack can start this binary as soon as the Postgres container starts,
// before Postgres accepts connections.
const connectTimeout = 30 * time.Second

func main() {
	// coverage:ignore reason: exits the process, not exercised by unit tests
	if err := run(); err != nil {
		// coverage:ignore reason: exits the process, not exercised by unit tests
		log.Fatal(err)
	}
}

// run is exercised directly by main_test.go for the DATABASE_URL-unset
// path; everything past that needs a real, empty Postgres instance.
// internal/testdb applies the same embedded migrations with the same
// goose calls on every test run.
func run() error {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return errors.New("migrate: DATABASE_URL must be set")
	}

	// coverage:ignore reason: malformed DSN, not exercised by unit tests
	db, err := sql.Open("pgx", dsn)
	// coverage:ignore reason: malformed DSN, not exercised by unit tests
	if err != nil {
		// coverage:ignore reason: malformed DSN, not exercised by unit tests
		return fmt.Errorf("migrate: open db: %w", err)
	}
	// coverage:ignore reason: requires a real DB connection, not exercised by unit tests
	defer func() { _ = db.Close() }()

	// coverage:ignore reason: requires a real DB connection, not exercised by unit tests
	if err := waitForConnection(context.Background(), db, connectTimeout); err != nil {
		// coverage:ignore reason: requires a real DB connection, not exercised by unit tests
		return err
	}

	// coverage:ignore reason: requires a real DB connection, not exercised by unit tests
	goose.SetBaseFS(migrations.FS)
	// coverage:ignore reason: dialect registration failure, not exercised by unit tests
	if err := goose.SetDialect("postgres"); err != nil {
		// coverage:ignore reason: dialect registration failure, not exercised by unit tests
		return fmt.Errorf("migrate: set dialect: %w", err)
	}
	// coverage:ignore reason: requires a real DB connection, not exercised by unit tests
	if err := goose.Up(db, "."); err != nil {
		// coverage:ignore reason: migration failure, not exercised by unit tests
		return fmt.Errorf("migrate: apply migrations: %w", err)
	}
	// coverage:ignore reason: requires a real DB connection, not exercised by unit tests
	log.Println("migrate: migrations applied")
	// coverage:ignore reason: requires a real DB connection, not exercised by unit tests
	return nil
}

// waitForConnection retries db.PingContext until it succeeds or timeout
// elapses, so a container that has started but isn't accepting
// connections yet doesn't fail this step outright.
//
// Clock-seam exemption (#240 decision 9): cmd/migrate is a startup step,
// not a request path -- there is no request context for a Clock to ride,
// and no test wants this deadline faked.
func waitForConnection(ctx context.Context, db *sql.DB, timeout time.Duration) error {
	deadline := time.Now().Add(timeout) //nolint:forbidigo // startup wait, not a request path -- see doc comment above
	var lastErr error
	for {
		lastErr = db.PingContext(ctx)
		// coverage:ignore reason: requires a real DB connection, not exercised by unit tests
		if lastErr == nil {
			return nil
		}
		if time.Now().After(deadline) { //nolint:forbidigo // startup wait, not a request path -- see doc comment above
			return fmt.Errorf("migrate: db not reachable after %s: %w", timeout, lastErr)
		}
		time.Sleep(200 * time.Millisecond)
	}
}
