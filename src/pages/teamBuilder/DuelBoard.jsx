/**
 * 팀 빌더 「전력 비교」 판 — 접힌 줄(능력치별 우리 | 상대) · 펼침(효과 기준 · 영웅별 합계) · 두 팀 같음 · 자기 자신만 받는 버프.
 * 데이터 = 엔진 `duelSummary`(lib/teamBuilderAnalysis.js), 화면 규칙 정본 = 시안 dev/duel-mock.html(docs/agents/features.md §10.10 「전력 비교 화면」).
 */
import { useState } from 'react';
import { UI_IMAGE_ICONS } from '../../data/uiIcons';
import { fmtFxValue } from '../../lib/teamBuilderAnalysis';
import { FxIcon, GiverFace, MiniHero } from './TeamBuilderParts';

/* ───────────── 맞대결 요약 (duelSummary) ───────────── */

/** 최종 합계 수치 — 「+38%」 · 「−20%」 · 「0%」 */
const duelFmt = (value) => {
  const n = Math.round(value);
  return n > 0 ? `+${n}%` : n < 0 ? `−${-n}%` : '0%';
};
/** 수치 부호 색 클래스 — + 파랑 · − 빨강 · 0 없음 */
const duelSign = (value) => (Math.round(value) > 0 ? 'is-plus' : Math.round(value) < 0 ? 'is-minus' : undefined);

/**
 * 접힌 줄 큰 숫자 — 0이 아닌 값 중 가장 많은 영웅이 받는 값(같으면 절댓값 큰 쪽). 전원이 그 값이면 `dots` 없음,
 * 아니면 영웅 점(full = 그 값 · part = 다른 양 · zero = 못 받음 — 로지 +26%를 2명만 → 「+26%」 ●●○○○, 밍봉 2026-11-11 회의).
 * `list` = 엔진 `heroes.ours | theirs`(영웅마다 { name, total, items })
 */
function duelHeadline(list) {
  const totals = list.map((h) => ({ name: h.name, v: Math.round(h.total) }));
  const count = new Map();
  for (const t of totals) if (t.v) count.set(t.v, (count.get(t.v) || 0) + 1);
  if (!count.size) return { value: 0, dots: null };
  const value = [...count.entries()].sort((a, b) => b[1] - a[1] || Math.abs(b[0]) - Math.abs(a[0]))[0][0];
  if (totals.every((t) => t.v === value)) return { value, dots: null };
  const kind = (t) => (t.v === value ? 'full' : t.v ? 'part' : 'zero');
  const order = { full: 0, part: 1, zero: 2 };
  return { value, dots: totals.map((t) => ({ ...t, kind: kind(t) })).sort((a, b) => order[a.kind] - order[b.kind]) };
}

function DuelDots({ dots }) {
  if (!dots) return null;
  return (
    <span className="tb-duel-dots" title={dots.map((d) => `${d.name} ${duelFmt(d.v)}`).join(' · ')}>
      {dots.map((d) => <i key={d.name} className={`tb-duel-dot is-${d.kind} ${duelSign(d.v) || 'is-zero'}`} />)}
    </span>
  );
}

/**
 * 한 팀 수치 — 아이콘 + 큰 숫자(`duelHeadline`) + 일부만 받으면 아래 영웅 점. 접힌 줄에는 「턴」 없음.
 * `none` = 그 공격 타입 영웅이 없음 → 「—」. 아이콘 = + 면 증가 · − 면 감소 아이콘(`icons`), 0이면 없음
 */
function DuelNum({ side, list, none, icons }) {
  const { value: v, dots } = none ? { value: 0, dots: null } : duelHeadline(list);
  const icon = none || !v ? null : v > 0 ? icons?.up : icons?.down;
  return (
    <span className={`tb-duel-val is-${side}${none ? '' : v > 0 ? ' is-plus' : v < 0 ? ' is-neg' : ''}`}>
      <span className="tb-duel-num" title={none ? '이 공격 타입 영웅이 없어요' : undefined}>
        <span className="tb-duel-num-icon">{icon ? <FxIcon name={icon} size={21} /> : null}</span>
        <b>{none ? '—' : duelFmt(v)}</b>
      </span>
      <DuelDots dots={dots} />
    </span>
  );
}

