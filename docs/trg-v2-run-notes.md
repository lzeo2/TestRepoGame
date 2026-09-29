## Worker A catalog audit — 2025-09-29

Audit-only sweep of `games.json` (no edits made to the catalog). Full evidence in `docs/catalog-audit.md`.

- Schema: 120 entries, all ids unique ints (range 4–221), all urls relative + `.html`, `featured` all bool. PASS.
- Extra keys: `tags` on 93 entries; `howto`+`players` on ids 4/5/6/47/129 — beyond the 7-key schema (low).
- URL resolution: all 120 urls exist BOTH on disk and in git HEAD — 0 broken, 0 sparse.
- Dir gap (`ls Games | wc -l` = 123 vs 120 entries): `Games/QWOP/` and `Games/Slope/` on disk (git-tracked) without catalog entries; `Games/_emulatorjs` is infra, correctly omitted. No catalog entries lack a dir.
- Sanity: no dup titles, no empty title/cat/desc; 20 entries have empty `icon`.
- Finding: portal filter chips in `assets/index-CRWHmtoy.js` only cover `action/puzzle/strategy/classic/sports/riddle` — 6 cats (`arcade`, `card`, `idle`, `story`, `simulation`, `word`) = 27 entries have no filter chip (needs operator decision).
