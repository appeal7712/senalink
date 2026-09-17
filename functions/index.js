const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { onDocumentCreated, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');

initializeApp();

const REGION = 'asia-northeast3';
const HUB_IDLE_DAYS = 60;
const HUB_IDLE_MS = HUB_IDLE_DAYS * 24 * 60 * 60 * 1000;
const MAX_HUB_MEMBERS = 30;
const MAX_ALLIANCE_GUESTS = 3;
const SUBCOLLECTIONS = ['members', 'history', 'notices', 'posts', 'scores', 'builds', 'allianceGuests'];

const ONE_HUB_MSG = '이미 길드 허브에 소속되어 있습니다. 다른 허브로 가려면 먼저 현재 허브에서 나가 주세요.';
const NEED_NICKNAME_MSG = '먼저 마이페이지에서 닉네임을 설정해 주세요.';
const NICK_TAKEN_MSG = '이 허브에 같은 닉네임을 쓰는 사람이 있습니다. 마이페이지에서 닉네임을 바꿔 주세요.';
const ALLIANCE_ADMIN_MSG = '연합은 길드마스터·관리자만 다룰 수 있습니다.';
const ALLIANCE_FULL_MSG = `연합 게스트 허브는 최대 ${MAX_ALLIANCE_GUESTS}개까지입니다.`;
const ALLIANCE_ALREADY_HOST_MSG = '이미 연합 호스트입니다. 게스트로 다른 허브에 연결할 수 없습니다.';
const ALLIANCE_ALREADY_GUEST_MSG = '이미 다른 연합에 연결되어 있습니다. 먼저 연합을 해제해 주세요.';
const ALLIANCE_SELF_MSG = '자기 허브에는 연합으로 연결할 수 없습니다.';

const db = getFirestore();

function nowIso() {
  return new Date().toISOString();
}

/** 클라이언트 parseInviteCode 와 동일 규칙 (functions는 src를 import 하지 않음). */
function parseInviteCode(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';
  const fromQuery = text.match(/[?&]lounge=([^&\s#]+)/i);
  if (fromQuery?.[1]) {
    try {
      return decodeURIComponent(fromQuery[1]).trim().toUpperCase();
    } catch {
      return fromQuery[1].trim().toUpperCase();
    }
  }
  const fromPattern = text.match(/7K-[A-Z0-9]{4}-[A-Z0-9]{4}/i);
  if (fromPattern?.[0]) return fromPattern[0].toUpperCase();
  const compact = text.toUpperCase().replace(/\s+/g, '');
  if (/^7K-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(compact)) return compact;
  return '';
}

/** 연합 코드 7A-XXXX-XXXX */
function parseAllianceCode(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';
  const fromPattern = text.match(/7A-[A-Z0-9]{4}-[A-Z0-9]{4}/i);
  if (fromPattern?.[0]) return fromPattern[0].toUpperCase();
  const compact = text.toUpperCase().replace(/\s+/g, '');
  if (/^7A-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(compact)) return compact;
  return '';
}

function randomAllianceChunk() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 4; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function makeAllianceCode() {
  return `7A-${randomAllianceChunk()}-${randomAllianceChunk()}`;
}

async function claimAllianceIndex(hostHubId, preferredCode) {
  let code = preferredCode || makeAllianceCode();
  for (let i = 0; i < 12; i += 1) {
    const ref = db.doc(`allianceIndex/${code}`);
    try {
      await ref.create({ hostHubId });
      return code;
    } catch (err) {
      code = makeAllianceCode();
    }
  }
  throw new HttpsError('resource-exhausted', '연합 코드를 발급하지 못했습니다. 잠시 후 다시 시도해 주세요.');
}

async function assertHubAdmin(uid, hubId) {
  const adminSnap = await db.doc(`admins/${uid}`).get();
  if (adminSnap.data()?.role === 'super') return { role: 'super', isSuper: true };
  const memberSnap = await db.doc(`hubs/${hubId}/members/${uid}`).get();
  if (!memberSnap.exists) {
    throw new HttpsError('permission-denied', ALLIANCE_ADMIN_MSG);
  }
  const role = String(memberSnap.data()?.role || '');
  if (role !== 'master' && role !== 'admin') {
    throw new HttpsError('permission-denied', ALLIANCE_ADMIN_MSG);
  }
  return { role, isSuper: false };
}

async function clearGuestAlliancePointer(guestHubId, expectedHostId) {
  const guestRef = db.doc(`hubs/${guestHubId}`);
  const snap = await guestRef.get();
  if (!snap.exists) return;
  const data = snap.data() || {};
  if (expectedHostId && data.allianceHostId && data.allianceHostId !== expectedHostId) return;
  await guestRef.set({
    allianceHostId: null,
    allianceHostName: null,
    updatedAt: nowIso(),
  }, { merge: true });
}

async function unlinkAllianceGuest(hostHubId, guestHubId) {
  const guestRef = db.doc(`hubs/${hostHubId}/allianceGuests/${guestHubId}`);
  await guestRef.delete().catch(() => {});
  await clearGuestAlliancePointer(guestHubId, hostHubId);
}

async function clearHostAlliance(hubId, hubData) {
  const code = String(hubData?.allianceCode || '').trim();
  if (code) {
    try { await db.doc(`allianceIndex/${code}`).delete(); } catch (err) {
      logger.warn('allianceIndex delete', hubId, err);
    }
  }
  const guestsSnap = await db.collection(`hubs/${hubId}/allianceGuests`).get();
  await Promise.all(guestsSnap.docs.map(async (d) => {
    await clearGuestAlliancePointer(d.id, hubId);
  }));
  // allianceGuests collection deleted via SUBCOLLECTIONS in wipeHub
}

async function clearAsGuestAlliance(hubId, hubData) {
  const hostId = String(hubData?.allianceHostId || '').trim();
  if (!hostId) return;
  try {
    await db.doc(`hubs/${hostId}/allianceGuests/${hubId}`).delete();
  } catch (err) {
    logger.warn('guest link delete on wipe', hubId, hostId, err);
  }
}

function activityMs(data) {
  const raw = data?.lastActivityAt || data?.updatedAt || data?.createdAt;
  const t = Date.parse(raw || '');
  return Number.isFinite(t) ? t : 0;
}

async function clearUserHub(uid, hubId) {
  if (!uid) return;
  const ref = db.doc(`users/${uid}`);
  const snap = await ref.get();
  if (!snap.exists) return;
  if ((snap.data()?.hubId || null) !== hubId) return;
  await ref.set({ hubId: null, updatedAt: nowIso() }, { merge: true });
}

async function deleteQueryBatch(query) {
  const snap = await query.get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

async function deleteCollection(colRef) {
  for (;;) {
    const n = await deleteQueryBatch(colRef.limit(200));
    if (n === 0) break;
  }
}

async function wipeHub(hubId) {
  const hubRef = db.doc(`hubs/${hubId}`);
  const hubSnap = await hubRef.get();
  if (!hubSnap.exists) return { ok: false, reason: 'missing' };

  const hubData = hubSnap.data() || {};
  const inviteCode = hubData.inviteCode || null;
  const membersSnap = await hubRef.collection('members').get();
  const memberUids = membersSnap.docs.map((d) => d.id);

  await Promise.all(memberUids.map((uid) => clearUserHub(uid, hubId)));

  // 호스트·게스트 연합 링크 정리 (서브컬렉션 삭제 전)
  await clearAsGuestAlliance(hubId, hubData);
  await clearHostAlliance(hubId, hubData);

  for (const name of SUBCOLLECTIONS) {
    await deleteCollection(hubRef.collection(name));
  }

  if (inviteCode) {
    try { await db.doc(`inviteIndex/${inviteCode}`).delete(); } catch (err) {
      logger.warn('inviteIndex delete', hubId, err);
    }
  }

  try { await db.doc(`publicGuilds/${hubId}`).delete(); } catch (err) {
    logger.warn('publicGuilds delete', hubId, err);
  }

  await hubRef.delete();

  try {
    // 신규 경로 byUser/{uid}/mark.jpg + 레거시 mark.jpg 포함 전부 삭제
    await getStorage().bucket().deleteFiles({ prefix: `hubEmblems/${hubId}/` });
  } catch (err) {
    logger.warn('emblem prefix delete', hubId, err);
    try {
      await getStorage().bucket().file(`hubEmblems/${hubId}/mark.jpg`).delete({ ignoreNotFound: true });
    } catch (err2) {
      logger.warn('emblem legacy delete', hubId, err2);
    }
  }

  return { ok: true, members: memberUids.length };
}

async function listIdleHubIds() {
  const cutoff = Date.now() - HUB_IDLE_MS;
  const idle = [];
  let last = null;
  for (;;) {
    let q = db.collection('hubs').orderBy('__name__').limit(100);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;
    for (const d of snap.docs) {
      const data = d.data() || {};
      if (!data.lastActivityAt) {
        // 기존 허브: 시계를 지금으로 심어서, 함수를 켠 날부터 60일을 준다.
        try {
          await d.ref.update({ lastActivityAt: nowIso() });
        } catch (err) {
          logger.warn('lastActivityAt backfill failed', d.id, err);
        }
        continue;
      }
      if (activityMs(data) < cutoff) idle.push(d.id);
    }
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < 100) break;
  }
  return idle;
}

exports.onHubHistoryCreated = onDocumentCreated(
  { document: 'hubs/{hubId}/history/{histId}', region: REGION },
  async (event) => {
    const hubId = event.params.hubId;
    const createdAt = event.data?.data()?.createdAt || nowIso();
    try {
      await db.doc(`hubs/${hubId}`).update({ lastActivityAt: createdAt, updatedAt: createdAt });
    } catch (err) {
      logger.warn('lastActivityAt bump failed', hubId, err);
    }
  },
);

exports.onHubMemberDeleted = onDocumentDeleted(
  { document: 'hubs/{hubId}/members/{uid}', region: REGION },
  async (event) => {
    await clearUserHub(event.params.uid, event.params.hubId);
  },
);

exports.disbandHub = onCall({ region: REGION }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }
  const hubId = String(request.data?.hubId || '').trim();
  if (!hubId) {
    throw new HttpsError('invalid-argument', '허브를 확인할 수 없습니다.');
  }

  const uid = request.auth.uid;
  const adminSnap = await db.doc(`admins/${uid}`).get();
  const isSuper = adminSnap.data()?.role === 'super';
  const memberSnap = await db.doc(`hubs/${hubId}/members/${uid}`).get();
  const membersSnap = await db.collection(`hubs/${hubId}/members`).get();
  const isLastMember = memberSnap.exists && membersSnap.size <= 1;

  if (!isSuper && !isLastMember) {
    throw new HttpsError(
      'failed-precondition',
      '허브 해체는 마지막 남은 멤버(또는 슈퍼관리자)만 할 수 있습니다. 길드마스터는 나가기 전에 마스터를 위임해 주세요.',
    );
  }

  const result = await wipeHub(hubId);
  if (!result.ok) {
    throw new HttpsError('not-found', '이미 없는 허브입니다.');
  }
  return { hubId, wiped: true };
});

/**
 * 로그인 계정이 실제 멤버인 허브를 찾아 users.hubId 를 복구한다.
 * 1) members.uid 컬렉션 그룹 조회 (신규·백필된 문서)
 * 2) 없으면 허브 페이지 단위 멤버십 확인 (구형 문서 폴백)
 */
async function findHubIdForMember(uid) {
  try {
    const cg = await db.collectionGroup('members').where('uid', '==', uid).limit(3).get();
    for (const d of cg.docs) {
      const parts = d.ref.path.split('/');
      // hubs/{hubId}/members/{uid}
      if (parts.length >= 4 && parts[0] === 'hubs' && parts[2] === 'members' && parts[3] === uid) {
        return parts[1];
      }
    }
  } catch (err) {
    logger.warn('resolveMyHub collectionGroup', uid, err);
  }

  let last = null;
  for (;;) {
    let q = db.collection('hubs').orderBy('__name__').limit(40).select();
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;

    const checks = await Promise.all(snap.docs.map(async (hubDoc) => {
      const memberSnap = await db.doc(`hubs/${hubDoc.id}/members/${uid}`).get();
      return memberSnap.exists ? hubDoc.id : null;
    }));
    const found = checks.find(Boolean);
    if (found) {
      try {
        await db.doc(`hubs/${found}/members/${uid}`).set({ uid }, { merge: true });
      } catch (err) {
        logger.warn('resolveMyHub uid backfill', found, uid, err);
      }
      return found;
    }

    last = snap.docs[snap.docs.length - 1];
    if (snap.size < 40) break;
  }
  return null;
}

exports.resolveMyHub = onCall({ region: REGION }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }
  const uid = request.auth.uid;
  const userRef = db.doc(`users/${uid}`);
  const userSnap = await userRef.get();
  const pointed = String(userSnap.data()?.hubId || '').trim();

  if (pointed) {
    const memberSnap = await db.doc(`hubs/${pointed}/members/${uid}`).get();
    if (memberSnap.exists) {
      if (memberSnap.data()?.uid !== uid) {
        try {
          await memberSnap.ref.set({ uid }, { merge: true });
        } catch (err) {
          logger.warn('resolveMyHub pointed uid backfill', pointed, err);
        }
      }
      return { hubId: pointed, restored: false };
    }
  }

  const hubId = await findHubIdForMember(uid);
  if (hubId) {
    await userRef.set({ hubId, updatedAt: nowIso() }, { merge: true });
    logger.info('resolveMyHub restored', { uid, hubId });
    return { hubId, restored: true };
  }

  if (pointed) {
    await userRef.set({ hubId: null, updatedAt: nowIso() }, { merge: true });
  }
  return { hubId: null, restored: false };
});

