# TestRepoGame Overhaul — MASTER BRIEF (verbatim user requirements)

This file is the full, untruncated instruction set from the project owner (Leo), passed verbatim to the orchestration layer. Every worker must receive the relevant full context from it. Do not summarize, truncate, or replace these instructions.

---

I want you to substantially overhaul and improve my "testrepo game" project during this session.

IMPORTANT: Before doing any project work, upgrade Hermes Agent itself to the latest stable version available. Verify the installed version afterward and make sure the gateway/swarm is actually using the upgraded Hermes installation.

Also make sure this entire prompt is passed to the orchestration layer in full. Do not summarize, truncate, or replace my instructions when handing them to the orchestrator or worker agents. The full project requirements must reach the orchestrator, and the orchestrator must pass the relevant full context to its workers.

IMPORTANT CLARIFICATION ABOUT PI:

When I say Pi agent, I mean Pi, the coding-agent harness/framework, NOT Raspberry Pi hardware.

Use the Pi coding-agent harness to create and manage the swarm.

The architecture should be:

Hermes Agent → Pi coding-agent harness → specialized worker agents

The Raspberry Pi is simply where Hermes is running. Do not interpret "Pi agent" as meaning Raspberry Pi-specific agents.

MODEL CONFIGURATION:

Do NOT use "gpt-5.6-luna". It is currently returning HTTP 500 errors through OpenCode Go.

Do NOT use Qwen Max models. In particular, do not use "qwen3.8-max" or "qwen3.7-max".

Permitted worker models include:

- Qwen 3.7+ / 3.8+ Plus models
- Qwen 3.7+ / 3.8+ Flash models
- GLM Flash models such as "glm-5.3-flash"
- Kimi models
- DeepSeek models
- MiniMax models
- Grok models
- Omen Alpha where appropriate for orchestration

The only explicit model-family prohibitions are:

- GPT-5.6 Luna
- Qwen Max models

Do not use either prohibited category unless I explicitly change this instruction.

ORCHESTRATOR:

Prefer "omen-alpha" as the Pi swarm orchestrator if it is available and reliable.

If Omen Alpha is unavailable or unsuitable for orchestration, use the strongest available permitted model.

The orchestrator should be responsible for:

- understanding the entire project,
- breaking the project into tasks,
- assigning workers,
- coordinating dependencies,
- preventing duplicated work,
- managing file ownership,
- reviewing worker output,
- resolving conflicts,
- integrating changes,
- running final checks,
- and maintaining consistency across the project.

INITIAL PLANNING WORKER:

Before implementation begins, create a dedicated planning/research worker.

This worker must inspect the existing project and produce a concrete game roadmap for the platform.

The planning worker should determine:

- which games should be added,
- why each game is suitable,
- how difficult each game is to implement,
- how well each game works on a school Chromebook,
- whether each game can operate fully offline,
- whether it requires network connectivity,
- whether it supports one or two players,
- appropriate controls,
- scoring/progression systems,
- replayability,
- technical requirements,
- likely performance impact,
- accessibility considerations,
- and any Chromebook-specific compatibility risks.

The planning worker should propose substantially more candidate games than will ultimately be implemented, then rank them.

The orchestrator should review this plan and select the best games based on quality rather than simply maximizing game count.

GAME PLATFORM TARGET:

The primary target is a school Chromebook.

Games should preferably work completely offline after the application itself has loaded.

Online functionality is acceptable where it provides meaningful value, but do not make networking a requirement when the same gameplay can reasonably work offline.

The games must work in heavily restricted school Chromebook environments.

Do not assume the browser has unrestricted permissions, extensions, WebSockets, WebRTC, clipboard access, popups, downloads, filesystem access, notifications, geolocation, gamepad APIs, or other privileged browser features.

Prefer standard browser technologies that are likely to work under restrictive school policies.

Avoid unnecessary third-party services and external dependencies.
The platform should degrade gracefully if network access or optional browser APIs are unavailable.

