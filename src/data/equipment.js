// 장비 세트 데이터
// 부위: weapon_physical(물공무기), weapon_magic(마공무기), armor(방어구), accessory(장신구), exclusive(전용장비)

export const equipmentSets = [
  {
    id: "vanguard",
    name: "선봉장",
    description: "전방에서 공격을 주도하는 선봉 세트",
    effect2: {
      stat: "allAtk",
      description: "모든 공격력 증가"
    },
    effect4: {
      stat: "effectHit",
      description: "효과 적중 증가"
    }
  },
  {
    id: "tracker",
    name: "추적자",
    description: "적의 약점을 파고드는 추적 세트",
    effect2: {
      stat: "weakAtk",
      description: "약점 공격 확률 증가"
    },
    effect4: {
      stat: "weakDmg",
      description: "약점 공격 피해 증가"
    }
  },
  {
    id: "crusader",
    name: "성기사",
    description: "생명력과 회복에 특화된 세트",
    effect2: {
      stat: "hp",
      description: "생명력 증가"
    },
    effect4: {
      stat: "healReceive",
      description: "받는 회복량 증가"
    }
  },
  {
    id: "gatekeeper",
    name: "수문장",
    description: "막기에 특화된 방어형 세트",
    effect2: {
      stat: "block",
      description: "막기 확률 증가"
    },
    effect4: {
      stat: "blockDmgReduce",
      description: "막기 시 피해 감소"
    }
  },
  {
    id: "guardian",
    name: "수호자",
    description: "방어력과 효과 저항에 특화된 세트",
    effect2: {
      stat: "def",
      description: "방어력 증가"
    },
    effect4: {
      stat: "effectResist",
      description: "효과 저항 증가"
    }
  },
  {
    id: "assassin",
    name: "암살자",
    description: "치명타와 방어 무시에 특화된 세트",
    effect2: {
      stat: "critRate",
      description: "치명타 확률 증가"
    },
    effect4: {
      stat: "defBreak",
      description: "방어 무시 증가"
    }
  },
  {
    id: "avenger",
    name: "복수자",
    description: "피해량과 보스전에 특화된 세트",
    effect2: {
      stat: "dmg",
      description: "피해량 증가"
    },
    effect4: {
      stat: "bossDmg",
      description: "보스 피해 증가"
    }
  },
  {
    id: "shaman",
    name: "주술사",
    description: "효과 적중과 적용 확률을 높이는 세트",
    effect2: {
      stat: "effectHit",
      description: "효과 적중 증가"
    },
    effect4: {
      stat: "effectApplyRate",
      description: "효과 적용 확률 증가"
    }
  },
  {
    id: "coordinator",
    name: "조율자",
    description: "효과 저항과 행동 제어 면역 세트",
    effect2: {
      stat: "effectResist",
      description: "효과 저항 증가"
    },
    effect4: {
      stat: "ccImmune",
      description: "행동 제어 면역"
    }
  }
];

export const equipmentSlots = [
  { id: "weapon_physical", name: "무기 (물공)", icon: "swords" },
  { id: "weapon_magic",    name: "무기 (마공)", icon: "orb" },
  { id: "armor",           name: "방어구",      icon: "shield" },
  { id: "accessory",       name: "장신구",      icon: "ring" },
  { id: "exclusive",       name: "전용 장비",   icon: "medal" },
];
