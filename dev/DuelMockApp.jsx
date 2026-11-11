/**
 * 전력 비교 시안 — 로컬 개발 서버 전용 (http://127.0.0.1:5173/dev/duel-mock.html). 배포본 미포함 · Firestore · localStorage 무접근.
 * 데이터는 실제 엔진(`duelSummary`)으로 무작위 덱을 돌려 경우마다 처음 나온 줄을 고른 것. 화면만 새 규칙(밍봉 2026-11-11 회의):
 * 펼침 = 효과 기준(효과 한 줄 + 아래 받는 영웅 줄, 못 받은 영웅은 흐리게) · 일부만 받으면 접힌 줄에 영웅 점 · 준 영웅 = 수치 옆 동그라미 · 폰도 반반.
 * PC · 폰 칸은 컨테이너 쿼리(`.dm-frame`)라 한 화면에 두 크기가 같이 보임.
 */
import { useMemo, useState } from 'react';
import { heroes } from '../src/data/heroes';
import { pets } from '../src/data/pets';
import { analyzeTeam, buildRareEffectSet, duelSummary } from '../src/lib/teamBuilderAnalysis';
import { FxIcon, GiverFace, MiniHero } from '../src/pages/teamBuilder/TeamBuilderParts';
import { UI_IMAGE_ICONS } from '../src/data/uiIcons';
import '../src/index.css';
import '../src/styles/teamBuilder.css';
import './duelMock.css';

const cleanName = (n) => String(n || '').replace('(각성)', '').trim();
const HERO_BY_NAME = new Map(heroes.map((h) => [cleanName(h.name), h]));
const resolveHero = (name) => HERO_BY_NAME.get(cleanName(name)) || null;
const PET_NAMES = new Set(pets.map((p) => p.name));
const isPet = (giver) => PET_NAMES.has(String(giver || '').replace(/\(펫\)$/, ''));

const fmt = (v) => {
  const n = Math.round(v);
  return n > 0 ? `+${n}%` : n < 0 ? `−${-n}%` : '0%';
};
const sign = (v) => (Math.round(v) > 0 ? 'is-plus' : Math.round(v) < 0 ? 'is-minus' : 'is-zero');

/* ───────── 화면 규칙 (실제 적용 때 TeamBuilderParts로 옮길 부분) ───────── */

/**
 * 접힌 줄 수치 — 큰 숫자 = 0이 아닌 값 중 가장 많은 영웅이 받는 값(같으면 절댓값 큰 쪽).
 * 전원이 그 값이면 점 없음, 아니면 영웅 점(꽉 찬 점 = 그 값 · 테두리 점 = 다른 양 · 빈 점 = 못 받음).
 */
function headline(list) {
  const totals = list.map((h) => ({ name: h.name, v: Math.round(h.total) }));
  const count = new Map();
  for (const t of totals) if (t.v) count.set(t.v, (count.get(t.v) || 0) + 1);
  if (!count.size) return { value: 0, dots: null };
  const value = [...count.entries()].sort((a, b) => b[1] - a[1] || Math.abs(b[0]) - Math.abs(a[0]))[0][0];
  if (totals.every((t) => t.v === value)) return { value, dots: null };
  const kind = (t) => (t.v === value ? 'full' : t.v ? 'part' : 'zero');
  const order = { full: 0, part: 1, zero: 2 };
  const dots = totals.map((t) => ({ ...t, kind: kind(t) })).sort((a, b) => order[a.kind] - order[b.kind]);
  return { value, dots };
}

function Dots({ dots }) {
  if (!dots) return null;
  return (
    <span className="dm-dots" title={dots.map((d) => `${d.name} ${fmt(d.v)}`).join(' · ')}>
      {dots.map((d) => <i key={d.name} className={`dm-dot is-${d.kind} ${sign(d.v)}`} />)}
    </span>
  );
}

function Value({ side, list, none, icons }) {
  const { value, dots } = none ? { value: 0, dots: null } : headline(list);
  const icon = none || !value ? null : value > 0 ? icons?.up : icons?.down;
  return (
    <span className={`dm-val is-${side} ${none ? 'is-zero' : sign(value)}`}>
      <span className="dm-num">
        <span className="dm-num-icon">{icon ? <FxIcon name={icon} size={21} /> : null}</span>
        <b>{none ? '—' : fmt(value)}</b>
      </span>
      <Dots dots={dots} />
    </span>
  );
}

