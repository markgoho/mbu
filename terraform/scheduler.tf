# The Cloud Scheduler jobs that call `/api/internal/**` on `mbu-api` (#261,
# ADR 0005). Each job presents a Google-signed OIDC token for
# `internal-caller@`; no shared secret exists, so state holds none.
#
# Each job calls the run.app URL directly (`local.api_base_url`), not the
# Firebase Hosting rewrite: until cutover (#264) the rewrite sends `/api/**`
# to Cloud Functions, and the audience is the run.app URL anyway.
#
# `audience` is set explicitly on each job, and must be. Cloud Scheduler sets
# an unset audience to the full target URI, path included. The guard
# (`internalauth`) checks the token against INTERNAL_OIDC_AUDIENCE, the
# service's base URL, so a job with the default audience gets 401 on each
# tick.
#
# No `prevent_destroy`: a job holds no data. A plan that recreates one is
# safe.
#
# Every `retry_config` field is written, also where it is the API default,
# so that the plan after the apply is empty.

# The outbox drain (#257, ADR 0004): sends the pending registration mail.
# 120 s attempt deadline: the drain stops claiming at 45 s and a send has a
# 10 s timeout. The Cloud Run request timeout (300 s) is above it. No retry:
# the next tick, one minute later, is the retry. A cut-off drain sends at
# most one mail twice.
resource "google_cloud_scheduler_job" "process_outbox_drain" {
  project          = local.project_id
  region           = local.region
  name             = "process-outbox-drain"
  description      = "Drains the mail outbox on mbu-api (#257, #261). Runs every minute."
  schedule         = "* * * * *"
  time_zone        = "Etc/UTC"
  attempt_deadline = "120s"
  paused           = false

  http_target {
    http_method = "POST"
    uri         = "${local.api_base_url}/api/internal/outboxes/drain"

    oidc_token {
      audience              = local.api_base_url
      service_account_email = google_service_account.internal_caller.email
    }
  }

  retry_config {
    retry_count          = 0
    max_retry_duration   = "0s"
    min_backoff_duration = "5s"
    max_backoff_duration = "3600s"
    max_doublings        = 5
  }

  # The first tick comes within a minute of the apply. Without the grant the
  # agent cannot mint the token. The service comes first so that its URL
  # postcondition (cloud_run.tf) stops the apply before a job targets a wrong
  # URL.
  depends_on = [
    google_service_account_iam_member.scheduler_agent_mints_internal_caller,
    google_cloud_run_v2_service.api,
  ]
}

# The Retention Purge (#256): clears the registration snapshots of
# Universities that ended more than 90 days ago, and reaps expired
# idempotency keys and rate-limit buckets. Daily at 09:23 UTC. The purge is
# idempotent, so a failed attempt is retried up to 3 times (from 60 s
# backoff); otherwise a failure waits a full day. 180 s attempt deadline:
# one SQL statement and two deletes, below the 300 s Cloud Run timeout.
resource "google_cloud_scheduler_job" "retention_purge" {
  project          = local.project_id
  region           = local.region
  name             = "retention-purge"
  description      = "Runs the Retention Purge on mbu-api (#256, #261). Daily at 09:23 UTC."
  schedule         = "23 9 * * *"
  time_zone        = "Etc/UTC"
  attempt_deadline = "180s"
  paused           = false

  http_target {
    http_method = "POST"
    uri         = "${local.api_base_url}/api/internal/retention/purge"

    oidc_token {
      audience              = local.api_base_url
      service_account_email = google_service_account.internal_caller.email
    }
  }

  retry_config {
    retry_count          = 3
    max_retry_duration   = "0s"
    min_backoff_duration = "60s"
    max_backoff_duration = "3600s"
    max_doublings        = 5
  }

  depends_on = [
    google_service_account_iam_member.scheduler_agent_mints_internal_caller,
    google_cloud_run_v2_service.api,
  ]
}
