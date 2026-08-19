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
const SUBCOLLECTIONS = ['members', 'history', 'notices', 'posts', 'scores', 'builds'];

const db = getFirestore();

function nowIso() {
  return new Date().toISOString();
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
