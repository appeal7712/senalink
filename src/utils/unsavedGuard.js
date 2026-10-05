import { useState } from 'react';

const DISCARD_MESSAGE = '작성 중인 내용이 저장되지 않았어요.\n창을 닫을까요?';

function snapshot(value) {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return null;
  }
}

/**
 * 창이 열린 순간의 값을 기억해 두고, 닫기 전에 값이 바뀌었으면 한 번 묻는다.
 * `guard(onClose)` → 바뀐 게 없으면 바로 닫고, 바뀌었으면 확인 후 닫는 함수.
 */
export function useUnsavedGuard(open, value) {
  const [state, setState] = useState({ open: false, base: null });
  if (state.open !== open) {
    setState({ open, base: open ? snapshot(value) : null });
  }
  const dirty = open && state.open && state.base != null && snapshot(value) !== state.base;
  return (onClose) => () => {
    if (dirty && !window.confirm(DISCARD_MESSAGE)) return;
    onClose?.();
  };
}
