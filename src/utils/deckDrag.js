export const DECK_DRAG_MIME = 'application/x-sn-deck-drag';
/** 클릭과 구분: 이 거리(px) 이상 움직이면 드래그 시작 (홀드 시간 없음) */
export const DECK_DRAG_THRESHOLD_PX = 8;

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
/** @type {{ onMove: (ev: PointerEvent) => void, onUp: (ev: PointerEvent) => void } | null} */
let pendingTouch = null;
/** @type {{ pointerId: number, startX: number, startY: number, armed: boolean, onMove: (ev: PointerEvent) => void, onUp: (ev: PointerEvent) => void } | null} */
let mouseSession = null;
let suppressClickUntil = 0;

function isMouseLikePointer(e) {
  const t = e?.pointerType;
  return t === 'mouse' || t === '' || t == null;
}

function ptrDist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

function clearPendingTouch() {
  if (!pendingTouch) return;
  window.removeEventListener('pointermove', pendingTouch.onMove);
  window.removeEventListener('pointerup', pendingTouch.onUp);
  window.removeEventListener('pointercancel', pendingTouch.onUp);
  pendingTouch = null;
}

function clearMouseSession() {
  if (!mouseSession) return;
  window.removeEventListener('pointermove', mouseSession.onMove);
  window.removeEventListener('pointerup', mouseSession.onUp);
  window.removeEventListener('pointercancel', mouseSession.onUp);
  mouseSession = null;
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
 * 터치/펜: DECK_DRAG_THRESHOLD_PX 이상 움직이면 고스트 드래그.
 * 마우스는 HTML5 DnD + markDeckPointerDown / allowHtml5DeckDrag (피커·슬롯 공통).
 * @returns {boolean} 터치 대기 시작됨
 */
export function startDeckPointerDrag(e, payload, { label = '' } = {}) {
  if (!payload) return false;
  if (typeof e.button === 'number' && e.button !== 0) return false;
  if (isMouseLikePointer(e)) return false;

  clearPendingTouch();
  clearPtrGhost();

  const pointerId = e.pointerId;
  const startX = e.clientX;
  const startY = e.clientY;
  let started = false;

  const onMove = (ev) => {
    if (ev.pointerId !== pointerId || started) return;
    if (ptrDist(startX, startY, ev.clientX, ev.clientY) < DECK_DRAG_THRESHOLD_PX) return;
    started = true;
    clearPendingTouch();
    beginPtrDragAt(ev.clientX, ev.clientY, pointerId, payload, label);
  };

  const onUp = (ev) => {
    if (ev.pointerId !== pointerId) return;
    clearPendingTouch();
  };

  pendingTouch = { onMove, onUp };
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  return true;
}

/** 마우스 HTML5: pointerdown 후 이동 거리로 드래그 허용 여부 판별 */
export function markDeckPointerDown(e) {
  if (!e || !isMouseLikePointer(e)) return;
  clearMouseSession();

  const pointerId = e.pointerId;
  const startX = e.clientX;
  const startY = e.clientY;
  const state = { pointerId, startX, startY, armed: false, onMove: null, onUp: null };

  const onMove = (ev) => {
    if (ev.pointerId !== pointerId) return;
    if (!state.armed && ptrDist(startX, startY, ev.clientX, ev.clientY) >= DECK_DRAG_THRESHOLD_PX) {
      state.armed = true;
    }
  };

  const onUp = (ev) => {
    if (ev.pointerId !== pointerId) return;
    if (state.armed) suppressClickUntil = Date.now() + 400;
    clearMouseSession();
  };

  state.onMove = onMove;
  state.onUp = onUp;
  mouseSession = state;
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
}

/**
 * HTML5 dragstart 허용 여부.
 * dragstart가 발생했다면 브라우저가 이미 드래그로 판단한 것 — 막지 않음(클릭만으로는 보통 발생 안 함).
 */
export function allowHtml5DeckDrag(e) {
  if (e?.type === 'dragstart') return true;
  return !!mouseSession?.armed;
}

/** HTML5 dragstart 통과 직후 — 클릭 억제 + 마우스 세션 정리 */
export function markDeckHtml5DragStarted() {
  suppressClickUntil = Date.now() + 400;
  clearMouseSession();
}

/** 홀드/드래그 직후 click(배치 선택) 무시 */
export function shouldSuppressDeckClick() {
  return Date.now() < suppressClickUntil || !!ptrDrag || !!pendingTouch;
}

export function isDeckPointerDragging() {
  return !!ptrDrag;
}

/** 모달 닫힘·페이지 이탈 시 호출 — stuck 포인터/고스트 정리 */
export function resetDeckDragState() {
  clearPendingTouch();
  clearMouseSession();
  clearPtrGhost();
  suppressClickUntil = 0;
}

if (typeof window !== 'undefined') {
  window.addEventListener('blur', resetDeckDragState);
  window.addEventListener('pointercancel', resetDeckDragState);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') resetDeckDragState();
  });
}
