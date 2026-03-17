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

## Audience & Voice

### Who is the reader?

- **Primary**: Scouts BSA members, ages 11–17
- **Secondary**: Merit badge counselors using the guide as a teaching companion
- **Tertiary**: Parents/guardians helping Scouts prepare

### Voice Rules

| Attribute         | Guideline                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| **Reading level** | 6th–8th grade. Short sentences. Define technical terms on first use.                              |
| **Tone**          | Encouraging, conversational, informative. "Experienced camp counselor explaining something cool." |
| **Person**        | Address the reader as "you."                                                                      |
| **Voice**         | Active over passive. "Pack your first-aid kit" not "A first-aid kit should be packed."            |
| **Enthusiasm**    | Genuine excitement without being cloying. One exclamation point per section max.                  |
| **Inclusivity**   | Gender-neutral language. Assume diverse backgrounds.                                              |
| **Safety**        | When discussing safety, shift to direct, serious-but-not-scary tone. Authoritative, not casual.   |

### What the guide is NOT

- **Not a workbook.** It teaches the knowledge to fulfill requirements — no fill-in-the-blank answers.
- **Not a pamphlet replacement.** It supplements and enriches.
- **Not a merit badge counselor.** It prepares the Scout for the conversation with their counselor.

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

### Parent-to-Child Requirement Decomposition

Many requirements follow a pattern where a **parent requirement contains verb phrases** and the **children are bare topics**. When this pattern occurs, the parent language creates a structural template that every child page must follow.

#### Recognizing the Pattern

Look at the parent requirement and its children together:

- **Verb-template parent + bare-topic children:** The parent contains action verbs applied to the children's topics. Example: *"Describe the symptoms and signs of, show first aid for, and explain prevention of these conditions:"* followed by children like *"(a) Choking"*, *"(b) Heat exhaustion"*. The parent's verbs are the structural mandate for every child.
- **Generic umbrella parent:** The parent says something like *"Do the following:"* or *"Explain the following:"* without specific multi-verb instructions. In this case, the children are self-contained — each child carries its own complete instruction. No decomposition is needed; treat each child independently.
- **Children with their own complete instructions:** Even under a verb-template parent, if a child has its own full verb+subject sentence (e.g., *"(a) Demonstrate how to tie a bowline"*), that child's own language takes priority over the parent template.

#### When Decomposition Applies

If the parent is a verb-template parent and the children are bare topics, **decompose the parent into discrete action phrases** and map each phrase to an H3 heading under every child page.

**Multi-verb parents → multiple H3 sections per child page:**

Parse the parent requirement into its distinct verb phrases. Each verb phrase becomes its own H3 section on every child's page. The sections must be parallel across all sibling pages.

Example decomposition for *"Describe the symptoms and signs of, show first aid for, and explain prevention of:"*

| Parent verb phrase | H3 heading template | Content type |
| --- | --- | --- |
| "Describe the symptoms and signs of" | **Symptoms and Signs of {Condition}** | Observable details, what to look and listen for |
| "Show first aid for" | **First Aid for {Condition}** | Numbered physical procedure, hands-on steps |
| "Explain prevention of" | **Prevention of {Condition}** | Reasoning about causes, practical habits to avoid the condition |

For child `(a) Choking`, the page gets three H3 sections:
- `### Symptoms and Signs of Choking`
- `### First Aid for Choking`
- `### Prevention of Choking`

For child `(b) Heat exhaustion`, the same three H3 sections appear with "Heat Exhaustion" substituted.

**Single-verb parents → one content focus per child, no forced H3 split:**

If the parent has only one verb (e.g., *"Explain each of the following:"*), each child still gets its own H2 heading/page with content calibrated for that verb, but there is no need to create multiple H3 subsections within each child. The single verb shapes the content approach (explain → definitions, reasoning, examples) without requiring structural subdivision.

#### H3 Heading Naming Rules

- Derive H3 headings from the parent's exact verb phrases, substituting the specific child topic
- Keep heading phrasing parallel across all sibling pages (e.g., always "Symptoms and Signs of X", never sometimes "Signs of X" and other times "How to Recognize X")
- Use sentence case for H3 headings
- If the parent's verb phrase is long or awkward as a heading, shorten it while preserving the verb and intent (e.g., "Describe the symptoms and signs of" → "Symptoms and Signs of")

