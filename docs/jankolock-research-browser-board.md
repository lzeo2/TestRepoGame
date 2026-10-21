# JANKOLOCK browser, card and board research

Delegation #3, research only. Accessed 2026-10-20. Provider/model: `openai-codex/gpt-6.1-sol`; requested thinking: `xhigh`. Runtime environment confirmed provider/model, not a separate thinking setting. Local baseline: `c2c423e` on `feat/jankolock`. No branch change, game changes, asset copies, installs, catalog edits or publication.

## Decision

**The exact intended original cannot be established from the supplied name.** Several unrelated works use Deadlock. The strongest browser-puzzle candidate found is **Deadlock by jdp**, but no evidence connects it to the operator's recollection or to a verified collection called dubl/dribl. Do not describe JANKOLOCK as its port, sequel, authorized adaptation or official counterpart.

“Unblocked,” “free,” public source availability and a collection's hosting of a game do not establish redistribution rights. No branding clearance or trademark search was completed. This research does not grant permission to copy any game's expression, art, characters, sounds, layouts or branding.

## Names and collection URLs

The following URLs were actually requested, not inferred from similar names. HTTP results describe text access, not playable/offline verification.

| Source | Access and excerpt | Finding |
| --- | --- | --- |
| <https://dubl.com/> | HTTP 200: “DUBL Golf Sunglasses”; “Clarity for your game.” | Golf eyewear, not the sought browser collection. |
| <https://dribl.com/> | Direct HTTP 403. Bing search returned “Dribl has been designed to integrate areas of football management into one simple platform.” | Search evidence identifies football management, not an unblocked portal. Direct contents remain uninspected. |
| <https://dribl.online/> | HTTP 200. HTML description contains “Мондиал 2026 и Шампионска лига” and “Точен резултат, шампион, голмайстор,” referring to World Cup/Champions League predictions, exact scores, champion and goalscorer. | Football predictions site, not evidence of a Deadlock collection. Main interface requires JS; not played. |
| <https://dubdoo.com/> | HTTP 200: “Play hundreds of free online games”; category “Games for School”; copy says “best unblocked games.” | A real nearby-name browser collection. **Not proven to be the intended dubl/dribl.** No Deadlock link appeared in the inspected home HTML. This was not a whole-site inventory or rights audit. |

Exact-name searches for `dubl games`, `dribl games`, and their Deadlock/unblocked combinations did not establish the intended domains. Do not silently substitute Dubdoo, the football sites, or an invented `.io`/`.games` URL. Ask for a full URL, screenshot, author or a concrete move description.

Search access limits: Google returned HTTP 200 with only a JS redirect notice; DuckDuckGo HTML returned HTTP 202 with a bot challenge; Bing repeatedly returned unrelated results; Brave initially returned usable leads, then HTTP 429, including after cooldown. Yahoo returned HTTP 500; Mojeek returned HTTP 403. No challenges were bypassed. Search snippets are leads, not ownership or rules evidence.

## Browser candidates and their actual stated rules

### 1. Deadlock by jdp: row/column match-4, not established identity

Primary source: <https://jdp.itch.io/deadlock>, HTTP 200.

Excerpts: “Click and Drag to move rows and columns.” “Match 4 or more tiles to make a combo.” “It is Game Over when all rows and columns are locked and you have no power-ups.” Page labels platform HTML5 and author jdp.

Rules stated by the author:

- Slide entire rows or columns, rather than swapping only two adjacent tiles.
- Match at least four tiles. Larger combos score more; shapes create power-ups.
- Nonmatching moves create locks. Endless mode adds lock spawning from level 2; the page does not fully specify that cadence.
- Endless has ten difficulty levels, seven colors and power-ups.
- Timed mode lasts three minutes, has shorter levels and **no locks**.
- Mouse/touch: drag a row/column; press and hold to use a power-up.
- Keyboard: arrows/WASD move the cursor; hold Z to select a row, X for a column; hold either to use a power-up. Xbox controls are also listed.

Unknown: grid size, exact shape recipes, scoring formula, lock removal/cadence, shuffle guarantees, code revision/license and asset permissions. No playable build was downloaded or executed. The page's “No generative AI was used” field is an author/platform assertion, not independent provenance verification. Free browser play grants no porting rights.

### 2. Deadlock by Geckoo1337: different puzzle, Windows

Primary source: <https://geckoo1337.itch.io/deadlock>, HTTP 200.

Excerpts: “enable all red booleans to green”; “you can move only if there is something on your axis”; “If after a movement, you are unable to move again ... you loose.”

The LD42 puzzle requires turning red targets green. Movement is permitted only when something lies on the player's X or Y axis; becoming unable to move loses. The author describes a little over one minute to finish and later tiles that reduce space or chase the player. Arrows move, R restarts, Escape opens the menu. The page lists **Windows**, not HTML5. It offers a scripts ZIP, but availability does not establish a license. No ZIP was downloaded, and tile-specific rules remain uninspected.

