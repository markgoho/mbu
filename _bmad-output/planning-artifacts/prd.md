---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments:
  - '_bmad-output/analysis/brainstorming-session-2026-01-17.md'
  - 'CLAUDE.md'
workflowType: 'prd'
documentCounts:
  briefCount: 0
  researchCount: 0
  brainstormingCount: 1
  projectDocsCount: 1
classification:
  projectType: 'web_app'
  projectTypeDetail: 'Static Site Generator (Hugo) / Content Platform'
  domain: 'edtech'
  domainDetail: 'Educational Content Platform (not LMS) - Scouting America merit badge reference and discovery'
  complexity: 'medium'
  projectContext: 'brownfield'
  keyConsiderations:
    - 'COPPA awareness for youth users (ages 11-17)'
    - 'Content safety and accuracy (activities can be dangerous)'
    - 'BSA standards alignment (editorial transparency)'
    - 'Accessibility requirements (WCAG 2.1 AA for educational content)'
    - 'i18n required (Spanish language support is mandatory)'
    - 'SEO-first architecture (organic discovery critical)'
    - 'Dual audience: scouts (learning) + counselors (teaching)'
    - 'Monetization targets adults only (counselors/troop leadership)'
---

# Product Requirements Document - mbu

**Author:** Mark
**Date:** 2026-01-19

## Executive Summary

**Project:** Merit Badge University Phase 1 - Foundation Systems
**Timeline:** 4 weeks
**Type:** Brownfield enhancement to existing Hugo static site

**Overview:**

Merit Badge University (MBU) is an existing Hugo-based static site serving comprehensive merit badge information at merit-badge.university. Phase 1 adds four foundation systems that enrich the existing 143 badge pages with metadata, enabling taxonomy-based discovery and SEO growth.

**Phase 1 Scope:**
1. AI-generated difficulty ratings & time estimates (1-5 scale, hours per badge)
2. Skills tagging system (30-50 skills, Hugo taxonomy landing pages)
3. Indoor/outdoor location requirements (geography-neutral, must vs can)
4. Requirement changelog automation (weekly scraper, diff detection)
5. Taxonomy browser hub page (discovery mechanism for direct visitors)

**Architecture:** Pure Hugo taxonomy system with build-time metadata generation. Zero JavaScript filtering, zero runtime backend, CDN-hosted static pages. Metadata stored in dual format (data.json + frontmatter) for Hugo taxonomy integration.

**Primary Goal:** SEO traffic growth via 50+ new taxonomy landing pages targeting long-tail searches (e.g., "indoor merit badges", "leadership merit badges"). Establish baseline of 500-1,000 monthly organic visitors within 3 months.

**Secondary Goal:** Foundation for Phase 2-4 content generation and monetization features.

## Success Criteria

### User Success

**For Scouts (ages 11-17):**
- Scouts can discover badges by difficulty, location requirements, and skills via taxonomy pages
- Badge pages show time estimates and difficulty ratings
- Scouts find relevant badges faster than scrolling through 143 options

**For Merit Badge Counselors (adults):**
- Counselors see which requirements changed recently via changelog
- Time estimates help with lesson planning

### Business Success

**3-Month Success:**
- 50+ new landing pages indexed by Google
- 500-1,000 monthly organic visitors (establish baseline traffic)
- At least a few pages ranking on page 1 for long-tail searches

**6-Month Success:**
- 2,000+ monthly organic visitors
- Foundation validates SEO strategy is working

### Technical Success

**It Works:**
- All 4 metadata generation scripts run successfully on all 143 badges
- Hugo builds without errors
- New taxonomy landing pages render correctly
- Hugo taxonomies organize badges correctly

**It Ships:**
- Week 1: Difficulty ratings deployed
- Week 2: Skills tagging deployed
- Week 3: Location requirements tagging deployed
- Week 4: Changelog automation deployed

**If it breaks, fix it later** - iterate based on real user feedback, not hypothetical edge cases.

## Product Scope

### MVP - Phase 1 (4 Weeks - THIS PRD)

**IN SCOPE:**

1. **Badge Difficulty Ratings & Time Estimates**
   - AI-powered difficulty scoring (1-5 scale) for all 143 badges
   - Time estimates (min/max/typical hours) per badge
   - Display on badge pages with visual indicators
   - Filterable badge lists by difficulty and time

