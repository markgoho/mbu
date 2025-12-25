# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Merit Badge University (MBU) is a Hugo-based static site that provides comprehensive information about Scouting America merit badges. The site scrapes merit badge requirements from scouting.org and renders them in a user-friendly format at https://merit-badge.university/.

## Tech Stack

- **Static Site Generator**: Hugo (requires extended version >= 0.129.0 for SCSS/Sass processing)
- **Runtime**: Bun (JavaScript/TypeScript runtime)
- **Styling**: SCSS with Dart Sass transpiler
- **Deployment**: Firebase Hosting (via GitHub Actions)
- **Scraping**: Cheerio + Impit (TLS fingerprint mimicry)

## Essential Commands

### Development
```bash
# Start Hugo development server with live reload
bun run hugo:dev
# Runs: cd hugo && hugo server --disableFastRender -D
```

### Content Syncing
```bash
# Sync all merit badge requirements from scouting.org
bun run sync:badges
# Runs: bun scripts/sync-requirements.ts

# Sync a single merit badge (faster for testing)
BADGE_NAME="camping" bun run sync:badges

# Test mode - sync only 3 badges (archery, camping, first-aid)
TEST_MODE=1 bun run sync:badges
```

### Building
```bash
# Build the Hugo site (output: hugo/public/)
bun run build
# Runs: cd hugo && hugo --minify
```

### Code Quality
```bash
# Format code with Prettier
bunx prettier --write .
```

## Project Structure

### Hugo Architecture

```
hugo/
├── content/merit-badges/        # Merit badge content (auto-generated)
│   ├── {badge-slug}/
│   │   ├── _index.md           # Badge landing page markdown
│   │   ├── data.json           # Scraped requirements data
│   │   └── requirements/
│   │       └── index.md        # Requirements page
├── layouts/
│   ├── _default/
│   │   └── baseof.html         # Base template with block system
│   ├── merit-badges/
│   │   ├── list.html           # Badge listing page
│   │   └── single.html         # Individual badge landing page
│   ├── partials/               # Reusable template components
│   └── index.html              # Homepage
├── assets/                      # SCSS/JS source files
├── static/                      # Static assets (copied as-is)
└── public/                      # Build output (git-ignored)
```

### Scripts Architecture

```
scripts/
├── merit-badges.ts              # Static list of all 143 merit badges
├── sync-requirements.ts         # Main scraper script
├── debug-req6.ts               # Debug helpers
└── debug-beef-cattle.ts        # Debug helpers
```

### Key Template Features

**Base Template** (`layouts/_default/baseof.html`):
- Defines extensibility via blocks: `hero`, `header`, `main`, `footer`, `head-styles`, `head-scripts`, `footer-scripts`
- Inlines critical CSS in `<head>` for performance
- Loads non-critical CSS separately
- Includes OpenGraph meta tags via `partial "opengraph.html"`

**SCSS Processing**:
```go
{{ $options := (dict "transpiler" "dartsass" "outputStyle" "compressed") }}
{{ $inlineCSS := resources.Get $pageCSS | css.Sass $options }}
```

### Data Structure

Each merit badge has a `data.json` file with the following structure:
```json
{
  "title": "Archery",
  "slug": "archery",
  "url": "https://www.scouting.org/merit-badges/archery/",
  "eagle_required": false,
  "pamphlet_url": "https://filestore.scouting.org/.../Archery.pdf",
  "requirements": [
    {
      "req_id": "1",
      "path": "1",
      "text": "Do the following:",
      "subrequirements": [...],
      "subrequirement_mode": {
        "type": "all" | "select",
        "count": 1  // For "select ONE", "select TWO", etc.
      },
      "resources": [
        {"title": "Resource Name", "url": "https://..."}
      ]
    }
  ]
}
```

**Requirement Path System**:
- Paths use dots as separators for URL-friendly anchors (e.g., "1.a.2")
- Top-level requirements have path equal to their ID (e.g., "1")
- Nested requirements append to parent path: "1" → "1.a" → "1.a.2"

**Named Options**: Some badges have named option requirements (e.g., "Beef Cattle Option"). These use slugified IDs instead of letters/numbers.

## Scraping System

The scraper in `scripts/sync-requirements.ts` uses:

1. **Static Badge List**: `scripts/merit-badges.ts` contains all 143 merit badges (title, slug, URL, eagle_required flag). This eliminates the need to scrape the index page.

2. **TLS Fingerprint Mimicry**: Uses Impit library to mimic Chrome browser and avoid rate limiting/blocking.

3. **Recursive Extraction**: The `extractSubrequirements()` function recursively processes nested requirements at any depth, handling:
   - Standard format: `(a)`, `(b)`, etc.
   - Numbered format: `1.`, `2.`, etc.
   - Named options: "Beef Cattle Option"
   - Inline lists within requirements
   - Resources embedded in requirement text

4. **Deduplication**: Scouting.org HTML sometimes contains duplicate elements. The scraper uses Maps to deduplicate by `req_id` or text hash.

5. **Rate Limiting**: Random delays (500-1500ms) between requests to avoid overwhelming scouting.org.

## Deployment

- **CI/CD**: GitHub Actions workflows in `.github/workflows/`
  - `firebase-hosting-merge.yml`: Deploys to production on push to `trunk`
  - `firebase-hosting-pull-request.yml`: Creates preview deploys for PRs
  - `docker-image.yml`: Builds Docker image with Hugo + Bun
- **Container**: Uses custom Docker image (`ghcr.io/{repo}:trunk`) with Hugo extended and Bun pre-installed
- **Output**: Hugo builds to `hugo/public/`, which Firebase hosts

## Code Style

- **Prettier**: Enforced via `.prettierrc`
  - Double quotes, semicolons, 80 char width
  - Special parser for Hugo templates (`go-template`)
  - Auto-organize imports
- **TypeScript**: Strict mode enabled, Bun module resolution

## Important Notes

- Main branch is `trunk`, not `main` or `master`
- Hugo requires extended version for SCSS processing (Dart Sass)
- Merit badge data is auto-generated - do not manually edit `data.json` files
- The scraper is sequential (not parallel) to maintain stability and avoid rate limiting
- Content is stored in Hugo page bundles (directory per badge with index.md + resources)
