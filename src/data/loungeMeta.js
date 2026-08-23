export const LOUNGE_AFFILIATIONS = [
  { id: 'lounge',  label: '라운지 길드', desc: '라운지 서버 소속 길드',     color: '#3dce9a' },
  { id: 'gallery', label: '갤러리 길드', desc: '커뮤니티·갤러리 중심 길드', color: '#c084fc' },
  { id: 'wild',    label: '야생 길드',   desc: '야생/기타 서버 소속 길드',   color: '#ff7a7a' },
];

export const LOUNGE_TAGS = [
  { id: 'guildwar', label: '#길드전집중', group: 'content' },
  { id: 'expedition', label: '#강림원정', group: 'content' },
  { id: 'siege', label: '#공성전', group: 'content' },
  { id: 'pvp', label: '#PvP결투', group: 'content' },
  { id: 'totalwar', label: '#총력전', group: 'content' },
  { id: 'social', label: '#친목', group: 'vibe' },
  { id: 'hardcore', label: '#하드코어', group: 'vibe' },
  { id: 'newbie', label: '#초보환영', group: 'vibe' },
  { id: 'freebuild', label: '#자유공략', group: 'vibe' },
  { id: 'care', label: '#요양길드', group: 'vibe' },
  { id: 'light', label: '#라이트길드', group: 'vibe' },
  { id: 'ddunya', label: '#뜌땨?', group: 'vibe' },
];

/** 목록에서 뺀 예전 태그 — 표시용만 (선택 UI에는 안 나옴) */
export const LOUNGE_TAG_LEGACY_LABELS = {
  age20: '#20대',
  age30: '#30대',
  ageAny: '#연령무관',
};

export function loungeTagLabel(id) {
  return LOUNGE_TAGS.find((t) => t.id === id)?.label
    || LOUNGE_TAG_LEGACY_LABELS[id]
    || id;
}

export const MAX_LOUNGE_TAGS = 5;
export const MAX_ADMINS = 3; // master 포함
export const MAX_HUB_MEMBERS = 30;
export const HISTORY_RETENTION_DAYS = 30;
/** 길드 히스토리가 이 기간 동안 없으면 허브와 관련 데이터를 서버에서 삭제 */
export const HUB_IDLE_DAYS = 60;

/** 허브 엠블럼(아이콘) 프리셋 — 관리자가 설정에서 변경 */
export const HUB_EMBLEMS = [
  { id: 'fortress', label: '요새' },
  { id: 'crown', label: '왕관' },
  { id: 'shield', label: '방패' },
  { id: 'swords', label: '검' },
  { id: 'flame', label: '불꽃' },
  { id: 'bolt', label: '번개' },
  { id: 'volcano', label: '화산' },
  { id: 'orb', label: '오브' },
  { id: 'medal', label: '메달' },
  { id: 'ring', label: '반지' },
];

export const LOUNGE_STORAGE_KEYS = {
  lounges: '7k_lounges_v1',
  session: '7k_lounge_session_v1',
  inviteHint: '7k_lounge_invite_hint_v1',
  history: '7k_lounge_history_v1',
  notices: '7k_lounge_notices_v1',
  posts: '7k_lounge_posts_v1',
  scores: '7k_lounge_scores_v1',
  buildsPrefix: '7k_lounge_builds_v1_',
};
