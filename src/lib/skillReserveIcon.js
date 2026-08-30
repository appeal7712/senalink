/** 스킬 예약 개수(0–3)에 맞는 게임 아이콘 키 */
export function skillReserveIconName(reservedSkills) {
  const n = Math.min(3, Math.max(0, (reservedSkills || []).filter(Boolean).length));
  return `skillReserve${n}`;
}

/** 게임 PNG 스킬 예약 아이콘 표시 높이(px) — Icon size prop */
export const SKILL_RESERVE_ICON_SIZE = 22;
export const SKILL_RESERVE_ICON_SIZE_SM = 20;
export const SKILL_RESERVE_ICON_SIZE_LG = 25;
