import { FormationPlateIcon } from './icons/GameIconPlate';
import { FORMATION_ICON_SIZE } from '../data/uiIcons';

// 인게임 진형 아이콘 (게임 원본 PNG)
export const renderFormationCircleIcon = (fId, size = FORMATION_ICON_SIZE) => (
  <FormationPlateIcon formationId={fId} size={size} />
);

/**
 * 진형 배치(5칸) — 덱 카드 · 세팅 확인 공용. slot(hero, idx)가 칸 하나를 그림.
 * fid: protect(뒤1 · 앞4) · attack(뒤4 · 앞1) · basic(뒤3 · 앞2) · 그 외 balance(뒤2 · 앞3)
 */
export function renderDeckFormationLayout(slot, fid, list) {
  // 항상 5칸 공식 진형 레이아웃 (빈 슬롯은 공란으로 표시)
  // 스테이지 크기는 CSS 고정 — 진형별 높이 변화 없음, 짧은 열은 세로 중앙
    if (fid === 'protect') {
    const backHero = list[0];
    const frontHeroes = list.slice(1, 5);
    return (
      <div className="deck-stage-rows">
        <div className="deck-stage-col">
          {slot(backHero, 0)}
        </div>
        <div className="deck-stage-col">
          {frontHeroes.map((h, i) => slot(h, i + 1))}
        </div>
      </div>
    );
  }
  if (fid === 'attack') {
    const backHeroes = list.slice(0, 4);
    const frontHero = list[4];
    return (
      <div className="deck-stage-rows">
        <div className="deck-stage-col">
          {backHeroes.map((h, i) => slot(h, i))}
        </div>
        <div className="deck-stage-col">
          {slot(frontHero, 4)}
        </div>
      </div>
    );
  }
  if (fid === 'basic') {
    const backHeroes = list.slice(0, 3);
    const frontHeroes = list.slice(3, 5);
    return (
      <div className="deck-stage-rows">
        <div className="deck-stage-col">
          {backHeroes.map((h, i) => slot(h, i))}
        </div>
        <div className="deck-stage-col">
          {frontHeroes.map((h, i) => slot(h, i + 3))}
        </div>
      </div>
    );
  }
  const backHeroes = list.slice(0, 2);
  const frontHeroes = list.slice(2, 5);
  return (
    <div className="deck-stage-rows">
      <div className="deck-stage-col">
        {backHeroes.map((h, i) => slot(h, i))}
      </div>
      <div className="deck-stage-col">
        {frontHeroes.map((h, i) => slot(h, i + 2))}
      </div>
    </div>
  );
}
