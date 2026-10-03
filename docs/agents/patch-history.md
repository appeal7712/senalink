# 패치 내역 — AGENTS.md §17

> AGENTS.md에서 분리한 상세 문서 (원문 그대로). 절 번호(§)는 AGENTS.md와 동일하게 유지한다.
> 공통 금지·데이터 보호 규칙은 항상 루트 `AGENTS.md` §2.1이 우선.

## 17. 패치 내역

### 2026-10-03 (`v2026.10.03.190`) — 메인 입장 버튼 아이콘
- 메인 「길드 허브 입장하기」·「공용 허브 입장하기」 아이콘을 GNB와 같은 `hub` / `hubMembers`로. 흰 PNG는 기존 `.btn-ops img.icon-inline` `invert(1)`로 검정 표시.
- Hosting만 (rules·Functions·스키마 무변경).

### 2026-10-03 (`v2026.10.03.189`) — HD 배경 · 세공 제목 아이콘
- **배경 HD:** 원본 1024px를 Real-ESRGAN(`realesrgan-x4plus`, 로컬 실행·워터마크 없음)으로 4배 → 2560px JPG q90. 유리 `public/bg-arena-sky-hd.jpg`(494KB), 선명 다크 `public/bg-dark-growing-hd.jpg`(259KB). 구 PNG(`bg-arena-sky.png`, `bg-dark-growing.png`)는 보존(미사용).
- **세공 시뮬레이터:** 제목 아이콘을 선 아이콘 → `/images/ui/accessory-ring.png`(`.craft-sim-title-icon` 22px).
- Hosting만 (rules·Functions·스키마 무변경).

### 2026-10-03 (`v2026.10.03.188`) — 배경 교체 · 세공 빈 칸 · 길드 순위 문구
- **배경:** 유리 테마 `public/bg-arena-sky.png`(asset `Tex_RealTimeArenaBGA03`), 선명 다크 `public/bg-dark-growing.png`(asset `Tex_GrowingBGA01`). 선명 다크의 어두운 그라데이션 오버레이 제거(이미지만). 구 `bg-senari.png`는 파일만 보존(미사용).
- **세공 시뮬레이터:** 빈 반지 칸의 큰 `+` → 흐린 반지 실루엣(`/images/ui/accessory-ring.png`) + 우하단 작은 원형 `+` (`.craft-ring-empty-icon` / `.craft-ring-empty-add`).
- **메인 길드 순위:** 안내 문구 「전시즌 기준 (길드 관리자가 직접 갱신)」.
- Hosting만 (rules·Functions·스키마 무변경).

### 2026-10-03 (`v2026.10.03.187`) — 장신구 칸 등급 색 · 세팅 확인 정렬 · 티어 줄 색
- **덱 수정 장신구 칸 (`AccessorySlots`):** 선택된 칸을 보라 고정 → 반지 등급 색(`.acc-slot--{rarity}`, `.acc-ring--*`와 같은 계열)으로 연하게, 테두리 1px·배경 7%로 하이라이트 축소. 빈 세공 칸(점선) 그대로.
- **세팅 확인 메인+세공:** 상태이상(화상·출혈 등) 줄을 반지 이름 기준 가운데 정렬(`.acc-pair-text`). 박스 높이 동일.
- **티어리스트 (도구 메이커 · 공용 허브):** 줄에 `data-tier` → 등급 칸·영웅 칸을 등급 아이콘 색으로(SSS 분홍 · S 금 · A 연보라 · B 보라 · C 청록 · D 청회 · F 브론즈). 드롭 하이라이트도 등급 색. 테마는 `--glass-inset` 위에 겹쳐 유리/선명 다크 공통.
- Hosting만 (rules·Functions·스키마 무변경).

### 2026-10-03 (Functions SDK, 호스팅 버전 `v2026.10.03.186` 그대로) — firebase-functions 6.6 → 7.4
- 배포 시 「outdated version of firebase-functions」 경고 제거. `functions/package.json` `firebase-functions` `^6.3.2` → `^7.4.0`만 변경 (firebase-admin 13.10 그대로).
- v7 breaking(`functions.config()` 제거·Node 16 중단·에뮬 `onRequest` 500·v1 `Event` 개명) 전부 미사용 — 코드 무변경. rules·스키마·Hosting 무변경.
- 에뮬레이터에서 Callable 9개 v6와 동일 응답 확인 → 14개 재배포, 라이브 `redeemCoupon`·`resolveMyHub`(미로그인 → UNAUTHENTICATED) 정상.
- 롤백: `firebase-functions`를 `^6.3.2`로 되돌리고 `npm install` 후 functions 재배포.
- `--only functions`.

