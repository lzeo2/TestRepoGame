# Fleet follow-up: final handover (2026-10-15)

This dated handover preserves the earlier failure. The fresh 2026-10-17 repair
run passed 125/125; see its [separate receipt](wings-repair-20261017.md).

## Disposition and scope

**Integrated, not released. Latest full gate COMPLETE: 124/125, exit 1; HOLD.**
The [final receipt](fleet-followup-full-gate.md) records all 125 visits at
`2d2eb6159bac85218a1e56b47a4937e6e3849820`, 124 ok and only Ovo failing three
`ERR_NETWORK_CHANGED` requests. Jetpack Joyride Hacked, Wings, Server Survival
and Astray logged ok. Exact original sparse/config restoration, unchanged hashes/
HEAD and clean tree confirmed; owned processes ended and port8986 closed. No
smoke screenshots. Earlier **122/125, exit 1** stays historical: zero successful
full gates out of two recorded runs. This final documentation lane ran no browser
or gate. Root network cause is not proven; stable-host diagnosis/rerun ticket
`pi-364975-1792055134651` is pending, not a blanket-retry/filter waiver.
Catalog remains **125 registered / 130 projects**, five unregistered; shared
emulator runtime separate. No games added, ingested, invented or registered;
new-game build/register commits: none. No push or publication permission.

The historical pre-gate documentation delegation started clean at `d435f12`, owned only
`docs/maintenance/**`, `CHANGELOG.md` and Wings model-document grammar/status.
No runtime/source/script/model/generator changes, installs, fetches, branch,
sparse, history rewrite, garbage collection or origin changes by this lane.
Main owns screenshot judgment and release decisions. Historical reports and
hashes remain dated evidence, not silently rewritten acceptance. The final
handover delegation starts clean at `2d2eb61` and owns only maintenance docs and
CHANGELOG, with no inventory refresh or Games/model-document edits.

## Approved remediation and identity verification

Operator decisions in tickets `4821714` (source/metadata) and `6228936`
(identity) were answered before this task. Main reports the approved bounded
rebase preserved all trees/subjects, without GC or origin changes. This lane
independently compared all eight old/new tree objects and subjects against
external evidence `trg-fleet/followup/identity-map.json`, then inspected Git log
and author/committer fields for all 15 mapped/follow-up commits through `d435f12`.
All matched the approved nonpersonal identity; no personal address is reproduced.
This certifies that bounded commit range, not all repository history or content.

| Historical hash | Current hash | Preserved subject |
| --- | --- | --- |
| `1b1915bec99c3a73adb110afa503ef33a8da0f4c` | `d0d89d0f150cce291cc573f5f1ed6a9aa78205ab` | chore: verify Wings launch failure boundary and record source hold |
| `3ab3c1a275e2380170c5a620e57a49446c5bec14` | `4b6fe97702a2e02c7e8511721a7422809365f588` | chore: add measured portal payload budget regression |
| `39f4ef3a0b8a00f80bd805ebbccdd95e36cb59dd` | `7c71de10d2246d67e9174b90aa8138aeb9bc0705` | feat: add two original low-poly Wings aircraft models |
| `2680ee0bb5c5845cf5ca691cbaebd167f8134e2a` | `02bf8ee7799f36d52790f41e048efe86ededcf84` | feat: add subpath-safe portal SEO and install metadata |
| `5ed48f49094d8d1b4ac4989ff9e827d0ab5ba904` | `1c3f4c7308613cd184a67aae904d96024a656d61` | fix: keep portal filter recovery and keyboard focus predictable |
| `ce00dea` | `b3d84da` | docs: triage failed fleet gate and reproduce Wings context stall |
| `1462411` | `608d646` | docs: diagnose portal timeout holds with fresh fleet evidence |
| `dbba68d` | `e787681` | docs: reconcile fleet inventory and record blocked release handover |

