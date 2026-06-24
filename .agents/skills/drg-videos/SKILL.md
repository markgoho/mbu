---
name: drg-videos
description: Discover, verify, and place YouTube videos in Digital Resource Guide (DRG) merit badge guides. Use this when adding videos to guides, auditing existing video coverage, or searching for educational YouTube content for a badge.
argument-hint: <badge-slug>
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - WebFetch
  - WebSearch
  - AskUserQuestion
  - Task
  - EnterPlanMode
---

# DRG Videos — YouTube Video Discovery & Placement Skill

Discover, verify, and place YouTube videos in Scouting America Digital Resource Guide (DRG) merit badge guides. This skill automates the search pipeline and provides a structured workflow for Claude to review, judge relevance, and place video shortcodes.

## Input

The badge slug is passed as `$ARGUMENTS`. Use it to locate:

- **Badge data:** `hugo/data/merit-badges/$ARGUMENTS.json`
- **Guide directory:** `hugo/content/merit-badges/$ARGUMENTS/guide/`
- **Guide files:** All `req*.md` files in the guide directory
- **Video manifest:** `hugo/content/merit-badges/$ARGUMENTS/guide/videos.json` (created by search script)

## Workflow — 6 Phases

Execute each phase in order. Do not skip phases.

---

### Phase 1: Audit

**Goal:** Understand current video coverage for this badge.

1. Read `hugo/data/merit-badges/$ARGUMENTS.json` to understand the badge requirements.
2. List all `req*.md` files in the guide directory.
3. For each guide file, check for existing `drg/video` and `drg/external-link` shortcodes with YouTube URLs.
4. Report:
   - Total requirement pages
   - Pages WITH videos (list them)
   - Pages WITHOUT videos (list them)

**Output:** A summary table showing video coverage. Example:

```
Video Coverage for Archery:
  req1a.md — no video
  req1b.md — 1 video (USA Archery range safety)
  req1c.md — no video
  ...
  Coverage: 3/12 pages (25%)
```

---

### Phase 2: Search

**Goal:** Run the automated YouTube search script to find candidate videos.

1. Run the search script:
   ```bash
   bun run search:youtube-videos -- --badge $ARGUMENTS
   ```
2. Wait for it to complete and review the output.
3. Read the generated `videos.json` manifest from the guide directory.

If the search fails or returns no results, try running with `--max-results 10` for more candidates.

**Dry run first (optional):** To preview what queries will be executed:
```bash
bun run search:youtube-videos -- --badge $ARGUMENTS --dry-run
```

---

### Phase 3: Review (AI Judgment)

**Goal:** Evaluate each candidate video for relevance and quality.

For each video in `videos.json`:

1. **Read the target `req*.md` page** — understand what the page teaches.
2. **Evaluate relevance:** Does this video actually teach what the requirement asks? A video about "archery basics" may not help a page specifically about "range safety rules."
3. **Evaluate source quality:**
   - Is the channel reputable? Trust score > 10 is strong; 5-10 is acceptable; < 5 needs careful review.
   - Is the video length appropriate? Prefer < 15 minutes. Very short (< 1 min) may be too superficial.
   - Does the video title match the educational goal?
4. **Check for redundancy:** Does the page already cover this topic with another video?
5. **Safety topics:** For first aid, CPR, water safety, shooting sports safety — ONLY accept videos from authoritative sources (Red Cross, AHA, USA Archery, NRA, CDC, etc.).

**For accepted videos:**
- Write a brief `relevance` explanation (1-2 sentences explaining why this video is useful for this requirement page).

**For rejected videos:**
- Remove them from the manifest with a brief reason logged to the user.

**Preferences:**
- Prefer "how to" and demonstration videos over lectures, vlogs, or entertainment
- Prefer shorter, focused videos over long multi-topic ones
- Prefer videos from verified/trusted channels
- One video per page is usually sufficient; two is acceptable if they cover different aspects

After review, update `videos.json` with only the accepted candidates (with `relevance` filled in).

---

### Phase 4: Verify

**Goal:** Confirm all accepted videos are still working.

For each accepted video in the updated `videos.json`, verify via oEmbed:

```bash
curl -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=VIDEO_ID&format=json"
```

- **200 OK** → video is embeddable, use `drg/video`
- **401** → video exists but embedding disabled, use `drg/external-link`
- **404 or error** → remove from manifest

Use WebFetch or Bash curl for verification. Update the `status` field in `videos.json` accordingly.

---

### Phase 5: Place

**Goal:** Add video shortcodes to the guide pages.

For each accepted video in `videos.json`:

1. Read the target `req*.md` file.
2. Find the best placement location:
   - Place the video **inline with related content**, not clustered at the top or bottom.
   - Place after the paragraph or section that discusses the same topic as the video.
   - If no clear contextual location, place after the introductory section.
3. Add the appropriate shortcode:

**For embeddable videos (`status: "working"`):**
```
{{< drg/video
    title="Video Title — Channel Name"
    url="https://www.youtube.com/watch?v=VIDEO_ID" >}}
```

**For embed-disabled videos (`status: "embed_disabled"`):**
```
{{< drg/external-link
    title="Video Title — Channel Name"
    url="https://www.youtube.com/watch?v=VIDEO_ID" >}}
```

**Placement rules:**
- Keep `drg/next-page` as the LAST element on every page (before it, not after).
- Don't place videos inside shortcode blocks (e.g., inside `drg/safety-first` or `drg/be-prepared`).
- Add a blank line before and after the shortcode.
- The title format is `"Video Title — Channel Name"` (em dash, not hyphen).

---

### Phase 6: Validate

**Goal:** Confirm everything works.

1. Run the YouTube link verifier for this badge:
   ```bash
   BADGE_SLUGS="$ARGUMENTS" bun run verify:youtube-links
   ```
   Expected: zero broken links.

2. Run the Hugo build to check for template errors:
   ```bash
   bun run build
   ```
   Expected: zero errors.

3. Report final results:
   - How many videos were added
   - Which pages now have videos
   - Updated coverage percentage

---

## Video Verification Protocol

**CRITICAL:** AI models hallucinate plausible-looking YouTube video IDs. Every video in this pipeline comes from `youtube-sr` search results (real YouTube data), but oEmbed verification is still required because:
- Videos can be deleted between search and placement
- Videos can have embedding disabled
- Search results may include age-restricted or region-locked content

Never manually type a YouTube video ID. All IDs must come from:
1. The `youtube-sr` search results (via the search script), OR
2. Web pages that embed the video (found via WebSearch/WebFetch)

## Manual Video Addition

If the automated search doesn't find good candidates for a page, you can:

1. Use WebSearch to find relevant videos: `"{badge title}" {topic} site:youtube.com`
2. Extract the video ID from the URL
3. Verify via oEmbed (WebFetch or curl)
4. Add directly to the guide page using the shortcode format above

Always verify before placing. A page without a video is better than a page with a broken embed.
