/*
 * Search results renderer.
 *
 * This owns the whole results display rather than theming Pagefind's
 * Default UI (uni-theme#14). Results group by Award: one panel per
 * matching page, with an emblem rail, the award title, and one tile per
 * matching Requirement beneath it. Reaching that layout from
 * PagefindUI's fixed DOM would take a wall of `!important`, and the raw
 * API carries everything the Default UI was giving us -- verified on a
 * live mbu index.
 *
 * Requirement paths are NOT derived from title text: Pagefind's
 * `sub_result.anchor.id` already is the path (uni-theme#7), validated
 * here against the ratified shape. Award titles get their site-
 * configured suffix at render time, so it is never indexed.
 */

declare const pirsch: (
  event: string,
  options?: { meta?: Record<string, string | number> },
) => void;

interface PagefindAnchor {
  element: string;
  id: string;
  text: string;
  location: number;
}

interface PagefindSubResult {
  title: string;
  url: string;
  excerpt: string;
  anchor?: PagefindAnchor;
}

interface PagefindData {
  url: string;
  excerpt: string;
  meta: Record<string, string>;
  sub_results: PagefindSubResult[];
}

interface PagefindResult {
  id: string;
  score: number;
  data: () => Promise<PagefindData>;
}

const container = document.querySelector<HTMLElement>("#search");

