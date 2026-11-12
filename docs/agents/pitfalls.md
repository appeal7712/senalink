# 안전하게 고치는 법 · 자주 빠지는 함정 — AGENTS.md §14.1

> AGENTS.md에서 분리한 상세 문서 (원문 그대로, 절 번호 § 동일). 공통 금지 · 데이터 보호는 항상 루트 `AGENTS.md` §2.1이 우선.
> CSS 이동 · 큰 정리 · 브라우저 확인 전에 열 것.

### 14.1 안전하게 고치는 법 · 자주 빠지는 함정 (실제로 겪은 것)

**CSS**
- 같은 우선순위면 **뒤에 쓴 규칙이 이김**. 미디어 블록을 기본 규칙보다 앞에 두면 조용히 무시됨(예: 메타 덱 캐러셀이 기본 `display:none`에 덮여 안 보였음). CSS를 옮기거나 새 블록을 넣을 땐 기본 규칙 **뒤**인지 확인.
- 파일 순서도 같음: `main.jsx`에서 `index.css` → `styles/settingOverview.css` → `deckEditScrollModal.css` → `hoverGate.css` → `themeSolidDark.css`. 이 순서를 바꾸지 말 것.
- 폰(≤980) `.glass-modal`에 `max-height · max-width !important`가 있음 → 모달 안 특정 상태(공유 PNG 등)를 바꾸려면 선택자를 더 구체적으로.

**큰 정리(파일 나누기 · CSS 옮기기)**
- 옮기기 전 `%TEMP%`에 백업 → 여러 폭(390 · 600 · 900 · 1440)에서 화면 요소 계산 스타일을 저장 → 옮긴 뒤 같은 방법으로 다시 저장해 **완전히 같은지 비교**(2026-11-08 세팅 확인 분리는 12화면 동일 확인 후 진행). 눈으로만 보지 말 것.
- 비교하려고 작업 파일을 임시로 바꿔치기하지 말 것(자동 검토가 막음 · 작업 내용이 꼬일 수 있음). 백업은 `%TEMP%`에만.
- `InGameDeckCard.jsx` 등 일부 파일은 줄바꿈이 CRLF. 스크립트로 줄을 자를 땐 `/\r?\n/`로 나누고 원래 줄바꿈으로 다시 붙일 것.
- 편집 도구가 쓰기 오류(예: `ftruncate`)를 내면 바로 파일 끝 · 바꾼 줄을 확인하고 다시 적용.
- ESLint 기준선: 2026-11-08 오류 77개(대부분 React hooks 규칙 — 일부러 안 건드림). **늘리지 말 것.** 안 쓰는 변수는 지우거나 `_` 접두사.

**브라우저로 확인할 때**
- 뒤로 가기 · 모달 닫기 확인은 **새 탭**에서(`newTab: true`). 오래 쓴 탭은 방문 기록이 50개 한도에 차서 브라우저가 중간 기록을 버림 → 모달을 닫았는데 메인으로 튕기는 것처럼 보임(앱 버그 아님, 2026-11-08 새 탭에서 정상 확인).
- 화면 크기 바꾸기(`Emulation.setDeviceMetricsOverride`)와 다른 CDP 호출을 **동시에** 보내지 말 것(순서가 꼬임). 끝나면 `Emulation.clearDeviceMetricsOverride`.
- 크기를 바꾼 상태의 `browser_take_screenshot`은 잘려 보일 수 있음 → `Page.captureScreenshot`(clip) 결과를 node로 `%TEMP%`에 png 저장해서 보기.
- 스크립트 `el.click()`은 사람 클릭이 아님(사용자 동작 없음). 기록 · 팝업 관련 확인은 `browser_click`(실제 입력). 좌표 클릭(`browser_mouse_click_xy`)은 스크린샷 좌표 기준, 가로 · 세로 배율이 다를 수 있음.
- 모달 바깥(스크림) 닫기는 pointer 이벤트(pointerdown/up) 기준 — mouse 이벤트만 보내면 안 닫힘.
- 콘솔에서 `import('/src/…')`는 예전 모듈을 돌려줄 수 있음 → 주소 뒤에 `?v=숫자`.

---

