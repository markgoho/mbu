declare const PagefindUI: any;
declare const pirsch: (
  event: string,
  options?: { meta?: Record<string, string | number> },
) => void;

const container = document.querySelector<HTMLElement>("#search");

if (container) {
  const placeholder = container.dataset.searchPlaceholder ?? "Search...";
  const zeroResults =
    container.dataset.searchZeroResults ?? "No results found";
  const noResultsEvent = container.dataset.searchEventNoResults;
  const resultClickEvent = container.dataset.searchEventResultClick;
  const pageSize = container.dataset.searchPageSize
    ? Number(container.dataset.searchPageSize)
    : undefined;

  // Pagefind's ranking API re-scores but never drops a result (verified:
  // pushing termSimilarity to 500 took a fuzzy-only match's score to
  // literal 0 while pagefind.search() still returned count: 1), and
  // PagefindUI's own processResult hook can't filter either (a falsy
  // return falls back to the original result via `?? n` in its source).
  // So a query whose only candidate is fuzzy-match noise (e.g. "knives"
  // against a corpus that only has "knife") always renders something.
  // This runs Pagefind's raw search independently of PagefindUI's own
  // internal one, and swaps in a manual "no results" state when the
  // best score is below FUZZY_MATCH_FLOOR. See uni-theme#5.
  const FUZZY_MATCH_FLOOR = 0.05;
  let pagefindPromise: Promise<any> | null = null;
  function loadPagefind(): Promise<any> {
    if (!pagefindPromise) {
      pagefindPromise = import("/pagefind/pagefind.js").then(async pf => {
        await pf.init();
        await pf.options({ ranking: { termSimilarity: 10 } });
        return pf;
      });
    }
    return pagefindPromise;
  }

  const fuzzyOverride = document.createElement("p");
  fuzzyOverride.className = "pagefind-ui__message search-fuzzy-override";
  fuzzyOverride.hidden = true;
  container.insertAdjacentElement("afterend", fuzzyOverride);

  // Calibrated live against this site's index at ranking.termSimilarity:
  // 10 -- a spread of rare, single-occurrence real words (e.g.
  // "extinguish", "bowline", "mollusks") scored 0.62-2.96, while
  // nonsense queries ("asdkjaskdj", "frobnicate") topped out at 0.0003.
  // FUZZY_MATCH_FLOOR sits with roughly a 10x margin below the weakest
  // real match seen and a 150x+ margin above the noisiest fuzzy-only
  // match, so it should not suppress a genuine result.
  async function checkFuzzyFloor(query: string): Promise<void> {
    if (!container) return;
    if (!query || query.length < MIN_QUERY_LENGTH) {
      container.classList.remove("search-fuzzy-suppressed");
      fuzzyOverride.hidden = true;
      return;
    }

    const pf = await loadPagefind();
    const search = await pf.search(query);
    const best = search.results.reduce(
      (max: number, r: { score: number }) => Math.max(max, r.score),
      0,
    );
    const isFuzzyOnly = search.results.length > 0 && best < FUZZY_MATCH_FLOOR;

    container.classList.toggle("search-fuzzy-suppressed", isFuzzyOnly);
    fuzzyOverride.hidden = !isFuzzyOnly;
    if (isFuzzyOnly) {
      fuzzyOverride.textContent = zeroResults.replace("[SEARCH_TERM]", query);
    }
  }

  new PagefindUI({
    element: "#search",
    showSubResults: true,
    showImages: true,
    resetStyles: false,
    excerptLength: 500,
    ...(pageSize ? { pageSize } : {}),
    // Any query with no real match still returns Pagefind's best-effort
    // fuzzy candidate (e.g. "knives" against a corpus that only has
    // "knife" surfaces a single-character "(k)" match) — Pagefind never
    // drops a result to zero, only re-scores it, so this can't produce a
    // genuine "no results" state. Raising termSimilarity (default 1.0)
    // at least keeps real matches from being outranked by that noise:
    // verified live against this site's index that patrol/knife/
    // pocketknife hold well above a nonsense-query noise floor at 10,
    // while default (1.0) let a nonsense query outscore a real one.
    ranking: { termSimilarity: 10 },
    processResult: function (result: any) {
      // Optimize excerpts to prioritize showing highlighted matches
      if (result.excerpt) {
        const excerpt = result.excerpt;
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = excerpt;

        const firstMark = tempDiv.querySelector("mark");
        if (firstMark) {
          const fullText = tempDiv.textContent || "";
          const firstMarkText = firstMark.textContent || "";
          const markPosition = fullText.indexOf(firstMarkText);

          // If the first highlight is far into the excerpt (>100 chars),
          // truncate the beginning to prioritize showing the match
          if (markPosition > 100) {
            // Find a good breaking point (word boundary) ~60-80 chars before the mark
            const targetStart = Math.max(0, markPosition - 80);
            const spaceIndex = fullText.indexOf(" ", targetStart);
            const cutPoint = spaceIndex > 0 ? spaceIndex + 1 : targetStart;

            // Walk through nodes and remove text before cutPoint
            let charCount = 0;
            const nodesToRemove: Node[] = [];
            const walker = document.createTreeWalker(
              tempDiv,
              NodeFilter.SHOW_TEXT,
              null,
            );

            let node: Node | null;
            while ((node = walker.nextNode())) {
              const textLength = node.textContent?.length || 0;
              if (charCount + textLength <= cutPoint) {
                nodesToRemove.push(node);
                charCount += textLength;
              } else if (charCount < cutPoint) {
                const charsToRemove = cutPoint - charCount;
                node.textContent =
                  node.textContent?.substring(charsToRemove) || "";
                charCount = cutPoint;
                break;
              } else {
                break;
              }
            }

            nodesToRemove.forEach(n => n.parentNode?.removeChild(n));

            // Add ellipsis at the beginning
            const firstChild = tempDiv.firstChild;
            if (firstChild) {
              const ellipsis = document.createTextNode("...");
              tempDiv.insertBefore(ellipsis, firstChild);
            }

            result.excerpt = tempDiv.innerHTML;
          }
        }
      }
      return result;
    },
    translations: {
      placeholder: placeholder,
      zero_results: zeroResults,
    },
  });

  const INPUT_SELECTOR = ".pagefind-ui__search-input";
  const MESSAGE_SELECTOR = ".pagefind-ui__message";
  const RESULT_LINK_SELECTOR = ".pagefind-ui__result-link";
  const DEBOUNCE_MS = 300;
  const MIN_QUERY_LENGTH = 3;

  let debounceId: ReturnType<typeof setTimeout>;

  // URL sync for shareable search links
  function updateURL(query: string): void {
    const url = new URL(window.location.href);
    if (query) {
      url.searchParams.set("q", query);
    } else {
      url.searchParams.delete("q");
    }
    history.replaceState(null, "", url.toString());
  }

  // Finalizes a query: syncs the URL and, if it turned up nothing,
  // reports a no-results event. Called once per settled query, either
  // after the debounce idles or when the input is committed
  // (blur/Enter), so short-lived intermediate keystrokes aren't logged.
  // Raw query text otherwise isn't reported — result clicks (below)
  // are the signal that matters for analytics.
  function commitQuery(query: string): void {
    if (!container) return;
    updateURL(query);
    void checkFuzzyFloor(query);

    if (
      !noResultsEvent ||
      typeof pirsch === "undefined" ||
      !query ||
      query.length < MIN_QUERY_LENGTH
    ) {
      return;
    }

    const messageEl = container.querySelector(MESSAGE_SELECTOR);
    const match = messageEl?.textContent?.match(/(\d+)\s+results?\b/i);
    if (match && Number(match[1]) === 0) {
      pirsch(noResultsEvent, { meta: { query } });
    }
  }

  // Initialize from URL if ?q= param exists, else focus input
  const initialQuery = new URLSearchParams(window.location.search).get("q");
  setTimeout(() => {
    const input = container.querySelector(
      INPUT_SELECTOR,
    ) as HTMLInputElement | null;
    if (input) {
      if (initialQuery) {
        input.value = initialQuery;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      } else {
        input.focus();
      }
    }
  }, 100);

  // Handle search input
  container.addEventListener("input", event => {
    const target = event.target;
    if (
      !(target instanceof HTMLInputElement) ||
      !target.matches(INPUT_SELECTOR)
    ) {
      return;
    }

    clearTimeout(debounceId);
    debounceId = setTimeout(() => {
      commitQuery(target.value.trim());
    }, DEBOUNCE_MS);
  });

  // Commit immediately when the user finishes with the field, rather
  // than waiting out the debounce.
  function flush(event: Event): void {
    const target = event.target;
    if (
      !(target instanceof HTMLInputElement) ||
      !target.matches(INPUT_SELECTOR)
    ) {
      return;
    }

    clearTimeout(debounceId);
    commitQuery(target.value.trim());
  }

  container.addEventListener("focusout", flush);
  container.addEventListener("keydown", event => {
    if (event instanceof KeyboardEvent && event.key === "Enter") flush(event);
  });

  // The Clear button resets Pagefind's own input via Svelte state, which
  // doesn't reliably dispatch a native "input" event on the underlying
  // element -- so the fuzzy-floor override could otherwise outlive an
  // emptied query. Clearing always means an empty query, so drop the
  // override immediately rather than waiting on checkFuzzyFloor's own
  // (already-empty-query-safe) path.
  container.addEventListener("click", event => {
    if (
      event.target instanceof Element &&
      event.target.closest(".pagefind-ui__search-clear")
    ) {
      container.classList.remove("search-fuzzy-suppressed");
      fuzzyOverride.hidden = true;
    }
  });

  // Track actual search intent: a result being opened, tagged with the
  // query that produced it. This is the primary analytics signal —
  // it tells us what people search for and successfully find.
  container.addEventListener("click", event => {
    if (
      !resultClickEvent ||
      typeof pirsch === "undefined" ||
      !(event.target instanceof Element)
    ) {
      return;
    }

    const link = event.target.closest(RESULT_LINK_SELECTOR);
    if (!(link instanceof HTMLAnchorElement)) return;

    const input = container.querySelector(
      INPUT_SELECTOR,
    ) as HTMLInputElement | null;
    const query = input?.value.trim() ?? "";
    if (query.length < MIN_QUERY_LENGTH) return;

    pirsch(resultClickEvent, {
      meta: { query, result: link.pathname },
    });
  });
}
