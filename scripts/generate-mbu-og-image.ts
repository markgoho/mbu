import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";

// Constants
const REFERENCE_IMAGE_PATH =
  "hugo/content/merit-badges/mining-in-society/mining-in-society-merit-badge.png";
const IMAGE_MODEL = "gemini-3-pro-image-preview";
const OUTPUT_PATH = "hugo/content/merit-badges/merit-badge-university.png";

// Initialize AI client
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Error: GEMINI_API_KEY environment variable is required");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

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
 * Generate the Merit Badge University OG image
 */
async function generateMBUImage(): Promise<void> {
  const outputPath = path.resolve(OUTPUT_PATH);

  const imagePrompt = `Create a photorealistic image matching the style, composition, and warm lighting of the reference image.

SCENE: A warm, inviting study desk in a library or academic setting - this is "Merit Badge University", emphasizing LEARNING and EDUCATION about diverse life skills.

COMPOSITION REQUIREMENTS:
- CENTERPIECE: An open textbook or educational workbook in the center, with visible chapters/sections about different topics (nature, citizenship, crafts, science). Sticky notes and bookmarks visible.
- OBJECTS ARRANGED AROUND THE CENTER (emphasizing STUDY and LEARNING):
  * A stack of 2-3 educational books/field guides with visible spines
  * An open spiral notebook with handwritten study notes and checklists
  * Highlighters and pens scattered naturally
  * Reading glasses resting on the desk
  * A small desk lamp (warm glow)
  * Index cards with study notes
  * A tablet or laptop showing an educational diagram (optional)
  * A coffee mug (suggesting long study sessions)
  * A few physical items representing topics being studied: a small compass, a plant specimen, a basic circuit board, a small first aid manual
  * A graduation cap tassel or academic element subtly placed
- BACKGROUND: A warm, well-lit library or study room with bookshelves full of books, soft natural light from windows. Academic, scholarly atmosphere. Think "university library" or "cozy study corner".
- LIGHTING: Warm, inviting lighting - a mix of natural window light and warm desk lamp glow. Suggests a productive study session.
- CAMERA ANGLE: Slightly elevated angle looking down at the desk surface
- TABLE ORIENTATION: CRITICAL - The front edge of the desk MUST be nearly horizontal/parallel to the bottom of the image frame. The desk should face the camera straight-on, NOT rotated diagonally.
- STYLE: High-quality photography, realistic textures, scholarly yet approachable atmosphere

THEME: "Merit Badge University" - a place of LEARNING and EDUCATION. This is about studying, growing, and mastering new skills. The image should feel like a student's study desk as they research and learn about diverse topics - nature, science, citizenship, crafts, fitness, and life skills.

Match the reference image's style: desk surface, centerpiece focal point, related objects scattered naturally in an aesthetically pleasing arrangement.

IMPORTANT:
- Do NOT include any people or human figures in the image - only objects on the desk
- Do NOT include any Scout uniforms, merit badges, badge sashes, neckerchiefs, or BSA/Scouting logos. These are protected trademarks.
- Focus on the EDUCATIONAL and LEARNING aspect - books, notes, study materials, with just a few physical items representing topics being studied.
- This image represents "Merit Badge University" - an educational resource focused on LEARNING about diverse life skills.`;

  console.log("Loading reference image...");
  const referenceImage = await loadReferenceImage();

  console.log("Generating Merit Badge University OG image...");
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

  // Save generated image
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

// Run
generateMBUImage().catch(error => {
  console.error("Error generating MBU image:", error);
  process.exit(1);
});
