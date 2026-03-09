/**
 * Search YouTube for candidate videos related to a merit badge's DRG guide pages.
 *
 * Uses `youtube-sr` (no API key needed) to search for relevant videos,
 * verifies each via oEmbed, scores by trust level, and writes a
 * `videos.json` manifest for Claude to review and place.
 *
 * Usage:
 *   bun scripts/search-youtube-videos.ts --badge archery
 *   bun scripts/search-youtube-videos.ts --badge archery --dry-run
 *   bun scripts/search-youtube-videos.ts --badge archery --max-results 10
 */

import * as fs from "node:fs";
import * as path from "node:path";
import YouTube from "youtube-sr";
import { buildVideoSearchQueries } from "./lib/build-video-search-queries.ts";
import { findTrustedChannel } from "./lib/trusted-channels.ts";
import { verifyYoutubeVideo } from "./lib/verify-youtube-video.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VideoCandidate {
  id: string;
  file: string;
  requirement_path: string;
  video_id: string;
  title: string;
  channel: string;
  duration_seconds: number;
  views: number;
  url: string;
  status: "working" | "embed_disabled";
  relevance: string;
  query: string;
  trust_score: number;
}

interface VideosManifest {
  badge: string;
  searched_at: string;
  videos: VideoCandidate[];
}

interface RequirementData {
  req_id: string;
  path: string;
  text: string;
  subrequirements?: RequirementData[];
}

