import { Glob } from "bun";
import { join } from "node:path";

import { MERIT_BADGES } from "./merit-badges.ts";

type CliOptions = {
  missingOnly: boolean;
  eagleOnly: boolean;
  noColor: boolean;
  depth: boolean;
};

type AnsiPalette = {
  reset: string;
  bold: string;
  dim: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  cyan: string;
};

type CoverageBadge = {
  title: string;
  slug: string;
  eagleRequired: boolean;
  discontinued: boolean;
  hasGuideIndex: boolean;
  requirementPageCount: number;
  warningMessages: string[];
};

type CoverageSummary = {
  activeTotal: number;
  activeCovered: number;
  activeRemaining: number;
  activeEagleTotal: number;
  activeEagleCovered: number;
  activeEagleRemaining: number;
};

type CoverageReport = {
  badges: CoverageBadge[];
  summary: CoverageSummary;
  warningMessages: string[];
};

const cliOptions = parseCliOptions({ arguments_: process.argv.slice(2) });
const colors = createAnsiPalette({ noColor: cliOptions.noColor });
const projectRoot = process.cwd();

void runCoverageReport({
  cliOptions,
  colors,
  projectRoot,
});

async function runCoverageReport({
  cliOptions,
  colors,
  projectRoot,
}: {
  cliOptions: CliOptions;
  colors: AnsiPalette;
  projectRoot: string;
}): Promise<void> {
  const coverageReport = await buildCoverageReport({ projectRoot });
  const filteredBadges = filterBadges({
    badges: coverageReport.badges,
    eagleOnly: cliOptions.eagleOnly,
  });

  if (cliOptions.missingOnly) {
    printMissingOnly({ badges: filteredBadges });
    return;
  }

  const displaySummary = summarizeBadges({ badges: filteredBadges });
  printHeader({
    summary: displaySummary,
    colors,
    eagleOnly: cliOptions.eagleOnly,
  });
  printSummary({
    summary: displaySummary,
    reportSummary: coverageReport.summary,
    colors,
    eagleOnly: cliOptions.eagleOnly,
  });
  printMissingSection({ badges: filteredBadges, colors });

  if (cliOptions.depth) {
    printCoveredDepthSection({ badges: filteredBadges, colors });
  }

  printWarnings({
    warningMessages: collectWarnings({
      badges: filteredBadges,
      reportWarnings: coverageReport.warningMessages,
    }),
    colors,
  });
}

function parseCliOptions({ arguments_ }: { arguments_: string[] }): CliOptions {
  const cliOptions: CliOptions = {
    missingOnly: false,
    eagleOnly: false,
    noColor: false,
    depth: false,
  };

  for (const argument of arguments_) {
    switch (argument) {
      case "--missing-only": {
        cliOptions.missingOnly = true;
        break;
      }
      case "--eagle-only": {
        cliOptions.eagleOnly = true;
        break;
      }
      case "--no-color": {
        cliOptions.noColor = true;
        break;
      }
      case "--depth": {
        cliOptions.depth = true;
        break;
      }
      default: {
        throw new Error(
          `Unknown option: ${argument}\n\nSupported options: --missing-only, --eagle-only, --no-color, --depth`,
        );
      }
    }
  }

  return cliOptions;
}

function createAnsiPalette({ noColor }: { noColor: boolean }): AnsiPalette {
  if (noColor) {
    return {
      reset: "",
      bold: "",
      dim: "",
      red: "",
      green: "",
      yellow: "",
      blue: "",
      cyan: "",
    };
  }

  return {
    reset: "\u001B[0m",
    bold: "\u001B[1m",
    dim: "\u001B[2m",
    red: "\u001B[31m",
    green: "\u001B[32m",
    yellow: "\u001B[33m",
    blue: "\u001B[34m",
    cyan: "\u001B[36m",
  };
}

