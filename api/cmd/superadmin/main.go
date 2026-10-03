// Command superadmin gives one Firebase Auth account the superAdmin
// custom claim. Run it once to make the first Super-admin: the app has
// no screen to manage Super-admins in v1. It is the Go port of
// functions/src/scripts/set-initial-super-admin.ts.
//
// The account must exist (sign in once first). It targets the Auth
// emulator by default, at FIREBASE_AUTH_EMULATOR_HOST or 127.0.0.1:9099:
//
//	cd api && go run ./cmd/superadmin -email you@example.com
//
// To target the real project, pass -production with Application Default
// Credentials for it, and leave FIREBASE_AUTH_EMULATOR_HOST unset:
//
//	cd api && go run ./cmd/superadmin -production -email you@example.com
//
// The account's current ID token keeps the old claims until it refreshes
// (sign out and in again).
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"maps"
	"os"
	"strings"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
)

const (
	defaultProjectID    = "merit-badge-university"
	defaultEmulatorHost = "127.0.0.1:9099"
	emulatorHostEnv     = "FIREBASE_AUTH_EMULATOR_HOST"
)

type config struct {
	Email      string
	UID        string
	ProjectID  string
	Production bool
	// EmulatorHost is the Auth emulator to target. It is empty with
	// Production.
	EmulatorHost string
}

func parseConfig(args []string, getenv func(string) string) (config, error) {
	fs := flag.NewFlagSet("superadmin", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	var cfg config
	fs.StringVar(&cfg.Email, "email", "", "email of the account")
	fs.StringVar(&cfg.UID, "uid", "", "uid of the account")
	fs.BoolVar(&cfg.Production, "production", false, "target the real Firebase project, not the Auth emulator")
	if err := fs.Parse(args); err != nil {
		return config{}, fmt.Errorf("superadmin: %w", err)
	}
	if (cfg.Email == "") == (cfg.UID == "") {
		return config{}, errors.New("superadmin: pass exactly one of -email or -uid")
	}

	cfg.ProjectID = strings.TrimSpace(getenv("GCP_PROJECT_ID"))
	if cfg.ProjectID == "" {
		cfg.ProjectID = defaultProjectID
	}

	host := strings.TrimSpace(getenv(emulatorHostEnv))
	if cfg.Production {
		// The Admin SDK reads this variable itself, so with it set a
		// production run would silently write to the emulator.
		if host != "" {
			return config{}, fmt.Errorf("superadmin: -production with %s=%s set; unset it", emulatorHostEnv, host)
		}
		return cfg, nil
	}
	if host == "" {
		host = defaultEmulatorHost
	}
	cfg.EmulatorHost = host
	return cfg, nil
}

// userStore is the part of *auth.Client this command uses.
type userStore interface {
	GetUser(ctx context.Context, uid string) (*auth.UserRecord, error)
	GetUserByEmail(ctx context.Context, email string) (*auth.UserRecord, error)
	SetCustomUserClaims(ctx context.Context, uid string, claims map[string]any) error
}

// grantSuperAdmin adds superAdmin: true to the account's custom claims
// and keeps its other claims.
func grantSuperAdmin(ctx context.Context, users userStore, cfg config) (*auth.UserRecord, error) {
	var user *auth.UserRecord
	var err error
	if cfg.UID != "" {
		user, err = users.GetUser(ctx, cfg.UID)
	} else {
		user, err = users.GetUserByEmail(ctx, cfg.Email)
	}
	if err != nil {
		return nil, fmt.Errorf("superadmin: find account: %w", err)
	}

	claims := maps.Clone(user.CustomClaims)
	if claims == nil {
		claims = map[string]any{}
	}
	claims["superAdmin"] = true
	if err := users.SetCustomUserClaims(ctx, user.UID, claims); err != nil {
		return nil, fmt.Errorf("superadmin: set claims: %w", err)
	}
	return user, nil
}

func main() {
	// coverage:ignore reason: exits the process, not exercised by unit tests
	if err := run(context.Background()); err != nil {
		// coverage:ignore reason: exits the process, not exercised by unit tests
		log.Fatal(err)
	}
}

// run wires the real environment and Admin SDK. parseConfig and
// grantSuperAdmin hold the logic and are tested.
func run(ctx context.Context) error {
	// coverage:ignore reason: reads the real arguments, not exercised by unit tests; parseConfig is
	cfg, err := parseConfig(os.Args[1:], os.Getenv)
	if err != nil {
		// coverage:ignore reason: reads the real arguments, not exercised by unit tests; parseConfig is
		return err
	}
	// coverage:ignore reason: points the real Admin SDK at the emulator, not exercised by unit tests
	if cfg.EmulatorHost != "" {
		// coverage:ignore reason: points the real Admin SDK at the emulator, not exercised by unit tests
		if err := os.Setenv(emulatorHostEnv, cfg.EmulatorHost); err != nil {
			// coverage:ignore reason: points the real Admin SDK at the emulator, not exercised by unit tests
			return fmt.Errorf("superadmin: %w", err)
		}
		// coverage:ignore reason: points the real Admin SDK at the emulator, not exercised by unit tests
		log.Printf("superadmin: using the Auth emulator at %s", cfg.EmulatorHost)
	}
	// coverage:ignore reason: builds the real Admin SDK client, not exercised by unit tests
	app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: cfg.ProjectID})
	if err != nil {
		// coverage:ignore reason: builds the real Admin SDK client, not exercised by unit tests
		return fmt.Errorf("superadmin: init firebase app: %w", err)
	}
	// coverage:ignore reason: builds the real Admin SDK client, not exercised by unit tests
	client, err := app.Auth(ctx)
	if err != nil {
		// coverage:ignore reason: builds the real Admin SDK client, not exercised by unit tests
		return fmt.Errorf("superadmin: init auth client: %w", err)
	}
	// coverage:ignore reason: calls the real Admin SDK, not exercised by unit tests; grantSuperAdmin is
	user, err := grantSuperAdmin(ctx, client, cfg)
	if err != nil {
		// coverage:ignore reason: calls the real Admin SDK, not exercised by unit tests; grantSuperAdmin is
		return err
	}
	// coverage:ignore reason: calls the real Admin SDK, not exercised by unit tests
	log.Printf("superadmin: superAdmin set for %s (%s) in project %s", user.Email, user.UID, cfg.ProjectID)
	// coverage:ignore reason: calls the real Admin SDK, not exercised by unit tests
	return nil
}
