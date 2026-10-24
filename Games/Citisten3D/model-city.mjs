import * as THREE from './vendor/three.module.js';
import { assemble } from './model-geometry.mjs';

// Original procedural architecture, in metres. Front is -Z; all bases are Y=0.
// Curved tiles, mouldings and flutes supply silhouette/detail, not flat subdivision.
const stone = 0xd8c8a4, trim = 0xe7d9bb, metal = 0x59636b, glass = 0xa9bbc7;
function add(parts, geometry, color, surface = 3) {
  // Extrusions use shape-space metres; sphere pole UVs extend past the seam.
  // Both must fit the unit tile before assembly remaps into the facade atlas.
  if (geometry.type === 'ExtrudeGeometry' || geometry.type === 'SphereGeometry') {
    const uv = geometry.getAttribute('uv');
    let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity;
    for (let i = 0; i < uv.count; i++) {
      minU = Math.min(minU, uv.getX(i)); maxU = Math.max(maxU, uv.getX(i));
      minV = Math.min(minV, uv.getY(i)); maxV = Math.max(maxV, uv.getY(i));
    }
    for (let i = 0; i < uv.count; i++) uv.setXY(i,
      (uv.getX(i) - minU) / (maxU - minU || 1), (uv.getY(i) - minV) / (maxV - minV || 1));
  }
  parts.push({ geometry, color, surface });
}
function box(parts, x, y, z, w, h, d, color, surface = 3) {
  add(parts, new THREE.BoxGeometry(w, h, d).translate(x, y, z), color, surface);
}
function cylinder(parts, x, y, z, radius, height, color, segments = 24) {
  add(parts, new THREE.CylinderGeometry(radius, radius, height, segments).translate(x, y, z), color);
}
function lathe(parts, x, y, z, profile, color, segments = 64) {
  add(parts, new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), segments).translate(x, y, z), color);
}
function ring(parts, x, y, z, radius, tube, color, segments = 48, arc = Math.PI * 2) {
  add(parts, new THREE.TorusGeometry(radius, tube, 8, segments, arc).translate(x, y, z), color);
}
function facade(parts, x, z, rotation, build) {
  const local = [];
  build(local);
  for (const part of local) {
    part.geometry.rotateY(rotation).translate(x, 0, z);
    parts.push(part);
  }
}
function rectangle(w, h) {
  return new THREE.Shape().moveTo(-w / 2, -h / 2).lineTo(w / 2, -h / 2)
    .lineTo(w / 2, h / 2).lineTo(-w / 2, h / 2).closePath();
}
function windowFrame(parts, x, y, w, h, color = trim) {
  const shape = rectangle(w + .16, h + .16);
  const hole = new THREE.Path().moveTo(-w / 2, -h / 2).lineTo(-w / 2, h / 2)
    .lineTo(w / 2, h / 2).lineTo(w / 2, -h / 2).closePath();
  shape.holes.push(hole);
  add(parts, new THREE.ExtrudeGeometry(shape, {
    depth: .1, bevelEnabled: true, bevelSegments: 2, steps: 1,
    bevelSize: .025, bevelThickness: .025,
  }).translate(x, y, .035), color);
  box(parts, x, y, .025, w, h, .035, glass, 1);
  box(parts, x, y, .15, .035, h, .04, color);
  box(parts, x, y, .15, w, .04, .04, color);
  box(parts, x, y - h / 2 - .12, .12, w + .28, .12, .28, color);
}
function door(parts, x, y, w, h) {
  box(parts, x, y, .04, w, h, .08, 0x414c51);
  for (const side of [-1, 1]) box(parts, x + side * (w / 2 + .06), y + .04, .12, .12, h + .08, .24, trim);
  box(parts, x, y + h / 2 + .06, .12, w + .24, .12, .24, trim);
  box(parts, x, y + h * .18, .09, w * .72, h * .38, .035, glass, 1);
  box(parts, x, y - h * .28, .1, w * .72, h * .24, .08, 0x657079);
  box(parts, x + w * .3, y - .05, .18, .04, .18, .05, 0xc7ae6c);
}
function drain(parts, x, z, h) {
  cylinder(parts, x, h / 2, z, .045, h, metal, 16);
  for (let y = .4; y < h; y += 1.2) {
    add(parts, new THREE.TorusGeometry(.051, .014, 6, 16).rotateX(Math.PI / 2).translate(x, y, z), metal);
  }
}
function pitchedRoof(parts, x, y, z, w, d, rise, color, tiled = false) {
  const run = d / 2, angle = Math.atan2(rise, run), length = Math.hypot(run, rise);
  for (const side of [-1, 1]) {
    add(parts, new THREE.BoxGeometry(w, .1, length).rotateX(side * angle)
      .translate(x, y + rise / 2, z + side * run / 2), color, 2);
    if (tiled) {
      const columns = Math.floor(w / .21), rows = Math.ceil(length / .25);
      for (let col = 0; col < columns; col++) for (let row = 0; row < rows; row++) {
        const distance = (row + .5) * length / rows;
        // Half-round clay channels follow the roof pitch; no hidden tile grid.
        const tile = new THREE.CylinderGeometry(.105, .105, length / rows + .025, 8, 1, true, Math.PI / 2, Math.PI);
        tile.rotateX(Math.PI / 2).rotateX(side * angle)
          .translate(x + (col - (columns - 1) / 2) * .21, y + rise - distance * Math.sin(angle) + .055, z + side * distance * Math.cos(angle));
        add(parts, tile, (col + row) % 3 ? color : 0xa36e52, 2);
      }
    }
    add(parts, new THREE.CylinderGeometry(.07, .07, w + .08, 16).rotateZ(Math.PI / 2)
      .translate(x, y - .02, z + side * (run + .025)), metal);
  }
  add(parts, new THREE.CylinderGeometry(.12, .12, w + .08, 16, 1, true, 0, Math.PI)
    .rotateZ(Math.PI / 2).translate(x, y + rise + .03, z), color, 2);
}

