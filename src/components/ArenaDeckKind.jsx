export const ARENA_DECK_KINDS = [
  { id: 'attack',  label: '공덱', text: '#ff6b6b', pill: '#ff7a7a' },
  { id: 'magic',   label: '마덱', text: '#3b9eff', pill: '#5eb0ff' },
  { id: 'defense', label: '방덱', text: '#12b981', pill: '#3dce9a' },
  { id: 'hybrid',  label: '하이브리드', text: '#eab308', pill: '#facc15' },
];

export const META_DECK_KINDS = [
  { id: 'attack',  label: '공덱', text: '#ff6b6b', pill: '#ff7a7a' },
  { id: 'magic',   label: '마덱', text: '#3b9eff', pill: '#5eb0ff' },
  { id: 'defense', label: '방덱', text: '#12b981', pill: '#3dce9a' },
  { id: 'instant', label: '즉사덱', text: '#c084fc', pill: '#c4a0ff' },
  { id: 'hybrid',  label: '하이브리드', text: '#eab308', pill: '#facc15' },
];

export function metaDeckKindTheme(kind) {
  return META_DECK_KINDS.find(k => k.id === kind) || META_DECK_KINDS[0];
}

export function normalizeArenaKind(kind) {
  if (kind === 'magic' || kind === 'defense' || kind === 'attack' || kind === 'hybrid') return kind;
  return 'attack';
}

export function normalizeMetaDeckKind(kind) {
  if (META_DECK_KINDS.some((k) => k.id === kind)) return kind;
  return 'attack';
}

export function arenaKindTheme(kind) {
  const id = normalizeArenaKind(kind);
  return ARENA_DECK_KINDS.find(k => k.id === id) || ARENA_DECK_KINDS[0];
}

export function ArenaDeckKindBadge({ kind, size = 'sm' }) {
  const k = metaDeckKindTheme(kind);
  return (
    <span
      className={`kind-pill ${size === 'sm' ? 'kind-pill--sm' : 'kind-pill--md'}`}
      style={{ background: k.pill, color: k.id === 'hybrid' ? '#161616' : undefined }}
    >
      {k.label}
    </span>
  );
}

export default function ArenaDeckKindToggle({ kind, onChange }) {
  const current = normalizeArenaKind(kind);
  return (
    <div className="kind-toggle">
      {ARENA_DECK_KINDS.map(k => {
        const active = current === k.id;
        return (
          <button
            key={k.id}
            type="button"
            className={`kind-toggle-btn${active ? ' is-on' : ''}`}
            onClick={() => onChange(k.id)}
            style={active ? {
              background: k.pill,
              color: k.id === 'hybrid' ? '#161616' : undefined,
            } : undefined}
          >
            {k.label}
          </button>
        );
      })}
    </div>
  );
}

export function MetaDeckKindToggle({ kind, onChange }) {
  const current = META_DECK_KINDS.some(k => k.id === kind) ? kind : 'attack';
  return (
    <div className="kind-toggle kind-toggle--meta">
      {META_DECK_KINDS.map(k => {
        const active = current === k.id;
        return (
          <button
            key={k.id}
            type="button"
            className={`kind-toggle-btn${active ? ' is-on' : ''}`}
            onClick={() => onChange(k.id)}
            style={active ? {
              background: k.pill,
              color: k.id === 'hybrid' ? '#161616' : undefined,
            } : undefined}
          >
            {k.label}
          </button>
        );
      })}
    </div>
  );
}
