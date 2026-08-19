// 4대 공식 진형 데이터 (이미지 3 명세 100% 동일)
export const formationsData = [
  {
    id: 'basic',
    name: '기본 진형',
    frontCount: 2,
    backCount: 3,
    frontBuff: '방어력 21%',
    backBuff: '모든 공격력 14%',
    description: '전방 2명(방어력 21%), 후방 3명(모든 공격력 14%) 배치'
  },
  {
    id: 'balance',
    name: '밸런스 진형',
    frontCount: 3,
    backCount: 2,
    frontBuff: '방어력 14%',
    backBuff: '모든 공격력 21%',
    description: '전방 3명(방어력 14%), 후방 2명(모든 공격력 21%) 배치'
  },
  {
    id: 'attack',
    name: '공격 진형',
    frontCount: 1,
    backCount: 4,
    frontBuff: '방어력 42%',
    backBuff: '모든 공격력 10.5%',
    description: '전방 1명(방어력 42%), 후방 4명(모든 공격력 10.5%) 배치'
  },
  {
    id: 'protect',
    name: '보호 진형',
    frontCount: 4,
    backCount: 1,
    frontBuff: '방어력 10.5%',
    backBuff: '모든 공격력 42%',
    description: '전방 4명(방어력 10.5%), 후방 1명(모든 공격력 42%) 메인 딜러 집중'
  }
];

export const formations = formationsData;
