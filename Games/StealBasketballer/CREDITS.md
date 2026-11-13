# Leo's Steal a Basketballer: original preview

Owner-ordered original basketball sibling of `Games/StealFootballer`, copied
from repository revision `31680023af77c580121bc9efc34698b8ed2bb58b`.
The original football game is by **lzeo2**, from the private repository
[`lzeo2/steal-a-footballer`](https://github.com/lzeo2/steal-a-footballer),
revision `30b0c28`. Its browser adaptation and exported neighborhood layout are
reused under the owner's direct adaptation order. This is not an open-source
game ingestion or a claim that the game source is MIT-licensed.

The basketball match, court geometry, ball mark, generic sleeveless athletes,
roster and original arcade ratings are authored for this sibling. The polish
continuation adds original deterministic maple grain, smooth tubular rims,
cross-laced nets and articulated athlete meshes/number badges; all are locally
generated geometry or canvas graphics, with no new downloaded asset.
The economy, carry/deposit, NPC rivals, progression, local-save validation and
cream/ink/yellow/green Bungee/Atkinson interface retain the football sibling's
structure and explicitly requested style. No original football files are changed.

## Exactly 100 real names, not licensed likenesses

Leo explicitly confirmed real basketball players, exactly 100, on 2026-11-12.
`data/catalog.json` contains 100 distinct text-only names from a manually curated
list of current and historical players. Stable IDs and all six ratings, rarity,
price, income, roles and playstyles are original arcade balance, not official
statistics, rankings or a factual evaluation of playing ability. Generic team
names, shirt numbers, kit colors and generated bodies do not represent official
teams, uniforms or player likenesses. Academy/practice role fillers are not extra
collectible identities.

**Source limitation:** no live roster was fetched or date-pinned official roster
snapshot verified in this offline/no-download run. The reference list
[official NBA player directory](https://www.nba.com/players) is a research
reference, not a copied feed, evidence of current membership, or permission.
Historical names also make this intentionally different from a current roster.
The catalog truthfully sets `liveRosterVerified` and `officialRosterSnapshot`
to false. Name review used existing knowledge, not external source verification.

**Identity rights remain unreviewed:** no photos, face scans, official logos,
jerseys, league artwork, player assets or official ratings were obtained. The
owner subsequently authorized improving and merging existing PR #8 after the
Canberra continuation. That source-release order does not establish publicity,
trademark, endorsement or redistribution rights. This iteration retains the
existing preview, now registered as 246 after the owner reported its missing
site listing. That registration does not change the source/identity limitations.

## Rules and local assets

Arcade reference: [FIBA Official Basketball Rules 2024](https://assets.fiba.basketball/image/upload/documents-corporate-fiba-official-rules-2024-v10a.pdf),
five on court, 12-player roster, 1/2/3 points and 24-second possession clock.
This document was not downloaded or newly verified. Four 90-clock-second quarters
run at 3x, with overtime until a winner. Simplifications include five one-way
substitutions with no re-entry, no disqualification, traveling, double-dribble,
out-of-bounds adjudication, and-one, held-ball or timeout rules. It is not an
official simulation. Courts retain the source's arcade proportions.

All runtime dependencies are local, copied from the pinned sibling. Font binaries
are byte-identical. Local modifications: one whitespace-only indentation fix in
Three.js and one trailing space removed from each font notice; no license words
or JavaScript tokens changed.

- Three.js r160, three.js authors: `vendor/three.module.js`, MIT notice in
  `vendor/LICENSE`. SHA256 `505fa5d00047c76ecfc8947c67c82922508b263e76f9b25e64948130e783b0a2`.
- Bungee, The Bungee Project Authors: `assets/fonts/bungee/bungee-400-latin.woff2`,
  SIL OFL notice alongside. SHA256 `126eec706b7931682dbcf6c6efc274132c603f181fbf912678e6cfeb341e721b`.
- Atkinson Hyperlegible, Braille Institute of America, Inc.: local 400/700 fonts,
  SIL OFL notice alongside. SHA256 respectively
  `d64ba838ef5472bba248620ec4fd8b5aa7cf0db2908e0bb230600caf279ba7bc` and
  `140e2bd25a7315c8a062508391426b0d8c3297400c947b8d847be28f73a199f0`.
- `assets/ball.svg`: original geometric basketball mark, no official branding.

New visual work is authored procedural geometry and canvas graphics. There are
no new downloaded meshes/textures, model-generation service, package installs or
remote runtime loads. Three.js/font licenses do not license game or identity rights.
See [local QA](../../docs/steal-basketballer-local-qa.md) and
[maintenance manual](../../docs/maintenance/games/246-stealbasketballer.md).
