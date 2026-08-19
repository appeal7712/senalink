import Icon from './icons/Icon';

export function likedByList(build) {
  return Array.isArray(build?.likedBy) ? build.likedBy.filter(Boolean) : [];
}

export function toggleLikedBy(likedBy, uid) {
  const next = likedByList({ likedBy });
  const idx = next.indexOf(uid);
  if (idx >= 0) next.splice(idx, 1);
  else next.push(uid);
  return next;
}

export default function DeckLikeButton({ likedBy = [], myId, onToggle }) {
  const ids = likedByList({ likedBy });
  const liked = Boolean(myId && ids.includes(myId));
  const count = ids.length;

  return (
    <button
      type="button"
      className={`btn-like${liked ? ' is-on' : ''}`}
      onClick={onToggle}
      title={liked ? '좋아요 취소 · 이 공략에 한 계정당 1번' : '좋아요 · 이 공략에 한 계정당 1번'}
    >
      <Icon name="thumbUp" size={15} />
      {count}
    </button>
  );
}
