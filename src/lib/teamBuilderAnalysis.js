/**
 * 팀 빌더 — 덱 영웅들의 스킬 효과를 읽어 아군 강화 / 적군 약화 / 특수 기믹 / 발동 조건 /
 * 동일 상시 효과 중복(높은 수치 하나만 적용)을 정리한다. 순수 함수 (React·Firebase 무관).
 *
 * 입력은 scraped_heroes.json 스키마의 영웅 객체:
 *   skills[].effects[] = { target, details[] }, skills[].skillEnhance[], skills[].transcendenceEffects{}, skills[].tooltips{}
 */
const ROLE_BY_KR = {
  공격형: 'offensive',
  마법형: 'magic',
  방어형: 'defensive',
  지원형: 'support',
  만능형: 'universal',
};

const CC_NAMES = new Set([
  '기절', '마비', '감전', '빙결', '빙극', '침묵', '수면', '깊은 수면', '석화', '실명', '공포', '오라', '혼란', '진탕',
]);
const DOT_NAMES = new Set(['출혈', '화상', '중독', '극독', '즉사', '출혈 폭발', '용염']);

const DURATION_TOKEN_RE = /^(상시|\d+\s*턴\s*지속|\d+\s*턴지속|\d+\s*턴|피격\s*\d+회|타격\s*\d+회|\d+%\s*확률|최대\s*\d+\s*(?:중첩|개)|전투당\s*\d+회\s*발동|해제 불가|\d+회 부여|피격 \d+회 감소)$/;

/* ───────────── 공통 유틸 ───────────── */

function normKey(name) {
  return String(name || '').replace(/\s*\(\s*중첩\s*\)\s*$/, '(중첩)').replace(/\s+/g, ' ').trim();
}

function cleanHeroName(name) {
  return String(name || '').replace('(각성)', '').trim();
}

export function skillSlotLabel(skill) {
  if (!skill) return '';
  if (skill.type === 'basic_attack') return '기본 공격';
  if (skill.type === 'passive') return '패시브';
  if (skill.type === 'awaken_skill' || skill.direction === 'awaken') return '각성기';
  if (skill.direction === 'upper') return '스킬1';
  if (skill.direction === 'down') return '스킬2';
  return '스킬';
}

function heroTooltips(hero) {
  const map = {};
  for (const s of hero?.skills || []) {
    for (const [k, v] of Object.entries(s.tooltips || {})) {
      if (k && v && !map[normKey(k)]) map[normKey(k)] = String(v);
    }
  }
  return map;
}

function lookupTooltip(tips, name) {
  const k = normKey(name);
  if (tips[k]) return tips[k];
  const bare = k.replace(/\(중첩\)$/, '').trim();
  if (tips[bare]) return tips[bare];
  if (tips[`${bare}(중첩)`]) return tips[`${bare}(중첩)`];
  return '';
}

/** 툴팁 문장 → { base, enhanced } 수치(%) */
function tooltipValue(tip) {
  const t = String(tip || '');
  const enhanced = t.match(/스킬\s*강화\s*시\s*([\d.]+)%/);
  const withoutEnh = t.replace(/\([^)]*스킬\s*강화[^)]*\)/g, '');
  const base = withoutEnh.match(/([\d.]+)%/);
  return {
    base: base ? Number(base[1]) : null,
    enhanced: enhanced ? Number(enhanced[1]) : null,
  };
}

/* ───────────── 대상(아군/적군) 해석 ───────────── */

export function targetSide(target) {
  const t = String(target || '');
  if (/적군|^적 |^적$/.test(t) && !/^자신|^아군|^모든 아군/.test(t)) return 'enemy';
  return 'ally';
}

function parseRoles(text) {
  const roles = [];
  for (const [kr, id] of Object.entries(ROLE_BY_KR)) {
    if (text.includes(kr)) roles.push(id);
  }
  return roles;
}

