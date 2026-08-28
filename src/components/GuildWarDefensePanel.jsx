import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './icons/Icon';
import HeroPortraitCard from './HeroPortraitCard';
import InGameDeckCard from './InGameDeckCard';
import HeroGearPanel, { emptyGearConfig } from './HeroGearPanel';
import StrategyActionBar from './StrategyActionBar';
import SkillReservationBoard from './SkillReservationBoard';
import PvpModeToggle, { PvpModeBadge } from './PvpModeToggle';
import { ArenaDeckKindBadge, MetaDeckKindToggle, normalizeMetaDeckKind } from './ArenaDeckKind';
import { pets } from '../data/pets';
import { sortHeroesForList } from '../data/heroes';
import { ROLE_ICONS } from '../data/roleIcons';
import { backdropDismissProps } from '../utils/backdropDismiss';
import { closeOverlayFromUI, collapseOverlayHistory, pushOverlay } from '../utils/overlayHistory';
import { setDeckDragData, startDeckPointerDrag, markDeckPointerDown, allowHtml5DeckDrag, shouldSuppressDeckClick } from '../utils/deckDrag';
import ModalScrim from './ModalScrim';

const ROLE_FILTERS = [
  { id: 'all', label: '전체', icon: null },
  { id: 'offensive', label: '공격형', icon: ROLE_ICONS.offensive },
  { id: 'magic', label: '마법형', icon: ROLE_ICONS.magic },
  { id: 'defensive', label: '방어형', icon: ROLE_ICONS.defensive },
  { id: 'support', label: '지원형', icon: ROLE_ICONS.support },
  { id: 'universal', label: '만능형', icon: ROLE_ICONS.universal },
];

const emptyHeroSlot = () => ({ primaryName: '', altText: '' });
const emptySlots5 = () => [emptyHeroSlot(), emptyHeroSlot(), emptyHeroSlot(), emptyHeroSlot(), emptyHeroSlot()];
const emptyGear5 = () => [emptyGearConfig(), emptyGearConfig(), emptyGearConfig(), emptyGearConfig(), emptyGearConfig()];

