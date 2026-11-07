import Icon from './icons/Icon';

/** 상단 메뉴 카드 — 스타일은 styles/hoverGate.css */
export default function HoverGateCard({ icon, iconSize = 26, title, desc, on = false, soon = false, className = '', ...buttonProps }) {
  return (
    <button
      type="button"
      className={`hg-card${on ? ' is-on' : ''}${soon ? ' is-soon' : ''}${className ? ` ${className}` : ''}`}
      aria-label={desc ? `${title} — ${desc}` : title}
      {...buttonProps}
    >
      <span className="hg-art" aria-hidden="true">
        <span className="hg-art-in"><Icon name={icon} size={iconSize} /></span>
      </span>
      <span className="hg-label" aria-hidden="true">{title}</span>
      <span className="hg-text" aria-hidden="true">
        <span className="hg-title">{title}</span>
        {desc ? <span className="hg-desc">{desc}</span> : null}
      </span>
    </button>
  );
}
