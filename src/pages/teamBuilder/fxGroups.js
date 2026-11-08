/** 효과 목록 상자 묶기 — 패시브(`EffectList`) · 스킬 · 발동(`SkillEffectList`) 공용. 칸 숫자도 여기서 센다. */
import { effectRank } from '../../lib/teamBuilderAnalysis';

/** 패시브 카드 → 같은 영웅 · 같은 대상 흐름끼리 한 상자 (겹침 · 낭비 · 참고 문구가 있으면 혼자) */
export function groupEffectCards(cards) {
  const rows = [];
  const byFlow = new Map();
  for (const c of cards) {
    const applied = c.sources.filter((s) => s.applied);
    const solo = c.overlap || c.wasted || c.note || c.selfClash || applied.length !== 1;
    const s = applied[0];
    const fk = solo ? null : `${s.heroName}|${s.scope}|${s.skillLabel === '각성기'}|${(s.recipients || []).join(',')}`;
    if (fk && byFlow.has(fk)) {
      byFlow.get(fk).cards.push(c);
      continue;
    }
    const row = { id: c.id, applied, cards: [c] };
    if (fk) byFlow.set(fk, row);
    rows.push(row);
  }
  return rows;
}

/** 스킬 · 발동 카드 → 영웅 · 스킬 단위 상자 */
export function groupSkillCards(cards) {
  const map = new Map();
  for (const c of cards) {
    const s = c.sources[0];
    const k = `${s.heroName}|${s.skillName}`;
    if (!map.has(k)) map.set(k, { id: k, heroName: s.heroName, tag: s.skillTag, skillName: s.skillName, skillLabel: s.skillLabel, cards: [] });
    map.get(k).cards.push(c);
  }
  return [...map.values()];
}

/** 칸 숫자 = 화면에 보이는 상자 수 */
export function fxBoxCount(cards, kind) {
  return kind === 'skill' ? groupSkillCards(cards).length : groupEffectCards(cards).length;
}

/** 효과 카드 하나 → 표 한 칸의 재료. `srcs` = 펼친 줄(주는 영웅 · 스킬마다 — 목록 상자에 있던 스킬 · 지속 · 확률 · 조건) */
function partOf(c, applied, heroes) {
  return {
    id: c.id,
    value: c.value,
    timing: c.timing,
    turns: c.turns,
    heroes,
    skillTag: applied[0]?.skillTag || null,
    scope: applied[0]?.scope || '',
    stack: c.stack || null,
    recipients: c.recipients || null,
    srcs: applied.map((s) => ({
      id: s.id,
      heroName: s.heroName,
      value: s.value,
      skillLabel: s.skillLabel,
      skillName: s.skillName,
      skillTag: s.skillTag,
      scope: s.scope,
      condition: s.condition || c.condition || null,
    })),
    duration: c.duration || null,
    chance: c.chance || null,
    amountText: c.amountText || null,
    overlap: !!c.overlap,
    lost: c.sources.filter((s) => !s.applied).map((s) => ({ heroName: s.heroName, value: s.value })),
    overlapNote: c.overlapNote || null,
    wasted: !!c.wasted,
    note: c.note || null,
  };
}

/**
 * 효과별 총합 — 같은 이름 효과끼리 한 칸 (`fxLedger`가 패시브 · 액티브를 한 줄로 합침).
 * 패시브: [상시]와 전투 시작 [N턴]은 서로 중첩 → timing마다 적용 수치(같은 timing은 가장 높은 것)를 더함.
 * 액티브: 쓸 때 걸리는 효과라 같은 이름은 가장 높은 수치 하나 — 쓰는 영웅 · 스킬은 전부 `parts`에.
 * 수치 없는 효과(면역 · 반격 · 기절 …)는 `flags`로 이름 · 영웅만.
 */
