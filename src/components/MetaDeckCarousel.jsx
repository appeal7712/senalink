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
        {deck.author?.ingameName ? (
          <span className="meta-deck-author">작성 · <b>{deck.author.ingameName}</b></span>
        ) : null}
      </div>
      <div className="meta-deck-visual">
        <InGameDeckCard
          embedded
          teamName=""
          overviewTitle={deck.title || ''}
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

const TWO_UP_QUERY = '(min-width: 700px)';
const THREE_UP_QUERY = '(min-width: 900px)';

const viewSlots = () => {
  if (typeof window === 'undefined') return 1;
  if (window.matchMedia(THREE_UP_QUERY).matches) return 3;
  return window.matchMedia(TWO_UP_QUERY).matches ? 2 : 1;
};

/** ≤1100 전용(가로 한 줄): 폰 1장 · 700~899 2장 · 900~1100 3장 나란히 + 글라스 < > 로 한 장씩 무한 루프 */
export default function MetaDeckCarousel({ decks = [] }) {
  const n = decks.length;
  const [active, setActive] = useState(0);
  const [slots, setSlots] = useState(viewSlots);

  useEffect(() => {
    setActive(0);
  }, [n]);

  useEffect(() => {
    const mqs = [window.matchMedia(TWO_UP_QUERY), window.matchMedia(THREE_UP_QUERY)];
    const sync = () => setSlots(viewSlots());
    mqs.forEach((mq) => mq.addEventListener('change', sync));
    return () => mqs.forEach((mq) => mq.removeEventListener('change', sync));
  }, []);

  const wrap = useCallback((i) => {
    if (n <= 0) return 0;
    return ((i % n) + n) % n;
  }, [n]);

  const perView = Math.max(1, Math.min(slots, n));
  const canMove = n > perView;

  const go = useCallback((dir) => {
    if (!canMove) return;
    setActive((i) => wrap(i + dir));
  }, [canMove, wrap]);

  if (n === 0) return null;

  const shown = Array.from({ length: perView }, (_, k) => decks[wrap(active + k)]);

  return (
    <div className="meta-deck-carousel">
      <div className="meta-deck-carousel-frame">
        {canMove && (
          <button
            type="button"
            className="meta-deck-nav glass-inset"
            aria-label="이전 메타 덱"
            onClick={() => go(-1)}
          >
            <Icon name="chevronLeft" size={20} color="#fff" />
          </button>
        )}

        <div className={`meta-deck-carousel-main${perView === 2 ? ' is-two' : ''}${perView === 3 ? ' is-three' : ''}`} key={`${active}-${perView}`}>
          {shown.map((d, k) => <MetaDeckCard key={d.id || k} deck={d} />)}
        </div>

        {canMove && (
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

      {canMove && (
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
