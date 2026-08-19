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

function padMetaDecks(list) {
  const source = Array.isArray(list) && list.length ? list : SITE_MAIN_DEFAULTS.metaDecks;
  const decks = source.slice(0, 4).map((d) => ({
    ...d,
    kind: d.kind || 'attack',
  }));
  const template = SITE_MAIN_DEFAULTS.metaDecks[0];
  while (decks.length < 4) {
    const i = decks.length;
    decks.push({
      ...JSON.parse(JSON.stringify(template)),
      id: `m${i + 1}`,
      kind: 'attack',
      title: '',
      usageRate: '',
      desc: '',
      heroNames: ['', '', '', '', ''],
      reservedSkills: [],
    });
  }
  return decks;
}

function padPickRates(list) {
  const rows = (Array.isArray(list) ? list : []).slice(0, 5).map((r) => ({ ...emptyPick(), ...(r || {}) }));
  while (rows.length < 5) rows.push(emptyPick());
  return rows;
}

export function mergeSiteMain(raw) {
  if (!raw || typeof raw !== 'object') return { ...SITE_MAIN_DEFAULTS };
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
  };
}

export function useSiteMain() {
  const [content, setContent] = useState(SITE_MAIN_DEFAULTS);
  const [loaded, setLoaded] = useState(true);
  const [fromServer, setFromServer] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, ...SITE_MAIN_DOC), (snap) => {
      if (snap.exists()) {
        setContent(mergeSiteMain(snap.data()));
        setFromServer(true);
      } else {
        setContent({ ...SITE_MAIN_DEFAULTS });
        setFromServer(false);
      }
      setLoaded(true);
    }, () => {
      setContent({ ...SITE_MAIN_DEFAULTS });
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