2. **Real-World Skills Tagging System**
   - Master skills taxonomy (30-50 skills: leadership, STEM, first aid, public speaking, etc.)
   - AI-assisted tagging: 5-10 skills per badge
   - Auto-generated skill landing pages (`/skills/leadership/`, `/skills/stem/`, etc.)
   - Hugo taxonomy-based skill discovery

3. **Indoor/Outdoor Location Requirements**
   - Location requirement schema: indoor_required, outdoor_required, either (flexible)
   - Special location identification: pool, shooting_range, wilderness, farm, water_body
   - Auto-generated location landing pages (`/badges/indoor-required/`, `/badges/outdoor-required/`, `/badges/flexible/`)
   - Hugo taxonomy-based location discovery
   - Geography-neutral (avoids seasonal climate variations)

4. **Requirement Changelog Automation**
   - Enhanced scraper with diff detection comparing new vs existing `data.json`
   - Per-badge changelog pages (`/merit-badges/camping/changelog/`)
   - Global changelog page (`/merit-badges/changelog/`)
   - "Last updated" indicators on badge pages with visual 🆕 for recent changes (90 days)
   - Weekly automated scraper runs via GitHub Actions

**EXPLICITLY OUT OF SCOPE (Phase 1):**
- Content generation (articles, guides, briefs) - this is Phase 2
- Video content or multimedia - Phase 4+
- Interactive tools/simulators - Phase 3+
- User accounts or progress tracking - future consideration
- Premium content or payment processing - Phase 4+
- Spanish i18n implementation - Phase 2 (required, but not Phase 1)

### Growth Features (Post-MVP - Phase 2-3)

**Phase 2: Multiplier Content**
- Common mistakes articles (AI-generated per badge)
- Badge vs badge comparison pages
- Badge & rank requirement overlap guides
- One-page badge briefs (freemium PDFs)
- Parent survival guides
- Visual requirement guides

**Phase 3: Discovery Tools**
- Life goal → badge mapping (career-first discovery)
- Recommendation quiz engine
- "In The News" RSS feeds per badge
- Badge of the Month program

### Vision (Future - Phase 4+)

**Premium Content & Multimedia:**
- Video badge introductions from SMEs
- AI-generated explainer videos
- Interactive visual explainers
- Summer camp week-long curriculum (lesson plans)
- Counselor's Toolkit premium downloads
- Spanish language support (full i18n)

## User Journeys

### Journey 1: Scout Discovers Site via SEO, Navigates Taxonomies

**User:** Alex, 13-year-old scout stuck at home looking for badges to do indoors

**Journey:**
1. **Discovery:** Googles "merit badges you can do indoors" on mobile
2. **Landing:** Lands on `/badges/indoor-required/` SEO landing page (ranks page 1)
3. **Exploration:** Sees 30+ indoor-capable badges listed with difficulty stars visible
4. **Visual Scanning:** Scans for easy badges, notices difficulty ratings on each card
5. **Navigation:** Clicks difficulty "⭐ Easy" tag on the page → navigates to `/badges/difficulty-1/`
6. **Selection:** Finds "Coin Collecting" on difficulty page → sees "Typical completion: 4 hours, Difficulty: 1/5"
7. **Decision:** Knows badge can be done at home AND is easy, bookmarks page
8. **Return:** Comes back directly to bookmarked page later (becomes returning visitor)

**Measurable Events:**
- Organic search landing on `/badges/indoor-required/` (Google Search Console)
- Taxonomy page navigation: indoor-required → difficulty-1 (Pirsch referral tracking)
- Badge page visit: `/merit-badges/coin-collecting/` (Pirsch)
- Time on page, scroll depth (Pirsch engagement metrics)
- Bookmark/return visit (indicates success)

**Value Delivered:** SEO brings discovery, clear indoor/outdoor requirements eliminate ambiguity, taxonomy navigation delivers multi-attribute discovery, time estimates enable decision-making.

### Journey 2: Counselor Finds Site via Skill Search, Plans Class

**User:** Sarah, merit badge counselor planning a weekend MBU event

**Journey:**
1. **Discovery:** Googles "leadership merit badges" for teaching ideas
2. **Landing:** Lands on `/skills/leadership/` landing page (ranks page 1)
3. **Exploration:** Sees 6 badges tagged with "leadership" skill, with time estimates visible
4. **Analysis:** Scans time estimates: "Communications: 8-10 hours typical, Difficulty: 3/5"
5. **Planning:** Realizes 2-day weekend = ~12-14 teaching hours → picks 1 longer badge
6. **Selection:** Clicks "Communications" badge → reviews requirements + time breakdown
7. **Decision:** Selects Communications to teach, bookmarks badge page
8. **Return:** Returns directly via bookmark when planning next MBU event (organic brand search or direct)

