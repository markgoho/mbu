package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"mbu/api/internal/apierr"
	"mbu/api/internal/apierrtest"
	"mbu/api/internal/authntest"
	"mbu/api/internal/testdb"
)

const (
	pathMe        = "/api/users/me"
	pathRosterAck = "/api/users/me/roster-export-ack"
	uidParent     = "uid-parent"
	emailParent   = "parent@example.com"
	// testNowISO is testNow as the API writes it.
	testNowISO = "2027-03-06T09:00:00.000Z"
	// The fixture ids: a University, two Classes of it, and Scouts.
	uniOne      = "00000000-0000-4000-8000-000000000001"
	uniTwo      = "00000000-0000-4000-8000-000000000002"
	classOne    = "00000000-0000-4000-8000-0000000000c1"
	classTwo    = "00000000-0000-4000-8000-0000000000c2"
	scoutAmy    = "00000000-0000-4000-8000-0000000000a1"
	scoutBen    = "00000000-0000-4000-8000-0000000000a2"
	scoutOther  = "00000000-0000-4000-8000-0000000000b1"
	scoutOther2 = "00000000-0000-4000-8000-0000000000b2"
	uidOther    = "uid-other"
	// The JSON field names of the onboarding body.
	fieldDisplayName   = "displayName"
	fieldAcceptedTerms = "acceptedTerms"
)

// usersFixture is the route table over a fresh database, with the fake
// Auth account manager a test can read.
type usersFixture struct {
	t        *testing.T
	db       *testdb.DB
	accounts *authntest.Accounts
	h        http.Handler
	// now is what the request clock reads; a test may move it.
	now time.Time
}

func newUsersFixture(t *testing.T) *usersFixture {
	t.Helper()
	f := &usersFixture{t: t, db: testdb.New(t), accounts: &authntest.Accounts{}, now: testNow}
	d := testDeps()
	d.DB = f.db.App
	d.Accounts = f.accounts
	d.Now = func() time.Time { return f.now }
	f.h = routes(d)
	return f
}

// send sends one request with a JSON body ("" sends none).
func (f *usersFixture) send(method, path, token, body string) *http.Response {
	f.t.Helper()
	req := httptest.NewRequestWithContext(f.t.Context(), method, path, strings.NewReader(body))
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rec := httptest.NewRecorder()
	f.h.ServeHTTP(rec, req)
	return rec.Result()
}

// exec runs fixture SQL as the superuser.
func (f *usersFixture) exec(query string, args ...any) {
	f.t.Helper()
	if _, err := f.db.Admin.ExecContext(f.t.Context(), query, args...); err != nil {
		f.t.Fatalf("fixture %q: %v", query, err)
	}
}

// count runs a count query as the superuser.
func (f *usersFixture) count(query string, args ...any) int {
	f.t.Helper()
	var n int
	if err := f.db.Admin.QueryRowContext(f.t.Context(), query, args...).Scan(&n); err != nil {
		f.t.Fatalf("count %q: %v", query, err)
	}
	return n
}

// user inserts a users row.
func (f *usersFixture) user(uid, email string) {
	f.t.Helper()
	f.exec(`INSERT INTO users (uid, email) VALUES ($1, $2)`, uid, email)
}

// university inserts a University with the given status and the
// timestamps its CHECK constraints need.
func (f *usersFixture) university(id, status string) {
	f.t.Helper()
	f.exec(`INSERT INTO universities (id, title, status, timezone, start_date, registration_closes_at,
		location_name, location_address, location_city, location_state, location_zip, created_by_uid,
		submitted_at, published_at, review_note, closed_at)
		VALUES ($1, 'MBU', $2, 'America/New_York', '2027-04-10T13:00:00Z', '2027-04-01T00:00:00Z',
		'HS', '1 Main', 'Town', 'VA', '22000', $3, $4, $5, $6, $7)`,
		id, status, uidParent,
		nullUnless(status == "submitted", testNow), nullUnless(status == "published" || status == "closed", testNow),
		nullUnless(status == "rejected", "no"), nullUnless(status == "closed", testNow))
}

// nullUnless is v when ok, else NULL.
func nullUnless(ok bool, v any) any {
	if ok {
		return v
	}
	return nil
}

// class inserts a Class of University one with the given Capacity.
func (f *usersFixture) class(id string, capacity int) {
	f.t.Helper()
	f.exec(`INSERT INTO classes (id, university_id, badge_slug, badge_title, eagle_required, capacity)
		VALUES ($1, $2, 'camping', 'Camping', false, $3)`, id, uniOne, capacity)
}

