import { LOUNGE_STORAGE_KEYS } from '../data/loungeMeta';

/** 붙여넣은 초대 문구/URL에서 7K-XXXX-XXXX 만 추출 */
export function parseInviteCode(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';
  const fromQuery = text.match(/[?&]lounge=([^&\s#]+)/i);
  if (fromQuery?.[1]) {
    try {
      return decodeURIComponent(fromQuery[1]).trim().toUpperCase();
    } catch {
      return fromQuery[1].trim().toUpperCase();
    }
  }
  const fromPattern = text.match(/7K-[A-Z0-9]{4}-[A-Z0-9]{4}/i);
  if (fromPattern?.[0]) return fromPattern[0].toUpperCase();
  const compact = text.toUpperCase().replace(/\s+/g, '');
  if (/^7K-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(compact)) return compact;
  return '';
}

/** 초대 링크는 항상 /hub?lounge=CODE (현재 path에 붙이지 않음) */
export function inviteLink(code) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}/hub?lounge=${encodeURIComponent(code || '')}`;
}

/**
 * `?lounge=` 가 있는데 path가 /hub|/guild 가 아니면 쿼리 유지한 채 /hub 로 이동.
 * @returns {boolean} 리다이렉트했는지
 */
export function redirectInviteToHubIfNeeded() {
  if (typeof window === 'undefined') return false;
  const code = parseInviteCode(window.location.search);
  if (!code) return false;
  try {
    localStorage.setItem(LOUNGE_STORAGE_KEYS.inviteHint, code);
  } catch { /* ignore */ }
  const path = String(window.location.pathname || '/').replace(/\/+$/, '') || '/';
  if (path === '/hub' || path === '/guild') return false;
  const next = `/hub?lounge=${encodeURIComponent(code)}`;
  window.history.replaceState({ page: 'guild_room' }, '', next);
  window.dispatchEvent(new CustomEvent('app:navigate', { detail: { page: 'guild_room' } }));
  return true;
}

export async function copyText(text) {
  const value = String(text || '');
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    window.prompt('아래 내용을 복사하세요', value);
    return false;
  }
}
