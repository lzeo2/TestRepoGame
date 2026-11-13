# Mapped stores, pool and driving verification, 14 November 2026

Owner follow-up: use real shop locations with parody names (Coles -> Coals),
make them robbable, enclose Manuka Pool more faithfully, reduce lag, prevent
premature medical transfers and make reckless reports less sensitive. Existing
Capital Drive245 only; no new game or catalog entry. Catalog remains134.

## Implemented result

Seven exact cached retail nodes map to source footprints in Manuka, Kingston
and Red Hill. Parodies include Coals, Paperback Chain, Newsweak, Scoot Wholefoods,
The Book Moo, Toe Boots and Super Expressive. Real names remain in provenance
and search input aliases, with parody labels displayed. Approach positions are
estimated public-facing frontages, not independently observed entrances. See
[store sources](../capital-drive-store-sources.md) for exact IDs and confidence.
Two ambiguous Griffith sites and Supabarn were excluded rather than placing a
sign at an unverified remote/back entrance.

Original facade overlays use1288triangles/two merged batches and a local bitmap
atlas. They do not add enterable interiors. Seven mapped tills replace generic
food markers; the gym/arms sites stay fictional. Retired cooldown IDs remain
valid. Proximity within4.8m, building sight, owned/equipped pistol and the existing
four-second activity/cooldown rules control robbery. Remote, occluded and sandbox
actions cannot earn. Each till pays once and retains its cooldown on reload.

The pool uses the exact80vertex site boundary and unchanged basin. Terrain-following
cream walls/iron fences, a physically clear2.16m gate, original heritage-style
entrance/terracotta roofs, tiled deck/lawns/hedges replace the open-field look.
203frozen barrier descriptors match rendering; fences/water block movement while
an actual-map actor sweep traverses the gate. Only the obsolete basin ACT block
collider is replaced. Nearby source community buildings remain. Landmark total
is12790triangles/10meshes/two materials, below16000. Materials, gate location and
entrance details are approximate; public operator/architect text was consulted,
the heritage PDF returned403, and no fresh Street View/photo inspection is claimed.

Traffic preserves six factory silhouettes, colors, windows and cockpit in instanced
batches: an all-visible40car fixture falls from320to19draws (94.1% fewer **traffic
draws**, not an overall FPS measurement). The player car stays full detail and
drivers remain visible. Parked-car collision queries now use the spatial index;
local car/foot sweeps read zero active predicates from2000distant parked vehicles.
Generic signs and mapped facades avoid unchanged-frame buffer uploads. No shared
factory geometry/materials were edited or disposed by these adapters.

Crash contacts now retain actual impact speed. Below8m/s causes no wear, moderate
contacts cause4–24vehicle wear, and body injury starts at18m/s. Contact damage has
an.8second cooldown. A wreck stops and permits E exit; **only character health0**
starts medical recovery. The3.4second transfer/one penalty contract remains.
Reckless reports require close genuine vehicle danger: sustained exposure near
speed16m/s, an extreme close fast pass or actual contact. Report cooldown8seconds
is separate from gun/assault rules. Ordinary50km/h road travel near a footpath
and foot movement stay clear in regressions; actual witness sight is injected.
These are forgiving arcade rules, not an assertion of real ACT offence thresholds.

## Source milestones and fresh gates

- `2a4ec1d6`: reproducible mapped store data/builder/tests.
- `76a40903`: two-batch parody storefronts.
- `4ef2c854`: forgiving damage/medical/reckless rules.
- `1bf9ca7c`: instanced traffic renderer.
- `dcf93bba`: source-aligned pool complex/barriers.
- `05693178`: root integration, physical sites, saves/search and local broad phase.
- `21509855`/`06cfd515`: new browser runner and corrected lifecycle/E sequence.

`python3 -B scripts/check_capital_drive.py`: **68/68 PASS**, comprising25authored
syntax checks,21suite syntax checks,21executed suites and diff check. New suites
cover exact store/source mapping, billboard orientation/disposal, all-model traffic
geometry/colors/claims/resources, actual pool gate/water/fence contacts and all
seven actual mapped till approaches/rewards/occlusion/cooldowns. Store source
suite with the retained cache also passes every tile hash/version, clear source
footprint approach, two byte-identical JSON/JS rebuilds and source preservation.
Legacy cooldown compatibility, mild/severe damage, wreck exit, health-only KO,
normal driving, sustained close danger/LOS and cooldown isolation pass.
Runner Python AST/dry-run pass after selecting the new suite by default; earlier
browser suites remain explicit options. No package/build/install step was added.

