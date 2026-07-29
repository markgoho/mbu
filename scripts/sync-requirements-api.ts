import * as cheerio from "cheerio";
import type { MeritBadge } from "./merit-badges";
import { findBadgeBySlug } from "./merit-badges";

type Resource = {
  title: string;
  url: string;
};

type Requirement = {
  req_id: string;
  path: string;
  text: string;
  is_option?: boolean;
  resources?: Resource[];
  subrequirements?: Requirement[];
  subrequirement_mode?: {
    type: "all" | "select";
    count?: number;
  };
};

type BadgeData = {
  $schema: string;
  title: string;
  slug: string;
  url: string;
  eagle_required: boolean;
  category: string;
  eagle_group?: string;
  discontinued?: boolean;
  discontinued_date?: string;
  pamphlet_url?: string;
  last_updated: string;
  requirements: Requirement[];
};

type ApiCatalogBadge = {
  id: number;
  name: string;
};

type ApiCatalogResponse = {
  meritBadges: ApiCatalogBadge[];
};

type ApiRequirementRow = {
  id: string;
  name: string;
  listNumber: string;
  requirementNumber: string;
  sortOrder: string;
  childrenRequired: string;
  required: string;
  parentRequirementId: string;
};

type ApiRequirementsResponse = {
  requirements: ApiRequirementRow[];
};

type NormalizedApiRequirementRow = {
  id: string;
  text: string;
  resources?: Resource[];
  listNumber?: string;
  requirementNumber?: string;
  sortOrder: number;
  childrenRequired?: number;
  required: boolean;
  parentRequirementId?: string;
};

type SelectMode = {
  type: "all" | "select";
  count?: number;
};

const SCHEMA_URL = "../../static/schemas/merit-badge.schema.json";
const DEFAULT_BADGE_SLUG = process.env["BADGE_NAME"] ?? "camping";
const CATALOG_ENDPOINT = "https://api.scouting.org/advancements/v2/meritBadges";
const REQUIREMENTS_ENDPOINT_PREFIX =
  "https://api.scouting.org/advancements/meritBadges";

const TITLE_OVERRIDES: Record<string, string> = {
  [normalizeTitle({ title: "Artificial Intelligence" })]:
    "Artificial Intelligence (AI)",
  [normalizeTitle({ title: "Indian Lore" })]: "American Indian Culture",
};

const SUBREQUIREMENT_MODE_OVERRIDES: Record<
  string,
  Requirement["subrequirement_mode"]
> = {
  "shotgun-shooting:1": { type: "all" },
};

const REQUIREMENT_ID_OVERRIDES: Record<string, string> = {
  "shotgun-shooting:2:Option A—Shotgun Shooting (Modern Shotshell Type). Do ALL of the following:":
    "A",
  "shotgun-shooting:2:Option B—Muzzleloading Shotgun Shooting. Do ALL of the following:":
    "B",
};

const REQUIREMENT_PATH_OVERRIDES: Record<string, string> = {
  "shotgun-shooting:2.A": "2.A",
  "shotgun-shooting:2.A.a": "2.A.a",
  "shotgun-shooting:2.A.b": "2.A.b",
  "shotgun-shooting:2.A.c": "2.A.c",
  "shotgun-shooting:2.A.d": "2.A.d",
  "shotgun-shooting:2.A.e": "2.A.e",
  "shotgun-shooting:2.A.f": "2.A.f",
  "shotgun-shooting:2.A.g": "2.A.g",
  "shotgun-shooting:2.A.h": "2.A.h",
  "shotgun-shooting:2.A.i": "2.A.i",
  "shotgun-shooting:2.A.j": "2.A.j",
  "shotgun-shooting:2.B": "2.B",
  "shotgun-shooting:2.B.a": "2.B.a",
  "shotgun-shooting:2.B.b": "2.B.b",
  "shotgun-shooting:2.B.c": "2.B.c",
  "shotgun-shooting:2.B.d": "2.B.d",
  "shotgun-shooting:2.B.e": "2.B.e",
  "shotgun-shooting:2.B.f": "2.B.f",
  "shotgun-shooting:2.B.g": "2.B.g",
  "shotgun-shooting:2.B.h": "2.B.h",
  "shotgun-shooting:2.B.i": "2.B.i",
  "shotgun-shooting:2.B.j": "2.B.j",
  "shotgun-shooting:2.B.k": "2.B.k",
  "shotgun-shooting:2.B.l": "2.B.l",
  "shotgun-shooting:2.B.m": "2.B.m",
};

function normalizeRequirementOverrideKey({ text }: { text: string }): string {
  return normalizeWhitespace({ text }).replaceAll(/\s+/g, " ").trim();
}

