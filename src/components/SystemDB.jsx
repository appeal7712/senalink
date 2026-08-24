import { useState } from 'react';
import { systemRulesData } from '../data/systemRules';
import Icon from './icons/Icon';

export default function SystemDB() {
  const [activeSubTab, setActiveSubTab] = useState('mechanics'); // mechanics, potential, effects
  const [effectCategory, setEffectCategory] = useState('cc'); // cc, dot, survival, utility

  const { system_rules, exclusive_equipment_stats, potential_system, effects_registry } = systemRulesData;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 시스템 DB 서브 탭 서브 네비게이션 */}
      <div className="luxury-panel dex-system-nav" style={{ padding: '12px 20px', display: 'flex', gap: '10px' }}>
        {[
          { id: 'mechanics', icon: 'swords', label: '전투 메커니즘 & 판정 룰' },
          { id: 'potential', icon: 'orb',    label: '잠재능력 & 전용 장비' },
          { id: 'effects',   icon: 'sparkle',label: '상태이상 & 특수 효과 도감' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveSubTab(t.id)}
            className={`nav-tab-btn${activeSubTab === t.id ? ' active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name={t.icon} size={14} color={activeSubTab === t.id ? '#161616' : 'rgba(255,255,255,0.8)'} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 1. 전투 메커니즘 & 판정 룰 ── */}
      {activeSubTab === 'mechanics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 속공 판정 룰 */}
          <div className="luxury-panel" style={{ padding: '24px', borderLeft: '4px solid var(--gold-primary)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--gold-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="bolt" size={16} /> {system_rules.speed_attack.name} 시스템 판정 공식
            </h3>
            <p style={{ fontSize: '15px', color: '#f8fafc', lineHeight: '1.7', margin: 0, fontWeight: 700 }}>
              {system_rules.speed_attack.description}
            </p>
          </div>

          {/* 피해 타입 판정 (치명타, 막기, 약점공격) */}
          <div className="dex-rule-trio">
            {/* 치명타 */}
            <div className="luxury-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#facc15', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="target" size={15} /> {system_rules.damage_types.critical.name}</span>
                <span style={{ fontSize: '12px', color: '#e2e8f0' }}>Cap: 0~100%</span>
              </div>
              <div style={{ fontSize: '14px', color: '#f8fafc', lineHeight: '1.6', fontWeight: 700 }}>
                • <strong>치명타 피해 한도:</strong> {system_rules.damage_types.critical.critical_damage_cap.min} ~ {system_rules.damage_types.critical.critical_damage_cap.max}
              </div>
              <div style={{ fontSize: '14px', color: '#f8fafc', background: 'rgba(255,255,255,0.07)', padding: '10px', borderRadius: '8px' }}>
                {system_rules.damage_types.critical.description}
              </div>
            </div>

            {/* 막기 */}
            <div className="luxury-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#38bdf8', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="shield" size={15} /> {system_rules.damage_types.block.name}</span>
                <span style={{ fontSize: '12px', color: '#e2e8f0' }}>Cap: 0~100%</span>
              </div>
              <div style={{ fontSize: '14px', color: '#f8fafc', background: 'rgba(255,255,255,0.07)', padding: '10px', borderRadius: '8px', lineHeight: '1.6', fontWeight: 700 }}>
                {system_rules.damage_types.block.effect}
              </div>
            </div>

            {/* 약점 공격 */}
            <div className="luxury-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#f43f5e', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="target" size={15} /> {system_rules.damage_types.weak_point.name}</span>
                <span style={{ fontSize: '12px', color: '#e2e8f0' }}>Cap: 0~100%</span>
              </div>
              <div style={{ fontSize: '14px', color: '#f8fafc', background: 'rgba(255,255,255,0.07)', padding: '10px', borderRadius: '8px', lineHeight: '1.6', fontWeight: 700 }}>
                {system_rules.damage_types.weak_point.effect}
              </div>
            </div>
          </div>

          {/* 효과 적중 & 저항 & 적용 확률 */}
          <div className="luxury-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--gold-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="flask" size={16} /> 효과 적중 & 저항 공식
            </h3>
            <div className="system-effect-prob-grid">
              <div className="system-effect-prob-card">
                <div className="system-effect-prob-title system-effect-prob-title--hit"><Icon name="target" size={13} /> 효과 적중</div>
                <div className="system-effect-prob-body">{system_rules.effect_probability.effect_hit}</div>
              </div>
              <div className="system-effect-prob-card">
                <div className="system-effect-prob-title system-effect-prob-title--res"><Icon name="shield" size={13} /> 효과 저항</div>
                <div className="system-effect-prob-body">{system_rules.effect_probability.effect_res}</div>
              </div>
              <div className="system-effect-prob-card">
                <div className="system-effect-prob-title system-effect-prob-title--apply"><Icon name="sparkle" size={13} /> 효과 적용 확률</div>
                <div className="system-effect-prob-body">{system_rules.effect_probability.effect_apply}</div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── 2. 잠재능력 & 전용 장비 ── */}
      {activeSubTab === 'potential' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 잠재능력 시스템 요약 */}
          <div className="luxury-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--gold-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="orb" size={16} /> 잠재능력 개방 및 강화 수치표
            </h3>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', fontSize: '14px', color: '#f8fafc', fontWeight: 700 }}>
              <div>• <strong>해금 조건:</strong> <span style={{ color: 'var(--accent-cyan)' }}>{potential_system.unlock_condition}</span></div>
              <div>• <strong>필요 재료:</strong> <span style={{ color: 'var(--gold-light)' }}>{potential_system.materials.join(', ')}</span></div>
            </div>

            {/* 단계별 수치 테이블 */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'center' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.08)', borderBottom: '2px solid var(--border-gold)', color: 'var(--gold-primary)' }}>
                  <th style={{ padding: '12px' }}>잠재 레벨</th>
                  <th style={{ padding: '12px' }}>달성 조건</th>
                  <th style={{ padding: '12px' }}>소모 재료</th>
                  <th style={{ padding: '12px' }}>공격력 증가</th>
                  <th style={{ padding: '12px' }}>방어력 증가</th>
                  <th style={{ padding: '12px' }}>생명력 증가</th>
                </tr>
              </thead>
              <tbody>
                {potential_system.levels.map(lvl => (
                  <tr key={lvl.level} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '12px', fontWeight: 900, color: 'var(--gold-primary)' }}>Lv.{lvl.level}</td>
                    <td style={{ padding: '12px', color: '#fff', fontWeight: 800 }}>{lvl.condition}</td>
                    <td style={{ padding: '12px', color: 'var(--accent-cyan)' }}>
                      {lvl.cost.element > 0 ? `상급 원소 ${lvl.cost.element}개 + ` : ''}불씨 {lvl.cost.embers}개
                    </td>
                    <td style={{ padding: '12px', fontWeight: 900, color: '#f87171' }}>+{lvl.stat_bonus.atk}</td>
                    <td style={{ padding: '12px', fontWeight: 900, color: '#60a5fa' }}>+{lvl.stat_bonus.def}</td>
                    <td style={{ padding: '12px', fontWeight: 900, color: '#4ade80' }}>+{lvl.stat_bonus.hp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 전용 장비 스탯 옵션 4종 */}
          <div className="luxury-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--gold-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="medal" size={16} /> 전용 장비 특수 옵션 (4종)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {Object.entries(exclusive_equipment_stats).map(([k, v]) => (
                <div key={k} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border-gold)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--gold-primary)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name="medal" size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 900, color: '#fff' }}>{k}</div>
                    <div style={{ fontSize: '14px', color: '#f1f5f9', marginTop: '2px', fontWeight: 700, lineHeight: 1.5 }}>{v}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ── 3. 상태이상 & 특수 효과 도감 ── */}
      {activeSubTab === 'effects' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 4대 카테고리 필터 탭 — 유리(glass) 세그먼트 */}
          <div className="dex-effect-cats luxury-panel" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '10px 12px' }}>
            {[
              { id: 'cc',       label: `행동 제어 (CC ${effects_registry.cc_effects.length}종)`, icon: 'bolt' },
              { id: 'dot',      label: `지속 피해 (DoT ${effects_registry.dot_effects.length}종)`, icon: 'flame' },
              { id: 'survival', label: `생존 효과 (${effects_registry.survival_effects.length}종)`, icon: 'shield' },
              { id: 'utility',  label: `특수 유틸리티 (${effects_registry.special_utility.length}종)`, icon: 'sparkle' },
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setEffectCategory(cat.id)}
                className={`nav-tab-btn${effectCategory === cat.id ? ' active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Icon name={cat.icon} size={13} color={effectCategory === cat.id ? '#161616' : 'rgba(255,255,255,0.88)'} />
                {cat.label}
              </button>
            ))}
          </div>

          {/* 카테고리별 그리드 카드 목록 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {effectCategory === 'cc' && effects_registry.cc_effects.map((item, idx) => (
              <div key={idx} className="luxury-panel" style={{ padding: '18px', borderLeft: '4px solid #f87171' }}>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#fff', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{item.name}</span>
                  <span style={{ fontSize: '11px', background: 'rgba(248,113,113,0.2)', color: '#f87171', padding: '2px 8px', borderRadius: '4px' }}>{item.category}</span>
                </div>
                <div style={{ fontSize: '14px', color: '#f8fafc', lineHeight: '1.65', fontWeight: 700 }}>{item.description}</div>
              </div>
            ))}

            {effectCategory === 'dot' && effects_registry.dot_effects.map((item, idx) => (
              <div key={idx} className="luxury-panel" style={{ padding: '18px', borderLeft: '4px solid #fb7185' }}>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#fff', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{item.name}</span>
                  <span style={{ fontSize: '11px', background: 'rgba(251,113,133,0.2)', color: '#fb7185', padding: '2px 8px', borderRadius: '4px' }}>{item.category}</span>
                </div>
                <div style={{ fontSize: '14px', color: '#f8fafc', lineHeight: '1.65', fontWeight: 700 }}>{item.description}</div>
              </div>
            ))}

            {effectCategory === 'survival' && effects_registry.survival_effects.map((item, idx) => (
              <div key={idx} className="luxury-panel" style={{ padding: '18px', borderLeft: '4px solid #38bdf8' }}>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#fff', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{item.name}</span>
                  <span style={{ fontSize: '11px', background: 'rgba(56,189,248,0.2)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px' }}>{item.category}</span>
                </div>
                <div style={{ fontSize: '14px', color: '#f8fafc', lineHeight: '1.65', fontWeight: 700 }}>{item.description}</div>
              </div>
            ))}

            {effectCategory === 'utility' && effects_registry.special_utility.map((item, idx) => (
              <div key={idx} className="luxury-panel" style={{ padding: '18px', borderLeft: '4px solid var(--gold-primary)' }}>
                <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--gold-primary)', marginBottom: '6px' }}>
                  {item.name}
                </div>
                <div style={{ fontSize: '14px', color: '#f8fafc', lineHeight: '1.65', fontWeight: 700 }}>{item.description}</div>
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
}
