package main

import (
	"fmt"
	"net/http"
	"slices"
	"strings"
	"testing"

	"mbu/api/internal/apierr"
)

// The moderation actions, as the last segment of their paths.
const (
	actionSubmit  = "submit"
	actionClose   = "close"
	actionApprove = "approve"
	actionReject  = "reject"
)

const (
	// pathReviewQueue is the Super-admin's review queue.
	pathReviewQueue = "/api/admin/universities/review-queue"
	// rejectBody is a reject body that passes its checks.
	rejectBody = `{"note":"Missing counselor disclaimers"}`
	// uidAdmin is the uid of tokenSuperAdmin.
	uidAdmin = "uid-admin"
	// statusNeedsReview is the status reserved for automated triage.
	statusNeedsReview = "needs_review"
	// msgUniversityNotFound is the 404 message of a missing University.
	msgUniversityNotFound = "University not found"
	// notAUUID is a path id that is not a uuid.
	notAUUID = "not-a-uuid"
	// uniFixtureClass is the Class insertClass gives a University.
	uniFixtureClass = "00000000-0000-4000-8000-0000000000c9"
)

// pathMove is the path of a moderation action on a University: the
// Chancellor's under /api/universities, the Super-admin's under
// /api/admin/universities.
func pathMove(id, action string) string {
	if action == actionApprove || action == actionReject {
		return "/api/admin/universities/" + id + "/" + action
	}
	return pathUniversity(id) + "/" + action
}

// moveBody is a body for the action that passes its checks.
func moveBody(action string) string {
	if action == actionReject {
		return rejectBody
	}
	return ""
}

// superAdminModerationRoutes is each route of #253 that only a
// Super-admin may call, with a body that passes its checks.
var superAdminModerationRoutes = []struct{ method, path, body string }{
	{http.MethodGet, pathReviewQueue, ""},
	{http.MethodPost, pathMove(uniOne, actionApprove), ""},
	{http.MethodPost, pathMove(uniOne, actionReject), rejectBody},
}

// moderationRoutes is each route of #253: submit and close, then the
// Super-admin's routes.
var moderationRoutes = slices.Concat([]struct{ method, path, body string }{
	{http.MethodPost, pathMove(uniOne, actionSubmit), ""},
	{http.MethodPost, pathMove(uniOne, actionClose), ""},
}, superAdminModerationRoutes)

// insertClass gives the University one Class.
func (f *usersFixture) insertClass(universityID, classID string) {
	f.t.Helper()
	f.exec(`INSERT INTO classes (id, university_id, badge_slug, badge_title, eagle_required, capacity)
		VALUES ($1, $2, 'camping', 'Camping', false, 10)`, classID, universityID)
}

// statusOf reads the status of University one.
func (f *usersFixture) statusOf() string {
	f.t.Helper()
	var s string
	if err := f.db.Admin.QueryRowContext(f.t.Context(), `SELECT status FROM universities WHERE id = $1`, uniOne).Scan(&s); err != nil {
		f.t.Fatalf("read status: %v", err)
	}
	return s
}

// moderationFixture is University one in status, with one Class, and
// the Parent as its Chancellor.
func moderationFixture(t *testing.T, status string) *usersFixture {
	t.Helper()
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	f.university(uniOne, status)
	f.insertClass(uniOne, uniFixtureClass)
	f.grant(uniOne, "")
	return f
}

func TestModerationRoutes_RefuseAMissingAndAnInvalidSession(t *testing.T) {
	f := moderationFixture(t, statusSubmitted)
	for _, r := range moderationRoutes {
		t.Run(r.method+" "+r.path, func(t *testing.T) {
			resp := f.send(r.method, r.path, "", r.body)
			defer resp.Body.Close()
			wantRefusal(t, resp, http.StatusUnauthorized, apierr.CodeUnauthorized)

			resp = f.send(r.method, r.path, tokenNoSession, r.body)
			defer resp.Body.Close()
			wantRefusal(t, resp, http.StatusUnauthorized, apierr.CodeUnauthorized)
		})
	}
	if s := f.statusOf(); s != statusSubmitted {
		t.Fatalf("status = %q, want the fixture unchanged", s)
	}
}