function buildRequirementIdOverrideKey({
  badgeSlug,
  parentPath,
  text,
}: {
  badgeSlug: string;
  parentPath: string;
  text: string;
}): string {
  return `${badgeSlug}:${parentPath}:${normalizeRequirementOverrideKey({ text })}`;
}

function buildRequirementPathOverrideKey({
  badgeSlug,
  path,
}: {
  badgeSlug: string;
  path: string;
}): string {
  return `${badgeSlug}:${path}`;
}

function applyRequirementPathOverrides({
  badgeSlug,
  requirements,
}: {
  badgeSlug: string;
  requirements: Requirement[];
}): void {
  for (const requirement of requirements) {
    const override =
      REQUIREMENT_PATH_OVERRIDES[
        buildRequirementPathOverrideKey({
          badgeSlug,
          path: requirement["path"],
        })
      ];
    if (override !== undefined) {
      requirement["path"] = override;
    }

    if (requirement["subrequirements"] !== undefined) {
      applyRequirementPathOverrides({
        badgeSlug,
        requirements: requirement["subrequirements"],
      });
    }
  }
}

function applyShotgunOptionBranchOverrides({
  badgeSlug,
  requirements,
}: {
  badgeSlug: string;
  requirements: Requirement[];
}): void {
  if (badgeSlug !== "shotgun-shooting") {
    return;
  }

  const requirementTwo = requirements.find(
    requirement => requirement["path"] === "2",
  );
  if (requirementTwo?.["subrequirements"] === undefined) {
    return;
  }

  for (const optionRequirement of requirementTwo["subrequirements"]) {
    const overrideId =
      REQUIREMENT_ID_OVERRIDES[
        buildRequirementIdOverrideKey({
          badgeSlug,
          parentPath: requirementTwo["path"],
          text: optionRequirement["text"],
        })
      ];
    if (overrideId === undefined) {
      continue;
    }

    optionRequirement["req_id"] = overrideId;
    optionRequirement["path"] = computePath({
      parentPath: requirementTwo["path"],
      requirementId: overrideId,
    });

    for (const childRequirement of optionRequirement["subrequirements"] ?? []) {
      childRequirement["path"] = computePath({
        parentPath: optionRequirement["path"],
        requirementId: childRequirement["req_id"],
      });
    }
  }
}

function applyRequirementStructureOverrides({
  badgeSlug,
  requirements,
}: {
  badgeSlug: string;
  requirements: Requirement[];
}): void {
  applyShotgunOptionBranchOverrides({ badgeSlug, requirements });
  applyRequirementPathOverrides({ badgeSlug, requirements });
}

function applyRequirementOverrides({
  badgeSlug,
  requirements,
}: {
  badgeSlug: string;
  requirements: Requirement[];
}): void {
  applyRequirementStructureOverrides({ badgeSlug, requirements });
  applySubrequirementModeOverrides({ badgeSlug, requirements });
}

function applySubrequirementModeOverrides({
  badgeSlug,
  requirements,
}: {
  badgeSlug: string;
  requirements: Requirement[];
}): void {
  for (const requirement of requirements) {
    const override =
      SUBREQUIREMENT_MODE_OVERRIDES[`${badgeSlug}:${requirement["path"]}`];
    if (override !== undefined) {
      requirement["subrequirement_mode"] = { ...override };
    }

    if (requirement["subrequirements"] !== undefined) {
      applySubrequirementModeOverrides({
        badgeSlug,
        requirements: requirement["subrequirements"],
      });
    }
  }
}

const WORD_TO_COUNT: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function computePath({
  parentPath,
  requirementId,
}: {
  parentPath: string;
  requirementId: string;
}): string {
  return parentPath === "" ? requirementId : `${parentPath}.${requirementId}`;
}

