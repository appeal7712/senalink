/**
 * 효과 줄의 스킬 아이콘 — 스킬 이름이 맞으면 그 스킬, 없으면 꼬리표(기본 공격 · 스킬1 · 스킬2 · 패시브 · 각성기)로 찾음.
 * 팀 빌더 목록 · 도감 효과 요약 공용.
 */
export function skillIconUrl(hero, skillName, skillLabel) {
  const skills = hero?.skills || [];
  const byName = skillName ? skills.find((sk) => sk.name === skillName) : null;
  if (byName?.iconUrl) return byName.iconUrl;
  return skills.find((sk) => (
    (skillLabel === '기본 공격' && sk.type === 'basic_attack')
    || (skillLabel === '패시브' && sk.type === 'passive')
    || (skillLabel === '각성기' && sk.type === 'awaken_skill')
    || (skillLabel === '스킬1' && sk.direction === 'upper')
    || (skillLabel === '스킬2' && sk.direction === 'down')
  ))?.iconUrl || null;
}
