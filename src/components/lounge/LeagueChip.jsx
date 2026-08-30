import Icon from '../icons/Icon';

/** 길드전 리그 — 게임 엠블럼 아이콘 (MAJOR / MINOR) */
export default function LeagueChip({ league, active, as = 'span', onClick, grow, size }) {
  if (league !== 'major' && league !== 'minor') return null;
  const Tag = as;
  const iconSize = size ?? (grow ? 40 : 28);
  return (
    <Tag
      type={as === 'button' ? 'button' : undefined}
      className={`league-chip league-chip--${league}${active ? ' is-on' : ''}${grow ? ' league-chip--pick' : ''}`}
      onClick={onClick}
      aria-label={league === 'major' ? '메이저 리그' : '마이너 리그'}
    >
      <Icon
        name={league === 'major' ? 'leagueMajor' : 'leagueMinor'}
        size={iconSize}
        className="league-chip__img"
      />
    </Tag>
  );
}
