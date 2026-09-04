# TASK: Game-Planning / Research Worker

You are the dedicated planning worker in the TestRepoGame overhaul swarm. Your job is RESEARCH + PLANNING ONLY — do not implement anything.

## Read first (in order)
1. /home/leozhang/TestRepoGame/.hermes-swarm/BRIEF.md — the owner's verbatim requirements (see sections: INITIAL PLANNING WORKER, TWO-PLAYER, HACKED/MODIFIED VARIANTS, PRIORITIES 1-6)
2. /home/leozhang/TestRepoGame/AGENTS.md — repo rules (offline-first, flat design, sparse checkout)
3. /home/leozhang/TestRepoGame/docs/CODE_QUALITY.md — quality contract
4. /home/leozhang/TestRepoGame/games.json — the 92 existing games (so candidates do not duplicate)
5. /home/leozhang/TestRepoGame/index.html + /home/leozhang/TestRepoGame/assets/portal-ux.js — portal architecture (CSS override layer over a minified React bundle)
6. /home/leozhang/TestRepoGame/docs/GAMES.md and docs/ARCHITECTURE.md if present

## Constraints you must respect in every recommendation
- School Chromebook target: no privileged APIs (no gamepad, no clipboard, no popups, no filesystem, no WebRTC). Plain HTML/CSS/JS + canvas + keyboard/touchpad/mouse only.
- Fully offline after load. Zero CDN/external fetch. Single directory per game, self-contained.
- Flat design system: solid colors, no gradients, no emojis in UI, dark default (cyan/teal accent, no green).
- Two-player on ONE keyboard is a high priority. Existing catalog has almost no local-multiplayer.
- Every game needs: start screen, win/lose, score, restart, in-page controls doc, keyboard input.
- No copyrighted assets/code. "Hacked" versions = original variants/modes only.

## Deliverable — write EXACTLY ONE file: /home/leozhang/TestRepoGame/.hermes-swarm/PLAN.md

Structure PLAN.md as:

### 1. Current state assessment
- what the platform is, what the catalog covers (by category), gaps (esp. local multiplayer), portal strengths/weaknesses you observed in the code.

### 2. Candidate games (propose at least 22, ranked table + per-game detail)
For EACH candidate include all fields the owner listed: name, why suitable, implementation difficulty (1-5), Chromebook compatibility, offline capability (yes/no + caveat), players (1p / 2p-on-one-keyboard), controls (P1 keys / P2 keys if 2p), scoring/progression, replayability, technical requirements, performance impact, accessibility considerations, Chromebook-specific risks.
Rank the full list. Mark your top 8-10 with a one-line justification each.
Aim for variety: reaction/versus, versus puzzle, turn-based, local arcade, sports (e.g. 2-player basketball), tag/chase variants, word/riddle, sim/management.
Avoid duplicating the 92 existing games (list collisions explicitly if a similar one exists).

### 3. Original variant / mode ideas for EXISTING games
At least 8 concrete "hacked"-style variants implementable as original modes (reversed controls, chaos, time attack, low gravity, one-hit, mirrored, random rules, speed modes). For each: which existing game, the exact variant, implementation approach (which file/layer), risk level. Note copyright constraints.

### 4. UI/UX overhaul plan
Concrete improvements for the portal (menus, game-selection, cards, search/filter, tags, navigation, transitions, loading/empty/error states, a11y) that work via CSS overrides + portal-ux.js (NOT by rebuilding the React bundle). Include specific selectors/layers where you can identify them from the code.

### 5. Platform improvements
Discovery (2-player filter, tag filtering, search), game info/instructions, quality-of-life. Anything else obvious.

### 6. Recommended build order
Which items to implement first for maximum impact, with dependencies. Mark which items are independent (parallelizable) vs sequential.

## Rules
- READ-ONLY everywhere except .hermes-swarm/PLAN.md. Do not edit code, games.json, or anything else.
- Be concrete and decisive. No "could/maybe" filler.
- Quality over quantity: the orchestrator will select only the best candidates.
- When done, print a 5-line summary of your top recommendations.
