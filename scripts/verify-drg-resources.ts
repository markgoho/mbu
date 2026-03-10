/**
 * Verify that all resources from data.json appear in the corresponding DRG
 * guide pages.
 *
 * Walks the `resources` arrays in each badge's data.json, determines which
 * guide page should contain each resource, and checks that the resource URL
 * actually appears in that file. For combined requirement pages, it also checks
 * that the resource appears under the correct `## Requirement ...` subsection.
 *
 * Usage:
 *   bun scripts/verify-drg-resources.ts
 *   BADGE_SLUGS="fingerprinting,first-aid" bun scripts/verify-drg-resources.ts
 */

import { Glob } from "bun";

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

interface MisplacedResource {
  badge: string;
  reqPath: string;
  resource: Resource;
  file: string;
  sectionHeading: string;
}

interface WrongShortcode {
  file: string;
  line: number;
  url: string;
  title: string;
}

interface ResourceMapping {
  reqPath: string;
  reqText: string;
  resource: Resource;
}

function reqPathToPossibleFiles(slug: string, path: string): string[] {
  const guideDirectory = `hugo/content/merit-badges/${slug}/guide`;
  const pathParts = path.split(".");

  if (pathParts.length === 1) {
    return [`${guideDirectory}/req${pathParts[0]}.md`];
  }

  if (pathParts.length === 2) {
    const parentPart = pathParts[0];
    const childPart = pathParts[1];

    if (parentPart === undefined || childPart === undefined) {
      return [];
    }

    const isNamedOption = /[a-z].*-/.test(childPart) || childPart.length > 1;

    if (isNamedOption) {
      return [
        `${guideDirectory}/req${parentPart}-${childPart}.md`,
        `${guideDirectory}/req${parentPart}.md`,
      ];
    }

    return [
      `${guideDirectory}/req${parentPart}${childPart}.md`,
      `${guideDirectory}/req${parentPart}.md`,
    ];
  }

  if (pathParts.length === 3) {
    const parentPart = pathParts[0];
    const optionPart = pathParts[1];
    const childPart = pathParts[2];

    if (
      parentPart === undefined ||
      optionPart === undefined ||
      childPart === undefined
    ) {
      return [];
    }

    return [
      `${guideDirectory}/req${parentPart}-${optionPart}.md`,
      `${guideDirectory}/req${parentPart}${childPart}.md`,
      `${guideDirectory}/req${parentPart}.md`,
    ];
  }

  return [`${guideDirectory}/req${pathParts.join("")}.md`];
}

function normalizeUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);

    parsedUrl.searchParams.delete("si");
    parsedUrl.searchParams.delete("feature");

    if (parsedUrl.hostname === "youtu.be") {
      const videoId = parsedUrl.pathname.slice(1);
      return `youtube.com/watch?v=${videoId}`;
    }

    let normalizedUrl =
      parsedUrl.hostname.replace(/^www\./, "") + parsedUrl.pathname;
    const searchString = parsedUrl.searchParams.toString();
    if (searchString !== "") {
      normalizedUrl += `?${searchString}`;
    }

    return normalizedUrl.replace(/\/$/, "");
  } catch {
    return url;
  }
}

function urlAppearsInContent(url: string, content: string): boolean {
  if (content.includes(url)) {
    return true;
  }

  const normalizedTargetUrl = normalizeUrl(url);
  const urlPattern = /https?:\/\/[^\s"'<>]+/g;

  let urlMatch: RegExpExecArray | null = urlPattern.exec(content);
  while (urlMatch !== null) {
    const matchedUrl = urlMatch[0];
    if (matchedUrl !== undefined && normalizeUrl(matchedUrl) === normalizedTargetUrl) {
      return true;
    }
    urlMatch = urlPattern.exec(content);
  }

  const videoIdMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^?&\s"]+)/,
  );
  const videoId = videoIdMatch?.[1];
  if (videoId !== undefined) {
    return content.includes(videoId);
  }

  return false;
}

function requirementPathToHeading(reqPath: string): string | undefined {
  const pathParts = reqPath.split(".");
  if (pathParts.length !== 2) {
    return undefined;
  }

  const parentPart = pathParts[0];
  const childPart = pathParts[1];
  if (parentPart === undefined || childPart === undefined) {
    return undefined;
  }

  return `## Requirement ${parentPart}${childPart}:`;
}

