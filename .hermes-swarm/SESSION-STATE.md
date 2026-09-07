# TestRepoGame Overhaul — Session State (2026-09-04 evening)

## Goal (verbatim from Leo, condensed pointer)
Full overhaul of ~/TestRepoGame (UNBLOCKMATH // ARCADE) via Pi coding-agent harness swarm.
Full original requirements live in: ~/TestRepoGame/.hermes-swarm/BRIEF.md (written verbatim)

Key constraints:
- Hermes Agent upgraded to latest stable FIRST (done: 0.18.0 -> 0.21.0, tag v2026.8.31)
- Pi harness = coding-agent CLI, NOT Raspberry Pi. Architecture: Hermes -> Pi -> workers
- PROHIBITED models: gpt-5.6-luna, any Qwen Max (qwen3.7-max, qwen3.8-max)
- PERMITTED workers: Qwen Plus/Flash (3.7+/3.8+), GLM Flash, Kimi, DeepSeek, MiniMax, Grok
- Orchestrator: omen-alpha preferred (it is the current Hermes model), else strongest permitted
- Priorities: 1) UI/UX overhaul 2) more games (2-player emphasis) 3) platform improvements
  4) code quality 5) performance 6) accessibility
- Target: school Chromebook, offline-first, no privileged browser APIs
- "Hacked" = original variants/modes (reversed controls, chaos, time attack), NOT copyright theft
- Must pass full brief verbatim to orchestrator; orchestrator passes relevant full context to workers
- Final report must state actual model used per worker role

## Completed so far
- hermes upgrade: v0.21.0 (2026.8.31) installed via editable pip in ~/.hermes/hermes-agent/venv
  - old tree backed up: git branch pre-upgrade-backup-20260904 (also autostash hermes-update-autostash-20260904-123220)
  - entrypoint verified: hermes --version -> v0.21.0 (2026.8.31) upstream 63279301
- Gateway restart: systemd-run transient timer fired to restart hermes-gateway.service
- Repo state at session start: main branch (last commits: pokemon hacked fixes), clean tree
- Disk: 4.1G free of 29G (86% used) — above the 2GB stop threshold, OK to proceed with batches
- Loaded skills: hermes-agent, pi-agent, testrepogame, testrepogame-qa-swarm

## Pivot (owner instruction, 2026-09-05 08:35)
- Owner rejected swarm-authored original games ("slop games"). All 7 Phase A originals REVERTED (d0847df): Cycle Duel, Reaction Duel, Stack Tower, Air Hockey Duel, Paddle Duel variants, Star Catcher modes.
- New direction: EXTERNAL games / ports only. Sourced from seraph archive (proven vendor path).
- Kept: portal fixes 19cf346 (tag badges + popup fallback), e38a59c (catalog hygiene + 2p tags), a03dcb7 (storage-denial shim), 4593012 (cyan/teal retone). Chromebook matrix 8/8 pass.
- Orchestrator (omen-alpha) landed ad1d53d (players+howto schema) before pivot.

## Batch E1 vendored (0b0d623): 11 external games
- GBA/EmulatorJS (8): Dr. Mario, Street Fighter II, Advance Wars, Mario Kart Super Circuit, Metroid Fusion, Mega Man Zero, Kirby Amazing Mirror, Sonic Advance. EJS_pathtodata=../_emulatorjs/data/ (relative, shared data dir restored from origin).
- HTML5 (3): Helix Jump (analytics stripped), Crush the Castle (local ruffle vendored from PapasPizzeria build + wasm), Geometry Rash (analytics stripped).
- Catalog 90 -> 101. All new urls resolve locally.

## Next
1. QA gate on 11 new games (running, /tmp/smoke_new.log)
2. Playwright UI pass: portal + new game cards + detail flow (owner: "use playwright for ui")
3. 2P keys: emulator games map to gamepad/keyboard via EJS default controls; Street Fighter II/Dr Mario are 2P-capable
4. Dispatch Playwright UI swarm if more UI work is wanted after gate green
5. NO push until owner confirms

## Pi invocation pattern (from skill, proven)
/home/leozhang/.local/bin/pi --provider opencode-go --model <model> --print "<task <4K chars>" 2>&1
- background: terminal(background=true, notify_on_complete=true), no pipes
- workers must touch DIFFERENT files to avoid git conflicts; games.json edits = single owner
- sparse-checkout add Games/<UrlFolder> BEFORE git add for new game dirs
