import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../../components/icons/Icon';
import { heroes } from '../../data/heroes';
import { BUFF_NOTES, HERO_TIPS, SIGNATURE_TIPS } from '../../data/teamBuilderTips';
import { navigateToTeam, teamModeFromPath } from '../../config/routes';
import {
  analyzeTeam,
  buildHeroEffectIndex,
  buildRareEffectSet,
  collectHeroEntries,
  effectCards,
  fmtValue,
  formationRequirements,
  ownRevivals,
  skillCards,
  targetingInsights,
} from '../../lib/teamBuilderAnalysis';
import {
  Block,
  CheckList,
  DeckBar,
  EffectList,
  FxTabs,
  HeroFxPanel,
  SelfBuffSection,
  SkillEffectList,
  ModePicker,
  PickerDropdown,
  RingCheck,
  TargetStrip,
  ThreatCards,
} from './TeamBuilderParts';
import { fxBoxCount } from './fxGroups';
import EffectDictionary from './EffectDictionary';
import '../../styles/teamBuilder.css';

const STORE_KEY = 'senalink_team_builder_v1';
const MODE_META = {
  arena: { size: 5, title: '결투장', vs: '5 vs 5', icon: 'tbArena', iconSize: 18 },
  guildwar: { size: 3, title: '길드전', vs: '3 vs 3', icon: 'tbGuildwar', iconSize: 18 },
  pve: { size: 5, title: 'PvE', vs: '5인', icon: 'pve', iconSize: 17, pve: true },
};

const cleanName = (n) => String(n || '').replace('(각성)', '').trim();
const HERO_BY_NAME = new Map(heroes.map((h) => [cleanName(h.name), h]));
const resolveHero = (name) => HERO_BY_NAME.get(cleanName(name)) || null;

const bareName = (name) => String(name || '').replace(/\(중첩\)$/, '').trim();
const ALLY_SIG = new Set(Object.entries(SIGNATURE_TIPS).filter(([, v]) => v.ally).map(([k]) => k));
const ENEMY_SIG = new Set(Object.entries(SIGNATURE_TIPS).filter(([, v]) => v.enemy).map(([k]) => k));
const LEVEL_ORDER = { danger: 0, warn: 1, info: 2 };
const SKILL_TAB_SUB = '기본 공격 · 스킬 · 각성기 · 조건 발동 — 쓸 때 걸려서 겹침 판정은 안 해요';
const MISSING_GROUPS = [
  { id: 'role', label: '역할' },
  { id: 'ally', label: '팀 버프' },
  { id: 'enemy', label: '적 디버프' },
];

function emptyDeck(size) {
  return Array.from({ length: size }, () => '');
}
const EMPTY_DECKS = Object.fromEntries(Object.entries(MODE_META).map(([id, m]) => [id, { mine: emptyDeck(m.size), enemy: emptyDeck(m.size) }]));

function loadStore() {
  const base = {
    decks: {
      arena: { mine: emptyDeck(5), enemy: emptyDeck(5) },
      guildwar: { mine: emptyDeck(3), enemy: emptyDeck(3) },
      pve: { mine: emptyDeck(5), enemy: emptyDeck(5) },
    },
    enemyOn: { arena: false, guildwar: false, pve: false },
  };
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return base;
    for (const m of Object.keys(MODE_META)) {
      const size = MODE_META[m].size;
      for (const side of ['mine', 'enemy']) {
        const list = Array.isArray(raw.decks?.[m]?.[side]) ? raw.decks[m][side] : [];
        base.decks[m][side] = emptyDeck(size).map((_, i) => (resolveHero(list[i]) ? cleanName(list[i]) : ''));
      }
    }
  } catch {
    /* 저장본이 깨져 있으면 빈 덱으로 시작 */
  }
  return base;
}

function useIsNarrow(query = '(max-width: 760px)') {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setNarrow(mq.matches);
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [query]);
  return narrow;
}

