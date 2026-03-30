/**
 * One-time migration script: Backfill `last_updated` for all merit badge data files.
 *
 * Walks Git history (with --follow to track renames) for each data file and
 * finds the most recent commit where the `requirements` array actually changed.
 * This ignores formatting-only commits, file moves, and metadata-only changes.
 */

import { $, Glob } from "bun";
import { join } from "node:path";

interface CommitEntry {
  hash: string;
  date: string;
  filePath: string;
}

/**
 * Parse `git log --follow --format --name-only` output into commit entries.
 * Output format is: "hash date\n\nfilepath\n" repeating.
 */
function parseGitLog(output: string): CommitEntry[] {
  const entries: CommitEntry[] = [];
  const lines = output.trim().split("\n");

  let index = 0;
  while (index < lines.length) {
    const headerLine = lines[index];
    if (headerLine === undefined || headerLine.trim() === "") {
      index++;
      continue;
    }

    const spaceIndex = headerLine.indexOf(" ");
    if (spaceIndex === -1) {
      index++;
      continue;
    }

    const hash = headerLine.substring(0, spaceIndex);
    const date = headerLine.substring(spaceIndex + 1);

    // Skip blank line between header and filename
    index++;
    while (index < lines.length && lines[index]?.trim() === "") {
      index++;
    }

    const filePathLine = lines[index];
    if (filePathLine !== undefined && filePathLine.trim() !== "") {
      entries.push({ hash, date, filePath: filePathLine.trim() });
    }
    index++;
  }

  return entries;
}

/**
 * Extract the requirements array from a file at a specific Git commit.
 * Returns the JSON-stringified requirements, or undefined if the file/field
 * does not exist at that commit.
 */
async function getRequirementsAtCommit({
  hash,
  filePath,
}: {
  hash: string;
  filePath: string;
}): Promise<string | undefined> {
  try {
    const content = await $`git show ${hash}:${filePath}`.text();
    const data = JSON.parse(content) as Record<string, unknown>;
    if ("requirements" in data) {
      return JSON.stringify(data["requirements"]);
    }
    return undefined;
  } catch {
    return undefined;
  }
}

const dataDirectory = "hugo/data/merit-badges";
const jsonFiles: string[] = [];
for await (const fileName of new Glob("*.json").scan(dataDirectory)) {
  jsonFiles.push(fileName);
}
jsonFiles.sort();

console.log(`Found ${jsonFiles.length} badge data files\n`);

let updated = 0;
const today = new Date().toISOString().split("T")[0] as string;

for (const file of jsonFiles) {
  const filePath = join(dataDirectory, file);
  const bunFile = Bun.file(filePath);
  const data = (await bunFile.json()) as Record<string, unknown>;

  // Get full commit history with --follow to track renames
  const logOutput =
    await $`git log --format=%H\ %aI --follow --name-only -- ${filePath}`.text();
  const commits = parseGitLog(logOutput);

  // Skip our own backfill commit (the most recent one that added last_updated)
  // by filtering to commits before the current HEAD if they only changed last_updated
  // Instead, we walk pairs and compare requirements content

  let lastContentChangeDate = today;

  if (commits.length === 0) {
    console.log(`  new   ${file} -> ${today} (no git history)`);
  } else if (commits.length === 1) {
    // Only one commit — that's when the file was created
    const commit = commits[0] as CommitEntry;
    lastContentChangeDate = commit.date.split("T")[0] as string;
    console.log(`  init  ${file} -> ${lastContentChangeDate} (single commit)`);
  } else {
    // Walk from newest to oldest, comparing requirements at each pair
    // The first commit (newest) where requirements differ from its successor
    // is when the last real content change happened
    let found = false;

    for (let index = 0; index < commits.length - 1; index++) {
      const current = commits[index] as CommitEntry;
      const previous = commits[index + 1] as CommitEntry;

      const currentRequirements = await getRequirementsAtCommit({
        hash: current.hash,
        filePath: current.filePath,
      });
      const previousRequirements = await getRequirementsAtCommit({
        hash: previous.hash,
        filePath: previous.filePath,
      });

      if (currentRequirements !== previousRequirements) {
        lastContentChangeDate = current.date.split("T")[0] as string;
        console.log(`  found ${file} -> ${lastContentChangeDate}`);
        found = true;
        break;
      }
    }

    if (!found) {
      // Requirements never changed — use the earliest commit (file creation)
      const earliest = commits.at(-1) as CommitEntry;
      lastContentChangeDate = earliest.date.split("T")[0] as string;
      console.log(
        `  orig  ${file} -> ${lastContentChangeDate} (never changed)`,
      );
    }
  }

  data["last_updated"] = lastContentChangeDate;

  // Write back with last_updated placed before requirements
  const ordered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "requirements") {
      ordered["last_updated"] = data["last_updated"];
    }
    if (key !== "last_updated") {
      ordered[key] = value;
    }
  }
  if (!("last_updated" in ordered)) {
    ordered["last_updated"] = data["last_updated"];
  }

  await Bun.write(filePath, JSON.stringify(ordered, undefined, 2));
  updated++;
}

console.log(`\nDone: ${updated} files processed`);
