import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, storage } from './firebase';

const MARK_SIZE = 256;
const MARK_QUALITY = 0.85;
const MAX_BYTES = 500 * 1024;

/** 같은 경로 덮어쓰기 후 브라우저 캐시를 깨기 위한 쿼리 */
export function withCacheBust(url) {
  if (!url) return url;
  const join = url.includes('?') ? '&' : '?';
  return `${url}${join}v=${Date.now()}`;
}

export function compressEmblemFile(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) {
      reject(new Error('이미지 파일만 올릴 수 있습니다.'));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('이미지는 8MB 이하만 올릴 수 있습니다.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = MARK_SIZE;
        canvas.height = MARK_SIZE;
        const ctx = canvas.getContext('2d');
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, MARK_SIZE, MARK_SIZE);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('이미지를 변환하지 못했습니다.'));
            return;
          }
          if (blob.size > MAX_BYTES) {
            reject(new Error('이미지가 너무 큽니다. 다른 사진을 골라 주세요.'));
            return;
          }
          // Storage 규칙 contentType 검사를 위해 type을 명시
          resolve(new Blob([blob], { type: 'image/jpeg' }));
        }, 'image/jpeg', MARK_QUALITY);
      };
      img.onerror = () => reject(new Error('이미지를 읽지 못했습니다.'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });
}

function mapStorageError(err) {
  const code = err?.code || '';
  if (code === 'storage/unauthorized') {
    return '길드 마크 업로드 권한이 없습니다. 다시 로그인한 뒤 저장해 주세요.';
  }
  if (code === 'storage/canceled') return '업로드가 취소되었습니다.';
  if (code === 'storage/retry-limit-exceeded') return '네트워크가 불안정합니다. 잠시 후 다시 시도해 주세요.';
  if (code === 'storage/quota-exceeded') return '저장 공간이 가득 찼습니다. 관리자에게 문의해 주세요.';
  return err?.message || '길드 마크를 올리지 못했습니다.';
}

/** 마이페이지 프로필과 동일 — 본인 uid 경로 덮어쓰기 */
export async function uploadHubEmblem(hubId, blob) {
  const uid = auth.currentUser?.uid;
  if (!hubId || !blob) throw new Error('길드 마크를 올리지 못했습니다.');
  if (!uid) throw new Error('로그인이 필요합니다. 다시 로그인해 주세요.');

  const fileRef = ref(storage, `hubEmblems/${hubId}/byUser/${uid}/mark.jpg`);
  try {
    await uploadBytes(fileRef, blob, {
      contentType: 'image/jpeg',
      cacheControl: 'public,max-age=60',
    });
    const url = await getDownloadURL(fileRef);
    return withCacheBust(url);
  } catch (err) {
    throw new Error(mapStorageError(err));
  }
}
