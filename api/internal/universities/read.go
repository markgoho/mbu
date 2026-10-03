package universities

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"time"

	"mbu/api/internal/apierr"
	"mbu/api/internal/authz"
	"mbu/api/internal/wiretime"
)

// PeriodResponse is one Period, as the app's Period type reads it.
type PeriodResponse struct {
	PeriodID string `json:"periodId"`
	Label    string `json:"label"`
	StartsAt string `json:"startsAt"`
	EndsAt   string `json:"endsAt"`
}

// ClassCounselorResponse is one Counselor of a Class, as the app's
// ClassCounselor type reads it. displayName is the Counselor's current
// name (docs/data-model.md, "Effects on the JSON contract", item 5).
type ClassCounselorResponse struct {
	UID                  string `json:"uid"`
	DisplayName          string `json:"displayName"`
	BSAID                string `json:"bsaId"`
	DisclaimerAcceptedAt string `json:"disclaimerAcceptedAt"`
	DisclaimerVersion    string `json:"disclaimerVersion"`
}

// ClassResponse is one Class, as the app's ClassResponse type reads it.
type ClassResponse struct {
	ClassID       string                   `json:"classId"`
	BadgeSlug     string                   `json:"badgeSlug"`
	BadgeTitle    string                   `json:"badgeTitle"`
	EagleRequired bool                     `json:"eagleRequired"`
	PeriodIDs     []string                 `json:"periodIds"`
	Capacity      int                      `json:"capacity"`
	EnrolledCount int                      `json:"enrolledCount"`
	WaitlistCount int                      `json:"waitlistCount"`
	Room          *string                  `json:"room"`
	Notes         *string                  `json:"notes"`
	Counselors    []ClassCounselorResponse `json:"counselors"`
	CreatedAt     string                   `json:"createdAt"`
	UpdatedAt     string                   `json:"updatedAt"`
}

// UniversityDetail is the University of a detail read: a
// UniversityResponse with its Periods, as the app's
// UniversityResponse & { periods } reads it.
type UniversityDetail struct {
	UniversityResponse
	Periods []PeriodResponse `json:"periods"`
}

// UniversityDetailResponse is the body of GET /api/universities/{id}, as
// the app's UniversityDetailResponse type reads it.
type UniversityDetailResponse struct {
	University UniversityDetail `json:"university"`
	Classes    []ClassResponse  `json:"classes"`
}

// PublicClassCounselor is a Counselor as the public read shows one: the
// name only.
type PublicClassCounselor struct {
	DisplayName string `json:"displayName"`
}

// PublicClass is a Class as the public read shows one, as the app's
// PublicClass type reads it.
type PublicClass struct {
	ClassID        string                 `json:"classId"`
	BadgeSlug      string                 `json:"badgeSlug"`
	BadgeTitle     string                 `json:"badgeTitle"`
	EagleRequired  bool                   `json:"eagleRequired"`
	PeriodIDs      []string               `json:"periodIds"`
	Room           *string                `json:"room"`
	Notes          *string                `json:"notes"`
	Capacity       int                    `json:"capacity"`
	EnrolledCount  int                    `json:"enrolledCount"`
	SeatsRemaining int                    `json:"seatsRemaining"`
	WaitlistCount  int                    `json:"waitlistCount"`
	Counselors     []PublicClassCounselor `json:"counselors"`
}

// PublicUniversity is the body of GET /api/universities/{id}/public, as
// the app's PublicUniversity type reads it. It has no status, no
// moderation fields and no uid.
type PublicUniversity struct {
	ID                   string           `json:"id"`
	Title                string           `json:"title"`
	Timezone             string           `json:"timezone"`
	StartDate            string           `json:"startDate"`
	EndDate              *string          `json:"endDate"`
	RegistrationOpensAt  *string          `json:"registrationOpensAt"`
	RegistrationClosesAt string           `json:"registrationClosesAt"`
	Location             Location         `json:"location"`
	Periods              []PeriodResponse `json:"periods"`
	Classes              []PublicClass    `json:"classes"`
}

// Detail is GET /api/universities/{id}: the University with its Periods
// and Classes, for its Chancellor or a Super-admin. The role check runs
// before the read, as in the TypeScript: a caller with no grant gets 403
// also for a University that does not exist.
func Detail(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		if err := authz.AssertChancellorOf(r.Context(), db, caller(r), id); err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		s, err := loadSchedule(r.Context(), db, id, false)
		if err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		classes := make([]ClassResponse, 0, len(s.classes))
		for _, c := range s.classes {
			classes = append(classes, c.response())
		}
		apierr.WriteJSON(w, http.StatusOK, UniversityDetailResponse{
			University: UniversityDetail{UniversityResponse: s.university.response(), Periods: s.periods},
			Classes:    classes,
		})
	})
}

