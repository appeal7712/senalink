import scrapedHeroes from './scraped_heroes.json';

// heroes.js - 새 스키마 기준
// scraped_heroes.json이 어셋 폴더에서 재생성된 112명 기준 단일 소스
// 필드: id, name, title, group, category, role, attackType, rarity, isAwakened, baseStats, portraitUrl, skills

export const heroes = scrapedHeroes;

// 진형 데이터는 formations.js로 분리됨
export { formations } from './formations';