// A Super-admin passes every role check with no query, so the first
// read of each route is the one that fails.
func TestModerationRoutes_ADatabaseFailureIsInternal(t *testing.T) {
	d := testDeps()
	f := closedFixture(t, d)
	for _, r := range moderationRoutes {
		t.Run(r.method+" "+r.path, func(t *testing.T) {
			resp := f.send(r.method, r.path, tokenSuperAdmin, r.body)
			defer resp.Body.Close()
			got := wantRefusal(t, resp, http.StatusInternalServerError, apierr.CodeInternal)
			if got.Message != apierr.MsgInternalError {
				t.Fatalf("message = %q, want no detail", got.Message)
			}
		})
	}
}

// The admin routes refuse a caller without the superAdmin claim, even
// the University's Chancellor.
func TestAdminModerationRoutes_RefuseACallerWhoIsNotASuperAdmin(t *testing.T) {
	f := moderationFixture(t, statusSubmitted)
	for _, r := range superAdminModerationRoutes {
		t.Run(r.method+" "+r.path, func(t *testing.T) {
			resp := f.send(r.method, r.path, tokenParent, r.body)
			defer resp.Body.Close()
			got := wantRefusal(t, resp, http.StatusForbidden, apierr.CodeForbidden)
			if got.Message != "Super-admin privileges required" {
				t.Fatalf("message = %q", got.Message)
			}
		})
	}
	if s := f.statusOf(); s != statusSubmitted {
		t.Fatalf("status = %q, want the fixture unchanged", s)
	}
}

// Submit and close are for the University's Chancellor or a
// Super-admin. A Super-admin gets 404 for a University that does not
// exist, where anyone else gets 403 first.
func TestSubmitAndClose_OnlyTheChancellorOrASuperAdmin(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	f.university(uniOne, statusDraft)
	f.insertClass(uniOne, uniFixtureClass)
	for _, action := range []string{actionSubmit, actionClose} {
		t.Run(action, func(t *testing.T) {
			resp := f.send(http.MethodPost, pathMove(uniOne, action), tokenParent, "")
			defer resp.Body.Close()
			wantRefusal(t, resp, http.StatusForbidden, apierr.CodeForbidden)

			resp = f.send(http.MethodPost, pathMove(uniMissing, action), tokenParent, "")
			defer resp.Body.Close()
			wantRefusal(t, resp, http.StatusForbidden, apierr.CodeForbidden)

			resp = f.send(http.MethodPost, pathMove(uniMissing, action), tokenSuperAdmin, "")
			defer resp.Body.Close()
			wantRefusal(t, resp, http.StatusNotFound, apierr.CodeNotFound)
		})
	}
	if s := f.statusOf(); s != statusDraft {
		t.Fatalf("status = %q, want the fixture unchanged", s)
	}
}

// Approve and reject answer 404 for a University that does not exist,
// or for an id that is not a uuid.
func TestApproveAndReject_AMissingUniversityIsNotFound(t *testing.T) {
	f := newUsersFixture(t)
	for _, action := range []string{actionApprove, actionReject} {
		for _, id := range []string{uniMissing, notAUUID} {
			resp := f.send(http.MethodPost, pathMove(id, action), tokenSuperAdmin, moveBody(action))
			got := wantRefusal(t, resp, http.StatusNotFound, apierr.CodeNotFound)
			_ = resp.Body.Close()
			if got.Message != msgUniversityNotFound {
				t.Fatalf("%s %s: message = %q", action, id, got.Message)
			}
		}
	}
}

