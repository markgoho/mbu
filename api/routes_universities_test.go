package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"
	"time"

	"mbu/api/internal/apierr"
	"mbu/api/internal/idempotency"
)

const (
	pathUniversities = "/api/universities"
	// The fixture ids of the Periods.
	periodOne = "00000000-0000-4000-8000-0000000000e1"
	periodTwo = "00000000-0000-4000-8000-0000000000e2"
)

// pathPublic is the public read of a University.
func pathPublic(id string) string { return pathUniversities + "/" + id + "/public" }

// scheduleFixture gives University one two Periods, Classes one and two,
// a Counselor on Class one, and Registrations: Class one (Capacity 2)
// has two enrolled and one waitlisted, Class two none.
func (f *usersFixture) scheduleFixture() {
	f.t.Helper()
	f.user(uidParent, emailParent)
	f.exec(`UPDATE users SET display_name = 'Pat Parent' WHERE uid = $1`, uidParent)
	f.user(uidOther, "other@example.com")
	// Period two is first in position order, so a Class's periodIds
	// come in position order, not in id order.
	f.exec(`INSERT INTO periods (id, university_id, label, starts_at, ends_at, position) VALUES
		($1, $3, 'Morning', '2027-04-10T13:00:00Z', '2027-04-10T15:00:00Z', 1),
		($2, $3, 'Early', '2027-04-10T11:00:00Z', '2027-04-10T12:00:00Z', 0)`, periodOne, periodTwo, uniOne)
	f.exec(`INSERT INTO classes (id, university_id, badge_slug, badge_title, eagle_required, capacity, room, notes,
		created_at, updated_at) VALUES
		($1, $3, 'camping', 'Camping', true, 2, 'Room 1', 'Bring a tent', '2027-03-01T00:00:00Z', '2027-03-02T00:00:00Z'),
		($2, $3, 'archery', 'Archery', false, 5, NULL, NULL, '2027-03-03T00:00:00Z', '2027-03-03T00:00:00Z')`,
		classOne, classTwo, uniOne)
	f.exec(`INSERT INTO class_periods (class_id, period_id, university_id) VALUES ($1, $2, $4), ($1, $3, $4), ($5, $2, $4)`,
		classOne, periodOne, periodTwo, uniOne, classTwo)
	f.exec(`INSERT INTO class_counselors (class_id, uid, bsa_id, disclaimer_accepted_at, disclaimer_version)
		VALUES ($1, $2, 'BSA-1', '2027-03-01T00:00:00Z', '2026-07-03')`, classOne, uidParent)
	f.scout(scoutAmy, uidParent)
	f.scout(scoutBen, uidParent)
	f.scout(scoutOther, uidOther)
	f.registration(classOne, scoutAmy, "enrolled", testNow)
	f.registration(classOne, scoutBen, "enrolled", testNow)
	f.registration(classOne, scoutOther, "waitlisted", testNow)
}

