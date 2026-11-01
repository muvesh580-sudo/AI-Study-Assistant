const THEME_KEY = "theme";

export function getInitialTheme() {
  const saved = localStorage.getItem(THEME_KEY);

  if (saved === "light" || saved === "dark") {
    return saved;
  }

  return window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
}
