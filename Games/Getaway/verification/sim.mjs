// shared/config.ts
var TICK_HZ = 30;
var DT = 1 / TICK_HZ;
var CELL = 76;
var ROAD_HALF = 8;
var GRID = 7;
var WORLD_MAX = GRID * CELL + ROAD_HALF;
var WATER_Z = GRID * CELL + ROAD_HALF;
var ROUND_SECONDS = 180;
var INTRO_SECONDS = 4;
var HEAD_START_SECONDS = 5;
var END_SECONDS = 9;
var EXTRACT_SECONDS = 3;
var EXTRACT_RADIUS = 14;
var EXTRACT_SPEED = 12;
var EXTRACT_BOXED_RATE = 0.7;
var EXTRACT_SPOTLIT_RATE = 0.6;
var EXTRACT_OPEN_SECONDS = 40;
var BUST_SECONDS = 4;
var BUST_RANGE = 9;
var NEAR_MISS_DIST = 4.2;
var NEAR_MISS_SPEED = 22;
var DRIVING = { mass: 1.1, maxSpeed: 42, accel: 15, drivetrain: "rwd", brake: 22, turn: 1.9, grip: 6.5, boost: 1, length: 4.8, width: 1.95 };
var VEHICLES = [
  { id: "muscle", name: "Muscle", role: "robber", ...DRIVING, hp: 100, paint: [0.7, 0.09, 0.07], accent: [0.07, 0.07, 0.08], tier: 0, blurb: "Brutal straight-line power. Wide slides." },
  { id: "compact", name: "Compact", role: "robber", mass: 0.8, maxSpeed: 36, accel: 17, drivetrain: "fwd", brake: 20, turn: 2.6, grip: 8.5, hp: 80, boost: 0.9, paint: [0.08, 0.6, 0.58], accent: [0.1, 0.1, 0.11], length: 3.9, width: 1.7, tier: 0, blurb: "Quick on the turn. Fits the alleys." },
  { id: "van", name: "Van", role: "robber", mass: 1.6, maxSpeed: 32, accel: 11, brake: 16, turn: 1.4, grip: 7.5, hp: 150, boost: 0.8, paint: [0.7, 0.72, 0.74], accent: [0.14, 0.14, 0.15], length: 5.2, width: 2.1, tier: 1, blurb: "Carries the heavy take. Tough to stop." },
  { id: "bike", name: "Motorbike", role: "robber", mass: 0.4, maxSpeed: 46, accel: 19, brake: 18, turn: 3.1, grip: 9.5, hp: 50, boost: 1.1, paint: [0.12, 0.13, 0.16], accent: [0.2, 0.9, 0.95], length: 2.6, width: 0.9, tier: 2, blurb: "Fastest route through a crowd. Fragile." },
  { id: "cruiser", name: "Cruiser", role: "cop", ...DRIVING, hp: 120, paint: [0.8, 0.81, 0.84], accent: [0.05, 0.05, 0.06], tier: 0, blurb: "The standard cruiser." },
  { id: "interceptor", name: "Interceptor", role: "cop", mass: 0.9, maxSpeed: 46, accel: 17, drivetrain: "awd", brake: 24, turn: 2.4, grip: 8, hp: 110, boost: 1, paint: [0.8, 0.81, 0.84], accent: [0.05, 0.05, 0.06], length: 5, width: 2, tier: 1, blurb: "Fastest in the motor pool. Lighter frame." },
  { id: "swat", name: "SWAT Van", role: "cop", mass: 2, maxSpeed: 30, accel: 10, brake: 16, turn: 1.3, grip: 7, hp: 220, boost: 0.7, paint: [0.12, 0.14, 0.16], accent: [0.3, 0.6, 1], length: 5.6, width: 2.3, tier: 2, blurb: "Plow through a roadblock. Slow to start." }
];
var VEHICLE_BY_ID = new Map(VEHICLES.map((v) => [v.id, v]));
var GADGETS = {
  oil: { id: "oil", name: "OIL SLICK", role: "robber", charges: 3, cooldown: 8, ttl: 12, radius: 3 },
  smoke: { id: "smoke", name: "SMOKE SCREEN", role: "robber", charges: 2, cooldown: 14, ttl: 6, radius: 9 },
  spike: { id: "spike", name: "SPIKE STRIP", role: "cop", charges: 3, cooldown: 10, ttl: 25, radius: 6 },
  roadblock: { id: "roadblock", name: "ROADBLOCK", role: "cop", charges: 1, cooldown: 20, ttl: 25, radius: 6.5 }
};
var LOADOUT = { robber: ["oil", "smoke"], cop: ["spike", "roadblock"] };
var OIL_SPIN_SECONDS = 1.2;
var FLAT_SPEED = [1, 0.8, 0.6, 0.38, 0.2];
var FLAT_GRIP = [1, 0.85, 0.7, 0.5, 0.35];
var FLAT_ACCEL = [1, 0.9, 0.75, 0.55, 0.35];
var REPAIR_SECONDS = 2.5;
var REPAIR_SPEED = 2;
var SHOP_COOLDOWN = 45;
var BUST_RATE_PER_COP = 0.5;
var SPIKE_THICK = 0.8;
var ROADBLOCK_THICK = 1.6;
var SPIKE_SPOT_RANGE = 40;
var SIGHT_RANGE = 70;
var HEAR_RANGE = 20;
var CAMERA_YAW = Math.PI / 4 + 0.16;
var SCREEN_HALF_WIDTH = 40;
var SCREEN_BACK = 24;
var SCREEN_AHEAD = 40;

// shared/sim/rng.ts
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// shared/sim/tunnel.ts
var TUNNEL = { z: 2 * CELL, half: 7, west: -ROAD_HALF - 30, east: WORLD_MAX + 30, westMouth: -ROAD_HALF - 6.5, eastMouth: WORLD_MAX + 6.5 };
function tunnelLink(a, b) {
  return a.z === TUNNEL.z && b.z === TUNNEL.z && (a.x === TUNNEL.west && b.x === TUNNEL.east || a.x === TUNNEL.east && b.x === TUNNEL.west);
}
function inTunnel(b) {
  return Math.abs(b.z - TUNNEL.z) < TUNNEL.half && (b.x < TUNNEL.westMouth || b.x > TUNNEL.eastMouth);
}
function crossTunnel(b) {
  if (Math.abs(b.z - TUNNEL.z) >= TUNNEL.half)
    return false;
  if (b.x >= TUNNEL.east && b.vx > 0)
    b.x = TUNNEL.west + (b.x - TUNNEL.east);
  else if (b.x <= TUNNEL.west && b.vx < 0)
    b.x = TUNNEL.east + (b.x - TUNNEL.west);
  else
    return false;
  b.z = 2 * TUNNEL.z - b.z;
  b.h = Math.PI - b.h;
  b.vz = -b.vz;
  b.yaw = -b.yaw;
  b.tunnels++;
  return true;
}

// shared/sim/city.ts
function rampSurface(r, x, z) {
  const dx = x - r.x, dz = z - r.z;
  const along = dx * Math.sin(r.h) + dz * Math.cos(r.h) + r.length / 2;
  const across = dx * Math.cos(r.h) - dz * Math.sin(r.h);
  if (Math.abs(across) > r.width / 2 || along < 0 || along > r.length)
    return null;
  const crest = r.length * r.peak;
  const slope = along < crest ? r.height / crest : -r.height / (r.length - crest);
  return { y: along < crest ? along * slope : (along - r.length) * slope, slope };
}
var NODE_COUNT = (GRID + 1) * (GRID + 1);
var nodeIndex = (k, m) => k * (GRID + 1) + m;
var PALETTE = [
  [0.36, 0.2, 0.16],
  [0.42, 0.25, 0.19],
  [0.31, 0.18, 0.15],
  [0.36, 0.27, 0.21],
  [0.4, 0.36, 0.31],
  [0.34, 0.32, 0.31],
  [0.26, 0.25, 0.28],
  [0.29, 0.21, 0.19],
  [0.42, 0.37, 0.32]
];
var PARKED = ["compact", "muscle", "van", "cruiser"];
var ALLEY = 7;
var GROUND_FLOOR = 4.4;
var STOREY = 3.4;
var SIDEWALK = 5;
var NEONS = [
  [1, 0.2, 0.62],
  [0.25, 0.9, 0.95],
  [1, 0.7, 0.25],
  [1, 0.3, 0.3],
  [0.3, 0.5, 1]
];
var CONTAINER_COLORS = [
  [0.5, 0.18, 0.15],
  [0.22, 0.32, 0.46],
  [0.2, 0.36, 0.38],
  [0.58, 0.36, 0.16],
  [0.4, 0.41, 0.42],
  [0.42, 0.22, 0.18]
];
function generateCity(seed) {
  const rng = mulberry32(seed);
  const boxes = [];
  const parks = [];
  const trees = [];
  const alleys = [];
  const parked = [];
  const yards = [];
  const lamps = [];
  const nodes = [];
  const adj = [];
  for (let k = 0;k <= GRID; k++)
    for (let m = 0;m <= GRID; m++) {
      nodes.push({ x: k * CELL, z: m * CELL });
      adj.push([]);
    }
  const link = (a, b) => {
    adj[a].push(b);
    adj[b].push(a);
  };
  for (let k = 0;k <= GRID; k++)
    for (let m = 0;m <= GRID; m++) {
      const n = nodeIndex(k, m);
      if (k < GRID)
        link(n, nodeIndex(k + 1, m));
      if (m < GRID)
        link(n, nodeIndex(k, m + 1));
    }
  const parkBlocks = new Map([
    ["1,2", "park"],
    ["4,5", "plaza"]
  ]);
  const bankBlock = [2, 2];
  const jewelryBlock = [4, 3];
  const galleryBlock = [1, 4];
  const precinctBlock = [5, 1];
  const yardBlock = [6, 6];
  const siteBlocks = new Set([`${bankBlock[0]},${bankBlock[1]}`, `${jewelryBlock[0]},${jewelryBlock[1]}`, `${galleryBlock[0]},${galleryBlock[1]}`]);
  const color = () => PALETTE[Math.floor(rng() * PALETTE.length)];
  const building = (x0, x1, z0, z1, floors, c, neon = null, label = null) => boxes.push({ x0, x1, z0, z1, h: GROUND_FLOOR + floors * STOREY, color: c, neon, kind: "building", label, floors });
  const inset = SIDEWALK;
  for (let i = 0;i < GRID; i++)
    for (let j = 0;j < GRID; j++) {
      const bx0 = i * CELL + ROAD_HALF;
      const bx1 = (i + 1) * CELL - ROAD_HALF;
      const bz0 = j * CELL + ROAD_HALF;
      const bz1 = (j + 1) * CELL - ROAD_HALF;
      const key = `${i},${j}`;
      const blockAlleys = [];
      const parkKind = parkBlocks.get(key);
      if (parkKind) {
        parks.push({ x0: bx0, x1: bx1, z0: bz0, z1: bz1, kind: parkKind });
        if (parkKind === "park") {
          for (let t = 0;t < 26; t++) {
            const x = bx0 + 5 + rng() * (bx1 - bx0 - 10);
            const z = bz0 + 5 + rng() * (bz1 - bz0 - 10);
            const cx = (bx0 + bx1) / 2;
            const cz = (bz0 + bz1) / 2;
            if (Math.abs(x - cx) < 3.5 || Math.abs(z - cz) < 3.5 || Math.hypot(x - cx, z - cz) < 12)
              continue;
            trees.push({ x, z, s: 0.9 + rng() * 0.6 });
          }
        } else {
          const cx = (bx0 + bx1) / 2;
          const cz = (bz0 + bz1) / 2;
          boxes.push({ x0: cx - 2.2, x1: cx + 2.2, z0: cz - 2.2, z1: cz + 2.2, h: 2, color: [0.5, 0.48, 0.45], neon: null, kind: "special", label: null, use: "statue" });
        }
        streetscape(bx0, bx1, bz0, bz1, [], parkKind === "park");
        continue;
      }
      const x0 = bx0 + inset;
      const x1 = bx1 - inset;
      const z0 = bz0 + inset;
      const z1 = bz1 - inset;
      if (i === precinctBlock[0] && j === precinctBlock[1]) {
        boxes.push({ x0: x0 + 4, x1: x1 - 4, z0: z0 + 4, z1: z1 - 4, h: 14, color: [0.42, 0.43, 0.46], neon: null, kind: "building", label: "PRECINCT", floors: 3 });
        streetscape(bx0, bx1, bz0, bz1, [], false);
        continue;
      }
      if (i === yardBlock[0] && j === yardBlock[1]) {
        containerYard(x0, x1, z0, z1);
        streetscape(bx0, bx1, bz0, bz1, [], false);
        continue;
      }
      if (siteBlocks.has(key)) {
        const label = key === `${bankBlock[0]},${bankBlock[1]}` ? "bank" : key === `${jewelryBlock[0]},${jewelryBlock[1]}` ? "jewelry" : "gallery";
        const mid = x0 + (x1 - x0) * 0.5;
        const floors = label === "bank" ? 3 : 2;
        building(x0, mid - ALLEY / 2, z0, z1, floors, label === "bank" ? [0.52, 0.49, 0.43] : label === "gallery" ? [0.47, 0.45, 0.43] : [0.3, 0.25, 0.28], label === "bank" ? [1, 0.25, 0.4] : [0.3, 0.95, 0.9], label);
        const al = { x0: mid - ALLEY / 2, x1: mid + ALLEY / 2, z0: bz0, z1: bz1 };
        alleys.push(al);
        blockAlleys.push(al);
        const zm = (z0 + z1) / 2;
        building(mid + ALLEY / 2, x1, z0, zm, 2 + Math.floor(rng() * 3), color());
        building(mid + ALLEY / 2, x1, zm, z1, 2 + Math.floor(rng() * 3), color());
        streetscape(bx0, bx1, bz0, bz1, blockAlleys, false);
        continue;
      }
      const central = Math.abs(i - 3) <= 1 && Math.abs(j - 3) <= 1;
      const r = rng();
      const lots = [];
      const half = ALLEY / 2;
      if (r < 0.18)
        lots.push([x0, x1, z0, z1]);
      else if (r < 0.5) {
        const cut = x0 + (x1 - x0) * (0.4 + rng() * 0.2);
        lots.push([x0, cut - half, z0, z1], [cut + half, x1, z0, z1]);
        blockAlleys.push({ x0: cut - half, x1: cut + half, z0: bz0, z1: bz1 });
      } else {
        const cx = x0 + (x1 - x0) * (0.4 + rng() * 0.2);
        const cz = z0 + (z1 - z0) * (0.4 + rng() * 0.2);
        lots.push([x0, cx - half, z0, cz - half], [cx + half, x1, z0, cz - half], [x0, cx - half, cz + half, z1], [cx + half, x1, cz + half, z1]);
        blockAlleys.push({ x0: cx - half, x1: cx + half, z0: bz0, z1: bz1 }, { x0: bx0, x1: bx1, z0: cz - half, z1: cz + half });
      }
      alleys.push(...blockAlleys);
      for (const [a, b, c, d] of lots) {
        const roll = rng();
        if (lots.length > 1 && roll < 0.1) {
          yards.push({ x0: a, x1: b, z0: c, z1: d, kind: "lot" });
          const cols = Math.max(1, Math.floor((b - a - 1) / 3.4));
          for (let k = 0;k < cols; k++) {
            if (rng() < 0.45)
              continue;
            const px = a + 2.2 + k * 3.4;
            for (const pz of [c + 3, d - 3]) {
              if (rng() < 0.4)
                continue;
              parked.push({ x: px, z: pz, h: pz < (c + d) / 2 ? 0 : Math.PI, model: PARKED[Math.floor(rng() * PARKED.length)] });
              boxes.push({ x0: px - 1, x1: px + 1, z0: pz - 2.3, z1: pz + 2.3, h: 1.4, color: [0, 0, 0], neon: null, kind: "special", label: "parked" });
            }
          }
          continue;
        }
        if (lots.length > 1 && roll < 0.17) {
          yards.push({ x0: a, x1: b, z0: c, z1: d, kind: "court" });
          for (let tx = a + 4;tx < b - 3; tx += 7)
            for (let tz = c + 4;tz < d - 3; tz += 7)
              if (rng() < 0.7)
                trees.push({ x: tx + (rng() - 0.5) * 2, z: tz + (rng() - 0.5) * 2, s: 0.8 + rng() * 0.5, planter: true });
          continue;
        }
        const long = Math.max(b - a, d - c);
        const parts = long > 34 ? 3 : long > 18 ? 2 : 1;
        const alongX = b - a >= d - c;
        for (let k = 0;k < parts; k++) {
          const s0 = k / parts;
          const s1 = (k + 1) / parts;
          const pa = alongX ? a + (b - a) * s0 : a;
          const pb = alongX ? a + (b - a) * s1 : b;
          const pc = alongX ? c : c + (d - c) * s0;
          const pd = alongX ? d : c + (d - c) * s1;
          const deep = alongX ? pd - pc : pb - pa;
          const pieces = deep > 26 ? alongX ? [
            [pa, pb, pc, (pc + pd) / 2],
            [pa, pb, (pc + pd) / 2, pd]
          ] : [
            [pa, (pa + pb) / 2, pc, pd],
            [(pa + pb) / 2, pb, pc, pd]
          ] : [[pa, pb, pc, pd]];
          for (const [qa, qb, qc, qd] of pieces) {
            const floors = central ? 3 + Math.floor(rng() * 4) : 2 + Math.floor(rng() * 2.2 + rng() * 2);
            const neon = rng() < 0.22 ? NEONS[Math.floor(rng() * NEONS.length)] : null;
            building(qa, qb, qc, qd, floors, color(), neon);
          }
        }
      }
      streetscape(bx0, bx1, bz0, bz1, blockAlleys, false);
    }
  function streetscape(bx0, bx1, bz0, bz1, gaps, park) {
    const len = bx1 - bx0;
    const sides = [
      { at: (t) => [bx0 + t, bz0], n: [0, -1], cross: (a) => a.z0 <= bz0 + 0.1 ? [a.x0 - bx0, a.x1 - bx0] : null },
      { at: (t) => [bx0 + t, bz1], n: [0, 1], cross: (a) => a.z1 >= bz1 - 0.1 ? [a.x0 - bx0, a.x1 - bx0] : null },
      { at: (t) => [bx0, bz0 + t], n: [-1, 0], cross: (a) => a.x0 <= bx0 + 0.1 ? [a.z0 - bz0, a.z1 - bz0] : null },
      { at: (t) => [bx1, bz0 + t], n: [1, 0], cross: (a) => a.x1 >= bx1 - 0.1 ? [a.z0 - bz0, a.z1 - bz0] : null }
    ];
    for (const side of sides) {
      const blocked = gaps.map(side.cross).filter((g) => g !== null);
      const clear = (t, pad) => t > 3 && t < len - 3 && blocked.every(([g0, g1]) => t < g0 - pad || t > g1 + pad);
      const flip = side.n[0] + side.n[1] > 0;
      const lampTs = flip ? [5, 30, 55] : [17.5, 42.5];
      const placed = [];
      for (const t of lampTs) {
        if (!clear(t, 1.5))
          continue;
        const [fx, fz] = side.at(t);
        const px = fx + side.n[0] * -0.7;
        const pz = fz + side.n[1] * -0.7;
        lamps.push({ x: px + side.n[0] * 1.6, z: pz + side.n[1] * 1.6, px, pz });
        placed.push(t);
      }
      if (park)
        continue;
      for (let t = 7.5;t < len - 6; t += 7.5) {
        if (!clear(t, 2.5) || placed.some((p) => Math.abs(p - t) < 3.5))
          continue;
        if (rng() < 0.15)
          continue;
        const [fx, fz] = side.at(t);
        trees.push({ x: fx - side.n[0] * 2.1, z: fz - side.n[1] * 2.1, s: 0.75 + rng() * 0.3, planter: true });
      }
    }
  }
  function containerYard(x0, x1, z0, z1) {
    yards.push({ x0, x1, z0, z1, kind: "containers" });
    const rowW = 5;
    const lane = 7.5;
    const cx = (x0 + x1) / 2;
    let row = 0;
    for (let rz = z0 + 1;rz + rowW <= z1 - 0.5; rz += rowW + lane, row++) {
      const craneRow = row === 1 || row === 2;
      for (let sx = x0 + 1;sx + 12.2 <= x1 - 0.5; sx += 12.8) {
        if (craneRow && sx + 12.2 > cx - 8 && sx < cx + 8)
          continue;
        if (rng() < 0.15)
          continue;
        for (const half of [0, 1]) {
          const tiers = 1 + Math.floor(rng() * 3);
          const za = rz + half * 2.5;
          boxes.push({ x0: sx, x1: sx + 12.2, z0: za, z1: za + 2.45, h: tiers * 2.6, color: CONTAINER_COLORS[Math.floor(rng() * CONTAINER_COLORS.length)], neon: null, kind: "building", label: null, use: "container" });
        }
      }
      if (craneRow)
        for (const lx of [cx - 6, cx + 6])
          boxes.push({ x0: lx - 0.7, x1: lx + 0.7, z0: rz + 1.8, z1: rz + 3.2, h: 22, color: [0.62, 0.16, 0.12], neon: null, kind: "special", label: null, use: "crane" });
    }
  }
  const wall = (x0, x1, z0, z1) => boxes.push({ x0, x1, z0, z1, h: 40, color: [0, 0, 0], neon: null, kind: "wall", label: null });
  const edge = -ROAD_HALF;
  for (const [a, b] of [[edge - 6, edge], [WORLD_MAX, WORLD_MAX + 6]]) {
    wall(a, b, edge - 6, TUNNEL.z - TUNNEL.half);
    wall(a, b, TUNNEL.z + TUNNEL.half, WORLD_MAX + 6);
  }
  for (const [a, b] of [[TUNNEL.west - 8, edge], [WORLD_MAX, TUNNEL.east + 8]]) {
    wall(a, b, TUNNEL.z - 10, TUNNEL.z - TUNNEL.half);
    wall(a, b, TUNNEL.z + TUNNEL.half, TUNNEL.z + 10);
  }
  const west = nodes.push({ x: TUNNEL.west, z: TUNNEL.z }) - 1;
  const east = nodes.push({ x: TUNNEL.east, z: TUNNEL.z }) - 1;
  adj.push([], []);
  link(nodeIndex(0, 2), west);
  link(nodeIndex(GRID, 2), east);
  link(west, east);
  wall(edge - 6, WORLD_MAX + 6, edge - 6, edge);
  wall(edge - 6, WORLD_MAX + 6, WATER_Z, WATER_Z + 6);
  const bankX = bankBlock[0] * CELL;
  const bankZ = bankBlock[1] * CELL + CELL / 2;
  const jewX = jewelryBlock[0] * CELL;
  const jewZ = jewelryBlock[1] * CELL + CELL / 2;
  const galX = galleryBlock[0] * CELL;
  const galZ = galleryBlock[1] * CELL + CELL / 2;
  const sites = [
    { id: "bank", name: "First National Bank", kind: "bank", value: 412000, x: bankX, z: bankZ },
    { id: "jewelry", name: "Golden Mile Jewelers", kind: "jewelry", value: 236000, x: jewX, z: jewZ },
    { id: "gallery", name: "Halcyon Art Gallery", kind: "gallery", value: 980000, x: galX, z: galZ }
  ];
  const extraction = [
    { id: "rail", name: "Rail Yard", x: 0, z: 0 },
    { id: "marina", name: "Marina", x: 3 * CELL, z: GRID * CELL },
    { id: "tunnel", name: "Tunnel", x: GRID * CELL, z: 2 * CELL }
  ];
  const pcx = precinctBlock[0] * CELL + CELL / 2;
  const pcz = precinctBlock[1] * CELL + CELL / 2;
  const precinctBox = boxes.find((b) => b.label === "PRECINCT");
  const shops = placeShops(seed, boxes, trees, lamps, { x: pcx, z: pcz });
  return {
    seed,
    boxes,
    parks,
    trees,
    alleys,
    parked,
    lamps,
    nodes,
    adj,
    sites,
    extraction,
    precinct: { x: pcx, z: pcz, h: precinctBox.h, spawnNode: nodeIndex(6, 1) },
    helipad: { x: pcx, y: precinctBox.h + 0.6, z: pcz },
    waterZ: WATER_Z,
    max: WORLD_MAX,
    yards,
    sidewalk: SIDEWALK,
    shops,
    ramps: placeRamps(seed, alleys, boxes)
  };
}
function placeRamps(seed, alleys, boxes) {
  const rng = mulberry32(seed ^ 7513273);
  const ramps = [];
  for (let i = 0;i < 8; i++) {
    const axis = i % 2 === 0;
    const road = (1 + Math.floor(rng() * (GRID - 1))) * CELL;
    const mid = (Math.floor(rng() * GRID) + 0.5) * CELL;
    const x = axis ? road : mid, z = axis ? mid : road;
    if (ramps.some((r) => Math.hypot(r.x - x, r.z - z) < 35))
      continue;
    const crest = i % 3 === 0;
    ramps.push({ x, z, h: axis ? 0 : Math.PI / 2, width: 5.5, length: crest ? 16 : 12, height: crest ? 1.3 : 1.8, peak: crest ? 0.5 : 0.72, kind: crest ? "crest" : "plate" });
  }
  for (let i = 0;i < 3 && alleys.length; i++) {
    const a = alleys[Math.floor(rng() * alleys.length)];
    const x = (a.x0 + a.x1) / 2, z = (a.z0 + a.z1) / 2;
    if (ramps.some((r) => Math.hypot(r.x - x, r.z - z) < 35))
      continue;
    ramps.push({ x, z, h: a.z1 - a.z0 > a.x1 - a.x0 ? 0 : Math.PI / 2, width: 4, length: 10, height: 1.2, peak: 0.7, kind: "loading" });
  }
  ramps.push({ x: CELL * 6.5, z: CELL * GRID, h: Math.PI / 2, width: 5, length: 14, height: 1.7, peak: 0.7, kind: "loading" });
  return ramps.filter((r) => !boxes.some((b) => r.x > b.x0 - 3 && r.x < b.x1 + 3 && r.z > b.z0 - 3 && r.z < b.z1 + 3));
}
var SHOP_NAMES = ["Lou's Auto Repair", "Quick Fix Tires", "Mel's Garage", "Eastside Auto"];
var BAY_WIDTH = 7;
var BAY_DEPTH = 9;
var SHOP_HEIGHT = 5.6;
function placeShops(seed, boxes, trees, lamps, precinct) {
  const rng = mulberry32(seed ^ 5350631);
  const line = (v, lo) => lo ? Math.floor(v / CELL) * CELL + ROAD_HALF + SIDEWALK : Math.ceil(v / CELL) * CELL - ROAD_HALF - SIDEWALK;
  const cands = [];
  for (const b of boxes) {
    if (b.kind !== "building" || b.use || b.label)
      continue;
    const w = b.x1 - b.x0;
    const d = b.z1 - b.z0;
    if (Math.abs(b.z0 - line(b.z0, true)) < 0.5 && w >= BAY_WIDTH + 5 && w <= 22 && d >= BAY_DEPTH + 3.5)
      cands.push({ b, side: 0 });
    if (Math.abs(b.x0 - line(b.x0, true)) < 0.5 && d >= BAY_WIDTH + 5 && d <= 22 && w >= BAY_DEPTH + 3.5)
      cands.push({ b, side: 2 });
  }
  const shops = [];
  const used = new Set;
  const span = GRID * CELL;
  const quarters = [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.25, 0.75],
    [0.75, 0.75]
  ];
  for (const [qx, qz] of quarters) {
    const tx = span * (qx + (rng() - 0.5) * 0.25);
    const tz = span * (qz + (rng() - 0.5) * 0.25);
    let best = null;
    let bd = Infinity;
    for (const c of cands) {
      if (used.has(c.b))
        continue;
      const cx = (c.b.x0 + c.b.x1) / 2;
      const cz = (c.b.z0 + c.b.z1) / 2;
      if (Math.hypot(cx - precinct.x, cz - precinct.z) < 110)
        continue;
      if (shops.some((s) => Math.hypot(s.x - cx, s.z - cz) < 150))
        continue;
      const d = Math.hypot(cx - tx, cz - tz);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    if (!best)
      continue;
    used.add(best.b);
    const { b, side } = best;
    const i = boxes.indexOf(b);
    boxes.splice(i, 1);
    const h = SHOP_HEIGHT;
    const solid = (x0, x1, z0, z1) => boxes.push({ x0, x1, z0, z1, h, color: [0.42, 0.4, 0.37], neon: null, kind: "building", label: null, use: "shop" });
    let bay;
    let heading;
    if (side === 0) {
      const mid = (b.x0 + b.x1) / 2;
      bay = { x0: mid - BAY_WIDTH / 2, x1: mid + BAY_WIDTH / 2, z0: b.z0, z1: b.z0 + BAY_DEPTH };
      solid(b.x0, bay.x0, b.z0, bay.z1);
      solid(bay.x1, b.x1, b.z0, bay.z1);
      solid(b.x0, b.x1, bay.z1, b.z1);
      heading = Math.PI;
    } else {
      const mid = (b.z0 + b.z1) / 2;
      bay = { x0: b.x0, x1: b.x0 + BAY_DEPTH, z0: mid - BAY_WIDTH / 2, z1: mid + BAY_WIDTH / 2 };
      solid(b.x0, bay.x1, b.z0, bay.z0);
      solid(b.x0, bay.x1, bay.z1, b.z1);
      solid(bay.x1, b.x1, b.z0, b.z1);
      heading = -Math.PI / 2;
    }
    const pad = 2;
    const apron = side === 0 ? { x0: bay.x0 - pad, x1: bay.x1 + pad, z0: bay.z0 - SIDEWALK - 1, z1: bay.z0 } : { x0: bay.x0 - SIDEWALK - 1, x1: bay.x0, z0: bay.z0 - pad, z1: bay.z1 + pad };
    const inApron = (x, z) => x > apron.x0 - 1 && x < apron.x1 + 1 && z > apron.z0 - 2 && z < apron.z1 + 1;
    for (let k = trees.length - 1;k >= 0; k--)
      if (inApron(trees[k].x, trees[k].z))
        trees.splice(k, 1);
    for (let k = lamps.length - 1;k >= 0; k--)
      if (inApron(lamps[k].px ?? lamps[k].x, lamps[k].pz ?? lamps[k].z))
        lamps.splice(k, 1);
    shops.push({
      id: `shop${shops.length}`,
      name: SHOP_NAMES[shops.length % SHOP_NAMES.length],
      x: (bay.x0 + bay.x1) / 2,
      z: (bay.z0 + bay.z1) / 2,
      h: heading,
      bay,
      lot: { x0: b.x0, x1: b.x1, z0: b.z0, z1: b.z1 }
    });
  }
  return shops;
}
function shopAt(city, x, z) {
  return city.shops.findIndex((s) => x > s.bay.x0 && x < s.bay.x1 && z > s.bay.z0 && z < s.bay.z1);
}
function nearestNode(city, x, z) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0;i < city.nodes.length; i++) {
    const n = city.nodes[i];
    const d = (n.x - x) ** 2 + (n.z - z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}
function routeNodes(city, from, to, blocked) {
  const n = city.nodes.length;
  const dist = new Array(n).fill(Infinity);
  const prev = new Array(n).fill(-1);
  const done = new Array(n).fill(false);
  dist[from] = 0;
  for (;; ) {
    let u = -1;
    for (let i = 0;i < n; i++)
      if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u]))
        u = i;
    if (u < 0 || u === to)
      break;
    done[u] = true;
    for (const v of city.adj[u]) {
      if (blocked?.(u, v))
        continue;
      const a = city.nodes[u];
      const b = city.nodes[v];
      const d = dist[u] + (tunnelLink(a, b) ? 1 : Math.hypot(a.x - b.x, a.z - b.z));
      if (d < dist[v]) {
        dist[v] = d;
        prev[v] = u;
      }
    }
  }
  const path = [to];
  let cur = to;
  while (cur !== from && prev[cur] >= 0) {
    cur = prev[cur];
    path.unshift(cur);
  }
  return path[0] === from ? path : [from];
}