**Measurable Events:**
- Organic search landing on `/skills/leadership/` (Google Search Console)
- Traffic source: 60%+ organic search (validates SEO working) (Pirsch traffic sources)
- Badge page visits from skill landing page (Pirsch referral tracking)
- Returning visitor flag (indicates bookmark/repeat usage) (Pirsch)
- Time on page: 2+ minutes (indicates deep engagement) (Pirsch)

**Value Delivered:** SEO enables discovery of skill-organized content, time estimates enable realistic planning.

**UX Requirements:**
- Skill tags on badge pages are clickable (link to skill landing pages)
- Time estimates visible on badge list pages (not just detail pages)
- Badge lists on skill pages show difficulty + time at a glance

### Journey 3: Returning Counselor Checks Requirement Updates

**User:** Mike, returning counselor who taught Camping merit badge last year

**Journey:**
1. **Return:** Directly navigates to Merit Badge University (bookmarked from previous year)
2. **Navigation:** Goes to Camping badge page
3. **Discovery:** Sees "🆕 Requirements updated 45 days ago" indicator
4. **Investigation:** Clicks indicator → views `/merit-badges/camping/changelog/`
5. **Review:** Sees changelog: "Requirement 9a: 'hike' changed to 'trek'"
6. **Action:** Updates lesson plan to reflect wording change
7. **Confidence:** Teaches accurate, current requirements

**Measurable Events:**
- Traffic source: Direct or organic brand search (returning user) (Pirsch)
- Badge page visit: `/merit-badges/camping/`
- Changelog click: Click on 🆕 indicator (Pirsch event tracking)
- Changelog page visit: `/merit-badges/camping/changelog/` (Pirsch)
- Changelog engagement: 5%+ of badge page traffic clicks changelog

**Value Delivered:** Automated change detection keeps counselors current without manual BSA.org checking.

**UX Requirements:**
- Visual 🆕 indicator prominent on badge page (not buried in footer)
- Changelog accessible from badge page navigation/breadcrumb
- Before/after diff clearly displayed in changelog

### Journey Requirements Summary

These Phase 1 journeys reveal the following capability requirements:

**SEO & Discovery (Critical for Cold Start):**
- Skill landing pages optimized for "[skill] merit badges" searches
- Location landing pages optimized for "indoor merit badges," "outdoor merit badges" searches
- Special location pages: "merit badges that require pool," etc.
- Structured data markup (Schema.org) on all landing pages
- SEO-optimized titles, meta descriptions, H1s
- Google Search Console integration for tracking impressions/clicks

**Location Requirements Schema (Simplified from Seasons):**
- `setting`: "indoor_required" | "outdoor_required" | "either"
- `special_locations`: ["pool", "shooting_range", "wilderness", "farm", "water_body"]
- Clear distinction between MUST vs CAN do indoors/outdoors
- Geography-neutral (avoids "winter in Florida" problem)

**Landing Pages Created:**
- `/badges/indoor-required/` - Merit badges that MUST be done indoors
- `/badges/outdoor-required/` - Merit badges that MUST be done outdoors
- `/badges/flexible/` - Merit badges that can be done either location
- `/badges/requires-pool/`, `/badges/requires-shooting-range/`, etc.

**Taxonomy Navigation:**
- Hugo-generated taxonomy landing pages for location, difficulty, and skills
- Clickable taxonomy tags on badge cards (navigate between taxonomy pages)
- Mobile-optimized taxonomy page layouts
- Clear visual indicators on badge cards for all metadata attributes

**Metadata Display:**
- Difficulty ratings visible on badge list pages AND detail pages
- Time estimates visible on list pages (not just detail)
- Skills tags clickable (link to skill landing pages)
- Location requirements clearly labeled (Indoor Required, Outdoor Required, Flexible)
- Special location indicators (pool, range, wilderness icons/badges)

**Changelog:**
- Visual 🆕 indicator for recent updates (90-day window)
- Per-badge changelog pages with before/after diff
- Global changelog page (`/merit-badges/changelog/`)
- Accessible from badge page navigation

