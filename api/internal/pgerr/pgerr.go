// Package pgerr names the Postgres error conditions this codebase acts
// on, so a SQLSTATE code is written once rather than at every call site
// that has to tell "somebody already has this" apart from "the database
// broke".
//
// Each constraint in api/db/migrations has a stable name
// (docs/data-model.md, "Conventions"), so a caller can ask which
// constraint refused a write and answer with the matching API error.
//
// A leaf package on purpose -- it imports errors and pgconn and nothing
// of this codebase's own, so any package that touches the database can
// depend on it without a cycle.
package pgerr

import (
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
)

// The SQLSTATE codes this package names:
// https://www.postgresql.org/docs/current/errcodes-appendix.html
const (
	foreignKeyViolation = "23503"
	uniqueViolation     = "23505"
	checkViolation      = "23514"
)

// IsUniqueViolation reports whether err is a Postgres unique violation --
// the error an INSERT gets when the row it is adding already exists.
//
// Callers use it to turn a race into an ordinary answer: a second
// Registration of one Scout in one Class is a 409 rather than a 500.
func IsUniqueViolation(err error) bool {
	pgErr, ok := errors.AsType[*pgconn.PgError](err)
	return ok && pgErr.Code == uniqueViolation
}

// IsUniqueViolationOn reports whether err is a unique violation on one
// named constraint or unique index.
//
// The narrower question, for a statement that can collide on more than
// one index and means different things by each: a role_grants insert can
// hit role_grants_uid_key or role_grants_invited_email_key.
func IsUniqueViolationOn(err error, constraint string) bool {
	return is(err, uniqueViolation, constraint)
}

// IsForeignKeyViolationOn reports whether err is a foreign-key violation
// on one named constraint -- a write that points at a row that is not
// there, or a delete of a row that something still points at.
func IsForeignKeyViolationOn(err error, constraint string) bool {
	return is(err, foreignKeyViolation, constraint)
}

// IsCheckViolationOn reports whether err is a CHECK violation on one
// named constraint.
func IsCheckViolationOn(err error, constraint string) bool {
	return is(err, checkViolation, constraint)
}

// is reports whether err carries the SQLSTATE sqlState on the named
// constraint.
func is(err error, sqlState, constraint string) bool {
	pgErr, ok := errors.AsType[*pgconn.PgError](err)
	return ok && pgErr.Code == sqlState && pgErr.ConstraintName == constraint
}
