/**
 * Verify that DRG guide pages use drg/requirement vs drg/inherited-requirement
 * appropriately for child requirement text shape.
 *
 * Usage:
 *   bun scripts/verify-drg-requirements.ts
 *   BADGE_SLUGS="energy,first-aid" bun scripts/verify-drg-requirements.ts
 */

import { Glob } from "bun";

interface Requirement {
  req_id: string;
  path: string;
  text: string;
  is_option?: boolean;
  subrequirements?: Requirement[];
  subrequirement_mode?: { type: string; count?: number };
}

interface BadgeData {
  title: string;
  slug: string;
  requirements: Requirement[];
}

type ShortcodeKind = "requirement" | "inherited-requirement";

type RequirementMapping = {
  reqPath: string;
  reqText: string;
  expectedShortcode: ShortcodeKind;
};

type RequirementUsage = {
  badge: string;
  reqPath: string;
  reqText: string;
  expectedShortcode: ShortcodeKind;
  actualShortcode: ShortcodeKind | "missing";
  filePath: string;
};

const OWN_ACTION_VERBS = [
  "obtain",
  "explain",
  "describe",
  "identify",
  "name",
  "list",
  "tell",
  "discuss",
  "show",
  "demonstrate",
  "construct",
  "prepare",
  "research",
  "record",
  "compare",
  "create",
  "define",
  "use",
  "conduct",
  "revisit",
  "complete",
  "visit",
  "interview",
  "pick",
  "select",
  "choose",
  "learn",
  "help",
  "point",
  "tour",
  "share",
  "make",
  "write",
  "draw",
  "locate",
  "find",
  "outline",
  "plan",
  "set",
  "review",
  "collect",
  "calculate",
  "give",
  "state",
  "explore",
  "diagram",
  "establish",
  "follow",
  "check",
  "render",
  "discover",
  "document",
  "think",
  "do",
  "observe",
  "sketch",
  "develop",
  "meet",
] as const;

const OWN_ACTION_PATTERN = new RegExp(
  `^(?:${OWN_ACTION_VERBS.join("|")})\\b`,
  "i",
);

const GENERIC_PARENT_PATTERNS = [
  /^do(?:\s+all|\s+one|\s+two|\s+three|\s+four|\s+five)?\s+of\s+the\s+following/i,
  /^discuss(?:\s+with\s+your\s+counselor)?\s+the\s+following/i,
  /^discuss\s+the\s+following\s+with\s+your\s+counselor/i,
  /^document\s+and\s+discuss/i,
  /^repeat\b.*\bchoose\b.*\bscenarios/i,
  /^select\b.*\bdo\s+the\s+following/i,
  /^choose\b.*\bdo\s+the\s+following/i,
  /^complete\b.*\boptions?\b/i,
  /^render\b.*\bthese\s+ways/i,
] as const;

function shortcodeUsageMatchesExpectation(
  expectedShortcode: ShortcodeKind,
  actualShortcode: ShortcodeKind | "missing",
): boolean {
  if (actualShortcode === "missing") {
    return false;
  }

  if (expectedShortcode === "inherited-requirement") {
    return actualShortcode === "inherited-requirement";
  }

  return (
    actualShortcode === "requirement" ||
    actualShortcode === "inherited-requirement"
  );
}

function formatExpectedShortcode(expectedShortcode: ShortcodeKind): string {
  if (expectedShortcode === "requirement") {
    return "requirement (inherited also acceptable)";
  }

  return expectedShortcode;
}

function stripLeadingContext(text: string): string {
  let remaining = text.trim();

  while (true) {
    const next = remaining.replace(
      /^(?:(?:in your own words|for each of|for each|for every|for the following|using|with|after|before|by)\b[^,]*,\s*)/i,
      "",
    );

    if (next === remaining) {
      return remaining;
    }

    remaining = next.trim();
  }
}

function startsWithOwnAction(text: string): boolean {
  const trimmedText = text.trim();

  if (trimmedText === "") {
    return false;
  }

  if (/^(with|after|before|using|by)\b/i.test(trimmedText)) {
    return true;
  }

  return OWN_ACTION_PATTERN.test(stripLeadingContext(trimmedText));
}

