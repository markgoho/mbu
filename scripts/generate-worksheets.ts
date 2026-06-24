/**
 * Generate fillable AcroForm PDF worksheets for merit badges.
 *
 * Usage:
 *   bun scripts/generate-worksheets.ts
 *   BADGE_SLUGS="camping,first-aid" bun scripts/generate-worksheets.ts
 *   TEST_MODE=1 bun scripts/generate-worksheets.ts
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import path from "path";
import {
  PDFDocument,
  PDFFont,
  PDFName,
  PDFString,
  PDFBool,
  rgb,
  StandardFonts,
  PDFPage,
  PDFForm,
} from "pdf-lib";
import { classifyNode, parsePrompts } from "./lib/requirement-field-type.ts";
import type { Requirement, PromptSegment } from "./lib/requirement-field-type.ts";
import { MERIT_BADGES } from "./merit-badges.ts";

interface BadgeData {
  title: string;
  slug: string;
  url: string;
  requirements: Requirement[];
}

// --- Page geometry ---
const PAGE_W = 612; // Letter width (pts)
const PAGE_H = 792; // Letter height (pts)
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FONT_SIZE_BODY = 10;
const FONT_SIZE_HEADING = 12;
const FONT_SIZE_SMALL = 8;
const FONT_SIZE_TITLE = 16;
const LINE_HEIGHT = FONT_SIZE_BODY * 1.4;
const FIELD_LABEL_W = 120;
const FIELD_HEIGHT = 16;
const MULTILINE_HEIGHT = FIELD_HEIGHT * 4;
const DRAW_BOX_HEIGHT = 80;

// --- Layout state ---
interface LayoutState {
  page: PDFPage;
  y: number;
  doc: PDFDocument;
  form: PDFForm;
  font: PDFFont;
  boldFont: PDFFont;
  fieldIndex: number;
}

function addPage(state: LayoutState): void {
  state.page = state.doc.addPage([PAGE_W, PAGE_H]);
  state.y = PAGE_H - MARGIN;
}

function ensureSpace(state: LayoutState, needed: number): void {
  if (state.y - needed < MARGIN + 20) {
    addPage(state);
  }
}

/** Wrap text to lines fitting maxWidth. */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

/** Strip markdown links [text](url) -> text */
function stripMarkdown(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*/g, "").replace(/\*/g, "");
}

function drawText(
  state: LayoutState,
  text: string,
  opts: { size?: number; bold?: boolean; indent?: number; color?: [number, number, number] } = {},
): number {
  const size = opts.size ?? FONT_SIZE_BODY;
  const font = opts.bold ? state.boldFont : state.font;
  const indent = opts.indent ?? 0;
  const [r, g, b] = opts.color ?? [0, 0, 0];
  const maxW = CONTENT_W - indent;
  const lines = wrapText(stripMarkdown(text), font, size, maxW);
  const totalH = lines.length * size * 1.4;
  ensureSpace(state, totalH);
  for (const line of lines) {
    state.page.drawText(line, {
      x: MARGIN + indent,
      y: state.y - size,
      size,
      font,
      color: rgb(r, g, b),
    });
    state.y -= size * 1.4;
  }
  return lines.length;
}

function fieldName(prefix: string, state: LayoutState): string {
  return `${prefix}_${state.fieldIndex++}`;
}