// scout inserts a Scout of the Parent.
func (f *usersFixture) scout(id, parentUID string) {
	f.t.Helper()
	f.exec(`INSERT INTO scouts (id, parent_uid, first_name, last_name) VALUES ($1, $2, 'S', 'P')`, id, parentUID)
}

// registration inserts a Registration. at is its enrolled_at or
// waitlisted_at, by status.
func (f *usersFixture) registration(classID, scoutID, status string, at time.Time) {
	f.t.Helper()
	f.exec(`INSERT INTO registrations (class_id, scout_id, status, enrolled_at, waitlisted_at,
		parent_consent_at, accepted_policy_version, scout_first_name, scout_last_name, parent_name, parent_email)
		VALUES ($1, $2, $3, $4, $5, $6, '2026-07-04', 'S', 'P', 'Pat', 'pat@example.com')`,
		classID, scoutID, status,
		nullUnless(status != "waitlisted", at), nullUnless(status == "waitlisted", at), at)
}

// grant gives the Parent an active Role Grant: chancellor when classID
// is "", else counselor of the Class.
func (f *usersFixture) grant(universityID, classID string) {
	f.t.Helper()
	role := "counselor"
	if classID == "" {
		role = "chancellor"
	}
	f.exec(`INSERT INTO role_grants (role, university_id, class_id, uid, status)
		VALUES ($1, $2, NULLIF($3, '')::uuid, $4, 'active')`, role, universityID, classID, uidParent)
}

// invite inserts a pending invite on University one: chancellor when
// classID is "", else counselor of the Class.
func (f *usersFixture) invite(email, classID string) {
	f.t.Helper()
	role := "counselor"
	if classID == "" {
		role = "chancellor"
	}
	f.exec(`INSERT INTO role_grants (role, university_id, class_id, invited_email, status)
		VALUES ($1, $2, NULLIF($3, '')::uuid, $4, 'invited')`, role, uniOne, classID, email)
}

// closedDB is a pool that fails every query, for the 500 path.
func closedDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("pgx", "postgres://app:secret@127.0.0.1:1/mbu?sslmode=disable")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	_ = db.Close()
	return db
}

// decode reads a JSON success body.
func decode[T any](t *testing.T, resp *http.Response) T {
	t.Helper()
	var v T
	if err := json.NewDecoder(resp.Body).Decode(&v); err != nil {
		t.Fatalf("decode: %v", err)
	}
	return v
}

// wantStatus fails unless resp has status.
func wantStatus(t *testing.T, resp *http.Response, status int) {
	t.Helper()
	if resp.StatusCode != status {
		t.Fatalf("status = %d, want %d", resp.StatusCode, status)
	}
}

// wantRefusal fails unless resp is a refusal with status and code.
func wantRefusal(t *testing.T, resp *http.Response, status int, code apierr.Code) apierr.APIError {
	t.Helper()
	wantStatus(t, resp, status)
	got := apierrtest.Decode(t, resp)
	if got.Code != code {
		t.Fatalf("code = %q, want %q", got.Code, code)
	}
	return got
}

// usersRoutes is each /api/users/me route with a body that passes its
// checks.
var usersRoutes = []struct{ method, path, body string }{
	{http.MethodPost, pathMe, ""},
	{http.MethodGet, pathMe, ""},
	{http.MethodPatch, pathMe, `{"displayName":"Pat Parent","acceptedTerms":true}`},
	{http.MethodDelete, pathMe, ""},
	{http.MethodPost, pathRosterAck, ""},
}

func TestUsersRoutes_RefuseAMissingTokenAndAnUnverifiedEmail(t *testing.T) {
	f := newUsersFixture(t)
	for _, r := range usersRoutes {
		t.Run(r.method+" "+r.path, func(t *testing.T) {
			resp := f.send(r.method, r.path, "", r.body)
			defer resp.Body.Close()
			wantRefusal(t, resp, http.StatusUnauthorized, apierr.CodeUnauthorized)

			resp = f.send(r.method, r.path, tokenUnverified, r.body)
			defer resp.Body.Close()
			wantRefusal(t, resp, http.StatusForbidden, apierr.CodeEmailNotVerified)
		})
	}
	if n := f.count(`SELECT count(*) FROM users`); n != 0 {
		t.Fatalf("users rows = %d, want 0", n)
	}
}

