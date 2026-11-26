// Run with node --expose-gc scripts/profile_capital_shopping.mjs.
import {performance} from 'node:perf_hooks';
import {Scene} from '../assets/car-arcade/vendor/three.module.js';
import {createShoppingView} from '../Games/Capital Drive/shopping-view.js';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
import {loadCapitalMap} from './capital-map-fixture.mjs';

if (!global.gc) throw new Error('Use node --expose-gc to clear old samples between runs.');
const map = await loadCapitalMap();
const terrain = createTerrainSampler(map);
for (let sample = 1; sample <= 3; sample++) {
  global.gc();
  const scene = new Scene();
  const heapBefore = process.memoryUsage().heapUsed;
  const start = performance.now();
  const view = createShoppingView(scene, map, terrain.heightAt);
  console.log(JSON.stringify({
    sample,
    setupMs: Math.round(performance.now() - start),
    heapChangeBytes: process.memoryUsage().heapUsed - heapBefore,
    ...view.stats,
  }));
  view.dispose();
}
