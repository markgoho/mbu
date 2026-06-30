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
import {
  classifyNode,
  parsePrompts,
  parseChoiceList,
  parseCompletionClause,
  parseOralActionLabel,
  parseLabeledPair,
  detectInterviewCount,
} from "./lib/requirement-field-type.ts";
import type {
  Requirement,
  PromptSegment,
  SegmentFieldType,
} from "./lib/requirement-field-type.ts";
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
const CHECKBOX_SIZE = 11;

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

/** Draw a horizontal row of choice checkboxes, wrapping as needed. */
function addCheckboxGroup(
  state: LayoutState,
  baseName: string,
  labels: string[],
  indent: number,
): void {
  const startX = MARGIN + indent;
  const maxX = MARGIN + CONTENT_W;
  ensureSpace(state, CHECKBOX_SIZE + 8);
  let x = startX;
  for (const label of labels) {
    const labelW = state.font.widthOfTextAtSize(label, FONT_SIZE_BODY);
    const cellW = CHECKBOX_SIZE + 5 + labelW + 18;
    if (x !== startX && x + cellW > maxX) {
      state.y -= CHECKBOX_SIZE + 6;
      ensureSpace(state, CHECKBOX_SIZE + 8);
      x = startX;
    }
    const cb = state.form.createCheckBox(`${baseName}_${state.fieldIndex++}`);
    cb.addToPage(state.page, {
      x,
      y: state.y - CHECKBOX_SIZE,
      width: CHECKBOX_SIZE,
      height: CHECKBOX_SIZE,
      borderWidth: 1,
      borderColor: rgb(0.4, 0.4, 0.4),
    });
    state.page.drawText(label, {
      x: x + CHECKBOX_SIZE + 5,
      y: state.y - CHECKBOX_SIZE + 2,
      size: FONT_SIZE_BODY,
      font: state.font,
      color: rgb(0, 0, 0),
    });
    x += cellW;
  }
  state.y -= CHECKBOX_SIZE + 8;
}

/** Draw a single completion checkbox with a label. */
function addCompletionCheckbox(
  state: LayoutState,
  name: string,
  label: string,
  indent: number,
): void {
  ensureSpace(state, CHECKBOX_SIZE + 8);
  const cb = state.form.createCheckBox(name);
  cb.addToPage(state.page, {
    x: MARGIN + indent,
    y: state.y - CHECKBOX_SIZE,
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
    borderWidth: 1,
    borderColor: rgb(0.4, 0.4, 0.4),
  });
  const labelMaxW = CONTENT_W - indent - CHECKBOX_SIZE - 5;
  const lines = wrapText(label, state.font, FONT_SIZE_BODY, labelMaxW);
  state.page.drawText(lines[0], {
    x: MARGIN + indent + CHECKBOX_SIZE + 5,
    y: state.y - CHECKBOX_SIZE + 2,
    size: FONT_SIZE_BODY,
    font: state.font,
    color: rgb(0, 0, 0),
  });
  state.y -= CHECKBOX_SIZE + 8;
}

// Countable nouns whose items have a name worth recording (a song title, a
// book title, etc.) → render a name field above each description box.
const NAMEABLE_ITEMS = new Set([
  "song", "book", "film", "movie", "recording", "poem", "story",
  "picture", "photograph", "article", "biography",
]);

function singularize(noun: string): string {
  return noun.replace(/ies$/i, "y").replace(/s$/i, "");
}

/** Draw a named entry: a single-line title field, then a description box. */
function addNamedEntry(
  state: LayoutState,
  baseName: string,
  itemLabel: string,
  index: number,
  indent: number,
): void {
  addTextField(state, fieldName(baseName, state), `${itemLabel} ${index}`, {
    indent,
    labelWidth: 56,
  });
  addTextField(state, fieldName(baseName, state), "", {
    indent,
    multiline: true,
    height: MULTILINE_HEIGHT * 0.75,
  });
  state.y -= 2;
}