**Analytics & Measurement:**
- Pirsch tracking for taxonomy browser and landing page visits
- Google Search Console tracking for SEO landing pages
- Pirsch referral tracking (which taxonomy page → which badge page)
- Pirsch returning visitor identification
- Pirsch engagement metrics: time on page, scroll depth

## Web Application Specific Requirements

### Project-Type Overview

Merit Badge University Phase 1 is a **Static Site Generator (SSG)** web application built with Hugo, optimized for SEO discovery and organic traffic growth. The architecture prioritizes build-time rendering and Hugo's native taxonomy system, avoiding unnecessary JavaScript complexity while delivering fast, accessible, SEO-optimized pages.

### Browser Support Matrix

**Supported Browsers:**
- Chrome/Chromium (last 2 versions)
- Edge (last 2 versions)
- Safari (last 2 versions, including iOS Safari)

**Explicitly NOT Supported:**
- Firefox (declining market share, not worth the testing overhead)
- Internet Explorer (deprecated)
- Legacy mobile browsers

**Rationale:** Focus testing and optimization efforts on 95%+ of actual user traffic. Scouts primarily use Chrome on school Chromebooks and Safari on iOS devices.

### Responsive Design & Performance

**Mobile-First Design:**
- Badge lists readable on mobile (320px+ viewports)
- Touch-friendly badge cards and navigation (44x44px minimum tap targets)
- Readable text without zooming (16px base font size minimum)
- Taxonomy navigation accessible on mobile

**Performance Targets:**
- Lighthouse scores: 90+ Performance, 100 Accessibility, 100 SEO
- First Contentful Paint (FCP): < 1.5s
- Time to Interactive (TTI): < 3.5s
- Total page weight: < 500KB (HTML + CSS + fonts)
- Hugo build time: < 2 minutes for full site (143 badges + 50+ landing pages)

**Technical Constraints:**
- Static assets served via Firebase Hosting CDN
- No runtime server required (pure JAMstack)
- SCSS compiled to CSS at build time (Dart Sass)

### Filter Implementation Strategy: Pure Hugo Taxonomies

**Phase 1 Approach - Hugo-Native Only:**

Hugo automatically generates taxonomy landing pages for each metadata type:
- `/badges/indoor-required/` - All badges that must be done indoors
- `/badges/outdoor-required/` - All badges that must be done outdoors
- `/badges/flexible/` - All badges that can be done either location
- `/skills/leadership/` - All badges tagged with leadership skill
- `/skills/stem/` - All badges tagged with STEM skill
- `/badges/difficulty-1/` - All difficulty 1 badges
- `/badges/requires-pool/` - All badges requiring pool access

**Taxonomy Browser Page - Critical Discovery Mechanism:**

Create `/badges/browse/` as the taxonomy hub/directory for users who don't arrive via Google search:

**Purpose:**
- Provides organized directory of ways to explore badges
- Makes taxonomy system discoverable to direct visitors
- Acts as alternative to overwhelming 143-badge list

**Structure:**
```
Merit Badge Browser

Find Badges by What Matters to You:

📚 By Skill Area
  Leadership • STEM • Outdoor Skills • Communication • Arts & Crafts
  [View all 30-50 skills →]

📍 By Location
  🏠 Indoor Required • 🏕️ Outdoor Required • ↔️ Flexible
  [Special locations: Pool, Range, Wilderness →]

⭐ By Difficulty
  ⭐ Easy (1-2) • ⭐⭐ Moderate (3) • ⭐⭐⭐ Challenging (4-5)

🕐 By Time Commitment
  Quick (< 5 hours) • Weekend (5-10 hours) • Long-term (10+ hours)
```

**Visual Design:**
- Directory metaphor (not filter interface)
- Clear visual hierarchy with icons and grouping
- Prominent whitespace between sections
- Mobile-optimized layout
- Large, touch-friendly cards (not text links)
- Icons + labels (not icon-only)
- 2-column grid on mobile, 4-column on desktop

**Navigation Integration:**
- Link from homepage navigation ("Browse Badges")
- Link from badge list pages ("Filter by...")
- Breadcrumb navigation on taxonomy pages back to browser

**Multi-Taxonomy Discovery:**
- Users navigate between taxonomy pages by clicking tags/links
- Badge cards display all metadata inline for visual scanning
- Visual indicators help users identify relevant badges:
  - Difficulty: Star rating (⭐⭐⭐)
  - Location: Icons (🏠 Indoor, 🏕️ Outdoor, ↔️ Flexible)
  - Time: "4-6 hours typical"
  - Skills: Clickable skill badges

