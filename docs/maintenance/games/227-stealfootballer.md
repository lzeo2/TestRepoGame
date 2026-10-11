<!-- maintenance-game: Games/StealFootballer -->
# Steal a Footballer maintenance manual

## Identity and status

Catalog **227**, title **Steal a Footballer for Your Team**, category **sports**,
entry `Games/StealFootballer/index.html`. ID 227 was confirmed free in the current
117-entry catalog before this registration, which brings the catalog to 118.
This is the owner's explicitly requested browser adaptation of their existing
original Roblox game, not an unrelated new game. The private source is
`lzeo2/steal-a-footballer` at `30b0c28`. The source game remains editable in the
separate `football-party` project; web commits do not save or deploy a Roblox place.

The browser version is **solo with NPC rivals and browser-local saves**. Source
mechanics have been adapted across authored modules. Integrated browser gameplay,
desktop/mobile screenshots and the full registered-catalog gate remain pending
root verification at this documentation checkpoint. Registration does not claim
those gates passed, identical Roblox visual assets or complete behavioral parity.

## Implementation map

`index.html` loads local `style.css` and `js/app.js`. App owns input, management
menus, location checks, the frame loop and connections between modules. Its source
was still being finalized when this manual was written. The module boundaries are
described in `Games/StealFootballer/PORT_CONTRACT.md`.

- `js/game.js`: canonical coins, owned recruits, market, NPC rival squads,
  carry/deposit transfers, shields/tools, progression, staff, tactics, kits,
  events, battle locks/rewards and browser saves. `Game` exposes `action`, `tick`,
  `snapshot`, `team`, `practiceTeam`, `save`, `reset` and `setLocation`.
- `js/match.js`: the 22-player match, ball/possession, goals, play commands,
  superstar/manager abilities, fouls/injuries, offside, restarts, substitutions,
  extra time and penalties. The match report is consumed by Game; the renderer
  does not resolve goals or grant coins.
- `js/world.js` and `js/actors.js`: Three.js world and procedural actor geometry,
  grounded movement/collision, interaction positions, stadium changes and camera
  modes. They present state rather than changing the economy.
- `data/catalog.json`: 125 final source definitions, exported baseline stats,
  playstyles, signatures, abilities and eggs. `data/world.json`: exported owner
  primitive transforms, bases, pitches, conveyor and static geometry; the main
  parts list contains 3,095 records at this checkpoint.
- `tools/export-world.luau`: read-only installed-world export. `vendor/` contains
  Three.js and its license; `tests/game.mjs` and `tests/match.mjs` are detached
  Node regressions, not Roblox Studio or browser rendering tests.

## Gameplay and controls

Start with **150 coins and no footballers**. The common market starter costs 50;
there is no automatic test squad or free currency. The source supports an
18-player roster and an 11-player match lineup with borrowed practice fillers.
Buy conveyor recruits, hatch eggs or sign mystery recruits; sell and develop
owned players. Team and stadium upgrades improve income. Recruits keep seeded
variation, six 8% traits, levels 0 through 5, and five mutation outcomes.

Stealing reserves a rival recruit for carrying. Return to the home deposit pad
to acquire it, or drop it to return it. NPC attempts can remove an unprotected
owned recruit; a 25-second shield and whistle/baton defense can repel them.
Individual attacking/defensive coaches and physio provide timed development or
treatment, suppressing the assigned player's income. Tactical managers unlock
match plays. Tactics have three formations, three mentalities, captain selection
and five saved presets. Kits support local team names, hex colors and patterns.
Rotating events track objectives, claim tokens and offer limited signings.

The entry screen documents **WASD/arrows** movement, **E** interaction,
**Space** jump, mouse-drag look and wheel zoom. Touch joystick and buttons are
present for mobile. The HUD exposes roster, upgrades, shield, battle, shop,
events, tactics, kits, staff and album menus, plus home/pitch navigation and
match spectator controls. Actual native input and mobile usability remain
browser-verification tasks. `DEVTEAM` is an explicitly entered local testing
code; results using its squad must be labeled fixtures, not natural progression.

## State and persistence

Game is the mutable state owner. Recruits use stable UIDs plus player IDs, seeds,
traits, levels, mutation and individual development/injury data. UI and renderer
consume snapshots. App supplies location from the rendered world to gate home
deposit/defense and rival theft; inspect both sides of this boundary before
changing proximity behavior. Buying can include `expectedId` to reject a stale
market card before spending.

The localStorage key is **`steal-footballer:v1`**, with `:backup` for the previous
validated save and `:damaged` for rejected input. Version, finite balance,
recruit identities and bounded progression are validated; corrupt data and
storage failures produce an explicit save status. Storage denial leaves the
session playable without claiming persistence. Saves belong to this browser and
origin; there is no cloud save or import from Roblox.

