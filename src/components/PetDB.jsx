import { useMemo, useState } from 'react';
import { pets } from '../data/pets';
import Icon from './icons/Icon';
import ModalScrim from './ModalScrim';
import { backdropDismissProps } from '../utils/backdropDismiss';
import '../styles/petDex.css';

const RARITY_TABS = [
  { id: 'all', label: '전체' },
  { id: 'L', label: '전설' },
  { id: 'R', label: '희귀' },
];

const STAT_LABELS = [
  ['atk', '공격력'],
  ['def', '방어력'],
  ['hp', '생명력'],
];

const pctOf = (s) => {
  const m = /(\d+(?:\.\d+)?)%/.exec(s || '');
  return m ? Number(m[1]) : null;
};

/** 펫 효과 한 줄씩: 이름 · 대상 · 지속 · 아이콘 · 기본 → 강화 1~3 수치 */
function petEffects(pet) {
  const skill = pet.skills?.[0];
  if (!skill) return [];
  const levels = [{}, {}, {}];
  for (const line of skill.skill_enhance || []) {
    const m = /^(\d)레벨:\s*(.+)$/.exec(line);
    if (!m) continue;
    for (const part of m[2].split(/,\s*/)) {
      const p = /^(.+?)\s+(\d+(?:\.\d+)?)%로 변경$/.exec(part);
      if (p) levels[Number(m[1]) - 1][p[1]] = Number(p[2]);
    }
  }
  const rows = [];
  for (const eff of skill.effects || []) {
    for (const detail of eff.details || []) {
      if (eff.target === '패시브') {
        rows.push({ name: detail.replace(/\s*\(동일한 종류.*\)$/, ''), target: '모험 효과', farming: true, values: [pctOf(detail)] });
        continue;
      }
      const name = detail.replace(/\s*\[.*$/, '').trim();
      const timing = /\[([^\]]+)\]/.exec(detail)?.[1] || '';
      const base = pctOf(pet.tooltips?.[name]);
      const values = [base];
      let last = base;
      for (const lv of levels) {
        last = lv[name] ?? last;
        values.push(last);
      }
      rows.push({
        name,
        target: eff.target,
        enemy: eff.target.includes('적군'),
        timing,
        icon: pet.effectIcons?.[name] ? `/images/effects/${pet.effectIcons[name]}.webp` : null,
        sentence: [pet.tooltips?.[name], /\]\s*(.+)$/.exec(detail)?.[1]].filter(Boolean).join(' '),
        values: (skill.skill_enhance?.length ? values : [base]),
      });
    }
  }
  return rows;
}

function PetFace({ pet, size }) {
  return (
    <div className={`pet-dex-face pet-portrait-face is-${pet.rarity || 'L'}`} style={{ width: size, height: size }}>
      {pet.portraitUrl ? <img src={pet.portraitUrl} alt="" loading="lazy" /> : <Icon name="pet" size={Math.round(size * 0.4)} />}
    </div>
  );
}

function PetBadges({ pet }) {
  return (
    <div className="pet-dex-badges">
      {pet.rarityLabel && <span className={`pet-dex-badge is-${pet.rarity}`}>{pet.rarityLabel}</span>}
      {pet.faction && <span className="pet-dex-badge is-faction">{pet.faction}</span>}
      {pet.unreleased && <span className="pet-dex-badge is-soon">미출시</span>}
    </div>
  );
}

function EffectValue({ row }) {
  const vals = row.values.filter((v) => v != null);
  if (!vals.length) return null;
  const first = vals[0];
  const max = vals[vals.length - 1];
  return (
    <span className={`pet-dex-val ${row.enemy ? 'is-debuff' : 'is-buff'}`}>
      {first === max ? `${max}%` : `${first}→${max}%`}
    </span>
  );
}

function PetCard({ pet, onOpen }) {
  const rows = useMemo(() => petEffects(pet), [pet]);
  const skill = pet.skills?.[0];
  return (
    <button type="button" className={`pet-dex-card luxury-panel is-${pet.rarity || 'L'}`} onClick={() => onOpen(pet)}>
      <div className="pet-dex-card-head">
        <PetFace pet={pet} size={72} />
        <div className="pet-dex-card-title">
          <div className="pet-dex-name">{pet.name}</div>
          {pet.relatedHero && <div className="pet-dex-sub">{pet.relatedHero}의 펫</div>}
          <PetBadges pet={pet} />
        </div>
      </div>
      <div className="pet-dex-skill">
        {pet.skillIconUrl ? <img className="pet-dex-skill-icon" src={pet.skillIconUrl} alt="" loading="lazy" /> : <span className="pet-dex-skill-icon is-empty"><Icon name="sparkle" size={16} /></span>}
        <span className="pet-dex-skill-name">{skill?.name || '펫의 응원'}</span>
      </div>
      <ul className="pet-dex-fx">
        {rows.map((row, i) => (
          <li key={i} className={row.enemy ? 'is-enemy' : ''}>
            {row.icon ? <img src={row.icon} alt="" /> : <span className="pet-dex-fx-dot" />}
            <span className="pet-dex-fx-name">{row.name}</span>
            <EffectValue row={row} />
          </li>
        ))}
      </ul>
    </button>
  );
}