CHROMEBOOK TESTING:

Treat restrictive school Chromebook behaviour as a first-class compatibility requirement.

Test the application using browser conditions that approximate a heavily managed school Chromebook, including where practical:

- restricted network access,
- blocked external domains,
- disabled or unavailable browser APIs,
- no installation of software,
- no extensions,
- no filesystem permissions,
- limited storage,
- restricted popups,
- keyboard-only interaction,
- touchpad-only interaction,
- reduced hardware performance,
- limited CPU,
- limited memory,
- and offline operation.

Do not claim that the application has been tested on an actual school-managed Chromebook unless an actual managed Chromebook is available.

Instead, explicitly test and document the restrictions that can be reproduced in the development environment.

Ensure the application remains usable when optional capabilities are unavailable.

TWO-PLAYER / LOCAL MULTIPLAYER:

Prioritize games that can support two players on the same Chromebook where technically practical.

Examples of desired concepts include:

- basketball,
- random tag,
- competitive reaction games,
- local arcade games,
- versus puzzle games,
- turn-based games,
- split-control games,
- and other games where two people can play from one keyboard.

Do not restrict the platform to single-player games.

For two-player games:

- provide clear player controls,
- clearly distinguish Player 1 and Player 2,
- avoid requiring two separate devices unless necessary,
- support keyboard controls where possible,
- prevent control conflicts,
- provide a clear start/restart flow,
- and make the game genuinely competitive or cooperative rather than simply displaying two players.

HACKED / MODIFIED GAME VERSIONS:

Where technically and legally appropriate, investigate adding "hacked" or modified versions of games.

Interpret this primarily as original game variants, challenge modes, remix modes, rule modifications, secret modes, difficulty modifiers, unusual physics, alternate scoring systems, randomizers, and other original modifications.

Do not copy proprietary game code, assets, branding, or copyrighted game content merely to create a hacked version.

If an existing game in the project can support interesting modified variants, implement them as original modes within the platform.

Examples include:

- reversed controls,
- randomised levels,
- unusual physics,
- speed modes,
- chaos modes,
- harder AI,
- time attack,
- low-gravity modes,
- one-hit modes,
- mirrored maps,
- random rules,
- or other genuinely playable variants.

Clearly separate original game variants from anything that could create copyright or licensing problems.

WORKHORSE AGENTS:

Prefer Qwen 3.7+ / 3.8+ Plus models as the primary coding workhorses.

Use the strongest permitted model appropriate to task complexity.

Suggested allocation:

- Complex coding and architectural work: strongest available Qwen Plus or another permitted high-capability model.
- General implementation: Qwen Plus.
- Fast/simple tasks, inspection, repetitive refactoring and QA: Qwen Flash or GLM Flash.
- Use Kimi, DeepSeek, MiniMax or Grok where they provide a genuine advantage for a particular task.

Do not waste expensive/high-capability models on trivial work.

UI/UX AGENTS:

For UI work, prioritize models with genuine vision/multimodal capability.

The UI worker must be able to inspect rendered interfaces/screenshots where the available model supports vision and reason about:

- layout,
- spacing,
- typography,
- visual hierarchy,
- responsiveness,
- component structure,
- animations,
- visual consistency,
- and visual bugs.

Prefer the strongest permitted model with suitable vision capabilities.

If no permitted model has suitable vision capability, have the UI worker rely on browser/rendered-output inspection available through Pi tooling and do not pretend that it performed visual analysis it could not perform.

SWARM STRUCTURE:
Create specialized workers such as:

1. Lead/orchestrator
2. Game-planning/research worker
3. UI/UX specialist
4. Game-development workers
5. Platform/frontend specialist
6. Code-quality/performance specialist
7. Chromebook compatibility specialist
8. QA/testing specialist

Add or remove workers after inspecting the repository if a different division of work is more effective.

Use parallel workers wherever tasks are independent.

PROJECT PRIORITIES:

