import { useState, useEffect } from 'react';
import Icon from './icons/Icon';
import SafeImg from './icons/SafeImg';
import HeroGridPicker from './HeroGridPicker';
import InGameDeckCard from './InGameDeckCard';
import HeroGearPanel, { emptyGearConfig } from './HeroGearPanel';
import StrategyActionBar from './StrategyActionBar';
import PvpModeToggle, { PvpModeBadge, PVP_MODE_COLOR } from './PvpModeToggle';
import { pets } from '../data/pets';
import { backdropDismissProps } from '../utils/backdropDismiss';
import { closeOverlayFromUI, collapseOverlayHistory, pushOverlay } from '../utils/overlayHistory';
import ModalScrim from './ModalScrim';

const emptyHeroSlot = () => ({ primaryName: '', altText: '' });
const emptySlots5 = () => [emptyHeroSlot(), emptyHeroSlot(), emptyHeroSlot(), emptyHeroSlot(), emptyHeroSlot()];
const emptyGear5 = () => [emptyGearConfig(), emptyGearConfig(), emptyGearConfig(), emptyGearConfig(), emptyGearConfig()];

const emptySetting = () => ({
  mode: '속공',
  reservedSkills: [],
  gearPriorityNote: '',
  accessoryNote: '',
  otherDetail: '',
  speedMin: '',
  speedMax: '',
  heroGearConfigs: emptyGear5(),
});

const normalizeFormationId = (id) => {
  if (id === '2f1b') return 'protect';
  if (id === '1f2b') return 'basic';
  return id || 'protect';
};

const padSlots5 = (slots = []) => {
  const next = slots.map(s => ({ primaryName: s?.primaryName || '', altText: s?.altText || '' }));
  while (next.length < 5) next.push(emptyHeroSlot());
  return next.slice(0, 5);
};

const resolvePet = (petId) => pets.find(p => p.id === petId) || pets[0];

/** 구버전 variants[] → 덱당 세팅 1개로 평탄화 */
const flattenDefense = (d = {}) => {
  const v = Array.isArray(d.variants) && d.variants.length ? d.variants[0] : {};
  const gearSrc = d.heroGearConfigs || v.heroGearConfigs;
  return {
    ...d,
    mode: d.mode || v.mode || '속공',
    reservedSkills: [...(d.reservedSkills || v.reservedSkills || [])],
    gearPriorityNote: d.gearPriorityNote ?? v.gearPriorityNote ?? '',
    accessoryNote: d.accessoryNote ?? v.accessoryNote ?? '',
    otherDetail: d.otherDetail ?? v.otherDetail ?? '',
    speedMin: d.speedMin ?? v.speedMin ?? '',
    speedMax: d.speedMax ?? v.speedMax ?? '',
    heroGearConfigs: (gearSrc && gearSrc.length === 5)
      ? gearSrc.map(g => ({ ...emptyGearConfig(), ...g }))
      : emptyGear5(),
  };
};

function TierStars({ tier, onChange, readOnly = false }) {
  return (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} onClick={() => !readOnly && onChange && onChange(n)}
          style={{ cursor: readOnly ? 'default' : 'pointer', color: n <= tier ? 'var(--gold-primary)' : 'rgba(255,255,255,0.15)', fontSize: readOnly ? '15px' : '22px', lineHeight: 1 }}>
          ★
        </span>
      ))}
    </div>
  );
}

function ModeToggle({ mode, onChange }) {
  return <PvpModeToggle mode={mode} onChange={onChange} />;
}

function DefenseInfoCell({ icon, label, color, text }) {
  const empty = !String(text || '').trim();
  return (
    <div style={{
      minWidth: 0,
      flex: 1,
      padding: '10px 12px',
      borderRadius: '10px',
      background: 'rgba(255,255,255,0.035)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderLeft: `3px solid ${color}`,
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        color, fontSize: '11px', fontWeight: 800, letterSpacing: '0.2px'
      }}>
        <Icon name={icon} size={12} color={color} />
        {label}
      </div>
      <div style={{
        fontSize: '13px', fontWeight: 700, lineHeight: 1.5, whiteSpace: 'pre-line',
        color: empty ? '#64748b' : '#e2e8f0',
      }}>
        {empty ? '—' : text}
      </div>
    </div>
  );
}

