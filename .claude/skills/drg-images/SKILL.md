---
name: drg-images
description: Audit, create, and manage images for Digital Resource Guide (DRG) merit badge guides. Use this when working on DRG images — generating new images, auditing existing ones, updating images.json, or converting image formats.
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

# DRG Images — Production & Audit Skill

Manage images for Scouting America Digital Resource Guide (DRG) merit badge guides. This includes creating `images.json` manifests, generating images, converting formats, auditing existing images for value, and replacing shortcodes.

## Input

The badge slug is passed as `$ARGUMENTS`. Use it to locate:

- **Guide directory:** `hugo/content/merit-badges/$ARGUMENTS/guide/`
- **Image manifest:** `hugo/content/merit-badges/$ARGUMENTS/guide/images.json`
- **Image files:** `hugo/content/merit-badges/$ARGUMENTS/guide/images/`
- **Content files:** All `.md` files in the guide directory

## Image Value Test

Not every page needs an image. Before adding an image, apply this test:

> **"Does this image teach something that text alone cannot?"**

If the answer is no — if the image is just a mood shot, a generic photo of someone doing the activity, scene-setting decoration, or decorated text (visual formatting of content already on the page) — skip it. Pages that already have an embedded YouTube video often don't need an additional image. A guide with 12 high-value images is better than one with 30 generic ones.

**High-value images** (include these):

| Type | Example | Why it works |
|---|---|---|
| Labeled diagram | Compass with 15+ parts labeled | Reader learns part names by studying the image |
| Identification grid | 6 bird beaks side-by-side with habitat labels | Reader can identify unknown specimens |
| Correct vs incorrect | Proper vs improper knife grip, side-by-side | Reader immediately sees what to do and what to avoid |
| Step-by-step sequence | 4 panels showing how to remove medical gloves | Reader can follow the procedure |
| Before/after | Cloudy stream water vs crystal-clear filtered water | Dramatic contrast teaches effectiveness |
| Annotated technique | Ferro rod angle with arrow showing strike direction | Reader learns the physical motion |
| Spatial diagram | Bear camp layout with 200-foot distances | Spatial relationships impossible to convey in text |
| Cross-section | Snow cave showing warm air stratification | Teaches the physics of WHY the design works |

**Low-value images** (cut these):

| Type | Example | Why it fails |
|---|---|---|
| Generic activity photo | "Scout sitting in a shelter" | Shows result, teaches nothing about how to build it |
| Mood/scene-setting | "Beautiful wilderness landscape" | Decorative, adds no educational content |
| Redundant to text | Photo of a first-aid kit after you've listed every item | Reader already has the information |
| Vague staging | "Tools arranged on a rock" | No labels, no context, no technique shown |
| Decorated text | Colored bars listing priorities already in text | Visual formatting of content already on the page |
| Chart duplicating a table | Bar chart of data already in an HTML table | Reader already has the data in a more accessible format |

**Placement rule:** Every image must appear **immediately after the paragraph or section it illustrates** — embedded mid-content at the moment the reader needs it. Never cluster images at the bottom of the page before the transition CTA. The reader should encounter the image while the relevant concept is fresh, not after they've already moved on mentally.

**Anti-pattern:** Placing all images at the bottom of a page, right before `drg/next-page`. This makes images feel disconnected and decorative rather than educational.

## The `value` Field

Every image entry in `images.json` must include a `value` field that explicitly explains what the image teaches that text alone cannot convey. This serves two purposes:

1. **Gate-keeping:** If you cannot write a compelling `value` statement, the image fails the value test and should not exist.
2. **Audit trail:** During image audits, the `value` field makes it easy to verify each image earns its place.

**Format:** One sentence, written as a noun phrase describing the visual teaching. Start with what the reader sees, end with why text can't replace it.

**Examples:**

| Image | Value |
|---|---|
| `tick-removal-technique` | Shows correct grip angle near skin, straight-up pull direction, and crossed-out wrong methods — hand positioning that text cannot convey |
| `bear-camp-setup-diagram` | Bird's-eye spatial layout of three camp zones with 200-foot distances and wind direction — spatial relationships impossible in text |
| `snow-cave-cross-section` | Warm air stratification, raised sleeping platform, cold air sump, ventilation hole — teaches the physics of WHY the design works |
| `ground-to-air-signals` | The actual X, V, arrow, F, line symbols at scale with human figure — you must SEE these shapes to reproduce them |

## Image Placeholders

During content writing (in the `drg` skill), HTML comment placeholders are used instead of image shortcodes (keeps Hugo build green before images exist):

```markdown
<!-- IMAGE: filename-id.png | Alt text description -->
<!-- IMAGE: compass-parts-labeled.png | Baseplate compass with all parts labeled | style:diagram -->
```

The optional `style:` hint indicates which image generation style to use (see Image Style Selection below). If omitted, the image defaults to `photo` style.

Place each placeholder **inline with the content it supports** — directly after the paragraph that describes what the image shows. Do not group placeholders at the end of the page.