### 2026-10-03 (Functions 런타임, 호스팅 버전 `v2026.10.03.186` 그대로) — Node 20 → 24
- Node 20 지원 종료(2026-10-30) 대응. `functions/package.json` `engines.node` `"20"` → `"24"`만 변경. 함수 코드·rules·스키마·Hosting 무변경.
- 기존 14개 함수 전부 같은 코드로 nodejs24 재배포 (`functions:list` 전부 `nodejs24` 확인, 라이브 `redeemCoupon` 정상 응답).
- 롤백: `engines.node`를 `"20"`으로 되돌리고 functions 재배포 (2026-10-30 전까지만 가능).
- `--only functions`.

### 2026-10-03 (`v2026.10.03.186`) — 쿠폰 · 장신구 세공 2옵 · 공성 순서 이동 · 시즌 라운드
- **쿠폰 (§10.9):** GNB 「쿠폰」 버튼·모달. Functions `syncCoupons`(매일 00:00 KST, 7katlas → `site/coupons`) · `redeemCoupon`(넷마블 API 중계, 로그인 불필요, Firestore 무접근). UID·수령 기록은 localStorage만. rules 무변경(`site/{docId}` 기존 공개 read).
- **장신구 세공 (§13.3):** 덱 장비 ① 메인 + ② 세공(optional `accessory2`) 슬롯·6★ 반지 피커(`AccessorySlots`). 구 문서 호환(`accessory2` 없을 때만 구 2옵 해석). 세팅 확인은 `메인 + 세공` 반반 표시.
- **공성전:** 강림과 같은 그립 드래그 순서 이동(`builds/main` 기존 merge 저장 경로, 히스토리 「공성 공략 순서」).
- **시즌 카드:** 길드전·총력전 뒷면 라운드 뱃지(`N / 18`·`N / 22`), 총력전 라운드 = 전투 1회 기준으로 수정 (정본 `docs/content-season-schedule.md`).
- Hosting + `functions:syncCoupons,functions:redeemCoupon` (신규 함수만, 기존 함수·rules 무변경).

### 2026-10-02 (`v2026.10.02.185`) — 세공 실패 문구
- 고정 세공 실패 결과: 부적 미사용 시 「재료 장신구가 소멸했습니다.」, 사용 시 기존 「재료 장신구와 사용한 부적이 소멸했습니다.」. Hosting만.

### 2026-10-02 (`v2026.10.02.184`) — 세공 NPC 멘트
- 연속 3회 성공 대사: 「…다음에 세공하자」→「지금은 여기다 운을 다 쓴 것 같아.. 진짜 세공은 다음에 하자」. Hosting만.

### 2026-10-02 (`v2026.10.02.183`) — 세공 NPC 답변 · 고대 부적 색
- **연속 3회 성공 NPC:** 답변 버튼 「알겠어…」 옆 「니가 뭔데?」 추가 → 같은 팝업에서 `npc-sulk.webp` + 「흥! 니 맘대로 해라!!」 장면(버튼 「흥!」). 장면 정의는 `CraftSimulator.jsx` `NPC_SCENES`(`replies[].next`로 다음 장면).
- **고대 세공 부적:** 배경을 분홍빛(`#e8588a → #7a1a44`)으로 — 전설 부적(빨강)과 구분.
- Hosting만 (rules·Functions·스키마 무변경).

### 2026-10-02 (`v2026.10.02.182`) — 세공 시뮬레이터 · 장신구 등급 수정
- **도구 `/tools/craft` 세공 시뮬레이터:** `CraftSimulator.jsx` + `lib/craftSim.js` + `styles/craftSim.css` + `public/images/craft/`. Firestore·네트워크 없음(브라우저 안에서만 계산·기록).
  - 고정 옵션 세공: 성급 조합 기본 확률 + 부적 1개(+5/10/20/40/100). 베이스와 같은 효과 재료는 잠금.
  - 임의 옵션 세공: 재료는 등급(전설/희귀/고급/일반)만 선택. 공식 확률표 기준, ★6 재료만 전설 옵션 누적 증가(전설 등장 시 초기화). 「내 전설 옵션 확률」 직접 입력.
  - 4/5/6★ 반지 디자인(`public/images/craft/rings/4|5`, 6★은 도감 아이콘). 도감은 6★만.
  - 전설+전설 고정 세공 연속 3회 성공/실패 시 NPC 팝업(`npc-lucky.webp` / `npc-jinx.webp`, `ModalScrim`).
