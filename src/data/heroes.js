import scrapedHeroes from './scraped_heroes.json';

// heroes.js - 새 스키마 기준
// scraped_heroes.json이 어셋 폴더에서 재생성된 112명 기준 단일 소스
// 필드: id, name, title, group, category, role, attackType, rarity, isAwakened, baseStats, portraitUrl, skills
//
// 목록 표시 공통 순서: 각성 → (구)세븐나이츠 → 스페셜 지역별 → 일반/아스가르드/아이샤/기타

export const HERO_FACTION_ORDER = {
  special: [
    '(구)세븐나이츠',
    '세븐나이츠',
    '다크나이츠',
    '사황',
    '(구)사황',
    '나이트크로우',
    '루미너스 혁명단',
    '천상의 수호자',
    '펜타곤',
    '숨은강자들',
    '경계의 수호자',
    '????',
  ],
  normal: ['에반 원정대', '그림자단', '모험가', '성십자단', '테라영지'],
  asgard: [
    '신비의 숲',
    '침묵의 광산',
    '화염의 사막',
    '암흑의 무덤',
    '용의 유적지',
    '복주자의 지옥',
  ],
  aisha: ['달빛의 섬', '천자의 땅', '어둠의 안식처', '신지', '삼국호걸'],
  other: ['콜라보레이션', '기타 영웅'],
};

const CATEGORY_ORDER = ['special', 'normal', 'asgard', 'aisha', 'other'];

const GROUP_ORDER = CATEGORY_ORDER.flatMap((cat) => HERO_FACTION_ORDER[cat] || []);

function groupRank(group) {
  const i = GROUP_ORDER.indexOf(group);
  return i === -1 ? 9999 : i;
}

function categoryRank(category) {
  const i = CATEGORY_ORDER.indexOf(category);
  return i === -1 ? 9999 : i;
}

/** 영웅 목록 UI 공통 정렬 (각성 → (구)세븐나이츠 → 스페셜 지역별 → …) */
export function compareHeroesForList(a, b) {
  const aw = Number(!!b?.isAwakened) - Number(!!a?.isAwakened);
  if (aw) return aw;

  const ga = groupRank(a?.group);
  const gb = groupRank(b?.group);
  if (ga !== gb) return ga - gb;

  const ca = categoryRank(a?.category);
  const cb = categoryRank(b?.category);
  if (ca !== cb) return ca - cb;

  return String(a?.name || '').localeCompare(String(b?.name || ''), 'ko');
}

export const heroes = [...scrapedHeroes].sort(compareHeroesForList);

// 진형 데이터는 formations.js로 분리됨
export { formations } from './formations';
