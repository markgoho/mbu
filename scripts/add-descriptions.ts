import { $ } from "bun";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { MERIT_BADGES, findBadgeBySlug, type MeritBadge } from "./merit-badges";

// CONFIGURATION
const CONTENT_DIR = join(import.meta.dir, "../hugo/content/merit-badges");
const randomDelay = () =>
  new Promise(res => setTimeout(res, 1000 + Math.random() * 1000));

// Single badge mode: BADGE_NAME="camping" bun run scripts/add-descriptions.ts
const SINGLE_BADGE = process.env.BADGE_NAME;
// Test mode with a few badges: TEST_MODE=1 bun run scripts/add-descriptions.ts
const TEST_MODE = process.env.TEST_MODE;
const TEST_BADGE_SLUGS = [
  "archery",
  "camping",
  "first-aid",
  "cooking",
  "hiking",
];

// TYPES
interface BadgeData {
  title: string;
  slug: string;
  url: string;
  eagle_required?: boolean;
  requirements: Array<{
    req_id: string;
    text: string;
  }>;
}

console.log("🚀 Starting Merit Badge Description Generator...");
console.log(`📋 Using badge list with ${MERIT_BADGES.length} badges`);

let successCount = 0;
let errorCount = 0;

// Determine which badges to process
let badgeList: MeritBadge[] = [];

if (SINGLE_BADGE) {
  console.log(`🎯 Single badge mode: ${SINGLE_BADGE}`);
  const badge = findBadgeBySlug(SINGLE_BADGE);
  if (!badge) {
    throw new Error(`Badge not found: ${SINGLE_BADGE}`);
  }
  badgeList = [badge];
} else if (TEST_MODE) {
  console.log(`🧪 Test mode: processing ${TEST_BADGE_SLUGS.length} badges`);
  badgeList = TEST_BADGE_SLUGS.map(slug => {
    const badge = findBadgeBySlug(slug);
    if (!badge) {
      throw new Error(`Badge not found: ${slug}`);
    }
    return badge;
  });
} else {
  badgeList = [...MERIT_BADGES];
  console.log(`🔎 Processing all ${badgeList.length} badges.`);
}

// Helper function to load badge data
function loadBadgeData(slug: string): BadgeData | null {
  const dataPath = join(CONTENT_DIR, slug, "data.json");

  if (!existsSync(dataPath)) {
    console.warn(`⚠️  data.json not found for ${slug}`);
    return null;
  }

  try {
    const content = readFileSync(dataPath, "utf-8");
    return JSON.parse(content) as BadgeData;
  } catch (err) {
    console.error(`❌ Error reading data.json for ${slug}:`, err);
    return null;
  }
}

// Helper function to generate description using Claude CLI
async function generateDescription(
  badge: MeritBadge,
  requirements: string[],
): Promise<string | null> {
  const eagleText = badge.eagle_required ? " Eagle-required" : "";

  const reqText = requirements.slice(0, 3).join("\n- ");

  const prompt = `Generate an SEO meta description for the ${badge.title} merit badge requirements page.

Requirements summary:
- ${reqText}

The description should:
- Be descriptive and specific about what scouts will learn and do
- Include key skills, activities, or topics covered
- Be 150-160 characters (optimal for search snippets)
- End with "to earn this${eagleText} merit badge"
- Use active, engaging language

Return ONLY the description text, no additional commentary.`;

  try {
    // Execute Claude CLI
    const result = await $`clod4 -p ${prompt}`.text();

    // Parse and clean the output - extract just the last non-empty line
    // (skip the startup banner and diagnostic output)
    const lines = result.split("\n").filter(line => line.trim());
    if (lines.length === 0) {
      console.error(`❌ No output received from Claude CLI for ${badge.title}`);
      return null;
    }
    const description = lines[lines.length - 1]!.trim();

    // Validate length - aim for 150-160, but accept 140-170
    if (description.length < 140 || description.length > 170) {
      console.warn(
        `⚠️  Description length (${description.length}) out of optimal range for ${badge.title}`,
      );

      // Retry once with stricter prompt
      const retryPrompt = `Generate an SEO meta description for the ${badge.title} merit badge. IMPORTANT: Must be 150-160 characters. Current attempt was ${description.length} characters.

Requirements summary:
- ${reqText}

Be specific about what scouts learn and do. End with "to earn this${eagleText} merit badge". Return ONLY the description text.`;

      try {
        const retryResult = await $`clod4 -p ${retryPrompt}`.text();
        const retryLines = retryResult.split("\n").filter(line => line.trim());
        if (retryLines.length === 0) {
          console.error(
            `❌ No retry output received from Claude CLI for ${badge.title}`,
          );
          return description; // Use original even if out of range
        }
        const retryDescription = retryLines[retryLines.length - 1]!.trim();

        if (retryDescription.length >= 140 && retryDescription.length <= 170) {
          return retryDescription;
        }

        console.warn(
          `⚠️  Retry failed: ${retryDescription.length} chars for ${badge.title}`,
        );
        return description; // Use original even if out of range
      } catch (retryErr) {
        console.error(`❌ Retry error for ${badge.title}:`, retryErr);
        return description;
      }
    }

    return description;
  } catch (err) {
    console.error(`❌ Claude CLI error for ${badge.title}:`, err);
    return null;
  }
}

