#!/usr/bin/env bash
# Applies pending goose migrations to Cloud SQL through the Cloud SQL Auth
# Proxy. Intended as a blocking pre-deploy step: a non-zero exit here must
# stop the deploy.
#
# Required env vars:
#   INSTANCE_CONNECTION_NAME  Cloud SQL instance, <project>:us-east4:<instance>
#   DB_USER                   Postgres login to migrate as: the migration
#                             owner (`migrate_login`), never an app_runtime
#                             login
#   DB_PASS                   Password for DB_USER
#   DB_NAME                   Database to migrate
#
# The `migrate` job of .github/workflows/api-deploy-merge.yml (#260) reads
# these from the secret mbu-pg-migrate-dsn and calls this script before the
# deploy job. api/docs/infrastructure.md, "How a deploy works", has the
# rest. Locally, `go run ./cmd/migrate` applies the same migrations to a
# local Postgres.
set -euo pipefail

: "${INSTANCE_CONNECTION_NAME:?must be set, e.g. <project>:us-east4:<instance>}"
: "${DB_USER:?must be set}"
: "${DB_PASS:?must be set}"
: "${DB_NAME:?must be set}"

PROXY_PORT="${PROXY_PORT:-5432}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$SCRIPT_DIR/../api"

if ! command -v cloud-sql-proxy >/dev/null 2>&1; then
	echo "migrate.sh: cloud-sql-proxy not found on PATH" >&2
	echo "migrate.sh: install it: https://cloud.google.com/sql/docs/postgres/sql-proxy#install" >&2
	exit 1
fi

cloud-sql-proxy --port "$PROXY_PORT" "$INSTANCE_CONNECTION_NAME" &
PROXY_PID=$!
trap 'kill "$PROXY_PID" 2>/dev/null || true; wait "$PROXY_PID" 2>/dev/null || true' EXIT

echo "migrate.sh: waiting for Cloud SQL Auth Proxy on 127.0.0.1:$PROXY_PORT ..."
proxy_ready=false
for _ in $(seq 1 30); do
	if (exec 3<>"/dev/tcp/127.0.0.1/$PROXY_PORT") 2>/dev/null; then
		exec 3>&-
		proxy_ready=true
		break
	fi
	sleep 1
done
if [ "$proxy_ready" != true ]; then
	echo "migrate.sh: Cloud SQL Auth Proxy did not become ready within 30s" >&2
	exit 1
fi

# The proxy encrypts the hop to Cloud SQL, so the local hop needs no TLS.
# The password goes in PGPASSWORD, not in the DSN, so a password with
# characters such as @, / or : needs no URL encoding.
export PGPASSWORD="$DB_PASS"
DSN="host=127.0.0.1 port=${PROXY_PORT} user=${DB_USER} dbname=${DB_NAME} sslmode=disable"

echo "migrate.sh: applying goose migrations..."
(cd "$API_DIR" && go tool goose postgres "$DSN" -dir=db/migrations up)
echo "migrate.sh: migrations applied."
