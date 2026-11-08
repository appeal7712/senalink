/**
 * 미리보기 허브(로컬 에뮬레이터) 테스트 데이터 넣기 — 라이브 senalink 에는 절대 닿지 않음.
 *
 *   npm run seed:preview                 첫 번째 허브에, 비어 있는 칸만 채움
 *   npm run seed:preview -- 허브이름       이름에 그 글자가 들어간 허브에
 *   npm run seed:preview -- --force       이미 있는 칸도 테스트 데이터로 덮어씀 (에뮬레이터 안에서만)
 *
 * 넣는 것: 길드전 공격(상대 덱 · 파생 덱 · 카운터 · 특이사항) · 길드전 방어(대체 덱 포함) · 공성전 월~목(진형 4가지) ·
 *          결투장 1개 · 메인 결투장 메타 덱 4개. 허브는 먼저 미리보기 허브 화면에서 하나 만들어 둘 것.
 *
 * 안전장치: 주소가 127.0.0.1:8080(에뮬레이터)로 고정. 「Bearer owner」는 에뮬레이터 전용 토큰이라 라이브에선 거절됨.
 */
import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const EMULATOR = 'http://127.0.0.1:8080';
const args = process.argv.slice(2);
const force = args.includes('--force');
const hubFilter = args.find((a) => !a.startsWith('--')) || '';

function loadEnv(file) {
  const p = resolve(dirname(fileURLToPath(import.meta.url)), '..', file);
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return out;
}

const env = { ...loadEnv('.env.example'), ...loadEnv('.env.development'), ...loadEnv('.env.local') };
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID;
if (!projectId) {
  console.error('VITE_FIREBASE_PROJECT_ID 가 없습니다. .env.local 을 확인해 주세요.');
  process.exit(1);
}
const base = `${EMULATOR}/v1/projects/${projectId}/databases/(default)/documents`;
const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer owner' };

/* ── Firestore REST 값 변환 ── */
const toValue = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toValue(x)])) } };
  return { stringValue: String(v) };
};
const isEmptyValue = (val) => {
  if (!val) return true;
  if (val.arrayValue) return !(val.arrayValue.values || []).length;
  if (val.mapValue) return !Object.keys(val.mapValue.fields || {}).length;
  return false;
};

async function api(path, init = {}) {
  let res;
  try {
    res = await fetch(`${base}/${path}`, { ...init, headers });
  } catch {
    console.error('에뮬레이터에 연결하지 못했습니다. npm run emulators 가 켜져 있는지 확인하세요.');
    process.exit(1);
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    console.error(`요청 실패 (${res.status}): ${path}\n${await res.text()}`);
    process.exit(1);
  }
  return res.json();
}

/** 비어 있는 필드만(또는 --force면 전부) updateMask로 부분 저장 — 문서의 다른 필드는 그대로 */
async function patchFields(docPath, data, label) {
  const current = await api(docPath);
  const fields = current?.fields || {};
  const keys = Object.keys(data).filter((k) => force || isEmptyValue(fields[k]));
  const skipped = Object.keys(data).filter((k) => !keys.includes(k));
  if (keys.length) {
    const mask = keys.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
    const body = { fields: Object.fromEntries(keys.map((k) => [k, toValue(data[k])])) };
    await api(`${docPath}?${mask}`, { method: 'PATCH', body: JSON.stringify(body) });
  }
  console.log(`${label}: 넣음 [${keys.join(', ') || '없음'}]${skipped.length ? ` · 이미 있어서 건너뜀 [${skipped.join(', ')}] (--force 로 덮어쓰기)` : ''}`);
}

/* ── 테스트 데이터 ── */
const now = '2026-11-08 16:00';
const author = { author: '미리보기', authorId: '' };
const gear = (note = '') => ({ setName: '복수자', weapon1: '치명타 확률', weapon2: '치명타 피해', armor1: '모든 공격력(%)', armor2: '생명력(%)', detailNote: note });
const gearsFor = (names) => names.map((n) => (n ? gear('속공 1순위') : {}));
const counter = (id, title, heroNames) => ({
  id, title, heroNames,
  reservedSkills: heroNames.filter(Boolean).slice(0, 2).map((heroName, i) => ({ heroName, skillKey: i ? 'down' : 'upper', dir: i ? 'down' : 'upper', round: `${i + 1}번째 예약` })),
  otherDetail: '선공 잡으면 바로 스킬1', gearNote: '', formationId: 'basic', petId: 'pet_2',
  heroGearConfigs: gearsFor(heroNames), updatedAt: now, ...author,
});
const target = (id, title, heroNames, formationId, petId, extra = {}) => ({
  id, title, heroNames, note: '', formationId, petId, updatedAt: now, counters: [], altDecks: [], ...author, ...extra,
});