interface BadgeData {
  title: string;
  slug: string;
  requirements: RequirementData[];
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArguments(): {
  badge: string;
  dryRun: boolean;
  maxResults: number;
} {
  const arguments_ = process.argv.slice(2);
  let badge = "";
  let dryRun = false;
  let maxResults = 5;

  for (let index = 0; index < arguments_.length; index++) {
    const argument = arguments_[index];
    if (argument === "--badge" && index + 1 < arguments_.length) {
      badge = arguments_[index + 1]!;
      index++;
    } else if (argument === "--dry-run") {
      dryRun = true;
    } else if (
      argument === "--max-results" &&
      index + 1 < arguments_.length
    ) {
      maxResults = Number.parseInt(arguments_[index + 1]!, 10);
      index++;
    }
  }

  if (badge === "") {
    console.error("Usage: bun scripts/search-youtube-videos.ts --badge <slug>");
    console.error("       --dry-run         Print queries without searching");
    console.error(
      "       --max-results <N> Results per query (default 5)",
    );
    process.exit(1);
  }

  return { badge, dryRun, maxResults };
}

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

/** Read badge data from hugo/data/merit-badges/{slug}.json */
function readBadgeData({ badge }: { badge: string }): BadgeData {
  const dataPath = path.join("hugo", "data", "merit-badges", `${badge}.json`);
  if (!fs.existsSync(dataPath)) {
    console.error(`Badge data not found: ${dataPath}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(dataPath, "utf-8")) as BadgeData;
}

/** Get all req*.md files in the guide directory */
function getGuideFiles({
  badge,
}: {
  badge: string;
}): Array<{ filename: string; filepath: string }> {
  const guideDirectory = path.join(
    "hugo",
    "content",
    "merit-badges",
    badge,
    "guide",
  );
  if (!fs.existsSync(guideDirectory)) {
    console.error(`Guide directory not found: ${guideDirectory}`);
    console.error("This badge may not have a DRG guide yet.");
    process.exit(1);
  }

  return fs
    .readdirSync(guideDirectory)
    .filter((file) => file.startsWith("req") && file.endsWith(".md"))
    .map((filename) => ({
      filename,
      filepath: path.join(guideDirectory, filename),
    }));
}

/** Check if a guide file already has a drg/video shortcode */
function hasExistingVideo({ filepath }: { filepath: string }): boolean {
  const content = fs.readFileSync(filepath, "utf-8");
  return content.includes("drg/video");
}

/** Extract H2/H3 headings from a markdown file */
function extractHeadings({
  filepath,
}: {
  filepath: string;
}): string[] {
  const content = fs.readFileSync(filepath, "utf-8");
  const headingRegex = /^#{2,3}\s+(.+)$/gm;
  const headings: string[] = [];
  let match: RegExpExecArray | null = headingRegex.exec(content);

  while (match !== null) {
    const heading = match[1];
    if (heading !== undefined) {
      headings.push(heading.trim());
    }
    match = headingRegex.exec(content);
  }

  return headings;
}

/** Map a filename like "req1b.md" to a requirement path like "1.b" */
function filenameToRequirementPath({
  filename,
}: {
  filename: string;
}): string {
  // Remove "req" prefix and ".md" suffix
  const body = filename.replace(/^req/, "").replace(/\.md$/, "");

  // Handle compound paths like "5-recurve-bow-or-longbow" → "5"
  // These are named option pages
  if (body.includes("-")) {
    const numberPart = body.match(/^(\d+)/);
    return numberPart?.[1] ?? body;
  }

  // Convert "1b" → "1.b", "2a1" → "2.a.1"
  const parts: string[] = [];
  for (const character of body) {
    if (parts.length === 0) {
      parts.push(character);
    } else {
      const lastPart = parts.at(-1)!;
      const lastCharIsDigit = /\d/.test(lastPart.at(-1)!);
      const currentCharIsDigit = /\d/.test(character);

      if (lastCharIsDigit === currentCharIsDigit) {
        parts[parts.length - 1] = lastPart + character;
      } else {
        parts.push(character);
      }
    }
  }

  return parts.join(".");
}

/** Flatten nested requirements to get text for a specific path */
function findRequirementText({
  requirements,
  targetPath,
}: {
  requirements: RequirementData[];
  targetPath: string;
}): string {
  for (const requirement of requirements) {
    if (requirement.path === targetPath) {
      return requirement.text;
    }
    if (requirement.subrequirements !== undefined) {
      const found = findRequirementText({
        requirements: requirement.subrequirements,
        targetPath,
      });
      if (found !== "") {
        return found;
      }
    }
  }
  return "";
}

/** Create a slug-safe ID from a video title */
function slugifyTitle({ title }: { title: string }): string {
  return title
    .toLowerCase()
    .replaceAll(/[^\s\w-]/g, "")
    .trim()
    .replaceAll(/\s+/g, "-")
    .slice(0, 50);
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/** Tutorial-style keywords that indicate educational content */
const TUTORIAL_KEYWORDS = [
  "tutorial",
  "how to",
  "guide",
  "basics",
  "beginner",
  "learn",
  "introduction",
  "explained",
  "demonstration",
  "training",
  "lesson",
  "step by step",
  "technique",
  "tips",
  "instructions",
];

function calculateTrustScore({
  channelName,
  views,
  title,
}: {
  channelName: string;
  views: number;
  title: string;
}): number {
  let score = 0;

  // Trusted channel match: +10
  const trustedMatch = findTrustedChannel({ channelName });
  if (trustedMatch !== undefined) {
    score += 10;
  }

  // High view count (>100K): +5
  if (views > 100_000) {
    score += 5;
  }

  // Tutorial-style title keywords: +3
  const lowerTitle = title.toLowerCase();
  const hasTutorialKeyword = TUTORIAL_KEYWORDS.some((keyword) =>
    lowerTitle.includes(keyword),
  );
  if (hasTutorialKeyword) {
    score += 3;
  }

  return score;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { badge, dryRun, maxResults } = parseArguments();

  console.log(`\nSearching YouTube videos for: ${badge}`);
  console.log("=".repeat(60));

  // Read badge data
  const badgeData = readBadgeData({ badge });
  console.log(`Badge: ${badgeData.title}`);

  // Get guide files
  const guideFiles = getGuideFiles({ badge });
  console.log(`Found ${guideFiles.length} requirement pages\n`);

  // Build search plan
  interface SearchPlan {
    filename: string;
    filepath: string;
    requirementPath: string;
    queries: Array<{ query: string; strategy: string }>;
    skipped: boolean;
    skipReason?: string;
  }

  const searchPlans: SearchPlan[] = [];

  for (const { filename, filepath } of guideFiles) {
    const requirementPath = filenameToRequirementPath({ filename });

    // Skip files that already have videos
    if (hasExistingVideo({ filepath })) {
      searchPlans.push({
        filename,
        filepath,
        requirementPath,
        queries: [],
        skipped: true,
        skipReason: "already has video",
      });
      continue;
    }

    // Get requirement text and page headings
    const requirementText = findRequirementText({
      requirements: badgeData.requirements,
      targetPath: requirementPath,
    });
    const pageHeadings = extractHeadings({ filepath });

    // Build queries
    const queries = buildVideoSearchQueries({
      badgeTitle: badgeData.title,
      requirementText:
        requirementText !== "" ? requirementText : badgeData.title,
      pageHeadings,
    });

    searchPlans.push({
      filename,
      filepath,
      requirementPath,
      queries,
      skipped: false,
    });
  }

  // Print search plan
  const skippedCount = searchPlans.filter((plan) => plan.skipped).length;
  const searchableCount = searchPlans.length - skippedCount;

  console.log(`Pages to search: ${searchableCount}`);
  console.log(`Pages skipped (already have videos): ${skippedCount}\n`);

  for (const plan of searchPlans) {
    if (plan.skipped) {
      console.log(`  SKIP ${plan.filename} (${plan.skipReason})`);
    } else {
      console.log(`  ${plan.filename} (req ${plan.requirementPath}):`);
      for (const query of plan.queries) {
        console.log(`    [${query.strategy}] "${query.query}"`);
      }
    }
  }

  if (dryRun) {
    console.log("\n--dry-run: Stopping before YouTube search.");
    return;
  }

  // Execute searches
  console.log("\nSearching YouTube...\n");

  const allCandidates: VideoCandidate[] = [];
  const seenVideoIds = new Set<string>();

  for (const plan of searchPlans) {
    if (plan.skipped) {
      continue;
    }

    for (const searchQuery of plan.queries) {
      try {
        process.stdout.write(
          `  Searching: "${searchQuery.query}"...`,
        );

        const results = await YouTube.search(searchQuery.query, {
          type: "video",
          limit: maxResults,
          safeSearch: true,
        });

        const newResults = results.filter(
          (video) =>
            video.id !== undefined && !seenVideoIds.has(video.id),
        );

        process.stdout.write(
          ` ${results.length} results (${newResults.length} new)\n`,
        );

        for (const video of newResults) {
          if (video.id === undefined) {
            continue;
          }

          seenVideoIds.add(video.id);

          const channelName = video.channel?.name ?? "Unknown";
          const videoTitle = video.title ?? "Untitled";

          allCandidates.push({
            id: slugifyTitle({ title: videoTitle }),
            file: plan.filename,
            requirement_path: plan.requirementPath,
            video_id: video.id,
            title: videoTitle,
            channel: channelName,
            duration_seconds: video.duration,
            views: video.views,
            url: `https://youtu.be/${video.id}`,
            status: "working", // Will be verified below
            relevance: "", // Claude fills this during review
            query: searchQuery.query,
            trust_score: calculateTrustScore({
              channelName,
              views: video.views,
              title: videoTitle,
            }),
          });
        }

