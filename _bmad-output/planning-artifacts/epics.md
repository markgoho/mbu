---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
workflowComplete: true
completionDate: '2026-01-21'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
totalEpics: 5
totalStories: 22
totalRequirements: 141
---

# mbu - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for mbu, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**Content Discovery & Navigation:**
- FR1: Scouts can browse all merit badges organized by skill area
- FR2: Scouts can browse all merit badges organized by location requirement (indoor/outdoor/flexible)
- FR3: Scouts can browse all merit badges organized by difficulty level (1-5)
- FR4: Scouts can browse all merit badges organized by special location requirements (pool, range, wilderness)
- FR5: Scouts can access a centralized taxonomy browser page that shows all available browsing options
- FR6: Scouts can access the taxonomy browser page from site navigation
- FR7: Scouts can view a complete list of all 143 merit badges
- FR8: Scouts can navigate from badge pages to skill taxonomy pages via clickable skill tags
- FR9: Scouts can navigate from badge pages to location taxonomy pages via clickable location indicators
- FR10: Scouts can navigate from one taxonomy page to another related taxonomy page (e.g., from a skill page back to the browser hub)

**Badge Information Display:**
- FR11: Scouts can view detailed merit badge requirements text on badge pages
- FR12: Scouts can view merit badge title, description, and BSA official URL
- FR13: Scouts can view difficulty ratings (1-5 scale) for each merit badge
- FR14: Scouts can view time estimates (min/typical/max hours) for each merit badge
- FR15: Scouts can view all assigned skills for each merit badge
- FR16: Scouts can view location requirements (indoor/outdoor/flexible) for each merit badge
- FR17: Scouts can view special location requirements (pool, range, wilderness, farm) if applicable
- FR18: Scouts can view multiple badges in list format with summary information (difficulty, time, location)
- FR19: Scouts can view difficulty and time metadata on badge list pages (not just detail pages)

**Requirement Change Tracking:**
- FR20: Counselors can view visual indicators when badge requirements have been updated recently (within 90 days)
- FR21: Counselors can access per-badge changelog pages showing requirement modifications over time
- FR22: Counselors can access a global changelog page showing all recent requirement changes across all badges
- FR23: Counselors can view before/after comparison for requirement text changes
- FR24: Counselors can see "last updated" dates on badge pages

**Metadata Generation (System):**
- FR25: System can generate difficulty ratings (1-5 scale) for all 143 merit badges
- FR26: System can generate time estimates (min/typical/max hours) for all 143 merit badges
- FR27: System can generate skills tags (5-10 per badge) from master taxonomy for all 143 merit badges
- FR28: System can generate location requirement classifications (indoor/outdoor/flexible) for all 143 merit badges
- FR29: System can identify special location requirements (pool, range, wilderness, farm) for all 143 merit badges
- FR30: System can store metadata in format compatible with Hugo taxonomy generation
- FR31: System can detect requirement changes by comparing newly scraped data to existing stored data
- FR32: System can generate changelog entries when requirement modifications are detected
- FR33: System can scrape merit badge requirements from BSA official website

**Taxonomy & Landing Page Generation (System):**
- FR34: System can generate dedicated landing pages for each skill taxonomy term (30-50 pages)
- FR35: System can generate dedicated landing pages for each difficulty level (5 pages)
- FR36: System can generate dedicated landing pages for each location requirement type (3 pages: indoor/outdoor/flexible)
- FR37: System can generate dedicated landing pages for each special location requirement (pool, range, wilderness, farm)
- FR38: System can organize badges on taxonomy landing pages by relevance to that taxonomy term
- FR39: System can generate the centralized taxonomy browser hub page

**SEO & Discoverability (System):**
- FR40: System can generate structured data markup for all taxonomy landing pages
- FR41: System can generate structured data markup for individual badge pages
- FR42: System can generate metadata for social media sharing (title, description, image) for all pages
- FR43: System can generate sitemap in format compatible with search engines
- FR44: System can generate SEO-optimized meta descriptions for taxonomy landing pages
- FR45: System can generate SEO-optimized H1 tags with target keywords for taxonomy pages
- FR46: System can generate internal links between badge pages and relevant taxonomy pages

**Analytics & Measurement (System):**
- FR47: System can track page visits for taxonomy browser, taxonomy landing pages, and badge pages
- FR48: System can track referral sources for badge page visits (which taxonomy page led to which badge page)
- FR49: System can track returning visitor identification
- FR50: System can track engagement metrics (time on page, scroll depth)
- FR51: System can provide sitemap for submission to search engine tools

**Accessibility:**
- FR52: All pages can be navigated using keyboard-only input (Tab key navigation)
- FR53: All interactive elements can display visible focus indicators
- FR54: All pages can include skip navigation links for keyboard users
- FR55: All pages can use semantic HTML with proper heading hierarchy
- FR56: All text can meet WCAG 2.1 AA color contrast requirements (4.5:1 for text, 3:1 for UI components)
- FR57: All difficulty ratings can use multiple indicators (stars + text + color, not color-only)
- FR58: All location indicators can use icons + text labels (not icon-only)
- FR59: All images and icons can include descriptive alt text
- FR60: All pages can achieve Lighthouse accessibility score of 100

### NonFunctional Requirements

**Performance:**
- NFR1: Page load performance - First Contentful Paint (FCP) must be < 1.5 seconds
- NFR2: Page interactivity - Time to Interactive (TTI) must be < 3.5 seconds
- NFR3: Page weight - Total page weight must be < 500KB (HTML + CSS + fonts)
- NFR4: Lighthouse performance - All pages must achieve Lighthouse Performance score of 90+
- NFR5: Build time - Hugo build for complete site (143 badges + 50+ taxonomy pages) must complete in < 2 minutes
- NFR6: Mobile performance - Performance targets must be met on mobile devices (not just desktop)

**Accessibility:**
- NFR7: WCAG 2.1 AA compliance - All pages must meet WCAG 2.1 Level AA standards
- NFR8: Lighthouse accessibility - All pages must achieve Lighthouse Accessibility score of 100
- NFR9: Keyboard navigation - All interactive elements must be accessible via keyboard-only input
- NFR10: Screen reader compatibility - All content must be navigable and understandable using screen readers (VoiceOver, NVDA)
- NFR11: Color contrast - All text must meet 4.5:1 contrast ratio, all UI components must meet 3:1 contrast ratio
- NFR12: Non-color indicators - All information conveyed by color must also be conveyed by text or icons

**Content Quality & Accuracy:**
- NFR13: BSA requirement accuracy - All merit badge requirements must match BSA official sources exactly
- NFR14: Metadata quality - AI-generated difficulty ratings must achieve 90%+ accuracy when validated through spot-checks
- NFR15: Changelog accuracy - Requirement change detection must identify actual changes with minimal false positives
- NFR16: Content freshness - Badge requirements must be updated weekly via automated scraper

**Browser Compatibility:**
- NFR17: Browser support - Site must function correctly on Chrome, Edge, and Safari (last 2 versions)
- NFR18: Mobile browser support - Site must function correctly on iOS Safari and Chrome on Android
- NFR19: Progressive enhancement - Core functionality must work without JavaScript

**SEO Performance:**
- NFR20: Lighthouse SEO - All pages must achieve Lighthouse SEO score of 100
- NFR21: Structured data validation - All Schema.org markup must validate without errors
- NFR22: Sitemap completeness - Sitemap must include all taxonomy and badge pages

**Data Validation & Quality Gates:**
- NFR23: Schema validation - All generated metadata must validate against defined schema before Hugo build
- NFR24: Build failure protection - Invalid metadata must cause build failure (fail-fast principle)

**Deployment & Automation:**
- NFR25: Automated deployment - Deployment must be automated via CI/CD (GitHub Actions)
- NFR26: Build failure protection - Failed builds must not deploy to production
- NFR27: Deployment performance - Deployment must complete within 5 minutes of commit to trunk branch

### Additional Requirements

**Architecture & Technical Requirements:**

**ARCH-1: No Starter Template - Brownfield Enhancement Only**
- Phase 1 builds on existing working Hugo static site (143 badges already live)
- Enhancement strategy: Use `with` blocks for backward compatibility in Hugo templates
- No template scaffolding/generation needed
- Metadata additions are non-breaking changes to existing frontmatter

**ARCH-2: Dual Storage Synchronization Validation**
- Data must be kept consistent between `data.json` and Hugo frontmatter (metadata object)
- Validation script must run before every deployment to catch sync issues
- Specific validation rules for: difficulty (1-5 range), skills array presence, interests slug consistency
- Atomic updates pattern: update data.json + frontmatter together, never separately

**ARCH-3: Annual Manual Metadata Generation Workflow**
- Metadata generation is decoupled from regular deployments
- One-time annual setup when BSA updates requirements
- Sequential execution order: metadata scripts (Bun) → Hugo build → deployment
- Pre-deployment human-in-the-loop AI review against BSA change documents
- No complex rollback mechanism needed (annual cadence supports manual rollback if needed)

**ARCH-4: Build Pipeline Protection**
- Failed builds must NOT deploy to production
- Validation script must pass before deployment (no sync errors)
- Deployment must occur within 5 minutes of commit to trunk
- Pre-deployment accessibility validation checklist required

**ARCH-5: Taxonomy System Architecture**
- Hugo native taxonomy system (NOT custom tagging)
- 4 taxonomy dimensions: `skills`, `difficulty`, `location_setting`, `special_locations`
- 53 new taxonomy landing pages auto-generated by Hugo
- Taxonomy slugs must be explicit (defined in interests.yaml, not auto-generated)
- Master interests taxonomy stored in `hugo/data/interests.yaml`

