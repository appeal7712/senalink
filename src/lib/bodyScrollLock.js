/** 중첩 모달도 안전하게 잠그기 위한 참조 카운트 스크롤 락 */
let lockCount = 0;
let savedScrollY = 0;

export function lockBodyScroll() {
  lockCount += 1;
  if (lockCount !== 1) return;
  savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.documentElement.classList.add('body-scroll-locked');
  document.body.classList.add('body-scroll-locked');
  document.body.style.top = `-${savedScrollY}px`;
}

export function unlockBodyScroll() {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount !== 0) return;
  document.documentElement.classList.remove('body-scroll-locked');
  document.body.classList.remove('body-scroll-locked');
  document.body.style.top = '';
  window.scrollTo(0, savedScrollY);
}
