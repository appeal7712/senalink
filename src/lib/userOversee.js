import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { COL } from '../config/firestorePaths';

/** 슈퍼관리자 ops용 — users 전체 목록 (규칙: isSuperAdmin list) */
export async function listUsersForOps() {
  const snap = await getDocs(collection(db, COL.USERS));
  const list = snap.docs.map((d) => {
    const data = d.data() || {};
    return {
      id: d.id,
      nickname: String(data.nickname || '').trim(),
      hubId: data.hubId || null,
      photoURL: data.photoURL || null,
      recommendCount: Number(data.recommendCount) || 0,
      updatedAt: data.updatedAt || '',
      totalwarTier: data.totalwarTier || '',
      arenaTier: data.arenaTier || '',
    };
  });
  list.sort((a, b) => {
    const an = a.nickname || a.id;
    const bn = b.nickname || b.id;
    return an.localeCompare(bn, 'ko');
  });
  return list;
}
