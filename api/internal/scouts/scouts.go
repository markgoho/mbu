// Package scouts serves a Parent's Scouts: the four routes under
// /api/users/me/scouts. It is the Go port of functions/src/users-api
// (scouts.ts and the scouts service). Each handler runs behind
// authn.Middleware and reads the Caller from the request context.
//
// A Scout holds minimal personal data: no date of birth (only the coarse
// Age Band), no structured medical data, and accommodations as free text.
package scouts

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
	"mbu/api/internal/clock"
	"mbu/api/internal/pgerr"
	"mbu/api/internal/seats"
)

// ScoutResponse is one Scout, as the app's ScoutResponse type reads it.
type ScoutResponse struct {
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

// ScoutListResponse is the body of GET /api/users/me/scouts.
type ScoutListResponse struct {
	Scouts []ScoutResponse `json:"scouts"`
}

// scoutColumns is the column list each query of a scouts row returns, in
// the order scan reads.
const scoutColumns = `id, first_name, last_name, unit, council, district, age_band, bsa_id, accommodations`

// errNotFound is the 404 for a Scout that does not exist or belongs to
// another Parent: the caller may not know it exists.
var errNotFound = &apierr.RefusalError{Status: http.StatusNotFound, Code: apierr.CodeNotFound, Message: "Scout not found"}

// errNotBootstrapped is the 404 of a create for a caller with no users
// row: the app bootstraps the session first.
var errNotBootstrapped = &apierr.RefusalError{Status: http.StatusNotFound, Code: apierr.CodeNotFound,
	Message: "User not found; bootstrap the session first"}

// rowScanner is a *sql.Row or *sql.Rows.
type rowScanner interface {
	Scan(dest ...any) error
}

// scan reads one scouts row into its response.
func scan(row rowScanner) (ScoutResponse, error) {
	var s ScoutResponse
	err := row.Scan(&s.ScoutID, &s.FirstName, &s.LastName, &s.Unit, &s.Council, &s.District,
		&s.AgeBand, &s.BSAID, &s.Accommodations)
	return s, err //nolint:wrapcheck // each caller wraps it with its own context
}

// caller is the Caller authn.Middleware put in the request context.
func caller(r *http.Request) authn.Caller {
	c, _ := authn.CallerFrom(r.Context())
	return c
}

// rollback ends a transaction that did not commit. After a commit it does
// nothing.
func rollback(tx *sql.Tx) {
	_ = tx.Rollback()
}

// List is GET /api/users/me/scouts: the caller's Scouts, oldest first. One
// family bounds the list, so it has no pagination.
func List(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		list, err := list(r.Context(), db, caller(r).UID)
		if err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		apierr.WriteJSON(w, http.StatusOK, ScoutListResponse{Scouts: list})
	})
}

func list(ctx context.Context, db *sql.DB, uid string) ([]ScoutResponse, error) {
	rows, err := db.QueryContext(ctx, `SELECT `+scoutColumns+` FROM scouts
		WHERE parent_uid = $1 ORDER BY created_at, id`, uid)
	if err != nil {
		return nil, fmt.Errorf("scouts: list: %w", err)
	}
	defer func() { _ = rows.Close() }()
	all := []ScoutResponse{}
	for rows.Next() {
		s, err := scan(rows)
		if err != nil {
			// coverage:ignore reason: a database failure in the middle of a read, not reachable from a test
			return nil, fmt.Errorf("scouts: scan: %w", err)
		}
		all = append(all, s)
	}
	if err := rows.Err(); err != nil {
		// coverage:ignore reason: a database failure in the middle of a read, not reachable from a test
		return nil, fmt.Errorf("scouts: read list: %w", err)
	}
	return all, nil
}

// ageBands is the closed set of Age Bands (scouts_age_band_check).
var ageBands = map[string]bool{"10-11": true, "12-13": true, "14-15": true, "16-17": true}

// scoutRequest is the body of a create or an update. Each field is
// decoded as any, so a field of the wrong JSON type gets its own entry in
// details, not a bare "invalid request body".
type scoutRequest struct {
	FirstName      any `json:"firstName"`
	LastName       any `json:"lastName"`
	Unit           any `json:"unit"`
	Council        any `json:"council"`
	District       any `json:"district"`
	AgeBand        any `json:"ageBand"`
	BSAID          any `json:"bsaId"`
	Accommodations any `json:"accommodations"`
}

// scoutFields is a scoutRequest that passed validate: the values to
// store, with nil for each optional field left out or null.
type scoutFields struct {
	firstName, lastName                                     string
	unit, council, district, ageBand, bsaID, accommodations *string
}

// validate holds the rules of ScoutRequestSchema: a firstName and a
// lastName of one character or more; unit, council, district, bsaId and
// accommodations absent, null or text; ageBand absent, null or one of
// the four Age Bands. It returns the problem for each field at fault,
// keyed by the JSON field name.
func (req scoutRequest) validate() (scoutFields, map[string]string) {
	details := map[string]string{}
	name := func(v any, field, message string) string {
		s, ok := v.(string)
		if !ok || s == "" {
			details[field] = message
		}
		return s
	}
	text := func(v any, field, message string) *string {
		switch s := v.(type) {
		case nil:
			return nil
		case string:
			return &s
		default:
			details[field] = message
			return nil
		}
	}
	f := scoutFields{
		firstName:      name(req.FirstName, "firstName", "Enter the Scout's first name."),
		lastName:       name(req.LastName, "lastName", "Enter the Scout's last name."),
		unit:           text(req.Unit, "unit", "Enter the unit as text."),
		council:        text(req.Council, "council", "Enter the council as text."),
		district:       text(req.District, "district", "Enter the district as text."),
		ageBand:        text(req.AgeBand, "ageBand", ageBandMessage),
		bsaID:          text(req.BSAID, "bsaId", "Enter the BSA member ID as text."),
		accommodations: text(req.Accommodations, "accommodations", "Enter the accommodations as text."),
	}
	if f.ageBand != nil && !ageBands[*f.ageBand] {
		details["ageBand"] = ageBandMessage
	}
	return f, details
}

