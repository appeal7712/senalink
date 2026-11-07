/**
 * 덱 편성 창 상단 칸 — 세나링크 모든 편성 창 공통 기준
 * (길드 결투장 · 공성 · 강림 · 총력전, 공용 결투장 · PvE, 길드전 방어, 결투장 덱 공유 · /ops 메타 덱).
 * 모양은 index.css 「덱 편성 창 상단 (DeckEditHeader)」 한 곳에서만 고친다. 창마다 인라인 스타일로 다시 만들지 말 것.
 * 클래스 이름(editing-build-arena-toggles · -toggle-col · -other-detail-col)은 모바일 · 길드전 방어 CSS가 쓰므로 유지.
 */

/** 「제목」 칸 — 이름 + 한 줄 입력 */
export function DeckEditTitleField({ value, onChange, placeholder }) {
  return (
    <div className="editing-build-title-input-row">
      <span className="deck-edit-head-label">제목</span>
      <input type="text" className="deck-edit-head-input" value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

/** 칸 묶음 — 상자 · 칸막이 없음 */
export function DeckEditFields({ children }) {
  return <div className="editing-build-arena-toggles is-plain">{children}</div>;
}

/** 칸 하나 — 이름(버튼 칸은 가운데) + 컨트롤. wide = 글 입력칸(기타 디테일) */
export function DeckEditField({ label, wide = false, children }) {
  return (
    <div className={`editing-build-arena-toggle-col${wide ? ' editing-build-other-detail-col' : ''}`}>
      <div className="deck-edit-head-label">{label}</div>
      {children}
    </div>
  );
}

/** 「기타 디테일」 칸 — 두 줄 입력 */
export function DeckEditDetailField({ value, onChange, placeholder }) {
  return (
    <DeckEditField label="기타 디테일" wide>
      <textarea
        className="editing-build-detail-textarea deck-edit-head-textarea"
        rows={2}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </DeckEditField>
  );
}
