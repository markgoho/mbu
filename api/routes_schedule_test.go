package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"mbu/api/internal/apierr"
	"mbu/api/internal/catalog"
	"mbu/api/internal/idempotency"
)

// The schedule paths of University one.
var (
	pathPeriods = pathUniversity(uniOne) + "/periods"
	pathClasses = pathUniversity(uniOne) + "/classes"
	pathBadges  = pathUniversities + "/badges"
)

// uniMissing is a University id no fixture inserts.
const uniMissing = "00000000-0000-4000-8000-0000000000ff"

// pathClass is a Class's own path under University one.
func pathClass(id string) string { return pathClasses + "/" + id }

// The bodies of the schedule writes that pass every check against
// scheduleFixture.
const (
	periodsBody = `{"periods":[
		{"periodId":"00000000-0000-4000-8000-0000000000e1","label":" Late morning ",
		 "startsAt":"2027-04-10T14:00:00.000Z","endsAt":"2027-04-10T16:00:00.000Z"},
		{"periodId":"00000000-0000-4000-8000-0000000000e2","label":"Early",
		 "startsAt":"2027-04-10T11:00:00Z","endsAt":"2027-04-10T12:00:00Z"},
		{"label":"Afternoon","startsAt":"2027-04-10T17:00:00Z","endsAt":"2027-04-10T18:30:00Z"}]}`
	classBody = `{"badgeSlug":"camping","periodIds":["00000000-0000-4000-8000-0000000000e1",
		"00000000-0000-4000-8000-0000000000e2","00000000-0000-4000-8000-0000000000e1"],
		"capacity":20,"room":"Gym","notes":null,"counselor":{"bsaId":" 123456789 ","acceptDisclaimer":true}}`
	classPatchBody = `{"capacity":25}`
)

// scheduleRoutes is each schedule route of #252 that reads the
// database, with a body that passes its checks.
var scheduleRoutes = []struct{ method, path, body string }{
	{http.MethodPut, pathPeriods, periodsBody},
	{http.MethodPost, pathClasses, classBody},
	{http.MethodPatch, pathClass(classOne), classPatchBody},
	{http.MethodDelete, pathClass(classOne), ""},
}

// draftSchedule is scheduleFixture on a draft University one that the
// Parent is the Chancellor of.
func draftSchedule(t *testing.T) *usersFixture {
	t.Helper()
	f := newUsersFixture(t)
	f.university(uniOne, statusDraft)
	f.scheduleFixture()
	f.grant(uniOne, "")
	return f
}

func TestScheduleRoutes_RefuseAMissingAndAnInvalidSession(t *testing.T) {
	f := draftSchedule(t)
	all := append([]struct{ method, path, body string }{{http.MethodGet, pathBadges, ""}}, scheduleRoutes...)
	for _, r := range all {
		t.Run(r.method+" "+r.path, func(t *testing.T) {
			resp := f.send(r.method, r.path, "", r.body)
			defer resp.Body.Close()
			wantRefusal(t, resp, http.StatusUnauthorized, apierr.CodeUnauthorized)

			resp = f.send(r.method, r.path, tokenNoSession, r.body)
			defer resp.Body.Close()
			wantRefusal(t, resp, http.StatusUnauthorized, apierr.CodeUnauthorized)
		})
	}
	if n := f.count(`SELECT count(*) FROM classes`) + f.count(`SELECT count(*) FROM periods`); n != 4 {
		t.Fatalf("classes + periods = %d, want the fixture unchanged", n)
	}
}

func TestScheduleRoutes_ADatabaseFailureIsInternal(t *testing.T) {
	d := testDeps()
	f := closedFixture(t, d)
	for _, r := range scheduleRoutes {
		t.Run(r.method+" "+r.path, func(t *testing.T) {
			resp := f.send(r.method, r.path, tokenParent, r.body)
			defer resp.Body.Close()
			wantRefusal(t, resp, http.StatusInternalServerError, apierr.CodeInternal)
		})
	}
}

