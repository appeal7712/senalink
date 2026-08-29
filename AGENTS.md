# AGENTS.md — 세나링크 (sevennight_guild_web_formal) 핸드오프

다른 에이전트·개발자가 **이 폴더만** 이어서 패치할 때 읽는 문서.  
라이브: **https://senalink.kr** (커스텀 도메인) · Firebase Hosting `senalink.web.app` · 프로젝트 **`senalink`만**.

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
| `.cursor/rules/read-agents-md.mdc` | 비트리비얼 작업 전 이 문서 참고. **「미리보기 허브 켜줘」→ §4.1** |

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
| (덜 민감) CMS·방문 | `site/main`, `site/stats`(+ `visitShards/*` 분산 카운터) |

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
│   └── legacy/               ← 옛 루트 스크래퍼 보관 (README 참고, 앱 미사용)
├── src/
│   ├── main.jsx              ← Provider 트리
│   ├── App.jsx               ← 페이지 스위치 + GNB/푸터/배너
│   ├── index.css             ← 거의 모든 스타일
│   ├── styles/               ← deckEditScrollModal.css (PC 덱 수정 전용, `main.jsx` import)
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

### 4.1 미리보기 허브 (로컬 연습장) — **에이전트 필독**

밍봉이 **「미리보기 허브 켜줘」** · **「로컬에서 테스트」** · **「연습장」** 등을 말하면 **이 절을 따른다.**  
라이브에 따로 만든 허브가 **아니다.** PC에서 Firebase **에뮬레이터**를 켜고 `npm run dev`로 붙이는 방식이다.

#### 한 줄 요약

| | 로컬 미리보기 | 라이브 |
|--|--------------|--------|
| 데이터 | 내 PC 에뮬레이터 (비어 있음·재시작 시 초기화 가능) | 실제 `senalink` Firestore |
| 허브 로그인 | 구글 **없이** 익명 자동 로그인 | 구글 로그인 필수 |
| 배포 영향 | **없음** — 같은 소스, 환경만 다름 | Hosting 배포 시에만 반영 |

**로컬 패치 → 미리보기 허브에서 확인 → 밍봉이 배포 요청할 때만 라이브** 가 기본 워크플로다. 라이브를 먼저 올려서 UI를 보지 말 것.

#### 코드가 라이브와 다른가?

**아니다.** 미리보기 전용 분기 파일을 따로 두지 않는다.

- `.env.development` — `VITE_USE_EMULATORS=true` (저장소에 포함, **`npm run dev`만** 사용)
- `src/lib/firebase.js` — `usingEmulators = import.meta.env.DEV && VITE_USE_EMULATORS === 'true'` 일 때만 `127.0.0.1` 에뮬레이터 포트로 연결
- `src/context/LoungeContext.jsx` — `useGoogleForHub = USE_GOOGLE_AUTH && !usingEmulators` → 로컬에선 구글 없이 허브 생성 가능
- `src/components/lounge/LoungeGate.jsx` — 로컬이면 **「로컬 연습장 · 구글 없이…」** 문구 표시

`npm run build` / Hosting 배포 시 `import.meta.env.DEV`가 false → **에뮬레이터 분기는 절대 안 탐.** 로컬에서 본 UI 패치를 그대로 배포해도 된다(배포는 명시 요청 시만).

#### 에이전트: 미리보기 허브 켜는 순서

1. **터미널 상태 확인** — 이미 `emulators` / `dev`가 떠 있으면 재실행하지 말고 URL만 안내.
2. **터미널 1** (프로젝트 루트):
   ```bash
   npm run emulators
   ```
   - Auth `9099` · Firestore `8080` · Functions `5001` · Storage `9199` · Emulator UI `http://127.0.0.1:4000`
3. **터미널 2**:
   ```bash
   npm run dev
   ```
   - Vite `http://127.0.0.1:5173`
