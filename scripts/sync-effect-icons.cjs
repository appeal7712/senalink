/**
 * 버프 · 디버프 · 특수 효과 아이콘 다시 받기 (새 영웅 · 새 효과가 나왔을 때).
 *
 *   node scripts/sync-effect-icons.cjs
 *
 * 7katlas 도감(https://7katlas.com/codex.html)이 영웅마다 불러오는 데이터(COMBINE/hero-data/{id}.js + lang/kr/hero-data/{id}.js)에서
 * 툴팁 { name, icon } 과 {kw|buff|…} 종류를 모아 아이콘(images/effects/raw/{icon}.webp)을 받는다. 4개씩 천천히 요청.
 * 결과:
 *   asset/특수효과, 버프, 디버프 아이콘/  버프 · 디버프 · 특수효과(한글 이름.webp) · 원본 아이콘(ID) · 목록.md · 목록.json
 *   public/images/effects/{아이콘 ID}.webp   사이트용 (이름 → 아이콘은 src/data/effectIcons.json)
 * 받은 원본은 %TEMP%/katlas 에 캐시(이미 있는 아이콘은 다시 안 받음). Firebase · 라이브와 무관.
 * 이름 맞추기 규칙(띄어쓰기 무시 · 「(중첩)」 · 별명)은 src/lib/effectIcons.js — 새 효과가 아이콘을 못 찾으면 거기 ALIASES에 추가.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const CACHE = path.join(process.env.TEMP || process.env.TMPDIR || '/tmp', 'katlas');
const BASE = 'https://7katlas.com/';
const ASSET = path.join(ROOT, 'asset', '특수효과, 버프, 디버프 아이콘');
const PUB = path.join(ROOT, 'public', 'images', 'effects');
const DATA = path.join(ROOT, 'src', 'data', 'effectIcons.json');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, binary = false) {
  for (let t = 0; t < 3; t += 1) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 senalink-asset-sync' } });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(String(res.status));
      return binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
    } catch (e) {
      if (t === 2) { console.log('실패', url, e.message); return null; }
      await sleep(600 * (t + 1));
    }
  }
  return null;
}
async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; await fn(items[k]); await sleep(120); }
  }));
}

const KW = /\{kw\|(\w+)\|([^|}]*)\|/g;
function walk(o, visit) {
  if (Array.isArray(o)) { o.forEach((x) => walk(x, visit)); return; }
  if (o && typeof o === 'object') { visit(o); Object.values(o).forEach((x) => walk(x, visit)); }
}

async function collect() {
  const html = await get(`${BASE}codex.html`);
  const liteSrc = html && (html.match(/src="(COMBINE\/codex_lite_heroes\.js[^"]*)"/) || [])[1];
  if (!liteSrc) throw new Error('codex.html 에서 영웅 목록 스크립트를 못 찾음 (사이트 구조가 바뀌었을 수 있음)');
  const lite = await get(BASE + liteSrc);
  const ver = JSON.parse(lite.match(/HERO_DATA_V\s*=\s*(\{[^;]*?\})\s*;/)[1]);
  const ids = Object.keys(ver);
  console.log('영웅', ids.length);
  const byEn = new Map();
  const typeByTerm = new Map();
  const noteType = (term, type) => {
    if (!typeByTerm.has(term)) typeByTerm.set(term, new Set());
    typeByTerm.get(term).add(type);
  };
  await pool(ids, 4, async (id) => {
    const en = await get(`${BASE}COMBINE/hero-data/${encodeURIComponent(id)}.js?v=${ver[id]}`);
    const kr = await get(`${BASE}lang/kr/hero-data/${encodeURIComponent(id)}.js?v=${ver[id]}`);
    if (!en) return;
    let data = null;
    let dict = {};
    try { vm.runInNewContext(en, { heroDataLoaded: (d) => { data = d; } }); } catch { return; }
    if (kr) { try { vm.runInNewContext(kr, { heroTextLoaded: (_id, d) => { dict = d || {}; } }); } catch { /* 한글 없음 */ } }
    for (const v of Object.values(dict)) if (typeof v === 'string') for (const m of v.matchAll(KW)) noteType(m[2], m[1]);
    walk(data, (o) => {
      if (typeof o === 'string') return;
      for (const v of Object.values(o)) if (typeof v === 'string') for (const m of v.matchAll(KW)) noteType(m[2], m[1]);
      if (typeof o.name !== 'string' || typeof o.icon !== 'string' || !o.icon || o.icon.includes('/')) return;
      if (!byEn.has(o.name)) byEn.set(o.name, { en: o.name, kr: new Set(), icons: new Map(), heroes: new Set() });
      const r = byEn.get(o.name);
      r.icons.set(o.icon, (r.icons.get(o.icon) || 0) + 1);
      r.heroes.add(id);
      if (dict[o.name]) r.kr.add(dict[o.name]);
    });
  });
  return [...byEn.values()].map((r) => {
    const icon = [...r.icons.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const kr = [...r.kr][0] || r.en;
    const types = [...new Set([...(typeByTerm.get(r.en) || []), ...(typeByTerm.get(kr) || [])])];
    return { en: r.en, kr, icon, iconAll: [...r.icons.keys()], types, heroes: r.heroes.size };
  }).sort((a, b) => a.kr.localeCompare(b.kr, 'ko'));
}

