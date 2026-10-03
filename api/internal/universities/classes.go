package universities

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/google/uuid"

	"mbu/api/internal/apierr"
	"mbu/api/internal/authn"
	"mbu/api/internal/catalog"
	"mbu/api/internal/clock"
	"mbu/api/internal/pgerr"
	"mbu/api/internal/policy"
)

// errClassNotFound is the 404 for a Class that does not exist in the
// University of the path. A classId that is not a uuid names no Class.
var errClassNotFound = &apierr.RefusalError{Status: http.StatusNotFound, Code: apierr.CodeNotFound, Message: "Class not found"}

// counselorUIDFkey is the foreign key from a Counselor's attestation to
// the users row. A create that breaks it comes from a caller with no
// users row: a Super-admin who never bootstrapped.
const counselorUIDFkey = "class_counselors_uid_fkey"

// CreateClass is POST /api/universities/{id}/classes: a Class with its
// Periods, and the caller as its first Counselor (the BSA member ID they
// attest to, the Disclaimer version and the time they accepted it) with
// an active Counselor grant, in one transaction. The caller must be the
// University's Chancellor or a Super-admin, and the University draft or
// rejected. It answers 200, as the TypeScript did. The route is
// replayable, so it sets no header but Content-Type.
func CreateClass(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		f, ok := decodeClass(w, r, true)
		if !ok {
			return
		}
		c, err := createClass(r.Context(), db, caller(r), r.PathValue("id"), f, clock.Now(r.Context()))
		if err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		apierr.WriteJSON(w, http.StatusOK, c.response())
	})
}

func createClass(ctx context.Context, db *sql.DB, c authn.Caller, universityID string, f classFields,
	now time.Time,
) (*class, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("universities: begin create class: %w", err)
	}
	defer rollback(tx)

	if err := lockEditable(ctx, tx, c, universityID); err != nil {
		return nil, err
	}
	if err := checkClassPeriods(ctx, tx, universityID, f.periodIDs); err != nil {
		return nil, err
	}
	var classID string
	err = tx.QueryRowContext(ctx, `INSERT INTO classes (university_id, badge_slug, badge_title, eagle_required,
			capacity, room, notes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8) RETURNING id`, universityID, f.badge.Slug, f.badge.Title,
		f.badge.EagleRequired, *f.capacity, f.room.value, f.notes.value, now).Scan(&classID)
	if err != nil {
		// coverage:ignore reason: a database failure inside the create transaction, not reachable from a test
		return nil, fmt.Errorf("universities: insert class: %w", err)
	}
	if err := linkPeriods(ctx, tx, universityID, classID, f.periodIDs, now); err != nil {
		// coverage:ignore reason: a database failure inside the create transaction, not reachable from a test
		return nil, err
	}
	_, err = tx.ExecContext(ctx, `INSERT INTO class_counselors (class_id, uid, bsa_id, disclaimer_accepted_at,
			disclaimer_version, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $4, $4)`, classID, c.UID, f.bsaID, now, policy.DisclaimerVersion)
	if pgerr.IsForeignKeyViolationOn(err, counselorUIDFkey) {
		return nil, errNotBootstrapped
	}
	if err != nil {
		// coverage:ignore reason: a database failure inside the create transaction, not reachable from a test
		return nil, fmt.Errorf("universities: insert counselor: %w", err)
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO role_grants (role, university_id, class_id, uid, status,
			created_at, updated_at)
		VALUES ('counselor', $1, $2, $3, 'active', $4, $4)`, universityID, classID, c.UID, now); err != nil {
		// coverage:ignore reason: a database failure inside the create transaction, not reachable from a test
		return nil, fmt.Errorf("universities: insert counselor grant: %w", err)
	}
	return commitClass(ctx, tx, universityID, classID)
}

// PatchClass is PATCH /api/universities/{id}/classes/{classId}: it
// changes the fields the request names, for the University's
// Chancellor or a Super-admin, while the University is draft or
// rejected. A new badgeSlug also sets the badge title and Eagle flag
// from the catalog; periodIds replaces the Class's Periods.
func PatchClass(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		f, ok := decodeClass(w, r, false)
		if !ok {
			return
		}
		c, err := patchClass(r.Context(), db, caller(r), r.PathValue("id"), r.PathValue("classId"), f,
			clock.Now(r.Context()))
		if err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		// #108 writes the "class changed" mail to the outbox here, in
		// patchClass's transaction, once a Class can change after its
		// University opens.
		apierr.WriteJSON(w, http.StatusOK, c.response())
	})
}

func patchClass(ctx context.Context, db *sql.DB, c authn.Caller, universityID, classID string, f classFields,
	now time.Time,
) (*class, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("universities: begin patch class: %w", err)
	}
	defer rollback(tx)

	row, err := lockClass(ctx, tx, c, universityID, classID)
	if err != nil {
		return nil, err
	}
	if f.periodIDs != nil {
		if err := checkClassPeriods(ctx, tx, universityID, f.periodIDs); err != nil {
			return nil, err
		}
	}
	row.apply(f)
	if _, err := tx.ExecContext(ctx, `UPDATE classes SET badge_slug = $2, badge_title = $3, eagle_required = $4,
			capacity = $5, room = $6, notes = $7, updated_at = $8
		WHERE id = $1`, row.id, row.badge.Slug, row.badge.Title, row.badge.EagleRequired, row.capacity, row.room,
		row.notes, now); err != nil {
		// coverage:ignore reason: a database failure inside the patch transaction, not reachable from a test
		return nil, fmt.Errorf("universities: update class: %w", err)
	}
	if f.periodIDs != nil {
		if _, err := tx.ExecContext(ctx, `DELETE FROM class_periods WHERE class_id = $1`, row.id); err != nil {
			// coverage:ignore reason: a database failure inside the patch transaction, not reachable from a test
			return nil, fmt.Errorf("universities: unlink periods: %w", err)
		}
		if err := linkPeriods(ctx, tx, universityID, row.id, f.periodIDs, now); err != nil {
			// coverage:ignore reason: a database failure inside the patch transaction, not reachable from a test
			return nil, err
		}
	}
	return commitClass(ctx, tx, universityID, row.id)
}

// DeleteClass is DELETE /api/universities/{id}/classes/{classId}: it
// deletes the Class for the University's Chancellor or a Super-admin,
// while the University is draft or rejected. The foreign keys cascade to
// its Period links, Counselors, Registrations and Counselor grants
// (docs/data-model.md, "Delete and purge behavior").
func DeleteClass(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := deleteClass(r.Context(), db, caller(r), r.PathValue("id"), r.PathValue("classId")); err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		// #108 writes the "class cancelled" mail to the outbox here, in
		// deleteClass's transaction, once a Class can go after its
		// University opens.
		w.WriteHeader(http.StatusNoContent)
	})
}

func deleteClass(ctx context.Context, db *sql.DB, c authn.Caller, universityID, classID string) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("universities: begin delete class: %w", err)
	}
	defer rollback(tx)

	row, err := lockClass(ctx, tx, c, universityID, classID)
	if err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM classes WHERE id = $1`, row.id); err != nil {
		// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
		return fmt.Errorf("universities: delete class: %w", err)
	}
	if err := tx.Commit(); err != nil {
		// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
		return fmt.Errorf("universities: commit delete class: %w", err)
	}
	return nil
}

