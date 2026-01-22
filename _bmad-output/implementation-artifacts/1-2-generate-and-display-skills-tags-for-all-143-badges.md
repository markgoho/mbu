# Story 1.2: Generate and Display Skills Tags for All 143 Badges

Status: ready-for-dev

## Story

As a scout,
I want to see which skills each badge develops (leadership, STEM, outdoor skills, etc.),
So that I can find badges that align with my interests and goals.

## Acceptance Criteria

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

## Tasks / Subtasks

- [ ] Task 1: Create interests.yaml master taxonomy file (AC: Master taxonomy defined)
  - [ ] Create `hugo/data/interests.yaml` per ARCH-6, ARCH-13
  - [ ] Define ~30-50 skill categories with explicit slugs (not auto-generated)
  - [ ] Include fields: slug (explicit, kebab-case), name (display), description, icon (emoji per UX-6)
  - [ ] Use interest-based taxonomy (not abstract skills) per Architecture Decision
  - [ ] Examples: arts-crafts, technology, nature-outdoors, sports-fitness, science, building-making, animals-wildlife, community-service, business-money, performance
  - [ ] Validate informally with 3-5 scouts/counselors if possible (optional)

- [ ] Task 2: Generate AI meta descriptions for interests (AC: SEO descriptions populated)
  - [ ] Create `scripts/generate-meta-descriptions.ts` per ARCH-11 (one-time setup)
  - [ ] Read interests from interests.yaml
  - [ ] Use Gemini API to generate compelling 150-160 character meta descriptions per SEO-1
  - [ ] Prompt: "Write compelling meta description for page listing all [interest] merit badges for scouts ages 11-17"
  - [ ] Update interests.yaml with meta_description field
  - [ ] Validate GEMINI_API_KEY at startup

- [ ] Task 3: Create skills generation script (AC: Script generates valid skills arrays)
  - [ ] Create `scripts/generate-skills.ts` per ARCH-9
  - [ ] Validate GEMINI_API_KEY environment variable at startup
  - [ ] Load master interests list from interests.yaml (valid skill options)
  - [ ] Read all 143 badges from existing data.json files
  - [ ] Use Gemini API to categorize each badge into 5-10 skills from master list
  - [ ] AI prompt must include master list as valid options (no arbitrary skills)
  - [ ] Fail fast on API errors (do not continue with partial data)
  - [ ] Update data.json with metadata.skills array (extend existing structure per ARCH-7)
  - [ ] Update _index.md frontmatter with skills: ["slug1", "slug2"] array per ARCH-8
  - [ ] Use atomic update pattern (update both files or neither)
  - [ ] Add BADGE_SLUGS environment variable support for subset testing
  - [ ] Format error messages with `[generate-skills]` prefix per ARCH-15

- [ ] Task 4: Create skill tag Hugo partial component (AC: Component displays clickable skill pills)
  - [ ] Create `hugo/layouts/partials/skill-tag.html` per ARCH-13
  - [ ] Accept skill slug parameter via dict pattern per ARCH-14
  - [ ] Map slug to display name from interests.yaml per ARCH-14 pattern
  - [ ] Display as clickable pill/badge per UX-18
  - [ ] Link to skill taxonomy page (e.g., /skills/leadership/)
  - [ ] Use `with` block for backward compatibility if metadata missing per ARCH-14
  - [ ] Will be made clickable in Story 3.4 (create as clickable now for forward compatibility)

- [ ] Task 5: Create skill tag SCSS component (AC: Component styled as pills with design tokens)
  - [ ] Create `hugo/assets/scss/components/skill-tag.scss` per ARCH-13
  - [ ] Style as pill/badge format per UX-18 (rounded, padded, inline-block)
  - [ ] Use CSS custom properties (var(--space-*, --olive-*, --tan-*)) per ARCH-13
  - [ ] Do NOT import colors/spacing/typography (use CSS custom properties only)
  - [ ] Default state: Olive background with tan text per UX-7
  - [ ] Hover state: Darkens to --olive-600 per UX-7
  - [ ] Focus state: High-contrast outline for keyboard accessibility per UX-7
  - [ ] Ensure mobile-responsive design per UX-14

