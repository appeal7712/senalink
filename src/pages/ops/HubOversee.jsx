import { useMemo, useRef, useState } from 'react';
import { superKickMember } from '../../lib/hubOversee';
import { useLounge } from '../../context/LoungeContext';
import Icon from '../../components/icons/Icon';
import {
  daysUntilPurge, formatDate, formatRelative, toMs,
} from '../../lib/opsInsights';
import { MAX_HUB_MEMBERS } from '../../data/loungeMeta';

const ROLE_LABEL = { master: '길드마스터', admin: '관리자', member: '길드원' };
const PAGE_SIZE = 20;
const PURGE_WARN_DAYS = 14;

const SORTS = [
  { id: 'members', label: '인원 많은 순' },
  { id: 'activity', label: '최근 활동 순' },
  { id: 'created', label: '최근 개설 순' },
  { id: 'name', label: '이름 순' },
];

const FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'full', label: '만석' },
  { id: 'solo', label: '1명' },
  { id: 'idle', label: '30일+ 비활동' },
  { id: 'purge', label: '정리 임박' },
];

function matchFilter(hub, filter) {
  if (filter === 'full') return hub.memberCount >= MAX_HUB_MEMBERS;
  if (filter === 'solo') return hub.memberCount <= 1;
  if (filter === 'idle') {
    const left = daysUntilPurge(hub);
    return left != null && left <= 30;
  }
  if (filter === 'purge') {
    const left = daysUntilPurge(hub);
    return left != null && left <= PURGE_WARN_DAYS;
  }
  return true;
}

function sortHubs(list, sort) {
  const out = [...list];
  if (sort === 'members') out.sort((a, b) => b.memberCount - a.memberCount || b.activityMs - a.activityMs);
  else if (sort === 'activity') out.sort((a, b) => b.activityMs - a.activityMs);
  else if (sort === 'created') out.sort((a, b) => b.createdMs - a.createdMs);
  else out.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ko'));
  return out;
}

