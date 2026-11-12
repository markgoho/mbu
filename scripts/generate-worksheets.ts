/**
 * Generate fillable AcroForm PDF worksheets for merit badges.
 *
 * The PDFs are committed under hugo/static; the site build does not run this.
 * Regenerate them after a requirements sync or a change here.
 *
 * Usage:
 *   bun scripts/generate-worksheets.ts
 *   BADGE_SLUGS="camping,first-aid" bun scripts/generate-worksheets.ts
 *   TEST_MODE=1 bun scripts/generate-worksheets.ts
 *   OUT_DIR=/tmp/worksheets BADGE_SLUGS="camping" bun scripts/generate-worksheets.ts
 */

import fontkit from "@pdf-lib/fontkit";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import {
  appendBezierCurve,
  closePath,
  lineTo,
  moveTo,
  PDFBool,
  PDFDict,
  PDFDocument,
  PDFFont,
  PDFForm,
  PDFHexString,
  PDFName,
  PDFPage,
  PDFRef,
  PDFString,
  PDFTextField,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  setLineWidth,
  setStrokingRgbColor,
  StandardFonts,
  stroke,
  type PDFField,
  type RGB,
} from "pdf-lib";
import type {
  PromptSegment,
  Requirement,
  SegmentFieldType,
} from "./lib/requirement-field-type.ts";
import {
  asksToExplainDrawing,
  classifyNode,
  detectInterviewCount,
  parseChoiceList,
  parseCompletionClause,
  parseLabeledPair,
  parseOralActionLabel,
  parsePrompts,
} from "./lib/requirement-field-type.ts";
import { MERIT_BADGES } from "./merit-badges.ts";

interface BadgeData {
  title: string;
  slug: string;
  requirements: Requirement[];
}

// --- Page geometry (points; US Letter) ---
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN_X = 54;
const MARGIN_TOP = 50;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const FOOTER_Y = 30;
const CONTENT_BOTTOM = 58;

// --- Type ---
const SIZE_BODY = 10.5;
const SIZE_LABEL = 9;
const SIZE_FOOTER = 7.5;
const SIZE_TITLE = 20;
const LEADING = 1.38;

// --- Fields ---
// Line pitch roomy enough for handwriting on a printed copy.
const LINE_H = 22;
const MULTILINE_H = LINE_H * 4;
const DRAW_BOX_H = 160;
const CHECKBOX = 12;
const FIELD_INSET = 1.5;
const FIELD_FONT_SIZE = 10;

// Each nesting level indents by one marker gutter, so a child's marker lines
// up under its parent's text.
const GUTTER = 20;

// Light-theme tokens from uni-theme assets/css/standard.css. Official wording
// prints in ink; olive marks our own labels, as on the site.
const hex = (h: string): RGB =>
  rgb(
    ...(h.match(/[0-9a-f]{2}/gi)!.map(c => parseInt(c, 16) / 255) as [
      number,
      number,
      number,
    ]),
  );
const INK = hex("#1d2420"); // --on-surface
const MUTED = hex("#4d564f"); // --on-surface-muted
const OLIVE = hex("#45653a"); // --accent / --mast
const GOLD = hex("#c9a227"); // --gold
const FIELD_LINE = hex("#a9b0a5"); // between --outline and --on-surface-muted: visible on paper
const RULE = hex("#c9cec5"); // --outline

const SITE = "merit-badge.university";

/**
 * One unbreakable slice of the worksheet. Blocks are built first and laid out
 * after, so a prompt can move to the next page together with its answer field.
 */
interface Block {
  height: number;
  /** Gap above the block; dropped at the top of a page. */
  space: number;
  /** Keep on the same page as the block after it (prompt text, headings). */
  keepWithNext?: boolean;
  /** Hairline above the block, separating top-level requirements. */
  ruleAbove?: boolean;
  draw: (page: PDFPage, top: number) => void;
}

/**
 * The checkbox a Scout ticks to mark which option of a "choose N" list they
 * picked. Its name is settled while the option's fields are built, before the
 * page is drawn (see renderRequirement).
 */
interface ChoiceBox {
  name: string;
  tooltip: string;
}

interface Sheet {
  blocks: Block[];
  form: PDFForm;
  font: PDFFont;
  fieldIndex: number;
}

// Field names carry a running index ("req_1_b_2"), so the order of
// fieldName() calls below is part of the PDF's interface: keep it stable.
function fieldName(prefix: string, sheet: Sheet): string {
  return `${prefix}_${sheet.fieldIndex++}`;
}

/** Wrap text to lines fitting maxWidth. */
function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

/** Strip markdown links [text](url) -> text, and emphasis markers. */
function stripMarkdown(text: string): string {
  return decodeEntities(
    text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\*\*/g, "")
      .replace(/\*/g, ""),
  );
}