function normalizeTitle({ title }: { title: string }): string {
  return title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeWhitespace({ text }: { text: string }): string {
  return text.replaceAll(/\s+/g, " ").trim();
}

function decodeHtmlEntities({ text }: { text: string }): string {
  return text
    .replaceAll(/&nbsp;/g, " ")
    .replaceAll(/&amp;/g, "&")
    .replaceAll(/&#39;/g, "'")
    .replaceAll(/&quot;/g, '"')
    .replaceAll(/&mdash;/g, "—")
    .replaceAll(/&ndash;/g, "–")
    .replaceAll(/&lt;/g, "<")
    .replaceAll(/&gt;/g, ">");
}

function stripHtml({ html }: { html: string }): string {
  return normalizeWhitespace({
    text: decodeHtmlEntities({
      text: html.replaceAll(/<[^>]+>/g, " "),
    }),
  });
}

function cloneRequirement({
  requirement,
}: {
  requirement: Requirement;
}): Requirement {
  return {
    ...requirement,
    ...(requirement["resources"] !== undefined && {
      resources: requirement["resources"].map(resource => ({ ...resource })),
    }),
    ...(requirement["subrequirements"] !== undefined && {
      subrequirements: requirement["subrequirements"].map(subrequirement =>
        cloneRequirement({ requirement: subrequirement }),
      ),
    }),
  };
}

function parseApiBoolean({ value }: { value: boolean | string }): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  const normalizedValue = value.trim().toLowerCase();
  if (normalizedValue === "true") {
    return true;
  }

  if (normalizedValue === "false") {
    return false;
  }

  throw new TypeError(`Expected boolean-like value, got ${value}`);
}

function parseOptionalInteger({
  value,
}: {
  value: string;
}): number | undefined {
  const normalizedValue = value.trim();
  if (normalizedValue === "") {
    return undefined;
  }

  const parsedValue = Number.parseInt(normalizedValue, 10);
  if (Number.isNaN(parsedValue)) {
    throw new TypeError(`Expected integer-like value, got ${value}`);
  }

  return parsedValue;
}

function parseSortOrder({ value }: { value: string }): number {
  const parsedValue = Number.parseFloat(value);
  if (Number.isNaN(parsedValue)) {
    throw new TypeError(`Expected numeric sortOrder, got ${value}`);
  }

  return parsedValue;
}

function extractPamphletUrl({
  requirementRows,
}: {
  requirementRows: ApiRequirementRow[];
}): string | undefined {
  for (const requirementRow of requirementRows) {
    if (!/official merit badge pamphlets/i.test(requirementRow["name"])) {
      continue;
    }

    const pdfMatch = requirementRow["name"].match(/href="([^"]+\.pdf[^"]*)"/i);
    if (pdfMatch?.[1] !== undefined) {
      return pdfMatch[1];
    }
  }

  return undefined;
}

function isArtifactRequirementRow({
  requirementRow,
}: {
  requirementRow: ApiRequirementRow;
}): boolean {
  const sortOrder = requirementRow["sortOrder"].trim();
  const requirementName = requirementRow["name"];
  const listNumber = requirementRow["listNumber"].trim();
  const requirementNumber = requirementRow["requirementNumber"].trim();
  const parentRequirementId = requirementRow["parentRequirementId"].trim();
  const normalizedText = normalizeRequirementText({
    text: requirementName,
  });

  if (sortOrder === "" && /<\/?(?:b|strong)>/i.test(requirementName)) {
    return true;
  }

  if (sortOrder === "0.001") {
    return true;
  }

  if (/official merit badge pamphlets/i.test(requirementName)) {
    return true;
  }

  return (
    parentRequirementId === "" &&
    listNumber === "" &&
    requirementNumber === "" &&
    sortOrder.startsWith("0.") &&
    /^note:/i.test(normalizedText)
  );
}

function extractResourcesFromRequirementHtml({
  html,
}: {
  html: string;
}): Resource[] {
  const $ = cheerio.load(html);
  const extractedResources: Resource[] = [];

  $("details a[href]").each((_, linkElement) => {
    const href = $(linkElement).attr("href");
    const title = normalizeWhitespace({
      text: decodeHtmlEntities({ text: $(linkElement).text() }),
    });

    if (href === undefined || title === "") {
      return;
    }

    if (!/^https?:\/\//i.test(href)) {
      return;
    }

    extractedResources.push({ title, url: href });
  });

  return extractedResources;
}

function normalizeRequirementText({ text }: { text: string }): string {
  const strippedText = stripHtml({ html: text });
  const resourceIndex = strippedText.search(/\s+Resources?:/i);
  if (resourceIndex > 0) {
    return strippedText.slice(0, resourceIndex).trim();
  }

  return strippedText;
}

function normalizeApiRequirementRow({
  requirementRow,
}: {
  requirementRow: ApiRequirementRow;
}): NormalizedApiRequirementRow {
  const normalizedText = normalizeRequirementText({
    text: requirementRow["name"],
  });
  const listNumber = normalizeWhitespace({
    text: requirementRow["listNumber"],
  });
  const requirementNumber = normalizeWhitespace({
    text: requirementRow["requirementNumber"],
  });
  const parentRequirementId = normalizeWhitespace({
    text: requirementRow["parentRequirementId"],
  });
  const resources = extractResourcesFromRequirementHtml({
    html: requirementRow["name"],
  });

  return {
    id: requirementRow["id"],
    text: normalizedText,
    ...(resources.length > 0 && { resources }),
    ...(listNumber !== "" && { listNumber }),
    ...(requirementNumber !== "" && { requirementNumber }),
    sortOrder: parseSortOrder({ value: requirementRow["sortOrder"] }),
    ...(requirementRow["childrenRequired"].trim() !== "" && {
      childrenRequired: parseOptionalInteger({
        value: requirementRow["childrenRequired"],
      }),
    }),
    required: parseApiBoolean({ value: requirementRow["required"] }),
    ...(parentRequirementId !== "" && { parentRequirementId }),
  };
}

function parseRequirementIdFromListNumber({
  listNumber,
}: {
  listNumber?: string;
}): string | undefined {
  if (listNumber === undefined) {
    return undefined;
  }

  const parenthesizedMatch = listNumber.match(/^\(([a-z0-9]+)\)$/i);
  if (parenthesizedMatch?.[1] !== undefined) {
    return parenthesizedMatch[1].toLowerCase();
  }

  const dottedMatch = listNumber.match(/^([a-z0-9]+)\.$/i);
  if (dottedMatch?.[1] !== undefined) {
    return dottedMatch[1].toLowerCase();
  }

  return undefined;
}

function parseRequirementIdFromRequirementNumber({
  requirementNumber,
}: {
  requirementNumber?: string;
}): string | undefined {
  if (requirementNumber === undefined) {
    return undefined;
  }

  const bracketMatch = requirementNumber.match(/\(([a-z0-9]+)\)$/i);
  if (bracketMatch?.[1] !== undefined) {
    return bracketMatch[1].toLowerCase();
  }

  const squareBracketMatch = requirementNumber.match(/\[([a-z0-9]+)\]$/i);
  if (squareBracketMatch?.[1] !== undefined) {
    return squareBracketMatch[1].toLowerCase();
  }

  const optionMatch = requirementNumber.match(/option\s+([a-z0-9]+)$/i);
  if (optionMatch?.[1] !== undefined) {
    return optionMatch[1].toLowerCase();
  }

  const trailingLetterMatch = requirementNumber.match(/([a-z])$/i);
  if (trailingLetterMatch?.[1] !== undefined) {
    return trailingLetterMatch[1].toLowerCase();
  }

  const trailingNumberMatch = requirementNumber.match(/(\d+)$/);
  if (trailingNumberMatch?.[1] !== undefined) {
    return trailingNumberMatch[1];
  }

  return undefined;
}

function isOptionHeading({ text }: { text: string }): boolean {
  return /\boption\b/i.test(text);
}

function slugifyOptionHeading({ text }: { text: string }): string | undefined {
  if (!isOptionHeading({ text })) {
    return undefined;
  }

  let heading = normalizeWhitespace({ text });
  const prefixOptionMatch = heading.match(
    /^option\s+[a-z0-9]+[—-]\s*(.+?)(?:\.|$)/i,
  );
  if (prefixOptionMatch?.[1] !== undefined) {
    heading = prefixOptionMatch[1];
  } else {
    const suffixOptionMatch = heading.match(/^(.+?)\s+option\b/i);
    if (suffixOptionMatch?.[1] !== undefined) {
      heading = suffixOptionMatch[1];
    }
  }

  const slug = heading
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");

  return slug === "" ? undefined : slug;
}

function extractSelectCountFromText({
  text,
}: {
  text: string;
}): number | undefined {
  const selectMatch = text.match(
    /\b(?:do|complete|select|choose)\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/i,
  );
  const selectValue = selectMatch?.[1]?.toLowerCase();
  if (selectValue === undefined) {
    return undefined;
  }

  if (/^\d+$/.test(selectValue)) {
    return Number.parseInt(selectValue, 10);
  }

  return WORD_TO_COUNT[selectValue];
}

function inferSubrequirementMode({
  text,
  childrenRequired,
  childCount,
  anyChildRequired,
}: {
  text: string;
  childrenRequired?: number;
  childCount: number;
  anyChildRequired: boolean;
}): SelectMode | undefined {
  if (childCount === 0) {
    return undefined;
  }

  const textSelectionCount = extractSelectCountFromText({ text });
  if (textSelectionCount !== undefined) {
    return { type: "select", count: textSelectionCount };
  }

  // The API's childrenRequired is NOT reliably "how many the scout picks":
  // for plenty of do-all groups it comes back one short of the child count
  // (wildland-fire-management 7(a) reports 5 of 6, snow-sports 7(b) 10 of
  // 11, bird-study 10 and automotive-maintenance 3 both 2 of 3) even though
  // every child is flagged required. Trusting it there turns "demonstrate
  // the following six tactics" into a bogus "Choose 5" pill.
  //
  // A genuine choice group never flags any child required -- the scout
  // hasn't chosen yet, so none of them individually are. Requiring that
  // keeps every real "choose N" group (art 4, personal-management 3,
  // wildland-fire-management 9, ...) while rejecting the stale counts.
  if (
    !anyChildRequired &&
    childrenRequired !== undefined &&
    childrenRequired < childCount
  ) {
    return { type: "select", count: childrenRequired };
  }

  return { type: "all" };
}

function deriveRequirementId({
  requirementRow,
  siblingIndex,
}: {
  requirementRow: NormalizedApiRequirementRow;
  siblingIndex: number;
}): { requirementId: string; isOption: boolean } {
  const listNumberId = parseRequirementIdFromListNumber({
    listNumber: requirementRow["listNumber"],
  });
  const requirementNumberId = parseRequirementIdFromRequirementNumber({
    requirementNumber: requirementRow["requirementNumber"],
  });
  const optionHeading = isOptionHeading({ text: requirementRow["text"] });

  if (listNumberId !== undefined) {
    return {
      requirementId: listNumberId,
      isOption: optionHeading,
    };
  }

  if (requirementNumberId !== undefined) {
    return {
      requirementId: requirementNumberId,
      isOption: optionHeading,
    };
  }

  const slugifiedOptionId = slugifyOptionHeading({
    text: requirementRow["text"],
  });
  if (slugifiedOptionId !== undefined) {
    return {
      requirementId: slugifiedOptionId,
      isOption: true,
    };
  }

  return {
    requirementId: String(siblingIndex + 1),
    isOption: false,
  };
}

function sortRequirementRows({
  requirementRows,
}: {
  requirementRows: NormalizedApiRequirementRow[];
}): NormalizedApiRequirementRow[] {
  return [...requirementRows].sort(
    (firstRequirementRow, secondRequirementRow) => {
      if (
        firstRequirementRow["sortOrder"] !== secondRequirementRow["sortOrder"]
      ) {
        return (
          firstRequirementRow["sortOrder"] - secondRequirementRow["sortOrder"]
        );
      }

      return firstRequirementRow["id"].localeCompare(
        secondRequirementRow["id"],
      );
    },
  );
}

function buildRequirementsByParentId({
  requirementRows,
}: {
  requirementRows: NormalizedApiRequirementRow[];
}): Map<string, NormalizedApiRequirementRow[]> {
  const requirementRowsByParentId = new Map<
    string,
    NormalizedApiRequirementRow[]
  >();

  for (const requirementRow of requirementRows) {
    if (requirementRow["parentRequirementId"] === undefined) {
      continue;
    }

    const existingRequirementRows =
      requirementRowsByParentId.get(requirementRow["parentRequirementId"]) ??
      [];
    existingRequirementRows.push(requirementRow);
    requirementRowsByParentId.set(
      requirementRow["parentRequirementId"],
      existingRequirementRows,
    );
  }

  for (const [
    parentRequirementId,
    childRequirementRows,
  ] of requirementRowsByParentId) {
    requirementRowsByParentId.set(
      parentRequirementId,
      sortRequirementRows({ requirementRows: childRequirementRows }),
    );
  }

  return requirementRowsByParentId;
}

function buildRequirementsForRows({
  requirementRows,
  parentPath,
  requirementRowsByParentId,
}: {
  requirementRows: NormalizedApiRequirementRow[];
  parentPath: string;
  requirementRowsByParentId: Map<string, NormalizedApiRequirementRow[]>;
}): Requirement[] {
  return requirementRows.map((requirementRow, siblingIndex) => {
    const { requirementId, isOption } = deriveRequirementId({
      requirementRow,
      siblingIndex,
    });
    const requirementPath = computePath({
      parentPath,
      requirementId,
    });
    const childRequirementRows =
      requirementRowsByParentId.get(requirementRow["id"]) ?? [];
    const childRequirements = buildRequirementsForRows({
      requirementRows: childRequirementRows,
      parentPath: requirementPath,
      requirementRowsByParentId,
    });
    const subrequirementMode = inferSubrequirementMode({
      text: requirementRow["text"],
      childrenRequired: requirementRow["childrenRequired"],
      childCount: childRequirements.length,
      anyChildRequired: childRequirementRows.some(
        childRequirementRow => childRequirementRow["required"],
      ),
    });

    return {
      req_id: requirementId,
      path: requirementPath,
      text: requirementRow["text"],
      ...(isOption && { is_option: true }),
      ...(requirementRow["resources"] !== undefined && {
        resources: requirementRow["resources"],
      }),
      ...(childRequirements.length > 0 && {
        subrequirements: childRequirements,
      }),
      ...(subrequirementMode !== undefined && {
        subrequirement_mode: subrequirementMode,
      }),
    };
  });
}

function buildNestedRequirements({
  requirementRows,
}: {
  requirementRows: NormalizedApiRequirementRow[];
}): Requirement[] {
  const requirementRowsByParentId = buildRequirementsByParentId({
    requirementRows,
  });
  const rootRequirementRows = sortRequirementRows({
    requirementRows: requirementRows.filter(
      requirementRow => requirementRow["parentRequirementId"] === undefined,
    ),
  });

  return buildRequirementsForRows({
    requirementRows: rootRequirementRows,
    parentPath: "",
    requirementRowsByParentId,
  });
}

function canReuseExistingRequirement({
  existingRequirement,
  nextRequirement,
}: {
  existingRequirement?: Requirement;
  nextRequirement: Requirement;
}): boolean {
  if (existingRequirement === undefined) {
    return false;
  }

  const existingChildCount =
    existingRequirement["subrequirements"]?.length ?? 0;
  const nextChildCount = nextRequirement["subrequirements"]?.length ?? 0;
  return existingChildCount === nextChildCount;
}

function mergeResources({
  existingResources,
  nextResources,
}: {
  existingResources?: Resource[];
  nextResources?: Resource[];
}): Resource[] | undefined {
  if (existingResources === undefined && nextResources === undefined) {
    return undefined;
  }

  const resourcesByUrl = new Map<string, Resource>();
  for (const resource of existingResources ?? []) {
    resourcesByUrl.set(resource["url"], { ...resource });
  }

  for (const resource of nextResources ?? []) {
    resourcesByUrl.set(resource["url"], { ...resource });
  }

  return [...resourcesByUrl.values()];
}

function alignWithExistingRequirements({
  requirements,
  existingRequirements,
}: {
  requirements: Requirement[];
  existingRequirements?: Requirement[];
}): Requirement[] {
  return requirements.map((requirement, siblingIndex) => {
    const existingRequirement = existingRequirements?.[siblingIndex];
    const alignedRequirement = cloneRequirement({ requirement });

    if (
      existingRequirement?.["subrequirements"] !== undefined &&
      alignedRequirement["subrequirements"] === undefined
    ) {
      const preservedRequirement = cloneRequirement({
        requirement: existingRequirement,
      });
      const mergedResources = mergeResources({
        existingResources: preservedRequirement["resources"],
        nextResources: alignedRequirement["resources"],
      });

      if (mergedResources !== undefined) {
        preservedRequirement["resources"] = mergedResources;
      }

      return preservedRequirement;
    }

    if (
      existingRequirement !== undefined &&
      canReuseExistingRequirement({
        existingRequirement,
        nextRequirement: alignedRequirement,
      })
    ) {
      alignedRequirement["req_id"] = existingRequirement["req_id"];
      if (existingRequirement["is_option"] === true) {
        alignedRequirement["is_option"] = true;
      }
    }

    const mergedResources = mergeResources({
      existingResources: existingRequirement?.["resources"],
      nextResources: alignedRequirement["resources"],
    });
    if (mergedResources !== undefined) {
      alignedRequirement["resources"] = mergedResources;
    }

    if (alignedRequirement["subrequirements"] !== undefined) {
      alignedRequirement["subrequirements"] = alignWithExistingRequirements({
        requirements: alignedRequirement["subrequirements"],
        existingRequirements: existingRequirement?.["subrequirements"],
      });
    }

    return alignedRequirement;
  });
}

function mergeResourceBaselineIntoRequirements({
  requirements,
  resourceBaseline,
}: {
  requirements: Requirement[];
  resourceBaseline?: Requirement[];
}): void {
  if (resourceBaseline === undefined) {
    return;
  }

  for (const [siblingIndex, requirement] of requirements.entries()) {
    const baselineRequirement = resourceBaseline[siblingIndex];
    const mergedResources = mergeResources({
      existingResources: baselineRequirement?.["resources"],
      nextResources: requirement["resources"],
    });

    if (mergedResources !== undefined) {
      requirement["resources"] = mergedResources;
    }

    if (requirement["subrequirements"] !== undefined) {
      mergeResourceBaselineIntoRequirements({
        requirements: requirement["subrequirements"],
        resourceBaseline: baselineRequirement?.["subrequirements"],
      });
    }
  }
}

function rebuildPaths({
  requirements,
  parentPath,
}: {
  requirements: Requirement[];
  parentPath: string;
}): Requirement[] {
  return requirements.map(requirement => {
    const rebuiltRequirement: Requirement = {
      ...requirement,
      path: computePath({
        parentPath,
        requirementId: requirement["req_id"],
      }),
    };

    if (requirement["subrequirements"] !== undefined) {
      rebuiltRequirement["subrequirements"] = rebuildPaths({
        requirements: requirement["subrequirements"],
        parentPath: rebuiltRequirement["path"],
      });
    }

    return rebuiltRequirement;
  });
}

function correctTypos({ text }: { text: string }): string {
  return decodeHtmlEntities({ text })
    .replaceAll(/\bRapel\b/g, "Rappel")
    .replaceAll(/\brapel\b/g, "rappel");
}

function correctTyposInRequirements({
  requirements,
}: {
  requirements: Requirement[];
}): void {
  for (const requirement of requirements) {
    requirement["text"] = correctTypos({ text: requirement["text"] });
    if (requirement["resources"] !== undefined) {
      requirement["resources"] = requirement["resources"].map(resource => ({
        ...resource,
        title: correctTypos({ text: resource["title"] }),
      }));
    }

    if (requirement["subrequirements"] !== undefined) {
      correctTyposInRequirements({
        requirements: requirement["subrequirements"],
      });
    }
  }
}

function tryResolveApiBadge({
  badge,
  catalogBadges,
}: {
  badge: MeritBadge;
  catalogBadges: ApiCatalogBadge[];
}): ApiCatalogBadge | undefined {
  const badgeTitle = normalizeTitle({ title: badge["title"] });
  const overrideTitle = TITLE_OVERRIDES[badgeTitle];
  const targetTitle = normalizeTitle({
    title: overrideTitle ?? badge["title"],
  });

  return catalogBadges.find(
    catalogBadge =>
      normalizeTitle({ title: catalogBadge["name"] }) === targetTitle,
  );
}

async function fetchJson<T>({ url }: { url: string }): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as T;
}

