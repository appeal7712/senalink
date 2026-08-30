import { useMemo, useState } from 'react';
import Icon from '../icons/Icon';
import { formatGuildRank, GUILDWAR_LEAGUES, parseGuildRank } from '../../data/guildRanks';
import { getGuildRankDueFlags } from '../../lib/guildRankSeasonDue';
import { backdropDismissProps } from '../../utils/backdropDismiss';
import LeagueChip from './LeagueChip';
import ModalScrim from '../ModalScrim';

function readPreviewRankDue(showDueMarks) {
  if (!showDueMarks || typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('previewRankDue') === '1';
}

export default function GuildRankBars({ lounge, canEdit, showDueMarks = false, onSave }) {
  const [open, setOpen] = useState(false);
  const previewDue = readPreviewRankDue(showDueMarks);

  const due = useMemo(() => {
    if (previewDue) return { guildwar: true, expedition: true };
    return showDueMarks ? getGuildRankDueFlags(lounge) : { guildwar: false, expedition: false };
  }, [lounge, showDueMarks, previewDue]);

  const gwRank = formatGuildRank(lounge?.guildwarRank);
  const exRank = formatGuildRank(lounge?.expeditionRank);

  return (
    <>
      <div className="guild-rank-stack">
        <button
          type="button"
          className="guild-rank-pill"
          onClick={canEdit ? () => setOpen(true) : undefined}
          style={{ cursor: canEdit ? 'pointer' : 'default' }}
          title={canEdit ? (due.guildwar ? '시즌 종료 · 순위 갱신' : '순위 갱신') : undefined}
        >
          <span className="guild-rank-pill-icon"><Icon name="pvp" size={15} /></span>
          <span className="guild-rank-pill-label">길드전</span>
          {due.guildwar && (
            <span className="guild-rank-due-badge" aria-hidden>
              <Icon name="newBadge" size={14} />
            </span>
          )}
          <span className="guild-rank-pill-right">
            <LeagueChip league={lounge?.guildwarLeague} />
            <strong>{gwRank}</strong>
          </span>
        </button>
        <button
          type="button"
          className="guild-rank-pill"
          onClick={canEdit ? () => setOpen(true) : undefined}
          style={{ cursor: canEdit ? 'pointer' : 'default' }}
          title={canEdit ? (due.expedition ? '시즌 종료 · 순위 갱신' : '순위 갱신') : undefined}
        >
          <span className="guild-rank-pill-icon"><Icon name="expedition" size={15} /></span>
          <span className="guild-rank-pill-label">강림 원정대</span>
          {due.expedition && (
            <span className="guild-rank-due-badge" aria-hidden>
              <Icon name="newBadge" size={14} />
            </span>
          )}
          <span className="guild-rank-pill-right">
            <strong>{exRank}</strong>
          </span>
        </button>
      </div>
      {open && canEdit && (
        <RankEditModal
          lounge={lounge}
          onClose={() => setOpen(false)}
          onSave={async (patch) => {
            await onSave?.(patch);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function RankEditModal({ lounge, onClose, onSave }) {
  const [gwRank, setGwRank] = useState(lounge?.guildwarRank ? String(lounge.guildwarRank) : '');
  const [gwLeague, setGwLeague] = useState(lounge?.guildwarLeague === 'minor' ? 'minor' : 'major');
  const [exRank, setExRank] = useState(lounge?.expeditionRank ? String(lounge.expeditionRank) : '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    try {
      setErr('');
      setBusy(true);
      await onSave({
        guildwarRank: parseGuildRank(gwRank),
        guildwarLeague: parseGuildRank(gwRank) ? gwLeague : null,
        expeditionRank: parseGuildRank(exRank),
      });
    } catch (e) {
      setErr(e.message || '저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalScrim style={{ zIndex: 5100, padding: '16px' }} {...backdropDismissProps(onClose)}>
      <div className="glass-modal" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} style={{
        width: 'min(420px, 96vw)', padding: '22px', borderRadius: '24px',
        display: 'flex', flexDirection: 'column', gap: '14px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#fff' }}>길드 순위 갱신</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <Icon name="closeBtn" size={18} />
          </button>
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1.5 }}>
          길드마스터·관리자가 갱신 · 전 시즌 순위 반영 권장
        </p>

        <div>
          <div className="rank-edit-heading">
            <Icon name="pvp" size={16} />
            길드전
            <div className="rank-edit-leagues">
              {GUILDWAR_LEAGUES.map(l => (
                <LeagueChip
                  key={l.id}
                  league={l.id}
                  as="button"
                  active={gwLeague === l.id}
                  grow
                  onClick={() => setGwLeague(l.id)}
                />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input value={gwRank} onChange={e => setGwRank(e.target.value)} inputMode="numeric" placeholder="예: 32"
              style={rankInput} />
            <span style={{ color: '#fff', fontWeight: 800 }}>위</span>
          </div>
        </div>

        <div>
          <div className="rank-edit-heading">
            <Icon name="expedition" size={16} />
            강림 원정대
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input value={exRank} onChange={e => setExRank(e.target.value)} inputMode="numeric" placeholder="예: 4"
              style={rankInput} />
            <span style={{ color: '#fff', fontWeight: 800 }}>위</span>
          </div>
        </div>

        {err && <div style={{ color: '#fca5a5', fontSize: '13px', fontWeight: 800 }}>{err}</div>}
        <button type="button" onClick={submit} disabled={busy} className="btn-ops" style={{ padding: '12px', justifyContent: 'center' }}>
          {busy ? '저장 중…' : '저장'}
        </button>
      </div>
    </ModalScrim>
  );
}

const rankInput = {
  flex: 1, padding: '10px 12px', background: '#07090e', border: '1px solid var(--border-gold)',
  color: '#fff', borderRadius: '8px', fontSize: '14px', fontWeight: 800, boxSizing: 'border-box'
};
