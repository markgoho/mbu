---
name: drg
description: Produce a Digital Resource Guide for a Scouting America merit badge. Use this when the user wants to create a new guide, work on guide content, or asks about Digital Resource Guides.
argument-hint: <badge-slug>
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - AskUserQuestion
  - Task
  - EnterPlanMode
  - Agent
  - TaskOutput
---

# Digital Resource Guide — Production Skill

Produce a Scouting America Digital Resource Guide for any merit badge. The user provides a badge slug (e.g., `camping`) and you work through the guide section-by-section.

## Input

The badge slug is passed as `$ARGUMENTS`. Use it to locate:

- **Requirements data:** `hugo/data/merit-badges/$ARGUMENTS.json`
- **Output directory:** `hugo/content/merit-badges/$ARGUMENTS/guide/`
- **Reference examples:** See "Reference Examples" section below for guides that demonstrate specific techniques. Do not clone any single guide wholesale — study the technique, adapt the approach.

The badge data is centralized under `hugo/data/merit-badges/`. Do **not** look for or describe a per-badge `data.json` inside `hugo/content/merit-badges/$ARGUMENTS/`.


### Reference Examples

Use this table to find guides that demonstrate specific techniques. During Phase 1 (Analysis), browse the relevant exemplar files to absorb the range of approaches — but do not replicate any single guide verbatim.

| Technique                             | Exemplar                                     | What to Study                                                             |
| ------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------- |
| Printable worksheets                  | `bird-study/guide/field-notebook-worksheet/` | Form fields, check grids, draw areas, back-link + print button            |
| Markdown tables for comparisons       | `bird-study/guide/req5.md`, `req6.md`        | Feeding habitat table, beak/foot adaptation tables                        |
| Granular requirement splitting        | `cooking/guide/`                             | 37 pages; distinct sub-parts each get their own page                      |
| Cross-references between requirements | `cooking/guide/req2e.md`                     | Natural inline links ("In Req 1e, you learned...")                        |
| Scenario-driven hooks                 | `astronomy/guide/req1a.md`                   | Concrete scenario used to teach safety, priorities, and what matters first |
| Strong subject-specific intro         | `first-aid/guide/_index.md`                  | Opens with a campsite injury scenario, not a generic greeting             |
| History section with depth            | `bird-study/guide/_index.md`                 | Audubon-era collecting vs. modern citizen science                         |
| Shortcode variety (4–6 types/page)    | `astronomy/guide/`                           | Mixes safety-first, checklist, be-prepared, tip, external-link shortcodes |
| Step-by-step procedural teaching      | `cooking/guide/req5d.md`                     | Numbered procedures, scenario framing, and practical action guidance      |
| Layered explanatory depth             | `bird-study/guide/req10a.md`                 | Dense explanation that teaches the topic instead of briefly naming it     |
| Comparison-table decision support     | `first-aid/guide/req8a.md`                   | Table structure that helps Scouts tell similar conditions and responses apart |

All paths are relative to `hugo/content/merit-badges/`.

If `guide/_index.md` already exists, read the existing guide files and resume from their current state. If `guide/_index.md` does not exist yet, first run `BADGE_SLUG=$ARGUMENTS bun run scaffold:drg` to create the deterministic guide scaffold, then read the generated files and replace placeholders with real content.

The scaffold creates only deterministic structure: `_index.md`, requirement pages, `extended-learning.md`, `print/index.md`, front matter, `guide_nav`, prev/next links, exact requirement shortcode blocks, placeholder sections, and official resource stubs. It does **not** write final educational copy or polished titles.

Do not overwrite existing guide files during scaffolding. The scaffold script is idempotent and should only create missing files. Always keep or create `guide/print/index.md` for a printable single-page version of the full guide.

```bash
if [ ! -f "hugo/content/merit-badges/$ARGUMENTS/guide/_index.md" ]; then
  BADGE_SLUG=$ARGUMENTS bun run scaffold:drg
fi
```

After scaffolding, continue by reading the generated files and filling in placeholders in place.