**Anti-pattern:** Placing two `drg/image` shortcodes with the same `src` on a page (or anywhere in the guide). If a page has two image shortcodes, they must reference two different image files from the manifest.

**Do NOT** wrap shortcode syntax inside HTML comments — Hugo still processes shortcodes inside comments, causing build errors.

## Image Description Rules

**Uniform rule:** When an image depicts Scouts or teenagers in a Scouting context (meetings, service projects, badge activities, interviews with professionals), **default to describing them in a clean Scout uniform** unless the activity would genuinely damage a uniform. For messy activities (painting, gardening, cooking over a fire), describe Scouts in work clothes instead. Scout uniforms must always appear clean and presentable — no paint, mud, stains, or visible wear. Never depict the uniform as dirty or damaged.

**Trademark rule:** The words "Scouting America," "Boy Scouts of America," or "BSA" must NEVER appear as visible rendered text in any generated image. The image generator may pick up these terms from descriptions and render them on clothing, signs, or backgrounds. Using "BSA uniform" or "Scout" in image descriptions is fine for conveying context — the restriction is specifically about the generated image containing those words as readable text.

**Branding rule:** Image descriptions must NEVER include "Merit Badge University," "Study Guide," "Digital Resource Guide," or any project branding. The image generator will render these as visible text on the image. Generated images should be content-only — no titles, headers, watermarks, or branding of any kind.

**People-label rule:** Demographic terms (age, gender, race, ethnicity, nationality) may appear in image description prompts to guide the scene, but must NEVER appear as visible rendered text, labels, or annotations in the generated image itself. For example, an annotated-photo description can say "a teenager climbing a wall" to set the scene, but no label or callout in the image should read "teenager" or "diverse" or any demographic term. Visible text in the image should only describe actions, equipment, techniques, or concepts.

## Image Style Selection

The image generation pipeline supports six styles. Choose the style that best serves the educational content — not every image needs to be a photo.

| Content type | Style | When to use |
|---|---|---|
| Scouts demonstrating a technique, real equipment in use | `photo` | Where photorealism adds value — action shots showing *how* to do something, real gear details |
| Equipment parts, labeled anatomy, component breakdown | `diagram` | Clean labels, precise detail, no distracting scenery |
| Safety technique with labeled checkpoints | `annotated-photo` | Realistic base + overlaid callouts at key positions |
| Correct vs incorrect, before/after, do vs don't | `comparison` | Split-frame makes contrast unmistakable |
| Data, rules, principles, lists, steps | `infographic` | Icons + text hierarchy, scannable at a glance |
| Field guide subject, equipment illustration | `illustrated` | Precise linework, labeled features, educational colors |

**Quick decision rule:** If the image's primary job is to **label parts** or **show data**, use `diagram`/`illustrated`. If it's to **show people doing things**, use `photo` or `annotated-photo`. If it's to **contrast two things**, use `comparison`.

**Infographic caution:** The `infographic` style tends to produce text-heavy images with illegible small text. AI image generators cannot reliably render readable text at web resolution, so infographics with sentences, paragraphs, or dense labels consistently fail. Prefer `illustrated` or `diagram` styles instead — they produce cleaner visuals with minimal text. Only use `infographic` when the content is genuinely data-driven (a few large numbers with icons) and the description explicitly limits text density.

**Arrow and label accuracy warning:** The image generator handles photorealistic scenes and self-structuring diagrams well (e.g., compass parts, where the layout is inherent), but it cannot reliably place arrows or labels that must point to *specific* features in a complex scene. If a diagram requires multiple arrows each targeting a distinct spatial element (e.g., "this arrow points to the stream, that arrow points to the trail"), the arrows will frequently land on the wrong features. For these cases, prefer `photo` style showing the real subject (e.g., a photo of an actual orienteering map instead of a generated diagram of one) or use `diagram` only when the structure is simple enough that labels are unambiguous (e.g., a single object with parts radiating outward).

**Diagram text density rule:** Diagrams and infographics should be **visual-first, text-light**. If more than ~30% of the image area would be occupied by text, the content is better served by HTML/CSS on the page (tables, styled lists, callout boxes) with the image focusing on the visual element only. The image generator produces illegible text at small sizes, so keep labels to short single words or very brief phrases. If you find yourself writing a description with multiple sentences of text that should appear *in* the image, rethink the approach — use the image for the visual component and put the text in the page content instead.

**Angled and curved text warning:** The image generator cannot reliably render readable text along diagonal lines, curved paths, or triangle edges. Text placed along the sides of a triangle, around a circle, or on any non-horizontal surface will frequently appear malformed, overlapping, or illegible. When a diagram concept calls for text along angled elements (e.g., labels on triangle sides, text around a wheel), **redesign the layout to use horizontal text** — for example, replace a labeled triangle with three labeled boxes in a row, or use a grid/table layout instead of a circular arrangement.

