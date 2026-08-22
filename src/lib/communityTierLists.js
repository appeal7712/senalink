import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { communityTierListDoc } from '../config/firestorePaths';
import { TIER_RANKS, emptyTierBoard } from '../data/tierList';

export const COMMUNITY_TIER_SECTIONS = [
  { id: 'pvp', label: 'PVP' },
  { id: 'pve', label: 'PVE' },
];

export function emptyCommunityTierList(section = 'pve') {
  return {
    section: section === 'pvp' ? 'pvp' : 'pve',
    board: emptyTierBoard(),
    updatedAt: '',
    updatedBy: '',
  };
}

export function normalizeCommunityTierList(raw = {}, section = 'pve') {
  const base = emptyTierBoard();
  const src = raw?.board && typeof raw.board === 'object' ? raw.board : {};
  TIER_RANKS.forEach((t) => {
    const list = Array.isArray(src[t.id]) ? src[t.id] : [];
    base[t.id] = list.map(String).filter(Boolean);
  });
  return {
    section: section === 'pvp' ? 'pvp' : 'pve',
    board: base,
    updatedAt: raw?.updatedAt || '',
    updatedBy: raw?.updatedBy || '',
  };
}

export function subscribeCommunityTierList(section, onData, onError) {
  const listId = section === 'pvp' ? 'pvp' : 'pve';
  return onSnapshot(
    doc(db, ...communityTierListDoc(listId)),
    (snap) => {
      onData(normalizeCommunityTierList(snap.exists() ? snap.data() : {}, listId));
    },
    (err) => onError?.(err),
  );
}

export async function saveCommunityTierList({ section, board, uid }) {
  const listId = section === 'pvp' ? 'pvp' : 'pve';
  const payload = normalizeCommunityTierList({ board }, listId);
  await setDoc(doc(db, ...communityTierListDoc(listId)), {
    section: listId,
    board: payload.board,
    updatedAt: new Date().toISOString(),
    updatedBy: uid || '',
  });
}
