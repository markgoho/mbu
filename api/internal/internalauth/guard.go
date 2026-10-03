// Package internalauth decides who may reach /api/internal/**: the
// Retention Purge (#256) and the mail drain (#257). Nobody signs in to
// reach them, so the caller is authenticated here, not by
// authn.Middleware. Copied from doula-cloud (ADR-0037).
//
// The boundary is a caller identity, not a shared string (ADR 0005).
// mbu-api allows allUsers to invoke it, because the app calls it, and
// Cloud Run IAM is per service, not per path. So only the service itself
// can tell an internal caller from the public internet. A caller
// presents a Google-signed OIDC ID token, and the guard checks the
// signature, the audience, and the token's email claim against the
// service accounts it is configured to accept.
//
// A shared secret stays as a second mechanism, for the local stack only:
// a local run has no metadata server and nothing to mint a token with.
// Cloud Run sets no secret, and no secret configured means the header is
// refused.
package internalauth

import (
	"context"
	"crypto/subtle"
	"net/http"
	"strings"

	"mbu/api/internal/apierr"
)

// MsgUnauthorized is the message of the 401 every internal route sends
// to a caller the guard refuses.
const MsgUnauthorized = "Missing or invalid internal caller credentials"

// ValidateFunc verifies one Google-signed OIDC ID token against the
// audience it must carry, and returns the verified email claim on it --
// the calling service account. It is a field rather than a package call
// so a test can exercise the guard without reaching Google for signing
// certificates; GoogleValidator is the production implementation.
type ValidateFunc func(ctx context.Context, token, audience string) (email string, err error)

// Config is everything the guard needs. The zero value refuses every
// request, which is the safe answer for a service that was started with
// nothing configured.
type Config struct {
	// Audience is the value a caller's token must carry in `aud`, which
	// is the Cloud Run service's own base URL. An empty Audience turns
	// the token path off entirely rather than accepting any audience.
	Audience string
	// Callers is the set of service account emails whose tokens are
	// accepted. Empty turns the token path off: an allowlist of nobody
	// is not an allowlist of everybody.
	Callers []string
	// Validate verifies the token. Nil turns the token path off.
	Validate ValidateFunc
	// Secret is the X-Internal-Secret value, for the end-to-end stack
	// and a local run only. Empty refuses the header.
	Secret string
}

// Guard answers whether one request may reach an internal endpoint.
type Guard struct {
	audience string
	callers  map[string]struct{}
	validate ValidateFunc
	secret   string
}

// New builds a guard from cfg. Caller emails are trimmed, lowercased and
// de-duplicated, so a configuration string a person edited by hand does
// not turn into a caller nobody can match.
func New(cfg Config) *Guard {
	callers := make(map[string]struct{}, len(cfg.Callers))
	for _, caller := range cfg.Callers {
		if trimmed := normalizeEmail(caller); trimmed != "" {
			callers[trimmed] = struct{}{}
		}
	}
	return &Guard{
		audience: strings.TrimSpace(cfg.Audience),
		callers:  callers,
		validate: cfg.Validate,
		secret:   cfg.Secret,
	}
}

// FromSecret is the local and end-to-end guard: the X-Internal-Secret
// header and nothing else. Production never builds one of these.
func FromSecret(secret string) *Guard {
	return New(Config{Secret: secret})
}

// Allow reports whether r carries an accepted internal caller's
// credentials. A nil guard refuses everything, so a handler wired with
// no guard at all fails closed rather than panicking.
func (g *Guard) Allow(r *http.Request) bool {
	if g == nil {
		return false
	}
	if g.allowToken(r) {
		return true
	}
	return g.secret != "" &&
		subtle.ConstantTimeCompare([]byte(r.Header.Get("X-Internal-Secret")), []byte(g.secret)) == 1
}

// Require is Allow plus the refusal every internal endpoint writes when
// it says no -- one refusal, so the endpoints behind this boundary
// cannot drift into answering differently from each other. It returns
// true when the handler should carry on.
func (g *Guard) Require(w http.ResponseWriter, r *http.Request) bool {
	if g.Allow(r) {
		return true
	}
	apierr.WriteError(w, MsgUnauthorized, http.StatusUnauthorized)
	return false
}

// Middleware runs next only for a request Require allows. The router
// mounts every /api/internal/ route behind it, so a handler cannot
// forget the check.
func (g *Guard) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if g.Require(w, r) {
			next.ServeHTTP(w, r)
		}
	})
}

// allowToken is the OIDC leg. Every one of the three configuration
// values has to be present: a missing audience or an empty allowlist is
// a half-configured service, and half-configured must refuse rather than
// wave a signed token through.
func (g *Guard) allowToken(r *http.Request) bool {
	token := bearerToken(r.Header.Get("Authorization"))
	if token == "" || g.validate == nil || g.audience == "" || len(g.callers) == 0 {
		return false
	}
	email, err := g.validate(r.Context(), token, g.audience)
	if err != nil {
		return false
	}
	_, ok := g.callers[normalizeEmail(email)]
	return ok
}

// normalizeEmail is how both the allowlist and a token's email claim are
// compared: trimmed and lowercased.
func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// bearerToken reads the token out of an Authorization header. The scheme
// is matched case-insensitively because RFC 7235 says it is
// case-insensitive, and Google's own clients have sent both spellings.
func bearerToken(header string) string {
	const scheme = "bearer "
	if len(header) < len(scheme) || !strings.EqualFold(header[:len(scheme)], scheme) {
		return ""
	}
	return strings.TrimSpace(header[len(scheme):])
}
