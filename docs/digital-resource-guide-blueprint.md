# Digital Resource Guide — Production Blueprint

> A reusable prompt and plan for producing a Scouting America Digital Resource Guide for any merit badge. Feed this document plus a badge's `data.json` requirements into an AI session and work section-by-section.

---

## Table of Contents

1. [How to Use This Document](#how-to-use-this-document)
2. [Audience & Voice](#audience--voice)
3. [Information Architecture](#information-architecture)
4. [Page-by-Page Specifications](#page-by-page-specifications)
   - [Table of Contents Page](#1-table-of-contents-page)
   - [Introduction & Overview Page](#2-introduction--overview-page)
   - [Requirement Pages](#3-requirement-pages)
   - [Extended Learning Page](#4-extended-learning-page)
5. [Content Element Catalog](#content-element-catalog)
6. [Content Guidelines & Constraints](#content-guidelines--constraints)
7. [Step-by-Step Production Workflow](#step-by-step-production-workflow)
8. [Quality Review Checklist](#quality-review-checklist)
9. [Final QA — Smoke Testing the Live Guide](#final-qa--smoke-testing-the-live-guide)
10. [Reference: Hiking Guide Structural Map](#reference-hiking-guide-structural-map)

---

## How to Use This Document

This blueprint is designed to be dropped into an AI conversation alongside a single input: the merit badge's **requirements data** (the `data.json` file from MBU, or the requirements text from scouting.org).

**Per-session workflow:**

1. Start a new AI session.
2. Paste this entire blueprint as context.
3. Paste (or reference) the badge's requirements.
4. Work through the sections in the order described in the [Production Workflow](#step-by-step-production-workflow), one page at a time.
5. Review each page against the [Quality Checklist](#quality-review-checklist) before moving on.

The blueprint is **opinionated about structure** (every guide should feel like the same product) but **flexible about content** (each badge's subject matter will dictate the specific educational material, callout topics, and external resources).

---

## Audience & Voice

### Who is the reader?

- **Primary**: Scouts BSA members, ages 11–17
- **Secondary**: Merit badge counselors using the guide as a teaching companion
- **Tertiary**: Parents/guardians helping Scouts prepare

### Voice & Tone Rules

| Attribute          | Guideline                                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Reading level**  | Aim for 6th–8th grade. Use short sentences. Define technical terms on first use.                                                              |
| **Tone**           | Encouraging, conversational, and informative. Think "experienced camp counselor explaining something cool" — not textbook, not condescending. |
| **Second person**  | Address the reader as "you" throughout.                                                                                                       |
| **Active voice**   | Prefer active over passive. "Pack your first-aid kit" not "A first-aid kit should be packed."                                                 |
| **Enthusiasm**     | Convey genuine excitement for the subject without being cloying. One exclamation point per section maximum.                                   |
| **Inclusivity**    | Use gender-neutral language. Assume diverse backgrounds, locations, and experience levels.                                                    |
| **Safety gravity** | When discussing safety, shift to a direct, serious-but-not-scary tone. Safety content should feel authoritative, not casual.                  |

### What the guide is NOT

- **Not a workbook.** It does not provide fill-in-the-blank answers. It teaches the knowledge needed to fulfill requirements.
- **Not a pamphlet replacement.** It supplements and enriches, pointing to the pamphlet and other resources.
- **Not a merit badge counselor.** It cannot sign off requirements. It prepares the Scout for the conversation with their counselor.

---

## Information Architecture

Every Digital Resource Guide consists of exactly **four page types**, always in this order:

```
Table of Contents
Introduction & Overview
Requirement Pages (one per requirement or sub-requirement, as appropriate)
Extended Learning
```

### Navigation Model

- A persistent **sidebar navigation** shows the full outline at all times.
- Each requirement page has **Previous / Next** links at the bottom.
- Requirements with multiple sub-parts (A, B, C) are presented as **tabs within a single page** or as **separate pages** — whichever produces better content flow. Use this rule of thumb:
  - If sub-requirements are thematically similar and short → **tabs on one page**
  - If sub-requirements are thematically distinct or lengthy → **separate pages**

### URL Slug Convention

```
/contents/
/                        (Introduction & Overview is the root)
/req1a/                  (Requirement 1, sub-part A)
/req1b/                  (Requirement 1, sub-part B)
/req2/                   (Requirement 2, no sub-parts)
/extended-learning/
```

### Page Grouping

Requirements are **grouped by their top-level number** and given a **descriptive group title** that captures the theme (not just "Requirement 1"). For example, Hiking groups Requirement 1's two sub-parts under "Hazards While Hiking." This title appears in the sidebar navigation and as a kicker above the H1 on each requirement page.

### Heading Hierarchy & SEO

Every guide page must have a **unique, descriptive `<h1>`** that matches its sidebar navigation link text exactly. This ensures:

1. **SEO**: Search engines see a distinct, relevant H1 on every page.
2. **Accessibility**: Screen readers announce the page topic immediately.
3. **Consistency**: The nav link text = the H1 = the browser tab title (with badge suffix).

**Rules:**

| Element               | Source                                | Example                                             |
| --------------------- | ------------------------------------- | --------------------------------------------------- |
| **H1**                | `title` front matter field            | "Req 1a — Anticipate Hazards"                       |
| **Kicker** (above H1) | `group_title` front matter field      | "HAZARDS WHILE HIKING"                              |
| **`<title>` tag**     | `{title} \| {badge_name} Merit Badge` | "Req 1a — Anticipate Hazards \| Hiking Merit Badge" |
| **Nav link text**     | `guide_nav[].items[].title`           | "Req 1a — Anticipate Hazards"                       |

**Badge image** appears only on the Introduction & Overview page (the guide section's `_index.md`).

**`badge_name`** is set once in the section's `_index.md` front matter and inherited by all child pages for the `<title>` tag.

---

## Page-by-Page Specifications

### 1. Table of Contents Page

**Purpose:** Orient the reader. Show what's ahead. Build anticipation.

**Structure:**

```
[Eagle Required badge, if applicable]

Kicker: "Getting Started"
H1: "Table of Contents"

[Introduction and Overview] — one-sentence description
[Requirement Group 1 — Descriptive Title]
  - Requirement 1(A) — requirement text (abbreviated if long)
  - Requirement 1(B) — requirement text
[Requirement Group 2 — Descriptive Title]
  - Requirement 2(A) — requirement text
  ...
[Extended Learning] — "Want to learn more about [subject]?"
```

**Note:** No badge image on the Table of Contents page. The badge image only appears on the Introduction & Overview page.

**Content rules:**

- Every requirement and sub-requirement must be listed with its full or lightly-abbreviated text.
- Each entry is a link to the corresponding page.
- The "Extended Learning" entry always comes last with the teaser "Want to learn more about [subject]?"

---

### 2. Introduction & Overview Page

**Purpose:** Get the reader excited about the subject. Provide context before diving into requirements.

**Structure (in order):**

#### A. Hero Section

- **Badge image** — displayed in the header (this is the only page type that shows the badge image).
- **Kicker** — "Getting Started" (the group title) displayed as small uppercase text above the H1.
- **H1** — "Introduction & Overview" (the page title).
- Eagle Required badge if applicable.

#### B. Overview Paragraph

- 2–4 sentences: What is this subject? Why does it matter? Why should a Scout care?
- Connect the subject to Scouting values or real-life applicability.

#### C. History Section — "Then vs. Now"

- **"Then"** block: How this subject existed or was practiced historically. Frame it as necessity, origin, or early practice.
  - Include: a short title (e.g., "The Hike of Necessity"), Purpose and Mindset one-liners.
- **"Now"** block: How the subject is practiced today. Frame it as choice, evolution, or modern relevance.
  - Include: a short title (e.g., "Hike of Choice"), Purpose and Mindset one-liners.
- **Adaptation note:** Not every badge has a clean "then/now" arc. For badges where the subject is modern (e.g., Robotics, Game Design), reframe this as "Origins" and "Where We Are Today" — or "The Problem It Solves" and "How It's Used Now."

#### D. "Get Ready!" Motivational Callout

- A short (1–3 sentence) encouraging message: "The adventure of [subject] awaits you. All you have to do is [take the first step / get started / dive in]."
- Accompanied by an illustration placeholder.

#### E. "Kinds of [Subject]" Section

- Catalog the **varieties, types, or domains** within the subject.
- For each type:
  - **Heading** with the type name
  - **1–2 paragraph description** of what it is and what makes it interesting
  - **Safety First callout** (if the type has safety considerations)
  - **Optional external link** to a relevant authoritative resource
- **Adaptation note:** The number of types varies by badge. Hiking has 9 (Urban, Back-Roads, Snow, Tundra, Desert, Cross-Country, Night, Trail). Other badges might have 3–4. The point is to show the reader the _breadth_ of the subject before narrowing into requirements. For non-physical badges (e.g., Personal Management, Citizenship), this section can be reframed as "Areas of [Subject]" or "Where [Subject] Shows Up in Your Life."

#### F. Transition CTA

- A bridge sentence: "Now let's explore the requirements for the [Badge Title] Merit Badge!"
- CTA button/link with illustration pointing to the first requirement page.

#### G. Previous/Next Navigation

- Previous: Table of Contents
- Next: First Requirement

---

### 3. Requirement Pages

**Purpose:** Teach the knowledge and skills the Scout needs to fulfill each requirement.

Each requirement page follows a consistent template:

#### A. Requirement Header

- **Kicker** — The descriptive group title (e.g., "Hazards While Hiking") displayed as small, uppercase text above the H1.
- **H1 (page title)** — The requirement label and short descriptor, matching the sidebar nav link exactly (e.g., "Req 1a — Anticipate Hazards"). This is the page's `title` in front matter.
- **Badge image** — NOT shown on requirement pages (only on the Introduction & Overview page).

**Heading hierarchy and SEO rules:**

- Every page's `title` front matter must match its sidebar nav link text **exactly**.
- The `<h1>` on each page is rendered from the `title` field. No two pages should share the same `<h1>`.
- The `group_title` front matter field is displayed as a kicker above the `<h1>`, providing context without competing for heading weight.
- The `<title>` tag follows the format: `{Page Title} | {Badge Name} Merit Badge` (e.g., "Req 1a — Anticipate Hazards | Hiking Merit Badge"). The `badge_name` field is set on the guide section's `_index.md` and inherited by child pages.
- **Capitalization convention:** Sub-requirement letters in titles, nav links, and `prev_title`/`next_title` must match the capitalization from `data.json` (which uses lowercase: `"req_id": "a"`, `"path": "1.a"`). Use `"Req 1a"`, not `"Req 1A"`.

**Front matter example (requirement page):**

```yaml
---
title: "Req 1a — Anticipate Hazards"
layout: guide
group_title: "Hazards While Hiking"
req_number: "1a"
prev: "/merit-badges/hiking/guide/"
prev_title: "Introduction & Overview"
next: "/merit-badges/hiking/guide/req1b/"
next_title: "Requirement 1b — First Aid"
---
```

**Front matter example (section \_index.md — Introduction & Overview):**

```yaml
---
title: "Introduction & Overview"
layout: guide
badge_name: "Hiking"
group_title: "Getting Started"
guide_nav:
  - group_title: "Getting Started"
    items:
      - title: "Table of Contents"
        url: "/merit-badges/hiking/guide/contents/"
      - title: "Introduction & Overview"
        url: "/merit-badges/hiking/guide/"
  - group_title: "Hazards While Hiking"
    items:
      - title: "Req 1a — Anticipate Hazards"
        url: "/merit-badges/hiking/guide/req1a/"
        is_sub: true
  # ...
---
```

#### B. Sub-requirement Tabs (if applicable)

- When a requirement has parts (a, b, c), show tabs at the top: `Requirement 1 (a)` | `Requirement 1 (b)` etc.
- Active tab is visually distinct. Each tab links to its page (or scrolls to its section if single-page).

#### C. Requirement Text Block

- Display the **exact requirement text** from `data.json`, presented prominently.
- This is the official Scouting America requirement — never paraphrase or alter it.

#### D. Educational Content

This is the heart of the guide. The content here must **teach the Scout what they need to know** to fulfill the requirement. It does NOT give them the answer — it gives them the knowledge to formulate their own answer.

**Content strategies by requirement type:**

| Requirement asks Scout to...         | Content strategy                                                                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **Explain / Define**                 | Provide clear explanations, definitions, and context. Use "Did You Know" callouts for engaging facts.                            |
| **Demonstrate / Show**               | Describe the skill step-by-step. Include checklists. Reference videos or visual guides.                                          |
| **Identify / List examples**         | Provide representative examples with enough context for the Scout to understand each one, then encourage them to find their own. |
| **Research / Discuss**               | Frame the key questions. Present multiple perspectives. Provide links to authoritative sources for deeper reading.               |
| **Create / Plan / Build**            | Provide a planning framework, template, or worksheet. Show an example of a completed plan. Link to downloadable PDF templates.   |
| **Do / Perform a physical activity** | Provide preparation guidance, safety information, and practical tips. Include planning templates.                                |
| **Choose one of several options**    | Present all options with enough information to help the Scout choose. Provide guidance for each option path.                     |

**Content density target:** Each requirement page should contain 500–1500 words of educational content (not counting navigation, headers, or requirement text). This is enough to be genuinely helpful without being overwhelming.

#### E. Cross-references

- When content on one requirement page relates to another requirement, link back. (Example: Hiking Req 4 links back to the "Five W's" from Req 1a.)
- Use natural language links: "Remember the Five W's from [Requirement 1a](/req1a/)?"

#### F. Transition CTA

- A bridge sentence connecting what was just learned to what comes next.
  - Pattern: "Now that you know [what this requirement covered], find out [what the next requirement teaches]."
- CTA button/link with illustration pointing to the next requirement page.

#### G. Previous/Next Navigation

- Always present at the bottom of every requirement page.

---

### 4. Extended Learning Page

**Purpose:** Inspire the Scout to go further. Provide resources beyond the requirements.

**Structure:**

#### A. Hero Section

- **Kicker** — "Beyond the Badge" (the group title) displayed as small uppercase text above the H1.
- **H1** — "Extended Learning" (the page title).
- No badge image on this page.

#### B. Deep Dives

- 2–4 sections that go deeper into practical aspects of the subject.
- These should cover things the Scout might be curious about after completing requirements, or practical knowledge that makes the badge skills more useful in real life.
- **Adaptation note:** For Hiking, these were boot selection and real hiking destinations. For other badges, think "what would a Scout Google after finishing this badge?"

#### C. Real-World Experiences / Destinations / Projects

- Curated list of real places to go, projects to try, or experiences to seek out.
- For each, include: name, location/context, key details, and what makes it notable.
- Use a card-based layout for visual appeal.

#### D. Organizations & Communities

- List of 3–6 organizations relevant to the badge subject.
- For each: name, one-sentence mission description, and link.
- Prioritize organizations that a Scout could actually join, volunteer with, or learn from.

#### E. Navigation

- Previous: Last Requirement
- (No "Next" — this is the final page)

---

## Content Element Catalog

These are the reusable content elements that appear across pages. Each should map to a Hugo shortcode or partial.

### Safety First Callout

- **Icon:** Warning/caution icon
- **Usage:** Whenever content touches on physical safety, online safety, or risk mitigation.
- **Tone:** Direct and authoritative. Not alarming.
- **Length:** 2–5 sentences.
- **Frequency:** At least one per requirement page for badges with safety dimensions. For badges without physical risk (e.g., Citizenship), use sparingly or adapt to "Important Note" callouts about legal/ethical considerations.

```markdown
{{< safety-first >}}
Be ready to step onto the shoulder of the road to give vehicles plenty of room.
When hiking on a road, always walk single file on the left shoulder — facing
oncoming traffic.
{{< /safety-first >}}
```

### Did You Know Callout

- **Icon:** Lightbulb or question mark
- **Usage:** Fun facts, surprising statistics, or historical tidbits that maintain engagement.
- **Tone:** Enthusiastic, conversational.
- **Length:** 1–3 sentences.
- **Frequency:** 1–3 per requirement page.

```markdown
{{< did-you-know >}}
Many wilderness areas have restrictions on how many people can hike together
on the same trail. These limits help protect the environment and preserve
the natural experience for everyone.
{{< /did-you-know >}}
```

### Tip Callout

- **Icon:** Flashlight or lightbulb
- **Usage:** Practical, actionable advice that helps the Scout succeed.
- **Tone:** Helpful, like advice from a more experienced Scout.
- **Length:** 1–4 sentences.

```markdown
{{< tip >}}
After your hike, write a report to show your counselor. Your hiking report
can be as simple as a notebook for writing the highlights of each journey.
{{< /tip >}}
```

### Collapsible Checklist

- **Usage:** Gear lists, supply lists, step-by-step procedures.
- **Behavior:** Collapsed by default, expandable on click.
- **Each item** can have a short description underneath.

```markdown
{{< checklist title="Scout Essentials Checklist" subtitle="Pack these in your daypack for every hike" >}}

- Pocketknife (with permission): A pocketknife or multitool could be the most useful tool you can own.
- First-aid kit: Your patrol leader will bring a group kit, but you should always carry your own.
- Extra clothes: Layering allows a hiker to adjust clothing to match the weather.
  {{< /checklist >}}
```

### External Link Card

- **Usage:** Links to authoritative external websites (Leave No Trace, NPS, professional organizations, etc.).
- **Display:** Title + URL, optionally with a preview image.
- **Rule:** Only link to established, authoritative sources. No personal blogs, no commercial product pages (except for tools/resources the Scout actually needs).

```markdown
{{< external-link
    title="Find a Wilderness"
    url="https://wilderness.net/visit-wilderness/find-a-wilderness.php"
    description="Search for wilderness areas by state, activity, or features." >}}
```

### Downloadable PDF Link

- **Usage:** Planning templates, worksheets, report forms.
- **Display:** Document icon + title + download link.

```markdown
{{< download
    title="10-Mile Hike #1 - Pre-Hike Plan"
    url="/downloads/pre-hike-plan-template.pdf" >}}
```

### Video Embed

- **Usage:** Instructional videos, demonstrations, or inspirational content.
- **Display:** Embedded YouTube/video player or linked thumbnail.
- **Rule:** Only embed or link to official Scouting America videos, educational institution content, or well-established organizations' channels.

```markdown
{{< video
    title="How to Read a Compass"
    url="https://www.youtube.com/watch?v=..." >}}
```

### "Be Prepared!" Block

- **Usage:** Scenario-based guidance for specific situations (getting lost, running out of water, encountering wildlife, etc.).
- **Structure:** Heading + "Be Prepared!" label + bulleted or numbered steps.
- **Tone:** Calm, instructional, empowering.

```markdown
{{< be-prepared title="Got Lost?" >}}
If you think you are lost, stop where you are and follow the four steps
that spell STOP:

- **Stay Calm**: Sit down. Have some water and something to eat.
- **Think**: Try to remember how you got where you are.
- **Observe**: Look for footprints, landmarks, or sounds.
- **Plan**: If convinced you know the way, move carefully using a compass bearing.
  {{< /be-prepared >}}
```

### Transition CTA

- **Usage:** End of every page except the last.
- **Structure:** Bridge sentence + illustrated button/link to next page.
- **Illustration:** A small decorative image (consistent across the guide).

```markdown
{{< next-page
    text="Now that you know how to mitigate and prevent hazards on the trail"
    teaser="Find out how to carry out first aid for injuries and illnesses while on a hike."
    url="/req1b/" >}}
```

### Requirement Text Display

- **Usage:** Every requirement page, prominently displayed.
- **Structure:** Requirement number icon + exact requirement text.
- **Rule:** NEVER edit or paraphrase the official requirement text.

```markdown
{{< requirement number="1a" >}}
Explain to your counselor the most likely hazards you may encounter while
hiking, and what you should do to anticipate, help prevent, mitigate, and
respond to these hazards.
{{< /requirement >}}
```

### Experience/Destination Card

- **Usage:** Extended Learning page for real-world places or experiences.
- **Structure:** Image + Title + Key details (distance, highlights, etc.)

```markdown
{{< experience-card
    title="The Narrows – Zion National Park, UT"
    image="/images/narrows.webp"
    details="Distance: Varies (up to 9.4 miles) | Highlights: Hike through the Virgin River in a slot canyon" >}}
```

### Organization Card

- **Usage:** Extended Learning page for relevant nonprofits/organizations.
- **Structure:** Name + mission description + link.

```markdown
{{< org-card
    name="American Hiking Society"
    description="A nonprofit dedicated to preserving public lands and protecting hiking trails across the country."
    url="https://americanhiking.org/" >}}
```

---

## Content Guidelines & Constraints

### DO

- **Teach the knowledge**, not the answer. Give the Scout enough understanding to have an informed conversation with their counselor.
- **Include safety content** wherever the subject warrants it. When in doubt, include a Safety First callout.
- **Link to authoritative external sources.** Every requirement page should have at least one external link to an established organization or official resource.
- **Cross-reference between requirements.** If later requirements build on earlier ones, link back.
- **Provide practical tools.** Checklists, templates, and planning frameworks where appropriate.
- **Use real examples and real places.** Specificity makes content engaging and useful.
- **Include a mix of content elements** on each requirement page. Aim for at least 2–3 different element types per page (e.g., a checklist + a Did You Know + an external link).

### DO NOT

- **Give away the answer.** If the requirement says "Identify 10 examples of X," do not list exactly 10 for them. Provide context, some examples, and encourage them to discover their own.
- **Copy or closely paraphrase the merit badge pamphlet.** The guide supplements it; it doesn't replace it.
- **Alter requirement text.** Always display the exact text from the official requirements.
- **Use jargon without defining it.** If a technical term is necessary, define it immediately.
- **Link to commercial products or unreliable sources.** Stick to .org, .gov, .edu, and established organizations.
- **Be preachy or lecture.** Inform and inspire; don't moralize.
- **Overload any single page.** If a requirement page is growing beyond ~1500 words of educational content, look for content to move to Extended Learning.

### Handling Requirement Modes

The `data.json` `subrequirement_mode` field tells you how sub-requirements relate:

| Mode                           | Meaning                                  | Content approach                                                                                          |
| ------------------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `"type": "all"`                | Scout must complete all sub-requirements | Treat each equally. Provide full content for all.                                                         |
| `"type": "select", "count": 1` | Scout picks one option                   | Present all options with enough info to choose. Make clear they pick ONE. Provide guidance for each path. |
| `"type": "select", "count": N` | Scout picks N options                    | Same as above but note they must choose N.                                                                |

### Image & Media Guidance

Images are generated separately from content writing using a two-step process: (1) create an image manifest, (2) run the generation script.

#### During Content Writing

- **Use HTML comment placeholders** in content files instead of the `{{</* drg/image */>}}` shortcode. This keeps the Hugo build green before images exist. Format: `<!-- IMAGE: filename.png | alt-text description -->`:
  ```markdown
  <!-- IMAGE: scout-mountain-trail.png | A Scout with a backpack looking out at a mountain trail -->
  ```
  **Important:** Do NOT wrap shortcode syntax inside HTML comments (e.g., `<!-- {{</* drg/image */>}} -->`). Hugo still processes shortcodes inside comments, causing build errors when the image file does not exist yet.
- **Aim for 2–3 images per page.** Place them at natural visual break points — after introductory paragraphs, between major sections, or after key concept explanations.
- **Accessibility:** Every placeholder must include descriptive alt-text (the part after the `|`).

#### The Image Manifest (`images.json`)

Each guide must include an `images.json` file in its `guide/` directory. This manifest drives the automated image generation script. Format:

```json
{
  "badge": "hiking",
  "style_context": "Hiking and outdoor trails",
  "images": [
    {
      "id": "scout-mountain-trail",
      "file": "_index.md",
      "description": "A Scout with a backpack looking out at a mountain trail, excited to start hiking"
    }
  ]
}
```

| Field                  | Description                                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `badge`                | The badge slug (matches the content directory name)                                                                                     |
| `style_context`        | A short phrase describing the badge's subject matter. Used to prime the AI image generator's style guide for appropriate scene-setting. |
| `images[].id`          | Unique identifier. Becomes the filename (`{id}.png`). Use lowercase-kebab-case.                                                         |
| `images[].file`        | Which content file this image belongs to (for reference/auditing).                                                                      |
| `images[].description` | Detailed scene description for the AI image generator. Be specific about setting, subjects, lighting, and composition.                  |

**Rules for image descriptions:**

- Describe the scene as a photograph (the generator enforces photographic style)
- Mention specific Scout characters from the recurring cast when people appear (Maya, Ethan, Sofia, James, Kai — see the generation script's style guide)
- Include environmental details: lighting, setting, background
- Be specific enough that two runs would produce similar results

#### Image Generation

Run the generation script to create all images from the manifest:

```bash
# Generate all images for a badge
bun run generate:drg-images <badge-slug>

# Generate a single image by index (1-based)
bun run generate:drg-images <badge-slug> --index 3

# Generate a single image by ID
bun run generate:drg-images <badge-slug> --id scout-mountain-trail

# Skip images that already exist (useful for regenerating failures)
bun run generate:drg-images <badge-slug> --skip-existing
```

**Requirements:** The `GEMINI_API_KEY` environment variable must be set (Bun auto-loads from `.env` in the project root). Images are saved as `.png` files to `hugo/content/merit-badges/{slug}/guide/images/`.

#### Converting Placeholders to Shortcodes

After images are generated, convert the HTML comment placeholders to live shortcodes. The placeholder filename corresponds to the image `id` in `images.json`:

```markdown
<!-- Before (placeholder) -->
<!-- IMAGE: scout-mountain-trail.png | A Scout with a backpack looking out at a mountain trail -->

<!-- After (live shortcode) -->
{{</* drg/image src="images/scout-mountain-trail.png" alt="A Scout with a backpack looking out at a mountain trail" */>}}
```

This can be done with a find-and-replace across the guide's `.md` files, or manually page by page during a final review pass. After conversion, verify no orphan placeholders remain:

```bash
grep -rn '<!-- IMAGE:' hugo/content/merit-badges/{badge-slug}/guide/*.md
```

#### Image Style

- **Photographic.** All generated images look like real photographs (National Geographic quality).
- **Recurring cast.** When Scouts appear, they are drawn from a consistent group of five characters to create visual continuity across the guide.
- **Scouting uniform.** Youth frequently wear a Scouting America field uniform (tan shirt, olive pants) or earth-tone outdoor clothing.
- **No text, logos, or branding** in images.
- **Warm color palette.** Earthy greens, browns, golden-hour warmth.

---

## Step-by-Step Production Workflow

### Phase 1: Analysis (do this first, in conversation)

1. **Read the requirements thoroughly.** Understand the full scope of the badge.
2. **Identify requirement groupings.** Determine which sub-requirements share a page and which get their own. Assign a descriptive group title to each top-level requirement.
3. **Map the page structure.** Produce a Table of Contents outline showing every page, its URL slug, and its group title.
4. **Identify the subject's "breadth."** What are the varieties/types/domains within this subject? This feeds the Introduction page's "Kinds of [Subject]" section.
5. **Identify the history angle.** What's the "Then vs. Now" story for this subject? If the subject is modern, what's the origin story?
6. **List external resources.** For each requirement, brainstorm 2–3 authoritative external sources.

### Phase 2: Introduction & Overview

7. **Write the Overview paragraph.** 2–4 sentences.
8. **Write the History section.** "Then" block and "Now" block.
9. **Write the "Get Ready!" callout.** 1–3 sentences.
10. **Write the "Kinds of [Subject]" section.** One entry per type/variety. Include Safety First callouts where relevant.
11. **Write the Transition CTA.**
12. **Review against voice guidelines.** Is it encouraging? Conversational? Age-appropriate?

### Phase 3: Requirement Pages (work in order)

For each requirement page:

13. **Display the requirement text** exactly as written.
14. **Determine the content strategy** using the table in the [Requirement Pages](#d-educational-content) spec.
15. **Draft the educational content.** 500–1500 words.
16. **Add content elements:** Insert at least 2–3 element types (Safety First, Did You Know, checklists, external links, Be Prepared blocks, etc.).
17. **Add cross-references** to related requirement pages.
18. **Write the Transition CTA** bridging to the next page.
19. **Add image placeholders** as HTML comments with descriptive alt-text (see [Image & Media Guidance](#image--media-guidance)).

### Phase 4: Extended Learning

20. **Identify 2–4 deep-dive topics** the Scout would find interesting beyond the requirements.
21. **Curate real-world experiences** (places, projects, events).
22. **List 3–6 relevant organizations** with descriptions and links.

### Phase 5: Image Generation

23. **Create the `images.json` manifest.** Define 2–3 images per content page with unique IDs, file assignments, and detailed scene descriptions (see [Image & Media Guidance](#image--media-guidance)).
24. **Set `GEMINI_API_KEY`** in a `.env` file in the project root (Bun auto-loads it), or export it in your shell.
25. **Run the generation script:**
    ```bash
    bun run generate:drg-images <badge-slug>
    ```
    The script reads `images.json` from the guide directory, generates each image via the Gemini API, and saves `.png` files to `hugo/content/merit-badges/{slug}/guide/images/`.
26. **Review each generated image** for quality, accuracy, and appropriate content. Regenerate individual images as needed:
    ```bash
    # Regenerate a specific image by its ID
    bun run generate:drg-images <badge-slug> --id scout-mountain-trail

    # Regenerate a specific image by index (1-based)
    bun run generate:drg-images <badge-slug> --index 3

    # Generate only images that don't already have a .png file
    bun run generate:drg-images <badge-slug> --skip-existing
    ```
27. **Convert placeholders to shortcodes.** Replace all `<!-- IMAGE: ... -->` HTML comments with `{{</* drg/image src="images/{id}.png" alt="..." */>}}` shortcodes (see [Converting Placeholders to Shortcodes](#converting-placeholders-to-shortcodes)).
28. **Verify the Hugo build** passes with all images in place: `bun run build`.

### Phase 6: Table of Contents & Final Assembly

29. **Build the Table of Contents page** from the finalized page list.
30. **Verify all cross-references and navigation links.**
31. **Run the Quality Review Checklist.**

---

## Quality Review Checklist

Run through this checklist before considering any page complete:

### Per-Page Checks

- [ ] **Page title is unique and descriptive** — matches its sidebar nav link text exactly
- [ ] **H1 matches the `title` front matter** — not a generic badge name
- [ ] **Group title (kicker)** is set for all pages that belong to a group
- [ ] **Requirement text is exact** — matches official requirements verbatim
- [ ] **Educational content teaches, doesn't give answers** — Scout still needs to think and discuss with counselor
- [ ] **Voice is age-appropriate** — 6th–8th grade reading level, encouraging, conversational
- [ ] **At least 2–3 content element types** are used (callouts, checklists, links, etc.)
- [ ] **Safety is addressed** where the subject warrants it
- [ ] **At least one external link** to an authoritative source
- [ ] **Image placeholders** have descriptive alt-text
- [ ] **Transition CTA** bridges naturally to the next page
- [ ] **Previous/Next navigation** is correct
- [ ] **No jargon without definition**
- [ ] **No pamphlet content copied**
- [ ] **Content is 500–1500 words** of educational material (not counting chrome)

### Full-Guide Checks

- [ ] **All requirements are covered** — no requirement or sub-requirement is missing
- [ ] **Table of Contents matches actual pages** — every page is listed, links are correct
- [ ] **Descriptive group titles** are assigned to each top-level requirement
- [ ] **Introduction page has all 6 sections** (Overview, History, Get Ready, Kinds, Transition CTA, Nav)
- [ ] **Extended Learning exists** with deep dives, experiences, and organizations
- [ ] **Cross-references work** — requirement pages link to each other where content overlaps
- [ ] **Select-mode requirements** clearly indicate the Scout must choose
- [ ] **Consistent tone throughout** — no pages feel like they were written by a different author
- [ ] **`badge_name`** is set in the section `_index.md` front matter
- [ ] **Eagle Required badge** is displayed (or not) correctly based on badge metadata

---

## Final QA — Smoke Testing the Live Guide

The Quality Review Checklist above catches content and structural issues at the source level. This section catches issues that only appear when the guide is actually rendered. **Run this after all content is written and the Hugo build passes.**

### Build Verification

1. **`hugo --minify` exits with zero errors.** If there are YAML parsing errors, template failures, or missing files, fix them before proceeding.
2. **Page count is correct.** The build summary should show the expected number of pages. A missing page means a file isn't being processed (wrong directory, bad front matter, missing `layout: guide`).

### Live Walkthrough (dev server)

Start the dev server (`bun run hugo:dev`) and click through **every page** in the guide. For each page, verify:

- [ ] **Page loads without error** — no 404, no 500, no blank page
- [ ] **Page title (H1) renders correctly** — matches `title` front matter, uses lowercase sub-requirement letters per `data.json`
- [ ] **Kicker (group title) appears** above the H1
- [ ] **Sidebar navigation renders** — all links present, correct titles, no broken indentation
- [ ] **Active sidebar link is highlighted** — the current page's link should be visually distinct
- [ ] **Sidebar scrolls to active link** — on pages deep in the nav, the sidebar should auto-scroll to bring the active link into view
- [ ] **Previous/Next links work** — click both, verify they go to the correct pages
- [ ] **Previous/Next titles match** — the `prev_title` and `next_title` text should match the target page's actual title
- [ ] **Requirement text displays** — the `{{</* drg/requirement */>}}` shortcode renders with the correct number badge
- [ ] **Images load** — all `{{</* drg/image */>}}` shortcodes render visible images (no broken image icons)
- [ ] **Shortcode callouts render** — Safety First, Did You Know, Tips, Be Prepared blocks all display correctly
- [ ] **External links open** — spot-check 2–3 per page, verify they open in a new tab and the destination is live
- [ ] **Cross-reference links work** — any inline links to other guide pages resolve correctly

### Consistency Checks

- [ ] **Capitalization matches `data.json`** — grep all guide `.md` files for `Req [0-9]+[A-Z]` and `Requirement [0-9]+[A-Z]` patterns. Zero matches means you are clean.
  ```bash
  grep -rn 'Req [0-9]\+[A-E]' hugo/content/merit-badges/{badge-slug}/guide/*.md
  grep -rn 'Requirement [0-9]\+[A-E]' hugo/content/merit-badges/{badge-slug}/guide/*.md
  ```
- [ ] **YAML indentation is consistent** — all `guide_nav` entries in `_index.md` use the same indent width (2 spaces). Mixed indentation causes YAML parse errors or silent data corruption.
- [ ] **No orphan image placeholders** — grep for `<!-- IMAGE:` to ensure all placeholders were converted to live shortcodes.
  ```bash
  grep -rn '<!-- IMAGE:' hugo/content/merit-badges/{badge-slug}/guide/*.md
  ```
- [ ] **`guide_nav` titles match page titles exactly** — for every entry in `guide_nav`, the `title` value should be identical to the corresponding page's `title` front matter.

### Mobile & Print Spot Check

- [ ] **Mobile sidebar toggle works** — on a narrow viewport, the hamburger menu opens/closes the sidebar
- [ ] **Content is readable on mobile** — no horizontal scrolling, images scale down
- [ ] **Print view is clean** — `Ctrl+P` / `Cmd+P` produces a reasonable print layout (if print styles are enabled)

---

## Reference: Hiking Guide Structural Map

This is the exact structure of the published Hiking Digital Resource Guide, provided as a concrete example of how the blueprint works in practice.

```
Getting Started
├── Table of Contents                       title: "Table of Contents"
├── Introduction & Overview [badge image]   title: "Introduction & Overview"
│   ├── Overview (what hiking is, why it matters)
│   ├── History: "Then — The Hike of Necessity" / "Now — Hike of Choice"
│   ├── "Get Ready!" callout
│   ├── Kinds of Hiking (9 types, each with Safety First callout)
│   │   ├── Urban Hiking
│   │   ├── Back-Roads Hiking
│   │   ├── Snow Hiking
│   │   ├── Tundra Hiking
│   │   ├── Desert Hiking
│   │   ├── Cross-Country Hiking
│   │   ├── Night Hiking
│   │   └── Trail Hiking
│   └── Transition CTA → Req 1a
│
Hazards While Hiking (group_title / kicker)
├── Req 1a — Anticipate Hazards             title: "Req 1a — Anticipate Hazards"
│   ├── Requirement text
│   ├── "What's Your Plan?" — Five W's of a Trip Plan
│   ├── Did You Know (wilderness group size limits)
│   ├── Checklist: Scout Essentials
│   ├── Checklist: Personal First-Aid Kit
│   ├── Checklist: Warm-Weather Clothing
│   ├── Checklist: Cold-Weather Clothing
│   ├── Checklist: Accessories
│   ├── GPS section
│   ├── Be Prepared: "Run out of water?"
│   ├── Be Prepared: "Got Lost?" (STOP method)
│   ├── Be Prepared: "Encounter Wild Animals?"
│   ├── External links (wilderness.net, Leave No Trace, Respect Wildlife)
│   └── Transition CTA → Req 1b
│
├── Req 1b — First Aid                      title: "Req 1b — First Aid"
│   ├── Requirement text
│   ├── First aid content for each condition listed in requirement
│   └── Transition CTA → Req 2a
│
Hiking Ethics & Safety (group_title / kicker)
├── Req 2a — Hiking Practices               title: "Req 2a — Hiking Practices"
├── Req 2b — Leave No Trace                 title: "Req 2b — Leave No Trace"
├── Req 2c — Outdoor Code                   title: "Req 2c — Outdoor Code"
│
Fitness & Conditioning (group_title / kicker)
├── Req 3 — Aerobic Activity                title: "Req 3 — Aerobic Activity"
│
Hit the Trail (group_title / kicker)
├── Req 4 — Your Hikes                      title: "Req 4 — Your Hikes"
│   ├── 10-mile hike guidance
│   ├── Cross-reference to Five W's from Req 1a
│   ├── Download: Pre-Hike Plan template (PDF)
│   ├── 20-mile hike guidance
│   ├── Tip: Reporting Your Hike
│   ├── Download: Hiking Trip Plan (PDF)
│   ├── "Find Hiking Trails Near You" — 7 external links
│   └── Transition CTA → Req 5
│
├── Req 5 — Hike Reports                    title: "Req 5 — Hike Reports"
│   └── Hike report guidance and template
│
Beyond the Badge (group_title / kicker)
└── Extended Learning                        title: "Extended Learning"
    ├── Boot Selection Guide (4 categories)
    ├── Multi-day Hiking Experiences (4 trails: AT, PCT, JMT, CDT)
    ├── Same-Day Hiking Experiences (3 destinations as cards)
    ├── Urban Hiking Experiences (3 cities)
    └── Organizations (5: American Hiking Society, Sierra Club,
        Wilderness Society, NPCA, National Forest Foundation)
```

---

_This blueprint was reverse-engineered from the Scouting America Hiking Digital Resource Guide (published January 2026) and generalized for application to any of the 143 Scouting America merit badges._
