export const THEME_STORAGE_KEY = "elimulink_theme_mode";

export function getStoredThemeMode() {
  const value = localStorage.getItem(THEME_STORAGE_KEY);
  if (value === "light" || value === "dark" || value === "system") return value;
  return "system";
}

export function resolveIsDark(mode) {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return Boolean(window.matchMedia?.("(prefers-color-scheme: dark)")?.matches);
}

export function applyThemeMode(mode) {
  const isDark = resolveIsDark(mode);
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
  root.setAttribute("data-theme", isDark ? "dark" : "light");
}

export function setThemeMode(mode) {
  const next = mode === "light" || mode === "dark" || mode === "system" ? mode : "system";
  localStorage.setItem(THEME_STORAGE_KEY, next);
  applyThemeMode(next);
  window.dispatchEvent(new CustomEvent("elimulink-theme-change", { detail: { mode: next } }));
}

