// The schema test (#244): it applies every migration (through testdb)
// and proves each constraint that holds an invariant of
// docs/data-model.md. Fixtures go in through Admin; each statement under
// test runs through App, the app_runtime login the service uses, so a
// missing GRANT fails here as well.

package migrations_test

import (
	"database/sql"
	"errors"
	"fmt"
	"slices"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"

	"mbu/api/internal/pgerr"
	"mbu/api/internal/testdb"
)

// The ids of the fixture graph that seed builds.
const (
	uniID      = "0b6f3c8e-6a2e-4c1d-9f57-2f0a7d1e4b10"
	otherUniID = "5d1e9a42-3b7c-4e8f-a0d6-91c2b3e4f5a6"
	periodID   = "11111111-1111-4111-8111-111111111111"
	otherPerID = "22222222-2222-4222-8222-222222222222"
	classID    = "33333333-3333-4333-8333-333333333333"
	class2ID   = "44444444-4444-4444-8444-444444444444"
	scoutID    = "55555555-5555-4555-8555-555555555555"

	parentUID     = "uid-parent"
	counselorUID  = "uid-counselor"
	chancellorUID = "uid-chancellor"
)

// seedSQL is one University with one Period and two Classes, a Parent
// with one Scout, a Counselor and a Chancellor. The Scout is enrolled in
// the first Class and has a cancelled Registration in the second. A
// second University holds one Period of its own. The Parent has one
// stored Idempotency-Key response.
var seedSQL = []string{
	`INSERT INTO users (uid, email) VALUES
	    ('` + parentUID + `', 'parent@example.com'),
	    ('` + counselorUID + `', 'counselor@example.com'),
	    ('` + chancellorUID + `', 'chancellor@example.com')`,
	`INSERT INTO scouts (id, parent_uid, first_name, last_name)
	    VALUES ('` + scoutID + `', '` + parentUID + `', 'Sam', 'Scout')`,
	`INSERT INTO universities (id, title, timezone, start_date, registration_closes_at,
	    location_name, location_address, location_city, location_state, location_zip, created_by_uid)
	 SELECT id, 'MBU', 'America/New_York', now() + interval '30 days', now() + interval '20 days',
	    'Hall', '1 Main St', 'Town', 'VA', '22000', '` + chancellorUID + `'
	 FROM (VALUES ('` + uniID + `'), ('` + otherUniID + `')) AS u (id)`,
	`INSERT INTO periods (id, university_id, label, starts_at, ends_at, position) VALUES
	    ('` + periodID + `', '` + uniID + `', 'Morning', now(), now() + interval '2 hours', 0),
	    ('` + otherPerID + `', '` + otherUniID + `', 'Morning', now(), now() + interval '2 hours', 0)`,
	`INSERT INTO classes (id, university_id, badge_slug, badge_title, eagle_required, capacity) VALUES
	    ('` + classID + `', '` + uniID + `', 'camping', 'Camping', true, 10),
	    ('` + class2ID + `', '` + uniID + `', 'hiking', 'Hiking', true, 10)`,
	`INSERT INTO class_periods (class_id, period_id, university_id)
	    VALUES ('` + classID + `', '` + periodID + `', '` + uniID + `')`,
	`INSERT INTO class_counselors (class_id, uid, bsa_id, disclaimer_accepted_at, disclaimer_version)
	    VALUES ('` + classID + `', '` + counselorUID + `', '123', now(), 'v1')`,
	`INSERT INTO role_grants (role, university_id, class_id, uid, status) VALUES
	    ('chancellor', '` + uniID + `', NULL, '` + chancellorUID + `', 'active'),
	    ('counselor', '` + uniID + `', '` + classID + `', '` + counselorUID + `', 'active')`,
	`INSERT INTO registrations (class_id, scout_id, status, enrolled_at, waitlisted_at,
	    parent_consent_at, accepted_policy_version, scout_first_name, scout_last_name, parent_name, parent_email)
	 VALUES
	    ('` + classID + `', '` + scoutID + `', 'enrolled', now(), NULL, now(), 'v1', 'Sam', 'Scout', 'Pat', 'parent@example.com'),
	    ('` + class2ID + `', '` + scoutID + `', 'cancelled', NULL, NULL, now(), 'v1', 'Sam', 'Scout', 'Pat', 'parent@example.com')`,
	`INSERT INTO idempotency_keys (uid, key, request_hash, status_code, response_body, created_at)
	    VALUES ('` + parentUID + `', 'key-1', '\x00', 201, '{}', now())`,
}

