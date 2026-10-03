package apierr_test

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"mbu/api/internal/apierr"
	"mbu/api/internal/apierrtest"
)

// TestAPIError_CodeSerializesAsAPlainJSONString holds the wire format: a
// quoted JSON string under the "code" key, no wrapper object and no
// number. An accidental MarshalJSON on Code, or a change of its
// underlying type, would move the contract every caller in app/ reads.
func TestAPIError_CodeSerializesAsAPlainJSONString(t *testing.T) {
	encoded, err := json.Marshal(apierr.APIError{Code: apierr.CodeConflict, Message: "class is full"})
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	const want = `{"code":"CONFLICT","message":"class is full"}`
	if string(encoded) != want {
		t.Fatalf("encoded = %s, want %s", encoded, want)
	}

	// And it reads back the same way. json.Unmarshal directly, not
	// apierrtest.Decode: there is no *http.Response here.
	var out apierr.APIError
	if err := json.Unmarshal([]byte(want), &out); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if out.Code != apierr.CodeConflict {
		t.Fatalf("decoded code = %q, want %q", out.Code, apierr.CodeConflict)
	}
}

func TestCodeForStatus(t *testing.T) {
	tests := []struct {
		status int
		want   apierr.Code
	}{
		{http.StatusBadRequest, apierr.CodeInvalidArgument},
		{http.StatusUnprocessableEntity, apierr.CodeInvalidArgument},
		{http.StatusUnauthorized, apierr.CodeUnauthorized},
		{http.StatusForbidden, apierr.CodeForbidden},
		{http.StatusNotFound, apierr.CodeNotFound},
		{http.StatusConflict, apierr.CodeConflict},
		{http.StatusRequestEntityTooLarge, apierr.CodePayloadTooLarge},
		{http.StatusTooManyRequests, apierr.CodeRateLimited},
		{http.StatusInternalServerError, apierr.CodeInternal},
		{http.StatusTeapot, apierr.CodeInternal},
	}
	for _, tt := range tests {
		if got := apierr.CodeForStatus(tt.status); got != tt.want {
			t.Errorf("CodeForStatus(%d) = %q, want %q", tt.status, got, tt.want)
		}
	}
}

func TestWrite(t *testing.T) {
	t.Run("without details", func(t *testing.T) {
		rec := httptest.NewRecorder()
		apierr.Write(rec, http.StatusConflict, apierr.CodeFailedPrecondition, "university is not published", nil)

		if rec.Code != http.StatusConflict {
			t.Fatalf("status = %d, want %d", rec.Code, http.StatusConflict)
		}
		if got := rec.Header().Get("Content-Type"); got != "application/json" {
			t.Fatalf("Content-Type = %q, want application/json", got)
		}
		out := apierrtest.Decode(t, rec.Result())
		if out.Code != apierr.CodeFailedPrecondition || out.Message != "university is not published" || out.Details != nil {
			t.Fatalf("body = %+v, want {FAILED_PRECONDITION university is not published <nil>}", out)
		}
	})

	t.Run("with details", func(t *testing.T) {
		rec := httptest.NewRecorder()
		apierr.Write(rec, http.StatusBadRequest, apierr.CodeInvalidArgument, "invalid request body",
			map[string]string{"capacity": "Enter a capacity of 1 or more"})

		out := apierrtest.Decode(t, rec.Result())
		if out.Details["capacity"] != "Enter a capacity of 1 or more" {
			t.Fatalf("details = %+v, want capacity entry", out.Details)
		}
	})
}

func TestWriteError(t *testing.T) {
	rec := httptest.NewRecorder()
	apierr.WriteError(rec, "university not found", http.StatusNotFound)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusNotFound)
	}
	out := apierrtest.Decode(t, rec.Result())
	if out.Code != apierr.CodeNotFound || out.Message != "university not found" {
		t.Fatalf("body = %+v, want {NOT_FOUND university not found}", out)
	}
}

