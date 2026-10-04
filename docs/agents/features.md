# 기능 영역별 동작 — AGENTS.md §10

> AGENTS.md에서 분리한 상세 문서 (원문 그대로). 절 번호(§)는 AGENTS.md와 동일하게 유지한다.
> 공통 금지·데이터 보호 규칙은 항상 루트 `AGENTS.md` §2.1이 우선.

## 10. 기능 영역별 동작

### 10.1 메인 CMS · 입장 배너 · 방문자

| 항목 | 위치 |
|------|------|
| 문서 | `site/main` |
| 기본값 | `src/data/siteMain.defaults.js` |
| 구독/저장 | `src/lib/siteMain.js` → `useSiteMain()` |
| Ops 편집 | `/ops` → **메인페이지** → `MainSiteEditor.jsx` (저장만, 「비우기」없음) |
| 필드 | headline, subhead, highlight, metaDecks(4), pickRates(5), news[], entranceBanner, updatedAt/By |
| 입장 배너 UI | `SiteEntranceBanner.jsx` (오늘 안 보기: localStorage) |
| 방문 집계 | `siteVisitStats.js` — 쓰기: **32 샤드** `site/stats/visitShards/{id}` 랜덤 +1(충돌 시 다른 샤드). 읽기: 레거시 `site/stats` + 샤드 합산. 브라우저당 KST 하루 1회(`senalink_site_visit_day`). 히어로·ops 표시. 시크릿 창 어뷰징 완전차단 불가 |
| 기용률·뉴스 2열 | PC: 기용률 패널이 행 높이 기준, 뉴스(`.main-news-scroller`)만 내부 스크롤. 모바일(≤900px): 1열, 뉴스 `max-height` 후 스크롤 |

### 10.2 길드 허브 vs 커뮤니티 (빌드 분리)

| | 길드 허브 | 커뮤니티 |
|--|----------|----------|
| 데이터 | `hubs/{hubId}/builds/main` **단일 문서 번들** | `communityGuides/{id}` **문서 다수** |
| UI | `GuildLounge.jsx` | `pages/community/*` + `lib/communityGuides.js` |
| 내용 | siege, expedition, arena, totalwar, gwAttacks/Defenses, … | section pve/pvp, category, 영웅/장비/스킬, likes… |
| 접근 | 허브 멤버만 | 공개 읽기; PvP는 닉네임 유저 작성; PvE·티어리스트는 Super |
| 티어 | 허브 내 UI | `communityTierLists/pve` · `pvp` |

규칙 주석: community guides는 길드 builds와 **완전 분리**.

길드전 공격/방어 패널: `GuildWarAttackPanel.jsx`, `GuildWarDefensePanel.jsx`.

- **공격 상대 목록:** 최대 ~12행 높이에서 내부 스크롤(`.gw-attack-list-body`). 선택 카드는 더 진한 테두리·배경. 카운터는 별도 레이어(`.gw-counter-layer`).
- **카운터 우선순위:** `counters[]` **배열 순서 = 1위부터**. 왼쪽 그립 드래그로 재정렬(스키마 추가 없음). 리드 UI: **그립 `|` 우선순위 `|` 초상** (구분선은 lead 안에 두어 모바일에서도 유지).
- **방어 리스트:** PC·모바일 모두 **1열** (공용 PvP 결투장과 동일). `.gw-defense-grid--stack`. 접힌 헤더 lead: **그립 `|` 덱 티어 `|`** 초상·메타 | 수정·삭제·대체 덱. 펼침: 덱(세팅 확인) → 스킬 예약 → **기타 디테일**. **방어 덱 수정 모달**은 결투장과 동일 PC 통스크롤(`arena-body-scroll-modal` · §12.4) — 헤더만 덱 티어·세팅·덱 유형·기타 디테일·속공 수치 유지. 모달 클래스 `gw-defense-edit-modal`.
- **기타 디테일 박스:** PC에서 스킬 예약과 **같은 열 폭** (`max-width` 제한 없음). 모바일에서 `.build-panel-body { display: contents }` 사용 시 **반드시 `order: 4`** — 없으면 order 0으로 맨 위에 붙음.

#### PvE 접힘 카드 (공성 · 강림 · 공용 PvE)

길드전 방어와 같은 `community-pvp-card` 접힘/펼침. 별점 UI는 `DeckTierStars` / `DeckTierBlock` 공유.

