declare const pirsch: (
  event: string,
  options?: { meta?: Record<string, string | number> },
) => void;

const MIN_QUERY_LENGTH = 3;

// The event keeps its old "home-hero" name so existing dashboards still
// count it.
const form = document.querySelector<HTMLFormElement>("#home-search-form");
if (form) {
  form.addEventListener("submit", () => {
    if (typeof pirsch === "undefined") return;
    const input = form.querySelector<HTMLInputElement>('input[name="q"]');
    const query = input?.value.trim() ?? "";
    if (query.length < MIN_QUERY_LENGTH) return;
    pirsch("merit-badge-home-hero-search", { meta: { query } });
  });
}