(async () => {
  fs.mkdirSync(path.join(CACHE, 'icons'), { recursive: true });
  const fx = await collect();
  const iconFile = (id) => path.join(CACHE, 'icons', `${id}.webp`);
  const all = [...new Set(fx.flatMap((f) => f.iconAll))];
  await pool(all, 4, async (id) => {
    if (fs.existsSync(iconFile(id)) && fs.statSync(iconFile(id)).size > 0) return;
    const buf = await get(`${BASE}images/effects/raw/${encodeURIComponent(id)}.webp`, true);
    if (buf && buf.length) fs.writeFileSync(iconFile(id), buf);
  });

  const norm = (s) => String(s || '').replace(/\s+/g, '');
  const baseName = (s) => String(s || '').replace(/\s*\(중첩\)\s*$/, '').trim();
  const safe = (s) => String(s).replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
  const TYPE_DIR = { buff: '버프', debuff: '디버프', special: '특수효과' };
  const FORCE = { 극독: 'debuff', '스킬 쿨타임 증가': 'debuff' };
  const typeOfRaw = (f) => {
    if (FORCE[f.kr]) return FORCE[f.kr];
    if (f.types.length === 1) return f.types[0] === 'unique' ? 'special' : f.types[0];
    if (f.types.includes('debuff')) return 'debuff';
    return null;
  };
  const byNorm = new Map(fx.map((f) => [norm(f.kr), f]));
  const typeOf = (f) => {
    const t = typeOfRaw(f);
    if (t) return t;
    const b = byNorm.get(norm(baseName(f.kr)));
    return (b && b !== f && typeOfRaw(b)) || 'special';
  };
  /** 그 효과가 쓰는 아이콘 중 base가 있으면 base, reverse만 쓰면 reverse 그대로(중첩 · 영웅 고유 버프는 게임에서도 반전 아이콘) */
  const primary = (f) => {
    const bases = f.iconAll.filter((id) => /_base$/i.test(id) && fs.existsSync(iconFile(id)));
    if (bases.length) return bases.includes(f.icon) ? f.icon : bases[0];
    return f.icon;
  };

  for (const dir of [...Object.values(TYPE_DIR), '원본 아이콘(ID)']) fs.mkdirSync(path.join(ASSET, dir), { recursive: true });
  fs.mkdirSync(PUB, { recursive: true });
  const rows = [];
  const icons = {};
  const types = {};
  const used = new Set();
  const named = new Set();
  for (const f of fx) {
    const id = primary(f);
    if (!fs.existsSync(iconFile(id))) { console.log('아이콘 없음', f.kr, id); continue; }
    const type = typeOf(f);
    const name = safe(f.kr);
    if (!named.has(name)) { fs.copyFileSync(iconFile(id), path.join(ASSET, TYPE_DIR[type], `${name}.webp`)); named.add(name); }
    used.add(id);
    icons[f.kr] = id;
    types[f.kr] = type;
    rows.push({ 한글: f.kr, 영어: f.en, 종류: TYPE_DIR[type], 아이콘: id, 다른아이콘: f.iconAll.filter((x) => x !== id), 영웅수: f.heroes });
  }
  for (const file of fs.readdirSync(path.join(CACHE, 'icons'))) fs.copyFileSync(path.join(CACHE, 'icons', file), path.join(ASSET, '원본 아이콘(ID)', file));
  for (const id of used) fs.copyFileSync(iconFile(id), path.join(PUB, `${id}.webp`));

  rows.sort((a, b) => a.종류.localeCompare(b.종류, 'ko') || a.한글.localeCompare(b.한글, 'ko'));
  fs.writeFileSync(path.join(ASSET, '목록.json'), JSON.stringify(rows, null, 1));
  const today = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(ASSET, '목록.md'), [
    '# 특수효과 · 버프 · 디버프 아이콘',
    '',
    `출처: 7katlas 도감(https://7katlas.com/codex.html) 영웅별 효과 툴팁 아이콘 — 영웅 전체에서 모음 (${today}, \`node scripts/sync-effect-icons.cjs\`).`,
    '',
    '- `버프/` · `디버프/` · `특수효과/` = 효과 한글 이름.webp (사이트에 쓰는 모양 — 그 효과에 `_base`가 있으면 base, 없으면 원래 아이콘)',
    '- `원본 아이콘(ID)/` = 받은 아이콘 전부 원래 이름 그대로 (`_base` / `_reverse` 둘 다)',
    '- 사이트용 사본: `public/images/effects/{아이콘 ID}.webp`, 이름 → 아이콘 표: `src/data/effectIcons.json`, 찾기 규칙: `src/lib/effectIcons.js`',
    '',
    '| 종류 | 한글 이름 | 영어 이름 | 아이콘 ID | 쓰는 영웅 수 |',
    '|------|-----------|-----------|-----------|-------------|',
    ...rows.map((r) => `| ${r.종류} | ${r.한글} | ${r.영어} | ${r.아이콘}${r.다른아이콘.length ? ` (그 외 ${r.다른아이콘.join(', ')})` : ''} | ${r.영웅수} |`),
    '',
  ].join('\n'));
  const sorted = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => a[0].localeCompare(b[0], 'ko')));
  fs.writeFileSync(DATA, `${JSON.stringify({ source: `7katlas codex tooltips (${today})`, icons: sorted(icons), types: sorted(types) }, null, 1)}\n`);
  const count = (t) => rows.filter((r) => r.종류 === TYPE_DIR[t]).length;
  console.log(`효과 ${rows.length} (버프 ${count('buff')} · 디버프 ${count('debuff')} · 특수효과 ${count('special')}) · 사이트 아이콘 ${used.size}`);
})().catch((e) => { console.error(e.message); process.exit(1); });
