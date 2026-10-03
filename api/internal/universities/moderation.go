package universities

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"slices"
	"strings"
	"time"
	"unicode/utf16"

	"mbu/api/internal/apierr"
	"mbu/api/internal/authn"
	"mbu/api/internal/authz"
	"mbu/api/internal/clock"
	"mbu/api/internal/wiretime"
)

// The University Statuses.
const (
	statusDraft     = "draft"
	statusSubmitted = "submitted"
	statusPublished = "published"
	statusRejected  = "rejected"
	statusClosed    = "closed"
	// statusNeedsReview is reserved for automated triage (#92) and has
	// no moves yet.
	statusNeedsReview = "needs_review"
)

// legalMoves is the University Status state machine (CONTEXT.md, the
// same pairs as functions/src/universities-api/services/transitions.ts):
// the statuses each status may move to. Who may make a move is checked
// apart from it, by the route.
var legalMoves = map[string][]string{
	statusDraft:       {statusSubmitted},
	statusRejected:    {statusSubmitted},
	statusSubmitted:   {statusPublished, statusRejected},
	statusPublished:   {statusClosed},
	statusClosed:      {},
	statusNeedsReview: {},
}

// checkMove refuses a move that is not in legalMoves: 409
// FAILED_PRECONDITION (#253), not the CONFLICT of a write in the wrong
// status, so the app can tell a stale moderation action apart.
func checkMove(from, to string) error {
	if slices.Contains(legalMoves[from], to) {
		return nil
	}
	return &apierr.RefusalError{Status: http.StatusConflict, Code: apierr.CodeFailedPrecondition,
		Message: fmt.Sprintf("Cannot transition from %s to %s", from, to)}
}

// moveSet is the SET list of the UPDATE of each move, after the status
// and updated_at. $3 is the time of the move, $4 the caller's uid, $5
// the review note. Each move stamps its audit pair (docs/data-model.md,
// universities) and leaves the earlier pairs as they are.
var moveSet = map[string]string{
	statusSubmitted: `submitted_at = $3, submitted_by_uid = $4, review_note = NULL`,
	statusPublished: `published_at = $3, reviewed_at = $3, reviewed_by_uid = $4, review_note = NULL`,
	statusRejected:  `reviewed_at = $3, reviewed_by_uid = $4, review_note = $5`,
	statusClosed:    `closed_at = $3, closed_by_uid = $4`,
}

// move is one moderation action on a University.
type move struct {
	to string
	// byChancellor makes the move check, inside its transaction, that
	// the caller is a Chancellor of the University or a Super-admin.
	// A Super-admin's move (approve, reject) is checked by its handler
	// before the transaction.
	byChancellor bool
	// precheck runs after the status check, under the lock. It may be
	// nil.
	precheck func(ctx context.Context, tx *sql.Tx, id string) error
	// note is the review note, for a reject.
	note string
}

// errNoClasses is the 400 of a submit for a University with no Class.
// The TypeScript answered 400, and the port keeps it.
var errNoClasses = &apierr.RefusalError{Status: http.StatusBadRequest, Code: apierr.CodeInvalidArgument,
	Message: "At least one class is required to submit for review"}

// requireClass refuses a submit for a University with no Class.
func requireClass(ctx context.Context, tx *sql.Tx, id string) error {
	var exists bool
	if err := tx.QueryRowContext(ctx, `SELECT EXISTS (SELECT 1 FROM classes WHERE university_id = $1)`,
		id).Scan(&exists); err != nil {
		// coverage:ignore reason: a database failure inside the submit transaction, not reachable from a test
		return fmt.Errorf("universities: read classes: %w", err)
	}
	if !exists {
		return errNoClasses
	}
	return nil
}

// moveUniversity is the one transaction of a move: the lock, the status
// check, the precheck, then the UPDATE. It returns the University.
func moveUniversity(ctx context.Context, db *sql.DB, c authn.Caller, id string, m move, now time.Time) (university, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return university{}, fmt.Errorf("universities: begin move: %w", err)
	}
	defer rollback(tx)

	var from string
	if m.byChancellor {
		from, err = lockUniversity(ctx, tx, c, id)
	} else {
		from, err = lockStatus(ctx, tx, id)
	}
	if err != nil {
		return university{}, err
	}
	if err := checkMove(from, m.to); err != nil {
		return university{}, err
	}
	if m.precheck != nil {
		if err := m.precheck(ctx, tx, id); err != nil {
			return university{}, err
		}
	}
	args := []any{id, m.to, now, c.UID}
	if m.to == statusRejected {
		args = append(args, m.note)
	}
	u, err := scanUniversity(tx.QueryRowContext(ctx, `UPDATE universities SET status = $2, updated_at = $3, `+
		moveSet[m.to]+` WHERE id = $1 RETURNING `+universityColumns, args...))
	if err != nil {
		// coverage:ignore reason: a database failure inside the move transaction, not reachable from a test
		return university{}, fmt.Errorf("universities: move university: %w", err)
	}
	if err := tx.Commit(); err != nil {
		// coverage:ignore reason: a database failure inside the move transaction, not reachable from a test
		return university{}, fmt.Errorf("universities: commit move: %w", err)
	}
	return u, nil
}

