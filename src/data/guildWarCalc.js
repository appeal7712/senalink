export const TOTAL_ATTACKS = 150;

export const ZONE_RULES = {
  outer: { key: 'outer', name: '외성', total: 50, point: 20, unlockNeeded: 30 },
  inner: { key: 'inner', name: '내성', total: 45, point: 35, unlockNeeded: 30 },
  main: { key: 'main', name: '본성', total: 20, point: 50 },
};

export const DEFAULT_REMAINING = { outer: 50, inner: 45, main: 20 };

export const ZONE_KEYS = ['outer', 'inner', 'main'];

export function clampInt(value, min, max) {
  const num = Number(value);
  if (Number.isNaN(num)) return min;
  return Math.min(max, Math.max(min, Math.floor(num)));
}

/** 원본: lonolb/guild-war-calculator — 남은 공격으로 최대로 긁을 수 있는 점수 */
export function calculateMaxGain(remainingTargets, remainingAttacks) {
  const remaining = { ...remainingTargets };
  const success = {
    outer: ZONE_RULES.outer.total - remaining.outer,
    inner: ZONE_RULES.inner.total - remaining.inner,
    main: ZONE_RULES.main.total - remaining.main,
  };

  let attacksLeft = remainingAttacks;
  let total = 0;
  const usedCount = { main: 0, inner: 0, outer: 0 };

  const spend = (zoneKey, wantedCount) => {
    const rule = ZONE_RULES[zoneKey];
    const used = Math.min(attacksLeft, remaining[zoneKey], wantedCount);
    if (used <= 0) return 0;
    attacksLeft -= used;
    remaining[zoneKey] -= used;
    success[zoneKey] += used;
    usedCount[zoneKey] += used;
    total += used * rule.point;
    return used;
  };

  const needOuterForInner = Math.max(0, ZONE_RULES.outer.unlockNeeded - success.outer);
  if (needOuterForInner > 0) spend('outer', needOuterForInner);

  const innerAccessible = success.outer >= ZONE_RULES.outer.unlockNeeded;
  if (!innerAccessible) {
    spend('outer', Infinity);
    return { total, usedCount, unusedAttacks: attacksLeft };
  }

  const needInnerForMain = Math.max(0, ZONE_RULES.inner.unlockNeeded - success.inner);
  if (needInnerForMain > 0) spend('inner', needInnerForMain);

  const mainAccessible = success.inner >= ZONE_RULES.inner.unlockNeeded;
  if (mainAccessible) {
    spend('main', Infinity);
    spend('inner', Infinity);
    spend('outer', Infinity);
  } else {
    spend('inner', Infinity);
    spend('outer', Infinity);
  }

  return { total, usedCount, unusedAttacks: attacksLeft };
}

export function formulaText(gain) {
  const fmt = (n) => Number(n).toLocaleString('ko-KR');
  return `본성 × ${gain.usedCount.main} + 내성 × ${gain.usedCount.inner} + 외성 × ${gain.usedCount.outer} = ${fmt(gain.total)}점`;
}

export function evaluateGuildWar({ ourScore, enemyScore, ourAttacks, enemyAttacks, ourRemaining, enemyRemaining }) {
  const ourGain = calculateMaxGain(ourRemaining, ourAttacks);
  const enemyGain = calculateMaxGain(enemyRemaining, enemyAttacks);
  const ourMaxFinal = ourScore + ourGain.total;
  const enemyMaxFinal = enemyScore + enemyGain.total;
  const currentNeedForLock = Math.max(0, enemyMaxFinal + 1 - ourScore);
  const currentLocked = ourScore > enemyMaxFinal;
  const possibleWithRemaining = ourMaxFinal > enemyMaxFinal;
  const maxFinalGap = ourMaxFinal - enemyMaxFinal;
  const currentGap = ourScore - enemyScore;
  const defeatLocked = ourMaxFinal < enemyScore;
  const drawLocked = ourMaxFinal === enemyMaxFinal;

  let verdict = 'unlocked';
  let title = '확정불가';
  let desc = `현재는 승패가 확정되지 않았습니다. 우리 최대 최종점수는 ${ourMaxFinal.toLocaleString('ko-KR')}점, 상대 최대 최종점수는 ${enemyMaxFinal.toLocaleString('ko-KR')}점 입니다.`;

  if (currentLocked) {
    verdict = 'locked';
    title = '승리확정';
    desc = `상대가 남은 공격을 최대로 사용해도 최종 점수는 ${enemyMaxFinal.toLocaleString('ko-KR')}점 입니다. 현재 우리 점수가 이미 더 높습니다.`;
  } else if (defeatLocked) {
    verdict = 'bad';
    title = '패배확정';
    desc = `우리 남은 공격을 최대로 사용해도 ${ourMaxFinal.toLocaleString('ko-KR')}점 입니다. 상대 현재 점수 ${enemyScore.toLocaleString('ko-KR')}점 을 넘길 수 없으므로 패배확정입니다.`;
  } else if (drawLocked) {
    verdict = 'unlocked';
    title = '무승부';
    desc = `우리와 상대의 최대 최종점수가 모두 ${ourMaxFinal.toLocaleString('ko-KR')}점 으로 같습니다. 점수가 같으므로 무승부입니다.`;
  }

  return {
    ourGain,
    enemyGain,
    ourMaxFinal,
    enemyMaxFinal,
    currentNeedForLock,
    currentLocked,
    possibleWithRemaining,
    maxFinalGap,
    currentGap,
    defeatLocked,
    drawLocked,
    verdict,
    title,
    desc,
  };
}
