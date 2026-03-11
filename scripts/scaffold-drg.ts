import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

type Resource = {
  title: string;
  url: string;
};

type SubrequirementMode = {
  type: "all" | "select" | string;
  count?: number;
};

type Requirement = {
  req_id: string;
  path: string;
  text: string;
  is_option?: boolean;
  resources?: Resource[];
  subrequirements?: Requirement[];
  subrequirement_mode?: SubrequirementMode;
};

type BadgeData = {
  title: string;
  slug: string;
  requirements: Requirement[];
};

type RequirementPage = {
  kind: "requirement";
  fileName: string;
  pageSlug: string;
  title: string;
  groupTitle: string;
  reqNumber: string;
  isSub: boolean;
  body: string;
};

type SpecialPage = {
  kind: "index" | "extended-learning";
  fileName: string;
  pageSlug: string;
  title: string;
  groupTitle: string;
  body: string;
};

type GuidePage = RequirementPage | SpecialPage;

type GuideNavItem = {
  title: string;
  url: string;
  isSub: boolean;
};

type SelectOverviewTarget = {
  pageSlug: string;
  reqNumber: string;
  title: string;
};

type GuideNavGroup = {
  groupTitle: string;
  items: GuideNavItem[];
};

const BADGE_SLUG = process.env["BADGE_SLUG"];

if (BADGE_SLUG === undefined || BADGE_SLUG === "") {
  throw new Error("BADGE_SLUG is required");
}

const badgeDataPath = join(
  process.cwd(),
  "hugo",
  "data",
  "merit-badges",
  `${BADGE_SLUG}.json`,
);
const guideDirectory = join(
  process.cwd(),
  "hugo",
  "content",
  "merit-badges",
  BADGE_SLUG,
  "guide",
);

const badgeData = await loadBadgeData({ badgeDataPath });
const requirementPages = buildRequirementPages({ badgeData });
const guidePages: GuidePage[] = [
  buildIndexPage({
    badgeData,
    requirementPages,
  }),
  ...requirementPages,
  buildExtendedLearningPage(),
];

await mkdir(guideDirectory, { recursive: true });

let createdFileCount = 0;
let skippedFileCount = 0;

for (const guidePage of guidePages) {
  const pagePath = join(guideDirectory, guidePage.fileName);
  const pageContent = renderPage({ guidePage, guidePages, badgeData });
  const fileExists = await pathExists({ path: pagePath });

  if (fileExists) {
    skippedFileCount += 1;
    console.log(`Skipping existing file: ${pagePath}`);
    continue;
  }

  await writeFile(pagePath, pageContent);
  createdFileCount += 1;
  console.log(`Created ${pagePath}`);
}

console.log(
  `Scaffold complete for ${badgeData.slug}: created ${createdFileCount} file(s), skipped ${skippedFileCount} existing file(s).`,
);

async function loadBadgeData({
  badgeDataPath,
}: {
  badgeDataPath: string;
}): Promise<BadgeData> {
  const badgeDataContent = await readFile(badgeDataPath, "utf8");
  return JSON.parse(badgeDataContent) as BadgeData;
}

function buildRequirementPages({
  badgeData,
}: {
  badgeData: BadgeData;
}): RequirementPage[] {
  const pages: RequirementPage[] = [];

  for (const topLevelRequirement of badgeData.requirements) {
    const groupTitle = `[GROUP: Requirement ${topLevelRequirement.req_id}]`;
    collectRequirementPages({
      requirement: topLevelRequirement,
      groupTitle,
      pages,
    });
  }

  return pages;
}