function residential() {
  const p = [];
  for (let house = 0; house < 3; house++) {
    const x = (house - 1) * 2.5, h = [3.35, 3.65, 3.45][house];
    box(p, x, .1, 0, 2.25, .2, 5.6, 0x938675);
    box(p, x, h / 2, 0, 2.2, h, 5.5, [0xcba887, 0xb9b1a0, 0xd5bb92][house], 0);
    for (const z of [-2.78, 2.78]) facade(p, x, z, z < 0 ? Math.PI : 0, q => {
      windowFrame(q, -.53, 2.65, .63, .8);
      windowFrame(q, .53, 2.65, .63, .8);
      windowFrame(q, -.52, 1.1, .65, .9);
      door(q, .55, .97, .67, 1.9);
      box(q, 0, .12, .22, 2.15, .24, .5, 0x9d9587);
      box(q, 0, h - .1, .08, 2.3, .17, .22, trim);
      // Separate louver blades and masonry corner blocks cast real relief.
      for (let row = 0; row < 8; row++) for (const side of [-1, 1]) {
        box(q, side * 1.035, .35 + row * .37, .065, .12, .22, .16, trim);
      }
      for (let row = 0; row < 7; row++) {
        const blade = new THREE.BoxGeometry(.16, .07, .055).rotateX(.35).translate(-.98, .79 + row * .1, .15);
        add(q, blade, metal);
      }
    });
    pitchedRoof(p, x, h + .03, 0, 2.4, 5.8, [.65, .8, .58][house], 0x854f3e, true);
    box(p, x + .62, h + .7, .8, .35, 1.05, .5, 0xa17f68, 0);
    box(p, x + .62, h + 1.22, .8, .49, .12, .64, trim);
    for (const z of [-2.88, 2.88]) drain(p, x + 1.12, z, h);
  }
  // End walls are exposed, not detailed inside the party-wall gaps.
  for (const side of [-1, 1]) facade(p, side * 3.61, 0, side * Math.PI / 2, q => {
    for (const x of [-1.8, 0, 1.8]) windowFrame(q, x, 2.1, .8, 1.1);
  });
  return assemble(p);
}

