provider "google" {
  project = local.project_id
  region  = local.region
}

locals {
  project_id = "merit-badge-university"
  region     = "us-east4"

  # Names the run.app URL (cloud_run.tf) and Google's service agents, such as
  # Cloud Scheduler's (iam.tf).
  project_number = "643912800060"

  # Made by hand (api/docs/infrastructure.md, "State"). versions.tf names it
  # again, because a backend block cannot read a local.
  state_bucket = "merit-badge-university-tfstate"

  # The repository whose GitHub Actions runs may federate into this project.
  github_repository = "markgoho/mbu"
}
