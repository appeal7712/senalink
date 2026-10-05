import { ROLE_ICONS } from '../data/roleIcons';

const ROLE_FILTERS = [
  { id: 'all',       label: '전체',   icon: null },
  { id: 'offensive', label: '공격형', icon: ROLE_ICONS.offensive },
  { id: 'magic',     label: '마법형', icon: ROLE_ICONS.magic },
  { id: 'defensive', label: '방어형', icon: ROLE_ICONS.defensive },
  { id: 'support',   label: '지원형', icon: ROLE_ICONS.support },
  { id: 'universal', label: '만능형', icon: ROLE_ICONS.universal },
];

/** 영웅 목록 공통 필터 바 (역할 + 초성 검색). 항상 한 줄 — 칸이 좁으면 역할 칩이 아이콘만 남는다 (index.css @container). */
export default function HeroListFilterBar({
  role,
  onRoleChange,
  query = '',
  onQueryChange,
  showSearch = true,
}) {
  return (
    <div className="hero-filter-bar">
      <div className="hero-filter-bar__row">
        {ROLE_FILTERS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onRoleChange(r.id)}
            className={`hero-filter-chip${r.icon ? ' hero-filter-chip--icon' : ''}${role === r.id ? ' is-active' : ''}`}
            title={r.label}
            aria-label={r.label}
            aria-pressed={role === r.id}
          >
            {r.icon && <img src={r.icon} alt="" />}
            <span className="hero-filter-chip__label">{r.label}</span>
          </button>
        ))}
        {showSearch && (
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="영웅 검색 · 초성"
            title="이름 또는 초성으로 검색 (예: ㅇㅍ)"
            aria-label="영웅 검색"
            className="ops-glass-field hero-filter-bar__search"
          />
        )}
      </div>
    </div>
  );
}
