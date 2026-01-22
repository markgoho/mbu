# Story 1.1: Generate and Display Difficulty Ratings for All 143 Badges

Status: ready-for-dev

## Story

As a scout,
I want to see difficulty ratings (1-5 scale) for each merit badge,
So that I can choose badges that match my skill level and available time.

## Acceptance Criteria

**Given** the merit badge requirements exist in data.json files
**When** I run the difficulty generation script
**Then** all 143 badges have difficulty scores (1-5) stored in data.json metadata object
**And** difficulty scores also populate frontmatter for Hugo taxonomy
**And** difficulty ratings display with star icons (⭐) on existing badge pages
**And** the script uses Gemini API with proper error handling and GEMINI_API_KEY validation
**And** difficulty ratings are visible on both badge detail pages and list pages

**Given** I am viewing a badge page
**When** the page loads
**Then** I see the difficulty rating displayed prominently (e.g., "Difficulty: ⭐⭐⭐ (3/5)")
**And** the difficulty includes aria-label for screen reader accessibility
**And** the rating uses stars + text + color (not color-only) per UX-17

**Given** the TypeScript types are needed for metadata structure
**When** I create the types.ts file
**Then** it includes interfaces for Badge, Metadata, Difficulty, TimeEstimate, Skills, Location
**And** follows ARCH-12 naming conventions (snake_case for JSON fields)
**And** is placed in scripts/ directory per ARCH-13

## Tasks / Subtasks

- [ ] Task 1: Create TypeScript types for metadata structure (AC: Types file created)
  - [ ] Create `scripts/types.ts` with interfaces for Badge, Metadata, Difficulty, TimeEstimate, Skills, Location
  - [ ] Use snake_case for JSON field names per ARCH-12
  - [ ] Use PascalCase for interface names
  - [ ] Export interfaces for use across all metadata generation scripts

- [ ] Task 2: Create difficulty generation script (AC: Script generates valid difficulty scores 1-5)
  - [ ] Create `scripts/generate-difficulty.ts` per ARCH-9
  - [ ] Validate GEMINI_API_KEY environment variable at startup (fail fast if missing)
  - [ ] Read all 143 badges from existing data.json files
  - [ ] Use Gemini API to analyze requirements and generate difficulty score 1-5
  - [ ] Fail fast on API errors per ARCH-9 (do not continue with partial data)
  - [ ] Update data.json with metadata.difficulty field (extend existing structure per ARCH-7)
  - [ ] Update _index.md frontmatter with difficulty: [score] array per ARCH-8
  - [ ] Use atomic update pattern (update both files or neither)
  - [ ] Add BADGE_SLUGS environment variable support for subset testing
  - [ ] Format error messages with `[generate-difficulty]` prefix per ARCH-15

- [ ] Task 3: Create difficulty rating Hugo partial component (AC: Component displays stars with accessibility)
  - [ ] Create `hugo/layouts/partials/difficulty-rating.html` per ARCH-13
  - [ ] Display 1-5 stars based on difficulty score using ⭐ emoji per UX-6
  - [ ] Include aria-label for screen readers (e.g., "Difficulty: 3 out of 5") per FR57
  - [ ] Use stars + text + color (not color-only) per FR57, UX-17
  - [ ] Accept difficulty parameter via dict pattern per ARCH-14
  - [ ] Use `with` block for backward compatibility if metadata missing per ARCH-14

- [ ] Task 4: Create difficulty rating SCSS component (AC: Component styled with design tokens)
  - [ ] Create `hugo/assets/scss/components/difficulty-rating.scss` per ARCH-13
  - [ ] Use CSS custom properties (var(--space-*, --olive-*, etc.)) per ARCH-13
  - [ ] Do NOT import colors/spacing/typography (use CSS custom properties only)
  - [ ] Style stars with appropriate spacing and color
  - [ ] Ensure mobile-responsive design per UX-14

- [ ] Task 5: Integrate difficulty rating into badge detail page template (AC: Difficulty displays on badge pages)
  - [ ] Update `hugo/layouts/merit-badges/single.html`
  - [ ] Add difficulty-rating partial call using `with` block per ARCH-14
  - [ ] Pass difficulty from $data.metadata.difficulty using dict pattern
  - [ ] Display prominently near top of page per FR13
  - [ ] Ensure backward compatibility with `with` blocks per ARCH-1

- [ ] Task 6: Integrate difficulty rating into badge list/card template (AC: Difficulty visible on list pages)
  - [ ] Update badge card partial (likely `hugo/layouts/partials/badge-card.html`)
  - [ ] Add difficulty-rating partial call using `with` block per ARCH-14
  - [ ] Ensure difficulty visible without hovering per FR19
  - [ ] Test responsive display on mobile per UX-14

