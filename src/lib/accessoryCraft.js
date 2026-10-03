import { accessoryCatalog, RARITY_META } from '../data/gearDex';

/** 덱 장신구 선택지 = 도감 6성 반지 전체 (전설 → 희귀 → 고급 → 일반) */
export const RING_LIST = accessoryCatalog;

export const RING_RARITY_FILTERS = [
  { id: 'all', label: '전체' },
  ...['legendary', 'rare', 'advanced', 'normal'].map((id) => ({ id, label: RARITY_META[id].label })),
];

const DEFAULT_RING = RING_LIST.find((r) => r.displayName === '불사의 반지') || RING_LIST[0];

// 세공 2옵 이전 덱 UI의 shortLabel 저장값
const LEGACY_LABEL_TO_NAME = {
  불사: '불사의 반지',
  권능: '권능의 반지',
  부활: '부활의 반지',
  상태이상: '재앙의 반지',
};

// 세공 2옵 이전에 저장된 단일 값(출혈&화상 · 토벌&공성). accessory2 키가 없는 구 문서에서만 2옵으로 푼다.
const LEGACY_PAIRS = {
  '샐리맨더의 반지': ['가시 반지', '샐리맨더의 반지'],
  '출혈&화상': ['가시 반지', '샐리맨더의 반지'],
  '토벌의 반지': ['토벌의 반지', '공성의 반지'],
  '토벌&공성': ['토벌의 반지', '공성의 반지'],
};

export function findRing(value) {
  if (!value) return DEFAULT_RING;
  const v = LEGACY_LABEL_TO_NAME[value] || String(value).replace(/^고급\s*/, '');
  return RING_LIST.find((r) => r.displayName === v || r.name === v) || DEFAULT_RING;
}

/** 저장값 (반지 이름) */
export function ringValue(ring) {
  return ring?.displayName || '';
}

/** 짧은 이름 + 상태이상 효과(있으면) — 재앙 / 마비 */
export function ringParts(ring) {
  if (!ring) return { name: '', status: '' };
  const name = ring.shortLabel || ring.displayName.replace(/의? 반지$/, '');
  const status = /턴간\s*(\S+)\s*효과를\s*부여/.exec(ring.effect || '')?.[1] || '';
  return { name, status };
}

/** 표시 이름 — 상태이상 반지는 효과를 괄호로: 재앙(마비) */
export function ringLabel(ring) {
  const { name, status } = ringParts(ring);
  return status ? `${name}(${status})` : name;
}

/** 장비 설정 → [메인, 세공?] 반지 배열 (1~2개) */
export function resolveAccessoryPair(gear = {}) {
  if (gear.accessory2 === undefined) {
    const legacy = LEGACY_PAIRS[gear.accessory];
    if (legacy) return legacy.map(findRing);
    return [findRing(gear.accessory)];
  }
  const main = findRing(gear.accessory);
  const sub = gear.accessory2 ? findRing(gear.accessory2) : null;
  return sub && sub.id !== main.id ? [main, sub] : [main];
}