const gwAttacks = [
  target('gwa_1', '윤동목', ['윤건', '', '동영', '오목', ''], 'protect', 'pet_3', {
    note: '오목 속공 빠름 — 선공 뺏기면 스킬 순서 바꾸기\n동영 반격 주의',
    counters: [counter('gwac_1', '선란 하연 탄지로 카운터', ['선란', '', '하연', '카마도 탄지로', ''])],
    altDecks: [target('gwaa_1', '윤동공', ['윤건', '동영', '오공', '', ''], 'attack', 'pet_1')],
  }),
  target('gwa_2', '선란하', ['선란', '하연', '카마도 탄지로', '', ''], 'basic', 'pet_1', {
    counters: [counter('gwac_2', '윤동목으로 받아치기', ['윤건', '동영', '오목', '', ''])],
  }),
  target('gwa_3', '오르카 레이첼 쥬다스', ['오르카', '레이첼', '쥬다스', '', ''], 'protect', 'pet_2'),
];

const slot = (n) => ({ primaryName: n, altText: '' });
const defense = (id, names, formationId, petId, extra = {}) => ({
  id, tier: 4, formationId, petId, mode: '속공', deckKind: '', title: '',
  heroSlots: names.map(slot),
  reservedSkills: [{ heroName: names.find(Boolean), skillKey: 'upper', dir: 'upper', round: '1번째 예약' }],
  otherDetail: '', speedMin: '', speedMax: '',
  heroGearConfigs: names.map((n) => (n ? gear('') : {})),
  altDecks: [], updatedAt: now, ...author, ...extra,
});
const gwDefenses = [
  defense('gwd_1', ['쥬다스', '레이첼', '', '', '오르카'], 'attack', 'pet_4', {
    otherDetail: '쥬다스 효저 최대한\n레이첼 약공 100맞추기, 권불',
    heroGearConfigs: [gear('속공 1순위'), gear('효저 100'), {}, {}, gear('')],
  }),
  defense('gwd_2', ['윤건', '', '동영', '오목', ''], 'protect', 'pet_3', {
    altDecks: [defense('gwda_1', ['선란', '하연', '', '카마도 탄지로', ''], 'basic', 'pet_1')],
  }),
];

const five = ['선란', '하연', '카마도 탄지로', '쥬다스', '레이첼'];
const pveBuild = (id, title, formationId) => ({
  id, title, formationId, petId: 'pet_5', heroNames: five, heroGearConfigs: gearsFor(five), tier: 4,
  speedOrderNames: five, speedIgnoredNames: [], skillSequence: [], updatedAt: now, ...author,
});
const siege = {
  mon: [pveBuild('sg_1', '보호 진형 테스트', 'protect')],
  tue: [pveBuild('sg_2', '공격 진형 테스트', 'attack')],
  wed: [pveBuild('sg_3', '기본 진형 테스트', 'basic')],
  thu: [pveBuild('sg_4', '밸런스 진형 테스트', 'balance')],
};
const arena = [{
  ...pveBuild('ar_1', '결투장 테스트', 'basic'), mode: '속공', deckKind: '',
  reservedSkills: [{ heroName: '선란', skillKey: 'upper', dir: 'upper', round: '1번째 예약' }],
}];

const metaDeck = (i, title, kind, heroNames, formationId) => ({
  id: `m${i}`, title, kind, tier: 'S', usageRate: `${20 - i * 3}%`, heroNames, formationId, petId: 'pet_2',
  mode: '속공', reservedSkills: [], heroGearConfigs: gearsFor(heroNames), author: { ingameName: '미리보기' },
});
const metaDecks = [
  metaDeck(1, '선란 탄지로 공덱', 'attack', five, 'basic'),
  metaDeck(2, '윤건 방덱', 'defense', ['윤건', '동영', '오목', '루디', '아일린'], 'protect'),
  metaDeck(3, '오공 하이브리드', 'hybrid', ['오공', '오르카', '레이첼', '델론즈', '루디'], 'attack'),
  metaDeck(4, '쥬다스 공덱', 'attack', ['쥬다스', '선란', '하연', '윤건', '동영'], 'balance'),
];

/* ── 실행 ── */
const list = await api('hubs?pageSize=100');
const hubs = (list?.documents || []).map((d) => ({ id: d.name.split('/').pop(), name: d.fields?.name?.stringValue || '' }));
if (!hubs.length) {
  console.error('에뮬레이터에 허브가 없습니다. 미리보기 허브(http://127.0.0.1:5173/hub)에서 허브를 먼저 하나 만들어 주세요.');
  process.exit(1);
}
const hub = hubFilter ? hubs.find((h) => h.name.includes(hubFilter)) : hubs[0];
if (!hub) {
  console.error(`「${hubFilter}」가 들어간 허브가 없습니다. 있는 허브: ${hubs.map((h) => h.name || h.id).join(', ')}`);
  process.exit(1);
}

console.log(`에뮬레이터(${EMULATOR}) · 허브 「${hub.name || hub.id}」${force ? ' · --force' : ''}`);
await patchFields(`hubs/${hub.id}/builds/main`, { gwAttacks, gwDefenses, siege, arena }, '길드 허브 공략');
await patchFields('site/main', { metaDecks }, '메인 메타 덱');
console.log('완료 — 미리보기 허브 화면을 새로고침하세요.');