// The synced requirement text carries a few HTML entities ("4&frac12;") that
// the site renders as characters; the PDF must too.
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  deg: "°",
  eacute: "é",
  frac12: "½",
  reg: "®",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|[a-z]\w*);/gi, (match, ref: string) =>
    ref.startsWith("#")
      ? String.fromCodePoint(Number(ref.slice(1)))
      : (NAMED_ENTITIES[ref] ?? match),
  );
}

// Two decimals is far finer than print or screen resolution, and keeps the
// content streams small (pdf-lib would otherwise write full float precision).
const r2 = (n: number): number => Math.round(n * 100) / 100;

/** Rounded rectangle outline drawn into the page content, so it prints in every viewer. */
function drawBox(
  page: PDFPage,
  x: number,
  top: number,
  w: number,
  h: number,
  color: RGB,
  radius = 3,
): void {
  // Quarter-circle corners as Bézier curves (k = 0.55 of the radius).
  const r = radius;
  const k = r * 0.45;
  const [x0, x1, y0, y1] = [x, x + w, top - h, top].map(r2) as [
    number,
    number,
    number,
    number,
  ];
  page.pushOperators(
    pushGraphicsState(),
    setStrokingRgbColor(r2(color.red), r2(color.green), r2(color.blue)),
    setLineWidth(0.75),
    moveTo(x0 + r, y0),
    lineTo(x1 - r, y0),
    appendBezierCurve(x1 - k, y0, x1, y0 + k, x1, y0 + r),
    lineTo(x1, y1 - r),
    appendBezierCurve(x1, y1 - k, x1 - k, y1, x1 - r, y1),
    lineTo(x0 + r, y1),
    appendBezierCurve(x0 + k, y1, x0, y1 - k, x0, y1 - r),
    lineTo(x0, y0 + r),
    appendBezierCurve(x0, y0 + k, x0 + k, y0, x0 + r, y0),
    closePath(),
    stroke(),
    popGraphicsState(),
  );
}

/** Short accessible name for a field, shown as a tooltip and read by screen readers. */
function describe(field: PDFField, text: string): void {
  // A plain literal string is a quarter the size of the UTF-16 hex form.
  const value = /^[\x20-\x7e]*$/.test(text)
    ? PDFString.of(text.replace(/[\\()]/g, "\\$&"))
    : PDFHexString.fromText(text);
  field.acroField.dict.set(PDFName.of("TU"), value);
}

function reqLabel(pathStr: string): string {
  return `Requirement ${pathStr.replace(/\./g, "")}`;
}

// --- Block builders ---

/** A paragraph, with an optional marker ("1.", "a.") hanging in the gutter. */
function addText(
  sheet: Sheet,
  text: string,
  indent: number,
  opts: {
    marker?: string;
    color?: RGB;
    size?: number;
    space?: number;
    ruleAbove?: boolean;
    /** A choice checkbox in the column left of the marker. */
    choice?: ChoiceBox;
  } = {},
): void {
  const size = opts.size ?? SIZE_BODY;
  const { font } = sheet;
  const textX = MARGIN_X + indent + (opts.marker ? GUTTER : 0);
  const lines = wrapText(
    stripMarkdown(text),
    font,
    size,
    PAGE_W - MARGIN_X - textX,
  );
  const lineH = size * LEADING;
  sheet.blocks.push({
    height: lines.length * lineH,
    space: opts.space ?? 9,
    keepWithNext: true,
    ruleAbove: opts.ruleAbove,
    draw(page, top) {
      const baseline = top - size;
      if (opts.choice) {
        const cbTop = baseline + size * 0.35 + CHECKBOX / 2;
        addCheckbox(
          page,
          sheet,
          opts.choice.name,
          opts.choice.tooltip,
          MARGIN_X + indent - CHECKBOX - 5,
          cbTop,
        );
      }
      if (opts.marker) {
        page.drawText(opts.marker, {
          x: MARGIN_X + indent,
          y: baseline,
          size,
          font: sheet.font,
          color: OLIVE,
        });
      }
      lines.forEach((line, i) => {
        page.drawText(line, {
          x: textX,
          y: baseline - i * lineH,
          size,
          font,
          color: opts.color ?? INK,
        });
      });
    },
  });
}

/** Draw a field box and put a borderless text field just inside it. */
function placeTextField(
  page: PDFPage,
  sheet: Sheet,
  name: string,
  tooltip: string,
  box: { x: number; top: number; w: number; h: number },
  multiline = false,
): void {
  const { x, top, w, h } = box;
  drawBox(page, x, top, w, h, FIELD_LINE);
  const field = sheet.form.createTextField(name);
  describe(field, tooltip);
  if (multiline) field.enableMultiline();
  field.addToPage(page, {
    x: x + FIELD_INSET,
    y: top - h + FIELD_INSET,
    width: w - FIELD_INSET * 2,
    height: h - FIELD_INSET * 2,
    borderWidth: 0,
    borderColor: undefined,
    backgroundColor: undefined,
  });
}

