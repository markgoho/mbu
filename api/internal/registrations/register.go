package registrations

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"

	"mbu/api/internal/apierr"
	"mbu/api/internal/authn"
	"mbu/api/internal/authz"
	"mbu/api/internal/clock"
	"mbu/api/internal/policy"
)

// registerRequest is the body of a register. Each field is decoded as
// any, so a field of the wrong JSON type gets its own entry in details.
type registerRequest struct {
	ScoutID        any `json:"scoutId"`
	AcceptWaitlist any `json:"acceptWaitlist"`
	AcceptConsent  any `json:"acceptConsent"`
}

// registerFields is a registerRequest that passed validate.
type registerFields struct {
	scoutID        string
	acceptWaitlist bool
	acceptConsent  bool
}

// validate holds the rules of RegisterRequestSchema: a scoutId of one
// character or more, acceptConsent true or false, and acceptWaitlist
// absent, true or false.
func (req registerRequest) validate() (registerFields, map[string]string) {
	details := map[string]string{}
	var f registerFields
	scoutID, ok := req.ScoutID.(string)
	if !ok || scoutID == "" {
		details["scoutId"] = "Choose the Scout to register."
	}
	f.scoutID = scoutID
	if f.acceptConsent, ok = req.AcceptConsent.(bool); !ok {
		details["acceptConsent"] = "Answer the parental consent question with yes or no."
	}
	if req.AcceptWaitlist != nil {
		if f.acceptWaitlist, ok = req.AcceptWaitlist.(bool); !ok {
			details["acceptWaitlist"] = "Answer the waitlist question with yes or no."
		}
	}
	return f, details
}

// Register is POST /api/registrations/{universityId}/{classId}: it
// enrolls the caller's Scout in the Class, or puts the Scout on the
// Waitlist when the Class is full and the body accepts the Waitlist. A
// Scout already enrolled or waitlisted gets the Registration back with no
// change. It answers 200, as the TypeScript did. The route is replayable,
// so it sets no header but Content-Type.
func Register(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req registerRequest
		if !apierr.DecodeJSON(w, r, &req) {
			return
		}
		f, details := req.validate()
		if len(details) > 0 {
			apierr.Write(w, http.StatusBadRequest, apierr.CodeInvalidArgument, "Check the registration form.", details)
			return
		}
		reg, err := register(r.Context(), db, caller(r), r.PathValue("universityId"), r.PathValue("classId"), f)
		if err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		apierr.WriteJSON(w, http.StatusOK, reg)
	})
}

// scoutSnapshot is the Scout row the register transaction locks, and the
// values a Registration keeps of it for the Roster.
type scoutSnapshot struct {
	found                   bool
	firstName, lastName     string
	unit, accommodations    sql.NullString
	parentName, parentEmail string
}

// register is the one transaction of Register. It takes the locks first,
// in the order of docs/data-model.md (Scout, University, Class), then
// answers the first refusal in the TypeScript order: University missing,
// Registration Window, Scout ownership, Class missing, already active,
// consent, Period Conflict, Class full.
func register(ctx context.Context, db *sql.DB, c authn.Caller, universityID, classID string, f registerFields) (RegistrationResponse, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return RegistrationResponse{}, fmt.Errorf("registrations: begin register: %w", err)
	}
	defer rollback(tx)

	scout, err := lockScout(ctx, tx, c, f.scoutID)
	if err != nil {
		// coverage:ignore reason: a database failure inside the register transaction, not reachable from a test
		return RegistrationResponse{}, err
	}
	win, found, err := lockUniversity(ctx, tx, universityID)
	if err != nil {
		// coverage:ignore reason: a database failure inside the register transaction, not reachable from a test
		return RegistrationResponse{}, err
	}
	capacity, classFound, err := lockClass(ctx, tx, universityID, classID)
	if err != nil {
		// coverage:ignore reason: a database failure inside the register transaction, not reachable from a test
		return RegistrationResponse{}, err
	}
	// Read inside the Class lock, so waitlisted_at follows the order in
	// which the Class lock was taken.
	now := clock.Now(ctx)

	if !found {
		return RegistrationResponse{}, errUniversityNotFound
	}
	bypass, err := authz.IsChancellorOf(ctx, tx, c, universityID)
	if err != nil {
		// coverage:ignore reason: a database failure inside the register transaction, not reachable from a test
		return RegistrationResponse{}, err //nolint:wrapcheck // authz wraps it with its own context
	}
	if err := win.registerRefusal(bypass, now); err != nil {
		return RegistrationResponse{}, err
	}
	if !scout.found {
		return RegistrationResponse{}, errNotYourScout
	}
	if !classFound {
		return RegistrationResponse{}, refusal(http.StatusNotFound, apierr.CodeNotFound, "Class not found")
	}
	var existing string
	err = tx.QueryRowContext(ctx, `SELECT status FROM registrations
		WHERE class_id = $1 AND scout_id = $2 FOR UPDATE`, classID, f.scoutID).Scan(&existing)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		// coverage:ignore reason: a database failure inside the register transaction, not reachable from a test
		return RegistrationResponse{}, fmt.Errorf("registrations: lock registration: %w", err)
	}
	if existing == statusEnrolled || existing == statusWaitlisted {
		// Already active: an idempotent no-op that sends no mail.
		return commitRead(ctx, tx, classID, f.scoutID)
	}

	if !f.acceptConsent {
		return RegistrationResponse{}, refusal(http.StatusForbidden, apierr.CodeConsentRequired, "Parental consent required")
	}
	if err := checkPeriodConflict(ctx, tx, classID, f.scoutID); err != nil {
		return RegistrationResponse{}, err
	}

	var enrolled int
	if err := tx.QueryRowContext(ctx, `SELECT count(*) FROM registrations
		WHERE class_id = $1 AND status = 'enrolled'`, classID).Scan(&enrolled); err != nil {
		// coverage:ignore reason: a database failure inside the register transaction, not reachable from a test
		return RegistrationResponse{}, fmt.Errorf("registrations: count enrolled: %w", err)
	}
	var status string
	switch {
	case enrolled < capacity:
		status = statusEnrolled
	case f.acceptWaitlist:
		status = statusWaitlisted
	default:
		return RegistrationResponse{}, refusal(http.StatusConflict, apierr.CodeClassFull, "This class is full")
	}

	if err := writeRegistration(ctx, tx, classID, f.scoutID, status, scout, now); err != nil {
		// coverage:ignore reason: a database failure inside the register transaction, not reachable from a test
		return RegistrationResponse{}, err
	}
	// #257 writes the "registered" mail to the outbox here, in this transaction, when status is enrolled.
	// #257 writes the "waitlisted" mail to the outbox here, in this transaction, when status is waitlisted.
	return commitRead(ctx, tx, classID, f.scoutID)
}

