# 도감 업데이트 (영웅 · 펫 · 장비 · 전용장비) — AGENTS.md §13

> AGENTS.md에서 분리한 상세 문서 (원문 그대로). 절 번호(§)는 AGENTS.md와 동일하게 유지한다.
> 공통 금지·데이터 보호 규칙은 항상 루트 `AGENTS.md` §2.1이 우선.

## 13. 도감 업데이트 유의 사항 (영웅 · 펫 · 장비 · 전용장비)

앱이 **실제로 import하는 파일**만 고치면 UI에 반영된다. `asset/`은 원본·재생성 소스.

**목록 정렬 (전역, 까먹지 말 것):** §12.1  
각성 → 스페셜(`HERO_FACTION_ORDER.special` 소속순) → 준스페셜(아스가르드·아이샤) → 일반 → 기타.  
`heroes.js`의 `sortHeroesForList` / `compareHeroesForList`가 단일 소스. 새 소속이면 `HERO_FACTION_ORDER`에만 추가.

런타임 영웅: `scraped_heroes.json` ← `heroes.js` ← `HeroDB` / 피커 / 세팅·스킬 예약.

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
| 2 | `scraped_heroes.json` 해당 영웅: `isAwakened: true`, 스킬에 **Awakening** 추가, 쿨/설명/아이콘 경로 갱신 |
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
| 1 | **`src/data/pets.js`에 엔트리 추가** (앱은 여기만 봄). 새 펫은 맨 끝에 다음 `pet_N` id로 — 덱은 id로 저장, `pets[0]`이 기본 펫이라 앞에 끼우지 말 것. `title`(펫 도감 상세 칭호, 없으면 「세븐나이츠 공식 펫」)은 밍봉이 정해 줌 |
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

**장신구 세공(2옵):** 덱 장비 `gearConfig.accessory`(① 메인, 필수) + optional `accessory2`(② 세공, `''`=없음). 값은 반지 `displayName`(예: `철벽의 반지`).
- UI: `AccessorySlots.jsx` — 칸 위 라벨(「장신구 · ① 메인」/「② 세공」, 별도 「장신구」 머리글 없음) + 슬롯 버튼 2개(아이콘·이름·효과, 슬롯 폭에 따라 container query로 축소) → 팝업에서 **도감 6★ 반지 전체**(`accessoryCatalog`, 전설·희귀·고급·일반 필터) 선택. 다른 슬롯 반지는 잠금. 스타일 `styles/accessorySlots.css`. 사용처: `HeroGearPanel` · GuildLounge 총력전 인라인 · `OpsMetaDeckModal`.
- 해석·표시는 반드시 `lib/accessoryCraft.js`의 `resolveAccessoryPair(gear)` / `ringLabel(ring)` (상태이상 반지는 `재앙(마비)`처럼 효과 괄호).
- **구 문서 호환:** `accessory2` 키가 **없을 때만** `샐리맨더의 반지`→가시+샐리맨더, `토벌의 반지`→토벌+공성으로 푼다(구 UI의 「출혈&화상」「토벌&공성」 버튼). 그래서 **기본값(`emptyGearConfig` 등)에 `accessory2`를 넣지 말 것** — `{...기본값, ...구문서}` 병합 시 구 덱이 잘못 읽힌다. `AccessorySlots`의 `onChange`는 항상 `accessory`·`accessory2`를 함께 넘긴다.
- 세팅 확인(`InGameDeckCard`): 세공 반지가 있으면 장신구 박스를 `[아이콘] 메인 + [아이콘] 세공` 반반(`.acc-pair`, 「메인/세공」 글자 없음)으로, 없으면 기존 단일 표시. 상태이상은 이름 아래 작은 줄(`.acc-pair-status`). 박스 높이는 다른 칸과 같은 50.8px — `.acc-pair-sizer`(보이지 않는 2줄)가 잡아 주므로 지우지 말 것.  
전용장비(영웅 전용)는 §13.1.1 — 일반 장비 도감과 경로가 다름.

### 13.4 도감 UI 탭

`DbHub` — 영웅 / 장비 / 시스템(`systemRules.js`) / 펫.