/** 대상 범위: self | all | roles | some (+ excludeSelf) */
export function targetScope(target) {
  const t = String(target || '').replace(/^.*발동 시\s*/, '').trim();
  const excludeSelf = /자신\s*제외/.test(t);
  const roles = parseRoles(t);
  if (t === '자신') return { kind: 'self', roles: [], includeSelf: true, excludeSelf: false };
  if (/^모든 (아군|적군)$/.test(t) || /^모든 .+형 (아군|적군)$/.test(t)) {
    return { kind: roles.length ? 'roles' : 'all', roles, includeSelf: false, excludeSelf };
  }
  if (roles.length && /^(아군|적군)\s*[(-]/.test(t)) {
    const includeSelf = /\(\s*자신\s*,/.test(t) || /자신,/.test(t);
    return { kind: 'roles', roles, includeSelf, excludeSelf };
  }
  if (/^자신,|^아군 \(자신, /.test(t)) {
    return { kind: 'some', roles, includeSelf: true, excludeSelf };
  }
  return { kind: 'some', roles, includeSelf: false, excludeSelf };
}

function scopeRecipients(scope, ownerName, team) {
  const names = team.map((h) => cleanHeroName(h.name));
  if (scope.kind === 'self') return [ownerName];
  if (scope.kind === 'all') return names.filter((n) => !(scope.excludeSelf && n === ownerName));
  if (scope.kind === 'roles') {
    const out = team
      .filter((h) => scope.roles.includes(h.role))
      .map((h) => cleanHeroName(h.name))
      .filter((n) => !(scope.excludeSelf && n === ownerName));
    if (scope.includeSelf && !out.includes(ownerName)) out.push(ownerName);
    return out;
  }
  return null;
}

/**
 * 같은 효과 겹침에서 높은 쪽(hi)이 낮은 쪽(lo)의 받는 대상을 전부 덮는지.
 * 덮을 때만 낮은 쪽이 통째로 반영 안 됨 — 일부만 겹치면 겹치는 대상만 높은 쪽을 받는다.
 */
function scopeCovers(hi, lo, team) {
  if (hi.side === 'ally') {
    const rh = scopeRecipients(hi.scope, hi.heroName, team);
    const rl = scopeRecipients(lo.scope, lo.heroName, team);
    return !!(rh && rl && rl.every((n) => rh.includes(n)));
  }
  if (hi.scope.kind === 'all') return true;
  if (hi.scope.kind !== 'roles' || lo.scope.kind !== 'roles') return false;
  return lo.scope.roles.every((x) => hi.scope.roles.includes(x));
}

/** 낮은 쪽(lo) 대상 중 높은 쪽들(higher)과 겹치는 아군 이름 — 모르면 null */
function sharedRecipients(higher, lo, team) {
  if (lo.side !== 'ally') return null;
  const rl = scopeRecipients(lo.scope, lo.heroName, team);
  if (!rl) return null;
  const union = new Set();
  for (const h of higher) {
    const rh = scopeRecipients(h.scope, h.heroName, team);
    if (!rh) return null;
    rh.forEach((n) => union.add(n));
  }
  return rl.filter((n) => union.has(n));
}

/* ───────────── 효과 한 줄 해석 ───────────── */

const DAMAGE_RE = /(공격력|생명력|방어력|속공)의\s*[\d.,]+%.*피해|추가\s*(?:관통\s*)?(?:방어 무시\s*)?(?:고정\s*)?피해|[\d,]+만큼\s*(?:\d+회\s*)?(?:추가\s*)?(?:관통\s*)?고정\s*피해|피해로 전환|줄어들 때마다|비례해 최대\s*[\d.]+%만큼 피해량 증가|추가 공격$/;
/** PvP 팀 빌더와 무관한 줄 (PvE 전용 · 사용 조건 안내) */
const SKIP_RE = /탑에서|보스|사용 가능$/;
/** PvE 모드(allowTower) — 보스 대상 효과(비스킷 「보스 대상 피해량 증가」)는 읽음 */
const SKIP_PVE_RE = /탑에서|사용 가능$/;

function stripBrackets(raw) {
  const tokens = [];
  const text = raw.replace(/\[([^\]]+)\]/g, (_, inner) => {
    const v = inner.trim();
    if (DURATION_TOKEN_RE.test(v)) {
      tokens.push(v);
      return ' ';
    }
    return v;
  });
  return { text, tokens };
}

function readTokens(tokens, raw) {
  let duration = null;
  let chance = null;
  let maxStack = null;
  for (const v of tokens) {
    let m;
    if (v === '상시') duration = { type: 'permanent', label: '상시' };
    else if ((m = v.match(/^(\d+)\s*턴\s*(?:지속)?$/))) duration = { type: 'turns', n: Number(m[1]), label: `${m[1]}턴` };
    else if ((m = v.match(/^피격\s*(\d+)회$/))) duration = { type: 'hits', n: Number(m[1]), label: `피격 ${m[1]}회` };
    else if ((m = v.match(/^타격\s*(\d+)회$/))) duration = { type: 'hits', n: Number(m[1]), label: `타격 ${m[1]}회` };
    else if ((m = v.match(/^(\d+)%\s*확률$/))) chance = Number(m[1]);
    else if ((m = v.match(/^최대\s*(\d+)\s*(중첩|개)$/))) maxStack = Number(m[1]);
  }
  const once = raw.match(/전투\s*당\s*(\d+)회\s*발동/);
  if (once && !duration) duration = { type: 'once', n: Number(once[1]), label: `전투당 ${once[1]}회` };
  return { duration, chance, maxStack, oncePerBattle: !!once };
}

function splitCondition(core) {
  const labeled = core.match(/^([^:]{2,30}?)\s*:\s+(.+)$/);
  if (labeled) {
    const inner = splitCondition(labeled[2].trim());
    const cond = [labeled[1].trim(), inner.condition].filter(Boolean).join(' · ');
    return { condition: cond, effect: inner.effect };
  }
  const m = core.match(/^(.*(?:\s시|발동시|사망시|사용시|되면|경우|않으면|이면|마다|발동 후|이하에서)),?\s+(.+)$/);
  if (!m) return { condition: null, effect: core };
  const cond = m[1].trim();
  if (!cond || cond.length < 3) return { condition: null, effect: core };
  return { condition: cond.replace(/,$/, ''), effect: m[2].trim() };
}

function splitAmount(head) {
  let h = head.trim()
    .replace(/^대상의\s+/, '')
    .replace(/^각 공격마다\s+/, '')
    .replace(/^해제한\s+(?:버프|디버프)\s*(?:\d+개당|개수만큼)\s*/, '')
    .replace(/^.*?에게\s+/, '')
    .replace(/^.*?소모하여\s+/, '');
  const exec = h.match(/생명력\s*([\d.]+%)\s*이하의 적을 즉시 처형/);
  if (exec) return { name: '처형', amount: `생명력 ${exec[1]} 이하` };
  const undying = h.match(/^(불사|불굴)\s*상태로 부활/);
  if (undying) return { name: undying[1], amount: null };
  if (/연속 발동/.test(h)) {
    const power = h.match(/(\d+)%\s*위력/);
    return { name: '연속 발동', amount: power ? `${power[1]}% 위력` : null };
  }
  h = h.replace(/^\d+%\s*위력으로\s*/, '');
  let m = h.match(/^(?:시전자\s*)?(.+?)의\s*([\d.,]+%)\s*만큼\s*(.+)$/);
  if (m) return { name: m[3].trim(), amount: `${m[1].trim()} ${m[2]}` };
  m = h.match(/^피해량의\s*([\d.]+%)\s*만큼\s*(.+)$/);
  if (m) return { name: m[2].trim(), amount: `피해량 ${m[1]}` };
  m = h.match(/^(?:시전자\s*)?(.+?)\s+([\d.,]+%)\s*만큼\s*(.+)$/);
  if (m) return { name: m[3].trim(), amount: `${m[1].trim()} ${m[2]}` };
  m = h.match(/생명력\s*([\d.]+%)\s*로\s*부활/);
  if (m) return { name: '부활', amount: `생명력 ${m[1]}` };
  m = h.match(/^(.+?)\s+([\d.,]+\s*(?:%|개|턴|초|중첩|회|명))$/);
  if (m) return { name: m[1].trim(), amount: m[2].replace(/\s+/g, '') };
  m = h.match(/^(.+?)\s+([\d.,]+)$/);
  if (m) return { name: m[1].trim(), amount: m[2] };
  return { name: h, amount: null };
}

/** 고유 이름이지만 실제로는 능력치 버프인 효과 → 표시 라벨 (예: 여포 용이무모 = 물리 공격력 증가, 마법 공격력 감소 동반) */
const NAMED_STAT_BUFFS = new Map([['용이무모', '물리 공격력']]);

function classify(name) {
  const n = name.replace(/\(중첩\)$/, '').trim();
  if (NAMED_STAT_BUFFS.has(n)) return 'stat';
  if (CC_NAMES.has(n)) return 'cc';
  if (DOT_NAMES.has(n)) return 'dot';
  if (/디버프 해제/.test(n)) return 'cleanse';
  if (/버프 해제|턴제 버프 감소|버프 차단|턴제 디버프 증가/.test(n)) return 'dispel';
  if (/회복 불가|받는 회복량 감소|받는 보호막 감소/.test(n)) return 'antiheal';
  if (/권능|부활|불사|불굴|축복|피해 면역|피해 무효화|보호막|생명력 회복|지속 회복|위장|링크|방호|수호령|감쇄|엄호|흡혈|행동 제어 면역|면역$/.test(n)) return 'survival';
  if (/증가|감소|취약|반사/.test(n)) return 'stat';
  return 'utility';
}

let entrySeq = 0;

function makeEntries({ hero, skill, target: rawTarget, raw, source, tips, rareSet, signatureKeys, enhanceValues, allowTower }) {
  let line = String(raw || '').trim();
  let target = rawTarget;
  const tower = /무한의 탑|시련의 탑/.test(String(target || '')) || /탑에서/.test(line);
  if (tower) {
    if (!allowTower) return [];
    line = line.replace(/^.*?탑에서\s*/, '');
    target = String(target || '').replace(/\s*\([^)]*(?:무한의 탑|시련의 탑)[^)]*\)/, '').trim();
  }
  if (!line || /^[*(]/.test(line) || (allowTower ? SKIP_PVE_RE : SKIP_RE).test(line)) return [];
  const isDamage = DAMAGE_RE.test(line);
  const markRefs = [...line.matchAll(/\[([^\]]+)\]\s*(?:상태|보유|\d+중첩 이상)/g)].map((m) => m[1].trim());
  if (isDamage) {
    const damage = {
      id: `e${(entrySeq += 1)}`,
      kind: 'damage',
      heroName: cleanHeroName(hero.name),
      heroId: hero.id,
      skillName: skill.name,
      skillLabel: skillSlotLabel(skill),
      source,
      target,
      side: targetSide(target),
      raw: line,
      markRefs,
      tower,
    };
    return [damage, ...embeddedEffects({ hero, skill, target, line, source, tips, rareSet, signatureKeys, enhanceValues })];
  }

  const { text, tokens } = stripBrackets(line);
  const notes = [];
  const core = text
    .replace(/\(([^)]*)\)/g, (_, inner) => {
      notes.push(inner.trim());
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
  const meta = readTokens(tokens, line);
  const { condition, effect } = splitCondition(core);
  const parts = effect.split(/\s+및\s+/).map((p) => p.trim()).filter(Boolean);
  const scope = targetScope(target);
  const side = targetSide(target);

  return parts.map((part) => {
    const split = splitAmount(part);
    let rawName = split.name;
    const { amount } = split;
    const textDur = rawName.match(/^(.+?)\s*지속\s*(\d+)턴$/);
    if (textDur) {
      rawName = textDur[1].trim();
      if (!meta.duration) meta.duration = { type: 'turns', n: Number(textDur[2]), label: `${textDur[2]}턴` };
    }
    const stacking = !!(meta.maxStack || (amount && /중첩$/.test(amount)) || /\(중첩\)$/.test(rawName));
    let pctInName = null;
    const pctMatch = rawName.match(/^(.+?)\s+([\d.]+)%$/);
    if (pctMatch) {
      rawName = pctMatch[1].trim();
      pctInName = Number(pctMatch[2]);
    }
    const baseName = rawName.replace(/\s*\d+중첩$/, '').trim();
    const name = baseName;
    /* 고유 이름 능력치 버프(여포 용이무모 = 물리 공격력 증가)는 그 능력치 효과와 같은 효과 — 같은 key라 겹치면 높은 수치 하나만(밍봉 2026-11-10) */
    const keyName = NAMED_STAT_BUFFS.has(baseName) ? `${NAMED_STAT_BUFFS.get(baseName)} 증가` : baseName;
    const key = stacking ? `${normKey(keyName).replace(/\(중첩\)$/, '')}(중첩)` : normKey(keyName);
    const category = classify(name);
    const tip = lookupTooltip(tips, stacking ? `${baseName}(중첩)` : baseName) || lookupTooltip(tips, baseName);
    const tv = category === 'cc' || category === 'dot' ? { base: null, enhanced: null } : tooltipValue(tip);
    const direct = amount && /^[\d.]+%$/.test(amount) ? Number(amount.replace('%', '')) : pctInName;
    const enhanced = enhanceValues?.get(normKey(baseName)) ?? null;
    const rare = rareSet?.has(stacking ? key : normKey(baseName));
    /** 공격 대상(적) 칸의 「치명타 확률 증가 100%」 · 「약점 공격 확률 증가」(지속 턴 없음) = 그 스킬 공격의 자기 적중 보너스, 적 디버프 아님 */
    const ownHit = side === 'enemy' && !meta.duration && /^(치명타 확률|약점 공격 확률)\s*증가$/.test(baseName);
    return {
      id: `e${(entrySeq += 1)}`,
      kind: 'effect',
      heroName: cleanHeroName(hero.name),
      heroId: hero.id,
      heroRole: hero.role,
      skillName: skill.name,
      skillLabel: skillSlotLabel(skill),
      skillType: skill.type,
      source,
      target,
      side: ownHit ? 'ally' : side,
      scope: ownHit ? targetScope('자신') : scope,
      ownHit,
      raw: line,
      name,
      key,
      category,
      special: (!!rare && category === 'utility') || !!signatureKeys?.has(normKey(baseName)),
      condition: ownHit ? [condition, '이 스킬 공격 때'].filter(Boolean).join(' · ') : condition,
      duration: meta.duration,
      chance: meta.chance,
      maxStack: meta.maxStack,
      stacking,
      amount,
      valueBase: direct ?? tv.base,
      valueEnhanced: enhanced ?? tv.enhanced,
      notes,
      tooltip: tip,
      markRefs,
      tower,
    };
  });
}

/**
 * 스킬 효과 목록. `effects`가 비어 있으면(나혼자만 레벨업 콜라보 등) 설명문 「[대상]」 줄 기준으로 나눠 읽는다.
 */
export function skillEffects(skill) {
  if (skill?.effects?.length) return skill.effects;
  const out = [];
  let cur = null;
  for (const raw of String(skill?.description || '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const t = line.match(/^\[([^\]]+)\]$/);
    if (t) {
      cur = { target: t[1].trim(), details: [] };
      out.push(cur);
      continue;
    }
    if (!cur) {
      cur = { target: '자신', details: [] };
      out.push(cur);
    }
    cur.details.push(line);
  }
  return out;
}

/** 피해 문장 괄호 안에 함께 적힌 효과 — 「자신 부활 시 … 발동 (… 피해 / 감전 [35% 확률] [2턴 지속])」 */
function embeddedEffects({ line, ...rest }) {
  const m = line.match(/^(.*?)\s+\((.+)\)\s*(?:※.*)?$/);
  if (!m) return [];
  const pre = m[1].replace(/[[\]]/g, '').replace(/,\s*/g, ' · ').trim();
  const subs = m[2].split(/\s+\/\s+|,\s+/).map((s) => s.trim()).filter((s) => s && /\[/.test(s) && !DAMAGE_RE.test(s));
  return subs.flatMap((sub) => makeEntries({ ...rest, raw: sub }).map((e) => ({
    ...e,
    raw: line,
    condition: [pre, e.condition].filter(Boolean).join(' · '),
  })));
}

/* ───────────── 강화 · 초월 ───────────── */

/**
 * 강화 · 초월 문장을 「 / 」로 나눈다. 머리말 없는 뒷부분은 앞 머리말(효과 추가 · 효과 상승 · 턴 상승)을 이어받고,
 * 문장 처음부터 머리말이 없으면 bare (예: 루디 2초월 「링크 [3턴 지속]」).
 */
function upgradeSegments(text) {
  const out = [];
  let seenHead = false;
  let head = null;
  for (const part of String(text || '').split(/\s+\/\s+/)) {
    const seg = part.trim();
    if (!seg) continue;
    const m = seg.match(/^([^:]+?)\s*:\s/);
    if (m) {
      seenHead = true;
      head = /(효과|회복)\s*추가$/.test(m[1]) ? '효과 추가' : /턴 상승$/.test(m[1]) ? '턴 상승' : /효과 상승$/.test(m[1]) ? '효과 상승' : null;
      out.push({ text: seg });
    } else if (head) {
      out.push({ text: `${head} : ${seg}` });
    } else {
      out.push({ text: seg, bare: !seenHead });
    }
  }
  return out;
}

const headedSegments = (text) => upgradeSegments(text).filter((s) => !s.bare).map((s) => s.text);

const TARGET_ALIAS = { '아군 전체': '모든 아군', '적군 전체': '모든 적군' };

/**
 * 강화 · 초월 「대상 수 변경」 · 「확률 상승」 · 「효과 변경(X이 … [Y]로 변경)」을 이미 읽은 효과에 반영.
 * 대상 수 변경은 같은 편의 첫 대상(자신 제외)을, 「빙극 효과 대상 적군 3명」처럼 효과를 지정하면 그 효과만 바꾼다.
 */
function applyUpgradeRules(entries, effects, segs) {
  for (const raw of segs) {
    const lead = raw.match(/^\s*(?:\[([^\]]+)\]|\(([^)]+)\))\s*/);
    const only = lead ? (lead[1] || lead[2]).trim() : null;
    const seg = lead ? raw.slice(lead[0].length) : raw;

    let m = seg.match(/^대상 수 변경\s*:\s*(.+)$/);
    if (m) {
      let text = m[1].trim();
      let effName = null;
      const sub = text.match(/^(.+?)\s*효과 대상\s+(.+)$/);
      if (sub) {
        effName = normKey(sub[1]);
        text = sub[2].trim();
      }
      const next = TARGET_ALIAS[text] || text;
      const side = targetSide(next);
      const primary = effects.find((g) => g.target !== '자신' && targetSide(g.target) === side)?.target;
      for (const e of entries) {
        const hit = effName ? e.kind === 'effect' && normKey(e.name) === effName : primary && e.target === primary;
        if (!hit) continue;
        e.target = next;
        if (e.kind === 'effect') e.scope = targetScope(next);
      }
      continue;
    }

    m = seg.match(/^확률 상승\s*:\s*(.+?)\s*(?:확률(?:\s*증가)?\s*)?(\d+(?:\.\d+)?)%/);
    if (m) {
      const name = normKey(m[1]);
      const v = Number(m[2]);
      const all = entries.filter((e) => e.kind === 'effect' && normKey(e.name).replace(/\(중첩\)$/, '') === name);
      const base = all.filter((e) => e.source === 'base');
      const pool = base.length ? base : all;
      const tKey = (t) => String(t || '').replace(/\s+|우선/g, '');
      const targets = only ? pool.filter((e) => tKey(e.target) === tKey(only)) : pool;
      for (const e of targets) if (e.chance == null || v > e.chance) e.chance = v;
      continue;
    }

    m = seg.match(/^효과 변경\s*:\s*(.+?)[이가]\s+.*?\[([^\]]+)\]\s*(?:으로|로)\s*변경/);
    if (m) {
      const from = normKey(m[1]);
      const to = m[2].trim();
      for (const e of entries) {
        if (e.kind !== 'effect' || normKey(e.name) !== from) continue;
        e.name = to;
        e.key = e.stacking ? `${normKey(to)}(중첩)` : normKey(to);
        e.category = classify(to);
      }
    }
  }
}

function readRaiseLines(lines, map) {
  for (const line of lines) {
    for (const seg of headedSegments(line)) {
      const m = seg.replace(/^\s*\[[^\]]+\]\s*/, '').match(/^효과 상승\s*:\s*(.+?)\s+([\d.]+)%/);
      if (!m) continue;
      const v = Number(m[2]);
      const k = normKey(m[1]);
      const keys = [k, k.replace(/\s+효과$/, '')];
      for (const key of new Set(keys)) if (!map.has(key) || v > map.get(key)) map.set(key, v);
    }
  }
}

/** 스킬 강화 · 초월 「효과 상승 : X N%」 → 효과별 최고 수치 */
function raisedValueMap(skill, includeEnhance, includeTranscend) {
  const map = new Map();
  if (includeEnhance) readRaiseLines(skill.skillEnhance || [], map);
  if (includeTranscend) readRaiseLines(Object.values(skill.transcendenceEffects || {}), map);
  return map;
}

/** 「턴 상승 : X [N턴 지속]」 · 「턴 상승 : X 지속 N턴」 → 효과별 최장 턴 */
function raisedTurnMap(skill, includeEnhance, includeTranscend) {
  const map = new Map();
  const lines = [
    ...(includeEnhance ? skill.skillEnhance || [] : []),
    ...(includeTranscend ? Object.values(skill.transcendenceEffects || {}) : []),
  ];
  for (const line of lines) {
    for (const seg of headedSegments(line)) {
      const m = seg.replace(/^\s*\[[^\]]+\]\s*/, '').match(/^턴 상승\s*:\s*(.+?)\s*(?:\[\s*(\d+)\s*턴\s*지속\s*\]|지속\s*(\d+)\s*턴)/);
      if (!m) continue;
      const k = normKey(m[1]);
      const n = Number(m[2] || m[3]);
      if (!map.has(k) || n > map.get(k)) map.set(k, n);
    }
  }
  return map;
}

/** "[자신] 효과 추가 : X" · "적군(공격형) 효과 추가 : X" · "효과 추가 : X" → [{ target, text }] */
function parseAddedEffects(text, fallbackTarget) {
  const out = [];
  let lastTarget = fallbackTarget;
  for (const seg of headedSegments(text)) {
    const m = seg.match(/^\s*(?:\[([^\]]+)\]|\(([^)]+)\)|([^:]*?))\s*(?:효과|회복)\s*추가\s*:\s*(.+)$/);
    if (!m) continue;
    const tgt = (m[1] || m[2] || m[3] || '').replace(/\s*-\s*$/, '').trim();
    if (tgt) lastTarget = tgt;
    out.push({ target: lastTarget, text: m[4].trim() });
  }
  return out;
}

/* ───────────── 메인 분석 ───────────── */

