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
const SUBCOLLECTIONS = ['members', 'history', 'notices', 'posts', 'scores', 'builds'];

const ONE_HUB_MSG = '이미 길드 허브에 소속되어 있습니다. 다른 허브로 가려면 먼저 현재 허브에서 나가 주세요.';
const NEED_NICKNAME_MSG = '먼저 마이페이지에서 닉네임을 설정해 주세요.';
const NICK_TAKEN_MSG = '이 허브에 같은 닉네임을 쓰는 사람이 있습니다. 마이페이지에서 닉네임을 바꿔 주세요.';

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

  const inviteCode = hubSnap.data()?.inviteCode || null;
  const membersSnap = await hubRef.collection('members').get();
  const memberUids = membersSnap.docs.map((d) => d.id);

  await Promise.all(memberUids.map((uid) => clearUserHub(uid, hubId)));

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
    await getStorage().bucket().file(`hubEmblems/${hubId}/mark.jpg`).delete({ ignoreNotFound: true });
  } catch (err) {
    logger.warn('emblem delete', hubId, err);
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
