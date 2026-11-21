import assert from 'node:assert/strict';
import { createServiceMapIcons } from '../Games/Capital Drive/service-map-icons.js';

function context() {
  const calls = [];
  const ctx = { calls };
  for (const method of ['scale', 'beginPath', 'roundRect', 'moveTo', 'lineTo', 'quadraticCurveTo', 'closePath', 'fill', 'fillRect', 'stroke', 'drawImage']) {
    ctx[method] = (...args) => calls.push({ method, args, fill: ctx.fillStyle, stroke: ctx.strokeStyle });
  }
  return ctx;
}

const canvases = [];
const document = {
  createElement(tag) {
    assert.equal(tag, 'canvas');
    const ctx = context(), attributes = new Map();
    const canvas = { ctx, attributes, getContext: () => ctx, setAttribute: (key, value) => attributes.set(key, value) };
    canvases.push(canvas);
    return canvas;
  },
};

const icons = createServiceMapIcons(document);
assert.equal(canvases.length, 7, 'one cached raster per service or aircraft badge');
const [petrol, rental, ownDrone, policeDrone, policeHelicopter, depotHelicopter, boatShop] = canvases;
for (const raster of canvases) {
  assert.equal(raster.width, raster.height);
  assert(raster.width >= 40, 'render beyond typical map and button display sizes');
  assert(raster.ctx.calls.some(call => call.method === 'fill' && call.fill === '#fff'));
  assert(raster.ctx.calls.some(call => call.method === 'stroke' && call.stroke === '#fff'));
}
assert.deepEqual(petrol.ctx.calls.find(call => call.method === 'roundRect').args,
  rental.ctx.calls.find(call => call.method === 'roundRect').args, 'both services share the same badge outline');
assert.notEqual(petrol.ctx.calls.find(call => call.method === 'fill').fill, rental.ctx.calls.find(call => call.method === 'fill').fill);
assert(petrol.ctx.calls.some(call => call.method === 'quadraticCurveTo'), 'petrol is distinguished by a hose');
assert(rental.ctx.calls.some(call => call.method === 'closePath'), 'rental is distinguished by a car silhouette');
assert.notEqual(ownDrone.ctx.calls.find(call => call.method === 'fill').fill, policeDrone.ctx.calls.find(call => call.method === 'fill').fill);
assert.notEqual(policeHelicopter.ctx.calls.find(call => call.method === 'fill').fill, depotHelicopter.ctx.calls.find(call => call.method === 'fill').fill);
assert(ownDrone.ctx.calls.some(call => call.method === 'lineTo'), 'drone glyph has diagonal arms');
assert(policeHelicopter.ctx.calls.some(call => call.method === 'fillRect' && call.args[2] === 15), 'helicopter glyph has one main rotor');
assert(boatShop.ctx.calls.some(call => call.method === 'quadraticCurveTo'), 'boat shop glyph includes a waterline');

const fullMap = context(), minimap = context();
icons.draw(fullMap, 'petrol', 100, 40, 20);
icons.draw(minimap, 'petrol', 66, 48, 24);
icons.draw(minimap, 'rental', 50, 30, 20);
assert.deepEqual(fullMap.calls[0].args, [petrol, 90, 30, 20, 20]);
assert.deepEqual(minimap.calls.map(call => call.args), [[petrol, 54, 36, 24, 24], [rental, 40, 20, 20, 20]]);
icons.draw(fullMap, 'player-drone', 40, 30, 20);
icons.draw(minimap, 'helicopter', 80, 70, 20);
assert.deepEqual(fullMap.calls.at(-1).args, [ownDrone, 30, 20, 20, 20]);
assert.deepEqual(minimap.calls.at(-1).args, [policeHelicopter, 70, 60, 20, 20]);
assert.equal(canvases.length, 7, 'drawing on the maps does not regenerate glyphs');
for (const [kind, raster] of [['petrol', petrol], ['rental', rental]]) {
  const icon = icons.createElement(kind);
  assert.equal(icon.className, 'map-service-icon');
  assert.equal(icon.attributes.get('aria-hidden'), 'true');
  assert.deepEqual(icon.ctx.calls[0].args, [raster, 0, 0], 'controls copy the exact map raster');
}
assert.equal(icons.createElement('gym'), null);
icons.draw(minimap, 'gym', 50, 30, 20);
icons.draw(minimap, 'rental', 50, 30, 0);
assert.equal(minimap.calls.length, 3);
console.log('PASS service and aircraft icons share seven bounded cached rasters across maps and labeled controls');
