import { join } from "node:path";
import { $ } from "bun";

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
  reqPath: string;
  isSub: boolean;
  body: string;
};

type SpecialPage = {
  kind: "index" | "extended-learning" | "print";
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

type OverviewTarget = {
  pageSlug: string;
  reqNumber: string;
  title: string;
};

type OverviewPageKind = "select" | "option" | "intermediate";

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

void scaffoldDrg();

async function scaffoldDrg(): Promise<void> {
  const badgeData = await loadBadgeData({ badgeDataPath });
  const requirementPages = buildRequirementPages({ badgeData });
  const guidePages: GuidePage[] = [
    buildIndexPage({
      badgeData,
      requirementPages,
    }),
    ...requirementPages,
    buildExtendedLearningPage(),
    buildPrintPage(),
  ];

  await $`mkdir -p ${guideDirectory}`;

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

    await Bun.write(pagePath, pageContent);
    createdFileCount += 1;
    console.log(`Created ${pagePath}`);
  }

  console.log(
    `Scaffold complete for ${badgeData.slug}: created ${createdFileCount} file(s), skipped ${skippedFileCount} existing file(s).`,
  );
}

async function loadBadgeData({
  badgeDataPath,
}: {
  badgeDataPath: string;
}): Promise<BadgeData> {
  const badgeDataContent = await Bun.file(badgeDataPath).text();
  return JSON.parse(badgeDataContent) as BadgeData;
}

function buildRequirementPages({
  badgeData,
}: {
  badgeData: BadgeData;
}): RequirementPage[] {
  const pages: RequirementPage[] = [];

  for (const topLevelRequirement of badgeData.requirements) {
    collectRequirementPages({
      requirement: topLevelRequirement,
      pages,
    });
  }

  return pages;
}

function collectRequirementPages({
  requirement,
  pages,
}: {
  requirement: Requirement;
  pages: RequirementPage[];
}): void {
  const hasSubrequirements =
    requirement.subrequirements !== undefined &&
    requirement.subrequirements.length > 0;
  const groupTitle = groupTitleForRequirement({ requirement });

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
        pages,
      });
    }

    return;
  }

  if (requirement.is_option === true) {
    pages.push(createOptionOverviewPage({ requirement, groupTitle }));

    const subrequirements = requirement.subrequirements ?? [];
    for (const subrequirement of subrequirements) {
      collectRequirementPages({
        requirement: subrequirement,
        pages,
      });
    }

    return;
  }

  if (shouldGroupChildLeavesIntoParentPage({ requirement })) {
    pages.push(createGroupedLeafPage({ requirement, groupTitle }));
    return;
  }

  if (shouldCreateIntermediateOverviewPage({ requirement })) {
    pages.push(createIntermediateOverviewPage({ requirement, groupTitle }));
  }

  const subrequirements = requirement.subrequirements ?? [];
  for (const subrequirement of subrequirements) {
    collectRequirementPages({
      requirement: subrequirement,
      pages,
    });
  }
}

function shouldGroupChildLeavesIntoParentPage({
  requirement,
}: {
  requirement: Requirement;
}): boolean {
  const subrequirements = requirement.subrequirements ?? [];
  if (subrequirements.length === 0) {
    return false;
  }

  return subrequirements.every(
    subrequirement => (subrequirement.subrequirements?.length ?? 0) === 0,
  );
}

function createGroupedLeafPage({
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
    title: requirementTitle({ path: requirement.path }),
    groupTitle,
    reqNumber: compactRequirementNumber({ path: requirement.path }),
    reqPath: requirement.path,
    isSub: isRequirementSubPage({ path: requirement.path }),
    body: buildGroupedLeafPageBody({ requirement }),
  };
}

