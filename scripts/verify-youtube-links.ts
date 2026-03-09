/**
 * Verify all YouTube video links in DRG guide files.
 *
 * Uses YouTube's official oEmbed API to check whether each YouTube video ID
 * actually resolves to a real, embeddable video.
 *
 * Detects three states:
 *   - ✅ Working: video exists and is embeddable
 *   - ⚠️ Embed disabled: video exists but embedding is disabled (shows
 *     "Video unavailable" when embedded, but watchable on YouTube directly)
 *   - ❌ Broken: video does not exist, is private, or has been removed
 *
 * Usage:
 *   bun scripts/verify-youtube-links.ts
 *   BADGE_SLUGS="first-aid,camping" bun scripts/verify-youtube-links.ts
 */

import { Glob } from "bun";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VideoEntry {
  file: string;
  line: number;
  videoId: string;
  url: string;
  shortcodeTitle: string;
}

type VideoStatus = "working" | "embed_disabled" | "broken";

interface VerificationResult extends VideoEntry {
  status: VideoStatus;
  oembedTitle?: string;
}

// ---------------------------------------------------------------------------
// YouTube ID extraction
// ---------------------------------------------------------------------------

/** Extract a YouTube video ID from a URL, or return null. */
function extractVideoId(url: string): string | null {
  // youtube.com/watch?v=ID
  const vMatch = url.match(/[?&]v=([^&\s"]+)/);
  if (vMatch?.[1] !== undefined) return vMatch[1];

  // youtu.be/ID
  const shortMatch = url.match(/youtu\.be\/([^?\s"]+)/);
  if (shortMatch?.[1] !== undefined) return shortMatch[1];

  // youtube.com/shorts/ID
  const shortsMatch = url.match(/youtube\.com\/shorts\/([^?\s"]+)/);
  if (shortsMatch?.[1] !== undefined) return shortsMatch[1];

  // youtube.com/embed/ID
  const embedMatch = url.match(/youtube\.com\/embed\/([^?\s"]+)/);
  if (embedMatch?.[1] !== undefined) return embedMatch[1];

  return null;
}

// ---------------------------------------------------------------------------
// YouTube oEmbed verification
// ---------------------------------------------------------------------------

/**
 * Check a YouTube video ID using YouTube's official oEmbed endpoint.
 *
 * Returns:
 *   - "working"        → 200 OK with embed HTML (video is embeddable)
 *   - "embed_disabled" → 401 Unauthorized (video exists but embedding disabled)
 *   - "broken"         → 404 Not Found or other error (video doesn't exist)
 */
async function checkYoutubeVideo(
  videoId: string,
): Promise<{ status: VideoStatus; title?: string }> {
  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

  try {
    const res = await fetch(oembedUrl);

    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>;
      return {
        status: "working",
        title: data.title as string | undefined,
      };
    }

    if (res.status === 401) {
      return { status: "embed_disabled" };
    }

    // 404 or any other error → broken
    return { status: "broken" };
  } catch {
    return { status: "broken" };
  }
}

// ---------------------------------------------------------------------------
// File scanning
// ---------------------------------------------------------------------------

/** Scan markdown files for YouTube URLs inside drg/video and drg/external-link shortcodes. */
async function scanFiles(globPattern: string): Promise<VideoEntry[]> {
  const entries: VideoEntry[] = [];

  // Regex to match YouTube URLs inside shortcodes (drg/video or drg/external-link)
  // We look for url="..." parameters containing youtube.com or youtu.be
  const urlRegex =
    /url="(https?:\/\/(?:www\.)?(?:youtube\.com\/watch[^"]*|youtu\.be\/[^"]*|youtube\.com\/shorts\/[^"]*|youtube\.com\/embed\/[^"]*))"?/g;

  // Regex to capture the title from a shortcode (title="...")
  const titleRegex = /title="([^"]+)"/;

  const glob = new Glob(globPattern);
  for await (const path of glob.scan({ cwd: ".", absolute: true })) {
    const content = await Bun.file(path).text();
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      let match: RegExpExecArray | null;

      // Reset lastIndex for the global regex
      urlRegex.lastIndex = 0;
      while ((match = urlRegex.exec(line)) !== null) {
        const url = match[1]!;
        const videoId = extractVideoId(url);
        if (!videoId) continue;

        // Look for the title in surrounding lines (shortcodes can span 2-4 lines)
        const context = lines
          .slice(Math.max(0, i - 3), Math.min(lines.length, i + 3))
          .join("\n");
        const titleMatch = context.match(titleRegex);

        entries.push({
          file: path,
          line: i + 1,
          videoId,
          url,
          shortcodeTitle: titleMatch?.[1] ?? "(no title found)",
        });
      }
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const badgeSlugs = process.env.BADGE_SLUGS?.split(",").map((s) => s.trim());

  let globPattern: string;
  if (badgeSlugs && badgeSlugs.length > 0) {
    // If multiple slugs, we scan each individually
    globPattern = `hugo/content/merit-badges/{${badgeSlugs.join(",")}}/guide/**/*.md`;
  } else {
    globPattern = "hugo/content/merit-badges/*/guide/**/*.md";
  }

  console.log(`Scanning: ${globPattern}\n`);

  const entries = await scanFiles(globPattern);

  // Deduplicate by videoId (same video may appear in multiple files)
  const uniqueIds = [...new Set(entries.map((e) => e.videoId))];

  console.log(
    `Found ${entries.length} YouTube references (${uniqueIds.length} unique video IDs)\n`,
  );

  // Verify each unique ID
  const verificationCache = new Map<
    string,
    { status: VideoStatus; title?: string }
  >();

  let verified = 0;
  for (const videoId of uniqueIds) {
    const result = await checkYoutubeVideo(videoId);
    verificationCache.set(videoId, result);
    verified++;

    // Progress indicator
    if (verified % 10 === 0) {
      process.stdout.write(
        `  Verified ${verified}/${uniqueIds.length} unique IDs...\r`,
      );
    }

    // Small delay to avoid hammering YouTube's oEmbed endpoint
    await Bun.sleep(200);
  }
  console.log(`  Verified ${verified}/${uniqueIds.length} unique IDs.   \n`);

  // Build results
  const results: VerificationResult[] = entries.map((entry) => {
    const cached = verificationCache.get(entry.videoId)!;
    return {
      ...entry,
      status: cached.status,
      oembedTitle: cached.title,
    };
  });

  // Report
  const broken = results.filter((r) => r.status === "broken");
  const embedDisabled = results.filter((r) => r.status === "embed_disabled");
  const working = results.filter((r) => r.status === "working");

  console.log("=".repeat(80));
  console.log("RESULTS");
  console.log("=".repeat(80));

  if (broken.length > 0) {
    console.log(`\n❌ BROKEN (${broken.length} references):\n`);
    for (const r of broken) {
      const relPath = r.file.replace(process.cwd() + "/", "");
      console.log(`  ${relPath}:${r.line}`);
      console.log(`    Video ID: ${r.videoId}`);
      console.log(`    Title:    ${r.shortcodeTitle}`);
      console.log(`    URL:      ${r.url}`);
      console.log();
    }
  }

  if (embedDisabled.length > 0) {
    console.log(
      `\n⚠️  EMBED DISABLED (${embedDisabled.length} references):\n`,
    );
    console.log(
      `    These videos exist and are watchable on YouTube, but embedding`,
    );
    console.log(
      `    is disabled by the uploader. They show "Video unavailable" when`,
    );
    console.log(
      `    embedded. Consider switching from {{< drg/video >}} to`,
    );
    console.log(`    {{< drg/external-link >}} for these.\n`);
    for (const r of embedDisabled) {
      const relPath = r.file.replace(process.cwd() + "/", "");
      console.log(`  ${relPath}:${r.line}`);
      console.log(`    Video ID: ${r.videoId}`);
      console.log(`    Title:    ${r.shortcodeTitle}`);
      console.log(`    URL:      ${r.url}`);
      console.log();
    }
  }

  if (working.length > 0) {
    console.log(`\n✅ WORKING (${working.length} references):\n`);
    for (const r of working) {
      const relPath = r.file.replace(process.cwd() + "/", "");
      const titleMatch =
        r.oembedTitle === r.shortcodeTitle ? "✓" : `≠ "${r.oembedTitle}"`;
      console.log(`  ${relPath}:${r.line}`);
      console.log(`    Video ID: ${r.videoId}  |  Title: ${titleMatch}`);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));
  console.log(`  Total references: ${results.length}`);
  console.log(`  Unique video IDs: ${uniqueIds.length}`);
  console.log(`  Working:          ${working.length}`);
  console.log(`  Embed disabled:   ${embedDisabled.length}`);
  console.log(`  Broken:           ${broken.length}`);

  // Group broken + embed-disabled by badge
  const problematic = [...broken, ...embedDisabled];
  if (problematic.length > 0) {
    const byBadge = new Map<string, { broken: number; embedDisabled: number }>();
    for (const r of problematic) {
      const badgeMatch = r.file.match(/merit-badges\/([^/]+)\//);
      const badge = badgeMatch?.[1] ?? "unknown";
      if (!byBadge.has(badge)) byBadge.set(badge, { broken: 0, embedDisabled: 0 });
      const counts = byBadge.get(badge)!;
      if (r.status === "broken") counts.broken++;
      else counts.embedDisabled++;
    }
    console.log("\n  Issues by badge:");
    for (const [badge, counts] of byBadge) {
      const parts: string[] = [];
      if (counts.broken > 0) parts.push(`${counts.broken} broken`);
      if (counts.embedDisabled > 0)
        parts.push(`${counts.embedDisabled} embed disabled`);
      console.log(`    ${badge}: ${parts.join(", ")}`);
    }
  }

  console.log();

  // Exit with error code if broken links found (embed-disabled is a warning, not a failure)
  if (broken.length > 0) {
    process.exit(1);
  }
}

main();