function getOutputPath({ badge }: { badge: MeritBadge }): string {
  return `hugo/data/merit-badges/${badge["slug"]}.json`;
}

async function readExistingBadgeData({
  outputPath,
}: {
  outputPath: string;
}): Promise<BadgeData | undefined> {
  const existingFile = Bun.file(outputPath);
  if (!(await existingFile.exists())) {
    return undefined;
  }

  return (await existingFile.json()) as BadgeData;
}

function readCommittedBadgeData({
  outputPath,
}: {
  outputPath: string;
}): BadgeData | undefined {
  const gitShowResult = Bun.spawnSync(["git", "show", `HEAD:${outputPath}`]);
  if (gitShowResult.exitCode !== 0) {
    return undefined;
  }

  const committedJson = gitShowResult.stdout.toString();
  if (committedJson.trim() === "") {
    return undefined;
  }

  return JSON.parse(committedJson) as BadgeData;
}

function getAlignmentBaseline({
  committedBadgeData,
  existingBadgeData,
}: {
  committedBadgeData?: BadgeData;
  existingBadgeData?: BadgeData;
}): Requirement[] | undefined {
  if (committedBadgeData?.["requirements"] !== undefined) {
    return committedBadgeData["requirements"];
  }

  return existingBadgeData?.["requirements"];
}

