# ADR 0005 — The internal boundary is a caller identity, not a shared secret

- **Status:** Accepted
- **Date:** 2026-10-02
- **Applies to:** `api/**` (`/api/internal/**`)
- **Related:** #240 (decision 7), #256 (internal boundary and the retention purge), #261 (Cloud Scheduler jobs). Source: doula-cloud ADR-0037 (`~/github/doula-cloud/docs/adr/0037-the-internal-boundary-is-a-caller-identity-not-a-shared-secret.md`) and its `api/internal/internalauth` package.

## Context

The Retention Purge runs from a GitHub Actions cron that calls `POST /api/retention/purge` with a shared secret (`RETENTION_PURGE_SECRET`). The secret has no audience and no expiry, and it is stored in more than one place. `mbu-api` must allow `allUsers` to invoke it, because the app calls it, so Cloud Run IAM cannot fence the internal routes. The check must be in the process.

## Decision

1. **Internal routes live under `/api/internal/**`.** The Retention Purge and the mail drain ([ADR 0004](0004-mail-outbox-with-scheduled-drain.md)) are internal routes.
2. **The caller presents a Google-signed OIDC ID token.** Cloud Scheduler mints it for its own service account, with the service URL as the audience.
3. **A guard checks it.** The guard verifies the signature and the audience, then checks the token's `email` claim against an allowlist of service accounts from configuration. A service with no audience or an empty allowlist refuses every call.
4. **`RETENTION_PURGE_SECRET` and the GitHub Actions cron go away.** Cloud Scheduler calls the purge (#261).

## Consequences

- Production holds no shared secret for this boundary. A token expires within the hour and is bound to one audience.
- An operator who calls an internal route by hand mints a token: `gcloud auth print-identity-token --impersonate-service-account=<caller> --audiences=<service URL>`.
- If a service account is renamed without a change to the allowlist, the internal routes refuse it until the configuration is fixed. The Scheduler job's status shows that.
- **Open for #256:** doula-cloud keeps a shared-secret fallback for local runs and end-to-end tests, where no token can be minted, and Cloud Run sets no secret. #256 decides if MBU needs that fallback.
