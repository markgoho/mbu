package universities

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"mbu/api/internal/apierr"
	"mbu/api/internal/authn"
	"mbu/api/internal/authz"
	"mbu/api/internal/clock"
)

// PeriodsResponse is the body of PUT /api/universities/{id}/periods, as
// the app's PeriodsResponse type reads it.
type PeriodsResponse struct {
	Periods []PeriodResponse `json:"periods"`
}

// periodInput is one Period of a PUT that passed its field checks. id is
// "" for a new Period.
type periodInput struct {
	id, label    string
	startsAt     time.Time
	endsAt       time.Time
	detailsField string
}

// The details entries of the Period checks. A key is the dotted path of
// the field in the body: "periods.0.label".
const (
	fieldPeriods       = "periods"
	msgPeriods         = "Send the periods as a list."
	msgPeriod          = "Send each period with a label, a start time and an end time."
	msgPeriodID        = "Send the period id of a period of this University, or leave it out for a new period."
	msgPeriodIDTwice   = "Send each period id once."
	msgPeriodLabel     = "Enter a label for the period."
	msgPeriodStartsAt  = "Enter the start time as a date and time."
	msgPeriodEndsAt    = "Enter the end time as a date and time."
	msgPeriodOrder     = "Enter an end time after the start time."
	msgCheckPeriods    = "Check the periods."
	msgPeriodsAssigned = "Cannot remove periods that are assigned to classes"
)

// PutPeriods is PUT /api/universities/{id}/periods: it replaces the
// University's Period set with the request's, in request order, for its
// Chancellor or a Super-admin, while the University is draft or
// rejected. A Period with a periodId keeps its id; one without gets a
// new id. A Period left out is removed, unless a Class uses it: then the
// answer is 409 with the Classes in details ({classId: badge title}).
// The field checks run first, then the role check, the University lock
// and its status check, then the checks that need the stored Periods.
// PUT replaces the whole set, so a repeat has the same effect and the
// route needs no Idempotency-Key.
func PutPeriods(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Periods json.RawMessage `json:"periods"`
		}
		if !apierr.DecodeJSON(w, r, &req) {
			return
		}
		inputs, details := checkPeriods(req.Periods)
		if len(details) > 0 {
			apierr.Write(w, http.StatusBadRequest, apierr.CodeInvalidArgument, msgCheckPeriods, details)
			return
		}
		periods, err := putPeriods(r.Context(), db, caller(r), r.PathValue("id"), inputs, clock.Now(r.Context()))
		if err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		apierr.WriteJSON(w, http.StatusOK, PeriodsResponse{Periods: periods})
	})
}

// checkPeriods holds the field rules of PeriodsPutRequestSchema and the
// checks of buildPeriods that need only the request: a list of objects,
// each with a label that is not blank once trimmed (stored trimmed),
// RFC 3339 start and end times with the start first, and an optional
// periodId that is text and named once.
func checkPeriods(raw json.RawMessage) ([]periodInput, map[string]string) {
	details := map[string]string{}
	var items []json.RawMessage
	if raw == nil || isNull(raw) || json.Unmarshal(raw, &items) != nil {
		details[fieldPeriods] = msgPeriods
		return nil, details
	}
	c := &checker{details: details}
	inputs := make([]periodInput, 0, len(items))
	seen := map[string]bool{}
	for i, item := range items {
		key := fieldPeriods + "." + strconv.Itoa(i)
		var fields struct {
			PeriodID json.RawMessage `json:"periodId"`
			Label    json.RawMessage `json:"label"`
			StartsAt json.RawMessage `json:"startsAt"`
			EndsAt   json.RawMessage `json:"endsAt"`
		}
		if isNull(item) || json.Unmarshal(item, &fields) != nil {
			details[key] = msgPeriod
			continue
		}
		p := periodInput{detailsField: key + ".periodId"}
		if id := c.text(fields.PeriodID, p.detailsField, msgPeriodID); id != nil {
			switch {
			case *id == "":
				details[p.detailsField] = msgPeriodID
			case seen[*id]:
				details[p.detailsField] = msgPeriodIDTwice
			}
			seen[*id] = true
			p.id = *id
		}
		label := c.text(fields.Label, key+".label", msgPeriodLabel)
		if label == nil || strings.TrimSpace(*label) == "" {
			details[key+".label"] = msgPeriodLabel
		} else {
			p.label = strings.TrimSpace(*label)
		}
		starts := c.instant(fields.StartsAt, key+".startsAt", msgPeriodStartsAt)
		ends := c.instant(fields.EndsAt, key+".endsAt", msgPeriodEndsAt)
		if fields.StartsAt == nil {
			details[key+".startsAt"] = msgPeriodStartsAt
		}
		if fields.EndsAt == nil {
			details[key+".endsAt"] = msgPeriodEndsAt
		}
		if starts != nil && ends != nil {
			if !starts.Before(*ends) {
				details[key+".endsAt"] = msgPeriodOrder
			}
			p.startsAt, p.endsAt = *starts, *ends
		}
		inputs = append(inputs, p)
	}
	return inputs, details
}

