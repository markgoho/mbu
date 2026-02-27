import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";
import { loadEnvFromRepoRoot } from "./lib/load-env-from-repo-root.ts";

await loadEnvFromRepoRoot();

// Types
interface Requirement {
  req_id: string;
  path: string;
  text: string;
  subrequirements?: Requirement[];
}

interface BadgeData {
  title: string;
  slug: string;
  url: string;
  eagle_required: boolean;
  pamphlet_url: string;
  requirements: Requirement[];
}

interface BadgeVisuals {
  theme: string;
  primaryEquipment: string;
  tableType: string;
  objects: string[];
  backgroundScene: string;
  centerpieceType: string;
  centerpieceContent: string;
}

// Constants
const REFERENCE_IMAGE_PATH =
  "hugo/content/merit-badges/mining-in-society/mining-in-society-merit-badge.png";
const TEXT_MODEL = "gemini-3-flash-preview"; // For text extraction (faster/cheaper)
const IMAGE_MODEL = "gemini-3-pro-image-preview"; // For image generation

// Initialize AI client
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Error: GEMINI_API_KEY environment variable is required");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

/**
 * Recursively flatten all requirement text from nested structure
 */
function flattenRequirements(requirements: Requirement[]): string {
  const texts: string[] = [];

  function traverse(reqs: Requirement[], depth = 0) {
    for (const req of reqs) {
      const indent = "  ".repeat(depth);
      texts.push(`${indent}${req.req_id}. ${req.text}`);
      if (req.subrequirements) {
        traverse(req.subrequirements, depth + 1);
      }
    }
  }

  traverse(requirements);
  return texts.join("\n");
}

/**
 * Use Gemini to analyze badge requirements and extract visual elements
 */
async function extractVisualsFromBadge(
  dataJson: BadgeData,
): Promise<BadgeVisuals> {
  const requirementsText = flattenRequirements(dataJson.requirements);

  const extractionPrompt = `You are helping create a visual collage image for a Scouting merit badge.
Analyze the following merit badge requirements and extract visual elements that would make a compelling desk/table collage photograph.

BADGE: ${dataJson.title}

REQUIREMENTS:
${requirementsText}

Return ONLY a valid JSON object (no markdown, no explanation) with:
{
  "theme": "brief theme description for the image (10-15 words)",
  "primaryEquipment": "the MAIN piece of equipment for this activity - what the activity is NAMED after (e.g., for Kayaking it's a 'kayak', for Astronomy it's a 'telescope', for Photography it's a 'camera'). For large items like boats/kayaks/canoes, place them in the background scene.",
  "tableType": "the type of table/desk/surface appropriate for this badge. Examples: 'weathered wooden picnic table' for camping/outdoor badges, 'polished mahogany office desk' for business badges, 'sturdy metal workbench' for trades/crafts, 'rustic farmhouse table' for agriculture, 'lab bench with white surface' for science badges, 'artist's drafting table' for art/design. Be specific and match the activity setting.",
  "objects": ["list", "of", "8-12", "specific", "physical", "objects", "to", "show", "on", "the", "desk"],
  "backgroundScene": "description of appropriate background scene (15-20 words). For outdoor activities (archery, camping, hiking, fishing, etc.), place the desk/table OUTSIDE at the actual location (archery range, campsite, trailhead, lake shore). For indoor activities (chess, reading, programming), show an appropriate indoor setting or view through a window.",
  "centerpieceType": "the focal point item for the CENTER of the desk. Be CREATIVE - don't always choose a book! Consider what makes sense for THIS specific activity. Options include: 'blueprint or technical drawings spread out', 'project plans on paper', 'laminated reference charts', 'work-in-progress craft piece', 'unfolded map', 'specimen display case', 'framed certificate or document', 'tablet displaying diagrams', 'open toolbox with organized compartments', 'cutting mat with project layout', 'display board with pinned items', 'open 3-ring binder', 'leather-bound journal', 'spiral notebook', 'scrapbook', 'sketchbook', 'portfolio'. Pick the MOST APPROPRIATE option for this badge - books/journals are fine for research-heavy badges, but crafts/trades/outdoor activities often have better non-book options.",
  "centerpieceContent": "what is shown/displayed on the centerpiece (10-15 words)"
}

Guidelines for objects:
- Choose concrete, physical items that can be photographed on a desk
- Include items that represent the core activities and knowledge of this badge
- Mix larger items (books, equipment) with smaller details (tools, specimens, artifacts)
- Include reference materials like maps, charts, or field guides when relevant
- Be specific: "clay pottery with geometric Pueblo designs" not just "pottery"

IMPORTANT - DO NOT INCLUDE:
- Merit badges, badge sashes, or badge collections
- Scout uniforms, shirts, or neckerchiefs
- BSA/Scouting America logos or branding
- Any trademarked Scouting paraphernalia
These are protected intellectual property. Focus only on the general hobby/skill items.`;

  console.log(`Extracting visual elements for ${dataJson.title}...`);

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: extractionPrompt,
  });

  // Extract text from response
  const responseText =
    response.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Parse JSON from response (handle potential markdown code blocks)
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Failed to extract JSON from response: ${responseText}`);
  }

  const visuals = JSON.parse(jsonMatch[0]) as BadgeVisuals;
  console.log("Extracted visuals:", JSON.stringify(visuals, null, 2));

  return visuals;
}

/**
 * Build the image generation prompt from extracted visuals
 */
function buildImagePrompt(badgeName: string, visuals: BadgeVisuals): string {
  const objectsList = visuals.objects.join(", ");

  return `Create a photorealistic image matching the style, composition, and warm lighting of the reference image.

