# SEO Implementation Specification

## Merit Badge University (merit-badge.university)

**Status**: Pre-launch implementation guide
**Last Updated**: 2026-01-08
**Target Launch**: Ready for initial site launch
**Success Metric**: Page 1 ranking for "[badge name] requirements" queries within 3-6 months

---

## Table of Contents

1. [Content Strategy](#content-strategy)
2. [Technical SEO](#technical-seo)
3. [Structured Data (JSON-LD)](#structured-data-json-ld)
4. [Meta Tags & Social Sharing](#meta-tags--social-sharing)
5. [Performance Optimization](#performance-optimization)
6. [Internal Linking Strategy](#internal-linking-strategy)
7. [Sitemap & Robots](#sitemap--robots)
8. [Images & Media](#images--media)
9. [Security Headers](#security-headers)
10. [Post-Launch Monitoring](#post-launch-monitoring)
11. [Future Enhancements](#future-enhancements)

---

## Content Strategy

### Site Architecture

**Current Structure** (maintain this):

```
/merit-badges/                           → Badge listing page
/merit-badges/{badge-slug}/              → Badge landing page (informational)
/merit-badges/{badge-slug}/requirements/ → Requirements detail page (transactional)
```

**Rationale**: Two-page structure allows:

- Landing pages to target informational queries: "{badge name} merit badge"
- Requirements pages to target transactional queries: "{badge name} merit badge requirements"
- Google serves appropriate page based on search intent

### Keyword Strategy

Target multiple keyword intents:

| Keyword Pattern                    | Intent                      | Target Page              | Priority |
| ---------------------------------- | --------------------------- | ------------------------ | -------- |
| `{badge} merit badge requirements` | Transactional (high intent) | `/requirements/`         | High     |
| `{badge} merit badge`              | Informational               | Landing page             | High     |
| `{badge} requirements`             | Short-tail variant          | `/requirements/`         | Medium   |
| `eagle required merit badges`      | Collection/discovery        | `/merit-badges/` listing | Medium   |

**Example**:

- "camping merit badge requirements" → serve `/merit-badges/camping/requirements/`
- "camping merit badge" → serve `/merit-badges/camping/`

### Page Titles

**Format**: `{Badge Name} Requirements | Merit Badge University`

**Implementation**:

```html
<title>{{ .Title }} | Merit Badge University</title>
```

**Examples**:

- Camping Requirements | Merit Badge University (40 chars)
- First Aid Requirements | Merit Badge University (44 chars)
- Environmental Science Requirements | Merit Badge University (57 chars)

**Rationale**:

- Keyword-optimized (front-loads badge name)
- Under 60 characters for full display on mobile
- Consistent branding
- Clear content description

### Meta Descriptions

**Current Implementation**: ✅ Already using `.Description` from `index.md`

**Verify**:

- Descriptions should be 150-160 characters
- Include target keywords naturally
- Provide compelling value proposition
- Each badge should have unique description in frontmatter

**Recommended Template** (if auto-generating):

```
Complete {count} requirements for the {Badge Name} merit badge{" (Eagle-required)" if applicable}. Includes {key topics}.
```

Example:

> Complete 9 requirements for the Camping merit badge (Eagle-required). Includes camping trips, outdoor skills, and safety protocols.

---

## Technical SEO

### URL Structure

**Current**: ✅ Clean URLs with trailing slashes (`/merit-badges/camping/`)

**Canonical Tags**: ✅ Already implemented in `baseof.html`

```html
<link rel="canonical" href="{{ .Permalink | absURL }}" />
```

**Enforce trailing slashes**:

- Hugo serves both `/camping` and `/camping/`
- Canonical tags point to slash version
- This prevents duplicate content issues

**Action**: No changes needed - current implementation follows best practices.

### Language & Internationalization

**Add hreflang tag** for English content:

```html
<link rel="alternate" hreflang="en-US" href="{{ .Permalink | absURL }}" />
```

**Location**: Add to `baseof.html` `<head>` section or `partials/head/site.html`

**Rationale**: Signals to Google this is US English content. Prepares for potential future internationalization.

### Sitemap Configuration

**lastmod Implementation**: Use Git commit timestamps

**Hugo Config** (`hugo/config.toml` or `hugo.toml`):

```toml
[sitemap]
  changefreq = ""  # Omit - Google ignores this
  priority = -1    # Omit priority tags - Google ignores this
  filename = "sitemap.xml"

# Enable Git info for lastmod dates
enableGitInfo = true
```

**Frontmatter**:

```yaml
# Hugo will use git commit date if frontmatter lastmod is not present
# Only set lastmod manually if you want to override git timestamp
```

**Exclude from sitemap**:

- Search page (already has `noindex`)
- 404 page
- Any draft content (`draft: true`)

**Include in sitemap**:

- All 143 badge landing pages
- All 143 badge requirements pages
- Homepage
- Main badge listing page

**Priority**: All badges same priority (don't differentiate Eagle vs elective)

### Freshness Signals

When scraper updates badge requirements:

1. **Git commit** with descriptive message:

   ```bash
   git commit -m "Update camping merit badge requirements (Requirement 3 revised)"
   ```

2. **lastmod date** automatically updates from git timestamp

3. **Sitemap regeneration** on build shows new `<lastmod>` date

**Important**: Only update when content actually changes. Hash comparison in scraper prevents false freshness signals.

---

## Structured Data (JSON-LD)

### Requirements Pages Schema

**Current**: ✅ Course schema implemented in `partials/json-ld/merit-badge-requirements.html`

**Improvement Needed**: Include ALL top-level requirements (not just first 5)

**Current code** (lines 52-63):

```go
"hasPart": [
  {{- range $index, $req := first 5 $meaningfulReqs -}}
  ...
```

**Updated approach**:

```go
"hasPart": [
  {{- range $index, $req := $json.requirements -}}
  {{- if gt $index 0 }},{{ end }}
  {
    "@type": "LearningResource",
    "position": {{ add $index 1 }},
    "name": "{{ $req.text | plainify | truncate 60 | safeJS }}",
    "learningResourceType": "Activity",
    "educationalLevel": "Youth (ages 11-17)",
    "teaches": "{{ $req.text | plainify | truncate 150 | safeJS }}"
  }
  {{- end }}
],
```

**Rationale**:

- Include top-level requirements only (e.g., #1, #2, #3)
- Don't include subrequirements (1a, 1b, 1c) to avoid payload bloat
- Provides complete semantic structure without excessive size
- Most badges have 5-12 top-level requirements (~3-7 KB JSON-LD)

**Keep existing schema fields**:

- ✅ `@type: Course` - Good semantic fit
- ✅ `provider: Scouting America` - Authority signal
- ✅ `isAccessibleForFree: true` - Factual
- ✅ `associatedMedia` - Links to official pamphlet
- ✅ `sameAs` - Points to scouting.org (canonical source)

### BreadcrumbList Schema

**Add to requirements pages**:

```html
{{- /* BreadcrumbList schema for requirements pages */ -}} {{- $badge := .Parent
-}}
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "{{ .Site.BaseURL }}"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Merit Badges",
        "item": "{{ .Site.BaseURL }}merit-badges/"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "{{ $badge.Title }}",
        "item": "{{ $badge.Permalink | absURL }}"
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": "Requirements",
        "item": "{{ .Permalink | absURL }}"
      }
    ]
  }
</script>
```

**Benefits**:

- Shows navigation path in search results
- Helps Google understand site hierarchy
- May appear as breadcrumb trail in SERPs
- Minimal payload (~1-2 KB)

**Location**: Add to `requirements.html` layout after Course schema

### Organization Schema (Homepage)

**Add to homepage** (`layouts/index.html` or site-wide in `baseof.html`):

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Merit Badge University",
    "alternateName": "MBU",
    "url": "{{ .Site.BaseURL }}",
    "logo": {
      "@type": "ImageObject",
      "url": "{{ "/assets/images/logo.png" | absURL }}",
      "width": 512,
      "height": 512
    },
    "description": "Comprehensive resource for Scouting America merit badge requirements. Search and track all 143 merit badges.",
    "sameAs": [
      "https://github.com/your-org/mbu"
    ]
  }
</script>
```

**Benefits**:

- Establishes brand entity in Google's Knowledge Graph
- Logo may appear in branded search results
- Associates social profiles with the site
- E-E-A-T signal (Expertise, Experience, Authoritativeness, Trustworthiness)

**Action**: Create as `partials/json-ld/organization.html` and include in homepage

### Schema Summary

| Page Type          | Schema Types            | Status                             |
| ------------------ | ----------------------- | ---------------------------------- |
| Homepage           | Organization            | 🔨 TODO                            |
| Requirements pages | Course + BreadcrumbList | ✅ Course done, 🔨 Breadcrumb TODO |
| Landing pages      | -                       | ℹ️ Not critical                    |
| Listing page       | -                       | ℹ️ Not critical                    |

---

## Meta Tags & Social Sharing

### Open Graph Tags

**Current**: ✅ Implemented in `partials/head/meta.html`

**Verification checklist**:

- ✅ Badge-specific images: `{slug}-merit-badge.avif`
- ✅ Fallback to generic brand image
- ✅ Dynamic description from frontmatter
- ✅ Twitter Card support (`summary_large_image`)

**Current implementation**:

```html
{{/* Look for merit badge image: {slug}-merit-badge.avif */}} {{ $meritBadgeImg
:= .Resources.GetMatch "*-merit-badge.avif" }} {{ $img := "" }} {{ if
$meritBadgeImg }} {{ $img = $meritBadgeImg.Permalink }} {{ else }} {{ $img =
"/merit-badges/merit-badge-university.avif" | absURL }} {{ end }}
```

**Action**: ✅ No changes needed - implementation is solid

### Additional Meta Tags

**Add to `partials/head/site.html` or `meta.html`**:

```html
<!-- Language -->
<meta http-equiv="content-language" content="en-US" />

<!-- Viewport (should already exist) -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<!-- Theme color for mobile browsers -->
<meta name="theme-color" content="#your-brand-color" />

<!-- DNS prefetch for external domains -->
<link rel="preconnect" href="https://www.scouting.org" crossorigin />
<link rel="dns-prefetch" href="https://filestore.scouting.org" />
```

---

## Performance Optimization

### Critical CSS

**Current**: ✅ Already implemented via `partials/head/critical-css.html` and `non-critical-css.html`

**Verify**:

- Critical CSS inlined in `<head>` for above-fold content
- Non-critical CSS loaded with `preload` + `onload` pattern
- Font preloading for Geologica variable font

**Current implementation** (lines from `non-critical-css.html`):

```html
<link
  rel="preload"
  href="{{ $nonCriticalCSS.RelPermalink }}"
  as="style"
  onload="this.onload=null;this.rel='stylesheet'"
/>
```

**Action**: ✅ No changes needed - follows best practices

### Resource Hints

**Add preconnect for external domains**:

```html
<!-- Preconnect to scouting.org for "View on scouting.org" and pamphlet links -->
<link rel="preconnect" href="https://www.scouting.org" crossorigin />

<!-- DNS prefetch for pamphlet CDN (lighter than preconnect) -->
<link rel="dns-prefetch" href="https://filestore.scouting.org" />
```

**Benefits**:

- Saves 10-30ms on external link clicks
- Prepares connection to scouting.org while user reads
- Minimal overhead (~2 early connections)

**Location**: Add to `partials/head/site.html` or `baseof.html`

### Image Loading

**Current**: ✅ Lazy loading already implemented

**Badge images on listing page**:

- Use `loading="lazy"` attribute for images below fold
- First ~20 images can load eagerly for immediate render
- AVIF format only (95%+ browser support acceptable)

**Verify**:

```html
<img
  src="{{ $img }}"
  alt="{{ .Title }} badge illustration"
  loading="lazy"
  width="80"
  height="80"
/>
```

**Action**: Verify lazy loading is applied to listing page images

### Core Web Vitals Targets

| Metric                         | Target  | Current | How to Measure        |
| ------------------------------ | ------- | ------- | --------------------- |
| Largest Contentful Paint (LCP) | < 2.5s  | TBD     | Google Search Console |
| First Input Delay (FID)        | < 100ms | TBD     | Google Search Console |
| Cumulative Layout Shift (CLS)  | < 0.1   | TBD     | Google Search Console |

**Monitoring**: Use Google Search Console Core Web Vitals report (post-launch)

**Optimizations**:

- ✅ Critical CSS inlined
- ✅ Lazy loading images
- ✅ Font preloading
- ✅ Minified assets
- ✅ AVIF images (smallest format)

---

## Internal Linking Strategy

### Related Merit Badges

**Goal**: Link merit badges that reference each other in requirements

**Examples**:

- First Aid ↔ Emergency Preparedness
- Swimming ↔ Lifesaving
- Environmental Science ↔ Soil and Water Conservation
- Any badge mentioning "must have [X] merit badge" as prerequisite

**Implementation**: Post-processing script approach

**Script**: `scripts/detect-related-badges.ts`

```typescript
// Pseudocode
for each badge data.json:
  1. Parse all requirement text
  2. Search for mentions of other badge names
  3. Extract matching badge slugs
  4. Write to badge frontmatter or separate related.json file
  5. Hugo templates read and display related badges section
```

**Output example** (in frontmatter or separate file):

```yaml
related_badges:
  - slug: emergency-preparedness
    reason: "Referenced in Requirement 5"
  - slug: lifesaving
    reason: "Prerequisite for some requirements"
```

**Display on requirements page**:

```html
{{ if .Params.related_badges }}
<aside class="related-badges">
  <h3>Related Merit Badges</h3>
  <ul>
    {{ range .Params.related_badges }}
    <li>
      <a href="/merit-badges/{{ .slug }}/">{{ .slug | title }}</a>
      <span class="reason">{{ .reason }}</span>
    </li>
    {{ end }}
  </ul>
</aside>
{{ end }}
```

**Benefits**:

- Improved internal link structure
- Better user navigation
- Helps Google understand topic relationships
- Keeps users engaged on site

**Status**: 🔨 TODO - Create GitHub issue for post-processing script

### Contextual Links in Requirements

**Auto-link badge mentions** in requirement text:

When parsing requirements, detect merit badge names and wrap in links:

```html
<p>
  You must complete the
  <a href="/merit-badges/first-aid/">First Aid merit badge</a>
  before starting this requirement.
</p>
```

**Implementation**:

- Could be done in scraper or post-processing
- Regex to detect badge names: `/(First Aid|Swimming|Camping|etc) merit badge/gi`
- Replace with link: `<a href="/merit-badges/{slug}/">$1 merit badge</a>`

**Status**: 🔨 TODO - Consider as enhancement

---

## Sitemap & Robots

### robots.txt

**Create**: `hugo/static/robots.txt`

```txt
# Merit Badge University robots.txt

User-agent: *
Allow: /

# Block specific paths (if any exist)
# Disallow: /drafts/
# Disallow: /admin/

# Sitemap location
Sitemap: https://merit-badge.university/sitemap.xml
```

**Rationale**:

- Explicit sitemap location helps crawlers discover content
- No restrictions needed for static site with public content
- Can add Disallow rules later if needed

**Status**: 🔨 TODO - Create robots.txt

### Sitemap Configuration

**Hugo Config**:

```toml
[sitemap]
  changefreq = ""  # Omit - Google ignores this
  priority = -1    # Omit - Google ignores this
  filename = "sitemap.xml"

enableGitInfo = true  # For git-based lastmod dates
```

**Exclusions** (set in frontmatter):

```yaml
# Search page (already has this)
sitemap:
  disable: true

# 404 page
sitemap:
  disable: true
```

**Inclusions**:

- All 143 badge landing pages
- All 143 badge requirements pages (priority pages for SEO)
- Homepage
- Main listing page

**Verify sitemap structure**:

```xml
<url>
  <loc>https://merit-badge.university/merit-badges/camping/requirements/</loc>
  <lastmod>2026-01-08T12:34:56Z</lastmod>
  <!-- No priority or changefreq tags -->
</url>
```

**Status**: 🔨 TODO - Configure Hugo sitemap settings

---

## Images & Media

### Image Formats

**Current**: AVIF only

**Decision**: ✅ Keep AVIF only

- 95%+ browser support
- Smallest file size (60-80% smaller than JPEG)
- Target audience (Scouts, parents) likely use modern devices
- No fallback needed given support level

**Verify AVIF compression**:

- Badge icons should be ~5-10 KB each
- OG images should be ~20-30 KB
- Quality level: 85-90 (balance quality vs size)

### Alt Text Strategy

**Badge images on listing page**: `{Badge name} badge illustration`

**Example**:

```html
<img
  src="/merit-badges/camping-merit-badge.avif"
  alt="Camping badge illustration"
  loading="lazy"
/>
```

**Rationale**:

- Descriptive for accessibility
- "illustration" covers AI-generated nature without being verbose
- SEO-friendly (includes badge name)
- Not misleading (images are AI-generated, not official BSA badges)

**Badge images on requirements page**: Same pattern

**Current** (requirements.html line 52):

```html
<img
  src="{{ .RelPermalink }}"
  alt=""  <!-- Empty because hidden, used for Pagefind metadata -->
  data-pagefind-meta="image[src]"
  hidden
/>
```

**Decision**: ✅ Keep empty alt for hidden Pagefind image (correct approach)

**Action**: Update listing page and landing page alt text to `{Badge name} badge illustration`

### Open Graph Images

**Current**: ✅ Badge-specific AVIF images

**Verify**:

- Each badge has: `{slug}-merit-badge.avif`
- Fallback to: `/merit-badges/merit-badge-university.avif`
- Dimensions: 1200x630px (optimal for OG)
- File size: < 100 KB per image

**Action**: ✅ No changes needed

---

## Security Headers

### Content Security Policy (CSP)

**Implementation**: Firebase Hosting headers

**Create**: `hugo/static/headers` or `firebase.json`

**Firebase hosting config** (`firebase.json`):

```json
{
  "hosting": {
    "public": "hugo/public",
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Content-Security-Policy",
            "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://www.scouting.org https://filestore.scouting.org; frame-ancestors 'none';"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "Referrer-Policy",
            "value": "strict-origin-when-cross-origin"
          }
        ]
      }
    ]
  }
}
```

**CSP Breakdown**:

- `default-src 'self'` - Only load resources from own domain
- `script-src 'self' 'unsafe-inline'` - Allow inline scripts (needed for Hugo analytics)
- `connect-src ... scouting.org` - Allow AJAX/fetch to external domains
- `frame-ancestors 'none'` - Prevent clickjacking

**Benefits**:

- Prevents XSS attacks
- Security signal to search engines
- User trust (🔒 in browser)

**Status**: 🔨 TODO - Add to firebase.json

---

## Post-Launch Monitoring

### Google Search Console

**Setup**: User will handle domain verification post-launch

**Verification method options**:

1. DNS TXT record (recommended for Firebase Hosting)
2. HTML meta tag in `<head>`

**Key reports to monitor**:

- **Performance**: Queries, impressions, CTR, average position
- **Coverage**: Indexed pages, errors, excluded pages
- **Core Web Vitals**: LCP, FID, CLS for real users
- **Sitemaps**: Submit sitemap, monitor indexing status
- **Mobile Usability**: Responsive design issues

**Target metrics** (3-6 months post-launch):
| Metric | Target |
|--------|--------|
| Indexed pages | 286+ (143 landing + 143 requirements) |
| Average position for "[badge] requirements" | Page 1 (position 1-10) |
| Organic CTR | > 5% for top queries |
| Core Web Vitals | "Good" status (green) |

### Analytics

**Current**: Google Analytics already set up via `partials/head/analytics.html`

**Verify tracking**:

- Page views by URL
- Bounce rate by page type
- Time on page (engagement signal)
- Most viewed badges
- Search queries (if using GA4 site search tracking)

**Status**: ✅ Analytics implemented

### Monitoring Checklist

- [ ] Submit sitemap to Google Search Console
- [ ] Monitor indexing status (all 286 pages indexed?)
- [ ] Track rankings for target keywords
- [ ] Review Core Web Vitals monthly
- [ ] Check for crawl errors weekly (first month)
- [ ] Monitor search query performance

---

## Future Enhancements

### GitHub Issues to Create

#### 1. Deep Link Open Graph Tags

**Issue**: Support OG tags for specific requirement anchors

**Description**:
When sharing a link like `/merit-badges/camping/requirements/#1.a`, the OG preview should show:

- Title: "Camping Merit Badge - Requirement 1a"
- Description: "{requirement text}"
- Image: Camping badge

**Implementation**:

- JavaScript to detect URL hash
- Dynamically update OG meta tags
- OR: Server-side rendering with query params

**Priority**: Low (nice-to-have for social sharing)

#### 2. Resources Section

**Issue**: Create `/resources/` section with guides and tracking sheets

**Content ideas**:

- "How to prepare for [Eagle-required badge]"
- Merit badge tracking spreadsheet
- Tips by badge difficulty level
- Merit badge counselor finder (future integration)

**Benefits**:

- Builds topical authority
- Targets additional keywords ("merit badge tracker", "merit badge tips")
- Keeps users engaged longer
- Creates shareable resources

**Priority**: Medium (post-launch content expansion)

#### 3. Version History Pages

**Issue**: Add `/merit-badges/{badge}/history/` pages

**Description**:

- Show when requirements changed
- Archive old requirement versions
- Help users who started badge under old requirements

**Implementation**:

- Track requirement changes in git
- Generate diff view
- Display update notices on requirements page

**Priority**: Medium (good for returning users)

#### 4. Related Badges Auto-Detection

**Issue**: Implement post-processing script to detect related badges

**Description**: See [Internal Linking Strategy](#internal-linking-strategy) section above

**Priority**: High (improves SEO and UX)

#### 5. Improve Schema hasPart

**Issue**: Include all top-level requirements in Course schema

**Description**: See [Structured Data](#structured-data-json-ld) section above

**Current**: Only includes first 5 requirements
**Target**: Include all top-level requirements (e.g., #1-#10)

**Priority**: High (better semantic representation)

#### 6. BreadcrumbList Schema

**Issue**: Add BreadcrumbList to requirements pages

**Description**: See [Structured Data](#structured-data-json-ld) section above

**Priority**: Medium (helps with navigation in SERPs)

#### 7. Organization Schema

**Issue**: Add Organization schema to homepage

**Description**: See [Structured Data](#structured-data-json-ld) section above

**Priority**: Medium (establishes brand entity)

#### 8. Alt Text Updates

**Issue**: Update alt text to "{Badge name} badge illustration"

**Files to update**:

- `layouts/merit-badges/list.html`
- Any landing page templates

**Priority**: Low (minor improvement)

#### 9. 404 Page Enhancement

**Issue**: Create custom MBU-branded 404 page

**Current**: Generic Hugo 404
**Target**: Branded 404 with badge search, popular badges links

**Bonus**: Smart suggestions for discontinued/renamed badges

**Priority**: Low (edge case handling)

---

## Implementation Checklist

### High Priority (Pre-Launch)

- [ ] Configure Hugo sitemap with git-based lastmod dates
- [ ] Add BreadcrumbList schema to requirements pages
- [ ] Update Course schema to include all top-level requirements
- [ ] Add Organization schema to homepage
- [ ] Create robots.txt with sitemap location
- [ ] Add CSP headers in firebase.json
- [ ] Add preconnect for scouting.org
- [ ] Add hreflang="en-US" tag
- [ ] Enforce trailing slash canonicals (verify current implementation)
- [ ] Verify all 143 badges have meta descriptions

### Medium Priority (Post-Launch Week 1)

- [ ] Submit sitemap to Google Search Console
- [ ] Set up Google Search Console monitoring
- [ ] Create GitHub issue for related badges detection
- [ ] Create GitHub issue for /resources/ section
- [ ] Verify lazy loading on listing page
- [ ] Test Core Web Vitals with Lighthouse

### Low Priority (Post-Launch Month 1)

- [ ] Create custom 404 page
- [ ] Add deep link OG tags (GitHub issue)
- [ ] Update alt text for all badge images
- [ ] Create version history feature (GitHub issue)
- [ ] Monitor search rankings and adjust strategy

---

## Success Metrics

### 3 Months Post-Launch

- **Primary Goal**: Page 1 ranking for "[badge name] requirements" for top 20 popular badges
- Google Search Console: 286+ pages indexed
- Core Web Vitals: All "Good" (green) status
- Organic traffic: Establish baseline and 10% growth

### 6 Months Post-Launch

- **Primary Goal**: Position 1-3 for "[badge name] requirements" for Eagle-required badges
- Featured snippets: 5+ badges appearing in Google answer boxes
- Organic traffic: 50% growth from 3-month baseline
- Engagement: < 40% bounce rate, > 2 min avg session

### 12 Months Post-Launch

- Dominate "merit badge requirements" keyword space
- 100k+ organic visitors per month
- Brand recognition: "merit badge university" branded searches growing
- Authority: Backlinks from scouting forums, troop websites

---

## Notes & References

### Keyword Research Data

_TODO: Add search volume data for top queries_

- "camping merit badge requirements" - Estimate: [research needed]
- "first aid merit badge" - Estimate: [research needed]
- "eagle required merit badges" - Estimate: [research needed]

### Competitive Analysis

**Main Competitors**:

1. **scouting.org** (official) - High authority, poor UX
2. **meritbadge.org** - Similar concept, check their approach
3. **usscouts.org** - Comprehensive but dated design

**Our Advantages**:

- Better UX and search functionality
- Faster page loads
- Mobile-optimized
- Clean, modern design
- Focus on requirements (core user need)

### Tools & Resources

- **Hugo Docs**: https://gohugo.io/templates/sitemap-template/
- **Schema.org**: https://schema.org/Course
- **Google Search Central**: https://developers.google.com/search
- **Web Vitals**: https://web.dev/vitals/

---

## Document Revision History

- **2026-01-08**: Initial specification created based on comprehensive interview
- **[Future]**: Update with search volume data post-launch
- **[Future]**: Adjust strategy based on Search Console insights

---

**End of Specification**

_This document should be treated as a living specification. Update as implementation progresses and post-launch data informs strategy adjustments._