// lockUniversity is the start of each schedule write, inside its
// transaction: the role check, then the University lock (404 when it is
// missing). It returns the University's status.
func lockUniversity(ctx context.Context, tx *sql.Tx, c authn.Caller, universityID string) (string, error) {
	if err := authz.AssertChancellorOf(ctx, tx, c, universityID); err != nil {
		return "", err //nolint:wrapcheck // a refusal, or authz wraps it with its own context
	}
	var status string
	err := tx.QueryRowContext(ctx, `SELECT status FROM universities WHERE id = $1 FOR UPDATE`, universityID).Scan(&status)
	if errors.Is(err, sql.ErrNoRows) {
		return "", errNotFound
	}
	if err != nil {
		// coverage:ignore reason: a database failure inside a schedule transaction, not reachable from a test
		return "", fmt.Errorf("universities: lock university: %w", err)
	}
	return status, nil
}

// lockEditable is lockUniversity, then the status check: 409 unless the
// University is draft or rejected.
func lockEditable(ctx context.Context, tx *sql.Tx, c authn.Caller, universityID string) error {
	status, err := lockUniversity(ctx, tx, c, universityID)
	if err != nil {
		return err
	}
	return assertEditable(status)
}

// periodIDs reads the ids of the University's Periods, as text.
func periodIDs(ctx context.Context, tx *sql.Tx, universityID string) (map[string]bool, error) {
	ids := map[string]bool{}
	err := eachRow(ctx, tx, "period ids", `SELECT id::text FROM periods WHERE university_id = $1`,
		func(row rowScanner) error {
			var id string
			if err := row.Scan(&id); err != nil {
				// coverage:ignore reason: a database failure in the middle of a read, not reachable from a test
				return err //nolint:wrapcheck // eachRow wraps it
			}
			ids[id] = true
			return nil
		}, universityID)
	return ids, err
}

// putPeriods is the one transaction of PutPeriods. The in-use check, the
// delete of removed Periods, then the update of kept ones and the insert
// of new ones: a kept Period is updated in place, never deleted and
// inserted again, so no class_periods row loses its Period.
func putPeriods(ctx context.Context, db *sql.DB, c authn.Caller, universityID string, inputs []periodInput,
	now time.Time,
) ([]PeriodResponse, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("universities: begin put periods: %w", err)
	}
	defer rollback(tx)

	if err := lockEditable(ctx, tx, c, universityID); err != nil {
		return nil, err
	}
	stored, err := periodIDs(ctx, tx, universityID)
	if err != nil {
		// coverage:ignore reason: a database failure inside the put transaction, not reachable from a test
		return nil, err
	}
	kept := []string{}
	unknown := map[string]string{}
	for _, p := range inputs {
		if p.id == "" {
			continue
		}
		if !stored[p.id] {
			unknown[p.detailsField] = msgPeriodID
		}
		kept = append(kept, p.id)
	}
	if len(unknown) > 0 {
		return nil, &apierr.RefusalError{Status: http.StatusBadRequest, Code: apierr.CodeInvalidArgument,
			Message: msgCheckPeriods, Details: unknown}
	}
	if err := refuseRemovedInUse(ctx, tx, universityID, kept); err != nil {
		return nil, err
	}
	if err := writePeriods(ctx, tx, universityID, kept, inputs, now); err != nil {
		// coverage:ignore reason: a database failure inside the put transaction, not reachable from a test
		return nil, err
	}
	periods, err := loadPeriods(ctx, tx, universityID)
	if err != nil {
		// coverage:ignore reason: a database failure inside the put transaction, not reachable from a test
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		// coverage:ignore reason: a database failure inside the put transaction, not reachable from a test
		return nil, fmt.Errorf("universities: commit put periods: %w", err)
	}
	return periods, nil
}

