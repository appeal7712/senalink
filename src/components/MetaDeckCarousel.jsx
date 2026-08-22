import { useCallback, useEffect, useState } from 'react';
import InGameDeckCard from './InGameDeckCard';
import Icon from './icons/Icon';
import { metaDeckKindTheme } from './ArenaDeckKind';
import { heroes } from '../data/heroes';
import { pets } from '../data/pets';

const resolveHeroByName = (name) => {
  if (!name) return null;
  const clean = String(name).replace('(각성)', '').trim();
  return heroes.find((h) => h.name === name)
    || heroes.find((h) => h.name.replace('(각성)', '').trim() === clean)
    || null;
};

const resolvePetById = (petId) => pets.find((p) => p.id === petId) || pets[0];

export function MetaDeckCard({ deck }) {
  const kind = metaDeckKindTheme(deck.kind);
  return (
    <div className="meta-deck-item">
      <div className="meta-deck-copy">
        <div className="meta-deck-tags">
          <span
            className="kind-pill kind-pill--sm"
            style={{ background: kind.pill, color: kind.id === 'hybrid' ? '#161616' : undefined }}
          >
            {kind.label}
          </span>
          <span style={{ background: 'var(--gold-primary)', color: '#000', fontSize: '10px', fontWeight: 900, padding: '2px 6px', borderRadius: '4px' }}>{deck.tier}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--gold-light)', fontWeight: 800 }}>
            <Icon name="chart" size={12} /> 픽률 {deck.usageRate}
          </span>
        </div>
        <h4 className="meta-deck-title">{deck.title}</h4>
      </div>
      <div className="meta-deck-visual">
        <InGameDeckCard
          embedded
          teamName=""
          formationId={deck.formationId}
          petObj={resolvePetById(deck.petId)}
          heroList={(deck.heroNames || []).map((name, idx) => {
            const baseHero = resolveHeroByName(name);
            return baseHero ? { hero: baseHero, gearConfig: (deck.heroGearConfigs || [])[idx] } : name;
          })}
          contentMode={(deck.speedOrderNames && deck.speedOrderNames.length) ? 'pve' : 'pvp'}
          reservedSkills={deck.reservedSkills || deck.skillSequence || []}
          speedOrderNames={deck.speedOrderNames}
          speedIgnoredNames={deck.speedIgnoredNames}
          pvpMode={deck.mode}
        />
      </div>
    </div>
  );
}

/** 모바일 전용: 덱 1장만 + 글라스 < > 로 무한 루프 */
export default function MetaDeckCarousel({ decks = [] }) {
  const n = decks.length;
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [n]);

  const wrap = useCallback((i) => {
    if (n <= 0) return 0;
    return ((i % n) + n) % n;
  }, [n]);

  const go = useCallback((dir) => {
    if (n <= 1) return;
    setActive((i) => wrap(i + dir));
  }, [n, wrap]);

  if (n === 0) return null;

  const deck = decks[wrap(active)];

  return (
    <div className="meta-deck-carousel">
      <div className="meta-deck-carousel-frame">
        {n > 1 && (
          <button
            type="button"
            className="meta-deck-nav glass-inset"
            aria-label="이전 메타 덱"
            onClick={() => go(-1)}
          >
            <Icon name="chevronLeft" size={20} color="#fff" />
          </button>
        )}

        <div className="meta-deck-carousel-main" key={deck.id || active}>
          <MetaDeckCard deck={deck} />
        </div>

        {n > 1 && (
          <button
            type="button"
            className="meta-deck-nav glass-inset"
            aria-label="다음 메타 덱"
            onClick={() => go(1)}
          >
            <Icon name="chevronRight" size={20} color="#fff" />
          </button>
        )}
      </div>

      {n > 1 && (
        <div className="meta-deck-carousel-dots" aria-hidden>
          {decks.map((d, i) => (
            <button
              key={d.id || i}
              type="button"
              className={`meta-deck-carousel-dot${i === active ? ' is-on' : ''}`}
              aria-label={`${i + 1}번 덱`}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
