import { useMemo, useState } from 'react';
import { heroes } from '../../data/heroes';
import { pets } from '../../data/pets';
import { EQUIPMENT_SET_ICONS, accessories, weaponOptions, armorOptions } from '../../data/equipments';
import InGameDeckCard from '../../components/InGameDeckCard';
import HeroGridPicker from '../../components/HeroGridPicker';
import Icon from '../../components/icons/Icon';
import PvpModeToggle, { normalizePvpMode } from '../../components/PvpModeToggle';
import { MetaDeckKindToggle } from '../../components/ArenaDeckKind';
import { backdropDismissProps } from '../../utils/backdropDismiss';
import ModalScrim from '../../components/ModalScrim';

const SETS = ['선봉장', '추적자', '성기사', '수문장', '수호자', '암살자', '복수자', '주술사', '조율자'];
const WEAPON_OPTS = weaponOptions;
const ARMOR_OPTS = armorOptions;
const DECK_TYPES = ['결투장', '상급결투장'];

const emptyGear = () => ({
  setName: '복수자',
  weapon1: '치명타 확률',
  weapon2: '치명타 확률',
  armor1: '모든 공격력(%)',
  armor2: '모든 공격력(%)',
  accessory: '불사의 반지',
  optionCode: '',
  detailNote: '',
});

const padGear5 = (list = []) => {
  const next = Array.from({ length: 5 }, (_, i) => ({ ...emptyGear(), ...(list[i] || {}) }));
  return next;
};

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

