import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../components/icons/Icon';
import HeroEffectSummary from '../../components/HeroEffectSummary';
import { heroSummary, fmtValue } from '../../lib/teamBuilderAnalysis';
import { FinderTile, MiniHero } from './TeamBuilderParts';

const GROUPS = [
  { id: 'ally', label: '팀 버프', sub: '상시 · 시작 턴' },
  { id: 'enemy', label: '적 디버프', sub: '상시 · 시작 턴' },
  { id: 'role', label: '역할', sub: '스킬 전체' },
];
const MAX_COMPARE = 3;
const plainName = (n) => String(n || '').replace('(각성)', '').trim();

function skillCellsOf(s, side, key) {
  return s.skillFx.filter((f) => f.side === side && f.key === key);
}

function CompareTable({ names, resolveHero, rareSet, withSkill, onRemove }) {
  const sums = useMemo(() => names.map((n) => ({ name: n, s: heroSummary(resolveHero(n), { rareSet }) })), [names, resolveHero, rareSet]);
  const rows = useMemo(() => {
    const map = new Map();
    for (const { s } of sums) {
      for (const [side, list] of [['ally', s.buffs], ['enemy', s.debuffs]]) {
        for (const fx of list) {
          if (!map.has(fx.id)) map.set(fx.id, { id: fx.id, side, label: fx.label, dir: fx.dir, timing: fx.timing });
        }
      }
      if (withSkill) {
        for (const fx of s.skillFx) {
          const id = `${fx.side}|${fx.key}|skill`;
          if (!map.has(id)) map.set(id, { id, side: fx.side, key: fx.key, label: fx.label, dir: fx.dir, timing: 'skill' });
        }
      }
    }
    return [...map.values()].sort((a, b) => (a.side === b.side ? 0 : a.side === 'ally' ? -1 : 1));
  }, [sums, withSkill]);
  const roleRows = useMemo(() => {
    const map = new Map();
    for (const { s } of sums) for (const r of s.roles) if (!map.has(r.id)) map.set(r.id, r.label);
    return [...map.entries()];
  }, [sums]);

  return (
    <div className="tb-cmp" style={{ '--cols': names.length }}>
      <div className="tb-cmp-head">
        <span className="tb-cmp-corner">효과</span>
        {names.map((n) => (
          <span key={n} className="tb-cmp-hero">
            <MiniHero hero={resolveHero(n)} size={34} />
            <b>{n}</b>
            <button type="button" onClick={() => onRemove(n)} aria-label={`${n} 비교에서 빼기`}>✕</button>
          </span>
        ))}
      </div>
      {rows.map((r) => (
        <div key={r.id} className={`tb-cmp-row is-${r.side}`}>
          <span className="tb-cmp-label">
            <i>{r.dir === 'up' ? '▲' : r.dir === 'down' ? '▼' : '◆'}</i>
            {r.label}
            {r.timing === 'start' ? <small>시작 턴</small> : null}
            {r.timing === 'skill' ? <small className="is-skill">스킬</small> : null}
          </span>
          {sums.map(({ name, s }) => {
            if (r.timing === 'skill') {
              const list = skillCellsOf(s, r.side, r.key);
              return (
                <span key={name} className={`tb-cmp-cell${list.length ? ' is-on' : ''}`}>
                  {list.length ? list.map((f) => `${f.skillLabel}${f.turns ? ` ${f.turns}턴` : ''}${f.value != null ? ` ${fmtValue(f.value, f.dir)}` : ''}`).join(' · ') : '·'}
                </span>
              );
            }
            const fx = [...s.buffs, ...s.debuffs].find((x) => x.id === r.id);
            return (
              <span key={name} className={`tb-cmp-cell${fx ? ' is-on' : ''}`}>
                {fx ? (fx.value != null ? fmtValue(fx.value, fx.dir) : '✓') : '·'}
                {fx?.timing === 'start' ? <small>{fx.turns}턴</small> : null}
              </span>
            );
          })}
        </div>
      ))}
      {roleRows.map(([id, label]) => (
        <div key={id} className="tb-cmp-row is-role">
          <span className="tb-cmp-label"><i>✓</i>{label}</span>
          {sums.map(({ name, s }) => {
            const r = s.roles.find((x) => x.id === id);
            return <span key={name} className={`tb-cmp-cell${r ? ' is-on' : ''}`}>{r ? r.skills.join(' · ') : '·'}</span>;
          })}
        </div>
      ))}
    </div>
  );
}

