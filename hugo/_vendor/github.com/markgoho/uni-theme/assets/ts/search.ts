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

  new PagefindUI({
    element: "#search",
    showSubResults: true,
    showImages: true,
    resetStyles: false,
    excerptLength: 500,
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
