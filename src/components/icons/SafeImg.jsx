import { useState } from 'react';
import Icon from './Icon';

/**
 * 게임 자산(초상화/장비 아이콘 등) 로딩 실패 시 이니셜/아이콘 폴백을 보여주는 안전한 이미지.
 * 스크레이핑 데이터의 파일명 불일치(예: 누락된 장신구 아이콘) 대비용.
 */
export default function SafeImg({ src, alt = '', fallbackIcon = 'user', style, className }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    const initial = alt ? alt.replace('(각성)', '').slice(0, 1) : '';
    return (
      <div
        className={className}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(159, 179, 209, 0.12)', color: '#8fa3c2',
          fontWeight: 900, ...style,
        }}
      >
        {initial ? <span>{initial}</span> : <Icon name={fallbackIcon} size={18} />}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}
