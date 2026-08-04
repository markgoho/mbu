/**
 * Upload MBU images to ImageKit and record dimensions + cache-version hashes.
 *
 * Usage:
 *   bun scripts/migrate-images-to-imagekit.ts --dry-run
 *   bun scripts/migrate-images-to-imagekit.ts
 *   bun scripts/migrate-images-to-imagekit.ts --only=emblems
 *   bun scripts/migrate-images-to-imagekit.ts --only=drg --skip-existing
 *   BADGE_SLUGS="camping,hiking" bun scripts/migrate-images-to-imagekit.ts --only=drg
 *
 * Uploads sequentially (matching the repo's scraper convention) to a shared
 * ImageKit account also used by doula.coop — every object path is prefixed
 * /mbu-assets/ to guarantee no collision with that site's own folders.
 */

import { createHash } from "node:crypto";
import path from "node:path";
import ImageKit, { toFile } from "@imagekit/nodejs";
import sharp from "sharp";
import { loadEnvFromRepoRoot } from "./lib/load-env-from-repo-root.ts";
import { MERIT_BADGES } from "./merit-badges.ts";

await loadEnvFromRepoRoot();

const MERIT_BADGES_DIRECTORY = path.resolve("hugo/content/merit-badges");
const PREFIX = "/mbu-assets";

interface Args {
  dryRun: boolean;
  only?: "emblems" | "drg" | "site";
  skipExisting: boolean;
}

function parseArguments(): Args {
  const argv = process.argv.slice(2);
  const args: Args = { dryRun: false, skipExisting: false };
  for (const arg of argv) {
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--skip-existing") {
      args.skipExisting = true;
    } else if (arg.startsWith("--only=")) {
      const value = arg.slice("--only=".length);
      if (value === "emblems" || value === "drg" || value === "site") {
        args.only = value;
      } else {
        console.error(`Invalid --only value: ${value}`);
        process.exit(1);
      }
    }
  }
  return args;
}

const args = parseArguments();

const badgeSlugFilter = process.env.BADGE_SLUGS
  ? new Set(process.env.BADGE_SLUGS.split(",").map((s) => s.trim()))
  : undefined;
const MERIT_BADGES_FILTERED = badgeSlugFilter
  ? MERIT_BADGES.filter((badge) => badgeSlugFilter.has(badge.slug))
  : MERIT_BADGES;

const client = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
});

let uploaded = 0;
let skipped = 0;
let failed = 0;

const IMAGEKIT_ENDPOINT = "https://ik.imagekit.io/doulacoop";

async function fileExistsOnImageKit(folder: string, fileName: string): Promise<boolean> {
  const response = await fetch(`${IMAGEKIT_ENDPOINT}${folder}/${fileName}`, { method: "HEAD" });
  return response.ok;
}

async function sha256Of(filePath: string): Promise<string> {
  const buffer = await Bun.file(filePath).arrayBuffer();
  return createHash("sha256").update(Buffer.from(buffer)).digest("hex").slice(0, 8);
}

async function uploadFile({
  filePath,
  folder,
  fileName,
  pre,
}: {
  filePath: string;
  folder: string;
  fileName: string;
  pre?: string;
}): Promise<{ width: number; height: number; v: string } | undefined> {
  const metadata = await sharp(filePath).metadata();
  if (metadata.width === undefined || metadata.height === undefined) {
    console.error(`  ✗ ${folder}/${fileName}: could not read dimensions`);
    failed++;
    return undefined;
  }
  const v = await sha256Of(filePath);

  if (args.skipExisting && (await fileExistsOnImageKit(folder, fileName))) {
    console.log(`  · skip (exists) ${folder}/${fileName}`);
    skipped++;
    return { width: metadata.width, height: metadata.height, v };
  }

  if (args.dryRun) {
    console.log(`  would upload ${folder}/${fileName} (${metadata.width}x${metadata.height})`);
    uploaded++;
    return { width: metadata.width, height: metadata.height, v };
  }

  try {
    const bunFile = Bun.file(filePath);
    const file = await toFile(await bunFile.arrayBuffer(), fileName);
    await client.files.upload({
      file,
      fileName,
      folder,
      useUniqueFileName: false,
      overwriteFile: true,
      ...(pre ? { transformation: { pre } } : {}),
    });
    console.log(`  ✓ ${folder}/${fileName} (${metadata.width}x${metadata.height})`);
    uploaded++;
    return { width: metadata.width, height: metadata.height, v };
  } catch (error) {
    console.error(`  ✗ ${folder}/${fileName}: ${error instanceof Error ? error.message : error}`);
    failed++;
    return undefined;
  }
}

