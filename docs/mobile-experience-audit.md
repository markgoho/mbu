# Mobile Experience Audit

**Date:** 2026-07-30
**Method:** Real Chrome driven via Playwright against `localhost:1313`, viewport
390×844 (iPhone 14/15 logical size) with a second pass at 320×700 (iPhone SE /
small Android). Pages walked: home, `/merit-badges/`, `/merit-badges/eagle-required/`,
a category page, a badge landing page (`camping`), a requirements page
(`camping`, `cooking`), a DRG guide page, a DRG worksheet subpage, `/search/`,
and 404. Both light and dark themes.

**Scope:** this document only identifies and evidences problems. It proposes no
solutions and makes no changes.

---

## Summary

The site is *not* broken on mobile — the type scale is comfortable, dark mode is
well-tuned, images are AVIF and mostly lazy-loaded, and several patterns (the
CSS-only DRG nav `<details>`, the radio carousel) are appropriately low-powered.

What keeps it from a 10/10 is a specific cluster of problems:

1. **One layout bug leaks onto every page** — the navbar overflows the viewport,
   so the entire site scrolls sideways.
2. **Desktop DOM order is shipped to mobile unchanged.** The sidebar stacks
   *above* the content, so badge landing and requirements pages spend their
   entire first screen on chrome, and then repeat that chrome again lower down.
3. **Nothing is reachable.** Page heights run from 3.5k to 52k pixels with no
   sticky navigation, no filtering, and no in-page jumping.
4. **Mobile is treated as read-only.** Progress tracking, deep-linking, and
   worksheets are all either desktop-gated or print-gated.
5. **The homepage ships a 930 KB decorative JPEG** — 56% of its total payload.

Findings are grouped by severity below. Each carries the measurement that
produced it so it can be re-verified.

---

## P0 — Broken

### 1. The navbar CTA overflows the viewport on every page

`hugo/assets/css/header.css:7` sets the mobile grid to
`grid-template-columns: min-content 1fr min-content min-content`. The logo
column is `min-content`, but the logo is an `<h2>` reading "Merit Badge
University" — its `min-content` width is the width of the word "University" at
display size. That eats the row, the `1fr` collapses to zero, and
`.navbar__cta` is pushed past the right edge.

| Viewport | `document.scrollWidth` | Overflow |
| --- | --- | --- |
| 390 px | 403 px | 13 px |
| 320 px | 395 px | **75 px (23% of the screen)** |

Consequences:

- Every page in the site can be swiped horizontally.
- "Browse Badges" — the primary navigation action — is clipped at 390 px and
  substantially off-screen at 320 px.
- Confirmed present on home, `/merit-badges/`, category, landing, requirements,
  guide, worksheet, search, and 404. It is the *only* overflowing element on
  any page tested, so fixing it clears horizontal scroll site-wide.

### 2. The mobile header consumes 143 px of a 844 px screen

The logo wraps to three lines ("Merit / Badge / University"), giving a 143 px
static header on every page — 17% of the viewport, permanently, on a site whose
core content is long-form reading. It is not sticky, so it also provides no
value once you scroll.

---

## P1 — Structurally wrong for mobile

### 3. Badge landing and requirements pages open on a full screen of sidebar

On `/merit-badges/camping/` and `/merit-badges/camping/requirements/`, the
desktop sidebar is emitted before `<main>` content in the DOM, so on mobile it
stacks on top. The first 844 px — the entire first screen — is:

> badge icon · "HOBBIES" · "Camping" · "MERIT BADGE" · Overview/Requirements/Study
> Guide links · "10 Requirements" · "Updated March 29, 2026" · "Eagle Required" ·
> View Official Page · Download Free Pamphlet · Download Fillable Worksheet

The `<h1>` and the first actual requirement do not appear until roughly 1,050 px
down. A mobile user arriving from search sees zero content above the fold.

### 4. The same information is printed two and three times per page

Because the sidebar is not adapted for mobile, its contents are duplicated by
the mobile-native layout further down the page:

| Content | Sidebar (screen 1) | Body (screens 2–4) |
| --- | --- | --- |
| Badge title | "Camping / MERIT BADGE" | "Camping Merit Badge" (hero) |
| Category | "HOBBIES" | "HOBBIES" chip |
| Eagle status | "Eagle Required" pill | "At a glance" row |
| Requirement count | "10 Requirements" | "At a glance" row |
| Updated date | "Updated March 29, 2026" | "At a glance" row |
| Worksheet / pamphlet / official page | 3 links | "Resources & downloads" (4 links) |

Roughly 40% of the mobile landing page is repeated content.

### 5. `/merit-badges/` is a 52,000 px wall with no way through it

- `document.scrollHeight` = **52,421 px** ≈ 62 full screens.
- 144 badge cards, one per row, ~346 px each.
- **No search field, no filter, no category tabs, no A–Z index, no pagination**
  on the page itself (`document.querySelector('input[type=search], .filter, [data-filter]')`
  returns `null`).