/** Add a single-line text field. */
function addTextField(
  state: LayoutState,
  name: string,
  label: string,
  opts: { width?: number; indent?: number; multiline?: boolean; height?: number; labelWidth?: number } = {},
): void {
  const indent = opts.indent ?? 0;
  const multiline = opts.multiline ?? false;
  const h = opts.height ?? (multiline ? MULTILINE_HEIGHT : FIELD_HEIGHT);
  const labelW = label ? (opts.labelWidth ?? FIELD_LABEL_W) : 0;
  const fieldW = (opts.width ?? CONTENT_W - indent) - labelW;
  ensureSpace(state, h + 4);
  if (label) {
    state.page.drawText(label, {
      x: MARGIN + indent,
      y: state.y - FONT_SIZE_SMALL - 2,
      size: FONT_SIZE_SMALL,
      font: state.font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }
  const field = state.form.createTextField(name);
  field.addToPage(state.page, {
    x: MARGIN + indent + labelW,
    y: state.y - h,
    width: fieldW,
    height: h,
  });
  if (multiline) {
    field.enableMultiline();
    field.setFontSize(0);
  } else {
    field.setFontSize(FONT_SIZE_BODY);
  }
  state.y -= h + 4;
}

/** Draw a blank bordered box (for drawing requirements). */
function addDrawBox(state: LayoutState, indent: number): void {
  ensureSpace(state, DRAW_BOX_HEIGHT + 4);
  state.page.drawRectangle({
    x: MARGIN + indent,
    y: state.y - DRAW_BOX_HEIGHT,
    width: CONTENT_W - indent,
    height: DRAW_BOX_HEIGHT,
    borderColor: rgb(0.6, 0.6, 0.6),
    borderWidth: 1,
  });
  state.y -= DRAW_BOX_HEIGHT + 4;
}

function renderSegmentFields(
  state: LayoutState,
  fName: string,
  fieldIndent: number,
  seg: PromptSegment,
): void {
  const { fieldType, count } = seg;
  if (fieldType === "demonstrate" || fieldType === "do") return;

  if (count !== null && count <= 6) {
    const h = fieldType === "write-long" ? 2 * FIELD_HEIGHT : FIELD_HEIGHT;
    const ml = fieldType === "write-long";
    for (let i = 0; i < count; i++) {
      addTextField(state, fieldName(fName, state), `${i + 1}.`, { indent: fieldIndent, height: h, labelWidth: 24, multiline: ml });
    }
  } else if (count !== null && count > 6) {
    addTextField(state, fieldName(fName, state), "", {
      indent: fieldIndent,
      multiline: true,
      height: Math.min(count, 10) * FIELD_HEIGHT,
    });
  } else if (fieldType === "write-long") {
    addTextField(state, fieldName(fName, state), "", { indent: fieldIndent, multiline: true });
  } else if (fieldType === "write-short" || fieldType === "compute") {
    addTextField(state, fieldName(fName, state), "", { indent: fieldIndent });
  } else if (fieldType === "draw") {
    addDrawBox(state, fieldIndent);
  }
}

/** Render one requirement node recursively. */
function renderRequirement(
  state: LayoutState,
  req: Requirement,
  depth: number,
  prefix: string,
): void {
  const indent = depth * 16;
  const reqPath = req.path.replace(/\./g, "_");

  if (classifyNode(req) === "container") {
    ensureSpace(state, 24);
    drawText(state, `${prefix}. ${stripMarkdown(req.text)}`, { bold: true, indent, size: FONT_SIZE_BODY });

    const mode = req.subrequirement_mode;
    if (mode?.type === "select" && mode.count) {
      drawText(state, `Complete ${mode.count} of the following:`, {
        indent: indent + 8,
        size: FONT_SIZE_SMALL,
        color: [0.4, 0.4, 0.4],
      });
    }

    if (req.subrequirements) {
      for (const child of req.subrequirements) {
        renderRequirement(state, child, depth + 1, child.req_id);
      }
    }
    return;
  }

  // Leaf: parse into prompt segments; each gets its own label + field(s)
  const segments = parsePrompts(req.text);
  const fName = `req_${reqPath}`;
  const fieldIndent = indent + 12;

  segments.forEach((seg, i) => {
    drawText(state, i === 0 ? `${prefix}. ${seg.text}` : seg.text, { indent, size: FONT_SIZE_BODY });
    state.y -= 2;
    renderSegmentFields(state, fName, fieldIndent, seg);
    state.y -= 4;
  });

  if (req.subrequirements) {
    for (const child of req.subrequirements) {
      renderRequirement(state, child, depth + 1, child.req_id);
    }
  }
}

async function generateWorksheet(slug: string, data: BadgeData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const form = doc.getForm();

  const state: LayoutState = {
    page: doc.addPage([PAGE_W, PAGE_H]),
    y: PAGE_H - MARGIN,
    doc,
    form,
    font,
    boldFont,
    fieldIndex: 0,
  };

  // Header
  drawText(state, `${data.title} Merit Badge`, { bold: true, size: FONT_SIZE_TITLE });
  drawText(state, "Fillable Worksheet", { size: FONT_SIZE_HEADING, color: [0.3, 0.3, 0.3] });
  const siteUrl = `https://merit-badge.university/merit-badges/${data.slug}/requirements/`;
  drawText(state, siteUrl, { size: FONT_SIZE_SMALL, color: [0.4, 0.4, 0.7] });
  state.y -= 8;

  // Scout info row
  ensureSpace(state, FIELD_HEIGHT + 20);
  const thirdW = (CONTENT_W - 16) / 3;
  for (const [i, [label, name]] of [
    ["Scout Name", "scout_name"],
    ["Unit", "scout_unit"],
    ["Date", "scout_date"],
  ].entries()) {
    const x = MARGIN + i * (thirdW + 8);
    state.page.drawText(label as string, {
      x,
      y: state.y - FONT_SIZE_SMALL - 2,
      size: FONT_SIZE_SMALL,
      font: state.font,
      color: rgb(0.4, 0.4, 0.4),
    });
    const f = form.createTextField(name as string);
    f.addToPage(state.page, {
      x,
      y: state.y - FIELD_HEIGHT - FONT_SIZE_SMALL - 4,
      width: thirdW,
      height: FIELD_HEIGHT,
    });
  }
  state.y -= FIELD_HEIGHT + FONT_SIZE_SMALL + 12;

  // Divider
  state.page.drawLine({
    start: { x: MARGIN, y: state.y },
    end: { x: PAGE_W - MARGIN, y: state.y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  state.y -= 12;

  // Requirements
  for (const [i, req] of data.requirements.entries()) {
    renderRequirement(state, req, 0, req.req_id);
    state.y -= 6;
  }

  return doc.save();
}

async function main(): Promise<void> {
  const badgeSlugsEnv = process.env.BADGE_SLUGS;
  const testMode = process.env.TEST_MODE === "1";

  let slugs: string[];
  if (badgeSlugsEnv) {
    slugs = badgeSlugsEnv.split(",").map(s => s.trim());
  } else if (testMode) {
    slugs = ["archery", "camping", "first-aid"];
  } else {
    slugs = MERIT_BADGES.map(b => b.slug);
  }

  const outDir = path.join(import.meta.dir, "../hugo/static/worksheets");
  mkdirSync(outDir, { recursive: true });

  const generated: string[] = [];

  for (const slug of slugs) {
    const dataPath = path.join(import.meta.dir, "../hugo/data/merit-badges", `${slug}.json`);
    if (!existsSync(dataPath)) {
      console.warn(`[skip] ${slug}: data.json not found`);
      continue;
    }
    const data: BadgeData = JSON.parse(readFileSync(dataPath, "utf8"));
    console.log(`[gen] ${data.title}...`);
    const pdf = await generateWorksheet(slug, data);
    const outPath = path.join(outDir, `${slug}-worksheet.pdf`);
    const tmpPath = outPath + ".tmp.pdf";
    writeFileSync(tmpPath, pdf);
    // Post-process: strip AP streams from multiline fields, set /Helv 0 Tf DA
    const fixScript = path.join(import.meta.dir, "fix-worksheet-fields.py");
    const result = spawnSync("python3", [fixScript, tmpPath, outPath], { encoding: "utf8" });
    if (result.status !== 0) {
      console.warn(`  [warn] pikepdf post-process failed, using raw output\n  ${result.stderr}`);
      writeFileSync(outPath, pdf);
    }
    try { require("fs").unlinkSync(tmpPath); } catch {}
    generated.push(slug);
    console.log(`  -> ${outPath}`);
  }

  // Write worksheets.json manifest
  const manifestPath = path.join(import.meta.dir, "../hugo/data/worksheets.json");
  writeFileSync(manifestPath, JSON.stringify({ slugs: generated }, null, 2));
  console.log(`\nManifest: hugo/data/worksheets.json (${generated.length} badges)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
