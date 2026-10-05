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

### 1.1 문서 지도 (필요할 때만 열기)

이 파일은 **모든 작업에 항상 읽히는 핵심**만 둔다. 상세는 아래 문서로 분리했다(원문 그대로, 절 번호 § 동일). 이 파일에 없는 §번호는 해당 문서에서 찾을 것.

| 문서 | 내용 (§) | 언제 |
|------|----------|------|
| [docs/agents/preview-hub.md](docs/agents/preview-hub.md) | §4.1 미리보기 허브 | 「미리보기 허브 켜줘」·로컬 테스트 |
| [docs/agents/features.md](docs/agents/features.md) | §10 기능별 동작 (CMS·길드전·세팅 확인·시즌 카드·테마·쿠폰) | 해당 기능 패치 |
| [docs/agents/ui-layout.md](docs/agents/ui-layout.md) | §12.2–12.5 모바일 CSS·덱 수정 모달 | 모바일·덱 수정 모달 CSS |
| [docs/agents/encyclopedia.md](docs/agents/encyclopedia.md) | §13 도감 (영웅·펫·장비·장신구) | 영웅·장비 추가/변경 |
| [docs/agents/patch-history.md](docs/agents/patch-history.md) | §17 패치 내역 | 배포 시 맨 위에 추가 |
| [docs/content-season-schedule.md](docs/content-season-schedule.md) | 시즌 카드 정본 | 시즌 카드 패치 전 필수 |

| 자동화 | 위치 | 역할 |
|--------|------|------|
| 스킬 `senalink-deploy` | `.cursor/skills/senalink-deploy/` | 배포 전 점검 → 버전·패치 내역 → 배포 → 커밋·푸시 |
| 스킬 `senalink-preview-hub` | `.cursor/skills/senalink-preview-hub/` | 에뮬레이터 + dev 서버로 로컬 연습장 |
| 훅 `guard-shell` | `.cursor/hooks.json` → `.cursor/hooks/guard-shell.mjs` | senalink 외 프로젝트 배포·Firestore 일괄 삭제·강제 푸시·시크릿 커밋 차단, 배포·rules·functions 명령은 확인 요청 |
| 규칙 `firebase-safety` | `.cursor/rules/firebase-safety.mdc` | rules·functions·저장 경로 파일을 열면 §2.1 자동 첨부 |

---

## 2. 반드시 지킬 Cursor 규칙

| 파일 | 내용 |
|------|------|
| `.cursor/rules/local-only-until-launch.mdc` | 이 폴더만 패치, senalink만, 배포는 명시 요청 시 |
| `.cursor/rules/center-and-fill-layout.mdc` | 덱+타임라인 2열: 행 stretch·덱 **세로 중앙**. 덱 수정 모달 「스킬 순서」높이 **px 고정**, 스크롤은 `.skill-timeline-scroller` 안만 |
| `.cursor/rules/read-agents-md.mdc` | 비트리비얼 작업 전 이 문서 참고. **「미리보기 허브 켜줘」→ §4.1** |
| `.cursor/rules/firebase-safety.mdc` | rules·Functions·Firestore 저장 경로 파일 편집 시 자동 첨부 — §2.1 요약 |

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
├── functions/                ← Cloud Functions (Node 24, asia-northeast3)
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

밍봉이 **「미리보기 허브 켜줘」** · 「로컬에서 테스트」 · 「연습장」이라고 하면 → **[docs/agents/preview-hub.md](docs/agents/preview-hub.md)** 순서대로 (스킬 `senalink-preview-hub`).
요지: `npm run emulators` + `npm run dev` → `http://127.0.0.1:5173/hub`. 라이브 데이터와 무관하고 코드는 라이브와 동일(`import.meta.env.DEV`일 때만 에뮬레이터 연결). **라이브에 테스트 허브를 만들지 말 것.**

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
- 필드: `nickname`(2–12), `photoURL`, `totalwarTier`, `arenaTier`, `destructionScore`, `combatPower`(선택, 내 전투력 총합·본인 입력), `hubId`, `recommendCount`, `lastProfileRecommendDate`, `dailyTarotPeriodId`(선택, KST 09:00 주기 일일 타로 클릭), `updatedAt`.
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

#### 6.3.1 연합 (1군 호스트 ↔ 2군 게스트, 읽기 전용)

길드 허브 **홈 하단**: 왼쪽 **연합** · 오른쪽 **허브 나가기**.