4. 브라우저: **`http://127.0.0.1:5173/hub`**
5. **닉네임** — `NicknameGate`로 2–12자 닉 저장(라이브와 동일).
6. **허브 생성** — 「허브 생성」→ **해시태그 1개 이상** 필수(없으면 생성 실패).
7. 길드전·공격·파생덱 등 패치 확인 후, 배포는 **밍봉/김봉 명시 시만** `npm run build` + `firebase deploy --only hosting --project senalink`.

#### 사전 조건 (처음이거나 연결 실패 시)

- `.env.local` — `.env.example` 참고해 `VITE_FIREBASE_*` 채움(gitignore, **senalink 프로젝트 ID** 그대로 써도 됨. dev일 때 트래픽은 에뮬레이터로만 감).
- 에뮬레이터 미기동 시 허브 화면: *「로컬 에뮬레이터에 연결하지 못했습니다…」* → 터미널 1에서 `npm run emulators` 재확인.
- `/ops` 로컬: `npm run seed:admin -- <익명UID>` 후 Ops 페이지에서 「로컬 관리자로 들어가기」(`SuperAdminContext.enterLocalOpsAdmin`).

#### 하지 말 것

- 미리보기 허브를 위해 **라이브 Firestore에 테스트 허브를 만들거나** 프로덕션 데이터를 건드리지 말 것.
- 로컬 전용으로 `USE_GOOGLE_AUTH`·rules·`VITE_USE_EMULATORS`를 **배포 빌드에 섞이게** 바꾸지 말 것.
- 밍봉 요청 없이 Hosting 배포하지 말 것.

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
- 필드: `nickname`(2–12), `photoURL`, `totalwarTier`, `arenaTier`, `destructionScore`, `hubId`, `recommendCount`, `lastProfileRecommendDate`, `dailyTarotPeriodId`(선택, KST 09:00 주기 일일 타로 클릭), `updatedAt`.
- **마이페이지:** GNB `ProfileDropdown` → `MyPageModal` (본인만 수정).
- **일일 타로카드:** GNB `DailyTarotButton` — 외부 링크 + `dailyTarotPeriodId` / localStorage. 규칙 화이트리스트 필드(완화 아님).
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
- Claim: `profileDailyRecommends/{fromUid}_{toUid}_{YYYY-MM-DD}` + 대상 `users.recommendCount` +1 (같은 배치).
- **추천자×대상**당 KST 하루 1회. 같은 날 다른 사람은 추가 추천 가능. 같은 사람은 다음 KST 자정 이후 다시 가능. 취소 없음.
- `users.lastProfileRecommendDate`는 마지막 추천일 참고용(전체 하루 1회 게이트 아님).
- 어뷰징은 ops에서 감시만 (삭제 UI 없음).

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
| `site/stats` | 공개 | 레거시 +1 (구 클라). 신규는 `site/stats/visitShards/{0–31}` 동일 +1 규칙 |
| `users/{uid}` | signed-in get / **list=Super** | 본인 화이트리스트; 타인 recommend +1은 claim과 함께만 |
| `profileDailyRecommends/…` | 본인 claim | 본인 create만 (`from_to_date`, 대상당 하루 1) |
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

`firestore.indexes.json`: `communityGuides` (section + updatedAt desc), `members.uid` collectionGroup (resolveMyHub용).

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
| `deckEditScrollModal.js` | 결투장·공성·강림·방어 덱 수정 모달 PC 클래스·스타일·휠 전달 (§12.4–12.5) |
| `uiTheme.js` | 화면 테마 유리/선명 · `localStorage` · `html[data-ui-theme]` (§10.8) |
| `seo.js` / `sanitize.js` / `rateLimit.js` / `formatTime.js` | 부가 |

---

## 12. 컴포넌트 연결 (자주 만지는 것)

