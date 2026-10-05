import { EXCLUSIVE_GEAR_TUNING_OPTIONS, emptyPrioritySlots } from '../data/exclusiveGearOptions';

const OPTION_SHORT = {
  '모든 공격력(%)': '공',
  '방어력(%)': '방',
  '생명력(%)': '생',
  '효과 적중': '효적',
  '효과 저항': '효저',
  '피해 증폭': '피증',
};

/** gear.exclusiveOptions(선택 필드) → 4칸 배열. 키가 없거나 깨진 값이면 빈 칸. */
export function exclusiveOptionSlots(gear) {
  const raw = Array.isArray(gear?.exclusiveOptions) ? gear.exclusiveOptions : [];
  return emptyPrioritySlots().map((_, i) => (
    EXCLUSIVE_GEAR_TUNING_OPTIONS.includes(raw[i]) ? raw[i] : ''
  ));
}

/** 세팅 확인용 한 줄 요약 (예: 공·공·피증·파쇄). 고른 옵션이 없으면 ''. */
export function exclusiveOptionSummary(gear) {
  return exclusiveOptionSlots(gear)
    .filter(Boolean)
    .map((opt) => OPTION_SHORT[opt] || opt)
    .join('·');
}
