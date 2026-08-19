export const DECK_DRAG_MIME = 'application/x-sn-deck-drag';

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
