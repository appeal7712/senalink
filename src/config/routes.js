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

export const DEFAULT_TOOL_ID = 'win-calc';

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

/** `/tools` · `/tools/win-calc` · `/tools/tierlist` → tool id */
export function toolIdFromPath(pathname) {
  const p = normalizePath(pathname);
  if (p === '/tools') return DEFAULT_TOOL_ID;
  if (!p.startsWith('/tools/')) return null;
  const id = p.slice('/tools/'.length).split('/')[0];
  return id || DEFAULT_TOOL_ID;
}

export function toolsPath(toolId = DEFAULT_TOOL_ID) {
  const id = String(toolId || DEFAULT_TOOL_ID).trim() || DEFAULT_TOOL_ID;
  return `/tools/${id}`;
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
  const next = page === PAGE.TOOLS ? toolsPath(DEFAULT_TOOL_ID) : pageToPath(page);
  if (normalizePath(window.location.pathname) === normalizePath(next)) return;
  window.history.pushState({ page }, '', next);
  window.dispatchEvent(new CustomEvent('app:navigate', { detail: { page } }));
}

/** 도구 하위 탭 — URL에 tool id를 넣어 ToolsPage가 구분할 수 있게 함 */
export function navigateToTools(toolId = DEFAULT_TOOL_ID) {
  if (typeof window === 'undefined') return;
  const next = toolsPath(toolId);
  if (normalizePath(window.location.pathname) === normalizePath(next)) {
    window.dispatchEvent(new CustomEvent('app:navigate', { detail: { page: PAGE.TOOLS, toolId } }));
    return;
  }
  window.history.pushState({ page: PAGE.TOOLS, toolId }, '', next);
  window.dispatchEvent(new CustomEvent('app:navigate', { detail: { page: PAGE.TOOLS, toolId } }));
}