/** A text field block, with an optional label in the left column. */
function addTextField(
  sheet: Sheet,
  name: string,
  tooltip: string,
  indent: number,
  opts: {
    label?: string;
    labelWidth?: number;
    height?: number;
    multiline?: boolean;
    space?: number;
    keepWithNext?: boolean;
  } = {},
): void {
  const h = opts.height ?? (opts.multiline ? MULTILINE_H : LINE_H);
  const labelW = opts.label ? (opts.labelWidth ?? 24) : 0;
  const x = MARGIN_X + indent + labelW;
  const w = CONTENT_W - indent - labelW;
  sheet.blocks.push({
    height: h,
    space: opts.space ?? 5,
    keepWithNext: opts.keepWithNext,
    draw(page, top) {
      if (opts.label) {
        page.drawText(opts.label, {
          x: MARGIN_X + indent,
          y: top - Math.min(h, LINE_H) / 2 - SIZE_LABEL * 0.35,
          size: SIZE_LABEL,
          font: sheet.font,
          color: OLIVE,
        });
      }
      placeTextField(
        page,
        sheet,
        name,
        tooltip,
        { x, top, w, h },
        opts.multiline,
      );
    },
  });
}

/** Our own short label (olive), kept on the same page as what follows it. */
function addLabel(
  sheet: Sheet,
  label: string,
  indent: number,
  space = 7,
): void {
  addText(sheet, label, indent, {
    color: OLIVE,
    size: SIZE_LABEL,
    space,
  });
}

function addCheckbox(
  page: PDFPage,
  sheet: Sheet,
  name: string,
  tooltip: string,
  x: number,
  top: number,
): void {
  drawBox(page, x, top, CHECKBOX, CHECKBOX, MUTED, 2);
  const cb = sheet.form.createCheckBox(name);
  describe(cb, tooltip);
  cb.addToPage(page, {
    x,
    y: top - CHECKBOX,
    width: CHECKBOX,
    height: CHECKBOX,
    borderWidth: 0,
    borderColor: undefined,
    backgroundColor: undefined,
    textColor: INK,
  });
}

/** A row of choice checkboxes, wrapping as needed. */
function addCheckboxGroup(
  sheet: Sheet,
  baseName: string,
  tooltip: string,
  labels: string[],
  indent: number,
): void {
  const startX = MARGIN_X + indent;
  const font = sheet.font;
  const rows: { label: string; x: number; name: string }[][] = [[]];
  let x = startX;
  for (const label of labels) {
    const cellW = CHECKBOX + 6 + font.widthOfTextAtSize(label, SIZE_BODY) + 18;
    if (x !== startX && x + cellW > MARGIN_X + CONTENT_W) {
      rows.push([]);
      x = startX;
    }
    rows.at(-1)!.push({ label, x, name: fieldName(baseName, sheet) });
    x += cellW;
  }
  for (const row of rows) {
    sheet.blocks.push({
      height: CHECKBOX + 2,
      space: 6,
      draw(page, top) {
        for (const cell of row) {
          addCheckbox(
            page,
            sheet,
            cell.name,
            `${tooltip}: ${cell.label}`,
            cell.x,
            top,
          );
          page.drawText(cell.label, {
            x: cell.x + CHECKBOX + 6,
            y: top - CHECKBOX + 2.5,
            size: SIZE_BODY,
            font,
            color: INK,
          });
        }
      },
    });
  }
}

/** A single completion checkbox with our own label beside it. */
function addCompletionCheckbox(
  sheet: Sheet,
  name: string,
  tooltip: string,
  label: string,
  indent: number,
): void {
  const font = sheet.font;
  const textX = MARGIN_X + indent + CHECKBOX + 6;
  const lines = wrapText(label, font, SIZE_LABEL, PAGE_W - MARGIN_X - textX);
  const lineH = SIZE_LABEL * LEADING;
  sheet.blocks.push({
    height: Math.max(CHECKBOX, (lines.length - 1) * lineH + CHECKBOX),
    space: 6,
    draw(page, top) {
      addCheckbox(
        page,
        sheet,
        name,
        `${tooltip}: ${label}`,
        MARGIN_X + indent,
        top,
      );
      lines.forEach((line, i) => {
        page.drawText(line, {
          x: textX,
          y: top - CHECKBOX + 3 - i * lineH,
          size: SIZE_LABEL,
          font,
          color: OLIVE,
        });
      });
    },
  });
}

/** A blank box to draw in. */
function addDrawBox(sheet: Sheet, indent: number): void {
  // Dashed and labeled so it doesn't pass for a box you can type in.
  const label = "Space to draw on a printed copy";
  sheet.blocks.push({
    height: DRAW_BOX_H,
    space: 5,
    draw(page, top) {
      const x = MARGIN_X + indent;
      page.drawRectangle({
        x,
        y: top - DRAW_BOX_H,
        width: CONTENT_W - indent,
        height: DRAW_BOX_H,
        borderColor: FIELD_LINE,
        borderWidth: 0.75,
        borderDashArray: [3, 3],
      });
      page.drawText(label, {
        x: x + 8,
        y: top - 8 - SIZE_LABEL,
        size: SIZE_LABEL,
        font: sheet.font,
        color: OLIVE,
      });
    },
  });
}

