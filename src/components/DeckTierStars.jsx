/** 길드전 방어와 동일 — 덱 티어/추천도 1~5★ */
export function normalizeDeckTier(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, Math.round(n)));
}

export default function DeckTierStars({ tier = 3, onChange, readOnly = false }) {
  const value = normalizeDeckTier(tier);
  return (
    <div className="deck-tier-stars" style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          role={readOnly ? undefined : 'button'}
          tabIndex={readOnly ? undefined : 0}
          onClick={() => {
            if (readOnly || !onChange) return;
            onChange(n);
          }}
          onKeyDown={(e) => {
            if (readOnly || !onChange) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onChange(n);
            }
          }}
          style={{
            cursor: readOnly ? 'default' : 'pointer',
            color: n <= value ? 'var(--gold-primary)' : 'rgba(255,255,255,0.15)',
            fontSize: readOnly ? '15px' : '22px',
            lineHeight: 1,
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function DeckTierBlock({
  tier = 3,
  onChange,
  readOnly = false,
  label = '덱 티어',
  className = '',
  layout = 'stack', // stack = 라벨 위·별 아래 (방어) / inline = 제목 아래용 가로
}) {
  return (
    <div className={`gw-defense-tier-block deck-tier-block--${layout} ${className}`.trim()}>
      <span className="gw-defense-tier-label">{label}</span>
      <DeckTierStars tier={tier} onChange={onChange} readOnly={readOnly} />
    </div>
  );
}