- **도감 장신구 등급:** 복수·수호의 반지 고급→**일반** (`gearDex.js` `NORMAL_KEYS`). 공식 옵션 그룹과 일치.
- **도구 순서:** 세공 시뮬레이터 ↔ 티어리스트 메이커 자리 교체.
- Hosting만 (rules·Functions·스키마 무변경).

### 2026-10-01 (`v2026.10.01.181`) — 귀멸의 칼날 콜라보 · 신화 티어 · 시즌 룰 · 스킬 텍스트
- **영웅:** 카마도 탄지로 · 아가츠마 젠이츠 (기타·`귀멸의 칼날`·공격형·각성, id `collab_카마도탄지로` / `collab_아가츠마젠이츠`) + 초상·카드·스킬·전용장비. 기유·시노부는 미추가.
- **도감 기타 탭:** `콜라보레이션` → `나혼자만 레벨업`, `기타 영웅` 제거, `귀멸의 칼날` 추가.
- **특수 효과 도감:** 내비치는 세계 · 지연 버프 (특수 유틸리티) + 스킬 툴팁.
- **스킬 텍스트:** `SkillRichText` 대상 뱃지 판별 수정 — `[자신] 효과 추가 : …` 줄 괄호 잘림 83건 해소 (§13.1.5).
- **마이페이지 총력전:** `legend_plus` 라벨 「전설 이상」→「신화」+ 아이콘 (저장 id 유지, rules 무변경).
- **상급결투장 시즌 룰:** 자동 순회 제거, `CURRENT_ADVANCED_ARENA_MODE = 'normal'` (기본 모드).
- Hosting만 (rules·Functions·스키마 무변경).

### 2026-09-18 (`v2026.09.18.180`) — 수정·삭제 버튼 · 속공 이름 정렬
- **수정/삭제:** 삭제 PNG `displayScale`을 수정과 동일(0.8)로 맞춤. 접힘 카드 액션 버튼 높이·아이콘 크기 통일.
- **세팅 확인 속공 순서:** 영웅 이름 `text-align: center` (짧은 이름 우측 빈칸 완화).
- Hosting만.

### 2026-09-18 (`v2026.09.18.179`) — PvE 접힘 카드 · 추천도
- **공성·강림·공용 PvE:** 길드전 방어형 접힘/펼침 카드. 제목 아래 **추천도** 1–5★ (`DeckTierStars`, 필드 `tier` optional·기본 3). 방어 lead 「덱 티어」와 라벨·배치 분리.
- **강림:** 1·2라운드 초상 + 그립 드래그 재정렬. 제목 `OverflowTitle` tip.
- **세팅 확인:** 속공 순서 이름+ellipsis. 허브 히어로 모바일 **≤1024** 스택 동기.
- Hosting만 (rules·Functions·스키마 파괴 없음 — `tier` optional 추가).

### 2026-09-17 (`v2026.09.17.176`) — 길드 연합 · 상급결투장 시즌룰 · 허브 UX
- **연합 (§6.3.1):** 1군 호스트 ↔ 2군 게스트 읽기 전용. Callable만 CUD (`create/join/leave/revoke/regen/dissolveAlliance`). rules: `isAllianceGuestOf` **read만** 추가, `allianceIndex`/`allianceGuests` 클라 write 금지, hub 연합 필드 `allianceFieldsUnchanged`.
- **UI:** `AllianceModal` · 홈 연합/나가기 솔리드 버튼 · 나가기·연합 종료 확인 팝업 · 코드 복사/재발급 CopyNotice.
- **상급결투장:** `SeasonRuleBadge` (메인 시즌 카드 뒷면 · 공용 PvP 제목 옆).
- Hosting + `firestore:rules` + `functions` 배포 (`senalink`만).

