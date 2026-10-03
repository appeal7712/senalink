import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { DEFAULT_COUPONS } from '../data/coupons.defaults';

/**
 * 쿠폰 사용 — 목록은 site/coupons(매일 00시 Functions syncCoupons), 사용은 Callable redeemCoupon.
 * UID·수령 기록은 이 브라우저 localStorage에만 (UID별). 서버·계정에는 저장하지 않는다.
 */

const LS_UID = 'senalink_coupon_uid_v1';
const LS_REMEMBER = 'senalink_coupon_remember_v1';
const LS_HISTORY = 'senalink_coupon_history_v1';

export const COUPON_GAP_MS = 700;
export const NETMARBLE_COUPON_PAGE = 'https://coupon.netmarble.com/tskgb';

/** 다시 시도할 필요가 없는 상태 */
export const FINAL_STATUSES = new Set(['success', 'already', 'expired', 'not_target']);

export const STATUS_LABEL = {
  success: '사용 완료',
  already: '이미 수령함',
  expired: '기간 만료',
  invalid_code: '잘못된 코드',
  invalid_uid: 'UID를 찾을 수 없음',
  rate_limited: '1시간 제한',
  not_target: '사용 대상 아님',
  error: '실패 · 다시 시도',
  loading: '사용 중…',
};

export function isValidCouponUid(uid) {
  return /^[A-Za-z0-9]{4,40}$/.test(uid);
}

export function parseCouponCodes(text) {
  const seen = new Set();
  return String(text || '')
    .split(/[\s,]+/)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s && /^[A-Z0-9]{4,32}$/.test(s) && !seen.has(s) && seen.add(s));
}

function normalizeCoupons(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((c) => c && typeof c.code === 'string')
    .map((c) => ({
      code: c.code,
      expired: c.expired === true,
      event: typeof c.event === 'string' ? c.event : '',
      rewards: Array.isArray(c.rewards)
        ? c.rewards.map((r) => ({ name: String(r?.name || ''), qty: String(r?.qty || '') }))
        : [],
    }));
}

let couponsPromise = null;

async function fetchCoupons() {
  try {
    const snap = await getDoc(doc(db, 'site', 'coupons'));
    const list = snap.exists() ? normalizeCoupons(snap.data()?.coupons) : [];
    if (list.length) return list;
  } catch {
    /* 오프라인·에뮬레이터 미기동 → 기본 목록 */
  }
  return normalizeCoupons(DEFAULT_COUPONS);
}

/** site/coupons 읽기 — 페이지당 1회(GNB 버튼·모달 공유). 없거나 실패하면 번들 기본 목록. */
export function loadCoupons() {
  if (!couponsPromise) couponsPromise = fetchCoupons();
  return couponsPromise;
}

/** 이 기기에 저장된 UID 기준 아직 안 쓴 사용 가능 쿠폰 수 (UID 미저장이면 사용 가능 쿠폰 전체). */
export function countPendingCoupons(list) {
  const uid = readRemember() ? readSavedUid().trim() : '';
  const done = (uid && readHistory()[uid]) || {};
  return list.filter((c) => !c.expired && !FINAL_STATUSES.has(done[c.code]?.s)).length;
}

export async function redeemCouponCode(uid, code) {
  try {
    const res = await httpsCallable(functions, 'redeemCoupon')({ uid, code });
    return res?.data?.status || 'error';
  } catch {
    return 'error';
  }
}

function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장 불가(사파리 프라이빗 등) */
  }
}

function lsDel(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function readRemember() {
  return lsGet(LS_REMEMBER, true) !== false;
}

export function writeRemember(on) {
  lsSet(LS_REMEMBER, !!on);
}

export function readSavedUid() {
  const v = lsGet(LS_UID, '');
  return typeof v === 'string' ? v : '';
}

export function writeSavedUid(uid) {
  if (uid) lsSet(LS_UID, uid);
  else lsDel(LS_UID);
}

/** { [uid]: { [code]: { s, t } } } */
export function readHistory() {
  const v = lsGet(LS_HISTORY, {});
  return v && typeof v === 'object' ? v : {};
}

export function writeHistoryEntry(uid, code, status) {
  const all = readHistory();
  const forUid = all[uid] && typeof all[uid] === 'object' ? all[uid] : {};
  forUid[code] = { s: status, t: Date.now() };
  all[uid] = forUid;
  lsSet(LS_HISTORY, all);
}

export function clearHistoryFor(uid) {
  const all = readHistory();
  delete all[uid];
  lsSet(LS_HISTORY, all);
}

export function clearAllCouponStorage() {
  lsDel(LS_UID);
  lsDel(LS_HISTORY);
}
