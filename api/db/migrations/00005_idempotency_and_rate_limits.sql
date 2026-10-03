-- +goose Up
-- docs/data-model.md, "idempotency_keys" and "rate_limit_buckets" (#247).
-- Copied from doula-cloud 00027 and 00060 without row-level security
-- (#240 decision 4) and without the rate_limit_refusals table: a refusal
-- is a log line, not a row.

-- One stored response for each (caller, Idempotency-Key). The key is
-- scoped by the caller's uid: two adults who send the same key do not
-- collide. request_hash is the SHA-256 of the method, path and body of
-- the first request, so a reuse of the key for a different request is a
-- 409, not a replay. The cascade erases the stored bodies with the
-- account.
CREATE TABLE idempotency_keys (
    uid           text NOT NULL REFERENCES users (uid) ON DELETE CASCADE,
    key           text NOT NULL,
    request_hash  bytea NOT NULL,
    status_code   integer NOT NULL,
    response_body bytea NOT NULL,
    created_at    timestamptz NOT NULL,
    PRIMARY KEY (uid, key)
);
-- The 48-hour purge deletes by age.
CREATE INDEX idempotency_keys_created_at_idx ON idempotency_keys (created_at);

-- One counter for each (endpoint, rule, key) in the current window. The
-- counter is in Postgres, not in process memory, because Cloud Run can
-- run more than one instance.
CREATE TABLE rate_limit_buckets (
    key          text PRIMARY KEY,
    window_start timestamptz NOT NULL,
    count        integer NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON idempotency_keys, rate_limit_buckets TO app_runtime;

-- +goose Down
DROP TABLE rate_limit_buckets;
DROP TABLE idempotency_keys;
