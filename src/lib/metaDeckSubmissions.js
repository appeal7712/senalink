import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { COL } from '../config/firestorePaths';

/**
 * 메인 「결투장 메타 덱」 공유 — 유저 제출 → /ops 슈퍼 승인 → site/main metaDecks 칸.
 * 문서 id = 제출자 uid (계정당 1개, 다시 내면 내 것만 덮어씀). 규칙: firestore.rules `metaDeckSubmissions`.
 * 덱 본문은 `deckJson` 문자열 하나 — 규칙이 길이(20,000자)만 보면 되도록.
 */

export const META_DECK_MAX_JSON = 20000;
export const META_DECK_NAME_MAX = 20;
export const META_DECK_TITLE_MAX = 40;

/** 제출에 담는 덱 필드 (티어 · 픽률 · 메인 칸 위치는 승인할 때 관리자가 정함) */
const DECK_KEYS = ['title', 'desc', 'kind', 'mode', 'formationId', 'heroNames', 'heroGearConfigs', 'reservedSkills', 'petId'];

function pickDeck(deck) {
  const out = {};
  for (const k of DECK_KEYS) if (deck?.[k] !== undefined) out[k] = deck[k];
  return out;
}

export function parseSubmissionDeck(sub) {
  try {
    const d = JSON.parse(sub?.deckJson || '{}');
    return d && typeof d === 'object' ? d : {};
  } catch {
    return {};
  }
}

export async function getMyMetaDeckSubmission(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, COL.META_DECK_SUBMISSIONS, uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function submitMetaDeck({ uid, ingameName, siteNickname, deck, createdAt }) {
  if (!uid) throw new Error('로그인이 필요합니다.');
  const name = String(ingameName || '').trim().slice(0, META_DECK_NAME_MAX);
  const title = String(deck?.title || '').trim().slice(0, META_DECK_TITLE_MAX);
  if (!name) throw new Error('인게임 닉네임을 적어 주세요.');
  if (!title) throw new Error('덱 제목을 적어 주세요.');
  if ((deck?.heroNames || []).filter(Boolean).length < 5) throw new Error('영웅 5명을 모두 넣어 주세요.');
  const deckJson = JSON.stringify({ ...pickDeck(deck), title, type: '결투장' });
  if (deckJson.length > META_DECK_MAX_JSON) throw new Error('덱 내용이 너무 길어요. 세팅 메모를 줄여 주세요.');
  const now = new Date().toISOString();
  await setDoc(doc(db, COL.META_DECK_SUBMISSIONS, uid), {
    uid,
    ingameName: name,
    siteNickname: String(siteNickname || '').slice(0, 20),
    title,
    deckJson,
    status: 'pending',
    createdAt: createdAt || now,
    updatedAt: now,
  });
}

export async function withdrawMyMetaDeck(uid) {
  if (!uid) return;
  await deleteDoc(doc(db, COL.META_DECK_SUBMISSIONS, uid));
}

/* ───────────── /ops (슈퍼관리자) ───────────── */

export async function listMetaDeckSubmissions() {
  const snap = await getDocs(collection(db, COL.META_DECK_SUBMISSIONS));
  const order = { pending: 0, approved: 1, rejected: 2 };
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

/** 검토 끝난 기록 정리 — 메인 metaDecks에 이미 옮겨 쓴 덱은 영향 없음 */
export async function deleteMetaDeckSubmission(id) {
  await deleteDoc(doc(db, COL.META_DECK_SUBMISSIONS, id));
}

export async function markMetaDeckSubmission(id, status, { reviewerUid, slot } = {}) {
  await updateDoc(doc(db, COL.META_DECK_SUBMISSIONS, id), {
    status,
    reviewedAt: new Date().toISOString(),
    reviewedBy: reviewerUid || '',
    approvedSlot: typeof slot === 'number' ? slot : null,
  });
}
