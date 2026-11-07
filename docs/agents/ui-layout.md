# 모바일 CSS · 아이콘 · 덱 수정 모달 — AGENTS.md §12.2–12.5

> AGENTS.md에서 분리한 상세 문서 (원문 그대로). 절 번호(§)는 AGENTS.md와 동일하게 유지한다.
> 공통 금지·데이터 보호 규칙은 항상 루트 `AGENTS.md` §2.1이 우선.

### 12.2 모바일 전용 CSS 패치 원칙

밍봉이 **「모바일만」** 이라고 하면:

1. 스타일은 **해당 화면의 실제 브레이크포인트 안만** 추가/수정 (길드전 공격 **1020**, 방어 **980**, 일반 허브/세팅 **760·900** 등). 공통(베이스) 셀렉터에 넣으면 PC가 같이 바뀐다.
2. **절대** `@media (min-width: 981px)` 등 PC 블록에 모바일용 규칙을 넣지 말 것 (과거에 방어 리스트 여백 패치가 PC 블록에 잘못 들어간 적 있음). 덱 수정 PC는 **`deckEditScrollModal.css`만**.
3. 길드전 방어 1열·대체 덱·세팅 확인 PC·공유 캡처는 요청 없이 함부로 되돌리지 말 것.
4. **한글 세로 찢김:** flex/grid가 칸을 쥐어짜면 `white-space: nowrap` + `min-width: 0` + ellipsis, 또는 제목/버튼을 **세로 스택**. `flex-wrap`만으로 제목이 초상 **아래**로 가면 안 되면 grid로 의도한 순서를 고정.
5. 모바일 `.build-panel-body { display: contents }` + `order` 패턴: **새 자식(기타 디테일 등)에도 order를 명시**하지 않으면 맨 위로 간다.

### 12.3 아이콘 · 성능 (참고)

- UI 아이콘 `hero` / `pet`: `public/images/ui/hero-icon.png`, `pet-icon.png` → `Icon.jsx` (`hero`/`pet`). 프로필 `user` 아이콘과 혼용 금지.
- 세팅 공유 PNG: `warmSettingCapture`는 **공유 클릭 시에만** (`copyNodeImage.js`). 모달 오픈 경로에서 미리 워밍하지 말 것.
- 모달 뒤 블러: `.app-shell` **blur(22px)** 유지 — 성능 핑계로 제거하지 말 것 (§10.6).

### 12.4 덱 수정 모달 — PC 본문 통스크롤 (`deckEditScrollModal`)

**덱 수정 모달 모바일(가로 ≤980px)** 은 `index.css` `@media (max-width: 980px)` 블록만 — **이 패턴의 PC CSS·헬퍼로 모바일 건드리지 말 것.** (사이트 GNB 등 다른 UI의 980 브레이크포인트와 별개.)

| 파일 | 역할 |
|------|------|
| `src/styles/deckEditScrollModal.css` | PC **`min-width: 981px`** 레이아웃·토큰·스크롤 |
| `src/lib/deckEditScrollModal.js` | kind `arena` \| `pve` · 클래스·스타일·휠 전달 훅 |
| `src/main.jsx` | `deckEditScrollModal.css` import |

| kind | 모달 클래스 | 적용 화면 |
|------|-------------|-----------|
| `arena` | `.arena-body-scroll-modal` | 길드 결투장 · 커뮤니티 결투장/상급 · **길드전 방어 덱 수정** (`gw-defense-edit-modal` 추가) |
| `pve` | `.pve-body-scroll-modal` | 길드 **공성전·강림원정대** (3열+타임라인) |

#### 브레이크포인트 (가로 × 세로)

| 조건 | 동작 |
|------|------|
| **가로 ≥981** | PC 2열(결투장) / 3열(PvE) · `deckEditScrollModal.css` |
| **가로 ≤980** | 모바일 세로 스택 · `index.css` 덱 수정 블록만 (건드릴 때 극도로 주의) |
| **PC 높이** | 모달 = 내용 높이(`height: auto`), 상한 `max-height: 94vh`. 화면이 낮아 넘치면 본문(`.deck-edit-scroll-body`, 항상 `overflow-y: auto`)만 스크롤. (예전 세로 ≥1021 `overflow-y: hidden` 규칙은 제거됨) |

#### 영웅 목록 = 딱 2줄 (모든 덱 수정 창 공통)

공략 추가를 누르면 영웅이 **2줄 깔끔하게**(이름까지, 3줄째 안 비침) 보이는 것이 기준. 카드 크기는 그대로, 목록 칸 높이만 맞춤.

| 창 | PC | 모바일 ≤980 |
|----|----|-------------|
| 결투장 · 길드전 방어 · 공성 · 강림 | `--deck-hero-list-2rows: 172px` (`deckEditScrollModal.css`) | 공용 156px (카드 71.9) 그대로 |
| 길드전 카운터 | `.gw-counter-hero-picker .hero-grid-picker-grid` 164px (`index.css` 베이스, 모바일 공통) | 동일 164px |
| 길드전 상대·파생 덱 | `HeroGridPicker height={176}` | `.gw-target-edit-modal .hero-grid-picker-grid` max 176px (`index.css` ≤980) |

