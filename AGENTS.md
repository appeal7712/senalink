# AGENTS.md — 세나링크 (sevennight_guild_web_formal) 핸드오프

다른 에이전트·개발자가 **이 폴더만** 이어서 패치할 때 읽는 문서.  
라이브: https://senalink.web.app · Firebase 프로젝트 **`senalink`만**.

> **금지:** `sevennight_guild_web`, `*_backup*`, `mingbong-web` / layro / `sevennight-guild-hub` 등 다른 사본·프로젝트 열기·배포.  
> **배포:** 밍봉/김봉이 명시할 때만. `npm run build` 후 `npx firebase deploy --only … --project senalink`.  
> **라이브 유저·허브 데이터:** 아래 **§2.1** — 손상·유실·권한 완화 금지. 규칙/스키마/Functions는 특히 조심.

---

## 1. 한 줄 요약

세븐나이츠 유저용 **길드 허브 + 공용 커뮤니티 + 도감 + 메인 CMS** SPA.  
React + Vite + Firebase (Auth / Firestore / Storage / Functions asia-northeast3).  
라우터는 React Router가 아니라 `src/config/routes.js` + History API (`App.jsx`).

---

## 2. 반드시 지킬 Cursor 규칙

| 파일 | 내용 |
|------|------|
| `.cursor/rules/local-only-until-launch.mdc` | 이 폴더만 패치, senalink만, 배포는 명시 요청 시 |
| `.cursor/rules/center-and-fill-layout.mdc` | 덱+타임라인 2열: 행 stretch·덱 **세로 중앙**. 덱 수정 모달 「스킬 순서」높이 **px 고정**, 스크롤은 `.skill-timeline-scroller` 안만 |
| `.cursor/rules/read-agents-md.mdc` | 비트리비얼 작업 전 이 문서 참고 |

배포 시 관례: `src/config/appVersion.js`의 `APP_VERSION` bump → 푸터 `SiteFooter`에 표시.

### 2.1 프로덕션 데이터 보호 (유저·허브) — 최우선

실제 유저가 쓰는 **senalink** 이다. 패치·배포 시 **유저 문서·허브 문서·멤버십·공략·추천 등 기존 데이터가 절대 손상·유실·무단 노출되면 안 된다.**

#### 보호 대상 (예시)

| 영역 | 경로 |
|------|------|
| 프로필 | `users/{uid}` |
| 일일 추천 claim | `profileDailyRecommends/…` |
| 허브 본체 | `hubs/{hubId}` + `members` / `builds` / `notices` / `posts` / `history` / `scores` |
| 초대 | `inviteIndex/{code}` |
| 공개 길드 | `publicGuilds/{hubId}` |
| 공용 공략·티어 | `communityGuides` / `communityTierLists` |
| 아바타·엠블럼 | Storage `userAvatars` / `hubEmblems` |
| (덜 민감) CMS·방문 | `site/main`, `site/stats` |

#### 절대 하지 말 것

- Firestore/Storage **규칙을 느슨하게** 만들기 (예: `allow write: if true`, list 전면 개방, 타인 프로필·허브 무단 수정 허용).
- 기존 필드 **강제 삭제·이름 변경·타입 파괴** 마이그레이션을 무중단·무검증으로 배포.
- 클라이언트/`setDoc`으로 허브·유저를 **통째로 덮어쓰기** (merge 없이 빈 객체·부분 스키마로 `set` → 데이터 증발).
- Ops·스크립트·에뮬레이터 시드로 **라이브 프로젝트에 대량 delete / 시드**.
- `purgeIdleHubs`·`disbandHub`·멤버 강퇴 로직을 “테스트”로 라이브에서 실행.
- `users.hubId` / `members.role` / `masterId` / `inviteCode` 제약을 깨는 우회 쓰기.
- 다른 Firebase 프로젝트 또는 옛 폴더 데이터를 senalink에 합치기.

#### 규칙·스키마 변경 시 원칙

