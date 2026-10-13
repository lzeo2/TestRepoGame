# Footballer browser port checkpoint, 11 October 2026

The owner requested a close port of their existing Roblox game to
`lzeo2.github.io/TestRepoGame`, then selected the solo browser version. Private
source `30b0c28`, 125 identities and installed primitive world layout are adapted.
Catalog 227 adds one original owner-authorized port; registrations total 118.
This is not an ingested open-source game. Dependencies/notices are local.

The owner then instructed the agent to stop scripts and not launch games,
and requested `push`. Both browser test runners and their browser descendants
were stopped, along with the temporary HTTP server. No game launch or smoke
rerun occurs for this push. This explicit checkpoint release exception is not a
passing smoke result or standing permission for testing.

## Completed evidence before the stop

Detached workers reported progression, match and renderer regression passes.
Renderer fixtures covered 125 appearance profiles in two detail modes/eight poses,
maximum six meshes and 2,320 triangles per tested actor. These fixtures do not
establish WebGL performance, browser textures or live gameplay.

The interrupted browser run reached 20 UI checks: fresh 150-coin start, movement,
natural purchase, selling, reload persistence, formation edit, kit save, coach
hire/assignment/cancel, stadium upgrade, event UI, 22-player battle start, paused
passive income, spectator/zoom, moving players, ability UI and bench. Advanced
systems used isolated developer-squad fixtures, never the owner's Roblox wallet.
Complete-match/debrief and mobile acceptance were not reached. The catalog run
was stopped and cannot be counted as a full pass.

Before termination, 34 catalog loads finished: 29 were marked ok and five failed.
The recorded failures were Fancy Pants Adventure 3 (one failed request), Doodle
Jump and Chess (one console error each), Jetpack Joyride (one console error),
and Jetpack Joyride Hacked (one console error and one failed request). These
existing titles were not changed or investigated further after the stop.

Root visually reviewed these desktop captures from the earlier browser run:

- [Start screen](steal-footballer-start.png)
- [Home base and mini formation](steal-footballer-home.png)

## Final push checks and limits

Known integration defects were fixed before pushing: mystery stock cards/actors,
unsaved formation preview, UID escaping, idle panels, kit patterns/name and home
labels. Final patches received parser/static checks only, without renewed
runtime acceptance. The source directory is approximately 2.9 MB before these
evidence captures, including local Three.js/fonts. It retains 125 players,
12 base records, 3,095 static primitives and a reusable 261-part active stadium.
Source is committed before the Git-backed inventory refresh/coverage check.
JavaScript syntax, catalog/export scans and documentation coverage passed.
The source commit is `e2614d4`. Imported upstream Three.js and font license files
retain three upstream whitespace warnings; the authored changes have no diff
whitespace errors. The two desktop evidence images total 357,633 bytes.

Solo NPC rivals and device-local progress replace online players/cloud saves.
Procedural avatars approximate the Roblox catalog assets. See the
[maintenance manual](../maintenance/games/227-stealfootballer.md) for remaining
fidelity limits. Publication verification retrieves GitHub Pages metadata and
HTTP files without executing the game in a browser.
