# 팀 빌더 · 효과 엔진 지도 — AGENTS.md §10.10

> AGENTS.md에서 분리한 상세 문서 (원문 그대로, 절 번호 § 동일). 공통 금지 · 데이터 보호는 항상 루트 `AGENTS.md` §2.1이 우선.
> 팀 빌더 · 효과 사전 · 도감 효과 요약 · 전력 비교를 고칠 때 열 것. 상세 규칙 전체는 features.md §10.10.

### 10.10 요약 — 팀 빌더 · 효과 엔진 (자주 고치는 곳)

상세·규칙 전체는 [docs/agents/features.md](docs/agents/features.md) §10.10. 패치 전 이 표로 위치부터 찾을 것.

| 바꾸고 싶은 것 | 위치 |
|------|------|
| 스킬 문장 읽기(대상·턴·확률·수치·조건) · 강화/초월 반영 | `src/lib/teamBuilderAnalysis.js` — `collectHeroEntries` · `makeEntries` · `upgradeSegments` · `applyUpgradeRules` · `embeddedEffects` · `skillEffects` |
| 효과 이름 표시 · 버프/디버프 분류 · 이름 붙은 버프(여포 용이무모 = 물리 공격력) | 같은 파일 `effectLabel`(▲▼ 방향만) · **`listLabel`(화면 이름 — 모든 화면 공용)** · **`fmtFxValue`(수치 뱃지 — 모든 화면 공용)** · `classify` · `NAMED_STAT_BUFFS` |
| 효과로 찾기 칩 묶기(「방어력 감소(중첩)」 · 「…감소 효과」 → 한 칩) | `finderKey` — 색인 `buildHeroEffectIndex` 와 목록 이름 클릭 `findCard` 둘 다 이것으로 칩 id |
| 공격 스킬의 「치명타 · 약점 공격 확률 증가 100%」(지속 턴 없음) | `makeEntries` `ownHit` → 적 디버프 아님, **자신 버프 · 「이 스킬 공격 때」**(원래 대상 글은 남겨 노림 문장 `targetingInsights`에 계속 씀) |
| 패시브 탭 목록 · 겹침(높은 수치 하나만) · 자기 버프 | `effectCards`(`selfOnly`) · `findOverlaps`(팀 버프끼리만, `teamGroups`) · `scopeCovers` · `sharedRecipients`(일부 겹침 → `overlapNote`) · `selfClash` |
| 스킬 · 발동 탭 목록 | `skillCards`(카드) · `skillCardText`(표시 이름 다듬기) · 화면 `SkillEffectList` |
| 목록 상자 묶기 · 칸 숫자 · 버프/디버프 칸 표(패시브 · 액티브 · 합계) | `src/pages/teamBuilder/fxGroups.js` — `groupEffectCards` · `groupSkillCards` · `fxBoxCount` · `fxTotals` · `fxLedger`(칸 메인 표 `FxLedger` · 맨 아래 「자세히 보기」 `FxFold` 안에 목록) |
| 덱 칸(공용 덱 배치 카드 · 진형 · 펫, 길드전 5칸 중 3명) | 화면 `TeamBuilderParts.jsx` `DeckSide`(= 공용 `InGameDeckCard`, `allowNoPet`) · `DeckVs`, 저장 `TeamBuilderPage.jsx` `loadStore`(`decks[mode].formation` · `.pet`), 엔진 `formationRows` · `petEntries` · `petCards`(진형은 전력 비교에만 — 받는 버프 표에는 안 넣음), 데이터 `data/formations.js` · `data/pets.js` |
| 전력 비교 탭(VS 대결 바 `.tb-clash` 가운데 액체 구슬) — 「Σ 최종 합계」 판 하나 · 같은 영웅끼리 · 두 팀 같음 | 엔진 `duelSummary`(`DUEL_STATS` 능력치 목록 · `DUEL_FINALS` 합친 줄 · `duelNets` 영웅별 「받는 버프 − 상대 디버프」 · `duelSideIcons`) · 화면 **`src/pages/teamBuilder/DuelBoard.jsx`**(`DuelBoard` · `DuelRow` · `DuelNum` 큰 숫자 + 영웅 점 `duelHeadline` · `DuelSide` 펼침 효과 기준 · `duelSlots` 두 팀 줄 맞춤 · `duelShowTotals` 영웅별 합계) · 스타일 `teamBuilder.css` `.tb-duel-*`. **화면 규칙 정본 = 시안 `dev/duel-mock.html`**(밍봉 2026-11-11 회의 확정 — 바꿀 땐 시안부터, features.md §10.10 「전력 비교 화면」) |
| 칸 강조색(우리 팀이 받는 버프 파랑 · 상대가 받는 버프 빨강 · 디버프 칸 둘 보라 + 제목 옆 뱃지 글자, 칸 안 합계 · 「자세히 보기」 뱃지도 칸 색) · 상대 덱 목록 대상 글 뒤집기 | `TeamBuilderParts.jsx` `Block` `tone` · `tag` prop · `flipScope`(`perspective="enemy"`) — 색 변수 `teamBuilder.css` `.tb-page`(`--tb-gain` · `--tb-hurt` · `--tb-rival`), 상세 features.md §10.10 「분석 칸 색」 |
| PvE 전용 줄(탑 전용 · 보스 대상) | `makeEntries` `allowTower` — 탑 줄은 `tower: true`(「탑 전용」 표시), 「보스」 줄은 `SKIP_RE`(결투장 · 길드전은 건너뜀) / `SKIP_PVE_RE`(PvE는 읽음) |
| 편성 조건 문구(「스킬2 생명력 전환 발동 안 함」) | `formationRequirements().effectText` · `heroSummary().conditions[].effectText` — 둘 다 `skillEffectText` 공용 |
| 덱 세팅 체크 항목 | `src/pages/teamBuilder/TeamBuilderPage.jsx` `buildChecks` |
| 상대 덱에서 조심할 것 | 같은 파일 `buildThreats` (노림 문장 `targetingSentence` · 쿨타임 증가 · 물리/마법 면역·감쇄 `damageGuardLines` · 영웅별 팁) |
| 영웅·효과별 직접 쓴 문구 | `src/data/teamBuilderTips.js` — `SIGNATURE_TIPS`(효과 이름) · `HERO_TIPS`(영웅, `enemy`는 객체 또는 배열) · `BUFF_NOTES`(버프 카드 아래 참고 문구) |
| 화면 조각(덱 바 · 영웅 선택 창 · 효과 요약 칸 · 버프/디버프 목록 · 주의 카드) | `src/pages/teamBuilder/TeamBuilderParts.jsx` — 파일 안 `/* ───── 이름 ───── */` 구역 순서: 공통(FxIcon · GiverFace · MiniHero) → 모드 선택 → 덱 바 · VS → 영웅 선택 드롭다운 → 블록 → 덱 세팅 체크 → 전설 장신구 → 효과 목록 → 버프 · 디버프 칸 표 → 상대 덱 주의. **전력 비교 판은 따로 `DuelBoard.jsx`** |
| 스타일(모바일은 파일 끝 `@media` 블록) | `src/styles/teamBuilder.css` |
| 도감 「효과 요약」 탭 | `src/components/HeroEffectSummary.jsx` + `src/styles/heroEffectSummary.css` (엔진 `heroSummary`) |
| 엔진이 스킬 문장을 어떻게 읽었는지 확인 | 로컬 전용 점검표 `http://127.0.0.1:5173/dev/tb-audit.html` (`dev/`, 배포본 미포함) |