function findSectionBounds({
  content,
  headingMatches,
  headingIndex,
}: {
  content: string;
  headingMatches: RegExpExecArray[];
  headingIndex: number;
}): { start: number; end: number } | undefined {
  const currentHeadingMatch = headingMatches[headingIndex];
  const sectionStart = currentHeadingMatch?.index;
  if (sectionStart === undefined) {
    return undefined;
  }

  const nextHeadingMatch = headingMatches[headingIndex + 1];
  const sectionEnd = nextHeadingMatch?.index ?? content.length;

  return { start: sectionStart, end: sectionEnd };
}

function findMisplacedResourceInCombinedPage({
  badge,
  reqPath,
  resource,
  filePath,
  content,
}: {
  badge: string;
  reqPath: string;
  resource: Resource;
  filePath: string;
  content: string;
}): MisplacedResource | undefined {
  const expectedHeading = requirementPathToHeading(reqPath);
  if (expectedHeading === undefined) {
    return undefined;
  }

  if (!urlAppearsInContent(resource.url, content)) {
    return undefined;
  }

  const headingMatches = Array.from(
    content.matchAll(/^## Requirement ([^\n:]+):/gm),
  );
  if (headingMatches.length < 2) {
    return undefined;
  }

  const expectedHeadingIndex = headingMatches.findIndex((headingMatch) => {
    return headingMatch[0] === expectedHeading;
  });

  if (expectedHeadingIndex === -1) {
    return undefined;
  }

  const expectedSectionBounds = findSectionBounds({
    content,
    headingMatches,
    headingIndex: expectedHeadingIndex,
  });
  if (expectedSectionBounds === undefined) {
    return undefined;
  }

  const expectedSection = content.slice(
    expectedSectionBounds.start,
    expectedSectionBounds.end,
  );
  if (urlAppearsInContent(resource.url, expectedSection)) {
    return undefined;
  }

  for (let headingIndex = 0; headingIndex < headingMatches.length; headingIndex += 1) {
    const headingMatch = headingMatches[headingIndex];
    if (headingMatch === undefined) {
      continue;
    }

    const sectionBounds = findSectionBounds({
      content,
      headingMatches,
      headingIndex,
    });
    if (sectionBounds === undefined) {
      continue;
    }

    const sectionContent = content.slice(sectionBounds.start, sectionBounds.end);
    if (!urlAppearsInContent(resource.url, sectionContent)) {
      continue;
    }

    const sectionHeading = headingMatch[0];
    if (sectionHeading === undefined) {
      continue;
    }

    return {
      badge,
      reqPath,
      resource,
      file: filePath,
      sectionHeading,
    };
  }

  return undefined;
}

function extractResources(
  requirement: Requirement,
  parentPath?: string,
): ResourceMapping[] {
  const mappings: ResourceMapping[] = [];
  const currentPath = parentPath ? `${parentPath}.${requirement.req_id}` : requirement.path;

  if (requirement.resources !== undefined) {
    for (const resource of requirement.resources) {
      mappings.push({
        reqPath: currentPath,
        reqText:
          requirement.text.slice(0, 80) +
          (requirement.text.length > 80 ? "..." : ""),
        resource,
      });
    }
  }

  if (requirement.subrequirements !== undefined) {
    for (const subrequirement of requirement.subrequirements) {
      mappings.push(...extractResources(subrequirement, currentPath));
    }
  }

  return mappings;
}

function isYoutubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/.test(url);
}

function findWrongShortcodes(
  fileCache: Map<string, string>,
): WrongShortcode[] {
  const issues: WrongShortcode[] = [];

  for (const [filePath, content] of fileCache.entries()) {
    const contentLines = content.split("\n");

    for (const [lineIndex, line] of contentLines.entries()) {
      if (!line.includes("drg/external-link")) {
        continue;
      }

      const blockLines = contentLines.slice(
        lineIndex,
        Math.min(contentLines.length, lineIndex + 6),
      );
      const shortcodeBlock = blockLines.join("\n");

      const urlMatch = shortcodeBlock.match(/url="([^"]+)"/);
      const matchedUrl = urlMatch?.[1];
      if (matchedUrl === undefined || !isYoutubeUrl(matchedUrl)) {
        continue;
      }

      const titleMatch = shortcodeBlock.match(/title="([^"]+)"/);
      const matchedTitle = titleMatch?.[1] ?? "(no title)";

      issues.push({
        file: filePath,
        line: lineIndex + 1,
        url: matchedUrl,
        title: matchedTitle,
      });
    }
  }

  return issues;
}

