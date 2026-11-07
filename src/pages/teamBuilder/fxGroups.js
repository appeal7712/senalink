/** 효과 목록 상자 묶기 — 패시브(`EffectList`) · 스킬 · 발동(`SkillEffectList`) 공용. 칸 숫자도 여기서 센다. */

/** 패시브 카드 → 같은 영웅 · 같은 대상 흐름끼리 한 상자 (겹침 · 낭비 · 참고 문구가 있으면 혼자) */
export function groupEffectCards(cards) {
  const rows = [];
  const byFlow = new Map();
  for (const c of cards) {
    const applied = c.sources.filter((s) => s.applied);
    const solo = c.overlap || c.wasted || c.note || c.selfClash || applied.length !== 1;
    const s = applied[0];
    const fk = solo ? null : `${s.heroName}|${s.scope}|${s.skillLabel === '각성기'}|${(s.recipients || []).join(',')}`;
    if (fk && byFlow.has(fk)) {
      byFlow.get(fk).cards.push(c);
      continue;
    }
    const row = { id: c.id, applied, cards: [c] };
    if (fk) byFlow.set(fk, row);
    rows.push(row);
  }
  return rows;
}

/** 스킬 · 발동 카드 → 영웅 · 스킬 단위 상자 */
export function groupSkillCards(cards) {
  const map = new Map();
  for (const c of cards) {
    const s = c.sources[0];
    const k = `${s.heroName}|${s.skillName}`;
    if (!map.has(k)) map.set(k, { id: k, heroName: s.heroName, tag: s.skillTag, cards: [] });
    map.get(k).cards.push(c);
  }
  return [...map.values()];
}

/** 칸 숫자 = 화면에 보이는 상자 수 */
export function fxBoxCount(cards, kind) {
  return kind === 'skill' ? groupSkillCards(cards).length : groupEffectCards(cards).length;
}
