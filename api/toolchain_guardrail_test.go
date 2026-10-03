package main

import (
	"os"
	"regexp"
	"runtime"
	"strings"
	"testing"
)

// api/go.mod's `go` line is the one place this repo names its Go version
// (docs/testing.md, "Toolchain versions"). CI reads it through setup-go's
// go-version-file; the two things that do not are the Go running on a
// developer's machine and the image api/Dockerfile builds on, and these
// tests hold both to it.
//
// The local half exists because GOTOOLCHAIN=auto, Go's default, only ever
// moves *up*: a local Go older than go.mod's line downloads the declared
// one on its own, but a newer one -- a Homebrew upgrade -- just runs. In
// doula-cloud that is how a local covcheck came to report 279 lines CI
// passed: a newer Go reports coverage blocks in different shapes, so no
// local result was evidence of anything. A `toolchain` directive would
// not help; it obeys the same only-upward rule.

var (
	goDirective    = regexp.MustCompile(`(?m)^go (\S+)$`)
	dockerfileFrom = regexp.MustCompile(`(?m)^FROM golang:(\S+) AS build$`)
)

// declaredGoVersion reads the version api/go.mod's `go` line names.
func declaredGoVersion(t *testing.T) string {
	t.Helper()
	src, err := os.ReadFile("go.mod")
	if err != nil {
		t.Fatalf("read go.mod: %v", err)
	}
	m := goDirective.FindSubmatch(src)
	if m == nil {
		t.Fatal("go.mod has no `go` line")
	}
	return string(m[1])
}

// TestToolchain_TheRunningGoIsTheOneGoModDeclares fails on any machine
// whose Go is not exactly the version go.mod declares. It always passes
// in CI, which installs Go from go.mod; it fails locally the day the
// local Go moves on without the repo.
func TestToolchain_TheRunningGoIsTheOneGoModDeclares(t *testing.T) {
	want := "go" + declaredGoVersion(t)
	got := strings.Fields(runtime.Version())[0]
	if got != want {
		t.Fatalf("this test binary was built by %s, but api/go.mod declares %s -- CI runs %s, so no local result is evidence of what CI will do. "+
			"If the newer Go is the one to keep, move the repo to it: set go.mod's `go` line and api/Dockerfile's `FROM golang:` tag to the same version, in one commit, and CI follows go.mod. "+
			"If not, run under the declared one: GOTOOLCHAIN=%s go test ./...",
			got, want, want, want)
	}
}

// TestToolchain_TheImageBuildsOnTheGoGoModDeclares holds api/Dockerfile's
// build stage to the same exact version: the image Cloud Run serves is
// compiled by this Go, and a floating tag (golang:1.27, say) moves
// underneath the repo without a commit.
func TestToolchain_TheImageBuildsOnTheGoGoModDeclares(t *testing.T) {
	want := declaredGoVersion(t)
	src, err := os.ReadFile("Dockerfile")
	if err != nil {
		t.Fatalf("read Dockerfile: %v", err)
	}
	m := dockerfileFrom.FindSubmatch(src)
	if m == nil {
		t.Fatal("api/Dockerfile has no `FROM golang:<version> AS build` line -- did the build stage move?")
	}
	if got := string(m[1]); got != want {
		t.Fatalf("api/Dockerfile builds on golang:%s, but api/go.mod declares go %s -- pin the image to golang:%s so the served binary is built by the Go CI tested", got, want, want)
	}
}

// lintActionVersion matches the `version:` input of the
// golangci/golangci-lint-action step. The lines between `uses:` and
// `version:` must not start a new step (`- `), so a step with no
// `version:` cannot borrow one from a later step. Quotes are optional.
var lintActionVersion = regexp.MustCompile(`uses: golangci/golangci-lint-action@\S+\n(?:[ \t]+[^-\s][^\n]*\n)*?[ \t]+version: ["']?([^"'\s]+)`)

// exactLintVersion is a pin that names one release, never `latest` or a
// bare major such as `v2`.
var exactLintVersion = regexp.MustCompile(`^v\d+\.\d+\.\d+$`)

// TestToolchain_CIPinsOneGolangciLintRelease holds the golangci-lint
// version in .github/workflows/api-pull-request.yml to one exact release.
// That pin is the one place the version is named (docs/testing.md,
// "Toolchain versions"); a local run is evidence of CI only when the
// local binary is that release, and a floating pin moves without a commit.
func TestToolchain_CIPinsOneGolangciLintRelease(t *testing.T) {
	src, err := os.ReadFile("../.github/workflows/api-pull-request.yml")
	if err != nil {
		t.Fatalf("read the api CI workflow: %v", err)
	}
	m := lintActionVersion.FindSubmatch(src)
	if m == nil {
		t.Fatal(".github/workflows/api-pull-request.yml has no golangci/golangci-lint-action step with a `version:` input -- did the lint step move? docs/testing.md names this file as the pin")
	}
	if got := string(m[1]); !exactLintVersion.MatchString(got) {
		t.Fatalf("golangci-lint-action pins version %q, want one exact release such as vX.Y.Z, so a local run uses the same linter as CI", got)
	}
}