// Public is GET /api/universities/{id}/public: the read anyone with the
// link may make. Only a published University resolves; each other
// status answers the same 404 as a missing one. The route table puts it
// behind the rate limit and Cache-Control: no-store.
func Public(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		s, err := loadSchedule(r.Context(), db, r.PathValue("id"), true)
		if err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		u := s.university.response()
		classes := make([]PublicClass, 0, len(s.classes))
		for _, c := range s.classes {
			classes = append(classes, c.public())
		}
		apierr.WriteJSON(w, http.StatusOK, PublicUniversity{
			ID: u.ID, Title: u.Title, Timezone: u.Timezone, StartDate: u.StartDate, EndDate: u.EndDate,
			RegistrationOpensAt: u.RegistrationOpensAt, RegistrationClosesAt: u.RegistrationClosesAt,
			Location: u.Location, Periods: s.periods, Classes: classes,
		})
	})
}

// NoStore marks every response of next Cache-Control: no-store, the
// refusals too, so a link-shared read is never cached.
func NoStore(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}

// schedule is a University with its Periods and Classes, as the detail
// read and the public read show it.
type schedule struct {
	university university
	periods    []PeriodResponse
	classes    []*class
}

// class is one Class with its Periods, Counselors and counts.
type class struct {
	id, badgeSlug, badgeTitle    string
	eagleRequired                bool
	capacity, enrolled, waitlist int
	room, notes                  *string
	createdAt, updatedAt         time.Time
	periodIDs                    []string
	counselors                   []ClassCounselorResponse
}

// response is the Class as a ClassResponse.
func (c *class) response() ClassResponse {
	return ClassResponse{
		ClassID: c.id, BadgeSlug: c.badgeSlug, BadgeTitle: c.badgeTitle, EagleRequired: c.eagleRequired,
		PeriodIDs: c.periodIDs, Capacity: c.capacity, EnrolledCount: c.enrolled, WaitlistCount: c.waitlist,
		Room: c.room, Notes: c.notes, Counselors: c.counselors,
		CreatedAt: wiretime.Format(c.createdAt), UpdatedAt: wiretime.Format(c.updatedAt),
	}
}

// public is the Class as a PublicClass: the Counselors' names only, and
// the seats left.
func (c *class) public() PublicClass {
	counselors := make([]PublicClassCounselor, 0, len(c.counselors))
	for _, cc := range c.counselors {
		counselors = append(counselors, PublicClassCounselor{DisplayName: cc.DisplayName})
	}
	return PublicClass{
		ClassID: c.id, BadgeSlug: c.badgeSlug, BadgeTitle: c.badgeTitle, EagleRequired: c.eagleRequired,
		PeriodIDs: c.periodIDs, Room: c.room, Notes: c.notes, Capacity: c.capacity, EnrolledCount: c.enrolled,
		SeatsRemaining: max(0, c.capacity-c.enrolled), WaitlistCount: c.waitlist, Counselors: counselors,
	}
}

