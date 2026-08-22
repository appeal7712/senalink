import { useEffect, useState } from 'react';
import Icon from './Icon';

/**
 * 게임 자산(초상화/장비 아이콘 등) 로딩 실패 시 이니셜/아이콘 폴백을 보여주는 안전한 이미지.
 * 기본은 eager — lazy면 페이지 전환 직후 뷰포트 안에서도 늦게 뜨는 체감이 난다.
 * 긴 목록(도감 그리드 등)만 loading="lazy" 를 넘긴다.
 */
export default function SafeImg({
  src,
  alt = '',
  fallbackIcon = 'user',
  style,
  className,
  loading = 'eager',
  fetchPriority,
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

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
      key={src}
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
      className={className}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}
