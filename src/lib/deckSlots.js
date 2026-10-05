/**
 * 영웅 목록에서 영웅을 눌러 넣은 뒤 다음으로 선택할 칸 (길드전 공격·방어와 같은 규칙).
 * 지금 칸 뒤의 첫 빈칸, 없으면 -1 (선택 칸 그대로 → 칸 눌러 교체하는 동작 유지).
 */
export function nextEmptySlotAfter(names, idx) {
  const list = Array.isArray(names) ? names : [];
  for (let i = idx + 1; i < 5; i += 1) {
    if (!list[i]) return i;
  }
  return -1;
}
