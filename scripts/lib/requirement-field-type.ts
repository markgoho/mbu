export interface Requirement {
  req_id: string;
  path: string;
  text: string;
  is_option?: boolean;
  subrequirements?: Requirement[];
  subrequirement_mode?: { type: string; count?: number };
}

export type SegmentFieldType =
  | "write-long"
  | "write-short"
  | "compute"
  | "demonstrate"
  | "draw"
  | "do";

export interface PromptSegment {
  text: string;
  fieldType: SegmentFieldType;
  count: number | null;
}

const GENERIC_PARENT_PATTERNS = [
  /^do(?:\s+all|\s+one|\s+two|\s+three|\s+four|\s+five)?\s+of\s+the\s+following/i,
  /^discuss(?:\s+with\s+your\s+counselor)?\s+the\s+following/i,
  /^discuss\s+the\s+following\s+with\s+your\s+counselor/i,
  /^document\s+and\s+discuss/i,
  /^repeat\b.*\bchoose\b.*\bscenarios/i,
  /^select\b.*\bdo\s+the\s+following/i,
  /^choose\b.*\bdo\s+the\s+following/i,
  /^complete\b.*\boptions?\b/i,
  /^render\b.*\bthese\s+ways/i,
] as const;

const WRITE_LONG_VERBS =
  /^(?:explain|describe|discuss|research|report|summarize|write|document|review|compare|interview|provide|outline|share)\b/i;
const WRITE_SHORT_VERBS =
  /^(?:list|name|identify|state|define|give|locate|find|label|tell)\b/i;
const COMPUTE_VERBS =
  /^(?:calculate|measure|estimate|compute|determine)\b/i;
const DEMONSTRATE_VERBS =
  /^(?:demonstrate|show|perform|practice|conduct|exhibit|render|present)\b/i;
const DRAW_VERBS = /^(?:draw|sketch|diagram|illustrate|map)\b/i;

// Verbs that gate whether a new sentence becomes its own segment
const ACTION_VERB_GATE =
  /^(?:explain|describe|discuss|research|report|summarize|write|document|review|compare|interview|list|name|identify|state|define|give|locate|find|label|tell|calculate|measure|estimate|compute|determine|demonstrate|show|perform|practice|conduct|exhibit|render|present|draw|sketch|diagram|illustrate|map|do|earn|complete|visit|attend|participate|plan|create|build|make|develop|prepare|design|organize|lead|teach|train|share|note|read|watch|study|learn)\b/i;

const ENUMERATOR_GATE = /^(?:first|then|next|finally|additionally|also|second|third|fourth|fifth)\b/i;

export function stripLeadingContext(text: string): string {
  let remaining = text.trim();
  while (true) {
    const next = remaining.replace(
      /^(?:(?:in your own words|for each of|for each|for every|for the following|using|with|after|before|by)\b[^,]*,\s*)/i,
      "",
    );
    if (next === remaining) return remaining;
    remaining = next.trim();
  }
}

function stripMarkdown(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*/g, "").replace(/\*/g, "");
}

export function classifyNode(req: Requirement): "container" | "leaf" {
  const hasChildren = req.subrequirements && req.subrequirements.length > 0;
  if (hasChildren) {
    const bare = req.text.trim().replace(/[:.]+$/, "");
    const isGenericParent = GENERIC_PARENT_PATTERNS.some(p => p.test(bare));
    if (isGenericParent || bare === "") return "container";
  }
  return "leaf";
}

// Matches "and explain", "and describe", etc. within a segment — upgrades write-short to write-long
const CONJUNCTIVE_WRITE_LONG =
  /\s(?:and|then|also)\s+(?:explain|describe|discuss|research|report|summarize|write|document|review|compare|interview|provide|outline|share)\b/i;

export function classifySegment(text: string): SegmentFieldType {
  const bare = stripLeadingContext(text.trim());
  if (WRITE_LONG_VERBS.test(bare)) return "write-long";
  if (WRITE_SHORT_VERBS.test(bare)) {
    // upgrade if a conjunctive write-long verb follows ("identify X, and explain Y")
    if (CONJUNCTIVE_WRITE_LONG.test(text)) return "write-long";
    return "write-short";
  }
  if (COMPUTE_VERBS.test(bare)) return "compute";
  if (DEMONSTRATE_VERBS.test(bare)) return "demonstrate";
  if (DRAW_VERBS.test(bare)) return "draw";
  return "do";
}

