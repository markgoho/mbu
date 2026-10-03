package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"mbu/api/internal/apierr"
)

const (
	pathScouts = "/api/users/me/scouts"
	// The JSON field names of the Scout body that a details map names.
	fieldFirstName = "firstName"
	fieldLastName  = "lastName"
	fieldAgeBand   = "ageBand"
)

// scoutBody is the decoded body of a ScoutResponse.
type scoutBody struct {
	ScoutID        string  `json:"scoutId"`
	FirstName      string  `json:"firstName"`
	LastName       string  `json:"lastName"`
	Unit           *string `json:"unit"`
	Council        *string `json:"council"`
	District       *string `json:"district"`
	AgeBand        *string `json:"ageBand"`
	BSAID          *string `json:"bsaId"`
	Accommodations *string `json:"accommodations"`
}

// scoutListBody is the decoded body of GET /api/users/me/scouts.
type scoutListBody struct {
	Scouts []scoutBody `json:"scouts"`
}

// wantSameJSON fails unless got and want marshal to the same JSON, so a
// key that is missing, extra or not null where null is wanted fails.
func wantSameJSON(t *testing.T, got, want any) {
	t.Helper()
	gotJSON, _ := json.Marshal(got)
	wantJSON, _ := json.Marshal(want)
	if string(gotJSON) != string(wantJSON) {
		t.Fatalf("body = %s, want %s", gotJSON, wantJSON)
	}
}

func TestListScouts_StartsEmpty(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)

	resp := f.send(http.MethodGet, pathScouts, tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	wantSameJSON(t, decode[map[string]any](t, resp), map[string]any{"scouts": []any{}})
}

func TestListScouts_OnlyTheCallersOldestFirst(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	f.user(uidOther, "other@example.com")
	// Ben has the higher id but the older created_at: the order is by
	// created_at, not by id.
	f.exec(`INSERT INTO scouts (id, parent_uid, first_name, last_name, created_at)
		VALUES ($1, $2, 'Ben', 'P', $3), ($4, $2, 'Amy', 'P', $5), ($6, $7, 'Oli', 'O', $3)`,
		scoutBen, uidParent, testNow.Add(-time.Hour), scoutAmy, testNow, scoutOther, uidOther)

	resp := f.send(http.MethodGet, pathScouts, tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	got := decode[scoutListBody](t, resp)
	if len(got.Scouts) != 2 || got.Scouts[0].ScoutID != scoutBen || got.Scouts[0].FirstName != "Ben" ||
		got.Scouts[1].ScoutID != scoutAmy {
		t.Fatalf("scouts = %+v, want the caller's two, oldest first", got.Scouts)
	}
}

// scoutAmyBody is the request body of a Scout with only the two names.
const scoutAmyBody = `{"firstName":"Amy","lastName":"Scout"}`

// scoutFullBody is the request body of a Scout with every field.
const scoutFullBody = `{"firstName":"Amy","lastName":"Scout","unit":"Troop 1","council":"NCAC",
	"district":"Potomac","ageBand":"12-13","bsaId":"BSA-9","accommodations":"Needs a ramp"}`

// scoutFullWant is the success body for scoutFullBody: every field it
// sent, as sent, and the Scout's id.
func scoutFullWant(t *testing.T, scoutID string) map[string]any {
	t.Helper()
	var want map[string]any
	if err := json.Unmarshal([]byte(scoutFullBody), &want); err != nil {
		t.Fatalf("scoutFullBody: %v", err)
	}
	want["scoutId"] = scoutID
	return want
}

func TestCreateScout_StoresEveryFieldForTheCaller(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)

	resp := f.send(http.MethodPost, pathScouts, tokenParent, scoutFullBody)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	got := decode[map[string]any](t, resp)
	id, _ := got["scoutId"].(string)
	if _, err := uuid.Parse(id); err != nil {
		t.Fatalf("scoutId = %q, want a uuid", id)
	}
	wantSameJSON(t, got, scoutFullWant(t, id))
	if n := f.count(`SELECT count(*) FROM scouts WHERE id = $1 AND parent_uid = $2 AND created_at = $3 AND updated_at = $3`,
		id, uidParent, testNow); n != 1 {
		t.Fatal("no scouts row of the caller stamped at the request clock")
	}
}

