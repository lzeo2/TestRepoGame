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
- Startup follow-up source builder: **28 files, 4,979,106 bytes**, esbuild 0.28.2 / Three
  0.186.0. Browser entries, CSS, imports and terrain worker resolve. Fonts were
  changed to relative delivery URLs in authored HTML, as in the prior port.
- Regenerated `port.patch` includes the reviewed terrain-worker handshake and
  lifecycle repair. Fresh application to the hash-verified upstream pin reproduces
  the authored source byte for byte. [Startup verification](startup-verification.md)
  separates its CPU contracts from the still-missing native proof.
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

[browser.json](browser.json) retains three startup-follow-up attempts, all HOLD.
Persistent-context launch failed at 10s, then a bounded retry ended exit 124.
The separately authorized manual-Chromium/CDP route connected and created its
non-persistent context in **17,677.85ms**, but its 55s supervisor expired in the
menu phase before a new screenshot or product/gameplay sample. This is not a
connection failure or proof that the product gate failed. The PNG above is prior
lobby evidence, not an attempt-3 image. Independent all-zero browser/driver/collector
postflight and exact leftover-profile removal establish resource handoff only.
World `b16dd16` received explicit release; no unrelated process was stopped.

Collector-only follow-up now persists phases/first errors before cleanup, retains
atomic attempt history and verifies subreaper-owned descendants, including children
whose leader exited or whose argv lacks a profile token. A no-browser escaped-child
regression passes; this follow-up has not been browser-retested. The one supervisor
remains 55s, separate from the product's 30s boot / unchanged 20s readiness bounds.
Valid product proof may survive collector timeout separately, but none was measured
here. [Startup verification](startup-verification.md) records exact limitations.

Local diagnosis remains under `.tmp/wings-boat-order-render-diagnosis/FINDINGS.md`.
The **post-connect/menu** ticket `pi-829842-1792641745174-2ca752e0` is marked
answered, with an empty response; this supplies no new diagnosis or permission.
Answered review 51 confirms a latent ownership finding, not an active orphan;
independent postflight was all-zero. See the startup receipt for exact wording.
The operator directs staging-only finalization: no new browser permission, no
supervisor reruns and no push. Missing native evidence remains a release HOLD.

## Remaining gates and scope

Full catalog gate remains deferred and unrun here; current catalog has 127 games.
No game, catalog ID, multinational jet or third-party asset was added by this
lane. Original jet/model bytes, Character AI and disabled proxy boundaries are
unchanged. Root stayed above the 2,178,940,928-byte storage guard. Initial whitespace diagnostics were resolved by the pinned builder lowering template
literals to escaped strings, preserving shader values, and by normalizing empty
patch context lines. Fresh patch application still reproduces identical source.
Final full staged diff check passes; no minified shader string was hand-edited.
The lobby image predates the later collector attempts; it does not show CTF.
The subsequent operator-authorized CTF work is not implemented by this checkpoint.
Patrol and existing defaults must remain unchanged; catalog claims wait for real
implementation and CTF lobby/flag-run/boat-route evidence.
