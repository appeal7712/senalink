import { useEffect, useMemo, useRef, useState } from 'react';
import { heroes, compareHeroesForList } from '../../data/heroes';
import { ROLE_ICONS, ROLE_LABELS } from '../../data/roleIcons';
import { TIER_POOL_ID, TIER_RANKS, emptyTierBoard } from '../../data/tierList';
import { downloadNodePng } from '../../lib/copyNodeImage';
import HeroPortraitCard from '../HeroPortraitCard';
import Icon from '../icons/Icon';

const ROLE_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'offensive', label: ROLE_LABELS.offensive },
  { id: 'magic', label: ROLE_LABELS.magic },
  { id: 'defensive', label: ROLE_LABELS.defensive },
  { id: 'support', label: ROLE_LABELS.support },
  { id: 'universal', label: ROLE_LABELS.universal },
];

function cleanName(hero) {
  return String(hero?.name || '').replace('(각성)', '').trim();
}

function findHero(id) {
  return heroes.find((h) => h.id === id) || null;
}

function setDeckDrag(e, payload) {
  e.dataTransfer.setData('application/x-tier-hero', JSON.stringify(payload));
  e.dataTransfer.effectAllowed = 'move';
}

function readDeckDrag(e) {
  try {
    return JSON.parse(e.dataTransfer.getData('application/x-tier-hero') || '');
  } catch {
    return null;
  }
}

function safeFileName(title) {
  const raw = String(title || 'tierlist').trim() || 'tierlist';
  return `${raw.replace(/[\\/:*?"<>|]+/g, '_').slice(0, 40)}.png`;
}

function HeroChip({ hero, onDragStart }) {
  if (!hero) return null;
  return (
    <div
      className="tierlist-chip"
      draggable
      onDragStart={(e) => onDragStart?.(e, hero)}
      title={cleanName(hero)}
    >
      <div className="tierlist-chip-face">
        <HeroPortraitCard hero={hero} showStars showRole showName={false} />
      </div>
      <span className="tierlist-chip-name">{cleanName(hero)}</span>
    </div>
  );
}