const NUMBER_WORDS: Record<string, number> = {
  two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10,
};

// Digits (e.g. "Observe 20 species", "fly 25 feet") never trigger cardinality.
export function detectCardinality(text: string): number | null {
  const stripped = text.replace(/\([^)]*\)/g, "").trim();
  const match = stripped.match(
    /\b(two|three|four|five|six|seven|eight|nine|ten)\s+(?:\w+\s+){0,2}?(kinds?|types?|alternatives?|opportunities|examples?|ways|reasons?|times|methods?|factors?|causes?|steps?|sources?|species|items?|things?|differences?|advantages?|disadvantages?|uses?|parts?|features?|benefits?|effects?|roles?|careers?)\b/i,
  );
  if (!match) return null;
  return NUMBER_WORDS[match[1].toLowerCase()] ?? null;
}

export function splitPrompts(text: string): string[] {
  const clean = stripMarkdown(text).trim();
  if (!clean) return [text.trim() || ""];

  const SENTINEL = "\x00";

  // Mask period hazards so they don't become split points
  let masked = clean
    .replace(
      /\b(e\.g|i\.e|U\.S\.A|U\.S|etc|vs|No|Mr|Mrs|Ms|Dr|St|Jr|Sr|Mt|Fig|approx)\./gi,
      m => m.slice(0, -1) + SENTINEL,
    )
    .replace(/(\d)\.(\d)/g, `$1${SENTINEL}$2`)
    .replace(/((?:^|\s))\.(\d)/g, `$1${SENTINEL}$2`)
    .replace(/\b([A-Z])\./g, `$1${SENTINEL}`);

  // Split on sentence boundaries: terminator (+ optional closing quote) + space + capital/digit
  const BOUNDARY = /([.?!]["'"’”]?)\s+(?=["'"’”]?[A-Z0-9])/;
  const parts: string[] = [];
  let remaining = masked;
  while (true) {
    const m = BOUNDARY.exec(remaining);
    if (!m) {
      parts.push(remaining);
      break;
    }
    parts.push(remaining.slice(0, m.index + m[1].length));
    remaining = remaining.slice(m.index + m[0].length);
  }

  const restored = parts
    .map(p => p.replace(new RegExp(SENTINEL, "g"), ".").trim())
    .filter(Boolean);

  if (restored.length <= 1) return [clean];

  // Merge too-short segments (< 3 words) back into the preceding segment
  const merged: string[] = [];
  for (const part of restored) {
    if (part.split(/\s+/).length < 3 && merged.length > 0) {
      merged[merged.length - 1] += " " + part;
    } else {
      merged.push(part);
    }
  }

  if (merged.length <= 1) return [clean];

  // Imperative-start gate: only promote to a new segment if the sentence starts with
  // a known action verb or an enumerator. Continuations starting with pronouns, articles,
  // or prepositions ("This should include…", "In your observations, include…") fold back.
  const filtered: string[] = [merged[0]];
  for (let i = 1; i < merged.length; i++) {
    const seg = merged[i];
    const stripped = stripLeadingContext(seg);
    if (ACTION_VERB_GATE.test(stripped) || ENUMERATOR_GATE.test(seg)) {
      filtered.push(seg);
    } else {
      filtered[filtered.length - 1] += " " + seg;
    }
  }

  return filtered.length ? filtered : [clean];
}

export function parsePrompts(text: string): PromptSegment[] {
  const segments = splitPrompts(text);
  const result: PromptSegment[] = segments.map(seg => {
    const fieldType = classifySegment(seg);
    const count =
      fieldType === "write-long" || fieldType === "write-short" || fieldType === "compute"
        ? detectCardinality(seg)
        : null;
    return { text: seg, fieldType, count };
  });
  return result.length ? result : [{ text: text.trim(), fieldType: classifySegment(text), count: null }];
}
