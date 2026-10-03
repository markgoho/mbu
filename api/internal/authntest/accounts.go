package authntest

import (
	"context"
	"sync"

	"mbu/api/internal/authn"
)

// Accounts is a test double for authn.AccountManager. It records each
// uid it deletes; a test that sets Err makes every delete fail with it.
type Accounts struct {
	// Err, when set, is what DeleteAccount returns.
	Err error

	mu      sync.Mutex
	deleted []string
}

var _ authn.AccountManager = (*Accounts)(nil)

// DeleteAccount records uid, or returns Err.
func (a *Accounts) DeleteAccount(_ context.Context, uid string) error {
	if a.Err != nil {
		return a.Err
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	a.deleted = append(a.deleted, uid)
	return nil
}

// Deleted returns each uid DeleteAccount deleted, in order.
func (a *Accounts) Deleted() []string {
	a.mu.Lock()
	defer a.mu.Unlock()
	return append([]string(nil), a.deleted...)
}