### 2026-09-03 (`v2026.09.03.174`) — 영웅·프로필·PVE 탭·배경
- **하연** (스페셜·경계의 수호자·지원·각성) `scraped_heroes` + 초상/스킬/전용장비.
- **벨리카** 일반→각성 (`isAwakened`, 각성기「마녀의 그림자」, Active2 쿨 80).
- **루디** 스킬명·아이콘만 (규탄의 검격 / 영겁의 성채 / 철옹의 방벽; 각성「영광의 심판」유지).
- **마이프로필:** `combatPower`(내 전투력 총합) 본인 입력·공개 프로필 표시. `firestore.rules` 화이트리스트 optional 필드 추가(완화 아님).
- **공용 허브 PVE:** 시련의 탑 탭 칸 추가(Coming Soon, Firestore 구독 없음).
- **도감:** 영웅 DB 3열↔1열 전환 **≤980**만 (981–1100 중간 레이아웃 제거).
- **배경:** `public/bg-senari.png` → 세나리 배경 화면2.
- **AGENTS.md §13** 신규·각성·스킬-only·**전용장비 동시 추가** 체크리스트 보강.
- Hosting + `firestore:rules` 배포.

### 2026-08-30 — 내부 정리 Phase 2 (배포·라이브 데이터 무변경)
- **루트 clutter 제거:** `gelidus_success.html` → `scripts/legacy/fixtures/`, `category_success.html`·`asset_list.csv` 삭제.
- **git:** `.firebase/hosting.*.cache` 추적 해제 (`.gitignore`와 일치).
- **`firestore.rules.example`:** 라이브 `firestore.rules`와 동기화 (참고용만, 배포 대상 아님).
- **`.env.example`:** `VITE_USE_EMULATORS`·`tmp_negi_chars_ko.json` 안내 추가.
- **`.gitignore`:** `firestore-debug.log`, 스크래퍼 산출물 패턴 추가.

### 2026-08-30 (`v2026.08.30.151`) — 선명 다크 테마 · 마이페이지 · 길드전 공격 UI
- **화면 테마 (§10.8):** `glass`(유리, 기본) / `solid`(선명 다크). `uiTheme.js` + `themeSolidDark.css` + `index.html` 선적용. 마이프로필 드롭다운 `UiThemeToggle`. `localStorage` `senalink_ui_theme` (계정·시스템 테마 미연동).
- **마이페이지:** 프로필(사진·닉)과 게임 정보(총력전·결투장·파괴신) `glass-inset` 패널 분리.
- **GNB:** 도구 flyout `.gnb-dropdown-panel` → `var(--glass-modal)` (선명 다크에서 불투명).
- **길드전 공격:** 상대·파생 덱·카운터 레이아웃·색 계층·모바일 인라인 카운터 등 UI 정리. 그립 드래그 안내 문구 제거.
- Hosting만 (rules·Functions·스키마 무변경).

### 2026-08-30 (`v2026.08.30.150`) — 길드전 공격 그립 안내 문구 제거
- Hosting만.

### 2026-08-29 — 문서: 미리보기 허브 (§4.1)
- **AGENTS.md §4.1:** 로컬 연습장 = Firebase 에뮬레이터 + `npm run dev` 워크플로·에이전트 켜는 순서·라이브와 코드 동일함을 정리. §14 체크리스트·`read-agents-md` 규칙에 트리거 추가.

### 2026-08-29 (`v2026.08.29.142`) — 길드전 방어 속공 수치·닫기 X 겹침
- **방어 덱 수정 헤더:** 981–1179 구간 토글 가로 스크롤·`header-main`/`author-row` flex로 속공 수치 박스가 닫기 X와 겹치지 않게. ≤980·1180+ 무변경.

### 2026-08-29 (`v2026.08.29.141`) — 덱 수정 영웅 목록 반응형 열
- **PC 덱 수정:** 영웅 그리드 고정 18/10열 → `auto-fill minmax(64px,1fr)` — 폭 줄면 열 수 감소·초상 크기 유지.

### 2026-08-29 (`v2026.08.29.140`) — PvE 장신구 버튼 981–1080 오버플로
- **공성·강림 덱 수정:** `deckEditScrollModal.css` 981–1080에서 장신구(부활·토벌&공성) 버튼이 장비 칸 밖으로 튀지 않게.

### 2026-08-29 (`v2026.08.29.139`) — 덱 수정 모바일 전환 980 통일
- **공성·강림·결투장·총력:** 덱 수정 모달 PC `min-width:981` / 모바일 `max-width:980` — 1080 폭에서 공성·강림도 결투장과 동일 PC 레이아웃.
- **길드전 방어:** 981–1080 헤더 토글 규칙은 별도 블록으로 유지.

