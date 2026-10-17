# Wings repair and Pi recovery, 2026-10-17

## Disposition

Source-built repair integrated locally, no push or publication. Runtime milestone
`80d88ae`, inventory milestone `b52d942`. Fresh full gate **125/125, exit 0**.
No game, registration, weapon type or runtime third-party dependency added.
Catalog remains 125 entries; maintenance covers 130 game projects.

## Coordination and storage

The original LAN SSH address stopped reaching the Pi after its Wi-Fi network
changed. Existing Tailscale SSH restored access after the operator completed the
authentication check. No password or credential is stored in this receipt.

The Pi root filesystem was full, with zero available bytes. Cache/orphan audits
removed APT caches (217,280,512 bytes), npm cache (655,245,312), source-backed
Python bytecode (156,364,800), and an orphaned Ruflo installation (1,226,637,312).
No active process, open file, package registration, dependent global package or
configuration consumer was found for that orphan. Its initiating process remains
unproven; no attribution is inferred from package size.

Clean tracked game working copies were then narrowed through Git sparse checkout,
retaining Wings and the protected Character AI selection. Code stayed in Git;
protected files matched their committed blobs. Available space reached
3,423,768,576 bytes before repair integration. Backups and bounded receipts remain
in private maintenance storage. Hivemind, active MCP dependencies, sessions,
sources and recovery backups were retained.

Existing Wings/fleet/port owners acknowledged the repair hold; 26 project agents
were inactive at the coordination snapshot. Their provider/model settings were
preserved. Root integrated an isolated branch after verifying the Pi clean and
unchanged; no parallel worker edits were overwritten. Two newer operator
requirements commits (`1c0c104`, `3c6176c`) were detected and merged before
continuing. The standing quality contract and v2 brief remain intact.

Workers retained the repository AGENTS.md current 3D model requirement,
`openai-codex/gpt-6.1-sol`; the conflicting Astra line in the new brief was not
used to silently change existing worker/provider settings. This choice is recorded
for operator review rather than presented as agreement between those documents.

## Changes and review

Study covered original five aircraft, materials/conversion, store/exhaust pivots,
spawn, camera, weapon, bot and audio conventions. Root compared official aircraft
references and actual renders before approving geometry `92e470f`.

- Both jets preserve authored dark neutral paint through the existing converter.
- F-35 has broader chines/forebody, integrated trapezoid intakes, corrected scale,
  actual recessed bays, covered internal stores and correctly signed doors.
- F-15 has four external stores and twin exhaust; F-35 four internal stores and
  single exhaust. Existing ammunition, regeneration and boost mechanisms drive
  the presentation.
- Distinct arcade fits: F-15 cannon20/aim9 plus officer Maverick; F-35 cannon20/
  tvmissile plus officer tvmissile and existing stealth rules.
- Cockpit, gun, missile and exhaust coordinates derive from the final geometry.
  Optional simulation hardpoints preserve the original-five fallback.
- Escape explicitly releases active pointer lock so forwarded keys can use the
  existing pause/menu path. The original automation failure did not establish a
  physical-keyboard bug; both locked and keyboard-fallback exit paths were checked.
- Current UI regression labels now match F-15/F-35; historical receipts remain.

Both deterministic GLBs remain below 1,200,000 bytes: F-15 41,352 triangles /
1,176,316 bytes; F-35 40,812 / 1,174,768. Exact hashes, coordinates and budgets:
[model contract](../../../Games/Wings/docs/models.md).

## Source build and bounded verification

Rebuilt from upstream pin `bf5f6277e38ee52e9bfa4ae4a01337b46175c181` and the
authored patch, using operator-approved external Vite 7.3.7, Three 0.186.0,
Rollup 4.64.5 and esbuild 0.28.2 with existing Bun 1.4.2. No build tooling was
installed in TestRepoGame or on the Pi. Generated HTML/chunks and regression
bundles were source-built, not hand-edited. Source HTML line endings were
normalized before regeneration. Clean-pin patch application passes.

Tracked and constructed-path consumer checks support retirement of eight old
hashed chunks. Current HTML/import/new-URL closure resolves. Independent review
parsed 12 generated JavaScript files and found no new external runtime load.
Catalog IDs/schema/Git-backed entries remain intact; Character AI is unchanged.

Fresh Windows and Pi checks pass:

- `check-models.py`: committed bytes equal two fresh generations, structural and
  budget validation, F-35 aperture/cover/roof clearance.
- Source-built `astra-check.mjs`: distinct fits/stealth, independently composed
  node hardpoints, rotated launch coordinates, actual converted store depletion
  per round and regeneration, exhaust/boost, both bay triggers, cannon exclusion,
  signed cover travel, camera math and original-five invariants.
- Source-built `solo-check.mjs`: ordinary-input takeoff, fresh room, crash and
  respawn simulation. These CPU checks do not establish native rendering.
