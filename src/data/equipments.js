// 세븐나이츠 리버스 9대 인게임 공식 장비 세트 & 유효 메인 옵션 데이터베이스

export const equipments = [
  { id: "eq_선봉장", name: "선봉장", type: "장비", iconUrl: "/images/equipment/선봉장.png", set2: "모든 공격력 20%", set4: "모든 공격력 45%, 효과 적중 20%", description: "모든 공격력과 효과 적중을 향상시키는 메인 딜러 세트" },
  { id: "eq_추적자", name: "추적자", type: "장비", iconUrl: "/images/equipment/추적자.png", set2: "약점 공격 확률 15%", set4: "약점 공격 확률 35%, 약점 공격 피해량 35%", description: "약점 공격 특화 딜러 세트" },
  { id: "eq_성기사", name: "성기사", type: "장비", iconUrl: "/images/equipment/성기사.png", set2: "생명력 17%", set4: "생명력 40%, 받는 회복량 증가 20%", description: "생명력과 회복 효율을 높이는 유지력 세트" },
  { id: "eq_수문장", name: "수문장", type: "장비", iconUrl: "/images/equipment/수문장.png", set2: "막기 확률 15%", set4: "막기 확률 30%, 막기 피해 감소율 10%", description: "막기 발동률 및 피해 감소율을 높이는 세트" },
  { id: "eq_수호자", name: "수호자", type: "장비", iconUrl: "/images/equipment/수호자.png", set2: "방어력 20%", set4: "방어력 45%, 효과 저항 20%", description: "방어력과 효과 저항을 향상시키는 방어 세트" },
  { id: "eq_암살자", name: "암살자", type: "장비", iconUrl: "/images/equipment/암살자.png", set2: "치명타 확률 15%", set4: "치명타 확률 30%, 방어 무시 15%", description: "치명타 발동 및 방어 무시 효과 세트" },
  { id: "eq_복수자", name: "복수자", type: "장비", iconUrl: "/images/equipment/복수자.png", set2: "주는 피해량 15%", set4: "주는 피해량 30%, 보스 대상으로 피해량 40%", description: "공성전 및 원정대 보스전 특화 딜러 세트" },
  { id: "eq_주술사", name: "주술사", type: "장비", iconUrl: "/images/equipment/주술사.png", set2: "효과 적중 17%", set4: "효과 적중 35%, 효과 적용 확률 10%", description: "디버프 성공률을 극대화하는 주술 세트" },
  { id: "eq_조율자", name: "조율자", type: "장비", iconUrl: "/images/equipment/조율자.png", set2: "효과 저항 17%", set4: "효과 저항 35%, 행동 제어 면역 1턴", description: "첫 턴 행동 제어 면역 세트" },
];

export const EQUIPMENT_SET_ICONS = {
  '선봉장': '/images/equipment/선봉장.png',
  '추적자': '/images/equipment/추적자.png',
  '성기사': '/images/equipment/성기사.png',
  '수문장': '/images/equipment/수문장.png',
  '수호자': '/images/equipment/수호자.png',
  '암살자': '/images/equipment/암살자.png',
  '복수자': '/images/equipment/복수자.png',
  '주술사': '/images/equipment/주술사.png',
  '조율자': '/images/equipment/조율자.png',
};

export const accessories = [
  { id: "acc_불사", name: "불사의 반지", shortLabel: "불사", type: "장신구", iconUrl: "/images/accessories/불사의 반지.png", effect: "사망 시 생명력 100% 상태로 1회 부활", description: "핵심 부활 장신구" },
  { id: "acc_권능", name: "권능의 반지", shortLabel: "권능", type: "장신구", iconUrl: "/images/accessories/권능의 반지.png", effect: "치명상 시 생명력 1로 생존 후 보호막 생성", description: "원샷 킬 방지 최고급 장신구" },
  { id: "acc_부활", name: "부활의 반지", shortLabel: "부활", type: "장신구", iconUrl: "/images/accessories/부활의 반지.png", effect: "사망 시 일정 생명력으로 부활", description: "부활 계열 장신구" },
  { id: "acc_상태이상", name: "재앙의 반지", shortLabel: "상태이상", type: "장신구", iconUrl: "/images/accessories/재앙의 반지.png", effect: "기본 공격 시 상태이상 부여", description: "상태이상 장신구 · 재앙의 반지" },
  { id: "acc_출혈화상", name: "샐리맨더의 반지", shortLabel: "출혈&화상", type: "장신구", iconUrl: "/images/accessories/샐리맨더의 반지.png", effect: "기본 공격 시 출혈·화상 부여", description: "출혈&화상 장신구 · 샐리맨더의 반지" },
  { id: "acc_토벌공성", name: "토벌의 반지", shortLabel: "토벌&공성", type: "장신구", iconUrl: "/images/accessories/토벌의 반지.png", effect: "보스·공성 대상 피해량 상승", description: "토벌&공성 장신구 · 토벌의 반지" },
];

export function findAccessory(value) {
  if (!value) return accessories[0];
  return accessories.find(a => a.name === value || a.shortLabel === value) || accessories[0];
}

export const equipmentSets = equipments;

// 무기 메인 옵션 (실전 유효 옵션만 엄선!)
// 덱 수정 / 길드전 / ops 메타덱이 모두 이 배열을 쓴다. 여기만 고치면 전부 반영된다.
export const weaponOptions = [
  '약점 공격 확률',
  '치명타 확률',
  '치명타 피해',
  '모든 공격력(%)',
  '효과 적중',
  '방어력(%)',
  '생명력(%)'
];

// 방어구 메인 옵션 (실전 유효 옵션만 엄선!) — 무기와 같은 단일 출처
export const armorOptions = [
  '받는 피해 감소',
  '막기 확률',
  '모든 공격력(%)',
  '방어력(%)',
  '생명력(%)',
  '효과 저항'
];

// 장신구 옵션 (DB 3종)
export const accessoryOptions = [
  '불사의 반지',
  '권능의 반지',
  '부활의 반지',
  '재앙의 반지',
  '샐리맨더의 반지',
  '토벌의 반지',
];
