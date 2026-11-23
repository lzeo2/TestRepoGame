import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

const RANGE = { track: 204, platform: 236, tram: 460 };
const CELL = 64, TRACK_STEP = 8, STATIC_CAP = 576, FLEET_CAP = 5;
const CHARCOAL = 0x29333b, SLATE = 0x495761, GLASS = 0x426476, REFLECTION = 0x7094a1;
const PAPER = 0xe5ded1, CREAM = 0xf4e8cd, RED = 0xa23243, GOLD = 0xf2b955;
const CONCRETE = 0xaaa8a0, COPING = 0xc8c6b6, TRACK_SLAB = 0x777d7d, STEEL = 0xa6aeb3;
const WIDTH = 2.62, LENGTH = 26.4;

const piece = (x, y, z, width, height, depth, color, pitch = 0) => ({ x, y, z, width, height, depth, color, pitch });
const rangeSquared = (a, b) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
const position = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const cellKey = (x, z) => `${x},${z}`;

// Three connected sections, paired low-floor doors and a raised pantograph.
// All cabin glass is opaque tinted art, so a car costs one mesh draw in the pool.
const CABINS = [];
for (const z of [-8.46, 0, 8.46]) {
  CABINS.push(piece(0, .69, z, 2.56, .69, 8.12, RED), piece(0, .32, z, 2.31, .24, 8.08, CHARCOAL),
    piece(0, 1.87, z, 2.51, 1.73, 8.12, CHARCOAL), piece(0, 2.77, z, 2.55, .31, 8.12, PAPER),
    piece(0, 2.98, z, 2.18, .14, 7.86, CREAM), piece(0, 3.1, z - 1.8, 1.51, .16, 1.75, SLATE));
  for (const side of [-1, 1]) {
    for (const offset of [-3.07, -1.47, -.05, 3.16]) {
      CABINS.push(piece(side * 1.27, 1.99, z + offset, .07, .93, 1.18, GLASS),
        piece(side * 1.31, 2.38, z + offset, .025, .085, 1.14, REFLECTION));
    }
    CABINS.push(piece(side * 1.28, 1.22, z - .86, .08, .16, 5.85, CREAM),
      piece(side * 1.17, .26, z - 2.57, .19, .36, .98, CHARCOAL),
      piece(side * 1.17, .26, z + 2.57, .19, .36, .98, CHARCOAL));
  }
}
for (const z of [-4.23, 4.23]) {
  CABINS.push(piece(0, 1.69, z, 2.36, 2.32, .42, CHARCOAL));
  for (const dz of [-.16, -.04, .08, .19]) CABINS.push(piece(0, 1.64, z + dz, 2.4, 2.64, .045, SLATE));
}
for (const end of [-1, 1]) {
  CABINS.push(piece(0, .63, end * 12.69, 2.45, .79, .72, RED), piece(0, .45, end * 13.03, 2.21, .22, .32, CHARCOAL),
    piece(0, 1.63, end * 12.69, 2.31, 1.26, .62, RED), piece(0, 2.19, end * 12.87, 2.12, 1.27, .15, CHARCOAL, -.18 * end),
    piece(0, 2.18, end * 12.97, 1.87, .88, .045, GLASS, -.18 * end),
    piece(0, 2.49, end * 13.035, 1.74, .085, .027, REFLECTION, -.18 * end),
    piece(0, 2.73, end * 12.68, 2.22, .25, .6, CREAM), piece(0, 1.57, end * 13.01, .72, .12, .035, CHARCOAL));
  for (const x of [-.78, .78]) CABINS.push(piece(x, .86, end * 13.09, .34, .13, .05, end < 0 ? CREAM : RED));
  for (const x of [-.22, 0, .22]) CABINS.push(piece(x, 1.57, end * 13.035, .11, .05, .025, GOLD));
}
CABINS.push(piece(0, 3.13, -.12, .89, .18, 1.4, CHARCOAL), piece(0, 3.49, -.23, .085, .88, .085, SLATE, .69),
  piece(0, 3.79, -.19, .07, .65, .07, SLATE, -.72), piece(0, 4.04, -.42, 1.04, .055, .11, CHARCOAL));

function doors(openSide) {
  const parts = [];
  for (const cabin of [-8.46, 0, 8.46]) for (const side of [-1, 1]) {
    const z = cabin + 1.47;
    parts.push(piece(side * 1.27, 1.46, z, .085, 1.98, 1.48, CHARCOAL),
      piece(side * 1.31, .49, z, .12, .09, 1.43, GOLD));
    for (const leaf of [-1, 1]) {
      const at = z + leaf * (side === openSide ? .94 : .37);
      parts.push(piece(side * 1.335, 1.45, at, .044, 1.85, .69, RED),
        piece(side * 1.367, 1.84, at, .027, .91, .52, GLASS),
        piece(side * 1.376, 1.43, at - leaf * .29, .025, .28, .038, CREAM));
    }
  }
  return parts;
}
const TRAIN_ART = [doors(-1), doors(0), doors(1)].map(parts => [...CABINS, ...parts]);
const TRAIN_CAP = FLEET_CAP * TRAIN_ART[1].length;