// Only the University's Chancellor or a Super-admin may write its
// schedule. A Super-admin gets 404 for a University that does not
// exist, where anyone else gets 403 first.
func TestScheduleRoutes_OnlyTheChancellorOrASuperAdmin(t *testing.T) {
	f := newUsersFixture(t)
	f.university(uniOne, statusDraft)
	f.scheduleFixture()
	for _, r := range scheduleRoutes {
		t.Run(r.method+" "+r.path, func(t *testing.T) {
			resp := f.send(r.method, r.path, tokenParent, r.body)
			defer resp.Body.Close()
			wantRefusal(t, resp, http.StatusForbidden, apierr.CodeForbidden)

			other := strings.Replace(r.path, uniOne, uniMissing, 1)
			resp = f.send(r.method, other, tokenParent, r.body)
			defer resp.Body.Close()
			wantRefusal(t, resp, http.StatusForbidden, apierr.CodeForbidden)

			resp = f.send(r.method, other, tokenSuperAdmin, r.body)
			defer resp.Body.Close()
			got := wantRefusal(t, resp, http.StatusNotFound, apierr.CodeNotFound)
			if got.Message != msgUniversityNotFound {
				t.Fatalf("message = %q", got.Message)
			}
		})
	}
	if n := f.count(`SELECT count(*) FROM classes WHERE capacity IN (2, 5)`); n != 2 {
		t.Fatal("a refused write changed a Class")
	}
}

// The writes change a University's schedule only while it is draft or
// rejected; each other status is a 409.
func TestScheduleRoutes_OnlyADraftOrRejectedUniversity(t *testing.T) {
	for _, status := range []string{statusSubmitted, statusPublished, statusClosed} {
		t.Run(status, func(t *testing.T) {
			f := newUsersFixture(t)
			f.university(uniOne, status)
			f.scheduleFixture()
			for _, r := range scheduleRoutes {
				resp := f.send(r.method, r.path, tokenSuperAdmin, r.body)
				got := wantRefusal(t, resp, http.StatusConflict, apierr.CodeConflict)
				_ = resp.Body.Close()
				if got.Message != "Only draft or rejected universities can be modified" {
					t.Fatalf("%s %s: message = %q", r.method, r.path, got.Message)
				}
			}
			if n := f.count(`SELECT count(*) FROM classes`) + f.count(`SELECT count(*) FROM periods`); n != 4 {
				t.Fatalf("classes + periods = %d, want the fixture unchanged", n)
			}
		})
	}
}

func TestScheduleRoutes_ARejectedUniversityMayChange(t *testing.T) {
	f := newUsersFixture(t)
	f.university(uniOne, statusRejected)
	f.scheduleFixture()
	f.grant(uniOne, "")
	want := []int{http.StatusOK, http.StatusOK, http.StatusOK, http.StatusNoContent}
	for i, r := range scheduleRoutes {
		resp := f.send(r.method, r.path, tokenParent, r.body)
		wantStatus(t, resp, want[i])
		_ = resp.Body.Close()
	}
}

