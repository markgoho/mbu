package pgerr_test

import (
	"errors"
	"fmt"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"

	"mbu/api/internal/pgerr"
)

const (
	registrationsPkey = "registrations_pkey"
	grantUIDKey       = "role_grants_uid_key"
	scoutParentFkey   = "scouts_parent_uid_fkey"
	statusCheck       = "registrations_status_check"
)

func pgError(code, constraint string) error {
	return &pgconn.PgError{Code: code, ConstraintName: constraint}
}

func TestIsUniqueViolation(t *testing.T) {
	for _, tc := range []struct {
		name string
		err  error
		want bool
	}{
		{"a unique violation", pgError("23505", registrationsPkey), true},
		// Wrapped, because every caller reaches this through at least one
		// fmt.Errorf on the way up.
		{"a wrapped unique violation", fmt.Errorf("insert registration: %w", pgError("23505", registrationsPkey)), true},
		// A foreign-key violation means the opposite: the row it points
		// at is missing, not already there.
		{"a foreign key violation", pgError("23503", scoutParentFkey), false},
		{"an ordinary error", errors.New("connection refused"), false},
		{"no error at all", nil, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if got := pgerr.IsUniqueViolation(tc.err); got != tc.want {
				t.Errorf("IsUniqueViolation(%v) = %v, want %v", tc.err, got, tc.want)
			}
		})
	}
}

func TestNamedConstraintViolations(t *testing.T) {
	type check func(error, string) bool
	for _, tc := range []struct {
		name       string
		is         check
		err        error
		constraint string
		want       bool
	}{
		{"unique: the named constraint", pgerr.IsUniqueViolationOn, pgError("23505", grantUIDKey), grantUIDKey, true},
		{"unique: wrapped", pgerr.IsUniqueViolationOn, fmt.Errorf("grant: %w", pgError("23505", grantUIDKey)), grantUIDKey, true},
		{"unique: a different constraint", pgerr.IsUniqueViolationOn, pgError("23505", "role_grants_invited_email_key"), grantUIDKey, false},
		{"unique: another SQLSTATE on the same constraint", pgerr.IsUniqueViolationOn, pgError("23503", grantUIDKey), grantUIDKey, false},
		{"foreign key: the named constraint", pgerr.IsForeignKeyViolationOn, pgError("23503", scoutParentFkey), scoutParentFkey, true},
		{"foreign key: a unique violation", pgerr.IsForeignKeyViolationOn, pgError("23505", scoutParentFkey), scoutParentFkey, false},
		{"check: the named constraint", pgerr.IsCheckViolationOn, pgError("23514", statusCheck), statusCheck, true},
		{"check: a different constraint", pgerr.IsCheckViolationOn, pgError("23514", "scouts_age_band_check"), statusCheck, false},
		{"check: an ordinary error", pgerr.IsCheckViolationOn, errors.New("connection refused"), statusCheck, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if got := tc.is(tc.err, tc.constraint); got != tc.want {
				t.Errorf("(%v, %q) = %v, want %v", tc.err, tc.constraint, got, tc.want)
			}
		})
	}
}
