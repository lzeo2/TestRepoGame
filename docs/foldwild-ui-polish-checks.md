# Foldwild UI polish: mechanical checks

Documentation-only verification at baseline HEAD `70ab7d52`. Read `AGENTS.md`, `docs/CODE_QUALITY.md`, `docs/foldwild-ui-rework-checks.md`, the maintenance index and complete Foldwild manual. Inspected only the existing shell test needed to confirm it uses stdlib parsing, not a browser. Tests ran against the working tree while Main edited the UI, not a frozen release snapshot.

## Results

- **13/13 requested Node suites passed**, each exit 0, Node `v22.23.1`.
- **Existing shell ABI test passed**, 1 test, exit 0.
- **Catalog passed**: 128 entries, required fields/types, unique integer IDs and every URL backed by `git ls-files`, including sparse-excluded files.
- Existing Foldwild registration: **226**, **Foldwild: Open-World RPG (Preview)**, category `story`, URL `Games/Foldwild/index.html`, icon `FW`, featured `false`. Description: “Preview: explore five regions, collect creatures and fight turn-based battles. Full campaign and device testing remain ongoing.” No games added or registered here.
- Maintenance checker **blocked, exit 1** on concurrent uncommitted source. No inventory refresh or manual edits.

## Commands and actual output excerpts

Each row below quotes a suite's stdout excerpt, not an aggregate assertion count. Executed all suites with this loop; each invocation printed `exit=0`:

```bash
passed=0; failed=0
for suite in data battle battle_v2 economy builds world regions save_v2 continuity cap_xp save_conflict class_ranks campaign; do
  printf '\n$ node --experimental-default-type=module scripts/test_foldwild_%s.mjs\n' "$suite"
  node --experimental-default-type=module "scripts/test_foldwild_${suite}.mjs"
  result=$?; printf 'exit=%s\n' "$result"
  if [ "$result" -eq 0 ]; then passed=$((passed+1)); else failed=$((failed+1)); fi
done
printf '\nSUITES: %s passed; %s failed\n' "$passed" "$failed"
test "$failed" -eq 0
```

| Suite | Actual stdout excerpt | Exit |
| --- | --- | --- |
| data | `PASS: 80 exact roster species; 16/element; 10 families x8; 50 exact normative actions; evolution 12/26 acyclic; hidden null; wheel/schema; 80 tracked/local SHA matches; models=7300844 bytes` | 0 |
| battle | `PASS: 80 species; all 50 abilities executed; 25 wheel pairs (5 strong/5 reverse)`; `Capture reproducibility: hit seed=670, miss seed=671` | 0 |
| battle_v2 | `PASS: battle v2 all 80 profiles/evolutions; every class/trait; capture boundaries; 31 energy/26 shield caps` | 0 |
| economy | `Foldwild economy: PASS (9 shops, atomic trades, caps, reload stock, one-shot contracts, prototype guards).` | 0 |
| builds | `Foldwild builds: PASS (80 species x 10 seeds, 77 builds, neutral migration, caps, unlocks, synergy, prototype guards).` | 0 |
| world | `PASS: world/save v2 API; five regions/rivals; habitat pools 35/65/65/75/80` | 0 |
| regions | `PASS: 5 regions, 128000 m², 480 trees, 48 NPCs (12 principal), 9 shops/contracts; 73 POI + 15 wild routes, 185 collision-safe segments` | 0 |
| save_v2 | `PASS: v1 neutral migration and legacy Iven badge; five-region route/reexports` | 0 |
| continuity | `PASS: optional v1/v2 continuity; canonical effects/profiles, active index and exact action/RNG replay` | 0 |
| cap_xp | `PASS: XP cap fixtures; v1/v2 accepted XP retained; near/exact ceiling rewards save/reload; frozen inputs; level 12/26/40 resource deltas; validation rejection unchanged` | 0 |
| save_conflict | `PASS: optimistic expected-null/bytes writes; stale primary AND backup preservation; exact raw metadata; unchanged two-argument API` | 0 |
| class_ranks | `PASS: class rank thresholds/history/immutable perks`; `168 baseline legacy replay snapshots exact` | 0 |
| campaign | `PASS: campaign composition fixtures; F3/R1 exact tables`; `Natural campaign acceptance NOT established.` | 0 |

