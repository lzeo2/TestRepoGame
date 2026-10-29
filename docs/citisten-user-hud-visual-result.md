# Citisten current-entry HUD visual verification (2026-10-29)

## Boundary and result

The operator-relayed DOM-only admission superseded the previous no-browser hold
for **one** bounded pass. Source was frozen at
`3bcc0748a45819008231573770a0a5c3d24f4da2`; runtime code remains `78faf916`, game
tree `1500eca1b81e4ffa8b5cc6a8c9f242256e0c7043`. No runtime or asset changed.

**PASS: 8/8 default-town viewport/theme DOM checks**, four reviewed JPEG contact
sheets containing both themes. Actual native entry, simulation, UI and CSS ran,
but the world/renderer was explicitly doubled. The blank background is the
fixture, NOT a broken or accepted native town. Every sheet states this visibly.
WebGL calls were rejected by the fixture guard; **zero were attempted**.

This establishes bounded HUD layout/interaction evidence, not whole-game polish,
terrain rendering, seed appearance, shaking/artifact resolution, native input or
Water/Save/Continue acceptance. Original native captures remain **0/5**.

## Execution and actual findings

Command: `python3 -B .tmp/citisten-user-repair/layout1/run.py`, exit **0**.
The runner reuses the existing declared DOM world double, pins the system Chromium
binary, blocks external requests/service workers/downloads and does not install
anything. Initial `pgrep`/actual-executable scans and active-lease scans were empty.
Slipstream's prior release included actual cleanup evidence; release alone was
not treated as admission. No competing browser was launched or interrupted.

| Actual viewport | Header bottom | Closed Controls bottom | Builder top | Themes |
| --- | ---: | ---: | ---: | --- |
| 1367 × 910 | 170.77 | 309.95 | 825.61 | dark + light |
| 1024 × 768 | 200.77 | 339.95 | 683.61 | dark + light |
| 854 × 569 | 200.77 | 339.95 | 484.61 | dark + light |
| 390 × 844 | 267.55 | 415.53 | 730.00 | dark + light |

All eight cases checked header text bounds, horizontal overflow, default collapsed
Map/Controls, header and builder separation, minimum 44px target bounds and actual
center hit tests. Camera buttons and Speed were reachable through normal expanded
Controls scrolling; expanded z5 and closed controls behavior worked. Normal Service
then Water selection succeeded after closing Controls, without force-clicks.
Paused simulation snapshots and the isolated profile's save-slot value remained
unchanged while viewport/theme/tool selection changed. This is not a populated
saved-town browser continuity test.

Page errors **0**, console errors **0**, failed/external requests **0**. The local
server recorded **34 byte-identical unmodified responses + 1 declared world double**
(24 MJS, 4 JS, 2 CSS, 3 fonts and the remaining entry responses). These are local
fixture entry/dependency identities, NOT new public HTTP/MIME proof or execution
of the real world dependency graph. Prior 233-file production proof remains tied
to the older release. The current 233-hash source freeze is unchanged.

## Subjective review and limits

All four contact sheets were opened and reviewed, both panels each. Text has solid
backing and readable contrast in both themes. Utilities visibly say available,
needed and No demand; the right-hand text wraps instead of clipping. The Road
next-action text distinguishes selecting from placing, costs are visible, buttons
are clearly labelled and Map starts collapsed. Phone Housing capacity and goal
text wrap to multiple lines without truncation.

**Density caveat:** 854×569 remains crowded: header alone takes about 201px and
Controls/notices occupy more of the upper-left canvas. Phone HUD also remains
substantial. The checks prove no tested clipping or inaccessible targets, not an
optimal playable view or a first-time-user study. Actual town visibility behind
these panels must still be reviewed with a responsive native renderer. No new
layout change or second browser launch was made to manufacture visual success.
Open economy/research panels, dense-town values, incident states and native canvas
interaction are outside this default-town capture pass.

## Evidence and closure

Raw JSON is archived losslessly in `citisten-user-hud-visual-results.json.gz`.
Uncompressed SHA256:
`524ebde993904eccc86c9f8c39a071f14ff0195112e817e27348754806ff8f7c`.
Local runner SHA256:
`53d1d6d3e9fc9e3fb8b166663494582cbd49fefb156ef503dd0ac70ad3e88b35`.
Declared world-double SHA256:
`b395b0fc2b110b5f72418f4c622beb3043500343eef0991466fa391757bff4c4`.
Raw run/log and images remain under `.tmp/citisten-user-repair/layout1/`.

| Contact sheet (both themes; explicit fixture caption) | Bytes | SHA256 |
| --- | ---: | --- |
| `hud-dom-1367x910-both-themes.jpg` | 162305 | `d53e8264b376a1b8a6dd2e3e8153e936a687a76367d5541c188a126c91890107` |
| `hud-dom-1024x768-both-themes.jpg` | 135679 | `7bda9ac355ef55784480d062b091da8bd6bc3b2127f41555d152ed4e53a7af68` |
| `hud-dom-854x569-both-themes.jpg` | 121186 | `92d59e20c538f3d88fdf16d661f263a10b402d547633ce8950c40fab46c7d32b` |
| `hud-dom-390x844-both-themes.jpg` | 103663 | `e4fdb77d05aaf4fa52aafdf4448fd20d8a84a5145cedf32ede7641079fd5d681` |

Four JPEGs total **522,833 bytes**, below even the earlier stricter 2MB aggregate
budget. No extra JPEGs or persistent PNG screenshots were created. Live observed
owned evidence/profile peak **1,699,550 bytes**, plus **1,000,000 reserve** =
**2,699,550 / 11,000,000 bytes**. Run including cleanup **16.743s**, cleanup **0.802s**,
within the 110s + 25s bounds. Root free space was **2,542,661,632** before and
**2,542,006,272** immediately after; this shared-host delta is not wholly attributed
to these files. The 2,147,483,648-byte floor was not waived.

All ten recorded owned PIDs gone, profile absent, port 45593 closed; independently
rechecked after the run. Lease `citisten-user-hud-browser-20261029-layout1.json`
explicitly released from actual closure. Sparse/config bytes and sparse font
absence unchanged; source remained clean/frozen throughout. No further browser
admission is inferred. An initial ad-hoc privacy audit falsely matched ordinary
`road/home/service` prose as an absolute path; the corrected boundary-aware check
passed without altering source or the archived raw result. No installs,
model/settings changes, new games, export,
push or deployment. Source branch maintenance still has its historical missing
Brainrot manual; serial main's earlier 135/129 coverage result is separate.

Whole-world shaking, screenshot artifacts, actual seeded terrain, responsive
native renderer/GPU, Water/Save/Continue and hardware/FPS gates remain **OPEN**.
The sole serial integrator owns merge/publication and any new served-source proof.
