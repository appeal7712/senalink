import { useState } from 'react';
import SafeImg from './icons/SafeImg';
import { ROLE_ICONS } from '../data/roleIcons';
import { setDeckDragData } from '../utils/deckDrag';

const CARD_BG = {
  old_seven:    'linear-gradient(180deg, #fde047 0%, #ca8a04 100%)',
  special:      'linear-gradient(180deg, #facc15 0%, #ca8a04 100%)',
  semi_special: 'linear-gradient(180deg, #facc15 0%, #d97706 100%)',
  normal:       'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
};

const ROLE_FILTERS = [
  { id: 'all',       label: '전체',   icon: null },
  { id: 'offensive', label: '공격형', icon: ROLE_ICONS.offensive },
  { id: 'magic',     label: '마법형', icon: ROLE_ICONS.magic },
  { id: 'defensive', label: '방어형', icon: ROLE_ICONS.defensive },
  { id: 'support',   label: '지원형', icon: ROLE_ICONS.support },
  { id: 'universal', label: '만능형', icon: ROLE_ICONS.universal },
];

// currentSlotName: 현재 편집 중인 슬롯의 영웅은 목록에 남겨 교체를 허용하고,
// 다른 슬롯에 이미 배치된 영웅은 숨겨 중복 선택을 막는다.
export default function HeroGridPicker({ heroes, selectedNames = [], onPick, height = 200, currentSlotName = '', showSearch = false }) {
  const [roleFilter, setRoleFilter] = useState('all');
  const [q, setQ] = useState('');
  const needle = q.trim();
  const filtered = heroes.filter(h => {
    if (roleFilter !== 'all' && h.role !== roleFilter) return false;
    const cleanName = h.name.replace('(각성)', '');
    if (selectedNames.includes(cleanName) && cleanName !== currentSlotName) return false;
    if (needle && !cleanName.includes(needle) && !String(h.name || '').includes(needle)) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
        {ROLE_FILTERS.map(r => (
          <button key={r.id} type="button" onClick={() => setRoleFilter(r.id)}
            style={{
              padding: '5px 10px', fontSize: '12px', fontWeight: 800, borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: roleFilter === r.id ? 'var(--gold-primary)' : 'rgba(8, 12, 22, 0.45)',
              color: roleFilter === r.id ? '#000' : '#fff', display: 'flex', alignItems: 'center', gap: '4px'
            }}>
            {r.icon && <img src={r.icon} alt="" style={{ width: '12px', height: '12px' }} />}
            <span>{r.label}</span>
          </button>
        ))}
      </div>

      {showSearch && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름 검색 · 여포, 미호…"
          className="ops-glass-field"
          style={{
            width: '100%', padding: '8px 10px',
          }}
        />
      )}

      <div style={{ height: `${height}px`, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))', gap: '8px', overflowY: 'auto', paddingRight: '4px' }}>
        {filtered.map(h => {
          const cleanName = h.name.replace('(각성)', '');
          const isCurrent = cleanName === currentSlotName;
          return (
            <div
              key={h.id}
              draggable
              onDragStart={e => setDeckDragData(e, { source: 'picker', name: cleanName })}
              onClick={() => onPick(cleanName)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'grab' }}
            >
              <div style={{
                position: 'relative', width: '62px', height: '68px', background: CARD_BG[h.cardTier || 'normal'],
                borderRadius: '9px', border: isCurrent ? '2.5px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.15)',
                overflow: 'hidden', boxShadow: isCurrent ? '0 0 10px rgba(56,189,248,0.55)' : 'none', transition: 'all 0.15s ease'
              }}>
                <SafeImg src={h.portraitUrl} alt={h.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', pointerEvents: 'none' }} />
              </div>
              <div style={{ width: '62px', marginTop: '4px', textAlign: 'center', fontSize: '12px', color: '#fff', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {cleanName}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
