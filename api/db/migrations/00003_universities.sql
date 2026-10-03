-- +goose Up
-- docs/data-model.md, "universities", "periods", "classes",
-- "class_periods" and "class_counselors".

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

-- The Period foreign key is checked at commit, so the cascade of one
-- University delete (to periods and, through classes, to class_periods)
-- is complete before it runs. See docs/data-model.md, "class_periods".
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

GRANT SELECT, INSERT, UPDATE, DELETE
    ON universities, periods, classes, class_periods, class_counselors TO app_runtime;

-- +goose Down
DROP TABLE class_counselors;
DROP TABLE class_periods;
DROP TABLE classes;
DROP TABLE periods;
DROP TABLE universities;
