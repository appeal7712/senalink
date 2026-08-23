import { doc, increment, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { COL, profileDailyRecommendDocId } from '../config/firestorePaths';

/** Asia/Seoul 기준 YYYY-MM-DD */
export function kstDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function canRecommendToday(lastProfileRecommendDate) {
  if (!lastProfileRecommendDate) return true;
  return String(lastProfileRecommendDate) !== kstDateString();
}

/**
 * 추천자 기준 KST 하루 1회.
 * profileDailyRecommends/{uid_date} create + 대상 recommendCount +1 + 본인 날짜 기록.
 */
export async function recommendProfile({ fromUid, toUid }) {
  if (!fromUid || !toUid) throw new Error('추천할 수 없습니다.');
  if (fromUid === toUid) throw new Error('본인 프로필에는 추천할 수 없습니다.');

  const today = kstDateString();
  const fromRef = doc(db, COL.USERS, fromUid);
  const toRef = doc(db, COL.USERS, toUid);
  const claimRef = doc(db, COL.PROFILE_DAILY_RECOMMENDS, profileDailyRecommendDocId(fromUid, today));

  await runTransaction(db, async (tx) => {
    const claimSnap = await tx.get(claimRef);
    const fromSnap = await tx.get(fromRef);
    const toSnap = await tx.get(toRef);

    if (!toSnap.exists()) throw new Error('프로필이 아직 없습니다.');
    if (claimSnap.exists()) {
      throw new Error('오늘은 이미 추천했습니다. 내일 다시 눌러 주세요.');
    }

    const last = fromSnap.exists() ? fromSnap.data()?.lastProfileRecommendDate : null;
    if (!canRecommendToday(last)) {
      throw new Error('오늘은 이미 추천했습니다. 내일 다시 눌러 주세요.');
    }

    tx.set(claimRef, {
      day: today,
      toUid,
      createdAt: new Date().toISOString(),
    });

    if (fromSnap.exists()) {
      tx.update(fromRef, { lastProfileRecommendDate: today });
    } else {
      tx.set(fromRef, { lastProfileRecommendDate: today, recommendCount: 0 }, { merge: true });
    }
    tx.update(toRef, { recommendCount: increment(1) });
  });
}
