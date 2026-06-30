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
  | "discuss"
  | "draw"
  | "do";

export interface PromptSegment {
  text: string;
  fieldType: SegmentFieldType;
  count: number | null;
  noun: string | null;
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
  /^(?:explain|describe|discuss|research|report|summarize|write|rewrite|paraphrase|document|review|compare|interview|provide|outline|share)\b/i;
const WRITE_SHORT_VERBS =
  /^(?:list|name|identify|state|define|give|locate|find|label|tell)\b/i;

// Conversational verbs that, when directed at the counselor, are an oral
// deliverable with no written response (like "demonstrate").
const ORAL_VERBS = /^(?:discuss|share|tell|talk|present)\b/i;
// Any reference to the counselor ("with your counselor", "to your counselor",
// or the direct object "tell your counselor …").
const COUNSELOR_REF = /\b(?:your|a|the)\s+counselor\b/i;

// The verb "discuss" appearing anywhere in the sentence ("… and discuss how …").
const EMBEDDED_DISCUSS = /\bdiscuss(?:es|ed|ing)?\b/i;

// Self-contained oral performances ("Give a talk", "Lead a short discussion")
// whose input is a completion checkbox, not a written field. An optional
// adjective may sit between the article and the noun.
const ORAL_ACTION =
  /^(?:give|lead|deliver|host|conduct|hold|present|make)\s+(?:a|an)\s+(?:\w+\s+){0,2}?(?:talk|speech|presentation|discussion|demonstration|debate|report|tour|skit|play|workshop|lesson|class|seminar)\b/i;
// The same performance embedded mid-sentence ("Choose one … and give a short
// presentation about your findings …").
const ORAL_ACTION_EMBEDDED =
  /\b(?:give|lead|deliver|host|conduct|hold)\s+(?:a|an)\s+(?:\w+\s+){0,2}?(?:talk|speech|presentation|discussion|demonstration|debate|tour|skit|play|workshop|lesson|seminar)\b/i;

// "Tell/describe how|why|about ..." is a long explanation, not a short answer.
const TELL_LONG = /^(?:tell|state)\s+(?:how|why|what|where|when|about|the\s+story)\b/i;
// "Find out how|why|what ..." is a research/explanation prompt, not a one-liner.
const FIND_LONG = /^find\s+(?:out\s+)?(?:how|why|what|when|where)\b/i;
// "Define the following terms: …" / "Define these terms" → a multi-term answer.
const DEFINE_LONG = /^define\s+(?:the\s+following|these|.*\bterms\b)/i;
// "Make/keep a list of …" is a written enumeration → a (multiline) box.
const MAKE_LIST = /^(?:make|keep|create|prepare)\s+(?:a|an)\s+list\b/i;
// "Make notes about …", "Keep a journal/log/record/diary …" → a written deliverable.
const MAKE_NOTES =
  /^(?:make|take|keep|write|maintain)\s+(?:\w+\s+){0,2}?(?:notes?|journal|log|diary|record|records|logbook)\b/i;
// "… in each of the [following] classifications …" implies a matrix of answers.
const EACH_OF_FOLLOWING = /\b(?:in|for)\s+each\s+of\s+the\b/i;
// An action that embeds an explanation ("Select one … and tell how you would
// manage it") still warrants a written box even when it leads with select/choose.
const EMBEDDED_EXPLAIN = /\b(?:tell|explain|describe)\s+(?:how|why|what)\b/i;

// A bare "Discuss …" topic is an oral conversation (checkbox) unless it also
// asks the Scout to write something ("Discuss and explain …").
const DISCUSS_WRITTEN =
  /\b(?:and|then|,)\s+(?:explain|describe|list|name|identify|write|compare|summarize|outline|report|provide|document|tell|define)\b/i;

// A reflective closer ("… and explain what you learned") is part of the oral
// discussion, not a separate written deliverable. Strip it before deciding
// whether a "discuss with your counselor" prompt warrants a written field.
const REFLECTIVE_TAIL =
  /[,;]?\s*(?:and|then)\s+(?:explain|tell|share|describe|discuss)\s+what\s+you(?:'ve|\s+have)?\s+(?:learned|discovered|observed|experienced|found\s+out)\b.*$/i;
function stripReflectiveTail(text: string): string {
  return text.replace(REFLECTIVE_TAIL, "");
}
const COMPUTE_VERBS =
  /^(?:calculate|measure|estimate|compute|determine)\b/i;
const DEMONSTRATE_VERBS =
  /^(?:demonstrate|show|perform|practice|conduct|exhibit|render|present|shoots?|shooting)\b/i;
const DRAW_VERBS = /^(?:draw|sketch|diagram|illustrate|map)\b/i;
// "Make/create a[n] [accurately scaled] drawing|chart|model|…" is a visual
// deliverable → draw box (optional adjectives may precede the noun).
const MAKE_VISUAL =
  /^(?:make|create|prepare|produce|draw)\s+(?:a|an|another|two|three|four|five|\d+)\s+(?:\w+\s+){0,3}?(?:sketch|drawing|chart|diagram|model|poster|map|graph|table|illustration|display|collage|blueprint|plan)(?:e?s)?\b/i;

// Verbs that gate whether a new sentence becomes its own segment
const ACTION_VERB_GATE =
  /^(?:explain|describe|discuss|research|report|summarize|write|rewrite|paraphrase|document|review|compare|interview|list|name|identify|state|define|outline|trace|give|locate|find|label|tell|calculate|measure|estimate|compute|determine|demonstrate|show|perform|practice|conduct|exhibit|render|present|draw|sketch|diagram|illustrate|map|do|earn|complete|visit|attend|participate|plan|create|build|make|develop|prepare|design|organize|lead|teach|train|share|note|read|watch|study|learn|select|choose|observe|collect|keep|explore|obtain)\b/i;

const ENUMERATOR_GATE = /^(?:first|then|next|finally|additionally|also|second|third|fourth|fifth)\b/i;

export function stripLeadingContext(text: string): string {
  let remaining = text.trim();
  while (true) {
    const next = remaining
      .replace(
        /^(?:then|next|finally|first|second|third|fourth|fifth|also|additionally|lastly|afterwards?)\s*,\s*/i,
        "",
      )
      .replace(
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
    // Test the whole text, the leading-context-stripped text, and each sentence
    // (so a category-title prefix like "Principles of Flight. Do ONE of the
    // following:" is still recognized as a select/do container).
    const candidates = new Set<string>([bare, stripLeadingContext(bare)]);
    for (const sentence of bare.split(/(?<=[.!?])\s+/)) {
      const s = sentence.trim().replace(/[:.]+$/, "");
      if (s) {
        candidates.add(s);
        candidates.add(stripLeadingContext(s));
      }
    }
    const isGenericParent = GENERIC_PARENT_PATTERNS.some(p =>
      [...candidates].some(c => p.test(c)),
    );
    if (isGenericParent || bare === "") return "container";
  }
  return "leaf";
}

// Matches "and explain", "and briefly describe", etc. within a segment —
// upgrades write-short to write-long (an optional -ly adverb may sit between).
const CONJUNCTIVE_WRITE_LONG =
  /\s(?:and|then|also)\s+(?:\w+ly\s+)?(?:explain|describe|discuss|research|report|summarize|write|document|review|compare|interview|provide|outline|share|tell)\b/i;

// A hands-on task ("Check the vehicle's lights", "Locate the jack", "Use the jack
// to demonstrate …") → a completion checkbox, unless it also asks the Scout to
// write something down (record the reading, explain the result, …).
const PHYSICAL_ANY = /\b(?:check|inspect|demonstrate)\b/i;
const PHYSICAL_LEAD =
  /^(?:locate|replace|install|remove|rotate|adjust|tighten|loosen|lubricate|clean|flush|fill|jack|raise|lower|connect|disconnect|engage|service|change|build|construct|assemble)\b/i;
const EMBEDDED_WRITE =
  /\b(?:determine|explain|describe|discuss|list|name|identify|record|note|write|calculate|estimate|compute|compare|summarize|outline|define|tell|report)\b/i;

// "Make recommendations for repairs (if necessary)" → a written deliverable.
const MAKE_RECOMMENDATION = /^make\s+(?:a\s+|\w+\s+){0,2}?recommendations?\b/i;

export function classifySegment(text: string): SegmentFieldType {
  const bare = stripLeadingContext(text.trim());
  const writtenCheck = stripReflectiveTail(text);
  // Conversation with the counselor → oral, no written field — unless it also
  // asks the Scout to write something ("Share … and describe how each …").
  if (ORAL_VERBS.test(bare) && COUNSELOR_REF.test(text) && !DISCUSS_WRITTEN.test(writtenCheck)) {
    return "discuss";
  }
  // A bare "Discuss …" topic is an oral conversation unless it also asks the
  // Scout to write (and explain/list/…) or enumerates a set of items.
  if (/^discuss\b/i.test(bare) && !DISCUSS_WRITTEN.test(writtenCheck) && detectCardinality(text) === null) {
    return "discuss";
  }
  // Self-contained oral performance → completion checkbox (handled by renderer).
  if (ORAL_ACTION.test(bare)) return "demonstrate";
  if (TELL_LONG.test(bare)) return "write-long";
  if (FIND_LONG.test(bare)) return "write-long";
  if (DEFINE_LONG.test(bare)) return "write-long";
  if (MAKE_LIST.test(bare)) return "write-long";
  if (MAKE_NOTES.test(bare)) return "write-long";
  if (MAKE_RECOMMENDATION.test(bare)) return "write-long";
  // A write prompt spanning "each of the following …" needs room for a matrix.
  if (EACH_OF_FOLLOWING.test(text) && (WRITE_LONG_VERBS.test(bare) || WRITE_SHORT_VERBS.test(bare))) {
    return "write-long";
  }
  // Hands-on task with nothing to write down → completion checkbox.
  if ((PHYSICAL_ANY.test(text) || PHYSICAL_LEAD.test(bare)) && !EMBEDDED_WRITE.test(text)) {
    return "demonstrate";
  }
  if (WRITE_LONG_VERBS.test(bare)) return "write-long";
  if (WRITE_SHORT_VERBS.test(bare)) {
    // upgrade if a conjunctive write-long verb follows ("identify X, and explain Y")
    if (CONJUNCTIVE_WRITE_LONG.test(text)) return "write-long";
    // a short list that also poses a reflective question needs more room
    if (/\?/.test(text)) return "write-long";
    return "write-short";
  }
  if (COMPUTE_VERBS.test(bare)) return "compute";
  if (DRAW_VERBS.test(bare) || MAKE_VISUAL.test(bare)) return "draw";
  if (DEMONSTRATE_VERBS.test(bare)) return "demonstrate";
  // Fallback: an embedded oral performance ("Choose one … and give a short
  // presentation …") → a completion checkbox.
  if (ORAL_ACTION_EMBEDDED.test(text)) return "demonstrate";
  // Fallback: a selection/action that embeds an explanation ("Select one … and
  // tell how you would manage it") → a written box.
  if (EMBEDDED_EXPLAIN.test(text)) return "write-long";
  // Fallback: an action with no written deliverable that still asks the Scout to
  // "discuss …" mid-sentence ("Choose five … and discuss how each one …") → an
  // oral completion checkbox (discussion implies the counselor).
  if (EMBEDDED_DISCUSS.test(text) && !DISCUSS_WRITTEN.test(writtenCheck)) {
    return "discuss";
  }
  // Fallback: a knowledge question with no action verb ("What is the Constitution?
  // … Why is it important to have a Constitution?") → a written answer box.
  if (/\?/.test(text) || /^(?:what|why|how|when|where|which|who|name)\b/i.test(bare)) {
    return "write-long";
  }
  return "do";
}

const NUMBER_WORDS: Record<string, number> = {
  two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10,
};

// "the three groups you chose", "those two methods you selected" — a reference
// back to an already-chosen set, not a fresh enumeration. Should not split.
const BACK_REFERENCE =
  /\b(?:the|those|these|your)\s+(?:two|three|four|five|six|seven|eight|nine|ten)\s+\w+\s+you\s+(?:chose|choose|chosen|picked|pick|selected|select|named|name|listed|list|identified|identify|mentioned|described)\b/i;

const CARDINALITY_RE =
  /\b(two|three|four|five|six|seven|eight|nine|ten)\s+(?:\w+\s+){0,2}?(kinds?|types?|alternatives?|opportunities|examples?|ways|reasons?|times|methods?|factors?|causes?|steps?|sources?|species|items?|things?|differences?|advantages?|disadvantages?|uses?|parts?|features?|benefits?|effects?|roles?|careers?|people|persons?|individuals?|leaders?|songs?|books?|films?|movies?|recordings?|poems?|stories|pictures?|photographs?|articles?|biographies)\b/i;

// Digits (e.g. "Observe 20 species", "fly 25 feet") never trigger cardinality.
export function detectCardinality(text: string): number | null {
  const stripped = text.replace(/\([^)]*\)/g, "").trim();
  if (BACK_REFERENCE.test(stripped)) return null;
  const match = stripped.match(CARDINALITY_RE);
  if (!match) return null;
  return NUMBER_WORDS[match[1].toLowerCase()] ?? null;
}

/** The countable noun that triggered cardinality ("five songs" → "songs"). */
export function cardinalityNoun(text: string): string | null {
  const stripped = text.replace(/\([^)]*\)/g, "").trim();
  if (BACK_REFERENCE.test(stripped)) return null;
  const match = stripped.match(CARDINALITY_RE);
  return match ? match[2].toLowerCase() : null;
}

/**
 * Count an "interview two veterans" / "interview three people" directive.
 * Such requirements become completion checkboxes, not written fields.
 */
export function detectInterviewCount(text: string): number | null {
  const m = stripMarkdown(text).match(
    /\binterview\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/i,
  );
  if (!m) return null;
  const w = m[1].toLowerCase();
  const n = w === "one" ? 1 : (NUMBER_WORDS[w] ?? parseInt(w, 10));
  return Number.isFinite(n) && n >= 1 && n <= 12 ? n : null;
}

/**
 * Detect "one a political leader (…) and the other a private citizen (…)" and
 * return the two role labels for separately-labeled answer boxes.
 */
export function parseLabeledPair(text: string): [string, string] | null {
  const clean = stripMarkdown(text).replace(/\([^)]*\)/g, " ");
  const m = clean.match(
    /\bone\s+(?:a|an)\s+([a-z][a-z\s'-]*?)\s+and\s+the\s+other\s+(?:a|an)\s+([a-z][a-z\s'-]*?)\s*[.,]/i,
  );
  if (!m) return null;
  const capize = (s: string) =>
    s.trim().replace(/\s+/g, " ").replace(/^./, c => c.toUpperCase());
  return [capize(m[1]), capize(m[2])];
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

// Activity verbs where a "make a X, Y, or Z" choice should become checkboxes.
// Excludes "go"/"choose"/"select" to avoid noisy/truncated false positives.
const CHOICE_ACTIVITY_VERB =
  /^(?:learn|make|build|create|prepare|cook|draw|design|play|construct|carve|compose|write|sketch|paint|knit|sew|grow|plant|sing)\b/i;

/**
 * Detect an inline "a song, dance, poem, or story" choice list on an activity
 * requirement. Returns capitalized option labels, or null when not applicable.
 */
export function parseChoiceList(text: string): string[] | null {
  const bare = stripLeadingContext(stripMarkdown(text).trim());
  if (!CHOICE_ACTIVITY_VERB.test(bare)) return null;
  const m = bare.match(
    /\b(?:a|an|one)\s+([a-z][a-z'-]*(?:,\s*[a-z][a-z'-]*){1,8}\s*,?\s+or\s+[a-z][a-z'-]*)/i,
  );
  if (!m) return null;
  const items = m[1]
    .split(/\s*,\s*|\s+or\s+/i)
    .map(s => s.trim().replace(/^(?:or|and)\s+/i, ""))
    .filter(Boolean);
  const seen = new Set<string>();
  const uniq = items.filter(s => {
    const k = s.toLowerCase();
    if (seen.has(k) || k === "other" || k === "etc") return false;
    seen.add(k);
    return true;
  });
  if (uniq.length < 2 || uniq.length > 8) return null;
  return uniq.map(s => s.charAt(0).toUpperCase() + s.slice(1));
}

/**
 * Concise label for a self-contained oral action ("Give a talk to your unit…"
 * → "Give a talk"). Returns null when the text isn't an oral action.
 */
export function parseOralActionLabel(text: string): string | null {
  const bare = stripLeadingContext(stripMarkdown(text).trim());
  const m = bare.match(ORAL_ACTION) ?? stripMarkdown(text).match(ORAL_ACTION_EMBEDDED);
  if (!m) return null;
  return m[0].charAt(0).toUpperCase() + m[0].slice(1);
}

const COMPLETION_VERB =
  /^(?:teach|present|show|perform|share|give|demonstrate|display|exhibit|deliver|lead)\b/i;

// Past-tense forms for completion-checkbox labels ("teach it…" → "Taught it…").
const PAST_TENSE: Record<string, string> = {
  teach: "Taught",
  present: "Presented",
  show: "Showed",
  perform: "Performed",
  share: "Shared",
  give: "Gave",
  demonstrate: "Demonstrated",
  display: "Displayed",
  exhibit: "Exhibited",
  deliver: "Delivered",
  lead: "Led",
  make: "Made",
  build: "Built",
  write: "Wrote",
  draw: "Drew",
  create: "Created",
};

function toPastTense(verb: string): string {
  const lower = verb.toLowerCase();
  if (PAST_TENSE[lower]) return PAST_TENSE[lower];
  if (/e$/.test(lower)) return cap(lower + "d");
  if (/[^aeiou]y$/.test(lower)) return cap(lower.slice(0, -1) + "ied");
  return cap(lower + "ed");
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Detect a trailing ", and teach it to a group of your friends" action clause
 * that should become a completion checkbox. Returns a past-tense label or null.
 */
export function parseCompletionClause(text: string): string | null {
  const clean = stripMarkdown(text).trim().replace(/[.?!]+$/, "");
  const idx = clean.search(/,\s+and\s+/i);
  if (idx === -1) return null;
  const after = clean.slice(idx).replace(/^,\s+and\s+/i, "").trim();
  if (!COMPLETION_VERB.test(after)) return null;
  const [verb, ...rest] = after.split(/\s+/);
  return [toPastTense(verb), ...rest].join(" ");
}

export function parsePrompts(text: string): PromptSegment[] {
  const segments = splitPrompts(text);
  const result: PromptSegment[] = segments.map(seg => {
    const fieldType = classifySegment(seg);
    const count =
      fieldType === "write-long" || fieldType === "write-short" || fieldType === "compute"
        ? detectCardinality(seg)
        : null;
    const noun = count !== null ? cardinalityNoun(seg) : null;
    return { text: seg, fieldType, count, noun };
  });
  return result.length
    ? result
    : [{ text: text.trim(), fieldType: classifySegment(text), count: null, noun: null }];
}
