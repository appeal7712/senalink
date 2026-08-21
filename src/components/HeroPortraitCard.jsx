import SafeImg from './icons/SafeImg';
import heroCardMeta from '../data/heroCardMeta.json';
import {
  getHeroCardChrome,
  getHeroRoleIcon,
  getHeroStarIcon,
} from '../data/heroCardAssets';

/**
 * negi-lab 캐릭터 카드와 동일 레이어 구조.
 * GradeBG 프레임 + 마스크 초상 + (전설+/++)SP 뱃지 + 역할 + (옵션)별 + (옵션)이름
 *
 * cropNameBar: 덱용 — 하단 이름 검정칸을 잘라 세로를 줄임 (별·역할 유지)
 */
export default function HeroPortraitCard({
  hero,
  width,
  className = '',
  style,
  showStars = true,
  showName = false,
  showRole = true,
  cropNameBar = true,
  portraitSrc,
  alt,
  onClick,
}) {
  if (!hero && !portraitSrc) return null;

  const meta = hero?.id ? heroCardMeta[hero.id] : null;
  const { bgUrl, badgeUrl } = getHeroCardChrome(hero || {}, meta);
  const roleUrl = showRole ? getHeroRoleIcon(hero || {}, meta) : null;
  const starUrl = showStars ? getHeroStarIcon(hero || {}, meta?.negiStar) : null;
  const src = portraitSrc || meta?.cardUrl || hero?.portraitUrl;
  const label = String(alt || hero?.name || '').replace('(각성)', '');
  const awakened = !!hero?.isAwakened;

  const cls = [
    'hero-portrait-card',
    cropNameBar ? 'hero-portrait-card--crop-name' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cls}
      style={{ width: width ? `${width}px` : undefined, ...style }}
      onClick={onClick}
    >
      <div className="hero-portrait-card-visual">
        <img className="hero-portrait-card-bg" src={bgUrl} alt="" draggable={false} />
        <div className="hero-portrait-card-mask">
          <SafeImg
            className="hero-portrait-card-icon"
            src={src}
            alt={label}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }}
          />
        </div>
        {badgeUrl ? (
          <div className="hero-portrait-card-badge-wrap">
            <img className="hero-portrait-card-badge" src={badgeUrl} alt="" draggable={false} />
            <div className="hero-portrait-card-badge-glow" />
          </div>
        ) : null}
        {showRole && roleUrl ? (
          <img className="hero-portrait-card-role" src={roleUrl} alt="" draggable={false} />
        ) : null}
        {showStars && starUrl ? (
          <img className="hero-portrait-card-star" src={starUrl} alt="" draggable={false} />
        ) : null}
        {showName ? (
          <div className={`hero-portrait-card-name${awakened ? ' is-awakened' : ''}`}>
            <span>{label}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
