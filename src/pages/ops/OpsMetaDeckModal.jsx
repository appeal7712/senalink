import { useEffect, useMemo, useRef, useState } from 'react';
import { heroes, sortHeroesForList } from '../../data/heroes';
import { pets } from '../../data/pets';
import InGameDeckCard from '../../components/InGameDeckCard';
import HeroGearPanel, { emptyGearConfig } from '../../components/HeroGearPanel';
import HeroListFilterBar from '../../components/HeroListFilterBar';
import HeroPortraitCard from '../../components/HeroPortraitCard';
import Icon from '../../components/icons/Icon';
import PvpModeToggle, { normalizePvpMode } from '../../components/PvpModeToggle';
import { MetaDeckKindToggle } from '../../components/ArenaDeckKind';
import { DeckEditField, DeckEditFields } from '../../components/DeckEditHeader';
import { heroMatchesQuery } from '../../lib/heroSearch';
import { nextEmptySlotAfter } from '../../lib/deckSlots';
import {
  deckEditScrollBodyWrapperProps,
  deckEditScrollGridBodyStyle,
  deckEditScrollHeroGridClass,
  deckEditScrollHeroGridStyle,
  deckEditScrollModalClassSuffix,
  useDeckEditScrollWheelForward,
} from '../../lib/deckEditScrollModal';
import { backdropDismissProps } from '../../utils/backdropDismiss';
import { setDeckDragData, startDeckPointerDrag, markDeckPointerDown, allowHtml5DeckDrag, markDeckHtml5DragStarted, shouldSuppressDeckClick, resetDeckDragState } from '../../utils/deckDrag';
import { useUnsavedGuard } from '../../utils/unsavedGuard';
import ModalScrim from '../../components/ModalScrim';

const DECK_TYPES = ['결투장', '상급결투장'];
/** 저장값은 기존 그대로(상급결투장), 화면 표시만 이벤트 결투장 */
const DECK_TYPE_LABEL = { 결투장: '결투장', 상급결투장: '이벤트 결투장' };
/** 본문(덱 · 장비 · 영웅 목록)은 공용 허브 결투장 공략 창과 같은 덱 수정 구조(arena) */
const SCROLL_KIND = 'arena';

const padGear5 = (list = []) => Array.from({ length: 5 }, (_, i) => ({ ...emptyGearConfig(), ...(list?.[i] || {}) }));

const padNames5 = (names = []) => {
  const next = (names || []).map((n) => n || '');
  while (next.length < 5) next.push('');
  return next.slice(0, 5);
};

function resolveHeroByName(name) {
  if (!name || !String(name).trim()) return null;
  const raw = String(name);
  const clean = raw.replace('(각성)', '').trim();
  return heroes.find((x) => x.name === raw)
    || heroes.find((x) => x.name.replace('(각성)', '').trim() === clean)
    || null;
}

const fieldStyle = {
  width: '100%', padding: '8px 10px', background: '#07090e', border: '1px solid var(--border-gold)',
  color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 800, boxSizing: 'border-box', colorScheme: 'dark',
};
const labelStyle = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 800, color: '#94a3b8' };

/**
 * 메타 덱 세팅 — /ops 메인 편집(variant 'ops') · 메인 「메타 덱 공유하기」 유저 제출(variant 'submit') 공용.
 * submit: 티어 · 픽률 · 모드 칸 없음(관리자가 승인 때 정함), 인게임 닉네임 칸, 버튼 「관리자에게 제출」 → onSave({ deck, ingameName }).
 */
