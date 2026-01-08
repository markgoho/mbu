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
  excerptLength: 80,
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
