// Package users serves the adult's own account: the five /api/users/me
// routes. It is the Go port of functions/src/users-api (users.ts and the
// users service). Each handler runs behind authn.Middleware and reads the
// Caller from the request context.
package users

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"

	"mbu/api/internal/apierr"
	"mbu/api/internal/authn"
	"mbu/api/internal/authz"
	"mbu/api/internal/clock"
	"mbu/api/internal/policy"
	"mbu/api/internal/wiretime"
)

// UserResponse is the adult's account, as the app's UserResponse type
// reads it. A timestamp is a toISOString() string, or null.
type UserResponse struct {
	UID                   string  `json:"uid"`
	DisplayName           string  `json:"displayName"`
	Email                 string  `json:"email"`
	Phone                 *string `json:"phone"`
	AcceptedTermsAt       *string `json:"acceptedTermsAt"`
	AcceptedPrivacyAt     *string `json:"acceptedPrivacyAt"`
	AcceptedPolicyVersion *string `json:"acceptedPolicyVersion"`
	RosterExportAckAt     *string `json:"rosterExportAckAt"`
}

// BootstrapResponse is the body of POST /api/users/me: the account, and
// whether the adult must still accept the Terms and the Privacy Policy.
type BootstrapResponse struct {
	User         UserResponse `json:"user"`
	NeedsConsent bool         `json:"needsConsent"`
}

// userColumns is the column list each query of a users row returns, in
// the order scanUser reads.
const userColumns = `uid, display_name, email, phone, accepted_terms_at, accepted_privacy_at,
	accepted_policy_version, roster_export_ack_at`

// errNotBootstrapped is the 404 of onboarding for a caller with no users
// row: the app bootstraps the session first.
var errNotBootstrapped = &apierr.RefusalError{Status: http.StatusNotFound, Code: apierr.CodeNotFound,
	Message: "User not found; bootstrap the session first"}

// errNoUser is the 404 for a caller with no users row.
var errNoUser = &apierr.RefusalError{Status: http.StatusNotFound, Code: apierr.CodeNotFound, Message: "User not found"}

// scanUser reads one users row into its response. A missing row is
// errNoUser.
func scanUser(row *sql.Row) (UserResponse, error) {
	var (
		u                         UserResponse
		phone, policyVersion      sql.NullString
		terms, privacy, rosterAck sql.NullTime
	)
	err := row.Scan(&u.UID, &u.DisplayName, &u.Email, &phone, &terms, &privacy, &policyVersion, &rosterAck)
	if errors.Is(err, sql.ErrNoRows) {
		return UserResponse{}, errNoUser
	}
	if err != nil {
		return UserResponse{}, fmt.Errorf("users: read user: %w", err)
	}
	if phone.Valid {
		u.Phone = &phone.String
	}
	if policyVersion.Valid {
		u.AcceptedPolicyVersion = &policyVersion.String
	}
	u.AcceptedTermsAt = wiretime.FormatNull(terms)
	u.AcceptedPrivacyAt = wiretime.FormatNull(privacy)
	u.RosterExportAckAt = wiretime.FormatNull(rosterAck)
	return u, nil
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

// Bootstrap is POST /api/users/me. In one transaction it makes the
// caller's users row, or writes the Auth email into the row that exists
// (Auth is the authority for it), and claims the caller's pending
// invites. A repeat changes nothing more, so it needs no Idempotency-Key.
func Bootstrap(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, err := bootstrap(r.Context(), db, caller(r))
		if err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		apierr.WriteJSON(w, http.StatusOK, BootstrapResponse{
			User:         user,
			NeedsConsent: user.AcceptedTermsAt == nil || user.AcceptedPrivacyAt == nil,
		})
	})
}