현재 화면 동작(밍봉 확정 — 바꾸지 말 것):
- 영웅 효과 요약 칸 · 「필요한 효과로 찾기」는 **기본 닫힘**, 버튼을 눌러야 열림. 영웅 선택 창을 닫으면 찾기도 다시 닫힘.
- 찾기 그룹 탭 색: 팀 버프 파랑 · 적 디버프 빨강 · 역할 노랑.
- 버프/디버프 목록: 효과 이름은 **증가 · 감소까지 붙인 원래 이름**(「방어력 감소」 — 「방어력」만 쓰지 말 것, 밍봉 지시) · **칸 안 가운데 정렬**(칸 너비 = 목록에서 가장 긴 이름, `--fxl-name`) + 오른쪽 수치 뱃지(버프 **초록** · 디버프 **보라**, 높이 26px, 이름에 증가 · 감소가 있으면 부호 없이 「29%」).
- 같은 효과 겹침: 높은 쪽 대상이 낮은 쪽 대상을 **전부 덮을 때만** 「○○는 반영 안 돼요」. 일부만 겹치면 「헤브니아 대상(…)과 겹치는 영웅은 헤브니아 +31%, 나머지는 선란 +25%가 적용돼요」(목록 · 덱 세팅 체크 같은 문장).
- **화면 간 일관성(밍봉 지시):** 팀 빌더 목록 · 효과로 찾기 칩 · 효과 사전 · 도감 「효과 요약」은 이름(`listLabel`) · 수치 뱃지(`fmtFxValue`, 버프 초록 · 디버프 보라) · 스킬 효과 규칙(`isSkillCastEntry` = `skillCards`)을 **같은 함수로만** 만든다. 도감 「스킬 · 발동으로 거는 버프 / 디버프」 = `heroSummary().skillFx` = `skillCards` 결과, 스킬 하나에 상자 하나. 새 화면을 만들어도 이 셋을 다시 구현하지 말 것.
- 칸 · 탭 숫자 = **팀 목록에 보이는 상자 수**(자기 버프는 안 셈). 스킬 · 발동은 **영웅 · 스킬 단위 상자 하나**(대상이 줄마다 다르면 줄에 「→ 대상」).
- 「자기 자신만 받는 버프」 알약은 **한 줄 고정** — 좁으면 이름 숨기고 얼굴 + 숫자.
- 수치는 항상 **스킬 강화 + 초월 기준**.
- 모드 4개: 결투장 · 길드전 · **PvE**(5인 · 아군만 · 탑 전용 · 보스 대상 효과 포함, 상대 덱 없음 — 상단 설명은 「PvE는 아군만 봐요.」만, 탑 전용 문구 넣지 말 것) · 효과 사전.
- 버프 · 디버프 칸 안 [패시브 | 스킬 · 발동] 탭(`FxTabs`, 기본 패시브). 스킬 · 발동 = `skillCards`(기본 공격 · 스킬 · 각성기 · 조건 발동, 겹침 판정 없음, 지속 · 중첩 · 조건 표시).
- 「자기 자신만 받는 버프 · 패시브」(`isSelfPassiveEntry`)는 수치 버프만이 아니라 **반격 · 협공 같은 상시 메커니즘과 고유 기믹(고통 감내 · 무도의 경지 …)까지 전부** — 반격 · 협공은 뱃지에 발동 확률(`fxValue`). 아군 쪽 조건부 메커니즘(도발 · 반격 · 협공 · 관통 · 쿨타임 초기화, `MECHANIC_BUFFS`)은 스킬 · 발동 탭. 적에게 거는 상태 이상(행동 제어 기절 · 감전 · 공포 …, 지속 피해 극독 · 중독 · 화상 …, `STATUS_CATEGORIES`)과 버프 해제 · 버프 차단 · 턴제 버프 감소, 아군 디버프 해제도 스킬 · 발동 탭에 이름 · 턴 · 확률로 표시 + 효과로 찾기 칩. 고유 기믹(special)은 조건부 = 스킬 · 발동 탭(시노부 독 축적), 상시 = 패시브 탭(`isPassiveSpecialEntry`, 쥬다스 칠흑의 낙인) — 찾기 칩은 안 만듦. 적에게 거는 공격 성질(관통 · 방어 무시 · 처형 · 연속 발동 · 생명력 전환)만 「역할」에서. 「utility라서 목록에서 빠짐」을 메커니즘이니 괜찮다고 넘기지 말 것(밍봉 지적 — 쥬리 협공 · 제이브 반격 누락).
- 화면 이름은 **「액티브 · 발동」**(밍봉 지시 — 탭 · 도감 소제목 · 빈 목록 문구). 이 문서 · 코드 주석의 「스킬 · 발동」 탭 = 같은 것.
- 「자신」 대상 효과는 **팀 목록 · 팀 겹침 판정에 절대 안 넣음**. 버프 칸 안 아래 「자기 자신만 받는 버프」(`SelfBuffSection`) 영웅 알약 → 눌러야 펼침. 따로 칸 만들지 말 것(밍봉 지시).
- `/team` 모드 카드: 평소 아이콘 + 이름만, 마우스 올리면 아이콘이 커지며 흐려지고 이름 · 「5 vs 5」 · 설명 표시(CTA 버튼 없음). 폰·터치는 처음부터 글자 표시. 폰(≤760)은 **2×2 작은 카드**(아이콘 48px · 설명 두 줄)로 한 화면에 — 세로로 길게 쌓지 말 것(밍봉 지시). 공용 허브 · 도구 · 도감 상단 메뉴는 같은 디자인의 작은 판 `HoverGateCard`(`styles/hoverGate.css`, 상세 features.md §10.5) — 아이콘 원본 해상도가 낮아 카드를 낮게 · 아이콘을 작게 둔 것은 밍봉 지시(크게 키우지 말 것).

