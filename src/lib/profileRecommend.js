import { doc, getDoc, increment, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { COL, profileDailyRecommendDocId } from '../config/firestorePaths';

/** Asia/Seoul 기준 YYYY-MM-DD (자정 리셋) */
export function kstDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** 이 대상에게 오늘(KST) 이미 추천했는지 */
export async function hasRecommendedTargetToday(fromUid, toUid) {
  if (!fromUid || !toUid) return false;
  const snap = await getDoc(
    doc(db, COL.PROFILE_DAILY_RECOMMENDS, profileDailyRecommendDocId(fromUid, toUid, kstDateString())),
  );
  return snap.exists();
}

/**
 * 추천자×대상 기준 KST 하루 1회 (다른 사람은 같은 날 추가 추천 가능).
 * profileDailyRecommends/{from_to_date} create + 대상 recommendCount +1.
 */
export async function recommendProfile({ fromUid, toUid }) {
  if (!fromUid || !toUid) throw new Error('추천할 수 없습니다.');
  if (fromUid === toUid) throw new Error('본인 프로필에는 추천할 수 없습니다.');

  const today = kstDateString();
  const fromRef = doc(db, COL.USERS, fromUid);
  const toRef = doc(db, COL.USERS, toUid);
  const claimRef = doc(db, COL.PROFILE_DAILY_RECOMMENDS, profileDailyRecommendDocId(fromUid, toUid, today));

  await runTransaction(db, async (tx) => {
    const claimSnap = await tx.get(claimRef);
    const fromSnap = await tx.get(fromRef);
    const toSnap = await tx.get(toRef);

    if (!toSnap.exists()) throw new Error('프로필이 아직 없습니다.');
    if (claimSnap.exists()) {
      throw new Error('오늘은 이미 이 유저를 추천했습니다. 내일 다시 눌러 주세요.');
    }

    tx.set(claimRef, {
      day: today,
      toUid,
      createdAt: new Date().toISOString(),
    });

    // 마지막 추천일(참고용). 하루 전체 1회 게이트로는 쓰지 않음.
    if (fromSnap.exists()) {
      tx.update(fromRef, { lastProfileRecommendDate: today });
    } else {
      tx.set(fromRef, { lastProfileRecommendDate: today, recommendCount: 0 }, { merge: true });
    }
    tx.update(toRef, { recommendCount: increment(1) });
  });
}