function PetModal({ pet, onClose }) {
  const rows = useMemo(() => petEffects(pet), [pet]);
  const skill = pet.skills?.[0];
  const hasLevels = rows.some((r) => r.values.length > 1);
  return (
    <ModalScrim style={{ zIndex: 3500, padding: 16 }} {...backdropDismissProps(onClose)}>
      <div className="glass-modal pet-dex-modal" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="pet-dex-close" onClick={onClose} aria-label="닫기"><Icon name="closeBtn" size={20} /></button>
        <div className="pet-dex-modal-head">
          <PetFace pet={pet} size={104} />
          <div className="pet-dex-card-title">
            <div className="pet-dex-name is-lg">{pet.name}</div>
            {pet.title && <div className="pet-dex-sub">{pet.title}</div>}
            {pet.relatedHero && <div className="pet-dex-sub">{pet.relatedHero}의 펫</div>}
            <PetBadges pet={pet} />
          </div>
        </div>

        {pet.stats && (
          <div className="pet-dex-stats">
            {STAT_LABELS.map(([k, label]) => (
              <div key={k}><span>{label}</span><strong>{pet.stats[k]?.toLocaleString()}</strong></div>
            ))}
          </div>
        )}

        <div className="pet-dex-skill-box">
          <div className="pet-dex-skill is-lg">
            {pet.skillIconUrl ? <img className="pet-dex-skill-icon" src={pet.skillIconUrl} alt="" /> : <span className="pet-dex-skill-icon is-empty"><Icon name="sparkle" size={22} /></span>}
            <div>
              <div className="pet-dex-skill-name">{skill?.name || '펫의 응원'}</div>
              <div className="pet-dex-sub">펫 스킬 · {rows.some((r) => r.farming) ? '모험 · 쫄작' : '전투 시 적용'}</div>
            </div>
          </div>
          {rows.map((row, i) => (
            <div key={i} className={`pet-dex-passive ${row.enemy ? 'is-enemy' : ''}`}>
              <div className="pet-dex-passive-head">
                {row.icon ? <img src={row.icon} alt="" /> : <span className="pet-dex-fx-dot" />}
                <span className="pet-dex-fx-name">{row.name}</span>
                <span className="pet-dex-target">{row.target}{row.timing ? ` · ${row.timing}` : ''}</span>
              </div>
              {row.sentence && <div className="pet-dex-sentence">{row.sentence}</div>}
              {hasLevels && row.values.length > 1 && (
                <div className="pet-dex-levels">
                  {row.values.map((v, lv) => (
                    <div key={lv} className={lv === row.values.length - 1 ? 'is-max' : ''}>
                      <span>{lv === 0 ? '기본' : `강화 ${lv}`}</span>
                      <strong>{v != null ? `${v}%` : '-'}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {rows.some((r) => r.farming) && <div className="pet-dex-note">동일한 종류의 펫 패시브와 중복 적용되지 않아요.</div>}
        </div>
      </div>
    </ModalScrim>
  );
}

export default function PetDB() {
  const [search, setSearch] = useState('');
  const [rarity, setRarity] = useState('all');
  const [selected, setSelected] = useState(null);

  const list = pets.filter((p) => (rarity === 'all' || p.rarity === rarity) && (!search || p.name.includes(search.trim())));

  return (
    <div className="container fade-in" style={{ paddingBottom: 60 }}>
      <div className="luxury-panel pet-dex-toolbar">
        <div className="pet-dex-toolbar-title">
          <Icon name="pet" size={17} /> 펫 도감
          <span>{list.length}종</span>
        </div>
        <div className="pet-dex-rarity">
          {RARITY_TABS.map((t) => (
            <button key={t.id} type="button" className={rarity === t.id ? 'on' : ''} aria-pressed={rarity === t.id} onClick={() => setRarity(t.id)}>{t.label}</button>
          ))}
        </div>
        <input type="text" placeholder="펫 이름 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="pet-dex-grid">
        {list.map((p) => <PetCard key={p.id} pet={p} onOpen={setSelected} />)}
      </div>
      {!list.length && <div className="pet-dex-empty">찾는 펫이 없어요.</div>}

      {selected && <PetModal pet={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
