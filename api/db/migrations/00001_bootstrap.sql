-- +goose Up
-- The two roles of #240 decision 4 and ADR 0002.
--
-- The migration owner is the login that runs goose: `migrate_login` on
-- Cloud SQL (#259), the container superuser in internal/testdb.
-- It creates, and so owns, every table. No migration names it.
--
-- app_runtime is the group role the service connects through. It has no
-- login of its own: `app_runtime_login` (made by hand, #259) is granted it.
-- Each table migration grants app_runtime SELECT, INSERT, UPDATE and
-- DELETE on that table and nothing else, so the service cannot run DDL.
-- There is no row-level security in v1 (#240 decision 4).
--
-- Roles are cluster-wide, not per database, so a bare CREATE ROLE fails
-- when the role already exists (a second database on the same instance,
-- or the shared testdb container). The DO block makes it a no-op then.
-- +goose StatementBegin
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_runtime') THEN
        CREATE ROLE app_runtime NOLOGIN;
    END IF;
END
$$;
-- +goose StatementEnd

-- +goose Down
-- The role is cluster-wide and can serve another database on the same
-- instance, so Down leaves it in place.