// --- Requirement rendering ---

// Countable nouns whose items have a name worth recording (a song title, a
// book title, etc.) → render a name field above each description box.
const NAMEABLE_ITEMS = new Set([
  "song",
  "book",
  "film",
  "movie",
  "recording",
  "poem",
  "story",
  "picture",
  "photograph",
  "article",
  "biography",
]);

function singularize(noun: string): string {
  return noun.replace(/ies$/i, "y").replace(/s$/i, "");
}

// A "discuss" requirement defaults to the counselor, but some explicitly name a
// different party ("discuss with your family/parent/group"), and some lead with
// another oral verb ("Present … to your counselor"). Reflect both in the
// checkbox label so the Scout knows what to do and with whom.
function discussLabel(text: string): string {
  const t = stripMarkdown(text).trim().toLowerCase();
  const party = /\bwith\s+(?:your|a|the)\s+(?:parent|guardian)s?\b/.test(t)
    ? "parent/guardian"
    : /\bwith\s+(?:your|the)\s+famil(?:y|ies)\b/.test(t)
      ? "family"
      : /\bwith\s+(?:your|the)\s+(?:group|patrol|troop|den|crew|class|team|unit)\b/.test(
            t,
          )
        ? "group"
        : "counselor";
  if (t.startsWith("present")) return `Presented to ${party}`;
  if (t.startsWith("show")) return `Showed ${party}`;
  if (t.startsWith("share")) return `Shared with ${party}`;
  return `Discussed with ${party}`;
}

function renderSegmentFields(
  sheet: Sheet,
  fName: string,
  tip: string,
  fieldIndent: number,
  seg: PromptSegment,
  addCompleted: () => void,
): void {
  const { fieldType, count } = seg;
  if (
    fieldType === "demonstrate" ||
    fieldType === "do" ||
    fieldType === "discuss"
  ) {
    // Conversation with the counselor → completion checkbox.
    if (fieldType === "discuss") {
      addCompletionCheckbox(
        sheet,
        fieldName(fName, sheet),
        tip,
        discussLabel(seg.text),
        fieldIndent,
      );
      return;
    }
    // A self-contained oral performance ("Give a talk", "Lead a discussion")
    // gets a single completion checkbox with a concise label.
    const oralLabel = parseOralActionLabel(seg.text);
    if (oralLabel) {
      addCompletionCheckbox(
        sheet,
        fieldName(fName, sheet),
        tip,
        oralLabel,
        fieldIndent,
      );
      return;
    }
    // Activity requirements may carry an inline choice list ("a song, dance,
    // poem, or story") and/or a completion action ("and teach it to friends").
    const choices = parseChoiceList(seg.text);
    if (choices) addCheckboxGroup(sheet, fName, tip, choices, fieldIndent);
    const completion = parseCompletionClause(seg.text);
    if (completion)
      addCompletionCheckbox(
        sheet,
        fieldName(fName, sheet),
        tip,
        completion,
        fieldIndent,
      );
    // A physical-skill requirement ("Demonstrate …", "Shoot a round …") with no
    // other field gets a completion checkbox so it can be tracked.
    if (fieldType === "demonstrate" && !choices && !completion) {
      addCompleted();
    }
    return;
  }

  const itemNoun = seg.noun ? singularize(seg.noun) : null;
  if (
    count !== null &&
    count <= 6 &&
    itemNoun &&
    NAMEABLE_ITEMS.has(itemNoun)
  ) {
    const itemLabel = itemNoun.charAt(0).toUpperCase() + itemNoun.slice(1);
    for (let i = 1; i <= count; i++) {
      // A named entry: a title line, then a description box under it.
      addTextField(
        sheet,
        fieldName(fName, sheet),
        `${tip}: ${itemLabel} ${i}`,
        fieldIndent,
        {
          label: `${itemLabel} ${i}`,
          labelWidth: 56,
          space: i === 1 ? 5 : 10,
          keepWithNext: true,
        },
      );
      addTextField(
        sheet,
        fieldName(fName, sheet),
        `${tip}: ${itemLabel} ${i} notes`,
        fieldIndent,
        {
          multiline: true,
          height: LINE_H * 3,
          space: 4,
        },
      );
    }
  } else if (count !== null && count <= 6) {
    const multiline = fieldType === "write-long";
    for (let i = 1; i <= count; i++) {
      addTextField(
        sheet,
        fieldName(fName, sheet),
        `${tip}: ${i}`,
        fieldIndent,
        {
          label: `${i}.`,
          height: multiline ? 2 * LINE_H : LINE_H,
          multiline,
          space: i === 1 ? 5 : 4,
          // Short numbered lines read as one list; don't split it across pages.
          keepWithNext: !multiline && i < count,
        },
      );
    }
  } else if (count !== null && count > 6) {
    addTextField(sheet, fieldName(fName, sheet), tip, fieldIndent, {
      multiline: true,
      height: Math.min(count, 10) * LINE_H,
    });
  } else if (fieldType === "write-long" || fieldType === "write-short") {
    // "Short" verbs (list, name, identify) only mean short *items*: a counted
    // list gets one line per item above, an open-ended one needs a box.
    addTextField(sheet, fieldName(fName, sheet), tip, fieldIndent, {
      multiline: true,
    });
  } else if (fieldType === "compute") {
    // A single number or amount: one line is enough.
    addTextField(sheet, fieldName(fName, sheet), tip, fieldIndent);
  } else if (fieldType === "draw") {
    addDrawBox(sheet, fieldIndent);
    // "Make a drawing and explain how …" asks for words as well as a picture.
    if (asksToExplainDrawing(seg.text)) {
      addTextField(sheet, fieldName(fName, sheet), tip, fieldIndent, {
        multiline: true,
      });
    }
  }
}

