package main

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"testing"
	"time"

	"github.com/google/uuid"

	"mbu/api/internal/apierr"
	"mbu/api/internal/apierrtest"
	"mbu/api/internal/mail"
	"mbu/api/internal/outbox"
	"mbu/api/internal/regmail"
)

// The mail outbox (#257, ADR 0004). A seat change writes its mail row in
// its own transaction and sends nothing; the drain sends. These replace
// the emailLog cases of functions/src/registrations-api: the outbox row
// is the Youth-Protection audit record.

const (
	pathDrain = outbox.DrainPath
	// The subjects of the three kinds for Class one (Camping).
	subjectEnrolled   = "You're enrolled: Camping"
	subjectWaitlisted = "You're on the waitlist: Camping"
	subjectPromoted   = "A seat opened up: Camping"
	kindPromoted      = "promoted"
	// The outbox row statuses.
	mailPending = "pending"
	mailSent    = "sent"
	mailFailed  = "failed"
	// emailNew is the Parent's address after a change.
	emailNew = "new@example.com"
)

// mailRow is one outbox row as a test reads it.
type mailRow struct {
	kind, parent, scout, class, university, status string
	attempts                                       int
	nextAttemptAt, createdAt                       time.Time
	messageID, errorID, subject, toEmail           sql.NullString
	sentAt                                         sql.NullTime
}

// mailRows is every outbox row, oldest first.
func (f *usersFixture) mailRows() []mailRow {
	f.t.Helper()
	rows, err := f.db.Admin.QueryContext(f.t.Context(), `SELECT kind, to_parent_uid, scout_id, class_id,
		university_id, status, attempts, next_attempt_at, created_at, mailgun_message_id, error_id,
		subject, to_email, sent_at
		FROM registration_mail_outbox ORDER BY created_at, scout_id`)
	if err != nil {
		f.t.Fatalf("read outbox: %v", err)
	}
	defer rows.Close()
	var all []mailRow
	for rows.Next() {
		var m mailRow
		if err := rows.Scan(&m.kind, &m.parent, &m.scout, &m.class, &m.university, &m.status, &m.attempts,
			&m.nextAttemptAt, &m.createdAt, &m.messageID, &m.errorID, &m.subject, &m.toEmail, &m.sentAt); err != nil {
			f.t.Fatalf("scan outbox: %v", err)
		}
		all = append(all, m)
	}
	if err := rows.Err(); err != nil {
		f.t.Fatalf("read outbox: %v", err)
	}
	return all
}

// oneMail fails unless the outbox holds exactly one row, and returns it.
func (f *usersFixture) oneMail() mailRow {
	f.t.Helper()
	rows := f.mailRows()
	if len(rows) != 1 {
		f.t.Fatalf("outbox rows = %+v, want one", rows)
	}
	return rows[0]
}

// pendingMail inserts a pending mail of kind about the Scout in Class
// one, due at the fixture clock.
func (f *usersFixture) pendingMail(kind, scoutID string) {
	f.t.Helper()
	f.exec(`INSERT INTO registration_mail_outbox (kind, to_parent_uid, scout_id, class_id, university_id,
		next_attempt_at, created_at)
		SELECT $1, parent_uid, id, $3, $4, $5, $5 FROM scouts WHERE id = $2`, kind, scoutID, classOne, uniOne, f.now)
}

// drain calls the drain as the scheduler and wants 200.
func (f *usersFixture) drain() {
	f.t.Helper()
	resp := f.send(http.MethodPost, pathDrain, oidcScheduler, "")
	defer resp.Body.Close()
	wantStatus(f.t, resp, http.StatusOK)
}

// wantPending fails unless m is a pending row of kind about the Scout in
// Class one of the Parent, written at testNow and not yet tried.
func wantPending(t *testing.T, m mailRow, kind, parent, scout string) {
	t.Helper()
	if m.kind != kind || m.parent != parent || m.scout != scout || m.class != classOne || m.university != uniOne ||
		m.status != mailPending || m.attempts != 0 || !m.nextAttemptAt.Equal(testNow) || !m.createdAt.Equal(testNow) ||
		m.messageID.Valid || m.errorID.Valid || m.subject.Valid || m.toEmail.Valid || m.sentAt.Valid {
		t.Fatalf("outbox row = %+v, want a pending %s mail to %s about %s", m, kind, parent, scout)
	}
}

