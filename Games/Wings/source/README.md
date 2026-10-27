# Wings authored source

This tracked checkpoint replaces reliance on deleted ignored staging checkouts.
The playable static entry remains `../index.html`; this source directory is not a
second game, publication, backend, or catalog entry. Generated served bundles and
models are unchanged by source recovery. The tracked source now also contains
the recovered realism **candidate**, not yet delivered to those served bundles.

## Provenance and recovery

Upstream: https://github.com/anomalyco/arcade, revision
`bf5f6277e38ee52e9bfa4ae4a01337b46175c181`, `games/wings`.
The upstream game has no LICENSE; existing owner-authorized ingestion and the
unresolved rights qualification in [CREDITS](../CREDITS.md) still apply. Three's
MIT notice and the font OFL notices do not license the whole game.

A retained pristine snapshot was checked against a recovered original receipt:
all 70 Git blob SHA-1 values and sizes matched. Current `../port.patch` then
applied cleanly. `source-manifest.json` pins those original blobs, the baseline
patch SHA-256 and the resulting baseline source hashes. The three upstream art
mockups and unused upstream `server.ts` are explicitly omitted: neither is a
static builder input. No model, font, binary asset, dependency or server was
copied. An upstream API recovery request returned 404; no download succeeded.

The preserved layout is the upstream repository layout, so the existing patch
applies from this directory. Runtime source is `games/wings/src/`. Simulation,
renderers, offline adapter, source checks and entry templates are retained.
No repository `node_modules` is required or permitted. Use the existing exact
external tools, not newly installed or substituted versions.

## Candidate checkpoint

`realism-recovery.json` pins the 33 successful saved write/edit operations and
18 recovered files against baseline commit `08457553`. Replaying them required
no ambiguous replacements or failed-operation replay. No lost private Git
objects were claimed restored. The recovered per-lane `*-REALISM.md` notes are
historical notes from that interrupted run: old tooling holds, paths, timings
and main-repository status in them are not current acceptance. The current
[recovery receipt](../../../docs/maintenance/audits/wings-realism-source-recovery.md)
records fresh results and remaining holds.

The candidate preserves daylight and landing/search lights, terrain collision,
all seven model bytes, rigs and simulation. It adds source-aware aircraft surface
maps, terrain shading, bounded cloud volumes and native cascades. The converted
jet regression now checks all source opaque PBR factors per vertex instead of
the obsolete fixed material-batch defaults. The helper's quality lifecycle is
integrated by replacing the sun identity, not by reusing a disposed cached graph.

The original `../port.patch` still describes the **served lighting baseline**,
not this candidate. Use this tracked source for candidate builds. Water/rain/fog
are existing systems; contact-hardening shadows, aircraft wind buffeting, native
shader/pixel checks, photographic quality and FPS remain open.

## Local-only playable integration

The operator's retained-copy local-engineering order now permits actual source
wiring for local tests, not publication or a new license conclusion. The existing
numbered lobby, GameSession, aircraft selector and HUD now connect a local Factions
room to original fleet authority and shared supplied-model rigs. The ignored
entry/server and exact source/CPU/native acceptance are recorded in the
[local receipt](../../../docs/wings-local-integration.md). Served HTML/chunks,
models/fonts and `port.patch` remain unchanged. No dependency install or asset
copy is required; publication review remains separate.

## Build without delivery

From the site repository root:

```sh
node scripts/build_wings.mjs --source Games/Wings/source/games/wings \
  --three-root "$THREE_ROOT" --esbuild-root "$ESBUILD_ROOT" \
  --out .tmp/wings-source-build
node .tmp/wings-source-build/verification/lighting-check.mjs
node .tmp/wings-source-build/verification/solo-check.mjs
node .tmp/wings-source-build/verification/astra-check.mjs
```

The builder enforces Three 0.186.0, esbuild 0.28.2, the retained Three notice,
local imports, valid entry/worker links, an empty output directory and disk
reserve. It does not copy models/fonts or replace the served runtime. Model
checks use the existing `Games/Wings/models` from the site root. A generated
build is not native shader, gameplay, screenshot, FPS or release acceptance.

Baseline recovery output: 77 source files, 1,294,495 bytes before the manifest
and this README; source build 25 files, 3,543,748 bytes. Fresh candidate build:
25 files, 3,569,870 bytes (+26,122), including the updated regression. Historical
lost-source measurements do not substitute for current checks. No full-fleet
smoke, browser, runtime replacement or push is part of this recovery.

For all five candidate CPU/graph suites, from the site root:

```sh
node scripts/check_wings_realism.mjs --source Games/Wings/source \
  --three-root "$THREE_ROOT" --esbuild-root "$ESBUILD_ROOT" \
  --models Games/Wings/models
```