// legalMove is the University Status state machine, written out here
// apart from the code: the status each action reaches from each status
// that allows it.
var legalMove = map[string]map[string]string{
	statusDraft:       {actionSubmit: statusSubmitted},
	statusRejected:    {actionSubmit: statusSubmitted},
	statusSubmitted:   {actionApprove: statusPublished, actionReject: statusRejected},
	statusPublished:   {actionClose: statusClosed},
	statusClosed:      {},
	statusNeedsReview: {},
}

// actionTarget is the status each action asks for.
var actionTarget = map[string]string{
	actionSubmit:  statusSubmitted,
	actionApprove: statusPublished,
	actionReject:  statusRejected,
	actionClose:   statusClosed,
}

// actionAudit is the columns each action stamps with the time and the
// caller's uid.
var actionAudit = map[string]struct{ at, by string }{
	actionSubmit:  {"submitted_at", "submitted_by_uid"},
	actionApprove: {"reviewed_at", "reviewed_by_uid"},
	actionReject:  {"reviewed_at", "reviewed_by_uid"},
	actionClose:   {"closed_at", "closed_by_uid"},
}

// actionToken is the caller each action runs as: the Chancellor for
// submit and close, the Super-admin for approve and reject.
func actionToken(action string) (token, uid string) {
	if action == actionApprove || action == actionReject {
		return tokenSuperAdmin, uidAdmin
	}
	return tokenParent, uidParent
}

// Each (status, action) pair: a move in the state machine answers 200
// with the new status and stamps who moved it and when; every other
// pair is 409 FAILED_PRECONDITION and changes nothing.
func TestModeration_EveryStatusAndAction(t *testing.T) {
	for from, moves := range legalMove {
		for _, action := range []string{actionSubmit, actionApprove, actionReject, actionClose} {
			t.Run(from+" "+action, func(t *testing.T) {
				f := moderationFixture(t, from)
				token, uid := actionToken(action)
				resp := f.send(http.MethodPost, pathMove(uniOne, action), token, moveBody(action))
				defer resp.Body.Close()
				to, legal := moves[action]
				if !legal {
					got := wantRefusal(t, resp, http.StatusConflict, apierr.CodeFailedPrecondition)
					want := fmt.Sprintf("Cannot transition from %s to %s", from, actionTarget[action])
					if got.Message != want {
						t.Fatalf("message = %q, want %q", got.Message, want)
					}
					if s := f.statusOf(); s != from {
						t.Fatalf("status = %q, want %q unchanged", s, from)
					}
					return
				}
				wantStatus(t, resp, http.StatusOK)
				if got := decode[struct{ Status string }](t, resp).Status; got != to {
					t.Fatalf("body status = %q, want %q", got, to)
				}
				audit := actionAudit[action]
				n := f.count(`SELECT count(*) FROM universities WHERE id = $1 AND status = $2
					AND `+audit.at+` = $3 AND `+audit.by+` = $4 AND updated_at = $3`, uniOne, to, testNow, uid)
				if n != 1 {
					t.Fatalf("the row does not hold status %s, %s and %s", to, audit.at, audit.by)
				}
			})
		}
	}
}