1. **읽기/쓰기 정책은 좁히거나 동등 유지**가 기본. 완화는 밍봉 명시 + 영향 범위 설명 후에만.
2. `firestore.rules` / `storage.rules` / Functions 변경은 **기존 문서가 새 규칙을 통과하는지** 먼저 생각 (필드 화이트리스트를 조이면 구형 문서 update가 전부 거절될 수 있음).
3. 새 필드는 **optional + 기본값**으로 추가. 구 클라이언트·구 문서와 호환.
4. 허브 `builds/main` 등 큰 문서는 **부분 merge / 기존 키 보존**. 카테고리 하나 저장한다고 다른 탭 공략을 지우지 말 것.
5. 가입은 **`joinHub` Callable** 전제 — 클라이언트가 `members`를 직접 create 하게 풀지 말 것.
6. 배포 전에: UI만인지 / **rules·Functions·스키마**인지 구분. 후자면 **이전 rules로 롤백할 수 있게** 인지한 뒤 배포.
7. 데이터 삭제가 필요하면 **Ops에 안전한 확인 UI** 또는 밍봉 직접 콘솔 — 에이전트가 라이브에서 일괄 삭제 금지.

#### 패치 전 자가 질문

- 이 변경이 기존 `users` / `hubs/**` 문서를 **읽지 못하게** 하거나 **쓰지 못하게** 하나?
- merge 없는 `setDoc` / 전체 교체 `update`가 있나?
- rules diff에 `allow`가 늘었나? (늘었으면 특히 주의)
- Functions가 허브·유저를 delete/update 하나?

UI·CSS·도감 JSON·정렬만 바꾸는 패치는 데이터 위험이 낮다. **rules / Functions / LoungeContext 저장 경로 / communityGuides 스키마**는 위험이 높다.

---

## 3. 디렉터리 구조

```
sevennight_guild_web_formal/
├── AGENTS.md                 ← 이 문서
├── firebase.json / .firebaserc / firestore.rules / storage.rules / firestore.indexes.json
├── functions/                ← Cloud Functions (Node 20, asia-northeast3)
├── public/                   ← Vite 정적 (images, robots, sitemap…)
├── asset/                    ← 원본 게임 에셋 (영웅/펫/장비 JSON·PNG)
├── scripts/                  ← import_gear_assets.py, fetch_hero_cards.py, seed-emulator-admin.mjs
├── src/
│   ├── main.jsx              ← Provider 트리
│   ├── App.jsx               ← 페이지 스위치 + GNB/푸터/배너
│   ├── index.css             ← 거의 모든 스타일
│   ├── config/               ← routes, firestorePaths, appVersion, deployMode, siteContact
│   ├── context/              ← SuperAdmin / UserProfile / Lounge (3개뿐)
│   ├── lib/                  ← Firebase·도메인 헬퍼
│   ├── pages/                ← public / hub / community / encyclopedia / tools / ops
│   ├── components/           ← GuildLounge, DbHub, 모달, 덱 카드…
│   ├── data/                 ← 도감·기본값 JSON/JS
│   └── utils/                ← overlayHistory, backdropDismiss, deckDrag
└── (레거시 루트 스크래퍼 *.py — 경로가 옛 폴더를 가리킬 수 있음. formal 기준으로 고쳐서 쓸 것)
```

---

## 4. 실행 · 배포

```bash
npm run dev              # Vite http://127.0.0.1:5173
npm run emulators        # Auth 9099 / FS 8080 / Functions 5001 / Storage 9199
npm run seed:admin       # 에뮬레이터 슈퍼관리자 시드
npm run build
npx firebase deploy --only hosting --project senalink
npx firebase deploy --only firestore:rules --project senalink   # 규칙 변경 시
npx firebase deploy --only storage --project senalink           # storage.rules 변경 시
npx firebase deploy --only functions --project senalink         # functions 변경 시
```

클라이언트 Firebase: `VITE_FIREBASE_*` (`src/lib/firebase.js`).  
개발: `.env.development`에서 `VITE_USE_EMULATORS=true`.

---

## 5. 라우팅 (페이지)