// classRow is the stored fields of a Class that a patch can change.
type classRow struct {
	id          string
	badge       catalog.Badge
	capacity    int
	room, notes *string
}

// apply sets each field the patch names.
func (row *classRow) apply(f classFields) {
	if f.badge != nil {
		row.badge = *f.badge
	}
	if f.capacity != nil {
		row.capacity = *f.capacity
	}
	if f.room.set {
		row.room = f.room.value
	}
	if f.notes.set {
		row.notes = f.notes.value
	}
}

// lockClass runs the checks of a Class patch or delete in the
// TypeScript order, inside its transaction: the role check, the
// University (404), the Class in that University (404), then the
// University's status (409). It locks the University, then the Class.
func lockClass(ctx context.Context, tx *sql.Tx, c authn.Caller, universityID, classID string) (classRow, error) {
	status, err := lockUniversity(ctx, tx, c, universityID)
	if err != nil {
		return classRow{}, err
	}
	var row classRow
	id, err := uuid.Parse(classID)
	if err != nil {
		return row, errClassNotFound
	}
	err = tx.QueryRowContext(ctx, `SELECT id, badge_slug, badge_title, eagle_required, capacity, room, notes
		FROM classes WHERE id = $1 AND university_id = $2 FOR UPDATE`, id, universityID).Scan(&row.id,
		&row.badge.Slug, &row.badge.Title, &row.badge.EagleRequired, &row.capacity, &row.room, &row.notes)
	if errors.Is(err, sql.ErrNoRows) {
		return row, errClassNotFound
	}
	if err != nil {
		// coverage:ignore reason: a database failure inside a class transaction, not reachable from a test
		return row, fmt.Errorf("universities: lock class: %w", err)
	}
	return row, assertEditable(status)
}