func TestCreateScout_AnOptionalFieldLeftOutIsNull(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)

	resp := f.send(http.MethodPost, pathScouts, tokenParent,
		`{"firstName":"Amy","lastName":"Scout","unit":null,"ageBand":null}`)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	got := decode[map[string]any](t, resp)
	id, _ := got["scoutId"].(string)
	wantSameJSON(t, got, scoutNamesOnly(id, "Amy"))
}

func TestCreateScout_BeforeBootstrapIsNotFound(t *testing.T) {
	f := newUsersFixture(t)

	resp := f.send(http.MethodPost, pathScouts, tokenParent, scoutAmyBody)
	defer resp.Body.Close()
	if got := wantRefusal(t, resp, http.StatusNotFound, apierr.CodeNotFound); got.Message != "User not found; bootstrap the session first" {
		t.Fatalf("message = %q", got.Message)
	}
}

func TestCreateScout_ARepeatedIdempotencyKeyCreatesOneScout(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)

	var ids []string
	for range 2 {
		req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, pathScouts, strings.NewReader(scoutAmyBody))
		req.Header.Set("Authorization", "Bearer "+tokenParent)
		req.Header.Set("Idempotency-Key", "create-amy")
		rec := httptest.NewRecorder()
		f.h.ServeHTTP(rec, req)
		resp := rec.Result()
		wantStatus(t, resp, http.StatusOK)
		ids = append(ids, decode[scoutBody](t, resp).ScoutID)
		_ = resp.Body.Close()
	}
	if ids[0] != ids[1] {
		t.Fatalf("scoutIds = %v, want the replay of the first", ids)
	}
	if n := f.count(`SELECT count(*) FROM scouts`); n != 1 {
		t.Fatalf("scouts = %d, want 1", n)
	}
}

// badScoutBodies is each request body the Scout schema refuses, with the
// details keys it must name.
var badScoutBodies = []struct {
	name    string
	body    string
	details []string
}{
	{"no last name", `{"firstName":"Amy"}`, []string{fieldLastName}},
	{"an empty first name", `{"firstName":"","lastName":"Scout"}`, []string{fieldFirstName}},
	{"nothing", `{}`, []string{fieldFirstName, fieldLastName}},
	{"a name of the wrong type", `{"firstName":7,"lastName":"Scout"}`, []string{fieldFirstName}},
	{"an age band outside the four", `{"firstName":"Amy","lastName":"Scout","ageBand":"9-10"}`, []string{fieldAgeBand}},
	{"an age band of the wrong type", `{"firstName":"Amy","lastName":"Scout","ageBand":12}`, []string{fieldAgeBand}},
	{"optional text of the wrong type", `{"firstName":"Amy","lastName":"Scout","unit":1,"council":true,
		"district":[],"bsaId":{},"accommodations":2}`, []string{"unit", "council", "district", "bsaId", "accommodations"}},
}

// wantDetails fails unless the refusal names exactly the keys.
func wantDetails(t *testing.T, got apierr.APIError, keys []string) {
	t.Helper()
	if len(got.Details) != len(keys) {
		t.Fatalf("details = %v, want keys %v", got.Details, keys)
	}
	for _, key := range keys {
		if got.Details[key] == "" {
			t.Fatalf("details = %v, want a %s entry", got.Details, key)
		}
	}
}

func TestCreateScout_RefusesABodyThatFailsTheSchema(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	for _, tt := range badScoutBodies {
		t.Run(tt.name, func(t *testing.T) {
			resp := f.send(http.MethodPost, pathScouts, tokenParent, tt.body)
			defer resp.Body.Close()
			wantDetails(t, wantRefusal(t, resp, http.StatusBadRequest, apierr.CodeInvalidArgument), tt.details)
		})
	}

	resp := f.send(http.MethodPost, pathScouts, tokenParent, `{not json`)
	defer resp.Body.Close()
	wantRefusal(t, resp, http.StatusBadRequest, apierr.CodeInvalidArgument)

	if n := f.count(`SELECT count(*) FROM scouts`); n != 0 {
		t.Fatalf("scouts = %d, want 0 after refused bodies", n)
	}
}

