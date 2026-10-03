# 미리보기 허브 (로컬 연습장) — AGENTS.md §4.1

> AGENTS.md에서 분리한 상세 문서 (원문 그대로). 절 번호(§)는 AGENTS.md와 동일하게 유지한다.
> 공통 금지·데이터 보호 규칙은 항상 루트 `AGENTS.md` §2.1이 우선.

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
