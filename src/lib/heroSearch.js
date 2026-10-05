const CHOSEONG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const CHOSEONG_SET = new Set(CHOSEONG);
const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;

function choseongOf(ch) {
  const code = ch.charCodeAt(0);
  if (code < HANGUL_BASE || code > HANGUL_LAST) return null;
  return CHOSEONG[Math.floor((code - HANGUL_BASE) / 588)];
}

function charMatches(q, t) {
  if (q === t) return true;
  return CHOSEONG_SET.has(q) && choseongOf(t) === q;
}

function normalize(s) {
  return String(s || '').replace(/\s+/g, '').toLowerCase();
}

/** 부분 문자열 매칭. 검색어의 초성(ㄱ~ㅎ) 글자는 대상 글자의 초성과 비교한다. 예: 'ㅇㅍ' → 여포 */
export function matchesKoreanQuery(text, query) {
  const t = [...normalize(text)];
  const q = [...normalize(query)];
  if (!q.length) return true;
  for (let start = 0; start + q.length <= t.length; start += 1) {
    let ok = true;
    for (let i = 0; i < q.length; i += 1) {
      if (!charMatches(q[i], t[start + i])) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

/** 영웅 이름(초성 포함) · 칭호 검색 */
export function heroMatchesQuery(hero, query) {
  const q = normalize(query);
  if (!q) return true;
  const name = String(hero?.name || '').replace('(각성)', '');
  if (matchesKoreanQuery(name, q)) return true;
  const hasChoseong = [...q].some((ch) => CHOSEONG_SET.has(ch));
  return !hasChoseong && normalize(hero?.title).includes(q);
}
