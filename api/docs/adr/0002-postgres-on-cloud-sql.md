# ADR 0002 — Postgres on Cloud SQL replaces Firestore; no row-level security in v1

- **Status:** Accepted
- **Date:** 2026-10-02
- **Applies to:** `api/**`, `api/db/migrations/**`
- **Related:** #240 (decisions 2, 3, 4), #243 (data model), #244 (migrations and test database), #259 (Cloud SQL). Source: doula-cloud `api/internal/testdb` and `api/db/migrations`. doula-cloud fences Practice from Practice with row-level security, proved by its `api/internal/rlsguardrail` test (its ADR-0006 states the fence); MBU does not take that part.

## Context

The data is in Firestore: `users`, `users/{uid}/scouts`, `universities` (Periods embedded), `.../classes`, `.../registrations`, `roleGrants` and `emailLog`. The domain is relational: Capacity, the Waitlist, Period Conflicts and Role Grants are joins and constraints. The doula-cloud packages that MBU reuses (idempotency, rate limit, outbox, test database, migrations) are all Postgres-native.

## Decision

1. **Postgres on Cloud SQL is the only datastore.** A `db-f1-micro` instance in `us-east4`.
2. **Migrations use goose** and live in `api/db/migrations`.
3. **Two roles.** The service connects as a low-privilege `app_runtime` role. Migrations run as a separate role that owns the tables.
4. **No row-level security in v1.** Authorization stays in Go code, as it is in TypeScript today: a handler checks the caller's Role Grants before it reads or writes. The tenancy scope is the user uid and the University.

## Alternatives not taken

- **Go with the Firestore SDK.** It is free at this scale. It was not taken because each reused package would need a Firestore port, and the seat transaction and conflict checks are easier as SQL constraints.
- **Row-level security, as doula-cloud does.** It is a second fence under the Go checks. It was not taken for v1 because MBU has few tenants, the TypeScript code has no such fence, and the port is simpler without policies on each table. A later ADR can add it; the `app_runtime` role is the seam it would use.

## Consequences

- The Cloud SQL instance is always on: about US$10 each month, where Firestore was free.
- There is no data to migrate. The schema starts clean in #243.
- A missing authorization check in a handler is not caught by the database. The HTTP-boundary tests must cover each refusal (401, 403, 404) for each route.
- Tests run against a real Postgres (see [`../testing.md`](../testing.md)).