### 2026-08-29 (`v2026.08.29.138`) — 길드전 방어 헤더 981–1080
- **방어 덱 수정:** `.gw-defense-edit-modal` — 태블릿 폭 헤더 토글 한 줄(`nowrap`·가로 스크롤). ≤980 모바일 헤더 무변경.

### 2026-08-29 (`v2026.08.29.137`) — 길드전 방어 덱 수정 = 결투장 PC 통스크롤
- **`GuildWarDefensePanel`:** `arena-body-scroll-modal` + `deckEditScrollModal` 헬퍼·휠 전달.
- 헤더 필드 유지: 티어·세팅·덱 유형·기타 디테일·속공 수치.

### 2026-08-29 (`v2026.08.29.136`) — 세팅 디테일 좌열 가득 채움
- **좌열:** `flex:1` 디테일 패널 — 덱 아래 빈 공간·`margin-top:auto` 제거. textarea가 남는 세로 채움.

### 2026-08-29 (`v2026.08.29.134`–`135`) — 풀 높이 본문 스크롤 0 · 세로 부족 시 디테일 빈공간
- **1021+:** 본문 `overflow-y:hidden` 복원 (결투장과 동일).
- **≤1020:** 디테일 위 빈공간 수정 시도 → v136에서 flex 채움으로 정리.

### 2026-08-29 (`v2026.08.29.131`–`133`) — 휠 전달 · 1080 모바일 · PvE 높이
- **휠:** 모달 capture → 본문 스크롤 (영웅·스킬 scroller만 내부 예외).
- **덱 수정 모바일:** 가로 **1080** 이하 세로 스택 (`index.css` 블록 분리; 사이트 GNB 980과 별개).
- **PC 브레이크포인트:** `deckEditScrollModal.css` **1081+**.
- **PvE:** `--deck-gear-h:520px` 등 강림 세팅 디테일 잘림 방지.

### 2026-08-29 (`v2026.08.29.136` 커밋 `ddf69c7`) — 덱 수정 PC 통스크롤 정리 (문서·헬퍼 통합)
- **`deckEditScrollModal.js` / `.css`** · `GuildLounge` · `CommunityGuideEditor` · `AGENTS.md` §12.4 초안.

### 2026-08-29 — 공성·강림 덱 수정 모달 PC 통스크롤 + 영웅 10열
- **PvE kind:** `pve-body-scroll-modal` — 공성전·강림원정대 (길드 허브)
- **헬퍼/CSS 통합:** `deckEditScrollModal.js` · `deckEditScrollModal.css` (arena + pve)
- **장비:** 공성·강림도 `HeroGearPanel` embedded (결투장과 동일)
- **영웅 목록:** PvE PC 풀화면 10열 (기존 ~12열)

### 2026-08-29 — 결투장 덱 수정 모달 구조화
- **CSS:** `src/styles/deckEditScrollModal.css` (PC only, arena 섹션) · `index.css`에서 분리
- **헬퍼:** `src/lib/deckEditScrollModal.js` — GuildLounge·CommunityGuideEditor 공통
- **문서:** AGENTS.md §12.4 · 모바일 CSS 무변경

### 2026-08-27 (`v2026.08.27.71`) — 카운터 중폭 한 줄 · 메타 점
- **공격 카운터:** 1020~671은 초상 오른쪽 제목·작성자, ≤670만 위/아래 스택. 제목·작성자 구분은 `·`.
- **문서:** §10.2 표에 ≤670 행 추가.

### 2026-08-27 (`v2026.08.27.69`) — 길드전 공격·방어 좁은폭 · 구분선 · 기타 디테일
- **공격(≤1020 / ≤480 / ≤400):** 인라인 카운터·툴바 스택·한글 nowrap. ≤400만 수정·삭제 세로·카운터 초상/제목 가운데(숫자 과축소·제목 선제 상단 이동 금지). 우선순위 오른쪽 `|`.
- **방어(≤980):** 헤더 `그립 | 덱 티어 |` 모바일에서도 표시. 펼침 기타 디테일 `order:4`(세팅확인·스킬예약 아래). PC 기타 디테일 폭 = 스킬 예약.
- **문서:** §10.2 브레이크포인트 표 · §12.2–12.3 좁은폭/아이콘·캡처 워밍 규칙. Hosting만 (rules·Functions·스키마 무변경).

