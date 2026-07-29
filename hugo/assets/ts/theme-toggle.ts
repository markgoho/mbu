// theme-toggle.ts - Syncs native theme toggle checkbox state and persists choice to localStorage.
const STORAGE_KEY = "theme";

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getEffectiveTheme(): "dark" | "light" {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return prefersDark() ? "dark" : "light";
}

document.addEventListener("DOMContentLoaded", () => {
  const checkbox = document.querySelector<HTMLInputElement>(
    "#theme-toggle-checkbox",
  );
  if (!checkbox) return;

  const currentTheme = getEffectiveTheme();
  const isDark = currentTheme === "dark";
  checkbox.checked = isDark;
  document.documentElement.classList.toggle("dark", isDark);

  checkbox.addEventListener("change", () => {
    const nextTheme = checkbox.checked ? "dark" : "light";
    localStorage.setItem(STORAGE_KEY, nextTheme);
    document.documentElement.classList.toggle("dark", checkbox.checked);
  });
});
