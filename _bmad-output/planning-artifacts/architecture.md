---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
workflowType: 'architecture'
project_name: 'mbu'
user_name: 'Mark'
date: '2026-01-21'
lastStep: 8
status: 'complete'
completedAt: '2026-01-21'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

Merit Badge University Phase 1 adds four foundation systems to an existing Hugo static site serving 143 merit badge pages:

1. **AI-Generated Metadata System** (FRs 25-29)
   - Difficulty ratings (1-5 scale) for all badges
   - Time estimates (min/typical/max hours) per badge
   - Skills tagging (5-10 skills per badge from 30-50 master taxonomy)
   - Location requirements (indoor/outdoor/flexible)
   - Special location identification (pool, shooting range, wilderness, farm, water body)

2. **Taxonomy-Based Discovery** (FRs 1-10, 34-39)
   - Hugo-generated landing pages for skills, difficulty, location, special locations
   - Taxonomy browser hub page for direct visitors
   - Clickable navigation between taxonomy pages and badge pages
   - SEO-optimized landing pages targeting long-tail searches

3. **Requirement Changelog Automation** (FRs 20-24, 31-33)
   - Annual changelog generation from BSA published change document
   - Per-badge and global changelog pages
   - Visual indicators (🆕) for badges updated within 90 days
   - Before/after comparison display

4. **Enhanced Badge Display** (FRs 11-19)
   - Requirements remain authoritative BSA text (unalterable)
   - Metadata displayed prominently on list and detail pages
   - Deep linking to individual requirements (already implemented)
   - Visual hierarchy for nested requirements

**Architectural Implications:**
- Build-time processing dominates - all metadata generation happens before Hugo build
- Dual storage pattern required - data.json for rendering + frontmatter for taxonomies
- No runtime backend or databases - pure static site architecture
- SEO is primary growth driver - 50+ new indexed pages within 3 months
- **Annual update cadence** - Metadata updates happen once per year when BSA updates requirements, with human-in-the-loop AI review

**Non-Functional Requirements:**

**Performance (NFRs 1-6):**
- First Contentful Paint < 1.5 seconds (validated: Hugo builds in milliseconds)
- Time to Interactive < 3.5 seconds
- Page weight < 500KB (HTML + CSS + fonts)
- Hugo build time < 2 minutes (validated: scales without issues at 143 badges + 50+ taxonomy pages)
- Lighthouse Performance 90+, Accessibility 100, SEO 100

**Accessibility (NFRs 7-12):**
- WCAG 2.1 Level AA compliance across all pages (critical for educational content serving youth)
- Keyboard navigation for all interactive elements
- Screen reader compatibility (semantic HTML, ARIA labels for emoji icons)
- 4.5:1 text contrast, 3:1 UI component contrast
- No color-only information (icons + text + color)

**Content Quality (NFRs 13-16):**
- BSA requirement accuracy (exact match to official sources)
- AI metadata accuracy 90%+ (validated via manual spot-checks on 10 random badges)
- Changelog sourced from authoritative BSA published change document (eliminates false positive detection)
- Annual requirement updates via manual metadata generation process

**Browser Compatibility (NFRs 17-19):**
- Chrome, Edge, Safari (last 2 versions) - modern CSS features validated
- iOS Safari and Chrome on Android
- Progressive enhancement - core functionality works without JavaScript

**Deployment (NFRs 25-27):**
- Automated CI/CD via GitHub Actions
- Failed builds must not deploy to production
- Deployment within 5 minutes of commit to trunk

### Scale & Complexity

- **Primary domain:** Static Site Generator / JAMstack Web Application
- **Complexity level:** Medium (simplified by annual update cadence and manual QA gates)
- **Estimated architectural components:** 7-8 major components
  - Metadata generation scripts (4 separate Bun scripts) - run annually
  - Hugo taxonomy system configuration
  - Badge requirements scraper with BSA change document parsing
  - Hugo templates for badge pages and taxonomy pages
  - Build orchestration (GitHub Actions workflow)
  - Firebase Hosting deployment
  - Analytics integration (Pirsch)

**Project Scale:**
- 143 badge pages (existing, requires enhancement)
- 50+ new taxonomy landing pages (generated)
- 4 metadata generation scripts (new)
- 1 changelog generator parsing BSA change document (new)
- Annual metadata updates (not continuous)
- Zero runtime infrastructure (static CDN-hosted)

### Technical Constraints & Dependencies

**Existing Infrastructure:**
- Hugo extended version >= 0.129.0 (SCSS/Sass processing via Dart Sass)
- Bun JavaScript runtime for metadata scripts
- Firebase Hosting via GitHub Actions CI/CD
- Custom Docker image with Hugo + Bun pre-installed
- Existing design system (modern CSS, Scout uniform colors, Geologica font)

**Critical Constraints:**
- Requirements text is sacred - no alterations permitted (BSA official source)
- Dual storage synchronization - data.json and frontmatter must stay consistent
- Build-time only processing - no runtime backend or databases
- Browser support limited to Chrome, Edge, Safari (Firefox explicitly excluded)
- COPPA awareness for youth users (ages 11-17, though no data collection in Phase 1)
- **Annual update cadence** - Manual process with human validation, no complex rollback needed

**Dependencies:**
- Hugo's native taxonomy system for landing page generation
- Bun for TypeScript script execution
- Cheerio + Impit for web scraping (TLS fingerprint mimicry) - if needed for requirements updates
- GitHub Actions for deployment pipeline
- Firebase Hosting CDN for static asset delivery
- Google Search Console for SEO tracking
- Pirsch Analytics for privacy-friendly analytics
- BSA published change document (authoritative source for changelog generation)

**Risk Assessment Updates:**
- **Dual storage sync risk:** LOW (downgraded from HIGH) - annual cadence with human review makes atomic updates nice-to-have, not critical
- **Build performance risk:** NONE - validated in milliseconds
- **Changelog accuracy risk:** LOW - authoritative BSA document eliminates heuristic detection issues
- **Image optimization:** First-pass "good enough" approach, optimize later if needed

### Cross-Cutting Concerns Identified

**1. Data Consistency & Validation**
- Dual storage (data.json + frontmatter) requires atomic updates (best practice)
- Pre-deployment manual validation via AI review against BSA change document
- Schema validation for all generated metadata before deployment

**2. Build Pipeline Orchestration**
- Simplified for annual cadence: Generate → Review → Deploy
- Execution order: metadata generation (Bun scripts run sequentially) → Hugo build → deployment
- Manual QA gates appropriate for annual updates
- No complex rollback mechanism needed

**3. SEO & Discoverability**
- Structured data (Schema.org) on all taxonomy and badge pages
- Social sharing metadata (OpenGraph, Twitter Cards)
- Sitemap generation and submission to Google Search Console
- Meta descriptions for 50+ new pages (manual effort, AI-assisted drafting)