function commercial() {
  const p = [];
  box(p, 0, .12, 0, 7.35, .24, 7.35, 0x747a7d);
  box(p, 0, 5.4, 0, 7, 10.8, 7, 0xa7b2b9, 1);
  for (let side = 0; side < 4; side++) {
    const angle = side * Math.PI / 2;
    facade(p, Math.sin(angle) * 3.51, Math.cos(angle) * 3.51, angle, q => {
      for (let floor = 0; floor < 6; floor++) for (let bay = 0; bay < 5; bay++) {
        if (side === 2 && floor === 0 && bay === 2) continue; // Entrance replaces this bay.
        windowFrame(q, (bay - 2) * 1.32, 1.1 + floor * 1.65, .99, 1.25, 0xc6c9c5);
        if (floor > 0) {
          // Projecting sunshades with three independent angled fins per bay.
          for (let fin = 0; fin < 3; fin++) add(q,
            new THREE.BoxGeometry(1.15, .045, .12).rotateX(.22)
              .translate((bay - 2) * 1.32, 1.84 + floor * 1.65, .21 + fin * .12), metal);
        }
      }
      for (let floor = 1; floor < 7; floor++) box(q, 0, floor * 1.65 + .18, .08, 7.2, .13, .23, metal);
      if (side === 2) {
        door(q, 0, 1.05, 1.55, 2.1);
        box(q, 0, 2.35, .4, 3.25, .13, .9, metal, 2);
        for (const x of [-1.4, 1.4]) cylinder(q, x, 1.15, .75, .055, 2.3, metal);
      }
    });
  }
  for (const x of [-3.47, 3.47]) for (const z of [-3.47, 3.47]) cylinder(p, x, 5.4, z, .13, 10.8, metal);
  box(p, 0, 10.95, 0, 7.4, .3, 7.4, metal, 2);
  for (const side of [-1, 1]) {
    box(p, side * 3.62, 11.25, 0, .16, .4, 7.4, 0x8b9397);
    box(p, 0, 11.25, side * 3.62, 7.4, .4, .16, 0x8b9397);
  }
  box(p, -.9, 11.4, .9, 2.6, .6, 2.4, 0x8b9397);
  for (const x of [-1.6, -.2]) {
    cylinder(p, x, 11.75, .9, .53, .22, metal, 32);
    add(p, new THREE.TorusGeometry(.45, .035, 8, 32).rotateX(Math.PI / 2).translate(x, 11.88, .9), trim);
    for (let blade = 0; blade < 8; blade++) add(p,
      new THREE.BoxGeometry(.07, .025, .85).rotateY(blade * Math.PI / 8).translate(x, 11.88, .9), metal);
  }
  return assemble(p);
}

