export const GUILDWAR_LEAGUES = [
  { id: 'major', label: 'MAJOR' },
  { id: 'minor', label: 'MINOR' },
];

export function parseGuildRank(value) {
  const n = parseInt(String(value ?? '').replace(/[^\d]/g, ''), 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(9999, n);
}

export function formatGuildRank(rank) {
  const n = parseGuildRank(rank);
  return n ? `${n}위` : '미등록';
}

export function normalizeGuildwarLeague(league) {
  return league === 'minor' ? 'minor' : league === 'major' ? 'major' : null;
}

export function publicGuildPayload(hub = {}) {
  const guildwarRank = parseGuildRank(hub.guildwarRank);
  const expeditionRank = parseGuildRank(hub.expeditionRank);
  return {
    name: String(hub.name || '').trim(),
    affiliation: hub.affiliation || 'lounge',
    emblem: hub.emblem || 'fortress',
    emblemUrl: hub.emblemUrl || null,
    guildwarRank,
    guildwarLeague: guildwarRank ? (normalizeGuildwarLeague(hub.guildwarLeague) || 'major') : null,
    expeditionRank,
    ranksUpdatedAt: hub.ranksUpdatedAt || null,
    updatedAt: hub.updatedAt || new Date().toISOString(),
  };
}
