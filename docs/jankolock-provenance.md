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
**No game or ID is registered yet.** No runtime/game files have been authored.

## Supplied portrait and local dependency provenance

Operator explicitly requests use of their photo-derived in-house bas-relief,
generated2026-10-20, as the lobby trophy. Supplied artifact name:
`photo3d/out/portrait_relief.glb`. It appeared after the initial absence check.
Source/likeness permission is recorded as operator-supplied/requested use, not
an independently adjudicated rights opinion or MIT asset license.

Exact SHA-256 `abe1b2ee07038d6926813542a2127bca06cb19564f535dd49c593ea60c199fc9`;
10,972,672 bytes,421,968 triangles in metadata,1 mesh/material. Prior read-only
header/chunk/JSON inspection found no resource URIs; full integrity/fresh
`glb_stats`, game load and exact-file game preview remain **NOT RUN**. The
supplier's own receipt reports photorealistic-quality **FAIL**; preserve that
qualification even though the operator requests a photorealistic feature.
Two existing supplier previews were visually reviewed, not newly rendered.

Choice: preserve exact GLB bytes and keep it **lobby only**, not decimated or
loaded into combat. Use a simple pedestal collider, not mesh-triangle collision.
After disk clears, copy to `Games/Jankolock/assets/portrait_relief.glb` only if
integrity passes. File absent/invalid => disabled local manifest and truthful
unavailable state, no fake portrait or missing-file runtime fetch.

Read-copy only Circuit Ward's r160 `three.module.js`, `GLTFLoader.js`,
`BufferGeometryUtils.js` and `LICENSE`, with relative local imports and retained
MIT notice. Pin `d04539a76736ff500cae883d6a38b3dd8643c548`, closure1,414,498 bytes;
four donor hashes were previously checked. Donor files remain untouched.
No asset/library copying has happened. No CDN/network fallback is allowed.

## Capacity gate and current delivery

Initial free root bytes1,941,528,576; prior handover1,881,178,112. Fresh follow-up
measurement **1,286,856,704**, below the higher-priority **2,147,483,648-byte**
floor. User permission for small game files does not override that repository
rule. No bulk checkout, dependency install, asset copy, browser, cleanup,
garbage collection, history rewrite or outside-repo deletion is permitted here.

Existing design was replaced with a shorter pivot contract, preserving prior
puzzle evidence in research/Git. No build workers were launched below the floor.
No engine, roster/UI, portrait module, playtest, screenshots or smoke PASS is
claimed. Target ports remain>=8910 when unblocked. Catalog unchanged125; zero
games added, no push. Owned docs are committed separately from sibling dirt.

Owner-action capacity request `pi-1379240-1792482819971-0f8a4aef` is retained in
`~/.swarm-help`; prior `pi-1379240-1792466056900-bdb127d8` remains unresolved.
Hermes returned advice only, no owner acknowledgement/capacity relief/waiver.
Unblock requires observed>=2GiB plus build/QA headroom, not advisory permission.
