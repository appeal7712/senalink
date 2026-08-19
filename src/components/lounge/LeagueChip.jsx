export default function LeagueChip({ league, active, as = 'span', onClick, grow }) {
  if (league !== 'major' && league !== 'minor') return null;
  const Tag = as;
  return (
    <Tag
      type={as === 'button' ? 'button' : undefined}
      className={`league-chip league-chip--${league}${active ? ' is-on' : ''}${grow ? ' league-chip--grow' : ''}`}
      onClick={onClick}
    >
      {league === 'major' ? 'MAJOR' : 'MINOR'}
    </Tag>
  );
}
