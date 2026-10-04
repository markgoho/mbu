# ADR 0007 — The API owns the session; the app sends no ID token

- **Status:** Accepted
- **Date:** 2026-10-03
- **Applies to:** `api/**` (authentication), `app/src/lib` (the API client and the session module), `terraform/cloud_run.tf` (`EXPECTED_ORIGINS`)
- **Related:** #265, #240 (decision 6), [ADR 0003](0003-bearer-id-token-now-sessions-later.md) (superseded by this ADR). Source: doula-cloud ADR-0004, BFF-owned sessions (`~/github/doula-cloud/docs/adr/0004-bff-owned-sessions.md`), and its `authn` (`store.go`), `session` and `csrf` packages and migration `00028_sessions.sql`.

## Context

ADR 0003 kept the port on a Firebase ID token in an `Authorization: Bearer` header, and named #265 as the place to decide again. The token comes from the Firebase JavaScript SDK, which keeps a refresh token in IndexedDB. Any script on the page can read both. A token that leaks stays valid until it expires, and the API has no way to end a session: revocation is a call to Firebase, and the lifetime is Firebase's. MBU holds youth data (Scouts' names, ages and schedules), and it is pre-launch with no users, so a change now costs no migration.

doula-cloud made the same move for the same reasons. It keeps Identity Platform for sign-in and the password store, and gives it one job at the API: verify the ID token once, at the session exchange.

## Decision

1. **Adopt API-owned sessions.** A session is an opaque random token (`crypto/rand.Text`, 128 bits or more) in an HttpOnly cookie and one row in the `sessions` table (migration `00007`). The row stores the SHA-256 of the token, never the token. A lookup is a local read, renewal is an `UPDATE`, and revocation is a `DELETE`.
2. **The cookie is `__session`**, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`. Firebase Hosting removes every other cookie on the `/api/**` rewrite to Cloud Run, so no other name works when deployed.
3. **Three routes** (`internal/session`):
   - `POST /api/session` takes `{ "idToken": "..." }` in the JSON body, verifies it through `authn.Verifier`, and sets the cookie. The token goes in the body, not an `Authorization` header, so no request of the app carries that header. The route is public and limited to 120 a hour for each address (api-design section 6). It ends the session the browser's old cookie names, if any.
   - `GET /api/session` answers `{ uid, email, displayName, superAdmin }`, behind the session middleware. The app's guards read it in place of the Firebase user and its claims.
   - `DELETE /api/session` ends the session the cookie names and clears the cookie. It needs no live session and always answers 204, so sign-out cannot fail and leave a person signed in. It is public with no rate limit: it can only delete the row its own cookie names.
4. **A session exists only for a verified email.** `POST /api/session` refuses a token with no email (401) and an unverified email (`403 EMAIL_NOT_VERIFIED`), the rules the Bearer middleware applied. So `authn.Middleware` needs no verified-email check, and the app's email-verification gate is "a session, or a Firebase user whose email waits for verification". The alternative, a session for an unverified account with a flag on the row, needs a second guard class for the one route that must admit it, and the app still needs the Firebase user to send the verification mail again. It buys nothing.
5. **The Firebase SDK holds a user only until the exchange.** The app signs in with the SDK as before, exchanges the ID token, and signs the SDK out. An account with an unverified email keeps its SDK user, because `sendEmailVerification` and `reload` need it; that user has no access to the API. The app never sends the ID token to any other route.
6. **No `auth_time` check at the exchange.** Firebase's guide for its own session cookies asks for a sign-in in the last five minutes. The verify-email flow exchanges the token after the person comes back from the mail, often later than that. The ID token's own one-hour expiry is the freshness bound.
7. **The lifetime is one week, renewed on use.** A request past half the lifetime moves the row's expiry and the cookie's `Max-Age` to a full week again, with the same token. A session ends after one week with no request, and 30 days after sign-in in any case (`authn.MaxSessionAge`): then the person signs in again, so a change to the identity on the row takes effect within 30 days at the latest. Parents and Chancellors use the platform a few times around each event, so a short session would mean a password at nearly every visit; a week with no use bounds a cookie left in a shared browser.
8. **The identity on the row is frozen at sign-in.** The row keeps the uid, the lowercased email, the `name` claim (`displayName`, for the onboarding form) and the `superAdmin` claim. A change of the claim takes effect at the next sign-in, at most 30 days later. A revoked Super-admin needs `DELETE FROM sessions WHERE uid = '<uid>'` (docs/infrastructure.md). `authn.EndAllSessions` is the same statement in code; account deletion calls it after the Firebase account is gone.
9. **Expired rows are swept at each mint** (one indexed `DELETE`), as in doula-cloud. No job reaps them.
10. **Cross-site writes are refused by `Origin`.** `csrf.Wrap` runs around the whole route table: a `POST`, `PUT`, `PATCH` or `DELETE` with an `Origin` header that is not in `EXPECTED_ORIGINS` gets `403 FORBIDDEN`. A request with no `Origin` passes (Cloud Scheduler, curl). `SameSite=Lax` already keeps the cookie off a cross-site `POST`; this closes the rest, and it also blocks a cross-site sign-in that would put an attacker's session in the victim's browser. `EXPECTED_ORIGINS` unset stops startup.
11. **`Verifier` stays the one place that talks to Firebase Auth**, and only `POST /api/session` calls it. `AccountManager` (account deletion) is unchanged. The public route and the internal routes are unchanged.

## Consequences

- No credential that the API accepts is readable by JavaScript. The Firebase refresh token lives in the browser only between sign-in and the exchange, or while an email waits for verification.
- Sign-out, account deletion and a revoked Super-admin end sessions at once, with no call to Firebase.
- Each authenticated request costs one indexed read of `sessions` on the request's pool, in place of a token check against cached Google certificates.
- `Deps.SessionDB` is the pool the session routes and the middleware use; `main()` leaves it nil, so it is `Deps.DB`. A test sets it apart from `DB`, so a handler's database failure stays testable behind a working session.
- A test signs in by minting a session row and sending its cookie (`authenticate` in `main_test.go`); the Playwright fixtures fake the three session routes and set the cookie with `Set-Cookie`.
- A new Cloud Run variable, `EXPECTED_ORIGINS`, in `terraform/cloud_run.tf`. The Terraform apply goes before the deploy of this change: the old image ignores the variable, and the new one does not start without it.
- An "active sessions" view, and "sign out everywhere" for a person, are now a query and a `DELETE` away. Neither is built.
