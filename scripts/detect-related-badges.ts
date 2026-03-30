/**
 * Related Badges Auto-Detection Script
 *
 * Analyzes merit badge requirement text to detect references to other badges,
 * then enriches the requirement text with markdown links to related badges.
 *
 * Usage:
 *   bun run detect:links           # Process all badges
 *   BADGE_SLUGS="camping,hiking" bun run detect:links  # Process specific badges
 *
 * @see specs/feature-2-related-badges-spec.md
 */

import { join } from "node:path";
import { MERIT_BADGES, type MeritBadge } from "./merit-badges";

// Types
interface Requirement {
  req_id: string;
  path: string;
  text: string;
  subrequirements?: Requirement[];
  subrequirement_mode?: {
    type: "all" | "select";
    count?: number;
  };
  resources?: Array<{ title: string; url: string }>;
  is_option?: boolean;
}

interface BadgeData {
  title: string;
  slug: string;
  url: string;
  eagle_required: boolean;
  pamphlet_url?: string;
  requirements: Requirement[];
}

interface BadgePattern {
  badge: MeritBadge;
  pattern: RegExp;
}

interface DetectedRelationship {
  sourceBadge: string;
  sourceSlug: string;
  targetBadge: string;
  targetSlug: string;
  location: string;
  text: string;
  link: string;
}

interface Stats {
  totalBadgesProcessed: number;
  totalLinksDetected: number;
  badgesWithOutgoingLinks: Set<string>;
  badgesWithIncomingLinks: Set<string>;
  relationships: DetectedRelationship[];
}

// Constants
const DATA_DIR = join(import.meta.dir, "../hugo/data/merit-badges");
const REPORTS_DIR = join(import.meta.dir, "../reports");

// Build regex pattern for a badge
function buildBadgePattern(badge: MeritBadge): RegExp {
  // Escape special regex characters in title
  const escapedTitle = badge.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Match "{Title} merit badge" (case insensitive) with exclusions
  // Negative lookahead for contexts where we shouldn't link
  const pattern = new RegExp(
    `(?<!\\[)` + // Negative lookbehind: not already inside a markdown link
      `(${escapedTitle} [Mm]erit [Bb]adge)` + // Capture the match
      `(?! pamphlet| kit| counselor)`, // Negative lookahead for exclusions
    "gi",
  );

  return pattern;
}

// Build patterns for all badges except the current one
function buildPatternsForBadge(
  currentBadgeSlug: string,
): Map<string, BadgePattern> {
  const patterns = new Map<string, BadgePattern>();

  for (const badge of MERIT_BADGES) {
    // Skip self-references
    if (badge.slug === currentBadgeSlug) continue;

    patterns.set(badge.slug, {
      badge,
      pattern: buildBadgePattern(badge),
    });
  }

  return patterns;
}

// Check if text is already inside a markdown link
function isInsideMarkdownLink(text: string, matchIndex: number): boolean {
  // Find all markdown links in the text
  const linkPattern = /\[([^\]]+)\]\([^)]+\)/g;
  let match;

  while ((match = linkPattern.exec(text)) !== null) {
    const linkStart = match.index;
    const linkEnd = linkStart + match[0].length;

    // Check if our match index falls within this link
    if (matchIndex >= linkStart && matchIndex < linkEnd) {
      return true;
    }
  }

  return false;
}

// Inject links into text
function injectLinks(
  text: string,
  patterns: Map<string, BadgePattern>,
  currentBadgeSlug: string,
  currentPath: string,
  stats: Stats,
  sourceBadge: string,
): string {
  let modifiedText = text;
  const processedMatches: Array<{
    start: number;
    end: number;
    replacement: string;
    badge: MeritBadge;
  }> = [];

  // Find all matches first (to handle overlapping matches)
  for (const [slug, { badge, pattern }] of patterns) {
    // Reset regex state
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const matchIndex = match.index;
      const matchText = match[1]; // The captured group
      if (matchText === undefined) continue;

      // Skip if already inside a markdown link
      if (isInsideMarkdownLink(text, matchIndex)) {
        continue;
      }

      processedMatches.push({
        start: matchIndex,
        end: matchIndex + matchText.length,
        replacement: `[${matchText}](/merit-badges/${slug}/)`,
        badge,
      });
    }
  }

  // Sort matches by position (descending) to replace from end to start
  // This prevents position shifts from affecting subsequent replacements
  processedMatches.sort((a, b) => b.start - a.start);

  // Apply replacements
  for (const { start, end, replacement, badge } of processedMatches) {
    const originalMatch = modifiedText.substring(start, end);

    // Double-check this exact position hasn't been modified
    if (modifiedText.substring(start, end) === originalMatch) {
      modifiedText =
        modifiedText.substring(0, start) +
        replacement +
        modifiedText.substring(end);

      // Track statistics
      stats.totalLinksDetected++;
      stats.badgesWithOutgoingLinks.add(currentBadgeSlug);
      stats.badgesWithIncomingLinks.add(badge.slug);
      stats.relationships.push({
        sourceBadge,
        sourceSlug: currentBadgeSlug,
        targetBadge: badge.title,
        targetSlug: badge.slug,
        location: `Requirement ${currentPath}`,
        text: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
        link: `/merit-badges/${badge.slug}/`,
      });
    }
  }

  return modifiedText;
}

