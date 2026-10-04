package main

import (
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"

	"mbu/api/internal/apierr"
	"mbu/api/internal/idempotency"
)

const (
	pathRegistrations = "/api/registrations"
	statusEnrolled    = "enrolled"
	statusWaitlisted  = "waitlisted"
	// classThree is a Class of University one with no Period, so it is
	// in a Period Conflict with no other Class.
	classThree = "00000000-0000-4000-8000-0000000000c3"
	// The bodies of a register request.
	registerAmy     = `{"scoutId":"` + scoutAmy + `","acceptConsent":true}`
	registerAmyWait = `{"scoutId":"` + scoutAmy + `","acceptConsent":true,"acceptWaitlist":true}`
)

// pathRegister is the register route of a Class of University one.
func pathRegister(classID string) string {
	return pathRegistrations + "/" + uniOne + "/" + classID
}

// pathCancel is the cancel route of a Scout's Registration in a Class of
// University one.
func pathCancel(classID, scoutID string) string {
	return pathRegister(classID) + "/" + scoutID
}

// seatFixture is a published University one with an open Registration
// Window at testNow. Period two comes first in position order. Class one
// (Camping, Capacity 1) meets in both Periods, Class two (Archery,
// Capacity 5) in Period one, so the two are in a Period Conflict. Class
// three (Cooking, Capacity 5) has no Period. The Parent has Amy and Ben;
// the other Parent has a Scout of their own.
func seatFixture(t *testing.T) *usersFixture {
	t.Helper()
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	f.exec(`UPDATE users SET display_name = 'Pat Parent' WHERE uid = $1`, uidParent)
	f.user(uidOther, "other@example.com")
	f.university(uniOne, statusPublished)
	f.exec(`INSERT INTO periods (id, university_id, label, starts_at, ends_at, position) VALUES
		($1, $3, 'Morning', '2027-04-10T13:00:00Z', '2027-04-10T15:00:00Z', 1),
		($2, $3, 'Early', '2027-04-10T11:00:00Z', '2027-04-10T12:00:00Z', 0)`, periodOne, periodTwo, uniOne)
	f.exec(`INSERT INTO classes (id, university_id, badge_slug, badge_title, eagle_required, capacity) VALUES
		($1, $4, 'camping', 'Camping', true, 1),
		($2, $4, 'archery', 'Archery', false, 5),
		($3, $4, 'cooking', 'Cooking', true, 5)`, classOne, classTwo, classThree, uniOne)
	f.exec(`INSERT INTO class_periods (class_id, period_id, university_id) VALUES ($1, $2, $4), ($1, $3, $4), ($5, $2, $4)`,
		classOne, periodOne, periodTwo, uniOne, classTwo)
	f.exec(`INSERT INTO scouts (id, parent_uid, first_name, last_name, unit, accommodations)
		VALUES ($1, $2, 'Amy', 'Scout', 'Troop 1', 'Peanut allergy')`, scoutAmy, uidParent)
	f.scout(scoutBen, uidParent)
	f.scout(scoutOther, uidOther)
	return f
}

func TestRegister_EnrollsTheScoutWhenASeatIsFree(t *testing.T) {
	f := seatFixture(t)

	resp := f.send(http.MethodPost, pathRegister(classOne), tokenParent, registerAmy)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	wantJSONBody(t, resp, `{"scoutId":"`+scoutAmy+`","classId":"`+classOne+`","universityId":"`+uniOne+`",
		"status":"enrolled","periodIds":["`+periodTwo+`","`+periodOne+`"],"badgeSlug":"camping","badgeTitle":"Camping",
		"waitlistedAt":null,"enrolledAt":"`+testNowISO+`"}`)

	// The Registration holds the consent record and a snapshot of the
	// Scout and the Parent for the Roster.
	if n := f.count(`SELECT count(*) FROM registrations WHERE class_id = $1 AND scout_id = $2
		AND status = 'enrolled' AND enrolled_at = $3 AND waitlisted_at IS NULL
		AND parent_consent_at = $3 AND accepted_policy_version = '2026-07-04'
		AND scout_first_name = 'Amy' AND scout_last_name = 'Scout' AND scout_unit = 'Troop 1'
		AND accommodations = 'Peanut allergy' AND parent_name = 'Pat Parent' AND parent_email = $4
		AND purged_at IS NULL AND created_at = $3 AND updated_at = $3`,
		classOne, scoutAmy, testNow, emailParent); n != 1 {
		t.Fatal("the stored Registration does not match the request")
	}
}