// checkClassPeriods refuses a periodId that is not one of the
// University's Periods (a 400 on periodIds). The ids are compared as
// text, so one that is not a uuid is unknown, not a cast error.
func checkClassPeriods(ctx context.Context, tx *sql.Tx, universityID string, ids []string) error {
	stored, err := periodIDs(ctx, tx, universityID)
	if err != nil {
		// coverage:ignore reason: a database failure inside a class transaction, not reachable from a test
		return err
	}
	for _, id := range ids {
		if !stored[id] {
			msg, details := apierr.FieldDetails(fieldPeriodIDs, msgPeriodIDsUnknown)
			return &apierr.RefusalError{Status: http.StatusBadRequest, Code: apierr.CodeInvalidArgument,
				Message: msg, Details: details}
		}
	}
	return nil
}

// linkPeriods links the Class to each Period of ids.
func linkPeriods(ctx context.Context, tx *sql.Tx, universityID, classID string, ids []string, now time.Time) error {
	if _, err := tx.ExecContext(ctx, `INSERT INTO class_periods (class_id, period_id, university_id, created_at,
			updated_at)
		SELECT $1, p::uuid, $2, $4, $4 FROM unnest($3::text[]) AS p`, classID, universityID, ids, now); err != nil {
		// coverage:ignore reason: a database failure inside a class transaction, not reachable from a test
		return fmt.Errorf("universities: link periods: %w", err)
	}
	return nil
}

// commitClass reads the Class back inside the transaction, so the answer
// is what is stored (Periods in position order, counts, live Counselor
// names), then commits.
func commitClass(ctx context.Context, tx *sql.Tx, universityID, classID string) (*class, error) {
	classes, err := loadClasses(ctx, tx, universityID)
	if err != nil {
		// coverage:ignore reason: a database failure inside a class transaction, not reachable from a test
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		// coverage:ignore reason: a database failure inside a class transaction, not reachable from a test
		return nil, fmt.Errorf("universities: commit class: %w", err)
	}
	// The transaction wrote the Class, so it is in the list.
	return classes[slices.IndexFunc(classes, func(c *class) bool { return c.id == classID })], nil
}

// The JSON field names of a Class body.
const (
	fieldBadgeSlug        = "badgeSlug"
	fieldPeriodIDs        = "periodIds"
	fieldCapacity         = "capacity"
	fieldRoom             = "room"
	fieldNotes            = "notes"
	fieldCounselor        = "counselor"
	fieldCounselorBSAID   = "counselor.bsaId"
	fieldCounselorConsent = "counselor.acceptDisclaimer"
)

// The details entries of the Class checks.
const (
	msgBadgeSlug        = "Choose a merit badge from the badge list."
	msgPeriodIDs        = "Choose one or more periods."
	msgPeriodIDsUnknown = "Choose periods of this University."
	msgCapacity         = "Enter a capacity of 1 to 200."
	msgRoom             = "Enter the room as text, or leave it empty."
	msgNotes            = "Enter the notes as text, or leave them empty."
	msgCounselor        = "Enter your BSA member ID and accept the counselor disclaimer."
	msgCounselorBSAID   = "Enter your BSA member ID."
	msgCounselorConsent = "Accept the counselor disclaimer."
	msgCheckClass       = "Check the class form."
)

// maxCapacity is the largest Capacity a Class may have. The column
// refuses 0 and below; the upper limit stays in Go.
const maxCapacity = 200

// classRequest is the body of a Class create or patch, each field raw
// JSON so a check can tell a field left out from a null.
type classRequest struct {
	BadgeSlug json.RawMessage `json:"badgeSlug"`
	PeriodIDs json.RawMessage `json:"periodIds"`
	Capacity  json.RawMessage `json:"capacity"`
	Room      json.RawMessage `json:"room"`
	Notes     json.RawMessage `json:"notes"`
	Counselor json.RawMessage `json:"counselor"`
}

// optionalText is a nullable text field of a request: set when the
// request names the field, and value nil when it is null.
type optionalText struct {
	set   bool
	value *string
}

// classFields is a classRequest that passed its checks. A nil pointer or
// slice, or an optionalText that is not set, is a field left out.
type classFields struct {
	badge       *catalog.Badge
	periodIDs   []string
	capacity    *int
	room, notes optionalText
	bsaID       string
}

