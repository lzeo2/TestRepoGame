# Legacy authorship sweep: delegation 78

Read-only decision evidence, not permission to remove or publish. Actual environment:
`PI_PROVIDER=openai-codex`, `PI_MODEL=gpt-6-astra`. Owner selected ASTRA for this
bounded, at-most-600-second task. Main owns UI/value judgment and final disposition.
Only this report and `docs/maintenance/refurbishment-decisions.md` are owned.

## Coverage and classification contract

Read AGENTS, CODE_QUALITY, maintenance README/SCOPE/AUDIT/REFURBISHMENT, and **all
120 manuals' Identity and status, Dependencies and provenance, and Audit findings**.
Read all nine `docs/catalog_parts/sources_*.md`, `docs/mirror_sources.md`, both
2048/Hextris port dossiers, Tag Relay/Spline Ride/Circuit Ward/Foldwild source
reports, `docs/GAMES.md`, relevant prior sweep and batch findings. Per-directory
addition history was collected for every project. Source/history inspection used
Git objects, not missing sparse files. No upstream network re-verification,
binary decompilation, browser, server, screenshot, hardware test or installation.

Baseline was `017024f`; concurrent documentation commits advanced HEAD during
review. `python3 -B scripts/check_maintenance_docs.py` returned:

```text
PASS: 120 game documents cover 115 registered + 5 unregistered games; Git inventory current.
Coverage only: section presence does not certify documentation accuracy or gameplay.
```

Categories are exclusive and describe **the current project**, not every byte:

- **I, confirmed ingestion in repository evidence:** acquisition history plus
  original source dossier/header/attribution establishes an imported game or
  derivative. Local controllers, cheats, CSS faces and wrappers do not turn an
  imported engine into a wholly self-made game. This is not independent upstream
  authentication, rights clearance, or proof of original asset authorship.
- **L, confirmed legacy local authorship:** affirmative replacement/build history.
  Here the sole member is Slope's locally authored *unavailable notice*, not a
  playable game. **No surviving playable legacy game is confirmed wholly locally
  authored by this bounded review.** This is not proof that none exists.
- **A, authorized current originals:** Circuit Ward and Foldwild, explicitly
  excluded from the owner's “not by you” target. Supplied-art qualifications remain.
- **U, unknown whole-project origin:** insufficient or conflicting acquisition/
  creation evidence. Never label these AI-made. Library provenance is not game
  provenance; a Create/Add commit records entry into Git, not who wrote the code.

Counts and all-project rows are in the companion disposition appendix. Unknowns
are deliberately conservative, including several probable archived ports. Source
format, game genre, a generic license, Seraph title suffix, or a commit author's
identity alone is insufficient. No author emails or private metadata are recorded.

## History corrections that prevent false removal

1. `9bc406c` explicitly created in-house arcade clones. `af714f8` removed the
   fallback wave. `abbc0e8` subsequently ingested current Asteroids, Frogger,
   Missile Command, Lunar Lander, Space Invaders and Duck Hunt. Current manuals,
   local CREDITS and the later mirror-source sections identify different engines.
2. Battleship, Boggle, Bowling, Dominoes and Mini Golf similarly have old explicit
   built-fallback dossiers, deletion in `af714f8`, and imported replacements in
   `abbc0e8`. They are **not surviving self-made fallbacks**.
3. The old removal summary also calls Sokoban, Nonogram and Tower of Hanoi built,
   but `sources_4.md` explicitly describes imported engines. The deletion really
   occurred; its blanket authorship label is unreliable. Current replacements
   have their own pins in the later mirror dossier. Never inherit that label.
4. `92266ef`, `5e25f16`, `6810f76`/`88593a9` are previous removal waves, not
   instructions to remove similarly named current ports. Word Scramble returned
   as the GZ30eee ingest in `5a65a10`. Hextris returned as the upstream GPL port
   in `179c8a2`; 2048's current MIT port is `02a2765`. Their old registration
   plans and failed polish history do not reserve IDs or authorize restoration.
5. `docs/GAMES.md` quick view calls Stranded In Isekai repo-original, while its
   detailed note and the original `c73de3d` attribution change explicitly say
   **vendored as-is**, crediting Daffa Ahmad Ibrahim. `f81b66c` introduced that
   tree and current entry retains the acquisition statement. Classify I with
   missing source pin/asset-rights hold, not an agent-made game.
6. The 2048 manual says no pin was established in its directory; the external
   dossier `docs/ports-2048.md` records upstream revision
   `478b6ec346e3787f589e4af751378d06ded4cbbc`. Directory-only absence is not
   repository-wide absence. No manual/inventory was changed in this lease.

## Specific candidate set

