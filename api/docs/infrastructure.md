# Infrastructure

The Terraform for the `merit-badge-university` GCP project is in `terraform/` at the repo root. [ADR 0006](adr/0006-terraform-owns-the-shape.md) records the decision: Terraform owns the shape of GCP, CI owns the image, and `apply` runs from a laptop. The full reasons are in doula-cloud's `docs/infrastructure.md` (`~/github/doula-cloud/docs/infrastructure.md`); this page keeps only what MBU needs.

**If you are about to make a GCP resource by hand, this page is the boundary.** A resource in "What Terraform owns" goes into `terraform/` and is applied. A resource in "What stays by hand" is made by a person, for the reason written beside it.

## What Terraform owns

A difference between `terraform/` and the live project makes `plan` non-empty. #262 makes that a red required check.

| Resource                                                                                                                            | File                     | Why it is owned                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The APIs the stack uses (Cloud Run, Cloud SQL Admin, Secret Manager, Artifact Registry, Cloud Scheduler, IAM, IAM Credentials, STS) | `services.tf`            | A missing API is a deploy that fails with an unclear error. Each has `disable_on_destroy = false`, because Firebase shares some of them.                                                                                     |
| Artifact Registry repository `api` (Docker, `us-east4`)                                                                             | `registry.tf`            | The repository, not the images in it. CI pushes the images (#260).                                                                                                                                                           |
| The four service accounts and their grants (see [Identities](#identities))                                                          | `iam.tf`                 | The set of things each identity can do must stay small and written down. A grant added by hand is a red `plan`.                                                                                                              |
| The custom role `mbuApiFirebaseAuthUsers`                                                                                           | `iam.tf`                 | Firebase Auth has no resource-level IAM. `roles/firebaseauth.admin` would let the container change the sign-in configuration.                                                                                                |
| The Workload Identity pool `github-actions` and provider `github`                                                                   | `workload_identity.tf`   | The provider's attribute condition, `assertion.repository == 'markgoho/mbu'`, is the one string that stops another repository from getting credentials in this project.                                                      |
| `terraform-plan@`'s `roles/storage.objectUser` on the state bucket                                                                  | `iam.tf`                 | The bucket is not owned, but this grant is: a member resource cannot delete the bucket, and the drift check can then see the grant go missing.                                                                               |
| Cloud SQL instance `mbu-pg` and database `mbu`                                                                                      | `cloud_sql.tf`           | The instance settings (tier, backups, SSL mode) are decisions. Three protections: `deletion_protection`, `settings.deletion_protection_enabled`, `prevent_destroy`.                                                          |
| The secret shells `mbu-pg-app-runtime-dsn`, `mbu-pg-migrate-dsn` and their accessor grants                                          | `secrets.tf`             | A secret that its reader cannot access fails at container start or in the deploy job. Each grant is one identity on one secret. `deletion_protection` and `prevent_destroy` on each shell.                                   |
| The Cloud Run service `mbu-api` (not its image) and its `allUsers` `roles/run.invoker` grant                                        | `cloud_run.tf`           | The environment, the identity, the Cloud SQL mount, scaling and the probe are the shape. The deploy pipeline sets only the image (#260). `deletion_protection` and `prevent_destroy`.                                        |
| The Cloud Scheduler jobs `process-outbox-drain` and `retention-purge`, and the Scheduler agent's grant on `internal-caller@`        | `scheduler.tf`, `iam.tf` | A missing or wrong job is silent: no mail goes out and no purge runs. The target URL, the audience and the schedule are the shape. No `prevent_destroy`: a job holds no data. See [The Scheduler jobs](#the-scheduler-jobs). |

Project IAM is always `google_project_iam_member`, one principal-role pair for each resource. `google_project_iam_policy` and `google_project_iam_binding` are never used: both are authoritative and would remove the bindings that Firebase and Google's service agents hold.

## What stays by hand

Each line is a decision.

| Resource                                                                 | Why it is not in Terraform                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The state bucket `gs://merit-badge-university-tfstate`                   | It must exist before Terraform runs. A configuration that owns its own state bucket can propose to delete it. The commands are in [State](#state).                                                                                                                                                                                                                                                      |
| Secret values (`google_secret_manager_secret_version`)                   | State is plaintext. Terraform owns the secret shells and their grants (`secrets.tf`); a person adds each value with `gcloud secrets versions add` (runbook). The Mailgun key waits for #106: until then there is no `mbu-mailgun-api-key` shell and the service uses the fake sender (#257). A placeholder key is never set: a set `MAILGUN_API_KEY` selects the real sender, and each send would fail. |
| Cloud SQL logins and passwords                                           | `google_sql_user` writes the password to state. The instance and the database are owned (`cloud_sql.tf`); the logins `migrate_login` and `app_runtime_login` are made by hand (runbook, step 6 and step 8).                                                                                                                                                                                             |
| The `mbu-api` image                                                      | The deploy pipeline sets it on each merge to trunk (#260). The Cloud Run resource ignores it (ADR 0006).                                                                                                                                                                                                                                                                                                |
| The database schema                                                      | goose migrations own it (`api/db/migrations`), run by the deploy pipeline.                                                                                                                                                                                                                                                                                                                              |
| Firebase Hosting, Firestore, Firebase Auth configuration                 | `firebase.json` and `.firebaserc` are already code and deploy from CI. Firebase made the Firestore database. The sign-in providers and authorized domains are a product decision made once in the console. A second owner would make drift, not find it.                                                                                                                                                |
| Firebase- and Google-created service accounts                            | `github-action-1119245672@` (the Hosting deploy key, `FIREBASE_SERVICE_ACCOUNT_MERIT_BADGE_UNIVERSITY`), `firebase-adminsdk-fbsvc@`, the default compute account, and every `service-…@gcp-sa-*` agent. The platform makes and repairs them; Terraform would fight it. The Hosting key and its workflows stay as they are until cutover (#264).                                                         |
| Artifact Registry `gcf-artifacts`                                        | Cloud Functions made it for its own images. It goes away with `functions/` (#264).                                                                                                                                                                                                                                                                                                                      |
| The owner's `roles/iam.serviceAccountTokenCreator` on `internal-caller@` | It names the owner's email, and this repository is public. The binding lets the owner mint a token to call an internal endpoint by hand ([The Scheduler jobs](#the-scheduler-jobs)). `roles/owner` carries `actAs` but not `getOpenIdToken`. Terraform's grants on the account are `google_service_account_iam_member`, which is not authoritative, so this binding is not drift.                       |
| Mailgun, GitHub                                                          | Outside GCP.                                                                                                                                                                                                                                                                                                                                                                                            |

## Identities

| Account                                                          | Used by                                                | Grants (all in `terraform/`)                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mbu-api-runtime@merit-badge-university.iam.gserviceaccount.com` | The `mbu-api` container (#259)                         | `roles/cloudsql.client` (project; Cloud SQL has no instance IAM), `mbuApiFirebaseAuthUsers` (project): `firebaseauth.users.get`, `.update`, `.delete`. `roles/secretmanager.secretAccessor` on `mbu-pg-app-runtime-dsn` only (`secrets.tf`).                                                                                                                                    |
| `mbu-deploy@merit-badge-university.iam.gserviceaccount.com`      | GitHub Actions deploys (#260)                          | `roles/artifactregistry.writer` on the `api` repository only, `roles/run.developer` (project; it has no `setIamPolicy`, so a deploy cannot change who may invoke the service), `roles/cloudsql.client` (project, for the migrate step), `roles/iam.serviceAccountUser` on `mbu-api-runtime@`. `roles/secretmanager.secretAccessor` on `mbu-pg-migrate-dsn` only (`secrets.tf`). |
| `terraform-plan@merit-badge-university.iam.gserviceaccount.com`  | The drift check (#262)                                 | `roles/viewer`, `roles/iam.securityReviewer`, `roles/iam.workloadIdentityPoolViewer` (project), `roles/storage.objectUser` on the state bucket. Nothing that can change a GCP resource. The one exception: `objectUser` lets it write the state objects, which the GCS backend needs for its lock. Bucket versioning keeps the earlier state.                                   |
| `internal-caller@merit-badge-university.iam.gserviceaccount.com` | Cloud Scheduler at `/api/internal/**` (#261, ADR 0005) | None. The guard checks the token's `email` claim against `INTERNAL_OIDC_CALLERS`. Cloud Scheduler's service agent (`service-643912800060@gcp-sa-cloudscheduler.iam.gserviceaccount.com`) mints the token: it has `roles/iam.serviceAccountTokenCreator` on this account only (`iam.tf`). The owner's grant is by hand (see above).                                              |

`terraform-plan@` has `roles/iam.workloadIdentityUser` for the principal set `attribute.repository/markgoho/mbu` of the pool (any ref: the drift check runs on pull requests). `mbu-deploy@` has it for `attribute.ref/refs/heads/trunk` only (#260), so only a trunk run can migrate or deploy; the provider's `attribute_condition` limits both to this repository. No JSON key exists for any of the four. A workflow authenticates with `google-github-actions/auth` and these inputs:

```yaml
workload_identity_provider: projects/643912800060/locations/global/workloadIdentityPools/github-actions/providers/github
service_account: mbu-deploy@merit-badge-university.iam.gserviceaccount.com
```

The job needs `permissions: id-token: write`. `.github/workflows/gcp-auth-check.yml` is a manual check of this path. Run it on trunk: from another branch the token exchange for `mbu-deploy@` is refused.

Images: `us-east4-docker.pkg.dev/merit-badge-university/api/<image>:<tag>`.

## Who may apply

**`plan` runs in CI (#262). `apply` runs from a laptop, as the project owner (`roles/owner`).** Applying this configuration needs IAM-admin permissions. A CI principal with those permissions could grant itself anything, through the Workload Identity provider that the same configuration owns. No service account has permission to apply, so there is no apply credential to leak.

- `apply` uses the owner's Application Default Credentials (`gcloud auth application-default login`), from the main checkout, on trunk.
- `terraform-plan@` can read and diff, and nothing else.
- `terraform destroy` is never run against this project.
- `prevent_destroy` is on the four service accounts, the Workload Identity pool, the provider, the Cloud SQL instance and database, the two secret shells and the `mbu-api` service. A plan that would delete one fails.

**MBU makes these resources new.** doula-cloud imported a live project and allowed only import-only applies until the plan was empty. That rule does not apply here: the first apply reports `N to add, 0 to change, 0 to destroy`. Read the plan before you type `yes`: any `change` or `destroy` on the first apply is a mistake.

## State

State is in the GCS bucket `merit-badge-university-tfstate` in this project (`us-east4`), prefix `state`. The bucket is versioned, has uniform bucket-level access and enforced public access prevention, and is made once by hand (see the runbook). The GCS backend keeps a lock object in the same bucket.

Who can read state: the owner, through `roles/owner`, and `terraform-plan@`, through `roles/storage.objectUser` on this bucket only. State holds no secret value: Terraform owns no secret version and no Cloud SQL password, and the Scheduler jobs carry an OIDC token config, not a secret (ADR 0005).

**A stranded lock.** If a process that holds the lock is killed (a closed terminal mid-apply, a cancelled runner), the next run fails with `Error acquiring the state lock`. Confirm that the `Who:` in the error's `Lock Info` is gone, then run `terraform force-unlock <LOCK_ID>` from `terraform/`, as the owner.

## The database

Instance `mbu-pg` (`cloud_sql.tf`): Postgres 16, `db-f1-micro` (Enterprise edition), zonal in `us-east4-a`, 10 GB HDD, daily backups at 08:00 UTC with 7 kept, no point-in-time recovery. These are the settings of doula-cloud's `doula-cloud-pg`. Connection name: `merit-badge-university:us-east4:mbu-pg`. Database: `mbu`.

**SSL mode `TRUSTED_CLIENT_CERTIFICATE_REQUIRED`.** The instance has a public IP and no authorized networks. Each connection must show a client certificate, and only the Cloud SQL connectors make one (from IAM, `roles/cloudsql.client`): Cloud Run's `/cloudsql` mount and the Cloud SQL Auth Proxy. `gcloud sql connect` does not work. Use the Auth Proxy and `psql`.

**Two logins, both made by hand.**

| Login               | Made with                                                           | Member of                                                            | Used by                                                                               |
| ------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `migrate_login`     | `gcloud sql users create`                                           | `cloudsqlsuperuser` (Cloud SQL adds each user it makes)              | goose: the migration owner. It creates `app_runtime` and owns every table (ADR 0002). |
| `app_runtime_login` | `CREATE ROLE ... LOGIN ... IN ROLE app_runtime`, as `migrate_login` | `app_runtime` only: `SELECT`, `INSERT`, `UPDATE`, `DELETE` on tables | The `mbu-api` container (`DATABASE_URL`).                                             |

`app_runtime_login` is made with SQL, not with `gcloud`, because `gcloud sql users create` puts each user in `cloudsqlsuperuser`. Postgres 16 lets a role with `CREATEROLE` grant membership only in a role it has `ADMIN OPTION` on, and the creator of a role gets that option. So the migrations must run as `migrate_login` before `app_runtime_login` is made: then `migrate_login` made `app_runtime`. The `postgres` user is not used.

**The DSN of each secret.** Use hex passwords (`openssl rand -hex 32`), so that a DSN needs no URL encoding.

| Secret                   | Value                                                                                                                                                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mbu-pg-app-runtime-dsn` | `postgres://app_runtime_login:<password>@/mbu?host=/cloudsql/merit-badge-university:us-east4:mbu-pg&sslmode=disable`: the Unix socket of Cloud Run's Cloud SQL mount. The connector encrypts the connection, so the socket uses no TLS. |
| `mbu-pg-migrate-dsn`     | `postgres://migrate_login:<password>@127.0.0.1:5432/mbu?sslmode=disable`: the Auth Proxy on port 5432 of the deploy job (#260).                                                                                                         |

**The connection budget.** `db-f1-micro` allows 25 connections, and Postgres keeps 3 of them for superusers (`superuser_reserved_connections`): 22 are left. `mbu-api` has at most 2 instances (`max_instance_count`, `cloud_run.tf`), and each instance's pool has at most 4 connections (`maxOpenConns`, `api/main.go`). During a deploy the old and the new revision both run: 2 revisions × 2 instances × 4 = 16 connections. That leaves 6 for the migration, a `psql` session and Cloud SQL's own tools. To raise `max_instance_count`, lower `maxOpenConns` or move to a larger tier, and change this paragraph.

**The `und-x-icu` collation.** The Roster sort uses `COLLATE "und-x-icu"` (data-model.md). Postgres 16 on Cloud SQL has the ICU collations in each database. Runbook step 9 checks it. If a request fails with `collation "und-x-icu" for encoding "UTF8" does not exist`, this is the cause.

## The Cloud Run service

`mbu-api` in `us-east4` (`cloud_run.tf`):

- Runs as `mbu-api-runtime@`. 0 to 2 instances, 80 requests for each instance, a 300 s request timeout (above the 120 s attempt deadline of the outbox drain job, #261), 1 CPU and 512 MiB.
- The Cloud SQL instance is mounted at `/cloudsql`.
- A startup probe on `GET /api/health`, which sends no query.
- The environment is the "Deployed" column of [`environment.md`](environment.md). `DATABASE_URL` is a reference to `mbu-pg-app-runtime-dsn:latest`. A secret reference with no version stops each new revision: so the runbook adds the DSN values before it makes the service.
- Its base URL is `https://mbu-api-643912800060.us-east4.run.app` (`local.api_base_url`). Terraform cannot read the URL of a service before the service exists, so the local holds the deterministic form, and a `postcondition` on the service fails the apply if Cloud Run gives another URL. `INTERNAL_OIDC_AUDIENCE` and the `oidc_token.audience` of each Scheduler job (#261) use this local.
- `allUsers` has `roles/run.invoker`: the Firebase Hosting rewrite sends anonymous requests. The process does the authentication (Firebase ID tokens; the OIDC caller guard on `/api/internal/**`, ADR 0005).
- **Terraform owns the shape, the deploy pipeline owns the image.** The first apply uses the public placeholder `us-docker.pkg.dev/cloudrun/container/hello`. `ignore_changes` covers the image, the `commit-sha` revision label, `client` and `client_version`. The deploy (#260) must change only the image and that label, and pass `--service-account mbu-api-runtime@merit-badge-university.iam.gserviceaccount.com`. A deploy that sets an environment variable or a secret makes `plan` non-empty: change the environment in `cloud_run.tf`.

## The Scheduler jobs

`scheduler.tf` (#261, ADR 0005). Both jobs are in `us-east4` and use UTC. Each job sends `POST` to the `run.app` URL directly, with an OIDC token for `internal-caller@`. The Firebase Hosting rewrite still sends `/api/**` to Cloud Functions until cutover (#264).

| Job                    | Schedule             | Target                                 | Attempt deadline | Retries                     |
| ---------------------- | -------------------- | -------------------------------------- | ---------------- | --------------------------- |
| `process-outbox-drain` | `* * * * *`          | `/api/internal/outboxes/drain` (#257)  | 120 s            | None: the next tick retries |
| `retention-purge`      | `23 9 * * *` (09:23) | `/api/internal/retention/purge` (#256) | 180 s            | 3, from 60 s backoff        |

**The audience is the base URL.** Each job sets `oidc_token.audience` to `local.api_base_url`, the same value as `INTERNAL_OIDC_AUDIENCE`. Cloud Scheduler sets an unset audience to the full target URL with the path, and the guard answers 401 to that token.

**Who mints the token.** Cloud Scheduler's service agent, through `roles/iam.serviceAccountTokenCreator` on `internal-caller@` (`iam.tf`). `roles/iam.serviceAccountUser` does not carry `iam.serviceAccounts.getOpenIdToken`. The identity that creates a job must have `actAs` on `internal-caller@`: the owner has it through `roles/owner`.

**Call an internal endpoint by hand.** First, once, give your own account permission to mint a token for `internal-caller@` (by hand; see [What stays by hand](#what-stays-by-hand)):

```sh
gcloud iam service-accounts add-iam-policy-binding \
  internal-caller@merit-badge-university.iam.gserviceaccount.com \
  --member "user:$(gcloud config get-value account)" \
  --role roles/iam.serviceAccountTokenCreator \
  --project merit-badge-university
```

Then mint a token and send the request:

```sh
TOKEN="$(gcloud auth print-identity-token \
  --impersonate-service-account=internal-caller@merit-badge-university.iam.gserviceaccount.com \
  --audiences=https://mbu-api-643912800060.us-east4.run.app \
  --include-email)"
curl -sS -X POST -H "Authorization: Bearer $TOKEN" \
  https://mbu-api-643912800060.us-east4.run.app/api/internal/retention/purge
```

Both flags are necessary. Without `--audiences` the token's audience is not the base URL; without `--include-email` the token has no `email` claim. The guard answers 401 to each. A new IAM binding can take a minute or two before `print-identity-token` works.

**Run a job now.** `gcloud scheduler jobs run <job> --location us-east4 --project merit-badge-university`. The commands that check the result are in the runbook, step 19.

**Pause the drain.** `gcloud scheduler jobs pause process-outbox-drain --location us-east4 --project merit-badge-university` stops the mail. `terraform plan` then shows `paused` as changed: resume it, or apply, when the cause is fixed.

## How a deploy works

`.github/workflows/api-deploy-merge.yml` (#260). A push to trunk that changes `api/`, `scripts/migrate.sh`, the badge list (`scripts/merit-badges.ts`, `scripts/generate-api-badge-catalog.ts`) or one of the two API workflow files starts it. A pull request that changes the same paths runs the checks. Its jobs run in this order, and a job that fails stops each job after it:

1. **`checks`** calls `.github/workflows/api-pull-request.yml`: the same gofmt, vet, lint, tests, coverage, Badge Catalog and image boot checks as a pull request. That file has no `push` trigger of its own, so a trunk push runs the checks once.
2. **`migrate`** authenticates as `mbu-deploy@`, reads `mbu-pg-migrate-dsn`, installs the Cloud SQL Auth Proxy and runs `scripts/migrate.sh` as `migrate_login`. The script starts the proxy on `127.0.0.1:5432` and runs `go tool goose ... up`.
3. **`deploy`** builds `api/Dockerfile`, pushes `us-east4-docker.pkg.dev/merit-badge-university/api/mbu-api:<commit sha>` and deploys it to `mbu-api` with `google-github-actions/deploy-cloudrun`. It changes only the image and the revision label `commit-sha`, and passes `--service-account mbu-api-runtime@...`. It sets no environment variable and no secret: Terraform owns them ([The Cloud Run service](#the-cloud-run-service)). `skip_default_labels` is on, because the action's default `managed-by` label is not in `ignore_changes`.
4. **`smoke`** sends `GET <run.app URL>/api/health` and expects `200` with `"status":"ok"` (the placeholder image answers `200` on each path, but not that body).

The workflow never cancels a run: a migration must not stop half way. GitHub keeps one run in progress and one queued, and a newer push replaces the queued run. The next run that starts migrates to HEAD and deploys HEAD, so it covers the skipped commit.

**The switch.** On a push, `migrate` (and so `deploy` and `smoke`) runs only when the repository variable `API_DEPLOY_ENABLED` is `true`. Without it, a push runs `checks` only and the run is green. A manual run (`workflow_dispatch`) on trunk runs every job without the variable. The runbook below turns the switch on after the first deploy. To stop deploys for a time, delete the variable or set it to `false`.

**When `migrate` fails**, nothing is deployed: the running revision keeps serving. goose runs each migration in its own transaction, so the failed migration left no change, and the migrations before it in the same run are applied. Read the job log for the failed statement. Fix it with a new commit to trunk (a new migration, or a change to the failed one, which is not applied yet). Do not change a migration that is already applied: goose does not run it again. Then let the next push, or a manual run, deploy.

**Why a migration must pass the row-safety guardrail before trunk.** A pull request tests each migration on an empty Postgres. Cloud SQL has rows. A statement that only existing rows can refuse (for example `ADD COLUMN ... NOT NULL` with no default) is green on the pull request and fails in `migrate`, so nothing deploys until someone fixes it on trunk. The guardrail (`api/db/migrations/embed.go`, [`testing.md`](testing.md), "Row safety") refuses such a statement on the pull request unless a safety note says why the rows cannot break it.

**When `deploy` or `smoke` fails** after `migrate` passed, the schema is new and the revision is old. A migration must therefore work with the revision that runs before it (add first, remove in a later deploy). If `smoke` fails, Cloud Run already sends traffic to the new revision. Fix the problem with a new commit on trunk. To go back to the previous revision before the fix, run `gcloud run services update-traffic mbu-api --to-revisions <previous revision>=100 --region us-east4 --project merit-badge-university`. A pinned revision keeps all traffic, also after the next deploy, and `terraform plan` shows the traffic as changed: after the fix deploys, run the same command with `--to-latest` in place of `--to-revisions ...`.

## Runbook: the first apply

Run these once, in order, from the repo root on trunk, as the project owner. Each `gcloud` command names `--project merit-badge-university`, because the default gcloud project on the laptop can be a different one. Steps 6 to 11 use shell variables: run them in one terminal.

The apply has two stages. A Cloud Run revision whose `DATABASE_URL` secret has no version does not start, and the migrations must run before `app_runtime_login` can exist. So stage 1 makes the instance, the database and the secret shells; the logins and the secret values come next, by hand; stage 2 makes the rest, the service included.

1. Make the state bucket (by hand, once):

   ```sh
   gcloud storage buckets create gs://merit-badge-university-tfstate \
     --project merit-badge-university --location us-east4 \
     --uniform-bucket-level-access --public-access-prevention
   gcloud storage buckets update gs://merit-badge-university-tfstate \
     --project merit-badge-university --versioning
   ```

2. Get Application Default Credentials for Terraform and the Auth Proxy:

   ```sh
   gcloud auth application-default login
   gcloud auth application-default set-quota-project merit-badge-university
   ```

3. Install the Auth Proxy and `psql`, if they are not installed:

   ```sh
   brew install cloud-sql-proxy libpq
   export PATH="$(brew --prefix libpq)/bin:$PATH"
   ```

4. Stage 1: the instance, the database, the secret shells and their grants (and the APIs and service accounts that they need):

   ```sh
   cd terraform
   terraform init
   terraform plan -out=tfplan \
     -target=google_sql_database.mbu \
     -target=google_secret_manager_secret_iam_member.pg_app_runtime_dsn_runtime_accessor \
     -target=google_secret_manager_secret_iam_member.pg_migrate_dsn_deploy_accessor
   # expect: 16 to add, 0 to change, 0 to destroy
   terraform apply tfplan
   rm tfplan
   cd ..
   ```

   Terraform warns that `-target` is for exceptions. That is correct here. The instance takes about 10 minutes.

5. Make the two passwords. They stay in this shell only:

   ```sh
   MIGRATE_PW="$(openssl rand -hex 32)"
   APP_PW="$(openssl rand -hex 32)"
   ```

6. Make the migration login:

   ```sh
   gcloud sql users create migrate_login --instance mbu-pg \
     --password "$MIGRATE_PW" --project merit-badge-university
   ```

7. Start the Auth Proxy on port 5433 (not 5432, which a local Postgres can use) and run the migrations as `migrate_login`:

   ```sh
   cloud-sql-proxy --port 5433 merit-badge-university:us-east4:mbu-pg &
   PROXY_PID=$!
   sleep 5
   MIGRATE_LOCAL="postgres://migrate_login:${MIGRATE_PW}@127.0.0.1:5433/mbu?sslmode=disable"
   (cd api && DATABASE_URL="$MIGRATE_LOCAL" go run ./cmd/migrate)
   ```

8. Make the service login, a member of `app_runtime` and of nothing else:

   ```sh
   printf "CREATE ROLE app_runtime_login LOGIN PASSWORD '%s' IN ROLE app_runtime;\n" "$APP_PW" \
     | psql "$MIGRATE_LOCAL" -v ON_ERROR_STOP=1
   ```

9. Check each login, the grants and the collation:

   ```sh
   psql "$MIGRATE_LOCAL" -c "SELECT current_user"   # expect: migrate_login
   APP_LOCAL="postgres://app_runtime_login:${APP_PW}@127.0.0.1:5433/mbu?sslmode=disable"
   psql "$APP_LOCAL" -c "SELECT current_user, count(*) FROM users"   # expect: app_runtime_login | 0
   psql "$APP_LOCAL" -c "SELECT pg_has_role('cloudsqlsuperuser', 'MEMBER')"   # expect: f
   psql "$APP_LOCAL" -c "SELECT collname FROM pg_collation WHERE collname = 'und-x-icu'"   # expect: 1 row
   ```

   If the collation query returns no row, stop: the Roster sort fails on this instance (see [The database](#the-database)).

10. Add the two secret values, then stop the proxy and clear the variables:

    ```sh
    printf '%s' "postgres://app_runtime_login:${APP_PW}@/mbu?host=/cloudsql/merit-badge-university:us-east4:mbu-pg&sslmode=disable" \
      | gcloud secrets versions add mbu-pg-app-runtime-dsn --data-file=- --project merit-badge-university
    printf '%s' "postgres://migrate_login:${MIGRATE_PW}@127.0.0.1:5432/mbu?sslmode=disable" \
      | gcloud secrets versions add mbu-pg-migrate-dsn --data-file=- --project merit-badge-university
    kill "$PROXY_PID"
    unset MIGRATE_PW APP_PW MIGRATE_LOCAL APP_LOCAL PROXY_PID
    ```

11. Stage 2: everything else, the `mbu-api` service and the Scheduler jobs included. First make Cloud Scheduler's service agent, if it does not exist yet. The Scheduler grant in `iam.tf` names it, and an IAM binding for an account that does not exist fails:

    ```sh
    gcloud beta services identity create --service=cloudscheduler.googleapis.com \
      --project merit-badge-university
    # expect: Service identity created: service-643912800060@gcp-sa-cloudscheduler.iam.gserviceaccount.com
    ```

    Then apply:

    ```sh
    cd terraform
    terraform plan -out=tfplan   # expect: 23 to add, 0 to change, 0 to destroy
    terraform apply tfplan
    rm tfplan
    ```

    From this apply on, the drain job calls the service each minute. Until the first deploy (step 15) it calls the placeholder, which answers `200` on each path. That is harmless.

    If the apply stops on an IAM grant because a new service account is not visible yet, run `terraform apply` again. The retry adds only what is missing. If it stops on the `postcondition` of `mbu-api`, Cloud Run gave the service a different URL: set `local.api_base_url` in `cloud_run.tf` to the URL in the error, open a PR, and apply again.

12. Check that the plan is empty:

    ```sh
    terraform plan   # expect: No changes. Your infrastructure matches the configuration.
    cd ..
    ```

13. Check that the placeholder answers on its `run.app` URL:

    ```sh
    curl -sS -o /dev/null -w '%{http_code}\n' https://mbu-api-643912800060.us-east4.run.app/api/health   # expect: 200
    ```

    The placeholder answers each path. The first deploy (#260) replaces it with the API.

14. Check the deploy identity from GitHub Actions. Nothing has to be set in GitHub: the provider path and the account are in the workflow file.

    ```sh
    gh workflow run gcp-auth-check.yml --ref trunk
    sleep 10   # the new run takes a few seconds to show in the list
    gh run list --workflow gcp-auth-check.yml --limit 1   # confirm it is the run you started
    gh run watch "$(gh run list --workflow gcp-auth-check.yml --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
    ```

    The run authenticates as `mbu-deploy@` and lists the `api` repository (empty until #260 pushes an image).

15. The first deploy (#260). Start the deploy workflow by hand on trunk. It runs `checks`, `migrate` (no pending migration after step 7), `deploy` and `smoke`:

    ```sh
    gh workflow run api-deploy-merge.yml --ref trunk
    sleep 10
    gh run list --workflow api-deploy-merge.yml --event workflow_dispatch --limit 1   # confirm it is the run you started
    gh run watch "$(gh run list --workflow api-deploy-merge.yml --event workflow_dispatch --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
    curl -sS https://mbu-api-643912800060.us-east4.run.app/api/health   # expect: {"status":"ok"}
    ```

16. Check that the deploy left the plan empty:

    ```sh
    cd terraform
    terraform plan   # expect: No changes. Your infrastructure matches the configuration.
    cd ..
    ```

    If the plan wants to change a field of `google_cloud_run_v2_service.api`, the deploy wrote a field that `ignore_changes` in `cloud_run.tf` does not cover. Add that field to `ignore_changes` in a PR, say in the PR which field moved, and do not apply the plan that puts it back.

17. Turn on deploys on each trunk push:

    ```sh
    gh variable set API_DEPLOY_ENABLED --body true --repo markgoho/mbu
    ```

    From now on each trunk push that changes `api/` migrates and deploys. See [How a deploy works](#how-a-deploy-works).

18. Check that an internal endpoint refuses a request with no token:

    ```sh
    curl -sS -X POST -o /dev/null -w '%{http_code}\n' \
      https://mbu-api-643912800060.us-east4.run.app/api/internal/retention/purge   # expect: 401
    ```

19. Run each Scheduler job once and check the result (#261). The drain job already runs each minute; the purge job runs at 09:23 UTC.

    ```sh
    for JOB in process-outbox-drain retention-purge; do
      gcloud scheduler jobs run "$JOB" --location us-east4 --project merit-badge-university
    done
    sleep 30
    for JOB in process-outbox-drain retention-purge; do
      gcloud scheduler jobs describe "$JOB" --location us-east4 --project merit-badge-university \
        --format='value(name,lastAttemptTime,status)'
    done
    # expect: a lastAttemptTime of now and an empty status (a failed attempt shows a status code)
    gcloud logging read \
      'resource.type="cloud_run_revision" AND resource.labels.service_name="mbu-api" AND httpRequest.requestUrl:"/api/internal/"' \
      --project merit-badge-university --freshness 10m --limit 10 \
      --format='table(timestamp,httpRequest.requestMethod,httpRequest.status,httpRequest.requestUrl)'
    # expect: POST 200 for /api/internal/outboxes/drain and /api/internal/retention/purge
    # (the POST 401 on the purge is the no-token check of step 18)
    ```

    A 401 means the token is wrong: check that `oidc_token.audience` equals `INTERNAL_OIDC_AUDIENCE` and that `INTERNAL_OIDC_CALLERS` names `internal-caller@`. A job whose `status` shows `code=7` (`PERMISSION_DENIED`) and that has no request in the log means the agent cannot mint the token. The Scheduler log shows the error text: `gcloud logging read 'resource.type="cloud_scheduler_job"' --project merit-badge-university --freshness 10m --limit 10`: check the grant `scheduler_agent_mints_internal_caller` in `iam.tf`.

20. Check that the plan is still empty (`terraform plan` in `terraform/`).

To change a password later: make a new one, change the login (`ALTER ROLE app_runtime_login PASSWORD '...'` as `migrate_login`, or `gcloud sql users set-password migrate_login`), add a new secret version with the new DSN, and deploy a new revision (it reads `latest` when it starts).
