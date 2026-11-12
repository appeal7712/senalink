# 도감 업데이트 (영웅 · 펫 · 장비 · 전용장비) — AGENTS.md §13

> AGENTS.md에서 분리한 상세 문서 (원문 그대로). 절 번호(§)는 AGENTS.md와 동일하게 유지한다.
> 공통 금지·데이터 보호 규칙은 항상 루트 `AGENTS.md` §2.1이 우선.

### 13.0 신규 영웅 · 신규 효과 런북 (이 순서대로 — 도감 · 효과 사전 · 팀 빌더가 한 번에 맞춰짐)

도감 · 효과 사전 · 도감 「효과 요약」 · 팀 빌더(버프 목록 · 액티브 · 전력 비교 · 상대 덱 주의)는 **전부 같은 데이터(`scraped_heroes.json`)를 같은 엔진(`lib/teamBuilderAnalysis.js`)으로 읽음** → 영웅마다 화면 코드를 따로 쓰지 않음. 데이터만 맞게 넣고 아래 점검만 통과하면 끝.

1. **데이터 넣기** — **`npm run add:hero -- 이름`**(asset 폴더 → 아래 데이터 · 이미지 · 메타 전부, `--dry` = 미리보기, 다시 돌려도 같은 결과). 손으로 할 때 대상: 영웅 `src/data/scraped_heroes.json`(스킬 문장 정본 7katlas, `id` · `group` · `category` · `role` · `attackType` · `isAwakened` 필수) + `public/images/{id}/`(portrait · skills 아이콘) + 전용장비 아이콘(`exclusiveGearMeta.generated.json`), 펫은 `src/data/pets.js`. 상세 절차 encyclopedia.md §13. 새 스페셜 소속이면 `heroes.js` `HERO_FACTION_ORDER`만(정렬은 자동, §12.1).
2. **효과 아이콘** — `node scripts/sync-effect-icons.cjs`(7katlas에서 다시 받음).
3. **점검 한 번** — `npm run check:content`(라이브 무관, 15초). 기준선(`scripts/check-content.baseline.json`)에 없던 문제만 「새로 생김」으로 나옴 → 항목별로 고칠 곳:

   | 새로 생김 | 고칠 곳 |
   |------|------|
   | 영웅 데이터(초상화 · 역할 · 공격 타입 · 소속 · 전용장비 · 스킬 아이콘) | 데이터 파일 · `public/images/{id}/` (§13 · encyclopedia.md) |
   | 엔진 오류 | `teamBuilderAnalysis.js` — 오류 영웅 이름이 같이 나옴 |
   | 스킬 문장 못 읽음 | `npm run check:content -- --hero 이름`으로 문장별 확인(점검표 `/dev/tb-audit.html`과 같은 판정) → 엔진 문장 규칙(`makeEntries` · `upgradeSegments` · `applyUpgradeRules`) |
   | 효과 아이콘 없음 | `lib/effectIcons.js` `ALIASES`에 「새 이름 → 있는 아이콘 이름」 |
   | 분류 안 됨(버프/디버프 목록에서 빠짐) | 메커니즘(관통 · 반격 …)이면 정상 → `--update`. 능력치 버프면 `classify` 키워드 또는 이름만 있는 버프 `NAMED_STAT_BUFFS` |
   | 전력 비교 빠짐 | 새 능력치 이름이면 `DUEL_STATS`(+ 필요하면 `DUEL_FINALS`)에 줄 추가. 비례 · 고유 버프처럼 안 넣는 것이면 `--update` (features.md §10.10 「안 넣는 것」) |

   다 고쳤거나 「원래 그런 것」으로 확인했으면 `npm run check:content -- --update`로 기준선 갱신(기준선 파일도 커밋).
4. **영웅 팁(선택)** — 상대 덱 경고가 필요한 고유 기믹은 `src/data/teamBuilderTips.js` `SIGNATURE_TIPS` / `HERO_TIPS`.
5. **화면 확인** — 미리보기 허브(§4.1)에서 `/dex` 새 영웅(스킬 · 효과 요약), `/team/effects` 효과 사전 칩, `/team` 덱에 넣고 버프 목록 · 전력 비교. 덱 편성 피커 정렬은 §12.1.
6. 배포 — skill `senalink-deploy`.

