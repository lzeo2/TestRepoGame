// Existing types retain supplied GLBs; new civic roles add bounded instanced details.
import { createExternalBuildingKit } from './external-buildings.mjs';
import { createCityBuildingKit } from './city-render.mjs';

export function createBuildingKit(scene, capacity = 10000, options = {}) {
  return createCityBuildingKit(scene, createExternalBuildingKit(scene, capacity, options), capacity);
}