export default function OpsMetaDeckModal({ deck, onSave, onClose }) {
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

  const petObj = useMemo(() => pets.find((p) => p.id === petId) || pets[0], [petId]);
  const g = gear[slot] || emptyGear();

  const setHeroAt = (idx, name) => {
    const next = padNames5(heroNames);
    if (name && next.some((n, i) => i !== idx && n === name)) return;
    next[idx] = name;
    setHeroNames(next);
  };

  const onDrop = (payload, toIdx) => {
    const next = padNames5(heroNames);
    if (payload?.source === 'slot' && typeof payload.fromIdx === 'number') {
      const tmp = next[toIdx];
      next[toIdx] = next[payload.fromIdx];
      next[payload.fromIdx] = tmp;
      setHeroNames(next);
      setSlot(toIdx);
      return;
    }
    if (payload?.source === 'picker' && payload.name) {
      const existingIdx = next.findIndex((n, i) => i !== toIdx && n === payload.name);
      if (existingIdx !== -1) {
        const tmp = next[toIdx];
        next[toIdx] = next[existingIdx];
        next[existingIdx] = tmp;
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

  const commit = () => {
    onSave({
      ...deck,
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

  const sel = {
    width: '100%', flex: 1, minHeight: 36, padding: '0 8px', background: '#07090e',
    border: '1px solid var(--border-gold)', color: '#fff', borderRadius: 5, fontSize: 12.5, fontWeight: 800, boxSizing: 'border-box', colorScheme: 'dark',
  };

  return (
    <ModalScrim style={{ zIndex: 5200, padding: 16 }} {...backdropDismissProps(onClose)}>
      <div className="luxury-panel glass-modal" onClick={(e) => e.stopPropagation()} style={{
        width: '94vw', maxWidth: 1520, maxHeight: '90vh', padding: 0, display: 'flex', flexDirection: 'column',
        borderRadius: 28, minHeight: 0,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          padding: '12px 20px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.10)', flexShrink: 0,
        }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#fff' }}>메타 덱 세팅</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', marginBottom: 4 }}>덱 유형 · 내가 정함</div>
              <MetaDeckKindToggle kind={kind} onChange={setKind} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', marginBottom: 4 }}>세팅</div>
              <PvpModeToggle mode={mode} onChange={setMode} />
            </div>
            <button type="button" onClick={onClose} style={{
              background: 'none', border: 'none', color: '#fff',
              width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="closeBtn" size={26} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="grid-2-responsive" style={{ gap: 10 }}>
            <label style={labelStyle}>제목
              <input style={fieldStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 여포 후열 파멸" />
            </label>
            <label style={labelStyle}>모드
              <select style={fieldStyle} value={type} onChange={(e) => setType(e.target.value)}>
                {DECK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label style={labelStyle}>티어
              <input style={fieldStyle} value={tier} onChange={(e) => setTier(e.target.value)} placeholder="예: 0티어" />
            </label>
            <label style={labelStyle}>픽률
              <input style={fieldStyle} value={usageRate} onChange={(e) => setUsageRate(e.target.value)} placeholder="예: 42.5%" />
            </label>
          </div>
          <label style={labelStyle}>한 줄 설명
            <input style={fieldStyle} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="메인 카드 아래에 안 나와도 됨. 메모용." />
          </label>

          <div style={{ display: 'flex', gap: 14, alignItems: 'stretch', flexWrap: 'wrap' }}>
            <div style={{ width: 300, flexShrink: 0 }}>
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

            <div className="glass-inset" style={{ flex: 1, minWidth: 360, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>
                <Icon name="gearSetting" size={13} /> 장비 세팅 · {heroNames[slot] || '슬롯을 고르세요'}
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                {heroNames.map((hName, idx) => (
                  hName ? (
                    <button key={idx} type="button" onClick={() => setSlot(idx)}
                      style={{
                        flex: 1, minWidth: 0, padding: '8px 4px', fontSize: 12, fontWeight: 900, borderRadius: 6, border: 'none', cursor: 'pointer',
                        background: slot === idx ? 'var(--gold-primary)' : 'rgba(255,255,255,0.08)',
                        color: slot === idx ? '#000' : '#cbd5e1',
                      }}
                    >
                      {hName}
                    </button>
                  ) : null
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {SETS.map((setName) => {
                  const on = (g.setName || '복수자') === setName;
                  return (
                    <button key={setName} type="button" onClick={() => patchGear('setName', setName)} style={{
                      padding: '6px 8px', fontSize: 12, fontWeight: 800, borderRadius: 8, cursor: 'pointer',
                      border: on ? '1.5px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.1)',
                      background: on ? 'rgba(236,232,224,0.22)' : 'rgba(255,255,255,0.04)',
                      color: on ? 'var(--gold-light)' : '#cbd5e1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                      {setName}
                      <img src={EQUIPMENT_SET_ICONS[setName]} alt="" style={{ width: 18, height: 18 }} />
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <label style={labelStyle}>무기 1
                  <select style={sel} value={g.weapon1 || '치명타 확률'} onChange={(e) => patchGear('weapon1', e.target.value)}>
                    {WEAPON_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>방어구 1
                  <select style={sel} value={g.armor1 || '모든 공격력(%)'} onChange={(e) => patchGear('armor1', e.target.value)}>
                    {ARMOR_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>무기 2
                  <select style={sel} value={g.weapon2 || '치명타 확률'} onChange={(e) => patchGear('weapon2', e.target.value)}>
                    {WEAPON_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>방어구 2
                  <select style={sel} value={g.armor2 || '모든 공격력(%)'} onChange={(e) => patchGear('armor2', e.target.value)}>
                    {ARMOR_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {accessories.map((acc) => {
                  const on = (g.accessory || '불사의 반지') === acc.name;
                  return (
                    <button key={acc.id} type="button" onClick={() => patchGear('accessory', acc.name)} style={{
                      padding: '8px 6px', fontSize: 11, fontWeight: 800, borderRadius: 8, cursor: 'pointer',
                      border: on ? '1.5px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.1)',
                      background: on ? 'rgba(236,232,224,0.22)' : 'rgba(255,255,255,0.04)',
                      color: on ? 'var(--gold-light)' : '#cbd5e1',
                    }}>
                      {acc.shortLabel || acc.name}
                    </button>
                  );
                })}
              </div>
              <textarea
                value={g.detailNote || ''}
                onChange={(e) => patchGear('detailNote', e.target.value)}
                placeholder={'세팅 메모\n예: 치확 67%에 가깝게'}
                style={{ ...fieldStyle, minHeight: 72, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          <div className="glass-inset" style={{ padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
              영웅 목록 · 슬롯 {slot + 1} {heroNames[slot] ? `(${heroNames[slot]})` : ''}
            </div>
            <HeroGridPicker
              heroes={heroes}
              selectedNames={heroNames.filter(Boolean)}
              currentSlotName={heroNames[slot] || ''}
              height={220}
              showSearch
              onPick={(name) => {
                setHeroAt(slot, name);
              }}
            />
          </div>
        </div>

        <div style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.10)', flexShrink: 0 }}>
          <button type="button" className="btn-ops" onClick={commit} style={{ width: '100%', padding: 11, justifyContent: 'center' }}>
            <Icon name="save" size={15} /> 이 덱 적용
          </button>
        </div>
      </div>
    </ModalScrim>
  );
}
