import { $ } from "bun";

// Full list of 67 badges updated for Jan 1, 2026
// Test mode: Comment out the slice() to run all badges
const allBadges = [
  "archaeology",
  "athletics",
  "automotive-maintenance",
  "bird-study",
  "canoeing",
  "chess",
  "citizenship-in-the-community",
  "citizenship-in-the-nation",
  "citizenship-in-the-world",
  "coin-collecting",
  "composite-materials",
  "cycling",
  "digital-technology",
  "emergency-preparedness",
  "engineering",
  "exploration",
  "family-life",
  "fishing",
  "fly-fishing",
  "forestry",
  "geology",
  "graphic-arts",
  "home-repairs",
  "horsemanship",
  "inventing",
  "journalism",
  "kayaking",
  "law",
  "lifesaving",
  "mammal-study",
  "mining-in-society",
  "model-design-and-building",
  "motorboating",
  "moviemaking",
  "multisport",
  "music",
  "nuclear-science",
  "oceanography",
  "painting",
  "personal-fitness",
  "pets",
  "plant-science",
  "programming",
  "public-health",
  "radio",
  "reading",
  "robotics",
  "rowing",
  "safety",
  "scouting-heritage",
  "sculpture",
  "search-and-rescue",
  "signs-signals-and-codes",
  "skating",
  "small-boat-sailing",
  "snow-sports",
  "space-exploration",
  "surveying",
  "swimming",
  "traffic-safety",
  "truck-transportation",
  "veterinary-medicine",
  "water-sports",
  "weather",
  "whitewater",
  "wilderness-survival",
];

// Test with first 5 badges
const badges = allBadges.slice(0, 5);

console.log(`\n🔄 Batch syncing ${badges.length} badges...\n`);

let successCount = 0;
let errorCount = 0;

for (const badge of badges) {
  try {
    console.log(`Syncing: ${badge}`);
    await $`BADGE_NAME=${badge} bun run sync:badges`.quiet();
    successCount++;

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (err) {
    console.error(`  ❌ Failed: ${badge}`);
    errorCount++;
  }
}

console.log(
  `\n✅ Batch sync complete. ${successCount} succeeded, ${errorCount} failed.`,
);
