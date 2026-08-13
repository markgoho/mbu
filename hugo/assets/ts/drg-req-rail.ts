// drg-req-rail.ts — the sticky requirement rail (.drg-req-rail) echoes the
// page's lead requirement so it stays readable once the reader has scrolled
// past it. On pages with subrequirements (4, 4a, 4b, …) the rail should
// track whichever one the reader is currently on, not stay pinned to 4.
//
// Recomputed from scroll position on every frame, rather than an
// IntersectionObserver watching a narrow band: a fast wheel flick or
// keyboard Page Down can move a block's whole bounding box across that band
// between rendered frames, so the observer never sees it intersect and the
// rail silently stops updating.

const rail = document.querySelector<HTMLElement>(".drg-req-rail");
const railNumber = rail?.querySelector<HTMLElement>(".drg-req-rail__number");
const railText = rail?.querySelector<HTMLElement>(".drg-req-rail__text");
const blocks = Array.from(document.querySelectorAll<HTMLElement>(".drg-content .drg-requirement"));

if (rail && railNumber && railText && blocks.length > 1) {
  const TRACK_LINE = 0.3; // fraction of viewport height counted as "current"
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const applyContent = (current: HTMLElement): void => {
    const number = current.querySelector(".drg-requirement__number")?.textContent;
    const text = current.querySelector(".drg-requirement__text")?.innerHTML;
    if (number) railNumber.textContent = number;
    if (text) railText.innerHTML = text;
  };

  // Shared, fixed view-transition-names (not per-requirement) -- only one
  // requirement is ever "becoming current" at a time, so the same pair of
  // names can be reused and cleared after each morph. Matched group/old/new
  // rules live in drg-blocks.css next to the rail's own styles.
  let transitionSeq = 0;
  const morphContent = (current: HTMLElement): void => {
    const seq = ++transitionSeq;
    const sourceNumber = current.querySelector<HTMLElement>(".drg-requirement__number");
    const sourceText = current.querySelector<HTMLElement>(".drg-requirement__text");
    if (sourceNumber) sourceNumber.style.viewTransitionName = "drg-rail-num";
    if (sourceText) sourceText.style.viewTransitionName = "drg-rail-text";

    const transition = document.startViewTransition(() => {
      if (sourceNumber) sourceNumber.style.viewTransitionName = "";
      if (sourceText) sourceText.style.viewTransitionName = "";
      applyContent(current);
      railNumber.style.viewTransitionName = "drg-rail-num";
      railText.style.viewTransitionName = "drg-rail-text";
    });

    transition.finished.catch(() => {}).finally(() => {
      // A faster follow-up morph may already own these names -- don't rip
      // them out from under it.
      if (seq !== transitionSeq) return;
      railNumber.style.viewTransitionName = "";
      railText.style.viewTransitionName = "";
    });
  };

  let lastBlock: HTMLElement | null = null;
  let ticking = false;

  const updateRail = (): void => {
    ticking = false;
    const line = window.innerHeight * TRACK_LINE;

    // The last block whose top has scrolled up past the track line is the
    // one the reader is currently reading.
    let current: HTMLElement | null = null;
    for (const block of blocks) {
      if (block.getBoundingClientRect().top <= line) {
        current = block;
      } else {
        break;
      }
    }
    if (!current || current === lastBlock) return;
    const isFirstRun = lastBlock === null;
    lastBlock = current;

    const canMorph = !reducedMotion && typeof document.startViewTransition === "function";
    if (isFirstRun || !canMorph) {
      applyContent(current);
    } else {
      morphContent(current);
    }
  };

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateRail);
    },
    { passive: true },
  );

  updateRail();
}
