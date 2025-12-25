import { access, readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

interface ImageFile {
  path: string;
  slug: string;
  extension: string;
}

// Parse command line arguments
const forceFlag = process.argv.includes("--force");

async function findMeritBadgeImages(
  meritBadgesDirectory: string,
): Promise<ImageFile[]> {
  const images: ImageFile[] = [];

  try {
    const badgeDirectories = await readdir(meritBadgesDirectory);

    for (const badgeDirectory of badgeDirectories) {
      const badgePath = path.join(meritBadgesDirectory, badgeDirectory);
      const stats = await stat(badgePath);

      if (stats.isDirectory()) {
        const files = await readdir(badgePath);

        for (const file of files) {
          const extension = path.extname(file).toLowerCase();
          if (extension === ".png" && file.includes("-merit-badge.png")) {
            images.push({
              path: path.join(badgePath, file),
              slug: badgeDirectory,
              extension,
            });
          }
        }
      }
    }

    return images;
  } catch (error) {
    console.error("Error reading merit badge directories:", error);
    return [];
  }
}

async function convertToAvif(image: ImageFile) {
  const directory = path.dirname(image.path);
  const avifPath1200 = path.join(directory, `${image.slug}-merit-badge.avif`);
  const avifPath600 = path.join(
    directory,
    `${image.slug}-merit-badge-card.avif`,
  );

  // Check which AVIF files already exist
  const filesToCheck = [avifPath1200, avifPath600];
  const existingFiles = [];
  const missingFiles = [];

  for (const filePath of filesToCheck) {
    try {
      await access(filePath);
      existingFiles.push(filePath);
    } catch {
      // File doesn't exist, will be created
      missingFiles.push(filePath);
    }
  }

  if (existingFiles.length > 0 && !forceFlag) {
    console.log(
      `Skipped existing files: ${existingFiles.join(", ")} (use --force to overwrite)`,
    );
  }

  if (missingFiles.length === 0 && !forceFlag) {
    console.log(`All AVIF files already exist for ${image.path}`);
    return;
  }

  try {
    // Create 1200px wide version
    if (missingFiles.includes(avifPath1200) || forceFlag) {
      await sharp(image.path)
        .resize(1200, null, { fit: "inside" }) // Width 1200px, height auto
        .avif({ quality: 80 })
        .toFile(avifPath1200);
      console.log(`Created: ${avifPath1200}`);
    }

    // Create 600px wide version for card
    if (missingFiles.includes(avifPath600) || forceFlag) {
      await sharp(image.path)
        .resize(600, null, { fit: "inside" }) // Width 600px, height auto
        .avif({ quality: 80 })
        .toFile(avifPath600);
      console.log(`Created: ${avifPath600}`);
    }

    console.log(`Conversion complete for: ${image.path}`);
  } catch (error) {
    console.error(`Failed to convert ${image.path}:`, error);
  }
}

// Top-level await block
const meritBadgesDirectory = "hugo/content/merit-badges";
const images = await findMeritBadgeImages(meritBadgesDirectory);

if (images.length === 0) {
  console.log("No merit badge images found.");
} else {
  console.log(
    `Found ${images.length.toString()} merit badge images.${forceFlag ? " Force mode enabled." : ""}`,
  );
  for (const image of images) {
    await convertToAvif(image);
  }
  console.log(`All conversions complete.`);
}
