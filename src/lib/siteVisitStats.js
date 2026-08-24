import {
  collection, doc, onSnapshot, runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import { kstDateString } from './profileRecommend';

/** 레거시 합산 문서 — 신규 쓰기는 중단. 표시 시 샤드 합에 더함(기존 total 보존). */
const STATS_PATH = ['site', 'stats'];
/** 분산 카운터 (Firestore distributed counter). 샤드당 ~1 write/s → 32면 스파이크에 충분. */
const SHARDS_COL = [...STATS_PATH, 'visitShards'];
const SHARD_COUNT = 32;
const STORAGE_KEY = 'senalink_site_visit_day';
const TX_MAX_ATTEMPTS = 4;

export function siteVisitStatsRef() {
  return doc(db, ...STATS_PATH);
}

export function siteVisitShardRef(shardId) {
  return doc(db, ...SHARDS_COL, String(shardId));
}

function pickShardId(attempt = 0) {
  const base = Math.floor(Math.random() * SHARD_COUNT);
  return String((base + attempt * 7) % SHARD_COUNT);
}

function aggregateVisitStats(legacyData, shardDocs, today = kstDateString()) {
  let total = Number(legacyData?.total) || 0;
  let dayCount = String(legacyData?.day || '') === today
    ? (Number(legacyData?.dayCount) || 0)
    : 0;

  for (const d of shardDocs) {
    total += Number(d?.total) || 0;
    if (String(d?.day || '') === today) {
      dayCount += Number(d?.dayCount) || 0;
    }
  }

  return { total, dayCount, day: today };
}

/**
 * 레거시 site/stats + visitShards/* 합산 구독.
 * 구 클라이언트가 레거시에 +1 해도 이중 집계 없이 합쳐 표시된다.
 */
export function subscribeSiteVisitStats(onData, onError) {
  let legacyData = null;
  let shardDocs = [];
  let legacyReady = false;
  let shardsReady = false;

  const emit = () => {
    if (!legacyReady || !shardsReady) return;
    onData(aggregateVisitStats(legacyData, shardDocs));
  };

  const unsubLegacy = onSnapshot(
    siteVisitStatsRef(),
    (snap) => {
      legacyData = snap.exists() ? (snap.data() || {}) : null;
      legacyReady = true;
      emit();
    },
    (err) => onError?.(err),
  );

  const unsubShards = onSnapshot(
    collection(db, ...SHARDS_COL),
    (snap) => {
      shardDocs = snap.docs.map((d) => d.data() || {});
      shardsReady = true;
      emit();
    },
    (err) => onError?.(err),
  );

  return () => {
    unsubLegacy();
    unsubShards();
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableVisitError(err) {
  const code = String(err?.code || '');
  const msg = String(err?.message || '');
  return code === 'failed-precondition'
    || code === 'aborted'
    || code === 'resource-exhausted'
    || /aborted|contention|too much contention/i.test(msg);
}

async function incrementShard(shardId, today, updatedAt) {
  const ref = siteVisitShardRef(shardId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      tx.set(ref, { total: 1, day: today, dayCount: 1, updatedAt });
      return;
    }
    const d = snap.data() || {};
    const prevDay = String(d.day || '');
    const total = (Number(d.total) || 0) + 1;
    const dayCount = prevDay === today ? (Number(d.dayCount) || 0) + 1 : 1;
    tx.update(ref, { total, day: today, dayCount, updatedAt });
  });
}

/** 브라우저당 KST 하루 1회. 랜덤 샤드에 +1 (충돌 시 다른 샤드로 재시도). */
export async function recordSiteVisitOnce() {
  const today = kstDateString();
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === today) {
      return { skipped: true };
    }
  } catch {
    /* private mode */
  }

  const updatedAt = new Date().toISOString();
  let lastErr = null;

  for (let attempt = 0; attempt < TX_MAX_ATTEMPTS; attempt += 1) {
    const shardId = pickShardId(attempt);
    try {
      await incrementShard(shardId, today, updatedAt);
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
      if (!isRetryableVisitError(err) || attempt === TX_MAX_ATTEMPTS - 1) break;
      await sleep(20 * (attempt + 1) * (attempt + 1));
    }
  }

  if (lastErr) throw lastErr;

  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, today);
  } catch {
    /* ignore */
  }
  return { skipped: false };
}
