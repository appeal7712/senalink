import { useState, useEffect } from 'react';
import { heroes, HERO_FACTION_ORDER } from '../data/heroes';
import Icon from './icons/Icon';
import SafeImg from './icons/SafeImg';
import HeroPortraitCard from './HeroPortraitCard';
import SkillRichText, { SkillUpgradeBlocks } from './SkillRichText';

const ROLE_ICON = {
  offensive: '/images/common/공격형 아이콘.png',
  defensive: '/images/common/방어형 아이콘.png',
  magic:     '/images/common/마법형 아이콘.png',
  support:   '/images/common/지원형 아이콘.png',
  universal: '/images/common/만능형 아이콘.png',
};

export default function HeroDB() {
  const [activeTab, setActiveTab]         = useState('special');
  const [activeFaction, setActiveFaction] = useState(HERO_FACTION_ORDER.special[0]);
  const [activeRoleFilter, setActiveRoleFilter] = useState('all');
  const [selectedHero, setSelectedHero]   = useState(null);
  const [searchTerm, setSearchTerm]       = useState('');
  const [activeSkillIdx, setActiveSkillIdx] = useState(0);

  const tabFactions = HERO_FACTION_ORDER;

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
        
        {/* Col 1: 수직 세력 사이드바 */}
        <div className="luxury-panel hero-db-factions" style={{ padding: '16px 12px', gap: '6px' }}>
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
                  border: isActive ? '1px solid transparent' : '1px solid transparent',
                  flexShrink: 0,
                }}>
                {faction}
              </button>
            );
          })}
        </div>

        {/* Col 2: 영웅 목록 — 카드 비율 유지, 칸이 모자라면 내부 스크롤 */}
        <div className="luxury-panel hero-db-list" style={{ padding: '18px 16px' }}>
          <div className="hero-db-hero-grid">
            {filteredHeroes.map(h => {
              const isSelected = selectedHero?.id === h.id;

              return (
                <button
                  key={h.id}
                  type="button"
                  className={`hero-db-pick${isSelected ? ' is-on' : ''}`}
                  onClick={() => handleSelectHero(h)}
                >
                  <HeroPortraitCard
                    hero={h}
                    showStars={false}
                    showRole
                    showName
                    cropNameBar={false}
                  />
                </button>
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
                <div style={{ width: '90px', flexShrink: 0, containerType: 'inline-size' }}>
                  <HeroPortraitCard
                    hero={selectedHero}
                    showStars={false}
                    showRole
                    showName
                    cropNameBar={false}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'var(--gold-primary)', fontWeight: 800 }}>{selectedHero.group}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '2px 0' }}>
                    <h3 style={{
                      fontSize: '24px',
                      fontWeight: 900,
                      color: selectedHero.isAwakened ? '#e9d5ff' : '#fff',
                      textShadow: selectedHero.isAwakened
                        ? '0 0 8px rgba(192,132,252,0.9), 0 0 18px rgba(168,85,247,0.55)'
                        : undefined,
                    }}>
                      {selectedHero.name.replace('(각성)', '')}
                    </h3>
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
                          <SafeImg src={skill.iconUrl} alt={skill.name} fallbackIcon="swords" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <span className="hero-db-skill-name">{skill.name}</span>
                        <span className="hero-db-skill-type">{getSkillCategoryName(skill, idx)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 스킬 본문 — 인라인 툴팁 + 강화/초월 */}
              {selectedSkill && (
                <div className="hero-db-skill-inline">
                  <div className="hero-db-skill-inline-head">
                    <Icon name="swords" size={13} /> 스킬 설명
                    <span className="hero-db-skill-inline-hint">효과 글자에 올려보거나 탭하세요</span>
                  </div>
                  <div className="hero-db-skill-inline-card">
                    <div className="hero-db-skill-inline-title">{selectedSkill.name}</div>
                    {selectedSkill.cooldown > 0 ? (
                      <div className="hero-db-skill-inline-cd">쿨타임 {selectedSkill.cooldown}</div>
                    ) : null}
                    <SkillRichText
                      text={selectedSkill.description}
                      skillTooltips={selectedSkill.tooltips || {}}
                    />
                    <SkillUpgradeBlocks skill={selectedSkill} />
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
