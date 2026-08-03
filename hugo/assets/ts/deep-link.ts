// deep-link.ts - copy affordances for requirements and subrequirements.
//
// Three ways to get a requirement out of the page, in decreasing order of
// how deliberate they are:
//
//   "Copy text" button - the requirement's own words, for pasting into
//                        notes. No non-JS equivalent, so it's a <button>.
//   "Copy link" button - the deep link. A real <a href="#path">, so with
//                        JS off it still deep-links; with JS it copies
//                        instead.
//   click the text     - anywhere in a requirement copies its link, on a
//                        fine pointer only. Undiscoverable on its own,
//                        which is why the toolbar exists; but once you
//                        know, the target is the whole requirement rather
//                        than a 32px button. On touch a tap reveals the
//                        toolbar instead (CSS :focus-within), so reading
//                        never writes to the clipboard by accident.
//
// None of it navigates. See copyLink.
//
// Every path confirms. The previous version wrote to the clipboard and
// said nothing, so a successful copy and a blocked one looked identical.

const TOAST_MS = 1700;
let toastEl: HTMLElement | null = null;
let toastTimer: number | undefined;

function toast(message: string): void {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "req-toast";
    toastEl.setAttribute("role", "status");
    toastEl.setAttribute("aria-live", "polite");
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  toastEl.setAttribute("data-show", "");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastEl?.removeAttribute("data-show");
  }, TOAST_MS);
}

function copy(text: string, label: string): void {
  if (!navigator.clipboard) {
    toast("Clipboard unavailable");
    return;
  }
  navigator.clipboard.writeText(text).then(
    () => toast(`${label} copied`),
    () => toast(`${label} — copy blocked`),
  );
}

function linkFor(path: string): string {
  return `${window.location.origin}${window.location.pathname}#${path}`;
}

// COPYING A LINK UPDATES THE URL, BUT DOES NOT NAVIGATE.
//
// Scrolling the target into view is native behaviour for a fragment
// navigation, and there is no declarative way to opt out -- so don't
// trigger one. replaceState puts the address bar in agreement with
// what's on the clipboard without moving the page or stacking a history
// entry, because copying a link isn't going anywhere.
//
// The highlight is CSS's job either way: :target when someone arrives
// from a shared link, :focus-within when they click a requirement here.
// (Clicking can't rely on :target -- replaceState never re-evaluates
// it. That's what :focus-within and tabindex="-1" are for.)
function copyLink(path: string): void {
  window.history.replaceState(null, "", linkFor(path));
  copy(linkFor(path), `Link to ${path}`);
}

// The requirement's rendered words, assembled explicitly rather than
// read off .innerText: a detached clone (the previous approach) has no
// layout box, so the browser has nothing to base line breaks on and
// every element's text runs together. Reading the live DOM's own
// pieces -- marker/path, title, body text, then recursing into any
// nested subrequirements -- gives control over the paste's shape
// instead of whatever the rendered layout happens to produce.
function textOf(el: Element | null): string {
  return el ? (el.textContent ?? "").trim() : "";
}

function requirementText(li: HTMLElement, path: string): string {
  const isCard = li.classList.contains("req-card");
  const scope = li.querySelector<HTMLElement>(
    isCard ? ":scope > .req-card__panel" : ":scope > .req-child__body",
  );

  // Chips have no body wrapper and never nest further.
  if (!scope) {
    const body = textOf(li.querySelector(":scope > .req-child__text"));
    return body ? `${path}. ${body}` : `${path}.`;
  }

  const title = textOf(
    scope.querySelector(
      isCard
        ? ":scope > .req-card__header .req-card__title"
        : ":scope > .req-child__title-row > .req-child__title",
    ),
  );
  const body = textOf(scope.querySelector(":scope > .req-child__text, :scope > .req-card__text"));

  const lines: string[] = [];
  if (title) {
    lines.push(`${path}. ${title}`);
    if (body) lines.push(body);
  } else {
    lines.push(body ? `${path}. ${body}` : `${path}.`);
  }

  const resourceLinks = scope.querySelectorAll<HTMLAnchorElement>(":scope > .resources li a");
  if (resourceLinks.length) {
    const list = Array.from(resourceLinks)
      .map((a) => `- ${a.textContent?.trim()}`)
      .join("\n");
    lines.push(`Resources:\n${list}`);
  }

  const childList = scope.querySelector<HTMLElement>(":scope > .req-children");
  if (childList) {
    childList.querySelectorAll<HTMLElement>(":scope > [data-anchor]").forEach((child) => {
      const childPath = child.dataset.anchor;
      if (childPath) lines.push(requirementText(child, childPath));
    });
  }

  return lines.join("\n\n");
}

function copyText(requirement: HTMLElement, path: string): void {
  copy(requirementText(requirement, path), `Text of ${path}`);
}

document.addEventListener("click", (event: MouseEvent) => {
  const target = event.target as HTMLElement;

  const copyTextBtn = target.closest<HTMLElement>(".copy-text-btn");
  if (copyTextBtn) {
    const requirement = copyTextBtn.closest<HTMLElement>("[data-anchor]");
    if (requirement?.dataset.anchor) {
      event.preventDefault();
      copyText(requirement, requirement.dataset.anchor);
    }
    return;
  }

  // It stays a real <a href="#path"> so that with JS off it still does
  // the only thing it can -- deep-link to the requirement. With JS, the
  // clipboard write replaces that, and the navigation (and its scroll)
  // is suppressed.
  const copyLinkBtn = target.closest<HTMLAnchorElement>(".copy-link-btn");
  if (copyLinkBtn) {
    const href = copyLinkBtn.getAttribute("href");
    if (href) {
      event.preventDefault();
      copyLink(href.replace("#", ""));
    }
    return;
  }

  // Click anywhere in a requirement. Requirements NEST, so a click on
  // subrequirement 3.a would otherwise run 3.a's handler and then the
  // card's, and the card would win -- you asked for #3.a and got #3.
  // The innermost requirement owns the click.
  const requirement = target.closest<HTMLElement>("[data-anchor]");
  if (!requirement?.dataset.anchor) return;
  // Don't hijack a real link, a button, or a text selection someone is
  // making in order to copy by hand.
  if (target.closest("a, button")) return;
  if (String(window.getSelection())) return;

  // On a touch screen, tapping a requirement is how you ASK FOR its
  // toolbar -- there's no hover to reveal it. Navigating would scroll
  // that requirement to the top of the viewport just as the toolbar
  // appeared under your thumb, so the thing you tapped jumps away from
  // where you tapped it. Focus does the revealing instead (CSS
  // :focus-within, on the tabindex="-1" the markup already carries), and
  // the browser only scrolls if the element isn't already visible.
  // Copying stays with the explicit buttons, where it can't surprise
  // anyone who was only trying to read.
  if (window.matchMedia("(hover: none)").matches) return;

  copyLink(requirement.dataset.anchor);
});
