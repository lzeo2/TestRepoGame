# Refurbishment programme and four-week outlook

This is the prioritized continuation of the comprehensive audit, not a promise
that all 115 games have been refurbished. [Every game has a manual](README.md),
including five unregistered projects. [The integrated audit](AUDIT.md) distinguishes
source findings, actual native checks and release holds. No unattended month-long
agent, new game registration or publication is implied.

## First reliability wave delivered

- **Portal:** immediate fuzzy input and blur/change/composition routing; query
  survives category/favorite rerenders; shared bounded recent-record validation;
  idempotent category/status/recent writes; canonical standard-grid sort restore.
  [Implementation and proof](portal-refurbishment.md), source milestone `2d66059`.
- **Archery 149:** cancel old successful-shot work before reset; shared flight/lock
  aim guard; pointer ownership/cancel/reset cleanup; field-scoped keyboard input;
  reachable terminal R restart. [Implementation and proof](archery-refurbishment.md),
  source milestone `250b00d`. Preserve ten-arrow wind/ring gameplay and GPL notices.
- **Maintenance infrastructure:** 120 source-grounded manuals, nine site guides,
  frozen-tree scanner/evidence, Git-backed inventory and a runnable coverage guard.
  Root README/architecture/AGENTS now lead agents to current maintenance guidance.
- **Foldwild:** independent input-boundary investigation recovered a fresh unchanged
  M2 failure, narrower 8/8 diagnostic success and altered-timing success. It did not
  establish a root fix. The [input hold](audits/foldwild-input.md) stays open.

Main reran both new native regressions, the existing portal layout runner and all
nine Foldwild pure suites successfully against unchanged runtime source. This is
focused evidence, not a full-catalog pass, legal clearance or hardware certification.

## Work selection: repair shared roots before redesign

Choose small changes that eliminate data loss, boot failure, wrong outcomes or
unreachable controls. Avoid 115 decorative launch overlays, blanket art recoloring,
framework conversion, a generic quest language or a new engine substituted for
an incomplete ingested game. Keep upstream identity and useful feedback.

### Wave A: security, save integrity and source closure

| Work item | Exact boundary to understand | Acceptance and decision gate |
| --- | --- | --- |
| Protected Alsen raw HTML | `Games/Character AI/Alsen.html:addMessage/handleInput` | Read-only remains absolute in this run. Separate owner containment decision; no secret/exploit payload in reports and no unauthorized file edit. |
| Nested executable remote loads | Subway nested exports, Ovo SDK harnesses, shared Translate utility | Trace constructed consumers/cache lists; approve removal of analytics imports or route containment separately. Verify exact helper URLs as well as catalog entries; no folder deletion inferred from unlisted status. |
| A Dark Room origin-wide wipe/import | `script/engine.js:deleteSave/import64` | Preserve an unrelated origin-save sentinel and Prestige; validate imported data before replacement and retain rollback bytes. |
| Cookie/Temple/Vex/shared emulator storage | Shared load/write/transaction boundaries in respective manuals | Denied reads, quota writes, corrupt valid/invalid JSON and transaction aborts must preserve play/data and disclose unsaved state. No blanket localStorage clear or global error swallowing. |
| Doge parser and Duck chunk closure | Doge damaged literal/source; Duck webpack module registration | Authentic compatible source/build recovery with notices. Do not fabricate a placeholder game or fake module stubs. Native boot/input, not just Node syntax. |
| Supplied licenses/ROM/font/music/contact metadata | Per-game provenance and audit evidence | Owner disposition and original grants; engine MIT/GPL is not asset/ROM clearance. Preserve required notices; do not rewrite history or claim outreach occurred. |

**Week 1 checkpoint:** rank each item as fixed with proof, source-confirmed open,
conditional/unreproduced, protected, rights-held or historically reported. Export
working saves before migration work. At most one shared save/root fix per bounded
worker task, with a small runnable failure regression. Cases requiring verified
compiled source/build stay held rather than inviting minified patching.

### Wave B: restart, ownership and terminal-state correctness

Use the delivered Archery check as a pattern, not a copied engine abstraction.
Normal UI creates a shot/turn, restart happens during the delay, and the old work
must not alter the next session. Record source and actual exit.

| Cluster | Candidate roots | Required checks |
| --- | --- | --- |
| Delayed turns/transitions | Chess, Free Throw, Darts, Mahjong, Battleship, Mini Golf, FreeCell, Puzzle 15 | Restart/undo/mode switch before delayed work; only current turn/session commits; no accumulating timer/RAF/worker chain. |
| AI/player ownership | Gomoku, Mancala, Hearts workers | Reject human moves on AI side, invalidate stale AI output, terminate owned workers; actual input and resource observations. |
| Board/rule transactions | Backgammon, Checkers, Ultimate Tic-Tac-Toe, Klondike, Tower of Hanoi, Sokoban | Tiny conservation/legal-action/terminal fixtures plus normal gameplay. Input, AI and outcome route through the same rule boundary. |
| Full-board/final-wave states | Snake pair, Missile Command, Space Invaders, Bullet Hell, Lunar Lander | Finite completion, correct last update, visible outcome/restart. Preserve intentional hacked mechanics and existing levels. |
| Data/score defects | Word Scramble, Video Poker, Yahtzee, War, Nim | Validate complete source data, reject unaffordable action, settle score before terminal evaluation and prevent duplicate scoring. |

