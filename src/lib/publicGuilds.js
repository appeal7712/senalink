import { collection, doc, onSnapshot, setDoc, query, limit } from 'firebase/firestore';
import { db } from './firebase';
import { COL } from '../config/firestorePaths';
import { publicGuildPayload } from '../data/guildRanks';

export async function syncPublicGuild(hubId, hub) {
  if (!hubId) return;
  await setDoc(doc(db, COL.PUBLIC_GUILDS, hubId), publicGuildPayload({ ...hub, id: hubId }));
}

export function subscribePublicGuilds(onChange) {
  const q = query(collection(db, COL.PUBLIC_GUILDS), limit(200));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    onChange(list);
  }, () => onChange([]));
}
