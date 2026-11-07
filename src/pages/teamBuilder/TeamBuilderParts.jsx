import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import HeroPortraitCard from '../../components/HeroPortraitCard';
import HeroGridPicker from '../../components/HeroGridPicker';
import Icon from '../../components/icons/Icon';
import { accessories } from '../../data/equipments';
import { LEGEND_RINGS, ROLE_TILES, effectLabel, entryValue, fmtFxValue, fmtValue, listLabel, targetLabel } from '../../lib/teamBuilderAnalysis';
import { fxBoxCount, groupEffectCards, groupSkillCards } from './fxGroups';

const plainName = (n) => String(n || '').replace('(각성)', '').trim();

/* ───────────── 공통 ───────────── */

export function MiniHero({ hero, size = 30 }) {
  if (!hero) return null;
  return (
    <span className="tb-mini-hero" style={{ width: size }}>
      <HeroPortraitCard hero={hero} showStars={false} showRole={false} />
    </span>
  );
}

/* ───────────── 모드 선택 ───────────── */

export function ModePicker({ onPick }) {
  const modes = [
    { id: 'arena', icon: 'tbArena', iconSize: 70, title: '결투장', vs: '5 vs 5', desc: '5인 덱 버프 · 디버프 · 세팅 체크' },
    { id: 'guildwar', icon: 'tbGuildwar', iconSize: 76, title: '길드전', vs: '3 vs 3', desc: '3인 덱 · 상대가 노리는 대상까지' },
    { id: 'pve', icon: 'tbPve', iconSize: 76, title: 'PvE', vs: '5인 · 아군만', desc: '보스 · 탑 덱 · 아군 버프 · 보스 디버프' },
    { id: 'effects', icon: 'tbEffects', iconSize: 76, title: '효과 사전', vs: '영웅 찾기', desc: '효과로 영웅 찾기 · 비교 · 덱에 넣기' },
  ];
  return (
    <div className="tb-mode-grid">
      {modes.map((m, i) => (
        <button key={m.id} type="button" className={`tb-mode-card luxury-panel is-${m.id}`} style={{ '--i': i }} onClick={() => onPick(m.id)} aria-label={`${m.title} ${m.vs} — ${m.desc}`}>
          <span className="tb-mode-art" aria-hidden="true">
            <span className="tb-mode-art-in"><Icon name={m.icon} size={m.iconSize} /></span>
          </span>
          <span className="tb-mode-label" aria-hidden="true">{m.title}</span>
          <span className="tb-mode-text" aria-hidden="true">
            <span className="tb-mode-title">{m.title}</span>
            <span className="tb-mode-vs">{m.vs}</span>
            <span className="tb-mode-desc">{m.desc}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/* ───────────── 상단 덱 바 ───────────── */

function DeckSide({ side, size, names, resolveHero, active, onSelect, onRemove, onClear }) {
  const filled = names.filter(Boolean).length;
  const isMine = side === 'mine';
  return (
    <div className={`tb-deck-side is-${side}`}>
      <div className="tb-deck-side-head">
        <span className="tb-side-title">
          <Icon name={isMine ? 'deckAlly' : 'deckEnemy'} size={15} />
          {isMine ? '내 덱' : '상대 덱'}
        </span>
        <span className="tb-deck-count">{filled}/{size}</span>
        {filled ? (
          <button type="button" className="tb-deck-clear" onClick={onClear} aria-label={`${isMine ? '내 덱' : '상대 덱'} 비우기`}>
            <Icon name="close" size={10} /> 비우기
          </button>
        ) : null}
      </div>
      <div className="tb-slots" style={{ '--slots': size }}>
        {Array.from({ length: size }, (_, i) => {
          const name = names[i] || '';
          const hero = name ? resolveHero(name) : null;
          const isActive = active?.side === side && active.idx === i;
          return (
            <div key={i} className="tb-slot-wrap">
              <button
                type="button"
                className={`tb-slot${isActive ? ' is-active' : ''}${hero ? ' is-filled' : ''}`}
                onClick={() => onSelect(side, i)}
                aria-label={hero ? `${i + 1}번 칸 ${name}` : `${i + 1}번 칸에 영웅 넣기`}
                aria-expanded={isActive}
              >
                {hero ? (
                  <span key={name} className="tb-slot-hero">
                    <HeroPortraitCard hero={hero} showStars showRole />
                  </span>
                ) : (
                  <span className="tb-slot-empty"><Icon name="plus" size={16} /></span>
                )}
              </button>
              <span className="tb-slot-name">{hero ? name : `${i + 1}번`}</span>
              {hero ? (
                <button type="button" className="tb-slot-remove" onClick={() => onRemove(side, i)} aria-label={`${name} 빼기`}>✕</button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DeckBar({ size, deck, enemyOn, allowEnemy = true, resolveHero, active, onSelect, onRemove, onClear, onToggleEnemy }) {
  if (!allowEnemy) {
    return (
      <div className="tb-deck-bar is-solo">
        <DeckSide side="mine" size={size} names={deck.mine} resolveHero={resolveHero} active={active} onSelect={onSelect} onRemove={onRemove} onClear={() => onClear('mine')} />
      </div>
    );
  }
  return (
    <div className={`tb-deck-bar${enemyOn ? ' has-enemy' : ''}`}>
      <DeckSide side="mine" size={size} names={deck.mine} resolveHero={resolveHero} active={active} onSelect={onSelect} onRemove={onRemove} onClear={() => onClear('mine')} />
      {enemyOn ? (
        <>
          <div className="tb-vs" aria-hidden="true"><Icon name="tbVs" size={44} /></div>
          <DeckSide side="enemy" size={size} names={deck.enemy} resolveHero={resolveHero} active={active} onSelect={onSelect} onRemove={onRemove} onClear={() => onClear('enemy')} />
        </>
      ) : (
        <button type="button" className="tb-enemy-add" onClick={onToggleEnemy}>
          <Icon name="deckEnemy" size={18} />
          <strong>상대 덱 추가</strong>
          <span>상대가 우리 누구를 노리는지, 무엇을 조심할지 알려줘요</span>
        </button>
      )}
    </div>
  );
}

/* ───────────── 영웅 선택 드롭다운 (필요한 효과로 찾기 · 이 영웅 효과) ───────────── */

const FINDER_GROUPS = [
  { id: 'ally', label: '팀 버프', sub: '상시 · 시작 턴' },
  { id: 'enemy', label: '적 디버프', sub: '상시 · 시작 턴' },
  { id: 'role', label: '역할', sub: '스킬 전체' },
];
const ROLE_HINT = new Map(ROLE_TILES.map((t) => [`role|${t.id}`, t.hint]));

/** 스킬별로 묶고, 같은 효과 · 턴 · 대상 · 수치 줄은 하나로 합쳐 조건만 이어 붙인다 */
function groupHeroEffects(entries, includeEnhance) {
  const map = new Map();
  for (const e of entries) {
    if (e.kind !== 'effect') continue;
    if (!map.has(e.skillLabel)) map.set(e.skillLabel, new Map());
    const rows = map.get(e.skillLabel);
    const k = [e.name, e.duration?.label || '', e.target, entryValue(e, includeEnhance) ?? ''].join('|');
    if (!rows.has(k)) rows.set(k, { ...e, conds: [], plain: false, sources: new Set() });
    const row = rows.get(k);
    row.sources.add(e.source);
    if (e.condition) {
      if (!row.conds.includes(e.condition)) row.conds.push(e.condition);
    } else row.plain = true;
  }
  return [...map.entries()].map(([label, rows]) => [label, [...rows.values()].map((r) => ({
    ...r,
    source: r.sources.has('base') ? 'base' : [...r.sources][0],
    condition: [r.plain && r.conds.length ? (r.skillType === 'passive' ? '전투 시작' : '스킬 사용 시') : '', ...r.conds].filter(Boolean).join(' · ') || null,
  }))]);
}

function HeroEffects({ hero, groups, includeEnhance }) {
  if (!groups.length) return <div className="tb-empty">정리할 효과가 없어요.</div>;
  const skillOf = (name) => (hero?.skills || []).find((s) => s.name === name);
  return (
    <div className="tb-hero-fx">
      {groups.map(([label, list]) => (
        <div key={label} className="tb-hero-fx-col">
          <h6>
            {skillOf(list[0]?.skillName)?.iconUrl ? (
              <img className="tb-hero-fx-icon" src={skillOf(list[0].skillName).iconUrl} alt="" loading="lazy" />
            ) : null}
            <span className="tb-hero-fx-head">
              <b>{label}</b>
              <small>{list[0]?.skillName}</small>
            </span>
            <i className="tb-hero-fx-count">{list.length}</i>
          </h6>
          <ul>
            {list.map((e) => {
              const v = entryValue(e, includeEnhance);
              return (
                <li key={e.id} className={`is-${e.side}`}>
                  <span className="tb-hero-fx-mark" aria-hidden="true">{{ up: '▲', down: '▼' }[effectLabel(e.name).dir] || '◆'}</span>
                  <span className="tb-hero-fx-main">
                    <span className="tb-hero-fx-name">{e.name}</span>
                    {e.duration ? <span className={`tb-badge ${e.duration.type === 'permanent' ? 'is-perm' : 'is-turn'}`}>{e.duration.label}</span> : null}
                    {v != null ? <span className="tb-badge is-val">{v}%</span> : null}
                    {e.source !== 'base' ? <span className="tb-badge is-src">{e.source}</span> : null}
                    {e.tower ? <span className="tb-badge is-tower">탑 전용</span> : null}
                  </span>
                  <em className="tb-hero-fx-to" title={targetLabel(e.target)}>{targetLabel(e.target)}</em>
                  {e.condition ? <small>{e.condition}</small> : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * 덱 영웅 한 명의 스킬별 효과 요약 — 덱 칸과 분석 사이 칸.
 * 상대 덱이 있으면 버튼을 내 덱 | 상대 덱 반반으로 나누고, 고른 영웅을 한 번 더 누르면 접힌다(영웅 선택 창과 같은 동작).
 */
export function HeroFxPanel({ deck, size = 5, enemyOn, resolveHero, heroEntriesFor, focus, open, onFocus, onToggle, includeEnhance = true }) {
  const mine = deck.mine.filter(Boolean).map((name) => ({ side: 'mine', name }));
  const enemy = enemyOn ? deck.enemy.filter(Boolean).map((name) => ({ side: 'enemy', name })) : [];
  const list = [...mine, ...enemy];
  const cur = list.find((x) => x.side === focus?.side && x.name === focus?.name) || list[0] || null;
  const curName = cur?.name || '';
  const hero = curName ? resolveHero(curName) : null;
  const groups = curName && open ? groupHeroEffects(heroEntriesFor(curName), includeEnhance) : [];
  const count = groups.reduce((n, [, rows]) => n + rows.length, 0);
  if (!cur) return null;
  const isCur = (x) => x.side === cur.side && x.name === cur.name;
  const press = (x) => (isCur(x) ? onToggle() : onFocus({ side: x.side, name: x.name }));
  const chips = (items) => items.map((x) => (
    <button
      key={`${x.side}-${x.name}`}
      type="button"
      aria-pressed={open && isCur(x)}
      className={`tb-herofx-chip is-${x.side}${open && isCur(x) ? ' is-on' : ''}`}
      onClick={() => press(x)}
      title={open && isCur(x) ? '한 번 더 누르면 접혀요' : `${x.name} 효과 요약 보기`}
    >
      <MiniHero hero={resolveHero(x.name)} size={32} />
      <span title={x.name}>{x.name}</span>
    </button>
  ));
  return (
    <section className={`luxury-panel tb-herofx-panel${open ? ' is-open' : ''}`}>
      <div className="tb-herofx-head">
        <h3>
          <Icon name="dexEffectSummary" size={15} />
          {open ? <><b>{cur.name}</b> 효과 요약 <i className="tb-herofx-count">{count}</i></> : '영웅 효과 요약'}
        </h3>
        <span className="tb-herofx-sub">{open ? '스킬별 버프 · 디버프 · 조건 (스킬 강화 · 초월 기준)' : '영웅을 누르면 스킬별 효과가 펼쳐져요'}</span>
      </div>
      <div className={`tb-herofx-sides${enemy.length ? ' is-split' : ''}`} style={{ '--n': size }}>
        <div className="tb-herofx-side is-mine">
          {enemy.length ? <span className="tb-herofx-side-label is-mine"><Icon name="deckAlly" size={13} /> 내 덱</span> : null}
          <div className="tb-herofx-chips">{chips(mine)}</div>
        </div>
        {enemy.length ? (
          <div className="tb-herofx-side is-enemy">
            <span className="tb-herofx-side-label is-enemy"><Icon name="deckEnemy" size={13} /> 상대 덱</span>
            <div className="tb-herofx-chips">{chips(enemy)}</div>
          </div>
        ) : null}
      </div>
      {open ? <HeroEffects hero={hero} groups={groups} includeEnhance={includeEnhance} /> : null}
    </section>
  );
}

export function FinderTile({ chip, group, on, have, dim = false, onClick }) {
  const { label, dir } = group === 'role' ? { label: chip.label, dir: null } : { label: listLabel(chip.label), dir: effectLabel(chip.label).dir };
  const hint = group === 'role' ? ` · ${ROLE_HINT.get(chip.id)}` : '';
  return (
    <button
      type="button"
      className={`tb-ftile is-${group}${on ? ' is-on' : ''}${have ? ' is-have' : ''}${dim ? ' is-dim' : ''}`}
      onClick={onClick}
      aria-pressed={on}
      title={`${chip.label}${hint} — 가진 영웅 ${chip.count}명${have ? ' · 이미 덱에 있어요' : ''}`}
    >
      <span className="tb-ftile-mark" aria-hidden="true">{have ? '✓' : '+'}</span>
      <span className="tb-ftile-label">{label}</span>
      {dir ? <i className={`tb-dir is-${dir}`} aria-hidden="true">{dir === 'up' ? '▲' : '▼'}</i> : null}
      <span className="tb-ftile-count">{chip.count}</span>
    </button>
  );
}

export function PickerDropdown({
  active, names, heroes, onPick, onClose, onRemove, resolveHero, narrow,
  index, finder, setFinder,
}) {
  const ref = useRef(null);
  const current = names[active.idx] || '';
  const hero = current ? resolveHero(current) : null;
  const group = finder?.group || 'ally';

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (ref.current?.contains(t)) return;
      if (t.closest('.tb-slot') || t.closest('.tb-slot-remove') || t.closest('[data-finder]')) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [onClose]);

  const withSkill = !!finder?.skill;
  const ix = withSkill ? index.withSkill : index;

  const have = useMemo(() => {
    const set = new Set();
    for (const n of names) {
      const m = n ? ix.byHero.get(plainName(n)) : null;
      if (m) m.forEach((_, id) => set.add(id));
    }
    return set;
  }, [names, ix]);

  const chips = ix.groups[group] || [];
  const finderOpen = !!finder?.open;
  const chipId = finderOpen ? finder?.chipId || '' : '';
  const chipLabel = chipId ? (ix.groups[chipId.split('|')[0]] || []).find((c) => c.id === chipId)?.label : '';
  const shownHeroes = chipId ? heroes.filter((h) => ix.byHero.get(plainName(h.name))?.has(chipId)) : heroes;
  const renderBadge = chipId
    ? (h) => {
      const text = ix.byHero.get(plainName(h.name))?.get(chipId);
      return text ? <span className="tb-find-badge">{text}</span> : null;
    }
    : null;
  const toggleSkill = () => {
    const next = !withSkill;
    const keep = !chipId || [...(next ? index.withSkill : index).byHero.values()].some((m) => m.has(chipId));
    setFinder({ ...finder, group, skill: next, chipId: keep ? chipId : '' });
  };
  const toggleFinder = () => setFinder({ ...finder, group, open: !finderOpen, chipId: '' });

  return (
    <div ref={ref} className={`tb-picker-drop is-${active.side}`} role="dialog" aria-label="영웅 선택">
      <div className="tb-picker-drop-head">
        <span className={`tb-side-title is-${active.side}`}>
          <Icon name={active.side === 'mine' ? 'deckAlly' : 'deckEnemy'} size={14} />
          {active.side === 'mine' ? '내 덱' : '상대 덱'} {active.idx + 1}번 칸
        </span>
        {hero ? (
          <div className="tb-picker-tabs">
            <span className="tb-picker-hint">영웅을 누르면 {current} 자리에 넣어요</span>
            <button type="button" className="tb-picker-out" onClick={() => onRemove(active.side, active.idx)}>빼기</button>
          </div>
        ) : <span className="tb-picker-hint">영웅을 누르면 넣고 다음 칸으로 넘어가요</span>}
        <button type="button" className="tb-picker-close" onClick={onClose} aria-label="닫기"><Icon name="close" size={14} /></button>
      </div>

      <>
          <div className={`tb-finder${finderOpen ? ' is-open' : ''}`}>
            <div className="tb-finder-head">
              <button type="button" className="tb-finder-toggle" aria-expanded={finderOpen} onClick={toggleFinder}>
                <Icon name="search" size={13} /> 필요한 효과로 찾기
                <i className="tb-finder-caret" aria-hidden="true">▾</i>
              </button>
              {finderOpen ? <>
              <div className="tb-finder-groups" role="tablist">
                {FINDER_GROUPS.map((g) => (
                  <button key={g.id} type="button" role="tab" aria-selected={group === g.id} className={`is-${g.id}${group === g.id ? ' is-on' : ''}`} onClick={() => setFinder({ ...finder, group: g.id, chipId })}>
                    {g.label} <small>{g.sub}</small>
                  </button>
                ))}
              </div>
              <button type="button" className={`tb-skill-toggle${withSkill ? ' is-on' : ''}`} aria-pressed={withSkill} onClick={toggleSkill} title="기본 공격 · 스킬 · 각성기 · 조건 발동(부활 시 등)으로 거는 버프 · 디버프도 찾기에 넣어요">
                <i aria-hidden="true" /> 스킬 효과 포함
              </button>
              <span className="tb-finder-legend"><i>✓</i> 이미 덱에 있음</span>
              {chipId ? (
                <button type="button" className="tb-finder-clear" onClick={() => setFinder({ ...finder, group, chipId: '' })}>
                  「{chipLabel}」 영웅만 보는 중 ✕
                </button>
              ) : null}
              </> : <span className="tb-finder-off">효과를 골라 그 효과를 가진 영웅만 볼 수 있어요</span>}
            </div>
            {finderOpen ? (
              <div className="tb-ftiles">
                {chips.map((c) => (
                  <FinderTile
                    key={c.id}
                    chip={c}
                    group={group}
                    on={chipId === c.id}
                    have={have.has(c.id)}
                    onClick={() => setFinder({ ...finder, group, chipId: chipId === c.id ? '' : c.id })}
                  />
                ))}
              </div>
            ) : null}
          </div>
          <HeroGridPicker
            heroes={shownHeroes}
            selectedNames={names.filter(Boolean)}
            currentSlotName={current}
            onPick={onPick}
            height={narrow ? 250 : 290}
            showSearch
            loungeDensity
            renderBadge={renderBadge}
          />
      </>
    </div>
  );
}

/* ───────────── 블록 ───────────── */

export function Block({ tone, icon, iconPlain = 0, iconSize = 17, title, sub, children, aside, index = 0, className = '' }) {
  return (
    <section className={`tb-block is-${tone}${className ? ` ${className}` : ''}`} style={{ '--i': index }}>
      <header className="tb-block-head">
        <span className={`tb-block-icon${iconPlain ? ' is-plain' : ''}`}><Icon name={icon} size={iconPlain || iconSize} /></span>
        <div className="tb-block-title">
          <h3>{title}</h3>
          {sub ? <p>{sub}</p> : null}
        </div>
        {aside}
      </header>
      <div className="tb-block-body">{children}</div>
    </section>
  );
}

/* ───────────── 덱 세팅 체크 ───────────── */

const CHECK_MARK = { good: '✓', warn: '!', info: 'i', purple: '✦' };

export function CheckList({ items, resolveHero, onFinder }) {
  return (
    <ul className="tb-checks">
      {items.map((it, i) => (
        <li key={it.id} className={`tb-check is-${it.tone}${it.finders ? ' is-wide' : ''}`} style={{ '--i': Math.min(i, 12) }}>
          <span className="tb-check-mark" aria-hidden="true">{CHECK_MARK[it.tone]}</span>
          <div className="tb-check-body">
            <strong>{it.title}</strong>
            {it.detail ? <p>{it.detail}</p> : null}
            {it.finders?.length ? (
              <div className="tb-check-finders">
                {it.finders.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    data-finder
                    className={`tb-check-finder is-${g.id}${g.missing ? '' : ' is-full'}`}
                    onClick={() => onFinder?.(g.id)}
                    title={`${g.label} ${g.total}가지 중 ${g.missing}가지가 덱에 없어요 — 눌러서 찾기`}
                  >
                    <span className="tb-check-finder-plus" aria-hidden="true">{g.missing ? '+' : '✓'}</span>
                    <span>{g.label}</span>
                    <b>{g.missing ? `${g.missing}개 없음` : '모두 있음'}</b>
                    <small>/ {g.total}</small>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {it.heroes?.length ? (
            <span className="tb-check-heroes">
              {it.heroes.slice(0, 5).map((n) => <MiniHero key={n} hero={resolveHero(n)} size={26} />)}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/* ───────────── 전설 장신구 체크 ───────────── */

const RING_ICON = new Map(accessories.map((a) => [a.shortLabel, a.iconUrl]));

export function RingCheck({ rows, resolveHero }) {
  const blocked = rows
    .map((r) => ({ ...r, rings: LEGEND_RINGS.filter((k) => r.own[k]) }))
    .filter((r) => r.rings.length);
  return (
    <div className="tb-rings">
      <div className="tb-rings-head">
        <strong>전설 장신구 체크</strong>
        <span>{blocked.length ? '이 반지는 패시브와 겹쳐서 껴도 효과가 없어요' : '패시브와 겹치는 반지가 없어요 — 불사 · 권능 · 부활 모두 효과 있어요'}</span>
      </div>
      {blocked.length ? (
        <div className="tb-rings-list">
          {blocked.map((r, i) => (
            <span key={r.name} className="tb-ring-chip" style={{ '--i': i }}>
              <MiniHero hero={resolveHero(r.name)} size={26} />
              <b>{r.name}</b>
              {r.rings.map((k) => (
                <span
                  key={k}
                  className="tb-ring-no"
                  title={`${k}의 반지 — 패시브에 ${k}${r.own[k].source ? `(${r.own[k].source})` : ''}이 있어 효과 없음`}
                >
                  <img src={RING_ICON.get(k)} alt="" loading="lazy" />
                  <i aria-hidden="true">✕</i>
                  <em>{k}{r.own[k].source ? <small>{r.own[k].source}</small> : null}</em>
                </span>
              ))}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ───────────── 효과 목록 (받는 버프 · 거는 디버프) ───────────── */

const DIR_MARK = { up: '▲', down: '▼' };

const badgeValue = (c) => fmtFxValue(c.value, c.label, c.dir);

/** 버프 · 디버프 칸 안 [패시브 | 스킬 · 발동] 전환 */
export function FxTabs({ side, value, onChange, passiveCount, skillCount }) {
  const tabs = [
    { id: 'passive', label: '패시브', n: passiveCount },
    { id: 'skill', label: '스킬 · 발동', n: skillCount },
  ];
  return (
    <div className={`tb-fx-tabs is-${side}`} role="tablist">
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={value === t.id} className={value === t.id ? 'is-on' : ''} onClick={() => onChange(t.id)}>
          {t.label} <b>{t.n}</b>
        </button>
      ))}
    </div>
  );
}

/** 목록 안 가장 긴 효과 이름 너비를 --fxl-name 으로 넣어, 이름 뒤 수치 뱃지가 세로 한 줄로 서게 한다 */
function useAlignedNames(ref) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let alive = true;
    const measure = () => {
      if (!alive) return;
      el.style.removeProperty('--fxl-name');
      let max = 0;
      el.querySelectorAll('.tb-fxl-name').forEach((n) => { max = Math.max(max, n.getBoundingClientRect().width); });
      if (max) el.style.setProperty('--fxl-name', `${Math.ceil(max)}px`);
    };
    measure();
    document.fonts?.ready?.then(measure);
    return () => { alive = false; };
  });
}

export function EffectList({ cards, side, teamSize, resolveHero, onFind, emptyText }) {
  const listRef = useRef(null);
  useAlignedNames(listRef);
  if (!cards.length) return <div className="tb-empty">{emptyText}</div>;
  const rows = groupEffectCards(cards);
  return (
    <ul ref={listRef} className={`tb-fxl is-${side}`}>
      {rows.map((row, i) => {
        const { applied } = row;
        const head = row.cards[0];
        const lost = row.cards.length === 1 ? head.sources.filter((s) => !s.applied) : [];
        const sameDir = row.cards.every((c) => c.dir === head.dir);
        const dir = sameDir ? head.dir : side === 'enemy' ? 'down' : 'up';
        return (
          <li key={row.id} className={`tb-fxl-row${head.overlap || head.wasted || head.note?.warn ? ' is-warn' : ''}`} style={{ '--i': Math.min(i, 14) }}>
            <span className={`tb-fxl-dir is-${dir || 'none'}`} aria-hidden="true">{DIR_MARK[dir] || '◆'}</span>
            <div className="tb-fxl-body">
              <div className="tb-fxl-flows">
                {applied.map((s) => {
                  const partial = side === 'ally' && s.scopeKind !== 'all' && s.scopeKind !== 'self' && s.recipients && s.recipients.length < teamSize;
                  const none = partial && s.recipients.length === 0;
                  return (
                    <span key={s.id} className="tb-fxl-flow" title={`${s.heroName} · ${s.skillLabel}`}>
                      <span className="tb-fxl-giver">
                        <MiniHero hero={resolveHero(s.heroName)} size={22} />
                        <b>{s.heroName}</b>
                        {s.skillLabel === '각성기' ? <i className="tb-fxl-tag">각성 중</i> : null}
                      </span>
                      <span className="tb-fxl-arrow" aria-label="에게">→</span>
                      <span className={`tb-fxl-to${none ? ' is-none' : ''}`}>
                        {s.scope}
                        {partial && !none ? s.recipients.map((n) => <MiniHero key={n} hero={resolveHero(n)} size={18} />) : null}
                        {none ? <em>받는 영웅 없음</em> : null}
                      </span>
                    </span>
                  );
                })}
              </div>
              <div className="tb-fxl-main">
                {row.cards.map((c) => (
                  <span key={c.id} className="tb-fxl-fx">
                    <span className="tb-fxl-key">
                      <button type="button" data-finder className="tb-fxl-name" onClick={() => onFind?.(c)} title="이 효과를 가진 영웅 찾기">{c.label}</button>
                    </span>
                    {c.value != null ? <span className="tb-fxl-val">{badgeValue(c)}</span> : null}
                    {c.timing === 'start' ? <span className="tb-fxl-when" title="전투 시작 시 적용 — [상시] 효과와는 중첩돼요">시작 {c.turns}턴</span> : null}
                    {c.tower ? <span className="tb-fxl-tower" title="무한의 탑 · 시련의 탑에서만 적용">탑 전용</span> : null}
                    {c.overlap ? <span className="tb-fxl-flag">중복</span> : null}
                  </span>
                ))}
              </div>
              {lost.length ? (
                <p className="tb-fxl-note">
                  같은 효과는 가장 높은 수치 하나만 적용돼요. {lost.map((s) => `${s.heroName} ${fmtValue(s.value, head.dir)}`).join(' · ')}는 반영 안 돼요.
                </p>
              ) : null}
              {row.cards.length === 1 && head.overlapNote ? <p className="tb-fxl-note">같은 효과는 겹치는 대상만 높은 수치 하나를 받아요. {head.overlapNote}</p> : null}
              {head.selfClash ? <p className="tb-fxl-note">{selfClashText(head)}</p> : null}
              {head.note ? <p className="tb-fxl-note">{head.note.text}</p> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** 스킬 · 발동 탭 목록 — 영웅 · 스킬 하나에 상자 하나, 대상이 줄마다 다르면 줄에 대상 표시 */
export function SkillEffectList({ cards, side, resolveHero, emptyText }) {
  const listRef = useRef(null);
  useAlignedNames(listRef);
  if (!cards.length) return <div className="tb-empty">{emptyText}</div>;
  const rows = groupSkillCards(cards);
  return (
    <ul ref={listRef} className={`tb-fxl is-${side} is-skill`}>
      {rows.map((row, i) => {
        const scopes = [...new Set(row.cards.map((c) => c.sources[0].scope))];
        const oneScope = scopes.length === 1 ? scopes[0] : null;
        const dirs = [...new Set(row.cards.map((c) => c.dir))];
        const dir = dirs.length === 1 ? dirs[0] : side === 'enemy' ? 'down' : 'up';
        return (
          <li key={row.id} className="tb-fxl-row" style={{ '--i': Math.min(i, 14) }}>
            <span className={`tb-fxl-dir is-${dir || 'none'}`} aria-hidden="true">{DIR_MARK[dir] || '◆'}</span>
            <div className="tb-fxl-body">
              <div className="tb-fxl-flows">
                <span className="tb-fxl-flow">
                  <span className="tb-fxl-giver">
                    <MiniHero hero={resolveHero(row.heroName)} size={22} />
                    <b>{row.heroName}</b>
                    <i className="tb-fxl-tag is-skill">{row.tag}</i>
                  </span>
                  {oneScope ? (
                    <>
                      <span className="tb-fxl-arrow" aria-label="에게">→</span>
                      <span className="tb-fxl-to">{oneScope}</span>
                    </>
                  ) : null}
                </span>
              </div>
              <div className="tb-fxl-main">
                {row.cards.map((c) => (
                  <span key={c.id} className="tb-fxl-fx">
                    <span className="tb-fxl-key"><span className="tb-fxl-name">{c.label}</span></span>
                    {c.value != null ? <span className="tb-fxl-val">{badgeValue(c)}</span> : null}
                    {c.amountText ? <span className="tb-fxl-amt">{c.amountText}</span> : null}
                    {c.chance ? <span className="tb-fxl-amt">{c.chance}% 확률</span> : null}
                    {c.duration ? <span className="tb-fxl-when">{c.duration}</span> : null}
                    {c.stack ? <span className="tb-fxl-stack">{c.stack}</span> : null}
                    {c.tower ? <span className="tb-fxl-tower" title="무한의 탑 · 시련의 탑에서만 적용">탑 전용</span> : null}
                    {oneScope ? null : <span className="tb-fxl-scope">→ {c.sources[0].scope}</span>}
                    {c.condition ? <span className="tb-fxl-cond" title={c.condition}>{c.condition}</span> : null}
                  </span>
                ))}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function selfClashText(c) {
  const me = c.sources[0]?.heroName || '';
  const others = c.selfClash.others.map((o) => `${o.heroName}${o.value != null ? ` ${fmtValue(o.value, c.dir)}` : ''}`).join(' · ');
  const head = `${others} 팀 버프와 같은 효과라 ${me} 본인은 가장 높은 수치 하나만 받아요.`;
  if (c.selfClash.selfWins === true) return `${head} ${others}는 ${me}에게만 반영 안 돼요.`;
  if (c.selfClash.selfWins === false) return `${head} 이 자기 버프는 반영 안 돼요.`;
  return head;
}

/** 버프 칸 안 아래쪽 — 자기 자신만 받는 버프. 영웅 알약을 누르면 그 영웅 것만 펼침 */
export function SelfBuffSection({ cards, kind = 'passive', teamSize, resolveHero, open, onToggle }) {
  const heroOf = (c) => c.sources[0]?.heroName;
  const heroes = [...new Set(cards.map(heroOf).filter(Boolean))];
  if (!heroes.length) return null;
  const cur = heroes.includes(open) ? open : null;
  const shown = cur ? cards.filter((c) => heroOf(c) === cur) : [];
  return (
    <div className="tb-selfbuff">
      <div className="tb-selfbuff-head">
        <span className="tb-selfbuff-title">
          <Icon name="hero" size={14} /> 자기 자신만 받는 버프
          <em>{cur ? '한 번 더 누르면 접혀요' : '영웅을 누르면 펼쳐져요'}</em>
        </span>
        <div className="tb-selfbuff-chips" data-n={Math.min(heroes.length, 5)}>
          {heroes.map((name) => {
            const on = cur === name;
            return (
              <button
                key={name}
                type="button"
                aria-pressed={on}
                className={`tb-selfbuff-chip${on ? ' is-on' : ''}`}
                onClick={() => onToggle(on ? null : name)}
                title={on ? `${name} · 한 번 더 누르면 접혀요` : `${name} 자기 버프 보기`}
              >
                <MiniHero hero={resolveHero(name)} size={22} />
                <span className="tb-selfbuff-name">{name}</span>
                <b>{fxBoxCount(cards.filter((c) => heroOf(c) === name), kind)}</b>
              </button>
            );
          })}
        </div>
      </div>
      {shown.length && kind === 'skill' ? <SkillEffectList key={cur} cards={shown} side="ally" resolveHero={resolveHero} emptyText="" /> : null}
      {shown.length && kind !== 'skill' ? <EffectList key={cur} cards={shown} side="ally" teamSize={teamSize} resolveHero={resolveHero} emptyText="" /> : null}
    </div>
  );
}

/* ───────────── 상대 덱 — 노리는 대상 · 조심할 것 ───────────── */

export function TargetStrip({ groups, resolveHero }) {
  if (!groups.length) return null;
  return (
    <div className="tb-targets">
      <span className="tb-targets-title"><Icon name="tbAim" size={15} /> 상대가 노리는 우리 배치</span>
      {groups.map((g, i) => (
        <span key={g.label} className="tb-target" style={{ '--i': i }} title={`우리 ${g.label} ← ${g.heroes.join(' · ')}`}>
          <b>{g.label}</b>
          <span className="tb-target-heroes">
            {g.heroes.map((n) => <MiniHero key={n} hero={resolveHero(n)} size={20} />)}
          </span>
        </span>
      ))}
    </div>
  );
}

export function ThreatCards({ cards, resolveHero, emptyText }) {
  if (!cards.length) return <div className="tb-empty">{emptyText}</div>;
  return (
    <div className="tb-threats">
      {cards.map((c, i) => (
        <article key={c.id} className={`tb-threat is-${c.level}${c.inactive ? ' is-inactive' : ''}`} style={{ '--i': Math.min(i, 12) }}>
          <header className="tb-threat-head">
            <MiniHero hero={resolveHero(c.heroName)} size={44} />
            <div className="tb-threat-id">
              <strong>{c.heroName}</strong>
              {c.targets.length ? (
                <span className="tb-threat-aim">
                  <Icon name="tbAim" size={15} />
                  {c.targets.map((t, k) => <span key={t}>{k ? ' · ' : ''}우리 <b>{t}</b></span>)} 노림
                </span>
              ) : <span className="tb-threat-aim is-gimmick">특수 기믹 주의</span>}
            </div>
          </header>
          <div className="tb-threat-body">
            {c.lines.map((l) => (
              <div key={l.id} className={`tb-threat-line${l.cond && !l.cond.met ? ' is-off' : ''}`}>
                <p className="tb-threat-what">{l.what}</p>
                {l.cond ? (
                  <p className={`tb-threat-cond${l.cond.met ? ' is-met' : ''}`}>
                    조건 · 상대 {l.cond.label} — 지금 {l.cond.have} → {l.cond.effectText ? `${l.cond.effectText} ` : ''}{l.cond.met ? '발동해요' : '발동 안 함'}
                  </p>
                ) : null}
                <p className="tb-threat-todo"><Icon name="check" size={12} /> {l.todo}</p>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