**새 영웅 추가 시 팀 빌더 체크** (엔진은 스킬 문장을 규칙으로 읽어서 영웅별 코드는 원래 필요 없음 — 아래만 확인):
1. 도감 데이터(§13)만 넣으면 팀 빌더 · 효과 사전 · 도감 효과 요약에 자동 반영. 수치는 스킬 `tooltips`(강화 · 초월 포함)에서 읽으므로 tooltips가 비면 수치 없이 이름만 나옴.
2. 처음 보는 효과 이름: `classify`가 이름의 키워드(증가 · 감소 · 면역 · 보호막 …)로 분류, 키워드가 없으면 `utility`로 **버프/디버프 목록에서 빠짐**(관통 · 처형 · 연속 발동 같은 메커니즘용). 새 버프가 목록에 안 보이면 여기 확인.
3. 이름만 있는 버프(여포 「용이무모」처럼 실제 능력치를 이름에 안 쓰는 것) → `NAMED_STAT_BUFFS`에 「이름 → 능력치」 추가. 툴팁에 「단, ○○이 N% 감소합니다」 부작용이 있으면 전력 비교는 `namedDrawbacks`가 자동으로 읽음(문장 모양이 다르면 정규식 확인).
4. 상대 덱 경고가 필요한 고유 기믹 → `teamBuilderTips.js` `SIGNATURE_TIPS` / `HERO_TIPS`.
4-1. **전력 비교 줄:** 새 능력치 효과 이름(「○○ 증가 · 감소」, 예: 「기절 효과 적용 확률 증가」)은 `DUEL_STATS`에 줄을 넣어야 전력 비교에 나옴(정규식에 안 걸리면 조용히 빠짐 — 2026-11-11 겔리두스 · 로지 「효과 적용 확률」이 빠졌던 것). 확인: 영웅 · 펫 패시브 entry 중 수치가 있고 `DUEL_STATS`에 안 걸리는 이름을 뽑아 볼 것(features.md §10.10 「전력 비교 계산」의 「안 넣는 것」 목록과 비교). 게임에 아이콘이 없는 이름은 `effectIcons.js` `ALIASES`.
5. `npm run check:content`로 새 영웅 줄이 다 읽혔는지 확인 — 전체 절차는 **§13.0 신규 영웅 · 신규 효과 런북**.

