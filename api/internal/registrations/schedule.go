package registrations

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"

	"mbu/api/internal/apierr"
)

// Schedule is GET /api/registrations/{universityId}: the enrolled and
// waitlisted Registrations of the caller's Scouts at the University,
// oldest first. A University that does not exist, or where the caller
// has none, gives an empty list, as the TypeScript did. One family
// bounds the list, so it has no pagination.
func Schedule(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		all, err := listSchedule(r.Context(), db, caller(r).UID, r.PathValue("universityId"))
		if err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		apierr.WriteJSON(w, http.StatusOK, ScheduleResponse{Registrations: all})
	})
}

func listSchedule(ctx context.Context, db *sql.DB, uid, universityID string) ([]RegistrationResponse, error) {
	rows, err := db.QueryContext(ctx, registrationSelect+`
		JOIN scouts s ON s.id = r.scout_id
		WHERE s.parent_uid = $1 AND c.university_id = $2 AND r.status IN ('enrolled', 'waitlisted')
		ORDER BY r.created_at, r.class_id, r.scout_id`, uid, universityID)
	if err != nil {
		return nil, fmt.Errorf("registrations: list schedule: %w", err)
	}
	defer func() { _ = rows.Close() }()
	all := []RegistrationResponse{}
	for rows.Next() {
		reg, err := scanRegistration(rows)
		if err != nil {
			// coverage:ignore reason: a database failure in the middle of a read, not reachable from a test
			return nil, fmt.Errorf("registrations: scan schedule: %w", err)
		}
		all = append(all, reg)
	}
	if err := rows.Err(); err != nil {
		// coverage:ignore reason: a database failure in the middle of a read, not reachable from a test
		return nil, fmt.Errorf("registrations: read schedule: %w", err)
	}
	return all, nil
}
