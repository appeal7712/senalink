import { accessoryCatalog } from '../data/gearDex';

export const CRAFT_STARS = [6, 5, 4];

/** 고정 옵션 세공 기본 성공 확률 (%) — [베이스 성급][재료 성급] */
const FIXED_BASE_RATE = {
  6: { 6: 30, 5: 25, 4: 20 },
  5: { 5: 40, 4: 30 },
  4: { 4: 50 },
};

export const CRAFT_CHARMS = [
  { id: 'advanced', label: '고급 세공 부적', bonus: 5, iconUrl: '/images/craft/charm-advanced.png', tone: 'advanced' },
  { id: 'rare', label: '희귀 세공 부적', bonus: 10, iconUrl: '/images/craft/charm-rare.png', tone: 'rare' },
  { id: 'legendary', label: '전설 세공 부적', bonus: 20, iconUrl: '/images/craft/charm-legendary.png', tone: 'legendary' },
  { id: 'ancient', label: '고대 세공 부적', bonus: 40, iconUrl: '/images/craft/charm-ancient.png', tone: 'ancient' },
  { id: 'safe', label: '안전 세공 부적', bonus: 100, iconUrl: '/images/craft/charm-safe.png', tone: 'safe' },
];

/** 재료 장신구 등급 (공식 표 「○○ 재료 확률」 열) */
export const MATERIAL_RARITIES = ['normal', 'advanced', 'rare', 'legendary'];

/**
 * 임의 옵션 세공 공식 확률 (%) — [옵션 등급][재료 등급], 옵션 1종당 값.
 * 옵션 등급 = 도감 장신구 등급 (전설 3 · 희귀 7 · 고급 14 · 일반 8).
 */
const RANDOM_RATE = {
  legendary: { normal: 0.00333, advanced: 0.00666, rare: 0.0333, legendary: 0.333 },
  rare: { normal: 0.005826, advanced: 0.01165, rare: 0.05826, legendary: 0.3496 },
  advanced: { normal: 2.143, advanced: 2.143, rare: 2.143, legendary: 2.143 },
  normal: { normal: 8.7435, advanced: 8.7371, rare: 8.6864, legendary: 8.3191 },
};

/** ★6 재료 임의 세공에서 전설 미만이 나올 때마다 전설 옵션 1종당 누적 증가량 (%p) */
export const LEGEND_PITY_STEP = { normal: 0.00001, advanced: 0.00008, rare: 0.004, legendary: 0.04 };

/** 전설 옵션 3종 합이 100%를 넘지 않도록 1종당 상한 */
const LEGEND_RATE_MAX = 100 / 3;

export const RARITY_LABEL = {
  legendary: '전설',
  rare: '희귀',
  advanced: '고급',
  normal: '일반',
};

export const craftAccessories = accessoryCatalog;

export function accessoryById(id) {
  return craftAccessories.find((a) => a.id === id) || null;
}

export function fixedBaseRate(baseStar, matStar) {
  return FIXED_BASE_RATE[baseStar]?.[matStar] ?? null;
}

export function charmBonus(charmIds) {
  return CRAFT_CHARMS.filter((c) => charmIds.includes(c.id)).reduce((sum, c) => sum + c.bonus, 0);
}

export function fixedSuccessRate(baseStar, matStar, charmIds) {
  const base = fixedBaseRate(baseStar, matStar);
  if (base == null) return null;
  return Math.min(100, base + charmBonus(charmIds));
}

/** 같은 효과(같은 반지 계열)는 세공 불가 */
export function sameEffect(a, b) {
  if (!a || !b) return false;
  return a.id === b.id;
}

export function optionGroup(acc) {
  return RANDOM_RATE[acc?.rarity] ? acc.rarity : 'normal';
}

function materialRarity(matRarity) {
  return MATERIAL_RARITIES.includes(matRarity) ? matRarity : 'normal';
}

/** 누적 증가는 ★6 재료일 때만 적용 */
export function pityApplies(matStar) {
  return matStar === 6;
}

