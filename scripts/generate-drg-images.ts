import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";
import { loadEnvFromRepoRoot } from "./lib/load-env-from-repo-root.ts";

await loadEnvFromRepoRoot();

type ImageStyle =
  | "photo"
  | "diagram"
  | "infographic"
  | "illustrated"
  | "annotated-photo"
  | "comparison";

interface DrgImage {
  id: string;
  file: string;
  style?: ImageStyle;
  description: string;
}

interface DrgManifest {
  badge: string;
  style_context: string;
  images: DrgImage[];
}

const IMAGE_MODEL = "gemini-3.1-flash-image-preview";
const DELAY_MS = 1500;
const MAX_RETRIES = 3;

// ---------------------------------------------------------------------------
// Shared preamble sections (reused across styles that depict people or safety)
// ---------------------------------------------------------------------------

const RECURRING_CAST = `
RECURRING CAST — USE THESE SAME KIDS IN EVERY PHOTO:
When people appear in the scene, draw from this specific group of Scouts. They are the SAME kids across every image — treat this like a photo series following one Scout patrol:

1. MAYA — 14-year-old girl, Black, tall and athletic build, natural hair in two puffs, confident posture, often takes the lead
2. ETHAN — 12-year-old boy, white/red hair and freckles, shorter and wiry, eager expression, carries a big backpack relative to his size
3. SOFIA — 15-year-old girl, Latina, medium build, long dark hair usually in a braid, calm and focused demeanor
4. JAMES — 13-year-old boy, East Asian, average height, glasses, curious expression, often examining things closely
5. KAI — 16-year-old boy, Pacific Islander/mixed-race, broad-shouldered and tallest of the group, relaxed and easygoing presence

Not every kid needs to appear in every photo — use whichever 2-5 of them make sense for the scene. But they must be RECOGNIZABLY the same individuals across images: same hair, same face, same build, same glasses (James), same freckles (Ethan), etc.`;

const UNIFORM_SECTION = `
UNIFORM & CLOTHING:
- Youth should frequently be wearing a Scouting America field uniform: a tan/khaki button-up shirt with olive green pants/shorts. This is the standard Scout uniform look. No visible patches, logos, or specific BSA branding — just the tan-shirt-olive-pants combination.
- When NOT in uniform, youth wear generic outdoor clothing in earth tones (greens, browns, khaki, navy).
- NO logos or brand names visible on clothing or gear.
- Scout uniforms must ALWAYS appear clean, neat, and presentable — no stains, paint, mud, tears, or visible wear.
- If the scene involves messy activities (painting, gardening, cooking), Scouts should be wearing generic work clothes or aprons OVER their uniforms, OR the uniforms should remain visibly clean and unaffected.
- The Scout uniform represents the organization and must never look damaged, dirty, or disrespected in any image.`;

const SAFETY_SECTION = `
SAFETY-CRITICAL ACCURACY:
- Any image depicting a safety practice, rule, or technique MUST be correct in every visible detail. A wrong detail in a safety image actively teaches dangerous behavior.
- Equipment must be shown used correctly: helmets level on the head with straps buckled, PFDs properly fitted, harnesses snug, eye protection worn.
- Containers, tools, and gear must look like what they are. A water container must NOT resemble a fuel or chemical container. A cooking flame must NOT appear near flammable liquids or inappropriate materials.
- Body positioning and technique must be accurate: proper lifting form, correct hand placement on tools, safe distances from hazards.
- If the scene involves fire, stoves, or heat sources, ensure all nearby objects are plausible and safe — no red gas cans, aerosol cans, or plastic containers near open flame.
- When in doubt, depict the SAFEST version of the scene. Err on the side of caution.`;

// ---------------------------------------------------------------------------
// buildStyleGuide — selects the correct preamble based on style
// ---------------------------------------------------------------------------

