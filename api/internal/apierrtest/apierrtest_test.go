package apierrtest_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"mbu/api/internal/apierr"
	"mbu/api/internal/apierrtest"
)

// TestDecode_ReadsTheWholeEnvelope proves the helper returns all three of
// section 7's fields, not only the code.
func TestDecode_ReadsTheWholeEnvelope(t *testing.T) {
	rec := httptest.NewRecorder()
	apierr.Write(rec, http.StatusConflict, apierr.CodeConflict, "class is full",
		map[string]string{"capacity": "Enter a capacity of 1 or more"})

	got := apierrtest.Decode(t, rec.Result())

	if got.Code != apierr.CodeConflict {
		t.Fatalf("code = %q, want %q", got.Code, apierr.CodeConflict)
	}
	if got.Message != "class is full" {
		t.Fatalf("message = %q, want %q", got.Message, "class is full")
	}
	if got.Details["capacity"] != "Enter a capacity of 1 or more" {
		t.Fatalf("details = %+v, want a capacity entry", got.Details)
	}
}

// TestDecode_LeavesDetailsNilWhenAbsent covers the shape the large
// majority of refusals carry -- no details at all, which the omitempty
// tag keeps off the wire entirely.
func TestDecode_LeavesDetailsNilWhenAbsent(t *testing.T) {
	rec := httptest.NewRecorder()
	apierr.WriteError(rec, "university not found", http.StatusNotFound)

	got := apierrtest.Decode(t, rec.Result())

	if got.Code != apierr.CodeNotFound || got.Details != nil {
		t.Fatalf("envelope = %+v, want NOT_FOUND with no details", got)
	}
}