// seed gives the test a fresh database that holds the fixture graph.
func seed(t *testing.T) *testdb.DB {
	t.Helper()
	db := testdb.New(t)
	for _, stmt := range seedSQL {
		if _, err := db.Admin.ExecContext(t.Context(), stmt); err != nil {
			t.Fatalf("seed: %v\n%s", err, stmt)
		}
	}
	return db
}

// exec runs stmt through the App connection.
func exec(t *testing.T, db *testdb.DB, stmt string) error {
	t.Helper()
	if _, err := db.App.ExecContext(t.Context(), stmt); err != nil {
		return fmt.Errorf("app: %w", err)
	}
	return nil
}

// count runs a SELECT count(*) through Admin.
func count(t *testing.T, db *sql.DB, query string) int {
	t.Helper()
	var n int
	if err := db.QueryRowContext(t.Context(), query).Scan(&n); err != nil {
		t.Fatalf("count: %v\n%s", err, query)
	}
	return n
}

// sqlState is err's SQLSTATE, or "" when it is not a Postgres error.
func sqlState(err error) string {
	if pgErr, ok := errors.AsType[*pgconn.PgError](err); ok {
		return pgErr.Code
	}
	return ""
}

// all is the query that counts every row of table.
func all(table string) string {
	return "SELECT count(*) FROM " + table
}

// TestAppRoleCannotRunDDL proves the service's login cannot change the
// schema: only the migration owner can (#240 decision 4).
func TestAppRoleCannotRunDDL(t *testing.T) {
	db := testdb.New(t)
	for _, stmt := range []string{
		`CREATE TABLE intruder (id int)`,
		`ALTER TABLE users ADD COLUMN intruder text`,
		`CREATE INDEX intruder_idx ON users (email)`,
		`CREATE SCHEMA intruder`,
		`DROP TABLE registrations`,
		`TRUNCATE users`,
	} {
		t.Run(stmt, func(t *testing.T) {
			err := exec(t, db, stmt)
			if got := sqlState(err); got != "42501" {
				t.Fatalf("App ran %q: err = %v (SQLSTATE %q), want insufficient_privilege (42501)", stmt, err, got)
			}
		})
	}
}

// TestAppRoleHasDataPrivilegesOnEachTable proves each table the service
// needs grants app_runtime exactly SELECT, INSERT, UPDATE and DELETE,
// and that goose's own bookkeeping table is out of its reach. A table a
// later migration adds without its GRANT fails here.
func TestAppRoleHasDataPrivilegesOnEachTable(t *testing.T) {
	db := testdb.New(t)
	rows, err := db.Admin.QueryContext(t.Context(), `
		SELECT c.relname,
		       has_table_privilege('app_runtime', c.oid, 'SELECT'),
		       has_table_privilege('app_runtime', c.oid, 'INSERT'),
		       has_table_privilege('app_runtime', c.oid, 'UPDATE'),
		       has_table_privilege('app_runtime', c.oid, 'DELETE'),
		       has_table_privilege('app_runtime', c.oid, 'TRUNCATE, REFERENCES, TRIGGER')
		FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = 'public' AND c.relkind = 'r'
		ORDER BY c.relname`)
	if err != nil {
		t.Fatalf("query privileges: %v", err)
	}
	defer rows.Close()

	want := []string{
		"class_counselors", "class_periods", "classes", "idempotency_keys", "periods",
		"rate_limit_buckets", "registrations", "role_grants", "scouts", "universities", "users",
	}
	var got []string
	for rows.Next() {
		var name string
		var sel, ins, upd, del, other bool
		if err := rows.Scan(&name, &sel, &ins, &upd, &del, &other); err != nil {
			t.Fatalf("scan: %v", err)
		}
		if name == "goose_db_version" {
			if sel || ins || upd || del || other {
				t.Errorf("app_runtime holds a privilege on goose_db_version, want none")
			}
			continue
		}
		got = append(got, name)
		if !sel || !ins || !upd || !del || other {
			t.Errorf("%s: app_runtime SELECT=%v INSERT=%v UPDATE=%v DELETE=%v other=%v, want exactly the four data privileges",
				name, sel, ins, upd, del, other)
		}
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("rows: %v", err)
	}
	if !slices.Equal(got, want) {
		t.Errorf("tables = %v, want %v", got, want)
	}
}

