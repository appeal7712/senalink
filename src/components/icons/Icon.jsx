
/**
 * 세븐나이츠 리버스 전술 워룸 — 커스텀 라인 아이콘 세트
 * 24x24 스트로크 기반, currentColor 사용. 이모지를 전면 대체하기 위해 직접 제작.
 */
const PATHS = {
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.6 2.6 4 6 4 9s-1.4 6.4-4 9c-2.6-2.6-4-6-4-9s1.4-6.4 4-9z" />
    </>
  ),
  fortress: (
    <>
      <path d="M4 21V10l3-2V5h2v2l3-2 3 2V5h2v3l3 2v11" />
      <path d="M4 21h16M9 21v-5h6v5" />
      <path d="M12 3v2" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5c-.8 0-1.5-.7-1.5-1.5v-13z" />
      <path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H12v16h6.5c.8 0 1.5-.7 1.5-1.5v-13z" />
    </>
  ),
  flame: (
    <path d="M12 2c1 3-3 4-3 8a3 3 0 0 0 6 0c0-1.2-.6-1.8-1-2.6.8.3 3 1.8 3 5.6a5 5 0 0 1-10 0c0-4.8 3.4-6.6 5-11z" />
  ),
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />,
  shield: (
    <path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z" />
  ),
  swords: (
    <>
      <path d="M4 4l7 7M4 4v4M4 4h4" />
      <path d="M20 4l-7 7M20 4v4M20 4h-4" />
      <path d="M6 20l4-4M18 20l-4-4" />
      <path d="M9 12l-5 5 2 2 5-5M15 12l5 5-2 2-5-5" />
    </>
  ),
  orb: (
    <>
      <circle cx="12" cy="12" r="6" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
    </>
  ),
  atom: (
    <>
      <circle cx="12" cy="12" r="1.6" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4M4 20h16" />
      <path d="M8 16v-4M12 16V8M16 16v-7" />
    </>
  ),
  news: (
    <>
      <rect x="3.5" y="5" width="13" height="14" rx="1" />
      <path d="M16.5 9H20v8a2 2 0 0 1-2 2H8" />
      <path d="M7 9h6M7 12.5h6M7 16h3" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
      <path d="M3.5 9.5h17M8 3v3M16 3v3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12.5" r="8" />
      <path d="M12 8v5l3.5 2M9.5 2.5h5" />
    </>
  ),
  arrowRight: <path d="M4 12h15M13 6l6 6-6 6" />,
  chevronRight: <path d="M9 5l7 7-7 7" />,
  chevronLeft: <path d="M15 5l-7 7 7 7" />,
  chevronUp: <path d="M5 15l7-7 7 7" />,
  chevronDown: <path d="M5 9l7 7 7-7" />,
  plus: <path d="M12 4v16M4 12h16" />,
  edit: (
    <>
      <path d="M4 20l1-4.2L15.6 5.2a1.5 1.5 0 0 1 2.1 0l1.1 1.1a1.5 1.5 0 0 1 0 2.1L8.2 19l-4.2 1z" />
      <path d="M14.2 6.6l3.2 3.2" />
    </>
  ),
  close: <path d="M5 5l14 14M19 5L5 19" />,
  save: (
    <>
      <path d="M5 4h11l3 3v13H5V4z" />
      <path d="M8 4v5h7V4M7 14h10v6H7z" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l9-9M17 6l2 2M14 9l2 2" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  crown: (
    <>
      <path d="M4 18h16l1-9-5 3-4-6-4 6-5-3 1 9z" />
      <path d="M4 18v2h16v-2" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3.5 21.5 20h-19L12 3.5z" />
      <path d="M12 10v4.2M12 17.2h.01" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c1.2-4.2 4.6-6 7.5-6s6.3 1.8 7.5 6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19c1-3.4 3.5-5 6-5s5 1.6 6 5" />
      <circle cx="17.5" cy="9" r="2.3" />
      <path d="M15.5 13.2c2 .2 3.9 1.6 4.7 4.4" />
    </>
  ),
  volcano: (
    <>
      <path d="M3 20l6-13 3 4 3-4 6 13z" />
      <path d="M12 3v2M9.5 5l1.2 1.6M14.5 5l-1.2 1.6" />
    </>
  ),
  ring: (
    <>
      <circle cx="12" cy="15" r="5" />
      <path d="M9.5 10 12 3l2.5 7" />
    </>
  ),
  medal: (
    <>
      <circle cx="12" cy="14.5" r="5.5" />
      <path d="M9.5 3h5l2 6-4.5 3-4.5-3z" />
      <path d="M10 14.5l1.4 1.4L14.5 13" />
    </>
  ),
  flask: (
    <>
      <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" />
      <path d="M7.5 15h9" />
    </>
  ),
  check: <path d="M4 12.5l5.5 5.5L20 6.5" />,
  paw: (
    <>
      <circle cx="7" cy="9" r="1.8" />
      <circle cx="12" cy="6.5" r="1.8" />
      <circle cx="17" cy="9" r="1.8" />
      <path d="M12 12.5c-3.3 0-5.6 2-5.6 4.4 0 1.7 1.4 3.1 3.1 3.1.9 0 1.5-.4 2.5-.4s1.6.4 2.5.4c1.7 0 3.1-1.4 3.1-3.1 0-2.4-2.3-4.4-5.6-4.4z" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.8" />
    </>
  ),
  boot: (
    <>
      <path d="M8 3v7.5L4 15v3a1 1 0 0 0 1 1h15a1 1 0 0 0 .4-1.9L14 13.5V3z" />
      <path d="M8 3h6" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-5-5" />
    </>
  ),
  door: (
    <>
      <path d="M6 21V4a1 1 0 0 1 1-1h8l3 3v15" />
      <path d="M6 21h12M14 12v1.2" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="1" />
      <path d="M5.5 15H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v.5" />
    </>
  ),
  logout: (
    <>
      <path d="M9 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h3" />
      <path d="M16 16l4-4-4-4M20 12H9" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M5.1 18.9l1.6-1.6M17.3 6.7l1.6-1.6" />
    </>
  ),
  thumbUp: (
    <>
      <path d="M7 11v10H4.5A1.5 1.5 0 0 1 3 19.5v-7A1.5 1.5 0 0 1 4.5 11H7z" />
      <path d="M7 11l3.2-6.2A2 2 0 0 1 12 3.6c.9 0 1.6.8 1.5 1.7L13 9h5.2a2 2 0 0 1 2 2.3l-1.1 7A2 2 0 0 1 17.2 21H7" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M3.5 16l4.5-4.5L12 15l3-3 5.5 5.5" />
    </>
  ),

  /* ── 게임 콘텐츠 모드 아이콘 (결투장 / 공성전 / 길드전 / 총력전) — 직접 제작 ── */

  // 결투장(Arena): 원형 투기장 링 안에서 맞붙는 1:1 대결
  arena: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 8l3.2 3.2M16 16l-3.2-3.2" />
      <path d="M6.5 6.5l2 .3-.3 2M17.5 17.5l-2-.3.3-2" />
      <path d="M16 8l-3.2 3.2M8 16l3.2-3.2" />
      <path d="M17.5 6.5l-2 .3.3 2M6.5 17.5l2-.3-.3-2" />
    </>
  ),

  // 공성전(Siege): 성벽 타워를 충차/투석으로 타격
  siege: (
    <>
      <path d="M6 21V9.5l2-1.3V6h2v1.2l2-1.4 2 1.4V6h2v2.2l2 1.3V21" />
      <path d="M6 21h12" />
      <path d="M9 21v-4h6v4" />
      <path d="M2 15l3.2-1.4" />
      <path d="M2 13.2l3.6.4" />
    </>
  ),

  // 길드전(Guild War): 방패 위에 교차한 두 검 — 길드 명예를 건 3v3 대결
  guildwar: (
    <>
      <path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z" />
      <path d="M9 8.5l6 6M15 8.5l-6 6" />
    </>
  ),

  // 총력전(Total War): 여러 깃발이 동시에 맞붙는 대규모 전면전
  totalwar: (
    <>
      <path d="M5 21V4M5 5h5l-1.3 2.5L10 10H5" />
      <path d="M12 21v-9M12 12.5h4l-1.1 2 1.1 2h-4" />
      <path d="M19 21V9M19 9.7h3l-1.1 2 1.1 2h-3" />
      <path d="M2 21h20" />
    </>
  ),
};

