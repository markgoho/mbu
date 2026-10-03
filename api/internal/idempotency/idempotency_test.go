package idempotency_test

import (
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/iotest"
	"time"

	"mbu/api/internal/apierr"
	"mbu/api/internal/apierrtest"
	"mbu/api/internal/authn"
	"mbu/api/internal/authntest"
	"mbu/api/internal/clock"
	"mbu/api/internal/idempotency"
	"mbu/api/internal/testdb"
)

// start is the instant the first request of each test reads.
var start = time.Date(2027, time.March, 6, 9, 0, 0, 0, time.UTC)

// The ID tokens the fake verifier knows. tokenNoAccount is a caller with
// no users row, so a save fails on the foreign key.
const (
	tokenA         = "token-a"
	tokenB         = "token-b"
	tokenNoAccount = "token-no-account"
)

const (
	createPath = "/api/things"
	bodyX      = `{"name":"x"}`
	bodyNew    = `{"name":"new"}`
)

// created is what the counting handler answers with.
type created struct {
	Run  int    `json:"run"`
	Body string `json:"body"`
}

// subject is the counting handler behind authn.Middleware and Wrap.
type subject struct {
	db      *testdb.DB
	handler http.Handler
	runs    int
	// status is what the next run answers with.
	status int
}

// setup builds the decorated handler over a fresh database that holds
// the accounts uid-a and uid-b.
func setup(t *testing.T) *subject {
	t.Helper()
	db := testdb.New(t)
	if _, err := db.Admin.ExecContext(t.Context(),
		`INSERT INTO users (uid, email) VALUES ('uid-a', 'a@example.com'), ('uid-b', 'b@example.com')`); err != nil {
		t.Fatalf("seed users: %v", err)
	}
	s := &subject{db: db, status: http.StatusCreated}
	s.handler = wrap(db.App, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		s.runs++
		body, _ := io.ReadAll(r.Body)
		apierr.WriteJSON(w, s.status, created{Run: s.runs, Body: string(body)})
	}))
	return s
}

// wrap mounts h behind authn.Middleware and Wrap(db), the order the
// route table uses.
func wrap(db *sql.DB, h http.Handler) http.Handler {
	verifier := authntest.Verifier{Tokens: map[string]authn.Token{
		tokenA:         {UID: "uid-a", Email: "a@example.com", EmailVerified: true},
		tokenB:         {UID: "uid-b", Email: "b@example.com", EmailVerified: true},
		tokenNoAccount: {UID: "uid-none", Email: "none@example.com", EmailVerified: true},
	}}
	return authn.Middleware(verifier)(idempotency.Wrap(db)(h))
}

// request is one call to the handler. The zero value is a POST to
// createPath from uid-a at start with the key "key-1".
type request struct {
	token, key, path, body string
	noKey                  bool
	at                     time.Time
	reader                 io.Reader
}

func send(t *testing.T, h http.Handler, req request) *http.Response {
	t.Helper()
	if req.token == "" {
		req.token = tokenA
	}
	if req.key == "" && !req.noKey {
		req.key = "key-1"
	}
	if req.path == "" {
		req.path = createPath
	}
	if req.at.IsZero() {
		req.at = start
	}
	if req.reader == nil {
		req.reader = strings.NewReader(req.body)
	}
	ctx := clock.Into(t.Context(), func() time.Time { return req.at })
	r := httptest.NewRequestWithContext(ctx, http.MethodPost, req.path, req.reader)
	r.Header.Set("Authorization", "Bearer "+req.token)
	if req.key != "" {
		r.Header.Set(idempotency.HeaderName, req.key)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, r)
	return rec.Result()
}

// call sends req to h, checks the status and decodes the created body.
func call(t *testing.T, h http.Handler, req request, status int) created {
	t.Helper()
	resp := send(t, h, req)
	defer resp.Body.Close()
	if resp.StatusCode != status {
		t.Fatalf("status = %d, want %d", resp.StatusCode, status)
	}
	var c created
	if err := json.NewDecoder(resp.Body).Decode(&c); err != nil {
		t.Fatalf("decode: %v", err)
	}
	return c
}

// stored counts the idempotency_keys rows.
func (s *subject) stored(t *testing.T) int {
	t.Helper()
	var n int
	if err := s.db.Admin.QueryRowContext(t.Context(), `SELECT count(*) FROM idempotency_keys`).Scan(&n); err != nil {
		t.Fatalf("count: %v", err)
	}
	return n
}