function getResourceBaseline({
  existingBadgeData,
  committedBadgeData,
}: {
  existingBadgeData?: BadgeData;
  committedBadgeData?: BadgeData;
}): Requirement[] | undefined {
  if (existingBadgeData?.["requirements"] !== undefined) {
    return existingBadgeData["requirements"];
  }

  return committedBadgeData?.["requirements"];
}

function getLastUpdatedBaseline({
  existingBadgeData,
  committedBadgeData,
}: {
  existingBadgeData?: BadgeData;
  committedBadgeData?: BadgeData;
}): BadgeData | undefined {
  return existingBadgeData ?? committedBadgeData;
}

function resolveLastUpdatedFromBaseline({
  requirements,
  baselineBadgeData,
}: {
  requirements: Requirement[];
  baselineBadgeData?: BadgeData;
}): string {
  const today = new Date().toISOString().split("T")[0];
  if (today === undefined) {
    throw new Error("Failed to derive current date");
  }

  if (baselineBadgeData === undefined) {
    return today;
  }

  const existingRequirements = JSON.stringify(
    baselineBadgeData["requirements"],
  );
  const newRequirements = JSON.stringify(requirements);
  if (existingRequirements === newRequirements) {
    return baselineBadgeData["last_updated"] ?? today;
  }

  return today;
}