/**
 * 게임 원본 아이콘(PNG)으로 그리는 항목. 선 아이콘과 호출 방식을 맞추려고 같은 컴포넌트에서 처리한다.
 * w/h는 원본 크기 — size를 높이로 두고 가로를 비율대로 계산해 찌그러지지 않게 한다.
 */
const IMAGE_ICONS = {
  closeBtn: { src: '/images/ui/close.png', w: 52, h: 52 },
  speed: { src: '/images/ui/speed.png', w: 44, h: 31 },
  transcend2: { src: '/images/ui/transcend-2.png', w: 128, h: 128 },
  transcend6: { src: '/images/ui/transcend-6.png', w: 128, h: 128 },
};

export default function Icon({ name, size = 16, color = 'currentColor', strokeWidth = 2, style, className }) {
  const image = IMAGE_ICONS[name];
  if (image) {
    return (
      <img
        className={`icon-inline ${className || ''}`.trim()}
        src={image.src}
        alt=""
        aria-hidden="true"
        width={Math.round(size * (image.w / image.h))}
        height={size}
        style={{ display: 'block', flexShrink: 0, objectFit: 'contain', ...style }}
      />
    );
  }

  const content = PATHS[name];
  if (!content) return null;
  return (
    <svg
      className={`icon-inline ${className || ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {content}
    </svg>
  );
}
