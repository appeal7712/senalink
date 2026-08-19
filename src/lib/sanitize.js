const HTML_ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => HTML_ESCAPE[c]);
}

export function sanitizeText(str, maxLen = 2000) {
  return String(str || '').trim().slice(0, maxLen);
}

export function sanitizeNickname(str) {
  return String(str || '').trim().replace(/[<>"'&\\]/g, '').slice(0, 12);
}
