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
| 결투장 메타 덱 배치 | **항상 가로 한 줄**(밍봉 — 2×2로 두 줄 깔리면 안 됨). PC(>1100) 4열 그리드(`.meta-deck-row--desktop`) · ≤1100 캐러셀(`MetaDeckCarousel`, 한 장씩 넘김): 900~1100 세 장(`is-three`) · 700~899 두 장(`is-two`) · 700 미만 폰 한 장. 한 줄 4장은 ≤1100에서 카드가 덱 배치보다 좁아져서 안 씀. CSS는 index.css 「메인 결투장 메타 덱: ≤1100은 캐러셀」 블록(기본 `.meta-deck-carousel { display: none }`보다 뒤에 둘 것) |
| 입장 배너 UI | `SiteEntranceBanner.jsx` (오늘 안 보기: localStorage) |
| 방문 집계 | `siteVisitStats.js` — 쓰기: **32 샤드** `site/stats/visitShards/{id}` 랜덤 +1(충돌 시 다른 샤드). 읽기: 레거시 `site/stats` + 샤드 합산. 브라우저당 KST 하루 1회(`senalink_site_visit_day`). 히어로·ops 표시. 시크릿 창 어뷰징 완전차단 불가 |
| 기용률·뉴스 2열 | PC: 기용률 패널이 행 높이 기준, 뉴스(`.main-news-scroller`)만 내부 스크롤. 모바일(≤900px): 1열, 뉴스 `max-height` 후 스크롤 |
| 결투장 메타 덱 공유 | 메인 제목 「결투장 메타 덱」 옆 「메타 덱 공유하기」 → `MetaDeckShare.jsx`(lazy): 안내(감사 · 결투장 랭킹 300위 안 권장 · 승인 시 메인 배너 + 인게임 닉네임) → 로그인 필요 → `OpsMetaDeckModal variant="submit"`(티어 · 픽률 · 모드 칸 없음, 인게임 닉네임 칸) → `submitMetaDeck`. 모달 배치는 원래 덱 수정 모달과 같게: 왼쪽 덱 카드 + 바로 밑 「세팅 디테일」(빈 공간 없음) · 오른쪽 장비, 모바일(≤980, `index.css` `.meta-deck-editor-*` 블록)은 제목+X 한 줄 → 덱 · 세팅 디테일 → 영웅 목록 → 장비. 저장 `metaDeckSubmissions/{uid}`(계정당 1개, 다시 내면 덮어씀, 덱은 `deckJson` 문자열 ≤20,000자, status `pending`) — `lib/metaDeckSubmissions.js` |
| 메타 덱 승인 | `/ops` 메인페이지 「유저가 제출한 덱 보기」 → `OpsMetaDeckSubmissions.jsx`: 승인 = 칸 1~4 · 티어 · 픽률 고르기 → `MainSiteEditor.approveSubmission`(지금 폼에 그 칸만 바꿔 **기존 `saveSiteMain`으로 저장**, 저장 안 한 편집이 있으면 확인창) → 성공 후 제출 `approved`(+`approvedSlot`). 반려 = `rejected`. **반려 탭 = 휴지통**(밍봉 지시): 대기 → 승인 · 반려, 승인됨 → 다른 칸에 다시 승인 · 반려, 반려 → 다시 승인 · 「기록 삭제」(`deleteMetaDeckSubmission`, 완전 삭제는 반려 탭에서만, 메인에 걸린 덱은 그대로). 탭 대기 · 승인됨 · 반려(휴지통) · 전체(기본 대기). 문서가 계정당 1개라 무한히 쌓이지는 않음. 제출 화면 하단 = 준비 칩(제목 · 인게임 닉네임 · 영웅 n/5, 모바일 가운데) + 사이트 기본 `btn-ops` 「관리자에게 제출」(다 채워야 켜짐 — 버튼 색 · 모양 바꾸지 말 것). 메인 카드 「작성 · 인게임 닉네임」 = `metaDecks[i].author.ingameName`(ops 덱 세팅에서 수정 · 비우기 가능) |

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
- **상대 덱 검색:** 「상대 덱 목록」과 「상대 덱 추가」 사이 `.gw-attack-search` (≤480은 제목 아래 한 줄). 판정은 `lib/gwDeckSearch.js` `gwDeckMatchesQuery` — ① 덱 제목 부분 일치 ② 아니면 검색어를 덱 영웅 이름(단어마다 — 카마도 탄지로 = 카마도 · 탄지로)의 **앞부분**들로 끝까지 나눌 수 있으면 일치(순서 무관 — 윤동목 · 목동윤, 「오」 = 오공 · 오목 · 오르카 전부, 「오공선」처럼 이름 통째로도 됨, 초성 ㅇㄷㅁ도 앞글자 기준). **이름 중간 글자는 안 봄**(밍봉: 오공은 「공」이 아니라 「오」로 부름). 앞글자가 아닌 말로 부르는 예외는 같은 파일 **`HERO_SEARCH_ALIASES`**에만 추가(지금 오목 → 「목」). 파생 덱만 걸리면 파생 목록을 자동으로 펼침. 화면 상태만, 저장 없음.
- 검색칸은 `components/GwDeckSearch.jsx`.
- **맞은 영웅 강조:** `gwDeckHitHeroes(deck, query)` = 검색어를 나누는 데 쓰일 수 있는 영웅들(방법이 여러 개면 전부). 상대 덱 목록에서 맞은 초상만 또렷 · 나머지 흐리게(`.has-search-hits` + `.is-search-hit`, `MiniHeroTrio`). 제목으로만 맞은 덱은 흐리게 안 함.
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
- **외부 링크 도구:** `TOOL_ITEMS` 항목에 `href`가 있으면 우리 화면을 열지 않고 새 탭으로 그 주소를 엶(`noopener,noreferrer`), `/tools/{id}` 주소로도 열리지 않음. 지금 「과금 효율 계산기」(`spend-calc`, 세공 시뮬레이터 다음 자리, 아이콘 `toolSpendCalc`) → `https://senalog.kr/`.
- 도감: `EncyclopediaPage` → `DbHub` → `HeroDB` / `EquipDB` / `SystemDB`
- **상단 메뉴 카드 (공용 허브 · 도구 · 도감 공통):** `src/components/HoverGateCard.jsx` + `src/styles/hoverGate.css`(`main.jsx`에서 import). 팀 빌더 모드 카드(§10.10)의 작은 판 — 평소 아이콘 26px + 이름, 올리면 아이콘 `scale(2.2)` · `blur(5px)` · 둥실 + 이름 · 설명. 카드 높이 104px(팀 빌더 250px보다 낮음): **이 메뉴 아이콘은 작은 화면용 원본(50~74px)이라 크게 또렷이 보이면 화질이 떨어져 보임** → 평소엔 작게, 키울 땐 항상 흐리게. 선택 = 흰 카드 + 검은 아이콘(`is-on`), 준비 중 = 흐림(`is-soon`, disabled). 터치 · `hover: none` · 폭 760px 이하는 처음부터 아이콘 + 이름 + 설명 세로 배치. 선명 다크 테마는 `--glass-inset` 단색 배경. 감싸는 칸 배치(4열 · 2열 등)는 기존 `.dex-hub-tabs` · `.tools-hero-gates` · `.community-hero-gates` 그대로. 예전 버튼 클래스(`dex-hub-tab` · `tools-hero-gate` · `community-hero-gate`) CSS는 `index.css`에 남아 있지만 더 이상 안 씀.
- **길드 허브 상단 탭:** 알약 모양 · 배치 그대로(밍봉 선택). `GuildLounge` 탭 줄에 `hub-tab-bar` 클래스 → `hoverGate.css`에서 마우스 있는 PC(≥981)만 올릴 때 `scale(1.05) rotate(-1.5deg)` + 그림자 + 아이콘 둥실(`hgPillFloat`). 가로 스크롤 칸이라 `padding: 4px; margin: -4px`로 커진 알약이 안 잘리게 함. 모바일 탭 줄 규칙은 안 건드림. `/ops` 탭 줄(`tab-bar-wrap`)에는 적용 안 됨.
- **도감 영웅 DB 레이아웃:** PC **3열**은 **≥981** 유지. **1열 스택은 ≤980만** (예전 1100 중간 브레이크 없음).
- **영웅 DB 위쪽 순서(≤980, 밍봉 확정):** 영웅 도감(제목 · 대분류 탭 · 검색) → 소속(카테고리) → **역할군 속성** → 영웅 목록. 역할군 필터는 `renderRoleFilter('top')`(PC, 도감 칸 위) · `('stack')`(≤980, `hero-db-grid` 안 소속 다음)으로 두 번 그리고 CSS로 하나만 보임. ≤980 역할군 줄은 소속 줄과 같이 **한 줄 + 가로로 넘김**(줄바꿈 금지, 「옆으로 넘기세요」 같은 안내 글은 넣지 않음 — 밍봉). 소속 · 역할군은 **선택된 걸 다시 누르면 풀림**(소속 `activeFaction = null` → 대분류 안 전체, 역할군 → 「전체」). 501~980은 제목 · 검색 한 줄 + 「스페셜/일반/…」탭 아래 한 줄(가로 스크롤) — 탭을 제목과 검색 사이에 두면 2~3줄로 세로로 쌓임.
- **모바일 도감 영웅 상세(≤760/≤980 블록):** `.hero-db-detail`은 `max-height`/`overflow` 풀어 **스킬 설명 내부 스크롤 없이** 페이지로 펼침. 영웅 **목록** 칸 스크롤·PC(고정 높이 3열)는 유지.
- **도감 스킬 칸 배치 (`HeroDB` `layoutSkills`, 밍봉 확정):** 일반 각성 영웅(전환 스킬 없음)의 각성기는 모바일에서 **맨 아래 넓은 줄**(작은 칸으로 혼자 내려가지 않게). 변신 · 분신 · 자세 전환 영웅(델론즈 · 오공 · 쥬피)은 PC · 모바일 모두 윗줄 원래 스킬, **바로 아래 칸에 전환 스킬**(꼬리표 「스킬1 전환」), 각성기는 **패시브 아래 칸**(델론즈 4×2 — 칸 수에 맞춤). 둘을 섞지 말 것(밍봉 확정). 전환 스킬 판정 = 방향(upper/down) 데이터가 있는 영웅에서 원래 스킬 바로 뒤의 방향 없는 active — 방향 데이터가 없는 콜라보(성진우 등)는 한 줄 그대로. PC 일반 각성 영웅은 한 줄 5칸 유지.

