// Command api runs mbu-api, the event-platform API on Cloud Run.
package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"mbu/api/internal/authn"
	"mbu/api/internal/clientip"
	"mbu/api/internal/clock"
	"mbu/api/internal/internalauth"
	"mbu/api/internal/mail"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
)

// resolvePort reads PORT, which Cloud Run sets, and defaults to 8080.
func resolvePort(getenv func(string) string) string {
	if port := getenv("PORT"); port != "" {
		return port
	}
	return "8080"
}

// errNoProjectID stops startup when GCP_PROJECT_ID is unset. Without it
// the Admin SDK starts, then refuses every ID token, so every
// authenticated route answers 401 and nothing says why.
var errNoProjectID = errors.New("GCP_PROJECT_ID is not set")

// firebaseProjectID reads GCP_PROJECT_ID, the Firebase project whose ID
// tokens the API accepts.
func firebaseProjectID(getenv func(string) string) (string, error) {
	projectID := strings.TrimSpace(getenv("GCP_PROJECT_ID"))
	if projectID == "" {
		return "", errNoProjectID
	}
	return projectID, nil
}

// errNoDatabaseURL stops startup when DATABASE_URL is unset, so the
// service never serves a route that would fail on its first query.
var errNoDatabaseURL = errors.New("DATABASE_URL is not set")

// maxOpenConns is the pool size of one instance. db-f1-micro allows 25
// connections, 3 of them kept for superusers. During a deploy the old
// and new revisions both run, each with at most 2 instances (Cloud Run
// max_instance_count, terraform/cloud_run.tf): 2 x 2 x 4 = 16, which
// leaves room for the migration and a psql session.
// api/docs/infrastructure.md has the numbers.
const maxOpenConns = 4

// openDB opens the Postgres pool from DATABASE_URL with the pgx driver.
// The URL logs in as a member of app_runtime (ADR 0002). A malformed URL
// stops startup; the pool does not connect yet, so a database that is
// down fails the first query, not startup. The pool holds at most
// maxOpenConns connections.
func openDB(getenv func(string) string) (*sql.DB, error) {
	dsn := strings.TrimSpace(getenv("DATABASE_URL"))
	if dsn == "" {
		return nil, errNoDatabaseURL
	}
	cfg, err := pgx.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("parse DATABASE_URL: %w", err)
	}
	db := stdlib.OpenDB(*cfg)
	db.SetMaxOpenConns(maxOpenConns)
	db.SetMaxIdleConns(maxOpenConns)
	return db, nil
}

// errBadProxyHops stops startup when CLIENT_IP_PROXY_HOPS is set to
// anything but a whole number of 0 or more.
var errBadProxyHops = errors.New("CLIENT_IP_PROXY_HOPS is not a whole number of 0 or more")

// clientIPProxyHops reads CLIENT_IP_PROXY_HOPS, the number of proxies in
// front of Cloud Run's front end that append to X-Forwarded-For (see
// package clientip): unset is 0, a direct call; behind the Firebase
// Hosting rewrite it is 1. A value that is not a whole number of 0 or
// more stops startup (errBadProxyHops), so a typo cannot silently change
// the rate-limit key.
func clientIPProxyHops(getenv func(string) string) (int, error) {
	raw := strings.TrimSpace(getenv("CLIENT_IP_PROXY_HOPS"))
	if raw == "" {
		return 0, nil
	}
	hops, err := strconv.Atoi(raw)
	if err != nil || hops < 0 {
		return 0, fmt.Errorf("%w: %q", errBadProxyHops, raw)
	}
	return hops, nil
}

// errNoExpectedOrigins stops startup when EXPECTED_ORIGINS names no
// origin. Without one, csrf.Wrap refuses every state-changing request
// from a browser, and nothing says why.
var errNoExpectedOrigins = errors.New("EXPECTED_ORIGINS is not set")

// expectedOrigins reads EXPECTED_ORIGINS, the comma-separated browser
// origins of the app (scheme, host and port, no path), for csrf.Wrap
// (ADR 0007).
func expectedOrigins(getenv func(string) string) ([]string, error) {
	var origins []string
	for origin := range strings.SplitSeq(getenv("EXPECTED_ORIGINS"), ",") {
		if origin = strings.TrimSpace(origin); origin != "" {
			origins = append(origins, origin)
		}
	}
	if len(origins) == 0 {
		return nil, errNoExpectedOrigins
	}
	return origins, nil
}