func TestPublicUniversity_ReturnsOnlyThePublicFields(t *testing.T) {
	f := newUsersFixture(t)
	f.university(uniOne, statusPublished)
	f.scheduleFixture()

	resp := f.send(http.MethodGet, pathPublic(uniOne), "", "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	wantNoStore(t, resp)
	wantJSONBody(t, resp, `{
		"id": "00000000-0000-4000-8000-000000000001", "title": "MBU", "timezone": "America/New_York",
		"startDate": "2027-04-10T13:00:00.000Z", "endDate": null, "registrationOpensAt": null,
		"registrationClosesAt": "2027-04-01T00:00:00.000Z",
		"location": {"name": "HS", "address": "1 Main", "city": "Town", "state": "VA", "zip": "22000"},
		"periods": `+periodsJSON+`,
		"classes": [
			{"classId": "00000000-0000-4000-8000-0000000000c1", "badgeSlug": "camping", "badgeTitle": "Camping",
			 "eagleRequired": true, "periodIds": ["00000000-0000-4000-8000-0000000000e2", "00000000-0000-4000-8000-0000000000e1"],
			 "room": "Room 1", "notes": "Bring a tent", "capacity": 2, "enrolledCount": 2, "seatsRemaining": 0,
			 "waitlistCount": 1, "counselors": [{"displayName": "Pat Parent"}]},
			{"classId": "00000000-0000-4000-8000-0000000000c2", "badgeSlug": "archery", "badgeTitle": "Archery",
			 "eagleRequired": false, "periodIds": ["00000000-0000-4000-8000-0000000000e1"],
			 "room": null, "notes": null, "capacity": 5, "enrolledCount": 0, "seatsRemaining": 5,
			 "waitlistCount": 0, "counselors": []}
		]}`)
}

func TestPublicUniversity_EveryOtherStatusIsNotFound(t *testing.T) {
	f := newUsersFixture(t)
	ids := map[string]string{
		statusDraft:     "00000000-0000-4000-8000-000000000011",
		statusSubmitted: "00000000-0000-4000-8000-000000000012",
		statusRejected:  "00000000-0000-4000-8000-000000000013",
		statusClosed:    "00000000-0000-4000-8000-000000000014",
		"needs_review":  "00000000-0000-4000-8000-000000000016",
		"missing":       "00000000-0000-4000-8000-000000000015",
		"not a uuid":    "uni1",
	}
	for status, id := range ids {
		if strings.HasPrefix(id, "0") && status != "missing" {
			f.university(id, status)
		}
	}
	for status, id := range ids {
		t.Run(status, func(t *testing.T) {
			resp := f.send(http.MethodGet, pathPublic(id), "", "")
			defer resp.Body.Close()
			got := wantRefusal(t, resp, http.StatusNotFound, apierr.CodeNotFound)
			if got.Message != msgUniversityNotFound {
				t.Fatalf("message = %q, want the same body for each status", got.Message)
			}
			wantNoStore(t, resp)
		})
	}
}

func TestPublicUniversity_RefusesThe601stRequestFromOneAddress(t *testing.T) {
	f := newUsersFixture(t)
	f.university(uniOne, statusDraft)

	for i := 1; i <= 600; i++ {
		resp := f.send(http.MethodGet, pathPublic(uniOne), "", "")
		_ = resp.Body.Close()
		if resp.StatusCode != http.StatusNotFound {
			t.Fatalf("request %d: status = %d, want 404", i, resp.StatusCode)
		}
	}
	resp := f.send(http.MethodGet, pathPublic(uniOne), "", "")
	defer resp.Body.Close()
	wantRefusal(t, resp, http.StatusTooManyRequests, apierr.CodeRateLimited)
	wantNoStore(t, resp)
}

// createBody is a create request that passes every check.
const createBody = `{"id":"11111111-1111-4111-8111-111111111111","title":"  Spring MBU ","timezone":"America/New_York",
	"startDate":"2026-06-01T12:00:00.000Z","registrationClosesAt":"2026-05-25T23:59:59.000Z",
	"location":{"name":"Scout Hall","address":"1 Main St","city":"Anytown","state":"NY","zip":" 12345 "}}`

// createdID is the id createBody sends.
const createdID = "11111111-1111-4111-8111-111111111111"

// pathUniversity is a University's own path.
func pathUniversity(id string) string { return pathUniversities + "/" + id }

// universitiesRoutes is each authenticated University route of #251,
// with a body that passes its checks.
var universitiesRoutes = []struct{ method, path, body string }{
	{http.MethodPost, pathUniversities, createBody},
	{http.MethodGet, pathUniversities + "/mine", ""},
	{http.MethodGet, pathUniversity(uniOne), ""},
	{http.MethodPatch, pathUniversity(uniOne), `{"title":"Renamed MBU"}`},
	{http.MethodDelete, pathUniversity(uniOne), ""},
}

func TestUniversitiesRoutes_RefuseAMissingTokenAndAnUnverifiedEmail(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	f.university(uniOne, statusDraft)
	for _, r := range universitiesRoutes {
		t.Run(r.method+" "+r.path, func(t *testing.T) {
			resp := f.send(r.method, r.path, "", r.body)
			defer resp.Body.Close()
			wantRefusal(t, resp, http.StatusUnauthorized, apierr.CodeUnauthorized)

			resp = f.send(r.method, r.path, tokenUnverified, r.body)
			defer resp.Body.Close()
			wantRefusal(t, resp, http.StatusForbidden, apierr.CodeEmailNotVerified)
		})
	}
	if n := f.count(`SELECT count(*) FROM universities WHERE title = 'MBU'`); n != 1 {
		t.Fatalf("universities rows = %d, want the fixture unchanged", n)
	}
}

func TestUniversitiesRoutes_ADatabaseFailureIsInternal(t *testing.T) {
	d := testDeps()
	d.DB = closedDB(t)
	f := &usersFixture{t: t, h: routes(d)}
	all := slices.Concat(universitiesRoutes, []struct{ method, path, body string }{{http.MethodGet, pathPublic(uniOne), ""}})
	for _, r := range all {
		t.Run(r.method+" "+r.path, func(t *testing.T) {
			resp := f.send(r.method, r.path, tokenParent, r.body)
			defer resp.Body.Close()
			got := wantRefusal(t, resp, http.StatusInternalServerError, apierr.CodeInternal)
			if got.Message != apierr.MsgInternalError {
				t.Fatalf("message = %q, want no detail", got.Message)
			}
		})
	}
}

// A Super-admin passes the role check with no query, so the read of the
// detail is the first to fail.
func TestUniversityDetail_ADatabaseFailureIsInternalForASuperAdmin(t *testing.T) {
	d := testDeps()
	d.DB = closedDB(t)
	f := &usersFixture{t: t, h: routes(d)}
	resp := f.send(http.MethodGet, pathUniversity(uniOne), tokenSuperAdmin, "")
	defer resp.Body.Close()
	wantRefusal(t, resp, http.StatusInternalServerError, apierr.CodeInternal)
}

func TestUniversityWrites_RefuseABodyThatIsNotJSON(t *testing.T) {
	f := patchFixture(t)
	for _, method := range []string{http.MethodPost, http.MethodPatch} {
		path := pathUniversities
		if method == http.MethodPatch {
			path = pathUniversity(uniOne)
		}
		resp := f.send(method, path, tokenParent, `{"title":`)
		wantRefusal(t, resp, http.StatusBadRequest, apierr.CodeInvalidArgument)
		_ = resp.Body.Close()
	}
}

// The routes that only a University's Chancellor or a Super-admin may
// call refuse anyone else, and a Super-admin gets 404 for a University
// that does not exist, where anyone else gets 403 first.
func TestUniversityRoutes_OnlyTheChancellorOrASuperAdmin(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	f.university(uniOne, statusDraft)
	missing := "00000000-0000-4000-8000-0000000000ff"
	for _, r := range universitiesRoutes[2:] {
		t.Run(r.method+" not the Chancellor", func(t *testing.T) {
			resp := f.send(r.method, r.path, tokenParent, r.body)
			defer resp.Body.Close()
			wantRefusal(t, resp, http.StatusForbidden, apierr.CodeForbidden)

			resp = f.send(r.method, pathUniversity(missing), tokenParent, r.body)
			defer resp.Body.Close()
			wantRefusal(t, resp, http.StatusForbidden, apierr.CodeForbidden)

			resp = f.send(r.method, pathUniversity(missing), tokenSuperAdmin, r.body)
			defer resp.Body.Close()
			wantRefusal(t, resp, http.StatusNotFound, apierr.CodeNotFound)
		})
	}
	if n := f.count(`SELECT count(*) FROM universities WHERE id = $1 AND title = 'MBU'`, uniOne); n != 1 {
		t.Fatal("a refused write changed the University")
	}
}

func TestCreateUniversity_CreatesADraftAndTheChancellorGrant(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)

	resp := f.send(http.MethodPost, pathUniversities, tokenParent, createBody)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	wantJSONBody(t, resp, `{
		"id": "11111111-1111-4111-8111-111111111111", "title": "Spring MBU", "status": "draft",
		"timezone": "America/New_York", "startDate": "2026-06-01T12:00:00.000Z", "endDate": null,
		"registrationOpensAt": null, "registrationClosesAt": "2026-05-25T23:59:59.000Z",
		"location": {"name": "Scout Hall", "address": "1 Main St", "city": "Anytown", "state": "NY", "zip": "12345"},
		"createdByUid": "uid-parent", "reviewNote": null, "submittedAt": null,
		"createdAt": "2027-03-06T09:00:00.000Z", "updatedAt": "2027-03-06T09:00:00.000Z"}`)
	if n := f.count(`SELECT count(*) FROM role_grants WHERE university_id = $1 AND uid = $2
		AND role = 'chancellor' AND status = 'active' AND class_id IS NULL`, createdID, uidParent); n != 1 {
		t.Fatalf("chancellor grants = %d, want 1", n)
	}

	// The creator now lists it and reads its detail.
	resp = f.send(http.MethodGet, pathUniversity(createdID), tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
}

func TestCreateUniversity_ARepeatWithTheSameKeyCreatesOne(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)

	for range 2 {
		req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, pathUniversities, strings.NewReader(createBody))
		req.Header.Set("Authorization", "Bearer "+tokenParent)
		req.Header.Set(idempotency.HeaderName, "create-1")
		rec := httptest.NewRecorder()
		f.h.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200 (a replay)", rec.Code)
		}
	}
	if n := f.count(`SELECT count(*) FROM universities`) + f.count(`SELECT count(*) FROM role_grants`); n != 2 {
		t.Fatalf("universities + grants = %d, want one of each", n)
	}
}

