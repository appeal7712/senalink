import Icon from './icons/Icon';

/** fill: glass-avatar 원 안을 이미지로 채움 (아이콘 마크는 size 유지) */
export default function GuildMark({ emblem, emblemUrl, size = 24, color = '#fff', fill = false }) {
  if (emblemUrl) {
    return (
      <img
        key={emblemUrl}
        src={emblemUrl}
        alt=""
        className={`guild-mark-img${fill ? ' guild-mark-img--fill' : ''}`}
        style={fill ? undefined : { width: size, height: size }}
      />
    );
  }
  return <Icon name={emblem || 'fortress'} size={size} color={color} />;
}