/** 효과 기준 묶기 — 같은 효과 · 수치 · 준 영웅 · 턴이면 한 줄, `got` = 받는 영웅 */
function effectLines(list) {
  const map = new Map();
  for (const h of list) {
    for (const it of h.items) {
      const key = `${it.label}|${Math.round(it.value)}|${it.giver}|${it.turns ?? ''}`;
      if (!map.has(key)) map.set(key, { ...it, got: new Set() });
      map.get(key).got.add(h.name);
    }
  }
  return [...map.values()];
}

function Giver({ name }) {
  if (!name) return null;
  return (
    <span className={`dm-giver${isPet(name) ? ' is-pet' : ''}`} title={`${name}이(가) 줌`}>
      <GiverFace name={name} resolveHero={resolveHero} size={22} />
    </span>
  );
}

/** 같은 효과 이름은 두 팀 같은 높이 줄에 — 우리 순서 먼저, 상대에만 있는 건 뒤에. 없는 쪽은 빈 줄 */
function slotsOf(linesBySide) {
  const order = [];
  const need = new Map();
  for (const lines of linesBySide) {
    const count = new Map();
    for (const e of lines) count.set(e.label, (count.get(e.label) || 0) + 1);
    for (const [label, n] of count) {
      if (!need.has(label)) { order.push(label); need.set(label, 0); }
      need.set(label, Math.max(need.get(label), n));
    }
  }
  return order.flatMap((label) => Array.from({ length: need.get(label) }, (_, i) => ({ label, i })));
}

/** 효과가 한 줄뿐이고 전원이 받으면 합계가 위 줄과 똑같아서 안 보임 */
const showTotals = (lines, list) => lines.length > 0 && !(lines.length === 1 && lines[0].got.size === list.length);

