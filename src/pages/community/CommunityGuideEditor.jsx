import { useMemo, useState, useEffect, useRef } from 'react';
import { heroes, sortHeroesForList } from '../../data/heroes';
import { pets } from '../../data/pets';
import { ROLE_ICONS } from '../../data/roleIcons';
import InGameDeckCard from '../../components/InGameDeckCard';
import HeroGridPicker from '../../components/HeroGridPicker';
import HeroPortraitCard from '../../components/HeroPortraitCard';
import HeroGearPanel, { emptyGearConfig, buildOptionCode } from '../../components/HeroGearPanel';
import SkillReservationBoard from '../../components/SkillReservationBoard';
import Icon from '../../components/icons/Icon';
import ModalScrim from '../../components/ModalScrim';
import PvpModeToggle, { normalizePvpMode } from '../../components/PvpModeToggle';
import { MetaDeckKindToggle, normalizeMetaDeckKind } from '../../components/ArenaDeckKind';
import { ARENA_TIERS, normalizeArenaTier } from '../../data/arenaTiers';
import { communitySkillMode } from '../../data/communityCatalog';
import { emptyCommunityGuide } from '../../lib/communityGuides';
import { backdropDismissProps } from '../../utils/backdropDismiss';
import {
  deckEditScrollBodyWrapperProps,
  deckEditScrollGridBodyStyle,
  deckEditScrollHeroGridClass,
  deckEditScrollHeroGridStyle,
  deckEditScrollModalClassSuffix,
  getDeckEditScrollKindFromArenaFlag,
  useDeckEditScrollWheelForward,
} from '../../lib/deckEditScrollModal';
import { setDeckDragData, startDeckPointerDrag, markDeckPointerDown, allowHtml5DeckDrag, markDeckHtml5DragStarted, shouldSuppressDeckClick, resetDeckDragState } from '../../utils/deckDrag';

const ROLE_FILTERS = [
  { id: 'all', label: '전체', icon: null },
  { id: 'offensive', label: '공격형', icon: ROLE_ICONS.offensive },
  { id: 'magic', label: '마법형', icon: ROLE_ICONS.magic },
  { id: 'defensive', label: '방어형', icon: ROLE_ICONS.defensive },
  { id: 'support', label: '지원형', icon: ROLE_ICONS.support },
  { id: 'universal', label: '만능형', icon: ROLE_ICONS.universal },
];

const padNames5 = (names = []) => {
  const next = (names || []).map((n) => n || '');
  while (next.length < 5) next.push('');
  return next.slice(0, 5);
};

const padGear5 = (list = []) => Array.from({ length: 5 }, (_, i) => ({
  ...emptyGearConfig(),
  ...(list?.[i] || {}),
}));

function resolveHeroByName(name) {
  if (!name || !String(name).trim()) return null;
  const raw = String(name);
  const clean = raw.replace('(각성)', '').trim();
  return heroes.find((x) => x.name === raw)
    || heroes.find((x) => x.name.replace('(각성)', '').trim() === clean)
    || null;
}

/** 스킬 시전 순서 턴 라벨 (저장값이 1라여도 1턴으로 표시 · 0-1턴 포함) */
function formatSkillTurnLabel(round) {
  const s = String(round || '').trim();
  if (!s) return '';
  if (/0\s*[-~∼]\s*1/.test(s)) return '0-1턴';
  const m = s.match(/(\d+)/);
  return m ? `${Number(m[1])}턴` : s.replace(/라/g, '턴');
}

const fieldStyle = {
  width: '100%', padding: '8px 10px', background: '#07090e', border: '1px solid var(--border-gold)',
  color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 800, boxSizing: 'border-box', colorScheme: 'dark',
};

/**
 * 공용 허브 전용 덱 에디터.
 * 길드 허브 editing-build-* 그리드/클래스를 재사용하되 상태·저장은 communityGuides 만 사용.
 */