// shared/sim/collide.ts
var INSET = 0.48;
var INERTIA = 0.8;
function carHalf(v) {
  return [v.length * INSET, v.width * INSET];
}
function carShape(b, v) {
  const [hl, hw] = carHalf(v);
  return { x: b.x, z: b.z, ax: Math.sin(b.h), az: Math.cos(b.h), ea: hl, eb: hw };
}
function boxShape(box) {
  return { x: (box.x0 + box.x1) / 2, z: (box.z0 + box.z1) / 2, ax: 0, az: 1, ea: (box.z1 - box.z0) / 2, eb: (box.x1 - box.x0) / 2 };
}
var STATIC = { invM: 0, invI: 0 };
function carMass(v) {
  return { invM: 1 / v.mass, invI: 12 / (v.mass * INERTIA * (v.length * v.length + v.width * v.width)) };
}
function reach(s, nx, nz) {
  return s.ea * Math.abs(s.ax * nx + s.az * nz) + s.eb * Math.abs(s.az * nx - s.ax * nz);
}
function shapeGap(a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  let gap = -Infinity;
  for (const s of [a, b])
    for (const [nx, nz] of [
      [s.ax, s.az],
      [s.az, -s.ax]
    ])
      gap = Math.max(gap, Math.abs(dx * nx + dz * nz) - reach(a, nx, nz) - reach(b, nx, nz));
  return gap;
}
function collideShapes(a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  let best = Infinity;
  let nx = 0;
  let nz = 0;
  let refB = false;
  let refK = 0;
  for (let o = 0;o < 2; o++) {
    const s = o === 0 ? a : b;
    for (let k = 0;k < 2; k++) {
      const ux = k === 0 ? s.ax : s.az;
      const uz = k === 0 ? s.az : -s.ax;
      const d = dx * ux + dz * uz;
      const overlap = reach(a, ux, uz) + reach(b, ux, uz) - Math.abs(d);
      if (overlap <= 0)
        return null;
      if (o === 0 ? overlap < best : overlap < best * 0.95 - 0.002) {
        best = overlap;
        const sign = d >= 0 ? 1 : -1;
        nx = ux * sign;
        nz = uz * sign;
        refB = o === 1;
        refK = k;
      }
    }
  }
  const ref = refB ? b : a;
  const inc = refB ? a : b;
  const rnx = refB ? -nx : nx;
  const rnz = refB ? -nz : nz;
  const refE = refK === 0 ? ref.ea : ref.eb;
  const tx = refK === 0 ? ref.az : ref.ax;
  const tz = refK === 0 ? -ref.ax : ref.az;
  const refT = refK === 0 ? ref.eb : ref.ea;
  const da = inc.ax * rnx + inc.az * rnz;
  const db = inc.az * rnx - inc.ax * rnz;
  let fnx, fnz, fe, ftx, ftz, ft;
  if (Math.abs(da) >= Math.abs(db)) {
    const s = da > 0 ? -1 : 1;
    fnx = inc.ax * s;
    fnz = inc.az * s;
    fe = inc.ea;
    ftx = inc.az;
    ftz = -inc.ax;
    ft = inc.eb;
  } else {
    const s = db > 0 ? -1 : 1;
    fnx = inc.az * s;
    fnz = -inc.ax * s;
    fe = inc.eb;
    ftx = inc.ax;
    ftz = inc.az;
    ft = inc.ea;
  }
  const cx = inc.x + fnx * fe;
  const cz = inc.z + fnz * fe;
  let p1x = cx + ftx * ft;
  let p1z = cz + ftz * ft;
  let p2x = cx - ftx * ft;
  let p2z = cz - ftz * ft;
  for (const side of [1, -1]) {
    const ux = tx * side;
    const uz = tz * side;
    const lim = refT + ref.x * ux + ref.z * uz;
    const d1 = p1x * ux + p1z * uz - lim;
    const d2 = p2x * ux + p2z * uz - lim;
    if (d1 > 0 && d2 > 0) {
      p1x = p2x = (p1x + p2x) / 2;
      p1z = p2z = (p1z + p2z) / 2;
      break;
    }
    if (d1 > 0) {
      const t = d1 / (d1 - d2);
      p1x += (p2x - p1x) * t;
      p1z += (p2z - p1z) * t;
    } else if (d2 > 0) {
      const t = d2 / (d2 - d1);
      p2x += (p1x - p2x) * t;
      p2z += (p1z - p2z) * t;
    }
  }
  const face = refE + ref.x * rnx + ref.z * rnz;
  const points = [];
  for (const [px, pz] of [
    [p1x, p1z],
    [p2x, p2z]
  ]) {
    const sep = px * rnx + pz * rnz - face;
    if (sep < 0)
      points.push({ x: px - rnx * sep / 2, z: pz - rnz * sep / 2, depth: -sep });
  }
  if (points.length === 2 && Math.abs(points[0].x - points[1].x) + Math.abs(points[0].z - points[1].z) < 0.000001)
    points.pop();
  if (!points.length)
    points.push({ x: (p1x + p2x) / 2, z: (p1z + p2z) / 2, depth: best });
  return { nx, nz, depth: best, points };
}
var WALL = { restitution: 0.25, friction: 0.2 };
var CARS = { restitution: 0.25, friction: 0.35 };
var BOUNCE_MIN = 1.5;
var ITERATIONS = 6;
function resolve(a, ma, b, mb, c, res) {
  const { nx, nz } = c;
  const tx = nz;
  const tz = -nx;
  const bx = b?.x ?? 0;
  const bz = b?.z ?? 0;
  const n = c.points.length;
  const ra = [];
  const rb = [];
  const kn = [];
  const kt = [];
  const bias = [];
  const accN = [];
  const accT = [];
  let impact = 0;
  let hx = 0;
  let hz = 0;
  const vel = (i) => {
    const [rax, raz] = ra[i];
    const [rbx, rbz] = rb[i];
    const vax = a.vx + a.yaw * raz;
    const vaz = a.vz - a.yaw * rax;
    const vbx = b ? b.vx + b.yaw * rbz : 0;
    const vbz = b ? b.vz - b.yaw * rbx : 0;
    return [vbx - vax, vbz - vaz];
  };
  for (let i = 0;i < n; i++) {
    const p = c.points[i];
    ra.push([p.x - a.x, p.z - a.z]);
    rb.push([p.x - bx, p.z - bz]);
    const an = ra[i][1] * nx - ra[i][0] * nz;
    const bn = rb[i][1] * nx - rb[i][0] * nz;
    const at = ra[i][1] * tx - ra[i][0] * tz;
    const bt = rb[i][1] * tx - rb[i][0] * tz;
    kn.push(ma.invM + mb.invM + ma.invI * an * an + mb.invI * bn * bn);
    kt.push(ma.invM + mb.invM + ma.invI * at * at + mb.invI * bt * bt);
    const [rvx, rvz] = vel(i);
    const vn = rvx * nx + rvz * nz;
    bias.push(vn < -BOUNCE_MIN ? -res.restitution * vn : 0);
    accN.push(0);
    accT.push(0);
    if (-vn > impact)
      impact = -vn;
    hx += p.x / n;
    hz += p.z / n;
  }
  const v0x = a.vx;
  const v0z = a.vz;
  const w0 = a.yaw;
  const u0x = b?.vx ?? 0;
  const u0z = b?.vz ?? 0;
  const q0 = b?.yaw ?? 0;
  const apply = (i, px, pz) => {
    const [rax, raz] = ra[i];
    const [rbx, rbz] = rb[i];
    a.vx -= px * ma.invM;
    a.vz -= pz * ma.invM;
    a.yaw -= ma.invI * (px * raz - pz * rax);
    if (b && (mb.invM > 0 || mb.invI > 0)) {
      b.vx += px * mb.invM;
      b.vz += pz * mb.invM;
      b.yaw += mb.invI * (px * rbz - pz * rbx);
    }
  };
  const vn = (i) => {
    const [rvx, rvz] = vel(i);
    return rvx * nx + rvz * nz;
  };
  const setN = (i, next) => {
    const dn = next - accN[i];
    accN[i] = next;
    apply(i, nx * dn, nz * dn);
  };
  let k12 = 0;
  if (n === 2) {
    const [a1, a2] = [ra[0], ra[1]].map(([x, z]) => z * nx - x * nz);
    const [b1, b2] = [rb[0], rb[1]].map(([x, z]) => z * nx - x * nz);
    k12 = ma.invM + mb.invM + ma.invI * a1 * a2 + mb.invI * b1 * b2;
  }
  for (let it = 0;it < ITERATIONS; it++) {
    if (n === 2)
      blockSolve();
    else
      setN(0, Math.max(0, accN[0] - (vn(0) - bias[0]) / kn[0]));
    for (let i = 0;i < n; i++) {
      const [rvx, rvz] = vel(i);
      const vt = rvx * tx + rvz * tz;
      const lim = res.friction * accN[i];
      const nt = Math.max(-lim, Math.min(lim, accT[i] - vt / kt[i]));
      const dt = nt - accT[i];
      accT[i] = nt;
      apply(i, tx * dt, tz * dt);
    }
  }
  function blockSolve() {
    const k11 = kn[0];
    const k22 = kn[1];
    const x1 = accN[0];
    const x2 = accN[1];
    const r1 = k11 * x1 + k12 * x2 + bias[0] - vn(0);
    const r2 = k12 * x1 + k22 * x2 + bias[1] - vn(1);
    const det = k11 * k22 - k12 * k12;
    const ok = (y1, y2) => {
      const w1 = k11 * y1 + k12 * y2 - r1;
      const w2 = k12 * y1 + k22 * y2 - r2;
      return y1 >= 0 && y2 >= 0 && (y1 > 0 || w1 >= -0.000000001) && (y2 > 0 || w2 >= -0.000000001);
    };
    const tries = [];
    if (Math.abs(det) > 0.000000001 * k11 * k22)
      tries.push([(k22 * r1 - k12 * r2) / det, (k11 * r2 - k12 * r1) / det]);
    tries.push([r1 / k11, 0], [0, r2 / k22], [0, 0]);
    for (const [y1, y2] of tries)
      if (ok(y1, y2)) {
        setN(0, y1);
        setN(1, y2);
        return;
      }
    setN(0, Math.max(0, accN[0] - (vn(0) - bias[0]) / k11));
    setN(1, Math.max(0, accN[1] - (vn(1) - bias[1]) / k22));
  }
  return {
    impact,
    x: hx,
    z: hz,
    nx,
    nz,
    dvA: Math.hypot(a.vx - v0x, a.vz - v0z),
    dwA: Math.abs(a.yaw - w0),
    dvB: b ? Math.hypot(b.vx - u0x, b.vz - u0z) : 0,
    dwB: b ? Math.abs(b.yaw - q0) : 0
  };
}
function separate(a, ma, b, mb, c, slop) {
  const push = c.depth - slop;
  const total = ma.invM + mb.invM;
  if (push <= 0 || total <= 0)
    return;
  const ka = push * ma.invM / total;
  a.x -= c.nx * ka;
  a.z -= c.nz * ka;
  if (b && mb.invM > 0) {
    const kb = push * mb.invM / total;
    b.x += c.nx * kb;
    b.z += c.nz * kb;
  }
}

// shared/sim/vehicle.ts
var NO_INPUT = { throttle: 0, brake: 0, steer: 0, handbrake: false, boost: false };
var DRIVE = {
  boostSpeed: 1.3,
  boostAccel: 1.6,
  boostDrain: 3.5,
  boostRefill: 12,
  handbrakeGrip: 0.2,
  driftGrip: 0.3,
  driftYaw: 1.5,
  powerOversteer: 0.8,
  driftHold: 0.25,
  driftExit: 3.5,
  driftMomentum: 0.5,
  recoverAngle: 1,
  recoverGain: 6,
  reverseMax: 14,
  flatSteer: 0.8,
  flatRearGrip: 0.88,
  flatPull: 0.1,
  flatWobble: 0.12,
  flatWobbleFreq: 0.35,
  oilGrip: 0.05,
  crank: 0.8,
  darkSpeed: 1.5,
  spinFull: 0.35,
  spinMax: 1.2,
  spinGrip: 0.75,
  spinSteer: 0.7,
  spinYaw: 0.9
};
var RAM_STUN_DV = 9;
function newBody(x, z, h) {
  return { x, z, h, tunnels: 0, y: 0, vy: 0, airborne: false, landing: 0, landings: 0, landGrip: 0, braking: false, boosting: false, vx: 0, vz: 0, yaw: 0, boostFuel: 1, hp: 1, stun: 0, drift: 0, slip: 0, wheels: 0, engineOff: false, crank: 0, spin: 0 };
}
var WHEEL_NAMES = ["FL", "FR", "RL", "RR"];
function flatCount(wheels = 0) {
  return (wheels & 1) + (wheels >> 1 & 1) + (wheels >> 2 & 1) + (wheels >> 3 & 1);
}
function toggleEngine(b) {
  b.engineOff = !b.engineOff;
  b.crank = b.engineOff ? 0 : DRIVE.crank;
}
function isDark(b) {
  return !!b.engineOff && speedOf(b) < DRIVE.darkSpeed;
}
function forward(h) {
  return [Math.sin(h), Math.cos(h)];
}
function speedOf(b) {
  return Math.hypot(b.vx, b.vz);
}
var STUNNED = { throttle: 0, brake: 0.6, steer: 0, handbrake: false, boost: false };
function stepBody(b, input, spec, dt) {
  if (b.stun > 0) {
    b.stun = Math.max(0, b.stun - dt);
    input = STUNNED;
  }
  const slip = b.slip ?? 0;
  if (slip > 0)
    b.slip = Math.max(0, slip - dt);
  const wheels = b.wheels ?? 0;
  const flats = flatCount(wheels);
  const fronts = (wheels & 1) + (wheels >> 1 & 1);
  const rears = flats - fronts;
  const spin = b.spin ?? 0;
  if (spin > 0)
    b.spin = Math.max(0, spin - dt);
  const loose = Math.min(1, spin / DRIVE.spinFull);
  const crank = b.crank ?? 0;
  if (crank > 0)
    b.crank = Math.max(0, crank - dt);
  const dead = !!b.engineOff || crank > 0;
  if (dead && (input.throttle > 0 || input.boost))
    input = { ...input, throttle: Math.min(0, input.throttle), boost: false };
  const boosting = input.boost && b.boostFuel > 0 && b.stun <= 0;
  b.braking = input.brake > 0.1 || input.handbrake || input.throttle < 0 && b.vx * Math.sin(b.h) + b.vz * Math.cos(b.h) > 0.5;
  b.boosting = boosting && !b.airborne;
  b.landGrip = Math.max(0, b.landGrip - dt);
  if (b.airborne) {
    b.yaw *= Math.exp(-dt * 0.8);
    b.h += b.yaw * dt;
    b.x += b.vx * dt;
    b.z += b.vz * dt;
    return;
  }
  if (boosting)
    b.boostFuel = Math.max(0, b.boostFuel - dt / DRIVE.boostDrain);
  else
    b.boostFuel = Math.min(1, b.boostFuel + dt / DRIVE.boostRefill);
  let [fx, fz] = forward(b.h);
  let vf = b.vx * fx + b.vz * fz;
  let vl = b.vx * fz - b.vz * fx;
  const absVf = Math.abs(vf);
  const speed = Math.hypot(vf, vl);
  const beta = speed > 1 ? Math.atan2(Math.abs(vl), Math.max(0.1, absVf)) : 0;
  const dir = vf >= -0.5 ? 1 : -1;
  const vmax = spec.maxSpeed * (boosting ? DRIVE.boostSpeed : 1) * FLAT_SPEED[flats];
  let drift = b.drift ?? 0;
  if (input.handbrake && absVf > 7)
    drift = 1;
  else if (drift > 0) {
    const hold = input.throttle > 0.2 && beta > 0.14 && speed > 9;
    drift = Math.max(0, drift - dt * (hold ? DRIVE.driftHold : DRIVE.driftExit));
  }
  b.drift = drift;
  const speedFactor = Math.min(1, absVf / 8) * (1 - 0.32 * Math.min(1, absVf / spec.maxSpeed));
  let target = input.steer * spec.turn * speedFactor * dir * (1 + (DRIVE.driftYaw - 1) * drift);
  if (drift > 0 && input.throttle > 0)
    target -= Math.sign(vl) * Math.min(1, Math.abs(vl) / 5) * spec.turn * DRIVE.powerOversteer * drift * input.throttle;
  let rate = input.steer === 0 ? drift > 0 ? 3 : 6 : drift > 0 ? 7 : 10;
  if (flats > 0) {
    target *= DRIVE.flatSteer ** fronts;
    const lean = (wheels >> 1 & 1) + (wheels >> 3 & 1) - (wheels & 1) - (wheels >> 2 & 1);
    const wobble = DRIVE.flatWobble * (0.6 * fronts + rears) * Math.sin(DRIVE.flatWobbleFreq * (b.x + b.z));
    target += dir * Math.min(1, absVf / 15) * (lean * DRIVE.flatPull + wobble);
  }
  if (loose > 0) {
    target *= 1 - DRIVE.spinSteer * loose;
    rate *= 1 - DRIVE.spinYaw * loose;
  }
  if (slip > 0) {
    target = b.yaw;
    rate = 0;
  }
  b.yaw += (target - b.yaw) * Math.min(1, dt * rate);
  b.h += b.yaw * dt;
  [fx, fz] = forward(b.h);
  const rx = fz;
  const rz = -fx;
  vf = b.vx * fx + b.vz * fz;
  vl = b.vx * rx + b.vz * rz;
  let a = 0;
  if (input.throttle > 0) {
    const x = Math.max(0, vf) / vmax;
    a += spec.accel * FLAT_ACCEL[flats] * input.throttle * (boosting ? DRIVE.boostAccel : 1) * Math.max(0, 1 - x * x) * (vf < 0 ? 1.4 : 1);
  }
  if (input.throttle < 0) {
    if (vf > 0.5)
      a -= spec.brake * -input.throttle;
    else if (!dead)
      a += spec.accel * FLAT_ACCEL[flats] * 0.6 * input.throttle * Math.max(0, 1 + vf / (DRIVE.reverseMax * FLAT_SPEED[flats]));
  }
  if (input.brake > 0 && vf > 0.5)
    a -= spec.brake * input.brake;
  if (input.handbrake && absVf > 0.5)
    a -= 5 * Math.sign(vf);
  a -= input.throttle !== 0 && !dead ? 0.02 * vf : Math.sign(vf) * Math.min(Math.abs(vf) * 4, 0.6 + 0.04 * Math.abs(vf));
  if (vf > vmax)
    a -= (vf - vmax) * 0.8;
  if (drift > 0)
    a -= 0.15 * Math.abs(vl) * Math.sign(vf);
  let gripMul = 1;
  if (drift > 0)
    gripMul = 1 + ((input.handbrake ? DRIVE.handbrakeGrip : DRIVE.driftGrip) - 1) * Math.min(1, drift * 2.5);
  if (beta > DRIVE.recoverAngle)
    gripMul *= 1 + DRIVE.recoverGain * (beta - DRIVE.recoverAngle);
  if (flats > 0)
    gripMul *= FLAT_GRIP[flats] * DRIVE.flatRearGrip ** rears;
  if (absVf < 1.5)
    gripMul *= 2;
  if (loose > 0)
    gripMul += (1 - DRIVE.spinGrip - gripMul) * loose;
  if (slip > 0)
    gripMul = DRIVE.oilGrip;
  if (b.landGrip > 0)
    gripMul *= 0.45;
  const lat0 = vl;
  vl *= Math.exp(-spec.grip * gripMul * dt);
  if (drift > 0 && input.throttle > 0 && vf > 0)
    vf += Math.abs(lat0 - vl) * DRIVE.driftMomentum * drift;
  vf += a * dt;
  if (b.stun > 0)
    vf *= Math.exp(-2 * dt);
  if (input.brake > 0.5 && input.throttle === 0 && Math.abs(vf) < 2.5 && Math.abs(vl) < 2.5) {
    vf = 0;
    vl = 0;
  }
  if (Math.abs(vf) < 0.05 && Math.abs(vl) < 0.05 && (input.throttle === 0 || dead)) {
    vf = 0;
    vl = 0;
  }
  b.vx = fx * vf + rx * vl;
  b.vz = fz * vf + rz * vl;
  b.x += b.vx * dt;
  b.z += b.vz * dt;
}
function lateralSpeed(b) {
  const [fx, fz] = forward(b.h);
  return Math.abs(b.vx * -fz + b.vz * fx);
}
var WALL_SLOP = 0.002;
function collideBoxes(b, spec, boxes, out) {
  const [hl, hw] = carHalf(spec);
  const r = Math.hypot(hl, hw);
  const mass = carMass(spec);
  let impact = 0;
  for (const box of boxes) {
    if (b.y > box.h + 0.1)
      continue;
    if (b.x < box.x0 - r || b.x > box.x1 + r || b.z < box.z0 - r || b.z > box.z1 + r)
      continue;
    const c = collideShapes(boxShape(box), carShape(b, spec));
    if (!c)
      continue;
    const hit = resolve(b, mass, null, STATIC, flip(c), WALL);
    separate(b, mass, null, STATIC, flip(c), WALL_SLOP);
    if (hit.impact > impact) {
      impact = hit.impact;
      if (out)
        Object.assign(out, { impact, x: hit.x, z: hit.z, nx: c.nx, nz: c.nz });
    }
  }
  return impact;
}
function flip(c) {
  return { ...c, nx: -c.nx, nz: -c.nz };
}
function substeps(b, spec, dt) {
  const [hl, hw] = carHalf(spec);
  const travel = (speedOf(b) + spec.accel * dt + Math.abs(b.yaw) * hl) * dt;
  return Math.max(1, Math.min(12, Math.ceil(travel / (Math.min(hl, hw) * 0.5))));
}
function stepAndCollide(b, input, spec, dt, boxes, out, ramps = []) {
  b.landing = 0;
  const n = substeps(b, spec, dt);
  const [hl, hw] = carHalf(spec);
  const m = Math.hypot(hl, hw) + (speedOf(b) + spec.accel * dt) * dt * 1.5 + 0.5;
  const near = boxes.filter((box) => b.x > box.x0 - m && b.x < box.x1 + m && b.z > box.z0 - m && b.z < box.z1 + m);
  let impact = 0;
  const hit = { impact: 0, x: 0, z: 0, nx: 0, nz: 0 };
  for (let i = 0;i < n; i++) {
    stepBody(b, input, spec, dt / n);
    stepHeight(b, ramps, dt / n);
    const k = near.length ? collideBoxes(b, spec, near, hit) : 0;
    if (k > impact) {
      impact = k;
      if (out)
        Object.assign(out, hit);
    }
  }
  if (out && impact === 0)
    out.impact = 0;
  crossTunnel(b);
  return impact;
}
var GRAVITY = 18;
function stepHeight(b, ramps, dt) {
  let ground = 0, slopeVelocity = 0;
  for (const r of ramps) {
    const s = rampSurface(r, b.x, b.z);
    if (!s || s.y < ground)
      continue;
    ground = s.y;
    slopeVelocity = s.slope * (b.vx * Math.sin(r.h) + b.vz * Math.cos(r.h));
  }
  if (!b.airborne && b.vy > 2 && slopeVelocity < b.vy - 1 && ground < b.y + b.vy * dt)
    b.airborne = true;
  if (!b.airborne && b.y > ground + 0.3)
    b.airborne = true;
  if (b.airborne) {
    b.y += b.vy * dt - 0.5 * GRAVITY * dt * dt;
    b.vy -= GRAVITY * dt;
    if (b.y <= ground && b.vy <= slopeVelocity) {
      b.landing = Math.max(b.landing, slopeVelocity - b.vy);
      b.landings++;
      b.landGrip = 0.22;
      b.airborne = false;
    } else
      return;
  }
  b.y = ground;
  b.vy = Math.max(-12, Math.min(12, slopeVelocity));
}
function knock(b, dvSide, dw) {
  const s = Math.max(0, dw - 0.6) * 0.3 + Math.max(0, dvSide - 2) * 0.08;
  if (s > 0)
    b.spin = Math.min(DRIVE.spinMax, Math.max(b.spin ?? 0, s));
}
var CAR_SLOP = 0.01;
function collideCars(a, va, b, vb, dt, fixedA = false, fixedB = false) {
  if (Math.abs(a.y - b.y) > 1.6)
    return null;
  if (fixedA && fixedB)
    return null;
  const [la, wa] = carHalf(va);
  const [lb, wb] = carHalf(vb);
  const reach = Math.hypot(la, wa) + Math.hypot(lb, wb);
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  if (dx * dx + dz * dz >= reach * reach)
    return null;
  const c = collideShapes(carShape(a, va), carShape(b, vb));
  if (!c)
    return null;
  const ma = fixedA ? STATIC : carMass(va);
  const mb = fixedB ? STATIC : carMass(vb);
  const closing = (a.vx - b.vx) * c.nx + (a.vz - b.vz) * c.nz;
  const back = closing > 0.5 ? Math.min(dt, c.depth / closing) : 0;
  const a0 = { vx: a.vx, vz: a.vz, yaw: a.yaw };
  const b0 = { vx: b.vx, vz: b.vz, yaw: b.yaw };
  const hit = resolve(a, ma, fixedB ? null : b, mb, c, CARS);
  for (const [body, v0, fixed] of [
    [a, a0, fixedA],
    [b, b0, fixedB]
  ]) {
    if (fixed)
      continue;
    body.x += (body.vx - v0.vx) * back;
    body.z += (body.vz - v0.vz) * back;
    body.h += (body.yaw - v0.yaw) * back;
  }
  const left = collideShapes(carShape(a, va), carShape(b, vb));
  if (left)
    separate(a, ma, fixedB ? null : b, mb, left, CAR_SLOP);
  const dv = [0, 0];
  [a, b].forEach((body, i) => {
    const v0 = i === 0 ? a0 : b0;
    if (i === 0 ? fixedA : fixedB)
      return;
    const ex = body.vx - v0.vx;
    const ez = body.vz - v0.vz;
    dv[i] = Math.hypot(ex, ez);
    knock(body, Math.abs(ex * Math.cos(body.h) - ez * Math.sin(body.h)), Math.abs(body.yaw - v0.yaw));
    if (dv[i] > RAM_STUN_DV)
      body.stun = Math.max(body.stun, Math.min(1.1, dv[i] / 22));
  });
  return { impact: hit.impact, x: hit.x, z: hit.z, nx: c.nx, nz: c.nz, dvA: dv[0], dvB: dv[1] };
}

// shared/sim/bots.ts
var TAU = Math.PI * 2;
function wrapAngle(a) {
  let x = (a + Math.PI) % TAU;
  if (x < 0)
    x += TAU;
  return x - Math.PI;
}
function driveToward(car, tx, tz, cap) {
  const b = car.body;
  const dx = tx - b.x;
  const dz = tz - b.z;
  const dist = Math.hypot(dx, dz);
  const err = wrapAngle(Math.atan2(dx, dz) - b.h);
  const speed = speedOf(b);
  const steer = Math.max(-1, Math.min(1, err * 2.2));
  const want = Math.min(cap, 8 + dist * 0.7);
  const input = { throttle: 0, brake: 0, steer, handbrake: false, boost: false };
  if (speed < want)
    input.throttle = 1;
  if (speed > want * 1.15)
    input.brake = 0.7;
  if (Math.abs(err) > 1.1 && speed > 14) {
    input.throttle = 0.3;
    input.brake = 0.4;
    input.handbrake = Math.abs(err) > 1.9 && speed > 16 && car.role === "robber";
  }
  if (car.reverseT > 0) {
    car.reverseT -= 1 / 30;
    return { throttle: -1, brake: 0, steer: -steer, handbrake: false, boost: false };
  }
  if (speed < 1.5 && input.throttle > 0.5)
    car.stuck += 1 / 30;
  else
    car.stuck = 0;
  if (car.stuck > 1) {
    car.stuck = 0;
    car.reverseT = 1;
  }
  return input;
}
function followRoute(world, car, gx, gz, cap) {
  const b = car.body;
  if (inTunnel(b) && (b.x > TUNNEL.eastMouth && b.vx >= 0 || b.x < TUNNEL.westMouth && b.vx <= 0)) {
    return driveToward(car, b.x > TUNNEL.eastMouth ? TUNNEL.east + 20 : TUNNEL.west - 20, TUNNEL.z, cap);
  }
  while (car.routeI < car.route.length) {
    const n = world.city.nodes[car.route[car.routeI]];
    const prev = world.city.nodes[car.route[car.routeI - 1] ?? -1];
    if (prev && tunnelLink(prev, n) && Math.abs(b.x - prev.x) < 35) {
      return driveToward(car, prev.x < 0 ? TUNNEL.west - 20 : TUNNEL.east + 20, TUNNEL.z, cap);
    }
    if (Math.hypot(n.x - b.x, n.z - b.z) < 14) {
      car.routeI++;
      continue;
    }
    return driveToward(car, n.x, n.z, cap);
  }
  return driveToward(car, gx, gz, cap);
}
function reroute(world, car, tx, tz, every) {
  car.routeT -= 1 / 30;
  if (car.routeT > 0 && Math.hypot(car.routeX - tx, car.routeZ - tz) < 18)
    return;
  car.route = world.routeTo(car.body.x, car.body.z, tx, tz);
  car.routeI = 0;
  car.routeT = every;
  car.routeX = tx;
  car.routeZ = tz;
}
function hideout(world, car) {
  const cops = world.cops();
  let best = world.city.nodes[0];
  let bestScore = -Infinity;
  for (const n of world.city.nodes) {
    let away = 260;
    for (const c of cops)
      away = Math.min(away, Math.hypot(c.body.x - n.x, c.body.z - n.z));
    const d = Math.hypot(n.x - car.body.x, n.z - car.body.z);
    const score = away - 0.1 * d + (d < 30 ? -80 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = n;
    }
  }
  return best;
}
function toShop(world, car) {
  const b = car.body;
  if (flatCount(b.wheels) < 2 || world.phase !== "chase")
    return null;
  let best = -1;
  let bd = Infinity;
  world.city.shops.forEach((s, i) => {
    const d = Math.hypot(s.x - b.x, s.z - b.z);
    if ((world.shopCool[i] ?? 0) <= 0 && d < bd) {
      bd = d;
      best = i;
    }
  });
  const s = world.city.shops[best];
  if (!s)
    return null;
  if (bd < 2)
    return { ...NO_INPUT, brake: 1 };
  const [ox, oz] = forward(s.h);
  const mx = s.x + ox * (BAY_DEPTH / 2 + 10);
  const mz = s.z + oz * (BAY_DEPTH / 2 + 10);
  if (bd < 12 || Math.hypot(mx - b.x, mz - b.z) < 9)
    return driveToward(car, s.x, s.z, 7);
  reroute(world, car, mx, mz, 3);
  return followRoute(world, car, mx, mz, car.vehicle.maxSpeed);
}
function robberBrain(world, car) {
  const repair = toShop(world, car);
  if (repair)
    return repair;
  const exit = world.exit;
  const b = car.body;
  const eta = Math.hypot(exit.x - b.x, exit.z - b.z) / 26;
  let goal = exit;
  if (SURVIVAL || world.exitOpenIn() > eta) {
    car.hideT -= 1 / 30;
    if (car.hideT <= 0 || Math.hypot(car.hideX - b.x, car.hideZ - b.z) < 20) {
      const h = hideout(world, car);
      car.hideX = h.x;
      car.hideZ = h.z;
      car.hideT = world.seen ? 2 : 5;
    }
    goal = { x: car.hideX, z: car.hideZ };
  }
  reroute(world, car, goal.x, goal.z, 3);
  const input = followRoute(world, car, goal.x, goal.z, car.vehicle.maxSpeed);
  const near = world.cops().map((c) => ({ c, d: Math.hypot(c.body.x - b.x, c.body.z - b.z) }));
  input.boost = speedOf(b) > 18 && Math.abs(input.steer) < 0.25 && near.some((n) => n.d < 40);
  const [fx, fz] = forward(b.h);
  const tailed = near.some(({ c, d }) => d < 28 && (c.body.x - b.x) * fx + (c.body.z - b.z) * fz < -0.5 * d);
  if (tailed && speedOf(b) > 12 && world.gadgetReady(car, 0))
    input.gadget = 0;
  else if (world.seen && (near.some((n) => n.d < 35) || world.bust > 0.25 || world.heli.lock > 1.5) && world.gadgetReady(car, 1))
    input.gadget = 1;
  return input;
}
function copGadget(world, car, visible, guard) {
  const b = car.body;
  const r = world.robber();
  if (visible && r && world.gadgetReady(car, 0)) {
    const dx = r.body.x - b.x;
    const dz = r.body.z - b.z;
    const d = Math.hypot(dx, dz);
    const [fx, fz] = forward(b.h);
    const facing = (dx * fx + dz * fz) / Math.max(0.001, d);
    const closing = (-dx * r.body.vx - dz * r.body.vz) / Math.max(0.001, d);
    if (d > 18 && d < 65 && facing > 0.8 && closing > 12)
      return 0;
  }
  if (guard && world.exitOpenIn() < 12 && world.gadgetReady(car, 1)) {
    const de = Math.hypot(world.exit.x - b.x, world.exit.z - b.z);
    const n = world.city.nodes[nearestNode(world.city, b.x, b.z)];
    if (de > 15 && de < 45 && Math.hypot(n.x - b.x, n.z - b.z) > 14)
      return 1;
  }
  return null;
}
function copBrain(world, car) {
  const input = pursue(world, car);
  const b = car.body, fx = Math.sin(b.h), fz = Math.cos(b.h);
  let lateral = 0, brake = 0;
  for (const other of world.cars) {
    if (other === car || other.role !== "cop" || Math.abs(other.body.y - b.y) > 1.5)
      continue;
    const dx = b.x - other.body.x, dz = b.z - other.body.z;
    const distance = Math.hypot(dx, dz);
    const nx = distance > 0.01 ? dx / distance : car.id < other.id ? -fz : fz;
    const nz = distance > 0.01 ? dz / distance : car.id < other.id ? fx : -fx;
    const closing = Math.max(0, -(b.vx - other.body.vx) * nx - (b.vz - other.body.vz) * nz);
    const range = (car.vehicle.length + other.vehicle.length) * 0.5 + 4 + Math.min(closing, 20) * 0.35;
    if (distance >= range)
      continue;
    const weight = (1 - distance / range) ** 2 * (1 + Math.min(closing, 20) * 0.12);
    lateral += (nx * fz - nz * fx) * weight;
    if (nx * fx + nz * fz < -0.25)
      brake = Math.max(brake, Math.min(0.85, weight * 1.8));
  }
  const avoid = Math.min(0.85, Math.abs(lateral) * 1.5);
  input.steer = Math.max(-1, Math.min(1, input.steer * (1 - avoid) + Math.max(-0.85, Math.min(0.85, lateral * 2))));
  input.throttle *= 1 - brake;
  input.brake = Math.max(input.brake, brake);
  if (brake > 0.1 || Math.abs(lateral) > 0.1)
    input.boost = false;
  return input;
}
function pursue(world, car) {
  if (inTunnel(car.body))
    return followRoute(world, car, car.body.x < 0 ? 0 : world.city.max - 8, TUNNEL.z, car.vehicle.maxSpeed);
  const target = world.copTarget(car);
  if (!target)
    return driveToward(car, car.homeX, car.homeZ, car.vehicle.maxSpeed * 0.4);
  const d = Math.hypot(target.x - car.body.x, target.z - car.body.z);
  if (target.visible && d < 55) {
    const input = driveToward(car, target.x, target.z, car.vehicle.maxSpeed);
    input.boost = d > 18 && Math.abs(input.steer) < 0.3;
    input.gadget = copGadget(world, car, true, false);
    return input;
  }
  const closing = world.exitOpenIn() < 15;
  const guard = !SURVIVAL && (car.id % 2 === 0 ? closing || !target.visible : closing && !target.visible);
  const tx = guard ? world.exit.x : target.x;
  const tz = guard ? world.exit.z : target.z;
  reroute(world, car, tx, tz, 2.5);
  const input = guard && Math.hypot(tx - car.body.x, tz - car.body.z) < 25 ? driveToward(car, tx, tz, 6) : followRoute(world, car, tx, tz, car.vehicle.maxSpeed);
  input.gadget = copGadget(world, car, target.visible, guard);
  return input;
}

