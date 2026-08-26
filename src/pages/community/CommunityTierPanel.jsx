import { useEffect, useMemo, useState } from 'react';
import { heroes, compareHeroesForList } from '../../data/heroes';
import { ROLE_ICONS, ROLE_LABELS } from '../../data/roleIcons';
import { TIER_POOL_ID, TIER_RANKS, emptyTierBoard } from '../../data/tierList';
import {
  COMMUNITY_TIER_SECTIONS,
  saveCommunityTierList,
  subscribeCommunityTierList,
} from '../../lib/communityTierLists';
import { useSuperAdmin } from '../../context/SuperAdminContext';
import HeroPortraitCard from '../../components/HeroPortraitCard';
import Icon from '../../components/icons/Icon';

const ROLE_COLS = [
  { id: 'offensive', label: ROLE_LABELS.offensive },
  { id: 'magic', label: ROLE_LABELS.magic },
  { id: 'defensive', label: ROLE_LABELS.defensive },
  { id: 'support', label: ROLE_LABELS.support },
  { id: 'universal', label: ROLE_LABELS.universal },
];

const POOL_ROLE_FILTERS = [{ id: 'all', label: '전체' }, ...ROLE_COLS];

function cleanName(hero) {
  return String(hero?.name || '').replace('(각성)', '').trim();
}

function findHero(id) {
  return heroes.find((h) => h.id === id) || null;
}

function setDeckDrag(e, payload) {
  e.dataTransfer.setData('application/x-hub-tier-hero', JSON.stringify(payload));
  e.dataTransfer.effectAllowed = 'move';
}

function readDeckDrag(e) {
  try {
    return JSON.parse(e.dataTransfer.getData('application/x-hub-tier-hero') || '');
  } catch {
    return null;
  }
}

