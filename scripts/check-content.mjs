/**
 * 신규 영웅 · 신규 효과 점검 — `npm run check:content` (라이브 · Firestore 무관, 로컬 데이터만 읽음).
 * 도감 데이터(scraped_heroes.json · pets.js)를 팀 빌더 엔진에 전부 돌려서, 새 영웅 · 새 효과 때문에 생긴 문제만 골라 보여 준다.
 *
 *   npm run check:content             점검 — 기준선(check-content.baseline.json)에 없던 문제만 「새로 생김」으로 표시, 있으면 종료 코드 1
 *   npm run check:content -- --update 지금 상태를 기준선으로 저장(새 문제를 다 고쳤거나 「원래 그런 것」으로 확인한 뒤)
 *   npm run check:content -- --hero 이름  그 영웅만 자세히(스킬 문장별로 못 읽은 곳)
 *
 * 보는 것(AGENTS.md §13.0 신규 영웅 런북과 같은 순서):
 *   1. 영웅 데이터 — 초상화 파일 · 역할 · 공격 타입(물리/마법, 전력 비교 물리 · 마법 줄) · 소속 · 전용장비 아이콘
 *   2. 엔진 실행 — 영웅마다 analyzeTeam · effectCards · skillCards · heroSummary · formationRequirements, 무작위 덱 duelSummary 오류 0
 *   3. 스킬 문장 — 점검표(dev/tb-audit.html)와 같은 `auditHero` 「못 읽음」(hard) 표시
 *   4. 효과 아이콘 없음 — effectIcons.js `effectIconUrl`이 못 찾는 효과 이름(→ ALIASES 추가 또는 sync-effect-icons)
 *   5. 분류 안 됨 — `classify`가 utility로 둔 효과(버프/디버프 목록에서 빠짐. 메커니즘이면 정상)
 *   6. 전력 비교 빠짐 — 상시 · 전투 시작 패시브인데 DUEL_STATS 어느 줄에도 안 걸리는 효과 이름
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(root, 'scripts', 'check-content.baseline.json');
const args = process.argv.slice(2);
const update = args.includes('--update');
const heroArg = args.includes('--hero') ? args[args.indexOf('--hero') + 1] : null;

const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true, hmr: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
const load = (p) => server.ssrLoadModule(p);
try {
  const E = await load('/src/lib/teamBuilderAnalysis.js');
  const { heroes } = await load('/src/data/heroes.js');
  const { pets } = await load('/src/data/pets.js');
  const { effectIconUrl } = await load('/src/lib/effectIcons.js');
  const { auditHero } = await load('/dev/tbAuditLogic.js');
  const gearMeta = JSON.parse(fs.readFileSync(path.join(root, 'src/data/exclusiveGearMeta.generated.json'), 'utf8'));
  const rareSet = E.buildRareEffectSet(heroes);

  const found = { data: new Set(), errors: new Set(), unread: new Set(), noIcon: new Set(), utility: new Set(), duelMissing: new Set() };
  const where = new Map();
  const note = (kind, key, hero) => {
    found[kind].add(key);
    const k = `${kind}|${key}`;
    if (!where.has(k)) where.set(k, new Set());
    if (hero) where.get(k).add(hero);
  };
  const plain = (n) => String(n || '').replace('(각성)', '').trim();

  for (const h of heroes) {
    const name = plain(h.name);
    /* 1. 영웅 데이터 */
    const portrait = h.portraitUrl && path.join(root, 'public', decodeURI(h.portraitUrl));
    if (!portrait || !fs.existsSync(portrait)) note('data', `${name}: 초상화 파일 없음 (${h.portraitUrl || 'portraitUrl 비어 있음'})`, name);
    if (!['offensive', 'magic', 'defensive', 'support', 'universal'].includes(h.role)) note('data', `${name}: 역할(role) 이상 「${h.role}」`, name);
    if (!['physical', 'magic'].includes(h.attackType)) note('data', `${name}: 공격 타입(attackType) 이상 「${h.attackType}」 — 전력 비교 물리 · 마법 줄에서 빠짐`, name);
    if (!h.group || !h.category) note('data', `${name}: 소속(group) · 분류(category) 비어 있음 — 목록 정렬 §12.1`, name);
    if (!gearMeta[h.id]) note('data', `${name}: 전용장비 아이콘 없음 (exclusiveGearMeta.generated.json)`, name);
    for (const s of h.skills || []) {
      const icon = s.iconUrl && path.join(root, 'public', decodeURI(s.iconUrl));
      if (!icon || !fs.existsSync(icon)) note('data', `${name}: 스킬 아이콘 파일 없음 「${s.name}」`, name);
    }

    /* 2. 엔진 실행 */
    try {
      const a = E.analyzeTeam([h], { rareSet });
      E.effectCards(a, [h]);
      E.effectCards(a, [h], true, { selfOnly: true });
      E.skillCards(a, [h]);
      E.formationRequirements(a, [h], 5);
      E.heroSummary(h, { rareSet });
    } catch (err) {
      note('errors', `${name}: ${err.message}`, name);
    }

    /* 3. 스킬 문장 */
    const audit = auditHero(h, rareSet);
    for (const sk of audit.skills) {
      for (const line of sk.lines) {
        for (const f of line.flags.filter((x) => x.lv === 'hard')) note('unread', `${name} · ${sk.skill.name} — ${f.text}: ${line.text.slice(0, 60)}`, name);
      }
    }

    /* 4~6. 효과 이름 */
    for (const e of E.collectHeroEntries(h, { rareSet, allowTower: true })) {
      if (e.kind !== 'effect') continue;
      const label = E.listLabel(e.name);
      if (!e.special && e.category !== 'utility' && !effectIconUrl(label) && !effectIconUrl(e.name)) note('noIcon', label, name);
      if (e.category === 'utility') note('utility', label, name);
      if (E.duelStatIdOf(e) === null) note('duelMissing', label, name);
    }
  }
  for (const p of pets) {
    for (const e of E.petEntries(p, heroes.slice(0, 5))) {
      const label = E.listLabel(e.name);
      if (!effectIconUrl(label) && !effectIconUrl(e.name)) note('noIcon', label, `${p.name}(펫)`);
      if (E.duelStatIdOf(e) === null) note('duelMissing', label, `${p.name}(펫)`);
    }
  }

  /* 2. 무작위 덱 전력 비교(5:5 · 3:3, 펫 포함) */
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const pick = (n) => { const pool = [...heroes]; const out = []; while (out.length < n) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]); return out; };
  for (let i = 0; i < 400; i += 1) {
    const size = i % 3 === 0 ? 3 : 5;
    const a = pick(size); const b = pick(size);
    try {
      const ma = E.analyzeTeam(a, { rareSet }); const mb = E.analyzeTeam(b, { rareSet });
      E.duelSummary(ma, a, mb, b, true, { ours: pets[i % pets.length], theirs: i % 2 ? pets[(i * 7) % pets.length] : null });
    } catch (err) {
      note('errors', `덱 ${a.map((h) => plain(h.name)).join('·')} vs ${b.map((h) => plain(h.name)).join('·')}: ${err.message}`);
    }
  }

  /* --hero: 그 영웅만 자세히 */
  if (heroArg) {
    const h = heroes.find((x) => plain(x.name) === heroArg || x.id === heroArg);
    if (!h) throw new Error(`영웅 「${heroArg}」을 못 찾았어요`);
    const audit = auditHero(h, rareSet);
    console.log(`\n■ ${plain(h.name)} — 못 읽음 ${audit.hard} · 확인 필요 ${audit.soft}${audit.tipOnly.length ? ` · 툴팁에만 있는 효과 ${audit.tipOnly.join(', ')}` : ''}`);
    for (const sk of audit.skills) {
      console.log(`  [${sk.label}] ${sk.skill.name}`);
      for (const line of sk.lines) {
        const read = line.entries.map((e) => (e.kind === 'damage' ? '피해' : `${e.name}${E.entryValue(e) != null ? ` ${E.entryValue(e)}%` : ''}`)).join(', ');
        const flags = line.flags.map((f) => `${f.lv === 'hard' ? '✗' : '△'} ${f.text}`).join(' / ');
        console.log(`    ${line.kind === 'up' ? `(${line.tag}) ` : ''}${line.text.slice(0, 70)}${read ? `  → ${read}` : line.note ? `  → ${line.note.text}` : ''}${flags ? `  ${flags}` : ''}`);
      }
    }
  }

  /* 기준선 비교 */
  const now = Object.fromEntries(Object.entries(found).map(([k, v]) => [k, [...v].sort()]));
  if (update) {
    fs.writeFileSync(BASELINE, `${JSON.stringify(now, null, 1)}\n`);
    console.log(`기준선 저장: ${path.relative(root, BASELINE)}`);
  } else {
    const base = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : {};
    const TITLES = {
      data: '영웅 데이터 (초상화 · 역할 · 공격 타입 · 소속 · 전용장비 · 스킬 아이콘)',
      errors: '엔진 오류',
      unread: '스킬 문장 못 읽음 (점검표 dev/tb-audit.html 에서 원문 확인)',
      noIcon: '효과 아이콘 없음 (lib/effectIcons.js ALIASES 또는 node scripts/sync-effect-icons.cjs)',
      utility: '분류 안 됨 — 버프/디버프 목록에서 빠짐 (메커니즘이면 정상, 버프면 classify 확인)',
      duelMissing: '전력 비교 빠짐 — DUEL_STATS 줄 추가 필요한지 확인 (features.md §10.10 「안 넣는 것」)',
    };
    let fresh = 0;
    console.log(`영웅 ${heroes.length} · 펫 ${pets.length} 점검`);
    for (const [k, title] of Object.entries(TITLES)) {
      const old = new Set(base[k] || []);
      const add = now[k].filter((x) => !old.has(x));
      const gone = [...old].filter((x) => !found[k].has(x));
      fresh += add.length;
      console.log(`\n${add.length ? '✗' : '✓'} ${title} — 새로 생김 ${add.length} · 기존 ${now[k].length - add.length}${gone.length ? ` · 해결됨 ${gone.length}` : ''}`);
      for (const x of add) {
        const who = [...(where.get(`${k}|${x}`) || [])];
        console.log(`   + ${x}${who.length && !x.startsWith(who[0]) ? `  (${who.slice(0, 6).join(', ')}${who.length > 6 ? ` 외 ${who.length - 6}` : ''})` : ''}`);
      }
    }
    console.log(fresh ? `\n새 문제 ${fresh}건 — 고친 뒤 다시 실행, 원래 그런 것이면 --update` : '\n새 문제 없음');
    process.exitCode = fresh ? 1 : 0;
  }
} finally {
  await server.close();
}