async function migrateEmblems(): Promise<Record<string, { width: number; height: number; v: string }>> {
  console.log("\n=== Emblems ===");
  const badgeImages: Record<string, { width: number; height: number; v: string }> = {};

  for (const badge of MERIT_BADGES_FILTERED) {
    const pngPath = path.join(
      MERIT_BADGES_DIRECTORY,
      badge.slug,
      `${badge.slug}-merit-badge.png`,
    );
    if (!(await Bun.file(pngPath).exists())) {
      console.error(`  ✗ missing emblem PNG for ${badge.slug}`);
      failed++;
      continue;
    }
    const result = await uploadFile({
      filePath: pngPath,
      folder: `${PREFIX}/merit-badges/${badge.slug}`,
      fileName: "emblem",
      pre: "w-1400,c-at_max",
    });
    if (result) {
      badgeImages[badge.slug] = result;
    }
  }

  return badgeImages;
}

async function migrateDrg(): Promise<void> {
  console.log("\n=== DRG guide images ===");

  for (const badge of MERIT_BADGES_FILTERED) {
    const imagesJsonPath = path.join(
      MERIT_BADGES_DIRECTORY,
      badge.slug,
      "guide",
      "images.json",
    );
    if (!(await Bun.file(imagesJsonPath).exists())) {
      continue;
    }

    const manifest = JSON.parse(await Bun.file(imagesJsonPath).text()) as {
      images: Array<{ id: string; file: string; description: string; width?: number; height?: number; v?: string }>;
    };

    let changed = false;
    for (const entry of manifest.images) {
      const imagesDirectory = path.join(MERIT_BADGES_DIRECTORY, badge.slug, "guide", "images");
      // Bulk-migrated images already have an .avif master. Freshly
      // generated images (scripts/generate-drg-images.ts) land as .png —
      // there's no local resize/convert step anymore, ImageKit derives
      // the ≤800px slice on demand from whichever master we upload.
      const avifPath = path.join(imagesDirectory, `${entry.id}.avif`);
      const pngPath = path.join(imagesDirectory, `${entry.id}.png`);
      const isAvif = await Bun.file(avifPath).exists();
      const sourcePath = isAvif ? avifPath : pngPath;
      if (!isAvif && !(await Bun.file(pngPath).exists())) {
        console.error(`  ✗ ${badge.slug}: missing ${entry.id}.avif/.png referenced in images.json`);
        failed++;
        continue;
      }
      const result = await uploadFile({
        filePath: sourcePath,
        folder: `${PREFIX}/merit-badges/${badge.slug}/guide`,
        fileName: entry.id,
      });
      if (result && !args.dryRun) {
        entry.width = result.width;
        entry.height = result.height;
        entry.v = result.v;
        changed = true;
        // Freshly generated PNGs are staging files, not committed
        // masters — upload-and-delete, same as everything else here.
        if (!isAvif) {
          await Bun.file(pngPath).delete();
        }
      }
    }

    if (changed) {
      await Bun.write(imagesJsonPath, JSON.stringify(manifest, null, 2) + "\n");
    }
  }
}

async function migrateSite(): Promise<{ hero?: { width: number; height: number; v: string }; ogDefault?: { width: number; height: number; v: string } }> {
  console.log("\n=== Site images ===");

  const hero = await uploadFile({
    filePath: path.resolve("hugo/static/prototype-hero-image.jpg"),
    folder: `${PREFIX}/site`,
    fileName: "hero",
  });

  const ogDefault = await uploadFile({
    filePath: path.resolve("hugo/content/merit-badges/merit-badge-university.jpg"),
    folder: `${PREFIX}/site`,
    fileName: "og-default",
  });

  return { hero, ogDefault };
}

async function main(): Promise<void> {
  if (!process.env.IMAGEKIT_PRIVATE_KEY) {
    console.error("IMAGEKIT_PRIVATE_KEY is not set");
    process.exit(1);
  }

  const badgeImagesPath = path.resolve("hugo/data/badge-images.json");
  let badgeImages: Record<string, { width: number; height: number; v: string }> = {};
  let siteImages: Record<string, { width: number; height: number; v: string }> = {};
  if (await Bun.file(badgeImagesPath).exists()) {
    const existing = JSON.parse(await Bun.file(badgeImagesPath).text());
    badgeImages = existing.badges ?? {};
    siteImages = existing.site ?? {};
  }

  if (!args.only || args.only === "emblems") {
    badgeImages = { ...badgeImages, ...(await migrateEmblems()) };
  }
  if (!args.only || args.only === "drg") {
    await migrateDrg();
  }
  if (!args.only || args.only === "site") {
    const site = await migrateSite();
    if (site.hero) siteImages.hero = site.hero;
    if (site.ogDefault) siteImages["og-default"] = site.ogDefault;
  }

  if (!args.dryRun && (!args.only || args.only === "emblems" || args.only === "site")) {
    await Bun.write(
      badgeImagesPath,
      JSON.stringify({ badges: badgeImages, site: siteImages }, null, 2) + "\n",
    );
  }

  console.log(`\nDone. uploaded=${uploaded} skipped=${skipped} failed=${failed}`);
  if (failed > 0) {
    process.exit(1);
  }
}

await main();
