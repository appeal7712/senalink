// 길드전 3v3 전용 간이 진형 — 5인 진형의 전방/후방 버프 개념을 3인 규모로 축소한 버전
export const formations3v3 = [
  {
    id: '2f1b',
    name: '전방 강화 진형',
    frontCount: 2,
    backCount: 1,
    frontBuff: '방어력 21%',
    backBuff: '모든 공격력 32%',
    description: '전방 2명(방어력 21%), 후방 1명(모든 공격력 32%) 배치'
  },
  {
    id: '1f2b',
    name: '후방 강화 진형',
    frontCount: 1,
    backCount: 2,
    frontBuff: '방어력 32%',
    backBuff: '모든 공격력 21%',
    description: '전방 1명(방어력 32%), 후방 2명(모든 공격력 21%) 배치'
  }
];