정의: `src/config/routes.js` · 렌더: `src/App.jsx`

| URL | PAGE id | 컴포넌트 |
|-----|---------|----------|
| `/` | `public_main` | `PublicMainPage` → `PublicMainDashboard` |
| `/hub`, `/guild` | `guild_room` | `HubPage` → `GuildLounge` |
| `/community` | `community` | lazy `CommunityPage` |
| `/tools`, `/tools/*` | `tools` | lazy `ToolsPage` |
| `/dex`, `/encyclopedia` | `encyclopedia` | lazy `EncyclopediaPage` → `DbHub` |
| `/ops` | `ops` | lazy `OpsPage` |

상시(ops 제외 일부): `GlobalNavBar`, `SiteFooter`, `SiteEntranceBanner`, `NicknameGate`, `ToastContainer`.  
오버레이 뒤로가기: `src/utils/overlayHistory.js`.

---

## 6. Context · 인증 · 역할

Provider 순서 (`main.jsx`): **SuperAdmin → UserProfile → Lounge → App**.

### 6.1 SuperAdmin (`SuperAdminContext.jsx`)
- Firestore `admins/{uid}`에 `{ role: "super" }` 가 있어야 함. **앱에서 생성 불가** (콘솔/시드만).
- `/ops` 로그인: 구글 팝업 또는 에뮬레이터 `enterLocalOpsAdmin`.
- 실제 쓰기 권한은 URL이 아니라 **Firestore `isSuperAdmin()`**.

### 6.2 사이트 유저 프로필 (`UserProfileContext.jsx`)
- 문서: `users/{uid}` 실시간 구독 + `saveProfile`.
- 필드: `nickname`(2–12), `photoURL`, `totalwarTier`, `arenaTier`, `destructionScore`, `hubId`, `recommendCount`, `lastProfileRecommendDate`, `updatedAt`.
- **마이페이지:** GNB `ProfileDropdown` → `MyPageModal` (본인만 수정).
- **닉네임 게이트:** `NicknameGate` — 닉 없을 때 강제 모달 (`/ops` 제외).
- **공개 프로필:** `PublicProfileModal` — 읽기 전용 + 일일 추천.
- 아바타 Storage: `userAvatars/{uid}/avatar.jpg` (`avatarUpload.js`).

### 6.3 길드 허브 (`LoungeContext.jsx`)
- 허브 세션, 멤버/공지/게시글/히스토리/점수, 생성·가입·탈퇴·해산, 초대코드, `publicGuilds` 동기화.
- 멤버 역할 (`hubs/{id}/members/{uid}.role`):
  - **master** — 개설, 관리자 임명, 마스터 이양, 초대 재발급, 일부 설정
  - **admin** — 공지·강퇴(다른 admin 제외)·점수·빌드 삭제 등. **`masterId` / `inviteCode` 변경 불가**
  - **member** — 가입은 Callable `joinHub`만. 빌드 편집·본인 글 가능
- 상한: `MAX_HUB_MEMBERS=30`, `MAX_ADMINS=3` (`loungeMeta.js`).
- **`users.hubId` 보호:** 멤버 스냅샷 오류·빈 목록만으로 hubId를 지우지 말 것. 클리어 전 `getDoc(members/{uid})`로 소속 확인. 로그인 후 세션 없으면 Callable **`resolveMyHub`**로 복구(허브 `members` 스캔 → `users.hubId` 복원).

### 6.4 프로필 일일 추천
- 클라이언트: `src/lib/profileRecommend.js`
- Claim: `profileDailyRecommends/{fromUid_YYYY-MM-DD}` + `users`의 `recommendCount` +1 (같은 배치, KST 하루 1회).
- 취소 없음. 어뷰징은 ops에서 감시만 (삭제 UI 없음).

---

## 7. Firestore 경로 (`src/config/firestorePaths.js`)

