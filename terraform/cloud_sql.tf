# The Postgres instance and database of mbu-api (#259, ADR 0002). The
# settings are those of doula-cloud's `doula-cloud-pg`: Postgres 16,
# db-f1-micro, zonal, 10 GB, 7 daily backups.
#
# Three protections, each a different mechanism:
#   - `deletion_protection`: the provider refuses to delete the instance.
#   - `settings.deletion_protection_enabled`: the GCP API refuses to
#     delete it (console, gcloud), until someone turns the flag off.
#   - `lifecycle.prevent_destroy`: Terraform refuses a plan that would
#     destroy it.
#
# No `google_sql_user` here: it writes the password to state. The logins
# `migrate_login` and `app_runtime_login` are made by hand
# (api/docs/infrastructure.md, runbook).
#
# Connection name: merit-badge-university:us-east4:mbu-pg. db-f1-micro
# allows 25 connections; main.go's maxOpenConns keeps mbu-api inside
# that budget.
resource "google_sql_database_instance" "mbu" {
  project             = local.project_id
  name                = "mbu-pg"
  region              = local.region
  database_version    = "POSTGRES_16"
  deletion_protection = true

  settings {
    # Postgres 16 defaults to Enterprise Plus, which has no db-f1-micro.
    edition                     = "ENTERPRISE"
    tier                        = "db-f1-micro"
    availability_type           = "ZONAL"
    pricing_plan                = "PER_USE"
    disk_type                   = "PD_HDD"
    disk_size                   = 10
    disk_autoresize             = false
    deletion_protection_enabled = true

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = false
      start_time                     = "08:00" # UTC: 3 or 4 a.m. in us-east4
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 7
        retention_unit   = "COUNT"
      }
    }

    # A public IP with no authorized networks: only the Cloud SQL Auth
    # Proxy and connectors (Cloud Run's /cloudsql mount) get in, because
    # every connection must present a client certificate that the
    # connectors make from IAM (roles/cloudsql.client).
    ip_configuration {
      ipv4_enabled = true
      ssl_mode     = "TRUSTED_CLIENT_CERTIFICATE_REQUIRED"
    }

    location_preference {
      zone = "${local.region}-a"
    }
  }

  lifecycle {
    prevent_destroy = true

    # Cloud SQL moves this on its own maintenance schedule.
    ignore_changes = [maintenance_version]
  }

  depends_on = [google_project_service.enabled["sqladmin.googleapis.com"]]
}

# The database the migrations and the service use. The collation the
# Roster sort needs, "und-x-icu", is an ICU collation that Postgres 16 on
# Cloud SQL has in every database (the runbook checks it).
resource "google_sql_database" "mbu" {
  project   = local.project_id
  instance  = google_sql_database_instance.mbu.name
  name      = "mbu"
  charset   = "UTF8"
  collation = "en_US.UTF8"

  lifecycle {
    prevent_destroy = true
  }
}