function HeroChip({ hero, editing, onDragStart, onRemove }) {
  if (!hero) return null;
  return (
    <div
      className="hub-tier-chip"
      draggable={editing}
      onDragStart={editing ? (e) => onDragStart?.(e, hero) : undefined}
      title={cleanName(hero)}
    >
      <div className="hub-tier-chip-face">
        <HeroPortraitCard hero={hero} showStars showRole showName={false} />
      </div>
      <span className="hub-tier-chip-name">{cleanName(hero)}</span>
      {editing && onRemove ? (
        <button
          type="button"
          className="hub-tier-chip-x"
          aria-label={`${cleanName(hero)} 제거`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(hero.id);
          }}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

export default function CommunityTierPanel() {
  const { isSuperAdmin, authUser } = useSuperAdmin();
  const [section, setSection] = useState('pvp');
  const [board, setBoard] = useState(() => emptyTierBoard());
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState('');
  const [poolRole, setPoolRole] = useState('all');
  const [dragOver, setDragOver] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');

  useEffect(() => {
    setLoadError('');
    setEditing(false);
    setDraft(null);
    return subscribeCommunityTierList(
      section,
      (data) => {
        setBoard(data.board);
        setUpdatedAt(data.updatedAt || '');
      },
      (err) => setLoadError(err?.message || '티어리스트를 불러오지 못했습니다.'),
    );
  }, [section]);

  const activeBoard = editing && draft ? draft : board;

  const placedIds = useMemo(() => {
    const set = new Set();
    TIER_RANKS.forEach((t) => (activeBoard[t.id] || []).forEach((id) => set.add(id)));
    return set;
  }, [activeBoard]);

  const poolHeroes = useMemo(() => {
    if (!editing) return [];
    const q = query.trim().toLowerCase();
    return [...heroes]
      .filter((h) => !placedIds.has(h.id))
      .filter((h) => (poolRole === 'all' ? true : h.role === poolRole))
      .filter((h) => {
        if (!q) return true;
        return cleanName(h).toLowerCase().includes(q) || String(h.name || '').toLowerCase().includes(q);
      })
      .sort(compareHeroesForList);
  }, [editing, placedIds, poolRole, query]);

  const startEdit = () => {
    setDraft(JSON.parse(JSON.stringify(board)));
    setEditing(true);
    setQuery('');
    setPoolRole('all');
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(null);
    setDragOver(null);
  };

  const moveHero = (heroId, toTier) => {
    if (!heroId || !draft) return;
    setDraft((prev) => {
      const next = emptyTierBoard();
      TIER_RANKS.forEach((t) => {
        next[t.id] = (prev[t.id] || []).filter((id) => id !== heroId);
      });
      if (toTier && toTier !== TIER_POOL_ID && next[toTier]) {
        next[toTier] = [...next[toTier], heroId];
      }
      return next;
    });
  };

  const onDragStart = (e, hero) => setDeckDrag(e, { heroId: hero.id });

  const onDropTier = (tierId) => (e) => {
    e.preventDefault();
    setDragOver(null);
    if (!editing) return;
    const payload = readDeckDrag(e);
    if (payload?.heroId) moveHero(payload.heroId, tierId);
  };

  const allowDrop = (tierId) => (e) => {
    if (!editing) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOver !== tierId) setDragOver(tierId);
  };

  const onSave = async () => {
    if (!draft || busy) return;
    setBusy(true);
    try {
      await saveCommunityTierList({
        section,
        board: draft,
        uid: authUser?.uid || '',
      });
      setEditing(false);
      setDraft(null);
    } catch (e) {
      alert(e?.message || '저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="hub-tier">
      <div className="hub-tier-head">
        <div className="glass-inset hub-tier-modes" role="tablist" aria-label="티어리스트 모드">
          {COMMUNITY_TIER_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={section === s.id}
              className={`hub-tier-mode${section === s.id ? ' is-on' : ''}`}
              onClick={() => setSection(s.id)}
              disabled={editing}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="hub-tier-actions">
          {updatedAt ? (
            <span className="hub-tier-updated">
              갱신 {new Date(updatedAt).toLocaleDateString('ko-KR')}
            </span>
          ) : null}
          {isSuperAdmin ? (
            editing ? (
              <>
                <button type="button" className="tierlist-reset" onClick={cancelEdit} disabled={busy}>
                  취소
                </button>
                <button type="button" className="btn-ops" onClick={onSave} disabled={busy}>
                  <Icon name="save" size={14} />
                  {busy ? '저장 중…' : '저장'}
                </button>
              </>
            ) : (
              <button type="button" className="btn-ops" onClick={startEdit}>
                <Icon name="edit" size={14} />
                수정
              </button>
            )
          ) : null}
        </div>
      </div>

      {loadError ? <div className="hub-tier-error">{loadError}</div> : null}

      <div className={`hub-tier-layout${editing ? ' is-editing' : ''}`}>
        <div className="luxury-panel hub-tier-board-wrap">
          <div className="hub-tier-colhead" style={{ '--hub-tier-cols': ROLE_COLS.length }}>
            <div className="hub-tier-colhead-rank" aria-hidden />
            {ROLE_COLS.map((r) => (
              <div key={r.id} className="hub-tier-colhead-role">
                <img src={ROLE_ICONS[r.id]} alt={r.label} />
                <span>{r.label}</span>
              </div>
            ))}
          </div>

          <div className="hub-tier-board">
            {TIER_RANKS.map((tier) => {
              const ids = activeBoard[tier.id] || [];
              const byRole = Object.fromEntries(ROLE_COLS.map((r) => [r.id, []]));
              ids.forEach((id) => {
                const hero = findHero(id);
                if (!hero) return;
                if (byRole[hero.role]) byRole[hero.role].push(hero);
              });

              return (
                <div
                  key={tier.id}
                  className={`hub-tier-row${dragOver === tier.id ? ' is-over' : ''}`}
                  style={{ '--hub-tier-cols': ROLE_COLS.length }}
                  onDragOver={allowDrop(tier.id)}
                  onDragLeave={() => setDragOver((cur) => (cur === tier.id ? null : cur))}
                  onDrop={onDropTier(tier.id)}
                >
                  <div className="hub-tier-rank" aria-label={`${tier.id} 티어`}>
                    <img src={tier.iconUrl} alt={tier.id} />
                  </div>
                  {ROLE_COLS.map((r) => (
                    <div key={r.id} className="glass-inset hub-tier-cell">
                      {(byRole[r.id] || []).length === 0 ? (
                        <span className="hub-tier-cell-empty">{editing ? '드롭' : '—'}</span>
                      ) : (
                        (byRole[r.id] || []).map((hero) => (
                          <HeroChip
                            key={hero.id}
                            hero={hero}
                            editing={editing}
                            onDragStart={onDragStart}
                            onRemove={(id) => moveHero(id, TIER_POOL_ID)}
                          />
                        ))
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {editing ? (
          <div
            className={`luxury-panel hub-tier-pool-panel${dragOver === TIER_POOL_ID ? ' is-over' : ''}`}
            onDragOver={allowDrop(TIER_POOL_ID)}
            onDragLeave={() => setDragOver((cur) => (cur === TIER_POOL_ID ? null : cur))}
            onDrop={onDropTier(TIER_POOL_ID)}
          >
            <div className="hub-tier-pool-head">
              <h3>
                <Icon name="hero" size={14} /> 영웅 목록
              </h3>
              <input
                className="tierlist-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="영웅 검색"
              />
            </div>
            <div className="tierlist-roles">
              {POOL_ROLE_FILTERS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`tierlist-role${poolRole === r.id ? ' is-on' : ''}`}
                  onClick={() => setPoolRole(r.id)}
                  title={r.label}
                >
                  {r.id === 'all' ? <span>전체</span> : <img src={ROLE_ICONS[r.id]} alt={r.label} />}
                </button>
              ))}
            </div>
            <div className="hub-tier-pool">
              {poolHeroes.length === 0 ? (
                <div className="tierlist-pool-empty">표시할 영웅이 없습니다.</div>
              ) : (
                poolHeroes.map((hero) => (
                  <HeroChip key={hero.id} hero={hero} editing onDragStart={onDragStart} />
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
