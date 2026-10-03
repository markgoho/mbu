# The Terraform for the `merit-badge-university` GCP project (#258, ADR 0006).
# `apply` runs from the owner's laptop only. api/docs/infrastructure.md has
# the boundary and the runbook.
terraform {
  required_version = "~> 1.16"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }

  # The state bucket is made by hand before the first `init` (see
  # api/docs/infrastructure.md, "State"). Terraform does not own it.
  backend "gcs" {
    bucket = "merit-badge-university-tfstate"
    prefix = "state"
  }
}
