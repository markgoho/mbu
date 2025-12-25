import * as cheerio from "cheerio";
import { Impit } from "impit";
import { join } from "path";
import { MERIT_BADGES, findBadgeBySlug, type MeritBadge } from "./merit-badges";

// CONFIGURATION
const CONTENT_DIR = join(import.meta.dir, "../hugo/content/merit-badges");
const randomDelay = () =>
  new Promise(res => setTimeout(res, 500 + Math.random() * 1000));

// Single badge mode: BADGE_NAME="camping" bun run scripts/sync-requirements.ts
const SINGLE_BADGE = process.env.BADGE_NAME;
// Test mode with a few badges: TEST_MODE=1 bun run scripts/sync-requirements.ts
const TEST_MODE = process.env.TEST_MODE;
const TEST_BADGE_SLUGS = ["archery", "camping", "first-aid"];

// TYPES
interface BadgeResource {
  title: string;
  url: string;
}

interface BadgeRequirement {
  req_id: string;
  path: string; // For deep linking (e.g., "8.a.1")
  text: string;
  is_option?: boolean; // True for named options like "Beef Cattle Option"
  resources?: BadgeResource[];
  subrequirements?: BadgeRequirement[];
  subrequirement_mode?: {
    type: "all" | "select";
    count?: number; // For "select ONE", "select TWO", etc.
  };
}

interface BadgeData {
  title: string;
  slug: string;
  url: string;
  eagle_required?: boolean;
  pamphlet_url?: string;
  requirements: BadgeRequirement[]; // Direct, no sections wrapper
}

console.log("🚀 Starting Merit Badge Sync (Bun Edition)...");
console.log(`📋 Using static badge list with ${MERIT_BADGES.length} badges`);

// 1. Initialize Impit (TLS Fingerprint Mimicry)
const client = new Impit({
  browser: "chrome",
  timeout: 30000,
});

let successCount = 0;
let errorCount = 0;

// 2. Determine which badges to process from the static list
let badgeList: MeritBadge[] = [];

if (SINGLE_BADGE) {
  console.log(`🎯 Single badge mode: ${SINGLE_BADGE}`);
  const badge = findBadgeBySlug(SINGLE_BADGE);
  if (!badge) {
    throw new Error(`Badge not found in static list: ${SINGLE_BADGE}`);
  }
  badgeList = [badge];
} else if (TEST_MODE) {
  console.log(`🧪 Test mode: processing ${TEST_BADGE_SLUGS.length} badges`);
  badgeList = TEST_BADGE_SLUGS.map(slug => {
    const badge = findBadgeBySlug(slug);
    if (!badge) {
      throw new Error(`Badge not found in static list: ${slug}`);
    }
    return badge;
  });
} else {
  // Process all badges from the static list (already sorted alphabetically)
  badgeList = [...MERIT_BADGES];
  console.log(`🔎 Processing all ${badgeList.length} badges.`);
}

// 3. Main Loop (sequential for stability)
for (const badge of badgeList) {
  const { title, slug, url, eagle_required } = badge;
  console.log(`Processing: ${title}...`);

  try {
    // Scrape Page for requirements and pamphlet URL
    const { requirements, pamphlet_url } = await scrapeBadgePage(client, url);

    const badgeData: BadgeData = {
      title: title,
      slug: slug,
      url: url,
      eagle_required: eagle_required,
      pamphlet_url: pamphlet_url,
      requirements: requirements,
    };

    // Write data.json (only update the requirements data)
    const badgeDir = join(CONTENT_DIR, slug);
    const dataPath = join(badgeDir, "data.json");
    await Bun.write(dataPath, JSON.stringify(badgeData, null, 2));

    console.log(`  ✅ Updated ${title}`);
    successCount++;

    await randomDelay();
  } catch (err) {
    console.error(`❌ Failed ${title}: ${(err as Error).message}`);
    errorCount++;
  }
}

console.log(
  `\n✅ Sync complete. ${successCount} badges updated, ${errorCount} errors.`,
);