// shared/sim/gadgets.ts
function newGadgets(ids) {
  return ids.map((id) => ({ id, charges: GADGETS[id].charges, cooldown: 0 }));
}
function snapAxis(h) {
  return Math.round(h / (Math.PI / 2)) * (Math.PI / 2);
}
function placeProp(kind, b, carLength) {
  const [fx, fz] = forward(b.h);
  if (kind === "oil" || kind === "smoke") {
    const back = kind === "oil" ? carLength / 2 + GADGETS.oil.radius + 0.5 : 3;
    return { x: b.x - fx * back, z: b.z - fz * back, h: b.h };
  }
  const ahead = kind === "spike" ? -(carLength / 2 + 2.5) : 8;
  const h = snapAxis(b.h);
  let x = b.x + fx * ahead;
  let z = b.z + fz * ahead;
  const alongZ = Math.abs(Math.cos(h)) > 0.5;
  if (alongZ) {
    const line = Math.round(x / CELL) * CELL;
    if (Math.abs(x - line) < ROAD_HALF + 1)
      x = line;
  } else {
    const line = Math.round(z / CELL) * CELL;
    if (Math.abs(z - line) < ROAD_HALF + 1)
      z = line;
  }
  return { x, z, h };
}
function propBox(p) {
  if (p.kind !== "roadblock")
    return null;
  const alongZ = Math.abs(Math.cos(p.h)) > 0.5;
  const ax = alongZ ? p.r : ROADBLOCK_THICK / 2;
  const az = alongZ ? ROADBLOCK_THICK / 2 : p.r;
  return { x0: p.x - ax, x1: p.x + ax, z0: p.z - az, z1: p.z + az, h: 1.3, color: [0.95, 0.55, 0.12], neon: null, kind: "special", label: "roadblock" };
}
var WHEEL_ALONG = 0.32;
var WHEEL_SIDE = 0.4;
function wheelPoints(p, length, width) {
  const [fx, fz] = forward(p.h);
  const a = length * WHEEL_ALONG;
  const s = width * WHEEL_SIDE;
  return [
    [p.x + fx * a - fz * s, p.z + fz * a + fx * s],
    [p.x + fx * a + fz * s, p.z + fz * a - fx * s],
    [p.x - fx * a - fz * s, p.z - fz * a + fx * s],
    [p.x - fx * a + fz * s, p.z - fz * a - fx * s]
  ];
}
function stripWheels(p, from, to, length, width) {
  const [fx, fz] = forward(p.h);
  const along = ([x, z]) => (x - p.x) * fx + (z - p.z) * fz;
  const across = ([x, z]) => Math.abs((x - p.x) * fz - (z - p.z) * fx);
  const half = SPIKE_THICK / 2;
  const w0 = wheelPoints(from, length, width);
  const w1 = wheelPoints(to, length, width);
  const c0 = (from.x - p.x) * fx + (from.z - p.z) * fz;
  const c1 = (to.x - p.x) * fx + (to.z - p.z) * fz;
  const way = c1 !== c0 ? Math.sign(c1 - c0) : -Math.sign(c1) || 1;
  let touched = false;
  const over = [];
  for (let i = 0;i < 4; i++) {
    const a0 = along(w0[i]);
    const a1 = along(w1[i]);
    if (Math.min(across(w0[i]), across(w1[i])) > p.r)
      continue;
    if (Math.min(a0, a1) <= half && Math.max(a0, a1) >= -half)
      touched = true;
    over.push({ i, key: -a1 * way });
  }
  if (!touched)
    return [];
  over.sort((a, b) => Math.abs(a.key - b.key) > 0.05 ? a.key - b.key : a.i - b.i);
  return over.map((o) => o.i);
}
function segmentHitsBox(ax, az, bx, bz, box) {
  if (Math.max(ax, bx) < box.x0 || Math.min(ax, bx) > box.x1 || Math.max(az, bz) < box.z0 || Math.min(az, bz) > box.z1)
    return false;
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dz = bz - az;
  for (const [o, d, lo, hi] of [
    [ax, dx, box.x0, box.x1],
    [az, dz, box.z0, box.z1]
  ]) {
    if (Math.abs(d) < 0.000000001) {
      if (o < lo || o > hi)
        return false;
      continue;
    }
    let ta = (lo - o) / d;
    let tb = (hi - o) / d;
    if (ta > tb)
      [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1)
      return false;
  }
  return true;
}
function segmentHitsCircle(ax, az, bx, bz, cx, cz, r) {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz;
  const t = len2 > 0.000000001 ? Math.max(0, Math.min(1, ((cx - ax) * dx + (cz - az) * dz) / len2)) : 0;
  return Math.hypot(ax + dx * t - cx, az + dz * t - cz) < r;
}

// shared/sim/world.ts
var SURVIVAL = true;
var BACKUP_EVERY = 25;
var MAX_BACKUP = 6;
var VIEW_HALF_WIDTH = 85;
var VIEW_BACK = 45;
var VIEW_AHEAD = 85;
var MAX_STRIPS = 3;
var TIP_EVERY = 60;
var TIP_RADIUS = 110;
var SPOT_AFTER = 4;
var SPOT_MOVED = 60;
var SPOT_COOLDOWN = 6;
var LOST_AFTER = 5;
var PVP = true;
var MIN_PLAYERS = 2;
var HEAT_RATE = 0.35;
var HEAT_SEEN_RATE = 0.8;
var HEAT_SPOT_RATE = 1.2;
var HELI_DELAY = 20;
var HELI_SPEED = 26;
var HELI_ALT = 42;
var SPOT_RADIUS = 12;
var SPOT_SWEEP = 22;

class World {
  city;
  rng;
  round = -1;
  phase = "intro";
  phaseT = 0;
  t = 0;
  site;
  exit;
  cars = [];
  robberId = "";
  heat = 0;
  loot = 0;
  seen = false;
  lastSeen = null;
  bust = 0;
  boxed = false;
  busted = false;
  escaped = false;
  extract = 0;
  roundDrift = 0;
  roundNear = 0;
  roundScore = 0;
  survived = 0;
  tip = null;
  repair = 0;
  shopCool = [];
  unseenFor = 0;
  unseenRadio = Infinity;
  sighted = false;
  lastSpotT = -Infinity;
  best = 0;
  bestName = "";
  newBest = false;
  heli = { active: false, x: 0, y: HELI_ALT, z: 0, h: 0, sx: 0, sz: 0, lock: 0 };
  events = [];
  props = [];
  heliDelay = HELI_DELAY;
  propBoxes = [];
  standings = new Map;
  participants = [];
  nextId = 1;
  reinforcements = 0;
  robberTurn = 0;
  nextPropId = 1;
  lastSeenH = 0;
  blockedEdges = new Set;
  sightBoxes;
  constructor(seed, participants) {
    this.city = generateCity(seed);
    this.sightBoxes = this.city.boxes.filter((b) => b.kind !== "special" && b.h > 3);
    this.rng = mulberry32(seed ^ 2654435769);
    this.setParticipants(participants);
    this.startRound();
  }
  get stars() {
    return Math.min(5, 1 + Math.floor(this.heat / 25));
  }
  robber() {
    return this.cars.find((c) => c.ownerId === this.robberId);
  }
  cops() {
    return this.cars.filter((c) => c.role === "cop");
  }
  carOf(ownerId) {
    return this.cars.find((c) => c.ownerId === ownerId);
  }
  routeTo(x, z, tx, tz) {
    const blocked = this.blockedEdges.size ? (a, b) => this.blockedEdges.has(a * 1024 + b) : undefined;
    return routeNodes(this.city, nearestNode(this.city, x, z), nearestNode(this.city, tx, tz), blocked);
  }
  setParticipants(ps) {
    this.participants = ps;
    for (const p of ps)
      if (!this.standings.has(p.id))
        this.standings.set(p.id, { id: p.id, name: p.name, human: p.human, score: 0, escapes: 0, busts: 0, best: 0 });
    for (const c of this.cars)
      if (c.human && !ps.some((p) => p.id === c.ownerId))
        c.human = false;
    if (!PVP || this.round < 0 && this.phase !== "waiting")
      return;
    const enough = ps.length >= MIN_PLAYERS;
    if (this.phase === "waiting") {
      if (enough)
        this.startRound();
      else
        this.syncWaitingCars();
    } else if (!enough || !ps.some((p) => p.id === this.robberId)) {
      this.startRound();
    } else {
      this.cars = this.cars.filter((c) => ps.some((p) => p.id === c.ownerId) || c.ownerId.startsWith("backup-"));
      if (this.phase !== "end") {
        const n = this.city.nodes[this.city.precinct.spawnNode];
        for (const p of ps) {
          if (this.cars.some((c) => c.ownerId === p.id))
            continue;
          const k = this.cops().length;
          this.spawn(p, "cop", n.x + (k % 2 === 0 ? -2.5 : 2.5), n.z + Math.floor(k / 2) * 7, Math.PI);
          this.emit("join", `${p.name} joined the pursuit`);
        }
      }
    }
  }
  syncWaitingCars() {
    this.cars = this.cars.filter((c) => this.participants.some((p) => p.id === c.ownerId));
    this.participants.forEach((p, i) => {
      if (this.cars.some((c) => c.ownerId === p.id))
        return;
      const site = this.city.sites[i % this.city.sites.length];
      this.spawn(p, "robber", site.x, site.z - 10, 0);
    });
  }
  setInput(ownerId, input) {
    const c = this.carOf(ownerId);
    if (!c || !c.human)
      return;
    const g = input.gadget ?? null;
    if (g !== null && g !== c.lastGadget)
      c.pendingGadget = g;
    c.lastGadget = g;
    const e = !!input.engine;
    if (e && !c.lastEngine)
      c.pendingEngine = true;
    c.lastEngine = e;
    c.input = input;
  }
  chooseRobber() {
    const humans = this.participants.filter((p) => p.human);
    const bots = this.participants.filter((p) => !p.human);
    const turn = this.robberTurn++;
    if (humans.length >= 2)
      return humans[turn % humans.length];
    if (humans.length === 1 && (turn % 2 === 0 || !bots.length))
      return humans[0];
    return bots[turn % Math.max(1, bots.length)] ?? this.participants[0];
  }
  startRound() {
    if (PVP && this.participants.length < MIN_PLAYERS) {
      this.phase = "waiting";
      this.phaseT = 0;
      this.robberId = "";
      this.bust = 0;
      this.busted = false;
      this.boxed = false;
      this.seen = false;
      this.lastSeen = null;
      this.props = [];
      this.propsChanged();
      this.site ??= this.city.sites[0];
      this.exit ??= this.city.extraction[0];
      this.cars = [];
      const hp = this.city.helipad;
      this.heli = { active: false, x: hp.x, y: hp.y, z: hp.z, h: 0, sx: hp.x, sz: hp.z, lock: 0 };
      this.syncWaitingCars();
      return;
    }
    this.round++;
    this.phase = "intro";
    this.phaseT = 0;
    this.t = 0;
    this.heat = 0;
    this.bust = 0;
    this.boxed = false;
    this.busted = false;
    this.escaped = false;
    this.extract = 0;
    this.reinforcements = 0;
    this.survived = 0;
    this.tip = null;
    this.repair = 0;
    this.shopCool = this.city.shops.map(() => 0);
    this.unseenFor = 0;
    this.unseenRadio = Infinity;
    this.sighted = false;
    this.lastSpotT = -Infinity;
    this.newBest = false;
    this.roundDrift = 0;
    this.roundNear = 0;
    this.roundScore = 0;
    this.seen = false;
    this.lastSeen = null;
    this.props = [];
    this.propsChanged();
    const hp = this.city.helipad;
    this.heli = { active: false, x: hp.x, y: hp.y, z: hp.z, h: 0, sx: hp.x, sz: hp.z, lock: 0 };
    this.site = this.city.sites[Math.floor(this.rng() * this.city.sites.length)];
    const exits = this.city.extraction.filter((e) => Math.hypot(e.x - this.site.x, e.z - this.site.z) > 220);
    this.exit = exits[Math.floor(this.rng() * exits.length)] ?? this.city.extraction[0];
    this.loot = this.site.value;
    this.cars = [];
    const robber = this.chooseRobber();
    this.robberId = robber.id;
    this.spawn(robber, "robber", this.site.x, this.site.z - 10, 0);
    const cops = this.participants.filter((p) => p.id !== robber.id);
    const n = this.city.nodes[this.city.precinct.spawnNode];
    cops.forEach((p, i) => this.spawn(p, "cop", n.x + (i % 2 === 0 ? -2.5 : 2.5), n.z + Math.floor(i / 2) * 7, Math.PI));
    this.emit("round", SURVIVAL ? `${robber.name} is on the run.` : `${robber.name} hit ${this.site.name}. Get to the ${this.exit.name}.`);
  }
  spawn(p, role, x, z, h) {
    const vehicle = VEHICLE_BY_ID.get(p.picks[role]) ?? VEHICLES.find((v) => v.role === role);
    const fixed = vehicle.role === role ? vehicle : VEHICLES.find((v) => v.role === role);
    const car = {
      id: this.nextId++,
      ownerId: p.id,
      name: p.name,
      role,
      vehicle: fixed,
      body: newBody(x, z, h),
      input: NO_INPUT,
      human: p.human,
      impact: 0,
      stuck: 0,
      reverseT: 0,
      route: [],
      routeI: 0,
      routeT: 0,
      routeX: 0,
      routeZ: 0,
      homeX: x,
      homeZ: z,
      nearCool: 0,
      hideX: x,
      hideZ: z,
      hideT: 0,
      gadgets: newGadgets(LOADOUT[role]),
      pendingGadget: null,
      lastGadget: null,
      pendingEngine: false,
      lastEngine: false,
      impactCool: 0
    };
    this.cars.push(car);
    return car;
  }
  emit(kind, text, carId, to) {
    this.events.push(to === undefined ? { t: this.t, kind, text, carId } : { t: this.t, kind, text, carId, to });
  }
  drainEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }
  credit(ownerId, pts) {
    const s = this.standings.get(ownerId);
    if (s)
      s.score += pts;
  }
  addReinforcement() {
    const n = this.city.nodes[this.city.precinct.spawnNode];
    const vehicle = this.reinforcements % 2 ? "swat" : "interceptor";
    const p = { id: `backup-${this.reinforcements}`, name: `Unit ${41 + this.reinforcements}`, human: false, picks: { robber: vehicle, cop: vehicle } };
    this.spawn(p, "cop", n.x, n.z - 6, Math.PI);
    this.reinforcements++;
    this.emit("dispatch", "Backup unit inbound");
  }
  endRound(escaped, text) {
    this.phase = "end";
    this.phaseT = 0;
    this.escaped = escaped;
    this.busted = !escaped;
    const robber = this.robber();
    const st = this.standings.get(this.robberId);
    if (escaped && st)
      st.escapes++;
    if (st && this.survived > st.best)
      st.best = this.survived;
    if (this.survived > this.best) {
      this.best = this.survived;
      this.bestName = robber?.name ?? "";
      this.newBest = true;
    }
    this.emit("end", text, robber?.id);
    if (this.roundDrift > 0 && robber)
      this.emit("award", `Drift king: ${robber.name} ${Math.round(this.roundDrift)}`);
    if (this.roundNear > 0 && robber)
      this.emit("award", `Close calls: ${this.roundNear}`);
  }
  step(dt) {
    this.phaseT += dt;
    if (this.phase === "end") {
      if (this.phaseT >= END_SECONDS)
        this.startRound();
      return;
    }
    this.t += dt;
    if (this.phase === "intro" && this.phaseT >= INTRO_SECONDS) {
      this.phase = "headstart";
      this.phaseT = 0;
      this.emit("go", "GO");
    } else if (this.phase === "headstart" && this.phaseT >= HEAD_START_SECONDS) {
      this.phase = "chase";
      this.phaseT = 0;
      const r = this.robber();
      if (r)
        this.lastSeen = { x: r.body.x, z: r.body.z, t: this.t };
      this.emit("dispatch", "All units, suspect fleeing. Pursue.");
    }
    this.stepCars(dt);
    if (this.phase === "chase")
      this.stepRules(dt);
    if (this.phase === "headstart" || this.phase === "chase")
      this.stepScoring(dt);
  }
  moving(c) {
    if (this.phase === "waiting")
      return true;
    if (this.phase === "intro")
      return false;
    if (this.phase === "headstart")
      return c.role === "robber";
    return !(c.role === "robber" && this.busted);
  }
  stepCars(dt) {
    const boxes = this.propBoxes.length ? [...this.city.boxes, ...this.propBoxes] : this.city.boxes;
    const prev = new Map;
    const wall = { impact: 0, x: 0, z: 0, nx: 0, nz: 0 };
    for (const c of this.cars) {
      for (const g of c.gadgets)
        g.cooldown = Math.max(0, g.cooldown - dt);
      c.impactCool = Math.max(0, c.impactCool - dt);
      if (!this.moving(c)) {
        c.body.vx *= 0.85;
        c.body.vz *= 0.85;
        c.impact = 0;
        c.pendingGadget = null;
        c.pendingEngine = false;
        continue;
      }
      const input = c.human ? c.input : c.role === "robber" ? robberBrain(this, c) : copBrain(this, c);
      if (c.human ? c.pendingEngine : input.engine)
        toggleEngine(c.body);
      c.pendingEngine = false;
      const slot = c.human ? c.pendingGadget : input.gadget ?? null;
      c.pendingGadget = null;
      if (slot !== null)
        this.useGadget(c, slot);
      prev.set(c.id, { x: c.body.x, z: c.body.z, h: c.body.h });
      c.impact = stepAndCollide(c.body, input, c.vehicle, dt, boxes, wall, this.city.ramps);
      if (Math.abs(c.body.x - prev.get(c.id).x) > 100)
        prev.set(c.id, { x: c.body.x, z: c.body.z, h: c.body.h });
      if (c.body.landing > 0)
        this.events.push({ t: this.t, kind: "landing", text: "", carId: c.id, impact: c.body.landing, to: c.role === "robber" && !this.seen ? c.ownerId : undefined });
      if (c.impact >= IMPACT_EVENT)
        this.impactEvent(c, wall);
    }
    const touched = new Set;
    for (let i = 0;i < this.cars.length; i++)
      for (let j = i + 1;j < this.cars.length; j++) {
        const a = this.cars[i];
        const b = this.cars[j];
        const ma = this.moving(a);
        const mb = this.moving(b);
        if (a.role === "cop" && b.role === "cop") {
          if (!ma && !mb || Math.abs(a.body.y - b.body.y) > 1.5)
            continue;
          const contact = collideShapes(carShape(a.body, a.vehicle), carShape(b.body, b.vehicle));
          if (!contact)
            continue;
          const shift = Math.min(6 * dt, contact.depth * (1 - Math.exp(-dt * 12))) / (Number(ma) + Number(mb));
          if (ma) {
            a.body.x -= contact.nx * shift;
            a.body.z -= contact.nz * shift;
            touched.add(a);
          }
          if (mb) {
            b.body.x += contact.nx * shift;
            b.body.z += contact.nz * shift;
            touched.add(b);
          }
          continue;
        }
        const hit = collideCars(a.body, a.vehicle, b.body, b.vehicle, dt, !ma, !mb);
        if (!hit)
          continue;
        if (ma)
          touched.add(a);
        if (mb)
          touched.add(b);
        a.impact = Math.max(a.impact, hit.impact);
        b.impact = Math.max(b.impact, hit.impact);
        if (this.phase === "chase" && (a.role === "robber" || b.role === "robber") && hit.impact > 8)
          this.heat += 1;
        if (hit.impact >= IMPACT_EVENT) {
          this.impactEvent(a, { ...hit, nx: -hit.nx, nz: -hit.nz });
          this.impactEvent(b, hit);
        }
      }
    for (const c of touched)
      collideBoxes(c.body, c.vehicle, boxes);
    this.stepProps(dt, prev);
  }
  impactEvent(c, hit) {
    if (c.impactCool > 0)
      return;
    c.impactCool = IMPACT_COOLDOWN;
    const hidden = c.role === "robber" && this.phase === "chase" && !this.seen;
    const f = (v, d) => v.toFixed(d);
    this.emit("impact", hidden ? f(hit.impact, 1) : [f(hit.impact, 1), f(hit.x, 2), f(hit.z, 2), f(hit.nx, 3), f(hit.nz, 3)].join("|"), c.id);
  }
  gadgetReady(c, slot) {
    if (SURVIVAL && (c.role !== "cop" || c.gadgets[slot]?.id !== "spike"))
      return false;
    const g = c.gadgets[slot];
    if (!g || g.cooldown > 0 || g.charges <= 0 && !(SURVIVAL && g.id === "spike"))
      return false;
    if (c.role === "cop")
      return this.phase === "chase";
    return (this.phase === "headstart" || this.phase === "chase") && !this.busted;
  }
  useGadget(c, slot) {
    if (SURVIVAL)
      slot = 0;
    if (!this.gadgetReady(c, slot))
      return false;
    const g = c.gadgets[slot];
    const spec = GADGETS[g.id];
    g.charges--;
    g.cooldown = spec.cooldown;
    const at = placeProp(g.id, c.body, c.vehicle.length);
    this.props.push({ id: this.nextPropId++, kind: g.id, x: at.x, z: at.z, h: at.h, r: spec.radius, life: spec.ttl, ttl: spec.ttl, owner: c.id, team: c.role, revealed: c.role === "cop" || this.seen, hits: [] });
    if (SURVIVAL && g.id === "spike") {
      const mine = this.props.filter((p) => p.kind === "spike" && p.owner === c.id);
      if (mine.length > MAX_STRIPS)
        this.props.splice(this.props.indexOf(mine[0]), 1);
      g.charges = Math.max(0, MAX_STRIPS - Math.min(MAX_STRIPS, mine.length));
    }
    if (g.id === "roadblock")
      this.propsChanged();
    if (c.role === "robber" && this.phase === "chase")
      this.heat += 2;
    this.emit("gadget", `${c.name} deployed ${spec.name}`, c.id);
    return true;
  }
  propsChanged() {
    this.propBoxes = [];
    this.blockedEdges.clear();
    for (const p of this.props) {
      const box = propBox(p);
      if (!box)
        continue;
      this.propBoxes.push(box);
      const { nodes, adj } = this.city;
      for (let u = 0;u < nodes.length; u++)
        for (const v of adj[u]) {
          const a = nodes[u];
          const b = nodes[v];
          if (tunnelLink(a, b))
            continue;
          if (segmentHitsCircle(a.x, a.z, b.x, b.z, p.x, p.z, ROAD_HALF + 1))
            this.blockedEdges.add(u * 1024 + v);
        }
    }
  }
  stepProps(dt, prev) {
    let roadblocks = false;
    this.props = this.props.filter((p) => {
      if (SURVIVAL && p.kind === "spike")
        return true;
      p.life -= dt;
      if (p.life > 0)
        return true;
      roadblocks ||= p.kind === "roadblock";
      return false;
    });
    const cops = this.cops();
    const robber = this.robber();
    for (const p of [...this.props]) {
      if (!p.revealed && cops.some((c) => Math.hypot(c.body.x - p.x, c.body.z - p.z) < SIGHT_RANGE))
        p.revealed = true;
      if (p.kind === "oil") {
        for (const c of cops) {
          if (p.hits.includes(c.id) || !prev.has(c.id) || Math.hypot(c.body.x - p.x, c.body.z - p.z) > p.r + 0.6)
            continue;
          p.hits.push(c.id);
          const b = c.body;
          const [fx, fz] = forward(b.h);
          const side = b.vx * fz - b.vz * fx;
          b.slip = OIL_SPIN_SECONDS;
          b.yaw = (side > 0 ? -1 : 1) * (2.5 + Math.min(2, speedOf(b) / 15));
          b.drift = 0;
          this.emit("spinout", `${c.name} spun out on the oil`, c.id);
        }
      } else if (p.kind === "spike" && robber && prev.has(robber.id)) {
        const b = robber.body;
        const v = robber.vehicle;
        const [fx, fz] = forward(p.h);
        const clear = Math.abs((b.x - p.x) * fx + (b.z - p.z) * fz) > v.length / 2 + SPIKE_THICK / 2 + 1 || Math.abs((b.x - p.x) * fz - (b.z - p.z) * fx) > p.r + v.length / 2 + 1;
        if (clear) {
          if (p.hits.length)
            p.hits.length = 0;
          continue;
        }
        if (p.hits.includes(robber.id))
          continue;
        const order = stripWheels(p, prev.get(robber.id), b, v.length, v.width);
        if (!order.length)
          continue;
        if (SURVIVAL)
          p.hits.push(robber.id);
        else
          this.props.splice(this.props.indexOf(p), 1);
        const wheel = order.find((i) => !((b.wheels ?? 0) & 1 << i));
        if (wheel === undefined)
          continue;
        b.wheels = (b.wheels ?? 0) | 1 << wheel;
        this.lastSeen = { x: b.x, z: b.z, t: this.t };
        this.lastSeenH = b.h;
        this.heat += 2;
        this.emit("flat", `${flatCount(b.wheels)}|${WHEEL_NAMES[wheel]}`, robber.id);
      }
    }
    if (roadblocks)
      this.propsChanged();
  }
  stepRepair(dt, r) {
    for (let i = 0;i < this.shopCool.length; i++)
      this.shopCool[i] = Math.max(0, this.shopCool[i] - dt);
    const b = r.body;
    const i = shopAt(this.city, b.x, b.z);
    if (i < 0 || !b.wheels || this.shopCool[i] > 0) {
      this.repair = 0;
      return;
    }
    if (speedOf(b) >= REPAIR_SPEED) {
      this.repair = Math.max(0, this.repair - dt * 2);
      return;
    }
    this.repair += dt;
    if (this.repair < REPAIR_SECONDS)
      return;
    this.repair = 0;
    b.wheels = 0;
    this.shopCool[i] = SHOP_COOLDOWN;
    const shop = this.city.shops[i];
    if (this.seen)
      this.emit("repair", shop.id, r.id);
    else
      this.emit("repair", "", r.id, r.ownerId);
  }
  inSmoke(x, z) {
    return this.props.some((p) => p.kind === "smoke" && Math.hypot(p.x - x, p.z - z) < p.r);
  }
  stepTip(dt, r) {
    if (this.seen) {
      this.unseenFor = 0;
      this.tip = null;
      return;
    }
    this.unseenFor += dt;
    if (this.unseenFor < TIP_EVERY)
      return;
    this.unseenFor = 0;
    const a = this.rng() * Math.PI * 2;
    const off = TIP_RADIUS * (0.25 + 0.5 * this.rng());
    this.tip = { x: r.body.x + Math.cos(a) * off, z: r.body.z + Math.sin(a) * off, r: TIP_RADIUS, t: this.t };
    this.emit("tip", "Dispatch: caller reports the suspect in this area");
  }
  stepSighting(dt, r, wasSeen, ground) {
    if (!this.seen) {
      this.unseenRadio += dt;
      if (this.sighted && this.unseenRadio >= LOST_AFTER) {
        this.sighted = false;
        this.emit("lost", "Lost visual on the suspect");
      }
      return;
    }
    const away = this.lastSeen ? Math.hypot(r.body.x - this.lastSeen.x, r.body.z - this.lastSeen.z) : Infinity;
    const fresh = !wasSeen && (this.unseenRadio >= SPOT_AFTER || away > SPOT_MOVED);
    this.unseenRadio = 0;
    this.sighted = true;
    if (!fresh || this.t - this.lastSpotT < SPOT_COOLDOWN)
      return;
    this.lastSpotT = this.t;
    const b = r.body;
    const [fx, fz] = speedOf(b) > 2 ? [b.vx, b.vz] : forward(b.h);
    const north = fx * Math.sin(CAMERA_YAW) + fz * Math.cos(CAMERA_YAW);
    const east = -fx * Math.cos(CAMERA_YAW) + fz * Math.sin(CAMERA_YAW);
    const heading = Math.abs(north) >= Math.abs(east) ? north >= 0 ? "north" : "south" : east >= 0 ? "east" : "west";
    this.emit("spotted", `${ground ? "ground" : "heli"}|${heading}`);
  }
  onScreen(cop, r) {
    if (inTunnel(cop.body) || inTunnel(r.body))
      return false;
    const dx = r.body.x - cop.body.x;
    const dz = r.body.z - cop.body.z;
    const along = dx * Math.sin(CAMERA_YAW) + dz * Math.cos(CAMERA_YAW);
    const side = dx * Math.cos(CAMERA_YAW) - dz * Math.sin(CAMERA_YAW);
    return Math.abs(side) < SCREEN_HALF_WIDTH && along > -SCREEN_BACK && along < SCREEN_AHEAD;
  }
  inView(cop, r) {
    if (inTunnel(cop.body) || inTunnel(r.body))
      return false;
    const dx = r.body.x - cop.body.x;
    const dz = r.body.z - cop.body.z;
    const along = dx * Math.sin(CAMERA_YAW) + dz * Math.cos(CAMERA_YAW);
    const side = dx * Math.cos(CAMERA_YAW) - dz * Math.sin(CAMERA_YAW);
    return Math.abs(side) < VIEW_HALF_WIDTH && along > -VIEW_BACK && along < VIEW_AHEAD;
  }
  canSee(cop, r) {
    if (inTunnel(cop.body) || inTunnel(r.body))
      return false;
    const a = cop.body;
    const b = r.body;
    const d = Math.hypot(a.x - b.x, a.z - b.z);
    if (d > SIGHT_RANGE)
      return false;
    for (const p of this.props)
      if (p.kind === "smoke" && segmentHitsCircle(a.x, a.z, b.x, b.z, p.x, p.z, p.r))
        return false;
    if (d < HEAR_RANGE)
      return true;
    for (const box of this.sightBoxes)
      if (segmentHitsBox(a.x, a.z, b.x, b.z, box))
        return false;
    return true;
  }
  stepRules(dt) {
    const r = this.robber();
    if (!r)
      return;
    const cops = this.cops();
    this.survived = this.phaseT;
    this.heat += dt * (this.seen ? HEAT_SEEN_RATE : HEAT_RATE);
    if (!SURVIVAL && this.phaseT >= EXTRACT_OPEN_SECONDS && this.phaseT - dt < EXTRACT_OPEN_SECONDS)
      this.emit("exit", `The ride is waiting at the ${this.exit.name}`);
    this.stepHeli(dt, r);
    const smoked = this.inSmoke(r.body.x, r.body.z);
    const dark = isDark(r.body) || inTunnel(r.body);
    const spotted = this.heli.active && !smoked && !dark && Math.hypot(this.heli.sx - r.body.x, this.heli.sz - r.body.z) < SPOT_RADIUS;
    this.heli.lock = spotted ? this.heli.lock + dt : 0;
    if (spotted)
      this.heat += dt * HEAT_SPOT_RATE;
    const wasSeen = this.seen;
    const ground = !smoked && !dark && cops.some((c) => SURVIVAL ? this.onScreen(c, r) : this.canSee(c, r));
    this.seen = spotted || ground;
    this.stepSighting(dt, r, wasSeen, ground);
    if (this.seen) {
      this.lastSeen = { x: r.body.x, z: r.body.z, t: this.t };
      this.lastSeenH = r.body.h;
    }
    if (SURVIVAL)
      this.stepTip(dt, r);
    this.stepRepair(dt, r);
    const near = cops.filter((c) => Math.hypot(c.body.x - r.body.x, c.body.z - r.body.z) < BUST_RANGE);
    this.boxed = near.length > 0 && speedOf(r.body) < 7;
    if (this.boxed) {
      const rate = near.length * BUST_RATE_PER_COP;
      this.bust = Math.min(1, this.bust + dt / BUST_SECONDS * rate);
      if (this.bust >= 1) {
        const pts = 1000 + Math.round(this.loot / 1000);
        for (const c of near) {
          this.credit(c.ownerId, Math.round(pts / near.length));
          const s = this.standings.get(c.ownerId);
          if (s)
            s.busts++;
        }
        this.emit("bust", `${near.map((c) => c.name).join(" & ")} busted ${r.name}`, r.id);
        this.endRound(false, "SUSPECT BUSTED");
        return;
      }
    } else
      this.bust = Math.max(0, this.bust - dt * 0.4);
    if (SURVIVAL) {
      if (!PVP && this.reinforcements < MAX_BACKUP && this.phaseT >= BACKUP_EVERY * (this.reinforcements + 1))
        this.addReinforcement();
      return;
    }
    const d = Math.hypot(r.body.x - this.exit.x, r.body.z - this.exit.z);
    if (this.exitOpenIn() <= 0 && d < EXTRACT_RADIUS && speedOf(r.body) < EXTRACT_SPEED) {
      const rate = (spotted ? EXTRACT_SPOTLIT_RATE : 1) * (this.boxed ? EXTRACT_BOXED_RATE : 1);
      this.extract = Math.min(EXTRACT_SECONDS, this.extract + dt * rate);
      if (this.extract >= EXTRACT_SECONDS) {
        this.credit(this.robberId, this.loot);
        this.roundScore += this.loot;
        this.emit("extract", `${r.name} got away with $${Math.round(this.loot / 1000)}K`, r.id);
        this.endRound(true, "CLEAN GETAWAY");
        return;
      }
    } else
      this.extract = Math.max(0, this.extract - dt);
    if (this.t > ROUND_SECONDS + INTRO_SECONDS + HEAD_START_SECONDS) {
      this.emit("end", "Out of time. Roadblocks sealed the district.");
      this.endRound(false, "TIME'S UP");
      return;
    }
    if (this.stars > this.reinforcements + 2 && this.reinforcements < 3)
      this.addReinforcement();
  }
  stepHeli(dt, r) {
    const h = this.heli;
    if (!h.active) {
      if (this.phaseT < this.heliDelay)
        return;
      h.active = true;
      this.emit("heli", "Air unit up. Spotlight sweeping.");
    }
    h.y += (HELI_ALT - h.y) * Math.min(1, dt * 0.8);
    const live = this.seen && Math.hypot(r.body.x - h.x, r.body.z - h.z) < 90;
    const target = live ? { x: r.body.x, z: r.body.z } : this.heliSearch();
    const dx = target.x - h.x;
    const dz = target.z - h.z;
    const d = Math.hypot(dx, dz);
    const lag = live ? 10 : 0;
    if (d > lag) {
      const step = Math.min(d - lag, HELI_SPEED * dt);
      h.x += dx / d * step;
      h.z += dz / d * step;
      if (d > 2)
        h.h = Math.atan2(dx, dz);
    }
    let tx;
    let tz;
    if (live) {
      tx = r.body.x + r.body.vx * 0.2;
      tz = r.body.z + r.body.vz * 0.2;
    } else {
      const a = this.t * 2.1;
      const rad = SPOT_SWEEP * (0.6 + 0.4 * Math.sin(this.t * 0.7));
      tx = h.x + Math.cos(a) * rad;
      tz = h.z + Math.sin(a) * rad;
    }
    const k = Math.min(1, dt * 3);
    h.sx += (tx - h.sx) * k;
    h.sz += (tz - h.sz) * k;
  }
  heliSearch(phase = 0) {
    const c = this.lastSeen ?? { x: this.exit.x, z: this.exit.z, t: this.t };
    const age = Math.max(0, this.t - c.t);
    const rad = Math.min(170, 12 + 4.5 * age);
    const angle = phase + age * Math.min(1.2, HELI_SPEED * 0.9 / rad);
    const x = Math.max(0, Math.min(this.city.max - 8, c.x + Math.cos(angle) * rad));
    const z = Math.max(0, Math.min(this.city.waterZ - 8, c.z + Math.sin(angle) * rad));
    return { x, z };
  }
  stepScoring(dt) {
    const r = this.robber();
    if (!r || this.busted)
      return;
    r.nearCool = Math.max(0, r.nearCool - dt);
    const sp = speedOf(r.body);
    const lat = lateralSpeed(r.body);
    if (sp > 10 && lat > 5) {
      const pts = lat * sp * dt * 0.8;
      this.roundDrift += pts;
      this.roundScore += pts;
      this.credit(r.ownerId, pts);
    }
    if (sp < NEAR_MISS_SPEED || r.nearCool > 0 || this.phase !== "chase")
      return;
    for (const c of this.cops()) {
      const d = Math.hypot(c.body.x - r.body.x, c.body.z - r.body.z);
      if (d < NEAR_MISS_DIST + 2.5 && r.impact < 1 && shapeGap(carShape(c.body, c.vehicle), carShape(r.body, r.vehicle)) > 0.3) {
        this.roundNear++;
        this.roundScore += 500;
        this.credit(r.ownerId, 500);
        r.nearCool = 1.6;
        this.heat += 3;
        this.emit("near", "NEAR MISS +500", r.id);
        break;
      }
    }
  }
  viewBase() {
    return {
      cars: this.cars.map((c) => {
        const b = c.body;
        return {
          id: c.id,
          ownerId: c.ownerId,
          name: c.name,
          role: c.role,
          vehicle: c.vehicle.id,
          x: b.x,
          z: b.z,
          h: b.h,
          vx: b.vx,
          vz: b.vz,
          speed: speedOf(b),
          drift: lateralSpeed(b),
          tunnels: b.tunnels,
          y: b.y,
          vy: b.vy,
          airborne: b.airborne,
          landing: b.landing,
          landings: b.landings,
          braking: b.braking,
          boosting: b.boosting,
          stun: b.stun,
          boost: b.boostFuel,
          human: c.human,
          impact: c.impact,
          ghost: false,
          gadgets: undefined,
          yaw: b.yaw,
          slide: b.drift ?? 0,
          slip: b.slip ?? 0,
          wheels: b.wheels ?? 0,
          engineOff: !!b.engineOff,
          radar: c.role === "robber" ? true : undefined
        };
      }),
      standings: [...this.standings.values()].filter((s) => this.participants.some((p) => p.id === s.id)).sort((a, b) => b.score - a.score)
    };
  }
  view(viewerId, base = this.viewBase()) {
    const robberView = viewerId === undefined || viewerId === this.robberId || !this.cars.some((c) => c.ownerId === viewerId);
    const showRobber = robberView || this.seen || this.phase === "waiting" || this.phase === "intro" || this.phase === "end";
    const viewer = viewerId === undefined ? undefined : this.carOf(viewerId);
    const cars = [];
    for (let index = 0;index < this.cars.length; index++) {
      const c = this.cars[index];
      const ownSight = !showRobber && c.role === "robber" && viewer?.role === "cop" && this.inView(viewer, c);
      const hidden = c.role === "robber" && !showRobber && !ownSight;
      if (hidden && !this.lastSeen)
        continue;
      let view = base.cars[index];
      if (hidden)
        view = { ...view, tunnels: 0, x: this.lastSeen.x, z: this.lastSeen.z, h: this.lastSeenH, y: 0, vy: 0, airborne: false, landing: 0, landings: 0, braking: false, boosting: false, vx: 0, vz: 0, speed: 0, drift: 0, stun: 0, boost: 0, impact: 0, ghost: true, yaw: 0, slide: 0, slip: 0, wheels: 0, engineOff: false, radar: false };
      else if (ownSight)
        view = { ...view, radar: false };
      if (viewerId === undefined || viewerId === c.ownerId)
        view = { ...view, gadgets: c.gadgets.map((g, i) => ({ ...g, ready: this.gadgetReady(c, i) })) };
      cars.push(view);
    }
    const props = [];
    for (const p of this.props) {
      if (viewer?.role === "robber" && p.kind === "spike" && Math.hypot(p.x - viewer.body.x, p.z - viewer.body.z) > SPIKE_SPOT_RANGE)
        continue;
      if (viewer?.role === "cop" && !p.revealed)
        continue;
      props.push({ id: p.id, kind: p.kind, x: p.x, z: p.z, h: p.h, r: p.r, life: p.life, ttl: p.ttl });
    }
    const standings = base.standings;
    return {
      t: this.t,
      round: this.round,
      phase: this.phase,
      phaseT: this.phaseT,
      robberId: this.robberId,
      site: this.site,
      exit: this.exit,
      heat: this.heat,
      stars: this.stars,
      loot: this.loot,
      seen: this.seen,
      lastSeen: this.lastSeen,
      bust: this.bust,
      boxed: this.boxed,
      busted: this.busted,
      escaped: this.escaped,
      extract: this.extract / EXTRACT_SECONDS,
      exitOpenIn: this.exitOpenIn(),
      survived: this.survived,
      tip: this.tip,
      ...robberView && this.phase === "chase" ? { repair: this.repair / REPAIR_SECONDS, shopCool: [...this.shopCool] } : {},
      best: this.best,
      bestName: this.bestName,
      newBest: this.newBest,
      timeLeft: Math.max(0, ROUND_SECONDS + INTRO_SECONDS + HEAD_START_SECONDS - this.t),
      roundScore: { drift: Math.round(this.roundDrift), nearMisses: this.roundNear, score: Math.round(this.roundScore) },
      standings,
      heli: { ...this.heli },
      cars,
      props
    };
  }
  exitOpenIn() {
    if (this.phase === "intro" || this.phase === "headstart")
      return EXTRACT_OPEN_SECONDS;
    if (this.phase === "end")
      return 0;
    return Math.max(0, EXTRACT_OPEN_SECONDS - this.phaseT);
  }
  copTarget(car) {
    const r = this.robber();
    if (!r)
      return null;
    if (this.seen || car && this.phase === "chase" && isDark(r.body) && this.onScreen(car, r))
      return { x: r.body.x, z: r.body.z, visible: true };
    if (this.lastSeen && this.t - this.lastSeen.t < 10) {
      const p = this.lastSeen;
      if (Math.abs(p.z - TUNNEL.z) < TUNNEL.half) {
        if (p.x > TUNNEL.eastMouth - 12 && Math.sin(this.lastSeenH) > 0.5)
          return { x: 0, z: TUNNEL.z, visible: false };
        if (p.x < TUNNEL.westMouth + 12 && Math.sin(this.lastSeenH) < -0.5)
          return { x: this.city.max - 8, z: TUNNEL.z, visible: false };
      }
      return { x: p.x, z: p.z, visible: false };
    }
    return { ...this.heliSearch(car ? 2 + car.id * 2.4 : 0), visible: false };
  }
}
var IMPACT_EVENT = 6;
var IMPACT_COOLDOWN = 0.3;