/** 전체 영웅 중 2명 이하만 가진 툴팁 키 = 고유 기믹 후보 */
export function buildRareEffectSet(allHeroes) {
  const owners = new Map();
  for (const h of allHeroes || []) {
    const keys = new Set();
    for (const s of h.skills || []) for (const k of Object.keys(s.tooltips || {})) keys.add(normKey(k));
    keys.forEach((k) => owners.set(k, (owners.get(k) || 0) + 1));
  }
  const rare = new Set();
  owners.forEach((n, k) => { if (n <= 2) rare.add(k); });
  return rare;
}

/** `allowTower` = 무한의 탑 · 시련의 탑 전용 줄도 읽기(`tower: true` 표시) — 도감 효과 요약 「탑 전용」 칸에서만 씀 */
export function collectHeroEntries(hero, { includeEnhance = true, includeTranscend = true, rareSet, signatureKeys, allowTower = false } = {}) {
  if (!hero) return [];
  const tips = heroTooltips(hero);
  const out = [];
  const common = { hero, tips, rareSet, signatureKeys, allowTower };
  const noDirection = !(hero.skills || []).some((s) => s.type === 'active' && s.direction);
  let activeIdx = 0;
  for (const raw of hero.skills || []) {
    const skill = noDirection && raw.type === 'active'
      ? { ...raw, direction: activeIdx === 0 ? 'upper' : 'down' }
      : raw;
    if (raw.type === 'active') activeIdx += 1;
    const enhanceValues = raisedValueMap(skill, includeEnhance, includeTranscend);
    const turnRaise = raisedTurnMap(skill, includeEnhance, includeTranscend);
    const effects = skillEffects(skill);
    const firstTarget = effects[0]?.target || '자신';
    const skillEntries = [];
    for (const eff of effects) {
      let target = eff.target;
      for (const raw of eff.details || []) {
        if (/탑에서\s*아래 효과/.test(raw)) {
          target = `${eff.target} (무한의 탑, 시련의 탑)`;
          continue;
        }
        skillEntries.push(...makeEntries({ ...common, skill, target, raw, source: 'base', enhanceValues }));
      }
    }
    if (includeEnhance) {
      for (const line of skill.skillEnhance || []) {
        for (const add of parseAddedEffects(line, firstTarget)) {
          skillEntries.push(...makeEntries({ ...common, skill, target: add.target, raw: add.text, source: '강화', enhanceValues }));
        }
      }
    }
    if (includeTranscend) {
      for (const [tier, text] of Object.entries(skill.transcendenceEffects || {})) {
        for (const add of parseAddedEffects(text, firstTarget)) {
          skillEntries.push(...makeEntries({ ...common, skill, target: add.target, raw: add.text, source: tier, enhanceValues }));
        }
      }
    }
    const bareLines = [
      ...(includeEnhance ? (skill.skillEnhance || []).map((t) => ['강화', t]) : []),
      ...(includeTranscend ? Object.entries(skill.transcendenceEffects || {}) : []),
    ].flatMap(([source, t]) => upgradeSegments(t).filter((s) => s.bare && !/효과 상승$/.test(s.text)).map((s) => [source, s.text]));
    for (const [source, text] of bareLines) {
      skillEntries.push(...makeEntries({ ...common, skill, target: firstTarget, raw: text, source, enhanceValues }).filter((e) => e.kind === 'effect'));
    }
    applyUpgradeRules(skillEntries, effects, [
      ...(includeEnhance ? skill.skillEnhance || [] : []),
      ...(includeTranscend ? Object.values(skill.transcendenceEffects || {}) : []),
    ].flatMap((t) => upgradeSegments(t).map((s) => s.text)));
    if (turnRaise.size) {
      for (const e of skillEntries) {
        const n = e.kind === 'effect' && e.duration?.type === 'turns' ? turnRaise.get(normKey(e.name)) : null;
        if (n && n > e.duration.n) e.duration = { type: 'turns', n, label: `${n}턴` };
      }
    }
    out.push(...skillEntries);
  }
  return out;
}

export function entryValue(entry, includeEnhance = true) {
  if (includeEnhance && entry.valueEnhanced != null) return entry.valueEnhanced;
  return entry.valueBase;
}

function groupEntries(entries) {
  const map = new Map();
  for (const e of entries) {
    if (!map.has(e.key)) map.set(e.key, { key: e.key, name: e.name, category: e.category, special: false, entries: [] });
    const g = map.get(e.key);
    g.entries.push(e);
    if (e.special) g.special = true;
  }
  return [...map.values()];
}

const CATEGORY_ORDER = ['stat', 'survival', 'cleanse', 'dispel', 'antiheal', 'cc', 'dot', 'special', 'utility'];

function sortGroups(groups) {
  const heroCount = (g) => new Set(g.entries.map((e) => e.heroName)).size;
  const hasPerm = (g) => (g.entries.some((e) => e.duration?.type === 'permanent') ? 1 : 0);
  return groups.sort((a, b) => {
    const ca = CATEGORY_ORDER.indexOf(a.category);
    const cb = CATEGORY_ORDER.indexOf(b.category);
    if (ca !== cb) return ca - cb;
    if (heroCount(b) !== heroCount(a)) return heroCount(b) - heroCount(a);
    if (hasPerm(b) !== hasPerm(a)) return hasPerm(b) - hasPerm(a);
    if (b.entries.length !== a.entries.length) return b.entries.length - a.entries.length;
    return a.name.localeCompare(b.name, 'ko');
  });
}

/**
 * 'perm' = [상시] · 'start' = 패시브에서 조건 없이 거는 [N턴] (전투 시작 시 적용) · null = 그 외.
 * 같은 효과라도 [상시] 와 [N턴] 은 서로 중첩되고, 같은 종류끼리만 높은 수치 하나만 적용된다.
 */
export function effectTiming(e) {
  if (e.kind !== 'effect' || !e.duration) return null;
  if (e.duration.type === 'permanent') return 'perm';
  if (
    e.duration.type === 'turns'
    && e.skillType === 'passive'
    && !e.condition
    && !/발동 시/.test(String(e.target || ''))
    && e.category !== 'cc'
    && e.category !== 'dot'
  ) return 'start';
  return null;
}

/**
 * 동일 효과 · 같은 timing(둘 다 [상시] 또는 둘 다 전투 시작 [N턴]) · 서로 다른 영웅 → 받는 대상이 겹치면 높은 수치 하나만 적용.
 * 대상이 '일부'(단일·N명 등)면 겹칠 수 있음(possible).
 */
function findOverlaps(groups, team, side, includeEnhance, timing = 'perm') {
  const overlaps = [];
  for (const g of groups) {
    const perm = g.entries.filter((e) => effectTiming(e) === timing && e.category !== 'special');
    const heroes = new Set(perm.map((e) => e.heroName));
    if (heroes.size < 2) continue;

    const pairs = [];
    for (let i = 0; i < perm.length; i += 1) {
      for (let j = i + 1; j < perm.length; j += 1) {
        const a = perm[i];
        const b = perm[j];
        if (a.heroName === b.heroName) continue;
        let overlap = null;
        if (side === 'ally') {
          const ra = scopeRecipients(a.scope, a.heroName, team);
          const rb = scopeRecipients(b.scope, b.heroName, team);
          if (ra && rb) {
            const inter = ra.filter((n) => rb.includes(n));
            if (inter.length) overlap = { certain: true, recipients: inter };
          } else {
            overlap = { certain: false, recipients: [] };
          }
        } else {
          const sa = a.scope;
          const sb = b.scope;
          if (sa.kind === 'all' && sb.kind === 'all') overlap = { certain: true, recipients: [] };
          else if (sa.kind === 'some' || sb.kind === 'some') overlap = { certain: false, recipients: [] };
          else {
            const ra = sa.kind === 'all' ? Object.values(ROLE_BY_KR) : sa.roles;
            const rb = sb.kind === 'all' ? Object.values(ROLE_BY_KR) : sb.roles;
            if (ra.some((r) => rb.includes(r))) overlap = { certain: true, recipients: [] };
          }
        }
        if (overlap) pairs.push({ a, b, ...overlap });
      }
    }
    if (!pairs.length) continue;

    const involved = [...new Set(pairs.flatMap((p) => [p.a, p.b]))];
    const ranked = [...involved].sort((x, y) => (entryValue(y, includeEnhance) ?? -1) - (entryValue(x, includeEnhance) ?? -1));
    const best = ranked[0];
    const bestValue = entryValue(best, includeEnhance);
    const allKnown = ranked.every((e) => entryValue(e, includeEnhance) != null);
    const certain = pairs.some((p) => p.certain);
    const recipients = [...new Set(pairs.flatMap((p) => p.recipients))];
    overlaps.push({
      key: g.key,
      name: g.name,
      side,
      timing,
      certain,
      recipients,
      entries: ranked,
      bestId: allKnown ? best.id : null,
      bestValue: allKnown ? bestValue : null,
      tie: allKnown && ranked.length > 1 && entryValue(ranked[1], includeEnhance) === bestValue,
    });
  }
  return overlaps;
}

/** 같은 효과에 [상시] + [N턴] 이 함께 있으면 중첩 적용 */
function findStackables(groups) {
  const out = [];
  for (const g of groups) {
    const perm = g.entries.filter((e) => e.duration?.type === 'permanent');
    const timed = g.entries.filter((e) => e.duration && e.duration.type !== 'permanent');
    if (perm.length && timed.length) out.push({ key: g.key, name: g.name, perm, timed });
  }
  return out;
}

function triggerType(cond) {
  const c = String(cond || '');
  if (/전투 시작/.test(c)) return '전투 시작';
  if (/권능 발동/.test(c)) return '권능 발동';
  if (/사망|부활|불사 발동/.test(c)) return '사망 · 부활';
  if (/생명력이\s*\d+%\s*이하/.test(c)) return '생명력 조건';
  if (/처치/.test(c)) return '처치';
  if (/피격|적중 당할|공격에 \d+회/.test(c)) return '피격';
  if (/상태일 경우|보유|중첩 이상/.test(c)) return '대상 상태';
  if (/발동 시|회 발동|공격 시|기본 공격/.test(c)) return '반복 발동';
  if (/행동 제어에 걸릴|디버프 해제 시/.test(c)) return '상태 변화';
  return '조건';
}

/**
 * @param {object[]} team 덱 영웅 객체
 * @param {{ includeEnhance?: boolean, includeTranscend?: boolean, rareSet?: Set<string> }} opts
 */
export function analyzeTeam(team, opts = {}) {
  const includeEnhance = opts.includeEnhance !== false;
  const list = (team || []).filter(Boolean);
  const entries = list.flatMap((h) => collectHeroEntries(h, { ...opts, includeEnhance }));
  const effects = entries.filter((e) => e.kind === 'effect');

  const allyEffects = effects.filter((e) => e.side === 'ally');
  const enemyEffects = effects.filter((e) => e.side === 'enemy');
  const allyGroups = sortGroups(groupEntries(allyEffects));
  const enemyGroups = sortGroups(groupEntries(enemyEffects));

  /** 팀 버프끼리만 겹침 판정 — 「자신」 전용 효과는 본인만 받으므로 팀 버프를 가리지 않음 (effectCards selfClash에서 따로) */
  const teamGroups = allyGroups.map((g) => ({ ...g, entries: g.entries.filter((e) => e.scope.kind !== 'self') }));
  const overlaps = [
    ...findOverlaps(teamGroups, list, 'ally', includeEnhance, 'perm'),
    ...findOverlaps(enemyGroups, list, 'enemy', includeEnhance, 'perm'),
    ...findOverlaps(teamGroups, list, 'ally', includeEnhance, 'start'),
    ...findOverlaps(enemyGroups, list, 'enemy', includeEnhance, 'start'),
  ];
  const stackables = [...findStackables(allyGroups), ...findStackables(enemyGroups)];

  const specialEntries = effects.filter((e) => e.special);
  const specialMap = new Map();
  for (const e of specialEntries) {
    const k = `${e.heroName}|${e.key}`;
    if (!specialMap.has(k)) {
      specialMap.set(k, {
        id: k,
        heroName: e.heroName,
        heroId: e.heroId,
        key: e.key,
        name: e.name,
        tooltip: e.tooltip,
        entries: [],
        related: [],
      });
    }
    specialMap.get(k).entries.push(e);
  }
  const markRelated = entries.filter((e) => e.markRefs?.length);
  for (const sp of specialMap.values()) {
    const bare = sp.name.replace(/\(중첩\)$/, '').trim();
    sp.related = markRelated.filter((e) => e.heroName === sp.heroName && e.markRefs.some((m) => m.includes(bare)));
  }
  const specials = [...specialMap.values()];

  const triggers = effects
    .filter((e) => e.condition)
    .map((e) => ({ ...e, triggerType: triggerType(e.condition) }));

  return {
    entries,
    allyGroups,
    enemyGroups,
    overlaps,
    stackables,
    specials,
    triggers,
    counts: {
      ally: allyGroups.length,
      enemy: enemyGroups.length,
      overlap: overlaps.length,
      special: specials.length,
      trigger: triggers.length,
    },
  };
}

/* ───────────── 효과 카드 (패시브 [상시] + 전투 시작 [N턴]) ───────────── */

function isTableEntry(e) {
  return !!effectTiming(e) && !e.special && e.category !== 'utility';
}

