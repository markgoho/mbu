# Workload Identity Federation for GitHub Actions (#258). A workflow in
# markgoho/mbu exchanges its GitHub OIDC token for a short-lived credential
# of `mbu-deploy@` or `terraform-plan@`. No JSON key exists for either.
#
# Provider path for google-github-actions/auth:
#   projects/643912800060/locations/global/workloadIdentityPools/github-actions/providers/github

resource "google_iam_workload_identity_pool" "github_actions" {
  project                   = local.project_id
  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions"

  lifecycle {
    prevent_destroy = true
  }
}

# `attribute_condition` is the one string that stops another GitHub
# repository from minting credentials in this project. Review a change to it
# as a change to who may deploy.
resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = local.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_actions.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "GitHub OIDC"
  attribute_condition                = "assertion.repository == '${local.github_repository}'"
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# The pool's `name` carries the project number, the only form the token
# exchange matches. Both bindings below name this one string.
locals {
  github_repository_principal_set = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_actions.name}/attribute.repository/${local.github_repository}"
}

resource "google_service_account_iam_member" "deploy_workload_identity_user" {
  service_account_id = google_service_account.deploy.name
  role               = "roles/iam.workloadIdentityUser"
  member             = local.github_repository_principal_set
}

resource "google_service_account_iam_member" "terraform_plan_workload_identity_user" {
  service_account_id = google_service_account.terraform_plan.name
  role               = "roles/iam.workloadIdentityUser"
  member             = local.github_repository_principal_set
}
