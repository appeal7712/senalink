import { useState } from 'react';
import Icon from '../../components/icons/Icon';

const tabs = [
  { id: 'pve', label: 'PvE 공략', icon: 'flask' },
  { id: 'pvp', label: 'PvP 공략', icon: 'swords' },
];

export default function CommunityPage() {
  const [tab, setTab] = useState('pve');

  return (
    <div className="container fade-in" style={{ paddingTop: 32, paddingBottom: 60 }}>
      <div className="luxury-panel" style={{
        textAlign: 'center', padding: '36px 24px', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span className="ops-tag" style={{ marginBottom: 12 }}>Community Hub</span>
        <h1 className="hero-headline" style={{ margin: '0 0 8px', fontSize: 22 }}>공용 허브</h1>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
          길드 가입과 관계없이 모두가 공략을 공유할 수 있는 공간입니다.
        </p>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
          {tabs.map((t) => (
            <button key={t.id} type="button"
              className={`nav-tab-btn${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px' }}>
              <Icon name={t.icon} size={14} />
              {t.label}
            </button>
          ))}
        </div>

        <div style={{
          padding: '48px 24px', borderRadius: 16,
          background: 'var(--glass-inset)', border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <Icon name="clock" size={28} color="rgba(255,255,255,0.25)" />
          <p style={{ margin: '14px 0 0', fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>
            준비 중입니다
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>
            {tab === 'pve' ? 'PvE 공략 게시판이 곧 추가됩니다.' : 'PvP 공략 게시판이 곧 추가됩니다.'}
          </p>
        </div>
      </div>
    </div>
  );
}
