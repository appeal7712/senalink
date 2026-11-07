/** 앱 경로 */
export const PAGE = {
  MAIN: 'public_main',
  TEAM: 'team_builder',
  HUB: 'guild_room',
  COMMUNITY: 'community',
  TOOLS: 'tools',
  DEX: 'encyclopedia',
  OPS: 'ops',
};

export const PAGE_PATH = {
  [PAGE.MAIN]: '/',
  [PAGE.TEAM]: '/team',
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
  if (p === '/team' || p.startsWith('/team/')) return PAGE.TEAM;
  if (p === '/community') return PAGE.COMMUNITY;
  if (p === '/tools' || p.startsWith('/tools/')) return PAGE.TOOLS;
  if (p === '/dex' || p === '/encyclopedia') return PAGE.DEX;
  return PAGE.MAIN;
}

/** `/tools` · `/tools/win-calc` · `/tools/tierlist` → tool id */
export function toolIdFromPath(pathname) {
  const p = normalizePath(pathname);
  if (p === '/tools') return null;
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
  const next = pageToPath(page);
  if (normalizePath(window.location.pathname) === normalizePath(next)) return;
  window.history.pushState({ page }, '', next);
  window.dispatchEvent(new CustomEvent('app:navigate', { detail: { page } }));
}

/** 팀 빌더 모드 — `/team` (선택 화면) · `/team/arena` (5vs5) · `/team/guildwar` (3vs3) · `/team/pve` (5인 · 아군만) · `/team/effects` (효과 사전) */
export const TEAM_MODES = ['arena', 'guildwar', 'pve', 'effects'];

export function teamModeFromPath(pathname) {
  const p = normalizePath(pathname);
  if (!p.startsWith('/team/')) return null;
  const id = p.slice('/team/'.length).split('/')[0];
  return TEAM_MODES.includes(id) ? id : null;
}

export function navigateToTeam(mode = null) {
  if (typeof window === 'undefined') return;
  const next = mode && TEAM_MODES.includes(mode) ? `/team/${mode}` : '/team';
  if (normalizePath(window.location.pathname) !== normalizePath(next)) {
    window.history.pushState({ page: PAGE.TEAM, teamMode: mode }, '', next);
  }
  window.dispatchEvent(new CustomEvent('app:navigate', { detail: { page: PAGE.TEAM, teamMode: mode } }));
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
