import { useState } from 'react';
import HeroPortraitCard from './HeroPortraitCard';
import HeroListFilterBar from './HeroListFilterBar';
import { sortHeroesForList } from '../data/heroes';
import { heroMatchesQuery } from '../lib/heroSearch';
import {
  setDeckDragData,
  startDeckPointerDrag,
  markDeckPointerDown,
  allowHtml5DeckDrag,
  markDeckHtml5DragStarted,
  shouldSuppressDeckClick,
} from '../utils/deckDrag';

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
    if (needle && !heroMatchesQuery(h, needle)) return false;
    return true;
  }));

  const portraitW = loungeDensity ? 58 : 62;
  const cellMin = loungeDensity ? 62 : 68;
  const gap = loungeDensity ? 6 : 8;

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
      <div style={{ flexShrink: 0 }}>
        <HeroListFilterBar
          role={roleFilter}
          onRoleChange={setRoleFilter}
          query={q}
          onQueryChange={setQ}
          showSearch={showSearch}
        />
      </div>

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
                if (!allowHtml5DeckDrag(e)) {
                  e.preventDefault();
                  return;
                }
                markDeckHtml5DragStarted();
                setDeckDragData(e, { source: 'picker', name: cleanName });
              }}
              onClick={() => {
                if (shouldSuppressDeckClick()) return;
                onPick(cleanName);
              }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', touchAction: 'manipulation' }}
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
