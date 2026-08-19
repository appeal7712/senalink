import { lazy, Suspense, useState } from 'react';
const HeroDB = lazy(() => import('./HeroDB'));
const EquipDB = lazy(() => import('./EquipDB'));
const SystemDB = lazy(() => import('./SystemDB'));
import { pets } from '../data/pets';
import Icon from './icons/Icon';
import { backdropDismissProps } from '../utils/backdropDismiss';
import ModalScrim from './ModalScrim';

const HUB_TABS = [
  { id: 'hero', icon: 'user', label: '영웅 도감', desc: '역할 · 세력 · 스킬', accent: '#ece8e0' },
  { id: 'pet', icon: 'paw', label: '펫 도감', desc: '스페셜 펫 스킬', accent: '#d4c4a8' },
  { id: 'equip', icon: 'shield', label: '장비 / 장신구', desc: '세트 · 실전 장비 · 반지', accent: '#8eb8c4' },
  { id: 'system', icon: 'flask', label: '시스템', desc: '전투 규칙 · 잠재능력', accent: '#9a9388' },
];

export default function DbHub() {
  const [subTab, setSubTab] = useState('hero');
  const [petSearch, setPetSearch] = useState('');
  const [selectedPet, setSelectedPet] = useState(null);

  const filteredPets = pets.filter((p) => !petSearch || p.name.includes(petSearch));

  return (
    <div className="fade-in">
      <div className="container" style={{ paddingTop: 22, paddingBottom: 8 }}>
        <div className="dex-hub-tabs">
          {HUB_TABS.map((tab) => {
            const on = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={`nav-tab-btn dex-hub-tab${on ? ' active' : ''}`}
                style={{
                  padding: '16px 18px',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 6,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: on ? 'rgba(255,255,255,0.86)' : 'rgba(16,18,24,0.28)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: 22,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="dex-hub-tab-icon" style={{
                    width: 32, height: 32, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: on ? 'rgba(22,22,24,0.08)' : 'rgba(255,255,255,0.08)',
                  }}>
                    <Icon name={tab.icon} size={15} color={on ? '#161616' : 'rgba(255,255,255,0.85)'} />
                  </span>
                  <span className="dex-hub-tab-label" style={{ fontSize: 16, fontWeight: 700 }}>{tab.label}</span>
                </span>
                <span className="dex-hub-tab-desc" style={{ fontSize: 12, fontWeight: 500, opacity: 0.72, paddingLeft: 42 }}>{tab.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {subTab === 'hero' && <Suspense fallback={null}><HeroDB /></Suspense>}

      {subTab === 'pet' && (
        <div className="container fade-in" style={{ paddingBottom: 60 }}>
          <div className="luxury-panel" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--gold-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="paw" size={17} /> 펫 도감
              <span style={{ fontSize: 13, color: '#e2e8f0' }}>{pets.length}종</span>
            </div>
            <input
              type="text"
              placeholder="펫 이름 검색"
              value={petSearch}
              onChange={(e) => setPetSearch(e.target.value)}
              style={{
                padding: '8px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)',
                color: '#fff', borderRadius: 999, fontSize: 13, width: 220,
              }}
            />
          </div>

          <div className="dex-pet-grid">
            {filteredPets.map((p) => (
              <div key={p.id} onClick={() => setSelectedPet(p)}
                className="luxury-panel dex-pet-card" style={{
                  padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  cursor: 'pointer', border: '1px solid var(--border-gold)',
                }}>
                <div style={{
                  position: 'relative', width: 84, height: 94, borderRadius: 14,
                  background: 'linear-gradient(180deg, #facc15 0%, #ca8a04 100%)',
                  border: '2px solid #fde047', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                  marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {p.portraitUrl ? (
                    <img src={p.portraitUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Icon name="paw" size={32} color="#1a1204" />
                  )}
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 11, background: 'rgba(236,232,224,0.2)', color: 'var(--gold-light)', padding: '2px 8px', borderRadius: 6, fontWeight: 800, marginBottom: 12 }}>
                  스페셜 펫
                </div>
                <div style={{ width: '100%', background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.12)' }}>
                  {p.skills && p.skills.map((s, sIdx) => (
                    <div key={sIdx}>
                      <div style={{ fontSize: 13, fontWeight: 900, color: '#7dd3fc', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Icon name="sparkle" size={12} /> {s.name}
                      </div>
                      {s.effects && s.effects.map((eff, eIdx) => (
                        <div key={eIdx} style={{ fontSize: 13, color: '#f8fafc', fontWeight: 700, lineHeight: 1.5 }}>
                          <span style={{ color: 'var(--gold-primary)', fontWeight: 800 }}>[{eff.target}]</span>{' '}
                          {eff.details.join(', ')}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {selectedPet && (
            <ModalScrim style={{ zIndex: 3500, padding: 16 }} {...backdropDismissProps(() => setSelectedPet(null))}>
              <div
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="glass-modal"
                style={{ width: 'min(480px, 96vw)', padding: 28, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.14)', paddingBottom: 12 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                    <Icon name="paw" size={18} /> {selectedPet.name}
                  </h3>
                  <button type="button" onClick={() => setSelectedPet(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><Icon name="close" size={20} /></button>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{
                    width: 80, height: 90, borderRadius: 12, overflow: 'hidden',
                    border: '2px solid #fde047', background: 'linear-gradient(180deg, #facc15 0%, #ca8a04 100%)', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selectedPet.portraitUrl ? <img src={selectedPet.portraitUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="paw" size={28} color="#1a1204" />}
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>{selectedPet.name}</div>
                    <div style={{ fontSize: 13, color: '#fde68a', fontWeight: 800, marginTop: 2 }}>세븐나이츠 공식 펫</div>
                  </div>
                </div>
                <div style={{
                  background: 'var(--glass-inset)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 12,
                  padding: 16,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#7dd3fc', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="book" size={13} /> 스킬 툴팁
                  </div>
                  {selectedPet.tooltips && Object.keys(selectedPet.tooltips).length > 0 ? (
                    Object.entries(selectedPet.tooltips).map(([key, val], idx) => (
                      <div key={idx} style={{ marginBottom: 6, fontSize: 13, color: '#f8fafc', lineHeight: 1.65, fontWeight: 700 }}>
                        <strong style={{ color: '#fde68a' }}>• {key}:</strong> {val}
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: 13, color: '#f1f5f9' }}>상세 툴팁이 없습니다.</div>
                  )}
                </div>
              </div>
            </ModalScrim>
          )}
        </div>
      )}

      {subTab === 'equip' && <Suspense fallback={null}><EquipDB /></Suspense>}

      {subTab === 'system' && (
        <div className="container fade-in" style={{ paddingBottom: 60 }}>
          <Suspense fallback={null}><SystemDB /></Suspense>
        </div>
      )}
    </div>
  );
}