// ageBandMessage is the details entry for an ageBand that is not one of
// the four Age Bands.
const ageBandMessage = "Choose an age band: 10-11, 12-13, 14-15 or 16-17."

// decodeScout decodes and checks the body of a create or an update. On a
// refusal it writes the answer and returns false.
func decodeScout(w http.ResponseWriter, r *http.Request) (scoutFields, bool) {
	var req scoutRequest
	if !apierr.DecodeJSON(w, r, &req) {
		return scoutFields{}, false
	}
	f, details := req.validate()
	if len(details) > 0 {
		apierr.Write(w, http.StatusBadRequest, apierr.CodeInvalidArgument, "Check the Scout form.", details)
		return scoutFields{}, false
	}
	return f, true
}

// Create is POST /api/users/me/scouts: a new Scout of the caller. It
// answers 200, as the TypeScript did. The route is replayable, so it sets
// no header but Content-Type.
func Create(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		f, ok := decodeScout(w, r)
		if !ok {
			return
		}
		now := clock.Now(r.Context())
		s, err := scan(db.QueryRowContext(r.Context(), `INSERT INTO scouts (parent_uid, first_name, last_name,
			unit, council, district, age_band, bsa_id, accommodations, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
			RETURNING `+scoutColumns, caller(r).UID, f.firstName, f.lastName,
			f.unit, f.council, f.district, f.ageBand, f.bsaID, f.accommodations, now))
		switch {
		case pgerr.IsForeignKeyViolationOn(err, "scouts_parent_uid_fkey"):
			apierr.WriteErr(w, r, errNotBootstrapped)
		case err != nil:
			apierr.WriteErr(w, r, fmt.Errorf("scouts: create: %w", err))
		default:
			apierr.WriteJSON(w, http.StatusOK, s)
		}
	})
}

// Update is PATCH /api/users/me/scouts/{scoutId}: it replaces every field
// of the caller's Scout. A field left out becomes null, as the TypeScript
// stored it. The body is checked before the Scout is looked up, as
// Elysia checked it before the handler ran. A Scout of another Parent,
// or an id that is not a uuid, is 404.
func Update(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		f, ok := decodeScout(w, r)
		if !ok {
			return
		}
		id, err := uuid.Parse(r.PathValue("scoutId"))
		if err != nil {
			apierr.WriteErr(w, r, errNotFound)
			return
		}
		s, err := scan(db.QueryRowContext(r.Context(), `UPDATE scouts
			SET first_name = $3, last_name = $4, unit = $5, council = $6, district = $7,
			    age_band = $8, bsa_id = $9, accommodations = $10, updated_at = $11
			WHERE id = $1 AND parent_uid = $2
			RETURNING `+scoutColumns, id, caller(r).UID, f.firstName, f.lastName,
			f.unit, f.council, f.district, f.ageBand, f.bsaID, f.accommodations, clock.Now(r.Context())))
		switch {
		case errors.Is(err, sql.ErrNoRows):
			apierr.WriteErr(w, r, errNotFound)
		case err != nil:
			apierr.WriteErr(w, r, fmt.Errorf("scouts: update: %w", err))
		default:
			apierr.WriteJSON(w, http.StatusOK, s)
		}
	})
}

// Delete is DELETE /api/users/me/scouts/{scoutId}: the right to erasure
// for one Scout (docs/data-model.md, "Delete and purge behavior"). An
// active Registration does not block it. A Scout of another Parent, or an
// id that is not a uuid, is 404.
func Delete(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(r.PathValue("scoutId"))
		if err != nil {
			apierr.WriteErr(w, r, errNotFound)
			return
		}
		if err := deleteScout(r.Context(), db, caller(r).UID, id.String(), clock.Now(r.Context())); err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
}

// deleteScout is the one transaction of Delete. It takes the locks in
// the order of docs/data-model.md, "Lock order": the Scout row (the same
// statement is the ownership check), then seats.CancelActiveOfScouts
// cancels each enrolled or waitlisted Registration and gives a freed seat
// to the Waitlist. The DELETE then cascades to every Registration of the
// Scout, the cancelled and purged ones too.
func deleteScout(ctx context.Context, db *sql.DB, uid, scoutID string, now time.Time) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("scouts: begin delete: %w", err)
	}
	defer rollback(tx)

	var locked string
	err = tx.QueryRowContext(ctx, `SELECT id FROM scouts WHERE id = $1 AND parent_uid = $2 FOR UPDATE`,
		scoutID, uid).Scan(&locked)
	if errors.Is(err, sql.ErrNoRows) {
		return errNotFound
	}
	if err != nil {
		// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
		return fmt.Errorf("scouts: lock scout: %w", err)
	}

	// #257 writes the "promoted" mail for each Promotion here.
	if _, err := seats.CancelActiveOfScouts(ctx, tx, now, []string{scoutID}); err != nil {
		// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
		return err //nolint:wrapcheck // seats wraps it with its own context
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM scouts WHERE id = $1`, scoutID); err != nil {
		// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
		return fmt.Errorf("scouts: delete scout: %w", err)
	}
	if err := tx.Commit(); err != nil {
		// coverage:ignore reason: a database failure inside the delete transaction, not reachable from a test
		return fmt.Errorf("scouts: commit delete: %w", err)
	}
	return nil
}