const LETTERS = {
  A:[2,5,7,5,5], B:[6,5,6,5,6], C:[3,4,4,4,3], D:[6,5,5,5,6], E:[7,4,6,4,7], F:[7,4,6,4,4],
  G:[3,4,5,5,3], H:[5,5,7,5,5], I:[7,2,2,2,7], J:[1,1,1,5,2], K:[5,5,6,5,5], L:[4,4,4,4,7],
  M:[5,7,7,5,5], N:[5,7,7,7,5], O:[2,5,5,5,2], P:[6,5,6,4,4], Q:[2,5,5,7,3], R:[6,5,6,5,5],
  S:[3,4,2,1,6], T:[7,2,2,2,2], U:[5,5,5,5,7], V:[5,5,5,5,2], W:[5,5,7,7,5], X:[5,5,2,5,5],
  Y:[5,5,2,2,2], Z:[7,1,2,4,7],
};

function platformArt(stop, width) {
  const side = stop.side === -1 ? -1 : 1;
  const compact = width < 1.4, floor = compact ? .14 : .35, signY = compact ? 2.42 : 1.94;
  const label = String(stop.name || 'LIGHT RAIL').toUpperCase()
    .replace(/\b(STREET|AVENUE|PLATFORM|STATION|NORTHBOUND|SOUTHBOUND)\b/g, '').replace(/[^A-Z ]/g, ' ').trim().slice(0, 16);
  const ramp = compact ? .065 : .16;
  const parts = [piece(0, floor / 2 - .018, 0, 2.86, floor, 25, CONCRETE), piece(0, floor - .02, 0, 2.79, .047, 24.8, COPING),
    piece(-1.25, floor + .011, 0, .23, .02, 24.55, GOLD), piece(1.25, floor + .011, 0, .23, .02, 24.55, GOLD),
    piece(0, floor / 3, -13.2, 2.78, floor * .65, 1.5, CONCRETE, -ramp), piece(0, floor / 3, 13.2, 2.78, floor * .65, 1.5, CONCRETE, ramp),
    piece(side * .37, 2.87, 1.05, 1.93, .15, 8.78, SLATE), piece(side * .37, 2.77, 1.05, 1.75, .075, 8.63, CREAM),
    piece(side * .88, 1.18, -5.23, .29, 1.65, .57, SLATE), piece(side * .685, 1.56, -5.23, .13, .5, .46, GOLD),
    piece(side * 1.05, signY, -2.16, .125, .49, 5.08, RED)];
  // Leave tight islands open at eye height so the walking camera can see past the shelter.
  if (!compact) parts.push(piece(side * 1.22, 1.6, 1.05, .07, 2.26, 8.54, GLASS),
    piece(side * .94, .79, 1.63, .57, .16, 3.43, RED), piece(side * .92, 1.02, 1.63, .135, .4, 3.43, RED));
  for (const z of [-3.23, 1.05, 5.31]) parts.push(piece(side * 1.22, 1.52, z, compact ? .36 : .11, 2.64, .12, CHARCOAL));
  for (const z of [9.65, -9.65]) parts.push(piece(side * 1.08, 1.93, z, .1, 3.17, .11, SLATE),
    piece(side * .78, 3.53, z, .68, .074, .25, CHARCOAL), piece(side * .64, 3.478, z, .32, .045, .19, CREAM));
  // Mirror the lettering coordinates so both sides read normally from the platform.
  const spacing = Math.min(.086, 4.56 / Math.max(1, label.length * 4)), start = (label.length * 4 - 2) * spacing / 2;
  for (let index = 0; index < label.length; index++) {
    const letter = LETTERS[label[index]];
    if (!letter) continue;
    for (let row = 0; row < letter.length; row++) for (let col = 0; col < 3; col++) if (letter[row] & (4 >> col)) {
      for (const face of [-1, 1]) parts.push(piece(side * 1.05 + face * .073, signY + .14 - row * spacing,
        -2.16 + face * (start - (index * 4 + col) * spacing), .029, spacing * .92, spacing * .92, CREAM));
    }
  }
  return parts;
}