// loadSchedule reads the University id with its Periods (in position
// order), its Classes (oldest first) with their counts, each Class's
// Periods (in the University's Period order) and its Counselors (in the
// order they were added). A missing University is errNotFound; with
// publishedOnly, so is one that is not published, before the reads of
// its Periods and Classes.
func loadSchedule(ctx context.Context, db *sql.DB, id string, publishedOnly bool) (schedule, error) {
	var s schedule
	u, err := scanUniversity(db.QueryRowContext(ctx, `SELECT `+universityColumns+` FROM universities WHERE id = $1`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return s, errNotFound
	}
	if err != nil {
		return s, fmt.Errorf("universities: read university: %w", err)
	}
	if publishedOnly && u.status != statusPublished {
		return s, errNotFound
	}
	s.university = u
	if s.periods, err = loadPeriods(ctx, db, id); err != nil {
		// coverage:ignore reason: a database failure between the reads of one request, not reachable from a test
		return s, err
	}
	if s.classes, err = loadClasses(ctx, db, id); err != nil {
		// coverage:ignore reason: a database failure between the reads of one request, not reachable from a test
		return s, err
	}
	return s, nil
}

// queryer is a *sql.DB or a *sql.Tx, so a read can run inside the
// transaction of a write and see its rows.
type queryer interface {
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
}

// eachRow runs query and calls scan for each row.
func eachRow(ctx context.Context, q queryer, what, query string, scan func(rowScanner) error, args ...any) error {
	rows, err := q.QueryContext(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("universities: read %s: %w", what, err)
	}
	defer func() { _ = rows.Close() }()
	for rows.Next() {
		if err := scan(rows); err != nil {
			// coverage:ignore reason: a database failure in the middle of a read, not reachable from a test
			return fmt.Errorf("universities: scan %s: %w", what, err)
		}
	}
	if err := rows.Err(); err != nil {
		// coverage:ignore reason: a database failure in the middle of a read, not reachable from a test
		return fmt.Errorf("universities: read %s: %w", what, err)
	}
	return nil
}

// loadPeriods reads the Periods of the University in position order.
func loadPeriods(ctx context.Context, q queryer, id string) ([]PeriodResponse, error) {
	periods := []PeriodResponse{}
	err := eachRow(ctx, q, "periods", `SELECT id, label, starts_at, ends_at FROM periods
		WHERE university_id = $1 ORDER BY position, id`, func(row rowScanner) error {
		var (
			p            PeriodResponse
			starts, ends time.Time
		)
		if err := row.Scan(&p.PeriodID, &p.Label, &starts, &ends); err != nil {
			// coverage:ignore reason: a database failure in the middle of a read, not reachable from a test
			return err //nolint:wrapcheck // eachRow wraps it
		}
		p.StartsAt, p.EndsAt = wiretime.Format(starts), wiretime.Format(ends)
		periods = append(periods, p)
		return nil
	}, id)
	return periods, err
}

// loadClasses reads the Classes of the University, oldest first, with
// their counts, Periods and Counselors.
func loadClasses(ctx context.Context, q queryer, id string) ([]*class, error) {
	classes := []*class{}
	byID := map[string]*class{}
	err := eachRow(ctx, q, "classes", `SELECT c.id, c.badge_slug, c.badge_title, c.eagle_required, c.capacity,
			c.room, c.notes, c.created_at, c.updated_at,
			count(r.scout_id) FILTER (WHERE r.status = 'enrolled'),
			count(r.scout_id) FILTER (WHERE r.status = 'waitlisted')
		FROM classes c LEFT JOIN registrations r ON r.class_id = c.id
		WHERE c.university_id = $1
		GROUP BY c.id ORDER BY c.created_at, c.id`, func(row rowScanner) error {
		c := &class{periodIDs: []string{}, counselors: []ClassCounselorResponse{}}
		if err := row.Scan(&c.id, &c.badgeSlug, &c.badgeTitle, &c.eagleRequired, &c.capacity, &c.room, &c.notes,
			&c.createdAt, &c.updatedAt, &c.enrolled, &c.waitlist); err != nil {
			// coverage:ignore reason: a database failure in the middle of a read, not reachable from a test
			return err //nolint:wrapcheck // eachRow wraps it
		}
		classes = append(classes, c)
		byID[c.id] = c
		return nil
	}, id)
	if err != nil {
		// coverage:ignore reason: a database failure between the reads of one request, not reachable from a test
		return nil, err
	}
	err = eachRow(ctx, q, "class periods", `SELECT cp.class_id, cp.period_id
		FROM class_periods cp JOIN periods p ON p.id = cp.period_id
		WHERE cp.university_id = $1 ORDER BY p.position, p.id`, func(row rowScanner) error {
		var classID, periodID string
		if err := row.Scan(&classID, &periodID); err != nil {
			// coverage:ignore reason: a database failure in the middle of a read, not reachable from a test
			return err //nolint:wrapcheck // eachRow wraps it
		}
		if c, ok := byID[classID]; ok {
			c.periodIDs = append(c.periodIDs, periodID)
		}
		return nil
	}, id)
	if err != nil {
		// coverage:ignore reason: a database failure between the reads of one request, not reachable from a test
		return nil, err
	}
	err = eachRow(ctx, q, "class counselors", `SELECT cc.class_id, cc.uid, u.display_name, cc.bsa_id,
			cc.disclaimer_accepted_at, cc.disclaimer_version
		FROM class_counselors cc
		JOIN classes c ON c.id = cc.class_id
		JOIN users u ON u.uid = cc.uid
		WHERE c.university_id = $1 ORDER BY cc.created_at, cc.uid`, func(row rowScanner) error {
		var (
			classID  string
			cc       ClassCounselorResponse
			accepted time.Time
		)
		if err := row.Scan(&classID, &cc.UID, &cc.DisplayName, &cc.BSAID, &accepted, &cc.DisclaimerVersion); err != nil {
			// coverage:ignore reason: a database failure in the middle of a read, not reachable from a test
			return err //nolint:wrapcheck // eachRow wraps it
		}
		cc.DisclaimerAcceptedAt = wiretime.Format(accepted)
		if c, ok := byID[classID]; ok {
			c.counselors = append(c.counselors, cc)
		}
		return nil
	}, id)
	if err != nil {
		// coverage:ignore reason: a database failure between the reads of one request, not reachable from a test
		return nil, err
	}
	return classes, nil
}