function Side({ k, list, lines, slots, totalsRow, none, only }) {
  const byLabel = new Map();
  for (const e of lines) { if (!byLabel.has(e.label)) byLabel.set(e.label, []); byLabel.get(e.label).push(e); }
  const multi = !none && showTotals(lines, list);
  const totals = new Map();
  if (multi) for (const h of list) { const key = h.items.length ? Math.round(h.total) : 'none'; if (!totals.has(key)) totals.set(key, new Set()); totals.get(key).add(h.name); }
  const totalKeys = [...totals.keys()].sort((a, b) => (a === 'none') - (b === 'none') || (a === 'none' ? 0 : b - a));
  return (
    <div className={`dm-side is-${k}${lines.some((e) => e.turns) ? ' has-turn' : ''}`}>
      <p className="dm-side-title">
        {k === 'ours' ? '우리' : '상대'}
        {only ? <em>{only === 'physical' ? '물리 영웅만' : '마법 영웅만'}</em> : null}
      </p>
      {none || !lines.length ? <p className="dm-empty" style={{ gridRow: `span ${Math.max(1, slots.length) + (totalsRow ? 1 : 0)}` }}>{none ? '이 공격 타입 영웅 없음' : '받는 효과 없음'}</p> : (
        <ul className="dm-fx-list">
          {slots.map((slot) => {
            const e = byLabel.get(slot.label)?.[slot.i];
            if (!e) return <li key={`blank-${slot.label}-${slot.i}`} className="dm-fx is-blank" aria-hidden="true" />;
            return (
              <li key={`${e.label}|${e.value}|${e.giver}|${e.turns}`} className={`dm-fx ${sign(e.value)}`}>
                <span className="dm-fx-icon"><FxIcon name={e.label} size={22} /></span>
                <span className="dm-fx-name">{e.label}</span>
                <b className="dm-fx-val">{fmt(e.value)}</b>
                <Giver name={e.giver} />
                {e.turns ? <i className="dm-turn" title="전투 시작 시 이 턴 동안만">{e.turns}턴</i> : null}
                <span className="dm-recv">
                  {list.map((h) => (
                    <span key={h.name} className={`dm-recv-face${e.got.has(h.name) ? '' : ' is-off'}`} title={`${h.name} ${e.got.has(h.name) ? '받음' : '못 받음'}`}>
                      <MiniHero hero={resolveHero(h.name)} size={22} />
                    </span>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {multi ? (
        <div className="dm-totals">
          <span className="dm-totals-head">
            <img className="dm-total-icon" src={UI_IMAGE_ICONS.tbDuelTotal.src} alt="" draggable={false} />
            영웅별 합계
          </span>
          {totalKeys.map((key) => {
            const names = totals.get(key);
            const isNone = key === 'none';
            return (
              <span key={key} className={`dm-total ${isNone ? 'is-none is-zero' : sign(key)}`}>
                <span className="dm-total-faces">
                  {list.filter((h) => names.has(h.name)).map((h) => (
                    <span key={h.name} className="dm-total-face">
                      <MiniHero hero={resolveHero(h.name)} size={22} />
                    </span>
                  ))}
                </span>
                <b className="dm-total-val">{isNone ? '0%' : fmt(key)}</b>
              </span>
            );
          })}
        </div>
      ) : totalsRow && !none && lines.length ? <div className="dm-totals is-blank" aria-hidden="true" /> : null}
    </div>
  );
}

function Row({ s, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const none = (k) => s.n?.[k] === 0;
  const list = (k) => s.heroes?.[k] || [];
  const uniform = (k) => none(k) || !headline(list(k)).dots;
  const bar = (k) => {
    const v = Math.round(s[k]);
    if (none(k) || !v) return null;
    return <i className={v > 0 ? 'is-plus' : 'is-minus'} style={{ width: `${Math.max(3, Math.min(100, Math.abs(v)))}%` }} />;
  };
  return (
    <li className={`dm-row${open ? ' is-open' : ''}`}>
      <button type="button" className="dm-line" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Value side="ours" list={list('ours')} none={none('ours')} icons={s.icons} />
        <span className="dm-track is-ours">{bar('ours')}</span>
        <span className="dm-stat">
          <span className="dm-stat-name">{s.label}</span>
          {uniform('ours') && uniform('theirs') ? <small>{`${Math.round(Math.abs(s.diff))}% 차이`}</small> : null}
        </span>
        <span className="dm-track is-theirs">{bar('theirs')}</span>
        <Value side="theirs" list={list('theirs')} none={none('theirs')} icons={s.icons} />
      </button>
      {open ? (() => {
        const lines = { ours: none('ours') ? [] : effectLines(list('ours')), theirs: none('theirs') ? [] : effectLines(list('theirs')) };
        const slots = slotsOf([lines.ours, lines.theirs]);
        const totalsRow = showTotals(lines.ours, list('ours')) || showTotals(lines.theirs, list('theirs'));
        const rows = 1 + Math.max(1, slots.length) + (totalsRow ? 1 : 0);
        const side = (k) => <Side k={k} list={list(k)} lines={lines[k]} slots={slots} totalsRow={totalsRow} none={none(k)} only={s.only} />;
        return (
          <div className="dm-detail" style={{ gridTemplateRows: `repeat(${rows}, auto)` }}>
            {side('ours')}
            {side('theirs')}
          </div>
        );
      })() : null}
    </li>
  );
}

/* ───────── 경우 찾기 — 실제 엔진으로 무작위 덱을 돌려 경우마다 첫 줄 ───────── */

const CASES = [
  { id: 'all', title: '전원이 같은 값', rate: '한 팀 칸의 51%', test: (s, k) => s.n[k] > 0 && (s.heroes[k] || []).length > 1 && !headline(s.heroes[k]).dots && headline(s.heroes[k]).value !== 0 && effectLines(s.heroes[k]).length === 1 },
  { id: 'zero', title: '아무도 안 받음 (0%)', rate: '42%', test: (s, k) => s.n[k] > 0 && !effectLines(s.heroes[k] || []).length },
  { id: 'partial', title: '일부 영웅만 받음', rate: '5% — 그중 86%가 「몇 명만 · 나머지 0」', test: (s, k) => { const h = headline(s.heroes[k] || []); return h.dots && h.dots.some((d) => d.kind === 'zero') && effectLines(s.heroes[k]).length === 1; } },
  { id: 'multi', title: '한 영웅이 효과 2개 이상 (예: 여포)', rate: '영웅의 7%', test: (s, k) => (s.heroes[k] || []).some((h) => h.items.length > 1) },
  { id: 'turn', title: '턴제 효과 (전투 시작 N턴)', rate: '효과의 6%', test: (s, k) => (s.heroes[k] || []).some((h) => h.items.some((it) => it.turns)) },
  { id: 'pet', title: '펫이 준 효과', rate: '효과의 22%', test: (s, k) => (s.heroes[k] || []).some((h) => h.items.some((it) => isPet(it.giver))) },
  { id: 'none', title: '그 공격 타입 영웅 없음 「—」', rate: '1%', test: (s, k) => s.n[k] === 0 },
  { id: 'both', title: '두 팀이 같은 효과 + 다른 효과 (같은 효과는 같은 줄)', rate: '줄 맞춤 확인', test: (s) => { if (!s.n.ours || !s.n.theirs) return false; const a = new Set(effectLines(s.heroes.ours || []).map((e) => e.label)); const b = new Set(effectLines(s.heroes.theirs || []).map((e) => e.label)); const shared = [...a].filter((l) => b.has(l)).length; return shared > 0 && (a.size + b.size - shared) > shared && a.size > 0 && b.size > 0 && [...b].some((l) => !a.has(l)); } },
  { id: 'mix', title: '+ 와 − 가 섞임', rate: '0.3%', test: (s, k) => { const h = headline(s.heroes[k] || []); return h.dots && h.dots.some((d) => d.v > 0) && h.dots.some((d) => d.v < 0); } },
];

function findCases() {
  const rareSet = buildRareEffectSet(heroes);
  let seed = 11;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const pick = (n) => { const pool = [...heroes]; const out = []; while (out.length < n) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]); return out; };
  const petPick = () => (rnd() < 0.6 ? pets[Math.floor(rnd() * pets.length)] : null);
  const found = new Map();
  let board = null;
  for (let i = 0; i < 1500 && found.size < CASES.length; i += 1) {
    const size = i % 4 === 3 ? 3 : 5;
    const a = pick(size); const b = pick(size);
    const pa = petPick(); const pb = petPick();
    const d = duelSummary(analyzeTeam(a, { rareSet }), a, analyzeTeam(b, { rareSet }), b, true, { ours: pa, theirs: pb });
    if (!board && size === 5 && d.finals.length >= 7) board = { a, b, pa, pb, d };
    for (const s of d.finals) {
      for (const c of CASES) {
        if (found.has(c.id)) continue;
        if (c.test(s, 'ours') || c.test(s, 'theirs')) { found.set(c.id, { s, a, b, pa, pb }); break; }
      }
    }
  }
  return { found, board };
}

function DeckFaces({ a, b, pa, pb }) {
  const pet = (p) => (p?.portraitUrl ? <img className="dm-deck-pet" src={p.portraitUrl} alt="" width={20} height={20} /> : null);
  return (
    <p className="dm-deck">
      <span className="dm-deck-side is-ours">우리</span>
      {a.map((h) => <MiniHero key={h.name} hero={h} size={22} />)}{pet(pa)}
      <span className="dm-deck-vs">vs</span>
      {b.map((h) => <MiniHero key={h.name} hero={h} size={22} />)}{pet(pb)}
      <span className="dm-deck-side is-theirs">상대</span>
    </p>
  );
}

function Frames({ children }) {
  return (
    <div className="dm-frames">
      <div className="dm-frame is-pc"><span className="dm-frame-tag">PC</span>{children}</div>
      <div className="dm-frame is-phone"><span className="dm-frame-tag">폰 360px</span>{children}</div>
    </div>
  );
}

export default function DuelMockApp() {
  const { found, board } = useMemo(() => findCases(), []);
  return (
    <div className="dm-page tb-page">
      <header className="dm-head">
        <h1>전력 비교 시안 — 모든 경우</h1>
        <p>실제 엔진으로 무작위 덱을 돌려 경우마다 처음 나온 줄을 보여 줘요. 줄을 누르면 접기 · 펼치기. 라이브 · 덱 저장과 무관(로컬 전용).</p>
        <ul className="dm-rules">
          <li><b>펼침 = 효과 기준</b> — 효과 한 줄(아이콘 · 이름 · 수치 · 준 영웅 ○ · 턴) + 아래 받는 영웅 네모 얼굴, 못 받은 영웅은 흐리게</li>
          <li><b>일부만 받으면</b> 접힌 줄 숫자 아래 영웅 점 — ● 그 값 · ◌ 다른 양 · ○ 못 받음</li>
          <li><b>받는 영웅 = 네모</b> · <b>준 영웅 · 펫 = 동그라미</b> · 수치 + 파랑 / − 빨강 · 팀 구분은 배경</li>
          <li><b>상자 2단까지</b> — 팀 칸 안은 구분선만 · 폰도 우리 | 상대 반반</li>
        </ul>
      </header>

      {board ? (
        <section className="dm-case">
          <h2>한 판 전체 (접힌 상태) <small>평균 6줄 · 많으면 14줄</small></h2>
          <DeckFaces {...board} />
          <Frames>
            <div className="dm-board">
              <ul className="dm-rows">{board.d.finals.map((s) => <Row key={s.id} s={s} />)}</ul>
            </div>
          </Frames>
        </section>
      ) : null}

      {CASES.map((c) => {
        const f = found.get(c.id);
        if (!f) return null;
        return (
          <section key={c.id} className="dm-case">
            <h2>{c.title} <small>{c.rate}</small></h2>
            <DeckFaces {...f} />
            <Frames>
              <div className="dm-board">
                <ul className="dm-rows"><Row s={f.s} defaultOpen /></ul>
              </div>
            </Frames>
          </section>
        );
      })}
    </div>
  );
}