**ARCH-6: Interest Taxonomy Master Data**
- Central definition point: `hugo/data/interests.yaml`
- Fields per interest: `slug` (explicit), `name`, `description`, `meta_description` (AI-generated), `icon`
- Supports ~28-35 interest categories (Skills, Difficulty, Location, Special Locations combined)
- Used by both scripts and templates (single source of truth)

**ARCH-7: Metadata Storage Structure in data.json**
```json
{
  "difficulty": 3,
  "time_estimate": "8-10 hours",
  "skills": ["leadership", "outdoor-skills"],
  "location": {
    "setting": "outdoor_required",
    "special_locations": ["wilderness"]
  }
}
```

**ARCH-8: Hugo Frontmatter Taxonomy Integration**
- Frontmatter must include taxonomy fields:
  - `difficulty: [3]` (array, for Hugo taxonomy)
  - `skills: ["leadership", "outdoor-skills"]` (array)
  - `location_setting: ["outdoor_required"]` (array)
  - `special_locations: ["wilderness"]` (array)
- These become taxonomy terms for Hugo's taxonomy system

**ARCH-9: AI-Powered Metadata Generation via Gemini API**
- 4 separate metadata generation scripts (each can run independently):
  1. `generate-difficulty.ts` - Difficulty scoring 1-5 scale
  2. `generate-skills.ts` - Skills tagging (5-10 per badge)
  3. `generate-location.ts` - Location classification + special location detection
  4. `generate-changelog.ts` - Changelog generation (optional, for requirement updates)
- Each script can be re-run independently on failed badges
- API key validation required: GEMINI_API_KEY environment variable
- Fail-fast error handling: API failures stop execution (ensures complete metadata or manual intervention)

**ARCH-10: Validation Script Requirements**
- Script: `validate-metadata.ts` (runs before Hugo build)
- Checks: All 143 badges have complete metadata, frontmatter/data.json sync verified
- Validation rules (exact):
  1. Badge has requirements array
  2. Difficulty score is 1-5
  3. Skills array is non-empty
  4. Location setting is valid (indoor_required/outdoor_required/either)
  5. Frontmatter skills match data.json skills
  6. Interests slugs in frontmatter match interests.yaml definitions
- Do NOT add content quality validation (trust AI, human review gates)

**ARCH-11: Metadata Generation Order (Critical Dependencies)**
1. Create types.ts (shared Phase 1 interfaces)
2. Create interests.yaml (master taxonomy definitions)
3. Run generate-meta-descriptions.ts (populate SEO descriptions - ONE-TIME SETUP)
4. Run generate-difficulty.ts, generate-skills.ts, generate-location.ts (sequential, not parallel)
5. Run validate-metadata.ts (pre-build check)
6. Hugo build
7. Post-build validation (optional: verify taxonomy pages exist)

**ARCH-12: Naming Convention Rules (All Agents Must Follow)**
- **TypeScript script filenames:** kebab-case (e.g., `generate-difficulty.ts`)
- **JSON field names:** snake_case (e.g., `meta_description`, `time_estimate`, `location_setting`)
- **Frontmatter fields:** snake_case with explicit slugs (e.g., `skills: ["leadership"]`)
- **Hugo partial filenames:** kebab-case (e.g., `difficulty-rating.html`)
- **SCSS component filenames:** kebab-case (e.g., `difficulty-rating.scss`)
- **Variable names:** Full names, no abbreviations (e.g., `badgeSlug` not `bSlug`)

**ARCH-13: File Organization Requirements**
- All Phase 1 metadata scripts → `scripts/` directory
- All Phase 1 component partials → `hugo/layouts/partials/` (subdirectory optional)
- All Phase 1 component SCSS → `hugo/assets/scss/components/`
- Page-specific SCSS → `hugo/assets/scss/pages/` (imports components via @use)
- Master interests → `hugo/data/interests.yaml`
- Component SCSS must NOT import colors/spacing/typography directly; use `var(--custom-property)`

**ARCH-14: Hugo Template Integration Patterns**
- Use `with` blocks for backward compatibility (wraps all metadata access)
- Pass multiple parameters via `dict` keyword
- Map interest slugs to display names in templates (slugs stored in frontmatter, names fetched from interests.yaml)
- Communication: Partials called from templates only (no partial-to-partial calls)
- Data access: `.Site.Data.interests.interests` for interests.yaml, `.Site.Data` for badge metadata

**ARCH-15: Error Message Formatting**
- All error messages must be prefixed with `[script-name]` for traceability
- Example: `[generate-difficulty] Failed on badge camping: API rate limit exceeded`
- Fail fast pattern: throw Error on validation failures (never swallow exceptions)

**UX & Design Requirements:**

**UX-1: Responsive Design System - Fluid Typography & Spacing**
- Typography uses `clamp()` function (no breakpoint hell)
- Spacing uses fluid scale with container query units (`cqi`)
- Spacing scale defined: `--space-3xs` through `--space-l` (7 levels)
- Max content width: 60ch (optimal reading line length)

**UX-2: Progressive Enhancement - Color & Browser Support**
- Primary colors: HSL (universal browser support)
- Enhanced colors: oklch colors (modern browsers only, perceptually uniform)
- Fallback chain: oklch colors degrade gracefully to HSL
- View transitions API: Graceful fallback for older browsers

**UX-3: Earth-Tone Color Palette (Strategic Brand Alignment)**
- Source: Official Scouting America Scout uniform colors (tan & olive)
- Tan shades: `--tan-50` through `--tan-900`
- Olive shades: `--olive-500` through `--olive-900` (primary text color)
- Teal accent: `--teal-300` through `--teal-600`
- All combinations meet WCAG 2.1 AA contrast (4.5:1 text, 3:1 UI)

**UX-4: Typography System**
- Font: Geologica (modern variable font, full spectrum 100-900 weight)
- Loading strategy: `font-display: swap` (prevent layout shift)
- Base font size: 1.125rem (18px) - above accessibility minimum
- Font weights in use: 300 (light), 400 (regular), 600 (semibold), 700+ (bold)

**UX-5: Spacing System Details**
- All spacing uses design tokens (no hardcoded px/rem values)
- Container query units enable context-aware spacing

**UX-6: Iconography Strategy**
- Approach: Unicode emojis for Phase 1
- Icons: ⭐ Difficulty, ⏱️ Time, 🏠 Indoor, 🏕️ Outdoor, ↔️ Flexible, 🏊 Pool, 🎯 Range, 🏔️ Wilderness, 🆕 Updated

**UX-7: Button & Interactive Element Styling**
- Default state: Olive background with tan text
- Hover state: Darkens to `--olive-600`
- Focus state: High-contrast visible outline (keyboard accessibility)
- Transition: 0.2s on background and color

**UX-8: View Transitions API for Smooth Navigation**
- Global enable: `@view-transition { navigation: auto; }`
- Creates app-like experience with no content jumping
- Fallback for older browsers: instant navigation

**UX-9: Deep Linking Desktop/Mobile Interaction Patterns**
- Desktop: Hover reveals `#` symbol → Click copies deep link to clipboard
- Mobile: `#` symbol always visible (no hover) → Tap copies link
- Smooth scroll to highlighted requirement on page load

**UX-10: Expandable Explainer Sections (Primary Interaction Pattern)**
- Click/tap to reveal detailed guidance below each requirement
- Works offline, accessible via keyboard navigation
- Creates "wave of understanding" delight moment

**UX-11: Search & Navigation Requirements**
- Full-text search across all badge requirements
- Search bar always visible (sticky top navigation)
- Related badge suggestions on every badge page (3-5 badges)
- Taxonomy discovery paths: by skills, difficulty, location, time

**UX-12: Pagination & Load More Strategy**
- Do NOT use infinite scroll
- Use explicit pagination with clear page numbers
- Alternative: "Load more" buttons with visible endpoints

**UX-13: Keyboard & Mouse Interaction Parity**
- No hover-only interactions
- All interactive elements keyboard accessible
- Focus indicators visible and high-contrast
- Logical tab order

**UX-14: Mobile-First Responsive Design**
- Start with mobile layout
- Enhance for desktop
- Container queries for context-aware components
- Touch target validation: 44x44px minimum for mobile

**UX-15: Performance as Visual Design Decision**
- Sub-1-second page loads (emotional experience)
- First Contentful Paint < 1.5 seconds
- Performance is perceived quality signal

**UX-16: Offline Capability (Future PWA)**
- Badge pages fully accessible offline once cached (Phase 2)
- Service worker auto-caches badge pages on navigation (Phase 2)
- Pre-cache taxonomy landing pages on first site visit (Phase 2)

**UX-17: Accessibility Requirements Beyond PRD**
- Screen reader testing with VoiceOver for emoji announcements with aria-labels
- High contrast for all text/UI
- No color-only information
- Proper aria-labels for all interactive elements
- Semantic HTML with built-in accessibility

**UX-18: Component Specifications for Phase 1**
1. Enhanced Badge Cards: difficulty stars, time estimate, location icons, skill pills
2. Difficulty Rating Component: 1-5 stars with aria-label
3. Location Indicator Component: icon + label format
4. Skill Tag Component: pill/badge format, clickable
5. Time Breakdown Table: per-requirement time estimates
6. "Requirements Updated" Indicator: 🆕 badge for updates within 90 days
7. Requirement Explainer Component: expandable sections
8. Related Badge Suggestions: 3-5 suggestions with difficulty
9. Taxonomy Filter Component: filter by skills/difficulty/location/time
10. Breadcrumb Navigation: shows taxonomy hierarchy