function collectRequirementPages({
  requirement,
  groupTitle,
  pages,
}: {
  requirement: Requirement;
  groupTitle: string;
  pages: RequirementPage[];
}): void {
  const hasSubrequirements =
    requirement.subrequirements !== undefined &&
    requirement.subrequirements.length > 0;

  if (!hasSubrequirements) {
    pages.push(createLeafPage({ requirement, groupTitle }));
    return;
  }

  if (requirement.subrequirement_mode?.type === "select") {
    pages.push(createSelectOverviewPage({ requirement, groupTitle }));

    const subrequirements = requirement.subrequirements ?? [];
    for (const subrequirement of subrequirements) {
      collectRequirementPages({
        requirement: subrequirement,
        groupTitle,
        pages,
      });
    }

    return;
  }

  if (requirement.is_option === true) {
    pages.push(createLeafPage({ requirement, groupTitle }));
    return;
  }

  const subrequirements = requirement.subrequirements ?? [];
  for (const subrequirement of subrequirements) {
    collectRequirementPages({
      requirement: subrequirement,
      groupTitle,
      pages,
    });
  }
}

function createLeafPage({
  requirement,
  groupTitle,
}: {
  requirement: Requirement;
  groupTitle: string;
}): RequirementPage {
  const pageSlug = requirementPathToPageSlug({ path: requirement.path });
  return {
    kind: "requirement",
    fileName: `${pageSlug}.md`,
    pageSlug,
    title: `Req ${compactRequirementPath({ path: requirement.path })} — [TITLE]`,
    groupTitle,
    reqNumber: compactRequirementPath({ path: requirement.path }),
    isSub: isRequirementSubPage({ path: requirement.path }),
    body: buildRequirementPageBody({ requirement }),
  };
}

function createSelectOverviewPage({
  requirement,
  groupTitle,
}: {
  requirement: Requirement;
  groupTitle: string;
}): RequirementPage {
  const pageSlug = requirementPathToPageSlug({ path: requirement.path });
  return {
    kind: "requirement",
    fileName: `${pageSlug}.md`,
    pageSlug,
    title: `Req ${compactRequirementPath({ path: requirement.path })} — [TITLE]`,
    groupTitle,
    reqNumber: compactRequirementPath({ path: requirement.path }),
    isSub: false,
    body: buildSelectOverviewPageBody({ requirement }),
  };
}

function buildIndexPage({
  badgeData,
  requirementPages,
}: {
  badgeData: BadgeData;
  requirementPages: RequirementPage[];
}): SpecialPage {
  const firstRequirementPage = requirementPages[0];

  return {
    kind: "index",
    fileName: "_index.md",
    pageSlug: "",
    title: "Introduction & Overview",
    groupTitle: "Getting Started",
    body: [
      "## Overview",
      "",
      "[PLACEHOLDER: Write a 2–4 sentence overview of this merit badge topic and why a Scout should care.]",
      "",
      "## Then and Now",
      "",
      "### Then",
      "",
      "[PLACEHOLDER: Add the historical background or origins for this subject.]",
      "",
      "### Now",
      "",
      "[PLACEHOLDER: Explain the modern version of the subject and why it matters today.]",
      "",
      "## Get Ready!",
      "",
      "[PLACEHOLDER: Add a short motivational callout that prepares the Scout to begin.]",
      "",
      `## Kinds of ${badgeData.title}`,
      "",
      "[PLACEHOLDER: Add key categories, types, or domains within this subject.]",
      "",
      "## Next Steps",
      "",
      "[PLACEHOLDER: Add a short bridge to the first requirement.]",
      "",
      firstRequirementPage === undefined
        ? "[PLACEHOLDER: Add a drg/next-page shortcode once requirement pages exist.]"
        : [
            "{{< drg/next-page",
            '    text="[PLACEHOLDER: Intro transition text]"',
            '    teaser="[PLACEHOLDER: What the Scout will learn next]"',
            `    url="${pageUrl({ slug: badgeData.slug, pageSlug: firstRequirementPage.pageSlug })}" >}}`,
          ].join("\n"),
    ].join("\n"),
  };
}

function buildExtendedLearningPage(): SpecialPage {
  return {
    kind: "extended-learning",
    fileName: "extended-learning.md",
    pageSlug: "extended-learning",
    title: "Extended Learning",
    groupTitle: "Beyond the Badge",
    body: [
      "## Congratulations!",
      "",
      "[PLACEHOLDER: Congratulate the Scout and explain how this badge connects to lifelong learning.]",
      "",
      "## Dig Deeper",
      "",
      "[PLACEHOLDER: Add broader context, advanced concepts, or real-world applications beyond the badge requirements.]",
      "",
      "## Try This Next",
      "",
      "[PLACEHOLDER: Suggest concrete next experiences, projects, visits, or practice opportunities.]",
      "",
      "## Organizations and Resources",
      "",
      "[PLACEHOLDER: Add high-quality organizations, programs, or references for continued exploration.]",
    ].join("\n"),
  };
}