/** 내 덱 — 세팅할 때 신경 쓸 것 */
function buildChecks({ cards, reqs, missing }) {
  const items = [];

  const overlaps = cards.filter((c) => c.overlap);
  for (const c of overlaps) {
    const best = c.sources.find((s) => s.applied);
    const lost = c.sources.filter((s) => !s.applied);
    const lostText = lost.length ? `${lost.map((s) => `${s.heroName} ${fmtValue(s.value, c.dir)}`).join(' · ')}는 반영 안 돼요.` : '';
    items.push({
      id: `ov-${c.id}`,
      tone: 'warn',
      title: `${c.name}${c.timing === 'start' ? ` (시작 ${c.turns}턴)` : ' [상시]'} 중복`,
      detail: c.overlapNote
        ? [lostText, c.overlapNote].filter(Boolean).join(' ')
        : `${c.sources.map((s) => `${s.heroName} ${fmtValue(s.value, c.dir)}`).join(' · ')} → ${best ? `${best.heroName} ${fmtValue(best.value, c.dir)}` : '높은 쪽'}만 적용돼요.`,
      heroes: c.sources.map((s) => s.heroName),
    });
  }
  if (!overlaps.length) {
    items.push({ id: 'ov-none', tone: 'good', title: '겹치는 버프·디버프 없음', detail: '[상시] · 전투 시작 [N턴] 효과가 모두 그대로 적용돼요.' });
  }

  for (const c of cards.filter((x) => x.wasted)) {
    const s = c.sources[0];
    items.push({
      id: `ws-${c.id}`,
      tone: 'warn',
      title: `${c.name} — 받는 영웅 없음`,
      detail: `${s.heroName}의 효과 대상(${s.scope})이 덱에 없어요.`,
      heroes: [s.heroName],
    });
  }

  for (const r of reqs) {
    const have = r.have.map((h) => `${h.role} ${h.n}명${h.boosted ? '(+1)' : ''}`).join(' · ');
    items.push({
      id: `rq-${r.id}`,
      tone: r.met ? 'good' : 'warn',
      title: `${r.heroName} · ${r.label}`,
      detail: `지금 ${have} → ${r.effectText} ${r.met ? '발동해요' : '발동 안 함'}`,
      heroes: [r.heroName],
    });
  }

  const missingTotal = missing.reduce((n, g) => n + g.missing, 0);
  items.push({
    id: 'missing',
    tone: 'info',
    title: missingTotal ? `덱에 없는 효과 ${missingTotal}개` : '모든 효과를 갖췄어요',
    detail: missingTotal ? '＋를 누르면 영웅 선택 창의 「필요한 효과로 찾기」로 이동해요.' : '',
    finders: missing,
  });
  return items;
}

const ATTACK_TRAITS = new Set(['관통', '방어 무시', '처형', '치명타 확률 증가', '약점 공격 확률 증가']);
/** 받침 있으면 a, 없으면 b (을/를 · 은/는) */
function josa(word, a, b) {
  const ch = String(word || '').trim().slice(-1);
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return `${a}(${b})`;
  return code % 28 ? a : b;
}
/** 노리는 대상 + 효과 목록 → 「우리 후열을 노려 공격하고(처형), 턴제 버프 감소를 걸어요.」 */
function targetingSentence(label, effects) {
  const names = effects.map(bareName);
  const traits = names.filter((n) => ATTACK_TRAITS.has(n));
  const hit = names.includes('추가 피해') || traits.length > 0;
  const debuffs = names.filter((n) => n !== '추가 피해' && n !== '버프 해제' && n !== '턴제 버프 감소' && !ATTACK_TRAITS.has(n));
  const trait = traits.length ? `(${traits.join(' · ')})` : '';
  const clauses = [];
  if (hit) clauses.push([`공격하고${trait}`, `공격해요${trait}`]);
  if (names.includes('버프 해제')) clauses.push(['버프를 지우고', '버프를 지워요']);
  if (names.includes('턴제 버프 감소')) clauses.push(['버프 턴을 줄이고', '버프 턴을 줄여요']);
  if (debuffs.length) {
    const list = `${debuffs.join(' · ')}${josa(debuffs[debuffs.length - 1], '을', '를')}`;
    clauses.push([`${list} 걸고`, `${list} 걸어요`]);
  }
  const body = clauses.map((c, i) => (i === clauses.length - 1 ? c[1] : c[0])).join(', ');
  return hit ? `우리 ${label}${josa(label, '을', '를')} 노려 ${body}.` : `우리 ${label}에게 ${body}.`;
}