#### Depth Calibration

Not every H3 section under a multi-verb parent needs equal length. A "Prevention" section for one condition might be two sentences if there is genuinely little to say, while "First Aid" for the same condition might need a detailed numbered procedure. But **never omit a section** that the parent language calls for — even a brief section signals to the Scout that this verb applies and gives them something to prepare.

When one verb phrase maps to content that is inherently longer (e.g., a multi-step first aid procedure vs. a short prevention tip), that is fine. Depth should match the topic's complexity for that verb, not be artificially equalized.

#### What Decomposition Does NOT Mean

- It does not mean copying the parent requirement text into every child page as an H3 heading verbatim — derive concise section headings from the verb phrases
- It does not apply to generic umbrellas ("Do the following:") — those children stand alone
- It does not override a child's own complete instructions — if the child says "Demonstrate X," that child's language governs its structure
- It does not require equal word counts per section — match depth to the verb and topic

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

2. **Educational content** — usually 500–1500 words of real teaching, not padded filler and not a loose word-count suggestion. A requirement page is a teaching page. It must help the Scout understand the topic well enough to arrive at the counselor conversation with real background knowledge instead of seeing the concepts for the first time. Teach how to think about the requirement, not just what it is about. When a page covers several related conditions, tools, procedures, or concepts, explain why the distinctions matter and how the Scout can tell them apart. Short summary paragraphs alone are usually insufficient for pages covering multiple sub-requirements, emergency response, tools, procedures, or decision-making. Content strategy depends on requirement type:

   | Requirement asks Scout to... | Strategy                                                                 |
   | ---------------------------- | ------------------------------------------------------------------------ |
   | Explain / Define             | Clear explanations, definitions, "Did You Know" callouts                 |
   | Demonstrate / Show           | Step-by-step descriptions, checklists, video references                  |
   | Identify / List              | Representative examples with context, encourage finding their own        |
   | Research / Discuss           | Frame key questions, multiple perspectives, authoritative links          |
   | Create / Plan / Build        | Planning frameworks, printable worksheets (see Worksheets section below) |
   | Do / Perform                 | Preparation guidance, safety info, practical tips, printable worksheets  |
   | Choose one of several        | Present all options, help Scout choose, guidance for each path           |

   **Verb-first writing — structural rule:** Before drafting, identify the main action verbs in the requirement text. Those verbs determine the page's section structure, not just its tone. **Multi-verb requirements produce multi-section pages.** Each verb phrase gets its own H3 heading and content block. Do not collapse multiple verbs into unified flowing paragraphs.

   Each verb has a structural output specification and a litmus test:

   - **Explain** → Define the concept, break it into parts, say why it matters, include a concrete example the Scout could retell. *Litmus test: could the Scout articulate why this matters and give an example to a counselor?*
   - **Describe** → Give observable details, signs, sequences, or characteristics the Scout would need to talk through accurately. Content reads like sensory/observable information. *Litmus test: could the Scout recognize or point out what's described without having memorized a definition?*
   - **Discuss** → Provide multiple angles, useful questions, and the kinds of points a counselor would expect the Scout to notice. Content reads like a two-sided conversation. *Litmus test: could the Scout sustain a back-and-forth conversation about this topic?*
   - **Demonstrate / Show** → Provide a numbered ordered procedure, needed materials or setup, common mistakes, and what correct performance looks like. Content reads like step-by-step physical instructions. *Litmus test: could the Scout follow these steps hands-on and perform the skill?*
   - **Identify** → Teach distinguishing features, comparisons, and "how to tell" cues rather than just examples. *Litmus test: given two similar items, could the Scout tell them apart using what's on this page?*
   - **List / Name** → Give categories, representative examples, and memory structure without simply handing over a final answer set when that would undercut the requirement. *Litmus test: could the Scout generate their own list from the categories and patterns taught?*
   - **Compare / Contrast** → Use side-by-side structure or a table and explain why the differences matter. *Litmus test: could the Scout articulate at least two meaningful differences?*
   - **Plan / Prepare / Create** → Provide a framework, decision guide, worksheet trigger, or checklist that helps the Scout produce something real. *Litmus test: could the Scout actually start building/planning with what's on this page?*
   - **Teach** → Help the Scout organize what to say, what to show first, and how to know the learner understood. *Litmus test: could the Scout teach someone else this skill using this page as preparation?*

   **Qualitative differentiation is mandatory.** A "show" section must read like step-by-step physical instructions — not like an "explain" section with the word "show" swapped in. A "describe" section must read like observable details — not like a definition paragraph. If two sections under different verbs read the same way, one of them is wrong.

   **Subsection depth is mandatory too.** A structurally correct H3 section is still incomplete if it only gives a compressed one-sentence summary that restates the heading. Each inherited or verb-driven subsection must teach the Scout something they could actually say, notice, or do. Even for smaller topics, a subsection should usually contain at least **two of these four**: (1) concrete cues or examples, (2) ordered actions, (3) common mistakes / what not to do, (4) practical reasoning about why the action or prevention works.

   For mixed-verb requirements, each verb produces its own structurally separate content section. If a requirement says something like "describe the symptoms and signs of, show first aid for, and explain prevention," the page must have three distinct H3 sections per topic — one for each verb phrase — with qualitatively different content in each. See the "Parent-to-Child Requirement Decomposition" section above for the full decomposition rules.

   **Subsection-level depth expectations:**

   - **Describe** subsections should usually include observable cues plus at least one distinction, example, or comparison that helps the Scout recognize the condition in real life.
   - **Demonstrate / Show** subsections should usually include ordered steps, not a compressed sentence list. For simple topics, a short numbered procedure is enough; for more serious topics, include setup, sequence, and at least one mistake to avoid.
   - **Explain** subsections should usually include cause-and-effect reasoning — why the prevention, rule, or concept matters — not just a flat list of tips.
   - **Identify / Compare** subsections should usually include "how to tell" language, not just names.

   **Requirement-type depth rules:**

   - **Explain / Define** pages should include why the concept matters, a concrete example, and at least one useful distinction or misconception.
   - **Demonstrate / Show** pages should usually include a numbered or clearly ordered procedure, common mistakes, and what success looks like before the counselor demonstration.
   - **Identify / List** pages should include representative examples plus comparison language that teaches how to tell similar things apart.
   - **Research / Discuss** pages should frame what to pay attention to, not just suggest that the Scout "look it up."
   - **Create / Plan / Build** pages should provide a framework, decision guide, or worksheet trigger.
   - **Do / Perform** pages should emphasize preparation, sequencing, safety, and what evidence or output the Scout should bring to the counselor.
   - **Choose one of several** pages should provide decision support and explain what each path teaches.