async function buildCoverageReport({
  projectRoot,
}: {
  projectRoot: string;
}): Promise<CoverageReport> {
  const badges = await Promise.all(
    MERIT_BADGES.map(async meritBadge => {
      const guideDirectory = join(
        projectRoot,
        "hugo",
        "content",
        "merit-badges",
        meritBadge.slug,
        "guide",
      );
      const guideIndexPath = join(guideDirectory, "_index.md");
      const guideIndexFile = Bun.file(guideIndexPath);
      const hasGuideIndex = await guideIndexFile.exists();
      const requirementPageCount = hasGuideIndex
        ? await countRequirementPages({ guideDirectory })
        : 0;
      const warningMessages = await buildBadgeWarnings({
        slug: meritBadge.slug,
        title: meritBadge.title,
        guideDirectory,
        hasGuideIndex,
        requirementPageCount,
      });

      return {
        title: meritBadge.title,
        slug: meritBadge.slug,
        eagleRequired: meritBadge.eagle_required,
        discontinued: meritBadge.discontinued === true,
        hasGuideIndex,
        requirementPageCount,
        warningMessages,
      } satisfies CoverageBadge;
    }),
  );

  const summary = summarizeBadges({ badges });
  const activeTotal = badges.filter(badge => !badge.discontinued).length;
  const guideIndexCount = badges.filter(badge => badge.hasGuideIndex).length;
  const warningMessages: string[] = [];

  if (guideIndexCount !== badges.length - summary.activeRemaining) {
    warningMessages.push(
      `Guide index count mismatch: found ${guideIndexCount} guide indexes but expected ${summary.activeCovered + badges.filter(badge => badge.discontinued && badge.hasGuideIndex).length}.`,
    );
  }

  if (summary.activeCovered + summary.activeRemaining !== activeTotal) {
    warningMessages.push(
      `Coverage totals do not add up: covered ${summary.activeCovered} + remaining ${summary.activeRemaining} != active total ${activeTotal}.`,
    );
  }

  return {
    badges,
    summary,
    warningMessages,
  };
}

async function countRequirementPages({
  guideDirectory,
}: {
  guideDirectory: string;
}): Promise<number> {
  let count = 0;
  for await (const _fileName of new Glob("req*.md").scan(guideDirectory)) {
    count += 1;
  }

  return count;
}

async function buildBadgeWarnings({
  slug,
  title,
  guideDirectory,
  hasGuideIndex,
  requirementPageCount,
}: {
  slug: string;
  title: string;
  guideDirectory: string;
  hasGuideIndex: boolean;
  requirementPageCount: number;
}): Promise<string[]> {
  const warningMessages: string[] = [];
  const guideDirectoryExists = await Bun.file(guideDirectory).exists();

  if (guideDirectoryExists && !hasGuideIndex) {
    warningMessages.push(
      `${slug} (${title}) has a guide directory but is missing guide/_index.md.`,
    );
  }

  if (hasGuideIndex && requirementPageCount === 0) {
    warningMessages.push(
      `${slug} (${title}) has guide/_index.md but no req*.md pages.`,
    );
  }

  return warningMessages;
}

function filterBadges({
  badges,
  eagleOnly,
}: {
  badges: CoverageBadge[];
  eagleOnly: boolean;
}): CoverageBadge[] {
  const activeBadges = badges.filter(badge => !badge.discontinued);

  if (!eagleOnly) {
    return activeBadges;
  }

  return activeBadges.filter(badge => badge.eagleRequired);
}

function summarizeBadges({
  badges,
}: {
  badges: CoverageBadge[];
}): CoverageSummary {
  const activeBadges = badges.filter(badge => !badge.discontinued);
  const activeEagleBadges = activeBadges.filter(badge => badge.eagleRequired);
  const activeCovered = activeBadges.filter(
    badge => badge.hasGuideIndex,
  ).length;
  const activeEagleCovered = activeEagleBadges.filter(
    badge => badge.hasGuideIndex,
  ).length;

  return {
    activeTotal: activeBadges.length,
    activeCovered,
    activeRemaining: activeBadges.length - activeCovered,
    activeEagleTotal: activeEagleBadges.length,
    activeEagleCovered,
    activeEagleRemaining: activeEagleBadges.length - activeEagleCovered,
  };
}

function printHeader({
  summary,
  colors,
  eagleOnly,
}: {
  summary: CoverageSummary;
  colors: AnsiPalette;
  eagleOnly: boolean;
}): void {
  const percentage =
    summary.activeTotal === 0
      ? 0
      : (summary.activeCovered / summary.activeTotal) * 100;
  const progressBar = renderProgressBar({
    value: summary.activeCovered,
    total: summary.activeTotal,
    colors,
  });
  const label = eagleOnly ? "DRG Coverage (Eagle)" : "DRG Coverage";

  console.log(
    `${colors.bold}${label}${colors.reset}  ${progressBar}  ${summary.activeCovered} / ${summary.activeTotal} (${percentage.toFixed(1)}%)`,
  );
  console.log("");
}

