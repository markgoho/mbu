# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Merit Badge University (MBU) is a Hugo-based static site that provides comprehensive information about Scouting America merit badges. The site scrapes merit badge requirements from scouting.org and renders them in a user-friendly format at https://merit-badge.university/.

## Essential Commands

### Development

```bash
# Start Hugo development server with live reload
bun run hugo:dev
```

### Content Syncing

```bash
# Sync all merit badge requirements from scouting.org
bun run sync:badges

# Sync a single merit badge (faster for testing)
BADGE_NAME="camping" bun run sync:badges

# Test mode - sync only 3 badges (archery, camping, first-aid)
TEST_MODE=1 bun run sync:badges

# Firecrawl fallback path
bun run sync:badges:firecrawl
```

### Related Badge Link Detection

```bash
# Detect and inject markdown links to related badges in requirement text
bun run detect:links

# Process specific badges only (for testing)
BADGE_SLUGS="camping,hiking,swimming" bun run detect:links
```

### Building

```bash
# Build the Hugo site (output: hugo/public/)
bun run build
```

## Data Structure

**Requirement Path System**:

- Paths use dots as separators for URL-friendly anchors (e.g., "1.a.2")
- Top-level requirements have path equal to their ID (e.g., "1")
- Nested requirements append to parent path: "1" → "1.a" → "1.a.2"

**Named Options**: Some badges have named option requirements (e.g., "Beef Cattle Option"). These use slugified IDs instead of letters/numbers.

## Important Notes

- Main branch is `trunk`, not `main` or `master`
- Hugo requires extended version for SCSS processing (Dart Sass)
- Merit badge data is auto-generated - do not manually edit `data.json` files
- The scraper is sequential (not parallel) to maintain stability and avoid rate limiting
- Content is stored in Hugo page bundles (directory per badge with index.md + resources)

## Merit Badges

A complete list of merit badges can be found at `scripts/merit-badges.ts`. If for any reason you need to loop over these merit badges, please use this file as an input.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (`gh` CLI); external PRs are not treated as a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical role names are used as-is (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context layout: `CONTEXT-MAP.md` at the root points to the Hugo-site context (root `CONTEXT.md` + `docs/adr/`) and the event-platform context (`functions/CONTEXT.md` + `functions/docs/adr/`). See `docs/agents/domain.md`.

<!-- rtk-instructions v2 -->

# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:

```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)

```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (60-99% savings)

```bash
rtk cargo test          # Cargo test failures only (90%)
rtk go test             # Go test failures only (90%)
rtk jest                # Jest failures only (99.5%)
rtk vitest              # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk pytest              # Python test failures only (90%)
rtk rake test           # Ruby test failures only (90%)
rtk rspec               # RSpec test failures only (60%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)

```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)

```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)

```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
rtk uv run <cmd>        # Compact uv project command output
```

### Files & Search (60-75% savings)

```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%). Format flags (-c, -l, -L, -o, -Z) run raw.
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)

```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)

```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)

```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands

```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category         | Commands                       | Typical Savings |
| ---------------- | ------------------------------ | --------------- |
| Tests            | vitest, playwright, cargo test | 90-99%          |
| Build            | next, tsc, lint, prettier      | 70-87%          |
| Git              | status, log, diff, add, commit | 59-80%          |
| GitHub           | gh pr, gh run, gh issue        | 26-87%          |
| Package Managers | pnpm, npm, npx                 | 70-90%          |
| Files            | ls, read, grep, find           | 60-75%          |
| Infrastructure   | docker, kubectl                | 85%             |
| Network          | curl, wget                     | 65-70%          |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->