- Eleven raw Three fixtures: seven jet views and four original-family comparisons,
  zero page/console errors or external requests. Root reviewed the final views.
- Real Windows Edge WebGPU/AMD: both jets passed normal-input takeoff/climb above
  120 m, turn, boost, cockpit/chase, cannon projectiles, Escape pause, ordinary
  menu return (zero sessions) and fresh restart (one session). Root reviewed
  [saved previews](../../../Games/Wings/docs/previews-v2/README.md).
- Separate ordinary-input dive/death/quick-launch respawn passed both jets, full
  health and restored pointer lock. The precise native death cause is unproven.
- Maintenance inventory refresh/check passed: 130 projects, 125 registered.

After label correction `b65acc7`, the current Python UI regression passed all
four unavailable-GPU cases: 1280 x 720 and 390 x 844, dark and light preferences,
exit 0, zero page errors and external requests. It covers lazy menus, fail-closed
launch/retry, aircraft selection, navigation, spawn/HUD fixtures and listener
cleanup; it does not render flight. See [case data](wings-repair-ui-20261017.json).
The owned server/browser terminated. The separate native WebGPU evidence above
establishes its own supported-host scope.
Root reviewed current desktop/mobile picker and HUD captures in both preferences:
aircraft labels fit and HUD fixture regions remain separate. The failure dialog
is usable; the pre-existing mobile failure toast still crowds the footer.

The native worker stopped after two harness readiness failures; the parent fixed
timeout argument placement/HUD readiness and completed flight. Earlier incorrect
kind/spawn-screen captures remain failures, not cockpit evidence. Native probes
used real input/read-only diagnostics and terminated owned browsers/servers.

Two additional F-35 bot-match attempts used normal mouse-aim controls and V.
Both ended with the native Crashed HUD before an own missile launch; the closer
sample reached an enemy at about 1,003 m, but own ammo stayed at two. Global bot
missile counts were not treated as own fire. These are unsuccessful combat
probes, not proof of a missile defect or combat acceptance. No further attempt
was made after the bounded two-failure limit; both owned servers/browsers closed.

## Full catalog gate

The unchanged full 125-entry gate on `b52d942711103d9072abb3e8241725446aa3ef36`
passed **125/125, exit 0**, in **1,579.29 seconds**. Independent log counts agree:
125 visits, 125 `ok`, zero `FAIL`. Wings, Server Survival, Astray, Ovo and Jetpack
Joyride Hacked all passed with zero retained errors/failed requests. Machine-readable
[results and hashes](wings-repair-full-gate-20261017.json) retain all titles.

The external adapter only raises the existing sparse wrapper's free-space floor
to 2,147,483,648 bytes, retains the 300 MiB checkout limit, and restores the coding
selection exactly. Runner arguments, waits, failure filters and catalog are
unchanged. No code or commit changes occurred in the Pi repository during the run.

```text
== 125/125 games pass ==
SPARSE RESTORED: pages=125/125, peak_Games_bytes=195853427, remaining_Games_bytes=0; this is not a gate-pass assertion.
```

The wrapper restored the non-Games gate base, then the external adapter restored
the original coding selection and sparse/config bytes exactly. All four protected
file hashes remained unchanged; HEAD and worktree were clean. Available space at
restoration was 3,402,981,376 bytes. The owned HTTP port was closed and no active
adapter process remained. Environment: Python 3.13.5, Node 20.19.2, Playwright
1.62.0, Chromium 149.0.7827.196, Debian aarch64. Raw external log SHA-256:
`49afcf46a8cbb0c67cf435b4b71bece4d3b270ab77b97a590b7ff3504544eed9`.

Existing broad exclusions remain unchanged and their counts are not instrumented.
This gate establishes catalog loading under those filters, not unfiltered loading,
full gameplay, complete offline closure, aircraft quality, hardware or rights.
Later verification-label and documentation changes do not alter served runtime.

Historical `2d2eb61` failed 124/125 on Ovo `ERR_NETWORK_CHANGED`; this remains a
dated failure. Read-only review found its 30-module graph intact, with 112
relative import references and no missing modules. Basename-only failure logs
cannot prove which same-named module or whether host transport caused it.
No speculative content fix or filter weakening was applied. The error did not
recur in this run; its original cause remains unproven.

## Remaining limits

Operator silhouette approval, native missile targeting/launch, audio, physical
mouse-capture behavior, converted-family parity, Pi GPU behavior and native
load-time comparison remain unverified. Brief desktop frame samples are not
performance acceptance. Source typecheck has not passed; Vite emits its existing
large-chunk warning. Two generated Three shader-template whitespace findings
remain (`assets/aircraft-CQ69fEt-.js:30` and `verification/astra-check.mjs:3848`);
the repair range is not globally whitespace-clean. Authored source/docs are
checked separately. Historical artifact-path and mobile failure-toast findings
remain qualified. Upstream missing LICENSE/redistribution rights remain unresolved.

No push, release or deployment permission is implied by any bounded pass.
