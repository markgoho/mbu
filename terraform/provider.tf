provider "google" {
  project = local.project_id
  region  = local.region
}

locals {
  project_id = "merit-badge-university"
  region     = "us-east4"

  # The repository whose GitHub Actions runs may federate into this project.
  github_repository = "markgoho/mbu"
}
