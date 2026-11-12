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

이 파일은 **모든 요청에 자동으로 붙는 핵심**만 둔다(길면 매 요청 토큰이 그만큼 듦 — 상세는 아래 문서로, 새 내용도 되도록 아래 문서에 쓸 것). 이 파일에 없는 §번호는 해당 문서에서 찾을 것.

| 문서 | 내용 (§) | 언제 |
|------|----------|------|
| [docs/agents/architecture.md](docs/agents/architecture.md) | §6–9 인증 · 역할 · 연합 · Firestore 경로/rules 표 · Storage · Functions, §11–12 lib · 컴포넌트 지도 · 정렬 적용 표, §15 | rules · Functions · 허브 저장 경로 · Ops |
| [docs/agents/team-builder.md](docs/agents/team-builder.md) | §10.10 팀 빌더 · 효과 엔진 「어디를 고칠지」 표 · 밍봉 확정 화면 규칙 · 새 영웅 체크 · 검증 | 팀 빌더 · 효과 사전 · 도감 효과 요약 |
| [docs/agents/features.md](docs/agents/features.md) | §10 기능별 동작 (CMS·길드전·세팅 확인·시즌 카드·테마·쿠폰·팀 빌더 상세) | 해당 기능 패치 |
| [docs/agents/encyclopedia.md](docs/agents/encyclopedia.md) | §13.0 신규 영웅 런북 · §13 도감 (영웅·펫·장비·장신구) | 영웅·장비 추가/변경 |
| [docs/agents/ui-layout.md](docs/agents/ui-layout.md) | §12.2–12.5 모바일 CSS·덱 수정 모달 | 모바일·덱 수정 모달 CSS |
| [docs/agents/pitfalls.md](docs/agents/pitfalls.md) | §14.1 CSS 순서 · 큰 정리 · 브라우저 확인 함정 | CSS 이동 · 리팩터링 · 브라우저 확인 |
| [docs/agents/preview-hub.md](docs/agents/preview-hub.md) | §4.1 미리보기 허브 | 「미리보기 허브 켜줘」·로컬 테스트 |
| [docs/agents/patch-history.md](docs/agents/patch-history.md) | §17 패치 내역 | 배포 시 맨 위에 추가 |
| [docs/content-season-schedule.md](docs/content-season-schedule.md) | 시즌 카드 정본 | 시즌 카드 패치 전 필수 |

| 자동화 | 위치 | 역할 |
|--------|------|------|
| `npm run add:hero -- 이름` | `scripts/add-hero.mjs` | 신규 영웅 · 각성 · 리메이크 — asset 폴더 → 데이터 · 이미지 · 메타 한 번에 (§13) |
| `npm run check:content` | `scripts/check-content.mjs` + 기준선 | 영웅 · 효과 점검, 새로 생긴 문제만 표시 (§13.0) |
| `node scripts/sync-effect-icons.cjs` | 7katlas 효과 아이콘 | 버전별 캐시 — 바뀐 영웅만 받음 |
| 스킬 `senalink-deploy` · `senalink-preview-hub` | `.cursor/skills/` | 배포 순서 · 로컬 연습장 |
| 훅 `guard-shell` | `.cursor/hooks/guard-shell.mjs` | senalink 외 배포 · 일괄 삭제 · 강제 푸시 · 시크릿 커밋 차단 |
| 규칙 `firebase-safety` | `.cursor/rules/firebase-safety.mdc` | rules·functions·저장 경로 파일을 열면 §2.1 자동 첨부 |

**토큰 아끼기:** `scraped_heroes.json`(500KB) · `features.md` · `patch-history.md` · `index.css`는 통째로 읽지 말고 Grep · 줄 범위로. 영웅 데이터 변경은 `add:hero`, 점검은 `check:content -- --hero 이름`.

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
| 메타 덱 공유 제출 | `metaDeckSubmissions/{uid}` (제출자 본인 · 슈퍼만) |
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
├── asset/                    ← 원본 게임 에셋 (영웅/펫/장비 JSON·PNG) — **별도 비공개 저장소 `senalink-assets`** (안에 `.git` 따로, 사이트 저장소는 `.gitignore`로 무시). 폴더 안내 `asset/README.md`, 사이트 아이콘 ↔ 원본 대응표 `asset/UI_ICON_MAP.md`
├── scripts/                  ← import_gear_assets.py, fetch_hero_cards.py, seed-emulator-admin.mjs
│   └── legacy/               ← 옛 루트 스크래퍼 보관 (README 참고, 앱 미사용)
├── src/
│   ├── main.jsx              ← Provider 트리
│   ├── App.jsx               ← 페이지 스위치 + GNB/푸터/배너
│   ├── index.css             ← 거의 모든 스타일
│   ├── styles/               ← settingOverview.css(세팅 확인 창) · deckEditScrollModal.css(PC 덱 수정) · teamBuilder · hoverGate · themeSolidDark … — `main.jsx` import 순서 = 우선순위 (§14.1)
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
npm run seed:preview     # 에뮬레이터 허브에 테스트 공략 (길드전 공격·방어·대체 덱, 공성 4진형, 메타 덱). 빈 칸만 · `-- --force`는 에뮬레이터 안에서 덮어씀. 127.0.0.1:8080 고정 = 라이브 무관
npm run add:hero -- 이름 # 신규 영웅 · 각성 · 리메이크를 asset 폴더에서 한 번에 (§13)
npm run check:content # 신규 영웅 · 효과 점검(§13.0) — 데이터 · 엔진 바꾼 뒤 항상
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
| `/team`, `/team/arena`, `/team/guildwar`, `/team/pve`, `/team/effects` | `team_builder` | lazy `TeamBuilderPage` (§10.10, GNB 메인↔길드 허브 사이 · pve = 아군만 · effects = 효과 사전) |
| `/hub`, `/guild` | `guild_room` | `HubPage` → `GuildLounge` |
| `/community` | `community` | lazy `CommunityPage` |
| `/tools`, `/tools/*` | `tools` | lazy `ToolsPage` |
| `/dex`, `/encyclopedia` | `encyclopedia` | lazy `EncyclopediaPage` → `DbHub` |
| `/ops` | `ops` | lazy `OpsPage` |

