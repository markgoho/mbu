-- +goose Up
-- docs/data-model.md, "sessions" (#265, ADR 0007). Copied from
-- doula-cloud 00028 with the identity the API needs on each request: a
-- session is minted only after the ID token was verified, so the row
-- holds what the token said then.
--
-- A session is an opaque random token in the __session cookie, and this
-- row is the only record of it. Only the SHA-256 of the token is stored:
-- the token is all entropy, so a plain digest is the right primitive,
-- and a read of this table gives nobody a usable session.
--
-- uid has no foreign key to users: POST /api/session mints the session
-- before the app bootstraps the users row (POST /api/users/me).
-- Account deletion ends every session of the uid in code.
--
-- No updated_at: renewal moves expires_at and nothing else, the same
-- reading as idempotency_keys and rate_limit_buckets. created_at comes
-- from the clock seam at the mint; a session ends authn.MaxSessionAge
-- after it, renewed or not.
CREATE TABLE sessions (
    token_hash   text PRIMARY KEY,
    uid          text NOT NULL,
    email        text NOT NULL,
    display_name text NOT NULL DEFAULT '',
    super_admin  boolean NOT NULL DEFAULT false,
    expires_at   timestamptz NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now()
);

-- Ending every session of an account (account deletion, a revoked
-- super-admin) is one DELETE by uid.
CREATE INDEX sessions_uid_idx ON sessions (uid);

-- The expiry sweep runs on every mint; without this index it reads every
-- live session each time somebody signs in.
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO app_runtime;

-- +goose Down
DROP TABLE sessions;