| | 내용 |
|--|--|
| 목적 | 2군이 1군 공략을 **열람** (멤버 가입 아님) |
| 코드 | `7A-XXXX-XXXX` · `allianceIndex/{code}` (초대코드 `7K-` / `inviteIndex`와 분리) |
| 스키마 | host: `allianceEnabled`/`allianceCode` + `allianceGuests/{guestHubId}` · guest: `allianceHostId`/`allianceHostName` |
| 상한 | 호스트당 게스트 허브 **최대 3** (`MAX_ALLIANCE_GUESTS`) |
| 쓰기 | **전부 Callable** — 클라이언트 `allianceIndex`/`allianceGuests` write 금지. hub의 연합 필드는 client update로 변경 불가(`allianceFieldsUnchanged`) |
| 읽기 | rules: `isAllianceGuestOf(hostId)`일 때만 host hub·서브컬렉션 **read** 추가. **write 완화 없음** |
| UI | 게스트 뷰: `session.allianceGuest` · `canEditBuilds`/`isAdmin` false · 상단 읽기전용 배너 · builds auto-save 가드 |
| Callable | `createAlliance` · `joinAlliance` · `leaveAlliance` · `revokeAllianceGuest` · `regenAllianceCode` · `dissolveAlliance`(1군 종료) |
| 배포 | rules+functions 함께. **라이브는 밍봉 명시 시에만** |
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
| `allianceIndex/{code}` | **불가** (Callable만) | **불가** (Callable만) |
| `publicGuilds/{hubId}` | 공개 | 허브 admin/master |
| `hubs/{hubId}` | 멤버·**연합 게스트**·Super | 생성=본인이 master; 수정 master/admin/super(제약·연합필드 클라 변경 불가); 삭제 master/super |
| `hubs/…/allianceGuests` | 호스트 멤버·해당 게스트 허브 멤버·super | **불가** (Callable만) |
| `hubs/…/members` | 멤버·본인·**연합게스트 read**·super | 생성은 개설 시 master; 가입은 **Functions joinHub**; 역할 변경 master/super |
| `hubs/…/builds` | 멤버·**연합게스트 read**·super | 멤버 C/U; 삭제 admin/super |
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
| `createAlliance` | Callable | 호스트 연합 활성화·코드 발급 (`7A-…`) |
| `joinAlliance` | Callable | 게스트 허브를 호스트에 연결 (멤버십 불변, 최대 3) |
| `leaveAlliance` | Callable | 게스트 측 연합 해제 |
| `revokeAllianceGuest` | Callable | 호스트가 특정 게스트 끊기 |
| `regenAllianceCode` | Callable | 호스트 마스터 연합 코드 재발급 |
| `dissolveAlliance` | Callable | 호스트 마스터 연합 종료(코드·게스트 연결 정리) |
| `purgeIdleHubs` | Schedule 매일 04:00 KST | 60일 유휴 허브 삭제 |
| `syncCoupons` | Schedule 매일 00:00 KST | 7katlas 쿠폰 목록(+한글 번역) → `site/coupons` (파싱 실패 시 기존 유지) |
| `snapshotVisitDaily` | Schedule 10분마다 (KST) | 오늘 방문자 합계(`site/stats`+`visitShards` 읽기만) → `site/visitDaily.days[YYYY-MM-DD]` (커질 때만) · Ops 대시보드 그래프용 |
| `redeemCoupon` | Callable (로그인 불필요) | 넷마블 쿠폰 API 중계 (`{uid, code}` → `{status}`) · Firestore 무접근 · IP당 10분 60회 |

허브 삭제 시 지우는 서브컬렉션: `members`, `history`, `notices`, `posts`, `scores`, `builds`, `allianceGuests` (+ `allianceIndex`·게스트 역포인터 정리).

---

## 10. 기능 영역별 동작 → [docs/agents/features.md](docs/agents/features.md)

해당 기능을 만질 때 그 절만 열어 볼 것. 목차와 절대 규칙:

- 10.1 메인 CMS · 입장 배너 · 방문자 (`site/main`, `site/stats/visitShards`)
- 10.2 길드 허브 vs 커뮤니티 빌드 분리 · 길드전 공격/방어 · PvE 접힘 카드(공성·강림 그립 순서 이동) · 길드전 폭 브레이크포인트
- 10.3 Ops · 10.4 「수정 및 고정자」 시각 · 10.5 도구·도감
- 10.6 세팅 확인 (`InGameDeckCard`) — **모달 뒤 `.app-shell` blur(22px)는 의도된 것, 제거 금지**
- 10.7 컨텐츠 시즌 카드 — 정본 `docs/content-season-schedule.md` **패치 전 필수 열람**, 정본이 코드보다 우선
- 10.8 화면 테마 유리/선명 다크 (`uiTheme.js`, `themeSolidDark.css`, `UiThemeToggle`)
- 10.9 쿠폰 (GNB 「쿠폰」, `site/coupons`, Callable `redeemCoupon`) — UID는 localStorage만, 클라 write 규칙 추가 금지

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

### 12.2–12.5 모바일 CSS · 아이콘 · 덱 수정 모달 → [docs/agents/ui-layout.md](docs/agents/ui-layout.md)

모바일 CSS·덱 수정 모달을 만지기 전에 반드시 열 것. 핵심만:

- 「모바일만」 요청 → 그 화면의 브레이크포인트 블록 안에서만 수정. PC `min-width` 블록·`deckEditScrollModal.css`에 모바일 규칙 금지.
- 덱 수정 모달: PC(≥981) = `deckEditScrollModal.css`/`.js`만, 모바일(≤980) = `index.css` 블록만. 본문 `.deck-edit-scroll-body`만 스크롤, 내부 스크롤은 영웅 목록·PvE `.skill-timeline-scroller`(높이 px 고정)만.
- 세팅 공유 PNG 워밍은 공유 클릭 시에만. 한 번에 하나씩 고치고 검증 후 다음.

---

## 13. 도감 업데이트 (영웅 · 펫 · 장비 · 전용장비) → [docs/agents/encyclopedia.md](docs/agents/encyclopedia.md)

신규 영웅·각성·스킬 변경·콜라보·펫·장비·장신구 작업 시 반드시 열 것. 핵심만:

- 앱이 import하는 파일만 UI에 반영: 영웅 `src/data/scraped_heroes.json`(+`public/images/{id}/`), 펫 `src/data/pets.js`, 장비 `equipments.js` + `gearDex`. `asset/`은 원본·재생성 소스.
- 신규 영웅이면 **전용장비 아이콘도 같이** (`exclusiveGearMeta.generated.json`).
- 목록 정렬 수동 금지 — §12.1 `sortHeroesForList`.
- 장신구 세공: `accessory2`는 optional. **기본값에 `accessory2`를 넣지 말 것**(구 문서 해석이 깨짐). 해석·표시는 `lib/accessoryCraft.js`.

---

## 14. 업데이트·패치 시 일반 체크리스트

1. **이 폴더만** 수정. 라이브 배포는 요청 있을 때만.
2. UI·허브 기능 확인은 **§4.1 미리보기 허브**(에뮬레이터 + `npm run dev`) 우선. 라이브에 먼저 올려 보지 말 것.
3. **§2.1** — 유저·허브 데이터·rules를 손상·완화하지 않는지 확인.
4. Firestore/Storage **규칙 바꾸면** 해당 rules도 같이 배포 (완화인지 먼저 검토).
5. Functions 바꾸면 `functions` 배포 + Node 24 유지(`functions/package.json` `engines.node`, nodejs24 지원 종료 2028-10-31). 허브/유저 삭제 경로 재확인. **`resolveMyHub` / hubId 클리어 로직** 재확인.
6. 도감 추가 후 피커·초상·진영 누락 없는지 `/dex`와 덱 수정에서 확인.
7. 허브 가입/역할은 클라이언트 직쓰기가 아니라 **rules + joinHub** 전제.
8. 커뮤니티 PvE 공략·티어 = Super; PvP만 일반 유저 작성 가능.
9. 레이아웃: 덱 수정 모달 타임라인 높이 규칙 위반하지 말 것 (§12.4).
10. **모바일만** 요청이면 §12.2 — PC·`deckEditScrollModal.css`·`min-width:981` 미포함 확인.
11. 세팅 확인 모달 뒤 전체 blur(`.app-shell` filter) 제거 제안하지 말 것 (§10.6).
12. 덱 수정 모달 패치 시 §12.5 회귀 체크리스트 참고.
13. 커밋/푸시는 밍봉 요청 시. 시크릿(`.env*`)·`.firebase/hosting.*.cache` 커밋 금지.
14. 배포 요청을 받으면 스킬 **`senalink-deploy`** 순서대로 (점검 → 버전·패치 내역 → Functions 먼저, Hosting 나중 → 라이브 확인 → 커밋·푸시).

---

## 15. Ops에 아직 없는 유용한 후보 (구현 X, 참고)

- 공용 공략 감독(최근 N / 삭제)
- 추천수 상위·이상치
- 허브 인원/최근활동 정렬 강화
- 입장 배너 저장 전 미리보기
---

## 16. 연락 · 브랜치 관례

- 운영 문의 메일: `src/config/siteContact.js` → `OPERATOR_EMAIL`
- 최근 릴리즈 브랜치 예: `release/2026-08-20` (작업 전 `git status` / remote 확인)
- 최근 호스팅 버전대: **v2026.10.05.193** (푸터 `APP_VERSION` 확인)
- 소유자: 밍봉(디자이너) — 배포·다른 Firebase 프로젝트 접근은 명시 요청 시에만

---

*문서 갱신 시: 구조·규칙·도감 경로·모바일 UI 제약이 바뀌면 이 파일도 같이 고친다.*

---

## 17. 패치 내역 → [docs/agents/patch-history.md](docs/agents/patch-history.md)

배포할 때마다 그 파일 **맨 위**에 새 항목 추가 (날짜 · `APP_VERSION` · 바뀐 점 · 배포 범위 Hosting/rules/functions).