**Analytics & Tracking Requirements:**

**ANALYTICS-1: Pirsch Analytics Integration**
- Track average time on page per badge
- Deep link `#` clicks tracked
- Trending badges calculation: Daily pre-computed via GitHub Action

**ANALYTICS-2: Email Notifications (Counselor-Focused)**
- Email signup only for counselor change notifications (opt-in)
- No push notifications for core features

**ANALYTICS-3: Browser localStorage for Bookmarks**
- "Save for later" bookmarks stored in browser localStorage
- Documented limitation: Does NOT sync across devices

**ANALYTICS-4: Metadata Visibility for Counselor Planning**
- Time estimates, materials lists, prerequisites, difficulty visible at a glance

**SEO Requirements:**

**SEO-1: Meta Description Generation**
- Script: `generate-meta-descriptions.ts` (one-time setup)
- AI-generated via Gemini API, 150-160 characters
- Stored in `hugo/data/interests.yaml`

**SEO-2: Schema.org Structured Data**
- JSON-LD format in page `<head>`
- Enhancement to existing `partials/json-ld/` structure

**SEO-3: Social Sharing Metadata**
- OpenGraph tags enhanced in baseof.html head block
- Meta descriptions from interests.yaml

**SEO-4: Sitemap & Discovery**
- Auto-generated sitemap at `/sitemap.xml`
- Includes all badge pages + 53 new taxonomy pages
- Long-tail search optimization

**Testing & Validation Requirements:**

**TEST-1: Lighthouse CI on Every Deployment**
- Performance: >= 90
- Accessibility: 100
- SEO: 100

**TEST-2: Pre-Deployment Validation Checklist**
- Validation script passes
- Lighthouse scores meet targets
- Visual regression test on 5 sample taxonomy pages
- Deep linking highlights correctly
- Metadata displays correctly on badge cards
- Related badge suggestions visible
- Search functionality working
- All escape hatches working

**TEST-3: Spot-Check Validation During Development**
- Test on 3 badges initially (archery, camping, first-aid)
- Refine prompts based on results
- Full rollout to 143 badges after validation

### FR Coverage Map

**Epic 1 - Metadata Generation Foundation:**
- FR25: Generate difficulty ratings (1-5 scale)
- FR26: Generate time estimates (min/typical/max hours)
- FR27: Generate skills tags (5-10 per badge)
- FR28: Generate location classifications (indoor/outdoor/flexible)
- FR29: Identify special location requirements
- FR30: Store metadata for Hugo taxonomy
- FR31: Detect requirement changes
- FR32: Generate changelog entries
- FR33: Scrape requirements from BSA
- NFR14: Metadata quality validation
- NFR23: Schema validation
- NFR24: Build failure protection
- ARCH-1 through ARCH-15: All technical architecture requirements
- TEST-3: Spot-check validation during development

**Epic 2 - Taxonomy-Powered Discovery:**
- FR1: Browse badges by skill area
- FR2: Browse badges by location requirement
- FR3: Browse badges by difficulty level
- FR4: Browse badges by special location requirements
- FR5: Access centralized taxonomy browser page
- FR6: Access taxonomy browser from site navigation
- FR7: View complete list of 143 badges
- FR8: Navigate from badge to skill taxonomy pages
- FR9: Navigate from badge to location taxonomy pages
- FR10: Navigate between related taxonomy pages
- FR34: Generate skill taxonomy landing pages
- FR35: Generate difficulty landing pages
- FR36: Generate location landing pages
- FR37: Generate special location landing pages
- FR38: Organize badges on taxonomy pages
- FR39: Generate taxonomy browser hub page
- ARCH-5: Taxonomy system architecture
- ARCH-6: Interest taxonomy master data
- ARCH-8: Hugo frontmatter taxonomy integration
- UX-11: Search & navigation requirements

**Epic 3 - Enhanced Badge Display:**
- FR11: View detailed requirements on badge pages
- FR12: View badge title, description, BSA URL
- FR13: View difficulty ratings
- FR14: View time estimates
- FR15: View assigned skills
- FR16: View location requirements
- FR17: View special location requirements
- FR18: View badges in list format with metadata
- FR19: View metadata on badge list pages
- FR52-FR60: All accessibility requirements
- NFR7-NFR12: All accessibility standards
- UX-1 through UX-18: All design system and component requirements

**Epic 4 - Requirement Change Tracking:**
- FR20: View visual indicators for recent updates
- FR21: Access per-badge changelog pages
- FR22: Access global changelog page
- FR23: View before/after comparisons
- FR24: See "last updated" dates
- ANALYTICS-2: Email notifications for counselors

**Epic 5 - SEO & Analytics Enhancement:**
- FR40: Generate structured data for taxonomy pages
- FR41: Generate structured data for badge pages
- FR42: Generate social media sharing metadata
- FR43: Generate sitemap
- FR44: Generate SEO-optimized meta descriptions
- FR45: Generate SEO-optimized H1 tags
- FR46: Generate internal links between pages
- FR47: Track page visits
- FR48: Track referral sources
- FR49: Track returning visitors
- FR50: Track engagement metrics
- FR51: Provide sitemap for search engines
- NFR20-NFR22: All SEO performance standards
- SEO-1 through SEO-4: All SEO requirements
- ANALYTICS-1: Pirsch analytics integration
- ANALYTICS-3: Browser localStorage for bookmarks
- ANALYTICS-4: Metadata visibility for counselor planning

**Cross-Cutting NFRs (apply to all epics):**
- NFR1-NFR6: Performance requirements
- NFR13: BSA requirement accuracy
- NFR15-NFR16: Content freshness
- NFR17-NFR19: Browser compatibility
- NFR25-NFR27: Deployment & automation
- TEST-1: Lighthouse CI on every deployment
- TEST-2: Pre-deployment validation checklist

## Epic List

### Epic 1: Metadata Generation Foundation

System can automatically generate and validate comprehensive metadata (difficulty, time, skills, location) for all 143 merit badges, enabling all discovery and display features.

**What users can accomplish:**
- Scouts see accurate difficulty ratings and time estimates
- Counselors get reliable planning information
- Site has validated, consistent metadata across all badges

**FRs covered:** FR25-FR33, NFR14, NFR23-NFR24, ARCH-1 through ARCH-15, TEST-3

**Standalone nature:** Produces complete metadata that enhances existing badge pages even before taxonomy or UI changes

---

### Epic 2: Taxonomy-Powered Discovery System

Scouts can discover merit badges through multiple intuitive paths (skills, difficulty, location, special requirements) via Hugo-generated taxonomy landing pages.

**What users can accomplish:**
- Scouts browse badges by skill area, difficulty, location requirements
- Scouts find "the perfect badge" without browsing all 143
- Scouts navigate between related taxonomy pages
- Taxonomy browser hub provides discovery starting point

**FRs covered:** FR1-FR10, FR34-FR39, ARCH-5, ARCH-6, ARCH-8, UX-11

**Standalone nature:** Complete discovery system using metadata from Epic 1, works independently of enhanced badge display

---

### Epic 3: Enhanced Badge Information Display

Scouts and counselors see rich metadata (difficulty, time, skills, location) directly on badge pages and lists, making informed decisions faster.

**What users can accomplish:**
- Scouts view difficulty ratings, time estimates, and skills on badge cards
- Scouts see location requirements at a glance
- Counselors scan time estimates for planning
- All metadata visible on both list pages and detail pages

**FRs covered:** FR11-FR19, FR52-FR60, NFR7-NFR12, UX-1 through UX-18

**Standalone nature:** Enhances existing badge pages with metadata from Epic 1, doesn't require taxonomy system

---

### Epic 4: Requirement Change Tracking

Counselors stay current on badge requirement changes without manual checking, maintaining teaching accuracy.

**What users can accomplish:**
- Counselors see visual indicators when requirements updated recently
- Counselors access per-badge changelogs showing what changed
- Counselors view before/after comparisons
- Counselors browse global changelog for all recent changes

**FRs covered:** FR20-FR24, ANALYTICS-2

**Standalone nature:** Independent change tracking system, works without other enhancements

---

### Epic 5: SEO & Analytics Enhancement

Site becomes discoverable via search engines and measurable via analytics, driving organic traffic growth and validating product decisions.

**What users can accomplish:**
- Scouts discover site through Google searches for specific badge types
- Product team measures which taxonomy pages drive traffic
- Product team tracks engagement and validates features
- Social sharing previews look professional and compelling

**FRs covered:** FR40-FR51, NFR20-NFR22, SEO-1 through SEO-4, ANALYTICS-1, ANALYTICS-3, ANALYTICS-4

**Standalone nature:** Enhances discoverability and measurement without changing core functionality

---

## Epic 1: Metadata Generation Foundation

System can automatically generate and validate comprehensive metadata (difficulty, time, skills, location) for all 143 merit badges, enabling all discovery and display features.

### Story 1.1: Generate and Display Difficulty Ratings for All 143 Badges

As a scout,
I want to see difficulty ratings (1-5 scale) for each merit badge,
So that I can choose badges that match my skill level and available time.

**Acceptance Criteria:**

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

### Story 1.2: Generate and Display Skills Tags for All 143 Badges

As a scout,
I want to see which skills each badge develops (leadership, STEM, outdoor skills, etc.),
So that I can find badges that align with my interests and goals.

**Acceptance Criteria:**