function eachTrackSpan(routes, heightAt, add) {
  const seen = new Set();
  for (const route of routes || []) {
    const points = route.points || [];
    for (let index = 1; index < points.length; index++) {
      if (!Array.isArray(points[index - 1]) || !Array.isArray(points[index])) continue;
      const [ax, az] = points[index - 1], [bx, bz] = points[index];
      const length = Math.hypot(bx - ax, bz - az);
      if (!Number.isFinite(length) || length < .05) continue;
      const fromKey = cellKey(ax, az), toKey = cellKey(bx, bz);
      const segmentKey = fromKey < toKey ? `${fromKey}/${toKey}` : `${toKey}/${fromKey}`;
      if (seen.has(segmentKey)) continue;
      seen.add(segmentKey);
      const parts = Math.ceil(length / TRACK_STEP), yaw = Math.atan2(ax - bx, az - bz);
      let from = heightAt(ax, az);
      for (let span = 0; span < parts; span++) {
        const p = (span + .5) / parts, q = (span + 1) / parts;
        const to = heightAt(ax + (bx - ax) * q, az + (bz - az) * q);
        if (Number.isFinite(from) && Number.isFinite(to)) {
          const spanLength = length / parts, slope = Math.atan2(to - from, spanLength);
          const slopeLength = Math.hypot(spanLength, to - from);
          add({ x: ax + (bx - ax) * p, y: (from + to) / 2, z: az + (bz - az) * p, yaw, pitch: slope,
            track: true, parts: [piece(0, .08, 0, 2.18, .13, slopeLength + .025, TRACK_SLAB),
              piece(-.7175, .162, 0, .071, .05, slopeLength + .065, STEEL),
              piece(.7175, .162, 0, .071, .05, slopeLength + .065, STEEL)] });
        }
        from = to;
      }
    }
  }
}

