import { toBlob, getFontEmbedCSS } from 'html-to-image';

/** 공유 이미지는 기기 화면과 무관하게 PC 폭으로 고정 */
export const SETTING_CAPTURE_WIDTH = 980;

function skipCapture(node) {
  return !(node instanceof Element && node.classList.contains('no-capture'));
}

let fontEmbedCSS = null;

async function ensureFontCss(node) {
  if (fontEmbedCSS != null) return fontEmbedCSS;
  try {
    fontEmbedCSS = (await getFontEmbedCSS(node)) || '';
  } catch {
    fontEmbedCSS = '';
  }
  return fontEmbedCSS;
}

/** 세팅 확인 열 때 호출하면 첫 공유가 빨라짐 */
export function warmSettingCapture(node) {
  if (!node || fontEmbedCSS != null) return;
  ensureFontCss(node).catch(() => {});
}

function waitFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/** 이미 로드된 원본 img → data URL (작게 리사이즈해 속도와 용량 절약) */
function imageToDataUrl(img, maxSide = 192) {
  if (!(img instanceof HTMLImageElement)) return null;
  if (!img.naturalWidth || !img.naturalHeight) return null;
  try {
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

function buildImageDataCache(sourceRoot) {
  const cache = new Map();
  const imgs = [...(sourceRoot.querySelectorAll?.('img') || [])];
  for (const img of imgs) {
    const key = img.currentSrc || img.src;
    if (!key || cache.has(key)) continue;
    const dataUrl = imageToDataUrl(img);
    if (dataUrl) cache.set(key, dataUrl);
  }
  return cache;
}

function applyImageDataCache(cloneRoot, cache) {
  const imgs = [...(cloneRoot.querySelectorAll?.('img') || [])];
  for (const img of imgs) {
    const key = img.currentSrc || img.src;
    const dataUrl = (key && cache.get(key)) || null;
    if (dataUrl) {
      img.removeAttribute('srcset');
      img.src = dataUrl;
    }
  }
}

function capturePixelRatio() {
  // 모바일은 픽셀 수를 줄여 체감 속도↑ (PC 포맷 폭은 동일)
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches) {
    return 1.25;
  }
  return 1.5;
}

/**
 * 화면 밖 PC 고정폭 클론으로 PNG 생성.
 * 초상화/스킬 아이콘은 원본 모달에서 data URL로 이식해 모바일 빈 캡처를 막는다.
 */
export async function captureNodePng(node) {
  if (!node) throw new Error('캡처할 화면이 없습니다.');

  const imageCache = buildImageDataCache(node);
  const fontCssPromise = ensureFontCss(node);

  const host = document.createElement('div');
  host.className = 'setting-capture-host';
  host.setAttribute('aria-hidden', 'true');

  const clone = node.cloneNode(true);
  clone.classList.add('setting-capture-pc');
  clone.querySelectorAll('.no-capture').forEach((el) => el.remove());
  applyImageDataCache(clone, imageCache);

  const body = clone.querySelector('.setting-overview-body');
  if (body) {
    body.style.maxHeight = 'none';
    body.style.overflow = 'visible';
  }
  clone.style.width = `${SETTING_CAPTURE_WIDTH}px`;
  clone.style.minWidth = `${SETTING_CAPTURE_WIDTH}px`;
  clone.style.maxWidth = `${SETTING_CAPTURE_WIDTH}px`;
  clone.style.maxHeight = 'none';
  clone.style.height = 'auto';

  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    await waitFrame();
    const fontEmbed = await fontCssPromise;
    const height = Math.max(clone.scrollHeight, clone.offsetHeight, 1);
    const pixelRatio = capturePixelRatio();

    const blob = await toBlob(clone, {
      pixelRatio,
      backgroundColor: '#141311',
      filter: skipCapture,
      fontEmbedCSS: fontEmbed,
      skipFonts: !fontEmbed,
      cacheBust: false,
      width: SETTING_CAPTURE_WIDTH,
      height,
      style: {
        transform: 'none',
        margin: '0',
      },
    });
    if (!blob) throw new Error('이미지를 만들지 못했습니다.');
    return blob;
  } finally {
    host.remove();
  }
}

async function writeClipboardPng(blob) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('clipboard unsupported');
  }
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  } catch {
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': Promise.resolve(blob) }),
    ]);
  }
}

function downloadPng(blob, filename = 'setting.png') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * PC 포맷 캡처 후 클립보드 → 공유 시트 → 다운로드
 */
export async function shareSettingPng(node) {
  const blob = await captureNodePng(node);

  try {
    await writeClipboardPng(blob);
    return { method: 'clipboard' };
  } catch {
    /* fall through */
  }

  const file = new File([blob], 'setting.png', { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: '세팅 공유' });
      return { method: 'share' };
    }
  } catch (e) {
    if (e?.name === 'AbortError') return { method: 'cancelled' };
  }

  downloadPng(blob);
  return { method: 'download' };
}

/** @deprecated */
export async function copyNodePng(node) {
  const result = await shareSettingPng(node);
  if (result.method === 'cancelled') throw new Error('공유가 취소되었습니다.');
  return result;
}