func TestUsersRoutes_ADatabaseFailureIsInternal(t *testing.T) {
	d := testDeps()
	d.DB = closedDB(t)
	d.Accounts = &authntest.Accounts{}
	f := &usersFixture{t: t, h: routes(d)}
	for _, r := range usersRoutes {
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

func TestBootstrap_CreatesTheAccountAndAsksForConsent(t *testing.T) {
	f := newUsersFixture(t)

	resp := f.send(http.MethodPost, pathMe, tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)

	// The literal body the app's BootstrapResponse type reads: the email
	// is the token's, lowercased; every optional field is null.
	got := decode[map[string]any](t, resp)
	want := map[string]any{
		"needsConsent": true,
		"user": map[string]any{
			"uid": uidParent, fieldDisplayName: "", "email": emailParent, "phone": nil,
			"acceptedTermsAt": nil, "acceptedPrivacyAt": nil, "acceptedPolicyVersion": nil, "rosterExportAckAt": nil,
		},
	}
	gotJSON, _ := json.Marshal(got)
	wantJSON, _ := json.Marshal(want)
	if string(gotJSON) != string(wantJSON) {
		t.Fatalf("body = %s, want %s", gotJSON, wantJSON)
	}
}

func TestBootstrap_TwiceKeepsOneRowAndRewritesTheEmail(t *testing.T) {
	f := newUsersFixture(t)
	f.exec(`INSERT INTO users (uid, display_name, email, accepted_terms_at, accepted_privacy_at,
		accepted_policy_version) VALUES ($1, 'Pat', 'old@example.com', $2, $2, '2026-07-04')`, uidParent, testNow)

	for range 2 {
		resp := f.send(http.MethodPost, pathMe, tokenParent, "")
		wantStatus(t, resp, http.StatusOK)
		got := decode[bootstrapBody](t, resp)
		_ = resp.Body.Close()
		if got.NeedsConsent || got.User.Email != emailParent || got.User.DisplayName != "Pat" ||
			got.User.AcceptedTermsAt == nil || *got.User.AcceptedTermsAt != testNowISO {
			t.Fatalf("body = %+v, want the onboarded account with the token's email", got)
		}
	}
	if n := f.count(`SELECT count(*) FROM users WHERE uid = $1 AND email = $2`, uidParent, emailParent); n != 1 {
		t.Fatalf("users rows = %d, want 1 with the token's email", n)
	}
}

// bootstrapBody is the decoded body of POST /api/users/me.
type bootstrapBody struct {
	User         userBody `json:"user"`
	NeedsConsent bool     `json:"needsConsent"`
}

// userBody is the decoded body of a UserResponse.
type userBody struct {
	UID                   string  `json:"uid"`
	DisplayName           string  `json:"displayName"`
	Email                 string  `json:"email"`
	Phone                 *string `json:"phone"`
	AcceptedTermsAt       *string `json:"acceptedTermsAt"`
	AcceptedPrivacyAt     *string `json:"acceptedPrivacyAt"`
	AcceptedPolicyVersion *string `json:"acceptedPolicyVersion"`
	RosterExportAckAt     *string `json:"rosterExportAckAt"`
}

func TestBootstrap_ClaimsEachPendingInvite(t *testing.T) {
	f := newUsersFixture(t)
	f.user("uid-chancellor", "jane@example.com")
	f.university(uniOne, "draft")
	f.class(classOne, 10)
	f.invite(emailParent, "")
	f.invite(emailParent, classOne)
	f.invite("someone@example.com", classOne)

	resp := f.send(http.MethodPost, pathMe, tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)

	if n := f.count(`SELECT count(*) FROM role_grants WHERE uid = $1 AND status = 'active'`, uidParent); n != 2 {
		t.Fatalf("active grants of the caller = %d, want 2", n)
	}
	if n := f.count(`SELECT count(*) FROM role_grants WHERE invited_email = 'someone@example.com' AND status = 'invited'`); n != 1 {
		t.Fatalf("the invite to another email = %d pending, want 1", n)
	}
}

func TestBootstrap_RevokesAnInviteForAGrantTheAccountHolds(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	f.university(uniOne, "draft")
	f.class(classOne, 10)
	f.grant(uniOne, classOne)
	f.invite(emailParent, classOne)

	resp := f.send(http.MethodPost, pathMe, tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)

	if n := f.count(`SELECT count(*) FROM role_grants WHERE invited_email = $1 AND status = 'revoked' AND uid IS NULL`, emailParent); n != 1 {
		t.Fatalf("revoked invites = %d, want 1", n)
	}
	if n := f.count(`SELECT count(*) FROM role_grants WHERE uid = $1 AND status = 'active'`, uidParent); n != 1 {
		t.Fatalf("active grants = %d, want the one held before", n)
	}
}

func TestBootstrap_AnInviteRestoresARevokedGrant(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	f.university(uniOne, "draft")
	f.exec(`INSERT INTO role_grants (role, university_id, uid, status)
		VALUES ('chancellor', $1, $2, 'revoked')`, uniOne, uidParent)
	f.invite(emailParent, "")

	resp := f.send(http.MethodPost, pathMe, tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)

	if n := f.count(`SELECT count(*) FROM role_grants WHERE uid = $1 AND status = 'active'`, uidParent); n != 1 {
		t.Fatalf("active grants = %d, want the revoked one restored", n)
	}
	if n := f.count(`SELECT count(*) FROM role_grants WHERE invited_email = $1 AND status = 'revoked'`, emailParent); n != 1 {
		t.Fatalf("revoked invites = %d, want 1", n)
	}
}

func TestGetMe(t *testing.T) {
	f := newUsersFixture(t)

	resp := f.send(http.MethodGet, pathMe, tokenParent, "")
	defer resp.Body.Close()
	wantRefusal(t, resp, http.StatusNotFound, apierr.CodeNotFound)

	// No route writes phone; the column stays for the contract.
	f.exec(`INSERT INTO users (uid, display_name, email, phone, roster_export_ack_at)
		VALUES ($1, 'Pat', $2, '555-0100', '2027-03-06T09:00:00.123456Z')`, uidParent, emailParent)
	resp = f.send(http.MethodGet, pathMe, tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	got := decode[userBody](t, resp)
	if got.UID != uidParent || got.DisplayName != "Pat" || got.Phone == nil || *got.Phone != "555-0100" ||
		got.RosterExportAckAt == nil ||
		*got.RosterExportAckAt != "2027-03-06T09:00:00.123Z" || got.AcceptedTermsAt != nil {
		t.Fatalf("body = %+v", got)
	}
}

func TestOnboard_RecordsTheNameAndTheAcceptance(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)

	resp := f.send(http.MethodPatch, pathMe, tokenParent, `{"displayName":"Pat Parent","acceptedTerms":true}`)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	got := decode[userBody](t, resp)
	if got.DisplayName != "Pat Parent" || got.AcceptedTermsAt == nil || *got.AcceptedTermsAt != testNowISO ||
		got.AcceptedPrivacyAt == nil || *got.AcceptedPrivacyAt != testNowISO ||
		got.AcceptedPolicyVersion == nil || *got.AcceptedPolicyVersion != "2026-07-04" {
		t.Fatalf("body = %+v", got)
	}

	// The next bootstrap needs no consent.
	resp = f.send(http.MethodPost, pathMe, tokenParent, "")
	defer resp.Body.Close()
	if decode[bootstrapBody](t, resp).NeedsConsent {
		t.Fatal("needsConsent = true after onboarding")
	}
}

func TestOnboard_RefusesABodyThatFailsTheRules(t *testing.T) {
	tests := []struct {
		name    string
		body    string
		details []string
	}{
		{"no accepted terms", `{"displayName":"Pat"}`, []string{fieldAcceptedTerms}},
		{"terms not accepted", `{"displayName":"Pat","acceptedTerms":false}`, []string{fieldAcceptedTerms}},
		{"terms of the wrong type", `{"displayName":"Pat","acceptedTerms":"yes"}`, []string{fieldAcceptedTerms}},
		{"an empty name", `{"displayName":"","acceptedTerms":true}`, []string{fieldDisplayName}},
		{"nothing", `{}`, []string{fieldAcceptedTerms, fieldDisplayName}},
		{"a name of the wrong type", `{"displayName":7,"acceptedTerms":true}`, []string{fieldDisplayName}},
	}
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := f.send(http.MethodPatch, pathMe, tokenParent, tt.body)
			defer resp.Body.Close()
			got := wantRefusal(t, resp, http.StatusBadRequest, apierr.CodeInvalidArgument)
			if len(got.Details) != len(tt.details) {
				t.Fatalf("details = %v, want keys %v", got.Details, tt.details)
			}
			for _, key := range tt.details {
				if got.Details[key] == "" {
					t.Fatalf("details = %v, want a %s entry", got.Details, key)
				}
			}
		})
	}

	resp := f.send(http.MethodPatch, pathMe, tokenParent, `{not json`)
	defer resp.Body.Close()
	wantRefusal(t, resp, http.StatusBadRequest, apierr.CodeInvalidArgument)

	if n := f.count(`SELECT count(*) FROM users WHERE accepted_terms_at IS NULL AND display_name = ''`); n != 1 {
		t.Fatal("a refused body changed the account")
	}
}

