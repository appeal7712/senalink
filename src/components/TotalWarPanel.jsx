import { useState } from 'react';
import InGameDeckCard from './InGameDeckCard';
import StrategyActionBar from './StrategyActionBar';
import DeckLikeButton from './DeckLikeButton';
import { TOTALWAR_TIERS } from '../data/totalwarTiers';
import { PvpModeBadge } from './PvpModeToggle';
import { pets } from '../data/pets';

const resolvePet = (petId) => pets.find(p => p.id === petId) || pets[0];

export default function TotalWarPanel({
  totalwarBuilds,
  onCreate,
  onEdit,
  onDelete,
  resolveHeroByName,
  likeUserId,
  onToggleLike,
}) {
  const [activeTier, setActiveTier] = useState('legend');
  const tier = TOTALWAR_TIERS.find(t => t.id === activeTier) || TOTALWAR_TIERS[0];
  const builds = totalwarBuilds[activeTier] || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="luxury-panel totalwar-tier-grid" style={{ padding: '10px' }}>
        {TOTALWAR_TIERS.map(t => {
          const isActive = activeTier === t.id;
          return (
            <button
              key={t.id}
              type="button"
              className="totalwar-tier-btn"
              onClick={() => setActiveTier(t.id)}
              style={{
                border: isActive ? `2px solid ${t.color}` : '1px solid rgba(255,255,255,0.1)',
                background: isActive ? `${t.color}22` : 'rgba(255,255,255,0.04)',
                color: isActive ? '#fff' : 'var(--text-muted)',
                boxShadow: isActive ? `0 0 16px ${t.color}55` : 'none',
              }}
            >
              <span>{t.label}</span>
              <img className="totalwar-tier-icon" src={t.iconUrl} alt="" />
            </button>
          );
        })}
      </div>

      <StrategyActionBar
        icon="totalwar"
        title={`${tier.label} 등급 공략`}
        hint={`${tier.deckCount}팀 편성 · 펫 · 장비 · 스킬 예약`}
        actionLabel="공략 추가"
        onAction={() => onCreate?.(activeTier, tier.deckCount)}
      />

      {builds.length === 0 && (
        <div className="luxury-panel" style={{ padding: '40px', textAlign: 'center', color: '#fff', fontWeight: 700 }}>등록된 공략이 없습니다. 위 「공략 추가」로 등록해 보세요.</div>
      )}

      {builds.map(b => (
        <div key={b.id} className="luxury-panel totalwar-build-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="totalwar-build-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{b.title}</div>
              <div className="build-title-meta">{b.author} · {b.updatedAt}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <DeckLikeButton
                likedBy={b.likedBy}
                myId={likeUserId}
                onToggle={() => onToggleLike?.(b.id, activeTier)}
              />
              <button type="button" onClick={() => onEdit?.(b, activeTier, tier.deckCount)} className="btn-edit">수정</button>
              <button type="button" onClick={() => {
                if (!confirm('이 총력전 공략을 삭제할까요?')) return;
                onDelete?.(b.id, b.title, activeTier);
              }} className="btn-danger-solid">삭제</button>
            </div>
          </div>
          <div className="totalwar-deck-row">
            {(b.decks || []).map((d, i) => (
              <InGameDeckCard
                key={i}
                teamName={`${i + 1}팀`}
                formationId={d.formationId || 'protect'}
                heroList={(d.heroNames || []).map((name, idx) => {
                  const baseHero = resolveHeroByName?.(name);
                  return baseHero ? { hero: baseHero, gearConfig: (d.heroGearConfigs || [])[idx] } : name;
                })}
                contentMode="pvp"
                compact
                petObj={resolvePet(d.petId)}
                reservedSkills={d.reservedSkills}
                pvpMode={d.mode}
                headerSlot={<div style={{ display: 'flex', justifyContent: 'flex-end' }}><PvpModeBadge mode={d.mode} size="sm" /></div>}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
