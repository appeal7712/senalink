import { COL } from '../config/firestorePaths';
import { usingEmulators } from './firebase';

/**
 * 에뮬레이터 전용. 규칙상 admins 쓰기는 막혀 있으므로
 * 에뮬레이터 REST + Bearer owner 로만 넣는다. 프로덕션에서는 호출되지 않는다.
 */
export async function seedEmulatorSuperAdmin(uid) {
  if (!usingEmulators) {
    throw new Error('로컬 에뮬레이터에서만 사용할 수 있습니다.');
  }
  if (!uid) {
    throw new Error('로그인된 계정이 없습니다. 잠시 후 다시 시도해 주세요.');
  }

  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('VITE_FIREBASE_PROJECT_ID 가 없습니다.');
  }

  const url = `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/${COL.ADMINS}/${encodeURIComponent(uid)}`;
  const body = {
    fields: {
      role: { stringValue: 'super' },
      seededAt: { stringValue: new Date().toISOString() },
    },
  };

  let res;
  try {
    res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer owner',
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Firestore 에뮬레이터에 연결하지 못했습니다. npm run emulators 가 켜져 있는지 확인해 주세요.');
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? '에뮬레이터 프로젝트 ID가 앱 설정과 다릅니다. Vite를 재시작해 주세요.'
        : `로컬 관리자 등록에 실패했습니다. (${res.status})`,
    );
  }
  if (text && !text.includes('"name"')) {
    throw new Error('에뮬레이터가 아니라 개발 서버가 응답했습니다. npm run emulators 를 확인해 주세요.');
  }
}