func TestRegister_WritesTheRegisteredMailAndSendsNothing(t *testing.T) {
	f := seatFixture(t)

	resp := f.send(http.MethodPost, pathRegister(classOne), tokenParent, registerAmy)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)

	wantPending(t, f.oneMail(), "registered", uidParent, scoutAmy)
	if sent := f.mail.Sent(); len(sent) != 0 {
		t.Fatalf("the request sent %d mails, want none", len(sent))
	}
}

func TestRegister_WritesTheWaitlistedMail(t *testing.T) {
	f := seatFixture(t)
	f.registration(classOne, scoutBen, statusEnrolled, testNow.Add(-time.Hour))

	resp := f.send(http.MethodPost, pathRegister(classOne), tokenParent, registerAmyWait)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusOK)

	wantPending(t, f.oneMail(), "waitlisted", uidParent, scoutAmy)
}

// TestRegister_ARefusalOrANoOpWritesNoMail: the refusals roll the
// transaction back, and an already active Registration sends no mail
// again (as the TypeScript).
func TestRegister_ARefusalOrANoOpWritesNoMail(t *testing.T) {
	for name, tc := range map[string]struct {
		setup func(f *usersFixture)
		body  string
		want  int
	}{
		"class full":    {func(f *usersFixture) { f.registration(classOne, scoutBen, statusEnrolled, testNow) }, registerAmy, http.StatusConflict},
		"no consent":    {func(*usersFixture) {}, `{"scoutId":"` + scoutAmy + `","acceptConsent":false}`, http.StatusForbidden},
		"already there": {func(f *usersFixture) { f.registration(classOne, scoutAmy, statusEnrolled, testNow) }, registerAmy, http.StatusOK},
	} {
		t.Run(name, func(t *testing.T) {
			f := seatFixture(t)
			tc.setup(f)
			resp := f.send(http.MethodPost, pathRegister(classOne), tokenParent, tc.body)
			defer resp.Body.Close()
			wantStatus(t, resp, tc.want)
			if rows := f.mailRows(); len(rows) != 0 {
				t.Fatalf("outbox rows = %+v, want none", rows)
			}
		})
	}
}

// TestRegister_ARolledBackRegistrationLeavesNoMail fails the commit
// after the outbox insert (a deferred trigger on registrations), so the
// mail row goes with the Registration.
func TestRegister_ARolledBackRegistrationLeavesNoMail(t *testing.T) {
	f := seatFixture(t)
	f.exec(`CREATE FUNCTION refuse_at_commit() RETURNS trigger LANGUAGE plpgsql AS
		$$ BEGIN RAISE EXCEPTION 'refused at commit'; END $$`)
	f.exec(`CREATE CONSTRAINT TRIGGER refuse_registration AFTER INSERT ON registrations
		DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION refuse_at_commit()`)

	resp := f.send(http.MethodPost, pathRegister(classOne), tokenParent, registerAmy)
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusInternalServerError)

	if rows := f.mailRows(); len(rows) != 0 {
		t.Fatalf("outbox rows = %+v, want none after the rollback", rows)
	}
	if n := f.count(`SELECT count(*) FROM registrations`); n != 0 {
		t.Fatalf("registrations = %d, want 0", n)
	}
}

func TestCancel_WritesThePromotedMailToTheOtherParent(t *testing.T) {
	f := seatFixture(t)
	f.registration(classOne, scoutAmy, statusEnrolled, testNow.Add(-3*time.Hour))
	f.registration(classOne, scoutOther, statusWaitlisted, testNow.Add(-2*time.Hour))

	resp := f.send(http.MethodDelete, pathCancel(classOne, scoutAmy), tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusNoContent)

	wantPending(t, f.oneMail(), kindPromoted, uidOther, scoutOther)
}

func TestCancel_NoPromotionWritesNoMail(t *testing.T) {
	f := seatFixture(t)
	f.registration(classOne, scoutOther, statusEnrolled, testNow.Add(-3*time.Hour))
	f.registration(classOne, scoutAmy, statusWaitlisted, testNow.Add(-2*time.Hour))

	resp := f.send(http.MethodDelete, pathCancel(classOne, scoutAmy), tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusNoContent)

	if rows := f.mailRows(); len(rows) != 0 {
		t.Fatalf("outbox rows = %+v, want none", rows)
	}
}