/** 게임 화면 표기 기준 전설 옵션 1종당 확률 (%) — 누적 증가 포함 */
export function legendDisplayRate(rarity, bonus = 0) {
  return Math.min(LEGEND_RATE_MAX, RANDOM_RATE.legendary[rarity] + Math.max(0, bonus));
}

/** 사용자가 입력한 표기 확률 → 누적 증가량 (%p) */
export function bonusFromDisplayRate(rarity, displayRate) {
  const base = RANDOM_RATE.legendary[rarity];
  const clamped = Math.min(LEGEND_RATE_MAX, Math.max(base, Number(displayRate) || 0));
  return roundRate(clamped - base);
}

export function roundRate(v) {
  return Math.round(v * 1e8) / 1e8;
}

/**
 * 임의 옵션 세공 결과 후보 (rate = 실제 적용 %, 합 100).
 * 1) 공식 표 기본 확률 2) ★6 재료면 전설에 누적 증가분, 그만큼 전설 외 옵션을 비율대로 감소
 * 3) 대상 장신구와 동일 효과 제외 후 남은 옵션 비율대로 재계산
 */
export function randomOptionTable(baseAcc, matRarity, matStar, bonus = 0) {
  if (!baseAcc) return [];
  const rarity = materialRarity(matRarity);
  const legendRate = pityApplies(matStar) ? legendDisplayRate(rarity, bonus) : RANDOM_RATE.legendary[rarity];
  const all = craftAccessories.map((acc) => ({ acc, group: optionGroup(acc) }));
  const baseNonLegend = all
    .filter((r) => r.group !== 'legendary')
    .reduce((s, r) => s + RANDOM_RATE[r.group][rarity], 0);
  const legendCount = all.filter((r) => r.group === 'legendary').length;
  const nonLegendScale = baseNonLegend > 0
    ? Math.max(0, 100 - legendRate * legendCount) / baseNonLegend
    : 0;
  const weighted = all
    .filter((r) => !sameEffect(r.acc, baseAcc))
    .map((r) => ({
      ...r,
      legendary: r.group === 'legendary',
      weight: r.group === 'legendary' ? legendRate : RANDOM_RATE[r.group][rarity] * nonLegendScale,
    }));
  const total = weighted.reduce((s, r) => s + r.weight, 0) || 1;
  return weighted.map(({ weight, ...r }) => ({ ...r, rate: (weight / total) * 100 }));
}

/** 전설이 나올 때까지 평균 시도 횟수 (누적 증가 반영) */
export function expectedLegendTries(baseAcc, matRarity, matStar, bonus = 0) {
  if (!baseAcc) return null;
  const legendShare = (b) => randomOptionTable(baseAcc, matRarity, matStar, b)
    .filter((r) => r.legendary)
    .reduce((s, r) => s + r.rate, 0) / 100;
  const first = legendShare(bonus);
  if (first <= 0) return null;
  if (!pityApplies(matStar)) return 1 / first;
  const step = LEGEND_PITY_STEP[materialRarity(matRarity)];
  let survive = 1;
  let expected = 0;
  let b = bonus;
  for (let n = 1; n <= 200000; n += 1) {
    const p = Math.min(1, legendShare(b));
    expected += n * survive * p;
    survive *= 1 - p;
    if (survive < 1e-7) return expected;
    b += step;
  }
  return expected + survive * 200000;
}

/** 재료 장신구 등급별 표기 확률 (게임 화면 4열) */
export function legendDisplayColumns(bonus = 0) {
  return MATERIAL_RARITIES.map((rarity) => ({ rarity, rate: legendDisplayRate(rarity, bonus) }));
}

