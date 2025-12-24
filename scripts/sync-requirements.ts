import * as cheerio from "cheerio";
import { Impit } from "impit";
import { join } from "path";
import { mkdir } from "fs/promises";
import slugify from "slugify";

// CONFIGURATION
const BADGES_DATA_DIR = join(import.meta.dir, "../hugo/data/badges");
const CONTENT_DIR = join(import.meta.dir, "../hugo/content/merit-badges");
const INDEX_URL = "https://www.scouting.org/skills/merit-badges/all/";
const randomDelay = () =>
  new Promise(res => setTimeout(res, 500 + Math.random() * 1000));

// Test mode or single badge mode
const SINGLE_BADGE = process.env.BADGE_NAME; // e.g., BADGE_NAME="american-business"
const TEST_BADGES = process.env.TEST_MODE
  ? [
      {
        title: "Archery",
        url: "https://www.scouting.org/merit-badges/archery/",
      },
      {
        title: "Camping",
        url: "https://www.scouting.org/merit-badges/camping/",
      },
      {
        title: "First Aid",
        url: "https://www.scouting.org/merit-badges/first-aid/",
      },
    ]
  : null;

// TYPES
interface BadgeResource {
  title: string;
  url: string;
}

interface BadgeRequirement {
  req_id: string;
  text: string;
  counselor_note?: string;
  resources?: BadgeResource[];
  subrequirements?: BadgeRequirement[];
  subrequirement_mode?: {
    type: "all" | "select";
    count?: number; // For "select ONE", "select TWO", etc.
  };
}

interface BadgeData {
  id: string;
  title: string;
  slug: string;
  url: string;
  eagle_required?: boolean;
  sections: {
    title: string;
    requirements: BadgeRequirement[];
  }[];
}

console.log("🚀 Starting Merit Badge Sync (Bun Edition)...");

// 1. Initialize Impit (TLS Fingerprint Mimicry)
const client = new Impit({
  browser: "chrome",
  timeout: 30000,
});

// 2. Ensure content directory exists
await Bun.write(join(CONTENT_DIR, ".gitkeep"), "");

// 3. Helper to load existing badge
async function loadExistingBadge(slug: string): Promise<BadgeData | null> {
  const filePath = join(BADGES_DATA_DIR, `${slug}.json`);
  const file = Bun.file(filePath);
  if (await file.exists()) {
    try {
      return await file.json();
    } catch (e) {
      return null;
    }
  }
  return null;
}

let successCount = 0;
let errorCount = 0;

// 4. Determine badge list
let badgeList: { title: string; href: string; eagle_required: boolean }[] = [];

if (SINGLE_BADGE) {
  console.log(`🎯 Single badge mode: ${SINGLE_BADGE}`);
  const badgeUrl = `https://www.scouting.org/merit-badges/${SINGLE_BADGE}/`;
  const titleCase = SINGLE_BADGE.split("-")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  badgeList = [{ title: titleCase, href: badgeUrl, eagle_required: false }];
} else if (TEST_BADGES) {
  console.log(`🧪 Test mode: processing ${TEST_BADGES.length} badges`);
  badgeList = TEST_BADGES.map(b => ({
    title: b.title,
    href: b.url,
    eagle_required: false,
  }));
} else {
  // 3a. Fetch Master Index
  console.log(`📡 Fetching Master Index: ${INDEX_URL}`);
  const indexRes = await client.fetch(INDEX_URL);

  if (indexRes.status !== 200)
    throw new Error(`Index Fetch Failed: ${indexRes.status}`);

  const indexHtml = await indexRes.text();
  const $ = cheerio.load(indexHtml);

  // Find all merit badge title links (h2.mb-card-title a)
  $("h2.mb-card-title a").each((_, el) => {
    const $link = $(el);
    const href = $link.attr("href");
    const text = $link.text().trim();

    // Match /merit-badges/badgename/ pattern (relative URLs)
    if (href?.match(/^\/merit-badges\/[^\/]+\/$/) && text) {
      // Check if this badge card has .mb-eagle (eagle required indicator)
      const card = $link.closest('[class*="mb-card-bg"]');
      const isEagleRequired = card.find(".mb-eagle").length > 0;

      // Convert relative to absolute URL
      const fullUrl = `https://www.scouting.org${href}`;
      badgeList.push({
        title: text,
        href: fullUrl,
        eagle_required: isEagleRequired,
      });
    }
  });

  console.log(`🔎 Found ${badgeList.length} badges.`);
}