/** 수치 버프는 아니지만 아군 쪽에서 꼭 보여야 하는 전투 메커니즘 (반격 · 협공 · 도발 · 관통 · 쿨타임 초기화) */
const MECHANIC_BUFFS = new Set(['반격', '협공', '도발', '관통', '스킬 쿨타임 초기화', '쿨타임 초기화', '모든 스킬 쿨타임 초기화']);
function isMechanicBuff(e) {
  return e.kind === 'effect' && e.side === 'ally' && MECHANIC_BUFFS.has(String(e.name).replace(/\(중첩\)$/, '').trim());
}

/**
 * 「자기 자신만 받는 버프 · 패시브」 — 자신 대상 [상시] · 전투 시작 [N턴] 전부(수치 버프 + 반격 · 협공 같은 메커니즘 + 고유 기믹).
 * 행동 제어 · 지속 피해 · 해제와 문장 조각(「…숫자만큼」)은 뺌.
 */
export function isSelfPassiveEntry(e) {
  return e.kind === 'effect'
    && e.side === 'ally'
    && e.scope?.kind === 'self'
    && !!effectTiming(e)
    && !['cc', 'dot', 'dispel', 'cleanse'].includes(e.category)
    && !isTextFragment(e);
}

/** 문장을 잘못 자른 조각(「…숫자만큼 추가 중첩」 · 「아래 효과 부여」) — 화면에 안 냄 */
function isTextFragment(e) {
  return /숫자만큼|아래 효과/.test(String(e.name));
}

/** 적에게 거는 상태 이상 — 행동 제어(기절 · 감전 · 공포 …) · 지속 피해(극독 · 중독 · 화상 …) */
const STATUS_CATEGORIES = new Set(['cc', 'dot']);

/** 패시브 고유 기믹 중 팀 · 적에게 거는 [상시] · 전투 시작 (칠흑의 낙인 · 전뢰의 표식 …) — 패시브 탭에 이름으로 표시, 겹침 판정 없음 */
function isPassiveSpecialEntry(e) {
  return e.kind === 'effect' && e.special && !!effectTiming(e) && e.scope?.kind !== 'self' && !isTextFragment(e);
}

/** 뱃지 수치 — 메커니즘(반격 [38% 확률] 등)은 수치 대신 발동 확률 */
function fxValue(e, includeEnhance = true) {
  const v = entryValue(e, includeEnhance);
  if (v != null) return v;
  return (e.special || e.category === 'utility') && e.chance != null ? e.chance : null;
}

/** 비슷한 효과끼리 붙여 놓기 위한 정렬 순서 (물리 공격력·피해량 → 마법 공격력·피해량 → 공통 → 치명/약점 → 효과 → 방어 → 회복 → 면역) */
const EFFECT_FAMILIES = [
  [/^물리\s*(공격력|피해량|취약)/, ['공격력', '피해량', '취약']],
  [/^마법\s*(공격력|피해량|취약)/, ['공격력', '피해량', '취약']],
  [/^(모든 공격력|피해량|취약)/, ['모든 공격력', '피해량', '취약']],
  [/^(\d)인 공격기 피해량/, ['1', '3', '5']],
  [/^치명타 (확률|피해)/, ['확률', '피해']],
  [/^약점 공격 (확률|피해)/, ['확률', '피해']],
  [/^(효과 적중|효과 적용 확률)/, ['효과 적중', '효과 적용 확률']],
  [/^.+ 효과 적용 확률/, null],
  [/^효과 저항/, null],
  [/^방어력/, null],
  [/^막기 확률/, null],
  [/^(방호|.*감쇄)$/, null],
  [/^받는 /, null],
  [/회복|흡혈|보호막|링크/, null],
  [/면역$/, null],
];

export function effectRank(name) {
  const n = String(name || '').replace(/\(중첩\)$/, '').trim();
  for (let i = 0; i < EFFECT_FAMILIES.length; i += 1) {
    const [re, subs] = EFFECT_FAMILIES[i];
    const m = n.match(re);
    if (!m) continue;
    if (!subs) return i * 10;
    const idx = subs.indexOf(m[1] ?? '');
    return i * 10 + (idx === -1 ? subs.length : idx);
  }
  return 999;
}

/**
 * 스킬 대상 원문 → 누구에게 걸리는지 한눈에: 「자신」→ 자신만 · 「모든 아군」→ 아군 전체 · 「단일 적군」→ 적 1명 ·
 * 「아군(공격형, 만능형)」→ 아군 공격형·만능형만 · 「아군 (자신, 마법형)」→ 자신 + 아군 마법형 · 「반격 발동 시 단일 적군」→ 반격 때 · 적 1명
 */
export function targetLabel(target) {
  let t = String(target || '').trim();
  let pre = '';
  const trig = t.match(/^(.+?)\s*발동 시\s+(.+)$/);
  if (trig) {
    pre = `${trig[1]} 때 · `;
    t = trig[2];
  }
  if (t === '자신') return `${pre}자신만`;
  if (t === '모든 아군') return `${pre}아군 전체`;
  if (t === '모든 적군' || t === '적군') return `${pre}적 전체`;
  let m = t.match(/^모든 (.+형) (아군|적군)$/);
  if (m) return `${pre}${m[2] === '아군' ? '아군' : '적'} ${m[1]} 전원`;
  m = t.match(/^아군\s*\(\s*자신\s*,\s*(.+)\)$/);
  if (m) return `${pre}자신 + ${/^아군/.test(m[1]) || /아군$/.test(m[1]) ? m[1] : `아군 ${m[1]}`}`;
  t = t
    .replace(/^자신,\s*/, '자신 + ')
    .replace(/^단일 적군/, '적 1명')
    .replace(/^단일 아군/, '아군 1명')
    .replace(/적군/g, '적')
    .replace(/^(아군|적) (전열|후열)\s*\(\s*(.+형)\s*\)/, '$1 $2 $3만')
    .replace(/^(아군|적)\s*\(\s*([^)]*형)\s*\)/, (_, who, roles) => `${who} ${roles.replace(/\s*,\s*/g, '·')}만`)
    .replace(/^아군 - (.+형)$/, '아군 $1만')
    .replace(/^(아군|적) (전열|후열)$/, '$1 $2만')
    .replace(/\s*\(\s*/g, ' (')
    .replace(/\s*\)/g, ')');
  return `${pre}${t.trim()}`;
}

function scopeText(e) {
  const who = e.side === 'ally' ? '아군' : '적';
  if (e.scope.kind === 'self') return '자신만';
  if (e.scope.kind === 'all') return `${who} 전체`;
  if (e.scope.kind === 'roles') return `${who} ${e.scope.roles.map((r) => ROLE_LABEL_KR[r]).join('·')}${e.scope.includeSelf ? ' + 자신' : ''}`;
  return targetLabel(e.target) || '일부';
}

/** "마법 공격력 증가" → { label: '마법 공격력', dir: 'up' } */
export function effectLabel(name) {
  const n = String(name || '').trim();
  if (NAMED_STAT_BUFFS.has(n)) return { label: `${n} (${NAMED_STAT_BUFFS.get(n)})`, dir: 'up' };
  /** 쿨타임 · 즉사 턴은 감소가 이득일 때도 있어 ▲▼로 바꾸면 헷갈림 → 이름 그대로 */
  if (/쿨타임|즉사 턴/.test(n)) return { label: n.replace(/\s*효과$/, ''), dir: null };
  let m = n.match(/^(.+?)\s*증가$/);
  if (m) return { label: m[1], dir: 'up' };
  m = n.match(/^(.+?)\s*감소$/);
  if (m) return { label: m[1], dir: 'down' };
  return { label: n, dir: null };
}

/**
 * 화면에 보이는 효과 이름 — 「방어력 감소」처럼 증가 · 감소를 붙인 원래 이름 (▲▼ 방향은 effectLabel의 dir로 따로).
 * 팀 빌더 목록 · 효과로 찾기 · 효과 사전 · 도감 효과 요약 모두 이것만 쓴다.
 */
export function listLabel(name) {
  const n = String(name || '').trim();
  if (NAMED_STAT_BUFFS.has(n)) return effectLabel(n).label;
  return n.replace(/(증가|감소)\s*효과$/, '$1');
}

/** 수치 뱃지 — 이름에 증가 · 감소가 붙어 있으면 부호 없이(「방어력 감소 29%」), 아니면 ▲▼ 방향대로 +/− */
export function fmtFxValue(value, label, dir) {
  return fmtValue(value, /(증가|감소)\s*(\([^)]*\))?$/.test(String(label || '')) ? null : dir);
}

/* ───────────── 전설 장신구 (불사 · 권능 · 부활) ───────────── */

export const LEGEND_RINGS = ['불사', '권능', '부활'];

/**
 * 영웅 패시브가 자신에게 거는 불사 · 권능 · 부활 → 같은 반지는 효과 없음.
 * @returns {{ [ring]: { source: '' | '강화' | '2초월' | '6초월' } }}
 */
export function ownRevivals(hero) {
  const out = {};
  for (const e of collectHeroEntries(hero)) {
    if (e.kind !== 'effect' || e.skillType !== 'passive' || !LEGEND_RINGS.includes(e.name)) continue;
    if (!(e.scope.kind === 'self' || /^자신/.test(String(e.target || '')))) continue;
    const source = e.source === 'base' ? '' : e.source;
    if (!out[e.name] || source === '') out[e.name] = { source };
  }
  return out;
}

/** 25, 'up' → "+25%" · 'down' → "−25%" · 수치 없음 → "적용" */
export function fmtValue(v, dir) {
  if (v == null) return '적용';
  if (dir === 'up') return `+${v}%`;
  if (dir === 'down') return `−${v}%`;
  return `${v}%`;
}

/**
 * 패시브 효과 카드 — 우리 팀이 받는 버프 / 상대에게 거는 디버프. [상시] 와 전투 시작 [N턴] 은 서로 다른 카드(중첩 적용).
 * 자신 전용 효과(대상 「자신」)는 팀 목록에 넣지 않는다.
 * `selfOnly` = 자신 전용 버프만 (버프 칸 아래 「자기 자신만 받는 버프」) — 영웅별 카드. 같은 효과 · 같은 timing의 팀 버프를
 * 본인도 받으면 `selfClash` (본인은 높은 수치 하나만 받음).
 * sources: 주는 영웅별 한 줄 (applied=false 면 같은 종류끼리 겹쳐 적용 안 됨)
 */
export function effectCards(analysis, team, includeEnhance = true, { selfOnly = false } = {}) {
  const pool = analysis.entries.filter((e) => isTableEntry(e) || isPassiveSpecialEntry(e) || (selfOnly && isSelfPassiveEntry(e)));
  const teamPool = pool.filter((e) => e.side === 'ally' && e.scope.kind !== 'self');
  const selfClashFor = (e) => {
    const best = new Map();
    for (const t of teamPool) {
      if (t.key !== e.key || t.heroName === e.heroName || effectTiming(t) !== effectTiming(e)) continue;
      const to = scopeRecipients(t.scope, t.heroName, team);
      if (to && !to.includes(e.heroName)) continue;
      const prev = best.get(t.heroName);
      if (!prev || (entryValue(t, includeEnhance) ?? -1) > (entryValue(prev, includeEnhance) ?? -1)) best.set(t.heroName, t);
    }
    if (!best.size) return null;
    const others = [...best.values()].map((t) => ({ heroName: t.heroName, value: entryValue(t, includeEnhance) }));
    const selfValue = entryValue(e, includeEnhance);
    const known = selfValue != null && others.every((o) => o.value != null);
    return { others, selfWins: known ? selfValue >= Math.max(...others.map((o) => o.value)) : null };
  };
  const rows = new Map();
  for (const e of pool) {
    const ownOnly = e.side === 'ally' && e.scope.kind === 'self';
    if (ownOnly !== selfOnly) continue;
    const timing = effectTiming(e);
    const rk = `${selfOnly ? `${e.heroName}|` : ''}${e.side}|${e.key}|${timing}`;
    if (!rows.has(rk)) rows.set(rk, { id: rk, key: e.key, name: e.name, side: e.side, timing, byHero: new Map() });
    const row = rows.get(rk);
    /* 줄 이름은 일반 효과 이름(「물리 공격력 증가」) — 용이무모만 있으면 「용이무모 (물리 공격력)」 그대로 */
    if (NAMED_STAT_BUFFS.has(row.name) && !NAMED_STAT_BUFFS.has(e.name)) row.name = e.name;
    const prev = row.byHero.get(e.heroName);
    if (!prev || (entryValue(e, includeEnhance) ?? -1) > (entryValue(prev, includeEnhance) ?? -1)) row.byHero.set(e.heroName, e);
  }
  const overlapByKey = new Map(selfOnly ? [] : analysis.overlaps.map((o) => [`${o.side}|${o.key}|${o.timing}`, o]));
  const cards = [...rows.values()].map((r) => {
    const overlap = overlapByKey.get(r.id) || null;
    const lostIds = new Set();
    const partialNotes = [];
    if (overlap?.bestId) {
      const ranked = overlap.entries;
      const best = ranked.find((x) => x.id === overlap.bestId);
      const val = (x) => fmtValue(entryValue(x, includeEnhance), effectLabel(r.name).dir);
      ranked.forEach((x, i) => {
        if (x.id === overlap.bestId) return;
        const higher = ranked.slice(0, i);
        if (higher.some((h) => scopeCovers(h, x, team))) {
          lostIds.add(x.id);
          return;
        }
        const inter = sharedRecipients(higher, x, team);
        if (inter && !inter.length) return;
        const who = inter ? `${inter.join(' · ')}에게는` : `${best.heroName} 대상(${scopeText(best)})과 겹치는 ${x.side === 'enemy' ? '적' : '영웅'}은`;
        partialNotes.push(`${who} ${best.heroName} ${val(best)}, 나머지는 ${x.heroName} ${val(x)}가 적용돼요.`);
      });
    }
    const sources = [...r.byHero.values()]
      .map((e) => {
        const recipients = e.side === 'ally' ? scopeRecipients(e.scope, e.heroName, team) : null;
        return {
          id: e.id,
          heroName: e.heroName,
          value: fxValue(e, includeEnhance),
          scope: scopeText(e),
          scopeKind: e.scope.kind,
          scopeRoles: e.scope.kind === 'roles' ? e.scope.roles : null,
          recipients,
          applied: !lostIds.has(e.id),
          skillLabel: e.skillLabel,
          skillName: e.skillName,
          condition: e.condition,
          turns: e.duration?.type === 'turns' ? e.duration.n : null,
          tower: !!e.tower,
        };
      })
      .sort((a, b) => Number(b.applied) - Number(a.applied) || (b.value ?? -1) - (a.value ?? -1));
    const top = sources.find((s) => s.applied) || sources[0];
    const known = sources.filter((s) => s.applied && s.recipients);
    const recipients = known.length === sources.filter((s) => s.applied).length
      ? [...new Set(known.flatMap((s) => s.recipients))]
      : null;
    const { dir } = effectLabel(r.name);
    const label = listLabel(r.name);
    return {
      id: r.id,
      key: r.key,
      name: r.name,
      label,
      dir,
      side: r.side,
      timing: r.timing,
      turns: r.timing === 'start' ? (top?.turns ?? null) : null,
      value: top?.value ?? null,
      sources,
      recipients,
      overlap: overlap ? { certain: overlap.certain, tie: overlap.tie } : null,
      overlapNote: partialNotes.length ? partialNotes.join(' ') : null,
      selfClash: selfOnly && r.byHero.size ? selfClashFor([...r.byHero.values()][0]) : null,
      wasted: !selfOnly && r.side === 'ally' && recipients != null && recipients.length === 0,
      tower: sources.some((s) => s.applied && s.tower),
    };
  });
  const heroOrder = (c) => {
    const i = (team || []).findIndex((h) => h && cleanHeroName(h.name) === c.sources[0]?.heroName);
    return i === -1 ? 99 : i;
  };
  return cards.sort((a, b) => {
    if (selfOnly && heroOrder(a) !== heroOrder(b)) return heroOrder(a) - heroOrder(b);
    if (a.side !== b.side) return a.side === 'ally' ? -1 : 1;
    const ra = effectRank(a.name);
    const rb = effectRank(b.name);
    if (ra !== rb) return ra - rb;
    if (a.key !== b.key) return a.label.localeCompare(b.label, 'ko');
    return a.timing === 'perm' ? -1 : 1;
  });
}