/**
 * 초대 코드로 허브 가입. Admin SDK 트랜잭션으로 초대·정원·닉네임·1인1허브를 강제한다.
 * 클라이언트는 members role:member create 를 할 수 없다 (firestore.rules).
 */
exports.joinHub = onCall({ region: REGION }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }

  const uid = request.auth.uid;
  const code = parseInviteCode(request.data?.inviteCode);
  if (!code) {
    throw new HttpsError('invalid-argument', '초대 코드를 확인할 수 없습니다. 코드 또는 초대 링크를 붙여넣어 주세요.');
  }

  const indexRef = db.doc(`inviteIndex/${code}`);
  const userRef = db.doc(`users/${uid}`);
  const ts = nowIso();

  try {
    return await db.runTransaction(async (tx) => {
      const indexSnap = await tx.get(indexRef);
      if (!indexSnap.exists) {
        throw new HttpsError('not-found', '초대 코드를 찾을 수 없습니다.');
      }
      const hubId = String(indexSnap.data()?.hubId || '').trim();
      if (!hubId) {
        throw new HttpsError('not-found', '초대 코드를 찾을 수 없습니다.');
      }

      const hubRef = db.doc(`hubs/${hubId}`);
      const hubSnap = await tx.get(hubRef);
      if (!hubSnap.exists) {
        throw new HttpsError('not-found', '허브를 찾을 수 없습니다.');
      }
      const hubInvite = String(hubSnap.data()?.inviteCode || '').trim().toUpperCase();
      if (hubInvite !== code) {
        throw new HttpsError('failed-precondition', '초대 코드가 만료되었거나 변경되었습니다. 새 코드를 받아 주세요.');
      }

      const userSnap = await tx.get(userRef);
      const userData = userSnap.exists ? (userSnap.data() || {}) : {};
      const nick = String(userData.nickname || '').trim();
      if (nick.length < 2) {
        throw new HttpsError('failed-precondition', NEED_NICKNAME_MSG);
      }

      const currentHubId = userData.hubId || null;
      if (currentHubId && currentHubId !== hubId) {
        // 좀비 hubId(허브 없음·멤버십 없음)면 가입 허용 — 아래 user 쓰기가 덮어씀
        const staleHubRef = db.doc(`hubs/${currentHubId}`);
        const staleHubSnap = await tx.get(staleHubRef);
        const staleMemberSnap = staleHubSnap.exists
          ? await tx.get(staleHubRef.collection('members').doc(uid))
          : null;
        if (staleMemberSnap?.exists) {
          throw new HttpsError('failed-precondition', ONE_HUB_MSG);
        }
      }

      const memberRef = hubRef.collection('members').doc(uid);
      const memberSnap = await tx.get(memberRef);
      const membersSnap = await tx.get(hubRef.collection('members'));

      if (memberSnap.exists) {
        const mine = memberSnap.data() || {};
        const nickTaken = membersSnap.docs.some((d) => (
          d.id !== uid
          && String(d.data()?.nickname || '').trim().toLowerCase() === nick.toLowerCase()
        ));
        if (nickTaken) {
          throw new HttpsError('failed-precondition', NICK_TAKEN_MSG);
        }
        const patch = { lastActiveAt: ts, nickname: nick };
        const avatarUrl = userData.photoURL || null;
        if (avatarUrl) patch.avatarURL = avatarUrl;
        tx.update(memberRef, patch);
        tx.set(userRef, { hubId, updatedAt: ts }, { merge: true });
        return { hubId, rejoined: true };
      }

      if (membersSnap.size >= MAX_HUB_MEMBERS) {
        throw new HttpsError('resource-exhausted', `길드 허브는 최대 ${MAX_HUB_MEMBERS}명까지입니다.`);
      }
      const nickTaken = membersSnap.docs.some((d) => (
        String(d.data()?.nickname || '').trim().toLowerCase() === nick.toLowerCase()
      ));
      if (nickTaken) {
        throw new HttpsError('failed-precondition', NICK_TAKEN_MSG);
      }

      const joinData = {
        uid,
        nickname: nick,
        role: 'member',
        joinedAt: ts,
        lastActiveAt: ts,
      };
      const avatarUrl = userData.photoURL || null;
      if (avatarUrl) joinData.avatarURL = avatarUrl;

      tx.set(memberRef, joinData);
      tx.set(userRef, { hubId, updatedAt: ts }, { merge: true });
      tx.set(hubRef.collection('history').doc(), {
        actor: nick,
        action: 'join',
        target: nick,
        detail: '허브 입장',
        createdAt: ts,
      });

      return { hubId, rejoined: false };
    });
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    logger.error('joinHub failed', code, err);
    throw new HttpsError('internal', '가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
  }
});