// TestOneRegistrationPerScoutPerClass proves the composite primary key:
// a second Registration of one Scout in one Class is refused, also when
// the first one is cancelled (register reuses that row instead).
func TestOneRegistrationPerScoutPerClass(t *testing.T) {
	db := seed(t)
	for _, class := range []string{classID, class2ID} {
		err := exec(t, db, `INSERT INTO registrations (class_id, scout_id, status, waitlisted_at,
		        parent_consent_at, accepted_policy_version, scout_first_name, scout_last_name, parent_name, parent_email)
		    VALUES ('`+class+`', '`+scoutID+`', 'waitlisted', now(), now(), 'v1', 'Sam', 'Scout', 'Pat', 'p@example.com')`)
		if !pgerr.IsUniqueViolationOn(err, "registrations_pkey") {
			t.Errorf("second Registration in class %s: err = %v, want a unique violation on registrations_pkey", class, err)
		}
	}
}

// TestNoDuplicateRoleGrant proves the two partial unique indexes on
// role_grants, with NULLS NOT DISTINCT for the University grants.
func TestNoDuplicateRoleGrant(t *testing.T) {
	db := seed(t)
	if err := exec(t, db, `INSERT INTO role_grants (role, university_id, class_id, invited_email, status)
	    VALUES ('counselor', '`+uniID+`', '`+classID+`', 'new@example.com', 'invited')`); err != nil {
		t.Fatalf("first invite: %v", err)
	}

	for _, tc := range []struct {
		name, stmt, key string
	}{
		{
			"a second chancellor grant of one account on one University",
			`INSERT INTO role_grants (role, university_id, uid, status)
			    VALUES ('chancellor', '` + uniID + `', '` + chancellorUID + `', 'revoked')`,
			"role_grants_uid_key",
		},
		{
			"a second counselor grant of one account on one Class",
			`INSERT INTO role_grants (role, university_id, class_id, uid, status)
			    VALUES ('counselor', '` + uniID + `', '` + classID + `', '` + counselorUID + `', 'active')`,
			"role_grants_uid_key",
		},
		{
			"a second invite of one email to one Class",
			`INSERT INTO role_grants (role, university_id, class_id, invited_email, status)
			    VALUES ('counselor', '` + uniID + `', '` + classID + `', 'new@example.com', 'invited')`,
			"role_grants_invited_email_key",
		},
		{
			"a second chancellor invite of one email to one University",
			`INSERT INTO role_grants (role, university_id, invited_email, status) VALUES
			    ('chancellor', '` + uniID + `', 'co@example.com', 'invited'),
			    ('chancellor', '` + uniID + `', 'co@example.com', 'invited')`,
			"role_grants_invited_email_key",
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if err := exec(t, db, tc.stmt); !pgerr.IsUniqueViolationOn(err, tc.key) {
				t.Fatalf("err = %v, want a unique violation on %s", err, tc.key)
			}
		})
	}

	// The keys are per scope and role, not per account.
	for _, stmt := range []string{
		`INSERT INTO role_grants (role, university_id, class_id, uid, status)
		    VALUES ('counselor', '` + uniID + `', '` + class2ID + `', '` + counselorUID + `', 'active')`,
		`INSERT INTO role_grants (role, university_id, uid, status)
		    VALUES ('chancellor', '` + otherUniID + `', '` + chancellorUID + `', 'active')`,
		`INSERT INTO role_grants (role, university_id, uid, status)
		    VALUES ('chancellor', '` + uniID + `', '` + counselorUID + `', 'active')`,
	} {
		if err := exec(t, db, stmt); err != nil {
			t.Errorf("a grant in another scope or role: %v\n%s", err, stmt)
		}
	}
}