**Given** the interests.yaml master taxonomy file needs to be created
**When** I create hugo/data/interests.yaml
**Then** it includes ~30-50 skill definitions with slug, name, description, icon fields per ARCH-6
**And** slugs are explicit (not auto-generated) per ARCH-5
**And** follows the structure: skills section with individual skill entries

**Given** the merit badge requirements exist in data.json files
**When** I run the skills generation script
**Then** all 143 badges have 5-10 skills assigned stored in data.json metadata object
**And** skills also populate frontmatter as array for Hugo taxonomy per ARCH-8
**And** skills are selected from interests.yaml master taxonomy (no arbitrary skills)
**And** the script uses Gemini API with proper error handling

**Given** I am viewing a badge page
**When** the page loads
**Then** I see skill tags displayed as clickable pills/badges
**And** each skill tag links to the corresponding skill taxonomy page (e.g., /skills/leadership/)
**And** skill tags use the display name from interests.yaml (not slugs)
**And** skill tags are visible on both badge detail pages and list pages per FR19

### Story 1.3: Generate and Display Location Requirements for All 143 Badges

As a scout,
I want to see whether a badge requires indoor, outdoor, or flexible location settings,
So that I can find badges that work with my current environment and constraints.

**Acceptance Criteria:**

**Given** the merit badge requirements exist in data.json files
**When** I run the location generation script
**Then** all 143 badges have location setting (indoor_required/outdoor_required/either) stored in data.json metadata.location object
**And** badges with special location requirements (pool, shooting_range, wilderness, farm, water_body) have those identified in metadata.location.special_locations array
**And** location data also populates frontmatter per ARCH-8 (location_setting and special_locations arrays)
**And** the script uses Gemini API with proper error handling

**Given** I am viewing a badge page
**When** the page loads
**Then** I see location requirements displayed with icons + text labels per UX-17
**And** location uses emojis: 🏠 Indoor Required, 🏕️ Outdoor Required, ↔️ Flexible per UX-6
**And** special location icons display if applicable: 🏊 Pool, 🎯 Range, 🏔️ Wilderness
**And** location indicators are visible on both badge detail pages and list pages per FR19

**Given** the interests.yaml needs location taxonomy entries
**When** I update hugo/data/interests.yaml
**Then** it includes location_setting section (indoor_required, outdoor_required, either)
**And** it includes special_locations section (pool, shooting_range, wilderness, farm, water_body)
**And** each entry has slug, name, description, icon fields

### Story 1.4: Create Comprehensive Metadata Validation Script

As a system administrator,
I want metadata to be validated before deployment,
So that invalid or inconsistent data never reaches production.

**Acceptance Criteria:**

**Given** all metadata generation scripts have completed
**When** I run validate-metadata.ts
**Then** it checks all 143 badges have complete metadata per ARCH-10 validation rules:
- Badge has requirements array
- Difficulty score is 1-5
- Skills array is non-empty
- Location setting is valid (indoor_required/outdoor_required/either)
- Frontmatter skills match data.json skills (sync check)
- Interest slugs in frontmatter match interests.yaml definitions

**Given** metadata validation detects errors
**When** any validation rule fails
**Then** the script throws an Error with prefixed message per ARCH-15 (e.g., "[validate-metadata] Badge camping: missing skills array")
**And** the script exits with non-zero exit code (fail-fast pattern)
**And** lists all validation failures before exiting

**Given** the validation script needs to run in CI/CD
**When** I configure GitHub Actions workflow
**Then** validate-metadata.ts runs before Hugo build per ARCH-11 (step 5)
**And** deployment fails if validation fails per NFR26
**And** validation script is added to package.json scripts per ARCH-9

**Given** all metadata is valid
**When** I run validate-metadata.ts
**Then** it logs success message with badge count validated
**And** exits with zero exit code
**And** Hugo build can proceed

---

## Epic 2: Taxonomy-Powered Discovery System

Scouts can discover merit badges through multiple intuitive paths (skills, difficulty, location, special requirements) via Hugo-generated taxonomy landing pages.

### Story 2.1: Configure Hugo Taxonomy System and Generate Base Landing Pages

As a scout,
I want the system to automatically organize badges by their metadata attributes,
So that I can browse badges through different discovery paths.

**Acceptance Criteria:**

**Given** the Hugo site needs taxonomy configuration
**When** I update hugo/hugo.toml
**Then** it includes taxonomy definitions per ARCH-5:
```toml
[taxonomies]
  skill = "skills"
  difficulty = "difficulty"
  location_setting = "location_setting"
  special_location = "special_locations"
```
**And** Hugo automatically generates taxonomy index pages at /skills/, /difficulty/, /location_setting/, /special_locations/

**Given** badges have metadata in frontmatter per Epic 1
**When** I run Hugo build
**Then** Hugo automatically generates ~53 taxonomy landing pages per ARCH-5:
- ~40 skill pages (e.g., /skills/leadership/)
- 5 difficulty pages (e.g., /difficulty/3/)
- 3 location setting pages (e.g., /location_setting/outdoor_required/)
- ~5 special location pages (e.g., /special_locations/pool/)

**Given** taxonomy pages need SEO meta descriptions
**When** I run generate-meta-descriptions.ts (one-time setup per ARCH-11)
**Then** it populates meta_description field in interests.yaml for all taxonomy entries
**And** uses Gemini API to generate compelling 150-160 character descriptions per SEO-1
**And** descriptions target format: "Compelling descriptions for pages listing all [interest] merit badges"

**Given** I navigate to a taxonomy index page (e.g., /skills/)
**When** the page loads
**Then** I see a list of all available terms in that taxonomy (all skills, all difficulties, etc.)
**And** each term is clickable and links to its taxonomy landing page

### Story 2.2: Create Skills Taxonomy Landing Pages with Badge Listings

As a scout,
I want to browse all merit badges organized by skill area (leadership, STEM, outdoor skills, etc.),
So that I can find badges that develop specific skills I'm interested in.

**Acceptance Criteria:**

**Given** I need a Hugo template for skills taxonomy pages
**When** I create hugo/layouts/skills/list.html
**Then** it displays all badges tagged with that skill
**And** shows badge cards with metadata visible: difficulty stars, time estimate, location icons per FR19
**And** each badge card links to the badge detail page
**And** follows mobile-first responsive design per UX-14
**And** uses earth-tone color palette per UX-3

**Given** I navigate to a skill taxonomy page (e.g., /skills/leadership/)
**When** the page loads
**Then** I see H1 with skill name and SEO-optimized keyword per FR45
**And** I see meta description from interests.yaml per SEO-1
**And** I see all badges tagged with "leadership" skill displayed as cards
**And** each badge card shows: title, difficulty rating, time estimate, location requirement per FR18
**And** the page meets WCAG 2.1 AA accessibility per NFR7

**Given** I am viewing a badge card on the skills taxonomy page
**When** I click a badge card
**Then** I navigate to that badge's detail page per FR8
**And** the navigation uses view transitions API for smooth page changes per UX-8

**Given** the skills taxonomy page needs styling
**When** I create hugo/assets/scss/pages/skills-list.scss
**Then** it uses design tokens (--space-*, --tan-*, --olive-*) per UX-1, UX-3
**And** follows naming conventions per ARCH-12 (kebab-case filename)
**And** is placed in pages/ directory per ARCH-13

**Given** SEO optimization is required per FR40, FR44
**When** the skills taxonomy page renders
**Then** it includes Schema.org ItemList structured data in JSON-LD format per SEO-2
**And** OpenGraph meta tags are populated from interests.yaml per SEO-3
**And** the page is included in sitemap.xml per SEO-4

### Story 2.3: Create Difficulty Taxonomy Landing Pages with Badge Listings

As a scout,
I want to browse all merit badges organized by difficulty level (1-5),
So that I can find badges that match my experience level and challenge preference.

**Acceptance Criteria:**

**Given** I need a Hugo template for difficulty taxonomy pages
**When** I create hugo/layouts/difficulty/list.html
**Then** it displays all badges with that difficulty rating
**And** shows badge cards with metadata visible: difficulty stars, time estimate, skills, location per FR19
**And** each badge card links to the badge detail page
**And** follows mobile-first responsive design per UX-14

**Given** I navigate to a difficulty taxonomy page (e.g., /difficulty/3/)
**When** the page loads
**Then** I see H1 with difficulty level and description (e.g., "Difficulty Level 3: Moderate Badges")
**And** I see meta description from interests.yaml
**And** I see all badges with difficulty rating 3 displayed as cards
**And** each badge card shows: title, difficulty stars (⭐⭐⭐), time estimate, skills tags, location per FR18
**And** the page meets WCAG 2.1 AA accessibility per NFR7

**Given** I am viewing badge cards on the difficulty page
**When** I see the difficulty stars
**Then** they use multiple indicators (stars + text + color) per FR57, UX-17
**And** include aria-label for screen readers (e.g., "Difficulty: 3 out of 5")

**Given** I am viewing a badge card with skill tags
**When** I click a skill tag
**Then** I navigate to that skill's taxonomy page per FR8, FR10
**And** breadcrumb navigation shows path: Home > Difficulty 3 > (clicked skill)

**Given** SEO optimization is required per FR40, FR44, FR45
**When** the difficulty taxonomy page renders
**Then** it includes Schema.org ItemList structured data per SEO-2
**And** OpenGraph meta tags are populated from interests.yaml per SEO-3
**And** H1 includes SEO-optimized keywords (e.g., "Moderate Difficulty Merit Badges")

### Story 2.4: Create Location Taxonomy Landing Pages with Badge Listings

As a scout,
I want to browse merit badges by location requirements (indoor/outdoor/flexible) and special locations (pool, range, wilderness),
So that I can find badges that work with my current environment and available facilities.

