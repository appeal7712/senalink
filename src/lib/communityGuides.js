import {
  collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, setDoc, where,
} from 'firebase/firestore';
import { db } from './firebase';
import { COL, communityGuideDoc } from '../config/firestorePaths';
import { emptyGearConfig } from '../components/HeroGearPanel';
import { pets } from '../data/pets';
import { normalizeMetaDeckKind } from '../components/ArenaDeckKind';
import { normalizePvpMode } from '../components/PvpModeToggle';
import { normalizeArenaTier } from '../data/arenaTiers';

/** 섹션당 실시간 구독 상한. section + updatedAt desc (복합 인덱스). */
const GUIDE_LISTEN_LIMIT = 100;

const padNames5 = (names = []) => {
  const next = (names || []).map((n) => n || '');
  while (next.length < 5) next.push('');
  return next.slice(0, 5);
};

const padGear5 = (list = []) => Array.from({ length: 5 }, (_, i) => ({
  ...emptyGearConfig(),
  ...(list?.[i] || {}),
}));

export function emptyCommunityGuide(partial = {}) {
  return {
    section: 'pve',
    category: 'raid',
    contentKey: '',
    arenaKind: null,
    arenaTier: null,
    title: '',
    author: '',
    authorId: '',
    updatedAt: '',
    heroNames: ['', '', '', '', ''],
    formationId: 'protect',
    petId: pets[0]?.id || 'pet_1',
    heroGearConfigs: padGear5(),
    reservedSkills: [],
    skillSequence: [],
    speedOrderNames: [],
    speedIgnoredNames: [],
    mode: '속공',
    deckKind: 'attack',
    decks: null,
    likedBy: [],
    ...partial,
  };
}

function normalizeTotalwarDeck(src = {}) {
  return {
    formationId: src.formationId || 'protect',
    petId: src.petId || pets[0]?.id || 'pet_1',
    heroNames: padNames5(src.heroNames),
    reservedSkills: Array.isArray(src.reservedSkills)
      ? src.reservedSkills.filter(Boolean)
      : (Array.isArray(src.skillSequence) ? src.skillSequence.filter(Boolean) : []),
    mode: normalizePvpMode(src.mode),
    heroGearConfigs: padGear5(src.heroGearConfigs),
  };
}

export function normalizeCommunityGuide(raw = {}, id = '') {
  const category = raw.category || 'raid';
  const isArena = category === 'arena';
  const isTotalwar = category === 'totalwar';
  const decks = isTotalwar && Array.isArray(raw.decks)
    ? raw.decks.map(normalizeTotalwarDeck)
    : null;
  return {
    id: id || raw.id || '',
    section: raw.section === 'pvp' ? 'pvp' : 'pve',
    category,
    contentKey: raw.contentKey || '',
    arenaKind: isArena ? (raw.arenaKind === 'advanced' ? 'advanced' : 'normal') : null,
    arenaTier: isArena ? normalizeArenaTier(raw.arenaTier) : null,
    title: raw.title || '',
    author: raw.author || '',
    authorId: raw.authorId || '',
    updatedAt: raw.updatedAt || '',
    heroNames: padNames5(raw.heroNames),
    formationId: raw.formationId || 'protect',
    petId: raw.petId || pets[0]?.id || 'pet_1',
    heroGearConfigs: padGear5(raw.heroGearConfigs),
    reservedSkills: Array.isArray(raw.reservedSkills)
      ? raw.reservedSkills.filter(Boolean)
      : (Array.isArray(raw.skillSequence) && (isArena || isTotalwar) ? raw.skillSequence.filter(Boolean) : []),
    skillSequence: Array.isArray(raw.skillSequence) ? raw.skillSequence.filter(Boolean) : [],
    speedOrderNames: Array.isArray(raw.speedOrderNames) ? raw.speedOrderNames : [],
    speedIgnoredNames: Array.isArray(raw.speedIgnoredNames) ? raw.speedIgnoredNames : [],
    mode: normalizePvpMode(raw.mode),
    deckKind: normalizeMetaDeckKind(raw.deckKind),
    decks,
    likedBy: Array.isArray(raw.likedBy) ? raw.likedBy.filter(Boolean) : [],
  };
}

export function subscribeCommunityGuides({ section, category, contentKey }, onData, onError) {
  const applySnap = (snap) => {
    let list = snap.docs.map((d) => normalizeCommunityGuide(d.data(), d.id));
    if (category) list = list.filter((g) => g.category === category);
    if (contentKey) list = list.filter((g) => g.contentKey === contentKey);
    // 서버 orderBy가 있으면 이미 최신순. 클라 sort는 동일 결과·폴백 쿼리용.
    list.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    onData(list);
  };

  const orderedQ = query(
    collection(db, COL.COMMUNITY_GUIDES),
    where('section', '==', section),
    orderBy('updatedAt', 'desc'),
    limit(GUIDE_LISTEN_LIMIT),
  );

  let fallbackUnsub = null;
  const unsubOrdered = onSnapshot(
    orderedQ,
    (snap) => {
      if (fallbackUnsub) {
        fallbackUnsub();
        fallbackUnsub = null;
      }
      applySnap(snap);
    },
    (err) => {
      // 인덱스 빌드 중이거나 미배포 시 구 쿼리로 폴백 (서비스 중단 방지)
      const needIndex = err?.code === 'failed-precondition'
        || /index/i.test(String(err?.message || ''));
      if (!needIndex) {
        onError?.(err);
        return;
      }
      const legacyQ = query(
        collection(db, COL.COMMUNITY_GUIDES),
        where('section', '==', section),
        limit(GUIDE_LISTEN_LIMIT),
      );
      fallbackUnsub = onSnapshot(legacyQ, applySnap, (e2) => onError?.(e2));
    },
  );

  return () => {
    unsubOrdered();
    if (fallbackUnsub) fallbackUnsub();
  };
}

export async function saveCommunityGuide(guide) {
  const id = guide.id || `cg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const payload = normalizeCommunityGuide({ ...guide, id }, id);
  const { id: _omit, ...data } = payload;
  await setDoc(doc(db, ...communityGuideDoc(id)), {
    ...data,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  return id;
}

export async function deleteCommunityGuide(guideId) {
  if (!guideId) return;
  await deleteDoc(doc(db, ...communityGuideDoc(guideId)));
}

export function canEditCommunityGuide(guide, { uid, isSuperAdmin, section }) {
  if (isSuperAdmin) return true;
  if (section === 'pve' || guide?.section === 'pve') return false;
  if (!uid || !guide?.authorId) return false;
  return guide.authorId === uid;
}

export function canCreateCommunityGuide({ isSuperAdmin, section, hasNickname }) {
  if (section === 'pve') return !!isSuperAdmin;
  return !!hasNickname;
}
