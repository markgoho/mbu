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

### Reference Examples

Use this table to find guides that demonstrate specific techniques. During Phase 1 (Analysis), browse the relevant exemplar files to absorb the range of approaches — but do not replicate any single guide verbatim.

| Technique | Exemplar | What to Study |
|---|---|---|
| Printable worksheets | `bird-study/guide/field-notebook-worksheet/` | Form fields, check grids, draw areas, back-link + print button |
| Markdown tables for comparisons | `bird-study/guide/req5.md`, `req6.md` | Feeding habitat table, beak/foot adaptation tables |
| Rich `images.json` with style variety | `bird-study/guide/images.json` | Mix of photo, diagram, illustrated, comparison, infographic |
| Granular requirement splitting | `cooking/guide/` | 37 pages; distinct sub-parts each get their own page |
| Cross-references between requirements | `cooking/guide/req2e.md` | Natural inline links ("In Req 1e, you learned...") |
| Scenario-driven hooks | `first-aid/guide/req1a.md` | Concrete "what would you do" opener |
| Strong subject-specific intro | `first-aid/guide/_index.md` | Opens with a campsite injury scenario, not a generic greeting |
| History section with depth | `bird-study/guide/_index.md` | Audubon-era collecting vs. modern citizen science |
| Shortcode variety (4–6 types/page) | `astronomy/guide/` | Mixes safety-first, checklist, be-prepared, tip, external-link, image |

All paths are relative to `hugo/content/merit-badges/`.

If the `guide/` directory already exists, check what files are present and resume from where things left off rather than starting over.

## Audience & Voice

### Who is the reader?

- **Primary**: Scouts BSA members, ages 11–17
- **Secondary**: Merit badge counselors using the guide as a teaching companion
- **Tertiary**: Parents/guardians helping Scouts prepare

### Voice Rules

| Attribute | Guideline |
|-----------|-----------|
| **Reading level** | 6th–8th grade. Short sentences. Define technical terms on first use. |
| **Tone** | Encouraging, conversational, informative. "Experienced camp counselor explaining something cool." |
| **Person** | Address the reader as "you." |
| **Voice** | Active over passive. "Pack your first-aid kit" not "A first-aid kit should be packed." |
| **Enthusiasm** | Genuine excitement without being cloying. One exclamation point per section max. |
| **Inclusivity** | Gender-neutral language. Assume diverse backgrounds. |
| **Safety** | When discussing safety, shift to direct, serious-but-not-scary tone. Authoritative, not casual. |

### What the guide is NOT

- **Not a workbook.** It teaches the knowledge to fulfill requirements — no fill-in-the-blank answers.
- **Not a pamphlet replacement.** It supplements and enriches.
- **Not a merit badge counselor.** It prepares the Scout for the conversation with their counselor.

## Information Architecture

Every guide has exactly **three page types**, always in this order:

```
Introduction & Overview  → _index.md
Requirement Pages        → req{N}.md or req{N}{letter}.md
Extended Learning        → extended-learning.md
```

### URL Slug Convention

```
/merit-badges/{slug}/guide/              (Introduction & Overview — _index.md)
/merit-badges/{slug}/guide/req1a/        (Requirement 1, sub-part a)
/merit-badges/{slug}/guide/req1b/        (Requirement 1, sub-part b)
/merit-badges/{slug}/guide/req2/         (Requirement 2, no sub-parts)
/merit-badges/{slug}/guide/extended-learning/
```

### Page Grouping

Requirements are grouped by top-level number and given a descriptive group title that captures the theme (not just "Requirement 1"). This title appears in the sidebar nav and as a kicker above the H1.

### Sub-requirement Splitting

Requirements with multiple sub-parts (a, b, c) can be **separate pages** or **combined on one page**. Use this heuristic:

- If sub-requirements are thematically similar and short → **one page** (e.g., `req2.md` covering 2a–2c)
- If sub-requirements are thematically distinct or lengthy → **separate pages** (e.g., `req1a.md`, `req1b.md`)

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

### "Choose One" Option Requirements

