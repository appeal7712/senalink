import { useState } from 'react';
import HeroPortraitCard from './HeroPortraitCard';
import { ROLE_ICONS } from '../data/roleIcons';
import { sortHeroesForList } from '../data/heroes';
import { setDeckDragData, startDeckPointerDrag, markDeckPointerDown, allowHtml5DeckDrag, shouldSuppressDeckClick } from '../utils/deckDrag';

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
export default function HeroGridPicker({
  heroes,
  selectedNames = [],
  onPick,
  height = 200,
  currentSlotName = '',
  showSearch = false,
  /** 길드 허브 덱 수정과 동일: 부모 남는 높이를 채움 */
  fillHeight = false,
  /** 길드와 같은 초상·필터 밀도 */
  loungeDensity = false,
}) {
  const [roleFilter, setRoleFilter] = useState('all');
  const [q, setQ] = useState('');
  const needle = q.trim();
  const filtered = sortHeroesForList(heroes.filter(h => {
    if (roleFilter !== 'all' && h.role !== roleFilter) return false;
    const cleanName = h.name.replace('(각성)', '');
    if (selectedNames.includes(cleanName) && cleanName !== currentSlotName) return false;
    if (needle && !cleanName.includes(needle) && !String(h.name || '').includes(needle)) return false;
    return true;
  }));

  const portraitW = loungeDensity ? 58 : 62;
  const cellMin = loungeDensity ? 62 : 68;
  const gap = loungeDensity ? 6 : 8;
  const filterPad = loungeDensity ? '8px 12px' : '5px 10px';
  const filterFont = loungeDensity ? '13px' : '12px';
  const filterIcon = loungeDensity ? 16 : 12;
  const filterRadius = loungeDensity ? 8 : 6;

  return (
    <div
      className={`hero-grid-picker${fillHeight ? ' hero-grid-picker--fill' : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: loungeDensity ? 10 : 8,
        ...(fillHeight ? { flex: '1 1 auto', minHeight: 0, height: '100%' } : null),
      }}
    >
      <div style={{ display: 'flex', gap: loungeDensity ? 6 : 5, flexWrap: 'wrap', flexShrink: 0 }}>
        {ROLE_FILTERS.map(r => (
          <button key={r.id} type="button" onClick={() => setRoleFilter(r.id)}
            style={{
              padding: filterPad, fontSize: filterFont, fontWeight: 800, borderRadius: filterRadius, border: 'none', cursor: 'pointer',
              background: roleFilter === r.id ? 'var(--gold-primary)' : 'rgba(255,255,255,0.06)',
              color: roleFilter === r.id ? '#000' : '#94a3b8', display: 'flex', alignItems: 'center', gap: loungeDensity ? 6 : 4,
            }}>
            {r.icon && <img src={r.icon} alt="" style={{ width: filterIcon, height: filterIcon, objectFit: 'contain' }} />}
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
            width: '100%', padding: '8px 10px', flexShrink: 0,
          }}
        />
      )}

      <div
        className="hero-grid-picker-grid"
        style={{
          ...(fillHeight
            ? { flex: '1 1 auto', minHeight: 64, height: 'auto' }
            : { height: `${height}px` }),
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${cellMin}px, 1fr))`,
          gap: `${gap}px`,
          overflowY: 'auto',
          paddingRight: 4,
          paddingBottom: 12,
          boxSizing: 'border-box',
        }}
      >
        {filtered.map(h => {
          const cleanName = h.name.replace('(각성)', '');
          const isCurrent = cleanName === currentSlotName;
          return (
            <div
              key={h.id}
              draggable
              onPointerDown={e => {
                markDeckPointerDown(e);
                startDeckPointerDrag(e, { source: 'picker', name: cleanName }, { label: cleanName });
              }}
              onDragStart={e => {
                if (!allowHtml5DeckDrag()) {
                  e.preventDefault();
                  return;
                }
                setDeckDragData(e, { source: 'picker', name: cleanName });
              }}
              onClick={() => {
                if (shouldSuppressDeckClick()) return;
                onPick(cleanName);
              }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'grab', touchAction: 'none' }}
            >
              <div style={{
                width: portraitW,
                outline: isCurrent ? '2.5px solid var(--accent-cyan)' : 'none',
                outlineOffset: 1,
                borderRadius: 8,
                boxShadow: isCurrent ? '0 0 10px rgba(56,189,248,0.55)' : 'none',
                transition: 'all 0.15s ease',
              }}>
                <HeroPortraitCard hero={h} showStars showRole showName={false} />
              </div>
              <div style={{
                width: portraitW, marginTop: 4, textAlign: 'center', fontSize: loungeDensity ? 11 : 12,
                color: '#fff', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {cleanName}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
