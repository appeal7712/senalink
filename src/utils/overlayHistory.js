/** 모달·오버레이 열릴 때 history 한 칸 쌓아서, 뒤로가기가 "이전 페이지"가 아니라 "방금 닫은 화면"으로 동작하게 한다. */

const stack = [];
let ignoreNextPop = false;

export function pushOverlay(onClose) {
  if (typeof window === 'undefined') return;
  stack.push(onClose);
  window.history.pushState({ __appOverlay: stack.length }, '', window.location.href);
}

export function closeOverlayFromUI(onClose) {
  if (typeof window === 'undefined') {
    onClose?.();
    return;
  }
  if (stack.length > 0) stack.pop();
  ignoreNextPop = true;
  if (window.history.state?.__appOverlay) {
    window.history.back();
  }
  onClose?.();
}

export function handleOverlayPopState() {
  if (typeof window === 'undefined') return false;
  if (ignoreNextPop) {
    ignoreNextPop = false;
    return true;
  }
  if (stack.length === 0) return false;
  const onClose = stack.pop();
  onClose?.();
  return true;
}

export function hasOpenOverlay() {
  return stack.length > 0;
}

export function pushHubTab(tabId) {
  if (typeof window === 'undefined') return;
  window.history.pushState({ __hubTab: tabId }, '', window.location.pathname);
}

export function readHubTabFromState(state) {
  const tab = state?.__hubTab;
  return typeof tab === 'string' ? tab : null;
}

export function collapseOverlayHistory() {
  stack.length = 0;
  ignoreNextPop = false;
  if (typeof window === 'undefined') return;
  const keep = { ...(window.history.state || {}) };
  delete keep.__appOverlay;
  window.history.replaceState(keep, '', window.location.href);
}