func TestDeleteScout_WritesThePromotedMail(t *testing.T) {
	f := seatFixture(t)
	f.registration(classOne, scoutAmy, statusEnrolled, testNow.Add(-3*time.Hour))
	f.registration(classOne, scoutOther, statusWaitlisted, testNow.Add(-2*time.Hour))

	resp := f.send(http.MethodDelete, pathScouts+"/"+scoutAmy, tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusNoContent)

	wantPending(t, f.oneMail(), kindPromoted, uidOther, scoutOther)
}

// TestDeleteAccount_WritesThePromotedMailOfTheOtherParentOnly: Amy's
// seat goes to Ben, Ben's (in the same delete) to the other Parent's
// Scout. Ben's mail row goes with the account; the other Parent's stays.
func TestDeleteAccount_WritesThePromotedMailOfTheOtherParentOnly(t *testing.T) {
	f := seatFixture(t)
	f.registration(classOne, scoutAmy, statusEnrolled, testNow.Add(-3*time.Hour))
	f.registration(classOne, scoutBen, statusWaitlisted, testNow.Add(-2*time.Hour))
	f.registration(classOne, scoutOther, statusWaitlisted, testNow.Add(-time.Hour))

	resp := f.send(http.MethodDelete, pathMe, tokenParent, "")
	defer resp.Body.Close()
	wantStatus(t, resp, http.StatusNoContent)

	wantPending(t, f.oneMail(), kindPromoted, uidOther, scoutOther)
}

// TestDrain_SendsAPendingMailAndRecordsIt is the "registration shows one
// message after a drain" case: one send to the Parent's address, and a
// sent row with the message id, the subject and the address.
func TestDrain_SendsAPendingMailAndRecordsIt(t *testing.T) {
	f := seatFixture(t)
	resp := f.send(http.MethodPost, pathRegister(classOne), tokenParent, registerAmy)
	_ = resp.Body.Close()
	f.now = testNow.Add(time.Minute)

	f.drain()

	sent := f.mail.Sent()
	want := mail.Message{
		To:      emailParent,
		Subject: subjectEnrolled,
		Text:    "Your scout is enrolled in the Camping merit badge class. See you there!",
		HTML:    "<p>Your scout is enrolled in the <strong>Camping</strong> merit badge class. See you there!</p>",
	}
	if len(sent) != 1 || sent[0] != want {
		t.Fatalf("sent = %+v, want [%+v]", sent, want)
	}
	m := f.oneMail()
	if m.status != mailSent || m.attempts != 1 || m.messageID.String != "fake-1" || m.errorID.Valid ||
		m.subject.String != subjectEnrolled || m.toEmail.String != emailParent || !m.sentAt.Time.Equal(f.now) {
		t.Fatalf("row = %+v, want sent at %v with the message id", m, f.now)
	}

	// A second drain finds nothing due.
	f.drain()
	if n := len(f.mail.Sent()); n != 1 {
		t.Fatalf("sends after a second drain = %d, want 1", n)
	}
}

// TestDrain_RendersEachKindAndEscapesTheHTML: the copy of each kind, with
// a Badge title that holds an ampersand, and the address read at send
// time (not the Registration snapshot).
func TestDrain_RendersEachKindAndEscapesTheHTML(t *testing.T) {
	f := seatFixture(t)
	f.exec(`UPDATE classes SET badge_title = 'Signs, Signals & Codes' WHERE id = $1`, classOne)
	f.exec(`UPDATE users SET email = 'new@example.com' WHERE uid = $1`, uidParent)
	f.pendingMail("waitlisted", scoutAmy)
	f.now = testNow.Add(time.Second)
	f.pendingMail(kindPromoted, scoutBen)

	f.drain()

	sent := f.mail.Sent()
	want := []mail.Message{{
		To:      emailNew,
		Subject: "You're on the waitlist: Signs, Signals & Codes",
		Text:    "Your scout is on the waitlist for the Signs, Signals & Codes merit badge class. We'll email you if a seat opens up.",
		HTML:    "<p>Your scout is on the waitlist for the <strong>Signs, Signals &amp; Codes</strong> merit badge class. We'll email you if a seat opens up.</p>",
	}, {
		To:      emailNew,
		Subject: "A seat opened up: Signs, Signals & Codes",
		Text:    "Good news — a seat opened up and your scout is now enrolled in the Signs, Signals & Codes merit badge class.",
		HTML:    "<p>Good news — a seat opened up and your scout is now enrolled in the <strong>Signs, Signals &amp; Codes</strong> merit badge class.</p>",
	}}
	if len(sent) != 2 || sent[0] != want[0] || sent[1] != want[1] {
		t.Fatalf("sent = %+v\nwant %+v", sent, want)
	}
}