function buildStyleGuide(context: string, style: ImageStyle): string {
  switch (style) {
    case "photo":
      return `You are generating a PHOTOGRAPH for a Merit Badge University study guide about ${context}.

CRITICAL — OUTPUT MUST BE A PHOTOGRAPH:
- The output MUST look like a real photograph taken with a camera
- Do NOT generate illustrations, drawings, paintings, watercolors, sketches, cartoons, digital art, or any non-photographic style
- Even if the description mentions "illustration" or "painting", IGNORE that and produce a photorealistic photograph instead
- Think: National Geographic photo, DSLR camera, real-world scene captured on film
${RECURRING_CAST}

STYLE REQUIREMENTS:
- Photorealistic photography style with warm, natural lighting
- Educational tone — like a well-produced textbook or National Geographic photograph
- Clean composition suitable for all ages (youth 11-17)
- NO text overlays, watermarks, or captions in the image
- Warm color palette: earthy greens, browns, golden-hour warmth, natural sky colors
${UNIFORM_SECTION}
${SAFETY_SECTION}

SCENE: `;

    case "annotated-photo":
      return `You are generating a PHOTOGRAPH WITH EDUCATIONAL ANNOTATIONS for a Merit Badge University study guide about ${context}.

CRITICAL — OUTPUT MUST BE AN ANNOTATED PHOTOGRAPH:
- Base image must be photorealistic (like a DSLR photo)
- OVERLAY clear text labels, arrows, and callout boxes on the photo
- Labels should have semi-transparent backgrounds for readability
- Arrows should be clean and clearly point to their subjects
- Think: annotated textbook photo, museum exhibit label, instructional manual
${RECURRING_CAST}

ANNOTATION REQUIREMENTS:
- Labels must be LEGIBLE at web resolution
- Use a consistent label style throughout (same font, same background treatment)
- Arrows or leader lines should be clean and clearly connect labels to subjects
- Semi-transparent label backgrounds (white or light color at ~80% opacity)
- Dark text on light labels for maximum readability
- Place labels to minimize overlap with important visual content

PHOTOGRAPHY BASE:
- Warm, natural lighting
- Clean composition suitable for youth ages 11-17
- No logos or brand names visible
${UNIFORM_SECTION}
${SAFETY_SECTION}

SCENE: `;

    case "diagram":
      return `You are generating a CLEAN EDUCATIONAL DIAGRAM for a Merit Badge University study guide about ${context}.

CRITICAL — OUTPUT MUST BE A DIAGRAM:
- Output must be a clear, labeled diagram — NOT a photograph
- Use clean lines, clear typography, and educational colors
- All text labels must be LEGIBLE and ACCURATE
- Use arrows, callouts, and annotations freely
- Style: modern textbook diagram, clean vector-like appearance
- Color palette: professional blues, greens, warm accents on a light background
- No decorative elements — every visual element should teach something
- Think: modern science textbook diagram, educational poster, museum exhibit graphic

TYPOGRAPHY REQUIREMENTS:
- All text must be large enough to read at web resolution (minimum ~14pt equivalent)
- Use a clean sans-serif font style
- Labels should have high contrast against their background
- Use leader lines or arrows to connect labels to their subjects

SCENE: `;

    case "infographic":
      return `You are generating an EDUCATIONAL INFOGRAPHIC for a Merit Badge University study guide about ${context}.

CRITICAL — OUTPUT MUST BE AN INFOGRAPHIC:
- Clean, modern infographic design — NOT a photograph
- Mix of icons, short text blocks, and visual elements
- Clear visual hierarchy — most important information is largest
- All text must be LEGIBLE at web resolution
- Professional color scheme, consistent throughout
- Think: National Geographic sidebar, educational poster, well-designed factsheet

LAYOUT REQUIREMENTS:
- Organized sections with clear visual separation
- Use icons, pictograms, or simple illustrations alongside text
- Numbers, statistics, and key facts should be prominently displayed
- Use color coding to group related information
- Include a clear title or heading at the top

TYPOGRAPHY:
- Title/heading: large, bold
- Section headers: medium, distinct from body text
- Body text: clean, readable sans-serif
- Key numbers/facts: large and highlighted

SCENE: `;

    case "illustrated":
      return `You are generating a DETAILED TECHNICAL ILLUSTRATION for a Merit Badge University study guide about ${context}.

CRITICAL — OUTPUT MUST BE A TECHNICAL ILLUSTRATION:
- Detailed technical illustration style — NOT a photograph
- Think: field guide illustration, technical manual drawing, equipment catalog diagram
- Use precise linework with clear detail
- Label all important parts and features
- Style: somewhere between a botanical illustration and an engineering diagram
- Professional, educational, authoritative feel

ILLUSTRATION REQUIREMENTS:
- Clean white or light neutral background
- Precise, detailed rendering of the subject
- Labels with leader lines pointing to key features
- Consistent line weight and rendering style
- Cross-hatching or subtle shading for depth (not photorealistic shading)
- Color should be accurate and educational, not decorative

SCENE: `;

    case "comparison":
      return `You are generating a COMPARISON IMAGE for a Merit Badge University study guide about ${context}.

CRITICAL — OUTPUT MUST BE A SIDE-BY-SIDE OR SPLIT-FRAME COMPARISON:
- Show two versions of the same subject for clear comparison
- Use a split-frame, side-by-side, or before/after layout
- Clearly label each side (e.g., "CORRECT" vs "INCORRECT", "DO" vs "DON'T", "BEFORE" vs "AFTER")
- The comparison should be immediately obvious and educational

COMPARISON REQUIREMENTS:
- Both sides should show the SAME subject or scenario
- Differences must be clearly visible and meaningful
- Labels must be large and legible at web resolution
- Use color coding: green tones for correct/good, red tones for incorrect/bad
- A dividing line or visual separator between the two sides
- Can be photorealistic or illustrated — whichever communicates the comparison more clearly

EDUCATIONAL FOCUS:
- The viewer should instantly understand what is right and what is wrong
- Key differences should be emphasized (circles, arrows, highlights)
- Suitable for youth ages 11-17
${SAFETY_SECTION}

SCENE: `;
  }
}