Use the scaffolded file structure as the source of truth for page order and navigation. Replace placeholder titles like `[TITLE]` and `[GROUP: Requirement 1]` with strong editorial titles during writing, but keep the scaffolded file paths and overall page structure unless there is a deliberate reason to change them.

For v1 scaffolds, keep grouping conservative: create deterministic overview pages where the data structure calls for them (such as `select` parents, `is_option` branches, and nested all-of parents with child pages) plus one page per true leaf requirement, instead of trying to predict combined pages like `req5ef.md` during the initial structure pass.

Follow the scaffolded hierarchy as the default writing structure. If the scaffold gives you an overview page and child pages, write into that tree rather than collapsing it back into one giant page unless there is a deliberate editorial reason and you also update navigation consistently.

After scaffolding, you may still make editorial consolidation decisions during writing. If several standalone scaffolded pages clearly work better as one combined teaching page, you may merge them.

When merging scaffolded pages:

- preserve full requirement coverage
- preserve every official resource URL on the correct resulting page
- update `guide_nav` and all `prev`/`next` links consistently
- remove superseded standalone files cleanly once their content has been merged

When resuming an existing guide, do **not** re-scaffold unless the user explicitly wants missing files created.

Keep resource stubs in the dedicated placeholder resource blocks created by the scaffold unless you intentionally move them while preserving every official URL on the correct page.

Use the scaffolded official resource shortcodes as the baseline for requirement pages so `verify:drg-resources` passes as soon as the guide content is complete.

Always preserve the existing Hugo guide architecture: flat markdown files in `guide/`, not page-bundle subdirectories for requirement pages.

Do not create `videos.json` or `images.json` as part of scaffolding or writing.

Always keep file-path expectations aligned with `scripts/verify-drg-resources.ts`.

After writing, run the same verification flow as before:

```bash
BADGE_SLUGS="$ARGUMENTS" bun run verify:drg-resources
bun run build
```

If the scaffold created placeholder content, replace placeholders rather than layering duplicate sections on top.

The rest of this skill describes how to turn that scaffolded structure into a high-quality finished guide.

## Information Architecture

Every guide has exactly **four page types**, in this order for the primary guide flow plus a printable companion:

```
Introduction & Overview  → _index.md
Requirement Pages        → req{N}.md or req{N}{letter}.md
Extended Learning        → extended-learning.md
Printable Companion      → print/index.md
```

**IMPORTANT — Flat files, not page bundles:** Requirement pages and extended-learning are **flat markdown files** in the `guide/` directory (e.g., `guide/req1a.md`, `guide/extended-learning.md`). Do **NOT** create subdirectories with `index.md` files (e.g., ~~`guide/req1a/index.md`~~). The only files that use the `directory/index.md` page-bundle pattern are **worksheets**, the printable companion at `guide/print/index.md`, and the section index `_index.md`.

**Do NOT create `videos.json` or `images.json`.** Those files are managed by separate skills (`drg-videos` and `drg-images`). This skill creates only `.md` files.

### URL Slug Convention

```
/merit-badges/{slug}/guide/              (Introduction & Overview — _index.md)
/merit-badges/{slug}/guide/req1a/        (Requirement 1, sub-part a — file: req1a.md)
/merit-badges/{slug}/guide/req1b/        (Requirement 1, sub-part b — file: req1b.md)
/merit-badges/{slug}/guide/req2/         (Requirement 2, no sub-parts — file: req2.md)
/merit-badges/{slug}/guide/extended-learning/  (file: extended-learning.md)
```

### Page Grouping

Requirements are grouped by top-level number and given a descriptive group title that captures the theme (not just "Requirement 1"). This title appears in the sidebar nav and as a kicker above the H1.

### Sub-requirement Splitting

Requirements with multiple sub-parts (a, b, c) can be **separate pages** or **combined on one page**. Use this heuristic:

- If sub-requirements are thematically similar and short → **one page** (e.g., `req2.md` covering 2a–2c)
- If sub-requirements are thematically distinct or lengthy → **separate pages** (e.g., `req1a.md`, `req1b.md`)

