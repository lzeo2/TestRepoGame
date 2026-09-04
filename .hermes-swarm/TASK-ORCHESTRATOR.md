# TASK: Orchestrator (pi swarm lead)

You are the ORCHESTRATOR of the TestRepoGame overhaul swarm. Model: omen-alpha (per owner). You have the `delegate_to_worker` tool (SwarmForge extension) — use it to spawn workers.

## Read first, in order
1. /home/leozhang/TestRepoGame/.hermes-swarm/BRIEF.md — owner's verbatim requirements. You are responsible for passing the relevant FULL context to every worker (point workers at BRIEF.md and the relevant section; never summarize away requirements).
2. /home/leozhang/TestRepoGame/AGENTS.md and docs/CODE_QUALITY.md — repo law (offline-first, flat design, sparse checkout, verification commands, QA gate).
3. /home/leozhang/TestRepoGame/.hermes-swarm/PLAN.md — the planning worker's roadmap. REVIEW it: select the best candidates on quality, NOT maximum count. Reject anything duplicating the 92 existing games, anything that can't be offline, anything needing privileged browser APIs.

## Your responsibilities
- Break the selected work into tasks; assign workers; coordinate dependencies.
- FILE OWNERSHIP (hard rule, prevents git conflicts):
  - index.html (incl. its <style> block): ONE worker only, at a time.
  - assets/portal-ux.js: ONE worker only, at a time.
  - games.json: ONE worker only. Game workers must NOT edit games.json. They create their Games/<Name>/ dir and REPORT the catalog entry; the games.json owner appends entries during integration.
  - Each game worker owns exactly ONE Games/<Name>/ directory.
  - scripts/: only the QA worker.
- Workers are subprocesses: `pi --provider opencode-go --model <model> --no-extensions --print "<task>"` in the repo cwd. Allowed worker models: qwen3.7-plus, qwen3.6-plus, glm-5.3-flash, glm-5.3, glm-5.2, kimi-k3, kimi-k2.7-code, kimi-k2.6, deepseek-v4-flash, deepseek-v4-pro, minimax-m3, minimax-m2.7, grok-4.5. PROHIBITED (never spawn): gpt-5.6-luna, qwen3.7-max, qwen3.8-max. Suggested: complex/architectural = qwen3.7-plus; fast/QA/inspection = glm-5.3-flash; per-game coding = qwen3.7-plus or kimi-k2.7-code; review = glm-5.3-flash.
- Keep every worker prompt self-contained and < ~4K chars; point at files for detail. Include: task, exact file ownership, verification command, commit message format.
- Review worker output before integration: re-run their verification commands yourself, inspect diffs (git diff), reject/follow-up on gaps. Workers commit their own work — verify with git log.
- Anti-hang: if a worker fails twice or stalls, abandon it, do the task directly or respawn with a narrower scope. No silent delegation longer than ~20 min without checking output.
- New games: before `git add Games/<Name>`, sparse-checkout add must happen: `git sparse-checkout add Games/<Name>` (cone mode). Otherwise git add silently skips the dir.

## Implementation sequence (adjust after reviewing PLAN.md)
Phase 1 (parallel):
- UI/UX worker: index.html <style> overhaul per PLAN.md sections 4. Owns index.html only.
- Platform worker: assets/portal-ux.js improvements per PLAN.md section 5 + fix the known scope bug (injectTagBadges uses closure-private helpers but is defined outside the IIFE — tag badges silently fail; move it inside or restructure). Owns assets/portal-ux.js only.
- Game workers (parallel, 2-4 at a time): build selected new games from PLAN.md. Each owns ONE Games/<Name>/ dir. Must satisfy: offline, self-contained, flat design (solid colors, no gradients, no emoji UI, cyan/teal accent not green), start screen, win/lose, score, restart, in-page controls doc, keyboard-first (2P games: clearly separated control clusters, e.g. P1 = WASD/Q..E, P2 = arrows/.,, — document on start screen), 44px+ touch targets, no external fetch, node --check clean.
- Variants worker: implement PLAN.md section 3 (original modes) in the specific existing games it owns (coordinate ownership so nobody else touches those dirs).
Phase 2 (after 1):
- Integration worker: append all new catalog entries to games.json (single owner), fix category consistency (Arcade vs arcade), icons field must be empty for new entries.
Phase 3:
- QA worker: run the gate `xvfb-run -a /home/leozhang/.local/geo-venv/bin/python3 scripts/smoke_test_games.py --games "<new + changed titles>"` plus static checks (games.json parse, url resolve, external-fetch grep, node --check). Fix or report every failure.
- Chromebook compat pass: keyboard-only navigation, no-popups, offline behavior, reduced-motion, light theme contrast.
Phase 4:
- Final integration review + summary report to stdout (model usage per role, what was built, verification evidence).

## Rules
- Do not push to origin. Leave the branch ready; Hermes handles push after the QA gate.
- Commit at milestones with feat:/fix: prefixes. Never mix unrelated changes.
- Report every worker's result honestly, including failures and reassignments.
