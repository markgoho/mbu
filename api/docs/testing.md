# Testing `api/`

The test rules for the Go service. They come from `~/github/doula-cloud/docs/testing.md`; only the parts that apply to `api/` are here. The Svelte, Playwright and memory-gate rules of doula-cloud do not apply: `app/` has its own rules in `app/README.md` and `.claude/rules/svelte-tests.md`.

Some files named below do not exist yet. Each section names the ticket that builds them. Until that ticket lands, the section is the target, not a description of the repo.

## What a test is

A test is an HTTP-boundary test against real Postgres ([ADR 0001](adr/0001-go-on-cloud-run.md), #240 decision 10). It builds the route table with `routes(Deps)`, sends a request, and asserts on the response and on database state. Vendors (Mailgun, the token verifier) are fakes at the `Deps` seam. There are no service-layer unit tests.

A command in `cmd/` (`seed`, `superadmin`, `migrate`) has no HTTP boundary. Its test calls the function that holds its logic, against `testdb` when it writes SQL, and with a fake for the Firebase Admin SDK.

The old `functions/src/*-api/routes/*.test.ts` files are the specification. Each case becomes a Go handler test, unless a decision in #240 changes the behavior.

## Before a change is done

Run these in `api/`. CI runs the same commands in `.github/workflows/api-pull-request.yml` (`go test` there adds `-race`):

```sh
gofmt -l .            # must print nothing
go vet ./...
GOLANGCI_LINT_CACHE="$(git rev-parse --show-toplevel)/api/.golangci-cache" golangci-lint run
go test ./... -coverpkg=./... -coverprofile=coverage.out
go run ./tools/covcheck -profile=coverage.out -module=mbu/api -skip=mbu/api/tools/
```

## Lint with golangci-lint, matching CI exactly

CI runs `golangci-lint` (config: `api/.golangci.yml`) as its own gating step in `.github/workflows/api-pull-request.yml`, separate from `go vet`/`go build`. A change can compile and pass `go test` and still fail CI on `golangci-lint` alone. `go vet` is not a substitute for it.

**Always set `GOLANGCI_LINT_CACHE` to a path under `--show-toplevel`, never bare `golangci-lint run`.** Without it, the results cache defaults to one location shared by every worktree on the machine (`~/Library/Caches/golangci-lint`). A session that lints after another worktree was removed can see findings in files that do not exist, or a stale "clean" result that hides a real issue. `--show-toplevel` resolves to the current worktree's own root, so the cache lives and dies with that worktree. `api/.golangci-cache` is gitignored. If you see findings in files that are not in your working tree, run `golangci-lint cache clean` with the same `GOLANGCI_LINT_CACHE`, then run the lint again.

Two linters are package-wide, not per-file: `goconst` and `unparam`. A change to one file can flag lines you did not touch in another file of the same package. Fix them: if `golangci-lint run` reports it, CI reports it too.

The linter also refuses a direct call to `time.Now()` (#240 decision 9). Read time through the clock seam.

## Coverage: 100% line coverage, with justified exceptions

CI gates `api/` at 100% line coverage. A line that a test cannot reach (for example, `log.Fatal` when the listener fails to start) needs an inline comment that gives the reason. The exception is not left to a PR discussion.

Mark the line, or the `if` that guards it, with a comment that contains `coverage:ignore`:

```go
// coverage:ignore reason: listener startup, not exercised by unit tests
if err := http.ListenAndServe(":"+port, nil); err != nil {
	log.Fatal(err)
}
```

`api/tools/covcheck` reads the `go test -coverprofile` output and fails on each zero-coverage line that has no `coverage:ignore` comment directly above it or in the uncovered block.

`go test` runs with `-coverpkg=./...` (#249), so a test in one package counts toward the coverage of each package it runs. A route test in package `main` through `routes(Deps)` covers the handler in `internal/users` and the shared code it calls (`internal/authz`, `internal/seats`); those packages need no tests of their own, and the rule "no service-layer tests" holds. Each test binary reports each block of the module, so the profile holds one line for a block per package; covcheck keeps the largest count for each block. `tools/covcheck` has its own tests, but `-skip` excludes it from the coverage requirement, because it is dev tooling, not application code.

`covcheck` was copied from `~/github/doula-cloud/api/tools/covcheck` with the module name changed to `mbu/api`.

## Toolchain versions: local must match CI exactly

A local run is evidence of what CI does only when both use the same Go and the same golangci-lint. In doula-cloud they drifted without notice: a newer local Go made covcheck report 279 lines that CI passed, and a newer local golangci-lint reported findings that CI did not.

- **Go**: the `go` line in `api/go.mod` is the only place the version is named. CI reads it through setup-go's `go-version-file`. The `FROM golang:` tag in `api/Dockerfile` must be the same exact version. A guardrail test fails when the Go that runs `go test` is not the version in `go.mod`, or when the Dockerfile tag is different. An older local Go fixes itself (`GOTOOLCHAIN=auto` downloads the declared one); a newer one just runs, and the test catches that. To move to a newer Go, change `go.mod` and the Dockerfile in one commit. To stay on the declared Go, run with `GOTOOLCHAIN=go<version>`.
- **golangci-lint**: the `version:` under `golangci/golangci-lint-action` in `.github/workflows/api-pull-request.yml` is the pin. Install that version locally and check it with `golangci-lint version`. A guardrail test fails when the pin is not one exact release (`latest` or a bare `v2` moves without a commit). To move to a newer version, change the pin and fix what it reports in the same PR.

A new Go version often turns on new `modernize` analyzers. `golangci-lint run --fix` applies the findings that have an automatic fix.

## Real Postgres for tests

`api/internal/testdb` uses testcontainers-go to start **one** disposable Postgres container per test process (`go test` runs one process per package). It applies the goose migrations once into a template database. Each call to `testdb.New(t)` gets a fresh database cloned from that template: a file copy, not a migration replay.

`testdb.New` returns a `*testdb.DB` with two connections:

- `Admin`: the container superuser the migrations ran as. Use it for fixture setup.
- `App`: the low-privilege `app_runtime` role that the service connects as ([ADR 0002](adr/0002-postgres-on-cloud-sql.md)). Run the code under test through it, so that a missing grant fails the test and not production.

Each package that calls `testdb.New` must define a `TestMain` that hands off to `testdb.Main`, so the shared container stops once at process exit and does not leak:

```go
func TestMain(m *testing.M) {
	os.Exit(testdb.Main(m))
}
```

CI runs this against Docker. Locally, testcontainers-go reads `DOCKER_HOST`, so a Podman socket works with no code change:

```sh
# macOS: podman machine start, then export the socket it prints, e.g.
export DOCKER_HOST='unix:///path/to/podman-machine-default-api.sock'
export TESTCONTAINERS_RYUK_DISABLED=true # Ryuk is unreliable under rootless Podman
cd api
go test ./...
```

With Ryuk disabled, only `testdb.Main` stops the container. A killed test process leaves its container running; remove it by hand:

```sh
podman rm -f -t 2 $(podman ps -aq --filter 'label=org.testcontainers=true')
```

The container image is `postgres:16-alpine`, the version of the Cloud SQL instance (#259). `testdb` was copied from `~/github/doula-cloud/api/internal/testdb` without its seed helpers and without row-level security (#240 decision 4). Built by #244.

### A due-time fixture uses the database clock

The host and the database run on different clocks when the container engine runs in a VM (Podman or Docker Desktop on macOS). The VM clock drifts from the host clock. CI does not see this: on `ubuntu-latest` the container shares the runner's clock.

So a fixture that inserts a due time (for example, an outbox row's `next_attempt_at`) from a host-side `time.Now()`, and a query that claims it with `WHERE next_attempt_at <= now()`, can fail at random. If the VM clock is behind the host clock, the row is not due yet, the worker claims nothing, and the test sees the row as it was inserted. That looks like a worker bug, not a clock bug. In doula-cloud, eight outbox tests failed this way.

The mail outbox of `api/` avoids this by design: it writes `next_attempt_at` and claims due rows with the clock seam, not `now()` (`data-model.md`, "`emailLog` and the mail outbox"), so an outbox fixture writes its due time from the fixture clock (`f.now`). For any other table whose claim compares with the database `now()`, compute a due time in SQL from the database clock, never on the host. Give the fixture an offset (`0` for "due now", `-time.Minute` for "overdue", `time.Hour` for "not due yet") and write the timestamp as `now() + $n * interval '1 microsecond'`, so one clock decides. If a fixture must pass a host-side `time.Time`, give it a margin much larger than any clock skew, and say in a comment that the margin absorbs the skew.

## Migrations via goose

Migrations live in `api/db/migrations` and use goose ([ADR 0002](adr/0002-postgres-on-cloud-sql.md)); goose is a Go tool dependency in `api/go.mod` (`go tool goose`). The package embeds the `.sql` files, so `internal/testdb` and `cmd/migrate` apply the same set.

- **Roles.** `00001_bootstrap.sql` creates `app_runtime`, a `NOLOGIN` group role. The migration owner is the login that runs goose (`migrate_login` on Cloud SQL, the container superuser in tests); it creates and owns every table, and no migration names it. Each table migration grants `app_runtime` `SELECT`, `INSERT`, `UPDATE` and `DELETE` on its tables and nothing else. The service logs in as `app_runtime_login`, a member of `app_runtime` and of nothing else ([`infrastructure.md`](infrastructure.md#the-database)). There is no row-level security.
- **Locally.** `DATABASE_URL=postgres://... go run ./cmd/migrate` applies the pending migrations to any Postgres it can reach. `bun run dev:platform` and `bun run dev:api` run it on each start (see [`environment.md`](environment.md)).
- **At deploy time.** `scripts/migrate.sh` applies them through the Cloud SQL Auth Proxy as the migration owner, as a blocking step before the new revision deploys (#260). If a migration fails, the script exits non-zero and the deploy stops.
- **The schema test.** `db/migrations/schema_test.go` proves each constraint that holds an invariant of [`data-model.md`](data-model.md): the keys, the `CHECK` constraints by name, the foreign-key delete behavior, that `app_runtime` cannot run DDL, and that each table grants `app_runtime` exactly the four data privileges. A new table or constraint gets a case there.

### Row safety: a migration must be safe on a populated table

Every pull request builds an empty Postgres. A statement that only existing rows can refuse (for example, `ADD COLUMN ... NOT NULL` with no `DEFAULT`, or a new `UNIQUE` constraint on an existing table) passes on the PR and fails on the first deploy with data.

`db/migrations/rowsafety.go` names each such statement shape, and `rowsafety_pg_test.go` proves each one against a real populated Postgres. `guardrail_test.go` fails the build for a row-dependent statement in an Up section unless `db/migrations/safety/<migration>.md` quotes it and says why existing rows cannot break it. A statement on a table that the same migration creates is exempt. The note format is in `db/migrations/safety/README.md`. Copied from `~/github/doula-cloud/api/db/migrations` by #244.