func TestDrain_AParentWithNoAddressIsDeadLetteredAtOnce(t *testing.T) {
	f := seatFixture(t)
	f.exec(`UPDATE users SET email = '' WHERE uid = $1`, uidParent)
	f.pendingMail("registered", scoutAmy)

	f.drain()

	if n := len(f.mail.Sent()); n != 0 {
		t.Fatalf("sends = %d, want none", n)
	}
	m := f.oneMail()
	if m.status != mailFailed || m.attempts != 1 || m.errorID.String != "missing_email" || m.toEmail.Valid ||
		m.subject.String != subjectEnrolled || m.sentAt.Valid {
		t.Fatalf("row = %+v, want failed missing_email", m)
	}
}

// TestDrain_AFailedSendIsTriedAgainWithBackoffThenDeadLettered: each
// failure counts an attempt and moves next_attempt_at by the next wait
// on the request clock; a drain before that time sends nothing; the
// fifth failure is the dead-letter state.
func TestDrain_AFailedSendIsTriedAgainWithBackoffThenDeadLettered(t *testing.T) {
	f := seatFixture(t)
	f.pendingMail("registered", scoutAmy)
	f.mail.Err = errors.New("mailgun is down")

	for i, wait := range []time.Duration{5 * time.Minute, 30 * time.Minute, 2 * time.Hour, 6 * time.Hour} {
		f.drain()
		m := f.oneMail()
		if m.status != mailPending || m.attempts != i+1 || !m.nextAttemptAt.Equal(f.now.Add(wait)) ||
			m.errorID.String != mail.ErrorUnknown || m.toEmail.String != emailParent || m.subject.String != subjectEnrolled {
			t.Fatalf("after attempt %d: row = %+v, want pending, due %v later", i+1, m, wait)
		}
		// Not due yet: a drain one second early does not try it.
		f.now = m.nextAttemptAt.Add(-time.Second)
		f.drain()
		if again := f.oneMail(); again.attempts != i+1 {
			t.Fatalf("a drain before the wait tried the row: attempts = %d", again.attempts)
		}
		f.now = m.nextAttemptAt
	}

	f.drain()
	m := f.oneMail()
	if m.status != mailFailed || m.attempts != outbox.MaxAttempts || m.errorID.String != mail.ErrorUnknown {
		t.Fatalf("row = %+v, want failed after %d attempts", m, outbox.MaxAttempts)
	}
	// A failed row is never tried again.
	f.now = f.now.Add(48 * time.Hour)
	f.mail.Err = nil
	f.drain()
	if n := len(f.mail.Sent()); n != 0 {
		t.Fatalf("a dead-lettered row was sent: %d", n)
	}
}

// TestDrain_TwoDrainsAtOnceSendEachMailOnce: many rows and two parallel
// drains through a slow sender; FOR UPDATE SKIP LOCKED gives each row to
// one drain.
func TestDrain_TwoDrainsAtOnceSendEachMailOnce(t *testing.T) {
	const n = 20
	f := seatFixture(t)
	f.useSender(&slowSender{inner: f.mail})
	for range n {
		id := uuid.NewString()
		f.scout(id, uidOther)
		f.pendingMail("registered", id)
	}

	statuses := f.sendAllAs(oidcScheduler, http.MethodPost, []string{pathDrain, pathDrain}, []string{"", ""})

	if statuses[0] != http.StatusOK || statuses[1] != http.StatusOK {
		t.Fatalf("statuses = %v, want 200 200", statuses)
	}
	if got := len(f.mail.Sent()); got != n {
		t.Fatalf("sends = %d, want %d (each row once)", got, n)
	}
	if got := f.count(`SELECT count(*) FROM registration_mail_outbox WHERE status = 'sent' AND attempts = 1`); got != n {
		t.Fatalf("rows sent once = %d, want %d", got, n)
	}
}

