// theme-toggle.ts - Cycles the site theme system -> light -> dark and
// persists the choice to localStorage. Paired with `head/theme-init.html`,
// which applies the stored/system preference before first paint to avoid
// a flash of incorrect theme.

type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "theme";
const ORDER: ThemePreference[] = ["system", "light", "dark"];
const LABELS: Record<ThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};
const NEXT_LABELS: Record<ThemePreference, string> = {
  system: "light",
  light: "dark",
  dark: "system",
};

function getStoredPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "system";
}

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyPreference(preference: ThemePreference): void {
  const isDark =
    preference === "dark" || (preference === "system" && prefersDark());
  document.documentElement.classList.toggle("dark", isDark);
}

function updateButton(
  button: HTMLButtonElement,
  preference: ThemePreference,
): void {
  const label = button.querySelector<HTMLElement>("[data-theme-toggle-label]");
  if (label) label.textContent = LABELS[preference];
  button.setAttribute(
    "aria-label",
    `Theme: ${LABELS[preference]} (click to switch to ${NEXT_LABELS[preference]})`,
  );
}

document.addEventListener("DOMContentLoaded", () => {
  const button = document.querySelector<HTMLButtonElement>(
    "[data-theme-toggle]",
  );
  if (!button) return;

  let preference = getStoredPreference();
  updateButton(button, preference);

  button.addEventListener("click", () => {
    const currentIndex = ORDER.indexOf(preference);
    preference = ORDER[(currentIndex + 1) % ORDER.length];

    if (preference === "system") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, preference);
    }

    applyPreference(preference);
    updateButton(button, preference);
  });
});
