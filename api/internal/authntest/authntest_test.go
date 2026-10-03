package authntest_test

import (
	"errors"
	"testing"

	"mbu/api/internal/authn"
	"mbu/api/internal/authntest"
)

func TestVerifier(t *testing.T) {
	want := authn.Token{UID: "uid-1", Email: "a@b.test", EmailVerified: true}
	v := authntest.Verifier{Tokens: map[string]authn.Token{"good": want}}

	got, err := v.VerifyIDToken(t.Context(), "good")
	if err != nil || *got != want {
		t.Fatalf("VerifyIDToken(good) = %+v, %v; want %+v, nil", got, err, want)
	}

	if _, err := v.VerifyIDToken(t.Context(), "bad"); !errors.Is(err, authntest.ErrUnknownToken) {
		t.Fatalf("VerifyIDToken(bad) error = %v, want ErrUnknownToken", err)
	}
}