        // Rate limit between searches (2s to avoid YouTube 429s)
        await Bun.sleep(2000);
      } catch (error) {
        console.error(
          `\n  Error searching "${searchQuery.query}": ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  console.log(`\nFound ${allCandidates.length} unique candidates.\n`);

  // Verify via oEmbed
  console.log("Verifying videos via oEmbed...\n");

  const verifiedCandidates: VideoCandidate[] = [];
  let verifiedCount = 0;

  for (const candidate of allCandidates) {
    const result = await verifyYoutubeVideo({ videoId: candidate.video_id });
    verifiedCount++;

    if (result.status === "broken") {
      process.stdout.write(
        `  [${verifiedCount}/${allCandidates.length}] BROKEN: ${candidate.title}\n`,
      );
    } else {
      const statusLabel =
        result.status === "working" ? "OK" : "EMBED_DISABLED";
      process.stdout.write(
        `  [${verifiedCount}/${allCandidates.length}] ${statusLabel}: ${candidate.title}\n`,
      );
      verifiedCandidates.push({
        ...candidate,
        status: result.status,
        ...(result.title !== undefined && { title: result.title }),
      });
    }

    // Rate limit between verifications
    await Bun.sleep(200);
  }

  console.log(
    `\n${verifiedCandidates.length} of ${allCandidates.length} candidates verified.\n`,
  );

  // Sort by trust score (highest first)
  verifiedCandidates.sort(
    (first, second) => second.trust_score - first.trust_score,
  );

  // Write manifest
  const manifest: VideosManifest = {
    badge,
    searched_at: new Date().toISOString(),
    videos: verifiedCandidates,
  };

  const guideDirectory = path.join(
    "hugo",
    "content",
    "merit-badges",
    badge,
    "guide",
  );
  const manifestPath = path.join(guideDirectory, "videos.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, undefined, 2) + "\n");

  console.log(`Wrote ${verifiedCandidates.length} candidates to ${manifestPath}\n`);

  // Summary report
  console.log("=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`  Badge:              ${badgeData.title}`);
  console.log(`  Pages searched:     ${searchableCount}`);
  console.log(`  Pages skipped:      ${skippedCount}`);
  console.log(`  Candidates found:   ${allCandidates.length}`);
  console.log(`  Verified (working): ${verifiedCandidates.filter((video) => video.status === "working").length}`);
  console.log(`  Embed disabled:     ${verifiedCandidates.filter((video) => video.status === "embed_disabled").length}`);
  console.log(`  Broken (excluded):  ${allCandidates.length - verifiedCandidates.length}`);

  // Show top candidates by trust score
  const topCandidates = verifiedCandidates.slice(0, 10);
  if (topCandidates.length > 0) {
    console.log("\n  Top candidates by trust score:");
    for (const candidate of topCandidates) {
      console.log(
        `    [${candidate.trust_score}] ${candidate.title} — ${candidate.channel} (${candidate.file})`,
      );
    }
  }

  console.log();
}

await main();