function buildRequirementPageBody({
  requirement,
}: {
  requirement: Requirement;
}): string {
  const requirementBlock = buildRequirementShortcodeBlock({ requirement });

  return [
    requirementBlock,
    "",
    "[PLACEHOLDER: Write the instructional body for this requirement.]",
    "",
    buildResourceBlock({ requirement }),
    "",
    "[PLACEHOLDER: Add any helpful examples, steps, comparisons, preparation advice, or counselor-facing context that fits this requirement.]",
  ].join("\n");
}

function buildSelectOverviewPageBody({
  requirement,
}: {
  requirement: Requirement;
}): string {
  const requirementBlock = buildRequirementShortcodeBlock({ requirement });
  const selectionCount = requirement.subrequirement_mode?.count;
  const selectionGuidance = buildSelectionGuidance({ selectionCount });
  const overviewTargets = buildSelectOverviewTargets({ requirement });
  const optionSummaries = overviewTargets
    .map(overviewTarget => {
      const url = pageUrl({
        slug: BADGE_SLUG,
        pageSlug: overviewTarget.pageSlug,
      });
      return `- **[${overviewTarget.title}](${url})**: [PLACEHOLDER: Summarize what the Scout will do and gain in this option.]`;
    })
    .join("\n");

  return [
    requirementBlock,
    "",
    selectionGuidance,
    "",
    "## Your Options",
    "",
    optionSummaries === ""
      ? "[PLACEHOLDER: List the available options and summarize what the Scout will do in each one.]"
      : optionSummaries,
    "",
    "[PLACEHOLDER: Add comparison notes, decision help, or transition guidance in whatever structure best fits these options.]",
    "",
    buildResourceBlock({ requirement }),
    "",
    buildNextPageShortcode({
      targetPageSlug: overviewTargets[0]?.pageSlug,
      text: "[PLACEHOLDER: Transition text]",
      teaser: "[PLACEHOLDER: Preview the first option page]",
    }),
  ].join("\n");
}

function buildSelectOverviewTargets({
  requirement,
}: {
  requirement: Requirement;
}): SelectOverviewTarget[] {
  const subrequirements = requirement.subrequirements ?? [];

  return subrequirements.map(subrequirement => ({
    pageSlug: requirementPathToPageSlug({ path: subrequirement.path }),
    reqNumber: compactRequirementPath({ path: subrequirement.path }),
    title: `Req ${compactRequirementPath({ path: subrequirement.path })} — [TITLE]`,
  }));
}

function buildRequirementShortcodeBlock({
  requirement,
}: {
  requirement: Requirement;
}): string {
  const requirementNumber = requirementPathToDisplayNumber({
    path: requirement.path,
    isOption: requirement.is_option === true,
  });
  const optionLabel =
    requirement.is_option === true
      ? extractOptionLabel({ text: requirement.text })
      : undefined;
  const openingLine =
    optionLabel === undefined
      ? `{{< drg/requirement number="${requirementNumber}" >}}`
      : `{{< drg/requirement number="${requirementNumber}" option="${optionLabel}" >}}`;

  return [openingLine, requirement.text, "{{< /drg/requirement >}}"].join("\n");
}

function buildResourceBlock({
  requirement,
}: {
  requirement: Requirement;
}): string {
  const resourceStubSection = buildResourceStubSection({ requirement });
  return ["## Official Resources", "", resourceStubSection].join("\n");
}