**Combined page naming:** When combining adjacent sub-requirements on one page, concatenate the letters in the filename (e.g., `req5ef.md` for 5e and 5f combined). Use an en dash range in the title: `"Req 5e–5f — Descriptive Title"`. Set `req_number` in front matter to the first sub-requirement (e.g., `"5e"`).

**Combined page internal structure:** A combined page must still preserve clear section boundaries for each covered sub-requirement. After the intro, add an explicit section heading for each sub-requirement in order (for example, `## Requirement 1a: Garden Hazards and Prevention`, then `## Requirement 1b: Preventing and Treating Common Garden Health Problems`). Within each sub-requirement section, use deeper headings (`###`) for subtopics. Do not create sibling `##` headings that blur the boundary between grouped sub-requirements. The goal is that a Scout can instantly see where one sub-requirement ends and the next begins.

### Umbrella Requirement Text

Many top-level requirements have vague umbrella text like "Do the following:" or "Explain the following:" that only makes sense when accompanied by the list of sub-requirements. When a page displays such an umbrella requirement via the `drg/requirement` shortcode, **always add a brief intro paragraph immediately after the shortcode** that lists what topics the page covers (as a bulleted list or short narrative). This orients the reader and prevents the page from opening with a confusing standalone phrase. Example:

```markdown
{{</* drg/requirement number="4" */>}}
Explain the following:
{{</* /drg/requirement */>}}

This requirement covers four topics that every archer needs to understand:

- **Ends and rounds** — how shooting is organized
- **Field, target, and 3-D archery** — the three main formats
- ...
```

This applies to both combined pages (where all sub-requirements appear on one page) and overview pages (where sub-requirements link out to separate pages).

### "Choose One" Requirements

Any requirement whose `subrequirement_mode` has `"type": "select"` in `data.json` always gets a dedicated **overview page** (`req{N}.md`) in addition to individual pages for each option. The overview page is what a Scout reads _before_ choosing — it is not a table of contents stub, it is genuine decision-support content.

There are two structural variants, determined entirely by the `data.json` structure:

#### Variant A: `is_option: true` (named options with nested sub-requirements)

**Data signal:** The subrequirements have `"is_option": true` and a slug `req_id` (e.g., `"beef-cattle"`), and each option has _its own_ subrequirements (`a`, `b`, `c`…). This is a two-level or deeper structure: option → child requirements → possible deeper leaves.

Each option gets its own overview page using the option slug or compact option path in the filename. If that option contains child requirements, the scaffold may also create additional child pages beneath it.

Structure:

- `req6.md` — Overview page (see "Overview Page Content" below)
- `req6-{option-slug}.md` or `req6a.md` — Option overview page
- additional child pages when the option contains nested requirements (for example `req2a1.md`, `req2a1a.md`)

On each option overview page, use the `option` parameter on the `drg/requirement` shortcode:

```markdown
{{</* drg/requirement number="6" option="Dairy Option" */>}}
Complete ONE of the following options:
{{</* /drg/requirement */>}}
```

This renders as "6. Complete ONE of the following options: **Dairy Option**" so the reader immediately knows which option they are viewing. The overview page (`req6.md`) should NOT use the `option` parameter.

When one option contains many numbered child requirements and deeper nested letters, prefer the scaffolded overview-plus-children structure:

- keep the option overview page as navigation and orientation for that branch
- preserve the exact requirement shortcode block on the option overview page
- keep numbered child requirements on their own child pages when the scaffold created them (`2.a.1`, `2.a.2`, etc.)
- keep deeper leaves on their own pages when scaffolded (`2.a.1.a`, `2.a.1.b`, etc.)
- keep each official resource on the page for the exact requirement that owns it in `data.json`
- follow the scaffolded file order and page tree unless you have a deliberate editorial reason to restructure it

Do not assume Golf-style nested option branches should stay on one giant option page. The scaffolded hierarchy is the default source of truth.

#### Variant B: no `is_option` (flat lettered choices)

**Data signal:** The subrequirements have standard lettered `req_id` values (`"a"`, `"b"`, `"c"`) with no `is_option` flag and no nested sub-requirements. This is a one-level structure: the lettered sub-requirements are the leaves.

Each lettered sub-requirement gets its own full page using standard lettered naming.