**Acceptance Criteria:**

**Given** I need Hugo templates for location taxonomy pages
**When** I create hugo/layouts/location_setting/list.html
**Then** it displays all badges with that location setting (indoor_required/outdoor_required/either)
**And** shows badge cards with metadata visible per FR19

**Given** I need Hugo templates for special locations
**When** I create hugo/layouts/special_locations/list.html
**Then** it displays all badges requiring that special location (pool, range, wilderness, farm, water_body)
**And** shows badge cards with metadata visible per FR19

**Given** I navigate to a location setting page (e.g., /location_setting/outdoor_required/)
**When** the page loads
**Then** I see H1 with location type (e.g., "Outdoor Required Merit Badges")
**And** I see meta description from interests.yaml
**And** I see all badges requiring outdoor setting displayed as cards
**And** each badge card shows: title, difficulty, time, skills, location icons (🏕️) per FR18
**And** location indicators use icons + text labels per FR58, UX-17

**Given** I navigate to a special location page (e.g., /special_locations/pool/)
**When** the page loads
**Then** I see H1 with special location (e.g., "Merit Badges Requiring Pool Access")
**And** I see all badges requiring pool access displayed as cards
**And** location icons use emojis: 🏊 Pool, 🎯 Range, 🏔️ Wilderness per UX-6

**Given** I am viewing badge cards on location pages
**When** I click a badge card
**Then** I navigate to that badge's detail page per FR9
**And** can navigate back to location taxonomy page via breadcrumbs per FR10

**Given** SEO optimization is required
**When** location taxonomy pages render
**Then** they include Schema.org ItemList structured data per SEO-2
**And** OpenGraph meta tags are populated per SEO-3
**And** H1 includes SEO-optimized keywords for long-tail searches per FR44, FR45

### Story 2.5: Create Taxonomy Browser Hub Page for Discovery

As a scout,
I want a centralized discovery page showing all available ways to browse badges,
So that I can easily find the browsing method that matches my needs.

**Acceptance Criteria:**

**Given** I need a taxonomy browser hub page
**When** I create hugo/content/badges/browse/index.md and hugo/layouts/badges/browse.html
**Then** the page is accessible at /badges/browse/ per FR5, FR39

**Given** I navigate to /badges/browse/
**When** the page loads
**Then** I see organized sections for each taxonomy type per UX-11:

**📚 By Skill Area**
- Visual cards/chips for top skills: Leadership, STEM, Outdoor Skills, Communication, Arts & Crafts
- "View all [40] skills →" link to /skills/

**⭐ By Difficulty**
- Visual cards showing: ⭐ Easy (1-2), ⭐⭐ Moderate (3), ⭐⭐⭐ Challenging (4-5)
- Links to /difficulty/1/, /difficulty/3/, /difficulty/5/

**📍 By Location**
- Visual cards: 🏠 Indoor Required, 🏕️ Outdoor Required, ↔️ Flexible
- Links to location_setting taxonomy pages
- Section for special locations: 🏊 Pool, 🎯 Range, 🏔️ Wilderness
- Links to special_locations taxonomy pages

**Given** the taxonomy browser needs styling
**When** I create hugo/assets/scss/pages/taxonomy-browser.scss
**Then** it uses large, touch-friendly cards per UX-14 (44x44px minimum)
**And** uses 2-column grid on mobile, 4-column on desktop
**And** includes icons + labels (not icon-only) per UX-17
**And** uses design tokens for spacing and colors per UX-1, UX-3

**Given** I am viewing the taxonomy browser on mobile
**When** I tap a taxonomy card
**Then** I navigate to that taxonomy landing page (e.g., /skills/leadership/)
**And** navigation feels smooth with view transitions per UX-8

**Given** the taxonomy browser needs to be discoverable
**When** I access the site navigation
**Then** I see "Browse Badges" link in main navigation per FR6
**And** it links to /badges/browse/
**And** is keyboard accessible per FR52, NFR9

**Given** SEO optimization is required
**When** the taxonomy browser page renders
**Then** it includes meta description highlighting discovery features
**And** H1 is SEO-optimized: "Browse Merit Badges by Skill, Difficulty, and Location"
**And** OpenGraph tags promote social sharing per SEO-3

---

## Epic 3: Enhanced Badge Information Display

Scouts and counselors see rich metadata (difficulty, time, skills, location) directly on badge pages and lists, making informed decisions faster.

### Story 3.1: Create Core Design System Foundation (Colors, Typography, Spacing)

As a scout,
I want the site to have a visually appealing and consistent design,
So that I can easily read content and trust the information presented.

**Acceptance Criteria:**

**Given** the site needs a design system foundation
**When** I create hugo/assets/scss/_design-tokens.scss
**Then** it defines CSS custom properties for the design system per UX-1, UX-3, UX-5:

**Color Palette (Earth-Tone):**
- Tan shades: --tan-50 through --tan-900 (Scout uniform tan)
- Olive shades: --olive-500 through --olive-900 (Scout uniform olive, primary text)
- Teal accent: --teal-300 through --teal-600 (accent color)
- All combinations meet WCAG 2.1 AA contrast ratios per UX-3, NFR11

**Typography System:**
- Font: Geologica variable font per UX-4
- Base font size: 1.125rem (18px) per UX-4
- Font weights: 300 (light), 400 (regular), 600 (semibold), 700+ (bold)
- Font loading: font-display: swap per UX-4
- Fluid typography using clamp() per UX-1

**Spacing System:**
- Spacing scale: --space-3xs through --space-l (7 levels) per UX-5
- Fluid spacing using container query units (cqi) per UX-1
- Max content width: 60ch per UX-1

**Given** the design tokens are defined
**When** I create hugo/assets/scss/main.scss
**Then** it imports _design-tokens.scss
**And** applies global styles using design tokens (no hardcoded values)
**And** follows ARCH-13: component SCSS uses var(--custom-property)

**Given** the site uses progressive enhancement for colors
**When** I define color properties
**Then** primary colors use HSL (universal browser support) per UX-2
**And** enhanced colors use oklch (modern browsers) with HSL fallback per UX-2
**And** oklch colors degrade gracefully to HSL in older browsers

**Given** view transitions are enabled for smooth navigation
**When** I add @view-transition to global CSS
**Then** it includes: @view-transition { navigation: auto; } per UX-8
**And** provides fallback for older browsers (instant navigation, no error)

**Given** I view the site in Chrome, Edge, and Safari (last 2 versions)
**When** the page loads
**Then** all design tokens render correctly per NFR17
**And** typography scales fluidly from mobile to desktop per UX-1
**And** color contrast meets WCAG 2.1 AA requirements per NFR11

### Story 3.2: Enhance Badge List Pages with Metadata Display

As a scout,
I want to see difficulty, time estimates, skills, and location requirements on badge list pages,
So that I can quickly scan and compare badges without clicking into each one.

**Acceptance Criteria:**

**Given** I need to enhance the existing badge card component
**When** I update hugo/layouts/partials/badge-card.html
**Then** it displays metadata from data.json using `with` blocks for backward compatibility per ARCH-14
**And** shows difficulty rating with star icons (⭐) per FR13, UX-6
**And** shows time estimate with icon (⏱️) per FR14, UX-6
**And** shows skill tags as clickable pills per FR15
**And** shows location requirement with icons (🏠/🏕️/↔️) per FR16, UX-6
**And** shows special location icons if applicable (🏊/🎯/🏔️) per FR17

**Given** I need styling for the enhanced badge card
**When** I create hugo/assets/scss/components/badge-card.scss
**Then** it uses design tokens for colors, spacing, typography per ARCH-13
**And** follows naming conventions per ARCH-12 (kebab-case)
**And** is placed in components/ directory per ARCH-13
**And** implements mobile-first responsive design per UX-14

**Given** I navigate to a badge list page (e.g., /merit-badges/)
**When** the page loads
**Then** I see all 143 badges displayed as enhanced cards
**And** each card shows: title, difficulty stars, time estimate, skills pills, location icons per FR18, FR19
**And** metadata is visible without hovering or clicking per FR19
**And** the page loads in < 1.5 seconds (FCP) per NFR1

**Given** I am viewing badge cards on mobile
**When** I scan the list
**Then** all metadata fits within card without horizontal scrolling
**And** text is readable at 16px minimum per UX-14
**And** touch targets are 44x44px minimum per UX-14
**And** cards use 1-column layout on mobile, 2-3 columns on desktop

**Given** I need component partials for metadata display
**When** I create hugo/layouts/partials/difficulty-rating.html
**Then** it displays 1-5 stars based on difficulty score
**And** includes aria-label for screen readers: "Difficulty: 3 out of 5" per FR57
**And** uses stars + text + color (not color-only) per FR57, UX-17

**Given** I create hugo/layouts/partials/location-indicator.html
**When** it renders location metadata
**Then** it displays icon + text label (not icon-only) per FR58, UX-17
**And** uses emojis: 🏠 Indoor, 🏕️ Outdoor, ↔️ Flexible per UX-6
**And** includes special location icons if present: 🏊 Pool, 🎯 Range, 🏔️ Wilderness

**Given** I create hugo/layouts/partials/skill-tag.html
**When** it renders skills metadata
**Then** it displays skills as pill/badge format per UX-18
**And** maps skill slugs to display names from interests.yaml per ARCH-14
**And** skill tags will be made clickable in Story 3.4

### Story 3.3: Enhance Badge Detail Pages with Full Metadata Display