카드 크기·줄간격이 바뀌면 위 숫자를 **같이** 다시 계산할 것 (2 × 카드 높이 + 줄간격 + 위아래 여백, 3번째 줄 시작보다 작게).

#### 덱 편성 창 상단 = 공통 기준 하나 (`src/components/DeckEditHeader.jsx` + index.css 「덱 편성 창 상단 (DeckEditHeader)」, 밍봉 확정)

**모든 편성 창 상단은 이 컴포넌트만 쓴다** — 길드 결투장 · 공성 · 강림 · 총력전(`GuildLounge`), 공용 결투장 · PvE(`CommunityGuideEditor`), 길드전 방어(`GuildWarDefensePanel`), 결투장 덱 공유 · /ops 메타 덱(`OpsMetaDeckModal`). 창마다 인라인 스타일 · 칸막이 div로 다시 만들지 말 것(예전엔 창마다 30줄씩 복사돼 있었음). 모양을 바꿀 땐 CSS 한 곳만.

| 컴포넌트 | 용도 |
|----|----|
| `DeckEditTitleField` | 「제목」 한 줄 입력 |
| `DeckEditFields` | 칸 묶음(`editing-build-arena-toggles is-plain`) — 상자 · 칸막이 없음 |
| `DeckEditField label=…` | 칸 하나 = 회색 이름(10px #94a3b8) 위 + 컨트롤 아래. **버튼 칸은 이름 가운데**(덱 티어 · 세팅 · 덱 유형 · 추천도 · 속공 수치) |
| `DeckEditDetailField` | 「기타 디테일」 **두 줄**(rows 2) 입력, 이름 왼쪽 |

클래스 이름(`editing-build-arena-toggles` · `-toggle-col` · `-other-detail-col`)은 모바일 ≤980 · 길드전 방어 981–1179 / 1180+ CSS가 쓰므로 유지. 강림원정대 편성 창 「2라운드 세팅」 버튼은 빨강(1라운드 = 보스 색).

결투장 덱 공유 창(`OpsMetaDeckModal` 헤더)처럼 테두리 상자 · 칸막이 없이 회색 이름 + 둥근 버튼. 「기타 디테일」 글 입력칸만 자기 테두리 유지(`editing-build-other-detail-col`은 min-width 유지). 길드전 방어 981–1179 가로 스크롤 규칙은 그대로. **추천도 별은 닫기 X 바로 옆에 두지 말 것** — PvE(공성 · 강림 · 공용 PvE)는 「추천도 → 기타 디테일」 순서(X 옆 = 입력칸), PC는 토글과 X 사이 18px(`.editing-build-author-row` padding-left, `:has(.is-plain)`). 밍봉이 별 고르다 창을 닫은 적 있음. **PC 상단 한 줄(밍봉 확정):** 「제목」도 다른 칸처럼 이름을 위에(「제목:」 옆 표기 아님), 제목 칸이 남는 폭을 채움(가운데 빈 공간 없음). PvE는 제목 칸 · 기타 디테일 칸 **정확히 1:1**(토글 상자를 `display: contents`로 풀어 같은 줄 칸으로). **세로 기준 2줄(밍봉 확정):** 이름 줄은 모두 같은 높이, 칸 줄은 `--deck-head-row: 48px`(기타 디테일 두 줄 높이) — 입력 · 별 · 버튼 · 창 제목(신규 공략 생성) · 라운드/팀 버튼 · 닫기 X가 전부 이 48px 줄 **가운데 한 선**(칸 = `grid-template-rows: auto 48px`). 한 줄 고정(nowrap)은 제목 칸 있는 창만 — 길드전 방어 981–1179는 토글이 아랫줄 가로 스크롤 + X 세로 가운데(예전 그대로). 기타 디테일은 두 줄 유지(한 줄로 줄이지 말 것 — 밍봉 지적). 칸막이 선은 다시 넣지 않음(무거워짐).

#### 결투장 덱 공유 · /ops 메타 덱 창 (`OpsMetaDeckModal`)

본문(덱 · 세팅 디테일 · 장비 · 영웅 목록)은 **공용 결투장 공략 창과 같은 덱 수정 구조**(`editing-build-modal` + `deckEditScrollModal` kind `arena` + `HeroGearPanel` + `HeroListFilterBar` + 2줄 영웅 그리드). 위 「제목 · 인게임 닉네임 · 한 줄 설명」만 `meta-deck-editor-fields`로 추가. 장비 칸 · 영웅 목록을 다시 따로 만들지 말 것(예전에 따로 만들어 장비 칸이 비고 목록이 길었음).

#### 영웅 목록 필터 바 = 항상 한 줄 (`HeroListFilterBar`)

역할 칩(전체·공격형…만능형) + 초성 검색은 **`src/components/HeroListFilterBar.jsx` 하나만** 쓴다. `HeroGridPicker`와 자체 그리드(길드 결투장·공성·강림·총력전, 길드전 방어, 공용 결투장) 모두 이 컴포넌트. 필터 버튼을 화면마다 다시 복사하지 말 것.

- CSS: `index.css` 맨 아래 `.hero-filter-bar*` — 뷰포트 미디어쿼리가 아니라 **`@container`(바 자체 폭)** 로 PC·모바일 공통.
- 폭 > 640px: 칩 이름 표시 · ≤640: 칩 아이콘만(이름은 `title`) · ≤400 / ≤250: 간격·여백 더 촘촘. 검색칸 최소 70px(≤400은 60px).
- 높이 32px 고정 → PvE `--deck-pve-hero-picker-head`와 맞음. 칩 크기를 키우면 PvE 영웅 목록 칸이 밀리니 주의.
- 자체 그리드는 제목 옆 `flex: 1 1 380px` 래퍼 → PC는 제목과 한 줄, 모바일은 제목 아래 한 줄.

#### 스크롤 규칙 (PC)

- **본문 스크롤:** `.deck-edit-scroll-body` 하나만 (세로 부족 시).
- **내부 스크롤 허용:** 영웅 목록 (`.arena-hero-grid` / `.pve-hero-grid`) · PvE 스킬 순서 (`.skill-timeline-scroller` — 높이 px 고정, `.cursor/rules` 준수).
- **그 외 영역** (장비·덱·세팅 디테일·타임라인 추가 등): 내부 스크롤 금지 — `useDeckEditScrollWheelForward`가 모달 capture에서 휠을 본문으로 전달.
- **세팅 디테일:** 좌열 `flex: 1` — 덱 바로 아래부터 좌열 하단까지 박스·textarea가 **가득 채움**. `margin-top: auto`로 위·아래 빈 공간 만들지 말 것.

#### PvE 토큰 (arena와 분리)

- 공성·강림: `--deck-gear-h: 520px` (강림 라운드 라벨·세팅 디테일 여유; 결투장 496px).
- 레이아웃 **높이 구간마다 바꾸지 않음** — 화면 높이가 낮으면 본문만 스크롤.

#### 길드전 방어 덱 수정 (`GuildWarDefensePanel.jsx`)

- PC: `deckEditScrollModal` **kind `arena`** 와 100% 동일 본문.
- 헤더 유지: 덱 티어 · 세팅 · 덱 유형 · 기타 디테일 · 속공 수치(속공·내실 세팅 모두 표시).
- **`981–1179` 중간 폭:** `.gw-defense-edit-modal` 헤더 토글 `nowrap` + 가로 스크롤; `header-main` `min-width:0`·닫기 `flex-shrink:0`으로 **속공 수치가 X와 겹치지 않게**. **≤980 폰 헤더(세로 스택)는 기존 `index.css` 그대로.**

**별도 패턴:** 길드전 **공격 카운터** `.gw-counter-edit-modal` — `index.css` (덱 수정 통스크롤과 분리).

클래스·인라인 스타일은 **`deckEditScrollModal.js` 헬퍼** 우선 · PC 그리드 밴드에이드를 `index.css` 베이스에 넣지 말 것.

### 12.5 덱 수정 모달 패치 시 마음가짐 (회귀 방지)

1. **한 가지씩, 검증 후 다음** — 스크롤·높이·영웅 그리드·타임라인을 한 번에 바꾸면 한쪽 고치면 다른 쪽 깨짐 (실제로 v106~v138 여러 사이클 소요).
2. **가로 브레이크포인트와 세로 브레이크포인트 분리** — 980(모바일 레이아웃) / 1020(휠·overflow 보조)를 섞어 한 미디어쿼리로 처리하지 말 것.
3. **레이아웃 토큰은 1벌** — 뷰포트 높이마다 그리드·칸 크기를 다시 정의하지 말 것. 넘치면 본문만 스크롤.
4. **「모바일 완벽」이면 모바일 CSS 손대지 않기** — PC만 `deckEditScrollModal.css` (`min-width: 981px`). 방어·결투장 모바일 `index.css` ≤980 규칙은 밍봉 명시 없이 수정 금지.
5. **내부 스크롤은 최소** — 영웅 목록(+ PvE 스킬 리스트)만. 장비 패널·좌열에 `overflow-y: auto` 추가 제안하지 말 것.
6. **헬퍼·DOM 구조 공유** — `GuildLounge` · `CommunityGuideEditor` · `GuildWarDefensePanel`은 동일 `deckEditScrollBodyWrapperProps` / `useDeckEditScrollWheelForward` 패턴.
7. **배포 전 체크리스트 (PC 981+, 풀 높이 / 줄인 높이 각각):** 본문 스크롤 유무 · 휠이 장비/디테일/빈 여백에서 먹는지 · 세팅 디테일 좌열 가득 참 · 영웅 목록만 내부 스크롤 · PvE 타임라인 scroller 높이 고정 유지.
