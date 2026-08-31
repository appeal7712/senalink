import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { exclusiveGearGuideDoc, EXCLUSIVE_GEAR_GUIDE_DOC_ID } from '../config/firestorePaths';
import {
  EXCLUSIVE_GEAR_PRIORITY_COUNT,
  EXCLUSIVE_GEAR_SLOT_COUNT,
  emptyPriorities,
  emptyPrioritySlots,
} from '../data/exclusiveGearOptions';

function normalizeSlots(rawSlots) {
  const slots = Array.isArray(rawSlots) ? rawSlots : [];
  return Array.from({ length: EXCLUSIVE_GEAR_SLOT_COUNT }, (_, i) => String(slots[i] || '').trim());
}

function normalizePriorities(raw = {}) {
  const out = emptyPriorities();

  if (raw?.priorities && typeof raw.priorities === 'object') {
    for (let p = 1; p <= EXCLUSIVE_GEAR_PRIORITY_COUNT; p += 1) {
      const key = String(p);
      out[key] = normalizeSlots(raw.priorities[key]);
    }
    return out;
  }

  if (Array.isArray(raw.slots)) {
    out['1'] = normalizeSlots(raw.slots);
  }

  return out;
}

export function normalizeHeroGuide(raw = {}) {
  return {
    gearName: String(raw.gearName || '').trim(),
    priorities: normalizePriorities(raw),
    note: String(raw.note || '').trim(),
  };
}

export function heroGuideHasContent(guide) {
  if (!guide) return false;
  return Object.values(guide.priorities || {}).some((slots) => slots?.some(Boolean));
}

export function normalizeExclusiveGearGuides(raw = {}) {
  const guides = {};
  const src = raw?.guides && typeof raw.guides === 'object' ? raw.guides : {};
  Object.keys(src).forEach((heroId) => {
    const g = normalizeHeroGuide(src[heroId]);
    if (heroGuideHasContent(g)) guides[heroId] = g;
  });
  return {
    guides,
    updatedAt: raw?.updatedAt || '',
    updatedBy: raw?.updatedBy || '',
  };
}

export function emptyExclusiveGearGuides() {
  return normalizeExclusiveGearGuides({});
}

export function subscribeExclusiveGearGuides(onData, onError) {
  return onSnapshot(
    doc(db, ...exclusiveGearGuideDoc(EXCLUSIVE_GEAR_GUIDE_DOC_ID)),
    (snap) => {
      onData(normalizeExclusiveGearGuides(snap.exists() ? snap.data() : {}));
    },
    (err) => onError?.(err),
  );
}

export async function saveExclusiveGearGuides({ guides, uid }) {
  const normalized = {};
  Object.keys(guides || {}).forEach((heroId) => {
    const g = normalizeHeroGuide(guides[heroId]);
    if (heroGuideHasContent(g)) normalized[heroId] = g;
  });
  await setDoc(doc(db, ...exclusiveGearGuideDoc(EXCLUSIVE_GEAR_GUIDE_DOC_ID)), {
    guides: normalized,
    updatedAt: new Date().toISOString(),
    updatedBy: uid || '',
  });
}

export function getPrioritySlots(guide, priorityKey) {
  const key = String(priorityKey);
  return guide?.priorities?.[key] || emptyPrioritySlots();
}