**Hugo Configuration:**
- Define taxonomies in `hugo.toml`: `skills`, `difficulty`, `location_setting`, `special_locations`
- Frontmatter in badge `_index.md` files contains taxonomy terms
- Bun scripts update both `data.json` AND frontmatter when generating metadata
- Hugo generates taxonomy pages automatically at build time
- Zero JavaScript required for core filtering functionality

**Data Architecture (Dual Storage):**
- `data.json` stores detailed requirements structure (for rendering)
- `_index.md` frontmatter stores taxonomy metadata (for Hugo taxonomy system)
- Bun scripts update BOTH files to maintain consistency

**Advantages:**
- Works without JavaScript (accessibility, performance)
- Every taxonomy page is SEO-indexed by Google
- Zero maintenance burden (Hugo handles it)
- Fast implementation (5 minutes of Hugo config + 1 page design)
- Discoverable for both SEO and direct traffic

**Phase 2 Consideration:**
Add client-side JavaScript filtering if analytics (after 3 months) show users need multi-filter combinations. Current approach delivers 80% of value with 20% of effort.

### SEO Strategy

**All In Scope for Phase 1:**

**Structured Data (Schema.org):**
- Implement `ItemList` schema on all taxonomy landing pages
- Implement `Article` or `HowTo` schema on individual badge pages
- JSON-LD format embedded in `<head>`

**Social Sharing (OpenGraph):**
- og:title, og:description, og:image, og:url on all pages
- Twitter Card meta tags for enhanced Twitter sharing
- Dynamic OG images per badge (optional: generate programmatically)

**Sitemap & Discovery:**
- Hugo automatic sitemap generation for all 50+ new landing pages
- Submit sitemap to Google Search Console
- robots.txt allows all crawling (no restrictions)

**On-Page SEO:**
- H1 tags with target keywords on all landing pages
- Meta descriptions (150-160 chars) for all pages
- Descriptive URLs (kebab-case, keyword-rich)
- Internal linking between related badges and skills

**Manual Effort Required:**
- Writing compelling meta descriptions for 50+ new pages
- Creating Schema.org markup templates
- OpenGraph image generation (if programmatic approach used)

### Accessibility Requirements

**WCAG 2.1 AA Compliance - ALL Pages**

**Navigation & Interaction:**
- Keyboard navigation: Tab through all links and interactive elements
- Focus indicators: Visible outline on focused elements (3px minimum, high contrast)
- Skip links: "Skip to main content" for keyboard users
- Semantic HTML: Proper heading hierarchy (H1 → H2 → H3)

**Visual Design:**
- Color contrast ratio: 4.5:1 minimum for text, 3:1 for UI components
- Difficulty ratings: Not color-only (use stars + text + color)
- Location indicators: Icons + text labels (not icon-only)

**Content Structure:**
- Alt text: All images and icons have descriptive alt attributes
- ARIA labels: Supplemental labels where needed for screen readers
- Form labels: All interactive elements properly labeled

**Testing:**
- Lighthouse accessibility audit: 100 score required
- Manual testing with screen reader (VoiceOver on macOS/iOS)
- Keyboard-only navigation testing (no mouse)

### Implementation Considerations

**Build-Time Architecture:**
- All metadata generation scripts run BEFORE Hugo build
- Scripts update `data.json` files AND `_index.md` frontmatter in place
- Hugo reads updated frontmatter for taxonomies, JSON for requirements rendering
- Deploy via GitHub Actions (build → deploy to Firebase Hosting)

**Data Flow:**
```
1. Bun scripts generate metadata (difficulty, skills, location)
   → Update data.json files
   → Update _index.md frontmatter with taxonomy terms

2. Hugo build reads frontmatter → Generates taxonomy pages automatically
   Hugo reads data.json → Renders requirements on badge pages

3. GitHub Actions deploys to Firebase Hosting

4. CDN serves pre-rendered pages globally
```

**GitHub Actions Workflow Order (Critical):**
```yaml
- run: bun run generate-metadata  # First: Generate all metadata
- run: hugo --minify             # Second: Build site with updated data
- run: firebase deploy           # Third: Deploy to hosting
```

**No Real-Time Features:**
- All updates happen at build time
- Weekly scraper runs via GitHub Actions cron
- No websockets, no live data, no server-side rendering

