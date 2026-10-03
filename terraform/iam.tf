# The service accounts the Go API stack needs, each with only the grants
# named in #258. Per-secret grants are written in #259, beside the secrets.
# `grep -rn <account> terraform/` is the inventory of what an account holds.
#
# `google_project_iam_policy` and `google_project_iam_binding` never appear
# here: both are authoritative and would remove the bindings that Firebase
# and Google's service agents hold. `google_project_iam_member` owns one
# principal-role pair and leaves every other pair alone.

# ---------------------------------------------------------------------------
# mbu-api-runtime@: the identity the `mbu-api` container runs as (#259).
# ---------------------------------------------------------------------------
resource "google_service_account" "api_runtime" {
  project      = local.project_id
  account_id   = "mbu-api-runtime"
  display_name = "mbu-api runtime"
  description  = "The identity the mbu-api Cloud Run service runs as (#258). Holds only what api/ calls."

  lifecycle {
    prevent_destroy = true
  }
}

# Cloud SQL has no instance-level IAM, so this grant is project-wide. It
# carries `cloudsql.instances.connect` and nothing that changes an instance.
resource "google_project_iam_member" "api_runtime_cloudsql_client" {
  project = local.project_id
  role    = "roles/cloudsql.client"
  member  = google_service_account.api_runtime.member
}

# Firebase Auth has no resource-level IAM, so the only way to narrow a grant
# is to narrow the permissions. `roles/firebaseauth.admin` also carries
# `firebaseauth.configs.*` (sign-in providers, authorized domains), which the
# container must not change. ID-token verification needs no permission: it
# reads Google's public certificates. The container calls `DeleteUser`
# today (account deletion); #258 grants read and update too, for the account
# flows that come after cutover. A new Admin SDK call in api/ that needs a
# permission outside these three adds it here.
resource "google_project_iam_custom_role" "api_firebase_auth_users" {
  project     = local.project_id
  role_id     = "mbuApiFirebaseAuthUsers"
  title       = "mbu-api Firebase Auth users"
  description = "What mbu-api does to Firebase Auth accounts: read, update, delete. Never the Firebase Auth configuration (#258)."
  stage       = "GA"
  permissions = [
    "firebaseauth.users.delete",
    "firebaseauth.users.get",
    "firebaseauth.users.update",
  ]
}

resource "google_project_iam_member" "api_runtime_firebase_auth_users" {
  project = local.project_id
  role    = google_project_iam_custom_role.api_firebase_auth_users.id
  member  = google_service_account.api_runtime.member
}

# ---------------------------------------------------------------------------
# mbu-deploy@: the identity GitHub Actions deploys as (#260), through the
# Workload Identity pool in workload_identity.tf. No JSON key exists for it.
# ---------------------------------------------------------------------------
resource "google_service_account" "deploy" {
  project      = local.project_id
  account_id   = "mbu-deploy"
  display_name = "mbu deploy (GitHub Actions)"
  description  = "The identity GitHub Actions in markgoho/mbu deploys mbu-api as, through Workload Identity (#258). No JSON key."

  lifecycle {
    prevent_destroy = true
  }
}

# Push images to the `api` repository, and to no other repository.
resource "google_artifact_registry_repository_iam_member" "deploy_api_writer" {
  project    = google_artifact_registry_repository.api.project
  location   = google_artifact_registry_repository.api.location
  repository = google_artifact_registry_repository.api.name
  role       = "roles/artifactregistry.writer"
  member     = google_service_account.deploy.member
}

# Deploy new revisions of `mbu-api`. Project level because the service is
# made in #259; `roles/run.developer` carries no `run.services.setIamPolicy`,
# so a deploy cannot change who may invoke the service.
resource "google_project_iam_member" "deploy_run_developer" {
  project = local.project_id
  role    = "roles/run.developer"
  member  = google_service_account.deploy.member
}

# The migrate step (#260) connects through the Cloud SQL connector.
resource "google_project_iam_member" "deploy_cloudsql_client" {
  project = local.project_id
  role    = "roles/cloudsql.client"
  member  = google_service_account.deploy.member
}

# Cloud Run refuses a deploy whose caller cannot act as the runtime identity
# the revision names.
resource "google_service_account_iam_member" "deploy_acts_as_api_runtime" {
  service_account_id = google_service_account.api_runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = google_service_account.deploy.member
}

# ---------------------------------------------------------------------------
# terraform-plan@: the read-only identity of the drift check (#262). No
# principal in CI can apply (ADR 0006). The roles are the doula-cloud set
# (docs/infrastructure.md, "Who may apply").
# ---------------------------------------------------------------------------
resource "google_service_account" "terraform_plan" {
  project      = local.project_id
  account_id   = "terraform-plan"
  display_name = "Terraform plan (read-only)"
  description  = "The read-only identity the terraform plan drift check runs as (#258, #262). Never applies."

  lifecycle {
    prevent_destroy = true
  }
}

# Reads most resources and the project IAM policy.
resource "google_project_iam_member" "terraform_plan_viewer" {
  project = local.project_id
  role    = "roles/viewer"
  member  = google_service_account.terraform_plan.member
}

# The `getIamPolicy` calls that `roles/viewer` does not carry (Artifact
# Registry repositories, service accounts, buckets) and custom roles.
resource "google_project_iam_member" "terraform_plan_security_reviewer" {
  project = local.project_id
  role    = "roles/iam.securityReviewer"
  member  = google_service_account.terraform_plan.member
}

# `roles/viewer` carries no `iam.workloadIdentityPools.get`.
resource "google_project_iam_member" "terraform_plan_workload_identity_pool_viewer" {
  project = local.project_id
  role    = "roles/iam.workloadIdentityPoolViewer"
  member  = google_service_account.terraform_plan.member
}

# The GCS backend reads state and writes its lock object. The grant is owned
# here although the bucket is not: a member resource cannot delete a bucket,
# and owning it lets the drift check notice its loss.
resource "google_storage_bucket_iam_member" "terraform_plan_state" {
  bucket = local.state_bucket
  role   = "roles/storage.objectUser"
  member = google_service_account.terraform_plan.member
}

# ---------------------------------------------------------------------------
# internal-caller@: the identity Cloud Scheduler presents at
# `/api/internal/**` (#261, ADR 0005). No project role: the boundary is the
# token's `email` claim, checked against INTERNAL_OIDC_CALLERS in the
# process. Cloud Scheduler's service agent mints the token.
# ---------------------------------------------------------------------------
resource "google_service_account" "internal_caller" {
  project      = local.project_id
  account_id   = "internal-caller"
  display_name = "Internal caller"
  description  = "The identity Cloud Scheduler presents at /api/internal/** (#258, #261, ADR 0005). No project role."

  lifecycle {
    prevent_destroy = true
  }
}
