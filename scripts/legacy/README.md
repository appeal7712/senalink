# Legacy scraper scripts (archived)

One-off or old maintenance scripts moved from the repo root. **Not used by the Vite app or Firebase deploy.**

## Before running

- Many scripts still point at **`sevennight_guild_web`** (non-`_formal` folder). Update paths to `sevennight_guild_web_formal` before use.
- Prefer maintained scripts in the parent [`scripts/`](../) folder.

## Maintained scripts (use these)

| Script | Role |
|--------|------|
| [`../import_gear_assets.py`](../import_gear_assets.py) | `asset/` → `src/data/gearDex.generated.json` + `public/images/` |
| [`../fetch_hero_cards.py`](../fetch_hero_cards.py) | Hero card webp + `heroCardMeta.json` — needs repo-root `tmp_negi_chars_ko.json` (not committed) |
| [`../seed-emulator-admin.mjs`](../seed-emulator-admin.mjs) | Emulator super-admin seed (`npm run seed:admin`) |

## This folder

Historical scrapers (heroes, gelidus, tooltips, collab fixes, etc.). Keep for reference; delete only after confirming no local workflow depends on them.
