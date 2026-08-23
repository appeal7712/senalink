import { useEffect, useMemo, useState } from 'react';
import { listUsersForOps } from '../../lib/userOversee';
import Icon from '../../components/icons/Icon';

const PAGE_SIZE = 20;

const ghostBtn = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-gold)',
  background: 'transparent', color: '#e2e8f0', fontWeight: 800, cursor: 'pointer',
};

function formatUpdated(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return String(iso).slice(0, 16);
  }
}

export default function UserOversee() {
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = async (cancelled) => {
    setErr('');
    setLoading(true);
    try {
      const list = await listUsersForOps();
      if (cancelled?.current) return;
      setUsers(list);
    } catch (e) {
      if (cancelled?.current) return;
      setErr(e?.message || '유저 목록을 읽을 수 없습니다.');
    } finally {
      if (!cancelled?.current) setLoading(false);
    }
  };

  useEffect(() => {
    const cancelled = { current: false };
    load(cancelled);
    return () => { cancelled.current = true; };
  }, []);

  const inHub = useMemo(() => users.filter((u) => u.hubId).length, [users]);
  const noHub = users.length - inHub;

  const filtered = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const nick = String(u.nickname || '').toLowerCase();
      const id = String(u.id || '').toLowerCase();
      const hub = String(u.hubId || '').toLowerCase();
      return nick.includes(q) || id.includes(q) || hub.includes(q);
    });
  }, [users, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageSlice = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, pageSafe]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    if (page !== pageSafe) setPage(pageSafe);
  }, [page, pageSafe]);

  const rangeFrom = filtered.length ? (pageSafe - 1) * PAGE_SIZE + 1 : 0;
  const rangeTo = Math.min(pageSafe * PAGE_SIZE, filtered.length);

  return (
    <div className="luxury-panel" style={{ padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--gold-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="user" size={16} /> 유저 감독
        </h2>
        <button type="button" onClick={() => load({ current: false })} style={ghostBtn}>새로고침</button>
      </div>

      {err && <div style={{ color: 'var(--accent-red)', fontWeight: 800, marginBottom: 12 }}>{err}</div>}

      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16,
      }}>
        {[
          { label: '등록 유저', value: users.length },
          { label: '허브 소속', value: inHub },
          { label: '미소속', value: noHub },
        ].map((s) => (
          <div
            key={s.label}
            className="glass-inset"
            style={{ padding: '10px 14px', minWidth: 110, borderRadius: 12 }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8' }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginTop: 2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="ops-hub-toolbar" style={{ marginBottom: 12 }}>
        <input
          type="search"
          className="ops-hub-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="닉네임 · UID · hubId 검색"
          aria-label="유저 검색"
        />
        <div className="ops-hub-pager">
          <span className="ops-hub-pager-meta">
            {loading
              ? '불러오는 중…'
              : (filtered.length
                ? `${rangeFrom}–${rangeTo} / ${filtered.length}`
                : '결과 없음')}
            {!loading && filtered.length > 0 ? ` · ${pageSafe}/${totalPages}` : ''}
          </span>
          <button type="button" style={ghostBtn} disabled={pageSafe <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            이전
          </button>
          <button type="button" style={ghostBtn} disabled={pageSafe >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            다음
          </button>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ color: '#94a3b8', borderBottom: '1px solid var(--border-gold)' }}>
            <th style={{ textAlign: 'left', padding: 8 }}>닉네임</th>
            <th style={{ textAlign: 'left', padding: 8 }}>허브</th>
            <th style={{ textAlign: 'right', padding: 8 }}>추천</th>
            <th style={{ textAlign: 'left', padding: 8 }}>갱신</th>
          </tr>
        </thead>
        <tbody>
          {pageSlice.map((u) => (
            <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td style={{ padding: 8, color: '#fff', fontWeight: 800 }}>
                {u.nickname || '(닉네임 없음)'}
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginTop: 2, wordBreak: 'break-all' }}>{u.id}</div>
              </td>
              <td style={{ padding: 8, color: u.hubId ? 'var(--accent-cyan)' : '#64748b', fontWeight: 700, fontSize: 12 }}>
                {u.hubId || '—'}
              </td>
              <td style={{ padding: 8, textAlign: 'right', color: '#e2e8f0', fontWeight: 800 }}>
                {u.recommendCount}
              </td>
              <td style={{ padding: 8, color: '#94a3b8', fontSize: 12 }}>
                {formatUpdated(u.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!loading && !users.length && !err && (
        <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 12 }}>아직 등록된 유저 문서가 없습니다.</p>
      )}
    </div>
  );
}