if (container) {
  const form = container.querySelector<HTMLFormElement>(".search__form")!;
  const input = container.querySelector<HTMLInputElement>(".search__input")!;
  const clearButton =
    container.querySelector<HTMLButtonElement>(".search__clear")!;
  const messageEl =
    container.querySelector<HTMLElement>(".search__message")!;
  const resultsEl =
    container.querySelector<HTMLElement>(".search__results")!;
  const moreButton =
    container.querySelector<HTMLButtonElement>(".search__more")!;

  const awardLabel = container.dataset.searchAwardLabel ?? "";
  const emblemPlaceholder = container.dataset.searchEmblemPlaceholder ?? "";
  const zeroResults =
    container.dataset.searchZeroResults ?? "No results found";
  const minQueryHint =
    container.dataset.searchMinQueryHint ??
    "Type at least 3 characters to search.";
  const noResultsEvent = container.dataset.searchEventNoResults;
  const resultClickEvent = container.dataset.searchEventResultClick;
  const pageSize = container.dataset.searchPageSize
    ? Number(container.dataset.searchPageSize)
    : 5;

  const DEBOUNCE_MS = 300;
  const MIN_QUERY_LENGTH = 3;
  const EXCERPT_LENGTH = 500;

  // A requirement path as ratified in uni-theme#7 -- one rule covering
  // both consumers ("2", "2.a", "4.option2"). Swept against every anchor
  // id in mbu's live index (795 across 143 pages): zero misses. An id
  // that doesn't match still renders its tile, just without a path
  // prefix, so a consumer with free-form heading ids degrades quietly.
  const REQUIREMENT_PATH = /^\d+(\.[0-9A-Za-z][0-9A-Za-z-]*)*$/;

  // Pagefind's ranking API re-scores but never drops a result (verified:
  // pushing termSimilarity to 500 took a fuzzy-only match's score to
  // literal 0 while pagefind.search() still returned count: 1), so a
  // query whose only candidate is fuzzy-match noise (e.g. "knives"
  // against a corpus that only has "knife") always returns something.
  // When the best score is below FUZZY_MATCH_FLOOR the whole result set
  // is suppressed in favour of a "no results" state. See uni-theme#5.
  //
  // Deliberately all-or-nothing rather than a per-result filter: this
  // ports the pre-#14 behavior unchanged, and #5 owns any better rule.
  //
  // Calibrated live at ranking.termSimilarity: 10 -- a spread of rare,
  // single-occurrence real words (e.g. "extinguish", "bowline",
  // "mollusks") scored 0.62-2.96, while nonsense queries ("asdkjaskdj",
  // "frobnicate") topped out at 0.0003.
  const FUZZY_MATCH_FLOOR = 0.05;

  let pagefindPromise: Promise<any> | null = null;
  function loadPagefind(): Promise<any> {
    if (!pagefindPromise) {
      pagefindPromise = import("/pagefind/pagefind.js").then(async pf => {
        await pf.init();
        // termSimilarity demotes short fuzzy-match noise below genuine
        // matches when both are present; excerptLength is carried over
        // from the Default UI configuration it replaces.
        await pf.options({
          excerptLength: EXCERPT_LENGTH,
          ranking: { termSimilarity: 10 },
        });
        return pf;
      });
    }
    return pagefindPromise;
  }

  // ---------------------------------------------------------------- render

  function escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalize(value: string): string {
    return value
      .toLowerCase()
      .replace(/[…]|\.\.\./g, " ")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  // Pagefind's sub-result excerpt starts with the heading's own text,
  // so a requirement whose heading is derived from its leading sentence
  // (partials/text/lead-sentence.html, uni-theme#13) renders its title
  // twice over. Strip a leading normalized repeat of the title, and drop
  // the excerpt entirely when nothing meaningful is left.
  //
  // Marker text leaking into an excerpt (a stray "e" between the two
  // repeats) is a data-pagefind-ignore violation in the consumer's own
  // markup, not something to paper over here.
  const MIN_EXCERPT_CHARS = 15;

  function trimExcerpt(excerpt: string, title: string): string {
    const holder = document.createElement("div");
    holder.innerHTML = excerpt;
    trimMarkPunctuation(holder);

    const titleNorm = normalize(title);
    if (!titleNorm) return holder.innerHTML.trim();

    // Two passes at most: the title, then one repeat of it. A chip-style
    // requirement whose whole body is its own lead sentence has nothing
    // left after both passes -- fall back to the single-stripped result
    // (one surviving repeat, match and all) rather than showing nothing.
    let fallback = holder.innerHTML;
    for (let pass = 0; pass < 2; pass++) {
      if (!normalize(holder.textContent ?? "").startsWith(titleNorm)) break;
      if (!cutLeadingTitle(holder, titleNorm)) break;
      if (pass === 0) fallback = holder.innerHTML;
    }

    const rest = (holder.textContent ?? "").trim();
    if (rest.length >= MIN_EXCERPT_CHARS) return holder.innerHTML.trim();

    // A bare title match (e.g. a grouping heading like "Hiking") leaves
    // nothing behind but stray punctuation once its own text is cut --
    // that isn't a highlighted match worth keeping.
    const fallbackHolder = document.createElement("div");
    fallbackHolder.innerHTML = fallback;
    return fallbackHolder.querySelector("mark") ? fallback.trim() : "";
  }

  // Pagefind sometimes folds a trailing/leading punctuation character
  // into a <mark> (e.g. "hammer," instead of "hammer"). Move that
  // punctuation outside the mark so only the matched word is
  // highlighted; a hyphen inside a compound word like "hammer-riveted"
  // is untouched since it never sits at the mark's own edge.
  function trimMarkPunctuation(holder: HTMLElement): void {
    holder.querySelectorAll("mark").forEach(mark => {
      const text = mark.textContent ?? "";
      const leading = text.match(/^[^\p{L}\p{N}]+/u)?.[0] ?? "";
      const trailing =
        text.slice(leading.length).match(/[^\p{L}\p{N}]+$/u)?.[0] ?? "";
      if (!leading && !trailing) return;

      const core = text.slice(leading.length, text.length - trailing.length);
      if (!core) return;

      if (trailing) mark.after(document.createTextNode(trailing));
      mark.textContent = core;
      if (leading) mark.before(document.createTextNode(leading));
    });
  }

  // Walks text nodes dropping characters until the normalized text
  // consumed covers the whole title, then trims the leftover separator.
  // Returns false if the title never resolves to a clean cut point.
  function cutLeadingTitle(holder: HTMLElement, titleNorm: string): boolean {
    const walker = document.createTreeWalker(holder, NodeFilter.SHOW_TEXT);
    let consumed = "";
    let node: Node | null;

    while ((node = walker.nextNode())) {
      const text = node.textContent ?? "";
      for (let i = 0; i < text.length; i++) {
        consumed += text[i];
        if (normalize(consumed) !== titleNorm) continue;

        // Cut here: empty every earlier text node, then slice this one.
        const stop = node;
        const clear = document.createTreeWalker(holder, NodeFilter.SHOW_TEXT);
        let n: Node | null;
        while ((n = clear.nextNode()) && n !== stop) n.textContent = "";
        // Normalizing ignores punctuation, so the match can land just
        // before a closing bracket or full stop that belongs to the
        // title. Drop every leading non-word character, not a fixed set.
        stop.textContent = text.slice(i + 1).replace(/^[^\p{L}\p{N}]+/u, "");
        // A <mark> emptied by the cut would otherwise render as a stray
        // highlight swatch.
        holder
          .querySelectorAll("mark")
          .forEach(m => m.textContent || m.remove());
        return true;
      }
      // Once the consumed text has diverged from the title there is no
      // point walking further.
      if (!titleNorm.startsWith(normalize(consumed))) return false;
    }
    return false;
  }

  function emblemHtml(image: string | undefined): string {
    const src = image || emblemPlaceholder;
    if (!src) return "";
    const cls = image ? "" : ' class="award-result__emblem-placeholder"';
    return `<img${cls} src="${escapeHtml(src)}" alt="" loading="lazy" />`;
  }

  function requirementTile(
    sub: PagefindSubResult,
    awardUrl: string,
    excerpt: string,
  ): string {
    const anchorId = sub.anchor?.id ?? "";
    const path = REQUIREMENT_PATH.test(anchorId) ? anchorId : "";
    const href = sub.url || awardUrl;

    return `
      <li class="requirement-result">
        <h3 class="requirement-result__title">
          ${path ? `<span class="requirement-result__path">${escapeHtml(path)}</span>` : ""}
          <a href="${escapeHtml(href)}">${escapeHtml(sub.title ?? "")}</a>
        </h3>
        ${excerpt ? `<p class="requirement-result__excerpt">${excerpt}</p>` : ""}
      </li>`;
  }

  function awardPanel(data: PagefindData): string {
    const name = data.meta?.title ?? "";
    const title = awardLabel ? `${name} ${awardLabel}` : name;
    const anchored = (data.sub_results ?? []).filter(
      sub => sub.anchor && REQUIREMENT_PATH.test(sub.anchor.id),
    );

    // A grouping heading (e.g. "5" / "Hiking") that only matched on its
    // own title, with no excerpt of its own, adds nothing once one of
    // its child requirements is already showing as its own tile -- the
    // match is assumed to live in the child's text too.
    const withExcerpts = anchored.map(sub => ({
      sub,
      excerpt: trimExcerpt(sub.excerpt ?? "", sub.title ?? ""),
    }));
    const visible = withExcerpts.filter(({ sub, excerpt }) => {
      if (excerpt) return true;
      const id = sub.anchor?.id ?? "";
      return !withExcerpts.some(
        other => other.sub !== sub && (other.sub.anchor?.id ?? "").startsWith(`${id}.`),
      );
    });

    // A page-level match landing outside any requirement heading region
    // (e.g. text before the first heading) leaves no visible sub-result.
    // The award still matched, so the panel renders with a single tile
    // pointing at the page rather than a title floating on its own.
    const tiles = visible.length
      ? visible
          .map(({ sub, excerpt }) => requirementTile(sub, data.url, excerpt))
          .join("")
      : `
      <li class="requirement-result requirement-result--page">
        <h3 class="requirement-result__title">
          <a href="${escapeHtml(data.url)}">${escapeHtml(title)}</a>
        </h3>
        <p class="requirement-result__excerpt">Matched elsewhere on this page.</p>
      </li>`;

    return `
    <article class="award-result">
      <a class="award-result__emblem" href="${escapeHtml(data.url)}" aria-hidden="true" tabindex="-1">
        ${emblemHtml(data.meta?.image)}
      </a>
      <div class="award-result__body">
        <h2 class="award-result__title">
          <a href="${escapeHtml(data.url)}">${escapeHtml(title)}</a>
        </h2>
        <ul class="award-result__requirements">${tiles}</ul>
      </div>
    </article>`;
  }

  // ----------------------------------------------------------- search state

  let currentResults: PagefindResult[] = [];
  let rendered = 0;
  let renderToken = 0;

  function setMessage(text: string): void {
    messageEl.textContent = text;
  }

  function reset(): void {
    currentResults = [];
    rendered = 0;
    renderToken++;
    resultsEl.innerHTML = "";
    moreButton.hidden = true;
    setMessage("");
  }

  // Only the slice about to be rendered gets `data()` awaited -- a broad
  // query can return well over a hundred results, and resolving them all
  // on every keystroke would be far slower than the UI it replaces.
  async function renderNextPage(): Promise<void> {
    const token = renderToken;
    const slice = currentResults.slice(rendered, rendered + pageSize);
    const panels = await Promise.all(
      slice.map(async result => awardPanel(await result.data())),
    );
    if (token !== renderToken) return;

    resultsEl.insertAdjacentHTML("beforeend", panels.join(""));
    rendered += slice.length;
    moreButton.hidden = rendered >= currentResults.length;
  }

  async function runSearch(query: string): Promise<void> {
    if (query.length < MIN_QUERY_LENGTH) {
      reset();
      if (query.length > 0) setMessage(minQueryHint);
      return;
    }

    const token = ++renderToken;
    const pf = await loadPagefind();
    const search = await pf.search(query);
    if (token !== renderToken) return;

    const results: PagefindResult[] = search.results;
    const best = results.reduce((max, r) => Math.max(max, r.score), 0);
    const isFuzzyOnly = results.length > 0 && best < FUZZY_MATCH_FLOOR;
    const count = isFuzzyOnly ? 0 : results.length;

    resultsEl.innerHTML = "";
    currentResults = isFuzzyOnly ? [] : results;
    rendered = 0;
    moreButton.hidden = true;

    if (count === 0) {
      setMessage(zeroResults.replace("[SEARCH_TERM]", query));
      reportNoResults(query);
      return;
    }

    setMessage(`${count} result${count === 1 ? "" : "s"} for ${query}`);
    await renderNextPage();
  }

  // ------------------------------------------------------------- analytics

  function reportNoResults(query: string): void {
    if (!noResultsEvent || typeof pirsch === "undefined") return;
    if (query.length < MIN_QUERY_LENGTH) return;
    pirsch(noResultsEvent, { meta: { query } });
  }

  // --------------------------------------------------------------- plumbing

  function updateURL(query: string): void {
    const url = new URL(window.location.href);
    if (query) {
      url.searchParams.set("q", query);
    } else {
      url.searchParams.delete("q");
    }
    history.replaceState(null, "", url.toString());
  }

  // Finalizes a query: syncs the URL and runs the search. Called once per
  // settled query, either after the debounce idles or when the input is
  // committed (blur/Enter), so short-lived intermediate keystrokes don't
  // each trigger a search. Raw query text isn't reported to analytics
  // beyond the no-results case -- result clicks are the signal that
  // matters.
  // Re-running an unchanged query would discard the rendered results and
  // reset pagination -- which is what a blur does, and clicking "Load
  // more" blurs the input.
  let lastCommitted: string | null = null;

  function commitQuery(query: string): void {
    if (query === lastCommitted) return;
    lastCommitted = query;
    updateURL(query);
    clearButton.hidden = !query;
    void runSearch(query);
  }

  let debounceId: ReturnType<typeof setTimeout>;

  form.addEventListener("submit", event => event.preventDefault());

  input.addEventListener("input", () => {
    clearTimeout(debounceId);
    debounceId = setTimeout(() => commitQuery(input.value.trim()), DEBOUNCE_MS);
  });

  // Commit immediately when the user finishes with the field, rather than
  // waiting out the debounce.
  function flush(): void {
    clearTimeout(debounceId);
    commitQuery(input.value.trim());
  }

  input.addEventListener("focusout", flush);
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      flush();
    }
  });

  clearButton.addEventListener("click", () => {
    input.value = "";
    clearTimeout(debounceId);
    commitQuery("");
    input.focus();
  });

  moreButton.addEventListener("click", () => void renderNextPage());

  // Track actual search intent: a result being opened, tagged with the
  // query that produced it. This is the primary analytics signal -- it
  // tells us what people search for and successfully find. A requirement
  // tile is clickable as a whole via an ::after overlay on its link, so
  // the click target is usually the <li> and not the anchor; delegate
  // from the tile (or the award heading) and read the href off the
  // anchor inside it.
  resultsEl.addEventListener("click", event => {
    if (
      !resultClickEvent ||
      typeof pirsch === "undefined" ||
      !(event.target instanceof Element)
    ) {
      return;
    }

    const card = event.target.closest(
      ".requirement-result, .award-result__title",
    );
    const link = card?.querySelector<HTMLAnchorElement>("a[href]");
    if (!link) return;

    const query = input.value.trim();
    if (query.length < MIN_QUERY_LENGTH) return;

    pirsch(resultClickEvent, {
      meta: { query, result: link.pathname },
    });
  });

  // Initialize from ?q= for shareable search links, else focus the input.
  const initialQuery = new URLSearchParams(window.location.search).get("q");
  if (initialQuery) {
    input.value = initialQuery;
    commitQuery(initialQuery.trim());
  } else {
    input.focus();
  }
}