func TestRegister_WaitlistsTheScoutWhenTheClassIsFullAndTheWaitlistIsAccepted(t *testing.T) {
	f := seatFixture(t)
	f.registration(classOne, scoutBen, statusEnrolled, testNow.Add(-time.Hour))

	resp := f.send(http.MethodPost, pathRegister(classOne), tokenParent, registerAmyWait)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	wantJSONBody(t, resp, `{"scoutId":"`+scoutAmy+`","classId":"`+classOne+`","universityId":"`+uniOne+`",
		"status":"waitlisted","periodIds":["`+periodTwo+`","`+periodOne+`"],"badgeSlug":"camping","badgeTitle":"Camping",
		"waitlistedAt":"`+testNowISO+`","enrolledAt":null}`)
}

func TestRegister_AFullClassIsAConflictWithoutTheWaitlist(t *testing.T) {
	f := seatFixture(t)
	f.registration(classOne, scoutBen, statusEnrolled, testNow.Add(-time.Hour))

	resp := f.send(http.MethodPost, pathRegister(classOne), tokenParent, registerAmy)
	defer resp.Body.Close()
	got := wantRefusal(t, resp, http.StatusConflict, apierr.CodeClassFull)
	if got.Message != "This class is full" || got.Details != nil {
		t.Fatalf("body = %+v", got)
	}
	if n := f.count(`SELECT count(*) FROM registrations WHERE scout_id = $1`, scoutAmy); n != 0 {
		t.Fatalf("registrations of Amy = %d, want 0", n)
	}
}

func TestRegister_RefusesWithoutParentalConsent(t *testing.T) {
	f := seatFixture(t)
	resp := f.send(http.MethodPost, pathRegister(classOne), tokenParent,
		`{"scoutId":"`+scoutAmy+`","acceptConsent":false}`)
	defer resp.Body.Close()
	wantRefusal(t, resp, http.StatusForbidden, apierr.CodeConsentRequired)
	if n := f.count(`SELECT count(*) FROM registrations`); n != 0 {
		t.Fatalf("registrations = %d, want 0", n)
	}
}

// The period-conflict query of firestore/queries.test.ts (case 6): an
// active Registration of the Scout in another Class that shares a Period.
func TestRegister_APeriodConflictNamesEachConflictingClass(t *testing.T) {
	f := seatFixture(t)
	f.registration(classOne, scoutAmy, statusEnrolled, testNow.Add(-time.Hour))

	resp := f.send(http.MethodPost, pathRegister(classTwo), tokenParent, registerAmy)
	defer resp.Body.Close()
	got := wantRefusal(t, resp, http.StatusConflict, apierr.CodePeriodConflict)
	wantSameJSON(t, got.Details, map[string]string{classOne: badgeCamping})
	if got.Message != "This scout is already registered for an overlapping period" {
		t.Fatalf("message = %q", got.Message)
	}
}

func TestRegister_ACancelledOrNonOverlappingRegistrationIsNoConflict(t *testing.T) {
	f := seatFixture(t)
	f.registration(classOne, scoutAmy, "cancelled", testNow.Add(-time.Hour))
	f.registration(classThree, scoutAmy, statusEnrolled, testNow.Add(-time.Hour))
	// Another Scout of the same Parent in Class one does not hold Amy.
	f.registration(classOne, scoutBen, statusEnrolled, testNow.Add(-time.Hour))

	resp := f.send(http.MethodPost, pathRegister(classTwo), tokenParent, registerAmy)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
}