async function main(): Promise<void> {
  const configuredBadgeSlugs = process.env.BADGE_SLUGS?.split(",").map((slug) => {
    return slug.trim();
  });

  let slugsToCheck: string[];

  if (configuredBadgeSlugs !== undefined && configuredBadgeSlugs.length > 0) {
    slugsToCheck = configuredBadgeSlugs;
  } else {
    slugsToCheck = [];
    const guideIndexGlob = new Glob("hugo/content/merit-badges/*/guide/_index.md");

    for await (const path of guideIndexGlob.scan({ cwd: ".", absolute: false })) {
      const badgeMatch = path.match(/merit-badges\/([^/]+)\/guide/);
      const badgeSlug = badgeMatch?.[1];
      if (badgeSlug !== undefined) {
        slugsToCheck.push(badgeSlug);
      }
    }

    slugsToCheck.sort();
  }

  console.log(`Checking ${slugsToCheck.length} badge(s): ${slugsToCheck.join(", ")}\n`);

  const allMissing: MissingResource[] = [];
  const allFound: FoundResource[] = [];
  const allMisplaced: MisplacedResource[] = [];
  const allWrongShortcodes: WrongShortcode[] = [];
  let totalResources = 0;

  for (const slug of slugsToCheck) {
    const dataPath = `hugo/data/merit-badges/${slug}.json`;
    const dataFile = Bun.file(dataPath);

    if (!(await dataFile.exists())) {
      console.log(`  ⚠️  ${slug}: No data.json found at ${dataPath}, skipping`);
      continue;
    }

    const badgeData = (await dataFile.json()) as BadgeData;
    const resourceMappings: ResourceMapping[] = [];

    for (const requirement of badgeData.requirements) {
      resourceMappings.push(...extractResources(requirement));
    }

    if (resourceMappings.length === 0) {
      console.log(`  ℹ️  ${slug}: No resources in data.json`);
      continue;
    }

    totalResources += resourceMappings.length;

    const fileCache = new Map<string, string>();
    const guideFileGlob = new Glob(`hugo/content/merit-badges/${slug}/guide/**/*.md`);
    for await (const guidePath of guideFileGlob.scan({ cwd: ".", absolute: false })) {
      const guideContent = await Bun.file(guidePath).text();
      fileCache.set(guidePath, guideContent);
    }

    let badgeMissingCount = 0;
    let badgeFoundCount = 0;
    const badgeMisplaced: MisplacedResource[] = [];

    for (const resourceMapping of resourceMappings) {
      const possibleFiles = reqPathToPossibleFiles(slug, resourceMapping.reqPath);
      let found = false;
      const checkedFiles: string[] = [];

      for (const expectedFile of possibleFiles) {
        const content = fileCache.get(expectedFile);
        if (content === undefined) {
          continue;
        }

        checkedFiles.push(expectedFile);

        if (!urlAppearsInContent(resourceMapping.resource.url, content)) {
          continue;
        }

        found = true;
        allFound.push({
          badge: slug,
          reqPath: resourceMapping.reqPath,
          resource: resourceMapping.resource,
          foundInFile: expectedFile,
        });

        const misplacedResource = findMisplacedResourceInCombinedPage({
          badge: slug,
          reqPath: resourceMapping.reqPath,
          resource: resourceMapping.resource,
          filePath: expectedFile,
          content,
        });
        if (misplacedResource !== undefined) {
          badgeMisplaced.push(misplacedResource);
          allMisplaced.push(misplacedResource);
        }

        break;
      }

      if (!found) {
        for (const [filePath, content] of fileCache) {
          if (possibleFiles.includes(filePath)) {
            continue;
          }

          if (!urlAppearsInContent(resourceMapping.resource.url, content)) {
            continue;
          }

          found = true;
          allFound.push({
            badge: slug,
            reqPath: resourceMapping.reqPath,
            resource: resourceMapping.resource,
            foundInFile: filePath,
          });
          break;
        }
      }

      if (found) {
        badgeFoundCount++;
      } else {
        badgeMissingCount++;
        allMissing.push({
          badge: slug,
          reqPath: resourceMapping.reqPath,
          reqText: resourceMapping.reqText,
          resource: resourceMapping.resource,
          expectedFile: possibleFiles[0] ?? "unknown",
          checkedFiles,
        });
      }
    }

    const wrongShortcodes = findWrongShortcodes(fileCache);
    allWrongShortcodes.push(...wrongShortcodes);

    const badgeStatus =
      badgeMissingCount === 0 &&
      badgeMisplaced.length === 0 &&
      wrongShortcodes.length === 0
        ? "✅"
        : "❌";

    const statusParts = [
      `${badgeFoundCount}/${badgeFoundCount + badgeMissingCount} resources present`,
    ];
    if (badgeMisplaced.length > 0) {
      statusParts.push(`${badgeMisplaced.length} misplaced resource(s)`);
    }
    if (wrongShortcodes.length > 0) {
      statusParts.push(`${wrongShortcodes.length} YouTube video(s) using wrong shortcode`);
    }

    console.log(`  ${badgeStatus} ${slug}: ${statusParts.join(", ")}`);
  }

  console.log(`\n${"=".repeat(80)}`);
  console.log("RESULTS");
  console.log("=".repeat(80));

  if (allMissing.length > 0) {
    console.log(`\n❌ MISSING RESOURCES (${allMissing.length}):\n`);

    const resourcesByBadge = new Map<string, MissingResource[]>();
    for (const missingResource of allMissing) {
      const existingResources = resourcesByBadge.get(missingResource.badge) ?? [];
      existingResources.push(missingResource);
      resourcesByBadge.set(missingResource.badge, existingResources);
    }

    for (const [badge, missingResources] of resourcesByBadge.entries()) {
      console.log(`  ${badge}:`);
      for (const missingResource of missingResources) {
        console.log(
          `    Req ${missingResource.reqPath}: ${missingResource.resource.title}`,
        );
        console.log(`      URL: ${missingResource.resource.url}`);
        console.log(`      Expected in: ${missingResource.expectedFile}`);
        console.log();
      }
    }
  }

  if (allMisplaced.length > 0) {
    console.log(`\n❌ MISPLACED RESOURCES (${allMisplaced.length}):\n`);
    console.log(
      "    These resources appear on the correct combined page but under the wrong requirement subsection.\n",
    );

    for (const misplacedResource of allMisplaced) {
      console.log(`  ${misplacedResource.file}`);
      console.log(`    Expected subsection: Req ${misplacedResource.reqPath}`);
      console.log(`    Found under: ${misplacedResource.sectionHeading}`);
      console.log(`    Title: ${misplacedResource.resource.title}`);
      console.log(`    URL:   ${misplacedResource.resource.url}`);
      console.log();
    }
  }

  if (allWrongShortcodes.length > 0) {
    console.log(
      `\n⚠️  WRONG SHORTCODE (${allWrongShortcodes.length} YouTube video(s) using drg/external-link instead of drg/video):\n`,
    );
    console.log(
      "    YouTube videos should use {{< drg/video >}} to embed the player directly.",
    );
    console.log(
      "    Only use {{< drg/external-link >}} for YouTube videos with embedding disabled.\n",
    );

    for (const wrongShortcode of allWrongShortcodes) {
      console.log(`  ${wrongShortcode.file}:${wrongShortcode.line}`);
      console.log(`    Title: ${wrongShortcode.title}`);
      console.log(`    URL:   ${wrongShortcode.url}`);
      console.log();
    }
  }

  if (allFound.length > 0) {
    console.log(`\n✅ FOUND (${allFound.length} resources present in guide pages)\n`);
  }

  console.log("=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));
  console.log(`  Total resources in data.json: ${totalResources}`);
  console.log(`  Present in guide pages:       ${allFound.length}`);
  console.log(`  Missing from guide pages:     ${allMissing.length}`);
  console.log(`  Misplaced in combined pages:  ${allMisplaced.length}`);
  console.log(`  Wrong shortcode (YouTube):    ${allWrongShortcodes.length}`);

  if (
    allFound.length > 0 &&
    allMissing.length === 0 &&
    allMisplaced.length === 0 &&
    allWrongShortcodes.length === 0
  ) {
    console.log(
      "\n  ✅ All resources are present and correctly placed, including within combined requirement pages.",
    );
  }

  if (allMissing.length > 0 || allMisplaced.length > 0 || allWrongShortcodes.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