export function createLightRailView(scene, { routes = [], stops = [] } = {}, heightAt = () => 0) {
  const geometry = new THREE.BoxGeometry(1, 1, 1), material = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const track = new THREE.InstancedMesh(geometry, material, STATIC_CAP);
  const fleet = new THREE.InstancedMesh(geometry, material, TRAIN_CAP);
  track.name = 'Light rail running rails and sheltered platforms';
  fleet.name = 'Original Capital Link light rail fleet';
  for (const mesh of [track, fleet]) {
    mesh.count = 0; mesh.visible = false; mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(mesh);
  }
  const groups = new Map(), base = new THREE.Object3D(), local = new THREE.Object3D();
  const matrix = new THREE.Matrix4(), color = new THREE.Color();
  function setLocalBox(box, sx = 1, sz = 1) {
    local.position.set(box.x * sx, box.y, box.z * sz);
    local.rotation.set(box.pitch, 0, 0);
    local.scale.set(box.width * sx, box.height, box.depth * sz);
    local.updateMatrix();
  }
  const tramMatrices = TRAIN_ART.map(parts => parts.map(box => { setLocalBox(box); return local.matrix.clone(); }));
  for (let index = 0; index < TRAIN_CAP; index++) fleet.setColorAt(index, color.setHex(TRAIN_ART[1][index % TRAIN_ART[1].length].color));
  fleet.instanceColor.needsUpdate = true;
  const stats = { trains: 0, trackSections: 0, stops: 0, drawCalls: 0, triangles: 0,
    maxDrawCalls: 2, trackCapacity: STATIC_CAP, trainCapacity: TRAIN_CAP, staticUploads: 0, vehicleUploads: 0, disposed: false };
  let anchor = null, previousFleet = '';

  function add(item) {
    const key = cellKey(Math.floor(item.x / CELL), Math.floor(item.z / CELL));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  eachTrackSpan(routes, heightAt, add);
  for (const stop of stops) {
    if (!position(stop) || !Number.isFinite(stop.yaw)) continue;
    const y = Number.isFinite(stop.y) ? stop.y : heightAt(stop.x, stop.z);
    if (!Number.isFinite(y)) continue;
    const dx = 11 * Math.sin(stop.yaw), dz = 11 * Math.cos(stop.yaw);
    const pitch = Math.atan2(heightAt(stop.x - dx, stop.z - dz) - heightAt(stop.x + dx, stop.z + dz), 22);
    const clearance = Number.isFinite(stop.trackGap) ? Math.max(.15, stop.trackGap - 2.82) : 3.8;
    const width = Math.min(Number.isFinite(stop.platformWidth) && stop.platformWidth > 0 ? stop.platformWidth : 2.86, clearance);
    add({ ...stop, y, pitch, widthScale: width / 2.86, parts: platformArt(stop, width) });
  }

  function transformBase(pose) {
    base.position.set(pose.x, pose.y, pose.z);
    base.rotation.set(pose.pitch || 0, pose.yaw, 0, 'YXZ');
    base.updateMatrix();
  }
  function drawParts(mesh, pose, parts, sx = 1) {
    transformBase(pose);
    for (const box of parts) {
      setLocalBox(box, sx); matrix.multiplyMatrices(base.matrix, local.matrix);
      mesh.setMatrixAt(mesh.count, matrix); mesh.setColorAt(mesh.count, color.setHex(box.color)); mesh.count++;
    }
  }
  function flush(mesh, uploadColors = true) {
    mesh.visible = mesh.count > 0;
    if (!mesh.visible) return;
    mesh.instanceMatrix.needsUpdate = true;
    if (uploadColors) mesh.instanceColor.needsUpdate = true;
  }
  function updateTrack(focus) {
    if (anchor && rangeSquared(anchor, focus) < 18 ** 2) return;
    anchor = { x: focus.x, z: focus.z };
    track.count = 0; stats.trackSections = 0; stats.stops = 0;
    const visible = [];
    for (let x = Math.floor((focus.x - RANGE.platform) / CELL); x <= Math.floor((focus.x + RANGE.platform) / CELL); x++) {
      for (let z = Math.floor((focus.z - RANGE.platform) / CELL); z <= Math.floor((focus.z + RANGE.platform) / CELL); z++) {
        for (const item of groups.get(cellKey(x, z)) || []) {
          const distance = rangeSquared(item, focus);
          if (distance <= RANGE[item.track ? 'track' : 'platform'] ** 2) visible.push({ item, distance });
        }
      }
    }
    visible.sort((a, b) => Number(!!a.item.track) - Number(!!b.item.track) || a.distance - b.distance);
    for (const { item } of visible) {
      if (track.count + item.parts.length > STATIC_CAP) continue;
      drawParts(track, item, item.parts, item.widthScale);
      if (item.track) stats.trackSections++; else stats.stops++;
    }
    flush(track); stats.staticUploads++;
  }
  function updateFleet(vehicles, focus) {
    const selected = [];
    for (const tram of vehicles || []) {
      if (!position(tram) || !Number.isFinite(tram.yaw) || tram.active === false) continue;
      const distance = rangeSquared(tram, focus), sortId = String(tram.id ?? '');
      if (distance > RANGE.tram ** 2) continue;
      let at = selected.length;
      while (at > 0 && (distance < selected[at - 1].distance ||
        distance === selected[at - 1].distance && sortId < selected[at - 1].sortId)) at--;
      if (at >= FLEET_CAP) continue;
      const y = Number.isFinite(tram.y) ? tram.y : heightAt(tram.x, tram.z);
      if (!Number.isFinite(y)) continue;
      selected.splice(at, 0, { ...tram, y, distance, sortId });
      if (selected.length > FLEET_CAP) selected.pop();
    }
    // Distance chooses membership; stable ID order avoids GPU uploads when the
    // same five trains merely exchange distance ranks or controller array slots.
    selected.sort((a, b) => a.sortId < b.sortId ? -1 : a.sortId > b.sortId ? 1 : 0);
    const key = selected.map(tram => [tram.id, tram.x, tram.y, tram.z, tram.yaw, tram.pitch || 0, tram.width, tram.length, tram.doorsOpen ? tram.doorSide === -1 ? -1 : 1 : 0].join(',')).join(';');
    if (key === previousFleet) return;
    previousFleet = key; fleet.count = 0; stats.trains = selected.length;
    for (const tram of selected) {
      const sx = Number.isFinite(tram.width) && tram.width > 0 ? tram.width / WIDTH : 1;
      const sz = Number.isFinite(tram.length) && tram.length > 0 ? tram.length / LENGTH : 1;
      const variation = tram.doorsOpen ? tram.doorSide === -1 ? 0 : 2 : 1;
      transformBase(tram);
      for (let index = 0; index < tramMatrices[variation].length; index++) {
        let instance = tramMatrices[variation][index];
        if (sx !== 1 || sz !== 1) { setLocalBox(TRAIN_ART[variation][index], sx, sz); instance = local.matrix; }
        matrix.multiplyMatrices(base.matrix, instance); fleet.setMatrixAt(fleet.count++, matrix);
      }
    }
    flush(fleet, false); stats.vehicleUploads++;
  }
  function update(vehicles, focus) {
    if (stats.disposed) return;
    if (position(focus)) { updateTrack(focus); updateFleet(vehicles, focus); }
    else { anchor = null; previousFleet = ''; track.count = fleet.count = 0; track.visible = fleet.visible = false;
      stats.trains = stats.stops = stats.trackSections = 0; }
    stats.drawCalls = Number(track.visible) + Number(fleet.visible);
    stats.triangles = 12 * (track.count + fleet.count);
  }
  function dispose() {
    if (stats.disposed) return;
    update(null, null); stats.disposed = true; groups.clear();
    for (const mesh of [track, fleet]) { mesh.removeFromParent(); mesh.dispose(); }
    geometry.dispose(); material.dispose();
  }
  return { update, dispose, get stats() { return Object.freeze({ ...stats }); } };
}
