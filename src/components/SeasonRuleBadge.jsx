import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function canHoverFine() {
  return typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;
}

/** 도감 스킬 팁과 동일 — 뷰포트 clamp */
function clampTipStyle(anchor, tipEl) {
  const pad = 10;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tipW = tipEl.offsetWidth || Math.min(280, vw * 0.82);
  const tipH = tipEl.offsetHeight || 80;
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
 * 상급결투장 시즌 룰 뱃지 — PC hover / 모바일 tap (도감 스킬 팁과 동일 패턴)
 * 메인 시즌 카드 · 공용 PvP 상급 배너에서 공유
 */
export default function SeasonRuleBadge({ icon, title, desc, onTipOpenChange, className = '' }) {
  const tipId = useId();
  const btnRef = useRef(null);
  const tipRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const [tipPos, setTipPos] = useState(null);
  const hasTip = !!(title && desc);

  const closeTip = () => {
    setOpen(false);
    setAnchor(null);
    setTipPos(null);
    onTipOpenChange?.(false);
  };

  const openTip = (el) => {
    if (!hasTip || !el) return;
    const br = el.getBoundingClientRect();
    setOpen(true);
    setAnchor({
      left: br.left + br.width / 2,
      top: br.top,
      bottom: br.bottom,
    });
    setTipPos(null);
    onTipOpenChange?.(true);
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
      if (btnRef.current?.contains(t)) return;
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
  }, [open, anchor, title, desc]);

  if (!icon) return null;

  const place = tipPos?.place || 'above';

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`season-rule-badge${hasTip ? ' has-tip' : ''}${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
        aria-label={hasTip ? `시즌 룰: ${title}` : '시즌 룰'}
        aria-expanded={hasTip ? open : undefined}
        aria-describedby={open ? tipId : undefined}
        onMouseEnter={(e) => {
          if (!hasTip || !canHoverFine()) return;
          openTip(e.currentTarget);
        }}
        onMouseLeave={() => {
          if (!canHoverFine()) return;
          closeTip();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!hasTip) return;
          if (canHoverFine()) return;
          toggleTip(e.currentTarget);
        }}
      >
        <span className="season-rule-badge-bar" aria-hidden="true" />
        <img
          className="season-rule-badge-type"
          src={icon}
          alt=""
          draggable={false}
          decoding="async"
        />
        <img
          className="season-rule-badge-text"
          src="/images/content-season/season-rule/text.png"
          alt=""
          draggable={false}
          decoding="async"
        />
      </button>
      {open && hasTip && anchor && typeof document !== 'undefined'
        ? createPortal(
          <div
            ref={tipRef}
            id={tipId}
            role="tooltip"
            className={`skill-tip-pop${place === 'below' ? ' skill-tip-pop--below' : ''}`}
            style={{
              left: tipPos?.left ?? anchor.left,
              top: tipPos?.top ?? anchor.top,
              visibility: tipPos ? 'visible' : 'hidden',
            }}
          >
            <div className="skill-tip-pop-title">{title}</div>
            <div className="skill-tip-pop-body">{desc}</div>
          </div>,
          document.body,
        )
        : null}
    </>
  );
}
