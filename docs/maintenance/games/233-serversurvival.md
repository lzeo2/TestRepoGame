# Server Survival maintenance

<!-- maintenance-game: Games/ServerSurvival -->

## Identity and status

Catalog 233. Newly ingested upstream game, not a locally invented game. Static native ES modules; no deployment build. Focused browser acceptance passed, not full release acceptance.

## Implementation map

`index.html` provides overlays and controls; `src/main.js` imports `game.js`. `src/state.js` owns mutable state. `src/input/handlers.js` handles pointer, keyboard and camera input. `src/sim/` routes requests through services. `src/campaign/`, `src/tutorial.js` and `src/ui/` provide modes and presentation. Inspected entry/dependencies, startup/reset, input, audio and import boundaries; the whole simulator was not line-reviewed.

## Gameplay and controls

Start Survival, Campaign or Sandbox from the original menu. Place services using the bottom palette and connect them with Link. C selects Link, V selects, X demolishes, U unlinks. WASD pans, Q/E rotates, T toggles view, R resets view, Escape opens the menu. Simulation playback and restart are in the top toolbar. Reputation, budget and processed traffic govern survival; campaign has explicit objectives.

## State and persistence

Upstream localStorage stores locale, sound preferences, campaign progress, achievements and manual saves. File save/import and share-architecture URL features remain upstream implementations. The import path was not security-audited in full. No accounts or runtime backend.

## Dependencies and provenance

See `Games/ServerSurvival/CREDITS.md` for upstream pin, MIT license and exact modifications. Three.js 0.128.0 and compiled Tailwind 3.4.17 are local with MIT notices. Original audio is local. Remote scripts and preview metadata were removed.

## Audit findings

The upstream has a fixed dark interface, small technical labels and a horizontally scrollable phone palette. The final shell sweep adds black 44px action targets, active outlines and brighter secondary text without changing the scene. It does not follow every portal visual token. Technical acronyms remain uppercase. Decorative emoji were removed without changing mechanics. Full campaign, saves, locales and physical touch remain unverified. The baseline maintenance inventory was already stale before this addition.

## Safe iteration

Keep imports relative, and rebuild the static Tailwind CSS when adding utility classes. Do not restore its CDN compiler or blanket console suppression. Preserve upstream licenses. Use the focused regression after changing startup, controls or restart.

## Verification

2026-10-15 [full fleet gate](../audits/fleet-2026-10-15-lane6.md): Server Survival
failed a 15-second `Page.goto` timeout after Wings; the full run failed 122/125,
exit 1. [Triage](../audits/fleet-2026-10-15-triage.md) passed this title alone and
the Server Survival/Astray pair without Wings, but reproduced both failures
after Wings with stalls inside native context creation. Underlying cause remains
unresolved; no runtime fix or filter change was made. These targeted passes do
not replace the failed full gate or renew gameplay acceptance. Lane7 reconciled
the formerly missing inventory record, not the runtime hold.

Historical focused port check: `python3 -B scripts/test_phase3_ports.py ServerSurvival --port 8233`: start, keyboard C, native firewall placement ($500 to $460), play/pause, restart ($500/empty): PASS. Console errors 0; HTTP errors 0; external requests 0 with remote traffic blocked. Screenshots: `docs/phase3-evidence/ServerSurvival-{desktop,mobile}-{light,dark}.png`; both preferences retain the upstream dark theme. SwiftShader is functional evidence, not target-GPU performance or native touch acceptance.

### Static metadata receipt (2026-10-15)

Only the entry head description changed. Entry/tree matched inventory at `e787681`.
[Metadata checks and exact paths](../audits/fleet-followup-descriptions.md).
No engine audit or gameplay acceptance; source-coverage limits and known holds remain.

## Future outlook

Exercise campaign completion, corrupted saves, audio toggles and real touch controls separately. No publication or full-catalog smoke claim follows from this focused port test.
