-- +goose Up
-- docs/data-model.md, "registration_mail_outbox" (#257, ADR 0004).
--
-- One row is one transactional mail to a Parent about one Registration.
-- The request writes it in the transaction of the seat change; the drain
-- (POST /api/internal/outboxes/drain) sends it. The row is also the
-- Youth-Protection audit record that emailLog was: it holds ids, the
-- subject and the address the mail went to, never a name or a body.
--
-- Each foreign key cascades, so an erasure (Scout or account delete) and
-- a University or Class delete are never blocked and leave no row behind.
-- Go writes created_at and next_attempt_at from the clock seam: the claim
-- compares next_attempt_at with the same clock, so no DEFAULT now().
CREATE TABLE registration_mail_outbox (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kind               text NOT NULL
        CONSTRAINT registration_mail_outbox_kind_check CHECK (kind IN ('registered', 'waitlisted', 'promoted')),
    to_parent_uid      text NOT NULL REFERENCES users (uid) ON DELETE CASCADE,
    scout_id           uuid NOT NULL REFERENCES scouts (id) ON DELETE CASCADE,
    class_id           uuid NOT NULL,
    university_id      text NOT NULL,
    -- pending: due at next_attempt_at. sent: delivered. failed: the
    -- dead-letter state, never tried again.
    status             text NOT NULL DEFAULT 'pending'
        CONSTRAINT registration_mail_outbox_status_check CHECK (status IN ('pending', 'sent', 'failed')),
    attempts           integer NOT NULL DEFAULT 0
        CONSTRAINT registration_mail_outbox_attempts_check CHECK (attempts >= 0),
    next_attempt_at    timestamptz NOT NULL,
    mailgun_message_id text,
    error_id           text,
    -- Filled when the drain renders and sends the mail. The Retention
    -- Purge sets to_email to NULL with the Registrations' snapshot.
    subject            text,
    to_email           text,
    created_at         timestamptz NOT NULL,
    sent_at            timestamptz,
    CONSTRAINT registration_mail_outbox_class_fkey FOREIGN KEY (university_id, class_id)
        REFERENCES classes (university_id, id) ON DELETE CASCADE,
    CONSTRAINT registration_mail_outbox_sent_check
        CHECK (status <> 'sent' OR (sent_at IS NOT NULL AND mailgun_message_id IS NOT NULL))
);
-- The drain's claim: the due pending rows, oldest first.
CREATE INDEX registration_mail_outbox_due_idx ON registration_mail_outbox (next_attempt_at, id)
    WHERE status = 'pending';
-- The cascades from users, scouts and classes, and the purge by University.
CREATE INDEX registration_mail_outbox_to_parent_uid_idx ON registration_mail_outbox (to_parent_uid);
CREATE INDEX registration_mail_outbox_scout_id_idx ON registration_mail_outbox (scout_id);
CREATE INDEX registration_mail_outbox_class_idx ON registration_mail_outbox (university_id, class_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON registration_mail_outbox TO app_runtime;

-- +goose Down
DROP TABLE registration_mail_outbox;
