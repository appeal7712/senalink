import { useEffect, useRef, useState } from 'react';
import Icon from '../../components/icons/Icon';
import CommunityPvePanel from './CommunityPvePanel';
import CommunityPvpPanel from './CommunityPvpPanel';
import CommunityTierPanel from './CommunityTierPanel';

const tabs = [
  { id: 'pvp', label: 'PvP 공략', hint: '결투장 · 상급 · 총력전', icon: 'pvp' },
  { id: 'pve', label: 'PvE 공략', hint: '레이드 · 돌발 · 성장던전', icon: 'pve' },
  { id: 'tierlist', label: '티어 리스트', hint: 'PVE · PVP 영웅 티어', icon: 'chart' },
];

export default function CommunityPage() {
  const [tab, setTab] = useState(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!tab || !bodyRef.current) return;
    // 레이아웃 반영 후 스크롤 — 모바일에서 버튼만 바뀌고 아래로 안 가는 느낌 방지
    const id = window.requestAnimationFrame(() => {
      bodyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(id);
  }, [tab]);

  return (
    <div className="container fade-in community-page">
      <div className="luxury-panel community-hero">
        <div className="community-hero-intro">
          <span className="ops-tag" style={{ marginBottom: 12 }}>Community Hub</span>
          <h1 className="community-hero-title">공용 허브</h1>
          <p className="community-hero-copy">
            PvP는 누구나 덱을 공유할 수 있고, PvE·티어리스트는 운영진이 관리합니다.
            <br />
            나만의 덱을 공유해 보세요!
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
                <Icon name={t.icon} size={22} />
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
        <div className="community-body" ref={bodyRef}>
          {tab === 'pvp' && <CommunityPvpPanel />}
          {tab === 'pve' && <CommunityPvePanel />}
          {tab === 'tierlist' && <CommunityTierPanel />}
        </div>
      )}
    </div>
  );
}
