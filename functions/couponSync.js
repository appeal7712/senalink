/**
 * 쿠폰 목록 동기화 · 쿠폰 사용 중계 — firebase 의존 없는 순수 로직.
 * 목록 원본: 7katlas.com/coupons.html 의 `const COUPONS = [...]` + 한글 번역 lang/kr/ui.js.
 * 원격 JS는 실행하지 않고 텍스트로만 파싱한다.
 */

const SOURCE_PAGE_URL = 'https://7katlas.com/coupons.html';
const SOURCE_KO_URL = 'https://7katlas.com/lang/kr/ui.js';
const NETMARBLE_COUPON_API = 'https://coupon.netmarble.com/api/coupon';
const NETMARBLE_GAME_CODE = 'tskgb';
const FETCH_TIMEOUT_MS = 10000;

const MAX_COUPONS = 200;
const MAX_REWARDS = 20;
const MAX_TEXT = 200;

const UID_RE = /^[A-Za-z0-9]{4,40}$/;
const CODE_RE = /^[A-Z0-9]{4,32}$/;

async function fetchText(url, init = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

function cleanText(v) {
  return String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
}

/** coupons.html → [{ code, expired, event, rewards: [[name, qty]] }]. 형식이 바뀌면 throw. */
function parseCouponsHtml(html) {
  const start = html.indexOf('const COUPONS');
  if (start < 0) throw new Error('COUPONS not found');
  const open = html.indexOf('[', start);
  const close = html.indexOf('];', open);
  if (open < 0 || close < 0) throw new Error('COUPONS array bounds not found');
  const literal = html.slice(open, close + 1);
  const json = literal.replace(/([{,]\s*)(code|expired|event|rewards)\s*:/g, '$1"$2":');
  const raw = JSON.parse(json);
  if (!Array.isArray(raw)) throw new Error('COUPONS is not an array');

  const seen = new Set();
  const out = [];
  for (const item of raw.slice(0, MAX_COUPONS)) {
    const code = String(item?.code || '').trim().toUpperCase();
    if (!CODE_RE.test(code) || seen.has(code)) continue;
    seen.add(code);
    const rewards = Array.isArray(item.rewards)
      ? item.rewards
        .filter((r) => Array.isArray(r) && r.length >= 1)
        .slice(0, MAX_REWARDS)
        .map((r) => [cleanText(r[0]), cleanText(r[1])])
      : [];
    out.push({
      code,
      expired: item.expired === true,
      event: cleanText(item.event),
      rewards,
    });
  }
  return out;
}

/** lang/kr/ui.js 의 "영문":"한글" 쌍 → Map (실행 없이 정규식 추출). */
function parseKoMap(uiJs) {
  const map = new Map();
  const pair = /"((?:[^"\\]|\\.){1,300})":"((?:[^"\\]|\\.){0,600})"/g;
  let m;
  while ((m = pair.exec(uiJs))) {
    try {
      const k = JSON.parse(`"${m[1]}"`);
      const v = JSON.parse(`"${m[2]}"`);
      if (k && v && !map.has(k)) map.set(k, v);
    } catch {
      /* skip malformed pair */
    }
  }
  return map;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 정확 일치 → `{0}` 템플릿 일치 → 원문 유지. */
function makeTranslator(koMap) {
  const templates = [];
  for (const [k, v] of koMap) {
    if (!k.includes('{0}') || k.length > 120) continue;
    const re = new RegExp(`^${escapeRe(k).replace(/\\\{0\\\}/g, '(.+?)')}$`);
    templates.push([re, v]);
  }
  return (text) => {
    if (!text) return '';
    if (koMap.has(text)) return cleanText(koMap.get(text));
    for (const [re, v] of templates) {
      const hit = text.match(re);
      if (hit) return cleanText(v.replace(/\{0\}/g, hit[1]));
    }
    return text;
  };
}

/** Firestore site/coupons 에 저장할 형태. */
function localizeCoupons(coupons, koMap) {
  const tr = makeTranslator(koMap || new Map());
  return coupons.map((c) => ({
    code: c.code,
    expired: c.expired,
    event: tr(c.event),
    rewards: c.rewards.map(([name, qty]) => ({ name: tr(name), qty })),
  }));
}

async function fetchCouponList() {
  const page = await fetchText(SOURCE_PAGE_URL);
  if (!page.ok) throw new Error(`coupons.html HTTP ${page.status}`);
  const coupons = parseCouponsHtml(page.text);
  if (!coupons.length) throw new Error('COUPONS empty');

  let koMap = new Map();
  try {
    const ko = await fetchText(SOURCE_KO_URL);
    if (ko.ok) koMap = parseKoMap(ko.text);
  } catch {
    /* 번역 실패 시 원문 유지 */
  }
  return localizeCoupons(coupons, koMap);
}

/** 넷마블 errorCode → 사이트 상태 키 */
function mapNetmarbleResult(httpOk, data) {
  const code = Number(data?.errorCode || 0);
  if ((httpOk && data?.success !== false && !code) || code === 200) return 'success';
  switch (code) {
    case 24003:
    case 24004:
      return 'already';
    case 24006:
    case 23001:
    case 23002:
      return 'expired';
    case 24002:
    case 22004:
      return 'invalid_code';
    case 24001:
      return 'rate_limited';
    case 21002:
    case 21003:
    case 22003:
      return 'invalid_uid';
    case 24005:
    case 24007:
    case 24008:
    case 24009:
    case 24010:
    case 24011:
      return 'not_target';
    default:
      return 'error';
  }
}

async function redeemAtNetmarble(uid, code) {
  const res = await fetchText(NETMARBLE_COUPON_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://coupon.netmarble.com',
      Referer: `https://coupon.netmarble.com/${NETMARBLE_GAME_CODE}`,
    },
    body: JSON.stringify({
      gameCode: NETMARBLE_GAME_CODE,
      couponCode: code,
      langCd: 'KO_KR',
      pid: uid,
    }),
  });
  let data = null;
  try {
    data = JSON.parse(res.text);
  } catch {
    return 'error';
  }
  return mapNetmarbleResult(res.ok, data);
}

module.exports = {
  UID_RE,
  CODE_RE,
  parseCouponsHtml,
  parseKoMap,
  localizeCoupons,
  fetchCouponList,
  mapNetmarbleResult,
  redeemAtNetmarble,
};
