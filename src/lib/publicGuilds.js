import { collection, doc, onSnapshot, query, setDoc, where, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import { COL } from '../config/firestorePaths';
import { publicGuildPayload } from '../data/guildRanks';

export async function syncPublicGuild(hubId, hub) {
  if (!hubId) return;
  await setDoc(doc(db, COL.PUBLIC_GUILDS, hubId), publicGuildPayload({ ...hub, id: hubId }));
}

/**
 * 순위 보드용: 길드전/원정대 각각 상위 N만 구독 후 병합.
 * 단일 필드 inequality+orderBy 는 자동 인덱스로 동작(복합 인덱스 불필요).
 * 순위 미등록 허브는 원래 UI에서도 제외되므로 동일 동작.
 */
const RANK_LISTEN_LIMIT = 80;

export function subscribePublicGuilds(onChange) {
  let gwDocs = [];
  let exDocs = [];
  let gwReady = false;
  let exReady = false;

  const emit = () => {
    if (!gwReady || !exReady) return;
    const byId = new Map();
    [...gwDocs, ...exDocs].forEach((row) => byId.set(row.id, row));
    onChange([...byId.values()]);
  };

  const gwQ = query(
    collection(db, COL.PUBLIC_GUILDS),
    where('guildwarRank', '>', 0),
    orderBy('guildwarRank', 'asc'),
    limit(RANK_LISTEN_LIMIT),
  );
  const exQ = query(
    collection(db, COL.PUBLIC_GUILDS),
    where('expeditionRank', '>', 0),
    orderBy('expeditionRank', 'asc'),
    limit(RANK_LISTEN_LIMIT),
  );

  const unsubGw = onSnapshot(gwQ, (snap) => {
    gwDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    gwReady = true;
    emit();
  }, () => {
    gwDocs = [];
    gwReady = true;
    emit();
  });

  const unsubEx = onSnapshot(exQ, (snap) => {
    exDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    exReady = true;
    emit();
  }, () => {
    exDocs = [];
    exReady = true;
    emit();
  });

  return () => {
    unsubGw();
    unsubEx();
  };
}