/** Render one requirement node recursively. */
function renderRequirement(
  sheet: Sheet,
  req: Requirement,
  depth: number,
  inherited?: SegmentFieldType | "label-only",
  isChoice = false,
): void {
  const indent = depth * GUTTER;
  const fieldIndent = indent + GUTTER;
  const reqPath = req.path.replace(/\./g, "_");
  const fName = `req_${reqPath}`;
  const tip = reqLabel(req.path);
  const plain = stripMarkdown(req.text).trim();

  // Named options ("Option A—Beef Cattle…") already read as their own label,
  // so they get no "a." marker and their text starts at the marker column.
  const marker = req.is_option ? undefined : `${req.req_id}.`;
  // An option of a "choose N" list gets a checkbox beside its marker. It takes
  // the name of the "Completed" checkbox it replaces, or a name of its own.
  const choice: ChoiceBox | undefined = isChoice
    ? { name: `${fName}_choice`, tooltip: `${tip}: picked this option` }
    : undefined;
  const heading = (): void =>
    addText(sheet, req.text, indent, {
      marker,
      choice,
      ruleAbove: depth === 0,
      space: depth === 0 ? 14 : 9,
    });
  // A generic "Completed" checkbox for the whole requirement; on a choice
  // option the choice checkbox already says it.
  let choiceClaimed = false;
  const addCompleted = (): void => {
    const name = fieldName(fName, sheet);
    if (choice && !choiceClaimed) {
      choice.name = name;
      choiceClaimed = true;
    } else {
      addCompletionCheckbox(sheet, name, tip, "Completed", fieldIndent);
    }
  };

  // Intro parent ("Explain the following:") whose children are bare items: render
  // the header, then give each child its own field inheriting the lead verb.
  // An "intro parent" ends with a colon and delegates a single verb to its
  // children — either "Explain the following:" or a trailing imperative like
  // "List the three branches… Explain:". "discuss" is excluded so it stays a
  // single-checkbox discussion container handled below.
  const introVerb = req.subrequirements?.length
    ? plain.match(
        /(?:^|[.;]\s+)(explain|describe|tell|list|name|identify|define)\b[^.:]*:\s*$/i,
      )?.[1]
    : undefined;
  if (introVerb) {
    const childType: SegmentFieldType = /^(?:list|name|identify)$/i.test(
      introVerb,
    )
      ? "write-short"
      : "write-long";
    heading();
    renderChildren(sheet, req, depth, childType);
    return;
  }

  // A "Discuss … :" parent with sub-topics is a single conversation: render the
  // header, one shared "Discussed" checkbox, and the topics as plain text. (Some
  // such parents aren't caught by the container classifier when they lack the
  // word "following".)
  if (
    req.subrequirements?.length &&
    /^discuss\b/i.test(plain) &&
    /:\s*$/.test(plain)
  ) {
    heading();
    addCompletionCheckbox(
      sheet,
      fieldName(fName, sheet),
      tip,
      discussLabel(req.text),
      fieldIndent,
    );
    renderChildren(sheet, req, depth, "label-only");
    return;
  }

  if (classifyNode(req) === "container") {
    heading();
    // A list of options lets each fully field-less option carry a completion
    // checkbox so the Scout can mark which ones they did. Skipped for discussion
    // containers, which instead get one shared "Discussed" checkbox.
    const isDiscussContainer = /^discuss\b/i.test(plain);
    renderChildren(
      sheet,
      req,
      depth,
      isDiscussContainer ? "label-only" : "demonstrate",
    );

    // "Discuss the following with your counselor:" → one completion checkbox
    // covering the discussion of all the listed topics.
    if (isDiscussContainer) {
      addCompletionCheckbox(
        sheet,
        fieldName(fName, sheet),
        tip,
        discussLabel(req.text),
        fieldIndent,
      );
    }
    return;
  }

  // Leaf: parse into prompt segments; each gets its own text + field(s).
  let segments = parsePrompts(req.text);
  const children = (): void => renderChildren(sheet, req, depth);

  // The first segment carries the marker; later ones continue in the text column.
  const drawSegment = (seg: PromptSegment, i: number): void => {
    if (i === 0) {
      addText(sheet, seg.text, indent, {
        marker,
        choice,
        ruleAbove: depth === 0,
        space: depth === 0 ? 14 : 9,
      });
    } else {
      addText(sheet, seg.text, indent + (marker ? GUTTER : 0), { space: 7 });
    }
  };
  const drawSegmentText = (): void => segments.forEach(drawSegment);

  // A topic listed under a "Discuss … with your counselor:" container is just a
  // talking point — render it as text; the parent carries the single checkbox.
  if (inherited === "label-only") {
    drawSegmentText();
    children();
    return;
  }

  // A child of an "Explain/Describe the following:" intro parent inherits its
  // verb. Override bare phrases ("do") and spurious "discuss" matches (e.g. a
  // topic that merely contains the word "discuss"), but keep a child's own
  // explicit draw/compute/write field if it has one.
  if (inherited && inherited !== "demonstrate") {
    segments = segments.map(s =>
      s.fieldType === "do" || s.fieldType === "discuss"
        ? { ...s, fieldType: inherited }
        : s,
    );
  }

  // A fully field-less option inside a "choose/do one of the following" list →
  // one completion checkbox so the Scout can mark it done. When the option is
  // itself a "do ALL the following" task list, push the tracking down so each
  // listed task gets its own checkbox instead of one on the wrapper.
  if (
    inherited === "demonstrate" &&
    segments.every(s => s.fieldType === "do")
  ) {
    drawSegmentText();
    const isTaskList =
      !!req.subrequirements?.length &&
      /\b(?:do|complete|perform)\b[^.]*\bfollowing\b/i.test(
        stripMarkdown(req.text),
      );
    if (isTaskList) {
      renderChildren(sheet, req, depth, "demonstrate");
    } else {
      addCompleted();
      // An option's checkbox sits under its name, so keep both with the option's first part.
      if (!choice && req.subrequirements?.length) {
        sheet.blocks.at(-1)!.keepWithNext = true;
      }
      children();
    }
    return;
  }

  // Counted interviews → completion checkboxes, no written fields.
  const interviewCount = detectInterviewCount(req.text);
  if (interviewCount) {
    drawSegmentText();
    for (let k = 1; k <= interviewCount; k++) {
      addCompletionCheckbox(
        sheet,
        fieldName(fName, sheet),
        tip,
        `Interview ${k} complete`,
        fieldIndent,
      );
    }
    children();
    return;
  }

  // "one a political leader … and the other a private citizen" → two labeled
  // boxes covering the whole requirement (the rest is instruction text).
  const labeledPair = parseLabeledPair(req.text);
  if (labeledPair) {
    drawSegmentText();
    for (const label of labeledPair) {
      addLabel(sheet, label, fieldIndent);
      addTextField(
        sheet,
        fieldName(fName, sheet),
        `${tip}: ${label}`,
        fieldIndent,
        { multiline: true, space: 3 },
      );
    }
    children();
    return;
  }

  // Open-ended research narrative → one box (+ counselor checkbox).
  if (
    /^(?:research|investigate|study|trace|explore)\b/i.test(
      segments[0]?.text ?? "",
    )
  ) {
    drawSegmentText();
    const discussSeg = segments.find(s => s.fieldType === "discuss");
    addTextField(sheet, fieldName(fName, sheet), tip, fieldIndent, {
      multiline: true,
      keepWithNext: !!discussSeg,
    });
    if (discussSeg) {
      addCompletionCheckbox(
        sheet,
        fieldName(fName, sheet),
        tip,
        discussLabel(discussSeg.text),
        fieldIndent,
      );
    }
    children();
    return;
  }

  // A standalone activity requirement with no written, visual, or oral
  // deliverable ("carry your pack to complete a hike", "participate in three
  // treks") → a single completion checkbox so it can be tracked.
  if (
    !req.subrequirements?.length &&
    segments.every(s => s.fieldType === "do")
  ) {
    drawSegmentText();
    addCompleted();
    return;
  }

  segments.forEach((seg, i) => {
    drawSegment(seg, i);
    renderSegmentFields(sheet, fName, tip, fieldIndent, seg, addCompleted);
  });
  children();
}

