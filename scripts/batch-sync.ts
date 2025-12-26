import { $ } from "bun";

const badges = [
  "automotive-maintenance",
  "backpacking",
  "bird-study",
  "camping",
  "chemistry",
  "composite-materials",
  "cooking",
  "cybersecurity",
  "cycling",
  "digital-technology",
  "dog-care",
  "engineering",
  "environmental-science",
  "exploration",
  "family-life",
  "fingerprinting",
  "gardening",
  "genealogy",
  "graphic-arts",
  "hiking",
  "home-repairs",
  "horsemanship",
  "insect-study",
  "landscape-architecture",
  "leatherwork",
  "mammal-study",
  "music",
  "nature",
  "nuclear-science",
  "orienteering",
  "painting",
  "pets",
  "pioneering",
  "plant-science",
  "plumbing",
  "pottery",
  "programming",
  "reading",
  "reptile-and-amphibian-study",
  "robotics",
  "scholarship",
  "scouting-heritage",
  "sculpture",
  "space-exploration",
  "stamp-collecting",
  "sustainability",
  "textile",
  "traffic-safety",
  "weather",
];

console.log(`\n🔄 Batch syncing ${badges.length} badges...\n`);

let successCount = 0;
let errorCount = 0;

for (const badge of badges) {
  try {
    console.log(`Syncing: ${badge}`);
    await $`BADGE_NAME=${badge} bun run sync:badges`.quiet();
    successCount++;

    // Add delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (err) {
    console.error(`  ❌ Failed: ${badge}`);
    errorCount++;
  }
}

console.log(
  `\n✅ Batch sync complete. ${successCount} succeeded, ${errorCount} failed.`,
);
