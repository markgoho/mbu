// Package authz answers "may this Caller act on this University, Class
// or Scout?". It is the Go port of functions/src/shared-api/services/authz.
//
// Each assertion reads the one grant for the one scope of the request and
// returns an *apierr.RefusalError when the Caller may not act. role_grants is the only
// source of authorization: a display copy (a Class's Counselor names, a
// University's created_by_uid) is never read for it. A Super-admin passes
// each role check; Scout ownership has no Super-admin bypass, because a
// Scout's data is a minor's personal data.
package authz

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"

	"mbu/api/internal/apierr"
	"mbu/api/internal/authn"

	"github.com/google/uuid"
)

// Querier is a *sql.DB or a *sql.Tx, so an assertion can run inside the
// transaction of the write it guards.
type Querier interface {
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

// forbidden is a role refusal: 403 FORBIDDEN.
func forbidden(message string) *apierr.RefusalError {
	return &apierr.RefusalError{Status: http.StatusForbidden, Code: apierr.CodeForbidden, Message: message}
}

// AssertChancellorOf refuses a Caller who is neither an active Chancellor
// of the University nor a Super-admin.
func AssertChancellorOf(ctx context.Context, q Querier, caller authn.Caller, universityID string) error {
	if caller.SuperAdmin {
		return nil
	}
	ok, err := isChancellor(ctx, q, caller.UID, universityID)
	if err != nil {
		return err
	}
	if !ok {
		return forbidden("You are not a chancellor of this university")
	}
	return nil
}

// IsChancellorOf reports whether the Caller is an active Chancellor of
// the University or a Super-admin: the people who run the event. The
// Registration Window does not hold them (#254).
func IsChancellorOf(ctx context.Context, q Querier, caller authn.Caller, universityID string) (bool, error) {
	if caller.SuperAdmin {
		return true, nil
	}
	return isChancellor(ctx, q, caller.UID, universityID)
}

// AssertCounselorOf refuses a Caller who is not an active Counselor of the
// Class, an active Chancellor of its University (a Chancellor supersedes)
// or a Super-admin. A classID that is not a uuid names no Class, so it is
// refused like a Class the Caller has no grant on.
func AssertCounselorOf(ctx context.Context, q Querier, caller authn.Caller, universityID, classID string) error {
	if caller.SuperAdmin {
		return nil
	}
	refusal := forbidden("You are not a counselor of this class")
	id, err := uuid.Parse(classID)
	if err != nil {
		return refusal
	}
	var counselor bool
	err = q.QueryRowContext(ctx, `SELECT EXISTS (
		SELECT 1 FROM role_grants
		WHERE university_id = $1 AND class_id = $2 AND role = 'counselor' AND uid = $3 AND status = 'active')`,
		universityID, id, caller.UID).Scan(&counselor)
	if err != nil {
		return fmt.Errorf("authz: read counselor grant: %w", err)
	}
	if counselor {
		return nil
	}
	chancellor, err := isChancellor(ctx, q, caller.UID, universityID)
	// coverage:ignore reason: a database failure between two reads of one request, not reachable from a test
	if err != nil {
		// coverage:ignore reason: a database failure between two reads of one request, not reachable from a test
		return err
	}
	if !chancellor {
		return refusal
	}
	return nil
}

// AssertOwnsScout refuses a Caller who is not the Parent of the Scout. It
// has no Super-admin bypass. A scoutID that is not a uuid names no Scout,
// so it is refused like another Parent's Scout.
func AssertOwnsScout(ctx context.Context, q Querier, caller authn.Caller, scoutID string) error {
	refusal := forbidden("You do not have access to this scout")
	id, err := uuid.Parse(scoutID)
	if err != nil {
		return refusal
	}
	var owns bool
	err = q.QueryRowContext(ctx,
		`SELECT EXISTS (SELECT 1 FROM scouts WHERE id = $1 AND parent_uid = $2)`, id, caller.UID).Scan(&owns)
	if err != nil {
		return fmt.Errorf("authz: read scout owner: %w", err)
	}
	if !owns {
		return refusal
	}
	return nil
}

// RequireSuperAdmin refuses a Caller who is not a Super-admin.
func RequireSuperAdmin(caller authn.Caller) error {
	if !caller.SuperAdmin {
		return forbidden("Super-admin privileges required")
	}
	return nil
}

// isChancellor reports whether uid holds an active Chancellor grant on
// the University. The query has the shape role_grants_uid_key serves
// (docs/data-model.md, index row 3).
func isChancellor(ctx context.Context, q Querier, uid, universityID string) (bool, error) {
	var ok bool
	err := q.QueryRowContext(ctx, `SELECT EXISTS (
		SELECT 1 FROM role_grants
		WHERE university_id = $1 AND class_id IS NULL AND role = 'chancellor' AND uid = $2 AND status = 'active')`,
		universityID, uid).Scan(&ok)
	if err != nil {
		return false, fmt.Errorf("authz: read chancellor grant: %w", err)
	}
	return ok, nil
}

// ClaimInvites makes each pending invite to email an active grant of uid,
// in tx. email is the Caller's lower-case address, the form invited_email
// is stored in.
//
// An invite for a scope and role that uid already holds a grant for
// cannot be claimed: it would collide with that grant on
// role_grants_uid_key, and the sign-in would fail (docs/data-model.md,
// "role_grants"). The held grant is made active instead (a revoked one
// comes back, as a new grant would bring it back) and the invite is set
// to revoked.
func ClaimInvites(ctx context.Context, tx *sql.Tx, uid, email string) error {
	if _, err := tx.ExecContext(ctx, `UPDATE role_grants held
		SET status = 'active', updated_at = now()
		FROM role_grants invite
		WHERE invite.invited_email = $2 AND invite.status = 'invited'
		  AND held.uid = $1 AND held.status = 'revoked'
		  AND held.university_id = invite.university_id
		  AND held.class_id IS NOT DISTINCT FROM invite.class_id
		  AND held.role = invite.role`, uid, email); err != nil {
		// coverage:ignore reason: a database failure inside the bootstrap transaction, not reachable from a test
		return fmt.Errorf("authz: restore held grants: %w", err)
	}
	if _, err := tx.ExecContext(ctx, `UPDATE role_grants g
		SET uid = $1, status = 'active', updated_at = now()
		WHERE g.invited_email = $2 AND g.status = 'invited'
		  AND NOT EXISTS (
			SELECT 1 FROM role_grants held
			WHERE held.university_id = g.university_id
			  AND held.class_id IS NOT DISTINCT FROM g.class_id
			  AND held.role = g.role
			  AND held.uid = $1)`, uid, email); err != nil {
		// coverage:ignore reason: a database failure inside the bootstrap transaction, not reachable from a test
		return fmt.Errorf("authz: claim invites: %w", err)
	}
	if _, err := tx.ExecContext(ctx, `UPDATE role_grants
		SET status = 'revoked', updated_at = now()
		WHERE invited_email = $1 AND status = 'invited'`, email); err != nil {
		// coverage:ignore reason: a database failure inside the bootstrap transaction, not reachable from a test
		return fmt.Errorf("authz: revoke held invites: %w", err)
	}
	return nil
}
