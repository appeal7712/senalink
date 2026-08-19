import generated from './gearDex.generated.json';
import { accessories as legendaryAccessories, equipments } from './equipments';

export const RARITY_META = {
  normal: {
    id: 'normal',
    label: '일반',
    color: '#cbd5e1',
    border: 'rgba(148,163,184,0.55)',
    bg: 'linear-gradient(160deg, #6b7280 0%, #1f2937 100%)',
    glow: 'rgba(148,163,184,0.28)',
  },
  advanced: {
    id: 'advanced',
    label: '고급',
    color: '#86efac',
    border: 'rgba(34,197,94,0.55)',
    bg: 'linear-gradient(160deg, #22c55e 0%, #14532d 100%)',
    glow: 'rgba(34,197,94,0.28)',
  },
  rare: {
    id: 'rare',
    label: '희귀',
    color: '#93c5fd',
    border: 'rgba(59,130,246,0.6)',
    bg: 'linear-gradient(160deg, #3b82f6 0%, #1e3a8a 100%)',
    glow: 'rgba(59,130,246,0.3)',
  },
  legendary: {
    id: 'legendary',
    label: '전설',
    color: '#fde047',
    border: 'rgba(250,204,21,0.7)',
    bg: 'linear-gradient(160deg, #facc15 0%, #854d0e 100%)',
    glow: 'rgba(250,204,21,0.35)',
  },
};

export const SLOT_META = {
  physical: { id: 'physical', label: '물리 공격', icon: 'swords' },
  magic: { id: 'magic', label: '마법 공격', icon: 'orb' },
  armor: { id: 'armor', label: '방어구', icon: 'shield' },
};

function familyOf(name) {
  if (name.includes('드래곤')) return '드래곤';
  if (name.includes('우마왕')) return '우마왕';
  if (name.includes('히드라')) return '히드라';
  return '기타';
}

function displayAccName(name) {
  return String(name || '').replace(/^고급\s*/, '');
}

const LEGENDARY_NAMES = ['불사의 반지', '권능의 반지', '부활의 반지'];
const RARE_KEYS = ['토벌', '철벽', '건강', '공성', '기합', '근성', '섬멸'];
const NORMAL_KEYS = ['저항', '적중', '집중', '자연', '보호', '행운'];
const RARITY_RANK = { legendary: 0, rare: 1, advanced: 2, normal: 3 };

function classifyAccessory(name) {
  const n = displayAccName(name);
  if (LEGENDARY_NAMES.includes(n)) return 'legendary';
  const hit = (keys) => keys.some((k) => n.includes(k));
  if (hit(RARE_KEYS)) return 'rare';
  if (hit(NORMAL_KEYS)) return 'normal';
  return 'advanced';
}

export const gearPieces = generated.pieces.map((p) => ({
  ...p,
  family: familyOf(p.name),
}));

const generatedByName = new Map(
  generated.accessories.map((a) => [displayAccName(a.name), a])
);

const legendaryCatalog = LEGENDARY_NAMES.map((name) => {
  const base = legendaryAccessories.find((a) => a.name === name);
  const scraped = generatedByName.get(name);
  return {
    ...(scraped || {}),
    ...base,
    id: base.id,
    name: base.name,
    iconUrl: base.iconUrl,
    effect: scraped?.effect || base.effect,
    rarity: 'legendary',
    displayName: name,
  };
});

const otherCatalog = generated.accessories
  .filter((a) => !LEGENDARY_NAMES.includes(displayAccName(a.name)))
  .map((a) => ({
    ...a,
    rarity: classifyAccessory(a.name),
    displayName: displayAccName(a.name),
  }));

export const accessoryCatalog = [...legendaryCatalog, ...otherCatalog].sort((a, b) => {
  const rank = (RARITY_RANK[a.rarity] ?? 9) - (RARITY_RANK[b.rarity] ?? 9);
  if (rank) return rank;
  return String(a.displayName).localeCompare(String(b.displayName), 'ko');
});

export { equipments };
