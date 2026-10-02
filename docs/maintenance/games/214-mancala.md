# Mancala: maintenance manual

<!-- maintenance-game: Games/Mancala -->

## Identity and status

Registered ID 214, category `strategy`, featured `false`. Entry: `Games/Mancala/index.html` ([open source](../../../Games/Mancala/index.html)). Source baseline `8c8a055`; 3 tracked files, 58,739 logical bytes. This is an existing game, not a new addition. Runtime is read-only in delegation 67. Local source/dependency evidence is not an offline browser pass. No native gameplay, screenshot or hardware measurement was performed here.

## Implementation map

SourceReview coverage: inspected the single entry's rule/search/input/timer sections, HTML/CSS and credits/license through bounded views. Sowing and scheduled-turn paths were traced; search optimality was not proven. It contains the complete engine; no compiled/vendor runtime or downloaded assets. Bootstrap `initState/layoutBoard/aiMove` creates the 14-slot Kalah board at `#board`. Pits 0–5/store6 belong to A; pits7–12/store13 to B. `applyMoveWithMeta` clones state, sows skipping opponent store, captures opposite seeds, grants extra turns and sweeps remaining seeds when a side empties.

`minimax/evaluate/legalMoves` search depths 1–8 with alpha-beta pruning and extra-turn handling. `performMove/animateSow` update state and presentation; `renderSeeds` draws randomized DOM seed positions. Controls are `#mode/#aiSide/#depth/#hintBtn/#restart/#undo/#redo/#swap`, with score/turn/log DOM. WebAudio oscillators synthesize sounds after an interaction.

## Gameplay and controls

Starts with four seeds in each of six pits per side. Click a legal own pit; land in own store for another turn; last seed in an empty own pit captures a nonempty opposite. Most seeds wins after sweep; equal stores draw. Human/human, human/AI and AI/AI demo plus AI side selection are offered. H hints and U undoes; these keys are not pit navigation. Undo/redo restores snapshots without auto-triggering AI, deliberately allowing inspection. Swap reverses sides.

## State and persistence

`state` has pits/player/over/winner; `history/future` are in-memory snapshots, capped to 200 on saveHistory. No localStorage or persistent match save. `aiMove` schedules a 320ms callback without retaining its ID. `animateSow` creates per-path 80ms timeouts but state changes to final board before animation. Resize redraw is debounced 80ms. AudioContext is created once; oscillator nodes stop after envelopes. Move log persists across restarts and is not bounded.

## Dependencies and provenance

Local `CREDITS.md` records upstream https://github.com/99fk/mancala-html, revision `67b4573f8171863ba66b991f221b63f6b0b990c5`. Shipped `LICENSE` inspected: GPL-3.0 text; Mancala entry additionally permits later versions. These are repository evidence, not a fresh network/source-pin verification. Preserve notices and inspect code, asset and component terms separately; a game license does not automatically clear every bundled recording/font/image. Dependencies and asset consumers are identified above; no newly added remote loads or dependency installs in this audit.

## Audit findings

- HIGH, `index.html::aiMove/performMove/onPitClick`: no busy/session guard or timer cancellation. A pending AI callback uses current state even after restart, undo, mode change, or another move; own-side clicks are allowed on AI turns. Recommended repro: choose AI as A, restart/switch to human mode within 320ms and observe stale move. Minimal root fix: one turn owner/busy flag and generation-aware scheduled callback, rechecking aiShouldMove before applying.
- MEDIUM, `layoutBoard`: pits are click-only divs without labels/tab stops. H/U alone do not constitute keyboard gameplay. Make pits native buttons or supply a roving keyboard cursor and seed-count labels.
- MEDIUM, `swapSides`: changes board/player without saving history or reconciling pending callbacks/future; undo/redo may restore an unrelated pre-swap state. Define swap as an undoable transaction and invalidate redo.
- LOW, `animateSow`: repeatedly renders final state, not incremental sow counts. Preserve rules, but do not claim a seed-by-seed animation.

## Safe iteration

Concentrate changes at performMove and scheduled AI lifecycle, then reuse `applyMoveWithMeta` as the invariant-tested rule source. Preserve GPL-3.0-or-later entry notice and full license. Keep snapshots compatible if a save format is later added. Do not introduce networking or replace upstream board art to solve accessibility.

## Verification

Recommended native sequence: extra turn, capture, side-empty sweep/draw; hint, undo/redo/swap and restart; all AI modes and depth limits. Interrupt a scheduled AI and a sow animation, then verify total seeds remain 48 and only authorized side moves. Keyboard-only pit selection currently lacks support. No native run or audio review here.

Actually run: Git blob inventory and `node --check` via standard input for the one inline script body, 1/1 PASS. No execution implied. Reproduce without checkout:

```sh
python3 -B - <<'PY' | node --check
import re, subprocess
html = subprocess.check_output(['git', 'show', '8c8a055:Games/Mancala/index.html'], text=True)
print(re.findall(r'<script\b[^>]*>(.*?)</script\s*>', html, re.S | re.I)[0])
PY
```

This bounded entry has one script body; checking HTML itself as JavaScript is invalid. Focused extraction: [batch verification](../audits/games-67.md#verification).

A future authorized focused browser run may extract only this directory with `git archive` into a disposable directory, serve that root over HTTP, block third-party requests and terminate the server. Check disk first; do not alter sparse selection or leave dependencies. Main owns the unchanged serial full-catalog smoke gate, separately from these recommended interactions.

## Future outlook

Week 1: scheduled-turn ownership and swap/history consistency. Week 2: accessible pits/seed counts and reduced-motion shell with useful move log. Later: pure rule assertions for conservation/capture/extra-turn, bounded log and measured search budget. Save/export is deferred until lifecycle correctness, not promised by current controls.
