import { Glob } from "bun";
import { join } from "node:path";

type Resource = {
  title: string;
  url: string;
};

type Requirement = {
  req_id: string;
  path: string;
  text: string;
  resources?: Resource[];
  subrequirements?: Requirement[];
};

type BadgeData = {
  title: string;
  slug: string;
  pamphlet_url?: string;
  requirements?: Requirement[];
};

type AuditIssue = {
  badge: string;
  type: string;
  location: string;
  details: string;
};

const CONTENT_DIR = join(import.meta.dir, "../hugo/data/merit-badges");
const files = Array.from(new Glob("*.json").scanSync(CONTENT_DIR));
const issues: AuditIssue[] = [];

function addIssue({
  badge,
  type,
  location,
  details,
}: {
  badge: string;
  type: string;
  location: string;
  details: string;
}): void {
  issues.push({ badge, type, location, details });
}

function auditText({
  badge,
  location,
  text,
}: {
  badge: string;
  location: string;
  text: string;
}): void {
  if (/&(?:mdash|ndash|nbsp|amp|quot|lt|gt|#39);/i.test(text)) {
    addIssue({
      badge,
      type: "html_entity",
      location,
      details: `Text contains HTML entity: ${text.slice(0, 140)}...`,
    });
  }

  if (/<\/?(?:strong|b|i|em|details|summary|br|a)\b/i.test(text)) {
    addIssue({
      badge,
      type: "html_tag_leak",
      location,
      details: `Text contains HTML tags: ${text.slice(0, 140)}...`,
    });
  }

  if (/\bResources?:/i.test(text)) {
    addIssue({
      badge,
      type: "resource_label_in_text",
      location,
      details: `Text still contains resource label: ${text.slice(0, 140)}...`,
    });
  }

  if (/\s{2,}/.test(text)) {
    addIssue({
      badge,
      type: "double_whitespace",
      location,
      details: `Text contains repeated whitespace: ${text.slice(0, 140)}...`,
    });
  }
}

function auditResources({
  badge,
  location,
  resources,
}: {
  badge: string;
  location: string;
  resources: Resource[];
}): void {
  const urls = new Set<string>();

  for (const [index, resource] of resources.entries()) {
    const resourceLocation = `${location}.resources[${index}]`;

    if (resource["title"].trim() === "") {
      addIssue({
        badge,
        type: "empty_resource_title",
        location: resourceLocation,
        details: "Resource title is empty",
      });
    }

    if (!/^https?:\/\//i.test(resource["url"])) {
      addIssue({
        badge,
        type: "non_http_resource_url",
        location: resourceLocation,
        details: `Resource URL is not http/https: ${resource["url"]}`,
      });
    }

    if (urls.has(resource["url"])) {
      addIssue({
        badge,
        type: "duplicate_resource_url",
        location: resourceLocation,
        details: `Duplicate resource URL: ${resource["url"]}`,
      });
    }

    urls.add(resource["url"]);
    auditText({
      badge,
      location: `${resourceLocation}.title`,
      text: resource["title"],
    });
  }
}

function auditRequirement({
  badge,
  requirement,
}: {
  badge: string;
  requirement: Requirement;
}): void {
  const location = requirement["path"];

  if (requirement["text"].trim() === "") {
    addIssue({
      badge,
      type: "empty_text",
      location,
      details: "Requirement text is empty",
    });
  }

  auditText({
    badge,
    location,
    text: requirement["text"],
  });

  if (requirement["resources"] !== undefined) {
    auditResources({
      badge,
      location,
      resources: requirement["resources"],
    });
  }

  if (requirement["subrequirements"] !== undefined) {
    for (const subrequirement of requirement["subrequirements"]) {
      auditRequirement({
        badge,
        requirement: subrequirement,
      });
    }
  }
}

for (const file of files) {
  const badge = file.replace(/\.json$/, "");
  const filePath = join(CONTENT_DIR, file);

  try {
    const data = (await Bun.file(filePath).json()) as BadgeData;

    if (data["requirements"] === undefined) {
      addIssue({
        badge,
        type: "missing_requirements",
        location: "root",
        details: "No requirements array found",
      });
      continue;
    }

    if (data["pamphlet_url"] === undefined) {
      addIssue({
        badge,
        type: "missing_pamphlet_url",
        location: "root",
        details: "No pamphlet_url found",
      });
    }

    for (const requirement of data["requirements"]) {
      auditRequirement({
        badge,
        requirement,
      });
    }
  } catch (error) {
    addIssue({
      badge,
      type: "parse_error",
      location: "file",
      details: (error as Error).message,
    });
  }
}

console.log(`\n🔎 Badge JSON Audit`);
console.log(`Checked ${files.length} badges`);
console.log(`Found ${issues.length} issues\n`);

const issuesByType = issues.reduce<Record<string, AuditIssue[]>>(
  (accumulator, issue) => {
    const existingIssues = accumulator[issue["type"]];
    if (existingIssues === undefined) {
      accumulator[issue["type"]] = [issue];
    } else {
      existingIssues.push(issue);
    }

    return accumulator;
  },
  {},
);

for (const [type, typeIssues] of Object.entries(issuesByType).sort(
  ([firstType], [secondType]) => firstType.localeCompare(secondType),
)) {
  const affectedBadges = [
    ...new Set(typeIssues.map(issue => issue["badge"])),
  ].sort();
  console.log(`❌ ${type} (${typeIssues.length})`);
  console.log(`   Badges: ${affectedBadges.join(", ")}`);

  for (const issue of typeIssues.slice(0, 5)) {
    console.log(`   - ${issue["badge"]} @ ${issue["location"]}`);
    console.log(`     ${issue["details"]}`);
  }

  if (typeIssues.length > 5) {
    console.log(`   ... and ${typeIssues.length - 5} more`);
  }

  console.log("");
}
