/** 팀 빌더 효과 점검표 — 원문 문장별로 엔진이 읽은 결과와 의심 표시를 만든다 (순수 함수). */
import {
  collectHeroEntries,
  effectTiming,
  entryValue,
  isSelfPassiveEntry,
  isSkillCastEntry,
  skillEffects,
  skillSlotLabel,
  targetLabel,
} from '../src/lib/teamBuilderAnalysis';

const normKey = (n) => String(n || '').replace(/\s*\(\s*중첩\s*\)\s*$/, '(중첩)').replace(/\s+/g, ' ').trim();
const bareKey = (n) => normKey(n).replace(/\(중첩\)$/, '').trim();
const DAMAGE_WORD_RE = /관통|방어 무시|고정 피해|피해$|공격$/;

const IGNORED_UPGRADES = [
  [/^(?:협공 |반격 )?(?:피해량|위력|추가 피해|피해)\s*(?:상승|증가|추가)\s*:/, '피해 수치 — 팀 빌더 미사용'],
  [/^회복량 상승\s*:/, '회복량 — 팀 빌더 미사용'],
  [/^쿨타임 감소\s*:/, '쿨타임 — 팀 빌더 미사용'],
];
const APPLIED_UPGRADES = [
  [/^확률 상승\s*:/, '반영됨 → 발동 확률'],
  [/^대상 수 변경\s*:/, '반영됨 → 대상 변경'],
  [/^효과 변경\s*:\s*.+?[이가]\s+.*?\[[^\]]+\]\s*(?:으로|로)\s*변경/, '반영됨 → 효과 이름 변경'],
];

function segmentType(seg) {
  if (/(효과|회복)\s*추가\s*:/.test(seg)) return { type: 'add' };
  const s = seg.replace(/^\s*(?:\[[^\]]+\]|\([^)]+\))\s*/, '').trim();
  let m = s.match(/^효과 상승\s*:\s*(.+?)\s+([\d.]+)%/);
  if (m) return { type: 'raise', key: normKey(m[1]), value: m[2] };
  m = s.match(/^턴 상승\s*:\s*(.+?)\s*(?:\[\s*(\d+)\s*턴\s*지속\s*\]|지속\s*(\d+)\s*턴)/);
  if (m) return { type: 'turn', key: normKey(m[1]), n: m[2] || m[3] };
  for (const [re, text] of IGNORED_UPGRADES) if (re.test(s)) return { type: 'ignored', text };
  for (const [re, text] of APPLIED_UPGRADES) if (re.test(s)) return { type: 'applied', text };
  m = s.match(/^([^:]{1,14}?)\s*:/);
  if (!m) return { type: 'bare' };
  return { type: 'other', label: m[1].trim() };
}

export function usageOf(e) {
  if (e.kind === 'damage') return { tone: 'mute', text: '피해 — 팀 빌더 미사용' };
  const t = effectTiming(e);
  if (t && !e.special && e.category !== 'utility') {
    const when = t === 'perm' ? '상시' : `시작 ${e.duration.n}턴`;
    if (e.side === 'ally' && e.scope?.kind === 'self') return { tone: 'self', text: `자신 강화 · ${when}` };
    return { tone: 'team', text: `팀 분석 · ${when}` };
  }
  if (isSelfPassiveEntry(e)) return { tone: 'self', text: `자신 강화 · ${t === 'perm' ? '상시' : `시작 ${e.duration.n}턴`}` };
  if (isSkillCastEntry(e)) return { tone: 'skill', text: '스킬 · 발동 탭' };
  if (e.special) return { tone: 'special', text: '특수 기믹' };
  if (e.category === 'cc' || e.category === 'dot') return { tone: 'role', text: '역할 체크용' };
  if (e.category === 'utility') return { tone: 'mute', text: '분류 안 됨 — 화면 미표시' };
  return { tone: 'mute', text: e.condition ? '조건부 — 효과 목록 미표시' : '효과 목록 미표시' };
}

function entryFlags(e) {
  const out = [];
  if (e.kind === 'damage') return out;
  if (e.category !== 'utility' && (e.name.length > 20 || /만큼|하면|경우|마다|에게|되면|\s시\s/.test(e.name))) out.push({ lv: 'hard', text: '효과 이름을 잘못 잘랐을 수 있어요' });
  if (e.category === 'stat' && entryValue(e) == null && /(증가|감소)$/.test(e.name) && !/각성 게이지|쿨타임|비례|레벨/.test(e.name)) {
    out.push({ lv: 'soft', text: '수치를 못 읽었어요 (원문·툴팁 모두)' });
  }
  if (e.side === 'ally' && e.scope?.kind === 'some' && !targetLabel(e.target)) out.push({ lv: 'soft', text: '대상 범위를 못 읽었어요' });
  return out;
}

export function scopeOf(e) {
  if (e.kind === 'damage') return e.target;
  if (e.scope?.kind === 'self') return '자신만';
  return targetLabel(e.target) || e.target;
}

