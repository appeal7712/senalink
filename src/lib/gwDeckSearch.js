import { matchesKoreanQuery } from './heroSearch';

const CHOSEONG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const CHOSEONG_SET = new Set(CHOSEONG);
const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;

/**
 * 길드에서 앞글자가 아닌 다른 글자로 부르는 영웅 (영웅 이름 → 부르는 말).
 * 오목은 오공 · 오르카와 「오」가 겹쳐서 「목」으로 부름.
 */
export const HERO_SEARCH_ALIASES = {
  오목: ['목'],
};

function choseongOf(ch) {
  const code = ch.charCodeAt(0);
  if (code < HANGUL_BASE || code > HANGUL_LAST) return null;
  return CHOSEONG[Math.floor((code - HANGUL_BASE) / 588)];
}

const normalize = (s) => String(s || '').replace(/\s+/g, '').toLowerCase();

const charMatches = (q, t) => q === t || (CHOSEONG_SET.has(q) && choseongOf(t) === q);

/** 영웅 하나를 부를 수 있는 말들: 이름 단어마다(카마도 탄지로 → 카마도 · 탄지로) + 별명 */
function heroCallWords(name) {
  const raw = String(name || '').replace('(각성)', '').trim().toLowerCase();
  if (!raw) return [];
  const words = raw.split(/[\s&]+/).filter(Boolean);
  return [...words, ...(HERO_SEARCH_ALIASES[raw.replace(/\s+/g, '')] || [])];
}

/** q[from..] 앞부분이 word 앞부분과 맞는 길이들 (긴 것부터) */
function prefixLengths(q, from, word) {
  const lens = [];
  for (let i = 0; i < word.length && from + i < q.length; i += 1) {
    if (!charMatches(q[from + i], word[i])) break;
    lens.push(i + 1);
  }
  return lens.reverse();
}

/**
 * 길드전 상대 덱 검색.
 * 1) 덱 제목에 그대로 들어 있으면 일치.
 * 2) 아니면 검색어를 영웅 이름 **앞부분**들로 끝까지 나눌 수 있으면 일치 — 순서 무관.
 *    윤동목 = 윤(건) + 동(영) + 목(오목 별명), 오 = 오공 · 오목 · 오르카 …, 탄 = 카마도 탄지로.
 *    한 글자씩이 아니라 「오공선」처럼 이름 전체를 섞어 써도 됨. 초성(ㅇㄷㅁ)도 앞글자 기준.
 */
export function gwDeckMatchesQuery(deck, query) {
  const q = [...normalize(query)];
  if (!q.length) return true;
  if (matchesKoreanQuery(deck?.title, q.join(''))) return true;
  const words = (deck?.heroNames || []).flatMap(heroCallWords).map((w) => [...w]);
  if (!words.length) return false;

  const memo = new Map();
  const coverFrom = (i) => {
    if (i >= q.length) return true;
    if (memo.has(i)) return memo.get(i);
    let ok = false;
    for (const w of words) {
      for (const len of prefixLengths(q, i, w)) {
        if (coverFrom(i + len)) { ok = true; break; }
      }
      if (ok) break;
    }
    memo.set(i, ok);
    return ok;
  };
  return coverFrom(0);
}