export default function HubOversee({
  snapshot, loading, error, onReload, onOpenHub, focusHubId, onMemberRemoved,
}) {
  const { enterHubAsSuperAdmin } = useLounge();
  const [selectedId, setSelectedId] = useState(focusHubId || null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('members');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const detailRef = useRef(null);

  const hubs = useMemo(() => snapshot?.hubs || [], [snapshot]);
  const membersByHub = snapshot?.membersByHub || {};

  const filterCounts = useMemo(() => {
    const counts = {};
    FILTERS.forEach((f) => { counts[f.id] = hubs.filter((h) => matchFilter(h, f.id)).length; });
    return counts;
  }, [hubs]);

  const filtered = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    const list = hubs.filter((h) => {
      if (!matchFilter(h, filter)) return false;
      if (!q) return true;
      return String(h.name || '').toLowerCase().includes(q)
        || String(h.inviteCode || '').toLowerCase().includes(q)
        || String(h.masterNickname || '').toLowerCase().includes(q)
        || String(h.affiliation || '').toLowerCase().includes(q);
    });
    return sortHubs(list, sort);
  }, [hubs, query, filter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageSlice = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const resetPageAnd = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const selected = hubs.find((h) => h.id === selectedId) || null;
  const members = selected ? (membersByHub[selected.id] || []) : [];
  const memberLoadFailed = selected && (snapshot?.failedHubIds || []).includes(selected.id);

  const onKick = async (member) => {
    if (!selected) return;
    if (!window.confirm(`「${selected.name}」에서 ${member.nickname} 님을 추방할까요?`)) return;
    setBusy(true);
    setErr('');
    try {
      await superKickMember(selected.id, member.id, member.role);
      onMemberRemoved?.(selected.id, member.id);
    } catch (e) {
      setErr(e?.message || '추방에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const onSelectRow = (hubId) => {
    const next = hubId === selectedId ? null : hubId;
    setSelectedId(next);
    if (next && window.matchMedia('(max-width: 1100px)').matches) {
      requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const onOpen = () => {
    if (!selected) return;
    enterHubAsSuperAdmin(selected.id);
    onOpenHub?.();
  };

  return (
    <div className="luxury-panel opsx-panel">
      <div className="opsx-head">
        <h2 className="opsx-title"><Icon name="hub" size={16} /> 길드 허브 감독</h2>
        <div className="opsx-head-actions">
          {snapshot && <span className="opsx-muted">허브 {hubs.length}개 · 불러온 시각 {formatRelative(snapshot.loadedAt)}</span>}
          <button type="button" className="opsx-ghost" onClick={onReload} disabled={loading}>
            {loading ? '불러오는 중…' : '새로고침'}
          </button>
        </div>
      </div>
      {(error || err) && <div className="opsx-error">{err || error}</div>}

      <div className="opsx-toolbar">
        <div className="opsx-search">
          <Icon name="search" size={14} />
          <input
            type="search"
            value={query}
            onChange={(e) => resetPageAnd(setQuery)(e.target.value)}
            placeholder="허브 이름 · 길드마스터 · 초대코드 · 소속"
            aria-label="허브 검색"
          />
        </div>
        <select className="opsx-select" value={sort} onChange={(e) => resetPageAnd(setSort)(e.target.value)} aria-label="정렬">
          {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      <div className="opsx-chips" role="tablist" aria-label="허브 필터">
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

      <div className={`opsx-split${selected ? ' has-detail' : ''}`}>
        <div className="opsx-table-wrap">
          <table className="opsx-table">
            <thead>
              <tr>
                <th>허브</th>
                <th>인원</th>
                <th className="opsx-col-hide-sm">길드마스터</th>
                <th>최근 활동</th>
                <th className="opsx-col-hide-sm">개설일</th>
              </tr>
            </thead>
            <tbody>
              {pageSlice.map((h) => {
                const left = daysUntilPurge(h);
                const warn = left != null && left <= PURGE_WARN_DAYS;
                return (
                  <tr
                    key={h.id}
                    className={h.id === selectedId ? 'is-selected' : ''}
                    onClick={() => onSelectRow(h.id)}
                  >
                    <td>
                      <div className="opsx-cell-main">{h.name || '(이름 없음)'}</div>
                      <div className="opsx-cell-sub">{[h.affiliation, h.inviteCode].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td>
                      <div className="opsx-count">
                        <span className="opsx-fill"><span style={{ width: `${Math.min(100, (h.memberCount / MAX_HUB_MEMBERS) * 100)}%` }} /></span>
                        <b>{h.memberCount}</b><span className="opsx-cell-sub">/{MAX_HUB_MEMBERS}</span>
                      </div>
                    </td>
                    <td className="opsx-col-hide-sm">{h.masterNickname || '—'}</td>
                    <td>
                      <div>{formatRelative(h.activityMs)}</div>
                      {warn && <span className="opsx-badge tone-red">정리 {left <= 0 ? '오늘' : `D-${left}`}</span>}
                    </td>
                    <td className="opsx-col-hide-sm opsx-cell-sub">{formatDate(h.createdMs)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && !filtered.length && (
            <div className="opsx-empty">{hubs.length ? '조건에 맞는 허브가 없습니다.' : '아직 생성된 허브가 없습니다.'}</div>
          )}
          {loading && !snapshot && <div className="opsx-empty">허브와 길드원을 불러오는 중…</div>}

          {filtered.length > PAGE_SIZE && (
            <div className="opsx-pager">
              <button type="button" className="opsx-ghost" disabled={pageSafe <= 1} onClick={() => setPage(pageSafe - 1)}>이전</button>
              <span className="opsx-muted">{pageSafe} / {totalPages} 페이지 · {filtered.length}개</span>
              <button type="button" className="opsx-ghost" disabled={pageSafe >= totalPages} onClick={() => setPage(pageSafe + 1)}>다음</button>
            </div>
          )}
        </div>

        {selected && (
          <aside className="opsx-detail" ref={detailRef}>
            <div className="opsx-detail-head">
              <div style={{ minWidth: 0 }}>
                <div className="opsx-detail-name">{selected.name || '(이름 없음)'}</div>
                <div className="opsx-cell-sub">
                  {[selected.affiliation, selected.inviteCode].filter(Boolean).join(' · ')}
                </div>
              </div>
              <button type="button" className="opsx-icon-btn" onClick={() => setSelectedId(null)} aria-label="상세 닫기">
                <Icon name="close" size={14} />
              </button>
            </div>

            <div className="opsx-detail-stats">
              <div><span>인원</span><b>{selected.memberCount}/{MAX_HUB_MEMBERS}</b></div>
              <div><span>관리자</span><b>{selected.adminCount}</b></div>
              <div><span>최근 활동</span><b>{formatRelative(selected.activityMs)}</b></div>
              <div><span>개설일</span><b>{formatDate(selected.createdMs)}</b></div>
            </div>

            {Array.isArray(selected.tags) && selected.tags.length > 0 && (
              <div className="opsx-tags">
                {selected.tags.map((t) => <span key={t}>#{t}</span>)}
              </div>
            )}

            <button type="button" className="btn-ops opsx-open-btn" onClick={onOpen}>
              <Icon name="door" size={15} color="#161616" /> 이 허브 열기
            </button>

            <div className="opsx-subtitle" style={{ margin: '16px 0 8px' }}>길드원 {members.length}명</div>
            {memberLoadFailed && <div className="opsx-error">이 허브의 길드원 목록을 읽지 못했습니다. 새로고침해 주세요.</div>}
            <div className="opsx-member-list">
              {members.map((m) => (
                <div key={m.id} className="opsx-member">
                  <div className="opsx-avatar">
                    {m.avatarURL ? <img src={m.avatarURL} alt="" loading="lazy" /> : <Icon name="user" size={14} />}
                  </div>
                  <div className="opsx-member-main">
                    <div className="opsx-member-name">
                      {m.nickname || '(닉네임 없음)'}
                      <span className={`opsx-role role-${m.role}`}>{ROLE_LABEL[m.role] || m.role}</span>
                    </div>
                    <div className="opsx-cell-sub">
                      가입 {formatDate(toMs(m.joinedAt))} · 활동 {formatRelative(toMs(m.lastActiveAt))}
                    </div>
                  </div>
                  {m.role !== 'master' && (
                    <button type="button" className="opsx-kick" disabled={busy} onClick={() => onKick(m)}>추방</button>
                  )}
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