Structure:

- `req6.md` — Overview page (see "Overview Page Content" below)
- `req6a.md`, `req6b.md`, etc. — Full pages for each option

#### Overview Page Content

Regardless of variant, every `select`-mode overview page must include genuine decision-support content — not just a list of links. The Scout reads this page to decide which path to take.

**Required elements:**

1. **Requirement shortcode** — display the parent requirement text (e.g., "Do ONE of the following:")
2. **Intro sentence** — one sentence making it explicit that the Scout picks exactly ONE (or N, if `count > 1`)
3. **Option summaries** — for each option: name, what the Scout will _do_, and a link to the option page. One or two sentences per option. Integrate the links naturally (e.g., `**[Req 6a — Observe 25 Species](...)**: Get outside and record 25 different species...`)
4. **"How to Choose" section** — structured comparison to help the Scout decide. Use a `drg/checklist` comparing practical factors (time required, equipment needed, location, skill level) OR a markdown table if a grid comparison is more readable. Include at least one sentence per option on **what the Scout will gain** (the skill, knowledge, or experience) — not just what they'll do.
5. **`drg/tip`** — a concrete recommendation: which option suits which kind of Scout, or what prior requirements might give them a head start on a particular option.
6. **Transition CTA** — `drg/next-page` pointing to the first option (conventionally option `a`).

Example "How to Choose" checklist for Variant B:

```markdown
{{</* drg/checklist title="Choosing Your Option" subtitle="Consider these factors before deciding" */>}}

- **Time available**: Option A takes multiple outings over weeks; Option B can be done in a few hours.
- **Equipment needed**: Option C requires dissection tools; Option B requires only a clipboard.
- **Where you'll work**: Option A is field-based; Options B and C work at home or a library.
- **What you'll gain**: Option A builds field identification skills; Option B teaches wildlife law and classification; Option C builds a lasting reference collection.
  {{</* /drg/checklist */>}}
```

The overview page should **not** contain full educational content for any individual option — that belongs on the option pages. Its job is exclusively to help the Scout choose confidently and navigate to the right page.

### Heading & SEO Rules

- Every page has a unique, descriptive `<h1>` matching its sidebar nav link text exactly.
- **H1** comes from `title` front matter.
- **Kicker** (above H1) comes from `group_title` front matter.
- **`<title>` tag** follows: `{title} | {badge_name} Merit Badge`.
- **Badge image** appears only on the Introduction & Overview page (`_index.md`).
- **`badge_name`** is set once in `_index.md` and inherited by child pages.
- **Capitalization:** Sub-requirement letters are always lowercase per `data.json` (use `Req 1a`, not `Req 1A`).
- **Title prefix:** Always use the abbreviated `Req` prefix in page titles (e.g., `"Req 1a — Fire Science"`), not the full word `Requirement`.

## Page Specifications

### \_index.md — Introduction & Overview

**Front matter:**

```yaml
---
title: "Introduction & Overview"
layout: guide
badge_name: "{Badge Title}"
group_title: "Getting Started"
next: "/merit-badges/{slug}/guide/req1a/"
next_title: "Req 1a — {Short Title}"
guide_nav:
  - group_title: "Getting Started"
    items:
      - title: "Introduction & Overview"
        url: "/merit-badges/{slug}/guide/"
  - group_title: "{Descriptive Group Title}"
    items:
      - title: "Req 1a — {Short Title}"
        url: "/merit-badges/{slug}/guide/req1a/"
        is_sub: true
  # ... all requirement pages and groups ...
  - group_title: "Beyond the Badge"
    items:
      - title: "Extended Learning"
        url: "/merit-badges/{slug}/guide/extended-learning/"
---
```

**Content sections (in order):**

1. **Overview paragraph** — 2–4 sentences: What is this subject? Why should a Scout care?
2. **History: "Then and Now"** — "Then" block (historical) and "Now" block (modern). For modern subjects, reframe as "Origins" / "Where We Are Today."
3. **"Get Ready!" motivational callout** — 1–3 encouraging sentences.
4. **"Kinds of {Subject}"** — Catalog varieties/types/domains within the subject. Each gets a heading, 1–2 paragraph description, and Safety First callout if warranted.
5. **Transition CTA** — Bridge sentence + `{{</* drg/next-page */>}}` shortcode linking to first requirement. **This must always be the very last element on the page.**