/** 팀 빌더 「효과 사전」 — 효과 여러 개로 영웅 찾기 · 효과 요약 · 비교 · 내 덱에 넣기 */
export default function EffectDictionary({ heroes, index, rareSet, resolveHero, decks, onAddToDeck }) {
  const [group, setGroup] = useState('ally');
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState('');
  const [compare, setCompare] = useState([]);
  const [notice, setNotice] = useState('');
  const [withSkill, setWithSkill] = useState(false);
  const detailRef = useRef(null);
  const ix = withSkill ? index.withSkill : index;

  const labelOf = useMemo(() => {
    const m = new Map();
    for (const g of GROUPS) for (const c of ix.groups[g.id] || []) m.set(c.id, c.label);
    return m;
  }, [ix]);

  const matched = useMemo(() => {
    const q = query.trim();
    return heroes.filter((h) => {
      const name = plainName(h.name);
      if (q && !name.includes(q)) return false;
      const m = ix.byHero.get(name);
      return selected.every((id) => m?.has(id));
    });
  }, [heroes, ix, selected, query]);

  const liveCount = useMemo(() => {
    const counts = new Map();
    for (const h of matched) {
      ix.byHero.get(plainName(h.name))?.forEach((_, id) => counts.set(id, (counts.get(id) || 0) + 1));
    }
    return counts;
  }, [matched, ix]);

  const toggleSkill = () => {
    const next = !withSkill;
    if (!next) {
      const base = new Set(GROUPS.flatMap((g) => (index.groups[g.id] || []).map((c) => c.id)));
      setSelected((prev) => prev.filter((id) => base.has(id)));
    }
    setWithSkill(next);
  };

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 2600);
    return () => clearTimeout(t);
  }, [notice]);

  const toggleChip = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const openHero = (name) => {
    setFocus(name);
    if (window.matchMedia('(max-width: 1000px)').matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };
  const toggleCompare = (name) => {
    if (compare.includes(name)) setCompare(compare.filter((n) => n !== name));
    else if (compare.length >= MAX_COMPARE) setNotice(`비교는 최대 ${MAX_COMPARE}명까지예요.`);
    else setCompare([...compare, name]);
  };
  const addToDeck = (mode, name) => setNotice(onAddToDeck(mode, name));

  const chips = ix.groups[group] || [];
  const focusHero = focus ? resolveHero(focus) : null;
  const inDeck = (mode, name) => (decks[mode]?.mine || []).includes(name);

  return (
    <div className="tb-dict">
      <section className="luxury-panel tb-dict-filter">
        <div className="tb-dict-filter-head">
          <strong><Icon name="search" size={14} /> 효과로 영웅 찾기</strong>
          <span>여러 개를 고르면 <b>모두 가진</b> 영웅만 남아요 · 타일 숫자 = 지금 결과에서 그 효과를 가진 영웅 수</span>
        </div>
        <div className="tb-dict-filter-bar">
          <div className="tb-finder-groups" role="tablist">
            {GROUPS.map((g) => (
              <button key={g.id} type="button" role="tab" aria-selected={group === g.id} className={group === g.id ? 'is-on' : ''} onClick={() => setGroup(g.id)}>
                {g.label} <small>{g.sub}</small>
              </button>
            ))}
          </div>
          <button type="button" className={`tb-skill-toggle${withSkill ? ' is-on' : ''}`} aria-pressed={withSkill} onClick={toggleSkill} title="액티브 · 각성기 · 기본 공격으로 거는 버프 · 디버프도 찾기에 넣어요">
            <i aria-hidden="true" /> 스킬 효과 포함
          </button>
          <label className="tb-dict-search">
            <Icon name="search" size={13} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="영웅 이름" />
          </label>
        </div>
        <div className="tb-ftiles">
          {chips.map((c) => {
            const n = liveCount.get(c.id) || 0;
            return (
              <FinderTile
                key={c.id}
                chip={{ ...c, count: n }}
                group={group}
                on={selected.includes(c.id)}
                have={false}
                dim={!n && !selected.includes(c.id)}
                onClick={() => toggleChip(c.id)}
              />
            );
          })}
        </div>
        {selected.length ? (
          <div className="tb-dict-selected">
            {selected.map((id) => (
              <button key={id} type="button" className={`tb-dict-pill is-${id.split('|')[0]}`} onClick={() => toggleChip(id)}>
                {labelOf.get(id)} ✕
              </button>
            ))}
            <button type="button" className="tb-link-btn" onClick={() => setSelected([])}>전부 지우기</button>
          </div>
        ) : null}
      </section>

      {compare.length ? (
        <section className="luxury-panel tb-dict-compare">
          <div className="tb-dict-sec-head">
            <strong>영웅 비교</strong>
            <span>{compare.length}/{MAX_COMPARE}명 · 패시브 효과와 역할을 나란히 봐요</span>
            <button type="button" className="tb-link-btn" onClick={() => setCompare([])}>비우기</button>
          </div>
          <CompareTable names={compare} resolveHero={resolveHero} rareSet={rareSet} withSkill={withSkill} onRemove={(n) => setCompare((p) => p.filter((x) => x !== n))} />
        </section>
      ) : null}

      <div className="tb-dict-body">
        <section className="luxury-panel tb-dict-results">
          <div className="tb-dict-sec-head">
            <strong>{matched.length}명</strong>
            <span>{selected.length ? '고른 효과를 모두 가진 영웅' : '전체 영웅 — 효과를 골라 좁혀 보세요'}</span>
          </div>
          {matched.length ? (
            <div className="tb-dict-grid">
              {matched.map((h, i) => {
                const name = plainName(h.name);
                const m = ix.byHero.get(name);
                return (
                  <article key={h.id} className={`tb-dict-hero${focus === name ? ' is-focus' : ''}`} style={{ '--i': Math.min(i, 20) }}>
                    <button type="button" className="tb-dict-hero-main" onClick={() => openHero(name)}>
                      <MiniHero hero={h} size={52} />
                      <span className="tb-dict-hero-text">
                        <b>{name}</b>
                        {selected.length ? (
                          <span className="tb-dict-hero-badges">
                            {selected.map((id) => <i key={id}>{labelOf.get(id)} <em>{m?.get(id)}</em></i>)}
                          </span>
                        ) : <small>효과 요약 보기</small>}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`tb-dict-cmp-btn${compare.includes(name) ? ' is-on' : ''}`}
                      onClick={() => toggleCompare(name)}
                      title={compare.includes(name) ? '비교에서 빼기' : '비교에 추가'}
                    >
                      {compare.includes(name) ? '비교 중' : '+ 비교'}
                    </button>
                  </article>
                );
              })}
            </div>
          ) : <div className="tb-empty">고른 효과를 모두 가진 영웅이 없어요. 효과를 하나 빼 보세요.</div>}
        </section>

        <aside ref={detailRef} className={`luxury-panel tb-dict-detail${focusHero ? ' has-hero' : ''}`}>
          {focusHero ? (
            <>
              <div className="tb-dict-detail-head">
                <MiniHero hero={focusHero} size={56} />
                <div>
                  <span className="tb-dict-detail-group">{focusHero.group}</span>
                  <h3 className={focusHero.isAwakened ? 'is-awakened' : ''}>{focus}</h3>
                </div>
                <button type="button" className="tb-picker-close" onClick={() => setFocus('')} aria-label="닫기"><Icon name="close" size={14} /></button>
              </div>
              <div className="tb-dict-actions">
                {[['arena', '결투장'], ['guildwar', '길드전'], ['pve', 'PvE']].map(([mode, label]) => (
                  <button key={mode} type="button" className="tb-dict-add" disabled={inDeck(mode, focus)} onClick={() => addToDeck(mode, focus)}>
                    {inDeck(mode, focus) ? `${label} 덱에 있음` : `+ ${label} 덱에 넣기`}
                  </button>
                ))}
                <button type="button" className={`tb-dict-cmp-btn${compare.includes(focus) ? ' is-on' : ''}`} onClick={() => toggleCompare(focus)}>
                  {compare.includes(focus) ? '비교 중' : '+ 비교'}
                </button>
              </div>
              <HeroEffectSummary hero={focusHero} />
            </>
          ) : (
            <div className="tb-dict-detail-empty">
              <Icon name="hero" size={26} />
              <strong>영웅을 누르면 효과 요약이 떠요</strong>
              <span>팀에 주는 버프 · 적 디버프 · 역할 · 전설 장신구 · 편성 조건을 한눈에 봐요.</span>
            </div>
          )}
        </aside>
      </div>

      {notice ? <div className="tb-dict-notice" role="status">{notice}</div> : null}
    </div>
  );
}