Finding "Woodwork" means scrolling to the very bottom. The only escape is the
separate `/search/` page, which searches requirement *text*, not badge names.

Category pages are better but still long — `/categories/hobbies/` is 7,680 px
for 19 badges.

### 6. Long pages have no sticky navigation or position feedback

| Page | Height at 390 px | Screens |
| --- | --- | --- |
| `/merit-badges/` | 52,421 px | ~62 |
| `/merit-badges/cooking/requirements/` | 13,864 px | ~16 |
| `/merit-badges/camping/requirements/` | 11,218 px | ~13 |
| `/` (home) | 11,468 px | ~14 |
| `/merit-badges/camping/guide/` | 8,136 px | ~10 |

None of these offer a sticky header, a back-to-top control, a progress
indicator, or a requirement/section switcher. Once you are 8,000 px into
Cooking's requirements there is no way to reach requirement 2 except manual
scrolling.

### 7. The DRG guide nav exists but scrolls away immediately

`nav.drg-mobile-nav-wrap` is a native `<details>` "Guide Navigation" disclosure
— a genuinely good, low-powered pattern. But `getComputedStyle` reports
`position: static`, so it disappears after the first 93 px of an 8,136 px
article. A reader 6,000 px deep must scroll all the way back to the top to
change section.

---

## P2 — Mobile treated as second-class

### 8. Deep-linking to a requirement is disabled on mobile

`hugo/assets/css/pages/merit-badge-requirements.css:489` sets
`.req-actions { display: none }` below 768 px. All "Copy link to requirement
N" controls measure **0 × 0** at 390 px.

Texting a counselor a link to requirement 3.b is an inherently *mobile* action,
and it is available only on desktop. Two follow-on effects:

- The `@media (hover: none)` block at line 701, which reveals these controls on
  touch devices, is dead code — its parent is `display: none` at every width
  where it could match.
- The hidden labels are still indexed (see finding 10).

### 9. Worksheets and logs are print-only dead ends on mobile

`/merit-badges/athletics/guide/training-log/` renders blank ruled fill-in lines
and an empty 3-column table, captioned *"Print multiple copies of this page."*
On a phone this is 4,776 px of un-fillable, un-savable, un-printable page. The
same applies to the "Download Fillable Worksheet" PDF path — a PDF form is a
poor mobile artifact.

There is no way for a Scout to record any progress on a phone. No checkbox, no
local state, no completion marker anywhere in the requirements UI.

### 10. Search results are unreadable on a small screen

Querying "first aid" from `/search/` returns 44 results whose snippets are raw
scraped text:

> **First Aid** — "or collarbone fractures. 8.d.2. `First` `Aid.` 2 Elastic wrap
> and cravat bandages for ankle sprain. 8.d.3. `First` `Aid.` 3 Elastic wrap and
> cravat bandages for wrist sprain or…"
>
> - `Eagle_required: true`

> **Basketry** — "Requirements. 1. Basketry. 1 Safety `First.` Safety & `First`
> `Aid.` Do all. **Copy link to requirement 1.** Do the following: 1.a. Basketry.
> a. Explain to your counselor th…"

Specific problems:

- Snippets begin mid-sentence and are dominated by requirement path numbers.
- **UI chrome is in the search index** — "Copy link to requirement 1" (the
  `aria-label` from finding 8) appears as body text in results.
- **A raw data key is rendered to users** — `Eagle_required: true` as a bullet.
- Highlighting fragments the phrase into separate pills (`First.` … `Aid.`).
- Result thumbnails are ~90 px-wide vertical slivers cropped from 16:9 landscape
  card images.
- No grouping by badge and no filtering, so 44 results is a flat list.

On desktop the extra width hides some of this. On a 390 px screen the snippet is
the entire result.

### 11. The search page buries its own input

`/search/` spends 400 px on a wrapping `<h1>` and subtitle before the input.
Results begin ~560 px down — with the software keyboard open, effectively
nothing is visible.

- The input is not autofocused, on a page whose only purpose is search.
- It is `type="text"`, not `type="search"`, so there is no native clear affordance;
  a separate "Clear" button takes 100 px of a 390 px row, squeezing the input to
  257 px and truncating its own placeholder.
- Good: `font-size: 18.26px` (no iOS zoom-on-focus), `enterkeyhint="search"`,
  `autocapitalize="none"`.

---

## P3 — Performance

### 12. A 930 KB decorative JPEG is 56% of the homepage payload

Measured on first load at 390 px:

```
15 requests · 1,647 KB total
  image      1,399 KB
  font         131 KB
  other        117 KB
```

Top entry: **`prototype-hero-image.jpg` — 930 KB**.

`hugo/layouts/partials/home/hero.html:66` renders it as
`<img src="/prototype-hero-image.jpg" alt="" loading="lazy">` inside
`.hero-d__bg`. It is:

- purely decorative (`alt=""`),
- the only raw JPEG on the site — every other image is AVIF (the largest AVIF is
  165 KB),
- served at one fixed size with no `srcset`,
- named `prototype-*` and living in `hugo/static/`, suggesting it was never
  swapped out,
