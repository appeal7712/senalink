# 구조 · 인증 · Firestore · Functions — AGENTS.md §6–9 · §11–12 · §15

> AGENTS.md에서 분리한 상세 문서 (원문 그대로, 절 번호 § 동일). 공통 금지 · 데이터 보호는 항상 루트 `AGENTS.md` §2.1이 우선.
> rules · Functions · LoungeContext 저장 경로 · Ops를 만질 때 열 것.

## 6. Context · 인증 · 역할

Provider 순서 (`main.jsx`): **SuperAdmin → UserProfile → Lounge → App**.

### 6.1 SuperAdmin (`SuperAdminContext.jsx`)
- Firestore `admins/{uid}`에 `{ role: "super" }` 가 있어야 함. **앱에서 생성 불가** (콘솔/시드만).
- `/ops` 로그인: 구글 팝업 또는 에뮬레이터 `enterLocalOpsAdmin`.
- 실제 쓰기 권한은 URL이 아니라 **Firestore `isSuperAdmin()`**.

### 6.2 사이트 유저 프로필 (`UserProfileContext.jsx`)
- 문서: `users/{uid}` 실시간 구독 + `saveProfile`.
- 필드: `nickname`(2–12), `photoURL`, `totalwarTier`, `arenaTier`, `arenaLeague`(선택, `rookie`·`elite`·`champions` — 결투장 리그, 없으면 미선택), `destructionScore`, `combatPower`(선택, 내 전투력 총합·본인 입력), `hubId`, `recommendCount`, `lastProfileRecommendDate`, `dailyTarotPeriodId`(선택, KST 09:00 주기 일일 타로 클릭), `updatedAt`.
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
- **허브 갱신 알림:** 활동 없이 `HUB_RENEW_WARN_DAYS`(70)일이 지난 허브에 길드원(마스터 · 관리자 · 멤버, 연합 게스트 · 슈퍼 관전 제외)이 들어오면 `HubRenewPrompt` 「100일간 … 삭제됩니다. 갱신하시겠습니까?」. 「갱신」 = `renewHub()` → history 한 줄(`action: 'renew_hub'`) → Functions `onHubHistoryCreated`가 `lastActivityAt` 갱신(**rules · Functions 변경 없음**, 기존 경로). 「나중에」 = 이 탭 `sessionStorage`만. 알림을 못 볼 만큼 안 쓰는 허브는 100일에 기존대로 삭제.
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
  EXCLUSIVE_GEAR_GUIDES, META_DECK_SUBMISSIONS,
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
| `metaDeckSubmissions/{uid}` | 본인 get · **list=Super** | 본인만 create/update(문서 id = 내 uid, 필드 8개 화이트리스트, `status=='pending'`, `deckJson` ≤20,000자, 인게임 닉 1–20자) · 본인 삭제 · Super 승인/반려(`status` pending/approved/rejected) |
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
| `purgeIdleHubs` | Schedule 매일 04:00 KST | 100일 유휴 허브 삭제 (`HUB_IDLE_DAYS` — `functions/index.js`·`src/data/loungeMeta.js` 같이 맞춤). 70일부터 허브 화면에 갱신 알림(§6.3) |
| `syncCoupons` | Schedule 매일 00:00 KST | 7katlas 쿠폰 목록(+한글 번역) → `site/coupons` (파싱 실패 시 기존 유지) |
| `snapshotVisitDaily` | Schedule 10분마다 (KST) | 오늘 방문자 합계(`site/stats`+`visitShards` 읽기만) → `site/visitDaily.days[YYYY-MM-DD]` (커질 때만) · Ops 대시보드 그래프용 |
| `redeemCoupon` | Callable (로그인 불필요) | 넷마블 쿠폰 API 중계 (`{uid, code}` → `{status}`) · Firestore 무접근 · IP당 10분 60회 |

허브 삭제 시 지우는 서브컬렉션: `members`, `history`, `notices`, `posts`, `scores`, `builds`, `allianceGuests` (+ `allianceIndex`·게스트 역포인터 정리).

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
| `teamBuilderAnalysis.js` | 팀 빌더 · 도감 효과 요약 엔진 (스킬 문장 → 효과 목록, 순수 함수 · Firebase 무관, §10.10) |
| `seo.js` / `sanitize.js` / `rateLimit.js` / `formatTime.js` | 부가 |

---

## 12. 컴포넌트 연결 (자주 만지는 것)

```
App
├── GlobalNavBar → ProfileDropdown → MyPageModal · UiThemeToggle (§10.8)
├── page:
│   ├── PublicMainDashboard (site/main + 방문수)
│   ├── TeamBuilderPage (lazy · localStorage만) → TeamBuilderParts · EffectDictionary · HeroEffectSummary (§10.10)
│   ├── GuildLounge (LoungeContext + builds + 길드전/결투장/…)
│   ├── GuildWarDefensePanel (방어 덱 수정 · §12.4)
│   ├── CommunityPage → GuideCard/Editor, TierPanel, TotalWar…
│   ├── EncyclopediaPage → DbHub → HeroDB(스킬 / 효과 요약 전환) · EquipDB …
│   ├── ToolsPage
│   └── OpsPage → MainSiteEditor | HubOversee | UserOversee
├── SiteEntranceBanner
├── NicknameGate
└── SiteFooter (버전)
```

덱/장비 UI 공통: `InGameDeckCard`(세팅 확인 창 내용은 `SettingOverviewModal` · 진형 그리기 `deckFormation.jsx` · **진형 선택 창**도 여기 하나 — 모든 덱 편성 공용, 모양은 index.css 「진형 선택 창」 `.formation-picker-*` 한 곳, 카드 누르면 바로 적용 · 닫힘), `HeroGearPanel`, `HeroGridPicker`, `HeroPortraitCard`, `equipments.js` 옵션. 길드전 공격 상대 덱 검색칸 `GwDeckSearch` + 판정 `lib/gwDeckSearch.js`(features.md §10.2).

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


## 15. Ops에 아직 없는 유용한 후보 (구현 X, 참고)

- 공용 공략 감독(최근 N / 삭제)
- 추천수 상위·이상치
- 허브 인원/최근활동 정렬 강화
- 입장 배너 저장 전 미리보기
---