3. **Official resources (MANDATORY)** — Every official resource listed for this requirement in the badge data **must** appear on the page. This is not optional — these are official Scouting resources scraped from scouting.org.
   - **YouTube videos** (URL contains `youtube.com` or `youtu.be`): Use `drg/video` shortcode. Verify each video via the Video Verification Protocol before including it. If verification shows the video is embed-disabled (401), use `drg/external-link` instead. If the video is gone (404), use `drg/external-link` with the URL so the Scout can check if it's been re-uploaded.
   - **Non-video resources** (websites, PDFs, articles): Use `drg/external-link` shortcode with the official title and URL.
   - **Placement**: Integrate these resources naturally within the educational content where they are most relevant — do not dump them all at the bottom. A video about AFIS should appear in the section discussing AFIS, not after the conclusion.
   - **Grouped pages**: If one page covers multiple requirements or sub-requirements (for example, `req1ab.md`), each resource must stay attached to the specific requirement it came from in the badge data. A resource for `1.a` belongs in the `1a` subsection, not pooled with `1.b` resources elsewhere on the page.
   - **Supplemental resources**: You may add additional resources beyond the official requirement-level resources, but the official resources are the baseline that must always be present.
   - **No user-facing implementation details**: Never mention `data.json`, JSON, scaffolding, placeholders, scripts, or internal repository details in published guide prose.
   - **When no official resource link exists**: Do not invent a fake "Official Resources" section. Either omit that section entirely or replace it with a natural guidance section such as "What to Bring," "What to Record," or "Your Best Evidence," written for Scouts and counselors. If you need a brief note, say only that there is no official resource link for this page — never explain why in terms of internal files or data structures.
   - **Placeholder cleanup**: Before finishing a guide, remove or rewrite any scaffolded placeholder copy that exposes implementation details.