**Static Site Advantages:**
- Zero runtime costs (CDN hosting only)
- Perfect Lighthouse scores achievable
- Scales infinitely (CDN handles traffic)
- No security vulnerabilities (no server to exploit)
- Works without JavaScript (progressive enhancement)

## Risk Analysis & Mitigation

### Technical Risks

**Risk 1: AI-Generated Metadata Quality**
- **Description:** Difficulty ratings and skills tags generated by AI may be inaccurate or inconsistent
- **Impact:** Users get misleading information, lose trust in the site
- **Likelihood:** Medium
- **Mitigation:**
  - Spot-check 10-15 badges after generation
  - Use consistent prompt templates
  - Manual override capability in frontmatter if AI gets it wrong
  - Iterate on prompts if quality is poor
- **Contingency:** If AI quality is bad, manually tag top 20-30 most popular badges first, iterate on AI for the rest

**Risk 2: Hugo Build Time Degradation**
- **Description:** Adding 50+ taxonomy pages + metadata could slow Hugo builds beyond 2 minutes
- **Impact:** Slower developer iteration, longer deployment times
- **Likelihood:** Low
- **Mitigation:**
  - Monitor build times in CI
  - Profile Hugo build if it slows down
  - Use Hugo's `--gc` flag for garbage collection
- **Contingency:** If builds are slow, generate fewer taxonomy pages initially (just skills + location, defer time-based taxonomies)

**Risk 3: Frontmatter + JSON Dual Storage Sync Issues**
- **Description:** Bun scripts fail to update both files consistently, causing taxonomy pages to show wrong badges
- **Impact:** Broken taxonomy pages, SEO confusion
- **Likelihood:** Medium
- **Mitigation:**
  - Write atomic update function (update both or neither)
  - Add validation script that checks frontmatter matches JSON
  - Run validation in CI before Hugo build
- **Contingency:** If sync breaks, fall back to JSON-only, generate taxonomy pages via template logic (more complex but works)

### Market Risks

**Risk 4: SEO Takes Longer Than 3 Months**
- **Description:** Taxonomy pages don't rank on page 1 within 3 months, no traffic growth
- **Impact:** Phase 1 success metrics not met, no validation of strategy
- **Likelihood:** Medium-High
- **Mitigation:**
  - Submit sitemap to Google Search Console immediately
  - Build internal links between taxonomy pages and badge pages
  - Write compelling meta descriptions (not just auto-generated)
  - Monitor Google Search Console impressions (leading indicator before clicks)
- **Contingency:** If SEO is slow, pivot to social media promotion (Reddit r/BSA, Facebook Scouting groups) to drive initial traffic and validate taxonomy usefulness

**Risk 5: Taxonomy Browser UX Doesn't Resonate**
- **Description:** Users land on `/badges/browse/` and don't understand how to use it, bounce
- **Impact:** Direct traffic doesn't convert, only SEO traffic works
- **Likelihood:** Low
- **Mitigation:**
  - Test with 2-3 scouts/counselors before launch
  - Add clear explanatory text: "Find badges by what matters to you"
  - Use familiar patterns (icons, labels, visual hierarchy)
- **Contingency:** If UX fails, simplify to text links or alphabetical badge list, iterate based on feedback

### Resource Risks

**Risk 6: Underestimating Manual Effort**
- **Description:** Writing 50+ meta descriptions, Schema.org templates, testing takes longer than expected
- **Impact:** 4-week timeline slips to 5-6 weeks
- **Likelihood:** Medium
- **Mitigation:**
  - Prioritize: Do top 20 most important pages first (skills, location landing pages)
  - Use AI to draft meta descriptions, human review/edit (faster than writing from scratch)
  - Template Schema.org once, apply to all pages
- **Contingency:** If running behind, ship core functionality (metadata generation) first, add SEO polish (Schema.org, meta descriptions) in Week 5 post-launch

**Risk 7: Scope Creep During Implementation**
- **Description:** "While I'm here, let me add..." syndrome - adding features not in Phase 1 scope
- **Impact:** 4-week timeline blows out, Phase 1 never ships
- **Likelihood:** Medium
- **Mitigation:**
  - Explicit out-of-scope list documented
  - "Get it done fast" philosophy reinforced
  - Weekly check-in: Are we building Phase 1 or Phase 2?
- **Contingency:** If scope creep detected, cut features to hit 4-week deadline. Ship taxonomy browser page OR Schema.org markup, not both if necessary

