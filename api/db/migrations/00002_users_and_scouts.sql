-- +goose Up
-- docs/data-model.md, "users" and "scouts".

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

GRANT SELECT, INSERT, UPDATE, DELETE ON users, scouts TO app_runtime;

-- +goose Down
DROP TABLE scouts;
DROP TABLE users;
