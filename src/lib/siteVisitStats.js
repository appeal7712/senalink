import { doc, getDoc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { kstDateString } from './profileRecommend';

const STATS_PATH = ['site', 'stats'];
const STORAGE_KEY = 'senalink_site_visit_day';

export function siteVisitStatsRef() {
  return doc(db, ...STATS_PATH);
}

export function subscribeSiteVisitStats(onData, onError) {
  return onSnapshot(
    siteVisitStatsRef(),
    (snap) => {
      if (!snap.exists()) {
        onData({ total: 0, dayCount: 0, day: kstDateString() });
        return;
      }
      const d = snap.data() || {};
      const today = kstDateString();
      const day = String(d.day || '');
      onData({
        total: Number(d.total) || 0,
        dayCount: day === today ? (Number(d.dayCount) || 0) : 0,
        day: day || today,
      });
    },
    (err) => onError?.(err),
  );
}

/** 브라우저당 KST 하루 1회만 total/dayCount +1 */
export async function recordSiteVisitOnce() {
  const today = kstDateString();
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === today) {
      return { skipped: true };
    }
  } catch {
    /* private mode */
  }

  const ref = siteVisitStatsRef();
  const updatedAt = new Date().toISOString();

  try {
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
  } catch (err) {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      try {
        await setDoc(ref, { total: 1, day: today, dayCount: 1, updatedAt });
      } catch {
        throw err;
      }
    } else {
      throw err;
    }
  }

  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, today);
  } catch {
    /* ignore */
  }
  return { skipped: false };
}
