import { useEffect, useState } from 'react';
import { listAllHubs, listHubMembers, superKickMember } from '../../lib/hubOversee';
import { useLounge } from '../../context/LoungeContext';
import Icon from '../../components/icons/Icon';

const ROLE_LABEL = { master: '길드마스터', admin: '관리자', member: '길드원' };

export default function HubOversee({ onOpenHub }) {
  const { enterHubAsSuperAdmin } = useLounge();
  const [hubs, setHubs] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [members, setMembers] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const loadHubs = async (cancelled) => {
    setErr('');
    try {
      const list = await listAllHubs();
      if (cancelled?.current) return;
      setHubs(list);
      if (list.length && !list.some((h) => h.id === selectedId)) {
        setSelectedId(list[0].id);
      }
    } catch (e) {
      if (cancelled?.current) return;
      setErr(e?.message || '허브 목록을 읽을 수 없습니다.');
    }
  };

  useEffect(() => {
    const cancelled = { current: false };
    loadHubs(cancelled);
    return () => { cancelled.current = true; };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setMembers([]);
      return undefined;
    }
    let cancelled = false;
    listHubMembers(selectedId).then((list) => {
      if (!cancelled) setMembers(list);
    }).catch((e) => {
      if (!cancelled) setErr(e?.message || '멤버를 읽을 수 없습니다.');
    });
    return () => { cancelled = true; };
  }, [selectedId]);

  const selected = hubs.find((h) => h.id === selectedId) || null;

  const onKick = async (member) => {
    if (!selectedId) return;
    if (!window.confirm(`${member.nickname} 님을 추방할까요?`)) return;
    setBusy(true);
    setErr('');
    try {
      await superKickMember(selectedId, member.id, member.role);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    } catch (e) {
      setErr(e?.message || '추방에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const onOpen = () => {
    if (!selectedId) return;
    enterHubAsSuperAdmin(selectedId);
    onOpenHub?.();
  };

  return (
    <div className="luxury-panel" style={{ padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--gold-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="fortress" size={16} /> 길드 허브 감독
        </h2>
        <button type="button" onClick={loadHubs} style={ghostBtn}>새로고침</button>
      </div>
      {err && <div style={{ color: 'var(--accent-red)', fontWeight: 800, marginBottom: 12 }}>{err}</div>}

      {!hubs.length && (
        <p style={{ color: '#94a3b8', fontSize: 13 }}>아직 생성된 허브가 없습니다.</p>
      )}

      <div className="ops-hub-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {hubs.map((hub) => {
            const on = hub.id === selectedId;
            return (
              <button
                key={hub.id}
                type="button"
                onClick={() => setSelectedId(hub.id)}
                className="luxury-panel"
                style={{
                  textAlign: 'left', padding: 12, cursor: 'pointer',
                  border: on ? '1px solid var(--gold-primary)' : '1px solid var(--border-subtle)',
                  background: on ? 'rgba(236,232,224,0.12)' : 'rgba(0,0,0,0.25)',
                }}
              >
                <div style={{ fontWeight: 900, color: '#fff' }}>{hub.name || '(이름 없음)'}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{hub.inviteCode}</div>
              </button>
            );
          })}
        </div>

        {selected && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>멤버 {members.length}명</div>
              </div>
              <button type="button" className="btn-ops" onClick={onOpen}>허브 열기</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: '#94a3b8', borderBottom: '1px solid var(--border-gold)' }}>
                  <th style={{ textAlign: 'left', padding: 8 }}>닉네임</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>역할</th>
                  <th style={{ padding: 8 }} />
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: 8, color: '#fff', fontWeight: 800 }}>{m.nickname}</td>
                    <td style={{ padding: 8, color: 'var(--accent-cyan)' }}>{ROLE_LABEL[m.role] || m.role}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>
                      {m.role !== 'master' && (
                        <button type="button" disabled={busy} onClick={() => onKick(m)} style={kickBtn}>추방</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const ghostBtn = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-gold)',
  background: 'transparent', color: '#e2e8f0', fontWeight: 800, cursor: 'pointer',
};
const kickBtn = {
  padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.5)',
  background: 'rgba(239,68,68,0.12)', color: '#fecaca', fontWeight: 800, cursor: 'pointer',
};
