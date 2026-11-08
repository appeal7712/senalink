import Icon from './icons/Icon';

/** 길드전 공격 상대 덱 목록 검색칸. 매칭은 lib/gwDeckSearch.js `gwDeckMatchesQuery`. */
export default function GwDeckSearch({ value, onChange, placeholder, ariaLabel, title, className = '' }) {
  const active = value.trim().length > 0;
  return (
    <label className={`gw-attack-search${className ? ` ${className}` : ''}${active ? ' is-active' : ''}`} title={title}>
      <Icon name="search" size={13} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') onChange(''); }}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      {active && (
        <button type="button" className="gw-attack-search-clear" onClick={() => onChange('')} aria-label="검색 지우기">
          <Icon name="close" size={11} />
        </button>
      )}
    </label>
  );
}
