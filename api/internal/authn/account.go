package authn

import (
	"context"
	"fmt"

	"firebase.google.com/go/v4/auth"
)

// AccountManager changes Firebase Auth accounts with the Admin SDK. It is
// a seam on Deps, so no test calls Firebase: tests use
// authntest.Accounts. Copied in part from doula-cloud's authn/account.go;
// MBU needs only the delete.
type AccountManager interface {
	// DeleteAccount deletes the Firebase Auth account of uid. An account
	// that is already gone is a success, not an error: a retry after a
	// half-done account deletion must be able to finish.
	DeleteAccount(ctx context.Context, uid string) error
}

var _ AccountManager = (*FirebaseVerifier)(nil)

// DeleteAccount deletes uid's account with the Admin SDK.
func (v *FirebaseVerifier) DeleteAccount(ctx context.Context, uid string) error {
	// coverage:ignore reason: requires a real Firebase project, not exercised by unit tests
	err := v.client.DeleteUser(ctx, uid)
	// coverage:ignore reason: requires a real Firebase project, not exercised by unit tests
	if err == nil || auth.IsUserNotFound(err) {
		// coverage:ignore reason: requires a real Firebase project, not exercised by unit tests
		return nil
	}
	// coverage:ignore reason: requires a real Firebase project, not exercised by unit tests
	return fmt.Errorf("authn: delete account: %w", err)
}
