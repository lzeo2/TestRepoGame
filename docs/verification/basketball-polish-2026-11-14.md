# Steal a Basketballer polish, 14 November 2026

Dates here use Canberra local time (AEDT); the cloud clock was 13 November UTC.
The owner requested improvements to existing PR **#8**, cloud playtesting and
previews, then explicitly instructed merging it after the Canberra continuation
and finally “merge all prs when done with everything.” Canberra **#9** merged
first, at `3c53e344699c3ca98f97b272cc88d28216dd6210`.

This polishes the existing original basketball branch, originally pinned here
at `4ef57fca864b97590ebb414eb7d9c0977517ce01`; it is not an open-source
ingestion. Merging introduces **one unregistered original source project** to
main. The portal stays at **133 registered entries**; inventory becomes **140
projects, seven unregistered**. No catalog ID was allocated. Footballer, Capital
Drive, protected content, proxy, shared assets and fleet smoke filters are unchanged.

## Changes and source boundaries

Original maple planks/grain use one local 512px canvas texture. Navy paint,
coral trim, framed/padded basket supports, smooth tubular rims and cross-laced
nets replace the flat presentation. Exactly **44** named non-colliding arena
rim/net fragments are visually replaced; all **3,333** data primitives,
**366** colliders and the court coordinates remain. Added arena details cost
**1,248 triangles in six draws**. Crowds remain bounded at 24, eight at the first
court tier. Nearby labels are smaller; match views hide world labels and
non-match actors. A real observed low-graphics frame recorded **98 draws and
29,304 triangles**; it is a frame diagnostic, not a hardware speed result.

Athletes have original tapered torsos, rounded heads, generic hair, numbered
jerseys and shoe/sock trim. Elbows/knees bend in existing allocated buffers.
Six merged meshes plus an optional number badge stay within seven meshes and
1,600 triangles; sampled maximum **1,284 triangles**. Resources are released
without disposing shared factory materials. Catalog names do not select real
likenesses. Saved kit changes now rebuild athletes even with an unchanged lineup.

The shell has light/dark panels, clearer score/shot clocks, a genuine first-signing
action, affordability feedback, smaller labels and proper pause/resume. Portrait
defaults to ball-follow; desktop begins full-court. Both cameras, player-follow,
orbit and zoom remain available. Touch steering appears only during manual
control. CSS pause bars and original SVG arrows avoid missing-glyph/emoji icons.
Match timers/availability update existing button nodes, and menus restore canvas
keyboard focus. Unchanged conveyor cards and thief-defense buttons also stay stable.

Several concrete defects were reproduced and fixed:

- Browsing before the first signing exhausted the boot-time NPC timer and could
  immediately lose the only recruit. A persisted, one-time **90-second** learning
  grace now starts on first delivery; replacement purchases cannot reset it.
- THREE could pass without completing the catch-and-shoot. It now preserves the
  perimeter receiver's chosen spot and shoots on catch. Passes track moving receivers.
- The controller discarded elapsed frame time above 50ms, slowing the displayed
  clock under software rendering. A source regression with 200ms frames failed
  before the repair. Active elapsed time now feeds existing 50ms Match steps,
  economy updates are chunked at their 250ms bound, and avatar movement uses
  collision substeps. Catch-up is capped at one second per frame. No quarter
  duration or clock rate was shortened for testing; pause/hidden time is excluded.
- Manual control buttons now wait for live play. Absent match/report diagnostics
  consistently serialize as null. They remain detached and deeply frozen.

## Actual verification

The [desktop receipt](basketball-polish-desktop-2026-11-14.json), revision
`ec23a3f9`, records **16 successful milestones** in 204.82 seconds: ordinary
PLAY, an affordable natural signing, 100 album identities, low graphics selected
through settings, a real five-on-five match, exact pause/freeze/resume, manual
WASD control, camera/orbit/zoom, valid drive/zone calls, full report, actual reward
and saved roster/coins after reload. The match finished **13:6** with **284 coins**
credited. It used four normal 90-clock-second quarters at 3x, no accelerated
fixture, developer roster, cash grant, direct state setter or synthetic result.

That raw receipt deliberately retains **FAIL**: after the completed match/save
checks, the harness assumed an absent JSON `match` key existed during the normal
45-second rest. The API's explicit-null fix has an app regression. Subsequent
checks test that boundary and the remaining flow separately; this is **not**
reported as one combined all-in-one browser pass.

The [23-check continuation](basketball-polish-devices-2026-11-14.json), revision
`33689fd4`, is **PASS**, 107.06 seconds. Normal forfeits give zero rewards, an
absent match is null, and a new match starts after the real rest (49.49 wall
seconds including input/observation overhead). Phone checks cover normal touch
joystick travel, affordable signing, album, live five-on-five, 44px targets and
no overflow. Phone dark/light and landscape renders are retained.

The [final 17-check phone pass](basketball-polish-phone-final-2026-11-14.json),
revision `f26c1a8b`, is **PASS**, 18.02 seconds. It additionally verifies the
portrait ball-follow default after the visual review, with normal touch input,
both themes, landscape and error/request collectors. A separate final
[seven-frame review](basketball-polish-previews-2026-11-14.json), revision
`ea3fd937`, captures standard-graphics desktop/phone gameplay. Root inspected
actual desktop detail, phone dark/light and landscape frames. See the
[preview gallery](../basketball-previews/README.md).

All accepted browser evidence has **zero console errors, page errors, failed
local requests and third-party runtime requests**, without error filters.
Software ReadPixels performance warnings are retained in raw logs. No browser
ability activation is claimed (`abilityUsed:false`); the naturally signed
single-player roster has no granted reserve, so live substitution acceptance is
also not claimed. Engine ability/substitution rules have pure fixture coverage.

