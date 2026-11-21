import { applyMapExpansion } from './map-expansion.js';

// Existing higher-resolution terrain and geographic snapshots keep priority.
export function applyNorthWest(map, overlay, terrainPayload) {
  const terrain = terrainPayload?.terrain;
  if (!overlay?.roads?.length || !terrain?.heights?.length) throw new Error('North/west streets require their sourced terrain tile.');
  if (terrain.minX > overlay.bounds.minX || terrain.maxX < overlay.bounds.maxX ||
      terrain.minZ > overlay.bounds.minZ || terrain.maxZ < overlay.bounds.maxZ) throw new Error('North/west terrain does not cover the street bounds.');
  const merged = applyMapExpansion(map, overlay);
  // New observations must not rewrite older road tags or their speed estimates.
  for (let i = 0; i < map.roads.length; i++) merged.roads[i] = map.roads[i];
  return { ...merged, mapExpansion: map.mapExpansion, terrainRequirements: map.terrainRequirements,
    northWestExpansion: merged.mapExpansion,
    terrainTiles: [...(map.terrainTiles || []), { ...terrain, blendPreviousMetres: 150 }] };
}
