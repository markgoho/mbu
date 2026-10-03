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

// openDB opens the Postgres pool from DATABASE_URL with the pgx driver.
// The URL logs in as a member of app_runtime (ADR 0002). A malformed URL
// stops startup; the pool does not connect yet, so a database that is
// down fails the first query, not startup.
func openDB(getenv func(string) string) (*sql.DB, error) {
	dsn := strings.TrimSpace(getenv("DATABASE_URL"))
	if dsn == "" {
		return nil, errNoDatabaseURL
	}
	cfg, err := pgx.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("parse DATABASE_URL: %w", err)
	}
	return stdlib.OpenDB(*cfg), nil
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

	// coverage:ignore reason: wires the real Deps main() serves from; routes() is exercised by main_test.go
	deps := Deps{Verifier: verifier, Now: clock.Real, DB: db, ClientIP: clientip.Resolver{ProxyHops: proxyHops}, Accounts: verifier}
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
