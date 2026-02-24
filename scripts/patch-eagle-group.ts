/**
 * One-time script to patch data.json files with eagle_group field.
 * Reads the eagle_group from merit-badges.ts and writes it into each badge's data.json.
 * Removes eagle_group from badges that shouldn't have it.
 */

import { MERIT_BADGES } from "./merit-badges";

const eagleBadges = MERIT_BADGES.filter((badge) => badge.eagle_required);

for (const badge of eagleBadges) {
  const dataPath = `hugo/content/merit-badges/${badge.slug}/data.json`;
  const file = Bun.file(dataPath);

  if (!(await file.exists())) {
    console.log(`⚠️  Skipping ${badge.title} — no data.json found`);
    continue;
  }

  const data = await file.json();

  if (badge.eagle_group !== undefined) {
    data.eagle_group = badge.eagle_group;
    console.log(`✅ ${badge.title} → eagle_group: "${badge.eagle_group}"`);
  } else if ("eagle_group" in data) {
    delete data.eagle_group;
    console.log(`🗑️  ${badge.title} → removed stale eagle_group`);
  } else {
    console.log(`—  ${badge.title} (standalone, no change needed)`);
    continue;
  }

  await Bun.write(dataPath, JSON.stringify(data, null, 2));
}

console.log("\n✨ Patch complete!");