func TestWriteFieldError(t *testing.T) {
	rec := httptest.NewRecorder()
	apierr.WriteFieldError(rec, http.StatusBadRequest, apierr.CodeInvalidArgument, "title", "title cannot be blank")

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
	out := apierrtest.Decode(t, rec.Result())
	if out.Code != apierr.CodeInvalidArgument || out.Message != "title cannot be blank" {
		t.Fatalf("body = %+v, want {INVALID_ARGUMENT title cannot be blank ...}", out)
	}
	if len(out.Details) != 1 || out.Details["title"] != "title cannot be blank" {
		t.Fatalf("details = %+v, want a single title entry matching message", out.Details)
	}
}

// testPayloadName is the name value the round-trip bodies carry -- one
// literal, so goconst does not flag three copies.
const testPayloadName = "camping"

func TestWriteJSON(t *testing.T) {
	rec := httptest.NewRecorder()
	type payload struct {
		Name string `json:"name"`
	}
	apierr.WriteJSON(rec, http.StatusCreated, payload{Name: testPayloadName})

	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusCreated)
	}
	if got := rec.Header().Get("Content-Type"); got != "application/json" {
		t.Fatalf("Content-Type = %q, want application/json", got)
	}
	var out payload
	if err := json.NewDecoder(rec.Body).Decode(&out); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if out.Name != testPayloadName {
		t.Fatalf("body = %+v, want {%s}", out, testPayloadName)
	}
}

func TestDecodeJSON(t *testing.T) {
	type reqBody struct {
		Name string `json:"name"`
	}

	t.Run("valid body decodes", func(t *testing.T) {
		rec := httptest.NewRecorder()
		req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/", strings.NewReader(`{"name":"`+testPayloadName+`"}`))

		var out reqBody
		if ok := apierr.DecodeJSON(rec, req, &out); !ok {
			t.Fatalf("DecodeJSON returned false, want true")
		}
		if out.Name != testPayloadName {
			t.Fatalf("decoded = %+v, want {%s}", out, testPayloadName)
		}
	})

	t.Run("malformed body writes 400 and returns false", func(t *testing.T) {
		rec := httptest.NewRecorder()
		req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/", strings.NewReader(`{not json`))

		var out reqBody
		if ok := apierr.DecodeJSON(rec, req, &out); ok {
			t.Fatalf("DecodeJSON returned true, want false")
		}
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
		}
		out2 := apierrtest.Decode(t, rec.Result())
		if out2.Code != apierr.CodeInvalidArgument || out2.Message != "invalid request body" {
			t.Fatalf("body = %+v, want {INVALID_ARGUMENT invalid request body}", out2)
		}
	})

	t.Run("oversized body writes 413 payload-too-large and returns false", func(t *testing.T) {
		rec := httptest.NewRecorder()
		oversized := bytes.Repeat([]byte("a"), apierr.MaxRequestBodyBytes+1)
		body := append([]byte(`{"name":"`), append(oversized, []byte(`"}`)...)...)
		req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/", bytes.NewReader(body))

		var out reqBody
		if ok := apierr.DecodeJSON(rec, req, &out); ok {
			t.Fatalf("DecodeJSON returned true, want false")
		}
		if rec.Code != http.StatusRequestEntityTooLarge {
			t.Fatalf("status = %d, want %d", rec.Code, http.StatusRequestEntityTooLarge)
		}
		out2 := apierrtest.Decode(t, rec.Result())
		if out2.Code != apierr.CodePayloadTooLarge {
			t.Fatalf("code = %q, want %q", out2.Code, apierr.CodePayloadTooLarge)
		}
	})
}

