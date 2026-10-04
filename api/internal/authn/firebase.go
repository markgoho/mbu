package authn

import (
	"context"
	"fmt"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
)

// FirebaseVerifier verifies Firebase Auth ID tokens with the Admin SDK.
//
// When FIREBASE_AUTH_EMULATOR_HOST is set, the Admin SDK itself talks to
// the Auth emulator instead of Google and accepts the emulator's
// unsigned tokens; no code here reads that variable.
type FirebaseVerifier struct {
	client *auth.Client
}

// NewFirebaseVerifier creates a FirebaseVerifier for the given Firebase
// project, with Application Default Credentials.
func NewFirebaseVerifier(ctx context.Context, projectID string) (*FirebaseVerifier, error) {
	// coverage:ignore reason: builds the real Admin SDK client, not exercised by unit tests
	app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: projectID})
	if err != nil {
		// coverage:ignore reason: builds the real Admin SDK client, not exercised by unit tests
		return nil, fmt.Errorf("authn: init firebase app: %w", err)
	}
	// coverage:ignore reason: builds the real Admin SDK client, not exercised by unit tests
	client, err := app.Auth(ctx)
	if err != nil {
		// coverage:ignore reason: builds the real Admin SDK client, not exercised by unit tests
		return nil, fmt.Errorf("authn: init auth client: %w", err)
	}
	// coverage:ignore reason: builds the real Admin SDK client, not exercised by unit tests
	return &FirebaseVerifier{client: client}, nil
}

// VerifyIDToken verifies idToken and reads the identity off its claims.
// Only the session exchange calls it (ADR 0007).
//
// It reads no injected clock, on purpose: the Admin SDK checks a token's
// freshness against real wall time inside itself.
func (v *FirebaseVerifier) VerifyIDToken(ctx context.Context, idToken string) (*Token, error) {
	// coverage:ignore reason: requires a real Firebase ID token, not exercised by unit tests
	token, err := v.client.VerifyIDToken(ctx, idToken)
	if err != nil {
		// coverage:ignore reason: requires a real Firebase ID token, not exercised by unit tests
		return nil, fmt.Errorf("authn: verify id token: %w", err)
	}
	// The SDK leaves every claim except a few reserved ones in Claims,
	// so each is a comma-ok map lookup. A missing claim reads as its
	// zero value, which the middleware then refuses or ignores.
	// coverage:ignore reason: requires a real Firebase ID token, not exercised by unit tests
	email, _ := token.Claims["email"].(string)
	// coverage:ignore reason: requires a real Firebase ID token, not exercised by unit tests
	emailVerified, _ := token.Claims["email_verified"].(bool)
	// coverage:ignore reason: requires a real Firebase ID token, not exercised by unit tests
	superAdmin, _ := token.Claims["superAdmin"].(bool)
	// coverage:ignore reason: requires a real Firebase ID token, not exercised by unit tests
	name, _ := token.Claims["name"].(string)
	// coverage:ignore reason: requires a real Firebase ID token, not exercised by unit tests
	return &Token{UID: token.UID, Email: email, EmailVerified: emailVerified, SuperAdmin: superAdmin, DisplayName: name}, nil
}
