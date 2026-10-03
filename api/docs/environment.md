# Environment variables

Each environment variable that `api/` reads, with its value in each place the service runs. The format comes from `~/github/doula-cloud/docs/environment.md`. When a ticket adds a variable, it adds a row here.

## Where a value comes from

| Place                                             | Mechanism                                                                                                                                                   |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local (`bun run dev:platform`, `bun run dev:api`) | `scripts/lib/platform-stack.ts` sets each value when it starts the API.                                                                                     |
| CI (`.github/workflows/api-pull-request.yml`)     | The tests read no variable: they build `routes(Deps)` with fakes and `internal/testdb`. The `api-image` boot smoke test sets the values in the "CI" column. |
| Deployed (Cloud Run `mbu-api`)                    | Terraform and the deploy pipeline (#259, #260). Credentials come from Secret Manager.                                                                       |

## The service (`api/main.go`)

| Variable                      | Local                                                                                                                                                                      | CI (boot smoke test)                                                                                          | Deployed                                                                                                                                                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                        | `8080`                                                                                                                                                                     | unset (default `8080`)                                                                                        | set by Cloud Run                                                                                                                                                                                                                                  |
| `DATABASE_URL`                | `postgres://app_dev:app_dev@127.0.0.1:15432/mbu?sslmode=disable`. `app_dev` is a login in the `app_runtime` group that the stack makes after the migrations.               | `postgres://app:app@db.invalid:5432/app?sslmode=disable`: it must parse, but the health route sends no query. | A Cloud SQL login in the `app_runtime` group, from Secret Manager (#259).                                                                                                                                                                         |
| `GCP_PROJECT_ID`              | `merit-badge-university`                                                                                                                                                   | `merit-badge-university`                                                                                      | `merit-badge-university` (#259)                                                                                                                                                                                                                   |
| `FIREBASE_AUTH_EMULATOR_HOST` | `127.0.0.1:9099`. The Firebase Admin SDK reads it, not `main.go`: with it set, the SDK accepts the emulator's tokens.                                                      | `localhost:9099`, so that the SDK does not look for Application Default Credentials. No emulator runs.        | unset                                                                                                                                                                                                                                             |
| `CLIENT_IP_PROXY_HOPS`        | unset (`0`). No proxy is in front, so there is no `X-Forwarded-For` and `clientip` reads `RemoteAddr`.                                                                     | unset (`0`)                                                                                                   | `1` (#259): the proxies in front of Cloud Run's front end on the Firebase Hosting rewrite. A value that is not a whole number of 0 or more stops startup. See `internal/clientip` for the header shape; #296 confirms it from a deployed request. |
| `MAILGUN_API_KEY`             | unset: the stack removes it from the API's environment, so local mode sends no mail. The API does not read it until #257, which adds the fake sender for when it is unset. | unset                                                                                                         | Secret Manager (#257, #259)                                                                                                                                                                                                                       |

## The commands

| Command          | Variable                      | Local value                                                                       | Note                                                                                  |
| ---------------- | ----------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `cmd/migrate`    | `DATABASE_URL`                | `postgres://mbu:mbu@127.0.0.1:15432/mbu?sslmode=disable`, the container superuser | The migration owner. On deploy, `scripts/migrate.sh` runs the migrations (#260).      |
| `cmd/seed`       | `DATABASE_URL`                | the `app_dev` DSN above                                                           | `bun run seed:platform` sets the three values.                                        |
| `cmd/seed`       | `FIREBASE_AUTH_EMULATOR_HOST` | `127.0.0.1:9099`                                                                  | Required. Without it the seed stops, so it cannot write accounts to the real project. |
| `cmd/seed`       | `GCP_PROJECT_ID`              | `merit-badge-university`                                                          | Optional. This is the default.                                                        |
| `cmd/superadmin` | `FIREBASE_AUTH_EMULATOR_HOST` | `127.0.0.1:9099` (the default when unset)                                         | With `-production`, it must be unset.                                                 |
| `cmd/superadmin` | `GCP_PROJECT_ID`              | `merit-badge-university`                                                          | Optional. This is the default.                                                        |

## The local stack

From the repo root, after `bun install` in the root and in `app/`:

- `bun run dev:platform` starts Postgres (`api/compose.dev.yaml`, port 15432), the Firebase Auth emulator (port 9099), the Go API (port 8080) and the app dev server (port 4200). The dev server sends `/api` to the Go API.
- `bun run dev:api` starts the same stack without the app dev server.
- `bun run seed:platform` writes the fixtures of `api/cmd/seed` and their Auth emulator accounts. Each account has a verified email and the password `password123`. Run it again to reset the fixtures.
- `cd api && go run ./cmd/superadmin -email jane@example.com` gives a seeded account the `superAdmin` claim. Sign out and in again to get a token with the claim.

The container engine is `podman` by default. Set `CONTAINER_ENGINE=docker` to use Docker. Set `DB_HOST_PORT` to move Postgres from port 15432.

Ctrl-C stops all the processes and removes the container and its volume. Each start is an empty database and an emulator with no accounts.
