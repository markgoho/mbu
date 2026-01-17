// deep-link.ts - Clipboard functionality for requirement deep links

document.addEventListener("click", (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  const link = target.closest<HTMLAnchorElement>(".copy-link-btn");
  if (!link) return;

  const href = link.getAttribute("href");
  if (!href) return;

  // Extract the path from href (e.g., "#1.a" -> "1.a")
  const path = href.replace("#", "");
  const url = `${window.location.origin}${window.location.pathname}#${path}`;

  navigator.clipboard.writeText(url).catch(err => {
    console.error("Failed to copy link:", err);
  });
});