function buildBadgeData({
  badge,
  requirements,
  pamphletUrl,
  lastUpdated,
}: {
  badge: MeritBadge;
  requirements: Requirement[];
  pamphletUrl?: string;
  lastUpdated: string;
}): BadgeData {
  return {
    $schema: SCHEMA_URL,
    title: badge["title"],
    slug: badge["slug"],
    url: badge["url"],
    eagle_required: badge["eagle_required"],
    category: badge["category"],
    ...(badge["eagle_group"] !== undefined && {
      eagle_group: badge["eagle_group"],
    }),
    ...(badge["discontinued"] === true && {
      discontinued: true,
    }),
    ...(badge["discontinued_date"] !== undefined && {
      discontinued_date: badge["discontinued_date"],
    }),
    ...(pamphletUrl !== undefined && {
      pamphlet_url: pamphletUrl,
    }),
    last_updated: lastUpdated,
    requirements,
  };
}

async function main(): Promise<void> {
  const badge = findBadgeBySlug(DEFAULT_BADGE_SLUG);
  if (badge === undefined) {
    throw new Error(`Badge not found: ${DEFAULT_BADGE_SLUG}`);
  }

  console.log(`📡 API extraction: ${badge["title"]}`);
  console.log(`📍 URL: ${badge["url"]}`);
  console.log("---");

  const outputPath = getOutputPath({ badge });
  const existingBadgeData = await readExistingBadgeData({ outputPath });
  const committedBadgeData = readCommittedBadgeData({ outputPath });

  console.log("\n📚 Step 1: Fetching badge catalog...\n");
  const catalogResponse = await fetchJson<ApiCatalogResponse>({
    url: CATALOG_ENDPOINT,
  });
  const apiBadge = tryResolveApiBadge({
    badge,
    catalogBadges: catalogResponse["meritBadges"],
  });

  if (apiBadge === undefined) {
    if (badge["discontinued"] === true) {
      console.log(
        "   Badge not present in API — preserving existing discontinued JSON",
      );
      if (existingBadgeData !== undefined) {
        await Bun.write(
          outputPath,
          `${JSON.stringify(existingBadgeData, undefined, 2)}\n`,
        );
      }
      console.log("\n✨ API extraction skipped!");
      return;
    }

    throw new Error(`No API badge match found for ${badge["title"]}`);
  }

  console.log(`   Matched API badge ID: ${apiBadge["id"]}`);

  console.log("\n🧾 Step 2: Fetching API requirements...\n");
  const requirementsResponse = await fetchJson<ApiRequirementsResponse>({
    url: `${REQUIREMENTS_ENDPOINT_PREFIX}/${apiBadge["id"]}/requirements`,
  });
  console.log(
    `   Retrieved ${requirementsResponse["requirements"].length} raw requirement rows`,
  );

  console.log("\n🧹 Step 3: Normalizing requirement rows...\n");
  const normalizedRequirementRows = requirementsResponse["requirements"]
    .filter(requirementRow => !isArtifactRequirementRow({ requirementRow }))
    .map(requirementRow => normalizeApiRequirementRow({ requirementRow }));
  console.log(
    `   Retained ${normalizedRequirementRows.length} structured rows`,
  );

  console.log("\n🌲 Step 4: Rebuilding nested requirements...\n");
  const builtRequirements = buildNestedRequirements({
    requirementRows: normalizedRequirementRows,
  });
  console.log(`   Built ${builtRequirements.length} top-level requirements`);

  console.log("\n🔗 Step 5: Preserving committed paths and resources...\n");
  const alignedRequirements = alignWithExistingRequirements({
    requirements: builtRequirements,
    existingRequirements: getAlignmentBaseline({
      committedBadgeData,
      existingBadgeData,
    }),
  });
  const requirements = rebuildPaths({
    requirements: alignedRequirements,
    parentPath: "",
  });
  mergeResourceBaselineIntoRequirements({
    requirements,
    resourceBaseline: getResourceBaseline({
      existingBadgeData,
      committedBadgeData,
    }),
  });
  correctTyposInRequirements({ requirements });
  applyRequirementOverrides({
    badgeSlug: badge["slug"],
    requirements,
  });
  console.log("   Reused committed req_id/path structure where compatible");

  console.log("\n📄 Step 6: Extracting pamphlet URL...\n");
  const pamphletUrl = extractPamphletUrl({
    requirementRows: requirementsResponse["requirements"],
  });
  console.log(`   Pamphlet URL: ${pamphletUrl ?? "Not found"}`);

  console.log("\n💾 Step 7: Writing badge JSON...\n");
  const lastUpdated = resolveLastUpdatedFromBaseline({
    requirements,
    baselineBadgeData: getLastUpdatedBaseline({
      existingBadgeData,
      committedBadgeData,
    }),
  });
  const badgeData = buildBadgeData({
    badge,
    requirements,
    pamphletUrl,
    lastUpdated,
  });

  await Bun.write(outputPath, `${JSON.stringify(badgeData, undefined, 2)}\n`);
  console.log(`   Written to: ${outputPath}`);
  console.log("\n✨ API extraction complete!");
}

await main();