function industrial() {
  const p = [];
  box(p, 0, .12, 0, 8.8, .24, 7.9, 0x827e73);
  box(p, 0, 2.35, 0, 8.5, 4.7, 7.6, 0xb2a58b, 0);
  for (let side = 0; side < 4; side++) {
    const angle = side * Math.PI / 2, width = side % 2 ? 7.6 : 8.5;
    facade(p, Math.sin(angle) * 4.26, Math.cos(angle) * 3.81, angle, q => {
      const ribs = Math.floor(width / .16);
      for (let rib = 0; rib < ribs; rib++) {
        const x = (rib - (ribs - 1) / 2) * .16;
        // The front loading openings replace corrugations rather than bury them.
        if (side === 2 && Math.abs(x) < 3.6) continue;
        add(q, new THREE.CylinderGeometry(.045, .045, 4.2, 8, 1, true, -Math.PI / 2, Math.PI)
          .translate(x, 2.5, .035), 0x91928b);
      }
      for (const x of [-width / 2 + .15, 0, width / 2 - .15]) {
        box(q, x, 2.4, .12, .14, 4.6, .22, metal);
        for (let bolt = 0; bolt < 10; bolt++) add(q,
          new THREE.CylinderGeometry(.035, .035, .045, 6).rotateX(Math.PI / 2)
            .translate(x, .4 + bolt * .44, .255), 0xb9bbaf);
      }
      box(q, 0, 4.6, .06, width, .18, .22, metal);
      if (side === 2) for (const x of [-2.65, 0, 2.65]) {
        box(q, x, 1.65, .06, 2.35, 3.3, .12, 0x454e52);
        for (let slat = 0; slat < 19; slat++) {
          box(q, x, .15 + slat * .16, .17, 2.22, .12, .1, 0x858c8d);
        }
        for (const edge of [-1, 1]) box(q, x + edge * 1.2, 1.75, .2, .12, 3.5, .24, trim);
        box(q, x, 3.5, .2, 2.55, .2, .25, metal);
        windowFrame(q, x, 4.08, 1.8, .45, metal);
      }
      else for (const x of [-2.3, 0, 2.3]) windowFrame(q, x, 3.65, 1.6, .65, metal);
    });
  }
  // Three sawtooth bays: shallow metal slopes and upright north-light glazing.
  for (let bay = 0; bay < 3; bay++) {
    const z = -2.6 + bay * 2.6, rise = .65, run = 2.6;
    add(p, new THREE.BoxGeometry(8.8, .12, Math.hypot(run, rise)).rotateX(Math.atan2(rise, run))
      .translate(0, 5.025, z), metal, 2);
    box(p, 0, 5.02, z - 1.26, 8.65, .65, .08, glass, 1);
    for (let mullion = 0; mullion < 15; mullion++) box(p, (mullion - 7) * .6, 5.02, z - 1.32, .045, .68, .08, trim);
    for (let seam = 0; seam < 22; seam++) add(p,
      new THREE.BoxGeometry(.035, .065, Math.hypot(run, rise)).rotateX(Math.atan2(rise, run))
        .translate((seam - 10.5) * .4, 5.1, z), 0x9ca19d);
  }
  for (const x of [-3.1, -1.05, 1.05, 3.1]) {
    cylinder(p, x, 5.5, 2.6, .33, .65, metal, 32);
    lathe(p, x, 5.6, 2.6, [[.33, 0], [.45, .1], [.52, .3], [.46, .5], [.3, .63], [.05, .68]], 0xa9afac, 32);
    // Turbine vanes are angled, separated sheet-metal blades, not extra rings.
    for (let vane = 0; vane < 20; vane++) {
      const angle = vane * Math.PI / 10;
      add(p, new THREE.BoxGeometry(.035, .46, .19).rotateY(angle + .6)
        .translate(x + Math.sin(angle) * .5, 5.94, 2.6 + Math.cos(angle) * .5), metal);
    }
    add(p, new THREE.TorusGeometry(.5, .035, 8, 32).rotateX(Math.PI / 2).translate(x, 5.88, 2.6), trim);
  }
  for (const x of [-4.34, 4.34]) drain(p, x, 3.85, 4.7);
  return assemble(p);
}