func TestSubmit_ClearsTheReviewNoteAndAnswersTheUniversity(t *testing.T) {
	f := moderationFixture(t, statusRejected)
	resp := f.send(http.MethodPost, pathMove(uniOne, actionSubmit), tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	wantJSONBody(t, resp, `{"id":"00000000-0000-4000-8000-000000000001","title":"MBU","status":"submitted",
		"timezone":"America/New_York","startDate":"2027-04-10T13:00:00.000Z","endDate":null,
		"registrationOpensAt":null,"registrationClosesAt":"2027-04-01T00:00:00.000Z",
		"location":{"name":"HS","address":"1 Main","city":"Town","state":"VA","zip":"22000"},
		"createdByUid":"uid-parent","reviewNote":null,"submittedAt":"2027-03-06T09:00:00.000Z",
		"createdAt":"`+f.createdAt()+`","updatedAt":"2027-03-06T09:00:00.000Z"}`)
}

// createdAt reads University one's created_at in the wire format.
func (f *usersFixture) createdAt() string {
	f.t.Helper()
	var s string
	err := f.db.Admin.QueryRowContext(f.t.Context(), `SELECT to_char(created_at AT TIME ZONE 'UTC',
		'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') FROM universities WHERE id = $1`, uniOne).Scan(&s)
	if err != nil {
		f.t.Fatalf("read created_at: %v", err)
	}
	return s
}

func TestSubmit_AUniversityWithNoClassesIsABadRequest(t *testing.T) {
	f := moderationFixture(t, statusDraft)
	f.exec(`DELETE FROM classes`)
	resp := f.send(http.MethodPost, pathMove(uniOne, actionSubmit), tokenParent, "")
	defer resp.Body.Close()
	got := wantRefusal(t, resp, http.StatusBadRequest, apierr.CodeInvalidArgument)
	if got.Message != "At least one class is required to submit for review" || got.Details != nil {
		t.Fatalf("refusal = %+v", got)
	}
	if s := f.statusOf(); s != statusDraft {
		t.Fatalf("status = %q, want draft", s)
	}
}

func TestApprove_PublishesAndClearsTheReviewNote(t *testing.T) {
	f := moderationFixture(t, statusSubmitted)
	f.exec(`UPDATE universities SET review_note = 'old' WHERE id = $1`, uniOne)
	resp := f.send(http.MethodPost, pathMove(uniOne, actionApprove), tokenSuperAdmin, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	if note := decode[struct{ ReviewNote *string }](t, resp).ReviewNote; note != nil {
		t.Fatalf("reviewNote = %q, want null", *note)
	}
	if n := f.count(`SELECT count(*) FROM universities WHERE id = $1 AND published_at = $2
		AND review_note IS NULL`, uniOne, testNow); n != 1 {
		t.Fatal("approve did not stamp published_at and clear the review note")
	}
}

// Reject stores the note without the white space around it, and a
// later move keeps the reviewer's audit pair.
func TestReject_RecordsTheReviewNote(t *testing.T) {
	f := moderationFixture(t, statusSubmitted)
	resp := f.send(http.MethodPost, pathMove(uniOne, actionReject), tokenSuperAdmin,
		`{"note":"  Missing counselor disclaimers \n"}`)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	body := decode[struct{ Status, ReviewNote string }](t, resp)
	if body.Status != statusRejected || body.ReviewNote != "Missing counselor disclaimers" {
		t.Fatalf("body = %+v", body)
	}

	resp = f.send(http.MethodPost, pathMove(uniOne, actionSubmit), tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	if n := f.count(`SELECT count(*) FROM universities WHERE id = $1 AND reviewed_by_uid = $2
		AND reviewed_at IS NOT NULL AND review_note IS NULL`, uniOne, uidAdmin); n != 1 {
		t.Fatal("the resubmit cleared the reviewer's audit pair or kept the note")
	}
}

func TestReject_RefusesABadNote(t *testing.T) {
	const msgWantNote = "Enter a review note of 1 to 2000 characters."
	f := moderationFixture(t, statusSubmitted)
	for name, body := range map[string]string{
		"left out":           `{}`,
		"null":               `{"note":null}`,
		"not text":           `{"note":7}`,
		"empty":              `{"note":""}`,
		"blank":              `{"note":"   "}`,
		"too long":           `{"note":"` + strings.Repeat("é", 2001) + `"}`,
		"too long in UTF-16": `{"note":"` + strings.Repeat("😀", 1001) + `"}`,
		"not an obj":         `[]`,
		"no body":            ``,
	} {
		t.Run(name, func(t *testing.T) {
			resp := f.send(http.MethodPost, pathMove(uniOne, actionReject), tokenSuperAdmin, body)
			defer resp.Body.Close()
			got := wantRefusal(t, resp, http.StatusBadRequest, apierr.CodeInvalidArgument)
			if name == "not an obj" || name == "no body" {
				return
			}
			if got.Details["note"] != msgWantNote {
				t.Fatalf("details = %v", got.Details)
			}
		})
	}
	resp := f.send(http.MethodPost, pathMove(uniOne, actionReject), tokenSuperAdmin,
		`{"note":"`+strings.Repeat("😀", 1000)+`"}`)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
}

// submittedUniversity inserts a submitted University created by
// createdBy, submitted at submittedAt.
func (f *usersFixture) submittedUniversity(id, title, createdBy, submittedAt string) {
	f.t.Helper()
	f.exec(`INSERT INTO universities (id, title, status, timezone, start_date, registration_closes_at,
		location_name, location_address, location_city, location_state, location_zip, created_by_uid, submitted_at)
		VALUES ($1, $2, 'submitted', 'America/New_York', '2027-05-01T13:00:00Z', '2027-04-20T00:00:00Z',
		'HS', '1 Main', 'Town', 'VA', '22000', $3, $4)`, id, title, createdBy, submittedAt)
}

// The queue holds the submitted Universities, oldest submission first,
// with the creator's name and email ("" when the account is gone) and
// the Class count.
func TestReviewQueue_ListsTheSubmittedUniversitiesOldestFirst(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	f.exec(`UPDATE users SET display_name = 'Pat Parent' WHERE uid = $1`, uidParent)
	f.university(uniOne, statusDraft)
	f.submittedUniversity(uniTwo, "Late MBU", uidParent, "2027-03-05T00:00:00Z")
	f.submittedUniversity(createdID, "Early MBU", "uid-gone", "2027-03-01T00:00:00Z")
	f.insertClass(uniTwo, classOne)
	f.insertClass(uniTwo, classTwo)
	f.insertClass(uniOne, uniFixtureClass)

	resp := f.send(http.MethodGet, pathReviewQueue, tokenSuperAdmin, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	wantJSONBody(t, resp, `{"universities":[
		{"id":"11111111-1111-4111-8111-111111111111","title":"Early MBU","chancellorName":"",
		 "chancellorEmail":"","submittedAt":"2027-03-01T00:00:00.000Z","classCount":0,
		 "startDate":"2027-05-01T13:00:00.000Z"},
		{"id":"00000000-0000-4000-8000-000000000002","title":"Late MBU","chancellorName":"Pat Parent",
		 "chancellorEmail":"parent@example.com","submittedAt":"2027-03-05T00:00:00.000Z","classCount":2,
		 "startDate":"2027-05-01T13:00:00.000Z"}]}`)
}

func TestReviewQueue_AnEmptyQueueIsAnEmptyList(t *testing.T) {
	f := newUsersFixture(t)
	resp := f.send(http.MethodGet, pathReviewQueue, tokenSuperAdmin, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	wantJSONBody(t, resp, `{"universities":[]}`)
}

// The queue answers at most 200 rows, the oldest submissions.
func TestReviewQueue_AnswersAtMost200(t *testing.T) {
	f := newUsersFixture(t)
	f.exec(`INSERT INTO universities (id, title, status, timezone, start_date, registration_closes_at,
		location_name, location_address, location_city, location_state, location_zip, created_by_uid, submitted_at)
		SELECT gen_random_uuid()::text, 'MBU ' || n, 'submitted', 'America/New_York', '2027-05-01T13:00:00Z',
		'2027-04-20T00:00:00Z', 'HS', '1 Main', 'Town', 'VA', '22000', 'uid-x',
		'2027-01-01T00:00:00Z'::timestamptz + n * interval '1 minute'
		FROM generate_series(1, 201) AS n`)
	resp := f.send(http.MethodGet, pathReviewQueue, tokenSuperAdmin, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)
	rows := decode[struct{ Universities []struct{ Title string } }](t, resp).Universities
	if len(rows) != 200 || rows[0].Title != "MBU 1" || rows[199].Title != "MBU 200" {
		t.Fatalf("rows = %d, first %q, last %q", len(rows), rows[0].Title, rows[len(rows)-1].Title)
	}
}
