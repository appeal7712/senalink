// 7katlas 펫 도감(https://7katlas.com/pets.html) → src/data/pets.js · asset/펫 목록/모든 펫.json · public/images/pets/{icon,skill}
// 실행: node scripts/import_7katlas_pets.mjs   (라이브 Firebase 무관 — 파일만 씀)
// 펫 id(pet_1 …)는 허브 · 공략 문서에 저장되므로 기존 펫은 이름으로 찾아 그대로 유지, 새 펫만 뒤에 번호를 이어 붙인다.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://7katlas.com/';
const CACHE = path.join(os.tmpdir(), 'katlas-pets');
fs.mkdirSync(CACHE, { recursive: true });

/** 우리 이름 ↔ 7katlas 한글 이름이 다른 펫 */
const NAME_ALIAS = { 멜패로: '멜페로' };
/** 영웅 데이터(scraped_heroes.json)와 효과 이름을 맞춤 — 팀 빌더가 같은 효과로 묶음 */
const EFFECT_ALIAS = { '치명타 피해량 증가': '치명타 피해 증가' };
/** 이미지가 아직 없는 미출시 펫은 제외 (Mr.아머는 기존 저장 데이터 때문에 유지) */
const KEEP_UNRELEASED = new Set(['mr-armor']);

async function fetchBuf(rel) {
  const res = await fetch(BASE + rel);
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

async function fetchText(rel, cacheName) {
  const file = path.join(CACHE, cacheName);
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  const buf = await fetchBuf(rel);
  if (!buf) throw new Error(`다운로드 실패: ${rel}`);
  fs.writeFileSync(file, buf);
  return buf.toString('utf8');
}

const ctx = { window: {} };
vm.createContext(ctx);
const petsSrc = (await fetchText('COMBINE/pets-L.js', 'pets-L.js')) + '\n' + (await fetchText('COMBINE/pets-R.js', 'pets-R.js'))
  + '\nthis.__ALL = [...(typeof PETS_L !== "undefined" ? PETS_L : []), ...(typeof PETS_R !== "undefined" ? PETS_R : [])];';
vm.runInContext(petsSrc, ctx);
vm.runInContext(await fetchText('lang/kr/pets.js', 'kr-pets.js'), ctx);
vm.runInContext(await fetchText('lang/kr/names.js', 'kr-names.js'), ctx);
const uiSrc = await fetchText('lang/kr/ui.js', 'kr-ui.js');
vm.runInContext(uiSrc, ctx);

const KR_PETS = ctx.window.I18N_PETS || {};
const KR_NAMES = ctx.window.I18N_NAMES || {};
const KR_UI = Object.values(ctx.window).find((v) => v && typeof v === 'object' && v['Four Lords']) || {};
const tr = (map, s) => (s && map[s]) || s;

const { pets: oldPets } = await import(pathToFileURL(path.join(ROOT, 'src/data/pets.js')).href + `?t=${Date.now()}`);
const oldByName = new Map(oldPets.map((p) => [p.name, p]));
let nextId = Math.max(...oldPets.map((p) => Number(String(p.id).replace('pet_', '')) || 0)) + 1;

const durationKr = (en) => {
  const m = /\[Duration:\s*(\d+)\s*Turn/.exec(en);
  if (m) return `[${m[1]}턴 지속]`;
  return /\[Always Active\]/.test(en) ? '[상시]' : '';
};
const pctOf = (s) => {
  const m = /(\d+(?:\.\d+)?)%/.exec(s || '');
  return m ? m[1] : null;
};
const isEnemyPassive = (p) => /Reduction|Vulnerability/.test(p.name) || /^Decreases (Defense|Incoming Healing|Weakness)/.test(p.effect);
const isFarming = (p) => !p.icon && /Ruby Farming|Adventure/.test(p.effect);

const out = [];
const assetsJson = [];
const iconDir = path.join(ROOT, 'public/images/pets/icon');
const skillDir = path.join(ROOT, 'public/images/pets/skill');
const fxDir = path.join(ROOT, 'public/images/effects');
fs.mkdirSync(iconDir, { recursive: true });
fs.mkdirSync(skillDir, { recursive: true });

for (const kp of ctx.__ALL) {
  if (kp.status === 'unreleased' && !KEEP_UNRELEASED.has(kp.id)) continue;
  const krMap = KR_PETS[kp.id] || {};
  const katlasName = kp.name_kr || kp.name;
  const name = NAME_ALIAS[katlasName] || katlasName;
  const old = oldByName.get(name);
  const id = old ? old.id : `pet_${nextId++}`;

  const portrait = await fetchBuf(kp.icon);
  if (portrait) fs.writeFileSync(path.join(iconDir, `${kp.id}.webp`), portrait);
  const skill = await fetchBuf(`images/skillsraw/pets/Tex_Skill_${kp.group_id}05.webp`);
  if (skill) fs.writeFileSync(path.join(skillDir, `${kp.id}.webp`), skill);

  const groups = new Map();
  const tooltips = {};
  const effectIcons = {};
  const enhanceLv = [[], [], []];
  for (const ps of kp.passives || []) {
    const effKr = tr(krMap, ps.effect);
    if (isFarming(ps)) {
      if (!groups.has('패시브')) groups.set('패시브', []);
      groups.get('패시브').push(`${effKr} (동일한 종류의 펫 패시브와 중복 적용 불가)`);
      continue;
    }
    const nmRaw = tr(krMap, ps.name);
    const nm = EFFECT_ALIAS[nmRaw] || nmRaw;
    const target = ps.target ? tr(KR_UI, ps.target) : isEnemyPassive(ps) ? '모든 적군' : '모든 아군';
    const oldDetail = old?.skills?.flatMap((s) => s.effects || []).flatMap((e) => e.details || [])
      .find((d) => d.startsWith(`${nm} [`));
    if (!groups.has(target)) groups.set(target, []);
    groups.get(target).push(oldDetail || `${nm} ${durationKr(ps.effect)}`.trim());
    tooltips[nm] = effKr.replace(/\s*\[[^\]]*\]\s*$/, '');
    if (ps.icon) {
      effectIcons[nm] = ps.icon;
      const fxFile = path.join(fxDir, `${ps.icon}.webp`);
      if (!fs.existsSync(fxFile)) {
        const buf = await fetchBuf(`images/effects/raw/${ps.icon}.webp`);
        if (buf) fs.writeFileSync(fxFile, buf);
      }
    }
    const base = pctOf(ps.effect);
    (ps.enhancements || []).forEach((en, i) => {
      const v = pctOf(en);
      if (i < 3 && v && v !== base) enhanceLv[i].push(`${nm} ${v}%로 변경`);
    });
  }
  const farming = groups.has('패시브');
  const skillObj = {
    name: farming ? '펫 패시브' : '펫의 응원',
    effects: [...groups].map(([target, details]) => ({ target, details })),
  };
  const enh = enhanceLv.map((l, i) => (l.length ? `${i + 1}레벨: ${l.join(', ')}` : null)).filter(Boolean);
  if (enh.length) skillObj.skill_enhance = enh;

  const pet = {
    id,
    name,
    title: old?.title || '',
    katlasId: kp.id,
    rarity: kp.rarity,
    rarityLabel: tr(KR_UI, kp.rarity === 'L' ? 'Legendary' : 'Rare'),
    faction: tr(KR_UI, kp.faction),
    relatedHero: kp.related_hero ? tr(KR_NAMES, kp.related_hero) : null,
    ...(kp.status === 'unreleased' ? { unreleased: true } : {}),
    stats: kp.stats,
    portraitUrl: portrait ? `/images/pets/icon/${kp.id}.webp` : old?.portraitUrl || null,
    skillIconUrl: skill ? `/images/pets/skill/${kp.id}.webp` : null,
    skills: [skillObj],
    tooltips,
    effectIcons,
  };
  out.push(pet);
  assetsJson.push({
    pet_name: name,
    rarity: pet.rarityLabel,
    faction: pet.faction,
    related_hero: pet.relatedHero,
    stats: pet.stats,
    skills: pet.skills,
    tooltips,
    effect_icons: effectIcons,
  });
}

/** 기존 순서(pets[0] = 기본값) 유지, 새 펫은 뒤에 */
const order = new Map(oldPets.map((p, i) => [p.id, i]));
const rank = (p) => (order.has(p.id) ? order.get(p.id) : 1000 + Number(p.id.replace('pet_', '')));
out.sort((a, b) => rank(a) - rank(b));
for (const old of oldPets) if (!out.some((p) => p.id === old.id)) out.push(old);

fs.writeFileSync(path.join(ROOT, 'src/data/pets.js'), `export const pets = ${JSON.stringify(out, null, 2)};\n`);
const assetDir = path.join(ROOT, 'asset/펫 목록');
if (fs.existsSync(assetDir)) fs.writeFileSync(path.join(assetDir, '모든 펫.json'), `${JSON.stringify(assetsJson, null, 2)}\n`);
console.log(`펫 ${out.length}종 (새 펫 ${out.filter((p) => !order.has(p.id)).map((p) => p.name).join(', ') || '없음'})`);
