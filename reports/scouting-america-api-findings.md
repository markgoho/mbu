# Scouting America API Findings

This note documents what we observed from two sampled public-but-undocumented Scouting America API endpoints:

- `https://api.scouting.org/advancements/v2/meritBadges`
- `https://api.scouting.org/advancements/meritBadges/26/requirements`

Sample payloads were saved locally for inspection:

- `tmp/api-investigation/meritBadges-v2.json`
- `tmp/api-investigation/meritBadge-26-requirements.json`

## Current MBU data model

MBU’s current canonical badge JSON lives in `hugo/data/merit-badges/*.json` and is consumed directly by templates like:

- `hugo/layouts/merit-badges/list.html`
- `hugo/layouts/merit-badges/requirements.html`

A representative current badge file (`hugo/data/merit-badges/camping.json`) includes:

- top-level badge metadata: `title`, `slug`, `url`, `eagle_required`, `pamphlet_url`, `last_updated`
- a **nested** `requirements` tree
- per-requirement `path`
- nested `subrequirements`
- `subrequirement_mode` for select/all logic
- optional `resources`

This is an important contrast with the sampled requirements API, which returns a **flat** list and reconstructs hierarchy through parent IDs.

## Most valuable discoveries

### Categories

The badge catalog endpoint exposes:

- `category`
- `categoryId`

This is the clearest net-new metadata win. MBU currently has eagle/non-eagle status, but not a broader taxonomy like Business and Industry, Personal Development, Natural Science, etc.

Potential future value:

- category browsing
- category filters
- category landing pages or grouping

### Official image URLs

The API exposes badge image URLs such as:

- `imageUrl50`
- `imageUrl100`
- `imageUrl200`

These appear to be hosted on a Scouting America CDN / CloudFront-backed image host and could be useful if MBU wants official badge emblems without generating or storing local assets.

### API badge ID

The catalog endpoint exposes a numeric `id` for each badge.

This appears to be the join key used by other API endpoints, including the sampled requirements endpoint:

- `/advancements/meritBadges/{id}/requirements`

This ID would be useful if MBU ever wants to cross-link badge metadata, image URLs, and requirements data from the API.

### Version metadata

The badge catalog payload includes a `versions` array with fields like:

- `version`
- `versionEffectiveDt`
- `versionExpiryDt`

This looks more structured than some legacy-looking date fields and may be useful for tracking official requirement revision timing.

### SKU and pricing metadata

The catalog payload includes:

- `sku`
- `price`
- `priceLastUpdated`

This is not essential to the current site, but it could support future pamphlet or Scout Shop integrations.

## Requirements API vs current MBU model

The sampled endpoint `https://api.scouting.org/advancements/meritBadges/26/requirements` returns top-level badge metadata plus a flat `requirements` array.

Observed requirement fields include:

- `id`
- `name`
- `listNumber`
- `requirementNumber`
- `sortOrder`
- `childrenRequired`
- `required`
- `parentRequirementId`
- `daysRequired`
- `counselorApproval`
- `footer`

### Structural difference

Current MBU model:

- nested tree
- explicit `path`
- `subrequirements`
- `subrequirement_mode`
- optional curated/extracted `resources`

Sampled API model:

- flat rows
- parent/child reconstruction via `parentRequirementId`
- requirement labeling via `listNumber` and `requirementNumber`
- child selection hints via `childrenRequired`
- no equivalent nested structure ready for direct rendering

### What looks promising

The requirements endpoint does expose some potentially useful structure hints:

- `parentRequirementId` can reconstruct hierarchy
- `childrenRequired` may help infer select-N behavior
- `requirementNumber` provides official numbering like `3a` or `4c[1]`
- `sortOrder` looks useful for ordering flat items before tree reconstruction

### Why it is not a drop-in replacement

The sampled payload is materially different from MBU’s current JSON shape.

Key gaps / concerns:

- values that should be booleans or numbers often arrive as strings
- hierarchy must be reconstructed instead of being provided directly
- no current equivalent to MBU’s nested `path` representation
- no current equivalent to MBU’s extracted `resources`
- `subrequirement_mode` would need to be inferred rather than read directly

## Cautions and red flags

### Stringly typed values

In the sampled requirements payload, many values that should be typed are strings, including:

- badge IDs
- requirement IDs
- booleans like `required` and `counselorApproval`
- numbers like `childrenRequired`

This means any future use would need normalization and careful parsing.

### Legacy / stale-looking fields in catalog payload

Several fields appear questionable or legacy-oriented and should not be trusted without deeper validation:

- `bsaRequirements`
- `worksheetPDF`
- `worksheetDOC`
- `pageURL`
- `lastUpdated`
- `adminNotes`

Concerns include:

- old-looking URL patterns
- third-party worksheet references
- fields that look like internal CMS carryovers
- date fields that may not reflect current requirement versions

### Requirements endpoint versioning split

The catalog endpoint uses a `/v2/` path:

- `/advancements/v2/meritBadges`

The sampled requirements endpoint does **not**:

- `/advancements/meritBadges/26/requirements`

That inconsistency suggests the API surface may have evolved unevenly and should be treated carefully.

## Notable mismatches already observed

These are observations from the sampled investigation and codebase inspection, not a full census.

### Naming drift / rename candidates

The API appears to include naming that may differ from the current static badge list in `scripts/merit-badges.ts`.

Examples surfaced during exploration:

- `Indian Lore` vs `American Indian Culture`
- `Artificial Intelligence` vs `Artificial Intelligence (AI)`

These are exactly the kinds of cases that would need explicit handling if MBU ever joins on title or slug.

### Discontinued / missing badge behavior

The current repo’s static badge list includes discontinued metadata, for example `Citizenship in Society` is marked discontinued in `scripts/merit-badges.ts`.

That kind of badge lifecycle state may not line up perfectly with what the API currently returns, so the API should not be assumed to be a perfect source of truth for historical or discontinued badge handling.

## Safe takeaway

From the sampled investigation, the most promising fields are:

- `category`
- `categoryId`
- `imageUrl50`
- `imageUrl100`
- `imageUrl200`
- API badge `id`
- `versions[].versionEffectiveDt`
- `sku`
- `price`
- `priceLastUpdated`

The least trustworthy / most suspicious fields are:

- `bsaRequirements`
- `worksheetPDF`
- `worksheetDOC`
- `pageURL`
- `lastUpdated`
- `adminNotes`

Promising but requiring careful validation before any use:

- `parentRequirementId`
- `childrenRequired`
- `requirementNumber`
- `sortOrder`
- `daysRequired`
- `counselorApproval`
- `footer`

## Bottom line

This undocumented API looks most useful as a **metadata source**, not yet as a replacement for MBU’s current requirements extraction pipeline.

Best findings from this investigation:

1. categories are a real net-new win
2. official image URLs look useful
3. API badge IDs and version metadata could support future enrichment
4. the requirements endpoint is interesting, but structurally different enough that it should be treated as exploratory rather than production-ready
