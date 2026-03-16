#!/usr/bin/env bash
set -euo pipefail

for dir in hugo/content/merit-badges/*/guide; do
  [ -f "$dir/_index.md" ] || continue

  badge=$(basename "$(dirname "$dir")")
  badge_name=$(python3 - <<'PY2' "$dir/_index.md"
from pathlib import Path
import re
import sys
text = Path(sys.argv[1]).read_text()
match = re.search(r'badge_name:\s*"([^"]+)"', text)
if not match:
    raise SystemExit('badge_name not found')
print(match.group(1))
PY2
)

  mkdir -p "$dir/print"
  cat > "$dir/print/index.md" <<EOF
---
title: "Complete Digital Resource Guide"
layout: guide-print
badge_name: "$badge_name"
noindex: true
canonical_override: "/merit-badges/${badge}/guide/"
build:
  list: never
---
EOF
done
