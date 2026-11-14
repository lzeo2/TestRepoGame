# Capital Drive campaign and streaming follow-up

15 November 2026. Existing owner-authorized original game245; no game added,
registered or removed. Baseline is merged PR22 `aee76278`. Scope and reproducible
ownership rules are in the [story/streaming contract](../capital-drive-story-and-streaming-contract.md),
[life contract](../capital-drive-canberra-life-contract.md) and
[maintenance manual](../maintenance/games/245-capital-drive.md).

## Changes and source checks

Independent partial introductions survive switching/reload. Each shared chapter
has its own lead hero. Rowan's lunch requires the live noodle throw then melee.
Short supplied-clock scenes precede missions. Job/mini-game attacks are blocked
before offence/ammo writes. Actual school, home and robbery activity owners provide
fresh serials. Mission guides resolve actual doors and indoor stations; Milo has
one named, enterable source-house safehouse. School geometry is an original
interpreted after-hours wing, not a surveyed floorplan. Two bounded outdoor allies
fight live foot police during shared heists. Police have guarded sidearms and a
moving-target intercept/return-to-car estimate.

Full `python3 -B scripts/check_capital_drive.py` output:
**PASS Capital Drive: 230/230 commands passed.** It enumerates69 authored modules,
80 pure suites,12 JSON files and164 required files. Log `capital-followup-full-230-first.log`
SHA256 `9f4c50a79368def7399e89d0d9b3704fe1d96270ab04fa3fb134e58feb93ad28`.
This ran before final controller input/alarm guards and caption presentation
adjustments. A later69-module syntax pass plus nine targeted campaign/gameplay/
police/work/cutscene/mission-location/interior/companion suites passed, with
`git diff --check`; log `capital-followup-final-targeted.log`
SHA256 `eeac04a4fa90b8f2638486c42257a605773d84758bcdc0d0d5c840d6b1789a38`.
A final repeat against the completed in-page overlay passed69 JS syntax checks,
the same nine targeted suites and diff check. Log
`capital-followup-final-overlay-targeted.log` SHA256
`9f2b4994889301ffc26d2f0fc6bcdbea1e86902437121ddd3f492de2ba6d937c`.
Final presentation changes have separate native evidence below; earlier230 is
not falsely described as a rerun against that later presentation.

The actual-map companion admission check recruits two physically clear adults at
all six real first goals, including the real safehouse producer in the finale.
Log `m138-companions-verification.log` SHA256
`e85ea200656874c693927b3c2bd680724d17bb2eb1a72a11521c8b45b35553c9`.
The earlier finale fixture failure is retained in `m127-companions-finale-failure.log`
SHA256 `c9a6a0a8c4f803a7b88e6faa0b26711f3fa479b59f00a37a2e7b9c8e476ba7dc`;
it omitted the real home producer. No collision assertion was weakened. Ground
allies do not board cars, teleport to catch up, or join indoor rooms.

## Actual geometry comparison

Both production adapters now enable real350m-chunk residency, bounded loads and
far eviction/disposal. Source recipes/shared materials stay; distant vertex
arrays are not built until needed. Full source map/colliders, terrain, graph,
addresses and4,200door descriptors remain loaded for offline queries. Exactly one
active room plan/view/people/activity group loads on entry and clears on exit.

| Adapter, actual merged-map Low | Full reference attribute bytes | Opening/settled bytes | Peak across six tested areas |
| --- | ---: | ---: | ---: |
| World | 286,446,573 | 15,835,095 | 16,541,880 |
| Neighbourhood | 19,629,540 | 1,182,060 | 2,011,932 |

World check verifies exact reference attributes/revisits,36-chunk cap,two loads
per update,98evictions,idle reuse/shared atlases and disposal. Neighbourhood checks
exact complete-source attributes,4200door DTOs,2736lazy house bindings,one-load
budget,91loads/76evictions and deterministic revisits. Its full-detail fixture
also retains aprons, signs, gardens and school fencing.

```sh
timeout 120s node scripts/test_capital_world_streaming.mjs --actual
timeout 120s node scripts/test_capital_neighbourhood_streaming.mjs --actual
```

Logs and SHA256:

- `capital-world-streaming-actual.log`: `b2bd56c83083c77438796bc11c822dcb7e885c043c1478f48dd0edaa0b99bd43`.
- `capital-neighbourhood-stream-actual.log`: `1bb41c2cd515dfc1f450143e55bea68904a6cb6ecd80545c8dbe89931dd9e534`.
- Existing actual neighbourhood suite, `capital-neighbourhood-actual.log`: `dfc733658d1f9df583246e253af77bbabe49ff70801f9106a0ef0519bc017497`.

These are attribute-array bytes, not process RAM, GPU allocation, startup latency
or Intel N100 FPS. The paired test temporarily allocates its full reference;
that is test memory. Software WebGL native checks cannot certify target hardware.

## Native input and component evidence

All evidence directories are external artifacts, not committed screenshots or
runtime dependencies. Run with a fresh external directory:

```sh
timeout 180s python3 -B scripts/test_capital_life_browser.py --scenario school-story --capture --output <fresh-external-school-directory>
timeout 120s python3 -B scripts/test_capital_life_browser.py --scenario cutscene-ui --capture --output <fresh-external-ui-directory>
timeout 120s python3 -B scripts/test_capital_life_browser.py --scenario noodle-component --capture --output <fresh-external-component-directory>
```