// Recursively process requirements
function processRequirement(
  req: Requirement,
  patterns: Map<string, BadgePattern>,
  currentBadgeSlug: string,
  stats: Stats,
  sourceBadge: string,
): boolean {
  let modified = false;

  // Process current requirement text
  if (req.text) {
    const newText = injectLinks(
      req.text,
      patterns,
      currentBadgeSlug,
      req.path,
      stats,
      sourceBadge,
    );
    if (newText !== req.text) {
      req.text = newText;
      modified = true;
    }
  }

  // Recursively process subrequirements
  if (req.subrequirements) {
    for (const subreq of req.subrequirements) {
      if (
        processRequirement(
          subreq,
          patterns,
          currentBadgeSlug,
          stats,
          sourceBadge,
        )
      ) {
        modified = true;
      }
    }
  }

  return modified;
}

// Process a single badge
async function processBadge(badge: MeritBadge, stats: Stats): Promise<boolean> {
  const dataPath = join(DATA_DIR, `${badge.slug}.json`);

  // Check if data file exists
  const dataFile = Bun.file(dataPath);
  if (!(await dataFile.exists())) {
    console.warn(
      `Warning: data file not found for ${badge.title} (${badge.slug})`,
    );
    return false;
  }

  try {
    // Read badge data
    const dataContent = await dataFile.text();
    const data: BadgeData = JSON.parse(dataContent);

    // Build patterns (excluding self)
    const patterns = buildPatternsForBadge(badge.slug);

    // Process all requirements
    let modified = false;
    for (const req of data.requirements) {
      if (processRequirement(req, patterns, badge.slug, stats, badge.title)) {
        modified = true;
      }
    }

    // Write back if modified
    if (modified) {
      await Bun.write(dataPath, JSON.stringify(data, null, 2) + "\n");
      console.log(`Updated: ${badge.title}`);
    }

    stats.totalBadgesProcessed++;
    return modified;
  } catch (error) {
    console.error(`Error processing ${badge.title}:`, error);
    return false;
  }
}

// Generate markdown report
function generateReport(stats: Stats): string {
  const timestamp = new Date().toISOString();

  let report = `# Badge Relationship Detection Report

Generated: ${timestamp}

## Summary
- Total badges processed: ${stats.totalBadgesProcessed}
- Total links detected: ${stats.totalLinksDetected}
- Badges with outgoing links: ${stats.badgesWithOutgoingLinks.size}
- Badges with incoming links: ${stats.badgesWithIncomingLinks.size}

## Detected Relationships

`;

  // Group relationships by source badge
  const groupedRelationships = new Map<string, DetectedRelationship[]>();
  for (const rel of stats.relationships) {
    const key = rel.sourceBadge;
    if (!groupedRelationships.has(key)) {
      groupedRelationships.set(key, []);
    }
    groupedRelationships.get(key)!.push(rel);
  }

  // Sort by source badge name
  const sortedKeys = Array.from(groupedRelationships.keys()).sort();

  for (const sourceBadge of sortedKeys) {
    const relationships = groupedRelationships.get(sourceBadge)!;
    report += `### ${sourceBadge}\n\n`;

    for (const rel of relationships) {
      report += `- **${rel.location}** -> [${rel.targetBadge}](${rel.link})\n`;
      report += `  - Text: "${rel.text}"\n\n`;
    }
  }

  if (stats.relationships.length === 0) {
    report += "_No badge relationships detected._\n";
  }

  return report;
}

// Main function
async function main() {
  console.log("Related Badges Auto-Detection Script");
  console.log("====================================\n");

  // Initialize stats
  const stats: Stats = {
    totalBadgesProcessed: 0,
    totalLinksDetected: 0,
    badgesWithOutgoingLinks: new Set(),
    badgesWithIncomingLinks: new Set(),
    relationships: [],
  };

  // Determine which badges to process
  let badgesToProcess: MeritBadge[];

  const badgeSlugsEnv = process.env.BADGE_SLUGS;
  if (badgeSlugsEnv) {
    const slugs = badgeSlugsEnv.split(",").map(s => s.trim());
    badgesToProcess = MERIT_BADGES.filter(b => slugs.includes(b.slug));
    console.log(`Processing ${badgesToProcess.length} specified badges...\n`);
  } else {
    badgesToProcess = MERIT_BADGES;
    console.log(`Processing all ${MERIT_BADGES.length} badges...\n`);
  }

  // Process each badge
  let modifiedCount = 0;
  for (const badge of badgesToProcess) {
    if (await processBadge(badge, stats)) {
      modifiedCount++;
    }
  }

  // Generate report
  const report = generateReport(stats);
  const reportPath = join(REPORTS_DIR, "badge-relationships.md");
  await Bun.write(reportPath, report);

  // Print summary
  console.log("\n====================================");
  console.log("Summary:");
  console.log(`  Badges processed: ${stats.totalBadgesProcessed}`);
  console.log(`  Badges modified: ${modifiedCount}`);
  console.log(`  Total links detected: ${stats.totalLinksDetected}`);
  console.log(
    `  Badges with outgoing links: ${stats.badgesWithOutgoingLinks.size}`,
  );
  console.log(
    `  Badges with incoming links: ${stats.badgesWithIncomingLinks.size}`,
  );
  console.log(`\nReport written to: ${reportPath}`);
}

// Run
main().catch(console.error);
