import { Fragment, useState, useEffect } from 'react';
import Icon from './icons/Icon';
import SafeImg from './icons/SafeImg';
import HeroPortraitCard from './HeroPortraitCard';
import InGameDeckCard from './InGameDeckCard';
import HeroGridPicker from './HeroGridPicker';
import HeroGearPanel, { emptyGearConfig } from './HeroGearPanel';
import { pets } from '../data/pets';
import { backdropDismissProps } from '../utils/backdropDismiss';
import { closeOverlayFromUI, collapseOverlayHistory, pushOverlay } from '../utils/overlayHistory';
import ModalScrim from './ModalScrim';

const emptyNames5 = () => ['', '', '', '', ''];
const emptyGear5 = () => [emptyGearConfig(), emptyGearConfig(), emptyGearConfig(), emptyGearConfig(), emptyGearConfig()];
const resolvePet = (petId) => pets.find(p => p.id === petId) || pets[0];

const normalizeFormationId = (id) => {
  if (id === '2f1b') return 'protect';
  if (id === '1f2b') return 'basic';
  return id || 'protect';
};

const padNames5 = (names = []) => {
  const next = [...names];
  while (next.length < 5) next.push('');
  return next.slice(0, 5).map(n => n || '');
};

function MiniHeroTrio({ heroNames = [], resolveHeroByName, size = 34 }) {
  const filled = heroNames.filter(Boolean).slice(0, 3);
  return (
    <div style={{ display: 'flex' }}>
      {[0, 1, 2].map(i => {
        const h = filled[i] ? resolveHeroByName(filled[i]) : null;
        return (
          <div key={i} style={{
            width: `${size}px`, marginLeft: i === 0 ? 0 : '-8px',
            flexShrink: 0, zIndex: 3 - i
          }}>
            {h ? <HeroPortraitCard hero={h} showStars showRole showName={false} /> : null}
          </div>
        );
      })}
    </div>
  );
}

