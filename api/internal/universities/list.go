package universities

import (
	"context"
	"database/sql"
	"net/http"
	"time"

	"mbu/api/internal/apierr"
	"mbu/api/internal/wiretime"
)

// UniversitySummary is one University of the caller's list, as the
// app's UniversitySummary type reads it.
type UniversitySummary struct {
	ID         string  `json:"id"`
	Title      string  `json:"title"`
	Status     string  `json:"status"`
	StartDate  string  `json:"startDate"`
	EndDate    *string `json:"endDate"`
	ClassCount int     `json:"classCount"`
}

// UniversityListResponse is the body of GET /api/universities/mine.
type UniversityListResponse struct {
	Universities []UniversitySummary `json:"universities"`
}

// ListMine is GET /api/universities/mine: each University the caller is
// an active Chancellor of, oldest first, with its Class count. One
// person's events bound the list, so it has no pagination. A
// Super-admin sees only their own, as in the TypeScript.
func ListMine(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		all, err := listMine(r.Context(), db, caller(r).UID)
		if err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		apierr.WriteJSON(w, http.StatusOK, UniversityListResponse{Universities: all})
	})
}

func listMine(ctx context.Context, db *sql.DB, uid string) ([]UniversitySummary, error) {
	all := []UniversitySummary{}
	err := eachRow(ctx, db, "mine", `SELECT u.id, u.title, u.status, u.start_date, u.end_date,
			(SELECT count(*) FROM classes c WHERE c.university_id = u.id)
		FROM role_grants g JOIN universities u ON u.id = g.university_id
		WHERE g.uid = $1 AND g.status = 'active' AND g.role = 'chancellor'
		ORDER BY u.created_at, u.id`, func(row rowScanner) error {
		var (
			s     UniversitySummary
			start time.Time
			end   sql.NullTime
		)
		if err := row.Scan(&s.ID, &s.Title, &s.Status, &start, &end, &s.ClassCount); err != nil {
			// coverage:ignore reason: a database failure in the middle of a read, not reachable from a test
			return err //nolint:wrapcheck // eachRow wraps it
		}
		s.StartDate, s.EndDate = wiretime.Format(start), wiretime.FormatNull(end)
		all = append(all, s)
		return nil
	}, uid)
	return all, err
}
