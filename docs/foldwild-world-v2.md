# Foldwild world/save v2 checkpoint

Delegation 47, actual provider/model `openai-codex/gpt-6.1-sol`. Scope is
`Games/Foldwild/world.js`, `scripts/test_foldwild_world.mjs`,
`scripts/test_foldwild_save_v2.mjs` and this note. No catalog entry, game ID,
registration, push, source-model changes or controller edits.

## Implemented boundary

- Retained old exports/signatures; added `BACKUP_KEY`, `REGION_LAYOUTS`,
  `unlockedRegion`, and direct `movePosition`/`routeTo` reexports. Region data,
  bounds, POIs and wild sites come from the region module, not duplicate maps.
- Fresh saves are v2, low quality, Pathfinder, eight kites and the economy's
  initial state. The archivist appearance matches the approved palette.
- Five authored rival teams use only canonical species. Maren remains Shardip
  at level 8; later teams target 14/20/27/34. This is data, not a naturally
  completed/balanced campaign or evidence of all trial gameplay being wired.
- Saved creatures retain validated zero-budget profiles, traits, owned
  accessories, bounded HP/energy and XP. Out-of-battle effects are validated
  before clearing. Favorites are unique owned UIDs. UID allocation repairs
  `nextUid` and rejects numeric aliases such as `owned-1`/`owned-01` together.
- Economic fields are strictly projected with all nine shops and exact stock
  keys. The economy transaction boundary validates resources; its refreshed
  clone is ignored so reading never restocks. Claims use canonical
  `region:point.id` keys. Classes are derived from canonical caught species,
  trial progress and known completed contracts, not invented rank fields.
- Appearance names allow 1–24 Unicode code points, reject blank/control/format/
  surrogate text, and remain text, not HTML. The controller must use
  `textContent` for names. Colors and hairstyles have the assigned finite
  vocabularies; no arbitrary asset URLs.
- Wild points remain `wild-0` through `wild-2`; seeded selection is independent
  of combat RNG and carries `individualSeed` for the controller. Habitat
  matches weigh 4x, site-tier matches 2x, and base tier weights are 4:2:1.
  Region pools are basic / nonboss stage <=2 / nonboss stage <=2 / nonboss /
  all canonical species. Level ranges are 2–5, 8–13, 14–19, 22–28, 27–34;
  stage-3 forms have a level-26 minimum. Sampling is without replacement.
  Tests cover 5,000 encounter indices per region; availability in these pools
  is not a full-game all-species acquisition certification.
- Static POI role/dialogue/shop/contract/material fields survive projection.
  Defeated regional rival markers and claimed supplies disappear; camp and
  exit IDs remain. Proximity stays Euclidean, default 1.8 m, without teleport.

## Legacy mapping and recovery

Storage stays at `foldwild-save-v1`. The v1 schema is validated before upgrade:
old region 0–2, old sequential trial prefix 0–2, integer resources, canonical
species, finite coordinates, effect bounds and UID/team invariants. V1 accepted
all finite x/z and clamped them to +/-10 and +/-7; migration instead places the
archivist at the new safe spawn. The old third region maps conceptually to new
ridge 3 but clamps to allowed route 2 until the new Neri trial is cleared.

Maren/Sola become defeated trial IDs 0/1. Old Iven ID 2 is retained only in
`legacyRivals:[2]`, never as a new Neri victory. That legacy badge is invalid
without both earlier victories. The controller must credit new Iven trial 3
when Neri trial 2 is completed, without paying Iven twice; loading does not
invent that transition. Allies, HP/energy/XP, seen/caught, score, kites, seed,
UID allocation and motion preference survive. Individuals migrate neutral,
not rerolled; new economic fields use fresh defaults.

Reads never write, clear, remove, migrate stored bytes or fall back silently.
Invalid JSON, unsupported versions, denied access and oversized UTF-8 snapshots
return an error with null state. The cap is 256 KiB of serialized UTF-8 bytes.
Projection uses data descriptors and rejects getters/prototype objects at
meaningful fields rather than running imported getters.

Writes validate first, read the previous primary slot, then preserve its exact
bytes at `foldwild-save-backup-v1` before replacing the primary. Backup failure
stops replacement; primary quota failure leaves original progress intact.
Identical writes do not rotate away the older backup. Only these two keys are
accessed. The existing controller's explicit corrupt-slot replacement permission
must remain in place: an explicit new-run write may back up corrupt original
bytes, but simply reading corrupt data cannot overwrite them. Backup restore UI
and pending-battle/RNG recovery are not implemented here.

## Checks and integration hold

The original world check was updated for the v2/five-region contract, retaining
its species, UID, finite-resource, effect, prototype, getter, corrupt-save,
quota, reduced-motion and storage-namespace coverage. Old habitat-free 4:2:1
frequency expectations are replaced with the actual habitat/tier-weighted
contract, not removed. The new check covers migration, canonical route reach,
profiles/accessory ownership, classes, appearance, economic bounds, no read
restock, scoped backups and UTF-8 save limits.

Commands run:

```text
node --experimental-default-type=module scripts/test_foldwild_world.mjs
PASS: world/save v2 API; five regions/rivals; habitat pools 35/65/65/75/80; deterministic points/proximity; immutable inputs; strict schema/UID/effects/prototype/unknown ids; canonical resources/progress; storage namespace/quota/security/corrupt-byte preservation
world test exit=0
node --experimental-default-type=module --check Games/Foldwild/world.js
world syntax exit=0
node --experimental-default-type=module scripts/test_foldwild_save_v2.mjs
RangeError: Invalid claimed supplies ids.
save v2 test exit=1
```

The new save check is currently blocked by the shared economy validator's old
hyphen-only claim format, which rejects canonical `0:supply-0`. This mismatch
was escalated to Main/the economy owner; this worker did not modify their file
or bypass the failing check. Re-run both checks against the landed dependency
before integration acceptance.

No browser server was started and no screenshots were collected: this is a pure
world/persistence checkpoint, not subjective visual acceptance. Controller
movement/travel/services/legacy-win wiring remains Main's integration task.
No full registered-catalog gate, natural campaign playthrough, hardware FPS,
Chromebook acceptance, optional horror activation or release claim is made.
Disk guard remained 2.4 GiB available, above the 2 GiB floor; only small authored
text/test files were added.