**Style values for `images.json`:** `"photo"` (default — omit field), `"diagram"`, `"infographic"`, `"illustrated"`, `"annotated-photo"`, `"comparison"`

## images.json Manifest

The manifest file lives at `hugo/content/merit-badges/{slug}/guide/images.json`.

**Only include images that pass the Image Value Test.** The total count will vary by badge — a badge with many visual techniques may have 20+ images while a discussion-heavy badge may have 8–12. Do not pad the count with generic photos. **Every entry in `images.json` must have a unique `id`, and every `<!-- IMAGE: -->` placeholder in the content must correspond to exactly one manifest entry.** The total number of manifest entries must equal the total number of image placeholders (or `drg/image` shortcodes) across all pages — no duplicates, no orphans.

### Manifest Structure

```json
{
  "badge": "{slug}",
  "style_context": "{Subject description}",
  "images": [
    {
      "id": "descriptive-kebab-id",
      "file": "_index.md",
      "description": "Detailed scene description for AI image generator",
      "value": "What this image teaches that text alone cannot"
    },
    {
      "id": "compass-parts-labeled",
      "file": "req3.md",
      "style": "diagram",
      "description": "Baseplate compass with all major parts labeled...",
      "value": "15+ labeled parts in spatial relationship — reader learns part names and positions by studying the image"
    }
  ]
}
```

### Field Reference

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Unique kebab-case identifier, becomes the filename |
| `file` | Yes | Which `.md` file this image appears in |
| `style` | No | Image generation style (omit for default `photo`) |
| `description` | Yes | Detailed scene description for AI image generator |
| `value` | Yes | What this image teaches that text alone cannot — the justification for its existence |

### `style_context` Rules

The `style_context` value is prepended to every image generation prompt. To prevent the AI image generator from injecting branding, logos, or organizational text into images:
- Keep `style_context` purely descriptive of the **subject matter** (e.g., "Outdoor cooking, campfire safety, and food preparation techniques")
- NEVER include organizational names: "Scouting America", "BSA", "Boy Scouts", "Merit Badge University"
- NEVER include age ranges: "ages 11-17", "youth", "Scouts BSA members"
- NEVER include project framing: "study guide", "educational resource", "merit badge guide"
- The generation script already handles educational framing — `style_context` should only describe the visual domain

## Image Generation Workflow

### Step 1: Create or Update images.json

Build the manifest with all images that pass the value test. Every entry needs `id`, `file`, `description`, and `value`.

### Step 2: Generate Images

Run generation immediately (do not ask the user or wait for approval):

```bash
bun run generate:drg-images {slug}
```

This command may take several minutes for large guides. Let it run to completion.

### Step 3: Convert to AVIF

Convert all generated PNGs to AVIF format (1200px wide, quality 80), then delete source PNGs:

```bash
bun run convert:drg-images -- --badge {slug}
rm hugo/content/merit-badges/{slug}/guide/images/*.png
```

### Step 4: Replace Placeholders with Shortcodes

Convert all `<!-- IMAGE: -->` placeholders to shortcodes:

```markdown
{{</* drg/image src="images/{id}.avif" alt="..." */>}}
```

Match each placeholder's filename-id to the corresponding entry in `images.json`. Every placeholder must be converted — zero should remain.

## Image Verification

After generation and placeholder conversion, verify:

1. **No orphan placeholders:** grep for `<!-- IMAGE:` — expect zero matches.
2. **No duplicate sources:** grep all `drg/image` shortcodes and confirm every `src` value is unique across the entire guide. If any `src` appears more than once, create a new unique image for each duplicate.
3. **Count parity:** the number of `drg/image` shortcodes across all `.md` files must equal the number of entries in `images.json`. If they differ, reconcile before proceeding.
4. **Build passes:** `bun run build` completes without errors.

## Image Audit Workflow

When auditing an existing guide's images:

1. Read `images.json` and all `.md` files with `drg/image` shortcodes.
2. For each image, apply the Image Value Test: "Does this image teach something that text alone cannot?"
3. Images that fail get **cut**: remove from `images.json`, remove shortcode from `.md` file, delete `.avif` file.
4. Images that pass get a `value` field (if missing) explaining what they teach.
5. Verify build passes after changes.
6. Commit changes.

## Quality Checklist (Images)

### Per-Page

- [ ] Every image passes the Image Value Test (teaches something text alone cannot)
- [ ] Images are placed inline with the content they illustrate (not clustered at bottom)
- [ ] Image shortcodes have descriptive alt-text
- [ ] Each `drg/image` shortcode references a unique `src` (no duplicate image files on a page or across the guide)

### Full Guide

- [ ] Total `drg/image` shortcodes equals total `images.json` entries (1:1 parity, no duplicate src values)
- [ ] No images clustered at page bottoms — every image appears inline with related content
- [ ] Zero generic/decorative images — every image passes the Image Value Test
- [ ] Every `images.json` entry has a `value` field
- [ ] No orphan image placeholders — grep for `<!-- IMAGE:` (zero matches = all converted)
