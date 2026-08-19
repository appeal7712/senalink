export const systemRulesData = {
  system_rules: {
    speed_attack: {
      name: "속공",
      description: "전투 시 모든 대상의 속공을 비교하여 기본 공격 순서 결정. 속공 합이 더 높은 팀이 우선 스킬 사용."
    },
    damage_types: {
      critical: {
        name: "치명타",
        stat: "치명타 확률",
        max: "100%",
        min: "0%",
        critical_damage_cap: { min: "100%", max: "500%" },
        description: "공격 성공 시 치명타 피해 비율만큼 추가 데미지 부여"
      },
      block: {
        name: "막기",
        stat: "막기 확률",
        max: "100%",
        min: "0%",
        effect: "피해량 50% 감소 (치명타와 동시 발생 시 일반 피해로 상쇄)"
      },
      weak_point: {
        name: "약점 공격",
        stat: "약점 공격 확률",
        max: "100%",
        min: "0%",
        effect: "생명력 비율이 가장 낮은 적 우선 공격 및 피해량 30% 증가"
      }
    },
    effect_probability: {
      effect_hit: "디버프 부여 시 대상의 효과 저항을 상쇄 (최대 100%, 최소 0%)",
      effect_res: "디버프에 걸릴 확률 감소 (최대 100%, 최소 0%)",
      effect_apply: "스킬 기본 확률에 곱적용되는 수치 (100% 초과 가능)"
    }
  },
  exclusive_equipment_stats: {
    "피해 증폭": "입히는 모든 피해량 일정 비율 증가",
    "파쇄": "공격 시 대상의 막기 확률 감소 적용",
    "탄성": "치명타 피격 시 받는 피해량 감소",
    "재생": "받는 회복량 및 보호막량 증가"
  },
  potential_system: {
    unlock_condition: "2초월 이상 6성 영웅",
    materials: ["상급 원소", "내면의 불씨", "골드"],
    levels: [
      {
        level: 10,
        condition: "2초월 이상",
        cost: { element: 0, embers: 800 },
        stat_bonus: { atk: 100, def: 70, hp: 320 }
      },
      {
        level: 20,
        condition: "4초월 이상",
        cost: { element: 60, embers: 1000 },
        stat_bonus: { atk: 220, def: 150, hp: 680 }
      },
      {
        level: 30,
        condition: "6초월 이상",
        cost: { element: 120, embers: 1200 },
        stat_bonus: { atk: 370, def: 250, hp: 1130 }
      }
    ]
  },
  effects_registry: {
    cc_effects: [
      { name: "기절", category: "행동 제어", description: "행동 불가" },
      { name: "마비", category: "행동 제어", description: "행동 불가 및 막기 확률 0% 고정" },
      { name: "감전", category: "행동 제어", description: "행동 불가 및 적중 피격 시 시전자 공격력 40% 추가 피해" },
      { name: "빙결", category: "행동 제어", description: "행동 불가, 피격 시 해제되며 최대 생명력 40% 방어 무시 피해 (최대 시전자 공격력 300% 제한)" },
      { name: "침묵", category: "행동 제어", description: "액티브 스킬 발동 불가 (기본 공격 가능)" },
      { name: "수면", category: "행동 제어", description: "행동 불가, 피격 시 확정 치명타 피해 (최대 생명력 7% 이상 피해 시 즉시 해제)" },
      { name: "석화", category: "행동 제어", description: "행동 불가, 해제/만료 시 시전자 공격력 120% 피해" },
      { name: "실명", category: "행동 제어", description: "기본 공격, 반격, 협공 확정 빗나감" },
      { name: "공포", category: "행동 제어", description: "행동 불가 및 효과 저항 0% 고정" }
    ],
    dot_effects: [
      { name: "즉사", category: "지속 피해", description: "매 턴 현재 생명력 20% 피해, 만료/2중첩 시 즉시 사망" },
      { name: "출혈", category: "지속 피해", description: "매 턴 시전자 공격력 60% 관통 피해 (중첩당 피해 증가, 최대 5중첩)" },
      { name: "화상", category: "지속 피해", description: "매 턴 시전자 공격력 80% 피해" },
      { name: "중독", category: "지속 피해", description: "매 턴 대상 최대 생명력 6% 피해 (최대 시전자 공격력 150% 제한)" }
    ],
    survival_effects: [
      { name: "피해 면역", category: "생존", description: "지정 턴 동안 특정/모든 피해 무시 (관통/턴감으로 파훼 가능)" },
      { name: "피해 무효화", category: "생존", description: "지정 피격 횟수만큼 피해 무시" },
      { name: "불사", category: "생존", description: "사망 시 HP 1 상태로 부활 후 지정 턴 동안 사망하지 않음 (회복 불가, 버프해제 시 사망)" },
      { name: "축복", category: "생존", description: "1회 피격당 최대 피해량이 최대 생명력의 일정 비율(예: 25%)을 넘지 않음" },
      { name: "권능", category: "생존", description: "치명상 피격 시 생명력 1로 1회 생존 (라운드당 1회)" },
      { name: "위장", category: "생존", description: "단일 대상 스킬 타겟 제외, 다중 스킬 확정 빗나감, 반격 불가" },
      { name: "링크", category: "생존", description: "직접 피해를 링크 아군끼리 균등 분배 후 피해량 감소" },
      { name: "불굴", category: "생존", description: "피격 횟수 기반 부활 버프 (버프 해제 불가, 적 사망 시 횟수 증가)" },
      { name: "방호", category: "생존", description: "받는 피해의 35%를 시전자가 대신 받고 해당 피해 50% 추가 감소" },
      { name: "우위", category: "생존", description: "지정 능력치가 공격자보다 높을 경우 확정 빗나감 및 피해 감소" },
      { name: "부활", category: "생존", description: "사망한 영웅 지정 생명력으로 부활 (액티브 제외 효과는 전투당 1회)" }
    ],
    special_utility: [
      { name: "협공", description: "아군 기본 공격 후 일정 확률로 발동 (개인 턴 미소모)" },
      { name: "반격", description: "피격 후 일정 확률로 발동 (개인 턴 미소모)" },
      { name: "관통", description: "대상의 피해 면역 무시" },
      { name: "방어 무시", description: "대상의 방어력을 일정 비율 무시 (암살자 세트와 합연산)" },
      { name: "도발", description: "적 공격 타깃에 항상 자신 포함" },
      { name: "흡혈", description: "직접 피해량의 일부만큼 HP 회복" },
      { name: "집중 공격", description: "타깃을 해당 적으로 고정" },
      { name: "영멸", description: "적용 중 사망 시 불사/부활/불굴 불가" },
      { name: "생명력 전환", description: "현재 HP를 지정 비율로 즉시 전환 (면역/무효화/저항 무시)" },
      { name: "처형", description: "HP가 시전자 공격력 일정 비율 이하 시 즉시 사망 (저항 무시)" },
      { name: "쿨타임 증가", description: "스킬 쿨타임 증가 및 스킬 예약 취소" }
    ]
  }
};