exports.purgeIdleHubs = onSchedule(
  {
    schedule: '0 4 * * *',
    timeZone: 'Asia/Seoul',
    region: REGION,
    retryCount: 1,
  },
  async () => {
    const idle = await listIdleHubIds();
    let wiped = 0;
    for (const hubId of idle) {
      try {
        const result = await wipeHub(hubId);
        if (result.ok) wiped += 1;
      } catch (err) {
        logger.error('idle hub wipe failed', hubId, err);
      }
    }
    logger.info(`purgeIdleHubs: scanned idle=${idle.length} wiped=${wiped}`);
    return { idle: idle.length, wiped };
  },
);

/**
 * 연합 만들기 — 호스트 허브 master/admin.
 * users.hubId / members 불변. 코드만 발급.
 */
exports.createAlliance = onCall({ region: REGION }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }
  const uid = request.auth.uid;
  const userSnap = await db.doc(`users/${uid}`).get();
  const hubId = String(userSnap.data()?.hubId || '').trim();
  if (!hubId) {
    throw new HttpsError('failed-precondition', '소속 허브가 없습니다.');
  }
  await assertHubAdmin(uid, hubId);

  const hubRef = db.doc(`hubs/${hubId}`);
  const hubSnap = await hubRef.get();
  if (!hubSnap.exists) {
    throw new HttpsError('not-found', '허브를 찾을 수 없습니다.');
  }
  const hubData = hubSnap.data() || {};
  if (hubData.allianceHostId) {
    throw new HttpsError('failed-precondition', ALLIANCE_ALREADY_GUEST_MSG);
  }

  const ts = nowIso();
  let code = String(hubData.allianceCode || '').trim().toUpperCase();
  if (hubData.allianceEnabled && code) {
    const idx = await db.doc(`allianceIndex/${code}`).get();
    if (idx.exists && idx.data()?.hostHubId === hubId) {
      return { hubId, allianceCode: code, already: true };
    }
  }

  if (code) {
    try { await db.doc(`allianceIndex/${code}`).delete(); } catch (_) { /* ignore */ }
  }
  code = await claimAllianceIndex(hubId);
  await hubRef.set({
    allianceEnabled: true,
    allianceCode: code,
    allianceUpdatedAt: ts,
    allianceHostId: null,
    allianceHostName: null,
    updatedAt: ts,
  }, { merge: true });

  return { hubId, allianceCode: code, already: false };
});