// src/game/interp.ts
function lerpAngle(a, b, t) {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * t;
}
function lerpView(a, b, t) {
  if (a.round !== b.round)
    return b;
  const prev = new Map(a.cars.map((c) => [c.id, c]));
  const cars = b.cars.map((c) => {
    const p = prev.get(c.id);
    if (!p || p.ghost !== c.ghost || p.tunnels !== c.tunnels || Math.hypot(p.x - c.x, p.z - c.z) > 25)
      return c;
    return { ...c, y: (p.y ?? 0) + ((c.y ?? 0) - (p.y ?? 0)) * t, vy: (p.vy ?? 0) + ((c.vy ?? 0) - (p.vy ?? 0)) * t, x: p.x + (c.x - p.x) * t, z: p.z + (c.z - p.z) * t, h: lerpAngle(p.h, c.h, t), vx: p.vx + (c.vx - p.vx) * t, vz: p.vz + (c.vz - p.vz) * t };
  });
  const h = b.heli;
  const ph = a.heli;
  const heli = ph.active && h.active ? { ...h, x: ph.x + (h.x - ph.x) * t, y: ph.y + (h.y - ph.y) * t, z: ph.z + (h.z - ph.z) * t, sx: ph.sx + (h.sx - ph.sx) * t, sz: ph.sz + (h.sz - ph.sz) * t, h: lerpAngle(ph.h, h.h, t) } : h;
  return { ...b, cars, heli };
}

// src/game/session.ts
class LocalSession {
  myId = "me";
  room = null;
  world;
  acc = 0;
  participants;
  prev;
  curr;
  frozen = false;
  freezeAt = -1;
  stageInput = null;
  peaceful;
  following = false;
  constructor(name, picks, seed = 7) {
    const q = new URLSearchParams(location.search);
    const requestedSeed = Number(q.get("seed"));
    if (q.has("seed") && Number.isFinite(requestedSeed))
      seed = requestedSeed >>> 0;
    this.peaceful = true;
    if (this.peaceful)
      Math.random = mulberry32(seed);
    this.participants = [{ id: this.myId, name, human: true, picks }];
    this.world = new World(seed, this.participants);
    if (this.peaceful) {
      this.world.phase = "waiting";
      this.world.robberId = this.myId;
      this.world.heli.active = false;
      const car = this.world.carOf(this.myId);
      car.role = "robber";
      car.vehicle = VEHICLE_BY_ID.get(picks.robber);
      Object.assign(car.body, { x: this.world.site.x, z: this.world.site.z - 10, h: 0 });
    }
    this.curr = this.snapshot();
    this.prev = this.curr;
    if (false) {}
  }
  get city() {
    return this.world.city;
  }
  update(dt, input) {
    if (this.following)
      return this.curr;
    if (this.freezeAt >= 0 && this.world.t - 45 >= this.freezeAt)
      this.frozen = true;
    if (this.frozen)
      return this.curr;
    this.world.setInput(this.myId, this.stageInput ?? input);
    this.acc = Math.min(this.acc + dt, 0.25);
    while (this.acc >= DT) {
      this.world.step(DT);
      this.acc -= DT;
      this.prev = this.curr;
      this.curr = this.snapshot();
    }
    return lerpView(this.prev, this.curr, this.acc / DT);
  }
  snapshot() {
    const view = this.world.view(this.myId);
    if (this.peaceful)
      Object.assign(view, { phase: "chase", phaseT: this.world.t, survived: this.world.t });
    return view;
  }
  syncView(view) {
    const mine = view.cars.find((c) => c.ownerId === this.myId);
    const car = this.world.carOf(this.myId);
    if (mine && car)
      Object.assign(car.body, { x: mine.x, z: mine.z, vx: mine.vx, vz: mine.vz, h: mine.h, yaw: mine.yaw });
    this.world.t = view.t;
    this.acc = 0;
    this.following = true;
    this.curr = this.prev = view;
  }
  syncCar(pose) {
    if (!Object.values(pose).every(Number.isFinite))
      return;
    const car = this.world.carOf(this.myId);
    if (!car)
      return;
    const { x, z, vx, vz, h, yaw, speed } = pose;
    Object.assign(car.body, { x, z, vx, vz, h, yaw });
    this.following = true;
    this.acc = 0;
    this.curr = this.prev = this.snapshot();
    const mine = this.curr.cars.find((c) => c.ownerId === this.myId);
    if (mine)
      mine.speed = speed;
  }
  drainEvents() {
    return this.world.drainEvents().filter((e) => e.to === undefined || e.to === this.myId);
  }
  players() {
    return this.participants.map((p) => ({ id: p.id, name: p.name, human: p.human }));
  }
  close() {}
  status() {
    return "solo";
  }
  syncBench() {
    this.stageInput = null;
    this.acc = 0;
    this.frozen = false;
    this.following = false;
    this.curr = this.prev = this.snapshot();
  }
}
// src/ui/dom.ts
var textCache = new WeakMap;
var styleCache = new WeakMap;
function h(tag, cls = "", parent2, html) {
  const el = document.createElement(tag);
  if (cls)
    el.className = cls;
  if (html !== undefined)
    el.innerHTML = html;
  parent2?.appendChild(el);
  return el;
}
function text(el, s) {
  if (textCache.get(el) === s)
    return;
  textCache.set(el, s);
  el.textContent = s;
}
function style(el, prop, v) {
  let m = styleCache.get(el);
  if (!m)
    styleCache.set(el, m = new Map);
  if (m.get(prop) === v)
    return;
  m.set(prop, v);
  el.style.setProperty(prop, v);
}
function show(el, on) {
  if (el.classList.contains("off") === !on)
    return;
  el.classList.toggle("off", !on);
}
function flag(el, cls, on) {
  if (el.classList.contains(cls) !== on)
    el.classList.toggle(cls, on);
}
function attr(el, name, v) {
  if (el.getAttribute(name) !== v)
    el.setAttribute(name, v);
}
var esc = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// src/ui/minimap.ts
var SIZE = 196;
var RANGE = 150;
var PX = 2;
var MARGIN = 40;