func bootstrap(ctx context.Context, db *sql.DB, c authn.Caller) (UserResponse, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return UserResponse{}, fmt.Errorf("users: begin bootstrap: %w", err)
	}
	defer rollback(tx)

	user, err := scanUser(tx.QueryRowContext(ctx, `INSERT INTO users (uid, email) VALUES ($1, $2)
		ON CONFLICT (uid) DO UPDATE SET email = EXCLUDED.email, updated_at = now()
		RETURNING `+userColumns, c.UID, c.Email))
	if err != nil {
		// coverage:ignore reason: a database failure inside the bootstrap transaction, not reachable from a test
		return UserResponse{}, err
	}
	if err := authz.ClaimInvites(ctx, tx, c.UID, c.Email); err != nil {
		// coverage:ignore reason: a database failure inside the bootstrap transaction, not reachable from a test
		return UserResponse{}, err //nolint:wrapcheck // authz wraps it with its own context
	}
	if err := tx.Commit(); err != nil {
		// coverage:ignore reason: a database failure inside the bootstrap transaction, not reachable from a test
		return UserResponse{}, fmt.Errorf("users: commit bootstrap: %w", err)
	}
	return user, nil
}

// Get is GET /api/users/me: the caller's account, or 404.
func Get(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, err := scanUser(db.QueryRowContext(r.Context(),
			`SELECT `+userColumns+` FROM users WHERE uid = $1`, caller(r).UID))
		if err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		apierr.WriteJSON(w, http.StatusOK, user)
	})
}

// onboardingRequest is the body of PATCH /api/users/me. Each field is
// decoded as any, so a field of the wrong JSON type gets its own entry in
// details, not a bare "invalid request body".
type onboardingRequest struct {
	DisplayName   any `json:"displayName"`
	AcceptedTerms any `json:"acceptedTerms"`
}

// validate holds the rules of OnboardingRequestSchema: a displayName of
// one character or more, and acceptedTerms true. It returns the problem
// for each field at fault, keyed by the JSON field name.
func (req onboardingRequest) validate() (displayName string, details map[string]string) {
	details = map[string]string{}
	displayName, ok := req.DisplayName.(string)
	if !ok || displayName == "" {
		details["displayName"] = "Enter your name."
	}
	if accepted, ok := req.AcceptedTerms.(bool); !ok || !accepted {
		details["acceptedTerms"] = "Accept the Terms of Service and the Privacy Policy to continue."
	}
	return displayName, details
}

// Onboard is PATCH /api/users/me: it sets the name and stamps the
// acceptance of the Terms and the Privacy Policy with the Policy Version.
// The body is checked before the row is read, as Elysia checked it before
// the handler ran.
func Onboard(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req onboardingRequest
		if !apierr.DecodeJSON(w, r, &req) {
			return
		}
		displayName, details := req.validate()
		if len(details) > 0 {
			apierr.Write(w, http.StatusBadRequest, apierr.CodeInvalidArgument, "Check the onboarding form.", details)
			return
		}
		user, err := scanUser(db.QueryRowContext(r.Context(), `UPDATE users
			SET display_name = $2, accepted_terms_at = $3, accepted_privacy_at = $3,
			    accepted_policy_version = $4, updated_at = now()
			WHERE uid = $1
			RETURNING `+userColumns, caller(r).UID, displayName, clock.Now(r.Context()), policy.Version))
		if errors.Is(err, errNoUser) {
			err = errNotBootstrapped
		}
		if err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		apierr.WriteJSON(w, http.StatusOK, user)
	})
}

// AckRosterExport is POST /api/users/me/roster-export-ack: it stamps the
// first Roster export click-through. A stamp that exists stays, so a
// repeat returns the same row and needs no Idempotency-Key.
func AckRosterExport(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, err := scanUser(db.QueryRowContext(r.Context(), `UPDATE users
			SET roster_export_ack_at = COALESCE(roster_export_ack_at, $2),
			    updated_at = CASE WHEN roster_export_ack_at IS NULL THEN now() ELSE updated_at END
			WHERE uid = $1
			RETURNING `+userColumns, caller(r).UID, clock.Now(r.Context())))
		if err != nil {
			apierr.WriteErr(w, r, err)
			return
		}
		apierr.WriteJSON(w, http.StatusOK, user)
	})
}
