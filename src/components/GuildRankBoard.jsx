import { useEffect, useMemo, useState } from 'react';
import Icon from './icons/Icon';
import { subscribePublicGuilds } from '../lib/publicGuilds';
import { LOUNGE_AFFILIATIONS } from '../data/loungeMeta';
import { formatGuildRank } from '../data/guildRanks';
import LeagueChip from './lounge/LeagueChip';
import GuildMark from './GuildMark';

const AFF_MAP = Object.fromEntries(LOUNGE_AFFILIATIONS.map(a => [a.id, a]));
const BOARDS = [
  { id: 'guildwar', label: '길드전', icon: 'pvp' },
  { id: 'expedition', label: '강림 원정대', icon: 'expedition' },
];

export default function GuildRankBoard() {
  const [guilds, setGuilds] = useState([]);
  const [affiliation, setAffiliation] = useState('all');
  const [board, setBoard] = useState('guildwar');

  useEffect(() => subscribePublicGuilds(setGuilds), []);

  const rows = useMemo(() => {
    const pool = affiliation === 'all'
      ? guilds
      : guilds.filter(g => (g.affiliation || 'lounge') === affiliation);
    return pool
      .map(g => {
        const rank = board === 'guildwar' ? g.guildwarRank : g.expeditionRank;
        return { ...g, rank: Number(rank) || 0 };
      })
      .filter(g => g.rank > 0)
      .sort((a, b) => {
        if (board === 'guildwar') {
          const la = a.guildwarLeague === 'minor' ? 1 : 0;
          const lb = b.guildwarLeague === 'minor' ? 1 : 0;
          if (la !== lb) return la - lb;
        }
        return a.rank - b.rank || String(a.name).localeCompare(String(b.name), 'ko');
      });
  }, [guilds, affiliation, board]);

  return (
    <div className="luxury-panel guild-board" style={{ padding: '22px 20px', marginBottom: '24px' }}>
      <div className="guild-board-top">
        <div>
          <h3 className="guild-board-title">
            <Icon name="medal" size={16} /> 길드 순위
          </h3>
          <div className="guild-board-hint">관리자가 직접 갱신합니다</div>
        </div>
        <div className="guild-board-modes" role="tablist">
          {BOARDS.map(b => {
            const on = board === b.id;
            return (
              <button
                key={b.id}
                type="button"
                role="tab"
                aria-selected={on}
                className={`guild-board-mode${on ? ' is-on' : ''}`}
                onClick={() => setBoard(b.id)}
              >
                <Icon name={b.icon} size={14} />
                {b.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="guild-board-filters">
        <button
          type="button"
          className={`guild-board-filter${affiliation === 'all' ? ' is-on' : ''}`}
          onClick={() => setAffiliation('all')}
        >
          통합
        </button>
        {LOUNGE_AFFILIATIONS.map(a => (
          <button
            key={a.id}
            type="button"
            className={`guild-board-filter${affiliation === a.id ? ' is-on' : ''}`}
            onClick={() => setAffiliation(a.id)}
            style={affiliation === a.id ? { background: a.color, color: '#161616', borderColor: 'transparent' } : undefined}
          >
            {a.label.replace(' 길드', '')}
          </button>
        ))}
      </div>

      <div className="guild-board-box">
        {rows.length === 0 ? (
          <div className="guild-board-empty">등록된 순위가 없습니다.</div>
        ) : (
          <div className="rank-list">
            <div className="rank-head">
              <span>순위</span>
              <span>길드 마크 · 이름 · 소속</span>
              <span>{board === 'guildwar' ? '리그' : '순위'}</span>
            </div>
            <div className="guild-board-scroller">
              {rows.map(g => {
                const aff = AFF_MAP[g.affiliation] || AFF_MAP.lounge;
                const league = g.guildwarLeague === 'minor' ? 'minor' : 'major';
                return (
                  <div key={g.id} className={`rank-row${g.rank === 1 ? ' is-lead' : ''}`}>
                    <span className={`rank-num${g.rank <= 3 ? ' gold' : ''}`}>{g.rank}</span>
                    <div className="guild-board-name">
                      <span className="glass-avatar" style={{ width: 28, height: 28, boxShadow: 'none' }}>
                        <GuildMark emblem={g.emblem || 'fortress'} emblemUrl={g.emblemUrl} size={14} fill />
                      </span>
                      <div className="guild-board-name-text">
                        <div className="rank-member-name">{g.name}</div>
                        <span className="kind-pill kind-pill--sm guild-board-aff" style={{ background: aff.color }}>
                          {aff.label.replace(' 길드', '')}
                        </span>
                      </div>
                    </div>
                    <div className="rank-pts" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                      {board === 'guildwar' && <LeagueChip league={league} />}
                      <span>{formatGuildRank(g.rank)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
