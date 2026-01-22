---
project_name: 'mbu'
user_name: 'Mark'
date: '2026-01-21'
sections_completed: ['technology_stack', 'language_rules', 'phase1_patterns', 'naming_conventions', 'scss_patterns']
existing_patterns_found: 24
status: 'complete'
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

**CRITICAL Requirements:**
- Hugo **extended** >= 0.129.0 (standard Hugo will NOT work - Sass requires extended)
- Bun runtime (NOT Node.js - use `bun`, not `npm`/`yarn`)
- Environment variable: `GEMINI_API_KEY` (required for all generate-* scripts)

**Main Branch:** `trunk` (not main/master)

**Key Dependencies:**
- TypeScript strict: noUncheckedIndexedAccess, verbatimModuleSyntax enabled
- @google/genai ^1.37.0 (Gemini API client)
- firebase-tools ^15.3.1 (use `bunx firebase`, not global command)

**Command Patterns:**
```bash
# ✅ Use Bun
bun run generate-metadata
bun scripts/validate-metadata.ts

# ❌ Don't use Node.js/npm
npm run generate-metadata  # Wrong
node scripts/validate-metadata.ts  # Wrong
```

## Critical Implementation Rules

### TypeScript Strict Patterns (CRITICAL)

**Most Common Agent Violations to Avoid:**
- ❌ Multiple exports per file → ✅ ONE export per file (helpers stay private)
- ❌ Abbreviated variables (`err`, `res`, `req`, `diff`) → ✅ Full names (`error`, `response`, `request`, `difficulty`)
- ❌ Missing `type` keyword → ✅ `import type { Badge } from "./types"`
- ❌ Try/catch with continue → ✅ Fail fast, re-throw with context

**Strict Mode Key Points:**
- noUncheckedIndexedAccess: Array access returns `T | undefined` - check before using
- verbatimModuleSyntax: Must use `type` keyword for type-only imports
- Explicit return types: `async function foo(): Promise<number>`
- Object parameters: `function foo({ param }: { param: Type })`

**Structured Error Format:**
```typescript
throw new Error('[script-name] Context: Details');
// Example: throw new Error('[generate-difficulty] Failed on badge archery: API timeout');
```

**See `.claude/rules/typescript.md` for comprehensive strict mode rules.**

### Hugo Template Patterns (CRITICAL)

**Backward Compatibility (MUST USE 'with' blocks):**
```go
{{/* ✅ GOOD - Safe access with 'with' block */}}
{{ with $data.metadata }}
  <div>Difficulty: {{ .difficulty }}</div>
  {{ with .time_estimate }}
    <span>{{ .typical_hours }} hours</span>
  {{ end }}
{{ end }}

{{/* ❌ BAD - Breaks if metadata doesn't exist */}}
<div>{{ $data.metadata.difficulty }}</div>
```

**Partial Parameters:**
```go
{{ partial "difficulty-rating" (dict "difficulty" 3 "showLabel" true) }}
```

**Data Access Patterns:**
- Interests data: `.Site.Data.interests.interests`
- Badge data: `.Site.Data.merit_badges[.Params.slug].data`

**See `.claude/rules/hugo.md` for comprehensive Hugo patterns.**

### SCSS Patterns (CRITICAL)

**Architecture:** Global styles (base, colors, typography, spacing) loaded once in baseof.html. Page-specific SCSS imports only components needed.

**Component Files Use var() ONLY:**
```scss
// components/difficulty-rating.scss
.difficulty-rating {
  color: var(--olive-500);  // CSS custom properties available globally
  gap: var(--space-xs);
}
// NO @use imports in components
```

**Page Files Import Components Only:**
```scss
// pages/badge-detail.scss
// Global styles (base, colors, typography, spacing) already loaded via baseof.html
// Only import components used on this page
@use '../components/difficulty-rating';
@use '../components/interest-tag';
@use '../components/location-indicator';
```

**Hugo Template Loads Page CSS:**
```go
{{ define "head-styles" }}
  {{ $pageCSS := "scss/pages/badge-detail.scss" }}
  {{ $options := (dict "transpiler" "dartsass" "outputStyle" "compressed") }}
  {{ $styles := resources.Get $pageCSS | css.Sass $options }}
  <link rel="stylesheet" href="{{ $styles.RelPermalink }}">
{{ end }}
```

### Phase 1 Specific Patterns

**Atomic Updates (data.json + frontmatter together):**
```typescript
// Prepare both updates, write together with Promise.all
await Promise.all([
  Bun.write(dataPath, JSON.stringify(updatedData, null, 2)),
  Bun.write(indexPath, updatedFrontmatter)
]);
```

**Subset Testing Filter (MUST IMPLEMENT):**
```typescript
// At top of all generate-* scripts
const testBadges = process.env.BADGE_SLUGS?.split(',');
const badges = testBadges
  ? MERIT_BADGES.filter(b => testBadges.includes(b.slug))
  : MERIT_BADGES;

// Usage: BADGE_SLUGS="archery,camping,first-aid" bun run generate-metadata
```

**Sequential Execution (NEVER PARALLEL):**
- package.json uses `&&`: `"generate-metadata": "bun run generate-difficulty && bun run generate-interests && bun run generate-location"`
- Running in parallel causes file corruption (concurrent writes to same data.json)
- ALWAYS sequential, NEVER parallel

**Environment Validation (At Script Startup):**
```typescript
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('[script-name] Missing GEMINI_API_KEY environment variable');
}
```

### Naming Conventions (Quick Reference)

**Data Formats:**
- JSON fields: `snake_case` (difficulty, time_estimate, interests, location)
- Frontmatter taxonomy: Use explicit **slugs** not display names
  - ✅ `interests: ["arts-crafts", "technology"]`
  - ❌ `interests: ["Arts & Crafts", "Technology"]`
- Hugo data (interests.yaml): Define explicit slugs + display names
  - `slug: arts-crafts` + `name: Arts & Crafts`

**File Naming:**
- TypeScript scripts: `kebab-case.ts` (generate-difficulty.ts)
- Hugo partials: `kebab-case.html` (difficulty-rating.html)
- SCSS: `kebab-case.scss` (difficulty-rating.scss)

**TypeScript Naming:**
- Variables: `camelCase`, no abbreviations (badgeSlug, timeEstimate, requirementText)
- Interfaces: `PascalCase` (BadgeMetadata, InterestDefinition)
- Constants: `UPPER_SNAKE_CASE` (MERIT_BADGES, CONTENT_DIR)

### Architecture Reference

**Complete architectural decisions, patterns, and project structure:**
See `_bmad-output/planning-artifacts/architecture.md`

**Key architectural principles:**
- Brownfield enhancement (extend existing, don't break)
- Build-time only (no runtime backend)
- Static site architecture (Hugo generates all pages at build time)
- Annual update cadence (manual review workflow)
- Interest-based taxonomy (10 categories matching scout mental model)
```

---

Perfect! Let me save this to the project-context.md file and complete the workflow.

<function_calls>
<invoke name="Read">
<parameter name="file_path">/Users/mgoho/Documents/GitHub/mbu/_bmad/bmm/workflows/generate-project-context/steps/step-03-complete.md

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any Phase 1 code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive pattern
- Reference architecture.md for complete decisions and rationale

**For Humans:**

- Keep this file lean and focused on critical agent needs
- Update when architectural patterns change
- Review after Phase 1 for lessons learned
- Remove rules that become obvious over time

**Last Updated:** 2026-01-21
