// Package session is the HTTP surface of the API-owned session (ADR
// 0007): POST /api/session exchanges a Firebase ID token for the
// __session cookie, GET /api/session tells the app who is signed in, and
// DELETE /api/session ends the session. The session itself (token, row,
// expiry) belongs to authn. Copied in part from doula-cloud's
// session package; MBU has one population, so there is no eviction.
package session

import (
	"database/sql"
	"log"
	"net/http"
	"strings"

	"mbu/api/internal/apierr"
	"mbu/api/internal/authn"
	"mbu/api/internal/clock"
)

// Response is the body of POST and GET /api/session: the signed-in
// adult, as the app's guards need it.
type Response struct {
	UID   string `json:"uid"`
	Email string `json:"email"`
	// DisplayName is the account's name at sign-in, from the ID token's
	// `name` claim; empty when the account has none.
	DisplayName string `json:"displayName"`
	// SuperAdmin is the `superAdmin` custom claim at sign-in. A change
	// of the claim takes effect at the next sign-in.
	SuperAdmin bool `json:"superAdmin"`
}

// response is the body of a session.
func response(s authn.Session) Response {
	return Response{UID: s.UID, Email: s.Email, DisplayName: s.DisplayName, SuperAdmin: s.SuperAdmin}
}

// createRequest is the body of POST /api/session. The ID token goes in
// the body, not an Authorization header: no request of the app carries
// one (ADR 0007).
type createRequest struct {
	IDToken string `json:"idToken"`
}

// Create is POST /api/session. It verifies the ID token with the
// identity provider and refuses the same tokens the Bearer middleware
// refused before ADR 0007: 401 for an invalid token or one with no
// email, 403 EMAIL_NOT_VERIFIED for an unverified email. So a session
// exists only for a verified email. It then ends the session the
// browser's cookie names, if any, mints a new one and sets the cookie.
func Create(verifier authn.Verifier, db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req createRequest
		if !apierr.DecodeJSON(w, r, &req) {
			return
		}
		idToken := strings.TrimSpace(req.IDToken)
		if idToken == "" {
			apierr.WriteFieldError(w, http.StatusBadRequest, apierr.CodeInvalidArgument, "idToken", "idToken is required")
			return
		}
		token, err := verifier.VerifyIDToken(r.Context(), idToken)
		if err != nil {
			// Expired, revoked, malformed or signed by someone else: the
			// caller signs in again in every case. The reason goes to the
			// log for diagnosis.
			log.Printf("session: refused ID token: %v", err)
			apierr.WriteError(w, "Invalid auth token", http.StatusUnauthorized)
			return
		}
		if token.Email == "" {
			apierr.WriteError(w, "Authenticated account has no email address", http.StatusUnauthorized)
			return
		}
		if !token.EmailVerified {
			apierr.Write(w, http.StatusForbidden, apierr.CodeEmailNotVerified, "Email address is not verified", nil)
			return
		}

		// A browser holds one session cookie. The new cookie replaces the
		// old one, so the old row is ended, not left to expire.
		if old, err := r.Cookie(authn.SessionCookieName); err == nil {
			if err := authn.EndSession(r.Context(), db, old.Value); err != nil {
				apierr.WriteInternal(w, r, err)
				return
			}
		}
		cookie, err := authn.MintSession(r.Context(), db, *token, clock.Now(r.Context()))
		if err != nil {
			apierr.WriteInternal(w, r, err)
			return
		}
		http.SetCookie(w, cookie)
		apierr.WriteJSON(w, http.StatusOK, response(authn.Session{
			UID: token.UID, Email: strings.ToLower(token.Email), SuperAdmin: token.SuperAdmin, DisplayName: token.DisplayName,
		}))
	})
}

// Get is GET /api/session, behind authn.Middleware: the signed-in
// adult. The app's guards read it in place of the Firebase user and its
// claims. A 401 from the middleware means "no session".
func Get() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		s, _ := authn.SessionFrom(r.Context())
		w.Header().Set("Cache-Control", "no-store")
		apierr.WriteJSON(w, http.StatusOK, response(s))
	})
}

// End is DELETE /api/session: it deletes the session the cookie names
// and clears the cookie. It needs no live session and always answers
// 204, with no cookie or with one that names nothing: sign-out must not
// fail and leave a person signed in. Only this browser's session ends.
func End(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if cookie, err := r.Cookie(authn.SessionCookieName); err == nil {
			if err := authn.EndSession(r.Context(), db, cookie.Value); err != nil {
				// The browser loses its copy of the token either way, and
				// the row expires within authn.SessionLifetime.
				log.Printf("session: end session: %v", err)
			}
		}
		http.SetCookie(w, authn.ClearSessionCookie())
		w.WriteHeader(http.StatusNoContent)
	})
}
