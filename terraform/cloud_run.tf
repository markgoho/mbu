# The `mbu-api` Cloud Run service (#259, ADR 0001, ADR 0006). Terraform
# owns its shape; the deploy pipeline (#260) owns the image.

locals {
  # The service's own base URL, written once. A new service's URL is not
  # known before it exists, so this is the deterministic form
  # https://<service>-<project number>.<region>.run.app. The postcondition
  # on the service fails the apply if Cloud Run did not give this URL.
  #
  # Three values must agree on it: INTERNAL_OIDC_AUDIENCE below and the
  # `oidc_token.audience` of each Cloud Scheduler job (#261). Set the jobs'
  # audience explicitly: Scheduler's default is the full target URL, path
  # included, which the guard refuses (ADR 0005).
  api_base_url = "https://mbu-api-${local.project_number}.${local.region}.run.app"

  # The Cloud SQL socket mount of the service. DATABASE_URL names
  # host=/cloudsql/<connection name> (api/docs/infrastructure.md).
  cloudsql_mount = "/cloudsql"
}

resource "google_cloud_run_v2_service" "api" {
  project             = local.project_id
  name                = "mbu-api"
  location            = local.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = true

  template {
    # mbu-api-runtime@ and only its grants (iam.tf, secrets.tf). The
    # deploy passes the same --service-account (#260).
    service_account                  = google_service_account.api_runtime.email
    max_instance_request_concurrency = 80
    # Above the 120 s attempt deadline of the outbox drain job (#261).
    timeout = "300s"

    # At most 2 instances: main.go's maxOpenConns budget for db-f1-micro
    # counts on it. Raise the two together.
    scaling {
      min_instance_count = 0
      max_instance_count = 2
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.mbu.connection_name]
      }
    }

    containers {
      # A public placeholder for the first apply. The deploy pipeline
      # (#260) sets the real image; ignore_changes below keeps Terraform
      # from putting the placeholder back.
      image = "us-docker.pkg.dev/cloudrun/container/hello"

      ports {
        name           = "http1"
        container_port = 8080
      }

      resources {
        cpu_idle          = true
        startup_cpu_boost = true
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
      }

      # /api/health sends no query, so a database that is down does not
      # stop a revision. The placeholder answers every path.
      startup_probe {
        initial_delay_seconds = 0
        period_seconds        = 5
        timeout_seconds       = 3
        failure_threshold     = 12
        http_get {
          path = "/api/health"
          port = 8080
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = local.cloudsql_mount
      }

      # api/docs/environment.md, "Deployed" column, is the list. Not set on
      # purpose: INTERNAL_WORKER_SECRET (ADR 0005: unset refuses the
      # X-Internal-Secret header), MAILGUN_API_BASE (the US host is the
      # default), and MAILGUN_API_KEY until #106 (the fake sender, #257).
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.pg_app_runtime_dsn.secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = local.project_id
      }
      # The Firebase Hosting rewrite is the one proxy in front of Cloud
      # Run's front end (internal/clientip). #296 checks it on a deployed
      # request.
      env {
        name  = "CLIENT_IP_PROXY_HOPS"
        value = "1"
      }
      env {
        name  = "INTERNAL_OIDC_AUDIENCE"
        value = local.api_base_url
      }
      env {
        name  = "INTERNAL_OIDC_CALLERS"
        value = google_service_account.internal_caller.email
      }
      env {
        name  = "MAILGUN_DOMAIN"
        value = "mg.merit-badge.university"
      }
    }
  }

  lifecycle {
    prevent_destroy = true

    # The split between Terraform (the shape) and the deploy pipeline (the
    # image), as doula-cloud's "The Cloud Run image conflict": the image
    # and the revision's commit-sha label are what each deploy writes;
    # client and client_version record the tool that wrote last. The deploy
    # also copies the provider's goog-terraform-provisioned label onto the
    # revision template; the first deploy showed it as drift.
    ignore_changes = [
      client,
      client_version,
      template[0].containers[0].image,
      template[0].labels["commit-sha"],
      template[0].labels["goog-terraform-provisioned"],
    ]

    postcondition {
      condition     = contains(self.urls, local.api_base_url)
      error_message = "mbu-api does not serve local.api_base_url. Set the local to one of the service's urls, so INTERNAL_OIDC_AUDIENCE and the Scheduler audience (#261) match."
    }
  }

  depends_on = [
    google_project_service.enabled["run.googleapis.com"],
    # A revision whose identity cannot read DATABASE_URL or reach Cloud SQL
    # does not start.
    google_secret_manager_secret_iam_member.pg_app_runtime_dsn_runtime_accessor,
    google_project_iam_member.api_runtime_cloudsql_client,
  ]
}

# `allUsers` -> `roles/run.invoker`. The Firebase Hosting rewrite forwards
# anonymous requests, so the service must be public. Authentication is in
# the process: a Firebase ID token on each authenticated route, and the
# OIDC caller guard on /api/internal/** (ADR 0005). mbu-deploy@ has no
# setIamPolicy, so only this resource decides who may invoke the service.
resource "google_cloud_run_v2_service_iam_member" "api_public_invoker" {
  project  = google_cloud_run_v2_service.api.project
  location = google_cloud_run_v2_service.api.location
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
