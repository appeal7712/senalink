import { listAllHubs, listHubMembers } from './hubOversee';
import { listUsersForOps } from './userOversee';
import { HUB_IDLE_DAYS } from '../data/loungeMeta';

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const MEMBER_FETCH_CONCURRENCY = 8;

/** ISO 문자열 · Firestore Timestamp · Date → ms (없으면 0) */
export function toMs(v) {
  if (!v) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v?.toMillis === 'function') return v.toMillis();
  if (v instanceof Date) return v.getTime();
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? t : 0;
}

export function kstDayKey(ms) {
  return new Date(ms + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export function hubActivityMs(hub) {
  return toMs(hub?.lastActivityAt) || toMs(hub?.updatedAt) || toMs(hub?.createdAt);
}

export function idleDays(ms, now = Date.now()) {
  if (!ms) return null;
  return Math.max(0, Math.floor((now - ms) / DAY_MS));
}

export function formatDate(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' });
}

export function formatRelative(ms, now = Date.now()) {
  if (!ms) return '—';
  const diff = Math.max(0, now - ms);
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}일 전`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon}개월 전`;
  return `${Math.floor(mon / 12)}년 전`;
}

/** 자동 정리(유휴 삭제)까지 남은 일수. 활동 기록이 없으면 null. */
export function daysUntilPurge(hub, now = Date.now()) {
  const d = idleDays(hubActivityMs(hub), now);
  if (d == null) return null;
  return HUB_IDLE_DAYS - d;
}

async function mapWithConcurrency(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next;
      next += 1;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

/** 슈퍼관리자 ops 전용 — 허브 · 허브별 멤버 · 유저 전체를 한 번에 읽는다 (읽기만). */
export async function loadOpsSnapshot() {
  const [hubList, users] = await Promise.all([listAllHubs(), listUsersForOps()]);

  const memberLists = await mapWithConcurrency(hubList, MEMBER_FETCH_CONCURRENCY, async (hub) => {
    try {
      return { ok: true, list: await listHubMembers(hub.id) };
    } catch {
      return { ok: false, list: [] };
    }
  });

  const membersByHub = {};
  const failedHubIds = [];
  const hubs = hubList.map((hub, i) => {
    const { ok, list } = memberLists[i];
    membersByHub[hub.id] = list;
    if (!ok) failedHubIds.push(hub.id);
    const master = list.find((m) => m.role === 'master')
      || list.find((m) => m.uid === hub.masterId || m.id === hub.masterId);
    return {
      ...hub,
      memberCount: list.length,
      adminCount: list.filter((m) => m.role === 'admin').length,
      masterNickname: master?.nickname || '',
      createdMs: toMs(hub.createdAt),
      activityMs: hubActivityMs(hub),
    };
  });

  return {
    hubs,
    membersByHub,
    users,
    failedHubIds,
    loadedAt: Date.now(),
  };
}

/**
 * 최근 days일 KST 일별 카운트. msList 각 값이 하루 버킷에 +1.
 * 반환: [{ key: 'YYYY-MM-DD', label: 'M/D', count }]
 */
export function buildDailySeries(msList, days, now = Date.now()) {
  const todayKey = kstDayKey(now);
  const todayStartMs = Date.parse(`${todayKey}T00:00:00+09:00`);
  const series = [];
  const index = {};
  for (let i = days - 1; i >= 0; i -= 1) {
    const ms = todayStartMs - i * DAY_MS;
    const key = kstDayKey(ms);
    const [, m, d] = key.split('-');
    index[key] = series.length;
    series.push({ key, label: `${Number(m)}/${Number(d)}`, count: 0 });
  }
  for (const ms of msList) {
    if (!ms) continue;
    const idx = index[kstDayKey(ms)];
    if (idx != null) series[idx].count += 1;
  }
  return series;
}

/** { 'YYYY-MM-DD': count } → 최근 days일 시리즈 (없는 날은 0) */
export function buildDailySeriesFromMap(countByDay, days, now = Date.now()) {
  return buildDailySeries([], days, now).map((s) => ({
    ...s,
    count: Number(countByDay?.[s.key]) || 0,
  }));
}