```js
COL = {
  ADMINS, SITE, HUBS, INVITE_INDEX, PUBLIC_GUILDS, USERS,
  PROFILE_DAILY_RECOMMENDS, COMMUNITY_GUIDES, COMMUNITY_TIER_LISTS,
}
SITE_MAIN_DOC = ['site', 'main']   // CMS
// site/stats 는 방문 집계 (헬퍼에만, COL 상수 없음)
// hubs/{id}/builds|notices|posts|history|scores|members
```

### 읽기/쓰기 요약 (`firestore.rules`)

| 경로 | 읽기 | 쓰기 |
|------|------|------|
| `admins/{uid}` | 본인 get | 클라이언트 불가 |
| `site/main` | 공개 | Super만 (`updatedBy` = 본인) |
| `site/stats` | 공개 | 누구나 create/update — total·dayCount **정확히 +1**, day=오늘 KST |
| `users/{uid}` | signed-in get / **list=Super** | 본인 화이트리스트; 타인 recommend +1은 claim과 함께만 |
| `profileDailyRecommends/…` | 본인 claim | 본인 create만 |
| `communityGuides/{id}` | 공개 | Super 전부; signed-in은 PvP(arena/totalwar) 본인 글 |
| `communityTierLists/{pve\|pvp}` | 공개 | Super만 |
| `inviteIndex/{code}` | signed-in get | 허브 admin 생성; master/super 삭제 |
| `publicGuilds/{hubId}` | 공개 | 허브 admin/master |
| `hubs/{hubId}` | 멤버 또는 Super | 생성=본인이 master; 수정 master/admin/super(제약); 삭제 master/super |
| `hubs/…/members` | 멤버/본인/super | 생성은 개설 시 master; 가입은 **Functions joinHub**; 역할 변경 master/super |
| `hubs/…/builds` | 멤버/super | 멤버 C/U; 삭제 admin/super |
| `hubs/…/notices, posts` | 멤버/super | 피드 검증; 수정/삭제 admin 또는 작성자 |
| `hubs/…/history` | 멤버/super | create만 |
| `hubs/…/scores` | 멤버/super | admin/super |

**슈퍼관리자:** `admins/{uid}.role == 'super'`.

`firestore.indexes.json`은 현재 비어 있음(복합 인덱스 없음).

---

## 8. Storage (`storage.rules`)

| 경로 | 읽기 | 쓰기 |
|------|------|------|
| `userAvatars/{uid}/avatar.jpg` | 공개 | 본인, ≤500KB jpeg/png/webp |
| `hubEmblems/{hubId}/byUser/{uid}/mark.jpg` | 공개 | 본인 동일 제한 |
| `hubEmblems/{hubId}/mark.jpg` | 공개 | write 불가(레거시) |

---

## 9. Cloud Functions (`functions/index.js`)

| 이름 | 종류 | 역할 |
|------|------|------|
| `onHubHistoryCreated` | onCreate | 허브 `lastActivityAt` 갱신 |
| `onHubMemberDeleted` | onDelete | 매칭 시 `users.hubId` 클리어 |
| `joinHub` | Callable | 초대코드 가입 (Admin SDK 트랜잭션, 좀비 hubId 정리) |
| `resolveMyHub` | Callable | 로그인 유저의 허브 멤버십 재탐색 → `users.hubId` 복구 (모바일에서 hubId만 날아간 경우) |
| `disbandHub` | Callable | 허브 통째 삭제 (super 또는 마지막 멤버) |
| `purgeIdleHubs` | Schedule 매일 04:00 KST | 60일 유휴 허브 삭제 |

허브 삭제 시 지우는 서브컬렉션: `members`, `history`, `notices`, `posts`, `scores`, `builds`.

---

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
| 방문 집계 | `site/stats` + `src/lib/siteVisitStats.js` — 브라우저당 **KST 하루 1회** (`localStorage` 키 `senalink_site_visit_day`). 히어로·ops에 `오늘 · 전체` 표시. 블로그급(시크릿 창 어뷰징 완전차단 불가) |

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

