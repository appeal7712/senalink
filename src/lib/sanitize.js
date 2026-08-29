export function sanitizeText(str, maxLen = 2000) {
  return String(str || '').trim().slice(0, maxLen);
}
