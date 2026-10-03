// Package universities serves the core University routes: create, list
// mine, detail, patch, delete and the public read. It is the Go port of
// functions/src/universities-api (the six routes and the universities
// service). Each handler but Public runs behind authn.Middleware and
// reads the Caller from the request context.
package universities

import (
	"database/sql"
	"net/http"
	"time"

	"mbu/api/internal/apierr"
	"mbu/api/internal/authn"
	"mbu/api/internal/wiretime"
)

// Location is where a University takes place, as the app's
// UniversityLocation type reads it.
type Location struct {
	Name    string `json:"name"`
	Address string `json:"address"`
	City    string `json:"city"`
	State   string `json:"state"`
	Zip     string `json:"zip"`
}

// UniversityResponse is one University, as the app's UniversityResponse
// type reads it. Create and patch answer with it.
type UniversityResponse struct {
	ID                   string   `json:"id"`
	Title                string   `json:"title"`
	Status               string   `json:"status"`
	Timezone             string   `json:"timezone"`
	StartDate            string   `json:"startDate"`
	EndDate              *string  `json:"endDate"`
	RegistrationOpensAt  *string  `json:"registrationOpensAt"`
	RegistrationClosesAt string   `json:"registrationClosesAt"`
	Location             Location `json:"location"`
	CreatedByUID         string   `json:"createdByUid"`
	ReviewNote           *string  `json:"reviewNote"`
	SubmittedAt          *string  `json:"submittedAt"`
	CreatedAt            string   `json:"createdAt"`
	UpdatedAt            string   `json:"updatedAt"`
}

// universityColumns is the column list each query of a universities row
// returns, in the order scanUniversity reads.
const universityColumns = `id, title, status, timezone, start_date, end_date, registration_opens_at,
	registration_closes_at, location_name, location_address, location_city, location_state, location_zip,
	created_by_uid, review_note, submitted_at, created_at, updated_at`

// university is one universities row as Go reads it.
type university struct {
	id, title, status, timezone               string
	startDate, registrationClosesAt           time.Time
	endDate, registrationOpensAt, submittedAt sql.NullTime
	location                                  Location
	createdByUID                              string
	reviewNote                                sql.NullString
	createdAt, updatedAt                      time.Time
}

// rowScanner is a *sql.Row or *sql.Rows.
type rowScanner interface {
	Scan(dest ...any) error
}

// scanUniversity reads one universities row.
func scanUniversity(row rowScanner) (university, error) {
	var u university
	err := row.Scan(&u.id, &u.title, &u.status, &u.timezone, &u.startDate, &u.endDate, &u.registrationOpensAt,
		&u.registrationClosesAt, &u.location.Name, &u.location.Address, &u.location.City, &u.location.State,
		&u.location.Zip, &u.createdByUID, &u.reviewNote, &u.submittedAt, &u.createdAt, &u.updatedAt)
	return u, err //nolint:wrapcheck // each caller wraps it with its own context
}

// response is the row as a UniversityResponse.
func (u university) response() UniversityResponse {
	var note *string
	if u.reviewNote.Valid {
		note = &u.reviewNote.String
	}
	return UniversityResponse{
		ID:                   u.id,
		Title:                u.title,
		Status:               u.status,
		Timezone:             u.timezone,
		StartDate:            wiretime.Format(u.startDate),
		EndDate:              wiretime.FormatNull(u.endDate),
		RegistrationOpensAt:  wiretime.FormatNull(u.registrationOpensAt),
		RegistrationClosesAt: wiretime.Format(u.registrationClosesAt),
		Location:             u.location,
		CreatedByUID:         u.createdByUID,
		ReviewNote:           note,
		SubmittedAt:          wiretime.FormatNull(u.submittedAt),
		CreatedAt:            wiretime.Format(u.createdAt),
		UpdatedAt:            wiretime.Format(u.updatedAt),
	}
}

// errNotFound is the 404 for a University that does not exist. The
// public read answers it for every status but published too, so a probe
// cannot tell a hidden University from a missing one.
var errNotFound = &apierr.RefusalError{Status: http.StatusNotFound, Code: apierr.CodeNotFound, Message: "University not found"}

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