const SKILL_CARD_CATEGORIES = new Set(['stat', 'survival', 'antiheal']);

/** 스킬 · 발동 카드 이름 · 수치 문구 — 「불굴 효과의 피격 횟수 1회 증가」 → 불굴 피격 횟수 증가 · 1회 등 (표시 전용) */
function skillCardText(e, value) {
  const base = { ...effectLabel(e.name), label: listLabel(e.name) };
  let m = e.name.match(/^(.+?) 효과의 피격 횟수 (\d+)회 증가$/);
  if (m) return { ...base, label: `${m[1]} 피격 횟수 증가`, dir: 'up', amountText: `${m[2]}회` };
  m = e.name.match(/^(\d+)레벨 증가 최대 (\d+)레벨/);
  if (m) return { ...base, label: '레벨 증가', dir: 'up', amountText: `${m[1]}레벨 · 최대 ${m[2]}레벨` };
  const stackAmount = e.amount && /중첩$/.test(e.amount);
  let amountText = value == null && e.amount && !stackAmount ? String(e.amount) : null;
  if (amountText) {
    amountText = amountText.replace(/^(\d+)% 확률로\s*/, (_, p) => `${p}% 확률 · `).replace(/시전자\s*/, '');
  }
  return { ...base, amountText };
}
const SKILL_CARD_ORDER = ['기본 공격', '스킬1', '스킬2', '패시브', '각성기'];

/**
 * 스킬 · 발동 효과 카드 — 액티브(기본 공격 · 스킬1 · 스킬2 · 각성기)와 패시브 조건 발동(부활 시 · 반격 시 …)으로 거는
 * 능력치 · 생존 · 회복 방해 효과. 패시브 칸(effectCards)에 들어가는 [상시] · 전투 시작 [N턴]은 빼고, 쓰는 타이밍이 달라 겹침 판정은 없음.
 * 카드 = 영웅 · 스킬 · 대상 · 효과마다 하나 (화면은 영웅 · 스킬 단위 상자로 묶음 — `SkillEffectList`).
 * `amountText` = % 아닌 수치(19초 · 25 · 2개 …), `skillTag` = 스킬 슬롯 이름(슬롯이 없으면 스킬 이름).
 */
export function skillCards(analysis, team, includeEnhance = true) {
  const seq = (e) => Number(String(e.id).slice(1)) || 0;
  const groupOf = (e) => `${e.heroName}|${e.skillName}|${e.target}`;
  /** 「자신 부활 시, [청천벽력·진] 발동」 줄 다음 줄들은 그 발동으로 거는 효과 → 조건 앞에 붙임 */
  const triggers = analysis.entries
    .filter((e) => e.kind === 'effect' && e.condition && /발동$/.test(e.name))
    .map((e) => ({ group: groupOf(e), seq: seq(e), text: `${e.condition} (${e.name.replace(/\s*발동$/, '')})` }));
  const triggerFor = (e) => triggers.filter((t) => t.group === groupOf(e) && t.seq < seq(e)).pop()?.text || null;
  const rows = new Map();
  for (const e of analysis.entries) {
    if (!isSkillCastEntry(e)) continue;
    const id = `${e.heroName}|${e.skillName}|${e.side}|${e.key}|${e.target}|${e.condition || ''}`;
    const prev = rows.get(id);
    if (!prev || (entryValue(e, includeEnhance) ?? -1) > (entryValue(prev, includeEnhance) ?? -1)) rows.set(id, e);
  }
  const heroIdx = (name) => {
    const i = (team || []).findIndex((h) => h && cleanHeroName(h.name) === name);
    return i === -1 ? 99 : i;
  };
  const cards = [...rows.entries()].map(([id, e]) => {
    const value = entryValue(e, includeEnhance);
    const { label, dir, amountText } = skillCardText(e, value);
    const recipients = e.side === 'ally' ? scopeRecipients(e.scope, e.heroName, team) : null;
    const stackAmount = e.amount && /중첩$/.test(e.amount) ? e.amount : null;
    const stack = e.maxStack ? `${stackAmount ? `${stackAmount} · ` : ''}최대 ${e.maxStack}중첩` : stackAmount;
    const dur = e.duration && e.duration.type !== 'permanent' ? e.duration.label : null;
    const skillTag = e.skillLabel === '스킬' ? e.skillName : e.skillLabel;
    const trigger = triggerFor(e);
    const condition = [trigger, e.condition].filter(Boolean).join(' · ') || null;
    return {
      id: `skill|${id}`,
      key: e.key,
      name: e.name,
      label,
      dir,
      side: e.side,
      timing: 'skill',
      turns: e.duration?.type === 'turns' ? e.duration.n : null,
      duration: dur,
      stack,
      condition,
      value,
      amountText,
      chance: e.chance != null && e.chance < 100 ? e.chance : null,
      sources: [{
        id: e.id,
        heroName: e.heroName,
        value,
        scope: scopeText(e),
        scopeKind: e.scope.kind,
        scopeRoles: e.scope.kind === 'roles' ? e.scope.roles : null,
        recipients,
        applied: true,
        skillLabel: e.skillLabel,
        skillName: e.skillName,
        skillTag,
        condition,
        turns: e.duration?.type === 'turns' ? e.duration.n : null,
        tower: !!e.tower,
      }],
      recipients,
      overlap: null,
      wasted: e.side === 'ally' && recipients != null && recipients.length === 0,
      tower: !!e.tower,
    };
  });
  const skillIdx = (s) => (SKILL_CARD_ORDER.indexOf(s) === -1 ? SKILL_CARD_ORDER.length : SKILL_CARD_ORDER.indexOf(s));
  return cards.sort((a, b) => {
    const sa = a.sources[0];
    const sb = b.sources[0];
    return heroIdx(sa.heroName) - heroIdx(sb.heroName)
      || skillIdx(sa.skillLabel) - skillIdx(sb.skillLabel)
      || String(sa.skillName).localeCompare(String(sb.skillName), 'ko')
      || effectRank(a.name) - effectRank(b.name)
      || a.label.localeCompare(b.label, 'ko');
  });
}

/* ───────────── 역할 체크 (스킬 전체 · 있다/없다) ───────────── */

export const ROLE_TILES = [
  { id: 'dispel', label: '버프 해제', hint: '상대 버프 지우기', side: 'enemy', test: (e) => /^(모든\s*)?버프 해제$/.test(e.name) },
  { id: 'turnDown', label: '턴제 버프 감소', hint: '피해 면역·무효화 줄이기', side: 'enemy', test: (e) => /턴제 버프 감소/.test(e.name) },
  { id: 'pierce', label: '관통', hint: '피해 면역 무시', side: 'enemy', test: (e) => /관통/.test(e.kind === 'damage' ? e.raw : e.name) },
  { id: 'antiheal', label: '회복 방해', hint: '회복 불가 · 받는 회복량 감소', side: 'enemy', test: (e) => /회복 불가|받는 회복량 감소/.test(e.name) },
  { id: 'cc', label: '행동 제어', hint: '기절 · 빙결 · 침묵 등', side: 'enemy', test: (e) => e.category === 'cc' },
  { id: 'dot', label: '지속 피해', hint: '출혈 · 화상 · 중독 · 즉사', side: 'enemy', test: (e) => e.category === 'dot' },
  { id: 'cooldown', label: '쿨타임 방해', hint: '스킬 쿨타임 증가', side: 'enemy', test: (e) => /쿨타임 증가/.test(e.name) },
  { id: 'soulkill', label: '영멸', hint: '부활 · 불사 · 불굴 봉쇄', side: 'enemy', test: (e) => /영멸/.test(e.name) },
  { id: 'cleanse', label: '정화', hint: '디버프 해제', side: 'ally', test: (e) => /디버프 해제/.test(e.name) },
  { id: 'immune', label: '피해 면역 · 무효화', hint: '피해를 막는 버프', side: 'ally', test: (e) => /피해 면역|피해 무효화/.test(e.name) },
  { id: 'revive', label: '부활 · 불사 · 권능', hint: '한 번 더 버티기', side: 'ally', test: (e) => /^부활$|불사|불굴|권능/.test(e.name) },
  { id: 'heal', label: '회복 · 보호막', hint: '생명력 회복 · 지속 회복 · 보호막', side: 'ally', test: (e) => /생명력 회복|지속 회복|^보호막/.test(e.name) && e.scope?.kind !== 'self' },
];

function entryMatchesTile(e, tile) {
  if (e.side !== tile.side) return false;
  if (tile.id === 'pierce') return (e.kind === 'damage' || e.kind === 'effect') && tile.test(e);
  return e.kind === 'effect' && tile.test(e);
}

/* ───────────── 영웅 한 명 효과 요약 (효과 사전 · 도감) ───────────── */

/**
 * @returns {{ buffs, selfBuffs, debuffs, skillFx, tower, roles, rings, conditions, effectNames }}
 * buffs/debuffs: [{ id, key, name, label, dir, timing, turns, value, scope, skillLabel, source }]
 */
