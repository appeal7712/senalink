import { toBlob, getFontEmbedCSS } from 'html-to-image';

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

export async function copyNodePng(node) {
  if (!node) throw new Error('캡처할 화면이 없습니다.');

  const expand = [node, node.querySelector?.('.setting-overview-body')].filter(Boolean);
  const restore = expand.map((el) => {
    const prev = { maxHeight: el.style.maxHeight, overflow: el.style.overflow };
    el.style.maxHeight = 'none';
    el.style.overflow = 'visible';
    return () => {
      el.style.maxHeight = prev.maxHeight;
      el.style.overflow = prev.overflow;
    };
  });

  try {
    const blob = await toBlob(node, {
      pixelRatio: 1.5,
      backgroundColor: '#141311',
      filter: skipCapture,
      fontEmbedCSS: await ensureFontCss(node),
      fetchRequestInit: { cache: 'force-cache' },
      width: Math.max(node.scrollWidth, node.offsetWidth),
      height: Math.max(node.scrollHeight, node.offsetHeight),
    });
    if (!blob) throw new Error('이미지를 만들지 못했습니다.');

    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      throw new Error('이 브라우저는 이미지 복사를 지원하지 않습니다.');
    }

    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } catch {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': Promise.resolve(blob) }),
      ]);
    }
  } finally {
    restore.forEach((fn) => fn());
  }
}
