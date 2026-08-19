import Icon from './icons/Icon';

/** 공략 탭 공통: 필터 아래 · 목록 위 — 왼쪽 맥락 / 오른쪽 생성 */
export default function StrategyActionBar({
  icon = 'plus',
  title,
  hint,
  actionLabel = '공략 추가',
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  accentColor,
}) {
  const accent = accentColor || 'var(--gold-primary)';
  return (
    <div className="luxury-panel" style={{
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      flexWrap: 'wrap',
      borderColor: accentColor || undefined,
      boxShadow: accentColor ? `inset 3px 0 0 ${accent}` : undefined,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '7px' }}>
          {icon && <Icon name={icon} size={15} color={accent} />}
          {title}
        </div>
        {hint ? (
          <div style={{ fontSize: '12px', color: '#fff', fontWeight: 700, marginTop: '3px' }}>{hint}</div>
        ) : null}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginLeft: 'auto' }}>
        {secondaryActionLabel && onSecondaryAction && (
          <button
            type="button"
            onClick={onSecondaryAction}
            style={{
              padding: '9px 14px', fontSize: '12px', fontWeight: 900, borderRadius: '8px', cursor: 'pointer',
              background: 'rgba(56,189,248,0.12)', border: '1.5px solid var(--accent-cyan)', color: 'var(--accent-cyan)',
              display: 'inline-flex', alignItems: 'center', gap: '6px',
            }}
          >
            <Icon name="plus" size={13} color="var(--accent-cyan)" />
            {secondaryActionLabel}
          </button>
        )}
        {onAction && (
          <button type="button" onClick={onAction} className="btn-ops" style={{ padding: '9px 14px', fontSize: '12px', flexShrink: 0 }}>
            <Icon name="plus" size={13} />
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