- [ ] Task 6: Integrate skill tags into badge detail page template (AC: Skills display on badge pages)
  - [ ] Update `hugo/layouts/merit-badges/single.html`
  - [ ] Add skill tags section using `with` block per ARCH-14
  - [ ] Iterate over metadata.skills array
  - [ ] Call skill-tag partial for each skill using dict pattern
  - [ ] Display prominently near difficulty rating per FR15
  - [ ] Ensure backward compatibility with `with` blocks per ARCH-1

- [ ] Task 7: Integrate skill tags into badge list/card template (AC: Skills visible on list pages)
  - [ ] Update badge card partial (likely `hugo/layouts/partials/badge-card.html`)
  - [ ] Add skill tags using `with` block per ARCH-14
  - [ ] Display 3-5 most relevant skills (not all 10) for space efficiency
  - [ ] Ensure skills visible without hovering per FR19
  - [ ] Test responsive display on mobile per UX-14

- [ ] Task 8: Configure Hugo taxonomy for skills (AC: Taxonomy pages generated)
  - [ ] Update `hugo/hugo.toml` with taxonomy definition per ARCH-5
  - [ ] Add: `skill = "skills"` to [taxonomies] section
  - [ ] Verify Hugo auto-generates ~40 skill pages (/skills/leadership/, /skills/technology/, etc.)

