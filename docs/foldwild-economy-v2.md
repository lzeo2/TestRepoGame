# Foldwild pure economy and individual-build ABI

Delegation 43 implements only two pure modules and their regression checks.
Provider/model verified from the session: `openai-codex/gpt-6.1-sol`.
No entry/core, save adapter, renderer, catalog, assets or design documents are
changed by this task. This is not proof of a wired merchant or completed chapter.

## Economy exports and exact shapes

`economy.js` exports `ITEMS`, `COSMETICS`, `SHOPS`, `CONTRACTS`,
`freshEconomy`, `buyItem`, `sellItem`, `buyCosmetic`, `completeContract`,
`refreshStock`. All four catalogs are frozen objects keyed by canonical ID;
use `Object.values(catalog)` when building lists. Their nested records/arrays
are frozen too.

- `ITEMS[id]`: `{id,name,price,sell}`. Kite 12/4, patch 18/6, charge 16/5,
  fiber 5/1 Marks. Each owned count and stock count is an integer 0..999.
- `COSMETICS[id]`: `{id,name,price}`. `none`/0, `badge`/20, `scarf`/35,
  `paper-hat`/45. `none` is owned initially; buying an owned cosmetic throws.
- `SHOPS[id]`: `{id,name,role:'items',items:[item IDs],cosmetics:[cosmetic IDs]}`.
  All nine shops offer the same basic item and cosmetic catalogs. Role is a
  presentation label, not a restriction on purchasing cosmetics.
- Shop IDs: `meadow-main`, `meadow-road`, `reach-main`, `reach-road`,
  `quarry-main`, `quarry-road`, `ridge-main`, `ridge-road`, `hollow-main`.
- `CONTRACTS[id]`: `{id,shopId,name,materialId:'fiber',quantity:3,reward:35}`.
  Each ID is `${shopId}-supply`. These are nine one-shot supply contracts,
  not the later complete 15-task campaign.

`freshEconomy()` returns exactly these six fields, all independently allocated:

```js
{
  marks: 90,
  inventory: { patch: 2, charge: 2, fiber: 0 },
  cosmetics: ['none'],
  shops: {
    // One record for every canonical shop ID:
    'meadow-main': { epoch: 0, stock: { kite: 16, patch: 8, charge: 8, fiber: 12 } }
  },
  contracts: [],
  claimedSupplies: []
}
```

The example abbreviates only `shops`; the real return includes all nine.
The world owns existing `kites` and `encounterIndex` fields. Compose the initial
state with `{...freshEconomy(), kites:8, encounterIndex:0, ...worldFields}`.
The transaction input requires both existing fields plus all six economy fields.
Marks are integers 0..1,000,000; encounterIndex is an integer 0..1,000,000,000.
Inventory has exactly patch/charge/fiber keys; kites are never duplicated there.
`contracts` stores completed canonical contract IDs, not accepted-task objects.
`claimedSupplies` preserves up to 128 unique lowercase ASCII letter/digit/hyphen
IDs, 1..80 characters each; prototype names are rejected.

```js
buyItem(state, shopId, itemId, quantity = 1)
sellItem(state, shopId, itemId, quantity = 1)
buyCosmetic(state, shopId, cosmeticId, quantity = 1)
completeContract(state, contractId)
refreshStock(state, shopId)
```

Every operation returns a detached full-state clone, preserving unrelated state
fields without running world/battle validation. Invalid economic inputs or
results throw without altering the original, including frozen inputs. Unknown
IDs, inherited/prototype fields, invalid quantities, wallet/stock/item overflows,
insufficient funds/items/stock and repeated one-shot purchases/payouts throw.
Item quantity must be an integer 1..999; cosmetic quantity must be exactly 1.
Sales add goods to the selected shop's stock, bounded to 999, and pay less than
purchase price. A full shop or wallet rejects the entire sale.

Stock records are `{epoch,stock}` only. Refresh compares the saved epoch to
`Math.floor(encounterIndex/5)`. Advancing it resets only the selected shop to
its initial stock. Same-epoch opening, revisit or JSON reload returns a clone
without restocking. Future epochs are invalid. Buying never silently refreshes
stock. Contract completion consumes three fiber and pays 35 Marks exactly once;
refresh never clears completed contracts or claimed supplies. No timer or
browser storage is consulted.

## Builds exports and exact shapes

