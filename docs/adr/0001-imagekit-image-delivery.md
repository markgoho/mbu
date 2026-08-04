# ADR 0001 — Image delivery moves to ImageKit

- **Status:** Accepted
- **Date:** 2026-08-04
- **Applies to:** `hugo/layouts/partials/imagekit/**`, `scripts/migrate-images-to-imagekit.ts`,
  `scripts/verify-imagekit.ts`, `hugo/data/badge-images.json`, every `guide/images.json`
- **Related:** `.claude/skills/drg-images/SKILL.md`

## Context

MBU tracked ~2,270 image files (~290 MB) in git and shipped all of it to
Firebase Hosting: 143 badge emblem PNGs (consumed only by `og:image`), 143
emblem AVIFs + 143 card AVIFs, 1,826 DRG guide AVIFs, and an uncached hero
JPEG. Every size was baked offline by `sharp` and committed — no Hugo image
processing, no `srcset`, no `<picture>`, and 1,828 `<img>` tags with no
`width`/`height` (sitewide CLS). `<img>` markup was duplicated across 8
templates, each with its own `Resources.GetMatch` fallback chain.

Moving delivery to ImageKit means one uploaded master per image, with every
derivative generated on demand at the edge.

## Decision

**Upload-and-delete, full scope:** emblems, DRG guide images, homepage hero,
and OG images all move to ImageKit; the local files are removed from git
after upload (`.git` history still retains the blobs — this is a working-tree
and deploy-upload win, not a history rewrite).

**Account:** a shared ImageKit account also used by doula.coop
(`https://ik.imagekit.io/doulacoop`). A dedicated `mbu` URL-endpoint was
tried and rejected — ImageKit's router treats a leading `/mbu/` path segment
as an endpoint switch even when addressed via the *default* endpoint, so a
real folder also named `/mbu/` becomes unreachable through the default
endpoint (confirmed empirically: identical file, 404 via the "clean" URL,
200 only via the doubled `/mbu/mbu/...` URL). Instead: **plain default
endpoint**, every MBU object path prefixed **`/mbu-assets/`** (a name
distinct from any endpoint identifier, so no shadowing) — e.g.
`/mbu-assets/merit-badges/camping/emblem`.

**Object naming:** deterministic paths derived from what Hugo already knows
— no front matter, no URL manifest, no file extension (extension-less
paths are what let format negotiation pick AVIF/WebP/JPEG per request; only
*transformed* URLs — i.e. anything with a `tr:` segment — resolve, bare
untransformed paths 404 on this account, which is fine since every caller
goes through `tr:w-<N>`):

```
/mbu-assets/merit-badges/{slug}/emblem
/mbu-assets/merit-badges/{slug}/guide/{id}
/mbu-assets/site/hero
/mbu-assets/site/og-default
```

Uploads use `useUniqueFileName: false, overwriteFile: true` so re-runs
overwrite in place and paths never drift.

**Emblem master is the PNG, not the AVIF.** The PNG is lossless
1376×768 (~912 KB); the sibling AVIF is 1200×670 q80 (~165 KB). Master size
never affects delivered bytes (ImageKit only serves derivatives), so this is
a pure quality-ceiling decision: an AVIF master would permanently cap
resolution at 1200px and double-compress the `og:image` JPEG (AVIF-q80 →
JPEG-q80 re-encoding artifacts). Both emblem AVIF variants (286 files) were
deleted, not uploaded — ImageKit regenerates both from the PNG.
`transformation.pre = "w-1400,c-at_max"` on emblem ingest is a no-op today
(source is 1376px) and only guards a future higher-res source. DRG guide
images have no such choice — their PNG sources were already deleted by the
(now-retired) `convert-drg-images-to-avif.ts`, so the existing 800px AVIFs
are the masters, capping the ladder slice at 800 until regenerated.

**Cache versioning, not CDN purge.** ImageKit recommends versioning the URL
over calling the (async, quota-limited) purge API. Every URL carries `?v=`,
the first 8 hex chars of the sha256 of the master file, computed locally at
upload time — content-addressed rather than timestamp-based, so re-running
the migration on unchanged files doesn't bust caches. Stored in git next to
the dimensions: new `width`/`height`/`v` fields in each `guide/images.json`,
and a new `hugo/data/badge-images.json` (mirrors the `badge-icons.json`
precedent — Hugo reads it via `hugo.Data`).