// slowSender holds each send for a moment, so two drains overlap.
type slowSender struct{ inner *mail.FakeSender }

func (s *slowSender) Send(ctx context.Context, msg mail.Message) (string, error) {
	time.Sleep(2 * time.Millisecond)
	return s.inner.Send(ctx, msg) //nolint:wrapcheck // a test double passes the fake's answer through
}

func TestDrain_ADatabaseFailureNamesTheOutbox(t *testing.T) {
	d := testDeps()
	d.DB = closedDB(t)

	resp := serve(t, routes(d), http.MethodPost, pathDrain, oidcScheduler)
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", resp.StatusCode)
	}
	if got := apierrtest.Decode(t, resp); got.Code != apierr.CodeInternal || got.Message != "drain failed: registration-mail" {
		t.Errorf("error = %+v, want INTERNAL naming registration-mail", got)
	}
}

// TestPurge_ClearsTheAddressOfTheMailOfAUniversityPastTheWindow: the
// outbox row keeps its ids, kind, status and subject as the audit
// record; the Parent's address goes with the Registrations' snapshot.
func TestPurge_ClearsTheAddressOfTheMailOfAUniversityPastTheWindow(t *testing.T) {
	f := purgeFixture(t)
	for _, c := range []struct{ uni, class string }{{uniEnded91, classEnded91}, {uniEnded89, classEnded89}} {
		f.exec(`INSERT INTO registration_mail_outbox (kind, to_parent_uid, scout_id, class_id, university_id,
			status, attempts, next_attempt_at, created_at, sent_at, mailgun_message_id, subject, to_email)
			VALUES ('registered', $1, $2, $3, $4, 'sent', 1, $5, $5, $5, 'mg-1', 'Subject', 'other@example.com')`,
			uidOther, scoutP1, c.class, c.uni, daysAgo(120))
	}

	resp := f.purge()
	defer resp.Body.Close()
	wantJSONBody(t, resp, purgeAll)

	if n := f.count(`SELECT count(*) FROM registration_mail_outbox WHERE university_id = $1 AND to_email IS NULL
		AND status = 'sent' AND subject = 'Subject' AND mailgun_message_id = 'mg-1'`, uniEnded91); n != 1 {
		t.Error("the mail of the University past the window kept its address or lost its audit fields")
	}
	if n := f.count(`SELECT count(*) FROM registration_mail_outbox WHERE university_id = $1
		AND to_email = 'other@example.com'`, uniEnded89); n != 1 {
		t.Error("the purge cleared the address of a University inside the window")
	}
}

// fakeMailgun is a Mailgun API on httptest that answers each send with
// status and body, and keeps the last request's form.
type fakeMailgun struct {
	srv          *httptest.Server
	status       int
	body         string
	path, user   string
	pass         string
	form         url.Values
	requestCount int
}

func newFakeMailgun(t *testing.T, status int, body string) *fakeMailgun {
	t.Helper()
	m := &fakeMailgun{status: status, body: body}
	m.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		m.requestCount++
		m.path = r.URL.Path
		m.user, m.pass, _ = r.BasicAuth()
		_ = r.ParseForm()
		m.form = r.PostForm
		w.WriteHeader(m.status)
		_, _ = w.Write([]byte(m.body))
	}))
	t.Cleanup(m.srv.Close)
	return m
}

// TestDrain_SendsThroughMailgun: the form, the path of the default
// domain, the API key as basic auth, tracking off, and the message id
// from Mailgun's answer.
func TestDrain_SendsThroughMailgun(t *testing.T) {
	f := seatFixture(t)
	mg := newFakeMailgun(t, http.StatusOK, `{"id":"<20271006.1@mg.merit-badge.university>","message":"Queued. Thank you."}`)
	f.useSender(mail.NewMailgunSender("key-test", "", mg.srv.URL))
	f.pendingMail("registered", scoutAmy)

	f.drain()

	if mg.path != "/v3/mg.merit-badge.university/messages" || mg.user != "api" || mg.pass != "key-test" {
		t.Fatalf("request = %s as %s:%s", mg.path, mg.user, mg.pass)
	}
	for field, want := range map[string]string{
		"from":              "Merit Badge University <notifications@mg.merit-badge.university>",
		"to":                emailParent,
		"subject":           subjectEnrolled,
		"text":              "Your scout is enrolled in the Camping merit badge class. See you there!",
		"html":              "<p>Your scout is enrolled in the <strong>Camping</strong> merit badge class. See you there!</p>",
		"o:tracking":        "no",
		"o:tracking-clicks": "no",
		"o:tracking-opens":  "no",
	} {
		if got := mg.form.Get(field); got != want {
			t.Errorf("form %s = %q, want %q", field, got, want)
		}
	}
	if m := f.oneMail(); m.status != mailSent || m.messageID.String != "<20271006.1@mg.merit-badge.university>" {
		t.Fatalf("row = %+v, want sent with Mailgun's id", m)
	}
}