4. **Scaffolded Official Resources placeholder handling** — Treat scaffold-generated resource stubs as drafting aids, not publishable copy.
   - Replace placeholder text with real `drg/video` or `drg/external-link` shortcodes when official links exist.
   - If no official links exist for that requirement, delete the placeholder block or rewrite it into reader-facing guidance that helps the Scout complete the requirement.
   - Never leave a published section that explains the absence of links by referencing internal files, scraped fields, or repository mechanics.

5. **Content elements** — At least 2–3 different types per page (see shortcode catalog below).

6. **Cross-references** — Link to related requirement pages with natural language.

7. **Transition CTA** — Bridge sentence connecting to the next requirement, followed by the `drg/next-page` shortcode. **This must always be the very last element on the page** — nothing should appear after it (no shortcodes, no text).

### Reader-Facing Copy Safety Check

Before considering a guide page done, scan for internal-only language that should never reach readers. Published prose must not mention:

- `data.json`
- JSON
- scaffold or scaffolding
- placeholder or stub
- script names
- verification scripts
- repository or repo internals

If the sentence would sound strange to a Scout or counselor reading the guide on the public site, rewrite it.

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

Use `drg/be-prepared` for **scenario-based problem-solving** — situations the Scout might encounter and step-by-step responses. Good for safety scenarios, "what if" situations, and motivational hurdles. Aim for at least 1–2 per guide beyond just the intro pages.

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

## Content Rules

### DO

- Teach the knowledge, not the answer
- Include safety content wherever warranted
- Link to authoritative external sources (at least one per requirement page)
- When referencing other merit badges, always link to our own site (`/merit-badges/{slug}/`) — never to scouting.org merit badge pages
- Cross-reference between requirements
- Provide practical tools (checklists, templates, frameworks)
- Use real examples and real places
- Mix 2–3 content element types per page

### DO NOT

