/** 결투장·상급 결투장 공통 티어 (브론즈 → 챔피언) */
export const ARENA_TIERS = [
  { id: 'bronze', label: '브론즈', iconUrl: '/images/community/arena/bronze.png', color: '#c48a4a' },
  { id: 'silver', label: '실버', iconUrl: '/images/community/arena/silver.png', color: '#b8c0cc' },
  { id: 'gold', label: '골드', iconUrl: '/images/community/arena/gold.png', color: '#e8c547' },
  { id: 'platinum', label: '플래티넘', iconUrl: '/images/community/arena/platinum.png', color: '#7ec8e3' },
  { id: 'diamond', label: '다이아', iconUrl: '/images/community/arena/diamond.png', color: '#5eb8ff' },
  { id: 'master', label: '마스터', iconUrl: '/images/community/arena/master.png', color: '#a855f7' },
  { id: 'challenger', label: '챌린저', iconUrl: '/images/community/arena/challenger.png', color: '#ef4444' },
  { id: 'legend', label: '레전드', iconUrl: '/images/community/arena/legend.png', color: '#d4c4f0' },
  { id: 'champion', label: '챔피언', iconUrl: '/images/community/arena/champion.png', color: '#fbbf24' },
];

export const ARENA_TIER_IDS = ARENA_TIERS.map((t) => t.id);

export function arenaTierById(id) {
  return ARENA_TIERS.find((t) => t.id === id) || null;
}

export function arenaTierColor(id) {
  return arenaTierById(id)?.color || 'var(--gold-primary)';
}

export function normalizeArenaTier(id) {
  return ARENA_TIER_IDS.includes(id) ? id : 'bronze';
}