function parentSupportsInheritedDisplay(text: string): boolean {
  const trimmedText = text.trim().replace(/[:.]+$/, "");

  if (trimmedText === "") {
    return false;
  }

  return !GENERIC_PARENT_PATTERNS.some(pattern => pattern.test(trimmedText));
}

function childLooksLikeScenarioLabel(text: string): boolean {
  return /^scenario\s+\d+:/i.test(text.trim());
}

function childLooksLikeListLabel(text: string): boolean {
  const trimmedText = text.trim();
  return (
    !startsWithOwnAction(trimmedText) && /^[A-Z][^.]*[.:]?$/s.test(trimmedText)
  );
}

function childLooksLikeStandaloneQuestion(text: string): boolean {
  return /^(what|when|where|which|who|why)\b/i.test(text.trim());
}

function childLooksLikeDeclarativeTeachingPrompt(text: string): boolean {
  const trimmedText = text.trim();

  if (trimmedText === "") {
    return false;
  }

  if (startsWithOwnAction(trimmedText)) {
    return false;
  }

  if (childLooksLikeStandaloneQuestion(trimmedText)) {
    return true;
  }

  const firstSentence = trimmedText.split(/[!?]/, 1)[0] ?? trimmedText;
  return /\.(?:\s|$)/.test(firstSentence);
}

function shouldAllowPlainRequirementForLabel(
  text: string,
  parentText: string | undefined,
): boolean {
  if (parentText === undefined) {
    return false;
  }

  const trimmedText = text.trim();
  const trimmedParentText = parentText.trim();

  const parentPatterns = [
    /^document\s+and\s+discuss/i,
    /^repeat\b.*\bchoose\b.*\bscenarios/i,
    /^discuss\s+the\s+importance\s+of/i,
    /^list\s+the\s+three\s+branches\b.*\bexplain/i,
    /^(plan\s+and\s+weave|explain\s+the\s+following)/i,
    /^as a solo paddler\b.*\bdemonstrate the following/i,
    /^make one or more articles of leather\b.*\bthe following steps/i,
    /must incorporate the following/i,
    /^plan and carry out a project\b.*\bdiscuss the following/i,
    /^explain to your counselor what the following \w+ are/i,
    /^discuss with your counselor five of the following concepts/i,
    /^explain to your counselor the following/i,
    /^discuss the following/i,
    /^discuss with your counselor the following/i,
    /^outline with your counselor a comprehensive 12-week physical fitness and nutrition program\b.*\bmust incorporate the following/i,
    /^do the following:?$/i,
    /^give the nutritional value of the following:?$/i,
    /^contact one of the following/i,
  ];

  if (parentPatterns.some(pattern => pattern.test(trimmedParentText))) {
    return true;
  }

  const textPatterns = [
    /^the different ways to borrow money\b/i,
    /^(forward stroke|backstroke|forward sweep|reverse sweep|draw stroke|stern draw)\b/i,
    /^(pattern layout and transfer|cutting leather|punching holes|carving or stamping surface designs|applying dye or stain and finish to the project|assembly by lacing or stitching|setting snaps and rivets)\b/i,
    /^(warm-up|cardiorespiratory \(aerobic\) element|muscular strength and endurance element|flexibility element|cool-down)\b/i,
    /^[A-Z][^.!?]*:\s+/s,
    /^(the different ways to|the objective or goal|how individual members|the results of)\b/i,
    /^(square|round)\s+basket\.?$/i,
    /^(declaration of independence|bill of rights\b)/i,
    /^(live household electric wire|a structure filled with carbon monoxide|clothes on fire)\b/i,
    /^(product or service|market analysis|financial|personnel|promotion and marketing)\b/i,
    /^(diesel engine|hydraulic system)\b/i,
    /^(three root or tuber crops|three vegetables that bear above the ground|a genealogical or lineage society|a professional genealogist|a surname organization)\b/i,
    /^the function\b/i,
    /^the name\b/i,
    /^(electrical (terms|conditions)|units of measure)\b/i,
    /^(explain to your counselor what|name three types of|tell how you found it|explain the effect computers|explain how photography|explain how record indexing)\b/i,
    /^## Requirement\s+\d+[a-z]?(?::|\b)/i,
  ];

  return textPatterns.some(pattern => pattern.test(trimmedText));
}
function expectedShortcodeForRequirement(
  text: string,
  parentText: string | undefined,
): ShortcodeKind {
  const trimmedText = text.trim();

  if (trimmedText === "") {
    return "requirement";
  }

  if (startsWithOwnAction(trimmedText)) {
    return "requirement";
  }

  // "The difference(s) between X and Y" reads as a bare label but, unlike
  // "Square basket" or "Electrical terms", the merged sentence needs no
  // article and inherited-requirement.html now lower-cases the leading
  // "The" -- so skip the generic label carve-out below (which would let
  // any "explain/discuss the following"-style parent exempt it) and fall
  // through to the general parent-quality check instead.
  if (!/^the\s+differences?\b/i.test(trimmedText)) {
    if (
      (childLooksLikeScenarioLabel(trimmedText) ||
        childLooksLikeListLabel(trimmedText)) &&
      shouldAllowPlainRequirementForLabel(trimmedText, parentText)
    ) {
      return "requirement";
    }
  }

  if (childLooksLikeStandaloneQuestion(trimmedText)) {
    return "requirement";
  }

  if (childLooksLikeDeclarativeTeachingPrompt(trimmedText)) {
    return "requirement";
  }

  if (/^do\s+one\s+of\s+the\s+following/i.test(trimmedText)) {
    return "requirement";
  }

  if (/^how\b/i.test(trimmedText)) {
    return "requirement";
  }

  if (
    /^what\b/i.test(trimmedText) &&
    shouldAllowPlainRequirementForLabel(trimmedText, parentText)
  ) {
    return "requirement";
  }

  if (/^the (term|relationship)\b/i.test(trimmedText)) {
    return "requirement";
  }

  return parentText !== undefined && parentSupportsInheritedDisplay(parentText)
    ? "inherited-requirement"
    : "requirement";
}