### 2026-08-25 (`v2026.08.25.77`) — 태블릿 구글 로그인 복구
- **원인:** `firebase@12.17.x` Auth IndexedDB가 팝업/탭 로그인 시 opener `hidden`이면 `Database is closing/hidden`으로 실패 ([firebase-js-sdk#10264](https://github.com/firebase/firebase-js-sdk/issues/10264)).
- **조치:** 클라이언트 `firebase`를 **`12.16.0` 고정**(caret 없음). 앱 로직·rules·Functions 무변경. Hosting만 재배포.
- **임시 핀:** 공식 Auth 픽스 버전이 안정되면 재검토 후 올리기.

### 2026-08-25 (`v2026.08.25.68`) — 시즌 보드 · 모바일 · 세팅 공유
- **모바일 UI:** 세팅 공유 캡처(초상/스킬 아이콘), 길드전 공격 접힘·카운터 행, 도감 시스템 공식·스킬 툴팁 등 다수 손봄 (PC 레이아웃·권한 스키마 무변경 원칙 유지).
- **메인 시즌 진행판:** 길드전·상급결투장·총력전·강림원정대 플립 카드 (`ContentSeasonBadges` + `contentSeasonSchedule` · 앵커·정본 `docs/content-season-schedule.md`). Firestore 없음, KST 자동 사이클.
- **세팅 공유 캡처:** 모바일에서 이미지 누락 완화 (`copyNodeImage` dataURL 이식 + 뷰포트 안 캡처 호스트).
- **메인 기용률/뉴스:** PC 2열 높이 맞춤 — 기용률 기준, 뉴스만 내부 스크롤.
- **인프라(동봉):** `visitShards` 분산 방문 카운터(rules), `communityGuides` 인덱스, `resolveMyHub` collectionGroup·허브 엠블럼 prefix 삭제.

### 2026-08-24 (`v2026.08.24.64`) — 모바일 UI 안정 (PC 레이아웃·권한 무변경)
- **세팅 공유:** 이미지 fetch→dataURL 이식 + 캡처 호스트를 뷰포트 안(투명)에 두어 모바일에서 초상/스킬 아이콘 누락 완화.
- **길드전 공격:** 진입 시 상대 덱 접힘(`selectedGwAttackId=null`). 모바일 카운터 행은 수정·삭제를 오른쪽 세로 배치(아래 줄 공백 제거).
- **도감 시스템:** 효과 적중/저항 공식 모바일 1열. 스킬 툴팁 뷰포트 clamp(좌우·위아래).

### 2026-08-24 (`v2026.08.24.63`) — 방문자 분산 카운터
- **site/stats:** Firestore distributed counter — `visitShards/{0–31}`에만 신규 +1. 표시는 레거시 `site/stats` + 샤드 합산(기존 total 보존). rules는 레거시와 동일하게 **정확히 +1**만 허용(완화 없음). **rules+hosting 동시 배포 필요.**

### 2026-08-24 (`v2026.08.24.62`) — 운영 안정성 (권한·데이터 스키마 파괴 없음)
- **communityGuides:** `/community` 공용 공략(`section` pve·pvp 각각) `orderBy(updatedAt desc)` + limit 100. 길드 허브 `builds`와 무관. 인덱스 미준비 시 구 쿼리 폴백.
- **site/stats:** (63에서 샤딩으로 대체) 재시도만으로는 단일 문서 한계 미해소.
- **resolveMyHub:** `members.uid` collectionGroup 우선 + 구형 문서는 허브 페이지 스캔 폴백·uid 백필. 가입/개설 시 `members.uid` 기록.
- **허브 해체 Storage:** `hubEmblems/{hubId}/` prefix 전체 삭제(byUser 경로 포함).
- **보류:** Ops 전체 로딩 페이지네이션, builds/main 카테고리 분리, 인앱 구글 로그인 UX — 추후.

### 2026-08-24 (`v2026.08.24.61`)
- **메인페이지 길드 순위 모바일 최적화**: 모바일(`@media (max-width: 760px)`)에서 길드 순위 행의 1열 폭(`32px`), 순위 뱃지(`22px`), 길드마크(`24px`) 축소 및 소속 뱃지(`font-size: 10px`, `padding: 2px 7px`), 리그 칩(`font-size: 9px`, `padding: 2px 6px`) 컴팩트화로 좁은 화면(iPhone 등)에서 길드명과 뱃지가 겹치는 문제 해결 (PC 스타일 무영향).
