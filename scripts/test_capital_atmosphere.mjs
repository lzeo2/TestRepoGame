import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { createAtmosphere } from '../Games/Capital Drive/atmosphere.js';
import { createAtmosphereView } from '../Games/Capital Drive/atmosphere-view.js';
const clock = createAtmosphere(), first = clock.snapshot();
assert.equal(first.hour, 15); assert.equal(first.weather, 'clear'); assert.equal(first.rain, 0); assert.equal(first.wetness, 0);
// The horizon is paler than the overhead sky without adding a sky mesh.
const rgb = hex => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
const [skyRed, , skyBlue] = rgb(first.skyColor), [fogRed] = rgb(first.fogColor);
assert(skyBlue > skyRed, 'clear afternoon keeps a blue sky');
assert(fogRed > skyRed && rgb(first.fogColor).reduce((sum, value) => sum + value, 0) > rgb(first.skyColor).reduce((sum, value) => sum + value, 0), 'clear distance fades into a paler horizon');
const duskClock = createAtmosphere(); duskClock.step(360);
const dusk = duskClock.snapshot();
assert(rgb(dusk.sunColor)[0] > rgb(dusk.sunColor)[2], 'dusk direct light remains warm');
assert(dusk.hemisphereIntensity >= .6, 'dusk retains the playable ambient floor');
assert(Object.isFrozen(first)); clock.step(0); assert.deepEqual(clock.snapshot(), first);
for (const dt of [-1, Infinity, NaN]) assert.throws(() => clock.step(dt), /dt/);
assert.deepEqual(clock.snapshot(), first);
clock.step(90); assert.equal(clock.snapshot().cloud, 0);
clock.step(15); assert(clock.snapshot().cloud > .3 && clock.snapshot().cloud < .5, 'weather blends smoothly');
clock.step(15); assert.equal(clock.snapshot().weather, 'overcast'); assert.equal(clock.snapshot().cloud, .8);
clock.step(120); assert.equal(clock.snapshot().weather, 'rain'); assert.equal(clock.snapshot().rain, 1); assert.equal(clock.snapshot().wetness, 1);
const rainy = clock.snapshot(); clock.step(0); assert.deepEqual(clock.snapshot(), rainy);
clock.step(120); assert.equal(clock.snapshot().weather, 'clear'); assert.equal(clock.snapshot().rain, 0);
clock.step(360);
assert.equal(clock.snapshot().hour, 21, 'twelve supplied minutes advance six game hours rather than wrapping the day');
assert(clock.snapshot().daylight < .01, 'evening reaches the night palette');
clock.step(360); assert.equal(clock.snapshot().hour, 0, 'eighteen supplied minutes reach midnight from 15:00');
clock.step(720); assert.equal(clock.snapshot().hour, 6, 'thirty supplied minutes reach dawn');
clock.step(360); assert.equal(clock.snapshot().hour, 9, 'thirty-six supplied minutes reach morning');
assert(clock.snapshot().daylight > .99, 'morning returns to full daylight');
clock.step(720); assert.deepEqual(clock.snapshot(), first, 'complete 48-minute day and eight weather cycles return exactly');
clock.step(2880 * 3 + 120);
assert.equal(clock.snapshot().hour, 16, 'large supplied steps retain the remainder after complete days');
assert.equal(clock.snapshot().weather, 'overcast', 'longer days retain the two-minute weather cadence');
clock.step(1e300); assert(Number.isFinite(clock.snapshot().hour)); clock.reset(); assert.deepEqual(clock.snapshot(), first);
const chunked = createAtmosphere(), single = createAtmosphere();
for (let step = 0; step < 1000; step++) chunked.step(.1); single.step(100);
for (const key of ['hour', 'daylight', 'cloud', 'rain', 'wetness']) assert(Math.abs(chunked.snapshot()[key] - single.snapshot()[key]) < 1e-10, `${key} depends on supplied duration`);
// Every minute stays playable; all rendered fields remain finite and weather boundaries have no hard jump.
for (let second = 0; second < 2880; second++) {
  const a = clock.snapshot(); clock.step(.001); const b = clock.snapshot(); clock.step(.999);
  for (const [key, value] of Object.entries(a)) if (typeof value === 'number') assert(Number.isFinite(value), key);
  assert(a.hemisphereIntensity >= .6 && a.sunIntensity >= .08); assert(a.fogFar > a.fogNear);
  assert(Math.abs(b.daylight - a.daylight) < .001); assert(Math.abs(b.cloud - a.cloud) < .001);
  assert(a.rain >= 0 && a.rain <= 1 && a.wetness >= 0 && a.wetness <= 1);
}
{
  const scene = new THREE.Scene(); scene.background = new THREE.Color(); scene.fog = new THREE.Fog(0, 230, 750);
  const hemisphere = new THREE.HemisphereLight(), sun = new THREE.DirectionalLight(); scene.add(hemisphere, sun);
  const view = createAtmosphereView(scene, { hemisphere, sun, heightAt: () => 4, quality: 'performance' });
  const focus = { x: 12, z: -8 }; view.update(first, focus); assert.equal(view.stats.rainLines, 0);
  view.update(rainy, focus); assert.equal(view.stats.rainLines, 160); assert.equal(view.stats.drawCalls, 1);
  assert.equal(view.stats.geometryCount, 1); assert.equal(view.stats.materialCount, 1); assert.equal(view.stats.lightsCreated, 0);
  assert.equal(scene.children.filter(item => item.isLight).length, 2);
  const lines = scene.children.find(item => item.isLineSegments), geometry = lines.geometry, attribute = geometry.attributes.position;
  const version = attribute.version, bytes = view.stats.bufferBytes, positions = attribute.array.slice();
  for (let frame = 0; frame < 120; frame++) view.update(rainy, focus);
  assert.equal(attribute.version, version, 'paused unchanged presentation avoids rain-buffer writes');
  assert.deepEqual(attribute.array, positions); assert.equal(view.stats.bufferBytes, bytes);
  assert.equal(hemisphere.intensity, rainy.hemisphereIntensity); assert.equal(sun.intensity, rainy.sunIntensity);
  assert.equal(scene.background.getHex(), rainy.skyColor); assert.equal(scene.fog.far, rainy.fogFar);
  for (let i = 0; i < 160 * 6; i += 6) {
    assert(Math.hypot(attribute.array[i], attribute.array[i + 2]) <= 27.01);
    assert(attribute.array[i + 1] >= 1 && attribute.array[i + 1] <= 17);
  }
  view.update(rainy, focus, { quality: 'low' }); assert.equal(view.stats.rainLines, 320);
  assert.equal(geometry, lines.geometry); assert.equal(attribute.array.length, 320 * 6);
  view.update(rainy, focus, { interior: true }); assert.equal(view.stats.drawCalls, 0);
  view.update(rainy, { x: NaN, z: 0 }); assert.equal(view.stats.rainLines, 0);
  view.update(rainy, focus); assert.equal(view.stats.rainLines, 160);
  view.dispose(); view.dispose(); assert.equal(view.stats.bufferBytes, 0); assert.equal(view.stats.geometryCount, 0);
  assert.equal(scene.children.length, 2, 'disposal preserves the original world lights');
}
console.log('Capital atmosphere PASS: supplied-time 48-minute day with evening/midnight/dawn/morning phases, unchanged weather cadence, finite playable night, pause/reset, 160/320 pooled local rain, indoor hiding, no new lights and disposal');
