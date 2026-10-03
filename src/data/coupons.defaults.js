/**
 * Firestore site/coupons 가 아직 없을 때(첫 00시 동기화 전) 보여 줄 목록.
 * 형식은 functions/couponSync.js localizeCoupons 결과와 동일.
 */
export const DEFAULT_COUPONS = [
  {
    code: '7KFULLMOONREBIRTH',
    expired: true,
    event: '밤하늘의 보름달 특별 쿠폰 이벤트',
    rewards: [{ name: '열쇠 상자', qty: 'x5' }],
  },
  {
    code: '7KREKIMETSUNOYAIBA',
    expired: false,
    event: '[세나리 x 귀멸의 칼날] 콜라보레이션',
    rewards: [{ name: '영웅 소환 이용권', qty: 'x10' }],
  },
  {
    code: '7ENMUGEN',
    expired: false,
    event: '[세나리 x 귀멸의 칼날] 콜라보레이션',
    rewards: [
      { name: '영웅 소환 이용권', qty: 'x20' },
      { name: '조율의 결정', qty: 'x400' },
    ],
  },
  {
    code: 'HAPPY7KSENA',
    expired: true,
    event: '밤하늘의 보름달 특별 쿠폰 이벤트',
    rewards: [{ name: '열쇠 상자', qty: 'x5' }],
  },
  {
    code: '7SENEVKMOON',
    expired: true,
    event: '밤하늘의 보름달 특별 쿠폰 이벤트',
    rewards: [{ name: '열쇠 상자', qty: 'x5' }],
  },
  {
    code: 'HAPPYFULLMOON7',
    expired: true,
    event: '밤하늘의 보름달 특별 쿠폰 이벤트',
    rewards: [{ name: '열쇠 상자', qty: 'x5' }],
  },
  {
    code: 'SKRE300BIRTH',
    expired: false,
    event: '300일 기념 이벤트',
    rewards: [
      { name: '4성 전설 장신구 선택 상자', qty: 'x1' },
      { name: '영웅 소환 이용권', qty: 'x300' },
      { name: '펫 위시 소환 이용권', qty: 'x30' },
      { name: '빛나는 스킬 강화석', qty: 'x3' },
      { name: '골드', qty: 'x3,000,000' },
      { name: '혼돈의 정수', qty: 'x30' },
    ],
  },
];
