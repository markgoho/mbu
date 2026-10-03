-- +goose Up
-- docs/data-model.md, "role_grants" and "registrations".

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
-- NULLS NOT DISTINCT makes two chancellor rows (class_id IS NULL) of one
-- University collide, so the keys also hold for University grants.
CREATE UNIQUE INDEX role_grants_uid_key
    ON role_grants (university_id, class_id, role, uid) NULLS NOT DISTINCT
    WHERE uid IS NOT NULL;
CREATE UNIQUE INDEX role_grants_invited_email_key
    ON role_grants (university_id, class_id, role, invited_email) NULLS NOT DISTINCT
    WHERE invited_email IS NOT NULL;
CREATE INDEX role_grants_uid_status_idx ON role_grants (uid, status, role);
CREATE INDEX role_grants_class_id_idx ON role_grants (class_id) WHERE class_id IS NOT NULL;
CREATE INDEX role_grants_pending_invite_idx ON role_grants (invited_email) WHERE status = 'invited';

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

GRANT SELECT, INSERT, UPDATE, DELETE ON role_grants, registrations TO app_runtime;

-- +goose Down
DROP TABLE registrations;
DROP TABLE role_grants;
