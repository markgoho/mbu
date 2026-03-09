/**
 * Constructs structured YouTube search queries from badge and requirement context.
 *
 * Produces 2 queries per requirement page:
 *   1. Primary: badge title + core action from requirement text + "tutorial"
 *   2. Topic-specific: badge title + H2/H3 headings from page content
 */

interface VideoSearchQuery {
  query: string;
  strategy: "primary" | "topic";
}

/** Words to strip from requirement text before building queries. */
const BOILERPLATE_WORDS = new Set([
  "explain",
  "describe",
  "discuss",
  "tell",
  "show",
  "demonstrate",
  "identify",
  "list",
  "name",
  "define",
  "do",
  "the",
  "following",
  "your",
  "counselor",
  "about",
  "how",
  "why",
  "what",
  "which",
  "where",
  "when",
  "who",
  "and",
  "or",
  "for",
  "with",
  "that",
  "this",
  "from",
  "are",
  "you",
  "have",
  "has",
  "had",
  "been",
  "being",
  "would",
  "could",
  "should",
  "will",
  "can",
  "may",
  "might",
  "must",
  "shall",
  "its",
  "their",
  "they",
  "them",
  "these",
  "those",
  "each",
  "every",
  "any",
  "all",
  "both",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "than",
  "too",
  "very",
  "also",
  "just",
  "only",
  "then",
  "not",
]);

/** Extract meaningful words from requirement text. */
function extractKeyPhrases({ text }: { text: string }): string {
  // Remove markdown links
  const cleaned = text.replaceAll(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Split into words and filter out boilerplate
  const words = cleaned
    .toLowerCase()
    .replaceAll(/[^\s\w-]/g, " ")
    .split(/\s+/)
    .filter(
      (word) => word.length > 2 && !BOILERPLATE_WORDS.has(word),
    );

  // Take first 6 meaningful words to keep query focused
  return words.slice(0, 6).join(" ");
}

/** Extract the most relevant heading from page content. */
function extractBestHeading({
  headings,
}: {
  headings: string[];
}): string | undefined {
  // Prefer H2 headings (more specific than H1, more substantial than H3)
  // Filter out generic headings
  const genericHeadings = new Set([
    "introduction",
    "overview",
    "summary",
    "resources",
    "what you need to know",
    "getting started",
  ]);

  const usefulHeadings = headings.filter(
    (heading) => !genericHeadings.has(heading.toLowerCase().trim()),
  );

  return usefulHeadings[0];
}

export function buildVideoSearchQueries({
  badgeTitle,
  requirementText,
  pageHeadings,
}: {
  badgeTitle: string;
  requirementText: string;
  pageHeadings: string[];
}): VideoSearchQuery[] {
  const queries: VideoSearchQuery[] = [];

  // Strategy 1: Primary — badge title + core action + "tutorial"
  const keyPhrases = extractKeyPhrases({ text: requirementText });
  if (keyPhrases.length > 0) {
    const primary = `${badgeTitle} ${keyPhrases} tutorial`.slice(0, 60);
    queries.push({ query: primary, strategy: "primary" });
  }

  // Strategy 2: Topic-specific — badge title + best heading
  const bestHeading = extractBestHeading({ headings: pageHeadings });
  if (bestHeading !== undefined) {
    const topicQuery = `${badgeTitle} ${bestHeading}`.slice(0, 60);
    queries.push({ query: topicQuery, strategy: "topic" });
  }

  // If we couldn't build any queries, fall back to just the badge title
  if (queries.length === 0) {
    queries.push({
      query: `${badgeTitle} merit badge tutorial`,
      strategy: "primary",
    });
  }

  return queries;
}
