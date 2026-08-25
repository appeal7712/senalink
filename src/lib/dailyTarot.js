import { kstDateString } from './profileRecommend';

export const DAILY_TAROT_URL = 'https://skre-shop.netmarble.com/ko/event/daily_gift';
const LOCAL_KEY = 'senalink_daily_tarot_period';

/** KST 시·분 */
function kstHourMinute(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
  return { hour: get('hour'), minute: get('minute') };
}

/**
 * 일일 타로 주기 ID (KST).
 * 매일 09:00에 리셋 → 09:00 미만이면 전날 날짜를 주기로 씀.
 * @returns {string} YYYY-MM-DD
 */
export function getDailyTarotPeriodId(date = new Date()) {
  const { hour } = kstHourMinute(date);
  const today = kstDateString(date);
  if (hour >= 9) return today;

  // 전날 (KST 달력) — 오늘 정오 KST 기준 -24h
  const [y, m, d] = today.split('-').map(Number);
  const noonUtcMs = Date.UTC(y, m - 1, d, 3, 0, 0); // 12:00 KST = 03:00 UTC
  return kstDateString(new Date(noonUtcMs - 24 * 60 * 60 * 1000));
}

export function isDailyTarotClaimed(storedPeriodId, now = new Date()) {
  if (!storedPeriodId) return false;
  return String(storedPeriodId) === getDailyTarotPeriodId(now);
}

export function readLocalDailyTarotPeriod() {
  try {
    return localStorage.getItem(LOCAL_KEY) || '';
  } catch {
    return '';
  }
}

export function writeLocalDailyTarotPeriod(periodId) {
  try {
    localStorage.setItem(LOCAL_KEY, periodId);
  } catch {
    /* ignore */
  }
}
