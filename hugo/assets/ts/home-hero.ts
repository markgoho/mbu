declare const pirsch: (
  event: string,
  options?: { meta?: Record<string, string | number> },
) => void;

const MIN_QUERY_LENGTH = 3;

const form = document.querySelector<HTMLFormElement>("#hero-search-form");
if (form) {
  form.addEventListener("submit", () => {
    if (typeof pirsch === "undefined") return;
    const input = form.querySelector<HTMLInputElement>('input[name="q"]');
    const query = input?.value.trim() ?? "";
    if (query.length < MIN_QUERY_LENGTH) return;
    pirsch("merit-badge-home-hero-search", { meta: { query } });
  });
}

document
  .querySelectorAll<HTMLAnchorElement>("[data-hero-browse]")
  .forEach(link => {
    link.addEventListener("click", () => {
      if (typeof pirsch === "undefined") return;
      pirsch("merit-badge-home-hero-browse", {
        meta: { target: link.dataset.heroBrowse ?? "" },
      });
    });
  });