**4. Performance & Loading**
- Per-page CSS loading strategy (only load what's needed)
- Critical CSS inlined in `<head>` for sub-1-second FCP
- Static asset optimization (WOFF2 fonts, compressed CSS)
- Hugo build time validated (milliseconds, no optimization needed)
- Image optimization: First-pass approach, measure-then-optimize strategy

**5. Accessibility & Inclusive Design**
- WCAG 2.1 AA compliance enforced via Lighthouse audits (critical for youth educational content)
- Keyboard navigation patterns consistent across all components
- Screen reader testing (VoiceOver) for emoji icons with aria-labels
- High-contrast focus indicators (3px minimum)
- Pre-deployment accessibility validation checklist

**6. Dual-Audience UX Strategy**
- Scout-focused: Visual-first badge cards, mobile-optimized, quick scanning
- Counselor-focused: Text-dense planning panels, desktop-optimized, detailed information
- Shared foundation: Same design tokens, consistent navigation patterns
- No separate interfaces - contextual emphasis within single site

**7. Analytics & Measurement**
- Pirsch Analytics for privacy-friendly tracking (GDPR/COPPA compliant)
- Google Search Console for SEO performance tracking
- Deep link usage tracking (# click events) for feature discoverability
- Changelog engagement tracking (5%+ target of badge page traffic)

**8. Content Accuracy & Authority**
- BSA requirements must match official sources exactly
- Last updated dates and visual indicators for transparency
- Changelog sourced from authoritative BSA published change document
- Annual updates with human-in-the-loop AI validation

**9. Testing Strategy (Right-Sized for Annual Cadence)**
- Pre-deployment checklist with human validation (not heavy CI/CD automation)
- AI reviews metadata changes against BSA change document
- Spot-check 10 random badges for accuracy
- Visual regression test on 5 sample taxonomy pages
- Lighthouse audit (accessibility 100, performance 90+, SEO 100)
- Manual smoke test on preview environment before production promotion
- Focus areas: Accessibility validation, performance budgets, metadata accuracy

### Architectural Decision Summary

**Core Architecture Pattern: "Boring Technology" (Static Site + Build-Time Intelligence)**

The architecture is intentionally simple and reliable:
- Static site generation (Hugo) with build-time metadata processing (Bun)
- Annual update cadence with manual QA gates
- Authoritative data sources (BSA requirements + BSA change document)
- No runtime complexity, no databases, no servers to maintain
- Human-in-the-loop validation prevents deployment of bad data

**Key Architectural Strengths:**
- ✅ Proven technology stack (Hugo + Bun + Firebase Hosting)
- ✅ Zero operational complexity (static files on CDN)
- ✅ Annual cadence eliminates need for complex automation
- ✅ Human validation ensures quality control
- ✅ Authoritative sources eliminate heuristic detection issues
- ✅ Performance validated (millisecond builds, sub-1s page loads)

**Implementation Approach:**
Simple sequential process appropriate for annual cadence:
1. Run metadata generation scripts (Bun) - sequential execution to avoid file conflicts
2. AI reviews changes against BSA change document
3. Spot-check 10 badges manually for accuracy
4. Hugo builds site with updated taxonomies
5. Deploy to preview → manual smoke test → promote to production

**No Complex Patterns Needed:**
- ❌ No complex rollback mechanism (manual cadence supports simple rollback if needed)
- ❌ No extensive CI/CD validation pipeline (human review gate is quality control)
- ❌ No automated testing suite for metadata generation (AI + human validation)
- ❌ No real-time synchronization (annual updates are manual)

The architecture prioritizes reliability, maintainability, and simplicity over premature optimization.

## Architectural Foundation (Brownfield)

### Existing Technical Stack

Merit Badge University is a **brownfield enhancement project** building on a proven technical foundation. Phase 1 adds metadata generation and taxonomy features to an existing, working Hugo static site.

**Core Technologies (Already Established):**

**Static Site Generation:**
- Hugo (extended version >= 0.129.0) for static site generation
- SCSS with Dart Sass transpiler for styling
- Hugo page bundles architecture (directory per badge with _index.md + data.json)
- Hugo taxonomy system (will be configured for Phase 1 metadata)

**Runtime & Build Tools:**
- Bun JavaScript/TypeScript runtime (for metadata generation scripts)
- TypeScript with strict mode enabled
- Prettier for code formatting (double quotes, semicolons, 80 char width)

**Scraping & Data Pipeline:**
- Cheerio for HTML parsing
- Impit for TLS fingerprint mimicry (anti-bot protection)
- Existing scraper: `scripts/sync-requirements.ts`
- Static badge list: `scripts/merit-badges.ts` (143 badges)
- Rate limiting: 500-1500ms random delays between requests

**Deployment & CI/CD:**
- Firebase Hosting (production CDN)
- GitHub Actions workflows:
  - `firebase-hosting-merge.yml` - Production deploys on push to `trunk`
  - `firebase-hosting-pull-request.yml` - Preview deploys for PRs
  - `docker-image.yml` - Custom Docker image with Hugo + Bun
- Main branch: `trunk` (not main/master)

### Existing Data Architecture

**Dual Storage Pattern (Extend for Phase 1):**

Phase 1 will extend this existing pattern with strategic architectural decisions:

**Decision 1: Extend data.json (Not Separate Files)**

**Rationale:** Single source of truth per badge, atomic updates, no file sync issues

**data.json Extension** (Phase 1 Addition):
```json
{
  "title": "Archery",
  "slug": "archery",
  "url": "https://www.scouting.org/merit-badges/archery/",
  "eagle_required": false,
  "pamphlet_url": "https://...",
  "requirements": [...],
  "metadata": {
    "difficulty": 3,
    "time_estimate": {
      "min_hours": 8,
      "typical_hours": 10,
      "max_hours": 12
    },
    "skills": ["leadership", "outdoor-skills", "physical-fitness"],
    "location": {
      "setting": "outdoor_required",
      "special_locations": ["wilderness"]
    }
  }
}
```

**Why extending data.json beats separate metadata files:**
- ✅ Single file per badge (143 files, not 286)
- ✅ Atomic updates (one write operation)
- ✅ Hugo templates already read data.json
- ✅ No data.json ↔ metadata.json desync risk
- ✅ Simpler backup/restore
- ❌ Separate files would create 143 × 2 = 286 files to sync

**_index.md Frontmatter** (Extend for Hugo Taxonomies):

Phase 1 will add taxonomy terms to existing frontmatter:
```yaml
---
title: "Archery Merit Badge"
# Phase 1 additions for Hugo taxonomy system:
skills: ["leadership", "outdoor-skills", "physical-fitness"]
difficulty: [3]
location_setting: ["outdoor_required"]
special_locations: ["wilderness"]
---
```

**Backward Compatibility Strategy:**

Hugo templates use `with` blocks for safe additions:
```go
{{ $data := .Site.Data.merit_badges[.Params.slug].data }}

{{/* Existing template code - unchanged */}}
{{ range $data.requirements }}
  {{/* Display requirements */}}
{{ end }}

{{/* NEW - Phase 1 additions with backward compatibility */}}
{{ with $data.metadata }}
  <div class="badge-metadata">
    <span class="difficulty">Difficulty: {{ .difficulty }}/5</span>
    <span class="time">{{ .time_estimate.typical }} hours typical</span>
    {{ range .skills }}
      <a href="/skills/{{ . }}/">{{ . }}</a>
    {{ end }}
  </div>
{{ end }}
```

**The `with` block ensures:** If metadata doesn't exist (old data), template continues working without errors.

**Requirement Path System (Existing - No Changes Needed):**
- URL-friendly anchors using dots: "1.a.2"
- Deep linking to individual requirements (already working)
- Hover `#` symbol copies link to clipboard
- Persistent highlight on deep-linked requirements

### Hugo Taxonomy Configuration

**Decision 2: Hugo Native Taxonomy System (53 New Pages)**

**Configuration:**
```toml
# hugo/hugo.toml
[taxonomies]
  skill = "skills"
  difficulty = "difficulty"
  location_setting = "location_setting"
  special_location = "special_locations"
```

**Hugo automatically generates:**
- `/skills/` - List of all skills
- `/skills/leadership/` - All badges tagged with leadership skill
- `/difficulty/3/` - All difficulty-3 badges
- `/location_setting/outdoor_required/` - All outdoor-required badges
- `/special_locations/wilderness/` - All badges requiring wilderness access

**Scale Analysis:**
- ~40 skill pages
- 5 difficulty pages (levels 1-5)
- 3 location setting pages (indoor_required, outdoor_required, either)
- ~5 special location pages (pool, shooting_range, wilderness, farm, water_body)
- **Total: ~53 new static pages**

**Performance Validation:**
- Current: 143 badge pages build in milliseconds
- Addition: 53 taxonomy pages
- Expected: Still sub-second builds (Hugo's taxonomy system is highly optimized)
- **Risk: NONE** - validated that Hugo scales fine at this size

### Metadata Generation Scripts

**Decision 3: Four Separate Scripts (Not Monolithic)**

**Rationale:** Individual development/debugging, selective reruns, parallel development

**Script Architecture:**
```
scripts/
├── generate-difficulty.ts    # AI-powered difficulty scoring (1-5 scale)
├── generate-skills.ts         # AI-powered skills tagging (5-10 per badge)
├── generate-location.ts       # AI-powered location classification
├── generate-changelog.ts      # Parse BSA change document
└── validate-metadata.ts       # Validation script (Phase 1 addition)
```

**Package.json Configuration:**
```json
{
  "scripts": {
    "generate-difficulty": "bun scripts/generate-difficulty.ts",
    "generate-skills": "bun scripts/generate-skills.ts",
    "generate-location": "bun scripts/generate-location.ts",
    "generate-changelog": "bun scripts/generate-changelog.ts",
    "generate-metadata": "bun run generate-difficulty && bun run generate-skills && bun run generate-location && bun run generate-changelog",
    "validate-metadata": "bun scripts/validate-metadata.ts"
  }
}
```

**Sequential Execution Pattern:**
- Use `&&` not `;` - stops on first failure
- Don't continue with partial data
- All-or-nothing approach for data consistency

**Benefits of Separate Scripts:**
- ✅ Run individually during development
- ✅ Debug one at a time
- ✅ Rerun only failed script (not all 4)
- ✅ Clear separation of concerns
- ✅ Parallel development (different devs on different scripts)
- ❌ Monolithic would mean one failure = rerun everything

**Atomic Update Function (Shared Pattern):**
```typescript
async function updateBadgeMetadata(slug: string, metadata: Metadata) {
  const dataPath = `hugo/content/merit-badges/${slug}/data.json`;
  const indexPath = `hugo/content/merit-badges/${slug}/_index.md`;
  
  // Read existing data
  const data = await Bun.file(dataPath).json();
  
  // Add metadata (non-destructive)
  data.metadata = metadata;
  
  // Write atomically
  await Bun.write(dataPath, JSON.stringify(data, null, 2));
  
  // Update frontmatter for Hugo taxonomies
  await updateFrontmatter(indexPath, {
    skills: metadata.skills,
    difficulty: [metadata.difficulty],
    location_setting: [metadata.location.setting],
    special_locations: metadata.location.special || []
  });
}
```

### Build Pipeline Integration

**Decision 4: Manual Metadata Generation (Annual Cadence)**

**GitHub Actions Workflow (Enhanced):**
```yaml
name: Deploy to Production

on:
  push:
    branches: [trunk]
  workflow_dispatch:  # Manual trigger

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # NEW: Phase 1 - Manual metadata generation only
      - name: Generate Metadata (Manual Trigger Only)
        if: github.event_name == 'workflow_dispatch'
        run: bun run generate-metadata
      
      # NEW: Validate metadata consistency
      - name: Validate Metadata
        if: github.event_name == 'workflow_dispatch'
        run: bun run validate-metadata
      
      # NEW: Commit metadata changes
      - name: Commit Metadata Updates
        if: github.event_name == 'workflow_dispatch'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add hugo/content/merit-badges/*/data.json
          git add hugo/content/merit-badges/*/_index.md
          git diff --quiet && git diff --staged --quiet || git commit -m "Update badge metadata [skip ci]"
          git push
      
      # EXISTING: Hugo build (unchanged)
      - name: Build Hugo Site
        run: cd hugo && hugo --minify
      
      # EXISTING: Deploy to Firebase (unchanged)
      - name: Deploy to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: merit-badge-university
```

**Workflow Behavior:**
- **Regular commits to trunk:** Build Hugo + Deploy (no metadata generation)
- **Manual workflow_dispatch:** Generate metadata → Validate → Commit → Build → Deploy
- **Annual cadence:** Manually trigger once per year when BSA updates requirements

**Rationale:**
- ✅ Metadata generation separated from regular deployments
- ✅ Annual updates don't slow down regular commits
- ✅ Manual trigger ensures human review before metadata changes
- ✅ Validation step catches sync issues before deployment

### Validation Strategy

**Metadata Validation Script:**
```typescript
// scripts/validate-metadata.ts
async function validateAllBadges() {
  const badges = await getAllBadges();
  let errors: string[] = [];
  
  for (const badge of badges) {
    const dataPath = `hugo/content/merit-badges/${badge.slug}/data.json`;
    const indexPath = `hugo/content/merit-badges/${badge.slug}/_index.md`;
    
    const data = await Bun.file(dataPath).json();
    const frontmatter = await readFrontmatter(indexPath);
    
    // Verify metadata exists in data.json
    if (!data.metadata) {
      errors.push(`${badge.slug}: Missing metadata in data.json`);
      continue;
    }
    
    // Verify difficulty in valid range
    if (data.metadata.difficulty < 1 || data.metadata.difficulty > 5) {
      errors.push(`${badge.slug}: Invalid difficulty ${data.metadata.difficulty}`);
    }
    
    // Verify frontmatter has taxonomy terms
    if (!frontmatter.skills || frontmatter.skills.length === 0) {
      errors.push(`${badge.slug}: Missing skills in frontmatter`);
    }
    
    // Verify data.json and frontmatter are in sync
    if (JSON.stringify(data.metadata.skills.sort()) !== 
        JSON.stringify(frontmatter.skills.sort())) {
      errors.push(`${badge.slug}: Skills desync between data.json and frontmatter`);
    }
  }
  
  if (errors.length > 0) {
    console.error('❌ Validation failed:');
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }
  
  console.log('✅ All 143 badges validated successfully');
}
```

**Validation runs:**
- Before every deployment (CI step)
- Catches desync issues before production
- Fails build if inconsistencies found

### Existing Design System Foundation

**Visual Design (Already Established):**

**Color Palette - Official BSA Scout Uniform Colors:**
- Brown scales (--brown-000 through --brown-800)
- Tan scales (--tan-000 through --tan-900) - Scout uniform tan
- Olive scales (--olive-100 through --olive-700) - Scout uniform olive
- Teal scales (--teal-300 through --teal-600) - Accent color
- Gray scales (--gray-500 through --gray-700) - Neutral text

**Progressive Enhancement:**
- HSL colors (baseline, universal support)
- oklch colors (modern browsers, perceptually uniform)
- Graceful degradation ensures consistent experience

**Typography System:**
- Geologica variable font (weight range 100-900)
- Fluid type scale using clamp() (--step--2 through --step-6)
- Base size: 1.125rem (18px) for accessibility
- Body weight: 300 (light) - validated for readability

**Spacing & Layout:**
- Fluid spacing scale (--space-3xs through --space-3xl)
- Container queries for component-aware responsive design
- Max-width: 75rem (1200px) for content
- Mobile-first with desktop enhancements

**Modern CSS Features (Already in Production):**
- Native CSS custom properties (no SCSS variables)
- Container queries for context-aware responsive components
- View transitions API for smooth page navigation
- CSS nesting (native, not SCSS)
- Modern CSS Reset (Andy Bell)

**Existing Components (Hugo Partials):**
- Navigation cards (nav-card.scss)
- Forms (forms.scss)
- Tags (tag.scss) - will be enhanced for skill pills
- Callouts (callout.scss)
- Profile cards (profile-card.scss) - basis for badge cards
- Search (\_search.scss) - full-text search already implemented
- Header/Footer
- Button system (primary, secondary variants)

### Phase 1 Component Additions

**New Components to Build:**
1. **Enhanced Badge Cards** - Add difficulty, time, location, skills display to existing cards
2. **Difficulty Rating Component** - ⭐⭐⭐ visual stars with aria-label
3. **Location Indicator Component** - 🏠/🏕️/↔️ icons with text labels
4. **Skill Tag Component** - Clickable pills linking to skill taxonomy pages
5. **Eagle-Required Indicator** - 🦅 badge with brown background
6. **Changelog Display Component** - Before/after diff view
7. **"Requirements Updated" Indicator** - 🆕 badge for 90-day window
8. **Breadcrumb Navigation** - Taxonomy hierarchy display

**New Hugo Template Pages:**
- Taxonomy landing pages (auto-generated by Hugo for each taxonomy term)
- Taxonomy browser hub page (`/badges/browse/`)
- Per-badge changelog pages (`/merit-badges/{slug}/changelog/`)
- Global changelog page (`/merit-badges/changelog/`)

### Risk Assessment & Mitigation

**Risk Level: LOW (Brownfield Advantage)**

**Low-Risk Additions:**
- ✅ Adding `metadata` object to data.json - Backward compatible with `with` blocks
- ✅ Adding frontmatter fields - Hugo ignores unknown fields gracefully
- ✅ New taxonomy configuration - Doesn't affect existing pages
- ✅ New Hugo templates - Isolated from existing templates
- ✅ New Bun scripts - Don't touch existing scraper

**Medium-Risk Items (Require Testing):**
- ⚠️ Badge card template modifications - Could break existing card display
- ⚠️ Dual storage sync (data.json + frontmatter) - Validation script mitigates
- ⚠️ Hugo build performance with 50+ new pages - Already validated as fine

**High-Risk Items:**
- 🔴 **None identified** - Brownfield additions are architecturally safe

**Mitigation Strategy:**

**1. Subset Testing (Before Full Rollout):**
```bash
# Test on 3 badges only
BADGE_SLUGS="archery,camping,first-aid" bun run generate-metadata
bun run validate-metadata
bun run build
# Manual QA on those 3 badges
# If good, proceed to all 143
```

**2. Staging Environment:**
```bash
# Firebase preview channel for testing
firebase hosting:channel:deploy phase1-test
# Test thoroughly before promoting to live
```

**3. Git Branch Strategy:**
```bash
git checkout -b phase-1-metadata
# All Phase 1 work happens here
# Merge to trunk only after full validation
```

**4. Small Commit Strategy:**
```bash
# Good: Small, focused commits
git commit -m "Add difficulty generation script"
git commit -m "Add skills generation script"
git commit -m "Configure Hugo taxonomies"
git commit -m "Enhance badge card template with metadata display"

# Bad: Giant commit (harder to debug)
git commit -m "Add all Phase 1 features"
```

### Testing Strategy (Right-Sized for Brownfield)

**Unit Tests (Metadata Scripts):**
```typescript
describe('generate-difficulty', () => {
  it('should score difficulty 1-5', () => {
    const difficulty = scoreDifficulty(mockBadgeData);
    expect(difficulty).toBeGreaterThanOrEqual(1);
    expect(difficulty).toBeLessThanOrEqual(5);
  });
  
  it('should handle missing requirements gracefully', () => {
    const difficulty = scoreDifficulty({ requirements: [] });
    expect(difficulty).toBe(3); // Default to medium
  });
});
```

**Integration Tests (Hugo Build):**
```bash
# Verify Hugo builds without errors
bun run build || exit 1

# Verify taxonomy pages exist
test -f hugo/public/skills/leadership/index.html || exit 1
test -f hugo/public/difficulty/3/index.html || exit 1

# Verify badge pages still render
test -f hugo/public/merit-badges/archery/index.html || exit 1
```

**Manual QA Checklist:**
```
Phase 1 Pre-Launch Checklist:
[ ] All 143 badges have metadata in data.json
[ ] All 143 badges have taxonomy terms in frontmatter
[ ] Validation script passes (no sync errors)
[ ] Hugo builds successfully
[ ] All taxonomy landing pages exist (~53 pages)
[ ] Badge cards display metadata correctly
[ ] Existing deep linking still works
[ ] Mobile responsive layout intact
[ ] Lighthouse scores: Performance 90+, Accessibility 100, SEO 100
[ ] Visual regression test passed on 10 sample badges
[ ] Staging environment fully tested
```

### Development Workflow (Enhanced for Phase 1)

**Existing Workflow (Unchanged):**
```bash
# Development server
bun run hugo:dev  # Hugo live reload

# Scraping requirements
bun run sync:badges  # Sync from BSA

# Building site
bun run build  # Hugo build with minification
```

**Phase 1 Addition (Annual):**
```bash
# Generate all metadata (once per year)
bun run generate-metadata

# Or run individually for development/debugging:
bun run generate-difficulty
bun run generate-skills
bun run generate-location
bun run generate-changelog

# Validate before committing
bun run validate-metadata

# Then build as usual
bun run build
```

### Architectural Continuity

**What Stays the Same:**
- ✅ Hugo static site generation (core architecture unchanged)
- ✅ Firebase Hosting deployment (same CDN delivery)
- ✅ GitHub Actions CI/CD pipeline (enhanced, not replaced)
- ✅ Existing design system (extend, don't replace)
- ✅ Existing badge pages (enhance with metadata display)
- ✅ Existing scraper (extend with changelog generation)
- ✅ Deep linking functionality (already working, no changes needed)
- ✅ Build performance (validated at milliseconds)

**What Changes (Additive Only):**
- ➕ data.json structure: Add `metadata` object
- ➕ _index.md frontmatter: Add taxonomy terms
- ➕ Build pipeline: Add optional metadata generation step
- ➕ Hugo config: Add taxonomy definitions
- ➕ Badge card templates: Display new metadata
- ➕ New taxonomy landing pages generated by Hugo

**Integration Points:**
Phase 1 integrates with existing foundation at these specific points:
1. **Metadata Generation Scripts** → Update existing data.json files (additive)
2. **Hugo Taxonomies** → Read frontmatter added by scripts
3. **Badge Card Templates** → Read metadata from data.json for display
4. **Build Pipeline** → Insert metadata generation before Hugo build step (optional)

### Proven Architectural Strengths

**What's Already Validated:**
- ✅ Hugo builds in milliseconds (143 badges + requirements)
- ✅ Sub-1-second page loads in production
- ✅ Deep linking to individual requirements works flawlessly
- ✅ SCSS component architecture scales well
- ✅ Modern CSS features (container queries, oklch, view transitions) work in target browsers
- ✅ Firebase Hosting CDN provides global performance
- ✅ GitHub Actions CI/CD deploys reliably

**What Phase 1 Will Validate:**
- Hugo taxonomy system with 53 landing pages (expected to scale well based on existing performance)
- AI metadata generation accuracy (90%+ target via manual spot-checks)
- Dual storage synchronization (data.json ↔ frontmatter consistency via validation script)
- Badge card display with rich metadata (visual hierarchy and scannability)
- Taxonomy navigation patterns (discoverability and usability)

### Implementation Order (Recommended)

**Phase 1 Implementation Sequence:**

1. **Build Metadata Generation Scripts (Week 1-2)**
   - `generate-difficulty.ts`
   - `generate-skills.ts`
   - `generate-location.ts`
   - `generate-changelog.ts`
   - `validate-metadata.ts`

2. **Test on Subset (Week 2)**
   - Run on 3 badges (archery, camping, first-aid)
   - Validate output manually
   - Refine AI prompts if needed

3. **Configure Hugo Taxonomies (Week 2)**
   - Add taxonomy definitions to hugo.toml
   - Create taxonomy landing page templates
   - Build and verify 53 new pages generate

4. **Enhance Badge Card Templates (Week 3)**
   - Add metadata display with `with` blocks
   - Ensure backward compatibility
   - Test responsive display

5. **Run on All 143 Badges (Week 3)**
   - Execute all metadata generation scripts
   - Run validation script
   - Review changes in Git diff

6. **Deploy to Staging (Week 4)**
   - Firebase preview channel deployment
   - Manual QA checklist completion
   - Lighthouse audits

7. **Production Deployment (Week 4)**
   - Merge to trunk after validation
   - Monitor analytics for issues
   - Document any lessons learned

### Technical Decision Summary

**Core Architectural Decisions Made:**

1. **Data Storage:** Extend existing data.json with `metadata` object (not separate files)
2. **Hugo Taxonomies:** Use native Hugo taxonomy system (~53 new pages)
3. **Script Architecture:** 4 separate scripts (not monolithic)
4. **Build Pipeline:** Manual metadata generation via workflow_dispatch (not on every commit)
5. **Template Strategy:** Use `with` blocks for backward compatibility (safe additions)
6. **Risk Level:** LOW - brownfield additions are architecturally safe
7. **Testing:** Subset → staging → production with validation scripts

**Key Principle:**
"Extend and enhance existing foundation rather than replace or rebuild" - The current architecture is solid, performant, and appropriate for the use case. Phase 1 builds on proven patterns.

**No Starter Template Needed:**
This is a brownfield project with a proven, working foundation. Phase 1 adds features to an existing Hugo site rather than starting from scratch.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- ✅ AI Service: Google Gemini for all metadata generation (already established in codebase)
- ✅ Taxonomy Strategy: Interest-based (not skills-based) - ~10-15 categories matching scout mental model
- ✅ Data Storage: Extend existing data.json with metadata object (backward compatible)
- ✅ Build Pipeline: Local generation → manual review → commit → auto deploy
- ✅ Error Handling: Fail fast on AI API failures (ensures complete metadata or manual intervention)

**Important Decisions (Shape Architecture):**
- ✅ Prompt Management: Inline in scripts (following existing codebase patterns)
- ✅ Validation Strategy: Minimal (trust AI, test on 3 badges first, then full rollout)
- ✅ Master Interests Storage: Hugo data file (`hugo/data/interests.yaml`) for DRY access
- ✅ SEO Meta Descriptions: AI-generated via Gemini for taxonomy landing pages
- ✅ Changelog Display: Separate dedicated pages (keep requirements page clean)
- ✅ Taxonomy Browser Hub: Card-based layout with badge counts (mobile-first visual scanning)

**Deferred Decisions (Post-MVP):**
- Phase 2: Advanced validation rules (if metadata quality issues emerge in production)
- Phase 2: Prompt versioning system (if prompts need frequent iteration)
- Future: Automated metadata regeneration triggers (currently manual, appropriate for annual cadence)

**Open Questions for Implementation (Minor Refinements):**
- Interest category names: Consider informal validation with 3-5 scouts/counselors before finalizing
- Subset testing filter: Add `BADGE_SLUGS` environment variable for 3-badge testing
- Taxonomy browser icons: Emoji (fast) or custom icons (polished)

### AI Service & Metadata Generation

**Decision: Google Gemini for All AI-Powered Metadata**

**Rationale:**
- Already established in existing codebase (Gemini Nano for badge images)
- Consistent AI provider across project
- Good for structured outputs (difficulty ratings, interest categorization)
- Proven integration pattern already working

**Application:**
- `generate-difficulty.ts` - AI analyzes requirements → difficulty score 1-5
- `generate-interests.ts` - AI categorizes badge → 1-3 interest areas from master list
- `generate-location.ts` - AI determines indoor/outdoor/flexible requirements
- `generate-changelog.ts` - AI parses BSA change document → structured changelog (future annual use)
- SEO meta descriptions - AI generates compelling descriptions for interest taxonomy landing pages

**Error Handling: Fail Fast**

```typescript
// Pattern for all generation scripts
async function generateMetadata(badges: Badge[]) {
  for (const badge of badges) {
    try {
      const metadata = await gemini.generate(prompt);
      await updateBadge(badge.slug, metadata);
    } catch (error) {
      console.error(`Failed on badge ${badge.slug}: ${error.message}`);
      process.exit(1); // STOP - don't continue with partial data
    }
  }
}
```

**Rationale:**
- Ensures all 143 badges have metadata or manual intervention required
- No partial metadata states (141 badges with data, 2 missing)
- Annual cadence makes "fix and restart" practical
- Human review catches the failure immediately during Git diff review

**Prompt Management: Inline**

```typescript
// Following existing codebase patterns
async function scoreDifficulty(badge: Badge): Promise<number> {
  const requirementsText = formatRequirements(badge.requirements);
  
  const prompt = `Analyze this merit badge and rate difficulty 1-5 based on:
- Time required
- Physical demands  
- Technical complexity
- Age-appropriateness for scouts 11-17

Badge: ${badge.title}
Requirements: ${requirementsText}

Output JSON: { "difficulty": 1-5, "reasoning": "..." }`;

  const response = await gemini.generate(prompt);
  return parseDifficulty(response);
}
```

**Rationale:**
- Follows existing script patterns in codebase
- Simple, fast to implement
- Prompt iteration happens during development phase (test on 3 badges, refine prompts, repeat)
- Annual cadence doesn't require runtime prompt flexibility

### Taxonomy Strategy: Interest-Based Discovery

**Decision: Interest-Based Taxonomy (~10-15 Categories)**

**Rationale - Scout Mental Model:**

Scouts think in concrete activities, not abstract competencies:
- ✅ "I like art" → Arts & Crafts badges
- ✅ "I like computers" → Technology badges
- ✅ "I like camping" → Nature & Outdoors badges

NOT:
- ❌ "I want to develop leadership skills" → Leadership badges (too abstract, too career-focused)

**Product Validation (from Party Mode):**
- Matches how scouts browse content (TikTok by topic, YouTube by interest, school by subject)
- Aligns with search behavior ("art merit badges" has higher volume than "leadership merit badges")
- Appropriate granularity (not too broad, not too narrow)

**Interest Categories (Proposed ~10-15):**

```yaml
# hugo/data/interests.yaml
interests:
  - slug: arts-crafts
    name: Arts & Crafts
    description: "Creative and artistic activities like painting, sculpture, and design"
    meta_description: "[AI-generated during setup]"
    icon: "🎨"
    
  - slug: technology
    name: Technology
    description: "Computers, electronics, coding, and digital skills"
    meta_description: "[AI-generated]"
    icon: "💻"
    
  - slug: nature-outdoors
    name: Nature & Outdoors
    description: "Exploring the natural world and wilderness skills"
    meta_description: "[AI-generated]"
    icon: "🌲"
    
  - slug: sports-fitness
    name: Sports & Fitness
    description: "Physical activities, athletics, and healthy living"
    meta_description: "[AI-generated]"
    icon: "⚽"
    
  - slug: science
    name: Science
    description: "Scientific exploration and experimentation"
    meta_description: "[AI-generated]"
    icon: "🔬"
    
  - slug: building-making
    name: Building & Making
    description: "Construction, engineering, and hands-on projects"
    meta_description: "[AI-generated]"
    icon: "🔨"
    
  - slug: animals-wildlife
    name: Animals & Wildlife
    description: "Working with and learning about animals"
    meta_description: "[AI-generated]"
    icon: "🦌"
    
  - slug: community-service
    name: Community & Service
    description: "Helping others and making a difference"
    meta_description: "[AI-generated]"
    icon: "🤝"
    
  - slug: business-money
    name: Business & Money
    description: "Entrepreneurship, economics, and financial skills"
    meta_description: "[AI-generated]"
    icon: "💼"
    
  - slug: performance
    name: Performance & Entertainment
    description: "Music, theater, public speaking, and performing arts"
    meta_description: "[AI-generated]"
    icon: "🎭"
```

**Note:** Interest category names should be validated informally with 3-5 scouts/counselors before finalizing list.

**SEO Benefits:**
- Better search alignment: "art merit badges" vs "leadership merit badges"
- More intuitive for parents helping scouts discover badges
- Fewer, more focused landing pages (~15 interest pages vs ~40 skills pages)

**Hugo Configuration:**

```toml
# hugo/hugo.toml
[taxonomies]
  interest = "interests"
  difficulty = "difficulty"
  location_setting = "location_setting"
  special_location = "special_locations"
```

**Badge Frontmatter Structure:**

```yaml
---
title: "Camping Merit Badge"
interests:
  - nature-outdoors
  - sports-fitness
difficulty: [3]
location_setting: ["outdoor_required"]
special_locations: ["wilderness"]
---
```

**AI Generation Logic:**
- Each badge tagged with 1-3 interests (not more, to avoid dilution)
- AI prompt: "Categorize this badge into 1-3 interest areas from the master list"
- Master list sourced from `hugo/data/interests.yaml` for consistency

**Other Taxonomies (Unchanged from Original Plan):**
- ✅ Difficulty (1-5) - Still valuable for scouts
- ✅ Location (indoor/outdoor/flexible) - Still valuable for scouts  
- ✅ Time estimates - Still valuable for scouts and counselors
- ✅ Eagle-required indicator - Still valuable

**Architectural Simplification:**
- Interest taxonomy is simpler than skills taxonomy would have been
- Fewer categories = clearer AI prompts
- Fewer taxonomy pages = less Hugo template work  
- More concrete concepts = better AI accuracy

### Data Storage & Validation

**Decision: Minimal Validation, Trust AI**

**Validation Rules (Pre-Build Check):**

```typescript
// scripts/validate-metadata.ts
async function validateBadge(badge: Badge) {
  const data = await readJSON(`hugo/content/merit-badges/${badge.slug}/data.json`);
  const frontmatter = await readFrontmatter(`hugo/content/merit-badges/${badge.slug}/_index.md`);
  
  // Minimal checks only:
  
  // 1. Metadata exists
  if (!data.metadata) {
    throw new Error(`${badge.slug}: Missing metadata in data.json`);
  }
  
  // 2. Difficulty in range
  if (data.metadata.difficulty < 1 || data.metadata.difficulty > 5) {
    throw new Error(`${badge.slug}: Invalid difficulty ${data.metadata.difficulty}`);
  }
  
  // 3. Interests array has at least 1 entry
  if (!data.metadata.interests || data.metadata.interests.length === 0) {
    throw new Error(`${badge.slug}: Missing interests`);
  }
  
  // 4. Location setting is valid enum
  const validSettings = ['indoor_required', 'outdoor_required', 'either'];
  if (!validSettings.includes(data.metadata.location.setting)) {
    throw new Error(`${badge.slug}: Invalid location setting`);
  }
  
  // 5. Frontmatter synced with data.json
  if (JSON.stringify(data.metadata.interests.sort()) !== 
      JSON.stringify(frontmatter.interests.sort())) {
    throw new Error(`${badge.slug}: Interests desync between data.json and frontmatter`);
  }
}
```

**Rationale:**
- Annual cadence with human review validates metadata quality
- Test on 3 badges first (archery, camping, first-aid) and inspect output manually
- If AI quality is good on first 3, trust it for remaining 140
- Minimal validation catches data format issues, not content quality
- Human review (Git diff + spot-checks) catches content quality issues

**Quality Assurance Process:**

1. **Subset Testing:**
   ```bash
   # Add BADGE_SLUGS filter for testing (implementation refinement)
   BADGE_SLUGS="archery,camping,first-aid" bun run generate-metadata
   ```

2. **Manual Inspection:**
   - Review generated metadata for 3 test badges
   - Verify interests categorization makes sense
   - Check difficulty ratings are reasonable
   - Validate location classifications are correct

3. **Prompt Refinement:**
   - Adjust AI prompts if quality issues found
   - Iterate on 3 test badges until satisfied

4. **Full Generation:**
   ```bash
   bun run generate-metadata  # All 143 badges
   bun run validate-metadata  # Catch format errors
   ```

5. **Spot-Check Validation:**
   - Manually inspect 10 random badges
   - Review Git diff of all changes
   - Verify no obvious errors

6. **Commit when satisfied:**
   ```bash
   git commit -m "Add Phase 1 metadata (difficulty, interests, location, time)"
   git push
   ```

### SEO & Taxonomy Landing Pages

**Decision: AI-Generated Meta Descriptions**

**Meta Description Generation:**

```typescript
// During interest taxonomy setup (one-time)
async function generateInterestMetaDescriptions() {
  const interests = await loadInterests('hugo/data/interests.yaml');
  
  for (const interest of interests) {
    const prompt = `Write a compelling meta description (150-160 characters) for a page listing all ${interest.name} merit badges for Boy Scouts ages 11-17. Focus on discovery and exploration. Make it engaging for both scouts and parents.`;
    
    const response = await gemini.generate(prompt);
    interest.meta_description = response.trim();
  }
  
  await saveInterests('hugo/data/interests.yaml', interests);
}
```

**Hugo Template Usage:**

```go
{{/* layouts/interests/list.html */}}
{{ define "head" }}
  {{ $interest := index .Site.Data.interests .Title }}
  <meta name="description" content="{{ $interest.meta_description }}">
  <meta property="og:description" content="{{ $interest.meta_description }}">
{{ end }}
```

**Rationale:**
- Consistent with other AI-generated content (difficulty, interests, location)
- More compelling than formulaic templates ("Discover all [interest] badges...")
- Small number of pages (~28 total) makes AI generation practical
- Annual cadence allows human review of generated descriptions
- Can regenerate if quality is poor

**Landing Pages Generated:**

- ~15 interest pages (`/interests/arts-crafts/`, `/interests/technology/`, etc.)
- 5 difficulty pages (`/difficulty/1/` through `/difficulty/5/`)
- 3 location pages (`/location_setting/indoor_required/`, `/location_setting/outdoor_required/`, `/location_setting/either/`)
- ~5 special location pages (`/special_locations/pool/`, `/special_locations/shooting_range/`, etc.)
- **Total: ~28 new SEO landing pages**

### Changelog Architecture

**Decision: Separate Changelog Pages (Keep Requirements Clean)**

**Page Structure:**
- Per-badge: `/merit-badges/camping/changelog/`
- Global: `/merit-badges/changelog/`
- Requirements page stays clean (no changelog information)

**Rationale (from Party Mode UX Review):**
- Scout job-to-be-done: "Show me what I need to do to earn this badge" (NOT "show me what changed")
- Counselor job-to-be-done (separate): "Did requirements change since I last taught this?"
- Separate pages = clear information architecture

**Badge Page Integration:**
- Visual indicator (🆕) on badge card when updated within 90 days
- Indicator links to per-badge changelog page
- "Last updated: [date]" displayed on badge card
- No changelog information cluttering requirements page

**Changelog Page Format:**

```markdown
# Camping Merit Badge - Changelog

## 2025 Update (January 2025)

### Requirement 9a
**Before:** Complete a 5-mile hike with your patrol.
**After:** Complete a 5-mile trek with your patrol.
**Change:** Updated terminology from "hike" to "trek" per BSA guidelines.

### Requirement 4
**Before:** [old text]
**After:** [new text]  
**Change:** [AI-generated explanation based on BSA change document]
```

**Global Changelog:**

Lists all badges with recent changes (last 90 days) with links to per-badge changelogs:

```markdown
# Merit Badge Requirements Changelog

## Recent Updates (Last 90 Days)

- **Camping** - 2 requirements updated (January 2025)
- **First Aid** - 1 requirement updated (January 2025)
- **Cooking** - 3 requirements updated (December 2024)

[View older changes →]
```

### Taxonomy Browser Hub Page

**Decision: Card-Based Layout with Badge Counts**

**Visual Design (Mobile-First):**

```
Merit Badge Browser

Find badges by what interests you:

┌─────────────────────┐  ┌─────────────────────┐
│ 🎨 Arts & Crafts    │  │ 💻 Technology       │
│ 12 badges           │  │ 8 badges            │
└─────────────────────┘  └─────────────────────┘

┌─────────────────────┐  ┌─────────────────────┐
│ 🌲 Nature & Outdoors│  │ ⚽ Sports & Fitness  │
│ 18 badges           │  │ 14 badges           │
└─────────────────────┘  └─────────────────────┘

Browse by difficulty:
┌─────────────────────┐  ┌─────────────────────┐
│ ⭐ Easy (1-2)        │  │ ⭐⭐ Moderate (3)     │
│ 28 badges           │  │ 45 badges           │
└─────────────────────┘  └─────────────────────┘

┌─────────────────────┐
│ ⭐⭐⭐ Hard (4-5)     │
│ 70 badges           │
└─────────────────────┘

Browse by location:
┌─────────────────────┐  ┌─────────────────────┐
│ 🏠 Indoor           │  │ 🏕️ Outdoor          │
│ 32 badges           │  │ 54 badges           │
└─────────────────────┘  └─────────────────────┘

┌─────────────────────┐
│ ↔️ Flexible         │
│ 57 badges           │
└─────────────────────┘
```

**Responsive Design:**
- Mobile: 2-column card grid
- Tablet: 3-column card grid
- Desktop: 4-column card grid
- Large touch targets (44x44px minimum per WCAG)

**Rationale (from Party Mode UX Review):**
- Aligns with existing badge card design system
- Mobile-first visual scanning (scouts' primary usage mode)
- Badge counts provide context for category size ("12 badges" = manageable exploration)
- Clear visual hierarchy with icons + text labels (accessible, not icon-only)
- No overwhelming "all 143 badges at once" experience

**Icon Strategy (Open Question):**
- **Option 1 (Fast):** Emoji icons (🎨💻🌲⚽🔬🔨🦌🤝💼🎭) - ship immediately
- **Option 2 (Polished):** Custom SVG icons - more design work, better brand consistency
- **Decision:** Start with emoji (Phase 1), upgrade to custom icons if desired (Phase 2)

### Build Pipeline & Deployment Workflow

**Decision: Local Generation → Manual Review → Commit → Auto Deploy**

**Phase 1 One-Time Setup (Requirements Already Current for 2026):**

```bash
# 1. Local execution of metadata generation
bun run generate-metadata

# What this does:
# - Reads existing data.json files (143 badges, requirements current for 2026)
# - AI analyzes requirements already in data.json
# - Adds metadata object to same data.json (non-destructive)
# - Updates _index.md frontmatter with taxonomy terms

# 2. Review all changes with Git
git diff

# What to look for:
# - Inspect metadata for all 143 badges
# - Spot-check 10 random badges manually
# - Verify interests categorization makes sense
# - Check difficulty ratings are reasonable
# - Validate location classifications are correct

# 3. Commit when satisfied
git commit -m "Add Phase 1 metadata (difficulty, interests, location, time)"
git push

# 4. GitHub Actions (normal flow - unchanged)
# - Hugo builds site with new taxonomy pages
# - Reads updated data.json + frontmatter
# - Generates ~28 taxonomy landing pages
# - Deploy to Firebase Hosting
```

**Future Annual Updates (When BSA Changes Requirements):**

```bash
# Year later when BSA publishes requirement changes:

# 1. Update requirements (existing script)
bun run sync:badges

# 2. Regenerate metadata for changed badges
bun run generate-metadata

# 3. Review changes
git diff

# 4. Commit and deploy
git commit -m "Update 2026 requirements and metadata"
git push
```

**GitHub Actions Workflow (No Changes Needed):**

```yaml
# Existing firebase-hosting-merge.yml works as-is
on:
  push:
    branches: [trunk]

jobs:
  deploy:
    steps:
      - checkout
      - Build Hugo site (reads updated data.json + frontmatter)
      - Deploy to Firebase Hosting
```

**Rationale:**
- Human review gate before metadata goes live (inspect Git diff)
- Annual cadence makes manual review practical and thorough
- No complex CI/CD automation needed for once-per-year updates
- Existing deployment workflow unchanged (just Hugo build + deploy)
- Local generation gives full control over output before commit
- Manual review catches AI quality issues before production

**Subset Testing Enhancement (from Party Mode):**

Add `BADGE_SLUGS` environment variable for testing on subset:

```typescript
// scripts/generate-metadata.ts
const testBadges = process.env.BADGE_SLUGS?.split(',');
const badges = testBadges 
  ? allBadges.filter(b => testBadges.includes(b.slug))
  : allBadges;

console.log(`Generating metadata for ${badges.length} badges`);
```

Usage:
```bash
# Test on 3 badges
BADGE_SLUGS="archery,camping,first-aid" bun run generate-metadata

# Full generation (all 143)
bun run generate-metadata
```

### Decision Impact Analysis

**Implementation Sequence:**

**Week 1: Foundation Setup**
1. Define 10-15 interest categories in `hugo/data/interests.yaml`
2. Generate AI meta descriptions for each interest
3. Configure Hugo taxonomies in `hugo.toml`
4. Add `BADGE_SLUGS` filter to metadata scripts

**Week 1-2: Script Development**
5. Build `generate-difficulty.ts` - Gemini analyzes requirements → difficulty 1-5
6. Build `generate-interests.ts` - Gemini categorizes → 1-3 interests from master list
7. Build `generate-location.ts` - Gemini determines indoor/outdoor/flexible
8. Build `generate-changelog.ts` - Parse BSA change document (for future annual use)
9. Build `validate-metadata.ts` - Minimal validation before Hugo build

**Week 2: Subset Testing**
10. Run on 3 test badges (archery, camping, first-aid)
11. Manual inspection of generated metadata
12. Refine AI prompts based on output quality
13. Iterate until satisfactory (test → refine → repeat)

**Week 3: Template Enhancement**
14. Enhance badge card templates with metadata display (using `with` blocks)
15. Create taxonomy landing page templates
16. Build taxonomy browser hub page (`/badges/browse/`)
17. Create changelog page templates

**Week 3-4: Full Rollout**
18. Run `generate-metadata` on all 143 badges
19. Run `validate-metadata` to catch format errors
20. Spot-check 10 random badges manually
21. Review Git diff of all changes
22. Commit metadata to repository

**Week 4: Deployment**
23. Deploy to Firebase preview channel (staging)
24. Manual QA checklist execution
25. Lighthouse audits (Performance 90+, Accessibility 100, SEO 100)
26. Mobile responsive testing
27. Production deployment (merge to trunk)
28. Monitor analytics for issues

**Cross-Component Dependencies:**

**Master Interests List (`hugo/data/interests.yaml`)** → Used by:
- `generate-interests.ts` (AI prompt input - valid interest slugs)
- Hugo taxonomy system (landing page generation)
- Taxonomy browser hub (card display with counts and icons)
- SEO meta descriptions (context for AI generation)

**data.json Metadata Object** → Used by:
- Hugo badge card templates (display difficulty, time, location, interests)
- Hugo taxonomy pages (organize badges by interests/difficulty/location)
- Validation script (ensure completeness and sync)

**Frontmatter Taxonomy Terms** → Used by:
- Hugo's native taxonomy system (generate landing pages automatically)
- Badge list pages (filter/organize badges)
- Breadcrumb navigation (show taxonomy hierarchy)

**AI Prompts** → Depend on:
- Master interests list (categorization boundaries)
- Existing requirements in data.json (analysis input)
- BSA change document (changelog generation - future)

**Risk Mitigation through Dependencies:**
- Fail-fast error handling ensures no partial metadata states
- Minimal validation catches format errors before Hugo build
- Local generation + Git review prevents bad data from reaching production
- Subset testing (3 badges) validates AI quality before full generation
- Hugo's `with` blocks ensure backward compatibility if metadata missing

**Architectural Decision Summary:**

All core architectural decisions have been made collaboratively and validated through Party Mode review. The decision set is:
- ✅ Technically sound (brownfield-safe, proven patterns)
- ✅ Product-validated (matches scout mental model)
- ✅ UX-validated (supports scout browsing behavior)
- ✅ Implementation-ready (no blockers identified)

Ready to proceed to implementation patterns that ensure AI agent consistency.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 8 areas where AI agents could make different choices during Phase 1 implementation, now resolved with explicit patterns and edge case handling.

### Naming Patterns

**Script File Naming:**
- **Pattern:** `kebab-case.ts`
- **Examples:** 
  - `generate-difficulty.ts`
  - `generate-interests.ts`
  - `generate-location.ts`
  - `generate-changelog.ts`
  - `validate-metadata.ts`
- **Rationale:** Matches existing codebase (detect-related-badges.ts, sync-requirements-hybrid.ts, generate-mbu-og-image.ts)
- **ALL AGENTS MUST:** Use kebab-case for all TypeScript script filenames

**JSON Data Field Naming:**
- **Pattern:** `snake_case`
- **Examples:**
  - `difficulty` (number)
  - `time_estimate` (object with `min_hours`, `typical_hours`, `max_hours`)
  - `interests` (array of strings)
  - `location` (object with `setting`, `special_locations`)
- **Rationale:** Matches existing data.json fields (eagle_required, req_id, pamphlet_url, subrequirement_mode)
- **ALL AGENTS MUST:** Use snake_case for all JSON field names in data.json metadata object

**Hugo Frontmatter Field Naming:**
- **Pattern:** `snake_case` for field names, explicit slugs for taxonomy terms
- **Examples:**
  ```yaml
  interests: ["arts-crafts", "technology"]        # Use slugs (explicit)
  difficulty: [3]
  location_setting: ["outdoor_required"]
  special_locations: ["wilderness"]
  ```
- **Rationale:** Hugo convention, unambiguous taxonomy term matching
- **CRITICAL:** Frontmatter uses **slugs** (arts-crafts), not display names (Arts & Crafts)
- **ALL AGENTS MUST:** Use snake_case for frontmatter fields, use explicit slugs for taxonomy terms

**Hugo Taxonomy Slug Control (Critical for Consistency):**
- **Pattern:** Explicit slugs defined in interests.yaml, frontmatter uses slugs
- **interests.yaml structure:**
  ```yaml
  interests:
    - slug: arts-crafts           # EXPLICIT slug (no Hugo slugification ambiguity)
      name: Arts & Crafts          # Display name (can contain &, spaces, etc.)
      description: "Creative and artistic activities"
      meta_description: "[AI-generated 150-160 char SEO description]"
      icon: "🎨"
  ```
- **Frontmatter uses slugs:**
  ```yaml
  interests: ["arts-crafts", "technology"]  # Use slug field, not name field
  ```
- **Rationale:** Hugo's slugification of "Arts & Crafts" could be ambiguous (arts-and-crafts vs arts-crafts). Explicit slugs eliminate this conflict.
- **ALL AGENTS MUST:** Define explicit slugs in interests.yaml, use slugs (not names) in frontmatter

**TypeScript Variable Naming:**
- **Pattern:** Full expressive names per unicorn/prevent-abbreviations rule
- **Common corrections:**
  - ✅ `difficulty` (not `diff`)
  - ✅ `error` (not `err` or `e`)
  - ✅ `response` (not `res`)
  - ✅ `request` (not `req`)
  - ✅ `index` (not `i`, `j`, `k`)
  - ✅ `badgeSlug`, `requirementText`, `timeEstimate`
- **Rationale:** Codebase uses strict ESLint unicorn rules enforcing full variable names
- **ALL AGENTS MUST:** Use full variable names with no abbreviations (see .claude/rules/typescript.md)

**Hugo Partial Naming:**
- **Pattern:** `kebab-case.html`
- **Examples:**
  - `difficulty-rating.html`
  - `location-indicator.html`
  - `interest-tag.html`
  - `eagle-indicator.html`
  - `changelog-display.html`
- **Rationale:** Matches existing partials (requirement.html, header.html, footer.html)
- **ALL AGENTS MUST:** Use kebab-case for Hugo partial filenames

**SCSS Component Naming:**
- **Pattern:** `kebab-case.scss` matching partial names
- **Examples:**
  - `difficulty-rating.scss`
  - `location-indicator.scss`
  - `interest-tag.scss`
  - `eagle-indicator.scss`
- **Rationale:** Matches existing components (nav-card.scss, profile-card.scss, callout.scss, tag.scss)
- **ALL AGENTS MUST:** Use kebab-case for SCSS component filenames

### Structure Patterns

**Script File Location:**
- **Pattern:** `scripts/{script-name}.ts` at project root
- **Examples:**
  - `scripts/generate-difficulty.ts`
  - `scripts/generate-interests.ts`
  - `scripts/generate-location.ts`
  - `scripts/generate-changelog.ts`
  - `scripts/validate-metadata.ts`
- **Rationale:** Matches existing script organization (scripts/detect-related-badges.ts, scripts/sync-requirements-hybrid.ts)
- **ALL AGENTS MUST:** Place all Phase 1 metadata scripts in `scripts/` directory

**Hugo Partial Location:**
- **Pattern:** `hugo/layouts/partials/{component-name}.html` or subdirectory for organization
- **Options:**
  - Flat: `hugo/layouts/partials/difficulty-rating.html`
  - Subdirectory: `hugo/layouts/partials/metadata/difficulty-rating.html`
- **Rationale:** Matches existing partial organization (partials/requirement.html, partials/header.html, partials/head/)
- **ALL AGENTS MUST:** Place Phase 1 component partials in `hugo/layouts/partials/` (subdirectory optional)

**SCSS Component Location:**
- **Pattern:** `hugo/assets/scss/components/{component-name}.scss`
- **Examples:**
  - `hugo/assets/scss/components/difficulty-rating.scss`
  - `hugo/assets/scss/components/location-indicator.scss`
  - `hugo/assets/scss/components/interest-tag.scss`
- **Rationale:** Matches existing components directory (scss/components/nav-card.scss, scss/components/callout.scss)
- **ALL AGENTS MUST:** Place Phase 1 component SCSS in `hugo/assets/scss/components/`

**SCSS Import Pattern (Component-Based Loading):**
- **Pattern:** Page-specific SCSS files import only needed components via `@use`
- **Implementation:**
  ```scss
  // hugo/assets/scss/pages/badge-detail.scss
  @use '../base';
  @use '../colors';
  @use '../typography';
  
  // Import only components used on badge detail pages
  @use '../components/difficulty-rating';
  @use '../components/location-indicator';
  @use '../components/interest-tag';
  @use '../components/eagle-indicator';
  ```
- **Hugo template integration:**
  ```go
  {{ define "head-styles" }}
    {{ $pageCSS := "scss/pages/badge-detail.scss" }}
    {{ $options := (dict "transpiler" "dartsass" "outputStyle" "compressed") }}
    {{ $styles := resources.Get $pageCSS | css.Sass $options }}
    <link rel="stylesheet" href="{{ $styles.RelPermalink }}">
  {{ end }}
  ```
- **Rationale:** Idiomatic Hugo + SCSS partial pattern, per-page CSS loading minimizes page weight
- **ALL AGENTS MUST:** Create page-specific SCSS files that import needed components via `@use`

**SCSS Component Style (No Imports):**
- **Pattern:** Components use CSS custom properties only, no `@use` imports
- **Example:**
  ```scss
  // hugo/assets/scss/components/difficulty-rating.scss
  .difficulty-rating {
    display: flex;
    gap: var(--space-3xs);        // CSS custom property
    color: var(--olive-500);       // CSS custom property
    font-size: var(--step--1);     // CSS custom property
  }
  ```
- **Rationale:** CSS custom properties are globally available (defined in colors.scss, spacing.scss, typography.scss loaded by page SCSS). No imports needed in components.
- **ALL AGENTS MUST:** Use `var(--custom-property)` in SCSS components, do NOT import colors/spacing/typography

**Hugo Data File Location:**
- **Pattern:** `hugo/data/{data-name}.yaml`
- **Examples:**
  - `hugo/data/interests.yaml` (master interests list with explicit slugs)
- **Rationale:** Hugo's standard data directory
- **ALL AGENTS MUST:** Place master interests taxonomy data in `hugo/data/interests.yaml`

### Format Patterns

**data.json Metadata Structure:**
- **Pattern:** Single `metadata` object with nested snake_case fields
- **Schema:**
  ```json
  {
    "metadata": {
      "difficulty": 3,
      "time_estimate": {
        "min_hours": 8,
        "typical_hours": 10,
        "max_hours": 12
      },
      "interests": ["arts-crafts", "technology"],
      "location": {
        "setting": "outdoor_required",
        "special_locations": ["wilderness"]
      }
    }
  }
  ```
- **CRITICAL:** interests array contains **slugs** (arts-crafts), not display names (Arts & Crafts)
- **ALL AGENTS MUST:** Use exactly this metadata structure, snake_case fields, slugs for interests

**Frontmatter Taxonomy Structure:**
- **Pattern:** Arrays of slug values (kebab-case)
- **Schema:**
  ```yaml
  ---
  title: "Camping Merit Badge"
  interests: ["arts-crafts", "technology"]
  difficulty: [3]
  location_setting: ["outdoor_required"]
  special_locations: ["wilderness"]
  ---
  ```
- **CRITICAL:** Use slugs (arts-crafts), not Title Case names (Arts & Crafts)
- **Rationale:** Matches explicit slugs defined in interests.yaml, unambiguous taxonomy matching
- **ALL AGENTS MUST:** Use arrays for all taxonomy terms (even single values), use explicit slugs

**Error Message Format:**
- **Pattern:** `[script-name] Context: Details`
- **Examples:**
  ```typescript
  throw new Error(`[generate-difficulty] Failed on badge ${slug}: API rate limit exceeded`);
  throw new Error(`[generate-interests] Invalid interest category returned: ${category}`);
  throw new TypeError(`[validate-metadata] Expected metadata.difficulty to be number, got ${typeof metadata.difficulty}`);
  ```
- **Rationale:** Structured format aids debugging when reviewing logs, script prefix identifies source
- **ALL AGENTS MUST:** Prefix all error messages with `[script-name]` for traceability

**TypeScript Interface Naming:**
- **Pattern:** PascalCase for interfaces, snake_case for JSON fields
- **Example:**
  ```typescript
  interface BadgeMetadata {
    difficulty: number;
    time_estimate: {
      min_hours: number;
      typical_hours: number;
      max_hours: number;
    };
    interests: string[];  // Array of interest slugs
    location: {
      setting: "outdoor_required" | "indoor_required" | "either";
      special_locations: string[];
    };
  }
  
  interface InterestDefinition {
    slug: string;
    name: string;
    description: string;
    meta_description: string;
    icon: string;
  }
  ```
- **Rationale:** TypeScript convention for interfaces, matches JSON field structure exactly
- **ALL AGENTS MUST:** Use PascalCase for interface names, match JSON field structure with snake_case

**TypeScript Import Convention:**
- **Pattern:** Use `type` keyword for type-only imports
- **Examples:**
  ```typescript
  import type { MeritBadge, BadgeData } from "./merit-badges";
  import { MERIT_BADGES, type BadgeMetadata } from "./merit-badges";
  ```
- **Rationale:** TypeScript strict mode with verbatimModuleSyntax: true requires explicit type imports
- **ALL AGENTS MUST:** Use `type` keyword for type-only imports per strict TypeScript configuration

### Hugo Template Patterns

**Partial vs Shortcode Decision:**
- **Partials:** Called from Hugo templates, for template-level components
  - Examples: `difficulty-rating.html`, `location-indicator.html`, `interest-tag.html`
  - Usage: `{{ partial "difficulty-rating.html" (dict "difficulty" 3) }}`
- **Shortcodes:** Called from markdown content, for content-author convenience
  - Reserve for future content authoring needs
- **Phase 1 Guidance:** Use partials for badge metadata display (template-level rendering)
- **ALL AGENTS MUST:** Create Phase 1 components as partials (not shortcodes)

**Partial Parameter Passing:**
- **Pattern:** Use `dict` for passing multiple parameters
- **Example:**
  ```go
  {{ partial "difficulty-rating.html" (dict "difficulty" 3 "showLabel" true) }}
  {{ partial "interest-tag.html" (dict "interest" "arts-crafts" "clickable" true) }}
  {{ partial "location-indicator.html" (dict "location" .location) }}
  ```
- **Rationale:** Hugo convention for multi-parameter partials
- **ALL AGENTS MUST:** Use `dict` when passing multiple parameters to partials

**Backward Compatibility (with blocks):**
- **Pattern:** Use `with` blocks when reading new metadata to prevent errors
- **Example:**
  ```go
  {{ $data := .Site.Data.merit_badges[.Params.slug].data }}
  
  {{/* Existing code - unchanged */}}
  {{ range $data.requirements }}
    {{ partial "requirement.html" . }}
  {{ end }}
  
  {{/* NEW - Phase 1 with backward compatibility */}}
  {{ with $data.metadata }}
    <div class="badge-metadata">
      {{ partial "difficulty-rating.html" (dict "difficulty" .difficulty) }}
      
      {{ with .time_estimate }}
        <span class="time">{{ .typical_hours }} hours typical</span>
      {{ end }}
      
      <div class="interests">
        {{ range .interests }}
          {{ partial "interest-tag.html" (dict "interest" .) }}
        {{ end }}
      </div>
      
      {{ partial "location-indicator.html" (dict "location" .location) }}
    </div>
  {{ end }}
  ```
- **Rationale:** If metadata doesn't exist, template continues working without errors. Nested `with` blocks for nested metadata objects.
- **ALL AGENTS MUST:** Use `with` blocks when accessing new metadata fields, use nested `with` for nested objects

**Accessing Hugo Data Files in Templates:**
- **Pattern:** Access interests.yaml to map slugs to display names
- **Example:**
  ```go
  {{/* Map interest slug to display name */}}
  {{ $allInterests := .Site.Data.interests.interests }}
  {{ $interestSlug := "arts-crafts" }}
  {{ $interest := index (where $allInterests "slug" $interestSlug) 0 }}
  {{ $interest.name }}  {{/* Displays "Arts & Crafts" */}}
  ```
- **Rationale:** Frontmatter stores slugs, templates need display names for user-facing content
- **ALL AGENTS MUST:** Use this pattern to map interest slugs to display names in templates

### SCSS Organization Patterns

**Component-Based Loading (Idiomatic Hugo Pattern):**
- **Pattern:** Page-specific SCSS files import only needed components
- **Implementation:**
  ```scss
  // hugo/assets/scss/pages/badge-detail.scss
  @use '../base';
  @use '../colors';
  @use '../typography';
  @use '../spacing';
  
  // Phase 1: Import only components used on badge detail pages
  @use '../components/difficulty-rating';
  @use '../components/location-indicator';
  @use '../components/interest-tag';
  @use '../components/eagle-indicator';
  ```
- **Hugo template integration:**
  ```go
  {{ define "head-styles" }}
    {{ $pageCSS := "scss/pages/badge-detail.scss" }}
    {{ $options := (dict "transpiler" "dartsass" "outputStyle" "compressed") }}
    {{ $styles := resources.Get $pageCSS | css.Sass $options }}
    <link rel="stylesheet" href="{{ $styles.RelPermalink }}">
  {{ end }}
  ```
- **Rationale:** Per-page CSS loading minimizes page weight, standard Hugo + SCSS partial pattern
- **ALL AGENTS MUST:** Create page-specific SCSS files that import needed components via `@use`

**CSS Custom Properties (No SCSS Variables):**
- **Pattern:** Use CSS custom properties in components, no `@use` imports needed
- **Example:**
  ```scss
  // hugo/assets/scss/components/difficulty-rating.scss
  .difficulty-rating {
    display: flex;
    gap: var(--space-3xs);        // From spacing.scss (loaded globally)
    color: var(--olive-500);       // From colors.scss (loaded globally)
    font-size: var(--step--1);     // From typography.scss (loaded globally)
  }
  
  // ❌ BAD - Don't import in components
  @use '../colors';
  @use '../spacing';
  ```
- **Rationale:** CSS custom properties are globally available (defined in colors.scss, spacing.scss, typography.scss loaded by page SCSS). Components don't need imports.
- **ALL AGENTS MUST:** Use `var(--custom-property)` in SCSS components, do NOT import colors/spacing/typography

### TypeScript Code Patterns

**Function Parameter Pattern:**
- **Pattern:** Single object parameter with explicit type
- **Example:**
  ```typescript
  async function generateDifficulty({
    badge,
    apiKey
  }: {
    badge: MeritBadge;
    apiKey: string;
  }): Promise<number> {
    // Implementation
  }
  ```
- **Rationale:** Matches existing codebase patterns, follows TypeScript strict mode rules
- **ALL AGENTS MUST:** Use single object parameter for all functions with multiple arguments

**Explicit Return Types:**
- **Pattern:** Declare return type on all functions
- **Example:**
  ```typescript
  async function scoreDifficulty({ badge }: { badge: MeritBadge }): Promise<number> {
    // Implementation
  }
  
  function formatInterests({ interests }: { interests: string[] }): string {
    return interests.join(', ');
  }
  ```
- **Rationale:** TypeScript strict mode with explicit function signatures
- **ALL AGENTS MUST:** Declare explicit return types on all functions

**Module Exports (One Per File):**
- **Pattern:** ONE export per file (from .claude/rules/typescript.md)
- **Examples:**
  - `generate-difficulty.ts` exports ONE function: `generateDifficulty()`
  - `validate-metadata.ts` exports ONE function: `validateMetadata()`
  - Helper functions stay private (not exported)
  - Shared types go in separate types file
- **Rationale:** Existing codebase pattern, forces clear single responsibility per file
- **ALL AGENTS MUST:** Export exactly ONE function per file, keep helpers private

**Environment Variable Validation:**
- **Pattern:** Validate required environment variables at script startup
- **Example:**
  ```typescript
  // At top of all AI generation scripts
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('[generate-difficulty] Missing GEMINI_API_KEY environment variable');
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  ```
- **Rationale:** Fail fast if configuration is missing, prevents wasted API calls
- **ALL AGENTS MUST:** Validate GEMINI_API_KEY at script startup with structured error message

**Data Validation Before Processing:**
- **Pattern:** Validate badge data integrity before generating metadata
- **Example:**
  ```typescript
  async function generateDifficulty({ badge }: { badge: MeritBadge }): Promise<number> {
    const data = await readBadgeData(badge.slug);
    
    // Validate data integrity
    if (!data.requirements || data.requirements.length === 0) {
      throw new Error(`[generate-difficulty] Badge ${badge.slug} has no requirements`);
    }
    
    // Continue with AI processing
    const difficulty = await callGeminiAPI(data.requirements);
    return difficulty;
  }
  ```
- **Rationale:** Catch data corruption early, prevent AI processing of invalid data
- **ALL AGENTS MUST:** Validate badge data has requirements before processing

### Process Patterns

**Script Execution Order (Sequential, Not Parallel):**
- **Pattern:** Sequential execution with `&&` (stop on first failure)
- **package.json:**
  ```json
  {
    "scripts": {
      "generate-difficulty": "bun scripts/generate-difficulty.ts",
      "generate-interests": "bun scripts/generate-interests.ts",
      "generate-location": "bun scripts/generate-location.ts",
      "generate-changelog": "bun scripts/generate-changelog.ts",
      "generate-metadata": "bun run generate-difficulty && bun run generate-interests && bun run generate-location && bun run generate-changelog",
      "validate-metadata": "bun scripts/validate-metadata.ts"
    }
  }
  ```
- **Rationale:** Fail-fast on first error, prevent concurrent file writes, don't continue with partial data
- **CRITICAL:** Never run metadata scripts in parallel - file corruption risk
- **ALL AGENTS MUST:** Use `&&` not `;` when chaining metadata generation scripts

**Subset Testing Pattern:**
- **Pattern:** `BADGE_SLUGS` environment variable for testing on subset
- **Implementation:**
  ```typescript
  // At top of each generation script (after imports)
  const testBadges = process.env.BADGE_SLUGS?.split(',');
  const badges = testBadges 
    ? MERIT_BADGES.filter(b => testBadges.includes(b.slug))
    : MERIT_BADGES;
  
  console.log(`[generate-difficulty] Generating metadata for ${badges.length} badges`);
  
  for (const badge of badges) {
    // Process each badge
  }
  ```
- **Usage:**
  ```bash
  # Test on 3 badges
  BADGE_SLUGS="archery,camping,first-aid" bun run generate-metadata
  
  # Full generation (all 143)
  bun run generate-metadata
  ```
- **Rationale:** Test on subset before full rollout, refine AI prompts on small set first
- **ALL AGENTS MUST:** Implement `BADGE_SLUGS` filter in all metadata generation scripts

**Atomic Update Pattern (True Atomicity):**
- **Pattern:** Prepare updates in memory, write both files together
- **Implementation:**
  ```typescript
  async function updateBadgeMetadata({
    slug,
    metadata
  }: {
    slug: string;
    metadata: BadgeMetadata;
  }): Promise<void> {
    const dataPath = `hugo/content/merit-badges/${slug}/data.json`;
    const indexPath = `hugo/content/merit-badges/${slug}/_index.md`;
    
    try {
      // Read existing files
      const data = await Bun.file(dataPath).json();
      const frontmatterContent = await Bun.file(indexPath).text();
      
      // Prepare updates in memory
      data.metadata = metadata;
      const updatedFrontmatter = updateFrontmatterData(frontmatterContent, {
        interests: metadata.interests,
        difficulty: [metadata.difficulty],
        location_setting: [metadata.location.setting],
        special_locations: metadata.location.special_locations || []
      });
      
      // Write both atomically (if either fails, neither was written)
      await Promise.all([
        Bun.write(dataPath, JSON.stringify(data, null, 2)),
        Bun.write(indexPath, updatedFrontmatter)
      ]);
    } catch (error) {
      throw new Error(`[update-badge-metadata] Failed on badge ${slug}: ${error.message}`);
    }
  }
  ```
- **Rationale:** True atomicity - prepare both updates, write together with Promise.all(). If either fails, neither was written.
- **ALL AGENTS MUST:** Use this atomic update pattern, write data.json + frontmatter together

**Error Handling Pattern (Fail Fast):**
- **Pattern:** Fail immediately on first error, no silent failures
- **Example:**
  ```typescript
  for (const badge of badges) {
    try {
      const difficulty = await generateDifficulty({ badge, apiKey });
      await updateBadgeMetadata({ slug: badge.slug, metadata: { difficulty } });
    } catch (error) {
      // Re-throw with context, don't continue
      throw new Error(`[generate-difficulty] Failed on badge ${badge.slug}: ${error.message}`);
    }
  }
  ```
- **Rationale:** Ensures all 143 badges have metadata or script stops for manual intervention. No partial states (141 with metadata, 2 missing).
- **ALL AGENTS MUST:** Fail fast on errors, never swallow exceptions or skip failed badges

### Validation Patterns

**Minimal Validation Rules:**
- **Pattern:** Check format/structure, trust AI for content quality
- **Implementation:**
  ```typescript
  // scripts/validate-metadata.ts
  async function validateBadge({ badge }: { badge: MeritBadge }): Promise<void> {
    const dataPath = `hugo/content/merit-badges/${badge.slug}/data.json`;
    const indexPath = `hugo/content/merit-badges/${badge.slug}/_index.md`;
    
    const data = await Bun.file(dataPath).json();
    const frontmatter = await readFrontmatter(indexPath);
    
    // 1. Metadata exists
    if (!data.metadata) {
      throw new Error(`[validate-metadata] Missing metadata for badge ${badge.slug}`);
    }
    
    // 2. Difficulty in range
    if (data.metadata.difficulty < 1 || data.metadata.difficulty > 5) {
      throw new Error(`[validate-metadata] Invalid difficulty ${data.metadata.difficulty} for badge ${badge.slug}`);
    }
    
    // 3. Interests array has at least 1 entry
    if (!data.metadata.interests || data.metadata.interests.length === 0) {
      throw new Error(`[validate-metadata] Missing interests for badge ${badge.slug}`);
    }
    
    // 4. Location setting is valid enum
    const validSettings = ['indoor_required', 'outdoor_required', 'either'];
    if (!validSettings.includes(data.metadata.location.setting)) {
      throw new Error(`[validate-metadata] Invalid location setting "${data.metadata.location.setting}" for badge ${badge.slug}`);
    }
    
    // 5. Frontmatter synced with data.json
    if (JSON.stringify(data.metadata.interests.sort()) !== 
        JSON.stringify(frontmatter.interests?.sort())) {
      throw new Error(`[validate-metadata] Interests desync for badge ${badge.slug}`);
    }
  }
  ```
- **Rationale:** Minimal checks catch format errors, human review catches content quality
- **ALL AGENTS MUST:** Implement exactly these validation rules, do not add additional content validation

**Hugo Data File Validation:**
- **Pattern:** Validate interests.yaml is valid YAML before processing
- **Example:**
  ```typescript
  // scripts/generate-interests.ts
  async function loadInterests(): Promise<InterestDefinition[]> {
    try {
      const yamlContent = await Bun.file('hugo/data/interests.yaml').text();
      const parsed = parseYAML(yamlContent);
      
      if (!parsed.interests || !Array.isArray(parsed.interests)) {
        throw new TypeError('[load-interests] Invalid interests.yaml structure');
      }
      
      return parsed.interests;
    } catch (error) {
      throw new Error(`[load-interests] Failed to parse interests.yaml: ${error.message}`);
    }
  }
  ```
- **Rationale:** Fail fast if Hugo data file is corrupted or invalid
- **ALL AGENTS MUST:** Validate YAML data files before using them in scripts

**Post-Build Validation (Optional Enhancement):**
- **Pattern:** Verify Hugo generated all expected taxonomy pages
- **Implementation:**
  ```typescript
  // scripts/validate-hugo-build.ts
  async function validateTaxonomyPages(): Promise<void> {
    const interests = await loadInterests();
    
    for (const interest of interests) {
      const pagePath = `hugo/public/interests/${interest.slug}/index.html`;
      if (!existsSync(pagePath)) {
        throw new Error(`[validate-hugo-build] Missing taxonomy page: ${pagePath}`);
      }
    }
    
    // Validate difficulty pages
    for (let difficulty = 1; difficulty <= 5; difficulty++) {
      const pagePath = `hugo/public/difficulty/${difficulty}/index.html`;
      if (!existsSync(pagePath)) {
        throw new Error(`[validate-hugo-build] Missing difficulty page: ${pagePath}`);
      }
    }
  }
  ```
- **Rationale:** Catches Hugo taxonomy generation failures before deployment
- **ALL AGENTS MUST:** Implement post-build validation to verify taxonomy pages exist

### Implementation Dependencies & Order

**Critical Implementation Order:**

1. **Hugo Taxonomy Configuration (FIRST)**
   ```toml
   # hugo/hugo.toml - Must exist before metadata generation
   [taxonomies]
     interest = "interests"
     difficulty = "difficulty"
     location_setting = "location_setting"
     special_location = "special_locations"
   ```
   **Rationale:** Hugo must recognize taxonomy fields before frontmatter can use them

2. **Master Interests Data File (SECOND)**
   ```yaml
   # hugo/data/interests.yaml - Define before generating metadata
   interests:
     - slug: arts-crafts
       name: Arts & Crafts
       description: "..."
       meta_description: "[AI-generated]"
       icon: "🎨"
   ```
   **Rationale:** Generation scripts need valid interest slugs for AI prompts

3. **Generate AI Meta Descriptions (THIRD)**
   - Run Gemini to generate meta_description for each interest
   - Update interests.yaml with generated descriptions
   **Rationale:** Complete interests.yaml before metadata generation

4. **Metadata Generation Scripts (FOURTH)**
   ```bash
   bun run generate-metadata
   # Runs: difficulty → interests → location → changelog (sequential)
   ```

5. **Validation (FIFTH)**
   ```bash
   bun run validate-metadata
   ```

6. **Hugo Build (SIXTH)**
   ```bash
   cd hugo && hugo --minify
   ```

7. **Post-Build Validation (SEVENTH - Optional)**
   ```bash
   bun run validate-hugo-build
   ```

**Dependency Chain:**
```
Hugo config → interests.yaml → meta descriptions → metadata generation → validation → Hugo build → post-build validation
```

**ALL AGENTS MUST:** Follow this implementation order. Hugo taxonomy config and interests.yaml must exist before running metadata generation scripts.

### Enforcement Guidelines

**All AI Agents MUST:**

1. **Follow existing codebase patterns** - Analyze existing scripts (detect-related-badges.ts, sync-requirements-hybrid.ts) before creating new ones
2. **Use snake_case for data.json fields** - Matches existing (eagle_required, req_id, pamphlet_url)
3. **Use kebab-case for file names** - Scripts, partials, SCSS components all use kebab-case
4. **Use explicit slugs for taxonomies** - Define slugs in interests.yaml, use slugs in frontmatter (not display names)
5. **Fail fast on errors** - Stop immediately on first failure, structured error format with [script-name] prefix
6. **Use with blocks for backward compatibility** - Wrap all new metadata access in Hugo templates
7. **Import only needed SCSS components per page** - No global CSS bundles
8. **SCSS components use var() only** - No @use imports in component files
9. **Structure errors with script prefix** - `[script-name] Context: Details` format
10. **Export one function per file** - Follow existing module organization pattern
11. **Test on 3 badges first** - Use `BADGE_SLUGS` filter before full rollout
12. **Validate environment variables** - Check GEMINI_API_KEY at startup
13. **Use type keyword for imports** - Type-only imports require explicit `type` keyword
14. **Never run scripts in parallel** - Sequential execution only (file corruption risk)
15. **Follow implementation order** - Hugo config → interests.yaml → meta descriptions → metadata generation

**Pattern Enforcement Mechanisms:**

- **TypeScript compiler:** Enforces type safety, strict rules, import conventions
- **ESLint:** Enforces naming (unicorn/prevent-abbreviations), patterns
- **Validation script:** Enforces metadata structure and data.json ↔ frontmatter sync
- **Hugo build:** Fails if templates reference missing data or invalid taxonomies
- **Git diff review:** Human verification before commit (annual cadence makes this practical)
- **Code review:** Verify patterns followed during PR review (if multi-developer)

**Pattern Violation Handling:**

- Document pattern violations discovered during implementation
- Update architecture document if patterns need refinement
- Discuss with team before changing established patterns
- Never silently deviate from documented patterns

**Priority Order for Pattern Decisions:**
1. Existing codebase patterns (highest priority)
2. Architecture document decisions (this document)
3. TypeScript/Hugo best practices (.claude/rules/)
4. Team discussion and agreement

### Pattern Examples

**Good Example - Complete Generation Script:**

```typescript
// scripts/generate-difficulty.ts
import { MERIT_BADGES, type MeritBadge } from "./merit-badges";
import { GoogleGenerativeAI } from "@google/genai";

// Validate environment at startup
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('[generate-difficulty] Missing GEMINI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

interface DifficultyResult {
  difficulty: number;
  reasoning: string;
}

async function generateDifficulty({
  badge
}: {
  badge: MeritBadge;
}): Promise<number> {
  // Validate badge data
  const data = await readBadgeData(badge.slug);
  if (!data.requirements || data.requirements.length === 0) {
    throw new Error(`[generate-difficulty] Badge ${badge.slug} has no requirements`);
  }
  
  const requirementsText = formatRequirements(data.requirements);
  
  const prompt = `Analyze this merit badge and rate difficulty 1-5 based on:
- Time required
- Physical demands
- Technical complexity
- Age-appropriateness for scouts 11-17

Badge: ${badge.title}
Requirements: ${requirementsText}

Output JSON: { "difficulty": 1-5, "reasoning": "..." }`;
  
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const parsed: DifficultyResult = JSON.parse(response.text());
    return parsed.difficulty;
  } catch (error) {
    throw new Error(`[generate-difficulty] Failed on badge ${badge.slug}: ${error.message}`);
  }
}

// Main execution
const testBadges = process.env.BADGE_SLUGS?.split(',');
const badges = testBadges 
  ? MERIT_BADGES.filter(b => testBadges.includes(b.slug))
  : MERIT_BADGES;

console.log(`[generate-difficulty] Processing ${badges.length} badges`);

for (const badge of badges) {
  const difficulty = await generateDifficulty({ badge });
  await updateBadgeMetadata({ slug: badge.slug, metadata: { difficulty } });
  console.log(`[generate-difficulty] ✓ ${badge.slug}: difficulty ${difficulty}`);
}

console.log(`[generate-difficulty] Complete: ${badges.length} badges processed`);
```

**Good Example - Hugo Partial Component:**

```go
{{/* hugo/layouts/partials/difficulty-rating.html */}}
{{/* Accepts: dict with "difficulty" (number 1-5) and optional "showLabel" (boolean) */}}
{{ $difficulty := .difficulty }}
{{ $showLabel := .showLabel | default false }}

<div class="difficulty-rating" aria-label="Difficulty: {{ $difficulty }} out of 5">
  {{ if $showLabel }}
    <span class="difficulty-label">Difficulty:</span>
  {{ end }}
  
  <div class="stars">
    {{ range seq $difficulty }}
      <span class="star filled" aria-hidden="true">⭐</span>
    {{ end }}
    {{ range seq (sub 5 $difficulty) }}
      <span class="star empty" aria-hidden="true">☆</span>
    {{ end }}
  </div>
</div>
```

**Good Example - SCSS Component:**

```scss
// hugo/assets/scss/components/difficulty-rating.scss
.difficulty-rating {
  display: flex;
  gap: var(--space-3xs);
  align-items: center;
  
  .difficulty-label {
    font-size: var(--step--1);
    color: var(--gray-600);
    font-weight: 600;
  }
  
  .stars {
    display: flex;
    gap: var(--space-3xs);
  }
  
  .star {
    color: var(--olive-500);
    font-size: var(--step--1);
    
    &.empty {
      opacity: 0.3;
    }
  }
}
```

**Good Example - Page-Specific SCSS:**

```scss
// hugo/assets/scss/pages/badge-detail.scss
@use '../base';
@use '../colors';
@use '../typography';
@use '../spacing';

// Import only components used on badge detail pages
@use '../components/difficulty-rating';
@use '../components/location-indicator';
@use '../components/interest-tag';
@use '../components/eagle-indicator';

// Page-specific styles
.badge-page {
  .badge-metadata {
    display: flex;
    gap: var(--space-m);
    margin-block: var(--space-l);
  }
}
```

**Good Example - Badge Template Enhancement:**

```go
{{/* hugo/layouts/merit-badges/single.html */}}
{{ define "main" }}
  {{ $badgeSlug := .Params.slug }}
  {{ $data := index .Site.Data.merit_badges $badgeSlug }}
  
  <article class="badge-page">
    <h1>{{ .Title }}</h1>
    
    {{/* Phase 1: Add metadata display with backward compatibility */}}
    {{ with $data.data.metadata }}
      <div class="badge-metadata">
        {{ partial "difficulty-rating.html" (dict "difficulty" .difficulty "showLabel" true) }}
        
        {{ with .time_estimate }}
          <span class="time-estimate">
            Typical: {{ .typical_hours }} hours
          </span>
        {{ end }}
        
        <div class="interests">
          {{ range .interests }}
            {{ partial "interest-tag.html" (dict "interest" . "clickable" true) }}
          {{ end }}
        </div>
        
        {{ partial "location-indicator.html" (dict "location" .location) }}
      </div>
    {{ end }}
    
    {{/* Existing requirements display - unchanged */}}
    <ol class="requirements">
      {{ range $data.data.requirements }}
        {{ partial "requirement.html" . }}
      {{ end }}
    </ol>
  </article>
{{ end }}
```

### Anti-Patterns to Avoid

**❌ Breaking Existing Data Structure:**
```json
// BAD - Modifying existing fields
{
  "title": "Archery",
  "difficulty": 3,              // Don't add at root level
  "eagle_required": false,
  "requirements": [...]
}

// GOOD - Adding to metadata object (additive)
{
  "title": "Archery",
  "eagle_required": false,
  "requirements": [...],
  "metadata": {
    "difficulty": 3,
    "time_estimate": {...},
    "interests": [...],
    "location": {...}
  }
}
```

**❌ Using Display Names in Frontmatter:**
```yaml
# BAD - Using display names (ambiguous slugification)
interests: ["Arts & Crafts", "Technology"]

# GOOD - Using explicit slugs
interests: ["arts-crafts", "technology"]
```

**❌ Missing Backward Compatibility:**
```go
{{/* BAD - Direct access without with block */}}
<div>Difficulty: {{ $data.metadata.difficulty }}</div>

{{/* GOOD - Safe with block */}}
{{ with $data.metadata }}
  <div>Difficulty: {{ .difficulty }}</div>
{{ end }}
```

**❌ Global SCSS Loading:**
```scss
// BAD - One giant global.scss loading everything
@use 'components/nav-card';
@use 'components/profile-card';
@use 'components/forms';
@use 'components/callout';
@use 'components/difficulty-rating';
@use 'components/location-indicator';
// Loads on every page (unnecessary weight)

// GOOD - Page-specific imports
// pages/badge-detail.scss
@use '../components/difficulty-rating';
@use '../components/interest-tag';
@use '../components/location-indicator';
// Only what this page needs
```

**❌ SCSS Component with Imports:**
```scss
// BAD - Unnecessary imports in component
@use '../colors';
@use '../spacing';

.difficulty-rating {
  color: var(--olive-500);
}

// GOOD - Use CSS custom properties only
.difficulty-rating {
  color: var(--olive-500);
  gap: var(--space-xs);
}
```

**❌ Silent Failures:**
```typescript
// BAD - Swallow errors, continue with partial data
try {
  await generateDifficulty({ badge });
} catch (error) {
  console.log('Skipping badge...');
  continue;  // Creates partial metadata state (141 badges, 2 missing)
}

// GOOD - Fail fast, stop immediately
try {
  await generateDifficulty({ badge });
} catch (error) {
  throw new Error(`[generate-difficulty] Failed on badge ${badge.slug}: ${error.message}`);
}
```

**❌ Non-Atomic Updates:**
```typescript
// BAD - Update data.json first, then frontmatter (not atomic)
await updateDataJson(dataPath, metadata);
await updateFrontmatter(indexPath, metadata);  // If this fails, data.json already updated

// GOOD - Prepare both, write together
await Promise.all([
  Bun.write(dataPath, updatedData),
  Bun.write(indexPath, updatedFrontmatter)
]);
```

**❌ Parallel Script Execution:**
```bash
# BAD - Parallel execution (file corruption risk)
bun run generate-difficulty & bun run generate-interests &

# GOOD - Sequential with fail-fast
bun run generate-difficulty && bun run generate-interests
```

### Pattern Completeness Assessment

**Comprehensive Coverage:**
- ✅ All naming contexts (JSON, files, taxonomies, variables, interfaces)
- ✅ All file structures (scripts, partials, SCSS, data files)
- ✅ All data formats (explicit schemas with examples)
- ✅ All error handling (fail-fast, structured messages, validation)
- ✅ Edge cases (concurrent execution, missing data, invalid YAML, Hugo failures)
- ✅ Implementation dependencies (Hugo config first, sequential order)
- ✅ SCSS patterns (component loading, no imports, CSS custom properties)
- ✅ Hugo patterns (partials vs shortcodes, dict parameters, with blocks)
- ✅ TypeScript patterns (one export, type imports, no abbreviations)

**No AI Agent Conflicts Expected:**
These patterns provide unambiguous guidance for every decision point in Phase 1 implementation. Agents following these patterns will produce consistent, compatible code.

## Project Structure & Boundaries

### Complete Project Directory Structure

```
mbu/ (project root)
├── README.md
├── package.json                              # [MODIFIED] Add Phase 1 script commands
├── tsconfig.json                              # TypeScript strict mode config (existing)
├── .prettierrc                                # Code formatting rules (existing)
├── .gitignore                                 # Existing
├── .github/
│   └── workflows/
│       ├── firebase-hosting-merge.yml         # Production deploy (existing)
│       ├── firebase-hosting-pull-request.yml  # Preview deploys (existing)
│       └── docker-image.yml                   # Docker build (existing)
│
├── scripts/                                   # Build-time processing scripts
│   ├── merit-badges.ts                        # Master badge list + MeritBadge interface (existing)
│   ├── sync-requirements-hybrid.ts            # Requirements scraper (existing)
│   ├── detect-related-badges.ts               # Related badge linking (existing)
│   │
│   ├── types.ts                               # [NEW] Shared Phase 1 types (BadgeMetadata, InterestDefinition)
│   │
│   ├── utils/                                 # [NEW] Shared utilities (one export per file)
│   │   ├── read-badge-data.ts                 # Read data.json utility
│   │   ├── update-frontmatter.ts              # YAML frontmatter manipulation
│   │   └── format-requirements.ts             # Format requirements for AI prompts
│   │
│   ├── generate-meta-descriptions.ts          # [NEW] Populate interests.yaml meta descriptions (one-time setup)
│   ├── generate-difficulty.ts                 # [NEW] AI difficulty scoring (1-5 scale)
│   ├── generate-interests.ts                  # [NEW] AI interest categorization (1-3 per badge)
│   ├── generate-location.ts                   # [NEW] AI location classification
│   ├── generate-changelog.ts                  # [NEW] Parse BSA changes, generate changelog pages
│   ├── validate-metadata.ts                   # [NEW] Metadata validation (integration test)
│   └── validate-hugo-build.ts                 # [NEW] Post-build taxonomy validation (post-build test)
│
├── hugo/                                      # Hugo static site
│   ├── hugo.toml                              # [MODIFIED] Add taxonomy configuration
│   │
│   ├── data/
│   │   └── interests.yaml                     # [NEW] Master interests with explicit slugs, descriptions, AI-generated meta descriptions
│   │
│   ├── content/
│   │   ├── changelog/
│   │   │   └── _index.md                      # [NEW] Global changelog page content
│   │   │
│   │   └── merit-badges/
│   │       ├── archery/
│   │       │   ├── _index.md                  # [MODIFIED] Add interests, difficulty, location_setting frontmatter
│   │       │   ├── data.json                  # [MODIFIED] Add metadata object
│   │       │   ├── requirements/
│   │       │   │   └── index.md               # Requirements page (existing)
│   │       │   └── changelog/
│   │       │       └── index.md               # [NEW] Per-badge changelog (generated source, committed)
│   │       ├── camping/
│   │       │   └── [same structure]
│   │       └── [... 141 more badges]
│   │
│   ├── layouts/
│   │   ├── _default/
│   │   │   └── baseof.html                    # Base template (existing)
│   │   ├── index.html                         # Homepage (existing)
│   │   │
│   │   ├── merit-badges/
│   │   │   ├── list.html                      # [MODIFIED] Badge listing with metadata display
│   │   │   ├── single.html                    # [MODIFIED] Badge detail with metadata display
│   │   │   └── changelog.html                 # [NEW] Per-badge changelog template
│   │   │
│   │   ├── changelog/
│   │   │   └── list.html                      # [NEW] Global changelog template
│   │   │
│   │   ├── interests/
│   │   │   └── list.html                      # [NEW] Interest taxonomy landing pages
│   │   │
│   │   ├── difficulty/
│   │   │   └── list.html                      # [NEW] Difficulty taxonomy landing pages
│   │   │
│   │   ├── location_setting/
│   │   │   └── list.html                      # [NEW] Location taxonomy landing pages
│   │   │
│   │   ├── special_locations/
│   │   │   └── list.html                      # [NEW] Special location landing pages
│   │   │
│   │   ├── badges/
│   │   │   └── browse.html                    # [NEW] Taxonomy browser hub page
│   │   │
│   │   └── partials/
│   │       ├── requirement.html               # Requirement display (existing)
│   │       ├── header.html                    # Site header (existing)
│   │       ├── footer.html                    # Site footer (existing)
│   │       ├── difficulty-rating.html         # [NEW] ⭐⭐⭐ display component
│   │       ├── location-indicator.html        # [NEW] 🏠/🏕️/↔️ display component
│   │       ├── interest-tag.html              # [NEW] Interest pill/tag component (clickable)
│   │       ├── eagle-indicator.html           # [NEW] 🦅 eagle badge component
│   │       ├── changelog-display.html         # [NEW] Before/after diff component
│   │       ├── requirements-updated-indicator.html  # [NEW] 🆕 badge component
│   │       └── head/                          # Head partials (existing)
│   │
│   ├── assets/
│   │   └── scss/
│   │       ├── base.scss                      # CSS reset (existing)
│   │       ├── colors.scss                    # Color system with CSS custom properties (existing)
│   │       ├── typography.scss                # Typography system (existing)
│   │       ├── spacing.scss                   # Spacing system (existing)
│   │       ├── styles.scss                    # Main entry (existing)
│   │       │
│   │       ├── components/
│   │       │   ├── nav-card.scss              # Navigation cards (existing)
│   │       │   ├── profile-card.scss          # Badge cards base (existing)
│   │       │   ├── tag.scss                   # Tag component (existing)
│   │       │   ├── callout.scss               # Callout component (existing)
│   │       │   ├── forms.scss                 # Forms (existing)
│   │       │   ├── difficulty-rating.scss     # [NEW] Difficulty stars styling
│   │       │   ├── location-indicator.scss    # [NEW] Location icon styling
│   │       │   ├── interest-tag.scss          # [NEW] Interest pill styling
│   │       │   ├── eagle-indicator.scss       # [NEW] Eagle badge styling
│   │       │   ├── changelog-display.scss     # [NEW] Changelog diff styling
│   │       │   └── requirements-updated-indicator.scss  # [NEW] 🆕 badge styling
│   │       │
│   │       └── pages/
│   │           ├── badge-detail.scss          # [NEW] Badge page imports Phase 1 components
│   │           ├── taxonomy-page.scss         # [NEW] Taxonomy landing page styles
│   │           └── browse-page.scss           # [NEW] Taxonomy browser hub styles
│   │
│   ├── static/
│   │   └── assets/
│   │       └── fonts/                         # Web fonts (existing)
│   │
│   └── public/                                # Build output (git-ignored)
│       ├── merit-badges/
│       │   ├── archery/
│       │   │   ├── index.html
│       │   │   ├── requirements/index.html
│       │   │   └── changelog/index.html       # [NEW] Generated from source
│       │   └── [... 142 more]
│       ├── changelog/index.html               # [NEW] Global changelog
│       ├── badges/browse/index.html           # [NEW] Taxonomy browser hub
│       ├── interests/                         # [NEW] ~15 interest pages
│       │   ├── arts-crafts/index.html
│       │   ├── technology/index.html
│       │   └── [... ~13 more]
│       ├── difficulty/                        # [NEW] 5 difficulty pages
│       │   ├── 1/index.html
│       │   └── [... 4 more]
│       ├── location_setting/                  # [NEW] 3 location pages
│       │   ├── indoor_required/index.html
│       │   ├── outdoor_required/index.html
│       │   └── either/index.html
│       └── special_locations/                 # [NEW] ~5 special location pages
│           ├── pool/index.html
│           ├── shooting_range/index.html
│           └── [... 3 more]
│
├── _bmad/                                     # BMAD workflows (existing)
│   └── [BMAD configuration]
│
├── _bmad-output/                              # Planning artifacts (existing)
│   └── planning-artifacts/
│       ├── prd.md
│       ├── ux-design-specification.md
│       └── architecture.md                    # This document
│
└── firebase.json                              # Firebase Hosting config (existing)
```

### Architectural Boundaries

**Build-Time Architecture (Zero Runtime Boundaries):**

All integration happens at build time via file I/O. No runtime API boundaries, no database boundaries, no service-to-service communication.

**1. Metadata Generation → Data Storage**
- **Input:** Scripts read existing `hugo/content/merit-badges/{slug}/data.json`
- **Processing:** Gemini API calls analyze requirements → generate metadata
- **Output:** Scripts write updated data.json (add metadata object) + updated _index.md (add taxonomy frontmatter)
- **Boundary:** File system I/O with atomic write pattern (Promise.all for both files)
- **Communication:** Scripts don't communicate with each other, run sequentially via package.json

**2. Hugo Data Files → Template Rendering**
- **Input:** Hugo templates read `hugo/data/interests.yaml` for interest definitions
- **Processing:** Hugo maps interest slugs (arts-crafts) to display names (Arts & Crafts) during template rendering
- **Output:** HTML pages with interest names displayed
- **Boundary:** Hugo's data file system (read-only template access via .Site.Data)

**3. Frontmatter → Hugo Taxonomy System**
- **Input:** Hugo reads frontmatter taxonomy terms (interests: ["arts-crafts"], difficulty: [3])
- **Processing:** Hugo's native taxonomy engine generates landing pages automatically
- **Output:** ~28 taxonomy landing pages in public/ directory
- **Boundary:** Hugo's taxonomy system (automatic, zero custom integration code)

**4. data.json → Template Rendering**
- **Input:** Hugo templates read data.json metadata object via .Site.Data
- **Processing:** Partials render difficulty stars, time estimates, interest tags, location indicators
- **Output:** Badge pages with metadata displayed
- **Boundary:** Hugo data file access pattern

**No Runtime Boundaries:**
- ❌ No API calls (static site, all pages pre-rendered)
- ❌ No database queries (static site, all data in JSON/YAML files)
- ❌ No server-side rendering (static site, CDN serves pre-built HTML)
- ❌ No authentication flows (static site, no user accounts)
- ❌ No WebSocket connections (static site, no real-time features)

**All integration happens at build time via file I/O and Hugo's template system.**

### Requirements to Structure Mapping

**Feature 1: AI Difficulty Scoring (FR25, NFR1-6)**
- **Script:** `scripts/generate-difficulty.ts`
- **Shared types:** `scripts/types.ts` (BadgeMetadata interface)
- **Shared utils:** `scripts/utils/read-badge-data.ts`, `scripts/utils/update-frontmatter.ts`
- **Updates:** 
  - `hugo/content/merit-badges/{slug}/data.json` (add metadata.difficulty, metadata.time_estimate)
  - `hugo/content/merit-badges/{slug}/_index.md` (add difficulty: [N] frontmatter)
- **Component:** `hugo/layouts/partials/difficulty-rating.html`
- **Styles:** `hugo/assets/scss/components/difficulty-rating.scss`
- **Hugo generates:** `hugo/public/difficulty/{1-5}/index.html` (5 taxonomy pages)

**Feature 2: AI Interest Categorization (FR27, FR34-35)**
- **Master data:** `hugo/data/interests.yaml` (~10-15 interest definitions with explicit slugs)
- **Setup script:** `scripts/generate-meta-descriptions.ts` (populate meta_description fields one-time)
- **Generation script:** `scripts/generate-interests.ts`
- **Shared types:** `scripts/types.ts` (InterestDefinition interface)
- **Shared utils:** `scripts/utils/read-badge-data.ts`, `scripts/utils/format-requirements.ts`
- **Updates:** 
  - `hugo/content/merit-badges/{slug}/data.json` (add metadata.interests with slugs)
  - `hugo/content/merit-badges/{slug}/_index.md` (add interests: [...] frontmatter with slugs)
- **Component:** `hugo/layouts/partials/interest-tag.html`
- **Styles:** `hugo/assets/scss/components/interest-tag.scss`
- **Template:** `hugo/layouts/interests/list.html` (interest taxonomy landing pages)
- **Hugo generates:** `hugo/public/interests/{slug}/index.html` (~15 taxonomy pages)

**Feature 3: AI Location Classification (FR28-29, FR36-37)**
- **Script:** `scripts/generate-location.ts`
- **Shared types:** `scripts/types.ts` (LocationMetadata interface)
- **Shared utils:** `scripts/utils/read-badge-data.ts`
- **Updates:** 
  - `hugo/content/merit-badges/{slug}/data.json` (add metadata.location)
  - `hugo/content/merit-badges/{slug}/_index.md` (add location_setting, special_locations frontmatter)
- **Component:** `hugo/layouts/partials/location-indicator.html`
- **Styles:** `hugo/assets/scss/components/location-indicator.scss`
- **Templates:** 
  - `hugo/layouts/location_setting/list.html` (location taxonomy landing pages)
  - `hugo/layouts/special_locations/list.html` (special location taxonomy landing pages)
- **Hugo generates:** 
  - `hugo/public/location_setting/{setting}/index.html` (3 pages: indoor_required, outdoor_required, either)
  - `hugo/public/special_locations/{location}/index.html` (~5 pages: pool, shooting_range, wilderness, farm, water_body)

**Feature 4: Time Estimates (FR26)**
- **Script:** Integrated into `scripts/generate-difficulty.ts` (same Gemini API call)
- **Updates:** `hugo/content/merit-badges/{slug}/data.json` (add metadata.time_estimate with min_hours, typical_hours, max_hours)
- **Display:** Inline in badge templates (no separate component needed)
- **Styles:** Inline in badge-detail.scss or taxonomy-page.scss

**Feature 5: Changelog Automation (FR31-33, FR20-24)**
- **Script:** `scripts/generate-changelog.ts` (parses BSA published change document)
- **Creates:** `hugo/content/merit-badges/{slug}/changelog/index.md` files (generated source, committed to git)
- **Global content:** `hugo/content/changelog/_index.md` (custom section for global changelog)
- **Components:** 
  - `hugo/layouts/partials/changelog-display.html` (before/after diff display)
  - `hugo/layouts/partials/requirements-updated-indicator.html` (🆕 badge for recent changes)
- **Templates:** 
  - `hugo/layouts/merit-badges/changelog.html` (per-badge changelog rendering)
  - `hugo/layouts/changelog/list.html` (global changelog rendering)
- **Styles:** 
  - `hugo/assets/scss/components/changelog-display.scss`
  - `hugo/assets/scss/components/requirements-updated-indicator.scss`
- **Hugo generates:** 
  - `hugo/public/merit-badges/{slug}/changelog/index.html` (per-badge, 143 pages)
  - `hugo/public/changelog/index.html` (global changelog, 1 page)

**Feature 6: Taxonomy Browser Hub (FR39, FR5)**
- **Content:** Manual creation or generated landing page
- **Template:** `hugo/layouts/badges/browse.html`
- **Styles:** `hugo/assets/scss/pages/browse-page.scss`
- **Reads:** `hugo/data/interests.yaml` for interest cards with badge counts
- **Hugo generates:** `hugo/public/badges/browse/index.html`

**Feature 7: SEO Metadata (FR40-46, NFR20-22)**
- **Meta descriptions:** Stored in `hugo/data/interests.yaml` (AI-generated via generate-meta-descriptions.ts)
- **Schema.org:** Enhance `hugo/layouts/partials/json-ld/` (existing structure)
- **OpenGraph:** Enhanced in baseof.html head block (existing)
- **Sitemap:** Auto-generated by Hugo at `/sitemap.xml`

**Feature 8: Enhanced Badge Cards (FR18-19, FR11-17)**
- **Templates:** 
  - Modify `hugo/layouts/merit-badges/list.html` (badge listing with metadata)
  - Modify `hugo/layouts/merit-badges/single.html` (badge detail with metadata)
- **Uses partials:** difficulty-rating, location-indicator, interest-tag, eagle-indicator, requirements-updated-indicator
- **Styles:** `hugo/assets/scss/pages/badge-detail.scss` imports all Phase 1 component styles

**Feature 9: Eagle-Required Indicator (Implied from UX)**
- **Data:** Already exists in data.json (eagle_required: boolean)
- **Component:** `hugo/layouts/partials/eagle-indicator.html` (🦅 badge)
- **Styles:** `hugo/assets/scss/components/eagle-indicator.scss`
- **Conditional:** Only displayed when eagle_required === true

**Feature 10: Accessibility (FR52-60, NFR7-12)**
- **Location:** All Hugo partials (semantic HTML, ARIA labels)
- **Components:** 
  - difficulty-rating: aria-label for screen readers
  - location-indicator: icon + text (not icon-only)
  - interest-tag: keyboard navigable links
- **Validation:** Lighthouse accessibility audits (target: 100 score)

### Integration Points

**Internal Communication (Build-Time File I/O):**

**1. Script → File System (Write Boundaries):**
```
generate-difficulty.ts
  → reads: hugo/content/merit-badges/archery/data.json
  → calls: Gemini API (analyze requirements)
  → writes: hugo/content/merit-badges/archery/data.json (adds metadata.difficulty, metadata.time_estimate)
  → writes: hugo/content/merit-badges/archery/_index.md (adds difficulty: [3] frontmatter)
  → pattern: Atomic via Promise.all([write data.json, write frontmatter])

generate-interests.ts
  → reads: hugo/data/interests.yaml (valid interest slugs)
  → reads: hugo/content/merit-badges/archery/data.json (requirements + title)
  → calls: Gemini API (categorize into interests)
  → writes: hugo/content/merit-badges/archery/data.json (adds metadata.interests with slugs)
  → writes: hugo/content/merit-badges/archery/_index.md (adds interests: ["arts-crafts"] frontmatter)

generate-location.ts
  → reads: hugo/content/merit-badges/archery/data.json (requirements)
  → calls: Gemini API (determine indoor/outdoor/flexible)
  → writes: hugo/content/merit-badges/archery/data.json (adds metadata.location)
  → writes: hugo/content/merit-badges/archery/_index.md (adds location_setting, special_locations frontmatter)

generate-changelog.ts
  → reads: BSA change document (external source)
  → calls: Gemini API (parse changes, generate descriptions)
  → creates: hugo/content/merit-badges/{slug}/changelog/index.md (generated source, committed)
```

**2. Hugo Data Files → Hugo Templates (Read Boundaries):**
```
hugo/data/interests.yaml
  → read by: hugo/layouts/interests/list.html (render interest taxonomy pages)
  → read by: hugo/layouts/badges/browse.html (render taxonomy browser cards)
  → read by: hugo/layouts/partials/interest-tag.html (map slug → display name)
  → access pattern: .Site.Data.interests.interests (Hugo template syntax)
```

**3. Frontmatter → Hugo Taxonomy Engine (Automatic Processing):**
```
_index.md frontmatter
  interests: ["arts-crafts", "technology"]
  difficulty: [3]
  location_setting: ["outdoor_required"]
  
  → processed by: Hugo taxonomy system (automatic, no custom code)
  → generates: 
    - hugo/public/interests/arts-crafts/index.html (lists all badges with this interest)
    - hugo/public/interests/technology/index.html
    - hugo/public/difficulty/3/index.html (lists all difficulty-3 badges)
    - hugo/public/location_setting/outdoor_required/index.html
```

**4. data.json → Hugo Templates (Read Boundaries):**
```
data.json metadata object
  → read by: hugo/layouts/merit-badges/single.html (badge detail page)
  → read by: hugo/layouts/merit-badges/list.html (badge listing page)
  → passed to partials via dict:
    - {{ partial "difficulty-rating.html" (dict "difficulty" .metadata.difficulty) }}
    - {{ partial "location-indicator.html" (dict "location" .metadata.location) }}
  → access pattern: .Site.Data.merit_badges[.Params.slug].data.metadata
```

**External Integrations:**

**1. Google Gemini API (Build-Time Only):**
- **Used by:** generate-difficulty.ts, generate-interests.ts, generate-location.ts, generate-changelog.ts, generate-meta-descriptions.ts
- **API calls per run:** ~143 badges × 3 scripts + 15 interests = ~444 API calls
- **Rate limiting:** Handled by fail-fast pattern (stops on first API failure)
- **Authentication:** `GEMINI_API_KEY` environment variable (validated at script startup)
- **Model:** gemini-pro (configurable per script if needed)

**2. Firebase Hosting (Deployment):**
- **Source:** `hugo/public/` directory (Hugo build output)
- **Destination:** CDN at merit-badge.university
- **Trigger:** GitHub Actions on push to trunk branch
- **Configuration:** `firebase.json` (existing)

**3. GitHub Actions CI/CD:**
- **Workflow files:** `.github/workflows/firebase-hosting-merge.yml` (production), `firebase-hosting-pull-request.yml` (preview)
- **Build process:** Hugo build (reads data.json + frontmatter + interests.yaml) → Deploy to Firebase
- **No metadata generation in CI** - happens locally with manual review

**4. Google Search Console (Passive Analytics):**
- **Integration:** Sitemap submission (manual, one-time)
- **Sitemap:** Auto-generated by Hugo at `/sitemap.xml`
- **Structured data:** Schema.org JSON-LD in page <head>
- **No build-time integration needed**

**5. Pirsch Analytics (Runtime JavaScript):**
- **Integration:** JavaScript snippet in baseof.html (existing)
- **No build-time integration**
- **Tracking:** Page views, referrals, engagement (configured at runtime)

### Data Flow (Complete Phase 1 Build-Time Architecture)

**Phase 1 One-Time Setup Flow:**

```
Step 1: Initial Setup
  → Manually create hugo/data/interests.yaml
    - Define ~10-15 interests with slug, name, description, icon
    - Leave meta_description empty initially
  
Step 2: Generate Meta Descriptions
  → bun run generate-meta-descriptions
    - Reads interests.yaml
    - Calls Gemini API for each interest (generate 150-160 char meta description)
    - Writes back to interests.yaml (populate meta_description fields)
  
Step 3: Configure Hugo Taxonomies
  → Manually add to hugo/hugo.toml:
    [taxonomies]
      interest = "interests"
      difficulty = "difficulty"
      location_setting = "location_setting"
      special_location = "special_locations"
  
Step 4: Create Shared Code
  → Create scripts/types.ts (shared interfaces)
  → Create scripts/utils/ (shared utility functions)
  
Step 5: Test Metadata Generation on Subset
  → BADGE_SLUGS="archery,camping,first-aid" bun run generate-metadata
    
    Runs sequentially (&&):
    → generate-difficulty.ts
      - Reads data.json (existing requirements)
      - Calls Gemini API (analyze requirements → difficulty 1-5 + time estimate)
      - Writes data.json (add metadata.difficulty, metadata.time_estimate)
      - Writes _index.md (add difficulty: [N] frontmatter)
    
    → generate-interests.ts
      - Reads interests.yaml (valid interest slugs)
      - Reads data.json (requirements + title + existing metadata)
      - Calls Gemini API (categorize → 1-3 interests)
      - Writes data.json (add metadata.interests with slugs)
      - Writes _index.md (add interests: [...] frontmatter)
    
    → generate-location.ts
      - Reads data.json (requirements + existing metadata)
      - Calls Gemini API (classify → indoor/outdoor/flexible + special locations)
      - Writes data.json (add metadata.location)
      - Writes _index.md (add location_setting, special_locations frontmatter)
    
    → generate-changelog.ts
      - Reads BSA change document
      - Calls Gemini API (parse changes → structured changelog)
      - Creates hugo/content/merit-badges/{slug}/changelog/index.md (if badge changed)
  
  → Manual review of 3 badges
  → Refine AI prompts if needed
  → Iterate until quality satisfactory

Step 6: Full Metadata Generation
  → bun run generate-metadata (all 143 badges)
  
Step 7: Validation
  → bun run validate-metadata
    - Checks all 143 badges have complete metadata
    - Validates difficulty in range 1-5
    - Validates interests array not empty
    - Validates location.setting is valid enum
    - Validates data.json ↔ frontmatter sync
    - Fails if any issues (structured error messages)
  
Step 8: Manual Review
  → git diff
    - Review all 287 file changes (143 × data.json + 143 × _index.md + 1 × hugo.toml)
    - Spot-check 10 random badges manually
    - Verify AI quality acceptable
  
Step 9: Commit Changes
  → git commit -m "Add Phase 1 metadata (difficulty, interests, location, time)"
  → git push

Step 10: Hugo Build (GitHub Actions)
  → cd hugo && hugo --minify
    - Reads data.json (for badge page metadata display)
    - Reads frontmatter (for taxonomy generation)
    - Reads interests.yaml (for taxonomy page rendering with display names)
    - Generates ~28 taxonomy landing pages
    - Generates ~143 badge pages with metadata
    - Generates ~143 changelog pages (if exist)
    - Generates global changelog page
    - Outputs to hugo/public/
  
Step 11: Deploy to Firebase Hosting
  → GitHub Actions deploys hugo/public/ to CDN

Step 12: Validation (Optional)
  → bun run validate-hugo-build
    - Checks all expected taxonomy pages exist in hugo/public/
    - Fails if Hugo taxonomy generation failed
```

**Future Annual Update Flow:**

```
Year Later: BSA Publishes Requirement Changes
  
Step 1: Update Requirements
  → bun run sync:badges
    - Scrapes updated requirements from BSA
    - Updates data.json files for changed badges
  
Step 2: Regenerate Metadata
  → bun run generate-metadata
    - Runs on all 143 badges (or subset if only few changed)
    - Updates metadata based on new requirements
  
Step 3: Validate + Review + Deploy
  → bun run validate-metadata
  → git diff
  → git commit && git push
  → Auto: Hugo build + Firebase deploy
```

### File Organization Patterns

**Configuration Files (Root Level):**
- `package.json` - [MODIFIED] Add Phase 1 script commands
  ```json
  {
    "scripts": {
      "generate-meta-descriptions": "bun scripts/generate-meta-descriptions.ts",
      "generate-difficulty": "bun scripts/generate-difficulty.ts",
      "generate-interests": "bun scripts/generate-interests.ts",
      "generate-location": "bun scripts/generate-location.ts",
      "generate-changelog": "bun scripts/generate-changelog.ts",
      "generate-metadata": "bun run generate-difficulty && bun run generate-interests && bun run generate-location && bun run generate-changelog",
      "validate-metadata": "bun scripts/validate-metadata.ts",
      "validate-build": "bun scripts/validate-hugo-build.ts"
    }
  }
  ```
- `tsconfig.json` - TypeScript strict mode configuration (existing, no changes)
- `.prettierrc` - Code formatting rules (existing, no changes)
- `firebase.json` - Firebase Hosting configuration (existing, no changes)
- `hugo/hugo.toml` - [MODIFIED] Add Phase 1 taxonomy configuration

**Script Organization (scripts/):**
- **Pattern:** One script per feature, one export per file
- **Shared code:**
  - `types.ts` - Shared Phase 1 interfaces (BadgeMetadata, InterestDefinition, LocationMetadata, TimeEstimate)
  - `utils/` - Shared utilities following one-export-per-file pattern
- **Generation scripts:** generate-difficulty, generate-interests, generate-location, generate-changelog
- **Setup scripts:** generate-meta-descriptions (one-time)
- **Validation scripts:** validate-metadata, validate-hugo-build
- **Naming pattern:** `{verb}-{noun}.ts` (kebab-case)

**Hugo Content Organization (hugo/content/):**
- **Pattern:** Page bundles (directory per badge with _index.md + data.json + subdirectories)
- **Badge structure:**
  - `_index.md` - [MODIFIED] Add taxonomy frontmatter (interests, difficulty, location_setting, special_locations)
  - `data.json` - [MODIFIED] Add metadata object (difficulty, time_estimate, interests, location)
  - `requirements/index.md` - Requirements page (existing, no changes)
  - `changelog/index.md` - [NEW] Generated source, committed to git
- **Global changelog:** `changelog/_index.md` - Custom section for global changelog

**Hugo Template Organization (hugo/layouts/):**
- **Base:** `_default/baseof.html` (existing, defines blocks for extensibility)
- **Section templates:** 
  - `merit-badges/single.html` - [MODIFIED] Add metadata display
  - `merit-badges/list.html` - [MODIFIED] Add metadata display on cards
  - `merit-badges/changelog.html` - [NEW] Per-badge changelog template
  - `changelog/list.html` - [NEW] Global changelog template
- **Taxonomy templates:** One per taxonomy
  - `interests/list.html` - Interest landing pages
  - `difficulty/list.html` - Difficulty landing pages
  - `location_setting/list.html` - Location landing pages
  - `special_locations/list.html` - Special location landing pages
- **Custom pages:** `badges/browse.html` - Taxonomy browser hub
- **Partials:** Reusable components in `partials/` directory
  - Existing: requirement.html, header.html, footer.html
  - [NEW]: difficulty-rating, location-indicator, interest-tag, eagle-indicator, changelog-display, requirements-updated-indicator

**Hugo Template Lookup Order (for reference):**
1. `layouts/{section}/{type}.html` - Most specific
2. `layouts/{section}/list.html` or `layouts/{section}/single.html`
3. `layouts/_default/{type}.html` - Default fallback

**SCSS Organization (hugo/assets/scss/):**
- **Base styles:** base.scss, colors.scss, typography.scss, spacing.scss (loaded by all pages via page imports)
- **Components:** `components/*.scss` (one file per component, uses var(--properties) only, no imports)
- **Pages:** `pages/*.scss` (page-specific files import needed components via @use)
- **Pattern:** Page SCSS imports base + needed components, compiles to single CSS file per page
- **Loading:** Per-page CSS via Hugo Pipes (performance optimization)

**Data File Organization (hugo/data/):**
- **Pattern:** Hugo YAML data files accessed via .Site.Data in templates
- **Structure:** Lists or maps of objects
- **Phase 1:** `interests.yaml` with interest definitions (slug, name, description, meta_description, icon)
- **Usage:** Templates read to map interest slugs → display names and descriptions

### Component Boundaries & Isolation

**Component 1: Metadata Generation System**
- **Isolation:** Each script runs independently, no inter-script communication
- **Shared dependencies:** 
  - `scripts/types.ts` (interfaces)
  - `scripts/utils/` (utility functions)
  - `scripts/merit-badges.ts` (master badge list)
- **Boundary:** File system I/O (read data.json → process with AI → write data.json + frontmatter)
- **Communication:** Sequential execution via package.json (&&), no parallel execution
- **Output:** Enriched badge data with complete metadata object

**Component 2: Hugo Taxonomy System**
- **Isolation:** Hugo-managed, zero custom integration code required
- **Dependencies:** Frontmatter taxonomy terms (interests, difficulty, location_setting, special_locations)
- **Boundary:** Hugo's native taxonomy engine (automatic page generation)
- **Communication:** Hugo reads frontmatter, generates landing pages, no explicit API
- **Output:** ~28 taxonomy landing pages organized by term

**Component 3: Badge Display Components (Hugo Partials)**
- **Isolation:** Each partial is self-contained, accepts parameters via dict, renders HTML
- **Dependencies:** 
  - data.json metadata object (via .Site.Data)
  - interests.yaml (for slug → name mapping)
- **Boundary:** Hugo partial invocation (`{{ partial "name" (dict ...) }}`)
- **Communication:** Partials called from templates, no partial-to-partial calls
- **Output:** Rendered HTML fragments

**Component 4: SCSS Styling System**
- **Isolation:** Each component file self-contained, no component-to-component dependencies
- **Dependencies:** CSS custom properties only (var(--olive-500), var(--space-xs), etc.)
- **Boundary:** Build-time Sass compilation via Hugo Pipes
- **Communication:** None - SCSS compiles to CSS, no runtime interaction
- **Loading:** Per-page imports via @use in page-specific SCSS files
- **Output:** Compiled, minified CSS per page

**Component 5: Validation System**
- **Isolation:** Read-only validation, no data modifications
- **Dependencies:** Generated metadata in data.json + frontmatter, Hugo build output (public/)
- **Boundary:** File system reads, no writes
- **Communication:** None - validation scripts run independently
- **Output:** Pass/fail with structured error messages (integration test function)

### Phase 1 File Summary

**New Files to Create:**

**TypeScript Scripts (10 new files):**
1. `scripts/types.ts` - Shared Phase 1 interfaces
2. `scripts/utils/read-badge-data.ts`
3. `scripts/utils/update-frontmatter.ts`
4. `scripts/utils/format-requirements.ts`
5. `scripts/generate-meta-descriptions.ts` - One-time setup
6. `scripts/generate-difficulty.ts`
7. `scripts/generate-interests.ts`
8. `scripts/generate-location.ts`
9. `scripts/generate-changelog.ts`
10. `scripts/validate-metadata.ts`
11. `scripts/validate-hugo-build.ts` (optional post-build validation)

**Hugo Data Files (1 new file):**
1. `hugo/data/interests.yaml` - Master interests with slugs, names, descriptions, meta descriptions, icons

**Hugo Content Files (1 new file + 143 generated):**
1. `hugo/content/changelog/_index.md` - Global changelog content
2. `hugo/content/merit-badges/{slug}/changelog/index.md` (×143) - [GENERATED] Per-badge changelogs (committed source)

**Hugo Partials (6 new files):**
1. `hugo/layouts/partials/difficulty-rating.html`
2. `hugo/layouts/partials/location-indicator.html`
3. `hugo/layouts/partials/interest-tag.html`
4. `hugo/layouts/partials/eagle-indicator.html`
5. `hugo/layouts/partials/changelog-display.html`
6. `hugo/layouts/partials/requirements-updated-indicator.html`

**Hugo Templates (7 new files):**
1. `hugo/layouts/interests/list.html` - Interest taxonomy landing pages
2. `hugo/layouts/difficulty/list.html` - Difficulty taxonomy landing pages
3. `hugo/layouts/location_setting/list.html` - Location taxonomy landing pages
4. `hugo/layouts/special_locations/list.html` - Special location landing pages
5. `hugo/layouts/badges/browse.html` - Taxonomy browser hub
6. `hugo/layouts/merit-badges/changelog.html` - Per-badge changelog template
7. `hugo/layouts/changelog/list.html` - Global changelog template

**SCSS Components (6 new files):**
1. `hugo/assets/scss/components/difficulty-rating.scss`
2. `hugo/assets/scss/components/location-indicator.scss`
3. `hugo/assets/scss/components/interest-tag.scss`
4. `hugo/assets/scss/components/eagle-indicator.scss`
5. `hugo/assets/scss/components/changelog-display.scss`
6. `hugo/assets/scss/components/requirements-updated-indicator.scss`

**SCSS Pages (3 new files):**
1. `hugo/assets/scss/pages/badge-detail.scss` - Imports Phase 1 components
2. `hugo/assets/scss/pages/taxonomy-page.scss` - Styles for taxonomy landing pages
3. `hugo/assets/scss/pages/browse-page.scss` - Styles for taxonomy browser hub

**Modified Files:**
1. `package.json` - Add Phase 1 script commands
2. `hugo/hugo.toml` - Add taxonomy configuration
3. `hugo/layouts/merit-badges/single.html` - Add metadata display with backward compatibility
4. `hugo/layouts/merit-badges/list.html` - Add metadata display on badge cards
5. `hugo/content/merit-badges/{slug}/data.json` (×143) - Add metadata object
6. `hugo/content/merit-badges/{slug}/_index.md` (×143) - Add taxonomy frontmatter

**Total Phase 1 Additions:**
- **~37 new files** (11 scripts + 1 data + 1 content + 6 partials + 7 templates + 6 SCSS components + 3 SCSS pages + 2 generated changelogs initially)
- **~287 modified files** (1 package.json + 1 hugo.toml + 2 templates + 143 × data.json + 143 × _index.md = 290 files)
- **~171 generated pages** (143 badge pages + ~28 taxonomy pages)

### Hugo-Specific Patterns (From Framework Expert)

**Hugo Taxonomy Configuration (Critical):**
```toml
# hugo/hugo.toml
[taxonomies]
  interest = "interests"
  difficulty = "difficulty"
  location_setting = "location_setting"
  special_location = "special_locations"
```

**Important:** Defining custom taxonomies **disables Hugo's default taxonomies** (tags, categories). MBU doesn't use default taxonomies, so this configuration is correct.

**Taxonomy Template Lookup Order:**
Hugo searches for taxonomy templates in this order:
1. `layouts/{taxonomy}/list.html` (most specific - RECOMMENDED)
2. `layouts/{taxonomy}/taxonomy.html` (alternate)
3. `layouts/_default/taxonomy.html` (default for all)
4. `layouts/_default/list.html` (final fallback)

**Phase 1 uses Option 1:** Separate list.html per taxonomy for customization.

**Global Changelog Page Pattern:**
- **Content:** `hugo/content/changelog/_index.md` (custom section)
- **Template:** `hugo/layouts/changelog/list.html`
- **URL:** `/changelog/` (can configure permalink to `/merit-badges/changelog/` via hugo.toml if desired)
- **Rationale:** Clean Hugo section pattern, extensible for future

**Generated Changelog Storage Decision:**
- **Pattern:** Generated changelogs are **committed source content** (not ephemeral build output)
- **Location:** `hugo/content/merit-badges/{slug}/changelog/index.md`
- **Rationale:** 
  - Annual updates make git history valuable (audit trail)
  - Changelogs are content (like requirements), not build artifacts
  - Can redeploy anytime without regenerating changelogs
  - Git provides version history of requirement changes over years

**interests.yaml Creation:**
- **Method:** Manual creation (no setup script needed)
- **Structure documented in architecture doc**
- **Then run:** `bun run generate-meta-descriptions` to populate meta_description fields

**Hugo Data File Access in Templates:**
```go
{{/* Access interests.yaml */}}
{{ $interests := .Site.Data.interests.interests }}

{{/* Map slug to interest definition */}}
{{ $interestSlug := "arts-crafts" }}
{{ $interest := index (where $interests "slug" $interestSlug) 0 }}
{{ $interest.name }}           {{/* "Arts & Crafts" */}}
{{ $interest.description }}    {{/* "Creative and artistic activities" */}}
{{ $interest.meta_description }} {{/* AI-generated SEO description */}}
```

### Development Workflow Integration

**Development Server Structure:**
```bash
# Start Hugo development server
bun run hugo:dev
# Runs: cd hugo && hugo server

# What it serves:
- Badge pages at /merit-badges/{slug}/
- Taxonomy pages at /interests/{slug}/, /difficulty/{level}/
- Browser hub at /badges/browse/
- Changelogs at /merit-badges/{slug}/changelog/
- Live reload on file changes (templates, SCSS, content)
```

**Build Process Structure:**
```bash
# One-time Phase 1 setup
bun run generate-meta-descriptions  # Populate interests.yaml
# Manual: Create interests.yaml structure first

# Test on subset
BADGE_SLUGS="archery,camping,first-aid" bun run generate-metadata
bun run validate-metadata

# Full generation (annual)
bun run generate-metadata
bun run validate-metadata

# Hugo build
bun run build
# Runs: cd hugo && hugo --minify && bun run index
# Outputs to: hugo/public/

# Optional: Validate build output
bun run validate-build
```

**Deployment Structure (GitHub Actions):**
```yaml
# .github/workflows/firebase-hosting-merge.yml
on:
  push:
    branches: [trunk]

jobs:
  deploy:
    steps:
      - checkout
      - setup Bun
      - name: Build Hugo Site
        run: cd hugo && hugo --minify
        # Reads: data.json + frontmatter + interests.yaml
        # Generates: ~171 pages (143 badges + 28 taxonomies + changelogs)
      
      - name: Deploy to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        # Deploys: hugo/public/ to CDN
```

**Note:** Metadata generation happens **locally** (not in CI/CD) for manual review before commit.

### Testing Structure

**Testing Strategy: Validation Scripts as Integration Tests**

Phase 1 uses **validation scripts instead of traditional unit tests**:

**Test 1: Metadata Integrity (Pre-Build)**
```typescript
// scripts/validate-metadata.ts
// Runs after: generate-metadata
// Validates:
//   - All 143 badges have metadata object
//   - Difficulty in range 1-5
//   - Interests array not empty
//   - Location setting valid enum
//   - data.json ↔ frontmatter sync
// Fails: Exit code 1 with structured error messages
```

**Test 2: Hugo Build Validation (Post-Build)**
```typescript
// scripts/validate-hugo-build.ts
// Runs after: Hugo build
// Validates:
//   - All expected taxonomy pages exist in hugo/public/
//   - All badge pages rendered successfully
//   - Global changelog page exists
// Fails: Exit code 1 if missing pages
```

**No Separate test/ Directory:**
- Rationale: Annual cadence with manual review makes extensive automated testing overkill
- Validation scripts function as integration tests (data integrity + build output)
- Manual QA checklist covers UI/UX validation

**Quality Assurance Process:**
1. Generate metadata on 3 test badges
2. Manual inspection
3. Refine AI prompts
4. Generate on all 143 badges
5. Run validate-metadata (automated integration test)
6. Spot-check 10 random badges (manual sampling)
7. Hugo build
8. Run validate-hugo-build (automated build test)
9. Lighthouse audits (performance, accessibility, SEO)
10. Deploy to staging → manual smoke test
11. Deploy to production

### Implementation Order (Updated with Hugo Expert Input)

**Phase 1 Setup Sequence:**

**Week 1: Foundation**
1. Create `scripts/types.ts` with shared Phase 1 interfaces
2. Create `scripts/utils/` with shared utility functions (one export per file)
3. Manually create `hugo/data/interests.yaml` structure (~10-15 interests with slug, name, description, icon)
4. Create `scripts/generate-meta-descriptions.ts`
5. Run `bun run generate-meta-descriptions` to populate meta_description fields
6. Add Hugo taxonomy configuration to `hugo/hugo.toml`
7. Create `hugo/content/changelog/_index.md` for global changelog
8. Update `package.json` with Phase 1 script commands

**Week 1-2: Metadata Generation Scripts**
9. Build `scripts/generate-difficulty.ts`
10. Build `scripts/generate-interests.ts`
11. Build `scripts/generate-location.ts`
12. Build `scripts/generate-changelog.ts`
13. Build `scripts/validate-metadata.ts`

**Week 2: Subset Testing**
14. Run `BADGE_SLUGS="archery,camping,first-aid" bun run generate-metadata`
15. Manual inspection of 3 badges
16. Refine AI prompts based on output quality
17. Iterate until satisfactory

**Week 3: Hugo Templates & Components**
18. Create 6 Hugo partials (difficulty-rating, location-indicator, interest-tag, eagle-indicator, changelog-display, requirements-updated-indicator)
19. Create 7 Hugo templates (interests/list, difficulty/list, location_setting/list, special_locations/list, badges/browse, merit-badges/changelog, changelog/list)
20. Modify `hugo/layouts/merit-badges/single.html` (add metadata display with `with` blocks)
21. Modify `hugo/layouts/merit-badges/list.html` (add metadata display on cards)

**Week 3: SCSS Components**
22. Create 6 SCSS components (matching partial names)
23. Create 3 SCSS page files (badge-detail, taxonomy-page, browse-page)
24. Each page SCSS imports only needed components via @use

**Week 3-4: Full Rollout**
25. Run `bun run generate-metadata` on all 143 badges
26. Run `bun run validate-metadata` (integration test)
27. Spot-check 10 random badges manually
28. Review git diff (287 files changed)
29. Commit metadata changes

**Week 4: Deployment**
30. Deploy to Firebase preview channel (staging)
31. Manual QA checklist execution
32. Lighthouse audits (Performance 90+, Accessibility 100, SEO 100)
33. Run `bun run validate-build` (post-build test)
34. Production deployment (merge to trunk)
35. Monitor Pirsch analytics for issues

### Structure Completeness Assessment

**All Components Mapped:** ✅
- Metadata generation → scripts/
- Hugo templates → layouts/
- Partials → layouts/partials/
- SCSS → assets/scss/components/ and pages/
- Data files → data/
- Validation → scripts/validate-*

**All Integration Points Defined:** ✅
- Scripts → File system (read/write boundaries clear)
- Hugo data files → Templates (read-only access pattern)
- Frontmatter → Taxonomy engine (automatic Hugo processing)
- data.json → Templates (Hugo data access via .Site.Data)

**All Boundaries Clear:** ✅
- Build-time only (no runtime boundaries)
- Component isolation (partials, scripts, SCSS all self-contained)
- File organization (one export per file, kebab-case naming)

**All Hugo Patterns Documented:** ✅
- Taxonomy configuration and lookup order
- Custom section for global changelog
- Data file access patterns
- Template parameter passing with dict
- Backward compatibility with with blocks

**Structure is 100% complete and implementation-ready.**

---

**Accept these structural refinements and complete project structure? (y/n)**

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**

All architectural decisions work together without conflicts:
- ✅ Hugo extended + Bun + TypeScript → Proven compatible stack already in production
- ✅ Google Gemini API + Bun → Existing integration pattern validated (Gemini already used for badge images)
- ✅ Hugo taxonomies + frontmatter + data.json → Standard Hugo pattern, well-documented
- ✅ Firebase Hosting + GitHub Actions → Existing CI/CD workflow proven reliable
- ✅ SCSS Dart Sass + Hugo Pipes → Hugo extended native support
- ✅ Static site architecture + build-time metadata → No runtime complexity, zero operational overhead

**Technology Version Compatibility:**
- Hugo extended >= 0.129.0 (Dart Sass support required and validated)
- Bun (latest stable, existing installation working)
- TypeScript strict mode (existing configuration proven)
- Google Gemini API (gemini-pro model, existing integration pattern)
- Firebase Hosting (existing deployment infrastructure)

**All technology choices are compatible. No version conflicts. No integration issues.**

**Pattern Consistency:**

All implementation patterns support architectural decisions:
- ✅ snake_case for JSON fields → Compatible with TypeScript interfaces, matches existing data.json (eagle_required, req_id)
- ✅ kebab-case for file names → Compatible with Hugo, SCSS, TypeScript conventions, matches existing codebase
- ✅ Explicit slugs in interests.yaml → Eliminates Hugo slugification ambiguity across different AI agents
- ✅ Component-based SCSS loading → Compatible with Hugo Pipes per-page CSS pattern
- ✅ CSS custom properties (no SCSS variables) → Matches existing design system architecture
- ✅ One export per file → Enforced by existing TypeScript strict rules
- ✅ Fail-fast error handling → Compatible with sequential script execution pattern
- ✅ Atomic updates via Promise.all → Compatible with Bun file I/O
- ✅ with blocks for backward compatibility → Standard Hugo safety pattern, protects existing functionality
- ✅ Sequential execution (&&) → Prevents file corruption from concurrent writes

**Pattern-decision alignment is complete. All patterns reinforce architectural decisions.**

**Structure Alignment:**

Project structure supports all architectural decisions without gaps:
- ✅ scripts/ directory → Contains all 11 metadata generation, validation, and setup scripts
- ✅ scripts/types.ts → Shared Phase 1 interfaces prevent type conflicts between agents
- ✅ scripts/utils/ → Shared utilities with one-export-per-file pattern (read-badge-data, update-frontmatter, format-requirements)
- ✅ hugo/data/interests.yaml → Hugo's standard data location, accessible via .Site.Data in templates
- ✅ hugo/layouts/ → Organized by section and taxonomy type (Hugo convention)
- ✅ hugo/assets/scss/ → Component-based organization supports per-page loading pattern
- ✅ Hugo content page bundles → Support dual storage (data.json + frontmatter in same directory for atomic updates)

**Structure enables all patterns and decisions. No structural impediments to implementation.**

### Requirements Coverage Validation ✅

**Functional Requirements Coverage (60/60 = 100%):**

**FR1-10: Content Discovery & Navigation** → ✅ Complete Support
- FR1: Browse badges by interest area → Hugo taxonomy system generates `/interests/{slug}/` pages automatically
- FR2: Browse by location requirement → Hugo taxonomy generates `/location_setting/{setting}/` pages
- FR3: Browse by difficulty level → Hugo taxonomy generates `/difficulty/{level}/` pages (1-5)
- FR4: Browse by special location → Hugo taxonomy generates `/special_locations/{location}/` pages
- FR5: Centralized taxonomy browser page → `hugo/layouts/badges/browse.html` template
- FR6: Access browser from site navigation → Will be implemented via header.html link
- FR7: View complete list of 143 badges → Existing `merit-badges/list.html` works unchanged
- FR8: Navigate from badges to interests via clickable tags → `interest-tag.html` partial renders links
- FR9: Navigate from badges to location pages → `location-indicator.html` partial (can make clickable)
- FR10: Navigate between taxonomy pages → Breadcrumb navigation + taxonomy page cross-links

**FR11-19: Badge Information Display** → ✅ Complete Support
- FR11-12: View detailed requirements text → Existing requirement.html partial (unchanged, proven)
- FR13: View difficulty ratings (1-5 scale) → `difficulty-rating.html` partial (⭐⭐⭐ display)
- FR14: View time estimates (min/typical/max) → Inline display using metadata.time_estimate
- FR15: View assigned interests → `interest-tag.html` partial (1-3 clickable interest pills)
- FR16: View location requirements → `location-indicator.html` partial (🏠/🏕️/↔️ with labels)
- FR17: View special locations if applicable → Included in location-indicator component
- FR18: View badges in list format with summary → Enhanced `merit-badges/list.html` template
- FR19: View metadata on list pages (not just detail) → Badge cards display all metadata inline

**FR20-24: Requirement Change Tracking** → ✅ Complete Support
- FR20: Visual indicators for recent updates (90 days) → `requirements-updated-indicator.html` partial (🆕 badge)
- FR21: Per-badge changelog pages → `merit-badges/changelog.html` template renders before/after
- FR22: Global changelog page → `changelog/list.html` template (custom section)
- FR23: Before/after comparison display → `changelog-display.html` partial (diff view)
- FR24: Last updated dates on badge pages → Stored in metadata, displayed in badge templates

**FR25-33: Metadata Generation System** → ✅ Complete Support
- FR25: Generate difficulty ratings (1-5) → `scripts/generate-difficulty.ts` (Gemini API analyzes requirements)
- FR26: Generate time estimates → Integrated in generate-difficulty.ts (same AI call, min/typical/max)
- FR27: Generate interest tags (1-3 per badge) → `scripts/generate-interests.ts` (categorizes from master list)
- FR28: Generate location classifications → `scripts/generate-location.ts` (indoor/outdoor/flexible)
- FR29: Identify special locations → Included in generate-location.ts (pool, range, wilderness, farm, water)
- FR30: Store in Hugo-compatible format → data.json metadata object + frontmatter taxonomy terms
- FR31: Detect requirement changes → Parse BSA published change document (authoritative source)
- FR32: Generate changelog entries → `scripts/generate-changelog.ts` (creates markdown changelog pages)
- FR33: Scrape badge requirements → Existing `sync-requirements-hybrid.ts` (no changes needed)

**FR34-39: Taxonomy & Landing Page Generation** → ✅ Complete Support
- FR34-37: Generate taxonomy landing pages → Hugo's native taxonomy engine (automatic, zero custom code)
- FR38: Organize badges on taxonomy pages → Hugo taxonomy system handles automatically
- FR39: Generate taxonomy browser hub → `badges/browse.html` template with card-based layout

**FR40-46: SEO & Discoverability** → ✅ Complete Support
- FR40-41: Generate structured data markup → Enhance existing `partials/json-ld/` with taxonomy schemas
- FR42: Generate social sharing metadata → Meta descriptions in interests.yaml, OpenGraph in baseof.html head
- FR43: Generate sitemap → Hugo auto-generates sitemap.xml (all pages included)
- FR44: SEO-optimized meta descriptions → AI-generated via generate-meta-descriptions.ts, stored in interests.yaml
- FR45: SEO-optimized H1 tags → Taxonomy templates use interest.name from interests.yaml
- FR46: Generate internal links → interest-tag partial creates links from badges to taxonomy pages

**FR47-51: Analytics & Measurement** → ✅ Complete Support
- FR47: Track page visits → Pirsch Analytics (existing JavaScript integration in baseof.html)
- FR48: Track referral sources → Pirsch referral tracking (existing configuration)
- FR49: Track returning visitors → Pirsch visitor identification (existing)
- FR50: Track engagement metrics → Pirsch time on page, scroll depth (existing)
- FR51: Provide sitemap → Hugo sitemap.xml (automatic generation)

**FR52-60: Accessibility** → ✅ Complete Support
- FR52: Keyboard-only navigation → Hugo generates semantic HTML with accessible links by default
- FR53: Visible focus indicators → CSS patterns documented (3px minimum, high contrast)
- FR54: Skip navigation links → Will be added to baseof.html header block
- FR55: Semantic HTML hierarchy → Hugo template patterns use proper heading structure
- FR56: WCAG AA color contrast → CSS custom properties validated (--olive-500 on --tan-100 = 4.5:1+)
- FR57: Difficulty multi-indicator (not color-only) → Stars + aria-label pattern documented
- FR58: Location icon + text (not icon-only) → Pattern documented in location-indicator
- FR59: Alt text on images/icons → ARIA label pattern for emoji icons documented
- FR60: Lighthouse accessibility 100 → Enforced via Lighthouse CI on every PR/commit

**All 60 Functional Requirements have complete architectural support. Coverage: 100%**

**Non-Functional Requirements Coverage (27/27 = 100%):**

**NFR1-6: Performance** → ✅ Architecturally Addressed
- NFR1: FCP < 1.5s (target < 1s) → Hugo static generation + per-page CSS loading delivers sub-1s loads
- NFR2: TTI < 3.5s → No JavaScript required for core functionality, minimal JS for analytics
- NFR3: Page weight < 500KB → Component-based CSS loading pattern minimizes payload
- NFR4: Lighthouse Performance 90+ → Lighthouse CI enforces threshold on every PR/commit
- NFR5: Build time < 2min → Validated at milliseconds (Hugo builds 143 badges + 28 taxonomies instantly)
- NFR6: Mobile performance targets → Mobile-first SCSS patterns, fluid responsive design

**NFR7-12: Accessibility** → ✅ Architecturally Addressed
- NFR7: WCAG 2.1 AA compliance → ARIA label patterns, semantic HTML, high contrast documented
- NFR8: Lighthouse Accessibility 100 → Lighthouse CI enforces threshold, fails CI if drops
- NFR9: Keyboard navigation → All interactive elements accessible via Tab, documented in patterns
- NFR10: Screen reader compatibility → aria-label pattern for emoji icons, semantic HTML
- NFR11: Color contrast ratios → CSS custom properties validated, existing palette meets requirements
- NFR12: Non-color indicators → All icons include text labels, documented pattern

**NFR13-16: Content Quality** → ✅ Architecturally Addressed
- NFR13: BSA requirement accuracy → Requirements unchanged (metadata additive only, no modifications)
- NFR14: AI metadata accuracy 90%+ → Subset testing + prompt refinement + manual spot-checks
- NFR15: Changelog accuracy → BSA document authoritative source eliminates heuristic detection errors
- NFR16: Content freshness → Can run sync:badges + generate-metadata as needed

**NFR17-19: Browser Compatibility** → ✅ Architecturally Addressed
- NFR17: Chrome/Edge/Safari (last 2 versions) → Modern CSS features validated for supported browsers
- NFR18: iOS Safari + Chrome on Android → Mobile-first patterns, tested on target devices
- NFR19: Progressive enhancement → Core works without JS, with blocks provide metadata fallback

**NFR20-22: SEO Performance** → ✅ Architecturally Addressed
- NFR20: Lighthouse SEO 100 → Lighthouse CI enforces threshold
- NFR21: Structured data validation → Schema.org JSON-LD templates, manual validation
- NFR22: Sitemap completeness → Hugo auto-generates sitemap.xml including all taxonomy and badge pages

**NFR23-24: Data Validation** → ✅ Architecturally Addressed
- NFR23: Schema validation before build → validate-metadata.ts checks all fields before Hugo build
- NFR24: Build failure protection → Validation scripts fail with exit code 1, blocks deployment

**NFR25-27: Deployment** → ✅ Architecturally Addressed
- NFR25: Automated deployment → GitHub Actions workflows (existing, proven)
- NFR26: Build failure protection → Hugo build fails on invalid data/templates, validation scripts block deployment
- NFR27: 5-minute deployment → Hugo builds in milliseconds, Firebase deploy completes quickly

**All 27 Non-Functional Requirements architecturally addressed. Coverage: 100%**

### Implementation Readiness Validation ✅

**Decision Completeness Assessment:**

All critical architectural decisions documented with complete context:
- ✅ AI Service: Google Gemini (gemini-pro model) - rationale: existing integration, good for structured outputs
- ✅ Taxonomy Strategy: Interest-based (~10-15 categories) - rationale: matches scout mental model
- ✅ Data Storage: Extend data.json with metadata object - rationale: single source of truth, atomic updates
- ✅ Build Pipeline: Local generation → manual review → commit → auto deploy - rationale: annual cadence makes manual review practical
- ✅ Error Handling: Fail fast on all errors - rationale: ensures complete metadata or manual intervention
- ✅ Prompt Management: Inline in scripts - rationale: follows existing patterns, simple
- ✅ Validation: Minimal (trust AI) - rationale: subset testing + manual review validates quality
- ✅ Master Interests: Hugo data file - rationale: DRY access from scripts and templates
- ✅ SEO Meta Descriptions: AI-generated - rationale: consistent with other AI content
- ✅ Changelog: Separate pages - rationale: keep requirements clean
- ✅ Taxonomy Browser: Card-based with counts - rationale: mobile-first visual scanning

**All critical decisions have rationale and versions specified where applicable.**

**Structure Completeness Assessment:**

Complete directory tree with all files specified:
- ✅ 37+ new files identified (scripts, templates, partials, components, styles, configs)
- ✅ 288 modified files identified (package.json, hugo.toml, CLAUDE.md, templates, 286 badge files)
- ✅ Integration points mapped (4 build-time boundaries with explicit data flow)
- ✅ Component boundaries defined (5 isolated components with clear responsibilities)
- ✅ File organization patterns clear (where everything goes, naming conventions)

**AI agents have complete blueprint. No ambiguity in project structure.**

**Pattern Completeness Assessment:**

Comprehensive pattern coverage preventing all potential AI agent conflicts:
- ✅ Naming patterns: 7 contexts covered (JSON, files, taxonomies, variables, interfaces, partials, SCSS)
- ✅ Structure patterns: 5 areas covered (scripts, partials, SCSS, data files, content)
- ✅ Format patterns: 4 formats defined (data.json, frontmatter, interests.yaml, error messages)
- ✅ Hugo patterns: 5 patterns (partials vs shortcodes, dict parameters, with blocks, data access, taxonomy access)
- ✅ TypeScript patterns: 6 patterns (one export, type imports, no abbreviations, explicit returns, object parameters, environment validation)
- ✅ SCSS patterns: 3 patterns (component loading, CSS custom properties only, no imports in components)
- ✅ Process patterns: 6 patterns (sequential execution, subset testing, atomic updates, fail-fast, validation gates, implementation order)

**15 comprehensive patterns with concrete examples and anti-patterns.**

**Conflict Prevention Analysis:**

Where could different AI agents make incompatible choices?
- ❌ Naming "Arts & Crafts" → ✅ Resolved: Explicit slugs in interests.yaml
- ❌ JSON field naming → ✅ Resolved: snake_case documented with examples
- ❌ File naming → ✅ Resolved: kebab-case for all file types
- ❌ SCSS imports in components → ✅ Resolved: Use var() only, no imports
- ❌ Parallel script execution → ✅ Resolved: Sequential via && explicitly required
- ❌ Partial vs shortcode choice → ✅ Resolved: Partials for Phase 1, shortcodes reserved
- ❌ Error message format → ✅ Resolved: [script-name] prefix pattern
- ❌ data.json vs frontmatter sync → ✅ Resolved: Atomic update pattern with Promise.all

**All potential conflict points have explicit patterns. AI agents will implement consistently.**

**Implementation Readiness: HIGH - Agents can start building immediately.**

### Gap Analysis Results

**Critical Gaps:** ✅ NONE IDENTIFIED

**Important Gaps Identified and Resolved:**

1. ✅ **Lighthouse CI Configuration**
   - Gap: No automated regression detection for performance/accessibility/SEO
   - Resolution: Added `.github/workflows/lighthouse-ci.yml` and `.lighthouserc.json`
   - Impact: Automated quality gate on every PR/commit

2. ✅ **CLAUDE.md Phase 1 Documentation**
   - Gap: No development workflow documentation for Phase 1
   - Resolution: Added Phase 1 section to CLAUDE.md (metadata generation workflow)
   - Impact: AI agents and developers have clear workflow guidance

3. ✅ **Hugo Permalinks Clarification**
   - Gap: Unclear if `/merit-badges/camping/changelog/` URL structure was automatic
   - Resolution: Clarified Hugo page bundle structure handles this by default
   - Impact: No configuration needed, default behavior is correct

4. ✅ **Gemini Rate Limits Strategy**
   - Gap: No documented rate limit handling
   - Resolution: Documented manual management, sequential execution stays under limits
   - Impact: Clear strategy (fail-fast handles rate limit errors)

5. ✅ **Interest Category Final Count**
   - Gap: Unclear if 10 categories was final or more needed
   - Resolution: Finalized at 10 interests, extensible pattern allows adding more later
   - Impact: Architecture locked, can extend post-launch if needed

6. ✅ **Utility Function Signatures**
   - Gap: Function signatures not explicitly documented
   - Resolution: Function names are self-explanatory (read-badge-data, update-frontmatter)
   - Impact: Agents will create correct implementations from names

7. ✅ **Interest-Tag Clickability**
   - Gap: Unclear if interest tags are links or visual-only
   - Resolution: Clarified must be clickable links per FR8
   - Impact: Partial must render <a> tags to taxonomy pages

8. ✅ **Unit Tests for Utilities**
   - Gap: No unit tests for utility functions
   - Resolution: Documented decision - no unit tests in Phase 1, integration testing sufficient
   - Impact: Right-sized testing for annual cadence

**Nice-to-Have Gaps (Deferred, Not Blocking):**
- ⏭️ Pre-commit hooks for validation (can add later if multi-developer team needs it)
- ⏭️ Advanced prompt versioning system (can add if prompts need frequent iteration)
- ⏭️ Automated retry logic for Gemini API (fail-fast is simpler, appropriate for annual cadence)

**No critical or important gaps remaining. Architecture is complete.**

### Quality Gate Validation ✅

**Comprehensive 7-Stage Quality Gate Strategy:**

**Gate 1: Subset Testing (Human Validation)**
- When: After script development, before full rollout
- What: Run on 3 badges (archery, camping, first-aid)
- Validates: AI output quality, prompt effectiveness
- Action: Manual inspection, refine prompts, iterate
- Purpose: Catch AI quality issues before processing all 143 badges

**Gate 2: validate-metadata.ts (Automated Integration Test)**
- When: After generate-metadata completes
- What: Checks all 143 badges have complete, valid metadata
- Validates: Metadata exists, difficulty 1-5, interests not empty, location valid enum, data.json ↔ frontmatter sync
- Action: Fails with structured error messages (exit code 1)
- Purpose: Catch format/structure errors before commit

**Gate 3: Hugo Build (Build-Time Validation)**
- When: During Hugo build process
- What: Hugo fails if templates reference missing data, invalid taxonomy config, or malformed frontmatter
- Validates: Template correctness, Hugo config validity, frontmatter syntax
- Action: Build failure prevents deployment
- Purpose: Catch Hugo-specific errors

**Gate 4: validate-hugo-build.ts (Post-Build Test)**
- When: After Hugo build completes
- What: Checks all expected taxonomy pages exist in hugo/public/
- Validates: Taxonomy page generation succeeded
- Action: Fails if missing pages (exit code 1)
- Purpose: Catch Hugo taxonomy generation failures

**Gate 5: Lighthouse CI (Automated Regression Detection)**
- When: On every PR and commit to trunk
- What: Runs Lighthouse audits on 5 sample pages
- Validates: Performance 90+, Accessibility 100, SEO 100
- Action: Fails CI if scores drop below thresholds
- Purpose: Prevent performance/accessibility/SEO regressions

**Gate 6: Manual Spot-Checks (Human Validation)**
- When: Before committing to trunk
- What: Review 10 random badges manually, visual regression test on 5 sample pages
- Validates: Content quality, visual correctness, UX consistency
- Action: Refine or reject if quality issues found
- Purpose: Final human quality assurance

**Gate 7: Staging Deployment (Pre-Production Validation)**
- When: Before production deployment
- What: Deploy to Firebase preview channel, manual smoke testing, full QA checklist
- Validates: Production-like environment behavior
- Action: Fix issues before promoting to production
- Purpose: Catch production-specific issues in safe environment

**Quality Gate Coverage Analysis:**

- AI quality risks: ✅ Covered by Gates 1 & 6 (subset testing, manual spot-checks)
- Format/structure risks: ✅ Covered by Gate 2 (validate-metadata)
- Build risks: ✅ Covered by Gates 3 & 4 (Hugo build, validate-hugo-build)
- Regression risks: ✅ Covered by Gate 5 (Lighthouse CI)
- Production risks: ✅ Covered by Gate 7 (staging deployment)
- Content quality risks: ✅ Covered by Gates 1 & 6 (human validation)

**All risk categories have quality gates. No coverage gaps.**

**Quality Strategy Rating: COMPREHENSIVE AND APPROPRIATE**

**Lighthouse CI Configuration (Added):**

```yaml
# .github/workflows/lighthouse-ci.yml [NEW FILE]
name: Lighthouse CI

on:
  pull_request:
  push:
    branches: [trunk]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
      
      - name: Build Hugo Site
        run: cd hugo && hugo --minify
      
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            http://localhost/
            http://localhost/merit-badges/archery/
            http://localhost/interests/arts-crafts/
            http://localhost/difficulty/3/
            http://localhost/badges/browse/
          configPath: './.lighthouserc.json'
          uploadArtifacts: true
          temporaryPublicStorage: true
```

```json
// .lighthouserc.json [NEW FILE]
{
  "ci": {
    "collect": {
      "staticDistDir": "./hugo/public",
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 1.0}],
        "categories:seo": ["error", {"minScore": 1.0}]
      }
    }
  }
}
```

**Purpose:** Automatically detect regressions in performance (90+), accessibility (100), and SEO (100) on every code change.

### Validation Issues Addressed

**All gaps and clarifications identified during validation have been resolved:**

1. ✅ Lighthouse CI added for automated regression detection
2. ✅ CLAUDE.md Phase 1 section specified for development documentation
3. ✅ Hugo permalinks clarified (default page bundle structure is correct)
4. ✅ Gemini rate limits documented (sequential execution stays under limits, fail-fast handles errors)
5. ✅ Shared TypeScript types location specified (scripts/types.ts)
6. ✅ Shared utilities location specified (scripts/utils/ with one-export-per-file)
7. ✅ interests.yaml creation method documented (manual creation with documented structure)
8. ✅ Global changelog template location specified (layouts/changelog/list.html with custom section)
9. ✅ Generated changelog storage decision made (committed source content, not ephemeral)
10. ✅ Hugo taxonomy configuration note added (disables defaults, MBU doesn't need tags/categories)
11. ✅ Testing structure clarified (validation scripts function as integration tests)
12. ✅ Interest category count finalized (10 interests, extensible later)
13. ✅ interest-tag clickability confirmed (must be clickable links per FR8)
14. ✅ Unit testing decision documented (no unit tests Phase 1, integration testing sufficient)

**No blocking issues. No important gaps remaining. Architecture is complete.**

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed (60 FRs, 27 NFRs catalogued)
- [x] Scale and complexity assessed (Medium brownfield enhancement)
- [x] Technical constraints identified (Hugo extended, annual cadence, static site, browser support)
- [x] Cross-cutting concerns mapped (9 concerns: data consistency, build pipeline, SEO, performance, accessibility, dual-audience UX, analytics, content accuracy, testing)

**✅ Architectural Decisions**
- [x] Critical decisions documented with rationale (11 decisions with rationale)
- [x] Technology stack fully specified (Hugo, Bun, TypeScript, Gemini, Firebase with versions)
- [x] Integration patterns defined (4 build-time integration points with data flow)
- [x] Performance considerations addressed (validated millisecond builds, sub-1s loads, per-page CSS)
- [x] Product pivot documented (skills → interests with rationale)

**✅ Implementation Patterns**
- [x] Naming conventions established (7 contexts: JSON, files, taxonomies, variables, interfaces, partials, SCSS)
- [x] Structure patterns defined (5 areas: scripts, partials, SCSS, data files, content organization)
- [x] Format patterns specified (4 formats: data.json schema, frontmatter structure, interests.yaml, error messages)
- [x] Communication patterns documented (file I/O, Hugo data access, template parameters, taxonomy system)
- [x] Process patterns comprehensive (6 patterns: sequential execution, subset testing, atomic updates, fail-fast, validation gates, implementation order dependencies)
- [x] Hugo-specific patterns (5 patterns: partials vs shortcodes, dict parameters, with blocks, data file access, explicit slugs)
- [x] TypeScript patterns (6 patterns: one export per file, type imports, no abbreviations, explicit returns, object parameters, env validation)
- [x] SCSS patterns (3 patterns: component loading via @use, CSS custom properties only, no imports in components)
- [x] Examples provided for all patterns (good examples + anti-patterns)

**✅ Project Structure**
- [x] Complete directory structure defined (37 new files, 288 modified files)
- [x] Component boundaries established (5 isolated components with clear interfaces)
- [x] Integration points mapped (scripts → file system, data files → templates, frontmatter → taxonomies, data.json → templates)
- [x] Requirements to structure mapping complete (all 60 FRs mapped to specific files and components)
- [x] File organization patterns documented (where everything goes with rationale)

**✅ Quality Gates**
- [x] Lighthouse CI configuration added (automated regression detection on every PR/commit)
- [x] Validation scripts defined (validate-metadata, validate-hugo-build)
- [x] Manual QA checklist documented (subset testing, spot-checks, staging deployment)
- [x] Development documentation added (CLAUDE.md Phase 1 section specified)
- [x] 7-stage quality gate strategy comprehensive (covers all risk categories)

**✅ Validation Complete**
- [x] Coherence validated (all decisions compatible, patterns consistent, structure aligned)
- [x] Requirements coverage verified (60/60 FRs supported, 27/27 NFRs addressed)
- [x] Implementation readiness confirmed (AI agents can start immediately)
- [x] All gaps identified and resolved (no critical or important gaps remaining)
- [x] Team consensus achieved (unanimous approval from all experts)

### Architecture Readiness Assessment

**Overall Status:** ✅ **READY FOR IMPLEMENTATION**

**Confidence Level:** HIGH (9.5/10)

**Team Consensus:** All experts (Architect, Developer, Quick Flow, Test Architect, Product Manager, UX Designer, Technical Writer) unanimously approve architecture as complete and implementation-ready.

**Rationale for High Confidence:**

1. **Brownfield Enhancement to Proven System**
   - Building on existing Hugo site that already works (low risk)
   - Millisecond build times already validated
   - Sub-1s page loads already proven in production
   - Additive changes only (no breaking modifications)
   - Easy rollback via Git if issues arise

2. **"Boring Technology" Wins**
   - Proven stack (Hugo + Bun + Firebase) already in production
   - Static site architecture eliminates operational complexity
   - No runtime backend, databases, or servers to maintain
   - Zero deployment costs beyond CDN hosting
   - No scaling concerns (CDN handles traffic automatically)

3. **Build-Time Intelligence Pattern**
   - All AI processing happens once per year (not runtime)
   - No runtime AI calls (fast page loads guaranteed)
   - Human-in-the-loop validation prevents bad data deployment
   - Authoritative sources (BSA document) eliminate heuristic detection errors
   - Manual review catches issues before production

4. **Interest-Based Taxonomy (Strong Product Decision)**
   - Matches scout mental model ("I like art" vs "I want leadership skills")
   - Better SEO alignment (higher search volume for concrete interest terms)
   - Simpler architecture (~15 interest pages vs ~40 skills pages)
   - More concrete categorization (easier for AI to classify accurately)
   - Validated through Party Mode product review

5. **Comprehensive Pattern Set Prevents Conflicts**
   - 15 patterns covering all AI agent decision points
   - Explicit slugs eliminate Hugo slugification ambiguity between agents
   - Atomic updates prevent data.json ↔ frontmatter desync
   - Fail-fast ensures all-or-nothing metadata generation (no partial states)
   - One export per file enforces clear single responsibility
   - Sequential execution prevents file corruption from concurrent writes

6. **Right-Sized Quality Gates**
   - 7-stage validation strategy covers all risk categories
   - Minimal validation (trust AI, validate format) appropriate for annual cadence
   - Subset testing before full rollout (3 badges → 143 badges) catches issues early
   - Manual spot-checks (10 random badges) validate content quality
   - Lighthouse CI automates regression detection
   - Staging deployment provides pre-production safety net
   - Annual cadence makes thorough manual review practical

7. **Complete Implementation Blueprint**
   - Every file location specified (37 new, 288 modified)
   - Every integration point mapped (4 build-time boundaries with data flow)
   - Every pattern documented (15 comprehensive patterns with examples)
   - Every requirement supported (100% FR + NFR coverage)
   - Implementation order dependencies clear (Hugo config → interests.yaml → meta descriptions → metadata generation)

**Key Architectural Strengths:**

1. **Zero Runtime Complexity** - All boundaries are build-time file I/O (no API servers, no databases, no state management)
2. **Proven Foundation** - Building on working Hugo site with validated performance
3. **Annual Cadence Simplifies** - Manual review practical, extensive automation unnecessary
4. **Authoritative Data Sources** - BSA documents eliminate heuristic detection uncertainty
5. **Hugo Native Features** - Taxonomy system requires zero custom code (Hugo handles automatically)
6. **Additive Architecture** - with blocks ensure backward compatibility, no breaking changes
7. **Pattern Completeness** - All potential AI agent conflicts explicitly resolved
8. **Quality Gate Coverage** - All risk categories have validation stages

**Areas for Future Enhancement (Post-Phase 1, Not Required Now):**

1. **Advanced Validation (If AI Quality Issues Emerge)**
   - Could add content quality validation rules
   - Could add unit tests for utility functions
   - Could add prompt versioning system
   - **Decision:** Add only if Phase 1 reveals quality issues

2. **Performance Optimization (If Page Weight Issues Emerge)**
   - Could further optimize badge images
   - Could implement advanced Hugo caching
   - Could add lazy loading for taxonomy pages with 50+ badges
   - **Decision:** Current architecture delivers sub-1s loads, optimize only if needed

3. **Automation Enhancements (If Cadence Changes)**
   - Could add automated metadata regeneration triggers
   - Could add more sophisticated CI/CD validation pipeline
   - Could add pre-commit hooks
   - **Decision:** Annual cadence makes current manual workflow appropriate

4. **Testing Expansion (If Multi-Developer Team)**
   - Could add unit tests for utilities
   - Could add integration tests for Hugo templates
   - Could add visual regression testing
   - **Decision:** Solo dev with annual cadence doesn't need extensive test suite

**None of these enhancements are needed for Phase 1 launch. Current architecture is appropriate for the use case and timeline.**

### Implementation Handoff

**AI Agent Guidelines for Phase 1 Implementation:**

When implementing Phase 1, all AI agents MUST:

**1. Follow architectural decisions exactly as documented**
- Use Google Gemini (gemini-pro) for all AI-powered metadata generation
- Use interest-based taxonomy (10 categories: Arts & Crafts, Technology, Nature & Outdoors, Sports & Fitness, Science, Building & Making, Animals & Wildlife, Community & Service, Business & Money, Performance & Entertainment)
- Extend data.json with metadata object (additive, non-destructive, backward compatible)
- Use local generation → manual review → commit → auto deploy workflow
- Fail fast on all errors with structured messages (no partial metadata states)

**2. Use implementation patterns consistently across all components**
- snake_case for JSON fields (difficulty, time_estimate, interests, location)
- kebab-case for file names (generate-difficulty.ts, difficulty-rating.html, difficulty-rating.scss)
- Explicit slugs for taxonomies in interests.yaml (arts-crafts) and frontmatter
- Title Case for display names in interests.yaml (Arts & Crafts)
- One export per file, type keyword for type-only imports, no abbreviations
- Component-based SCSS loading (page files import components via @use)
- CSS custom properties only in components (no @use imports for colors/spacing/typography)
- with blocks for backward compatibility in Hugo templates (wrap all metadata access)
- dict for Hugo partial parameters (multiple params via dict)
- Atomic updates (Promise.all for data.json + frontmatter writes together)
- Sequential script execution (&&, never parallel, file corruption risk)

**3. Respect project structure and boundaries**
- Place scripts in scripts/, partials in layouts/partials/, SCSS in assets/scss/components/
- Use scripts/types.ts for shared Phase 1 interfaces (BadgeMetadata, InterestDefinition, etc.)
- Use scripts/utils/ for shared utilities (one export per file: read-badge-data, update-frontmatter, format-requirements)
- Create taxonomy templates in layouts/{taxonomy}/list.html (Hugo convention)
- Create page-specific SCSS in assets/scss/pages/ that import needed components
- Place Hugo data files in hugo/data/ (interests.yaml)

**4. Refer to this document for all architectural questions**
- Naming conventions defined for all 7 contexts
- Data formats explicit with JSON schemas and YAML examples
- Hugo patterns documented with template code examples
- Error handling patterns with structured [script-name] format
- Validation rules clearly specified (minimal validation, trust AI)
- Integration points mapped with data flow diagrams

**5. Follow implementation order dependencies**
- Hugo taxonomy config must exist before metadata generation (hugo.toml first)
- interests.yaml must exist before generate-interests.ts runs (create data file first)
- Meta descriptions must be generated before metadata generation (run generate-meta-descriptions first)
- Shared code must exist before generation scripts (create types.ts and utils/ first)
- Test on 3 badges before running on all 143 (subset validation catches issues early)
- Validate metadata before committing (run validate-metadata after generation)
- Manual review via git diff before production deployment (spot-check 10 badges)

**First Implementation Priority - Phase 1 Kickoff:**

**Step 1: Foundation Setup (Day 1)**
```bash
# 1. Add Hugo taxonomy configuration
# Edit hugo/hugo.toml, add [taxonomies] section

# 2. Create interests.yaml structure manually
# Create hugo/data/interests.yaml with 10 interest definitions

# 3. Create shared types
# Create scripts/types.ts with BadgeMetadata, InterestDefinition interfaces

# 4. Create shared utils directory
mkdir scripts/utils
# Create read-badge-data.ts, update-frontmatter.ts, format-requirements.ts

# 5. Update package.json
# Add all Phase 1 script commands
```

**Step 2: Generate Meta Descriptions (Day 1)**
```bash
# Create and run meta description generator
# Creates scripts/generate-meta-descriptions.ts
# Run: bun run generate-meta-descriptions
# Populates interests.yaml meta_description fields
```

**Step 3: Build Metadata Generation Scripts (Day 2-5)**
```bash
# Create 4 generation scripts + 2 validation scripts
# - generate-difficulty.ts
# - generate-interests.ts
# - generate-location.ts
# - generate-changelog.ts
# - validate-metadata.ts
# - validate-hugo-build.ts
```

**Step 4: Subset Testing (Day 5-6)**
```bash
# Test on 3 badges
BADGE_SLUGS="archery,camping,first-aid" bun run generate-metadata

# Manual inspection
# Refine AI prompts
# Iterate until quality satisfactory
```

**Step 5: Hugo Templates & Components (Day 7-10)**
```bash
# Create 6 partials
# Create 7 Hugo templates
# Enhance 2 existing templates
# Create 6 SCSS components
# Create 3 SCSS page files
```

**Step 6: Full Rollout (Day 11-14)**
```bash
# Generate all metadata
bun run generate-metadata

# Validate
bun run validate-metadata

# Review
git diff
# Spot-check 10 random badges

# Commit
git commit -m "Add Phase 1 metadata (difficulty, interests, location, time)"
git push
```

**Step 7: Deployment (Day 15-20)**
```bash
# Add Lighthouse CI configuration
# Deploy to staging
# Manual QA
# Production deployment
```

**Reference Documents for Implementation:**
- **Architecture decisions:** `_bmad-output/planning-artifacts/architecture.md` (this document)
- **Product requirements:** `_bmad-output/planning-artifacts/prd.md`
- **UX specifications:** `_bmad-output/planning-artifacts/ux-design-specification.md`
- **Development patterns:** `CLAUDE.md` (Phase 1 section to be added)
- **TypeScript rules:** `.claude/rules/typescript.md`
- **Hugo patterns:** `.claude/rules/hugo.md`

### Architecture Readiness Summary

**Coherence:** ✅ All decisions compatible, patterns consistent, structure aligned (10/10)

**Coverage:** ✅ 100% FR coverage (60/60), 100% NFR coverage (27/27)

**Readiness:** ✅ HIGH - AI agents can start building immediately without clarification

**Quality Gates:** ✅ 7-stage comprehensive validation strategy covers all risk categories

**Documentation:** ✅ EXCELLENT - Clear, specific, unambiguous guidance for AI agents

**Team Consensus:** ✅ UNANIMOUS APPROVAL from all experts

**Gaps:** ✅ All critical and important gaps resolved, no blockers remaining

**Status:** ✅ **ARCHITECTURE COMPLETE AND IMPLEMENTATION-READY**

**Confidence Level:** HIGH (9.5/10)

**Final Team Assessment:** Ship it. AI agents can implement Phase 1 with this architecture without conflicts. The architecture is coherent, complete, and ready for immediate implementation.

### CLAUDE.md Phase 1 Documentation

**Add to CLAUDE.md:**

```markdown
## Phase 1: Metadata Generation & Taxonomy System

### Architecture

Phase 1 adds AI-powered metadata to enrich 143 existing badge pages:
- Difficulty ratings (1-5 scale)
- Time estimates (min/typical/max hours)
- Interest categorization (10 categories: Arts & Crafts, Technology, Nature & Outdoors, Sports & Fitness, Science, Building & Making, Animals & Wildlife, Community & Service, Business & Money, Performance & Entertainment)
- Location classification (indoor/outdoor/flexible + special locations)
- Requirement changelogs (from BSA change documents)

**Architecture decisions:** See `_bmad-output/planning-artifacts/architecture.md`

### Metadata Generation Workflow

**One-Time Phase 1 Setup (Requirements Already Current for 2026):**

```bash
# 1. Generate metadata for all badges (or subset for testing)
BADGE_SLUGS="archery,camping,first-aid" bun run generate-metadata  # Test on 3
bun run generate-metadata  # All 143 badges

# 2. Validate metadata integrity
bun run validate-metadata

# 3. Review changes
git diff
# Spot-check 10 random badges manually

# 4. Commit when satisfied
git commit -m "Add Phase 1 metadata (difficulty, interests, location, time)"
git push
```

**Annual Update Workflow (Future):**

When BSA publishes requirement changes:

```bash
# 1. Update requirements from BSA
bun run sync:badges

# 2. Regenerate metadata for changed badges
bun run generate-metadata

# 3. Validate + review + deploy
bun run validate-metadata
git diff
git commit -m "Update 2026 requirements and metadata"
git push
```

### Implementation Patterns

**Data Storage:**
- metadata object in data.json (snake_case fields: difficulty, time_estimate, interests, location)
- Taxonomy terms in frontmatter (explicit slugs: interests: ["arts-crafts", "technology"])
- Master interests in hugo/data/interests.yaml (slug, name, description, meta_description, icon)

**Error Handling:**
- Fail fast with structured messages: `[script-name] Context: Details`
- No partial metadata states (all 143 badges or manual intervention)

**Testing:**
- Subset first: `BADGE_SLUGS="archery,camping,first-aid" bun run generate-metadata`
- Then full rollout: `bun run generate-metadata`
- Validation: `bun run validate-metadata` (integration test)

**Quality Gates:**
- Lighthouse CI on every PR/commit (Performance 90+, Accessibility 100, SEO 100)
- validate-metadata before commit (format/structure check)
- Manual spot-checks (10 random badges for content quality)
- Staging deployment before production

**See architecture.md for complete patterns and conventions.**
```

### Final Architecture Statement

**Merit Badge University Phase 1 Architecture is COMPLETE.**

**What this architecture delivers:**
- ✅ 60 functional requirements fully supported
- ✅ 27 non-functional requirements fully addressed
- ✅ ~37 new files with clear purpose and location
- ✅ ~288 modified files with backward-compatible enhancements
- ✅ ~28 new taxonomy landing pages for SEO growth
- ✅ 15 comprehensive implementation patterns preventing AI agent conflicts
- ✅ 7-stage quality gate strategy covering all risk categories
- ✅ Complete documentation enabling immediate AI agent implementation

**AI agents can begin Phase 1 implementation immediately using this architecture document as their single source of truth.**

**Architecture workflow complete. Ready for implementation handoff.**

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2026-01-21
**Document Location:** `_bmad-output/planning-artifacts/architecture.md`

### Final Architecture Deliverables

**📋 Complete Architecture Document**

- All architectural decisions documented with specific versions and rationale
- Implementation patterns ensuring AI agent consistency (15 comprehensive patterns)
- Complete project structure with all files and directories (37 new, 288 modified)
- Requirements to architecture mapping (100% coverage: 60/60 FRs, 27/27 NFRs)
- Validation confirming coherence and completeness (unanimous team approval)

**🏗️ Implementation Ready Foundation**

- 11 architectural decisions made collaboratively
- 15 implementation patterns defined (naming, structure, format, Hugo, TypeScript, SCSS, process)
- 5 architectural components specified with clear boundaries
- 87 requirements fully supported (60 FRs + 27 NFRs = 100% coverage)

**📚 AI Agent Implementation Guide**

- Technology stack with verified versions (Hugo >= 0.129.0, Bun, TypeScript strict, Gemini gemini-pro, Firebase)
- Consistency rules that prevent implementation conflicts
- Project structure with clear boundaries (build-time only, no runtime)
- Integration patterns and communication standards (4 build-time integration points)
- Complete file manifest (where every file goes with naming conventions)

### Implementation Handoff

**For AI Agents:**

This architecture document is your complete guide for implementing Merit Badge University Phase 1. Follow all decisions, patterns, and structures exactly as documented.

**First Implementation Priority:**

**Phase 1 Kickoff - Foundation Setup:**

```bash
# Day 1: Foundation Setup
# 1. Add Hugo taxonomy configuration to hugo.toml
# 2. Manually create hugo/data/interests.yaml (10 interest definitions)
# 3. Create scripts/types.ts (shared Phase 1 interfaces)
# 4. Create scripts/utils/ directory (read-badge-data, update-frontmatter, format-requirements)
# 5. Update package.json with Phase 1 script commands
# 6. Create scripts/generate-meta-descriptions.ts
# 7. Run: bun run generate-meta-descriptions (populate interests.yaml)
```

**Development Sequence:**

1. **Foundation Setup** - Hugo config, interests.yaml, shared types/utils, package.json updates
2. **Metadata Generation Scripts** - Build 4 generation scripts + 2 validation scripts
3. **Subset Testing** - Test on 3 badges (archery, camping, first-aid), refine prompts
4. **Hugo Templates & Components** - Create 13 templates/partials + 9 SCSS files
5. **Full Metadata Rollout** - Generate all 143 badges, validate, review, commit
6. **Quality Gates** - Add Lighthouse CI, update CLAUDE.md, staging deployment
7. **Production Deployment** - Manual QA, merge to trunk, monitor analytics

### Quality Assurance Checklist

**✅ Architecture Coherence**

- [x] All decisions work together without conflicts (technology stack compatible)
- [x] Technology choices are compatible (Hugo + Bun + TypeScript + Gemini + Firebase proven)
- [x] Patterns support the architectural decisions (15 patterns align with decisions)
- [x] Structure aligns with all choices (37 files, 288 modifications mapped to requirements)

**✅ Requirements Coverage**

- [x] All functional requirements are supported (60/60 FRs = 100%)
- [x] All non-functional requirements are addressed (27/27 NFRs = 100%)
- [x] Cross-cutting concerns are handled (9 concerns mapped to components)
- [x] Integration points are defined (4 build-time boundaries with data flow)

**✅ Implementation Readiness**

- [x] Decisions are specific and actionable (versions, rationale, examples provided)
- [x] Patterns prevent agent conflicts (explicit slugs, atomic updates, fail-fast, sequential execution)
- [x] Structure is complete and unambiguous (complete directory tree with all files)
- [x] Examples are provided for clarity (good examples + anti-patterns for all 15 patterns)

### Project Success Factors

**🎯 Clear Decision Framework**

Every technology choice was made collaboratively with clear rationale, ensuring all stakeholders understand the architectural direction. Decisions validated through multiple Party Mode sessions with expert perspectives.

**🔧 Consistency Guarantee**

Implementation patterns and rules ensure that multiple AI agents will produce compatible, consistent code that works together seamlessly. 15 comprehensive patterns address all potential conflict points.

**📋 Complete Coverage**

All project requirements (60 FRs + 27 NFRs) are architecturally supported, with clear mapping from business needs to technical implementation. No gaps in requirement coverage.

**🏗️ Solid Foundation**

Brownfield enhancement to proven Hugo + Bun + Firebase stack already working in production. Build-time architecture eliminates operational complexity. Static site delivers sub-1s loads with zero runtime costs.

**🧪 Right-Sized Quality**

7-stage quality gate strategy covers all risk categories while being appropriate for annual update cadence. Lighthouse CI automates regression detection. Manual review validates AI content quality.

**🎨 Product-Aligned Architecture**

Interest-based taxonomy pivot matches scout mental model ("I like art" vs "I want leadership skills"). Better SEO alignment with actual search behavior. Dual-audience UX strategy (scouts + counselors) architecturally supported.

---

**Architecture Status:** ✅ READY FOR IMPLEMENTATION

**Next Phase:** Begin Phase 1 implementation using the architectural decisions and patterns documented herein.

**Document Maintenance:** Update this architecture when major technical decisions are made during implementation. Document architectural lessons learned post-Phase 1 launch.
