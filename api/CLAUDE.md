# Event platform API (`api/`)

The Go service `mbu-api` on Cloud Run with Postgres. It replaces the Elysia APIs in `functions/` (#240). Module `mbu/api`, region `us-east4`.

**Before a change in `api/`, read these:**

- `docs/adr/` — the decisions (0001 to 0006). To work against one, record a new ADR first.
- `docs/api-design.md` — the rules for each endpoint: DTOs, `Idempotency-Key`, pagination, rate limits, the error body.
- `docs/testing.md` — what a test is, lint, coverage, toolchain versions, the test database, migrations.
- `docs/data-model.md` — the Postgres schema: tables, constraints, indexes, the seat-transaction lock order, delete and purge behavior.
- `docs/environment.md` — each environment variable the API reads, and the local stack (`bun run dev:platform`, `bun run seed:platform`).
- `docs/infrastructure.md` — what Terraform (`terraform/` at the repo root) owns, what stays by hand, the identities, and the apply runbook.
- `CONTEXT.md` — the domain glossary. Use its terms in code, tests, issues and PRs.

The parent issue #240 holds the plan and the ticket list. The `routes/*.test.ts` files in `functions/src/*-api/` are the behavior specification for the port. Copy a doula-cloud package from `~/github/doula-cloud/api` when it fits, and change its tenancy from Practice and Staff to user uid and University.

**Before a change is done**, these pass in `api/`. The exact commands are in `docs/testing.md`. CI runs them in `.github/workflows/api-pull-request.yml`, with an image boot smoke test.

- `gofmt -l .` prints nothing
- `go vet ./...`
- `golangci-lint run`, with `GOLANGCI_LINT_CACHE` set under the worktree
- `go test ./...`
- the coverage check (`tools/covcheck`)

Do not delete or change `functions/` before the cutover ticket (#264).
