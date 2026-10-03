# The Secret Manager shells of #259 and their accessor grants. A shell
# only: never a `google_secret_manager_secret_version`, because a version's
# payload is the secret and state is plaintext. A person adds each value
# with `gcloud secrets versions add` (api/docs/infrastructure.md, runbook).
#
# Each accessor grant is beside its secret, one identity on one secret. No
# identity holds `roles/secretmanager.secretAccessor` at project level.
#   - `*_runtime_accessor`: mbu-api-runtime@, which Cloud Run uses to
#     resolve a `secret_key_ref` when a container starts.
#   - `*_deploy_accessor`: mbu-deploy@, which reads the payload in a GitHub
#     Actions job (#260's migrate step).
#
# `mbu-mailgun-api-key` is not here yet: until #106 makes the Mailgun
# sending key, the service has no MAILGUN_API_KEY and uses the fake sender
# (#257). #106 adds the shell, its runtime accessor and the env reference
# in cloud_run.tf. A secret with no version would stop each new revision.
#
# Both protections are on each shell: `deletion_protection` (the provider
# refuses to delete it) and `lifecycle.prevent_destroy` (Terraform refuses
# a plan that would). Replication is user-managed in us-east4, the region
# of the instance the DSN names.

# DATABASE_URL of mbu-api: app_runtime_login, a member of app_runtime,
# through the /cloudsql socket of the Cloud Run service.
resource "google_secret_manager_secret" "pg_app_runtime_dsn" {
  project             = local.project_id
  secret_id           = "mbu-pg-app-runtime-dsn"
  deletion_protection = true

  replication {
    user_managed {
      replicas {
        location = local.region
      }
    }
  }

  lifecycle {
    prevent_destroy = true
  }

  depends_on = [google_project_service.enabled["secretmanager.googleapis.com"]]
}

resource "google_secret_manager_secret_iam_member" "pg_app_runtime_dsn_runtime_accessor" {
  project   = google_secret_manager_secret.pg_app_runtime_dsn.project
  secret_id = google_secret_manager_secret.pg_app_runtime_dsn.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = google_service_account.api_runtime.member
}

# The DSN of migrate_login, the migration owner, through the Cloud SQL
# Auth Proxy on 127.0.0.1:5432. The container never reads it: only the
# deploy pipeline's migrate step (#260).
resource "google_secret_manager_secret" "pg_migrate_dsn" {
  project             = local.project_id
  secret_id           = "mbu-pg-migrate-dsn"
  deletion_protection = true

  replication {
    user_managed {
      replicas {
        location = local.region
      }
    }
  }

  lifecycle {
    prevent_destroy = true
  }

  depends_on = [google_project_service.enabled["secretmanager.googleapis.com"]]
}

resource "google_secret_manager_secret_iam_member" "pg_migrate_dsn_deploy_accessor" {
  project   = google_secret_manager_secret.pg_migrate_dsn.project
  secret_id = google_secret_manager_secret.pg_migrate_dsn.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = google_service_account.deploy.member
}