Final loop output: `SUITES: 13 passed; 0 failed`, exit 0.

```text
$ python3 -B scripts/test_foldwild_m2_shell.py
.
----------------------------------------------------------------------
Ran 1 test in 0.022s

OK
exit=0
```

This is a static HTML/CSS shell ABI check, not the original or async native M2 runner, controller execution, geometry or gameplay acceptance.

### Sparse-aware catalog validation

Read-only inline `python3 -B` validation used the following schema/URL checks:

```python
import json, subprocess
from urllib.parse import urlsplit, unquote
catalog = json.load(open('games.json'))
assert isinstance(catalog, list)
tracked = set(subprocess.check_output(['git', 'ls-files', '-z']).decode().split('\0'))
seen = set()
for g in catalog:
    assert isinstance(g, dict), g
    assert {'id', 'title', 'cat', 'icon', 'desc', 'url', 'featured'} <= g.keys(), g
    assert type(g['id']) is int and g['id'] not in seen, g
    seen.add(g['id'])
    for key in ('title', 'cat', 'icon', 'desc', 'url'):
        assert isinstance(g[key], str), (g['id'], key)
    assert type(g['featured']) is bool, g['id']
    url = urlsplit(g['url'])
    assert not url.scheme and not url.netloc, g['url']
    path = unquote(url.path).removeprefix('/').removeprefix('./')
    assert path in tracked, (g['id'], path)
print(f'PASS: {len(catalog)} entries; required schema/types; unique integer IDs; all URLs tracked by git ls-files (sparse-aware).')
```

Actual output:

```text
PASS: 128 entries; required schema/types; unique integer IDs; all URLs tracked by git ls-files (sparse-aware).
exit=0
```

First attempt incorrectly imposed nonempty strings on every text field and stopped at `AssertionError: (4, 'icon')`, exit 1. Read entry 4, which has `icon: ""`; the required schema does not prohibit empty icons. Corrected that extra assumption to string-type validation; no catalog or existing check changed.

### Maintenance inventory boundary

Compared the Foldwild inventory record with Git HEAD: 95 tracked files, tree `d11a1e3a026c7a49119eebfb68ce2e8986410e18`, entry blob `90c57cd6bbd81ca7828aac4a99a1d06ccb4f64a8`. Recorded hashes match HEAD, not Main's dirty HTML/CSS.

```text
$ python3 -B scripts/check_maintenance_docs.py
AssertionError: Commit inspected source changes before validating its inventory.
exit=1
```

Traceback paths omitted. Main owns source/manual/inventory reconciliation; this result is not a passing maintenance gate.

## Scope, ownership and limits

Only this new report is owned. No design, runtime, scripts, catalog, manual or inventory edits; no browsers, screenshots, native M2, full-fleet test, installs, servers, sparse changes or push. Original/async M2, inspection-close, natural campaign/ranks/acquisition/evolution, physical-device performance and rights/provenance holds remain unchanged. Passing fixtures do not clear them. Concurrent source edits after these checks need their own verification.

Initial dirty paths belonged to Main/user: `Games/Foldwild/index.html`, `Games/Foldwild/style.css`, `docs/foldwild-audit-20261024/`. Before writing, additional unrelated paths were `Games/Citisten3D/external-buildings.mjs`, `Games/Citisten3D/external-model-check.mjs`, `Games/Citisten3D/building-surfaces.mjs`, `docs/foldwild-audit-20261024.md`, `scripts/audit_registered_games.py`. None is staged or reverted by this task.

`df -B1 --output=avail /`: initially **2,744,946,688 bytes**; immediately before report creation **2,744,217,600 bytes**, above the **2,147,483,648-byte** hard stop. Shared-host change is not attributable solely to this task. Final storage and owned-path commit/whitespace verification are reported with the commit hash to Main.
