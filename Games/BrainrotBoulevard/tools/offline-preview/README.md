# Offline creature asset previews

These scripts inspect the actual game models, without changing their geometry or game code. They are **offline Blender asset renders**, not browser screenshots or gameplay validation.

1. `node tools/offline-preview/export-models.mjs previews/exported`
2. `python tools/offline-preview/prepare-textures.py previews/exported`
3. `blender -b --python tools/offline-preview/render-models.py -- previews/exported previews/individual 0,1,2,3,4,5,6,7,8 128 1100`
4. `python tools/offline-preview/compose-lineup.py`

The Node exporter calls `createCollectible(0..7)`, preserves actual mesh positions, indices, UVs, normal data, world transforms, material properties and DataTexture bytes, and records source hashes. The ninth model is imported directly from the previously supplied secret-creature GLB. Material color, bump, roughness, metalness, opacity, emission and supported physical material properties are translated into Blender's Principled BSDF. Exact appearance differs from WebGL because camera, lighting, PBR implementation and tone mapping are Blender studio settings. Bump/normal maps are shading relief, not added geometry.

`render-validation.json` identifies the render method, source hashes, imported triangle counts, bounds, resolution and timing. This is structural/render validation only; it makes no browser, game performance or playtesting claim. Each model is independently framed for legibility, so the contact sheet is not a shared scale reference.
