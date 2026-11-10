/**
 * 버프 · 디버프 · 특수 효과 아이콘 (7katlas 도감 툴팁 아이콘, 원본 asset/특수효과, 버프, 디버프 아이콘).
 * 이름 → `public/images/effects/{아이콘 ID}.webp`. 띄어쓰기는 무시하고, 없으면 「(중첩)」 · 「효과」 등을 떼고 다시 찾는다.
 */
import data from '../data/effectIcons.json';

const norm = (s) => String(s || '').replace(/\s+/g, '').replace(/[[\]]/g, '');
const ICONS = new Map(Object.entries(data.icons).map(([k, v]) => [norm(k), v]));
const TYPES = new Map(Object.entries(data.types).map(([k, v]) => [norm(k), v]));

/** 우리 엔진 이름 ↔ 도감 이름이 다른 것 (왼쪽 = 띄어쓰기 뺀 우리 이름) */
const ALIASES = {
  스킬쿨타임초기화: '쿨타임초기화',
  스킬쿨타임감소: '쿨타임감소',
  모든버프해제: '버프해제',
  생명력회복: '지속회복',
  모든피해무효화증가: '모든피해무효화',
  레벨증가: '레벨업(중첩)',
  불굴피격횟수증가: '불굴',
  모든피해가방어무시피해로적용: '방어무시',
  수정룡: '신체강화:수정룡',
  피해면역: '모든피해면역',
  피해무효화: '모든피해무효화',
  쿨타임증가: '스킬쿨타임증가',
  물리피해량감소: '피해량감소',
  마법피해량감소: '피해량감소',
  효과적중감소: '효과적용확률감소',
  약점공격피해량감소: '약점공격확률감소',
  '4~5인공격기피해량증가': '3인공격기피해량증가',
  '1인공격기피해량감소': '피해량감소',
  '3인공격기피해량감소': '피해량감소',
  '4~5인공격기피해량감소': '피해량감소',
  최대생명력증가: '최대생명력비례방어력증가',
  즉사효과적용확률감소: '효과적용확률감소',
  감전효과적용확률감소: '효과적용확률감소',
};

function candidates(name) {
  const n = norm(name);
  const out = [n, ALIASES[n]];
  const noStack = n.replace(/\(중첩\)$/, '');
  out.push(noStack, `${noStack}(중첩)`, ALIASES[noStack]);
  /** 「용이무모 (물리 공격력)」처럼 뒤 괄호 설명 */
  const noParen = n.replace(/\([^)]*\)$/, '');
  out.push(noParen, ALIASES[noParen]);
  out.push(n.replace(/효과$/, ''), n.replace(/^모든/, ''), `모든${n}`);
  /** 「검무 쿨타임 감소」 · 「[용린성하] 쿨타임 초기화」 → 공용 쿨타임 아이콘 */
  if (/쿨타임감소$/.test(n)) out.push('쿨타임감소');
  if (/쿨타임초기화$/.test(n)) out.push('쿨타임초기화');
  return out.filter(Boolean);
}

function lookup(map, name) {
  for (const k of candidates(name)) {
    if (map.has(k)) return map.get(k);
  }
  return null;
}

/** 효과 이름 → 아이콘 주소 (없으면 null) */
export function effectIconUrl(name) {
  const id = lookup(ICONS, name);
  return id ? `/images/effects/${id}.webp` : null;
}

/** 효과 이름 → 'buff' | 'debuff' | 'special' | null (도감 분류) */
export function effectIconType(name) {
  return lookup(TYPES, name);
}
