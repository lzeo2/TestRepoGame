# Foldwild M2 save continuity and safe release

Delegation 52, actual provider `openai-codex`, model `gpt-6.1-sol`.
Scope: `Games/Foldwild/world.js`, `scripts/test_foldwild_continuity.mjs`,
and this report. No catalog, models, vendor files, storage keys or version change.

## Implemented boundaries

- Fresh saves have `pendingBattle: null`. Missing v1/v2 fields become null;
  explicit null is accepted, malformed values are rejected.
- Pending snapshots pass the existing descriptor-safe `validateBattle` before
  nested inspection. No imported getter is evaluated or imported object cloned
  before that boundary. Canonical snapshots retain effects, active indices,
  individual profiles, traits, accessories, log and RNG.
- Only living, non-ended command snapshots are accepted. Player order and
  cleared identity/level/XP/build/HP/energy exactly match the saved party/roster.
  The player class must match, synergies must be enabled, and enemy class is none.
- All 15 current wild sites match their actual `worldPoints` species, level,
  encounter UID and `generateIndividual(individualSeed)`. All five trials match
  their current authored team and encounter UIDs; completed trials are rejected.
  Enemy UIDs cannot collide with the roster, and enemies must be seen.
- Round is bounded to 1..10000, XP to 0..1000000, with the existing safe-integer
  turn/effect counters. The existing 128-line/512-character log and UTF-8 256 KiB
  serialization caps remain. Pending HP/energy overflow or underflow is rejected,
  not silently clamped. Ordinary legacy world-resource clamping remains unchanged.
- Pure `releaseCreature(state, uid)` validates/copies and checks unknown UID,
  pending battle, favorite, team member, last ally and last conscious ally. It
  validates again after removing only that individual. Discovery history,
  identity counter, wallet and unrelated progress remain unchanged; no payout.
- Existing scoped backup and read/write error behavior remains: malformed reads
  never delete bytes; backup or primary quota failure never replaces good primary
  bytes. No restore-menu or explicit-save UI is implemented in this scope.

## Actual verification

Commands use native ESM without adding a package file or test framework:

```text
node --experimental-default-type=module scripts/test_foldwild_continuity.mjs
PASS: optional v1/v2 continuity; canonical effects/profiles, active index and exact action/RNG replay; missed capture; five canonical trials; roster/enemy/HP/XP/counter/schema/accessor rejection; immutable release guards/history; scoped backup/quota/corrupt-byte preservation
continuity exit=0

node --experimental-default-type=module scripts/test_foldwild_data.mjs
PASS: 80 exact roster species; 16/element; 10 families x8; 50 exact normative actions; evolution 12/26 acyclic; hidden null; wheel/schema; 80 tracked/local SHA matches; models=7300844 bytes
data exit=0
node --experimental-default-type=module scripts/test_foldwild_battle.mjs
PASS: 80 species; all 50 abilities executed; 25 wheel pairs (5 strong/5 reverse); bounds/effects/Wait/switch/KO/teams/capture/replay/immutability/XP/invalid inputs/local-only
Capture reproducibility: hit seed=670, miss seed=671
battle exit=0
node --experimental-default-type=module scripts/test_foldwild_battle_v2.mjs
PASS: battle v2 all 80 profiles/evolutions; every class/trait; capture boundaries; 31 energy/26 shield caps; synergy gating; NPC utility/switch targeting; frozen-input replay; canonical snapshots/log limits
battle_v2 exit=0
node --experimental-default-type=module scripts/test_foldwild_regions.mjs
PASS: 5 regions, 128000 m², 480 trees, 48 NPCs (12 principal), 9 shops/contracts; 73 POI + 15 wild routes, 185 collision-safe segments; water/bridge/house/sliding/bounds/invalid inputs/immutability
regions exit=0
node --experimental-default-type=module scripts/test_foldwild_economy.mjs
Foldwild economy: PASS (9 shops, atomic trades, caps, reload stock, one-shot contracts, prototype guards).
economy exit=0
node --experimental-default-type=module scripts/test_foldwild_builds.mjs
Foldwild builds: PASS (80 species x 10 seeds, 77 builds, neutral migration, caps, unlocks, synergy, prototype guards).
builds exit=0
node --experimental-default-type=module scripts/test_foldwild_save_v2.mjs
PASS: v1 neutral migration and legacy Iven badge; five-region route/reexports; v2 economic/profile/cosmetic/class/appearance/favorites validation; no reload restock; descriptor/UID alias defenses; scoped rotating backup, quota failure and UTF-8 256 KiB corrupt-byte preservation
save_v2 exit=0

node --experimental-default-type=module --check Games/Foldwild/world.js
world syntax exit=0
node --experimental-default-type=module --check scripts/test_foldwild_continuity.mjs
continuity syntax exit=0
git diff --check -- Games/Foldwild/world.js
diff check exit=0
```

The owned-file external-load/absolute-path/house-style scan returned no matches.

The unchanged eighth existing suite was also run:

```text
node --experimental-default-type=module scripts/test_foldwild_world.mjs
AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
+   'releaseCreature',
world exit=1
```

Its exact export-list assertion does not yet include the M2-required export.
The test is outside Delegation 52 ownership and was not edited or bypassed.
Main was notified through operator ticket `pi-1241564-1790902621104` to update
that expectation and rerun the full existing suite. Current result is seven of
those eight suites passing, plus the new continuity suite, not an eight-suite
clean claim. Main owns final integration verification and subsequent evidence.

## Holds and resources

These are pure data checks using genuine battle creation/resolution and current
world descriptors, not native gameplay or frontend acceptance. No screenshots,
HTTP server, hardware measurements or full registered-catalog smoke were run.
Full-game gate passes: zero. Core/UI integration, repeated settled-state native
reload/reward checks and subjective visual review remain Main's work. Full
campaign/finale, all-species acquisition/accessory fit, N100 certification,
optional horror/frontier, registration and publication remain unverified/held.

Disk was 2.4 GiB free before and after this work; the later exact sample was
2,548,727,808 bytes free. The source and regression check totaled 38,838 bytes;
with the initial report draft, owned files totaled 45,298 bytes versus the original
18,107-byte world module (27,191-byte net draft growth). Final prose adds only a
few hundred bytes. No downloaded assets, dependencies or materialized models.
Shared parallel changes are not ours.
No sparse-selection or Git-identity configuration changes, push, amend or reset.