/**
 * Render a requirement's sub-requirements. Under a "choose N" parent
 * ("Do ONE of the following") each one becomes a pickable option, with our
 * label saying how many to pick. The count comes from the synced
 * subrequirement_mode, which mirrors the official wording.
 */
function renderChildren(
  sheet: Sheet,
  req: Requirement,
  depth: number,
  inherited?: SegmentFieldType | "label-only",
): void {
  const children = req.subrequirements ?? [];
  const mode = req.subrequirement_mode;
  const pick =
    mode?.type === "select" && mode.count && mode.count < children.length
      ? mode.count
      : 0;
  if (pick) addLabel(sheet, `Choose ${pick}`, (depth + 1) * GUTTER, 6);
  for (const child of children) {
    renderRequirement(sheet, child, depth + 1, inherited, pick > 0);
  }
}

// --- Page furniture ---

function addHeader(sheet: Sheet, data: BadgeData): void {
  const { font } = sheet;
  const requirementsUrl = `${SITE}/merit-badges/${data.slug}/requirements/`;
  // Wordmark over one gold line: the site's masthead, without the ink-heavy fill.
  sheet.blocks.push({
    height: 22,
    space: 0,
    draw(page, top) {
      page.drawText("Merit Badge University", {
        x: MARGIN_X,
        y: top - 11,
        size: 11,
        font,
        color: OLIVE,
      });
      const w = font.widthOfTextAtSize(SITE, SIZE_LABEL);
      page.drawText(SITE, {
        x: PAGE_W - MARGIN_X - w,
        y: top - 10.5,
        size: SIZE_LABEL,
        font,
        color: MUTED,
      });
      page.drawLine({
        start: { x: MARGIN_X, y: top - 19 },
        end: { x: PAGE_W - MARGIN_X, y: top - 19 },
        thickness: 1.5,
        color: GOLD,
      });
    },
  });
  addText(sheet, `${data.title} Merit Badge Worksheet`, 0, {
    size: SIZE_TITLE,
    space: 12,
  });
  addText(
    sheet,
    "Type in the boxes on a computer, or print this and write by hand. " +
      `The requirements are Scouting America's official wording. Check you have the latest at ${requirementsUrl}`,
    0,
    { color: MUTED, size: SIZE_LABEL + 0.5, space: 6 },
  );

  // Who and when: one row, labels above. Widths follow how much each answer needs.
  const gap = 10;
  const cells: [label: string, name: string, share: number][] = [
    ["Scout name", "scout_name", 0.32],
    ["Troop or unit", "scout_unit", 0.18],
    ["Counselor", "counselor_name", 0.32],
    ["Date", "scout_date", 0.18],
  ];
  const fieldsW = CONTENT_W - gap * (cells.length - 1);
  sheet.blocks.push({
    height: SIZE_LABEL + 4 + LINE_H,
    space: 12,
    draw(page, top) {
      let x = MARGIN_X;
      for (const [label, name, share] of cells) {
        const w = fieldsW * share;
        page.drawText(label, {
          x,
          y: top - SIZE_LABEL,
          size: SIZE_LABEL,
          font,
          color: OLIVE,
        });
        placeTextField(page, sheet, name, label, {
          x,
          top: top - SIZE_LABEL - 4,
          w,
          h: LINE_H,
        });
        x += w + gap;
      }
    },
  });
}

