import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  deleteField,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';
import {
  HISTORY_RETENTION_DAYS,
  HUB_EMBLEMS,
  LOUNGE_AFFILIATIONS,
  LOUNGE_STORAGE_KEYS,
  LOUNGE_TAGS,
  MAX_ADMINS,
  MAX_HUB_MEMBERS,
  MAX_LOUNGE_TAGS,
} from '../data/loungeMeta';
import { auth, db, functions, hashPassword, usingEmulators } from '../lib/firebase';
import { parseInviteCode } from '../lib/invite';
import { USE_GOOGLE_AUTH } from '../config/deployMode';
import { shouldSuppressAnonymousSignIn } from '../lib/authLock';
import { signInWithGoogleNow } from '../lib/googleSignIn';
import { useSuperAdmin } from './SuperAdminContext';
import { parseGuildRank, normalizeGuildwarLeague } from '../data/guildRanks';
import { syncPublicGuild } from '../lib/publicGuilds';
import { COL } from '../config/firestorePaths';
import { isRateLimited } from '../lib/rateLimit';
import { sanitizeText } from '../lib/sanitize';

const LoungeContext = createContext(null);
const useGoogleForHub = USE_GOOGLE_AUTH && !usingEmulators;

export const useLounge = () => {
  const ctx = useContext(LoungeContext);
  if (!ctx) throw new Error('useLounge must be used within LoungeProvider');
  return ctx;
};

const uid = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const nowIso = () => new Date().toISOString();
const ONE_HUB_MSG = '이미 길드 허브에 소속되어 있습니다. 다른 허브로 가려면 먼저 현재 허브에서 나가 주세요.';
const NEED_NICKNAME_MSG = '먼저 마이페이지에서 닉네임을 설정해 주세요.';

/** Callable HttpsError 메시지를 UI용으로 정리 */
const callableErrorMessage = (err, fallback = '요청에 실패했습니다.') => {
  const raw = String(err?.message || '').trim();
  if (!raw) return fallback;
  return raw
    .replace(/^Firebase:\s*/i, '')
    .replace(/\s*\(functions\/[^)]+\)\.?\s*$/i, '')
    .trim() || fallback;
};

const MAX_FEED_IMAGES = 4;
/** 첨부 이미지는 base64로 같은 문서에 저장된다. Firestore 문서 한도(1MiB)에 여유를 둔 상한. */
const MAX_FEED_IMAGES_BYTES = 780_000;

const sanitizeFeedImages = (images) => {
  const list = (images || []).filter(v => typeof v === 'string' && v).slice(0, MAX_FEED_IMAGES);
  const total = list.reduce((sum, src) => sum + src.length, 0);
  if (total > MAX_FEED_IMAGES_BYTES) {
    throw new Error('첨부한 이미지 용량이 너무 큽니다. 장수를 줄이거나 더 작은 이미지를 올려 주세요.');
  }
  return list;
};

const clearUserHubPointer = (userId) => {
  if (!userId) return;
  setDoc(doc(db, COL.USERS, userId), { hubId: null, updatedAt: nowIso() }, { merge: true }).catch(() => {});
};

const makeInviteCode = () => {
  const chunk = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `7K-${chunk()}-${chunk()}`;
};

/**
 * inviteIndex 는 update 금지(하이재킹 차단). 기존 코드와 충돌하면 create 가 실패하므로
 * 새 코드를 골라 hub.inviteCode 와 인덱스를 맞춰 둔다.
 */
const claimInviteIndex = async (hubId, preferredCode = null) => {
  let inviteCode = preferredCode || makeInviteCode();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await setDoc(doc(db, 'inviteIndex', inviteCode), { hubId });
      return inviteCode;
    } catch {
      inviteCode = makeInviteCode();
    }
  }
  throw new Error('초대 코드 발급에 실패했습니다. 잠시 후 다시 시도해 주세요.');
};

const purgeOldHistory = (events) => {
  const cutoff = Date.now() - HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return (events || []).filter(e => new Date(e.createdAt).getTime() >= cutoff);
};

const emptyScoresForMembers = (members = []) =>
  members.map(m => ({
    memberId: m.id,
    nickname: m.nickname,
    siegeScore: 0,
    expeditionDmg: 0,
    arenaScore: 0,
    totalwarScore: 0,
  }));

const PROJECT_GUARD_KEY = '7k_firebase_project';
const CURRENT_PROJECT = import.meta.env.VITE_FIREBASE_PROJECT_ID || '';