export function heroSummary(hero, { rareSet } = {}) {
  if (!hero) return null;
  const entries = collectHeroEntries(hero, { rareSet });
  const pick = (test, base = isTableEntry) => {
    const map = new Map();
    for (const e of entries) {
      if (!base(e) || !test(e)) continue;
      const timing = effectTiming(e);
      const id = `${e.side}|${e.key}|${timing}`;
      const value = fxValue(e);
      const prev = map.get(id);
      if (prev && (prev.value ?? -1) >= (value ?? -1)) continue;
      map.set(id, {
        id,
        key: e.key,
        name: e.name,
        ...effectLabel(e.name),
        label: listLabel(e.name),
        timing,
        turns: timing === 'start' ? e.duration.n : null,
        value,
        scope: scopeText(e),
        scopeKind: e.scope.kind,
        scopeRoles: e.scope.kind === 'roles' ? e.scope.roles : null,
        skillLabel: e.skillLabel,
        skillName: e.skillName,
        source: e.source,
      });
    }
    return [...map.values()].sort((a, b) => effectRank(a.name) - effectRank(b.name) || (a.timing === 'perm' ? -1 : 1));
  };
  const conditions = new Map();
  for (const e of entries) {
    if (e.kind !== 'effect') continue;
    for (const src of [e.condition, ...(e.notes || [])].filter(Boolean)) {
      const req = parseRoleRequirement(src);
      if (!req) continue;
      const label = `${req.roles.map((r) => ROLE_LABEL_KR[r]).join('·')} ${req.each && req.roles.length > 1 ? '각각 ' : ''}${req.n}명 이상`;
      if (!conditions.has(label)) conditions.set(label, new Map());
      const bySkill = conditions.get(label);
      const skill = e.skillLabel || '';
      if (!bySkill.has(skill)) bySkill.set(skill, new Set());
      bySkill.get(skill).add(e.name);
    }
  }
  /** 스킬 · 발동 효과 — 팀 빌더 「스킬 · 발동」 탭과 같은 카드(skillCards), 화면은 영웅 · 스킬 단위로 묶음 */
  const skillFx = skillCards({ entries }, [hero]).map((c) => {
    const s = c.sources[0];
    return {
      id: c.id,
      key: c.key,
      name: c.name,
      label: c.label,
      dir: c.dir,
      side: c.side,
      skillLabel: s.skillLabel,
      skillName: s.skillName,
      skillTag: s.skillTag,
      turns: c.turns,
      duration: c.duration,
      stack: c.stack,
      amountText: c.amountText,
      chance: c.chance,
      value: c.value,
      scope: s.scope,
      scopeKind: s.scopeKind,
      scopeRoles: s.scopeRoles,
      condition: c.condition,
    };
  });
  const SKILL_ORDER = ['기본 공격', '스킬1', '스킬2', '패시브', '각성기'];
  const tower = new Map();
  for (const e of collectHeroEntries(hero, { rareSet, allowTower: true })) {
    if (!e.tower) continue;
    const id = `${e.skillLabel}|${e.side}|${e.kind === 'damage' ? 'damage' : e.key}`;
    if (tower.has(id)) continue;
    tower.set(id, {
      id,
      ...(e.kind === 'damage' ? { label: '추가 피해', dir: null } : { ...effectLabel(e.name), label: listLabel(e.name) }),
      side: e.side,
      skillLabel: e.skillLabel,
      timing: e.kind === 'effect' ? effectTiming(e) : null,
      turns: e.duration?.type === 'turns' ? e.duration.n : null,
      value: e.kind === 'effect' ? entryValue(e) : null,
      scope: e.kind === 'effect' ? scopeText(e) : targetLabel(e.target) || e.target,
    });
  }
  return {
    tower: [...tower.values()].sort((a, b) => SKILL_ORDER.indexOf(a.skillLabel) - SKILL_ORDER.indexOf(b.skillLabel)
      || (a.side === b.side ? 0 : a.side === 'ally' ? -1 : 1)),
    buffs: pick((e) => e.side === 'ally' && e.scope.kind !== 'self', (e) => isTableEntry(e) || isPassiveSpecialEntry(e)),
    selfBuffs: pick((e) => e.side === 'ally' && e.scope.kind === 'self', isSelfPassiveEntry),
    debuffs: pick((e) => e.side === 'enemy', (e) => isTableEntry(e) || isPassiveSpecialEntry(e)),
    skillFx,
    roles: ROLE_TILES
      .map((t) => ({ id: t.id, label: t.label, hint: t.hint, side: t.side, skills: [...new Set(entries.filter((e) => entryMatchesTile(e, t)).map((e) => e.skillLabel))] }))
      .filter((r) => r.skills.length),
    rings: ownRevivals(hero),
    conditions: [...conditions.entries()].map(([label, bySkill]) => ({
      label,
      effects: [...new Set([...bySkill.values()].flatMap((s) => [...s]))],
      effectText: skillEffectText(bySkill),
    })),
    effectNames: [...new Set(entries.filter((e) => e.kind === 'effect').map((e) => e.name.replace(/\(중첩\)$/, '').trim()))],
  };
}

/* ───────────── 영웅 효과 색인 (필요한 효과로 찾기) ───────────── */

/**
 * @returns {{ groups: { ally, enemy, role }, byHero: Map<heroName, Map<chipId, text>> }}
 * chip id: `ally|키` · `enemy|키` · `role|id`
 */
/**
 * 스킬 · 발동 효과 — 기본 공격 · 스킬 · 각성기 + 패시브 조건 발동(부활 시 등)으로 거는 능력치 · 생존 · 회복 방해,
 * 아군 쪽 전투 메커니즘(도발 · 반격 · 협공 · 관통 · 쿨타임 초기화 — MECHANIC_BUFFS), 적에게 거는 상태 이상(행동 제어 · 지속 피해)과
 * 버프 해제 · 버프 차단 · 턴제 버프 감소, 아군 디버프 해제, 고유 기믹(조건부).
 * skillCards와 같은 규칙(패시브 [상시] · 전투 시작 [N턴]은 빼고, 행동 제어 · 지속 피해 · 적에게 거는 공격 성질은 「역할」에서 다룸).
 */
export function isSkillCastEntry(e) {
  if (e.kind !== 'effect' || effectTiming(e) || isTextFragment(e)) return false;
  if (isMechanicBuff(e) || e.special) return true;
  if (e.side === 'enemy' && (STATUS_CATEGORIES.has(e.category) || e.category === 'dispel')) return true;
  if (e.side === 'ally' && e.category === 'cleanse') return true;
  return SKILL_CARD_CATEGORIES.has(e.category);
}

function indexLayer() {
  const byHero = new Map();
  const counts = new Map();
  const labels = new Map();
  const bump = (id, label, heroName, text) => {
    if (!byHero.has(heroName)) byHero.set(heroName, new Map());
    const m = byHero.get(heroName);
    if (!m.has(id)) {
      m.set(id, text);
      counts.set(id, (counts.get(id) || 0) + 1);
      labels.set(id, label);
    } else if (!id.startsWith('role|') && !m.get(id).split(' · ').includes(text)) {
      m.set(id, `${m.get(id)} · ${text}`);
    }
  };
  const finish = () => {
    const groups = { ally: [], enemy: [], role: [] };
    for (const [id, n] of counts.entries()) {
      const [kind] = id.split('|');
      groups[kind].push({ id, label: labels.get(id), count: n });
    }
    const bySense = (a, b) => effectRank(a.label) - effectRank(b.label) || b.count - a.count || a.label.localeCompare(b.label, 'ko');
    groups.ally.sort(bySense);
    groups.enemy.sort(bySense);
    groups.role = ROLE_TILES.map((t) => groups.role.find((g) => g.id === `role|${t.id}`)).filter(Boolean);
    return { groups, byHero };
  };
  return { bump, finish };
}

/**
 * 효과로 찾기 칩 키 — 「방어력 감소(중첩)」 · 「스킬 쿨타임 감소 효과」처럼 표기만 다른 효과는 한 칩으로 묶는다.
 * 찾기 전용(겹침 · 중첩 분석은 원래 `e.key` 그대로). 칩 id = `${side}|${finderKey(key)}`.
 */
export function finderKey(key) {
  return String(key || '').replace(/\(중첩\)$/, '').replace(/(증가|감소)\s*효과$/, '$1').trim();
}

/**
 * 기본 색인 = 패시브 [상시] · 전투 시작 [N턴] + 역할. `.withSkill` = 스킬로 거는 효과까지 포함 (「스킬 효과 포함」 토글).
 * @returns {{ groups, byHero, withSkill: { groups, byHero } }}
 */
export function buildHeroEffectIndex(allHeroes, { includeEnhance = true, rareSet } = {}) {
  const base = indexLayer();
  const wide = indexLayer();
  for (const h of allHeroes || []) {
    const name = cleanHeroName(h.name);
    const entries = collectHeroEntries(h, { includeEnhance, rareSet });
    for (const e of entries) {
      const teamOnly = !(e.side === 'ally' && e.scope?.kind === 'self');
      const v = entryValue(e, includeEnhance);
      const chip = e.kind === 'effect' ? `${e.side}|${finderKey(e.key)}` : '';
      const label = e.kind === 'effect' ? listLabel(e.name.replace(/\(중첩\)$/, '')) : '';
      const stack = e.stacking ? ' · 중첩' : '';
      if (isTableEntry(e) && teamOnly) {
        const when = effectTiming(e) === 'perm' ? '상시' : `${e.duration.n}턴`;
        const text = `${v != null ? `${when} ${v}%` : when}${stack}`;
        base.bump(chip, label, name, text);
        wide.bump(chip, label, name, text);
      } else if (isSkillCastEntry(e) && teamOnly && !e.special) {
        const turns = e.duration?.type === 'turns' ? ` ${e.duration.n}턴` : '';
        const tag = e.skillLabel === '스킬' ? e.skillName : e.skillLabel;
        wide.bump(chip, label, name, `${tag}${turns}${v != null ? ` ${v}%` : ''}${stack}`);
      }
      for (const tile of ROLE_TILES) {
        if (entryMatchesTile(e, tile)) {
          base.bump(`role|${tile.id}`, tile.label, name, e.skillLabel);
          wide.bump(`role|${tile.id}`, tile.label, name, e.skillLabel);
        }
      }
    }
  }
  return { ...base.finish(), withSkill: wide.finish() };
}

/* ───────────── 편성 조건 (공격형 N명 이상 등) ───────────── */

const ROLE_LABEL_KR = { offensive: '공격형', magic: '마법형', defensive: '방어형', support: '지원형', universal: '만능형' };

function parseRoleRequirement(text) {
  const t = String(text || '');
  let m = t.match(/아군에\s*([가-힣,\s]+?)\s*영웅이\s*(각각\s*)?(\d+)명\s*이상/);
  if (m) {
    const roles = parseRoles(m[1]);
    if (roles.length) return { roles, n: Number(m[3]), each: !!m[2] || roles.length > 1 };
  }
  m = t.match(/(공격형|마법형|방어형|지원형|만능형)(?:\s*영웅)?\s*(\d+)명\s*이상\s*편성/);
  if (m) return { roles: [ROLE_BY_KR[m[1]]], n: Number(m[2]), each: true };
  return null;
}

/**
 * 덱 역할 수 (+ 「아군 역할 지원」: 5인 3명·3인 2명 이상인 역할은 1명 더)
 */
export function teamRoleCounts(team, teamSize) {
  const counts = {};
  for (const h of team) counts[h.role] = (counts[h.role] || 0) + 1;
  const support = team.some((h) => (h.skills || []).some((s) => skillEffects(s).some((e) => (e.details || []).some((d) => d.includes('아군 역할 지원')))));
  const threshold = teamSize >= 5 ? 3 : 2;
  const boosted = {};
  if (support) {
    for (const [r, n] of Object.entries(counts)) {
      if (n >= threshold) {
        counts[r] = n + 1;
        boosted[r] = true;
      }
    }
  }
  return { counts, boosted, support };
}

const SKILL_TEXT_ORDER = ['기본 공격', '스킬1', '스킬2', '패시브', '각성기'];
const skillTextRank = (s) => (SKILL_TEXT_ORDER.indexOf(s) === -1 ? SKILL_TEXT_ORDER.length : SKILL_TEXT_ORDER.indexOf(s));

/**
 * Map(스킬 라벨 → Set(효과 이름)) → 「스킬2 생명력 전환」.
 * 같은 효과는 스킬을 묶어 「기본 공격 · 스킬2 마력 역류, 패시브 생명력 회복」
 */
function skillEffectText(bySkill) {
  const groups = new Map();
  for (const [skill, names] of [...bySkill.entries()].sort(([a], [b]) => skillTextRank(a) - skillTextRank(b))) {
    const k = [...names].join(' · ');
    if (!groups.has(k)) groups.set(k, []);
    if (skill) groups.get(k).push(skill);
  }
  return [...groups.entries()].map(([names, skills]) => `${skills.length ? `${skills.join(' · ')} ` : ''}${names}`).join(', ');
}

export function formationRequirements(analysis, team, teamSize) {
  const { counts, boosted } = teamRoleCounts(team, teamSize);
  const seen = new Map();
  for (const e of analysis.entries) {
    if (e.kind !== 'effect') continue;
    const sources = [e.condition, ...(e.notes || [])].filter(Boolean);
    for (const src of sources) {
      const req = parseRoleRequirement(src);
      if (!req) continue;
      const key = `${e.heroName}|${req.roles.join(',')}|${req.n}`;
      if (!seen.has(key)) {
        const met = req.roles.every((r) => (counts[r] || 0) >= req.n);
        seen.set(key, {
          id: key,
          heroName: e.heroName,
          heroId: e.heroId,
          req,
          label: `${req.roles.map((r) => ROLE_LABEL_KR[r]).join('·')} ${req.each && req.roles.length > 1 ? '각각 ' : ''}${req.n}명 이상`,
          have: req.roles.map((r) => ({ role: ROLE_LABEL_KR[r], n: counts[r] || 0, boosted: !!boosted[r] })),
          met,
          effects: new Set(),
          bySkill: new Map(),
        });
      }
      const row = seen.get(key);
      row.effects.add(e.name);
      const skill = e.skillLabel || '';
      if (!row.bySkill.has(skill)) row.bySkill.set(skill, new Set());
      row.bySkill.get(skill).add(e.name);
    }
  }
  return [...seen.values()].map(({ bySkill, ...r }) => ({ ...r, effects: [...r.effects], effectText: skillEffectText(bySkill) }));
}

/* ───────────── 상대 덱 주의점 · 매치업 ───────────── */

const SELECTORS = [
  { re: /공격력이 가장 높은/, id: 'atk', label: '공격력 1위', todo: '공격력 1위가 될 영웅을 미리 정하고, 그 영웅의 생존(생명력·방어력·피해 면역)을 챙기세요.' },
  { re: /(현재|최대) 생명력이 가장 높은/, id: 'hp', label: '생명력 1위', todo: '생명력 조절 — 탱커 대신 죽어도 되는 영웅에게 생명력을 몰아 1위로 만들어 두세요.' },
  { re: /방어력이 가장 높은/, id: 'def', label: '방어력 1위', todo: '방어력이 가장 높은 영웅의 생존 수단을 챙기세요.' },
  { re: /후열/, id: 'back', label: '후열', todo: '후열 딜러·지원형의 생존 수단과 진형을 확인하세요.' },
  { re: /전열/, id: 'front', label: '전열', todo: '전열 영웅의 생존 세팅을 챙기세요.' },
  { re: /버프가 많은/, id: 'buff', label: '버프가 많은 영웅', todo: '버프를 한 영웅에게 몰아주지 마세요.' },
];