/** 연합 코드로 게스트 허브 연결 — 호출자 hub 유지, 읽기만 */
exports.joinAlliance = onCall({ region: REGION }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }
  const uid = request.auth.uid;
  const code = parseAllianceCode(request.data?.allianceCode || request.data?.code);
  if (!code) {
    throw new HttpsError('invalid-argument', '연합 코드를 확인할 수 없습니다. (예: 7A-XXXX-XXXX)');
  }

  const userSnap = await db.doc(`users/${uid}`).get();
  const guestHubId = String(userSnap.data()?.hubId || '').trim();
  if (!guestHubId) {
    throw new HttpsError('failed-precondition', '소속 허브가 없습니다. 먼저 허브에 가입해 주세요.');
  }
  await assertHubAdmin(uid, guestHubId);

  const indexSnap = await db.doc(`allianceIndex/${code}`).get();
  if (!indexSnap.exists) {
    throw new HttpsError('not-found', '연합 코드를 찾을 수 없습니다.');
  }
  const hostHubId = String(indexSnap.data()?.hostHubId || '').trim();
  if (!hostHubId) {
    throw new HttpsError('not-found', '연합 코드를 찾을 수 없습니다.');
  }
  if (hostHubId === guestHubId) {
    throw new HttpsError('failed-precondition', ALLIANCE_SELF_MSG);
  }

  const hostRef = db.doc(`hubs/${hostHubId}`);
  const guestRef = db.doc(`hubs/${guestHubId}`);
  const [hostSnap, guestSnap] = await Promise.all([hostRef.get(), guestRef.get()]);
  if (!hostSnap.exists) {
    throw new HttpsError('not-found', '호스트 허브를 찾을 수 없습니다.');
  }
  if (!guestSnap.exists) {
    throw new HttpsError('not-found', '게스트 허브를 찾을 수 없습니다.');
  }

  const hostData = hostSnap.data() || {};
  const guestData = guestSnap.data() || {};
  if (!hostData.allianceEnabled || String(hostData.allianceCode || '').toUpperCase() !== code) {
    throw new HttpsError('failed-precondition', '연합 코드가 만료되었거나 변경되었습니다.');
  }
  if (guestData.allianceEnabled) {
    throw new HttpsError('failed-precondition', ALLIANCE_ALREADY_HOST_MSG);
  }
  const existingHost = String(guestData.allianceHostId || '').trim();
  if (existingHost && existingHost !== hostHubId) {
    throw new HttpsError('failed-precondition', ALLIANCE_ALREADY_GUEST_MSG);
  }
  if (existingHost === hostHubId) {
    return { hostHubId, guestHubId, already: true };
  }

  const guestsSnap = await hostRef.collection('allianceGuests').get();
  if (guestsSnap.size >= MAX_ALLIANCE_GUESTS) {
    throw new HttpsError('resource-exhausted', ALLIANCE_FULL_MSG);
  }

  const ts = nowIso();
  const guestName = String(guestData.name || '게스트 허브').trim().slice(0, 40);
  const hostName = String(hostData.name || '호스트 허브').trim().slice(0, 40);

  await hostRef.collection('allianceGuests').doc(guestHubId).set({
    guestHubId,
    guestName,
    linkedAt: ts,
    linkedByUid: uid,
  });
  await guestRef.set({
    allianceHostId: hostHubId,
    allianceHostName: hostName,
    updatedAt: ts,
  }, { merge: true });

  return { hostHubId, guestHubId, hostName, already: false };
});