class Minimap {
  city;
  el;
  canvas;
  g;
  base;
  ox;
  oz;
  t = 0;
  constructor(parent2, city) {
    this.city = city;
    this.el = document.createElement("div");
    this.el.className = "h-map";
    this.canvas = document.createElement("canvas");
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.canvas.width = this.canvas.height = SIZE * dpr;
    this.canvas.style.width = this.canvas.style.height = `${SIZE}px`;
    this.el.appendChild(this.canvas);
    parent2.appendChild(this.el);
    this.g = this.canvas.getContext("2d");
    this.g.scale(dpr, dpr);
    this.ox = -MARGIN;
    this.oz = -MARGIN;
    this.base = this.paintBase();
  }
  paintBase() {
    const c = this.city;
    const w = (c.max + MARGIN * 2) * PX;
    const hgt = (c.waterZ + 60 + MARGIN) * PX;
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = hgt;
    const g = cv.getContext("2d");
    const X = (x) => (x - this.ox) * PX;
    const Z = (z) => (z - this.oz) * PX;
    g.fillStyle = "#151a26";
    g.fillRect(0, 0, w, hgt);
    g.fillStyle = "#0b1a2a";
    g.fillRect(0, Z(c.waterZ), w, hgt);
    g.fillStyle = "#3a4256";
    g.fillRect(X(-8), Z(-8), (c.max + 8) * PX, (c.waterZ + 8) * PX);
    for (const p of c.parks) {
      g.fillStyle = "#1d3324";
      g.fillRect(X(p.x0), Z(p.z0), (p.x1 - p.x0) * PX, (p.z1 - p.z0) * PX);
    }
    for (const b of c.boxes) {
      if (b.kind === "wall")
        continue;
      g.fillStyle = b.kind === "special" ? "#2a3142" : "#1b2030";
      g.fillRect(X(b.x0), Z(b.z0), (b.x1 - b.x0) * PX, (b.z1 - b.z0) * PX);
    }
    return cv;
  }
  update(view, cam, myId, dt) {
    this.t += dt;
    const g = this.g;
    const r = SIZE / 2;
    const scale = r / RANGE;
    const me = view.cars.find((c) => c.ownerId === myId && !c.ghost);
    const cx = me?.x ?? cam.fx;
    const cz = me?.z ?? cam.fz;
    const { fwd, right } = cam.axes();
    const toMap = (x, z) => {
      const dx = x - cx;
      const dz = z - cz;
      return [(dx * right[0] + dz * right[1]) * scale, -(dx * fwd[0] + dz * fwd[1]) * scale];
    };
    g.clearRect(0, 0, SIZE, SIZE);
    g.save();
    g.beginPath();
    g.arc(r, r, r - 1, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = "#151a26";
    g.fillRect(0, 0, SIZE, SIZE);
    g.save();
    g.translate(r, r);
    g.transform(right[0] * scale, -fwd[0] * scale, right[1] * scale, -fwd[1] * scale, 0, 0);
    g.translate(-cx, -cz);
    g.drawImage(this.base, this.ox, this.oz, this.base.width / PX, this.base.height / PX);
    g.restore();
    const iAmCop = me?.role === "cop";
    const robber = view.cars.find((c) => c.ownerId === view.robberId);
    const arrows = [];
    for (const x of [TUNNEL.westMouth, TUNNEL.eastMouth]) {
      const [tx, ty] = toMap(x, TUNNEL.z);
      if (Math.hypot(tx, ty) > r - 12)
        arrows.push({ x, z: TUNNEL.z, color: "#ffc879" });
      else {
        g.fillStyle = "#ffc879";
        g.font = "bold 18px sans-serif";
        g.textAlign = "center";
        g.fillText("↔", r + tx, r + ty + 6);
      }
    }
    const tip = view.tip;
    if (tip && view.phase === "chase") {
      const [tx, ty] = toMap(tip.x, tip.z);
      const age = Math.max(0, view.t - tip.t);
      const fade = Math.max(0.35, 1 - age / 60);
      const fresh = age < 3 ? 0.5 + 0.5 * Math.sin(age * 12) : 0;
      g.fillStyle = `rgba(255, 138, 31, ${(0.1 + 0.1 * fresh) * fade})`;
      g.strokeStyle = `rgba(255, 138, 31, ${0.7 * fade})`;
      g.lineWidth = 1.5;
      g.setLineDash([5, 4]);
      g.beginPath();
      g.arc(r + tx, r + ty, tip.r * scale, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.setLineDash([]);
      if (Math.hypot(tx, ty) - tip.r * scale > r - 6)
        arrows.push({ x: tip.x, z: tip.z, color: `rgba(255, 138, 31, ${0.6 * fade})` });
    }
    if (view.heli?.active) {
      const [hx, hy] = toMap(view.heli.sx, view.heli.sz);
      g.fillStyle = "rgba(200, 220, 255, 0.18)";
      g.beginPath();
      g.arc(r + hx, r + hy, 12 * scale, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = "#ffc93a";
    g.lineWidth = 2.5;
    g.lineCap = "round";
    for (const p of view.props ?? []) {
      if (p.kind !== "spike")
        continue;
      const half = Math.max(p.r, 9);
      const ax = Math.cos(p.h) * half;
      const az = -Math.sin(p.h) * half;
      const [x0, y0] = toMap(p.x - ax, p.z - az);
      const [x1, y1] = toMap(p.x + ax, p.z + az);
      if (Math.hypot(x0 + x1, y0 + y1) / 2 > r - 4)
        continue;
      g.beginPath();
      g.moveTo(r + x0, r + y0);
      g.lineTo(r + x1, r + y1);
      g.stroke();
    }
    g.lineCap = "butt";
    const flats = me && me.ownerId === view.robberId && view.phase === "chase" ? me.wheels ?? 0 : 0;
    let nearest = null;
    let nd = Infinity;
    this.city.shops.forEach((s, i) => {
      const busy = (view.shopCool?.[i] ?? 0) > 0;
      const [x, y] = toMap(s.x, s.z);
      if (flats && !busy) {
        const d = Math.hypot(s.x - cx, s.z - cz);
        if (d < nd) {
          nd = d;
          nearest = s;
        }
      }
      if (Math.hypot(x, y) > r - 6)
        return;
      if (flats && !busy) {
        const pulse = this.t * 1.2 % 1;
        g.strokeStyle = `rgba(79, 240, 200, ${0.7 * (1 - pulse)})`;
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(r + x, r + y, 5 + pulse * 8, 0, Math.PI * 2);
        g.stroke();
      }
      wrench(g, r + x, r + y, flats ? busy ? "rgba(79, 240, 200, 0.35)" : "#4ff0c8" : "rgba(200, 215, 235, 0.7)");
    });
    if (nearest) {
      const n = nearest;
      const [x, y] = toMap(n.x, n.z);
      if (Math.hypot(x, y) > r - 6)
        arrows.push({ x: n.x, z: n.z, color: "#4ff0c8" });
    }
    for (const c of view.cars) {
      if (c === me || c.role !== "cop")
        continue;
      const [x, y] = toMap(c.x, c.z);
      if (Math.hypot(x, y) > r - 4)
        continue;
      dot(g, r + x, r + y, 3.6, "#3d7bff", "rgba(10, 20, 50, 0.9)");
    }
    if (robber && robber !== me && view.phase !== "waiting" && (robber.ghost || robber.radar !== false)) {
      const [x, y] = toMap(robber.x, robber.z);
      const inside = Math.hypot(x, y) < r - 6;
      if (!robber.ghost) {
        if (inside) {
          const pulse = this.t * 1.6 % 1;
          g.strokeStyle = `rgba(255, 138, 31, ${0.8 * (1 - pulse)})`;
          g.lineWidth = 1.5;
          g.beginPath();
          g.arc(r + x, r + y, 4 + pulse * 10, 0, Math.PI * 2);
          g.stroke();
          dot(g, r + x, r + y, 4.5, "#ff8a1f", "#1a0c02");
        } else
          arrows.push({ x: robber.x, z: robber.z, color: "#ff8a1f" });
      } else if (iAmCop) {
        if (inside) {
          g.strokeStyle = "rgba(255, 138, 31, 0.55)";
          g.setLineDash([2, 3]);
          g.lineWidth = 1.2;
          g.beginPath();
          g.arc(r + x, r + y, 7, 0, Math.PI * 2);
          g.stroke();
          g.setLineDash([]);
          g.fillStyle = "rgba(255, 138, 31, 0.55)";
          g.font = "600 9px 'Barlow Condensed', sans-serif";
          g.textAlign = "center";
          g.fillText("?", r + x, r + y + 3);
        } else
          arrows.push({ x: robber.x, z: robber.z, color: "rgba(255, 138, 31, 0.5)" });
      }
    }
    if (me) {
      const a = Math.atan2(Math.sin(me.h) * right[0] + Math.cos(me.h) * right[1], Math.sin(me.h) * fwd[0] + Math.cos(me.h) * fwd[1]);
      g.save();
      g.translate(r, r);
      g.rotate(a);
      g.beginPath();
      g.moveTo(0, -7);
      g.lineTo(5, 5);
      g.lineTo(0, 2.5);
      g.lineTo(-5, 5);
      g.closePath();
      g.fillStyle = "#fff";
      g.strokeStyle = me.role === "robber" && view.phase !== "waiting" ? "#ff8a1f" : "rgba(0,0,0,0.7)";
      g.lineWidth = 1.5;
      g.fill();
      g.stroke();
      g.restore();
    }
    g.restore();
    g.strokeStyle = "rgba(255, 255, 255, 0.22)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(r, r, r - 1, 0, Math.PI * 2);
    g.stroke();
    for (const a of arrows) {
      const [x, y] = toMap(a.x, a.z);
      const ang = Math.atan2(y, x);
      g.save();
      g.translate(r + Math.cos(ang) * (r - 9), r + Math.sin(ang) * (r - 9));
      g.rotate(ang + Math.PI / 2);
      g.beginPath();
      g.moveTo(0, -8);
      g.lineTo(7, 4);
      g.lineTo(-7, 4);
      g.closePath();
      g.fillStyle = a.color;
      g.strokeStyle = "rgba(0,0,0,0.6)";
      g.lineWidth = 1;
      g.fill();
      g.stroke();
      g.restore();
    }
  }
}
function wrench(g, x, y, color) {
  g.save();
  g.translate(x, y);
  g.rotate(-Math.PI / 4);
  g.fillStyle = "rgba(5, 7, 11, 0.75)";
  g.beginPath();
  g.arc(0, 0, 6.5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = color;
  g.fillRect(-1.1, -1, 2.2, 6);
  g.beginPath();
  g.arc(0, -2.6, 2.8, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(5, 7, 11, 1)";
  g.fillRect(-1, -6, 2, 3.2);
  g.restore();
}
function dot(g, x, y, r, fill, stroke) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.strokeStyle = stroke;
  g.lineWidth = 1.5;
  g.fill();
  g.stroke();
}

// src/ui/hud.ts
var RING_R = 38;
var RING_C = 2 * Math.PI * RING_R;
var FLASH_SECONDS = 1.8;
function survival(sec) {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r < 10 ? "0" : ""}${(Math.floor(r * 10) / 10).toFixed(1)}`;
}

class Hud {
  root;
  city;
  el = {};
  ringArc;
  round = -1;
  firstRound = true;
  startBest;
  resultsFor = -1;
  map;
  flashLeft = 0;
  pips = [];
  tireDots = [];
  constructor(root, city) {
    this.root = root;
    this.city = city;
    root.classList.add("hud");
    this.build();
    this.map = new Minimap(root, city);
  }
  build() {
    const r = this.root;
    const e = this.el;
    r.innerHTML = "";
    e.world = h("div", "h-world", r);
    e.ring = h("div", "h-ring off", e.world, `<svg viewBox="0 0 100 100"><circle class="trk" cx="50" cy="50" r="${RING_R}"/><circle class="val" cx="50" cy="50" r="${RING_R}"/></svg><div class="ring-pct"></div>`);
    this.ringArc = e.ring.querySelector(".val");
    e.ringPct = e.ring.querySelector(".ring-pct");
    e.tag = h("div", "h-tag off", e.world, `<span></span>`);
    e.tagName = e.tag.querySelector("span");
    e.clock = h("div", "h-clock off", r, `<div class="c-label"></div><div class="c-time"></div><div class="c-best"></div>`);
    e.cLabel = e.clock.querySelector(".c-label");
    e.cTime = e.clock.querySelector(".c-time");
    e.cBest = e.clock.querySelector(".c-best");
    e.intro = h("div", "h-intro off", r, `<div class="i-line"></div><div class="i-sub"></div>`);
    e.iLine = e.intro.querySelector(".i-line");
    e.iSub = e.intro.querySelector(".i-sub");
    e.keys = h("div", "h-keys off", r, "WASD drive · SPACE drift · SHIFT nitro · H engine");
    e.flash = h("div", "h-flash off", r);
    e.gadget = h("div", "h-gadget off", r, `<div class="g-row"><span class="g-key">Q</span><span class="g-name"></span><span class="g-pips">${"<i></i>".repeat(GADGETS.spike.charges)}</span></div><div class="g-bar"><b></b></div>`);
    e.gName = e.gadget.querySelector(".g-name");
    this.pips = [...e.gadget.querySelectorAll(".g-pips i")];
    e.gFill = e.gadget.querySelector(".g-bar b");
    const tire = (i, x, y) => `<rect class="t-w" data-w="${i}" x="${x}" y="${y}" width="4" height="8" rx="1.5"/>`;
    e.tires = h("div", "h-tires off", r, `<svg viewBox="0 0 24 34"><rect class="t-body" x="5" y="2" width="14" height="30" rx="4"/>${tire(0, 1, 6)}${tire(1, 19, 6)}${tire(2, 1, 21)}${tire(3, 19, 21)}</svg><div class="t-line"></div><div class="t-repair off"><div class="t-rl"></div><div class="g-bar"><b></b></div></div>`);
    this.tireDots = [...e.tires.querySelectorAll(".t-w")];
    e.tLine = e.tires.querySelector(".t-line");
    e.tRepair = e.tires.querySelector(".t-repair");
    e.tRepairLine = e.tires.querySelector(".t-rl");
    e.tFill = e.tires.querySelector(".g-bar b");
    e.end = h("div", "h-end off", r);
    e.wait = h("div", "h-wait off", r, `<div class="w-line">WAITING FOR PLAYERS</div><div class="w-sub">The round starts when a second driver joins</div><div class="w-invite"><span>ROOM</span><b class="w-code"></b><button type="button">COPY INVITE LINK</button></div>`);
    e.wCode = e.wait.querySelector(".w-code");
    e.wCopy = e.wait.querySelector("button");
    e.wCopy.addEventListener("click", () => this.copyInvite(e.wCopy, "COPY INVITE LINK"));
    e.room = h("div", "h-room off", r, `<i class="dot"></i><span class="code"></span><button type="button">COPY INVITE</button>`);
    e.roomCode = e.room.querySelector(".code");
    e.copy = e.room.querySelector("button");
    e.copy.addEventListener("click", () => this.copyInvite(e.copy, "COPY INVITE"));
    e.idle = h("div", "h-idle off", r);
    e.engine = h("div", "h-keys off", r);
    e.engine.style.cssText = "bottom: 8px; animation: none";
  }
  copyInvite(btn, label) {
    const room = this.root.dataset.room;
    if (!room)
      return;
    const url = new URL(location.href);
    url.search = `?r=${room}`;
    navigator.clipboard?.writeText(url.toString()).then(() => {
      text(btn, "LINK COPIED");
      setTimeout(() => text(btn, label), 1500);
    }, () => {});
  }
  update(world, ctx) {
    const view = world;
    const e = this.el;
    const isRobber = ctx.myId === view.robberId;
    const robber = view.cars.find((c) => c.ownerId === view.robberId && !c.ghost);
    const ghost = view.cars.find((c) => c.ghost);
    const robberName = view.cars.find((c) => c.ownerId === view.robberId)?.name ?? view.standings.find((s) => s.id === view.robberId)?.name ?? "the suspect";
    const survived = view.survived ?? (view.phase === "chase" || view.phase === "end" ? Math.max(0, view.t - INTRO_SECONDS - HEAD_START_SECONDS) : 0);
    if (view.round !== this.round) {
      if (this.round >= 0)
        this.firstRound = false;
      this.round = view.round;
      this.startBest = view.best;
      this.resultsFor = -1;
    }
    const phase = view.phase;
    const waiting = phase === "waiting";
    attr(this.root, "class", `hud ${isRobber ? "role-robber" : "role-cop"} phase-${phase}`);
    show(e.wait, waiting);
    if (waiting)
      text(e.wCode, ctx.room ?? "—");
    const chase = view.phase === "chase";
    show(e.clock, chase);
    if (chase) {
      text(e.cLabel, isRobber ? "FREE" : "SUSPECT AT LARGE");
      text(e.cTime, survival(survived));
      const best = view.best ?? 0;
      show(e.cBest, best > 0);
      if (best > 0)
        text(e.cBest, `BEST ${survival(best)}${view.bestName ? ` · ${view.bestName}` : ""}`);
      flag(e.clock, "record", best > 0 && survived > best);
    }
    const pre = view.phase === "intro" || view.phase === "headstart";
    show(e.intro, pre);
    if (pre) {
      text(e.iLine, isRobber ? "DON'T GET CAUGHT" : `CATCH ${robberName.toUpperCase()}`);
      const left = view.phase === "intro" ? INTRO_SECONDS - view.phaseT + HEAD_START_SECONDS : HEAD_START_SECONDS - view.phaseT;
      text(e.iSub, view.phase === "headstart" ? `${isRobber ? "COPS IN" : "YOU ROLL IN"} ${Math.max(1, Math.ceil(left))}` : "");
    }
    show(e.keys, this.firstRound && pre);
    text(e.keys, `WASD drive · SPACE drift · SHIFT nitro · H engine${ctx.room ? " · ENTER chat" : ""}`);
    this.updateGadgets(view, ctx, isRobber);
    const mine = view.cars.find((c) => c.ownerId === ctx.myId && !c.ghost);
    show(e.engine, !!mine?.engineOff && !waiting && view.phase !== "end");
    if (mine?.engineOff)
      text(e.engine, isRobber && mine.speed < DRIVE.darkSpeed ? "ENGINE OFF · DARK" : "ENGINE OFF");
    this.updateWorld(view, ctx, isRobber, robber, ghost);
    this.map.update(view, ctx.cam, ctx.myId, ctx.dt);
    this.updateEnd(view, ctx, robberName, survived);
    const idle = ctx.idleIn ?? null;
    show(e.idle, idle !== null);
    if (idle !== null)
      text(e.idle, `IDLE — PRESS ANY KEY · KICK IN ${idle}`);
    if (ctx.room)
      this.root.dataset.room = ctx.room;
    show(e.room, !!ctx.room && !waiting);
    if (ctx.room) {
      text(e.roomCode, ctx.room);
      const st = ctx.status.toLowerCase();
      attr(e.room, "data-status", /lost|error|closed|offline/.test(st) ? "bad" : /connecting|reconnect/.test(st) ? "pending" : "ok");
      attr(e.room, "title", ctx.status);
    }
  }
  updateGadgets(view, ctx, isRobber) {
    const e = this.el;
    const me = view.cars.find((c) => c.ownerId === ctx.myId && !c.ghost);
    const live = view.phase === "intro" || view.phase === "headstart" || view.phase === "chase";
    const g = !isRobber && live ? me?.gadgets?.[0] : undefined;
    show(e.gadget, !!g);
    if (g) {
      const spec = GADGETS[g.id];
      text(e.gName, g.id === "spike" ? `${spec.name} · POPS A TIRE` : spec.name);
      this.pips.forEach((pip, i) => flag(pip, "used", i >= g.charges));
      const fill = g.cooldown > 0 ? 1 - g.cooldown / spec.cooldown : 1;
      style(e.gFill, "transform", `scaleX(${fill.toFixed(3)})`);
      flag(e.gadget, "dim", !g.ready);
    }
    const wheels = isRobber && live && me ? me.wheels ?? 0 : 0;
    const flats = flatCount(wheels);
    show(e.tires, flats > 0);
    if (flats > 0 && me) {
      this.tireDots.forEach((d, i) => flag(d, "pop", (wheels & 1 << i) !== 0));
      text(e.tLine, flats === 4 ? "ON THE RIMS" : `${flats}/4 FLAT · FIND A GARAGE`);
      flag(e.tires, "rims", flats === 4);
      const shop = shopAt(this.city, me.x, me.z);
      const cool = shop >= 0 ? view.shopCool?.[shop] ?? 0 : 0;
      show(e.tRepair, shop >= 0);
      if (shop >= 0) {
        text(e.tRepairLine, cool > 0 ? `SHOP BUSY · ${Math.ceil(cool)}S` : me.speed >= 2 ? "STOP TO REPAIR" : "REPAIRING");
        flag(e.tRepair, "busy", cool > 0);
        style(e.tFill, "transform", `scaleX(${(cool > 0 ? 0 : Math.min(1, view.repair ?? 0)).toFixed(3)})`);
      }
    }
    const tipped = ctx.events.find((ev) => ev.kind === "tip");
    if (tipped && !ctx.events.some((ev) => ev.kind === "flat"))
      this.flashText(isRobber ? "DISPATCH HAS YOUR AREA" : "DISPATCH TIP · CHECK MAP", isRobber ? "bad" : "");
    const hit = ctx.events.find((ev) => ev.kind === "flat");
    if (hit && live) {
      const n = Number(hit.text.split("|")[0]) || 1;
      if (isRobber)
        this.flashText(n >= 4 ? "ON THE RIMS" : `TIRE POPPED · ${n}/4`, "bad");
      else
        this.flashText(n >= 4 ? "SPIKED! ON THE RIMS" : `SPIKED! ${n}/4 TIRES`, "");
    }
    const fixed = ctx.events.find((ev) => ev.kind === "repair");
    if (fixed && live)
      this.flashText(isRobber ? "TIRES REPAIRED" : "SUSPECT'S TIRES REPAIRED", isRobber ? "good" : "");
    this.flashLeft = live ? Math.max(0, this.flashLeft - ctx.dt) : 0;
    show(e.flash, this.flashLeft > 0);
    if (this.flashLeft > 0)
      style(e.flash, "opacity", Math.min(1, this.flashLeft / 0.5, (FLASH_SECONDS - this.flashLeft) / 0.12).toFixed(3));
  }
  flashText(msg, tone) {
    const e = this.el;
    this.flashLeft = FLASH_SECONDS;
    text(e.flash, msg);
    flag(e.flash, "bad", tone === "bad");
    flag(e.flash, "good", tone === "good");
  }
  updateWorld(view, ctx, isRobber, robber, ghost) {
    const e = this.el;
    const { cam, width: W, height: H } = ctx;
    const busting = !!robber && view.bust > 0.005 && view.phase === "chase";
    show(e.ring, busting);
    if (busting && robber) {
      const p = cam.project(robber.x, 0.6, robber.z, W, H);
      style(e.ring, "transform", `translate3d(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px,0)`);
      attr(this.ringArc, "stroke-dasharray", `${(RING_C * view.bust).toFixed(1)} ${RING_C}`);
      text(e.ringPct, `${Math.round(view.bust * 100)}%`);
    }
    const target = robber ?? ghost;
    const tagOn = !isRobber && !!target && !(target.engineOff && target.radar === false) && (view.phase === "chase" || view.phase === "headstart");
    show(e.tag, tagOn);
    if (tagOn && target) {
      const p = cam.project(target.x, 2.4, target.z, W, H);
      show(e.tag, p[2]);
      style(e.tag, "transform", `translate3d(${p[0].toFixed(1)}px,${(p[1] - (busting ? 50 : 22)).toFixed(1)}px,0)`);
      text(e.tagName, target.ghost ? "LAST SEEN" : target.name);
      flag(e.tag, "ghost", target.ghost);
    }
  }
  updateEnd(view, ctx, robberName, survived) {
    const e = this.el;
    const on = view.phase === "end";
    show(e.end, on);
    if (!on)
      return;
    if (this.resultsFor !== view.round) {
      this.resultsFor = view.round;
      const isRobber = ctx.myId === view.robberId;
      const newBest = view.newBest ?? (survived > 0 && (this.startBest === undefined || survived > this.startBest) && (view.best === undefined || survived >= view.best - 0.05));
      const title = view.escaped ? "GOT AWAY" : "BUSTED";
      const who = isRobber ? "YOU STAYED FREE FOR" : `${esc(robberName.toUpperCase())} STAYED FREE FOR`;
      const rows = [...view.standings].sort((a, b) => (b.best ?? b.score ?? 0) - (a.best ?? a.score ?? 0)).map((s) => `<li class="${s.id === ctx.myId ? "me" : ""}"><span>${esc(s.name)}</span><b>${s.best !== undefined ? s.best > 0 ? survival(s.best) : "—" : Math.round(s.score ?? 0).toLocaleString("en-US")}</b></li>`).join("");
      e.end.innerHTML = `<div class="e-inner">
        <div class="e-main">
          <div class="e-title">${title}</div>
          <div class="e-who">${who}</div>
          <div class="e-time">${survival(survived)}${newBest ? `<span class="e-best">NEW BEST</span>` : ""}</div>
        </div>
        <div class="e-side">
          <ol class="e-rows">${rows}</ol>
          <div class="e-next">NEXT ROUND IN <b></b></div>
        </div>
      </div>`;
      e.endNext = e.end.querySelector(".e-next b");
    }
    text(e.endNext, String(Math.max(0, Math.ceil(END_SECONDS - view.phaseT))));
  }
}
// ../../node_modules/wgpu-matrix/dist/3.x/wgpu-matrix.module.js
function wrapConstructor(OriginalConstructor, modifier) {
  return class extends OriginalConstructor {
    constructor(...args) {
      super(...args);
      modifier(this);
    }
  };
}
var ZeroArray = wrapConstructor(Array, (a) => a.fill(0));
var EPSILON = 0.000001;
function getAPIImpl$5(Ctor) {
  function create(x = 0, y = 0) {
    const newDst = new Ctor(2);
    if (x !== undefined) {
      newDst[0] = x;
      if (y !== undefined) {
        newDst[1] = y;
      }
    }
    return newDst;
  }
  const fromValues = create;
  function set(x, y, dst) {
    const newDst = dst ?? new Ctor(2);
    newDst[0] = x;
    newDst[1] = y;
    return newDst;
  }
  function ceil(v, dst) {
    const newDst = dst ?? new Ctor(2);
    newDst[0] = Math.ceil(v[0]);
    newDst[1] = Math.ceil(v[1]);
    return newDst;
  }
  function floor(v, dst) {
    const newDst = dst ?? new Ctor(2);
    newDst[0] = Math.floor(v[0]);
    newDst[1] = Math.floor(v[1]);
    return newDst;
  }
  function round(v, dst) {
    const newDst = dst ?? new Ctor(2);
    newDst[0] = Math.round(v[0]);
    newDst[1] = Math.round(v[1]);
    return newDst;
  }
  function clamp(v, min = 0, max = 1, dst) {
    const newDst = dst ?? new Ctor(2);
    newDst[0] = Math.min(max, Math.max(min, v[0]));
    newDst[1] = Math.min(max, Math.max(min, v[1]));
    return newDst;
  }
  function add(a, b, dst) {
    const newDst = dst ?? new Ctor(2);
    newDst[0] = a[0] + b[0];
    newDst[1] = a[1] + b[1];
    return newDst;
  }
  function addScaled(a, b, scale, dst) {
    const newDst = dst ?? new Ctor(2);
    newDst[0] = a[0] + b[0] * scale;
    newDst[1] = a[1] + b[1] * scale;
    return newDst;
  }
  function angle(a, b) {
    const ax = a[0];
    const ay = a[1];
    const bx = b[0];
    const by = b[1];
    const mag1 = Math.sqrt(ax * ax + ay * ay);
    const mag2 = Math.sqrt(bx * bx + by * by);
    const mag = mag1 * mag2;
    const cosine = mag && dot(a, b) / mag;
    return Math.acos(cosine);
  }
  function subtract(a, b, dst) {
    const newDst = dst ?? new Ctor(2);
    newDst[0] = a[0] - b[0];
    newDst[1] = a[1] - b[1];
    return newDst;
  }
  const sub = subtract;
  function equalsApproximately(a, b) {
    return Math.abs(a[0] - b[0]) < EPSILON && Math.abs(a[1] - b[1]) < EPSILON;
  }
  function equals(a, b) {
    return a[0] === b[0] && a[1] === b[1];
  }
  function lerp(a, b, t, dst) {
    const newDst = dst ?? new Ctor(2);
    newDst[0] = a[0] + t * (b[0] - a[0]);
    newDst[1] = a[1] + t * (b[1] - a[1]);
    return newDst;
  }
  function lerpV(a, b, t, dst) {
    const newDst = dst ?? new Ctor(2);
    newDst[0] = a[0] + t[0] * (b[0] - a[0]);
    newDst[1] = a[1] + t[1] * (b[1] - a[1]);
    return newDst;
  }
  function max(a, b, dst) {
    const newDst = dst ?? new Ctor(2);
    newDst[0] = Math.max(a[0], b[0]);
    newDst[1] = Math.max(a[1], b[1]);
    return newDst;
  }
  function min(a, b, dst) {
    const newDst = dst ?? new Ctor(2);
    newDst[0] = Math.min(a[0], b[0]);
    newDst[1] = Math.min(a[1], b[1]);
    return newDst;
  }
  function mulScalar(v, k, dst) {
    const newDst = dst ?? new Ctor(2);
    newDst[0] = v[0] * k;
    newDst[1] = v[1] * k;
    return newDst;
  }
  const scale = mulScalar;
  function divScalar(v, k, dst) {
    const newDst = dst ?? new Ctor(2);
    newDst[0] = v[0] / k;
    newDst[1] = v[1] / k;
    return newDst;
  }
  function inverse(v, dst) {
    const newDst = dst ?? new Ctor(2);
    newDst[0] = 1 / v[0];
    newDst[1] = 1 / v[1];
    return newDst;
  }
  const invert = inverse;
  function cross(a, b, dst) {
    const newDst = dst ?? new Ctor(3);
    const z = a[0] * b[1] - a[1] * b[0];
    newDst[0] = 0;
    newDst[1] = 0;
    newDst[2] = z;
    return newDst;
  }
  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1];
  }
  function length(v) {
    const v0 = v[0];
    const v1 = v[1];
    return Math.sqrt(v0 * v0 + v1 * v1);
  }
  const len = length;
  function lengthSq(v) {
    const v0 = v[0];
    const v1 = v[1];
    return v0 * v0 + v1 * v1;
  }
  const lenSq = lengthSq;
  function distance(a, b) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    return Math.sqrt(dx * dx + dy * dy);
  }
  const dist = distance;
  function distanceSq(a, b) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    return dx * dx + dy * dy;
  }
  const distSq = distanceSq;
  function normalize(v, dst) {
    const newDst = dst ?? new Ctor(2);
    const v0 = v[0];
    const v1 = v[1];
    const lenSq = v0 * v0 + v1 * v1;
    const scale = lenSq > 0 ? 1 / Math.sqrt(lenSq) : 1;
    newDst[0] = v0 * scale;
    newDst[1] = v1 * scale;
    return newDst;
  }
  function negate(v, dst) {
    const newDst = dst ?? new Ctor(2);
    newDst[0] = -v[0];
    newDst[1] = -v[1];
    return newDst;
  }
  function copy(v, dst) {
    const newDst = dst ?? new Ctor(2);
    newDst[0] = v[0];
    newDst[1] = v[1];
    return newDst;
  }
  const clone = copy;
  function multiply(a, b, dst) {
    const newDst = dst ?? new Ctor(2);
    newDst[0] = a[0] * b[0];
    newDst[1] = a[1] * b[1];
    return newDst;
  }
  const mul = multiply;
  function divide(a, b, dst) {
    const newDst = dst ?? new Ctor(2);
    newDst[0] = a[0] / b[0];
    newDst[1] = a[1] / b[1];
    return newDst;
  }
  const div = divide;
  function random(scale = 1, dst) {
    const newDst = dst ?? new Ctor(2);
    const angle = Math.random() * 2 * Math.PI;
    newDst[0] = Math.cos(angle) * scale;
    newDst[1] = Math.sin(angle) * scale;
    return newDst;
  }
  function zero(dst) {
    const newDst = dst ?? new Ctor(2);
    newDst[0] = 0;
    newDst[1] = 0;
    return newDst;
  }
  function transformMat4(v, m, dst) {
    const newDst = dst ?? new Ctor(2);
    const x = v[0];
    const y = v[1];
    newDst[0] = x * m[0] + y * m[4] + m[12];
    newDst[1] = x * m[1] + y * m[5] + m[13];
    return newDst;
  }
  function transformMat3(v, m, dst) {
    const newDst = dst ?? new Ctor(2);
    const x = v[0];
    const y = v[1];
    newDst[0] = m[0] * x + m[4] * y + m[8];
    newDst[1] = m[1] * x + m[5] * y + m[9];
    return newDst;
  }
  function rotate(a, b, rad, dst) {
    const newDst = dst ?? new Ctor(2);
    const p0 = a[0] - b[0];
    const p1 = a[1] - b[1];
    const sinC = Math.sin(rad);
    const cosC = Math.cos(rad);
    newDst[0] = p0 * cosC - p1 * sinC + b[0];
    newDst[1] = p0 * sinC + p1 * cosC + b[1];
    return newDst;
  }
  function setLength(a, len, dst) {
    const newDst = dst ?? new Ctor(2);
    normalize(a, newDst);
    return mulScalar(newDst, len, newDst);
  }
  function truncate(a, maxLen, dst) {
    const newDst = dst ?? new Ctor(2);
    if (length(a) > maxLen) {
      return setLength(a, maxLen, newDst);
    }
    return copy(a, newDst);
  }
  function midpoint(a, b, dst) {
    const newDst = dst ?? new Ctor(2);
    return lerp(a, b, 0.5, newDst);
  }
  return {
    create,
    fromValues,
    set,
    ceil,
    floor,
    round,
    clamp,
    add,
    addScaled,
    angle,
    subtract,
    sub,
    equalsApproximately,
    equals,
    lerp,
    lerpV,
    max,
    min,
    mulScalar,
    scale,
    divScalar,
    inverse,
    invert,
    cross,
    dot,
    length,
    len,
    lengthSq,
    lenSq,
    distance,
    dist,
    distanceSq,
    distSq,
    normalize,
    negate,
    copy,
    clone,
    multiply,
    mul,
    divide,
    div,
    random,
    zero,
    transformMat4,
    transformMat3,
    rotate,
    setLength,
    truncate,
    midpoint
  };
}
var cache$5 = new Map;
function getAPI$5(Ctor) {
  let api = cache$5.get(Ctor);
  if (!api) {
    api = getAPIImpl$5(Ctor);
    cache$5.set(Ctor, api);
  }
  return api;
}
function getAPIImpl$4(Ctor) {
  function create(x, y, z) {
    const newDst = new Ctor(3);
    if (x !== undefined) {
      newDst[0] = x;
      if (y !== undefined) {
        newDst[1] = y;
        if (z !== undefined) {
          newDst[2] = z;
        }
      }
    }
    return newDst;
  }
  const fromValues = create;
  function set(x, y, z, dst) {
    const newDst = dst ?? new Ctor(3);
    newDst[0] = x;
    newDst[1] = y;
    newDst[2] = z;
    return newDst;
  }
  function ceil(v, dst) {
    const newDst = dst ?? new Ctor(3);
    newDst[0] = Math.ceil(v[0]);
    newDst[1] = Math.ceil(v[1]);
    newDst[2] = Math.ceil(v[2]);
    return newDst;
  }
  function floor(v, dst) {
    const newDst = dst ?? new Ctor(3);
    newDst[0] = Math.floor(v[0]);
    newDst[1] = Math.floor(v[1]);
    newDst[2] = Math.floor(v[2]);
    return newDst;
  }
  function round(v, dst) {
    const newDst = dst ?? new Ctor(3);
    newDst[0] = Math.round(v[0]);
    newDst[1] = Math.round(v[1]);
    newDst[2] = Math.round(v[2]);
    return newDst;
  }
  function clamp(v, min = 0, max = 1, dst) {
    const newDst = dst ?? new Ctor(3);
    newDst[0] = Math.min(max, Math.max(min, v[0]));
    newDst[1] = Math.min(max, Math.max(min, v[1]));
    newDst[2] = Math.min(max, Math.max(min, v[2]));
    return newDst;
  }
  function add(a, b, dst) {
    const newDst = dst ?? new Ctor(3);
    newDst[0] = a[0] + b[0];
    newDst[1] = a[1] + b[1];
    newDst[2] = a[2] + b[2];
    return newDst;
  }
  function addScaled(a, b, scale, dst) {
    const newDst = dst ?? new Ctor(3);
    newDst[0] = a[0] + b[0] * scale;
    newDst[1] = a[1] + b[1] * scale;
    newDst[2] = a[2] + b[2] * scale;
    return newDst;
  }
  function angle(a, b) {
    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    const bx = b[0];
    const by = b[1];
    const bz = b[2];
    const mag1 = Math.sqrt(ax * ax + ay * ay + az * az);
    const mag2 = Math.sqrt(bx * bx + by * by + bz * bz);
    const mag = mag1 * mag2;
    const cosine = mag && dot(a, b) / mag;
    return Math.acos(cosine);
  }
  function subtract(a, b, dst) {
    const newDst = dst ?? new Ctor(3);
    newDst[0] = a[0] - b[0];
    newDst[1] = a[1] - b[1];
    newDst[2] = a[2] - b[2];
    return newDst;
  }
  const sub = subtract;
  function equalsApproximately(a, b) {
    return Math.abs(a[0] - b[0]) < EPSILON && Math.abs(a[1] - b[1]) < EPSILON && Math.abs(a[2] - b[2]) < EPSILON;
  }
  function equals(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  }
  function lerp(a, b, t, dst) {
    const newDst = dst ?? new Ctor(3);
    newDst[0] = a[0] + t * (b[0] - a[0]);
    newDst[1] = a[1] + t * (b[1] - a[1]);
    newDst[2] = a[2] + t * (b[2] - a[2]);
    return newDst;
  }
  function lerpV(a, b, t, dst) {
    const newDst = dst ?? new Ctor(3);
    newDst[0] = a[0] + t[0] * (b[0] - a[0]);
    newDst[1] = a[1] + t[1] * (b[1] - a[1]);
    newDst[2] = a[2] + t[2] * (b[2] - a[2]);
    return newDst;
  }
  function max(a, b, dst) {
    const newDst = dst ?? new Ctor(3);
    newDst[0] = Math.max(a[0], b[0]);
    newDst[1] = Math.max(a[1], b[1]);
    newDst[2] = Math.max(a[2], b[2]);
    return newDst;
  }
  function min(a, b, dst) {
    const newDst = dst ?? new Ctor(3);
    newDst[0] = Math.min(a[0], b[0]);
    newDst[1] = Math.min(a[1], b[1]);
    newDst[2] = Math.min(a[2], b[2]);
    return newDst;
  }
  function mulScalar(v, k, dst) {
    const newDst = dst ?? new Ctor(3);
    newDst[0] = v[0] * k;
    newDst[1] = v[1] * k;
    newDst[2] = v[2] * k;
    return newDst;
  }
  const scale = mulScalar;
  function divScalar(v, k, dst) {
    const newDst = dst ?? new Ctor(3);
    newDst[0] = v[0] / k;
    newDst[1] = v[1] / k;
    newDst[2] = v[2] / k;
    return newDst;
  }
  function inverse(v, dst) {
    const newDst = dst ?? new Ctor(3);
    newDst[0] = 1 / v[0];
    newDst[1] = 1 / v[1];
    newDst[2] = 1 / v[2];
    return newDst;
  }
  const invert = inverse;
  function cross(a, b, dst) {
    const newDst = dst ?? new Ctor(3);
    const t1 = a[2] * b[0] - a[0] * b[2];
    const t2 = a[0] * b[1] - a[1] * b[0];
    newDst[0] = a[1] * b[2] - a[2] * b[1];
    newDst[1] = t1;
    newDst[2] = t2;
    return newDst;
  }
  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }
  function length(v) {
    const v0 = v[0];
    const v1 = v[1];
    const v2 = v[2];
    return Math.sqrt(v0 * v0 + v1 * v1 + v2 * v2);
  }
  const len = length;
  function lengthSq(v) {
    const v0 = v[0];
    const v1 = v[1];
    const v2 = v[2];
    return v0 * v0 + v1 * v1 + v2 * v2;
  }
  const lenSq = lengthSq;
  function distance(a, b) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  const dist = distance;
  function distanceSq(a, b) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return dx * dx + dy * dy + dz * dz;
  }
  const distSq = distanceSq;
  function normalize(v, dst) {
    const newDst = dst ?? new Ctor(3);
    const v0 = v[0];
    const v1 = v[1];
    const v2 = v[2];
    const lenSq = v0 * v0 + v1 * v1 + v2 * v2;
    const scale = lenSq > 0 ? 1 / Math.sqrt(lenSq) : 1;
    newDst[0] = v0 * scale;
    newDst[1] = v1 * scale;
    newDst[2] = v2 * scale;
    return newDst;
  }
  function negate(v, dst) {
    const newDst = dst ?? new Ctor(3);
    newDst[0] = -v[0];
    newDst[1] = -v[1];
    newDst[2] = -v[2];
    return newDst;
  }
  function copy(v, dst) {
    const newDst = dst ?? new Ctor(3);
    newDst[0] = v[0];
    newDst[1] = v[1];
    newDst[2] = v[2];
    return newDst;
  }
  const clone = copy;
  function multiply(a, b, dst) {
    const newDst = dst ?? new Ctor(3);
    newDst[0] = a[0] * b[0];
    newDst[1] = a[1] * b[1];
    newDst[2] = a[2] * b[2];
    return newDst;
  }
  const mul = multiply;
  function divide(a, b, dst) {
    const newDst = dst ?? new Ctor(3);
    newDst[0] = a[0] / b[0];
    newDst[1] = a[1] / b[1];
    newDst[2] = a[2] / b[2];
    return newDst;
  }
  const div = divide;
  function random(scale = 1, dst) {
    const newDst = dst ?? new Ctor(3);
    const angle = Math.random() * 2 * Math.PI;
    const z = Math.random() * 2 - 1;
    const zScale = Math.sqrt(1 - z * z) * scale;
    newDst[0] = Math.cos(angle) * zScale;
    newDst[1] = Math.sin(angle) * zScale;
    newDst[2] = z * scale;
    return newDst;
  }
  function zero(dst) {
    const newDst = dst ?? new Ctor(3);
    newDst[0] = 0;
    newDst[1] = 0;
    newDst[2] = 0;
    return newDst;
  }
  function transformMat4(v, m, dst) {
    const newDst = dst ?? new Ctor(3);
    const x = v[0];
    const y = v[1];
    const z = v[2];
    const w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1;
    newDst[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
    newDst[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
    newDst[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
    return newDst;
  }
  function transformMat4Upper3x3(v, m, dst) {
    const newDst = dst ?? new Ctor(3);
    const v0 = v[0];
    const v1 = v[1];
    const v2 = v[2];
    newDst[0] = v0 * m[0 * 4 + 0] + v1 * m[1 * 4 + 0] + v2 * m[2 * 4 + 0];
    newDst[1] = v0 * m[0 * 4 + 1] + v1 * m[1 * 4 + 1] + v2 * m[2 * 4 + 1];
    newDst[2] = v0 * m[0 * 4 + 2] + v1 * m[1 * 4 + 2] + v2 * m[2 * 4 + 2];
    return newDst;
  }
  function transformMat3(v, m, dst) {
    const newDst = dst ?? new Ctor(3);
    const x = v[0];
    const y = v[1];
    const z = v[2];
    newDst[0] = x * m[0] + y * m[4] + z * m[8];
    newDst[1] = x * m[1] + y * m[5] + z * m[9];
    newDst[2] = x * m[2] + y * m[6] + z * m[10];
    return newDst;
  }
  function transformQuat(v, q, dst) {
    const newDst = dst ?? new Ctor(3);
    const qx = q[0];
    const qy = q[1];
    const qz = q[2];
    const w2 = q[3] * 2;
    const x = v[0];
    const y = v[1];
    const z = v[2];
    const uvX = qy * z - qz * y;
    const uvY = qz * x - qx * z;
    const uvZ = qx * y - qy * x;
    newDst[0] = x + uvX * w2 + (qy * uvZ - qz * uvY) * 2;
    newDst[1] = y + uvY * w2 + (qz * uvX - qx * uvZ) * 2;
    newDst[2] = z + uvZ * w2 + (qx * uvY - qy * uvX) * 2;
    return newDst;
  }
  function getTranslation(m, dst) {
    const newDst = dst ?? new Ctor(3);
    newDst[0] = m[12];
    newDst[1] = m[13];
    newDst[2] = m[14];
    return newDst;
  }
  function getAxis(m, axis, dst) {
    const newDst = dst ?? new Ctor(3);
    const off = axis * 4;
    newDst[0] = m[off + 0];
    newDst[1] = m[off + 1];
    newDst[2] = m[off + 2];
    return newDst;
  }
  function getScaling(m, dst) {
    const newDst = dst ?? new Ctor(3);
    const xx = m[0];
    const xy = m[1];
    const xz = m[2];
    const yx = m[4];
    const yy = m[5];
    const yz = m[6];
    const zx = m[8];
    const zy = m[9];
    const zz = m[10];
    newDst[0] = Math.sqrt(xx * xx + xy * xy + xz * xz);
    newDst[1] = Math.sqrt(yx * yx + yy * yy + yz * yz);
    newDst[2] = Math.sqrt(zx * zx + zy * zy + zz * zz);
    return newDst;
  }
  function rotateX(a, b, rad, dst) {
    const newDst = dst ?? new Ctor(3);
    const p = [];
    const r = [];
    p[0] = a[0] - b[0];
    p[1] = a[1] - b[1];
    p[2] = a[2] - b[2];
    r[0] = p[0];
    r[1] = p[1] * Math.cos(rad) - p[2] * Math.sin(rad);
    r[2] = p[1] * Math.sin(rad) + p[2] * Math.cos(rad);
    newDst[0] = r[0] + b[0];
    newDst[1] = r[1] + b[1];
    newDst[2] = r[2] + b[2];
    return newDst;
  }
  function rotateY(a, b, rad, dst) {
    const newDst = dst ?? new Ctor(3);
    const p = [];
    const r = [];
    p[0] = a[0] - b[0];
    p[1] = a[1] - b[1];
    p[2] = a[2] - b[2];
    r[0] = p[2] * Math.sin(rad) + p[0] * Math.cos(rad);
    r[1] = p[1];
    r[2] = p[2] * Math.cos(rad) - p[0] * Math.sin(rad);
    newDst[0] = r[0] + b[0];
    newDst[1] = r[1] + b[1];
    newDst[2] = r[2] + b[2];
    return newDst;
  }
  function rotateZ(a, b, rad, dst) {
    const newDst = dst ?? new Ctor(3);
    const p = [];
    const r = [];
    p[0] = a[0] - b[0];
    p[1] = a[1] - b[1];
    p[2] = a[2] - b[2];
    r[0] = p[0] * Math.cos(rad) - p[1] * Math.sin(rad);
    r[1] = p[0] * Math.sin(rad) + p[1] * Math.cos(rad);
    r[2] = p[2];
    newDst[0] = r[0] + b[0];
    newDst[1] = r[1] + b[1];
    newDst[2] = r[2] + b[2];
    return newDst;
  }
  function setLength(a, len, dst) {
    const newDst = dst ?? new Ctor(3);
    normalize(a, newDst);
    return mulScalar(newDst, len, newDst);
  }
  function truncate(a, maxLen, dst) {
    const newDst = dst ?? new Ctor(3);
    if (length(a) > maxLen) {
      return setLength(a, maxLen, newDst);
    }
    return copy(a, newDst);
  }
  function midpoint(a, b, dst) {
    const newDst = dst ?? new Ctor(3);
    return lerp(a, b, 0.5, newDst);
  }
  return {
    create,
    fromValues,
    set,
    ceil,
    floor,
    round,
    clamp,
    add,
    addScaled,
    angle,
    subtract,
    sub,
    equalsApproximately,
    equals,
    lerp,
    lerpV,
    max,
    min,
    mulScalar,
    scale,
    divScalar,
    inverse,
    invert,
    cross,
    dot,
    length,
    len,
    lengthSq,
    lenSq,
    distance,
    dist,
    distanceSq,
    distSq,
    normalize,
    negate,
    copy,
    clone,
    multiply,
    mul,
    divide,
    div,
    random,
    zero,
    transformMat4,
    transformMat4Upper3x3,
    transformMat3,
    transformQuat,
    getTranslation,
    getAxis,
    getScaling,
    rotateX,
    rotateY,
    rotateZ,
    setLength,
    truncate,
    midpoint
  };
}
var cache$4 = new Map;
function getAPI$4(Ctor) {
  let api = cache$4.get(Ctor);
  if (!api) {
    api = getAPIImpl$4(Ctor);
    cache$4.set(Ctor, api);
  }
  return api;
}
function getAPIImpl$3(Ctor) {
  const vec2 = getAPI$5(Ctor);
  const vec3 = getAPI$4(Ctor);
  function create(v0, v1, v2, v3, v4, v5, v6, v7, v8) {
    const newDst = new Ctor(12);
    newDst[3] = 0;
    newDst[7] = 0;
    newDst[11] = 0;
    if (v0 !== undefined) {
      newDst[0] = v0;
      if (v1 !== undefined) {
        newDst[1] = v1;
        if (v2 !== undefined) {
          newDst[2] = v2;
          if (v3 !== undefined) {
            newDst[4] = v3;
            if (v4 !== undefined) {
              newDst[5] = v4;
              if (v5 !== undefined) {
                newDst[6] = v5;
                if (v6 !== undefined) {
                  newDst[8] = v6;
                  if (v7 !== undefined) {
                    newDst[9] = v7;
                    if (v8 !== undefined) {
                      newDst[10] = v8;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return newDst;
  }
  function set(v0, v1, v2, v3, v4, v5, v6, v7, v8, dst) {
    const newDst = dst ?? new Ctor(12);
    newDst[0] = v0;
    newDst[1] = v1;
    newDst[2] = v2;
    newDst[3] = 0;
    newDst[4] = v3;
    newDst[5] = v4;
    newDst[6] = v5;
    newDst[7] = 0;
    newDst[8] = v6;
    newDst[9] = v7;
    newDst[10] = v8;
    newDst[11] = 0;
    return newDst;
  }
  function fromMat4(m4, dst) {
    const newDst = dst ?? new Ctor(12);
    newDst[0] = m4[0];
    newDst[1] = m4[1];
    newDst[2] = m4[2];
    newDst[3] = 0;
    newDst[4] = m4[4];
    newDst[5] = m4[5];
    newDst[6] = m4[6];
    newDst[7] = 0;
    newDst[8] = m4[8];
    newDst[9] = m4[9];
    newDst[10] = m4[10];
    newDst[11] = 0;
    return newDst;
  }
  function fromQuat(q, dst) {
    const newDst = dst ?? new Ctor(12);
    const x = q[0];
    const y = q[1];
    const z = q[2];
    const w = q[3];
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;
    const xx = x * x2;
    const yx = y * x2;
    const yy = y * y2;
    const zx = z * x2;
    const zy = z * y2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;
    newDst[0] = 1 - yy - zz;
    newDst[1] = yx + wz;
    newDst[2] = zx - wy;
    newDst[3] = 0;
    newDst[4] = yx - wz;
    newDst[5] = 1 - xx - zz;
    newDst[6] = zy + wx;
    newDst[7] = 0;
    newDst[8] = zx + wy;
    newDst[9] = zy - wx;
    newDst[10] = 1 - xx - yy;
    newDst[11] = 0;
    return newDst;
  }
  function negate(m, dst) {
    const newDst = dst ?? new Ctor(12);
    newDst[0] = -m[0];
    newDst[1] = -m[1];
    newDst[2] = -m[2];
    newDst[4] = -m[4];
    newDst[5] = -m[5];
    newDst[6] = -m[6];
    newDst[8] = -m[8];
    newDst[9] = -m[9];
    newDst[10] = -m[10];
    return newDst;
  }
  function multiplyScalar(m, s, dst) {
    const newDst = dst ?? new Ctor(12);
    newDst[0] = m[0] * s;
    newDst[1] = m[1] * s;
    newDst[2] = m[2] * s;
    newDst[4] = m[4] * s;
    newDst[5] = m[5] * s;
    newDst[6] = m[6] * s;
    newDst[8] = m[8] * s;
    newDst[9] = m[9] * s;
    newDst[10] = m[10] * s;
    return newDst;
  }
  const mulScalar = multiplyScalar;
  function add(a, b, dst) {
    const newDst = dst ?? new Ctor(12);
    newDst[0] = a[0] + b[0];
    newDst[1] = a[1] + b[1];
    newDst[2] = a[2] + b[2];
    newDst[4] = a[4] + b[4];
    newDst[5] = a[5] + b[5];
    newDst[6] = a[6] + b[6];
    newDst[8] = a[8] + b[8];
    newDst[9] = a[9] + b[9];
    newDst[10] = a[10] + b[10];
    return newDst;
  }
  function copy(m, dst) {
    const newDst = dst ?? new Ctor(12);
    newDst[0] = m[0];
    newDst[1] = m[1];
    newDst[2] = m[2];
    newDst[4] = m[4];
    newDst[5] = m[5];
    newDst[6] = m[6];
    newDst[8] = m[8];
    newDst[9] = m[9];
    newDst[10] = m[10];
    return newDst;
  }
  const clone = copy;
  function equalsApproximately(a, b) {
    return Math.abs(a[0] - b[0]) < EPSILON && Math.abs(a[1] - b[1]) < EPSILON && Math.abs(a[2] - b[2]) < EPSILON && Math.abs(a[4] - b[4]) < EPSILON && Math.abs(a[5] - b[5]) < EPSILON && Math.abs(a[6] - b[6]) < EPSILON && Math.abs(a[8] - b[8]) < EPSILON && Math.abs(a[9] - b[9]) < EPSILON && Math.abs(a[10] - b[10]) < EPSILON;
  }
  function equals(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[8] === b[8] && a[9] === b[9] && a[10] === b[10];
  }
  function identity(dst) {
    const newDst = dst ?? new Ctor(12);
    newDst[0] = 1;
    newDst[1] = 0;
    newDst[2] = 0;
    newDst[4] = 0;
    newDst[5] = 1;
    newDst[6] = 0;
    newDst[8] = 0;
    newDst[9] = 0;
    newDst[10] = 1;
    return newDst;
  }
  function transpose(m, dst) {
    const newDst = dst ?? new Ctor(12);
    if (newDst === m) {
      let t;
      t = m[1];
      m[1] = m[4];
      m[4] = t;
      t = m[2];
      m[2] = m[8];
      m[8] = t;
      t = m[6];
      m[6] = m[9];
      m[9] = t;
      return newDst;
    }
    const m00 = m[0 * 4 + 0];
    const m01 = m[0 * 4 + 1];
    const m02 = m[0 * 4 + 2];
    const m10 = m[1 * 4 + 0];
    const m11 = m[1 * 4 + 1];
    const m12 = m[1 * 4 + 2];
    const m20 = m[2 * 4 + 0];
    const m21 = m[2 * 4 + 1];
    const m22 = m[2 * 4 + 2];
    newDst[0] = m00;
    newDst[1] = m10;
    newDst[2] = m20;
    newDst[4] = m01;
    newDst[5] = m11;
    newDst[6] = m21;
    newDst[8] = m02;
    newDst[9] = m12;
    newDst[10] = m22;
    return newDst;
  }
  function inverse(m, dst) {
    const newDst = dst ?? new Ctor(12);
    const m00 = m[0 * 4 + 0];
    const m01 = m[0 * 4 + 1];
    const m02 = m[0 * 4 + 2];
    const m10 = m[1 * 4 + 0];
    const m11 = m[1 * 4 + 1];
    const m12 = m[1 * 4 + 2];
    const m20 = m[2 * 4 + 0];
    const m21 = m[2 * 4 + 1];
    const m22 = m[2 * 4 + 2];
    const b01 = m22 * m11 - m12 * m21;
    const b11 = -m22 * m10 + m12 * m20;
    const b21 = m21 * m10 - m11 * m20;
    const invDet = 1 / (m00 * b01 + m01 * b11 + m02 * b21);
    newDst[0] = b01 * invDet;
    newDst[1] = (-m22 * m01 + m02 * m21) * invDet;
    newDst[2] = (m12 * m01 - m02 * m11) * invDet;
    newDst[4] = b11 * invDet;
    newDst[5] = (m22 * m00 - m02 * m20) * invDet;
    newDst[6] = (-m12 * m00 + m02 * m10) * invDet;
    newDst[8] = b21 * invDet;
    newDst[9] = (-m21 * m00 + m01 * m20) * invDet;
    newDst[10] = (m11 * m00 - m01 * m10) * invDet;
    return newDst;
  }
  function determinant(m) {
    const m00 = m[0 * 4 + 0];
    const m01 = m[0 * 4 + 1];
    const m02 = m[0 * 4 + 2];
    const m10 = m[1 * 4 + 0];
    const m11 = m[1 * 4 + 1];
    const m12 = m[1 * 4 + 2];
    const m20 = m[2 * 4 + 0];
    const m21 = m[2 * 4 + 1];
    const m22 = m[2 * 4 + 2];
    return m00 * (m11 * m22 - m21 * m12) - m10 * (m01 * m22 - m21 * m02) + m20 * (m01 * m12 - m11 * m02);
  }
  const invert = inverse;
  function multiply(a, b, dst) {
    const newDst = dst ?? new Ctor(12);
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a10 = a[4 + 0];
    const a11 = a[4 + 1];
    const a12 = a[4 + 2];
    const a20 = a[8 + 0];
    const a21 = a[8 + 1];
    const a22 = a[8 + 2];
    const b00 = b[0];
    const b01 = b[1];
    const b02 = b[2];
    const b10 = b[4 + 0];
    const b11 = b[4 + 1];
    const b12 = b[4 + 2];
    const b20 = b[8 + 0];
    const b21 = b[8 + 1];
    const b22 = b[8 + 2];
    newDst[0] = a00 * b00 + a10 * b01 + a20 * b02;
    newDst[1] = a01 * b00 + a11 * b01 + a21 * b02;
    newDst[2] = a02 * b00 + a12 * b01 + a22 * b02;
    newDst[4] = a00 * b10 + a10 * b11 + a20 * b12;
    newDst[5] = a01 * b10 + a11 * b11 + a21 * b12;
    newDst[6] = a02 * b10 + a12 * b11 + a22 * b12;
    newDst[8] = a00 * b20 + a10 * b21 + a20 * b22;
    newDst[9] = a01 * b20 + a11 * b21 + a21 * b22;
    newDst[10] = a02 * b20 + a12 * b21 + a22 * b22;
    return newDst;
  }
  const mul = multiply;
  function setTranslation(a, v, dst) {
    const newDst = dst ?? identity();
    if (a !== newDst) {
      newDst[0] = a[0];
      newDst[1] = a[1];
      newDst[2] = a[2];
      newDst[4] = a[4];
      newDst[5] = a[5];
      newDst[6] = a[6];
    }
    newDst[8] = v[0];
    newDst[9] = v[1];
    newDst[10] = 1;
    return newDst;
  }
  function getTranslation(m, dst) {
    const newDst = dst ?? vec2.create();
    newDst[0] = m[8];
    newDst[1] = m[9];
    return newDst;
  }
  function getAxis(m, axis, dst) {
    const newDst = dst ?? vec2.create();
    const off = axis * 4;
    newDst[0] = m[off + 0];
    newDst[1] = m[off + 1];
    return newDst;
  }
  function setAxis(m, v, axis, dst) {
    const newDst = dst === m ? m : copy(m, dst);
    const off = axis * 4;
    newDst[off + 0] = v[0];
    newDst[off + 1] = v[1];
    return newDst;
  }
  function getScaling(m, dst) {
    const newDst = dst ?? vec2.create();
    const xx = m[0];
    const xy = m[1];
    const yx = m[4];
    const yy = m[5];
    newDst[0] = Math.sqrt(xx * xx + xy * xy);
    newDst[1] = Math.sqrt(yx * yx + yy * yy);
    return newDst;
  }
  function get3DScaling(m, dst) {
    const newDst = dst ?? vec3.create();
    const xx = m[0];
    const xy = m[1];
    const xz = m[2];
    const yx = m[4];
    const yy = m[5];
    const yz = m[6];
    const zx = m[8];
    const zy = m[9];
    const zz = m[10];
    newDst[0] = Math.sqrt(xx * xx + xy * xy + xz * xz);
    newDst[1] = Math.sqrt(yx * yx + yy * yy + yz * yz);
    newDst[2] = Math.sqrt(zx * zx + zy * zy + zz * zz);
    return newDst;
  }
  function translation(v, dst) {
    const newDst = dst ?? new Ctor(12);
    newDst[0] = 1;
    newDst[1] = 0;
    newDst[2] = 0;
    newDst[4] = 0;
    newDst[5] = 1;
    newDst[6] = 0;
    newDst[8] = v[0];
    newDst[9] = v[1];
    newDst[10] = 1;
    return newDst;
  }
  function translate(m, v, dst) {
    const newDst = dst ?? new Ctor(12);
    const v0 = v[0];
    const v1 = v[1];
    const m00 = m[0];
    const m01 = m[1];
    const m02 = m[2];
    const m10 = m[1 * 4 + 0];
    const m11 = m[1 * 4 + 1];
    const m12 = m[1 * 4 + 2];
    const m20 = m[2 * 4 + 0];
    const m21 = m[2 * 4 + 1];
    const m22 = m[2 * 4 + 2];
    if (m !== newDst) {
      newDst[0] = m00;
      newDst[1] = m01;
      newDst[2] = m02;
      newDst[4] = m10;
      newDst[5] = m11;
      newDst[6] = m12;
    }
    newDst[8] = m00 * v0 + m10 * v1 + m20;
    newDst[9] = m01 * v0 + m11 * v1 + m21;
    newDst[10] = m02 * v0 + m12 * v1 + m22;
    return newDst;
  }
  function rotation(angleInRadians, dst) {
    const newDst = dst ?? new Ctor(12);
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    newDst[0] = c;
    newDst[1] = s;
    newDst[2] = 0;
    newDst[4] = -s;
    newDst[5] = c;
    newDst[6] = 0;
    newDst[8] = 0;
    newDst[9] = 0;
    newDst[10] = 1;
    return newDst;
  }
  function rotate(m, angleInRadians, dst) {
    const newDst = dst ?? new Ctor(12);
    const m00 = m[0 * 4 + 0];
    const m01 = m[0 * 4 + 1];
    const m02 = m[0 * 4 + 2];
    const m10 = m[1 * 4 + 0];
    const m11 = m[1 * 4 + 1];
    const m12 = m[1 * 4 + 2];
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    newDst[0] = c * m00 + s * m10;
    newDst[1] = c * m01 + s * m11;
    newDst[2] = c * m02 + s * m12;
    newDst[4] = c * m10 - s * m00;
    newDst[5] = c * m11 - s * m01;
    newDst[6] = c * m12 - s * m02;
    if (m !== newDst) {
      newDst[8] = m[8];
      newDst[9] = m[9];
      newDst[10] = m[10];
    }
    return newDst;
  }
  function rotationX(angleInRadians, dst) {
    const newDst = dst ?? new Ctor(12);
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    newDst[0] = 1;
    newDst[1] = 0;
    newDst[2] = 0;
    newDst[4] = 0;
    newDst[5] = c;
    newDst[6] = s;
    newDst[8] = 0;
    newDst[9] = -s;
    newDst[10] = c;
    return newDst;
  }
  function rotateX(m, angleInRadians, dst) {
    const newDst = dst ?? new Ctor(12);
    const m10 = m[4];
    const m11 = m[5];
    const m12 = m[6];
    const m20 = m[8];
    const m21 = m[9];
    const m22 = m[10];
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    newDst[4] = c * m10 + s * m20;
    newDst[5] = c * m11 + s * m21;
    newDst[6] = c * m12 + s * m22;
    newDst[8] = c * m20 - s * m10;
    newDst[9] = c * m21 - s * m11;
    newDst[10] = c * m22 - s * m12;
    if (m !== newDst) {
      newDst[0] = m[0];
      newDst[1] = m[1];
      newDst[2] = m[2];
    }
    return newDst;
  }
  function rotationY(angleInRadians, dst) {
    const newDst = dst ?? new Ctor(12);
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    newDst[0] = c;
    newDst[1] = 0;
    newDst[2] = -s;
    newDst[4] = 0;
    newDst[5] = 1;
    newDst[6] = 0;
    newDst[8] = s;
    newDst[9] = 0;
    newDst[10] = c;
    return newDst;
  }
  function rotateY(m, angleInRadians, dst) {
    const newDst = dst ?? new Ctor(12);
    const m00 = m[0 * 4 + 0];
    const m01 = m[0 * 4 + 1];
    const m02 = m[0 * 4 + 2];
    const m20 = m[2 * 4 + 0];
    const m21 = m[2 * 4 + 1];
    const m22 = m[2 * 4 + 2];
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    newDst[0] = c * m00 - s * m20;
    newDst[1] = c * m01 - s * m21;
    newDst[2] = c * m02 - s * m22;
    newDst[8] = c * m20 + s * m00;
    newDst[9] = c * m21 + s * m01;
    newDst[10] = c * m22 + s * m02;
    if (m !== newDst) {
      newDst[4] = m[4];
      newDst[5] = m[5];
      newDst[6] = m[6];
    }
    return newDst;
  }
  const rotationZ = rotation;
  const rotateZ = rotate;
  function scaling(v, dst) {
    const newDst = dst ?? new Ctor(12);
    newDst[0] = v[0];
    newDst[1] = 0;
    newDst[2] = 0;
    newDst[4] = 0;
    newDst[5] = v[1];
    newDst[6] = 0;
    newDst[8] = 0;
    newDst[9] = 0;
    newDst[10] = 1;
    return newDst;
  }
  function scale(m, v, dst) {
    const newDst = dst ?? new Ctor(12);
    const v0 = v[0];
    const v1 = v[1];
    newDst[0] = v0 * m[0 * 4 + 0];
    newDst[1] = v0 * m[0 * 4 + 1];
    newDst[2] = v0 * m[0 * 4 + 2];
    newDst[4] = v1 * m[1 * 4 + 0];
    newDst[5] = v1 * m[1 * 4 + 1];
    newDst[6] = v1 * m[1 * 4 + 2];
    if (m !== newDst) {
      newDst[8] = m[8];
      newDst[9] = m[9];
      newDst[10] = m[10];
    }
    return newDst;
  }
  function scaling3D(v, dst) {
    const newDst = dst ?? new Ctor(12);
    newDst[0] = v[0];
    newDst[1] = 0;
    newDst[2] = 0;
    newDst[4] = 0;
    newDst[5] = v[1];
    newDst[6] = 0;
    newDst[8] = 0;
    newDst[9] = 0;
    newDst[10] = v[2];
    return newDst;
  }
  function scale3D(m, v, dst) {
    const newDst = dst ?? new Ctor(12);
    const v0 = v[0];
    const v1 = v[1];
    const v2 = v[2];
    newDst[0] = v0 * m[0 * 4 + 0];
    newDst[1] = v0 * m[0 * 4 + 1];
    newDst[2] = v0 * m[0 * 4 + 2];
    newDst[4] = v1 * m[1 * 4 + 0];
    newDst[5] = v1 * m[1 * 4 + 1];
    newDst[6] = v1 * m[1 * 4 + 2];
    newDst[8] = v2 * m[2 * 4 + 0];
    newDst[9] = v2 * m[2 * 4 + 1];
    newDst[10] = v2 * m[2 * 4 + 2];
    return newDst;
  }
  function uniformScaling(s, dst) {
    const newDst = dst ?? new Ctor(12);
    newDst[0] = s;
    newDst[1] = 0;
    newDst[2] = 0;
    newDst[4] = 0;
    newDst[5] = s;
    newDst[6] = 0;
    newDst[8] = 0;
    newDst[9] = 0;
    newDst[10] = 1;
    return newDst;
  }
  function uniformScale(m, s, dst) {
    const newDst = dst ?? new Ctor(12);
    newDst[0] = s * m[0 * 4 + 0];
    newDst[1] = s * m[0 * 4 + 1];
    newDst[2] = s * m[0 * 4 + 2];
    newDst[4] = s * m[1 * 4 + 0];
    newDst[5] = s * m[1 * 4 + 1];
    newDst[6] = s * m[1 * 4 + 2];
    if (m !== newDst) {
      newDst[8] = m[8];
      newDst[9] = m[9];
      newDst[10] = m[10];
    }
    return newDst;
  }
  function uniformScaling3D(s, dst) {
    const newDst = dst ?? new Ctor(12);
    newDst[0] = s;
    newDst[1] = 0;
    newDst[2] = 0;
    newDst[4] = 0;
    newDst[5] = s;
    newDst[6] = 0;
    newDst[8] = 0;
    newDst[9] = 0;
    newDst[10] = s;
    return newDst;
  }
  function uniformScale3D(m, s, dst) {
    const newDst = dst ?? new Ctor(12);
    newDst[0] = s * m[0 * 4 + 0];
    newDst[1] = s * m[0 * 4 + 1];
    newDst[2] = s * m[0 * 4 + 2];
    newDst[4] = s * m[1 * 4 + 0];
    newDst[5] = s * m[1 * 4 + 1];
    newDst[6] = s * m[1 * 4 + 2];
    newDst[8] = s * m[2 * 4 + 0];
    newDst[9] = s * m[2 * 4 + 1];
    newDst[10] = s * m[2 * 4 + 2];
    return newDst;
  }
  return {
    add,
    clone,
    copy,
    create,
    determinant,
    equals,
    equalsApproximately,
    fromMat4,
    fromQuat,
    get3DScaling,
    getAxis,
    getScaling,
    getTranslation,
    identity,
    inverse,
    invert,
    mul,
    mulScalar,
    multiply,
    multiplyScalar,
    negate,
    rotate,
    rotateX,
    rotateY,
    rotateZ,
    rotation,
    rotationX,
    rotationY,
    rotationZ,
    scale,
    scale3D,
    scaling,
    scaling3D,
    set,
    setAxis,
    setTranslation,
    translate,
    translation,
    transpose,
    uniformScale,
    uniformScale3D,
    uniformScaling,
    uniformScaling3D
  };
}
var cache$3 = new Map;
function getAPI$3(Ctor) {
  let api = cache$3.get(Ctor);
  if (!api) {
    api = getAPIImpl$3(Ctor);
    cache$3.set(Ctor, api);
  }
  return api;
}
function getAPIImpl$2(Ctor) {
  const vec3 = getAPI$4(Ctor);
  function create(v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15) {
    const newDst = new Ctor(16);
    if (v0 !== undefined) {
      newDst[0] = v0;
      if (v1 !== undefined) {
        newDst[1] = v1;
        if (v2 !== undefined) {
          newDst[2] = v2;
          if (v3 !== undefined) {
            newDst[3] = v3;
            if (v4 !== undefined) {
              newDst[4] = v4;
              if (v5 !== undefined) {
                newDst[5] = v5;
                if (v6 !== undefined) {
                  newDst[6] = v6;
                  if (v7 !== undefined) {
                    newDst[7] = v7;
                    if (v8 !== undefined) {
                      newDst[8] = v8;
                      if (v9 !== undefined) {
                        newDst[9] = v9;
                        if (v10 !== undefined) {
                          newDst[10] = v10;
                          if (v11 !== undefined) {
                            newDst[11] = v11;
                            if (v12 !== undefined) {
                              newDst[12] = v12;
                              if (v13 !== undefined) {
                                newDst[13] = v13;
                                if (v14 !== undefined) {
                                  newDst[14] = v14;
                                  if (v15 !== undefined) {
                                    newDst[15] = v15;
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return newDst;
  }
  function set(v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15, dst) {
    const newDst = dst ?? new Ctor(16);
    newDst[0] = v0;
    newDst[1] = v1;
    newDst[2] = v2;
    newDst[3] = v3;
    newDst[4] = v4;
    newDst[5] = v5;
    newDst[6] = v6;
    newDst[7] = v7;
    newDst[8] = v8;
    newDst[9] = v9;
    newDst[10] = v10;
    newDst[11] = v11;
    newDst[12] = v12;
    newDst[13] = v13;
    newDst[14] = v14;
    newDst[15] = v15;
    return newDst;
  }
  function fromMat3(m3, dst) {
    const newDst = dst ?? new Ctor(16);
    newDst[0] = m3[0];
    newDst[1] = m3[1];
    newDst[2] = m3[2];
    newDst[3] = 0;
    newDst[4] = m3[4];
    newDst[5] = m3[5];
    newDst[6] = m3[6];
    newDst[7] = 0;
    newDst[8] = m3[8];
    newDst[9] = m3[9];
    newDst[10] = m3[10];
    newDst[11] = 0;
    newDst[12] = 0;
    newDst[13] = 0;
    newDst[14] = 0;
    newDst[15] = 1;
    return newDst;
  }
  function fromQuat(q, dst) {
    const newDst = dst ?? new Ctor(16);
    const x = q[0];
    const y = q[1];
    const z = q[2];
    const w = q[3];
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;
    const xx = x * x2;
    const yx = y * x2;
    const yy = y * y2;
    const zx = z * x2;
    const zy = z * y2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;
    newDst[0] = 1 - yy - zz;
    newDst[1] = yx + wz;
    newDst[2] = zx - wy;
    newDst[3] = 0;
    newDst[4] = yx - wz;
    newDst[5] = 1 - xx - zz;
    newDst[6] = zy + wx;
    newDst[7] = 0;
    newDst[8] = zx + wy;
    newDst[9] = zy - wx;
    newDst[10] = 1 - xx - yy;
    newDst[11] = 0;
    newDst[12] = 0;
    newDst[13] = 0;
    newDst[14] = 0;
    newDst[15] = 1;
    return newDst;
  }
  function negate(m, dst) {
    const newDst = dst ?? new Ctor(16);
    newDst[0] = -m[0];
    newDst[1] = -m[1];
    newDst[2] = -m[2];
    newDst[3] = -m[3];
    newDst[4] = -m[4];
    newDst[5] = -m[5];
    newDst[6] = -m[6];
    newDst[7] = -m[7];
    newDst[8] = -m[8];
    newDst[9] = -m[9];
    newDst[10] = -m[10];
    newDst[11] = -m[11];
    newDst[12] = -m[12];
    newDst[13] = -m[13];
    newDst[14] = -m[14];
    newDst[15] = -m[15];
    return newDst;
  }
  function add(a, b, dst) {
    const newDst = dst ?? new Ctor(16);
    newDst[0] = a[0] + b[0];
    newDst[1] = a[1] + b[1];
    newDst[2] = a[2] + b[2];
    newDst[3] = a[3] + b[3];
    newDst[4] = a[4] + b[4];
    newDst[5] = a[5] + b[5];
    newDst[6] = a[6] + b[6];
    newDst[7] = a[7] + b[7];
    newDst[8] = a[8] + b[8];
    newDst[9] = a[9] + b[9];
    newDst[10] = a[10] + b[10];
    newDst[11] = a[11] + b[11];
    newDst[12] = a[12] + b[12];
    newDst[13] = a[13] + b[13];
    newDst[14] = a[14] + b[14];
    newDst[15] = a[15] + b[15];
    return newDst;
  }
  function multiplyScalar(m, s, dst) {
    const newDst = dst ?? new Ctor(16);
    newDst[0] = m[0] * s;
    newDst[1] = m[1] * s;
    newDst[2] = m[2] * s;
    newDst[3] = m[3] * s;
    newDst[4] = m[4] * s;
    newDst[5] = m[5] * s;
    newDst[6] = m[6] * s;
    newDst[7] = m[7] * s;
    newDst[8] = m[8] * s;
    newDst[9] = m[9] * s;
    newDst[10] = m[10] * s;
    newDst[11] = m[11] * s;
    newDst[12] = m[12] * s;
    newDst[13] = m[13] * s;
    newDst[14] = m[14] * s;
    newDst[15] = m[15] * s;
    return newDst;
  }
  const mulScalar = multiplyScalar;
  function copy(m, dst) {
    const newDst = dst ?? new Ctor(16);
    newDst[0] = m[0];
    newDst[1] = m[1];
    newDst[2] = m[2];
    newDst[3] = m[3];
    newDst[4] = m[4];
    newDst[5] = m[5];
    newDst[6] = m[6];
    newDst[7] = m[7];
    newDst[8] = m[8];
    newDst[9] = m[9];
    newDst[10] = m[10];
    newDst[11] = m[11];
    newDst[12] = m[12];
    newDst[13] = m[13];
    newDst[14] = m[14];
    newDst[15] = m[15];
    return newDst;
  }
  const clone = copy;
  function equalsApproximately(a, b) {
    return Math.abs(a[0] - b[0]) < EPSILON && Math.abs(a[1] - b[1]) < EPSILON && Math.abs(a[2] - b[2]) < EPSILON && Math.abs(a[3] - b[3]) < EPSILON && Math.abs(a[4] - b[4]) < EPSILON && Math.abs(a[5] - b[5]) < EPSILON && Math.abs(a[6] - b[6]) < EPSILON && Math.abs(a[7] - b[7]) < EPSILON && Math.abs(a[8] - b[8]) < EPSILON && Math.abs(a[9] - b[9]) < EPSILON && Math.abs(a[10] - b[10]) < EPSILON && Math.abs(a[11] - b[11]) < EPSILON && Math.abs(a[12] - b[12]) < EPSILON && Math.abs(a[13] - b[13]) < EPSILON && Math.abs(a[14] - b[14]) < EPSILON && Math.abs(a[15] - b[15]) < EPSILON;
  }
  function equals(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] && a[8] === b[8] && a[9] === b[9] && a[10] === b[10] && a[11] === b[11] && a[12] === b[12] && a[13] === b[13] && a[14] === b[14] && a[15] === b[15];
  }
  function identity(dst) {
    const newDst = dst ?? new Ctor(16);
    newDst[0] = 1;
    newDst[1] = 0;
    newDst[2] = 0;
    newDst[3] = 0;
    newDst[4] = 0;
    newDst[5] = 1;
    newDst[6] = 0;
    newDst[7] = 0;
    newDst[8] = 0;
    newDst[9] = 0;
    newDst[10] = 1;
    newDst[11] = 0;
    newDst[12] = 0;
    newDst[13] = 0;
    newDst[14] = 0;
    newDst[15] = 1;
    return newDst;
  }
  function transpose(m, dst) {
    const newDst = dst ?? new Ctor(16);
    if (newDst === m) {
      let t;
      t = m[1];
      m[1] = m[4];
      m[4] = t;
      t = m[2];
      m[2] = m[8];
      m[8] = t;
      t = m[3];
      m[3] = m[12];
      m[12] = t;
      t = m[6];
      m[6] = m[9];
      m[9] = t;
      t = m[7];
      m[7] = m[13];
      m[13] = t;
      t = m[11];
      m[11] = m[14];
      m[14] = t;
      return newDst;
    }
    const m00 = m[0 * 4 + 0];
    const m01 = m[0 * 4 + 1];
    const m02 = m[0 * 4 + 2];
    const m03 = m[0 * 4 + 3];
    const m10 = m[1 * 4 + 0];
    const m11 = m[1 * 4 + 1];
    const m12 = m[1 * 4 + 2];
    const m13 = m[1 * 4 + 3];
    const m20 = m[2 * 4 + 0];
    const m21 = m[2 * 4 + 1];
    const m22 = m[2 * 4 + 2];
    const m23 = m[2 * 4 + 3];
    const m30 = m[3 * 4 + 0];
    const m31 = m[3 * 4 + 1];
    const m32 = m[3 * 4 + 2];
    const m33 = m[3 * 4 + 3];
    newDst[0] = m00;
    newDst[1] = m10;
    newDst[2] = m20;
    newDst[3] = m30;
    newDst[4] = m01;
    newDst[5] = m11;
    newDst[6] = m21;
    newDst[7] = m31;
    newDst[8] = m02;
    newDst[9] = m12;
    newDst[10] = m22;
    newDst[11] = m32;
    newDst[12] = m03;
    newDst[13] = m13;
    newDst[14] = m23;
    newDst[15] = m33;
    return newDst;
  }
  function inverse(m, dst) {
    const newDst = dst ?? new Ctor(16);
    const m00 = m[0 * 4 + 0];
    const m01 = m[0 * 4 + 1];
    const m02 = m[0 * 4 + 2];
    const m03 = m[0 * 4 + 3];
    const m10 = m[1 * 4 + 0];
    const m11 = m[1 * 4 + 1];
    const m12 = m[1 * 4 + 2];
    const m13 = m[1 * 4 + 3];
    const m20 = m[2 * 4 + 0];
    const m21 = m[2 * 4 + 1];
    const m22 = m[2 * 4 + 2];
    const m23 = m[2 * 4 + 3];
    const m30 = m[3 * 4 + 0];
    const m31 = m[3 * 4 + 1];
    const m32 = m[3 * 4 + 2];
    const m33 = m[3 * 4 + 3];
    const tmp0 = m22 * m33;
    const tmp1 = m32 * m23;
    const tmp2 = m12 * m33;
    const tmp3 = m32 * m13;
    const tmp4 = m12 * m23;
    const tmp5 = m22 * m13;
    const tmp6 = m02 * m33;
    const tmp7 = m32 * m03;
    const tmp8 = m02 * m23;
    const tmp9 = m22 * m03;
    const tmp10 = m02 * m13;
    const tmp11 = m12 * m03;
    const tmp12 = m20 * m31;
    const tmp13 = m30 * m21;
    const tmp14 = m10 * m31;
    const tmp15 = m30 * m11;
    const tmp16 = m10 * m21;
    const tmp17 = m20 * m11;
    const tmp18 = m00 * m31;
    const tmp19 = m30 * m01;
    const tmp20 = m00 * m21;
    const tmp21 = m20 * m01;
    const tmp22 = m00 * m11;
    const tmp23 = m10 * m01;
    const t0 = tmp0 * m11 + tmp3 * m21 + tmp4 * m31 - (tmp1 * m11 + tmp2 * m21 + tmp5 * m31);
    const t1 = tmp1 * m01 + tmp6 * m21 + tmp9 * m31 - (tmp0 * m01 + tmp7 * m21 + tmp8 * m31);
    const t2 = tmp2 * m01 + tmp7 * m11 + tmp10 * m31 - (tmp3 * m01 + tmp6 * m11 + tmp11 * m31);
    const t3 = tmp5 * m01 + tmp8 * m11 + tmp11 * m21 - (tmp4 * m01 + tmp9 * m11 + tmp10 * m21);
    const d = 1 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);
    newDst[0] = d * t0;
    newDst[1] = d * t1;
    newDst[2] = d * t2;
    newDst[3] = d * t3;
    newDst[4] = d * (tmp1 * m10 + tmp2 * m20 + tmp5 * m30 - (tmp0 * m10 + tmp3 * m20 + tmp4 * m30));
    newDst[5] = d * (tmp0 * m00 + tmp7 * m20 + tmp8 * m30 - (tmp1 * m00 + tmp6 * m20 + tmp9 * m30));
    newDst[6] = d * (tmp3 * m00 + tmp6 * m10 + tmp11 * m30 - (tmp2 * m00 + tmp7 * m10 + tmp10 * m30));
    newDst[7] = d * (tmp4 * m00 + tmp9 * m10 + tmp10 * m20 - (tmp5 * m00 + tmp8 * m10 + tmp11 * m20));
    newDst[8] = d * (tmp12 * m13 + tmp15 * m23 + tmp16 * m33 - (tmp13 * m13 + tmp14 * m23 + tmp17 * m33));
    newDst[9] = d * (tmp13 * m03 + tmp18 * m23 + tmp21 * m33 - (tmp12 * m03 + tmp19 * m23 + tmp20 * m33));
    newDst[10] = d * (tmp14 * m03 + tmp19 * m13 + tmp22 * m33 - (tmp15 * m03 + tmp18 * m13 + tmp23 * m33));
    newDst[11] = d * (tmp17 * m03 + tmp20 * m13 + tmp23 * m23 - (tmp16 * m03 + tmp21 * m13 + tmp22 * m23));
    newDst[12] = d * (tmp14 * m22 + tmp17 * m32 + tmp13 * m12 - (tmp16 * m32 + tmp12 * m12 + tmp15 * m22));
    newDst[13] = d * (tmp20 * m32 + tmp12 * m02 + tmp19 * m22 - (tmp18 * m22 + tmp21 * m32 + tmp13 * m02));
    newDst[14] = d * (tmp18 * m12 + tmp23 * m32 + tmp15 * m02 - (tmp22 * m32 + tmp14 * m02 + tmp19 * m12));
    newDst[15] = d * (tmp22 * m22 + tmp16 * m02 + tmp21 * m12 - (tmp20 * m12 + tmp23 * m22 + tmp17 * m02));
    return newDst;
  }
  function determinant(m) {
    const m00 = m[0 * 4 + 0];
    const m01 = m[0 * 4 + 1];
    const m02 = m[0 * 4 + 2];
    const m03 = m[0 * 4 + 3];
    const m10 = m[1 * 4 + 0];
    const m11 = m[1 * 4 + 1];
    const m12 = m[1 * 4 + 2];
    const m13 = m[1 * 4 + 3];
    const m20 = m[2 * 4 + 0];
    const m21 = m[2 * 4 + 1];
    const m22 = m[2 * 4 + 2];
    const m23 = m[2 * 4 + 3];
    const m30 = m[3 * 4 + 0];
    const m31 = m[3 * 4 + 1];
    const m32 = m[3 * 4 + 2];
    const m33 = m[3 * 4 + 3];
    const tmp0 = m22 * m33;
    const tmp1 = m32 * m23;
    const tmp2 = m12 * m33;
    const tmp3 = m32 * m13;
    const tmp4 = m12 * m23;
    const tmp5 = m22 * m13;
    const tmp6 = m02 * m33;
    const tmp7 = m32 * m03;
    const tmp8 = m02 * m23;
    const tmp9 = m22 * m03;
    const tmp10 = m02 * m13;
    const tmp11 = m12 * m03;
    const t0 = tmp0 * m11 + tmp3 * m21 + tmp4 * m31 - (tmp1 * m11 + tmp2 * m21 + tmp5 * m31);
    const t1 = tmp1 * m01 + tmp6 * m21 + tmp9 * m31 - (tmp0 * m01 + tmp7 * m21 + tmp8 * m31);
    const t2 = tmp2 * m01 + tmp7 * m11 + tmp10 * m31 - (tmp3 * m01 + tmp6 * m11 + tmp11 * m31);
    const t3 = tmp5 * m01 + tmp8 * m11 + tmp11 * m21 - (tmp4 * m01 + tmp9 * m11 + tmp10 * m21);
    return m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3;
  }
  const invert = inverse;
  function multiply(a, b, dst) {
    const newDst = dst ?? new Ctor(16);
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a10 = a[4 + 0];
    const a11 = a[4 + 1];
    const a12 = a[4 + 2];
    const a13 = a[4 + 3];
    const a20 = a[8 + 0];
    const a21 = a[8 + 1];
    const a22 = a[8 + 2];
    const a23 = a[8 + 3];
    const a30 = a[12 + 0];
    const a31 = a[12 + 1];
    const a32 = a[12 + 2];
    const a33 = a[12 + 3];
    const b00 = b[0];
    const b01 = b[1];
    const b02 = b[2];
    const b03 = b[3];
    const b10 = b[4 + 0];
    const b11 = b[4 + 1];
    const b12 = b[4 + 2];
    const b13 = b[4 + 3];
    const b20 = b[8 + 0];
    const b21 = b[8 + 1];
    const b22 = b[8 + 2];
    const b23 = b[8 + 3];
    const b30 = b[12 + 0];
    const b31 = b[12 + 1];
    const b32 = b[12 + 2];
    const b33 = b[12 + 3];
    newDst[0] = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
    newDst[1] = a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03;
    newDst[2] = a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03;
    newDst[3] = a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03;
    newDst[4] = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
    newDst[5] = a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13;
    newDst[6] = a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13;
    newDst[7] = a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13;
    newDst[8] = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;
    newDst[9] = a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23;
    newDst[10] = a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23;
    newDst[11] = a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23;
    newDst[12] = a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33;
    newDst[13] = a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33;
    newDst[14] = a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33;
    newDst[15] = a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33;
    return newDst;
  }
  const mul = multiply;
  function setTranslation(a, v, dst) {
    const newDst = dst ?? identity();
    if (a !== newDst) {
      newDst[0] = a[0];
      newDst[1] = a[1];
      newDst[2] = a[2];
      newDst[3] = a[3];
      newDst[4] = a[4];
      newDst[5] = a[5];
      newDst[6] = a[6];
      newDst[7] = a[7];
      newDst[8] = a[8];
      newDst[9] = a[9];
      newDst[10] = a[10];
      newDst[11] = a[11];
    }
    newDst[12] = v[0];
    newDst[13] = v[1];
    newDst[14] = v[2];
    newDst[15] = 1;
    return newDst;
  }
  function getTranslation(m, dst) {
    const newDst = dst ?? vec3.create();
    newDst[0] = m[12];
    newDst[1] = m[13];
    newDst[2] = m[14];
    return newDst;
  }
  function getAxis(m, axis, dst) {
    const newDst = dst ?? vec3.create();
    const off = axis * 4;
    newDst[0] = m[off + 0];
    newDst[1] = m[off + 1];
    newDst[2] = m[off + 2];
    return newDst;
  }
  function setAxis(m, v, axis, dst) {
    const newDst = dst === m ? dst : copy(m, dst);
    const off = axis * 4;
    newDst[off + 0] = v[0];
    newDst[off + 1] = v[1];
    newDst[off + 2] = v[2];
    return newDst;
  }
  function getScaling(m, dst) {
    const newDst = dst ?? vec3.create();
    const xx = m[0];
    const xy = m[1];
    const xz = m[2];
    const yx = m[4];
    const yy = m[5];
    const yz = m[6];
    const zx = m[8];
    const zy = m[9];
    const zz = m[10];
    newDst[0] = Math.sqrt(xx * xx + xy * xy + xz * xz);
    newDst[1] = Math.sqrt(yx * yx + yy * yy + yz * yz);
    newDst[2] = Math.sqrt(zx * zx + zy * zy + zz * zz);
    return newDst;
  }
  function perspective(fieldOfViewYInRadians, aspect, zNear, zFar, dst) {
    const newDst = dst ?? new Ctor(16);
    const f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewYInRadians);
    newDst[0] = f / aspect;
    newDst[1] = 0;
    newDst[2] = 0;
    newDst[3] = 0;
    newDst[4] = 0;
    newDst[5] = f;
    newDst[6] = 0;
    newDst[7] = 0;
    newDst[8] = 0;
    newDst[9] = 0;
    newDst[11] = -1;
    newDst[12] = 0;
    newDst[13] = 0;
    newDst[15] = 0;
    if (Number.isFinite(zFar)) {
      const rangeInv = 1 / (zNear - zFar);
      newDst[10] = zFar * rangeInv;
      newDst[14] = zFar * zNear * rangeInv;
    } else {
      newDst[10] = -1;
      newDst[14] = -zNear;
    }
    return newDst;
  }
  function perspectiveReverseZ(fieldOfViewYInRadians, aspect, zNear, zFar = Infinity, dst) {
    const newDst = dst ?? new Ctor(16);
    const f = 1 / Math.tan(fieldOfViewYInRadians * 0.5);
    newDst[0] = f / aspect;
    newDst[1] = 0;
    newDst[2] = 0;
    newDst[3] = 0;
    newDst[4] = 0;
    newDst[5] = f;
    newDst[6] = 0;
    newDst[7] = 0;
    newDst[8] = 0;
    newDst[9] = 0;
    newDst[11] = -1;
    newDst[12] = 0;
    newDst[13] = 0;
    newDst[15] = 0;
    if (zFar === Infinity) {
      newDst[10] = 0;
      newDst[14] = zNear;
    } else {
      const rangeInv = 1 / (zFar - zNear);
      newDst[10] = zNear * rangeInv;
      newDst[14] = zFar * zNear * rangeInv;
    }
    return newDst;
  }
  function ortho(left, right, bottom, top, near, far, dst) {
    const newDst = dst ?? new Ctor(16);
    newDst[0] = 2 / (right - left);
    newDst[1] = 0;
    newDst[2] = 0;
    newDst[3] = 0;
    newDst[4] = 0;
    newDst[5] = 2 / (top - bottom);
    newDst[6] = 0;
    newDst[7] = 0;
    newDst[8] = 0;
    newDst[9] = 0;
    newDst[10] = 1 / (near - far);
    newDst[11] = 0;
    newDst[12] = (right + left) / (left - right);
    newDst[13] = (top + bottom) / (bottom - top);
    newDst[14] = near / (near - far);
    newDst[15] = 1;
    return newDst;
  }
  function frustum(left, right, bottom, top, near, far, dst) {
    const newDst = dst ?? new Ctor(16);
    const dx = right - left;
    const dy = top - bottom;
    const dz = near - far;
    newDst[0] = 2 * near / dx;
    newDst[1] = 0;
    newDst[2] = 0;
    newDst[3] = 0;
    newDst[4] = 0;
    newDst[5] = 2 * near / dy;
    newDst[6] = 0;
    newDst[7] = 0;
    newDst[8] = (left + right) / dx;
    newDst[9] = (top + bottom) / dy;
    newDst[10] = far / dz;
    newDst[11] = -1;
    newDst[12] = 0;
    newDst[13] = 0;
    newDst[14] = near * far / dz;
    newDst[15] = 0;
    return newDst;
  }
  function frustumReverseZ(left, right, bottom, top, near, far = Infinity, dst) {
    const newDst = dst ?? new Ctor(16);
    const dx = right - left;
    const dy = top - bottom;
    newDst[0] = 2 * near / dx;
    newDst[1] = 0;
    newDst[2] = 0;
    newDst[3] = 0;
    newDst[4] = 0;
    newDst[5] = 2 * near / dy;
    newDst[6] = 0;
    newDst[7] = 0;
    newDst[8] = (left + right) / dx;
    newDst[9] = (top + bottom) / dy;
    newDst[11] = -1;
    newDst[12] = 0;
    newDst[13] = 0;
    newDst[15] = 0;
    if (far === Infinity) {
      newDst[10] = 0;
      newDst[14] = near;
    } else {
      const rangeInv = 1 / (far - near);
      newDst[10] = near * rangeInv;
      newDst[14] = far * near * rangeInv;
    }
    return newDst;
  }
  const xAxis = vec3.create();
  const yAxis = vec3.create();
  const zAxis = vec3.create();
  function aim(position, target, up, dst) {
    const newDst = dst ?? new Ctor(16);
    vec3.normalize(vec3.subtract(target, position, zAxis), zAxis);
    vec3.normalize(vec3.cross(up, zAxis, xAxis), xAxis);
    vec3.normalize(vec3.cross(zAxis, xAxis, yAxis), yAxis);
    newDst[0] = xAxis[0];
    newDst[1] = xAxis[1];
    newDst[2] = xAxis[2];
    newDst[3] = 0;
    newDst[4] = yAxis[0];
    newDst[5] = yAxis[1];
    newDst[6] = yAxis[2];
    newDst[7] = 0;
    newDst[8] = zAxis[0];
    newDst[9] = zAxis[1];
    newDst[10] = zAxis[2];
    newDst[11] = 0;
    newDst[12] = position[0];
    newDst[13] = position[1];
    newDst[14] = position[2];
    newDst[15] = 1;
    return newDst;
  }
  function cameraAim(eye, target, up, dst) {
    const newDst = dst ?? new Ctor(16);
    vec3.normalize(vec3.subtract(eye, target, zAxis), zAxis);
    vec3.normalize(vec3.cross(up, zAxis, xAxis), xAxis);
    vec3.normalize(vec3.cross(zAxis, xAxis, yAxis), yAxis);
    newDst[0] = xAxis[0];
    newDst[1] = xAxis[1];
    newDst[2] = xAxis[2];
    newDst[3] = 0;
    newDst[4] = yAxis[0];
    newDst[5] = yAxis[1];
    newDst[6] = yAxis[2];
    newDst[7] = 0;
    newDst[8] = zAxis[0];
    newDst[9] = zAxis[1];
    newDst[10] = zAxis[2];
    newDst[11] = 0;
    newDst[12] = eye[0];
    newDst[13] = eye[1];
    newDst[14] = eye[2];
    newDst[15] = 1;
    return newDst;
  }
  function lookAt(eye, target, up, dst) {
    const newDst = dst ?? new Ctor(16);
    vec3.normalize(vec3.subtract(eye, target, zAxis), zAxis);
    vec3.normalize(vec3.cross(up, zAxis, xAxis), xAxis);
    vec3.normalize(vec3.cross(zAxis, xAxis, yAxis), yAxis);
    newDst[0] = xAxis[0];
    newDst[1] = yAxis[0];
    newDst[2] = zAxis[0];
    newDst[3] = 0;
    newDst[4] = xAxis[1];
    newDst[5] = yAxis[1];
    newDst[6] = zAxis[1];
    newDst[7] = 0;
    newDst[8] = xAxis[2];
    newDst[9] = yAxis[2];
    newDst[10] = zAxis[2];
    newDst[11] = 0;
    newDst[12] = -(xAxis[0] * eye[0] + xAxis[1] * eye[1] + xAxis[2] * eye[2]);
    newDst[13] = -(yAxis[0] * eye[0] + yAxis[1] * eye[1] + yAxis[2] * eye[2]);
    newDst[14] = -(zAxis[0] * eye[0] + zAxis[1] * eye[1] + zAxis[2] * eye[2]);
    newDst[15] = 1;
    return newDst;
  }
  function translation(v, dst) {
    const newDst = dst ?? new Ctor(16);
    newDst[0] = 1;
    newDst[1] = 0;
    newDst[2] = 0;
    newDst[3] = 0;
    newDst[4] = 0;
    newDst[5] = 1;
    newDst[6] = 0;
    newDst[7] = 0;
    newDst[8] = 0;
    newDst[9] = 0;
    newDst[10] = 1;
    newDst[11] = 0;
    newDst[12] = v[0];
    newDst[13] = v[1];
    newDst[14] = v[2];
    newDst[15] = 1;
    return newDst;
  }
  function translate(m, v, dst) {
    const newDst = dst ?? new Ctor(16);
    const v0 = v[0];
    const v1 = v[1];
    const v2 = v[2];
    const m00 = m[0];
    const m01 = m[1];
    const m02 = m[2];
    const m03 = m[3];
    const m10 = m[1 * 4 + 0];
    const m11 = m[1 * 4 + 1];
    const m12 = m[1 * 4 + 2];
    const m13 = m[1 * 4 + 3];
    const m20 = m[2 * 4 + 0];
    const m21 = m[2 * 4 + 1];
    const m22 = m[2 * 4 + 2];
    const m23 = m[2 * 4 + 3];
    const m30 = m[3 * 4 + 0];
    const m31 = m[3 * 4 + 1];
    const m32 = m[3 * 4 + 2];
    const m33 = m[3 * 4 + 3];
    if (m !== newDst) {
      newDst[0] = m00;
      newDst[1] = m01;
      newDst[2] = m02;
      newDst[3] = m03;
      newDst[4] = m10;
      newDst[5] = m11;
      newDst[6] = m12;
      newDst[7] = m13;
      newDst[8] = m20;
      newDst[9] = m21;
      newDst[10] = m22;
      newDst[11] = m23;
    }
    newDst[12] = m00 * v0 + m10 * v1 + m20 * v2 + m30;
    newDst[13] = m01 * v0 + m11 * v1 + m21 * v2 + m31;
    newDst[14] = m02 * v0 + m12 * v1 + m22 * v2 + m32;
    newDst[15] = m03 * v0 + m13 * v1 + m23 * v2 + m33;
    return newDst;
  }
  function rotationX(angleInRadians, dst) {
    const newDst = dst ?? new Ctor(16);
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    newDst[0] = 1;
    newDst[1] = 0;
    newDst[2] = 0;
    newDst[3] = 0;
    newDst[4] = 0;
    newDst[5] = c;
    newDst[6] = s;
    newDst[7] = 0;
    newDst[8] = 0;
    newDst[9] = -s;
    newDst[10] = c;
    newDst[11] = 0;
    newDst[12] = 0;
    newDst[13] = 0;
    newDst[14] = 0;
    newDst[15] = 1;
    return newDst;
  }
  function rotateX(m, angleInRadians, dst) {
    const newDst = dst ?? new Ctor(16);
    const m10 = m[4];
    const m11 = m[5];
    const m12 = m[6];
    const m13 = m[7];
    const m20 = m[8];
    const m21 = m[9];
    const m22 = m[10];
    const m23 = m[11];
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    newDst[4] = c * m10 + s * m20;
    newDst[5] = c * m11 + s * m21;
    newDst[6] = c * m12 + s * m22;
    newDst[7] = c * m13 + s * m23;
    newDst[8] = c * m20 - s * m10;
    newDst[9] = c * m21 - s * m11;
    newDst[10] = c * m22 - s * m12;
    newDst[11] = c * m23 - s * m13;
    if (m !== newDst) {
      newDst[0] = m[0];
      newDst[1] = m[1];
      newDst[2] = m[2];
      newDst[3] = m[3];
      newDst[12] = m[12];
      newDst[13] = m[13];
      newDst[14] = m[14];
      newDst[15] = m[15];
    }
    return newDst;
  }
  function rotationY(angleInRadians, dst) {
    const newDst = dst ?? new Ctor(16);
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    newDst[0] = c;
    newDst[1] = 0;
    newDst[2] = -s;
    newDst[3] = 0;
    newDst[4] = 0;
    newDst[5] = 1;
    newDst[6] = 0;
    newDst[7] = 0;
    newDst[8] = s;
    newDst[9] = 0;
    newDst[10] = c;
    newDst[11] = 0;
    newDst[12] = 0;
    newDst[13] = 0;
    newDst[14] = 0;
    newDst[15] = 1;
    return newDst;
  }
  function rotateY(m, angleInRadians, dst) {
    const newDst = dst ?? new Ctor(16);
    const m00 = m[0 * 4 + 0];
    const m01 = m[0 * 4 + 1];
    const m02 = m[0 * 4 + 2];
    const m03 = m[0 * 4 + 3];
    const m20 = m[2 * 4 + 0];
    const m21 = m[2 * 4 + 1];
    const m22 = m[2 * 4 + 2];
    const m23 = m[2 * 4 + 3];
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    newDst[0] = c * m00 - s * m20;
    newDst[1] = c * m01 - s * m21;
    newDst[2] = c * m02 - s * m22;
    newDst[3] = c * m03 - s * m23;
    newDst[8] = c * m20 + s * m00;
    newDst[9] = c * m21 + s * m01;
    newDst[10] = c * m22 + s * m02;
    newDst[11] = c * m23 + s * m03;
    if (m !== newDst) {
      newDst[4] = m[4];
      newDst[5] = m[5];
      newDst[6] = m[6];
      newDst[7] = m[7];
      newDst[12] = m[12];
      newDst[13] = m[13];
      newDst[14] = m[14];
      newDst[15] = m[15];
    }
    return newDst;
  }
  function rotationZ(angleInRadians, dst) {
    const newDst = dst ?? new Ctor(16);
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    newDst[0] = c;
    newDst[1] = s;
    newDst[2] = 0;
    newDst[3] = 0;
    newDst[4] = -s;
    newDst[5] = c;
    newDst[6] = 0;
    newDst[7] = 0;
    newDst[8] = 0;
    newDst[9] = 0;
    newDst[10] = 1;
    newDst[11] = 0;
    newDst[12] = 0;
    newDst[13] = 0;
    newDst[14] = 0;
    newDst[15] = 1;
    return newDst;
  }
  function rotateZ(m, angleInRadians, dst) {
    const newDst = dst ?? new Ctor(16);
    const m00 = m[0 * 4 + 0];
    const m01 = m[0 * 4 + 1];
    const m02 = m[0 * 4 + 2];
    const m03 = m[0 * 4 + 3];
    const m10 = m[1 * 4 + 0];
    const m11 = m[1 * 4 + 1];
    const m12 = m[1 * 4 + 2];
    const m13 = m[1 * 4 + 3];
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    newDst[0] = c * m00 + s * m10;
    newDst[1] = c * m01 + s * m11;
    newDst[2] = c * m02 + s * m12;
    newDst[3] = c * m03 + s * m13;
    newDst[4] = c * m10 - s * m00;
    newDst[5] = c * m11 - s * m01;
    newDst[6] = c * m12 - s * m02;
    newDst[7] = c * m13 - s * m03;
    if (m !== newDst) {
      newDst[8] = m[8];
      newDst[9] = m[9];
      newDst[10] = m[10];
      newDst[11] = m[11];
      newDst[12] = m[12];
      newDst[13] = m[13];
      newDst[14] = m[14];
      newDst[15] = m[15];
    }
    return newDst;
  }
  function axisRotation(axis, angleInRadians, dst) {
    const newDst = dst ?? new Ctor(16);
    let x = axis[0];
    let y = axis[1];
    let z = axis[2];
    const n = Math.sqrt(x * x + y * y + z * z);
    x /= n;
    y /= n;
    z /= n;
    const xx = x * x;
    const yy = y * y;
    const zz = z * z;
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    const oneMinusCosine = 1 - c;
    newDst[0] = xx + (1 - xx) * c;
    newDst[1] = x * y * oneMinusCosine + z * s;
    newDst[2] = x * z * oneMinusCosine - y * s;
    newDst[3] = 0;
    newDst[4] = x * y * oneMinusCosine - z * s;
    newDst[5] = yy + (1 - yy) * c;
    newDst[6] = y * z * oneMinusCosine + x * s;
    newDst[7] = 0;
    newDst[8] = x * z * oneMinusCosine + y * s;
    newDst[9] = y * z * oneMinusCosine - x * s;
    newDst[10] = zz + (1 - zz) * c;
    newDst[11] = 0;
    newDst[12] = 0;
    newDst[13] = 0;
    newDst[14] = 0;
    newDst[15] = 1;
    return newDst;
  }
  const rotation = axisRotation;
  function axisRotate(m, axis, angleInRadians, dst) {
    const newDst = dst ?? new Ctor(16);
    let x = axis[0];
    let y = axis[1];
    let z = axis[2];
    const n = Math.sqrt(x * x + y * y + z * z);
    x /= n;
    y /= n;
    z /= n;
    const xx = x * x;
    const yy = y * y;
    const zz = z * z;
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    const oneMinusCosine = 1 - c;
    const r00 = xx + (1 - xx) * c;
    const r01 = x * y * oneMinusCosine + z * s;
    const r02 = x * z * oneMinusCosine - y * s;
    const r10 = x * y * oneMinusCosine - z * s;
    const r11 = yy + (1 - yy) * c;
    const r12 = y * z * oneMinusCosine + x * s;
    const r20 = x * z * oneMinusCosine + y * s;
    const r21 = y * z * oneMinusCosine - x * s;
    const r22 = zz + (1 - zz) * c;
    const m00 = m[0];
    const m01 = m[1];
    const m02 = m[2];
    const m03 = m[3];
    const m10 = m[4];
    const m11 = m[5];
    const m12 = m[6];
    const m13 = m[7];
    const m20 = m[8];
    const m21 = m[9];
    const m22 = m[10];
    const m23 = m[11];
    newDst[0] = r00 * m00 + r01 * m10 + r02 * m20;
    newDst[1] = r00 * m01 + r01 * m11 + r02 * m21;
    newDst[2] = r00 * m02 + r01 * m12 + r02 * m22;
    newDst[3] = r00 * m03 + r01 * m13 + r02 * m23;
    newDst[4] = r10 * m00 + r11 * m10 + r12 * m20;
    newDst[5] = r10 * m01 + r11 * m11 + r12 * m21;
    newDst[6] = r10 * m02 + r11 * m12 + r12 * m22;
    newDst[7] = r10 * m03 + r11 * m13 + r12 * m23;
    newDst[8] = r20 * m00 + r21 * m10 + r22 * m20;
    newDst[9] = r20 * m01 + r21 * m11 + r22 * m21;
    newDst[10] = r20 * m02 + r21 * m12 + r22 * m22;
    newDst[11] = r20 * m03 + r21 * m13 + r22 * m23;
    if (m !== newDst) {
      newDst[12] = m[12];
      newDst[13] = m[13];
      newDst[14] = m[14];
      newDst[15] = m[15];
    }
    return newDst;
  }
  const rotate = axisRotate;
  function scaling(v, dst) {
    const newDst = dst ?? new Ctor(16);
    newDst[0] = v[0];
    newDst[1] = 0;
    newDst[2] = 0;
    newDst[3] = 0;
    newDst[4] = 0;
    newDst[5] = v[1];
    newDst[6] = 0;
    newDst[7] = 0;
    newDst[8] = 0;
    newDst[9] = 0;
    newDst[10] = v[2];
    newDst[11] = 0;
    newDst[12] = 0;
    newDst[13] = 0;
    newDst[14] = 0;
    newDst[15] = 1;
    return newDst;
  }
  function scale(m, v, dst) {
    const newDst = dst ?? new Ctor(16);
    const v0 = v[0];
    const v1 = v[1];
    const v2 = v[2];
    newDst[0] = v0 * m[0 * 4 + 0];
    newDst[1] = v0 * m[0 * 4 + 1];
    newDst[2] = v0 * m[0 * 4 + 2];
    newDst[3] = v0 * m[0 * 4 + 3];
    newDst[4] = v1 * m[1 * 4 + 0];
    newDst[5] = v1 * m[1 * 4 + 1];
    newDst[6] = v1 * m[1 * 4 + 2];
    newDst[7] = v1 * m[1 * 4 + 3];
    newDst[8] = v2 * m[2 * 4 + 0];
    newDst[9] = v2 * m[2 * 4 + 1];
    newDst[10] = v2 * m[2 * 4 + 2];
    newDst[11] = v2 * m[2 * 4 + 3];
    if (m !== newDst) {
      newDst[12] = m[12];
      newDst[13] = m[13];
      newDst[14] = m[14];
      newDst[15] = m[15];
    }
    return newDst;
  }
  function uniformScaling(s, dst) {
    const newDst = dst ?? new Ctor(16);
    newDst[0] = s;
    newDst[1] = 0;
    newDst[2] = 0;
    newDst[3] = 0;
    newDst[4] = 0;
    newDst[5] = s;
    newDst[6] = 0;
    newDst[7] = 0;
    newDst[8] = 0;
    newDst[9] = 0;
    newDst[10] = s;
    newDst[11] = 0;
    newDst[12] = 0;
    newDst[13] = 0;
    newDst[14] = 0;
    newDst[15] = 1;
    return newDst;
  }
  function uniformScale(m, s, dst) {
    const newDst = dst ?? new Ctor(16);
    newDst[0] = s * m[0 * 4 + 0];
    newDst[1] = s * m[0 * 4 + 1];
    newDst[2] = s * m[0 * 4 + 2];
    newDst[3] = s * m[0 * 4 + 3];
    newDst[4] = s * m[1 * 4 + 0];
    newDst[5] = s * m[1 * 4 + 1];
    newDst[6] = s * m[1 * 4 + 2];
    newDst[7] = s * m[1 * 4 + 3];
    newDst[8] = s * m[2 * 4 + 0];
    newDst[9] = s * m[2 * 4 + 1];
    newDst[10] = s * m[2 * 4 + 2];
    newDst[11] = s * m[2 * 4 + 3];
    if (m !== newDst) {
      newDst[12] = m[12];
      newDst[13] = m[13];
      newDst[14] = m[14];
      newDst[15] = m[15];
    }
    return newDst;
  }
  return {
    add,
    aim,
    axisRotate,
    axisRotation,
    cameraAim,
    clone,
    copy,
    create,
    determinant,
    equals,
    equalsApproximately,
    fromMat3,
    fromQuat,
    frustum,
    frustumReverseZ,
    getAxis,
    getScaling,
    getTranslation,
    identity,
    inverse,
    invert,
    lookAt,
    mul,
    mulScalar,
    multiply,
    multiplyScalar,
    negate,
    ortho,
    perspective,
    perspectiveReverseZ,
    rotate,
    rotateX,
    rotateY,
    rotateZ,
    rotation,
    rotationX,
    rotationY,
    rotationZ,
    scale,
    scaling,
    set,
    setAxis,
    setTranslation,
    translate,
    translation,
    transpose,
    uniformScale,
    uniformScaling
  };
}
var cache$2 = new Map;
function getAPI$2(Ctor) {
  let api = cache$2.get(Ctor);
  if (!api) {
    api = getAPIImpl$2(Ctor);
    cache$2.set(Ctor, api);
  }
  return api;
}
function getAPIImpl$1(Ctor) {
  const vec3 = getAPI$4(Ctor);
  function create(x, y, z, w) {
    const newDst = new Ctor(4);
    if (x !== undefined) {
      newDst[0] = x;
      if (y !== undefined) {
        newDst[1] = y;
        if (z !== undefined) {
          newDst[2] = z;
          if (w !== undefined) {
            newDst[3] = w;
          }
        }
      }
    }
    return newDst;
  }
  const fromValues = create;
  function set(x, y, z, w, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = x;
    newDst[1] = y;
    newDst[2] = z;
    newDst[3] = w;
    return newDst;
  }
  function fromAxisAngle(axis, angleInRadians, dst) {
    const newDst = dst ?? new Ctor(4);
    const halfAngle = angleInRadians * 0.5;
    const s = Math.sin(halfAngle);
    newDst[0] = s * axis[0];
    newDst[1] = s * axis[1];
    newDst[2] = s * axis[2];
    newDst[3] = Math.cos(halfAngle);
    return newDst;
  }
  function toAxisAngle(q, dst) {
    const newDst = dst ?? vec3.create(3);
    const angle = Math.acos(q[3]) * 2;
    const s = Math.sin(angle * 0.5);
    if (s > EPSILON) {
      newDst[0] = q[0] / s;
      newDst[1] = q[1] / s;
      newDst[2] = q[2] / s;
    } else {
      newDst[0] = 1;
      newDst[1] = 0;
      newDst[2] = 0;
    }
    return { angle, axis: newDst };
  }
  function angle(a, b) {
    const d = dot(a, b);
    return Math.acos(2 * d * d - 1);
  }
  function multiply(a, b, dst) {
    const newDst = dst ?? new Ctor(4);
    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    const aw = a[3];
    const bx = b[0];
    const by = b[1];
    const bz = b[2];
    const bw = b[3];
    newDst[0] = ax * bw + aw * bx + ay * bz - az * by;
    newDst[1] = ay * bw + aw * by + az * bx - ax * bz;
    newDst[2] = az * bw + aw * bz + ax * by - ay * bx;
    newDst[3] = aw * bw - ax * bx - ay * by - az * bz;
    return newDst;
  }
  const mul = multiply;
  function rotateX(q, angleInRadians, dst) {
    const newDst = dst ?? new Ctor(4);
    const halfAngle = angleInRadians * 0.5;
    const qx = q[0];
    const qy = q[1];
    const qz = q[2];
    const qw = q[3];
    const bx = Math.sin(halfAngle);
    const bw = Math.cos(halfAngle);
    newDst[0] = qx * bw + qw * bx;
    newDst[1] = qy * bw + qz * bx;
    newDst[2] = qz * bw - qy * bx;
    newDst[3] = qw * bw - qx * bx;
    return newDst;
  }
  function rotateY(q, angleInRadians, dst) {
    const newDst = dst ?? new Ctor(4);
    const halfAngle = angleInRadians * 0.5;
    const qx = q[0];
    const qy = q[1];
    const qz = q[2];
    const qw = q[3];
    const by = Math.sin(halfAngle);
    const bw = Math.cos(halfAngle);
    newDst[0] = qx * bw - qz * by;
    newDst[1] = qy * bw + qw * by;
    newDst[2] = qz * bw + qx * by;
    newDst[3] = qw * bw - qy * by;
    return newDst;
  }
  function rotateZ(q, angleInRadians, dst) {
    const newDst = dst ?? new Ctor(4);
    const halfAngle = angleInRadians * 0.5;
    const qx = q[0];
    const qy = q[1];
    const qz = q[2];
    const qw = q[3];
    const bz = Math.sin(halfAngle);
    const bw = Math.cos(halfAngle);
    newDst[0] = qx * bw + qy * bz;
    newDst[1] = qy * bw - qx * bz;
    newDst[2] = qz * bw + qw * bz;
    newDst[3] = qw * bw - qz * bz;
    return newDst;
  }
  function slerp(a, b, t, dst) {
    const newDst = dst ?? new Ctor(4);
    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    const aw = a[3];
    let bx = b[0];
    let by = b[1];
    let bz = b[2];
    let bw = b[3];
    let cosOmega = ax * bx + ay * by + az * bz + aw * bw;
    if (cosOmega < 0) {
      cosOmega = -cosOmega;
      bx = -bx;
      by = -by;
      bz = -bz;
      bw = -bw;
    }
    let scale0;
    let scale1;
    if (1 - cosOmega > EPSILON) {
      const omega = Math.acos(cosOmega);
      const sinOmega = Math.sin(omega);
      scale0 = Math.sin((1 - t) * omega) / sinOmega;
      scale1 = Math.sin(t * omega) / sinOmega;
    } else {
      scale0 = 1 - t;
      scale1 = t;
    }
    newDst[0] = scale0 * ax + scale1 * bx;
    newDst[1] = scale0 * ay + scale1 * by;
    newDst[2] = scale0 * az + scale1 * bz;
    newDst[3] = scale0 * aw + scale1 * bw;
    return newDst;
  }
  function inverse(q, dst) {
    const newDst = dst ?? new Ctor(4);
    const a0 = q[0];
    const a1 = q[1];
    const a2 = q[2];
    const a3 = q[3];
    const dot = a0 * a0 + a1 * a1 + a2 * a2 + a3 * a3;
    const invDot = dot ? 1 / dot : 0;
    newDst[0] = -a0 * invDot;
    newDst[1] = -a1 * invDot;
    newDst[2] = -a2 * invDot;
    newDst[3] = a3 * invDot;
    return newDst;
  }
  function conjugate(q, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = -q[0];
    newDst[1] = -q[1];
    newDst[2] = -q[2];
    newDst[3] = q[3];
    return newDst;
  }
  function fromMat(m, dst) {
    const newDst = dst ?? new Ctor(4);
    const trace = m[0] + m[5] + m[10];
    if (trace > 0) {
      const root = Math.sqrt(trace + 1);
      newDst[3] = 0.5 * root;
      const invRoot = 0.5 / root;
      newDst[0] = (m[6] - m[9]) * invRoot;
      newDst[1] = (m[8] - m[2]) * invRoot;
      newDst[2] = (m[1] - m[4]) * invRoot;
    } else {
      let i = 0;
      if (m[5] > m[0]) {
        i = 1;
      }
      if (m[10] > m[i * 4 + i]) {
        i = 2;
      }
      const j = (i + 1) % 3;
      const k = (i + 2) % 3;
      const root = Math.sqrt(m[i * 4 + i] - m[j * 4 + j] - m[k * 4 + k] + 1);
      newDst[i] = 0.5 * root;
      const invRoot = 0.5 / root;
      newDst[3] = (m[j * 4 + k] - m[k * 4 + j]) * invRoot;
      newDst[j] = (m[j * 4 + i] + m[i * 4 + j]) * invRoot;
      newDst[k] = (m[k * 4 + i] + m[i * 4 + k]) * invRoot;
    }
    return newDst;
  }
  function fromEuler(xAngleInRadians, yAngleInRadians, zAngleInRadians, order, dst) {
    const newDst = dst ?? new Ctor(4);
    const xHalfAngle = xAngleInRadians * 0.5;
    const yHalfAngle = yAngleInRadians * 0.5;
    const zHalfAngle = zAngleInRadians * 0.5;
    const sx = Math.sin(xHalfAngle);
    const cx = Math.cos(xHalfAngle);
    const sy = Math.sin(yHalfAngle);
    const cy = Math.cos(yHalfAngle);
    const sz = Math.sin(zHalfAngle);
    const cz = Math.cos(zHalfAngle);
    switch (order) {
      case "xyz":
        newDst[0] = sx * cy * cz + cx * sy * sz;
        newDst[1] = cx * sy * cz - sx * cy * sz;
        newDst[2] = cx * cy * sz + sx * sy * cz;
        newDst[3] = cx * cy * cz - sx * sy * sz;
        break;
      case "xzy":
        newDst[0] = sx * cy * cz - cx * sy * sz;
        newDst[1] = cx * sy * cz - sx * cy * sz;
        newDst[2] = cx * cy * sz + sx * sy * cz;
        newDst[3] = cx * cy * cz + sx * sy * sz;
        break;
      case "yxz":
        newDst[0] = sx * cy * cz + cx * sy * sz;
        newDst[1] = cx * sy * cz - sx * cy * sz;
        newDst[2] = cx * cy * sz - sx * sy * cz;
        newDst[3] = cx * cy * cz + sx * sy * sz;
        break;
      case "yzx":
        newDst[0] = sx * cy * cz + cx * sy * sz;
        newDst[1] = cx * sy * cz + sx * cy * sz;
        newDst[2] = cx * cy * sz - sx * sy * cz;
        newDst[3] = cx * cy * cz - sx * sy * sz;
        break;
      case "zxy":
        newDst[0] = sx * cy * cz - cx * sy * sz;
        newDst[1] = cx * sy * cz + sx * cy * sz;
        newDst[2] = cx * cy * sz + sx * sy * cz;
        newDst[3] = cx * cy * cz - sx * sy * sz;
        break;
      case "zyx":
        newDst[0] = sx * cy * cz - cx * sy * sz;
        newDst[1] = cx * sy * cz + sx * cy * sz;
        newDst[2] = cx * cy * sz - sx * sy * cz;
        newDst[3] = cx * cy * cz + sx * sy * sz;
        break;
      default:
        throw new Error(`Unknown rotation order: ${order}`);
    }
    return newDst;
  }
  function copy(q, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = q[0];
    newDst[1] = q[1];
    newDst[2] = q[2];
    newDst[3] = q[3];
    return newDst;
  }
  const clone = copy;
  function add(a, b, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = a[0] + b[0];
    newDst[1] = a[1] + b[1];
    newDst[2] = a[2] + b[2];
    newDst[3] = a[3] + b[3];
    return newDst;
  }
  function subtract(a, b, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = a[0] - b[0];
    newDst[1] = a[1] - b[1];
    newDst[2] = a[2] - b[2];
    newDst[3] = a[3] - b[3];
    return newDst;
  }
  const sub = subtract;
  function mulScalar(v, k, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = v[0] * k;
    newDst[1] = v[1] * k;
    newDst[2] = v[2] * k;
    newDst[3] = v[3] * k;
    return newDst;
  }
  const scale = mulScalar;
  function divScalar(v, k, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = v[0] / k;
    newDst[1] = v[1] / k;
    newDst[2] = v[2] / k;
    newDst[3] = v[3] / k;
    return newDst;
  }
  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  }
  function lerp(a, b, t, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = a[0] + t * (b[0] - a[0]);
    newDst[1] = a[1] + t * (b[1] - a[1]);
    newDst[2] = a[2] + t * (b[2] - a[2]);
    newDst[3] = a[3] + t * (b[3] - a[3]);
    return newDst;
  }
  function length(v) {
    const v0 = v[0];
    const v1 = v[1];
    const v2 = v[2];
    const v3 = v[3];
    return Math.sqrt(v0 * v0 + v1 * v1 + v2 * v2 + v3 * v3);
  }
  const len = length;
  function lengthSq(v) {
    const v0 = v[0];
    const v1 = v[1];
    const v2 = v[2];
    const v3 = v[3];
    return v0 * v0 + v1 * v1 + v2 * v2 + v3 * v3;
  }
  const lenSq = lengthSq;
  function normalize(v, dst) {
    const newDst = dst ?? new Ctor(4);
    const v0 = v[0];
    const v1 = v[1];
    const v2 = v[2];
    const v3 = v[3];
    const len = Math.sqrt(v0 * v0 + v1 * v1 + v2 * v2 + v3 * v3);
    if (len > 0.00001) {
      newDst[0] = v0 / len;
      newDst[1] = v1 / len;
      newDst[2] = v2 / len;
      newDst[3] = v3 / len;
    } else {
      newDst[0] = 0;
      newDst[1] = 0;
      newDst[2] = 0;
      newDst[3] = 1;
    }
    return newDst;
  }
  function equalsApproximately(a, b) {
    return Math.abs(a[0] - b[0]) < EPSILON && Math.abs(a[1] - b[1]) < EPSILON && Math.abs(a[2] - b[2]) < EPSILON && Math.abs(a[3] - b[3]) < EPSILON;
  }
  function equals(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
  }
  function identity(dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = 0;
    newDst[1] = 0;
    newDst[2] = 0;
    newDst[3] = 1;
    return newDst;
  }
  const tempVec3 = vec3.create();
  const xUnitVec3 = vec3.create();
  const yUnitVec3 = vec3.create();
  function rotationTo(aUnit, bUnit, dst) {
    const newDst = dst ?? new Ctor(4);
    const dot = vec3.dot(aUnit, bUnit);
    if (dot < -0.999999) {
      vec3.cross(xUnitVec3, aUnit, tempVec3);
      if (vec3.len(tempVec3) < 0.000001) {
        vec3.cross(yUnitVec3, aUnit, tempVec3);
      }
      vec3.normalize(tempVec3, tempVec3);
      fromAxisAngle(tempVec3, Math.PI, newDst);
      return newDst;
    } else if (dot > 0.999999) {
      newDst[0] = 0;
      newDst[1] = 0;
      newDst[2] = 0;
      newDst[3] = 1;
      return newDst;
    } else {
      vec3.cross(aUnit, bUnit, tempVec3);
      newDst[0] = tempVec3[0];
      newDst[1] = tempVec3[1];
      newDst[2] = tempVec3[2];
      newDst[3] = 1 + dot;
      return normalize(newDst, newDst);
    }
  }
  const tempQuat1 = new Ctor(4);
  const tempQuat2 = new Ctor(4);
  function sqlerp(a, b, c, d, t, dst) {
    const newDst = dst ?? new Ctor(4);
    slerp(a, d, t, tempQuat1);
    slerp(b, c, t, tempQuat2);
    slerp(tempQuat1, tempQuat2, 2 * t * (1 - t), newDst);
    return newDst;
  }
  return {
    create,
    fromValues,
    set,
    fromAxisAngle,
    toAxisAngle,
    angle,
    multiply,
    mul,
    rotateX,
    rotateY,
    rotateZ,
    slerp,
    inverse,
    conjugate,
    fromMat,
    fromEuler,
    copy,
    clone,
    add,
    subtract,
    sub,
    mulScalar,
    scale,
    divScalar,
    dot,
    lerp,
    length,
    len,
    lengthSq,
    lenSq,
    normalize,
    equalsApproximately,
    equals,
    identity,
    rotationTo,
    sqlerp
  };
}
var cache$1 = new Map;
function getAPI$1(Ctor) {
  let api = cache$1.get(Ctor);
  if (!api) {
    api = getAPIImpl$1(Ctor);
    cache$1.set(Ctor, api);
  }
  return api;
}
function getAPIImpl(Ctor) {
  function create(x, y, z, w) {
    const newDst = new Ctor(4);
    if (x !== undefined) {
      newDst[0] = x;
      if (y !== undefined) {
        newDst[1] = y;
        if (z !== undefined) {
          newDst[2] = z;
          if (w !== undefined) {
            newDst[3] = w;
          }
        }
      }
    }
    return newDst;
  }
  const fromValues = create;
  function set(x, y, z, w, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = x;
    newDst[1] = y;
    newDst[2] = z;
    newDst[3] = w;
    return newDst;
  }
  function ceil(v, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = Math.ceil(v[0]);
    newDst[1] = Math.ceil(v[1]);
    newDst[2] = Math.ceil(v[2]);
    newDst[3] = Math.ceil(v[3]);
    return newDst;
  }
  function floor(v, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = Math.floor(v[0]);
    newDst[1] = Math.floor(v[1]);
    newDst[2] = Math.floor(v[2]);
    newDst[3] = Math.floor(v[3]);
    return newDst;
  }
  function round(v, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = Math.round(v[0]);
    newDst[1] = Math.round(v[1]);
    newDst[2] = Math.round(v[2]);
    newDst[3] = Math.round(v[3]);
    return newDst;
  }
  function clamp(v, min = 0, max = 1, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = Math.min(max, Math.max(min, v[0]));
    newDst[1] = Math.min(max, Math.max(min, v[1]));
    newDst[2] = Math.min(max, Math.max(min, v[2]));
    newDst[3] = Math.min(max, Math.max(min, v[3]));
    return newDst;
  }
  function add(a, b, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = a[0] + b[0];
    newDst[1] = a[1] + b[1];
    newDst[2] = a[2] + b[2];
    newDst[3] = a[3] + b[3];
    return newDst;
  }
  function addScaled(a, b, scale, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = a[0] + b[0] * scale;
    newDst[1] = a[1] + b[1] * scale;
    newDst[2] = a[2] + b[2] * scale;
    newDst[3] = a[3] + b[3] * scale;
    return newDst;
  }
  function subtract(a, b, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = a[0] - b[0];
    newDst[1] = a[1] - b[1];
    newDst[2] = a[2] - b[2];
    newDst[3] = a[3] - b[3];
    return newDst;
  }
  const sub = subtract;
  function equalsApproximately(a, b) {
    return Math.abs(a[0] - b[0]) < EPSILON && Math.abs(a[1] - b[1]) < EPSILON && Math.abs(a[2] - b[2]) < EPSILON && Math.abs(a[3] - b[3]) < EPSILON;
  }
  function equals(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
  }
  function lerp(a, b, t, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = a[0] + t * (b[0] - a[0]);
    newDst[1] = a[1] + t * (b[1] - a[1]);
    newDst[2] = a[2] + t * (b[2] - a[2]);
    newDst[3] = a[3] + t * (b[3] - a[3]);
    return newDst;
  }
  function lerpV(a, b, t, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = a[0] + t[0] * (b[0] - a[0]);
    newDst[1] = a[1] + t[1] * (b[1] - a[1]);
    newDst[2] = a[2] + t[2] * (b[2] - a[2]);
    newDst[3] = a[3] + t[3] * (b[3] - a[3]);
    return newDst;
  }
  function max(a, b, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = Math.max(a[0], b[0]);
    newDst[1] = Math.max(a[1], b[1]);
    newDst[2] = Math.max(a[2], b[2]);
    newDst[3] = Math.max(a[3], b[3]);
    return newDst;
  }
  function min(a, b, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = Math.min(a[0], b[0]);
    newDst[1] = Math.min(a[1], b[1]);
    newDst[2] = Math.min(a[2], b[2]);
    newDst[3] = Math.min(a[3], b[3]);
    return newDst;
  }
  function mulScalar(v, k, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = v[0] * k;
    newDst[1] = v[1] * k;
    newDst[2] = v[2] * k;
    newDst[3] = v[3] * k;
    return newDst;
  }
  const scale = mulScalar;
  function divScalar(v, k, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = v[0] / k;
    newDst[1] = v[1] / k;
    newDst[2] = v[2] / k;
    newDst[3] = v[3] / k;
    return newDst;
  }
  function inverse(v, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = 1 / v[0];
    newDst[1] = 1 / v[1];
    newDst[2] = 1 / v[2];
    newDst[3] = 1 / v[3];
    return newDst;
  }
  const invert = inverse;
  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  }
  function length(v) {
    const v0 = v[0];
    const v1 = v[1];
    const v2 = v[2];
    const v3 = v[3];
    return Math.sqrt(v0 * v0 + v1 * v1 + v2 * v2 + v3 * v3);
  }
  const len = length;
  function lengthSq(v) {
    const v0 = v[0];
    const v1 = v[1];
    const v2 = v[2];
    const v3 = v[3];
    return v0 * v0 + v1 * v1 + v2 * v2 + v3 * v3;
  }
  const lenSq = lengthSq;
  function distance(a, b) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    const dw = a[3] - b[3];
    return Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw);
  }
  const dist = distance;
  function distanceSq(a, b) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    const dw = a[3] - b[3];
    return dx * dx + dy * dy + dz * dz + dw * dw;
  }
  const distSq = distanceSq;
  function normalize(v, dst) {
    const newDst = dst ?? new Ctor(4);
    const v0 = v[0];
    const v1 = v[1];
    const v2 = v[2];
    const v3 = v[3];
    const lenSq = v0 * v0 + v1 * v1 + v2 * v2 + v3 * v3;
    const scale = lenSq > 0 ? 1 / Math.sqrt(lenSq) : 1;
    newDst[0] = v0 * scale;
    newDst[1] = v1 * scale;
    newDst[2] = v2 * scale;
    newDst[3] = v3 * scale;
    return newDst;
  }
  function negate(v, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = -v[0];
    newDst[1] = -v[1];
    newDst[2] = -v[2];
    newDst[3] = -v[3];
    return newDst;
  }
  function copy(v, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = v[0];
    newDst[1] = v[1];
    newDst[2] = v[2];
    newDst[3] = v[3];
    return newDst;
  }
  const clone = copy;
  function multiply(a, b, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = a[0] * b[0];
    newDst[1] = a[1] * b[1];
    newDst[2] = a[2] * b[2];
    newDst[3] = a[3] * b[3];
    return newDst;
  }
  const mul = multiply;
  function divide(a, b, dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = a[0] / b[0];
    newDst[1] = a[1] / b[1];
    newDst[2] = a[2] / b[2];
    newDst[3] = a[3] / b[3];
    return newDst;
  }
  const div = divide;
  function zero(dst) {
    const newDst = dst ?? new Ctor(4);
    newDst[0] = 0;
    newDst[1] = 0;
    newDst[2] = 0;
    newDst[3] = 0;
    return newDst;
  }
  function transformMat4(v, m, dst) {
    const newDst = dst ?? new Ctor(4);
    const x = v[0];
    const y = v[1];
    const z = v[2];
    const w = v[3];
    newDst[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
    newDst[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
    newDst[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
    newDst[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
    return newDst;
  }
  function setLength(a, len, dst) {
    const newDst = dst ?? new Ctor(4);
    normalize(a, newDst);
    return mulScalar(newDst, len, newDst);
  }
  function truncate(a, maxLen, dst) {
    const newDst = dst ?? new Ctor(4);
    if (length(a) > maxLen) {
      return setLength(a, maxLen, newDst);
    }
    return copy(a, newDst);
  }
  function midpoint(a, b, dst) {
    const newDst = dst ?? new Ctor(4);
    return lerp(a, b, 0.5, newDst);
  }
  return {
    create,
    fromValues,
    set,
    ceil,
    floor,
    round,
    clamp,
    add,
    addScaled,
    subtract,
    sub,
    equalsApproximately,
    equals,
    lerp,
    lerpV,
    max,
    min,
    mulScalar,
    scale,
    divScalar,
    inverse,
    invert,
    dot,
    length,
    len,
    lengthSq,
    lenSq,
    distance,
    dist,
    distanceSq,
    distSq,
    normalize,
    negate,
    copy,
    clone,
    multiply,
    mul,
    divide,
    div,
    zero,
    transformMat4,
    setLength,
    truncate,
    midpoint
  };
}
var cache = new Map;
function getAPI(Ctor) {
  let api = cache.get(Ctor);
  if (!api) {
    api = getAPIImpl(Ctor);
    cache.set(Ctor, api);
  }
  return api;
}
function wgpuMatrixAPI(Mat3Ctor, Mat4Ctor, QuatCtor, Vec2Ctor, Vec3Ctor, Vec4Ctor) {
  return {
    mat3: getAPI$3(Mat3Ctor),
    mat4: getAPI$2(Mat4Ctor),
    quat: getAPI$1(QuatCtor),
    vec2: getAPI$5(Vec2Ctor),
    vec3: getAPI$4(Vec3Ctor),
    vec4: getAPI(Vec4Ctor)
  };
}
var {
  mat3,
  mat4,
  quat,
  vec2,
  vec3,
  vec4
} = wgpuMatrixAPI(Float32Array, Float32Array, Float32Array, Float32Array, Float32Array, Float32Array);
var {
  mat3: mat3d,
  mat4: mat4d,
  quat: quatd,
  vec2: vec2d,
  vec3: vec3d,
  vec4: vec4d
} = wgpuMatrixAPI(Float64Array, Float64Array, Float64Array, Float64Array, Float64Array, Float64Array);
var {
  mat3: mat3n,
  mat4: mat4n,
  quat: quatn,
  vec2: vec2n,
  vec3: vec3n,
  vec4: vec4n
} = wgpuMatrixAPI(ZeroArray, Array, Array, Array, Array, Array);

// src/game/camera.ts
class Camera {
  yaw = CAMERA_YAW;
  pitch = 0.93;
  fov = 0.6;
  fx = 0;
  fz = 0;
  dist = 76;
  lx = 0;
  lz = 0;
  shake = 0;
  landing = 0;
  t = 0;
  visualRush = 0;
  visualShake = 0;
  visualLanding = 0;
  eye = [0, 0, 0];
  viewProj = mat4.identity();
  snap(x, z) {
    this.fx = x;
    this.fz = z;
    this.lx = 0;
    this.lz = 0;
  }
  bump(amount) {
    this.shake = Math.min(1.2, this.shake + amount);
  }
  land(amount) {
    this.landing = Math.max(this.landing, amount);
  }
  present(dt, boosting, shake, landing) {
    this.visualRush += ((boosting ? 1 : 0) - this.visualRush) * (1 - Math.exp(-dt * 9));
    this.visualShake = Math.max(this.visualShake * Math.exp(-dt * 6), shake);
    this.visualLanding = Math.max(this.visualLanding * Math.exp(-dt * 14), landing);
  }
  update(x, z, vx, vz, dt, zoom = 0, boosting = false) {
    if (Math.hypot(x - this.fx, z - this.fz) > 100)
      this.snap(x, z);
    this.t += dt;
    const k = 1 - Math.exp(-dt * 2.2);
    this.lx += (vx * 0.35 - this.lx) * k;
    this.lz += (vz * 0.35 - this.lz) * k;
    const f = 1 - Math.exp(-dt * 7);
    this.fx += (x + this.lx - this.fx) * f;
    this.fz += (z + this.lz - this.fz) * f;
    const speed = Math.hypot(vx, vz);
    const rush = boosting;
    this.fov += ((rush ? 0.65 : 0.6) - this.fov) * (1 - Math.exp(-dt * 9));
    const want = 72 + Math.min(speed, 45) * 0.4 + zoom - (rush ? 2.5 : 0);
    this.dist += (want - this.dist) * (1 - Math.exp(-dt * 1.5));
    this.shake *= Math.exp(-dt * 6);
    this.landing *= Math.exp(-dt * 14);
  }
  axes() {
    const fwd = [Math.sin(this.yaw), Math.cos(this.yaw)];
    const right = [-fwd[1], fwd[0]];
    return { fwd, right };
  }
  matrices(aspect) {
    const trauma = Math.max(this.shake, this.visualShake);
    const s = trauma * trauma;
    const jx = s * Math.sin(this.t * 61) * 0.5;
    const jz = s * Math.cos(this.t * 53) * 0.5;
    const target = [this.fx + jx, 0.5 - Math.max(this.landing, this.visualLanding) * 0.9, this.fz + jz];
    const rush = this.visualRush;
    const dist = this.dist - rush * 2.5;
    const h = Math.cos(this.pitch) * dist;
    this.eye = [target[0] - Math.sin(this.yaw) * h, Math.sin(this.pitch) * dist, target[2] - Math.cos(this.yaw) * h];
    const view = mat4.lookAt(this.eye, target, [0, 1, 0]);
    const proj = mat4.perspective(this.fov + rush * 0.05, aspect, 5, 900);
    this.viewProj = mat4.multiply(proj, view);
    return this.viewProj;
  }
  project(x, y, z, w, h) {
    const p = vec4.transformMat4([x, y, z, 1], this.viewProj);
    if (p[3] <= 0)
      return [0, 0, false];
    return [(p[0] / p[3] * 0.5 + 0.5) * w, (0.5 - p[1] / p[3] * 0.5) * h, true];
  }
}
// src/game/input.ts
class Controls {
  keys = new Set;
  chars = new Map;
  dvorak = false;
  steer = 0;
  mux = new URLSearchParams(location.search).has("mux") && parent !== window;
  muxRun = new URLSearchParams(location.search).get("muxRun") ?? "";
  parentOrigin = document.referrer ? new URL(document.referrer).origin : location.origin;
  paused = false;
  mouse = { nx: 0.5, ny: 0.5, buttons: 0 };
  constructor() {
    const mux = this.mux;
    addEventListener("keydown", (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.code === "Escape")
        return;
      if (mux) {
        if (!e.repeat)
          this.forward({ type: "mux-key", kind: "keydown", code: e.code, key: e.key, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey, ctrlKey: e.ctrlKey });
        e.preventDefault();
        return;
      }
      this.key("keydown", e.code, e.key);
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code))
        e.preventDefault();
    });
    addEventListener("keyup", (e) => {
      if (mux) {
        this.forward({ type: "mux-key", kind: "keyup", code: e.code, key: e.key, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey, ctrlKey: e.ctrlKey });
        return;
      }
      this.key("keyup", e.code, e.key);
    });
    addEventListener("blur", () => {
      this.release();
      if (mux)
        this.forward({ type: "mux-release" });
    });
    const canvas = document.getElementById("view");
    if (canvas) {
      canvas.tabIndex = -1;
      for (const type of ["mousemove", "mousedown", "mouseup"])
        canvas.addEventListener(type, (event) => {
          if (type === "mousedown")
            canvas.focus({ preventScroll: true });
          const message = { type: "mux-mouse", nx: event.clientX / innerWidth, ny: event.clientY / innerHeight, buttons: event.buttons };
          if (mux)
            this.forward(message);
          else
            this.pointer(message);
        });
    }
  }
  pointer(message) {
    this.mouse = { nx: Math.max(0, Math.min(1, message.nx)), ny: Math.max(0, Math.min(1, message.ny)), buttons: message.buttons ?? 0 };
  }
  accepts(event) {
    return this.mux && event.source === parent && event.origin === this.parentOrigin && event.data?.run === this.muxRun;
  }
  forward(message) {
    if (this.mux)
      parent.postMessage({ ...message, run: this.muxRun }, this.parentOrigin);
  }
  key(kind, code, key) {
    const lower = key.toLowerCase();
    if (kind === "keyup") {
      this.keys.delete(code);
      const down = this.chars.get(code);
      if (down !== undefined)
        this.keys.delete(down);
      this.chars.delete(code);
      if (code === "MetaLeft" || code === "MetaRight")
        this.release();
      return;
    }
    if (this.keys.has(code))
      return;
    if (lower === "," || lower === "<" || lower === "o" || lower === "'" || lower === '"' || code === "KeyD" && lower === "e")
      this.dvorak = true;
    else if (lower === "w" || lower === "s")
      this.dvorak = false;
    this.keys.add(code);
    this.keys.add(lower);
    this.chars.set(code, lower);
  }
  pressed(code) {
    return this.keys.has(code);
  }
  release() {
    this.keys.clear();
    this.chars.clear();
    this.steer = 0;
    this.mouse.buttons = 0;
  }
  read(dt) {
    if (this.paused) {
      this.keys.clear();
      this.steer = 0;
      return { throttle: 0, brake: 0, steer: 0, handbrake: false, boost: false, gadget: null, engine: false };
    }
    const k = this.keys;
    const up = k.has("KeyW") || k.has("ArrowUp") || k.has("w") || k.has(",") || k.has("<");
    const down = k.has("KeyS") || k.has("ArrowDown") || k.has("s") || k.has("o");
    const left = k.has("KeyA") || k.has("ArrowLeft") || k.has("a");
    const right = k.has("KeyD") || k.has("ArrowRight") || k.has("d") || k.has("e");
    let throttle = up ? 1 : 0;
    let brake = 0;
    if (down) {
      throttle = up ? throttle : -1;
      brake = up ? 1 : 0;
    }
    let target = (left ? 1 : 0) - (right ? 1 : 0);
    let handbrake = k.has("Space") || k.has(" ");
    let boost = k.has("ShiftLeft") || k.has("ShiftRight") || k.has("shift");
    const pad = navigator.getGamepads?.().find((p) => p && p.connected);
    if (pad) {
      const ax = pad.axes[0] ?? 0;
      if (Math.abs(ax) > 0.15)
        target = -ax;
      const rt = pad.buttons[7]?.value ?? 0;
      const lt = pad.buttons[6]?.value ?? 0;
      if (rt > 0.05)
        throttle = rt;
      if (lt > 0.05)
        throttle = rt > 0.05 ? throttle : -lt;
      if (pad.buttons[0]?.pressed || pad.buttons[5]?.pressed)
        handbrake = true;
      if (pad.buttons[1]?.pressed || pad.buttons[2]?.pressed)
        boost = true;
    }
    const rate = target === 0 ? 10 : Math.sign(target) !== Math.sign(this.steer) ? 12 : 6;
    this.steer += Math.max(-rate * dt, Math.min(rate * dt, target - this.steer));
    if (pad && Math.abs(pad.axes[0] ?? 0) > 0.15)
      this.steer = target;
    const g0 = k.has("KeyQ") || k.has("q") || k.has("'") || k.has('"') || k.has("Quote");
    const g1 = k.has(".") || k.has(">") || k.has("Period") || !this.dvorak && k.has("KeyE");
    let gadget = g0 ? 0 : g1 ? 1 : null;
    if (pad?.buttons[4]?.pressed)
      gadget = 0;
    if (pad?.buttons[3]?.pressed)
      gadget = 1;
    const engine = k.has("KeyH") || k.has("h") || !!pad?.buttons[9]?.pressed;
    return { throttle, brake, steer: this.steer, handbrake, boost, gadget, engine };
  }
}
// src/ui/solo-controls.ts
function soloControls(controls) {
  document.getElementById("solo-reset").addEventListener("click", () => location.reload());
  for (const button of document.querySelectorAll(".solo-touch button")) {
    const { code, key } = button.dataset;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      controls.key("keydown", code, key);
    });
    const release = () => controls.key("keyup", code, key);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  }
}
export {
  Camera,
  Controls,
  Hud,
  LocalSession,
  soloControls
};
