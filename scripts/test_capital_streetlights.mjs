import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { createTerrainSampler } from '../Games/Capital Drive/terrain.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { applyAirport } from '../Games/Capital Drive/airport.js';
import { applyRoadProfiles, roadProfile } from '../Games/Capital Drive/road-network.js';
import { createStreetlights, STREETLIGHT_CAP } from '../Games/Capital Drive/streetlights.js';
import { createStreetlightsView, STREETLIGHT_VIEW_LIMITS } from '../Games/Capital Drive/streetlights-view.js';

const json = async key => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${key}.json`, import.meta.url), 'utf8'));
const [south, north, profiles, airport, terrain] = await Promise.all(
  ['canberra', 'canberra-north', 'road-profiles', 'airport', 'airport-terrain'].map(json));
const map = applyAirport(applyMapExpansion(applyRoadProfiles(south, profiles), north), airport, terrain);
const sampler = createTerrainSampler(map);
const simulation = createSimulation(map, { isOnBridge: sampler.isOnBridge, trafficCount: 0, nitroAutoRecharge: false });
const options = { waterAt: simulation.waterAt, isOnBridge: sampler.isOnBridge, canOccupy: simulation.canOccupy, nearestRoad: simulation.nearestRoad };
const lamps = createStreetlights(map.roads, options);

const estimates=createStreetlights(map.roads,{...options,columns:[]});
assert.equal(estimates.length, STREETLIGHT_CAP, 'existing estimated coverage retains its budget');
const surveyed=lamps.filter(lamp=>lamp.source==='ACT');
assert(surveyed.length>100 && lamps.length>estimates.length,'surveyed city-centre clusters add coverage');
assert(surveyed.some(lamp=>lamp.tint==='led') && surveyed.some(lamp=>lamp.tint==='sodium'));
assert(surveyed.some(lamp=>lamp.outreach>2) && surveyed.some(lamp=>lamp.height>8));
for (const lamp of lamps.filter(lamp=>!lamp.source))
  assert(!surveyed.some(column=>Math.hypot(lamp.x-column.x,lamp.z-column.z)<=12),'no duplicate inferred pole beside a surveyed one');

assert(Object.isFrozen(lamps));
assert.equal(new Set(lamps.map(lamp => lamp.id)).size, lamps.length, 'lamp ids are unique');
const rebuilt = createStreetlights(map.roads, options);
assert.equal(JSON.stringify(lamps), JSON.stringify(rebuilt), 'lamp placement is deterministic across rebuilds');
const roadsById = new Map(map.roads.map(road => [String(road.id), road]));
const segmentDistance = (road, x, z) => {
  let best = Infinity;
  for (let i = 1; i < road.points.length; i++) {
    const [ax, az] = road.points[i - 1], [bx, bz] = road.points[i];
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
};
for (const lamp of lamps) {
  assert(Object.isFrozen(lamp));
  assert([lamp.x, lamp.z, lamp.yaw].every(Number.isFinite));
  const road = roadsById.get(lamp.roadId);
  assert(road, 'lamp claims an existing road id');
  assert(!lamp.roadId.includes('-airport-'), 'no lamps on airport ways');
  assert(!(road.sourceTags?.bridge && road.sourceTags.bridge !== 'no'), 'no lamps on tagged bridge ways');
  const profile = roadProfile(road);
  const distance = segmentDistance(road, lamp.x, lamp.z);
  assert(distance <= (lamp.source ? 18 : 9), `lamp stays on its road verge (${distance.toFixed(2)})`);
  assert(distance >= profile.driveWidth / 2 - .25, `lamp sits outside its roadway (${distance.toFixed(2)})`);
  assert(!simulation.waterAt(lamp.x, lamp.z), 'no lamps in water');
  assert(!sampler.isOnBridge(lamp.x, lamp.z), 'no lamps on bridge decks');
  const near = simulation.nearestRoad(lamp.x, lamp.z);
  assert(near.distance >= roadProfile(near.road).driveWidth / 2 - .5, 'no lamp pole inside any roadway');
  assert(simulation.canOccupy({ ...lamp }, { length: .4, width: .4 }), 'lamp pole clears live street geometry');
}

const scene = new THREE.Scene();
const heightAt = (x, z) => x * .03 - z * .08;
const view = createStreetlightsView(scene, lamps, heightAt);
const [poles, glow] = scene.children;
assert(scene.children.every(mesh => mesh.isInstancedMesh && !mesh.isLight && !mesh.castShadow));
assert(glow.material.transparent&&glow.material.side===THREE.DoubleSide&&glow.material.forceSinglePass,
  'Three must submit the flat two-sided glow in one GPU pass');
assert.equal(view.stats.placedLamps,lamps.length);
assert.equal(view.stats.sourceColumns,surveyed.length);
assert.equal(view.stats.lamps,0,'no scenery drawn before receiving exterior camera focus');
const focus=surveyed.find(lamp=>lamp.street==='Bunda Street') || surveyed[0];
view.update(focus);
assert(view.stats.visibleColumns>1 && view.stats.lamps<=STREETLIGHT_CAP);
assert.equal(poles.count,view.stats.lamps*3);assert.equal(glow.count,view.stats.lamps*2);
assert.equal(view.stats.poleInstances,view.stats.lamps*3);
assert.equal(view.stats.glowInstances, view.stats.lamps * 2);
assert.equal(view.stats.maxDrawCalls, STREETLIGHT_VIEW_LIMITS.maxDrawCalls);
const focusCount=view.stats.lamps, writes=view.stats.matrixWrites, queries=view.stats.queries;
view.update(focus, { night: .3, hour: 13 });
assert.equal(view.stats.drawCalls, 1, 'daytime shows poles only');
assert.equal(view.stats.glowDrawCalls, 0, 'daytime glow pass draws nothing');
assert.equal(glow.visible, false);
assert.equal(view.stats.night, .3);
view.update(focus);
assert.equal(view.stats.glowDrawCalls, 0, 'default options mean day');
view.update(focus, { night: .6, hour: 21 });
const dusk = glow.material.opacity;
assert(dusk > 0 && dusk < .55, 'twilight ramps part way');
assert.equal(view.stats.glowDrawCalls, 1);
view.update(focus, { night: 1, hour: 23 });
assert.equal(glow.material.opacity, .55, 'full night glow');
assert.equal(view.stats.drawCalls, 2, 'night adds exactly one glow draw');
assert.equal(view.stats.glowDrawCalls, 1);
view.update(focus, { night: NaN, hour: 23 });
assert.equal(view.stats.glowDrawCalls, 0, 'invalid night input falls back to day');

for(let i=0;i<600;i++)view.update(focus,{night:i%2});
assert.equal(view.stats.matrixWrites,writes,'stationary clock changes do not upload scenery');
assert.equal(view.stats.queries,queries,'stationary camera never requeries citywide columns');
const maxDraws=view.stats.drawCalls;
view.update({x:9e6,z:9e6},{night:1});
assert.equal(view.stats.drawCalls,0,'out-of-range city is fully culled');
view.update(focus,{night:1});
assert.equal(view.stats.drawCalls,maxDraws);
assert.equal(view.stats.lamps,focusCount);
const sampleScene=new THREE.Scene();
const synthetic={x:6,z:6,roadId:'road',source:'ACT',outreach:3.7,height:10.5,tint:'led',column:'steel',yaw:0};
const compare=createStreetlightsView(sampleScene,[{...synthetic,id:'a'},{...synthetic,id:'b',x:25,outreach:.6,height:4.5,tint:'sodium',column:'heritage'}],heightAt);
compare.update(synthetic,{night:1});
const [sampleMasts,sampleGlows]=sampleScene.children, matrix=new THREE.Matrix4(), cool=new THREE.Color(),warm=new THREE.Color();
sampleMasts.getMatrixAt(0,matrix);
assert(Math.abs(matrix.elements[5]-10.5)<1e-6,'surveyed mast height is rendered');
sampleMasts.getMatrixAt(2,matrix);
assert(Math.abs(matrix.elements[14]-(synthetic.z-3.7))<1e-5,'recorded outreach aims the head toward the roadway');
sampleGlows.getMatrixAt(0,matrix);
assert(Math.abs(matrix.elements[13]-heightAt(matrix.elements[12],matrix.elements[14])-.11)<1e-5,'night pool sampled on the sloping road under the head');
sampleGlows.getColorAt(0,cool);sampleGlows.getColorAt(2,warm);
assert(cool.b>warm.b && cool.g>warm.g,'surveyed white LEDs and warm sodium lamps differ');
compare.dispose();

const dense=createStreetlightsView(new THREE.Scene(),Array.from({length:300},(_,i)=>({...synthetic,id:'thing-'+i,x:i,z:6})));
dense.update(synthetic,{night:1});
assert.equal(dense.stats.lamps,STREETLIGHT_CAP);assert.equal(dense.stats.drawCalls,2);
assert(dense.stats.poleInstances<=STREETLIGHT_VIEW_LIMITS.maxPoleInstances && dense.stats.glowInstances<=STREETLIGHT_VIEW_LIMITS.maxGlowInstances);
dense.dispose();
const resources = [poles, glow, poles.geometry, glow.geometry, poles.material, glow.material, glow.material.map];
let disposals = 0;
for (const resource of resources) resource.addEventListener('dispose', () => disposals++);
const beforePoles = poles.count;
view.dispose(); view.dispose();
view.update(focus, { night: 1 });
assert.equal(disposals, resources.length, 'every owned GPU resource disposed exactly once');
assert.equal(scene.children.length, 0);
assert.equal(view.stats.lamps, 0);
assert.equal(view.stats.drawCalls, 0);
assert.equal(view.stats.poleInstances, 0);
assert(view.stats.disposed);
assert.equal(beforePoles,focusCount*3,'returning to the district restores its visible lamp set');

const pair = [Object.freeze({ id: 'a', x: 1, z: 1, yaw: 0, roadId: 'r' }), Object.freeze({ id: 'b', x: -1, z: 1, yaw: 0, roadId: 'r' })];
const broken = createStreetlightsView(new THREE.Scene(), pair, (x, z) => (x < 0 ? NaN : 1));
broken.update({x:0,z:0});
assert.equal(broken.stats.lamps, 1, 'lamps without finite ground are skipped');
broken.dispose();
assert(broken.stats.disposed);

console.log(JSON.stringify({pass:true,estimatedBaseline:estimates.length,placed:lamps.length,surveyed:surveyed.length,
  sampleStreet:focus.street,sampleVisible:focusCount,sampleNightDraws:maxDraws,cap:STREETLIGHT_CAP,
  stationaryUploads:0,stationaryQueries:0,simulatedSeconds:10}));