export default function CommunityGuideEditor({
  initial,
  authorName,
  authorId,
  onSave,
  onClose,
}) {
  const skillMeta = communitySkillMode(initial.category);
  const isArena = initial.category === 'arena';
  const deckEditScrollKind = getDeckEditScrollKindFromArenaFlag(isArena);
  const deckEditScrollBodyRef = useRef(null);
  useDeckEditScrollWheelForward(deckEditScrollBodyRef, !!deckEditScrollKind);
  const isTimeline = skillMeta.mode === 'timeline';
  const maxRes = skillMeta.maxReservations || 3;
  const contentMode = skillMeta.layout === 'pvp' ? 'pvp' : 'pve';
  const lockedArenaKind = initial.arenaKind === 'advanced' ? 'advanced' : 'normal';

  useEffect(() => () => resetDeckDragState(), []);

  const [title, setTitle] = useState(initial.title || '');
  const [arenaTier, setArenaTier] = useState(normalizeArenaTier(initial.arenaTier || 'bronze'));
  const [deckKind, setDeckKind] = useState(normalizeMetaDeckKind(initial.deckKind));
  const [mode, setMode] = useState(normalizePvpMode(initial.mode));
  const [formationId, setFormationId] = useState(initial.formationId || 'protect');
  const [heroNames, setHeroNames] = useState(() => padNames5(initial.heroNames));
  const [gear, setGear] = useState(() => padGear5(initial.heroGearConfigs));
  const [reserved, setReserved] = useState(() => (
    isTimeline
      ? []
      : (Array.isArray(initial.reservedSkills) ? initial.reservedSkills.filter(Boolean) : [])
  ));
  const [timeline, setTimeline] = useState(() => (
    isTimeline
      ? (Array.isArray(initial.skillSequence) ? initial.skillSequence.filter(Boolean) : [])
      : []
  ));
  const [speedOrder, setSpeedOrder] = useState(initial.speedOrderNames || []);
  const [speedIgnored, setSpeedIgnored] = useState(initial.speedIgnoredNames || []);
  const [petId, setPetId] = useState(initial.petId || pets[0]?.id || '');
  const [slot, setSlot] = useState(0);
  const [turnInput, setTurnInput] = useState('0턴');
  const [newHero, setNewHero] = useState('');
  const [newDir, setNewDir] = useState('upper');
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');

  const petObj = useMemo(() => pets.find((p) => p.id === petId) || pets[0], [petId]);
  const filledNames = heroNames.filter(Boolean);

  const filteredHeroesByRole = useMemo(() => sortHeroesForList(heroes.filter((h) => {
    if (roleFilter !== 'all' && h.role !== roleFilter) return false;
    const cleanName = h.name.replace('(각성)', '');
    // 다른 슬롯에 이미 배치된 영웅은 숨김(현재 슬롯은 교체 가능)
    if (filledNames.includes(cleanName) && cleanName !== (heroNames[slot] || '')) return false;
    return true;
  })), [roleFilter, filledNames, heroNames, slot]);

  const setHeroAt = (idx, name) => {
    const next = padNames5(heroNames);
    if (name && next.some((n, i) => i !== idx && n === name)) return;
    next[idx] = name;
    setHeroNames(next);
  };

  const onDrop = (payload, toIdx) => {
    if (!payload) return;
    if (payload.source === 'slot' && typeof payload.fromIdx === 'number') {
      const next = padNames5(heroNames);
      const from = payload.fromIdx;
      const tmp = next[toIdx];
      next[toIdx] = next[from];
      next[from] = tmp;
      setHeroNames(next);
      return;
    }
    if (payload.name) setHeroAt(toIdx, payload.name);
  };

  const addTimelineStep = () => {
    if (!newHero) return;
    setTimeline((prev) => [...prev, {
      heroName: newHero,
      dir: newDir,
      round: turnInput,
      text: newNote.trim(),
    }]);
    setNewNote('');
  };

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      alert('제목을 입력해 주세요.');
      return;
    }
    if (filledNames.length === 0) {
      alert('영웅을 한 명 이상 배치해 주세요.');
      return;
    }
    try {
      setSaving(true);
      const gearWithCode = padGear5(gear).map((g) => ({
        ...g,
        optionCode: buildOptionCode(g) || g.optionCode || '',
      }));
      const payload = emptyCommunityGuide({
        ...initial,
        title: trimmed,
        author: authorName,
        authorId,
        arenaKind: isArena ? lockedArenaKind : null,
        arenaTier: isArena ? arenaTier : null,
        deckKind: isArena ? deckKind : initial.deckKind,
        mode: (isArena || skillMeta.layout === 'pvp') ? mode : initial.mode,
        formationId,
        heroNames: padNames5(heroNames),
        heroGearConfigs: gearWithCode,
        petId,
        reservedSkills: isTimeline ? [] : reserved,
        skillSequence: isTimeline ? timeline : reserved,
        speedOrderNames: speedOrder,
        speedIgnoredNames: speedIgnored,
      });
      await onSave(payload);
    } catch (e) {
      alert(e?.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalScrim style={{ zIndex: 3500, padding: 16, overflow: 'hidden' }} {...backdropDismissProps(onClose)}>
      <div
        className={`luxury-panel glass-modal editing-build-modal${deckEditScrollModalClassSuffix(deckEditScrollKind)}`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
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
                {isArena
                  ? `${lockedArenaKind === 'advanced' ? '상급결투장' : '결투장'} 공략 ${initial.id ? '수정' : '생성'}`
                  : (initial.id ? '공용 공략 수정' : '공용 공략 생성')}
              </h3>
              <button type="button" className="editing-build-modal-close editing-build-modal-close--mobile" onClick={onClose} title="모달 닫기">
                <Icon name="closeBtn" size={26} />
              </button>
            </div>
            <div className="editing-build-title-input-row" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 540 }}>
              <span style={{ fontSize: 12, color: '#fff', fontWeight: 800, whiteSpace: 'nowrap' }}>제목:</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="공략 제목"
                style={{ width: '100%', padding: '6px 12px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 800, boxSizing: 'border-box' }}
              />
            </div>

            {isArena && (
              <div className="editing-build-arena-toggles" style={{
                display: 'flex', alignItems: 'stretch', flexShrink: 0,
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, overflow: 'hidden',
                background: 'rgba(255,255,255,0.05)', flexWrap: 'wrap',
              }}>
                <div className="editing-build-arena-toggle-col" style={{ padding: '7px 12px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 140 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>덱 티어</div>
                  <select
                    value={arenaTier}
                    onChange={(e) => setArenaTier(e.target.value)}
                    style={{ ...fieldStyle, padding: '6px 8px', fontSize: 12 }}
                  >
                    {ARENA_TIERS.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ width: 1, background: 'rgba(255,255,255,0.14)', flexShrink: 0 }} />
                <div className="editing-build-arena-toggle-col" style={{ padding: '7px 12px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 210 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>세팅</div>
                  <PvpModeToggle mode={mode} onChange={setMode} />
                </div>
                <div style={{ width: 1, background: 'rgba(255,255,255,0.14)', flexShrink: 0 }} />
                <div className="editing-build-arena-toggle-col" style={{ padding: '7px 12px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 210 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>덱 유형</div>
                  <MetaDeckKindToggle kind={deckKind} onChange={setDeckKind} />
                </div>
              </div>
            )}
          </div>

          <div className="editing-build-author-row" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button type="button" className="editing-build-modal-close editing-build-modal-close--desktop" onClick={onClose} title="모달 닫기">
              <Icon name="closeBtn" size={26} />
            </button>
          </div>
        </div>

        <div
          ref={deckEditScrollKind ? deckEditScrollBodyRef : null}
          {...deckEditScrollBodyWrapperProps(deckEditScrollKind)}
        >
        <div
          className={`editing-build-grid editing-build-modal-body ${contentMode === 'pvp' ? 'is-pvp' : 'is-pve'}`}
          style={deckEditScrollGridBodyStyle(deckEditScrollKind)}
        >
          <div className="editing-build-left-stack">
          <div className="editing-build-deck-slot" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <InGameDeckCard
              teamName=""
              overviewTitle={title || ''}
              formationId={formationId}
              onFormationChange={setFormationId}
              petObj={petObj}
              onPetChange={(p) => setPetId(p.id)}
              heroList={heroNames.map((name, idx) => {
                const base = resolveHeroByName(name);
                return base ? { hero: base, gearConfig: gear[idx] } : name;
              })}
              onSlotClick={(idx) => setSlot(idx)}
              selectedSlotIdx={slot}
              isSelected
              isEditMode
              contentMode={contentMode}
              reservedSkills={isTimeline ? [] : reserved}
              onReservationChange={contentMode === 'pvp' ? setReserved : undefined}
              maxReservations={maxRes}
              onHeroDrop={onDrop}
              speedOrderNames={speedOrder}
              speedIgnoredNames={speedIgnored}
              onSpeedConfigChange={({ orderNames, ignoredNames }) => {
                setSpeedOrder(orderNames);
                setSpeedIgnored(ignoredNames);
              }}
            />
          </div>

          <div className="glass-inset editing-build-detail-panel" style={{ padding: '8px 12px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 11, color: 'var(--accent-cyan)', fontWeight: 800 }}>
              세팅 디테일{heroNames[slot] ? ` · ${heroNames[slot]}` : ''}
            </div>
            <textarea
              className="editing-build-detail-textarea"
              rows={3}
              value={gear[slot]?.detailNote || ''}
              onChange={(e) => {
                const next = padGear5(gear);
                next[slot] = { ...next[slot], detailNote: e.target.value };
                setGear(next);
              }}
              placeholder={'예: 치확 67% · 약공 46%에 가깝게'}
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
              heroNames={heroNames}
              configs={gear}
              selectedIdx={slot}
              onSelectIdx={setSlot}
              onChange={setGear}
            />
          </div>

          {contentMode === 'pvp' ? (
            <div className="glass-inset editing-build-hero-picker" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, width: '100%', boxSizing: 'border-box', flexShrink: 0, minHeight: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="hero" size={14} /> 영웅 목록
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
                className={deckEditScrollHeroGridClass(deckEditScrollKind)}
                style={deckEditScrollHeroGridStyle(deckEditScrollKind)}
              >
                {filteredHeroesByRole.map((h) => {
                  const cleanName = h.name.replace('(각성)', '');
                  const isCurrent = (heroNames[slot] || '') === cleanName;
                  return (
                    <div
                      key={h.id}
                      draggable
                      onPointerDown={(e) => {
                        markDeckPointerDown(e);
                        startDeckPointerDrag(e, { source: 'picker', name: cleanName }, { label: cleanName });
                      }}
                      onDragStart={(e) => {
                        if (!allowHtml5DeckDrag(e)) {
                          e.preventDefault();
                          return;
                        }
                        markDeckHtml5DragStarted();
                        setDeckDragData(e, { source: 'picker', name: cleanName });
                      }}
                      onClick={() => {
                        if (shouldSuppressDeckClick()) return;
                        setHeroAt(slot, cleanName);
                      }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', touchAction: 'manipulation' }}
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
          ) : (
            <div className="glass-inset editing-build-hero-picker" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, width: '100%', boxSizing: 'border-box', flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <Icon name="hero" size={14} /> 영웅 목록
              </div>
              <div className="editing-build-hero-grid" style={{ minHeight: 168 }}>
                <HeroGridPicker
                  heroes={heroes}
                  selectedNames={filledNames}
                  currentSlotName={heroNames[slot] || ''}
                  onPick={(name) => setHeroAt(slot, name)}
                  fillHeight
                  showSearch
                />
              </div>
            </div>
          )}

          {skillMeta.layout === 'pve' && (
            <div className="editing-build-timeline-col" style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
              {isTimeline ? (
                <>
                  <div className="glass-inset editing-build-timeline-list" style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', flex: '0 0 auto' }}>
                    <div className="editing-build-timeline-list-head" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                      marginBottom: 4, flexShrink: 0, flexWrap: 'wrap',
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon name="clock" size={13} /> 스킬 시전 순서
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>
                        등록 {timeline.length}개 · 휠 스크롤
                      </div>
                    </div>
                    <div className="skill-timeline-scroller">
                      {timeline.length === 0 && (
                        <div style={{ fontSize: 11, color: '#fff', fontWeight: 700, textAlign: 'center', padding: '16px 0' }}>
                          아직 등록된 스킬 순서가 없습니다. 아래에서 추가해 주세요.
                        </div>
                      )}
                      {timeline.map((step, idx) => (
                        <div key={idx} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: 5,
                          borderLeft: '3px solid var(--gold-primary)', flexShrink: 0, marginBottom: 4,
                        }}>
                          <div style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>
                            {formatSkillTurnLabel(step.round)} · {step.heroName} · {step.dir === 'upper' ? '위 스킬' : step.dir === 'down' ? '아래 스킬' : '각성'}
                            {step.text ? ` — ${step.text}` : ''}
                          </div>
                          <button
                            type="button"
                            onClick={() => setTimeline((prev) => prev.filter((_, i) => i !== idx))}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }}
                          >
                            <Icon name="close" size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="glass-inset editing-build-timeline-add" style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>+ 스킬 시전 순서 추가</div>
                    <div style={{ fontSize: 10, color: '#fff', marginBottom: 3, fontWeight: 800 }}>턴 선택 (0·4·8…68)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
                      {[0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68].map((n) => {
                        const r = `${n}턴`;
                        const picked = Number(String(turnInput).match(/(\d+)/)?.[1]);
                        const selected = turnInput === r || picked === n;
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setTurnInput(r)}
                            style={{
                              padding: '8px 0', fontSize: 13, fontWeight: 800, borderRadius: 6,
                              border: selected ? '1px solid var(--gold-light)' : '1px solid rgba(255,255,255,0.08)',
                              cursor: 'pointer',
                              background: selected ? 'var(--gold-primary)' : 'rgba(255,255,255,0.04)',
                              color: selected ? '#000' : '#fff',
                            }}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select value={newHero} onChange={(e) => setNewHero(e.target.value)} style={fieldStyle}>
                        <option value="">영웅 선택</option>
                        {filledNames.map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <select value={newDir} onChange={(e) => setNewDir(e.target.value)} style={fieldStyle}>
                        <option value="upper">위 스킬</option>
                        <option value="down">아래 스킬</option>
                        <option value="awaken">각성</option>
                      </select>
                    </div>
                    <input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="메모 (선택)" style={fieldStyle} />
                    <button type="button" className="btn-ops" onClick={addTimelineStep} style={{ justifyContent: 'center' }}>
                      + 타임라인 단계 추가
                    </button>
                  </div>
                </>
              ) : (
                <div className="glass-inset editing-build-timeline-list editing-build-reservation-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
                  <div className="editing-build-reservation-head">
                    <Icon name="target" size={15} /> 스킬 예약 ({reserved.filter(Boolean).length}/{maxRes})
                  </div>
                  <SkillReservationBoard
                    heroNames={heroNames}
                    resolveHeroByName={resolveHeroByName}
                    value={reserved}
                    onChange={setReserved}
                    maxReservations={maxRes}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        </div>

        <div style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.10)', flexShrink: 0 }}>
          <button type="button" onClick={handleSave} disabled={saving} className="btn-ops" style={{ width: '100%', padding: 11, justifyContent: 'center', borderRadius: 12, fontSize: 14 }}>
            <Icon name="save" size={15} /> {saving ? '저장 중…' : '공략 저장'}
          </button>
        </div>
      </div>
    </ModalScrim>
  );
}