- [ ] Task 7: Configure Hugo taxonomy for difficulty (AC: Taxonomy pages generated)
  - [ ] Update `hugo/hugo.toml` with taxonomy definition per ARCH-5
  - [ ] Add: `difficulty = "difficulty"` to [taxonomies] section
  - [ ] Verify Hugo auto-generates 5 difficulty pages (/difficulty/1/ through /difficulty/5/)

- [ ] Task 8: Run validation and testing (AC: All validation passes, subset test successful)
  - [ ] Test on 3 badges first: BADGE_SLUGS="archery,camping,first-aid" bun run generate-difficulty
  - [ ] Manually inspect generated metadata for quality
  - [ ] Refine Gemini prompts if needed
  - [ ] Run on all 143 badges: bun run generate-difficulty
  - [ ] Run Hugo build to verify no errors
  - [ ] Verify difficulty taxonomy pages exist
  - [ ] Check Lighthouse accessibility score = 100 per NFR8

## Dev Notes

### 🚨 CRITICAL ARCHITECTURAL GUARDRAILS (MUST FOLLOW)

**Brownfield Enhancement Strategy:**
- This is ARCH-1: We are enhancing an existing, working Hugo site with 143 badges already live
- All changes must be backward compatible using `with` blocks in templates
- NO template scaffolding or starter templates needed
- Existing data.json files must be extended (not replaced)

**Data Storage Pattern (ARCH-7, ARCH-8):**
- Extend existing data.json with new `metadata` object containing `difficulty` field
- ALSO update _index.md frontmatter with `difficulty: [score]` array for Hugo taxonomy
- Both updates must happen atomically (update both or neither)
- Use snake_case for JSON field names: `metadata.difficulty` NOT `metadata.Difficulty`

**Naming Conventions (ARCH-12 - MUST FOLLOW EXACTLY):**
- Script filename: `generate-difficulty.ts` (kebab-case)
- JSON field: `metadata.difficulty` (snake_case)
- Frontmatter field: `difficulty: [3]` (snake_case, array)
- SCSS component: `difficulty-rating.scss` (kebab-case)
- Hugo partial: `difficulty-rating.html` (kebab-case)
- TypeScript variables: Full names (difficulty NOT diff, error NOT err) per unicorn/prevent-abbreviations

**File Organization (ARCH-13 - EXACT PATHS):**
- Script location: `scripts/generate-difficulty.ts`
- Types location: `scripts/types.ts`
- Partial location: `hugo/layouts/partials/difficulty-rating.html`
- SCSS location: `hugo/assets/scss/components/difficulty-rating.scss`

**AI Service Integration (ARCH-9):**
- Use Google Gemini API for difficulty generation
- Validate GEMINI_API_KEY at script startup (fail fast if missing)
- Fail fast on API errors - DO NOT continue with partial data
- Error message format: `[generate-difficulty] Context: Details` per ARCH-15

**Hugo Template Integration (ARCH-14):**
- Use `with` blocks for backward compatibility when accessing metadata
- Pass parameters using dict: `{{ partial "difficulty-rating.html" (dict "difficulty" .difficulty) }}`
- Map slugs to display names where needed (though difficulty uses numbers)

**Validation Requirements (ARCH-10):**
- Difficulty score MUST be 1-5 (integer)
- data.json and frontmatter MUST stay in sync
- Frontmatter uses array format: `difficulty: [3]` NOT `difficulty: 3`

### Technical Implementation Details

**TypeScript Types (scripts/types.ts):**
```typescript
// Must follow ARCH-12 naming: PascalCase interfaces, snake_case fields

export interface BadgeMetadata {
  difficulty: number;  // 1-5 scale
  // Future fields for other stories (not implemented yet):
  // time_estimate?: TimeEstimate;
  // skills?: string[];
  // location?: Location;
}

export interface MeritBadge {
  title: string;
  slug: string;
  url: string;
  eagle_required: boolean;
  pamphlet_url?: string;
  requirements: Requirement[];
  metadata?: BadgeMetadata;  // New field for Phase 1
}

// Additional interfaces as needed
```