### 10.6 세팅 확인 (`InGameDeckCard` → `SettingOverviewModal`)

- **파일 위치(2026-11-08 분리):** 창 내용 = `components/SettingOverviewModal.jsx`(배치 · 펫 칸 · 길드전 카드 · 메모 · 장비 칸 전부), 열기/닫기 · 공유 버튼 상태 = `InGameDeckCard.jsx`, 진형 그리기 = `components/deckFormation.jsx`(`renderFormationCircleIcon` · `renderDeckFormationLayout` — InGameDeckCard에서 다시 export). **CSS = `src/styles/settingOverview.css`**(index.css에서 옮김, `main.jsx`에서 index.css **바로 다음**에 import — 순서가 바뀌면 같은 우선순위 규칙이 뒤집힘). 아래 글의 「index.css 블록」은 이 파일.

- 모달 클래스 `.setting-overview-modal` — 화면 폭 **고정** `min(760px, 96vw)` (덱마다 `fit-content`로 가로가 들쭉날쭉하지 않게).
- 모바일(≤760px) 세팅 개요: 장비 1열, `.setting-overview-deck`는 `height:auto` — **배치·펫 잘림 방지**. PC·`.setting-capture-pc`(공유 PNG 980px)와 분리.
- **배치 · 펫 칸 공통(밍봉 확정):** 진형 배치 옆 칸 = **펫(영웅 초상 폭의 92% · 비율 162:154, 밍봉 — 100%는 커 보이고 85%는 너무 작음) + 진형 아이콘, 글자 없음**(`renderOverviewDeckSide`, 5인 · 길드전 같은 조각 — 펫 · 진형 이름 넣지 말 것). **장비 칸 열 수:** PC 3열 · ≤1100 2열 · **1열은 스마트폰(≤560)만**(밍봉: 1열인데 가로가 너무 길면 안 됨). 2열은 카드 폭 230px+부터 이름 · 세트 · 「모든 공격력(%)」이 안 잘림 — 560px에서 측정, 390 폰에서 2열은 145px라 불가. **5인 배치 · 펫은 장비가 1열일 때(≤560)만 맨 위**(속공 순서 · 스킬 예약보다 위), 2열 이상이면 **장비 그리드 첫 칸**(밍봉 확정 — 위로 빼면 빈칸, 끝 칸 말고 첫 칸). 1열 전용 CSS(카드 높이 auto · 배치 칸 크기)도 ≤560 블록, 헤더 가운데 · 글자 크기 같은 폰 다듬기는 ≤760 블록. 5인은 `renderOverviewDeckBox('top')`을 본문 맨 위에 한 번 더 그리고 그리드 칸(`--grid`)은 숨김, 길드전은 `.setting-overview-trio-decks { order: -1 }`. 예외: 길드전 공격 카드 두 장은 ≤1100부터 스킬 예약 옆에 안 들어가서 위 한 줄(60px). 공유 PNG(`.setting-capture-pc`)는 PC 배치로 되돌림. CSS는 index.css 「세팅 확인 · 배치 · 펫 칸」 한 블록(길드전 크기는 `--gw-slot` · `--gw-gap` · `--gw-col-gap` 변수만 바꿈).
- **진형 세로 가운데:** 배치 칸 높이가 auto인 곳(≤1100 `--top`, 길드전 카드)은 `.deck-stage-formation` · `.deck-stage-rows` · `.deck-stage-col`도 `height: auto`여야 짧은 줄(보호 진형 뒷줄 1명 등)이 긴 줄 가운데에 옴 — 기본 `height: 100%`가 남으면 위로 쏠림(밍봉 지적).
- **길드전(3인, `maxHeroes ≤ 3`):** 배치 · 펫은 장비 칸(5인용 `.setting-overview-deck`) 대신 `.setting-overview-trio-deck` 카드. 기본은 **스킬 예약 오른쪽**, 카드 높이 = 스킬 예약 칸 높이(≈246px, 4칸 진형 기준)라 초상 50px가 한도. 공격 두 장은 ≤1100 스킬 예약 위(60px, ≤760은 `clamp(38px, 10vw, 60px)` — 390 폰 39px), 방어 한 장(`is-solo`): PC(3열) 스킬 예약 옆 · **장비 2열(561~1100)은 장비 그리드 첫 칸**(`setting-overview-trio-deck--grid`, 영웅 3명일 때 — 2×2 빈칸 없이, 5인과 같은 규칙, 밍봉 지적) · 폰(≤560) 맨 위(5인 `--top`과 같은 `clamp(48px, 17vw, 62px)`). 공격 두 장은 그리드에 넣으면 5칸이라 빈칸이 생겨서 스킬 예약 위 유지 — 대신 **공격 · 장비 2열(561~1100)은 빈 4번째 칸에 메모**(`setting-overview-notes-cell`: 기타 디테일 + **상대 덱 특이사항** `overviewEnemyDeck.note`, 밍봉 선택), 그때 따로 있던 메모 줄(`--has-cell`)은 숨김. PC · 폰은 메모 줄에 두 메모 같이(제목 「공략 메모」). 공격 메모는 **두 칸**(`renderGwAttackMemo`): 「내 공격 덱 · 기타 디테일」(파랑) · 「상대 덱 · 특이사항」(빨강) — 배치 카드와 같은 알약 색, 메모 줄(PC)은 좌우 · 메모 칸 · 폰(≤560)은 위아래, 비어 있으면 「등록된 … 없습니다」. 수비 · 5인 메모는 기존 모양. 메모(`overviewNotes`)가 하나뿐이면 그 이름(「기타 디테일」)이 칸 제목(「공략 메모」 겹제목 없음). 아이콘: 메모 `hubWrite`, 장비 칸 `gearShield`(`asset/공용 아이콘/방패.png`). 공격 카운터는 `overviewEnemyDeck` prop으로 **상대 덱 카드(빨강)**도 같이 — 「내 공격 덱」(파랑) · 「상대 덱」. **톤(밍봉 — 색 테두리 · 꽉 찬 알약은 싼티):** 공격 카드 · 메모 칸은 유리 테두리 + 윗변 가운데만 빛나는 1px 선(`::before`) + 모서리에서 번지는 옅은 빛(내 덱 왼쪽 위 파랑 · 상대 오른쪽 위 빨강), 제목은 빛 점 + 톤 글자(`--gw-tone` · `--gw-tone-text` · `--gw-glow-at` 변수만 바꿈). **상대 덱은 인게임처럼 좌우 반전**(펫 · 진형 | 앞줄 | 뒷줄 — CSS `row-reverse`만, 초상 그림은 안 뒤집음, 밍봉 지시). 방어는 「배치 · 펫」 한 장(5인 칸과 같은 모양).
- **세팅 공유 PNG (`lib/copyNodeImage.js`):** 초상은 캔버스 합성본으로 바꿔 끼움 — **화면에 보이는 카드 상자 · 레이어 위치를 그대로 읽어 합성**(`compositePortraitFromLayout`)해서 덱용 이름칸 크롭(162:154) · 별 · 역할 위치가 세팅 확인 창과 같음(예전엔 원본 162:202를 그려 이름 검정칸이 보였음). 캐시 키 = 영웅 + 크롭 · 별 · 역할 유무. 화면에서 숨겨진 카드(폰 전용 `--top` / PC 전용 `--grid`)는 직접 합성하지 않고 같은 키의 합성본만 씀. 합성본 폭은 `100%`(화면에서 잰 px를 박으면 폰에서 만든 PNG의 초상이 작아짐), **`aspect-ratio: auto` 필수** — 크롭 클래스를 뗀 틀에 `.hero-portrait-card:not(--crop-name) { aspect-ratio: 162/202 }`가 남으면 초상 아래 빈칸 → 배치 칸 간격 벌어짐 · 4칸 줄 잘림(밍봉 지적). 폰(≤980)의 `.glass-modal { max-height · max-width !important }`는 `.setting-capture-host .setting-capture-pc`로 이김 — 없으면 폰 PNG가 창 높이에서 잘림.
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