SCENE: A ${visuals.tableType} with a carefully arranged collection of items related to "${badgeName}".

COMPOSITION REQUIREMENTS:
- PRIMARY EQUIPMENT (MUST BE PROMINENTLY VISIBLE): ${visuals.primaryEquipment} - this is what the activity is NAMED after and MUST be clearly visible. If it's large (kayak, canoe, boat, car), show it prominently in the background scene. If small enough, show it on/near the desk.
- CENTERPIECE: An open ${visuals.centerpieceType} in the center of the desk, showing ${visuals.centerpieceContent}.
- OBJECTS ARRANGED AROUND THE BOOK: ${objectsList}
- BACKGROUND: ${visuals.backgroundScene}
- INDOOR/OUTDOOR: If the background describes an outdoor location, the table MUST BE PHYSICALLY OUTSIDE at that location - NO windows, NO window frames, NO indoor walls visible. The table is literally sitting outdoors.
- LIGHTING: Warm, natural lighting with soft shadows, slight vintage tone
- CAMERA ANGLE: Slightly elevated angle looking down at the desk surface
- TABLE ORIENTATION: CRITICAL - The front edge of the table MUST be nearly horizontal/parallel to the bottom of the image frame. The table should face the camera straight-on, NOT rotated diagonally. Think of it like sitting at a table looking straight at it.
- STYLE: High-quality photography, realistic textures, cozy study atmosphere

THEME: ${visuals.theme}

Match the reference image's style: appropriate table/desk surface for the activity, centerpiece focal point, related objects scattered naturally. The scene can be indoors or outdoors - whichever fits the badge best.

IMPORTANT:
- Do NOT include any people or human figures in the image - only objects on the table
- Do NOT include any Scout uniforms, merit badges, badge sashes, neckerchiefs, or BSA/Scouting logos. These are protected trademarks. Show only general hobby and skill items.`;
}

/**
 * Load reference image as base64 for API input
 */
async function loadReferenceImage(): Promise<{
  data: string;
  mimeType: string;
}> {
  const absolutePath = path.resolve(REFERENCE_IMAGE_PATH);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Reference image not found: ${absolutePath}`);
  }

  const imageBuffer = fs.readFileSync(absolutePath);
  const base64Data = imageBuffer.toString("base64");

  return {
    data: base64Data,
    mimeType: "image/png",
  };
}

/**
 * Main function to generate a merit badge image
 */
async function generateBadgeImage(badgeSlug: string): Promise<void> {
  const badgeDir = `hugo/content/merit-badges/${badgeSlug}`;
  const dataJsonPath = path.resolve(`hugo/data/merit-badges/${badgeSlug}.json`);
  const outputPath = path.resolve(`${badgeDir}/${badgeSlug}-merit-badge.png`);

  // 0. Delete existing image files (png and avif)
  const existingFiles = fs.readdirSync(path.resolve(badgeDir));
  for (const file of existingFiles) {
    if (file.endsWith(".png") || file.endsWith(".avif")) {
      const filePath = path.resolve(badgeDir, file);
      fs.unlinkSync(filePath);
      console.log(`Deleted existing image: ${file}`);
    }
  }

  // 1. Load data.json
  console.log(`Loading data from ${dataJsonPath}...`);
  if (!fs.existsSync(dataJsonPath)) {
    throw new Error(`Badge data not found: ${dataJsonPath}`);
  }
  const dataJson = JSON.parse(
    fs.readFileSync(dataJsonPath, "utf-8"),
  ) as BadgeData;

  // 2. Extract visuals using text model
  const visuals = await extractVisualsFromBadge(dataJson);

  // 3. Build prompt
  const imagePrompt = buildImagePrompt(dataJson.title, visuals);
  console.log("\nImage prompt:\n", imagePrompt);

  // 4. Load reference image
  console.log("\nLoading reference image...");
  const referenceImage = await loadReferenceImage();

  // 5. Generate image with reference + prompt
  console.log("\nGenerating image...");
  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: referenceImage.mimeType,
              data: referenceImage.data,
            },
          },
          {
            text: imagePrompt,
          },
        ],
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

  // 6. Save generated image
  let imageSaved = false;
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData?.data) {
      const buffer = Buffer.from(part.inlineData.data, "base64");
      fs.writeFileSync(outputPath, buffer);
      console.log(`\nImage saved to: ${outputPath}`);
      imageSaved = true;
      break;
    }
  }

  if (!imageSaved) {
    console.error("No image was generated in the response");
    console.log(
      "Response:",
      JSON.stringify(response.candidates?.[0]?.content, null, 2),
    );
  }
}

// CLI entry point
const badgeSlug = process.argv[2];

if (!badgeSlug) {
  console.error(
    "Usage: bun run scripts/generate-merit-badge-image.ts <badge-slug>",
  );
  console.error(
    "Example: bun run scripts/generate-merit-badge-image.ts indian-lore",
  );
  process.exit(1);
}

generateBadgeImage(badgeSlug).catch(error => {
  console.error("Error generating badge image:", error);
  process.exit(1);
});