No offline coins accrue. Frame deltas are bounded; reload restores the saved
balance rather than paying elapsed wall time. Training deadlines can complete
when the owner returns and is out of a match. Assignments suppress only their
recruit's income; battles pause club income. Battle rewards freeze the permanent
pre-match rate, exclude temporary income boosts, and use bounded source
compensation/performance formulas. Practice difficulty increases only after a
non-forfeit victory by more than three goals, capped at level 3. Saves do not
resume live matches, carried transfers or generated rival market state.

## Dependencies and provenance

The owner's private source revision and direct port authorization are recorded
in [CREDITS](../../../Games/StealFootballer/CREDITS.md). The original game is not
represented as an open-source ingestion or given an invented license. The
125 identities and club/national metadata are source data; ratings and economy
values are fictional game balance, with no endorsement claim.

The primitive world is an export of the owner's installed Roblox layout.
Browser avatars/footballers are procedural approximations using local geometry
and appearance metadata. **Roblox catalog meshes, hair meshes and clothing
textures are not shipped.** Roblox asset IDs and source verification URLs are
metadata, not runtime downloads. This qualification matters when assessing
visual fidelity or asset provenance.

Three.js **r160 / 0.160.0** is locally vendored with its MIT notice in
`Games/StealFootballer/vendor/LICENSE`. The game uses shared local Bungee by
The Bungee Project Authors and Atkinson Hyperlegible by Braille Institute of
America, Inc., both SIL OFL 1.1; see [font evidence](../../portal-font-sources.md).
No new runtime third-party scripts, fonts, sockets or remote assets are needed.
There is no network multiplayer, Roblox service access or backend integration.

## Audit findings

The detached Game regression covers source starter prices/income, roster limits,
traits/mutations, timed staff/physio, tactics/presets, kits, eggs/mystery, battle
locks/rewards, local theft/defense, event duplicate guards and corrupt/denied
storage. These results are logic evidence only. The match module has a separate
detached regression; browser integration is owned by root and pending here.

Known limits: procedural actor appearance differs from Roblox catalog meshes;
solo NPC behavior replaces other human players; no live cloud persistence or
network competition; no claim of exact parity for every Roblox service or
physical interaction. Current app source, final source-tree inventory, external
load audit, accessibility/visual review, fresh natural gameplay and full catalog
smoke acceptance still require root's completed integration and recorded checks.
No supplied source, asset, warning or failed check is deleted to satisfy a gate.

## Safe iteration

Keep game economy/state, match simulation and world presentation separate.
Change source-driven parameters through a reviewed export rather than duplicating
prices in UI. Never grant currency/players on startup or use a developer fixture
as evidence of naturally earned progression. Exercise bad payloads, stale stock,
full roster, save failure and duplicate reward/claim paths when touching those
boundaries. Tests must use detached fixtures, not the owner's Roblox squad or
wallet.

Commit explicit paths in this repository. The source/Roblox repository is
separate. Do not install build tooling, add remote services or weaken the full
registered-catalog gate. Keep licenses and provenance qualifications. Refresh
the maintenance inventory only after root commits the inspected integrated
source, then run the documentation checker. Registration and documentation alone
do not authorize a push or publication exception.

## Verification

At this checkpoint, Game syntax and its isolated Node regression passed for
`417f544` and follow-up `77f296a`; the latter added strict practice progression,
stale market-card checks and bounded compensation tests. Node may emit the
inherited parent-package ESM detection warning; no parent package was edited.
This documentation task validates catalog schema/unique IDs and nine required
manual sections, but **does not claim browser or full smoke acceptance**.

Root must record fresh results after integration for:

1. Node syntax and both detached regressions; catalog URLs against committed Git;
   `git diff --check`; runtime external-load and size audits.
2. Fresh browser start, natural 150-coin starter purchase, income, menus, steal
   and home deposit, theft defense, staff, kits, saves/reload and a completed
   match/report. Keep explicit `DEVTEAM` UI fixtures separate from natural proof.
3. Desktop/mobile screenshots and input, focus, dialogs, touch targets, reduced
   motion, text visibility and overflow review.
4. Committed-source inventory refresh followed by
   `python3 -B scripts/check_maintenance_docs.py`.
5. Before any push, the unchanged full gate
   `xvfb-run python3 scripts/smoke_test_games.py` across every registered game.
   A targeted test or historical pass cannot substitute; blockers require an
   explicit release decision.

The documentation worker has not refreshed inventory while app/data/world
source checkpoints are pending. The installed Windows `python` alias was
unavailable here, so root must run the checker in its working Python environment.

## Future outlook

First finish and review current integration evidence. Compare naturally played
browser sessions against source service behavior and record differences before
adding features. Improve procedural visual fidelity and bounded NPC behavior
only through owner-approved scope and local assets with clear provenance.
Network multiplayer, cloud persistence and backend work need a separate design,
authorization and verification effort; they are not implied by this solo port.