function selectorOf(target) {
  const t = String(target || '');
  const sel = SELECTORS.find((s) => s.re.test(t));
  if (!sel) return null;
  const n = t.match(/가장 높은 적군\s*(\d+)명/);
  return n && Number(n[1]) > 1 ? { ...sel, label: sel.label.replace('1위', `상위 ${n[1]}명`) } : sel;
}

/** 상대 영웅이 우리 덱의 누구를 노리는지 (공격력 1위 · 생명력 1위 · 후열 …) */
export function targetingInsights(enemyAnalysis) {
  const map = new Map();
  for (const e of enemyAnalysis.entries) {
    if (e.side !== 'enemy' && !e.ownHit) continue;
    const sel = selectorOf(e.target);
    if (!sel) continue;
    const k = `${e.heroName}|${sel.id}|${sel.label}`;
    if (!map.has(k)) map.set(k, { id: k, heroName: e.heroName, heroId: e.heroId, selector: sel, effects: new Set(), skills: new Set() });
    const row = map.get(k);
    if (e.kind === 'effect') row.effects.add(e.name);
    else row.effects.add('추가 피해');
    row.skills.add(e.skillLabel);
  }
  return [...map.values()].map((r) => ({ ...r, effects: [...r.effects], skills: [...r.skills] }));
}

/* ───────────── 맞대결 (내 덱 vs 상대 덱) ───────────── */

/**
 * 맞대결에서 비교하는 능력치 — 이 순서대로. 화면 줄은 능력치마다 **버프 줄 · 디버프 줄을 따로**(밍봉 2026-11-10 — 「버프 − 디버프」로
 * 합치면 상대에게 받는 회복량 감소를 걸었을 때 우리 받는 회복량이 오른 것처럼 보였음). 줄 이름은 게임 효과 이름 그대로
 * (`buff` 기본 「○○ 증가」, `debuff` 기본 「○○ 감소」, 없는 쪽은 null). 공격력 · 피해량은 모든 · 물리 · 마법 따로.
 * `only` = 그 공격 타입 영웅만 받음. 감쇄 · 취약의 물리 · 마법은 「받는 피해」 종류라 공격 타입과 무관.
 */
const DUEL_STATS = [
  { id: 'atk', label: '모든 공격력', re: /^(모든 )?공격력$/ },
  { id: 'atkPhys', label: '물리 공격력', re: /^물리 공격력$/, only: 'physical' },
  { id: 'atkMag', label: '마법 공격력', re: /^마법 공격력$/, only: 'magic' },
  { id: 'dmg', label: '피해량', re: /^피해량$/ },
  { id: 'dmgPhys', label: '물리 피해량', re: /^물리 피해량$/, only: 'physical' },
  { id: 'dmgMag', label: '마법 피해량', re: /^마법 피해량$/, only: 'magic' },
  /* 공격기 인원별 피해량 · 효과 적용 확률(상태 이상마다) · 최대 생명력 · 방어 무시 효율 · 5인 공격기 감쇄는 위 능력치와 다른 게임 효과라 따로 한 줄(밍봉 2026-11-11 — 겔리두스 · 로지 효과 적용 확률이 빠졌던 것) */
  { id: 'dmg1', label: '1인 공격기 피해량', re: /^1인 공격기 피해량$/ },
  { id: 'dmg3', label: '3인 공격기 피해량', re: /^3인 공격기 피해량$/ },
  { id: 'dmg45', label: '4~5인 공격기 피해량', re: /^4~5인 공격기 피해량$/ },
  { id: 'crit', label: '치명타 확률', re: /^치명타 확률$/ },
  { id: 'critDmg', label: '치명타 피해', re: /^치명타 피해$/ },
  { id: 'weak', label: '약점 공격 확률', re: /^약점 공격 확률$/ },
  { id: 'weakDmg', label: '약점 공격 피해량', re: /^약점 공격 피해량$/ },
  { id: 'ignoreDef', label: '방어 무시 효율', re: /^방어 무시 효율$/ },
  { id: 'hit', label: '효과 적중', re: /^효과 적중$/ },
  { id: 'res', label: '효과 저항', re: /^효과 저항$/ },
  { id: 'apply', label: '효과 적용 확률', re: /^효과 적용 확률$/ },
  { id: 'applyDeath', label: '즉사 효과 적용 확률', re: /^즉사 효과 적용 확률$/ },
  { id: 'applyShock', label: '감전 효과 적용 확률', re: /^감전 효과 적용 확률$/ },
  { id: 'def', label: '방어력', re: /^방어력$/ },
  { id: 'hp', label: '최대 생명력', re: /^최대 생명력$/ },
  { id: 'block', label: '막기 확률', re: /^막기 확률$/ },
  { id: 'guard', label: '감쇄', re: /^감쇄$/, buff: '감쇄', debuff: null },
  { id: 'guardPhys', label: '물리 감쇄', re: /^물리 감쇄$/, buff: '물리 감쇄', debuff: null },
  { id: 'guardMag', label: '마법 감쇄', re: /^마법 감쇄$/, buff: '마법 감쇄', debuff: null },
  { id: 'guard5', label: '5인 공격기 감쇄', re: /^5인 공격기 감쇄$/, buff: '5인 공격기 감쇄', debuff: null },
  { id: 'heal', label: '받는 회복량', re: /^받는 회복량$/ },
  { id: 'vulnPhys', label: '물리 취약', re: /^물리 취약$/, buff: null, debuff: '물리 취약' },
  { id: 'vulnMag', label: '마법 취약', re: /^마법 취약$/, buff: null, debuff: '마법 취약' },
];
/**
 * 「최종」 줄 — 영웅마다 실제로 오르내리는 능력치 하나로 합친 값(밍봉 2026-11-10 — 「그래서 누가 물리 공격력이 더 높냐」).
 * `ids`의 버프는 더하고 디버프는 뺌(물리 공격력 = 물리 공격력 증가 + 모든 공격력 증가 − 둘의 감소). `only` = 그 공격 타입 영웅끼리.
 * 감쇄 · 취약은 서로 다른 효과라 합치지 않고 각각 한 줄(취약은 디버프뿐이라 「−20%」).
 */
const DUEL_FINALS = [
  { id: 'atkPhys', label: '물리 공격력', icon: '물리 공격력 증가', only: 'physical', ids: ['atkPhys', 'atk'] },
  { id: 'atkMag', label: '마법 공격력', icon: '마법 공격력 증가', only: 'magic', ids: ['atkMag', 'atk'] },
  { id: 'dmgPhys', label: '물리 피해량', icon: '물리 피해량 증가', only: 'physical', ids: ['dmgPhys', 'dmg'] },
  { id: 'dmgMag', label: '마법 피해량', icon: '마법 피해량 증가', only: 'magic', ids: ['dmgMag', 'dmg'] },
  ...['dmg1', 'dmg3', 'dmg45', 'crit', 'critDmg', 'weak', 'weakDmg', 'ignoreDef', 'hit', 'res', 'apply', 'applyDeath', 'applyShock', 'def', 'hp', 'block', 'guard', 'guardPhys', 'guardMag', 'guard5', 'vulnPhys', 'vulnMag', 'heal'].map((id) => {
    const s = DUEL_STATS.find((x) => x.id === id);
    const icon = s.buff || s.debuff || `${s.label} 증가`;
    return { id, label: s.label, icon, ids: [id] };
  }),
];

/** 줄 이름 — 버프 줄(sign +1) 「○○ 증가」 · 디버프 줄(sign −1) 「○○ 감소」(감쇄 · 취약처럼 이름 자체가 효과면 그대로) */
const duelRowName = (s, sign) => {
  const own = sign > 0 ? s.buff : s.debuff;
  if (own !== undefined) return own;
  return `${s.label} ${sign > 0 ? '증가' : '감소'}`;
};
const DUEL_EVEN = 2;

/** 양쪽 수치 옆 아이콘 이름 — `up` = 받은 양이 +일 때(증가), `down` = −일 때(감소). 한쪽만 있는 효과(감쇄 · 취약)는 그 하나 */
function duelSideIcons(def) {
  if (def.ids.length > 1) return { up: `${def.label} 증가`, down: `${def.label} 감소` };
  const s = DUEL_STATS.find((x) => x.id === def.id);
  const up = duelRowName(s, 1);
  const down = duelRowName(s, -1);
  return { up: up || down, down: down || up };
}

function duelStatOf(e, hero) {
  const n = String(e.name || '').replace(/\(중첩\)$/, '').trim();
  const base = NAMED_STAT_BUFFS.get(n) || effectLabel(n).label;
  const stat = DUEL_STATS.find((s) => s.re.test(base));
  if (!stat) return null;
  if (stat.only && hero.attackType !== stat.only) return null;
  return stat;
}

/** 전력 비교에 넣는 효과 — 게임 시작하자마자 걸리는 패시브만([상시] + 전투 시작 [N턴]). 액티브 · 조건 발동 · 진형은 안 셈(밍봉 2026-11-10) */
function isDuelEntry(e, includeEnhance) {
  return e.kind === 'effect'
    && !e.special
    && !e.ownHit
    && ['stat', 'survival', 'antiheal'].includes(e.category)
    && !!effectTiming(e)
    && entryValue(e, includeEnhance) != null;
}

/**
 * 한 팀 영웅마다 능력치별 「받는 버프 − 상대가 거는 디버프」 — 패시브 + 펫(`extras`). 같은 효과(같은 key · 같은 timing)는 가장 높은 수치 하나만,
 * 다른 효과끼리는 더함. 대상이 정해지지 않은 효과(1명 · 무작위)는 뺌.
 * 「자신」만 받는 버프는 팀 줄에서 뺌(윤건 치명타 50%가 팀 비교로 보이던 것, 밍봉 2026-11-10) — `duelSelfBuffs`로 따로.
 */
function duelNets(team, own, opp, includeEnhance, extras = null) {
  const nets = new Map(team.map((h) => [cleanHeroName(h.name), new Map()]));
  const add = (e, recipients, sign) => {
    for (const name of recipients || []) {
      const hero = team.find((h) => cleanHeroName(h.name) === name);
      const stat = hero && duelStatOf(e, hero);
      if (!stat) continue;
      const byStat = nets.get(name);
      if (!byStat.has(stat.id)) byStat.set(stat.id, new Map());
      const slots = byStat.get(stat.id);
      const slot = `${sign}|${e.key}|${effectTiming(e)}`;
      const value = entryValue(e, includeEnhance);
      if (!slots.has(slot) || slots.get(slot).value < value) slots.set(slot, { e, value, sign });
    }
  };
  for (const e of own?.entries || []) {
    if (!(e.side === 'ally' && e.scope?.kind !== 'self' && isDuelEntry(e, includeEnhance))) continue;
    const recipients = scopeRecipients(e.scope, e.heroName, team);
    add(e, recipients, 1);
    for (const d of namedDrawbacks(e)) add(d, recipients, -1);
  }
  for (const e of opp?.entries || []) {
    if (e.side === 'enemy' && isDuelEntry(e, includeEnhance)) add(e, scopeRecipients(e.scope, null, team), -1);
  }
  for (const e of extras || []) add(e, e.recipients, e.side === 'enemy' ? -1 : 1);
  return nets;
}

/**
 * 고유 이름 능력치 버프의 「단, ○○이 N% 감소합니다」 부작용 — 같은 대상이 받는 디버프로(여포 용이무모 = 물리 공격력 증가 + 마법 공격력 90% 감소, 밍봉 2026-11-11).
 * 전력 비교에서만 씀(받는 버프 표에는 `BUFF_NOTES` 경고 문구로 이미 있음).
 */
function namedDrawbacks(e) {
  if (!NAMED_STAT_BUFFS.has(String(e.name || '').replace(/\(중첩\)$/, '').trim())) return [];
  return [...String(e.tooltip || '').matchAll(/단,\s*(.+?)(?:이|가)\s*([\d.]+)%\s*감소/g)].map((m, i) => {
    const v = Number(m[2]);
    return { ...e, id: `${e.id}-drawback${i}`, name: `${m[1].trim()} 감소`, key: `${e.key}|drawback|${normKey(m[1])}`, valueBase: v, valueEnhanced: v, drawback: true };
  });
}

/** 전투 시작 [N턴] 효과면 N, [상시]면 null */
const duelTurns = (e) => (effectTiming(e) === 'start' ? e.duration?.n ?? null : null);

/** 팀 줄에서 뺀 「자신」만 받는 능력치 버프 — 영웅마다 [{ label, value, dir, turns }] (같은 효과 · 같은 timing은 높은 수치 하나) */
function duelSelfBuffs(team, own, includeEnhance) {
  const byHero = new Map();
  for (const e of own?.entries || []) {
    if (e.side !== 'ally' || e.scope?.kind !== 'self' || !isDuelEntry(e, includeEnhance)) continue;
    const name = cleanHeroName(e.heroName);
    const hero = team.find((h) => cleanHeroName(h.name) === name);
    if (!hero || !duelStatOf(e, hero)) continue;
    const label = listLabel(e.name.replace(/\(중첩\)$/, ''));
    const value = entryValue(e, includeEnhance);
    const turns = duelTurns(e);
    const k = `${label}|${turns ?? ''}`;
    if (!byHero.has(name)) byHero.set(name, new Map());
    const items = byHero.get(name);
    if (!items.has(k) || items.get(k).value < value) items.set(k, { label, value, dir: effectLabel(e.name).dir, turns });
  }
  return [...byHero].map(([hero, items]) => ({ hero, items: [...items.values()] }));
}