function buildGroupedLeafPageBody({
  requirement,
}: {
  requirement: Requirement;
}): string {
  const requirementBlock = buildRequirementShortcodeBlock({ requirement });
  const subrequirements = requirement.subrequirements ?? [];
  const subrequirementSections = subrequirements.map(subrequirement =>
    buildGroupedSubrequirementSection({ subrequirement }),
  );

  return [
    requirementBlock,
    "",
    "[PLACEHOLDER: Add a brief intro that explains how these child requirements fit together and what the Scout should focus on first.]",
    "",
    ...subrequirementSections.flatMap(section => [section, ""]),
    buildResourceBlock({ requirement }),
    "",
    "[PLACEHOLDER: Add any helpful examples, steps, comparisons, preparation advice, or counselor-facing context that ties these child requirements together.]",
  ].join("\n");
}

function buildGroupedSubrequirementSection({
  subrequirement,
}: {
  subrequirement: Requirement;
}): string {
  const requirementBlock = buildRequirementDisplayShortcodeBlock({
    requirement: subrequirement,
  });

  return [
    `## Requirement ${compactRequirementNumber({ path: subrequirement.path })}`,
    "",
    requirementBlock,
    "",
    "[PLACEHOLDER: Write the instructional body for this subrequirement.]",
    "",
    buildResourceBlock({ requirement: subrequirement }),
    "",
    "[PLACEHOLDER: Add examples, steps, or practical guidance specific to this subrequirement.]",
  ].join("\n");
}

function buildLeafLikePage({
  requirement,
  groupTitle,
  body,
}: {
  requirement: Requirement;
  groupTitle: string;
  body: string;
}): RequirementPage {
  const pageSlug = requirementPathToPageSlug({ path: requirement.path });
  return {
    kind: "requirement",
    fileName: `${pageSlug}.md`,
    pageSlug,
    title: requirementTitle({ path: requirement.path }),
    groupTitle,
    reqNumber: compactRequirementNumber({ path: requirement.path }),
    reqPath: requirement.path,
    isSub: isRequirementSubPage({ path: requirement.path }),
    body,
  };
}

function createLeafPage({
  requirement,
  groupTitle,
}: {
  requirement: Requirement;
  groupTitle: string;
}): RequirementPage {
  return buildLeafLikePage({
    requirement,
    groupTitle,
    body: buildRequirementPageBody({ requirement }),
  });
}

function createIntermediateOverviewPage({
  requirement,
  groupTitle,
}: {
  requirement: Requirement;
  groupTitle: string;
}): RequirementPage {
  return createOverviewPage({
    requirement,
    groupTitle,
    kind: "intermediate",
    isSub: true,
  });
}

function createSelectOverviewPage({
  requirement,
  groupTitle,
}: {
  requirement: Requirement;
  groupTitle: string;
}): RequirementPage {
  return createOverviewPage({
    requirement,
    groupTitle,
    kind: "select",
    isSub: false,
  });
}

function shouldCreateIntermediateOverviewPage({
  requirement,
}: {
  requirement: Requirement;
}): boolean {
  const hasSubrequirements = (requirement.subrequirements?.length ?? 0) > 0;
  if (!hasSubrequirements) {
    return false;
  }

  return requirement.path.split(".").length >= 3;
}

function groupTitleForRequirement({ requirement }: { requirement: Requirement }): string {
  const pathParts = requirement.path.split(".");
  const topLevelPart = pathParts[0];
  const secondPart = pathParts[1];

  if (topLevelPart === undefined) {
    throw new Error(`Invalid requirement path: ${requirement.path}`);
  }

  if (requirement.is_option === true || pathParts.length === 1) {
    return `[GROUP: Requirement ${compactRequirementPath({ path: requirement.path })}]`;
  }

  if (secondPart !== undefined && isCompactPathSegment({ value: secondPart })) {
    return `[GROUP: Requirement ${topLevelPart}${secondPart}]`;
  }

  return `[GROUP: Requirement ${topLevelPart}]`;
}

function isCompactPathSegment({ value }: { value: string }): boolean {
  return /^[a-z0-9]$/.test(value);
}

function compactRequirementNumber({ path }: { path: string }): string {
  return compactRequirementPath({ path });
}

function requirementTitle({ path }: { path: string }): string {
  return `Req ${compactRequirementNumber({ path })} — [TITLE]`;
}

