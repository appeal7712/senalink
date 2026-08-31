import SafeImg from '../icons/SafeImg';

export const EXCLUSIVE_GEAR_CARD_BG = '/images/ui/exclusive-gear-card-bg.png';
export const EXCLUSIVE_GEAR_CARD_BORDER = '/images/ui/exclusive-gear-card-border.png';

/**
 * 게임 전용장비 슬롯 프레임 — bg + 아이콘 + 하단 이름 + 테두리 오버레이
 * 원본: asset/공용 아이콘/전용장비 백그라운드 레이어*.png
 */
export default function ExclusiveGearCard({
  iconUrl,
  label,
  size = 108,
  className = '',
}) {
  const text = String(label || '').trim() || '전용장비';

  return (
    <div
      className={`exgear-card${className ? ` ${className}` : ''}`}
      style={{ width: `${size}px` }}
      aria-hidden={!iconUrl}
    >
      <img className="exgear-card__bg" src={EXCLUSIVE_GEAR_CARD_BG} alt="" draggable={false} loading="lazy" />
      <div className="exgear-card__icon">
        {iconUrl ? <SafeImg src={iconUrl} alt="" loading="lazy" /> : null}
      </div>
      <p className="exgear-card__label">{text}</p>
      <img className="exgear-card__border" src={EXCLUSIVE_GEAR_CARD_BORDER} alt="" draggable={false} loading="lazy" />
    </div>
  );
}