- 앱이 import하는 파일만 UI에 반영: 영웅 `src/data/scraped_heroes.json`(+`public/images/{id}/`), 펫 `src/data/pets.js`, 장비 `equipments.js` + `gearDex`. `asset/`은 원본·재생성 소스.
- 신규 영웅이면 **전용장비 아이콘도 같이** (`exclusiveGearMeta.generated.json`).
- 목록 정렬 수동 금지 — §12.1 `sortHeroesForList`.
- 장신구 세공: `accessory2`는 optional. **기본값에 `accessory2`를 넣지 말 것**(구 문서 해석이 깨짐). 해석·표시는 `lib/accessoryCraft.js`.
- **버프 · 디버프 · 특수 효과 아이콘:** 원본 `asset/특수효과, 버프, 디버프 아이콘/`(버프 · 디버프 · 특수효과 한글 이름 + 원본 ID + `목록.md`), 사이트용 `public/images/effects/{ID}.webp`, 이름 표 `src/data/effectIcons.json`, 찾기 `lib/effectIcons.js` `effectIconUrl(name)`(띄어쓰기 무시 · 「(중첩)」 · 별명 `ALIASES`). 쓰는 곳: 팀 빌더 표 · 특수 효과 알약 · 목록(`FxIcon`), 도감 시스템 「상태이상 & 특수 효과」 카드. 새 영웅 · 새 효과가 나오면 `node scripts/sync-effect-icons.cjs`(7katlas 도감에서 다시 받음, 라이브 무관) → 아이콘 못 찾는 이름은 `ALIASES`에 추가.
- **스킬 텍스트 정본 = [7katlas](https://7katlas.com/codex.html)** (2026-11 전 영웅 동기화, §13.1.2). 각성 영웅은 강화 수치가 기본 수치에 합쳐져 있어 「스킬 강화」 줄이 비는 게 정상. 스킬 문장을 바꾸면 팀 빌더 분석도 같이 바뀌므로 점검표(`/dev/tb-audit.html`)로 확인.
- 스킬 · UI 아이콘 교체: 이미지 먼저 넣고 코드 참조. UI 아이콘은 `src/data/uiIcons.js` 키(예: 도감 `dexSkill` · `dexEffectSummary` · 장신구 도감 탭 `dexAccessory` · 장비 부위 필터 `statPhysical` / `statMagic` / `statArmor` — `gearDex.js` `SLOT_META.icon`, 원본 `asset/장비, 장신구/능력치 아이콘/`). 흰 아이콘은 선택된 탭에서 `index.css` 규칙으로 자동 검정(`brightness(0)`)이라 따로 만들 필요 없음. 색 있는 원본을 흰색으로 바꿀 때는 **음영을 살려** 밝기 비율만 유지(밍봉 선호 — 고해상도 음영 아이콘이 크게 보일 때 품질이 좋음). 팀 빌더 모드 아이콘 `tbArena` · `tbGuildwar` · `tbPve`(가면, `tb-pve-mask.png` — 공용 `pve` 아이콘과 별개) · `tbEffects`(책, `tb-effects-book.png`), 도구 준비 중 카드 `toolGacha` · `toolRuby`가 그 예. **UI 아이콘 그림을 바꿀 땐 새 파일 이름으로** (같은 이름 덮어쓰기 → 브라우저 캐시로 밍봉·방문자 화면에 예전 그림이 남음).

---


## 13. 도감 업데이트 유의 사항 (영웅 · 펫 · 장비 · 전용장비)

앱이 **실제로 import하는 파일**만 고치면 UI에 반영된다. `asset/`은 원본·재생성 소스.

**목록 정렬 (전역, 까먹지 말 것):** §12.1  
각성 → 스페셜(`HERO_FACTION_ORDER.special` 소속순) → 준스페셜(아스가르드·아이샤) → 일반 → 기타.  
`heroes.js`의 `sortHeroesForList` / `compareHeroesForList`가 단일 소스. 새 소속이면 `HERO_FACTION_ORDER`에만 추가.

런타임 영웅: `scraped_heroes.json` ← `heroes.js` ← `HeroDB` / 피커 / 세팅·스킬 예약 · 팀 빌더 · 효과 사전(엔진 `lib/teamBuilderAnalysis.js`).

**전체 흐름(도감 → 효과 사전 → 팀 빌더) = AGENTS.md §13.0 런북.** 아래 13.1은 그중 1단계(데이터 넣기) 상세. 데이터를 넣은 뒤 반드시 `npm run check:content`로 새로 생긴 문제(초상화 · 전용장비 · 못 읽은 스킬 문장 · 효과 아이콘 · 전력 비교)를 확인.

### 13.1 영웅 — 신규 캐릭터 추가 (체크리스트)

밍봉이 `asset/영웅 목록/.../이름(역할)(각성?)` 폴더를 채워 둔 뒤:

| 단계 | 할 일 |
|------|--------|
| 1 | **폴더 위치 = 소속.** 예: `스페셜 영웅/경계의 수호자/하연(지원형)(각성)` → `group: "경계의 수호자"`, `category: "special"`, `role`은 괄호, `isAwakened`는 `(각성)` 여부 |
| 2 | 폴더 안: `skills/*.json`(스킬·쿨·effects·tooltips) · 스킬 PNG · `*_초상화.png` · **`이름_전용장비.png`(필수에 가깝게 — 아래 13.1.1)** |
| 3 | `src/data/scraped_heroes.json`에 엔트리 추가/병합. 스킬 `type`/`direction`: Normal→`basic_attack`, Active1→`active`+`upper`, Active2→`active`+`down`, Passive→`passive`, Awakening→`awaken_skill`+`awaken`. `cooldown` null→0. `iconUrl`=`/images/{id}/skills/{스킬명}.png` |
| 4 | `public/images/{id}/portrait.png` + 스킬 PNG 복사. 카드는 `card.webp`(+ `heroCardMeta.json`) — 초상에서 생성해도 됨 (`scripts/fetch_hero_cards.py` 또는 초상→webp) |
| 5 | 새 진영이면 `src/data/heroes.js`의 `HERO_FACTION_ORDER`만 확인. **목록 재정렬 수동 금지** — `heroes` export가 이미 `sortHeroesForList` |
| 6 | **전용장비** — §13.1.1 |
| 7 | `/dex` 도감 · 덱 수정 영웅 목록 · 스킬 예약에 뜨는지 확인. 배포 시 `APP_VERSION` bump |

> `scripts/legacy/rebuild_heroes_json.py` 등은 **옛 폴더 경로**를 가리킬 수 있음. formal 기준으로만 쓰거나 수동 병합.

#### 13.1.2 7katlas 교차 검증 (2026-11 스킬 텍스트 정본 동기화)

[7katlas 도감](https://7katlas.com/codex.html) 영웅 상세 = `COMBINE/hero-data/{id}.js`(영문 구조) + `lang/kr/hero-data/{id}.js`(영문→한국어 표, `{kw|종류|이름|설명}` 표기). 스킬별 `target_groups` · `enhancement` · `tx_bonuses`(T2/T6) · `cooldown` · `skills_s6`(각성 전).
- 2026-11 동기화: 효과 줄 · 스킬 강화 · 2/6초월 · 쿨타임을 공식 기준으로 `scraped_heroes.json`(+ `description` 재생성) **과** `asset/` 원본 JSON에 병합. 규칙 — 표기만 다르면 우리 문장 유지, 공식에 수치(%) · 턴 · [상시]만 빠진 경우 우리 문장 유지, 공식에 대상이 없거나 「N% 확률」 디버프 대상이 자신·아군으로 적힌 경우 우리 대상 유지. **툴팁은 그대로**(우리 툴팁의 「(스킬 강화 시 N%)」를 팀 빌더가 씀).
- **녹스 · 사라 재구성:** 사라 칸에 녹스 스킬이 들어가 있었고(asset `사라.json`도 녹스 복사본), 녹스는 각성 표시인데 각성 전 스킬이었음 → 공식 기준으로 스킬 통째 재작성(녹스 각성: 지옥의 파동 · 파멸의 시선 · 심연의 저주 · 심연의 검풍 — 새 아이콘 3개는 7katlas `Tex_Skill_40049xx.webp` → 128×128 PNG, `public/images/녹스/skills/` + asset). 스킬 순서 저장은 영웅 이름 + 방향(평타/위/아래/각성)이라 이름 변경이 라이브 덱에 영향 없음.
- **툴팁:** 기본 수치가 틀린 4건만 공식 문구로(린 약점 공격 확률 감소 · 여포 용이무모 · 실베스타 축복 · 오목 방어 무시). 프레이야 「신성 (중첩)」 5%는 우리가 맞음(15%는 다른 항목).
- 공식 대상 칸 오류: 「N% 확률」 디버프인데 대상이 「자신」으로 적힌 경우가 있음(노호 2초월, 사라 악마의 유혹 2초월) → 대상 표시 제거해 스킬 대상으로 읽게 함.
- **각성 영웅은 스킬 강화가 기본 수치에 합쳐져 있음**(7katlas 각성 스킬 `enhancement` 비어 있음 — 예: 실베스타 기본 공격 기본 145% = 옛 강화 수치). 그래서 각성 영웅 강화 줄이 비는 것은 정상. 각성 스킬 자체 강화만 있음.
- 추가 정리: 델론즈 변신 · 오공 분신 기본 공격 = 공식 두 번째 기본 공격으로 병합, 쥬피 「연사」 추가(`쥬피_active1_alt`, 저격자세 변형), 벨리카 「어둠의 환영」 → 공식 「어둠의 화염」(내용·아이콘 교체), 이름 맞춤(루시 신비한 춤사위 · 델론즈 사신의 가호 — 아이콘 경로는 기존 파일 유지), 클로에 스킬 위치 바로잡음(청소 시간=스킬1 · 고양이 춤=스킬2 · 고양이의 은혜=패시브).
- 7katlas에만 있는 영웅: 바엘 · 클레오 · 기드온 (이브는 2026-11-12 추가). 초선 「폐월의 미소」 2초월(받는 회복량 증가)은 공식에 없어 뺌(밍봉 확인: 공식이 맞음).
- **스킬 아이콘 대조(518개):** 7katlas 아이콘과 그림 비교 → 엇갈림(클로에 3개 · 빅토리아 2개)·다른 그림(사라 악마의 계약)·리뉴얼 전 그림·`iconUrl` 빈 칸(캐티 마구 할퀴기 · 초선 폐월의 미소 · 유신 뇌운 흑영랑)을 공식 그림 128×128 PNG로 교체(`public/images/{id}/skills/` + asset). 파일명이 같아서 브라우저는 강력 새로고침해야 바뀐 그림이 보임.

#### 13.1.1 전용장비 (신규·각성 시 같이)

도구 **「전용장비 옵션 추천」** 그리드는 `exclusiveGearMeta.generated.json`(+ `scraped_heroes`)를 본다. **신규 영웅이면 캐릭뿐 아니라 전용장비 아이콘도 반드시 넣는다.**

| 단계 | 할 일 |
|------|--------|
| 1 | `asset/.../영웅폴더/{이름}_전용장비.png` 배치 |
| 2 | `python scripts/sync_exclusive_gear_from_asset.py` → `public/images/{id}/exclusive-gear.png` + `src/data/exclusiveGearMeta.generated.json` |
| 3 | (선택) Ops/도구에서 조율 옵션 추천 문구는 Firestore `exclusiveGearGuides` — 아이콘만이면 메타 sync로 충분 |

이미 영웅만 넣고 전용장비를 빼먹으면 도구 그리드에 아이콘이 비거나 누락된다.

> **주의:** sync 스크립트는 `asset/영웅 목록` 전체를 돌며 `Tex_ItemIcon_*`을 `*_전용장비.png`로 **asset 파일명 변경**까지 한다. 아직 추가하지 않을 영웅 폴더(Tex_ 원본만 있는 폴더)가 있으면 스크립트 대신 같은 방식(PIL RGBA PNG 저장 + 메타 끝에 항목 추가)으로 해당 영웅만 처리.

#### 13.1.4 콜라보 영웅 (기타 탭)

| 항목 | 값 |
|------|-----|
| asset | `asset/영웅 목록/기타/콜라보레이션(작품명)/이름(역할)(각성?)` |
| `category` / `group` | `"other"` / 작품명 (예: `나혼자만 레벨업`, `귀멸의 칼날`) — 새 작품이면 `HERO_FACTION_ORDER.other`에 추가 |
| `id` | `collab_` + 이름(**공백 제거**, 예: `collab_카마도탄지로`). `name`은 띄어쓰기 그대로 |
| `title` | `{작품명} 콜라보` |
| 이미지 | `public/images/{id}/` (portrait.png · card.webp · skills · exclusive-gear.png). 구 콜라보 4명은 초상만 `/images/{이름}/` (레거시) |
| 새 특수 효과 | 스킬 `tooltips`(호버) + `systemRules.js` `effects_registry` (상태이상 & 특수 효과 도감) |

#### 13.1.5 스킬 텍스트 포맷 규칙 (도감 표시 — 루디 각성처럼)

`SkillRichText`가 `description` / `skillEnhance` / `transcendenceEffects`를 줄 단위로 그린다.

| 규칙 | 예 |
|------|-----|
| **대상 줄** = 한 줄 전체가 대괄호 **하나**뿐일 때만 대상 뱃지(아군/자신=파랑, 적=빨강) | `[모든 아군]` |
| 대상 블록: 대상 줄 → 효과 줄들 → 다음 대상 전 **빈 줄 1개** (`effects[]`에서 자동 생성) | `[자신]\n불굴 …\n\n[모든 적군]\n…` |
| 효과 줄 꼬리표 | `[55% 확률]` `[2턴 지속]` `[상시]` `[피격 3회]` `(전투당 1회 발동)` |
| 강화·초월 한 줄 | `[자신] 효과 추가 : 행동 제어 면역 [3턴 지속]` — 앞 `[대상]`은 **일반 텍스트**로 표시(뱃지 아님). 여러 개면 ` / `로 연결 |
| 대괄호·소괄호 **짝 맞추기** | 원본 asset 문구 그대로, 임의 축약·괄호 삭제 금지 |
| 툴팁 | asset `tooltips` 전체를 **모든 스킬**의 `tooltips`에 복사. 처음 나온 효과는 `systemRules.js` `effects_registry`에도 추가 |

> 과거 버그: 대상 판별 정규식이 `^\[(.*?)\]$`라 `[자신] 효과 추가 : … [3턴 지속]` 같은 줄이 통째로 뱃지가 되며 앞뒤 괄호가 잘려 보였음 → `^\[([^[\]]+)\]$`로 수정. 데이터 쪽 수정 불필요.

#### 13.1.2 일반 → 각성 업데이트

| 단계 | 할 일 |
|------|--------|
| 1 | asset에 `(각성)` 폴더·JSON·초상·스킬 아이콘·전용장비 갱신 |
| 2 | `scraped_heroes.json` 해당 영웅: `isAwakened: true`, 스킬에 **Awakening** 추가, 쿨/설명/아이콘 경로 갱신. asset에 `gauge` / `gauge_decrease`가 있으면 각성 스킬에 optional `awakenGauge` / `awakenGaugeDecrease`로 옮김 (도감 「각성 게이지 75 · 자기 턴마다 25 감소 (3턴 유지)」 — 아리스 · 쥬다스 · 이브) |
| 3 | `public/images/{id}/` 초상·스킬·전용장비 덮어쓰기 |
| 4 | 정렬은 자동(각성이 일반보다 앞). 같은 소속끼리는 이름순 |

#### 13.1.3 스킬 이름·아이콘만 변경

| 단계 | 할 일 |
|------|--------|
| 1 | asset `skills/*.json` + 새 스킬 PNG |
| 2 | `scraped_heroes.json`의 `skills[].name` / `iconUrl` / 필요 시 description·effects 동기화 |
| 3 | `public/images/{id}/skills/`에 **새 파일명**으로 PNG 복사 (옛 아이콘 파일은 남겨도 UI는 `iconUrl`만 봄) |

### 13.2 펫

| 단계 | 할 일 |
|------|--------|
| 1 | **`node scripts/import_7katlas_pets.mjs`** — 7katlas 펫 도감(`COMBINE/pets-L.js` · `pets-R.js` + 한글 `lang/kr/pets.js`)에서 다시 받아 `src/data/pets.js`(앱은 여기만 봄) · `asset/펫 목록/모든 펫.json`을 씀. 라이브 Firebase 무관. 캐시는 `%TEMP%/katlas-pets`(새 데이터를 받으려면 지우고 실행) |
| 2 | 펫 id(`pet_N`)는 허브 · 공략 문서에 저장되므로 스크립트가 기존 펫은 이름으로 찾아 그대로 두고 새 펫만 뒤에 다음 번호로 붙임. `pets[0]`(이린)이 기본 펫이라 순서를 바꾸지 말 것. 이름이 다른 펫은 `NAME_ALIAS`(7katlas 「멜패로」 = 우리 「멜페로」), 효과 이름이 영웅 데이터와 다르면 `EFFECT_ALIAS`(「치명타 피해량 증가」 → 「치명타 피해 증가」) |
| 3 | 그림: 초상화 = 7katlas 펫 상세 창의 **작은 아이콘**(`Tex_PetIcon_*Card.webp` → `public/images/pets/icon/{katlasId}.webp`, 전신 일러스트는 안 씀) · 펫 스킬 아이콘 `public/images/pets/skill/{katlasId}.webp` · 효과 아이콘은 `public/images/effects/`(없는 것만 받음, 펫 `effectIcons`에 이름 → 아이콘 id). 이미지 없는 미출시 펫은 뺌(Mr.아머는 예전 저장 데이터 때문에 `unreleased: true`로 유지) |
| 4 | `asset/펫 목록/`에 없는 펫 초상화 · `스킬 아이콘/` PNG는 따로 넣어 둠(asset 저장소). `title`(칭호)은 예전 값 유지, 새 펫은 빈칸 |
| 5 | 펫 도감 화면 = `src/components/PetDB.jsx` + `src/styles/petDex.css`(전체 · 전설 · 희귀 필터, 카드 = 초상화 · 등급 · 세력 · 스킬 아이콘 · 효과 아이콘 + 기본→강화 3 수치, 상세 = 능력치 · 효과 문장 · 강화 단계 표) |

### 13.3 장비 · 장신구

| 단계 | 할 일 |
|------|--------|
| 1 | `asset/장비, 장신구/`에 PNG·메타 추가 |
| 2 | `python scripts/import_gear_assets.py` → `src/data/gearDex.generated.json` + `public/images/equipment|accessories` |
| 3 | **덱 에디터·길드전·ops 메타덱 세트/옵션**은 `src/data/equipments.js` (주석: 단일 소스) |
| 4 | 도감 화면은 `gearDex.js`가 generated + legendary(`equipments.js`) 병합 |

장비·장신구 단일 소스: **`equipments.js` + gearDex** (`equipment.js` 단수 스키마는 제거됨). 

**장신구 세공(2옵):** 덱 장비 `gearConfig.accessory`(① 메인, 필수) + optional `accessory2`(② 세공, `''`=없음). 값은 반지 `displayName`(예: `철벽의 반지`).
- UI: `AccessorySlots.jsx` — 칸 위 라벨(「장신구 · ① 메인」/「② 세공」, 별도 「장신구」 머리글 없음) + 슬롯 버튼 2개(아이콘·이름·효과, 슬롯 폭에 따라 container query로 축소) → 팝업에서 **도감 6★ 반지 전체**(`accessoryCatalog`, 전설·희귀·고급·일반 필터) 선택. 다른 슬롯 반지는 잠금. 스타일 `styles/accessorySlots.css`. 사용처: `HeroGearPanel` · GuildLounge 총력전 인라인 · `OpsMetaDeckModal`.
- 해석·표시는 반드시 `lib/accessoryCraft.js`의 `resolveAccessoryPair(gear)` / `ringLabel(ring)` (상태이상 반지는 `재앙(마비)`처럼 효과 괄호).
- **구 문서 호환:** `accessory2` 키가 **없을 때만** `샐리맨더의 반지`→가시+샐리맨더, `토벌의 반지`→토벌+공성으로 푼다(구 UI의 「출혈&화상」「토벌&공성」 버튼). 그래서 **기본값(`emptyGearConfig` 등)에 `accessory2`를 넣지 말 것** — `{...기본값, ...구문서}` 병합 시 구 덱이 잘못 읽힌다. `AccessorySlots`의 `onChange`는 항상 `accessory`·`accessory2`를 함께 넘긴다.
- 세팅 확인(`InGameDeckCard`): 세공 반지가 있으면 장신구 박스를 `[아이콘] 메인 + [아이콘] 세공` 반반(`.acc-pair`, 「메인/세공」 글자 없음)으로, 없으면 기존 단일 표시. 상태이상은 이름 아래 작은 줄(`.acc-pair-status`). 박스 높이는 다른 칸과 같은 50.8px — `.acc-pair-sizer`(보이지 않는 2줄)가 잡아 주므로 지우지 말 것.  
전용장비(영웅 전용)는 §13.1.1 — 일반 장비 도감과 경로가 다름.

### 13.4 도감 UI 탭

`DbHub` — 영웅 / 장비 / 시스템(`systemRules.js`) / 펫.