### 10.10 팀 빌더 (`/team`)

GNB **메인 → 팀 빌더 → 길드 허브**. `/team` 모드 선택(카드 4장) → `/team/arena`(결투장 5vs5) · `/team/guildwar`(길드전 3vs3) · `/team/pve`(**PvE 5인 · 아군만**) · `/team/effects`(**효과 사전**).
- **PvE 모드** (`MODE_META.pve`, `pve: true`): 상대 덱 없음(`DeckBar allowEnemy={false}` → 덱 칸만 `is-solo`, 상대 덱 · 「조심할 것」 · 내 덱/상대 덱 전환 없음). **탑 전용 효과 포함**(`analyzeTeam(..., { allowTower: true })`, 효과 카드 · 영웅 효과 요약에 초록 「탑 전용」 표시). **「보스」가 들어간 줄도 PvE에서만 읽음**(`SKIP_PVE_RE` — 비스킷 스킬1 「보스 대상 피해량 증가 40% · 5턴」, 결투장 · 길드전은 `SKIP_RE`로 건너뜀). 상단 설명은 「PvE는 아군만 봐요.」(탑 전용 문구 빼라는 밍봉 지시). 디버프 칸 제목은 「보스에게 거는 디버프」. 덱은 `decks.pve` 따로 저장(5칸) — 예전 저장본에 `pve`가 없으면 `EMPTY_DECKS`로 채움. 효과 사전 「덱에 넣기」에도 PvE.
- **자기 자신만 받는 버프 (모든 모드, 별도 칸 없음):** 「우리 팀이 받는 버프」 목록 = 팀원에게 거는 버프만. 대상이 「자신」인 효과는 **예외 없이** 팀 목록 · 팀 버프 겹침 판정(`findOverlaps`에 `teamGroups`)에서 빠짐. 같은 버프 칸 안 아래쪽(점선 구분) `SelfBuffSection` — 자기 버프가 있는 영웅만 알약으로, 누르면 그 영웅 것만 펼침(한 번 더 누르면 접힘). 알약은 **한 줄 고정**(`flex-wrap: nowrap`) — 칸 너비에 이름이 다 안 들어가면 컨테이너 쿼리(`data-n` = 영웅 수)로 이름을 숨기고 얼굴 + 숫자만(이름은 title). 패시브 탭 = `effectCards(..., { selfOnly: true })`, 스킬 · 발동 탭 = `skillCards` 중 `scopeKind === 'self'`. 같은 효과 · 같은 timing의 팀 버프를 본인도 받으면 `selfClash` 문구(「선란 +25% 팀 버프와 같은 효과라 헤브니아 본인은 가장 높은 수치 하나만 받아요」).
- **스킬 · 발동 탭 (모든 모드):** 「우리 팀이 받는 버프」 · 「상대에게 거는 디버프」 칸 안 `FxTabs` [패시브 | 스킬 · 발동] 전환 (기본 패시브, 칸을 늘리지 않으려고 새 칸 대신 탭). 스킬 탭 = `skillCards(analysis, team)` — 기본 공격 · 스킬1 · 스킬2 · 각성기 + 패시브 조건 발동(부활 시 등)으로 거는 `stat` · `survival` · `antiheal` 효과 중 `effectTiming`이 없는 것(패시브 칸과 안 겹침). 카드 = 영웅 · 스킬 · 대상 · 조건 · 효과마다 하나(조건이 다르면 따로 — 델론즈 「권능 발동 시」 무효화와 조건 없는 무효화), 겹침 판정 없음. 화면은 `SkillEffectList`가 **영웅 · 스킬 단위 상자 하나**로 묶음(대상이 줄마다 다르면 줄에 「→ 대상」). 줄 표시: 수치(%) · `amountText`(% 아닌 수치 19초 · 25 · 물리 공격력 250%) · 확률(100% 미만) · 지속 · 중첩(「1중첩 · 최대 4중첩」) · 조건. 스킬 꼬리표 = 슬롯 이름, 슬롯이 「스킬」뿐이면 스킬 이름(델론즈 「기본 공격 [변신]」). 표시 이름 다듬기 `skillCardText`(불굴 피격 횟수 +1회 · 성진우 레벨 +N). 쿨타임 · 즉사 턴은 `effectLabel`이 ▲▼로 안 바꾸고 이름 그대로(「스킬 쿨타임 감소」).
- **도감 · 효과 사전 · 찾기와 같은 규칙:** 도감 「효과 요약」 순서(밍봉 확정) = 역할 → 편성 조건 → 핵심 기믹 → 「버프」 → 「디버프」 → (탑 전용) → 전설 장신구. **버프 · 디버프 배치(밍봉 확정, `HeroEffectSummary` `FxGroup` · `SkillBlock`):** 받는 대상 묶음(왼쪽 띠 — 팀에게 파랑 · 자신에게만 노랑 · 적에게 빨강, 자기 버프 나눔은 팀 빌더 `selfSkillCards`와 같음) → 「패시브(상시 · 전투 시작)」 / 「스킬 · 발동(스킬 사용 · 조건 충족 시)」 — 탭 아님, 전부 펼침 → **스킬 하나에 블록 하나**(왼쪽 스킬 아이콘 + 꼬리표, 기본 공격 → 스킬1 → 스킬2 → 패시브 → 각성기 순) → **효과마다 옅은 칸 하나**: [이름 칸(묶음 안 가장 긴 이름 너비 · 가운데, 팀 빌더 `tb-fxl-key`와 같은 모양)] [수치 뱃지 56×26 — 버프 초록 · 디버프 보라] [디버프 지속 턴 = 빨간 테 뱃지] [확률 · 수량 · 중첩 · 버프 지속 = 회색 글자], 조건은 그 칸 안 아래 노란 줄. 대상은 버프는 팀 전체가 아닐 때만 · 디버프는 항상, 블록 안 줄이 같으면 블록 위에 한 번(「→ 아군 3명」). ▲◆ 표시 없음. 패시브라도 조건 발동이면 「스킬 · 발동」. 스킬 · 발동 줄 = `heroSummary().skillFx`(`skillCards`), 패시브 줄 = `buffs` / `selfBuffs` / `debuffs`(`skillName`으로 아이콘). 이름 `listLabel`, 뱃지 `fmtFxValue`. 「스킬 효과 포함」 찾기(`isSkillCastEntry`)도 패시브 조건 발동(아일린 청천벽력·진)을 포함. 찾기 칩은 `finderKey`로 「(중첩)」 · 「… 효과」 표기 차이를 한 칩으로(영웅별 글에 「· 중첩」).
- **빠지면 안 되는 효과 (`isSkillCastEntry` · `isSelfPassiveEntry` · `isPassiveSpecialEntry`):** 아군 전투 메커니즘(반격 · 협공 · 도발 · 관통 · 쿨타임 초기화 `MECHANIC_BUFFS`), 적에게 거는 상태 이상(cc · dot — 기절 · 공포 · 극독 · 중독 · 즉사 …), 버프 해제 · 버프 차단 · 턴제 버프 감소, 아군 디버프 해제 → 스킬 · 발동 탭 + 찾기 칩. 고유 기믹(special): 조건부 = 스킬 · 발동 탭(시노부 「독 축적」 자기), 상시 = 패시브 탭(쥬다스 「칠흑의 낙인」) — special은 찾기 칩 X. 「숫자만큼」 · 「아래 효과」 같은 문장 조각(`isTextFragment`)만 제외.
- **공격 자기 보너스(`ownHit`):** 공격 대상이 적인 줄의 「치명타 확률 증가 100%」 · 「약점 공격 확률 증가 100%」(지속 턴 없음 — 관우 · 룩 · 팔라누스 · 토미오카 기유)는 그 공격의 자기 보너스 → 자신 버프 「이 스킬 공격 때」. 적 디버프 칩에서 빠짐.
- **칸 숫자:** 탭 · 칸 머리 숫자 = **팀 목록에 보이는 상자 수**(`fxGroups.js` `fxBoxCount`, 자기 자신만 받는 버프는 안 셈). 자기 버프 알약 숫자 = 그 영웅 상자 수. 「자신 부활 시, [청천벽력·진] 발동」처럼 발동 줄 다음 줄 효과는 그 발동 조건을 앞에 붙임(같은 영웅 · 스킬 · 대상). 비스킷 스킬1 약점 공격 확률, 아일린 청천벽력·진 방어력 감소 중첩이 여기 나옴.
- **효과 사전** (`EffectDictionary.jsx`): 찾기 타일 다중 선택(AND) → 모두 가진 영웅만 · 타일 숫자 = 현재 결과 기준(0이면 흐림) · 영웅 클릭 → 오른쪽 `HeroEffectSummary` · 비교 최대 3명(효과·역할 표) · 「결투장/길드전 덱에 넣기」(같은 localStorage store의 빈 칸에 넣기, 가득 차면 안내만).
- **스킬 효과 포함 토글 (기본 끔):** 효과 사전 · 영웅 선택 창 찾기에서 켜면 액티브 · 각성기 · 기본 공격으로 거는 능력치 · 생존 · 회복 방해 효과까지 색인(`buildHeroEffectIndex(...).withSkill`, `isSkillCastEntry`). 배지 「스킬2 1턴」. 팀 빌더 메인 버프·디버프 목록 · 「덱에 없는 효과」 개수는 기본 색인만 씀. 효과 요약에는 「스킬로 거는 효과」 칸(`heroSummary().skillFx`).
- **고유 기믹(special) 판정:** `teamBuilderTips` 키 또는 「기타(utility)」 분류의 희귀 효과만 — 희귀하다고 능력치·생존 효과를 빼면 효과 사전에서 누락됨(예: 5인 공격기 감쇄, 2턴 면역).
- **도감 연동:** `HeroDB` 영웅 상세에 「스킬 / 효과 요약」 전환 — `src/components/HeroEffectSummary.jsx` + `src/styles/heroEffectSummary.css`(공용, 엔진 `heroSummary`). 상대 덱은 「상대 덱 추가」로 켜는 선택 사항이며 **페이지를 열 때는 항상 꺼짐**(켜짐 여부는 저장 안 함, 상대 영웅 목록만 저장).