`builds.js` imports only canonical `data.js` and the pure economy catalogs.
Exports: `CLASSES`, `TRAITS`, `generateIndividual`, `validateIndividual`,
`unlockedClasses`, `synergyFor`. There is no reverse economy import or battle/
world/view dependency.

`CLASSES[id]` is a frozen `{id,name,description,unlock,perks}` record.
`TRAITS[id]` is a frozen `{id,name,description,perks}` record. Each `perks` object
has exactly `{captureBonus,shieldBonus,switchEnergy,waitEnergy}`, numeric fields
with zero defaults. Binder captureBonus is 0.04; warden shieldBonus is 2;
tactician switchEnergy is 1. Steady shieldBonus is 1; nimble switchEnergy is 1;
resourceful waitEnergy is 1. Neutral has no bonuses. Pathfinder and quartermaster
have no invented combat perk or implemented field/economy bonus in this module;
these field roles and three-rank progression remain later work. Battle owns
application timing, energy/capture limits and shield cap 26.

`generateIndividual(seed)` accepts only an integer uint32 and returns exactly:

```js
{ profile: { hp, energy, attack, defense, speed }, traitId }
```

It uses a local LCG, chooses amplitude 4 or 8 and shuffles
`[-amplitude,-amplitude,0,amplitude,amplitude]`. The integer percentage budget
is always zero and bounded -8..8. One of neutral/steady/nimble/resourceful is
selected deterministically. No UID, clock or global random source is used.
Same seeds intentionally produce the same build; world owns unique identity
and encounter seed derivation. Neither generation nor validation changes stats.

`validateIndividual(creatureOrOptions = {})` always returns exactly:

```js
{ profile: { hp, energy, attack, defense, speed }, traitId, cosmeticId }
```

Missing fields default to five zero percentages, `neutral`, `none`. Present
undefined/null values are invalid. Profiles require exactly the five own keys,
integer bounds and zero sum. Unknown traits/cosmetics and inherited/prototype
objects/keys are rejected. Unrelated creature fields are neither validated nor
returned. Cosmetic validity is catalog validity, not proof of player ownership;
world/core owns equip permission. V1 migration calls this with missing build
fields to preserve neutral individuals, not the generation function.

`unlockedClasses(state)` returns an array of class IDs, in this fixed order:
pathfinder, binder, warden, tactician, quartermaster, omitting locked classes.
Only `caught`, `defeatedRivals`, `contracts` are read; missing lists default empty.
Caught IDs must be unique canonical species, trial IDs unique integers 0..4,
and contract IDs unique canonical completed-contract IDs. Three caught species
unlock binder; one trial unlocks warden; three caught elements unlock tactician;
one supply contract unlocks quartermaster. Pathfinder is always returned.
World separately enforces sequential trial progression and legacy migration.

`synergyFor(team)` requires 1..3 creature records with canonical `speciesId` and
returns exactly `{id,name,description,switchEnergy,shieldBonus}`. Three distinct
elements return coverage/1/0; otherwise any shared family returns kinship/0/1;
otherwise none/0/0. Coverage has priority, exactly one record is returned.
Canonical families each belong to one element, so overlapping coverage/kinship
conditions cannot currently occur naturally. No effects are applied here.

## Runnable checks and limits

Actual verification commands, all exit 0:

```text
node --experimental-default-type=module --check Games/Foldwild/economy.js
node --experimental-default-type=module --check Games/Foldwild/builds.js
node --check scripts/test_foldwild_economy.mjs
node --check scripts/test_foldwild_builds.mjs
node --experimental-default-type=module scripts/test_foldwild_economy.mjs
Foldwild economy: PASS (9 shops, atomic trades, caps, reload stock, one-shot contracts, prototype guards).
node --experimental-default-type=module scripts/test_foldwild_builds.mjs
Foldwild builds: PASS (80 species x 10 seeds, 77 builds, neutral migration, caps, unlocks, synergy, prototype guards).
```

The checks cover detached/frozen state, JSON reload, non-profitable buy/sell
round trips, economic bounds and prototype guards, deterministic zero-sum
profiles for all 80 species, defaults, unlocks and three-member synergies.
There is no HTTP server or screenshot in this pure-module task. Core wiring,
actual browser trade/save/capture flow, cosmetic model fitting, complete classes/
campaign, balance and real Chromebook performance remain integration/release
checks. No catalog registration, full-catalog smoke claim or push is included.