/** 효과 기준 묶기 — 같은 효과 · 수치 · 준 영웅 · 턴이면 한 줄, `got` = 받는 영웅 이름 */
function duelEffectLines(list) {
  const map = new Map();
  for (const h of list) {
    for (const it of h.items) {
      const key = `${it.label}|${Math.round(it.value)}|${it.giver}|${it.turns ?? ''}`;
      if (!map.has(key)) map.set(key, { ...it, key, got: new Set() });
      map.get(key).got.add(h.name);
    }
  }
  return [...map.values()];
}

/**
 * 줄 펼침 한 팀 칸 — **효과 기준**(밍봉 2026-11-11 회의 · 시안 `dev/duel-mock.html` 확정):
 * 효과 한 줄 [효과 아이콘 | 이름 | 수치 | 준 영웅 · 펫 ○ | N턴] + 아래 그 팀 영웅 얼굴(받은 영웅 밝게 · 못 받은 영웅 흐리게, 「전원」 표시 없음).
 * 받는 영웅 = 네모, 준 영웅 = 동그라미. 한 영웅이 효과 2개 이상이면 맨 아래 「영웅별 합계」. 상자는 팀 칸 하나뿐, 안은 구분선
 */
/**
 * 두 팀 칸 줄 맞추기 — 같은 효과 이름은 우리 · 상대 같은 높이 줄에(밍봉 2026-11-11). 우리 순서 먼저, 상대에만 있는 효과는 뒤에.
 * 같은 이름이 한쪽에 여러 줄이면 그 수만큼 칸, 없는 쪽은 빈 줄. `slots` = [{ label, i }]
 */