// Helper function to update front matter
function updateFrontMatter(slug: string, description: string): boolean {
  const indexPath = join(CONTENT_DIR, slug, "requirements", "index.md");

  if (!existsSync(indexPath)) {
    console.error(`❌ _index.md not found for ${slug}`);
    return false;
  }

  try {
    const content = readFileSync(indexPath, "utf-8");

    // Parse front matter
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    if (!frontMatterMatch || !frontMatterMatch[1]) {
      console.error(`❌ Invalid front matter format for ${slug}`);
      return false;
    }

    const frontMatter = frontMatterMatch[1];

    // Check if description already exists
    if (frontMatter.includes("description:")) {
      console.log(`ℹ️  Description already exists for ${slug}, skipping`);
      return true;
    }

    // Escape double quotes in description
    const escapedDescription = description.replace(/"/g, '\\"');

    // Add description after eagle_required
    const newFrontMatter =
      frontMatter + `\ndescription: "${escapedDescription}"`;

    // Reconstruct file
    const newContent = content.replace(
      /^---\n[\s\S]*?\n---/,
      `---\n${newFrontMatter}\n---`,
    );

    writeFileSync(indexPath, newContent, "utf-8");
    return true;
  } catch (err) {
    console.error(`❌ Error updating front matter for ${slug}:`, err);
    return false;
  }
}

// Main processing loop
for (let i = 0; i < badgeList.length; i++) {
  const badge = badgeList[i];
  if (!badge) {
    console.error(`❌ Badge at index ${i} is undefined`);
    errorCount++;
    continue;
  }
  const { title, slug } = badge;

  console.log(`\n[${i + 1}/${badgeList.length}] Processing: ${title}...`);

  try {
    // Load badge data
    const badgeData = loadBadgeData(slug);

    if (!badgeData) {
      errorCount++;
      continue;
    }

    // Extract requirements text
    const requirements = badgeData.requirements.map(req => req.text);

    if (requirements.length === 0) {
      console.warn(`⚠️  No requirements found for ${slug}`);
      errorCount++;
      continue;
    }

    // Generate description
    const description = await generateDescription(badge, requirements);

    if (!description) {
      errorCount++;
      continue;
    }

    console.log(`📝 Generated (${description.length} chars): ${description}`);

    // Update front matter
    const updated = updateFrontMatter(slug, description);

    if (!updated) {
      errorCount++;
      continue;
    }

    console.log(`✅ ${title} complete`);
    successCount++;

    // Rate limiting (except for last badge)
    if (i < badgeList.length - 1) {
      await randomDelay();
    }
  } catch (err) {
    console.error(`❌ Unexpected error processing ${title}:`, err);
    errorCount++;
  }
}

// Summary
console.log("\n" + "=".repeat(50));
console.log("📊 Summary:");
console.log(`✅ Successful: ${successCount}`);
console.log(`❌ Errors: ${errorCount}`);
console.log(`📋 Total processed: ${badgeList.length}`);
console.log("=".repeat(50));