// lockScout takes the Scout row FOR UPDATE when the caller is its Parent,
// with the caller's name and address for the snapshot. The same
// statement is the ownership check: found is false for another Parent's
// Scout or an id that is not a uuid.
func lockScout(ctx context.Context, tx *sql.Tx, c authn.Caller, scoutID string) (scoutSnapshot, error) {
	var s scoutSnapshot
	id, ok := parseID(scoutID)
	if !ok {
		return s, nil
	}
	err := tx.QueryRowContext(ctx, `SELECT s.first_name, s.last_name, s.unit, s.accommodations,
			COALESCE(NULLIF(u.display_name, ''), $3), u.email
		FROM scouts s JOIN users u ON u.uid = s.parent_uid
		WHERE s.id = $1 AND s.parent_uid = $2
		FOR UPDATE OF s`, id, c.UID, c.Email).Scan(&s.firstName, &s.lastName, &s.unit, &s.accommodations,
		&s.parentName, &s.parentEmail)
	if errors.Is(err, sql.ErrNoRows) {
		return s, nil
	}
	if err != nil {
		// coverage:ignore reason: a database failure inside the register transaction, not reachable from a test
		return s, fmt.Errorf("registrations: lock scout: %w", err)
	}
	s.found = true
	return s, nil
}

// lockUniversity takes the University row FOR SHARE, so its status and
// Registration Window stay still until the commit. found is false when
// there is no such University.
func lockUniversity(ctx context.Context, tx *sql.Tx, universityID string) (window, bool, error) {
	var w window
	err := tx.QueryRowContext(ctx, `SELECT status, registration_opens_at, registration_closes_at
		FROM universities WHERE id = $1 FOR SHARE`, universityID).Scan(&w.status, &w.opensAt, &w.closesAt)
	if errors.Is(err, sql.ErrNoRows) {
		return w, false, nil
	}
	if err != nil {
		// coverage:ignore reason: a database failure inside the seat transaction, not reachable from a test
		return w, false, fmt.Errorf("registrations: lock university: %w", err)
	}
	return w, true, nil
}

// lockClass takes the Class row FOR UPDATE, which puts every seat change
// of the Class in a line. found is false for a Class of another
// University or an id that is not a uuid.
func lockClass(ctx context.Context, tx *sql.Tx, universityID, classID string) (capacity int, found bool, err error) {
	id, ok := parseID(classID)
	if !ok {
		return 0, false, nil
	}
	err = tx.QueryRowContext(ctx, `SELECT capacity FROM classes
		WHERE id = $1 AND university_id = $2 FOR UPDATE`, id, universityID).Scan(&capacity)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, false, nil
	}
	if err != nil {
		// coverage:ignore reason: a database failure inside the register transaction, not reachable from a test
		return 0, false, fmt.Errorf("registrations: lock class: %w", err)
	}
	return capacity, true, nil
}

