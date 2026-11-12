/**
 * 영웅 추가 · 갱신 (신규 영웅 · 각성 · 스킬 리메이크) — asset 영웅 폴더 하나를 사이트 데이터로 옮긴다.
 *
 *   npm run add:hero -- 이브            (asset/영웅 목록 안에서 「이브(」로 시작하는 폴더를 찾음)
 *   npm run add:hero -- "스페셜 영웅/심연의 사도/이브(공격형)(각성)"
 *   npm run add:hero -- 이브 --dry      (쓰지 않고 바뀔 내용만)
 *
 * 하는 일 (encyclopedia.md §13.1 체크리스트 1~6을 한 번에):
 *   1. skills/*.json → src/data/scraped_heroes.json (새 영웅은 같은 소속 마지막 영웅 뒤에 추가, 있는 영웅은 스킬 내용만 교체)
 *      - 기존 영웅: id · title · group · category · cardTier · rarity · element · 스킬 id/iconUrl 유지, asset에 없는 스킬(쥬피 연사 등)은 남김
 *      - 툴팁은 영웅 단위 `tooltips` 하나(heroes.js가 스킬마다 연결)
 *   2. public/images/{id}/ portrait.png · card.webp · skills/*.png · exclusive-gear.png
 *   3. heroCardMeta.json · exclusiveGearMeta.generated.json 등록
 * 다음 단계: 새 효과가 있으면 node scripts/sync-effect-icons.cjs → npm run check:content (AGENTS.md §13.0).
 * 라이브 Firebase와 무관(로컬 파일만).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HERO_ROOT = path.join(ROOT, 'asset', '영웅 목록');
const DATA = path.join(ROOT, 'src/data/scraped_heroes.json');
const CARD_META = path.join(ROOT, 'src/data/heroCardMeta.json');
const GEAR_META = path.join(ROOT, 'src/data/exclusiveGearMeta.generated.json');

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const query = args.find((a) => !a.startsWith('--'));
if (!query) {
  console.log('사용법: npm run add:hero -- <영웅 이름 또는 asset/영웅 목록 기준 폴더 경로> [--dry]');
  process.exit(1);
}

const ROLE = { 공격형: 'offensive', 마법형: 'magic', 방어형: 'defensive', 지원형: 'support', 만능형: 'universal' };
const CATEGORY = { '스페셜 영웅': 'special', 일반영웅: 'normal', '일반 영웅': 'normal', '아스드 대륙': 'asgard', '아이사 대륙': 'aisha', 기타: 'other' };
const TYPE = {
  Normal: ['normal', 'basic_attack', ''],
  Active1: ['active1', 'active', 'upper'],
  Active2: ['active2', 'active', 'down'],
  Passive: ['passive', 'passive', ''],
  Awakening: ['awakening', 'awaken_skill', 'awaken'],
};

function findFolder(q) {
  const direct = path.isAbsolute(q) ? q : path.join(HERO_ROOT, q);
  if (fs.existsSync(path.join(direct, 'skills'))) return direct;
  const hits = [];
  const walk = (dir, depth) => {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const full = path.join(dir, d.name);
      if (d.name.startsWith(`${q}(`) && fs.existsSync(path.join(full, 'skills'))) hits.push(full);
      else if (depth < 3) walk(full, depth + 1);
    }
  };
  walk(HERO_ROOT, 0);
  if (hits.length !== 1) {
    console.log(hits.length ? `폴더가 여러 개예요 — 경로로 지정하세요:\n${hits.map((h) => `  ${path.relative(HERO_ROOT, h)}`).join('\n')}` : `asset/영웅 목록에서 「${q}(」 폴더를 못 찾음`);
    process.exit(1);
  }
  return hits[0];
}

const folder = findFolder(query);
const rel = path.relative(HERO_ROOT, folder).split(path.sep);
const folderName = rel[rel.length - 1];
const name = folderName.replace(/\((공격형|마법형|방어형|지원형|만능형|각성)\)/g, '').trim();
const roleKr = (folderName.match(/\((공격형|마법형|방어형|지원형|만능형)\)/) || [])[1];
const isAwakened = folderName.includes('(각성)');
const category = CATEGORY[rel[0]] || 'normal';
const collab = category === 'other' ? (rel[1].match(/\((.+)\)/) || [])[1] : null;
const group = collab || (rel.length > 2 ? rel[1].replace('(물음표네개)', '????') : '');

const skillDir = path.join(folder, 'skills');
const jsonFile = fs.readdirSync(skillDir).find((f) => f.endsWith('.json'));
if (!jsonFile) throw new Error(`${skillDir} 에 스킬 json이 없음`);
const asset = JSON.parse(fs.readFileSync(path.join(skillDir, jsonFile), 'utf8'));

const rawData = fs.readFileSync(DATA, 'utf8');
const heroes = JSON.parse(rawData);
const prev = heroes.find((h) => h.name === name);
const id = prev?.id || (collab ? `collab_${name.replace(/\s+/g, '')}` : name);

const describe = (effects) => effects.map((e) => `[${e.target}]\n${e.details.join('\n')}`).join('\n\n');
const allDetails = asset.skills.flatMap((s) => (s.effects || []).flatMap((e) => e.details || [])).join('\n');
const physical = (allDetails.match(/물리 공격력/g) || []).length;
const magic = (allDetails.match(/마법 공격력/g) || []).length;

const skills = asset.skills.map((s) => {
  if (!TYPE[s.type]) throw new Error(`알 수 없는 스킬 type: ${s.type} (${s.name})`);
  const [suffix, type, direction] = TYPE[s.type];
  const old = prev?.skills.find((x) => x.name === s.name) || prev?.skills.find((x) => x.id === `${id}_${suffix}`);
  const out = {
    id: old?.id || `${id}_${suffix}`,
    name: s.name,
    type,
    direction,
    cooldown: s.cooldown ?? 0,
    description: describe(s.effects || []),
    effects: s.effects || [],
    skillEnhance: s.skill_enhance || [],
    transcendenceEffects: s.transcendence_effects || {},
    iconUrl: old?.name === s.name && old.iconUrl ? old.iconUrl : `/images/${id}/skills/${s.name}.png`,
  };
  if (s.gauge) out.awakenGauge = s.gauge;
  if (s.gauge_decrease) out.awakenGaugeDecrease = s.gauge_decrease;
  return out;
});
const kept = (prev?.skills || []).filter((x) => !skills.some((s) => s.id === x.id || s.name === x.name));

const hero = {
  id,
  name,
  title: prev?.title ?? (collab ? `${collab} 콜라보` : ''),
  group: prev?.group ?? group,
  category: prev?.category ?? category,
  role: ROLE[roleKr] || prev?.role || 'offensive',
  attackType: prev?.attackType ?? (magic > physical ? 'magic' : 'physical'),
  rarity: prev?.rarity ?? (['special', 'other'].includes(category) ? 'legend' : 'rare'),
  isAwakened,
  baseStats: prev?.baseStats ?? { hp: 0, speed: 0, def: 0, critRate: 0, critDmg: 0, weakRate: 0 },
  portraitUrl: prev?.portraitUrl ?? `/images/${id}/portrait.png`,
  skills: [...skills, ...kept],
  tooltips: asset.tooltips || {},
  cardTier: prev?.cardTier ?? (category === 'special' ? (group === '(구)세븐나이츠' ? 'old_seven' : 'special') : 'normal'),
  element: prev?.element ?? '',
};

/* ── 바뀐 점 요약 ── */
const report = [];
if (!prev) report.push(`새 영웅: ${name} (id ${id} · ${group || '-'} · ${category} · ${hero.role} · ${hero.attackType} · 각성 ${isAwakened})`);
else {
  for (const k of ['role', 'attackType', 'isAwakened']) if (prev[k] !== hero[k]) report.push(`${k}: ${prev[k]} → ${hero[k]}`);
  for (const s of skills) {
    const o = prev.skills.find((x) => x.id === s.id);
    if (!o) { report.push(`스킬 추가: ${s.name}`); continue; }
    for (const k of ['name', 'cooldown', 'effects', 'skillEnhance', 'transcendenceEffects', 'awakenGauge']) {
      if (JSON.stringify(o[k]) !== JSON.stringify(s[k])) report.push(`스킬 ${o.name} — ${k} 변경`);
    }
  }
  if (kept.length) report.push(`asset에 없어 그대로 둔 스킬: ${kept.map((s) => s.name).join(', ')}`);
}
console.log(`[${path.relative(HERO_ROOT, folder)}]\n${report.map((r) => `  · ${r}`).join('\n') || '  · 데이터 변경 없음'}`);
if (dry) process.exit(0);

