# Full-Text Search Specification

Full-text search of all Merit Badge requirements using Pagefind with Hugo.

## Overview

A dedicated `/search` page that allows users to search through all 143 merit badge requirements with instant results, deep linking to specific requirement anchors, and eagle-required filtering.

---

## Core Requirements

### Search Scope
- **Index requirements only** using `data-pagefind-body` attribute
- Exclude navigation, footer, and non-requirement metadata from indexing
- **Badge names prioritized**: Badge name matches appear before individual requirement matches

### Deep Linking
- Search results link directly to specific requirement anchors (e.g., `/merit-badges/camping/requirements/#1.a.2`)
- Use `data-pagefind-index-attrs` to capture anchor IDs on requirement elements
- Append anchor fragment to result URLs in custom result template

### Filtering
- **Eagle-required checkbox**: Single `☐ Eagle Required only` checkbox below search box
- Uses Pagefind filters with `data-pagefind-filter="eagle_required"` attribute

---

## User Interface

### Search Page Location
- Dedicated page at `/search`
- Accessed via header search icon (Phosphor icons magnifying glass)
- Mobile: Icon navigates to /search (not inline expansion)

### Page Content
```
Heading: "Search Requirements"
Description: "Find specific requirements across all 143 merit badges"

[Search Input: "Search requirements..."]
[☐ Eagle Required only]
[Clear]

[Results Area]
```

### Result Display
- **Hierarchical breadcrumb**: `Badge Name > 1 > 1.a > [matched text excerpt]`
- Text arrow separators (`>`)
- Badge name is clickable link to badge overview page
- Requirement text links to specific anchor
- Excerpt truncated at ~150 characters
- Maximum 20 results displayed (no pagination)
- **Sub-results enabled**: Show multiple requirement matches per badge
- **Badge images**: Show badge image only when badge name matches, not for individual requirement matches

### Empty State
- Before search: Empty with placeholder text only
- No results: "No requirements found for '[query]'. Browse all merit badges instead." with link to badge listing

### Error State
- Display: "Search unavailable, please try again" with retry button

### Interactions
- **Debounced search**: 300ms delay before executing search
- **Keyboard navigation**: Basic tab navigation through results
- **Result links**: Open in same tab
- **Clear button**: Separate button that clears input AND updates URL (removes `?q=` param)

---

## URL State

### Shareable URLs
- URL updates as user types: `/search?q=first+aid`
- Supports sharing and bookmarking
- Back button works correctly

### Pre-populated Search
- When arriving at `/search?q=camping`, automatically execute search and show results

---

## Technical Implementation

### Build Commands
```bash
# Development
bun run hugo:dev

# Build with search index
bun run build:search
# Which runs: bun run build && bun run index

# Index only
bun run index
# Which runs: bunx pagefind --site hugo/public
```

### Pagefind Configuration

```javascript
new PagefindUI({
  element: "#search",
  showSubResults: true,
  showImages: true,
  resetStyles: false,  // Use custom SCSS
  excerptLength: 150,
});
```

### Index Prefetching
- Add `<link rel="prefetch">` for Pagefind index on all pages
- Ensures instant search when user navigates to /search

### Hugo Template Requirements

#### Requirements Template Changes
Each requirement element needs data attributes:
```html
<div
  data-pagefind-body
  data-pagefind-index-attrs="data-anchor,data-breadcrumb,data-badge-name"
  data-anchor="1.a.2"
  data-breadcrumb="Camping > 1 > 1.a"
  data-badge-name="Camping"
  data-pagefind-filter="eagle_required:{{ .Params.eagle_required }}"
  id="1.a.2"
>
  {{ .requirement_text }}
</div>
```

#### Path Data Source
Hugo templates compute breadcrumb path from existing data structure (data.json already contains path info). No sync script changes needed.

### New Files Required

```
hugo/
├── content/search/
│   └── _index.md              # Search page content
├── layouts/search/
│   └── list.html              # Search page template
├── assets/scss/
│   └── _search.scss           # Search-specific styles
└── static/
    └── (pagefind files generated at build)
```

### Header Changes
Add search icon to site header that links to `/search`:
```html
<a href="/search" aria-label="Search requirements">
  <!-- Phosphor magnifying glass SVG -->
</a>
```

---

## Styling

### Approach
- Custom SCSS matching existing site design system
- Override Pagefind default styles as needed
- Import in main stylesheet: `@import "search";`

### Key Selectors to Style
- `.pagefind-ui__search-input` - Search input field
- `.pagefind-ui__message` - Result count display
- `.pagefind-ui__result` - Individual result cards
- `.pagefind-ui__result-title` - Result titles
- `.pagefind-ui__result-excerpt` - Excerpt text
- Custom: `.search-filter` - Eagle required checkbox
- Custom: `.search-clear-btn` - Clear button
- Custom: `.search-breadcrumb` - Hierarchical path display

---

## Analytics

### Pirsch Integration
- Event name: `merit-badge-search`
- Track: search query, result count
- Based on doula-cooperative reference implementation

```javascript
if (window.pirsch) {
  window.pirsch("merit-badge-search", {
    meta: {
      query: searchQuery,
      results: resultCount,
    },
  });
}
```

---

## SEO

- Add `<meta name="robots" content="noindex">` to search page
- Search page should not appear in Google search results

---

## CI/CD

### Automatic Index Build
Add to existing GitHub Actions workflows:
```yaml
- name: Build Hugo site
  run: bun run build

- name: Build search index
  run: bun run index
```

### Manual Workflow
Create `.github/workflows/rebuild-search-index.yml` for on-demand index rebuilding without full site deploy.

---

## Accessibility

- Basic tab navigation through results
- Proper ARIA labels on search icon and input
- Clear button accessible via keyboard
- Result links focusable and keyboard-activatable

---

## Performance

- Index prefetched on all pages for instant search
- No concerns about index size or Firebase hosting costs
- Debounced input prevents excessive searches

---

## Reference Implementation

Based on patterns from: https://github.com/markgoho/doula-cooperative/blob/trunk/hugo/layouts/find-a-doula/list.html

Key adaptations:
- Custom result template for hierarchical breadcrumbs
- Eagle-required filtering
- Deep anchor linking
- Badge image conditional display

---

## Implementation Checklist

- [ ] Create `/search` page content and layout
- [ ] Add `data-pagefind-body` to requirement templates
- [ ] Add index attributes for anchor, breadcrumb, badge name
- [ ] Add `data-pagefind-filter` for eagle_required
- [ ] Create custom result template with breadcrumb display
- [ ] Add search icon to header
- [ ] Implement eagle-required checkbox filter
- [ ] Implement Clear button with URL update
- [ ] Add URL state management (query param sync)
- [ ] Create search SCSS styles
- [ ] Add Pirsch analytics integration
- [ ] Add noindex meta tag
- [ ] Add index prefetch link to base template
- [ ] Update CI/CD workflows
- [ ] Create manual rebuild workflow
- [ ] Test deep linking to requirement anchors
- [ ] Test eagle-required filtering
- [ ] Test shareable URLs
- [ ] Test error handling
