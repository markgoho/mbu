package main

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"mbu/api/internal/testdb"
)

func TestMain(m *testing.M) {
	os.Exit(testdb.Main(m))
}

// fakeAccounts records each Auth emulator account the seed writes.
type fakeAccounts struct {
	got map[string]account
	err error
}

func (f *fakeAccounts) Upsert(_ context.Context, a account) error {
	if f.err != nil {
		return f.err
	}
	if f.got == nil {
		f.got = map[string]account{}
	}
	f.got[a.UID] = a
	return nil
}

var seedNow = time.Date(2026, 10, 3, 15, 4, 5, 0, time.UTC)

func count(t *testing.T, db *testdb.DB, query string, args ...any) int {
	t.Helper()
	var n int
	if err := db.Admin.QueryRowContext(t.Context(), query, args...).Scan(&n); err != nil {
		t.Fatalf("count %q: %v", query, err)
	}
	return n
}

// TestSeed_FillsTheFixtures runs the seed twice through the app_runtime
// login: the second run must replace the fixtures, not fail on a key or
// add a second copy.
func TestSeed_FillsTheFixtures(t *testing.T) {
	db := testdb.New(t)

	for run := 1; run <= 2; run++ {
		accounts := &fakeAccounts{}
		if err := seed(t.Context(), db.App, accounts, seedNow); err != nil {
			t.Fatalf("run %d: seed: %v", run, err)
		}

		tables := map[string]int{
			"users":            5,
			"scouts":           2,
			"universities":     3,
			"periods":          5,
			"classes":          4,
			"class_periods":    5,
			"class_counselors": 5,
			"registrations":    4,
			"role_grants":      8,
		}
		for table, want := range tables {
			if got := count(t, db, "SELECT count(*) FROM "+table); got != want {
				t.Errorf("run %d: %s has %d rows, want %d", run, table, got, want)
			}
		}

		if len(accounts.got) != 5 {
			t.Errorf("run %d: %d accounts, want 5", run, len(accounts.got))
		}
		alice := accounts.got["alice"]
		if alice.Email != "alice@example.com" || alice.DisplayName != "Alice P" {
			t.Errorf("run %d: alice account = %+v", run, alice)
		}
	}
}

// TestSeed_States proves the states the walks need: one published, one
// draft and one submitted University; a full Class with a Waitlist; a
// cancelled Registration; an invited Counselor grant.
func TestSeed_States(t *testing.T) {
	db := testdb.New(t)
	if err := seed(t.Context(), db.App, &fakeAccounts{}, seedNow); err != nil {
		t.Fatalf("seed: %v", err)
	}

	for status, want := range map[string]int{"published": 1, "draft": 1, "submitted": 1} {
		if got := count(t, db, "SELECT count(*) FROM universities WHERE status = $1", status); got != want {
			t.Errorf("%s universities = %d, want %d", status, got, want)
		}
	}
	for status, want := range map[string]int{"enrolled": 2, "waitlisted": 1, "cancelled": 1} {
		if got := count(t, db, "SELECT count(*) FROM registrations WHERE status = $1", status); got != want {
			t.Errorf("%s registrations = %d, want %d", status, got, want)
		}
	}
	full := count(t, db, `SELECT count(*) FROM classes c
		WHERE c.capacity = (SELECT count(*) FROM registrations r WHERE r.class_id = c.id AND r.status = 'enrolled')
		AND EXISTS (SELECT 1 FROM registrations r WHERE r.class_id = c.id AND r.status = 'waitlisted')`)
	if full != 1 {
		t.Errorf("full classes with a waitlist = %d, want 1", full)
	}
	if got := count(t, db, `SELECT count(*) FROM role_grants
		WHERE status = 'invited' AND invited_email = 'newcoach@example.com'`); got != 1 {
		t.Errorf("invited grants = %d, want 1", got)
	}

	// The published University takes Registrations: its window is still
	// open at the seed time.
	if got := count(t, db, `SELECT count(*) FROM universities
		WHERE status = 'published' AND registration_closes_at > $1 AND start_date > $1`, seedNow); got != 1 {
		t.Errorf("published universities open at seed time = %d, want 1", got)
	}
}

// TestSeed_RollsBackOnFailure proves the seed is one transaction: when a
// fixture id is already taken by a row the seed does not own, the seed
// fails and leaves no fixture behind.
func TestSeed_RollsBackOnFailure(t *testing.T) {
	db := testdb.New(t)
	if _, err := db.Admin.ExecContext(t.Context(), `INSERT INTO users (uid, email) VALUES ('other', 'other@example.com')`); err != nil {
		t.Fatalf("insert user: %v", err)
	}
	if _, err := db.Admin.ExecContext(t.Context(),
		`INSERT INTO scouts (id, parent_uid, first_name, last_name) VALUES ($1, 'other', 'Not', 'Seeded')`, scoutAmy); err != nil {
		t.Fatalf("insert scout: %v", err)
	}

	accounts := &fakeAccounts{}
	if err := seed(t.Context(), db.App, accounts, seedNow); err == nil {
		t.Fatal("seed: want an error for a taken scout id, got nil")
	}
	if got := count(t, db, "SELECT count(*) FROM users"); got != 1 {
		t.Errorf("users = %d after a failed seed, want 1", got)
	}
	if len(accounts.got) != 0 {
		t.Errorf("accounts = %d after a failed seed, want 0", len(accounts.got))
	}
}

func TestSeed_AccountFailure(t *testing.T) {
	db := testdb.New(t)
	want := errors.New("emulator down")
	if err := seed(t.Context(), db.App, &fakeAccounts{err: want}, seedNow); !errors.Is(err, want) {
		t.Fatalf("seed: got %v, want %v", err, want)
	}
}

func TestSeed_DatabaseDown(t *testing.T) {
	db := testdb.New(t)
	ctx, cancel := context.WithCancel(t.Context())
	cancel()
	if err := seed(ctx, db.App, &fakeAccounts{}, seedNow); err == nil {
		t.Fatal("seed: want an error for a cancelled context, got nil")
	}
}

const testDSN = "postgres://x"

func TestReadConfig(t *testing.T) {
	env := func(m map[string]string) func(string) string {
		return func(k string) string { return m[k] }
	}

	cfg, err := readConfig(env(map[string]string{
		envDatabaseURL:  testDSN,
		envEmulatorHost: "127.0.0.1:9099",
	}))
	if err != nil {
		t.Fatalf("readConfig: %v", err)
	}
	if cfg.DatabaseURL != testDSN || cfg.ProjectID != "merit-badge-university" {
		t.Errorf("config = %+v", cfg)
	}

	cfg, err = readConfig(env(map[string]string{
		envDatabaseURL:   testDSN,
		envEmulatorHost:  "127.0.0.1:9099",
		"GCP_PROJECT_ID": "other",
	}))
	if err != nil || cfg.ProjectID != "other" {
		t.Errorf("readConfig with GCP_PROJECT_ID = %+v, %v", cfg, err)
	}

	if _, err := readConfig(env(map[string]string{envDatabaseURL: testDSN})); !errors.Is(err, errNoEmulator) {
		t.Errorf("no emulator host: got %v, want errNoEmulator", err)
	}
	if _, err := readConfig(env(map[string]string{envEmulatorHost: "h"})); !errors.Is(err, errNoDatabaseURL) {
		t.Errorf("no DATABASE_URL: got %v, want errNoDatabaseURL", err)
	}
}