**School story a1: PASS18 checks,98.94s**, directory
`capital-campaign-followup-school-20261115-a1`. Fresh Kit and$1000, actual captions,
Cancel/no reward, restart/Skip, held movement/attacks blocked, actual public gate11
travel, E loads the school wing, visible alarm cue, actual X hold/release/fresh Y,
one alarm serial and one-star search, normal exit and room disposal. Exit is
wanted1/cash1000. **Evasion, clear search, mission reward and whole campaign are
not proved.** Two staff adults, no child NPCs. No state grants, teleport, save
fixtures or synthetic clocks. Zero page/console errors, failed/HTTP requests or
external runtime requests. Results SHA256
`8ab481c1eb205b766c066dccaf50f0bf638082062992dd5a8d792552075c2638`.
Screens: `school-cutscene-caption.png`, `school-cutscene-next-caption.png`,
`school-lazy-room-alarm-cue.png`, `school-actual-alarm-triggered.png`. The school
captures preceded the final caption presentation replacement. The alarm close-up
does not establish the appearance of the entire room.

**Noodle component a2: PASS9 checks,5.84s**, directory
`capital-campaign-followup-noodle-component-20261115-a2`. This is explicitly a
**programmatic supplied-dt component preview**, using actual room/people/view
modules. It proves emitted throw→melee, captured trajectory,12strands,six draws,
pause and disposal, with no native mission/cash/reward proof. Both images carry
that label: `programmatic-component-noodle-flight.png` and
`programmatic-component-noodle-punch.png`. Visual review accepts the visible
bowl/strands and punch pose; no exact hand contact claim. Zero errors/requests.
Results SHA256 `50dcf2eb6cfdb7526d9ec8c8f3a7ce1888eeefd24f6e96c5e0e3533b04009d74`.

## Retained failed approaches and holds

Native Rowan lunch a1 stopped before browser setup because its fresh output
already contained a log. a2 failed after3 observations/62.76s when a terminal
serial was observed before the campaign advanced. The wait now checks both.
a2 results SHA256 `7ce05a823fe28bd1aace076bde35e8496b1efbf00e852143db2c0db0d3103e82`.

Native Rowan lunch a3 failed after18 observations/179.77s, directory
`capital-campaign-followup-rowan-lunch-20261115-a3`, results SHA256
`f8d6a2b83f7bbf7bf053a681d8cd4d8af401ee1be91ce20db5f0d9f4561aebb9`.
It observed actual PowerPunt completion/$100, partial Kit→Milo→Rowan switching,
unchanged pose/cash/progress, reload and active selection lock. The normal WASD
walk then clipped a source building corner on the public detour near Bunda Street.
No native restaurant counter, throw/fight or lunch reward is claimed. The source
body was not deleted or its collision weakened; after two failures, that career
attempt was stopped. Its18 observations are not18 accepted complete-case checks.

Early native caption UI a1–a4 passed functional layout/input assertions but
**failed visual review**: a dark top rectangle persisted despite absolute, flex
and smaller native-dialog treatments. The top-layer mechanism was abandoned.
The final source uses an ordinary in-page modal overlay, inert background and
explicit two-button focus trapping. Failed captures remain separate, including
a4 results SHA256 `37a1878cfdba533292b95ec0077afbc1a85c1133a5b61aaae75fff4b8315e6fa`.
No unsupported browser/GPU root cause is asserted.

**Final overlay a5: PASS28 checks,33.38s**, directory
`capital-campaign-followup-cutscene-ui-20261115-a5`, results SHA256
`076c4229a7e8078843e8db13b8105d72bf0bc96a2928f33ea3e37b0faf8e896e`.
Desktop1280×800 and390×844 screenshots were reviewed: the top rectangle is gone,
world view remains clear, captions are readable, controls fit and visible focus
remains. Actual initial focus, Tab/Shift-Tab wrap, inert background, Escape,
Cancel/no reward, Skip/actual mission start and background restoration pass.
Zero errors/failed/external requests. The final runtime source hashes observed by
that browser were script `bb845d7ed146d656958d4c2de00f078c321628345b1a786286f96965b6b1a5c4`,
CSS `0a3bfcaa1abf7632402da1181a67d4c0d2f1973a1878b4be5f9371bd7542ef2c`
and HTML `ed3a0f2b72071ede33a98215fc1a3f07c8c2a23c6bce87c4294b9c9dc2e38687`.
This final case validates the new presentation/input protocol, without replaying
the long school or lunch careers. Screens: `cutscene-ui-desktop.png` and
`cutscene-ui-mobile.png`.

Full shared-heist native completion, native full lunch reward, paid career gym
completion, N100/8GB performance, whole Centre tenancy/floorplan and surveyed
private interiors remain open. New Street View connection failed before a
panorama loaded; earlier source observations remain dated evidence. Airport is
later scope. Existing full-fleet certificate holds remain separately recorded;
this is the owner's targeted continuation/release authorization, not a new all-game
loading certificate. All bounded browser/server descendants were closed. No
third-party runtime requests, dependencies or source-data rewrites were added.


## Final repository reconciliation

The committed game tree is87 files/15,385,419bytes, versus PR22's85 files/
15,312,359bytes: +73,060bytes and two authored JS modules, no new asset library.
The selected84JS/JSON/HTML/CSS files total15,359,741bytes. Catalog validation passed
134unique registered IDs and all Git-backed entry URLs. Maintenance coverage
passed140game manuals/134registered; sitemap passed134game URLs plus portal.
All geographic/address/terrain data, shared car/font bytes, Character AI, catalog,
proxy and Netlify paths remain unchanged. Changed files contain no machine paths
or new direct external runtime loads.
No persistent development server or browser remains. Final merge, deployment and
live file hashes are operational evidence recorded separately from these checks.
