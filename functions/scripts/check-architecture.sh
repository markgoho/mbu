#!/usr/bin/env bash
#
# Structural architecture check for the Elysia API modules — the one invariant
# ESLint can't express: required directories/files must EXIST. (A missing
# routes/ dir produces no file for ESLint to lint.) Test placement and content
# rules live in eslint.config.js; this only asserts the module shape.
# See docs/adr/0001-api-module-architecture.md.
#
# Run from functions/:  npm run check:arch
set -euo pipefail

cd "$(dirname "$0")/.."
fail=0
err() {
  echo "  ✗ $1"
  fail=1
}

echo "Checking API module structure…"

# Every deployed *-api module has the reference shape. shared-api is the shared
# library (no routes/deployed app), so it is exempt.
for dir in src/*-api; do
  module=$(basename "$dir")
  [ "$module" = "shared-api" ] && continue
  for required in routes plugins app.ts handler.ts; do
    if [ ! -e "$dir/$required" ]; then
      err "$module is missing $required (see health-api for the reference layout)"
    fi
  done
done

if [ "$fail" -ne 0 ]; then
  echo ""
  echo "Architecture check FAILED. See docs/adr/0001-api-module-architecture.md."
  exit 1
fi

echo "  ✓ all API modules conform"