func TestCreateUniversity_AnIdThatExistsIsAConflict(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	f.university(createdID, statusDraft)

	resp := f.send(http.MethodPost, pathUniversities, tokenParent, createBody)
	defer resp.Body.Close()
	wantRefusal(t, resp, http.StatusConflict, apierr.CodeConflict)
	if n := f.count(`SELECT count(*) FROM role_grants`); n != 0 {
		t.Fatalf("grants = %d, want none", n)
	}
}

func TestCreateUniversity_BeforeTheBootstrapIsNotFound(t *testing.T) {
	f := newUsersFixture(t)

	resp := f.send(http.MethodPost, pathUniversities, tokenParent, createBody)
	defer resp.Body.Close()
	got := wantRefusal(t, resp, http.StatusNotFound, apierr.CodeNotFound)
	if got.Message != msgNotBootstrapped {
		t.Fatalf("message = %q", got.Message)
	}
	if n := f.count(`SELECT count(*) FROM universities`); n != 0 {
		t.Fatalf("universities = %d, want the create rolled back", n)
	}
}

func TestCreateUniversity_RefusesEachBadField(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	loc := `"location":{"name":"Hall","address":"1 Main","city":"Town","state":"NY","zip":"1"}`
	base := `"id":"` + createdID + `","title":"MBU","timezone":"UTC","startDate":"2026-06-01T12:00:00Z",` +
		`"registrationClosesAt":"2026-05-25T00:00:00Z",` + loc

	tests := []struct {
		name string
		body string
		want map[string]string
	}{
		{"every required field missing", `{}`, map[string]string{
			"id": msgWantID, keyTitle: msgWantTitle, keyTimezone: msgWantTimezone, keyStartDate: msgWantStart,
			keyClosesAt: msgWantCloses, "location": msgWantLocation,
		}},
		{"wrong types and nulls", `{"id":7,"title":null,"timezone":false,"startDate":null,"endDate":3,
			"registrationOpensAt":"soon","registrationClosesAt":[],"location":"Hall"}`, map[string]string{
			"id": msgWantID, keyTitle: msgWantTitle, keyTimezone: msgWantTimezone, keyStartDate: msgWantStart,
			keyEndDate:  "Enter the end date as a date and time, or leave it empty.",
			keyOpensAt:  "Enter the registration open time as a date and time, or leave it empty.",
			keyClosesAt: msgWantCloses, "location": msgWantLocation,
		}},
		{"an id that is not a uuid", `{` + strings.Replace(base, createdID, "uni1", 1) + `}`, map[string]string{"id": msgWantID}},
		{"a blank title", `{` + strings.Replace(base, `"MBU"`, `"   "`, 1) + `}`, map[string]string{keyTitle: msgWantTitle}},
		{"a title of 121 characters", `{` + strings.Replace(base, `"MBU"`, `"`+strings.Repeat("é", 121)+`"`, 1) + `}`,
			map[string]string{keyTitle: msgWantTitle}},
		{"a timezone not in the database", `{` + strings.Replace(base, `"UTC"`, `"Mars/Olympus"`, 1) + `}`,
			map[string]string{keyTimezone: msgWantTimezone}},
		{"the Local timezone", `{` + strings.Replace(base, `"UTC"`, `"Local"`, 1) + `}`,
			map[string]string{keyTimezone: msgWantTimezone}},
		{"an empty timezone", `{` + strings.Replace(base, `"UTC"`, `""`, 1) + `}`,
			map[string]string{keyTimezone: msgWantTimezone}},
		{"a date with no zone", `{` + strings.Replace(base, "2026-06-01T12:00:00Z", "2026-06-01T12:00:00", 1) + `}`,
			map[string]string{keyStartDate: msgWantStart}},
		{"blank and missing location fields", `{` + strings.Replace(base, loc,
			`"location":{"name":" ","address":1,"city":"Town","state":"NY"}`, 1) + `}`, map[string]string{
			"location.name": "Enter the location name.", "location.address": "Enter the location address.",
			"location.zip": "Enter the location zip.",
		}},
		{"an end date before the start date", `{` + base + `,"endDate":"2026-06-01T11:59:59Z"}`,
			map[string]string{keyEndDate: "Enter an end date on or after the start date."}},
		{"a registration window that opens at its close", `{` + base + `,"registrationOpensAt":"2026-05-25T00:00:00Z"}`,
			map[string]string{keyOpensAt: "Enter a registration open time before the registration close time."}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := f.send(http.MethodPost, pathUniversities, tokenParent, tt.body)
			defer resp.Body.Close()
			got := wantRefusal(t, resp, http.StatusBadRequest, apierr.CodeInvalidArgument)
			wantSameJSON(t, got.Details, tt.want)
		})
	}

	// The body passes with all its optional fields set, and an end date
	// equal to the start date.
	resp := f.send(http.MethodPost, pathUniversities, tokenParent, `{`+base+
		`,"endDate":"2026-06-01T12:00:00Z","registrationOpensAt":"2026-05-01T00:00:00-04:00"}`)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	got := decode[map[string]any](t, resp)
	if got["endDate"] != "2026-06-01T12:00:00.000Z" || got["registrationOpensAt"] != "2026-05-01T04:00:00.000Z" {
		t.Fatalf("body = %v, want the optional dates in UTC", got)
	}
	if n := f.count(`SELECT count(*) FROM universities`); n != 1 {
		t.Fatalf("universities = %d, want only the valid create", n)
	}
}