function buildOverviewTargets({
  requirement,
}: {
  requirement: Requirement;
}): OverviewTarget[] {
  const subrequirements = requirement.subrequirements ?? [];

  return subrequirements.map(subrequirement => ({
    pageSlug: requirementPathToPageSlug({ path: subrequirement.path }),
    reqNumber: compactRequirementNumber({ path: subrequirement.path }),
    title: requirementTitle({ path: subrequirement.path }),
  }));
}

function buildOverviewPageBody({
  requirement,
  kind,
}: {
  requirement: Requirement;
  kind: OverviewPageKind;
}): string {
  const requirementBlock = buildRequirementShortcodeBlock({ requirement });
  const overviewTargets = buildOverviewTargets({ requirement });
  const sectionTitle = kind === "select" ? "Your Options" : "What You'll Complete";
  const intro =
    kind === "select"
      ? buildSelectionGuidance({
          selectionCount: requirement.subrequirement_mode?.count,
        })
      : "Work through each child requirement below in order. Use this page as your roadmap before you open the first detailed child page.";
  const targetSummaries = overviewTargets
    .map(overviewTarget => {
      const url = pageUrl({
        slug: badgeSlug(),
        pageSlug: overviewTarget.pageSlug,
      });
      return `- **[${overviewTarget.title}](${url})**: [PLACEHOLDER: Summarize what the Scout will do and gain on this child page.]`;
    })
    .join("\n");
  const placeholder =
    kind === "select"
      ? "[PLACEHOLDER: Add comparison notes, decision help, or transition guidance in whatever structure best fits these options.]"
      : "[PLACEHOLDER: Add orienting context, sequencing advice, or quick preparation notes for this branch.]";

  return [
    requirementBlock,
    "",
    intro,
    "",
    `## ${sectionTitle}`,
    "",
    targetSummaries === ""
      ? "[PLACEHOLDER: List the child pages and summarize what the Scout will do in each one.]"
      : targetSummaries,
    "",
    placeholder,
    "",
    buildResourceBlock({ requirement }),
    "",
    buildNextPageShortcode({
      targetPageSlug: overviewTargets[0]?.pageSlug,
      text: "[PLACEHOLDER: Transition text]",
      teaser:
        kind === "select"
          ? "[PLACEHOLDER: Preview the first option page]"
          : "[PLACEHOLDER: Preview the first child requirement page]",
    }),
  ].join("\n");
}

function createOverviewPage({
  requirement,
  groupTitle,
  kind,
  isSub,
}: {
  requirement: Requirement;
  groupTitle: string;
  kind: OverviewPageKind;
  isSub: boolean;
}): RequirementPage {
  const pageSlug = requirementPathToPageSlug({ path: requirement.path });
  return {
    kind: "requirement",
    fileName: `${pageSlug}.md`,
    pageSlug,
    title: requirementTitle({ path: requirement.path }),
    groupTitle,
    reqNumber: compactRequirementNumber({ path: requirement.path }),
    reqPath: requirement.path,
    isSub,
    body: buildOverviewPageBody({ requirement, kind }),
  };
}