/** Place blocks onto pages, moving a block (and anything it keeps with) to a new page when it won't fit. */
function layOut(doc: PDFDocument, blocks: Block[]): void {
  const usable = PAGE_H - MARGIN_TOP - CONTENT_BOTTOM;
  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN_TOP;
  let atTop = true;

  blocks.forEach((block, i) => {
    // Height of this block plus the run of blocks it must stay with.
    let need = block.height;
    for (let j = i; blocks[j]?.keepWithNext && blocks[j + 1]; j++) {
      need += blocks[j + 1]!.space + blocks[j + 1]!.height;
    }
    if (need > usable) need = block.height;

    if (!atTop && y - block.space - need < CONTENT_BOTTOM) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN_TOP;
      atTop = true;
    }
    if (!atTop) {
      y -= block.space;
      if (block.ruleAbove) {
        page.drawLine({
          start: { x: MARGIN_X, y: y + block.space / 2 },
          end: { x: PAGE_W - MARGIN_X, y: y + block.space / 2 },
          thickness: 0.5,
          color: RULE,
        });
      }
    }
    block.draw(page, y);
    y -= block.height;
    atTop = false;
  });
}

/** Badge name, the independence line and "Page X of Y" at the foot of every page. */
function addFooters(doc: PDFDocument, font: PDFFont, title: string): void {
  const pages = doc.getPages();
  const left = `${title} Merit Badge Worksheet · ${SITE} is an independent site, not part of Scouting America.`;
  pages.forEach((page, i) => {
    const opts = {
      y: FOOTER_Y,
      size: SIZE_FOOTER,
      font,
      color: MUTED,
    };
    page.drawText(left, { ...opts, x: MARGIN_X });
    const num = `Page ${i + 1} of ${pages.length}`;
    page.drawText(num, {
      ...opts,
      x: PAGE_W - MARGIN_X - font.widthOfTextAtSize(num, SIZE_FOOTER),
    });
  });
}

/**
 * Typed answers use Helvetica, which every viewer has, under the conventional
 * AcroForm names, and NeedAppearances so the viewer draws what the Scout types
 * (multiline fields auto-size their font to fit). Empty text fields need no
 * stored appearance because their box is part of the page; all checkboxes
 * share one "checked" and one "unchecked" appearance. Together this keeps each
 * PDF about half the size of pdf-lib's per-widget appearances.
 */
