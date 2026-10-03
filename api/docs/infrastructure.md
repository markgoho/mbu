# Infrastructure

The Terraform for the `merit-badge-university` GCP project is in `terraform/` at the repo root. [ADR 0006](adr/0006-terraform-owns-the-shape.md) records the decision: Terraform owns the shape of GCP, CI owns the image, and `apply` runs from a laptop. The full reasons are in doula-cloud's `docs/infrastructure.md` (`~/github/doula-cloud/docs/infrastructure.md`); this page keeps only what MBU needs.

**If you are about to make a GCP resource by hand, this page is the boundary.** A resource in "What Terraform owns" goes into `terraform/` and is applied. A resource in "What stays by hand" is made by a person, for the reason written beside it.

## What Terraform owns

A difference between `terraform/` and the live project makes `plan` non-empty. #262 makes that a red required check.

| Resource                                                                                                                            | File                   | Why it is owned                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The APIs the stack uses (Cloud Run, Cloud SQL Admin, Secret Manager, Artifact Registry, Cloud Scheduler, IAM, IAM Credentials, STS) | `services.tf`          | A missing API is a deploy that fails with an unclear error. Each has `disable_on_destroy = false`, because Firebase shares some of them.                                |
| Artifact Registry repository `api` (Docker, `us-east4`)                                                                             | `registry.tf`          | The repository, not the images in it. CI pushes the images (#260).                                                                                                      |
| The four service accounts and their grants (see [Identities](#identities))                                                          | `iam.tf`               | The set of things each identity can do must stay small and written down. A grant added by hand is a red `plan`.                                                         |
| The custom role `mbuApiFirebaseAuthUsers`                                                                                           | `iam.tf`               | Firebase Auth has no resource-level IAM. `roles/firebaseauth.admin` would let the container change the sign-in configuration.                                           |
| The Workload Identity pool `github-actions` and provider `github`                                                                   | `workload_identity.tf` | The provider's attribute condition, `assertion.repository == 'markgoho/mbu'`, is the one string that stops another repository from getting credentials in this project. |
| `terraform-plan@`'s `roles/storage.objectUser` on the state bucket                                                                  | `iam.tf`               | The bucket is not owned, but this grant is: a member resource cannot delete the bucket, and the drift check can then see the grant go missing.                          |
| Cloud SQL, secret shells and their grants, the `mbu-api` Cloud Run service                                                          | #259                   |                                                                                                                                                                         |
| The Cloud Scheduler jobs                                                                                                            | #261                   |                                                                                                                                                                         |

Project IAM is always `google_project_iam_member`, one principal-role pair for each resource. `google_project_iam_policy` and `google_project_iam_binding` are never used: both are authoritative and would remove the bindings that Firebase and Google's service agents hold.

## What stays by hand

Each line is a decision.

| Resource                                                 | Why it is not in Terraform                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The state bucket `gs://merit-badge-university-tfstate`   | It must exist before Terraform runs. A configuration that owns its own state bucket can propose to delete it. The commands are in [State](#state).                                                                                                                                                                                              |
| Secret values (`google_secret_manager_secret_version`)   | State is plaintext. Terraform owns the secret shells and their grants (#259); a person adds each value with `gcloud secrets versions add`.                                                                                                                                                                                                      |
| Cloud SQL logins and passwords                           | `google_sql_user` writes the password to state. The instance and the database are owned (#259); the logins are made by hand.                                                                                                                                                                                                                    |
| The `mbu-api` image                                      | The deploy pipeline sets it on each merge to trunk (#260). The Cloud Run resource ignores it (ADR 0006).                                                                                                                                                                                                                                        |
| The database schema                                      | goose migrations own it (`api/db/migrations`), run by the deploy pipeline.                                                                                                                                                                                                                                                                      |
| Firebase Hosting, Firestore, Firebase Auth configuration | `firebase.json` and `.firebaserc` are already code and deploy from CI. Firebase made the Firestore database. The sign-in providers and authorized domains are a product decision made once in the console. A second owner would make drift, not find it.                                                                                        |
| Firebase- and Google-created service accounts            | `github-action-1119245672@` (the Hosting deploy key, `FIREBASE_SERVICE_ACCOUNT_MERIT_BADGE_UNIVERSITY`), `firebase-adminsdk-fbsvc@`, the default compute account, and every `service-…@gcp-sa-*` agent. The platform makes and repairs them; Terraform would fight it. The Hosting key and its workflows stay as they are until cutover (#264). |
| Artifact Registry `gcf-artifacts`                        | Cloud Functions made it for its own images. It goes away with `functions/` (#264).                                                                                                                                                                                                                                                              |
| Mailgun, GitHub                                          | Outside GCP.                                                                                                                                                                                                                                                                                                                                    |

## Identities

| Account                                                          | Used by                                                | Grants (all in `terraform/`)                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mbu-api-runtime@merit-badge-university.iam.gserviceaccount.com` | The `mbu-api` container (#259)                         | `roles/cloudsql.client` (project; Cloud SQL has no instance IAM), `mbuApiFirebaseAuthUsers` (project): `firebaseauth.users.get`, `.update`, `.delete`. Per-secret `secretAccessor` comes in #259, beside each secret.                                                                                                                            |
| `mbu-deploy@merit-badge-university.iam.gserviceaccount.com`      | GitHub Actions deploys (#260)                          | `roles/artifactregistry.writer` on the `api` repository only, `roles/run.developer` (project; it has no `setIamPolicy`, so a deploy cannot change who may invoke the service), `roles/cloudsql.client` (project, for the migrate step), `roles/iam.serviceAccountUser` on `mbu-api-runtime@`. The grant on the migrate DSN secret comes in #259. |
| `terraform-plan@merit-badge-university.iam.gserviceaccount.com`  | The drift check (#262)                                 | `roles/viewer`, `roles/iam.securityReviewer`, `roles/iam.workloadIdentityPoolViewer` (project), `roles/storage.objectUser` on the state bucket. Nothing that can change a GCP resource. The one exception: `objectUser` lets it write the state objects, which the GCS backend needs for its lock. Bucket versioning keeps the earlier state.    |
| `internal-caller@merit-badge-university.iam.gserviceaccount.com` | Cloud Scheduler at `/api/internal/**` (#261, ADR 0005) | None. The guard checks the token's `email` claim against `INTERNAL_OIDC_CALLERS`. Cloud Scheduler's service agent mints the token.                                                                                                                                                                                                               |

`mbu-deploy@` and `terraform-plan@` each have `roles/iam.workloadIdentityUser` for the principal set `attribute.repository/markgoho/mbu` of the pool. No JSON key exists for any of the four. A workflow authenticates with `google-github-actions/auth` and these inputs:

```yaml
workload_identity_provider: projects/643912800060/locations/global/workloadIdentityPools/github-actions/providers/github
service_account: mbu-deploy@merit-badge-university.iam.gserviceaccount.com
```

The job needs `permissions: id-token: write`. `.github/workflows/gcp-auth-check.yml` is a manual check of this path.

Images: `us-east4-docker.pkg.dev/merit-badge-university/api/<image>:<tag>`.

## Who may apply

**`plan` runs in CI (#262). `apply` runs from a laptop, as the project owner (`roles/owner`).** Applying this configuration needs IAM-admin permissions. A CI principal with those permissions could grant itself anything, through the Workload Identity provider that the same configuration owns. No service account has permission to apply, so there is no apply credential to leak.

- `apply` uses the owner's Application Default Credentials (`gcloud auth application-default login`), from the main checkout, on trunk.
- `terraform-plan@` can read and diff, and nothing else.
- `terraform destroy` is never run against this project.
- `prevent_destroy` is on the four service accounts, the Workload Identity pool and the provider. A plan that would delete one fails.

**MBU makes these resources new.** doula-cloud imported a live project and allowed only import-only applies until the plan was empty. That rule does not apply here: the first apply reports `N to add, 0 to change, 0 to destroy`. Read the plan before you type `yes`: any `change` or `destroy` on the first apply is a mistake.

## State

State is in the GCS bucket `merit-badge-university-tfstate` in this project (`us-east4`), prefix `state`. The bucket is versioned, has uniform bucket-level access and enforced public access prevention, and is made once by hand (see the runbook). The GCS backend keeps a lock object in the same bucket.

Who can read state: the owner, through `roles/owner`, and `terraform-plan@`, through `roles/storage.objectUser` on this bucket only. State holds no secret value: Terraform owns no secret version and no Cloud SQL password, and the Scheduler jobs carry an OIDC token config, not a secret (ADR 0005).

**A stranded lock.** If a process that holds the lock is killed (a closed terminal mid-apply, a cancelled runner), the next run fails with `Error acquiring the state lock`. Confirm that the `Who:` in the error's `Lock Info` is gone, then run `terraform force-unlock <LOCK_ID>` from `terraform/`, as the owner.

## Runbook: the first apply

Run these once, in order, from the repo root on trunk, as the project owner. Each `gcloud` command names `--project merit-badge-university`, because the default gcloud project on the laptop can be a different one.

1. Make the state bucket (by hand, once):

   ```sh
   gcloud storage buckets create gs://merit-badge-university-tfstate \
     --project merit-badge-university --location us-east4 \
     --uniform-bucket-level-access --public-access-prevention
   gcloud storage buckets update gs://merit-badge-university-tfstate \
     --project merit-badge-university --versioning
   ```

2. Get Application Default Credentials for Terraform:

   ```sh
   gcloud auth application-default login
   gcloud auth application-default set-quota-project merit-badge-university
   ```

3. Init, plan and apply:

   ```sh
   cd terraform
   terraform init
   terraform plan -out=tfplan   # expect: 28 to add, 0 to change, 0 to destroy
   terraform apply tfplan
   rm tfplan
   ```

   If the apply stops on an IAM grant because a new service account is not visible yet, run `terraform apply` again. The retry adds only what is missing.

4. Check that the plan is empty:

   ```sh
   terraform plan   # expect: No changes. Your infrastructure matches the configuration.
   ```

5. Check the deploy identity from GitHub Actions. Nothing has to be set in GitHub: the provider path and the account are in the workflow file.

   ```sh
   gh workflow run gcp-auth-check.yml --ref trunk
   sleep 10   # the new run takes a few seconds to show in the list
   gh run list --workflow gcp-auth-check.yml --limit 1   # confirm it is the run you started
   gh run watch "$(gh run list --workflow gcp-auth-check.yml --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
   ```

   The run authenticates as `mbu-deploy@` and lists the `api` repository (empty until #260 pushes an image).