**Difficulty Generation Script Pattern:**
```typescript
// scripts/generate-difficulty.ts

// 1. Validate GEMINI_API_KEY at startup (fail fast)
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('[generate-difficulty] Missing GEMINI_API_KEY environment variable');
}

// 2. Support subset testing via BADGE_SLUGS
const testBadges = process.env.BADGE_SLUGS?.split(',');
const badges = testBadges
  ? allBadges.filter(b => testBadges.includes(b.slug))
  : allBadges;

// 3. Generate difficulty for each badge
for (const badge of badges) {
  try {
    const difficulty = await generateDifficultyScore(badge);
    await updateBadgeMetadata(badge.slug, { difficulty });
  } catch (error) {
    // Fail fast - do not continue with partial data
    console.error(`[generate-difficulty] Failed on badge ${badge.slug}: ${error.message}`);
    process.exit(1);
  }
}

// 4. Atomic update function
async function updateBadgeMetadata(slug: string, metadata: Partial<BadgeMetadata>) {
  const dataPath = `hugo/content/merit-badges/${slug}/data.json`;
  const indexPath = `hugo/content/merit-badges/${slug}/_index.md`;

  // Read existing data
  const data = await Bun.file(dataPath).json();

  // Extend with metadata (non-destructive)
  data.metadata = { ...data.metadata, ...metadata };

  // Write atomically
  await Bun.write(dataPath, JSON.stringify(data, null, 2));

  // Update frontmatter for Hugo taxonomy
  await updateFrontmatter(indexPath, {
    difficulty: [metadata.difficulty]  // Array format required
  });
}
```

**Hugo Partial Pattern:**
```html
<!-- hugo/layouts/partials/difficulty-rating.html -->

<!-- Use with block for backward compatibility -->
{{ with .difficulty }}
  <div class="difficulty-rating" aria-label="Difficulty: {{ . }} out of 5">
    <span class="stars">
      {{ range (seq .) }}⭐{{ end }}
    </span>
    <span class="text">({{ . }}/5)</span>
  </div>
{{ end }}
```

**SCSS Component Pattern:**
```scss
// hugo/assets/scss/components/difficulty-rating.scss

// Use CSS custom properties only - NO imports per ARCH-13
.difficulty-rating {
  display: flex;
  gap: var(--space-3xs);
  align-items: center;

  .stars {
    color: var(--olive-500);  // Earth-tone color per UX-3
    font-size: var(--step--1);
  }

  .text {
    color: var(--olive-700);
    font-weight: 600;
    font-size: var(--step--1);
  }
}
```

**Template Integration Pattern:**
```go
// hugo/layouts/merit-badges/single.html

{{ $data := .Site.Data.merit_badges[.Params.slug].data }}

<!-- Existing requirements display - UNCHANGED -->
{{ range $data.requirements }}
  {{ partial "requirement.html" . }}
{{ end }}

<!-- NEW: Phase 1 metadata display with backward compatibility -->
{{ with $data.metadata }}
  <div class="badge-metadata">
    {{ partial "difficulty-rating.html" (dict "difficulty" .difficulty) }}
  </div>
{{ end }}
```

### Latest Technical Knowledge (Web Research Findings)

**Gemini API (January 2025):**
- Latest stable version: Gemini 1.5 Pro (recommended for structured outputs)
- API endpoint: `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent`
- Rate limits: 60 requests per minute (free tier), 1000/min (paid)
- Best practice: Sequential processing with 500-1500ms delays per ARCH-9
- Structured output format: Use JSON mode for consistent difficulty scoring

**Hugo Extended Version (January 2025):**
- Required: Hugo Extended >= 0.129.0 for SCSS/Sass processing
- Current stable: v0.140.1 (verified compatible)
- Taxonomy system: Native Hugo feature, highly optimized for thousands of pages
- Build performance: Validated sub-second builds for 143 badges + 53 taxonomy pages per ARCH-4

**Bun Runtime (January 2025):**
- Current stable: v1.1.38
- TypeScript: Native support with strict mode
- File I/O: `Bun.file().json()` for reading, `Bun.write()` for writing
- Performance: Significantly faster than Node.js for TypeScript execution

**WCAG 2.1 AA Requirements (January 2025):**
- Text contrast: 4.5:1 minimum for normal text per NFR11
- UI component contrast: 3:1 minimum per NFR11
- Aria-labels: Required for emoji icons ⭐ (announce as "star" not emoji code)
- Focus indicators: 3px minimum, high-contrast outline per UX-13
- Lighthouse accessibility: Score of 100 required per NFR8

### Project Structure Notes

**Existing Hugo Architecture:**
```
hugo/
├── content/merit-badges/
│   ├── archery/
│   │   ├── _index.md          # Frontmatter (extend with difficulty: [3])
│   │   └── data.json           # Badge data (extend with metadata.difficulty)
│   ├── camping/
│   │   ├── _index.md
│   │   └── data.json
│   └── ... (143 badges total)
├── layouts/
│   ├── merit-badges/
│   │   └── single.html         # Badge detail page (integrate difficulty display)
│   └── partials/
│       └── difficulty-rating.html  # NEW: Phase 1 component
├── assets/scss/
│   ├── components/
│   │   └── difficulty-rating.scss  # NEW: Phase 1 styling
│   ├── colors.scss             # Provides CSS custom properties (--olive-*, --tan-*)
│   ├── spacing.scss            # Provides CSS custom properties (--space-*)
│   └── typography.scss         # Provides CSS custom properties (--step-*)
└── hugo.toml                   # Add difficulty taxonomy configuration
```