**Risk 8: Single Developer Bus Factor**
- **Description:** If developer becomes unavailable, project stalls completely
- **Impact:** Timeline slips, no backup
- **Likelihood:** Low but impact is high
- **Mitigation:**
  - Document implementation approach in PRD
  - Keep scope small enough to finish in 4 weeks with buffer
  - Ship iteratively (Week 1 deliverable, Week 2 deliverable, etc.)
- **Contingency:** If a week is lost, cut features ruthlessly - ship difficulty ratings + taxonomy browser only, defer skills tagging and changelog to Phase 1.5

### Risk Priority Summary

**Highest Priority Risks to Watch:**
1. AI metadata quality - Spot-check early, iterate on prompts
2. SEO timeline - Track impressions in Google Search Console weekly
3. Scope creep - Stick to the explicit out-of-scope list

**Overall Risk Level: LOW-MEDIUM**

Building on proven tech (Hugo, Bun, static sites) with focused scope and realistic timelines. Biggest risks are execution (AI quality, manual effort underestimation) and external (SEO timing), not architectural.

## Functional Requirements

### Content Discovery & Navigation

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

### Badge Information Display

- FR11: Scouts can view detailed merit badge requirements text on badge pages
- FR12: Scouts can view merit badge title, description, and BSA official URL
- FR13: Scouts can view difficulty ratings (1-5 scale) for each merit badge
- FR14: Scouts can view time estimates (min/typical/max hours) for each merit badge
- FR15: Scouts can view all assigned skills for each merit badge
- FR16: Scouts can view location requirements (indoor/outdoor/flexible) for each merit badge
- FR17: Scouts can view special location requirements (pool, range, wilderness, farm) if applicable
- FR18: Scouts can view multiple badges in list format with summary information (difficulty, time, location)
- FR19: Scouts can view difficulty and time metadata on badge list pages (not just detail pages)

### Requirement Change Tracking

- FR20: Counselors can view visual indicators when badge requirements have been updated recently (within 90 days)
- FR21: Counselors can access per-badge changelog pages showing requirement modifications over time
- FR22: Counselors can access a global changelog page showing all recent requirement changes across all badges
- FR23: Counselors can view before/after comparison for requirement text changes
- FR24: Counselors can see "last updated" dates on badge pages

### Metadata Generation (System)

- FR25: System can generate difficulty ratings (1-5 scale) for all 143 merit badges
- FR26: System can generate time estimates (min/typical/max hours) for all 143 merit badges
- FR27: System can generate skills tags (5-10 per badge) from master taxonomy for all 143 merit badges
- FR28: System can generate location requirement classifications (indoor/outdoor/flexible) for all 143 merit badges
- FR29: System can identify special location requirements (pool, range, wilderness, farm) for all 143 merit badges
- FR30: System can store metadata in format compatible with Hugo taxonomy generation
- FR31: System can detect requirement changes by comparing newly scraped data to existing stored data
- FR32: System can generate changelog entries when requirement modifications are detected
- FR33: System can scrape merit badge requirements from BSA official website

### Taxonomy & Landing Page Generation (System)

- FR34: System can generate dedicated landing pages for each skill taxonomy term (30-50 pages)
- FR35: System can generate dedicated landing pages for each difficulty level (5 pages)
- FR36: System can generate dedicated landing pages for each location requirement type (3 pages: indoor/outdoor/flexible)
- FR37: System can generate dedicated landing pages for each special location requirement (pool, range, wilderness, farm)
- FR38: System can organize badges on taxonomy landing pages by relevance to that taxonomy term
- FR39: System can generate the centralized taxonomy browser hub page

### SEO & Discoverability (System)

- FR40: System can generate structured data markup for all taxonomy landing pages
- FR41: System can generate structured data markup for individual badge pages
- FR42: System can generate metadata for social media sharing (title, description, image) for all pages
- FR43: System can generate sitemap in format compatible with search engines
- FR44: System can generate SEO-optimized meta descriptions for taxonomy landing pages
- FR45: System can generate SEO-optimized H1 tags with target keywords for taxonomy pages
- FR46: System can generate internal links between badge pages and relevant taxonomy pages

### Analytics & Measurement (System)