// TestDrain_ClassifiesEachMailgunAnswer: the error ids of errors.ts. Only
// an invalid recipient is dead-lettered at once; a configuration fault
// or an outage is tried again. An answer with no id is still a send.
func TestDrain_ClassifiesEachMailgunAnswer(t *testing.T) {
	for _, tc := range []struct {
		status           int
		body             string
		wantStatus       string
		wantErr, wantMsg string
	}{
		{http.StatusOK, `not json`, mailSent, "", "unknown"},
		{http.StatusBadRequest, `{"message":"to parameter is not a valid address"}`, mailFailed, "mailgun_invalid_recipient", ""},
		{http.StatusUnauthorized, `Forbidden`, mailPending, "mailgun_auth_failed", ""},
		{http.StatusForbidden, `Forbidden`, mailPending, "mailgun_auth_failed", ""},
		{http.StatusNotFound, `{"message":"Domain not found"}`, mailPending, "mailgun_domain_not_configured", ""},
		{http.StatusTooManyRequests, ``, mailPending, "mailgun_rate_limited", ""},
		{http.StatusServiceUnavailable, ``, mailPending, mail.ErrorNetwork, ""},
		{http.StatusGatewayTimeout, ``, mailPending, mail.ErrorNetwork, ""},
		{http.StatusInternalServerError, ``, mailPending, mail.ErrorUnknown, ""},
	} {
		t.Run(strconv.Itoa(tc.status)+" "+tc.wantStatus, func(t *testing.T) {
			f := seatFixture(t)
			mg := newFakeMailgun(t, tc.status, tc.body)
			f.useSender(mail.NewMailgunSender("key-test", "mg.example.org", mg.srv.URL+"/"))
			f.pendingMail("registered", scoutAmy)

			f.drain()

			m := f.oneMail()
			if mg.requestCount != 1 || mg.path != "/v3/mg.example.org/messages" ||
				m.status != tc.wantStatus || m.errorID.String != tc.wantErr || m.messageID.String != tc.wantMsg {
				t.Fatalf("row = %+v after %d requests to %s, want %s %q %q",
					m, mg.requestCount, mg.path, tc.wantStatus, tc.wantErr, tc.wantMsg)
			}
		})
	}
}

func TestDrain_AMailgunThatCannotBeReachedIsANetworkError(t *testing.T) {
	f := seatFixture(t)
	mg := newFakeMailgun(t, http.StatusOK, "")
	mg.srv.Close()
	f.useSender(mail.NewMailgunSender("key-test", "", mg.srv.URL))
	f.pendingMail("registered", scoutAmy)

	f.drain()

	if m := f.oneMail(); m.status != mailPending || m.errorID.String != mail.ErrorNetwork || m.attempts != 1 {
		t.Fatalf("row = %+v, want pending with mailgun_network_error", m)
	}
}

// TestDrain_SendsAtMostOneBatchPerCall: a backlog larger than a batch
// goes out over more than one Scheduler call.
func TestDrain_SendsAtMostOneBatchPerCall(t *testing.T) {
	f := seatFixture(t)
	for range regmail.MaxBatch + 1 {
		id := uuid.NewString()
		f.scout(id, uidOther)
		f.pendingMail("registered", id)
	}

	f.drain()
	if got := len(f.mail.Sent()); got != regmail.MaxBatch {
		t.Fatalf("first drain sent %d, want %d", got, regmail.MaxBatch)
	}
	f.drain()
	if got := len(f.mail.Sent()); got != regmail.MaxBatch+1 {
		t.Fatalf("after the second drain sent %d, want %d", got, regmail.MaxBatch+1)
	}
}
