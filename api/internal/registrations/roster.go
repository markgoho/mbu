package registrations

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"mbu/api/internal/apierr"
	"mbu/api/internal/authn"
	"mbu/api/internal/authz"
	"mbu/api/internal/wiretime"
)

// RosterRow is one enrolled or waitlisted Scout of a Class Roster, as
// the app's RosterRow type reads it. The six personal fields come from
// the Registration's snapshot; the Retention Purge sets them to null
// (#256), and the row stays valid.
type RosterRow struct {
	ScoutID         string  `json:"scoutId"`
	ScoutFirstName  *string `json:"scoutFirstName"`
	ScoutLastName   *string `json:"scoutLastName"`
	ScoutUnit       *string `json:"scoutUnit"`
	Accommodations  *string `json:"accommodations"`
	ParentName      *string `json:"parentName"`
	ParentEmail     *string `json:"parentEmail"`
	ConsentReceived bool    `json:"consentReceived"`
	Status          string  `json:"status"`
}

// RosterClass is the Class of a Class Roster.
type RosterClass struct {
	ClassID        string   `json:"classId"`
	BadgeTitle     string   `json:"badgeTitle"`
	PeriodLabels   []string `json:"periodLabels"`
	Room           *string  `json:"room"`
	Capacity       int      `json:"capacity"`
	EnrolledCount  int      `json:"enrolledCount"`
	WaitlistCount  int      `json:"waitlistCount"`
	CounselorNames []string `json:"counselorNames"`
}

// ClassRoster is one Class with its enrolled and waitlisted Scouts, as
// the app's ClassRoster type reads it.
type ClassRoster struct {
	Class      RosterClass `json:"class"`
	Enrolled   []RosterRow `json:"enrolled"`
	Waitlisted []RosterRow `json:"waitlisted"`
}

// RosterLocation is the University's location.
type RosterLocation struct {
	Name    string `json:"name"`
	Address string `json:"address"`
	City    string `json:"city"`
	State   string `json:"state"`
	Zip     string `json:"zip"`
}

// RosterUniversity is the University of a Roster.
type RosterUniversity struct {
	Title     string         `json:"title"`
	StartDate string         `json:"startDate"`
	EndDate   *string        `json:"endDate"`
	Location  RosterLocation `json:"location"`
	Timezone  string         `json:"timezone"`
}

// RosterResponse is the body of GET /api/registrations/{universityId}/roster,
// as the app's RosterResponse type reads it.
type RosterResponse struct {
	University   RosterUniversity `json:"university"`
	ClassRosters []ClassRoster    `json:"classRosters"`
}

// errNoRosterClasses is the refusal of a caller who is neither a
// Chancellor of the University nor a Counselor of one of its Classes.
var errNoRosterClasses = refusal(http.StatusForbidden, apierr.CodeForbidden,
	"You do not have access to any classes in this event")

// Roster is GET /api/registrations/{universityId}/roster: the Class
// Rosters of a University. A Chancellor of the University or a
// Super-admin sees every Class; a Counselor sees only the Classes of
// their active Counselor grants; any other caller gets 403. The
// University is read first, so a missing one is 404 for every caller,
// as in the TypeScript.
//
// The Roster is the one place where a Scout's personal data leaves the
// API. Only a Chancellor and the Class's Counselors reach the rows, so
// accommodations needs no filter of its own.
//
// It has no pagination: the enrolled rows are bounded by Capacity (at
// most 200) times the number of Classes. The Waitlists have no cap, and
// that is accepted (docs/api-design.md, section 4, rule 4).
func Roster(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		roster, err := readRoster(r.Context(), db, caller(r), r.PathValue("universityId"))
		if err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		apierr.WriteJSON(w, http.StatusOK, roster)
	})
}