const DMG_GUARD = /^(물리|마법) (피해 면역|감쇄)$/;
const DEALER_ROLES = new Set(['offensive', 'magic', 'universal']);

/**
 * 물리/마법 피해 면역 · 감쇄를 가진 상대 영웅 → 반대 속성 공격 권장.
 * 방어형이거나 자신 말고 다른 아군에게도 거는 경우만 (공격형이 스킬 중 잠깐 자기만 면역인 건 제외).
 */
function damageGuardLines(theirs, myHeroes) {
  const byHero = new Map();
  for (const e of theirs.entries) {
    if (e.kind !== 'effect' || e.side !== 'ally') continue;
    const m = bareName(e.name).match(DMG_GUARD);
    if (!m) continue;
    if (!byHero.has(e.heroName)) byHero.set(e.heroName, new Map());
    const types = byHero.get(e.heroName);
    if (!types.has(m[1])) types.set(m[1], []);
    const list = types.get(m[1]);
    const name = bareName(e.name);
    const target = e.target || '자신';
    let row = list.find((x) => x.name === name);
    if (!row) list.push((row = { name, targets: [], immune: m[2] === '피해 면역' }));
    if (!row.targets.includes(target)) row.targets.push(target);
  }
  const out = [];
  for (const [heroName, types] of byHero) {
    const tank = resolveHero(heroName)?.role === 'defensive';
    for (const [type, list] of types) {
      if (!tank && list.every((x) => x.targets.every((t) => t === '자신'))) continue;
      const other = type === '물리' ? '마법' : '물리';
      const ours = myHeroes.filter((h) => DEALER_ROLES.has(h.role) && h.attackType === (other === '마법' ? 'magic' : 'physical'));
      const sorted = [...list].sort((a, b) => Number(b.immune) - Number(a.immune));
      const immune = sorted[0].immune;
      out.push({
        heroName,
        type,
        danger: immune && myHeroes.length > 0 && ours.length === 0,
        what: `${sorted.map((x) => `${x.name}(${x.targets.join(' · ')})`).join(' · ')} 효과가 있어 ${type} 공격이 ${immune ? '잘 안 먹혀요' : '덜 들어가요'}.`,
        todo: `${other} 공격 영웅으로 공격하세요.${myHeroes.length
          ? ours.length ? ` (내 덱: ${ours.map((h) => cleanName(h.name)).join(' · ')})` : ` 지금 내 덱엔 ${other} 공격 영웅이 없어요.`
          : ''}`,
      });
    }
  }
  return out;
}