### Requirement Pages

**Front matter:**

```yaml
---
title: "Req {N}{letter} — {Short Descriptive Title}"
layout: guide
group_title: "{Descriptive Group Title}"
req_number: "1a"
prev: "/merit-badges/{slug}/guide/{prev-page}/"
prev_title: "{Previous Page Title}"
next: "/merit-badges/{slug}/guide/{next-page}/"
next_title: "{Next Page Title}"
---
```

**Content structure:**

1. **Requirement text** — Exact text from `data.json`, displayed via shortcode:

   ```markdown
   {{</* drg/requirement number="{N}{letter}" */>}}
   {exact requirement text}
   {{</* /drg/requirement */>}}
   ```

2. **Educational content** — requirement pages are now written by the `drg-page-writer` subagent. The orchestrator is responsible for assembling the right structured context for each page and making sure requirement-specific resources, navigation, and decomposition data are passed through correctly.

   **Verb Decomposition Output:** For every parent requirement with sub-requirements, produce decomposition in this format before invoking the page writer:

   - **Multi-verb parent** → `type: "multi-verb"`, `verb_phrases: [{ verb, heading_template, content_type }]`
   - **Single-verb parent** → `type: "single-verb"`, `verb_phrases: [{ verb, content_type }]`
   - **Self-contained child** → `type: "self-contained"`
   - **Generic umbrella** → `type: "none"`

   This decomposition is a required handoff artifact. The page writer relies on it to produce correct H3 structure on child pages.

3. **Official resources (MANDATORY)** — Every official resource listed for this requirement in the badge data **must** appear on the page. This is not optional — these are official Scouting resources scraped from scouting.org.
   - **YouTube videos** (URL contains `youtube.com` or `youtu.be`): Use `drg/video` shortcode. Verify each video via the Video Verification Protocol before including it. If verification shows the video is embed-disabled (401), use `drg/external-link` instead. If the video is gone (404), use `drg/external-link` with the URL so the Scout can check if it's been re-uploaded.
   - **Non-video resources** (websites, PDFs, articles): Use `drg/external-link` shortcode with the official title and URL.
   - **Placement**: Integrate these resources naturally within the educational content where they are most relevant — do not dump them all at the bottom.
   - **Grouped pages**: If one page covers multiple requirements or sub-requirements (for example, `req1ab.md`), each resource must stay attached to the specific requirement it came from in the badge data. A resource for `1.a` belongs in the `1a` subsection, not pooled with `1.b` resources elsewhere on the page.
   - **Supplemental resources**: You may add additional resources beyond the official requirement-level resources, but the official resources are the baseline that must always be present.
   - **No user-facing implementation details**: Never mention `data.json`, JSON, scaffolding, placeholders, scripts, or internal repository details in published guide prose.
   - **When no official resource link exists**: Do not invent a fake "Official Resources" section. Either omit that section entirely or replace it with a natural guidance section such as "What to Bring," "What to Record," or "Your Best Evidence," written for Scouts and counselors. If you need a brief note, say only that there is no official resource link for this page — never explain why in terms of internal files or data structures.
   - **Placeholder cleanup**: Before finishing a guide, remove or rewrite any scaffolded placeholder copy that exposes implementation details.

4. **Scaffolded Official Resources placeholder handling** — Treat scaffold-generated resource stubs as drafting aids, not publishable copy.
   - Replace placeholder text with real `drg/video` or `drg/external-link` shortcodes when official links exist.
   - If no official links exist for that requirement, delete the placeholder block or rewrite it into reader-facing guidance that helps the Scout complete the requirement.
   - Never leave a published section that explains the absence of links by referencing internal files, scraped fields, or repository mechanics.

5. **Content elements** — requirement page element variety is handled by the page writer, but the orchestrator must still preserve shortcode syntax and pass requirement-specific context cleanly.