// 5. Main Loop (sequential for stability)
for (const { title, href, eagle_required } of badgeList) {
  const slug = slugify(title, { lower: true, strict: true });
  console.log(`Processing: ${title}...`);

  try {
    // Scrape Page
    const reqs = await scrapeBadgePage(client, href);

    // Load existing data for this badge
    const existing = await loadExistingBadge(slug);

    const mergedBadge: BadgeData = {
      ...existing, // Keeps heroImage, products, etc.
      id: slug,
      title: title,
      slug: slug,
      url: href,
      eagle_required: eagle_required,
      sections: mergeSections(existing?.sections || [], reqs),
    };

    // Create page bundle directory
    const badgeDir = join(CONTENT_DIR, slug);
    await mkdir(badgeDir, { recursive: true });

    // Check if data.json changed before writing
    const dataPath = join(badgeDir, 'data.json');
    const newDataJson = JSON.stringify(mergedBadge, null, 2);
    const dataFile = Bun.file(dataPath);
    const dataChanged = !(await dataFile.exists()) || (await dataFile.text()) !== newDataJson;

    // Check if index.md changed before writing
    const indexPath = join(badgeDir, 'index.md');
    const markdown = `---
title: "${title}"
eagle_required: ${eagle_required}
---
`;
    const indexFile = Bun.file(indexPath);
    const indexChanged = !(await indexFile.exists()) || (await indexFile.text()) !== markdown;

    // Write files if changed
    if (dataChanged) {
      await Bun.write(dataPath, newDataJson);
    }
    if (indexChanged) {
      await Bun.write(indexPath, markdown);
    }

    // Log what happened
    if (dataChanged || indexChanged) {
      const parts = [];
      if (dataChanged) parts.push('data.json');
      if (indexChanged) parts.push('index.md');
      console.log(`  ✏️  Updated ${parts.join(' & ')} for ${title}`);
    } else {
      console.log(`  ⏭️  Skipped ${title} (no changes)`);
    }

    successCount++;

    await randomDelay();
  } catch (err) {
    console.error(`❌ Failed ${title}: ${(err as Error).message}`);
    errorCount++;
  }
}

console.log(
  `\n✅ Sync complete. ${successCount} badges saved, ${errorCount} errors.`,
);

// --- HELPERS ---

/**
 * Recursively extract subrequirements from a parent element
 * Handles both standard (a), (b) format and named options
 * Also handles inline lists and nested children at any depth
 */
