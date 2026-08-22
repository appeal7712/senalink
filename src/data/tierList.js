export const TIER_RANKS = [
  { id: 'SSS', iconUrl: '/images/tiers/SSS.png' },
  { id: 'S', iconUrl: '/images/tiers/S.png' },
  { id: 'A', iconUrl: '/images/tiers/A.png' },
  { id: 'B', iconUrl: '/images/tiers/B.png' },
  { id: 'C', iconUrl: '/images/tiers/C.png' },
  { id: 'D', iconUrl: '/images/tiers/D.png' },
  { id: 'F', iconUrl: '/images/tiers/F.png' },
];

export const TIER_POOL_ID = 'pool';

export function emptyTierBoard() {
  return Object.fromEntries(TIER_RANKS.map((t) => [t.id, []]));
}