- **화면 구조:** 상단 덱 바(내 덱 파랑 | VS | 상대 덱 빨강, 각 덱 제목 가운데 · 「비우기」 오른쪽) → 칸 클릭 시 바로 아래 영웅 선택 드롭다운(「영웅을 누르면 ○○ 자리에 넣어요」 안내 · 빼기 · 닫기 / 「필요한 효과로 찾기 ▾」 / 영웅 목록) → **영웅 효과 요약 칸** → 분석(넓게). 상대 덱을 켜면 분석 위에 「내 덱 / 상대 덱」 전환.
  - **내 덱 / 상대 덱 전환 버튼** (`tb-view-switch`): Uiverse team-home/away 응용 — 서로 마주 보는 기울어진 버튼(skew ±32deg) + 위 불빛 · 아래 빛 띠, 고른 쪽만 진하게 + 고를 때 빛이 한 번 지나감(`tbViewSweep`). 가운데 `tb-view-dots` = 파랑→보라→빨강 빛 줄 위로 불꽃이 1.6s 주기로 오가고(`tbViewSpark`, `--w` 이동 거리) 가운데를 지날 때 흰 다이아몬드가 번쩍(`tbViewCore`, 같은 1.6s라 박자 맞음 — 둘 중 하나만 바꾸지 말 것). `prefers-reduced-motion`이면 정지. 모바일은 `--w: 40px`.
  - 헤더 설명은 두 줄(「…알려줘요.」 줄바꿈 「(스킬 강화 · 초월 기준)」). 모드 선택 카드 설명은 한 줄(넘치면 말줄임).
  - **모드 선택 카드** (`/team`, `ModePicker`): Uiverse card(JohnnyCSilva) 응용 — 평소 가운데 기존 아이콘 + 아래 이름(`tb-mode-label`). 마우스를 올리면(또는 키보드 포커스) 카드 `scale(1.04) rotate(-1deg)`, 아이콘 `scale(2.1)` + `blur(6px)` + 둥실(`tbModeFloat` 3s), 이름 · 「5 vs 5」 · 설명(`tb-mode-text`)이 나타남. 「덱 빌드 시작」 버튼 없음(카드 전체가 버튼). 터치 · `hover: none` · 폭 760px 이하는 처음부터 아이콘 + 글자 세로 배치(일부 폰이 hover 값을 잘못 알려 줘서 폭 조건 포함).
  - 내 덱 (위에서부터, 밍봉 확정): **덱 세팅 체크** → **우리 팀이 받는 버프** | **상대가 받는 디버프**(PvE 「보스가 받는 디버프」). 덱 세팅 체크 = (전설 장신구 체크 · [상시] 버프 중복 · 받는 영웅 없는 버프 · 편성 조건 · **덱에 없는 효과** — 역할 12 · 팀 버프 · 적 디버프 각각 「N개 없음」 + 버튼 → 영웅 선택 창 찾기로 이동). 각성기에서 온 [상시]는 「각성 중」 꼬리표.
  - **버프 · 디버프 칸 (밍봉 확정 2026-11-09):** 칸 = **효과별 표가 메인**(`FxLedger`) → 칸 맨 아래 **「자세히 보기」**(`FxFold`, 기본 닫힘) 안에 원래 목록([패시브 | 액티브 · 발동] 탭 + `EffectList` / `SkillEffectList` + 「자기 자신만 받는 버프」). 칸에 `className="tb-fx-block"` — 목록도 표와 같은 결(어두운 판 하나 + 줄 구분 · 줄무늬, 중복 행 주황은 그대로). 패시브 목록 줄 왼쪽도 ▲▼ 대신 그 패시브 스킬 아이콘(`skillIconUrl`, 스킬 이름이 없을 때만 ▲▼). 칸 머리 숫자 = 표의 효과 가짓수(`count`).
  - **표 줄에 목록 장점 흡수:** 같은 효과 겹침이 있으면 줄 주황 + 「중복」 꼬리표, 받는 영웅 없음 · `BUFF_NOTES` 경고면 「확인」. 줄을 누르면 주는 영웅 · 스킬마다 한 줄(`LedgerSource`: 스킬 아이콘 `skillIconUrl` · 영웅 얼굴 · 패시브/액티브 · 슬롯(스킬1 · 각성 중) · 상시/시작 N턴 · 수치 · 대상 · 지속 턴 · 확률 · 중첩 · 조건) + 주황 문구(「○○ −34%는 반영 안 돼요」 · `overlapNote` · 받는 영웅 없음 · 참고 문구 — 목록과 같은 문장). 데이터는 `fxTotals` part의 `srcs` · `lost` · `overlapNote` · `wasted` · `note`(패시브 카드 source에 `skillName` 추가됨 — 엔진 계산 무변경).
  - **효과별 표** (`FxLedger`, 데이터 `fxLedger(패시브 카드, 액티브 카드)` in `fxGroups.js`): 머리줄 「효과 | 패시브(꽉 찬 알약) | 액티브(점선 알약) | 합계(`tbTotals` 아이콘)」, 효과 이름마다 한 줄 — 묶음 이름(공격 · 치명 · 약점 · 효과 적중 · 저항 · 방어 · 회복 · 생존 · 기타, `effectRank` 기준)으로 나눔. 패시브 = timing([상시] · 시작 N턴)마다 적용 수치(같은 timing은 높은 것)를 **더한 값**(턴 효과가 섞이면 작은 「턴」 표시), 액티브 = 같은 이름은 **가장 높은 수치 하나**, 합계 = 패시브 + 액티브(뱃지 색 버프 초록 · 디버프 보라). 줄을 누르면 영웅 · 스킬별 수치(패시브 / 액티브 꼬리표 · 대상 · 중첩). 효과 이름 앞에는 게임 효과 아이콘(`FxIcon` → `lib/effectIcons.js`, 표 줄 · 특수 효과 알약 · 「자세히 보기」 목록 이름 칸 모두). 수치 없는 효과(면역 · 반격 · 기절 …)는 표와 **판을 따로 나눈** 「특수 효과」 칸(밍봉 이름 — 「고유 효과」 아님, 알약 왼쪽 패/액 글자 대신 효과 아이콘)(`.tb-tot-uniq`, 점선 테두리 · ◆ 제목 · 개수) 안 같은 너비 알약 격자(PC 150px 칸 · 폰 2열 — [패 · 액] [이름 …] [얼굴 2 + N], 밍봉 이름) — 알약을 누르면 그 아래 한 칸에 누가 · 어떤 스킬로 · 누구에게 · 몇 턴 · 확률 · 조건(`LedgerFlags` → `LedgerSource`, 한 번에 하나만 펼침, 다시 누르면 접힘). 자기 자신만 받는 버프는 표에서 빼고 셈(「자세히 보기」 안 알약으로). 줄 초상 24px(폰은 2명까지), 펼친 줄은 22px. 게이지(막대)는 넣지 않음(밍봉: 깔끔하게). 「덱 총합 · 시너지 합계」 따로 칸은 없앰.
  - **버프/디버프 목록 한 줄** (`EffectList`): 위 = 주는 영웅 → 받는 대상(같은 주는 영웅+대상끼리 묶음, `groupEffectCards`), 아래 = 효과들. 효과 이름은 `.tb-fxl-key` 칸 안 가운데 정렬 — 칸 너비는 목록에서 가장 긴 이름(`useAlignedNames`가 재서 `--fxl-name`에 넣음, 최대 60%). 효과 이름은 **증가 · 감소까지 붙인 원래 이름**(「방어력 감소」 · 「물리 공격력 증가」, `listLabel` — 밍봉 지시, 「방어력」만 쓰지 말 것). 이름에 증가 · 감소가 있으면 뱃지는 부호 없이(「방어력 감소 29%」, `badgeValue`), ▲▼ 줄 표시는 그대로. 오른쪽 수치 뱃지 `.tb-fxl-val`은 너비 56px·높이 26px 고정, 버프 초록(`#4ade80`) · 디버프 보라(`#c084fc`). 「시작 N턴」 · 「중복」 표시는 뱃지 뒤(모바일에서는 다음 줄로 내려갈 수 있음). 같은 효과가 겹치면 행 주황 + 「같은 효과는 가장 높은 수치 하나만 적용돼요. ○○ +N%는 반영 안 돼요.」 버프 아래 참고 문구는 `BUFF_NOTES`(예: 여포 용이무모 — 아군 마법 공격력 90% 감소, 덱에 마법형이 있으면 행 주황).
  - **전설 장신구 체크:** 불사 · 권능 · 부활의 반지(`equipments.js` `accessories` 아이콘). 영웅 **패시브가 자신에게 거는** 같은 효과가 있으면 그 반지는 효과 없음 → ✕ (`ownRevivals`, 강화·초월 출처 표기 예: 오목 권능(2초월)).
  - 상대 덱: **조심할 것** — 「우리 공격력 1위 ← 칼헤론·카일」 같은 표적 요약 + 영웅별 카드(무슨 일이 생기는지 → 초록 대비 문구, 칼헤론처럼 조건이 있으면 지금 발동 여부). 「대비됨/참고」류 매치업 판정은 넣지 않음. 상대 덱 화면 순서: 조심할 것 → **우리 팀이 받는 디버프**(빨강) | **상대가 받는 버프**(주황) — 내 덱과 같은 표 + 「자세히 보기」(상대 자기 버프 알약 포함). 내 덱과 같은 `effectCards` · `skillCards`를 상대 덱(`theirs`)으로 돌린 것(`theirFx`). 엔진 대상 글은 그 덱 입장이라 화면에서만 뒤집음(`perspective="enemy"` → `flipScope`: 아군 → 상대 · 적 → 우리). 상대 쪽 효과 이름은 찾기 버튼이 아니라 글자.
