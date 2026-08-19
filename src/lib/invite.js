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

export function inviteLink(code) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const path = typeof window === 'undefined' ? '/' : window.location.pathname;
  return `${origin}${path}?lounge=${encodeURIComponent(code || '')}`;
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