function GwTrioDeckEditor({
  heroNames, formationId, onFormationChange, onHeroNamesChange, heroes,
  gearConfigs, onGearConfigsChange, showGear = false,
  petObj, onPetChange,
  showReservation = false, reservedSkills, onReservationChange,
}) {
  const [slotIdx, setSlotIdx] = useState(0);
  const names = padNames5(heroNames);
  const filledCount = names.filter(Boolean).length;

  const pickHero = (name) => {
    const next = [...names];
    if (!next[slotIdx] && filledCount >= 3) {
      alert('길드전은 최대 3명까지 배치할 수 있습니다.\n빈 칸이 아닌 기존 영웅을 교체하세요.');
      return;
    }
    next[slotIdx] = name;
    onHeroNamesChange(next);
    const nextEmpty = next.findIndex((n, i) => i > slotIdx && !n);
    if (nextEmpty !== -1 && next.filter(Boolean).length < 3) setSlotIdx(nextEmpty);
  };

  const placeHeroAt = (toIdx, name) => {
    const next = [...names];
    const current = next[toIdx];
    const filled = next.filter(Boolean).length;
    if (!current && filled >= 3) {
      alert('길드전은 최대 3명까지 배치할 수 있습니다.\n빈 칸이 아닌 기존 영웅을 교체하세요.');
      return;
    }
    const existingIdx = next.findIndex((n, i) => i !== toIdx && n === name);
    if (existingIdx !== -1) {
      const tmp = next[toIdx];
      next[toIdx] = next[existingIdx];
      next[existingIdx] = tmp;
    } else {
      next[toIdx] = name;
    }
    onHeroNamesChange(next);
    setSlotIdx(toIdx);
  };

  const handleHeroDrop = (payload, toIdx) => {
    if (payload?.source === 'slot' && typeof payload.fromIdx === 'number') {
      const next = [...names];
      const tmp = next[toIdx];
      next[toIdx] = next[payload.fromIdx];
      next[payload.fromIdx] = tmp;
      onHeroNamesChange(next);
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
      <div className="pvp-deck-editor-row" style={{
        display: 'grid',
        gridTemplateColumns: showGear ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr',
        gap: '14px',
        alignItems: 'center',
        justifyItems: showGear ? 'stretch' : 'center',
      }}>
        <div style={{ maxWidth: '300px', width: '100%', justifySelf: 'center' }}>
          <InGameDeckCard
            teamName="영웅 배치"
            formationId={normalizeFormationId(formationId)}
            heroList={names}
            slotCount={5}
            maxHeroes={3}
            contentMode="pvp"
            isEditMode
            isSelected
            hideReservationBtn={!showReservation}
            reservedSkills={reservedSkills}
            onReservationChange={showReservation ? onReservationChange : undefined}
            selectedSlotIdx={slotIdx}
            onSlotClick={setSlotIdx}
            onFormationChange={onFormationChange}
            petObj={petObj}
            onPetChange={onPetChange}
            onHeroDrop={handleHeroDrop}
          />
        </div>
        {showGear && gearConfigs && onGearConfigsChange && (
          <HeroGearPanel
            heroNames={names}
            configs={gearConfigs}
            selectedIdx={slotIdx}
            onSelectIdx={setSlotIdx}
            onChange={onGearConfigsChange}
          />
        )}
      </div>
      <HeroGridPicker heroes={heroes} selectedNames={names.filter(Boolean)} onPick={pickHero} height={160} currentSlotName={names[slotIdx] || ''} />
    </div>
  );
}

export default function GuildWarAttackPanel({
  gwAttacks, setGwAttacks, selectedGwAttackId, setSelectedGwAttackId,
  inspectingCounter, setInspectingCounter, guildRoom, onBuildHistory, resolveHeroByName, heroes
}) {
  const selectedTarget = gwAttacks.find(g => g.id === selectedGwAttackId) || null;

  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [targetForm, setTargetForm] = useState({ id: null, title: '', heroNames: emptyNames5(), note: '', formationId: 'protect', petId: pets[0]?.id });

  const [isCounterModalOpen, setIsCounterModalOpen] = useState(false);
  const [counterForm, setCounterForm] = useState({ id: null, title: '', heroNames: emptyNames5(), reservedSkills: [], gearNote: '', formationId: 'protect', petId: pets[0]?.id, heroGearConfigs: emptyGear5() });
  const [suppressInspectPaint, setSuppressInspectPaint] = useState(false);

  const closeTargetModal = () => closeOverlayFromUI(() => setIsTargetModalOpen(false));
  const closeCounterModal = () => closeOverlayFromUI(() => setIsCounterModalOpen(false));
  const closeInspectModal = () => closeOverlayFromUI(() => {
    setSuppressInspectPaint(false);
    setInspectingCounter(null);
  });

  useEffect(() => {
    if (!isTargetModalOpen) return;
    pushOverlay(() => setIsTargetModalOpen(false));
  }, [isTargetModalOpen]);

  useEffect(() => {
    if (!isCounterModalOpen) return;
    pushOverlay(() => setIsCounterModalOpen(false));
  }, [isCounterModalOpen]);

  const openCreateTarget = () => {
    setTargetForm({ id: null, title: '', heroNames: emptyNames5(), note: '', formationId: 'protect', petId: pets[0]?.id });
    setIsTargetModalOpen(true);
  };
  const openEditTarget = (t) => {
    setTargetForm({
      id: t.id, title: t.title, heroNames: padNames5(t.heroNames), note: t.note || '',
      formationId: normalizeFormationId(t.formationId), petId: t.petId || pets[0]?.id,
    });
    setIsTargetModalOpen(true);
  };
  const saveTarget = () => {
    const filled = targetForm.heroNames.filter(Boolean);
    if (!targetForm.title || filled.length < 1) {
      alert('상대 덱 제목과 영웅 최소 1명을 입력해 주세요!');
      return;
    }
    if (filled.length > 3) {
      alert('길드전은 최대 3명까지 배치할 수 있습니다!');
      return;
    }
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    if (targetForm.id) {
      setGwAttacks(prev => prev.map(t => t.id === targetForm.id
        ? { ...t, title: targetForm.title, heroNames: targetForm.heroNames, note: targetForm.note, formationId: targetForm.formationId, petId: targetForm.petId, author: guildRoom.myNickname, updatedAt: now }
        : t));
      onBuildHistory?.('update_build', targetForm.title, '길드전 공격 상대덱');
    } else {
      const newTarget = {
        id: 'gwa_' + Date.now(), title: targetForm.title, heroNames: targetForm.heroNames,
        note: targetForm.note, formationId: targetForm.formationId, petId: targetForm.petId,
        author: guildRoom.myNickname, updatedAt: now, counters: []
      };
      setGwAttacks(prev => [...prev, newTarget]);
      setSelectedGwAttackId(newTarget.id);
      onBuildHistory?.('create_build', targetForm.title, '길드전 공격 상대덱');
    }
    setIsTargetModalOpen(false);
    collapseOverlayHistory();
  };
  const deleteTarget = (id) => {
    if (!confirm('이 상대 덱과 등록된 모든 카운터 덱을 삭제할까요?')) return;
    const target = gwAttacks.find(t => t.id === id);
    setGwAttacks(prev => prev.filter(t => t.id !== id));
    if (selectedGwAttackId === id) setSelectedGwAttackId(null);
    onBuildHistory?.('delete_build', target?.title || id, '길드전 공격 상대덱');
  };

  const openCreateCounter = () => {
    setCounterForm({ id: null, title: '', heroNames: emptyNames5(), reservedSkills: [], gearNote: '', formationId: 'protect', petId: pets[0]?.id, heroGearConfigs: emptyGear5() });
    setIsCounterModalOpen(true);
  };
  const openEditCounter = (c) => {
    setCounterForm({
      id: c.id, title: c.title, heroNames: padNames5(c.heroNames),
      reservedSkills: [...(c.reservedSkills || [])], gearNote: c.gearNote || '',
      formationId: normalizeFormationId(c.formationId),
      petId: c.petId || pets[0]?.id,
      heroGearConfigs: (c.heroGearConfigs && c.heroGearConfigs.length === 5)
        ? c.heroGearConfigs.map(g => ({ ...emptyGearConfig(), ...g }))
        : emptyGear5(),
    });
    setIsCounterModalOpen(true);
  };
  const saveCounter = () => {
    if (!selectedTarget) return;
    const filled = counterForm.heroNames.filter(Boolean);
    if (!counterForm.title || filled.length < 1) {
      alert('카운터 덱 제목과 영웅 최소 1명을 입력해 주세요!');
      return;
    }
    if (filled.length > 3) {
      alert('길드전은 최대 3명까지 배치할 수 있습니다!');
      return;
    }
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setGwAttacks(prev => prev.map(t => {
      if (t.id !== selectedTarget.id) return t;
      const list = t.counters || [];
      const payload = {
        title: counterForm.title,
        heroNames: counterForm.heroNames,
        reservedSkills: counterForm.reservedSkills.filter(Boolean),
        gearNote: counterForm.gearNote,
        formationId: counterForm.formationId,
        petId: counterForm.petId,
        heroGearConfigs: counterForm.heroGearConfigs,
        author: guildRoom.myNickname,
        updatedAt: now,
      };
      if (counterForm.id) {
        onBuildHistory?.('update_build', counterForm.title, '길드전 카운터');
        return { ...t, counters: list.map(c => c.id === counterForm.id ? { ...c, ...payload } : c) };
      }
      onBuildHistory?.('create_build', counterForm.title, '길드전 카운터');
      return { ...t, counters: [...list, { id: 'gwac_' + Date.now(), ...payload }] };
    }));
    setIsCounterModalOpen(false);
    collapseOverlayHistory();
  };
  const deleteCounter = (counterId) => {
    if (!confirm('이 카운터 덱을 삭제할까요?')) return;
    const c = selectedTarget?.counters?.find(x => x.id === counterId);
    setGwAttacks(prev => prev.map(t => t.id !== selectedTarget.id ? t : { ...t, counters: (t.counters || []).filter(x => x.id !== counterId) }));
    onBuildHistory?.('delete_build', c?.title || counterId, '길드전 카운터');
  };

  const renderCounters = (target) => (
    <div className="gw-counter-list">
      <div className="gw-counter-toolbar">
        <span>아군 공격 · 카운터 덱</span>
        <button type="button" onClick={openCreateCounter} className="btn-ops gw-counter-add">
          <Icon name="plus" size={13} /> 카운터 공략 추가
        </button>
      </div>
      {target.note && (
        <div className="gw-target-note">
          <Icon name="warning" size={13} /> {target.note}
        </div>
      )}
      {(target.counters || []).length === 0 && (
        <div className="gw-counter-empty">등록된 카운터 덱이 없습니다.</div>
      )}
      {(target.counters || []).map(c => (
        <div key={c.id} className="gw-counter-row" onClick={() => setInspectingCounter(c)}>
          <MiniHeroTrio heroNames={c.heroNames} resolveHeroByName={resolveHeroByName} />
          <div className="gw-counter-copy">
            <div className="gw-counter-title">{c.title}</div>
            <div className="gw-counter-meta">스킬 예약 {c.reservedSkills?.length || 0}개 · <span className="gw-author">{c.author}</span></div>
          </div>
          <span className="gw-counter-detail">상세 <Icon name="chevronRight" size={12} /></span>
          <div className="gw-counter-actions">
            <button type="button" onClick={e => { e.stopPropagation(); openEditCounter(c); }}>
              <Icon name="edit" size={13} /> 수정
            </button>
            <button type="button" className="is-danger" onClick={e => { e.stopPropagation(); deleteCounter(c.id); }}>
              <Icon name="close" size={13} /> 삭제
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
    <div className="gw-attack-layout">
      <div className="luxury-panel tint-red gw-attack-list">
        <div className="gw-attack-list-head">
          <h3>
            <Icon name="guildwar" size={16} color="var(--accent-red)" /> 상대 덱 목록
          </h3>
          <button onClick={openCreateTarget} className="btn-ops" type="button">
            <Icon name="plus" size={13} /> 상대 덱 추가
          </button>
        </div>
        <div className="gw-attack-list-body">
          {gwAttacks.length === 0 && (
            <div className="gw-counter-empty">등록된 상대 덱이 없습니다.</div>
          )}
          {gwAttacks.map(t => {
            const isActive = selectedTarget?.id === t.id;
            return (
              <Fragment key={t.id}>
                <div className={`gw-attack-target${isActive ? ' is-on' : ''}`}>
                  <div
                    className="gw-attack-target-row"
                    onClick={() => setSelectedGwAttackId(isActive ? null : t.id)}
                  >
                    <MiniHeroTrio heroNames={t.heroNames} resolveHeroByName={resolveHeroByName} size={42} />
                    <div className="gw-attack-target-copy">
                      <div className="gw-attack-target-title">{t.title}</div>
                      <div className="gw-attack-target-meta">카운터 {t.counters?.length || 0}개</div>
                    </div>
                    <div className="gw-attack-target-actions">
                      <button type="button" onClick={e => { e.stopPropagation(); openEditTarget(t); }}>
                        <Icon name="edit" size={12} /> 수정
                      </button>
                      <button type="button" className="is-danger" onClick={e => { e.stopPropagation(); deleteTarget(t.id); }}>
                        <Icon name="close" size={12} /> 삭제
                      </button>
                    </div>
                  </div>
                </div>
                {isActive && (
                  <div className="gw-attack-inline-counters">
                    {renderCounters(t)}
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      <div className="luxury-panel tint-blue gw-attack-detail">
        {!selectedTarget ? (
          <div className="gw-counter-empty gw-counter-empty--lg">왼쪽에서 상대 덱을 선택하거나 새로 추가해 주세요.</div>
        ) : (
          <>
            <div className="gw-attack-detail-head">
              <div className="gw-attack-detail-identity">
                <MiniHeroTrio heroNames={selectedTarget.heroNames} resolveHeroByName={resolveHeroByName} size={44} />
                <div>
                  <div className="gw-attack-detail-title-row">
                    <span className="gw-attack-vs-pill">상대</span>
                    <h3>{selectedTarget.title}</h3>
                  </div>
                  <div className="gw-attack-detail-meta">{selectedTarget.updatedAt}</div>
                </div>
              </div>
            </div>
            {renderCounters(selectedTarget)}
          </>
        )}
      </div>
    </div>

      {isTargetModalOpen && (
        <ModalScrim style={{ zIndex: 3600, padding: '16px' }}
          {...backdropDismissProps(closeTargetModal)}>
          <div onClick={e => e.stopPropagation()} className="glass-modal" style={{ width: 'min(720px, 96vw)', maxHeight: '90vh', overflowY: 'auto', padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ fontSize: '19px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}><Icon name="guildwar" size={18} color="var(--gold-primary)" /> {targetForm.id ? '상대 덱 수정' : '상대 덱 추가'}</h3>
              <button
                type="button"
                onClick={closeTargetModal}
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
            <div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '5px', fontWeight: 800 }}>제목</div>
              <input value={targetForm.title} onChange={e => setTargetForm({ ...targetForm, title: e.target.value })} placeholder="예: vs 트겔미"
                style={{ width: '100%', padding: '10px 12px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '7px', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <GwTrioDeckEditor
              heroNames={targetForm.heroNames}
              formationId={targetForm.formationId}
              onFormationChange={fid => setTargetForm({ ...targetForm, formationId: fid })}
              onHeroNamesChange={n => setTargetForm({ ...targetForm, heroNames: n })}
              heroes={heroes}
              petObj={resolvePet(targetForm.petId)}
              onPetChange={p => setTargetForm({ ...targetForm, petId: p.id })}
            />
            <div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '5px', fontWeight: 800 }}>특이사항 (선택)</div>
              <textarea value={targetForm.note} onChange={e => setTargetForm({ ...targetForm, note: e.target.value })} rows={3}
                style={{ width: '100%', padding: '10px 12px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '7px', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <button onClick={saveTarget} style={{ padding: '13px', background: 'linear-gradient(135deg, var(--gold-primary), var(--gold-dark))', color: '#000', fontWeight: 900, border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px' }}>저장</button>
          </div>
        </ModalScrim>
      )}

      {isCounterModalOpen && (
        <ModalScrim style={{ zIndex: 3600, padding: '16px' }}
          {...backdropDismissProps(closeCounterModal)}>
          <div onClick={e => e.stopPropagation()} className="glass-modal" style={{ width: 'min(1100px, 96vw)', maxHeight: '90vh', overflowY: 'auto', padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ fontSize: '19px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}><Icon name="swords" size={17} color="var(--accent-cyan)" /> {counterForm.id ? '카운터 덱 수정' : '카운터 덱 추가'}</h3>
              <button
                type="button"
                onClick={closeCounterModal}
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
            <div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '5px', fontWeight: 800 }}>제목</div>
              <input value={counterForm.title} onChange={e => setCounterForm({ ...counterForm, title: e.target.value })} placeholder="예: 마덱 카운터 덱"
                style={{ width: '100%', padding: '10px 12px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '7px', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <GwTrioDeckEditor
              heroNames={counterForm.heroNames}
              formationId={counterForm.formationId}
              onFormationChange={fid => setCounterForm({ ...counterForm, formationId: fid })}
              onHeroNamesChange={n => setCounterForm({ ...counterForm, heroNames: n })}
              heroes={heroes}
              showGear
              gearConfigs={counterForm.heroGearConfigs}
              onGearConfigsChange={cfgs => setCounterForm({ ...counterForm, heroGearConfigs: cfgs })}
              petObj={resolvePet(counterForm.petId)}
              onPetChange={p => setCounterForm({ ...counterForm, petId: p.id })}
              showReservation
              reservedSkills={counterForm.reservedSkills}
              onReservationChange={s => setCounterForm({ ...counterForm, reservedSkills: s })}
            />
            <div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '5px', fontWeight: 800 }}>메모 (선택)</div>
              <textarea value={counterForm.gearNote} onChange={e => setCounterForm({ ...counterForm, gearNote: e.target.value })} rows={2}
                style={{ width: '100%', padding: '10px 12px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '7px', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <button onClick={saveCounter} style={{ padding: '13px', background: 'linear-gradient(135deg, var(--accent-cyan), #0ea5c7)', color: '#04202b', fontWeight: 900, border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px' }}>저장</button>
          </div>
        </ModalScrim>
      )}

      {inspectingCounter && (
        <ModalScrim
          className={`gw-inspect-scrim${suppressInspectPaint ? ' modal-scrim--covered' : ''}`}
          style={{
            zIndex: 3700,
            padding: '16px',
            ...(suppressInspectPaint ? { display: 'none' } : {}),
          }}
          {...backdropDismissProps(closeInspectModal)}>
          <div onClick={e => e.stopPropagation()} className="glass-modal gw-inspect-modal" style={{
            maxHeight: '90vh', overflowY: 'auto', padding: '16px', borderRadius: '18px',
            display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', width: '100%' }}>
              <h3 style={{
                fontSize: '17px', fontWeight: 900, display: 'flex', alignItems: 'flex-start', gap: '7px',
                margin: 0, minWidth: 0, lineHeight: 1.35, overflowWrap: 'anywhere'
              }}><Icon name="swords" size={16} color="var(--accent-cyan)" /> {inspectingCounter.title}</h3>
              <button onClick={closeInspectModal} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', flexShrink: 0, padding: 0 }}><Icon name="close" size={18} /></button>
            </div>
            <div className="build-title-meta" style={{ width: '100%' }}>등록: <strong>{inspectingCounter.author}</strong> ({inspectingCounter.updatedAt})</div>

            <div className="gw-inspect-deck">
              <InGameDeckCard
                teamName="카운터 덱"
                formationId={normalizeFormationId(inspectingCounter.formationId)}
                heroList={padNames5(inspectingCounter.heroNames).map((name, idx) => {
                  const baseHero = resolveHeroByName(name);
                  return baseHero ? { hero: baseHero, gearConfig: (inspectingCounter.heroGearConfigs || [])[idx] } : name;
                })}
                slotCount={5}
                maxHeroes={3}
                petObj={resolvePet(inspectingCounter.petId)}
                contentMode="pvp"
                reservedSkills={inspectingCounter.reservedSkills}
                overviewNotes={inspectingCounter.gearNote ? [{ text: inspectingCounter.gearNote }] : []}
                onUnderlyingCover={setSuppressInspectPaint}
              />
            </div>

            {inspectingCounter.gearNote && (
              <div className="setting-overview-section">
                <div className="setting-overview-label">
                  <Icon name="bolt" size={14} /> 메모
                </div>
                <div style={{ fontSize: '14px', color: '#e2e8f0', whiteSpace: 'pre-line', lineHeight: '1.6' }}>{inspectingCounter.gearNote}</div>
              </div>
            )}
          </div>
        </ModalScrim>
      )}
    </>
  );
}