// TestCheckConstraints proves each named CHECK on a status, and each
// CHECK that ties a status to the columns it needs. Each case changes one
// valid fixture row to a value the constraint must refuse.
func TestCheckConstraints(t *testing.T) {
	db := seed(t)
	const (
		uni    = `UPDATE universities SET %s WHERE id = '` + uniID + `'`
		reg    = `UPDATE registrations SET %s WHERE class_id = '` + classID + `' AND scout_id = '` + scoutID + `'`
		grant  = `UPDATE role_grants SET %s WHERE role = 'counselor'`
		period = `UPDATE periods SET %s`
	)
	for _, tc := range []struct {
		constraint, format, set string
	}{
		{"universities_status_check", uni, `status = 'archived'`},
		{"universities_id_check", uni, `id = 'not-a-uuid'`},
		{"universities_submitted_check", uni, `status = 'submitted'`},
		{"universities_published_check", uni, `status = 'published'`},
		{"universities_published_check", uni, `status = 'closed', closed_at = now()`},
		{"universities_rejected_check", uni, `status = 'rejected'`},
		{"universities_closed_check", uni, `status = 'closed', published_at = now()`},
		{"universities_billing_status_check", uni, `billing_status = 'refunded'`},
		{"universities_billing_check", uni, `billing_amount_cents = 500`},
		{"universities_billing_amount_cents_check", uni, `billing_status = 'pending', billing_amount_cents = -1`},
		{"universities_end_date_check", uni, `end_date = start_date - interval '1 day'`},
		{"universities_registration_window_check", uni, `registration_opens_at = registration_closes_at`},
		{"scouts_age_band_check", `UPDATE scouts SET %s`, `age_band = '18-20'`},
		{"periods_time_order_check", period, `ends_at = starts_at`},
		{"periods_label_check", period, `label = ''`},
		{"periods_position_check", period, `position = -1`},
		{"classes_capacity_check", `UPDATE classes SET %s`, `capacity = 0`},
		{"registrations_status_check", reg, `status = 'pending'`},
		{"registrations_enrolled_check", reg, `waitlisted_at = now()`},
		{"registrations_waitlisted_check", reg, `status = 'waitlisted', enrolled_at = NULL`},
		{"registrations_unpurged_check", reg, `parent_email = NULL`},
		{"registrations_purged_check", reg, `purged_at = now()`},
		{"role_grants_status_check", grant, `status = 'pending'`},
		{"role_grants_role_check", grant, `role = 'parent'`},
		{"role_grants_scope_check", grant, `class_id = NULL`},
		{"role_grants_invited_check", grant, `status = 'invited'`},
		{"role_grants_active_check", grant, `uid = NULL, invited_email = 'c@example.com'`},
		{"role_grants_grantee_check", grant, `status = 'revoked', uid = NULL`},
		{"role_grants_invited_email_check", grant, `invited_email = 'Upper@Example.com'`},
	} {
		stmt := fmt.Sprintf(tc.format, tc.set)
		t.Run(tc.constraint+": "+tc.set, func(t *testing.T) {
			if err := exec(t, db, stmt); !pgerr.IsCheckViolationOn(err, tc.constraint) {
				t.Fatalf("err = %v, want a check violation on %s\n%s", err, tc.constraint, stmt)
			}
		})
	}

	// The fixture rows are still valid: no case changed one.
	if err := exec(t, db, fmt.Sprintf(reg, `status = 'cancelled'`)); err != nil {
		t.Fatalf("a valid change after the refused ones: %v", err)
	}
}

