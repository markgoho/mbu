package main

import (
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"
	"time"

	"mbu/api/internal/apierr"
	"mbu/api/internal/apierrtest"
	"mbu/api/internal/internalauth"
)

// The port of functions/src/retention-api/routes/purge.test.ts (#256),
// against a real database. The cron shared secret is now a caller
// identity (ADR 0005), so its cases became token cases.

// declaredInternalRoutes is every route under /api/internal/. Each one
// answers the public internet (mbu-api allows allUsers) behind the guard
// alone, so a new one costs a line here.
var declaredInternalRoutes = []string{
	"POST /api/internal/outboxes/drain",
	"POST /api/internal/retention/purge",
}

const (
	pathPurge = "/api/internal/retention/purge"
	// The Universities of the purge fixture, by how long ago each one
	// ended at testNow.
	uniEnded91 = "00000000-0000-4000-8000-000000000101"
	uniEnded90 = "00000000-0000-4000-8000-000000000102"
	uniEnded89 = "00000000-0000-4000-8000-000000000103"
	uniSpans89 = "00000000-0000-4000-8000-000000000104"
	// A Class in each.
	classEnded91 = "00000000-0000-4000-8000-000000000111"
	classEnded90 = "00000000-0000-4000-8000-000000000112"
	classEnded89 = "00000000-0000-4000-8000-000000000113"
	classSpans89 = "00000000-0000-4000-8000-000000000114"
	// The Scouts of the other Parent.
	scoutP1 = "00000000-0000-4000-8000-000000000121"
	scoutP2 = "00000000-0000-4000-8000-000000000122"
	scoutP3 = "00000000-0000-4000-8000-000000000123"
	scoutP4 = "00000000-0000-4000-8000-000000000124"
	// purgedEarlier is when an earlier run purged a Registration.
	purgedEarlier = "2027-01-01T00:00:00Z"
)

// purgeAll is the body of the first run on purgeFixture: one University
// is past the window, and three of its Registrations were not purged.
const purgeAll = `{"universitiesProcessed":1,"registrationsPurged":3}`

// daysAgo is the instant n days before testNow.
func daysAgo(n int) time.Time { return testNow.AddDate(0, 0, -n) }

// purgeFixture has four Universities: one that ended 91 days before
// testNow (start date only), one exactly 90 days, one 89 days, and a
// multi-day one that started 95 days before and ended 89 days before.
// Each has a Class. The 91-day Class holds an enrolled, a waitlisted and
// a cancelled Registration with a full snapshot, and one an earlier run
// purged. Each other Class holds one enrolled Registration.
func purgeFixture(t *testing.T) *usersFixture {
	t.Helper()
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	f.user(uidOther, "other@example.com")
	for _, u := range []struct {
		id, class  string
		start, end time.Time
	}{
		{uniEnded91, classEnded91, daysAgo(91), time.Time{}},
		{uniEnded90, classEnded90, daysAgo(90), time.Time{}},
		{uniEnded89, classEnded89, daysAgo(89), time.Time{}},
		{uniSpans89, classSpans89, daysAgo(95), daysAgo(89)},
	} {
		f.exec(`INSERT INTO universities (id, title, status, timezone, start_date, end_date,
			registration_closes_at, location_name, location_address, location_city, location_state,
			location_zip, created_by_uid, published_at)
			VALUES ($1, 'MBU', 'published', 'America/New_York', $2, $3, $4, 'HS', '1 Main', 'Town', 'VA',
			'22000', $5, $4)`,
			u.id, u.start, nullUnless(!u.end.IsZero(), u.end), u.start.AddDate(0, 0, -7), uidParent)
		f.exec(`INSERT INTO classes (id, university_id, badge_slug, badge_title, eagle_required, capacity)
			VALUES ($1, $2, 'camping', 'Camping', false, 5)`, u.class, u.id)
	}
	for _, s := range []string{scoutP1, scoutP2, scoutP3, scoutP4} {
		f.scout(s, uidOther)
	}
	enrolledAt := daysAgo(120)
	f.rosterRegistration(classEnded91, scoutP1, statusEnrolled, enrolledAt, "Al", "Adams")
	f.rosterRegistration(classEnded91, scoutP2, statusWaitlisted, enrolledAt, "Ben", "Brown")
	f.rosterRegistration(classEnded91, scoutP3, "cancelled", enrolledAt, "Cy", "Cruz")
	f.exec(`INSERT INTO registrations (class_id, scout_id, status, enrolled_at, parent_consent_at,
		accepted_policy_version, purged_at) VALUES ($1, $2, 'enrolled', $3, $3, '2026-07-04', $4)`,
		classEnded91, scoutP4, enrolledAt, purgedEarlier)
	for _, c := range []string{classEnded90, classEnded89, classSpans89} {
		f.rosterRegistration(c, scoutP1, statusEnrolled, enrolledAt, "Al", "Adams")
	}
	return f
}