function duelSlots(linesBySide) {
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

/** 영웅별 합계를 보여 줄지 — 효과가 한 줄뿐이고 전원이 받으면 위 줄과 똑같아서 안 보임(밍봉 2026-11-11). 효과 2줄 이상 · 일부만 받음이면 보임 */
const duelShowTotals = (lines, list) => lines.length > 0 && !(lines.length === 1 && lines[0].got.size === list.length);

function DuelSide({ k, list, lines, slots, totalsRow, none, only, resolveHero }) {
  const byLabel = new Map();
  for (const e of lines) {
    if (!byLabel.has(e.label)) byLabel.set(e.label, []);
    byLabel.get(e.label).push(e);
  }
  /* 영웅별 합계 — `duelShowTotals`일 때(한 명만 받아도 보임). 묶음 = 같은 최종 수치(큰 값부터),
     효과를 하나도 못 받은 영웅은 맨 아래 'none' 줄(회색 얼굴 · 회색 0%) */
  const totals = new Map();
  if (!none && duelShowTotals(lines, list)) {
    for (const h of list) {
      const key = h.items.length ? Math.round(h.total) : 'none';
      if (!totals.has(key)) totals.set(key, new Set());
      totals.get(key).add(h.name);
    }
  }
  const totalKeys = [...totals.keys()].sort((a, b) => (a === 'none') - (b === 'none') || (a === 'none' ? 0 : b - a));
  /* 턴 칸은 그 팀 칸에 턴제 효과가 하나라도 있을 때만 자리 확보 — 줄마다 얼굴 · 턴 · 수치 세로 줄이 같은 자리 */
  const hasTurn = lines.some((e) => e.turns);
  return (
    <div className={`tb-duel-side is-${k}${hasTurn ? ' has-turn' : ''}`}>
      <span className="tb-duel-side-title">
        {k === 'ours' ? '우리' : '상대'}
        {only ? <em className="tb-duel-side-note">{only === 'physical' ? '물리 영웅만' : '마법 영웅만'}</em> : null}
      </span>
      {none || !lines.length ? (
        <p className="tb-duel-empty" style={{ gridRow: `span ${Math.max(1, slots.length) + (totalsRow ? 1 : 0)}` }}>{none ? '이 공격 타입 영웅 없음' : '받는 효과 없음'}</p>
      ) : (
        <ul className="tb-duel-fxs">
          {slots.map((slot) => {
            const e = byLabel.get(slot.label)?.[slot.i];
            if (!e) return <li key={`blank-${slot.label}-${slot.i}`} className="tb-duel-fx is-blank" aria-hidden="true" />;
            return (
            <li key={e.key} className={`tb-duel-fx ${e.value < 0 ? 'is-minus' : 'is-plus'}`}>
              <span className="tb-duel-fx-icon"><FxIcon name={e.label} size={22} /></span>
              <span className="tb-duel-fx-name">{e.label}</span>
              <b className="tb-duel-fx-val">{duelFmt(e.value)}</b>
              {e.giver ? (
                <span className="tb-duel-fx-giver" title={`${e.giver}이(가) 줌`}>
                  <GiverFace name={e.giver} resolveHero={resolveHero} size={22} />
                </span>
              ) : null}
              {e.turns ? <i className="tb-duel-turn" title="전투 시작 시 이 턴 동안만 — 턴이 지나면 빠져요">{e.turns}턴</i> : null}
              <span className="tb-duel-fx-recv">
                {list.map((h) => (
                  <span key={h.name} className={`tb-duel-fx-face${e.got.has(h.name) ? '' : ' is-off'}`} title={`${h.name} ${e.got.has(h.name) ? '받음' : '못 받음'}`}>
                    <MiniHero hero={resolveHero(h.name)} size={22} />
                  </span>
                ))}
              </span>
            </li>
            );
          })}
        </ul>
      )}
      {/* 영웅별 합계 = 이 줄의 최종 — 제목 옆에 합계 아이콘 하나, 제목 글씨 = 합계 수치 크기.
          묶음마다 [얼굴 … | 수치] — 얼굴은 위 효과 줄 얼굴과 같은 크기 · 같은 시작 위치에서 왼쪽부터 빈칸 없이 쌓음 */}
      {totalKeys.length ? (
        <div className="tb-duel-totals">
          <span className="tb-duel-totals-head">
            <img className="tb-duel-total-icon" src={UI_IMAGE_ICONS.tbDuelTotal.src} alt="" draggable={false} />
            영웅별 합계
          </span>
          {totalKeys.map((key) => {
            const names = totals.get(key);
            const isNone = key === 'none';
            return (
              <span key={key} className={`tb-duel-total ${isNone ? 'is-none is-zero' : duelSign(key) || 'is-zero'}`}>
                <span className="tb-duel-total-faces">
                  {list.filter((h) => names.has(h.name)).map((h) => (
                    <span key={h.name} className="tb-duel-total-face" title={isNone ? `${h.name} 받는 효과 없음` : h.name}>
                      <MiniHero hero={resolveHero(h.name)} size={22} />
                    </span>
                  ))}
                </span>
                <b className="tb-duel-total-val">{isNone ? '0%' : duelFmt(key)}</b>
              </span>
            );
          })}
        </div>
      ) : totalsRow && !none && lines.length ? <div className="tb-duel-totals is-blank" aria-hidden="true" /> : null}
    </div>
  );
}

/**
 * 최종 합계 한 줄 — [우리 수치 | 막대 · 능력치 | 상대 수치], 누르면 우리 | 상대 반반 효과 목록(`DuelSide`, 폰도 반반).
 * 색 = 수치 부호만(+ 파랑 · − 빨강), 우리 · 상대 구분은 판 배경(왼쪽 파랑 · 오른쪽 빨강 기운, 밍봉 2026-11-11).
 * 막대 = 그 팀 영웅들이 받은 양의 평균 %(판정값, 100% 넘으면 꽉), 0이면 없음. 가운데 「N% 차이」는 두 팀 다 전원 같은 양일 때만
 */
function DuelRow({ s, resolveHero, index }) {
  const [open, setOpen] = useState(false);
  const gap = Math.round(Math.abs(s.diff));
  const none = (k) => s.n?.[k] === 0;
  const bar = (k) => {
    const v = Math.round(s[k]);
    if (none(k) || !v) return null;
    return <i className={v > 0 ? 'is-plus' : 'is-minus'} style={{ width: `${Math.max(3, Math.min(100, Math.abs(v)))}%` }} />;
  };
  const list = (k) => s.heroes?.[k] || [];
  const uniform = (k) => none(k) || !duelHeadline(list(k)).dots;
  const val = (k) => <DuelNum side={k} list={list(k)} none={none(k)} icons={s.icons} />;
  /* 펼침 두 칸은 subgrid로 줄 높이를 공유 — [제목 | 효과 줄 … | 영웅별 합계] */
  const lines = { ours: none('ours') ? [] : duelEffectLines(list('ours')), theirs: none('theirs') ? [] : duelEffectLines(list('theirs')) };
  const slots = duelSlots([lines.ours, lines.theirs]);
  const totalsRow = duelShowTotals(lines.ours, list('ours')) || duelShowTotals(lines.theirs, list('theirs'));
  const sideRows = 1 + Math.max(1, slots.length) + (totalsRow ? 1 : 0);
  const side = (k) => <DuelSide k={k} list={list(k)} lines={lines[k]} slots={slots} totalsRow={totalsRow} none={none(k)} only={s.only} resolveHero={resolveHero} />;
  return (
    <li className={`tb-duel-row is-${s.lead}${open ? ' is-open' : ''}`} style={{ '--i': Math.min(index, 16) }}>
      <button type="button" className="tb-duel-line" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {val('ours')}
        <span className="tb-duel-track is-ours">{bar('ours')}</span>
        <span className="tb-duel-stat">
          <span className="tb-duel-stat-name">{s.label}</span>
          {uniform('ours') && uniform('theirs') ? <small>{`${gap}% 차이`}</small> : null}
        </span>
        <span className="tb-duel-track is-theirs">{bar('theirs')}</span>
        {val('theirs')}
      </button>
      {open ? (
        <div className="tb-duel-detail">
          {s.mirror ? (
            <div className="tb-duel-mirror">
              <MiniHero hero={resolveHero(s.mirror.name)} size={18} />
              {s.mirror.name}끼리 — 우리 <b className={duelSign(s.mirror.ours)}>{duelFmt(s.mirror.ours)}</b> · 상대 <b className={duelSign(s.mirror.theirs)}>{duelFmt(s.mirror.theirs)}</b>
            </div>
          ) : null}
          <div className="tb-duel-sides is-aligned" style={{ gridTemplateRows: `repeat(${sideRows}, auto)` }}>
            {side('ours')}
            {side('theirs')}
          </div>
        </div>
      ) : null}
    </li>
  );
}

/** 자기 자신만 받는 버프 — 우리 | 상대 두 칸, 영웅마다 얼굴 + 효과 칩(팀 줄에는 안 넣음) */
/** 전력 비교에서 뺀 「자기 자신만 받는 버프」 — 우리 | 상대 두 칸, 영웅마다 얼굴 + 효과 칩 */
function DuelSelfBuffs({ data, resolveHero }) {
  if (!data?.ours.length && !data?.theirs.length) return null;
  const side = (k) => (
    <div className={`tb-duel-self-side is-${k}`}>
      <span className="tb-duel-self-side-title">{k === 'ours' ? '우리' : '상대'}</span>
      {data[k].length ? data[k].map((r) => (
        <div key={r.hero} className="tb-duel-self-hero">
          <MiniHero hero={resolveHero(r.hero)} size={24} />
          <span className="tb-duel-self-name">{r.hero}</span>
          <span className="tb-duel-self-chips">
            {r.items.map((it) => (
              <span key={`${it.label}|${it.turns ?? ''}`} className="tb-duel-self-chip">
                <FxIcon name={it.label} size={14} />
                {it.label} <b>{fmtFxValue(it.value, it.label, it.dir)}</b>
                {it.turns ? <i className="tb-duel-turn">{it.turns}턴</i> : null}
              </span>
            ))}
          </span>
        </div>
      )) : <p className="tb-duel-none">없음</p>}
    </div>
  );
  return (
    <section className="tb-duel-self">
      <h4 className="tb-duel-self-title">자기 자신만 받는 버프</h4>
      <div className="tb-duel-sides">
        {side('ours')}
        {side('theirs')}
      </div>
    </section>
  );
}

/**
 * 전력 비교 = 「Σ 최종 합계」 판 하나(밍봉 2026-11-10 — 근거 목록은 없애고 줄 펼침으로): 우위 막대(`counts`) →
 * 차이 나는 능력치 줄(`DUEL_FINALS` 순서) → 맨 아래 「차이 없음」 한 줄 칩 → 자기 자신만 받는 버프.
 * `data` = duelSummary(패시브 + 펫, 게임 시작하자마자 양쪽 합산)
 */
export function DuelBoard({ data, resolveHero }) {
  const { finals = [], counts, selfBuffs } = data;
  if (!finals.length) {
    return (
      <>
        <div className="tb-empty">두 덱 모두 비교할 능력치 버프 · 디버프가 없어요.</div>
        <DuelSelfBuffs data={selfBuffs} resolveHero={resolveHero} />
      </>
    );
  }
  const rows = finals.filter((s) => s.lead !== 'even');
  const evens = finals.filter((s) => s.lead === 'even');
  const total = counts.ours + counts.theirs + counts.even || 1;
  return (
    <div className="tb-duel">
      <div className="tb-duel-score" aria-label={`우리 우위 ${counts.ours} · 비슷 ${counts.even} · 상대 우위 ${counts.theirs}`}>
        <span className="tb-duel-score-num is-ours"><b>{counts.ours}</b>우리 우위</span>
        <span className="tb-duel-score-bar" aria-hidden="true">
          <i className="is-ours" style={{ flexGrow: counts.ours / total }} />
          {counts.even ? <i className="is-even" style={{ flexGrow: counts.even / total }} /> : null}
          <i className="is-theirs" style={{ flexGrow: counts.theirs / total }} />
        </span>
        <span className="tb-duel-score-num is-theirs">상대 우위<b>{counts.theirs}</b></span>
      </div>
      <section className="tb-duel-final">
        <h4 className="tb-duel-final-head">
          <span className="tb-duel-final-side is-ours">우리</span>
          <span className="tb-duel-final-title">
            <img src={UI_IMAGE_ICONS.tbTotals.src} alt="" draggable={false} />
            최종 합계
          </span>
          <span className="tb-duel-final-side is-theirs">상대</span>
        </h4>
        {rows.length ? (
          <ul className="tb-duel-rows">
            {rows.map((s, i) => <DuelRow key={s.id} s={s} resolveHero={resolveHero} index={i} />)}
          </ul>
        ) : <p className="tb-duel-none">모든 능력치가 비슷해요.</p>}
        {evens.length ? (
          <div className="tb-duel-even">
            <p className="tb-duel-even-head">
              <b>두 팀 같음</b>
              <span>두 팀이 같은 수치로 받는 효과</span>
            </p>
            <ul className="tb-duel-even-list">
              {evens.map((s) => {
                /* 같음 = 두 팀 묶음 값이 같음 — 접힌 줄과 같은 큰 숫자 + 일부만 받으면 영웅 점 */
                const { value: top, dots } = duelHeadline(s.heroes?.ours || []);
                return (
                  <li key={s.id} className="tb-duel-even-chip">
                    <FxIcon name={top < 0 ? s.icons?.down : s.icons?.up} size={16} />
                    <span className="tb-duel-even-name">{s.label}</span>
                    <span className="tb-duel-even-val">
                      <b className={duelSign(top)}>{duelFmt(top)}</b>
                      <DuelDots dots={dots} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </section>
      <DuelSelfBuffs data={selfBuffs} resolveHero={resolveHero} />
    </div>
  );
}
