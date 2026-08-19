import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth, db, usingEmulators } from '../lib/firebase';
import { adminDoc } from '../config/firestorePaths';
import { isGoogleUser } from '../lib/access';
import { seedEmulatorSuperAdmin } from '../lib/emulatorAdmin';
import { consumeGoogleRedirect, signInWithGoogleNow } from '../lib/googleSignIn';

const SuperAdminContext = createContext(null);

export function useSuperAdmin() {
  const ctx = useContext(SuperAdminContext);
  if (!ctx) throw new Error('useSuperAdmin must be used within SuperAdminProvider');
  return ctx;
}

export function SuperAdminProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [adminReady, setAdminReady] = useState(false);
  const [loginError, setLoginError] = useState(null);

  useEffect(() => {
    void consumeGoogleRedirect();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user || null);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady) return undefined;
    if (!authUser?.uid) {
      setIsSuperAdmin(false);
      setAdminReady(true);
      return undefined;
    }

    setAdminReady(false);
    const unsub = onSnapshot(doc(db, ...adminDoc(authUser.uid)), (snap) => {
      setIsSuperAdmin(snap.exists() && snap.data()?.role === 'super');
      setAdminReady(true);
    }, (err) => {
      console.error('admin snapshot', err);
      setIsSuperAdmin(false);
      setAdminReady(true);
      setLoginError(err?.code === 'permission-denied'
        ? '관리자 문서를 읽지 못했습니다. Firestore 규칙이 senalink에 배포됐는지 확인해 주세요.'
        : (err?.message || '권한 확인에 실패했습니다.'));
    });
    const timer = window.setTimeout(() => setAdminReady(true), 4000);
    return () => {
      window.clearTimeout(timer);
      unsub();
    };
  }, [authReady, authUser?.uid]);

  const signInWithGoogleForOps = useCallback(async () => {
    setLoginError(null);
    try {
      await signInWithGoogleNow();
    } catch (err) {
      const message = usingEmulators
        ? '에뮬레이터에서는 구글 팝업 대신 ‘로컬 관리자로 들어가기’를 사용해 주세요.'
        : (err?.message || '구글 로그인에 실패했습니다.');
      setLoginError(message);
      throw new Error(message);
    }
  }, []);

  const enterLocalOpsAdmin = useCallback(async () => {
    setLoginError(null);
    if (!usingEmulators) {
      throw new Error('로컬 에뮬레이터에서만 사용할 수 있습니다.');
    }
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      const uid = auth.currentUser?.uid;
      await seedEmulatorSuperAdmin(uid);
      setIsSuperAdmin(true);
      setAdminReady(true);
    } catch (err) {
      const message = err?.message || '로컬 관리자 등록에 실패했습니다.';
      setLoginError(message);
      throw new Error(message);
    }
  }, []);

  const value = useMemo(() => ({
    authReady,
    adminReady,
    authUser,
    isSuperAdmin,
    isGoogleAccount: isGoogleUser(authUser),
    loginError,
    signInWithGoogleForOps,
    enterLocalOpsAdmin,
    usingEmulators,
  }), [adminReady, authReady, authUser, enterLocalOpsAdmin, isSuperAdmin, loginError, signInWithGoogleForOps]);

  return (
    <SuperAdminContext.Provider value={value}>
      {children}
    </SuperAdminContext.Provider>
  );
}
