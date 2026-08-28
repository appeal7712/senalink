import { useMemo, useState } from 'react';
import { heroes } from '../../data/heroes';
import { pets } from '../../data/pets';
import InGameDeckCard from '../../components/InGameDeckCard';
import HeroGridPicker from '../../components/HeroGridPicker';
import HeroGearPanel, { emptyGearConfig, buildOptionCode } from '../../components/HeroGearPanel';
import Icon from '../../components/icons/Icon';
import ModalScrim from '../../components/ModalScrim';
import PvpModeToggle, { normalizePvpMode } from '../../components/PvpModeToggle';
import { backdropDismissProps } from '../../utils/backdropDismiss';

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

/**
 * 공용 허브 총력전 — 단일 팀 세팅 창 (팀 선택 모달에서 진입)
 */
export default function CommunityTotalWarEditor({
  team,
  deck,
  deckCount,
  onChangeDeck,
  onSelectTeam,
  onBack,
  onClose,
}) {
  const [slot, setSlot] = useState(0);

  const current = {
    formationId: deck?.formationId || 'protect',
    petId: deck?.petId || pets[0]?.id || 'pet_1',
    heroNames: padNames5(deck?.heroNames),
    reservedSkills: Array.isArray(deck?.reservedSkills) ? deck.reservedSkills : [],
    mode: normalizePvpMode(deck?.mode),
    heroGearConfigs: padGear5(deck?.heroGearConfigs),
  };

  const petObj = useMemo(
    () => pets.find((p) => p.id === current.petId) || pets[0],
    [current.petId],
  );
  const filledNames = (current.heroNames || []).filter(Boolean);

  const patchDeck = (patch) => {
    const next = {
      ...current,
      ...patch,
      heroNames: padNames5(patch.heroNames ?? current.heroNames),
      heroGearConfigs: padGear5(patch.heroGearConfigs ?? current.heroGearConfigs).map((g) => ({
        ...g,
        optionCode: buildOptionCode(g) || g.optionCode || '',
      })),
      reservedSkills: (patch.reservedSkills ?? current.reservedSkills ?? []).filter(Boolean),
      mode: normalizePvpMode(patch.mode ?? current.mode),
    };
    onChangeDeck?.(next);
  };

  const setHeroAt = (idx, name) => {
    const next = padNames5(current.heroNames);
    if (name && next.some((n, i) => i !== idx && n === name)) return;
    next[idx] = name;
    patchDeck({ heroNames: next });
  };

  const onDrop = (payload, toIdx) => {
    if (!payload) return;
    if (payload.source === 'slot' && typeof payload.fromIdx === 'number') {
      const next = padNames5(current.heroNames);
      const tmp = next[toIdx];
      next[toIdx] = next[payload.fromIdx];
      next[payload.fromIdx] = tmp;
      patchDeck({ heroNames: next });
      return;
    }
    if (payload.name) setHeroAt(toIdx, payload.name);
  };

  return (
    <ModalScrim style={{ zIndex: 3500, padding: 16, overflow: 'hidden' }} {...backdropDismissProps(onBack || onClose)}>
      <div
        className="luxury-panel glass-modal editing-build-modal"
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
                {team + 1}팀 세팅
              </h3>
              <button type="button" className="editing-build-modal-close editing-build-modal-close--mobile" onClick={onBack || onClose} title="모달 닫기">
                <Icon name="closeBtn" size={26} />
              </button>
            </div>
            <button
              type="button"
              className="btn-edit"
              onClick={onBack}
              style={{ padding: '8px 12px', fontSize: 12, fontWeight: 900 }}
            >
              팀 선택
            </button>
            <div style={{ width: 220, flexShrink: 0 }}>
              <PvpModeToggle mode={current.mode} onChange={(m) => patchDeck({ mode: m })} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {Array.from({ length: deckCount }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelectTeam?.(i)}
                  style={{
                    padding: '8px 14px', fontSize: 13, fontWeight: 900, borderRadius: 8, cursor: 'pointer',
                    border: team === i ? '1.5px solid var(--gold-primary)' : '1px solid var(--border-subtle)',
                    background: team === i ? 'rgba(236,232,224,0.28)' : 'rgba(0,0,0,0.35)',
                    color: team === i ? 'var(--gold-light)' : '#94a3b8',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {i + 1}팀
                </button>
              ))}
            </div>
          </div>

          <div className="editing-build-author-row" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button type="button" className="editing-build-modal-close editing-build-modal-close--desktop" onClick={onBack || onClose} title="팀 선택으로">
              <Icon name="closeBtn" size={26} />
            </button>
          </div>
        </div>

        <div
          className="editing-build-grid editing-build-modal-body is-pvp"
          style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '16px 20px', gap: 20, alignItems: 'stretch', boxSizing: 'border-box' }}
        >
          <div className="editing-build-deck-slot" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <InGameDeckCard
              teamName={`${team + 1}팀`}
              formationId={current.formationId}
              onFormationChange={(fid) => patchDeck({ formationId: fid })}
              petObj={petObj}
              onPetChange={(p) => patchDeck({ petId: p.id })}
              heroList={current.heroNames.map((name, idx) => {
                const base = resolveHeroByName(name);
                return base ? { hero: base, gearConfig: current.heroGearConfigs[idx] } : name;
              })}
              onSlotClick={setSlot}
              selectedSlotIdx={slot}
              isSelected
              isEditMode
              contentMode="pvp"
              reservedSkills={current.reservedSkills}
              onReservationChange={(v) => patchDeck({ reservedSkills: v })}
              maxReservations={3}
              onHeroDrop={onDrop}
            />
          </div>

          <div className="glass-inset editing-build-detail-panel" style={{ padding: '12px 14px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 11, color: 'var(--accent-cyan)', fontWeight: 800 }}>
              세팅 디테일{current.heroNames[slot] ? ` · ${current.heroNames[slot]}` : ''}
            </div>
            <textarea
              className="editing-build-detail-textarea"
              value={current.heroGearConfigs[slot]?.detailNote || ''}
              onChange={(e) => {
                const next = padGear5(current.heroGearConfigs);
                next[slot] = { ...next[slot], detailNote: e.target.value };
                patchDeck({ heroGearConfigs: next });
              }}
              placeholder={'예:\n치확 67%에 가깝게\n약공 46%에 가깝게\n치피 최대한 땡기기'}
              style={{
                width: '100%', padding: '10px 12px', background: '#07090e', border: '1px solid var(--border-gold)',
                color: '#e2e8f0', borderRadius: 7, fontSize: 14, fontWeight: 700, lineHeight: 1.5,
                boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', minHeight: 110, flex: 1,
              }}
            />
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
              heroNames={current.heroNames}
              configs={current.heroGearConfigs}
              selectedIdx={slot}
              onSelectIdx={setSlot}
              onChange={(configs) => patchDeck({ heroGearConfigs: configs })}
            />
          </div>

          <div className="glass-inset editing-build-hero-picker" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, width: '100%', boxSizing: 'border-box', flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <Icon name="hero" size={14} /> 영웅 목록
            </div>
            <div className="editing-build-hero-grid" style={{ minHeight: 168 }}>
              <HeroGridPicker
                heroes={heroes}
                selectedNames={filledNames}
                currentSlotName={current.heroNames[slot] || ''}
                onPick={(name) => setHeroAt(slot, name)}
                fillHeight
                showSearch
              />
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.10)', flexShrink: 0 }}>
          <button type="button" onClick={onBack} className="btn-ops" style={{ width: '100%', padding: 11, justifyContent: 'center', borderRadius: 12, fontSize: 14 }}>
            팀 선택으로 돌아가기
          </button>
        </div>
      </div>
    </ModalScrim>
  );
}