Focused commands passed: **12** authored/test JavaScript syntax checks, **four**
Python ASTs, the integration/game flow, match, world and actor suites, the
**80-case** offline process-verifier suite and the actual-app UI boundary check.
The latter uses **59 bounded RAF callbacks** and the real installed handlers for
PLAY/signing/BATTLE/control, stable menu nodes, pause/deadline freeze/resume,
absent-match null and slow-frame elapsed-time retention. Its DOM/Canvas/renderer
boundaries are doubles, not native play. The deterministic compressed match
finishes 4:0 with identical fixed-step 30/60Hz results; actor tests cover ten
grounded poses, finite buffers and idempotent disposal. A world regression checks
kit changes with an unchanged lineup. New SVG path support fixes the restricted
fixture parser, not the browser's valid markup.

Earlier [attempt receipts](basketball-polish-attempts-2026-11-14/) retain their
original failures/stopped status. They exposed inert duplicate selectors,
non-atomic target replacement, phase-sensitive control/calls and the elapsed-time
defect. The obsolete timing run was explicitly stopped after its source regression
proved the bug. Selectors were scoped to the active dialog, actual input retained,
legitimate rest/live-state conditions respected, and no positive assertion or
error filter was weakened. Temporary servers and owned browsers were shut down.

## Reproduction and limits

From the narrow checkout at the repository root, with existing Node/Python:

```sh
node Games/StealBasketballer/tests/fixture.mjs
node Games/StealBasketballer/tests/match.mjs
node Games/StealBasketballer/tests/world.mjs
node Games/StealBasketballer/tests/actors.mjs
node --experimental-vm-modules scripts/check_basketball_boot.mjs
python3 -B scripts/test_basketball_process_verifier.py
python3 -B scripts/test_basketball_polish.py --artifacts <external-output>
python3 -B scripts/test_basketball_polish.py --followup --artifacts <external-output>
python3 -B scripts/test_basketball_polish.py --phone-only --budget 180 --artifacts <external-output>
python3 -B scripts/check_maintenance_docs.py
python3 -B scripts/generate_sitemap.py --check
git diff --check
```

Browser checks use installed system Chromium/Playwright, one bounded browser
and local server. Downloads/installations, mass simulations and persistent
servers are not part of the workflow. The
[development skill](../../.agents/skills/basketballer-development/SKILL.md)
records the state owners and separate evidence phases.

The current cloud passes use headless software WebGL. They do not revalidate the
historical native sandbox diagnostic or measure Intel N100 / 8 GB performance.
Arcade proportions and simplified rules remain; no out-of-bounds, traveling,
double-dribble, timeout or disqualification simulation is newly claimed.
Real-name identity rights remain unreviewed, and there is no new catalog entry.
See [credits](../../Games/StealBasketballer/CREDITS.md) for original/private-sibling
provenance, curated-name limitations and local dependency notices.

The full-catalog smoke was **not rerun**. Its dated
[12 November result](capital-drive-2026-11-12.md) remains **123/133, exit 1/HOLD**,
with ten unrelated certificate failures. This is not a fresh all-games pass.
The explicit owner merge-all order authorizes proceeding with the reported hold.
No fleet filters, TLS policy or security/proxy boundary was changed for a pass.

## Milestones and footprint

Five disjoint worker scopes covered court/world rendering, athletes, rules,
economy and QA tooling. They used bounded tasks, explicit-path commits and
exclusive index windows; root owned UI, integration, subjective review and release.

| Commit | Scope |
| --- | --- |
| `decbf3ac`, `fde5a866`, `f5d368f6`, `3ac3ecd7` | Original PR's renderer, match, economy and UI |
| `1293bc37` | Merge already-shipped Canberra #9 into basketball branch |
| `f1c59adb`, `f78d419f` | First-recruit grace, tracked passes and catch-and-shoot |
| `9d5806d8`, `f4ceac72` | Court geometry/materials and articulated athletes |
| `d44d9c49`, `b07bcc4e` | Responsive UI, pause and stable live menu |
| `d2923dc5`, `e2a6c128` | Elapsed time, live control guard and focused arena |
| `33689fd4`, `f26c1a8b` | Explicit diagnostic null, portrait framing, kit refresh |
| `0d7f5215`, `10371f07`, `ec23a3f9`, `ea3fd937` | Bounded QA and fixture improvements |
| `9b427fe8`, `dc1694c9` | Manual, provenance and final behavior reconciliation |

Game payload is **27 files, 2,793,315 bytes**, compared with 25 files/2,767,042
at the incoming PR head (**+26,273 bytes**). New source modules/tests are original;
vendor/font bytes and both data files are unchanged. Game tree:
`49eff5657b38cf8fdbdad1a2e6f97da80e0c4bd6`.
The 1,037,820-byte world file has SHA-256
`ed308bbcb6cce6a7d475760dd9c0b1a287a50db9ccf8f3e82f2acf955ff19651`;
the 160,870-byte catalog has SHA-256
`0ed6760d93a6275909ffe39eea957b765c6436e174168c29566122ad9cea70d3`.
Raw browser receipts contain the actual module hashes for each phase.

A separate **461,738-byte playable ZIP**, revision `dc1694c9`, contains all 27
game files, notices, per-file hashes and local-server launch instructions. Git
byte equality, local import/font closure and ZIP CRC checks pass. More than
27 GiB remained free. Previews/evidence and inventory reconciliation are separate
commits; inventory reflects committed source rather than workspace guesses.