// purge sends the purge with the scheduler's token.
func (f *usersFixture) purge() *http.Response {
	f.t.Helper()
	return f.send(http.MethodPost, pathPurge, oidcScheduler, "")
}

// registrationRows is every Registration, one JSON text per row in key
// order, so a test can compare the whole table before and after.
func (f *usersFixture) registrationRows() string {
	f.t.Helper()
	var rows string
	if err := f.db.Admin.QueryRowContext(f.t.Context(),
		`SELECT coalesce(string_agg(row_to_json(r)::text, E'\n' ORDER BY class_id, scout_id), '')
		 FROM registrations r`).Scan(&rows); err != nil {
		f.t.Fatalf("read registrations: %v", err)
	}
	return rows
}

// newRequest is a request to the route of pattern with no body and no
// credentials.
func newRequest(t *testing.T, pattern string) *http.Request {
	t.Helper()
	method, path, _ := strings.Cut(pattern, " ")
	return httptest.NewRequestWithContext(t.Context(), method, path, http.NoBody)
}

// serveRequest sends req to h.
func serveRequest(h http.Handler, req *http.Request) *http.Response {
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec.Result()
}

func TestInternalRoutes_AreTheOnesOnTheRecord(t *testing.T) {
	var got []string
	for _, r := range buildRoutes(testDeps()).table {
		if r.Class == classInternal {
			got = append(got, r.Pattern)
		}
	}
	slices.Sort(got)
	want := slices.Sorted(slices.Values(declaredInternalRoutes))
	if !slices.Equal(got, want) {
		t.Errorf("internal routes = %q, want %q", got, want)
	}
}

// TestInternalRoutes_RefuseACallerTheGuardDoesNotKnow is the boundary
// for every route under /api/internal/: no credential, a token for
// another audience, a caller not in the allowlist, and the local secret
// header on a service that sets no secret (the deployed posture) each
// get 401, and nothing changes.
func TestInternalRoutes_RefuseACallerTheGuardDoesNotKnow(t *testing.T) {
	f := purgeFixture(t)
	before := f.registrationRows()
	for name, set := range map[string]func(r *http.Request){
		"no credential":                  func(*http.Request) {},
		"a token for another audience":   func(r *http.Request) { r.Header.Set("Authorization", "Bearer "+oidcOtherAudience) },
		"a caller not in the allowlist":  func(r *http.Request) { r.Header.Set("Authorization", "Bearer "+oidcStranger) },
		"a token Google does not know":   func(r *http.Request) { r.Header.Set("Authorization", "Bearer forged") },
		"the secret header, none is set": func(r *http.Request) { r.Header.Set("X-Internal-Secret", "") },
		"a guessed secret, none is set":  func(r *http.Request) { r.Header.Set("X-Internal-Secret", "guessed") },
	} {
		for _, pattern := range declaredInternalRoutes {
			t.Run(name+" "+pattern, func(t *testing.T) {
				req := newRequest(t, pattern)
				set(req)
				resp := serveRequest(f.h, req)
				defer resp.Body.Close()
				if resp.StatusCode != http.StatusUnauthorized {
					t.Fatalf("status = %d, want 401", resp.StatusCode)
				}
				got := apierrtest.Decode(t, resp)
				if got.Code != apierr.CodeUnauthorized || got.Message != internalauth.MsgUnauthorized {
					t.Errorf("error = %+v, want UNAUTHORIZED %q", got, internalauth.MsgUnauthorized)
				}
			})
		}
	}
	if after := f.registrationRows(); after != before {
		t.Errorf("a refused call changed the Registrations:\n%s\nwant:\n%s", after, before)
	}
}

func TestPurge_AnAllowlistedCallerRunsItAndGetsTheCounts(t *testing.T) {
	f := purgeFixture(t)

	resp := f.purge()
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	wantJSONBody(t, resp, purgeAll)
}