// scoutNamesOnly is the success body of a Scout with only the two names.
func scoutNamesOnly(scoutID, firstName string) map[string]any {
	return map[string]any{
		"scoutId": scoutID, fieldFirstName: firstName, fieldLastName: "Scout", "unit": nil, "council": nil,
		"district": nil, fieldAgeBand: nil, "bsaId": nil, "accommodations": nil,
	}
}

func TestUpdateScout_ReplacesEveryField(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	f.exec(`INSERT INTO scouts (id, parent_uid, first_name, last_name, unit, accommodations, created_at, updated_at)
		VALUES ($1, $2, 'Old', 'Name', 'Troop 2', 'Old note', $3, $3)`, scoutAmy, uidParent, testNow.Add(-time.Hour))

	resp := f.send(http.MethodPatch, pathScouts+"/"+scoutAmy, tokenParent, scoutFullBody)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	wantSameJSON(t, decode[map[string]any](t, resp), scoutFullWant(t, scoutAmy))

	// The update is a full replace, as the TypeScript's: a field left
	// out becomes null.
	resp = f.send(http.MethodPatch, pathScouts+"/"+scoutAmy, tokenParent, scoutAmyBody)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	wantSameJSON(t, decode[map[string]any](t, resp), scoutNamesOnly(scoutAmy, "Amy"))

	if n := f.count(`SELECT count(*) FROM scouts WHERE id = $1 AND created_at = $2 AND updated_at = $3`,
		scoutAmy, testNow.Add(-time.Hour), testNow); n != 1 {
		t.Fatal("want created_at kept and updated_at at the request clock")
	}
}

func TestUpdateScout_AScoutTheCallerDoesNotOwnIsNotFound(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	f.user(uidOther, "other@example.com")
	f.scout(scoutOther, uidOther)

	for _, id := range []string{scoutOther, scoutAmy, "not-a-uuid"} {
		resp := f.send(http.MethodPatch, pathScouts+"/"+id, tokenParent, scoutAmyBody)
		wantRefusal(t, resp, http.StatusNotFound, apierr.CodeNotFound)
		_ = resp.Body.Close()
	}
	if n := f.count(`SELECT count(*) FROM scouts WHERE id = $1 AND first_name = 'S'`, scoutOther); n != 1 {
		t.Fatal("the other Parent's Scout changed")
	}
}

func TestUpdateScout_RefusesABodyThatFailsTheSchema(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	f.scout(scoutAmy, uidParent)
	for _, tt := range badScoutBodies {
		t.Run(tt.name, func(t *testing.T) {
			resp := f.send(http.MethodPatch, pathScouts+"/"+scoutAmy, tokenParent, tt.body)
			defer resp.Body.Close()
			wantDetails(t, wantRefusal(t, resp, http.StatusBadRequest, apierr.CodeInvalidArgument), tt.details)
		})
	}
	// The body is checked before the Scout is looked up, as Elysia
	// checked it before the handler ran.
	resp := f.send(http.MethodPatch, pathScouts+"/not-a-uuid", tokenParent, `{"firstName":"Amy"}`)
	defer resp.Body.Close()
	wantRefusal(t, resp, http.StatusBadRequest, apierr.CodeInvalidArgument)

	resp = f.send(http.MethodPatch, pathScouts+"/"+scoutAmy, tokenParent, `{not json`)
	defer resp.Body.Close()
	wantRefusal(t, resp, http.StatusBadRequest, apierr.CodeInvalidArgument)

	if n := f.count(`SELECT count(*) FROM scouts WHERE first_name = 'S'`); n != 1 {
		t.Fatal("a refused body changed the Scout")
	}
}