function DefenseDeckEditor({
  slots, formationId, onFormationChange, onChange, heroes,
  gearConfigs, onGearConfigsChange,
  petObj, onPetChange,
  reservedSkills, onReservationChange,
}) {
  const [slotIdx, setSlotIdx] = useState(0);
  const heroNames = slots.map(s => s?.primaryName || '');
  const filledCount = heroNames.filter(Boolean).length;

  const pickHero = (name) => {
    const next = [...slots];
    const current = next[slotIdx]?.primaryName;
    if (!current && filledCount >= 3) {
      alert('길드전은 최대 3명까지 배치할 수 있습니다.\n빈 칸이 아닌 기존 영웅을 교체하세요.');
      return;
    }
    next[slotIdx] = { ...(next[slotIdx] || emptyHeroSlot()), primaryName: name };
    onChange(next);
    const nextEmpty = next.findIndex((s, i) => i > slotIdx && !s?.primaryName);
    if (nextEmpty !== -1 && next.filter(s => s?.primaryName).length < 3) setSlotIdx(nextEmpty);
  };

  const placeHeroAt = (toIdx, name) => {
    const next = [...slots];
    const current = next[toIdx]?.primaryName;
    const filled = next.filter(s => s?.primaryName).length;
    if (!current && filled >= 3) {
      alert('길드전은 최대 3명까지 배치할 수 있습니다.\n빈 칸이 아닌 기존 영웅을 교체하세요.');
      return;
    }
    const existingIdx = next.findIndex((s, i) => i !== toIdx && s?.primaryName === name);
    if (existingIdx !== -1) {
      const tmp = next[toIdx];
      next[toIdx] = next[existingIdx];
      next[existingIdx] = tmp;
    } else {
      next[toIdx] = { ...(next[toIdx] || emptyHeroSlot()), primaryName: name };
    }
    onChange(next);
    setSlotIdx(toIdx);
  };

  const handleHeroDrop = (payload, toIdx) => {
    if (payload?.source === 'slot' && typeof payload.fromIdx === 'number') {
      const next = [...slots];
      const tmp = next[toIdx];
      next[toIdx] = next[payload.fromIdx];
      next[payload.fromIdx] = tmp;
      onChange(next);
      setSlotIdx(toIdx);
      return;
    }
    if (payload?.source === 'picker' && payload.name) {
      placeHeroAt(toIdx, payload.name);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: 800 }}>
        배치 {filledCount}/3 · 드래그로 배치/교체 · 펫/진형은 덱 카드에서 변경
      </div>
      <div className="pvp-deck-editor-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', justifySelf: 'center', width: '100%', maxWidth: '300px' }}>
          <InGameDeckCard
            teamName=""
            formationId={formationId}
            heroList={heroNames}
            slotCount={5}
            maxHeroes={3}
            contentMode="pvp"
            isEditMode
            isSelected
            selectedSlotIdx={slotIdx}
            onSlotClick={setSlotIdx}
            onFormationChange={onFormationChange}
            petObj={petObj}
            onPetChange={onPetChange}
            onHeroDrop={handleHeroDrop}
            reservedSkills={reservedSkills}
            onReservationChange={onReservationChange}
          />
        </div>
        <HeroGearPanel
          heroNames={heroNames}
          configs={gearConfigs}
          selectedIdx={slotIdx}
          onSelectIdx={setSlotIdx}
          onChange={onGearConfigsChange}
        />
      </div>
      <HeroGridPicker heroes={heroes} selectedNames={heroNames.filter(Boolean)} onPick={pickHero} height={160} currentSlotName={heroNames[slotIdx] || ''} />
    </div>
  );
}

