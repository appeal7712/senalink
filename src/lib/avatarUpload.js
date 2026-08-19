import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

const MAX_SIZE = 500 * 1024;
const AVATAR_DIM = 256;

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = AVATAR_DIM;
        canvas.height = AVATAR_DIM;
        const ctx = canvas.getContext('2d');
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, AVATAR_DIM, AVATAR_DIM);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('이미지 변환 실패'));
          resolve(blob);
        }, 'image/jpeg', 0.85);
      };
      img.onerror = () => reject(new Error('이미지 로드 실패'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsDataURL(file);
  });
}

export async function uploadAvatar(uid, file) {
  const blob = await resizeImage(file);
  if (blob.size > MAX_SIZE) throw new Error('이미지가 너무 큽니다 (500KB 이하).');
  const storageRef = ref(storage, `userAvatars/${uid}/avatar.jpg`);
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}
