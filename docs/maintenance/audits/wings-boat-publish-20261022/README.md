# Wings boat integration: staged branch, no push

## Operator scope and delivery

Operator path 2 requested branch `feat/wings-boat-integration` from `origin/main`,
existing boat model only, a visible playable lobby entry, native screenshots,
`wings:` milestone and **NO PUSH** pending operator review. Branch base is
`5739372876bcfc07090f8aeb299e40094af60156`. Main was not rebased or rewritten.
Private checkpoint `c04b506c2db5ccc31aec51ce88f44e2800d8c09e` was recovered intact.
Its full boat ancestry was grafted against the current source patch; the
current main source equals private baseline `77475c0`, including the later lobby
footer regression scoping. No original-main repair was discarded.

Delivered source adds a direct **Speedboat patrol** lobby action and factual
W/S drive, A/D steer, mouse aim, LMB cannon, RMB/V charge and X brake copy.
Custom setup calls its selector Vehicle. Existing seven numbered slots remain;
boat is eighth. Skipper owns both weapons; passenger has none. Water spawn,
held controls, collision/fuse repairs and boat render/audio wiring come from the
reviewed private source. One read-only own-kind diagnostic supports verification.

The runtime references **only `models/speedboat.glb`**. Its original SHA256 is
`1f0eae7f3b962669c2f95f1ce52e3f27cce008595f4875bae41e9274b24da65a`,
1,069,292 bytes, 17,252 triangles. No GLB was changed or added. That existing
asset has no driver node and retains the older roof. Missing `pilot_1` warning,
driver visibility and closed-roof acceptance remain findings, not claimed fixes.

## Build and CPU evidence

- Existing external Three 0.186.0 was found directly in its approved cache root,
  without the stale `/package` suffix. Retained MIT notice matches. No install,
  dependency/version fallback or additional runtime external loads.
- Actual source builder: **27 files, 4,637,377 bytes**, esbuild 0.28.2 / Three
  0.186.0. Browser entries, CSS, imports and terrain worker resolve. Fonts were
  changed to relative delivery URLs in authored HTML, as in the prior port.
- Regenerated `port.patch`: 270,748 bytes. Fresh application to the hash-verified
  upstream pin reproduces the final authored source byte for byte.
- Generated existing-model integration, Astra and solo CPU checks pass. The new
  existing-model check uses actual loader/converter and room inputs for movement,
  no lift, coast, brake, reverse, turn, both seat transitions, cannon ammo/projectile,
  charge ammo/projectile and timed water explosion. Protocol event assertions
  await the actual loopback microtask; no assigned player state or mocked engine.
- The separate candidate `boat-check` remains strict and does **not** pass against
  this older operator-selected model. It is not substituted for a native pass.
  Previous unchanged-suite timing failures are not rerun or declared resolved.
- Eleven obsolete generated assets retired only after a full cached tracked-content
  reference audit. External consumers were the two replaced HTML entries and
  seven historical reports. Those reports remain intact; see
  [asset-retirement.json](asset-retirement.json).

## Browser proof: incomplete, HOLD

[01-boat-lobby.png](01-boat-lobby.png) is a real system-Chromium headless capture
of the delivered menu with Speedboat patrol visible. Parent reviewed its pixels.
**The required in-game water frame was NOT captured.** No native gameplay,
performance, roof, driver or audio pass is claimed. This milestone is not release
acceptance and must not be described as satisfying both requested screenshots.

The earlier instrumented first-draw trial submitted real WebGL2 Low draws
(31 / 85,181 triangles, then 16 / 85,001) while near-field terrain remained unready.
The unchanged 20-second startup deadline failed before GameSession creation.
It was not a zero-draw result; no gate or simulation state was bypassed.

Shared browser-slot holds interrupted a normal capture. A subsequent dedicated
profile attempt exceeded its collector budget; no completed gameplay receipt
was produced. It was abandoned, not retried as a claimed success. The runnable
collector now has an independent 55-second worker supervisor and exact dedicated
profile cleanup; its syntax/help path passes, but that revised browser path has
not been rerun. Parent ps checks eventually found no Chromium/Playwright driver;
slot release was communicated to `bb600c6`. No unrelated process was stopped.

Local investigation findings remain under
`.tmp/wings-boat-order-render-diagnosis/FINDINGS.md`. Native tooling ticket
`pi-829842-1792629513153-fad15e4a` is pending after advisor timeout.
A supported, coordinated native run must supply the missing frame and actual
interaction evidence before a release decision. Operator review and push remain
separate; no push or live deployment verification occurred.

## Remaining gates and scope

Full catalog gate remains deferred and unrun here; current catalog has 127 games.
No game, catalog ID, multinational jet or third-party asset was added by this
lane. Original jet/model bytes, Character AI and disabled proxy boundaries are
unchanged. Root stayed above the 2,178,940,928-byte storage guard. Initial whitespace diagnostics were resolved by the pinned builder lowering template
literals to escaped strings, preserving shader values, and by normalizing empty
patch context lines. Fresh patch application still reproduces identical source.
Final full staged diff check passes; no minified shader string was hand-edited.
The lobby capture predates only this serialization change; authored UI is unchanged.
