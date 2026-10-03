provider "google" {
  project = local.project_id
  region  = local.region
}

locals {
  project_id = "merit-badge-university"
  region     = "us-east4"

  # Made by hand (api/docs/infrastructure.md, "State"). versions.tf names it
  # again, because a backend block cannot read a local.
  state_bucket = "merit-badge-university-tfstate"

  # The repository whose GitHub Actions runs may federate into this project.
  github_repository = "markgoho/mbu"
}
