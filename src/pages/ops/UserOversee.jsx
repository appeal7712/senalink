import { useMemo, useState } from 'react';
import Icon from '../../components/icons/Icon';
import { formatRelative, toMs } from '../../lib/opsInsights';
import { arenaTierById } from '../../data/arenaTiers';
import { TOTALWAR_TIERS } from '../../data/totalwarTiers';

const TOTALWAR_LABEL = Object.fromEntries([
  ...TOTALWAR_TIERS.map((t) => [t.id, t.label]),
  ['legend_plus', '신화'],
]);

const PAGE_SIZE = 25;

const SORTS = [
  { id: 'updated', label: '최근 갱신 순' },
  { id: 'recommend', label: '추천 많은 순' },
  { id: 'name', label: '닉네임 순' },
];

const FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'inHub', label: '허브 소속' },
  { id: 'noHub', label: '미소속' },
  { id: 'noNick', label: '닉네임 없음' },
];

function matchFilter(u, filter) {
  if (filter === 'inHub') return !!u.hubId;
  if (filter === 'noHub') return !u.hubId;
  if (filter === 'noNick') return !u.nickname;
  return true;
}

export default function UserOversee({
  snapshot, loading, error, onReload, onOpenHub,
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('updated');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);

  const users = useMemo(() => snapshot?.users || [], [snapshot]);
  const hubNameById = useMemo(() => {
    const map = {};
    (snapshot?.hubs || []).forEach((h) => { map[h.id] = h.name || '(이름 없음)'; });
    return map;
  }, [snapshot]);

  const filterCounts = useMemo(() => {
    const counts = {};
    FILTERS.forEach((f) => { counts[f.id] = users.filter((u) => matchFilter(u, f.id)).length; });
    return counts;
  }, [users]);

  const filtered = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    const list = users.filter((u) => {
      if (!matchFilter(u, filter)) return false;
      if (!q) return true;
      return String(u.nickname || '').toLowerCase().includes(q)
        || String(u.id || '').toLowerCase().includes(q)
        || String(hubNameById[u.hubId] || u.hubId || '').toLowerCase().includes(q);
    });
    if (sort === 'updated') list.sort((a, b) => toMs(b.updatedAt) - toMs(a.updatedAt));
    else if (sort === 'recommend') list.sort((a, b) => b.recommendCount - a.recommendCount);
    else list.sort((a, b) => (a.nickname || a.id).localeCompare(b.nickname || b.id, 'ko'));
    return list;
  }, [users, query, filter, sort, hubNameById]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageSlice = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const resetPageAnd = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="luxury-panel opsx-panel">
      <div className="opsx-head">
        <h2 className="opsx-title"><Icon name="user" size={16} /> 유저 감독</h2>
        <div className="opsx-head-actions">
          {snapshot && <span className="opsx-muted">유저 {users.length}명 · 불러온 시각 {formatRelative(snapshot.loadedAt)}</span>}
          <button type="button" className="opsx-ghost" onClick={onReload} disabled={loading}>
            {loading ? '불러오는 중…' : '새로고침'}
          </button>
        </div>
      </div>
      {error && <div className="opsx-error">{error}</div>}

      <div className="opsx-toolbar">
        <div className="opsx-search">
          <Icon name="search" size={14} />
          <input
            type="search"
            value={query}
            onChange={(e) => resetPageAnd(setQuery)(e.target.value)}
            placeholder="닉네임 · 허브 이름 · UID"
            aria-label="유저 검색"
          />
        </div>
        <select className="opsx-select" value={sort} onChange={(e) => resetPageAnd(setSort)(e.target.value)} aria-label="정렬">
          {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      <div className="opsx-chips" role="tablist" aria-label="유저 필터">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={`opsx-chip${filter === f.id ? ' is-on' : ''}`}
            onClick={() => resetPageAnd(setFilter)(f.id)}
          >
            {f.label} <span>{filterCounts[f.id] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="opsx-table-wrap">
        <table className="opsx-table">
          <thead>
            <tr>
              <th>유저</th>
              <th>소속 허브</th>
              <th className="opsx-col-hide-sm">티어</th>
              <th className="opsx-num">추천</th>
              <th>최근 갱신</th>
            </tr>
          </thead>
          <tbody>
            {pageSlice.map((u) => {
              const hubName = u.hubId ? hubNameById[u.hubId] : null;
              const arenaLabel = u.arenaTier ? (arenaTierById(u.arenaTier)?.label || u.arenaTier) : '';
              const totalwarLabel = u.totalwarTier ? (TOTALWAR_LABEL[u.totalwarTier] || u.totalwarTier) : '';
              const tiers = [arenaLabel && `결투장 ${arenaLabel}`, totalwarLabel && `총력전 ${totalwarLabel}`].filter(Boolean);
              return (
                <tr key={u.id} className="is-static">
                  <td>
                    <div className="opsx-user">
                      <div className="opsx-avatar">
                        {u.photoURL ? <img src={u.photoURL} alt="" loading="lazy" /> : <Icon name="user" size={14} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="opsx-cell-main">{u.nickname || '(닉네임 없음)'}</div>
                        <div className="opsx-cell-sub opsx-uid" title={u.id}>{u.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {!u.hubId && <span className="opsx-cell-sub">—</span>}
                    {u.hubId && hubName && (
                      <button type="button" className="opsx-link" onClick={() => onOpenHub(u.hubId)}>{hubName}</button>
                    )}
                    {u.hubId && !hubName && (
                      <span className="opsx-badge tone-red" title={u.hubId}>없는 허브</span>
                    )}
                  </td>
                  <td className="opsx-col-hide-sm opsx-cell-sub">{tiers.length ? tiers.join(' · ') : '—'}</td>
                  <td className="opsx-num"><b>{u.recommendCount}</b></td>
                  <td className="opsx-cell-sub">{formatRelative(toMs(u.updatedAt))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && !filtered.length && (
          <div className="opsx-empty">{users.length ? '조건에 맞는 유저가 없습니다.' : '아직 등록된 유저 문서가 없습니다.'}</div>
        )}
        {loading && !snapshot && <div className="opsx-empty">유저를 불러오는 중…</div>}

        {filtered.length > PAGE_SIZE && (
          <div className="opsx-pager">
            <button type="button" className="opsx-ghost" disabled={pageSafe <= 1} onClick={() => setPage(pageSafe - 1)}>이전</button>
            <span className="opsx-muted">{pageSafe} / {totalPages} 페이지 · {filtered.length}명</span>
            <button type="button" className="opsx-ghost" disabled={pageSafe >= totalPages} onClick={() => setPage(pageSafe + 1)}>다음</button>
          </div>
        )}
      </div>
    </div>
  );
}