export function fxTotals(cards, kind = 'passive') {
  const stats = new Map();
  const flags = new Map();
  for (const c of cards) {
    const label = String(c.label || c.name).replace(/\s*\(중첩\)$/, '');
    const applied = c.sources.filter((s) => s.applied);
    const heroes = [...new Set(applied.map((s) => s.heroName))];
    const part = partOf(c, applied, heroes);
    if (c.value == null) {
      if (!flags.has(label)) flags.set(label, { id: label, label, heroes: [], parts: [] });
      const f = flags.get(label);
      heroes.forEach((h) => { if (!f.heroes.includes(h)) f.heroes.push(h); });
      f.parts.push(part);
      continue;
    }
    if (!stats.has(label)) stats.set(label, { id: label, label, dir: c.dir, rank: effectRank(c.name), parts: [] });
    stats.get(label).parts.push(part);
  }
  const list = [...stats.values()].map((t) => {
    t.parts.sort((a, b) => (a.timing === 'perm' ? -1 : 0) - (b.timing === 'perm' ? -1 : 0) || b.value - a.value);
    let segs;
    if (kind === 'skill') {
      const best = t.parts.reduce((m, p) => (p.value > m.value ? p : m), t.parts[0]);
      segs = [{ id: best.id, value: best.value, timing: 'skill' }];
    } else {
      const byTiming = new Map();
      for (const p of t.parts) {
        const k = p.timing === 'start' ? `start|${p.turns ?? ''}` : p.timing;
        if (!byTiming.has(k) || p.value > byTiming.get(k).value) byTiming.set(k, p);
      }
      segs = [...byTiming.values()].map((p) => ({ id: p.id, value: p.value, timing: p.timing, turns: p.turns }));
    }
    const total = Math.round(segs.reduce((n, s) => n + s.value, 0) * 10) / 10;
    const heroes = [...new Set(t.parts.flatMap((p) => p.heroes))];
    const known = t.parts.every((p) => p.recipients);
    const recipients = known ? [...new Set(t.parts.flatMap((p) => p.recipients))] : null;
    return { ...t, segs, total, heroes, recipients };
  });
  list.sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label, 'ko'));
  const flagList = [...flags.values()].sort((a, b) => a.label.localeCompare(b.label, 'ko'));
  return { stats: list, flags: flagList };
}

/** 정렬 순서(effectRank) → 묶음 이름. 물리·마법·공통 공격 → 치명·약점 → 효과 적중·저항 → 방어 → 회복·생존 → 기타 */
const LEDGER_GROUPS = [
  { id: 'atk', label: '공격', max: 40 },
  { id: 'crit', label: '치명 · 약점', max: 60 },
  { id: 'eff', label: '효과 적중 · 저항', max: 90 },
  { id: 'def', label: '방어', max: 130 },
  { id: 'heal', label: '회복 · 생존', max: 150 },
  { id: 'etc', label: '기타', max: Infinity },
];

/**
 * 버프 · 디버프 칸 표(`FxLedger`) — 효과 이름 한 줄에 패시브 · 액티브 · 합계(= 패시브 + 액티브 가장 높은 것).
 * 수치 없는 효과는 `flags`(패시브 · 액티브 표시). `count` = 칸 머리 숫자(효과 가짓수).
 */
export function fxLedger(passiveCards, skillCards) {
  const passive = fxTotals(passiveCards || [], 'passive');
  const skill = fxTotals(skillCards || [], 'skill');
  const rows = new Map();
  const put = (t, kind) => {
    if (!rows.has(t.label)) rows.set(t.label, { id: t.label, label: t.label, dir: t.dir, rank: t.rank, passive: null, skill: null, heroes: [] });
    const r = rows.get(t.label);
    r[kind] = t;
    r.rank = Math.min(r.rank, t.rank);
    t.heroes.forEach((h) => { if (!r.heroes.includes(h)) r.heroes.push(h); });
  };
  passive.stats.forEach((t) => put(t, 'passive'));
  skill.stats.forEach((t) => put(t, 'skill'));
  const list = [...rows.values()].map((r) => {
    const parts = [...(r.passive?.parts || []), ...(r.skill?.parts || [])];
    return {
      ...r,
      total: Math.round(((r.passive?.total || 0) + (r.skill?.total || 0)) * 10) / 10,
      overlap: parts.some((p) => p.overlap),
      warn: parts.some((p) => p.wasted || p.note?.warn),
    };
  });
  list.sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label, 'ko'));
  const groups = [];
  for (const r of list) {
    const g = LEDGER_GROUPS.find((x) => r.rank < x.max) || LEDGER_GROUPS[LEDGER_GROUPS.length - 1];
    let cur = groups[groups.length - 1];
    if (!cur || cur.id !== g.id) groups.push((cur = { id: g.id, label: g.label, rows: [] }));
    cur.rows.push(r);
  }
  const flags = new Map();
  const flag = (f, kind) => {
    if (!flags.has(f.label)) flags.set(f.label, { id: f.label, label: f.label, passive: false, skill: false, heroes: [], parts: [] });
    const x = flags.get(f.label);
    x[kind] = true;
    f.heroes.forEach((h) => { if (!x.heroes.includes(h)) x.heroes.push(h); });
    f.parts.forEach((p) => x.parts.push({ ...p, kind }));
  };
  passive.flags.forEach((f) => flag(f, 'passive'));
  skill.flags.forEach((f) => flag(f, 'skill'));
  const flagList = [...flags.values()].sort((a, b) => a.label.localeCompare(b.label, 'ko'));
  return {
    groups,
    rows: list,
    flags: flagList,
    nPassive: list.filter((r) => r.passive).length + flagList.filter((f) => f.passive).length,
    nSkill: list.filter((r) => r.skill).length + flagList.filter((f) => f.skill).length,
    count: list.length + flagList.length,
  };
}
