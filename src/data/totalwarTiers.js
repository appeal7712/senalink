// 총력전 등급별 참전 덱 개수 — 등급이 높을수록 더 많은 팀 편성이 필요하다.
export const TOTALWAR_TIERS = [
  { id: 'normal',   label: '일반', deckCount: 2, color: '#c89b6d', iconUrl: '/images/totalwar/normal.png' },
  { id: 'advanced', label: '고급', deckCount: 3, color: '#34d399', iconUrl: '/images/totalwar/advanced.png' },
  { id: 'rare',     label: '희귀', deckCount: 4, color: '#fb7185', iconUrl: '/images/totalwar/rare.png' },
  { id: 'legend',   label: '전설', deckCount: 5, color: '#facc15', iconUrl: '/images/totalwar/legend.png' },
];

export const INITIAL_TOTALWAR_TIERED_BUILDS = {
  normal: [],
  advanced: [],
  rare: [],
  legend: [],
};