function shouldSkipRequirementUsageCheck(
  requirement: Requirement,
  reqPath: string,
): boolean {
  if (requirement.is_option === true) {
    return true;
  }

  return reqPath.split(".").length >= 3;
}

function compactRequirementPath(path: string): string {
  return path.split(".").join("");
}

function isCompactPathSegment(value: string): boolean {
  return /^[a-z0-9]$/i.test(value);
}

function requirementPathToPageSlug(path: string): string {
  const pathParts = path.split(".");
  const topLevelPart = pathParts[0];

  if (topLevelPart === undefined) {
    throw new Error(`Invalid requirement path: ${path}`);
  }

  let pageSlug = `req${topLevelPart}`;

  for (const pathPart of pathParts.slice(1)) {
    if (isCompactPathSegment(pathPart)) {
      pageSlug += pathPart;
      continue;
    }

    pageSlug += `-${pathPart}`;
  }

  return pageSlug;
}

function parentPaths(path: string): string[] {
  const parts = path.split(".");
  const parents: string[] = [];

  for (let index = parts.length - 1; index > 0; index -= 1) {
    parents.push(parts.slice(0, index).join("."));
  }

  return parents;
}

function possibleFilesForRequirement(slug: string, reqPath: string): string[] {
  const guideDirectory = `hugo/content/merit-badges/${slug}/guide`;
  const candidatePaths = [reqPath, ...parentPaths(reqPath)];

  return Array.from(
    new Set(
      candidatePaths.map(
        path => `${guideDirectory}/${requirementPathToPageSlug(path)}.md`,
      ),
    ),
  );
}

function directFileForRequirement(slug: string, reqPath: string): string {
  return `hugo/content/merit-badges/${slug}/guide/${requirementPathToPageSlug(reqPath)}.md`;
}

