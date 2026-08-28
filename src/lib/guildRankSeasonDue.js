import { CONTENT_SEASON_ANCHORS } from '../config/contentSeasonAnchors';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function parseAnchorDate(ymd) {
  const m = String(ymd || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

function kstWallToUtcMs(year, month, day, hour = 0, minute = 0, second = 0) {
  return Date.UTC(year, month - 1, day, hour - 9, minute, second);
}

function anchorMs(anchorYmd) {
  const a = parseAnchorDate(anchorYmd);
  if (!a) return null;
  return kstWallToUtcMs(a.year, a.month, a.day, 0, 0, 0);
}

/** 앵커일 00:00 KST 이후 periodDays 주기에서, now가 속한 사이클 시작(UTC ms) */
function cycleStartMs(anchorYmd, periodDays, nowMs) {
  const start = anchorMs(anchorYmd);
  if (start == null) return null;
  if (nowMs < start) return start;
  const elapsed = nowMs - start;
  const idx = Math.floor(elapsed / (periodDays * DAY_MS));
  return start + idx * periodDays * DAY_MS;
}

function rankUpdatedSince(updatedAtIso, seasonEndMs) {
  if (!seasonEndMs) return true;
  if (!updatedAtIso) return false;
  const ts = new Date(updatedAtIso).getTime();
  if (!Number.isFinite(ts)) return false;
  return ts >= seasonEndMs;
}

function hubGuildwarUpdatedAt(hub) {
  return hub?.guildwarRankUpdatedAt || hub?.ranksUpdatedAt || null;
}

function hubExpeditionUpdatedAt(hub) {
  return hub?.expeditionRankUpdatedAt || hub?.ranksUpdatedAt || null;
}

/**
 * 가장 최근으로 끝난 길드전 시즌 종료 시각 (KST 달력 + contentSeasonSchedule 와 동일 42일).
 * 시즌 진행 중이면 직전 시즌 종료, 휴식·다음 시즌 중이면 방금 끝난 시즌 종료.
 */
export function getLastCompletedGuildWarSeasonEndMs(date = new Date(), anchors = CONTENT_SEASON_ANCHORS) {
  const nowMs = date.getTime();
  const start = anchorMs(anchors.guildWarThursday);
  if (start == null || nowMs < start) return null;

  const periodMs = 49 * DAY_MS;
  const seasonLenMs = 42 * DAY_MS;
  const elapsed = nowMs - start;
  const cycleIdx = Math.floor(elapsed / periodMs);
  const cycleStart = start + cycleIdx * periodMs;
  const seasonEnd = cycleStart + seasonLenMs;

  if (nowMs >= seasonEnd) return seasonEnd;
  if (cycleIdx === 0) return null;
  return start + (cycleIdx - 1) * periodMs + seasonLenMs;
}

/**
 * 가장 최근으로 끝난 강림원정대 시즌 종료 시각 (월 02:00 KST, 14일 주기).
 */
export function getLastCompletedExpeditionSeasonEndMs(date = new Date(), anchors = CONTENT_SEASON_ANCHORS) {
  const nowMs = date.getTime();
  const anchor = anchorMs(anchors.expeditionMonday);
  if (anchor == null || nowMs < anchor) return null;

  const periodMs = 14 * DAY_MS;
  let cycleStart = anchor;
  let lastEnd = null;

  while (cycleStart <= nowMs + periodMs) {
    const openMs = cycleStart + 9 * HOUR_MS;
    const endMs = cycleStart + periodMs + 2 * HOUR_MS;

    if (nowMs >= endMs) {
      lastEnd = endMs;
    } else if (nowMs >= openMs) {
      break;
    } else {
      break;
    }
    cycleStart += periodMs;
  }

  return lastEnd;
}

/** 시즌 종료 이후 순위를 아직 갱신하지 않았으면 true (갱신할 때까지 유지) */
export function getGuildWarRankDueState(hub, date = new Date(), anchors = CONTENT_SEASON_ANCHORS) {
  const seasonEndMs = getLastCompletedGuildWarSeasonEndMs(date, anchors);
  if (!seasonEndMs) return { due: false, seasonEndMs: null };
  const updatedAt = hubGuildwarUpdatedAt(hub);
  return {
    due: !rankUpdatedSince(updatedAt, seasonEndMs),
    seasonEndMs,
  };
}

export function getExpeditionRankDueState(hub, date = new Date(), anchors = CONTENT_SEASON_ANCHORS) {
  const seasonEndMs = getLastCompletedExpeditionSeasonEndMs(date, anchors);
  if (!seasonEndMs) return { due: false, seasonEndMs: null };
  const updatedAt = hubExpeditionUpdatedAt(hub);
  return {
    due: !rankUpdatedSince(updatedAt, seasonEndMs),
    seasonEndMs,
  };
}

export function getGuildRankDueFlags(hub, date = new Date(), anchors = CONTENT_SEASON_ANCHORS) {
  const guildwar = getGuildWarRankDueState(hub, date, anchors);
  const expedition = getExpeditionRankDueState(hub, date, anchors);
  return {
    guildwar: guildwar.due,
    expedition: expedition.due,
    guildwarSeasonEndMs: guildwar.seasonEndMs,
    expeditionSeasonEndMs: expedition.seasonEndMs,
  };
}
