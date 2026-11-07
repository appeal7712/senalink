import { useLayoutEffect, useMemo, useRef } from 'react';
import { heroes } from '../data/heroes';
import { accessories } from '../data/equipments';
import { SIGNATURE_TIPS } from '../data/teamBuilderTips';
import { LEGEND_RINGS, buildRareEffectSet, fmtFxValue, heroSummary } from '../lib/teamBuilderAnalysis';
import { skillIconUrl } from '../lib/skillIcon';
import SafeImg from './icons/SafeImg';
import '../styles/heroEffectSummary.css';

let rareCache = null;
const rareSet = () => {
  if (!rareCache) rareCache = buildRareEffectSet(heroes);
  return rareCache;
};
const RING_ICON = new Map(accessories.map((a) => [a.shortLabel, a.iconUrl]));
const DIR_MARK = { up: '▲', down: '▼' };

/** 줄 부가 정보 — 확률 · 수량 · 전투 시작 · 중첩(+ 버프는 지속 턴)을 회색 글자로 (뱃지는 수치 하나만) */
function fxMeta(fx, withDuration) {
  const passive = fx.kind === 'passive';
  return [
    fx.amountText,
    fx.chance ? `${fx.chance}% 확률` : null,
    passive && fx.timing === 'start' ? `전투 시작 ${fx.turns}턴` : null,
    withDuration && !passive ? fx.duration : null,
    fx.stack,
  ].filter(Boolean).join(' · ');
}

/**
 * 효과 블록 — 스킬 하나에 블록 하나(왼쪽 스킬 아이콘 + 꼬리표). 줄은 이름 · 수치 · 부가 정보 세 칸 정렬, 조건은 아래 노란 줄.
 * 대상: 버프는 팀 전체가 아닐 때만, 디버프는 항상 — 블록 안 줄이 모두 같으면 블록 위에 한 번만.
 * 디버프 지속 턴은 빨간 테 뱃지(수치 뱃지 보라와 구분).
 */