func TestDecodeJSONOptional(t *testing.T) {
	type reqBody struct {
		Name string `json:"name"`
	}

	t.Run("valid body decodes", func(t *testing.T) {
		rec := httptest.NewRecorder()
		req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/", strings.NewReader(`{"name":"`+testPayloadName+`"}`))

		var out reqBody
		if ok := apierr.DecodeJSONOptional(rec, req, &out); !ok {
			t.Fatalf("DecodeJSONOptional returned false, want true")
		}
		if out.Name != testPayloadName {
			t.Fatalf("decoded = %+v, want {%s}", out, testPayloadName)
		}
	})

	t.Run("empty body leaves the zero value and reports success", func(t *testing.T) {
		rec := httptest.NewRecorder()
		req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/", http.NoBody)

		var out reqBody
		if ok := apierr.DecodeJSONOptional(rec, req, &out); !ok {
			t.Fatalf("DecodeJSONOptional returned false, want true")
		}
		if out.Name != "" {
			t.Fatalf("decoded = %+v, want the zero value", out)
		}
	})

	t.Run("malformed body writes 400 and returns false", func(t *testing.T) {
		rec := httptest.NewRecorder()
		req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/", strings.NewReader(`{not json`))

		var out reqBody
		if ok := apierr.DecodeJSONOptional(rec, req, &out); ok {
			t.Fatalf("DecodeJSONOptional returned true, want false")
		}
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
		}
	})

	t.Run("oversized body writes 413 payload-too-large and returns false", func(t *testing.T) {
		rec := httptest.NewRecorder()
		oversized := bytes.Repeat([]byte("a"), apierr.MaxRequestBodyBytes+1)
		body := append([]byte(`{"name":"`), append(oversized, []byte(`"}`)...)...)
		req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/", bytes.NewReader(body))

		var out reqBody
		if ok := apierr.DecodeJSONOptional(rec, req, &out); ok {
			t.Fatalf("DecodeJSONOptional returned true, want false")
		}
		if rec.Code != http.StatusRequestEntityTooLarge {
			t.Fatalf("status = %d, want %d", rec.Code, http.StatusRequestEntityTooLarge)
		}
	})
}

// panicHandler is a handler that fails in the way Recover exists for.
func panicHandler(v any) http.Handler {
	return http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic(v)
	})
}

func TestRecover(t *testing.T) {
	t.Run("a panic is answered with INTERNAL and no detail", func(t *testing.T) {
		rec := httptest.NewRecorder()
		req := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/boom", http.NoBody)

		apierr.Recover(panicHandler("secret detail")).ServeHTTP(rec, req)

		if rec.Code != http.StatusInternalServerError {
			t.Fatalf("status = %d, want %d", rec.Code, http.StatusInternalServerError)
		}
		if strings.Contains(rec.Body.String(), "secret detail") {
			t.Fatalf("body %q leaks the panic value", rec.Body.String())
		}
		out := apierrtest.Decode(t, rec.Result())
		if out.Code != apierr.CodeInternal || out.Message != apierr.MsgInternalError || out.Details != nil {
			t.Fatalf("body = %+v, want {INTERNAL internal error <nil>}", out)
		}
	})

	t.Run("a handler that does not panic is untouched", func(t *testing.T) {
		rec := httptest.NewRecorder()
		req := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/", http.NoBody)

		apierr.Recover(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusNoContent)
		})).ServeHTTP(rec, req)

		if rec.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want %d", rec.Code, http.StatusNoContent)
		}
	})

	t.Run("http.ErrAbortHandler is panicked again for net/http", func(t *testing.T) {
		rec := httptest.NewRecorder()
		req := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/", http.NoBody)

		defer func() {
			if v := recover(); v != http.ErrAbortHandler { //nolint:errorlint // the exact sentinel, as net/http itself compares it
				t.Fatalf("recovered %v, want http.ErrAbortHandler", v)
			}
		}()
		apierr.Recover(panicHandler(http.ErrAbortHandler)).ServeHTTP(rec, req)
		t.Fatal("Recover swallowed http.ErrAbortHandler")
	})
}

func TestWriteInternal(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/", http.NoBody)

	apierr.WriteInternal(rec, req, errors.New("connection refused: 10.0.0.3"))

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusInternalServerError)
	}
	if strings.Contains(rec.Body.String(), "10.0.0.3") {
		t.Fatalf("body %q leaks the error detail", rec.Body.String())
	}
	out := apierrtest.Decode(t, rec.Result())
	if out.Code != apierr.CodeInternal || out.Message != apierr.MsgInternalError {
		t.Fatalf("body = %+v, want {INTERNAL internal error}", out)
	}
}