// internalGuard builds the guard of /api/internal/** (ADR 0005) from
// the environment. getenv and validate are parameters, so a test can
// assert what the service accepts as an internal caller; main() passes
// internalauth.GoogleValidator.
//
// INTERNAL_OIDC_AUDIENCE is the Cloud Run service's own base URL, and
// INTERNAL_OIDC_CALLERS the comma-separated service accounts whose
// tokens are accepted. INTERNAL_WORKER_SECRET is the local stack's
// mechanism and is deliberately unset on Cloud Run: unset means the
// X-Internal-Secret header is refused. With nothing set, the guard
// refuses every request, and the service still starts.
func internalGuard(getenv func(string) string, validate internalauth.ValidateFunc) *internalauth.Guard {
	return internalauth.New(internalauth.Config{
		Audience: getenv("INTERNAL_OIDC_AUDIENCE"),
		Callers:  strings.Split(getenv("INTERNAL_OIDC_CALLERS"), ","),
		Validate: validate,
		Secret:   getenv("INTERNAL_WORKER_SECRET"),
	})
}

// mailSender builds the Sender of the outbox drain from the environment.
// With MAILGUN_API_KEY unset (the local stack, CI) it is a FakeSender
// that logs each mail, so no local run can send real mail. Otherwise
// MAILGUN_DOMAIN (default mg.merit-badge.university) and
// MAILGUN_API_BASE (default Mailgun's US host) apply.
func mailSender(getenv func(string) string, logf func(string, ...any)) mail.Sender {
	key := strings.TrimSpace(getenv("MAILGUN_API_KEY"))
	if key == "" {
		logf("mail: MAILGUN_API_KEY is not set: the drain logs each mail and sends none")
		return &mail.FakeSender{Logf: logf}
	}
	return mail.NewMailgunSender(key, strings.TrimSpace(getenv("MAILGUN_DOMAIN")),
		strings.TrimSpace(getenv("MAILGUN_API_BASE")))
}

func main() {
	// coverage:ignore reason: reads the real environment, not exercised by unit tests; firebaseProjectID is
	projectID, err := firebaseProjectID(os.Getenv)
	if err != nil {
		// coverage:ignore reason: reads the real environment, not exercised by unit tests; firebaseProjectID is
		log.Fatalf("config: %v", err)
	}
	// coverage:ignore reason: builds the real Admin SDK client, not exercised by unit tests
	verifier, err := authn.NewFirebaseVerifier(context.Background(), projectID)
	if err != nil {
		// coverage:ignore reason: builds the real Admin SDK client, not exercised by unit tests
		log.Fatalf("init verifier: %v", err)
	}

	// coverage:ignore reason: reads the real environment, not exercised by unit tests; openDB is
	db, err := openDB(os.Getenv)
	if err != nil {
		// coverage:ignore reason: reads the real environment, not exercised by unit tests; openDB is
		log.Fatalf("config: %v", err)
	}

	// coverage:ignore reason: reads the real environment, not exercised by unit tests; clientIPProxyHops is
	proxyHops, err := clientIPProxyHops(os.Getenv)
	if err != nil {
		// coverage:ignore reason: reads the real environment, not exercised by unit tests; clientIPProxyHops is
		log.Fatalf("config: %v", err)
	}

	// coverage:ignore reason: reads the real environment, not exercised by unit tests; expectedOrigins is
	origins, err := expectedOrigins(os.Getenv)
	if err != nil {
		// coverage:ignore reason: reads the real environment, not exercised by unit tests; expectedOrigins is
		log.Fatalf("config: %v", err)
	}

	// coverage:ignore reason: wires the real Deps main() serves from; routes() is exercised by main_test.go
	deps := Deps{
		Verifier:        verifier,
		Now:             clock.Real,
		DB:              db,
		ExpectedOrigins: origins,
		ClientIP:        clientip.Resolver{ProxyHops: proxyHops},
		Accounts:        verifier,
		InternalAuth:    internalGuard(os.Getenv, internalauth.GoogleValidator),
		Mail:            mailSender(os.Getenv, log.Printf),
	}
	// coverage:ignore reason: wires the real Deps main() serves from; routes() is exercised by main_test.go
	port := resolvePort(os.Getenv)
	// coverage:ignore reason: wires the real Deps main() serves from; routes() is exercised by main_test.go
	server := &http.Server{
		Addr:              ":" + port,
		Handler:           routes(deps),
		ReadHeaderTimeout: 10 * time.Second,
	}

	log.Printf("listening on port %s", port)
	// coverage:ignore reason: listener startup, not exercised by unit tests
	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