export default function OpsMetaDeckModal({ deck, onSave, onClose, variant = 'ops', initialIngameName = '', busy = false }) {
  const isSubmit = variant === 'submit';
  const [authorName, setAuthorName] = useState(isSubmit ? initialIngameName : (deck.author?.ingameName || ''));
  const [title, setTitle] = useState(deck.title || '');
  const [tier, setTier] = useState(deck.tier || '');
  const [usageRate, setUsageRate] = useState(deck.usageRate || '');
  const [desc, setDesc] = useState(deck.desc || '');
  const [kind, setKind] = useState(deck.kind || 'attack');
  const [type, setType] = useState(DECK_TYPES.includes(deck.type) ? deck.type : '결투장');
  const [mode, setMode] = useState(normalizePvpMode(deck.mode));
  const [formationId, setFormationId] = useState(deck.formationId || 'protect');
  const [heroNames, setHeroNames] = useState(() => padNames5(deck.heroNames));
  const [gear, setGear] = useState(() => padGear5(deck.heroGearConfigs));
  const [skills, setSkills] = useState(() => Array.isArray(deck.reservedSkills) ? deck.reservedSkills : (deck.skillSequence || []));
  const [petId, setPetId] = useState(deck.petId || pets[0]?.id || '');
  const [slot, setSlot] = useState(0);
  const [roleFilter, setRoleFilter] = useState('all');
  const [heroQuery, setHeroQuery] = useState('');
  const scrollBodyRef = useRef(null);
  useDeckEditScrollWheelForward(scrollBodyRef, true);
  useEffect(() => () => resetDeckDragState(), []);

  const petObj = useMemo(() => pets.find((p) => p.id === petId) || pets[0], [petId]);
  const filledNames = heroNames.filter(Boolean);

  const filteredHeroes = useMemo(() => sortHeroesForList(heroes.filter((h) => {
    if (roleFilter !== 'all' && h.role !== roleFilter) return false;
    const cleanName = h.name.replace('(각성)', '');
    if (filledNames.includes(cleanName) && cleanName !== (heroNames[slot] || '')) return false;
    if (heroQuery.trim() && !heroMatchesQuery(h, heroQuery.trim())) return false;
    return true;
  })), [roleFilter, heroQuery, filledNames, heroNames, slot]);

  const pickHero = (name) => {
    const next = padNames5(heroNames);
    if (name && next.some((n, i) => i !== slot && n === name)) return;
    next[slot] = name;
    setHeroNames(next);
    const nextEmpty = nextEmptySlotAfter(next, slot);
    if (nextEmpty !== -1) setSlot(nextEmpty);
  };

  const swapGear = (a, b) => {
    setGear((prev) => {
      const next = padGear5(prev);
      const tmp = next[a];
      next[a] = next[b];
      next[b] = tmp;
      return next;
    });
  };

  const onDrop = (payload, toIdx) => {
    const next = padNames5(heroNames);
    if (payload?.source === 'slot' && typeof payload.fromIdx === 'number') {
      const tmp = next[toIdx];
      next[toIdx] = next[payload.fromIdx];
      next[payload.fromIdx] = tmp;
      setHeroNames(next);
      swapGear(toIdx, payload.fromIdx);
      setSlot(toIdx);
      return;
    }
    if (payload?.source === 'picker' && payload.name) {
      const existingIdx = next.findIndex((n, i) => i !== toIdx && n === payload.name);
      if (existingIdx !== -1) {
        const tmp = next[toIdx];
        next[toIdx] = next[existingIdx];
        next[existingIdx] = tmp;
        swapGear(toIdx, existingIdx);
      } else {
        next[toIdx] = payload.name;
      }
      setHeroNames(next);
      setSlot(toIdx);
    }
  };

  const patchGear = (field, value) => {
    setGear((prev) => {
      const next = padGear5(prev);
      next[slot] = { ...next[slot], [field]: value };
      return next;
    });
  };
  const detailNote = gear[slot]?.detailNote || '';

  const guardClose = useUnsavedGuard(true, {
    title, tier, usageRate, desc, kind, type, mode, formationId, heroNames, gear, skills, petId, authorName,
  });

  const commit = () => {
    if (isSubmit) {
      onSave({
        ingameName: authorName.trim(),
        deck: {
          title: title.trim(),
          desc: desc.trim(),
          kind,
          mode,
          formationId,
          heroNames: padNames5(heroNames),
          heroGearConfigs: padGear5(gear),
          reservedSkills: skills,
          petId,
        },
      });
      return;
    }
    const name = authorName.trim();
    onSave({
      ...deck,
      author: name ? { ...(deck.author || {}), ingameName: name } : null,
      title: title.trim(),
      tier: tier.trim(),
      usageRate: usageRate.trim(),
      desc: desc.trim(),
      kind,
      type,
      mode,
      formationId,
      heroNames: padNames5(heroNames),
      heroGearConfigs: padGear5(gear),
      reservedSkills: skills,
      petId,
    });
  };

  const heroCount = heroNames.filter(Boolean).length;
  const submitChecks = [
    { id: 'title', label: '제목', ok: !!title.trim() },
    { id: 'name', label: '인게임 닉네임', ok: !!authorName.trim() },
    { id: 'heroes', label: `영웅 ${heroCount}/5`, ok: heroCount === 5 },
  ];
  const submitReady = submitChecks.every((c) => c.ok);

  return (
    <ModalScrim style={{ zIndex: 5200, padding: 16 }} {...backdropDismissProps(guardClose(onClose))}>
      <div
        className={`luxury-panel glass-modal editing-build-modal meta-deck-editor${deckEditScrollModalClassSuffix(SCROLL_KIND)}`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: '94vw', maxWidth: 1520, maxHeight: '90vh', padding: 0, display: 'flex', flexDirection: 'column',
          borderRadius: 28, minHeight: 0, overflow: 'hidden',
        }}
      >
        <div className="meta-deck-editor-head">
          <h3 className="meta-deck-editor-title">{isSubmit ? '메타 덱 공유하기 · 결투장 덱 짜기' : '메타 덱 세팅'}</h3>
          <div className="meta-deck-editor-tools">
            <DeckEditFields>
              <DeckEditField label="덱 유형 · 내가 정함">
                <MetaDeckKindToggle kind={kind} onChange={setKind} />
              </DeckEditField>
              <DeckEditField label="세팅">
                <PvpModeToggle mode={mode} onChange={setMode} />
              </DeckEditField>
            </DeckEditFields>
          </div>
          <button type="button" className="meta-deck-editor-close" onClick={guardClose(onClose)} aria-label="닫기">
            <Icon name="closeBtn" size={26} />
          </button>
        </div>

        <div ref={scrollBodyRef} {...deckEditScrollBodyWrapperProps(SCROLL_KIND)}>
          <div className="meta-deck-editor-fields">
          <div className="grid-2-responsive" style={{ gap: 10 }}>
            <label style={labelStyle}>제목
              <input style={fieldStyle} value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} placeholder="예: 여포 후열 파멸" />
            </label>
            {isSubmit ? (
              <label style={labelStyle}>인게임 닉네임 · 메인에 작성자로 표시돼요
                <input style={fieldStyle} value={authorName} maxLength={20} onChange={(e) => setAuthorName(e.target.value)} placeholder="게임 속 닉네임" />
              </label>
            ) : (
              <>
                <label style={labelStyle}>모드
                  <select style={fieldStyle} value={type} onChange={(e) => setType(e.target.value)}>
                    {DECK_TYPES.map((t) => <option key={t} value={t}>{DECK_TYPE_LABEL[t] || t}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>티어
                  <input style={fieldStyle} value={tier} onChange={(e) => setTier(e.target.value)} placeholder="예: 0티어" />
                </label>
                <label style={labelStyle}>픽률
                  <input style={fieldStyle} value={usageRate} onChange={(e) => setUsageRate(e.target.value)} placeholder="예: 42.5%" />
                </label>
                <label style={labelStyle}>작성자 · 인게임 닉네임 (비우면 표시 안 함)
                  <input style={fieldStyle} value={authorName} maxLength={20} onChange={(e) => setAuthorName(e.target.value)} placeholder="공유받은 덱이면 작성자 닉네임" />
                </label>
              </>
            )}
          </div>
          <label style={labelStyle}>{isSubmit ? '한 줄 설명 · 덱 포인트 (선택)' : '한 줄 설명'}
            <input style={fieldStyle} value={desc} maxLength={isSubmit ? 120 : undefined} onChange={(e) => setDesc(e.target.value)} placeholder={isSubmit ? '예: 상대 후열 마법형을 먼저 지워요' : '메인 카드 아래에 안 나와도 됨. 메모용.'} />
          </label>
          </div>

          <div className="editing-build-grid editing-build-modal-body is-pvp" style={deckEditScrollGridBodyStyle(SCROLL_KIND)}>
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
                  const baseHero = resolveHeroByName(name);
                  return baseHero ? { hero: baseHero, gearConfig: gear[idx] } : name;
                })}
                onSlotClick={(idx) => setSlot(idx)}
                selectedSlotIdx={slot}
                isSelected
                isEditMode
                contentMode="pvp"
                reservedSkills={skills}
                onReservationChange={setSkills}
                onHeroDrop={onDrop}
                pvpMode={mode}
              />
              </div>
              <div className="glass-inset editing-build-detail-panel" style={{ padding: '8px 12px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 11, color: 'var(--accent-cyan)', fontWeight: 800 }}>
                  세팅 디테일{heroNames[slot] ? ` · ${heroNames[slot]}` : ''}
                </div>
                <textarea
                  className="editing-build-detail-textarea"
                  rows={3}
                  value={detailNote}
                  onChange={(e) => patchGear('detailNote', e.target.value)}
                  placeholder="예: 속공1순위, 효적50이상, 효저100최대한"
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
                onChange={(next) => setGear(padGear5(next))}
              />
            </div>

            <div className="glass-inset editing-build-hero-picker" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, width: '100%', boxSizing: 'border-box', flexShrink: 0, minHeight: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="hero" size={14} /> 영웅 목록
                </div>
                <div style={{ flex: '1 1 380px', minWidth: 0 }}>
                  <HeroListFilterBar role={roleFilter} onRoleChange={setRoleFilter} query={heroQuery} onQueryChange={setHeroQuery} />
                </div>
              </div>
              <div className={deckEditScrollHeroGridClass(SCROLL_KIND)} style={deckEditScrollHeroGridStyle(SCROLL_KIND)}>
                {filteredHeroes.map((h) => {
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
                        pickHero(cleanName);
                      }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', touchAction: 'manipulation' }}
                    >
                      <div style={{ width: 58, outline: isCurrent ? '2px solid var(--accent-cyan)' : 'none', outlineOffset: 1, borderRadius: 8 }}>
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
        </div>

        {isSubmit ? (
          <div className="meta-submit-foot">
            <div className="meta-submit-checks" aria-label="제출 준비">
              {submitChecks.map((c) => (
                <span key={c.id} className={`meta-submit-check${c.ok ? ' is-ok' : ''}`}>
                  <i aria-hidden="true">{c.ok ? '✓' : '·'}</i>{c.label}
                </span>
              ))}
            </div>
            <button
              type="button"
              className="btn-ops meta-submit-btn"
              onClick={commit}
              disabled={busy || !submitReady}
              title={submitReady ? '관리자에게 제출해요' : '제목 · 인게임 닉네임 · 영웅 5명을 채워 주세요'}
            >
              <Icon name="save" size={15} /> {busy ? '제출 중…' : '관리자에게 제출'}
            </button>
          </div>
        ) : (
          <div style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.10)', flexShrink: 0 }}>
            <button type="button" className="btn-ops" onClick={commit} disabled={busy} style={{ width: '100%', padding: 11, justifyContent: 'center' }}>
              <Icon name="save" size={15} /> 이 덱 적용
            </button>
          </div>
        )}
      </div>
    </ModalScrim>
  );
}