function SkillBlock({ block, tone, iconOf }) {
  const enemy = tone === 'enemy';
  const showScope = (fx) => enemy || (tone === 'team' && fx.scopeKind !== 'all');
  const scopes = [...new Set(block.rows.map((fx) => (showScope(fx) ? fx.scope : '')))];
  const blockScope = scopes.length === 1 && scopes[0] ? scopes[0] : null;
  return (
    <div className={`hes-skb is-${enemy ? 'enemy' : 'ally'}`}>
      <div className="hes-skb-id" title={block.name}>
        <SafeImg src={iconOf(block)} alt={block.name} fallbackIcon="swords" loading="lazy" />
        <span>{block.tag}</span>
      </div>
      <div className="hes-skb-rows">
        {blockScope ? <span className="hes-skb-to">→ {blockScope}</span> : null}
        {block.rows.map((fx) => {
          const meta = fxMeta(fx, !enemy);
          return (
            <div key={`${fx.kind}|${fx.id}`} className="hes-skr">
              <span className="hes-skr-key"><span className="hes-skr-name">{fx.label}</span></span>
              {fx.value != null ? <span className="hes-val">{fmtFxValue(fx.value, fx.label, fx.dir)}</span> : null}
              <span className="hes-skr-meta">
                {enemy && fx.kind !== 'passive' && fx.duration ? <span className="hes-skr-turn">{fx.duration}</span> : null}
                {meta ? <span>{meta}</span> : null}
                {!blockScope && showScope(fx) ? <em>→ {fx.scope}</em> : null}
              </span>
              {fx.condition ? <span className="hes-skr-cond">{fx.condition}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const srcTag = (fx) => (fx.kind === 'passive' ? fx.skillLabel || '패시브' : fx.skillTag || fx.skillLabel);
const SRC_ORDER = ['기본 공격', '스킬1', '스킬2', '패시브', '각성기'];
const srcRank = (fx) => {
  const i = SRC_ORDER.indexOf(fx.skillLabel);
  return i === -1 ? SRC_ORDER.length : i;
};
const bySource = (rows) => rows.map((fx, i) => [fx, i]).sort(([a, i], [b, j]) => srcRank(a) - srcRank(b) || i - j).map(([fx]) => fx);

function toBlocks(rows) {
  const map = new Map();
  for (const fx of rows) {
    const id = fx.skillName || srcTag(fx);
    if (!map.has(id)) map.set(id, { id, name: fx.skillName || srcTag(fx), label: fx.skillLabel, tag: srcTag(fx), rows: [] });
    map.get(id).rows.push(fx);
  }
  return [...map.values()];
}

/** 이름 칸 너비 = 묶음 안에서 가장 긴 효과 이름 (팀 빌더 목록 useAlignedNames와 같은 방식) */
function useAlignedNames(ref) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let alive = true;
    const measure = () => {
      if (!alive) return;
      el.style.removeProperty('--hes-name');
      let max = 0;
      el.querySelectorAll('.hes-skr-name').forEach((n) => { max = Math.max(max, n.getBoundingClientRect().width); });
      if (max) el.style.setProperty('--hes-name', `${Math.ceil(max)}px`);
    };
    measure();
    document.fonts?.ready?.then(measure);
    return () => { alive = false; };
  });
}

/** 받는 대상 묶음(팀에게 · 자신에게만 · 적에게) → 패시브 / 스킬 · 발동 → 스킬 블록 */
function FxGroup({ title, tone, rows, empty, iconOf }) {
  const ref = useRef(null);
  useAlignedNames(ref);
  const parts = [
    { id: 'passive', label: '패시브', hint: '상시 · 전투 시작', list: rows.filter((fx) => fx.kind === 'passive') },
    { id: 'skill', label: '액티브 · 발동', hint: '스킬 사용 · 조건 충족 시', list: rows.filter((fx) => fx.kind !== 'passive') },
  ].filter((p) => p.list.length);
  return (
    <div ref={ref} className={`hes-tg is-${tone}`}>
      <h5>{title}<b>{rows.length}</b></h5>
      {parts.map((p) => (
        <div key={p.id} className={`hes-tg-part is-${p.id}`}>
          <p className="hes-tg-sub">{p.label}<em>{p.hint}</em></p>
          {toBlocks(p.list).map((b) => <SkillBlock key={b.id} block={b} tone={tone} iconOf={iconOf} />)}
        </div>
      ))}
      {rows.length ? null : <p className="hes-empty">{empty}</p>}
    </div>
  );
}

function Section({ title, tone, count, children }) {
  return (
    <section className={`hes-sec is-${tone}`}>
      <h4>
        {title}
        {count != null ? <b>{count}</b> : null}
      </h4>
      {children}
    </section>
  );
}

/** 영웅 한 명의 패시브 효과 · 역할 · 전설 장신구 · 편성 조건 요약 (스킬 강화 · 초월 기준) */
export default function HeroEffectSummary({ hero }) {
  const s = useMemo(() => heroSummary(hero, { rareSet: rareSet() }), [hero]);
  if (!s) return null;
  const tips = s.effectNames.map((n) => [n, SIGNATURE_TIPS[n]?.ally]).filter(([, t]) => t);
  const blockedRings = LEGEND_RINGS.filter((k) => s.rings[k]);
  const iconOf = (b) => skillIconUrl(hero, b.name, b.label);
  const skillRows = s.skillFx.map((fx) => ({ ...fx, kind: 'skill' }));
  const allySkill = skillRows.filter((fx) => fx.side === 'ally');
  const teamRows = bySource([...s.buffs.map((fx) => ({ ...fx, kind: 'passive' })), ...allySkill.filter((fx) => fx.scopeKind !== 'self')]);
  const selfRows = bySource([...s.selfBuffs.map((fx) => ({ ...fx, kind: 'passive' })), ...allySkill.filter((fx) => fx.scopeKind === 'self')]);
  const enemyRows = bySource([...s.debuffs.map((fx) => ({ ...fx, kind: 'passive' })), ...skillRows.filter((fx) => fx.side === 'enemy')]);

  return (
    <div className="hes">
      <Section title="역할" tone="role" count={s.roles.length}>
        {s.roles.length ? (
          <div className="hes-chips">
            {s.roles.map((r) => (
              <span key={r.id} className={`hes-chip is-role is-${r.side}`} title={r.hint}>
                ✓ {r.label}<em>{r.skills.join(' · ')}</em>
              </span>
            ))}
          </div>
        ) : <p className="hes-empty">역할 체크 12종에 해당하는 효과가 없어요.</p>}
      </Section>

      <Section title="편성 조건" tone="cond">
        {s.conditions.length
          ? s.conditions.map((c) => <p key={c.label} className="hes-cond"><b>{c.label}</b> → {c.effectText || c.effects.join(' · ')}</p>)
          : <p className="hes-empty">편성 조건 없음</p>}
      </Section>

      {tips.length ? (
        <Section title="핵심 기믹" tone="purple">
          {tips.map(([n, t]) => <p key={n} className="hes-tip"><b>{n}</b> {t}</p>)}
        </Section>
      ) : null}

      <Section title="버프" tone="ally">
        <FxGroup title="팀에게 주는 버프" tone="team" rows={teamRows} empty="팀에게 주는 버프가 없어요." iconOf={iconOf} />
        {selfRows.length ? <FxGroup title="자신에게만 주는 버프" tone="self" rows={selfRows} iconOf={iconOf} /> : null}
      </Section>

      <Section title="디버프" tone="enemy">
        <FxGroup title="적에게 거는 디버프" tone="enemy" rows={enemyRows} empty="적에게 거는 디버프가 없어요." iconOf={iconOf} />
      </Section>

      {s.tower.length ? (
        <Section title="탑 전용 (무한의 탑 · 시련의 탑)" tone="tower" count={s.tower.length}>
          <ul className="hes-list">
            {s.tower.map((fx) => (
              <li key={fx.id} className={`hes-row is-${fx.side}`}>
                <span className="hes-skill">{fx.skillLabel}</span>
                <span className={`hes-dir is-${fx.dir || 'none'}`} aria-hidden="true">{DIR_MARK[fx.dir] || '◆'}</span>
                <span className="hes-name">{fx.label}</span>
                {fx.value != null ? <span className="hes-val">{fmtFxValue(fx.value, fx.label, fx.dir)}</span> : null}
                {fx.timing === 'perm' ? <span className="hes-when">상시</span> : fx.turns ? <span className="hes-when is-start">{fx.turns}턴</span> : null}
                <span className="hes-scope">{fx.scope}</span>
              </li>
            ))}
          </ul>
          <p className="hes-note">결투장 · 길드전에서는 적용되지 않아 팀 빌더 분석에는 넣지 않아요.</p>
        </Section>
      ) : null}

      <Section title="전설 장신구" tone="ring">
        <div className="hes-rings">
          {LEGEND_RINGS.map((k) => (
            <span key={k} className={`hes-ring${s.rings[k] ? ' is-blocked' : ''}`} title={s.rings[k] ? `${k}의 반지 — 패시브에 ${k}${s.rings[k].source ? `(${s.rings[k].source})` : ''}이 있어 효과 없음` : `${k}의 반지 — 효과 있음`}>
              <img src={RING_ICON.get(k)} alt="" loading="lazy" />
              {s.rings[k] ? <i aria-hidden="true">✕</i> : null}
              <em>{k}</em>
            </span>
          ))}
        </div>
        <p className="hes-note">{blockedRings.length ? `${blockedRings.join(' · ')} 반지는 패시브와 겹쳐 효과 없음` : '어떤 전설 반지든 효과를 받아요'}</p>
      </Section>
    </div>
  );
}
