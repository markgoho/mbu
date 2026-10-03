// Command api runs mbu-api, the event-platform API on Cloud Run.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"mbu/api/internal/authn"
	"mbu/api/internal/clock"
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

	// coverage:ignore reason: wires the real Deps main() serves from; routes() is exercised by main_test.go
	deps := Deps{Verifier: verifier, Now: clock.Real}
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