- **방어 리스트 PC:** `.gw-defense-grid--cols` 좌·우 독립 열 (2번 펼쳐도 3번 안 밀림). **PC 레이아웃 함부로 바꾸지 말 것.**
- **방어 리스트 모바일(≤900px):** `.gw-defense-grid--stack` 1열. 접힌 헤더는 `auto minmax(0,1fr) auto` — 초상화 | 속공·별(중앙) | 수정·삭제. 좁은 폰(≤380px)에서 초상·버튼만 더 축소. **상하 간격·PC는 유지, 가로 유동만.**

### 10.3 Ops 관리자 (`/ops`)

`OpsPage.jsx` — Super만 탭 진입:

1. **메인페이지** — `MainSiteEditor` (+ `OpsMetaDeckModal`)
2. **길드 허브 감독** — `HubOversee` (`hubOversee.js`)
3. **유저 감독** — `UserOversee` (`userOversee.js`) — 목록·집계만, **강제탈퇴 UI 없음**

### 10.4 「수정 및 고정자」 시각

`AuthorMeta` / `formatUpdateAtDisplay` (`PublicProfileModal.jsx`):  
저장은 ISO 유지, **표시만** `YYYY-MM-DD|HH:mm` · **Asia/Seoul 24시**.

### 10.5 도구 · 도감

- 도구: `ToolsPage` / `data/tools.js` (승확 계산기·티어리스트 메이커 등)
- 도감: `EncyclopediaPage` → `DbHub` → `HeroDB` / `EquipDB` / `SystemDB`
- **모바일 도감 영웅 상세(≤760px):** `.hero-db-detail`은 `max-height`/`overflow` 풀어 **스킬 설명 내부 스크롤 없이** 페이지로 펼침. 영웅 **목록** 칸 스크롤·PC(고정 높이 3열)는 유지.

### 10.6 세팅 확인 (`InGameDeckCard`)

- 모달 클래스 `.setting-overview-modal` — 화면 폭 **고정** `min(760px, 96vw)` (덱마다 `fit-content`로 가로가 들쭉날쭉하지 않게).
- 모바일(≤760px) 세팅 개요: 장비 1열, `.setting-overview-deck`는 `height:auto` — **배치·펫 잘림 방지**. PC·`.setting-capture-pc`(공유 PNG 980px)와 분리.
- **모달 뒤 블러:** body portal이라 스크림 `backdrop-filter`만으로는 뒤가 비침. **`body:has(> .modal-scrim) .app-shell` / `#root::before` 의 `filter: blur(22px)`는 의도된 것 — 성능 핑계로 제거하지 말 것.**
- 서브모달 오픈: 아래에 스크림이 있을 때만 `flushSync`+cover(길드전 카운터 등). **단독 오픈은 rAF 양보** 후 열어 버튼 `:active`가 보이게. 데이터 로딩 경로와 무관.

---

## 11. 주요 `src/lib/` 맵

| 파일 | 역할 |
|------|------|
| `firebase.js` | 초기화·에뮬레이터·`hashPassword` |
| `googleSignIn.js` | 구글 로그인 |
| `siteMain.js` / `siteVisitStats.js` | 메인 CMS / 방문 |
| `profileRecommend.js` | 프로필 추천 |
| `communityGuides.js` / `communityTierLists.js` | 공용 공략·티어 |
| `publicGuilds.js` | 공개 길드 보드 |
| `hubOversee.js` / `userOversee.js` | Ops |
| `hubEmblem.js` / `avatarUpload.js` | 이미지 업로드 |
| `copyNodeImage.js` | 세팅 공유 PNG |
| `seo.js` / `sanitize.js` / `rateLimit.js` / `formatTime.js` | 부가 |

---

## 12. 컴포넌트 연결 (자주 만지는 것)

```
App
├── GlobalNavBar → ProfileDropdown → MyPageModal
├── page:
│   ├── PublicMainDashboard (site/main + 방문수)
│   ├── GuildLounge (LoungeContext + builds + 길드전/결투장/…)
│   ├── CommunityPage → GuideCard/Editor, TierPanel, TotalWar…
│   ├── EncyclopediaPage → DbHub
│   ├── ToolsPage
│   └── OpsPage → MainSiteEditor | HubOversee | UserOversee
├── SiteEntranceBanner
├── NicknameGate
└── SiteFooter (버전)
```

