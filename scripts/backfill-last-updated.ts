/**
 * One-time migration script: Backfill `last_updated` for all merit badge data files.
 *
 * For each hugo/data/merit-badges/*.json file, uses `git log -1 --format=%aI`
 * to get the last commit date and adds a `last_updated` field (YYYY-MM-DD).
 */

import { $ } from "bun";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const dataDirectory = "hugo/data/merit-badges";
const files = await readdir(dataDirectory);
const jsonFiles = files.filter((file) => file.endsWith(".json")).sort();

console.log(`Found ${jsonFiles.length} badge data files\n`);

let updated = 0;
let skipped = 0;

for (const file of jsonFiles) {
  const filePath = join(dataDirectory, file);
  const bunFile = Bun.file(filePath);
  const data = (await bunFile.json()) as Record<string, unknown>;

  // Skip if already has last_updated
  if (typeof data["last_updated"] === "string") {
    console.log(`  skip  ${file} (already has last_updated: ${data["last_updated"]})`);
    skipped++;
    continue;
  }

  // Get last commit date for this file from git
  const result =
    await $`git log -1 --format=%aI -- ${filePath}`.text();
  const gitDate = result.trim();

  if (gitDate.length === 0) {
    // File is untracked — use today's date
    const today = new Date().toISOString().split("T")[0] as string;
    console.log(`  new   ${file} -> ${today} (untracked)`);
    data["last_updated"] = today;
  } else {
    // Extract YYYY-MM-DD from ISO date
    const dateOnly = gitDate.split("T")[0] as string;
    console.log(`  add   ${file} -> ${dateOnly}`);
    data["last_updated"] = dateOnly;
  }

  // Write back with last_updated placed after pamphlet_url (before requirements)
  // Rebuild the object in the desired key order
  const ordered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "requirements") {
      // Insert last_updated right before requirements
      ordered["last_updated"] = data["last_updated"];
    }
    if (key !== "last_updated") {
      ordered[key] = value;
    }
  }
  // If requirements wasn't in the object (shouldn't happen), add last_updated at end
  if (!("last_updated" in ordered)) {
    ordered["last_updated"] = data["last_updated"];
  }

  await Bun.write(filePath, JSON.stringify(ordered, undefined, 2));
  updated++;
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
