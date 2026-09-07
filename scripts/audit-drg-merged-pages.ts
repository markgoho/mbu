/**
 * Audits DRG guide pages for the thing the user actually complained about
 * on personal-management's req8/req9 (before they were renamed): a page
 * that folds several lettered subrequirements into one file, with no
 * "## Requirement 8a: ..." (or "###") heading per letter. Without that
 * heading, a Scout can't see which part of the page answers which
 * subrequirement, and req-guide-fragment.html has nothing to deep-link to
 * from the Requirements-overview page.
 *
 * The SITE'S DOMINANT pattern (confirmed by scanning the whole corpus,
 * not just one example) is a bare req<N>.md covering all of that
 * requirement's letters -- see .agents/skills/drg/SKILL.md's own
 * "req2.md covering 2a-2c" example. A smaller minority (genealogy,
 * forestry, fire-safety, artificial-intelligence, ...) instead
 * concatenates the letters into the filename (req8abc.md, req5ef.md) and
 * sets req_number to the first letter -- that's a DIFFERENT, also-valid
 * choice (it additionally splits the page's own sidebar entry per
 * letter), not a requirement. This script does not care which naming
 * style a page uses; it only checks whether each subrequirement letter
 * that ISN'T split into its own dedicated page has a matching heading
 * somewhere on the page that does cover it.
 *
 * subrequirement_mode.type === "select" ("choose 2 of the following")
 * requirements are excluded: their "options" are alternatives, not
 * sub-parts that all need their own section.
 *
 * Usage: bun run scripts/audit-drg-merged-pages.ts [--json]
 */
import { Glob } from "bun";

type Requirement = {
  req_id: string;
  path: string;
  subrequirements?: Requirement[];
  subrequirement_mode?: { type: string };
};

type BadgeData = {
  requirements: Requirement[];
};

type PageInfo = {
  filename: string;
  reqNumber: string | null;
  headingLetters: Set<string>;
};

type Finding = {
  slug: string;
  reqId: string;
  category: "missing-heading" | "no-coverage";
  detail: string;
};

function digitBoundaryOk(reqNumber: string, prefix: string): boolean {
  const boundary = reqNumber.slice(prefix.length, prefix.length + 1);
  return boundary === "" || !/[0-9]/.test(boundary);
}

async function loadGuidePages(guideDir: string): Promise<Map<string, PageInfo>> {
  const pages = new Map<string, PageInfo>();
  const glob = new Glob("req*.md");
  for await (const filename of glob.scan({ cwd: guideDir })) {
    const text = await Bun.file(`${guideDir}/${filename}`).text();
    const reqNumberMatch = text.match(/^req_number:\s*"([^"]+)"/m);
    const reqNumber = reqNumberMatch ? reqNumberMatch[1] : null;

    // Any heading (any level) whose text starts "Requirement <n><letter>"
    // -- this is the shape req-guide-fragment.html's "requirement-<path>"
    // rule matches against (Hugo slugifies it to "requirement-8a-...").
    const headingLetters = new Set<string>();
    const headingRe = /^#{1,6}\s*Requirement\s+([0-9]+)([a-z]?)\b/gim;
    let m: RegExpExecArray | null;
    while ((m = headingRe.exec(text))) {
      if (m[2]) headingLetters.add(`${m[1]}${m[2]}`.toLowerCase());
    }

    pages.set(filename, { filename, reqNumber, headingLetters });
  }
  return pages;
}

async function auditBadge(slug: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const dataPath = `hugo/data/merit-badges/${slug}.json`;
  const guideDir = `hugo/content/merit-badges/${slug}/guide`;

  if (!(await Bun.file(dataPath).exists())) return findings;
  if (!(await Bun.file(`${guideDir}/_index.md`).exists())) return findings;

  const data = (await Bun.file(dataPath).json()) as BadgeData;
  const pages = await loadGuidePages(guideDir);
  const filenames = [...pages.keys()];

  for (const req of data.requirements ?? []) {
    if (req.subrequirement_mode?.type === "select") continue;
    const subreqs = req.subrequirements ?? [];
    if (subreqs.length === 0) continue;
    // Only plain letter subrequirements (a, b, c...) map onto the
    // "## Requirement 8a" heading convention; named-option/slug ids
    // (e.g. "beef-cattle") use a different lookup rule entirely.
    if (subreqs.some(s => !/^[a-z]$/.test(s.req_id))) continue;

    const letters = subreqs.map(s => s.req_id);
    const dedicated = new Set(
      letters.filter(letter => filenames.includes(`req${req.req_id}${letter}.md`)),
    );
    const remaining = letters.filter(letter => !dedicated.has(letter));
    if (remaining.length === 0) continue;

    // For each remaining letter, is there ANY guide page -- bare req<N>.md
    // or a concatenated-letter req<N>xy.md -- that (a) plausibly covers
    // it via req_number's prefix-match rule, and (b) actually carries a
    // "Requirement <N><letter>" heading?
    const candidatePages = filenames.filter(f => {
      const rn = pages.get(f)!.reqNumber;
      return rn && rn.startsWith(req.req_id) && digitBoundaryOk(rn, req.req_id);
    });

    if (candidatePages.length === 0) {
      findings.push({
        slug,
        reqId: req.req_id,
        category: "no-coverage",
        detail: `No guide page found for subrequirements ${remaining.join(", ")} (checked dedicated pages and req_number prefix match).`,
      });
      continue;
    }

    for (const letter of remaining) {
      const marker = `${req.req_id}${letter}`;
      const hasHeading = candidatePages.some(f => pages.get(f)!.headingLetters.has(marker));
      if (!hasHeading) {
        findings.push({
          slug,
          reqId: req.req_id,
          category: "missing-heading",
          detail: `Requirement ${marker} has no dedicated page and no "## Requirement ${marker}: ..." heading on ${candidatePages.join(", ")} -- the subrequirement has no clearly labeled section, and the Requirements-overview page can't deep-link to it.`,
        });
      }
    }
  }

  return findings;
}

async function main() {
  const asJson = process.argv.includes("--json");
  const glob = new Glob("*.json");
  const slugs: string[] = [];
  for await (const filename of glob.scan({ cwd: "hugo/data/merit-badges" })) {
    slugs.push(filename.replace(/\.json$/, ""));
  }
  slugs.sort();

  const allFindings: Finding[] = [];
  for (const slug of slugs) {
    allFindings.push(...(await auditBadge(slug)));
  }

  if (asJson) {
    console.log(JSON.stringify(allFindings, null, 2));
    return;
  }

  const byCategory = {
    "missing-heading": allFindings.filter(f => f.category === "missing-heading"),
    "no-coverage": allFindings.filter(f => f.category === "no-coverage"),
  };

  for (const [category, findings] of Object.entries(byCategory)) {
    if (findings.length === 0) continue;
    console.log(`\n=== ${category} (${findings.length}) ===`);
    for (const f of findings) {
      console.log(`  ${f.slug} req${f.reqId}: ${f.detail}`);
    }
  }

  const badgesAffected = new Set(allFindings.map(f => f.slug)).size;
  console.log(
    `\nTotal: ${allFindings.length} findings across ${badgesAffected} badges (${slugs.length} badges checked).`,
  );
}

await main();
