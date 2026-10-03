// Package apierr is the one place the structured error body of
// docs/api-design.md section 7 is written from, and the one writer of
// success JSON and request-body decoding. Every handler calls Write,
// WriteError, WriteJSON or DecodeJSON here instead of http.Error or its
// own encoder; usage_test.go holds that rule over the whole module.
package apierr

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"runtime/debug"
)

// Code is a machine-readable APIError.Code value, drawn from the
// enumerated set below rather than invented per call site.
type Code string

// The generic codes of section 7, then the MBU codes a client branches
// on (ported from functions/src/shared-api/errors/http-error.ts, now
// UPPER_SNAKE like the rest). A new refusal that the app must tell apart
// from the others adds a code here.
const (
	CodeInvalidArgument    Code = "INVALID_ARGUMENT"
	CodeUnauthorized       Code = "UNAUTHORIZED"
	CodeForbidden          Code = "FORBIDDEN"
	CodeNotFound           Code = "NOT_FOUND"
	CodeConflict           Code = "CONFLICT"
	CodeFailedPrecondition Code = "FAILED_PRECONDITION"
	CodeRateLimited        Code = "RATE_LIMITED"
	CodeInternal           Code = "INTERNAL_ERROR"
	CodePayloadTooLarge    Code = "PAYLOAD_TOO_LARGE"

	// CodeEmailNotVerified is the 403 for a signed-in adult whose email
	// address is not verified. The app sends that adult to the
	// verify-email gate instead of an error page.
	CodeEmailNotVerified Code = "EMAIL_NOT_VERIFIED"
	// CodeClassFull refuses a Registration when the Class is at Capacity
	// and the caller did not ask for the Waitlist.
	CodeClassFull Code = "CLASS_FULL"
	// CodePeriodConflict refuses a Registration that makes a Period
	// Conflict for the Scout.
	CodePeriodConflict Code = "PERIOD_CONFLICT"
	// CodeEventNotOpen refuses a Registration for a University that is
	// not published.
	CodeEventNotOpen Code = "EVENT_NOT_OPEN"
	// CodeRegistrationNotOpen refuses a Registration before the
	// Registration Window opens.
	CodeRegistrationNotOpen Code = "REGISTRATION_NOT_OPEN"
	// CodeRegistrationClosed refuses a Registration after the
	// Registration Window closes.
	CodeRegistrationClosed Code = "REGISTRATION_CLOSED"
	// CodeConsentRequired refuses a Registration that does not carry the
	// Parent's consent to the current Policy Version.
	CodeConsentRequired Code = "CONSENT_REQUIRED"
	// CodeCloseEventsFirst refuses to delete the account of an adult
	// who is still the Chancellor of a University that is neither draft
	// nor closed.
	CodeCloseEventsFirst Code = "CLOSE_EVENTS_FIRST"
)

// ForbiddenCodes is the closed set of codes a 403 may carry
// (docs/api-design.md section 7 rule 6). Each one is a different kind of
// refusal the reader can act on in a different way:
//
//   - CodeForbidden -- a role refusal. CodeForStatus gives this to every
//     403 that names no more specific reason, so it is also the default.
//   - CodeEmailNotVerified -- verify the address, then try again.
//   - CodeEventNotOpen, CodeRegistrationNotOpen, CodeRegistrationClosed
//     -- the University or its Registration Window does not take
//     Registrations now.
//   - CodeConsentRequired -- give consent, then try again.
//   - CodeCloseEventsFirst -- close the Universities, then try again.
//
// A new kind of 403 adds a code here, not new wording on CodeForbidden.
// TestEveryForbiddenWriteCarriesARecordedCode holds the set closed.
var ForbiddenCodes = map[Code]bool{
	CodeForbidden:           true,
	CodeEmailNotVerified:    true,
	CodeEventNotOpen:        true,
	CodeRegistrationNotOpen: true,
	CodeRegistrationClosed:  true,
	CodeConsentRequired:     true,
	CodeCloseEventsFirst:    true,
}

// APIError is the structured error body of docs/api-design.md section 7.
//
// Code is the enumerated Code type, not a bare string, so a reader
// compares against the constants above with no conversion. Code's
// underlying type is string, so the JSON is a plain string --
// TestAPIError_CodeSerializesAsAPlainJSONString holds that.
type APIError struct {
	Code    Code              `json:"code"`
	Message string            `json:"message"`
	Details map[string]string `json:"details,omitempty"`
}

// MsgInternalError is the message a caller sees for a failure that
// carries no detail it can act on: a database error, an encoding error,
// a panic. The detail goes to the log, never to the caller.
const MsgInternalError = "internal error"

// MaxRequestBodyBytes bounds how much of a request body DecodeJSON reads
// before it gives up, via http.MaxBytesReader. No JSON body of this API
// needs more than 1 MiB.
const MaxRequestBodyBytes = 1 << 20 // 1 MiB

// WriteJSON sends status with body v as JSON. It is the one success-body
// writer for every handler; Write is its counterpart for a refusal.
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	// coverage:ignore reason: response encoding failure, not exercised by unit tests
	_ = json.NewEncoder(w).Encode(v)
}