function loadManifest(badge: string): DrgManifest {
  const manifestPath = path.resolve(
    `hugo/content/merit-badges/${badge}/guide/images.json`,
  );
  if (!fs.existsSync(manifestPath)) {
    console.error(`Manifest not found: ${manifestPath}`);
    console.error(
      `Create an images.json file in the guide directory for "${badge}".`,
    );
    process.exit(1);
  }
  const raw = fs.readFileSync(manifestPath, "utf-8");
  return JSON.parse(raw) as DrgManifest;
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Error: GEMINI_API_KEY environment variable is required");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateImage(
  image: DrgImage,
  context: string,
): Promise<Buffer | null> {
  const style: ImageStyle = image.style ?? "photo";
  const styleGuide = buildStyleGuide(context, style);
  const prompt = styleGuide + image.description;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        config: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: "1K",
          },
        },
      });

      // Extract image data from response
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          return Buffer.from(part.inlineData.data, "base64");
        }
      }

      console.warn(`  ⚠ No image data in response for ${image.id}`);
      return null;
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 429 && attempt < MAX_RETRIES) {
        const backoff = Math.pow(3, attempt) * 5000;
        console.warn(
          `  ⚠ Rate limited (attempt ${attempt}/${MAX_RETRIES}), waiting ${backoff / 1000}s...`,
        );
        await sleep(backoff);
        continue;
      }
      console.error(
        `  ✗ Error generating ${image.id} (attempt ${attempt}):`,
        err.message || error,
      );
      if (attempt === MAX_RETRIES) return null;
    }
  }
  return null;
}

function savePng(pngBuffer: Buffer, outputPath: string): boolean {
  try {
    fs.writeFileSync(outputPath, pngBuffer);
    return true;
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error(`  ✗ Save failed:`, err.message || error);
    return false;
  }
}

function parseArgs(): {
  badge?: string;
  index?: number;
  id?: string;
  skipExisting: boolean;
} {
  const args = process.argv.slice(2);
  const result: {
    badge?: string;
    index?: number;
    id?: string;
    skipExisting: boolean;
  } = {
    skipExisting: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    if (arg === "--badge" && next) {
      result.badge = next;
      i++;
    } else if (arg === "--index" && next) {
      result.index = parseInt(next, 10);
      i++;
    } else if (arg === "--id" && next) {
      result.id = next;
      i++;
    } else if (arg === "--skip-existing") {
      result.skipExisting = true;
    }
  }

  return result;
}

