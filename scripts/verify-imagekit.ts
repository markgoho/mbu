/**
 * HEAD-check every expected ImageKit URL (emblems + guide images + site
 * images) and report 404s before anything is deleted from git.
 *
 * Usage:
 *   bun scripts/verify-imagekit.ts
 */

import path from "node:path";
import { loadEnvFromRepoRoot } from "./lib/load-env-from-repo-root.ts";
import { MERIT_BADGES } from "./merit-badges.ts";

await loadEnvFromRepoRoot();

const MERIT_BADGES_DIRECTORY = path.resolve("hugo/content/merit-badges");
const PREFIX = "/mbu-assets";
const ENDPOINT = "https://ik.imagekit.io/doulacoop";

interface CheckResult {
  url: string;
  ok: boolean;
  status: number;
}

async function check(url: string): Promise<CheckResult> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return { url, ok: response.ok, status: response.status };
  } catch (error) {
    console.error(`  network error for ${url}: ${error instanceof Error ? error.message : error}`);
    return { url, ok: false, status: 0 };
  }
}

async function main(): Promise<void> {
  const badgeImagesPath = path.resolve("hugo/data/badge-images.json");
  if (!(await Bun.file(badgeImagesPath).exists())) {
    console.error("hugo/data/badge-images.json not found — run the migration first");
    process.exit(1);
  }
  const badgeImages = JSON.parse(await Bun.file(badgeImagesPath).text()) as {
    badges: Record<string, { v: string }>;
    site: Record<string, { v: string }>;
  };

  const failures: CheckResult[] = [];
  let total = 0;

  console.log("=== Emblems ===");
  for (const badge of MERIT_BADGES) {
    const entry = badgeImages.badges[badge.slug];
    if (!entry) {
      console.error(`  ✗ ${badge.slug}: no entry in badge-images.json`);
      failures.push({ url: `${badge.slug} (emblem)`, ok: false, status: 0 });
      total++;
      continue;
    }
    total++;
    const result = await check(
      `${ENDPOINT}/tr:w-800${PREFIX}/merit-badges/${badge.slug}/emblem?v=${entry.v}`,
    );
    if (!result.ok) failures.push(result);
  }

  console.log("=== DRG guide images ===");
  for (const badge of MERIT_BADGES) {
    const imagesJsonPath = path.join(MERIT_BADGES_DIRECTORY, badge.slug, "guide", "images.json");
    if (!(await Bun.file(imagesJsonPath).exists())) continue;
    const manifest = JSON.parse(await Bun.file(imagesJsonPath).text()) as {
      images: Array<{ id: string; v?: string }>;
    };
    for (const entry of manifest.images) {
      if (!entry.v) {
        console.error(`  ✗ ${badge.slug}/${entry.id}: no v hash in images.json`);
        failures.push({ url: `${badge.slug}/${entry.id}`, ok: false, status: 0 });
        total++;
        continue;
      }
      total++;
      const result = await check(
        `${ENDPOINT}/tr:w-800${PREFIX}/merit-badges/${badge.slug}/guide/${entry.id}?v=${entry.v}`,
      );
      if (!result.ok) failures.push(result);
    }
  }

  console.log("=== Site images ===");
  for (const [name, entry] of Object.entries(badgeImages.site)) {
    total++;
    const result = await check(`${ENDPOINT}/tr:w-800${PREFIX}/site/${name}?v=${entry.v}`);
    if (!result.ok) failures.push(result);
  }

  console.log(`\nChecked ${total} URLs, ${failures.length} failed.`);
  for (const failure of failures) {
    console.log(`  ✗ [${failure.status}] ${failure.url}`);
  }

  if (failures.length > 0) {
    process.exit(1);
  }
}

await main();