// Write sends status with body {code, message, details} as JSON. details
// is nil unless the caller has something to say about a field.
func Write(w http.ResponseWriter, status int, code Code, message string, details map[string]string) {
	WriteJSON(w, status, APIError{Code: code, Message: message, Details: details})
}

// WriteInternal answers an error the handler cannot recover from: it
// logs err with its detail and writes a 500 with CodeInternal and
// MsgInternalError, so the detail never reaches the caller.
func WriteInternal(w http.ResponseWriter, r *http.Request, err error) {
	log.Printf("internal error: %q %q: %v", r.Method, r.URL.Path, err) //nolint:gosec // G706: %q escapes the request fields, so a crafted path cannot forge a log line
	Write(w, http.StatusInternalServerError, CodeInternal, MsgInternalError, nil)
}

// Recover is the panic-safe 500 path. A handler that panics is answered
// like WriteInternal: the panic value and the stack go to the log, and
// the caller gets CodeInternal with no detail. http.ErrAbortHandler is
// panicked again, because net/http uses it to abort a response on
// purpose and handles it itself.
func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			v := recover()
			if v == nil {
				return
			}
			if err, ok := v.(error); ok && errors.Is(err, http.ErrAbortHandler) {
				panic(v)
			}
			log.Printf("panic: %q %q: %v\n%s", r.Method, r.URL.Path, v, debug.Stack()) //nolint:gosec // G706: %q escapes the request fields, so a crafted path cannot forge a log line
			Write(w, http.StatusInternalServerError, CodeInternal, MsgInternalError, nil)
		}()
		next.ServeHTTP(w, r)
	})
}

// WriteFieldError is Write for a refusal about exactly one field: field is
// the request DTO's own JSON name (docs/api-design.md section 7 rule 4),
// and message is written once -- it becomes both the summary Message and
// the single entry of Details.
func WriteFieldError(w http.ResponseWriter, status int, code Code, field, message string) {
	msg, details := FieldDetails(field, message)
	Write(w, status, code, msg, details)
}

// FieldDetails is WriteFieldError's "message written once" step, for a
// caller that must return the (message, details) pair to a shared Write
// call instead of calling Write itself.
func FieldDetails(field, message string) (string, map[string]string) {
	return message, map[string]string{field: message}
}

// DecodeJSON decodes r.Body into v, first wrapping it in
// http.MaxBytesReader(w, r.Body, MaxRequestBodyBytes) so an oversized
// body can't be read at all. A body over the cap gets its own refusal
// (413, CodePayloadTooLarge), so the app can tell "too much" from
// "garbage". Any other decode failure writes 400 "invalid request body".
// Either way it returns false, and the caller's only job is to return.
func DecodeJSON(w http.ResponseWriter, r *http.Request, v any) bool {
	return decodeJSON(w, r, v, false)
}

// DecodeJSONOptional is DecodeJSON for a write whose body is optional.
// An empty body leaves v at its zero value and reports success; any
// other decode failure refuses exactly the way DecodeJSON does.
func DecodeJSONOptional(w http.ResponseWriter, r *http.Request, v any) bool {
	return decodeJSON(w, r, v, true)
}

// decodeJSON is the one body the two public decoders share, so their
// error handling cannot drift apart.
func decodeJSON(w http.ResponseWriter, r *http.Request, v any, allowEmpty bool) bool {
	r.Body = http.MaxBytesReader(w, r.Body, MaxRequestBodyBytes)
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		if allowEmpty && errors.Is(err, io.EOF) {
			return true
		}
		if _, ok := errors.AsType[*http.MaxBytesError](err); ok {
			Write(w, http.StatusRequestEntityTooLarge, CodePayloadTooLarge, "request body exceeds 1 MiB", nil)
			return false
		}
		WriteError(w, "invalid request body", http.StatusBadRequest)
		return false
	}
	return true
}

// WriteError is Write with its code chosen from status via CodeForStatus,
// for a handler that only decided a status and a message. The arguments
// are in http.Error's order, so a call site converts by renaming.
func WriteError(w http.ResponseWriter, message string, status int) {
	Write(w, status, CodeForStatus(status), message, nil)
}

// CodeForStatus is the default status-to-code mapping for a handler with
// no more specific reason to choose one. A handler that has a specific
// code (CodeClassFull on a 409, say) calls Write directly.
func CodeForStatus(status int) Code {
	switch status {
	case http.StatusBadRequest, http.StatusUnprocessableEntity:
		return CodeInvalidArgument
	case http.StatusUnauthorized:
		return CodeUnauthorized
	case http.StatusForbidden:
		return CodeForbidden
	case http.StatusNotFound:
		return CodeNotFound
	case http.StatusConflict:
		return CodeConflict
	case http.StatusRequestEntityTooLarge:
		return CodePayloadTooLarge
	case http.StatusTooManyRequests:
		return CodeRateLimited
	default:
		return CodeInternal
	}
}