func TestRegister_AnActiveRegistrationComesBackUnchanged(t *testing.T) {
	f := seatFixture(t)
	earlier := testNow.Add(-time.Hour)
	f.registration(classOne, scoutAmy, statusWaitlisted, earlier)

	// Consent is not checked again for a Registration that is active.
	resp := f.send(http.MethodPost, pathRegister(classOne), tokenParent, `{"scoutId":"`+scoutAmy+`","acceptConsent":false}`)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	got := decode[map[string]any](t, resp)
	if got["status"] != statusWaitlisted || got["waitlistedAt"] != "2027-03-06T08:00:00.000Z" {
		t.Fatalf("body = %v, want the stored waitlisted Registration", got)
	}
	if n := f.count(`SELECT count(*) FROM registrations WHERE updated_at = $1`, testNow); n != 0 {
		t.Fatal("an active Registration was written again")
	}
}

func TestRegister_AfterACancelUpdatesTheSameRowAndKeepsItsCreatedAt(t *testing.T) {
	f := seatFixture(t)
	created := testNow.Add(-48 * time.Hour)
	f.registration(classOne, scoutAmy, "cancelled", created)
	f.exec(`UPDATE registrations SET waitlisted_at = $1, created_at = $1, scout_first_name = 'Old' WHERE scout_id = $2`,
		created, scoutAmy)

	resp := f.send(http.MethodPost, pathRegister(classOne), tokenParent, registerAmy)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	if n := f.count(`SELECT count(*) FROM registrations WHERE class_id = $1 AND scout_id = $2
		AND status = 'enrolled' AND enrolled_at = $3 AND waitlisted_at IS NULL AND created_at = $4
		AND updated_at = $3 AND scout_first_name = 'Amy'`, classOne, scoutAmy, testNow, created); n != 1 {
		t.Fatal("the cancelled row was not updated in place with a fresh snapshot")
	}
}

func TestRegister_AParentWithNoDisplayNameIsNamedByEmail(t *testing.T) {
	f := seatFixture(t)
	f.exec(`UPDATE users SET display_name = '' WHERE uid = $1`, uidParent)

	resp := f.send(http.MethodPost, pathRegister(classOne), tokenParent, registerAmy)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	if n := f.count(`SELECT count(*) FROM registrations WHERE parent_name = $1 AND parent_email = $1`, emailParent); n != 1 {
		t.Fatal("parent_name is not the email")
	}
}

// The Registration Window tests move the request clock, never sleep.
func TestRegister_HoldsTheRegistrationWindow(t *testing.T) {
	tests := []struct {
		name   string
		status string
		opens  any
		now    time.Time
		code   apierr.Code
	}{
		{"a University that is not published", statusDraft, nil, testNow, apierr.CodeEventNotOpen},
		{"a closed University", statusClosed, nil, testNow, apierr.CodeEventNotOpen},
		{"before the window opens", statusPublished, testNow.Add(time.Second), testNow, apierr.CodeRegistrationNotOpen},
		{"after the window closes", statusPublished, nil, time.Date(2027, time.April, 1, 0, 0, 1, 0, time.UTC),
			apierr.CodeRegistrationClosed},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := seatFixture(t)
			f.exec(`UPDATE universities SET status = $2, registration_opens_at = $3,
				published_at = CASE WHEN $2 IN ('published', 'closed') THEN published_at END,
				closed_at = CASE WHEN $2 = 'closed' THEN $4::timestamptz END WHERE id = $1`,
				uniOne, tt.status, tt.opens, testNow)
			f.now = tt.now
			resp := f.send(http.MethodPost, pathRegister(classOne), tokenParent, registerAmy)
			defer resp.Body.Close()
			wantRefusal(t, resp, http.StatusForbidden, tt.code)
		})
	}
}

func TestRegister_TheWindowEdgesAreOpen(t *testing.T) {
	for _, now := range []time.Time{testNow, time.Date(2027, time.April, 1, 0, 0, 0, 0, time.UTC)} {
		f := seatFixture(t)
		f.exec(`UPDATE universities SET registration_opens_at = $2 WHERE id = $1`, uniOne, testNow)
		f.now = now
		resp := f.send(http.MethodPost, pathRegister(classOne), tokenParent, registerAmy)
		wantStatus(t, resp, http.StatusOK)
		_ = resp.Body.Close()
	}
}