As a scout,
I want to see comprehensive metadata and clear requirements on badge detail pages,
So that I fully understand what's involved in earning a specific badge.

**Acceptance Criteria:**

**Given** I need to enhance the existing badge detail page template
**When** I update hugo/layouts/merit-badges/single.html
**Then** it displays all metadata using `with` blocks for backward compatibility per ARCH-14
**And** shows difficulty rating prominently at top of page per FR13
**And** shows time estimate with breakdown per FR14
**And** shows all assigned skills with tags per FR15
**And** shows location requirements clearly per FR16
**And** shows special location requirements if applicable per FR17
**And** displays detailed requirements text per FR11
**And** shows badge title, description, BSA official URL per FR12

**Given** I need a time breakdown component for detailed view
**When** I create hugo/layouts/partials/time-breakdown.html
**Then** it displays time estimate in structured format per UX-18:
- Min hours (e.g., "Minimum: 8 hours")
- Typical hours (e.g., "Typical: 10 hours")
- Max hours (e.g., "Maximum: 12 hours")
**And** uses table or structured list for clarity
**And** is optimized for desktop viewing (counselor planning use case)

**Given** I navigate to a badge detail page (e.g., /merit-badges/camping/)
**When** the page loads
**Then** I see all metadata displayed prominently near the top of the page
**And** difficulty rating shows stars + text: "Difficulty: ⭐⭐⭐ (3/5)"
**And** time estimate shows icon + text: "⏱️ 8-10 hours typical"
**And** skills display as clickable tags (will be linked in Story 3.4)
**And** location requirements show with icons: "🏕️ Outdoor Required, 🏔️ Wilderness Access Needed"
**And** requirements text displays with proper visual hierarchy per FR11

**Given** I am viewing requirements on the badge detail page
**When** I read the requirements
**Then** nested requirements display with proper indentation and formatting
**And** deep linking to specific requirements works (existing feature preserved)
**And** requirement text matches BSA official sources exactly per NFR13

**Given** the badge detail page needs styling
**When** I create hugo/assets/scss/pages/badge-detail.scss
**Then** it uses design tokens for styling per ARCH-13
**And** implements progressive disclosure for complex information per UX-10
**And** uses fluid typography and spacing per UX-1
**And** maintains 60ch max content width for readability per UX-1

**Given** I view the badge detail page on mobile
**When** the page loads
**Then** all metadata is visible without horizontal scrolling
**And** text remains readable at minimum 16px base size per UX-4
**And** page loads in < 1.5 seconds (FCP) per NFR1
**And** time to interactive is < 3.5 seconds per NFR2

### Story 3.4: Add Clickable Navigation Between Badges and Taxonomy Pages

As a scout,
I want to click skill tags and location indicators to explore related badges,
So that I can discover more badges that match my interests.

**Acceptance Criteria:**

**Given** skill tags need to be clickable
**When** I update hugo/layouts/partials/skill-tag.html
**Then** each skill tag is wrapped in a link to its taxonomy page per FR8
**And** links use Hugo taxonomy URLs (e.g., /skills/leadership/)
**And** skill tags are styled as clickable buttons with hover states per UX-7
**And** hover state darkens to --olive-600 per UX-7
**And** focus state shows high-contrast outline for keyboard users per UX-7, FR53

**Given** location indicators need to be clickable
**When** I update hugo/layouts/partials/location-indicator.html
**Then** location indicators link to location taxonomy pages per FR9
**And** links use Hugo taxonomy URLs (e.g., /location_setting/outdoor_required/)
**And** special locations link to their taxonomy pages (e.g., /special_locations/pool/)

**Given** I am viewing a badge detail page with skill tags
**When** I click a skill tag (e.g., "Leadership")
**Then** I navigate to /skills/leadership/ taxonomy page per FR8
**And** navigation uses view transitions for smooth page change per UX-8
**And** I see all badges with the "Leadership" skill

**Given** I am viewing a badge detail page with location indicator
**When** I click the location indicator (e.g., "🏕️ Outdoor Required")
**Then** I navigate to /location_setting/outdoor_required/ taxonomy page per FR9
**And** I see all badges requiring outdoor setting

**Given** I am on a taxonomy page viewing badge cards
**When** I click a skill tag on a badge card
**Then** I navigate to that skill's taxonomy page per FR10
**And** breadcrumb navigation shows my path
**And** I can navigate between related taxonomy pages easily per FR10

**Given** navigation elements need consistent interactive styling
**When** I create hugo/assets/scss/components/interactive-elements.scss
**Then** it styles buttons and links per UX-7:
- Default: Olive background (--olive-500), tan text (--tan-50)
- Hover: Darker olive (--olive-600)
- Focus: High-contrast outline (3px minimum) for keyboard accessibility
- Transition: 0.2s on background and color
**And** all interactive elements are keyboard accessible per NFR9

**Given** I navigate using keyboard only
**When** I press Tab key
**Then** focus moves through all interactive elements in logical order per FR52
**And** focus indicators are clearly visible per FR53, UX-13
**And** I can activate links by pressing Enter

### Story 3.5: Implement Accessibility Features and Keyboard Navigation

As a scout with disabilities,
I want the site to be fully accessible via keyboard and screen readers,
So that I can discover and learn about merit badges regardless of my abilities.

**Acceptance Criteria:**

**Given** the site needs comprehensive accessibility features
**When** I implement WCAG 2.1 AA compliance per NFR7, FR52-FR60
**Then** all pages meet the following requirements:

**Keyboard Navigation (FR52, NFR9):**
- All interactive elements accessible via Tab key
- Logical tab order following visual layout
- Skip navigation link at top: "Skip to main content" per FR54
- Focus indicators visible with 3px minimum high-contrast outline per FR53, UX-17
- No hover-only interactions per UX-13

**Screen Reader Compatibility (NFR10, UX-17):**
- Semantic HTML with proper heading hierarchy per FR55
- Difficulty ratings include aria-label: "Difficulty: 3 out of 5" per FR57
- Location indicators include text labels, not icon-only per FR58
- All images and icons have descriptive alt text per FR59
- Emoji icons supplemented with aria-labels for screen reader announcements

**Color Contrast (FR56, NFR11):**
- Text meets 4.5:1 contrast ratio minimum per FR56
- UI components meet 3:1 contrast ratio minimum per FR56
- Difficulty ratings use stars + text + color, not color-only per FR57
- Location indicators use icons + text, not color-only per FR58
- All color combinations verified against WCAG 2.1 AA standards

**Given** I need to test accessibility compliance
**When** I run Lighthouse accessibility audit
**Then** all pages achieve score of 100 per FR60, NFR8
**And** no accessibility violations are detected

**Given** I navigate the site using only keyboard
**When** I press Tab key repeatedly
**Then** focus moves through: skip link → main navigation → badge cards → skill tags → location indicators → footer
**And** focus indicators are clearly visible at all times per UX-13
**And** I can activate any element by pressing Enter or Space

**Given** I use VoiceOver screen reader on macOS
**When** I navigate the site
**Then** all content is announced correctly per UX-17
**And** emoji icons are announced with aria-labels (e.g., "star" for ⭐, "house" for 🏠)
**And** semantic landmarks allow quick navigation (main, nav, footer)
**And** heading structure allows outline navigation per FR55

**Given** I view the site on mobile with large text enabled
**When** I zoom to 200%
**Then** content reflows without horizontal scrolling per WCAG 2.1 AA
**And** text remains readable and layout remains functional
**And** touch targets remain 44x44px minimum per UX-14

**Given** I need to verify progressive enhancement
**When** I disable JavaScript
**Then** core badge browsing functionality still works per NFR19
**And** taxonomy navigation functions correctly
**And** metadata displays on all pages
**And** only interactive enhancements are missing (view transitions, expandable sections)

**Given** I test on Chrome, Edge, and Safari (last 2 versions)
**When** I load any page
**Then** accessibility features work correctly on all browsers per NFR17
**And** keyboard navigation functions identically per NFR9
**And** screen reader compatibility verified on each browser per NFR10

---

## Epic 4: Requirement Change Tracking

Counselors stay current on badge requirement changes without manual checking, maintaining teaching accuracy.

### Story 4.1: Generate Changelog Data and Display Update Indicators on Badge Pages

As a counselor,
I want to see a visual indicator when badge requirements have been updated recently,
So that I know which badges need my attention for teaching updates.

**Acceptance Criteria:**

**Given** I need to generate changelog data from BSA change documents
**When** I create scripts/generate-changelog.ts
**Then** it parses the BSA published change document (authoritative source per ARCH-3)
**And** detects requirement changes by comparing new vs existing data.json per FR31
**And** generates changelog entries with date, badge slug, requirement ID, old text, new text per FR32
**And** stores changelog data in dedicated changelog JSON files per badge
**And** follows naming conventions per ARCH-12 (kebab-case filename)
**And** uses fail-fast error handling with prefixed messages per ARCH-15

**Given** changelog data exists for badges
**When** I add last_updated field to data.json metadata
**Then** it stores the date of the most recent requirement change
**And** is populated by generate-changelog.ts during annual metadata updates per ARCH-3

**Given** I need to display update indicators on badge pages
**When** I create hugo/layouts/partials/requirements-updated.html
**Then** it displays 🆕 badge if requirements updated within 90 days per FR20, UX-6
**And** shows "Last updated: [date]" text per FR24
**And** is conditionally rendered using `with` blocks for backward compatibility per ARCH-14

