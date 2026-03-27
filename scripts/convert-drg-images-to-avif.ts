import { readdir, stat } from "node:fs/promises";
import * as fs from "node:fs";
import * as path from "node:path";
import sharp from "sharp";

const AVIF_WIDTH = 800;
const AVIF_QUALITY = 80;
const MERIT_BADGES_DIRECTORY = "hugo/content/merit-badges";

interface ImageFile {
  filePath: string;
  badge: string;
}

function parseArguments(): { badge?: string; force: boolean } {
  const arguments_ = process.argv.slice(2);
  const result: { badge?: string; force: boolean } = { force: false };

  for (let index = 0; index < arguments_.length; index++) {
    const argument = arguments_[index];
    const next = arguments_[index + 1];
    if (argument === "--badge" && next !== undefined) {
      result.badge = next;
      index++;
    } else if (argument === "--force") {
      result.force = true;
    }
  }

  return result;
}

async function findDrgImages(badge?: string): Promise<ImageFile[]> {
  const images: ImageFile[] = [];
  const basePath = path.resolve(MERIT_BADGES_DIRECTORY);

  const badgeSlugs: string[] = [];
  if (badge !== undefined) {
    badgeSlugs.push(badge);
  } else {
    const entries = await readdir(basePath);
    for (const entry of entries) {
      const guideImagesPath = path.join(basePath, entry, "guide", "images");
      try {
        const stats = await stat(guideImagesPath);
        if (stats.isDirectory()) {
          badgeSlugs.push(entry);
        }
      } catch {
        // No guide/images directory for this badge
      }
    }
  }

  for (const slug of badgeSlugs) {
    const imagesDirectory = path.join(basePath, slug, "guide", "images");
    try {
      const files = await readdir(imagesDirectory);
      for (const file of files) {
        if (file.endsWith(".png") || file.endsWith(".avif")) {
          images.push({
            filePath: path.join(imagesDirectory, file),
            badge: slug,
          });
        }
      }
    } catch {
      if (badge !== undefined) {
        console.error(`No images directory found for badge: ${slug}`);
        process.exit(1);
      }
    }
  }

  // Deduplicate: if both .png and .avif exist for the same name, prefer .png as source
  const byBasename = new Map<string, ImageFile>();
  for (const image of images) {
    const key = image.filePath.replace(/\.(png|avif)$/, "");
    const existing = byBasename.get(key);
    if (existing === undefined || image.filePath.endsWith(".png")) {
      byBasename.set(key, image);
    }
  }

  return [...byBasename.values()];
}

async function convertToAvif({
  image,
  force,
}: {
  image: ImageFile;
  force: boolean;
}): Promise<{
  converted: boolean;
  originalSize: number;
  newSize: number;
  removedPng: boolean;
}> {
  const isAvifSource = image.filePath.endsWith(".avif");
  const avifPath = isAvifSource
    ? image.filePath
    : image.filePath.replace(/\.png$/, ".avif");

  if (!force && !isAvifSource && fs.existsSync(avifPath)) {
    fs.unlinkSync(image.filePath);
    return {
      converted: false,
      originalSize: 0,
      newSize: 0,
      removedPng: true,
    };
  }

  // For AVIF sources, check if already at target width
  if (!force && isAvifSource) {
    const metadata = await sharp(image.filePath).metadata();
    if (metadata.width !== undefined && metadata.width <= AVIF_WIDTH) {
      return {
        converted: false,
        originalSize: 0,
        newSize: 0,
        removedPng: false,
      };
    }
  }

  const originalStats = await stat(image.filePath);
  const originalSize = originalStats.size;

  // When source and destination are the same file, write to a temp file first
  if (isAvifSource) {
    const temporaryPath = `${avifPath}.tmp`;
    await sharp(image.filePath)
      .resize(AVIF_WIDTH, undefined, { fit: "inside" })
      .avif({ quality: AVIF_QUALITY })
      .toFile(temporaryPath);
    fs.renameSync(temporaryPath, avifPath);
  } else {
    await sharp(image.filePath)
      .resize(AVIF_WIDTH, undefined, { fit: "inside" })
      .avif({ quality: AVIF_QUALITY })
      .toFile(avifPath);
    fs.unlinkSync(image.filePath);
  }

  const newStats = await stat(avifPath);
  const newSize = newStats.size;

  return {
    converted: true,
    originalSize,
    newSize,
    removedPng: !isAvifSource,
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }
  const megabytes = kilobytes / 1024;
  return `${megabytes.toFixed(1)} MB`;
}

async function main(): Promise<void> {
  const options = parseArguments();
  const images = await findDrgImages(options.badge);

  if (images.length === 0) {
    console.log("No DRG images found.");
    return;
  }

  const scope = options.badge !== undefined ? options.badge : "all badges";
  console.log(
    `Found ${images.length} DRG images (${scope})${options.force ? " [force mode]" : ""}`,
  );

  let convertedCount = 0;
  let skippedCount = 0;
  let removedPngCount = 0;
  let totalOriginalSize = 0;
  let totalNewSize = 0;

  for (const image of images) {
    const basename = path.basename(image.filePath);
    try {
      const result = await convertToAvif({ image, force: options.force });
      if (result.converted) {
        convertedCount++;
        if (result.removedPng) {
          removedPngCount++;
        }
        totalOriginalSize += result.originalSize;
        totalNewSize += result.newSize;
        const savings = (
          ((result.originalSize - result.newSize) / result.originalSize) *
          100
        ).toFixed(1);
        console.log(
          `  ✓ ${image.badge}/${basename} → ${formatBytes(result.originalSize)} → ${formatBytes(result.newSize)} (${savings}% smaller)`,
        );
      } else {
        skippedCount++;
        if (result.removedPng) {
          removedPngCount++;
          console.log(`  ✓ Removed source PNG after confirming existing AVIF: ${image.badge}/${basename}`);
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`  ✗ ${image.badge}/${basename}: ${errorMessage}`);
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log("CONVERSION COMPLETE");
  console.log(`${"=".repeat(50)}`);
  console.log(`Converted: ${convertedCount}`);
  if (removedPngCount > 0) {
    console.log(`Removed PNG sources: ${removedPngCount}`);
  }
  if (skippedCount > 0) {
    console.log(`Skipped (already exist): ${skippedCount}`);
  }
  if (convertedCount > 0) {
    const totalSavings = (
      ((totalOriginalSize - totalNewSize) / totalOriginalSize) *
      100
    ).toFixed(1);
    console.log(
      `Original size: ${formatBytes(totalOriginalSize)} → AVIF size: ${formatBytes(totalNewSize)} (${totalSavings}% smaller)`,
    );
  }
}

main().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
