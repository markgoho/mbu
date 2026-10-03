# 00001_bootstrap.sql

## DO block

```sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_runtime') THEN
        CREATE ROLE app_runtime NOLOGIN;
    END IF;
END
$$;
```

The block reads `pg_roles`, a system catalog, and no table of this database. It writes no row. When `app_runtime` already exists, it does nothing; when it does not, it creates the role. Rows in any table cannot change what it does.
