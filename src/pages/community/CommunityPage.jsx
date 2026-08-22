import { useState } from 'react';
import Icon from '../../components/icons/Icon';
import CommunityPvePanel from './CommunityPvePanel';
import CommunityPvpPanel from './CommunityPvpPanel';
import CommunityTierPanel from './CommunityTierPanel';

const tabs = [
  { id: 'pvp', label: 'PvP 공략', hint: '결투장 · 상급 · 총력전', icon: 'swords' },
  { id: 'pve', label: 'PvE 공략', hint: '레이드 · 돌발 · 성장던전', icon: 'flask' },
  { id: 'tierlist', label: '티어 리스트', hint: 'PVE · PVP 영웅 티어', icon: 'chart' },
];

export default function CommunityPage() {
  const [tab, setTab] = useState(null);

  return (
    <div className="container fade-in community-page">
      <div className="luxury-panel community-hero">
        <div className="community-hero-intro">
          <span className="ops-tag" style={{ marginBottom: 12 }}>Community Hub</span>
          <h1 className="community-hero-title">공용 허브</h1>
          <p className="community-hero-copy">
            누구나 덱을 공유할 수 있다.
            <br />
            나만의 덱을 공유 해보세요!
          </p>
        </div>

        <div className="community-hero-gates" role="tablist" aria-label="공용 허브 공략">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`glass-inset community-hero-gate${tab === t.id ? ' is-on' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span className="community-hero-gate-icon" aria-hidden>
                <Icon name={t.icon} size={22} color="#fff" />
              </span>
              <span className="community-hero-gate-copy">
                <span className="community-hero-gate-label">{t.label}</span>
                <span className="community-hero-gate-hint">{t.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {tab && (
        <div className="community-body">
          {tab === 'pvp' && <CommunityPvpPanel />}
          {tab === 'pve' && <CommunityPvePanel />}
          {tab === 'tierlist' && <CommunityTierPanel />}
        </div>
      )}
    </div>
  );
}