**Script Architecture:**
```
scripts/
├── types.ts                    # NEW: Shared TypeScript interfaces
├── generate-difficulty.ts      # NEW: Difficulty generation
├── merit-badges.ts             # EXISTING: Static list of 143 badges
└── sync-requirements.ts        # EXISTING: Scraper (do not modify)
```

**Key Files to Read/Modify:**
- `hugo/content/merit-badges/archery/data.json` - Example badge data structure
- `hugo/layouts/merit-badges/single.html` - Badge detail page template
- `hugo/layouts/partials/badge-card.html` - Badge list card (likely location)
- `hugo/hugo.toml` - Hugo configuration (add taxonomy)
- `scripts/merit-badges.ts` - List of all 143 badges for iteration

### Alignment with Unified Project Structure

**Project Context Reference:**
- See `project-context.md` for comprehensive development guidelines (if exists)
- See `CLAUDE.md` for project-specific Claude instructions
- Follow existing code style patterns observed in scripts/ directory

**Detected Patterns from Codebase:**
- Script naming: kebab-case (detect-related-badges.ts, sync-requirements.ts) ✅
- TypeScript: Strict mode enabled, explicit return types required ✅
- SCSS: Component-based, uses CSS custom properties ✅
- Hugo templates: Semantic HTML, accessibility-first ✅
- Error handling: Fail-fast pattern for data integrity ✅

**No Conflicts Detected:**
- Phase 1 additions are purely additive (extend, don't replace)
- Backward compatibility ensured via `with` blocks
- Existing templates and styles remain functional

### Testing Strategy

**Subset Testing (Critical First Step):**
```bash
# Test on 3 badges first
BADGE_SLUGS="archery,camping,first-aid" bun run generate-difficulty

# Manually inspect output
cat hugo/content/merit-badges/archery/data.json | grep -A5 metadata
cat hugo/content/merit-badges/archery/_index.md | grep difficulty

# Verify quality of AI output
# - Does difficulty score make sense?
# - Is it in valid range 1-5?
# - Are both data.json and frontmatter updated?
```

**Full Generation:**
```bash
# After subset validation passes
bun run generate-difficulty

# Run Hugo build to verify no errors
cd hugo && hugo --minify

# Check taxonomy pages exist
ls -la hugo/public/difficulty/
```

**Accessibility Testing:**
```bash
# Run Lighthouse audit
lighthouse https://localhost:1313/merit-badges/archery/ --only-categories=accessibility

# Expected: Score of 100 per NFR8
```

**Visual Testing:**
- [ ] Difficulty stars display correctly on badge detail pages
- [ ] Difficulty stars display correctly on badge list pages
- [ ] Stars + text visible (not color-only) per FR57
- [ ] Responsive layout works on mobile (320px+) per UX-14
- [ ] Focus indicators visible for keyboard navigation per NFR9

### References

**Source Documents:**
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements FR13, FR25]
- [Source: _bmad-output/planning-artifacts/architecture.md#ARCH-1, ARCH-7, ARCH-8, ARCH-9, ARCH-12, ARCH-13, ARCH-14]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-6, UX-13, UX-17]
- [Source: CLAUDE.md#Tech Stack - Hugo, Bun, TypeScript]

**External Documentation:**
- Google Gemini API: https://ai.google.dev/docs
- Hugo Taxonomies: https://gohugo.io/content-management/taxonomies/
- WCAG 2.1 AA: https://www.w3.org/WAI/WCAG21/quickref/
- Bun Documentation: https://bun.sh/docs

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (1M context)

### Debug Log References

N/A - Story file created, implementation not yet started

### Completion Notes List

- Story file created with comprehensive developer context
- All architectural requirements documented (ARCH-1 through ARCH-15)
- Testing strategy defined with subset testing approach
- No previous story learnings to incorporate (this is first story)

### File List

**Files to Create:**
- `scripts/types.ts` - TypeScript interfaces
- `scripts/generate-difficulty.ts` - Difficulty generation script
- `hugo/layouts/partials/difficulty-rating.html` - Display component
- `hugo/assets/scss/components/difficulty-rating.scss` - Component styling

**Files to Modify:**
- `hugo/hugo.toml` - Add difficulty taxonomy configuration
- `hugo/layouts/merit-badges/single.html` - Integrate difficulty display
- `hugo/layouts/partials/badge-card.html` - Integrate difficulty display (if exists)
- `hugo/content/merit-badges/*/data.json` - All 143 badge data files (extend with metadata)
- `hugo/content/merit-badges/*/_index.md` - All 143 frontmatter files (add difficulty array)