func TestListBadges_ReturnsTheCatalog(t *testing.T) {
	f := newUsersFixture(t)

	// A caller with no grant anywhere: had badges been read as a
	// University id, the role check would answer 403.
	resp := f.send(http.MethodGet, pathBadges, tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	got := decode[struct {
		Badges []catalog.Badge `json:"badges"`
	}](t, resp)
	wantSameJSON(t, got.Badges, catalog.All())
}

// postClass sends a Class create with an Idempotency-Key.
func postClass(f *usersFixture, key, body string) *httptest.ResponseRecorder {
	f.t.Helper()
	req := httptest.NewRequestWithContext(f.t.Context(), http.MethodPost, pathClasses, strings.NewReader(body))
	authenticate(f.t, req, f.db.App, f.now, tokenParent)
	req.Header.Set(idempotency.HeaderName, key)
	rec := httptest.NewRecorder()
	f.h.ServeHTTP(rec, req)
	return rec
}

func TestPutPeriods_ReplacesTheSetInRequestOrder(t *testing.T) {
	f := draftSchedule(t)

	resp := f.send(http.MethodPut, pathPeriods, tokenParent, periodsBody)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	got := decode[struct {
		Periods []map[string]string `json:"periods"`
	}](t, resp)
	if len(got.Periods) != 3 {
		t.Fatalf("periods = %v, want 3", got.Periods)
	}
	newID := got.Periods[2]["periodId"]
	if newID == "" || newID == periodOne || newID == periodTwo {
		t.Fatalf("new period id = %q, want a new id", newID)
	}
	wantSameJSON(t, got.Periods, parseJSON(t, `[
		{"periodId": "00000000-0000-4000-8000-0000000000e1", "label": "Late morning",
		 "startsAt": "2027-04-10T14:00:00.000Z", "endsAt": "2027-04-10T16:00:00.000Z"},
		{"periodId": "00000000-0000-4000-8000-0000000000e2", "label": "Early",
		 "startsAt": "2027-04-10T11:00:00.000Z", "endsAt": "2027-04-10T12:00:00.000Z"},
		{"periodId": "`+newID+`", "label": "Afternoon",
		 "startsAt": "2027-04-10T17:00:00.000Z", "endsAt": "2027-04-10T18:30:00.000Z"}]`))
	if n := f.count(`SELECT count(*) FROM periods WHERE (id = $1 AND position = 0) OR (id = $2 AND position = 1)
		OR (id = $3 AND position = 2 AND created_at = $4)`, periodOne, periodTwo, newID, testNow); n != 3 {
		t.Fatalf("periods in place = %d, want 3", n)
	}
	if n := f.count(`SELECT count(*) FROM universities WHERE updated_at = $1`, testNow); n != 1 {
		t.Fatal("the University's updatedAt did not move")
	}
	if n := f.count(`SELECT count(*) FROM class_periods`); n != 3 {
		t.Fatalf("class_periods = %d, want the links kept", n)
	}
}

func TestPutPeriods_RemovesAPeriodNoClassUses(t *testing.T) {
	f := draftSchedule(t)
	f.exec(`DELETE FROM classes`)

	resp := f.send(http.MethodPut, pathPeriods, tokenParent, `{"periods":[]}`)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	wantJSONBody(t, resp, `{"periods": []}`)
	if n := f.count(`SELECT count(*) FROM periods`); n != 0 {
		t.Fatalf("periods = %d, want none", n)
	}
}

// A Period that a Class uses cannot go: the answer is 409 with each such
// Class in details, as {classId: badge title}.
func TestPutPeriods_ARemovedPeriodInUseIsAConflict(t *testing.T) {
	f := draftSchedule(t)
	keepOne := `{"periods":[{"periodId":"` + periodOne + `","label":"Morning",` +
		`"startsAt":"2027-04-10T13:00:00Z","endsAt":"2027-04-10T15:00:00Z"}]}`
	tests := map[string]struct {
		body string
		want map[string]string
	}{
		"one Class uses it":    {keepOne, map[string]string{classOne: badgeCamping}},
		"two Classes use them": {`{"periods":[]}`, map[string]string{classOne: badgeCamping, classTwo: "Archery"}},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			resp := f.send(http.MethodPut, pathPeriods, tokenParent, tt.body)
			defer resp.Body.Close()
			got := wantRefusal(t, resp, http.StatusConflict, apierr.CodeConflict)
			if got.Message != "Cannot remove periods that are assigned to classes" {
				t.Fatalf("message = %q", got.Message)
			}
			wantSameJSON(t, got.Details, tt.want)
		})
	}
	if n := f.count(`SELECT count(*) FROM periods`); n != 2 {
		t.Fatalf("periods = %d, want both kept", n)
	}
}

func TestPutPeriods_RefusesAnIdThatIsNotAPeriodOfTheUniversity(t *testing.T) {
	f := draftSchedule(t)
	f.university(uniTwo, statusDraft)
	f.exec(`INSERT INTO periods (id, university_id, label, starts_at, ends_at, position)
		VALUES ('00000000-0000-4000-8000-0000000000e9', $1, 'Theirs', '2027-04-10T11:00:00Z', '2027-04-10T12:00:00Z', 0)`,
		uniTwo)
	item := func(id string) string {
		return `{"periodId":"` + id + `","label":"L","startsAt":"2027-04-10T11:00:00Z","endsAt":"2027-04-10T12:00:00Z"}`
	}
	body := `{"periods":[` + item(periodOne) + `,` + item(periodTwo) + `,` + item("p1") + `,` +
		item("00000000-0000-4000-8000-0000000000e9") + `]}`

	resp := f.send(http.MethodPut, pathPeriods, tokenParent, body)
	defer resp.Body.Close()
	got := wantRefusal(t, resp, http.StatusBadRequest, apierr.CodeInvalidArgument)
	wantSameJSON(t, got.Details, parseJSON(t, `{
		"periods.2.periodId": "Send the period id of a period of this University, or leave it out for a new period.",
		"periods.3.periodId": "Send the period id of a period of this University, or leave it out for a new period."}`))
	if n := f.count(`SELECT count(*) FROM periods WHERE label = 'L'`); n != 0 {
		t.Fatal("the refused put changed a Period")
	}
}