export default function TierListMaker() {
  const captureRef = useRef(null);
  const poolPanelRef = useRef(null);
  const [title, setTitle] = useState('');
  const [board, setBoard] = useState(() => emptyTierBoard());
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [dragOver, setDragOver] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const boardEl = captureRef.current;
    const poolEl = poolPanelRef.current;
    if (!boardEl || !poolEl) return undefined;

    const syncHeight = () => {
      poolEl.style.height = `${boardEl.offsetHeight}px`;
    };
    syncHeight();
    const ro = new ResizeObserver(syncHeight);
    ro.observe(boardEl);
    return () => ro.disconnect();
  }, [board, title]);

  const placedIds = useMemo(() => {
    const set = new Set();
    TIER_RANKS.forEach((t) => (board[t.id] || []).forEach((id) => set.add(id)));
    return set;
  }, [board]);

  const poolHeroes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...heroes]
      .filter((h) => !placedIds.has(h.id))
      .filter((h) => (role === 'all' ? true : h.role === role))
      .filter((h) => {
        if (!q) return true;
        return cleanName(h).toLowerCase().includes(q) || String(h.name || '').toLowerCase().includes(q);
      })
      .sort(compareHeroesForList);
  }, [placedIds, query, role]);

  const moveHero = (heroId, toTier) => {
    if (!heroId) return;
    setBoard((prev) => {
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

  const onDragStart = (e, hero) => {
    setDeckDrag(e, { heroId: hero.id });
  };

  const onDropTier = (tierId) => (e) => {
    e.preventDefault();
    setDragOver(null);
    const payload = readDeckDrag(e);
    if (payload?.heroId) moveHero(payload.heroId, tierId);
  };

  const allowDrop = (tierId) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOver !== tierId) setDragOver(tierId);
  };

  const reset = () => {
    setBoard(emptyTierBoard());
    setQuery('');
    setRole('all');
    setNotice('');
  };

  const onDownload = async () => {
    if (busy) return;
    const trimmed = title.trim();
    if (!trimmed) {
      alert('티어리스트 제목을 입력해 주세요.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      await downloadNodePng(captureRef.current, safeFileName(trimmed));
      setNotice('이미지를 저장했습니다.');
    } catch (e) {
      setNotice(e?.message || '이미지 저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tierlist">
      <div className="luxury-panel tierlist-hero no-capture">
        <div>
          <div className="tierlist-eyebrow">1회용 캡처 도구</div>
          <h1>티어리스트 메이커</h1>
          <p>제목을 정하고 영웅을 배치한 뒤, 이미지로 다운로드하세요.</p>
        </div>
        <div className="tierlist-hero-actions">
          <span className="tierlist-count">배치 {placedIds.size} / {heroes.length}</span>
          <button type="button" className="tierlist-reset" onClick={reset}>초기화</button>
          <button type="button" className="btn-ops tierlist-download" disabled={busy} onClick={onDownload}>
            <Icon name="image" size={14} />
            {busy ? '저장 중…' : '이미지 다운로드'}
          </button>
        </div>
      </div>

      {notice ? <div className="tierlist-notice no-capture">{notice}</div> : null}

      <div className="tierlist-layout">
        <div ref={captureRef} className="luxury-panel tierlist-capture">
          <div className="tierlist-title-wrap">
            <input
              className="tierlist-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="티어리스트 제목을 입력하세요"
              maxLength={60}
            />
          </div>

          <div className="tierlist-board">
            {TIER_RANKS.map((tier) => (
              <div key={tier.id} className="tierlist-row">
                <div className="tierlist-rank" aria-label={`${tier.id} 티어`}>
                  <img src={tier.iconUrl} alt={tier.id} />
                </div>
                <div
                  className={`glass-inset tierlist-drop${dragOver === tier.id ? ' is-over' : ''}`}
                  onDragOver={allowDrop(tier.id)}
                  onDragLeave={() => setDragOver((cur) => (cur === tier.id ? null : cur))}
                  onDrop={onDropTier(tier.id)}
                >
                  {(board[tier.id] || []).length === 0 && (
                    <div className="tierlist-drop-empty no-capture">드래그</div>
                  )}
                  {(board[tier.id] || []).map((id) => (
                    <HeroChip key={id} hero={findHero(id)} onDragStart={onDragStart} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="luxury-panel tierlist-pool-panel no-capture" ref={poolPanelRef}>
          <div className="tierlist-pool-head">
            <h2>
              <Icon name="user" size={15} /> 영웅 목록
            </h2>
            <input
              className="tierlist-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="영웅 검색"
            />
          </div>

          <div className="tierlist-roles" role="tablist" aria-label="역할 필터">
            {ROLE_FILTERS.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`tierlist-role${role === r.id ? ' is-on' : ''}`}
                onClick={() => setRole(r.id)}
                title={r.label}
              >
                {r.id === 'all' ? (
                  <span>전체</span>
                ) : (
                  <img src={ROLE_ICONS[r.id]} alt={r.label} />
                )}
              </button>
            ))}
          </div>

          <div
            className={`tierlist-pool${dragOver === TIER_POOL_ID ? ' is-over' : ''}`}
            onDragOver={allowDrop(TIER_POOL_ID)}
            onDragLeave={() => setDragOver((cur) => (cur === TIER_POOL_ID ? null : cur))}
            onDrop={onDropTier(TIER_POOL_ID)}
          >
            {poolHeroes.length === 0 && (
              <div className="tierlist-pool-empty">표시할 영웅이 없습니다.</div>
            )}
            {poolHeroes.map((hero) => (
              <HeroChip key={hero.id} hero={hero} onDragStart={onDragStart} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
