import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { COL, hubMembersCol, hubMemberDoc } from '../config/firestorePaths';

export async function listAllHubs() {
  const snap = await getDocs(collection(db, COL.HUBS));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listHubMembers(hubId) {
  const snap = await getDocs(collection(db, ...hubMembersCol(hubId)));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => {
    const rank = { master: 0, admin: 1, member: 2 };
    return (rank[a.role] ?? 9) - (rank[b.role] ?? 9)
      || String(a.nickname).localeCompare(String(b.nickname), 'ko');
  });
  return list;
}

export async function superKickMember(hubId, memberId, role) {
  if (role === 'master') {
    throw new Error('길드마스터는 추방할 수 없습니다. 위임 후 추방하세요.');
  }
  await deleteDoc(doc(db, ...hubMemberDoc(hubId, memberId)));
  try {
    await deleteDoc(doc(db, COL.HUBS, hubId, 'scores', memberId));
  } catch {
    /* ignore */
  }
}