func TestPutPeriods_RefusesEachBadField(t *testing.T) {
	f := newUsersFixture(t)
	notAList := `{"periods": "Send the periods as a list."}`
	times := `"startsAt":"2027-04-10T11:00:00Z","endsAt":"2027-04-10T12:00:00Z"`
	tests := []struct {
		name string
		body string
		want string
	}{
		{"no periods", `{}`, notAList},
		{"periods null", `{"periods":null}`, notAList},
		{"periods not a list", `{"periods":{}}`, notAList},
		{"a period not an object", `{"periods":[null,7]}`, `{
			"periods.0": "Send each period with a label, a start time and an end time.",
			"periods.1": "Send each period with a label, a start time and an end time."}`},
		{"label blank or missing", `{"periods":[{"label":"  ",` + times + `},{` + times + `},{"label":3,` + times + `}]}`, `{
			"periods.0.label": "Enter a label for the period.",
			"periods.1.label": "Enter a label for the period.",
			"periods.2.label": "Enter a label for the period."}`},
		{"times missing", `{"periods":[{"label":"L"}]}`, `{
			"periods.0.startsAt": "Enter the start time as a date and time.",
			"periods.0.endsAt": "Enter the end time as a date and time."}`},
		{"times not date-times", `{"periods":[{"label":"L","startsAt":"tomorrow","endsAt":5}]}`, `{
			"periods.0.startsAt": "Enter the start time as a date and time.",
			"periods.0.endsAt": "Enter the end time as a date and time."}`},
		{"end not after start", `{"periods":[{"label":"L","startsAt":"2027-04-10T12:00:00Z","endsAt":"2027-04-10T12:00:00Z"}]}`,
			`{"periods.0.endsAt": "Enter an end time after the start time."}`},
		{"periodId empty or not text", `{"periods":[{"periodId":"","label":"L",` + times + `},{"periodId":1,"label":"L",` +
			times + `}]}`, `{
			"periods.0.periodId": "Send the period id of a period of this University, or leave it out for a new period.",
			"periods.1.periodId": "Send the period id of a period of this University, or leave it out for a new period."}`},
		{"periodId twice", `{"periods":[{"periodId":"a","label":"L",` + times + `},{"periodId":"a","label":"L",` +
			times + `}]}`, `{"periods.1.periodId": "Send each period id once."}`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// The field checks run before the role check: no grant, no
			// University.
			resp := f.send(http.MethodPut, pathPeriods, tokenParent, tt.body)
			defer resp.Body.Close()
			got := wantRefusal(t, resp, http.StatusBadRequest, apierr.CodeInvalidArgument)
			if got.Message != "Check the periods." {
				t.Fatalf("message = %q", got.Message)
			}
			wantSameJSON(t, got.Details, parseJSON(t, tt.want))
		})
	}
}

func TestScheduleWrites_RefuseABodyThatIsNotJSON(t *testing.T) {
	f := newUsersFixture(t)
	for _, r := range scheduleRoutes[:3] {
		resp := f.send(r.method, r.path, tokenParent, `{"capacity":`)
		wantRefusal(t, resp, http.StatusBadRequest, apierr.CodeInvalidArgument)
		_ = resp.Body.Close()
	}
}

// classJSON is the body of a Class answered for scheduleFixture's
// Parent as its first Counselor, after classBody, with its id cut.
const classJSON = `{"badgeSlug": "camping", "badgeTitle": "Camping", "eagleRequired": true,
	"periodIds": ["00000000-0000-4000-8000-0000000000e2", "00000000-0000-4000-8000-0000000000e1"],
	"capacity": 20, "enrolledCount": 0, "waitlistCount": 0, "room": "Gym", "notes": null,
	"counselors": [{"uid": "uid-parent", "displayName": "Pat Parent", "bsaId": "123456789",
		"disclaimerAcceptedAt": "2027-03-06T09:00:00.000Z", "disclaimerVersion": "2026-07-03"}],
	"createdAt": "2027-03-06T09:00:00.000Z", "updatedAt": "2027-03-06T09:00:00.000Z"}`