1. UI/UX OVERHAUL

Make the game platform look substantially more polished and modern.

Improve:

- menus,
- navigation,
- game-selection screen,
- buttons,
- typography,
- spacing,
- visual hierarchy,
- animations,
- transitions,
- loading states,
- feedback,
- error states,
- empty states,
- responsiveness,
- accessibility,
- and overall consistency.

The result should feel like a finished game platform rather than a prototype.

Do not add visual effects simply for the sake of adding them. Prioritize strong interaction design and visual hierarchy.

2. ADD MORE GAMES

Inspect the existing architecture first.

Use the planning worker to identify the best candidates before implementation.

Add several genuinely playable games with meaningful variety, prioritizing:

- offline play,
- school Chromebook compatibility,
- low resource usage,
- two-player/local multiplayer,
- replayability,
- simple browser controls,
- and meaningful gameplay.

Every new game should:

- actually be playable,
- have clear instructions,
- have sensible controls,
- have appropriate scoring/progression,
- support restarting,
- integrate cleanly into the platform,
- have polished UI,
- and feel consistent with the existing project.

Do not create superficial placeholder games simply to increase the game count.

3. IMPROVE THE PLATFORM

Improve:

- home/game-selection experience,
- game discovery,
- categories/tags,
- search/filtering where appropriate,
- navigation,
- transitions,
- game information,
- game instructions,
- multiplayer discovery,
- and quality-of-life features.

Look for additional obvious improvements that I have not explicitly listed.

4. CODE QUALITY

Review the codebase for:

- bugs,
- duplicated code,
- poor abstractions,
- unnecessary complexity,
- dead code,
- unnecessary dependencies,
- inefficient rendering,
- inefficient loops,
- poor state management,
- and maintainability problems.

Improve these without unnecessarily replacing working architecture.

5. PERFORMANCE

Optimize the project for a low-powered Raspberry Pi hosting environment and low-powered school Chromebook clients.

Pay attention to:

- CPU usage,
- memory usage,
- rendering performance,
- network requests,
- asset sizes,
- build size,
- startup time,
- unnecessary background work,
- animation performance,
- and client-side performance.

Keep the application lightweight.

6. ACCESSIBILITY

Implement sensible improvements including:

- keyboard navigation,
- visible focus states,
- readable contrast,
- semantic elements,
- useful labels,
- sensible button behaviour,
- and appropriate interaction feedback.

Games should remain usable with keyboard and touchpad controls wherever practical.

WORKFLOW:

1. Upgrade Hermes Agent to the latest stable version.
2. Verify the upgraded Hermes installation is actually being used.
3. Inspect the entire repository.
4. Determine the stack, architecture, build system, existing game structure, UI system, and testing setup.
5. Create the dedicated game-planning worker.
6. Have the planning worker produce and rank a concrete game roadmap.
7. Have the orchestrator review that roadmap.
8. Create and configure the Pi coding-agent swarm.
9. Assign agents according to their specialties.
10. Use only permitted worker models.
11. Give the orchestrator this entire prompt verbatim.
12. Have independent workers work in parallel where safe.
13. Keep tasks/file ownership separated to reduce conflicts.
14. Have the orchestrator review worker changes before integration.
15. Integrate the work into the main project.
16. Run tests, linting, type checks, and builds where available.
17. Test games individually.
18. Test existing games for regressions.
19. Test the platform under restrictive Chromebook-like browser conditions.
20. Test offline behaviour wherever supported.
21. Test two-player games using a single keyboard.
22. Fix regressions and integration issues.
23. Inspect the final UI and polish anything unfinished.
24. Run final checks again.

IMPORTANT BEHAVIOUR:

Do not merely tell me what could be improved. Actually implement the improvements.

Do not ask me for approval for every small decision. Make reasonable engineering and design decisions autonomously.

Do not completely replace the existing architecture unless it genuinely prevents the requested improvements.

Do not delete working functionality just to simplify the project.

