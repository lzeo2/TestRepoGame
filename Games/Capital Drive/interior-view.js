import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { mergeGeometries } from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';

const SHOP_GLYPHS={
  A:'010 101 111 101 101',C:'011 100 100 100 011',D:'110 101 101 101 110',E:'111 100 110 100 111',
  F:'111 100 110 100 100',G:'011 100 101 101 011',I:'111 010 010 010 111',L:'100 100 100 100 111',
  O:'010 101 101 101 010',P:'110 101 110 100 100',R:'110 101 110 101 101',S:'011 100 010 001 110',
};

// One active room set, one opaque vertex-colour batch, no retained per-building meshes.
export function createInteriorView(scene) {
  const root = new THREE.Group(); root.name = 'Active original interior'; scene.add(root);
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const lootMaterial = new THREE.MeshLambertMaterial({ color: 0xeec964 });
  let disposed = false, current = null, lootMarker = null, roomTriangles = 0;
  const stats = { active: 0, meshes: 0, draws: 0, triangles: 0, furniture: 0 };
  function clear() {
    for (const mesh of [...root.children]) { root.remove(mesh); mesh.geometry.dispose(); }
    current = null; lootMarker = null; roomTriangles = 0;
    Object.assign(stats, { active: 0, meshes: 0, draws: 0, triangles: 0, furniture: 0 });
  }
  function setHeistLootActive(active) {
    if (!lootMarker) return false;
    lootMarker.visible = active === true;
    stats.draws = 1 + Number(lootMarker.visible);
    stats.triangles = roomTriangles + (lootMarker.visible ? 8 : 0);
    return true;
  }
  function load(plan) {
    if (disposed) return false;
    if (plan === current) return true;
    clear();
    if (!plan) return false;
    const pieces = [];
    function addGeometry(geometry, tint) {
      const color = new THREE.Color(tint), colors = new Float32Array(geometry.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) color.toArray(colors, i);
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); pieces.push(geometry);
    }
    function box(x, y, z, width, height, depth, yaw, tint) {
      addGeometry(new THREE.BoxGeometry(width, height, depth).rotateY(yaw).translate(x, y, z), tint);
    }
    function detail(item, x, y, z, width, height, depth, color) {
      const c = Math.cos(item.yaw), s = Math.sin(item.yaw);
      box(item.x + c * x + s * z, item.y + y, item.z - s * x + c * z,
        width, height, depth, item.yaw, color);
    }
    const o = plan.origin, c = Math.cos(o.yaw), s = Math.sin(o.yaw);
    if (plan.footprint) {
      const contour = plan.footprint.map(p => new THREE.Vector2(p.x, p.z));
      const triangles = THREE.ShapeUtils.triangulateShape(contour, []), positions = [];
      for (const triangle of triangles) for (const index of [triangle[0], triangle[2], triangle[1]]) {
        const p = plan.footprint[index];
        positions.push(o.x + c * p.x + s * p.z, plan.floorY, o.z - s * p.x + c * p.z);
      }
      const floor = new THREE.BufferGeometry();
      floor.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      floor.setIndex(Array.from({ length: positions.length / 3 }, (_, i) => i));
      floor.computeVertexNormals();
      // Match the box batches' attribute schema for the one-draw merge.
      floor.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(positions.length / 3 * 2), 2));
      addGeometry(floor, 0xa88e70);
    } else box(o.x + s * plan.depth / 2, plan.floorY - 0.08, o.z + c * plan.depth / 2,
      plan.width, 0.16, plan.depth, o.yaw, plan.type === 'house' ? 0xa88e70 : 0xb3b1a0);
    for (const room of plan.rooms || []) {
      const color = { living: 0xaa9c84, kitchen: 0xb8b6a4, bedroom: 0x9b9e90, bathroom: 0xb2c1bb,
        'bank-lobby': 0xc8c4b9, 'tower-archive': 0xb3bdad, 'memorial-gallery':0xc7c0ac, 'jeweller-showroom': 0xb7a9b2, shop: 0xb3b1a0, grocery: 0xc1c4b1, 'fast-food-dining': 0xbda78c, 'cafe-dining': 0xc4b49a, concourse: 0xd1c7b1, 'mall-unit': 0xb7b39e,
        'noodle-dining': 0xc9baa0, 'noodle-kitchen': 0xb3bbb0, 'gym-floor': 0x777e79, 'school-corridor': 0xaeb9ab, classroom: 0xc1baa4, 'staff-area': 0xb6b6a5 }[room.kind];
      box(room.x, plan.floorY + 0.006, room.z, room.width - 0.12, 0.012, room.depth - 0.12, o.yaw, color);
    }
    for (const wall of plan.walls) {
      box(wall.x, wall.y + wall.height / 2, wall.z, wall.width, wall.height, wall.depth, wall.yaw, wall.color);
      // Skirting follows the same collision solids and leaves every doorway clear.
      box(wall.x, wall.y + 0.065, wall.z, wall.width + 0.025, 0.13, wall.depth + 0.025, wall.yaw, 0x84765f);
    }
    for (const item of plan.furniture) {
      const { width: w, depth: d, height: h, color } = item;
      if (item.kind === 'jewellery-case' || item.kind==='exhibition-case') {
        detail(item, 0, .32, 0, w, .64, d, color);
        detail(item, 0, .69, 0, w * .88, .07, d * .9, 0x34313d);
        for (const x of [-1, 1]) for (const z of [-1, 1]) detail(item, x * (w / 2 - .035), .91,
          z * (d / 2 - .035), .07, .42, .07, 0xd4b577);
        detail(item, 0, h, 0, w, .055, d, 0x98adb3);
        for (const z of item.kind==='exhibition-case'?[]:[-d * .26, d * .26]) {
          detail(item, 0, .76, z, w * .68, .06, d * .22, 0x6b5268);
          detail(item, -.22, .84, z, .15, .12, .15, 0xe0cc88);
          detail(item, .21, .85, z, .13, .15, .13, 0xd4dbe7);
        }
        if(item.kind==='exhibition-case') {
          detail(item,0,.8,0,w*.6,.16,d*.45,0xb9a371);
          detail(item,w*.05,.96,0,w*.27,.16,d*.3,0xcac2a7);
          for(const x of [-w*.22,w*.22])for(const z of [-d*.25,d*.25])detail(item,x,.77,z,w*.13,.2,d*.075,0x44514d);
        }
      } else if(item.kind==='shipping-crate') {
        detail(item,0,h/2,0,w,h,d,color);
        for(const y of [.12,h-.12])detail(item,0,y,-d/2-.01,w,.065,.025,0x6f6551);
        for(const x of [-w*.35,w*.35])detail(item,x,h/2,-d/2-.025,.07,h,.035,0xc3b18b);
      } else if(item.kind==='coffee-machine') {
        detail(item,0,h*.22,0,w,h*.44,d,0x6d6d60);
        detail(item,0,h*.73,d*.14,w*.9,h*.48,d*.58,0x586b6a);
        detail(item,0,h*.46,-d*.2,w*.9,.07,d*.5,0xbfc4b9);
        for(const z of [-d*.2,d*.17])detail(item,w*.34,h*.62,z,.08,.19,.08,0x333e3c);
      } else if (item.kind === 'teller-counter' || item.kind === 'jeweller-counter') {
        detail(item, 0, h / 2, 0, w, h, d, color);
        detail(item, 0, h + .05, 0, w + .08, .1, d + .08, 0x3d4653);
        for (let x = -w / 2 + .18; x < w / 2; x += .38) detail(item, x, h * .46, -d / 2 - .012, .025, h * .7, .02, 0xc2b58d);
        for (const x of [-w * .28, w * .28]) {
          detail(item, x, h + .14, .1, .4, .16, .3, 0x333a48);
          detail(item, x, h + .35, .2, .46, .3, .08, 0x52717c);
        }
      } else if (item.kind === 'banquette') {
        detail(item, 0, 0.2, 0, w, 0.4, d, 0xa7834f);
        detail(item, 0, 0.47, 0, w, 0.16, d, color);
        detail(item, -w / 2 + 0.075, 0.82, 0, 0.15, 0.7, d, color);
        for (const z of [-d / 3, 0, d / 3]) detail(item, -w / 2 + 0.157, 0.82, z, 0.018, 0.66, 0.025, 0xb05a32);
      } else if (item.kind === 'padded-chair' || item.kind === 'stool') {
        const seat = item.kind === 'stool' ? h - 0.06 : 0.46;
        detail(item, 0, seat, 0, w, 0.12, d, color);
        if (item.kind !== 'stool') detail(item, 0, 0.71, -d / 2 + 0.035, w, 0.34, 0.07, color);
        for (const x of [-1, 1]) for (const z of [-1, 1]) detail(item, x * (w / 2 - 0.055), seat / 2,
          z * (d / 2 - 0.055), 0.06, seat, 0.06, 0xb59563);
      } else if (item.kind === 'shelves') {
        detail(item, -w / 2 + 0.04, h / 2, 0, 0.08, h, d, color);
        for (const end of [-1, 1]) detail(item, 0, h / 2, end * (d / 2 - 0.035), w, h, 0.07, color);
      } else if (item.kind === 'exercise-bench') {
        detail(item, 0, h - 0.07, 0, w, 0.14, d, color);
        detail(item, 0, h / 2, 0, 0.12, h - 0.14, d * 0.75, 0x657073);
        for (const z of [-0.75, 0.75]) detail(item, 0, 0.08, z, 1.1, 0.12, 0.22, 0x657073);
      } else if (item.kind === 'bench-rack') {
        detail(item, 0, h / 2, 0, w, h, 0.16, color);
        detail(item, 0, 0.08, 0, 0.6, 0.16, d, color);
        detail(item, 0, h - 0.3, -0.12, w + 0.05, 0.1, 0.36, 0xb1b8ae);
      } else if (item.kind === 'weight-rack') {
        for (const z of [-d / 2 + 0.15, d / 2 - 0.15]) detail(item, 0, h / 2, z, w, h, 0.16, color);
        for (const y of [0.42, 0.92]) {
          detail(item, 0, y, 0, w, 0.1, d, color);
          for (let z = -d / 2 + 0.4; z < d / 2; z += 0.55) {
            detail(item, 0, y + 0.13, z, w * 0.75, 0.1, 0.08, 0xb1b8ae);
            for (const x of [-0.23, 0.23]) detail(item, x, y + 0.13, z, 0.14, 0.28, 0.24, 0x303c40);
          }
        }
      } else if (item.kind === 'rower') {
        detail(item, 0, 0.16, 0, 0.2, 0.2, d, color);
        detail(item, 0, 0.44, -0.3, w * 0.75, 0.18, 0.6, 0x35474a);
        detail(item, 0, 0.42, d * 0.36, w, 0.7, 0.6, color);
        detail(item, 0, 0.78, d * 0.23, w * 0.8, 0.1, 0.1, 0xb4c1ba);
        for (const x of [-0.28, 0.28]) detail(item, x, 0.25, 0.3, 0.22, 0.1, 0.45, 0x35474a);
      } else if (item.kind === 'curl-rack') {
        detail(item, 0, h / 2, 0, w, h, d * 0.65, color);
        for (const x of [-0.5, 0, 0.5]) {
          detail(item, x, h + 0.08, 0, 0.28, 0.06, 0.08, 0xc0c8bd);
          for (const side of [-1, 1]) detail(item, x + side * 0.16, h + 0.08, 0, 0.1, 0.22, 0.22, 0x303c40);
        }
      } else if (item.kind === 'booth') {
        detail(item, 0, 0.45, 0, w, 0.2, d, color);
        detail(item, w / 2 - 0.06, 0.7, 0, 0.12, 0.7, d, color);
        for (const end of [-1, 1]) detail(item, 0, 0.25, end * (d / 2 - 0.12), w, 0.5, 0.16, 0x735b45);
      } else if (item.kind === 'treadmill') {
        detail(item, 0, 0.13, 0, w, 0.26, d, color);
        detail(item, 0, 0.28, 0, w * 0.78, 0.05, d * 0.75, 0x343d3e);
        for (const x of [-w * 0.42, w * 0.42]) detail(item, x, h / 2, d * 0.34, 0.09, h, 0.12, color);
        detail(item, 0, h, d * 0.34, w, 0.16, 0.38, 0x3a4849);
        detail(item, 0, h + 0.09, d * 0.34, w * 0.55, 0.03, 0.24, 0x94b6a4);
      } else if (item.kind === 'arcade') {
        detail(item, 0, h * 0.3, 0, w, h * 0.6, d, color);
        detail(item, 0, h * 0.78, d * 0.22, w, h * 0.44, d * 0.5, color);
        detail(item, 0, h * 0.78, -0.015, w * 0.78, h * 0.3, 0.035, 0x263e47);
        for (const x of [-0.22, 0, 0.22]) detail(item, x, h * 0.78, -0.04, 0.1, 0.1, 0.02, 0xc8b873);
        detail(item, 0.2, h * 0.62, -d * 0.25, 0.1, 0.08, 0.1, 0xc79875);
      } else if (item.kind === 'bench') {
        detail(item, 0, h - 0.09, 0, w, 0.18, d, color);
        for (const end of [-1, 1]) detail(item, 0, (h - 0.18) / 2, end * (d / 2 - 0.3), w * 0.65, h - 0.18, 0.15, 0x5e6458);
      } else if (/table/.test(item.kind) || ['office-desk','school-desk','workshop-bench','registrar-desk','gallery-ledger-desk','gallery-info-desk','archive-desk'].includes(item.kind)) {
        detail(item, 0, h - 0.05, 0, w, 0.1, d, color);
        for (const x of [-1, 1]) for (const z of [-1, 1]) detail(item, x * (w / 2 - 0.09), h / 2,
          z * (d / 2 - 0.09), 0.09, h - 0.1, 0.09, color);
      } else detail(item, 0, h / 2, 0, w, h, d, color);
      if (item.kind === 'ledger-case') {
        detail(item, 0, h - .07, 0, w + .02, .06, d + .02, 0x8a9a83);
        detail(item, 0, h * .57, -d / 2 - .015, .22, .12, .025, 0xd1bb7b);
        for (const x of [-.2, .2]) detail(item, x, h * .58, -d / 2 - .03, .04, .22, .03, 0x394c48);
        detail(item, 0, h + .035, 0, .23, .07, .08, 0x394c48);
      } else if (item.kind === 'alarm-panel') {
        detail(item, -w / 2 - .012, h / 2, 0, .025, .3, .3, 0xead9ae);
        detail(item, -w / 2 - .03, h * .72, 0, .025, .035, .2, 0x97362e);
      } else if (item.kind === 'office-desk') {
        detail(item, 0, h + 0.1, 0.2, 0.4, 0.15, 0.3, 0x4e5a57);
        detail(item, 0, h + 0.48, 0.25, 1.05, 0.65, 0.08, 0x354440);
        detail(item, 0, h + 0.48, 0.2, 0.9, 0.5, 0.025, 0xaec4b2);
        detail(item, 0, h + 0.035, -0.24, 0.65, 0.05, 0.24, 0x4e5a57);
      } else if (item.kind === 'cash-safe' || item.kind === 'jewel-safe') {
        detail(item, 0, h / 2, -d / 2 - .025, w * .84, h * .85, .05, 0x394550);
        detail(item, 0, h * .55, -d / 2 - .075, w * .27, .06, .06, 0xbaa97a);
        detail(item, 0, h * .55, -d / 2 - .08, .06, h * .22, .06, 0xbaa97a);
        for (const y of [.25, h - .25]) detail(item, -w * .34, y, -d / 2 - .06, .06, .16, .08, 0xadb7b6);
        if(item.kind==='cash-safe')for(const y of [.3,.65]) {
          detail(item,0,y,-d/2-.055,w*.74,.025,.018,0xaab3ad);
          detail(item,0,y+.12,-d/2-.07,w*.3,.045,.025,0xc8b27c);
        }
      } else if (item.kind === 'document-cabinet') {
        for (const y of [.35, .85, 1.35]) {
          detail(item, 0, y, -d / 2 - .015, w * .85, .4, .03, 0xbec0b0);
          detail(item, 0, y, -d / 2 - .04, w * .25, .045, .04, 0x686f69);
        }
      } else if(item.kind==='workshop-bench') {
        detail(item,0,h+.015,0,w*.75,.03,d*.7,0x61766a);
        for(const z of [-d*.25,d*.25]) {
          detail(item,0,h+.1,z,.38,.16,.48,0xd5c49e);
          detail(item,.28,h+.06,z,.08,.08,.5,0x596463);
        }
      } else if(item.kind==='registrar-desk'||item.kind==='gallery-ledger-desk'||item.kind==='dispatch-table'||item.kind==='archive-desk') {
        detail(item,-w*.15,h+.035,-.1,Math.min(.5,w*.5),.05,.35,0xe0d4b8);
        detail(item,Math.min(.48,w*.25),h+.11,.1,.35,.22,.28,0x5d756a);
      } else if(item.kind==='gallery-info-desk') {
        detail(item,0,h+.12,0,w*.7,.24,.08,0x354b4b);
        for(const z of [-.2,0,.2])detail(item,0,h+.025,z,w*.55,.05,.13,0xddcda8);
      } else if(item.kind==='gallery-display') {
        detail(item,0,h-.26,0,w*.84,.06,d*.84,0xc6b99c);
        detail(item,0,h-.12,0,w*.5,.22,d*.48,0x8b7450);
        detail(item,0,h+.02,0,w*.73,.06,d*.7,0xe0d3b3);
      } else if(item.kind==='observation-console') {
        detail(item,0,h+.025,0,w*.9,.05,d*.9,0xb8bfa9);
        for(const z of [-d*.3,0,d*.3])detail(item,0,h+.055,z,w*.65,.025,d*.2,0x536c6b);
      } else if (item.kind === 'lockers') {
        for (let x = -w / 2 + 0.3; x < w / 2; x += 0.62) {
          detail(item, x, h / 2, -d / 2 - 0.01, 0.012, h - 0.12, 0.02, 0x717d75);
          detail(item, x + 0.12, h * 0.55, -d / 2 - 0.025, 0.05, 0.13, 0.03, 0x535d56);
        }
      } else if (item.kind === 'fridge' && plan.variant === 'grocery') {
        for (let z = -d / 2 + 0.3; z < d / 2; z += 0.55) {
          detail(item, w / 2 + 0.015, h * 0.55, z, 0.03, h * 0.77, 0.48, 0x536d71);
          detail(item, w / 2 + 0.04, h * 0.5, z - 0.15, 0.035, 0.3, 0.035, 0xcbd2c9);
        }
      } else if (item.kind === 'grill' || item.kind === 'coffee-machine') {
        detail(item, 0, h + 0.03, 0, w * 0.85, 0.06, d * 0.85, 0x303b39);
        for (const z of [-0.3, 0, 0.3]) detail(item, w / 2 + 0.015, h * 0.8, z, 0.03, 0.09, 0.09, 0xd6b979);
      } else if (item.kind === 'bed') {
        detail(item, 0, h + 0.07, 0, w - 0.1, 0.14, d - 0.12, 0xc1c8bb);
        detail(item, 0, h + 0.18, d / 2 - 0.38, w - 0.28, 0.15, 0.46, 0xe1ddc9);
        detail(item, 0, h * 0.8, d / 2, w + 0.1, h * 1.6, 0.09, 0x886c50);
      } else if (item.kind === 'sofa') {
        detail(item, -w / 2 + 0.11, h * 0.8, 0, 0.22, 0.65, d, 0x67745f);
        for (const end of [-1, 1]) detail(item, 0, h * 0.65, end * (d / 2 - 0.1), w, 0.35, 0.2, 0x67745f);
      } else if (item.kind === 'shelves') {
        for (let tier = 0; tier < 3; tier++) {
          const y = 0.3 + tier * 0.48;
          detail(item, 0, y, 0, w + 0.05, 0.055, d, 0xc1b596);
          for (let row = 0; row < 5; row++) {
            const z=-d/2+(row+.5)*d/5;
            detail(item,0,y+.16,z,w-.04,.25,d/7,[0x976955,0xc8b678,0x779080][(row+tier)%3]);
            if(plan.variant==='retail')detail(item,w/2-.018,y+.18,z,.025,.2,.028,0xe0d4b8);
          }
        }
      } else if (item.kind === 'counter' || item.kind === 'kitchen-pass') {
        detail(item, 0, h + 0.045, 0, w + 0.12, 0.09, d + 0.12, 0x44514a);
        detail(item, item.kind === 'kitchen-pass' ? 0 : 0.35, h + 0.16, item.kind === 'kitchen-pass' ? -d / 2 + 1.9 : 0.1, 0.35, 0.25, 0.3, 0x303936);
        if(plan.variant==='grocery') {
          detail(item,0,h+.1,-d*.2,w*.8,.08,d*.4,0x394943);
          detail(item,0,h+.28,d*.28,w*.7,.3,.12,0xa8b6a8);
        }
      } else if (item.kind === 'noodle-station' || item.kind === 'prep-bench') {
        detail(item, 0, h + 0.04, 0, w + 0.05, 0.08, d + 0.05, 0xc2cbc5);
        if (item.kind === 'noodle-station') {
          for (const z of [-0.65, 0.65]) {
            detail(item, 0, h + 0.15, z, w * 0.85, 0.2, 0.5, 0x4c5a55);
            detail(item, 0, h + 0.26, z, w * 0.75, 0.025, 0.4, 0xd6c39b);
          }
        } else detail(item, 0, h + 0.1, 0, w * 0.85, 0.04, 0.8, 0xb28e51);
      } else if (item.kind === 'kitchen-bench') {
        detail(item, 0, h + 0.035, 0, w + 0.08, 0.07, d + 0.08, 0xd3cbbb);
        detail(item, 0, h + 0.08, -d * 0.25, w * 0.6, 0.04, 0.65, 0x7e8d89);
        detail(item, 0, h + 0.085, d * 0.3, w * 0.7, 0.04, 0.75, 0x343b39);
      } else if (/bath|basin/.test(item.kind)) {
        detail(item, 0, h + 0.015, 0, w * 0.7, 0.03, d * 0.75, 0x849d9b);
      } else if (item.kind === 'television') {
        detail(item, 0, h * 0.78, d / 2 + 0.015, w * 0.8, h * 0.6, 0.025, 0x6f8580);
      }
    }
    for (const item of plan.details || []) {
      if(item.kind==='shop-window') {
        const {width:w,height:h}=item;
        detail(item,0,h/2,-.025,w,h,.035,0x536b6b);
        detail(item,0,h/2,.035,w-.12,h-.12,.035,item.color);
        for(const side of [-1,1])detail(item,side*(w/2-.025),h/2,.09,.055,h,.16,0x8c816a);
        for(const y of [.025,h-.025])detail(item,0,y,.09,w,.055,.16,0x8c816a);
        detail(item,0,h*.48,.07,.045,h-.09,.06,0xe0d7bd);
        detail(item,-w*.22,h*.72,.059,w*.25,.045,.01,0xcbd6c9);
      } else if(item.kind==='shop-sign') {
        detail(item,0,item.height/2,0,item.width,item.height,item.depth,item.color);
        const text=item.label||'',pixel=Math.min(.075,(item.width-.2)/Math.max(1,text.length*4-1));
        for(const [column,letter]of [...text].entries()) {
          const rows=SHOP_GLYPHS[letter]?.split(' ');if(!rows)continue;
          rows.forEach((row,y)=>{for(const run of row.matchAll(/1+/g)) {
            const x=((text.length*4-1)/2-column*4-run.index-(run[0].length-1)/2)*pixel;
            detail(item,x,item.height/2+(2-y)*pixel,-item.depth/2-.008,run[0].length*pixel*.88,pixel*.82,.014,0xeee2bf);
          }});
        }
      } else if(item.kind==='observation-window') {
        detail(item,0,item.height/2,0,item.width,item.height,item.depth,0x6f8e91);
        for(const z of [-item.depth/2,0,item.depth/2])detail(item,-.025,item.height/2,z,.07,item.height+.12,.06,0xb8b6a3);
        for(const y of [0,item.height])detail(item,-.025,y,0,.07,.06,item.depth,0xb8b6a3);
        // Abstract skyline relief keeps the view original and within the wall plane.
        for(const [index,rise]of [.2,.35,.24,.5,.3,.18].entries())detail(item,-.045,rise/2,-item.depth*.4+index*item.depth*.16,.025,rise,item.depth*.11,0x536f6b);
      } else if(item.kind==='gallery-panel') {
        detail(item,0,item.height/2,0,item.width,item.height,item.depth,item.color);
        for(const z of [-item.depth*.28,0,item.depth*.28]) {
          detail(item,item.face*.045,item.height*.66,z,.035,item.height*.3,item.depth*.2,0xb8a77f);
          detail(item,item.face*.048,item.height*.34,z,.038,.045,item.depth*.22,0xddd0b0);
        }
      } else if(item.kind==='shop-light') {
        detail(item,0,item.height/2,0,item.width+.12,item.height,item.depth+.12,0x6a766e);
        detail(item,0,-.008,0,item.width,.025,item.depth,item.color);
      } else if(item.kind==='window-daylight'||item.kind==='shop-aisle') {
        detail(item,0,item.height/2,0,item.width,item.height,item.depth,item.color);
      } else if(item.kind==='cafe-setting') {
        detail(item,0,.015,0,.3,.03,.3,0xd8cdb2);
        addGeometry(new THREE.CylinderGeometry(.075,.062,.14,8).translate(item.x,item.y+.1,item.z),0xe8ddc7);
        addGeometry(new THREE.CircleGeometry(.062,8).rotateX(-Math.PI/2).translate(item.x,item.y+.172,item.z),0x624836);
        detail(item,.083,.1,0,.055,.07,.045,0xe8ddc7);
      } else if (item.kind === 'television') {
        detail(item, 0, item.height / 2, 0, item.width, item.height, item.depth, item.color);
        detail(item, 0, item.height / 2, item.depth / 2 + .008, item.width * .86, item.height * .78, .012, 0x6f8580);
        detail(item, 0, -.17, -.025, .1, .34, .08, 0x656c67);
      } else if (item.kind === 'basin') {
        detail(item, 0, item.height / 2, 0, item.width, item.height, item.depth, item.color);
        detail(item, 0, item.height + .008, 0, item.width * .7, .016, item.depth * .65, 0x849d9b);
        detail(item, 0, item.height + .07, -item.depth / 2 + .05, .06, .14, .06, 0x929d96);
      }
    }
    if (plan.type === 'mall') {
      const local = { x: o.x, z: o.z, yaw: o.yaw, y: plan.floorY };
      // Original stone/coffer rhythm, informed by Monaro Mall's documented materials.
      // These are abstract tiles, not a copy of the centre's artist mosaics.
      for (const door of plan.doors.filter(d => d.kind === 'unit')) {
        for (const end of [-1, 1]) detail({ ...door, yaw: o.yaw }, 0, 1.4, end * (door.width / 2 + 0.18), 0.42, 2.8, 0.36, 0xe0d8c4);
        detail({ ...door, yaw: o.yaw }, 0, 2.78, 0, 0.42, 0.22, door.width + 0.7, 0xe0d8c4);
      }
      detail(local, 0, 3.08, plan.depth / 2, plan.width, 0.1, plan.depth, 0xe3dfd2);
      for (let z = 3; z < plan.depth; z += 5) {
        detail(local, 0, 2.93, z, plan.width, 0.2, 0.18, 0xbdb8a7);
        for (let x = -plan.width / 2 + 5; x < plan.width / 2; x += 10) detail(local, x, 3, z + 2.5, 0.15, 0.13, 5, 0xbdb8a7);
        detail(local, 0, 0.018, z, 9.5, 0.012, 0.05, 0xa59579);
        for (const x of [-2.2, 0, 2.2]) detail(local, x, 0.025, z + 1.5, 0.45, 0.012, 0.45, x ? 0xad8e69 : 0x867b68);
      }
      for (const x of [-4.7, 4.7]) detail(local, x, 0.02, plan.depth / 2, 0.08, 0.012, plan.depth - 0.4, 0x8e8069);
    }
    if (plan.variant === 'noodles') {
      const local = { x: o.x, z: o.z, yaw: o.yaw, y: plan.floorY };
      detail(local, 0, 2.74, plan.depth / 2, plan.width, 0.08, plan.depth, 0xe4dfd2);
      // A clear front kitchen window exposes the cook; the pane adds no collision solid.
      for (const x of [-2.98, -1.32]) detail(local, x, 1.55, 0.08, 0.06, 1.5, 0.08, 0x645945);
      detail(local, -2.15, 2.3, 0.08, 1.72, 0.06, 0.08, 0x645945);
      // Honey timber panels and beams use a small number of original solid strips.
      for (const side of [-1, 1]) {
        for (let z = 2.5; z < 9; z += 1.4) detail(local, side * (plan.width / 2 - 0.095), 1.57, z,
          0.06, 0.55, 1.3, 0xbb965e);
        detail(local, side * (plan.width / 2 - 0.12), 2.18, 5.45, 0.08, 0.11, 7.3, 0xaa824b);
      }
      for (const z of [2.1, 5, 7.9]) detail(local, 0, 2.58, z, plan.width - 0.1, 0.11, 0.13, 0xb2915c);
      // Pale stone tile joints and warm strips are static geometry, without extra lights/textures.
      for (let x = -2.4; x <= 2.4; x += 1.2) detail(local, x, 0.016, 6, 0.012, 0.008, 11.8, 0xa89f90);
      for (let z = 1.2; z < 12; z += 1.2) detail(local, 0, 0.016, z, plan.width - 0.2, 0.008, 0.012, 0xa89f90);
      // Timber menu canopy follows the long left service pass and open kitchen.
      detail(local, -1.45, 2.25, 6.1, 0.18, 0.11, 7.6, 0xb2915c);
      detail(local, -1.35, 2.18, 6.1, 0.06, 0.025, 7.5, 0xffe6ac);
      for (let z = 2.4; z < 9.9; z += 0.4) detail(local, -1.45, 2.4, z, 0.11, 0.4, 0.065, 0xb2915c);
      for (const z of [4.2, 7]) {
        detail(local, -1.37, 2.4, z, 0.025, 0.34, 1.15, 0x424e45);
        for (const row of [-1, 0, 1]) detail(local, -1.35, 2.4 + row * 0.08, z + 0.12, 0.012, 0.025, 0.65, 0xdac8a0);
        detail(local, -1.35, 2.4, z - 0.38, 0.012, 0.11, 0.14, 0xd99a59);
      }
      detail(local, -plan.width / 2 + 0.12, 1.65, 6.1, 0.06, 0.95, 7.6, 0xaebbb6);
      // Original abstract bowl-and-line relief, with no copied mural, text or logos.
      for (const side of [-1, 1]) for (const z of [3.5, 6.3]) {
        detail(local, side * (plan.width / 2 - 0.15), 2.12, z, 0.025, 0.07, 0.7, 0x7b684c);
        detail(local, side * (plan.width / 2 - 0.15), 1.99, z, 0.025, 0.06, 0.45, 0x7b684c);
      }
      for (const item of plan.details || []) {
        if (item.kind === 'noodle-bowl') {
          const profile = [[0,0],[0.08,0],[0.145,0.13],[0.12,0.13],[0.1,0.06]].map(p => new THREE.Vector2(...p));
          addGeometry(new THREE.LatheGeometry(profile, 8).translate(item.x, item.y, item.z), item.color);
          addGeometry(new THREE.CircleGeometry(0.112, 8).rotateX(-Math.PI / 2).translate(item.x, item.y + 0.112, item.z), 0xb6894d);
          for (const z of [-0.035, 0.03]) detail(item, 0, 0.121, z, 0.15, 0.012, 0.018, 0xe8cf8f);
        } else if (item.kind === 'chopsticks') {
          for (const z of [-0.018, 0.018]) detail(item, 0, 0.01, z, item.width, 0.012, 0.012, item.color);
        } else if (item.kind === 'condiments') {
          detail(item, 0, 0.025, 0, item.width, 0.05, item.depth, 0x8b7451);
          detail(item, -0.06, 0.115, 0, 0.065, 0.17, 0.07, 0x603e2b);
          detail(item, 0.055, 0.095, 0, 0.075, 0.13, 0.075, 0xa75e39);
        }
      }
    }
    for (const station of plan.activities || []) {
      if (!['bench', 'treadmill', 'curls', 'rower'].includes(station.kind)) continue;
      const color = { bench: 0xc6b56a, treadmill: 0x9db6a1, curls: 0xc89b6a, rower: 0x91b4bf }[station.kind];
      box(station.x, plan.floorY + 0.018, station.z, 0.6, 0.018, 0.6, station.yaw, color);
      const marker = { ...station, y: plan.floorY };
      detail(marker, 0, 0.032, 0.26, 0.36, 0.012, 0.055, 0x34443d);
    }
    // A pale door mat gives the explicit exit interaction a visible anchor.
    box(plan.exit.x, plan.floorY + 0.018, plan.exit.z, 1.05, 0.025, 0.7, o.yaw, 0x687a65);
    const merged = mergeGeometries(pieces, false);
    for (const geometry of pieces) geometry.dispose();
    const mesh = new THREE.Mesh(merged, material); mesh.name = `Interior ${plan.id}`; root.add(mesh);
    Object.assign(stats, { active: 1, meshes: 1, draws: 1,
      triangles: merged.index ? merged.index.count / 3 : merged.attributes.position.count / 3,
      furniture: plan.furniture.length });
    roomTriangles = stats.triangles;
    if (plan.heist?.loot) {
      lootMarker = new THREE.Mesh(new THREE.OctahedronGeometry(.23), lootMaterial);
      lootMarker.name = 'Available heist pickup';
      lootMarker.position.set(plan.heist.loot.x, plan.floorY + .38, plan.heist.loot.z);
      lootMarker.visible = false; root.add(lootMarker); stats.meshes++;
    }
    current = plan; return true;
  }
  return { load, clear, setHeistLootActive, stats,
    dispose() { if (disposed) return; clear(); material.dispose(); lootMaterial.dispose(); scene.remove(root); disposed = true; } };
}