func TestCreateClass_CreatesTheClassItsCounselorAndTheGrant(t *testing.T) {
	f := draftSchedule(t)

	resp := f.send(http.MethodPost, pathClasses, tokenParent, classBody)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	got := decode[map[string]any](t, resp)
	id, _ := got["classId"].(string)
	delete(got, "classId")
	wantSameJSON(t, got, parseJSON(t, classJSON))
	if n := f.count(`SELECT count(*) FROM role_grants WHERE university_id = $1 AND class_id = $2 AND uid = $3
		AND role = 'counselor' AND status = 'active'`, uniOne, id, uidParent); n != 1 {
		t.Fatalf("counselor grants = %d, want 1", n)
	}

	// The detail read shows the new Class last.
	resp = f.send(http.MethodGet, pathUniversity(uniOne), tokenParent, "")
	defer resp.Body.Close()
	detail := decode[struct {
		Classes []map[string]any `json:"classes"`
	}](t, resp)
	if len(detail.Classes) != 3 || detail.Classes[2]["classId"] != id {
		t.Fatalf("classes = %v, want the new Class last", detail.Classes)
	}
}

func TestCreateClass_ARepeatWithTheSameKeyCreatesOne(t *testing.T) {
	f := draftSchedule(t)

	first := postClass(f, "class-1", classBody)
	second := postClass(f, "class-1", classBody)
	if first.Code != http.StatusOK || second.Body.String() != first.Body.String() {
		t.Fatalf("second = %d %s, want the first replayed", second.Code, second.Body)
	}
	if n := f.count(`SELECT count(*) FROM classes`); n != 3 {
		t.Fatalf("classes = %d, want one new", n)
	}
	if n := f.count(`SELECT count(*) FROM role_grants WHERE role = 'counselor'`); n != 1 {
		t.Fatalf("counselor grants = %d, want one", n)
	}
}

// A Super-admin with no users row cannot be a Counselor: the session
// bootstrap comes first.
func TestCreateClass_BeforeTheBootstrapIsNotFound(t *testing.T) {
	f := newUsersFixture(t)
	f.university(uniOne, statusDraft)
	f.scheduleFixture()

	resp := f.send(http.MethodPost, pathClasses, tokenSuperAdmin, classBody)
	defer resp.Body.Close()
	got := wantRefusal(t, resp, http.StatusNotFound, apierr.CodeNotFound)
	if got.Message != msgNotBootstrapped {
		t.Fatalf("message = %q", got.Message)
	}
	if n := f.count(`SELECT count(*) FROM classes`); n != 2 {
		t.Fatalf("classes = %d, want the create rolled back", n)
	}
}

func TestCreateClass_RefusesAPeriodOfAnotherUniversity(t *testing.T) {
	f := draftSchedule(t)
	f.university(uniTwo, statusDraft)
	f.exec(`INSERT INTO periods (id, university_id, label, starts_at, ends_at, position)
		VALUES ('00000000-0000-4000-8000-0000000000e9', $1, 'Theirs', '2027-04-10T11:00:00Z', '2027-04-10T12:00:00Z', 0)`,
		uniTwo)
	for _, id := range []string{"00000000-0000-4000-8000-0000000000e9", "p1"} {
		body := strings.Replace(classBody, `"periodIds":["`+periodOne, `"periodIds":["`+id, 1)
		resp := f.send(http.MethodPost, pathClasses, tokenParent, body)
		got := wantRefusal(t, resp, http.StatusBadRequest, apierr.CodeInvalidArgument)
		_ = resp.Body.Close()
		wantSameJSON(t, got.Details, parseJSON(t, `{"periodIds": "Choose periods of this University."}`))
	}
	if n := f.count(`SELECT count(*) FROM classes`); n != 2 {
		t.Fatalf("classes = %d, want none new", n)
	}
}