Do not create fake implementations or placeholders and claim they are finished.

If a worker encounters a problem, have the orchestrator redirect the task or resolve it.

Make agents communicate useful findings to the orchestrator so they do not repeatedly rediscover the same information.

Workers must report important discoveries, compatibility problems, architectural constraints and implementation decisions back to the orchestrator.

Before finishing, verify that every newly added game is actually playable and that existing games still work.

MODEL COMPLIANCE REQUIREMENT:

Before starting worker tasks, inspect the actual model configuration being used by the Pi swarm.

Verify that every worker is using an explicitly permitted model.

The following are prohibited for workers:

- GPT-5.6 Luna
- Qwen Max models

The following are explicitly permitted:

- Qwen Plus
- Qwen Flash
- GLM Flash
- Kimi
- DeepSeek
- MiniMax
- Grok
- Omen Alpha

If a worker attempts to fall back to GPT-5.6 Luna or a Qwen Max model, stop that worker and reconfigure it to an allowed model before continuing.

Do not silently substitute a prohibited model.

The final report must explicitly state the actual model used by each worker role.

FINAL REPORT:

When everything is finished, give me a concise report containing:

1. Major UI/UX changes.
2. New games and features added.
3. Game-planning worker's recommendations and which recommendations were implemented.
4. Two-player/local multiplayer games added.
5. Original modified/hacked game modes added.
6. Chromebook compatibility work performed.
7. Offline functionality and limitations.
8. Major code-quality improvements.
9. Performance improvements.
10. Which Pi swarm agents contributed and what they did.
11. Which models were actually used for each role.
12. Tests/build/lint/type checks performed.
13. Game-by-game playability testing results.
14. Any remaining problems or limitations.

Most importantly: actually do the work using Hermes + the Pi coding-agent harness + the specialized swarm. Do not attempt the entire project as one sequential agent.

---

## Environment addendum (facts workers need; not user text)

- Repo: /home/leozhang/TestRepoGame, branch main. Live: https://lzeo2.github.io/TestRepoGame/ (GitHub Pages; pushing to main auto-deploys).
- Repo rules live in AGENTS.md and docs/CODE_QUALITY.md — read both before touching anything.
- Games are NOT checked out locally (sparse checkout). Portal files (index.html, assets/portal-ux.js, assets/game-save.js, games.json, scripts/) ARE local.
- For new games: `git sparse-checkout add Games/<Name>` BEFORE `git add`, or files are silently skipped.
- Mandatory QA gate: `xvfb-run -a /home/leozhang/.local/geo-venv/bin/python3 scripts/smoke_test_games.py --games "Title1,Title2"` — loads every game in a real browser, fails on console errors/4xx.
- Design system: FLAT solid colors, no gradients, no neon, black buttons, no emojis in UI, no em-dashes. Dark theme is the default (cyan/teal accents, NO green), light theme via html[data-theme="light"].
- games.json schema: {id, title, cat, icon, desc, url, featured, tags[]} — tags render as badges; "hacked" tag = red badge.
- Multiplayer category exists (cat: "multiplayer") — currently only 1 game uses it.
- Worker dispatch pattern: `pi --provider opencode-go --model <model> --print "<task>"` run in background, no output pipes. Keep CLI prompts < ~4K chars; point workers at this BRIEF file + a per-worker task file instead of pasting huge prompts.
- Orchestrator model: omen-alpha (per owner). Workhorses: qwen3.7-plus (primary), glm-5.3-flash (fast/inspection). Other permitted: qwen3.6-plus, deepseek-v4-flash/pro, glm-5.1/5.2/5.3, kimi-k2.6/k2.7-code/k3, minimax-m2.7/m3, grok-4.5. PROHIBITED: gpt-5.6-luna, qwen3.7-max, qwen3.8-max.
- If a pi worker fails twice or the provider errors, Hermes (the top orchestrator) resolves the task directly rather than stalling.
