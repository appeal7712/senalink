import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { SITE_MAIN_DOC } from '../config/firestorePaths';
import { SITE_MAIN_DEFAULTS } from '../data/siteMain.defaults';

export function normalizeLink(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}

function mergeNews(rawNews, fallback) {
  if (!Array.isArray(rawNews)) return fallback;
  return rawNews.map((n, i) => ({
    id: n.id || `n_${i}_${Date.now()}`,
    title: n.title || '',
    url: n.url || n.link || '',
    date: n.date || '',
    tag: n.tag || '라운지',
  }));
}

const LEGACY_HEADLINES = ['세븐나이츠를 더 깊게.', '세븐나이츠 리버스'];
const LEGACY_SUBHEAD = '메타 덱, 영웅 픽률, 패치 뉴스. 길드 없이 누구나 볼 수 있습니다.';

function emptyPick() {
  return { name: '', role: 'offensive', pickRate: '', winRate: '' };
}

function emptyMetaDeck(i) {
  return {
    id: `m${i + 1}`,
    kind: 'attack',
    rank: '',
    tier: '',
    title: '',
    usageRate: '',
    type: '결투장',
    formationId: 'balance',
    heroNames: ['', '', '', '', ''],
    desc: '',
    reservedSkills: [],
    heroGearConfigs: [],
  };
}

/** 편집기가 항상 4칸을 기대하므로 개수는 맞추되, 빈 칸에 예시 덱을 채우지는 않는다. */
function padMetaDecks(list) {
  const decks = (Array.isArray(list) ? list : []).slice(0, 4).map((d, i) => ({
    ...emptyMetaDeck(i),
    ...(d || {}),
    kind: d?.kind || 'attack',
  }));
  while (decks.length < 4) decks.push(emptyMetaDeck(decks.length));
  return decks;
}

function padPickRates(list) {
  const rows = (Array.isArray(list) ? list : []).slice(0, 5).map((r) => ({ ...emptyPick(), ...(r || {}) }));
  while (rows.length < 5) rows.push(emptyPick());
  return rows;
}

export function mergeSiteMain(input) {
  // 문서가 없어도 같은 정규화 경로를 타야 편집기가 기대하는 칸 수가 맞는다.
  const raw = input && typeof input === 'object' ? input : {};
  const headline = !raw.headline || LEGACY_HEADLINES.includes(raw.headline)
    ? SITE_MAIN_DEFAULTS.headline
    : raw.headline;
  const subhead = !raw.subhead || raw.subhead === LEGACY_SUBHEAD
    ? SITE_MAIN_DEFAULTS.subhead
    : raw.subhead;
  return {
    ...SITE_MAIN_DEFAULTS,
    ...raw,
    headline,
    subhead,
    highlight: { ...SITE_MAIN_DEFAULTS.highlight, ...(raw.highlight || {}) },
    metaDecks: padMetaDecks(raw.metaDecks),
    pickRates: padPickRates(raw.pickRates),
    news: mergeNews(raw.news, SITE_MAIN_DEFAULTS.news),
    entranceBanner: {
      ...SITE_MAIN_DEFAULTS.entranceBanner,
      ...(raw.entranceBanner || {}),
      enabled: !!(raw.entranceBanner?.enabled),
      title: String(raw.entranceBanner?.title || ''),
      body: String(raw.entranceBanner?.body || ''),
    },
  };
}

export function useSiteMain() {
  // 스냅샷 도착 전에는 빈 골격만 들고 있는다. 표시용 데이터를 미리 채우면 화면에 스쳐 보인다.
  const [content, setContent] = useState(() => mergeSiteMain(null));
  const [loaded, setLoaded] = useState(false);
  const [fromServer, setFromServer] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, ...SITE_MAIN_DOC), (snap) => {
      if (snap.exists()) {
        setContent(mergeSiteMain(snap.data()));
        setFromServer(true);
      } else {
        setContent(mergeSiteMain(null));
        setFromServer(false);
      }
      setLoaded(true);
    }, () => {
      setContent(mergeSiteMain(null));
      setFromServer(false);
      setLoaded(true);
    });
    return unsub;
  }, []);

  return { content, loaded, fromServer };
}

export async function saveSiteMain(partial, uid) {
  if (!uid) throw new Error('슈퍼관리자 로그인이 필요합니다.');
  const merged = mergeSiteMain(partial);
  const payload = JSON.parse(JSON.stringify({
    ...merged,
    news: (merged.news || []).map((n) => ({
      ...n,
      url: normalizeLink(n.url),
    })),
    updatedAt: new Date().toISOString(),
    updatedBy: uid,
  }));
  await setDoc(doc(db, ...SITE_MAIN_DOC), payload);
  return payload;
}