const emptySetting = () => ({
  mode: '속공',
  deckKind: normalizeMetaDeckKind('attack'),
  reservedSkills: [],
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

/** 구버전 variants[] → 덱당 세팅 1개로 평탄화. */
const flattenDefense = (d = {}) => {
  const v = Array.isArray(d.variants) && d.variants.length ? d.variants[0] : {};
  const gearSrc = d.heroGearConfigs || v.heroGearConfigs;
  return {
    ...d,
    mode: d.mode || v.mode || '속공',
    deckKind: normalizeMetaDeckKind(d.deckKind ?? v.deckKind),
    reservedSkills: [...(d.reservedSkills || v.reservedSkills || [])],
    otherDetail: d.otherDetail ?? v.otherDetail ?? '',
    speedMin: d.speedMin ?? v.speedMin ?? '',
    speedMax: d.speedMax ?? v.speedMax ?? '',
    heroGearConfigs: (gearSrc && gearSrc.length === 5)
      ? gearSrc.map(g => ({ ...emptyGearConfig(), ...g }))
      : emptyGear5(),
    altDecks: Array.isArray(d.altDecks) ? d.altDecks : [],
  };
};

const formatSpeedBadge = (d) => {
  if (d?.mode === '내실') return '';
  const min = String(d?.speedMin ?? '').trim();
  const max = String(d?.speedMax ?? '').trim();
  if (!min && !max) return '';
  if (min && max) return `속공 ${min}이상 ~ ${max}이하`;
  if (min) return `속공 ${min}이상`;
  return `속공 ${max}이하`;
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

function SpeedBadge({ text, className = '' }) {
  if (!text) return null;
  return (
    <span className={`gw-defense-speed-badge ${className}`.trim()}>
      {text}
    </span>
  );
}

export default function GuildWarDefensePanel({ gwDefenses, setGwDefenses, guildRoom, onBuildHistory, resolveHeroByName, heroes, canDeleteBuild }) {
  const [expandedId, setExpandedId] = useState(null);
  const [altsOpenId, setAltsOpenId] = useState(null);
  const [expandedAltId, setExpandedAltId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [slotIdx, setSlotIdx] = useState(0);
  const [roleFilter, setRoleFilter] = useState('all');
  const [dragGhost, setDragGhost] = useState(null);
  const dragGhostRef = useRef(null);

  useEffect(() => {
    dragGhostRef.current = dragGhost;
  }, [dragGhost]);

  const closeDefenseModal = () => closeOverlayFromUI(() => setIsModalOpen(false));

  useEffect(() => {
    if (!isModalOpen) return;
    pushOverlay(() => setIsModalOpen(false));
  }, [isModalOpen]);

  const openCreate = () => {
    setForm({
      id: null,
      parentId: null,
      title: '',
      tier: 3,
      formationId: 'protect',
      petId: pets[0]?.id || null,
      heroSlots: emptySlots5(),
      ...emptySetting(),
    });
    setSlotIdx(0);
    setIsModalOpen(true);
  };

  const openEdit = (raw) => {
    const d = flattenDefense(raw);
    setForm({
      id: d.id,
      parentId: null,
      title: d.title || '',
      tier: d.tier,
      formationId: normalizeFormationId(d.formationId),
      petId: d.petId || pets[0]?.id || null,
      heroSlots: padSlots5(d.heroSlots),
      mode: d.mode === '내실' ? '내실' : '속공',
      deckKind: normalizeMetaDeckKind(d.deckKind),
      reservedSkills: d.reservedSkills,
      otherDetail: d.otherDetail,
      speedMin: d.speedMin,
      speedMax: d.speedMax,
      heroGearConfigs: d.heroGearConfigs,
    });
    setSlotIdx(0);
    setIsModalOpen(true);
  };

  const openCreateAlt = (parentId) => {
    setForm({
      id: null,
      parentId,
      title: '',
      tier: 3,
      formationId: 'protect',
      petId: pets[0]?.id || null,
      heroSlots: emptySlots5(),
      ...emptySetting(),
    });
    setSlotIdx(0);
    setAltsOpenId(parentId);
    setIsModalOpen(true);
  };

  const openEditAlt = (parentId, altRaw) => {
    const d = flattenDefense(altRaw);
    setForm({
      id: d.id,
      parentId,
      title: d.title || '',
      tier: d.tier,
      formationId: normalizeFormationId(d.formationId),
      petId: d.petId || pets[0]?.id || null,
      heroSlots: padSlots5(d.heroSlots),
      mode: d.mode === '내실' ? '내실' : '속공',
      deckKind: normalizeMetaDeckKind(d.deckKind),
      reservedSkills: d.reservedSkills,
      otherDetail: d.otherDetail,
      speedMin: d.speedMin,
      speedMax: d.speedMax,
      heroGearConfigs: d.heroGearConfigs,
    });
    setSlotIdx(0);
    setIsModalOpen(true);
  };

  const defenseHistoryLabel = (slots, fallback = '방어 덱') => {
    const names = (slots || []).map((s) => s?.primaryName).filter(Boolean);
    return names.length ? names.join('/') : fallback;
  };

  const save = () => {
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
    // 제목 UI 제거 — 기존 문서 title은 덮어쓰지 않음(신규만 빈 문자열)
    const payload = {
      tier: form.tier,
      formationId: form.formationId,
      petId: form.petId,
      heroSlots: form.heroSlots,
      mode: form.mode === '내실' ? '내실' : '속공',
      deckKind: normalizeMetaDeckKind(form.deckKind),
      reservedSkills: (form.reservedSkills || []).filter(Boolean),
      otherDetail: form.otherDetail || '',
      speedMin: form.speedMin || '',
      speedMax: form.speedMax || '',
      heroGearConfigs: form.heroGearConfigs || emptyGear5(),
      author: guildRoom.myNickname,
      authorId: guildRoom.myMemberId || '',
      updatedAt: now,
    };
    const histLabel = defenseHistoryLabel(form.heroSlots);

    if (form.parentId) {
      setGwDefenses(prev => prev.map(d => {
        if (d.id !== form.parentId) return d;
        const list = Array.isArray(d.altDecks) ? [...d.altDecks] : [];
        if (form.id) {
          onBuildHistory?.('update_build', histLabel, '길드전 대체 방어');
          return {
            ...d,
            altDecks: list.map(a => (a.id === form.id ? { ...a, ...payload } : a)),
          };
        }
        const newAlt = { id: 'gwda_' + Date.now(), title: '', ...payload };
        onBuildHistory?.('create_build', histLabel, '길드전 대체 방어');
        setExpandedAltId(newAlt.id);
        return { ...d, altDecks: [...list, newAlt] };
      }));
      setAltsOpenId(form.parentId);
    } else if (form.id) {
      setGwDefenses(prev => prev.map(d => {
        if (d.id !== form.id) return d;
        const { variants, ...rest } = d;
        void variants;
        return {
          ...rest,
          ...payload,
          // 레거시 title: UI에서 뺐어도 Firestore·허브 문서에서 지우지 않음
          title: rest.title ?? '',
          altDecks: Array.isArray(rest.altDecks) ? rest.altDecks : [],
        };
      }));
      onBuildHistory?.('update_build', histLabel, '길드전 방어');
    } else {
      const newEntry = { id: 'gwd_' + Date.now(), title: '', ...payload, altDecks: [] };
      setGwDefenses(prev => [...prev, newEntry]);
      setExpandedId(newEntry.id);
      onBuildHistory?.('create_build', histLabel, '길드전 방어');
    }
    setIsModalOpen(false);
    collapseOverlayHistory();
  };

  const remove = (id) => {
    const target = gwDefenses.find(d => d.id === id);
    if (!canDeleteBuild?.(target)) {
      alert('삭제는 길드마스터·관리자 또는 작성자만 할 수 있습니다.');
      return;
    }
    if (!confirm('이 방어 세팅과 등록된 대체 덱을 모두 삭제할까요?')) return;
    setGwDefenses(prev => prev.filter(d => d.id !== id));
    if (expandedId === id) setExpandedId(null);
    if (altsOpenId === id) setAltsOpenId(null);
    onBuildHistory?.('delete_build', defenseHistoryLabel(target?.heroSlots, '방어 덱'), '길드전 방어');
  };

  const removeAlt = (parentId, altId) => {
    const parent = gwDefenses.find(d => d.id === parentId);
    const alt = (parent?.altDecks || []).find(a => a.id === altId);
    if (!canDeleteBuild?.(alt)) {
      alert('삭제는 길드마스터·관리자 또는 작성자만 할 수 있습니다.');
      return;
    }
    if (!confirm('이 대체 덱을 삭제할까요?')) return;
    setGwDefenses(prev => prev.map(d => (
      d.id !== parentId
        ? d
        : { ...d, altDecks: (d.altDecks || []).filter(a => a.id !== altId) }
    )));
    if (expandedAltId === altId) setExpandedAltId(null);
    onBuildHistory?.('delete_build', defenseHistoryLabel(alt?.heroSlots, '대체 덱'), '길드전 대체 방어');
  };

  const patchForm = (updates) => setForm(prev => ({ ...prev, ...updates }));

  const patchGearDetail = (text) => {
    if (!form) return;
    const cfgs = [...(form.heroGearConfigs || emptyGear5())];
    cfgs[slotIdx] = { ...(cfgs[slotIdx] || emptyGearConfig()), detailNote: text };
    patchForm({ heroGearConfigs: cfgs });
  };

  const placeHeroAt = (toIdx, name) => {
    if (!form) return;
    const next = [...form.heroSlots];
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
    patchForm({ heroSlots: next });
    setSlotIdx(toIdx);
  };

  const handleHeroDrop = (payload, toIdx) => {
    if (!form) return;
    if (payload?.source === 'slot' && typeof payload.fromIdx === 'number') {
      const next = [...form.heroSlots];
      const tmp = next[toIdx];
      next[toIdx] = next[payload.fromIdx];
      next[payload.fromIdx] = tmp;
      patchForm({ heroSlots: next });
      setSlotIdx(toIdx);
      return;
    }
    if (payload?.source === 'picker' && payload.name) {
      placeHeroAt(toIdx, payload.name);
    }
  };

  const pickHero = (name) => {
    if (!form) return;
    const next = [...form.heroSlots];
    const current = next[slotIdx]?.primaryName;
    const filledCount = next.filter(s => s?.primaryName).length;
    if (!current && filledCount >= 3) {
      alert('길드전은 최대 3명까지 배치할 수 있습니다.\n빈 칸이 아닌 기존 영웅을 교체하세요.');
      return;
    }
    next[slotIdx] = { ...(next[slotIdx] || emptyHeroSlot()), primaryName: name };
    patchForm({ heroSlots: next });
    const nextEmpty = next.findIndex((s, i) => i > slotIdx && !s?.primaryName);
    if (nextEmpty !== -1 && next.filter(s => s?.primaryName).length < 3) setSlotIdx(nextEmpty);
  };

  const sortedDefenses = gwDefenses;

  const clearDefenseDropHighlight = () => {
    document.querySelectorAll('.gw-defense-card.is-drop-target').forEach((el) => {
      el.classList.remove('is-drop-target');
    });
  };

  const reorderDefenses = (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;
    setGwDefenses((prev) => {
      const list = [...prev];
      const fromIdx = list.findIndex((d) => d.id === fromId);
      const toIdx = list.findIndex((d) => d.id === toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const [item] = list.splice(fromIdx, 1);
      list.splice(toIdx, 0, item);
      return list;
    });
    onBuildHistory?.('update_build', '방어 배치 순서', '길드전 방어');
  };

  const finishDefensePointerDrag = (clientX, clientY, ghost) => {
    clearDefenseDropHighlight();
    document.querySelectorAll('.gw-defense-card.is-dragging-source').forEach((el) => {
      el.classList.remove('is-dragging-source');
    });
    if (!ghost) {
      setDragGhost(null);
      return;
    }
    const under = document.elementFromPoint(clientX, clientY);
    const card = under?.closest?.('.gw-defense-card');
    const toId = card?.getAttribute('data-defense-id');
    if (toId) reorderDefenses(ghost.fromId, toId);
    setDragGhost(null);
  };

  const defenseDragLabel = (raw) => {
    const names = (raw?.heroSlots || [])
      .map((s) => s?.primaryName)
      .filter(Boolean)
      .map((n) => String(n).replace('(각성)', '').trim())
      .slice(0, 3);
    return names.length ? names.join(' · ') : '방어 덱';
  };

  const renderDefenseDragHandle = (raw, idx) => (
    <button
      type="button"
      className="gw-defense-drag-handle"
      draggable
      title="끌어 옮겨 배치 순서 변경"
      aria-label={`${idx + 1}번째 · 드래그로 순서 변경`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse') return;
        e.stopPropagation();
        e.preventDefault();
        const card = e.currentTarget.closest('.gw-defense-card');
        if (!card) return;
        const rect = card.getBoundingClientRect();
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragGhost({
          fromId: raw.id,
          title: defenseDragLabel(raw),
          x: rect.left,
          y: rect.top,
          w: rect.width,
          h: Math.min(rect.height, 72),
          ox: e.clientX - rect.left,
          oy: e.clientY - rect.top,
        });
      }}
      onPointerMove={(e) => {
        if (e.pointerType === 'mouse') return;
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        setDragGhost((g) => {
          if (!g) return null;
          return { ...g, x: e.clientX - g.ox, y: e.clientY - g.oy };
        });
        clearDefenseDropHighlight();
        const under = document.elementFromPoint(e.clientX, e.clientY);
        under?.closest?.('.gw-defense-card:not(.is-dragging-source)')?.classList.add('is-drop-target');
      }}
      onPointerUp={(e) => {
        if (e.pointerType === 'mouse') return;
        finishDefensePointerDrag(e.clientX, e.clientY, dragGhostRef.current);
      }}
      onPointerCancel={() => {
        clearDefenseDropHighlight();
        document.querySelectorAll('.gw-defense-card.is-dragging-source').forEach((el) => {
          el.classList.remove('is-dragging-source');
        });
        setDragGhost(null);
      }}
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData('application/x-gw-defense-id', raw.id);
        e.dataTransfer.setData('text/plain', raw.id);
        e.dataTransfer.effectAllowed = 'move';
        const card = e.currentTarget.closest('.gw-defense-card');
        if (card) {
          try {
            e.dataTransfer.setDragImage(card, Math.min(56, card.offsetWidth / 4), Math.min(36, card.offsetHeight / 2));
          } catch { /* ignore */ }
          card.classList.add('is-dragging-source');
        }
      }}
      onDragEnd={() => {
        clearDefenseDropHighlight();
        document.querySelectorAll('.gw-defense-card.is-dragging-source').forEach((el) => {
          el.classList.remove('is-dragging-source');
        });
      }}
    >
      <span className="gw-defense-drag-grip" aria-hidden="true" />
    </button>
  );

  const renderHeroes = (slots) => (
    <div className="community-pvp-card-heroes">
      {slots.filter(s => s.primaryName).map((s, i) => {
        const h = resolveHeroByName(s.primaryName);
        const label = String(s.primaryName).replace('(각성)', '').trim();
        return (
          <div key={`${s.primaryName}-${i}`} className="community-pvp-card-hero">
            <div className="community-pvp-card-hero-face">
              {h ? <HeroPortraitCard hero={h} showStars showRole showName={false} /> : null}
            </div>
            <span className="community-pvp-card-hero-name">{label}</span>
          </div>
        );
      })}
    </div>
  );

  const renderExpandedBody = (d) => {
    const slots = padSlots5(d.heroSlots);
    const heroNames5 = slots.map(s => s.primaryName);
    const mode = d.mode === '내실' ? '내실' : '속공';
    const reserved = Array.isArray(d.reservedSkills) ? d.reservedSkills : [];
    return (
      <div className="community-pvp-card-body build-panel">
        <div className="build-panel-deck">
          <InGameDeckCard
            embedded
            teamName=""
            overviewTitle=""
            formationId={normalizeFormationId(d.formationId)}
            heroList={heroNames5.map((name, idx) => {
              const baseHero = resolveHeroByName(name);
              return baseHero ? { hero: baseHero, gearConfig: (d.heroGearConfigs || [])[idx] } : name;
            })}
            slotCount={5}
            maxHeroes={3}
            petObj={resolvePet(d.petId)}
            contentMode="pvp"
            reservedSkills={reserved}
            pvpMode={mode}
            overviewNotes={String(d.otherDetail || '').trim()
              ? [{ label: '기타 디테일', text: String(d.otherDetail).trim() }]
              : []}
          />
        </div>
        <div className="build-panel-body">
          <div className="build-panel-playbook">
            <div className="build-panel-playbook-title">
              <Icon name="target" size={15} />
              스킬 예약 ({reserved.filter(Boolean).length}/3)
            </div>
            <SkillReservationBoard
              heroNames={heroNames5}
              resolveHeroByName={resolveHeroByName}
              value={reserved}
              readOnly
              maxReservations={3}
            />
          </div>
          <div className="gw-defense-other-detail">
            <div className="gw-defense-note-label">
              <Icon name="news" size={12} color="#94a3b8" />
              기타 디테일
            </div>
            <div className={`gw-defense-note-text${!String(d.otherDetail || '').trim() ? ' is-empty' : ''}`}>
              {String(d.otherDetail || '').trim() || '—'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /** 접힘·펼침 공통: (그립|) 덱티어 | 초상 | 덱종류 | 세팅 | 속공 */
  const renderPvpStyleHead = ({
    slots,
    mode,
    deckKind,
    tier,
    speedText,
    isOn,
    onToggle,
    actions,
    dragHandle = null,
  }) => (
    <div
      className={`community-pvp-card-head${isOn ? ' is-on' : ''}`}
      onClick={() => {
        if (dragGhost) return;
        onToggle();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (dragGhost) return;
          onToggle();
        }
      }}
    >
      <div className="community-pvp-card-main">
        {dragHandle ? (
          <div className="gw-defense-lead">
            {dragHandle}
            <span className="community-pvp-card-rule" aria-hidden>|</span>
            <div className="gw-defense-tier-block">
              <span className="gw-defense-tier-label">덱 티어</span>
              <TierStars tier={tier} readOnly />
            </div>
            <span className="community-pvp-card-rule" aria-hidden>|</span>
          </div>
        ) : (
          <div className="gw-defense-lead">
            <div className="gw-defense-tier-block">
              <span className="gw-defense-tier-label">덱 티어</span>
              <TierStars tier={tier} readOnly />
            </div>
            <span className="community-pvp-card-rule" aria-hidden>|</span>
          </div>
        )}
        <div className="community-pvp-card-stage">
          <div className="community-pvp-card-heroes-row">
            {renderHeroes(slots)}
          </div>
          <div className="community-pvp-card-meta">
            <ArenaDeckKindBadge kind={deckKind} />
            <PvpModeBadge mode={mode} size="sm" />
            {speedText ? <SpeedBadge text={speedText} /> : null}
          </div>
        </div>
      </div>
      <div className="community-pvp-card-actions" onClick={(e) => e.stopPropagation()}>
        {actions}
      </div>
    </div>
  );

  const renderAltLayer = (parent) => {
    const alts = Array.isArray(parent.altDecks) ? parent.altDecks : [];
    return (
      <div className="gw-alt-layer" onClick={e => e.stopPropagation()}>
        <div className="gw-alt-toolbar">
          <div className="gw-alt-toolbar-copy">
            <span>대체 덱</span>
            <em>메인 영웅이 없을 때 쓰는 대체 조합</em>
          </div>
          <button type="button" className="btn-ops gw-alt-add" onClick={() => openCreateAlt(parent.id)}>
            <Icon name="plus" size={11} /> 대체 덱 추가
          </button>
        </div>
        {alts.length === 0 && (
          <div className="gw-alt-empty">등록된 대체 덱이 없습니다.</div>
        )}
        {alts.map((rawAlt) => {
          const a = flattenDefense(rawAlt);
          const isAltOn = expandedAltId === a.id;
          const slots = padSlots5(a.heroSlots);
          const mode = a.mode === '내실' ? '내실' : '속공';
          const speedText = formatSpeedBadge(a);
          return (
            <div key={a.id} className={`luxury-panel community-pvp-card gw-alt-card${isAltOn ? ' is-expanded' : ''}`}>
              {renderPvpStyleHead({
                slots,
                mode,
                deckKind: a.deckKind,
                tier: a.tier,
                speedText,
                isOn: isAltOn,
                onToggle: () => setExpandedAltId(isAltOn ? null : a.id),
                actions: (
                  <>
                    <button type="button" className="btn-edit" onClick={() => openEditAlt(parent.id, rawAlt)}>
                      <Icon name="edit" size={13} /> 수정
                    </button>
                    {canDeleteBuild?.(a) ? (
                      <button type="button" className="btn-danger-solid" onClick={() => removeAlt(parent.id, a.id)}>
                        <Icon name="close" size={13} /> 삭제
                      </button>
                    ) : null}
                  </>
                ),
              })}
              {isAltOn && renderExpandedBody(a)}
            </div>
          );
        })}
      </div>
    );
  };

  const renderDefenseCard = (raw, idx) => {
    const d = flattenDefense(raw);
    const isExpanded = expandedId === d.id;
    const altsOpen = altsOpenId === d.id;
    const slots = padSlots5(d.heroSlots);
    const mode = d.mode === '내실' ? '내실' : '속공';
    const speedText = formatSpeedBadge(d);
    const altCount = (d.altDecks || []).length;
    const isDragging = dragGhost?.fromId === d.id;

    return (
      <div
        key={d.id}
        className={`luxury-panel community-pvp-card gw-defense-card${isExpanded ? ' is-expanded' : ''}${isDragging ? ' is-dragging-source' : ''}`}
        data-defense-id={d.id}
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
          clearDefenseDropHighlight();
          const fromId = e.dataTransfer.getData('application/x-gw-defense-id') || e.dataTransfer.getData('text/plain');
          reorderDefenses(fromId, d.id);
        }}
      >
        {renderPvpStyleHead({
          slots,
          mode,
          deckKind: d.deckKind,
          tier: d.tier,
          speedText,
          isOn: isExpanded,
          dragHandle: renderDefenseDragHandle(raw, idx),
          onToggle: () => {
            if (isExpanded) {
              setExpandedId(null);
              setAltsOpenId(null);
              setExpandedAltId(null);
            } else {
              setExpandedId(d.id);
            }
          },
          actions: (
            <>
              <button
                type="button"
                className={`btn-ops gw-defense-alt-btn${altsOpen ? ' is-on' : ''}`}
                onClick={() => {
                  if (!isExpanded) setExpandedId(d.id);
                  const nextOpen = !(altsOpen && isExpanded);
                  setAltsOpenId(nextOpen ? d.id : null);
                  if (!nextOpen) setExpandedAltId(null);
                }}
              >
                <Icon name="copy" size={12} /> 대체 덱{altCount > 0 ? ` ${altCount}` : ''}
              </button>
              <button type="button" className="btn-edit" onClick={() => openEdit(raw)}>
                <Icon name="edit" size={13} /> 수정
              </button>
              {canDeleteBuild?.(d) ? (
                <button type="button" className="btn-danger-solid" onClick={() => remove(d.id)}>
                  <Icon name="close" size={13} /> 삭제
                </button>
              ) : null}
            </>
          ),
        })}

        {isExpanded && renderExpandedBody(d)}
        {isExpanded && altsOpen && renderAltLayer(d)}
      </div>
    );
  };

  const isAltForm = Boolean(form?.parentId);
  const formHeroNames = form ? form.heroSlots.map(s => s?.primaryName || '') : [];
  const currentSlotName = formHeroNames[slotIdx] || '';
  const filteredHeroesByRole = useMemo(() => {
    const list = Array.isArray(heroes) ? heroes : [];
    return sortHeroesForList(list.filter((h) => {
      if (roleFilter !== 'all' && h.role !== roleFilter) return false;
      const cleanName = h.name.replace('(각성)', '');
      if (formHeroNames.includes(cleanName) && cleanName !== currentSlotName) return false;
      return true;
    }));
  }, [heroes, roleFilter, formHeroNames, currentSlotName]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <StrategyActionBar
        icon="shield"
        title="길드전 3v3 방어 공략"
        hint="왼쪽 그립으로 배치 순서 · 대체 덱 · 속공/내실"
        actionLabel="방어덱 추가"
        onAction={openCreate}
      />

      {gwDefenses.length === 0 && (
        <div className="luxury-panel" style={{ padding: '40px', textAlign: 'center', color: '#fff', fontWeight: 700 }}>등록된 방어 공략이 없습니다. 위 「방어덱 추가」로 등록해 보세요.</div>
      )}

      <div className="gw-defense-grid gw-defense-grid--stack">
        {sortedDefenses.map((raw, idx) => renderDefenseCard(raw, idx))}
      </div>

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
          <span className="gw-defense-drag-grip" style={{ width: 12, height: 14, color: 'rgba(125,211,252,0.9)' }} />
          <span className="gw-counter-prio-ghost-title">{dragGhost.title}</span>
        </div>,
        document.body,
      )}

      {isModalOpen && form && (
        <ModalScrim style={{ zIndex: 3600, padding: 16, overflow: 'hidden' }}
          {...backdropDismissProps(closeDefenseModal)}>
          <div
            className="luxury-panel glass-modal editing-build-modal"
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            style={{
              width: '94vw', maxWidth: 1520, maxHeight: '88vh', padding: 0,
              display: 'flex', flexDirection: 'column', borderRadius: 28, minHeight: 0, overflow: 'hidden',
            }}
          >
            <div className="editing-build-modal-header" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 20px', background: 'rgba(255,255,255,0.04)',
              borderBottom: '1px solid rgba(255,255,255,0.10)', flexShrink: 0,
            }}>
              <div className="editing-build-modal-header-main" style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, flexWrap: 'wrap' }}>
                <div className="editing-build-modal-title-row">
                  <h3 className="editing-build-title" style={{ fontSize: 17, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', margin: 0 }}>
                    {isAltForm
                      ? (form.id ? '대체 덱 수정' : '대체 덱 추가')
                      : (form.id ? '방어 세팅 수정' : '방어 세팅 추가')}
                  </h3>
                  <button type="button" className="editing-build-modal-close editing-build-modal-close--mobile" onClick={closeDefenseModal} title="모달 닫기">
                    <Icon name="closeBtn" size={26} />
                  </button>
                </div>
                <div className="editing-build-arena-toggles" style={{
                  display: 'flex', alignItems: 'stretch', flexShrink: 0,
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, overflow: 'hidden',
                  background: 'rgba(255,255,255,0.05)', flexWrap: 'wrap',
                }}>
                  <div className="editing-build-arena-toggle-col" style={{ padding: '7px 12px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 120 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>덱 티어</div>
                    <TierStars tier={form.tier} onChange={t => patchForm({ tier: t })} />
                  </div>
                  <div style={{ width: 1, background: 'rgba(255,255,255,0.14)', flexShrink: 0 }} />
                  <div className="editing-build-arena-toggle-col" style={{ padding: '7px 12px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 210 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>세팅</div>
                    <PvpModeToggle mode={form.mode} onChange={m => patchForm({ mode: m })} />
                  </div>
                  <div style={{ width: 1, background: 'rgba(255,255,255,0.14)', flexShrink: 0 }} />
                  <div className="editing-build-arena-toggle-col" style={{ padding: '7px 12px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 210 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>덱 유형</div>
                    <MetaDeckKindToggle kind={form.deckKind} onChange={k => patchForm({ deckKind: k })} />
                  </div>
                  <div style={{ width: 1, background: 'rgba(255,255,255,0.14)', flexShrink: 0 }} />
                  <div className="editing-build-arena-toggle-col editing-build-other-detail-col" style={{ padding: '7px 12px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180, flex: 1, maxWidth: 280 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>기타 디테일</div>
                    <textarea
                      className="editing-build-detail-textarea"
                      rows={2}
                      value={form.otherDetail || ''}
                      onChange={e => patchForm({ otherDetail: e.target.value })}
                      placeholder="예: 피뢰침 - 선란이 맞게 세팅"
                      style={{
                        width: '100%', padding: '6px 10px', background: '#07090e', border: '1px solid var(--border-gold)',
                        color: '#e2e8f0', borderRadius: 7, fontSize: 12, fontWeight: 700, lineHeight: 1.45,
                        boxSizing: 'border-box', resize: 'none', fontFamily: 'inherit', minHeight: 0,
                      }}
                    />
                  </div>
                  {form.mode === '속공' && (
                    <>
                      <div style={{ width: 1, background: 'rgba(255,255,255,0.14)', flexShrink: 0 }} />
                      <div className="editing-build-arena-toggle-col" style={{ padding: '7px 12px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>속공 수치</div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            type="number"
                            value={form.speedMin ?? ''}
                            onChange={e => patchForm({ speedMin: e.target.value })}
                            placeholder="이상"
                            style={{ width: 64, padding: '5px 6px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 800, boxSizing: 'border-box' }}
                          />
                          <span style={{ color: '#94a3b8', fontWeight: 800, fontSize: 11, flexShrink: 0 }}>~</span>
                          <input
                            type="number"
                            value={form.speedMax ?? ''}
                            onChange={e => patchForm({ speedMax: e.target.value })}
                            placeholder="이하"
                            style={{ width: 64, padding: '5px 6px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 800, boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="editing-build-author-row" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button type="button" className="editing-build-modal-close editing-build-modal-close--desktop" onClick={closeDefenseModal} title="모달 닫기">
                  <Icon name="closeBtn" size={26} />
                </button>
              </div>
            </div>

            <div
              className="editing-build-grid editing-build-modal-body is-pvp"
              style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '16px 20px', gap: 20, alignItems: 'stretch', boxSizing: 'border-box' }}
            >
              <div className="editing-build-left-stack">
                <div className="editing-build-deck-slot" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <InGameDeckCard
                    teamName=""
                    overviewTitle=""
                    formationId={form.formationId}
                    onFormationChange={fid => patchForm({ formationId: fid })}
                    petObj={resolvePet(form.petId)}
                    onPetChange={p => patchForm({ petId: p.id })}
                    heroList={formHeroNames.map((name, idx) => {
                      const baseHero = resolveHeroByName(name);
                      return baseHero ? { hero: baseHero, gearConfig: (form.heroGearConfigs || [])[idx] } : name;
                    })}
                    slotCount={5}
                    maxHeroes={3}
                    onSlotClick={setSlotIdx}
                    selectedSlotIdx={slotIdx}
                    isSelected
                    isEditMode
                    contentMode="pvp"
                    reservedSkills={form.reservedSkills}
                    onReservationChange={s => patchForm({ reservedSkills: s })}
                    onHeroDrop={handleHeroDrop}
                    pvpMode={form.mode === '내실' ? '내실' : '속공'}
                  />
                </div>

                <div className="glass-inset editing-build-detail-panel" style={{ padding: '8px 12px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 11, color: 'var(--accent-cyan)', fontWeight: 800 }}>
                    세팅 디테일{currentSlotName ? ` · ${currentSlotName}` : ''}
                  </div>
                  <textarea
                    className="editing-build-detail-textarea"
                    rows={3}
                    value={(form.heroGearConfigs || emptyGear5())[slotIdx]?.detailNote || ''}
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
                  alignSelf: 'stretch', minHeight: 0, boxSizing: 'border-box',
                }}
              >
                <HeroGearPanel
                  embedded
                  showDetail={false}
                  heroNames={formHeroNames}
                  configs={form.heroGearConfigs || emptyGear5()}
                  selectedIdx={slotIdx}
                  onSelectIdx={setSlotIdx}
                  onChange={cfgs => patchForm({ heroGearConfigs: cfgs })}
                />
              </div>

              {/* 결투장 CommunityGuideEditor PvP와 동일 구조·높이 */}
              <div className="glass-inset editing-build-hero-picker" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, width: '100%', boxSizing: 'border-box', flexShrink: 0, minHeight: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="hero" size={14} /> 영웅 목록 · {formHeroNames.filter(Boolean).length}/3
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {ROLE_FILTERS.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRoleFilter(r.id)}
                        style={{
                          padding: '8px 12px', fontSize: 13, fontWeight: 800, borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: roleFilter === r.id ? 'var(--gold-primary)' : 'rgba(255,255,255,0.06)',
                          color: roleFilter === r.id ? '#000' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        {r.icon && <img src={r.icon} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />}
                        <span>{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  className="editing-build-hero-grid"
                  style={{
                    height: 168, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(62px, 1fr))',
                    gap: 6, overflowY: 'auto', paddingRight: 4,
                  }}
                >
                  {filteredHeroesByRole.map((h) => {
                    const cleanName = h.name.replace('(각성)', '');
                    const isCurrent = (formHeroNames[slotIdx] || '') === cleanName;
                    return (
                      <div
                        key={h.id}
                        draggable
                        onPointerDown={(e) => {
                          markDeckPointerDown(e);
                          startDeckPointerDrag(e, { source: 'picker', name: cleanName }, { label: cleanName });
                        }}
                        onDragStart={(e) => {
                          if (!allowHtml5DeckDrag()) {
                            e.preventDefault();
                            return;
                          }
                          setDeckDragData(e, { source: 'picker', name: cleanName });
                        }}
                        onClick={() => {
                          if (shouldSuppressDeckClick()) return;
                          pickHero(cleanName);
                        }}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'grab', touchAction: 'none' }}
                      >
                        <div style={{
                          width: 58,
                          outline: isCurrent ? '2px solid var(--accent-cyan)' : 'none',
                          outlineOffset: 1,
                          borderRadius: 8,
                        }}>
                          <HeroPortraitCard hero={h} showStars showRole showName={false} />
                        </div>
                        <div style={{
                          width: 58, marginTop: 2, background: '#000', borderRadius: 3, padding: '1px 0',
                          textAlign: 'center', fontSize: 8, color: '#fff', fontWeight: 800,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {cleanName}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.10)', flexShrink: 0 }}>
              <button type="button" onClick={save} className="btn-ops" style={{ width: '100%', padding: 11, justifyContent: 'center', borderRadius: 12, fontSize: 14 }}>
                <Icon name="save" size={15} /> 저장
              </button>
            </div>
          </div>
        </ModalScrim>
      )}
    </div>
  );
}
