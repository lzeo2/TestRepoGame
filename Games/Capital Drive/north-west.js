import { applyMapExpansion } from './map-expansion.js';

// Existing higher-resolution terrain and geographic snapshots keep priority.
export function applyNorthWest(map, overlay, terrainPayload, giantSpray = null) {
  const terrain = terrainPayload?.terrain;
  if (!overlay?.roads?.length || !terrain?.heights?.length) throw new Error('North/west streets require their sourced terrain tile.');
  if (terrain.minX > overlay.bounds.minX || terrain.maxX < overlay.bounds.maxX ||
      terrain.minZ > overlay.bounds.minZ || terrain.maxZ < overlay.bounds.maxZ) throw new Error('North/west terrain does not cover the street bounds.');
  const within = bounds => terrain.minX <= bounds.minX && terrain.maxX >= bounds.maxX &&
    terrain.minZ <= bounds.minZ && terrain.maxZ >= bounds.maxZ;
  if (giantSpray && (!giantSpray.roads?.length || !giantSpray.site || !within(giantSpray.bounds))) {
    throw new Error('Giant Spray requires its mapped approach and contour terrain.');
  }
  const north = applyMapExpansion(map, overlay);
  const merged = giantSpray ? applyMapExpansion(north, giantSpray) : north;
  // New observations must not rewrite older road tags or their speed estimates.
  for (let i = 0; i < map.roads.length; i++) merged.roads[i] = map.roads[i];
  return { ...merged, mapExpansion: map.mapExpansion, terrainRequirements: map.terrainRequirements,
    northWestExpansion: north.mapExpansion, giantSpray:giantSpray?.site||null,
    terrainTiles: [...(map.terrainTiles || []), { ...terrain, blendPreviousMetres: 150 }] };
}