/** Draw a labeled multiline answer box (label above the box). */
function addLabeledBox(
  state: LayoutState,
  name: string,
  label: string,
  indent: number,
): void {
  ensureSpace(state, MULTILINE_HEIGHT + FONT_SIZE_SMALL + 8);
  state.page.drawText(label, {
    x: MARGIN + indent,
    y: state.y - FONT_SIZE_SMALL - 2,
    size: FONT_SIZE_SMALL,
    font: state.boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  state.y -= FONT_SIZE_SMALL + 4;
  addTextField(state, name, "", { indent, multiline: true, height: MULTILINE_HEIGHT });
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

// A "discuss" requirement defaults to the counselor, but some explicitly name a
// different party ("discuss with your family/parent/group"). Reflect that in the
// checkbox label so the Scout knows who the conversation is with.
function discussLabel(text: string): string {
  const t = text.toLowerCase();
  if (/\bwith\s+(?:your|a|the)\s+(?:parent|guardian)s?\b/.test(t))
    return "Discussed with parent/guardian";
  if (/\bwith\s+(?:your|the)\s+famil(?:y|ies)\b/.test(t)) return "Discussed with family";
  if (/\bwith\s+(?:your|the)\s+(?:group|patrol|troop|den|crew|class|team|unit)\b/.test(t))
    return "Discussed with group";
  return "Discussed with counselor";
}

function renderSegmentFields(
  state: LayoutState,
  fName: string,
  fieldIndent: number,
  seg: PromptSegment,
): void {
  const { fieldType, count } = seg;
  if (fieldType === "demonstrate" || fieldType === "do" || fieldType === "discuss") {
    // Conversation with the counselor → completion checkbox.
    if (fieldType === "discuss") {
      addCompletionCheckbox(state, fieldName(fName, state), discussLabel(seg.text), fieldIndent);
      return;
    }
    // A self-contained oral performance ("Give a talk", "Lead a discussion")
    // gets a single completion checkbox with a concise label.
    const oralLabel = parseOralActionLabel(seg.text);
    if (oralLabel) {
      addCompletionCheckbox(state, fieldName(fName, state), oralLabel, fieldIndent);
      return;
    }
    // Activity requirements may carry an inline choice list ("a song, dance,
    // poem, or story") and/or a completion action ("and teach it to friends").
    const choices = parseChoiceList(seg.text);
    if (choices) addCheckboxGroup(state, fName, choices, fieldIndent);
    const completion = parseCompletionClause(seg.text);
    if (completion) addCompletionCheckbox(state, fieldName(fName, state), completion, fieldIndent);
    // A physical-skill requirement ("Demonstrate …", "Shoot a round …") with no
    // other field gets a completion checkbox so it can be tracked.
    if (fieldType === "demonstrate" && !choices && !completion) {
      addCompletionCheckbox(state, fieldName(fName, state), "Completed", fieldIndent);
    }
    return;
  }

  const itemNoun = seg.noun ? singularize(seg.noun) : null;
  if (count !== null && count <= 6 && itemNoun && NAMEABLE_ITEMS.has(itemNoun)) {
    const itemLabel = itemNoun.charAt(0).toUpperCase() + itemNoun.slice(1);
    for (let i = 0; i < count; i++) {
      addNamedEntry(state, fName, itemLabel, i + 1, fieldIndent);
    }
  } else if (count !== null && count <= 6) {
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
  inherited?: SegmentFieldType | "label-only",
): void {
  const indent = depth * 16;
  const reqPath = req.path.replace(/\./g, "_");

  // Named options ("Option A—Beef Cattle…") already read as their own label;
  // don't prepend the slugified req_id.
  const labelPrefix = req.is_option ? "" : `${prefix}. `;

  // Intro parent ("Explain the following:") whose children are bare items: render
  // the header, then give each child its own field inheriting the lead verb.
  // An "intro parent" ends with a colon and delegates a single verb to its
  // children — either "Explain the following:" or a trailing imperative like
  // "List the three branches… Explain:". "discuss" is excluded so it stays a
  // single-checkbox discussion container handled below.
  const introVerb = req.subrequirements?.length
    ? stripMarkdown(req.text)
        .trim()
        .match(/(?:^|[.;]\s+)(explain|describe|tell|list|name|identify|define)\b[^.:]*:\s*$/i)?.[1]
    : undefined;
  if (introVerb) {
    const v = introVerb.toLowerCase();
    const childType: SegmentFieldType = /^(?:list|name|identify)$/.test(v)
      ? "write-short"
      : v === "discuss"
        ? "discuss"
        : "write-long";
    ensureSpace(state, 24);
    drawText(state, `${labelPrefix}${stripMarkdown(req.text)}`, { indent, size: FONT_SIZE_BODY });
    state.y -= 2;
    for (const child of req.subrequirements!) {
      renderRequirement(state, child, depth + 1, child.req_id, childType);
    }
    return;
  }

  // A "Discuss … :" parent with sub-topics is a single conversation: render the
  // header, one shared "Discussed" checkbox, and the topics as plain text. (Some
  // such parents aren't caught by the container classifier when they lack the
  // word "following".)
  if (
    req.subrequirements?.length &&
    /^discuss\b/i.test(stripMarkdown(req.text).trim()) &&
    /:\s*$/.test(stripMarkdown(req.text).trim())
  ) {
    ensureSpace(state, 24);
    drawText(state, `${labelPrefix}${stripMarkdown(req.text)}`, { indent, size: FONT_SIZE_BODY });
    state.y -= 2;
    addCompletionCheckbox(state, fieldName(`req_${reqPath}`, state), discussLabel(req.text), indent + 12);
    for (const child of req.subrequirements) {
      renderRequirement(state, child, depth + 1, child.req_id, "label-only");
    }
    return;
  }

  if (classifyNode(req) === "container") {
    ensureSpace(state, 24);
    drawText(state, `${labelPrefix}${stripMarkdown(req.text)}`, { bold: true, indent, size: FONT_SIZE_BODY });

    const mode = req.subrequirement_mode;
    if (mode?.type === "select" && mode.count) {
      drawText(state, `Complete ${mode.count} of the following:`, {
        indent: indent + 8,
        size: FONT_SIZE_SMALL,
        color: [0.4, 0.4, 0.4],
      });
    }

    // A list of options lets each fully field-less option carry a completion
    // checkbox so the Scout can mark which ones they did. Skipped for discussion
    // containers, which instead get one shared "Discussed" checkbox.
    const isDiscussContainer = /^discuss\b/i.test(stripMarkdown(req.text).trim());
    const childInherit: SegmentFieldType | "label-only" = isDiscussContainer
      ? "label-only"
      : "demonstrate";
    if (req.subrequirements) {
      for (const child of req.subrequirements) {
        renderRequirement(state, child, depth + 1, child.req_id, childInherit);
      }
    }

    // "Discuss the following with your counselor:" → one completion checkbox
    // covering the discussion of all the listed topics.
    if (isDiscussContainer) {
      addCompletionCheckbox(state, fieldName(`req_${reqPath}`, state), discussLabel(req.text), indent + 12);
    }
    return;
  }

  // Leaf: parse into prompt segments; each gets its own label + field(s)
  let segments = parsePrompts(req.text);
  const fName = `req_${reqPath}`;
  const fieldIndent = indent + 12;

  const renderChildren = (): void => {
    if (req.subrequirements) {
      for (const child of req.subrequirements) {
        renderRequirement(state, child, depth + 1, child.req_id);
      }
    }
  };

  const drawSegmentText = (): void => {
    segments.forEach((seg, i) => {
      drawText(state, i === 0 ? `${labelPrefix}${seg.text}` : seg.text, { indent, size: FONT_SIZE_BODY });
    });
  };

  // A topic listed under a "Discuss … with your counselor:" container is just a
  // talking point — render it as text; the parent carries the single checkbox.
  if (inherited === "label-only") {
    drawSegmentText();
    state.y -= 4;
    renderChildren();
    return;
  }

  // A child of an "Explain/Describe the following:" intro parent inherits its
  // verb. Override bare phrases ("do") and spurious "discuss" matches (e.g. a
  // topic that merely contains the word "discuss"), but keep a child's own
  // explicit draw/compute/write field if it has one.
  if (inherited && inherited !== "demonstrate") {
    segments = segments.map(s =>
      s.fieldType === "do" || s.fieldType === "discuss" ? { ...s, fieldType: inherited } : s,
    );
  }

  // A fully field-less option inside a "choose/do one of the following" list →
  // one completion checkbox so the Scout can mark it done. When the option is
  // itself a "do ALL the following" task list, push the tracking down so each
  // listed task gets its own checkbox instead of one on the wrapper.
  if (inherited === "demonstrate" && segments.every(s => s.fieldType === "do")) {
    drawSegmentText();
    state.y -= 2;
    const isTaskList =
      !!req.subrequirements?.length &&
      /\b(?:do|complete|perform)\b[^.]*\bfollowing\b/i.test(stripMarkdown(req.text));
    if (isTaskList) {
      for (const child of req.subrequirements!) {
        renderRequirement(state, child, depth + 1, child.req_id, "demonstrate");
      }
    } else {
      addCompletionCheckbox(state, fieldName(fName, state), "Completed", fieldIndent);
      renderChildren();
    }
    state.y -= 4;
    return;
  }

  // Leaf mode: counted interviews → completion checkboxes, no written fields.
  const interviewCount = detectInterviewCount(req.text);
  if (interviewCount) {
    drawSegmentText();
    state.y -= 2;
    for (let k = 1; k <= interviewCount; k++) {
      addCompletionCheckbox(state, fieldName(fName, state), `Interview ${k} complete`, fieldIndent);
    }
    state.y -= 4;
    renderChildren();
    return;
  }

  // Leaf mode: "one a political leader … and the other a private citizen" → two
  // labeled boxes covering the whole requirement (the rest is instruction text).
  const labeledPair = parseLabeledPair(req.text);
  if (labeledPair) {
    drawSegmentText();
    state.y -= 2;
    addLabeledBox(state, fieldName(fName, state), labeledPair[0], fieldIndent);
    addLabeledBox(state, fieldName(fName, state), labeledPair[1], fieldIndent);
    state.y -= 4;
    renderChildren();
    return;
  }

  // Leaf mode: open-ended research narrative → one box (+ counselor checkbox).
  if (/^(?:research|investigate|study|trace|explore)\b/i.test(segments[0]?.text ?? "")) {
    drawSegmentText();
    state.y -= 2;
    addTextField(state, fieldName(fName, state), "", { indent: fieldIndent, multiline: true });
    const discussSeg = segments.find(s => s.fieldType === "discuss");
    if (discussSeg) {
      addCompletionCheckbox(state, fieldName(fName, state), discussLabel(discussSeg.text), fieldIndent);
    }
    state.y -= 4;
    renderChildren();
    return;
  }

  // A standalone activity requirement with no written, visual, or oral
  // deliverable ("carry your pack to complete a hike", "participate in three
  // treks") → a single completion checkbox so it can be tracked.
  if (!req.subrequirements?.length && segments.every(s => s.fieldType === "do")) {
    drawSegmentText();
    state.y -= 2;
    addCompletionCheckbox(state, fieldName(fName, state), "Completed", fieldIndent);
    state.y -= 4;
    return;
  }

  segments.forEach((seg, i) => {
    drawText(state, i === 0 ? `${labelPrefix}${seg.text}` : seg.text, { indent, size: FONT_SIZE_BODY });
    state.y -= 2;
    renderSegmentFields(state, fName, fieldIndent, seg);
    state.y -= 4;
  });

  renderChildren();
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

  // Worksheets are nested per badge so each is served alongside its landing page
  // at /merit-badges/{slug}/worksheet.pdf.
  const baseDir = path.join(import.meta.dir, "../hugo/static/merit-badges");

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
    const outDir = path.join(baseDir, slug);
    mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `${slug}-merit-badge-worksheet.pdf`);
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
