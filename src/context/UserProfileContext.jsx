import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { COL } from '../config/firestorePaths';

const UserProfileContext = createContext(null);

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error('useUserProfile must be used within UserProfileProvider');
  return ctx;
}

const EMPTY_PROFILE = {
  nickname: '',
  photoURL: null,
  totalwarTier: 'normal',
  arenaTier: 'bronze',
  destructionScore: 0,
  hubId: null,
};

export function UserProfileProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setAuthUser(user || null);
      setAuthReady(true);
      if (!user) {
        setProfile(EMPTY_PROFILE);
        setProfileReady(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!authUser?.uid) return;
    setProfileReady(false);
    const unsub = onSnapshot(
      doc(db, COL.USERS, authUser.uid),
      (snap) => {
        if (snap.exists()) {
          setProfile({ ...EMPTY_PROFILE, ...snap.data() });
        } else {
          setProfile(EMPTY_PROFILE);
        }
        setProfileReady(true);
      },
      () => setProfileReady(true),
    );
    return unsub;
  }, [authUser?.uid]);

  const saveProfile = useCallback(async (fields) => {
    if (!authUser?.uid) throw new Error('로그인이 필요합니다.');
    const data = { ...fields, updatedAt: new Date().toISOString() };
    await setDoc(doc(db, COL.USERS, authUser.uid), data, { merge: true });
  }, [authUser?.uid]);

  const value = useMemo(() => ({
    authUser,
    authReady,
    profile,
    profileReady,
    saveProfile,
  }), [authUser, authReady, profile, profileReady, saveProfile]);

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}