export default function GuildWarDefensePanel({ gwDefenses, setGwDefenses, guildRoom, onBuildHistory, resolveHeroByName, heroes }) {
  const [expandedId, setExpandedId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(null);

  const closeDefenseModal = () => closeOverlayFromUI(() => setIsModalOpen(false));

  useEffect(() => {
    if (!isModalOpen) return;
    pushOverlay(() => setIsModalOpen(false));
  }, [isModalOpen]);

  const openCreate = () => {
    setForm({
      id: null,
      title: '',
      tier: 3,
      formationId: 'protect',
      petId: pets[0]?.id || null,
      heroSlots: emptySlots5(),
      ...emptySetting(),
    });
    setIsModalOpen(true);
  };

  const openEdit = (raw) => {
    const d = flattenDefense(raw);
    setForm({
      id: d.id,
      title: d.title || '',
      tier: d.tier,
      formationId: normalizeFormationId(d.formationId),
      petId: d.petId || pets[0]?.id || null,
      heroSlots: padSlots5(d.heroSlots),
      mode: d.mode === '내실' ? '내실' : '속공',
      reservedSkills: d.reservedSkills,
      gearPriorityNote: d.gearPriorityNote,
      accessoryNote: d.accessoryNote,
      otherDetail: d.otherDetail,
      speedMin: d.speedMin,
      speedMax: d.speedMax,
      heroGearConfigs: d.heroGearConfigs,
    });
    setIsModalOpen(true);
  };

  const save = () => {
    if (!form.title?.trim()) {
      alert('방어 덱 이름을 입력해 주세요!');
      return;
    }
    const filled = form.heroSlots.filter(s => s.primaryName).length;
    if (filled < 1) {
      alert('최소 1명 이상의 영웅을 지정해 주세요!');
      return;
    }
    if (filled > 3) {
      alert('길드전은 최대 3명까지 배치할 수 있습니다!');
      return;
    }
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const payload = {
      title: form.title.trim(),
      tier: form.tier,
      formationId: form.formationId,
      petId: form.petId,
      heroSlots: form.heroSlots,
      mode: form.mode === '내실' ? '내실' : '속공',
      reservedSkills: (form.reservedSkills || []).filter(Boolean),
      gearPriorityNote: form.gearPriorityNote || '',
      accessoryNote: form.accessoryNote || '',
      otherDetail: form.otherDetail || '',
      speedMin: form.speedMin || '',
      speedMax: form.speedMax || '',
      heroGearConfigs: form.heroGearConfigs || emptyGear5(),
      author: guildRoom.myNickname,
      updatedAt: now,
    };
    if (form.id) {
      setGwDefenses(prev => prev.map(d => {
        if (d.id !== form.id) return d;
        const { variants, ...rest } = d;
        void variants;
        return { ...rest, ...payload };
      }));
      onBuildHistory?.('update_build', payload.title, '길드전 방어');
    } else {
      const newEntry = { id: 'gwd_' + Date.now(), ...payload };
      setGwDefenses(prev => [...prev, newEntry]);
      setExpandedId(newEntry.id);
      onBuildHistory?.('create_build', payload.title, '길드전 방어');
    }
    setIsModalOpen(false);
    collapseOverlayHistory();
  };

  const remove = (id) => {
    if (!confirm('이 방어 세팅을 삭제할까요?')) return;
    const target = gwDefenses.find(d => d.id === id);
    setGwDefenses(prev => prev.filter(d => d.id !== id));
    onBuildHistory?.('delete_build', target?.title || id, '길드전 방어');
  };

  const patchForm = (updates) => setForm(prev => ({ ...prev, ...updates }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <StrategyActionBar
        icon="shield"
        title="길드전 3v3 방어 공략"
        hint="덱당 최대 3명 배치 · 속공/내실 세팅"
        actionLabel="방어덱 추가"
        onAction={openCreate}
      />

      {gwDefenses.length === 0 && (
        <div className="luxury-panel" style={{ padding: '40px', textAlign: 'center', color: '#fff', fontWeight: 700 }}>등록된 방어 공략이 없습니다. 위 「방어덱 추가」로 등록해 보세요.</div>
      )}

      <div className="gw-defense-grid">
      {gwDefenses.slice().sort((a, b) => b.tier - a.tier).map(raw => {
        const d = flattenDefense(raw);
        const isExpanded = expandedId === d.id;
        const slots = padSlots5(d.heroSlots);
        const heroNames5 = slots.map(s => s.primaryName);
        const mode = d.mode === '내실' ? '내실' : '속공';
        return (
          <div key={d.id} className="luxury-panel gw-defense-card">
            <div
              className={`gw-defense-head${isExpanded ? ' is-on' : ''}`}
              onClick={() => setExpandedId(isExpanded ? null : d.id)}
            >
              {!isExpanded && (
                <>
                  <div className="gw-defense-heroes">
                    {slots.filter(s => s.primaryName).map((s, i) => {
                      const h = resolveHeroByName(s.primaryName);
                      return (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '48px' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '10px', overflow: 'hidden', border: '1.5px solid var(--border-gold)', background: '#0a0d14', flexShrink: 0 }}>
                            {h && <SafeImg src={h.portraitUrl} alt={h.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />}
                          </div>
                          <span style={{
                            fontSize: '11px', fontWeight: 800, color: '#fff', marginTop: '4px',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            maxWidth: '100%', textAlign: 'center', lineHeight: 1.2
                          }}>
                            {s.primaryName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <span className="gw-defense-rule">|</span>
                  <div className="gw-defense-mode-tier">
                    <PvpModeBadge mode={mode} size="sm" />
                    <TierStars tier={d.tier} readOnly />
                  </div>
                </>
              )}

              {isExpanded && (
                <div className="gw-defense-meta">
                  <div className="gw-defense-title">{d.title || '이름 없는 방어 덱'}</div>
                  <span className="gw-defense-rule">|</span>
                  <div style={{ flexShrink: 0 }}>
                    <TierStars tier={d.tier} readOnly />
                  </div>
                </div>
              )}

              <div className="gw-defense-actions">
                {isExpanded && <PvpModeBadge mode={mode} size="sm" />}
                <button type="button" className="btn-edit" onClick={e => { e.stopPropagation(); openEdit(raw); }}>
                  <Icon name="edit" size={13} /> 수정
                </button>
                <button type="button" className="btn-danger-solid" onClick={e => { e.stopPropagation(); remove(d.id); }}>
                  <Icon name="close" size={13} /> 삭제
                </button>
              </div>
            </div>

            {isExpanded && (
              <div style={{ padding: '4px 14px 16px', display: 'flex', gap: '12px', alignItems: 'stretch' }}>
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', alignSelf: 'stretch' }}>
                  <InGameDeckCard
                    teamName=""
                    compact
                    formationId={normalizeFormationId(d.formationId)}
                    heroList={heroNames5.map((name, idx) => {
                      const baseHero = resolveHeroByName(name);
                      return baseHero ? { hero: baseHero, gearConfig: (d.heroGearConfigs || [])[idx] } : name;
                    })}
                    slotCount={5}
                    maxHeroes={3}
                    petObj={resolvePet(d.petId)}
                    contentMode="pvp"
                    reservedSkills={d.reservedSkills}
                    pvpMode={mode}
                    overviewNotes={[
                      (d.speedMin || d.speedMax) ? { label: '속공 수치', text: `속공 ${d.speedMin || '?'} 이상${d.speedMax ? ` ~ ${d.speedMax} 이하` : ''}` } : null,
                      d.gearPriorityNote ? { label: '부옵 우선순위', text: d.gearPriorityNote } : null,
                      d.accessoryNote ? { label: '장신구', text: d.accessoryNote } : null,
                      d.otherDetail ? { label: '기타 디테일', text: d.otherDetail } : null,
                    ].filter(Boolean)}
                  />
                </div>
                <div style={{
                  flex: 1, minWidth: 0,
                  display: 'flex', flexDirection: 'column', gap: '8px'
                }}>
                  {(d.speedMin || d.speedMax) && (
                    <span style={{
                      fontSize: '11px', fontWeight: 800, color: 'var(--accent-cyan)',
                      background: 'rgba(56,217,248,0.1)', padding: '5px 8px', borderRadius: '8px',
                      border: '1px solid rgba(56,217,248,0.35)', alignSelf: 'flex-start'
                    }}>
                      속공 {d.speedMin || '?'} 이상{d.speedMax ? ` ~ ${d.speedMax} 이하` : ''}
                    </span>
                  )}
                  <DefenseInfoCell icon="bolt" label="부옵 우선순위" color="var(--gold-light)" text={d.gearPriorityNote} />
                  <DefenseInfoCell icon="ring" label="장신구" color="#c084fc" text={d.accessoryNote} />
                  <DefenseInfoCell icon="news" label="기타 디테일" color="#94a3b8" text={d.otherDetail} />
                </div>
              </div>
            )}
          </div>
        );
      })}
      </div>

      {isModalOpen && form && (
        <ModalScrim style={{ zIndex: 3600, padding: '16px' }}
          {...backdropDismissProps(closeDefenseModal)}>
          <div onClick={e => e.stopPropagation()} className="glass-modal" style={{ width: 'min(1100px, 96vw)', maxHeight: '90vh', overflowY: 'auto', padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ fontSize: '19px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Icon name="shield" size={18} color="var(--gold-primary)" /> {form.id ? '방어 세팅 수정' : '방어 세팅 추가'}
              </h3>
              <button
                type="button"
                onClick={closeDefenseModal}
                style={{
                  background: 'rgba(239,68,68,0.2)', border: '1px solid var(--accent-red)', color: '#fff',
                  width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}
                title="모달 닫기"
              >
                <Icon name="close" size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '12px', alignItems: 'end' }}>
              <div>
                <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '5px', fontWeight: 800 }}>방어 덱 이름</div>
                <input
                  value={form.title || ''}
                  onChange={e => patchForm({ title: e.target.value })}
                  placeholder="예: 여포 속공 방어 / 칼헤론 내실 방어"
                  style={{ width: '100%', padding: '10px 12px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '7px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '5px', fontWeight: 800 }}>티어</div>
                <div style={{
                  padding: '8px 12px', background: '#07090e', border: '1px solid var(--border-gold)',
                  borderRadius: '7px', display: 'flex', alignItems: 'center', minHeight: '42px', boxSizing: 'border-box'
                }}>
                  <TierStars tier={form.tier} onChange={t => patchForm({ tier: t })} />
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 800 }}>세팅 타입</div>
              <ModeToggle mode={form.mode} onChange={m => patchForm({ mode: m })} />
            </div>

            <div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '5px', fontWeight: 800 }}>방어 조합 · 진형 · 펫 · 장비 (3v3, 최대 3명)</div>
              <DefenseDeckEditor
                slots={form.heroSlots}
                formationId={form.formationId}
                onFormationChange={fid => patchForm({ formationId: fid })}
                onChange={s => patchForm({ heroSlots: s })}
                heroes={heroes}
                gearConfigs={form.heroGearConfigs || emptyGear5()}
                onGearConfigsChange={cfgs => patchForm({ heroGearConfigs: cfgs })}
                petObj={resolvePet(form.petId)}
                onPetChange={p => patchForm({ petId: p.id })}
                reservedSkills={form.reservedSkills}
                onReservationChange={s => patchForm({ reservedSkills: s })}
              />
            </div>

            <div style={{
              background: 'rgba(0,0,0,0.4)',
              border: `1.5px solid ${PVP_MODE_COLOR[form.mode] || 'var(--border-subtle)'}66`,
              borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 900, color: PVP_MODE_COLOR[form.mode] || 'var(--gold-primary)' }}>
                {form.mode} 세팅 값
              </div>

              {form.mode === '속공' && (
                <div>
                  <div style={{ fontSize: '12.5px', color: 'var(--accent-cyan)', fontWeight: 800, marginBottom: '5px' }}>속공 수치 조건</div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input type="number" value={form.speedMin ?? ''} onChange={e => patchForm({ speedMin: e.target.value })}
                      placeholder="이상" style={{ flex: 1, minWidth: 0, padding: '9px 10px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                    <span style={{ color: '#94a3b8', fontWeight: 800, fontSize: '13px', flexShrink: 0, whiteSpace: 'nowrap' }}>이상 ~</span>
                    <input type="number" value={form.speedMax ?? ''} onChange={e => patchForm({ speedMax: e.target.value })}
                      placeholder="이하 (선택)" style={{ flex: 1, minWidth: 0, padding: '9px 10px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                    <span style={{ color: '#94a3b8', fontWeight: 800, fontSize: '13px', flexShrink: 0, whiteSpace: 'nowrap' }}>이하</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '12.5px', color: '#94a3b8', fontWeight: 800, marginBottom: '4px' }}>부옵/장비 우선순위 요약</div>
                  <textarea value={form.gearPriorityNote} onChange={e => patchForm({ gearPriorityNote: e.target.value })} rows={2} placeholder="예: 여포 - 궁수+부활"
                    style={{ width: '100%', padding: '8px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <div style={{ fontSize: '12.5px', color: '#c084fc', fontWeight: 800, marginBottom: '4px' }}>장신구 요약</div>
                  <textarea value={form.accessoryNote} onChange={e => patchForm({ accessoryNote: e.target.value })} rows={2} placeholder="예: 오르카 - 궁수 반지 우선"
                    style={{ width: '100%', padding: '8px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12.5px', color: '#94a3b8', fontWeight: 800, marginBottom: '4px' }}>기타 디테일</div>
                <textarea value={form.otherDetail} onChange={e => patchForm({ otherDetail: e.target.value })} rows={2} placeholder="예: 피회짐 > 칼헤론 or 오르카 target"
                  style={{ width: '100%', padding: '8px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
            </div>

            <button onClick={save} style={{ padding: '13px', background: 'linear-gradient(135deg, var(--gold-primary), var(--gold-dark))', color: '#000', fontWeight: 900, border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px' }}>저장</button>
          </div>
        </ModalScrim>
      )}
    </div>
  );
}