6. **Cross-references** — keep the guide graph coherent and ensure related requirement pages exist so the page writer can refer to them naturally.

7. **Transition CTA** — every requirement page still ends with a bridge sentence and the `drg/next-page` shortcode. The page writer is responsible for writing it, but the orchestrator must provide accurate next-page metadata.

### extended-learning.md — Extended Learning

**Front matter:**

```yaml
---
title: "Extended Learning"
layout: guide
group_title: "Beyond the Badge"
prev: "/merit-badges/{slug}/guide/{last-req}/"
prev_title: "{Last Requirement Title}"
---
```

**Content sections:**

1. **Deep dives** — 2–4 sections going deeper into practical aspects.
2. **Real-world experiences** — Places, projects, or events to seek out. Card-based layout.
3. **Organizations** — 3–6 relevant organizations with name, mission, and link.

**Structural convention:**

Extended Learning sections should follow a consistent lettered structure:

- **Section A:** Brief congratulatory intro (2–3 sentences acknowledging the Scout's achievement and teasing what lies ahead).
- **Sections B–D:** Deep dives. Each should be substantive — at least 8–10 sentences with practical detail that teaches something new, not just a surface skim.
- **Section E:** Real-world experiences (3–5 experience cards).
- **Section F:** Organizations (3–6 org cards).

## Shortcode Catalog

Use these Hugo shortcodes throughout the guide:

```markdown
{{</* drg/requirement number="1a" */>}}
Exact requirement text here.
{{</* /drg/requirement */>}}

{{</* drg/requirement number="6" option="Dairy Option" */>}}
Complete ONE of the following options:
{{</* /drg/requirement */>}}

{{</* drg/safety-first */>}}
Safety content here. Direct, authoritative, 2–5 sentences.
{{</* /drg/safety-first */>}}

{{</* drg/did-you-know */>}}
Fun fact or surprising statistic. 1–3 sentences.
{{</* /drg/did-you-know */>}}

{{</* drg/tip */>}}
Practical, actionable advice. 1–4 sentences.
{{</* /drg/tip */>}}

{{</* drg/checklist title="Title" subtitle="Subtitle" */>}}

- Item one: Description of item one.
- Item two: Description of item two.
  {{</* /drg/checklist */>}}

{{</* drg/external-link
    title="Resource Title"
    url="https://example.org"
    description="What this resource offers." */>}}

{{</* drg/be-prepared title="Scenario Title" */>}}
Steps to handle this scenario.

- **Step one**: Do this.
- **Step two**: Then this.
  {{</* /drg/be-prepared */>}}
```

Use `drg/be-prepared` for **scenario-based problem-solving** — situations the Scout might encounter and step-by-step responses. Aim for at least 1–2 per guide beyond just the intro pages.

```markdown
{{</* drg/next-page
    text="Now that you know about X"
    teaser="Find out how to Y."
    url="/merit-badges/{slug}/guide/{next-page}/" */>}}

{{</* drg/download
    title="Template Name"
    url="/downloads/template.pdf" */>}}

{{</* drg/download
    title="Pre-Hike Planning Worksheet"
    url="/merit-badges/{slug}/guide/{worksheet-slug}/"
    type="printable" */>}}
```

- Use `type="printable"` when linking to an internal printable worksheet page.
- Use default (no type) when linking to an external downloadable PDF.

```markdown
{{</* drg/video
    title="Video Title"
    url="https://www.youtube.com/watch?v=..." */>}}
```

**IMPORTANT:** YouTube videos should use the `drg/video` shortcode, which embeds the video player directly on the page. However, if a video has embedding disabled by its uploader (shows "Video unavailable" when embedded), use `drg/external-link` instead so users can still click through to watch it on YouTube. Reserve `drg/external-link` for non-video resources (websites, articles, tools, organizations) and for YouTube videos with embedding disabled.

### Video Verification Protocol

AI models hallucinate plausible-looking YouTube video IDs that don't correspond to real videos. **Every video ID must be verified before inclusion.**

1. **Never invent YouTube video IDs.** Do not guess or fabricate IDs. Every `drg/video` shortcode must reference a verified, existing video.

2. **Verification method:** Before adding any `drg/video` shortcode, verify the video ID exists and is embeddable using YouTube's official oEmbed endpoint:

   ```
   https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={VIDEO_ID}&format=json
   ```

   - **200 OK** with JSON → video exists and is embeddable, safe to use `drg/video`
   - **401 Unauthorized** → video exists but embedding is disabled by the uploader. Use `drg/external-link` instead of `drg/video` so users can click through to YouTube.
   - **404 Not Found** → video does not exist, is private, or was removed. Do not use it.

3. **Finding real videos:** Use web search to find pages that embed relevant videos (e.g., search for "Red Cross CPR training video"), then extract video IDs from those pages. Prefer videos from reputable sources: American Red Cross, American Heart Association, CDC, Mayo Clinic, St John Ambulance, NOLS, REI, etc.

4. **Fallback:** If no verified video can be found for a topic, use a `drg/external-link` to a reputable organization's video page instead of embedding a specific video. A guide page without a video is better than one with a broken embed.

## Handling Requirement Modes

The `data.json` `subrequirement_mode` field determines how sub-requirements relate:

| Mode                           | Meaning         | Approach                                                                                                                                                    |
| ------------------------------ | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"type": "all"`                | Complete all    | Full content for each sub-requirement page                                                                                                                  |
| `"type": "select", "count": 1` | Scout picks ONE | **Always generate an overview page** (`req{N}.md`) plus individual pages per option. See "Choose One Requirements" in the Information Architecture section. |
| `"type": "select", "count": N` | Scout picks N   | Same structure as `count: 1` — overview page plus individual pages. The overview page must state clearly that the Scout picks exactly N options.            |

When you encounter `"type": "select"` during Phase 1 analysis, flag the requirement immediately and plan the overview page as a distinct page in your page structure map before writing any content.

## Worksheets & Printable Tools

### When to Create a Worksheet

Use this test: **"Would a Scout actually print this out, fill it in by hand, and bring it to their counselor or use it in the field?"** If yes, create a printable worksheet. If it is just a reference list, an inline `drg/checklist` is fine.

**Common worksheet triggers:**

- Requirements that say "keep a log" or "make a plan"
- Requirements that say "create a list" or "prepare a checklist" for field use
- Requirements with tables or forms the Scout fills in over time
- Requirements where the Scout needs counselor sign-off on a planning artifact
- Any content where you find yourself writing a fillable template, form, or blank-field layout

**Anti-pattern:** Never put fillable templates, blank forms, or plan worksheets inline in a requirement page as code blocks, markdown tables with blank cells, or plain text with underscores. If a Scout would fill it out, it must be a printable worksheet page linked via `drg/download`. Inline code blocks with `___` blanks are a sign that a worksheet is needed.

### Worksheet File Convention

Place worksheets in a subdirectory of the guide: `guide/{worksheet-slug}/index.md` with `layout: printable`.

### Required Elements

Every worksheet must include:

1. **Back link** to the parent requirement page
2. **Print button** (`window.print()`)
3. **Title** (`<h2 class="drg-worksheet__title">`)
4. **Subtitle** linking to the badge and requirement
5. **Form fields** using `drg-worksheet__*` CSS classes (fields, lines, tables, check items, writing areas, draw areas, signature blocks)

### Navigation

- **Do NOT add worksheets to `guide_nav`.** Worksheets are not requirement pages and must not appear in the sidebar navigation. They are utility pages accessed via a link on the requirement page, not navigation destinations.
- Link to worksheets from the requirement page using the `drg/download` shortcode with `type="printable"`. This is the only entry point — the `drg/download` shortcode on the requirement page is sufficient for discovery.

### Canonical Examples

Two exemplar worksheets demonstrate different approaches:

- `hugo/content/merit-badges/hiking/guide/hike-plan-worksheet/index.md` — fields, tables, draw areas, signature blocks
- `hugo/content/merit-badges/bird-study/guide/field-notebook-worksheet/index.md` — check grids, writing areas, repeated-use design

## Production Workflow

**CRITICAL — Run to completion without stopping.** Work through all phases autonomously from start to finish. Do NOT pause between phases, do NOT ask for confirmation, do NOT summarize progress and offer to continue, do NOT stop mid-guide for any reason short of a hard error that genuinely requires user input. The guide is not done until every scaffolded page has been written, verified, and the build passes.

## Workflow

### Phase 1A: Scaffold Check

1. Check whether `hugo/content/merit-badges/$ARGUMENTS/guide/_index.md` exists.
2. If it does not exist, run `BADGE_SLUG=$ARGUMENTS bun run scaffold:drg`.
3. If it does exist, do not scaffold again. Read the existing guide files and continue from their current state.

### Phase 1B: Analysis

1. Read `hugo/data/merit-badges/$ARGUMENTS.json`.
2. Read the existing or scaffolded guide files under `hugo/content/merit-badges/$ARGUMENTS/guide/`.
3. Study relevant exemplar guides from the reference table for structure, tone, and section patterns.
4. Preserve the scaffolded file structure, page ordering, and navigation. Replace placeholders with real content instead of inventing a new layout.
5. **Requirement Language Analysis:** For every parent requirement that has sub-requirements, determine whether the parent creates a structural template:
   - If the parent contains specific verb phrases and the children are bare topics, decompose the parent into its discrete action phrases.
   - If the parent is a generic umbrella, no decomposition is needed.
   - If a child has its own complete verb+subject instruction, that child's language takes priority.
   - Record the decomposition results before writing begins so that every child page follows the same structural pattern.
6. **Verb Decomposition Output:** For every parent requirement with sub-requirements, produce decomposition in this format to pass to the page writer:
   - Multi-verb parent → `type: "multi-verb"`, `verb_phrases: [{verb, heading_template, content_type}]`
   - Single-verb parent → `type: "single-verb"`, `verb_phrases: [{verb, content_type}]`
   - Self-contained child → `type: "self-contained"`
   - Generic umbrella → `type: "none"`

### Phase 2: Write Requirement Pages via Subagent

1. Write `_index.md` directly in the orchestrator.
2. Write any requirement overview pages that are not standard requirement content pages directly in the orchestrator when they function as chooser/navigation pages.
3. For each standard requirement page in `guide_nav` order, invoke `drg-page-writer` with the Agent tool.
4. Pass structured context for each invocation:
   - badge metadata
   - file path
   - front matter
   - requirement text
   - parent requirement text when relevant
   - verb decomposition output
   - requirement-specific resources
   - sibling topics
   - prev/next navigation
   - existing content when resuming
5. **Parallel by default:** sibling pages under the same parent should run concurrently up to 4 at a time using background Agent calls. Wait for the sibling group to finish before moving to the next group.
6. Capture subagent return flags after each page completes:
   - worksheet trigger
   - video concern
   - resource gap
   - resume/improved-existing-content note
7. Non-requirement pages remain in the orchestrator:
   - `_index.md`
   - chooser/overview pages for select-mode requirements
   - `extended-learning.md`
   - printable worksheet pages when needed
8. Do not stop after a subset of pages. Complete the full guide before moving to verification.

### Phase 3: Resources and Verification

1. Keep or add official resource shortcodes:
   - `drg/video` for verified embeddable YouTube links
   - `drg/external-link` for other official URLs or embed-disabled videos
2. Use flags returned by the page-writer subagent to handle worksheet triggers, video concerns, and resource gaps.
3. Before adding a YouTube video, verify it with the project's video verification workflow.
4. After making guide changes, run relevant checks when appropriate, such as:
   - `BADGE_SLUGS="$ARGUMENTS" bun run verify:drg-resources`
   - `bun run build`

### Phase 4: Resume Behavior

If a guide already exists, do not overwrite it wholesale. Read what is there, preserve completed work, and continue editing the existing guide files.

When resuming:

- preserve user-added content and richer expansions
- preserve existing image comments or placeholders and integrate around them
- pass `existing_content` to the page writer so it improves content rather than flattening or rewriting it
- deepen thin sections without flattening stronger existing pages back into a uniform template

**Resume means finish, not restart.** When resuming a partially written guide, complete all remaining pages without stopping.

