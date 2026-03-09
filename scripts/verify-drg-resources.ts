/**
 * Verify that all resources from data.json appear in the corresponding DRG
 * guide pages.
 *
 * Walks the `resources` arrays in each badge's data.json, determines which
 * guide page should contain each resource, and checks that the resource URL
 * actually appears in that file (inside a drg/video or drg/external-link
 * shortcode).
 *
 * Usage:
 *   bun scripts/verify-drg-resources.ts
 *   BADGE_SLUGS="fingerprinting,first-aid" bun scripts/verify-drg-resources.ts
 */

import { Glob } from "bun";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Resource {
  title: string;
  url: string;
}

interface Requirement {
  req_id: string;
  path: string;
  text: string;
  is_option?: boolean;
  resources?: Resource[];
  subrequirements?: Requirement[];
  subrequirement_mode?: { type: string; count?: number };
}

interface BadgeData {
  title: string;
  slug: string;
  requirements: Requirement[];
}

interface MissingResource {
  badge: string;
  reqPath: string;
  reqText: string;
  resource: Resource;
  expectedFile: string;
  checkedFiles: string[];
}

interface FoundResource {
  badge: string;
  reqPath: string;
  resource: Resource;
  foundInFile: string;
}

// ---------------------------------------------------------------------------
// Path → filename mapping
// ---------------------------------------------------------------------------

/**
 * Given a requirement path from data.json (e.g., "1", "2.a", "3.b",
 * "6.beef-cattle"), determine the expected guide markdown filename(s).
 *
 * Returns an array because a resource could appear on either a combined
 * page (req2.md covering 2a-2c) or a split page (req2a.md).
 */
function reqPathToPossibleFiles(
  slug: string,
  path: string,
): string[] {
  const guideDir = `hugo/content/merit-badges/${slug}/guide`;
  const parts = path.split(".");

  if (parts.length === 1) {
    // Top-level requirement: "1" → req1.md
    return [`${guideDir}/req${parts[0]}.md`];
  }

  if (parts.length === 2) {
    const parent = parts[0]!;
    const child = parts[1]!;

    // Check if this is a named option (e.g., "6.beef-cattle")
    const isOption = /[a-z].*-/.test(child) || child.length > 1;

    if (isOption) {
      // Named option: "6.beef-cattle" → req6-beef-cattle.md or req6.md
      return [
        `${guideDir}/req${parent}-${child}.md`,
        `${guideDir}/req${parent}.md`,
      ];
    }

    // Standard sub-requirement: "2.a" → req2a.md or req2.md (combined page)
    return [
      `${guideDir}/req${parent}${child}.md`,
      `${guideDir}/req${parent}.md`,
    ];
  }

  if (parts.length === 3) {
    // Deeply nested: "6.beef-cattle.a" → req6-beef-cattle.md
    const parent = parts[0]!;
    const option = parts[1]!;
    const child = parts[2]!;

    return [
      `${guideDir}/req${parent}-${option}.md`,
      `${guideDir}/req${parent}${child}.md`,
      `${guideDir}/req${parent}.md`,
    ];
  }

  // Fallback: try the most specific match
  return [`${guideDir}/req${parts.join("")}.md`];
}

/**
 * Normalize a URL for comparison. Strips tracking parameters (si=...),
 * trailing slashes, and normalizes youtube short URLs to full form.
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Remove common tracking params
    parsed.searchParams.delete("si");
    parsed.searchParams.delete("feature");

    // Normalize youtu.be to youtube.com/watch
    if (parsed.hostname === "youtu.be") {
      const videoId = parsed.pathname.slice(1); // Remove leading /
      return `youtube.com/watch?v=${videoId}`;
    }

    // Strip www. and protocol for comparison
    let normalized = parsed.hostname.replace(/^www\./, "") + parsed.pathname;
    const searchStr = parsed.searchParams.toString();
    if (searchStr) normalized += "?" + searchStr;

    // Remove trailing slash
    return normalized.replace(/\/$/, "");
  } catch {
    return url;
  }
}

/**
 * Check if a URL appears anywhere in the given file content.
 * Uses normalized comparison to handle youtu.be vs youtube.com differences
 * and tracking parameter variations.
 */
function urlAppearsInContent(url: string, content: string): boolean {
  // Direct substring check first (fastest path)
  if (content.includes(url)) return true;

  // Try normalized comparison
  const normalizedTarget = normalizeUrl(url);

  // Extract all URLs from the content and normalize each
  const urlPattern = /https?:\/\/[^\s"'<>]+/g;
  let match;
  while ((match = urlPattern.exec(content)) !== null) {
    if (normalizeUrl(match[0]) === normalizedTarget) return true;
  }

  // Also check for just the video ID in case the URL form differs
  const videoIdMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^?&\s"]+)/,
  );
  if (videoIdMatch?.[1]) {
    return content.includes(videoIdMatch[1]);
  }

  return false;
}

// ---------------------------------------------------------------------------
// Recursive resource extraction
// ---------------------------------------------------------------------------

interface ResourceMapping {
  reqPath: string;
  reqText: string;
  resource: Resource;
}

/**
 * Recursively extract all resources from a requirement tree, preserving
 * which requirement path each resource belongs to.
 */
