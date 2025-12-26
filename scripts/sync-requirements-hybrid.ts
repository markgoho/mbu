/**
 * Hybrid Approach: Structure from HTML/Cheerio + Content from Firecrawl LLM
 *
 * 1. Firecrawl fetches HTML → Cheerio parses structure (reliable parent-child)
 * 2. Firecrawl LLM extracts clean text + resources (smart filtering)
 * 3. Merge: structure from Cheerio, content from LLM
 */

import Firecrawl from "@mendable/firecrawl-js";
import * as cheerio from "cheerio";
import { z } from "zod";
import { findBadgeBySlug } from "./merit-badges";

const apiKey = process.env.FIRECRAWL_API_KEY;
if (!apiKey) {
  console.error("❌ FIRECRAWL_API_KEY environment variable is required");
  process.exit(1);
}

const firecrawl = new Firecrawl({ apiKey });

const TEST_BADGE = process.env.BADGE_NAME || "camping";
const badge = findBadgeBySlug(TEST_BADGE);

if (!badge) {
  console.error(`Badge not found: ${TEST_BADGE}`);
  process.exit(1);
}

console.log(`🔀 Hybrid extraction: ${badge.title}`);
console.log(`📍 URL: ${badge.url}`);
console.log("---");

// =============================================================================
// TYPES
// =============================================================================

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
  subrequirement_mode?: { type: "all" | "select"; count?: number };
}

interface BadgeData {
  title: string;
  slug: string;
  url: string;
  eagle_required?: boolean;
  pamphlet_url?: string;
  requirements: Requirement[];
}

// =============================================================================
// ZOD SCHEMA FOR LLM EXTRACTION (simplified - just text and resources)
// =============================================================================

const ResourceSchema = z.object({
  title: z.string().describe("Resource link display text"),
  url: z.string().describe("Resource URL"),
});

const RequirementContentSchema = z.object({
  path: z
    .string()
    .describe("The requirement path like '1', '1.a', '6.beef-cattle.a'"),
  text: z
    .string()
    .describe("Clean requirement text WITHOUT 'Resource:' suffix"),
  resources: z
    .array(ResourceSchema)
    .optional()
    .describe(
      "Actual resource links (videos, articles) - NOT navigation links",
    ),
});

const ContentExtractionSchema = z.object({
  pamphlet_url: z.string().optional().describe("URL to the free pamphlet PDF"),
  requirements: z
    .array(RequirementContentSchema)
    .describe("All requirements with their clean text and resources"),
});

const contentPrompt = `Extract the clean text and resources for each merit badge requirement.

CRITICAL RULES:
1. For each requirement path (1, 1.a, 1.b, 2, 2.a, etc.), extract:
   - The clean requirement text (remove any "Resource:" suffix from the text)
   - Any actual resource links (videos, articles, PDFs) that are EXPLICITLY on the page
2. ONLY include actual educational resources that exist on the page, NOT:
   - Navigation links (My.scouting, Give, Scoutshop, Programs, etc.)
   - Footer links
   - Social media links
   - NEVER invent or hallucinate URLs - only include URLs that appear in the HTML
3. Include ALL requirements including deeply nested ones (like 6.beef-cattle.a)
4. For named options (like "Beef Cattle Option"), use the path format: 6.beef-cattle, 6.dairy, 6.horse, etc.
5. The pamphlet URL usually has "download the free pamphlet" text`;

const jsonSchema = z.toJSONSchema(ContentExtractionSchema);

// =============================================================================
// CHEERIO STRUCTURE EXTRACTION (from current scraper)
// =============================================================================

function computePath(parentPath: string, reqId: string): string {
  return parentPath ? `${parentPath}.${reqId}` : reqId;
}

function slugifyOption(text: string): string | null {
  if (!text) return null;

  // Extract the name before "Option" (e.g., "Sheep or Goat Option ..." -> "Sheep or Goat")
  const optionMatch = text.match(/^(.+?)\s*option\b/i);
  const nameToSlugify = optionMatch ? optionMatch[1] : text.substring(0, 200);

  const slug = nameToSlugify
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  if (slug.length > 100 || slug.length === 0) return null;
  return slug;
}