// TestDeleteBehavior proves the foreign-key delete behavior of
// docs/data-model.md, "Delete and purge behavior". Each case deletes one
// row of a fresh fixture graph through App and counts what is left.
func TestDeleteBehavior(t *testing.T) {
	for _, tc := range []struct {
		name   string
		delete string
		// left maps a count query to the rows it must find after the delete.
		left map[string]int
	}{
		{
			name:   "a University delete cascades to everything under it",
			delete: `DELETE FROM universities WHERE id = '` + uniID + `'`,
			left: map[string]int{
				`SELECT count(*) FROM periods WHERE university_id = '` + uniID + `'`: 0,
				all("classes"):          0,
				all("class_periods"):    0,
				all("class_counselors"): 0,
				all("registrations"):    0,
				all("role_grants"):      0,
				all("periods"):          1,
				all("users"):            3,
				all("scouts"):           1,
			},
		},
		{
			name:   "a Class delete cascades to its links, Registrations and Counselor grants",
			delete: `DELETE FROM classes WHERE id = '` + classID + `'`,
			left: map[string]int{
				all("class_periods"):    0,
				all("class_counselors"): 0,
				`SELECT count(*) FROM registrations WHERE class_id = '` + classID + `'`: 0,
				all("registrations"): 1,
				`SELECT count(*) FROM role_grants WHERE role = 'counselor'`:  0,
				`SELECT count(*) FROM role_grants WHERE role = 'chancellor'`: 1,
				all("periods"): 2,
			},
		},
		{
			name:   "a Scout delete erases each of its Registrations, cancelled ones too",
			delete: `DELETE FROM scouts WHERE id = '` + scoutID + `'`,
			left: map[string]int{
				all("registrations"): 0,
				all("classes"):       2,
				all("users"):         3,
			},
		},
		{
			name:   "a Parent's account delete erases the Scouts, their Registrations and the stored responses",
			delete: `DELETE FROM users WHERE uid = '` + parentUID + `'`,
			left: map[string]int{
				all("scouts"):           0,
				all("registrations"):    0,
				all("idempotency_keys"): 0,
			},
		},
		{
			name:   "a Counselor's account delete erases the Class counselor row and the grant",
			delete: `DELETE FROM users WHERE uid = '` + counselorUID + `'`,
			left: map[string]int{
				all("class_counselors"): 0,
				`SELECT count(*) FROM role_grants WHERE role = 'counselor'`: 0,
				all("classes"):          2,
				all("idempotency_keys"): 1,
			},
		},
		{
			name:   "a Chancellor's account delete keeps the University it made",
			delete: `DELETE FROM users WHERE uid = '` + chancellorUID + `'`,
			left: map[string]int{
				`SELECT count(*) FROM role_grants WHERE role = 'chancellor'`:                       0,
				`SELECT count(*) FROM universities WHERE created_by_uid = '` + chancellorUID + `'`: 2,
			},
		},
		{
			name:   "a Period that no Class uses can go",
			delete: `DELETE FROM periods WHERE id = '` + otherPerID + `'`,
			left: map[string]int{
				all("periods"): 1,
			},
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			db := seed(t)
			if err := exec(t, db, tc.delete); err != nil {
				t.Fatalf("delete: %v", err)
			}
			for query, want := range tc.left {
				if got := count(t, db.Admin, query); got != want {
					t.Errorf("%s = %d, want %d", query, got, want)
				}
			}
		})
	}
}

// TestPeriodInUseCannotGo proves the deferred Period foreign key: the
// delete itself runs, and the commit refuses it.
func TestPeriodInUseCannotGo(t *testing.T) {
	db := seed(t)
	tx, err := db.App.BeginTx(t.Context(), nil)
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(t.Context(), `DELETE FROM periods WHERE id = '`+periodID+`'`); err != nil {
		t.Fatalf("delete inside the transaction: %v, want the check deferred to commit", err)
	}
	if err := tx.Commit(); !pgerr.IsForeignKeyViolationOn(err, "class_periods_period_fkey") {
		t.Fatalf("commit: err = %v, want a foreign-key violation on class_periods_period_fkey", err)
	}
	if got := count(t, db.Admin, `SELECT count(*) FROM periods WHERE id = '`+periodID+`'`); got != 1 {
		t.Fatalf("periods with the used id = %d, want 1", got)
	}
}

// TestNoLinkAcrossUniversities proves the composite foreign keys: a
// Class cannot use a Period, and a Counselor grant cannot name a Class,
// of another University.
func TestNoLinkAcrossUniversities(t *testing.T) {
	db := seed(t)
	err := exec(t, db, `INSERT INTO class_periods (class_id, period_id, university_id)
	    VALUES ('`+classID+`', '`+otherPerID+`', '`+uniID+`')`)
	if !pgerr.IsForeignKeyViolationOn(err, "class_periods_period_fkey") {
		t.Errorf("a Period of another University: err = %v, want a foreign-key violation on class_periods_period_fkey", err)
	}
	err = exec(t, db, `INSERT INTO role_grants (role, university_id, class_id, uid, status)
	    VALUES ('counselor', '`+otherUniID+`', '`+classID+`', '`+counselorUID+`', 'active')`)
	if !pgerr.IsForeignKeyViolationOn(err, "role_grants_class_fkey") {
		t.Errorf("a Class of another University: err = %v, want a foreign-key violation on role_grants_class_fkey", err)
	}
}