Some badges have a requirement that says "Complete ONE of the following options" with several large, self-contained options (e.g., Beef Cattle Option, Dairy Option, Horse Option). When each option has its own set of sub-requirements (a–f), prefer **separate pages per option** rather than combining all options onto a single page. This is better for both SEO and UX — a Scout working on the Beef Cattle option shouldn't have to scroll past five other animals.

Structure these as:

- `req6.md` — Brief overview page explaining the Scout picks ONE option, with summaries and links to each
- `req6-{option-slug}.md` — Full-detail page for each option (e.g., `req6-beef-cattle.md`, `req6-dairy.md`)

On each option sub-page, use the `option` parameter on the `drg/requirement` shortcode to identify which option that page covers:

```markdown
{{</* drg/requirement number="6" option="Dairy Option" */>}}
Complete ONE of the following options:
{{</* /drg/requirement */>}}
```

This renders as "6. Complete ONE of the following options: **Dairy Option**" so the reader immediately knows which option they are viewing. The overview page (`req6.md`) should NOT use the `option` parameter.

Use the `is_option` and option slug from `data.json` to derive filenames.

### Heading & SEO Rules

- Every page has a unique, descriptive `<h1>` matching its sidebar nav link text exactly.
- **H1** comes from `title` front matter.
- **Kicker** (above H1) comes from `group_title` front matter.
- **`<title>` tag** follows: `{title} | {badge_name} Merit Badge`.
- **Badge image** appears only on the Introduction & Overview page (`_index.md`).
- **`badge_name`** is set once in `_index.md` and inherited by child pages.
- **Capitalization:** Sub-requirement letters are always lowercase per `data.json` (use `Req 1a`, not `Req 1A`).

## Page Specifications

### _index.md — Introduction & Overview

**Front matter:**

