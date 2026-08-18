// deep-link.ts - the requirement dock, and copy affordances for
// requirements and subrequirements.
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
//                        which is why the dock exists to spell it out;
//                        but once you know, the target is the whole
//                        requirement rather than a small button. On
//                        touch a tap selects the requirement instead
//                        (CSS :focus-within brings the dock up), so
//                        reading never writes to the clipboard by
//                        accident.
//
// None of it navigates. See copyLink.
//
// Every path confirms. Writing to the clipboard silently made a
// successful copy and a blocked one look identical.
//
// THE DOCK. There is one shared action bar (req-dock.html) instead of a
// toolbar per requirement, fixed near the bottom of the viewport. It has
// no idea which requirement it applies to until this file tells it:
// focusin or click on any [data-anchor] points the dock at that
// requirement by setting attributes (pointDockAt, below) -- the dock's
// own CSS does everything else (req-dock rules in
// merit-badge-requirements.css). Script never builds, clones, or empties
// any DOM here; it only moves attribute values.

declare const pirsch: (
  event: string,
  options?: { meta?: Record<string, string | number> },
) => void;

document.documentElement.setAttribute("data-js", "");

const TOAST_MS = 1700;
// Authored in req-dock.html, inside the dock's stack, rather than built
// here on first use. As two independently-fixed elements the toast and
// the dock simply overlapped -- the confirmation landed across the very
// buttons that raised it. Sharing a flex column makes that impossible,
// and it takes the last bit of DOM construction out of this file.
const toastEl = document.getElementById("req-toast");
let toastTimer: number | undefined;

function toast(message: string): void {
  if (!toastEl) return;
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

function selectRequirement(el: HTMLElement | null, updateUrl = true): void {
  document.querySelectorAll<HTMLElement>("[data-anchor][data-selected]").forEach((node) => {
    node.removeAttribute("data-selected");
  });

  if (el && el.dataset.anchor) {
    el.setAttribute("data-selected", "true");
    pointDockAt(el);
    if (updateUrl) {
      window.history.replaceState(null, "", linkFor(el.dataset.anchor));
    }
  } else {
    dock?.removeAttribute("data-for");
    if (updateUrl && window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }
}

// COPYING A LINK UPDATES THE URL, BUT DOES NOT NAVIGATE.
//
// Scrolling the target into view is native behaviour for a fragment
// navigation, and there is no declarative way to opt out -- so don't
// trigger one. replaceState puts the address bar in agreement with
// what's on the clipboard without moving the page or stacking a history
// entry, because copying a link isn't going anywhere.
function copyLink(path: string): void {
  const req = document.querySelector<HTMLElement>(`[data-anchor="${CSS.escape(path)}"]`);
  selectRequirement(req);
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
  const text = requirementText(requirement, path);

  if (typeof pirsch !== "undefined") {
    const badge =
      requirement.dataset.contentName ??
      requirement.closest<HTMLElement>("[data-content-name]")?.dataset.contentName ??
      "";
    pirsch("requirement-copy-text", {
      meta: { badge, path, length: text.length },
    });
  }

  copy(text, `Text of ${path}`);
}

// ---------------------------------------------------------------------
// The dock: pointing it at whatever requirement is selected.
// ---------------------------------------------------------------------

const dock = document.getElementById("req-dock");
const dockFor = document.getElementById("req-dock-for") as HTMLElement | null;
const dockGuide = document.getElementById("req-dock-guide") as HTMLAnchorElement | null;
const dockLink = document.getElementById("req-dock-link") as HTMLAnchorElement | null;

// Everything the dock shows is drawn from attributes (see the CSS), so
// pointing it at a requirement is just copying values across -- nothing
// is built, cloned, or emptied.
function pointDockAt(el: HTMLElement): void {
  const path = el.dataset.anchor;
  if (!dock || !dockFor || !dockGuide || !dockLink || !path) return;

  // "7.b.2" splits into a bold "7" and a lighter ".b.2" -- see
  // .req-dock__for's ::before/::after in the CSS -- so the dock reads as
  // a place inside requirement 7 rather than one five-character token.
  const cut = path.indexOf(".");
  dockFor.dataset.req = cut === -1 ? path : path.slice(0, cut);
  dockFor.dataset.sub = cut === -1 ? "" : path.slice(cut);

  dockLink.setAttribute("href", `#${path}`);
  // Not every requirement has a guide; data-guide is absent on those
  // (see req-card.html / req-child-item.html), and an empty href is what
  // the CSS keys off of to hide the button rather than leave it dangling.
  dockGuide.setAttribute("href", el.dataset.guide ?? "");

  // NAMING THE TARGET IS NOT DECORATION HERE. The number chip is two CSS
  // pseudo-elements, which put no text in the accessibility tree at all,
  // and unlike the per-requirement toolbar this replaced, the dock does
  // not sit inside the thing it acts on -- so without this a screen
  // reader reaching it finds three buttons with nothing to say which of
  // a thousand requirements they apply to. The visible chip and this
  // label are the same fact, told twice.
  dock.setAttribute("aria-label", `Actions for requirement ${path}`);

  dock.dataset.for = path;
}

// Focus and click both point the dock and update selection.
["focusin", "click"].forEach((type) => {
  document.addEventListener(type, (event: Event) => {
    const target = event.target as HTMLElement;
    if (target.closest(".req-dock")) return;
    const requirement = target.closest<HTMLElement>("[data-anchor]");
    if (requirement) {
      selectRequirement(requirement);
    } else if (type === "click") {
      selectRequirement(null);
    }
  });
});

document.addEventListener("click", (event: MouseEvent) => {
  const target = event.target as HTMLElement;

  const copyTextBtn = target.closest<HTMLElement>(".copy-text-btn");
  if (copyTextBtn) {
    // The dock's copy-text button (the only one left -- there is no
    // longer a per-requirement copy-text button) has no [data-anchor]
    // ancestor of its own; it lives in req-dock.html, outside the
    // requirement it acts on. Fall back to the requirement the dock is
    // currently pointed at.
    const requirement =
      copyTextBtn.closest<HTMLElement>("[data-anchor]") ??
      (dock?.dataset.for
        ? document.querySelector<HTMLElement>(`[data-anchor="${CSS.escape(dock.dataset.for)}"]`)
        : null);
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

  // On a touch screen, tapping a requirement is how you ASK FOR the dock
  // -- there's no hover to reveal it, and the focusin/click listener
  // above already brought it up by the time this handler runs. Copying
  // the link on top of that, from a plain tap, would surprise anyone who
  // was only trying to read; it stays behind the dock's explicit button.
  // (On a fine pointer the tap-equivalent is a click, which IS explicit
  // enough -- clicking a requirement is understood as "select this one",
  // and copying its link is the reward for knowing that.)
  if (window.matchMedia("(hover: none)").matches) return;

  copyLink(requirement.dataset.anchor);
});

function initFromHash(): void {
  if (!window.location.hash) {
    selectRequirement(null);
    return;
  }
  const rawHash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  if (!rawHash) {
    selectRequirement(null);
    return;
  }
  const initialReq = document.querySelector<HTMLElement>(`[data-anchor="${CSS.escape(rawHash)}"]`);
  selectRequirement(initialReq);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFromHash);
} else {
  initFromHash();
}

window.addEventListener("hashchange", initFromHash);