| | 길드 허브 공성·강림 | 공용 허브 PvE | 길드전 방어 |
|--|--|--|--|
| 별점 필드 | 빌드 객체 `tier` (1–5, 없으면 표시·저장 시 **3**) | `communityGuides.tier` 동일 | `gwDefenses[].tier` |
| 라벨 | **추천도** (제목 아래, 가운데 정렬 + `|--------|` 구분선) | 동일 | **덱 티어** (lead 칸) |
| 접힘 헤더 | 제목(+추천도) `|` 초상 `|` 작성자 \| 수정·삭제 | 동일 | 그립 `|` 덱 티어 `|` … |
| 순서 이동 | 공성·강림 모두 그립 드래그 재정렬(방어와 동일, `canEditBuilds`만). 강림은 1·2라운드 초상 행 | — | — |
| 긴 제목 | `OverflowTitle` tip (PC hover / 모바일 tap) | 동일 | — |

- 스키마: **optional** 숫자 필드만 추가. rules·Functions 변경 없음. 구 문서에 `tier` 없어도 읽기 OK (`normalizeDeckTier`).
- 허브 저장: `builds/main` `setDoc(…, { merge: true })` — 기존 카테고리 키 보존 전제 유지.
- 허브 히어로(`.hub-header`) 모바일 스택은 접힘 카드와 같이 **≤1024**.

#### 길드전 화면 폭 브레이크포인트 (요지)

| 폭 | 공격 | 방어 |
|----|------|------|
| **≤1020** | 1열·인라인 카운터. **1020~671:** 카운터 행 `lead \| 초상 \| 제목·작성자 \| 액션` (한 줄). **이 블록 CSS는 베이스 `.gw-attack-detail` / `.gw-attack-inline-counters`보다 아래에 둘 것** | (공용 PvP ≤1024 스택과 별도) |
| **≤670** | 카운터 행만 다시 **제목 위 / 초상 아래** 스택 (좁아지면 옆 배치가 답답) | — |
| **981–1024** | — | 공용 PvP는 스택이어도 **방어만 PC 한 줄 유지** |
| **≤980** | — | 방어 헤더 1행 그리드 `tier \| stage \| actions`. lead 안 `|`는 **숨기지 말 것** (공용 `.community-pvp-card-rule{display:none}`을 방어 lead에서 덮어씀) |
| **≤480** | 「상대 덱 목록」·카운터 툴바: 제목/추가 버튼 **세로 분리** + 라벨 `nowrap`/ellipsis (한 글자씩 세로 찢김 방지) | 대체 덱 툴바도 동일 분리 |
| **≤400** | **초소형만.** 상대 덱: 제목은 초상 **옆** 유지 + 수정·삭제 **세로**(제목을 미리 위로 올리지 말 것). 카운터: 「우선순위」라벨 숨김·숫자는 **살짝만** 축소(14px), 초상 **가운데·축소 CSS 금지**, 제목\|작성자도 가운데 | — |
| **≤380** | 패딩·버튼 타이트 | 대체 덱/수정·삭제 버튼만 더 작게 |

**현실 폭:** 요즘 폰 CSS는 대개 **360 / 375 / 390+**. 350 미만은 거의 없음 → **≤400 특례면 충분**, 300대만 겨냥한 과한 축소는 피할 것.

초대 링크: 항상 **`/hub?lounge={code}`** (`inviteLink`). `?lounge=`가 `/` 등에 있으면 `/hub`로 리다이렉트. 미로그인 시 Join 모달 자동 오픈 금지 → 구글 로그인 → `NicknameGate` → Join.

### 10.3 Ops 관리자 (`/ops`)

`OpsPage.jsx` — Super만 탭 진입:

1. **대시보드** (기본 탭) — `OpsDashboard` — KPI · 일별 추이(방문자 `site/visitDaily` / 길드 가입 `members.joinedAt` / 허브 개설 `hubs.createdAt`) · 인원 TOP5 · 자동 정리 임박
2. **메인페이지** — `MainSiteEditor` (+ `OpsMetaDeckModal`)
3. **길드 허브 감독** — `HubOversee` (`hubOversee.js`) — 표(인원 게이지·마스터·최근 활동) · 정렬·필터 · 상세 패널(길드원·추방·허브 열기)
4. **유저 감독** — `UserOversee` (`userOversee.js`) — 목록·집계만, **강제탈퇴 UI 없음**. 허브 이름 클릭 → 허브 상세

- 대시보드·허브·유저 탭은 `OpsPage`가 `loadOpsSnapshot()`(`lib/opsInsights.js`)으로 허브 전체 + 허브별 members + users를 **한 번** 읽어 공유(새로고침 시만 재조회). 메인페이지 탭에선 읽지 않음. **읽기 전용**, 규칙 변경 없음.
- 스타일: `src/styles/opsAdmin.css` (`opsx-*`, OpsPage에서만 import).
- `site/visitDaily` = `{ days: { 'YYYY-MM-DD': count }, updatedAt }` — Functions `snapshotVisitDaily`(10분마다)만 쓰기. 기존 `site/{docId}` 공개 read 규칙으로 읽힘, 클라 write 불가.