/* ───────────── 펫 (영웅과 같은 스킬 · 효과 · 툴팁 형식 — data/pets.js) ───────────── */

/**
 * 펫의 상시 효과 → 엔진 entry(+ `recipients`). `side` = 'ally'(펫 주인 팀이 받는 버프, `team` = 주인 팀) ·
 * 'enemy'(상대에게 거는 디버프, `team` = 상대 팀 — 유 「방어력 감소」 등). 펫은 덱 칸이 아니라서 받는 대상 계산에서 빠짐.
 * 영웅 같은 이름 효과와 섞지 않게 key 앞에 `pet|`(진형처럼 따로 쌓이는 효과로 셈). 모험 보상 패시브(믹 · 더지 · 에리)는 수치 · 상시가 없어 빠짐.
 * [상시]와 전투 시작 [N턴](제오 「모든 공격력 증가 [4턴]」 등)을 받음 — 예전엔 상시만 받아서 제오 모든 공격력이 통째로 빠졌음.
 */
export function petEntries(pet, team, includeEnhance = true, side = 'ally') {
  if (!pet?.skills?.length) return [];
  const asHero = {
    id: pet.id,
    name: pet.name,
    role: 'pet',
    skills: pet.skills.map((s) => ({ ...s, type: 'passive', tooltips: { ...(pet.tooltips || {}), ...(s.tooltips || {}) } })),
  };
  const members = (team || []).filter(Boolean);
  /** 상대 덱이 없을 때 거는 디버프는 받는 대상 모름(null) — 「상대가 받는 디버프」 표에는 그대로 나옴 */
  const unknownTarget = side === 'enemy' && !members.length;
  return collectHeroEntries(asHero, { includeEnhance })
    .filter((e) => e.kind === 'effect' && e.side === side && ['perm', 'start'].includes(effectTiming(e)) && entryValue(e, includeEnhance) != null)
    .map((e) => ({
      ...e,
      key: `pet|${e.key}`,
      heroName: `${pet.name}(펫)`,
      recipients: unknownTarget ? null : e.scope?.kind === 'self' ? [] : (scopeRecipients(e.scope, null, members) || members.map((h) => cleanHeroName(h.name))),
    }))
    .filter((e) => unknownTarget || e.recipients.length);
}

/** 버프 · 디버프 칸 표에 넣을 펫 카드 — 「물리 공격력 증가 (펫)」처럼 따로 한 줄 (`side`는 `petEntries`와 같음) */
export function petCards(pet, team, includeEnhance = true, side = 'ally') {
  return petEntries(pet, team, includeEnhance, side).map((e) => {
    const name = `${listLabel(e.name)} (펫)`;
    const value = entryValue(e, includeEnhance);
    const turns = duelTurns(e);
    return {
      id: `pet|${e.id}`,
      key: e.key,
      name,
      label: name,
      dir: effectLabel(e.name).dir,
      side,
      timing: turns ? 'start' : 'perm',
      turns,
      value,
      sources: [{
        id: `pet|${e.id}`,
        heroName: e.heroName,
        value,
        scope: scopeText(e),
        scopeKind: e.scope?.kind || 'all',
        scopeRoles: e.scope?.kind === 'roles' ? e.scope.roles : null,
        recipients: e.recipients,
        applied: true,
        skillLabel: '펫',
        skillName: e.skillName,
        condition: null,
        turns,
      }],
      recipients: e.recipients,
      overlap: null,
      overlapNote: null,
      wasted: false,
    };
  });
}

/**
 * 「최종」 줄 한 팀 몫(밍봉 2026-11-11 — 효과마다 받는 영웅이 달라 숫자 하나로 못 줄임: 로지 효과 적용 확률 +26%는 방어형 · 만능형만,
 * 겔리두스 −26%는 전원이면 2명은 0% · 3명은 −26%).
 * `groups` = 같은 양을 받는 영웅끼리 묶음([{ value, heroes, turn }], 큰 값부터) — 화면은 묶음이 하나면 숫자 하나, 여럿이면 얼굴 + 값으로 나눠 보여 줌.
 * `avg` = 영웅마다 받은 양의 평균 — **판정(막대 · 우위 점수)에만** 씀(2명만 받는 버프와 5명 다 받는 버프를 같은 무게로 치지 않게), 화면 숫자로는 안 보임.
 * `per` = 영웅마다 「버프 − 디버프」 합(같은 영웅끼리 비교), `turnAvg` = 평균 중 시작 N턴 몫.
 * `heroes` = 영웅마다 [{ name, total, items: [{ label, value(±), giver, turns }] }](팀 순서) — 줄 펼침 「영웅별」, 받는 효과가 없으면 items 빈 배열.
 * `comps` = 효과별 몫 — 받은 영웅 1명이 받는 수치(「+26%」, 받은 영웅들끼리 평균), `roles` = 유형 대상이면 그 유형(역할 아이콘),
 * `givers` = 그 효과를 준 · 건 영웅 · 펫, `turnGivers` = 그중 전투 시작 [N턴] 효과를 준 쪽.
 */
function duelFinalSide(team, nets, def) {
  const members = def.only ? team.filter((h) => h.attackType === def.only) : team;
  const n = members.length;
  const comps = new Map();
  const per = new Map();
  const perTurn = new Map();
  /* 영웅마다 받는 효과 목록 — 줄 펼침 「영웅별」(누가 무엇을 받고 누가 못 받는지, 밍봉 2026-11-11) */
  const heroes = [];
  for (const h of members) {
    const name = cleanHeroName(h.name);
    const byStat = nets.get(name);
    let total = 0;
    let turnTotal = 0;
    const items = [];
    for (const id of def.ids) {
      for (const { e, value, sign } of byStat?.get(id)?.values() || []) {
        total += sign * value;
        if (duelTurns(e)) turnTotal += sign * value;
        items.push({ label: duelRowName(DUEL_STATS.find((s) => s.id === id), sign), value: sign * value, giver: e.heroName, turns: duelTurns(e) });
        const label = duelRowName(DUEL_STATS.find((s) => s.id === id), sign);
        const c = comps.get(label) || { value: 0, turn: 0, givers: [], turnGivers: new Set(), recv: new Set(), roles: new Set(), allRoles: false };
        c.value += sign * value;
        if (duelTurns(e)) {
          c.turn += sign * value;
          c.turnGivers.add(e.heroName);
        }
        if (!c.givers.includes(e.heroName)) c.givers.push(e.heroName);
        c.recv.add(name);
        if (e.scope?.kind === 'roles') e.scope.roles.forEach((r) => c.roles.add(r));
        else c.allRoles = true;
        comps.set(label, c);
      }
    }
    per.set(name, total);
    perTurn.set(name, turnTotal);
    heroes.push({ name, total, items: items.filter((it) => Math.round(it.value)).sort((x, y) => y.value - x.value) });
  }
  const groupMap = new Map();
  for (const [name, total] of per) {
    const v = Math.round(total);
    if (!groupMap.has(v)) groupMap.set(v, { value: v, heroes: [], turn: false });
    const g = groupMap.get(v);
    g.heroes.push(name);
    if (Math.round(perTurn.get(name) || 0)) g.turn = true;
  }
  const groups = [...groupMap.values()].sort((x, y) => y.value - x.value);
  const sumOf = (m) => [...m.values()].reduce((t, v) => t + v, 0);
  /* 받은 영웅 1명 기준 — `roles` = 대상이 유형으로 정해진 효과면 그 유형, 한 곳이라도 「전체」 대상이면 빈 배열 */
  const list = [...comps].map(([label, c]) => ({
    label,
    value: c.recv.size ? c.value / c.recv.size : 0,
    turn: c.recv.size ? c.turn / c.recv.size : 0,
    givers: c.givers,
    /* 전투 시작 [N턴] 효과를 준 영웅 · 펫 — 화면에서 그 얼굴 옆 「턴」(펫 제오 모든 공격력 증가 [4턴] 등) */
    turnGivers: [...c.turnGivers],
    roles: c.allRoles ? [] : [...c.roles],
  })).filter((c) => Math.round(c.value));
  return {
    avg: n ? sumOf(per) / n : 0,
    turnAvg: n ? sumOf(perTurn) / n : 0,
    n,
    per,
    groups,
    heroes,
    comps: list,
  };
}

/** 두 팀 묶음 값이 같은지(인원 수는 무시 — 물리 영웅 2명 +25% vs 3명 +25%는 같음) */
const sameGroupValues = (a, b) => a.length === b.length && a.every((g, i) => g.value === b[i].value);

/**
 * 맞대결 요약 — 한 화면 요약 하나 「최종 합계」(밍봉 2026-11-10 — 근거 목록은 없애고 줄 펼침에 효과별 몫 · 준 영웅).
 * `finals` = `DUEL_FINALS` 순서, 줄마다 `groups.ours` · `groups.theirs` = 같은 양을 받는 영웅 묶음(화면 숫자), `ours` · `theirs` = 영웅마다 받은 양의 평균(판정용 · 화면에 안 보임),
 * `diff` = 우리 − 상대, `lead` = 'ours' | 'theirs' | 'even'(평균 차이 2 미만 + 묶음 값 같음),
 * `mirror` = 양쪽에 같은 영웅이 있으면 그 영웅끼리 차이가 가장 큰 쪽, `oursTurn` · `theirsTurn` = 평균 중 전투 시작 [N턴] 몫,
 * `n` = 셈에 든 영웅 수(물리 · 마법 줄은 그 타입만 — 0이면 화면에 「—」), `counts` = 우위 점수.
 * 게임 시작하자마자 양쪽에 걸리는 패시브 + 펫(`pets` = { ours, theirs })만 — 진형 · 액티브는 안 셈(밍봉 2026-11-10).
 */
export function duelSummary(mine, myTeam, theirs, theirTeam, includeEnhance = true, pets = {}) {
  const ours = (myTeam || []).filter(Boolean);
  const them = (theirTeam || []).filter(Boolean);
  if (!ours.length || !them.length) return { finals: [], counts: { ours: 0, theirs: 0, even: 0 }, selfBuffs: { ours: [], theirs: [] } };
  const selfBuffs = { ours: duelSelfBuffs(ours, mine, includeEnhance), theirs: duelSelfBuffs(them, theirs, includeEnhance) };
  const petFx = (ownPet, oppPet, team) => [
    ...(ownPet ? petEntries(ownPet, team, includeEnhance, 'ally') : []),
    ...(oppPet ? petEntries(oppPet, team, includeEnhance, 'enemy') : []),
  ];
  const ourNets = duelNets(ours, mine, theirs, includeEnhance, petFx(pets.ours, pets.theirs, ours));
  const theirNets = duelNets(them, theirs, mine, includeEnhance, petFx(pets.theirs, pets.ours, them));
  const shared = ours.map((h) => cleanHeroName(h.name)).filter((n) => them.some((t) => cleanHeroName(t.name) === n));
  const finals = [];
  for (const def of DUEL_FINALS) {
    const a = duelFinalSide(ours, ourNets, def);
    const b = duelFinalSide(them, theirNets, def);
    if (!a.comps.length && !b.comps.length) continue;
    const diff = a.avg - b.avg;
    let mirror = null;
    for (const name of shared) {
      if (!a.per.has(name) || !b.per.has(name)) continue;
      const d = a.per.get(name) - b.per.get(name);
      if (Math.abs(d) >= DUEL_EVEN && (!mirror || Math.abs(d) > Math.abs(mirror.diff))) mirror = { name, ours: a.per.get(name), theirs: b.per.get(name), diff: d };
    }
    /* 양쪽 다 디버프뿐인 줄은 이름 · 아이콘도 디버프로(「받는 회복량」 + 증가 아이콘 → 「받는 회복량 감소」, 밍봉 2026-11-10). 취약은 원래 디버프 이름 */
    const debuffOnly = ![...a.comps, ...b.comps].some((c) => c.value > 0);
    const name = debuffOnly && def.icon !== def.label ? `${def.label} 감소` : def.label;
    /* 같음 = 평균 차이 2 미만 + 묶음 값도 같을 때(평균만 비슷하고 영웅마다 받는 양이 다르면 같다고 안 함) */
    const even = (Math.abs(diff) < DUEL_EVEN && sameGroupValues(a.groups, b.groups)) || diff === 0;
    finals.push({
      id: `final-${def.id}`, label: name, icon: debuffOnly ? name : def.icon, debuffOnly, icons: duelSideIcons(def),
      ours: a.avg, theirs: b.avg, oursTurn: a.turnAvg, theirsTurn: b.turnAvg, n: { ours: a.n, theirs: b.n },
      groups: { ours: a.groups, theirs: b.groups },
      heroes: { ours: a.heroes, theirs: b.heroes },
      only: def.only || null,
      diff, lead: even ? 'even' : diff > 0 ? 'ours' : 'theirs', mirror,
      comps: { ours: a.comps, theirs: b.comps },
    });
  }
  const counts = { ours: 0, theirs: 0, even: 0 };
  for (const s of finals) counts[s.lead] += 1;
  return { finals, counts, selfBuffs };
}