/** 상대 덱 — 영웅별 「무슨 일이 생기는지 → 대비」 */
function buildThreats(theirs, targeting, enemyReqs, enemyNames, myHeroes = []) {
  const byHero = new Map();
  const card = (name) => {
    if (!byHero.has(name)) byHero.set(name, { id: name, heroName: name, targets: [], lines: [], level: 'info', used: new Set() });
    return byHero.get(name);
  };
  const condFor = (heroName, effects) => {
    const r = enemyReqs.find((x) => x.heroName === heroName && x.effects.some((n) => effects.includes(n)));
    if (!r) return null;
    return { label: r.label, have: r.have.map((h) => `${h.role} ${h.n}명${h.boosted ? '(+1)' : ''}`).join(' · '), met: r.met, effectText: r.effectText };
  };
  const raise = (c, level) => { if (LEVEL_ORDER[level] < LEVEL_ORDER[c.level]) c.level = level; };

  for (const r of targeting) {
    const c = card(r.heroName);
    const tipKey = r.effects.map(bareName).find((k) => SIGNATURE_TIPS[k]?.enemy);
    const tip = tipKey ? SIGNATURE_TIPS[tipKey].enemy : null;
    const cond = condFor(r.heroName, r.effects);
    const extras = r.effects.filter((n) => bareName(n) !== tipKey && n !== '추가 피해' && !ATTACK_TRAITS.has(bareName(n)));
    r.effects.forEach((n) => c.used.add(bareName(n)));
    if (!c.targets.includes(r.selector.label)) c.targets.push(r.selector.label);
    c.lines.push({
      id: r.id,
      what: tip
        ? `${tip.what}${extras.length ? ` 같은 대상에게 ${extras.join(' · ')}도 걸어요.` : ''}`
        : targetingSentence(r.selector.label, r.effects),
      todo: tip?.todo || r.selector.todo,
      cond,
      selector: r.selector.label,
    });
    if (!cond || cond.met) raise(c, 'danger');
  }

  for (const sp of theirs.specials) {
    const key = bareName(sp.name);
    const def = SIGNATURE_TIPS[key];
    if (!def?.enemy) continue;
    const c = card(sp.heroName);
    if (c.used.has(key)) continue;
    c.used.add(key);
    const cond = condFor(sp.heroName, [sp.name, key]);
    c.lines.push({ id: `sp-${sp.id}`, what: def.enemy.what, todo: def.enemy.todo, cond });
    if (!cond || cond.met) raise(c, def.enemyLevel || 'danger');
  }

  const cooldownHeroes = new Set(theirs.entries
    .filter((e) => e.kind === 'effect' && e.side === 'enemy' && /쿨타임 증가/.test(e.name))
    .map((e) => e.heroName));
  for (const name of cooldownHeroes) {
    const c = card(name);
    c.lines.push({
      id: `cooldown-${name}`,
      what: '속공을 뺏기면 스킬 쿨타임 증가로 인해 스킬 예약이 풀릴 수 있어요.',
      todo: '상대보다 속공을 올려보세요.',
      cond: null,
    });
    raise(c, 'warn');
  }

  for (const g of damageGuardLines(theirs, myHeroes)) {
    const c = card(g.heroName);
    c.lines.push({ id: `guard-${g.heroName}-${g.type}`, what: g.what, todo: g.todo, cond: null });
    raise(c, g.danger ? 'danger' : 'warn');
  }

  for (const name of enemyNames) {
    const tips = [].concat(HERO_TIPS[name]?.enemy || []);
    if (!tips.length) continue;
    const c = card(name);
    tips.forEach((tip, i) => c.lines.push({ id: `hero-${name}-${i}`, what: tip.what, todo: tip.todo, cond: null }));
    raise(c, 'danger');
  }

  const cards = [...byHero.values()].map((c) => ({ ...c, inactive: c.lines.every((l) => l.cond && !l.cond.met) }));
  cards.sort((a, b) => Number(a.inactive) - Number(b.inactive) || LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);

  const groups = new Map();
  for (const c of cards) {
    for (const l of c.lines) {
      if (!l.selector || (l.cond && !l.cond.met)) continue;
      if (!groups.has(l.selector)) groups.set(l.selector, []);
      const list = groups.get(l.selector);
      if (!list.includes(c.heroName)) list.push(c.heroName);
    }
  }
  return { cards, groups: [...groups.entries()].map(([label, list]) => ({ label, heroes: list })) };
}