// A Chancellor of the University and a Super-admin run the event: the
// window and the status gate do not hold them.
func TestRegister_AChancellorOrASuperAdminSkipsTheWindow(t *testing.T) {
	f := seatFixture(t)
	f.exec(`UPDATE universities SET status = 'draft', published_at = NULL WHERE id = $1`, uniOne)
	f.now = time.Date(2027, time.May, 1, 0, 0, 0, 0, time.UTC)
	f.grant(uniOne, "")
	resp := f.send(http.MethodPost, pathRegister(classOne), tokenParent, registerAmy)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)

	f.user("uid-admin", emailAdmin)
	f.scout(scoutOther2, "uid-admin")
	resp = f.send(http.MethodPost, pathRegister(classThree), tokenSuperAdmin,
		`{"scoutId":"`+scoutOther2+`","acceptConsent":true}`)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
}

// The refusals come in the TypeScript order, not in the lock order.
func TestRegister_RefusesAMissingUniversityClassOrScoutInTheTypeScriptOrder(t *testing.T) {
	tests := []struct {
		name, path, body string
		status           int
		code             apierr.Code
		message          string
	}{
		{"a missing University before another Parent's Scout",
			pathRegistrations + "/" + uniMissing + "/" + classOne, `{"scoutId":"` + scoutOther + `","acceptConsent":true}`,
			http.StatusNotFound, apierr.CodeNotFound, msgUniversityNotFound},
		{"a University id that is not a uuid",
			pathRegistrations + "/" + notAUUID + "/" + classOne, registerAmy,
			http.StatusNotFound, apierr.CodeNotFound, msgUniversityNotFound},
		{"another Parent's Scout before a missing Class",
			pathRegister(uniMissing), `{"scoutId":"` + scoutOther + `","acceptConsent":true}`,
			http.StatusForbidden, apierr.CodeForbidden, msgNotYourScout},
		{"a Scout id that is not a uuid",
			pathRegister(classOne), `{"scoutId":"amy","acceptConsent":true}`,
			http.StatusForbidden, apierr.CodeForbidden, msgNotYourScout},
		{"a missing Class before missing consent",
			pathRegister(uniMissing), `{"scoutId":"` + scoutAmy + `","acceptConsent":false}`,
			http.StatusNotFound, apierr.CodeNotFound, msgClassNotFound},
		{"a Class id that is not a uuid",
			pathRegister("cls1"), registerAmy, http.StatusNotFound, apierr.CodeNotFound, msgClassNotFound},
		{"a Class of another University",
			pathRegistrations + "/" + uniTwo + "/" + classOne, registerAmy,
			http.StatusNotFound, apierr.CodeNotFound, msgClassNotFound},
	}
	f := seatFixture(t)
	f.university(uniTwo, statusPublished)
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := f.send(http.MethodPost, tt.path, tokenParent, tt.body)
			defer resp.Body.Close()
			got := wantRefusal(t, resp, tt.status, tt.code)
			if got.Message != tt.message {
				t.Fatalf("message = %q, want %q", got.Message, tt.message)
			}
		})
	}
	if n := f.count(`SELECT count(*) FROM registrations`); n != 0 {
		t.Fatalf("registrations = %d, want 0", n)
	}
}

func TestRegister_RefusesABodyThatFailsTheSchema(t *testing.T) {
	tests := []struct {
		body string
		keys []string
	}{
		{`{"scoutId":"` + scoutAmy + `"}`, []string{fieldAcceptConsent}},
		{`{}`, []string{fieldAcceptConsent, fieldScoutID}},
		{`{"scoutId":"","acceptConsent":"yes","acceptWaitlist":1}`, []string{fieldAcceptConsent, "acceptWaitlist", fieldScoutID}},
		{`{"scoutId":7,"acceptConsent":true,"acceptWaitlist":null}`, []string{fieldScoutID}},
	}
	f := seatFixture(t)
	for _, tt := range tests {
		resp := f.send(http.MethodPost, pathRegister(classOne), tokenParent, tt.body)
		got := wantRefusal(t, resp, http.StatusBadRequest, apierr.CodeInvalidArgument)
		_ = resp.Body.Close()
		wantDetails(t, got, tt.keys)
	}
	resp := f.send(http.MethodPost, pathRegister(classOne), tokenParent, `{not json`)
	defer resp.Body.Close()
	wantRefusal(t, resp, http.StatusBadRequest, apierr.CodeInvalidArgument)
}