function finishFieldAppearances(form: PDFForm): void {
  const { doc } = form;
  const { context } = doc;
  form.acroForm.dict.set(
    PDFName.of("DR"),
    context.obj({
      Font: {
        Helv: doc.embedStandardFont(StandardFonts.Helvetica).ref,
        ZaDb: doc.embedStandardFont(StandardFonts.ZapfDingbats).ref,
      },
    }),
  );
  form.acroForm.dict.set(PDFName.of("NeedAppearances"), PDFBool.True);

  const bbox = { BBox: [0, 0, CHECKBOX, CHECKBOX] };
  const ink = [INK.red, INK.green, INK.blue].map(r2) as [
    number,
    number,
    number,
  ];
  const checked = context.register(
    context.formXObject(
      [
        pushGraphicsState(),
        setStrokingRgbColor(...ink),
        setLineWidth(1.5),
        moveTo(3, 6.2),
        lineTo(5.2, 3.8),
        lineTo(9.2, 8.6),
        stroke(),
        popGraphicsState(),
      ],
      bbox,
    ),
  );
  const unchecked = context.register(context.formXObject([], bbox));
  const checkboxAppearance = context.obj({
    N: { Yes: checked, Off: unchecked },
  });

  for (const field of form.getFields()) {
    const isText = field instanceof PDFTextField;
    const da = isText
      ? `/Helv ${field.isMultiline() ? 0 : FIELD_FONT_SIZE} Tf 0 g`
      : "/ZaDb 0 Tf 0 g";
    field.acroField.setDefaultAppearance(da);
    for (const widget of field.acroField.getWidgets()) {
      widget.dict.set(PDFName.of("DA"), PDFString.of(da));
      deleteAppearanceStreams(widget.dict);
      if (isText) widget.dict.delete(PDFName.of("AP"));
      else widget.dict.set(PDFName.of("AP"), checkboxAppearance);
    }
  }
}

/** Remove a widget's own appearance streams from the file, not just the reference to them. */
function deleteAppearanceStreams(widget: PDFDict): void {
  const ap = widget.lookupMaybe(PDFName.of("AP"), PDFDict);
  if (!ap) return;
  const refs = ap.values().flatMap(v => {
    const states = widget.context.lookup(v);
    return states instanceof PDFDict ? states.values() : [v];
  });
  for (const ref of refs) {
    if (ref instanceof PDFRef) widget.context.delete(ref);
  }
}

const FONT_DIR = path.join(import.meta.dir, "fonts");

async function generateWorksheet(data: BadgeData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  // One weight only: each embedded weight adds several KB to every PDF, and
  // size, color and the olive markers carry the hierarchy well enough.
  const font = await doc.embedFont(
    readFileSync(path.join(FONT_DIR, "Figtree-Regular.ttf")),
    { subset: true },
  );
  const title = `${data.title} Merit Badge Worksheet`;
  doc.setTitle(title, { showInWindowTitleBar: true });
  doc.setLanguage("en-US");
  doc.setAuthor("Merit Badge University");
  doc.setSubject(
    `Fillable worksheet for the ${data.title} merit badge requirements`,
  );
  doc.setCreator(SITE);

  const sheet: Sheet = {
    blocks: [],
    form: doc.getForm(),
    font,
    fieldIndex: 0,
  };
  addHeader(sheet, data);
  for (const req of data.requirements) {
    renderRequirement(sheet, req, 0);
  }
  layOut(doc, sheet.blocks);
  addFooters(doc, font, data.title);
  finishFieldAppearances(sheet.form);
  return doc.save({ updateFieldAppearances: false });
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
  // at /merit-badges/{slug}/{slug}-merit-badge-worksheet.pdf.
  const siteDir = path.join(import.meta.dir, "../hugo/static/merit-badges");
  const baseDir = process.env.OUT_DIR ?? siteDir;

  const generated: string[] = [];
  for (const slug of slugs) {
    const dataPath = path.join(
      import.meta.dir,
      "../hugo/data/merit-badges",
      `${slug}.json`,
    );
    if (!existsSync(dataPath)) {
      console.warn(`[skip] ${slug}: data.json not found`);
      continue;
    }
    const data: BadgeData = JSON.parse(readFileSync(dataPath, "utf8"));
    console.log(`[gen] ${data.title}...`);
    const outDir = path.join(baseDir, slug);
    mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `${slug}-merit-badge-worksheet.pdf`);
    writeFileSync(outPath, await generateWorksheet(data));
    generated.push(slug);
    console.log(`  -> ${outPath}`);
  }

  // The manifest drives the site's worksheet links, so only a full run into the
  // site's own folder may rewrite it.
  if (baseDir === siteDir && !badgeSlugsEnv && !testMode) {
    const manifestPath = path.join(
      import.meta.dir,
      "../hugo/data/worksheets.json",
    );
    writeFileSync(manifestPath, JSON.stringify({ slugs: generated }, null, 2));
    console.log(
      `\nManifest: hugo/data/worksheets.json (${generated.length} badges)`,
    );
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