export default function TeamBuilderPage() {
  const [mode, setMode] = useState(() => teamModeFromPath(window.location.pathname));
  const [store, setStore] = useState(loadStore);
  const [active, setActive] = useState({ side: 'mine', idx: 0 });
  const [pickerOpen, setPickerOpenRaw] = useState(false);
  const [finder, setFinder] = useState({ group: 'ally', chipId: '', skill: false, open: false });
  const setPickerOpen = useCallback((next) => {
    setPickerOpenRaw(next);
    if (!next) setFinder((f) => (f.open ? { ...f, open: false } : f));
  }, []);
  const [view, setView] = useState('mine');
  const [fxFocus, setFxFocus] = useState(null);
  const [fxOpen, setFxOpen] = useState(false);
  const [fxTab, setFxTab] = useState({ ally: 'passive', enemy: 'passive' });
  const [selfOpen, setSelfOpen] = useState(null);
  const openFxFor = (next) => {
    setFxFocus(next);
    setFxOpen(true);
  };
  const narrow = useIsNarrow();

  useEffect(() => {
    let current = teamModeFromPath(window.location.pathname);
    const sync = () => {
      const next = teamModeFromPath(window.location.pathname);
      if (next === current) return;
      current = next;
      setMode(next);
      setActive({ side: 'mine', idx: 0 });
      setPickerOpenRaw(false);
      setFinder((f) => (f.open ? { ...f, open: false } : f));
      setView('mine');
    };
    window.addEventListener('popstate', sync);
    window.addEventListener('app:navigate', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('app:navigate', sync);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {
      /* 저장 공간이 없으면 이번 세션만 유지 */
    }
  }, [store]);

  const isDict = mode === 'effects';
  const meta = mode && MODE_META[mode] ? MODE_META[mode] : null;
  const deck = meta ? store.decks[mode] ?? EMPTY_DECKS[mode] : null;
  const isPve = !!meta?.pve;
  const enemyOn = meta && !isPve ? !!store.enemyOn[mode] : false;
  const curView = enemyOn ? view : 'mine';

  const rareSet = useMemo(() => buildRareEffectSet(heroes), []);
  const effectIndex = useMemo(() => buildHeroEffectIndex(heroes, { rareSet }), [rareSet]);
  const myHeroes = useMemo(() => (deck ? deck.mine.map(resolveHero).filter(Boolean) : []), [deck]);
  const enemyHeroes = useMemo(() => (deck && enemyOn ? deck.enemy.map(resolveHero).filter(Boolean) : []), [deck, enemyOn]);

  const mine = useMemo(() => analyzeTeam(myHeroes, { rareSet, signatureKeys: ALLY_SIG, allowTower: isPve }), [myHeroes, rareSet, isPve]);
  const theirs = useMemo(() => (enemyHeroes.length ? analyzeTeam(enemyHeroes, { rareSet, signatureKeys: ENEMY_SIG }) : null), [enemyHeroes, rareSet]);

  const myCards = useMemo(() => effectCards(mine, myHeroes), [mine, myHeroes]);
  const withNote = useCallback((c) => {
    const note = BUFF_NOTES[bareName(c.name)];
    if (!note) return c;
    return { ...c, note: { text: note.text, warn: myHeroes.some((h) => h.role === note.warnRole) } };
  }, [myHeroes]);
  const buffCards = useMemo(() => myCards.filter((c) => c.side === 'ally').map(withNote), [myCards, withNote]);
  const selfCards = useMemo(() => effectCards(mine, myHeroes, true, { selfOnly: true }).map(withNote), [mine, myHeroes, withNote]);
  const debuffCards = useMemo(() => myCards.filter((c) => c.side === 'enemy'), [myCards]);
  const castCards = useMemo(() => skillCards(mine, myHeroes), [mine, myHeroes]);
  const buffSkillCards = useMemo(() => castCards.filter((c) => c.side === 'ally' && c.sources[0]?.scopeKind !== 'self'), [castCards]);
  const selfSkillCards = useMemo(() => castCards.filter((c) => c.side === 'ally' && c.sources[0]?.scopeKind === 'self'), [castCards]);
  const debuffSkillCards = useMemo(() => castCards.filter((c) => c.side === 'enemy'), [castCards]);
  const reqs = useMemo(() => (meta ? formationRequirements(mine, myHeroes, meta.size) : []), [mine, myHeroes, meta]);
  const ringRows = useMemo(() => myHeroes.map((h) => ({ name: cleanName(h.name), own: ownRevivals(h) })), [myHeroes]);
  const missing = useMemo(() => {
    const have = new Set();
    for (const n of deck?.mine || []) effectIndex.byHero.get(cleanName(n))?.forEach((_, id) => have.add(id));
    return MISSING_GROUPS.map((g) => {
      const chips = effectIndex.groups[g.id] || [];
      return { ...g, total: chips.length, missing: chips.filter((c) => !have.has(c.id)).length };
    });
  }, [deck, effectIndex]);
  const checks = useMemo(() => buildChecks({ cards: myCards, reqs, missing }), [myCards, reqs, missing]);

  const threats = useMemo(() => {
    if (!theirs || !meta) return { cards: [], groups: [] };
    const enemyReqs = formationRequirements(theirs, enemyHeroes, meta.size);
    return buildThreats(theirs, targetingInsights(theirs), enemyReqs, enemyHeroes.map((h) => cleanName(h.name)), myHeroes);
  }, [theirs, enemyHeroes, meta, myHeroes]);

  const heroEntriesFor = useCallback((name) => {
    const h = resolveHero(name);
    return h ? collectHeroEntries(h, { rareSet, allowTower: isPve }) : [];
  }, [rareSet, isPve]);

  const updateDeck = useCallback((side, next) => {
    setStore((prev) => {
      const copy = structuredClone(prev);
      copy.decks[mode] ??= structuredClone(EMPTY_DECKS[mode]);
      copy.decks[mode][side] = next;
      return copy;
    });
  }, [mode]);

  const closePicker = useCallback(() => setPickerOpen(false), [setPickerOpen]);

  const onSelectSlot = (side, idx) => {
    if (pickerOpen && active.side === side && active.idx === idx) {
      setPickerOpen(false);
      return;
    }
    setActive({ side, idx });
    setPickerOpen(true);
    if (deck[side][idx]) setFxFocus({ side, name: deck[side][idx] });
  };

  const openFinder = (group, chipId) => {
    setFinder((f) => ({ ...f, group, chipId, open: true }));
    const empty = deck.mine.findIndex((n) => !n);
    setActive({ side: 'mine', idx: empty === -1 ? (active.side === 'mine' ? active.idx : 0) : empty });
    setPickerOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onPick = (name) => {
    const { side, idx } = active;
    const copy = [...deck[side]];
    const dup = copy.indexOf(name);
    if (dup !== -1 && dup !== idx) copy[dup] = copy[idx] || '';
    copy[idx] = name;
    updateDeck(side, copy);
    setFxFocus({ side, name });
    const nextIdx = copy.findIndex((n, i) => i > idx && !n);
    const anyEmpty = copy.findIndex((n) => !n);
    if (nextIdx !== -1) setActive({ side, idx: nextIdx });
    else if (anyEmpty !== -1) setActive({ side, idx: anyEmpty });
    else setPickerOpen(false);
  };

  const onRemove = (side, idx) => {
    updateDeck(side, deck[side].map((n, i) => (i === idx ? '' : n)));
    setActive({ side, idx });
  };

  const onClear = (side) => {
    updateDeck(side, deck[side].map(() => ''));
    setActive({ side, idx: 0 });
  };

  const setEnemy = (on) => {
    setStore((prev) => {
      const copy = structuredClone(prev);
      copy.enemyOn[mode] = on;
      return copy;
    });
    if (on) {
      const firstEmpty = deck.enemy.findIndex((n) => !n);
      setActive({ side: 'enemy', idx: firstEmpty === -1 ? 0 : firstEmpty });
      setPickerOpen(true);
      setView('enemy');
    } else {
      if (active.side === 'enemy') {
        setActive({ side: 'mine', idx: 0 });
        setPickerOpen(false);
      }
      setView('mine');
    }
  };

  const addToDeck = (target, name) => {
    const title = MODE_META[target].title;
    const list = (store.decks[target] ?? EMPTY_DECKS[target]).mine;
    if (list.includes(name)) return `${name}은(는) 이미 ${title} 덱에 있어요.`;
    const idx = list.findIndex((n) => !n);
    if (idx === -1) return `${title} 덱이 가득 찼어요. 덱에서 한 명을 빼고 넣어 주세요.`;
    setStore((prev) => {
      const copy = structuredClone(prev);
      copy.decks[target] ??= structuredClone(EMPTY_DECKS[target]);
      copy.decks[target].mine[idx] = name;
      return copy;
    });
    return `${name} → ${title} 내 덱 ${idx + 1}번 칸에 넣었어요.`;
  };

  const hasMine = myHeroes.length > 0;
  const hasTheirs = enemyHeroes.length > 0;
  const findCard = (c) => openFinder(c.side, `${c.side}|${c.key}`);
  const warnCount = checks.filter((c) => c.tone === 'warn').length;

  return (
    <div className="container fade-in page-section tb-page">
      <header className="luxury-panel tb-hero">
        <div className="tb-hero-copy">
          <span className="tb-hero-kicker"><Icon name="teamBuilder" size={15} /> TEAM BUILDER</span>
          <h1>팀 빌더</h1>
          <p>칸을 눌러 영웅을 넣으면 <b>세팅 체크</b> · <b>받는 버프</b> · <b>거는 디버프</b>가 정리돼요. {isPve ? <>PvE는 <b>아군만</b> 봐요.</> : <>상대 덱을 켜면 <b>조심할 것</b>만 알려줘요.</>}<br />(스킬 강화 · 초월 기준)</p>
        </div>
        {mode ? (
          <div className="tb-mode-switch" role="tablist" aria-label="모드">
            {Object.entries(MODE_META).map(([id, m]) => (
              <button key={id} type="button" role="tab" aria-selected={mode === id} className={`tb-mode-pill${mode === id ? ' is-on' : ''}`} onClick={() => navigateToTeam(id)}>
                <Icon name={m.icon} size={m.iconSize} /> {m.title} <b>{m.vs}</b>
              </button>
            ))}
            <button type="button" role="tab" aria-selected={isDict} className={`tb-mode-pill${isDict ? ' is-on' : ''}`} onClick={() => navigateToTeam('effects')}>
              <Icon name="tbEffects" size={17} /> 효과 사전
            </button>
          </div>
        ) : null}
      </header>

      {!mode ? <ModePicker onPick={(m) => navigateToTeam(m)} /> : isDict ? (
        <EffectDictionary
          heroes={heroes}
          index={effectIndex}
          rareSet={rareSet}
          resolveHero={resolveHero}
          decks={store.decks}
          onAddToDeck={addToDeck}
        />
      ) : (
        <>
          <section className="luxury-panel tb-deck-panel">
            <DeckBar
              size={meta.size}
              deck={deck}
              enemyOn={enemyOn}
              allowEnemy={!isPve}
              resolveHero={resolveHero}
              active={pickerOpen ? active : null}
              onSelect={onSelectSlot}
              onRemove={onRemove}
              onClear={onClear}
              onToggleEnemy={() => setEnemy(true)}
            />
            {enemyOn ? <button type="button" className="tb-enemy-off" onClick={() => setEnemy(false)}>상대 덱 끄기</button> : null}
            {pickerOpen ? (
              <PickerDropdown
                active={active}
                names={deck[active.side]}
                heroes={heroes}
                onPick={onPick}
                onClose={closePicker}
                onRemove={onRemove}
                resolveHero={resolveHero}
                narrow={narrow}
                index={effectIndex}
                finder={finder}
                setFinder={setFinder}
              />
            ) : null}
          </section>

          <HeroFxPanel
            deck={deck}
            size={meta.size}
            enemyOn={enemyOn}
            resolveHero={resolveHero}
            heroEntriesFor={heroEntriesFor}
            focus={fxFocus}
            open={fxOpen}
            onFocus={openFxFor}
            onToggle={() => setFxOpen((o) => !o)}
          />

          <section className="luxury-panel tb-analysis">
            {enemyOn ? (
              <div className="tb-analysis-head">
                <div className="tb-view-switch" role="tablist" aria-label="분석 기준">
                  <button key="mine" type="button" role="tab" aria-selected={curView === 'mine'} className={`tb-view is-mine${curView === 'mine' ? ' is-on' : ''}`} onClick={() => setView('mine')}>
                    <span className="tb-view-shine" aria-hidden="true" />
                    <span className="tb-view-name">내 덱</span>
                  </button>
                  <span className="tb-view-dots" aria-hidden="true"><i /></span>
                  <button key="enemy" type="button" role="tab" aria-selected={curView === 'enemy'} className={`tb-view is-enemy${curView === 'enemy' ? ' is-on' : ''}`} onClick={() => setView('enemy')}>
                    <span className="tb-view-shine" aria-hidden="true" />
                    <span className="tb-view-name">상대 덱</span>
                  </button>
                </div>
              </div>
            ) : null}

            {curView === 'mine' ? (
              !hasMine ? (
                <div className="tb-empty tb-empty--big">
                  <Icon name="hero" size={28} />
                  <strong>내 덱 칸을 눌러 영웅을 넣어 주세요</strong>
                  <span>영웅 선택 창의 「필요한 효과로 찾기」로 원하는 효과를 가진 영웅만 골라 볼 수도 있어요.</span>
                </div>
              ) : (
                <div key="mine" className="tb-view-body">
                  <Block
                    tone="check"
                    icon="check"
                    title="덱 세팅 체크"
                    sub="세팅하기 전에 확인할 것"
                    aside={warnCount ? <span className="tb-block-count is-warn">확인 {warnCount}</span> : <span className="tb-block-count">OK</span>}
                    index={0}
                  >
                    <RingCheck rows={ringRows} resolveHero={resolveHero} />
                    <CheckList items={checks} resolveHero={resolveHero} onFinder={(group) => openFinder(group, '')} />
                  </Block>
                  <div className="tb-fx-pair">
                    <Block
                      tone="ally"
                      icon="tbBuff"
                      iconPlain={26}
                      title="우리 팀이 받는 버프"
                      sub={fxTab.ally === 'skill' ? SKILL_TAB_SUB : '패시브 [상시] · 전투 시작 [N턴] — [상시]와 턴 효과는 서로 중첩돼요'}
                      aside={<span className="tb-block-num is-ally">{fxTab.ally === 'skill' ? fxBoxCount(buffSkillCards, 'skill') : fxBoxCount(buffCards)}</span>}
                      index={1}
                    >
                      <FxTabs
                        side="ally"
                        value={fxTab.ally}
                        onChange={(v) => setFxTab((t) => ({ ...t, ally: v }))}
                        passiveCount={fxBoxCount(buffCards)}
                        skillCount={fxBoxCount(buffSkillCards, 'skill')}
                      />
                      {fxTab.ally === 'skill' ? (
                        <>
                          <SkillEffectList key="ally-skill" cards={buffSkillCards} side="ally" resolveHero={resolveHero} emptyText="스킬 · 발동으로 팀에 거는 버프가 없어요." />
                          <SelfBuffSection kind="skill" cards={selfSkillCards} teamSize={myHeroes.length} resolveHero={resolveHero} open={selfOpen} onToggle={setSelfOpen} />
                        </>
                      ) : (
                        <>
                          <EffectList key="ally-passive" cards={buffCards} side="ally" teamSize={myHeroes.length} resolveHero={resolveHero} onFind={findCard} emptyText="팀에 거는 패시브 버프가 없어요." />
                          <SelfBuffSection cards={selfCards} teamSize={myHeroes.length} resolveHero={resolveHero} open={selfOpen} onToggle={setSelfOpen} />
                        </>
                      )}
                    </Block>
                    <Block
                      tone="enemy"
                      icon="tbDebuff"
                      iconPlain={26}
                      title={isPve ? '보스에게 거는 디버프' : '상대에게 거는 디버프'}
                      sub={fxTab.enemy === 'skill' ? SKILL_TAB_SUB : '패시브 [상시] · 전투 시작 [N턴]'}
                      aside={<span className="tb-block-num is-enemy">{fxTab.enemy === 'skill' ? fxBoxCount(debuffSkillCards, 'skill') : fxBoxCount(debuffCards)}</span>}
                      index={2}
                    >
                      <FxTabs side="enemy" value={fxTab.enemy} onChange={(v) => setFxTab((t) => ({ ...t, enemy: v }))} passiveCount={fxBoxCount(debuffCards)} skillCount={fxBoxCount(debuffSkillCards, 'skill')} />
                      {fxTab.enemy === 'skill' ? (
                        <SkillEffectList key="enemy-skill" cards={debuffSkillCards} side="enemy" resolveHero={resolveHero} emptyText="스킬 · 발동으로 거는 디버프가 없어요." />
                      ) : (
                        <EffectList key="enemy-passive" cards={debuffCards} side="enemy" teamSize={myHeroes.length} resolveHero={resolveHero} onFind={findCard} emptyText={isPve ? '보스에게 거는 패시브 디버프가 없어요.' : '상대에게 거는 패시브 디버프가 없어요.'} />
                      )}
                    </Block>
                  </div>
                </div>
              )
            ) : null}

            {curView === 'enemy' ? (
              !hasTheirs ? (
                <div className="tb-empty tb-empty--big is-enemy">
                  <Icon name="tbEnemyDeck" size={28} />
                  <strong>상대 덱 칸을 눌러 영웅을 넣어 주세요</strong>
                  <span>상대가 우리 누구를 노리는지, 무엇을 조심할지 알려줘요.</span>
                </div>
              ) : (
                <div key="enemy" className="tb-view-body">
                  <Block tone="enemy" icon="tbThreat" iconPlain={44} title="상대 덱에서 조심할 것" sub="상대가 노리는 우리 영웅과 대비" index={0}>
                    <TargetStrip groups={threats.groups} resolveHero={resolveHero} />
                    <ThreatCards cards={threats.cards} resolveHero={resolveHero} emptyText="이 상대 덱에는 특정 영웅을 노리는 기믹이 없어요." />
                  </Block>
                </div>
              )
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
