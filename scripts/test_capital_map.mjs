import assert from 'node:assert/strict';
import { createMapProjection, mapPointFromClient } from '../Games/Capital Drive/map-projection.js';

const bounds = { minX: -2300, maxX: 3500, minZ: -2000, maxZ: 3900 };
for (const [width, height, zoom] of [[1000, 900, 1], [1000, 900, 4], [390, 600, 2]]) {
  const projection = createMapProjection(bounds, width, height, { x: 300, z: 700, zoom });
  const rect = { left: 45, top: 130, width: width * .63, height: height * .44 };
  for (const point of [{ x: 300, z: 700 }, { x: -375, z: 921 }, { x: 800, z: 500 }]) {
    const pixel = projection.toCanvas(point.x, point.z);
    const actual = mapPointFromClient(projection, rect, rect.left + pixel.x * rect.width / width, rect.top + pixel.y * rect.height / height, bounds);
    assert.ok(actual);
    assert.ok(Math.hypot(actual.x - point.x, actual.z - point.z) < 1e-8, 'CSS-scaled pointer must land at the actual mapped position');
  }
}
const projection = createMapProjection(bounds, 1000, 900);
assert.equal(mapPointFromClient(projection, { left: 0, top: 0, width: 1000, height: 900 }, 0, 0, bounds), null, 'map padding is not a teleport destination');
assert.equal(mapPointFromClient(projection, { left: 0, top: 0, width: 0, height: 0 }, 0, 0, bounds), null);
const boundary = projection.toCanvas(bounds.maxX, bounds.minZ);
const world = projection.toWorld(boundary.x, boundary.y);
assert.ok(Math.hypot(world.x - bounds.maxX, world.z - bounds.minZ) < 1e-8);
const fractionalBounds = { minX: -3088.3, maxX: 3360.79, minZ: -2226.4, maxZ: 3784.88 };
for (const [width, height] of [[1000, 500], [390, 338]]) {
  const fractional = createMapProjection(fractionalBounds, width, height);
  const rect = { left: 23.7, top: 112.6, width: width * .633, height: height * .824 };
  for (const x of [fractionalBounds.minX, fractionalBounds.maxX]) for (const z of [fractionalBounds.minZ, fractionalBounds.maxZ]) {
    const pixel = fractional.toCanvas(x, z);
    const selected = mapPointFromClient(fractional, rect, rect.left + pixel.x * rect.width / width, rect.top + pixel.y * rect.height / height, fractionalBounds);
    assert.ok(selected, 'rounding at a mapped corner must not reject a valid destination');
    assert.ok(Math.hypot(selected.x - x, selected.z - z) < 1e-8);
  }
}
assert.equal(mapPointFromClient(projection, { left: 0, top: 0, width: 1000, height: 900 }, NaN, 25, bounds), null);
console.log('PASS map pointer projection, CSS scaling, zoom, boundary and unmapped padding');
