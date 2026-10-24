# Brainrot Boulevard: After Dark

An eerie, PBR-textured revision of the original Three.js collect-and-raid game. All eight recognizable collectibles have new surface detail and anatomy, and the exact previously created tooth-baring cave creature is now a ninth, hidden collectible.

This is an **original, unofficial single-player game with three AI rivals**, inspired by the buy / steal / defend loop of Steal a Brainrot. It is not a Roblox experience or an online multiplayer game. No Roblox or Steal a Brainrot assets are included.

## Run it

1. Extract the **entire ZIP** into a folder.
2. Install Node.js 18+ if it is not already installed.
3. Open a terminal in the extracted `brainrot_horror` folder and run:

```sh
npm start
```

4. Open **http://localhost:8080**. Stop the server with Ctrl+C.

**No `npm install` is needed.** Three.js, GLTFLoader, the PBR textures, and the secret GLB are all local. Once you have Node.js and the files, playing requires no internet connection, account, API key, CDN, or third-party service.

Alternatively, run `python3 -m http.server 8080 --bind 127.0.0.1` in the same folder; on Windows, `py -m http.server 8080 --bind 127.0.0.1` also works.

Do not double-click `index.html`: browser ES modules and GLB loading need an HTTP server. The Node server deliberately listens only on your computer. To use a phone, serve the static files on a trusted local network or a static host you control. Touch controls appear automatically; landscape gives more room.

## What changed

- All eight originals now use shared procedural PBR surfaces: color variation, micro-height/bump detail, and roughness variation rather than only flat colors.
- Faces, eyes, mouths and identifying anatomy have been reworked toward unnerving physical objects and specimens. Each retains its original theme and silhouette.
- Dusk lighting includes warm face fill, cool rim light, and a locally generated reflection environment. The arena stays navigable rather than becoming pitch black.
- You can zoom closer with the mouse wheel to see the surface detail.
- The ninth character, **The Uninvited**, loads the exact earlier `secret-cave-creature.glb`, including its embedded textures and four PBR materials. It is not a new primitive approximation. Its 13,926-triangle crouched shape and proportions are preserved; the footprint is scaled to fit a pedestal and carrying.
- The secret Blender source is included in `art/` for editing. Blender is not needed to play.

**Visual scope:** This is an eerie realism-inspired art upgrade, not a claim of photographic fidelity. The original eight are authored procedural game meshes with generated material detail, not scanned animals or film-production assets. The supplied lineup is an **offline Blender asset render**, not an in-game screenshot; browser lighting and framing differ.

## Find the secret creature

1. **Discover three different original creatures.** Buying or successfully banking stolen creatures counts. Repeated copies of one species do not.
2. Leave one pedestal free. Buy a slot upgrade if your base is full.
3. Go beyond the **north-east rival base** to the stone shrine at the far edge of the map. The sign above the conveyor hints at a ninth signal; the shrine has pale green light and two stone pillars. Its game coordinates are **X = 18, Z = -31**.
4. Approach and press **E** (or the touch Interact button). The Uninvited is delivered to your base for free and earns **$2,400/sec**.

The shrine grants one creature per rebirth. It stays spent if the creature is stolen; raid the thief to recover it. Rebirth makes the shrine available again, and your three discoveries persist. The ninth creature never appears as a random conveyor drop.

If its GLB cannot load, the title screen tells you. The game never silently substitutes an approximate creature. Extract the entire ZIP, run the local server, and reload. Pressing E at the shrine retries a failed asset load; after it succeeds, press E again to claim.

## The game

- **Buy:** Approach a conveyor creature and press E. It arrives in your mint-colored base and earns income every second.
- **Steal:** Enter an unshielded rival base, press E near a creature, and carry it home. Its owner chases you. Being hit or pressing Q returns it.
- **Defend:** Hit an escaping thief with your bat before they reach home. Your creature returns immediately.
- **Lock:** Press L inside your base to raise its shield. It recharges for 16 seconds after expiring. The starting shield is a grace period. Owners can pass through their own locked gate.
- **Upgrade:** Add pedestals, speed, or shield time. Rebirth resets wallet, creatures and upgrades for a permanent +25% income bonus. Discoveries and lifetime stats remain.
- **Lucky drops:** Periodic events put more high-rarity originals on the conveyor.

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Move | WASD / arrow keys | Thumbstick |
| Sprint | Hold Shift | Normal movement |
| Buy / steal / awaken shrine | E | Interact |
| Swing bat | Space | Swing bat |
| Lock your base | L | Lock base |
| Return carried creature | Q | Drop |
| Orbit camera | Drag play area | Drag play area |
| Zoom closer / further | Mouse wheel | Default zoom |
| Upgrades | U | Upgrades |
| Collection | C | Collection |
| Pause / resume | Esc | Pause / close |

Pause → **Performance mode** disables expensive shadows and caps pixel density at 1. It is the default on coarse-pointer/touch devices; switch to Quality lighting if your device has headroom. The model detail and textures stay intact.

Menus and hidden tabs pause the simulation. Starting the game unlocks optional synthesized sound. Mute it with the sound button.

## Saves and limits

- Progress saves locally every five seconds and after major actions. Existing version-1 saves are compatible, including the original eight collection entries.
- The shrine claim, owned secret creature and ninth discovery persist. A player-owned creature remains yours until its thief reaches home.
- There is no offline income, cross-device save, account, multiplayer, or leaderboard.
- AI inventories, positions, temporary combat and lock timers reset on reload. Private browsing and storage restrictions may prevent saving; a warning is shown.
- Pause → Reset save has a separate confirmation and permanently clears this game's local progress.
- Local save data is not cheat-resistant. Multiplayer would require authoritative server logic.

## Source map

- `src/main.js`: world, lighting, shrine interaction, AI, carrying, combat, input, HUD and saves
- `src/characters.js`: eight detailed creatures, independent animation pivots, runner avatars and geometry sharing
- `src/character-surfaces.js`: deterministic PBR surface generation and shared texture/material cache
- `src/secret-character.js`: local GLTFLoader integration, one cached asset, normalized clones, honest loading failures and retry
- `src/rules.js`: economy, unlock conditions, progression and save validation
- `assets/secret-cave-creature.glb`: exact earlier snarl model, including embedded PBR textures
- `art/secret-cave-creature-snarl.blend`: editable source for that model
- `vendor/`: Three.js r160, matching loaders/utilities/reflection environment and license
- `tests/`: economy, geometry, save, shrine, transport, collision, simulation and source contracts
- `previews/` and `tools/offline-preview/`, when present: labeled offline renders and the reproducible export/render pipeline, not needed to play

## Verify and customize

```sh
npm test
npm run check
```

See `TESTING.md` for exactly what was checked and the browser verification limit. Edit `CATALOG` in `src/rules.js` for prices and income. The shrine, AI, world and camera settings are in `src/main.js`.

Character instances share geometry, texture maps and materials. Do not dispose every traversed resource when removing a creature: use `disposeCharacter` or `disposeSecretCharacter`. This prevents removing one instance from breaking the others.

## License and attribution

Original code and generated/procedural artwork: MIT, see `LICENSE`.

Three.js r160 and its bundled GLTFLoader, BufferGeometryUtils and RoomEnvironment: MIT, Copyright © 2010–2023 Three.js Authors. Full license: `vendor/THREE-LICENSE.txt`. Source: https://github.com/mrdoob/three.js/tree/r160.

“Steal a Brainrot” and “Roblox” describe inspiration only. This project is not affiliated with or endorsed by their creators. No third-party character assets, logos, audio, textures, or paid assets are copied.