function createOptionOverviewPage({
  requirement,
  groupTitle,
}: {
  requirement: Requirement;
  groupTitle: string;
}): RequirementPage {
  return createOverviewPage({
    requirement,
    groupTitle,
    kind: "option",
    isSub: false,
  });
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

function buildPrintPage(): SpecialPage {
  return {
    kind: "print",
    fileName: join("print", "index.md"),
    pageSlug: "print",
    title: "Complete Digital Resource Guide",
    groupTitle: "Printable Guide",
    body: "",
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

function buildRequirementDisplayShortcodeBlock({
  requirement,
}: {
  requirement: Requirement;
}): string {
  if (shouldUseInheritedRequirementDisplay({ text: requirement.text })) {
    return buildInheritedRequirementShortcodeBlock({ requirement });
  }

  return buildRequirementShortcodeBlock({ requirement });
}

function buildInheritedRequirementShortcodeBlock({
  requirement,
}: {
  requirement: Requirement;
}): string {
  const requirementNumber = compactRequirementNumber({ path: requirement.path });
  return `{{< drg/inherited-requirement number="${requirementNumber}" req_path="${requirement.path}" topic="${escapeAttribute({ value: requirement.text })}" />}}`;
}

function shouldUseInheritedRequirementDisplay({
  text,
}: {
  text: string;
}): boolean {
  const trimmedText = text.trim();

  if (trimmedText === "") {
    return false;
  }

  const startsWithOwnAction = /^(?i:(explain|describe|identify|name|list|tell|discuss|show|demonstrate|construct|prepare|research|record|compare|create|define|use|conduct|revisit|complete|visit|interview|pick))\b/.test(
    trimmedText,
  );
  if (startsWithOwnAction) {
    return false;
  }

  const startsWithLeadIn = /^(?i:(with|after|before|using|by))\b/.test(
    trimmedText,
  );
  if (startsWithLeadIn) {
    return false;
  }

  return true;
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
    `    url="${pageUrl({ slug: badgeSlug(), pageSlug: targetPageSlug })}" >}}`,
  ].join("\n");
}

function badgeSlug(): string {
  if (BADGE_SLUG === undefined || BADGE_SLUG === "") {
    throw new Error("BADGE_SLUG is required");
  }

  return BADGE_SLUG;
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
  const trimmedText = text.trim();
  const namedOptionMatch = /^Option\s+[A-Z0-9]+\s*[—-]\s*([^.:]+?)(?:[.:]|$)/.exec(
    trimmedText,
  );

  if (namedOptionMatch?.[1] !== undefined) {
    return namedOptionMatch[1].trim();
  }

  const optionMatch = /^(.*?Option)\.?/.exec(trimmedText);
  if (optionMatch?.[1] !== undefined) {
    return optionMatch[1]
      .replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "")
      .trim();
  }

  return trimmedText;
}

function requirementPathToPageSlug({ path }: { path: string }): string {
  const pathParts = path.split(".");
  const topLevelPart = pathParts[0];

  if (topLevelPart === undefined) {
    throw new Error(`Invalid requirement path: ${path}`);
  }

  let pageSlug = `req${topLevelPart}`;

  for (const pathPart of pathParts.slice(1)) {
    if (isCompactPathSegment({ value: pathPart })) {
      pageSlug += pathPart;
      continue;
    }

    pageSlug += `-${pathPart}`;
  }

  return pageSlug;
}

function compactRequirementPath({ path }: { path: string }): string {
  return path.split(".").join("");
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
    if (guidePage.kind === "print") {
      continue;
    }

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

  return Array.from(groups.values());
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
    `layout: \"${guidePage.kind === "print" ? "guide-print" : "guide"}\"`,
  ];

  if (guidePage.kind === "index" || guidePage.kind === "print") {
    frontMatterLines.push(`badge_name: \"${badgeData.title}\"`);
  }

  if (guidePage.kind !== "print") {
    frontMatterLines.push(`group_title: \"${guidePage.groupTitle}\"`);
  }

  if (guidePage.kind === "requirement") {
    frontMatterLines.push(`req_number: \"${guidePage.reqNumber}\"`);
    frontMatterLines.push(`req_path: \"${guidePage.reqPath}\"`);
  }

  if (guidePage.kind === "print") {
    frontMatterLines.push("noindex: true");
    frontMatterLines.push(
      `canonical_override: \"/merit-badges/${badgeData.slug}/guide/\"`,
    );
    frontMatterLines.push("build:");
    frontMatterLines.push("  list: never");
  }

  if (guidePage.kind !== "print" && previousPage !== undefined) {
    frontMatterLines.push(
      `prev: \"${pageUrl({ slug: badgeData.slug, pageSlug: previousPage.pageSlug })}\"`,
    );
    frontMatterLines.push(`prev_title: \"${previousPage.title}\"`);
  }

  if (guidePage.kind !== "print" && nextPage !== undefined) {
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

  if (guidePage.kind === "print") {
    frontMatterLines.push("---", "");
    return frontMatterLines.join("\n");
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
  return value.split('"').join('\\"');
}

async function pathExists({ path }: { path: string }): Promise<boolean> {
  return (await Bun.file(path).exists()) === true;
}
