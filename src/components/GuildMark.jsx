import Icon from './icons/Icon';

export default function GuildMark({ emblem, emblemUrl, size = 24, color = '#fff' }) {
  if (emblemUrl) {
    return (
      <img
        src={emblemUrl}
        alt=""
        className="guild-mark-img"
        style={{ width: size, height: size }}
      />
    );
  }
  return <Icon name={emblem || 'fortress'} size={size} color={color} />;
}