func TestDeleteScout_ErasesTheScout(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	f.scout(scoutAmy, uidParent)
	f.scout(scoutBen, uidParent)

	resp := f.send(http.MethodDelete, pathScouts+"/"+scoutAmy, tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusNoContent)
	if n := f.count(`SELECT count(*) FROM scouts WHERE id = $1`, scoutAmy); n != 0 {
		t.Fatal("the Scout is still there")
	}
	if n := f.count(`SELECT count(*) FROM scouts WHERE id = $1`, scoutBen); n != 1 {
		t.Fatal("the delete removed another Scout")
	}

	// A repeat finds no Scout.
	resp = f.send(http.MethodDelete, pathScouts+"/"+scoutAmy, tokenParent, "")
	defer resp.Body.Close()
	wantRefusal(t, resp, http.StatusNotFound, apierr.CodeNotFound)
}

func TestDeleteScout_AScoutTheCallerDoesNotOwnIsNotFound(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	f.user(uidOther, "other@example.com")
	f.scout(scoutOther, uidOther)

	for _, id := range []string{scoutOther, "not-a-uuid"} {
		resp := f.send(http.MethodDelete, pathScouts+"/"+id, tokenParent, "")
		wantRefusal(t, resp, http.StatusNotFound, apierr.CodeNotFound)
		_ = resp.Body.Close()
	}
	if n := f.count(`SELECT count(*) FROM scouts WHERE id = $1`, scoutOther); n != 1 {
		t.Fatal("the other Parent's Scout was deleted")
	}
}

func TestDeleteScout_RemovesEveryRegistrationAndGivesTheSeatToTheWaitlist(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	f.user(uidOther, "other@example.com")
	f.university(uniOne, "published")
	f.class(classOne, 1)
	f.class(classTwo, 1)
	f.scout(scoutAmy, uidParent)
	f.scout(scoutBen, uidParent)
	f.scout(scoutOther, uidOther)
	f.scout(scoutOther2, uidOther)
	// Class one is full: Amy holds the seat, the other Parent's two
	// Scouts wait, the older first. In Class two, Amy's Registration is
	// cancelled and Ben's is enrolled.
	f.registration(classOne, scoutAmy, "enrolled", testNow.Add(-3*time.Hour))
	f.registration(classOne, scoutOther2, "waitlisted", testNow.Add(-time.Hour))
	f.registration(classOne, scoutOther, "waitlisted", testNow.Add(-2*time.Hour))
	f.registration(classTwo, scoutAmy, "cancelled", testNow.Add(-3*time.Hour))
	f.registration(classTwo, scoutBen, "enrolled", testNow.Add(-2*time.Hour))

	resp := f.send(http.MethodDelete, pathScouts+"/"+scoutAmy, tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusNoContent)

	// Erasure removes every Registration of the Scout, also the
	// cancelled one the TypeScript kept (docs/data-model.md).
	if n := f.count(`SELECT count(*) FROM registrations WHERE scout_id = $1`, scoutAmy); n != 0 {
		t.Fatalf("registrations of the deleted Scout = %d, want 0", n)
	}
	if n := f.count(`SELECT count(*) FROM registrations WHERE class_id = $1 AND scout_id = $2
		AND status = 'enrolled' AND enrolled_at = $3 AND waitlisted_at IS NULL`, classOne, scoutOther, testNow); n != 1 {
		t.Fatal("the older waiting Scout did not take the seat at the request clock")
	}
	if n := f.count(`SELECT count(*) FROM registrations WHERE class_id = $1 AND scout_id = $2 AND status = 'waitlisted'`,
		classOne, scoutOther2); n != 1 {
		t.Fatal("the younger waiting Scout moved, want it still waitlisted")
	}
	if n := f.count(`SELECT count(*) FROM registrations WHERE class_id = $1 AND scout_id = $2 AND status = 'enrolled'`,
		classTwo, scoutBen); n != 1 {
		t.Fatal("the delete changed Ben's Registration")
	}
}

func TestDeleteScout_AnEnrolledSeatWithNoWaitlistStaysFree(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	f.university(uniOne, "published")
	f.class(classOne, 5)
	f.scout(scoutAmy, uidParent)
	f.registration(classOne, scoutAmy, "enrolled", testNow)

	resp := f.send(http.MethodDelete, pathScouts+"/"+scoutAmy, tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusNoContent)
	if n := f.count(`SELECT count(*) FROM registrations`); n != 0 {
		t.Fatalf("registrations = %d, want 0", n)
	}
}