Follow-up log verified: `766d387` Jetpack metadata/diagnosis, `c88a762` receipt
clarification, `bdf82dc` recent-history snapshot, `3b9e92d` lazy Wings renderer,
`f71f298` static descriptions, `29a43ac` metadata postcommit checks, `d435f12`
Astra integration. This lane first committed model-document grammar/status as
`a9d5e4f`, so the inventory can include that Games text change without bypassing
the checker's committed-source requirement. All staging uses explicit owned
paths and the shared Git lock, with approved nonpersonal author/committer fields
and automatic GC disabled. Final follow-up log also verifies `edc6ff4` integrated
handover, `b5a7158` artifact rebuild and `2d2eb61` current inventory. Independent
final inspection confirms all eight mapped trees/subjects and all 19 mapped/
follow-up identities through `2d2eb61`; values withheld. The five inherited
identity findings are resolved, not pending. This is not all-history certification.

## Source, metadata and portal findings

- Restored Wings source pin `bf5f6277e38ee52e9bfa4ae4a01337b46175c181`
  is reported clean/read-only before and after staging. Task1's
  `trg-fleet/followup/wings/source-check.json` records that pin and clean status.
  No refetch/install or pin/cache mutation. External staged source plus cached
  dependencies rebuilt via Bun/Vite; `port.patch` applicability passed against
  the pin. See [source/build receipts](fleet-followup-wings.md). This lane read
  the changed lifecycle, handling, camera, descriptor and regression source
  boundaries; it did not perform a full engine/vendor audit or another build.
- [Static descriptions](fleet-followup-descriptions.md): **124/124** nonprotected
  entry heads, Character AI explicitly excluded/read-only. The metadata lane
  changed 108 entries and their 108 manual receipts, retained 14 descriptions;
  Wings and Jetpack were separate owners. Independent baseline comparison here
  passed all 122 owned entry byte-preservation checks. Character AI tree unchanged.
  OG remains 5 titles / 3 descriptions; no complete social/indexing/hosted claim.
  No tracking, new runtime dependency or third-party load was added.
- [Portal history](fleet-followup-history.md): one fresh validated snapshot per
  sort reduces **1,374 reads/parses to one**, preserving deduplication, cap and
  order. This is a measured redundant-work fix, not a proven cause of every
  readiness failure. Final fleet runner passed in 21s; original refurbishment
  failed twice at unchanged 5000ms assertions. Original full fullscreen reached
  real Snake and a denial capture, then exited **124 at 650s** without final
  result. Partial captures are not a full fullscreen PASS. No timeout/filter
  weakening, guessed DOM reset or fabricated root cause.
- [Jetpack](fleet-followup-jetpack.md): three fresh boots completed collection
  with **zero transport failures**, not three clean gameplay passes. Original
  seven request failures remain incompletely reconstructable (only three samples).
  Malformed SDK script loading HTML reproduces separately; audio-device errors,
  slow local decoding, cheat/input/save contracts remain findings. No unjustified
  retry, engine patch, SDK restoration or suppression was added. Run3 reached
  actual menu/play; full gameplay, restart and cheat acceptance remain held.

## Wings integration, model integrity and visual limits

`3b9e92d` removes unsolicited menu `bootScene()` while keeping explicit Play's
first-draw gate. Native same-browser Wings -> Server Survival -> Astray changed
**1/3 before to 3/3 twice after**. This addresses menu lifecycle, not the flight
shader/driver root cause. Initial auto-quality benchmarking moves to return from
successful play and still needs hardware verification.

`d435f12` integrates both approved Astra models into Custom Aircraft selection,
validated offline spawn, simulation/wire kinds, descriptors, cameras/audio and
hangar keys 6/7. Existing five kinds and renderer failure gate remain. The worker
committed but hit its 20-minute deadline before final output; task logs exist at
`trg-fleet/followup/wings-task2/`. Its sequence recorded **2/3** (Astray reload
ERR_ABORTED), then **3/3 twice**, including final build. Keep the transient failure.
Main independently passed Astra/solo/model/static SEO checks; this lane repeated
the nonbrowser checks successfully. No supported-GPU acceptance.

GLBs and generator are unchanged against `e787681`, with exact model checks:

| Model | Bytes | SHA-256 |
| --- | ---: | --- |
| Interceptor | 46,840 | `4b718b8b7fe0c32c85adb373b421dc08e4500bef4ae87f82c62fcba5ca4bf83e` |
| Trainer | 55,712 | `98f01e24c65201e70da94ceaf3638555880ed9ecea1595dcb082e2ed490c7b1d` |

Interceptor cruise/boost **145.8/199.8**, turn-response scale **0.94**;
trainer **121.5/166.5**, scale **1.08**. Cockpit pitch offsets **0.02/0.035 rad**
are provisional. Trainer retains arcade fighter physics/audio/weapons, not a
real propeller simulation. Full contract: `Games/Wings/docs/models.md`.

Main reviewed actual desktop-dark and mobile-light picker screenshots: names fit,
focus visible. Upstream dark shell remains; failure toast/footer is still crowded.
No polished-flight claim. Four unavailable-GPU UI cases and renderer-free spawn/HUD
fixtures cannot establish real flight, converted colors, thumbnails, prop animation
or cockpit visibility. The isolated actual Wings converter/material attempt hit
**40s, exit 124**; no completed converted-material screenshot/PASS. Historical
standard-Three model previews remain separate. Native takeoff/combat/crash/respawn,
exit/restart and supported-GPU shader/compiler diagnosis remain held. Pending
operator ticket **1792052078368** is not resolved by this report; underlying
renderer and portal timeout causes are not invented. Missing upstream rights
qualification remains independent of approved original model generation.

## Global diff findings: not a scoped PASS

Actual `git diff --check e787681..HEAD` at integration returned **exit 2**, with
**22 diagnostics** in two generated files:

- `Games/Wings/assets/aircraft-BFgSn1xg.js:30`: trailing shader-literal whitespace.
- `Games/Wings/verification/astra-check.mjs`: 21 trailing-whitespace or
  space-before-tab findings, including shader literals at 8499-8509.

The source-built regression imports Three/camera/aircraft descriptors. Generated
module boundaries identify bundled Three core/module and shader chunks; inspected
physical shader text includes those mixed-indent literals. A 12-line regression
fragment matches the escaped cached Three 0.186.0 `three.module.js` text verbatim.
The runtime trailing space traces to `three.webgpu.js:44560`, BarrierNode's
WebGL shader-comment template. Initial literal/identifier probes did not match;
escaped-string comparison and actual vendor identifier inspection established
these anchors. Vite/Bun rebuild receipts establish generated/vendor origin,
not a waiver. The test bundle is
**884,415 bytes (about 864 KiB)**, generated test-only, not a new runtime entry
payload. Existing `Games/Wings/THREE-LICENSE.txt` is unchanged and retained.
Main reviewed the whitespace finding. No hand-edit, whitespace-filter weakening
or scoped-PASS-as-global-PASS is permitted.

Additional inspection found three machine-specific source-path comment lines in
the original regression bundle. This violated committed-path hygiene even though
it was test-only generated output. Paths are deliberately not reproduced here.
Commit identity remediation does not fix this separate content finding.

