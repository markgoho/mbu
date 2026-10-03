// Package authntest provides the shared test double for authn.Verifier,
// so every route test builds one the same way and no test calls
// Firebase.
package authntest

import (
	"context"
	"errors"

	"mbu/api/internal/authn"
)

// ErrUnknownToken is what Verifier returns for a token it does not hold.
var ErrUnknownToken = errors.New("authntest: unknown token")

// Verifier is a test double for authn.Verifier. Tokens maps each ID
// token a test sends to the identity it stands for; any other token is
// refused, which is how a test sends a bad one.
type Verifier struct {
	Tokens map[string]authn.Token
}

// Verifier satisfies authn.Verifier by value, so a test passes
// authntest.Verifier{...} directly.
var _ authn.Verifier = Verifier{}

// VerifyIDToken returns the identity Tokens holds for idToken, and
// ErrUnknownToken when it holds none.
func (v Verifier) VerifyIDToken(_ context.Context, idToken string) (*authn.Token, error) {
	token, ok := v.Tokens[idToken]
	if !ok {
		return nil, ErrUnknownToken
	}
	return &token, nil
}
