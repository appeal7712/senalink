import { GoogleAuthProvider, getRedirectResult, signInWithPopup, browserPopupRedirectResolver } from 'firebase/auth';
import { auth } from './firebase';

function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account', hl: 'ko' });
  return provider;
}

export async function consumeGoogleRedirect() {
  try {
    return await getRedirectResult(auth);
  } catch {
    return null;
  }
}

/** 클릭 핸들러에서 바로 호출. 로컬에서는 리다이렉트 금지 — firebaseapp.com 에 멈춘다. */
export async function signInWithGoogleNow() {
  try {
    return await signInWithPopup(auth, googleProvider(), browserPopupRedirectResolver);
  } catch (err) {
    const code = err?.code || '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return null;
    if (code === 'auth/popup-blocked') {
      throw new Error('브라우저가 구글 창을 막았습니다. 주소창 오른쪽에서 팝업을 허용한 뒤 다시 눌러 주세요.');
    }
    throw err;
  }
}
