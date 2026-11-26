---
name: arcade-game-development
description: Diagnose, improve and verify an existing game in the arcade. Covers release conflicts, game selection, native play evidence, catalog metadata, presentation, local asset security and cache behavior.
---

# Working on the arcade

## Establish the version and audience

Read the repository instructions and the game's maintenance page. Inspect the
current remote commit before editing. The inventory distinguishes registered
games, unlisted projects and the shared emulator. Use game IDs and Git paths
for identity. For Capital Drive or Basketballer, also read their dedicated
development skill.

When another team is landing changes, use an isolated feature branch. Check
the latest main again before producing the cache and before merge. Retain both
sets of runtime changes. Regenerate derived inventory and cache records from
the integrated tree, then verify the deployed version.

## Reproduce one real player experience

Start a local server at the repository root. Use a disposable browser profile.
Choose the device, controls and outcome before changing code. For a platformer
this might be entering a level, jumping, failing and restarting. For a board
game make a legal move and verify the turn or position changes. For local
multiplayer, exercise each player's actual bindings. Preserve before/after
screens and a short description of the observed change outside the source tree.

The following commands provide different kinds of evidence.

```sh
python3 -B scripts/generate_sitemap.py --check
python3 -B scripts/audit_arcade_entry_assets.py --check
python3 -B scripts/check_maintenance_docs.py
python3 -B scripts/playtest_arcade_fleet.py --help
python3 -B scripts/audit_site_tree.py --self-test
```

Use a selected ID in the interaction runner for a targeted retry. A full-fleet
run needs the game files and explicit task scope. A canvas animation proves
the renderer is active. A score, turn, location, completed level or observed
response to a specific input is stronger play evidence. For games with
opaque canvases take comparison frames during idle time as well as input.
Record missing prerequisites, unsupported hardware and cases still needing
human play. Check both working-tree and served asset bytes for loader errors.
A successful JavaScript syntax check does not validate game data.

## Update what players can discover

Verify controls from shipped bindings, an in-game help screen, or the original
developer's documentation for the shipped edition. Check separate local,
network and emulator link modes. A two-player console release may only support
one player in the available browser wrapper. Write the supported player count,
a short action-oriented control description and the matching discovery tags.
Use the current catalog's conventions. Verify the Info dialog and filter on the
actual portal using pointer and keyboard.

## Review footprint, presentation and trust boundaries

Test at a narrow phone size and on desktop. Check content overflow, focus after
closing dialogs, label clarity, actual hit targets, pause/resume and empty or
unavailable storage. A screenshot or a static viewport tag alone does not
verify assistive technology. Price large downloads from the actual vendor
manifest: test cold and warm, transfer and decoded bytes separately, and label
whether the timing reaches the first playable frame.

Use `scripts/audit_site_tree.py --syntax --output <external-json>` for static
coverage, then trace individual findings from input to output. Parse
JavaScript modules with module semantics. Use text nodes for displayed player
data, validate storage on read, bound user-controlled collections, and check
both origin and expected sender when message data affects game state. Keep
tests local and deterministic. Log finding categories and file locations
without echoing credentials or saved player data.

## Finish

Run the game's relevant regression and repeat the original player flow.
Document exact controls, fixes, measured costs and remaining evidence gaps in
the maintenance page. Commit the inspected runtime before refreshing the
Git inventory. Keep screenshots compact, label fixtures, and record the exact
build tested. When publication is requested, verify both the deployment and
the public game files after merge.