function extractSubrequirements(
  $: cheerio.CheerioAPI,
  parentId: string,
): BadgeRequirement[] {
  const subrequirements: BadgeRequirement[] = [];

  $(`.mb-requirement-child.mb-parent-${parentId}`).each((childIdx, childEl) => {
    const $child = $(childEl);
    let childText = $child.text().trim();
    childText = childText.replace(/\s+/g, " ");

    // Try to match standard format: (a) Some text
    const match = childText.match(/^\(([a-z0-9]+)\)\s+([\s\S]*)/i);

    if (match && match[1] && match[2]) {
      // Standard format with letter/number ID
      const reqId = match[1];

      // Check for inline lists
      const hasInlineList = $child.find("ul, ol").length > 0;

      // Get text without inline lists
      const $clone = $child.clone();
      $clone.find("ul, ol").remove();
      $clone.find(".mb-requirement-listnumber").remove();
      $clone.find("br").replaceWith(" ");
      let textOnly = $clone.text().trim();
      textOnly = textOnly.replace(/\s+/g, " ");
      textOnly = textOnly.replace(/^\([a-z0-9]+\)\s+/i, "");

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

      // Get nested subrequirements (recursive!)
      let nested: BadgeRequirement[] = [];
      const childReqIdMatch = $child.attr("class")?.match(/mb-requirement-id-(\d+)/);
      const childReqId = childReqIdMatch ? childReqIdMatch[1] : null;

      if (childReqId) {
        // Recursively extract children
        nested = extractSubrequirements($, childReqId);
      }

      // If there are inline lists, extract them as additional subrequirements
      if (hasInlineList && nested.length === 0) {
        $child.find("ul, ol").each((_, listEl) => {
          $(listEl).find("li").each((liIdx, liEl) => {
            let liText = $(liEl).text().trim();
            liText = liText.replace(/\s+/g, " ");
            if (liText) {
              nested.push({
                req_id: `${liIdx + 1}`,
                text: liText,
              });
            }
          });
        });
      }

      subrequirements.push({
        req_id: reqId,
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

      // Get nested subrequirements (recursive!)
      let nested: BadgeRequirement[] = [];
      const childReqIdMatch = $child.attr("class")?.match(/mb-requirement-id-(\d+)/);
      const childReqId = childReqIdMatch ? childReqIdMatch[1] : null;

      if (childReqId) {
        nested = extractSubrequirements($, childReqId);
      }

      // If there are inline lists and no nested children, extract them
      if (hasInlineList && nested.length === 0) {
        $child.find("ul, ol").each((_, listEl) => {
          $(listEl).find("li").each((liIdx, liEl) => {
            let liText = $(liEl).text().trim();
            liText = liText.replace(/\s+/g, " ");
            if (liText) {
              nested.push({
                req_id: `${liIdx + 1}`,
                text: liText,
              });
            }
          });
        });
      }

      subrequirements.push({
        req_id: `option${childIdx + 1}`,
        text: cleanText,
        resources: resources.length > 0 ? resources : undefined,
        subrequirements: nested.length > 0 ? nested : undefined,
      });
    }
  });

  return subrequirements;
}

async function scrapeBadgePage(client: Impit, url: string) {
  const res = await client.fetch(url);
  if (res.status !== 200) throw new Error(`Status ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  const sections: any[] = [];
  const requirements: BadgeRequirement[] = [];

  // Process each parent requirement
  $(".mb-requirement-parent").each((_, parentEl) => {
    const $parent = $(parentEl);
    const numText = $parent.find(".mb-requirement-listnumber").text().trim();

    // Skip non-numbered items (like NOTE)
    if (!numText || numText === "") return;

    const reqId = numText.replace(/\.$/, "");

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
      subrequirements = extractSubrequirements($, parentId);
    }

    // Fallback: Inline lists at parent level (if no children were found via recursion)
    if (hasInlineList && subrequirements.length === 0) {
      $parent.find("ul, ol").each((_, listEl) => {
        $(listEl)
          .find("li")
          .each((idx, liEl) => {
            let liText = $(liEl).text().trim();
            liText = liText.replace(/\s+/g, " "); // Clean whitespace
            if (liText) {
              subrequirements.push({
                req_id: `option${idx + 1}`,
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

    requirements.push({
      req_id: reqId,
      text: text,
      resources: resources.length > 0 ? resources : undefined,
      subrequirements: subrequirements.length > 0 ? subrequirements : undefined,
      subrequirement_mode: subrequirementMode,
    });
  });

  if (requirements.length > 0) {
    sections.push({ title: "Requirements", requirements });
  }

  return sections;
}

function mergeSections(oldSections: any[], newSections: any[]) {
  return newSections.map(newSec => ({
    ...newSec,
    requirements: newSec.requirements.map((newReq: any) => {
      let existingNote: string | undefined = undefined;
      let existingSubreqs: BadgeRequirement[] | undefined = undefined;

      // Find existing requirement with same ID
      oldSections.forEach(os => {
        const found = os.requirements?.find(
          (r: any) => r.req_id === newReq.req_id,
        );
        if (found) {
          existingNote = found.counselor_note;
          existingSubreqs = found.subrequirements;
        }
      });

      // Merge subrequirements if they exist
      let mergedSubreqs = newReq.subrequirements;
      if (existingSubreqs && newReq.subrequirements) {
        mergedSubreqs = newReq.subrequirements.map((newSub: any) => {
          const foundSub = existingSubreqs!.find(
            (s: any) => s.req_id === newSub.req_id,
          );
          return {
            ...newSub,
            counselor_note: foundSub?.counselor_note || newSub.counselor_note,
          };
        });
      }

      return {
        ...newReq,
        counselor_note: existingNote,
        subrequirements: mergedSubreqs,
      };
    }),
  }));
}
