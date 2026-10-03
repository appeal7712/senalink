---
name: senalink-preview-hub
description: Starts the local 세나링크 practice hub (Firebase emulators + Vite dev server) for testing hub UI without touching live data. Use when 밍봉 says 「미리보기 허브 켜줘」, 로컬에서 테스트, 연습장, or before verifying any hub/UI patch.
---

# 미리보기 허브 (로컬 연습장)

Local emulator data only — never create test hubs on live `senalink`. Full background: `docs/agents/preview-hub.md`.

## Steps

1. Check the terminals folder first. If `npm run emulators` and `npm run dev` are already running, do not start them again — just give the URL.
2. Terminal 1 (project root): `npm run emulators` — Auth 9099 · Firestore 8080 · Functions 5001 · Storage 9199 · UI http://127.0.0.1:4000
3. Terminal 2: `npm run dev` — http://127.0.0.1:5173
4. Open **http://127.0.0.1:5173/hub**. Login is anonymous (no Google) on local.
5. Save a nickname (2–12 chars) in `NicknameGate`.
6. 「허브 생성」 needs **at least one hashtag**.
7. `/ops` locally: `npm run seed:admin -- <anonymous UID>` then 「로컬 관리자로 들어가기」.

## Troubleshooting

- 「로컬 에뮬레이터에 연결하지 못했습니다…」 → emulators are not running; recheck terminal 1.
- Missing `.env.local` → copy from `.env.example` (`VITE_FIREBASE_*`, senalink project ID is fine; dev traffic goes to emulators only).
- Emulator data may reset on restart; that is expected.

## Do not

- Change `USE_GOOGLE_AUTH`, rules, or `VITE_USE_EMULATORS` in ways that leak into production builds.
- Deploy to see UI changes — verify locally, deploy only when 밍봉 asks (skill `senalink-deploy`).