/** 성급별 수치 — [6성, 4성, 5성] (6성은 도감 원문) */
const STAR_TOKENS = {
  acc_권능: [['150%', '30%', '75%'], ['4턴', '2턴', '3턴'], [' [해제불가]', '', ' [해제불가]']],
  acc_부활: [['100%', '25%', '50%']],
  acc_불사: [['3턴', '1턴', '2턴']],
  'acc_건강의 반지': [['18%', '6%', '11%']],
  'acc_공성의 반지': [['10%', '3%', '6%']],
  'acc_근성의 반지': [['18%', '6%', '11%']],
  'acc_기합의 반지': [['90%', '30%', '50%']],
  'acc_섬멸의 반지': [['10%', '3%', '6%']],
  'acc_철벽의 반지': [['100%', '35%', '55%']],
  'acc_토벌의 반지': [['12%', '4%', '8%']],
  'acc_가시 반지': [['15%', '5%', '10%']],
  'acc_공포의 반지': [['12%', '4%', '8%']],
  'acc_기회의 반지': [['10%', '3%', '6%']],
  'acc_꿈의 반지': [['12%', '4%', '8%']],
  'acc_독사 반지': [['15%', '5%', '10%']],
  'acc_마법의 반지': [['12%', '4%', '8%']],
  'acc_메두사의 반지': [['10%', '3%', '6%']],
  'acc_번뜩이는 반지': [['10%', '3%', '6%']],
  'acc_샐리맨더의 반지': [['15%', '5%', '10%']],
  'acc_설원의 반지': [['12%', '4%', '8%']],
  'acc_시간의 반지': [['12%', '4%', '8%']],
  'acc_재앙의 반지': [['10%', '3%', '6%']],
  'acc_저주의 반지': [['12%', '4%', '8%']],
  'acc_죽음의 반지': [['6%', '2%', '4%']],
  'acc_복수의 반지': [['6%', '2%', '4%']],
  'acc_수호의 반지': [['10%', '3%', '6%']],
  'acc_보호의 반지': [['10%', '3%', '6%']],
  'acc_자연의 반지': [['10%', '3%', '6%']],
  'acc_저항의 반지': [['15%', '5%', '10%']],
  'acc_적중의 반지': [['15%', '5%', '10%']],
  'acc_집중의 반지': [['12%', '4%', '8%']],
  'acc_행운의 반지': [['10%', '3%', '6%']],
};

/** 성급별 이름 접두어 — 4성 낡은 · 5성 없음 · 6성 고급 */
const STAR_PREFIX = { 4: '낡은 ', 5: '', 6: '고급 ' };

export function ringName(acc, star = 6) {
  if (!acc) return '';
  return `${STAR_PREFIX[star] ?? ''}${acc.displayName}`;
}

/** 성급별 반지 이미지 (6성 = 도감 이미지) */
export function ringIconUrl(acc, star = 6) {
  if (!acc) return '';
  if (star === 4 || star === 5) return `/images/craft/rings/${star}/${acc.displayName}.png`;
  return acc.iconUrl;
}

/** 성급에 맞춘 효과 문구 (6성 = 도감 원문) */
export function effectText(acc, star = 6) {
  if (!acc) return '';
  const tokens = STAR_TOKENS[acc.id];
  if (!tokens || star === 6) return acc.effect;
  const col = star === 4 ? 1 : star === 5 ? 2 : 0;
  return tokens.reduce((text, t) => text.replace(t[0], t[col]), acc.effect);
}

export function rollRandomOption(table, rand = Math.random) {
  const total = table.reduce((s, r) => s + r.rate, 0);
  let x = rand() * total;
  for (const row of table) {
    x -= row.rate;
    if (x < 0) return row;
  }
  return table[table.length - 1] || null;
}

export function rollFixed(rate, rand = Math.random) {
  return rand() * 100 < rate;
}

export function formatRate(rate) {
  if (rate == null) return '-';
  if (rate >= 10) return `${Math.round(rate * 10) / 10}%`;
  if (rate >= 1) return `${Math.round(rate * 100) / 100}%`;
  if (rate >= 0.01) return `${Math.round(rate * 10000) / 10000}%`;
  return `${trimRate(rate)}%`;
}

/** 소수 6자리까지, 뒤쪽 0 제거 */
export function trimRate(rate) {
  return String(Number(Number(rate).toFixed(6)));
}
