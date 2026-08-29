import { useEffect } from 'react';

/**
 * 덱 수정 모달 — PC 본문 통스크롤 레이아웃
 * 스타일: src/styles/deckEditScrollModal.css (PC min-width 981px only)
 *
 * kind 'arena' — 결투장·상급결투장 (2열 + 영웅)
 * kind 'pve'   — 길드 허브 공성전·강림원정대 (3열 + 타임라인 + 영웅)
 */

/** 내부 스크롤 허용 — 영웅 목록 + 스킬 순서 리스트(고정 높이) */
const DECK_EDIT_INTERNAL_SCROLL_SELECTORS = [
  '.arena-hero-grid',
  '.pve-hero-grid',
  '.hero-grid-picker-grid',
  '.skill-timeline-scroller',
];

function elementMatchesSelector(el, selector) {
  return el?.matches?.(selector) ?? false;
}

function findInternalScrollSurface(target, root, selectors) {
  let node = target;
  while (node && node !== root) {
    for (const selector of selectors) {
      if (elementMatchesSelector(node, selector)) return node;
      const closest = node.closest?.(selector);
      if (closest && root.contains(closest)) return closest;
    }
    node = node.parentElement;
  }
  return null;
}

function canElementScrollY(el, deltaY) {
  if (!el) return false;
  const { overflowY } = getComputedStyle(el);
  if (overflowY !== 'auto' && overflowY !== 'scroll' && overflowY !== 'overlay') return false;
  if (el.scrollHeight <= el.clientHeight + 1) return false;
  if (deltaY > 0) return el.scrollTop + el.clientHeight < el.scrollHeight - 1;
  if (deltaY < 0) return el.scrollTop > 0;
  return false;
}

function resolveDeckEditScrollContainer(body, modal) {
  if (
    body
    && getComputedStyle(body).overflowY !== 'hidden'
    && body.scrollHeight > body.clientHeight + 1
  ) {
    return body;
  }
  if (
    modal
    && getComputedStyle(modal).overflowY !== 'hidden'
    && modal.scrollHeight > modal.clientHeight + 1
  ) {
    return modal;
  }
  return null;
}

/** capture 단계 — overflow:hidden 위에서도 본문(또는 모바일 모달) 스크롤로 전달 */
export function bindDeckEditModalWheelScroll(modal, scrollBody) {
  if (!modal) return () => {};

  const onWheel = (e) => {
    const container = resolveDeckEditScrollContainer(scrollBody, modal);
    if (!container) return;

    const internal = findInternalScrollSurface(
      e.target,
      modal,
      DECK_EDIT_INTERNAL_SCROLL_SELECTORS,
    );
    if (internal && canElementScrollY(internal, e.deltaY)) return;

    container.scrollTop += e.deltaY;
    e.preventDefault();
  };

  modal.addEventListener('wheel', onWheel, { passive: false, capture: true });
  return () => modal.removeEventListener('wheel', onWheel, { capture: true });
}

export function useDeckEditScrollWheelForward(scrollBodyRef, active) {
  useEffect(() => {
    if (!active) return undefined;
    const body = scrollBodyRef.current;
    if (!body) return undefined;
    const modal = body.closest('.editing-build-modal');
    if (!modal) return undefined;
    return bindDeckEditModalWheelScroll(modal, body);
  }, [scrollBodyRef, active]);
}

export const DECK_EDIT_SCROLL = {
  arenaModal: 'arena-body-scroll-modal',
  pveModal: 'pve-body-scroll-modal',
  scrollBody: 'deck-edit-scroll-body',
  arenaHeroGrid: 'arena-hero-grid',
  pveHeroGrid: 'pve-hero-grid',
};

/** @returns {'arena'|'pve'|null} */
export function getDeckEditScrollKind(category) {
  if (category === 'arena') return 'arena';
  if (category === 'siege' || category === 'expedition') return 'pve';
  return null;
}

/** CommunityGuideEditor — 결투장·상급결투장 */
export function getDeckEditScrollKindFromArenaFlag(isArena) {
  return isArena ? 'arena' : null;
}

export function deckEditScrollModalClassSuffix(kind) {
  if (kind === 'arena') return ` ${DECK_EDIT_SCROLL.arenaModal}`;
  if (kind === 'pve') return ` ${DECK_EDIT_SCROLL.pveModal}`;
  return '';
}

export function deckEditScrollBodyWrapperProps(kind) {
  if (kind) {
    return { className: DECK_EDIT_SCROLL.scrollBody };
  }
  return { style: { display: 'contents' } };
}

export function deckEditScrollGridBodyStyle(kind) {
  const shared = { gap: '20px', alignItems: 'stretch', boxSizing: 'border-box' };
  if (kind) return shared;
  return {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    padding: '16px 20px',
    ...shared,
  };
}

export function deckEditScrollHeroGridClass(kind) {
  if (kind === 'arena') {
    return `editing-build-hero-grid ${DECK_EDIT_SCROLL.arenaHeroGrid}`;
  }
  if (kind === 'pve') {
    return `editing-build-hero-grid ${DECK_EDIT_SCROLL.pveHeroGrid}`;
  }
  return 'editing-build-hero-grid';
}

/** 길드 인라인 영웅 그리드 경로 */
export function deckEditScrollHeroGridStyle(kind) {
  const grid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(62px, 1fr))',
    gap: '6px',
    overflowY: 'auto',
    paddingRight: '4px',
  };
  if (kind === 'arena' || kind === 'pve') {
    return grid;
  }
  return { minHeight: '168px', ...grid };
}

export function deckEditScrollUsesHeroGearPanel(kind) {
  return kind === 'arena' || kind === 'pve';
}
