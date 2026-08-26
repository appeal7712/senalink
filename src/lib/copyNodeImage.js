import { toBlob, getFontEmbedCSS } from 'html-to-image';

/** 공유 이미지는 기기 화면과 무관하게 PC 폭으로 고정 */
export const SETTING_CAPTURE_WIDTH = 980;

function skipCapture(node) {
  return !(node instanceof Element && node.classList.contains('no-capture'));
}

let fontEmbedCSS = null;
/** 세션 동안 URL → dataURL (첫 공유 이후·워밍 재사용) */
const imageDataCache = new Map();
/** 초상 카드 합성 PNG 캐시 */
const portraitCompositeCache = new Map();
let warmPromise = null;

function normalizeImageKey(url) {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  try {
    return new URL(url, typeof window !== 'undefined' ? window.location.href : undefined).href;
  } catch {
    return url;
  }
}

function imgSourceKey(img) {
  if (!(img instanceof HTMLImageElement)) return '';
  return normalizeImageKey(img.currentSrc || img.getAttribute('src') || img.src || '');
}

async function ensureFontCss(node) {
  if (fontEmbedCSS != null) return fontEmbedCSS;
  try {
    fontEmbedCSS = (await getFontEmbedCSS(node)) || '';
  } catch {
    fontEmbedCSS = '';
  }
  return fontEmbedCSS;
}

function waitFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function waitFrames(n = 2) {
  let p = Promise.resolve();
  for (let i = 0; i < n; i += 1) p = p.then(waitFrame);
  return p;
}

function whenImageReady(img) {
  if (!(img instanceof HTMLImageElement)) return Promise.resolve();
  if (img.complete && img.naturalWidth > 0) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => resolve();
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  });
}