// readRoster reads the Roster in one read-only REPEATABLE READ
// transaction, so each count agrees with the rows next to it while a
// seat transaction commits in between the reads.
func readRoster(ctx context.Context, db *sql.DB, c authn.Caller, universityID string) (RosterResponse, error) {
	var roster RosterResponse
	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelRepeatableRead, ReadOnly: true})
	if err != nil {
		return roster, fmt.Errorf("registrations: begin roster: %w", err)
	}
	defer rollback(tx)

	if roster.University, err = readRosterUniversity(ctx, tx, universityID); err != nil {
		return roster, err
	}
	seesAll, err := authz.IsChancellorOf(ctx, tx, c, universityID)
	if err != nil {
		// coverage:ignore reason: a database failure between the reads of one request, not reachable from a test
		return roster, fmt.Errorf("registrations: roster role: %w", err)
	}
	granted := []string{}
	if !seesAll {
		if granted, err = authz.ActiveClassGrants(ctx, tx, c.UID, universityID); err != nil {
			// coverage:ignore reason: a database failure between the reads of one request, not reachable from a test
			return roster, fmt.Errorf("registrations: roster grants: %w", err)
		}
		if len(granted) == 0 {
			return roster, errNoRosterClasses
		}
	}
	if roster.ClassRosters, err = readClassRosters(ctx, tx, universityID, seesAll, granted); err != nil {
		// coverage:ignore reason: a database failure between the reads of one request, not reachable from a test
		return roster, err
	}
	return roster, nil
}

// readRosterUniversity reads the University of the Roster, or
// errUniversityNotFound. universities.id is text, so an id that is not a
// uuid finds no row.
func readRosterUniversity(ctx context.Context, tx *sql.Tx, id string) (RosterUniversity, error) {
	var (
		u     RosterUniversity
		start time.Time
		end   sql.NullTime
	)
	err := tx.QueryRowContext(ctx, `SELECT title, start_date, end_date, location_name, location_address,
			location_city, location_state, location_zip, timezone
		FROM universities WHERE id = $1`, id).Scan(&u.Title, &start, &end, &u.Location.Name,
		&u.Location.Address, &u.Location.City, &u.Location.State, &u.Location.Zip, &u.Timezone)
	if errors.Is(err, sql.ErrNoRows) {
		return u, errUniversityNotFound
	}
	if err != nil {
		// coverage:ignore reason: a database failure after the transaction began, not reachable from a test
		return u, fmt.Errorf("registrations: read roster university: %w", err)
	}
	u.StartDate, u.EndDate = wiretime.Format(start), wiretime.FormatNull(end)
	return u, nil
}

// readClassRosters reads the Classes of the University in scope (every
// Class when seesAll, else those in granted), oldest first, then their
// enrolled and waitlisted Registrations. Period labels and Counselor names come as JSON arrays,
// since either can hold a comma: labels in the University's Period
// order, names (live, from users) in the order the Counselors were
// added, as the University detail read shows them.
func readClassRosters(ctx context.Context, tx *sql.Tx, universityID string, seesAll bool, granted []string) ([]ClassRoster, error) {
	rosters := []ClassRoster{}
	byID := map[string]int{}
	err := eachRow(ctx, tx, "roster classes", `SELECT c.id, c.badge_title, c.room, c.capacity,
			(SELECT count(*) FROM registrations r WHERE r.class_id = c.id AND r.status = 'enrolled'),
			(SELECT count(*) FROM registrations r WHERE r.class_id = c.id AND r.status = 'waitlisted'),
			COALESCE((SELECT json_agg(p.label ORDER BY p.position, p.id)
				FROM class_periods cp JOIN periods p ON p.id = cp.period_id
				WHERE cp.class_id = c.id), '[]'),
			COALESCE((SELECT json_agg(u.display_name ORDER BY cc.created_at, cc.uid)
				FROM class_counselors cc JOIN users u ON u.uid = cc.uid
				WHERE cc.class_id = c.id), '[]')
		FROM classes c
		WHERE c.university_id = $1 AND ($2 OR c.id::text = ANY($3))
		ORDER BY c.created_at, c.id`, func(row rowScanner) error {
		var (
			cr            ClassRoster
			labels, names []byte
		)
		if err := row.Scan(&cr.Class.ClassID, &cr.Class.BadgeTitle, &cr.Class.Room, &cr.Class.Capacity,
			&cr.Class.EnrolledCount, &cr.Class.WaitlistCount, &labels, &names); err != nil {
			// coverage:ignore reason: a database failure in the middle of a read, not reachable from a test
			return err //nolint:wrapcheck // eachRow wraps it
		}
		if err := json.Unmarshal(labels, &cr.Class.PeriodLabels); err != nil {
			// coverage:ignore reason: Postgres json_agg of text always decodes as []string
			return err //nolint:wrapcheck // eachRow wraps it
		}
		if err := json.Unmarshal(names, &cr.Class.CounselorNames); err != nil {
			// coverage:ignore reason: Postgres json_agg of text always decodes as []string
			return err //nolint:wrapcheck // eachRow wraps it
		}
		cr.Enrolled, cr.Waitlisted = []RosterRow{}, []RosterRow{}
		byID[cr.Class.ClassID] = len(rosters)
		rosters = append(rosters, cr)
		return nil
	}, universityID, seesAll, granted)
	if err != nil {
		// coverage:ignore reason: a database failure between the reads of one request, not reachable from a test
		return nil, err
	}
	err = eachRow(ctx, tx, "roster rows", rosterRowsSelect, func(row rowScanner) error {
		var (
			classID string
			rr      RosterRow
		)
		if err := row.Scan(&classID, &rr.ScoutID, &rr.ScoutFirstName, &rr.ScoutLastName, &rr.ScoutUnit,
			&rr.Accommodations, &rr.ParentName, &rr.ParentEmail, &rr.ConsentReceived, &rr.Status); err != nil {
			// coverage:ignore reason: a database failure in the middle of a read, not reachable from a test
			return err //nolint:wrapcheck // eachRow wraps it
		}
		cr := &rosters[byID[classID]]
		if rr.Status == statusEnrolled {
			cr.Enrolled = append(cr.Enrolled, rr)
		} else {
			cr.Waitlisted = append(cr.Waitlisted, rr)
		}
		return nil
	}, universityID, seesAll, granted)
	if err != nil {
		// coverage:ignore reason: a database failure between the reads of one request, not reachable from a test
		return nil, err
	}
	return rosters, nil
}

