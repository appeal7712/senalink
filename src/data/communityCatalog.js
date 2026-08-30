/** 공용 허브 PvE/PvP 콘텐츠 카탈로그 — 길드 허브 CONTENT_META 와 분리 */

export const COMMUNITY_PVE_MODES = [
  { id: 'raid', label: '레이드', blurb: '정규 레이드 보스 공략' },
  { id: 'surprise_raid', label: '돌발 레이드', blurb: '등장 시 한정 돌발 보스' },
  { id: 'growth_dungeon', label: '성장던전', blurb: '원소·골드 던전 루트' },
];

export const COMMUNITY_RAIDS = [
  {
    key: 'doom_eye',
    name: '파멸의 눈동자',
    iconUrl: '/images/community/raid/doom_eye.png',
    accent: '#dc2626',
    glow: 'rgba(220,38,38,0.5)',
  },
  {
    key: 'umawang',
    name: '우마왕',
    iconUrl: '/images/community/raid/umawang.png',
    accent: '#ea580c',
    glow: 'rgba(234,88,12,0.5)',
  },
  {
    key: 'steel_predator',
    name: '강철의 포식자',
    iconUrl: '/images/community/raid/steel_predator.png',
    accent: '#2563eb',
    glow: 'rgba(37,99,235,0.5)',
  },
];

export const COMMUNITY_SURPRISE_RAIDS = [
  {
    key: 'leonid',
    name: '레오니드',
    iconUrl: '/images/community/raid/leonid-box.png',
    accent: '#2563eb',
    title: '돌발 · 레오니드',
  },
  {
    key: 'calistra',
    name: '칼리스트라',
    iconUrl: '/images/community/raid/calistra-box.png',
    accent: '#facc15',
    title: '돌발 · 칼리스트라',
  },
  {
    key: 'astrea',
    name: '아스트레아',
    iconUrl: '/images/community/raid/astrea-box.png',
    accent: '#dc2626',
    title: '돌발 · 아스트레아',
  },
];

export const COMMUNITY_GROWTH_DUNGEONS = [
  { key: 'fire', name: '불의 원소', iconUrl: '/images/community/dungeon/fire.png', accent: '#f97316' },
  { key: 'water', name: '물의 원소', iconUrl: '/images/community/dungeon/water.png', accent: '#38bdf8' },
  { key: 'earth', name: '땅의 원소', iconUrl: '/images/community/dungeon/earth.png', accent: '#22c55e' },
  { key: 'light', name: '빛의 원소', iconUrl: '/images/community/dungeon/light.png', accent: '#ffffff' },
  { key: 'dark', name: '암흑의 원소', iconUrl: '/images/community/dungeon/dark.png', accent: '#a855f7' },
  { key: 'gold', name: '골드던전', iconUrl: '/images/community/dungeon/gold.png', accent: '#facc15' },
];

export const COMMUNITY_ARENA_KINDS = [
  { id: 'normal', label: '결투장', iconUrl: '/images/community/arena/arena.png' },
  { id: 'advanced', label: '상급 결투장', iconUrl: '/images/community/arena/arena_advanced.png' },
];

export const COMMUNITY_ARENA_ICON = '/images/community/arena/arena.png';
export const COMMUNITY_ARENA_ADVANCED_ICON = '/images/community/arena/arena_advanced.png';

export const COMMUNITY_PVP_MODES = [
  {
    id: 'arena',
    label: '결투장',
    arenaKind: 'normal',
    blurb: '결투장 덱 공유',
    banner: COMMUNITY_ARENA_ICON,
  },
  {
    id: 'arena_advanced',
    label: '상급 결투장',
    arenaKind: 'advanced',
    blurb: '상급 결투장 덱 공유',
    banner: COMMUNITY_ARENA_ADVANCED_ICON,
  },
  {
    id: 'totalwar',
    label: '총력전',
    arenaKind: null,
    blurb: '등급별 다팀 편성 공략',
  },
];

/** 레이드·돌발: 스킬 예약 최대 10 / 성장던전: 공성전형 타임라인 / PvP: 예약 3 */
export function communitySkillMode(category) {
  if (category === 'raid' || category === 'surprise_raid') {
    return { mode: 'reservation', maxReservations: 10, layout: 'pve' };
  }
  if (category === 'growth_dungeon') {
    return { mode: 'timeline', maxReservations: 0, layout: 'pve' };
  }
  if (category === 'arena' || category === 'totalwar') {
    return { mode: 'reservation', maxReservations: 3, layout: 'pvp' };
  }
  return { mode: 'timeline', maxReservations: 0, layout: 'pve' };
}

export function communityContentLabel(category, contentKey) {
  const lists = {
    raid: COMMUNITY_RAIDS,
    surprise_raid: COMMUNITY_SURPRISE_RAIDS,
    growth_dungeon: COMMUNITY_GROWTH_DUNGEONS,
  };
  const hit = (lists[category] || []).find((x) => x.key === contentKey);
  return hit?.name || contentKey || '';
}

export function communityContentsFor(category) {
  if (category === 'raid') return COMMUNITY_RAIDS;
  if (category === 'surprise_raid') return COMMUNITY_SURPRISE_RAIDS;
  if (category === 'growth_dungeon') return COMMUNITY_GROWTH_DUNGEONS;
  return [];
}

/** PvE 공략 카드 왼쪽 하이라이트 — 보스·던전 accent. 없으면 골드 */
export function communityContentAccent(category, contentKey) {
  const hit = communityContentsFor(category).find((x) => x.key === contentKey);
  return hit?.accent || 'var(--gold-primary)';
}