### 3. Deadlocked: near-name FPS, not the sliding game

Primary source: <https://khreathor.itch.io/deadlocked>, HTTP 200.

Excerpts: “Shooter for LowRezJam 2016”; “old school fps”; “zombies in astronaut costumes.” Authors: khreathor and Christian Nordgren. Listed platforms include HTML5. WASD moves, left mouse shoots, Q/E switch weapon, Space jumps. The page warns of WebGL/Safari bugs. This is a distinct title and genre. No reusable code/music/art license was established. A comment claiming music permission is not a complete redistribution grant.

### 4. Valve's Deadlock: explicit branding collision

Primary source: <https://store.steampowered.com/app/1422450/Deadlock/>, HTTP 200.

Excerpts: developer/publisher “Valve”; “Deadlock is a multiplayer game in early development”; access “limited to friend invites via our playtesters.” This listing is not evidence of a browser port or permission to reuse Valve characters, UI, art, music or marks. Do not market the original remix as “Valve Deadlock unblocked.”

## Card and physical board games

### Deadlock TCG: browser fan project, not official or cleared artwork

Repository: <https://github.com/BrandeisPatrick/tcg>. Public repository search returned HTTP 200 and described it as a fan-made Deadlock/Pokémon-style card battler. Latest commit API returned `9329b9132a57da5c1980c8a5128f85504818896d`.

Pinned primary text, all HTTP 200:

- [README](https://raw.githubusercontent.com/BrandeisPatrick/tcg/9329b9132a57da5c1980c8a5128f85504818896d/README.md): “Fan project. Not affiliated with Valve.”
- [License](https://api.github.com/repos/BrandeisPatrick/tcg/contents/LICENSE?ref=9329b9132a57da5c1980c8a5128f85504818896d): “It does NOT grant any rights to the third-party art assets.”
- [Constants](https://raw.githubusercontent.com/BrandeisPatrick/tcg/9329b9132a57da5c1980c8a5128f85504818896d/src/engine/constants.ts), [turn processing](https://raw.githubusercontent.com/BrandeisPatrick/tcg/9329b9132a57da5c1980c8a5128f85504818896d/src/engine/actions/turn.ts), [legality](https://raw.githubusercontent.com/BrandeisPatrick/tcg/9329b9132a57da5c1980c8a5128f85504818896d/src/engine/legality.ts), [win query](https://raw.githubusercontent.com/BrandeisPatrick/tcg/9329b9132a57da5c1980c8a5128f85504818896d/src/engine/query.ts) and [attack resolution](https://raw.githubusercontent.com/BrandeisPatrick/tcg/9329b9132a57da5c1980c8a5128f85504818896d/src/engine/actions/attack.ts) were inspected in memory; no upstream implementation or assets were vendored.

Rules corroborated by README/source excerpts:

- Players have an Active hero, bench, equipment/spells and a patron starting at 10 HP.
- Souls refill, rather than accumulate: 1 through 10 over each player's first ten turns, then cap at 10. KOs can award a capped bounty.
- The ordinary turn attack is free and one-way. First global turn cannot attack. A spent attack remains spent after changing the Active; special effects can add attacks.
- Heroes can use skills once per turn. An Active that uses its skill cannot also make the ordinary attack that turn.
- Active/bench heroes earn experience. A hero's death costs its patron the fallen hero's level. A patron reaching zero, or the whole hero team being down simultaneously, loses.
- The README describes promoting a bench hero after the Active is KO'd and level-2 ultimate access. Detailed card exceptions and complete setup were not audited.

The README supplies a live demo URL, <https://brandeispatrick.github.io/tcg/>, but this delegation did not execute it. The license separates MIT-authored source from Valve-owned names/art obtained through a community asset bucket. A fan/noncommercial disclaimer does not itself prove permission. **Not an ingestion recommendation.** No evidence establishes this as the remembered original or an official Valve card game.

### Deadlock! (2025): Cassian's WW1 abstract board game

Canonical page: <https://boardgamegeek.com/boardgame/446550/deadlock>, direct HTTP 403.

BGG catalog metadata with a designer-attributed description: <https://api.geekdo.com/api/geekitems?objectid=446550&objecttype=thing&subtype=boardgame>, HTTP 200. It credits designer Cassian, publisher Esoteric Games, year 2025, and labels the description as from the designer.

Excerpts: “Victory is achieved when a player breaks through ... and reaches their side of the board.” “Combat is predetermined on a ratio table.” “played on a 12x6 checkered board.”

Verified description-level rules: two opposing, initially evenly matched forces fight for a breakthrough to the opposing side. Combat uses a deterministic ratio table, not dice. Infantry, artillery, tanks, reinforcements, trenches and destroyed-position markers affect the position. The designer describes scaling the board and forces for additional players. This is not a sliding match game or a TCG.

The official [file metadata endpoint](https://api.geekdo.com/api/files?objectid=446550&objecttype=thing&pageid=1&sort=hot), HTTP 200, lists filepage `302026`, “Deadlock! countersheets v2.1.pdf,” 502336 bytes, posted 2025-06-11. **No PDF downloaded.** Exact movement allowances, turn order, combat ratios, reinforcement schedule and stalemate procedure are unproven. The description is not a complete rulebook or an open license.

### Historical Deadlock listing: incomplete lead only

[Brave search](https://search.brave.com/search?q=Deadlock+boardgame&source=web), HTTP 200 during initial discovery, surfaced an Etsy listing headed “Vintage 1972 Deadlock Numerical Strategy Board Game by Leisure Life/american Greetings.” Its snippet describes different forces/goals and a king with one large marker. The full listing/rules and exact listing URL were not captured. **Do not assert a particular historical ruleset, designer, publication license or relationship to the 2025 game from that snippet.**

## Local house-copy evidence

Read-only commands used `git show HEAD:games.json`, targeted `git grep HEAD` and `git show` on authored game HTML/source. Baseline catalog parses to **125 entries**; no entry title/description matches Deadlock, dubl or dribl. Mentions of “deadlock” in other documentation refer to stuck-state detection, not provenance for a game with that name.

Observed catalog wording includes Soccer Random's “Chaotic physics-based soccer with random elements,” Basket Random's “Wacky basketball with unpredictable physics,” and Volley Random's “Bizarre volleyball with silly physics mechanics.” These are observed generic descriptions, not a mandate to copy intensifiers or invent a comedic house canon.

Original-game source inspected without checkout:

- `Games/Circuit Ward/index.html`: “Hold the bay through six waves”; “Unlimited pulses”; clear keyboard/touch and failure/connectivity copy.
- `Games/Circuit Ward/script.js`: “Copied. Send the full text to your teammate.” Functional feedback, not random quips.
- `Games/Foldwild/index.html`: “Field ledger,” “Trail result,” “Back to ledger,” and “Keep current run.” Concrete world nouns and action/result language.
- `Games/StealFootballer/js/match.js`: “The teams prepare for kickoff”; “Substitution queued for the next safe stoppage.” Context-driven event feedback. Its adaptation provenance is separate; this is a local writing observation, not an ownership claim.

No protected game source was changed or used as an asset source. These samples support short, state-linked copy. They do **not** establish prior jam/paperwork jokes or permit copying upstream humor.

## Proposed original direction, not sourced mechanics or copied copy

**Superseded options:** the design/review reject the table's lock, power-up,
no-move-loss and timer events for the chosen reversible jam-slider. They are
research alternatives, not accepted mechanics or copy. Use factual blocked-slide,
undo and completion feedback instead; see [design](jankolock-design.md).

Use a small jam-dispatch office that files increasingly sticky paperwork. Keep the joke in the consequence of a real action, not a random meme overlay. These are new suggestions, not a claim about an existing game's rules:

| Real event | Proposed line or gag |
| --- | --- |
| A lane locks | “This drawer is awaiting a drawer permit.” Keep the plain label “Row locked” alongside it. |
| A jam clears | “Jam cleared. Paperwork remains.” |
| A power-up becomes available | A crooked local canvas stamp reads “Approved, reluctantly.” |
| No legal move remains | “All departments are waiting for each other.” Then give the actual lose reason and a visible restart button. |
| Timed completion, if that mode is actually implemented | “Clocked out. The jars did not.” Show score/time plainly. |

Canvas wobble: one brief, damped movement of the stamped paper after an event, not continuous camera shake. Keep the board grid, controls, labels and hit regions fixed. Honor reduced motion with a still stamp and the same text. No wobbly text or constantly regenerating random geometry.

Synth gags: a short two-note square/triangle-wave “rubber stamp,” a falling blocked-action chirp, or a tiny triumphant printer arpeggio after a clear. Use native Web Audio after a user gesture, a mute control and brief envelopes. Never depend on audio alone; no sampled office sounds or remote libraries. Do not imitate another game's melodies or signature sounds.

Presentation: solid flat colors, black action buttons, existing local Bungee/Atkinson or system fallback, readable contrast, visible focus and 44px controls. No emoji, em-dash, gradients, Comic Sans, runtime external loads or unnecessary launch screen. Whether a 3D portrait adds value remains a separate owner decision, not a reason to grow the dependency set now.

## Existing portrait/GLB tooling, read-only inventory

**At initial research the supplied portrait path was absent according to the orchestrator.** It appeared later; see [current evidence](jankolock-research.md#portrait-update) for hash, preliminary metadata and unresolved quality gates. No file was substituted or inferred. No portrait statistics, likeness, rigging, textures, format validity, permission, performance or screenshots are claimed. A tracked filename containing “portrait” does not identify the supplied asset.

Useful existing code inspected through `git ls-tree`/`git show`:

- `scripts/audit_monster_archive.py`: stdlib GLB header/chunk, embedded-buffer and accessor decoding; reports triangles, decoded dimensions/bounds and failures. Its `audit_glb` deliberately requires a single static vertex-colored mesh/material and rejects textures, skins, animation, morphs and extensions. A portrait outside that contract is **not automatically malformed**. Do not advertise it as an arbitrary GLB validator.
- `scripts/test_circuit_ward_models.py`: hash/import-closure and six-delivery-specific structural checks. Its entry point requires the model directory to contain exactly its six originals; current Git also has three pending vehicles, so that unchanged whole entry point cannot be assumed to pass today. It is not a portrait CLI.
- `Games/Foldwild/view.js`: local GLTFLoader, `Box3.setFromObject`, bounded inspection framing, explicit rotation, late-load ownership/disposal and one renderer's inspection lifecycle. `scripts/test_foldwild_inspection.py` supplies a browser harness and camera-fit checks including portrait hosts. These are application-specific, not a drop-in standalone portrait viewer.
- `scripts/test_car_arcade_models.mjs`: counts procedural car triangles/draws and checks finite attributes/bounds. Not a GLB portrait importer.
- `scripts/test_circuit_ward.py`: real-browser local game check with screenshot output. Not run under the disk/artifact restriction.

When a real portrait is supplied, first record its byte size/hash and source/permission, inspect actual GLB features and external URIs, then select compatible checks. Preview locally only after the disk gate is cleared, with real desktop/mobile framing and a no-network check. Do not invent a render or publish an unverified likeness.

### Exact existing Circuit Ward dependency closure

At baseline, source imports `./vendor/three.module.js`, `./vendor/GLTFLoader.js` and `./multiplayer.js`. GLTFLoader imports `./three.module.js` and `./BufferGeometryUtils.js`; the helper imports the same core. Core plus loader/helper/license total **1,414,498 bytes**. No copying or vendoring was done in this task.

| Tracked path under `Games/Circuit Ward/vendor/` | Bytes | Current `git show HEAD:` SHA-256 |
| --- | ---: | --- |
| `three.module.js` | 1272972 | `76dea8151bc9352aef3528b4262e249b2604f62543828328db978d060d61a495` |
| `GLTFLoader.js` | 108527 | `1f9b02acfbf219a6ebb77f09e355500449a3ba9e6a77d87e0de72c0b9315ea4e` |
| `BufferGeometryUtils.js` | 31918 | `3a6701d824adfe05dc28c09b6c1d64aeab9a183bc3b944d85f15f596e5c6c2b3` |
| `LICENSE` | 1081 | `852e0e8699169bf9f6fdc6bda3e682d078dcbc738b5d33e74df594721bff271d` |

Local `docs/circuit-ward-sources.md` pins three.js r160 to `d04539a76736ff500cae883d6a38b3dd8643c548`; `docs/circuit-ward-models.md` is its loader/model evidence companion. Current hashes above were independently recomputed from Git during this research. Upstream was not re-downloaded. MIT covers the library, not portraits or Circuit Ward art. The nine tracked GLBs include six original integrations and three pending vehicle deliveries; their existence does not clear any new asset.

## Handoff limits

- Need a concrete original URL/screenshot/move description to resolve intended identity and dubl/dribl collection names.
- Need full rulebook/code review and permission before claiming a faithful adaptation of any candidate.
- Need an actual supplied portrait, rights/likeness clearance and compatible inspection. No GLB was rendered or copied.
- Need a real branding review before claiming name clearance. Local absence from the catalog is not uniqueness.
- Disk began at 1.9 GB free and later read 1.8 GB. Only this small note and a bounded text log grew in this delegation; other shared work can affect the global reading. No browser or full-game smoke gate was run. No release/pass claim or push.
- Search tooling advice ticket `pi-1379958-1792466181450-edb0cbc6` timed out after 20 seconds and remains unresolved. It requested access-method advice only, not research or implementation.

Verification output: `PASS: note character/path/email checks; baseline catalog=125, no name matches; 4/4 vendor hashes and byte counts`. This is document/dependency evidence, not gameplay acceptance. No games were added or registered; no build/register commits apply.

Progress/source command log: `.swarmforge-logs/jankolock-03-browser-board.log` (uncommitted, ignored). Commit scope is this research note only.