**Given** I navigate to a badge page that was recently updated
**When** the page loads
**Then** I see a prominent 🆕 indicator near the top of the page per FR20
**And** I see "Requirements updated 45 days ago" or similar text per FR24
**And** the indicator is visually distinct (uses teal accent color --teal-500) per UX-3
**And** the 🆕 badge includes aria-label for screen readers: "Requirements recently updated"

**Given** I navigate to a badge page that hasn't been updated recently
**When** the page loads
**Then** I do NOT see the 🆕 indicator
**And** I see "Last updated: [date]" in footer or metadata area per FR24

**Given** I need styling for the update indicator
**When** I create hugo/assets/scss/components/requirements-updated.scss
**Then** it styles the 🆕 badge with teal accent background per UX-3
**And** uses design tokens for colors and spacing per ARCH-13
**And** is mobile-responsive and visible on all screen sizes per UX-14

**Given** the 🆕 indicator should be clickable
**When** I update the requirements-updated.html partial
**Then** the indicator links to the badge's changelog page (to be created in Story 4.2)
**And** includes hover state showing it's clickable per UX-7
**And** is keyboard accessible per NFR9

### Story 4.2: Create Per-Badge Changelog Pages with Before/After Comparison

As a counselor,
I want to view a detailed changelog for a specific badge showing exactly what changed,
So that I can update my lesson plans and teaching materials accurately.

**Acceptance Criteria:**

**Given** I need per-badge changelog pages
**When** I create hugo/layouts/merit-badges/changelog.html template
**Then** it renders changelog at /merit-badges/[badge-slug]/changelog/ per FR21
**And** displays all requirement changes for that badge in reverse chronological order (newest first)
**And** follows mobile-first responsive design per UX-14

**Given** I need to structure changelog data for Hugo
**When** generate-changelog.ts creates changelog files
**Then** it creates hugo/content/merit-badges/[badge-slug]/changelog.md per badge with changes
**And** changelog.md includes frontmatter with badge metadata and change entries
**And** follows Hugo content structure per ARCH-13

**Given** I navigate to a badge's changelog page (e.g., /merit-badges/camping/changelog/)
**When** the page loads
**Then** I see the badge title and "Requirements Changelog" heading
**And** I see all changes listed by date (most recent first)
**And** each change shows:
  - Date of change
  - Requirement ID (e.g., "Requirement 9a")
  - Before/after comparison per FR23
**And** the page is accessible via the 🆕 indicator on the badge detail page

**Given** I am viewing a requirement change entry
**When** I look at the before/after comparison
**Then** I see "Previous:" text showing old requirement wording per FR23
**And** I see "Updated:" text showing new requirement wording per FR23
**And** visual styling highlights the differences (strikethrough for removed, bold for added)
**And** the comparison is readable on mobile without horizontal scrolling

**Given** I need styling for changelog pages
**When** I create hugo/assets/scss/pages/changelog.scss
**Then** it styles before/after comparison with clear visual distinction
**And** uses design tokens for colors (tan for old, olive for new) per UX-3
**And** includes proper spacing between change entries per UX-1
**And** is optimized for desktop reading (counselor planning context) per UX-14

**Given** I am a counselor viewing the changelog
**When** I review the changes
**Then** I can easily understand what changed without comparing documents manually
**And** the change date helps me determine when to update lesson plans
**And** the requirement ID allows me to locate the change in official BSA materials

**Given** breadcrumb navigation is needed
**When** I view a badge's changelog page
**Then** I see breadcrumbs: "Home > [Badge Name] > Changelog"
**And** breadcrumbs are clickable for easy navigation back to badge page per FR10
**And** breadcrumbs are keyboard accessible per NFR9

### Story 4.3: Create Global Changelog Page Listing All Recent Changes

As a counselor,
I want to view a master list of all recent badge requirement changes across all badges,
So that I can stay current on all updates without checking individual badges.

**Acceptance Criteria:**

**Given** I need a global changelog page
**When** I create hugo/content/merit-badges/changelog/index.md
**Then** the page is accessible at /merit-badges/changelog/ per FR22
**And** it lists all requirement changes across all 143 badges

**Given** I need a template for the global changelog
**When** I create hugo/layouts/merit-badges/changelog/list.html
**Then** it displays all changes in reverse chronological order (newest first)
**And** groups changes by badge for clarity
**And** follows mobile-first responsive design per UX-14

**Given** I navigate to /merit-badges/changelog/
**When** the page loads
**Then** I see "Merit Badge Requirements Changelog" heading
**And** I see all recent changes (past 90 days prominent, older changes available)
**And** each change entry shows:
  - Badge name (linked to badge detail page)
  - Date of change
  - Requirement ID
  - Brief description of change (e.g., "Requirement 9a: wording updated")
  - Link to per-badge changelog page for full details

**Given** the global changelog has many entries
**When** I scroll the page
**Then** changes are organized clearly with visual separation per UX-1
**And** badge names are prominent for quick scanning
**And** pagination or "Load more" is used if needed per UX-12 (no infinite scroll)

**Given** I am viewing a change entry on the global changelog
**When** I click the badge name
**Then** I navigate to that badge's detail page per FR46
**And** can see the 🆕 indicator if still within 90-day window

**Given** I click "View full changelog" link for a specific badge
**When** the link is activated
**Then** I navigate to that badge's per-badge changelog page per FR21
**And** see complete before/after comparison for all changes

**Given** I need to discover the global changelog
**When** I view the site navigation
**Then** I see "Requirements Changelog" or "What's New" link in main navigation or footer
**And** it links to /merit-badges/changelog/
**And** is keyboard accessible per NFR9

**Given** the global changelog needs SEO optimization
**When** the page renders
**Then** it includes meta description highlighting recent changes per SEO-1
**And** H1 is SEO-optimized: "Merit Badge Requirements Changelog - Recent Updates"
**And** page is included in sitemap.xml per SEO-4

### Story 4.4: Add Email Notification Signup for Counselors (Optional)

As a counselor,
I want to receive email notifications when badge requirements change,
So that I stay informed without manually checking the website.

**Acceptance Criteria:**

**Given** I need an email signup form for changelog notifications
**When** I create an email subscription component
**Then** it is displayed on:
  - Global changelog page (/merit-badges/changelog/)
  - Per-badge changelog pages
  - Badge detail pages (subtle, non-intrusive placement)
**And** follows ANALYTICS-2: opt-in only, no push notifications per ANALYTICS-2

**Given** I am viewing the global changelog page
**When** I scroll to the bottom
**Then** I see an email signup form with heading: "Get notified of requirement changes"
**And** form includes: email input field, "Subscribe" button
**And** form includes privacy notice: "We'll only email you when badge requirements change. Unsubscribe anytime."
**And** form is keyboard accessible per NFR9

**Given** I enter my email and click "Subscribe"
**When** the form is submitted
**Then** my email is stored for future notifications (implementation details TBD - may use Firebase, Mailchimp, or simple email list)
**And** I see confirmation message: "You're subscribed! We'll email you when requirements change."
**And** form validates email format before submission

**Given** email notifications need to be sent (implementation note)
**When** badge requirements are updated annually per ARCH-3
**Then** system sends email to all subscribers listing changed badges and linking to changelog per ANALYTICS-2
**And** email includes unsubscribe link per best practices
**And** email frequency is limited (maximum once per update cycle)

**Given** I need styling for the email signup form
**When** I create hugo/assets/scss/components/email-signup.scss
**Then** it uses design tokens for styling per ARCH-13
**And** button follows interactive element styling per UX-7
**And** form is mobile-responsive per UX-14
**And** uses earth-tone color palette per UX-3

**Given** the signup form should not be intrusive
**When** displayed on badge detail pages
**Then** it appears in sidebar or footer area, not interrupting main content
**And** uses subtle styling (not bright colors or animations)
**And** can be easily dismissed if user not interested

**Given** privacy and COPPA considerations
**When** implementing email collection
**Then** form is targeted at adult counselors, not scouts (ages 11-17)
**And** includes privacy policy link
**And** complies with email marketing best practices
**And** provides clear unsubscribe mechanism per ANALYTICS-2

---

## Epic 5: SEO & Analytics Enhancement

Site becomes discoverable via search engines and measurable via analytics, driving organic traffic growth and validating product decisions.

### Story 5.1: Implement Schema.org Structured Data for All Pages

As a scout searching Google,
I want Merit Badge University pages to appear in rich search results with helpful previews,
So that I can quickly determine if the site has the information I need.

**Acceptance Criteria:**

**Given** I need Schema.org structured data for taxonomy pages
**When** I create hugo/layouts/partials/json-ld/taxonomy-itemlist.html
**Then** it generates ItemList schema for all taxonomy landing pages per FR40, SEO-2
**And** includes: name, description, numberOfItems, itemListElement array
**And** each itemListElement includes badge name, URL, position
**And** uses JSON-LD format embedded in page <head> per SEO-2

**Given** I need Schema.org structured data for badge pages
**When** I enhance existing hugo/layouts/partials/json-ld/ structure per SEO-2
**Then** it generates Article or HowTo schema for badge pages per FR41
**And** includes: name, description, url, dateModified (from last_updated)
**And** includes difficulty, timeRequired, skills as schema properties where applicable
**And** references BSA as authoritative source

**Given** I navigate to a skills taxonomy page (e.g., /skills/leadership/)
**When** I view the page source
**Then** I see JSON-LD script tag in <head> with ItemList schema per FR40
**And** schema validates without errors using Google's Rich Results Test per NFR21
**And** includes meta description from interests.yaml per SEO-1

**Given** I navigate to a badge detail page (e.g., /merit-badges/camping/)
**When** I view the page source
**Then** I see JSON-LD script tag with Article/HowTo schema per FR41
**And** schema includes all required properties
**And** schema validates without errors per NFR21