/** 게스트 측 연합 해제 */
exports.leaveAlliance = onCall({ region: REGION }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }
  const uid = request.auth.uid;
  const userSnap = await db.doc(`users/${uid}`).get();
  const guestHubId = String(userSnap.data()?.hubId || '').trim();
  if (!guestHubId) {
    throw new HttpsError('failed-precondition', '소속 허브가 없습니다.');
  }
  await assertHubAdmin(uid, guestHubId);

  const guestSnap = await db.doc(`hubs/${guestHubId}`).get();
  if (!guestSnap.exists) {
    throw new HttpsError('not-found', '허브를 찾을 수 없습니다.');
  }
  const hostHubId = String(guestSnap.data()?.allianceHostId || '').trim();
  if (!hostHubId) {
    return { ok: true, already: true };
  }
  await unlinkAllianceGuest(hostHubId, guestHubId);
  return { ok: true, hostHubId, guestHubId };
});

/** 호스트가 특정 게스트 끊기 */
exports.revokeAllianceGuest = onCall({ region: REGION }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }
  const uid = request.auth.uid;
  const guestHubId = String(request.data?.guestHubId || '').trim();
  if (!guestHubId) {
    throw new HttpsError('invalid-argument', '게스트 허브를 확인할 수 없습니다.');
  }
  const userSnap = await db.doc(`users/${uid}`).get();
  const hostHubId = String(userSnap.data()?.hubId || '').trim();
  if (!hostHubId) {
    throw new HttpsError('failed-precondition', '소속 허브가 없습니다.');
  }
  await assertHubAdmin(uid, hostHubId);

  const linkSnap = await db.doc(`hubs/${hostHubId}/allianceGuests/${guestHubId}`).get();
  if (!linkSnap.exists) {
    return { ok: true, already: true };
  }
  await unlinkAllianceGuest(hostHubId, guestHubId);
  return { ok: true, hostHubId, guestHubId };
});