function printUsage(): void {
  console.log(`Usage: bun scripts/generate-drg-images.ts --badge <slug> [options]

Required:
  --badge <slug>      Merit badge slug (e.g., hiking, camping, first-aid)

Options:
  --index <N>         Generate only the Nth image (1-based)
  --id <image-id>     Generate only the image with this ID
  --skip-existing     Skip images that already have a .png file

Examples:
  bun scripts/generate-drg-images.ts --badge hiking
  bun scripts/generate-drg-images.ts --badge hiking --index 1
  bun scripts/generate-drg-images.ts --badge hiking --id trail-map-compass
  bun scripts/generate-drg-images.ts --badge hiking --skip-existing`);
}

async function main() {
  const args = parseArgs();

  if (process.argv.includes("--help")) {
    printUsage();
    return;
  }

  if (!args.badge) {
    console.error("Error: --badge <slug> is required.\n");
    printUsage();
    process.exit(1);
  }

  const manifest = loadManifest(args.badge);
  const outputDir = path.resolve(
    `hugo/content/merit-badges/${args.badge}/guide/images`,
  );

  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`Badge: ${manifest.badge}`);
  console.log(`Manifest: ${manifest.images.length} images defined`);

  let imagesToGenerate: DrgImage[];

  if (args.index !== undefined) {
    const idx = args.index - 1;
    if (idx < 0 || idx >= manifest.images.length) {
      console.error(
        `Invalid index: ${args.index}. Must be 1-${manifest.images.length}`,
      );
      process.exit(1);
    }
    const target = manifest.images[idx]!;
    imagesToGenerate = [target];
    console.log(`Generating single image: ${target.id}`);
  } else if (args.id) {
    const image = manifest.images.find(img => img.id === args.id);
    if (!image) {
      console.error(`Image not found: ${args.id}`);
      console.error(
        "Available IDs:",
        manifest.images.map(img => img.id).join(", "),
      );
      process.exit(1);
    }
    imagesToGenerate = [image];
    console.log(`Generating single image: ${image.id}`);
  } else {
    imagesToGenerate = [...manifest.images];
    console.log(`Generating all ${imagesToGenerate.length} images`);
  }

  if (args.skipExisting) {
    const before = imagesToGenerate.length;
    imagesToGenerate = imagesToGenerate.filter(img => {
      const pngPath = path.join(outputDir, `${img.id}.png`);
      return !fs.existsSync(pngPath);
    });
    const skipped = before - imagesToGenerate.length;
    if (skipped > 0) {
      console.log(`Skipping ${skipped} existing images`);
    }
  }

  if (imagesToGenerate.length === 0) {
    console.log("Nothing to generate — all images already exist.");
    return;
  }

  console.log(`\nOutput directory: ${outputDir}`);
  console.log(`Images to generate: ${imagesToGenerate.length}\n`);

  const results: { id: string; success: boolean }[] = [];

  for (let i = 0; i < imagesToGenerate.length; i++) {
    const image = imagesToGenerate[i]!;
    const pngPath = path.join(outputDir, `${image.id}.png`);
    const progress = `[${i + 1}/${imagesToGenerate.length}]`;

    console.log(`${progress} Generating: ${image.id} (${image.style ?? "photo"})...`);

    const pngBuffer = await generateImage(image, manifest.style_context);
    if (!pngBuffer) {
      console.error(`${progress} ✗ Failed: ${image.id}`);
      results.push({ id: image.id, success: false });
      continue;
    }

    const saved = savePng(pngBuffer, pngPath);
    if (saved) {
      const stats = fs.statSync(pngPath);
      const sizeKB = (stats.size / 1024).toFixed(1);
      console.log(`${progress} ✓ Saved: ${image.id}.png (${sizeKB} KB)`);
      results.push({ id: image.id, success: true });
    } else {
      console.error(`${progress} ✗ Save failed: ${image.id}`);
      results.push({ id: image.id, success: false });
    }

    if (i < imagesToGenerate.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n${"=".repeat(50)}`);
  console.log(`GENERATION COMPLETE — ${manifest.badge}`);
  console.log(`${"=".repeat(50)}`);
  console.log(`Successful: ${successful.length}/${results.length}`);

  if (failed.length > 0) {
    console.log(`\nFailed images:`);
    for (const f of failed) {
      console.log(`  - ${f.id}`);
    }
  }
}

main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