const readSession = () => {
  try {
    if (localStorage.getItem(PROJECT_GUARD_KEY) !== CURRENT_PROJECT) {
      localStorage.removeItem(LOUNGE_STORAGE_KEYS.session);
      localStorage.setItem(PROJECT_GUARD_KEY, CURRENT_PROJECT);
      return null;
    }
    const raw = localStorage.getItem(LOUNGE_STORAGE_KEYS.session);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeSession = (session) => {
  try { localStorage.setItem(PROJECT_GUARD_KEY, CURRENT_PROJECT); } catch { /* ignore */ }
  if (!session) localStorage.removeItem(LOUNGE_STORAGE_KEYS.session);
  else localStorage.setItem(LOUNGE_STORAGE_KEYS.session, JSON.stringify(session));
};

export function LoungeProvider({ children }) {
  const { isSuperAdmin } = useSuperAdmin();
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [session, setSession] = useState(() => readSession());
  const [hubMeta, setHubMeta] = useState(null);
  const [members, setMembers] = useState([]);
  const [notices, setNotices] = useState([]);
  const [posts, setPosts] = useState([]);
  const [history, setHistory] = useState([]);
  const [scoresMap, setScoresMap] = useState({});
  const [bootError, setBootError] = useState(null);
  const [freshInvite, setFreshInvite] = useState(null);
  const [membersReady, setMembersReady] = useState(false);
  /** 멤버 목록 스냅샷이 성공으로 끝난 경우에만 true — 에러/미수신 시 hubId 지우지 않음 */
  const [membersSnapOk, setMembersSnapOk] = useState(false);
  const [hubRecovering, setHubRecovering] = useState(false);
  const hubRecoverTriedFor = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (useGoogleForHub) {
        if (user?.isAnonymous) {
          try { await signOut(auth); } catch { /* ignore */ }
          setAuthUser(null);
          setAuthReady(true);
          return;
        }
        setAuthUser(user || null);
        setAuthReady(true);
        return;
      }

      if (user) {
        setAuthUser(user);
        setAuthReady(true);
        return;
      }
      if (shouldSuppressAnonymousSignIn()) {
        setAuthUser(null);
        setAuthReady(true);
        return;
      }
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error(err);
        setBootError(err?.message || 'Firebase Auth 초기화 실패');
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const maybeAnon = () => {
      if (useGoogleForHub || shouldSuppressAnonymousSignIn() || auth.currentUser) return;
      signInAnonymously(auth).catch((err) => console.error(err));
    };
    window.addEventListener('app:navigate', maybeAnon);
    window.addEventListener('popstate', maybeAnon);
    return () => {
      window.removeEventListener('app:navigate', maybeAnon);
      window.removeEventListener('popstate', maybeAnon);
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setBootError(null);
    try {
      await signInWithGoogleNow();
    } catch (err) {
      if (usingEmulators) {
        throw new Error('로컬 에뮬레이터에 연결하지 못했습니다. 터미널에서 npm run emulators 를 먼저 실행해 주세요.');
      }
      throw new Error(err?.message || '구글 로그인에 실패했습니다.');
    }
  }, []);

  const signOutAccount = useCallback(async () => {
    setSession(null);
    await signOut(auth);
  }, []);

  useEffect(() => {
    writeSession(session);
  }, [session]);

  const loungeId = session?.loungeId || null;

  // 기기별 localStorage와 무관하게, users.hubId 실시간 구독으로 허브 세션 복구
  useEffect(() => {
    if (!authReady || !authUser) return undefined;
    const unsub = onSnapshot(doc(db, COL.USERS, authUser.uid), (snap) => {
      if (!snap.exists()) return;
      const hubId = snap.data()?.hubId || null;
      if (!hubId) {
        setSession((prev) => (prev?.observer ? prev : null));
        return;
      }
      setSession((prev) => {
        if (prev?.observer) return prev;
        if (prev?.loungeId === hubId) return prev;
        return { loungeId: hubId, memberId: authUser.uid };
      });
    }, (err) => {
      console.error('user hub restore', err);
    });
    return () => unsub();
  }, [authReady, authUser]);

  // hubId 포인터가 비어 있어도, 실제 members 문서로 소속 허브를 찾아 복구
  useEffect(() => {
    if (!authReady || !authUser) {
      hubRecoverTriedFor.current = null;
      setHubRecovering(false);
      return undefined;
    }
    if (session?.observer) return undefined;
    if (session?.loungeId) {
      setHubRecovering(false);
      return undefined;
    }
    if (hubRecoverTriedFor.current === authUser.uid) return undefined;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        if (cancelled) return;
        // 짧은 대기: users.hubId 스냅샷이 먼저 채울 수 있음
        if (cancelled) return;
        hubRecoverTriedFor.current = authUser.uid;
        setHubRecovering(true);
        try {
          const userSnap = await getDoc(doc(db, COL.USERS, authUser.uid));
          if (cancelled) return;
          const pointed = userSnap.data()?.hubId || null;
          if (pointed) {
            setSession((prev) => {
              if (prev?.observer) return prev;
              if (prev?.loungeId === pointed) return prev;
              return { loungeId: pointed, memberId: authUser.uid };
            });
            return;
          }
          const res = await httpsCallable(functions, 'resolveMyHub')({});
          const hubId = String(res?.data?.hubId || '').trim();
          if (cancelled) return;
          if (hubId) {
            setSession({ loungeId: hubId, memberId: authUser.uid });
          }
        } catch (err) {
          console.error('resolveMyHub', err);
          hubRecoverTriedFor.current = null;
        } finally {
          if (!cancelled) setHubRecovering(false);
        }
      })();
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [authReady, authUser, session?.loungeId, session?.observer]);

  // Subscribe hub + subcollections when session has loungeId
  useEffect(() => {
    if (!loungeId || !authUser || !authReady) {
      setHubMeta(null);
      setMembers([]);
      setMembersReady(false);
      setMembersSnapOk(false);
      setNotices([]);
      setPosts([]);
      setHistory([]);
      setScoresMap({});
      return undefined;
    }

    setMembersReady(false);
    setMembersSnapOk(false);

    const unsubs = [];

    unsubs.push(onSnapshot(doc(db, 'hubs', loungeId), (snap) => {
      if (!snap.exists()) {
        setHubMeta(null);
        setSession(null);
        clearUserHubPointer(authUser.uid);
        return;
      }
      setHubMeta({ id: snap.id, ...snap.data() });
    }, (err) => {
      // 권한·네트워크 일시 실패로 hubId를 지우면 다른 기기까지 끊김 — 세션/포인터 유지
      console.error('hub snapshot', err);
      setHubMeta(null);
    }));

    unsubs.push(onSnapshot(collection(db, 'hubs', loungeId, 'members'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        const rank = { master: 0, admin: 1, member: 2 };
        return (rank[a.role] ?? 9) - (rank[b.role] ?? 9) || String(a.nickname).localeCompare(String(b.nickname));
      });
      setMembers(list);
      setMembersSnapOk(true);
      setMembersReady(true);
    }, (err) => {
      console.error('members snapshot', err);
      if (err?.code === 'permission-denied') {
        setMembers([]);
      }
      // 빈 목록+ready 로 hubId 삭제하는 레이스를 막음
      setMembersSnapOk(false);
      setMembersReady(true);
    }));

    // 피드·히스토리 limit: 입장 시 base64 이미지 포함 문서 읽기 비용 상한
    const noticesQ = query(collection(db, 'hubs', loungeId, 'notices'), orderBy('createdAt', 'desc'), limit(40));
    unsubs.push(onSnapshot(noticesQ, (snap) => {
      const list = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          loungeId,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || nowIso(),
        };
      });
      setNotices(list);
    }, (err) => console.error('notices snapshot', err)));

    const postsQ = query(collection(db, 'hubs', loungeId, 'posts'), orderBy('createdAt', 'desc'), limit(50));
    unsubs.push(onSnapshot(postsQ, (snap) => {
      const list = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          loungeId,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || nowIso(),
        };
      });
      setPosts(list);
    }, (err) => console.error('posts snapshot', err)));

    const historyQ = query(collection(db, 'hubs', loungeId, 'history'), orderBy('createdAt', 'desc'), limit(120));
    unsubs.push(onSnapshot(historyQ, (snap) => {
      const events = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          loungeId,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || nowIso(),
        };
      });
      setHistory(purgeOldHistory(events));
    }, (err) => console.error('history snapshot', err)));

    unsubs.push(onSnapshot(collection(db, 'hubs', loungeId, 'scores'), (snap) => {
      const map = {};
      snap.docs.forEach(d => { map[d.id] = d.data(); });
      setScoresMap(map);
    }, (err) => console.error('scores snapshot', err)));

    return () => unsubs.forEach(u => u());
  }, [loungeId, authUser, authReady]);

  const activeLounge = useMemo(() => {
    if (!hubMeta || !loungeId) return null;
    return {
      ...hubMeta,
      id: loungeId,
      members,
      // UI 호환: 평문 password는 노출하지 않음
      password: undefined,
    };
  }, [hubMeta, loungeId, members]);

  const me = useMemo(() => {
    if (!authUser) return null;
    const found = members.find(m => m.id === authUser.uid);
    if (found) return found;
    if (isSuperAdmin && loungeId && membersReady) {
      return {
        id: authUser.uid,
        nickname: authUser.displayName || authUser.email || '슈퍼관리자',
        role: 'super',
        joinedAt: '',
        lastActiveAt: '',
        isSuperAdminObserver: true,
      };
    }
    return null;
  }, [authUser, members, isSuperAdmin, loungeId, membersReady]);

  useEffect(() => {
    if (!loungeId || !authUser || !me || me.isSuperAdminObserver) return undefined;
    const bump = async () => {
      const patch = { lastActiveAt: nowIso() };
      try {
        const uSnap = await getDoc(doc(db, COL.USERS, authUser.uid));
        // 마이페이지에서 올린 사진만 허브 아바타로 씀. 구글 계정 사진은 자동 반영하지 않음.
        const customPhoto = uSnap.data()?.photoURL || null;
        patch.avatarURL = customPhoto || deleteField();
      } catch { /* ignore */ }
      updateDoc(doc(db, 'hubs', loungeId, 'members', authUser.uid), patch).catch(() => {});
    };
    bump();
    // 프레즌스 쓰기 스로틀 (기존 5분 → 15분). UI lastActive 표시만 조금 덜 잦아짐.
    const timer = window.setInterval(bump, 900_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') bump();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [loungeId, authUser, me?.id]);

  useEffect(() => {
    if (!session || !authUser || !membersReady || !membersSnapOk) return;
    if (isSuperAdmin || session.observer) return;
    if (members.some(m => m.id === authUser.uid)) {
      setDoc(doc(db, COL.USERS, authUser.uid), {
        hubId: session.loungeId,
        updatedAt: nowIso(),
      }, { merge: true }).catch(() => {});
      return;
    }

    // 추방·강퇴 후: 확정 스냅샷에 없으면 즉시 세션·hubId 정리 (재가입 가능)
    setSession(null);
    setDoc(doc(db, COL.USERS, authUser.uid), { hubId: null, updatedAt: nowIso() }, { merge: true }).catch(() => {});
  }, [session, authUser, membersReady, membersSnapOk, members, isSuperAdmin]);

  const myRole = me?.role || null;
  const isMaster = myRole === 'master';
  const isAdmin = myRole === 'admin' || myRole === 'master' || isSuperAdmin;
  const canManageMembers = isAdmin;
  const canPostNotice = isAdmin;
  const canEditBuilds = !!myRole;
  const canAppointAdmin = isMaster || isSuperAdmin;

  const pushHistory = useCallback(async (hubId, actor, action, target, detail = '') => {
    const id = uid('hist');

    // history는 규칙이 request.resource.size에 민감할 수 있으므로,
    // 악의적/비정상 입력이 들어와도 payload가 과도해지지 않게 문자열을 안전하게 정리합니다.
    const safeActor = String(actor ?? '').slice(0, 30);
    const safeAction = String(action ?? '').slice(0, 30);
    const safeTarget = String(target ?? '').slice(0, 120);
    const safeDetail = String(detail ?? '').slice(0, 300);

    const payload = {
      actor: safeActor,
      action: safeAction,
      target: safeTarget,
      detail: safeDetail,
      createdAt: nowIso(),
    };
    const payloadSizeKB = Math.round(new Blob([JSON.stringify(payload)]).size / 1024);

    try {
      await setDoc(doc(db, 'hubs', hubId, 'history', id), payload);
    } catch (err) {
      // uncaught promise rejection을 막기 위한 방어(기능 유지).
      console.error('history write failed', {
        hubId,
        uid: auth.currentUser?.uid,
        safeActor,
        safeAction,
        safeTarget,
        safeDetail,
        payloadSizeKB,
        err,
      });
    }
  }, []);

  const writeUserHub = useCallback(async (hubId) => {
    if (!authUser) return;
    const payload = { hubId: hubId || null, updatedAt: nowIso() };
    const ref = doc(db, COL.USERS, authUser.uid);
    try {
      await updateDoc(ref, payload);
    } catch {
      await setDoc(ref, payload, { merge: true });
    }
  }, [authUser]);

  const leaveCurrentHub = useCallback(async ({ reason = 'leave' } = {}) => {
    if (!authUser) return null;
    const userSnap = await getDoc(doc(db, COL.USERS, authUser.uid));
    const currentHubId = userSnap.data()?.hubId || (session?.observer ? null : session?.loungeId) || null;
    if (!currentHubId) return null;

    const memberRef = doc(db, 'hubs', currentHubId, 'members', authUser.uid);
    const memberSnap = await getDoc(memberRef);
    if (!memberSnap.exists()) {
      await writeUserHub(null);
      return currentHubId;
    }

    const role = memberSnap.data().role;
    const nick = memberSnap.data().nickname || '';
    const membersSnap = await getDocs(collection(db, 'hubs', currentHubId, 'members'));
    if (role === 'master' && membersSnap.size > 1) {
      throw new Error('길드마스터는 나가기 전에 마스터를 위임해야 합니다.');
    }

    if (membersSnap.size <= 1) {
      try {
        await httpsCallable(functions, 'disbandHub')({ hubId: currentHubId });
      } catch (err) {
        throw new Error(err?.message || '허브를 해체하지 못했습니다. 로컬이면 에뮬레이터에 functions 가 켜져 있는지 확인해 주세요.');
      }
      await writeUserHub(null);
      return currentHubId;
    }

    await pushHistory(
      currentHubId,
      nick,
      'leave',
      nick,
      reason === 'switch' ? '다른 길드로 이동' : '허브 나가기',
    );
    await deleteDoc(memberRef);
    await writeUserHub(null);
    return currentHubId;
  }, [authUser, session, pushHistory, writeUserHub]);

  const createLounge = useCallback(async ({ name, affiliation, tags }) => {
    if (!authUser) throw new Error('연결 준비 중입니다. 잠시 후 다시 시도해 주세요.');
    if (isRateLimited('createLounge', { maxCalls: 2, windowMs: 300_000 })) throw new Error('허브 생성을 너무 자주 시도하고 있습니다. 잠시 후 다시 시도해 주세요.');
    if (!name?.trim()) throw new Error('길드 이름을 입력해 주세요.');
    if (!LOUNGE_AFFILIATIONS.some(a => a.id === affiliation)) throw new Error('길드 소속을 선택해 주세요.');
    const cleanTags = [...new Set(tags || [])].slice(0, MAX_LOUNGE_TAGS);
    if (cleanTags.length < 1) throw new Error('해시태그를 1개 이상 선택해 주세요.');

    // 닉네임은 마이페이지 프로필이 유일한 출처다. 허브에서 따로 받지 않는다.
    let userData = null;
    try {
      userData = (await getDoc(doc(db, COL.USERS, authUser.uid))).data() || null;
    } catch {
      throw new Error('프로필을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
    const nick = String(userData?.nickname || '').trim();
    if (!nick) throw new Error(NEED_NICKNAME_MSG);

    const existingHubId = userData?.hubId || null;
    if (existingHubId) {
      const hubSnap = await getDoc(doc(db, 'hubs', existingHubId)).catch(() => null);
      if (hubSnap?.exists()) throw new Error(ONE_HUB_MSG);
    }

    const hubId = uid('lounge');
    let inviteCode = makeInviteCode();
    let passwordHash = await hashPassword(inviteCode);
    const ts = nowIso();

    await setDoc(doc(db, 'hubs', hubId), {
      name: name.trim(),
      affiliation,
      tags: cleanTags,
      emblem: 'fortress',
      emblemUrl: null,
      description: '',
      masterId: authUser.uid,
      inviteCode,
      passwordHash,
      guildwarRank: null,
      guildwarLeague: null,
      expeditionRank: null,
      ranksUpdatedAt: null,
      lastActivityAt: ts,
      createdAt: ts,
      updatedAt: ts,
    });

    const masterData = {
      uid: authUser.uid,
      nickname: nick,
      role: 'master',
      joinedAt: ts,
      lastActiveAt: ts,
    };
    const masterAvatar = userData?.photoURL || null;
    if (masterAvatar) masterData.avatarURL = masterAvatar;
    await setDoc(doc(db, 'hubs', hubId, 'members', authUser.uid), masterData);

    const claimed = await claimInviteIndex(hubId, inviteCode);
    if (claimed !== inviteCode) {
      inviteCode = claimed;
      passwordHash = await hashPassword(inviteCode);
      await updateDoc(doc(db, 'hubs', hubId), { inviteCode, passwordHash, updatedAt: nowIso() });
    }

    await setDoc(doc(db, 'hubs', hubId, 'builds', 'main'), {
      siege: {},
      expedition: {},
      arena: [],
      totalwar: {},
      gwAttacks: [],
      gwDefenses: [],
      updatedAt: ts,
    });

    await syncPublicGuild(hubId, {
      name: name.trim(),
      affiliation,
      emblem: 'fortress',
      emblemUrl: null,
      updatedAt: ts,
    });

    const noticeId = uid('notice');
    await setDoc(doc(db, 'hubs', hubId, 'notices', noticeId), {
      author: nick,
      authorId: authUser.uid,
      title: '길드 허브 개설',
      body: `${name.trim()} 허브가 개설되었습니다. 초대 코드 또는 링크를 길드원에게 공유해 주세요.`,
      images: [],
      createdAt: ts,
    });

    await pushHistory(hubId, nick, 'create_lounge', name.trim(), '허브 생성');
    await writeUserHub(hubId);
    setSession({ loungeId: hubId, memberId: authUser.uid });
    const created = { id: hubId, inviteCode, name: name.trim() };
    setFreshInvite(created);
    return created;
  }, [authUser, pushHistory, writeUserHub]);

  const joinLounge = useCallback(async ({ inviteCode }) => {
    if (!authUser) throw new Error('연결 준비 중입니다. 잠시 후 다시 시도해 주세요.');
    if (isRateLimited('joinLounge', { maxCalls: 3, windowMs: 60_000 })) throw new Error('너무 빠르게 시도하고 있습니다. 잠시 후 다시 시도해 주세요.');
    const code = parseInviteCode(inviteCode);
    if (!code) throw new Error('초대 코드를 확인할 수 없습니다. 코드 또는 초대 링크를 붙여넣어 주세요.');

    // 빠른 UX 사전 검사(실제 강제력은 joinHub Callable + Admin 트랜잭션).
    const userSnap = await getDoc(doc(db, COL.USERS, authUser.uid));
    const userData = userSnap.data() || null;
    const nick = String(userData?.nickname || '').trim();
    if (!nick) throw new Error(NEED_NICKNAME_MSG);

    let hubId;
    try {
      const res = await httpsCallable(functions, 'joinHub')({ inviteCode: code });
      hubId = String(res?.data?.hubId || '').trim();
    } catch (err) {
      throw new Error(callableErrorMessage(err, '가입에 실패했습니다. 잠시 후 다시 시도해 주세요.'));
    }
    if (!hubId) throw new Error('가입에 실패했습니다. 잠시 후 다시 시도해 주세요.');

    try { localStorage.setItem(LOUNGE_STORAGE_KEYS.inviteHint, code); } catch { /* ignore */ }
    await writeUserHub(hubId);
    setSession({ loungeId: hubId, memberId: authUser.uid });
    return { id: hubId };
  }, [authUser, writeUserHub]);

  const leaveLounge = useCallback(async () => {
    if (session?.observer) {
      setSession(null);
      return;
    }
    await leaveCurrentHub({ reason: 'leave' });
    setSession(null);
  }, [session, leaveCurrentHub]);

  const enterHubAsSuperAdmin = useCallback((hubId) => {
    if (!isSuperAdmin || !authUser) throw new Error('슈퍼관리자만 허브를 열 수 있습니다.');
    if (!hubId) throw new Error('허브를 선택해 주세요.');
    setSession({ loungeId: hubId, memberId: authUser.uid, observer: true });
  }, [authUser, isSuperAdmin]);

  const updateHubSettings = useCallback(async (patch) => {
    if (!activeLounge || !me || !loungeId) return;
    if (!isAdmin) throw new Error('허브 설정은 관리자만 변경할 수 있습니다.');

    const next = {};
    if (patch.name !== undefined) {
      if (!String(patch.name).trim()) throw new Error('길드 이름을 입력해 주세요.');
      next.name = String(patch.name).trim();
    }
    if (patch.affiliation !== undefined) {
      if (!LOUNGE_AFFILIATIONS.some(a => a.id === patch.affiliation)) {
        throw new Error('길드 소속을 선택해 주세요.');
      }
      next.affiliation = patch.affiliation;
    }
    if (patch.tags !== undefined) {
      next.tags = [...new Set(patch.tags || [])].slice(0, MAX_LOUNGE_TAGS);
      if (next.tags.length < 1) throw new Error('해시태그를 1개 이상 선택해 주세요.');
    }
    if (patch.emblem !== undefined || patch.emblemUrl !== undefined) {
      const nextUrl = patch.emblemUrl !== undefined ? (patch.emblemUrl || null) : (activeLounge.emblemUrl || null);
      const nextEmblem = patch.emblem !== undefined ? patch.emblem : (activeLounge.emblem || 'fortress');
      if (nextUrl) {
        next.emblem = 'custom';
        next.emblemUrl = nextUrl;
      } else {
        if (!HUB_EMBLEMS.some(e => e.id === nextEmblem)) throw new Error('사용할 수 없는 엠블럼입니다.');
        next.emblem = nextEmblem;
        next.emblemUrl = null;
      }
    }
    if (patch.description !== undefined) {
      next.description = String(patch.description || '').slice(0, 120);
    }
    if (patch.guildwarRank !== undefined || patch.guildwarLeague !== undefined || patch.expeditionRank !== undefined) {
      if (!isMaster && !isSuperAdmin) throw new Error('길드 순위는 길드마스터만 갱신할 수 있습니다.');
      const gwRank = patch.guildwarRank !== undefined ? parseGuildRank(patch.guildwarRank) : parseGuildRank(activeLounge.guildwarRank);
      const exRank = patch.expeditionRank !== undefined ? parseGuildRank(patch.expeditionRank) : parseGuildRank(activeLounge.expeditionRank);
      next.guildwarRank = gwRank;
      next.guildwarLeague = gwRank
        ? (normalizeGuildwarLeague(patch.guildwarLeague !== undefined ? patch.guildwarLeague : activeLounge.guildwarLeague) || 'major')
        : null;
      next.expeditionRank = exRank;
      next.ranksUpdatedAt = nowIso();
    }
    if (patch.password !== undefined) {
      if (!isMaster && !isSuperAdmin) throw new Error('입장 비밀번호 변경은 길드마스터만 가능합니다.');
      if (!String(patch.password).trim()) throw new Error('비밀번호를 입력해 주세요.');
      next.passwordHash = await hashPassword(String(patch.password).trim());
    }

    next.updatedAt = nowIso();
    await updateDoc(doc(db, 'hubs', loungeId), next);
    await syncPublicGuild(loungeId, { ...activeLounge, ...next });
    await pushHistory(loungeId, me.nickname, 'update_hub', next.name || activeLounge.name, next.ranksUpdatedAt ? '길드 순위 갱신' : '허브 설정 변경');
  }, [activeLounge, isAdmin, isMaster, isSuperAdmin, loungeId, me, pushHistory]);

  const regenerateInviteCode = useCallback(async () => {
    if (!activeLounge || !me || !loungeId) return;
    if (!isMaster && !isSuperAdmin) throw new Error('초대 코드 재발급은 길드마스터만 가능합니다.');

    const oldCode = activeLounge.inviteCode;
    const inviteCode = await claimInviteIndex(loungeId);

    await updateDoc(doc(db, 'hubs', loungeId), { inviteCode, updatedAt: nowIso() });
    if (oldCode && oldCode !== inviteCode) {
      try { await deleteDoc(doc(db, 'inviteIndex', oldCode)); } catch { /* ignore */ }
    }
    await pushHistory(loungeId, me.nickname, 'regen_invite', inviteCode, '초대 코드 재발급');
    return inviteCode;
  }, [activeLounge, isMaster, isSuperAdmin, loungeId, me, pushHistory]);

  const kickMember = useCallback(async (memberId) => {
    if (!activeLounge || !me || !loungeId) return;
    if (!canManageMembers) throw new Error('추방 권한이 없습니다.');
    const target = members.find(m => m.id === memberId);
    if (!target) return;
    if (target.role === 'master') throw new Error('길드마스터는 추방할 수 없습니다.');
    if (me.role === 'admin' && target.role === 'admin') throw new Error('관리자는 다른 관리자를 추방할 수 없습니다.');

    await deleteDoc(doc(db, 'hubs', loungeId, 'members', memberId));
    try { await deleteDoc(doc(db, 'hubs', loungeId, 'scores', memberId)); } catch { /* ignore */ }
    await pushHistory(loungeId, me.nickname, 'kick', target.nickname, '멤버 추방');
  }, [activeLounge, canManageMembers, loungeId, me, members, pushHistory]);

  const appointAdmin = useCallback(async (memberId) => {
    if (!activeLounge || !me || !loungeId) return;
    if (!canAppointAdmin) throw new Error('관리자 임명은 길드마스터만 가능합니다.');
    const target = members.find(m => m.id === memberId);
    if (!target) return;
    if (target.role === 'master') return;
    const adminCount = members.filter(m => m.role === 'master' || m.role === 'admin').length;
    if (target.role !== 'admin' && adminCount >= MAX_ADMINS) {
      throw new Error(`관리자는 길드마스터 포함 최대 ${MAX_ADMINS}명입니다.`);
    }
    await updateDoc(doc(db, 'hubs', loungeId, 'members', memberId), { role: 'admin' });
    await pushHistory(loungeId, me.nickname, 'appoint_admin', target.nickname, '관리자 임명');
  }, [activeLounge, canAppointAdmin, loungeId, me, members, pushHistory]);

  const revokeAdmin = useCallback(async (memberId) => {
    if (!activeLounge || !me || !loungeId) return;
    if (!canAppointAdmin) throw new Error('관리자 해제는 길드마스터만 가능합니다.');
    const target = members.find(m => m.id === memberId);
    if (!target || target.role !== 'admin') return;
    await updateDoc(doc(db, 'hubs', loungeId, 'members', memberId), { role: 'member' });
    await pushHistory(loungeId, me.nickname, 'revoke_admin', target.nickname, '관리자 해제');
  }, [activeLounge, canAppointAdmin, loungeId, me, members, pushHistory]);

  const transferMaster = useCallback(async (memberId) => {
    if (!activeLounge || !me || !loungeId) return;
    if (!isMaster) throw new Error('길드마스터만 위임할 수 있습니다.');
    if (memberId === me.id) throw new Error('자기 자신에게는 위임할 수 없습니다.');
    const target = members.find(m => m.id === memberId);
    if (!target) throw new Error('대상 멤버를 찾을 수 없습니다.');

    const nextMyRole = (target.role === 'member'
      && members.filter(m => m.role === 'master' || m.role === 'admin').length >= MAX_ADMINS)
      ? 'member'
      : 'admin';

    await updateDoc(doc(db, 'hubs', loungeId, 'members', memberId), { role: 'master' });
    await updateDoc(doc(db, 'hubs', loungeId, 'members', me.id), { role: nextMyRole });
    await updateDoc(doc(db, 'hubs', loungeId), { masterId: memberId, updatedAt: nowIso() });
    await pushHistory(loungeId, me.nickname, 'transfer_master', target.nickname, '길드마스터 위임');
  }, [activeLounge, isMaster, loungeId, me, members, pushHistory]);

  const updateMyNickname = useCallback(async (nickname) => {
    if (!activeLounge || !me || !loungeId || !authUser) return;
    const nick = String(nickname || '').trim();
    if (!nick) throw new Error('닉네임을 입력해 주세요.');
    const taken = members.some(m => m.id !== me.id && String(m.nickname || '').trim().toLowerCase() === nick.toLowerCase());
    if (taken) throw new Error('이미 사용 중인 닉네임입니다.');
    await updateDoc(doc(db, 'hubs', loungeId, 'members', authUser.uid), {
      nickname: nick,
      lastActiveAt: nowIso(),
    });
    await pushHistory(loungeId, nick, 'rename', nick, '닉네임 변경');
  }, [activeLounge, authUser, loungeId, me, members, pushHistory]);

  const addNotice = useCallback(async ({ title, body, images = [] }) => {
    if (!activeLounge || !me || !loungeId) return;
    if (!canPostNotice) throw new Error('공지 작성은 관리자만 가능합니다.');
    if (isRateLimited('addNotice', { maxCalls: 3, windowMs: 60_000 })) throw new Error('너무 빠르게 작성하고 있습니다. 잠시 후 다시 시도해 주세요.');
    const safeTitle = sanitizeText(title, 50);
    const safeBody = sanitizeText(body, 2000);
    if (!safeTitle || !safeBody) throw new Error('제목과 내용을 입력해 주세요.');
    const safeImages = sanitizeFeedImages(images);
    const id = uid('notice');
    await setDoc(doc(db, 'hubs', loungeId, 'notices', id), {
      author: me.nickname,
      authorId: me.id,
      title: safeTitle,
      body: safeBody,
      images: safeImages,
      createdAt: nowIso(),
    });
    await pushHistory(loungeId, me.nickname, 'notice', title.trim(), '공지 등록');
  }, [activeLounge, canPostNotice, loungeId, me, pushHistory]);

  const addPost = useCallback(async ({ title, body, images = [] }) => {
    if (!activeLounge || !me || !loungeId) return;
    if (isRateLimited('addPost', { maxCalls: 5, windowMs: 60_000 })) throw new Error('너무 빠르게 작성하고 있습니다. 잠시 후 다시 시도해 주세요.');
    const safeTitle = sanitizeText(title, 50);
    const safeBody = sanitizeText(body, 2000);
    if (!safeTitle || !safeBody) throw new Error('제목과 내용을 입력해 주세요.');
    const safeImages = sanitizeFeedImages(images);
    const id = uid('post');
    await setDoc(doc(db, 'hubs', loungeId, 'posts', id), {
      author: me.nickname,
      authorId: me.id,
      title: safeTitle,
      body: safeBody,
      images: safeImages,
      createdAt: nowIso(),
    });
    await pushHistory(loungeId, me.nickname, 'post', title.trim(), '게시글 작성');
  }, [activeLounge, loungeId, me, pushHistory]);

  const canDeleteFeedItem = useCallback((item) => {
    if (!me || !item) return false;
    if (isAdmin) return true;
    if (item.authorId && item.authorId === me.id) return true;
    if (!item.authorId && item.author === me.nickname) return true;
    return false;
  }, [isAdmin, me]);

  const deleteNotice = useCallback(async (noticeId) => {
    if (!activeLounge || !me || !loungeId) return;
    const item = notices.find(n => n.id === noticeId);
    if (!item) return;
    if (!canDeleteFeedItem(item)) throw new Error('삭제 권한이 없습니다.');
    await deleteDoc(doc(db, 'hubs', loungeId, 'notices', noticeId));
    await pushHistory(loungeId, me.nickname, 'delete_notice', item.title, '공지 삭제');
  }, [activeLounge, canDeleteFeedItem, loungeId, me, notices, pushHistory]);

  const deletePost = useCallback(async (postId) => {
    if (!activeLounge || !me || !loungeId) return;
    const item = posts.find(p => p.id === postId);
    if (!item) return;
    if (!canDeleteFeedItem(item)) throw new Error('삭제 권한이 없습니다.');
    await deleteDoc(doc(db, 'hubs', loungeId, 'posts', postId));
    await pushHistory(loungeId, me.nickname, 'delete_post', item.title, '게시글 삭제');
  }, [activeLounge, canDeleteFeedItem, loungeId, me, posts, pushHistory]);

  const logBuildHistory = useCallback((action, target, detail = '') => {
    if (!activeLounge || !me || !loungeId) return;
    pushHistory(loungeId, me.nickname, action, target, detail);
  }, [activeLounge, loungeId, me, pushHistory]);

  const updateScore = useCallback(async (memberId, patch) => {
    if (!activeLounge || !canManageMembers || !loungeId) return;
    const member = members.find(m => m.id === memberId);
    const prev = scoresMap[memberId] || {
      nickname: member?.nickname || '',
      siegeScore: 0,
      expeditionDmg: 0,
      arenaScore: 0,
      totalwarScore: 0,
    };
    await setDoc(doc(db, 'hubs', loungeId, 'scores', memberId), { ...prev, ...patch }, { merge: true });
  }, [activeLounge, canManageMembers, loungeId, members, scoresMap]);

  const loungeNotices = notices;
  const loungePosts = posts;
  const loungeHistory = history;
  const loungeScores = useMemo(() => {
    const base = emptyScoresForMembers(members);
    return base.map(s => ({ ...s, ...(scoresMap[s.memberId] || {}) }));
  }, [members, scoresMap]);

  const findLoungeByCode = useCallback(async (code) => {
    const c = parseInviteCode(code);
    if (!c) return null;
    const snap = await getDoc(doc(db, 'inviteIndex', c));
    if (!snap.exists()) return null;
    return { inviteCode: c, id: snap.data().hubId };
  }, []);

  const value = {
    authReady,
    bootError,
    authUser,
    hubRecovering,
    usingEmulators,
    useGoogleAuth: useGoogleForHub,
    signInWithGoogle,
    signOutAccount,
    freshInvite,
    dismissFreshInvite: () => setFreshInvite(null),
    lounges: activeLounge ? [activeLounge] : [],
    session,
    activeLounge,
    me,
    myRole,
    isMaster,
    isAdmin,
    isSuperAdmin,
    canManageMembers,
    canPostNotice,
    canEditBuilds,
    canAppointAdmin,
    loungeNotices,
    loungePosts,
    loungeHistory,
    loungeScores,
    affiliations: LOUNGE_AFFILIATIONS,
    tags: LOUNGE_TAGS,
    maxTags: MAX_LOUNGE_TAGS,
    maxAdmins: MAX_ADMINS,
    maxMembers: MAX_HUB_MEMBERS,
    createLounge,
    joinLounge,
    leaveLounge,
    enterHubAsSuperAdmin,
    updateHubSettings,
    regenerateInviteCode,
    kickMember,
    appointAdmin,
    revokeAdmin,
    transferMaster,
    updateMyNickname,
    addNotice,
    addPost,
    deleteNotice,
    deletePost,
    canDeleteFeedItem,
    logBuildHistory,
    updateScore,
    findLoungeByCode,
    emblems: HUB_EMBLEMS,
  };

  return <LoungeContext.Provider value={value}>{children}</LoungeContext.Provider>;
}
