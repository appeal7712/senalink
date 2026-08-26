export const DECK_DRAG_MIME = 'application/x-sn-deck-drag';
/** 영웅 목록·슬롯: 이 시간(ms) 이상 누르고 있어야 드래그로 짚힘 */
export const DECK_HOLD_MS = 300;

/** @param {{ source: 'slot', fromIdx: number } | { source: 'picker', name: string }} payload */
export function setDeckDragData(e, payload) {
  e.dataTransfer.setData(DECK_DRAG_MIME, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = 'copyMove';
}

export function getDeckDragData(e) {
  try {
    const raw = e.dataTransfer.getData(DECK_DRAG_MIME);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function hasDeckDrag(e) {
  return Array.from(e.dataTransfer?.types || []).includes(DECK_DRAG_MIME);
}

/** 현재 편집 중인 덱 카드의 터치 드롭 핸들러 */
let registeredDropHandler = null;

/** @returns {() => void} unregister */
export function registerDeckPointerDropTarget(fn) {
  registeredDropHandler = fn;
  return () => {
    if (registeredDropHandler === fn) registeredDropHandler = null;
  };
}

let ptrDrag = null;
let holdTimer = null;
let holdListeners = null;
let mouseDownAt = 0;
let suppressClickUntil = 0;

function clearHoldTimer() {
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
  if (holdListeners) {
    window.removeEventListener('pointermove', holdListeners.onMove);
    window.removeEventListener('pointerup', holdListeners.onUp);
    window.removeEventListener('pointercancel', holdListeners.onUp);
    holdListeners = null;
  }
}

function clearPtrGhost() {
  if (!ptrDrag) return;
  ptrDrag.ghost?.remove();
  document.querySelectorAll('.deck-hero-slot-face.is-ptr-drop').forEach((el) => {
    el.classList.remove('is-ptr-drop');
  });
  window.removeEventListener('pointermove', ptrDrag.onMove);
  window.removeEventListener('pointerup', ptrDrag.onUp);
  window.removeEventListener('pointercancel', ptrDrag.onUp);
  ptrDrag = null;
}

function beginPtrDragAt(clientX, clientY, pointerId, payload, label) {
  clearPtrGhost();
  const ghost = document.createElement('div');
  ghost.className = 'deck-ptr-ghost';
  ghost.textContent = label || payload.name || '영웅';
  ghost.style.transform = `translate3d(${clientX - 36}px, ${clientY - 24}px, 0)`;
  document.body.appendChild(ghost);

  const onMove = (ev) => {
    if (!ptrDrag || ev.pointerId !== ptrDrag.pointerId) return;
    ev.preventDefault();
    ptrDrag.ghost.style.transform = `translate3d(${ev.clientX - 36}px, ${ev.clientY - 24}px, 0)`;
    document.querySelectorAll('.deck-hero-slot-face.is-ptr-drop').forEach((el) => {
      el.classList.remove('is-ptr-drop');
    });
    const under = document.elementFromPoint(ev.clientX, ev.clientY);
    under?.closest?.('[data-deck-drop-idx]')?.classList.add('is-ptr-drop');
  };

  const onUp = (ev) => {
    if (!ptrDrag || ev.pointerId !== ptrDrag.pointerId) return;
    const under = document.elementFromPoint(ev.clientX, ev.clientY);
    const slotEl = under?.closest?.('[data-deck-drop-idx]');
    const toIdx = slotEl ? Number(slotEl.getAttribute('data-deck-drop-idx')) : NaN;
    const dropPayload = ptrDrag.payload;
    clearPtrGhost();
    suppressClickUntil = Date.now() + 400;
    if (Number.isInteger(toIdx) && typeof registeredDropHandler === 'function') {
      registeredDropHandler(dropPayload, toIdx);
    }
  };

  ptrDrag = { payload, ghost, pointerId, onMove, onUp };
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
}

/**
 * 터치/펜: DECK_HOLD_MS 동안 누르고 있어야 고스트 드래그 시작.
 * 마우스는 HTML5 DnD + markDeckPointerDown / allowHtml5DeckDrag 게이트.
 * @returns {boolean} armed (홀드 대기 시작됨)
 */
export function startDeckPointerDrag(e, payload, { label = '' } = {}) {
  if (!payload) return false;
  if (typeof e.button === 'number' && e.button !== 0) return false;

  // 마우스: 시간만 기록 (실제 드래그는 HTML5)
  if (e.pointerType === 'mouse') {
    mouseDownAt = Date.now();
    return false;
  }

  clearHoldTimer();
  clearPtrGhost();

  const pointerId = e.pointerId;
  let lastX = e.clientX;
  let lastY = e.clientY;

  const onMove = (ev) => {
    if (ev.pointerId !== pointerId) return;
    lastX = ev.clientX;
    lastY = ev.clientY;
  };

  const onUp = (ev) => {
    if (ev.pointerId !== pointerId) return;
    clearHoldTimer();
  };

  holdListeners = { onMove, onUp };
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  holdTimer = setTimeout(() => {
    holdTimer = null;
    if (holdListeners) {
      window.removeEventListener('pointermove', holdListeners.onMove);
      window.removeEventListener('pointerup', holdListeners.onUp);
      window.removeEventListener('pointercancel', holdListeners.onUp);
      holdListeners = null;
    }
    beginPtrDragAt(lastX, lastY, pointerId, payload, label);
  }, DECK_HOLD_MS);

  return true;
}

/** HTML5 드래그 시작 전: 마우스도 0.3초 이상 누른 뒤에만 허용 */
export function markDeckPointerDown(e) {
  if (e && (e.pointerType === 'mouse' || e.pointerType === '' || e.pointerType == null)) {
    mouseDownAt = Date.now();
  }
}

export function allowHtml5DeckDrag() {
  return mouseDownAt > 0 && (Date.now() - mouseDownAt) >= DECK_HOLD_MS;
}

/** 홀드 드래그 직후 click(배치 선택) 무시 */
export function shouldSuppressDeckClick() {
  return Date.now() < suppressClickUntil || !!ptrDrag || !!holdTimer;
}

export function isDeckPointerDragging() {
  return !!ptrDrag;
}
