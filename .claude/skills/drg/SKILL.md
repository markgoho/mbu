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

- **Requirements data:** `hugo/content/merit-badges/$ARGUMENTS/data.json`
- **Output directory:** `hugo/content/merit-badges/$ARGUMENTS/guide/`
- **Reference guide:** `hugo/content/merit-badges/hiking/guide/` (the published Hiking guide — use as a structural example)

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

## Shortcode Catalog

Use these Hugo shortcodes throughout the guide:

```markdown
{{</* drg/requirement number="1a" */>}}
Exact requirement text here.
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

{{</* drg/next-page
    text="Now that you know about X"
    teaser="Find out how to Y."
    url="/merit-badges/{slug}/guide/{next-page}/" */>}}

{{</* drg/download
    title="Template Name"
    url="/downloads/template.pdf" */>}}

{{</* drg/video
    title="Video Title"
    url="https://www.youtube.com/watch?v=..." */>}}
```

### Image Placeholders

During content writing, use HTML comment placeholders instead of image shortcodes (keeps Hugo build green before images exist):

```markdown
<!-- IMAGE: filename-id.png | Alt text description -->
```

Aim for 2–3 images per page at natural visual break points.

**Do NOT** wrap shortcode syntax inside HTML comments — Hugo still processes shortcodes inside comments, causing build errors.

## Handling Requirement Modes

The `data.json` `subrequirement_mode` field determines how sub-requirements relate:

| Mode | Meaning | Approach |
|------|---------|----------|
| `"type": "all"` | Complete all | Full content for each |
| `"type": "select", "count": 1` | Pick one | Present all options, make clear they pick ONE |
| `"type": "select", "count": N` | Pick N | Present all options, note they choose N |

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

## Production Workflow

Work through these phases in order. Check in with the user after each phase.

### Phase 1: Analysis

1. Read `data.json` for the badge.
2. Identify requirement groupings and assign descriptive group titles.
3. Map the full page structure (every page, URL slug, group title).
4. Identify the subject's breadth (types/varieties for the Introduction page).
5. Identify the history angle (Then vs. Now).
6. List external resources for each requirement.
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
    }
  ]
}
```

21. Run generation: `bun run generate:drg-images {slug}`
22. Convert `<!-- IMAGE: -->` placeholders to `{{</* drg/image src="images/{id}.png" alt="..." */>}}` shortcodes.

### Phase 6: Verification

23. Verify Hugo build passes: `bun run build`
24. Check no orphan image placeholders remain.
25. Verify all nav links and cross-references.
26. Run through the quality checklist.

## Quality Checklist

### Per-Page

- [ ] Page title is unique and matches sidebar nav link text
- [ ] Group title (kicker) is set
- [ ] Requirement text is exact (verbatim from `data.json`)
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

### Consistency

- [ ] No uppercase sub-requirement letters — grep for `Req [0-9]+[A-Z]` patterns (zero matches = clean)
- [ ] No orphan image placeholders — grep for `<!-- IMAGE:` (zero matches = all converted)
- [ ] `guide_nav` titles in `_index.md` match each page's `title` front matter exactly
- [ ] YAML indentation in `guide_nav` is consistent (2 spaces)
