# Steal a Footballer for Your Team

This is an owner-authorized solo browser adaptation of the original Roblox game
by **lzeo2**. The source repository is
[`lzeo2/steal-a-footballer`](https://github.com/lzeo2/steal-a-footballer), a private
repository, pinned for this port to revision **`30b0c28`**. The owner's direct
request authorizes this adaptation. It is not an ingested open-source game, and
the source is not represented as MIT-licensed.

The local catalog contains **125 footballer identities** from the final source
configuration. Prices, income, fictional gameplay ratings, traits, development,
mutations, eggs, staff and event definitions derive from that game. Player names
and club/national identity metadata are identifiers, not claims of endorsement or
official ratings. Source metadata URLs are evidence strings, not runtime loads.

`data/world.json` records the owner's installed primitive world layout through
the read-only builder in `tools/export-world.luau`. The web renderer uses local
geometry for the plots, pitches, stalls, stadium elements and props. Footballers
and the local avatar are procedural browser models based on exported appearance
metadata. **Stock Roblox catalog hair, clothing and avatar meshes are not bundled
or downloaded by this port.** The source's Roblox asset IDs are metadata only;
procedural approximations do not promise an identical Roblox mesh appearance.

Gameplay is solo. Rival plots use NPC squads, and progress uses this browser's
local storage. This adaptation has no network multiplayer, Roblox connection,
cloud save, accounts or backend. Clearing browser data clears local progress.

## Local dependencies

- **Three.js r160 (0.160.0)**, by the three.js authors, is locally vendored as
  `vendor/three.module.js`. Its MIT notice is retained in [vendor/LICENSE](vendor/LICENSE).
  Upstream: [three.js](https://github.com/mrdoob/three.js/tree/r160).
- **Bungee**, by The Bungee Project Authors, is used for headings. Its local
  [SIL Open Font License 1.1](../../assets/fonts/bungee/OFL.txt) is retained.
- **Atkinson Hyperlegible**, by Braille Institute of America, Inc., is used for
  body text and controls. Its local
  [SIL Open Font License 1.1](../../assets/fonts/atkinson-hyperlegible/OFL.txt)
  is retained. Both fonts reuse the portal's local files; see
  [font sources and binary hashes](../../docs/portal-font-sources.md).
- `assets/ball.svg` is a local geometric football mark supplied with this browser
  adaptation. There are no external image or font requests.

Authoring and adaptation assistance does not transfer ownership of the original
game or apply the Three.js/font licenses to that game's source, names or designs.
See the [maintenance manual](../../docs/maintenance/games/227-stealfootballer.md)
for implementation limits and current verification status.