/** 이미 로드된 원본 img → data URL */
function imageToDataUrl(img, maxSide = 256) {
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

async function fetchUrlToDataUrl(url) {
  const key = normalizeImageKey(url);
  if (!key) return null;
  if (key.startsWith('data:')) return key;
  try {
    const res = await fetch(key, { cache: 'force-cache', credentials: 'same-origin' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function cacheOneImage(img) {
  const key = imgSourceKey(img);
  if (!key || imageDataCache.has(key)) return imageDataCache.get(key) || null;
  await whenImageReady(img);
  let dataUrl = imageToDataUrl(img);
  if (!dataUrl) dataUrl = await fetchUrlToDataUrl(key);
  if (dataUrl) {
    imageDataCache.set(key, dataUrl);
    return dataUrl;
  }
  return null;
}

/** 원본 모달의 모든 img를 data URL 캐시에 채움 */
async function fillImageDataCache(sourceRoot) {
  const imgs = [...(sourceRoot.querySelectorAll?.('img') || [])];
  await Promise.all(imgs.map((img) => cacheOneImage(img)));
}

function lookupDataUrl(url) {
  const key = normalizeImageKey(url);
  if (!key) return null;
  if (key.startsWith('data:')) return key;
  return imageDataCache.get(key) || null;
}

function applyImageDataCache(cloneRoot) {
  const imgs = [...(cloneRoot.querySelectorAll?.('img') || [])];
  for (const img of imgs) {
    const dataUrl = lookupDataUrl(img.getAttribute('src') || img.src || img.currentSrc);
    if (dataUrl) {
      img.removeAttribute('srcset');
      img.removeAttribute('loading');
      img.src = dataUrl;
    }
  }
}

/**
 * 화면에 이미 뜬 초상 카드를 캔버스로 합성 → 캡처 클론은 단일 img로 교체.
 * (모바일 WebKit이 absolute 마스크 레이어를 빈 칸으로 그리는 문제 해결)
 */
function compositePortraitCard(card) {
  if (!(card instanceof HTMLElement)) return null;
  const bg = card.querySelector('img.hero-portrait-card-bg');
  const icon = card.querySelector('img.hero-portrait-card-icon, .hero-portrait-card-mask img');
  if (!(bg instanceof HTMLImageElement) || !(icon instanceof HTMLImageElement)) return null;
  if (!bg.naturalWidth || !icon.naturalWidth) return null;

  try {
    const maxSide = 160;
    const scale = Math.min(1, maxSide / Math.max(bg.naturalWidth, bg.naturalHeight));
    const w = Math.max(1, Math.round(bg.naturalWidth * scale));
    const h = Math.max(1, Math.round(bg.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(bg, 0, 0, w, h);

    const mx = w * 0.0475;
    const my = h * 0.0375;
    const mw = w * 0.905;
    const mh = h * 0.727;
    ctx.save();
    ctx.beginPath();
    const r = Math.min(mw, mh) * 0.12;
    ctx.moveTo(mx + r, my);
    ctx.arcTo(mx + mw, my, mx + mw, my + mh, r);
    ctx.arcTo(mx + mw, my + mh, mx, my + mh, r);
    ctx.arcTo(mx, my + mh, mx, my, r);
    ctx.arcTo(mx, my, mx + mw, my, r);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(icon, mx, my, mw, mh);
    ctx.restore();

    const badge = card.querySelector('img.hero-portrait-card-badge');
    if (badge instanceof HTMLImageElement && badge.naturalWidth) {
      const bw = w * 0.75;
      const bh = bw * (badge.naturalHeight / badge.naturalWidth);
      ctx.drawImage(badge, w - bw, 0, bw, bh);
    }
    const role = card.querySelector('img.hero-portrait-card-role');
    if (role instanceof HTMLImageElement && role.naturalWidth) {
      const rw = w * 0.28;
      const rh = rw * (role.naturalHeight / role.naturalWidth);
      ctx.drawImage(role, w * 0.06, h * 0.55, rw, rh);
    }
    const star = card.querySelector('img.hero-portrait-card-star');
    if (star instanceof HTMLImageElement && star.naturalWidth) {
      const sw = w * 0.55;
      const sh = sw * (star.naturalHeight / star.naturalWidth);
      ctx.drawImage(star, (w - sw) / 2, h * 0.62, sw, sh);
    }

    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

async function warmPortraitComposites(sourceRoot) {
  const cards = [...(sourceRoot.querySelectorAll?.('.hero-portrait-card') || [])];
  await Promise.all(cards.map(async (card) => {
    const icon = card.querySelector('img.hero-portrait-card-icon, .hero-portrait-card-mask img');
    const bg = card.querySelector('img.hero-portrait-card-bg');
    await Promise.all([whenImageReady(icon), whenImageReady(bg)]);
    const key = imgSourceKey(icon) || `card-${cards.indexOf(card)}`;
    if (portraitCompositeCache.has(key)) return;
    const dataUrl = compositePortraitCard(card);
    if (dataUrl) portraitCompositeCache.set(key, dataUrl);
  }));
}

function replacePortraitsWithComposites(sourceRoot, cloneRoot) {
  const srcCards = [...(sourceRoot.querySelectorAll?.('.hero-portrait-card') || [])];
  const dstCards = [...(cloneRoot.querySelectorAll?.('.hero-portrait-card') || [])];
  dstCards.forEach((dst, i) => {
    const src = srcCards[i];
    if (!src || !(dst instanceof HTMLElement)) return;
    const icon = src.querySelector('img.hero-portrait-card-icon, .hero-portrait-card-mask img');
    const key = imgSourceKey(icon) || `card-${i}`;
    let dataUrl = portraitCompositeCache.get(key);
    if (!dataUrl) {
      dataUrl = compositePortraitCard(src);
      if (dataUrl) portraitCompositeCache.set(key, dataUrl);
    }
    if (!dataUrl) return;

    const widthPx = src.offsetWidth || dst.offsetWidth || 48;
    dst.replaceChildren();
    dst.className = 'hero-portrait-card hero-portrait-card--capture-flat';
    dst.style.width = `${widthPx}px`;
    dst.style.display = 'block';
    dst.style.flexShrink = '0';
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = '';
    img.draggable = false;
    img.style.width = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    dst.appendChild(img);
  });
}

function capturePixelRatio() {
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches) {
    return 1.25;
  }
  return 1.5;
}

/**
 * 세팅 공유 클릭 시(또는 테스트용) 폰트·이미지·초상 합성 준비.
 * 모달 오픈 경로에서는 호출하지 않음 — 오픈 직후 메인 스레드 멈춤 방지.
 * captureNodePng도 동일 작업을 하므로, 미리 부르면 awaitWarm으로 중복만 줄인다.
 */
export function warmSettingCapture(node) {
  if (!node) return;
  warmPromise = (async () => {
    await ensureFontCss(node);
    await fillImageDataCache(node);
    await warmPortraitComposites(node);
  })().catch(() => {});
}

async function awaitWarm() {
  if (warmPromise) {
    try {
      await warmPromise;
    } catch {
      /* ignore */
    }
  }
}

/**
 * 화면 밖 PC 고정폭 클론으로 PNG 생성.
 * 초상은 원본에서 합성한 flat img, 스킬/장비는 data URL 이식으로 모바일 빈 캡처 방지.
 */
export async function captureNodePng(node) {
  if (!node) throw new Error('캡처할 화면이 없습니다.');

  await awaitWarm();
  await fillImageDataCache(node);
  await warmPortraitComposites(node);
  const fontCssPromise = ensureFontCss(node);

  const host = document.createElement('div');
  host.className = 'setting-capture-host';
  host.setAttribute('aria-hidden', 'true');

  const clone = node.cloneNode(true);
  clone.classList.add('setting-capture-pc');
  clone.querySelectorAll('.no-capture').forEach((el) => el.remove());
  applyImageDataCache(clone);
  replacePortraitsWithComposites(node, clone);

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
    await waitFrames(2);
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

/**
 * 클릭 직후 ClipboardItem에 Promise를 넘겨 사용자 제스처를 유지한다.
 */
async function writeClipboardPngFromPromise(blobPromise) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('clipboard unsupported');
  }
  const pngPromise = Promise.resolve(blobPromise).then((blob) => {
    if (!blob) throw new Error('empty blob');
    return blob;
  });
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': pngPromise }),
  ]);
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

/** 노드를 PNG로 저장 (세팅 공유용 PC 강제폭과 분리 — 현재 보드 폭 기준) */
export async function downloadNodePng(node, filename = 'tierlist.png') {
  if (!node) throw new Error('캡처할 화면이 없습니다.');

  await awaitWarm();
  await fillImageDataCache(node);
  await warmPortraitComposites(node);
  const fontCssPromise = ensureFontCss(node);
  const width = Math.max(node.scrollWidth, node.offsetWidth, 720);

  const host = document.createElement('div');
  host.className = 'setting-capture-host';
  host.setAttribute('aria-hidden', 'true');

  const clone = node.cloneNode(true);
  clone.querySelectorAll('.no-capture').forEach((el) => el.remove());
  applyImageDataCache(clone);
  replacePortraitsWithComposites(node, clone);
  clone.style.width = `${width}px`;
  clone.style.maxWidth = `${width}px`;
  clone.style.minWidth = `${width}px`;
  clone.style.maxHeight = 'none';
  clone.style.height = 'auto';

  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    await waitFrames(2);
    const fontEmbed = await fontCssPromise;
    const height = Math.max(clone.scrollHeight, clone.offsetHeight, 1);
    const blob = await toBlob(clone, {
      pixelRatio: capturePixelRatio(),
      backgroundColor: '#141311',
      filter: skipCapture,
      fontEmbedCSS: fontEmbed,
      skipFonts: !fontEmbed,
      cacheBust: false,
      width,
      height,
      style: { transform: 'none', margin: '0' },
    });
    if (!blob) throw new Error('이미지를 만들지 못했습니다.');
    downloadPng(blob, filename);
    return blob;
  } finally {
    host.remove();
  }
}

/**
 * PC 포맷 캡처 후 클립보드 → 공유 시트 → 다운로드
 * (모바일은 보통 클립보드 이미지 미지원 → 다운로드/공유 시트로 가는 것이 정상)
 */
export async function shareSettingPng(node) {
  // 오픈 시 워밍을 안 하므로, 공유 클릭 때 한 번 준비(캡처와 겹치면 awaitWarm으로 합류)
  warmSettingCapture(node);
  const blobPromise = captureNodePng(node);

  try {
    await writeClipboardPngFromPromise(blobPromise);
    await blobPromise;
    return { method: 'clipboard' };
  } catch {
    /* fall through */
  }

  const blob = await blobPromise;

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
