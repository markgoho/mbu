# The repository, never the images in it: CI pushes the images (#260),
# Terraform owns the shape (ADR 0006). `gcf-artifacts` in the same region
# belongs to Cloud Functions and is not owned here.
#
# Images: us-east4-docker.pkg.dev/merit-badge-university/api/<image>:<tag>
resource "google_artifact_registry_repository" "api" {
  project       = local.project_id
  location      = local.region
  repository_id = "api"
  format        = "DOCKER"
  description   = "mbu-api Docker images (api/)"

  depends_on = [google_project_service.enabled["artifactregistry.googleapis.com"]]
}
