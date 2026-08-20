/** 각성 초상화용 아이콘 — 초상화 왼쪽 위 (기존 텍스트 배지 자리) */
export const AWAKEN_ICON_URL = '/images/ui/awaken-badge.png';

export default function AwakenMark({ size = 23, className = '', style, corner = true, compact = false }) {
  const cornerClass = corner
    ? ` awaken-mark--corner${compact ? ' awaken-mark--corner-sm' : ''}`
    : '';
  return (
    <img
      className={`awaken-mark${cornerClass}${className ? ` ${className}` : ''}`}
      src={AWAKEN_ICON_URL}
      alt="각성"
      title="각성"
      width={size}
      height={size}
      draggable={false}
      style={{ width: size, height: size, ...style }}
    />
  );
}
