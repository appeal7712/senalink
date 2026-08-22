import InGameDeckCard from './InGameDeckCard';
import { heroes } from '../data/heroes';
import { pets } from '../data/pets';
import { ROLE_ICONS } from '../data/roleIcons';
import Icon from './icons/Icon';
import { useSiteMain } from '../lib/siteMain';
import GuildRankBoard from './GuildRankBoard';
import { metaDeckKindTheme } from './ArenaDeckKind';

const resolveHeroByName = (name) => {
  if (!name) return null;
  const clean = String(name).replace('(각성)', '').trim();
  return heroes.find(h => h.name === name)
    || heroes.find(h => h.name.replace('(각성)', '').trim() === clean)
    || null;
};

const resolvePetById = (petId) => pets.find(p => p.id === petId) || pets[0];

const ROLE_LABEL_KR = { offensive: '공격형', magic: '마법형', defensive: '방어형', support: '지원형', universal: '만능형' };

export default function PublicMainDashboard({ onNavigateToLounge }) {
  const { content } = useSiteMain();
  const metaDecks = (content.metaDecks || []).filter(
    (d) => String(d.title || '').trim() || (d.heroNames || []).some((n) => String(n || '').trim())
  );
  const pickRates = content.pickRates || [];
  const news = content.news || [];

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

          <button className="btn-ops" onClick={onNavigateToLounge}
            style={{ fontSize: '15px', padding: '12px 22px' }}>
            <Icon name="fortress" size={16} color="#161616" /> 길드 허브 입장하기 <Icon name="arrowRight" size={15} color="#161616" />
          </button>
        </div>
      </div>

      <div className="luxury-panel meta-deck-board">
        <h3 className="meta-deck-board-title">
          <Icon name="flame" size={19} /> 결투장 & 상급결투장 메타 덱
        </h3>

        <div className="meta-deck-row">
          {metaDecks.map(deck => {
            const kind = metaDeckKindTheme(deck.kind);
            return (
            <div key={deck.id} className="meta-deck-item">
              <div className="meta-deck-copy">
                <div className="meta-deck-tags">
                  <span
                    className="kind-pill kind-pill--sm"
                    style={{ background: kind.pill, color: kind.id === 'hybrid' ? '#161616' : undefined }}
                  >
                    {kind.label}
                  </span>
                  <span style={{ background: 'var(--gold-primary)', color: '#000', fontSize: '10px', fontWeight: 900, padding: '2px 6px', borderRadius: '4px' }}>{deck.tier}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--gold-light)', fontWeight: 800 }}>
                    <Icon name="chart" size={12} /> 픽률 {deck.usageRate}
                  </span>
                </div>
                <h4 className="meta-deck-title">{deck.title}</h4>
              </div>
              <div className="meta-deck-visual">
                <InGameDeckCard
                  embedded
                  teamName=""
                  formationId={deck.formationId}
                  petObj={resolvePetById(deck.petId)}
                  heroList={(deck.heroNames || []).map((name, idx) => {
                    const baseHero = resolveHeroByName(name);
                    return baseHero ? { hero: baseHero, gearConfig: (deck.heroGearConfigs || [])[idx] } : name;
                  })}
                  contentMode={(deck.speedOrderNames && deck.speedOrderNames.length) ? 'pve' : 'pvp'}
                  reservedSkills={deck.reservedSkills || deck.skillSequence || []}
                  speedOrderNames={deck.speedOrderNames}
                  speedIgnoredNames={deck.speedIgnoredNames}
                  pvpMode={deck.mode}
                />
              </div>
            </div>
            );
          })}
        </div>
      </div>

      <GuildRankBoard />

      {/* 3. 2열 그리드: 영웅 픽률 랭킹 & 세나리 패치 뉴스 */}
      <div className="grid-2-responsive">
        
        {/* 영웅 픽률 TOP 5 */}
        <div className="luxury-panel main-side-panel">
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '8px', letterSpacing: '-0.03em' }}>
            결투장 & 상급결투장 기용률 TOP 5
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
                <span className={`rank-num${i < 3 ? ' gold' : ''}`}>{i + 1}</span>
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

        {/* 세나리 최신 패치 뉴스 */}
        <div className="luxury-panel main-side-panel">
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f6f3ee', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.03em', flexShrink: 0 }}>
            <Icon name="news" size={17} /> 세나리 뉴스 & 패치 브리핑
          </h3>
          <div className="main-news-scroller">
            {news.filter((n) => n.title).map(n => {
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