- [ ] Task 9: Create skills taxonomy landing page template (AC: Skill pages display badge lists)
  - [ ] Create `hugo/layouts/skills/list.html` (if doesn't exist)
  - [ ] Display all badges tagged with that skill
  - [ ] Show badge cards with metadata visible per FR19
  - [ ] Use H1 with skill name and SEO-optimized keyword per FR45
  - [ ] Use meta description from interests.yaml per SEO-1
  - [ ] Follow mobile-first responsive design per UX-14

- [ ] Task 10: Run validation and testing (AC: All validation passes, subset test successful)
  - [ ] Test on 3 badges first: BADGE_SLUGS="archery,camping,first-aid" bun run generate-skills
  - [ ] Manually inspect generated skills arrays for quality
  - [ ] Verify skills are from interests.yaml (no arbitrary skills)
  - [ ] Refine Gemini prompts if needed
  - [ ] Run on all 143 badges: bun run generate-skills
  - [ ] Run Hugo build to verify no errors
  - [ ] Verify skills taxonomy pages exist (~40 pages)
  - [ ] Check Lighthouse accessibility score = 100 per NFR8

## Dev Notes

### 🚨 CRITICAL ARCHITECTURAL GUARDRAILS (MUST FOLLOW)

**Interest-Based Taxonomy (Architecture Decision - CRITICAL):**
- This story uses **INTEREST-BASED** taxonomy (NOT skills-based) per Architecture Decision
- Scouts think in concrete activities: "I like art", "I like computers", "I like camping"
- NOT abstract competencies: "I want leadership skills" (too career-focused)
- Categories: arts-crafts, technology, nature-outdoors, sports-fitness, science, building-making, animals-wildlife, community-service, business-money, performance
- Each badge gets 1-3 interests (not 5-10) - keep focused per Architecture Decision

**Master Taxonomy Definition (ARCH-6 - MUST CREATE FIRST):**
- File: `hugo/data/interests.yaml` (central source of truth)
- Structure: Array of interest definitions with explicit slugs
- Fields: slug (explicit, kebab-case), name (display), description, meta_description (AI-generated), icon (emoji)
- Slugs must be explicit to avoid Hugo slugification ambiguity per ARCH-6
- Example: slug: "arts-crafts", name: "Arts & Crafts" (NOT auto-slugified)

**Data Storage Pattern (ARCH-7, ARCH-8):**
- Extend existing data.json with `metadata.skills` array containing interest slugs
- ALSO update _index.md frontmatter with `skills: ["arts-crafts", "technology"]` array
- Both updates must happen atomically (update both or neither)
- Use interest SLUGS in both data.json and frontmatter (NOT display names)

**Naming Conventions (ARCH-12 - MUST FOLLOW EXACTLY):**
- Script filename: `generate-skills.ts` (kebab-case)
- JSON field: `metadata.skills` (snake_case, array of slugs)
- Frontmatter field: `skills: ["arts-crafts"]` (snake_case, array of slugs)
- SCSS component: `skill-tag.scss` (kebab-case)
- Hugo partial: `skill-tag.html` (kebab-case)
- TypeScript variables: Full names (skills NOT skl, interest NOT int)

**File Organization (ARCH-13 - EXACT PATHS):**
- Master taxonomy: `hugo/data/interests.yaml`
- Scripts: `scripts/generate-skills.ts`, `scripts/generate-meta-descriptions.ts`
- Partial: `hugo/layouts/partials/skill-tag.html`
- SCSS: `hugo/assets/scss/components/skill-tag.scss`
- Taxonomy template: `hugo/layouts/skills/list.html`

**AI Service Integration (ARCH-9):**
- Use Google Gemini API for skills categorization
- Validate GEMINI_API_KEY at script startup (fail fast if missing)
- Fail fast on API errors - DO NOT continue with partial data
- Error message format: `[generate-skills] Context: Details` per ARCH-15
- AI prompt MUST include master interests list as valid options

**Hugo Template Integration (ARCH-14):**
- Use `with` blocks for backward compatibility when accessing metadata
- Pass parameters using dict: `{{ partial "skill-tag.html" (dict "skill" "arts-crafts") }}`
- Map interest slugs to display names: Read interests.yaml to show "Arts & Crafts" not "arts-crafts"

**Validation Requirements (ARCH-10):**
- Skills array MUST NOT be empty
- Skills MUST be from interests.yaml (no arbitrary skills)
- data.json and frontmatter MUST stay in sync
- Frontmatter uses array format: `skills: ["arts-crafts"]` with slugs

**Previous Story Intelligence (Story 1.1):**
- Story 1.1 created types.ts with BadgeMetadata interface
- Story 1.1 established atomic update pattern for data.json + frontmatter
- Story 1.1 validated Gemini API integration pattern
- Story 1.1 created difficulty-rating component as reference for component structure

### Technical Implementation Details

**interests.yaml Master Taxonomy Structure:**
```yaml
# hugo/data/interests.yaml

interests:
  # Interest-based categories (concrete activities, not abstract skills)

  - slug: arts-crafts
    name: Arts & Crafts
    description: "Creative and artistic activities like painting, sculpture, and design"
    meta_description: ""  # Populated by generate-meta-descriptions.ts
    icon: "🎨"

  - slug: technology
    name: Technology
    description: "Computers, electronics, coding, and digital skills"
    meta_description: ""
    icon: "💻"

  - slug: nature-outdoors
    name: Nature & Outdoors
    description: "Exploring the natural world and wilderness skills"
    meta_description: ""
    icon: "🌲"

  - slug: sports-fitness
    name: Sports & Fitness
    description: "Physical activities, athletics, and healthy living"
    meta_description: ""
    icon: "⚽"

  - slug: science
    name: Science
    description: "Scientific exploration and experimentation"
    meta_description: ""
    icon: "🔬"

  - slug: building-making
    name: Building & Making
    description: "Construction, engineering, and hands-on projects"
    meta_description: ""
    icon: "🔨"

  - slug: animals-wildlife
    name: Animals & Wildlife
    description: "Working with and learning about animals"
    meta_description: ""
    icon: "🦌"

  - slug: community-service
    name: Community & Service
    description: "Helping others and making a difference"
    meta_description: ""
    icon: "🤝"

  - slug: business-money
    name: Business & Money
    description: "Entrepreneurship, economics, and financial skills"
    meta_description: ""
    icon: "💼"

  - slug: performance
    name: Performance & Entertainment
    description: "Music, theater, public speaking, and performing arts"
    meta_description: ""
    icon: "🎭"

# Note: Add more interests as needed, ~10-15 total per Architecture Decision
```

**TypeScript Interface Extension (scripts/types.ts):**
```typescript
// Extend existing BadgeMetadata interface from Story 1.1

export interface BadgeMetadata {
  difficulty: number;  // Story 1.1
  skills: string[];    // Story 1.2 - Array of interest slugs
  // Future fields:
  // time_estimate?: TimeEstimate;
  // location?: Location;
}

export interface InterestDefinition {
  slug: string;           // Explicit kebab-case slug
  name: string;           // Display name (e.g., "Arts & Crafts")
  description: string;    // Full description
  meta_description: string; // AI-generated SEO description
  icon: string;           // Emoji icon
}
```

**Meta Description Generation Script:**
```typescript
// scripts/generate-meta-descriptions.ts

import { GoogleGenerativeAI } from "@google/generative-ai";

// Validate API key at startup
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('[generate-meta-descriptions] Missing GEMINI_API_KEY environment variable');
}

async function generateMetaDescriptions() {
  // Load interests.yaml
  const interests = await loadInterests('hugo/data/interests.yaml');

  for (const interest of interests) {
    const prompt = `Write a compelling meta description (150-160 characters) for a page listing all ${interest.name} merit badges for Boy Scouts ages 11-17. Focus on discovery and exploration. Make it engaging for both scouts and parents.`;

    try {
      const response = await gemini.generate(prompt);
      interest.meta_description = response.trim();
    } catch (error) {
      console.error(`[generate-meta-descriptions] Failed on interest ${interest.slug}: ${error.message}`);
      process.exit(1);  // Fail fast
    }
  }

  // Save updated interests.yaml
  await saveInterests('hugo/data/interests.yaml', interests);
}
```

**Skills Generation Script Pattern:**
```typescript
// scripts/generate-skills.ts

// 1. Validate GEMINI_API_KEY at startup
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('[generate-skills] Missing GEMINI_API_KEY environment variable');
}

// 2. Load master interests list
const interests = await loadInterests('hugo/data/interests.yaml');
const validInterestSlugs = interests.map(i => i.slug);

// 3. Support subset testing
const testBadges = process.env.BADGE_SLUGS?.split(',');
const badges = testBadges
  ? allBadges.filter(b => testBadges.includes(b.slug))
  : allBadges;

// 4. Generate skills for each badge
for (const badge of badges) {
  try {
    // AI prompt MUST include valid interest options
    const prompt = `Categorize this merit badge into 1-3 interest areas from this list: ${validInterestSlugs.join(', ')}.

Badge: ${badge.title}
Requirements: ${formatRequirements(badge.requirements)}

Return ONLY slugs from the provided list. Output JSON: { "interests": ["slug1", "slug2"] }`;

    const interests = await generateInterests(badge, validInterestSlugs);

    // Validate returned interests are from master list
    const invalid = interests.filter(s => !validInterestSlugs.includes(s));
    if (invalid.length > 0) {
      throw new Error(`AI returned invalid interests: ${invalid.join(', ')}`);
    }

    await updateBadgeMetadata(badge.slug, { skills: interests });
  } catch (error) {
    console.error(`[generate-skills] Failed on badge ${badge.slug}: ${error.message}`);
    process.exit(1);  // Fail fast
  }
}

// 5. Atomic update function (reuse from Story 1.1)
async function updateBadgeMetadata(slug: string, metadata: Partial<BadgeMetadata>) {
  const dataPath = `hugo/content/merit-badges/${slug}/data.json`;
  const indexPath = `hugo/content/merit-badges/${slug}/_index.md`;

  // Read existing data
  const data = await Bun.file(dataPath).json();

  // Extend metadata (non-destructive)
  data.metadata = { ...data.metadata, ...metadata };

  // Write atomically
  await Bun.write(dataPath, JSON.stringify(data, null, 2));

  // Update frontmatter with slugs
  await updateFrontmatter(indexPath, {
    skills: metadata.skills  // Array of slugs
  });
}
```

**Hugo Partial Pattern (Skill Tag):**
```html
<!-- hugo/layouts/partials/skill-tag.html -->

{{ $skillSlug := .skill }}
{{ $allInterests := .Site.Data.interests.interests }}

<!-- Map slug to display name from interests.yaml -->
{{ $interest := index (where $allInterests "slug" $skillSlug) 0 }}

{{ with $interest }}
  <a href="/skills/{{ $skillSlug }}/" class="skill-tag">
    <span class="icon">{{ .icon }}</span>
    <span class="name">{{ .name }}</span>
  </a>
{{ end }}
```

**SCSS Component Pattern (Skill Tag):**
```scss
// hugo/assets/scss/components/skill-tag.scss

// Use CSS custom properties only - NO imports per ARCH-13
.skill-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3xs);
  padding: var(--space-2xs) var(--space-xs);

  // Default state: Olive background, tan text per UX-7
  background-color: var(--olive-500);
  color: var(--tan-50);

  border-radius: var(--space-xs);
  text-decoration: none;
  font-size: var(--step--1);
  font-weight: 600;

  // Smooth transition per UX-7
  transition: background-color 0.2s, color 0.2s;

  // Hover state: Darker olive per UX-7
  &:hover {
    background-color: var(--olive-600);
  }

  // Focus state: High-contrast outline per UX-7
  &:focus {
    outline: 3px solid var(--olive-700);
    outline-offset: 2px;
  }

  .icon {
    font-size: var(--step-0);
  }

  .name {
    // Name from interests.yaml
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

<!-- NEW: Phase 1 metadata display -->
{{ with $data.metadata }}
  <div class="badge-metadata">
    <!-- Story 1.1: Difficulty -->
    {{ partial "difficulty-rating.html" (dict "difficulty" .difficulty) }}

    <!-- Story 1.2: Skills -->
    {{ with .skills }}
      <div class="skills">
        {{ range . }}
          {{ partial "skill-tag.html" (dict "skill" .) }}
        {{ end }}
      </div>
    {{ end }}
  </div>
{{ end }}
```

**Skills Taxonomy Landing Page Template:**
```html
<!-- hugo/layouts/skills/list.html -->

{{ define "main" }}
  {{ $skillSlug := .Title }}
  {{ $interest := index (where .Site.Data.interests.interests "slug" $skillSlug) 0 }}

  {{ with $interest }}
    <h1>{{ .icon }} {{ .name }} Merit Badges</h1>
    <p class="description">{{ .description }}</p>

    <div class="badge-grid">
      {{ range .Pages }}
        {{ partial "badge-card.html" . }}
      {{ end }}
    </div>
  {{ end }}
{{ end }}

{{ define "head" }}
  {{ $interest := index (where .Site.Data.interests.interests "slug" .Title) 0 }}
  {{ with $interest }}
    <meta name="description" content="{{ .meta_description }}">
    <meta property="og:description" content="{{ .meta_description }}">
  {{ end }}
{{ end }}
```

### Latest Technical Knowledge (Web Research Findings)

**Interest-Based Taxonomy (Product Validation):**
- Matches scout browsing patterns (TikTok by topic, YouTube by interest)
- Higher search volume for "art merit badges" vs "leadership merit badges"
- Appropriate granularity (~10-15 categories vs ~40 skills)
- Concrete activities scouts understand intuitively

**Hugo Taxonomy System (January 2025):**
- Supports multiple taxonomies simultaneously
- Automatic landing page generation for each term
- Efficient for ~40 taxonomy pages (validated performance)
- Explicit slugs prevent ambiguity (arts-crafts vs arts-and-crafts)

**Gemini API Best Practices (January 2025):**
- Include valid options in prompt for constrained categorization
- Use JSON mode for structured outputs
- Validate returned values against allowed list
- Sequential processing with delays to avoid rate limits

**CSS Custom Properties (January 2025):**
- Globally available when defined in colors.scss, spacing.scss
- Components don't need @use imports
- Better runtime performance than SCSS variables
- Full browser support in Chrome, Edge, Safari

### Project Structure Notes

**New Files to Create:**
```
hugo/
├── data/
│   └── interests.yaml                  # NEW: Master taxonomy (CRITICAL FIRST STEP)
├── layouts/
│   ├── skills/
│   │   └── list.html                   # NEW: Skills taxonomy landing page
│   └── partials/
│       └── skill-tag.html              # NEW: Skill pill component
└── assets/scss/
    └── components/
        └── skill-tag.scss              # NEW: Skill pill styling

scripts/
├── generate-meta-descriptions.ts       # NEW: One-time SEO setup
└── generate-skills.ts                  # NEW: Skills categorization
```

**Files to Modify:**
- `scripts/types.ts` - Extend BadgeMetadata interface with skills array
- `hugo/hugo.toml` - Add skills taxonomy configuration
- `hugo/layouts/merit-badges/single.html` - Integrate skill tags
- `hugo/layouts/partials/badge-card.html` - Integrate skill tags
- All 143 `data.json` and `_index.md` files (extend with skills)

### Alignment with Unified Project Structure

**Detected Patterns from Story 1.1:**
- ✅ Atomic update pattern for data.json + frontmatter
- ✅ Gemini API integration with fail-fast error handling
- ✅ BADGE_SLUGS environment variable for subset testing
- ✅ Component-based SCSS with CSS custom properties
- ✅ Hugo partials with dict parameter passing

**Story 1.2 Builds On Story 1.1:**
- Reuses types.ts interfaces (extend BadgeMetadata)
- Follows same script structure and error handling
- Uses same atomic update function
- Follows same component architecture pattern
- Maintains backward compatibility with `with` blocks

**No Conflicts Detected:**
- Story 1.2 is additive (extends metadata object)
- Taxonomy definitions are independent (skills, difficulty)
- Components follow same patterns established in Story 1.1

### Testing Strategy

**Critical Order (MUST FOLLOW):**
1. Create interests.yaml FIRST (master taxonomy is dependency)
2. Generate meta descriptions (populate SEO field)
3. Test skills generation on 3 badges
4. Validate skills are from interests.yaml (no arbitrary skills)
5. Full generation on 143 badges

**Subset Testing:**
```bash
# 1. Create interests.yaml manually
# 2. Generate meta descriptions
bun run generate-meta-descriptions

# 3. Test on 3 badges
BADGE_SLUGS="archery,camping,first-aid" bun run generate-skills

# Validate output
cat hugo/content/merit-badges/archery/data.json | grep -A10 skills
cat hugo/content/merit-badges/archery/_index.md | grep skills

# Verify skills are from interests.yaml (no arbitrary skills)
# Verify data.json and frontmatter are in sync
```

**Full Generation:**
```bash
# After subset validation passes
bun run generate-skills

# Hugo build
cd hugo && hugo --minify

# Verify taxonomy pages
ls -la hugo/public/skills/
# Should see ~10-15 skill directories
```

**Quality Validation:**
- [ ] AI returns ONLY skills from interests.yaml (no arbitrary skills)
- [ ] Each badge has 1-3 interests (focused categorization)
- [ ] Interests make intuitive sense for badge content
- [ ] Skills taxonomy pages display correctly
- [ ] Skill tags are clickable and link to taxonomy pages
- [ ] Meta descriptions are compelling (150-160 chars)

### References

**Source Documents:**
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements FR15, FR27]
- [Source: _bmad-output/planning-artifacts/architecture.md#ARCH-5, ARCH-6, ARCH-8, ARCH-9, ARCH-12, ARCH-13, ARCH-14]
- [Source: _bmad-output/planning-artifacts/architecture.md#Interest-Based Taxonomy Decision]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-6, UX-7, UX-18]
- [Source: Story 1.1 - Atomic update pattern, Gemini integration, component structure]

**External Documentation:**
- Hugo Taxonomies: https://gohugo.io/content-management/taxonomies/
- Hugo Data Files: https://gohugo.io/templates/data-templates/
- Gemini API: https://ai.google.dev/docs
- WCAG 2.1 Clickable Elements: https://www.w3.org/WAI/WCAG21/quickref/#target-size

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (1M context)

### Debug Log References

N/A - Story file created, implementation not yet started

### Completion Notes List

- Story file created with comprehensive developer context
- All architectural requirements documented (especially ARCH-6 interest taxonomy)
- Interest-based taxonomy decision emphasized (concrete activities, not abstract skills)
- Master taxonomy creation is critical first step before scripts
- Story builds on Story 1.1 patterns (atomic updates, Gemini API, components)

### File List

**Critical First Step:**
- `hugo/data/interests.yaml` - MUST CREATE FIRST (master taxonomy dependency)

**Files to Create:**
- `scripts/generate-meta-descriptions.ts` - One-time SEO setup
- `scripts/generate-skills.ts` - Skills categorization script
- `hugo/layouts/partials/skill-tag.html` - Skill pill component
- `hugo/assets/scss/components/skill-tag.scss` - Skill pill styling
- `hugo/layouts/skills/list.html` - Skills taxonomy landing page

**Files to Modify:**
- `scripts/types.ts` - Extend BadgeMetadata with skills array
- `hugo/hugo.toml` - Add skills taxonomy configuration
- `hugo/layouts/merit-badges/single.html` - Integrate skill tags
- `hugo/layouts/partials/badge-card.html` - Integrate skill tags
- All 143 `data.json` and `_index.md` files (extend with skills metadata)
