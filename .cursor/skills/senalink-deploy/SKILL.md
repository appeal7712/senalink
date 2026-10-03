---
name: senalink-deploy
description: Pre-deploy checks, version bump, patch history, Firebase deploy (senalink only), live verification, commit and push for the 세나링크 site. Use when 밍봉/김봉 asks to deploy, 배포, 커밋, 푸시, or ship changes to senalink.kr.
---

# 세나링크 배포

Deploy **only** when 밍봉/김봉 explicitly asks. Project is always `senalink`. Never touch other Firebase projects.

## Checklist

```
- [ ] 1. Diff review (live impact)
- [ ] 2. Report risky items to 밍봉 before deploying
- [ ] 3. Lint (changed files) + npm run build + node --check functions
- [ ] 4. Local check in preview hub (skill senalink-preview-hub)
- [ ] 5. APP_VERSION bump + patch history + AGENTS.md version line
- [ ] 6. Deploy: Functions → rules → Hosting
- [ ] 7. Live verification
- [ ] 8. Commit explicit paths + push
```

### 1. Diff review

```bash
git status --short
git diff --stat
git diff --quiet firestore.rules storage.rules firebase.json firestore.indexes.json; echo $?
```

Classify every change as **UI-only** or **rules / Functions / schema / Firestore write path**. For the latter, apply `.cursor/rules/firebase-safety.mdc` questions. Watch for: `setDoc` without merge, new `allow`, removed/renamed fields, new required fields, client writes to Callable-only collections.

### 2. Tell 밍봉 first

If anything can affect live data, permissions, cost (new public Callable, schedules), or old clients, say so plainly in Korean **before** deploying and get a go-ahead. "위험도 낮음" is not enough — make it zero or ask.

### 3. Verify

```bash
npx eslint <changed files>        # repo has pre-existing errors; only new ones matter
npm run build
node --check functions/index.js
```

### 5. Version and docs

- `src/config/appVersion.js`: `YYYY.MM.DD.N` (N = previous + 1).
- Add a new entry at the **top** of `docs/agents/patch-history.md`: date, version, what changed, deploy scope (Hosting / rules / functions).
- Update the 「최근 호스팅 버전대」 line in `AGENTS.md` §16.
- If architecture, rules, paths, or UI constraints changed, update the matching `docs/agents/*.md` section too.

### 6. Deploy order

```bash
npm run build
npx firebase deploy --only functions:<fnA>,functions:<fnB> --project senalink   # only changed functions
npx firebase deploy --only firestore:rules --project senalink                   # only if rules changed
npx firebase deploy --only hosting --project senalink
```

- Functions first when the new client calls a new Callable; Hosting last.
- Never `firebase deploy` without `--only`. Never deploy all functions when only some changed.
- The `guard-shell` hook asks for confirmation on every deploy; that is expected.

### 7. Live verification

- Open https://senalink.kr, confirm the footer shows the new `APP_VERSION`.
- Exercise the changed feature read-only (no test data on live).
- For new Functions: `npx firebase functions:list --project senalink` and check logs if needed.

### 8. Commit and push

- Stage **explicit paths** only. Never stage `asset/`, `tmp_*`, `scripts/tmp_*`, `.env*` (except `.env.example` / `.env.development`), `.firebase/hosting.*.cache`.
- Commit message: one English sentence + `(vYYYY.MM.DD.N)`, matching recent history.
- `git push origin <current branch>`. Never force push.