```
App
├── GlobalNavBar → ProfileDropdown → MyPageModal · UiThemeToggle (§10.8)
├── page:
│   ├── PublicMainDashboard (site/main + 방문수)
│   ├── GuildLounge (LoungeContext + builds + 길드전/결투장/…)
│   ├── GuildWarDefensePanel (방어 덱 수정 · §12.4)
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
| `GuildWarDefensePanel` 방어 덱 수정 | 인라인 그리드 + `deckEditScrollHeroGrid*` (결투장 kind) |
| `HeroDB` / 티어리스트 풀 | `sort` / `compareHeroesForList` |

**왜 공용 결투장이 어긋나 보였나:** PvP 편집 UI가 `HeroGridPicker`를 안 쓰고 인라인 목록을 복제해 두었고, 카테고리 순서도 예전엔 `special → normal → asgard → aisha`라 **일반이 준 스페셜보다 앞**이었다. 지금은 `special → asgard → aisha → normal → other` + 목록마다 재정렬.

새 영웅 추가 시 `group`/`category`/`isAwakened`를 맞추고, 새 스페셜 소속이면 `HERO_FACTION_ORDER`에만 넣으면 된다.

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
| **세로 ≥1021** (PC 폭) | `.deck-edit-scroll-body` **스크롤 없음** (`overflow-y: hidden`) |
| **세로 ≤1020** (PC 폭) | 본문(`.deck-edit-scroll-body`)만 스크롤 |

#### 스크롤 규칙 (PC)

- **본문 스크롤:** `.deck-edit-scroll-body` 하나만 (세로 부족 시).
- **내부 스크롤 허용:** 영웅 목록 (`.arena-hero-grid` / `.pve-hero-grid`) · PvE 스킬 순서 (`.skill-timeline-scroller` — 높이 px 고정, `.cursor/rules` 준수).
- **그 외 영역** (장비·덱·세팅 디테일·타임라인 추가 등): 내부 스크롤 금지 — `useDeckEditScrollWheelForward`가 모달 capture에서 휠을 본문으로 전달.
- **세팅 디테일:** 좌열 `flex: 1` — 덱 바로 아래부터 좌열 하단까지 박스·textarea가 **가득 채움**. `margin-top: auto`로 위·아래 빈 공간 만들지 말 것.

#### PvE 토큰 (arena와 분리)

- 공성·강림: `--deck-gear-h: 520px` (강림 라운드 라벨·세팅 디테일 여유; 결투장 496px).
- 레이아웃 **높이 구간마다 바꾸지 않음** — 1020 기준으로 바뀌는 것은 본문 `overflow-y` 뿐.

#### 길드전 방어 덱 수정 (`GuildWarDefensePanel.jsx`)

- PC: `deckEditScrollModal` **kind `arena`** 와 100% 동일 본문.
- 헤더 유지: 덱 티어 · 세팅 · 덱 유형 · 기타 디테일 · 속공 수치(속공 모드 시).
- **`981–1179` 중간 폭:** `.gw-defense-edit-modal` 헤더 토글 `nowrap` + 가로 스크롤; `header-main` `min-width:0`·닫기 `flex-shrink:0`으로 **속공 수치가 X와 겹치지 않게**. **≤980 폰 헤더(세로 스택)는 기존 `index.css` 그대로.**

**별도 패턴:** 길드전 **공격 카운터** `.gw-counter-edit-modal` — `index.css` (덱 수정 통스크롤과 분리).

클래스·인라인 스타일은 **`deckEditScrollModal.js` 헬퍼** 우선 · PC 그리드 밴드에이드를 `index.css` 베이스에 넣지 말 것.

### 12.5 덱 수정 모달 패치 시 마음가짐 (회귀 방지)

1. **한 가지씩, 검증 후 다음** — 스크롤·높이·영웅 그리드·타임라인을 한 번에 바꾸면 한쪽 고치면 다른 쪽 깨짐 (실제로 v106~v138 여러 사이클 소요).
2. **가로 브레이크포인트와 세로 브레이크포인트 분리** — 980(모바일 레이아웃) / 1021(본문 스크롤 on·off) / 1020(휠·overflow 보조)를 섞어 한 미디어쿼리로 처리하지 말 것.
3. **레이아웃 토큰은 1벌** — 뷰포트 높이마다 그리드·칸 크기를 다시 정의하지 말 것. 넘치면 본문만 스크롤.
4. **「모바일 완벽」이면 모바일 CSS 손대지 않기** — PC만 `deckEditScrollModal.css` (`min-width: 981px`). 방어·결투장 모바일 `index.css` ≤980 규칙은 밍봉 명시 없이 수정 금지.
5. **내부 스크롤은 최소** — 영웅 목록(+ PvE 스킬 리스트)만. 장비 패널·좌열에 `overflow-y: auto` 추가 제안하지 말 것.
6. **헬퍼·DOM 구조 공유** — `GuildLounge` · `CommunityGuideEditor` · `GuildWarDefensePanel`은 동일 `deckEditScrollBodyWrapperProps` / `useDeckEditScrollWheelForward` 패턴.
7. **배포 전 체크리스트 (PC 981+, 풀 높이 / 줄인 높이 각각):** 본문 스크롤 유무 · 휠이 장비/디테일/빈 여백에서 먹는지 · 세팅 디테일 좌열 가득 참 · 영웅 목록만 내부 스크롤 · PvE 타임라인 scroller 높이 고정 유지.

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

장비·장신구 단일 소스: **`equipments.js` + gearDex** (`equipment.js` 단수 스키마는 제거됨).

### 13.4 도감 UI 탭

`DbHub` — 영웅 / 장비 / 시스템(`systemRules.js`) / 펫.

---

## 14. 업데이트·패치 시 일반 체크리스트

1. **이 폴더만** 수정. 라이브 배포는 요청 있을 때만.
2. UI·허브 기능 확인은 **§4.1 미리보기 허브**(에뮬레이터 + `npm run dev`) 우선. 라이브에 먼저 올려 보지 말 것.
3. **§2.1** — 유저·허브 데이터·rules를 손상·완화하지 않는지 확인.
4. Firestore/Storage **규칙 바꾸면** 해당 rules도 같이 배포 (완화인지 먼저 검토).
5. Functions 바꾸면 `functions` 배포 + Node 20 유지. 허브/유저 삭제 경로 재확인. **`resolveMyHub` / hubId 클리어 로직** 재확인.
6. 도감 추가 후 피커·초상·진영 누락 없는지 `/dex`와 덱 수정에서 확인.
7. 허브 가입/역할은 클라이언트 직쓰기가 아니라 **rules + joinHub** 전제.
8. 커뮤니티 PvE 공략·티어 = Super; PvP만 일반 유저 작성 가능.
9. 레이아웃: 덱 수정 모달 타임라인 높이 규칙 위반하지 말 것 (§12.4).
10. **모바일만** 요청이면 §12.2 — PC·`deckEditScrollModal.css`·`min-width:981` 미포함 확인.
11. 세팅 확인 모달 뒤 전체 blur(`.app-shell` filter) 제거 제안하지 말 것 (§10.6).
12. 덱 수정 모달 패치 시 §12.5 회귀 체크리스트 참고.
13. 커밋/푸시는 밍봉 요청 시. 시크릿(`.env*`)·`.firebase/hosting.*.cache` 커밋 금지.

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
- 최근 호스팅 버전대: **v2026.08.30.151** (푸터 `APP_VERSION` 확인)
- 소유자: 밍봉(디자이너) — 배포·다른 Firebase 프로젝트 접근은 명시 요청 시에만

---

*문서 갱신 시: 구조·규칙·도감 경로·모바일 UI 제약이 바뀌면 이 파일도 같이 고친다.*

---

## 17. 패치 내역

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

