# Capital Drive verification and release hold, 12 November 2026

One operator-authorized original game was added, registered as **245**. No games
were ingested. Catalog: **132 → 133**; projects: **138 → 139**, with six projects
still unregistered. No existing game source, shared car factory, protected
Character AI tree, compiled portal bundle or proxy/security configuration changed.

## Result

The Canberra driving/exploration preview is implemented and locally playable,
including the requested pedestrians and fuller neighbourhood details. It uses
5,197 real road runs, 9,523 source building outlines and sampled terrain. The
world renders 9,319 outlines after nested-duplicate suppression. Eighty fictional
adult pedestrians, 26 traffic vehicles and 2,800 detailed frontages provide life.
Building heights/facades, vegetation and furniture are interpretations. Whole
Canberra expansion, on-foot control, police and missions remain future work.

## Actual validation

- Syntax and whitespace checks passed for owned authored files.
- Simulation regression passed, including directed navigation, left-hand lanes,
  drifting, reverse, collisions, parked cars and recovery. Actual map: 28,323
  graph nodes / 48,290 directed edges / 26 cars through 60 simulated seconds.
- Pedestrian regression passed: safe sidewalks, terrain, walking, car response,
  pause, deterministic teleport arrivals and recycling; 59 initially visible.
- Neighbourhood regression passed: finite geometry, upward driveway faces,
  real frontages, park/building avoidance, culling and disposal.
- Browser integration: **24 passed**, zero console/page errors, zero failed
  local requests and zero third-party runtime requests. Normal input exercised
  driving/drift, moving pedestrians, pause, route selection, all seven discoveries,
  car/paint selection, recovery and save reload. Separate labelled fixtures
  exercised unavailable WebGL and denied storage. Desktop/phone, light/dark
  screenshots were captured and reviewed. See the [browser result](capital-drive-browser-2026-11-12.json).
- Maintenance coverage: `PASS: 139 game documents cover 133 registered + 6 unregistered games; Git inventory current.`
- Sitemap: `PASS sitemap: 133 Git-backed game URLs + portal`.

Software Chromium captures are not actual N100 GPU/FPS acceptance. Low/standard
30/60 FPS are targets. The shared Desktop browser has no WebGL and displays the
explicit playable 2D compatibility view; the saved 3D previews came from the
working software WebGL browser checks. Neither is a real N100 benchmark.

## Unchanged full fleet gate

Runtime source commit: `4da996369911531cc0ed8878434ee4bb2f6c6e86`.
The unchanged all-games sparse wrapper ran through all **133/133** entries with
its original waits, collectors and failure exclusions. No filters or tests were
weakened. An initial shared-display attempt failed before visits because its
X11 authentication was unavailable. The actual complete run used `xvfb-run -a
python3 -u scripts/run_sparse_smoke.py`, with an official Debian 13 Xvfb extracted
into a temporary tools directory and prepended to PATH. No system package,
repository build dependency or browser TLS bypass was installed.

Actual final output:

```text
ok   Capital Drive: Canberra (Preview) console_errors=0 failed_reqs=0
== 123/133 games pass ==
SPARSE RESTORED: pages=133/133, peak_Games_bytes=195853427, remaining_Games_bytes=0; this is not a gate-pass assertion.
```

Exit **1**, release **HOLD**. Ten other games retained certificate-validation
request failures (`net::ERR_CERT_AUTHORITY_INVALID`):

- Ovo
- Dr. Mario
- Street Fighter II
- Advance Wars
- Mario Kart Super Circuit
- Metroid Fusion
- Mega Man Zero
- Kirby Amazing Mirror
- Sonic Advance
- Balatro

Ovo had four retained failed requests, with three samples printed; the remaining
nine games each had one `version.json` request failure. This is the observed
environmental TLS result, not a proven code regression or current baseline result
on another machine. TLS validation stayed enabled. The runner reports filtered
loading outcomes; it does not count benign exclusions or establish full gameplay,
licensing, audio, offline compliance or target-device performance.
See [all 133 results](capital-drive-fleet-2026-11-12.json).

The wrapper restored its exact input sparse configuration. The development
selection, including the new game, was then restored for review. Protected source
hashes and unchanged smoke/wrapper blob IDs were checked. The task leaves the
new game materialized, plus its local dependencies and documentation.

## Shipping and artifacts

No push, pull request or publication occurred. A fresh Git push dry-run could
not authenticate; the configured GitHub CLI token is invalid. The repository's
AGENTS release rule also states: “A blocked gate means no push. User/operator
decides any exception.” GitHub access and an explicit exception or a passing
fresh full gate are needed before shipping this branch.

The separate temporary preview tree and playable ZIP include only this game,
its local dependencies, notices and actual screenshots. They remain independent
of the sparse release runner. The Git bundle preserves the branch for review or
transfer without requiring credentials in this environment. No Sites tools were
used to create or publish the game.

New game payload: **5,633,251 bytes**; shared runtime assets are
unchanged. Temporary Git object materialization for verification brought the
local object store to approximately 910 MiB. The fleet's peak Games checkout was
195,853,427 bytes, below its 300 MiB limit; more than 28 GiB disk remained free.

Build/integration commit: `89ea486`. Registration commit: `d45c78e`.
Implementation and catalog/documentation commits, in order:

```text
420d16b feat: add Capital Drive physics and connected traffic simulation
5fc8d7f fix: resolve closed footprint vertices safely
b29cb4b feat: keep Capital Drive traffic near the player
0accb98 feat: render Canberra terrain streets and footprint architecture
4d12033 feat: import real Canberra roads buildings and terrain
eb950f1 fix: conform Canberra streets and distribute avenue trees
fb546cb feat: add physical parked cars and navigation regression checks
355d675 fix: place Foreshore destination on Eastlake Parade
d167c9a feat: add pooled sidewalk pedestrians to Capital Drive
0f81b2e feat: enrich real Canberra frontages and street furniture
1e4cbb5 fix: repopulate nearby sidewalks after Capital Drive teleports
89ea486 feat: integrate Capital Drive Canberra driving and neighbourhood life
d45c78e feat: register Capital Drive Canberra preview as game 245
4da9963 docs: reconcile maintenance inventory for Capital Drive
```

This receipt's commit adds only verification documentation and does not change
the runtime checked by the full gate.
