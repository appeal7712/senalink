import uiAssets from './exclusiveGearUiAssets.generated.json';

/** 조율 옵션 4칸 × 우선순위 2세트 */
export const EXCLUSIVE_GEAR_SLOT_COUNT = 4;
export const EXCLUSIVE_GEAR_PRIORITY_COUNT = 2;

/** 게임 내 전용장비 조율 옵션 (한글명 = Firestore 저장 키) */
export const EXCLUSIVE_GEAR_TUNING_OPTIONS = [
  '모든 공격력(%)',
  '방어력(%)',
  '생명력(%)',
  '효과 적중',
  '효과 저항',
  '피해 증폭',
  '파쇄',
  '탄성',
  '재생',
];

/** 옵션별 고정 표시 수치 */
export const EXCLUSIVE_GEAR_OPTION_VALUES = {
  '모든 공격력(%)': '12%',
  '방어력(%)': '12%',
  '생명력(%)': '12%',
  '효과 적중': '10%',
  '효과 저항': '10%',
  '피해 증폭': '4%',
  파쇄: '12%',
  탄성: '15%',
  재생: '6%',
};

const OPTION_ICON_BY_KEY = Object.fromEntries(
  Object.entries(uiAssets.options || {}).map(([label, info]) => [label, info.src]),
);

export const EXCLUSIVE_GEAR_UI = {
  menuIcon: uiAssets.menuIcon,
  optionBar: uiAssets.optionBar,
  legendIcon: uiAssets.legendIcon,
  priorityIcons: {
    '1': '/images/ui/exclusive-gear/priority-1.png',
    '2': '/images/ui/exclusive-gear/priority-2.png',
  },
};

export function getExclusiveGearOptionIconUrl(optionKey) {
  if (!optionKey) return '';
  return OPTION_ICON_BY_KEY[optionKey] || '';
}

export function getExclusiveGearOptionValueLabel(optionKey) {
  if (!optionKey) return '';
  return EXCLUSIVE_GEAR_OPTION_VALUES[optionKey] || '';
}

export function emptyPrioritySlots() {
  return Array(EXCLUSIVE_GEAR_SLOT_COUNT).fill('');
}

export function emptyPriorities() {
  return Object.fromEntries(
    Array.from({ length: EXCLUSIVE_GEAR_PRIORITY_COUNT }, (_, i) => [
      String(i + 1),
      emptyPrioritySlots(),
    ]),
  );
}