**Confirmed local project:** Slope notice, introduced by `b070dc3` replacing a
remote iframe, then revised by `41a5911`. This establishes local wrapper authorship,
not authorship of Slope itself. Proposed REMOVE is a product cleanup decision.

**Unresolved legacy-origin candidates:** QWOP and protected Character AI; Chess's
controller also needs original acquisition evidence. QWOP's `2a6849c` adds a full
672-line page, but neither that subject nor its shape establishes local/AI
creation. It is distinct from deleted `QwopRemake`. Character AI's `5d30ffc` and
later incremental updates show history, but generic Create/Update messages and
GAMES' unsupported quick-view assertion do not independently establish origin.
Its entire directory remains strictly read-only.

**Other unknown acquisition chains:** Bloons TD, Drift Boss, Doodle Jump and its
hacked sibling, Jetpack Joyride and its hacked sibling, Doge Miner. Their manuals
and addition histories identify engines/variants but do not provide adequate
whole-game source acquisition evidence in this review. These are likely ports,
not evidence of local authorship. Recommend provenance recovery and bounded
refurbishment, not speculative deletion. Hacked wrappers do not establish origin
of the underlying engine. Complete decisions are in the companion table.

## Removal consumer trace: QWOP and Slope only

Actual sparse-safe commands (content output was bounded; filenames used where
large/opaque payloads could contain private values):

```sh
git log --reverse --diff-filter=A --format='%h %s' -- 'Games/ExactFolder'
git log --follow --format='%h %s' -- Games/QWOP/index.html
git log --follow --format='%h %s' -- Games/Slope/index.html
git show --format='%h %s' b070dc3 -- Games/Slope/index.html
git grep --cached -I -l -i -E 'Games/(QWOP|Slope)|qwop_best|qwop/index|slope/index' -- .
git grep --cached -I -l -i -E 'qwop|slope' -- '*manifest*' '*cache*' '*sw.js' ':!docs'
git ls-files
```

- **Catalog:** neither folder is in current 115-entry `games.json`; no catalog
  deletion is proposed. Catalog-part fragments are historical source manifests,
  not fetched runtime registries. Exact-path search found only QWOP's own save
  reference plus documentation, including inventory/audit JSON; documentation is
  evidence, not a runtime consumer.
- **Authored portal mapping:** `assets/portal-ux.js:GAME_ICONS` still has QWOP and
  Slope title keys. `getGameIcon` returns inline SVG by exact title/category;
  neither key constructs a game URL or reads either folder. Do not confuse the
  glyph mapping with active registration. It is a real authored mapping that a
  future cleanup must deliberately retain or remove separately.
- **Constructed launches:** catalog lookup uses supplied `g.url`, not
  `Games/ + title`. `safeGamePath/openGameUrl` permit local shaped paths;
  `getRecentList` validates shape but does **not** require catalog membership.
  Persisted `unblockmath_recent` records can therefore still launch an old URL.
  This is an actual conditional consumer missed by a catalog-only orphan check.
  Existing bookmarks/direct links also remain possible and cannot be disproved
  with repository grep. Main must decide unavailable-route behavior first.
- **Manifests/cache:** the case-insensitive tracked manifest/cache/SW filename
  search returned **no matches** for either title. The broader title scan found
  inline SVGs, mathematical “slope” symbols/atlas labels and opaque packed asset
  matches; these do not prove path consumers. Exact game-path search found no
  other game's source reference. This is bounded static evidence, not exhaustive
  decoding of compressed/constructed engine strings or inspection of user caches.
- **Deployment:** `netlify.toml` publishes root; unregistered files remain directly
  published. No title-specific redirect was found. The compiled portal was not
  edited; its catalog contract is documented in `site/portal.md`. No backend or
  proxy investigation/change was undertaken.
- **Reuse:** QWOP is a single 18,549-byte entry with inline physics/drawing and
  private `qwop_best`; Slope is a single 2,720-byte static notice. Neither owns a
  shared library/asset tree. Do not delete shared runtime/fonts, notices, history,
  evidence, or another similarly named project. These logical byte counts are not
  reclaimed disk measurements. Keep evidence even if a future removal is approved.

## Limits and handoff

Scratch consists of bounded text/history extracts, below 2 MB; no Games checkout.
Disk checks returned `29G 26G 2.4G 92% /`, above the 2 GB floor. No source, catalog,
protected bytes, notice, inventory hash or runtime dependency changed. No games
added, built, registered, removed, pushed or released. Native/full-gate pass count
**0**, screenshots **0**. Existing manual findings are source-derived or dated
native evidence, not fresh gameplay verification. Final owned checks and commit
are reported in the delegation completion message; other workers' dirty paths
are not owned or staged here.