- Give away the answer (if requirement says "Identify 10 examples," don't list exactly 10)
- Copy or paraphrase the merit badge pamphlet
- Alter requirement text
- Use jargon without defining it
- Link to commercial products or unreliable sources
- Link to scouting.org for merit badge requirements — always use our internal `/merit-badges/{slug}/` URLs instead
- Be preachy or lecture
- Overload a page beyond ~1500 words of educational content
- Use "Did You Know" for information that is merely topical — it must be **genuinely surprising, counterintuitive, or memorable**. If the fact would not make a Scout say "wait, really?" it belongs in the body text, not a callout.

## Writing Craft

These principles capture what separates the best published guides from formulaic ones. Internalize them — they are not a checklist to satisfy mechanically.

### Opening Hooks

The first paragraph after the `drg/requirement` shortcode must be **specific to the subject matter**, not a generic warm-up. Self-test: could this paragraph work for three unrelated badges by swapping one noun? If yes, rewrite.

**Weak:** "This is an important skill that every Scout should learn. Let's dive in and explore what you need to know!"

**Strong:** "A blister the size of a quarter can end a 20-mile hike at mile three. Knowing how to prevent — and treat — foot injuries is the difference between finishing the trail and calling for a ride home."

The strong version is impossible to confuse with any other badge. It drops the reader into the subject immediately.

### Did You Know — The Surprise Test

The existing DO NOT rule says these must be genuinely surprising. Here is what "genuinely surprising" looks like in practice:

- **Bird Study:** "A chickadee can remember thousands of hiding spots where it cached seeds — and recall them months later."
- **First Aid:** "Good Samaritan laws in most states protect you from liability when you help someone in an emergency — but only if you don't exceed your training."
- **Cooking:** "The 'danger zone' for bacterial growth (40°F–140°F) means a pot of chili left on the counter for two hours has already become unsafe to eat."

Each of these makes a reader pause. If your fact wouldn't survive a "so what?" challenge from a skeptical 13-year-old, move it to body text.

### Shortcode Variety

Aim for **4–6 different shortcode types per page** across the guide. If `safety-first` appears mechanically at the bottom of every section regardless of whether there is a genuine safety concern, something is wrong. Likewise, if every page follows the exact same pattern (requirement → two paragraphs → tip → checklist → safety-first → next-page), the guide reads like a template, not a teaching tool.

Look at how the Astronomy guide mixes `safety-first`, `checklist`, `be-prepared`, `tip`, and `external-link` shortcodes within individual pages — varying the order and density based on what the content actually needs.

**Use the best teaching structure for the content, not just any valid structure:**

- **Use a markdown table** when the page compares similar options, conditions, injuries, tools, causes, or severity levels.
- **Use `drg/be-prepared`** when a Scout may realistically face the situation under stress or need to decide what to do next.
- **Use numbered or tightly ordered steps** when the requirement involves demonstrating, handling, assembling, treating, responding, or teaching.

A page can be structurally valid and still be weak if it avoids the format that would teach the topic best.

### Instructional Depth

A strong DRG requirement page should feel like a skilled instructor helping a Scout get ready to do the requirement, not like a glossary, a checklist dump, or a compressed study note.

Prefer:

- concrete examples over generic statements
- named scenarios over abstract advice
- distinctions and comparisons over flat lists
- step-by-step teaching for demonstration requirements
- practical cues a Scout can notice in the field

When a requirement involves similar concepts, conditions, tools, injuries, roles, or procedures, teach the differences that matter. Tell the Scout what to look for, what changes their response, and why a counselor cares about the distinction. If a page would leave a first-time reader saying "I still don't really know how to tell these apart" or "I know the words but not what to do," it needs more depth.

### Verb-First Writing

Read the action verbs in every requirement before writing. Those verbs should drive the shape of the page.

A page for **explain** should not read like a page for **demonstrate**. A page for **identify** should not read like a page for **discuss**. Use the verbs to decide whether the Scout needs distinctions, examples, ordered actions, comparison language, teaching structure, or decision support.

When a requirement contains several verbs, support each one. Do not let a mixed-verb requirement flatten into one broad paragraph that technically mentions the topic without preparing the Scout to do the actual actions.

#### Verb Decomposition: Before and After

This example shows the exact transformation expected for a multi-verb parent requirement. The parent is First Aid Req 5: *"Describe the symptoms and signs of, show first aid for, and explain prevention of these conditions: (a) Choking..."*

**BAD — collapsed verbs, generic prose:**

```markdown
## Choking

Choking occurs when a foreign object blocks the airway. Signs include
the universal choking sign (hands clutching the throat), inability to
speak or cough, and bluish skin color. If someone is choking, you should
use the steps you have been taught to clear the airway. Back blows and
abdominal thrusts are common techniques. To prevent choking, cut food
into small pieces, chew thoroughly, and avoid talking with food in your
mouth.
```

Problems with this output:
- All three verbs are blurred into one paragraph
- "Show first aid for" is answered with *"use the steps you have been taught"* — this is a non-answer that does not prepare the Scout to demonstrate anything
- "Describe symptoms" is a single sentence mixed into narrative prose
- No structural signal tells the Scout (or counselor) where one verb ends and the next begins
- A counselor testing each verb separately would find the Scout unprepared

**GOOD — requirement-derived H3 structure, qualitatively different content:**

```markdown
## Choking

### Symptoms and Signs of Choking

Look for these observable cues:

- **Universal choking sign** — both hands clutching the throat
- **Inability to speak, cry, or cough forcefully** — the person may
  mouth words but produce no sound
- **High-pitched wheezing or squeaking** when trying to inhale
- **Bluish tint to lips or fingernails** (cyanosis) — indicates
  oxygen deprivation
- **Loss of consciousness** if the blockage is not cleared

A partial blockage may allow weak coughing — encourage the person to
keep coughing. A complete blockage produces silence and requires
immediate intervention.

### First Aid for Choking

For a conscious adult or child (over 1 year):

1. Confirm the blockage — ask "Are you choking?" If they cannot speak
   or cough, act immediately.
2. Stand behind the person and wrap your arms around their waist.
3. Make a fist with one hand and place the thumb side against the
   abdomen, just above the navel and below the breastbone.
4. Grasp your fist with your other hand.
5. Deliver quick, inward-and-upward thrusts — each thrust should be a
   distinct, forceful motion.
6. Repeat until the object is expelled or the person becomes
   unconscious.

If the person becomes unconscious, lower them to the ground, call 911,
and begin CPR. Check the mouth for the object before giving breaths.

### Prevention of Choking

Most choking incidents are preventable:

- **Cut food into small pieces** and chew thoroughly before swallowing
- **Avoid talking, laughing, or moving vigorously while eating** — these
  actions can cause food to enter the airway
- **Keep small objects away from young children** — balloons, coins,
  and small toy parts are leading choking hazards for children under 4
- **Supervise mealtimes for young children and elderly adults** — both
  groups are at higher risk due to developing or declining swallowing
  coordination
```

**Why this works:** Each section reads qualitatively differently. "Symptoms and Signs" teaches observable cues a Scout can watch for. "First Aid" is a numbered physical procedure a Scout could follow hands-on. "Prevention" explains root causes and practical habits. A counselor can test each verb independently and find the Scout prepared for all three.

#### Depth Calibration: Compact but Not Thin

Structure alone is not enough. A page can have the right H3 headings and still fail if each subsection is only one sentence long. The goal is not maximal length; the goal is **instructional completeness**. A short subsection is fine when it still gives the Scout enough substance to say, recognize, or do something real.

**BAD — technically structured, but too thin to teach:**

```markdown
### First Aid for Sunburn

Move to shade, cool the skin, hydrate, and protect the area from more sun.
```

Problems with this output:
- It compresses the whole response into one sentence the Scout is unlikely to remember under pressure
- It gives no sequence, so it does not really help with a "show" verb
- It gives no limits or cautions, so the Scout does not learn what to avoid or when the situation is more serious
- It sounds like a summary note, not preparation for a counselor conversation or demonstration

**BETTER — still compact, but instructionally complete:**

```markdown
### First Aid for Sunburn

1. Move the person out of direct sun right away so the burn does not keep worsening.
2. Cool the skin with cool water or cool wet cloths. Do not put ice directly on the burn.
3. Encourage fluids, because sunburn often comes with dehydration.
4. Protect the area with loose clothing or shade and avoid more sun until the skin settles down.
5. Get medical help if the burn is severe, badly blistered, covers a large area, or comes with dizziness, vomiting, or confusion.
```

**Why this works:** It is still brief, but it now has sequence, a caution, and a "get help" threshold. The Scout could actually walk a counselor through what to do instead of repeating a one-line summary.

**Use this balance rule:**
- **Simple topic** → one short intro sentence plus 3–5 bullets or steps may be enough
- **Moderate topic** → compact paragraph plus bullets/steps
- **Complex or high-stakes topic** → fuller subsection with distinctions, cautions, and examples

Do not make every subsection long. Make every subsection complete enough that it teaches the assigned verb.

### Cross-References

When a later requirement builds on an earlier one, link back with natural language: "In Req 1e, you learned about safe food temperatures — those same principles apply here." Don't force cross-references where the connection is tenuous. A genuine cross-reference helps the Scout see how the badge fits together; a forced one is noise.

### Extended Learning Depth

Each deep-dive section in Extended Learning should teach something **genuinely new** — a skill, concept, or perspective that the requirement pages didn't cover. "Here are more things you can do" is not a deep dive. "Here is how competitive archers train their breathing to hold steady at full draw" is.

## Production Workflow

**CRITICAL — Run to completion without stopping.** Work through all phases autonomously from start to finish. Do NOT pause between phases, do NOT ask for confirmation, do NOT summarize progress and offer to continue, do NOT stop mid-guide for any reason short of a hard error that genuinely requires user input. Writing one or two pages and then asking "Should I continue?" is a failure. The guide is not done until every scaffolded page has been written, verified, and the build passes. Silence from the user means keep going.

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
   - If the parent contains specific verb phrases and the children are bare topics (e.g., *"Describe X, show Y, and explain Z:"* with children *"(a) Choking"*), decompose the parent into its discrete action phrases. Each phrase becomes an H3 heading template applied to every child page.
   - If the parent is a generic umbrella (e.g., *"Do the following:"*), no decomposition is needed — treat each child as self-contained.
   - If a child has its own complete verb+subject instruction, that child's language takes priority over any parent template.
   - Record the decomposition results before writing begins so that every child page follows the same structural pattern.

### Phase 2: Write the Guide

Work page-by-page and turn scaffold placeholders into complete Scout-friendly content. Keep the deterministic scaffold structure intact unless the user explicitly asks for a structural change.

**Write every page before moving to Phase 3.** Do not stop after a subset of pages, do not offer progress summaries mid-guide, do not ask whether to continue. Move directly from one page to the next until all pages are complete.

Requirements for writing:

- Keep all prose specific to the badge.
- Use exact requirement wording inside `drg/requirement` shortcodes.
- Keep official resources relevant to the requirement they belong to.
- Preserve valid front matter, `guide_nav`, and prev/next links.
- Replace placeholder titles like `[TITLE]` and group labels like `[GROUP: Requirement 3]` with polished final text when completing the guide.
- Identify the major verbs in each requirement before drafting and make sure the finished page prepares the Scout for each one.
- Keep expanding thin pages before moving on. If a page is structurally complete but still reads like a short summary, add the missing explanation, distinctions, examples, scenarios, comparison support, or ordered guidance.
- Treat broad, high-stakes, or multi-part requirements as needing real instructional substance, not one brief paragraph per sub-part.

### Thin Page Self-Check

Before considering any requirement page complete, ask:

- What are the main verbs in this requirement, and does the page help the Scout do each one?
- Would this page still make sense to a Scout who has never encountered this topic before?
- Does it contain at least one concrete example, scenario, or field-use case?
- If the page covers multiple similar things, did it explain how to tell them apart?
- If the page covers a demonstration, did it prepare the Scout with an ordered process rather than vague prose?
- If I removed the badge name, would this opening paragraph still feel badge-specific?
- If this sub-requirement inherits verb phrases from a parent, does the page have a separate H3 section for each inherited phrase?
- Does each section under a multi-verb requirement contain qualitatively different content? A "show" section should read like step-by-step instructions, not like an "explain" section.
- If I isolated any one H3 subsection from the rest of the page, would it still teach the assigned verb instead of reading like a compressed note?
- Does each subsection give the Scout enough substance to actually say, notice, compare, or do something — not just repeat a one-line summary?

If any answer is no, keep writing before treating the page as done.

A quick warning sign: if an H3 subsection is only one short sentence, it is usually too thin unless the topic is genuinely tiny and the sentence still includes concrete action or comparison.
### Phase 3: Resources and Verification

1. Before running verification, do a content-quality gate:
   - scan for pages that are structurally complete but visibly short or underexplained
   - expand any page that only gives one brief paragraph per sub-requirement when the subject is broad or high-stakes
   - make sure each major requirement page has enough instructional substance to stand on its own
   - confirm that the page content actually prepares the Scout for the verbs in the requirement text
   - scan for H3 subsections that are only one short paragraph or one sentence long; these are often signs of structurally correct but instructionally weak content
   - expand any "show" subsection that lacks ordered steps
   - expand any "describe" subsection that lacks observable cues, examples, or distinctions
   - expand any "explain prevention" subsection that only lists tips without saying why they matter or how they prevent the problem
2. Keep or add official resource shortcodes:
   - `drg/video` for YouTube
   - `drg/external-link` for other official URLs
3. Before adding a YouTube video, verify it with the project's video verification workflow.
4. After making guide changes, run relevant checks when appropriate, such as:
   - `BADGE_SLUGS="$ARGUMENTS" bun run verify:drg-resources`
   - `bun run build`

### Phase 4: Resume Behavior

If a guide already exists, do not overwrite it wholesale. Read what is there, preserve completed work, and continue editing the existing guide files.

When resuming:

- preserve user-added content and richer expansions
- preserve existing image comments or placeholders and integrate around them
- deepen thin sections without flattening stronger existing pages back into a uniform template

**Resume means finish, not restart.** When resuming a partially-written guide, complete all remaining pages without stopping. Do not summarize what has been done and ask whether to proceed — just continue writing from where the guide left off.


