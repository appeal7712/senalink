import { useState, useEffect } from 'react';
import { heroes } from '../data/heroes';
import { skillKeywords, EFFECT_KEYWORDS } from '../data/keywords';
import Icon from './icons/Icon';
import SafeImg from './icons/SafeImg';
import AwakenMark from './AwakenMark';

const ROLE_ICON = {
  offensive: '/images/common/공격형 아이콘.png',
  defensive: '/images/common/방어형 아이콘.png',
  magic:     '/images/common/마법형 아이콘.png',
  support:   '/images/common/지원형 아이콘.png',
  universal: '/images/common/만능형 아이콘.png',
};

const CORNER_BORDER = {
  old_seven:    '/images/common/구 세븐나이츠 전용 테두리.png',
  special:      '/images/common/스페셜 영웅 테두리.png',
  semi_special: null,
  normal:       null,
};

const CARD_BG = {
  old_seven:    'linear-gradient(180deg, #fde047 0%, #ca8a04 100%)',
  special:      'linear-gradient(180deg, #facc15 0%, #ca8a04 100%)',
  semi_special: 'linear-gradient(180deg, #facc15 0%, #d97706 100%)',
  normal:       'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
};

// Rich Text 렌더러
function renderRichText(text) {
  if (!text) return null;
  const lines = text.split('\n');

  return lines.map((line, lIdx) => {
    const targetMatch = line.match(/^\[(.*?)\]$/);
    if (targetMatch) {
      const label = targetMatch[1];
      // 적군 디버프/타겟 = 빨강, 아군 버프/타겟 = 파랑 (유리 말고 단색 알약)
      const isAlly  = /아군|자신/.test(label);
      const isEnemy = !isAlly && /적/.test(label);
      const bg = isEnemy ? '#ff7a7a' : isAlly ? '#5eb0ff' : '#cbd5e1';
      return (
        <span
          key={lIdx}
          className="kind-pill kind-pill--sm"
          style={{ background: bg, whiteSpace: 'normal', margin: '4px 0 2px', alignSelf: 'flex-start' }}
        >
          {label}
        </span>
      );
    }

    const numSplitRegex = /(\d+%(?:\s*확률)?|\d+회|\d+턴|\d+중첩|\d+명|\d+개|\d+초|\d+마다|\d+레벨)/g;
    const numTestRegex = /^(?:\d+%(?:\s*확률)?|\d+회|\d+턴|\d+중첩|\d+명|\d+개|\d+초|\d+마다|\d+레벨)$/;
    const sortedKw = [...EFFECT_KEYWORDS, ...Object.keys(skillKeywords)].sort((a, b) => b.length - a.length);
    const kwPattern = new RegExp(`(${sortedKw.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');

    const kwParts = line.split(kwPattern);

    return (
      <div key={lIdx} style={{ marginBottom: '4px', lineHeight: '1.6' }}>
        {kwParts.map((part, kIdx) => {
          if (sortedKw.includes(part)) {
            return (
              <span key={kIdx} style={{ color: 'var(--accent-cyan)', fontWeight: 800, padding: '0 2px' }} title={skillKeywords[part] || ''}>
                {part}
              </span>
            );
          }

          const numParts = part.split(numSplitRegex);
          return numParts.map((sub, nIdx) => {
            if (numTestRegex.test(sub)) {
              return <span key={nIdx} style={{ color: 'var(--gold-primary)', fontWeight: 800, padding: '0 1px' }}>{sub}</span>;
            }
            return <span key={nIdx}>{sub}</span>;
          });
        })}
      </div>
    );
  });
}

export default function HeroDB() {
  const [activeTab, setActiveTab]         = useState('special');
  const [activeFaction, setActiveFaction] = useState('세븐나이츠');
  const [activeRoleFilter, setActiveRoleFilter] = useState('all');
  const [selectedHero, setSelectedHero]   = useState(null);
  const [searchTerm, setSearchTerm]       = useState('');
  const [activeSkillIdx, setActiveSkillIdx] = useState(0);

  const tabFactions = {
    special: ['세븐나이츠', '(구)세븐나이츠', '다크나이츠', '사황', '(구)사황', '나이트크로우', '루미너스 혁명단', '천상의 수호자', '펜타곤', '숨은강자들', '경계의 수호자', '????'],
    normal:  ['에반 원정대', '그림자단', '모험가', '성십자단', '테라영지'],
    asgard:  ['신비의 숲', '침묵의 광산', '화염의 사막', '암흑의 무덤', '용의 유적지', '복주자의 지옥'],
    aisha:   ['달빛의 섬', '천자의 땅', '어둠의 안식처', '신지', '삼국호걸'],
    other:   ['콜라보레이션', '기타 영웅'],
  };

  useEffect(() => {
    const list = tabFactions[activeTab] || [];
    if (list.length > 0) setActiveFaction(list[0]);
  }, [activeTab]);

  const filteredHeroes = heroes.filter(h => {
    const q = searchTerm.toLowerCase().trim();
    if (q) return h.name.toLowerCase().includes(q) || (h.title || '').toLowerCase().includes(q);
    const matchesCategory = h.category === activeTab;
    const matchesFaction  = h.group === activeFaction;
    const role            = h.role || h.type || 'offensive';
    const matchesRole     = activeRoleFilter === 'all' ? true : role === activeRoleFilter;
    return matchesCategory && matchesFaction && matchesRole;
  });

  useEffect(() => {
    const first = filteredHeroes[0] || null;
    setSelectedHero(first);
    setActiveSkillIdx(0);
  }, [activeTab, activeFaction, activeRoleFilter, searchTerm]);

  const handleSelectHero = (h) => {
    setSelectedHero(h);
    setActiveSkillIdx(0);
  };

  const getRole = (h) => h.role || h.type || 'offensive';

  const getSkillCategoryName = (skill, idx) => {
    if (skill.type === 'basic_attack') return '기본 공격';
    if (skill.type === 'passive')      return '패시브';
    if (skill.type === 'awaken_skill') return '각성';
    if (skill.direction === 'upper')   return '스킬1';
    if (skill.direction === 'down')    return '스킬2';
    return `스킬${idx + 1}`;
  };

  const selectedSkill = selectedHero?.skills?.[activeSkillIdx] || selectedHero?.skills?.[0] || null;
  const fullSkillText = selectedSkill ? ((selectedSkill.description || '') + ' ' + (selectedSkill.skillEnhance || []).join(' ') + ' ' + Object.values(selectedSkill.transcendenceEffects || {}).join(' ')) : '';
  const rawTooltipsObj = selectedSkill?.tooltips || {};
  const activeTooltips = {};
  Object.entries(rawTooltipsObj).forEach(([k, v]) => { if (fullSkillText.includes(k)) activeTooltips[k] = v; });
  const activeGlobalMatches = Object.keys(skillKeywords).filter(k => fullSkillText.includes(k) && !activeTooltips[k]);

  return (
    <div className="container fade-in dex-hero-page" style={{ padding: '16px 24px 60px' }}>
      
      {/* 1. 대분류 탭 & 검색바 */}
      <div className="luxury-panel dex-hero-toolbar" style={{ padding: '16px 24px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--gold-primary)', marginRight: '8px' }}>영웅 도감</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
          {[
            { id: 'special', label: '스페셜 영웅' },
            { id: 'normal',  label: '일반 영웅' },
            { id: 'asgard',  label: '아스드 대륙' },
            { id: 'aisha',   label: '아이사 대륙' },
            { id: 'other',   label: '기타 (콜라보)' },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} className={`nav-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}>
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="text"
            className="form-input dex-hero-search"
            style={{ padding: '10px 18px', fontSize: '13px', width: '240px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff', borderRadius: '999px' }}
            placeholder="영웅 이름 검색..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 2. 역할군 공용 아이콘 필터 */}
      <div className="luxury-panel dex-hero-roles" style={{ padding: '12px 24px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--gold-primary)', marginRight: '6px' }}>역할군 속성:</span>
        {[
          { id: 'all',       label: '전체' },
          { id: 'offensive', label: '공격형' },
          { id: 'magic',     label: '마법형' },
          { id: 'defensive', label: '방어형' },
          { id: 'support',   label: '지원형' },
          { id: 'universal', label: '만능형' },
        ].map(role => {
          const isActive = activeRoleFilter === role.id;
          return (
            <button key={role.id} onClick={() => setActiveRoleFilter(role.id)}
              className={`nav-tab-btn${isActive ? ' active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {role.id !== 'all' && <img src={ROLE_ICON[role.id]} alt="" style={{ width: '16px', height: '16px' }} />}
              {role.label}
            </button>
          );
        })}
      </div>

      {/* 3. 파노라마 3열 도감 뷰포트 (영웅 수량 뱃지 100% 삭제!) */}
      <div className="hero-db-grid">
        
        {/* Col 1: 수직 세력 사이드바 (수량 뱃지 제거!) */}
        <div className="luxury-panel hero-db-factions" style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div className="hero-db-factions-label" style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: 900, paddingLeft: '8px', marginBottom: '8px', letterSpacing: '2px' }}>
            FACTIONS
          </div>
          {tabFactions[activeTab]?.map(faction => {
            const isActive = activeFaction === faction;
            return (
              <button key={faction} className="hero-db-faction-btn" onClick={() => { setActiveFaction(faction); setSearchTerm(''); }}
                style={{
                  textAlign: 'left', padding: '12px 14px', fontSize: '14px', fontWeight: 800,
                  borderRadius: '8px', cursor: 'pointer', transition: 'all 0.18s ease',
                  background: isActive ? 'rgba(255,255,255,0.86)' : 'transparent',
                  color: isActive ? '#161616' : 'rgba(255,255,255,0.88)',
                  border: isActive ? '1px solid transparent' : '1px solid transparent'
                }}>
                {faction}
              </button>
            );
          })}
        </div>

        {/* Col 2: 영웅 목록 선택 카드 (수량 뱃지 제거!) */}
        <div className="luxury-panel hero-db-list" style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column' }}>
          <div className="hero-db-hero-grid" style={{
            flex: 1, overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
            gap: '14px 12px',
            padding: '4px 4px 8px',
            alignItems: 'start',
            justifyItems: 'center',
          }}>
            {filteredHeroes.map(h => {
              const role       = getRole(h);
              const tier       = h.cardTier || 'normal';
              const isSelected = selectedHero?.id === h.id;

              return (
                <div key={h.id} onClick={() => handleSelectHero(h)}
                  style={{
                    width: '100%', maxWidth: '100px', cursor: 'pointer',
                    borderRadius: '10px', overflow: 'hidden',
                    boxSizing: 'border-box',
                    border: isSelected ? '2px solid var(--gold-primary)' : '2px solid rgba(255,255,255,0.14)',
                    boxShadow: isSelected ? '0 0 0 1px rgba(236,232,224,0.35), 0 8px 18px rgba(0,0,0,0.45)' : '0 4px 8px rgba(0,0,0,0.4)',
                    background: '#07090e',
                  }}>

                  <div style={{
                    position: 'relative', width: '100%', aspectRatio: '88 / 98',
                    background: CARD_BG[tier], overflow: 'hidden',
                  }}>
                    {h.isAwakened && (
                      <AwakenMark size={23} style={{ top: 3, left: 3 }} />
                    )}
                    <SafeImg src={h.portraitUrl} alt={h.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
                    {CORNER_BORDER[tier] && <img src={CORNER_BORDER[tier]} alt="" style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '40px', pointerEvents: 'none' }} />}
                    {ROLE_ICON[role] && <img src={ROLE_ICON[role]} alt="" style={{ position: 'absolute', bottom: '3px', left: '3px', width: '18px', height: '18px', filter: 'drop-shadow(0 2px 4px #000)' }} />}
                  </div>

                  <div style={{
                    background: 'rgba(0,0,0,0.88)', padding: '6px 4px', textAlign: 'center', fontSize: '11px', color: '#ffffff', fontWeight: 800,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2,
                  }}>
                    {h.name.replace('(각성)', '')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Col 3: 영웅 상세 & 스킬/효과 사전 뷰포트 */}
        <div className="luxury-panel hero-db-detail" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {selectedHero ? (
            <div className="fade-in" key={selectedHero.id}>
              
              {/* 프로필 헤더 */}
              <div style={{ display: 'flex', gap: '18px', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
                <div style={{
                  position: 'relative', flexShrink: 0, width: '90px', height: '90px', borderRadius: '12px', overflow: 'hidden',
                  border: selectedHero.isAwakened ? '3px solid var(--accent-purple)' : '3px solid var(--gold-primary)',
                  boxShadow: 'var(--shadow-gold)'
                }}>
                  <SafeImg src={selectedHero.portraitUrl} alt={selectedHero.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'var(--gold-primary)', fontWeight: 800 }}>{selectedHero.group}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '2px 0' }}>
                    <h3 style={{ fontSize: '24px', fontWeight: 900, color: '#fff' }}>{selectedHero.name.replace('(각성)', '')}</h3>
                    {selectedHero.isAwakened && <AwakenMark size={26} corner={false} />}
                  </div>
                </div>
              </div>

              {/* 스킬 탭 */}
              <div style={{ marginBottom: '16px', width: '100%' }}>
                <div style={{ fontSize: '13px', color: 'var(--gold-primary)', fontWeight: 800, marginBottom: '10px' }}>스킬</div>
                <div className="hero-db-skills">
                  {selectedHero.skills.map((skill, idx) => {
                    const isActive = activeSkillIdx === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => setActiveSkillIdx(idx)}
                        className={`hero-db-skill${isActive ? ' is-on' : ''}`}
                      >
                        <div className="hero-db-skill-face">
                          <SafeImg src={skill.iconUrl} alt={skill.name} fallbackIcon="swords" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <span className="hero-db-skill-name">{skill.name}</span>
                        <span className="hero-db-skill-type">{getSkillCategoryName(skill, idx)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 스킬 본문 + 효과 사전 패널 */}
              {selectedSkill && (
                <div style={{ display: 'grid', gridTemplateColumns: (Object.keys(activeTooltips).length > 0 || activeGlobalMatches.length > 0) ? '1fr 1.3fr' : '1fr', gap: '16px' }}>
                  
                  {(Object.keys(activeTooltips).length > 0 || activeGlobalMatches.length > 0) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontSize: '13px', color: 'var(--gold-primary)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Icon name="book" size={13} /> 효과
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
                        {Object.entries(activeTooltips).map(([term, def]) => (
                          <div key={term} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', padding: '10px 12px', borderRadius: '16px' }}>
                            <div style={{ fontSize: '13px', color: 'var(--gold-primary)', fontWeight: 900 }}>{term}</div>
                            <div style={{ fontSize: '12px', color: '#e2e8f0', marginTop: '4px' }}>{renderRichText(def)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--accent-cyan)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="swords" size={13} /> 스킬 설명
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ fontSize: '17px', fontWeight: 900, color: '#fff' }}>{selectedSkill.name}</div>
                      <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: '1.7' }}>{renderRichText(selectedSkill.description)}</div>
                    </div>
                  </div>

                </div>
              )}

            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '120px 0', color: '#94a3b8' }}>영웅을 선택하세요.</div>
          )}
        </div>

      </div>

    </div>
  );
}