func TestRegister_ARepeatWithTheSameKeyRegistersOnceAndAnswersTheSame(t *testing.T) {
	f := seatFixture(t)
	var bodies []string
	for range 2 {
		req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, pathRegister(classOne), strings.NewReader(registerAmy))
		authenticate(t, req, f.db.App, f.now, tokenParent)
		req.Header.Set(idempotency.HeaderName, "register-amy")
		rec := httptest.NewRecorder()
		f.h.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200", rec.Code)
		}
		bodies = append(bodies, rec.Body.String())
		// Between the two, the seat goes back. A second run of the
		// handler would enroll Amy again; a replay changes nothing.
		f.exec(`UPDATE registrations SET status = 'cancelled'`)
		f.now = testNow.Add(time.Minute)
	}
	if bodies[0] != bodies[1] {
		t.Fatalf("bodies = %v, want the replay of the first", bodies)
	}
	if n := f.count(`SELECT count(*) FROM registrations WHERE status = 'cancelled' AND updated_at = $1`, testNow); n != 1 {
		t.Fatal("the repeat ran the register again, want a replay")
	}
}

// The waitlist query of firestore/queries.test.ts (case 5): the oldest
// waitlisted Registration takes the freed seat, and only one does.
func TestCancel_PromotesTheOldestWaitlistedScout(t *testing.T) {
	f := seatFixture(t)
	f.scout(scoutOther2, uidOther)
	f.registration(classOne, scoutAmy, statusEnrolled, testNow.Add(-3*time.Hour))
	f.registration(classOne, scoutOther2, statusWaitlisted, testNow.Add(-time.Hour))
	f.registration(classOne, scoutOther, statusWaitlisted, testNow.Add(-2*time.Hour))

	resp := f.send(http.MethodDelete, pathCancel(classOne, scoutAmy), tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusNoContent)

	if n := f.count(`SELECT count(*) FROM registrations WHERE scout_id = $1 AND status = 'cancelled'
		AND updated_at = $2 AND enrolled_at IS NOT NULL`, scoutAmy, testNow); n != 1 {
		t.Fatal("Amy's Registration is not a soft-cancelled row")
	}
	if n := f.count(`SELECT count(*) FROM registrations WHERE scout_id = $1 AND status = 'enrolled'
		AND enrolled_at = $2 AND waitlisted_at IS NULL AND updated_at = $2`, scoutOther, testNow); n != 1 {
		t.Fatal("the oldest waitlisted Scout did not take the seat")
	}
	if n := f.count(`SELECT count(*) FROM registrations WHERE status = 'waitlisted'`); n != 1 {
		t.Fatalf("waitlisted = %d, want the younger one still waiting", n)
	}
}

func TestCancel_AWaitlistedRegistrationFreesNoSeat(t *testing.T) {
	f := seatFixture(t)
	f.registration(classOne, scoutOther, statusEnrolled, testNow.Add(-3*time.Hour))
	f.registration(classOne, scoutAmy, statusWaitlisted, testNow.Add(-2*time.Hour))
	f.registration(classOne, scoutBen, statusWaitlisted, testNow.Add(-time.Hour))

	resp := f.send(http.MethodDelete, pathCancel(classOne, scoutAmy), tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusNoContent)
	if n := f.count(`SELECT count(*) FROM registrations WHERE scout_id = $1 AND status = 'waitlisted'`, scoutBen); n != 1 {
		t.Fatal("a waitlisted cancel promoted Ben")
	}
}

