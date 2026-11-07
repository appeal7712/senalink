import { useMemo } from 'react';
import { heroes } from '../data/heroes';
import { accessories } from '../data/equipments';
import { SIGNATURE_TIPS } from '../data/teamBuilderTips';
import { LEGEND_RINGS, buildRareEffectSet, fmtFxValue, heroSummary } from '../lib/teamBuilderAnalysis';
import '../styles/heroEffectSummary.css';

let rareCache = null;
const rareSet = () => {
  if (!rareCache) rareCache = buildRareEffectSet(heroes);
  return rareCache;
};
const RING_ICON = new Map(accessories.map((a) => [a.shortLabel, a.iconUrl]));
const DIR_MARK = { up: '▲', down: '▼' };

function FxRow({ fx, side }) {
  return (
    <li className={`hes-row is-${side}`}>
      <span className={`hes-dir is-${fx.dir || 'none'}`} aria-hidden="true">{DIR_MARK[fx.dir] || '◆'}</span>
      <span className="hes-name">{fx.label}</span>
      {fx.value != null ? <span className="hes-val">{fmtFxValue(fx.value, fx.label, fx.dir)}</span> : null}
      {fx.timing === 'start'
        ? <span className="hes-when is-start" title="전투 시작 시 적용 — [상시]와 중첩">시작 {fx.turns}턴</span>
        : <span className="hes-when">상시</span>}
      {fx.skillLabel === '각성기' ? <span className="hes-tag">각성 중</span> : null}
      <span className="hes-scope">{fx.scope}</span>
    </li>
  );
}

/** 스킬 · 발동 효과 — 팀 빌더 「스킬 · 발동」 탭과 같은 규칙: 스킬 하나에 상자 하나, 대상이 줄마다 다르면 줄에 대상 */
function groupBySkill(list) {
  const map = new Map();
  for (const fx of list) {
    if (!map.has(fx.skillName)) map.set(fx.skillName, { id: fx.skillName, tag: fx.skillTag || fx.skillLabel, items: [] });
    map.get(fx.skillName).items.push(fx);
  }
  return [...map.values()];
}

function SkillBoxes({ groups, side }) {
  return (
    <div className="hes-sk-list">
      {groups.map((g) => {
        const scopes = [...new Set(g.items.map((fx) => fx.scope))];
        const oneScope = scopes.length === 1 ? scopes[0] : null;
        return (
          <div key={g.id} className={`hes-sk is-${side}`}>
            <div className="hes-sk-head">
              <span className="hes-skill">{g.tag}</span>
              {oneScope ? <span className="hes-sk-to">→ {oneScope}</span> : null}
            </div>
            <ul className="hes-list">
              {g.items.map((fx) => (
                <li key={fx.id} className={`hes-row is-${side}`}>
                  <span className={`hes-dir is-${fx.dir || 'none'}`} aria-hidden="true">{DIR_MARK[fx.dir] || '◆'}</span>
                  <span className="hes-name">{fx.label}</span>
                  {fx.value != null ? <span className="hes-val">{fmtFxValue(fx.value, fx.label, fx.dir)}</span> : null}
                  {fx.amountText ? <span className="hes-amt">{fx.amountText}</span> : null}
                  {fx.chance ? <span className="hes-amt">{fx.chance}% 확률</span> : null}
                  {fx.duration ? <span className="hes-when is-start">{fx.duration}</span> : null}
                  {fx.stack ? <span className="hes-stack">{fx.stack}</span> : null}
                  {oneScope ? null : <span className="hes-scope">{fx.scope}</span>}
                  {fx.condition ? <small className="hes-cond-line">{fx.condition}</small> : null}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
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
  const skillBuffs = groupBySkill(s.skillFx.filter((fx) => fx.side === 'ally'));
  const skillDebuffs = groupBySkill(s.skillFx.filter((fx) => fx.side === 'enemy'));

  return (
    <div className="hes">
      <Section title="팀에 주는 버프 · 패시브" tone="ally" count={s.buffs.length}>
        {s.buffs.length
          ? <ul className="hes-list">{s.buffs.map((fx) => <FxRow key={fx.id} fx={fx} side="ally" />)}</ul>
          : <p className="hes-empty">팀에 주는 패시브 버프가 없어요.</p>}
      </Section>

      <Section title="적에게 거는 디버프 · 패시브" tone="enemy" count={s.debuffs.length}>
        {s.debuffs.length
          ? <ul className="hes-list">{s.debuffs.map((fx) => <FxRow key={fx.id} fx={fx} side="enemy" />)}</ul>
          : <p className="hes-empty">적에게 거는 패시브 디버프가 없어요.</p>}
      </Section>

      {skillBuffs.length ? (
        <Section title="스킬 · 발동으로 거는 버프" tone="skill" count={skillBuffs.length}>
          <SkillBoxes groups={skillBuffs} side="ally" />
        </Section>
      ) : null}

      {skillDebuffs.length ? (
        <Section title="스킬 · 발동으로 거는 디버프" tone="skill" count={skillDebuffs.length}>
          <SkillBoxes groups={skillDebuffs} side="enemy" />
        </Section>
      ) : null}

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

      {s.selfBuffs.length ? (
        <Section title="자기 자신만 받는 버프 · 패시브" tone="self">
          <div className="hes-chips">
            {s.selfBuffs.map((fx) => (
              <span key={fx.id} className="hes-chip">
                {fx.label}{fx.value != null ? ` ${fmtFxValue(fx.value, fx.label, fx.dir)}` : ''}
                {fx.timing === 'start' ? <em>시작 {fx.turns}턴</em> : null}
              </span>
            ))}
          </div>
        </Section>
      ) : null}

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

      <div className="hes-split">
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
        <Section title="편성 조건" tone="cond">
          {s.conditions.length
            ? s.conditions.map((c) => <p key={c.label} className="hes-cond"><b>{c.label}</b> → {c.effectText || c.effects.join(' · ')}</p>)
            : <p className="hes-empty">편성 조건 없음</p>}
        </Section>
      </div>

      {tips.length ? (
        <Section title="핵심 기믹" tone="purple">
          {tips.map(([n, t]) => <p key={n} className="hes-tip"><b>{n}</b> {t}</p>)}
        </Section>
      ) : null}
    </div>
  );
}
