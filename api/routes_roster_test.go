package main

import (
	"net/http"
	"testing"
	"time"

	"mbu/api/internal/apierr"
)

// The ports of functions/src/registrations-api/routes/list-roster.test.ts
// (#255), against a real database.

const (
	uidCounselor = "uid-counselor"
	// The Scouts of the Roster fixture, all of the other Parent.
	scoutAdamsAl  = "00000000-0000-4000-8000-0000000000d1"
	scoutAdamsBen = "00000000-0000-4000-8000-0000000000d2"
	scoutCruz     = "00000000-0000-4000-8000-0000000000d3"
	scoutEvora    = "00000000-0000-4000-8000-0000000000d4"
	scoutZimmer   = "00000000-0000-4000-8000-0000000000d5"
	scoutPurged   = "00000000-0000-4000-8000-0000000000d6"
	// msgNoRosterClasses is the 403 of a caller with no Class to see.
	msgNoRosterClasses = "You do not have access to any classes in this event"
	// classUniTwo is a Class of University two.
	classUniTwo = "00000000-0000-4000-8000-0000000000c4"
)

// pathRoster is the Roster route of a University.
func pathRoster(universityID string) string {
	return pathRegistrations + "/" + universityID + "/roster"
}

// rosterFixture is seatFixture with a Room and Capacity 10 on Class two, a Counselor of
// Class one, and Registrations: Class two holds five enrolled Scouts
// whose last names a byte-order sort puts in a different order (one of
// them purged), and a cancelled one; Class one holds two waitlisted
// Scouts, the older one inserted last, and Amy enrolled.
func rosterFixture(t *testing.T) *usersFixture {
	t.Helper()
	f := seatFixture(t)
	f.exec(`UPDATE classes SET room = 'Gym', capacity = 10 WHERE id = $1`, classTwo)
	f.user(uidCounselor, "counselor@example.com")
	f.exec(`UPDATE users SET display_name = 'Cam, Counselor' WHERE uid = $1`, uidCounselor)
	f.exec(`INSERT INTO class_counselors (class_id, uid, bsa_id, disclaimer_accepted_at, disclaimer_version)
		VALUES ($1, $2, '123', $3, '2026-07-04')`, classOne, uidCounselor, testNow)
	for _, s := range []struct{ id, first, last string }{
		{scoutZimmer, "Zed", "Zimmer"},
		{scoutCruz, "Cara", "de la Cruz"},
		{scoutAdamsBen, "Ben", "Adams"},
		{scoutEvora, "Eva", "Évora"},
		{scoutAdamsAl, "Al", "Adams"},
	} {
		f.scout(s.id, uidOther)
		f.rosterRegistration(classTwo, s.id, statusEnrolled, testNow, s.first, s.last)
	}
	f.scout(scoutPurged, uidOther)
	f.exec(`INSERT INTO registrations (class_id, scout_id, status, enrolled_at, parent_consent_at,
		accepted_policy_version, purged_at) VALUES ($1, $2, 'enrolled', $3, $3, '2026-07-04', $3)`,
		classTwo, scoutPurged, testNow)
	f.registration(classTwo, scoutOther, "cancelled", testNow)
	f.registration(classOne, scoutAmy, statusEnrolled, testNow)
	f.rosterRegistration(classOne, scoutBen, statusWaitlisted, testNow, "Ben", "Late")
	f.scout(scoutOther2, uidOther)
	f.rosterRegistration(classOne, scoutOther2, statusWaitlisted, testNow.Add(-time.Hour), "Olga", "Early")
	return f
}