// serveMove runs the move for the University in the path and answers
// 200 with it.
func serveMove(w http.ResponseWriter, r *http.Request, db *sql.DB, m move) {
	u, err := moveUniversity(r.Context(), db, caller(r), r.PathValue("id"), m, clock.Now(r.Context()))
	if err != nil {
		apierr.WriteErr(w, r, err)
		return
	}
	apierr.WriteJSON(w, http.StatusOK, u.response())
}

// Submit is POST /api/universities/{id}/submit: a draft or rejected
// University with at least one Class goes to the review queue, for its
// Chancellor or a Super-admin. It clears the review note.
func Submit(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		serveMove(w, r, db, move{to: statusSubmitted, byChancellor: true, precheck: requireClass})
	})
}

// Close is POST /api/universities/{id}/close: a published University
// closes, for its Chancellor or a Super-admin.
func Close(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		serveMove(w, r, db, move{to: statusClosed, byChancellor: true})
	})
}

// Approve is POST /api/admin/universities/{id}/approve: a Super-admin
// publishes a submitted University. It clears the review note.
func Approve(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := authz.RequireSuperAdmin(caller(r)); err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		serveMove(w, r, db, move{to: statusPublished})
	})
}

// rejectRequest is the body of a reject. The note is raw JSON, so a
// note of the wrong JSON type gets its own entry in details.
type rejectRequest struct {
	Note json.RawMessage `json:"note"`
}

// The review note's rule: 1 to 2000 characters once trimmed. A
// character is a UTF-16 code unit, as the TypeScript's maxLength
// counted it, so the app's own length check agrees.
const (
	fieldNote     = "note"
	maxNoteLength = 2000
	msgReviewNote = "Enter a review note of 1 to 2000 characters."
)

// parseNote is the trimmed review note, and whether it keeps the rule.
// A note left out, null or not a string breaks it.
func parseNote(raw json.RawMessage) (string, bool) {
	var note string
	if err := json.Unmarshal(raw, &note); err != nil {
		return "", false
	}
	note = strings.TrimSpace(note)
	n := len(utf16.Encode([]rune(note)))
	return note, n > 0 && n <= maxNoteLength
}

// Reject is POST /api/admin/universities/{id}/reject: a Super-admin
// sends a submitted University back to its Chancellor with a review
// note. The note check runs before the role check, as the body checks
// of the other University writes do.
func Reject(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req rejectRequest
		if !apierr.DecodeJSON(w, r, &req) {
			return
		}
		note, ok := parseNote(req.Note)
		if !ok {
			apierr.WriteFieldError(w, http.StatusBadRequest, apierr.CodeInvalidArgument, fieldNote, msgReviewNote)
			return
		}
		if err := authz.RequireSuperAdmin(caller(r)); err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		serveMove(w, r, db, move{to: statusRejected, note: note})
	})
}

// ReviewQueueRow is one submitted University, as the app's
// ReviewQueueRow type reads it.
type ReviewQueueRow struct {
	ID              string  `json:"id"`
	Title           string  `json:"title"`
	ChancellorName  string  `json:"chancellorName"`
	ChancellorEmail string  `json:"chancellorEmail"`
	SubmittedAt     *string `json:"submittedAt"`
	ClassCount      int     `json:"classCount"`
	StartDate       string  `json:"startDate"`
}

// ReviewQueueResponse is the review queue, as the app's
// ReviewQueueResponse type reads it.
type ReviewQueueResponse struct {
	Universities []ReviewQueueRow `json:"universities"`
}

// reviewQueueLimit caps the review queue. The list can grow, but the
// app's review page has no paging control, so the port keeps the
// TypeScript body and answers the oldest 200 submissions in place of a
// cursor envelope (docs/api-design.md section 4, rule 3). A queue that long is
// a backlog the Super-admin works from the front.
const reviewQueueLimit = 200

// ReviewQueue is GET /api/admin/universities/review-queue: the submitted
// Universities, oldest submission first, for a Super-admin. The
// Chancellor name and email are those of the account that created the
// University, "" when that account is gone.
func ReviewQueue(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := authz.RequireSuperAdmin(caller(r)); err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		rows := []ReviewQueueRow{}
		err := eachRow(r.Context(), db, "review queue", `SELECT u.id, u.title, COALESCE(a.display_name, ''),
				COALESCE(a.email, ''), u.submitted_at,
				(SELECT count(*) FROM classes c WHERE c.university_id = u.id), u.start_date
			FROM universities u LEFT JOIN users a ON a.uid = u.created_by_uid
			WHERE u.status = $2
			ORDER BY u.submitted_at, u.id
			LIMIT $1`, func(row rowScanner) error {
			var (
				q           ReviewQueueRow
				submittedAt sql.NullTime
				startDate   time.Time
			)
			if err := row.Scan(&q.ID, &q.Title, &q.ChancellorName, &q.ChancellorEmail, &submittedAt,
				&q.ClassCount, &startDate); err != nil {
				// coverage:ignore reason: a database failure in the middle of a read, not reachable from a test
				return err //nolint:wrapcheck // eachRow wraps it
			}
			q.SubmittedAt = wiretime.FormatNull(submittedAt)
			q.StartDate = wiretime.Format(startDate)
			rows = append(rows, q)
			return nil
		}, reviewQueueLimit, statusSubmitted)
		if err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		apierr.WriteJSON(w, http.StatusOK, ReviewQueueResponse{Universities: rows})
	})
}
