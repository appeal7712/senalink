import Icon from './icons/Icon';
import { EQUIPMENT_SET_ICONS, accessories } from '../data/equipments';

export const emptyGearConfig = () => ({
  setName: '복수자',
  weapon1: '치명타 확률',
  weapon2: '치명타 확률',
  armor1: '모든 공격력(%)',
  armor2: '모든 공격력(%)',
  accessory: '불사의 반지',
  optionCode: '',
  detailNote: '',
});

const SET_NAMES = ['선봉장', '추적자', '성기사', '수문장', '수호자', '암살자', '복수자', '주술사', '조율자'];

const WEAPON_OPTS = ['약점 공격 확률', '치명타 확률', '치명타 피해', '모든 공격력(%)', '효과 적중'];
const ARMOR_OPTS = ['받는 피해 감소', '막기 확률', '모든 공격력(%)', '방어력(%)', '생명력(%)', '효과 저항'];

const OPT_SHORT = {
  '약점 공격 확률': '약공',
  '치명타 확률': '치확',
  '치명타 피해': '치피',
  '모든 공격력(%)': '공',
  '효과 적중': '효적',
  '받는 피해 감소': '받',
  '막기 확률': '막확',
  '방어력(%)': '방',
  '생명력(%)': '생',
  '효과 저항': '저항',
};

export function buildOptionCode(cfg = {}) {
  const fromSlots = [cfg.weapon1, cfg.weapon2, cfg.armor1, cfg.armor2]
    .map(v => OPT_SHORT[v] || '')
    .filter(Boolean)
    .join('');
  if (fromSlots) return fromSlots;
  return String(cfg.optionCode || '').trim().replaceAll('적중', '효적').replaceAll('피감', '받');
}

const selectStyle = {
  width: '100%', padding: '7px', background: '#07090e', border: '1px solid var(--border-gold)',
  color: '#fff', borderRadius: '5px', fontSize: '12.5px', fontWeight: 800, boxSizing: 'border-box',
  colorScheme: 'dark'
};

/**
 * PvE 덱 수정의 장비 세팅 패널을 재사용한 컴포넌트.
 */
export default function HeroGearPanel({
  heroNames = [],
  configs = [],
  selectedIdx = 0,
  onSelectIdx,
  onChange,
}) {
  const filled = heroNames.map((n, i) => ({ name: n, idx: i })).filter(x => x.name);
  const activeIdx = filled.some(f => f.idx === selectedIdx)
    ? selectedIdx
    : (filled[0]?.idx ?? 0);
  const cfg = configs[activeIdx] || emptyGearConfig();

  const update = (field, value) => {
    const next = [...configs];
    while (next.length <= activeIdx) next.push(emptyGearConfig());
    next[activeIdx] = { ...(next[activeIdx] || emptyGearConfig()), [field]: value };
    onChange(next);
  };

  if (filled.length === 0) {
    return (
      <div className="hero-gear-panel hero-gear-panel--empty" style={{ flex: 1, minWidth: '320px', background: 'rgba(255,255,255,0.07)', border: '1.5px solid var(--border-gold)', borderRadius: '12px', padding: '16px', color: '#64748b', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        영웅을 배치하면 장비 세팅이 활성화됩니다.
      </div>
    );
  }

  return (
    <div className="hero-gear-panel" style={{ flex: 1, minWidth: '360px', background: 'rgba(255,255,255,0.07)', border: '1.5px solid var(--border-gold)', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ fontSize: '13px', fontWeight: 900, color: 'var(--gold-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <Icon name="swords" size={13} /> 장비 세팅
      </div>

      <div style={{ display: 'flex', gap: '5px' }}>
        {filled.map(({ name, idx }) => (
          <button key={idx} type="button" onClick={() => onSelectIdx(idx)}
            style={{
              flex: 1, minWidth: 0, padding: '7px 4px', fontSize: '12px', fontWeight: 900, borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: activeIdx === idx ? 'var(--gold-primary)' : 'rgba(255,255,255,0.08)',
              color: activeIdx === idx ? '#000' : '#cbd5e1',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}>
            {name}
          </button>
        ))}
      </div>

      <div>
        <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginBottom: '6px', fontWeight: 800 }}>장비 세트</div>
        <div className="hero-gear-panel-set-grid">
          {SET_NAMES.map(setName => {
            const isCur = (cfg.setName || '복수자') === setName;
            return (
              <button key={setName} type="button" onClick={() => update('setName', setName)}
                style={{
                  padding: '8px 8px', fontSize: '12px', fontWeight: 800, borderRadius: '8px',
                  border: isCur ? '1.5px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  background: isCur ? 'rgba(236,232,224,0.22)' : 'rgba(255,255,255,0.04)',
                  color: isCur ? 'var(--gold-light)' : '#cbd5e1',
                  display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}>
                <span>{setName}</span>
                <img src={EQUIPMENT_SET_ICONS[setName]} alt="" style={{ width: '22px', height: '22px', flexShrink: 0 }} />
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '3px', fontWeight: 800 }}>무기 1</div>
            <select value={cfg.weapon1 || '치명타 확률'} onChange={e => update('weapon1', e.target.value)} style={selectStyle}>
              {WEAPON_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '3px', fontWeight: 800 }}>방어구 1</div>
            <select value={cfg.armor1 || '모든 공격력(%)'} onChange={e => update('armor1', e.target.value)} style={selectStyle}>
              {ARMOR_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '3px', fontWeight: 800 }}>무기 2</div>
            <select value={cfg.weapon2 || '치명타 확률'} onChange={e => update('weapon2', e.target.value)} style={selectStyle}>
              {WEAPON_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '3px', fontWeight: 800 }}>방어구 2</div>
            <select value={cfg.armor2 || '모든 공격력(%)'} onChange={e => update('armor2', e.target.value)} style={selectStyle}>
              {ARMOR_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: '11px', color: '#c084fc', marginBottom: '6px', fontWeight: 800 }}>장신구</div>
        <div className="hero-gear-panel-accessory-grid">
          {accessories.map(acc => {
            const isCur = (cfg.accessory || '불사의 반지') === acc.name;
            return (
              <button key={acc.id} type="button" onClick={() => update('accessory', acc.name)} title={acc.effect}
                style={{
                  padding: '8px 8px', borderRadius: '8px', cursor: 'pointer',
                  border: isCur ? '1.5px solid #c084fc' : '1px solid rgba(255,255,255,0.1)',
                  background: isCur ? 'rgba(192,132,252,0.22)' : 'rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}>
                <span style={{ fontSize: '12px', fontWeight: 900, color: isCur ? '#e9d5ff' : '#cbd5e1', whiteSpace: 'nowrap' }}>{acc.shortLabel || acc.name}</span>
                <img src={acc.iconUrl} alt="" style={{ width: '28px', height: '28px', objectFit: 'contain', flexShrink: 0 }} />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginBottom: '4px', fontWeight: 800 }}>세팅 디테일</div>
        <textarea
          value={cfg.detailNote || ''}
          onChange={e => update('detailNote', e.target.value)}
          rows={5}
          placeholder={'예:\n치확 67%에 가깝게\n약공 46%에 가깝게\n치피 최대한 땡기기'}
          style={{
            width: '100%', padding: '10px 12px', background: '#07090e', border: '1px solid var(--border-gold)',
            color: '#e2e8f0', borderRadius: '7px', fontSize: '14px', fontWeight: 700, lineHeight: 1.5,
            boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', minHeight: '110px'
          }}
        />
      </div>
    </div>
  );
}
