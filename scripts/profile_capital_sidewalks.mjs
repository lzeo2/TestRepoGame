// Fingerprint the shipped paths and sampled actor placements without a renderer.
import {createHash} from 'node:crypto';
import {Scene} from '../assets/car-arcade/vendor/three.module.js';
import {loadCapitalMap} from './capital-map-fixture.mjs';
import {createPedestrians} from '../Games/Capital Drive/pedestrians.js';

const map = await loadCapitalMap();
const cpuStart = process.cpuUsage();
const start = performance.now();
const population = createPedestrians(new Scene(), map, () => 0);
const elapsed = performance.now() - start;
const cpu = process.cpuUsage(cpuStart);
const samplePlaces = new Set(['canberra-centre','kingston','manuka','black-mountain-tower']);
const sample = createHash('sha256');
for (const target of [map.spawn, ...map.landmarks.filter(place => samplePlaces.has(place.id))]) {
  population.resetPopulation(target);
  sample.update(JSON.stringify(population.snapshot()));
}
console.log(JSON.stringify({
  milliseconds: Math.round(elapsed),
  cpuMilliseconds: Math.round((cpu.user + cpu.system) / 1000),
  paths: population.stats.paths,
  sampleDigest: sample.digest('hex'),
}));
population.dispose();