## Browser phases and limitations

Two harness failures remain separate: [initial stop/exit assumption](capital-drive-stores-pool-initial-fail-2026-11-14.json)
and [lifecycle failure after interactions](capital-drive-stores-pool-lifecycle-fail-2026-11-14.json).
The first sent one E to a moving car, which correctly stopped it and needed a
second E to exit. The outer Playwright cleanup then masked report writing. The
second reached the interaction checks/screenshots but also exited1during cleanup.
These runs are not counted as clean passes. Raw frames and observed traces remain
in their external directories. The runner now uses ExitStack so browser.close
runs before leaving the Playwright manager. Root reviewed the fix explicitly
and ran the final release check independently.

**Final clean run:32checks PASS, exit0,133.29seconds.** The
[raw receipt](capital-drive-stores-pool-browser-2026-11-14.json) retains short normal
road drive, stop/second-E exit, no wanted/medical transfer, locked initial gun,
parody service list, disabled remote purchase/no cash loss, Street Life route/no
teleport, Coals and Paperback map travel/frontage, Coles->Coals input alias,
source-derived pool gate approaches/interior, both phone themes/no overflow,
retired-cooldown legacy save validation and clean collectors. Zero page/console
errors, HTTP/failed requests or external runtime requests. Server/browser closed.
The legacy save is explicitly isolated input; no positive wallet/wanted state was
granted. Pool inside/outside views use normal Free roam map travel and establish
visuals; physical walking through the gate is separately actual-map suite proof.

Root reviewed actual Coals fascia, pool exterior/interior enclosure/deck and
phone-light frames; tree/parked-car overlap partially obscures some other shop
windows, with names still visible. Screenshots are external preview artifacts.
The measured pool view used108totaldraws/311680triangles, with3trafficcars in10draws
versus24source draws. The all40case reduction is a distinct pure geometry fixture.
Software RAF intervals retained one negative initial warm-up sample, so that raw
observer is not a valid FPS benchmark. Remaining samples were roughly67–100ms
under SwiftShader, with no physical N100 conclusion. No stable hardware frame-rate
or long-duration driving tuning claim follows from the short browser pass.
Natural career robbery completion is covered by authority suites, not a claim
of an earned live browser robbery.

## Preservation and release context

Geographic map SHA256 remains
`f62bdacc290865799023f461b0be923d0fc48a8a7ca75fcfb241637c5790f425`;
addresses, terrain validation and road profiles are unchanged. Store sidecars add
14787byte generated JS and9925byte JSON, with full retained source hashes.
Pool/store graphics remain original procedural art. Source licenses/notices,
protected game, shared car factory, portal and proxy policy are preserved.
The historical fleet123/133 certificate failure hold stays separately reported;
these focused results do not claim a new fleet pass. The user's prior push/merge-all
instruction remains the release authorization. Workspace sparse selection is
restored after verification. No new games were built or registered.

| Inspected source | SHA256 |
| --- | --- |
| `Games/Capital Drive/gameplay.js` | `feba406ba1eb736af7129226dd8c27ad24088b9521ca46ab46b15583289a4b43` |
| `Games/Capital Drive/pedestrians.js` | `d77828d047abdd299014da2b8631b70102649a330b7e74ddc1a9ccd8d67ea36b` |
| `Games/Capital Drive/simulation.js` | `8f4d6d58027d12530ba981a3a46c3758070df399281844b694c13daab3873473` |
| `Games/Capital Drive/script.js` | `6fbf9cb6dc6b7ef045890b262a8bccab117c3e4664d39151a7f3a4154bd3e46a` |
| `Games/Capital Drive/traffic-view.js` | `9eb26cfb4e09d67fce403819a5e918e91161433a946f312b3514f139be57a501` |
| `Games/Capital Drive/stores.js` | `dd5cd29937962e1d585ad8c677ce685d531a52d4d91512bc40e774c913197376` |
| `Games/Capital Drive/landmarks-view.js` | `dafc0bc1989df3a4aaae44268890d2588271a92a68bcacda5854389f595d5017` |