**One shared width ladder**, `[400, 600, 800, 1200, 1600]`, every context
selecting a contiguous slice ≤ its `maxWidth` — a card at 400 CSS px and a
hero at 400 CSS px then share a cache entry. Quality (80) and format
optimization are **account-level dashboard settings**, not URL params —
`q-80`/`f-auto` in every URL would only fragment the cache key; `q-auto` in
particular isn't even a valid ImageKit parameter (that's Cloudinary).

**Named transformations** (dashboard-defined, unlock the "restrict unnamed
transformations" security setting) are used *only* for the one fixed,
non-responsive preset that pays for itself: `mbu-og`
(`w-1200,h-630,cm-pad_resize,bg-1a1c1e,f-jpg`, forcing JPEG because several
social scrapers still choke on AVIF/WebP). Named because the account is
shared with doula.coop — a bare `og` name would risk a future collision.
The responsive ladder stays as *inline* transformations in git, in one
partial — named transformations don't compose with a width ladder
(`tr:n-x:w-800` chains rather than overrides, degrading quality). Because of
this, **"restrict unnamed transformations" stays off** — turning it on would
break `srcset`.

**Print pages are text-only, no images at all** — not even the badge
emblem in the print header, and inline DRG guide photos are hidden via
`@media print { .drg-illustration { display: none } }`. This was a scope
narrowing from the original plan (which had a `print` named transformation
for a small badge-emblem header image): printed worksheets and complete
guides don't need photos, so there's no `print` preset and no print-specific
ImageKit request at all.

**The seam:** two Hugo partials are the entire integration surface —
`imagekit/url.html` (builds one URL, the only place that knows the
`/tr:.../` path syntax) and `imagekit/img.html` (the only place `<img>` is
written; `width`, `height`, and `sizes` are **required** parameters, which
is what structurally prevents the CLS/over-fetch regressions from coming
back). Eight templates and one shortcode (`drg/image`) were converted to
call these instead of `Resources.GetMatch`.

**The `drg/image` shortcode's build-time guarantee moved from the
filesystem to the manifest:** it used to `errorf` when a local file was
missing; now it resolves the id (stripped of any `images/` prefix and
`.avif` suffix) against `guide/images.json`, and `errorf`s if the id, or its
`width`/`height`/`v`, isn't there — same failure mode, same loud build
break. Two pre-existing content quirks needed fixing to keep this uniform:
`forestry/guide/_index.md` and `mining-in-society/guide/_index.md` each
inlined their own badge emblem via `drg/image` with a bare filename (no
`images/` prefix, and in forestry's case, no manifest entry at all). Both
were normalized into ordinary guide-image manifest entries rather than
special-cased in the shortcode.

**Generation pipeline:** `scripts/generate-drg-images.ts` still generates
PNGs locally (staging). `scripts/convert-drg-images-to-avif.ts` (the local
resize/AVIF-encode step) is retired — `scripts/migrate-images-to-imagekit.ts`
now uploads whichever master it finds (`.avif` for the one-time bulk
migration, `.png` for anything generated afterward) and deletes the local
PNG after a successful upload. `BADGE_SLUGS` filters a targeted re-run,
matching the `detect:links` convention elsewhere in the repo.

## Consequences

- `hugo/public` drops from ~808 MB to well under 100 MB; CI checkout, Hugo
  build time, and Firebase deploy upload all shrink accordingly.
- `.git` history is unchanged (~290 MB of blobs remain) — this was an
  explicit non-goal; a history rewrite was considered and rejected as not
  worth the disruption.
- `firebase.json`'s CSP `img-src` narrows from `'self' data: https:` to
  `'self' data: https://ik.imagekit.io` — with exactly one image origin, the
  wildcard bought nothing.
- Local dev (`bun run hugo:dev`) now hits the production ImageKit CDN
  unconditionally for every image — no keys, no config, but also no offline
  image fallback.
- Deleting a DRG image going forward is a two-step action (remove the
  manifest entry/shortcode *and* delete the file on ImageKit via the API or
  dashboard) instead of one `git rm`.

## Dashboard configuration (outside git)

Configured once on the shared ImageKit account, applies account-wide
(including to doula.coop):

- Default quality **80**, format optimization **on**.
- Named transformation `mbu-og`: `tr:w-1200,h-630,cm-pad_resize,bg-1a1c1e,f-jpg`
  (the dashboard field requires the literal `tr:` prefix).
- "Restrict unnamed transformations" **off**.
- No per-endpoint folder scoping is relied on — isolation from doula.coop's
  content comes entirely from the `/mbu-assets/` path prefix.
