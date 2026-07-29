# Event Platform (`functions/` + `app/`)

The self-serve event platform (issue #94) is a separate stack from the Hugo
site: an Angular SPA in `app/` and per-domain Elysia APIs on Cloud Functions in
`functions/`. Its API modules follow a fixed architecture — plugin + one logic
function per route, plain-object services, and per-route boundary tests — with
`functions/src/health-api/` as the reference module.

**Before adding or changing an API module, read
[functions/docs/adr/0001-api-module-architecture.md](functions/docs/adr/0001-api-module-architecture.md).**
The conventions are enforced, so non-conforming code fails CI:

- `cd functions && npm run lint` — ESLint bans service classes, mock-call
  assertions, test lifecycle hooks, mocking `firebase-admin` internals, and
  emulator imports, and flags any test file outside a `routes/` directory.
- `cd functions && npm run check:arch` — every deployed `*-api` module must have
  `routes/` + `plugins/` + `app.ts` + `handler.ts` (the file-existence invariant
  ESLint can't express).

Angular spec conventions are enforced the same way via `app/eslint.config.js`.
