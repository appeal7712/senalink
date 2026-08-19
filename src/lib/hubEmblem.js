import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

const MARK_SIZE = 256;
const MARK_QUALITY = 0.82;

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
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = MARK_SIZE;
      canvas.height = MARK_SIZE;
      const ctx = canvas.getContext('2d');
      const scale = Math.max(MARK_SIZE / img.width, MARK_SIZE / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (MARK_SIZE - w) / 2, (MARK_SIZE - h) / 2, w, h);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) reject(new Error('이미지를 변환하지 못했습니다.'));
        else resolve(blob);
      }, 'image/jpeg', MARK_QUALITY);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 읽지 못했습니다.'));
    };
    img.src = url;
  });
}

export async function uploadHubEmblem(hubId, blob) {
  if (!hubId || !blob) throw new Error('길드 마크를 올리지 못했습니다.');
  const fileRef = ref(storage, `hubEmblems/${hubId}/mark.jpg`);
  await uploadBytes(fileRef, blob, { contentType: 'image/jpeg', cacheControl: 'public,max-age=3600' });
  return getDownloadURL(fileRef);
}