// rosterRegistration inserts a Registration with the Scout's name, Unit,
// accommodations and the Parent in its snapshot.
func (f *usersFixture) rosterRegistration(classID, scoutID, status string, at time.Time, first, last string) {
	f.t.Helper()
	f.exec(`INSERT INTO registrations (class_id, scout_id, status, enrolled_at, waitlisted_at,
		parent_consent_at, accepted_policy_version, scout_first_name, scout_last_name, scout_unit,
		accommodations, parent_name, parent_email)
		VALUES ($1, $2, $3, $4, $5, $6, '2026-07-04', $7, $8, 'Troop 9', 'None', 'Olly Other', 'other@example.com')`,
		classID, scoutID, status,
		nullUnless(status != statusWaitlisted, at), nullUnless(status == statusWaitlisted, at), at, first, last)
}

// rosterRow is the JSON of a Roster row of rosterRegistration.
func rosterRow(scoutID, status, first, last string) string {
	return `{"scoutId":"` + scoutID + `","scoutFirstName":"` + first + `","scoutLastName":"` + last + `",
		"scoutUnit":"Troop 9","accommodations":"None","parentName":"Olly Other","parentEmail":"other@example.com",
		"consentReceived":true,"status":"` + status + `"}`
}

// The JSON of the parts of the fixture's Roster.
const (
	rosterUniversity = `"university":{"title":"MBU","startDate":"2027-04-10T13:00:00.000Z","endDate":null,
		"location":{"name":"HS","address":"1 Main","city":"Town","state":"VA","zip":"22000"},
		"timezone":"America/New_York"}`
	rosterAmy = `{"scoutId":"` + scoutAmy + `","scoutFirstName":"S","scoutLastName":"P","scoutUnit":null,
		"accommodations":null,"parentName":"Pat","parentEmail":"pat@example.com","consentReceived":true,
		"status":"enrolled"}`
	// rosterPurged is a Registration after the Retention Purge: no
	// personal data, and still a valid row.
	rosterPurged = `{"scoutId":"` + scoutPurged + `","scoutFirstName":null,"scoutLastName":null,"scoutUnit":null,
		"accommodations":null,"parentName":null,"parentEmail":null,"consentReceived":true,"status":"enrolled"}`
)

// rosterClassOne, rosterClassTwo and rosterClassThree are the fixture's
// Class Rosters.
var (
	rosterClassOne = `{"class":{"classId":"` + classOne + `","badgeTitle":"Camping","periodLabels":["Early","Morning"],
		"room":null,"capacity":1,"enrolledCount":1,"waitlistCount":2,"counselorNames":["Cam, Counselor"]},
		"enrolled":[` + rosterAmy + `],
		"waitlisted":[` + rosterRow(scoutOther2, statusWaitlisted, "Olga", "Early") + `,` +
		rosterRow(scoutBen, statusWaitlisted, "Ben", "Late") + `]}`
	rosterClassTwo = `{"class":{"classId":"` + classTwo + `","badgeTitle":"Archery","periodLabels":["Morning"],
		"room":"Gym","capacity":10,"enrolledCount":6,"waitlistCount":0,"counselorNames":[]},
		"enrolled":[` + rosterPurged + `,` +
		rosterRow(scoutAdamsAl, statusEnrolled, "Al", "Adams") + `,` +
		rosterRow(scoutAdamsBen, statusEnrolled, "Ben", "Adams") + `,` +
		rosterRow(scoutCruz, statusEnrolled, "Cara", "de la Cruz") + `,` +
		rosterRow(scoutEvora, statusEnrolled, "Eva", "Évora") + `,` +
		rosterRow(scoutZimmer, statusEnrolled, "Zed", "Zimmer") + `],
		"waitlisted":[]}`
	rosterClassThree = `{"class":{"classId":"` + classThree + `","badgeTitle":"Cooking","periodLabels":[],
		"room":null,"capacity":5,"enrolledCount":0,"waitlistCount":0,"counselorNames":[]},
		"enrolled":[],"waitlisted":[]}`
)

