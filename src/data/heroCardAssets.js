/** negi-lab 동일 레이어 초상화 카드용 공통 경로·등급 매핑 */
export const HERO_CARD_BASE = '/images/hero-card';

export const GRADE_BG = {
  '01': `${HERO_CARD_BASE}/grade/GradeBG01.webp`,
  '02': `${HERO_CARD_BASE}/grade/GradeBG02.webp`,
  '03': `${HERO_CARD_BASE}/grade/GradeBG03.webp`,
  '04': `${HERO_CARD_BASE}/grade/GradeBG04.webp`,
  '05': `${HERO_CARD_BASE}/grade/GradeBG05.webp`,
};

export const SP_BADGE = {
  plus: `${HERO_CARD_BASE}/badge/SPBG01.webp`,
  plusPlus: `${HERO_CARD_BASE}/badge/SPBG03.webp`,
  alt: `${HERO_CARD_BASE}/badge/SPBG02.webp`,
};

export const ROLE_ICON_NEGI = {
  offensive: `${HERO_CARD_BASE}/role/RoleIcon_01.webp`,
  magic: `${HERO_CARD_BASE}/role/RoleIcon_02.webp`,
  defensive: `${HERO_CARD_BASE}/role/RoleIcon_03.webp`,
  support: `${HERO_CARD_BASE}/role/RoleIcon_04.webp`,
  universal: `${HERO_CARD_BASE}/role/RoleIcon_05.webp`,
};

export const STAR_ICON = {
  3: `${HERO_CARD_BASE}/stars/Star_M3.webp`,
  4: `${HERO_CARD_BASE}/stars/Star_M4.webp`,
  5: `${HERO_CARD_BASE}/stars/Star_M5.webp`,
  6: `${HERO_CARD_BASE}/stars/Star_M6.webp`,
  7: `${HERO_CARD_BASE}/stars/Star_M7.webp`,
};

/**
 * cardTier / negi rarity → GradeBG + 전설+/++ 뱃지
 * (negi: common01 / rare02 / epic03 / legendary系04 + SPBG)
 */
export function getHeroCardChrome(hero, meta) {
  const rarity = String(meta?.negiRarity || hero?.rarity || '').toLowerCase();
  const tier = hero?.cardTier || 'normal';

  let bgKey = '03';
  let badge = null;

  // 전설 계열(우리 cardTier / negi legendary*) 우선
  if (
    tier === 'old_seven'
    || tier === 'special'
    || tier === 'semi_special'
    || rarity === 'legendary'
    || rarity === 'legendary+'
    || rarity === 'legendary++'
    || rarity === 'legend'
    || rarity === 'legend_special'
    || rarity === '伝説'
    || rarity === '伝説+'
    || rarity === '伝説++'
  ) {
    bgKey = '04';
  } else if (rarity === 'common' || rarity === '一般') {
    bgKey = '01';
  } else if (rarity === 'rare' || rarity === '上級' || rarity === 'advanced') {
    bgKey = '02';
  } else if (rarity === 'epic' || rarity === '希少') {
    bgKey = '03';
  } else {
    bgKey = '03';
  }

  if (rarity === 'legendary++' || rarity === '伝説++' || tier === 'old_seven') {
    badge = SP_BADGE.plusPlus;
  } else if (rarity === 'legendary+' || rarity === '伝説+' || tier === 'special') {
    badge = SP_BADGE.plus;
  }

  return {
    bgUrl: GRADE_BG[bgKey],
    badgeUrl: badge,
  };
}

export function getHeroRoleIcon(hero, meta) {
  if (meta?.negiRole) {
    const n = String(meta.negiRole).padStart(2, '0');
    return `${HERO_CARD_BASE}/role/RoleIcon_${n}.webp`;
  }
  const role = hero?.role || hero?.attackType;
  if (ROLE_ICON_NEGI[role]) return ROLE_ICON_NEGI[role];
  if (role === 'physical') return ROLE_ICON_NEGI.offensive;
  return ROLE_ICON_NEGI.universal;
}

export function getHeroStarIcon(hero, negiStar) {
  if (hero?.isAwakened) return STAR_ICON[7];
  const n = Number(negiStar || 6);
  return STAR_ICON[n] || STAR_ICON[6];
}