/* ── 데이터 쓰기 (CRLF · 2칸 들여쓰기 그대로) ── */
const writeJson = (file, value, raw) => {
  const crlf = raw.includes('\r\n');
  const text = JSON.stringify(value, null, 2);
  fs.writeFileSync(file, `${crlf ? text.replace(/\n/g, '\r\n') : text}${raw.endsWith('\n') ? (crlf ? '\r\n' : '\n') : ''}`);
};
if (prev) heroes[heroes.indexOf(prev)] = hero;
else {
  let at = heroes.length;
  for (let i = heroes.length - 1; i >= 0; i -= 1) if (heroes[i].group === hero.group) { at = i + 1; break; }
  heroes.splice(at, 0, hero);
}
writeJson(DATA, heroes, rawData);

/* ── 이미지 (PIL) ── */
const pngs = fs.readdirSync(folder).filter((f) => f.toLowerCase().endsWith('.png'));
const portrait = pngs.find((f) => f.includes('초상화'));
const gear = pngs.find((f) => f.endsWith('_전용장비.png')) || pngs.find((f) => f.startsWith('Tex_ItemIcon_'));
const pub = path.join(ROOT, 'public/images', id);
fs.mkdirSync(path.join(pub, 'skills'), { recursive: true });
for (const f of fs.readdirSync(skillDir).filter((x) => x.toLowerCase().endsWith('.png'))) fs.copyFileSync(path.join(skillDir, f), path.join(pub, 'skills', f));
/* 그림이 같으면 다시 저장하지 않음(재인코딩만으로 파일이 바뀌어 커밋에 섞이는 것 방지) */
const py = `
import os, sys
from PIL import Image
portrait, gear, pub = sys.argv[1], sys.argv[2], sys.argv[3]
def same(im, target):
    if not os.path.exists(target): return False
    old = Image.open(target).convert('RGBA')
    return old.size == im.size and old.tobytes() == im.tobytes()
if portrait:
    im = Image.open(portrait).convert('RGBA')
    if not same(im, pub + '/portrait.png') or not os.path.exists(pub + '/card.webp'):
        im.save(pub + '/portrait.png')
        im.save(pub + '/card.webp', 'WEBP', quality=90)
if gear:
    im = Image.open(gear).convert('RGBA')
    if not same(im, pub + '/exclusive-gear.png'):
        im.save(pub + '/exclusive-gear.png')
`;
const r = spawnSync('python', ['-c', py, portrait ? path.join(folder, portrait) : '', gear ? path.join(folder, gear) : '', pub], { encoding: 'utf8' });
if (r.status !== 0) throw new Error(`이미지 변환 실패 (python + Pillow 필요): ${r.stderr || r.error}`);

/* ── 카드 · 전용장비 메타 ── */
const addMeta = (file, key, value) => {
  const raw = fs.readFileSync(file, 'utf8');
  const meta = JSON.parse(raw);
  meta[key] = value;
  writeJson(file, meta, raw);
};
if (portrait) addMeta(CARD_META, id, { id, name, cardUrl: `/images/${id}/card.webp`, source: 'asset_portrait' });
if (gear) addMeta(GEAR_META, id, { heroName: name, iconUrl: `/images/${id}/exclusive-gear.png` });

const missing = [!portrait && '초상화(*_초상화.png)', !gear && '전용장비(*_전용장비.png)'].filter(Boolean);
const noIcon = hero.skills.filter((s) => !fs.existsSync(path.join(ROOT, 'public', decodeURI(s.iconUrl))));
console.log(`  · 이미지 → public/images/${id}/${missing.length ? ` (없음: ${missing.join(', ')})` : ''}`);
if (noIcon.length) console.log(`  · 스킬 아이콘 파일 없음: ${noIcon.map((s) => s.name).join(', ')}`);
console.log('다음: (새 효과면) node scripts/sync-effect-icons.cjs → npm run check:content');
