package registrations

import (
	"database/sql"
	"net/http"
	"time"

	"mbu/api/internal/apierr"
)

// window is what the Registration Window rules read of a University.
type window struct {
	status   string
	opensAt  sql.NullTime
	closesAt time.Time
}

// registerRefusal is the port of window-policy.ts assertWindowOpen: a
// Registration needs a published University and now inside the
// Registration Window. A Chancellor of the University or a Super-admin
// (bypass) skips each check, the status check too. It returns nil when
// the Registration may go on.
func (w window) registerRefusal(bypass bool, now time.Time) error {
	switch {
	case bypass:
		return nil
	case w.status != statusPublished:
		return refusal(http.StatusForbidden, apierr.CodeEventNotOpen, "This event is not open for registration")
	case w.opensAt.Valid && now.Before(w.opensAt.Time):
		return refusal(http.StatusForbidden, apierr.CodeRegistrationNotOpen, "Registration has not opened yet")
	case now.After(w.closesAt):
		return errRegistrationClosed
	}
	return nil
}

// cancelRefusal is the cancel rule of the TypeScript: a cancel needs only
// now at or before the close of the Registration Window, so a Parent can
// always drop while registration is open. A Chancellor or a Super-admin
// (bypass) can cancel after the close too, to fix a Roster.
func (w window) cancelRefusal(bypass bool, now time.Time) error {
	if !bypass && now.After(w.closesAt) {
		return errRegistrationClosed
	}
	return nil
}
