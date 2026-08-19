import { Fragment, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { heroes } from '../data/heroes';
import { pets } from '../data/pets';
import { formationsData } from '../data/formations';
import { EQUIPMENT_SET_ICONS, findAccessory } from '../data/equipments';
import { ROLE_ICONS as ROLE_ICON } from '../data/roleIcons';
import Icon from './icons/Icon';
import SafeImg from './icons/SafeImg';
import SkillReservationBoard from './SkillReservationBoard';
import { PvpModeBadge } from './PvpModeToggle';
import { setDeckDragData, getDeckDragData, hasDeckDrag } from '../utils/deckDrag';
import { buildOptionCode } from './HeroGearPanel';
import { backdropDismissProps } from '../utils/backdropDismiss';
import { closeOverlayFromUI, pushOverlay } from '../utils/overlayHistory';
import CopyNotice from './lounge/CopyNotice';
import { copyNodePng } from '../lib/copyNodeImage';

const CARD_BG = {
  old_seven:    'linear-gradient(180deg, #fde047 0%, #ca8a04 100%)',
  special:      'linear-gradient(180deg, #facc15 0%, #ca8a04 100%)',
  semi_special: 'linear-gradient(180deg, #facc15 0%, #d97706 100%)',
  normal:       'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
};

// 인게임 4대 공식 원형 사선 별 아이콘 렌더러 (원 중앙 정밀 중앙 정렬)
export const renderFormationCircleIcon = (fId, size = 56) => {
  let backPos = [];
  let frontPos = [];

  if (fId === '2f1b') {
    // 길드전 3v3 — 전방 2명(사선) + 후방 1명
    frontPos = [
      { left: 18, top: 33 },
      { left: 27, top: 24 },
    ];
    backPos = [
      { left: 24, top: 14 }
    ];
  } else if (fId === '1f2b') {
    // 길드전 3v3 — 후방 2명(사선) + 전방 1명
    backPos = [
      { left: 16, top: 26 },
      { left: 25, top: 17 },
    ];
    frontPos = [
      { left: 28, top: 32 }
    ];
  } else if (fId === 'attack') {
    // 공격 진형: 후방 4명 (사선 일렬) + 전방 1명 (오른쪽 아래)
    backPos = [
      { left: 12, top: 32 },
      { left: 19, top: 25 },
      { left: 26, top: 18 },
      { left: 33, top: 11 },
    ];
    frontPos = [
      { left: 27, top: 27 }
    ];
  } else if (fId === 'protect') {
    // 보호 진형: 전방 4명 (사선 일렬) + 후방 1명 (왼쪽 위)
    frontPos = [
      { left: 14, top: 34 },
      { left: 21, top: 27 },
      { left: 28, top: 20 },
      { left: 35, top: 13 },
    ];
    backPos = [
      { left: 19, top: 19 }
    ];
  } else if (fId === 'balance') {
    // 밸런스 진형: 후방 2명 + 전방 3명
    backPos = [
      { left: 15, top: 23 },
      { left: 22, top: 16 },
    ];
    frontPos = [
      { left: 21, top: 33 },
      { left: 28, top: 26 },
      { left: 35, top: 19 },
    ];
  } else {
    // 기본 진형: 후방 3명 + 전방 2명
    backPos = [
      { left: 14, top: 31 },
      { left: 21, top: 24 },
      { left: 28, top: 17 },
    ];
    frontPos = [
      { left: 26, top: 31 },
      { left: 33, top: 24 },
    ];
  }

  const scale = size / 56;
  const marker = Math.max(5, 7 * scale);

  return (
    <div style={{
      width: `${size}px`, height: `${size}px`, borderRadius: '50%',
      background: 'linear-gradient(155deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 55%, rgba(15,23,42,0.35) 100%)',
      backdropFilter: 'blur(12px) saturate(160%)',
      WebkitBackdropFilter: 'blur(12px) saturate(160%)',
      border: '1px solid rgba(255,255,255,0.28)',
      boxShadow: '0 4px 14px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.28)',
      position: 'relative', flexShrink: 0, overflow: 'hidden'
    }}>
      {backPos.map((pos, i) => (
        <span key={`b_${i}`} style={{
          position: 'absolute', left: `${pos.left * scale}px`, top: `${pos.top * scale}px`,
          width: `${marker}px`, height: `${marker}px`, background: '#ef4444', transform: 'rotate(45deg)',
          boxShadow: '0 0 5px rgba(239, 68, 68, 0.85)'
        }} />
      ))}
      {frontPos.map((pos, i) => (
        <span key={`f_${i}`} style={{
          position: 'absolute', left: `${pos.left * scale}px`, top: `${pos.top * scale}px`,
          width: `${marker}px`, height: `${marker}px`, background: '#3b82f6', transform: 'rotate(45deg)',
          boxShadow: '0 0 5px rgba(59, 130, 246, 0.85)'
        }} />
      ))}
    </div>
  );
};

export default function InGameDeckCard({
  teamName = '1 팀',
  formationId = 'protect',
  heroList = [],
  petObj = null,
  onFormationChange,
  onPetChange,
  onEditClick,
  onSlotClick,
  selectedSlotIdx = -1,
  isSelected = false,
  isEditMode = false,
  contentMode = 'pve',
  reservedSkills = [],
  onReservationChange,
  slotCount = 5,
  hidePet = false,
  maxHeroes = null,
  hideReservationBtn = false,
  onHeroDrop = null,
  speedOrderNames = null,
  speedIgnoredNames = null,
  onSpeedConfigChange = null,
  embedded = false,
  headerSlot = null,
  pvpMode = null,
  overviewNotes = null,
  accentColor = null,
  compact = false,
}) {
  // 길드전(maxHeroes=3)도 PvE와 동일한 5칸 공식 진형 레이아웃을 쓰고,
  // 빈 칸은 공란으로 남겨 진형 형태를 확실히 보이게 한다.
  const formationSet = formationsData;
  const [currentFormationId, setCurrentFormationId] = useState(() => {
    const mapped = formationId === '2f1b' ? 'protect' : formationId === '1f2b' ? 'basic' : formationId;
    return formationSet.find(f => f.id === mapped) ? mapped : formationSet[0].id;
  });
  const [isFormationModalOpen, setIsFormationModalOpen] = useState(false);
  const [isSpeedModalOpen, setIsSpeedModalOpen] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [isPetModalOpen, setIsPetModalOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState(petObj || pets[0]);
  const [dragSpeedIdx, setDragSpeedIdx] = useState(null);
  const [dragSlotIdx, setDragSlotIdx] = useState(null);
  const [dropHoverIdx, setDropHoverIdx] = useState(null);
  // 영웅별 속공 순서 무시 — 영웅 이름 기준으로 저장/표시
  const cleanHeroName = (h) => {
    if (!h) return '';
    const raw = typeof h === 'string' ? h : (h.name || '');
    return String(raw).replace('(각성)', '').trim();
  };
  const [speedIgnoredSet, setSpeedIgnoredSet] = useState(() => new Set(
    (speedIgnoredNames || []).map(cleanHeroName).filter(Boolean)
  ));
  const isPvp = contentMode === 'pvp';
  const isInspectView = !isEditMode && !onSlotClick;
  const canDragSlots = !!(onHeroDrop && (isEditMode || onSlotClick));

  useEffect(() => {
    if (petObj) setSelectedPet(petObj);
  }, [petObj]);

  useEffect(() => {
    const mapped = formationId === '2f1b' ? 'protect' : formationId === '1f2b' ? 'basic' : formationId;
    if (formationSet.find(f => f.id === mapped)) setCurrentFormationId(mapped);
  }, [formationId]);

  useEffect(() => {
    setSpeedIgnoredSet(new Set((speedIgnoredNames || []).map(cleanHeroName).filter(Boolean)));
  }, [speedIgnoredNames]);

  const toggleSpeedIgnored = (name) => {
    if (!name) return;
    setSpeedIgnoredSet(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const emitSpeedConfig = (orderList, ignoredSet) => {
    if (!onSpeedConfigChange) return;
    onSpeedConfigChange({
      orderNames: (orderList || []).map(cleanHeroName).filter(Boolean),
      ignoredNames: [...(ignoredSet || [])],
    });
  };

  const resolveHeroByName = (h) => {
    if (!h || !String(h).trim()) return null;
    const raw = String(h);
    const clean = raw.replace('(각성)', '').trim();
    if (!clean) return null;
    return (
      heroes.find(x => x.name === raw) ||
      heroes.find(x => x.name.replace('(각성)', '').trim() === clean) ||
      (clean.length >= 2
        ? heroes.find(x => {
            const xn = x.name.replace('(각성)', '').trim();
            return x.name.includes(clean) || (xn.length >= 2 && clean.includes(xn));
          })
        : null) ||
      null
    );
  };

  const displayHeroes = heroList.map(h => {
    if (!h) return null;
    if (typeof h === 'string') {
      return h.trim() ? resolveHeroByName(h) : null;
    }
    // { hero, gearConfig } 형태로 넘어온 경우 — 조회 모달에서 세팅 디테일까지 보이도록 유지
    if (h.hero) {
      return { ...h.hero, gearConfig: h.gearConfig };
    }
    return h;
  });
  while (displayHeroes.length < 5) displayHeroes.push(null);
  displayHeroes.length = 5;

  const [speedOrderList, setSpeedOrderList] = useState(() => {
    const filled = displayHeroes.filter(Boolean);
    if (Array.isArray(speedOrderNames) && speedOrderNames.length) {
      const byName = new Map(filled.map(h => [cleanHeroName(h), h]));
      const ordered = speedOrderNames.map(n => byName.get(cleanHeroName(n))).filter(Boolean);
      const rest = filled.filter(h => !ordered.includes(h));
      return [...ordered, ...rest];
    }
    return filled;
  });

  useEffect(() => {
    const filled = displayHeroes.filter(Boolean);
    if (Array.isArray(speedOrderNames) && speedOrderNames.length) {
      const byName = new Map(filled.map(h => [cleanHeroName(h), h]));
      const ordered = speedOrderNames.map(n => byName.get(cleanHeroName(n))).filter(Boolean);
      const rest = filled.filter(h => !ordered.some(o => cleanHeroName(o) === cleanHeroName(h)));
      setSpeedOrderList([...ordered, ...rest]);
    } else {
      setSpeedOrderList(filled);
    }
  }, [heroList, speedOrderNames]);

  const currentFormation = formationSet.find(f => f.id === currentFormationId) || formationSet[0];

  const [isGearOverviewOpen, setIsGearOverviewOpen] = useState(false);
  const subModalOpen = isFormationModalOpen || isSpeedModalOpen || isReservationModalOpen || isPetModalOpen || isGearOverviewOpen;

  useEffect(() => {
    if (!subModalOpen) return;
    pushOverlay(() => {
      setIsFormationModalOpen(false);
      setIsSpeedModalOpen(false);
      setIsReservationModalOpen(false);
      setIsPetModalOpen(false);
      setIsGearOverviewOpen(false);
    });
  }, [subModalOpen]);

  const dismissSubModal = (fn) => closeOverlayFromUI(fn);
  const [shareNotice, setShareNotice] = useState('');
  const [shareBusy, setShareBusy] = useState(false);
  const settingCaptureRef = useRef(null);

  const shareSettingImage = async () => {
    if (shareBusy) return;
    setShareBusy(true);
    try {
      await copyNodePng(settingCaptureRef.current);
      setShareNotice('세팅이 복사 되었습니다\n붙여넣기로 공유 해보세요');
    } catch {
      setShareNotice('이미지 복사에 실패했습니다. 브라우저가 이미지 복사를 막았을 수 있습니다.');
    } finally {
      setShareBusy(false);
    }
  };

  const handleSlotClickInternal = (h, idx) => {
    if (onSlotClick) {
      const filled = displayHeroes.filter(Boolean).length;
      if (maxHeroes && !h && filled >= maxHeroes) return;
      onSlotClick(idx);
    } else if (h) {
      setIsGearOverviewOpen(true);
    }
  };

  const filledInspectHeroes = displayHeroes.filter(Boolean).slice(0, maxHeroes || 5);
  const showOverviewDeck = !(maxHeroes && maxHeroes <= 3) && filledInspectHeroes.length > 0;
  const overviewCellCount = filledInspectHeroes.length + (showOverviewDeck ? 1 : 0);

  const renderHeroGearBlock = (hero, compact = false) => {
    const gear = hero.gearConfig || {};
    const setName = gear.setName || '복수자';
    const setIcon = EQUIPMENT_SET_ICONS[setName] || '/images/equipment/복수자.png';
    const acc = findAccessory(gear.accessory);
    const optionCode = buildOptionCode(gear);
    const tips = String(gear.detailNote || '')
      .split(/\n+/)
      .map(s => s.trim())
      .filter(Boolean);
    const slots = [
      { label: '무기 1', value: gear.weapon1 || '치명타 확률', tone: 'gold' },
      { label: '방어구 1', value: gear.armor1 || '모든 공격력(%)', tone: 'cyan' },
      { label: '무기 2', value: gear.weapon2 || '치명타 확률', tone: 'gold' },
      { label: '방어구 2', value: gear.armor2 || '모든 공격력(%)', tone: 'cyan' },
    ];
    const toneColor = { gold: 'var(--gold-light)', cyan: 'var(--accent-cyan)' };
    const name = hero.name ? hero.name.replace('(각성)', '') : '영웅';

    return (
      <div className={compact ? 'gear-block-compact' : undefined} style={compact ? undefined : {
        background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border-subtle)',
        borderRadius: '14px', padding: '14px',
        display: 'flex', flexDirection: 'column', gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '8px' : '10px', minWidth: 0 }}>
          <div style={{
            width: compact ? '48px' : '56px', height: compact ? '54px' : '64px',
            borderRadius: '10px', overflow: 'hidden', flexShrink: 0,
            border: '1.5px solid var(--gold-primary)', background: 'transparent'
          }} className={compact ? 'gear-block-face' : undefined}>
            <SafeImg src={hero.portraitUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
          </div>
          <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <div style={{ fontSize: compact ? '15px' : '16px', fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>
                {name}
              </div>
              <div style={{
                marginLeft: 'auto',
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '3px 8px', borderRadius: '7px', flexShrink: 0,
                background: 'rgba(34,197,94,0.14)', border: '1px solid rgba(74,222,128,0.45)'
              }}>
                <img src={setIcon} alt="" style={{ width: '14px', height: '14px' }} />
                <span style={{ fontSize: '12.5px', fontWeight: 900, color: '#86efac' }}>{setName}</span>
              </div>
            </div>
            {optionCode && (
              <div style={{ fontSize: '13px', fontWeight: 900, color: 'var(--gold-light)', letterSpacing: '0.4px' }}>
                {optionCode}
              </div>
            )}
          </div>
        </div>

        <div className="gear-detail-box">
          <div className="gear-detail-label">
            <Icon name="bolt" size={12} /> 세팅 디테일
          </div>
          <div className="gear-detail-body" tabIndex={tips.length > 3 ? 0 : undefined}>
            {tips.length > 0 ? (
              <ul>
                {tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            ) : (
              <div className="gear-detail-empty">등록된 세팅 디테일이 없습니다.</div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {slots.map(slot => (
            <div key={slot.label} style={{
              background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border-subtle)',
              borderRadius: '8px', padding: compact ? '6px' : '8px', textAlign: 'center'
            }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, marginBottom: '3px' }}>{slot.label}</div>
              <div style={{ fontSize: '12px', fontWeight: 900, color: toneColor[slot.tone], lineHeight: 1.3 }}>{slot.value}</div>
            </div>
          ))}
        </div>

        <div style={{
          background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.35)',
          borderRadius: '8px', padding: compact ? '6px 8px' : '8px 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          textAlign: 'center'
        }}>
          <img src={acc.iconUrl} alt="" style={{ width: '28px', height: '28px', objectFit: 'contain', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '10px', color: 'var(--gold-light)', fontWeight: 800 }}>장신구</div>
            <div style={{ fontSize: '13px', fontWeight: 900, color: '#fff' }}>{acc.shortLabel || acc.name}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderFormationLayout = (slotFn) => {
    // 항상 5칸 공식 진형 레이아웃 (빈 슬롯은 공란으로 표시)
    // 스테이지 크기는 CSS 고정 — 진형별 높이 변화 없음, 짧은 열은 세로 중앙
    const slot = slotFn || renderSingleHeroSlot;
    if (currentFormationId === 'protect') {
      const backHero = displayHeroes[0];
      const frontHeroes = displayHeroes.slice(1, 5);
      return (
        <div className="deck-stage-rows">
          <div className="deck-stage-col">
            {slot(backHero, 0)}
          </div>
          <div className="deck-stage-col">
            {frontHeroes.map((h, i) => slot(h, i + 1))}
          </div>
        </div>
      );
    }
    if (currentFormationId === 'attack') {
      const backHeroes = displayHeroes.slice(0, 4);
      const frontHero = displayHeroes[4];
      return (
        <div className="deck-stage-rows">
          <div className="deck-stage-col">
            {backHeroes.map((h, i) => slot(h, i))}
          </div>
          <div className="deck-stage-col">
            {slot(frontHero, 4)}
          </div>
        </div>
      );
    }
    if (currentFormationId === 'basic') {
      const backHeroes = displayHeroes.slice(0, 3);
      const frontHeroes = displayHeroes.slice(3, 5);
      return (
        <div className="deck-stage-rows">
          <div className="deck-stage-col">
            {backHeroes.map((h, i) => slot(h, i))}
          </div>
          <div className="deck-stage-col">
            {frontHeroes.map((h, i) => slot(h, i + 3))}
          </div>
        </div>
      );
    }
    const backHeroes = displayHeroes.slice(0, 2);
    const frontHeroes = displayHeroes.slice(2, 5);
    return (
      <div className="deck-stage-rows">
        <div className="deck-stage-col">
          {backHeroes.map((h, i) => slot(h, i))}
        </div>
        <div className="deck-stage-col">
          {frontHeroes.map((h, i) => slot(h, i + 2))}
        </div>
      </div>
    );
  };

  const isSlotSelected = (idx) => selectedSlotIdx === idx;

  const handleSlotDragOver = (e, idx) => {
    if (!canDragSlots) return;
    if (!hasDeckDrag(e) && !e.dataTransfer.types.length) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropHoverIdx !== idx) setDropHoverIdx(idx);
  };

  const handleSlotDrop = (e, toIdx) => {
    if (!canDragSlots || !onHeroDrop) return;
    e.preventDefault();
    e.stopPropagation();
    const payload = getDeckDragData(e);
    setDropHoverIdx(null);
    setDragSlotIdx(null);
    if (!payload) return;
    if (payload.source === 'slot' && payload.fromIdx === toIdx) return;
    if (payload.source === 'picker' && maxHeroes && !displayHeroes[toIdx]
      && displayHeroes.filter(Boolean).length >= maxHeroes) {
      return;
    }
    onHeroDrop(payload, toIdx);
  };

  const renderSingleHeroSlot = (h, idx) => {
    const selected = isSlotSelected(idx);
    const isDropTarget = dropHoverIdx === idx;
    const isDragging = dragSlotIdx === idx;
    const dropStyle = isDropTarget
      ? { outline: '2px solid var(--accent-cyan)', outlineOffset: '2px', boxShadow: '0 0 14px rgba(56,189,248,0.55)' }
      : {};

    if (!h) {
      const emptyLocked = !!(maxHeroes && displayHeroes.filter(Boolean).length >= maxHeroes);
      return (
        <div key={idx} className="deck-hero-slot">
          <div
            className="deck-hero-slot-face"
            onClick={() => handleSlotClickInternal(null, idx)}
            onDragOver={e => handleSlotDragOver(e, idx)}
            onDragLeave={() => { if (dropHoverIdx === idx) setDropHoverIdx(null); }}
            onDrop={e => handleSlotDrop(e, idx)}
            title={emptyLocked ? `최대 ${maxHeroes}명까지 배치할 수 있습니다` : undefined}
            style={{
              border: selected && !emptyLocked ? '2px solid var(--accent-cyan)' : '1px dashed var(--border-subtle)',
              background: selected && !emptyLocked ? 'rgba(56,189,248,0.1)' : 'rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: selected && !emptyLocked ? 'var(--accent-cyan)' : '#475569',
              fontSize: '11px', fontWeight: 800,
              cursor: emptyLocked ? 'not-allowed' : 'pointer',
              opacity: emptyLocked ? 0.4 : 1,
              boxShadow: selected && !emptyLocked ? '0 0 12px rgba(56,189,248,0.5)' : 'none',
              transition: 'all 0.2s ease',
              ...dropStyle,
            }}
          >
            {selected && !emptyLocked ? <span style={{ width: '9px', height: '9px', background: 'var(--accent-cyan)', display: 'inline-block', transform: 'rotate(45deg)' }} /> : `+${idx + 1}`}
          </div>
        </div>
      );
    }

    const role = h.role || h.type || 'offensive';
    const tier = h.cardTier || 'normal';

    return (
      <div key={idx} className="deck-hero-slot" style={{ opacity: isDragging ? 0.45 : 1 }}>
        <div
          className="deck-hero-slot-face"
          draggable={canDragSlots}
          onDragStart={e => {
            if (!canDragSlots) return;
            setDeckDragData(e, { source: 'slot', fromIdx: idx });
            setDragSlotIdx(idx);
          }}
          onDragEnd={() => { setDragSlotIdx(null); setDropHoverIdx(null); }}
          onDragOver={e => handleSlotDragOver(e, idx)}
          onDragLeave={() => { if (dropHoverIdx === idx) setDropHoverIdx(null); }}
          onDrop={e => handleSlotDrop(e, idx)}
          onClick={() => handleSlotClickInternal(h, idx)}
          title={h.name ? h.name.replace('(각성)', '') : undefined}
          style={{
            position: 'relative', background: CARD_BG[tier],
            border: selected ? '2.5px solid var(--accent-cyan)' : '1.5px solid var(--gold-primary)',
            boxShadow: selected ? '0 0 14px rgba(56,189,248,0.6)' : '0 2px 6px rgba(0,0,0,0.6)',
            cursor: canDragSlots ? 'grab' : 'pointer', transition: 'all 0.2s ease',
            ...dropStyle,
          }}
        >
          {h.isAwakened && (
            <span className="awaken-badge" style={{ position: 'absolute', top: '1px', left: '1px', fontSize: '7px', padding: '0 3px', zIndex: 6 }}>각성</span>
          )}
          <SafeImg src={h.portraitUrl} alt={h.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', pointerEvents: 'none' }} />

          {ROLE_ICON[role] && (
            <img src={ROLE_ICON[role]} alt="" style={{ position: 'absolute', bottom: '2px', left: '2px', width: '12px', height: '12px', zIndex: 5, pointerEvents: 'none' }} />
          )}

          {selected && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(56,189,248,0.15)', zIndex: 7, pointerEvents: 'none' }} />
          )}
        </div>
      </div>
    );
  };

  const renderOverviewHeroSlot = (h, idx) => {
    if (!h) {
      return (
        <div key={idx} className="deck-hero-slot">
          <div
            className="deck-hero-slot-face"
            style={{
              border: '1px dashed var(--border-subtle)',
              background: 'rgba(0,0,0,0.3)',
            }}
          />
        </div>
      );
    }

    const role = h.role || h.type || 'offensive';
    const tier = h.cardTier || 'normal';
    const name = h.name ? h.name.replace('(각성)', '') : '';

    return (
      <div key={idx} className="deck-hero-slot">
        <div
          className="deck-hero-slot-face"
          title={name || undefined}
          style={{
            position: 'relative',
            background: CARD_BG[tier],
            border: '1.5px solid var(--gold-primary)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
          }}
        >
          {h.isAwakened && (
            <span className="awaken-badge" style={{ position: 'absolute', top: '1px', left: '1px', fontSize: '7px', padding: '0 3px', zIndex: 6 }}>각성</span>
          )}
          <SafeImg src={h.portraitUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
          {ROLE_ICON[role] && (
            <img src={ROLE_ICON[role]} alt="" style={{ position: 'absolute', bottom: '2px', left: '2px', width: '12px', height: '12px', zIndex: 5 }} />
          )}
        </div>
      </div>
    );
  };

  const handleSelectFormation = (fId) => {
    setCurrentFormationId(fId);
    if (onFormationChange) onFormationChange(fId);
    setIsFormationModalOpen(false);
  };

  const handleSelectPet = (p) => {
    setSelectedPet(p);
    if (onPetChange) onPetChange(p);
    setIsPetModalOpen(false);
  };

  const canEditPetOrFormation = !!(onSlotClick || onPetChange || onFormationChange || isEditMode);

  const handleSpeedDragStart = (idx) => {
    if (!isEditMode) return;
    setDragSpeedIdx(idx);
  };
  const handleSpeedDrop = (toIdx) => {
    if (!isEditMode || dragSpeedIdx === null || dragSpeedIdx === toIdx) {
      setDragSpeedIdx(null);
      return;
    }
    const fromIdx = dragSpeedIdx;
    const next = [...speedOrderList];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setSpeedOrderList(next);
    setDragSpeedIdx(null);
  };

  const commitSpeedConfig = () => {
    emitSpeedConfig(speedOrderList, speedIgnoredSet);
    setIsSpeedModalOpen(false);
  };

  return (
    <>
    <div
      className={['ingame-deck-card', compact ? 'deck-card-compact' : '', embedded ? 'ingame-deck-card--embedded' : ''].filter(Boolean).join(' ')}
      style={{
      width: embedded ? '100%' : (compact ? '196px' : '276px'),
      background: 'transparent',
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
      border: embedded ? 'none' : (isSelected
        ? `2px solid ${accentColor || 'rgba(255,255,255,0.55)'}`
        : `1px solid ${accentColor || 'rgba(255,255,255,0.12)'}`),
      borderRadius: embedded ? 0 : (compact ? '14px' : '18px'),
      padding: embedded ? 0 : (compact ? '8px 6px' : '16px 14px'),
      boxShadow: 'none',
      display: 'flex', flexDirection: 'column', gap: embedded ? '10px' : (compact ? '8px' : '14px'),
      position: 'relative', flexShrink: 0, boxSizing: 'border-box', minWidth: 0
    }}>
      
      {(teamName || headerSlot || onEditClick || (!isInspectView && !isPvp) || (!isInspectView && isPvp && !hideReservationBtn)) && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '6px' : '10px' }}>
        {(teamName || headerSlot) && (
          <div style={{
            display: 'flex',
            flexDirection: !compact && teamName && headerSlot ? 'column' : 'row',
            alignItems: !compact && teamName && headerSlot ? 'stretch' : 'center',
            justifyContent: compact && teamName && headerSlot ? 'space-between' : 'center',
            gap: compact ? '6px' : '8px',
            minWidth: 0,
            width: '100%'
          }}>
            {teamName ? (
              <div style={{
                fontSize: compact ? '12px' : '13px', fontWeight: 800, color: '#e2e8f0',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                minWidth: 0, textAlign: compact ? 'left' : 'center'
              }}>{teamName}</div>
            ) : null}
            {headerSlot}
          </div>
        )}
        {((!isInspectView && !isPvp) || (!isInspectView && isPvp && !hideReservationBtn) || onEditClick) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {!isInspectView && !isPvp && (
              <button type="button" onClick={() => setIsSpeedModalOpen(true)}
                style={{
                  width: '100%', padding: '12px 14px', fontSize: '14px', fontWeight: 900,
                  borderRadius: '10px', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)',
                  color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }} title="속공 순서 보기/설정">
                <Icon name="boot" size={16} /> 속공 순서
              </button>
            )}
            {!isInspectView && isPvp && !hideReservationBtn && (
              <button type="button" onClick={() => setIsReservationModalOpen(true)}
                style={{
                  width: '100%', padding: '12px 14px', fontSize: '14px', fontWeight: 900,
                  borderRadius: '10px', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)',
                  color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }} title={onReservationChange ? '스킬 예약 설정' : 'PvP 스킬 예약 순서 보기'}>
                <Icon name="target" size={16} /> 스킬 예약
                {(reservedSkills || []).filter(Boolean).length > 0 && (
                  <span style={{
                    fontSize: '11px', fontWeight: 800, padding: '1px 7px', borderRadius: '999px',
                    background: 'rgba(255,255,255,0.86)', color: '#161616',
                  }}>
                    {(reservedSkills || []).filter(Boolean).length}/3
                  </span>
                )}
              </button>
            )}
            {onEditClick && (
              <button type="button" onClick={onEditClick} className="btn-ops" style={{
                width: '100%', padding: '12px 14px', fontSize: '14px', justifyContent: 'center', borderRadius: '12px'
              }}>
                <Icon name="edit" size={16} /> 덱 수정
              </button>
            )}
          </div>
        )}
      </div>
      )}

      {/* 2. 영웅 2열 무대 배치 (고정 크기 컨테이너로 흔들림 방지) */}
      <div className="deck-stage">

        {/* 고정 폭 무대 */}
        <div className="deck-stage-formation">
          {renderFormationLayout()}
        </div>

        {/* 우측: 장착 펫 + 진형 버튼 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? '8px' : '10px', width: compact ? '44px' : '56px', flexShrink: 0 }}>

          {!hidePet && (
            <div onClick={() => canEditPetOrFormation && setIsPetModalOpen(true)}
              style={{
                position: 'relative',
                width: compact ? '44px' : '56px',
                height: compact ? '44px' : '56px',
                borderRadius: compact ? '10px' : '12px', overflow: 'hidden',
                background: 'linear-gradient(180deg, #facc15 0%, #ca8a04 100%)',
                border: compact ? '1.5px solid #fde047' : '2px solid #fde047',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
                cursor: canEditPetOrFormation ? 'pointer' : 'default',
                flexShrink: 0
              }} title={canEditPetOrFormation ? "클릭하여 펫 변경하기" : selectedPet?.name || "장착 펫"}>
              {selectedPet?.portraitUrl ? (
                <img src={selectedPet.portraitUrl} alt={selectedPet.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Icon name="paw" size={compact ? 18 : 20} color="#1a1204" />
              )}
            </div>
          )}

          <div onClick={(e) => { e.stopPropagation(); if (canEditPetOrFormation) setIsFormationModalOpen(true); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: canEditPetOrFormation ? 'pointer' : 'default', flexShrink: 0
            }} title={canEditPetOrFormation ? "진형 변경하기" : currentFormation.name}>
            {renderFormationCircleIcon(currentFormationId, compact ? 44 : 56)}
          </div>

        </div>

      </div>

      {isInspectView && (
        <button
          type="button"
          onClick={() => setIsGearOverviewOpen(true)}
          className="btn-ops"
          style={{
            marginTop: compact ? 0 : '-4px', padding: compact ? '7px 6px' : '11px 10px',
            borderRadius: compact ? '8px' : '999px',
            fontSize: compact ? '11px' : '13px', width: '100%', boxSizing: 'border-box',
            justifyContent: 'center'
          }}
        >
          <Icon name="swords" size={compact ? 12 : 14} /> 세팅 확인
        </button>
      )}
    </div>

    {createPortal(
      <>
      {/* 펫 도감 선택 모달 (위아래 삐져나감 방지 콤팩트 핏팅) */}
      {isPetModalOpen && (
        <div className="modal-scrim" style={{ zIndex: 5800, padding: '20px' }} {...backdropDismissProps(() => dismissSubModal(() => setIsPetModalOpen(false)))}>
          <div onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} className="glass-modal" style={{
            width: '540px', maxHeight: '75vh', padding: '20px', borderRadius: '18px',
            display: 'flex', flexDirection: 'column', gap: '14px', boxSizing: 'border-box', minHeight: 0
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-gold)', paddingBottom: '10px', flexShrink: 0 }}>
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--gold-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="paw" size={17} /> 펫 도감 장착 선택 ({pets.length}종)
              </h3>
              <button onClick={() => dismissSubModal(() => setIsPetModalOpen(false))} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><Icon name="close" size={18} /></button>
            </div>

            {/* 펫 그리드 내부 스크롤 처리 */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', paddingRight: '4px' }}>
              {pets.map(p => (
                <div key={p.id} onClick={() => handleSelectPet(p)}
                  style={{
                    background: selectedPet?.id === p.id ? 'rgba(236,232,224,0.25)' : 'rgba(255,255,255,0.04)',
                    border: selectedPet?.id === p.id ? '2px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', padding: '8px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}>
                  <div style={{
                    width: '50px', height: '56px', borderRadius: '8px', overflow: 'hidden',
                    background: 'linear-gradient(180deg, #facc15 0%, #ca8a04 100%)',
                    border: '1.5px solid #fde047', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px'
                  }}>
                    {p.portraitUrl ? <img src={p.portraitUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="paw" size={22} />}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 900, color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '100%' }}>{p.name}</div>
                  <span style={{ fontSize: '9px', color: 'var(--gold-primary)', fontWeight: 800 }}>스페셜 펫</span>
                </div>
              ))}
            </div>

            <button onClick={() => dismissSubModal(() => setIsPetModalOpen(false))} className="btn-ops" style={{ padding: '10px', justifyContent: 'center', flexShrink: 0 }}>
              펫 장착 완료
            </button>
          </div>
        </div>
      )}

      {/* 속공 순서 보기 / 수정 모달 (PvE 전용 — 드래그 + 영웅별 상관없음) */}
      {isSpeedModalOpen && (() => {
        const ordered = speedOrderList.filter(Boolean);
        let rankCursor = 0;
        const displayRanks = ordered.map((h) => {
          const name = cleanHeroName(h);
          if (speedIgnoredSet.has(name)) return null;
          rankCursor += 1;
          return rankCursor;
        });
        return (
        <div className="modal-scrim" style={{ zIndex: 5800, padding: '12px' }} {...backdropDismissProps(() => dismissSubModal(() => (isEditMode ? commitSpeedConfig() : setIsSpeedModalOpen(false))))}>
          <div onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} className="glass-modal" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'stretch',
            width: 'max-content', maxWidth: '96vw',
            padding: '14px 14px', gap: '10px',
            borderRadius: '16px', position: 'relative',
            maxHeight: '90vh', minHeight: 0,
            boxSizing: 'border-box'
          }}>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Icon name="bolt" size={16} color="var(--gold-primary)" /> 속공 순서
            </div>
            {isEditMode && (
              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4, textAlign: 'center' }}>
                드래그로 순서 변경 · 「속공 상관없음」으로 순위 제외
              </div>
            )}

            <div className="speed-order-edit-strip" style={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '6px',
              padding: '10px', background: 'rgba(255,255,255,0.07)', borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.10)', boxSizing: 'border-box'
            }}>
              {ordered.map((h, i) => {
                const name = cleanHeroName(h);
                const ignored = speedIgnoredSet.has(name);
                const rank = displayRanks[i];
                return (
                  <Fragment key={`${name}_${i}`}>
                    <div
                      draggable={isEditMode}
                      onDragStart={() => handleSpeedDragStart(i)}
                      onDragOver={e => { if (isEditMode) e.preventDefault(); }}
                      onDrop={() => handleSpeedDrop(i)}
                      onDragEnd={() => setDragSpeedIdx(null)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                        width: isEditMode ? '78px' : '64px', flexShrink: 0,
                        cursor: isEditMode ? 'grab' : 'default',
                        opacity: dragSpeedIdx === i ? 0.45 : ignored ? 0.72 : 1,
                        transform: dragSpeedIdx === i ? 'scale(0.96)' : 'none',
                        transition: 'opacity 0.12s ease, transform 0.12s ease',
                        padding: '2px', borderRadius: '10px',
                        background: dragSpeedIdx !== null && dragSpeedIdx !== i ? 'rgba(236,232,224,0.08)' : 'transparent',
                        border: dragSpeedIdx !== null && dragSpeedIdx !== i ? '1px dashed var(--border-gold)' : '1px solid transparent'
                      }}
                      title={isEditMode ? '드래그해서 순서 변경' : undefined}
                    >
                      <div style={{
                        position: 'relative', width: '56px', height: '56px', borderRadius: '11px', overflow: 'hidden',
                        border: ignored ? '2px solid #64748b' : '2px solid var(--gold-primary)',
                        boxShadow: '0 3px 10px rgba(0,0,0,0.45)'
                      }}>
                        <span style={{
                          position: 'absolute', top: '3px', left: '3px', zIndex: 5, lineHeight: 1.2,
                          background: ignored ? '#475569' : 'var(--gold-primary)',
                          color: ignored ? '#fff' : '#000',
                          fontSize: ignored ? '9px' : '11px', fontWeight: 900,
                          padding: ignored ? '2px 4px' : '1px 5px', borderRadius: '5px',
                          maxWidth: '50px', textAlign: 'center'
                        }}>{ignored ? '무관' : `${rank}위`}</span>
                        <SafeImg src={h.portraitUrl} alt={h.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <span style={{
                        fontSize: '11px', fontWeight: 900, color: '#fff', textAlign: 'center',
                        width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>{name}</span>
                      {ignored && !isEditMode && (
                        <span style={{
                          fontSize: '10px', fontWeight: 900, color: '#94a3b8',
                          background: 'rgba(71,85,105,0.45)', padding: '3px 5px', borderRadius: '6px',
                          border: '1px solid rgba(148,163,184,0.35)', whiteSpace: 'nowrap'
                        }}>상관없음</span>
                      )}
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleSpeedIgnored(name); }}
                          onMouseDown={e => e.stopPropagation()}
                          style={{
                            width: '100%', padding: '6px 3px', borderRadius: '7px', cursor: 'pointer',
                            fontSize: '10px', fontWeight: 900, lineHeight: 1.2,
                            border: ignored ? '1.5px solid var(--accent-red)' : '1.5px solid var(--border-subtle)',
                            background: ignored ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.06)',
                            color: ignored ? '#fca5a5' : '#cbd5e1'
                          }}
                        >
                          {ignored ? '상관없음 ON' : '속공 상관없음'}
                        </button>
                      )}
                    </div>

                    {i < ordered.length - 1 && (
                      <span style={{
                        flexShrink: 0, alignSelf: isEditMode ? 'flex-start' : 'center',
                        color: 'var(--gold-primary)', display: 'inline-flex',
                        width: '14px', justifyContent: 'center',
                        marginTop: isEditMode ? '20px' : '0'
                      }}>
                        <Icon name="chevronRight" size={14} strokeWidth={2.5} />
                      </span>
                    )}
                  </Fragment>
                );
              })}
            </div>

            <button onClick={() => dismissSubModal(() => (isEditMode ? commitSpeedConfig() : setIsSpeedModalOpen(false)))} className="btn-ops" style={{
              padding: '10px 0', justifyContent: 'center'
            }}>
              {isEditMode ? '확인 및 속공 순서 저장' : '닫기'}
            </button>
          </div>
        </div>
        );
      })()}

      {/* 스킬 예약 가로 보드 (PvP 전용, 최대 3개) */}
      {isReservationModalOpen && (
        <div className="modal-scrim" style={{ zIndex: 4800, padding: '16px' }} {...backdropDismissProps(() => dismissSubModal(() => setIsReservationModalOpen(false)))}>
          <div onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} className="glass-modal" style={{
            width: 'fit-content', minWidth: 'min(520px, 96vw)', maxWidth: '96vw', maxHeight: '90vh', minHeight: 0, padding: '14px 16px',
            borderRadius: '18px', position: 'relative', display: 'flex', flexDirection: 'column', boxSizing: 'border-box'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#fff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <Icon name="target" size={19} color="var(--accent-cyan)" /> 스킬 예약
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '18px', flexShrink: 0 }}>
              {onReservationChange ? '아이콘을 눌러 최대 3개까지 예약하세요. 같은 아이콘을 다시 누르면 해제됩니다.' : 'PvP는 최대 3개의 스킬만 미리 예약할 수 있습니다.'}
            </div>

            <div style={{ minHeight: 0, overflowY: 'auto' }}>
            <SkillReservationBoard
              heroNames={displayHeroes.filter(Boolean).map(h => h.name ? h.name.replace('(각성)', '') : '')}
              resolveHeroByName={resolveHeroByName}
              value={reservedSkills}
              onChange={onReservationChange}
              readOnly={!onReservationChange}
              maxHeroes={maxHeroes}
            />
            </div>

            <button onClick={() => dismissSubModal(() => setIsReservationModalOpen(false))} className="btn-ops" style={{
              width: '100%', padding: '12px 0', marginTop: '18px', justifyContent: 'center', flexShrink: 0
            }}>
              {onReservationChange ? '예약 확인' : '닫기'}
            </button>
          </div>
        </div>
      )}

      {/* 진형 선택 모달 */}
      {isFormationModalOpen && (
        <div className="modal-scrim" style={{ zIndex: 5800 }} {...backdropDismissProps(() => dismissSubModal(() => setIsFormationModalOpen(false)))}>
          <div onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} className="glass-modal" style={{
            width: '680px', padding: '28px', borderRadius: '20px',
            display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-gold)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--gold-primary)', display: 'flex', alignItems: 'center', gap: '9px' }}>
                <Icon name="shield" size={20} /> 진형 선택
              </h3>
              <button onClick={() => dismissSubModal(() => setIsFormationModalOpen(false))} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><Icon name="close" size={20} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {formationSet.map(f => {
                const isCurrent = f.id === currentFormationId;
                return (
                  <div key={f.id} onClick={() => handleSelectFormation(f.id)}
                    style={{
                      background: isCurrent ? 'rgba(236,232,224,0.18)' : 'rgba(0,0,0,0.5)',
                      border: isCurrent ? '2px solid var(--gold-primary)' : '1px solid var(--border-subtle)',
                      borderRadius: '14px', padding: '18px', cursor: 'pointer', transition: 'all 0.2s ease',
                      display: 'flex', gap: '14px', alignItems: 'center'
                    }}>
                    
                    {renderFormationCircleIcon(f.id)}

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '16px', fontWeight: 900, color: isCurrent ? 'var(--gold-primary)' : '#fff' }}>
                          {f.name}
                        </div>
                        {isCurrent && <span style={{ fontSize: '11px', background: 'var(--gold-primary)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '3px' }}><Icon name="check" size={11} color="#000" /> 선택됨</span>}
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--accent-cyan)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div>• 후방 ({f.backCount}명): <strong style={{ color: 'var(--gold-primary)' }}>{f.backBuff}</strong></div>
                        <div>• 전방 ({f.frontCount}명): <strong style={{ color: '#fff' }}>{f.frontBuff}</strong></div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            <button onClick={() => dismissSubModal(() => setIsFormationModalOpen(false))} className="btn-ops" style={{
              width: '100%', padding: '12px 0', justifyContent: 'center'
            }}>
              진형 선택 완료
            </button>
          </div>
        </div>
      )}
      {/* 세팅 확인 — 스킬/속공 + 장비 디테일 한 화면 */}
      {isGearOverviewOpen && (
        <div className="modal-scrim" style={{ zIndex: 4000, padding: '16px' }} {...backdropDismissProps(() => dismissSubModal(() => setIsGearOverviewOpen(false)))}>
          <div onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} ref={settingCaptureRef} className="glass-modal" style={{
            width: 'fit-content', minWidth: 'min(560px, 96vw)', maxWidth: '96vw', maxHeight: '90vh', padding: '12px 14px', borderRadius: '16px',
            display: 'flex', flexDirection: 'column', gap: '10px', boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: '17px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <Icon name="swords" size={16} /> 세팅 확인
                  {isPvp && pvpMode ? <PvpModeBadge mode={pvpMode} size="sm" /> : null}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, marginTop: '4px' }}>
                  {isPvp ? '스킬 예약 · 장비 · 장신구 · 디테일' : '속공 순서 · 장비 · 장신구 · 디테일'}
                </div>
              </div>
              <button type="button" className="no-capture" onClick={() => dismissSubModal(() => setIsGearOverviewOpen(false))}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: '#fff', cursor: 'pointer', padding: '6px', display: 'flex', flexShrink: 0 }}>
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="setting-overview-body">
              {isPvp ? (
                <div className="setting-overview-section">
                  <div className="setting-overview-label">
                    <Icon name="target" size={14} /> 스킬 예약
                  </div>
                  <SkillReservationBoard
                    heroNames={displayHeroes.filter(Boolean).map(h => (h.name || '').replace('(각성)', ''))}
                    resolveHeroByName={resolveHeroByName}
                    value={reservedSkills}
                    readOnly
                    compact
                    maxHeroes={maxHeroes}
                  />
                </div>
              ) : (
                <div className="setting-overview-section">
                  <div className="setting-overview-label">
                    <Icon name="boot" size={14} /> 속공 순서
                  </div>
                  {speedOrderList.length === 0 ? (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 700 }}>등록된 속공 순서가 없습니다.</div>
                  ) : (
                    <div className="speed-order-strip">
                      {speedOrderList.map((h, idx) => {
                        const name = cleanHeroName(h);
                        const ignored = speedIgnoredSet.has(name);
                        return (
                          <Fragment key={`${name}_${idx}`}>
                            {idx > 0 && <Icon name="arrowRight" size={14} className="speed-order-arrow" color={ignored ? '#64748b' : 'var(--gold-primary)'} />}
                            <div className={`speed-order-chip${ignored ? ' is-off' : ''}`}>
                              <span className="speed-order-num">{ignored ? '제외' : idx + 1}</span>
                              <div className="speed-order-face">
                                <SafeImg src={h.portraitUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                              </div>
                              <strong>{name}</strong>
                            </div>
                          </Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {Array.isArray(overviewNotes) && overviewNotes.some(n => n?.text) && (
                <div className="setting-overview-section">
                  <div className="setting-overview-label">
                    <Icon name="bolt" size={14} /> 공략 메모
                  </div>
                  <div className="setting-overview-notes">
                    {overviewNotes.filter(n => n?.text).map((note, idx) => (
                      <div key={`${note.label || 'note'}_${idx}`}>
                        {note.label && note.label !== '메모' && (
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>{note.label}</div>
                        )}
                        <div style={{ fontSize: '13.5px', color: '#e2e8f0', whiteSpace: 'pre-line', lineHeight: 1.55 }}>{note.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="setting-overview-section">
                <div className="setting-overview-label">
                  <Icon name="swords" size={14} /> 전원 장비 · 세팅 디테일
                </div>
                {filledInspectHeroes.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 800, fontSize: '14px' }}>
                    배치된 영웅이 없습니다.
                  </div>
                ) : (
                  <div className={`gear-overview-grid gear-overview-grid--${Math.min(overviewCellCount, 6)}`}>
                    {filledInspectHeroes.slice(0, 5).map((hero, idx) => (
                      <div key={`${hero.id || hero.name}-${idx}`}>
                        {renderHeroGearBlock(hero, true)}
                      </div>
                    ))}
                    {showOverviewDeck && (
                      <div className="setting-overview-deck">
                        <div className="setting-overview-deck-label">배치 · 펫</div>
                        <div className="deck-stage">
                          <div className="deck-stage-formation">
                            {renderFormationLayout(renderOverviewHeroSlot)}
                          </div>
                          {!hidePet && (
                            <div className="setting-overview-deck-pet" title={selectedPet?.name || '장착 펫'}>
                              {selectedPet?.portraitUrl ? (
                                <img src={selectedPet.portraitUrl} alt={selectedPet.name} />
                              ) : (
                                <Icon name="paw" size={20} color="#1a1204" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="setting-overview-actions no-capture">
              <button
                type="button"
                className="btn-share-setting"
                disabled={shareBusy}
                onClick={shareSettingImage}
              >
                <Icon name="copy" size={14} color="#161616" />
                {shareBusy ? '복사 중…' : '세팅 공유'}
              </button>
              <button type="button" onClick={() => dismissSubModal(() => setIsGearOverviewOpen(false))} className="btn-ops" style={{
                padding: '12px', justifyContent: 'center', borderRadius: '12px'
              }}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
      <CopyNotice message={shareNotice} onClose={() => setShareNotice('')} />
      </>,
      document.body
    )}
    </>
  );
}