export function auditHero(hero, rareSet) {
  const entries = collectHeroEntries(hero, { rareSet });
  const skills = (hero.skills || []).map((skill) => {
    const own = entries.filter((e) => e.skillName === skill.name);
    const names = new Set(own.filter((e) => e.kind === 'effect').map((e) => normKey(e.name)));
    const lines = [];
    for (const eff of skillEffects(skill)) {
      for (const raw of eff.details || []) {
        const text = String(raw || '').trim();
        if (!text) continue;
        const got = own.filter((e) => e.source === 'base' && e.raw === text);
        const flags = got.length && got.every((e) => e.kind === 'damage') && /\s\(.*\[.+\)/.test(text)
          ? [{ lv: 'hard', text: '피해 문장 괄호 안에 효과가 있는데 못 읽었어요' }]
          : [];
        const tower = /탑에서/.test(text) || /무한의 탑|시련의 탑/.test(eff.target);
        const note = got.length ? null : tower ? { tone: 'self', text: '탑 전용 → 효과 요약 「탑 전용」 칸' } : { tone: 'mute', text: '건너뜀 (안내 문장)' };
        lines.push({ tag: eff.target, kind: 'base', text, entries: got, note, flags });
      }
    }
    const upgrade = (label, source, text) => {
      let prev = null;
      for (const part of String(text || '').split(/\s+\/\s+/)) {
        let seg = part.trim();
        if (!seg) continue;
        let st = segmentType(seg);
        if (st.type === 'bare' && prev) {
          const head = { add: '효과 추가', raise: '효과 상승', turn: '턴 상승' }[prev.type];
          if (head) {
            seg = `${head} : ${seg}`;
            st = segmentType(seg);
          } else {
            st = prev;
          }
        }
        prev = st;
        const line = { tag: label, kind: 'up', text: part.trim(), entries: [], note: null, flags: [] };
        if (st.type === 'add') {
          line.entries = own.filter((e) => e.source === source && seg.includes(e.raw));
          if (!line.entries.length) line.flags.push({ lv: 'hard', text: '추가 효과를 못 읽었어요' });
        } else if (st.type === 'raise' || st.type === 'turn') {
          const loose = st.key.replace(/\s*효과$/, '');
          const hit = own.find((e) => e.kind === 'effect' && (normKey(e.name) === st.key || normKey(e.name) === loose));
          if (hit) {
            const got = st.type === 'raise' ? entryValue(hit) : hit.duration?.n;
            const want = Number(st.type === 'raise' ? st.value : st.n);
            const unit = st.type === 'raise' ? '%' : '턴';
            if (got != null && got >= want) {
              line.note = { tone: 'team', text: `반영됨 → ${hit.name} ${got}${unit}` };
            } else {
              line.note = { tone: 'warn', text: `지금 ${got ?? '없음'}${got != null ? unit : ''}` };
              line.flags.push({ lv: 'hard', text: `강화 수치 ${want}${unit}가 반영 안 됐어요 (${names.has(st.key) ? '값 차이' : '이름 끝 「효과」 때문에 못 맞춤'})` });
            }
          } else if (/추가 적용/.test(seg) || st.key.length > 14 || /[([]|의$|이$|가$|비례|수치|흡수량|회복량|부활 시|처형 조건/.test(st.key)) {
            line.note = { tone: 'mute', text: '수치 문장 — 팀 빌더 미표시' };
          } else if (/\s효과$/.test(st.key)) {
            line.note = { tone: 'mute', text: '중첩 효과 안쪽 수치 — 팀 빌더 미표시' };
          } else {
            line.flags.push({ lv: 'hard', text: `올릴 효과 「${st.key}」를 이 스킬에서 못 찾았어요` });
          }
        } else if (st.type === 'ignored') {
          line.note = { tone: 'mute', text: st.text };
        } else if (st.type === 'applied') {
          line.note = { tone: 'team', text: st.text };
        } else if (st.type === 'bare') {
          line.entries = own.filter((e) => e.source === source && e.raw === seg);
          const name = normKey(seg.replace(/\[[^\]]+\]/g, ' ').replace(/지속\s*\d+\s*턴/, ' '));
          const turns = Number(seg.match(/(\d+)\s*턴/)?.[1]);
          const hit = own.find((e) => e.kind === 'effect' && normKey(e.name) === name);
          if (line.entries.length) {
            line.note = { tone: 'team', text: '머리말 없음 → 별도 효과로 추가 (기존 턴은 그대로)' };
          } else if (/효과 상승$/.test(seg)) {
            line.note = { tone: 'mute', text: '% 아닌 수치 — 팀 빌더 미표시' };
          } else if (hit && (!turns || hit.duration?.n >= turns)) {
            line.note = { tone: 'team', text: `머리말 없음 → 반영됨 (${hit.name}${turns ? ` ${hit.duration.n}턴` : ''})` };
          } else {
            line.note = { tone: 'warn', text: '못 읽음' };
            line.flags.push({ lv: 'hard', text: '「효과 추가 :」 같은 머리말이 없는 문장이라 못 읽었어요' });
          }
        } else {
          line.note = { tone: 'warn', text: '반영 안 함' };
          line.flags.push({ lv: 'soft', text: `「${st.label}」 문장은 팀 빌더에 반영하지 않아요` });
        }
        lines.push(line);
      }
    };
    for (const line of skill.skillEnhance || []) upgrade('강화', '강화', line);
    for (const [tier, text] of Object.entries(skill.transcendenceEffects || {})) upgrade(tier, tier, text);
    for (const l of lines) for (const e of l.entries) l.flags.push(...entryFlags(e));
    return { skill, label: skillSlotLabel(skill), lines };
  });
  const effectKeys = new Set(collectHeroEntries(hero, { rareSet, allowTower: true })
    .filter((e) => e.kind === 'effect').flatMap((e) => [bareKey(e.name), bareKey(e.key)]));
  const tipOnly = [...new Set((hero.skills || []).flatMap((s) => Object.keys(s.tooltips || {})).map(bareKey))]
    .filter((k) => k && !effectKeys.has(k) && !DAMAGE_WORD_RE.test(k));
  const all = skills.flatMap((s) => s.lines.flatMap((l) => l.flags));
  return {
    hero,
    skills,
    tipOnly,
    hard: all.filter((f) => f.lv === 'hard').length,
    soft: all.filter((f) => f.lv === 'soft').length + (tipOnly.length ? 1 : 0),
  };
}