func TestCreateClass_RefusesEachBadField(t *testing.T) {
	f := newUsersFixture(t)
	tests := []struct {
		name string
		body string
		want string
	}{
		{"no fields", `{}`, `{
			"badgeSlug": "Choose a merit badge from the badge list.", "periodIds": "Choose one or more periods.",
			"capacity": "Enter a capacity of 1 to 200.",
			"counselor": "Enter your BSA member ID and accept the counselor disclaimer."}`},
		{"wrong types", `{"badgeSlug":7,"periodIds":"p1","capacity":"20","room":1,"notes":false,"counselor":[]}`, `{
			"badgeSlug": "Choose a merit badge from the badge list.", "periodIds": "Choose one or more periods.",
			"capacity": "Enter a capacity of 1 to 200.", "room": "Enter the room as text, or leave it empty.",
			"notes": "Enter the notes as text, or leave them empty.",
			"counselor": "Enter your BSA member ID and accept the counselor disclaimer."}`},
		{"an unknown badge, no periods, capacity out of range", `{"badgeSlug":"basket-weaving","periodIds":[],` +
			`"capacity":201,"counselor":{"bsaId":"1","acceptDisclaimer":true}}`, `{
			"badgeSlug": "Choose a merit badge from the badge list.", "periodIds": "Choose one or more periods.",
			"capacity": "Enter a capacity of 1 to 200."}`},
		{"an empty period id, a fractional capacity", `{"badgeSlug":"camping","periodIds":[""],"capacity":2.5,` +
			`"counselor":{"bsaId":"1","acceptDisclaimer":true}}`, `{
			"periodIds": "Choose one or more periods.", "capacity": "Enter a capacity of 1 to 200."}`},
		{"a blank BSA id, the disclaimer not accepted", `{"badgeSlug":"camping","periodIds":["p1"],"capacity":0,` +
			`"counselor":{"bsaId":"  ","acceptDisclaimer":false}}`, `{
			"capacity": "Enter a capacity of 1 to 200.",
			"counselor.bsaId": "Enter your BSA member ID.",
			"counselor.acceptDisclaimer": "Accept the counselor disclaimer."}`},
		{"counselor fields missing", `{"badgeSlug":"camping","periodIds":["p1"],"capacity":1,"counselor":{}}`, `{
			"counselor.bsaId": "Enter your BSA member ID.",
			"counselor.acceptDisclaimer": "Accept the counselor disclaimer."}`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := f.send(http.MethodPost, pathClasses, tokenParent, tt.body)
			defer resp.Body.Close()
			got := wantRefusal(t, resp, http.StatusBadRequest, apierr.CodeInvalidArgument)
			if got.Message != "Check the class form." {
				t.Fatalf("message = %q", got.Message)
			}
			wantSameJSON(t, got.Details, parseJSON(t, tt.want))
		})
	}
}

func TestPatchClass_ChangesTheNamedFields(t *testing.T) {
	f := draftSchedule(t)

	resp := f.send(http.MethodPatch, pathClass(classOne), tokenParent,
		`{"badgeSlug":"archery","periodIds":["`+periodOne+`"],"capacity":25,"room":null,"notes":"Bring water"}`)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	wantJSONBody(t, resp, `{"classId": "00000000-0000-4000-8000-0000000000c1", "badgeSlug": "archery",
		"badgeTitle": "Archery", "eagleRequired": false, "periodIds": ["00000000-0000-4000-8000-0000000000e1"],
		"capacity": 25, "enrolledCount": 2, "waitlistCount": 1, "room": null, "notes": "Bring water",
		"counselors": [{"uid": "uid-parent", "displayName": "Pat Parent", "bsaId": "BSA-1",
			"disclaimerAcceptedAt": "2027-03-01T00:00:00.000Z", "disclaimerVersion": "2026-07-03"}],
		"createdAt": "2027-03-01T00:00:00.000Z", "updatedAt": "2027-03-06T09:00:00.000Z"}`)

	// An empty patch changes nothing but updatedAt.
	f.now = testNow.Add(time.Hour)
	resp = f.send(http.MethodPatch, pathClass(classTwo), tokenParent, `{}`)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	got := decode[map[string]any](t, resp)
	if got["updatedAt"] != "2027-03-06T10:00:00.000Z" || got["capacity"] != float64(5) || got["room"] != nil {
		t.Fatalf("class = %v, want only updatedAt moved", got)
	}
}

