# ADR 0001 — Go on Cloud Run replaces Elysia on Cloud Functions

- **Status:** Accepted
- **Date:** 2026-10-02
- **Applies to:** `api/**`
- **Supersedes:** [`functions/docs/adr/0001-api-module-architecture.md`](../../../functions/docs/adr/0001-api-module-architecture.md)
- **Related:** #240 (decisions 1, 3, 5, 9, 10), #242 (scaffold), #264 (cutover). Source: the doula-cloud Go API at `~/github/doula-cloud/api`. No single doula-cloud ADR records this choice; the reference is that codebase.

## Context

The event-platform backend is five Elysia apps on Cloud Functions (`healthApi`, `usersApi`, `universitiesApi`, `registrationsApi`, `retentionApi`), with 30 routes. The owner's other product, doula-cloud, has a Go API on Cloud Run with packages that MBU needs: idempotency, rate limit, outbox, test database, migrations, error writer. Nothing is released and there are no users, so a change of stack costs only the port.

## Decision

1. **One Go service on Cloud Run.** Directory `api/`, Go module `mbu/api`, service name `mbu-api`, region `us-east4`.
2. **Standard library HTTP.** `net/http` with `http.ServeMux` method patterns. No web framework.
3. **Data access is `database/sql` with the pgx driver and plain SQL.** No ORM, no code generator. Migrations use goose (see [ADR 0002](0002-postgres-on-cloud-sql.md)).
4. **The HTTP contract stays the same, with one exception.** The same paths, methods and JSON success bodies as `functions/`, so the app's API types stay valid. The error body becomes `{ "code", "message", "details" }` with UPPER_SNAKE codes, written only by an `apierr` package. The app changes in #263.
5. **Time is read through a clock seam**, never `time.Now()` directly. The linter enforces this.
6. **Tests are HTTP-boundary tests against real Postgres.** A test builds the route table with `routes(Deps)`, sends a request, and asserts on the response and on database state. No service-layer unit tests. Vendors (Mailgun, the token verifier) are fakes at the `Deps` seam. See [`../testing.md`](../testing.md).
7. **Copy, then adapt.** When a doula-cloud package fits, copy it and change names and tenancy: doula-cloud scopes by Practice and Staff; MBU scopes by user uid and University.

## Consequences

- One deploy unit and one dev-proxy target replace five functions and five proxy entries.
- The `routes/*.test.ts` files in `functions/` are the behavior specification for the port. Each case becomes a Go handler test, unless a decision in #240 changes the behavior.
- `functions/` stays, and its ESLint and `check:arch` rules still apply to it, until the cutover (#264) deletes it.
- The rules for each endpoint are in [`../api-design.md`](../api-design.md).