검증 방법(에이전트):
- 엔진 · 데이터 변경 후: **`npm run check:content`**(`scripts/check-content.mjs` — 영웅 전체 + 펫 + 무작위 덱 400판으로 `analyzeTeam` · `effectCards`(+`selfOnly`) · `skillCards` · `formationRequirements` · `heroSummary` · `duelSummary` 오류 0, 스킬 문장 못 읽음 · 아이콘 없음 · utility · 전력 비교 빠짐을 기준선과 비교). 임시 번들 스크립트를 새로 짜지 말 것. 엔진 리팩터링이면 바꾸기 전 파일을 `%TEMP%`에 복사해 두고 같은 무작위 덱으로 `duelSummary` 등 결과 JSON이 같은지 비교(2026-11-11 정리 때 3,000판 동일 확인 — 엔진은 import가 없는 순수 파일이라 복사본끼리 바로 비교 가능).
- 개발 서버(Vite)가 저장 순간 파일을 **빈 내용으로 캐시**하는 일이 있음 → 「일시적인 오류」 + 모듈 export 없음이면, 디스크 파일이 정상인지 보고 파일 수정 시각만 갱신(`(Get-Item 파일).LastWriteTime = Get-Date`) 후 새로고침. 배포 빌드는 디스크를 읽어서 무관.
- 확인용 탭은 `browser_navigate`에 `newTab: true`로 따로 열 것(`viewId` 없이 열면 밍봉 탭을 가로챔).
- 브라우저 확인은 **밍봉 탭에서 클릭 금지**(읽기·스크린샷만). 팀 빌더는 store 변경마다 localStorage 전체를 저장해서, 오래된 탭에서 버튼을 누르면 밍봉 덱을 덮어씀. 확인용 탭에는 데모 DOM을 넣어 보고 다른 주소로 이동(탭 닫기 도구는 다른 탭을 닫은 적 있음 → 쓰지 말 것).

---