func TestWrap_ARepeatReplaysTheStoredResponse(t *testing.T) {
	s := setup(t)

	first := call(t, s.handler, request{body: bodyX}, http.StatusCreated)
	resp := send(t, s.handler, request{body: bodyX, at: start.Add(time.Hour)})
	defer resp.Body.Close()
	if got := resp.Header.Get("Content-Type"); got != "application/json" {
		t.Errorf("replay Content-Type = %q, want application/json", got)
	}
	var replay created
	if err := json.NewDecoder(resp.Body).Decode(&replay); err != nil {
		t.Fatalf("decode: %v", err)
	}

	if replay != first {
		t.Fatalf("replay = %+v, want the first response %+v", replay, first)
	}
	if s.runs != 1 {
		t.Fatalf("handler ran %d times, want 1", s.runs)
	}
}

func TestWrap_TheSameKeyForADifferentRequestIsA409(t *testing.T) {
	for name, second := range map[string]request{
		"a different body": {body: `{"name":"y"}`},
		"a different path": {body: bodyX, path: "/api/other"},
	} {
		t.Run(name, func(t *testing.T) {
			s := setup(t)
			call(t, s.handler, request{body: bodyX}, http.StatusCreated)

			resp := send(t, s.handler, second)
			defer resp.Body.Close()
			if resp.StatusCode != http.StatusConflict {
				t.Fatalf("status = %d, want 409", resp.StatusCode)
			}
			if got := apierrtest.Decode(t, resp); got.Code != apierr.CodeIdempotencyKeyReused {
				t.Fatalf("code = %q, want %q", got.Code, apierr.CodeIdempotencyKeyReused)
			}
			if s.runs != 1 {
				t.Fatalf("handler ran %d times, want 1", s.runs)
			}
		})
	}
}

func TestWrap_NoUsableKeyRunsEveryTime(t *testing.T) {
	for name, req := range map[string]request{
		"no header":    {noKey: true},
		"key too long": {key: strings.Repeat("k", 256)},
	} {
		t.Run(name, func(t *testing.T) {
			s := setup(t)
			call(t, s.handler, req, http.StatusCreated)
			if got := call(t, s.handler, req, http.StatusCreated); got.Run != 2 {
				t.Fatalf("second run = %d, want 2", got.Run)
			}
			if n := s.stored(t); n != 0 {
				t.Fatalf("stored %d rows, want 0", n)
			}
		})
	}
}

func TestWrap_EachCallerHasItsOwnKeys(t *testing.T) {
	s := setup(t)
	call(t, s.handler, request{token: tokenA}, http.StatusCreated)
	if got := call(t, s.handler, request{token: tokenB}, http.StatusCreated); got.Run != 2 {
		t.Fatalf("uid-b's request replayed uid-a's response, want a run of its own")
	}
}

func TestWrap_A4xxReplaysAndA5xxDoesNot(t *testing.T) {
	s := setup(t)
	s.status = http.StatusInternalServerError
	call(t, s.handler, request{}, http.StatusInternalServerError)
	if n := s.stored(t); n != 0 {
		t.Fatalf("a 500 was stored (%d rows), want it retryable", n)
	}

	s.status = http.StatusConflict
	call(t, s.handler, request{}, http.StatusConflict)
	s.status = http.StatusCreated
	if got := call(t, s.handler, request{}, http.StatusConflict); got.Run != 2 {
		t.Fatalf("replay = run %d, want the stored 409 of run 2", got.Run)
	}
	if s.runs != 2 {
		t.Fatalf("handler ran %d times, want 2", s.runs)
	}
}

func TestWrap_AKeyOlderThanTheTTLRunsAgain(t *testing.T) {
	s := setup(t)
	call(t, s.handler, request{}, http.StatusCreated)

	later := start.Add(idempotency.TTL)
	if got := call(t, s.handler, request{body: bodyNew, at: later}, http.StatusCreated); got.Run != 2 {
		t.Fatalf("run = %d, want 2", got.Run)
	}
	// The expired row was replaced, so the new response replays.
	if got := call(t, s.handler, request{body: bodyNew, at: later.Add(time.Minute)}, http.StatusCreated); got.Run != 2 {
		t.Fatalf("replay = run %d, want the stored run 2", got.Run)
	}
}

