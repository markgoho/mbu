# ADR 0001 — API module architecture (Elysia on Cloud Functions)

- **Status:** Accepted
- **Date:** 2026-07-05
- **Applies to:** `functions/src/**/*-api/**`
- **Related:** #94 (Phase 1 epic), #121 (the refactor that realigned all modules),
  `~/.claude/rules/{elysia,firebase-elysia,firebase-functions-testing,testing-philosophy}.md`

## Context

Phase 1 committed to mirror the `doula-cooperative/functions` layout, but four of
five API modules drifted: routes were inlined into `app.ts`, exercised by
whole-app `app.test.ts` suites, backed by class-based services, alongside
standalone service-layer tests. Only `health-api` matched the reference. The
conventions were documented (in personal `~/.claude/rules/` and in #94's
description) but **only advisory** — nothing failed when code diverged, so it
did. #121 realigned every module; this ADR records the decision and the
enforcement that keeps it from drifting again.

## Decision

Every deployed API module (`functions/src/<name>-api/`, except the shared
`shared-api` library) follows this shape, using `health-api` as the in-repo
reference:

1. **Layout.** `app.ts` (factory composing plugins) · `handler.ts` (Firebase
   entry) · `plugins/<name>-plugin.ts` · `routes/<route>.ts` (one logic function
   per route, no auth code) · `routes/<route>.test.ts` · `schemas/` ·
   `services/` · `test-utils/create-<name>-test-plugin.ts` · `types/`.
2. **`app.ts` is a thin factory:**
   `createApp(services?) => new Elysia({ adapter: node(), prefix: "/api" }).onError(mapError).use(create<Name>Plugin(services))`.
   Each plugin resolves injected or production dependencies once, then passes them
   explicitly to route logic through closures; do not decorate dependencies onto
   the Elysia context. Authentication lives in the plugin guard
   (`.resolve(requireAuth(...))`); public routes stay outside it. Domain
   authorization stays in services.
3. **Services are plain object literals** typed to an interface
   (`export const XServiceImpl: X = { … }`) — never classes. Call
   `getFirestore()` inline and take cross-cutting deps (`logger`) as function
   parameters. (`class Foo extends Error` for the `HttpError` hierarchy is fine.)
4. **Tests are per-route boundary tests only.** One `routes/<route>.test.ts`
   per route, each with a SIFERS `setup()`, driving the plugin through
   `handle()` with services mocked at the seam via `create<Name>TestPlugin()`.
   Assert on the HTTP response, not on mock calls. Every authenticated route
   covers 401 (no token) and 403 (forbidden); admin routes add a non-admin 403.
   **No** whole-app `app.test.ts`, **no** standalone service-layer tests, **no**
   mocking of `firebase-admin` internals, **no** emulator in unit tests.

## Consequences

- Route logic is small, testable, and free of auth/transport coupling.
- The trade-off (accepted): exhaustive pure-function suites (e.g. a state-machine
  matrix) lose standalone granularity; their meaningful cases are re-expressed as
  route behaviors.
- Services converted from classes lose constructor-DI seams that existed only for
  the old service-layer tests; boundary tests mock the whole service instead.

## Enforcement (docs describe; lint/CI enforce)

- **ESLint** (`functions/eslint.config.js`) — everything about files that
  exist: bans service classes (`class … implements`), mock-call assertions,
  lifecycle hooks (SIFERS), mocking `firebase-admin` internals, and emulator
  imports; and flags any test file outside a `routes/` directory (catches
  whole-app `app.test.ts` and service-layer tests). Runs in the `lint` CI job.
- **Structural check** (`functions/scripts/check-architecture.sh`, via
  `npm run check:arch`, `arch` CI job) — the one thing a per-file linter can't
  express: required paths must **exist**. Every deployed `*-api` module has
  `routes/` + `plugins/` + `app.ts` + `handler.ts`.
- **Scaffold new modules by copying `health-api`** — the smallest conformant
  module — so the correct pattern is the path of least resistance.