### 10.4 「수정 및 고정자」 시각

`AuthorMeta` / `formatUpdateAtDisplay` (`PublicProfileModal.jsx`):  
저장은 ISO 유지, **표시만** `YYYY-MM-DD|HH:mm` · **Asia/Seoul 24시**.

### 10.5 도구 · 도감

- 도구: `ToolsPage` / `data/tools.js` (승확 계산기·세공 시뮬레이터·티어리스트 메이커 등). 세공 시뮬레이터 확률·규칙은 `src/lib/craftSim.js`가 단일 소스
- 도감: `EncyclopediaPage` → `DbHub` → `HeroDB` / `EquipDB` / `SystemDB`
- **도감 영웅 DB 레이아웃:** PC **3열**은 **≥981** 유지. **1열 스택은 ≤980만** (예전 1100 중간 브레이크 없음).
- **모바일 도감 영웅 상세(≤760/≤980 블록):** `.hero-db-detail`은 `max-height`/`overflow` 풀어 **스킬 설명 내부 스크롤 없이** 페이지로 펼침. 영웅 **목록** 칸 스크롤·PC(고정 높이 3열)는 유지.

### 10.6 세팅 확인 (`InGameDeckCard`)

- 모달 클래스 `.setting-overview-modal` — 화면 폭 **고정** `min(760px, 96vw)` (덱마다 `fit-content`로 가로가 들쭉날쭉하지 않게).
- 모바일(≤760px) 세팅 개요: 장비 1열, `.setting-overview-deck`는 `height:auto` — **배치·펫 잘림 방지**. PC·`.setting-capture-pc`(공유 PNG 980px)와 분리.
- **모달 뒤 블러:** body portal이라 스크림 `backdrop-filter`만으로는 뒤가 비침. **`body:has(> .modal-scrim) .app-shell` / `#root::before` 의 `filter: blur(22px)`는 의도된 것 — 성능 핑계로 제거하지 말 것.**
- 서브모달 오픈: 아래에 스크림이 있을 때만 `flushSync`+cover(길드전 카운터 등). **단독 오픈은 rAF 양보** 후 열어 버튼 `:active`가 보이게. 데이터 로딩 경로와 무관.

### 10.7 컨텐츠 시즌 카드 (메인)

메인 히어로 아래 플립 카드 4장. Firestore 없음 · KST만 계산 · 앵커 기준 자동 사이클.

| 파일 | 역할 |
|------|------|
| **`docs/content-season-schedule.md`** | **정본** — 일정·`frontStatus` 문자열·함정·체크리스트. **패치 전 필수 열람** |
| `src/config/contentSeasonAnchors.js` | 라이브 앵커일 (일정 틀어지면 여기만) |
| `src/lib/contentSeasonSchedule.js` | `frontStatus` · `burning` · `endsAtLabel` · progress |
| `src/components/ContentSeasonBadges.jsx` | UI (PC hover / 모바일 탭+3초 복귀) |
| `public/images/content-season/` | 아이콘 |

**표시 순서:** 길드전 → 상급결투장 → 총력전 → 강림원정대  

**앞면:** 아이콘 + `frontStatus` · **뒷면:** 이름 + `YYYY.MM.DD 종료` + 게이지  

**상급결투장 시즌 룰 (뒷면 뱃지):**  
- UI: `SeasonRuleBadge` — 모드 아이콘 + 「Season Rules」텍스트, 유리 테마 바  
- 데이터: `contentSeasonSchedule.js`의 `ADVANCED_ARENA_SEASON_MODES` (아이콘·`title`·`desc`) + **`CURRENT_ADVANCED_ARENA_MODE`** (기본 `normal` = 「기본 모드 · 5대5의 기본 규칙으로 진행됩니다.」) · `getAdvancedArenaSeasonRule()`. **자동 순회 없음** — 게임 모드 순서가 고정이 아님  
- **표시 위치:** 메인 시즌 카드 뒷면 · **공용 허브 PvP → 상급 결투장** 제목 「상급 결투장 공략」옆 `|` 구분 (`CommunityPvpPanel`)  
- **툴팁:** PC hover / 모바일 tap — 도감 스킬 팁(`.skill-tip-pop`)과 동일. `desc` 있을 때만 활성  
- **시즌 바뀔 때:** 밍봉이 이번 모드를 알려주면 `CURRENT_ADVANCED_ARENA_MODE` 키만 교체(필요 시 해당 모드 `title`/`desc`/아이콘 보강). 별말 없으면 **기본 모드 유지**. Firestore 없음  