// TestPurge_ClearsTheSnapshotOfAUniversityPastTheWindowOnly is the
// 89/91-day case: only the University that ended more than 90 days
// before now is purged. The effective end is end_date for a multi-day
// University, else start_date, and exactly 90 days is not past.
func TestPurge_ClearsTheSnapshotOfAUniversityPastTheWindowOnly(t *testing.T) {
	f := purgeFixture(t)

	resp := f.purge()
	defer resp.Body.Close()
	wantJSONBody(t, resp, purgeAll)

	// The three Registrations of the 91-day Class: the six snapshot
	// columns NULL, purged_at and updated_at at now, the rest kept.
	if n := f.count(`SELECT count(*) FROM registrations WHERE class_id = $1 AND scout_id <> $2
		AND scout_first_name IS NULL AND scout_last_name IS NULL AND scout_unit IS NULL
		AND accommodations IS NULL AND parent_name IS NULL AND parent_email IS NULL
		AND purged_at = $3 AND updated_at = $3
		AND parent_consent_at = $4 AND accepted_policy_version = '2026-07-04'
		AND enrolled_at IS NOT DISTINCT FROM (CASE WHEN status = 'waitlisted' THEN NULL ELSE $4 END)`,
		classEnded91, scoutP4, testNow, daysAgo(120)); n != 3 {
		t.Errorf("purged Registrations with the consent record kept = %d, want 3", n)
	}
	if n := f.count(`SELECT count(*) FROM registrations WHERE class_id = $1 AND status = 'cancelled'`,
		classEnded91); n != 1 {
		t.Errorf("the cancelled Registration changed status or went away: %d left, want 1", n)
	}
	// The one an earlier run purged keeps its purged_at.
	if n := f.count(`SELECT count(*) FROM registrations WHERE scout_id = $1 AND purged_at = $2`,
		scoutP4, purgedEarlier); n != 1 {
		t.Error("the purge stamped a Registration an earlier run purged")
	}
	// The 90-day, 89-day and multi-day Universities are untouched.
	if n := f.count(`SELECT count(*) FROM registrations WHERE class_id = ANY($1)
		AND purged_at IS NULL AND scout_first_name = 'Al' AND scout_unit = 'Troop 9'
		AND parent_email = 'other@example.com' AND updated_at <> $2`,
		[]string{classEnded90, classEnded89, classSpans89}, testNow); n != 3 {
		t.Errorf("untouched Registrations inside the window = %d, want 3", n)
	}
}

// TestPurge_ASecondRunChangesNothing is the idempotency of the purge: a
// second run finds the same University, purges no Registration, and
// changes no row. (A row purged at an earlier time keeps its purged_at:
// the first test holds that.)
func TestPurge_ASecondRunChangesNothing(t *testing.T) {
	f := purgeFixture(t)
	first := f.purge()
	_ = first.Body.Close()
	before := f.registrationRows()

	resp := f.purge()
	defer resp.Body.Close()

	wantJSONBody(t, resp, `{"universitiesProcessed":1,"registrationsPurged":0}`)
	if after := f.registrationRows(); after != before {
		t.Errorf("the second run changed the Registrations:\n%s\nwant:\n%s", after, before)
	}
}

// TestPurge_DeletesExpiredIdempotencyKeysAndRateLimitBuckets: a stored
// response older than 48 hours and a rate-limit bucket whose window
// started more than a day ago go; newer ones stay.
func TestPurge_DeletesExpiredIdempotencyKeysAndRateLimitBuckets(t *testing.T) {
	f := purgeFixture(t)
	f.exec(`INSERT INTO idempotency_keys (uid, key, request_hash, status_code, response_body, created_at) VALUES
		($1, 'old', '\x00', 200, '{}', $2), ($1, 'new', '\x00', 200, '{}', $3)`,
		uidParent, testNow.Add(-48*time.Hour), testNow.Add(-47*time.Hour))
	f.exec(`INSERT INTO rate_limit_buckets (key, window_start, count) VALUES
		('universities-public:ip:203.0.113.1', $1, 5), ('universities-public:ip:203.0.113.2', $2, 5)`,
		testNow.Add(-24*time.Hour), testNow.Add(-23*time.Hour))

	resp := f.purge()
	defer resp.Body.Close()

	wantJSONBody(t, resp, purgeAll)
	if n := f.count(`SELECT count(*) FROM idempotency_keys WHERE key = 'new'`); n != 1 || f.count(`SELECT count(*) FROM idempotency_keys`) != 1 {
		t.Error("idempotency keys left are not only the one younger than 48 hours")
	}
	if n := f.count(`SELECT count(*) FROM rate_limit_buckets WHERE key LIKE '%.2'`); n != 1 || f.count(`SELECT count(*) FROM rate_limit_buckets`) != 1 {
		t.Error("rate-limit buckets left are not only the one younger than a day")
	}
}

func TestPurge_ADatabaseFailureIsInternal(t *testing.T) {
	d := testDeps()
	d.DB = closedDB(t)

	resp := serve(t, routes(d), http.MethodPost, pathPurge, oidcScheduler)
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", resp.StatusCode)
	}
	if got := apierrtest.Decode(t, resp); got.Code != apierr.CodeInternal {
		t.Errorf("code = %s, want INTERNAL", got.Code)
	}
}
