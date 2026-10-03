# The APIs the Go API stack needs (#258). Several were already on for
# Firebase and Cloud Functions; enabling an enabled API is a no-op, so the
# first apply only records them in state.
#
# `disable_on_destroy = false` on each: Firebase shares some of these APIs,
# and removing a resource from this file must never switch an API off.
locals {
  services = toset([
    "artifactregistry.googleapis.com", # the `api` image repository
    "cloudscheduler.googleapis.com",   # the internal-route jobs (#261)
    "iamcredentials.googleapis.com",   # service account impersonation (Workload Identity)
    "run.googleapis.com",              # the `mbu-api` service (#259)
    "secretmanager.googleapis.com",    # the secret shells (#259)
    "sqladmin.googleapis.com",         # Cloud SQL (#259)
    "sts.googleapis.com",              # the Workload Identity token exchange
  ])
}

resource "google_project_service" "enabled" {
  for_each = local.services

  project                    = local.project_id
  service                    = each.value
  disable_on_destroy         = false
  disable_dependent_services = false
}
