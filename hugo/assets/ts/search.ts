declare const PagefindUI: any;
declare const pirsch: (
  event: string,
  options?: { meta?: Record<string, string | number> },
) => void;

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
    placeholder: "Search requirements...",
    zero_results: "No requirements found",
  },
});

const container = document.querySelector("#search");

if (container) {
  const INPUT_SELECTOR = ".pagefind-ui__search-input";
  const MESSAGE_SELECTOR = ".pagefind-ui__message";
  const DEBOUNCE_MS = 300;

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

  // Initialize from URL if ?q= param exists
  const initialQuery = new URLSearchParams(window.location.search).get("q");
  if (initialQuery) {
    setTimeout(() => {
      const input = container.querySelector(
        INPUT_SELECTOR,
      ) as HTMLInputElement | null;
      if (input) {
        input.value = initialQuery;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }, 100);
  }

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
      const query = target.value.trim();
      updateURL(query);

      // Pirsch analytics
      if (typeof pirsch !== "undefined" && query) {
        const messageEl = container.querySelector(MESSAGE_SELECTOR);
        let resultCount = 0;
        if (messageEl?.textContent) {
          const match = messageEl.textContent.match(/(\d+)\s+results?\b/i);
          if (match) resultCount = Number(match[1]);
        }
        pirsch("merit-badge-search", {
          meta: { query, results: resultCount },
        });
      }
    }, DEBOUNCE_MS);
  });
}
