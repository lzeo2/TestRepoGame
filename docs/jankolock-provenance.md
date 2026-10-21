# Jankolock provenance and scope

## Current operator order: identity resolved, arena translation

On2026-10-20 the operator explicitly resolved the reference as **Valve's
Deadlock**, its early-development third-person shooter/MOBA, and ordered an
original janky browser translation rather than a port. The operator described
hero abilities, an arena capture objective, combat/round loops, between-round
three-item drafting and best-of-N rounds. This supersedes the initial
unidentified-reference/sliding-puzzle recommendation. Keep other-candidate
research as a [historical appendix](jankolock-research.md), not active design.

The [active design](jankolock-design.md) selects Canvas2.5D offline solo plus
bots, first-to3 rounds, an original roster with two abilities each, capture,
respawn and three-item intermission picks. A separate local three.js lobby
houses the supplied trophy bust; the dense asset never enters gameplay.
Online is documented phase2 only, not implemented or release-claimed.

### Evidence URLs and claim boundaries

Previously retrieved primary sources, independently checked in the first run:

- [Valve Steam store](https://store.steampowered.com/app/1422450/Deadlock/?l=english)
- [Steam structured catalog](https://store.steampowered.com/api/appdetails?appids=1422450&l=english)
- [Official Deadlock site](https://www.playdeadlock.com/)
- [Official-announcement feed](https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=1422450&count=3&maxlength=1300&feeds=steam_community_announcements)

Those receipts establish Valve identity, early-development multiplayer and
combat heroes, not the full exact rules of every current mode. Steam's genre
tags are user-defined. The operator's new evidence summary mentions item-draft
and best-of5 deathball modes; its full pasted search text/URLs were not supplied
in this conversation. Record that as operator-provided context, not a freshly
verified official mode specification. First-to3/capture/scoring/roster numbers
are our original design decisions, not assertions of Valve's exact rules.

### IP wall

No Valve hero names, art, silhouettes, dialogue, text, marks, code, maps, sounds
or level layouts may enter the game. No official affiliation, endorsement,
faithful-port, Valve-unblocked or equivalent-product claim. Only independently
authored names/art/audio/rules implementation; factual genre homage in catalog
copy, no fabricated upstream author. JANKOLOCK is the operator-retained working
name, not a claim of trademark clearance. Operator authorization does not grant
rights to third-party expression. No push is authorized.

## Isolation and catalog claim

Branch `feat/jankolock`, initially based on main's boat-push receipt `a1e7128`.
It pre-existed at that exact HEAD on entry and was selected without resetting
refs. Main is never checked out/modified here. Pre-existing dirty Wings
verification files belong to the sibling swarm and are never staged or edited;
Character AI remains read-only. No other swarms' maintenance audits are owned.

Live follow-up catalog:125 entries, maxID234. IDs235–239 are reserved to trivia.
This task claims **240 only**, subject to another live check before registration.
Implementation now exists under `Games/Jankolock/`; registration is tracked
separately in the [current build receipt](jankolock-release.md). No sibling ID
is consumed. The live maximum is rechecked immediately before registration.

## Supplied portrait and local dependency provenance

Operator explicitly requests use of their photo-derived in-house bas-relief,
generated2026-10-20, as the lobby trophy. Supplied artifact name:
`photo3d/out/portrait_relief.glb`. It appeared after the initial absence check.
Source/likeness permission is recorded as operator-supplied/requested use, not
an independently adjudicated rights opinion or MIT asset license.

Exact SHA-256 `abe1b2ee07038d6926813542a2127bca06cb19564f535dd49c593ea60c199fc9`;
10,972,672 bytes,421,968 triangles in metadata,1 mesh/material. Prior read-only
header/chunk/JSON inspection found no resource URIs; full integrity/fresh
`glb_stats`-equivalent exact-asset accessor/index validation, CPU preview and
SwiftShader game load/render were subsequently run; see the build receipt.
Supported hardware remains unverified. The
supplier's own receipt reports photorealistic-quality **FAIL**; preserve that
qualification even though the operator requests a photorealistic feature.
Two existing supplier previews were visually reviewed, not newly rendered.

Choice: preserve exact GLB bytes and keep it **lobby only**, not decimated or
loaded into combat. Use a simple pedestal collider, not mesh-triangle collision.
After capacity restoration and integrity validation it was copied byte-identical
to `Games/Jankolock/assets/portrait_relief.glb`. File absent/invalid => disabled local manifest and truthful
unavailable state, no fake portrait or missing-file runtime fetch.

Read-copy only Circuit Ward's r160 `three.module.js`, `GLTFLoader.js`,
`BufferGeometryUtils.js` and `LICENSE`, with relative local imports and retained
MIT notice. Pin `d04539a76736ff500cae883d6a38b3dd8643c548`, closure1,414,498 bytes;
four donor hashes were previously checked. Donor files remain untouched.
The four library files were read-copied byte-identical with MIT preserved;
Circuit Ward remained untouched. No CDN/network fallback is allowed.

## Capacity restoration and current delivery

Initial root available1,941,528,576 bytes; the later hold reached1,286,856,704,
below2,147,483,648. No build workers ran then. The operator subsequently restored
capacity and explicitly ordered resume; independently observed2,670,514,176
bytes before build, above the floor. Earlier capacity tickets
`pi-1379240-1792482819971-0f8a4aef` and
`pi-1379240-1792466056900-bdb127d8` are superseded operationally by measured
restoration, not by advisory permission. Formal ticket closure was not received.

Four implementation lanes and subsequent QA/review/fix lanes used pinned sol6.1,
explicit paths and compact ignored logs. No installs, bulk/narrow game checkout,
sparse-selection change, cleanup, gc, history rewrite or outside-repo deletion.
Test servers/profile/screenshots stayed bounded in RAM, ports8910+. Exact game,
asset and dependency additions only. No push. Prior research remains historical.
Native two-round/touch and portrait integrity/software-render results, registration,
smoke receipt, commit list and storage are in [current build receipt](jankolock-release.md).
Owned source is committed separately from pre-existing sibling Wings dirt.