function fileContainsRequirementShortcode(
  content: string,
  reqNumber: string,
): boolean {
  const pattern = new RegExp(
    String.raw`\{\{<\s*drg/requirement\s+number="${reqNumber}"(?:\s|>)`,
  );
  return pattern.test(content);
}

function fileContainsInheritedShortcode(
  content: string,
  reqNumber: string,
): boolean {
  const pattern = new RegExp(
    String.raw`\{\{<\s*drg/inherited-requirement\s+number="${reqNumber}"(?:\s|>|/)`,
  );
  return pattern.test(content);
}

function detectShortcodeKind(
  content: string,
  reqPath: string,
): ShortcodeKind | "missing" {
  const reqNumber = compactRequirementPath(reqPath);

  if (fileContainsRequirementShortcode(content, reqNumber)) {
    return "requirement";
  }

  if (fileContainsInheritedShortcode(content, reqNumber)) {
    return "inherited-requirement";
  }

  return "missing";
}

function fileLikelyContainsRequirementSection(
  content: string,
  reqPath: string,
): boolean {
  const reqNumber = compactRequirementPath(reqPath);
  const headingPattern = new RegExp(`^## Requirement ${reqNumber}\\b`, "m");
  if (headingPattern.test(content)) {
    return true;
  }

  const escapedReqPath = reqPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const reqPathPattern = new RegExp(`^req_path:s*"${escapedReqPath}"`, "m");
  return reqPathPattern.test(content);
}

function findActualUsage(
  slug: string,
  reqPath: string,
  fileCache: Map<string, string>,
): { actualShortcode: ShortcodeKind | "missing"; matchedFile: string } {
  for (const [filePath, content] of fileCache) {
    const actualShortcode = detectShortcodeKind(content, reqPath);
    if (actualShortcode !== "missing") {
      return { actualShortcode, matchedFile: filePath };
    }
  }

  const possibleFiles = possibleFilesForRequirement(slug, reqPath);
  const directFile = directFileForRequirement(slug, reqPath);

  for (const filePath of possibleFiles) {
    const content = fileCache.get(filePath);
    if (content === undefined) {
      continue;
    }

    if (filePath === directFile) {
      return { actualShortcode: "missing", matchedFile: filePath };
    }

    if (fileLikelyContainsRequirementSection(content, reqPath)) {
      return { actualShortcode: "requirement", matchedFile: filePath };
    }
  }

  for (const [filePath, content] of fileCache) {
    if (fileLikelyContainsRequirementSection(content, reqPath)) {
      return { actualShortcode: "requirement", matchedFile: filePath };
    }
  }

  return {
    actualShortcode: "missing",
    matchedFile: possibleFiles[0] ?? directFile,
  };
}

function requirementHasDisplaySlot(
  slug: string,
  reqPath: string,
  fileCache: Map<string, string>,
): boolean {
  const directFile = directFileForRequirement(slug, reqPath);
  if (fileCache.has(directFile)) {
    return true;
  }

  for (const [filePath, content] of fileCache) {
    if (
      filePath !== directFile &&
      fileLikelyContainsRequirementSection(content, reqPath)
    ) {
      return true;
    }
  }

  return false;
}

function shouldAuditRequirementUsage(
  slug: string,
  reqPath: string,
  actualShortcode: ShortcodeKind | "missing",
  fileCache: Map<string, string>,
): boolean {
  if (actualShortcode !== "missing") {
    return true;
  }

  return requirementHasDisplaySlot(slug, reqPath, fileCache);
}

function formatReqText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function extractRequirementMappings(
  requirement: Requirement,
  parentPath?: string,
  parentText?: string,
): RequirementMapping[] {
  const mappings: RequirementMapping[] = [];
  const currentPath = parentPath
    ? `${parentPath}.${requirement.req_id}`
    : requirement.path;

  if (
    parentPath !== undefined &&
    !shouldSkipRequirementUsageCheck(requirement, currentPath)
  ) {
    mappings.push({
      reqPath: currentPath,
      reqText: requirement.text,
      expectedShortcode: expectedShortcodeForRequirement(
        requirement.text,
        parentText,
      ),
    });
  }

  if (requirement.subrequirements !== undefined) {
    for (const subrequirement of requirement.subrequirements) {
      mappings.push(
        ...extractRequirementMappings(
          subrequirement,
          currentPath,
          requirement.text,
        ),
      );
    }
  }

  return mappings;
}