Subsequent artifact-only correction rebuilt unchanged `d435f12` regression source
with Bun 1.4.3 using `--preserve-symlinks build astra-check.ts --target=node
--minify --outfile=astra-check.mjs`, without sourcemaps. Current output is
**539,850 bytes**, down **344,565 bytes (38.96%)**; all three host-path comments
are absent and home/temp prefix scans return zero. Existing Three MIT notice,
source logic, runtime bundles and GLBs are unchanged. Astra stdout matches the
old bundle byte-for-byte; Astra, original solo, model and syntax checks pass.
Two rebuilds produced identical output. See the [corrected rebuild receipt](fleet-followup-wings.md#regression-artifact-rebuild-correction)
for hashes, exact shader-whitespace locations and commands.

The current-change `git diff --check` passes, but the baseline range still has
**22 diagnostics, exit 2**: 21 regression shader-literal findings plus the
untouched runtime `aircraft-BFgSn1xg.js:30` finding. No hand-edit or suppression.
Current rebuild commit is `b5a7158`; inventory was reconciled in `2d2eb61` and
now passes 125/130 coverage without another refresh. Original `d435f12` artifact
path history is **not remediated**; pending ticket `1792053112900` concerns
separately authorized history cleanup. Completed identity remediation is distinct.
No history operation occurred for this artifact. The correction itself added no
full-gate, rendered-flight or release claim; latest failed gate is recorded above.

## Inventory and actual pre-gate checks

Compared current Git trees to all 130 inventory records before refresh: **110**
changed projects (108 metadata lane, Jetpack metadata, Wings rebuild/model docs),
20 unchanged, shared runtime unchanged. Metadata baseline checks, actual source
patch/diff inspection and the bounded worker reports precede reconciliation;
this is not blind hash refresh or an exhaustive gameplay re-audit. All source was
committed, including text-only model-doc correction, before deliberate refresh.

Independent commands/results in this lane:

- `python3 -B scripts/test_portal_seo.py --check --metadata-baseline e787681`:
  `PASS metadata-only: 122 owned entries unchanged outside the approved description patch`;
  `PASS descriptions: 124/124 nonprotected entries; Character AI unchanged; byte-preserving parser fixtures`;
  `PASS static: 125 games, 126 sitemap URLs, metadata/manifest/3 icon sizes`.
- `python3 -B scripts/generate_sitemap.py --check`:
  `PASS sitemap: 125 Git-backed game URLs + portal; base=https://lzeo2.github.io/TestRepoGame/`.
- `node Games/Wings/verification/astra-check.mjs`: both selectable kinds, offline
  config/spawn/snapshots, ordinary-input takeoff/turn, immutable GLBs, descriptors
  and cockpit math PASS; explicitly no rendered-flight/material/thumbnail acceptance.
- `node Games/Wings/verification/solo-check.mjs`: ordinary-input takeoff, fresh
  session, crash/respawn PASS; rendering not tested.
- `python3 -B Games/Wings/verification/check-models.py`: both exact hashes/sizes
  above PASS. Generator/model diff against baseline empty; Three notice unchanged.
- Identity/map validation: `PASS: 8 identity-map trees/subjects preserved; 15 mapped/follow-up commit identities approved (addresses withheld)`.

Deliberate refresh and check, both exit 0:

```text
Inventory: 130 games, 125 registered; shared runtime separate.
PASS: 130 game documents cover 125 registered + 5 unregistered games; Git inventory current.
Coverage only: section presence does not certify documentation accuracy or gameplay.
PASS inventory diff: 110 reviewed project records; 125/130 counts and shared runtime preserved
```

Working documentation `git diff --check` exited 0; this does not supersede the
failed global range check above. Pre-growth free space **2,331,766,784 bytes**;
post-edit/check checkpoint **2,328,666,112**, shared delta **-3,100,672 bytes**,
still above 2 GiB. Final postcommit status/free bytes accompany the worker return.
No browser server was launched by the documentation lane. The pre-gate wait
instruction is now superseded by the [completed gate](fleet-followup-full-gate.md):
124/125, exit 1, exclusions unchanged and counts not logged. Final docs rechecked
maintenance/sitemap/static SEO/node syntax successfully; owned-doc whitespace
passes but global diff still fails with 22 findings. No further browser retry.
Gate free bytes before/minimum/after: 2,347,466,752 / 2,221,498,368 / 2,346,995,712;
measured interval delta -471,040, not a fleet-wide storage estimate. Release held.
No unrequested push, supported-hardware, full gameplay, rights or crawler acceptance.

External evidence digests (SHA-256; paths relative to `trg-fleet/followup/`):

| Evidence | Digest |
| --- | --- |
| `identity-map.json` | `47804ca565be35b1180c51811ebc0cb5fa5dad96380288246c8a39fc82529069` |
| `wings-task2/context-final.log` | `f7664342b952d2220c55a02b1922115ad51e34cfa510ae2a3ef7a462cc6c6ead` |
| `wings-task2/ui-final.log` | `3c7fc654f624aec2b44ab471725714ba98bc08c73d040ac7a12e2b7de7d31e69` |
| `wings-task2/astra-deployed.log` | `cc330feae2351853bc491f52ab301f62ae817176851c1fb72df82c91271d4262` |
