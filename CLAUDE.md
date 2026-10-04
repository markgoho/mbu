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

### Local event platform

Run these in the repo root. `api/docs/environment.md` has the ports and values.

```bash
bun run dev:platform   # Postgres, Auth emulator, Go API (:8080) and the app dev server (:4200); Ctrl-C stops all
bun run dev:api        # The same stack without the app dev server
bun run seed:platform  # Seed data and verified Auth emulator accounts (password: password123)
```

### Event platform app (`app/`)

`app/` is a separate project: the event-platform SPA. It is SvelteKit 3 with Svelte 5 runes, built as a static SPA (no SSR). Run these commands in `app/`:

```bash
bun run dev        # Dev server on http://localhost:4200
bun run check      # Type-check with svelte-check
bun run lint       # ESLint
bun run test:unit  # Vitest: browser project (*.svelte.spec.ts) and Node project (*.spec.ts)
bun run test:e2e   # Playwright smoke suite (e2e/*.e2e.ts); starts its own servers
bun run build      # Static build into app/build/
```

Before you change `app/`, read `app/README.md` (the rules for loads, guards, domain modules, atoms and specs) and use the `svelte-code-writer` and `svelte-core-bestpractices` skills. `.claude/rules/svelte-tests.md` loads automatically for the specs. The reasons are in `app/docs/adr/0002-app-spa-is-sveltekit.md`. After `bun run test:e2e`, `app/build/` is a build that connects to the Auth emulator: run `bun run build` again.

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

The Go API's Badge Catalog (`api/internal/catalog/badges.json`) is generated from this file. After a change to it, run `bun run generate:badge-catalog` and commit the JSON. CI runs `bun run check:badge-catalog` and fails when the JSON is out of date.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (`gh` CLI); external PRs are not treated as a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical role names are used as-is (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context layout: `CONTEXT-MAP.md` at the root points to the Hugo-site context (root `CONTEXT.md` + `docs/adr/`) and the event-platform context (`api/CONTEXT.md` + `api/docs/adr/`; the app decision is in `app/docs/adr/0002-app-spa-is-sveltekit.md`). See `docs/agents/domain.md`.

# Intrinsic Web Design & Sizing

Always design content-out using Intrinsic Web Design principles rather than hardcoding dimensions or relying on breakpoint-heavy overrides. For aligned icon-and-text headers, use CSS Grid with `min-content 1fr` columns and `auto` rows, letting icons span the text rows with `height: 100%; aspect-ratio: 1 / 1; align-self: center;` so
their size is derived purely from the sibling content height. Use `display: contents` on semantic heading wrappers so nested children participate directly in the parent grid tracks.