상시(ops 제외 일부): `GlobalNavBar`, `SiteFooter`, `SiteEntranceBanner`, `NicknameGate`, `ToastContainer`.  
오버레이 뒤로가기: `src/utils/overlayHistory.js`.

---


## 6–9. 인증 · Firestore · Storage · Functions → [docs/agents/architecture.md](docs/agents/architecture.md)

Provider 순서(`main.jsx`): **SuperAdmin → UserProfile → Lounge → App**. 슈퍼관리자 = `admins/{uid}.role == 'super'`(앱에서 생성 불가). 허브 역할 master/admin/member, 가입은 Callable `joinHub`만, 연합(`7A-` 코드) 쓰기는 전부 Callable. `users.hubId`는 `members/{uid}` 소속 확인 없이 지우지 말 것(복구 Callable `resolveMyHub`). 경로 상수 `src/config/firestorePaths.js`. **rules · Functions · 허브 저장 경로를 만지기 전에 위 문서의 읽기/쓰기 표 · Functions 목록을 열 것.**

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
- 10.10 팀 빌더 (`/team`) — 덱 효과 분석은 `lib/teamBuilderAnalysis.js` 순수 함수, 팁은 `data/teamBuilderTips.js`. 덱 저장은 localStorage만 (Firestore 무접근). 빠른 지도는 team-builder.md


### 10.10 팀 빌더 · 효과 엔진 → [docs/agents/team-builder.md](docs/agents/team-builder.md)

엔진 `src/lib/teamBuilderAnalysis.js`(순수 함수 · Firebase 무관), 화면 `src/pages/teamBuilder/`, 덱 저장은 localStorage만. 「어디를 고칠지」 표 · 밍봉 확정 화면 규칙(바꾸지 말 것) · 검증 방법은 그 문서. 편성 조건(「공격형 3명 이상 편성 시」)을 못 채운 효과는 `analyzeTeam`이 `entries`에서 빼고 `allEntries`에만 둠(표 · 전력 비교 미반영, 덱 세팅 체크에만 「미충족」). 엔진 · 데이터를 바꾸면 `npm run check:content`. 브라우저 확인은 새 탭(`newTab: true`)에서만, **밍봉 탭 클릭 금지**(팀 빌더가 localStorage 덱을 덮어씀).

---

## 11–12. 코드 지도 → [docs/agents/architecture.md](docs/agents/architecture.md)

`src/lib/`(Firebase · 도메인 헬퍼) · `src/components/` · `src/pages/` 지도는 위 문서. 덱/장비 UI 공통: `InGameDeckCard`(세팅 확인 · 진형 선택 창), `DeckEditHeader`(모든 덱 편성 창 상단), `HeroGearPanel`, `HeroGridPicker`.

### 12.1 영웅 목록 정렬 (전역)

각성 → 스페셜(`HERO_FACTION_ORDER.special` 소속순, 첫 줄 `(구)세븐나이츠`) → 준스페셜(아스가르드 → 아이샤) → 일반 → 기타. 단일 소스 `src/data/heroes.js` `sortHeroesForList` / `compareHeroesForList`(`heroes` export는 이미 정렬). 새 영웅 목록은 필터 후 재정렬, 수동 정렬 금지. 화면별 적용 표는 architecture.md §12.1.

### 12.2–12.5 모바일 CSS · 아이콘 · 덱 수정 모달 → [docs/agents/ui-layout.md](docs/agents/ui-layout.md)

모바일 CSS·덱 수정 모달을 만지기 전에 반드시 열 것. 핵심만:

- 「모바일만」 요청 → 그 화면의 브레이크포인트 블록 안에서만 수정. PC `min-width` 블록·`deckEditScrollModal.css`에 모바일 규칙 금지.
- 덱 수정 모달: PC(≥981) = `deckEditScrollModal.css`/`.js`만, 모바일(≤980) = `index.css` 블록만. 본문 `.deck-edit-scroll-body`만 스크롤, 내부 스크롤은 영웅 목록·PvE `.skill-timeline-scroller`(높이 px 고정)만.
- 세팅 공유 PNG 워밍은 공유 클릭 시에만. 한 번에 하나씩 고치고 검증 후 다음.
- **덱 편성 창 상단(제목 · 덱 티어 · 세팅 · 덱 유형 · 추천도 · 기타 디테일 · 속공 수치)은 `src/components/DeckEditHeader.jsx` 하나만** — 모든 편성 창 공통 기준, 모양은 index.css 「덱 편성 창 상단 (DeckEditHeader)」 한 곳. 창마다 인라인으로 다시 만들지 말 것(ui-layout.md).

---

## 13. 도감 업데이트 → [docs/agents/encyclopedia.md](docs/agents/encyclopedia.md) (§13.0 런북)

신규 영웅 · 각성 · 스킬 리메이크 (밍봉이 `asset/영웅 목록/…/이름(역할)(각성?)` 폴더를 채운 뒤):
1. `npm run add:hero -- 이름` — asset `skills/*.json` → `src/data/scraped_heroes.json` + 초상화 · 카드 · 스킬 · 전용장비 이미지 + 메타 등록(`--dry` = 바뀔 내용만). 기존 영웅은 id · 소속 · 아이콘 경로 유지하고 스킬 내용만 교체. **큰 JSON을 직접 열어 고치지 말 것.**
2. 새 효과가 있으면 `node scripts/sync-effect-icons.cjs` → 못 찾는 이름은 `lib/effectIcons.js` `ALIASES`.
3. `npm run check:content` → 「새로 생김」만 고침(항목별 고칠 곳 표는 encyclopedia.md §13.0), 원래 그런 것이면 `-- --update`. 문장별 판정은 `-- --hero 이름`.
4. 새 특수 효과는 도감 시스템 카드 `src/data/systemRules.js` `effects_registry`에도 추가. 화면 확인은 미리보기 허브 `/dex` · `/team`.

툴팁은 영웅 단위 `tooltips` 하나(스킬에 따로 있으면 그것 — `heroes.js`가 스킬마다 연결). 스킬 텍스트 정본 = 7katlas. 장신구 기본값에 `accessory2` 넣지 말 것. UI 아이콘 그림을 바꿀 땐 새 파일 이름으로(캐시).

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
15. 팀 빌더 · 효과 엔진 · 스킬 데이터 패치 시 `npm run check:content`(§13.0) + §10.10 요약의 검증 방법(점검표 · 밍봉 탭 클릭 금지)대로 확인. 신규 영웅 · 효과는 §13.0 런북 순서대로.
16. 커밋 시 경로를 하나씩 지정(`git add .` 금지). 커밋하지 않는 것: `asset/`(원본 에셋 — 사이트 저장소에선 무시됨. 에셋을 추가 · 수정했으면 **`asset/` 안에서** 따로 `git add -A` → `git commit` → `git push` = senalink-assets 백업) · `scripts/tmp_*` · `tmp_missing_gear.json` · `scripts/sync_exclusive_gear_ui_assets.py` · 줄바꿈만 바뀐 파일(`ExclusiveGearPicker.jsx` · `exclusiveGearSlots.js` · `heroSearch.js` · `unsavedGuard.js` — `git diff -w`가 비면 제외) · 안 쓰는 `public/images/ui/tb-tab2-*.png` · `tb-guildwar.png`(성 아이콘 `tb-guildwar-castle.png`로 교체됨). `dev/`(로컬 점검표)는 커밋 O · 배포본 X.


→ CSS 순서 · 큰 정리(파일 나누기) · 브라우저 확인 함정은 [docs/agents/pitfalls.md](docs/agents/pitfalls.md) §14.1. ESLint 오류 수(2026-11-08 기준선 77)는 늘리지 말 것.

---

## 16. 연락 · 브랜치 관례

- 운영 문의 메일: `src/config/siteContact.js` → `OPERATOR_EMAIL`
- 최근 릴리즈 브랜치 예: `release/2026-08-20` (작업 전 `git status` / remote 확인)
- 최근 호스팅 버전대: **v2026.11.12.230** (푸터 `APP_VERSION` 확인)
- 저장소 2개: 사이트 `appeal7712/senalink`(이 폴더) · 원본 에셋 `appeal7712/senalink-assets`(비공개, `asset/` 폴더 = 그 저장소, 브랜치 `main`). 새 컴퓨터 복구 = 사이트 clone → 그 안에 `git clone …/senalink-assets.git asset` → `.env.local`(Firebase 웹 설정 6줄, 콘솔 → 프로젝트 설정에서 복사) → `npm install` → `npx firebase login`.
- 소유자: 밍봉(디자이너) — 배포·다른 Firebase 프로젝트 접근은 명시 요청 시에만

---

*문서 갱신 시: 구조·규칙·도감 경로·모바일 UI 제약이 바뀌면 이 파일도 같이 고친다.*

---

## 17. 패치 내역 → [docs/agents/patch-history.md](docs/agents/patch-history.md)

배포할 때마다 그 파일 **맨 위**에 새 항목 추가 (날짜 · `APP_VERSION` · 바뀐 점 · 배포 범위 Hosting/rules/functions).
