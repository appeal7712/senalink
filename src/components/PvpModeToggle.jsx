export const PVP_MODE_PILL = {
  '속공': '#fb923c',
  '내실': '#c084fc',
};
export const PVP_MODE_COLOR = {
  '속공': '#ea580c',
  '내실': '#7c3aed',
};
export const PVP_MODE_FILL = PVP_MODE_PILL;

export function normalizePvpMode(mode) {
  return mode === '내실' ? '내실' : '속공';
}

export function PvpModeBadge({ mode, size = 'md' }) {
  const m = normalizePvpMode(mode);
  return (
    <span
      className={`kind-pill ${size === 'sm' ? 'kind-pill--sm' : 'kind-pill--md'}`}
      style={{ background: PVP_MODE_PILL[m] }}
    >
      {m} 세팅
    </span>
  );
}

export default function PvpModeToggle({ mode, onChange }) {
  const current = normalizePvpMode(mode);
  return (
    <div className="kind-toggle">
      {['속공', '내실'].map(m => {
        const active = current === m;
        return (
          <button
            key={m}
            type="button"
            className={`kind-toggle-btn${active ? ' is-on' : ''}`}
            onClick={() => onChange(m)}
            style={active ? { background: PVP_MODE_PILL[m] } : undefined}
          >
            {m} 세팅
          </button>
        );
      })}
    </div>
  );
}
