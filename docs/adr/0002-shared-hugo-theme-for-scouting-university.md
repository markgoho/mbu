# ADR 0002 — Shared Hugo theme repo for scouting.university

- **Status:** Accepted
- **Date:** 2026-08-17
- **Related:** [Shared Hugo theme for scouting.university](https://github.com/markgoho/mbu/issues/128) (wayfinder map)

## Context

A second site, scouting.university, is planned: same site mechanics as MBU
(page-bundle content, rank-and-requirement tree, per-rank field guide,
search, print pages), applied to Scouts BSA ranks instead of merit badges.
The visual design should be virtually identical between the two sites. The
options were a monorepo holding both sites, two fully independent repos, or
two content repos plus a third repo holding only the shared design system.

## Decision

**Three repos:** `mbu` (this repo, merit badge content), a new
`scouting-university` repo (rank content, built later), and a new theme repo
holding the shared Hugo design system. Sites consume the theme as a
**Hugo Module** (Go-modules-based), pinning and bumping a version rather
than inheriting changes automatically.

**The theme starts as a pure visual/component library** — CSS design
tokens, generic chrome (header/footer/search), not content-type-specific
layouts. `hugo/layouts/merit-badges/*` stays in `mbu` for now; content-type
layouts migrate into the theme later only once real duplication is visible
against scouting.university's equivalents. Extraction proceeds
conservatively: one or two simple partials first, proven by retrofitting
`mbu` to consume the theme module, before pulling more out.

**Explicitly out of scope for the theme:** the requirement engine (scraper,
requirement-path system, `scaffold-drg.ts`, verifiers) and the Claude Code
DRG skills. Both are judged specific enough to merit badge requirements
that scouting.university needs its own adapted form rather than a shared
package — tracked as separate future efforts, not part of this decision.

## Consequences

- `mbu`'s Hugo build gains a Go-toolchain dependency at authoring time
  (`hugo mod vendor`), but not in CI: `hugo/_vendor` is committed and kept
  in sync on every pin bump, so CI builds from the vendored copy without a
  Go toolchain. See [Evaluate the pilot and decide the extraction
  roadmap](https://github.com/markgoho/mbu/issues/132).
- No local-editing workflow (`go.work`) between the theme and a consuming
  site — evaluated and dropped as unnecessary ceremony for a solo dev; the
  loop is edit/commit/push `uni-theme`, then `hugo mod get -u && hugo mod
  vendor` in the consumer.
- Theme changes are **not deliberately batched**: every push to
  `uni-theme`'s `master` opens an auto-generated pin-bump PR in each
  consumer, carrying the new `uni-theme` commits as a changelog. Landing a
  change is still a deliberate, reviewed merge — just automatically
  proposed rather than manually noticed. There is no semver; commit-pinned
  pseudo-versions plus the changelog are what a reviewer judges risk from.
- scouting.university's content pipeline (data sync, requirement engine,
  Claude tooling) is a separate, later effort with no shared code from
  `mbu` beyond the theme.
