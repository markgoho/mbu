// Package apierrtest is the one place a test reads the error envelope
// (docs/api-design.md section 7) back off the wire, the way authntest is
// the one place a test builds an authn.Verifier double. A test that
// decodes into its own anonymous struct could not notice the envelope's
// JSON tags moving; one that decodes through here does.
package apierrtest

import (
	"encoding/json"
	"net/http"
	"testing"

	"mbu/api/internal/apierr"
)

// Decode reads resp's body as one section 7 error envelope, for an
// assertion that has to see a refusal's code, message or details rather
// than only its status. A body that will not decode fails the test where
// it is read, so a caller never has to answer an error it has nothing to
// do about.
//
// The body is left open: every call site already holds a
// `defer resp.Body.Close()` from where it made the request, and closing
// here would put a second Close on the same body.
//
// A recorder-based test passes rec.Result().
func Decode(t *testing.T, resp *http.Response) apierr.APIError {
	t.Helper()
	var out apierr.APIError
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		// coverage:ignore reason: the failure branch ends the calling test by design; exercising it would need a testing.T substitute this repo has no precedent for
		t.Fatalf("decode section 7 error envelope: %v", err)
	}
	return out
}