// checkPeriodConflict refuses a Registration when the Scout holds an
// enrolled or waitlisted Registration in another Class that shares a
// Period with this one. details names each such Class by id, with its
// badge title (docs/api-design.md section 7 rule 4). The Scout lock
// holds the rule: no constraint can, since it spans Classes.
func checkPeriodConflict(ctx context.Context, tx *sql.Tx, classID, scoutID string) error {
	rows, err := tx.QueryContext(ctx, `SELECT DISTINCT c.id, c.badge_title
		FROM registrations r
		JOIN classes c ON c.id = r.class_id
		JOIN class_periods other ON other.class_id = r.class_id
		JOIN class_periods this ON this.period_id = other.period_id AND this.class_id = $1
		WHERE r.scout_id = $2 AND r.class_id <> $1 AND r.status IN ('enrolled', 'waitlisted')`, classID, scoutID)
	if err != nil {
		// coverage:ignore reason: a database failure inside the register transaction, not reachable from a test
		return fmt.Errorf("registrations: read period conflicts: %w", err)
	}
	defer func() { _ = rows.Close() }()
	details := map[string]string{}
	for rows.Next() {
		var id, title string
		if err := rows.Scan(&id, &title); err != nil {
			// coverage:ignore reason: a database failure inside the register transaction, not reachable from a test
			return fmt.Errorf("registrations: scan period conflict: %w", err)
		}
		details[id] = title
	}
	if err := rows.Err(); err != nil {
		// coverage:ignore reason: a database failure inside the register transaction, not reachable from a test
		return fmt.Errorf("registrations: read period conflicts: %w", err)
	}
	if len(details) > 0 {
		return &apierr.RefusalError{Status: http.StatusConflict, Code: apierr.CodePeriodConflict,
			Message: "This scout is already registered for an overlapping period", Details: details}
	}
	return nil
}

// writeRegistration stores the Registration with a fresh consent record
// and snapshot. A cancelled row of the same Scout in the Class (the
// primary key) is updated in place and keeps its created_at, as the
// TypeScript kept it; the timestamp that does not apply to status is
// NULL, since a cancelled row can keep an old waitlisted_at.
func writeRegistration(ctx context.Context, tx *sql.Tx, classID, scoutID, status string, s scoutSnapshot, now time.Time) error {
	var enrolledAt, waitlistedAt any
	if status == statusEnrolled {
		enrolledAt = now
	} else {
		waitlistedAt = now
	}
	_, err := tx.ExecContext(ctx, `INSERT INTO registrations (class_id, scout_id, status, enrolled_at, waitlisted_at,
			parent_consent_at, accepted_policy_version, scout_first_name, scout_last_name, scout_unit,
			accommodations, parent_name, parent_email, purged_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NULL, $6, $6)
		ON CONFLICT (class_id, scout_id) DO UPDATE SET
			status = EXCLUDED.status, enrolled_at = EXCLUDED.enrolled_at, waitlisted_at = EXCLUDED.waitlisted_at,
			parent_consent_at = EXCLUDED.parent_consent_at, accepted_policy_version = EXCLUDED.accepted_policy_version,
			scout_first_name = EXCLUDED.scout_first_name, scout_last_name = EXCLUDED.scout_last_name,
			scout_unit = EXCLUDED.scout_unit, accommodations = EXCLUDED.accommodations,
			parent_name = EXCLUDED.parent_name, parent_email = EXCLUDED.parent_email,
			purged_at = NULL, updated_at = EXCLUDED.updated_at`,
		classID, scoutID, status, enrolledAt, waitlistedAt, now, policy.Version,
		s.firstName, s.lastName, s.unit, s.accommodations, s.parentName, s.parentEmail)
	if err != nil {
		// coverage:ignore reason: a database failure inside the register transaction, not reachable from a test
		return fmt.Errorf("registrations: write registration: %w", err)
	}
	return nil
}

// parseID parses a uuid from the path or the body. ok is false for text
// that is not one: it names no row, so the caller answers as for a
// missing row, never with a cast error.
func parseID(s string) (uuid.UUID, bool) {
	id, err := uuid.Parse(s)
	return id, err == nil
}

// commitRead reads the Registration back inside tx, then commits.
func commitRead(ctx context.Context, tx *sql.Tx, classID, scoutID string) (RegistrationResponse, error) {
	reg, err := loadRegistration(ctx, tx, classID, scoutID)
	if err != nil {
		// coverage:ignore reason: a database failure inside the register transaction, not reachable from a test
		return reg, err
	}
	if err := tx.Commit(); err != nil {
		// coverage:ignore reason: a database failure inside the register transaction, not reachable from a test
		return reg, fmt.Errorf("registrations: commit register: %w", err)
	}
	return reg, nil
}