function renderProgressBar({
  value,
  total,
  colors,
}: {
  value: number;
  total: number;
  colors: AnsiPalette;
}): string {
  const width = 24;
  const filledWidth = total === 0 ? 0 : Math.round((value / total) * width);
  const emptyWidth = Math.max(0, width - filledWidth);

  return `${colors.green}${"#".repeat(filledWidth)}${colors.dim}${"-".repeat(emptyWidth)}${colors.reset}`;
}

function printSummary({
  summary,
  reportSummary,
  colors,
  eagleOnly,
}: {
  summary: CoverageSummary;
  reportSummary: CoverageSummary;
  colors: AnsiPalette;
  eagleOnly: boolean;
}): void {
  console.log(`${colors.bold}Summary${colors.reset}`);

  if (eagleOnly) {
    console.log(`- eagle-required total: ${summary.activeTotal}`);
    console.log(
      `- eagle-required covered: ${colors.green}${summary.activeCovered}${colors.reset}`,
    );
    console.log(
      `- eagle-required remaining: ${colors.yellow}${summary.activeRemaining}${colors.reset}`,
    );
  } else {
    console.log(`- total badges: ${MERIT_BADGES.length}`);
    console.log(`- active badges: ${summary.activeTotal}`);
    console.log(
      `- covered: ${colors.green}${summary.activeCovered}${colors.reset}`,
    );
    console.log(
      `- remaining: ${colors.yellow}${summary.activeRemaining}${colors.reset}`,
    );
    console.log(
      `- eagle-required: ${colors.green}${reportSummary.activeEagleCovered}${colors.reset} covered / ${colors.yellow}${reportSummary.activeEagleRemaining}${colors.reset} remaining (${reportSummary.activeEagleTotal} total)`,
    );
  }

  console.log("");
}

function printMissingSection({
  badges,
  colors,
}: {
  badges: CoverageBadge[];
  colors: AnsiPalette;
}): void {
  const missingBadges = badges.filter(badge => !badge.hasGuideIndex);

  console.log(`${colors.bold}Missing badges${colors.reset}`);
  if (missingBadges.length === 0) {
    console.log(
      `${colors.green}All badges in this view have guides.${colors.reset}`,
    );
    console.log("");
    return;
  }

  for (const badge of missingBadges) {
    console.log(`- ${badge.slug} (${badge.title})`);
  }

  console.log("");
}

function printCoveredDepthSection({
  badges,
  colors,
}: {
  badges: CoverageBadge[];
  colors: AnsiPalette;
}): void {
  const coveredBadges = badges
    .filter(badge => badge.hasGuideIndex)
    .sort((firstBadge, secondBadge) => {
      if (
        secondBadge.requirementPageCount !== firstBadge.requirementPageCount
      ) {
        return (
          secondBadge.requirementPageCount - firstBadge.requirementPageCount
        );
      }

      return firstBadge.slug.localeCompare(secondBadge.slug);
    });

  console.log(`${colors.bold}Covered badges by depth${colors.reset}`);
  for (const badge of coveredBadges) {
    const pageLabel =
      badge.requirementPageCount === 1
        ? "1 req page"
        : `${badge.requirementPageCount} req pages`;
    console.log(`- ${badge.slug.padEnd(32)} ${pageLabel}`);
  }

  console.log("");
}

function printWarnings({
  warningMessages,
  colors,
}: {
  warningMessages: string[];
  colors: AnsiPalette;
}): void {
  if (warningMessages.length === 0) {
    return;
  }

  console.log(`${colors.bold}${colors.yellow}Warnings${colors.reset}`);
  for (const warningMessage of warningMessages) {
    console.log(`- ${warningMessage}`);
  }
}

function collectWarnings({
  badges,
  reportWarnings,
}: {
  badges: CoverageBadge[];
  reportWarnings: string[];
}): string[] {
  const badgeWarnings = badges.flatMap(badge => badge.warningMessages);
  return [...reportWarnings, ...badgeWarnings];
}

function printMissingOnly({ badges }: { badges: CoverageBadge[] }): void {
  const missingBadges = badges.filter(badge => !badge.hasGuideIndex);

  for (const badge of missingBadges) {
    console.log(badge.slug);
  }
}