// check holds the rules of ClassCreateRequestSchema and
// ClassPatchRequestSchema: a badgeSlug the Badge Catalog has; one or
// more periodIds, each text that is not empty (a repeat counts once); an
// integer capacity of 1 to 200; room and notes text or null; and, on a
// create, the counselor's BSA member ID (not blank; stored trimmed) and
// acceptDisclaimer true. create names the fields a create must send.
func (req classRequest) check(create bool) (classFields, map[string]string) {
	c := &checker{details: map[string]string{}}
	var f classFields
	if slug := c.text(req.BadgeSlug, fieldBadgeSlug, msgBadgeSlug); slug != nil {
		if b, ok := catalog.Lookup(*slug); ok {
			f.badge = &b
		} else {
			c.details[fieldBadgeSlug] = msgBadgeSlug
		}
	}
	f.periodIDs = c.periodIDs(req.PeriodIDs)
	if req.Capacity != nil {
		var n int
		if json.Unmarshal(req.Capacity, &n) != nil || n < 1 || n > maxCapacity {
			c.details[fieldCapacity] = msgCapacity
		}
		f.capacity = &n
	}
	f.room = c.nullableText(req.Room, fieldRoom, msgRoom)
	f.notes = c.nullableText(req.Notes, fieldNotes, msgNotes)
	if create {
		f.bsaID = c.counselor(req.Counselor)
		for field, missing := range map[string]bool{
			fieldBadgeSlug: req.BadgeSlug == nil, fieldPeriodIDs: req.PeriodIDs == nil,
			fieldCapacity: req.Capacity == nil, fieldCounselor: req.Counselor == nil,
		} {
			if missing {
				c.details[field] = classRequiredMessage[field]
			}
		}
	}
	return f, c.details
}

// classRequiredMessage is the details entry for each field a create must
// send.
var classRequiredMessage = map[string]string{
	fieldBadgeSlug: msgBadgeSlug, fieldPeriodIDs: msgPeriodIDs, fieldCapacity: msgCapacity, fieldCounselor: msgCounselor,
}

// periodIDs reads a list of one or more Period ids, each text that is
// not empty. A repeat counts once. The order does not matter: a read
// gives a Class's Periods in the University's Period order.
func (c *checker) periodIDs(raw json.RawMessage) []string {
	if raw == nil {
		return nil
	}
	var ids []string
	if isNull(raw) || json.Unmarshal(raw, &ids) != nil || len(ids) == 0 || slices.Contains(ids, "") {
		c.details[fieldPeriodIDs] = msgPeriodIDs
		return nil
	}
	slices.Sort(ids)
	return slices.Compact(ids)
}

// nullableText reads a field that is text or null.
func (c *checker) nullableText(raw json.RawMessage, field, message string) optionalText {
	if raw == nil {
		return optionalText{}
	}
	if isNull(raw) {
		return optionalText{set: true}
	}
	return optionalText{set: true, value: c.text(raw, field, message)}
}

// counselor reads the counselor object of a create and returns the BSA
// member ID, trimmed.
func (c *checker) counselor(raw json.RawMessage) string {
	if raw == nil {
		return ""
	}
	var fields struct {
		BSAID            json.RawMessage `json:"bsaId"`
		AcceptDisclaimer json.RawMessage `json:"acceptDisclaimer"`
	}
	if isNull(raw) || json.Unmarshal(raw, &fields) != nil {
		c.details[fieldCounselor] = msgCounselor
		return ""
	}
	var accepted bool
	if json.Unmarshal(fields.AcceptDisclaimer, &accepted) != nil || !accepted {
		c.details[fieldCounselorConsent] = msgCounselorConsent
	}
	bsaID := c.text(fields.BSAID, fieldCounselorBSAID, msgCounselorBSAID)
	if bsaID == nil || strings.TrimSpace(*bsaID) == "" {
		c.details[fieldCounselorBSAID] = msgCounselorBSAID
		return ""
	}
	return strings.TrimSpace(*bsaID)
}

// decodeClass decodes and checks the body of a Class create or patch.
// On a refusal it writes the answer and returns false.
func decodeClass(w http.ResponseWriter, r *http.Request, create bool) (classFields, bool) {
	var req classRequest
	if !apierr.DecodeJSON(w, r, &req) {
		return classFields{}, false
	}
	f, details := req.check(create)
	if len(details) > 0 {
		apierr.Write(w, http.StatusBadRequest, apierr.CodeInvalidArgument, msgCheckClass, details)
		return classFields{}, false
	}
	return f, true
}