- marked `loading="lazy"` despite being above the fold, which delays the hero
  rather than helping.

On a typical 4G connection this file alone is several seconds of the homepage.

### 13. Card images have no `srcset`

Badge card images are AVIF at a fixed 600 × 335 rendered into a 356 px CSS box.
On a 3× phone the effective need is ~1,068 px, so cards are visibly soft on
modern displays; on a 320 px phone the same 600 px file is oversized. There is
no `sizes`/`srcset` pair on any of them.

Lazy loading itself is fine: on `/merit-badges/`, 137 of 143 images are `lazy`
with 6 eager.

---

## P4 — Polish and platform integration

### 14. No mobile platform integration at all

- **No web app manifest** (`/manifest.json` → 404) and no `apple-touch-icon`, so
  the site cannot be added to a home screen as an app.
- **No `theme-color` meta**, so on a dark-first site the browser's own chrome
  stays light and clashes with the page.
- **No service worker / offline story.** This is the sharpest gap for the actual
  use case: Scouts and counselors need requirement text at camp, where there is
  no signal. Requirements are static text and are an ideal offline candidate.
- **`viewport` lacks `viewport-fit=cover`** and no `env(safe-area-inset-*)`
  padding exists anywhere in the CSS, so notch/home-indicator areas are unused.
- Good: the viewport meta does **not** set `maximum-scale` or `user-scalable=no`,
  so pinch-zoom works.

### 15. Tap targets below the 44 px minimum

Present on every page:

| Element | Size | Note |
| --- | --- | --- |
| `LABEL.button` theme toggle | 40 × 40 | |
| `A.button` search | 59 × 40 | |
| `A.breadcrumb__link` "HOME" | 47 × **21** | |
| `A.breadcrumb__link` "CAMPING MERIT BADGE" | 188 × **21** | |
| `A.req-card__guide-link` "View Study Guide" | 164 × **27** | requirements |
| `A.badge-identity__eyebrow-category` "HOBBIES" | 55 × **27** | is a link |
| `A.drg-worksheet__back-link` | 200 × **27** | worksheet pages |

Breadcrumbs at 21 px tall, sitting adjacent to each other, are the worst case.

### 16. Text below 14 px

| Element | Size | Content |
| --- | --- | --- |
| `A.badge-identity__eyebrow-category` | 10.8 px | "HOBBIES" — also a tap target |
| `SPAN.badge-identity__micro-tag` | 10 px | "MERIT BADGE" |
| `SPAN.badge-card__category-text` | 11 px | "HOBBIES" |
| `SPAN.badge-card__eagle` | 10 px | "EAGLE REQUIRED" |

10 px uppercase on a phone is near the legibility floor, and one of these is
also an interactive element.

### 17. Nested requirement text is squeezed at small widths

Measured line boxes on `/merit-badges/cooking/requirements/`:

| Depth | 390 px viewport | 320 px viewport |
| --- | --- | --- |
| Requirement | 353 px | ~285 px |
| Sub (a., b.) | 295 px | ~230 px |
| Sub-sub (1., 2.) | **258 px** | **~190 px** |

At 320 px the deepest level renders roughly four words per line — the combined
cost of card padding, the left rail, and the hanging marker consumes ~40% of the
screen. Cooking, with heavy three-level nesting, is the worst case.

### 18. Low-density card grids inflate scroll length

Category cards on the homepage are single-column, ~164 px tall, and contain only
an icon, a name, and a badge count. Fourteen of them span ~2,300 px. The same
holds for the badge card grid. Nothing about the content requires full width at
390 px.

### 19. The homepage hero carousel is not swipeable

The hero is a CSS radio carousel (`hugo/assets/css/pages/home.css:509`) — a
sound low-JS choice. But it has `scroll-snap`, `overflow-x`, and `touch-action`
nowhere, so it cannot be swiped, which is the one interaction a phone user will
attempt. Its prev/next arrows are also ~920 px down the page, well below the
featured badge card they control, so the relationship between them is not
visible on any single screen.

---

## What is already good

Worth preserving through any changes:

- Body type scale and line height read well at 390 px in both themes.
- Dark mode is well-tuned; light mode holds contrast on nested requirement text.
- AVIF everywhere except the one prototype JPEG; lazy loading correctly applied.
- The DRG mobile nav is a native `<details>`, and the hero carousel is
  radio-driven — both avoid JS for non-temporal behaviour.
- Search input typography and `enterkeyhint` are already mobile-correct.
- Pinch-zoom is not disabled.
- Only one element overflows anywhere on the site, so the horizontal-scroll
  problem has a single root cause.

---

## Verification notes

- Overflow, tap-target, and font-size numbers came from a scripted DOM sweep run
  per page; page heights from `document.documentElement.scrollHeight`.
- Payload figures are from `content-length` on a `load`-complete homepage visit,
  so they reflect uncompressed asset size, not gzip transfer.
- `/eagle-required/` 404s; the real route is `/merit-badges/eagle-required/`,
  which is what the homepage and badge index link to. Not a bug.
