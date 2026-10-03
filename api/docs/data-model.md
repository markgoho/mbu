# Postgres data model

The mapping from the Firestore model in `functions/src/collections/` to the Postgres schema of `api/`. #243 wrote it; #244 turns it into goose migrations. Firestore holds only test data, so there is no data migration. The decisions behind it are [ADR 0002](adr/0002-postgres-on-cloud-sql.md) and #240. "Rule 1" to "rule 12" are the conversion rules in the body of issue #243.

Use the terms in [`../CONTEXT.md`](../CONTEXT.md). The DDL blocks below are the target shape, not the migration files: #244 adds the `GRANT`s to `app_runtime`, the goose markers and the row-safety notes.

## Contents

1. [Conventions](#conventions)
2. [Tables](#tables)
3. [Denormalized fields: join or point-in-time record](#denormalized-fields-join-or-point-in-time-record)
4. [Dropped fields](#dropped-fields)
5. [The seat transaction and its lock strategy](#the-seat-transaction-and-its-lock-strategy)
6. [Delete and purge behavior](#delete-and-purge-behavior)
7. [Firestore indexes and the queries that replace them](#firestore-indexes-and-the-queries-that-replace-them)
8. [`emailLog` and the mail outbox](#emaillog-and-the-mail-outbox)
9. [Effects on the JSON contract](#effects-on-the-json-contract)

## Conventions

- **Postgres 16.** doula-cloud pins 16 in its `testdb` image and its Cloud SQL `database_version`. #244 and #259 pin the same version. Two constraints below use `NULLS NOT DISTINCT`, which needs Postgres 15 or later.
- **Primary keys.** `users.uid` is the Firebase Auth uid (`text`). `universities.id` is `text`, because the app makes it (see the table). Each other entity table has a `uuid` key that the server makes (`gen_random_uuid()` as the column default). A join table that holds an invariant has a composite primary key (`registrations`, `class_periods`, `class_counselors`). The API sends each id as a JSON string.
- **Ids checked one by one (rule 7).**

  | Id | Who makes it today | Column |
  | --- | --- | --- |
  | `users.uid` | Firebase Auth | `text` |
  | University id | The app: `crypto.randomUUID()` in `app/src/routes/(authed)/(verified)/(app)/universities/new/+page.svelte`. The API refuses a value that is not UUID-shaped (`UniversityCreateRequestSchema`). | `text` |
  | `periodId` | The server: `mintPeriodId()` in `services/validation.ts`. The request field is optional and an unknown id is refused. The app's `crypto.randomUUID()` in `PeriodBoard.svelte` is only a list key and is not sent. | `uuid` |
  | `classId` | The server: Firestore `.doc()` in `services/classes/index.ts`. | `uuid` |
  | `scoutId` | The server: Firestore `.doc()` in `users-api/services/scouts/index.ts`. | `uuid` |
  | Registration | Has no id of its own. The document id was the `scoutId`. | composite key `(class_id, scout_id)` |
  | Role Grant | The server: `roleGrantId()`. No route sends it in JSON. | `uuid` |

- **Timestamps** are `timestamptz`. Each table has `created_at timestamptz NOT NULL DEFAULT now()` and `updated_at timestamptz NOT NULL DEFAULT now()`. There is no trigger: each `UPDATE` statement sets `updated_at = now()`. A domain time (`waitlisted_at`, `enrolled_at`, `parent_consent_at`, `submitted_at`, `purged_at` and the others) comes from the clock seam (`clock.Now(ctx)`, #240 decision 9) and goes in as a parameter. `now()` is the start time of the transaction, so two rows that one transaction writes have the same `created_at`; each list that orders by `created_at` adds `id` as the tie-break.
- **String unions** are `text` with a named `CHECK` constraint, not a Postgres enum type (rule 5). doula-cloud uses `CREATE TYPE … AS ENUM`; MBU does not copy that.
- **Constraint names** follow `<table>_<what>_check`, `<table>_<what>_fkey`, `<table>_<what>_key` and `<table>_<what>_idx`, where `<what>` is the leading column or the purpose, so that `internal/pgerr` and the schema test in #244 can name them.
- **Foreign keys** state their delete behavior on each column. The section [Delete and purge behavior](#delete-and-purge-behavior) says which cascades the database does and which the code does.
- **Isolation level** is `READ COMMITTED` (the Postgres default) with explicit row locks. No transaction uses `REPEATABLE READ` or `SERIALIZABLE`, so no handler needs a retry loop for serialization failures.
- **Badge Catalog** is not a table. #248 embeds it in the Go binary. `classes.badge_slug` therefore has no foreign key; the API checks the slug against the catalog when it writes a Class.

## Tables

Eleven tables. The tree of ownership is: `users` → `scouts`, `idempotency_keys`; `universities` → `periods`, `classes`, `role_grants`; `classes` → `class_periods`, `class_counselors`, `registrations`. `rate_limit_buckets` belongs to nothing. `idempotency_keys` and `rate_limit_buckets` come from #247 (they are not domain tables, see [their section](#idempotency_keys-and-rate_limit_buckets)), and `registration_mail_outbox` comes from #257.

### `users`

Source: `UserDocument` (`users/{uid}`). One row for each adult account. "Parent" is not a stored role: a Parent is the `parent_uid` of a Scout.

```sql
CREATE TABLE users (
    uid                     text PRIMARY KEY,
    display_name            text NOT NULL DEFAULT '',
    email                   text NOT NULL,
    phone                   text,
    accepted_terms_at       timestamptz,
    accepted_privacy_at     timestamptz,
    accepted_policy_version text,
    roster_export_ack_at    timestamptz,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);
```

| Firestore field | Column | Note |
| --- | --- | --- |
| document id | `uid` | Firebase Auth uid. |
| `displayName` | `display_name` | `''` until onboarding, as in `bootstrap`. |
| `email` | `email` | A copy of the Firebase Auth email. Auth is the authority; `bootstrap` writes it again on each session. No unique constraint: a stale copy must not block a sign-in when two accounts swap an address. |
| `phone` | `phone` | No code writes it, but `UserResponse` sends it. It stays as a nullable column so the JSON contract does not change. |
| `counselorProfile` | — | Dropped. See [Dropped fields](#dropped-fields). |
| `acceptedTermsAt`, `acceptedPrivacyAt`, `acceptedPolicyVersion` | same names, snake case | Onboarding consent. |
| `rosterExportAckAt` | `roster_export_ack_at` | The first-export click-through. |
| `createdAt`, `updatedAt` | `created_at`, `updated_at` | |

Indexes: the primary key only.

### `scouts`

Source: `ScoutDocument` (`users/{uid}/scouts/{scoutId}`). The subcollection becomes a table with a foreign key to its Parent (rule 1).

```sql
CREATE TABLE scouts (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_uid     text NOT NULL REFERENCES users (uid) ON DELETE CASCADE,
    first_name     text NOT NULL,
    last_name      text NOT NULL,
    unit           text,
    council        text,
    district       text,
    age_band       text CONSTRAINT scouts_age_band_check
                        CHECK (age_band IN ('10-11', '12-13', '14-15', '16-17')),
    bsa_id         text,
    accommodations text,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scouts_parent_uid_created_at_idx ON scouts (parent_uid, created_at, id);
```

Each field maps one to one, in snake case. The parent path segment `{uid}` becomes `parent_uid`. The index serves the Parent's list (`ORDER BY created_at, id`), the ownership check (`WHERE id = $1 AND parent_uid = $2`) and the Schedule join.

### `universities`

Source: `UniversityDocument` (`universities/{id}`). `location` is small, fixed and never queried, so it becomes five columns. `billing` stays as nullable columns (rule 12). `periods` becomes its own table (rule 1).

```sql
CREATE TABLE universities (
    id                         text PRIMARY KEY
        CONSTRAINT universities_id_check
        CHECK (id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'),
    title                      text NOT NULL,
    status                     text NOT NULL DEFAULT 'draft'
        CONSTRAINT universities_status_check
        CHECK (status IN ('draft', 'submitted', 'needs_review', 'published', 'closed', 'rejected')),
    timezone                   text NOT NULL,
    start_date                 timestamptz NOT NULL,
    end_date                   timestamptz,
    registration_opens_at      timestamptz,
    registration_closes_at     timestamptz NOT NULL,
    location_name              text NOT NULL,
    location_address           text NOT NULL,
    location_city              text NOT NULL,
    location_state             text NOT NULL,
    location_zip               text NOT NULL,
    created_by_uid             text NOT NULL,
    -- Moderation audit (rule 11). Each pair holds the latest move of its kind.
    submitted_at               timestamptz,
    submitted_by_uid           text,
    reviewed_at                timestamptz,
    reviewed_by_uid            text,
    published_at               timestamptz,
    review_note                text,
    closed_at                  timestamptz,
    closed_by_uid              text,
    -- Billing: money-ready, off in v1 (rule 12). All NULL means "no billing record".
    billing_status             text
        CONSTRAINT universities_billing_status_check
        CHECK (billing_status IN ('not_required', 'pending', 'paid', 'waived')),
    billing_amount_cents       integer
        CONSTRAINT universities_billing_amount_cents_check CHECK (billing_amount_cents >= 0),
    stripe_checkout_session_id text,
    stripe_payment_intent_id   text,
    billing_paid_at            timestamptz,
    created_at                 timestamptz NOT NULL DEFAULT now(),
    updated_at                 timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT universities_end_date_check
        CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT universities_registration_window_check
        CHECK (registration_opens_at IS NULL OR registration_opens_at < registration_closes_at),
    CONSTRAINT universities_submitted_check
        CHECK (status <> 'submitted' OR submitted_at IS NOT NULL),
    CONSTRAINT universities_published_check
        CHECK (status NOT IN ('published', 'closed') OR published_at IS NOT NULL),
    CONSTRAINT universities_rejected_check
        CHECK (status <> 'rejected' OR review_note IS NOT NULL),
    CONSTRAINT universities_closed_check
        CHECK (status <> 'closed' OR closed_at IS NOT NULL),
    CONSTRAINT universities_billing_check
        CHECK (billing_status IS NOT NULL OR (billing_amount_cents IS NULL
            AND stripe_checkout_session_id IS NULL AND stripe_payment_intent_id IS NULL
            AND billing_paid_at IS NULL))
);
CREATE INDEX universities_review_queue_idx ON universities (submitted_at, id) WHERE status = 'submitted';
```

| Firestore field | Column | Note |
| --- | --- | --- |
| document id | `id` | `text`, because the app makes it. The `CHECK` repeats the request pattern, so a bad id cannot get in by another path. |
| `title`, `status`, `timezone` | same names | `status` is the University Status state machine. #253 owns the moves. |
| `startDate`, `endDate` | `start_date`, `end_date` | Absolute times. `end_date` is set only for a multi-day University. |
| `registrationOpensAt`, `registrationClosesAt` | same names, snake case | The Registration Window. |
| `location.{name,address,city,state,zip}` | `location_name` … `location_zip` | Flattened. The API builds the `location` object again. |
| `periods[]` | table `periods` | Rule 1. |
| `createdByUid` | `created_by_uid` | No foreign key: the account can be deleted while its draft or closed University stays (see [Delete and purge behavior](#delete-and-purge-behavior)). |
| `submittedAt` | `submitted_at` | Set by submit, also on a resubmit after a reject. |
| `publishedAt` | `published_at` | Set by approve. |
| `reviewNote` | `review_note` | Set by reject; set to `NULL` by submit and approve, as today. |
| — | `submitted_by_uid`, `reviewed_at`, `reviewed_by_uid`, `closed_at`, `closed_by_uid` | New audit columns (rule 11). Approve and reject both set `reviewed_at` and `reviewed_by_uid`. No foreign key, for the same reason as `created_by_uid`: an audit record outlives the account. #253 writes them. |
| `billing.status`, `.amountCents`, `.stripeCheckoutSessionId`, `.stripePaymentIntentId`, `.paidAt` | `billing_status`, `billing_amount_cents`, `stripe_checkout_session_id`, `stripe_payment_intent_id`, `billing_paid_at` | All `NULL` in v1, where Firestore stored `billing: null`. |
| `createdAt`, `updatedAt` | `created_at`, `updated_at` | |

The status checks hold only the facts that the code already guarantees: each status has the time of the move that reached it. They do not require the `*_by_uid` columns, so a test fixture can insert a University in any status with the timestamps alone. A move that leaves a status does not clear the earlier audit pair, so the history of the latest submit, review and close stays readable. A full history of each move is not in v1; it would need a table with one row for each status move.

### `periods`

Source: `Period` in `UniversityDocument.periods[]`. The embedded array becomes a table (rule 1), because `class_periods` must point at one Period with a foreign key.

```sql
CREATE TABLE periods (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id text NOT NULL REFERENCES universities (id) ON DELETE CASCADE,
    label         text NOT NULL CONSTRAINT periods_label_check CHECK (label <> ''),
    starts_at     timestamptz NOT NULL,
    ends_at       timestamptz NOT NULL,
    position      integer NOT NULL CONSTRAINT periods_position_check CHECK (position >= 0),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT periods_time_order_check CHECK (starts_at < ends_at),
    CONSTRAINT periods_university_id_id_key UNIQUE (university_id, id)
);
CREATE INDEX periods_university_id_position_idx ON periods (university_id, position, id);
```

| Firestore field | Column | Note |
| --- | --- | --- |
| `periodId` | `id` | The server makes it (rule 7, checked). |
| — | `university_id` | The parent document. |
| `label`, `startsAt`, `endsAt` | `label`, `starts_at`, `ends_at` | |
| array index | `position` | Firestore kept the request order of the array. `PUT /periods` writes `position` = the index in the request, and each read orders by `position, id`. No unique constraint on `position`, so a reorder needs no deferred constraint. |

`UNIQUE (university_id, id)` is the target of the composite foreign key in `class_periods`, which keeps a Class from using a Period of another University.

### `classes`

Source: `ClassDocument` (`universities/{id}/classes/{classId}`).

```sql
CREATE TABLE classes (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id  text NOT NULL REFERENCES universities (id) ON DELETE CASCADE,
    badge_slug     text NOT NULL,
    badge_title    text NOT NULL,
    eagle_required boolean NOT NULL,
    capacity       integer NOT NULL CONSTRAINT classes_capacity_check CHECK (capacity > 0),
    room           text,
    notes          text,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT classes_university_id_id_key UNIQUE (university_id, id)
);
CREATE INDEX classes_university_id_created_at_idx ON classes (university_id, created_at, id);
```

| Firestore field | Column | Note |
| --- | --- | --- |
| document id | `id` | The server makes it. |
| — | `university_id` | The parent document. |
| `badgeSlug` | `badge_slug` | Links to the Badge Catalog. No foreign key (the catalog is not a table). No unique constraint: a popular badge can have more than one Class. |
| `badgeTitle`, `eagleRequired` | `badge_title`, `eagle_required` | Point-in-time record. See [Denormalized fields](#denormalized-fields-join-or-point-in-time-record). |
| `periodIds[]` | table `class_periods` | Rule 1: the conflict check queries it. |
| `capacity` | `capacity` | The request allows 1 to 200; the column refuses 0 and below. The upper limit stays in Go. |
| `enrolledCount`, `waitlistCount` | — | Dropped: derived with `COUNT` (rule 4). |
| `room`, `notes` | `room`, `notes` | |
| `counselors[]` | table `class_counselors` | Rule 1. |
| `createdAt`, `updatedAt` | `created_at`, `updated_at` | |

`UNIQUE (university_id, id)` is the target of the composite foreign keys in `class_periods` and `role_grants`. The index serves the list of Classes of one University (`ORDER BY created_at, id`, as the public read and the detail read order today), the roster and the purge.

### `class_periods`

Source: `ClassDocument.periodIds[]`. A multi-period Class has more than one row.

```sql
CREATE TABLE class_periods (
    class_id      uuid NOT NULL,
    period_id     uuid NOT NULL,
    university_id text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (class_id, period_id),
    CONSTRAINT class_periods_class_fkey FOREIGN KEY (university_id, class_id)
        REFERENCES classes (university_id, id) ON DELETE CASCADE,
    CONSTRAINT class_periods_period_fkey FOREIGN KEY (university_id, period_id)
        REFERENCES periods (university_id, id) ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX class_periods_period_id_idx ON class_periods (period_id);
```

- `university_id` exists only so that both foreign keys can be composite: the database refuses a Class that uses a Period of another University. `validatePeriodIds` checks the same in Go and gives the 400.
- The Period foreign key is `NO ACTION DEFERRABLE INITIALLY DEFERRED`, so Postgres checks it at commit. One `DELETE FROM universities` cascades to `periods` and to `classes` (and from there to `class_periods`). Postgres runs those cascades in the order the constraints were made, and a check at the end of the statement can run before `class_periods` is empty: a test on Postgres 16 with plain `NO ACTION` refused the University delete. At commit, the cascade is complete. For a `PUT /periods` that removes a Period still in use, the Go check answers 409 with the list of Classes first; the foreign key is the backstop and fails the commit.
- `class_periods_period_id_idx` serves that check (`WHERE period_id = ANY($1)`) and the foreign-key check on a Period delete.
- The `periodIds` array in JSON is read with `ORDER BY periods.position, periods.id`. See [Effects on the JSON contract](#effects-on-the-json-contract).

### `class_counselors`

Source: `ClassCounselor` in `ClassDocument.counselors[]`. The embedded array becomes a table (rule 1). Each row is a Counselor's attestation for one Class: the self-attested BSA member ID and the accepted Disclaimer. It is not an authorization record: `role_grants` alone authorizes.

```sql
CREATE TABLE class_counselors (
    class_id               uuid NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    uid                    text NOT NULL REFERENCES users (uid) ON DELETE CASCADE,
    bsa_id                 text NOT NULL,
    disclaimer_accepted_at timestamptz NOT NULL,
    disclaimer_version     text NOT NULL,
    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (class_id, uid)
);
CREATE INDEX class_counselors_uid_idx ON class_counselors (uid);
```

| Firestore field | Column | Note |
| --- | --- | --- |
| `uid` | `uid` | |
| `displayName` | — | Dropped: a join to `users.display_name`. |
| `bsaId` | `bsa_id` | Point-in-time attestation for this Class. No `CHECK (bsa_id <> '')`: the TypeScript checks the length before `.trim()`, so it can store `''`. |
| `disclaimerAcceptedAt`, `disclaimerVersion` | `disclaimer_accepted_at`, `disclaimer_version` | Point-in-time acceptance. |

The JSON `counselors` array is read with `ORDER BY class_counselors.created_at, class_counselors.uid`. `class_counselors_uid_idx` serves the cascade from `users`.

### `role_grants`

Source: `RoleGrantDocument` (`roleGrants/{scopeId}:{role}:{uidOrEmail}`). The polymorphic `scopeType` and `scopeId` become two typed foreign keys: `university_id` (always set) and `class_id` (set only for a `counselor` grant). The code makes only two kinds of grant: `chancellor` on a University and `counselor` on a Class. The `CHECK` holds that.

```sql
CREATE TABLE role_grants (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role          text NOT NULL
        CONSTRAINT role_grants_role_check CHECK (role IN ('chancellor', 'counselor')),
    university_id text NOT NULL REFERENCES universities (id) ON DELETE CASCADE,
    class_id      uuid,
    uid           text REFERENCES users (uid) ON DELETE CASCADE,
    invited_email text
        CONSTRAINT role_grants_invited_email_check CHECK (invited_email = lower(invited_email)),
    status        text NOT NULL
        CONSTRAINT role_grants_status_check CHECK (status IN ('invited', 'active', 'revoked')),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT role_grants_class_fkey FOREIGN KEY (university_id, class_id)
        REFERENCES classes (university_id, id) ON DELETE CASCADE,
    CONSTRAINT role_grants_scope_check CHECK ((role = 'chancellor') = (class_id IS NULL)),
    CONSTRAINT role_grants_grantee_check CHECK (uid IS NOT NULL OR invited_email IS NOT NULL),
    CONSTRAINT role_grants_invited_check CHECK (status <> 'invited' OR uid IS NULL),
    CONSTRAINT role_grants_active_check CHECK (status <> 'active' OR uid IS NOT NULL)
);
CREATE UNIQUE INDEX role_grants_uid_key
    ON role_grants (university_id, class_id, role, uid) NULLS NOT DISTINCT
    WHERE uid IS NOT NULL;
CREATE UNIQUE INDEX role_grants_invited_email_key
    ON role_grants (university_id, class_id, role, invited_email) NULLS NOT DISTINCT
    WHERE invited_email IS NOT NULL;
CREATE INDEX role_grants_uid_status_idx ON role_grants (uid, status, role);
CREATE INDEX role_grants_class_id_idx ON role_grants (class_id) WHERE class_id IS NOT NULL;
CREATE INDEX role_grants_pending_invite_idx ON role_grants (invited_email) WHERE status = 'invited';
```

| Firestore field | Column | Note |
| --- | --- | --- |
| document id `{scopeId}:{role}:{uidOrEmail}` | `id` (uuid) and the two unique indexes | Rule 2. See below. |
| `role`, `status` | `role`, `status` | |
| `scopeType` | — | Dropped: it is `class_id IS NOT NULL`. |
| `scopeId` | `class_id` for a Class grant, `university_id` for a University grant | Typed foreign keys in place of one untyped string. |
| `universityId` | `university_id` | |
| `uid` | `uid` | `NULL` while the invite is outstanding. |
| `invitedEmail` | `invited_email` | Stored in lower case. `claimPendingInvites` compares it with the lower-case caller email. |
| `createdAt`, `updatedAt` | `created_at`, `updated_at` | |

**Uniqueness (rule 2).** The Firestore id made a grant idempotent and stopped a second grant for the same person, scope and role. Two partial unique indexes do the same:

- `role_grants_uid_key`: one grant for each (scope, role, uid). It stops a duplicate grant for an account.
- `role_grants_invited_email_key`: one grant for each (scope, role, invited email). It stops a duplicate invite.
- `NULLS NOT DISTINCT` makes two `chancellor` rows with `class_id IS NULL` for the same University equal, so the key also holds for University grants.
- Both keys cover every status, as the Firestore id did: a new grant for a person whose grant was revoked updates that row (`INSERT … ON CONFLICT (university_id, class_id, role, uid) WHERE uid IS NOT NULL DO UPDATE SET status = 'active', …`); it does not add a second row.
- A claimed invite keeps `invited_email` and gets `uid`, as the Firestore document did. So after the claim, a grant to the same person by uid hits `role_grants_uid_key`, and an invite to the same email hits `role_grants_invited_email_key`. Firestore could hold both documents; Postgres cannot. So `ClaimInvites` does not claim an invite when the account already has a grant for the same scope and role (a `NOT EXISTS` in the `UPDATE`); it sets that invite to `revoked` instead, and makes a `revoked` held grant `active` again (as a new grant would). Without this, the claim fails with a unique violation and `bootstrap` fails, so the person cannot sign in.

The invite flow has no route yet (`claimPendingInvites` is the only reader). The columns, the checks and the indexes are ready for it.

### `registrations`

Source: `RegistrationDocument` (`universities/{id}/classes/{classId}/registrations/{scoutId}`). The document id was the `scoutId`, so "a Scout has at most one Registration per Class" was structural. The composite primary key holds it now (rule 2).

```sql
CREATE TABLE registrations (
    class_id                uuid NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    scout_id                uuid NOT NULL REFERENCES scouts (id) ON DELETE CASCADE,
    status                  text NOT NULL
        CONSTRAINT registrations_status_check CHECK (status IN ('enrolled', 'waitlisted', 'cancelled')),
    enrolled_at             timestamptz,
    waitlisted_at           timestamptz,
    parent_consent_at       timestamptz NOT NULL,
    accepted_policy_version text NOT NULL,
    -- Snapshot for the Roster. The Retention Purge sets these six to NULL.
    scout_first_name        text,
    scout_last_name         text,
    scout_unit              text,
    accommodations          text,
    parent_name             text,
    parent_email            text,
    purged_at               timestamptz,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (class_id, scout_id),
    CONSTRAINT registrations_enrolled_check
        CHECK (status <> 'enrolled' OR (enrolled_at IS NOT NULL AND waitlisted_at IS NULL)),
    CONSTRAINT registrations_waitlisted_check
        CHECK (status <> 'waitlisted' OR waitlisted_at IS NOT NULL),
    CONSTRAINT registrations_unpurged_check
        CHECK (purged_at IS NOT NULL OR (scout_first_name IS NOT NULL AND scout_last_name IS NOT NULL
            AND parent_name IS NOT NULL AND parent_email IS NOT NULL)),
    CONSTRAINT registrations_purged_check
        CHECK (purged_at IS NULL OR (scout_first_name IS NULL AND scout_last_name IS NULL
            AND scout_unit IS NULL AND accommodations IS NULL
            AND parent_name IS NULL AND parent_email IS NULL))
);
CREATE INDEX registrations_scout_id_idx ON registrations (scout_id);
CREATE INDEX registrations_waitlist_idx ON registrations (class_id, waitlisted_at, scout_id)
    WHERE status = 'waitlisted';
```

| Firestore field | Column | Note |
| --- | --- | --- |
| `scoutId` (= document id) | `scout_id` | Part of the primary key. |
| `classId` | `class_id` | Part of the primary key. |
| `parentUid` | — | Dropped: a join through `scouts.parent_uid`. |
| `universityId` | — | Dropped: a join through `classes.university_id`. |
| `periodIds` | — | Dropped: a join through `class_periods`. |
| `badgeSlug`, `badgeTitle` | — | Dropped: a join to `classes`. |
| `scoutFirstName`, `scoutLastName`, `scoutUnit`, `accommodations` | same names, snake case | Point-in-time snapshot of the Scout. Purged. |
| `parentName`, `parentEmail` | `parent_name`, `parent_email` | Point-in-time snapshot of the Parent, for display on the Roster. Purged. Mail never uses it. |
| `status` | `status` | `cancelled` is a soft delete. |
| `waitlistedAt` | `waitlisted_at` | Orders the Waitlist. Promotion sets it to `NULL`. A cancel keeps it, as `cancelRegistrationTxn` does, so the check is "waitlisted ⇒ set", not "set ⇔ waitlisted". |
| `enrolledAt` | `enrolled_at` | |
| `parentConsentAt`, `acceptedPolicyVersion` | `parent_consent_at`, `accepted_policy_version` | `NOT NULL`: register refuses a request without consent (`CONSENT_REQUIRED`) and always stamps both. The purge keeps them: they are the consent record, not personal data. |
| `purgedAt` | `purged_at` | The idempotency mark of the purge. |
| `createdAt`, `updatedAt` | `created_at`, `updated_at` | A new registration after a cancel updates the same row and keeps `created_at`, as the TypeScript does. |

The two purge checks make the purge all-or-nothing for each row. `scout_unit` and `accommodations` can be `NULL` before the purge, so only the four values that register always fills are in `registrations_unpurged_check`.

### `idempotency_keys` and `rate_limit_buckets`

Source: none. These are the storage of the two seams in [`api-design.md`](api-design.md) sections 3 and 6, copied from doula-cloud (`00027`, `00060`) without row-level security. Migration `00005`.

```sql
CREATE TABLE idempotency_keys (
    uid           text NOT NULL REFERENCES users (uid) ON DELETE CASCADE,
    key           text NOT NULL,
    request_hash  bytea NOT NULL,
    status_code   integer NOT NULL,
    response_body bytea NOT NULL,
    created_at    timestamptz NOT NULL,
    PRIMARY KEY (uid, key)
);
CREATE INDEX idempotency_keys_created_at_idx ON idempotency_keys (created_at);

CREATE TABLE rate_limit_buckets (
    key          text PRIMARY KEY,
    window_start timestamptz NOT NULL,
    count        integer NOT NULL
);
```

- `idempotency_keys` holds one response for each (caller uid, `Idempotency-Key`). `request_hash` is the SHA-256 of the method, path with query, and body of the first request; a reuse of the key with another hash is a 409. A response body can hold personal data, so the `uid` foreign key cascades on account delete, and `idempotency.PurgeExpired` deletes the rows older than 48 hours. A caller with no `users` row yet gets no replay: the save fails on the foreign key, is logged, and the response still goes out.
- `created_at` and `window_start` have no `DEFAULT now()`: Go writes them from `clock.Now(ctx)`, so the TTL, the window and `Retry-After` read one clock.
- `rate_limit_buckets.key` is `endpoint:dimension:value` (for example `university-public:ip:203.0.113.7`). One `INSERT ... ON CONFLICT DO UPDATE` counts and resets the window, so two instances serialize on the row. No purge: a bucket is a few bytes, and the next request on it resets it. doula-cloud's `rate_limit_refusals` table is not copied; a refusal is a log line.

## Denormalized fields: join or point-in-time record

Rule 3: a field that exists only because Firestore cannot join is removed, and the query joins. A field that records a fact at one time stays.

| Field | Verdict | Why |
| --- | --- | --- |
| `registrations.universityId` | Join (`classes.university_id`) | It was there only for collection-group queries. A Class never moves to another University. |
| `registrations.parentUid` | Join (`scouts.parent_uid`) | Register requires that the caller owns the Scout, so it was always equal to the Scout's Parent. A Scout never moves to another Parent. Mail resolves the Parent through the Scout (#257). |
| `registrations.periodIds` | Join (`class_periods`) | It was there for the conflict check inside a Firestore transaction. A copy can go stale: `PATCH` on a Class can change its Periods while the University is `draft` or `rejected`, and a Chancellor can register a Scout in that state (the window bypass). The conflict check must use the Class's current Periods. |
| `registrations.badgeSlug`, `badgeTitle` | Join (`classes`) | A Class can change its badge only while the University is `draft` or `rejected`. After `published` the Class badge is fixed, so the join gives the same value as the copy for each real Registration. |
| `classes.badgeTitle`, `eagleRequired` | Point-in-time record (kept) | The Badge Catalog is in the Go binary (#248), not in the database, and it changes with `scripts/merit-badges.ts`. A badge can be renamed or discontinued after a University. The Class must still show what was taught. `badge_slug` stays as the link. |
| `classes.counselors[].displayName` | Join (`users.display_name`) | A display cache. Authorization never reads it. Today a rename does not reach it and a deleted account leaves its name on the Class; the join fixes both. |
| `classes.counselors[].bsaId`, `disclaimerAcceptedAt`, `disclaimerVersion` | Point-in-time record (kept, in `class_counselors`) | The Counselor's attestation and Disclaimer acceptance for this Class. A later change to the Counselor's profile must not change what they attested here. |
| `classes.enrolledCount`, `waitlistCount` | Derived (`COUNT`) | See [rule 4 below](#counts-are-derived). |
| `registrations.scoutFirstName`, `scoutLastName`, `scoutUnit`, `accommodations` | Point-in-time record (kept) | See below. |
| `registrations.parentName`, `parentEmail` | Point-in-time record (kept) | See below. |
| `roleGrants.universityId` | Kept as `university_id` | For a Class grant it is also `classes.university_id`, but it is the foreign key that cascades a University delete and the leading column of the uniqueness keys, and the composite foreign key makes the two agree. |

**The Scout and Parent snapshot is a point-in-time record.** Three reasons:

1. **The code treats it so.** Issue #80 planned a re-sync of the snapshot on the edit paths, but the code never built it: `scouts.update` and `users.onboard` do not touch Registrations. The Roster shows the details as they were when the Parent registered.
2. **The Retention Purge needs the University's own copy.** The purge clears the personal data of the University 90 days after it ends and keeps the row for advancement proof (#89). The Scout profile belongs to the Parent and lives on. If the Roster joined to `scouts` and `users`, the Chancellor and the Counselors would see the Scout's current name and accommodations for as long as the profile exists, and the purge would have nothing to clear.
3. **Consent was given for this data.** The Parent consented to share these details with this University (`parent_consent_at`). A later edit of the profile is not a consent to share the new value with a University that is over.

`parent_email` is for display on the Roster only. Delivery reads `users.email` at send time (#257), as `userEmailReader` does today.

**Where the personal data lives, and what the purge clears.**

| Place | Personal data | Purge |
| --- | --- | --- |
| `registrations` | `scout_first_name`, `scout_last_name`, `scout_unit`, `accommodations`, `parent_name`, `parent_email` | Set to `NULL`, `purged_at` stamped. The row stays with `class_id`, `scout_id`, `status`, the timestamps and the consent record. |
| `scouts` | The Parent's own Scout profile | Not touched. It belongs to the Parent, who deletes it. |
| `users` | The account | Not touched. |
| `class_counselors` | `bsa_id` of an adult Counselor | Not touched, as today. It is adult data that the Counselor gave for the Class. A later ticket can add it to the purge. |
| `registration_mail_outbox` (#257) | `to_email` once sent | #257 decides. The outbox row is the Youth-Protection audit record and stores no names. |

<a id="counts-are-derived"></a>
**Counts are derived (rule 4).** `enrolledCount` and `waitlistCount` are dropped. A read computes them:

```sql
SELECT c.id,
       count(*) FILTER (WHERE r.status = 'enrolled')   AS enrolled_count,
       count(*) FILTER (WHERE r.status = 'waitlisted') AS waitlist_count
FROM classes c
LEFT JOIN registrations r ON r.class_id = c.id
WHERE c.university_id = $1
GROUP BY c.id;
```

Capacity is at most 200 and the Waitlist is uncapped but small, so the count reads at most a few hundred index entries. There is no measured reason to store the counts. The seat transaction counts under the Class row lock (below), so a stored counter would add a second fact to keep in step and nothing else.

## Dropped fields

| Collection | Field | Reason |
| --- | --- | --- |
| `users` | `counselorProfile` (`bsaId`, `attestedBadges`, `attestedAt`) | No code writes or reads it: `bootstrap` sets it to `null` and no route changes it. The Counselor's attestation is per Class, in `class_counselors`. A later feature adds a profile table by migration. |
| `universities` | `location` (the object) | Flattened to five `location_*` columns. Small, fixed, never queried. |
| `universities` | `periods` (the array) | Moved to table `periods`. |
| `universities` | `billing` (the object) | Flattened to five nullable columns (rule 12). |
| `classes` | `periodIds` | Moved to table `class_periods`. |
| `classes` | `enrolledCount`, `waitlistCount` | Derived with `COUNT` (rule 4). |
| `classes` | `counselors` (the array) | Moved to table `class_counselors`. |
| `classes` | `counselors[].displayName` | Join to `users.display_name`. |
| `registrations` | `universityId`, `parentUid`, `periodIds`, `badgeSlug`, `badgeTitle` | Joins. See the table above. |
| `roleGrants` | `scopeType` | Derived: `class_id IS NOT NULL`. |
| `roleGrants` | `scopeId` | Replaced by the typed foreign keys `university_id` and `class_id`. |
| `roleGrants` | document id `{scopeId}:{role}:{uidOrEmail}` | Replaced by a `uuid` key and the two unique indexes. |
| `emailLog` | the whole collection | Out of scope (rule 10). #257 folds it into the outbox. See [`emailLog` and the mail outbox](#emaillog-and-the-mail-outbox). |

Each other field in `functions/src/collections/` maps to a column in the tables above.

## The seat transaction and its lock strategy

Firestore retried a transaction on contention. Postgres does not: the code takes explicit row locks under `READ COMMITTED`. This section is the design for #254; #254 implements it and has no design work left.

### Lock order

Every transaction that takes more than one of these locks takes them in this order, and within one level in ascending id order:

1. `scouts` row (`FOR UPDATE`)
2. `universities` row (`FOR SHARE` for a Registration; `FOR UPDATE` for a write to the University, its Periods or its Classes)
3. `classes` row (`FOR UPDATE`)
4. `registrations` rows (`FOR UPDATE`)

With one global order, two transactions cannot each hold a lock that the other waits for, so no two request paths can deadlock. The Retention Purge is the one exception (see the end of the next part). A Class belongs to one University, so "the University, then its Classes" for one University before the next is also in order.

### Why each lock

- **The Scout row** stops a Period Conflict between two Classes. Two parallel requests for one Scout in two Classes that share a Period each lock a different Class row, so a Class lock alone lets both pass the conflict check. The Scout lock puts all the Registrations of one Scout in a line. The same statement is the ownership check (`assertOwnsScout`).
- **The University row, `FOR SHARE`**, keeps the status and the Registration Window still while the Registration commits. #253 takes `FOR UPDATE` on the same row for each status move, so a `close` waits for a Registration in progress and the other way round. Two Registrations do not block each other, because share locks do not conflict.
- **The Class row, `FOR UPDATE`**, puts all seat changes of one Class in a line: register, cancel and promotion. It is the lock that rule 4 asks for.
- **Why `COUNT` is correct under `READ COMMITTED`.** Each statement takes a new snapshot when it starts. The `COUNT` runs after the Class lock is held, so it sees each Registration that an earlier holder of the lock committed. Do not use `REPEATABLE READ`: its snapshot starts at the first statement, before the lock, and the count would be stale.

### Register (`POST /api/registrations/{universityId}/{classId}`)

One transaction. `$now` is `clock.Now(ctx)`, read once, after step 3 (inside the Class lock), so `waitlisted_at` follows the order in which the Class lock was taken.

```sql
-- 1. Scout lock and ownership check. No row: 403 (the TypeScript order: window first, then ownership).
SELECT id, first_name, last_name, unit, accommodations
FROM scouts WHERE id = $scout_id AND parent_uid = $caller_uid
FOR UPDATE;

-- 2. University: 404 if absent. Status and window checks in Go (window-policy.ts, ported as a pure function).
SELECT status, registration_opens_at, registration_closes_at
FROM universities WHERE id = $university_id
FOR SHARE;

-- 3. Class: 404 if absent or if it belongs to another University.
SELECT capacity FROM classes
WHERE id = $class_id AND university_id = $university_id
FOR UPDATE;

-- 4. The existing row for this Scout in this Class. Enrolled or waitlisted: return it, no change (idempotent).
SELECT status, created_at FROM registrations
WHERE class_id = $class_id AND scout_id = $scout_id
FOR UPDATE;

-- 5. Consent check in Go (CONSENT_REQUIRED).

-- 6. Period Conflict: an active Registration of this Scout in another Class that shares a Period.
SELECT DISTINCT r.class_id
FROM registrations r
JOIN class_periods other ON other.class_id = r.class_id
JOIN class_periods this  ON this.period_id = other.period_id AND this.class_id = $class_id
WHERE r.scout_id = $scout_id
  AND r.class_id <> $class_id
  AND r.status IN ('enrolled', 'waitlisted');
-- Any row: 409 PERIOD_CONFLICT; the response details come from a join to classes and class_periods.

-- 7. Seats.
SELECT count(*) FROM registrations WHERE class_id = $class_id AND status = 'enrolled';
-- count < capacity: enrolled. Else, acceptWaitlist: waitlisted. Else: 409 CLASS_FULL.

-- 8. Write. No row in step 4: INSERT. A cancelled row in step 4: UPDATE that row, keep created_at,
--    set the new status, set both enrolled_at and waitlisted_at (the one that does not apply to NULL:
--    a cancelled row can keep an old waitlisted_at), consent, a fresh snapshot, purged_at = NULL.
INSERT INTO registrations (class_id, scout_id, status, enrolled_at, waitlisted_at,
    parent_consent_at, accepted_policy_version, scout_first_name, scout_last_name,
    scout_unit, accommodations, parent_name, parent_email)
VALUES (...);

-- 9. #257: the outbox row (registered or waitlisted) in the same transaction.
```

Notes:

- The lock order and the error order are not the same. The TypeScript answers in this order: University missing (404), window (403), ownership (403), Class missing (404), already active (no-op), consent (403), Period Conflict (409), Class full (409). Go runs steps 1 to 3 first and keeps their results, then returns the first error in the TypeScript order. A missing Scout row in step 1 is not an error until the window check has passed.
- The parent snapshot comes from `users` (`display_name`, `email`), read without a lock in the same transaction, with the caller's token email as the fallback, as today.
- The primary key `(class_id, scout_id)` is the backstop for step 4. Under the Scout lock, two requests for the same Scout cannot both reach step 8.
- No database constraint can hold the Period Conflict rule, because it spans rows of more than one Class. The Scout lock holds it.

### Cancel and promote (one function, shared)

`DELETE /api/registrations/{universityId}/{classId}/{scoutId}`, scout deletion (#250) and account deletion (#249) call one Go function that takes a transaction: `seats.CancelAndPromote` in `api/internal/seats` (`cancelRegistrationTxn` in the TypeScript). `seats.CancelActiveOfScouts` does the Scout and account deletion part below. It does not take the Scout lock of the cancelled Registration's Scout: a cancel only removes a possible conflict, so it cannot make one.

```sql
-- Caller: the University row FOR SHARE (window check), then:
SELECT id FROM classes WHERE id = $class_id AND university_id = $university_id FOR UPDATE;

SELECT status FROM registrations
WHERE class_id = $class_id AND scout_id = $scout_id
FOR UPDATE;
-- Absent or cancelled: 404.

UPDATE registrations SET status = 'cancelled', updated_at = now()
WHERE class_id = $class_id AND scout_id = $scout_id;

-- Only when the cancelled row was enrolled: promote the oldest waitlisted row.
SELECT scout_id FROM registrations
WHERE class_id = $class_id AND status = 'waitlisted'
ORDER BY waitlisted_at, scout_id
LIMIT 1
FOR UPDATE;

UPDATE registrations
SET status = 'enrolled', enrolled_at = $now, waitlisted_at = NULL, updated_at = now()
WHERE class_id = $class_id AND scout_id = $promoted_scout_id;
-- #257: the "promoted" outbox row in the same transaction.
```

- The Waitlist order is `ORDER BY waitlisted_at, scout_id`. `registrations_waitlist_idx` serves it. `scout_id` only breaks a tie, which happens only when a test clock gives two Registrations the same time. A fake clock that moves forward on each read gives a strict order.
- The rule "promote one when an enrolled Registration is cancelled" is the TypeScript rule and stays. A derived count would also allow "promote while `count(enrolled) < capacity`" (for example after a Capacity increase); that is a later product decision, not part of the port.
- Scout and account deletion: lock all the Scout rows first (for an account, every Scout of the account, ascending `id`). Then collect the active Registrations of all those Scouts together, and for each in ascending `(university_id, class_id)` order take the University share lock and call the function. Do not work one Scout at a time: two account deletions could then take Class locks out of order. An account deletion also takes, between the Scout locks and the cancels, a `FOR SHARE` lock on each University the account is an active Chancellor of (ascending id), so none leaves `draft` or `closed` between the `CLOSE_EVENTS_FIRST` check and the commit. These are share locks and a status move takes only one University lock, so the second ascending pass over the Registration Universities cannot close a cycle. One transaction for the whole deletion, then the `DELETE` (see the next section).
- The Retention Purge is not in the lock order: its one `UPDATE` locks `registrations` rows in the order the plan reads them. A Scout delete in the same second can deadlock with it. Postgres detects the deadlock and stops one transaction. The purge is idempotent and runs again on the next day, so this is accepted; a request path is never in a deadlock with another request path.

### Other writes that take locks

| Write | Locks |
| --- | --- |
| `PUT /periods` | University `FOR UPDATE`. Then the in-use check on removed Periods, then delete, update and insert of `periods` rows. |
| Class create, `PATCH`, delete | University `FOR UPDATE` (status check, Period ids), then the Class row `FOR UPDATE` for `PATCH` and delete. |
| Status moves (#253) | University `FOR UPDATE`. Submit also counts the Classes in the same transaction. |
| University delete | University `FOR UPDATE`, status check, then `DELETE` (the cascades do the rest). |

## Delete and purge behavior

Rule 8. "Database" means a foreign-key cascade. "Code" means work that Go must do before or after the `DELETE`, because it has a rule or a side effect that a cascade cannot have (Waitlist promotion, mail, a refusal, Firebase Auth).

### Foreign keys

| Table.column | References | On delete | Why |
| --- | --- | --- | --- |
| `scouts.parent_uid` | `users.uid` | `CASCADE` | Account deletion erases the Parent's Scouts. |
| `periods.university_id` | `universities.id` | `CASCADE` | A Period is part of its University. |
| `classes.university_id` | `universities.id` | `CASCADE` | A Class is part of its University. |
| `class_periods (university_id, class_id)` | `classes (university_id, id)` | `CASCADE` | The link goes with the Class. |
| `class_periods (university_id, period_id)` | `periods (university_id, id)` | `NO ACTION`, deferred to commit | A Period in use cannot go. The check waits for the commit, so the University delete cascade is complete before it runs. |
| `class_counselors.class_id` | `classes.id` | `CASCADE` | The attestation goes with the Class. |
| `class_counselors.uid` | `users.uid` | `CASCADE` | Erasure: a deleted account leaves no name or BSA id on a Class. |
| `role_grants.university_id` | `universities.id` | `CASCADE` | A grant on a deleted University means nothing. |
| `role_grants (university_id, class_id)` | `classes (university_id, id)` | `CASCADE` | A Counselor grant goes with its Class. |
| `role_grants.uid` | `users.uid` | `CASCADE` | A deleted account holds no grant. |
| `registrations.class_id` | `classes.id` | `CASCADE` | See "Class delete" below. |
| `registrations.scout_id` | `scouts.id` | `CASCADE` | Erasure. See "Scout delete" below. |
| `idempotency_keys.uid` | `users.uid` | `CASCADE` | Erasure: a stored response can hold the account's personal data. |
| `universities.created_by_uid`, `*_by_uid` | — | no foreign key | An audit record outlives the account. The review queue `LEFT JOIN`s `users` and shows `''` for a deleted account, as the TypeScript does. |

### Per operation: what the code does and what the database does

| Operation | Code (Go) | Database (cascade) | Change from the TypeScript |
| --- | --- | --- | --- |
| **Scout delete** (`scouts.remove`) | Lock the Scout. For each `enrolled` or `waitlisted` Registration: cancel and promote (with the promoted mail in the outbox). Then `DELETE FROM scouts`. One transaction. | All `registrations` rows of the Scout, also the cancelled and the purged ones. | The TypeScript hard-deleted only the active Registrations and left the cancelled ones with the Scout's name and accommodations. Erasure now removes them all. A purged row of the Scout is removed too: the right to erasure comes before advancement proof (#89). |
| **Account delete** (`users.deleteAccount`) | Refuse with 403 `CLOSE_EVENTS_FIRST` if the caller has an active `chancellor` grant on a University that is not `draft` or `closed`. Cancel and promote for each active Registration of each Scout, as for a Scout delete. Then `DELETE FROM users`. One transaction. After the commit, delete the Firebase Auth user. | `scouts` → `registrations`; `class_counselors`; `role_grants` and `idempotency_keys` of the account. | The TypeScript set the account's grants to `revoked`; the cascade deletes them. The effect is the same: no grant points at the deleted account. The Auth delete stays after the commit, so a failure leaves a login with no data, never data with no login (the TypeScript reason). A draft or closed University of the account stays, with `created_by_uid` and no Chancellor grant; only a Super-admin reaches it, as today. |
| **University delete** (`universities.remove`, `draft` only) | Lock the University, check `draft`, `DELETE FROM universities`. | `periods`, `classes` → (`class_periods`, `class_counselors`, `registrations`, Counselor `role_grants`), and the Chancellor `role_grants`. | The TypeScript deleted the Classes and the grants in a batch and left each Class's `registrations` subcollection behind. The cascade removes them. Registrations can exist on a `draft` University, because a Chancellor can register outside the window (a dry run). |
| **Class delete** (`classes.remove`, `draft` or `rejected` only) | Lock the University, check the status, `DELETE FROM classes`. No promotion and no mail: the Class is gone. | `class_periods`, `class_counselors`, `registrations`, Counselor `role_grants`. | Same as above: the TypeScript left the `registrations` subcollection behind. |
| **Period removal** (`PUT /periods`) | Lock the University. If a removed Period is in `class_periods`, answer 409 with the Classes. Else delete the rows. | Nothing cascades. The deferred `NO ACTION` foreign key is the backstop. | None. Firestore needed chunks of 10 for `array-contains-any`; one `WHERE period_id = ANY($1)` replaces them. |
| **Registration cancel** | Soft delete: `status = 'cancelled'`, then promotion. | Nothing. | None. |
| **Retention Purge** (#256) | See below. | Nothing. | None. |

### The Retention Purge

The purge is an `UPDATE`, never a `DELETE`. For each University whose effective end (`COALESCE(end_date, start_date)`) is more than `RETENTION_WINDOW_DAYS` (90) before `clock.Now(ctx)`:

```sql
UPDATE registrations r
SET scout_first_name = NULL, scout_last_name = NULL, scout_unit = NULL,
    accommodations = NULL, parent_name = NULL, parent_email = NULL,
    purged_at = $now, updated_at = now()
FROM classes c
JOIN universities u ON u.id = c.university_id
WHERE r.class_id = c.id
  AND COALESCE(u.end_date, u.start_date) < $cutoff
  AND r.purged_at IS NULL;
```

- `$cutoff` is `$now - 90 days`, computed in Go. Firestore could not query a `COALESCE`, so the TypeScript queried `startDate < cutoff` and filtered in memory; SQL does it in the `WHERE`.
- `r.purged_at IS NULL` makes it idempotent: a second run changes nothing. Firestore needed batches of 500; one statement replaces them.
- `universitiesProcessed` in the response counts each University past the cutoff, also one with no row left to purge (the TypeScript counts it so). Go counts those with a separate `SELECT count(*) FROM universities WHERE COALESCE(end_date, start_date) < $cutoff` in the same transaction. `registrationsPurged` is the row count of the `UPDATE`.
- The purge clears the six snapshot columns and nothing else. The two `registrations_*purged_check` constraints refuse a partial purge.
- The same run calls `idempotency.PurgeExpired(ctx, db, now)`, which deletes the `idempotency_keys` rows older than 48 hours (#247).

## Firestore indexes and the queries that replace them

Rule 9. Each composite index in `firestore.indexes.json`, the query that used it, and its SQL replacement. The names in the second column are the names for the Go query functions.

| # | Firestore index | Query today | SQL query | Served by |
| --- | --- | --- | --- | --- |
| 1 | `universities (status, submittedAt)` | Review queue (`listReviewQueue`) | `ReviewQueue`: `WHERE status = 'submitted' ORDER BY submitted_at, id` with a `LEFT JOIN users` on `created_by_uid` and a Class count | `universities_review_queue_idx (submitted_at, id) WHERE status = 'submitted'`. The `id` column lets #253 use a cursor on `(submitted_at, id)` if it pages the list. |
| 2 | `roleGrants (uid, role, scopeType, status)` | The caller's Universities (`listMine`), the account-delete block, the Counselor's Classes (`listActiveClassGrants`) | `MyUniversities`: `WHERE uid = $1 AND status = 'active' AND role = 'chancellor'` joined to `universities`, with a Class count. `MyClassGrants`: `WHERE uid = $1 AND status = 'active' AND role = 'counselor' AND university_id = $2` | `role_grants_uid_status_idx (uid, status, role)`. Today `listActiveClassGrants` filters the University in memory; SQL filters it in the `WHERE`. |
| 3 | `roleGrants (scopeId, role, status)` | Scope members; a Class delete reads the Counselor grants of the Class | `HasActiveGrant`: `WHERE university_id = $1 AND class_id IS NULL AND role = 'chancellor' AND uid = $2 AND status = 'active'` for a University grant, and `WHERE university_id = $1 AND class_id = $2 AND role = 'counselor' AND uid = $3 AND status = 'active'` for a Class grant. A Class delete needs no query: the cascade deletes the grants. | `role_grants_uid_key (university_id, class_id, role, uid)`. Use the two forms, not `class_id IS NOT DISTINCT FROM $2`: a btree index cannot serve `IS NOT DISTINCT FROM` with a parameter. Go passes `university_id` also for a Class grant, because each route that checks a Counselor has the University id in its path. |
| 4 | `roleGrants (invitedEmail, status)` | Claim invites at `bootstrap` (`claimPendingInvites`) | `ClaimInvites`: `UPDATE role_grants g SET uid = $1, status = 'active', updated_at = now() WHERE g.invited_email = lower($2) AND g.status = 'invited' AND NOT EXISTS (a grant with the same university_id, class_id, role and uid = $1)`, then `UPDATE … SET status = 'revoked'` for the invites that are left. See `role_grants`. | `role_grants_pending_invite_idx (invited_email) WHERE status = 'invited'` |
| 5 | `registrations (status, waitlistedAt)`, collection scope | The oldest waitlisted Registration of a Class (promotion) | `NextWaitlisted`: `WHERE class_id = $1 AND status = 'waitlisted' ORDER BY waitlisted_at, scout_id LIMIT 1 FOR UPDATE` | `registrations_waitlist_idx (class_id, waitlisted_at, scout_id) WHERE status = 'waitlisted'` |
| 6 | `registrations (scoutId, universityId, status)`, collection group | Period Conflict check | `PeriodConflicts` (step 6 of Register) | `registrations_scout_id_idx (scout_id)`, then the `class_periods` primary key. A Scout has few Registrations, so the status filter needs no index column. |
| 7 | `registrations (parentUid, universityId, status)`, collection group | Schedule (`listSchedule`) | `Schedule`: `registrations r JOIN scouts s ON s.id = r.scout_id JOIN classes c ON c.id = r.class_id WHERE s.parent_uid = $1 AND c.university_id = $2 AND r.status IN ('enrolled', 'waitlisted')`, with `class_periods` for `periodIds` | `scouts_parent_uid_created_at_idx`, then `registrations_scout_id_idx` |
| 8 | `registrations (universityId, status)`, collection group | Roster (`listRoster`) and the purge | `Roster`: `classes c JOIN registrations r ON r.class_id = c.id WHERE c.university_id = $1 AND r.status IN ('enrolled', 'waitlisted')`, with a Class filter for a Counselor. The purge: see above. | `classes_university_id_created_at_idx`, then the `registrations` primary key `(class_id, scout_id)` |
| 9 | `registrations (scoutId, status)`, collection group | Scout delete: the active Registrations of a Scout | `ActiveRegistrationsOfScout`: `WHERE scout_id = $1 AND status IN ('enrolled', 'waitlisted')`, joined to `classes` for the University id, `ORDER BY university_id, class_id` | `registrations_scout_id_idx` |

Queries that used Firestore's automatic indexes, and the other indexes in the tables above:

| Query | Served by |
| --- | --- |
| `hasActiveGrant` (`uid`, `scopeId`, `role`, `status`, all equality; a zig-zag merge in Firestore) | `role_grants_uid_key`, as row 3. |
| The purge's `registrations (universityId, purgedAt == null)` | The `UPDATE` above. It scans the Classes of the Universities past the cutoff through the `registrations` primary key. No extra index: the job runs once a day. |
| The purge's `universities (startDate < cutoff)` | No index. The table holds one row for each University, and the job runs once a day. |
| A Parent's Scouts (`orderBy createdAt`) | `scouts_parent_uid_created_at_idx` |
| The Classes of a University (`orderBy createdAt`), the Class count for `listMine` and the review queue | `classes_university_id_created_at_idx` |
| The Periods of a University | `periods_university_id_position_idx` |
| Period in use (`array-contains-any`, chunks of 10) | `class_periods_period_id_idx` |
| Cascade from `users` to `role_grants`, `class_counselors` | `role_grants_uid_status_idx`, `class_counselors_uid_idx` |
| Cascade from `classes` to `role_grants` | `role_grants_class_id_idx` |
| Cascade from `scouts` to `registrations` | `registrations_scout_id_idx` |

The TypeScript sorts the Roster by name in memory (`localeCompare`). It can move to `ORDER BY scout_last_name, scout_first_name` in SQL, but the collation differs from `localeCompare`; #255 decides and keeps its tests green.

## `emailLog` and the mail outbox

Out of scope (rule 10). #257 designs `registration_mail_outbox` and folds the Youth-Protection audit log into it. So that each Firestore field has a place, this is where each `EmailLogDocument` field goes in the column list that #257 names:

| `emailLog` field | Outbox column (#257) |
| --- | --- |
| `type` (`registered`, `promoted`) | `kind` (`registered`, `waitlisted`, `promoted`). The outbox splits `registered` into two kinds. |
| `toParentUid` | `to_parent_uid` |
| `toEmail` | `to_email`, filled at send time |
| `scoutId` | `scout_id` |
| `classId` | `class_id` |
| the parent path `universities/{id}` | `university_id` |
| `subject` | `subject` |
| `status` (`sent`, `failed`) | `status` (`pending`, `sent`, `failed`) |
| `mailgunMessageId` | `mailgun_message_id` |
| `errorId` | `error_id` |
| `createdAt` | `created_at` |

A note for #257: the outbox row must not block an erasure. A foreign key from the outbox to `scouts`, `classes` or `users` must be `ON DELETE CASCADE` or `SET NULL`, or there is no foreign key. Which one is #257's decision.

## Effects on the JSON contract

The success bodies keep their shape, so the types in `app/src/lib/api-types` stay valid. These are the changes in values that a port test or the app can see:

1. **Id format.** `scoutId` and `classId` become UUID strings; Firestore made 20-character auto-ids. `periodId` was a UUID already. The University `id` does not change: the app still makes it. The app treats each id as an opaque string, so no app change is needed.
2. **A malformed id is a 404, never a 500.** A `uuid` column refuses a string that is not a UUID with a cast error. Go must parse each `scoutId`, `classId` and `periodId` from a path or a body before a query, and answer as the TypeScript answers for an id that does not exist (404, or 403 for a Scout the caller does not own, or 400 for an unknown `periodId` in a body).
3. **`periodIds` order.** A Class's `periodIds` (in the Class, the public read and a Registration) come in the University's Period order (`periods.position`), not the order of the request that set them. `periods` keeps the request order of `PUT /periods`, as today.
4. **Counts.** `enrolledCount`, `waitlistCount` and `seatsRemaining` have the same values; a `COUNT` makes them.
5. **Counselor names are live.** `counselors[].displayName` and the Roster's `counselorNames` show the current `users.display_name`, not the name at Class create time.
6. **Registration fields from the Class.** `universityId`, `badgeSlug`, `badgeTitle` and `periodIds` in a Registration come from the Class. They differ from the old copy only if the Class changed after the Registration, which can happen only on a `draft` or `rejected` University.
7. **Timestamp format.** Postgres keeps microseconds, Firestore kept nanoseconds, and JavaScript's `toISOString()` writes milliseconds. Go writes each timestamp in the `toISOString()` format, `2006-01-02T15:04:05.000Z` in UTC, so the strings keep the same shape.
8. **`phone` is always `null`.** As today: no route writes it.
9. **Erasure removes more.** After a Scout delete, no Registration of that Scout remains, also no cancelled one. No route lists cancelled Registrations, so no body changes.
10. **A Scout needs a users row.** `scouts.parent_uid` is a foreign key to `users`, so `POST /api/users/me/scouts` before the session bootstrap (`POST /api/users/me`) answers 404 `NOT_FOUND`, "User not found; bootstrap the session first" (#250). Firestore created the Scout with no parent document. The app always bootstraps first. With an `Idempotency-Key`, the 404 replays (api-design.md section 3), so a retry after the bootstrap needs a new key.
11. **The Period-removal 409 lists the Classes in `details`.** `PUT /api/universities/{id}/periods` that removes a Period a Class uses answers 409 `CONFLICT`, "Cannot remove periods that are assigned to classes", with `details` = `{ "<classId>": "<badge title>" }` for each such Class (#252). The TypeScript sent `details.classes = [{ classId, title }]`; `details` is now a string map (api-design.md section 7), so the app reads the pairs (#263).