func TestCancel_AfterTheCloseOnlyAChancellorOrASuperAdmin(t *testing.T) {
	f := seatFixture(t)
	f.registration(classOne, scoutAmy, statusEnrolled, testNow)
	f.registration(classThree, scoutAmy, statusEnrolled, testNow)
	f.now = time.Date(2027, time.April, 1, 0, 0, 1, 0, time.UTC)

	resp := f.send(http.MethodDelete, pathCancel(classOne, scoutAmy), tokenParent, "")
	defer resp.Body.Close()
	wantRefusal(t, resp, http.StatusForbidden, apierr.CodeRegistrationClosed)

	f.grant(uniOne, "")
	resp = f.send(http.MethodDelete, pathCancel(classOne, scoutAmy), tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusNoContent)

	// A Super-admin skips the close, but Scout ownership has no bypass.
	resp = f.send(http.MethodDelete, pathCancel(classThree, scoutAmy), tokenSuperAdmin, "")
	defer resp.Body.Close()
	wantRefusal(t, resp, http.StatusForbidden, apierr.CodeForbidden)
}

// A cancel needs only the close: a draft University or a window that has
// not opened does not stop it, as in the TypeScript.
func TestCancel_IgnoresTheStatusAndTheOpenTime(t *testing.T) {
	f := seatFixture(t)
	f.exec(`UPDATE universities SET status = 'draft', published_at = NULL, registration_opens_at = $2 WHERE id = $1`,
		uniOne, testNow.Add(time.Hour))
	f.registration(classOne, scoutAmy, statusEnrolled, testNow)
	resp := f.send(http.MethodDelete, pathCancel(classOne, scoutAmy), tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusNoContent)
}

func TestCancel_RefusesInTheTypeScriptOrder(t *testing.T) {
	tests := []struct {
		name, path string
		status     int
		code       apierr.Code
		message    string
	}{
		{"a missing University", pathRegistrations + "/" + uniMissing + "/" + classOne + "/" + scoutOther,
			http.StatusNotFound, apierr.CodeNotFound, msgUniversityNotFound},
		{"another Parent's Scout", pathCancel(classOne, scoutOther),
			http.StatusForbidden, apierr.CodeForbidden, msgNotYourScout},
		{"a Scout id that is not a uuid", pathCancel(classOne, "amy"),
			http.StatusForbidden, apierr.CodeForbidden, msgNotYourScout},
		{"no Registration", pathCancel(classTwo, scoutAmy), http.StatusNotFound, apierr.CodeNotFound, msgRegistrationNotFound},
		{"a cancelled Registration", pathCancel(classOne, scoutBen),
			http.StatusNotFound, apierr.CodeNotFound, msgRegistrationNotFound},
		{"a Class id that is not a uuid", pathCancel("cls1", scoutAmy),
			http.StatusNotFound, apierr.CodeNotFound, msgRegistrationNotFound},
		{"a Class of another University", pathRegistrations + "/" + uniTwo + "/" + classOne + "/" + scoutAmy,
			http.StatusNotFound, apierr.CodeNotFound, msgRegistrationNotFound},
	}
	f := seatFixture(t)
	f.university(uniTwo, statusPublished)
	f.registration(classOne, scoutAmy, statusEnrolled, testNow)
	f.registration(classOne, scoutBen, "cancelled", testNow)
	f.registration(classOne, scoutOther, statusWaitlisted, testNow)
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := f.send(http.MethodDelete, tt.path, tokenParent, "")
			defer resp.Body.Close()
			got := wantRefusal(t, resp, tt.status, tt.code)
			if got.Message != tt.message {
				t.Fatalf("message = %q, want %q", got.Message, tt.message)
			}
		})
	}
	if n := f.count(`SELECT count(*) FROM registrations WHERE status = 'enrolled' AND scout_id = $1`, scoutAmy); n != 1 {
		t.Fatal("a refused cancel changed Amy's Registration")
	}
}

// The messages and field names the refusals carry.
const (
	msgRegistrationNotFound = "Registration not found"
	msgNotYourScout         = "You do not have access to this scout"
	msgClassNotFound        = "Class not found"
	fieldScoutID            = "scoutId"
	fieldAcceptConsent      = "acceptConsent"
	badgeCamping            = "Camping"
)