func TestOnboard_BeforeBootstrapIsNotFound(t *testing.T) {
	f := newUsersFixture(t)
	resp := f.send(http.MethodPatch, pathMe, tokenParent, `{"displayName":"Pat","acceptedTerms":true}`)
	defer resp.Body.Close()
	if got := wantRefusal(t, resp, http.StatusNotFound, apierr.CodeNotFound); got.Message != "User not found; bootstrap the session first" {
		t.Fatalf("message = %q", got.Message)
	}
}

func TestAckRosterExport_StampsOnce(t *testing.T) {
	f := newUsersFixture(t)

	resp := f.send(http.MethodPost, pathRosterAck, tokenParent, "")
	defer resp.Body.Close()
	wantRefusal(t, resp, http.StatusNotFound, apierr.CodeNotFound)

	f.user(uidParent, emailParent)
	resp = f.send(http.MethodPost, pathRosterAck, tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	if got := decode[userBody](t, resp); got.RosterExportAckAt == nil || *got.RosterExportAckAt != testNowISO {
		t.Fatalf("rosterExportAckAt = %v, want %s", got.RosterExportAckAt, testNowISO)
	}

	f.now = testNow.Add(time.Hour)
	resp = f.send(http.MethodPost, pathRosterAck, tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	if got := decode[userBody](t, resp); got.RosterExportAckAt == nil || *got.RosterExportAckAt != testNowISO {
		t.Fatalf("second rosterExportAckAt = %v, want the first stamp %s", got.RosterExportAckAt, testNowISO)
	}
}

func TestDeleteAccount_RefusesAChancellorOfAnOpenUniversity(t *testing.T) {
	for _, status := range []string{"submitted", "needs_review", "published", "rejected"} {
		t.Run(status, func(t *testing.T) {
			f := newUsersFixture(t)
			f.user(uidParent, emailParent)
			f.university(uniOne, status)
			f.grant(uniOne, "")

			resp := f.send(http.MethodDelete, pathMe, tokenParent, "")
			defer resp.Body.Close()
			wantRefusal(t, resp, http.StatusForbidden, apierr.CodeCloseEventsFirst)

			if n := f.count(`SELECT count(*) FROM users WHERE uid = $1`, uidParent); n != 1 {
				t.Fatal("the refused delete removed the account")
			}
			if got := f.accounts.Deleted(); len(got) != 0 {
				t.Fatalf("Auth accounts deleted = %v, want none", got)
			}
		})
	}
}

func TestDeleteAccount_AChancellorOfDraftAndClosedUniversitiesMayGo(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	f.university(uniOne, "draft")
	f.university(uniTwo, "closed")
	f.grant(uniOne, "")
	f.grant(uniTwo, "")

	resp := f.send(http.MethodDelete, pathMe, tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusNoContent)

	if n := f.count(`SELECT count(*) FROM universities`); n != 2 {
		t.Fatalf("universities = %d, want both kept", n)
	}
	if n := f.count(`SELECT count(*) FROM role_grants`); n != 0 {
		t.Fatalf("role grants = %d, want 0", n)
	}
}

func TestDeleteAccount_ErasesTheAccountAndGivesFreedSeatsToTheWaitlist(t *testing.T) {
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
	// Scouts wait, the older first. In Class two, Ben waits behind the
	// other Parent's Scout, and Amy's old Registration is cancelled.
	f.registration(classOne, scoutAmy, "enrolled", testNow.Add(-3*time.Hour))
	f.registration(classOne, scoutOther2, "waitlisted", testNow.Add(-time.Hour))
	f.registration(classOne, scoutOther, "waitlisted", testNow.Add(-2*time.Hour))
	f.registration(classTwo, scoutOther, "enrolled", testNow.Add(-3*time.Hour))
	f.registration(classTwo, scoutBen, "waitlisted", testNow.Add(-2*time.Hour))
	f.exec(`INSERT INTO class_counselors (class_id, uid, bsa_id, disclaimer_accepted_at, disclaimer_version)
		VALUES ($1, $2, 'BSA-1', $3, '2026-07-03')`, classTwo, uidParent, testNow)
	f.grant(uniOne, classTwo)
	f.exec(`INSERT INTO idempotency_keys (uid, key, request_hash, status_code, response_body, created_at)
		VALUES ($1, 'k', '\x00', 201, '{}', $2)`, uidParent, testNow)

	resp := f.send(http.MethodDelete, pathMe, tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusNoContent)

	for query, want := range map[string]int{
		`SELECT count(*) FROM users WHERE uid = 'uid-parent'`:            0,
		`SELECT count(*) FROM scouts WHERE parent_uid = 'uid-parent'`:    0,
		`SELECT count(*) FROM registrations WHERE scout_id IN ($1, $2)`:  0,
		`SELECT count(*) FROM class_counselors WHERE uid = 'uid-parent'`: 0,
		`SELECT count(*) FROM role_grants WHERE uid = 'uid-parent'`:      0,
		`SELECT count(*) FROM idempotency_keys WHERE uid = 'uid-parent'`: 0,
	} {
		args := []any{}
		if strings.Contains(query, "$1") {
			args = []any{scoutAmy, scoutBen}
		}
		if got := f.count(query, args...); got != want {
			t.Errorf("%s = %d, want %d", query, got, want)
		}
	}

	// The older of the two waiting Scouts takes Amy's seat, enrolled now.
	var status string
	var enrolledAt time.Time
	var waitlistedAt sql.NullTime
	if err := f.db.Admin.QueryRowContext(t.Context(), `SELECT status, enrolled_at, waitlisted_at
		FROM registrations WHERE class_id = $1 AND scout_id = $2`, classOne, scoutOther).
		Scan(&status, &enrolledAt, &waitlistedAt); err != nil {
		t.Fatalf("read promoted: %v", err)
	}
	if status != "enrolled" || !enrolledAt.Equal(testNow) || waitlistedAt.Valid {
		t.Fatalf("promoted = %s %v %v, want enrolled at %v", status, enrolledAt, waitlistedAt, testNow)
	}
	if n := f.count(`SELECT count(*) FROM registrations WHERE class_id = $1 AND scout_id = $2 AND status = 'waitlisted'`,
		classOne, scoutOther2); n != 1 {
		t.Fatal("the younger waiting Scout moved, want it still waitlisted")
	}
	// Ben only waited, so Class two keeps its one enrolled Scout.
	if n := f.count(`SELECT count(*) FROM registrations WHERE class_id = $1 AND status = 'enrolled'`, classTwo); n != 1 {
		t.Fatalf("Class two enrolled = %d, want 1", n)
	}
	if got := f.accounts.Deleted(); len(got) != 1 || got[0] != uidParent {
		t.Fatalf("Auth accounts deleted = %v, want [%s]", got, uidParent)
	}
}

func TestDeleteAccount_AnEnrolledSeatWithNoWaitlistStaysFree(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	f.university(uniOne, "published")
	f.class(classOne, 5)
	f.scout(scoutAmy, uidParent)
	f.registration(classOne, scoutAmy, "enrolled", testNow)

	resp := f.send(http.MethodDelete, pathMe, tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusNoContent)
	if n := f.count(`SELECT count(*) FROM registrations`); n != 0 {
		t.Fatalf("registrations = %d, want 0", n)
	}
}

func TestDeleteAccount_AFailedAuthDeleteCanBeRetried(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	f.scout(scoutAmy, uidParent)
	f.accounts.Err = errors.New("auth is down")

	resp := f.send(http.MethodDelete, pathMe, tokenParent, "")
	defer resp.Body.Close()
	wantRefusal(t, resp, http.StatusInternalServerError, apierr.CodeInternal)
	// The data is gone first: a login with no data is left, never data
	// with no login.
	if n := f.count(`SELECT count(*) FROM users`); n != 0 {
		t.Fatalf("users = %d, want 0 after the database half", n)
	}

	f.accounts.Err = nil
	resp = f.send(http.MethodDelete, pathMe, tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusNoContent)
	if got := f.accounts.Deleted(); len(got) != 1 || got[0] != uidParent {
		t.Fatalf("Auth accounts deleted = %v, want [%s]", got, uidParent)
	}
}
