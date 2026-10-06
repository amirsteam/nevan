/**
 * Theme preference: "light", "dark" or "system". The resolved theme is
 * written to <html data-theme>; index.html applies it before first paint.
 */
export type ThemePreference = "light" | "dark" | "system";

// Keep in sync with the inline script in index.html
export const THEME_STORAGE_KEY = "nevan-theme";

const darkQuery = (): MediaQueryList | null =>
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

export const getThemePreference = (): ThemePreference => {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
  } catch {
    // Storage blocked (private mode): fall back to the system theme
  }
  return "system";
};

export const resolveTheme = (preference: ThemePreference): "light" | "dark" =>
  preference === "system" ? (darkQuery()?.matches ? "dark" : "light") : preference;

export const applyTheme = (preference: ThemePreference): void => {
  const theme = resolveTheme(preference);
  document.documentElement.setAttribute("data-theme", theme);
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute("content", theme === "dark" ? "#1a1514" : "#fdf9f7"));
};

export const setThemePreference = (preference: ThemePreference): void => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Not persisted, but still applied for this visit
  }
  applyTheme(preference);
};

/** Re-apply when the OS theme changes while the preference is "system" */
export const watchSystemTheme = (onChange: () => void): (() => void) => {
  const query = darkQuery();
  if (!query) return () => {};
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
