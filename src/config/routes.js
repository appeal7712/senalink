/** 앱 경로 */
export const PAGE = {
  MAIN: 'public_main',
  HUB: 'guild_room',
  COMMUNITY: 'community',
  TOOLS: 'tools',
  DEX: 'encyclopedia',
  OPS: 'ops',
};

export const PAGE_PATH = {
  [PAGE.MAIN]: '/',
  [PAGE.HUB]: '/hub',
  [PAGE.COMMUNITY]: '/community',
  [PAGE.TOOLS]: '/tools',
  [PAGE.DEX]: '/dex',
  [PAGE.OPS]: '/ops',
};

export function normalizePath(pathname) {
  const p = String(pathname || '/').replace(/\/+$/, '');
  return p || '/';
}

export function pathToPage(pathname) {
  const p = normalizePath(pathname);
  if (p === '/ops') return PAGE.OPS;
  if (p === '/hub' || p === '/guild') return PAGE.HUB;
  if (p === '/community') return PAGE.COMMUNITY;
  if (p === '/tools' || p.startsWith('/tools/')) return PAGE.TOOLS;
  if (p === '/dex' || p === '/encyclopedia') return PAGE.DEX;
  return PAGE.MAIN;
}

export function pageToPath(page) {
  return PAGE_PATH[page] || '/';
}

export function isOpsPath(pathname) {
  const path = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  return pathToPage(path) === PAGE.OPS;
}

export function navigateTo(page) {
  if (typeof window === 'undefined') return;
  const next = pageToPath(page);
  if (normalizePath(window.location.pathname) === normalizePath(next)) return;
  window.history.pushState({ page }, '', next);
  window.dispatchEvent(new CustomEvent('app:navigate', { detail: { page } }));
}