**Given** I search Google for "leadership merit badges"
**When** Google indexes the /skills/leadership/ page
**Then** the rich search result may display badge count and description
**And** structured data helps Google understand page content for ranking per NFR20

**Given** Hugo sitemap needs to include all new pages
**When** Hugo builds the site
**Then** sitemap.xml automatically includes all 143 badge pages + 53 taxonomy pages per FR43, NFR22, SEO-4
**And** sitemap includes proper lastmod dates from changelog data
**And** sitemap follows XML sitemap protocol

**Given** I need to submit sitemap to Google Search Console
**When** initial deployment is complete
**Then** sitemap.xml is accessible at /sitemap.xml
**And** can be manually submitted to Google Search Console per SEO-4
**And** robots.txt allows all crawling (no restrictions) per existing architecture

**Given** all Schema.org markup needs validation
**When** I run validation during pre-deployment checklist per TEST-2
**Then** all structured data validates without errors using Google Rich Results Test per NFR21
**And** no structured data warnings that could impact search appearance

### Story 5.2: Enhance OpenGraph and Social Sharing Metadata

As a counselor sharing badge resources,
I want links to display with rich previews on social media platforms,
So that other counselors and scouts can see what they're clicking before they visit.

**Acceptance Criteria:**

**Given** OpenGraph tags need to be enhanced site-wide
**When** I update hugo/layouts/_default/baseof.html head block per SEO-3
**Then** it includes OpenGraph meta tags for all pages:
- og:title (page-specific, SEO-optimized)
- og:description (from interests.yaml or page description)
- og:url (canonical page URL)
- og:type (website or article)
- og:image (site logo or badge-specific image if available)
- og:site_name ("Merit Badge University")

**Given** Twitter Card meta tags need to be included
**When** I enhance the baseof.html head block
**Then** it includes Twitter Card tags per FR42:
- twitter:card (summary or summary_large_image)
- twitter:title
- twitter:description
- twitter:image

**Given** I navigate to a skills taxonomy page (e.g., /skills/leadership/)
**When** I view the page source
**Then** og:title is "Leadership Merit Badges - Merit Badge University"
**And** og:description uses meta_description from interests.yaml per SEO-3
**And** og:url is the canonical page URL
**And** all OpenGraph tags are properly formatted

**Given** I share a badge detail page link on Facebook
**When** Facebook fetches the page metadata
**Then** the preview shows: badge title, description, site name, image per FR42
**And** preview is compelling and professional per Epic 5 goal
**And** image (if included) meets Facebook's recommended dimensions

**Given** I share a taxonomy page link on Twitter
**When** Twitter fetches the page metadata
**Then** the Twitter Card displays: page title, description, image
**And** preview looks professional and encourages clicks

**Given** internal links need to be optimized for SEO
**When** I review all generated pages
**Then** skill tags link to skill taxonomy pages per FR46
**And** location indicators link to location taxonomy pages per FR46
**And** related badge suggestions include cross-links per FR46
**And** breadcrumb navigation creates internal linking structure per FR46
**And** all internal links use descriptive anchor text (not "click here")

**Given** meta descriptions need to be optimized
**When** taxonomy pages render
**Then** they use AI-generated meta descriptions from interests.yaml per FR44, SEO-1
**And** descriptions are 150-160 characters per SEO-1
**And** descriptions include target keywords for SEO per FR44

**Given** H1 tags need SEO optimization
**When** taxonomy pages render
**Then** H1 includes target keywords per FR45
**And** follows format: "[Skill/Difficulty/Location] Merit Badges" for taxonomy pages
**And** is unique per page (not duplicated across site)

### Story 5.3: Integrate Pirsch Analytics for Privacy-Friendly Tracking

As a product owner,
I want to measure which taxonomy pages drive traffic and track user engagement,
So that I can validate the taxonomy system's effectiveness and make data-driven decisions.

**Acceptance Criteria:**

**Given** Pirsch Analytics needs to be integrated site-wide
**When** I add Pirsch tracking script to hugo/layouts/_default/baseof.html
**Then** it loads Pirsch JavaScript from CDN in <head> or before </body> per ANALYTICS-1
**And** uses privacy-friendly tracking (no cookies, GDPR/COPPA compliant) per ANALYTICS-1
**And** respects Do Not Track browser settings
**And** does not track personal information or IP addresses

**Given** page visits need to be tracked
**When** a user visits any page
**Then** Pirsch records the page view per FR47
**And** tracks: page path, referrer, device type, browser
**And** tracks taxonomy browser (/badges/browse/) visits per FR47
**And** tracks taxonomy landing page visits per FR47
**And** tracks badge page visits per FR47

**Given** referral sources need to be tracked
**When** a user navigates from a taxonomy page to a badge page
**Then** Pirsch tracks the referral source per FR48, ANALYTICS-1
**And** analytics show: "which taxonomy page led to which badge page"
**And** enables analysis of most effective discovery paths

**Given** returning visitors need to be identified
**When** a user visits the site multiple times
**Then** Pirsch identifies returning visitors without cookies per FR49, ANALYTICS-1
**And** uses privacy-friendly fingerprinting methods
**And** tracks return visit count and patterns

**Given** engagement metrics need to be tracked
**When** a user interacts with the site
**Then** Pirsch tracks time on page per FR50, ANALYTICS-1
**And** tracks scroll depth per FR50, ANALYTICS-1
**And** enables calculation of average time on page per badge per ANALYTICS-1

**Given** deep link usage needs to be tracked
**When** a user clicks the # symbol to copy a requirement deep link
**Then** Pirsch records the click event per ANALYTICS-1
**And** tracks which requirements are most frequently shared
**And** validates value of deep linking feature

**Given** changelog engagement needs to be tracked
**When** a user clicks the 🆕 indicator or visits changelog pages
**Then** Pirsch tracks changelog page visits
**And** measures changelog visits as % of badge page traffic per Epic 4 goal (target: 5%+)

**Given** I need to access analytics data
**When** I log into Pirsch dashboard
**Then** I can view all tracked metrics per FR47-FR50
**And** can segment data by: page type, device, time period
**And** can export data for analysis

**Given** trending badges calculation is needed
**When** I create a GitHub Action for daily analytics processing per ANALYTICS-1
**Then** it fetches Pirsch analytics API data daily
**And** calculates top trending badges based on recent traffic
**And** updates static JSON file (e.g., hugo/data/trending.json)
**And** triggers Hugo rebuild to update site with fresh trending data
**And** maintains static architecture while providing daily-fresh popularity data per ANALYTICS-1

### Story 5.4: Implement Browser localStorage Bookmarks for Scout Discovery

As a scout exploring multiple badges,
I want to bookmark badges I'm interested in for later review,
So that I don't lose track of badges I'm considering.

**Acceptance Criteria:**

**Given** scouts need a way to save badges for later
**When** I create a bookmark feature using browser localStorage per ANALYTICS-3
**Then** it stores bookmarked badge slugs in localStorage (no login required)
**And** localStorage key is namespaced (e.g., "mbu_bookmarks")
**And** follows account-free architecture per existing requirements

**Given** I need a bookmark button on badge pages
**When** I create hugo/layouts/partials/bookmark-button.html
**Then** it displays a bookmark icon/button on badge detail pages
**And** button toggles between "Bookmark" and "Bookmarked" states
**And** uses star icon or similar (⭐ empty vs ★ filled)
**And** is keyboard accessible per NFR9

**Given** I need styling for the bookmark button
**When** I create hugo/assets/scss/components/bookmark-button.scss
**Then** it uses design tokens for styling per ARCH-13
**And** follows interactive element styling per UX-7
**And** includes visual feedback on hover and click
**And** is mobile-responsive per UX-14

**Given** I am viewing a badge detail page
**When** I click the "Bookmark" button
**Then** the badge slug is saved to localStorage per ANALYTICS-3
**And** button changes to "Bookmarked" state with filled icon
**And** visual feedback confirms the action (e.g., brief animation)

**Given** I click "Bookmarked" button on a previously bookmarked badge
**When** the button is activated
**Then** the badge slug is removed from localStorage
**And** button changes back to "Bookmark" state with empty icon

**Given** I need a way to view my bookmarked badges
**When** I create a "My Bookmarks" page or section
**Then** it displays all bookmarked badges from localStorage
**And** shows badge cards with metadata (same as list pages)
**And** includes "Remove bookmark" action on each card
**And** is accessible from main navigation

**Given** the localStorage limitation needs to be documented
**When** I display the bookmarks feature
**Then** it includes notice: "Bookmarks are stored locally and won't sync across devices" per ANALYTICS-3
**And** explains that clearing browser data will remove bookmarks
**And** sets appropriate user expectations

**Given** I view my bookmarks on a different device
**When** I check my bookmarks
**Then** bookmarks do NOT appear (localStorage is device-specific) per ANALYTICS-3
**And** this is acceptable trade-off per account-free architecture

**Given** JavaScript is required for bookmarks
**When** JavaScript is disabled
**Then** bookmark button is hidden or shows message: "Bookmarks require JavaScript"
**And** core browsing functionality still works per NFR19 (progressive enhancement)

**Given** counselor planning metadata needs to be visible
**When** I view badge list pages or taxonomy pages
**Then** time estimates are visible at a glance per ANALYTICS-4
**And** difficulty ratings are visible per ANALYTICS-4
**And** counselors can pre-filter badges before clicking into details per ANALYTICS-4
**And** this supports counselor planning workflow per Epic goal