function isNamedOption(text: string): boolean {
  return /\boption\b/i.test(text);
}

// Track paths that have inline lists extracted (don't overwrite their text with LLM)
const pathsWithInlineLists = new Set<string>();

function extractSubrequirements(
  $: cheerio.CheerioAPI,
  parentId: string,
  parentPath: string,
): Requirement[] {
  const subrequirementsMap = new Map<string, Requirement>();

  $(`.mb-requirement-child.mb-parent-${parentId}`).each((_, childEl) => {
    const $child = $(childEl);

    // Get raw text for ID extraction
    const $clone = $child.clone();
    $clone.find("ul, ol, .mb-requirement-listnumber").remove();
    $clone.find("br").replaceWith(" ");
    let childText = $clone.text().trim().replace(/\s+/g, " ");

    // Try to match standard format: (a) Some text OR numbered format: 1. Some text
    const letterMatch = childText.match(/^\(([a-z0-9]+)\)\s+([\s\S]*)/i);
    const numberMatch = childText.match(/^(\d+)\.\s+([\s\S]*)/i);
    const match = letterMatch || numberMatch;

    if (match && match[1] && match[2]) {
      const reqId = match[1];
      if (subrequirementsMap.has(reqId)) return;

      const reqPath = computePath(parentPath, reqId);

      // Check for inline lists
      const hasInlineList = $child.find("ul, ol").length > 0;

      // Get text WITHOUT inline lists for cleaner extraction
      const $textClone = $child.clone();
      $textClone.find("ul, ol, .mb-requirement-listnumber").remove();
      $textClone.find("br").replaceWith(" ");
      let textOnly = $textClone
        .text()
        .trim()
        .replace(/\s+/g, " ")
        .replace(/^\([a-z0-9]+\)\s*/i, ""); // Remove leading (a) etc.

      // Strip "Resources:" suffix and everything after
      const resourcesMatch = textOnly.match(/Resources?:/i);
      const cleanText = resourcesMatch
        ? textOnly.substring(0, textOnly.search(/Resources?:/i)).trim()
        : textOnly;

      // Get nested subrequirements from DOM structure
      let nested: Requirement[] = [];
      const childReqIdMatch = $child
        .attr("class")
        ?.match(/mb-requirement-id-(\d+)/);
      const childReqId = childReqIdMatch ? childReqIdMatch[1] : null;

      if (childReqId) {
        nested = extractSubrequirements($, childReqId, reqPath);
      }

      // If there are inline lists and no nested DOM children, extract list items
      if (hasInlineList && nested.length === 0) {
        $child.children("ul, ol").each((_, listEl) => {
          $(listEl)
            .children("li")
            .each((liIdx, liEl) => {
              let liText = $(liEl).text().trim().replace(/\s+/g, " ");
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
        // Mark this path as having inline lists (don't overwrite with LLM text)
        if (nested.length > 0) {
          pathsWithInlineLists.add(reqPath);
        }
      }

      // Detect subrequirement mode from text
      let subrequirementMode:
        | { type: "all" | "select"; count?: number }
        | undefined;
      if (nested.length > 0) {
        const selectMatch = cleanText.match(
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
            type: "select",
            count: countMap[selectMatch[1].toUpperCase()] || 1,
          };
        } else {
          subrequirementMode = { type: "all" };
        }
      }

      subrequirementsMap.set(reqId, {
        req_id: reqId,
        path: reqPath,
        text: cleanText, // Store clean HTML text (without inline lists)
        subrequirements: nested.length > 0 ? nested : undefined,
        subrequirement_mode: subrequirementMode,
      });
    } else if (childText) {
      // Named option
      const optionIsNamed = isNamedOption(childText);
      let optionId = optionIsNamed ? slugifyOption(childText) : null;
      if (!optionId) {
        optionId = `option${subrequirementsMap.size + 1}`;
      }

      const textKey = childText.substring(0, 50);
      if (subrequirementsMap.has(textKey)) return;

      const reqPath = computePath(parentPath, optionId);

      let nested: Requirement[] = [];
      const childReqIdMatch = $child
        .attr("class")
        ?.match(/mb-requirement-id-(\d+)/);
      const childReqId = childReqIdMatch ? childReqIdMatch[1] : null;

      if (childReqId) {
        nested = extractSubrequirements($, childReqId, reqPath);
      }

      // For named options, use the full text as the label
      const optionLabel = childText.trim();

      subrequirementsMap.set(textKey, {
        req_id: optionId,
        path: reqPath,
        text: optionLabel, // Use HTML text for option labels
        is_option: optionIsNamed ? true : undefined,
        subrequirements: nested.length > 0 ? nested : undefined,
        subrequirement_mode: nested.length > 0 ? { type: "all" } : undefined,
      });
    }
  });

  return Array.from(subrequirementsMap.values());
}

function parseStructureFromHtml(html: string): {
  requirements: Requirement[];
  pamphlet_url?: string;
} {
  const $ = cheerio.load(html);

  // Remove noise
  $("script, style, nav, header, footer").remove();

  // Extract pamphlet URL
  let pamphletUrl: string | undefined;
  $("a").each((_, linkEl) => {
    const $link = $(linkEl);
    const linkText = $link.text().trim().toLowerCase();
    const href = $link.attr("href");
    if (linkText === "download the free pamphlet" && href?.endsWith(".pdf")) {
      pamphletUrl = href;
      return false;
    }
  });

  const requirementsMap = new Map<string, Requirement>();

  $(".mb-requirement-parent").each((_, parentEl) => {
    const $parent = $(parentEl);
    const numText = $parent
      .find(".mb-requirement-listnumber")
      .first()
      .text()
      .trim();

    if (!numText || numText === "") return;

    const reqId = numText.replace(/\.$/, "");
    if (requirementsMap.has(reqId)) return;

    const parentIdMatch = $parent
      .attr("class")
      ?.match(/mb-requirement-id-(\d+)/);
    const parentId = parentIdMatch ? parentIdMatch[1] : null;

    // Get subrequirements
    let subrequirements: Requirement[] = [];
    if (parentId) {
      subrequirements = extractSubrequirements($, parentId, reqId);
    }

    // Get clean parent text
    const $clone = $parent.clone();
    $clone.find(".mb-requirement-listnumber, ul, ol").remove();
    let parentTextRaw = $clone.text().trim().replace(/\s+/g, " ");

    // Strip "Resources:" suffix and everything after
    const resourcesMatch = parentTextRaw.match(/Resources?:/i);
    const parentText = resourcesMatch
      ? parentTextRaw.substring(0, parentTextRaw.search(/Resources?:/i)).trim()
      : parentTextRaw;

    let subrequirementMode:
      | { type: "all" | "select"; count?: number }
      | undefined;
    if (subrequirements.length > 0) {
      const selectMatch = parentText.match(
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
          type: "select",
          count: countMap[selectMatch[1].toUpperCase()] || 1,
        };
      } else {
        subrequirementMode = { type: "all" };
      }
    }

    requirementsMap.set(reqId, {
      req_id: reqId,
      path: reqId,
      text: parentText, // Store HTML text, will be enhanced by LLM
      subrequirements: subrequirements.length > 0 ? subrequirements : undefined,
      subrequirement_mode: subrequirementMode,
    });
  });

  // Sort requirements
  const requirements = Array.from(requirementsMap.values()).sort((a, b) => {
    const aNum = parseInt(a.req_id);
    const bNum = parseInt(b.req_id);
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    return a.req_id.localeCompare(b.req_id);
  });

  return { requirements, pamphlet_url: pamphletUrl };
}

// =============================================================================
// MERGE LOGIC
// =============================================================================

type ContentMap = Map<string, { text: string; resources?: Resource[] }>;

function buildContentMap(
  llmData: z.infer<typeof ContentExtractionSchema>,
): ContentMap {
  const map = new Map<string, { text: string; resources?: Resource[] }>();
  for (const req of llmData.requirements) {
    map.set(req.path, {
      text: req.text,
      resources:
        req.resources && req.resources.length > 0 ? req.resources : undefined,
    });
  }
  return map;
}

function mergeContent(
  requirements: Requirement[],
  contentMap: ContentMap,
): void {
  for (const req of requirements) {
    const content = contentMap.get(req.path);

    // ONLY merge resources from LLM - the LLM can't reliably map text to paths
    // HTML text is preserved for all requirements
    if (content?.resources) {
      req.resources = content.resources;
    }

    // Recursively merge subrequirements
    if (req.subrequirements) {
      mergeContent(req.subrequirements, contentMap);
    }
  }
}

// =============================================================================
// MAIN
// =============================================================================

console.log(
  "\n📡 Step 1: Fetching HTML and LLM extraction from Firecrawl...\n",
);

try {
  // Fetch both HTML and LLM extraction in one call
  const result = await firecrawl.scrape(badge.url, {
    formats: [
      "html",
      {
        type: "json",
        schema: jsonSchema,
        prompt: contentPrompt,
      },
    ],
  });

  if (!result.html) {
    console.error("❌ No HTML returned");
    process.exit(1);
  }

  console.log(`   HTML: ${result.html.length} chars`);

  // Step 2: Parse structure from HTML
  console.log("\n🔧 Step 2: Parsing structure from HTML with Cheerio...\n");
  const { requirements: structure, pamphlet_url: htmlPamphletUrl } =
    parseStructureFromHtml(result.html);

  console.log(`   Found ${structure.length} top-level requirements`);

  // Step 3: Get content from LLM
  console.log("\n🤖 Step 3: Getting clean text/resources from LLM...\n");
  const llmContent = result.json as
    | z.infer<typeof ContentExtractionSchema>
    | undefined;

  if (!llmContent || !llmContent.requirements) {
    console.error("❌ No LLM content extracted");
    console.log("   Falling back to HTML-only extraction...");
  } else {
    console.log(
      `   LLM extracted ${llmContent.requirements.length} requirement entries`,
    );

    // Step 4: Merge
    console.log("\n🔀 Step 4: Merging structure + content...\n");
    const contentMap = buildContentMap(llmContent);
    mergeContent(structure, contentMap);
  }

  // Build final data
  const badgeData: BadgeData = {
    title: badge.title,
    slug: badge.slug,
    url: badge.url,
    eagle_required: badge.eagle_required,
    pamphlet_url: llmContent?.pamphlet_url || htmlPamphletUrl,
    requirements: structure,
  };

  console.log("--- MERGED DATA ---");
  console.log(JSON.stringify(badgeData, null, 2));
  console.log("\n--- END DATA ---");

  // Stats
  let totalSubs = 0;
  let maxDepth = 1;
  let resourceCount = 0;
  let emptyText = 0;

  function countStats(reqs: Requirement[], depth: number) {
    for (const req of reqs) {
      if (req.resources) resourceCount += req.resources.length;
      if (!req.text) emptyText++;
      if (req.subrequirements) {
        totalSubs += req.subrequirements.length;
        maxDepth = Math.max(maxDepth, depth + 1);
        countStats(req.subrequirements, depth + 1);
      }
    }
  }
  countStats(structure, 1);

  console.log("\n📈 Summary:");
  console.log(`   Top-level requirements: ${structure.length}`);
  console.log(`   Total subrequirements: ${totalSubs}`);
  console.log(`   Max depth: ${maxDepth}`);
  console.log(`   Resources: ${resourceCount}`);
  console.log(`   Empty text (merge failures): ${emptyText}`);
  console.log(`   Pamphlet URL: ${badgeData.pamphlet_url || "Not found"}`);

  // Write output
  const outputPath = `hugo/content/merit-badges/${badge.slug}/data.json`;
  await Bun.write(outputPath, JSON.stringify(badgeData, null, 2));
  console.log(`\n📝 Written to: ${outputPath}`);
} catch (err) {
  console.error("❌ Error:", (err as Error).message);
  console.error((err as Error).stack);
}

console.log("\n✨ Hybrid extraction complete!");
