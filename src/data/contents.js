// 세븐나이츠 리버스 공식 PvE / PvP 콘텐츠 명세 데이터
export const pveContents = {
  dungeons: [
    { name: '불의 진화 던전', role: 'offensive', element: '불', desc: '공격형 영웅 진화 재료 획득' },
    { name: '물의 진화 던전', role: 'magic', element: '물', desc: '마법형 영웅 진화 재료 획득' },
    { name: '땅의 진화 던전', role: 'defensive', element: '땅', desc: '방어형 영웅 진화 재료 획득' },
    { name: '빛의 진화 던전', role: 'support', element: '빛', desc: '지원형 영웅 진화 재료 획득' },
    { name: '암흑의 진화 던전', role: 'universal', element: '암흑', desc: '만능형 영웅 진화 재료 획득' },
    { name: '골드 던전', role: 'all', element: '골드', desc: '대량의 골드 재화 수급' }
  ],
  towers: [
    { name: '시련의 탑', floors: '시즌제 10층', desc: '시즌별 보상이 갱신되는 정예 타워' },
    { name: '무한의 탑', floors: '최대 400층', desc: '지속 확장형 고난도 층별 정복 콘텐츠' }
  ],
  raids: [
    { name: '파멸의 눈동자', type: '정규 레이드', desc: '강력한 마법 피해를 입히는 대형 드래곤' },
    { name: '우마왕', type: '정규 레이드', desc: '물리 방어 수단과 광역 진영 파괴 마수' },
    { name: '강철의 포식자', type: '정규 레이드', desc: '상태이상 및 무력화 기믹 레이드 보스' }
  ],
  surpriseRaids: [
    { name: '칼리스트라', desc: '돌발 레이드 보스 1' },
    { name: '아스트레아', desc: '돌발 레이드 보스 2' },
    { name: '레오니드', desc: '돌발 레이드 보스 3' }
  ],
  expedition: [
    { name: '파괴의 그림자 (태오)', Boss: '태오', desc: '강림 원정대 1팀 추천' },
    { name: '파괴의 그림자 (연희)', Boss: '연희', desc: '강림 원정대 2팀 추천' },
    { name: '파괴의 그림자 (카일)', Boss: '카일', desc: '강림 원정대 3팀 추천' },
    { name: '파괴의 그림자 (카르마)', Boss: '카르마', desc: '강림 원정대 4팀 추천' },
    { name: '파괴신', Boss: '파괴신', desc: '최종 강림 원정대 레이드' }
  ],
  siege: [
    { day: '월요일', boss: '루디', type: '마법 공성', reward: '방어형 전술 상자' },
    { day: '화요일', boss: '아일린', type: '마법 공성', reward: '공격형 전술 상자' },
    { day: '수요일', boss: '레이첼', type: '마법 공성', reward: '화염의 전술 상자' },
    { day: '목요일', boss: '델론즈', type: '물리 공성', reward: '암흑의 전술 상자' },
    { day: '금요일', boss: '제이브', type: '물리 공성', reward: '용의 전술 상자' },
    { day: '토요일', boss: '스파이크', type: '물리 공성', reward: '빙결의 전술 상자' },
    { day: '일요일', boss: '크리스', type: '단일 공성', reward: '불사의 전술 상자' }
  ]
};

export const pvpContents = [
  { name: '일반 결투장', teamSize: 5, desc: '표준 5대5 비동기 결투장' },
  { name: '총력전', teamSize: 15, desc: '3개 덱을 동시 운용하는 대규모 결투' },
  { name: '천상대전', teamSize: 5, desc: '상급 결투장 / 실시간 PvP / 세나컵(준비 중)' },
  { name: '길드전', teamSize: 3, desc: '3인 전술 편성 기반의 깃발 침탈 길드 PvP' }
];