async function discoverBadgeSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  const glob = new Glob("hugo/content/merit-badges/*/guide/_index.md");

  for await (const filePath of glob.scan(".")) {
    const match = filePath.match(
      /hugo\/content\/merit-badges\/([^/]+)\/guide\/_index\.md$/,
    );
    const slug = match?.[1];
    if (slug !== undefined) {
      slugs.push(slug);
    }
  }

  return slugs.sort();
}

async function main(): Promise<void> {
  const badgeSlugsEnv = process.env["BADGE_SLUGS"];
  const badgeSlugs =
    badgeSlugsEnv !== undefined && badgeSlugsEnv.trim() !== ""
      ? badgeSlugsEnv
          .split(",")
          .map(slug => slug.trim())
          .filter(Boolean)
      : await discoverBadgeSlugs();

  console.log(
    `Checking ${badgeSlugs.length} badge(s): ${badgeSlugs.join(", ")}`,
  );
  console.log();

  const mismatches: RequirementUsage[] = [];
  let totalChecks = 0;

  for (const slug of badgeSlugs) {
    const badgePath = `hugo/data/merit-badges/${slug}.json`;
    const badgeData = (await Bun.file(badgePath).json()) as BadgeData;
    const mappings = badgeData.requirements.flatMap(requirement =>
      extractRequirementMappings(requirement),
    );

    const fileCache = new Map<string, string>();
    const guideGlob = new Glob(
      `hugo/content/merit-badges/${slug}/guide/**/*.md`,
    );
    for await (const filePath of guideGlob.scan(".")) {
      fileCache.set(filePath, await Bun.file(filePath).text());
    }

    let badgeMismatchCount = 0;

    for (const mapping of mappings) {
      totalChecks += 1;
      const { actualShortcode, matchedFile } = findActualUsage(
        slug,
        mapping.reqPath,
        fileCache,
      );

      if (
        !shouldAuditRequirementUsage(
          slug,
          mapping.reqPath,
          actualShortcode,
          fileCache,
        )
      ) {
        continue;
      }

      if (
        !shortcodeUsageMatchesExpectation(
          mapping.expectedShortcode,
          actualShortcode,
        )
      ) {
        badgeMismatchCount += 1;
        mismatches.push({
          badge: slug,
          reqPath: mapping.reqPath,
          reqText: formatReqText(mapping.reqText),
          expectedShortcode: mapping.expectedShortcode,
          actualShortcode,
          filePath: matchedFile,
        });
      }
    }

    if (badgeMismatchCount === 0) {
      console.log(
        `  ✅ ${slug}: all ${mappings.length} child requirements use expected shortcode types`,
      );
    } else {
      console.log(`  ❌ ${slug}: ${badgeMismatchCount} shortcode mismatch(es)`);
    }
  }

  console.log();
  console.log(
    "================================================================================",
  );
  console.log("RESULTS");
  console.log(
    "================================================================================",
  );

  if (mismatches.length === 0) {
    console.log("No shortcode mismatches found.");
  } else {
    for (const mismatch of mismatches) {
      console.log(`- ${mismatch.badge} ${mismatch.reqPath}`);
      console.log(`  file: ${mismatch.filePath}`);
      console.log(
        `  expected: ${formatExpectedShortcode(mismatch.expectedShortcode)}`,
      );
      console.log(`  actual: ${mismatch.actualShortcode}`);
      console.log(`  text: ${mismatch.reqText}`);
      console.log();
    }
  }

  console.log(
    "================================================================================",
  );
  console.log("SUMMARY");
  console.log(
    "================================================================================",
  );
  console.log(`  Total child requirements checked: ${totalChecks}`);
  console.log(`  Mismatches found:                 ${mismatches.length}`);

  if (mismatches.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
