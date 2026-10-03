// Package registrations serves the Registration routes of a Parent:
// register a Scout for a Class, cancel that Registration, and read the
// Parent's Schedule at a University. It is the Go port of
// functions/src/registrations-api (#254). Each handler runs behind
// authn.Middleware and reads the Caller from the request context.
//
// The register and cancel transactions take their locks in the order of
// docs/data-model.md, "The seat transaction and its lock strategy".
package registrations

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	"mbu/api/internal/apierr"
	"mbu/api/internal/authn"
	"mbu/api/internal/wiretime"
)

// RegistrationResponse is one enrolled or waitlisted Registration, as
// the app's RegistrationResponse type reads it.
type RegistrationResponse struct {
	ScoutID      string   `json:"scoutId"`
	ClassID      string   `json:"classId"`
	UniversityID string   `json:"universityId"`
	Status       string   `json:"status"`
	PeriodIDs    []string `json:"periodIds"`
	BadgeSlug    string   `json:"badgeSlug"`
	BadgeTitle   string   `json:"badgeTitle"`
	WaitlistedAt *string  `json:"waitlistedAt"`
	EnrolledAt   *string  `json:"enrolledAt"`
}

// ScheduleResponse is the body of GET /api/registrations/{universityId}.
type ScheduleResponse struct {
	Registrations []RegistrationResponse `json:"registrations"`
}

// The Registration Status values the code compares against, and the
// University Status a Registration needs.
const (
	statusPublished  = "published"
	statusEnrolled   = "enrolled"
	statusWaitlisted = "waitlisted"
)

// registrationSelect reads Registrations as RegistrationResponse rows.
// periodIds come as one comma-joined text in Period position order, as
// the University detail lists a Class's periodIds; a uuid holds no comma.
const registrationSelect = `SELECT r.scout_id, r.class_id, c.university_id, r.status,
		COALESCE((SELECT string_agg(cp.period_id::text, ',' ORDER BY p.position, p.id)
			FROM class_periods cp JOIN periods p ON p.id = cp.period_id
			WHERE cp.class_id = r.class_id), ''),
		c.badge_slug, c.badge_title, r.waitlisted_at, r.enrolled_at
	FROM registrations r JOIN classes c ON c.id = r.class_id`

// rowScanner is a *sql.Row or *sql.Rows.
type rowScanner interface {
	Scan(dest ...any) error
}

// scanRegistration reads one row of registrationSelect.
func scanRegistration(row rowScanner) (RegistrationResponse, error) {
	var (
		reg                    RegistrationResponse
		periods                string
		waitlisted, enrolledAt sql.NullTime
	)
	if err := row.Scan(&reg.ScoutID, &reg.ClassID, &reg.UniversityID, &reg.Status, &periods,
		&reg.BadgeSlug, &reg.BadgeTitle, &waitlisted, &enrolledAt); err != nil {
		// coverage:ignore reason: a database failure in the middle of a read, not reachable from a test
		return reg, err //nolint:wrapcheck // each caller wraps it with its own context
	}
	reg.PeriodIDs = []string{}
	if periods != "" {
		reg.PeriodIDs = strings.Split(periods, ",")
	}
	reg.WaitlistedAt, reg.EnrolledAt = wiretime.FormatNull(waitlisted), wiretime.FormatNull(enrolledAt)
	return reg, nil
}

// loadRegistration reads the Registration of the Scout in the Class, in
// tx, after the write.
func loadRegistration(ctx context.Context, tx *sql.Tx, classID, scoutID string) (RegistrationResponse, error) {
	reg, err := scanRegistration(tx.QueryRowContext(ctx, registrationSelect+`
		WHERE r.class_id = $1 AND r.scout_id = $2`, classID, scoutID))
	if err != nil {
		// coverage:ignore reason: a database failure inside the register transaction, not reachable from a test
		return reg, fmt.Errorf("registrations: read registration: %w", err)
	}
	return reg, nil
}

// refusal is a 4xx with no details.
func refusal(status int, code apierr.Code, message string) *apierr.RefusalError {
	return &apierr.RefusalError{Status: status, Code: code, Message: message}
}

// The refusals more than one route gives.
var (
	errUniversityNotFound = refusal(http.StatusNotFound, apierr.CodeNotFound, "University not found")
	errRegistrationClosed = refusal(http.StatusForbidden, apierr.CodeRegistrationClosed, "Registration is closed")
	// errNotYourScout is authz.AssertOwnsScout's refusal, for a Scout
	// the register transaction found absent under its own lock.
	errNotYourScout = refusal(http.StatusForbidden, apierr.CodeForbidden, "You do not have access to this scout")
)

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