function extractResources(req: Requirement, parentPath?: string): ResourceMapping[] {
  const mappings: ResourceMapping[] = [];
  const path = parentPath ? `${parentPath}.${req.req_id}` : req.path;

  if (req.resources) {
    for (const resource of req.resources) {
      mappings.push({
        reqPath: path,
        reqText: req.text.slice(0, 80) + (req.text.length > 80 ? "..." : ""),
        resource,
      });
    }
  }

  if (req.subrequirements) {
    for (const sub of req.subrequirements) {
      mappings.push(...extractResources(sub, path));
    }
  }

  return mappings;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const badgeSlugs = process.env.BADGE_SLUGS?.split(",").map((s) => s.trim());

  // Find all badges that have guide directories
  let slugsToCheck: string[];

  if (badgeSlugs && badgeSlugs.length > 0) {
    slugsToCheck = badgeSlugs;
  } else {
    // Find all badges with guide directories
    slugsToCheck = [];
    const glob = new Glob("hugo/content/merit-badges/*/guide/_index.md");
    for await (const path of glob.scan({ cwd: ".", absolute: false })) {
      const match = path.match(/merit-badges\/([^/]+)\/guide/);
      if (match?.[1]) slugsToCheck.push(match[1]);
    }
    slugsToCheck.sort();
  }

  console.log(`Checking ${slugsToCheck.length} badge(s): ${slugsToCheck.join(", ")}\n`);

  const allMissing: MissingResource[] = [];
  const allFound: FoundResource[] = [];
  let totalResources = 0;

  for (const slug of slugsToCheck) {
    // Load data.json
    const dataPath = `hugo/data/merit-badges/${slug}.json`;
    const dataFile = Bun.file(dataPath);

    if (!(await dataFile.exists())) {
      console.log(`  ⚠️  ${slug}: No data.json found at ${dataPath}, skipping`);
      continue;
    }

    const data = (await dataFile.json()) as BadgeData;

    // Extract all resources with their requirement paths
    const resourceMappings: ResourceMapping[] = [];
    for (const req of data.requirements) {
      resourceMappings.push(...extractResources(req));
    }

    if (resourceMappings.length === 0) {
      console.log(`  ℹ️  ${slug}: No resources in data.json`);
      continue;
    }

    totalResources += resourceMappings.length;

    // Load all guide files into a cache
    const fileCache = new Map<string, string>();
    const guideGlob = new Glob(`hugo/content/merit-badges/${slug}/guide/**/*.md`);
    for await (const path of guideGlob.scan({ cwd: ".", absolute: false })) {
      const content = await Bun.file(path).text();
      fileCache.set(path, content);
    }

    // Check each resource
    let badgeMissing = 0;
    let badgeFound = 0;

    for (const mapping of resourceMappings) {
      const possibleFiles = reqPathToPossibleFiles(slug, mapping.reqPath);
      let found = false;
      const checkedFiles: string[] = [];

      // Check the expected files first
      for (const expectedFile of possibleFiles) {
        const content = fileCache.get(expectedFile);
        if (content && urlAppearsInContent(mapping.resource.url, content)) {
          found = true;
          allFound.push({
            badge: slug,
            reqPath: mapping.reqPath,
            resource: mapping.resource,
            foundInFile: expectedFile,
          });
          break;
        }
        if (content) checkedFiles.push(expectedFile);
      }

      // If not found in expected files, check ALL guide files as a fallback
      if (!found) {
        for (const [filePath, content] of fileCache) {
          if (possibleFiles.includes(filePath)) continue; // Already checked
          if (urlAppearsInContent(mapping.resource.url, content)) {
            found = true;
            allFound.push({
              badge: slug,
              reqPath: mapping.reqPath,
              resource: mapping.resource,
              foundInFile: filePath,
            });
            break;
          }
        }
      }

      if (found) {
        badgeFound++;
      } else {
        badgeMissing++;
        allMissing.push({
          badge: slug,
          reqPath: mapping.reqPath,
          reqText: mapping.reqText,
          resource: mapping.resource,
          expectedFile: possibleFiles[0] ?? "unknown",
          checkedFiles,
        });
      }
    }

    const status = badgeMissing === 0 ? "✅" : "❌";
    console.log(
      `  ${status} ${slug}: ${badgeFound}/${badgeFound + badgeMissing} resources present`,
    );
  }

  // Report
  console.log("\n" + "=".repeat(80));
  console.log("RESULTS");
  console.log("=".repeat(80));

  if (allMissing.length > 0) {
    console.log(`\n❌ MISSING RESOURCES (${allMissing.length}):\n`);

    // Group by badge
    const byBadge = new Map<string, MissingResource[]>();
    for (const m of allMissing) {
      if (!byBadge.has(m.badge)) byBadge.set(m.badge, []);
      byBadge.get(m.badge)!.push(m);
    }

    for (const [badge, missing] of byBadge) {
      console.log(`  ${badge}:`);
      for (const m of missing) {
        console.log(`    Req ${m.reqPath}: ${m.resource.title}`);
        console.log(`      URL: ${m.resource.url}`);
        console.log(`      Expected in: ${m.expectedFile}`);
        console.log();
      }
    }
  }

  if (allFound.length > 0) {
    console.log(`\n✅ FOUND (${allFound.length} resources present in guide pages)\n`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));
  console.log(`  Total resources in data.json: ${totalResources}`);
  console.log(`  Present in guide pages:       ${allFound.length}`);
  console.log(`  Missing from guide pages:     ${allMissing.length}`);

  if (allMissing.length > 0) {
    console.log(
      `\n  ⚠️  ${allMissing.length} resource(s) from data.json are not present in the guide.`,
    );
    console.log(
      `     Add them using {{< drg/video >}} for YouTube or {{< drg/external-link >}} for other URLs.`,
    );
  } else if (totalResources > 0) {
    console.log(`\n  🎉 All data.json resources are present in the guide pages!`);
  }

  console.log();

  // Exit with error if missing resources
  if (allMissing.length > 0) {
    process.exit(1);
  }
}

main();