// --- HELPERS ---

/**
 * Compute the path for a requirement by joining parent path with current ID
 * Uses dots as separator for URL-friendly anchors (no %2f encoding)
 */
function computePath(parentPath: string, reqId: string): string {
  return parentPath ? `${parentPath}.${reqId}` : reqId;
}

/**
 * Slugify an option name (e.g., "Beef Cattle Option" → "beef-cattle")
 */
function slugifyOption(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+option$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Check if text looks like a named option (contains "Option" in the text)
 */
function isNamedOption(text: string): boolean {
  return /\boption\b/i.test(text);
}

/**
 * Recursively extract subrequirements from a parent element
 * Handles both standard (a), (b) format and named options
 * Also handles inline lists and nested children at any depth
 */
function extractSubrequirements(
  $: cheerio.CheerioAPI,
  parentId: string,
  parentPath: string,
): BadgeRequirement[] {
  const subrequirementsMap = new Map<string, BadgeRequirement>();

  $(`.mb-requirement-child.mb-parent-${parentId}`).each((childIdx, childEl) => {
    const $child = $(childEl);
    let childText = $child.text().trim();
    childText = childText.replace(/\s+/g, " ");

    // Try to match standard format: (a) Some text OR numbered format: 1. Some text
    const letterMatch = childText.match(/^\(([a-z0-9]+)\)\s+([\s\S]*)/i);
    const numberMatch = childText.match(/^(\d+)\.\s+([\s\S]*)/i);
    const match = letterMatch || numberMatch;

    if (match && match[1] && match[2]) {
      // Standard format with letter/number ID
      const reqId = match[1];

      // Skip if we've already seen this requirement ID
      if (subrequirementsMap.has(reqId)) return;

      // Check for inline lists
      const hasInlineList = $child.find("ul, ol").length > 0;

      // Get text without inline lists
      const $clone = $child.clone();
      $clone.find("ul, ol").remove();
      $clone.find(".mb-requirement-listnumber").remove();
      $clone.find("br").replaceWith(" ");
      let textOnly = $clone.text().trim();
      textOnly = textOnly.replace(/\s+/g, " ");
      textOnly = textOnly.replace(/^\([a-z0-9]+\)\s+/i, ""); // Remove (a), (b) prefix
      textOnly = textOnly.replace(/^\d+\.\s+/i, ""); // Remove 1., 2. prefix

      // Split text and resources
      const resourcesMatch = textOnly.match(/Resources:([\s\S]*)/i);
      const cleanText = resourcesMatch
        ? textOnly.substring(0, textOnly.indexOf("Resources:")).trim()
        : textOnly;

      // Extract resources
      const resources: BadgeResource[] = [];
      $child.find("a").each((_, linkEl) => {
        const $link = $(linkEl);
        const href = $link.attr("href");
        const title = $link.text().trim();
        if (href && title) {
          resources.push({ title, url: href });
        }
      });

      // Compute path for this requirement
      const reqPath = computePath(parentPath, reqId);

      // Get nested subrequirements (recursive!)
      let nested: BadgeRequirement[] = [];
      const childReqIdMatch = $child
        .attr("class")
        ?.match(/mb-requirement-id-(\d+)/);
      const childReqId = childReqIdMatch ? childReqIdMatch[1] : null;

      if (childReqId) {
        // Recursively extract children, passing current path
        nested = extractSubrequirements($, childReqId, reqPath);
      }

      // If there are inline lists, extract them as additional subrequirements
      // Use children() to only get direct child lists, not nested navigation
      if (hasInlineList && nested.length === 0) {
        $child.children("ul, ol").each((_, listEl) => {
          $(listEl)
            .children("li")
            .each((liIdx, liEl) => {
              let liText = $(liEl).text().trim();
              liText = liText.replace(/\s+/g, " ");
              if (liText) {
                const inlineReqId = `${liIdx + 1}`;
                nested.push({
                  req_id: inlineReqId,
                  path: computePath(reqPath, inlineReqId),
                  text: liText,
                });
              }
            });
        });
      }

      subrequirementsMap.set(reqId, {
        req_id: reqId,
        path: reqPath,
        text: cleanText,
        resources: resources.length > 0 ? resources : undefined,
        subrequirements: nested.length > 0 ? nested : undefined,
      });
    } else if (childText) {
      // Named option without letter ID (e.g., "Beef Cattle Option")
      const hasInlineList = $child.find("ul, ol").length > 0;

      const $clone = $child.clone();
      $clone.find("ul, ol").remove();
      $clone.find("br").replaceWith(" ");
      let textOnly = $clone.text().trim();
      textOnly = textOnly.replace(/\s+/g, " ");

      const resourcesMatch = textOnly.match(/Resources:([\s\S]*)/i);
      const cleanText = resourcesMatch
        ? textOnly.substring(0, textOnly.indexOf("Resources:")).trim()
        : textOnly;

      const resources: BadgeResource[] = [];
      $child.find("a").each((_, linkEl) => {
        const $link = $(linkEl);
        const href = $link.attr("href");
        const title = $link.text().trim();
        if (href && title) {
          resources.push({ title, url: href });
        }
      });

      // Use text hash for deduplication to handle duplicate HTML from Scouting.org
      const textKey = cleanText.substring(0, 50);
      if (subrequirementsMap.has(textKey)) return; // Skip duplicate

      // Generate slugified ID for named options, or fallback to numbered option
      const optionIsNamed = isNamedOption(cleanText);
      const optionId = optionIsNamed
        ? slugifyOption(cleanText)
        : `option${subrequirementsMap.size + 1}`;
      const reqPath = computePath(parentPath, optionId);

      // Get nested subrequirements (recursive!)
      let nested: BadgeRequirement[] = [];
      const childReqIdMatch = $child
        .attr("class")
        ?.match(/mb-requirement-id-(\d+)/);
      const childReqId = childReqIdMatch ? childReqIdMatch[1] : null;

      if (childReqId) {
        nested = extractSubrequirements($, childReqId, reqPath);
      }

      // If there are inline lists and no nested children, extract them
      // Use children() to only get direct child lists, not nested navigation
      if (hasInlineList && nested.length === 0) {
        $child.children("ul, ol").each((_, listEl) => {
          $(listEl)
            .children("li")
            .each((liIdx, liEl) => {
              let liText = $(liEl).text().trim();
              liText = liText.replace(/\s+/g, " ");
              if (liText) {
                const inlineReqId = `${liIdx + 1}`;
                nested.push({
                  req_id: inlineReqId,
                  path: computePath(reqPath, inlineReqId),
                  text: liText,
                });
              }
            });
        });
      }

      subrequirementsMap.set(textKey, {
        req_id: optionId,
        path: reqPath,
        text: cleanText,
        is_option: optionIsNamed ? true : undefined,
        resources: resources.length > 0 ? resources : undefined,
        subrequirements: nested.length > 0 ? nested : undefined,
      });
    }
  });

  return Array.from(subrequirementsMap.values());
}

async function scrapeBadgePage(client: Impit, url: string) {
  const res = await client.fetch(url);
  if (res.status !== 200) throw new Error(`Status ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  // Extract pamphlet link
  let pamphletUrl: string | undefined = undefined;
  $("a").each((_, linkEl) => {
    const $link = $(linkEl);
    const linkText = $link.text().trim().toLowerCase();
    const href = $link.attr("href");

    // Look for exact phrase "download the free pamphlet" and ensure href is a PDF
    if (linkText === "download the free pamphlet" && href?.endsWith(".pdf")) {
      pamphletUrl = href;
      return false; // Break the loop
    }
  });

  // Process each parent requirement
  // Use Map to deduplicate by req_id (Scouting.org HTML has duplicate parent requirements)
  const requirementsMap = new Map<string, BadgeRequirement>();

  $(".mb-requirement-parent").each((_, parentEl) => {
    const $parent = $(parentEl);
    const numText = $parent.find(".mb-requirement-listnumber").first().text().trim();

    // Skip non-numbered items (like NOTE)
    if (!numText || numText === "") return;

    const reqId = numText.replace(/\.$/, "");

    // Skip if we've already processed this requirement number
    if (requirementsMap.has(reqId)) return;

    // Extract parent requirement ID for finding children
    const parentIdMatch = $parent
      .attr("class")
      ?.match(/mb-requirement-id-(\d+)/);
    const parentId = parentIdMatch ? parentIdMatch[1] : null;

    // Get text (remove number span, lists, and resources)
    const $clone = $parent.clone();
    $clone.find(".mb-requirement-listnumber").remove();

    // Check if parent has a list - if so, those become subrequirements
    const hasInlineList = $clone.find("ul, ol").length > 0;
    $clone.find("ul, ol").remove(); // Remove lists from text

    $clone.find("br").replaceWith(" "); // Convert br to space, not newline
    let fullText = $clone.text().trim();

    // Clean up whitespace and newlines
    fullText = fullText.replace(/\s+/g, " ").trim();

    // Split text and resources (Resources: appears after main text)
    const resourcesMatch = fullText.match(/Resources:([\s\S]*)/i);
    let text = resourcesMatch
      ? fullText.substring(0, fullText.indexOf("Resources:")).trim()
      : fullText;

    // Extract resources from links
    const resources: BadgeResource[] = [];
    $parent.find("a").each((_, linkEl) => {
      const $link = $(linkEl);
      const href = $link.attr("href");
      const title = $link.text().trim();
      if (href && title) {
        resources.push({ title, url: href });
      }
    });

    // Find child requirements using recursive extraction
    let subrequirements: BadgeRequirement[] = [];

    if (parentId) {
      // Use new recursive function to extract all nested children
      subrequirements = extractSubrequirements($, parentId, reqId);
    }

    // Fallback: Inline lists at parent level (if no children were found via recursion)
    // Use children() to only get direct child lists, not nested navigation
    if (hasInlineList && subrequirements.length === 0) {
      $parent.children("ul, ol").each((_, listEl) => {
        $(listEl)
          .children("li")
          .each((idx, liEl) => {
            let liText = $(liEl).text().trim();
            liText = liText.replace(/\s+/g, " "); // Clean whitespace
            if (liText) {
              const inlineReqId = `option${idx + 1}`;
              subrequirements.push({
                req_id: inlineReqId,
                path: computePath(reqId, inlineReqId),
                text: liText,
              });
            }
          });
      });
    }

    // Detect subrequirement mode
    let subrequirementMode = undefined;
    if (subrequirements.length > 0) {
      // Check for "do ONE of the following", "choose TWO", etc.
      const selectMatch = text.match(
        /\b(ONE|TWO|THREE|FOUR|FIVE)\s+of\s+the\s+following/i,
      );
      if (selectMatch && selectMatch[1]) {
        const countMap: Record<string, number> = {
          ONE: 1,
          TWO: 2,
          THREE: 3,
          FOUR: 4,
          FIVE: 5,
        };
        subrequirementMode = {
          type: "select" as const,
          count: countMap[selectMatch[1].toUpperCase()] || 1,
        };
      } else {
        // Default: must complete all
        subrequirementMode = { type: "all" as const };
      }
    }

    requirementsMap.set(reqId, {
      req_id: reqId,
      path: reqId, // Top-level requirements have path equal to their ID
      text: text,
      resources: resources.length > 0 ? resources : undefined,
      subrequirements: subrequirements.length > 0 ? subrequirements : undefined,
      subrequirement_mode: subrequirementMode,
    });
  });

  // Convert Map to array - return directly without sections wrapper
  const requirements = Array.from(requirementsMap.values());

  return { requirements, pamphlet_url: pamphletUrl };
}