- FR47: System can track page visits for taxonomy browser, taxonomy landing pages, and badge pages
- FR48: System can track referral sources for badge page visits (which taxonomy page led to which badge page)
- FR49: System can track returning visitor identification
- FR50: System can track engagement metrics (time on page, scroll depth)
- FR51: System can provide sitemap for submission to search engine tools

### Accessibility

- FR52: All pages can be navigated using keyboard-only input (Tab key navigation)
- FR53: All interactive elements can display visible focus indicators
- FR54: All pages can include skip navigation links for keyboard users
- FR55: All pages can use semantic HTML with proper heading hierarchy
- FR56: All text can meet WCAG 2.1 AA color contrast requirements (4.5:1 for text, 3:1 for UI components)
- FR57: All difficulty ratings can use multiple indicators (stars + text + color, not color-only)
- FR58: All location indicators can use icons + text labels (not icon-only)
- FR59: All images and icons can include descriptive alt text
- FR60: All pages can achieve Lighthouse accessibility score of 100

### Explicitly OUT of Scope (Phase 1)

- ❌ Search functionality (keyword search across badges) - Phase 2
- ❌ Client-side JavaScript multi-filter combinations - Phase 2 (if analytics show user need)
- ❌ Badge comparison pages - Phase 2
- ❌ User accounts or personalization - Future
- ❌ Badge completion tracking - Future (Scoutbook handles this)
- ❌ Spanish language i18n - Phase 2

## Non-Functional Requirements

### Performance

- NFR1: Page load performance - First Contentful Paint (FCP) must be < 1.5 seconds
- NFR2: Page interactivity - Time to Interactive (TTI) must be < 3.5 seconds
- NFR3: Page weight - Total page weight must be < 500KB (HTML + CSS + fonts)
- NFR4: Lighthouse performance - All pages must achieve Lighthouse Performance score of 90+
- NFR5: Build time - Hugo build for complete site (143 badges + 50+ taxonomy pages) must complete in < 2 minutes
- NFR6: Mobile performance - Performance targets must be met on mobile devices (not just desktop)

### Accessibility

- NFR7: WCAG 2.1 AA compliance - All pages must meet WCAG 2.1 Level AA standards
- NFR8: Lighthouse accessibility - All pages must achieve Lighthouse Accessibility score of 100
- NFR9: Keyboard navigation - All interactive elements must be accessible via keyboard-only input
- NFR10: Screen reader compatibility - All content must be navigable and understandable using screen readers (VoiceOver, NVDA)
- NFR11: Color contrast - All text must meet 4.5:1 contrast ratio, all UI components must meet 3:1 contrast ratio
- NFR12: Non-color indicators - All information conveyed by color must also be conveyed by text or icons

### Content Quality & Accuracy

- NFR13: BSA requirement accuracy - All merit badge requirements must match BSA official sources exactly
- NFR14: Metadata quality - AI-generated difficulty ratings must achieve 90%+ accuracy when validated through spot-checks
- NFR15: Changelog accuracy - Requirement change detection must identify actual changes with minimal false positives
- NFR16: Content freshness - Badge requirements must be updated weekly via automated scraper

### Browser Compatibility

- NFR17: Browser support - Site must function correctly on Chrome, Edge, and Safari (last 2 versions)
- NFR18: Mobile browser support - Site must function correctly on iOS Safari and Chrome on Android
- NFR19: Progressive enhancement - Core functionality must work without JavaScript

### SEO Performance

- NFR20: Lighthouse SEO - All pages must achieve Lighthouse SEO score of 100
- NFR21: Structured data validation - All Schema.org markup must validate without errors
- NFR22: Sitemap completeness - Sitemap must include all taxonomy and badge pages

### Data Validation & Quality Gates

- NFR23: Schema validation - All generated metadata must validate against defined schema before Hugo build
- NFR24: Build failure protection - Invalid metadata must cause build failure (fail-fast principle)

### Deployment & Automation

- NFR25: Automated deployment - Deployment must be automated via CI/CD (GitHub Actions)
- NFR26: Build failure protection - Failed builds must not deploy to production
- NFR27: Deployment performance - Deployment must complete within 5 minutes of commit to trunk branch

### Categories Intentionally Excluded (Not Relevant for Phase 1)

- **Security:** No user data collection, no authentication, static site has minimal attack surface
- **Integration:** Self-contained system, no external integrations
- **Disaster Recovery:** Firebase CDN provides built-in redundancy and availability
- **Compliance:** COPPA awareness noted but no technical requirements for Phase 1 (no user data collection)