function flutedColumn(parts, x, z) {
  // 24 concave flutes, eight samples across each groove. The height profile
  // models entasis and neck taper; no coplanar axial subdivision is used.
  const profile = [[.35, 1.05], [.355, 1.2], [.362, 1.5], [.367, 1.95], [.365, 2.5],
    [.356, 3.1], [.343, 3.7], [.329, 4.3], [.315, 4.85], [.305, 5.35], [.3, 5.75], [.3, 6.05], [.31, 6.2]];
  const radial = 192, positions = [], uv = [], indices = [];
  for (let row = 0; row < profile.length; row++) for (let col = 0; col <= radial; col++) {
    const angle = col / radial * Math.PI * 2;
    const r = profile[row][0] - .038 * (1 + Math.cos(angle * 24)) / 2;
    positions.push(x + Math.sin(angle) * r, profile[row][1], z + Math.cos(angle) * r);
    uv.push(col / radial, row / (profile.length - 1));
    if (row < profile.length - 1 && col < radial) {
      const a = row * (radial + 1) + col, b = a + radial + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const shaft = new THREE.BufferGeometry();
  shaft.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  shaft.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  shaft.setIndex(indices); shaft.computeVertexNormals();
  add(parts, shaft, trim);
  box(parts, x, .65, z, .95, .3, .95, stone);
  lathe(parts, x, 0, z, [[.46, .8], [.46, .84], [.43, .89], [.4, .91], [.39, .94],
    [.43, .98], [.43, 1.02], [.39, 1.06], [.35, 1.09]], trim);
  lathe(parts, x, 0, z, [[.31, 6.15], [.34, 6.2], [.35, 6.25], [.34, 6.3], [.38, 6.34],
    [.43, 6.42], [.46, 6.52], [.47, 6.57], [.47, 6.62]], trim);
  box(parts, x, 6.7, z, 1, .18, 1, trim);
}
function pediment(parts, z, rotation) {
  facade(parts, 0, z, rotation, q => {
    const shape = new THREE.Shape().moveTo(-7.9, 7.2).lineTo(7.9, 7.2).lineTo(0, 9.05).closePath();
    add(q, new THREE.ExtrudeGeometry(shape, { depth: .28, bevelEnabled: true,
      bevelSize: .07, bevelThickness: .06, bevelSegments: 2, steps: 1 }), stone);
    box(q, 0, 7.18, .22, 16.3, .25, .65, trim);
    const length = Math.hypot(7.9, 1.85), slope = Math.atan2(1.85, 7.9);
    for (const side of [-1, 1]) add(q,
      new THREE.BoxGeometry(length + .12, .18, .34).rotateZ(-side * slope)
        .translate(side * 3.95, 8.14, .39), trim);
    for (let tooth = 0; tooth < 48; tooth++) box(q, (tooth - 23.5) * .32, 7, .27, .13, .18, .22, trim);
    ring(q, 0, 7.94, .34, .44, .065, trim, 48);
    for (let ray = 0; ray < 12; ray++) add(q,
      new THREE.BoxGeometry(.065, .25, .09).rotateZ(ray * Math.PI / 6)
        .translate(Math.sin(ray * Math.PI / 6) * .27, 7.94 + Math.cos(ray * Math.PI / 6) * .27, .36), trim);
  });
}
function clock(parts, x, z, rotation) {
  facade(parts, x, z, rotation, q => {
    add(q, new THREE.CylinderGeometry(.88, .88, .08, 64).rotateX(Math.PI / 2).translate(0, 12.8, .07), 0xeee8d7);
    ring(q, 0, 12.8, .14, .9, .075, metal, 64);
    for (let hour = 0; hour < 12; hour++) {
      const angle = hour * Math.PI / 6;
      add(q, new THREE.BoxGeometry(.055, hour % 3 ? .12 : .2, .045).rotateZ(-angle)
        .translate(Math.sin(angle) * .72, 12.8 + Math.cos(angle) * .72, .14), metal);
    }
    // Fixed ornamental clock reads 10:10; timekeeping belongs to integration.
    for (const [angle, length] of [[Math.PI / 3, .46], [-Math.PI / 3, .62]]) add(q,
      new THREE.BoxGeometry(.06, length, .045).rotateZ(angle)
        .translate(-Math.sin(angle) * length / 2, 12.8 + Math.cos(angle) * length / 2, .2), metal);
    add(q, new THREE.CylinderGeometry(.09, .09, .07, 16).rotateX(Math.PI / 2).translate(0, 12.8, .23), 0xb2995f);
  });
}
function townhall() {
  const p = [];
  box(p, 0, .25, 0, 17.4, .5, 13.9, 0xb8ae99);
  box(p, 0, 3.65, 0, 16, 6.3, 11.5, stone, 0);
  for (let step = 0; step < 5; step++) box(p, 0, (step + 1) * .05, -7.15 - (4 - step) * .29,
    17.6 - step * .12, (step + 1) * .1, .65, 0xb8ae99);
  for (const z of [-6.45, 6.25]) for (let col = 0; col < 8; col++) flutedColumn(p, (col - 3.5) * 2.05, z);
  for (const z of [-5.76, 5.76]) facade(p, 0, z, z < 0 ? Math.PI : 0, q => {
    for (const x of [-6.15, -4.1, -2.05, 2.05, 4.1, 6.15]) {
      for (const y of [2.1, 4.95]) windowFrame(q, x, y, 1.05, 1.55);
      ring(q, x, 5.72, .15, .61, .06, trim, 24, Math.PI);
    }
    door(q, 0, 2, 1.5, 3);
    windowFrame(q, 0, 5.2, 1.15, 1.3);
    for (let block = 0; block < 10; block++) {
      for (const x of [-7.8, 7.8]) box(q, x, .85 + block * .6, .06, .32, .35, .2, trim);
    }
  });
  for (const side of [-1, 1]) facade(p, side * 8.01, 0, side * Math.PI / 2, q => {
    for (const x of [-4.4, -2.2, 0, 2.2, 4.4]) for (const y of [2.1, 4.95]) windowFrame(q, x, y, 1.1, 1.55);
    box(q, 0, 3.48, .1, 11.5, .16, .28, trim);
  });
  box(p, 0, 6.95, 0, 17.3, .3, 14.1, trim);
  // Hipped roof: four non-coplanar faces instead of a tessellated flat slab.
  const roof = new THREE.CylinderGeometry(0, 1, 1, 4, 1, false).rotateY(Math.PI / 4);
  roof.scale(12, 1.5, 9.9).translate(0, 7.85, 0);
  add(p, roof, 0x6d5845, 2);
  pediment(p, -6.88, Math.PI); pediment(p, 6.88, 0);
  box(p, 0, 11.1, 1, 4, 7.2, 4, 0xc4ae83, 0);
  for (const y of [9.5, 11.4, 14.3, 14.8]) box(p, 0, y, 1, 4.35, .18, 4.35, trim);
  for (const x of [-1.9, 1.9]) for (const z of [-.9, 2.9]) box(p, x, 11.65, z, .25, 5.7, .25, trim);
  clock(p, 0, -1.02, Math.PI); clock(p, 0, 3.02, 0);
  clock(p, -2.02, 1, -Math.PI / 2); clock(p, 2.02, 1, Math.PI / 2);
  for (let side = 0; side < 4; side++) {
    const a = side * Math.PI / 2;
    facade(p, Math.sin(a) * 2.02, 1 + Math.cos(a) * 2.02, a, q => {
      for (const x of [-.65, .65]) {
        windowFrame(q, x, 10.4, .7, 1.2);
        for (let slat = 0; slat < 7; slat++) add(q,
          new THREE.BoxGeometry(.65, .07, .12).rotateX(.4).translate(x, 9.94 + slat * .14, .19), metal);
      }
      for (let tooth = 0; tooth < 12; tooth++) box(q, (tooth - 5.5) * .34, 14.52, .13, .16, .18, .22, trim);
    });
  }
  box(p, 0, 15.02, 1, 4.8, .3, 4.8, metal, 2);
  const cap = new THREE.CylinderGeometry(.3, 3.18, 1.4, 4).rotateY(Math.PI / 4).translate(0, 15.85, 1);
  add(p, cap, 0x6d5845, 2);
  cylinder(p, 0, 16.65, 1, .12, .4, metal);
  add(p, new THREE.SphereGeometry(.16, 16, 8).translate(0, 16.9, 1), 0xb2995f);
  return assemble(p);
}

export const CITY_MODELS = { residential, commercial, industrial, townhall };