// refuseRemovedInUse answers 409 when a Class uses a Period the request
// removes (each stored Period whose id is not in kept), with each such
// Class in details as {classId: badge title}, oldest Class first.
func refuseRemovedInUse(ctx context.Context, tx *sql.Tx, universityID string, kept []string) error {
	inUse := map[string]string{}
	err := eachRow(ctx, tx, "classes on removed periods", `SELECT c.id, c.badge_title FROM classes c
		WHERE c.university_id = $1 AND EXISTS (
			SELECT 1 FROM class_periods cp
			WHERE cp.class_id = c.id AND NOT (cp.period_id::text = ANY($2)))`,
		func(row rowScanner) error {
			var id, title string
			if err := row.Scan(&id, &title); err != nil {
				// coverage:ignore reason: a database failure in the middle of a read, not reachable from a test
				return err //nolint:wrapcheck // eachRow wraps it
			}
			inUse[id] = title
			return nil
		}, universityID, kept)
	if err != nil {
		// coverage:ignore reason: a database failure inside the put transaction, not reachable from a test
		return err
	}
	if len(inUse) > 0 {
		return &apierr.RefusalError{Status: http.StatusConflict, Code: apierr.CodeConflict,
			Message: msgPeriodsAssigned, Details: inUse}
	}
	return nil
}

// writePeriods deletes the removed Periods, updates the kept ones and
// inserts the new ones, with position = the index in the request, and
// stamps the University's updated_at.
func writePeriods(ctx context.Context, tx *sql.Tx, universityID string, kept []string, inputs []periodInput,
	now time.Time,
) error {
	if _, err := tx.ExecContext(ctx, `DELETE FROM periods WHERE university_id = $1 AND NOT (id::text = ANY($2))`,
		universityID, kept); err != nil {
		// coverage:ignore reason: a database failure inside the put transaction, not reachable from a test
		return fmt.Errorf("universities: delete periods: %w", err)
	}
	for i, p := range inputs {
		var err error
		if p.id != "" {
			_, err = tx.ExecContext(ctx, `UPDATE periods SET label = $3, starts_at = $4, ends_at = $5,
				position = $6, updated_at = $7 WHERE university_id = $1 AND id = $2`,
				universityID, p.id, p.label, p.startsAt, p.endsAt, i, now)
		} else {
			_, err = tx.ExecContext(ctx, `INSERT INTO periods (university_id, label, starts_at, ends_at, position,
				created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $6)`,
				universityID, p.label, p.startsAt, p.endsAt, i, now)
		}
		if err != nil {
			// coverage:ignore reason: a database failure inside the put transaction, not reachable from a test
			return fmt.Errorf("universities: write period %d: %w", i, err)
		}
	}
	if _, err := tx.ExecContext(ctx, `UPDATE universities SET updated_at = $2 WHERE id = $1`, universityID, now); err != nil {
		// coverage:ignore reason: a database failure inside the put transaction, not reachable from a test
		return fmt.Errorf("universities: stamp university: %w", err)
	}
	return nil
}