function buildResourceStubSection({
  requirement,
}: {
  requirement: Requirement;
}): string {
  const resourceBlocks: string[] = [];

  const ownResources = requirement.resources ?? [];
  for (const resource of ownResources) {
    resourceBlocks.push(buildResourceShortcode({ resource }));
  }

  if ((requirement.subrequirements?.length ?? 0) > 0) {
    resourceBlocks.push(
      "[PLACEHOLDER: Add any additional official resources from child requirements in the appropriate sections below.]",
    );
  }

  if (resourceBlocks.length === 0) {
    return "[PLACEHOLDER: Add official resources here if any are provided in data.json.]";
  }

  return resourceBlocks.join("\n\n");
}

function buildResourceShortcode({ resource }: { resource: Resource }): string {
  if (isYouTubeUrl({ url: resource.url })) {
    return [
      "{{< drg/video",
      `    title="${escapeAttribute({ value: resource.title })}"`,
      `    url="${escapeAttribute({ value: resource.url })}" >}}`,
    ].join("\n");
  }

  return [
    "{{< drg/external-link",
    `    title="${escapeAttribute({ value: resource.title })}"`,
    `    url="${escapeAttribute({ value: resource.url })}"`,
    '    description="[PLACEHOLDER: Add a one-sentence description of why this official resource is useful.]" >}}',
  ].join("\n");
}

function buildNextPageShortcode({
  targetPageSlug,
  text,
  teaser,
}: {
  targetPageSlug: string | undefined;
  text: string;
  teaser: string;
}): string {
  if (targetPageSlug === undefined) {
    return "[PLACEHOLDER: Add a drg/next-page shortcode once the next page is known.]";
  }

  return [
    "{{< drg/next-page",
    `    text="${escapeAttribute({ value: text })}"`,
    `    teaser="${escapeAttribute({ value: teaser })}"`,
    `    url="${pageUrl({ slug: BADGE_SLUG, pageSlug: targetPageSlug })}" >}}`,
  ].join("\n");
}

function buildSelectionGuidance({
  selectionCount,
}: {
  selectionCount: number | undefined;
}): string {
  if (selectionCount === undefined || selectionCount === 1) {
    return "You must choose exactly one option from this requirement.";
  }

  return `You must choose exactly ${selectionCount} options from this requirement.`;
}

function requirementPathToDisplayNumber({
  path,
  isOption,
}: {
  path: string;
  isOption: boolean;
}): string {
  if (!isOption) {
    return compactRequirementPath({ path });
  }

  const pathParts = path.split(".");
  const topLevelPart = pathParts[0];
  if (topLevelPart === undefined) {
    throw new Error(`Invalid requirement path: ${path}`);
  }

  return topLevelPart;
}

function extractOptionLabel({ text }: { text: string }): string {
  const optionMatch = /^(.*?Option)\.?/u.exec(text);
  if (optionMatch?.[1] !== undefined) {
    return optionMatch[1]
      .replaceAll(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/gu, "")
      .trim();
  }

  return text;
}

function requirementPathToPageSlug({ path }: { path: string }): string {
  const pathParts = path.split(".");

  if (pathParts.length === 1) {
    const topLevelPart = pathParts[0];
    if (topLevelPart === undefined) {
      throw new Error(`Invalid requirement path: ${path}`);
    }
    return `req${topLevelPart}`;
  }

  if (pathParts.length === 2) {
    const parentPart = pathParts[0];
    const childPart = pathParts[1];

    if (parentPart === undefined || childPart === undefined) {
      throw new Error(`Invalid requirement path: ${path}`);
    }

    const isNamedOption = /[a-z].*-/u.test(childPart) || childPart.length > 1;
    if (isNamedOption) {
      return `req${parentPart}-${childPart}`;
    }

    return `req${parentPart}${childPart}`;
  }

  if (pathParts.length === 3) {
    const parentPart = pathParts[0];
    const optionPart = pathParts[1];

    if (parentPart === undefined || optionPart === undefined) {
      throw new Error(`Invalid requirement path: ${path}`);
    }

    return `req${parentPart}-${optionPart}`;
  }

  const compactPath = pathParts.join("");
  return `req${compactPath}`;
}

function compactRequirementPath({ path }: { path: string }): string {
  return path.replaceAll(".", "");
}