// A Class that does not exist in the University of the path is 404: a
// missing id, an id that is not a uuid, and a Class of another
// University. The University's 404 comes first, and the Class's 404
// before its status's 409, as in the TypeScript.
func TestClassWrites_AClassNotInTheUniversityIsNotFound(t *testing.T) {
	f := newUsersFixture(t)
	f.university(uniOne, statusPublished)
	f.scheduleFixture()
	f.university(uniTwo, statusDraft)
	theirs := "00000000-0000-4000-8000-0000000000c9"
	f.exec(`INSERT INTO classes (id, university_id, badge_slug, badge_title, eagle_required, capacity)
		VALUES ($1, $2, 'camping', 'Camping', true, 3)`, theirs, uniTwo)
	for _, id := range []string{"00000000-0000-4000-8000-0000000000cf", "cls1", theirs} {
		for _, method := range []string{http.MethodPatch, http.MethodDelete} {
			resp := f.send(method, pathClass(id), tokenSuperAdmin, classPatchBody)
			got := wantRefusal(t, resp, http.StatusNotFound, apierr.CodeNotFound)
			_ = resp.Body.Close()
			if got.Message != msgClassNotFound {
				t.Fatalf("%s %s: message = %q", method, id, got.Message)
			}
		}
	}
	if n := f.count(`SELECT count(*) FROM classes WHERE id = $1 AND capacity = 3`, theirs); n != 1 {
		t.Fatal("a refused write changed the other University's Class")
	}
}

func TestPatchClass_RefusesAPeriodOfAnotherUniversityAndABadField(t *testing.T) {
	f := draftSchedule(t)
	tests := []struct{ body, want string }{
		{`{"periodIds":["00000000-0000-4000-8000-0000000000e9"]}`, `{"periodIds": "Choose periods of this University."}`},
		{`{"badgeSlug":"","periodIds":null,"capacity":0,"room":7,"notes":[]}`, `{
			"badgeSlug": "Choose a merit badge from the badge list.", "periodIds": "Choose one or more periods.",
			"capacity": "Enter a capacity of 1 to 200.", "room": "Enter the room as text, or leave it empty.",
			"notes": "Enter the notes as text, or leave them empty."}`},
	}
	for _, tt := range tests {
		resp := f.send(http.MethodPatch, pathClass(classOne), tokenParent, tt.body)
		got := wantRefusal(t, resp, http.StatusBadRequest, apierr.CodeInvalidArgument)
		_ = resp.Body.Close()
		wantSameJSON(t, got.Details, parseJSON(t, tt.want))
	}
	if n := f.count(`SELECT count(*) FROM class_periods WHERE class_id = $1`, classOne); n != 2 {
		t.Fatal("a refused patch changed the Class's Periods")
	}
}

func TestDeleteClass_DeletesTheClassWithAllItHolds(t *testing.T) {
	f := draftSchedule(t)
	f.grant(uniOne, classOne)
	f.exec(`INSERT INTO role_grants (role, university_id, class_id, invited_email, status)
		VALUES ('counselor', $1, $2, 'new@example.com', 'invited')`, uniOne, classOne)

	resp := f.send(http.MethodDelete, pathClass(classOne), tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusNoContent)
	for _, table := range []string{"class_periods", "class_counselors", "registrations", "role_grants"} {
		if n := f.count(`SELECT count(*) FROM `+table+` WHERE class_id = $1`, classOne); n != 0 {
			t.Errorf("%s rows of the Class = %d, want 0", table, n)
		}
	}
	if n := f.count(`SELECT count(*) FROM classes WHERE id = $1`, classOne); n != 0 {
		t.Fatal("the Class is still there")
	}
	if n := f.count(`SELECT count(*) FROM classes`) + f.count(`SELECT count(*) FROM periods`); n != 3 {
		t.Fatalf("classes + periods = %d, want the other Class and both Periods kept", n)
	}
	if n := f.count(`SELECT count(*) FROM role_grants WHERE role = 'chancellor'`); n != 1 {
		t.Fatal("the Chancellor grant went with the Class")
	}
}