func TestSchedule_StartsEmpty(t *testing.T) {
	f := seatFixture(t)
	for _, uni := range []string{uniOne, uniMissing, notAUUID} {
		resp := f.send(http.MethodGet, pathRegistrations+"/"+uni, tokenParent, "")
		wantStatus(t, resp, http.StatusOK)
		wantJSONBody(t, resp, `{"registrations":[]}`)
		_ = resp.Body.Close()
	}
}

// The parent-schedule query of firestore/queries.test.ts (case 7): the
// enrolled and waitlisted Registrations of every Scout of the caller at
// the University, oldest first; a cancelled one, another Parent's and
// another University's are left out.
func TestSchedule_TheCallersActiveRegistrationsAtTheUniversity(t *testing.T) {
	f := seatFixture(t)
	f.university(uniTwo, statusPublished)
	f.exec(`INSERT INTO classes (id, university_id, badge_slug, badge_title, eagle_required, capacity)
		VALUES ('00000000-0000-4000-8000-0000000000c4', $1, 'camping', 'Camping', true, 5)`, uniTwo)
	f.registration(classTwo, scoutAmy, statusEnrolled, testNow.Add(-2*time.Hour))
	f.registration(classOne, scoutBen, statusWaitlisted, testNow.Add(-time.Hour))
	f.registration(classThree, scoutBen, "cancelled", testNow.Add(-time.Hour))
	f.registration(classThree, scoutOther, statusEnrolled, testNow.Add(-time.Hour))
	f.registration("00000000-0000-4000-8000-0000000000c4", scoutAmy, statusEnrolled, testNow)
	f.exec(`UPDATE registrations SET created_at = coalesce(enrolled_at, waitlisted_at)`)

	resp := f.send(http.MethodGet, pathRegistrations+"/"+uniOne, tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	wantJSONBody(t, resp, `{"registrations":[
		{"scoutId":"`+scoutAmy+`","classId":"`+classTwo+`","universityId":"`+uniOne+`","status":"enrolled",
		 "periodIds":["`+periodOne+`"],"badgeSlug":"archery","badgeTitle":"Archery",
		 "waitlistedAt":null,"enrolledAt":"2027-03-06T07:00:00.000Z"},
		{"scoutId":"`+scoutBen+`","classId":"`+classOne+`","universityId":"`+uniOne+`","status":"waitlisted",
		 "periodIds":["`+periodTwo+`","`+periodOne+`"],"badgeSlug":"camping","badgeTitle":"Camping",
		 "waitlistedAt":"2027-03-06T08:00:00.000Z","enrolledAt":null}]}`)
}

// registrationsRoutes is each Registration route, with a body that
// passes its checks.
var registrationsRoutes = []struct{ method, path, body string }{
	{http.MethodPost, pathRegister(classOne), registerAmy},
	{http.MethodDelete, pathCancel(classOne, scoutAmy), ""},
	{http.MethodGet, pathRegistrations + "/" + uniOne, ""},
	{http.MethodGet, pathRoster(uniOne), ""},
}

func TestRegistrationsRoutes_RefuseAMissingAndAnInvalidSession(t *testing.T) {
	f := seatFixture(t)
	for _, r := range registrationsRoutes {
		t.Run(r.method+" "+r.path, func(t *testing.T) {
			resp := f.send(r.method, r.path, "", r.body)
			defer resp.Body.Close()
			wantRefusal(t, resp, http.StatusUnauthorized, apierr.CodeUnauthorized)

			resp = f.send(r.method, r.path, tokenNoSession, r.body)
			defer resp.Body.Close()
			wantRefusal(t, resp, http.StatusUnauthorized, apierr.CodeUnauthorized)
		})
	}
	if n := f.count(`SELECT count(*) FROM registrations`); n != 0 {
		t.Fatalf("registrations = %d, want 0", n)
	}
}

func TestRegistrationsRoutes_ADatabaseFailureIsInternal(t *testing.T) {
	d := testDeps()
	f := closedFixture(t, d)
	for _, r := range registrationsRoutes {
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

// tickingClock makes the fixture's clock move one millisecond forward on
// each read, so two seat changes never share a time (docs/data-model.md,
// "Cancel and promote").
func (f *usersFixture) tickingClock() {
	var tick atomic.Int64
	d := testDeps()
	d.DB = f.db.App
	d.Mail = f.mail
	d.Now = func() time.Time { return testNow.Add(time.Duration(tick.Add(1)) * time.Millisecond) }
	f.h = routes(d)
}

// sendAll sends the requests in parallel as the Parent and returns each
// status, in the order of the requests.
func (f *usersFixture) sendAll(method string, paths, bodies []string) []int {
	return f.sendAllAs(tokenParent, method, paths, bodies)
}

// sendAllAs is sendAll as another caller. Each request is signed in
// before the first one goes, so they still race each other.
func (f *usersFixture) sendAllAs(token, method string, paths, bodies []string) []int {
	statuses := make([]int, len(paths))
	reqs := make([]*http.Request, len(paths))
	for i := range paths {
		reqs[i] = httptest.NewRequestWithContext(f.t.Context(), method, paths[i], strings.NewReader(bodies[i]))
		authenticate(f.t, reqs[i], f.db.App, f.now, token)
	}
	var wg sync.WaitGroup
	for i, req := range reqs {
		wg.Go(func() {
			rec := httptest.NewRecorder()
			f.h.ServeHTTP(rec, req)
			statuses[i] = rec.Code
		})
	}
	wg.Wait()
	return statuses
}

func TestRegister_ParallelScoutsForOneSeatEnrollOneAndWaitlistTheRestInOrder(t *testing.T) {
	const n = 12
	f := seatFixture(t)
	f.tickingClock()
	paths, bodies := make([]string, n), make([]string, n)
	for i := range n {
		id := uuid.NewString()
		f.scout(id, uidParent)
		paths[i] = pathRegister(classOne)
		bodies[i] = `{"scoutId":"` + id + `","acceptConsent":true,"acceptWaitlist":true}`
	}

	for i, status := range f.sendAll(http.MethodPost, paths, bodies) {
		if status != http.StatusOK {
			t.Fatalf("request %d: status = %d, want 200", i, status)
		}
	}
	if got := f.count(`SELECT count(*) FROM registrations WHERE class_id = $1 AND status = 'enrolled'`, classOne); got != 1 {
		t.Fatalf("enrolled = %d, want 1", got)
	}
	if got := f.count(`SELECT count(*) FROM registrations WHERE class_id = $1 AND status = 'waitlisted'`, classOne); got != n-1 {
		t.Fatalf("waitlisted = %d, want %d", got, n-1)
	}
	// Each Registration read the clock inside the Class lock, so the
	// times are all different and the enrolled one is the first.
	if got := f.count(`SELECT count(DISTINCT coalesce(enrolled_at, waitlisted_at)) FROM registrations`); got != n {
		t.Fatalf("distinct seat times = %d, want %d: the Waitlist order is not strict", got, n)
	}
	if got := f.count(`SELECT count(*) FROM registrations e, registrations w
		WHERE e.status = 'enrolled' AND w.status = 'waitlisted' AND w.waitlisted_at < e.enrolled_at`); got != 0 {
		t.Fatalf("%d waitlisted Registrations are older than the enrolled one", got)
	}
}

func TestRegister_OneScoutInParallelForTwoOverlappingClassesGetsOne(t *testing.T) {
	f := seatFixture(t)
	f.tickingClock()
	statuses := f.sendAll(http.MethodPost,
		[]string{pathRegister(classOne), pathRegister(classTwo)}, []string{registerAmy, registerAmy})

	slices.Sort(statuses)
	if !slices.Equal(statuses, []int{http.StatusOK, http.StatusConflict}) {
		t.Fatalf("statuses = %v, want one 200 and one 409", statuses)
	}
	if got := f.count(`SELECT count(*) FROM registrations WHERE scout_id = $1`, scoutAmy); got != 1 {
		t.Fatalf("registrations of Amy = %d, want 1", got)
	}
}