func TestWrap_AnOversizedBodyGoesToTheHandlerUnstored(t *testing.T) {
	s := setup(t)
	big := strings.Repeat("a", apierr.MaxRequestBodyBytes+10)

	got := call(t, s.handler, request{body: big}, http.StatusCreated)
	if len(got.Body) != len(big) {
		t.Fatalf("handler read %d bytes, want all %d", len(got.Body), len(big))
	}
	if n := s.stored(t); n != 0 {
		t.Fatalf("stored %d rows, want 0", n)
	}
}

// TestWrap_AWriteWithNoStatusIsStoredAs200 covers a handler that writes
// its body with no WriteHeader, which net/http answers as 200.
func TestWrap_AWriteWithNoStatusIsStoredAs200(t *testing.T) {
	db := testdb.New(t)
	if _, err := db.Admin.ExecContext(t.Context(), `INSERT INTO users (uid, email) VALUES ('uid-a', 'a@example.com')`); err != nil {
		t.Fatalf("seed: %v", err)
	}
	runs := 0
	h := wrap(db.App, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		runs++
		_, _ = w.Write([]byte(`{"run":1}`))
	}))

	call(t, h, request{}, http.StatusOK)
	call(t, h, request{}, http.StatusOK)
	if runs != 1 {
		t.Fatalf("handler ran %d times, want 1", runs)
	}
}

func TestWrap_AFailedSaveStillAnswers(t *testing.T) {
	s := setup(t)
	call(t, s.handler, request{token: tokenNoAccount}, http.StatusCreated)
	if got := call(t, s.handler, request{token: tokenNoAccount}, http.StatusCreated); got.Run != 2 {
		t.Fatalf("run = %d, want 2: nothing was stored to replay", got.Run)
	}
}

// downDB is a pool whose server refuses every connection.
func downDB(t *testing.T) *sql.DB {
	t.Helper()
	down, err := sql.Open("pgx", "postgres://app:secret@127.0.0.1:1/mbu?sslmode=disable&connect_timeout=1")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	t.Cleanup(func() { _ = down.Close() })
	return down
}

func TestWrap_Refusals(t *testing.T) {
	down := downDB(t)
	never := http.HandlerFunc(func(http.ResponseWriter, *http.Request) { t.Error("the handler ran") })

	tests := []struct {
		name    string
		handler http.Handler
		req     request
		status  int
		code    apierr.Code
	}{
		{"database down", wrap(down, never), request{}, http.StatusInternalServerError, apierr.CodeInternal},
		{"mounted outside authn", idempotency.Wrap(down)(never), request{}, http.StatusInternalServerError, apierr.CodeInternal},
		{"body read fails", wrap(down, never), request{reader: iotest.ErrReader(errors.New("reset"))}, http.StatusBadRequest, apierr.CodeInvalidArgument},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := send(t, tt.handler, tt.req)
			defer resp.Body.Close()
			if resp.StatusCode != tt.status {
				t.Fatalf("status = %d, want %d", resp.StatusCode, tt.status)
			}
			if got := apierrtest.Decode(t, resp); got.Code != tt.code {
				t.Fatalf("code = %q, want %q", got.Code, tt.code)
			}
		})
	}
}

func TestPurgeExpired_DeletesOnlyKeysOlderThanTheTTL(t *testing.T) {
	s := setup(t)
	call(t, s.handler, request{key: "old"}, http.StatusCreated)
	call(t, s.handler, request{key: "new", at: start.Add(time.Hour)}, http.StatusCreated)

	n, err := idempotency.PurgeExpired(t.Context(), s.db.App, start.Add(idempotency.TTL))
	if err != nil {
		t.Fatalf("purge: %v", err)
	}
	if n != 1 || s.stored(t) != 1 {
		t.Fatalf("purged %d, left %d; want 1 purged, 1 left", n, s.stored(t))
	}
	// The purged key runs again; the kept one still replays.
	if got := call(t, s.handler, request{key: "old", at: start.Add(idempotency.TTL)}, http.StatusCreated); got.Run != 3 {
		t.Fatalf("old key: run = %d, want a new run 3", got.Run)
	}
	if got := call(t, s.handler, request{key: "new", at: start.Add(idempotency.TTL)}, http.StatusCreated); got.Run != 2 {
		t.Fatalf("new key: run = %d, want the stored run 2", got.Run)
	}
}

func TestPurgeExpired_ReportsADatabaseFailure(t *testing.T) {
	down := downDB(t)
	if _, err := idempotency.PurgeExpired(t.Context(), down, start); err == nil {
		t.Fatal("purge on a database that is down = nil error")
	}
}
