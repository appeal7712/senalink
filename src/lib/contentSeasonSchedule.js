import { CONTENT_SEASON_ANCHORS } from '../config/contentSeasonAnchors';

/**
 * 컨텐츠 시즌 상태 계산 (KST).
 * 운영·카피 정본: docs/content-season-schedule.md
 * 앵커: src/config/contentSeasonAnchors.js
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const WEEKDAY = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

/** @returns {{ year, month, day, hour, minute, second, weekday }} weekday: 0=Sun … 6=Sat (KST) */
export function getKstParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  const parts = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = p.value;
  }
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0;
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: weekdayMap[parts.weekday] ?? 0,
  };
}

/** KST 벽시계 → UTC ms (서울 고정 UTC+9) */
export function kstWallToUtcMs(year, month, day, hour = 0, minute = 0, second = 0) {
  return Date.UTC(year, month - 1, day, hour - 9, minute, second);
}

function parseAnchorDate(ymd) {
  const m = String(ymd || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

function addDaysUtcMs(utcMs, days) {
  return utcMs + days * DAY_MS;
}

/** 앵커일 00:00 KST 이후 periodDays 주기에서, now가 속한 사이클 시작(UTC ms) */
function cycleStartMs(anchorYmd, periodDays, nowMs) {
  const a = parseAnchorDate(anchorYmd);
  if (!a) return null;
  const anchorMs = kstWallToUtcMs(a.year, a.month, a.day, 0, 0, 0);
  if (nowMs < anchorMs) return anchorMs;
  const elapsed = nowMs - anchorMs;
  const idx = Math.floor(elapsed / (periodDays * DAY_MS));
  return addDaysUtcMs(anchorMs, idx * periodDays);
}

function clamp01(n) {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function progressBetween(startMs, endMs, nowMs) {
  if (endMs <= startMs) return 0;
  return clamp01((nowMs - startMs) / (endMs - startMs));
}

/** 뒷면용: `2026.09.02 종료` */
function formatEndsAtLabel(endMs) {
  const k = getKstParts(new Date(endMs));
  const mm = String(k.month).padStart(2, '0');
  const dd = String(k.day).padStart(2, '0');
  return `${k.year}.${mm}.${dd} 종료`;
}

function baseItem(partial) {
  return {
    detail: '',
    dday: '',
    statusBracket: '',
    round: null,
    endsAtMs: null,
    endsAtLabel: '',
    frontStatus: '시즌 준비',
    ...partial,
  };
}

/** 총력전 — 시즌 중 데일리 슬롯 → 앞면 멘트 */
function totalWarFrontStatus(kst) {
  const { hour } = kst;
  // 세팅·공백 → 라운드 준비
  if ((hour >= 9 && hour < 17) || hour >= 21 || hour < 5) return '라운드 준비';
  // 전투
  if ((hour >= 17 && hour < 20) || (hour >= 5 && hour < 8)) return '전투 진행';
  // 결산 20~21, 08~09
  if ((hour >= 20 && hour < 21) || (hour >= 8 && hour < 9)) return '라운드 결산';
  return '라운드 준비';
}

/**
 * 총력전
 * 오픈 목 → R1 금 14:00 → 마감 다다음주 화 09:00
 * 테두리 스핀(burning) = 「전투 진행」일 때만. 그 외·시즌 휴식 = 회색 고정
 */
function evalTotalWar(nowMs, anchorYmd) {
  const start = cycleStartMs(anchorYmd, 14, nowMs);
  if (start == null) return null;

  const fri14 = start + DAY_MS + 14 * HOUR_MS;
  const tue09 = start + 12 * DAY_MS + 9 * HOUR_MS;
  const kst = getKstParts(new Date(nowMs));
  const id = 'totalwar';
  const name = '총력전';
  const inSeason = nowMs >= start && nowMs < tue09;

  if (!inSeason) {
    return baseItem({
      id, name, icon: 'totalwar', burning: false,
      frontStatus: '시즌 준비',
      endsAtMs: tue09,
      endsAtLabel: formatEndsAtLabel(tue09),
      progress: nowMs >= tue09 ? 1 : 0,
      status: '시즌 준비',
    });
  }

  if (nowMs < fri14) {
    return baseItem({
      id, name, icon: 'totalwar', burning: false,
      frontStatus: '시즌 준비',
      endsAtMs: tue09,
      endsAtLabel: formatEndsAtLabel(tue09),
      progress: progressBetween(start, tue09, nowMs),
      status: '시즌 준비',
    });
  }

  const round = Math.min(22, Math.max(1, Math.floor((nowMs - fri14) / DAY_MS) + 1));
  const frontStatus = totalWarFrontStatus(kst);
  return baseItem({
    id, name, icon: 'totalwar',
    burning: frontStatus === '전투 진행',
    frontStatus,
    detail: `R${round}/22`,
    round,
    endsAtMs: tue09,
    endsAtLabel: formatEndsAtLabel(tue09),
    progress: progressBetween(fri14, tue09, nowMs),
    status: frontStatus,
  });
}

/** 상급 결투장 — 2주, 마감 목 02:00 / 앞면: 시즌 진행 중 */
function evalAdvancedArena(nowMs, anchorYmd) {
  const start = cycleStartMs(anchorYmd, 14, nowMs);
  if (start == null) return null;

  // 시작 목 00:00 → +14일 목 02:00 마감 (수→목 새벽 2시)
  // 예: 2026-08-20 → 2026-09-03 02:00
  const endMs = addDaysUtcMs(start, 14) + 2 * HOUR_MS;
  const id = 'advanced_arena';
  const name = '상급결투장';

  if (nowMs < endMs) {
    // 사이클이 목 00:00에 넘어가면 endMs가 다음 주기로 밀릴 수 있음 —
    // 마감 직전 2시간은 이전 시즌으로 보이게 start-14d 보정
    let seasonStart = start;
    let seasonEnd = endMs;
    if (nowMs < start + 2 * HOUR_MS) {
      const prevStart = addDaysUtcMs(start, -14);
      const prevEnd = start + 2 * HOUR_MS;
      if (nowMs < prevEnd) {
        seasonStart = prevStart;
        seasonEnd = prevEnd;
      }
    }
    const live = nowMs >= seasonStart && nowMs < seasonEnd;
    if (live) {
      return baseItem({
        id, name, icon: 'swords', burning: true,
        frontStatus: '시즌 진행 중',
        endsAtMs: seasonEnd,
        endsAtLabel: formatEndsAtLabel(seasonEnd),
        progress: progressBetween(seasonStart, seasonEnd, nowMs),
        status: '시즌 진행 중',
      });
    }
  }

  return baseItem({
    id, name, icon: 'swords', burning: false,
    frontStatus: '시즌 준비',
    endsAtMs: endMs,
    endsAtLabel: formatEndsAtLabel(endMs),
    progress: nowMs >= endMs ? 1 : 0,
    status: '시즌 준비',
  });
}

/**
 * 길드전 앞면 페이즈
 * 판정 순서 중요 — docs/content-season-schedule.md §2
 * 1) 일·화·목 00~02 → 전날 본게임 연장 →「길드전 진행 중」
 * 2) 목 02~08 →「정산」(수 전투 직후)
 * 3) 목 08:00 ~ 금 08:00 →「휴전일」(24시간)
 * 4) 금 09~: 설정 → 배치 → (토) 매칭 → 전투 …
 * 5) 토·월·수: 배치(~08) / 상대 길드 매칭(08~09) / 진행 중(09~익일02)
 * 6) 일·화: 정산(02~09) / 설정(09~20) / 배치(20~)
 * @returns {string|null} null → 시즌 준비 (시즌 사이 1주 쉼 등)
 */
function guildWarFrontStatus(kst) {
  const { weekday: wd, hour } = kst;

  // 본게임 연장: 일·화 00~02, 목 00~02(수 경기 연장)
  if (hour < 2 && (wd === WEEKDAY.sun || wd === WEEKDAY.tue || wd === WEEKDAY.thu)) {
    return '길드전 진행 중';
  }

  // 수 전투 직후: 목 02:00 ~ 08:00 정산
  if (wd === WEEKDAY.thu && hour < 8) return '정산';

  // 휴전일: 목 08:00 ~ 금 08:00 (24시간)
  if (wd === WEEKDAY.thu) return '휴전일';
  if (wd === WEEKDAY.fri && hour < 8) return '휴전일';

  // 경기일 월·수·토
  if (wd === WEEKDAY.sat || wd === WEEKDAY.mon || wd === WEEKDAY.wed) {
    if (hour < 8) return '방어덱 배치';
    if (hour < 9) return '상대 길드 매칭';
    return '길드전 진행 중';
  }

  // 방어일 일·화 (토·월 전투 다음날)
  if (wd === WEEKDAY.sun || wd === WEEKDAY.tue) {
    if (hour < 9) return '정산';
    if (hour < 20) return '방어덱 설정';
    return '방어덱 배치';
  }

  // 금요일: 08~09는 휴전 종료~방어 설정 직전(1시간).
  // 금 09시부터 방어덱 설정 → 배치 → (토) 매칭 → 길드전 진행
  if (wd === WEEKDAY.fri) {
    if (hour < 9) return '휴전일'; // 금 08~09: 멘트 공백 방지(본 휴전은 ~금 08:00)
    if (hour < 20) return '방어덱 설정';
    return '방어덱 배치';
  }

  return null;
}

function evalGuildWar(nowMs, anchorYmd) {
  // 49일 = 6주 시즌 + 1주 휴식 후 다음 목 개막
  const cycleStart = cycleStartMs(anchorYmd, 49, nowMs);
  if (cycleStart == null) return null;

  const seasonEndMs = addDaysUtcMs(cycleStart, 42);
  const kst = getKstParts(new Date(nowMs));
  const id = 'guildwar';
  const name = '길드전';
  const inSeason = nowMs < seasonEndMs;
  const round = inSeason ? countGuildWarRound(cycleStart, nowMs) : 0;
  const progress = inSeason
    ? progressBetween(cycleStart, seasonEndMs, nowMs)
    : 1;
  const front = inSeason ? guildWarFrontStatus(kst) : null;
  const frontStatus = front || '시즌 준비';
  // 테두리 스핀 = 본게임(길드전 진행 중)일 때만
  const burning = frontStatus === '길드전 진행 중';

  return baseItem({
    id, name, icon: 'guildwar', burning,
    frontStatus,
    detail: round > 0 ? `R${round}/18` : '',
    round: round || null,
    endsAtMs: seasonEndMs,
    endsAtLabel: formatEndsAtLabel(seasonEndMs),
    progress,
    status: frontStatus,
  });
}

/** 시즌 시작 목 이후, 토·월·수 08:00이 지난 횟수 = 라운드 (1~18) */
function countGuildWarRound(seasonStartMs, nowMs) {
  let round = 0;
  for (let d = 0; d < 42; d += 1) {
    const dayMs = addDaysUtcMs(seasonStartMs, d);
    const parts = getKstParts(new Date(dayMs + 12 * HOUR_MS));
    const isMatch = parts.weekday === WEEKDAY.sat
      || parts.weekday === WEEKDAY.mon
      || parts.weekday === WEEKDAY.wed;
    if (!isMatch) continue;
    const matchOpen = kstWallToUtcMs(parts.year, parts.month, parts.day, 8, 0, 0);
    if (nowMs >= matchOpen) round += 1;
    else break;
  }
  return Math.min(18, Math.max(0, round));
}

/**
 * 강림 원정대 — 월 09:00 재시작 ~ 다음 월 02:00 마감
 * 앞면: 시즌 진행 중
 */
function evalExpedition(nowMs, anchorYmd) {
  const start00 = cycleStartMs(anchorYmd, 14, nowMs);
  if (start00 == null) return null;

  const openMs = start00 + 9 * HOUR_MS;
  const endMs = addDaysUtcMs(start00, 14) + 2 * HOUR_MS;
  const id = 'expedition';
  const name = '강림원정대';

  if (nowMs < openMs) {
    return baseItem({
      id, name, icon: 'orb', burning: false,
      frontStatus: '시즌 준비',
      endsAtMs: endMs,
      endsAtLabel: formatEndsAtLabel(endMs),
      progress: 0,
      status: '시즌 준비',
    });
  }
  if (nowMs < endMs) {
    return baseItem({
      id, name, icon: 'orb', burning: true,
      frontStatus: '시즌 진행 중',
      endsAtMs: endMs,
      endsAtLabel: formatEndsAtLabel(endMs),
      progress: progressBetween(openMs, endMs, nowMs),
      status: '시즌 진행 중',
    });
  }
  return baseItem({
    id, name, icon: 'orb', burning: false,
    frontStatus: '시즌 준비',
    endsAtMs: endMs,
    endsAtLabel: formatEndsAtLabel(endMs),
    progress: 1,
    status: '시즌 준비',
  });
}

/**
 * @returns {Array<{
 *   id, name, burning, frontStatus, endsAtLabel, endsAtMs, progress, detail, status
 * }>}
 */
export function getContentSeasonStatuses(date = new Date(), anchors = CONTENT_SEASON_ANCHORS) {
  const nowMs = date.getTime();
  return [
    evalGuildWar(nowMs, anchors.guildWarThursday),
    evalAdvancedArena(nowMs, anchors.advancedArenaThursday),
    evalTotalWar(nowMs, anchors.totalWarThursday),
    evalExpedition(nowMs, anchors.expeditionMonday),
  ].filter(Boolean);
}
