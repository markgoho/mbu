/**
 * Verify all YouTube video links in DRG guide files.
 *
 * Uses the noembed API to check whether each YouTube video ID
 * actually resolves to a real video.
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

interface VerificationResult extends VideoEntry {
  valid: boolean;
  noembedTitle?: string;
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
// Noembed verification
// ---------------------------------------------------------------------------

/** Deterministic check: is the given YouTube video ID valid? */
async function isYoutubeVideoValid(
  videoId: string,
): Promise<{ valid: boolean; title?: string }> {
  const noembedUrl = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`;

  const res = await fetch(noembedUrl);
  if (!res.ok) {
    return { valid: false };
  }

  const data = (await res.json()) as Record<string, unknown>;

  if (data.error) {
    return { valid: false };
  }

  return { valid: true, title: data.title as string | undefined };
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
    { valid: boolean; title?: string }
  >();

  let verified = 0;
  for (const videoId of uniqueIds) {
    const result = await isYoutubeVideoValid(videoId);
    verificationCache.set(videoId, result);
    verified++;

    // Progress indicator
    if (verified % 10 === 0) {
      process.stdout.write(
        `  Verified ${verified}/${uniqueIds.length} unique IDs...\r`,
      );
    }

    // Small delay to avoid hammering noembed
    await Bun.sleep(200);
  }
  console.log(`  Verified ${verified}/${uniqueIds.length} unique IDs.   \n`);

  // Build results
  const results: VerificationResult[] = entries.map((entry) => {
    const cached = verificationCache.get(entry.videoId)!;
    return {
      ...entry,
      valid: cached.valid,
      noembedTitle: cached.title,
    };
  });

  // Report
  const broken = results.filter((r) => !r.valid);
  const working = results.filter((r) => r.valid);

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

  if (working.length > 0) {
    console.log(`\n✅ WORKING (${working.length} references):\n`);
    for (const r of working) {
      const relPath = r.file.replace(process.cwd() + "/", "");
      const titleMatch =
        r.noembedTitle === r.shortcodeTitle ? "✓" : `≠ "${r.noembedTitle}"`;
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
  console.log(`  Broken:           ${broken.length}`);

  // Group broken by badge
  if (broken.length > 0) {
    const byBadge = new Map<string, VerificationResult[]>();
    for (const r of broken) {
      const badgeMatch = r.file.match(/merit-badges\/([^/]+)\//);
      const badge = badgeMatch?.[1] ?? "unknown";
      if (!byBadge.has(badge)) byBadge.set(badge, []);
      byBadge.get(badge)!.push(r);
    }
    console.log("\n  Broken by badge:");
    for (const [badge, items] of byBadge) {
      console.log(`    ${badge}: ${items.length}`);
    }
  }

  console.log();

  // Exit with error code if broken links found
  if (broken.length > 0) {
    process.exit(1);
  }
}

main();
