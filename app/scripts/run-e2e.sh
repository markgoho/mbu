#!/usr/bin/env bash
set -e

echo "Stopping any running Firebase emulators..."
pkill -f 'firebase emulators' 2>/dev/null || true

port=9099
max_wait=5
elapsed=0
while lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; do
  if [ $elapsed -ge $max_wait ]; then
    echo "ERROR: Port $port is still in use after ${max_wait}s."
    exit 1
  fi
  sleep 1
  elapsed=$((elapsed + 1))
done

echo "Running E2E tests..."
playwright test --config=e2e/playwright.config.ts "$@"
