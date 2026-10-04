# ADR 0003 — The Bearer ID token stays for the port; sessions come later

- **Status:** Superseded by [ADR 0007](0007-api-owned-sessions.md) (#265): the API owns the session, and the app sends no ID token.
- **Date:** 2026-10-02
- **Applies to:** `api/**` (authentication)
- **Related:** #240 (decision 6), #249 (authorization), #265 (sessions follow-up), [`app/docs/adr/0002-app-spa-is-sveltekit.md`](../../../app/docs/adr/0002-app-spa-is-sveltekit.md) (decision 2). Source: doula-cloud ADR-0004, BFF-owned sessions (`~/github/doula-cloud/docs/adr/0004-bff-owned-sessions.md`).

## Context

The app sends a Firebase Auth ID token as `Authorization: Bearer` on each `/api/*` call. The API requires a verified email and reads a `superAdmin` custom claim. doula-cloud moved to a session that the API owns: an opaque token in a Postgres row, sent as an HttpOnly `__session` cookie, with Identity Platform kept only to verify the ID token at sign-in. That removes credentials that JavaScript can read, and it makes revocation a local read. The SvelteKit app (#228) kept the Bearer token on purpose.

## Decision

1. **The port keeps the Bearer ID token.** Each request carries the Firebase ID token; the API verifies it with the Firebase Admin SDK for Go.
2. **Verification is behind a `Verifier` interface** at the `Deps` seam. Tests use a fake `Verifier`; no test calls Firebase.
3. **The rules do not change.** A verified email is required. The `superAdmin` custom claim marks the Super-admin.
4. **Sessions are a follow-up (#265).** After the cutover, #265 decides again if MBU takes doula-cloud ADR-0004 (a Postgres session and an HttpOnly cookie).

## Consequences

- The app needs no auth change for the port.
- The cost that ADR-0004 removed stays for now: a JavaScript-readable token, and revocation that depends on the token's expiry.
- Because the provider is behind one interface, #265 changes the auth code in one place.