/** 호스트 연합 코드 재발급 (master 또는 super) */
exports.regenAllianceCode = onCall({ region: REGION }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }
  const uid = request.auth.uid;
  const userSnap = await db.doc(`users/${uid}`).get();
  const hubId = String(userSnap.data()?.hubId || '').trim();
  if (!hubId) {
    throw new HttpsError('failed-precondition', '소속 허브가 없습니다.');
  }
  const authz = await assertHubAdmin(uid, hubId);
  if (!authz.isSuper && authz.role !== 'master') {
    throw new HttpsError('permission-denied', '연합 코드 재발급은 길드마스터만 할 수 있습니다.');
  }

  const hubRef = db.doc(`hubs/${hubId}`);
  const hubSnap = await hubRef.get();
  if (!hubSnap.exists) {
    throw new HttpsError('not-found', '허브를 찾을 수 없습니다.');
  }
  const hubData = hubSnap.data() || {};
  if (!hubData.allianceEnabled) {
    throw new HttpsError('failed-precondition', '먼저 연합을 만들어 주세요.');
  }

  const oldCode = String(hubData.allianceCode || '').trim();
  if (oldCode) {
    try { await db.doc(`allianceIndex/${oldCode}`).delete(); } catch (_) { /* ignore */ }
  }
  const code = await claimAllianceIndex(hubId);
  const ts = nowIso();
  await hubRef.set({
    allianceEnabled: true,
    allianceCode: code,
    allianceUpdatedAt: ts,
    updatedAt: ts,
  }, { merge: true });

  return { hubId, allianceCode: code };
});