**Week 2 checkpoint:** several small, reviewed repairs with actual normal-input
win/loss/reset proof. Source-only risk rows first receive reproduction; do not
claim a measured leak, crash or FPS improvement just from the code pattern.
Compiled Joust and incomplete Qix require authentic-source/product decisions,
not permission for an AI replacement. Every touched manual records current status.

### Wave C: accessibility, wrapper reliability and honest instructions

After reliability, repair reachable keyboard/touch paths and actual layout:

- Native buttons should retain Enter/Space activation; page-level game shortcuts
  must not hijack focused controls. Handle cancel/blur/capture loss centrally.
- Spider stock/empty destinations, Dots-and-Boxes selection, Tron touch resume,
  Hanoi moves and semantic board status need real input checks, not tabindex alone.
- Mobile canvas art may scale, but controls/text stay legible. Measure 44px targets,
  zoom, scroll/rotation and overflow at 320/390px; review real images personally.
- Correct source-inconsistent controls/gameplay descriptions after native proof.
  Tower Defense auto-wave, SameGame two-stage selection and Fireboy character
  bindings are examples. Catalog text must not promise mechanics absent in source.
- Surface loader/context/storage failures at the shared bootstrap. Model fallback
  is disclosed, not relabeled as successful rendering. Do not enable a remote
  dependency/backend to make local loading appear functional.
- Detail focus/background inertness, portal favorite write denial and UX catalog
  recovery remain separate authored-boundary tasks; the compiled portal is not
  hand-editable. Trusted OS IME and screen-reader checks are still needed.

**Week 3 checkpoint:** actual desktop/mobile/relevant-theme screenshots and
input checks for changed projects. Keep style work in authored shells. No wholesale
upstream asset rewriting, additional fonts/CDNs or decorative effects dependency.

### Wave D: 3D additions, target hardware and release readiness

Target **three conditional research/ingestion slots**, not three guaranteed games:
lightweight racing, spatial puzzle/arcade, and a small third-person experience.
Each must be an actual licensed upstream game/experience with complete local
code/model/texture/audio/font closure. A camera demo is labeled a camera demo.
The [3D research](3d-outlook.md) verified HexGL as pending and rejected current
Trigger Rally/OpenLara content routes; **none has ingestion GO**. Broaden research
rather than fabricate replacements or erase restrictive notices.

Foldwild's existing authorized original project remains unregistered. Resolve its
unchanged native input hold before a larger authored campaign milestone. Finale,
class ranks, all-species natural acquisition/evolution and all-accessory visual
fit are unfinished; frontier and optional horror remain separately gated. Circuit
vehicle deliveries are not driving gameplay. No new catalog ID is reserved here.

**Week 4 checkpoint:** on actual provisional N100/8GB/64GB hardware, measure frame
interval distributions, standard/low scenes, transition/resource stability,
loading and real touch/keyboard use. Software-rendered A72/browser captures cannot
certify N100 FPS. Then run the unchanged full registered catalog gate under an
approved bounded storage lease, retain exclusions/failures and request a separate
release decision. No push while the gate or rights/security disposition is held.

## Copyable bounded task for a less-capable future agent

```text
Project: exact manual + entry/module path; existing game, no new registration.
Own only: explicit runtime path, one regression, affected manual, evidence report.
Read: AGENTS/CODE_QUALITY, manual in full, actual source and every shared caller.
Problem: exact source/native symptom; classify current/historical/conditional.
Preserve: upstream gameplay/notices, saves, protected content and offline closure.
Fix: first demonstrated shared root only; no bundle edits/frameworks/state grants.
Check: failing baseline where feasible, static parse, normal input/outcome/restart,
       failure fixtures separately, source freshness and real process exit.
Review: Main examines real screenshots and diff; unresolved claims stay held.
Commit: anonymous explicit owned paths; update inventory/index after source commit.
Stop: bounded 10–20 minutes; after two task failures abandon/escalate honestly.
Release: no push; full unchanged catalog gate and owner decision are separate.
```

A task is complete only when its actual source, check, current manual and honest
hold status agree. If it cannot be reproduced or legitimately sourced, leave the
project playable as previously authorized and report the evidence gap; do not
invent provenance, destructive cleanup or a victory screenshot.
