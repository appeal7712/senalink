import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function canHoverFine() {
  return typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;
}

function clampTipStyle(anchor, tipEl) {
  const pad = 10;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tipW = tipEl.offsetWidth || Math.min(280, vw * 0.82);
  const tipH = tipEl.offsetHeight || 40;
  let left = anchor.left;
  let top = anchor.top;
  let place = 'above';

  if (top - tipH - 16 < pad) {
    place = 'below';
    top = anchor.bottom != null ? anchor.bottom : (anchor.top + 18);
  }

  const half = tipW / 2;
  left = Math.min(Math.max(left, pad + half), vw - pad - half);

  if (place === 'above') {
    top = Math.max(pad + tipH + 4, top);
  } else {
    top = Math.min(top, vh - pad - tipH);
  }

  return { left, top, place };
}

/**
 * 잘린 제목 — PC hover / 모바일 tap으로 전체 문구 (시즌룰·스킬 팁과 동일)
 * 잘리지 않으면 팁 없음.
 */
export default function OverflowTitle({
  text = '',
  className = '',
  as: Tag = 'div',
  stopClickPropagation = false,
}) {
  const tipId = useId();
  const elRef = useRef(null);
  const tipRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const [tipPos, setTipPos] = useState(null);
  const [truncated, setTruncated] = useState(false);
  const label = String(text || '').trim();

  const measure = () => {
    const el = elRef.current;
    if (!el) return;
    setTruncated(el.scrollWidth > el.clientWidth + 1);
  };

  useLayoutEffect(() => {
    measure();
  }, [label, className]);

  useEffect(() => {
    const el = elRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const closeTip = () => {
    setOpen(false);
    setAnchor(null);
    setTipPos(null);
  };

  const openTip = (el) => {
    if (!truncated || !label || !el) return;
    const br = el.getBoundingClientRect();
    setOpen(true);
    setAnchor({
      left: br.left + br.width / 2,
      top: br.top,
      bottom: br.bottom,
    });
    setTipPos(null);
  };

  const toggleTip = (el) => {
    if (open) {
      closeTip();
      return;
    }
    openTip(el);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      const t = e.target;
      if (elRef.current?.contains(t)) return;
      if (tipRef.current?.contains(t)) return;
      closeTip();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') closeTip();
    };
    const onScroll = () => closeTip();
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !anchor || !tipRef.current) return;
    setTipPos(clampTipStyle(anchor, tipRef.current));
  }, [open, anchor, label]);

  if (!label) return null;

  const place = tipPos?.place || 'above';
  const tipActive = truncated && open;

  return (
    <>
      <Tag
        ref={elRef}
        className={`${className}${truncated ? ' has-overflow-tip' : ''}${tipActive ? ' is-open' : ''}`.trim()}
        aria-label={label}
        aria-expanded={truncated ? open : undefined}
        aria-describedby={tipActive ? tipId : undefined}
        onMouseEnter={(e) => {
          if (!truncated || !canHoverFine()) return;
          openTip(e.currentTarget);
        }}
        onMouseLeave={() => {
          if (!canHoverFine()) return;
          closeTip();
        }}
        onClick={(e) => {
          if (!truncated) return;
          if (stopClickPropagation) {
            e.preventDefault();
            e.stopPropagation();
          }
          if (canHoverFine()) return;
          toggleTip(e.currentTarget);
        }}
      >
        {label}
      </Tag>
      {tipActive && anchor && typeof document !== 'undefined'
        ? createPortal(
          <div
            ref={tipRef}
            id={tipId}
            role="tooltip"
            className={`skill-tip-pop overflow-title-tip${place === 'below' ? ' skill-tip-pop--below' : ''}`}
            style={{
              left: tipPos?.left ?? anchor.left,
              top: tipPos?.top ?? anchor.top,
              visibility: tipPos ? 'visible' : 'hidden',
            }}
          >
            <div className="skill-tip-pop-body">{label}</div>
          </div>,
          document.body,
        )
        : null}
    </>
  );
}
