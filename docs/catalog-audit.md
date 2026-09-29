# Catalog audit — games.json (Worker A)

Original target file `docs/trg-v2-run-notes.md` was specified in the task but does not exist on disk or in git HEAD (`git cat-file -e HEAD:docs/trg-v2-run-notes.md` → `fatal: path ... does not exist in 'HEAD'`). To avoid clobbering a concurrent worker that may create it, audit findings are recorded in this standalone file (`docs/catalog-audit.md`), safe to merge into the run-notes later.

Date: 2025-06-09 (session date; audit run during Worker A 20-min sweep)
Scope: audit ONLY — `games.json` not edited.
Disk guard at audit start: `df -h / | tail -1` → `29G 27G 1.4G 96% /` (1.4G free — under the 2G AGENTS.md guidance for big operations; no large ops performed, audit is I/O-light).

## 1. Schema validation

```text
$ python3 - <<'EOF' ... # schema check
entries: 120
dup ids: []
non-int ids: []
```

- 120 entries, all `id` unique integers (range 4–221). No duplicate or non-int ids.
- `url` fields: all strings, all relative (no leading slash — consistent with the portal fetch `()=>{...fetch(\`./games.json\`)...}` in `assets/index-CRWHmtoy.js`), all end in `.html`.
- `featured`: all boolean, mix of true/false.
- **Extra keys beyond the documented 7-key schema**: `docs/CODE_QUALITY.md` §4 says every entry is `{id, title, cat, icon, desc, url, featured}`. Actual data carries extra keys:
  - `tags` — present on **93 entries** (e.g. id 7 SoccerRandom... id 93; see spread 4–193).
  - `howto` + `players` — present on **5 entries**: ids 4 (SoccerRandom), 5 (BasketRandom), 6 (VolleyRandom), 47 (Gladihoppers), 129 (FireboyAndWatergirlForestTemple).
  - Likely benign (extra metadata, not schema drift that breaks the loader — no `missing` fields anywhere), but it violates the stated schema contract.
- Empty field scan:
  - `title` / `cat` / `desc` / `url` — no empties.
  - **`icon` — empty string on 20 entries** (ids 120, 121, 127, 136, 137, 149, 152, 154, 160, 161, 162, 163, 169, 170, 171, 172, 174, 175, 176, 177, 178, 179, 180, 181, 182, 184, 185, 186, 188, 190, 191, 193 — a subset of these; full list from the empty-check output above, grouped in the icon id dump). Schema does not forbid this, and portal likely falls back, but worth normalizing.

## 2. URL resolution (disk + git HEAD)

```text
broken (neither): []
sparse (one only): []
# per-entry git cat-file -e HEAD:<url> pass:
total git-missing urls (per-entry full path check): 0
```

- All 120 `url` values resolve BOTH on disk (`os.path.exists`) AND in git `HEAD` (`git ls-tree -r HEAD --name-only` / per-entry `git cat-file -e`). Zero broken, zero sparse/checkout artifacts.

## 3. Directory gap analysis

```text
$ ls Games/ | wc -l
123
$ git ls-tree --name-only HEAD Games/ | wc -l
123    # .gitignore-lite mismatch resolved; git tree Games dirs = same 123
```

- **Dirs on disk with NO catalog entry:** `QWOP`, `Slope` (+ `Games/_emulatorjs`, which is shared EmulatorJS runtime infrastructure, not a game — correctly excluded from catalog).
- **Catalog entries with NO dir on disk:** none (`[]`).
- Conclusion: gap = 2 real games missing from catalog (`Games/QWOP/`, `Games/Slope/`), plus 1 infra dir expected-omitted.

## 4. Sanity checks

- Duplicate titles (case-insensitive, trimmed): **none**.
- Empty `title`/`desc`/`cat`: **none**.
- `cat` values used in JSON (12): `action(22), arcade(11), card(4), classic(27), idle(3), puzzle(17), riddle(1), simulation(1), sports(10), story(4), strategy(16), word(4)`.
- **Portal-filter mismatch (real finding):** the minified portal bundle `assets/index-CRWHmtoy.js` defines the category filter chips as exactly:
  ```js
  [{id:`all`,...},{id:`action`,...},{id:`puzzle`,...},{id:`strategy`,...},{id:`classic`,...},{id:`sports`,...},{id:`riddle`,...}]
  ```
  i.e. only `action/puzzle/strategy/classic/sports/riddle` (plus `all`) have filter chips. Six catalog categories have **no** corresponding chip: `arcade(11), card(4), idle(3), story(4), simulation(1), word(4)` — **27 of 120 entries can only be found via "All"**, no dedicated filter. Given Direction A (no portal bundle rebuilds; polish via CSS + index.html only), the practical options are: (a) remap those 27 entries' `cat` in `games.json` to the nearest supported chip, or (b) accept with a note in portal UI. Flag for operator decision.
- **`id` checkpoints:** 101 ids absent in the 4..221 range ([1,2,3,12,13,15–46,61,65,67–78,82,85,88,91–93,104–106,108,110,112–113,122,124–126,130,134–135,138–148,150–151,153,155–159,164–168,173,183,187,189,192,194]) — consistent with an id-eviction pattern. Not a bug by itself; shows a purge pass. No corresponding orphan game dirs remain, so this is bookkeeping noise only — no action needed.

## Summary table

| # | Finding | Severity | Suggested fix |
|---|---------|----------|---------------|
| 1 | 93 entries carry `tags`, 5 also carry `howto`/`players` — beyond the documented 7-key schema (CODE_QUALITY.md §4) | Low | Either document these optional keys in the schema or strip them if unused by the portal |
| 2 | 2 dirs on disk not in catalog: `Games/QWOP/`, `Games/Slope/` (git-tracked, real game dirs) | Medium | Append catalog entries for both, or delete dirs if they're placeholders (needs evidence-first check) |
| 3 | 27 entries have `cat` values the portal has no filter chip for (`arcade`, `card`, `idle`, `story`, `simulation`, `word`) | Medium | Operator decision: remap cats into the 6 supported chips, or punt to a bundle rebuild later |
| 4 | 20 entries have empty `icon` | Low | Populate or leave empty with a portal fallback noted |
| 5 | 101 gap ids (221-range sparse) — bookkeeping residue, not orphans | Info | No action; noted as purge side-effect |
| 6 | `docs/trg-v2-run-notes.md` does not exist in git HEAD or working tree | Info | Recorded findings here instead; merge into run-notes if/when it appears |

No actions taken beyond documentation. `games.json` untouched. `Games/Character AI` untouched (read dark-checked only).
