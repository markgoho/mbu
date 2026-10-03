# ADR 0006 — Terraform owns the shape, CI owns the image, `apply` stays off CI

- **Status:** Accepted
- **Date:** 2026-10-02
- **Applies to:** the Terraform configuration for `mbu-api`, and the deploy pipeline
- **Related:** #240 (decision 11), #258 (Terraform bootstrap), #259 (Cloud SQL, secrets, Cloud Run service), #260 (deploy pipeline), #262 (`terraform plan` as a required check). Source: doula-cloud ADR-0034 (`~/github/doula-cloud/docs/adr/0034-terraform-owns-the-shape-not-the-image-and-apply-stays-off-ci.md`).

## Context

The new stack has more GCP resources than `functions/` had: Cloud SQL, Secret Manager secrets, a Cloud Run service, Cloud Scheduler jobs, service accounts and an Artifact Registry repository. In doula-cloud, resources made by hand in the console drifted from the docs, and an outbox ran for days with no Scheduler job. The value of Terraform here is drift detection, not a repeatable build of the project.

## Decision

1. **Terraform owns the shape of GCP**: the Cloud Run service, Cloud SQL, secret shells, Scheduler jobs, service accounts and IAM.
2. **CI owns the image.** The deploy pipeline sets the Cloud Run image on each merge to trunk. The Terraform service resource has a `lifecycle { ignore_changes }` block over the image and the `commit-sha` label, so a deploy does not make `plan` red.
3. **`apply` runs from a laptop.** No CI principal holds permission to apply. CI gets a read-only service account.
4. **`terraform plan` is a required CI check** at the end (#262). A red plan means drift.
5. **Secret values and Cloud SQL logins stay out of Terraform.** Terraform owns secret shells and IAM on them; a person sets the secret versions and the Cloud SQL users by hand. State is plaintext, so no secret value goes in it.

## Consequences

- `plan` cannot tell anyone that the deployed image is wrong. The CI deploy and the `commit-sha` label own that.
- Only the maintainer can fix drift, from a laptop. That is acceptable while the team is one person.
- The Terraform state bucket is a new asset to protect.
- Because the internal boundary uses OIDC ([ADR 0005](0005-internal-boundary-is-a-caller-identity.md)), the Scheduler jobs carry no secret, and state holds none.
