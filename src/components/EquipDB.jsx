import { useMemo, useState } from 'react';
import Icon from './icons/Icon';
import SafeImg from './icons/SafeImg';
import {
  accessoryCatalog,
  equipments,
  gearPieces,
  RARITY_META,
  SLOT_META,
} from '../data/gearDex';
import { backdropDismissProps } from '../utils/backdropDismiss';
import ModalScrim from './ModalScrim';

const SET_ORDER = ['선봉장', '추적자', '성기사', '수호자', '수문장', '암살자', '복수자', '주술사', '조율자'];

export default function EquipDB() {
  const [pane, setPane] = useState('equip');
  const [setFilter, setSetFilter] = useState('all');
  const [slotFilter, setSlotFilter] = useState('all');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedAcc, setSelectedAcc] = useState(null);
  const [selectedSet, setSelectedSet] = useState(null);

  const filteredPieces = useMemo(() => {
    return gearPieces.filter((p) => {
      if (setFilter !== 'all' && !p.sets.includes(setFilter)) return false;
      if (slotFilter !== 'all' && p.slot !== slotFilter) return false;
      if (query && !`${p.name} ${p.sets.join(' ')}`.includes(query)) return false;
      return true;
    });
  }, [setFilter, slotFilter, query]);

  const filteredAcc = useMemo(() => {
    return accessoryCatalog.filter((a) => {
      if (rarityFilter !== 'all' && a.rarity !== rarityFilter) return false;
      const hay = `${a.displayName || a.name} ${a.effect} ${a.shortLabel || ''}`;
      if (query && !hay.includes(query)) return false;
      return true;
    });
  }, [rarityFilter, query]);

  return (
    <div className="container fade-in" style={{ paddingBottom: '60px' }}>
      <div className="luxury-panel" style={{
        padding: '16px 18px', marginBottom: '16px',
        display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center',
      }}>
        {[
          { id: 'equip', icon: 'swords', label: '장비 세트 · 실전 장비' },
          { id: 'accessory', icon: 'ring', label: '장신구 도감' },
        ].map((tab) => {
          const on = pane === tab.id;
          return (
            <button key={tab.id} type="button" onClick={() => { setPane(tab.id); setQuery(''); }}
              className={`nav-tab-btn${on ? ' active' : ''}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}>
              <Icon name={tab.icon} size={15} color={on ? '#161616' : 'rgba(255,255,255,0.8)'} />
              {tab.label}
            </button>
          );
        })}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={pane === 'equip' ? '장비 이름 · 세트 검색' : '장신구 이름 · 효과 검색'}
          style={{
            marginLeft: 'auto', minWidth: '220px', flex: '1 1 220px',
            padding: '10px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)',
            color: '#fff', borderRadius: '999px', fontSize: '13px', fontWeight: 700,
          }}
        />
      </div>

      {pane === 'equip' && (
        <>
          <div className="luxury-panel" style={{ padding: '14px 16px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <FilterRow label="세트">
              <Chip active={setFilter === 'all'} onClick={() => setSetFilter('all')}>전체</Chip>
              {SET_ORDER.map((name) => {
                const eq = equipments.find((e) => e.name === name);
                return (
                  <Chip key={name} active={setFilter === name} onClick={() => setSetFilter(name)}>
                    {eq && <SafeImg src={eq.iconUrl} alt="" loading="lazy" style={{ width: 18, height: 18, objectFit: 'contain' }} />}
                    {name}
                  </Chip>
                );
              })}
            </FilterRow>
            <FilterRow label="부위">
              <Chip active={slotFilter === 'all'} onClick={() => setSlotFilter('all')}>전체</Chip>
              {Object.values(SLOT_META).map((s) => (
                <Chip key={s.id} active={slotFilter === s.id} onClick={() => setSlotFilter(s.id)}>
                  <Icon name={s.icon} size={13} /> {s.label}
                </Chip>
              ))}
            </FilterRow>
          </div>

          <div className="dex-equip-sets">
            {(setFilter === 'all' ? SET_ORDER : [setFilter]).map((setName) => {
              const eq = equipments.find((e) => e.name === setName);
              const setPieces = filteredPieces.filter((p) => p.sets.includes(setName));
              if (!eq) return null;
              if (setFilter === 'all' && query && setPieces.length === 0) return null;
              return (
                <div
                  key={setName}
                  className="luxury-panel"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedSet(eq)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedSet(eq); }}
                  style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 12, background: '#07090e',
                      border: '1.5px solid var(--border-gold)', padding: 6, flexShrink: 0,
                    }}>
                      <SafeImg src={eq.iconUrl} alt={eq.name} fallbackIcon="shield" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{eq.name}</div>
                      <div style={{ fontSize: 13, color: '#7dd3fc', fontWeight: 800 }}>2세트 {eq.set2}</div>
                      <div style={{ fontSize: 13, color: '#fde68a', fontWeight: 800 }}>4세트 {eq.set4}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, color: '#f8fafc', lineHeight: 1.55, fontWeight: 700 }}>{eq.description}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {['physical', 'magic', 'armor'].map((slot) => {
                      const piece = setPieces.find((p) => p.slot === slot) || gearPieces.find((p) => p.sets.includes(setName) && p.slot === slot);
                      const show = slotFilter === 'all' || slotFilter === slot;
                      if (!show) return null;
                      return (
                        <div key={slot} style={{
                          background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)',
                          borderRadius: 12, padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minHeight: 128,
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 900, color: '#e2e8f0' }}>{SLOT_META[slot].label}</div>
                          {piece ? (
                            <>
                              <div style={{ width: 64, height: 64 }}>
                                <SafeImg src={piece.iconUrl} alt={piece.name} fallbackIcon="swords" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                              </div>
                              <div style={{ fontSize: 11, fontWeight: 800, color: '#e2e8f0', textAlign: 'center', lineHeight: 1.35 }}>
                                {piece.name.replace(/^빛나는\s*/, '')}
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize: 11, color: '#64748b' }}>아이콘 없음</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {pane === 'accessory' && (
        <>
          <div className="luxury-panel" style={{ padding: '14px 16px', marginBottom: '14px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: '#e2e8f0', marginRight: 4 }}>등급</span>
            <Chip active={rarityFilter === 'all'} onClick={() => setRarityFilter('all')}>전체 {accessoryCatalog.length}</Chip>
            {Object.values(RARITY_META).map((r) => {
              const count = accessoryCatalog.filter((a) => a.rarity === r.id).length;
              return (
                <Chip key={r.id} active={rarityFilter === r.id} onClick={() => setRarityFilter(r.id)} color={r.color} border={r.border}>
                  {r.label} {count}
                </Chip>
              );
            })}
          </div>

          <div className="dex-acc-grid">
            {filteredAcc.map((acc) => {
              const r = RARITY_META[acc.rarity] || RARITY_META.advanced;
              return (
                <button key={acc.id} type="button" onClick={() => setSelectedAcc(acc)}
                  className="luxury-panel"
                  style={{
                    padding: 14, textAlign: 'left', cursor: 'pointer',
                    border: `1.5px solid ${r.border}`,
                    boxShadow: `0 0 18px ${r.glow}`,
                    display: 'flex', gap: 12, alignItems: 'center',
                    background: 'linear-gradient(155deg, rgba(255,255,255,0.06), rgba(0,0,0,0.35))',
                  }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: 14, flexShrink: 0,
                    background: r.bg, padding: 6,
                    boxShadow: `inset 0 0 0 1px ${r.border}`,
                  }}>
                    <SafeImg src={acc.iconUrl} alt={acc.displayName || acc.name} fallbackIcon="ring" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: r.color, marginBottom: 2 }}>{r.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', lineHeight: 1.3 }}>{acc.displayName || acc.name}</div>
                    <div style={{ fontSize: 13, color: '#f1f5f9', marginTop: 4, lineHeight: 1.5, fontWeight: 700, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {acc.effect}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredAcc.length === 0 && (
            <div style={{ color: '#64748b', fontWeight: 800, padding: '24px 8px' }}>해당 등급의 장신구가 없습니다.</div>
          )}
        </>
      )}

      {selectedAcc && (
        <ModalScrim style={{ zIndex: 3500, padding: 16 }} {...backdropDismissProps(() => setSelectedAcc(null))}>
          <div
            className="glass-modal"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ width: 'min(460px, 96vw)', padding: 24, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            {(() => {
              const r = RARITY_META[selectedAcc.rarity] || RARITY_META.advanced;
              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <div style={{ width: 84, height: 84, borderRadius: 16, background: r.bg, padding: 8, boxShadow: `0 0 20px ${r.glow}` }}>
                        <SafeImg src={selectedAcc.iconUrl} alt="" fallbackIcon="ring" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 900, color: r.color }}>{r.label} 장신구</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>{selectedAcc.displayName || selectedAcc.name}</div>
                      </div>
                    </div>
                    <button type="button" onClick={() => setSelectedAcc(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                      <Icon name="closeBtn" size={18} />
                    </button>
                  </div>
                  <div style={{
                    background: 'var(--glass-inset)',
                    backdropFilter: 'blur(14px)',
                    WebkitBackdropFilter: 'blur(14px)',
                    border: `1px solid ${r.border}`,
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 14,
                    lineHeight: 1.65,
                    color: '#f8fafc',
                    fontWeight: 700,
                  }}>
                    {selectedAcc.effect || selectedAcc.description}
                  </div>
                </>
              );
            })()}
          </div>
        </ModalScrim>
      )}

      {selectedSet && (
        <ModalScrim style={{ zIndex: 3500, padding: 16 }} {...backdropDismissProps(() => setSelectedSet(null))}>
          <div
            className="glass-modal"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ width: 'min(520px, 96vw)', padding: 24, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 16, background: '#07090e',
                  border: '1.5px solid rgba(255,255,255,0.18)', padding: 8, flexShrink: 0,
                }}>
                  <SafeImg src={selectedSet.iconUrl} alt={selectedSet.name} fallbackIcon="shield" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#fde68a' }}>장비 세트</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>{selectedSet.name}</div>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedSet(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <Icon name="closeBtn" size={18} />
              </button>
            </div>
            <div style={{
              background: 'var(--glass-inset)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 12,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              <div style={{ fontSize: 14, color: '#f8fafc', lineHeight: 1.55, fontWeight: 700 }}>{selectedSet.description}</div>
              <div style={{ fontSize: 13, color: '#7dd3fc', fontWeight: 800 }}>2세트 {selectedSet.set2}</div>
              <div style={{ fontSize: 13, color: '#fde68a', fontWeight: 800 }}>4세트 {selectedSet.set4}</div>
            </div>
          </div>
        </ModalScrim>
      )}
    </div>
  );
}

function FilterRow({ label, children }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 12, fontWeight: 900, color: '#e2e8f0', width: 36 }}>{label}</span>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children, color, border }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 11px', borderRadius: 999, cursor: 'pointer', fontWeight: 800, fontSize: 12,
      background: active ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.06)',
      border: `1px solid ${active ? 'transparent' : 'rgba(255,255,255,0.12)'}`,
      color: active ? '#161616' : 'rgba(255,255,255,0.82)',
    }}>
      {children}
    </button>
  );
}