/**
 * 호스트 연합 종료 — 코드·인덱스·게스트 연결 전부 정리.
 * 잘못 1군으로 연 경우에도 되돌릴 수 있음.
 */
exports.dissolveAlliance = onCall({ region: REGION }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }
  const uid = request.auth.uid;
  const userSnap = await db.doc(`users/${uid}`).get();
  const hubId = String(userSnap.data()?.hubId || '').trim();
  if (!hubId) {
    throw new HttpsError('failed-precondition', '소속 허브가 없습니다.');
  }
  const authz = await assertHubAdmin(uid, hubId);
  if (!authz.isSuper && authz.role !== 'master') {
    throw new HttpsError('permission-denied', '연합 종료는 길드마스터만 할 수 있습니다.');
  }

  const hubRef = db.doc(`hubs/${hubId}`);
  const hubSnap = await hubRef.get();
  if (!hubSnap.exists) {
    throw new HttpsError('not-found', '허브를 찾을 수 없습니다.');
  }
  const hubData = hubSnap.data() || {};
  if (hubData.allianceHostId) {
    throw new HttpsError('failed-precondition', '2군으로 연결된 허브입니다. 「연합 해제」를 사용해 주세요.');
  }
  if (!hubData.allianceEnabled && !hubData.allianceCode) {
    return { ok: true, already: true };
  }

  const guestsSnap = await hubRef.collection('allianceGuests').get();
  await Promise.all(guestsSnap.docs.map((d) => unlinkAllianceGuest(hubId, d.id)));

  const oldCode = String(hubData.allianceCode || '').trim();
  if (oldCode) {
    try { await db.doc(`allianceIndex/${oldCode}`).delete(); } catch (_) { /* ignore */ }
  }

  const ts = nowIso();
  await hubRef.set({
    allianceEnabled: false,
    allianceCode: null,
    allianceUpdatedAt: ts,
    allianceHostId: null,
    allianceHostName: null,
    updatedAt: ts,
  }, { merge: true });

  return { ok: true, hubId, revokedGuests: guestsSnap.size };
});
