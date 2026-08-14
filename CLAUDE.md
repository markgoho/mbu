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

# Intrinsic Web Design & Sizing

Always design content-out using Intrinsic Web Design principles rather than hardcoding dimensions or relying on breakpoint-heavy overrides. For aligned icon-and-text headers, use CSS Grid with `min-content 1fr` columns and `auto` rows, letting icons span the text rows with `height: 100%; aspect-ratio: 1 / 1; align-self: center;` so
their size is derived purely from the sibling content height. Use `display: contents` on semantic heading wrappers so nested children participate directly in the parent grid tracks.