- **영웅 효과 요약 칸 (`HeroFxPanel`):** 덱 칸(`tb-deck-panel`)과 분석(`tb-analysis`) 사이 별도 칸. 덱 영웅 칩(내 덱 파랑 · 상대 덱 빨강)으로 전환, 기본은 접힘(`fxOpen` 초기값 false) — 칩을 눌러야 펼쳐짐. 덱 칸을 누르거나 영웅을 넣으면 대상 영웅만 바뀌고 펼치지는 않음. 같은 칩을 한 번 더 누르면 접힘. 상대 덱이 있으면 칩을 내 덱 | 상대 덱 반반(테두리 파랑 · 빨강, `is-split`)으로, 없으면 내 덱 칩이 칸을 꽉 채움(`--n` = 덱 인원). 칩 = 초상 32px + 이름(넘치면 말줄임). 스킬별 묶음은 `groupHeroEffects` + `HeroEffects`. 영웅 선택 창(`PickerDropdown`)에는 효과 요약 버튼 없음.
- **이름 붙은 능력치 버프** (`NAMED_STAT_BUFFS`): 이름만 있고 능력치가 안 보이는 버프를 능력치 버프로 분류 · 「용이무모 (물리 공격력)」으로 표시. 지금은 여포 용이무모 하나(밍봉: 「아군에게 거는 디버프」 칸을 따로 만들지 말 것 — 이런 경우가 여포 하나뿐).
- **편성 조건 문구:** 「지금 공격형 3명 → **스킬2 생명력 전환** 발동 안 함」처럼 효과 앞에 스킬 이름. 같은 효과가 여러 스킬에 있으면 스킬을 묶음(「기본 공격 · 스킬2 · 패시브 마력 역류」). `skillEffectText` 하나로 팀 빌더 세팅 체크 · 상대 덱 「조건 · …」 줄 · 도감 효과 요약 조건 줄이 같이 바뀜.
- **상대 덱 공통 경고:** 상대 영웅이 적에게 「쿨타임 증가」를 걸면 「속공을 뺏기면 스킬 쿨타임 증가로 인해 스킬 예약이 풀릴 수 있어요 → 상대보다 속공을 올려보세요」(`buildThreats`). **물리/마법 피해 면역 · 감쇄**(`damageGuardLines`): 방어형이거나 자신 외 아군에게도 거는 상대 영웅 → 「반대 속성 공격 영웅으로 공격」 + 내 덱 해당 공격 영웅(공격형 · 마법형 · 만능형, `attackType`) 이름/없음 안내. 면역이 있으면 「잘 안 먹혀요」, 감쇄만이면 「덜 들어가요」. 공격형이 스킬 중 자기만 면역(호킨 · 조운 등)은 제외. 영웅별 문구는 `HERO_TIPS`(아리스 · 윤건) — `enemy`는 `{ what, todo }` 하나 또는 배열(여러 줄). 자동 문장은 `targetingSentence`(공격 · 버프 지우기 · 턴 줄이기 · 디버프 걸기 동사 분리, 을/를 받침 처리).
- 행동 제어 · 지속 피해 효과는 툴팁 숫자(「막기 확률 0% 고정」 등)를 효과 수치로 쓰지 않음.
- **필요한 효과로 찾기:** 기본은 닫힘(`finder.open` false) — 「필요한 효과로 찾기 ▾」 버튼으로 열고, 닫으면 고른 효과 필터도 풀림. 영웅 선택 창을 닫으면 찾기도 다시 닫힘(`setPickerOpen(false)` 래퍼). 그룹 탭 색: 팀 버프 파랑 · 적 디버프 빨강 · 역할 노랑. 효과 카드 이름·「덱에 없는 역할」 칩으로 들어오면 열린 채로 시작. 드롭다운 상단 작은 타일(팀 버프 [상시] / 적 디버프 [상시] / 역할 12종, 이미 덱에 있으면 초록 ✓) → 그 효과를 가진 영웅만 + 수치 배지. 효과 카드 이름·「덱에 없는 역할」 칩을 눌러도 같은 찾기가 열림. 색인은 `buildHeroEffectIndex`, 배지는 `HeroGridPicker`의 선택 prop `renderBadge`(기본 `null` → 다른 화면 영향 없음). 드롭다운 안 영웅 목록 크기는 `teamBuilder.css`의 `.tb-picker-drop .hero-grid-picker-grid` 덮어쓰기로만 키움(공용 `index.css`·컴포넌트 기본값 그대로).
- **아이콘:** 팀 빌더 전용 `uiIcons.js` 키 — `teamBuilder`(GNB·헤더) · 모드 아이콘 3개 `tbArena`(날개 달린 검) · `tbGuildwar`(성) · `tbEffects`(돋보기) — asset `공용 아이콘/팀빌더 결투장 아이콘.png`(400px 금색 → 흰색 후 192px로 축소) · `길드전 아이콘.png`(114px) · `팀빌더 효과 사전 아이콘.png`(80px)를 **색만 빼서 흰색**으로 만든 `tb-arena-wing.png` · `tb-guildwar-castle.png` · `tb-effects.png`. **그림을 바꿀 때는 파일 이름도 바꿀 것** — 같은 이름으로 덮어쓰면 브라우저 캐시 때문에 예전 그림이 계속 보임. 모드 카드 70·76·66 / 모드 버튼 18·18·17 — 그림마다 여백 비율이 달라(성 약 85% · 검 92% · 돋보기 95%) 실제 그림 높이가 길드전과 같아지게 맞춘 값. 사이트 공용 `arena` · `encyclopedia` 키는 다른 화면에서 쓰므로 그대로 둠. 흰색 변환은 밝기 비율 유지(가장 밝은 곳 = 255, 음영 보존) · `tbMyDeck` / `tbEnemyDeck`(◆ 파랑·빨강 — 「상대 덱에서 조심할 것」 등) · `tbBuff` / `tbDebuff`(파랑·빨강 방패, 「우리 팀이 받는 버프」 · 「상대에게 거는 디버프」 블록 머리, 원본 23×28 색 그대로 `activeInvert: false`) · `tbThreat`(상대 덱에서 조심할 것) · `tbVs`(asset `V.png`+`S.png` 합성 → `public/images/ui/vs.png`). 다른 화면의 `deckAlly` / `deckEnemy` / `metaDeck`은 그대로.
- **색 의미 고정:** 파랑 = 우리 이득 · 빨강 = 위협 · 주황 = 체크 필요 · 초록 = 충족/대비 · 보라 = 강화·초월 출처 배지. 예외: 버프/디버프 목록의 **수치 뱃지만** 버프 초록 · 디버프 보라(밍봉 확정). 찾기 그룹 탭은 팀 버프 파랑 · 적 디버프 빨강 · 역할 노랑. 바꿀 때 이 의미를 유지할 것.
- **효과 칸 강조색 (tone, 2026-11-08):** 「누구에게 좋은가」로 나눔 — 우리 이득은 찬색: 우리 팀이 받는 버프 **파랑**(`ally`) · 상대가 받는 디버프 **보라**(`gain`, `--tb-gain` #8b5cf6 — 청록은 밍봉이 별로라 바꿈) / 우리 손해는 더운색: 우리 팀이 받는 디버프 **빨강**(`enemy`) · 상대가 받는 버프 **주황**(`rival`, `--tb-rival`). 칸(`Block tone`) · 탭(`FxTabs tone`) · 목록(`EffectList`/`SkillEffectList tone` → `.tb-fxl.tone-*`의 `--f`) · 숫자 알약 · 표(`.tb-tot-col.tone-*`) · 「자세히 보기」 버튼(`.tb-fx-detail.tone-*`)에 같이. **뱃지 색은 `side`(버프 초록 · 디버프 보라) 그대로** — tone은 강조색만. 방패 아이콘(파랑 · 빨강 원본)은 보라 칸 `hue-rotate(265deg)` · 주황 칸 `hue-rotate(170deg)`.

| 파일 | 역할 |
|------|------|
| `src/pages/teamBuilder/TeamBuilderPage.jsx` | 상태(모드·덱·찾기) · localStorage `senalink_team_builder_v1` · 세팅 체크(`buildChecks`) · 상대 주의 카드(`buildThreats`) |
| `src/pages/teamBuilder/TeamBuilderParts.jsx` | 모드 카드 · 덱 바 · 드롭다운(찾기 타일·영웅 효과) · 세팅 체크 · 효과 카드 · 표적 요약 · 주의 카드 |
| `src/lib/teamBuilderAnalysis.js` | 스킬 효과 줄 파싱(대상·지속·확률·조건·수치) · 분류 · 중복 판정 · 효과 카드(`effectCards`) · 역할(`ROLE_TILES`/`roleCoverage`) · 찾기 색인 · 편성 조건 · 노리는 대상(`targetingInsights`) (순수 함수, React·Firebase 무관) |
| `src/data/teamBuilderTips.js` | `SIGNATURE_TIPS` 효과 이름 기준 팁(`ally` / `enemy: { what, todo }`, 예: 우위·빙극) · `HERO_TIPS` 영웅 이름 기준 상대 덱 팁(`enemy` = 객체 또는 배열, 예: 아리스 — 치명타 확률 / 윤건 — 「신이에요」 + 2스킬 생명력 전환·추가타 → 권능의 반지) · `BUFF_NOTES` 버프 카드 아래 참고 문구(`{ text, warnRole }`, 예: 용이무모) |
| `src/styles/teamBuilder.css` | 이 페이지 전용 스타일·애니메이션 (lazy 청크) |

- **중복 규칙:** 같은 효과 이름 + 같은 timing + 서로 다른 영웅 + 받는 대상이 겹침 → 가장 높은 수치 하나만 적용. **낮은 쪽이 통째로 「반영 안 됨」은 높은 쪽 대상이 낮은 쪽 대상을 전부 덮을 때만**(`scopeCovers` — 아군은 받는 영웅 이름 포함, 적은 「적 전체」 또는 역할 포함). 일부만 겹치면 둘 다 적용으로 두고 `overlapNote`(「헤브니아 대상(…)과 겹치는 영웅은 헤브니아 +31%, 나머지는 선란 +25%가 적용돼요」) — 목록 문구 · 덱 세팅 체크 같이 씀. timing = `[상시]` 또는 **전투 시작 [N턴]**(패시브·조건 없음·반격 등 「발동 시」 대상 제외 — `effectTiming`). `[상시]`와 `[N턴]`은 서로 중첩 → 효과 카드도 따로(「시작 N턴」 배지). `(중첩)` 효과는 별도 키. 강화 「턴 상승」은 턴 수에 반영.
- **정렬:** 효과 목록·찾기 타일은 `effectRank` — 물리 공격력·피해량 → 마법 공격력·피해량 → 공통 → 공격기 → 치명/약점 → 효과 적중/저항 → 방어 → 회복 → 면역.
- **수치:** 항상 **스킬 강화 + 초월** 기준(옵션 없음). 툴팁 `N%` · `(스킬 강화 시 N%)` · 강화/초월 「효과 상승」 줄(최고값) · 초월 「효과 추가」(예: 연희 6초월 관통).
- **강화·초월 문장 읽기 (`upgradeSegments`):** 「 / 」 뒤 머리말 없는 부분은 앞 머리말(효과 추가 · 효과 상승 · 턴 상승)을 이어받음(예: 레이첼 「턴 상승 : 방어력 감소 지속 4턴 / 물리 취약 지속 4턴」). 문장 처음부터 머리말이 없으면 기존 효과의 턴을 바꾸지 않고 그 스킬 첫 대상으로 **별도 효과**를 추가(루디 2초월 링크 [3턴] · 6초월 행동 제어 면역 = 아군 전체, 레이 강화 위장 — 밍봉 확인: 턴 연장 개념 아님). 명시적 「턴 상승 :」만 턴을 올림.
- **강화·초월 특수 문장 (`applyUpgradeRules`):** 「대상 수 변경」 = 같은 편 첫 대상(자신 제외)을 새 대상으로(「아군 전체/적군 전체」→「모든 아군/적군」, 「빙극 효과 대상 적군 3명」처럼 효과 지정 시 그 효과만) · 「확률 상승」 = 같은 이름 효과의 확률(기본 효과 우선, `[대상]`이 붙으면 그 대상만 — 「우선」 무시 비교) · 「효과 변경 : X이 … [Y]로 변경」 = 효과 이름 X→Y(연희 깊은 수면, 제이브 용염). 그 밖의 효과 변경(멜키르 · 탄지로)은 미반영.
- **강화 수치 이름:** 「효과 상승 : 감쇄 효과 16%」처럼 끝에 「효과」가 붙어도 같은 효과(감쇄)의 강화 수치로 읽음(`readRaiseLines`).
- **스킬 데이터 대체:** `effects`가 비어 있는 영웅(나혼자만 레벨업 4명)은 설명문 `[대상]` 줄로 나눠 읽음(`skillEffects` — 기존 영웅 502개 스킬에서 `effects`와 결과 동일 확인). 액티브 `direction`이 하나도 없으면 순서대로 스킬1·스킬2. 대상이 「(무한의 탑, 시련의 탑)」이거나 문장이 「…탑에서」면 PvE 전용이라 결투장 · 길드전 분석에서 제외(벨리카 · 차해인, PvE 모드는 포함). 도감 효과 요약에만 「탑 전용」 칸으로 표시(`collectHeroEntries(..., { allowTower: true })` → `heroSummary().tower`). 피해 문장 괄호 안 효과도 조건과 함께 읽음(`embeddedEffects` — 아일린 부활 시 감전, 라드그리드 화상).
- **고유 기믹:** 전체 영웅 중 2명 이하만 가진 툴팁 키(능력치·행동 제어·지속 피해 제외) + `teamBuilderTips` 키. 효과 카드에서는 빠지고, 상대 덱 주의 카드에만 `enemy` 팁으로 나옴.
- **편성 조건:** 「아군에 공격형 영웅이 3명 이상」 · 「마법형 3명 이상 편성 시」 → 덱 역할 수로 충족 판정. 「아군 역할 지원」(5인 3명·3인 2명 이상이면 +1) 반영.
- PvE 전용 줄(「…탑에서」 · 보스)은 제외. 데이터 저장 없음 → rules 변경 없음. 새 영웅은 `scraped_heroes.json`만 갱신하면 자동 반영, 특별 팁이 필요하면 `teamBuilderTips.js`에 추가.
- **효과 점검표 (로컬 전용):** `npm run dev` 후 `http://127.0.0.1:5173/dev/tb-audit.html` — 영웅별 스킬 원문 한 줄마다 엔진이 읽은 결과 · 의심 표시(빨강 = 못 읽음/수치 미반영, 노랑 = 반영 안 하는 문장) · 오른쪽 `HeroEffectSummary`. 파일 `dev/tb-audit.html` · `dev/tbAudit.jsx` · `dev/TbAuditApp.jsx` · `dev/tbAuditLogic.js` · `dev/tbAudit.css`. 빌드 입력이 `index.html`뿐이라 배포본(`dist`)에 안 들어감. 점검 메모는 localStorage `senalink_tb_audit_v1`만. 데이터·엔진 수정 후 이 표에서 빨강이 줄었는지 확인.