덱/장비 UI 공통: `InGameDeckCard`, `HeroGearPanel`, `HeroGridPicker`, `HeroPortraitCard`, `equipments.js` 옵션.

### 12.1 영웅 목록 정렬 (전역 공통 규칙)

**모든** 영웅 고르기·목록 UI는 아래 순서를 따른다. 단일 소스: `src/data/heroes.js`.

1. **각성 영웅** (`isAwakened`)
2. **스페셜** — `HERO_FACTION_ORDER.special` 소속 순 (첫 줄 `(구)세븐나이츠`)
3. **준 스페셜** — 아스가르드 → 아이샤 소속 순
4. **일반** → **기타(콜라보 등)**

API:
- `compareHeroesForList(a, b)` / `sortHeroesForList(list)`
- `export const heroes` 는 이미 정렬됨

| 화면 | 적용 방식 |
|------|-----------|
| `HeroGridPicker` | 필터 후 `sortHeroesForList` (길드전·ops·공용 PvE 에디터 등) |
| `CommunityGuideEditor` PvP(결투장/상급) | **자체 그리드** — 예전엔 export 순서만 의존 → 필터 후 재정렬로 고정 |
| `GuildLounge` 덱 수정 | 필터 후 `sortHeroesForList` |
| `HeroDB` / 티어리스트 풀 | `sort` / `compareHeroesForList` |

**왜 공용 결투장이 어긋나 보였나:** PvP 편집 UI가 `HeroGridPicker`를 안 쓰고 인라인 목록을 복제해 두었고, 카테고리 순서도 예전엔 `special → normal → asgard → aisha`라 **일반이 준 스페셜보다 앞**이었다. 지금은 `special → asgard → aisha → normal → other` + 목록마다 재정렬.

새 영웅 추가 시 `group`/`category`/`isAwakened`를 맞추고, 새 스페셜 소속이면 `HERO_FACTION_ORDER`에만 넣으면 된다.

### 12.2 모바일 전용 CSS 패치 원칙

밍봉이 **「모바일만」** 이라고 하면:

1. 스타일은 **`@media (max-width: 760px)` 또는 `900px` 안만** 추가/수정. 공통(베이스) 셀렉터에 넣으면 PC가 같이 바뀐다.
2. **절대** `@media (min-width: 981px)` 등 PC 블록에 모바일용 규칙을 넣지 말 것 (과거에 방어 리스트 여백 패치가 PC 블록에 잘못 들어간 적 있음).
3. 길드전 방어 PC 2열(`.gw-defense-grid--cols`)·세팅 확인 PC·공유 캡처는 요청 없이 건드리지 말 것.

---

## 13. 도감 업데이트 유의 사항 (영웅 · 펫 · 장비)

앱이 **실제로 import하는 파일**만 고치면 UI에 반영된다. `asset/`은 원본·재생성 소스.

### 13.1 영웅

| 단계 | 할 일 |
|------|--------|
| 1 | `asset/영웅 목록/...`에 폴더·스킬 JSON·초상 원본 추가 |
| 2 | `src/data/scraped_heroes.json`에 병합 (루트 `rebuild_heroes_json.py` 등은 **옛 경로**를 가리킬 수 있음 → 이 repo 기준으로 수정) |
| 3 | `public/images/...` 초상; 카드는 `scripts/fetch_hero_cards.py` → `heroCardMeta.json` + `card.webp` |
| 4 | `src/data/heroes.js` — `heroes` export, 새 진영이면 `HERO_FACTION_ORDER` 확인. **목록 순서는 §12.1** |
| 5 | 빌드·배포 시 `APP_VERSION` bump |

런타임: `scraped_heroes.json` ← `heroes.js` ← `HeroDB` / 피커 / 초상.

### 13.2 펫

