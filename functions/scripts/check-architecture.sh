#!/usr/bin/env bash
#
# Structural architecture checks for the Elysia API modules — the invariants
# ESLint can't express as syntax rules. Fails CI when a module drifts from the
# reference layout (see docs/adr/0001-api-module-architecture.md).
#
# Run from functions/:  npm run check:arch
set -euo pipefail

cd "$(dirname "$0")/.."
fail=0
err() {
  echo "  ✗ $1"
  fail=1
}

echo "Checking API module architecture…"

# 1. Every test is a per-route boundary test living in a routes/ directory.
#    (No whole-app app.test.ts, no standalone service-layer tests.)
stray_tests=$(find src -name '*.test.ts' | grep -v '/routes/' || true)
if [ -n "$stray_tests" ]; then
  err "test files outside a routes/ directory (tests must be per-route boundary tests):"
  echo "$stray_tests" | sed 's/^/      /'
fi

app_tests=$(find src -name 'app.test.ts' || true)
if [ -n "$app_tests" ]; then
  err "app.test.ts found (test each route in routes/, not the whole app):"
  echo "$app_tests" | sed 's/^/      /'
fi

# 2. Every deployed *-api module has the reference shape. shared-api is the
#    shared library (no routes/deployed app), so it is exempt.
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
