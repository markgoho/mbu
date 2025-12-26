import { spawn } from "child_process";
import { MERIT_BADGES } from "./merit-badges";

// Parse command line arguments
const startSlug = process.argv[2];
const endSlug = process.argv[3];

if (!startSlug || !endSlug) {
  console.error(
    "Usage: bun run scripts/batch-generate-images.ts <start-slug> <end-slug>",
  );
  console.error(
    "Example: bun run scripts/batch-generate-images.ts american-business golf",
  );
  process.exit(1);
}

// Find the start and end indices
const startIndex = MERIT_BADGES.findIndex(b => b.slug === startSlug);
const endIndex = MERIT_BADGES.findIndex(b => b.slug === endSlug);

if (startIndex === -1) {
  console.error(`Badge not found: ${startSlug}`);
  process.exit(1);
}

if (endIndex === -1) {
  console.error(`Badge not found: ${endSlug}`);
  process.exit(1);
}

if (startIndex > endIndex) {
  console.error(
    `Start badge "${startSlug}" comes after end badge "${endSlug}" in the list`,
  );
  process.exit(1);
}

// Get the badges in range
const badgesToProcess = MERIT_BADGES.slice(startIndex, endIndex + 1);

if (badgesToProcess.length === 0) {
  console.error("No badges to process");
  process.exit(1);
}

const firstBadge = badgesToProcess[0];
const lastBadge = badgesToProcess[badgesToProcess.length - 1];

if (!firstBadge || !lastBadge) {
  console.error("Invalid badge range");
  process.exit(1);
}

console.log(`\nBatch processing ${badgesToProcess.length} badges:`);
console.log(`  From: ${firstBadge.title} (${firstBadge.slug})`);
console.log(`  To:   ${lastBadge.title} (${lastBadge.slug})`);
console.log("");

// Process each badge
async function generateImage(slug: string): Promise<boolean> {
  return new Promise(resolve => {
    const child = spawn(
      "bun",
      ["run", "scripts/generate-merit-badge-image.ts", slug],
      {
        stdio: "inherit",
        cwd: process.cwd(),
      },
    );

    child.on("close", code => {
      resolve(code === 0);
    });

    child.on("error", err => {
      console.error(`Failed to start process for ${slug}:`, err);
      resolve(false);
    });
  });
}

async function main() {
  const results: { slug: string; success: boolean }[] = [];

  for (let i = 0; i < badgesToProcess.length; i++) {
    const badge = badgesToProcess[i];
    if (!badge) {
      console.error(`Badge at index ${i} is undefined`);
      continue;
    }

    console.log(
      `\n${"=".repeat(60)}\n[${i + 1}/${badgesToProcess.length}] Processing: ${badge.title}\n${"=".repeat(60)}`,
    );

    const success = await generateImage(badge.slug);
    results.push({ slug: badge.slug, success });
  }

  // Print summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("BATCH PROCESSING COMPLETE");
  console.log(`${"=".repeat(60)}`);

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\nSuccessful: ${successful.length}/${results.length}`);

  if (failed.length > 0) {
    console.log(`\nFailed badges:`);
    failed.forEach(r => console.log(`  - ${r.slug}`));
  }
}

main().catch(err => {
  console.error("Batch processing failed:", err);
  process.exit(1);
});
