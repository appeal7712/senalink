import { Fragment, useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
import { formatUpdateAtDisplay } from './PublicProfileModal';

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
  const width = size * 3 + 4;
  return (
    <div className="gw-mini-trio" style={{ width: `${width}px`, flexShrink: 0 }}>
      {[0, 1, 2].map(i => {
        const h = filled[i] ? resolveHeroByName(filled[i]) : null;
        return (
          <div key={i} className="gw-mini-trio-slot" style={{
            width: `${size}px`, marginLeft: i === 0 ? 0 : '2px',
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
  /** 카운터 덱 수정만: 방어/허브 editing-build 그리드 레이아웃 */
  editingLayout = false,
  otherDetail = '',
  onOtherDetailChange,
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

  const deckCard = (
    <InGameDeckCard
      teamName={editingLayout ? '' : '영웅 배치'}
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
  );

  if (editingLayout && showGear && gearConfigs && onGearConfigsChange) {
    const currentSlotName = (names[slotIdx] || '').replace('(각성)', '');
    const patchGearDetail = (text) => {
      const cfgs = [...gearConfigs];
      cfgs[slotIdx] = { ...(cfgs[slotIdx] || emptyGearConfig()), detailNote: text };
      onGearConfigsChange(cfgs);
    };

    return (
      <div className="gw-counter-edit-layout">
        <div className="gw-counter-edit-top">
          <div className="editing-build-left-stack">
            <div className="editing-build-deck-slot" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {deckCard}
            </div>
            <div className="glass-inset editing-build-detail-panel gw-counter-setting-detail" style={{ padding: '8px 12px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 4, minHeight: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--accent-cyan)', fontWeight: 800, flexShrink: 0 }}>
                영웅 세팅 디테일{currentSlotName ? ` · ${currentSlotName}` : ''}
              </div>
              <textarea
                className="editing-build-detail-textarea"
                rows={3}
                value={(gearConfigs[slotIdx] || emptyGearConfig()).detailNote || ''}
                onChange={e => patchGearDetail(e.target.value)}
                placeholder="예: 치확 67% · 약공 46%에 가깝게"
                style={{
                  width: '100%', padding: '8px 12px', background: '#07090e', border: '1px solid var(--border-gold)',
                  color: '#e2e8f0', borderRadius: 7, fontSize: 14, fontWeight: 700, lineHeight: 1.5,
                  boxSizing: 'border-box', resize: 'none', fontFamily: 'inherit',
                }}
              />
            </div>
          </div>
          <div
            className="glass-inset editing-build-gear-panel editing-build-right-panel"
            style={{
              flex: 1, minWidth: 0, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
              boxSizing: 'border-box',
            }}
          >
            <HeroGearPanel
              embedded
              showDetail={false}
              heroNames={names}
              configs={gearConfigs}
              selectedIdx={slotIdx}
              onSelectIdx={setSlotIdx}
              onChange={onGearConfigsChange}
            />
          </div>
        </div>
        <div className="glass-inset editing-build-hero-picker gw-counter-hero-picker" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, width: '100%', boxSizing: 'border-box', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <Icon name="hero" size={14} /> 영웅 목록 · {filledCount}/3
          </div>
          <HeroGridPicker
            heroes={heroes}
            selectedNames={names.filter(Boolean)}
            onPick={pickHero}
            currentSlotName={names[slotIdx] || ''}
            fillHeight={false}
            height={100}
            loungeDensity
          />
        </div>
        {onOtherDetailChange && (
          <div
            className="glass-inset gw-counter-other-detail-panel"
            style={{ padding: '8px 12px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}
          >
            <div style={{ fontSize: 11, color: 'var(--accent-cyan)', fontWeight: 800 }}>기타 디테일</div>
            <textarea
              className="gw-counter-other-detail-input"
              rows={2}
              value={otherDetail || ''}
              onChange={e => onOtherDetailChange(e.target.value)}
              placeholder="예: 전뢰의 표식 - 선란이 맞게 세팅"
            />
          </div>
        )}
      </div>
    );
  }

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
          {deckCard}
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
  inspectingCounter, setInspectingCounter, guildRoom, onBuildHistory, resolveHeroByName, heroes,
  canDeleteBuild,
}) {
  const selectedTarget = gwAttacks.find(g => g.id === selectedGwAttackId) || null;

  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [targetForm, setTargetForm] = useState({
    id: null, parentId: null, title: '', heroNames: emptyNames5(), note: '', formationId: 'protect', petId: pets[0]?.id,
  });
  const [altsOpenId, setAltsOpenId] = useState(null);
  const [selectedAltId, setSelectedAltId] = useState(null);

  const selectedDeck = useMemo(() => {
    if (!selectedTarget) return null;
    if (!selectedAltId) return selectedTarget;
    return (selectedTarget.altDecks || []).find((a) => a.id === selectedAltId) || selectedTarget;
  }, [selectedTarget, selectedAltId]);

  const [isCounterModalOpen, setIsCounterModalOpen] = useState(false);
  const [counterForm, setCounterForm] = useState({ id: null, title: '', heroNames: emptyNames5(), reservedSkills: [], otherDetail: '', formationId: 'protect', petId: pets[0]?.id, heroGearConfigs: emptyGear5() });
  const [suppressInspectPaint, setSuppressInspectPaint] = useState(false);
  /** 터치·드래그 고스트 { kind, targetId?, fromId, title, rank?, x, y, w, h, ox, oy } */
  const [dragGhost, setDragGhost] = useState(null);
  const dragGhostRef = useRef(null);
  useEffect(() => {
    dragGhostRef.current = dragGhost;
  }, [dragGhost]);

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
    setTargetForm({
      id: null, parentId: null, title: '', heroNames: emptyNames5(), note: '', formationId: 'protect', petId: pets[0]?.id,
    });
    setIsTargetModalOpen(true);
  };
  const openEditTarget = (t) => {
    if (!canDeleteBuild?.(t)) {
      alert('수정은 길드마스터·관리자 또는 작성자만 할 수 있습니다.');
      return;
    }
    setTargetForm({
      id: t.id, parentId: null, title: t.title, heroNames: padNames5(t.heroNames), note: t.note || '',
      formationId: normalizeFormationId(t.formationId), petId: t.petId || pets[0]?.id,
    });
    setIsTargetModalOpen(true);
  };
  const openCreateTargetAlt = (parentId) => {
    setTargetForm({
      id: null, parentId, title: '', heroNames: emptyNames5(), note: '', formationId: 'protect', petId: pets[0]?.id,
    });
    setIsTargetModalOpen(true);
  };
  const openEditTargetAlt = (parentId, alt) => {
    if (!canDeleteBuild?.(alt)) {
      alert('수정은 길드마스터·관리자 또는 작성자만 할 수 있습니다.');
      return;
    }
    setTargetForm({
      id: alt.id, parentId, title: alt.title || '', heroNames: padNames5(alt.heroNames), note: alt.note || '',
      formationId: normalizeFormationId(alt.formationId), petId: alt.petId || pets[0]?.id,
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
    if (targetForm.id) {
      if (targetForm.parentId) {
        const parent = gwAttacks.find((t) => t.id === targetForm.parentId);
        const alt = (parent?.altDecks || []).find((a) => a.id === targetForm.id);
        if (!canDeleteBuild?.(alt)) {
          alert('수정은 길드마스터·관리자 또는 작성자만 할 수 있습니다.');
          return;
        }
      } else {
        const target = gwAttacks.find((t) => t.id === targetForm.id);
        if (!canDeleteBuild?.(target)) {
          alert('수정은 길드마스터·관리자 또는 작성자만 할 수 있습니다.');
          return;
        }
      }
    }
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const authorFields = {
      author: guildRoom.myNickname,
      authorId: guildRoom.myMemberId || '',
    };
    const payload = {
      title: targetForm.title,
      heroNames: targetForm.heroNames,
      note: targetForm.note,
      formationId: targetForm.formationId,
      petId: targetForm.petId,
      ...authorFields,
      updatedAt: now,
    };

    if (targetForm.parentId) {
      setGwAttacks((prev) => prev.map((t) => {
        if (t.id !== targetForm.parentId) return t;
        const list = Array.isArray(t.altDecks) ? [...t.altDecks] : [];
        if (targetForm.id) {
          onBuildHistory?.('update_build', targetForm.title || targetForm.id, '길드전 상대 파생덱');
          return {
            ...t,
            altDecks: list.map((a) => (a.id === targetForm.id ? { ...a, ...payload } : a)),
          };
        }
        const newAlt = { id: 'gwaa_' + Date.now(), ...payload, counters: [] };
        onBuildHistory?.('create_build', targetForm.title || '파생 덱', '길드전 상대 파생덱');
        setAltsOpenId(targetForm.parentId);
        setSelectedGwAttackId(targetForm.parentId);
        setSelectedAltId(newAlt.id);
        return { ...t, altDecks: [...list, newAlt] };
      }));
      setIsTargetModalOpen(false);
      collapseOverlayHistory();
      return;
    }

    if (targetForm.id) {
      setGwAttacks(prev => prev.map(t => t.id === targetForm.id
        ? {
          ...t,
          ...payload,
          altDecks: Array.isArray(t.altDecks) ? t.altDecks : [],
          counters: Array.isArray(t.counters) ? t.counters : [],
        }
        : t));
      onBuildHistory?.('update_build', targetForm.title, '길드전 공격 상대덱');
    } else {
      const newTarget = {
        id: 'gwa_' + Date.now(),
        ...payload,
        counters: [],
        altDecks: [],
      };
      setGwAttacks(prev => [...prev, newTarget]);
      setSelectedGwAttackId(newTarget.id);
      onBuildHistory?.('create_build', targetForm.title, '길드전 공격 상대덱');
    }
    setIsTargetModalOpen(false);
    collapseOverlayHistory();
  };
  const deleteTarget = (id) => {
    const target = gwAttacks.find(t => t.id === id);
    if (!canDeleteBuild?.(target)) {
      alert('삭제는 길드마스터·관리자 또는 작성자만 할 수 있습니다.');
      return;
    }
    if (!confirm('이 상대 덱과 등록된 파생·카운터 덱을 모두 삭제할까요?')) return;
    setGwAttacks(prev => prev.filter(t => t.id !== id));
    if (selectedGwAttackId === id) {
      setSelectedGwAttackId(null);
      setSelectedAltId(null);
    }
    if (altsOpenId === id) setAltsOpenId(null);
    onBuildHistory?.('delete_build', target?.title || id, '길드전 공격 상대덱');
  };

  const deleteTargetAlt = (parentId, altId) => {
    const parent = gwAttacks.find((t) => t.id === parentId);
    const alt = (parent?.altDecks || []).find((a) => a.id === altId);
    if (!canDeleteBuild?.(alt)) {
      alert('삭제는 길드마스터·관리자 또는 작성자만 할 수 있습니다.');
      return;
    }
    if (!confirm('이 파생 덱과 등록된 카운터 덱을 모두 삭제할까요?')) return;
    setGwAttacks((prev) => prev.map((t) => (
      t.id !== parentId
        ? t
        : { ...t, altDecks: (t.altDecks || []).filter((a) => a.id !== altId) }
    )));
    if (selectedAltId === altId) setSelectedAltId(null);
    onBuildHistory?.('delete_build', alt?.title || altId, '길드전 상대 파생덱');
  };

  const openCreateCounter = () => {
    setCounterForm({ id: null, title: '', heroNames: emptyNames5(), reservedSkills: [], otherDetail: '', formationId: 'protect', petId: pets[0]?.id, heroGearConfigs: emptyGear5() });
    setIsCounterModalOpen(true);
  };
  const openEditCounter = (c) => {
    if (!canDeleteBuild?.(c)) {
      alert('수정은 길드마스터·관리자 또는 작성자만 할 수 있습니다.');
      return;
    }
    setCounterForm({
      id: c.id, title: c.title, heroNames: padNames5(c.heroNames),
      reservedSkills: [...(c.reservedSkills || [])],
      otherDetail: c.otherDetail ?? c.gearNote ?? '',
      formationId: normalizeFormationId(c.formationId),
      petId: c.petId || pets[0]?.id,
      heroGearConfigs: (c.heroGearConfigs && c.heroGearConfigs.length === 5)
        ? c.heroGearConfigs.map(g => ({ ...emptyGearConfig(), ...g }))
        : emptyGear5(),
    });
    setIsCounterModalOpen(true);
  };
  const saveCounter = () => {
    if (!selectedDeck || !selectedGwAttackId) return;
    const filled = counterForm.heroNames.filter(Boolean);
    if (!counterForm.title || filled.length < 1) {
      alert('카운터 덱 제목과 영웅 최소 1명을 입력해 주세요!');
      return;
    }
    if (filled.length > 3) {
      alert('길드전은 최대 3명까지 배치할 수 있습니다!');
      return;
    }
    if (counterForm.id) {
      const existing = (selectedDeck.counters || []).find((x) => x.id === counterForm.id);
      if (!canDeleteBuild?.(existing)) {
        alert('수정은 길드마스터·관리자 또는 작성자만 할 수 있습니다.');
        return;
      }
    }
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const payload = {
      title: counterForm.title,
      heroNames: counterForm.heroNames,
      reservedSkills: counterForm.reservedSkills.filter(Boolean),
      otherDetail: counterForm.otherDetail || '',
      gearNote: counterForm.otherDetail || '',
      formationId: counterForm.formationId,
      petId: counterForm.petId,
      heroGearConfigs: counterForm.heroGearConfigs,
      author: guildRoom.myNickname,
      authorId: guildRoom.myMemberId || '',
      updatedAt: now,
    };
    setGwAttacks((prev) => prev.map((t) => {
      if (t.id !== selectedGwAttackId) return t;
      const patchCounters = (list) => {
        if (counterForm.id) {
          onBuildHistory?.('update_build', counterForm.title, '길드전 카운터');
          return list.map((c) => (c.id === counterForm.id ? { ...c, ...payload } : c));
        }
        onBuildHistory?.('create_build', counterForm.title, '길드전 카운터');
        return [...list, { id: 'gwac_' + Date.now(), ...payload }];
      };
      if (!selectedAltId) {
        return { ...t, counters: patchCounters(t.counters || []) };
      }
      return {
        ...t,
        altDecks: (t.altDecks || []).map((a) => (
          a.id === selectedAltId ? { ...a, counters: patchCounters(a.counters || []) } : a
        )),
      };
    }));
    setIsCounterModalOpen(false);
    collapseOverlayHistory();
  };
  const deleteCounter = (counterId) => {
    const c = selectedDeck?.counters?.find((x) => x.id === counterId);
    if (!canDeleteBuild?.(c)) {
      alert('삭제는 길드마스터·관리자 또는 작성자만 할 수 있습니다.');
      return;
    }
    if (!confirm('이 카운터 덱을 삭제할까요?')) return;
    setGwAttacks((prev) => prev.map((t) => {
      if (t.id !== selectedGwAttackId) return t;
      if (!selectedAltId) {
        return { ...t, counters: (t.counters || []).filter((x) => x.id !== counterId) };
      }
      return {
        ...t,
        altDecks: (t.altDecks || []).map((a) => (
          a.id === selectedAltId
            ? { ...a, counters: (a.counters || []).filter((x) => x.id !== counterId) }
            : a
        )),
      };
    }));
    onBuildHistory?.('delete_build', c?.title || counterId, '길드전 카운터');
  };

  const clearDragRowHighlight = (rowSelector) => {
    document.querySelectorAll(`${rowSelector}.is-drop-target`).forEach((el) => {
      el.classList.remove('is-drop-target');
    });
  };

  const clearDraggingSource = (rowSelector) => {
    document.querySelectorAll(`${rowSelector}.is-dragging-source`).forEach((el) => {
      el.classList.remove('is-dragging-source');
    });
  };

  const finishDragPointerDrop = (clientX, clientY, ghost, rowSelector, dataAttr, onDrop) => {
    clearDragRowHighlight(rowSelector);
    clearDraggingSource(rowSelector);
    if (!ghost) {
      setDragGhost(null);
      return;
    }
    const under = document.elementFromPoint(clientX, clientY);
    const row = under?.closest?.(rowSelector);
    const toId = row?.getAttribute(dataAttr);
    if (toId) onDrop(ghost, toId);
    setDragGhost(null);
  };

  const reorderTargets = (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;
    setGwAttacks((prev) => {
      const list = [...prev];
      const fromIdx = list.findIndex((t) => t.id === fromId);
      const toIdx = list.findIndex((t) => t.id === toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const [item] = list.splice(fromIdx, 1);
      list.splice(toIdx, 0, item);
      onBuildHistory?.('update_build', item.title || fromId, '길드전 상대덱 순서');
      return list;
    });
  };

  const reorderCounters = (targetId, altId, fromId, toId) => {
    if (!targetId || !fromId || !toId || fromId === toId) return;
    setGwAttacks((prev) => prev.map((t) => {
      if (t.id !== targetId) return t;
      const reorderList = (list) => {
        const next = [...list];
        const fromIdx = next.findIndex((c) => c.id === fromId);
        const toIdx = next.findIndex((c) => c.id === toId);
        if (fromIdx < 0 || toIdx < 0) return list;
        const [item] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, item);
        return next;
      };
      if (!altId) {
        onBuildHistory?.('update_build', t.title || targetId, '길드전 카운터 우선순위');
        return { ...t, counters: reorderList(t.counters || []) };
      }
      onBuildHistory?.('update_build', t.title || targetId, '길드전 카운터 우선순위');
      return {
        ...t,
        altDecks: (t.altDecks || []).map((a) => (
          a.id === altId ? { ...a, counters: reorderList(a.counters || []) } : a
        )),
      };
    }));
  };

  const renderListDragHandle = ({
    kind,
    id,
    parentTargetId,
    title,
    rank,
    rowSelector,
    dataAttr,
    mimeType,
    onDrop,
    ariaLabel,
    handleTitle,
  }) => (
    <button
      type="button"
      className="gw-defense-drag-handle"
      draggable
      title={handleTitle}
      aria-label={ariaLabel}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse') return;
        e.stopPropagation();
        e.preventDefault();
        const row = e.currentTarget.closest(rowSelector);
        if (!row) return;
        const rect = row.getBoundingClientRect();
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragGhost({
          kind,
          targetId: parentTargetId,
          fromId: id,
          title: title || (kind === 'target' ? '상대 덱' : '카운터 덱'),
          rank,
          x: rect.left,
          y: rect.top,
          w: rect.width,
          h: rect.height,
          ox: e.clientX - rect.left,
          oy: e.clientY - rect.top,
        });
      }}
      onPointerMove={(e) => {
        if (e.pointerType === 'mouse') return;
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        setDragGhost((g) => {
          if (!g) return null;
          return {
            ...g,
            x: e.clientX - g.ox,
            y: e.clientY - g.oy,
          };
        });
        clearDragRowHighlight(rowSelector);
        const under = document.elementFromPoint(e.clientX, e.clientY);
        under?.closest?.(`${rowSelector}:not(.is-dragging-source)`)?.classList.add('is-drop-target');
      }}
      onPointerUp={(e) => {
        if (e.pointerType === 'mouse') return;
        finishDragPointerDrop(e.clientX, e.clientY, dragGhostRef.current, rowSelector, dataAttr, onDrop);
      }}
      onPointerCancel={() => {
        clearDragRowHighlight(rowSelector);
        clearDraggingSource(rowSelector);
        setDragGhost(null);
      }}
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData(mimeType, id);
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
        const row = e.currentTarget.closest(rowSelector);
        if (row) {
          try {
            e.dataTransfer.setDragImage(row, Math.min(56, row.offsetWidth / 4), row.offsetHeight / 2);
          } catch { /* ignore */ }
          row.classList.add('is-dragging-source');
        }
      }}
      onDragEnd={() => {
        clearDragRowHighlight(rowSelector);
        clearDraggingSource(rowSelector);
      }}
    >
      <span className="gw-defense-drag-grip" aria-hidden="true" />
    </button>
  );

  const renderAttackDeckRow = ({
    deck,
    variant = 'main',
    altCount = 0,
    altsOpen = false,
    isActive = false,
    onSelect,
    onEdit,
    onDelete,
    onToggleAlts,
  }) => {
    const counterCount = deck.counters?.length || 0;
    const isMain = variant === 'main';
    const rowId = deck.id;

    return (
      <div
        className={`gw-counter-row gw-attack-target-row${variant === 'alt' ? ' gw-attack-alt-row' : ''}${isActive ? ' is-on' : ''}${dragGhost?.kind === (isMain ? 'target' : 'alt') && dragGhost?.fromId === rowId ? ' is-dragging-source' : ''}`}
        {...{ [isMain ? 'data-target-id' : 'data-alt-id']: rowId }}
        onClick={onSelect}
        onDragOver={(e) => {
          if (!isMain) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          e.currentTarget.classList.add('is-drop-target');
        }}
        onDragLeave={(e) => {
          if (!isMain) return;
          e.currentTarget.classList.remove('is-drop-target');
        }}
        onDrop={(e) => {
          if (!isMain) return;
          e.preventDefault();
          e.stopPropagation();
          clearDragRowHighlight('.gw-attack-target-row');
          const fromId = e.dataTransfer.getData('application/x-gw-target-id') || e.dataTransfer.getData('text/plain');
          reorderTargets(fromId, rowId);
        }}
      >
        <div className="gw-counter-lead gw-attack-target-lead">
          {isMain ? (
            renderListDragHandle({
              kind: 'target',
              id: rowId,
              title: deck.title,
              rowSelector: '.gw-attack-target-row',
              dataAttr: 'data-target-id',
              mimeType: 'application/x-gw-target-id',
              handleTitle: '끌어 옮겨 순서 변경',
              ariaLabel: '드래그로 순서 변경',
              onDrop: (ghost, toId) => reorderTargets(ghost.fromId, toId),
            })
          ) : (
            <span className="gw-attack-alt-lead-spacer" aria-hidden="true" />
          )}
          <span className="gw-counter-rule" aria-hidden>|</span>
        </div>
        <div className="gw-attack-target-body">
          <div className="gw-counter-copy gw-attack-target-copy">
            <div className="gw-counter-title gw-attack-target-title">
              {isActive ? (
                <span className={`gw-attack-deck-kind-pill${isMain ? '' : ' is-alt'}`}>{isMain ? '상대' : '파생'}</span>
              ) : null}
              <span className="gw-attack-target-title-text">{deck.title}</span>
            </div>
          </div>
          <div className="gw-attack-target-heroes-meta">
            <MiniHeroTrio heroNames={deck.heroNames} resolveHeroByName={resolveHeroByName} size={42} />
            <div className="gw-attack-target-meta">
              <span>카운터 {counterCount}개</span>
              {isMain && altCount > 0 ? <span>파생 덱 {altCount}</span> : null}
            </div>
          </div>
        </div>
        <div className="gw-counter-actions gw-attack-target-actions">
          {onEdit ? (
            <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Icon name="edit" size={11} /> 수정
            </button>
          ) : null}
          {onDelete ? (
            <button type="button" className="is-danger" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              <Icon name="close" size={11} /> 삭제
            </button>
          ) : null}
          {isMain && onToggleAlts ? (
            <button
              type="button"
              className={`btn-ops gw-defense-alt-btn gw-attack-alt-btn${altsOpen ? ' is-on' : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleAlts(); }}
            >
              <Icon name="copy" size={11} /> 파생 덱{altCount > 0 ? ` ${altCount}` : ''}
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  const renderTargetAltLayer = (parent) => {
    const alts = Array.isArray(parent.altDecks) ? parent.altDecks : [];
    return (
      <div className="gw-attack-target-alts" onClick={(e) => e.stopPropagation()}>
        <div className="gw-alt-layer">
          <div className="gw-alt-toolbar">
            <div className="gw-alt-toolbar-copy">
              <span>파생 덱</span>
              <em>비슷한 영웅 조합</em>
            </div>
            <button type="button" className="btn-ops gw-alt-add" onClick={() => openCreateTargetAlt(parent.id)}>
              <Icon name="plus" size={11} /> 파생 덱 추가
            </button>
          </div>
          {alts.length === 0 && (
            <div className="gw-alt-empty">등록된 파생 덱이 없습니다.</div>
          )}
          {alts.map((a) => {
            const isAltActive = selectedGwAttackId === parent.id && selectedAltId === a.id;
            return (
              <Fragment key={a.id}>
                {renderAttackDeckRow({
                  deck: a,
                  variant: 'alt',
                  isActive: isAltActive,
                  onSelect: () => {
                    if (dragGhost) return;
                    if (isAltActive) {
                      setSelectedGwAttackId(null);
                      setSelectedAltId(null);
                      return;
                    }
                    setSelectedGwAttackId(parent.id);
                    setSelectedAltId(a.id);
                    setAltsOpenId(parent.id);
                  },
                  onEdit: canDeleteBuild?.(a) ? () => openEditTargetAlt(parent.id, a) : null,
                  onDelete: canDeleteBuild?.(a) ? () => deleteTargetAlt(parent.id, a.id) : null,
                })}
                {isAltActive && (
                  <div className="gw-attack-inline-counters">
                    {renderCounters(a, { parentTargetId: parent.id, altId: a.id })}
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCounters = (deck, { parentTargetId, altId = null }) => (
    <div className="gw-counter-layer">
      <div className="gw-counter-list">
        <div className="gw-counter-toolbar">
          <div className="gw-counter-toolbar-copy">
            <span>아군 공격 · 카운터 덱</span>
          </div>
          <button type="button" onClick={openCreateCounter} className="btn-ops gw-counter-add">
            <Icon name="plus" size={13} /> 카운터 공략 추가
          </button>
        </div>
        {deck.note && (
          <div className="gw-target-note">
            <Icon name="warning" size={13} /> {deck.note}
          </div>
        )}
        {(deck.counters || []).length === 0 && (
          <div className="gw-counter-empty">등록된 카운터 덱이 없습니다.</div>
        )}
        {(deck.counters || []).map((c, idx) => (
          <div
            key={c.id}
            className={`gw-counter-row${dragGhost?.kind === 'counter' && dragGhost?.fromId === c.id ? ' is-dragging-source' : ''}`}
            data-counter-id={c.id}
            onClick={() => {
              if (dragGhost) return;
              setInspectingCounter(c);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              e.currentTarget.classList.add('is-drop-target');
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('is-drop-target');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              clearDragRowHighlight('.gw-counter-row');
              const fromId = e.dataTransfer.getData('application/x-gw-counter-id') || e.dataTransfer.getData('text/plain');
              reorderCounters(parentTargetId, altId, fromId, c.id);
            }}
          >
            <div className="gw-counter-lead">
              {renderListDragHandle({
                kind: 'counter',
                id: c.id,
                parentTargetId,
                title: c.title,
                rank: idx + 1,
                rowSelector: '.gw-counter-row',
                dataAttr: 'data-counter-id',
                mimeType: 'application/x-gw-counter-id',
                handleTitle: '끌어 옮겨 우선순위 변경',
                ariaLabel: `${idx + 1}순위 · 드래그로 순서 변경`,
                onDrop: (ghost, toId) => reorderCounters(parentTargetId, altId, ghost.fromId, toId),
              })}
              <span className="gw-counter-rule" aria-hidden>|</span>
              <div className="gw-counter-prio-block">
                <span className="gw-counter-prio-label">우선순위</span>
                <span className="gw-counter-prio-num">{idx + 1}</span>
              </div>
              <span className="gw-counter-rule" aria-hidden>|</span>
            </div>
            <MiniHeroTrio heroNames={c.heroNames} resolveHeroByName={resolveHeroByName} size={42} />
            <div className="gw-counter-copy">
              <div className="gw-counter-title">{c.title}</div>
              {c.author ? (
                <>
                  <span className="gw-counter-meta-rule" aria-hidden>·</span>
                  <div className="gw-counter-meta"><span className="gw-author">{c.author}</span></div>
                </>
              ) : null}
            </div>
            <span className="gw-counter-detail">상세 <Icon name="chevronRight" size={12} /></span>
            <div className="gw-counter-actions">
              {canDeleteBuild?.(c) ? (
                <button type="button" onClick={e => { e.stopPropagation(); openEditCounter(c); }}>
                  <Icon name="edit" size={13} /> 수정
                </button>
              ) : null}
              {canDeleteBuild?.(c) ? (
                <button type="button" className="is-danger" onClick={e => { e.stopPropagation(); deleteCounter(c.id); }}>
                  <Icon name="close" size={13} /> 삭제
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
    <div className="gw-attack-layout">
      <div className="luxury-panel tint-red gw-attack-list">
        <div className="gw-attack-list-head">
          <div className="gw-attack-list-head-copy">
            <h3>
              <Icon name="guildwar" size={16} color="var(--gw-enemy-accent)" />
              <span className="gw-attack-list-head-label">상대 덱 목록</span>
            </h3>
          </div>
          <button onClick={openCreateTarget} className="btn-ops" type="button">
            <Icon name="plus" size={13} /> 상대 덱 추가
          </button>
        </div>
        <div className="gw-attack-list-body">
          {gwAttacks.length === 0 && (
            <div className="gw-counter-empty">등록된 상대 덱이 없습니다.</div>
          )}
          {gwAttacks.map(t => {
            const isMainActive = selectedGwAttackId === t.id && !selectedAltId;
            const altsOpen = altsOpenId === t.id;
            const altCount = (t.altDecks || []).length;
            return (
              <div
                key={t.id}
                className={`gw-attack-target-block${isMainActive ? ' is-expanded' : ''}`}
              >
                <div className={`gw-attack-target${isMainActive ? ' is-on' : ''}${altsOpen ? ' has-alts-open' : ''}`}>
                  {renderAttackDeckRow({
                    deck: t,
                    variant: 'main',
                    altCount,
                    altsOpen,
                    isActive: isMainActive,
                    onSelect: () => {
                      if (dragGhost) return;
                      if (isMainActive) {
                        setSelectedGwAttackId(null);
                        setSelectedAltId(null);
                        return;
                      }
                      if (altsOpenId !== t.id) setAltsOpenId(null);
                      setSelectedGwAttackId(t.id);
                      setSelectedAltId(null);
                    },
                    onEdit: canDeleteBuild?.(t) ? () => openEditTarget(t) : null,
                    onDelete: canDeleteBuild?.(t) ? () => deleteTarget(t.id) : null,
                    onToggleAlts: () => {
                      if (!isMainActive && selectedGwAttackId !== t.id) {
                        setSelectedGwAttackId(t.id);
                        setSelectedAltId(null);
                      }
                      setAltsOpenId(altsOpen ? null : t.id);
                    },
                  })}
                  {altsOpen && renderTargetAltLayer(t)}
                </div>
                {isMainActive && (
                  <div className="gw-attack-inline-counters">
                    {renderCounters(t, { parentTargetId: t.id, altId: null })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="luxury-panel tint-blue gw-attack-detail">
        {!selectedDeck ? (
          <div className="gw-counter-empty gw-counter-empty--lg">왼쪽에서 상대 덱을 선택하거나 새로 추가해 주세요.</div>
        ) : (
          <>
            <div className="gw-attack-detail-head">
              <div className="gw-attack-detail-identity">
                <MiniHeroTrio heroNames={selectedDeck.heroNames} resolveHeroByName={resolveHeroByName} size={44} />
                <div>
                  <div className="gw-attack-detail-title-row">
                    <span className={`gw-attack-vs-pill${selectedAltId ? ' is-alt' : ''}`}>{selectedAltId ? '파생' : '상대'}</span>
                    <h3>{selectedDeck.title}</h3>
                  </div>
                  <div className="gw-attack-detail-meta">{formatUpdateAtDisplay(selectedDeck.updatedAt)}</div>
                </div>
              </div>
            </div>
            {renderCounters(selectedDeck, { parentTargetId: selectedGwAttackId, altId: selectedAltId })}
          </>
        )}
      </div>
    </div>

      {isTargetModalOpen && (
        <ModalScrim style={{ zIndex: 3600, padding: '16px' }}
          {...backdropDismissProps(closeTargetModal)}>
          <div onClick={e => e.stopPropagation()} className="glass-modal" style={{ width: 'min(720px, 96vw)', maxHeight: '90vh', overflowY: 'auto', padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ fontSize: '19px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Icon name="guildwar" size={18} color="var(--gold-primary)" />
                {targetForm.parentId
                  ? (targetForm.id ? '파생 덱 수정' : '파생 덱 추가')
                  : (targetForm.id ? '상대 덱 수정' : '상대 덱 추가')}
              </h3>
              <button
                type="button"
                onClick={closeTargetModal}
                style={{
                  background: 'none', border: 'none', color: '#fff',
                  width: '30px', height: '30px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}
                title="모달 닫기"
              >
                <Icon name="closeBtn" size={26} />
              </button>
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '5px', fontWeight: 800 }}>제목</div>
              <input value={targetForm.title} onChange={e => setTargetForm({ ...targetForm, title: e.target.value })} placeholder="예: 선란클 or 윤동연"
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
        <ModalScrim style={{ zIndex: 3600, padding: '16px', overflow: 'hidden' }}
          {...backdropDismissProps(closeCounterModal)}>
          <div
            className="luxury-panel glass-modal editing-build-modal gw-counter-edit-modal"
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            style={{
              width: '94vw', maxWidth: 940, maxHeight: '88vh', padding: 0,
              display: 'flex', flexDirection: 'column', borderRadius: 28, minHeight: 0, overflow: 'hidden',
            }}
          >
            <div className="editing-build-modal-header" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 20px', background: 'rgba(255,255,255,0.04)',
              borderBottom: '1px solid rgba(255,255,255,0.10)', flexShrink: 0,
            }}>
              <div className="editing-build-modal-header-main" style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, flexWrap: 'wrap', minWidth: 0 }}>
                <div className="editing-build-modal-title-row">
                  <h3 className="editing-build-title" style={{ fontSize: 17, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="swords" size={17} color="var(--accent-cyan)" />
                    {counterForm.id ? '카운터 덱 수정' : '카운터 덱 추가'}
                  </h3>
                  <button type="button" className="editing-build-modal-close editing-build-modal-close--mobile" onClick={closeCounterModal} title="모달 닫기">
                    <Icon name="closeBtn" size={26} />
                  </button>
                </div>
                <div className="editing-build-title-input-row" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 420, minWidth: 0 }}>
                  <span style={{ fontSize: 12, color: '#fff', fontWeight: 800, whiteSpace: 'nowrap' }}>제목:</span>
                  <input
                    type="text"
                    value={counterForm.title}
                    onChange={e => setCounterForm({ ...counterForm, title: e.target.value })}
                    placeholder="예: 마덱 카운터 덱"
                    style={{ width: '100%', padding: '6px 12px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 800, boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div className="editing-build-author-row" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button type="button" className="editing-build-modal-close editing-build-modal-close--desktop" onClick={closeCounterModal} title="모달 닫기">
                  <Icon name="closeBtn" size={26} />
                </button>
              </div>
            </div>

            <div className="gw-counter-edit-body">
              <GwTrioDeckEditor
                editingLayout
                otherDetail={counterForm.otherDetail}
                onOtherDetailChange={v => setCounterForm({ ...counterForm, otherDetail: v })}
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
            </div>

            <div className="gw-counter-edit-footer">
              <button type="button" onClick={saveCounter} className="btn-ops" style={{ width: '100%', padding: 11, justifyContent: 'center', borderRadius: 12, fontSize: 14 }}>
                <Icon name="save" size={15} /> 저장
              </button>
            </div>
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
              <button onClick={closeInspectModal} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', flexShrink: 0, padding: 0 }}><Icon name="closeBtn" size={18} /></button>
            </div>
            <div className="build-title-meta" style={{ width: '100%' }}>등록: <strong>{inspectingCounter.author}</strong> ({formatUpdateAtDisplay(inspectingCounter.updatedAt)})</div>

            <div className="gw-inspect-stack">
              <div className="gw-inspect-deck">
                <InGameDeckCard
                  teamName="카운터 덱"
                  overviewTitle={inspectingCounter.title || '카운터 덱'}
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
                  overviewNotes={(inspectingCounter.otherDetail || inspectingCounter.gearNote)
                    ? [{ label: '기타 디테일', text: inspectingCounter.otherDetail || inspectingCounter.gearNote }]
                    : []}
                  onUnderlyingCover={setSuppressInspectPaint}
                />
              </div>
            </div>
          </div>
        </ModalScrim>
      )}
      {dragGhost && createPortal(
        <div
          className="gw-counter-prio-ghost"
          style={{
            width: dragGhost.w,
            minHeight: dragGhost.h,
            transform: `translate3d(${dragGhost.x}px, ${dragGhost.y}px, 0)`,
          }}
          aria-hidden="true"
        >
          <span className="gw-defense-drag-grip" style={{ color: 'rgba(125,211,252,0.9)' }} />
          <span className="gw-counter-prio-ghost-title">
            {dragGhost.kind === 'counter' && dragGhost.rank != null ? `${dragGhost.rank}순위 · ` : ''}
            {dragGhost.title}
          </span>
        </div>,
        document.body,
      )}
    </>
  );
}
