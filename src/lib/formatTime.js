export function formatJoinedAt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatLastActive(iso) {
  if (!iso) return '접속 기록 없음';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '접속 기록 없음';
  const diff = Date.now() - t;
  if (diff < 2 * 60 * 1000) return '지금 접속';
  if (diff < 60 * 60 * 1000) return `${Math.max(1, Math.floor(diff / 60000))}분 전`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}시간 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}