```yaml
---
title: "Introduction & Overview"
layout: guide
badge_name: "{Badge Title}"
group_title: "Getting Started"
next: "/merit-badges/{slug}/guide/req1a/"
next_title: "Requirement 1a — {Short Title}"
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
5. **Transition CTA** — Bridge sentence + `{{</* drg/next-page */>}}` shortcode linking to first requirement.

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

2. **Educational content** — 500–1500 words teaching what the Scout needs to know. Content strategy depends on requirement type:

   | Requirement asks Scout to... | Strategy |
   |------------------------------|----------|
   | Explain / Define | Clear explanations, definitions, "Did You Know" callouts |
   | Demonstrate / Show | Step-by-step descriptions, checklists, video references |
   | Identify / List | Representative examples with context, encourage finding their own |
   | Research / Discuss | Frame key questions, multiple perspectives, authoritative links |
   | Create / Plan / Build | Planning frameworks, templates, example completed plans |
   | Do / Perform | Preparation guidance, safety info, practical tips, planning templates |
   | Choose one of several | Present all options, help Scout choose, guidance for each path |

3. **Content elements** — At least 2–3 different types per page (see shortcode catalog below).

4. **Cross-references** — Link to related requirement pages with natural language.

5. **Transition CTA** — Bridge sentence connecting to the next requirement.

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

**IMPORTANT:** YouTube videos must ALWAYS use the `drg/video` shortcode, which embeds the video player directly on the page. Do NOT use `drg/external-link` for YouTube URLs — that renders as a plain link instead of an embed. Reserve `drg/external-link` for non-video resources (websites, articles, tools, organizations).

### Video Verification Protocol

AI models hallucinate plausible-looking YouTube video IDs that don't correspond to real videos. **Every video ID must be verified before inclusion.**

1. **Never invent YouTube video IDs.** Do not guess or fabricate IDs. Every `drg/video` shortcode must reference a verified, existing video.

2. **Verification method:** Before adding any `drg/video` shortcode, verify the video ID using noembed:
   ```
   https://noembed.com/embed?url=https://www.youtube.com/watch?v={VIDEO_ID}
   ```
   If the JSON response contains `"error"`, the video does not exist — do not use it.

3. **Finding real videos:** Use web search to find pages that embed relevant videos (e.g., search for "Red Cross CPR training video"), then extract video IDs from those pages. Prefer videos from reputable sources: American Red Cross, American Heart Association, CDC, Mayo Clinic, St John Ambulance, NOLS, REI, etc.

4. **Fallback:** If no verified video can be found for a topic, use a `drg/external-link` to a reputable organization's video page instead of embedding a specific video. A guide page without a video is better than one with a broken embed.

### Image Placeholders

During content writing, use HTML comment placeholders instead of image shortcodes (keeps Hugo build green before images exist):

```markdown
<!-- IMAGE: filename-id.png | Alt text description -->
<!-- IMAGE: compass-parts-labeled.png | Baseplate compass with all parts labeled | style:diagram -->
```

The optional `style:` hint indicates which image generation style to use (see Image Style Selection below). If omitted, the image defaults to `photo` style.

Aim for 2-3 images per page at natural visual break points.

**Uniform rule:** Scout uniforms must always appear clean and presentable in image descriptions — no paint, mud, stains, or visible wear. If the scene involves messy activities (painting, gardening, cooking), describe Scouts in work clothes or describe the uniforms as clean and unaffected. Never depict the uniform as dirty or damaged.

**Trademark rule:** The words "Scouting America," "Boy Scouts of America," or "BSA" must NEVER appear as visible rendered text in any generated image. The image generator may pick up these terms from descriptions and render them on clothing, signs, or backgrounds. Using "BSA uniform" or "Scout" in image descriptions is fine for conveying context — the restriction is specifically about the generated image containing those words as readable text.

**Do NOT** wrap shortcode syntax inside HTML comments — Hugo still processes shortcodes inside comments, causing build errors.

### Image Style Selection

The image generation pipeline supports six styles. Choose the style that best serves the educational content — not every image needs to be a photo.

| Content type | Style | When to use |
|---|---|---|
| Scouts doing an activity, scene-setting, mood | `photo` | Where photorealistic shots genuinely add value — action, environment, teamwork |
| Equipment parts, labeled anatomy, component breakdown | `diagram` | Clean labels, precise detail, no distracting scenery |
| Safety technique with labeled checkpoints | `annotated-photo` | Realistic base + overlaid callouts at key positions |
| Correct vs incorrect, before/after, do vs don't | `comparison` | Split-frame makes contrast unmistakable |
| Data, rules, principles, lists, steps | `infographic` | Icons + text hierarchy, scannable at a glance |
| Field guide subject, equipment illustration | `illustrated` | Precise linework, labeled features, educational colors |

**Quick decision rule:** If the image's primary job is to **label parts** or **show data**, use `diagram`/`infographic`/`illustrated`. If it's to **show people doing things**, use `photo` or `annotated-photo`. If it's to **contrast two things**, use `comparison`.

**Style values for `images.json`:** `"photo"` (default — omit field), `"diagram"`, `"infographic"`, `"illustrated"`, `"annotated-photo"`, `"comparison"`

## Handling Requirement Modes

The `data.json` `subrequirement_mode` field determines how sub-requirements relate:

| Mode | Meaning | Approach |
|------|---------|----------|
| `"type": "all"` | Complete all | Full content for each |
| `"type": "select", "count": 1` | Pick one | Present all options, make clear they pick ONE |
| `"type": "select", "count": N` | Pick N | Present all options, note they choose N |

## Worksheets & Printable Tools

### When to Create a Worksheet

Use this test: **"Would a Scout actually print this out, fill it in by hand, and bring it to their counselor or use it in the field?"** If yes, create a printable worksheet. If it is just a reference list, an inline `drg/checklist` is fine.

**Common worksheet triggers:**

- Requirements that say "keep a log" or "make a plan"
- Requirements that say "create a list" or "prepare a checklist" for field use
- Requirements with tables or forms the Scout fills in over time
- Requirements where the Scout needs counselor sign-off on a planning artifact

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

- Add worksheets to `guide_nav` in `_index.md` under their parent requirement's group.
- Link to worksheets from the requirement page using the `drg/download` shortcode with `type="printable"`.

### Canonical Examples

Two exemplar worksheets demonstrate different approaches:

- `hugo/content/merit-badges/hiking/guide/hike-plan-worksheet/index.md` — fields, tables, draw areas, signature blocks
- `hugo/content/merit-badges/bird-study/guide/field-notebook-worksheet/index.md` — check grids, writing areas, repeated-use design

## Content Rules

### DO

- Teach the knowledge, not the answer
- Include safety content wherever warranted
- Link to authoritative external sources (at least one per requirement page)
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

Look at how the Astronomy guide mixes `safety-first`, `checklist`, `be-prepared`, `tip`, `external-link`, and `image` shortcodes within individual pages — varying the order and density based on what the content actually needs.

### Cross-References

When a later requirement builds on an earlier one, link back with natural language: "In Req 1e, you learned about safe food temperatures — those same principles apply here." Don't force cross-references where the connection is tenuous. A genuine cross-reference helps the Scout see how the badge fits together; a forced one is noise.

### Extended Learning Depth

Each deep-dive section in Extended Learning should teach something **genuinely new** — a skill, concept, or perspective that the requirement pages didn't cover. "Here are more things you can do" is not a deep dive. "Here is how competitive archers train their breathing to hold steady at full draw" is.

## Production Workflow

Work through these phases in order. Check in with the user after each phase.

### Phase 1: Analysis

1. Read `data.json` for the badge.
2. Identify requirement groupings and assign descriptive group titles.
3. Map the full page structure (every page, URL slug, group title).
4. Identify the subject's breadth (types/varieties for the Introduction page).
5. Identify the history angle (Then vs. Now).
6. List external resources for each requirement. Note: `data.json` may include a `resources` array on individual requirements (e.g., official Scouting videos or worksheets scraped from scouting.org). Consider incorporating these if they are valuable compared to other resources you plan to use.
7. **Present the analysis to the user for approval before writing content.**

### Phase 2: Write _index.md (Introduction & Overview)

8. Write front matter with complete `guide_nav`.
9. Write Overview, History, Get Ready, Kinds of {Subject}, and Transition CTA.
10. Add image placeholders.

### Phase 3: Write Requirement Pages (in order)

For each page:
11. Write front matter with correct prev/next links.
12. Display exact requirement text via shortcode.
13. Draft 500–1500 words of educational content.
14. Add 2–3 content element types.
15. Add cross-references and transition CTA.
16. Add image placeholders.

### Phase 4: Write extended-learning.md

17. Write 2–4 deep-dive topics.
18. Curate real-world experiences.
19. List 3–6 relevant organizations.

### Phase 5: Image Manifest

**You MUST complete this phase — do not stop after writing content.**

20. Create `images.json` in the guide directory with 2–3 images per page.

```json
{
  "badge": "{slug}",
  "style_context": "{Subject description}",
  "images": [
    {
      "id": "descriptive-kebab-id",
      "file": "_index.md",
      "description": "Detailed scene description for AI image generator"
    },
    {
      "id": "compass-parts-labeled",
      "file": "req3.md",
      "style": "diagram",
      "description": "Baseplate compass with all major parts labeled..."
    }
  ]
}
```

The `style` field is optional — omit it for standard photo images. Use it when a non-photo style (diagram, infographic, illustrated, annotated-photo, comparison) better serves the content. See Image Style Selection above for guidance.

21. **Run generation immediately** (do not ask the user or wait for approval): `bun run generate:drg-images {slug}` — This command may take several minutes for large guides. Let it run to completion.
22. **Convert images to AVIF**: Run `bun run convert:drg-images -- --badge {slug}` to convert all generated PNGs to AVIF format (1200px wide, quality 80). Then delete the source PNGs: `rm hugo/content/merit-badges/{slug}/guide/images/*.png`
23. **Convert all `<!-- IMAGE: -->` placeholders** to `{{</* drg/image src="images/{id}.avif" alt="..." */>}}` shortcodes. Match each placeholder's filename-id to the corresponding entry in `images.json`. Every placeholder must be converted — zero should remain.

### Phase 6: Verification

**You MUST complete this phase — do not stop after image generation.**

24. Verify Hugo build passes: `bun run build`
25. Check no orphan image placeholders remain (grep for `<!-- IMAGE:` — expect zero matches).
26. Verify all YouTube video embeds: `bun run verify:youtube-links` (expect zero broken links).
27. Verify all nav links and cross-references.
28. Run through the quality checklist.

## Quality Checklist

### Per-Page

- [ ] Page title is unique and matches sidebar nav link text
- [ ] Group title (kicker) is set
- [ ] Requirement text is exact (verbatim from `data.json`)
- [ ] Umbrella requirements ("Do the following:", "Explain the following:") have an intro paragraph listing the sub-topics
- [ ] Educational content teaches, doesn't give answers
- [ ] Voice is age-appropriate (6th–8th grade)
- [ ] 2–3 content element types used
- [ ] Safety addressed where warranted
- [ ] At least one external link
- [ ] Image placeholders have descriptive alt-text
- [ ] Transition CTA bridges to next page
- [ ] Previous/Next navigation is correct
- [ ] Content is 500–1500 words

### Full Guide

- [ ] All requirements covered
- [ ] Descriptive group titles assigned
- [ ] Introduction has all sections (Overview, History, Get Ready, Kinds, CTA)
- [ ] Extended Learning has deep dives, experiences, organizations
- [ ] Cross-references work between pages
- [ ] Select-mode requirements clearly indicate choice
- [ ] Consistent tone throughout
- [ ] `badge_name` set in `_index.md`
- [ ] Eagle Required displayed correctly based on `data.json`
- [ ] Capitalization matches `data.json` (lowercase sub-requirement letters)
- [ ] JSON-LD structured data renders on all guide pages (view page source for `ld+json`)
- [ ] All YouTube video embeds verified via noembed (zero broken links)

## Pull Request Workflow

At the **start** of the workflow, check the current git branch:

```bash
git branch --show-current
```

If the branch is **not `trunk`** (e.g., working in a worktree or feature branch), assume the user wants a pull request opened at the end. After Phase 6 (Verification) passes:

1. **Stage and commit** all guide files:
   ```bash
   git add hugo/content/merit-badges/{slug}/guide/
   ```
   Commit with message: `Add {Badge Title} Digital Resource Guide`

2. **Push the branch** to the remote:
   ```bash
   git push -u origin HEAD
   ```

3. **Open a PR** against `trunk`:
   ```bash
   gh pr create --title "Add {Badge Title} Digital Resource Guide" --body "..."
   ```
   Use the standard PR body format with a summary of pages created, and include the `Generated with Claude Code` footer.

4. **Share the PR URL** with the user.

If the branch **is `trunk`**, do **not** commit or open a PR automatically — just notify the user that the guide is ready and ask if they'd like to commit.

## Smoke Testing (after build passes)

Start the dev server (`bun run hugo:dev`) or build (`bun run build`) and verify:

### Every Page

- [ ] Page loads without error (no 404, no blank page)
- [ ] H1 renders correctly with lowercase sub-requirement letters
- [ ] Kicker (group title) appears above the H1
- [ ] Sidebar navigation renders with all links and correct titles
- [ ] Active sidebar link is highlighted
- [ ] Previous/Next links go to the correct pages with matching titles
- [ ] Requirement shortcode renders with correct number badge
- [ ] All shortcode callouts (Safety First, Did You Know, Tips, etc.) display correctly
- [ ] External links open and destinations are live (spot-check 2–3 per page)
- [ ] Cross-reference links between guide pages resolve correctly
- [ ] JSON-LD `application/ld+json` block is present in page source

### Consistency

- [ ] No uppercase sub-requirement letters — grep for `Req [0-9]+[A-Z]` patterns (zero matches = clean)
- [ ] No orphan image placeholders — grep for `<!-- IMAGE:` (zero matches = all converted)
- [ ] `guide_nav` titles in `_index.md` match each page's `title` front matter exactly
- [ ] YAML indentation in `guide_nav` is consistent (2 spaces)