**테두리 (`burning` → `is-live` 스핀 / 아니면 `is-prep` 회색)** — 상세는 정본 §0.1·§0.2.

| 컨텐츠 | 스핀 | 회색 고정 (요지) |
|--------|------|------------------|
| 길드전 | `길드전 진행 중`만 | 매칭·정산·휴전일·설정·배치·시즌 준비 |
| 총력전 | `전투 진행 중`만 | 라운드 준비·결산·시즌 준비 |
| 상급·원정 | `시즌 진행 중` | `시즌 준비` |

**길드전 핵심 (수→토):** 목 02~09 `정산` → 목 09~금 09 `휴전일`(금 08~09 포함) → 금 09 방어덱 설정 → 배치 → 토 08~09 `상대 길드 매칭` → 전투.  
**총력전:** 목~금 14:00 = `시즌 준비`(입장 멘트 없음) · R1~22 = 금 14:00 기점.  
패치 시 **정본을 코드보다 우선**하고, 문자열은 정본 §0.2와 코드가 일치해야 한다.

### 10.8 화면 테마 — 유리 / 선명 다크

OS 라이트·다크가 아니라 **사이트 스킨** 두 가지. Firestore·계정 동기화 없음.

| 모드 | `data-ui-theme` | 느낌 |
|------|-----------------|------|
| **유리** (기본) | `glass` | 반투명·`backdrop-filter`·기존 세나링크 |
| **선명 다크** | `solid` | 불투명 패널·블러 제거·가독성 우선 |

| 파일 | 역할 |
|------|------|
| `src/lib/uiTheme.js` | `initUiTheme` / `setUiTheme` · `localStorage` 키 `senalink_ui_theme` |
| `src/styles/themeSolidDark.css` | `html[data-ui-theme="solid"]` 토큰·오버라이드·프로필 테마 토글 CSS |
| `src/main.jsx` | `initUiTheme()` + `themeSolidDark.css` import |
| `index.html` `<head>` | 짧은 인라인 스크립트로 React 전 테마 적용 (깜빡임 방지) |
| `src/components/UiThemeToggle.jsx` | GNB **마이프로필** 드롭다운 하단 달·해 스위치 |

**저장:** 브라우저 `localStorage`만 (기기별). 첫 방문·저장 없음 → **유리**. 시스템 `prefers-color-scheme` 미연동.

**패치 시:** 패널·GNB·모달은 `--glass-bg` / `--glass-modal` / `--glass-blur` 쓰게 유지. 하드코딩 `rgba`+`blur`면 선명 다크에서 유리처럼 남음 (예: `.gnb-dropdown-panel`은 변수 사용). 선명 모드에서 모달 뒤 `.app-shell` blur는 끔 — 유리 모드 blur(§10.6)는 유지.

### 10.9 쿠폰 사용 (GNB 「쿠폰」)

GNB **일일 타로카드 | 쿠폰 | 마이프로필** (모바일: 마이프로필 | 쿠폰 | 타로). 7katlas.com/coupons.html 기능 이식.

| 파일 | 역할 |
|------|------|
| `src/components/CouponButton.jsx` · `CouponModal.jsx` · `src/styles/coupon.css` | 버튼·모달 UI |
| `src/lib/coupons.js` | `site/coupons` 1회 읽기 · Callable `redeemCoupon` · localStorage |
| `src/data/coupons.defaults.js` | `site/coupons` 없을 때 폴백 목록 |
| `functions/couponSync.js` | 7katlas 파싱(원격 JS **실행 안 함**, 텍스트 파싱) · 넷마블 errorCode → 상태 |

- 넷마블 API(`coupon.netmarble.com/api/coupon`, gameCode `tskgb`)는 브라우저 CORS 차단 → 반드시 Functions 중계.
- **UID·수령 기록은 브라우저 localStorage만** (`senalink_coupon_uid_v1` / `_remember_v1` / `_history_v1`, UID별). 서버·`users` 문서에 저장 안 함 → rules 변경 없음.
- `site/coupons`는 기존 `site/{docId}` 공개 read 규칙으로 읽힘. 쓰기는 Admin SDK(syncCoupons)만 — 클라 write 규칙 추가 금지.
- 상태: `success` `already`(24003·24004) `expired` `not_target` = 완료 / `invalid_code` `invalid_uid` `rate_limited`(24001) `error` = 재시도.