| 단계 | 할 일 |
|------|--------|
| 1 | **`src/data/pets.js`에 엔트리 추가** (앱은 여기만 봄) |
| 2 | `/images/pets/{이름}.png` (또는 `portraitUrl`에 맞춤) |
| 3 | (선택) `asset/펫 목록/모든 펫.json` 동기화 — 자동 import 아님 |

### 13.3 장비 · 장신구

| 단계 | 할 일 |
|------|--------|
| 1 | `asset/장비, 장신구/`에 PNG·메타 추가 |
| 2 | `python scripts/import_gear_assets.py` → `src/data/gearDex.generated.json` + `public/images/equipment|accessories` |
| 3 | **덱 에디터·길드전·ops 메타덱 세트/옵션**은 `src/data/equipments.js` (주석: 단일 소스) |
| 4 | 도감 화면은 `gearDex.js`가 generated + legendary(`equipments.js`) 병합 |

주의: `src/data/equipment.js`(단수)는 옛 스키마. 새 작업은 **`equipments.js` + gearDex**.

### 13.4 도감 UI 탭

`DbHub` — 영웅 / 장비 / 시스템(`systemRules.js`) / 펫.

---

## 14. 업데이트·패치 시 일반 체크리스트

1. **이 폴더만** 수정. 라이브 배포는 요청 있을 때만.
2. **§2.1** — 유저·허브 데이터·rules를 손상·완화하지 않는지 확인.
3. Firestore/Storage **규칙 바꾸면** 해당 rules도 같이 배포 (완화인지 먼저 검토).
4. Functions 바꾸면 `functions` 배포 + Node 20 유지. 허브/유저 삭제 경로 재확인. **`resolveMyHub` / hubId 클리어 로직** 재확인.
5. 도감 추가 후 피커·초상·진영 누락 없는지 `/dex`와 덱 수정에서 확인.
6. 허브 가입/역할은 클라이언트 직쓰기가 아니라 **rules + joinHub** 전제.
7. 커뮤니티 PvE 공략·티어 = Super; PvP만 일반 유저 작성 가능.
8. 레이아웃: 덱 수정 모달 타임라인 높이 규칙 위반하지 말 것.
9. **모바일만** 요청이면 §12.2 — PC 미디어/베이스 스타일 미포함 확인.
10. 세팅 확인 모달 뒤 전체 blur(`.app-shell` filter) 제거 제안하지 말 것 (§10.6).
11. 커밋/푸시는 밍봉 요청 시. 시크릿(`.env*`)·`.firebase/hosting.*.cache` 커밋 금지.

---

## 15. Ops에 아직 없는 유용한 후보 (구현 X, 참고)

- 공용 공략 감독(최근 N / 삭제)
- 추천수 상위·이상치
- 허브 인원/최근활동 정렬 강화
- 입장 배너 저장 전 미리보기
- Functions Node 런타임 deprecation 대응

---

## 16. 연락 · 브랜치 관례

- 운영 문의 메일: `src/config/siteContact.js` → `OPERATOR_EMAIL`
- 최근 릴리즈 브랜치 예: `release/2026-08-20` (작업 전 `git status` / remote 확인)
- 최근 호스팅 버전대: **v2026.08.23.57** 전후 (푸터 `APP_VERSION` 확인)
- 소유자: 밍봉(디자이너) — 배포·다른 Firebase 프로젝트 접근은 명시 요청 시에만

---

*문서 갱신 시: 구조·규칙·도감 경로·모바일 UI 제약이 바뀌면 이 파일도 같이 고친다.*

---

## 17. 패치 내역

### 2026-08-24 (`v2026.08.24.61`)
- **메인페이지 길드 순위 모바일 최적화**: 모바일(`@media (max-width: 760px)`)에서 길드 순위 행의 1열 폭(`32px`), 순위 뱃지(`22px`), 길드마크(`24px`) 축소 및 소속 뱃지(`font-size: 10px`, `padding: 2px 7px`), 리그 칩(`font-size: 9px`, `padding: 2px 6px`) 컴팩트화로 좁은 화면(iPhone 등)에서 길드명과 뱃지가 겹치는 문제 해결 (PC 스타일 무영향).