function isRequirementSubPage({ path }: { path: string }): boolean {
  return path.includes(".");
}

function buildGuideNav({
  guidePages,
  badgeData,
}: {
  guidePages: GuidePage[];
  badgeData: BadgeData;
}): GuideNavGroup[] {
  const groups = new Map<string, GuideNavGroup>();

  for (const guidePage of guidePages) {
    const existingGroup = groups.get(guidePage.groupTitle);
    const guideNavItem: GuideNavItem = {
      title: guidePage.title,
      url: pageUrl({ slug: badgeData.slug, pageSlug: guidePage.pageSlug }),
      isSub: guidePage.kind === "requirement" ? guidePage.isSub : false,
    };

    if (existingGroup === undefined) {
      groups.set(guidePage.groupTitle, {
        groupTitle: guidePage.groupTitle,
        items: [guideNavItem],
      });
      continue;
    }

    existingGroup.items.push(guideNavItem);
  }

  return [...groups.values()];
}

function renderPage({
  guidePage,
  guidePages,
  badgeData,
}: {
  guidePage: GuidePage;
  guidePages: GuidePage[];
  badgeData: BadgeData;
}): string {
  const pageIndex = guidePages.findIndex(
    candidatePage => candidatePage.fileName === guidePage.fileName,
  );
  const previousPage = pageIndex > 0 ? guidePages[pageIndex - 1] : undefined;
  const nextPage = pageIndex >= 0 ? guidePages[pageIndex + 1] : undefined;
  const frontMatterLines = [
    "---",
    `title: \"${guidePage.title}\"`,
    "layout: guide",
  ];

  if (guidePage.kind === "index") {
    frontMatterLines.push(`badge_name: \"${badgeData.title}\"`);
  }

  frontMatterLines.push(`group_title: \"${guidePage.groupTitle}\"`);

  if (guidePage.kind === "requirement") {
    frontMatterLines.push(`req_number: \"${guidePage.reqNumber}\"`);
  }

  if (previousPage !== undefined) {
    frontMatterLines.push(
      `prev: \"${pageUrl({ slug: badgeData.slug, pageSlug: previousPage.pageSlug })}\"`,
    );
    frontMatterLines.push(`prev_title: \"${previousPage.title}\"`);
  }

  if (nextPage !== undefined) {
    frontMatterLines.push(
      `next: \"${pageUrl({ slug: badgeData.slug, pageSlug: nextPage.pageSlug })}\"`,
    );
    frontMatterLines.push(`next_title: \"${nextPage.title}\"`);
  }

  if (guidePage.kind === "index") {
    const guideNav = buildGuideNav({ guidePages, badgeData });
    frontMatterLines.push("guide_nav:");
    for (const guideNavGroup of guideNav) {
      frontMatterLines.push(`  - group_title: \"${guideNavGroup.groupTitle}\"`);
      frontMatterLines.push("    items:");
      for (const guideNavItem of guideNavGroup.items) {
        frontMatterLines.push(`      - title: \"${guideNavItem.title}\"`);
        frontMatterLines.push(`        url: \"${guideNavItem.url}\"`);
        frontMatterLines.push(
          `        is_sub: ${guideNavItem.isSub ? "true" : "false"}`,
        );
      }
    }
  }

  frontMatterLines.push("---", "", guidePage.body, "");
  return frontMatterLines.join("\n");
}

function pageUrl({
  slug,
  pageSlug,
}: {
  slug: string;
  pageSlug: string;
}): string {
  if (pageSlug === "") {
    return `/merit-badges/${slug}/guide/`;
  }

  return `/merit-badges/${slug}/guide/${pageSlug}/`;
}

function isYouTubeUrl({ url }: { url: string }): boolean {
  try {
    const parsedUrl = new URL(url);
    return ["youtube.com", "www.youtube.com", "youtu.be"].includes(
      parsedUrl.hostname,
    );
  } catch {
    return false;
  }
}

function escapeAttribute({ value }: { value: string }): string {
  return value.replaceAll('"', '\\"');
}

async function pathExists({ path }: { path: string }): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
