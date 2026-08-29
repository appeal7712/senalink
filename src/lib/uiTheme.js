/** UI 테마 — glass(유리) | solid(선명 다크) · localStorage 저장 */
export const UI_THEME_GLASS = 'glass';
export const UI_THEME_SOLID = 'solid';

export const UI_THEME_STORAGE_KEY = 'senalink_ui_theme';

export function resolveUiTheme(saved) {
  return saved === UI_THEME_SOLID ? UI_THEME_SOLID : UI_THEME_GLASS;
}

export function initUiTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(UI_THEME_STORAGE_KEY);
  } catch {
    saved = null;
  }
  const theme = resolveUiTheme(saved);
  document.documentElement.dataset.uiTheme = theme;
  return theme;
}

export function getUiTheme() {
  return document.documentElement.dataset.uiTheme || UI_THEME_GLASS;
}

export function setUiTheme(theme) {
  const next = theme === UI_THEME_SOLID ? UI_THEME_SOLID : UI_THEME_GLASS;
  document.documentElement.dataset.uiTheme = next;
  try {
    localStorage.setItem(UI_THEME_STORAGE_KEY, next);
  } catch {
    /* private mode 등 */
  }
  window.dispatchEvent(new CustomEvent('app:ui-theme', { detail: { theme: next } }));
}
