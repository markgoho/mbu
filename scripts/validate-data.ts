import { Glob } from "bun";
import { join } from "path";

const CONTENT_DIR = join(import.meta.dir, "../hugo/content/merit-badges");

interface ValidationIssue {
  badge: string;
  type: string;
  location: string;
  details: string;
}

const issues: ValidationIssue[] = [];

// Find all data.json files
const glob = new Glob("**/data.json");
const files = Array.from(glob.scanSync(CONTENT_DIR));

for (const file of files) {
  const badgeSlug = file.split("/")[0];
  const filePath = join(CONTENT_DIR, file);

  try {
    const data = await Bun.file(filePath).json();

    validateBadge(badgeSlug, data);
  } catch (err) {
    issues.push({
      badge: badgeSlug,
      type: "parse_error",
      location: "file",
      details: (err as Error).message,
    });
  }
}

function validateBadge(badgeSlug: string, data: any) {
  if (!data.requirements || !Array.isArray(data.requirements)) {
    issues.push({
      badge: badgeSlug,
      type: "missing_requirements",
      location: "root",
      details: "No requirements array found",
    });
    return;
  }

  for (const req of data.requirements) {
    validateRequirement(badgeSlug, req, [req.req_id]);
  }
}

function validateRequirement(badgeSlug: string, req: any, path: string[]) {
  const location = path.join(".");

  // Check for encoding issues (garbage characters)
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFFFD]/.test(req.text || "")) {
    issues.push({
      badge: badgeSlug,
      type: "encoding_issue",
      location,
      details: `Text contains garbage characters: ${(req.text || "").substring(0, 100)}...`,
    });
  }

  // Check for "Resource:" or "Resources:" in text
  if (/(Resource|Resources):/i.test(req.text || "")) {
    issues.push({
      badge: badgeSlug,
      type: "resource_duplication",
      location,
      details: `Text contains "Resource:" label: ${(req.text || "").substring(0, 100)}...`,
    });
  }

  // Check for excessively long req_id (should be < 100 chars for slugs)
  if (req.req_id && req.req_id.length > 100) {
    issues.push({
      badge: badgeSlug,
      type: "long_req_id",
      location,
      details: `req_id is ${req.req_id.length} characters (should be < 100): ${req.req_id.substring(0, 100)}...`,
    });
  }

  // Check for HTML/CSS/JS in req_id
  if (
    req.req_id &&
    /<[^>]+>|{|}|\bfunction\b|\bvar\b|\.css|\.js/.test(req.req_id)
  ) {
    issues.push({
      badge: badgeSlug,
      type: "polluted_req_id",
      location,
      details: `req_id contains HTML/CSS/JS: ${req.req_id.substring(0, 100)}...`,
    });
  }

  // Check for missing text
  if (!req.text || req.text.trim() === "") {
    issues.push({
      badge: badgeSlug,
      type: "missing_text",
      location,
      details: "Requirement has no text",
    });
  }

  // Check for excessively long text (> 2000 chars is suspicious)
  if (req.text && req.text.length > 2000) {
    issues.push({
      badge: badgeSlug,
      type: "long_text",
      location,
      details: `Text is ${req.text.length} characters (might contain page pollution)`,
    });
  }

  // Check for HTML in text (some is ok, but <script>, <style>, etc. are not)
  if (req.text && /<(script|style|nav|header|footer)/i.test(req.text)) {
    issues.push({
      badge: badgeSlug,
      type: "polluted_text",
      location,
      details: `Text contains suspicious HTML tags: ${req.text.substring(0, 100)}...`,
    });
  }

  // Recursively check subrequirements
  if (req.subrequirements && Array.isArray(req.subrequirements)) {
    for (const subreq of req.subrequirements) {
      validateRequirement(badgeSlug, subreq, [...path, subreq.req_id]);
    }
  }
}

// Print summary
console.log(`\n📊 Validation Results`);
console.log(`Checked ${files.length} badges`);
console.log(`Found ${issues.length} issues\n`);

// Group issues by type
const issuesByType = issues.reduce(
  (acc, issue) => {
    if (!acc[issue.type]) acc[issue.type] = [];
    acc[issue.type].push(issue);
    return acc;
  },
  {} as Record<string, ValidationIssue[]>,
);

// Print issues by type
for (const [type, typeIssues] of Object.entries(issuesByType)) {
  console.log(`\n❌ ${type.toUpperCase()} (${typeIssues.length} issues)`);

  // Get unique badges affected
  const affectedBadges = [...new Set(typeIssues.map(i => i.badge))];
  console.log(`   Affected badges: ${affectedBadges.sort().join(", ")}`);

  // Show first 3 examples
  for (const issue of typeIssues.slice(0, 3)) {
    console.log(`   - ${issue.badge} @ ${issue.location}`);
    console.log(`     ${issue.details}\n`);
  }

  if (typeIssues.length > 3) {
    console.log(`   ... and ${typeIssues.length - 3} more\n`);
  }
}