// A Chancellor sees every Class of the University. Enrolled Scouts are
// in name order (last, then first) by the ICU root collation, as the
// TypeScript localeCompare sorted them; a purged row has no name and
// comes first. Waitlisted Scouts are in Waitlist order.
func TestRoster_AChancellorSeesEveryClass(t *testing.T) {
	f := rosterFixture(t)
	f.grant(uniOne, "")

	resp := f.send(http.MethodGet, pathRoster(uniOne), tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	wantJSONBody(t, resp, `{`+rosterUniversity+`,"classRosters":[`+
		rosterClassOne+`,`+rosterClassTwo+`,`+rosterClassThree+`]}`)
}

func TestRoster_ASuperAdminSeesEveryClass(t *testing.T) {
	f := rosterFixture(t)

	resp := f.send(http.MethodGet, pathRoster(uniOne), tokenSuperAdmin, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	wantJSONBody(t, resp, `{`+rosterUniversity+`,"classRosters":[`+
		rosterClassOne+`,`+rosterClassTwo+`,`+rosterClassThree+`]}`)
}

// A Counselor sees only the Classes of their active Counselor grants at
// this University: not a revoked grant, and not a grant at another
// University.
func TestRoster_ACounselorSeesOnlyTheirOwnClasses(t *testing.T) {
	f := rosterFixture(t)
	f.grant(uniOne, classTwo)
	f.exec(`INSERT INTO role_grants (role, university_id, class_id, uid, status)
		VALUES ('counselor', $1, $2, $3, 'revoked')`, uniOne, classOne, uidParent)
	f.university(uniTwo, statusPublished)
	f.exec(`INSERT INTO classes (id, university_id, badge_slug, badge_title, eagle_required, capacity)
		VALUES ($1, $2, 'camping', 'Camping', true, 5)`, classUniTwo, uniTwo)
	f.grant(uniTwo, classUniTwo)

	resp := f.send(http.MethodGet, pathRoster(uniOne), tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	wantJSONBody(t, resp, `{`+rosterUniversity+`,"classRosters":[`+rosterClassTwo+`]}`)
}

// A Parent with Registrations at the University, and a caller who is a
// Chancellor of another University, have no Class to see.
func TestRoster_ACallerWithNoClassGrantIsForbidden(t *testing.T) {
	f := rosterFixture(t)
	f.university(uniTwo, statusPublished)
	f.grant(uniTwo, "")

	resp := f.send(http.MethodGet, pathRoster(uniOne), tokenParent, "")
	defer resp.Body.Close()
	got := wantRefusal(t, resp, http.StatusForbidden, apierr.CodeForbidden)
	if got.Message != msgNoRosterClasses {
		t.Fatalf("message = %q, want %q", got.Message, msgNoRosterClasses)
	}
}

// A missing University is 404 before the role check, as the TypeScript
// read the University first.
func TestRoster_AMissingUniversityIsNotFound(t *testing.T) {
	f := rosterFixture(t)
	for _, id := range []string{uniMissing, notAUUID} {
		resp := f.send(http.MethodGet, pathRoster(id), tokenParent, "")
		got := wantRefusal(t, resp, http.StatusNotFound, apierr.CodeNotFound)
		_ = resp.Body.Close()
		if got.Message != msgUniversityNotFound {
			t.Fatalf("message = %q, want %q", got.Message, msgUniversityNotFound)
		}
	}
}

// "roster" is a literal path segment: a GET reads the Roster, and the
// register route still reads "roster" as a Class id.
func TestRoster_TheRouteIsNotReadAsAClassID(t *testing.T) {
	f := rosterFixture(t)
	f.grant(uniOne, "")

	resp := f.send(http.MethodGet, pathRoster(uniOne), tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)

	resp = f.send(http.MethodPost, pathRoster(uniOne), tokenParent, registerAmy)
	defer resp.Body.Close()
	got := wantRefusal(t, resp, http.StatusNotFound, apierr.CodeNotFound)
	if got.Message != msgClassNotFound {
		t.Fatalf("message = %q, want %q", got.Message, msgClassNotFound)
	}
}
