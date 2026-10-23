# Dive Trivia: original project provenance and controls

Catalog **235**, directory `Games/Dive Trivia/`. The operator selected **Below the Obvious** on 2026-10-21. No additional registration, publication or push permission is inferred.

## V2 local-only update (2026-10-23)

The current operator order adds deterministic typo tolerance, persistent canonical-answer reuse checks, a local dive log and fixed reef-median comparisons. No LLM APIs, backend, network opponents or runtime services are used. See the [current maintenance contract](maintenance/games/235-dive-trivia.md) for exact spelling bounds, one-tier penalty/floor, seed/day uniqueness, storage schema, best-depth/streak/tier semantics and verification. Each prompt now includes `medianLampreyScore`: the median canonical-answer tier score, ignoring aliases and averaging the middle pair for even counts. All constants are 45 except amino acids (30). The data version remains unchanged because answer membership and seeded selection did not change.

Current fonts are existing local Atkinson Hyperlegible regular/bold with SIL OFL 1.1 notices and [pinned provenance](portal-font-sources.md). The original Glim/ocean SVG art remains; text uses proper case, flat panels and black primary buttons. Six real normal-input previews are committed in [the preview directory](../Games/Dive%20Trivia/previews/README.md). Reproduce with `python3 -B scripts/test_dive_trivia_v2.py` when the shared system-Chromium slot is free. `node scripts/test_dive_trivia.mjs` covers scoring/history determinism without browser/network dependencies.

The original 2026-10-19 sections below are historical: their working name, Buoy/system appearance, exact-only spelling, one-summary storage and older UI labels are superseded by the current maintenance contract. Originality and offline/no-publication boundaries remain.

## Authority and originality

Operator order summary, this chat, 2026-10-19: build a mechanic-family clone of a rare-answer daily trivia game with **100% original content**, typed answers, six curated rarity tiers, seven shared date-derived prompts, depth at ten metres per point, themed packs and an original guide. The correction expressly says: **“Battle can hold phase 2 of the build; first ship solo daily dive + packs fully offline, gate the battle layer.”** This supersedes the initial cell-arena task. Registration uses the operator's 235+ range after rechecking the real catalog (125 entries, maximum 234, 235 free).

This is **self-made, not an ingested port**. No upstream game source, question scrape, reference art, sprites, sound or branding was imported. Code and factual question organization were authored for this order by AI-assisted arcade contributors using `openai-codex/gpt-6.1-sol`. Factual names/categories are not claimed as invented facts or exclusive intellectual property. No representation is made that all factual memberships were independently checked against external authorities, or that editorial rarity reflects actual population frequency. No upstream revision/license is invented for original work. Broader ownership/licensing decisions remain the operator's.

`guide.svg` is an original hand-authored geometric illustration of **Buoy**, a yellow three-footed survey drone with one glass eye, not a copied animal mascot. The ocean is solid-color CSS. There are no downloaded images, model dependencies, audio or runtime third-party loads. Shared local Bungee and Atkinson font files are existing repository assets; their evidence/notices remain in [font provenance](portal-font-sources.md). No dependency installation or build step was added.

## Data contract

`questions.js` defines `DiveQuestions = {version, packs, prompts}`. Each pack has `{id,title,description}`. Each prompt has `{id,pack,text,groups:[{tier,answers:[{text,aliases:[]}]}]}`. IDs are stable, tiers are unique integers 0–5, six groups per prompt. The initial pool has **28 prompts, four packs, 344 canonical recognized answers**, plus aliases.

| Tier | Points | Metres |
| --- | ---: | ---: |
| Shallows | 10 | 100 |
| Side current | 15 | 150 |
| Open water | 30 | 300 |
| Hidden reef | 60 | 600 |
| Midnight zone | 85 | 850 |
| Trench find | 100 | 1,000 |

Rarity is an editor's assignment, not scraped or live analytics. Keys are finite and deliberately disclosed as non-exhaustive. Unlisted valid answers score zero; the UI says **not in this answer key**, not wrong. Capitalization, decomposed accents, apostrophes, punctuation boundaries and listed aliases are normalized. No fuzzy guessing/stemming. Symbols such as `+` remain meaningful. `validateData` rejects ambiguous normalized aliases across answers, duplicate IDs, missing packs, malformed tiers and packs with fewer than seven prompts.

Daily selection hashes `[dataset version, 'daily', YYYY-MM-DD UTC]` with FNV-1a, then seeded Mulberry32/Fisher–Yates over stable ID-sorted prompts, returning seven distinct IDs. No ambient randomness, local timezone or saved state affects selection. Numbered dives use canonical integer strings 1–999999. Packs use their pack ID as key. Each currently has exactly seven prompts, shuffled deterministically. Editing version/pool changes daily selections, so keep a room/run pinned to its version; numbered/pack/daily questions may overlap.

## Controls and play

- Mouse/touch: choose Daily, a pack, or dive number; press Start.
- Keyboard/mobile keyboard: type up to 80 characters, then Enter or **Lock answer**. One immutable submission per question. **Pass** records zero. No speed bonus.
- Each question has 25 seconds; a submission at or beyond the deadline scores zero. Background tabs do not pause the round. Timeout automatically reveals; no test hook changes the gameplay clock.
- Explore the six-tier answer key after reveal. **Next question** starts a fresh timer; **See field notes** completes round seven. Maximum 700 points, 7,000 metres.
- **Replay as practice**, **Back to launch**, or **Leave dive** with confirmation. Replays are not a global competition. Theme button and every action have keyboard focus and 44px targets.
- No global leaderboard, player analytics, emails, accounts or network APIs. Browser storage remembers only theme and one last completed score/label, not active run state. Storage failure is nonfatal and reported on completion.

## Networking and evidence boundary

[Multiplayer research/protocol](kirrlion-mp-research.md) ranks private authorized Supabase Broadcast for a later host-authoritative 2–12-player Battle. Phase 1 has no Battle transport, mock room code, online fallback, service credential, account provisioning or backend changes. BroadcastChannel was not used to pretend internet play. Two independent browser contexts verify matching daily prompts only, **not online multiplayer**. Real multi-device/school-network/Battle/12-player acceptance remain unverified and gated.

Solo runs without network requests once local files/fonts are available. Browser regression disables network after asset load and completes all seven rounds. This is **not** proof of cold hosted installation, a service-worker cache, PWA installation, airplane-mode first visit or every browser's `file://` behavior. There is no new service worker. Distributing the folder requires retaining its relative shared-font paths, or accepting system-font fallback.

Runnable checks: `node scripts/test_dive_trivia.mjs`; `DIVE_TEST_PORT=8911 python3 -B scripts/test_dive_trivia_browser.py`; `SMOKE_PORT=8912 xvfb-run python3 scripts/smoke_test_games.py --games "Dive Trivia (Working Title)"`. Ignored screenshots, browser report and logs are under `.swarmforge-logs/dive-trivia/`. See the [maintenance page](maintenance/games/235-dive-trivia.md) and [handover](dive-trivia-handover.md) for actual results, fixes and remaining gates.
