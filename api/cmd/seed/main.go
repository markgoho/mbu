// Command seed fills a local database and the Firebase Auth emulator
// with the fixtures for manual walks (#246): five adults, two Scouts, a
// published, a draft and a submitted University with Periods and
// Classes, Registrations in each status, and Role Grants. It is the Go
// port of firestore/seed.ts.
//
// It refuses to run unless FIREBASE_AUTH_EMULATOR_HOST is set, so it
// cannot write accounts into a real Firebase project. Run it with
// `bun run seed:platform` from the repo root, after `bun run dev:api` or
// `bun run dev:platform` has started the stack. A second run replaces
// the fixtures.
package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"

	"mbu/api/internal/clock"

	// Registers the "pgx" driver with database/sql; never referenced by name.
	_ "github.com/jackc/pgx/v5/stdlib"
)

// devPassword is the password of every seeded account. It is the same
// as the e2e accounts (app/e2e/fixtures/auth.fixture.ts).
const devPassword = "password123"

// The environment variables the seed reads.
const (
	envDatabaseURL  = "DATABASE_URL"
	envEmulatorHost = "FIREBASE_AUTH_EMULATOR_HOST"
)

// defaultProjectID is the Firebase project the app and the stack use.
const defaultProjectID = "merit-badge-university"

var (
	errNoEmulator    = errors.New("seed: FIREBASE_AUTH_EMULATOR_HOST is not set; the seed writes only to the Auth emulator")
	errNoDatabaseURL = errors.New("seed: DATABASE_URL is not set")
)

// account is one adult in the Auth emulator and in users.
type account struct {
	UID         string
	Email       string
	DisplayName string
}

// accountStore writes an account to Firebase Auth. Tests use a fake.
type accountStore interface {
	Upsert(ctx context.Context, a account) error
}

type config struct {
	DatabaseURL string
	ProjectID   string
}

func readConfig(getenv func(string) string) (config, error) {
	if strings.TrimSpace(getenv(envEmulatorHost)) == "" {
		return config{}, errNoEmulator
	}
	cfg := config{
		DatabaseURL: strings.TrimSpace(getenv(envDatabaseURL)),
		ProjectID:   strings.TrimSpace(getenv("GCP_PROJECT_ID")),
	}
	if cfg.DatabaseURL == "" {
		return config{}, errNoDatabaseURL
	}
	if cfg.ProjectID == "" {
		cfg.ProjectID = defaultProjectID
	}
	return cfg, nil
}

// seed writes the fixtures in one transaction, then the accounts. The
// accounts come after the commit, so a failed write leaves no account
// without its users row.
func seed(ctx context.Context, db *sql.DB, accounts accountStore, now time.Time) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("seed: begin: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	for _, s := range fixtures(now) {
		if _, err := tx.ExecContext(ctx, s.sql, s.args...); err != nil {
			return fmt.Errorf("seed: %s: %w", strings.Join(strings.Fields(s.sql), " "), err)
		}
	}
	// coverage:ignore reason: a commit failure after every statement succeeded is not reproducible in a test
	if err := tx.Commit(); err != nil {
		// coverage:ignore reason: a commit failure after every statement succeeded is not reproducible in a test
		return fmt.Errorf("seed: commit: %w", err)
	}

	for _, a := range seedAccounts {
		if err := accounts.Upsert(ctx, a); err != nil {
			return fmt.Errorf("seed: account %s: %w", a.UID, err)
		}
	}
	return nil
}

// firebaseAccounts writes accounts with the Admin SDK. With
// FIREBASE_AUTH_EMULATOR_HOST set, the SDK talks to the emulator.
type firebaseAccounts struct {
	client *auth.Client
}

// Upsert creates the account with a verified email, or updates it when
// the uid exists, so a second run does not fail.
func (f firebaseAccounts) Upsert(ctx context.Context, a account) error {
	// coverage:ignore reason: needs the Auth emulator, not exercised by unit tests
	_, err := f.client.GetUser(ctx, a.UID)
	// coverage:ignore reason: needs the Auth emulator, not exercised by unit tests
	switch {
	case auth.IsUserNotFound(err):
		// coverage:ignore reason: needs the Auth emulator, not exercised by unit tests
		_, err = f.client.CreateUser(ctx, (&auth.UserToCreate{}).UID(a.UID).Email(a.Email).
			EmailVerified(true).Password(devPassword).DisplayName(a.DisplayName))
	case err == nil:
		// coverage:ignore reason: needs the Auth emulator, not exercised by unit tests
		_, err = f.client.UpdateUser(ctx, a.UID, (&auth.UserToUpdate{}).Email(a.Email).
			EmailVerified(true).Password(devPassword).DisplayName(a.DisplayName))
	}
	// coverage:ignore reason: needs the Auth emulator, not exercised by unit tests
	return err //nolint:wrapcheck // seed wraps it with the account uid
}

func main() {
	// coverage:ignore reason: exits the process, not exercised by unit tests
	if err := run(context.Background()); err != nil {
		// coverage:ignore reason: exits the process, not exercised by unit tests
		log.Fatal(err)
	}
}

// run wires the real environment, database and Admin SDK. readConfig
// and seed hold the logic and are tested.
func run(ctx context.Context) error {
	// coverage:ignore reason: reads the real environment, not exercised by unit tests; readConfig is
	cfg, err := readConfig(os.Getenv)
	if err != nil {
		// coverage:ignore reason: reads the real environment, not exercised by unit tests; readConfig is
		return err
	}
	// coverage:ignore reason: builds the real Admin SDK client, not exercised by unit tests
	app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: cfg.ProjectID})
	if err != nil {
		// coverage:ignore reason: builds the real Admin SDK client, not exercised by unit tests
		return fmt.Errorf("seed: init firebase app: %w", err)
	}
	// coverage:ignore reason: builds the real Admin SDK client, not exercised by unit tests
	client, err := app.Auth(ctx)
	if err != nil {
		// coverage:ignore reason: builds the real Admin SDK client, not exercised by unit tests
		return fmt.Errorf("seed: init auth client: %w", err)
	}
	// coverage:ignore reason: opens the real database, not exercised by unit tests
	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		// coverage:ignore reason: opens the real database, not exercised by unit tests
		return fmt.Errorf("seed: open db: %w", err)
	}
	// coverage:ignore reason: opens the real database, not exercised by unit tests
	defer func() { _ = db.Close() }()

	// coverage:ignore reason: runs against the real stack, not exercised by unit tests; seed is
	if err := seed(ctx, db, firebaseAccounts{client: client}, clock.Real()); err != nil {
		// coverage:ignore reason: runs against the real stack, not exercised by unit tests; seed is
		return err
	}
	// coverage:ignore reason: runs against the real stack, not exercised by unit tests
	log.Printf("seed: %d accounts (password %q) and their fixtures written", len(seedAccounts), devPassword)
	// coverage:ignore reason: runs against the real stack, not exercised by unit tests
	return nil
}