// rosterRowsSelect reads the enrolled and waitlisted Registrations of
// the University's Classes in scope, with the same scope filter as the
// Classes, so no row of another Class is read. Enrolled Scouts are in name order (last
// name, then first name) by the ICU root collation, the order of the
// TypeScript's localeCompare, not byte order; a purged name sorts as ""
// (first), as the TypeScript's ?? "" did. Waitlisted Scouts are in
// Waitlist order. scout_id breaks each tie.
const rosterRowsSelect = `SELECT r.class_id, r.scout_id, r.scout_first_name, r.scout_last_name,
		r.scout_unit, r.accommodations, r.parent_name, r.parent_email,
		r.parent_consent_at IS NOT NULL, r.status
	FROM registrations r JOIN classes c ON c.id = r.class_id
	WHERE c.university_id = $1 AND ($2 OR c.id::text = ANY($3))
		AND r.status IN ('enrolled', 'waitlisted')
	ORDER BY
		CASE WHEN r.status = 'enrolled' THEN COALESCE(r.scout_last_name, '') END COLLATE "und-x-icu",
		CASE WHEN r.status = 'enrolled' THEN COALESCE(r.scout_first_name, '') END COLLATE "und-x-icu",
		r.waitlisted_at, r.scout_id`

// queryer is a *sql.DB or a *sql.Tx.
type queryer interface {
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
}

// eachRow runs query and calls scan for each row.
func eachRow(ctx context.Context, q queryer, what, query string, scan func(rowScanner) error, args ...any) error {
	rows, err := q.QueryContext(ctx, query, args...)
	if err != nil {
		// coverage:ignore reason: a database failure between the reads of one request, not reachable from a test
		return fmt.Errorf("registrations: read %s: %w", what, err)
	}
	defer func() { _ = rows.Close() }()
	for rows.Next() {
		if err := scan(rows); err != nil {
			// coverage:ignore reason: a database failure in the middle of a read, not reachable from a test
			return fmt.Errorf("registrations: scan %s: %w", what, err)
		}
	}
	if err := rows.Err(); err != nil {
		// coverage:ignore reason: a database failure in the middle of a read, not reachable from a test
		return fmt.Errorf("registrations: read %s: %w", what, err)
	}
	return nil
}