// The details entries the create and patch checks write.
const (
	msgWantID       = "Send the University id as a UUID."
	msgWantTitle    = "Enter a title of 1 to 120 characters."
	msgWantTimezone = "Enter a timezone from the IANA database, such as America/New_York."
	msgWantStart    = "Enter the start date as a date and time."
	msgWantCloses   = "Enter the registration close time as a date and time."
	msgWantLocation = "Enter the location: name, address, city, state and zip."
)

func TestListMine_TheCallersActiveChancellorUniversitiesOldestFirst(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	f.user(uidOther, "other@example.com")
	uniThree := "00000000-0000-4000-8000-000000000003"
	uniFour := "00000000-0000-4000-8000-000000000004"
	for _, id := range []string{uniOne, uniTwo, uniThree, uniFour} {
		f.university(id, statusDraft)
	}
	// University two is older than one, so it comes first. The fixture
	// rows have the database clock's created_at, so the older one is
	// set from that clock too.
	f.exec(`UPDATE universities SET created_at = now() - interval '1 hour', end_date = '2027-04-11T13:00:00Z',
		status = 'published', published_at = $2 WHERE id = $1`, uniTwo, testNow)
	f.class(classOne, 10)
	f.class(classTwo, 10)
	f.grant(uniOne, "")
	f.grant(uniTwo, "")
	// Not listed: a revoked Chancellor grant, a Counselor grant, and
	// another adult's Chancellor grant.
	f.exec(`INSERT INTO role_grants (role, university_id, uid, status) VALUES ('chancellor', $1, $2, 'revoked')`,
		uniThree, uidParent)
	f.exec(`INSERT INTO role_grants (role, university_id, uid, status) VALUES ('chancellor', $1, $2, 'active')`,
		uniFour, uidOther)
	f.grant(uniOne, classOne)

	resp := f.send(http.MethodGet, pathUniversities+"/mine", tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	wantJSONBody(t, resp, `{"universities": [
		{"id": "00000000-0000-4000-8000-000000000002", "title": "MBU", "status": "published",
		 "startDate": "2027-04-10T13:00:00.000Z", "endDate": "2027-04-11T13:00:00.000Z", "classCount": 0},
		{"id": "00000000-0000-4000-8000-000000000001", "title": "MBU", "status": "draft",
		 "startDate": "2027-04-10T13:00:00.000Z", "endDate": null, "classCount": 2}]}`)

	resp = f.send(http.MethodGet, pathUniversities+"/mine", tokenSuperAdmin, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	wantJSONBody(t, resp, `{"universities": []}`)
}

func TestUniversityDetail_ReturnsTheUniversityPeriodsAndClasses(t *testing.T) {
	f := newUsersFixture(t)
	f.university(uniOne, statusRejected)
	f.scheduleFixture()
	f.grant(uniOne, "")

	want := `{
		"university": {
			"id": "00000000-0000-4000-8000-000000000001", "title": "MBU", "status": "rejected",
			"timezone": "America/New_York", "startDate": "2027-04-10T13:00:00.000Z", "endDate": null,
			"registrationOpensAt": null, "registrationClosesAt": "2027-04-01T00:00:00.000Z",
			"location": {"name": "HS", "address": "1 Main", "city": "Town", "state": "VA", "zip": "22000"},
			"periods": ` + periodsJSON + `,
			"createdByUid": "uid-parent", "reviewNote": "no", "submittedAt": null,
			"createdAt": "", "updatedAt": ""},
		"classes": [
			{"classId": "00000000-0000-4000-8000-0000000000c1", "badgeSlug": "camping", "badgeTitle": "Camping",
			 "eagleRequired": true, "periodIds": ["00000000-0000-4000-8000-0000000000e2", "00000000-0000-4000-8000-0000000000e1"],
			 "capacity": 2, "enrolledCount": 2, "waitlistCount": 1, "room": "Room 1", "notes": "Bring a tent",
			 "counselors": [{"uid": "uid-parent", "displayName": "Pat Parent", "bsaId": "BSA-1",
				"disclaimerAcceptedAt": "2027-03-01T00:00:00.000Z", "disclaimerVersion": "2026-07-03"}],
			 "createdAt": "2027-03-01T00:00:00.000Z", "updatedAt": "2027-03-02T00:00:00.000Z"},
			{"classId": "00000000-0000-4000-8000-0000000000c2", "badgeSlug": "archery", "badgeTitle": "Archery",
			 "eagleRequired": false, "periodIds": ["00000000-0000-4000-8000-0000000000e1"],
			 "capacity": 5, "enrolledCount": 0, "waitlistCount": 0, "room": null, "notes": null, "counselors": [],
			 "createdAt": "2027-03-03T00:00:00.000Z", "updatedAt": "2027-03-03T00:00:00.000Z"}
		]}`
	for _, token := range []string{tokenParent, tokenSuperAdmin} {
		resp := f.send(http.MethodGet, pathUniversity(uniOne), token, "")
		wantStatus(t, resp, http.StatusOK)
		got := decode[map[string]any](t, resp)
		_ = resp.Body.Close()
		// The fixture's row timestamps come from the database clock.
		u := got["university"].(map[string]any)
		u["createdAt"], u["updatedAt"] = "", ""
		wantSameJSON(t, got, parseJSON(t, want))
	}
}

// patchFixture is a draft University one of the Parent, its Chancellor.
func patchFixture(t *testing.T) *usersFixture {
	t.Helper()
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	f.university(uniOne, statusDraft)
	f.grant(uniOne, "")
	return f
}

func TestPatchUniversity_ChangesOnlyTheNamedFields(t *testing.T) {
	f := patchFixture(t)
	f.exec(`UPDATE universities SET end_date = '2027-04-11T13:00:00Z', registration_opens_at = '2027-03-01T00:00:00Z'
		WHERE id = $1`, uniOne)

	resp := f.send(http.MethodPatch, pathUniversity(uniOne), tokenParent, `{"title":" Renamed MBU ","timezone":"America/Chicago",
		"startDate":"2027-04-10T14:00:00+01:00","endDate":null,"registrationClosesAt":"2027-04-02T00:00:00Z",
		"location":{"name":"Gym","address":"2 Elm","city":"Ville","state":"MD","zip":"21000"}}`)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	got := decode[map[string]any](t, resp)
	delete(got, "createdAt")
	wantSameJSON(t, got, parseJSON(t, `{
		"id": "00000000-0000-4000-8000-000000000001", "title": "Renamed MBU", "status": "draft",
		"timezone": "America/Chicago", "startDate": "2027-04-10T13:00:00.000Z", "endDate": null,
		"registrationOpensAt": "2027-03-01T00:00:00.000Z", "registrationClosesAt": "2027-04-02T00:00:00.000Z",
		"location": {"name": "Gym", "address": "2 Elm", "city": "Ville", "state": "MD", "zip": "21000"},
		"createdByUid": "uid-parent", "reviewNote": null, "submittedAt": null, "updatedAt": "2027-03-06T09:00:00.000Z"}`))

	// An empty patch changes nothing but updatedAt.
	f.now = testNow.Add(time.Minute)
	resp = f.send(http.MethodPatch, pathUniversity(uniOne), tokenParent, `{}`)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	if got := decode[map[string]any](t, resp); got["title"] != "Renamed MBU" || got["updatedAt"] != "2027-03-06T09:01:00.000Z" {
		t.Fatalf("body = %v, want the same University with a new updatedAt", got)
	}
}

func TestPatchUniversity_ARejectedUniversityMayChange(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	f.university(uniOne, statusRejected)

	resp := f.send(http.MethodPatch, pathUniversity(uniOne), tokenSuperAdmin, `{"title":"Fixed"}`)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	if got := decode[map[string]any](t, resp); got["title"] != "Fixed" || got["status"] != statusRejected {
		t.Fatalf("body = %v, want the rejected University renamed", got)
	}
}

func TestPatchUniversity_OnlyADraftOrRejectedUniversity(t *testing.T) {
	for _, status := range []string{statusSubmitted, statusPublished, statusClosed} {
		t.Run(status, func(t *testing.T) {
			f := newUsersFixture(t)
			f.user(uidParent, emailParent)
			f.university(uniOne, status)
			f.grant(uniOne, "")

			resp := f.send(http.MethodPatch, pathUniversity(uniOne), tokenParent, `{"title":"Renamed"}`)
			defer resp.Body.Close()
			wantRefusal(t, resp, http.StatusConflict, apierr.CodeConflict)
			if n := f.count(`SELECT count(*) FROM universities WHERE title = 'MBU'`); n != 1 {
				t.Fatal("the refused patch changed the University")
			}
		})
	}
}

func TestPatchUniversity_RefusesABadFieldOrABadOrderWithTheStoredDates(t *testing.T) {
	f := patchFixture(t)
	tests := []struct {
		name string
		body string
		want map[string]string
	}{
		{"a bad field", `{"title":"","timezone":"Nowhere","registrationClosesAt":null,"location":{}}`, map[string]string{
			keyTitle: msgWantTitle, keyTimezone: msgWantTimezone, keyClosesAt: msgWantCloses,
			"location.name": "Enter the location name.", "location.address": "Enter the location address.",
			"location.city": "Enter the location city.", "location.state": "Enter the location state.",
			"location.zip": "Enter the location zip.",
		}},
		{"an end date before the stored start date", `{"endDate":"2027-04-09T00:00:00Z"}`,
			map[string]string{keyEndDate: "Enter an end date on or after the start date."}},
		{"an open time after the stored close time", `{"registrationOpensAt":"2027-04-01T00:00:01Z"}`,
			map[string]string{keyOpensAt: "Enter a registration open time before the registration close time."}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := f.send(http.MethodPatch, pathUniversity(uniOne), tokenParent, tt.body)
			defer resp.Body.Close()
			got := wantRefusal(t, resp, http.StatusBadRequest, apierr.CodeInvalidArgument)
			wantSameJSON(t, got.Details, tt.want)
		})
	}
	if n := f.count(`SELECT count(*) FROM universities WHERE end_date IS NULL AND registration_opens_at IS NULL
		AND title = 'MBU'`); n != 1 {
		t.Fatal("a refused patch changed the University")
	}
}

func TestDeleteUniversity_DeletesADraftWithAllItHolds(t *testing.T) {
	f := newUsersFixture(t)
	f.university(uniOne, statusDraft)
	f.scheduleFixture()
	f.grant(uniOne, "")
	f.grant(uniOne, classOne)

	resp := f.send(http.MethodDelete, pathUniversity(uniOne), tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusNoContent)
	for _, table := range []string{"universities", "periods", "classes", "class_periods", "class_counselors",
		"role_grants", "registrations"} {
		if n := f.count(`SELECT count(*) FROM ` + table); n != 0 {
			t.Errorf("%s rows = %d, want 0", table, n)
		}
	}
	if n := f.count(`SELECT count(*) FROM scouts`); n != 3 {
		t.Fatalf("scouts = %d, want the Scouts kept", n)
	}
}

func TestDeleteUniversity_OnlyADraft(t *testing.T) {
	for _, status := range []string{statusSubmitted, statusPublished, statusClosed, statusRejected} {
		t.Run(status, func(t *testing.T) {
			f := newUsersFixture(t)
			f.user(uidParent, emailParent)
			f.university(uniOne, status)

			resp := f.send(http.MethodDelete, pathUniversity(uniOne), tokenSuperAdmin, "")
			defer resp.Body.Close()
			wantRefusal(t, resp, http.StatusConflict, apierr.CodeConflict)
			if n := f.count(`SELECT count(*) FROM universities`); n != 1 {
				t.Fatal("the refused delete removed the University")
			}
		})
	}
}

// The University Statuses a fixture sets.
const (
	statusDraft     = "draft"
	statusSubmitted = "submitted"
	statusPublished = "published"
	statusRejected  = "rejected"
	statusClosed    = "closed"
)

// msgNotBootstrapped is the 404 message of a write before the session
// bootstrap.
const msgNotBootstrapped = "User not found; bootstrap the session first"

// periodsJSON is the Periods of scheduleFixture, in position order.
const periodsJSON = `[
	{"periodId": "00000000-0000-4000-8000-0000000000e2", "label": "Early",
	 "startsAt": "2027-04-10T11:00:00.000Z", "endsAt": "2027-04-10T12:00:00.000Z"},
	{"periodId": "00000000-0000-4000-8000-0000000000e1", "label": "Morning",
	 "startsAt": "2027-04-10T13:00:00.000Z", "endsAt": "2027-04-10T15:00:00.000Z"}]`

// parseJSON reads a JSON literal of a test.
func parseJSON(t *testing.T, s string) any {
	t.Helper()
	var v any
	if err := json.Unmarshal([]byte(s), &v); err != nil {
		t.Fatalf("parse %s: %v", s, err)
	}
	return v
}

// wantJSONBody fails unless the body of resp is the JSON want, key for
// key: a key that is missing, extra or not null where null is wanted
// fails.
func wantJSONBody(t *testing.T, resp *http.Response, want string) {
	t.Helper()
	wantSameJSON(t, decode[any](t, resp), parseJSON(t, want))
}

// wantNoStore fails unless resp is marked Cache-Control: no-store.
func wantNoStore(t *testing.T, resp *http.Response) {
	t.Helper()
	if got := resp.Header.Get("Cache-Control"); got != "no-store" {
		t.Fatalf("Cache-Control = %q, want no-store", got)
	}
}

// The details keys of the date fields.
const (
	keyTitle     = "title"
	keyTimezone  = "timezone"
	keyStartDate = "startDate"
	keyEndDate   = "endDate"
	keyOpensAt   = "registrationOpensAt"
	keyClosesAt  = "registrationClosesAt"
)
