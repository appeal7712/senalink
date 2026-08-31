import { useEffect, useState } from 'react';
import { heroes } from '../data/heroes';
import { ROLE_ICONS } from '../data/roleIcons';
import Icon from './icons/Icon';
import { useSiteMain } from '../lib/siteMain';
import { recordSiteVisitOnce, subscribeSiteVisitStats } from '../lib/siteVisitStats';
import GuildRankBoard from './GuildRankBoard';
import MetaDeckCarousel, { MetaDeckCard } from './MetaDeckCarousel';
import ContentSeasonBadges from './ContentSeasonBadges';

const ROLE_LABEL_KR = { offensive: '공격형', magic: '마법형', defensive: '방어형', support: '지원형', universal: '만능형' };

const resolveHeroByName = (name) => {
  if (!name) return null;
  const clean = String(name).replace('(각성)', '').trim();
  return heroes.find((h) => h.name === name)
    || heroes.find((h) => h.name.replace('(각성)', '').trim() === clean)
    || null;
};

export default function PublicMainDashboard({ onNavigateToLounge, onNavigateToCommunity }) {
  const { content, loaded } = useSiteMain();
  const [visits, setVisits] = useState({ total: 0, dayCount: 0 });
  const metaDecks = (content.metaDecks || []).filter(
    (d) => String(d.title || '').trim() || (d.heroNames || []).some((n) => String(n || '').trim())
  );
  const pickRates = content.pickRates || [];
  const news = content.news || [];

  useEffect(() => {
    const unsub = subscribeSiteVisitStats(
      (data) => setVisits({ total: data.total, dayCount: data.dayCount }),
      () => {},
    );
    recordSiteVisitOnce().catch(() => {});
    return unsub;
  }, []);

  if (!loaded) {
    return (
      <div className="container fade-in page-section" aria-busy="true">
        <div className="luxury-panel hero-banner hero-banner--center" style={{ minHeight: 180, opacity: 0.55 }}>
          <div className="hero-copy">
            <div style={{ height: 28, width: 200, background: 'rgba(255,255,255,0.14)', borderRadius: 6, margin: '0 auto 14px' }} />
            <div style={{ height: 14, width: '55%', background: 'rgba(255,255,255,0.08)', borderRadius: 4, margin: '0 auto' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container fade-in page-section">
      <div className="luxury-panel hero-banner hero-banner--center">
        <div className="hero-copy">
          <h1 className="hero-lockup">
            <img
              className="hero-game-logo"
              src="/images/brand/seven-knights-rebirth.png"
              alt="세븐나이츠 리버스"
            />
            <span className="hero-lockup-rule" aria-hidden="true" />
            <span className="hero-site-name">세나링크<span>.</span></span>
          </h1>
          <p className="hero-subhead">
            {content.subhead}
          </p>
          <p className="hero-visit-stats" aria-label="방문자 수">
            오늘 방문자 {visits.dayCount.toLocaleString('ko-KR')}
            <span aria-hidden="true"> · </span>
            전체 {visits.total.toLocaleString('ko-KR')}
          </p>

          <div className="hero-cta-row">
            <button type="button" className="btn-ops" onClick={onNavigateToLounge}>
              <Icon name="fortress" size={16} color="#161616" /> 길드 허브 입장하기 <Icon name="arrowRight" size={15} color="#161616" />
            </button>
            <button type="button" className="btn-ops" onClick={onNavigateToCommunity}>
              <Icon name="users" size={16} color="#161616" /> 공용 허브 입장하기 <Icon name="arrowRight" size={15} color="#161616" />
            </button>
          </div>
        </div>
      </div>

      <ContentSeasonBadges />

      <div className="luxury-panel meta-deck-board">
        <h3 className="meta-deck-board-title">
          <Icon name="metaDeck" size={19} /> 결투장 & 상급결투장 메타 덱
        </h3>

        <div className="meta-deck-row meta-deck-row--desktop">
          {metaDecks.map((deck) => (
            <MetaDeckCard key={deck.id} deck={deck} />
          ))}
        </div>

        <MetaDeckCarousel decks={metaDecks} />
      </div>

      <GuildRankBoard />

      <div className="grid-2-responsive">
        <div className="luxury-panel main-side-panel">
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '8px', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="pvpPickRate" size={17} /> PVP 영웅 기용률 TOP 5
          </h3>
          <div className="rank-list">
            <div className="rank-head">
              <span>순위</span>
              <span>영웅</span>
              <span>기용률</span>
            </div>
            {pickRates.filter((h) => h.name).slice(0, 5).map((h, i) => {
              const heroData = resolveHeroByName(h.name);
              const role = heroData?.role || h.role || 'offensive';
              return (
                <div key={i} className={`rank-row${i < 3 ? ' is-lead' : ''}`}>
                  <span className={`rank-num${i < 3 ? ' gold' : ''}`}>
                    {i < 3 ? <Icon name={`pickRate${i + 1}`} size={30} /> : i + 1}
                  </span>
                  <div>
                    <div className="rank-member-name">{h.name}</div>
                    <div className="rank-member-meta" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <img src={ROLE_ICONS[role]} alt="" style={{ width: 13, height: 13 }} />
                      {ROLE_LABEL_KR[role]}
                    </div>
                  </div>
                  <div className="rank-pts">
                    {h.pickRate}
                    <span>승률 {h.winRate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="luxury-panel main-side-panel">
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f6f3ee', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.03em', flexShrink: 0 }}>
            <Icon name="news" size={17} /> 세나리 뉴스 & 패치 브리핑
          </h3>
          <div className="main-news-scroller">
            {news.filter((n) => n.title).map((n) => {
              const url = n.url || n.link || '';
              const body = String(n.body || '').trim();
              return (
                <div key={n.id} className="main-news-card">
                  <div className="main-news-card-top">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10px', background: 'rgba(236,232,224,0.12)', color: 'var(--gold-light)', padding: '3px 8px', fontWeight: 600, borderRadius: 999 }}>{n.tag || '라운지'}</span>
                        {n.date ? <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>{n.date}</span> : null}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>{n.title}</div>
                    </div>
                    {url ? (
                      <a
                        href={url.startsWith('http') ? url : `https://${url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ops"
                        style={{ flexShrink: 0, fontSize: 12, padding: '8px 12px', textDecoration: 'none' }}
                      >
                        열기
                      </a>
                    ) : null}
                  </div>
                  {body ? (
                    <div className="main-news-card-body">{body}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
