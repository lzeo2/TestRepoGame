// solo-check.ts
import assert from "node:assert/strict";

// src/sim/protocol.ts
var DEFAULT_ROOM_CONFIG = {
  teams: 2,
  bots: 0,
  maxPerTeam: 10,
  scoreLimit: 50,
  timeLimit: 10 * 60,
  listed: true,
  name: "Open Skies"
};
var RESPAWN_DELAY = 5;

// src/sim/types.ts
var TICK_RATE = 60;
var TICK_DT = 1 / TICK_RATE;
var SNAPSHOT_RATE = 20;

// src/sim/vehicles.ts
var WEAPONS = {
  cannon20: { id: "cannon20", name: "20mm Vulcan", kind: "gun", damage: 9, splash: 0, rate: 16, speed: 1150, ttl: 1.15, ammo: 600, refill: 15, refillDelay: 2, spread: 0.0025 },
  chaingun30: { id: "chaingun30", name: "30mm Chain Gun", kind: "gun", damage: 16, splash: 4, rate: 10, speed: 900, ttl: 1.5, ammo: 300, refill: 15, refillDelay: 2, spread: 0.004, turret: true },
  gau8: { id: "gau8", name: "GAU-8 Avenger", kind: "gun", damage: 14, splash: 2, rate: 30, speed: 1100, ttl: 1.2, ammo: 1100, refill: 15, refillDelay: 2, spread: 0.005 },
  rockets: { id: "rockets", name: "Hydra 70 Rockets", kind: "rockets", damage: 60, splash: 12, rate: 8, speed: 700, ttl: 4, ammo: 38, refill: 20, refillDelay: 2, spread: 0.015 },
  aim9: { id: "aim9", name: "Heat-Seeker", kind: "missile_lock", damage: 120, splash: 12, rate: 0.25, speed: 280, ttl: 6, ammo: 2, refill: 40, refillDelay: 4, range: 1100, lockCone: 0.08, lockTime: 2.2, turnRate: 1.6 },
  tvmissile: { id: "tvmissile", name: "Radar Missile", kind: "missile_lock", damage: 130, splash: 12, rate: 0.2, speed: 300, ttl: 7, ammo: 2, refill: 40, refillDelay: 4, range: 1500, lockCone: 0.07, lockTime: 2.5, turnRate: 1.5, turret: true },
  hellfire: { id: "hellfire", name: "Hellfire", kind: "missile_lock", damage: 130, splash: 12, rate: 0.25, speed: 260, ttl: 8, ammo: 4, refill: 40, refillDelay: 4, range: 1500, lockCone: 0.07, lockTime: 2.5, turnRate: 1.5, turret: true },
  maverick: { id: "maverick", name: "Maverick", kind: "missile_lock", damage: 150, splash: 14, rate: 0.2, speed: 280, ttl: 8, ammo: 2, refill: 40, refillDelay: 4, range: 1500, lockCone: 0.07, lockTime: 2.5, turnRate: 1.4, turret: true },
  aim47: { id: "aim47", name: "Long-Range Interceptor", kind: "missile_scanner", damage: 160, splash: 16, rate: 0.2, speed: 450, ttl: 22, ammo: 3, refill: 50, refillDelay: 5, range: 8000, lockCone: 0.08, lockTime: 3, turnRate: 1.3, turret: true },
  bomb: { id: "bomb", name: "Bomb", kind: "bomb", damage: 900, splash: 45, rate: 0.6, speed: 0, ttl: 40, ammo: 8, refill: 60, refillDelay: 6, turret: true },
  radarpulse: { id: "radarpulse", name: "Radar Pulse", kind: "pulse", damage: 0, splash: 4000, rate: 1 / 20, speed: 0, ttl: 8, ammo: -1, refill: 0, refillDelay: 0, turret: true }
};
var STEALTH_AA_CEILING = 600;
var STEALTH_LOCK_TIME = 4;
var STEALTH_LOCK_SPOT = 8;
var VEHICLES = {
  fighter: {
    kind: "fighter",
    name: "F/A-18F Super Hornet",
    model: "models/fa18.glb",
    flight: "jet",
    maxHp: 450,
    radius: 8,
    cruise: 135,
    boost: 185,
    stall: 55,
    seatWeapons: [["cannon20", "aim9"], ["tvmissile", null]],
    flares: 12,
    seatNames: ["Pilot", "Weapons Officer"]
  },
  apache: {
    kind: "apache",
    name: "AH-64 Apache",
    model: "models/apache.glb",
    flight: "heli",
    maxHp: 550,
    radius: 7.5,
    cruise: 75,
    boost: 98,
    stall: 0,
    seatWeapons: [["rockets", null], ["chaingun30", "hellfire"]],
    flares: 10,
    seatNames: ["Pilot", "Gunner"]
  },
  warthog: {
    kind: "warthog",
    name: "A-10 Warthog",
    model: "models/a10.glb",
    flight: "jet",
    maxHp: 850,
    radius: 8.5,
    cruise: 105,
    boost: 135,
    stall: 45,
    seatWeapons: [["gau8", "rockets"], ["maverick", null]],
    flares: 16,
    seatNames: ["Pilot", "Weapons Officer"]
  },
  blackbird: {
    kind: "blackbird",
    name: "YF-12 Blackbird",
    model: "models/yf12.glb",
    flight: "jet",
    maxHp: 380,
    radius: 12,
    cruise: 190,
    boost: 260,
    stall: 75,
    seatWeapons: [[null, null], ["aim47", "radarpulse"]],
    flares: 8,
    seatNames: ["Pilot", "Radar Officer"]
  },
  bomber: {
    kind: "bomber",
    name: "B-2 Spirit",
    model: "models/b2.glb",
    flight: "jet",
    maxHp: 900,
    radius: 18,
    cruise: 150,
    boost: 180,
    stall: 70,
    seatWeapons: [["bomb", null], ["bomb", null]],
    flares: 10,
    seatNames: ["Pilot", "Bombardier"],
    stealth: true
  }
};
var VEHICLE_KINDS = Object.keys(VEHICLES);

// src/sim/fleet.ts
var SHIP_SPECS = {
  carrier: {
    kind: "carrier",
    maxHp: 8000,
    halfLength: 166,
    halfWidth: 38,
    deckHeight: 20,
    model: "models/carrier.glb",
    island: { center: [30, 38, 20], half: [8, 18, 22] },
    turrets: [
      { id: "ciws_bow_port", kind: "ciws", mannable: true, offset: [-36, 18, -150] },
      { id: "ciws_bow_stbd", kind: "ciws", mannable: true, offset: [36, 18, -140] },
      { id: "ciws_aft_port", kind: "ciws", mannable: true, offset: [-36, 18, 150] },
      { id: "ciws_island", kind: "ciws", mannable: true, offset: [38, 58, 10] }
    ]
  },
  destroyer: {
    kind: "destroyer",
    maxHp: 3000,
    halfLength: 78,
    halfWidth: 10,
    deckHeight: 9,
    model: "models/destroyer.glb",
    island: { center: [0, 22, -10], half: [8, 13, 16] },
    turrets: [
      { id: "gun_fwd", kind: "gun", mannable: true, offset: [0, 11, -52] },
      { id: "ciws_fwd", kind: "ciws", mannable: true, offset: [0, 30, -24] },
      { id: "ciws_aft", kind: "ciws", mannable: true, offset: [0, 18, 34] }
    ]
  }
};
var AA_RANGE = 1200;
var TURRET_HP = 600;
var SHIP_DAMAGE_SCALE = { gun: 0.15, rockets: 1.6, missile_lock: 3, missile_scanner: 3.5, bomb: 3, aa: 0 };
var SPAWN_PROTECTION = 6;
var FLEET_ORBIT_RADIUS = 3200;
var FLEET_LAP_TIME = 1500;
var FLEET_ANGULAR_SPEED = 2 * Math.PI / FLEET_LAP_TIME;
var CARRIERS = [{ dx: -260, dz: 0 }, { dx: 260, dz: 120 }];
var ESCORTS = [
  { dx: -600, dz: -500 },
  { dx: 600, dz: -500 },
  { dx: 0, dz: 750 }
];
var FLEET = [0, 1, 2, 3].flatMap((team) => {
  const theta = [0, Math.PI, -Math.PI / 2, Math.PI / 2][team];
  const cx = FLEET_ORBIT_RADIUS * Math.sin(theta), cz = FLEET_ORBIT_RADIUS * Math.cos(theta);
  const heading = theta - Math.PI / 2;
  const c = Math.cos(heading), s = Math.sin(heading);
  const local = (dx, dz) => [cx + dx * c + dz * s, 0, cz - dx * s + dz * c];
  return [
    ...CARRIERS.map((o, i) => ({ id: i === 0 ? `t${team}-carrier` : `t${team}-carrier${i + 1}`, team, kind: "carrier", position: local(o.dx, o.dz), heading })),
    ...ESCORTS.map((e, i) => ({ id: `t${team}-dd${i + 1}`, team, kind: "destroyer", position: local(e.dx, e.dz), heading }))
  ];
});
function shipPose(ship, t, out) {
  const phi = FLEET_ANGULAR_SPEED * Math.max(0, t);
  const c = Math.cos(phi), s = Math.sin(phi);
  const x0 = ship.position[0], z0 = ship.position[2];
  const o = out ?? { position: [0, 0, 0], heading: 0, velocity: [0, 0, 0], yawRate: 0 };
  const x = x0 * c + z0 * s, z = -x0 * s + z0 * c;
  o.position[0] = x;
  o.position[1] = 0;
  o.position[2] = z;
  o.heading = ship.heading + phi;
  o.velocity[0] = FLEET_ANGULAR_SPEED * z;
  o.velocity[1] = 0;
  o.velocity[2] = -FLEET_ANGULAR_SPEED * x;
  o.yawRate = FLEET_ANGULAR_SPEED;
  return o;
}
function shipToWorld(ship, local) {
  const c = Math.cos(ship.heading), s = Math.sin(ship.heading);
  return [ship.position[0] + local[0] * c + local[2] * s, ship.position[1] + local[1], ship.position[2] - local[0] * s + local[2] * c];
}
function worldToShip(ship, p) {
  const dx = p[0] - ship.position[0], dz = p[2] - ship.position[2];
  const c = Math.cos(ship.heading), s = Math.sin(ship.heading);
  return [dx * c - dz * s, p[1] - ship.position[1], dx * s + dz * c];
}

// src/sim/geography.ts
var WORLD_SIZE = 1e4;
var WORLD_HALF = WORLD_SIZE / 2;
var WATER_LEVEL = 0;
var CEILING = 3500;
var WORLD_SEED = 1464421959;
var SEA_FLOOR = -40;
var MESH_CELL = 25;
var MESH_SEGMENTS = WORLD_SIZE / MESH_CELL;
var JITTER = 0.26;
var SPAWN_CLEARANCE = { jet: 2.2, heli: 1.9 };
var CARRIER = SHIP_SPECS.carrier;
var DECK_LAYOUT = {
  catapults: [[-14, 40], [6, 52], [-14, 78], [6, 90], [-14, 116], [6, 128]],
  heloSpots: [[-27, 92], [-27, 124], [-27, 154], [24, 120], [24, 150]]
};
var NS = FLEET.length;
var POSED = FLEET.map((sh) => ({ ...sh, position: [sh.position[0], 0, sh.position[2]] }));
var SIN = new Float64Array(NS);
var COS = new Float64Array(NS);
var VEL = FLEET.map(() => [0, 0, 0]);
var ACTIVE = new Uint8Array(NS).fill(1);
var TEAM_ON = new Uint8Array(NS).fill(1);
var ALIVE = new Uint8Array(NS).fill(1);
var SOLID = new Uint8Array(NS).fill(1);
var SINK_SOLID_TIME = 20;
var CARRIERS_OF = [[], [], [], []];
FLEET.forEach((sh, i) => {
  if (sh.kind === "carrier")
    CARRIERS_OF[sh.team].push(i);
});
var REACH = new Float64Array(NS);
var TOP = new Float64Array(NS);
FLEET.forEach((sh, i) => {
  const sp = SHIP_SPECS[sh.kind];
  SIN[i] = Math.sin(sh.heading);
  COS[i] = Math.cos(sh.heading);
  REACH[i] = Math.hypot(sp.halfLength, sp.halfWidth) + 1;
  TOP[i] = Math.max(sp.deckHeight, sp.island.center[1] + sp.island.half[1]);
});
var fleetTime = 0;
var fleetTeams = 4;
var activeShips = POSED.slice();
var poseScratch = { position: [0, 0, 0], heading: 0, velocity: [0, 0, 0] };
var SHIP_INDEX = new Map(FLEET.map((sh, i) => [sh.id, i]));
function setFleetState(matchTime, teams) {
  fleetTime = Math.max(0, matchTime);
  const n = Math.max(0, Math.min(4, Math.floor(teams)));
  let changed = n !== fleetTeams;
  fleetTeams = n;
  for (let i = 0;i < NS; i++) {
    shipPose(FLEET[i], fleetTime, poseScratch);
    const P = POSED[i];
    P.position[0] = poseScratch.position[0];
    P.position[2] = poseScratch.position[2];
    P.heading = poseScratch.heading;
    SIN[i] = Math.sin(P.heading);
    COS[i] = Math.cos(P.heading);
    VEL[i][0] = poseScratch.velocity[0];
    VEL[i][2] = poseScratch.velocity[2];
    TEAM_ON[i] = FLEET[i].team < n ? 1 : 0;
  }
  if (refreshActive() || changed)
    activeShips = POSED.filter((_, i) => ACTIVE[i] === 1);
  for (const base of AIRBASES)
    refreshBase(base);
}
function refreshActive() {
  let changed = false;
  for (let i = 0;i < NS; i++) {
    const a = TEAM_ON[i] && SOLID[i] ? 1 : 0;
    if (ACTIVE[i] !== a) {
      ACTIVE[i] = a;
      changed = true;
    }
  }
  return changed;
}
function setShipStates(ships, now = Infinity) {
  if (!ships)
    return;
  for (const st of ships) {
    const i = SHIP_INDEX.get(st.id);
    if (i === undefined)
      continue;
    ALIVE[i] = st.sunk ? 0 : 1;
    SOLID[i] = !st.sunk || now - st.sunkAt < SINK_SOLID_TIME ? 1 : 0;
  }
  if (refreshActive())
    activeShips = POSED.filter((_, i) => ACTIVE[i] === 1);
  for (const base of AIRBASES)
    refreshBase(base);
}
function fleetState() {
  return { matchTime: fleetTime, teams: fleetTeams };
}
function posedFleet() {
  return activeShips;
}
function posedShip(id) {
  const i = SHIP_INDEX.get(id);
  return i === undefined ? null : POSED[i];
}
function carrierIndex(team) {
  const list = CARRIERS_OF[team];
  for (const i of list)
    if (ALIVE[i])
      return i;
  return list[0];
}
function carrierOf(team) {
  return POSED[carrierIndex(team)];
}
var L = { x: 0, z: 0 };
function toLocal(i, x, z) {
  const P = POSED[i].position;
  const dx = x - P[0], dz = z - P[2], c = COS[i], s = SIN[i];
  L.x = dx * c - dz * s;
  L.z = dx * s + dz * c;
}
function toWorldInto(i, lx, ly, lz, out) {
  const P = POSED[i].position, c = COS[i], s = SIN[i];
  out[0] = P[0] + lx * c + lz * s;
  out[1] = ly;
  out[2] = P[2] - lx * s + lz * c;
  return out;
}
function refreshBase(base) {
  const i = carrierIndex(base.team);
  base.center[0] = POSED[i].position[0];
  base.center[2] = POSED[i].position[2];
  base.heading = POSED[i].heading;
  base.helipads.forEach((h, k) => toWorldInto(i, DECK_LAYOUT.heloSpots[k][0], CARRIER.deckHeight, DECK_LAYOUT.heloSpots[k][1], h));
}
var AIRBASES = [0, 1, 2, 3].map((team) => {
  const c = carrierOf(team);
  const base = {
    team,
    heading: c.heading,
    center: [c.position[0], CARRIER.deckHeight, c.position[2]],
    runwayLength: CARRIER.halfLength * 2,
    runwayWidth: CARRIER.halfWidth * 2,
    safeRadius: AA_RANGE,
    helipads: DECK_LAYOUT.heloSpots.slice(0, 4).map(() => [0, 0, 0])
  };
  refreshBase(base);
  return base;
});
function hash2(x, z, seed) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ seed;
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
}
function noise2(x, z, seed = WORLD_SEED) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
function fbm(x, z, seed, octaves) {
  let sum = 0, amp = 0.5, f = 1;
  for (let o = 0;o < octaves; o++) {
    sum += noise2(x * f, z * f, seed + o * 101) * amp;
    f *= 2.03;
    amp *= 0.5;
  }
  return sum;
}
function ridged(x, z, seed, octaves) {
  let sum = 0, amp = 0.5, f = 1, w = 1;
  for (let o = 0;o < octaves; o++) {
    let n = 1 - Math.abs(noise2(x * f, z * f, seed + o * 131));
    n *= n * w;
    w = Math.min(1, n * 2);
    sum += n * amp;
    f *= 2.1;
    amp *= 0.5;
  }
  return sum;
}
function smooth(a, b, x) {
  const t = x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a);
  return t * t * (3 - 2 * t);
}
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = s + 1831565813 >>> 0;
    let t = s;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var LAUNCH_LANE_LENGTH = 1500;
var FLEET_RING_HALF = 1000;
function fleetClearance(x, z) {
  return Math.abs(Math.hypot(x, z) - FLEET_ORBIT_RADIUS) - FLEET_RING_HALF;
}
function nearBase(x, z, margin) {
  return fleetClearance(x, z) < margin;
}
var ARCHIPELAGO_RADIUS = 1700;
function layout(seed) {
  const rand = seededRandom(seed ^ 88701);
  const blobs = [];
  const names = [];
  const peaks = [];
  blobs.push({ x: 0, z: 0, r: 820, amp: 1 });
  names.push({ name: "Mainland", x: 0, z: 0, radius: 900, height: 0 });
  for (let i = 0;i < 3; i++) {
    const a = i / 3 * Math.PI * 2 + rand() * 0.8, d = 450 + rand() * 350;
    blobs.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, r: 420 + rand() * 220, amp: 0.9 });
  }
  for (let i = 0, tries = 0;i < 4 && tries < 200; tries++) {
    const a = rand() * Math.PI * 2, d = 1050 + rand() * 350, r = 200 + rand() * 180;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (blobs.some((B) => Math.hypot(B.x - x, B.z - z) < B.r * 0.6 + r))
      continue;
    blobs.push({ x, z, r, amp: 0.8 });
    names.push({ name: `Isle ${names.length + 1}`, x, z, radius: r, height: 0 });
    i++;
  }
  const pa = rand() * Math.PI * 2;
  peaks.push({ x: Math.cos(pa) * 260, z: Math.sin(pa) * 260, r: 600, h: 430 + rand() * 80 });
  peaks.push({ x: Math.cos(pa + 2.6) * 520, z: Math.sin(pa + 2.6) * 520, r: 420, h: 280 + rand() * 60 });
  for (let i = 0, tries = 0;i < 9 && tries < 2000; tries++) {
    const a = rand() * Math.PI * 2, d = 4500 + rand() * 450, r = 90 + rand() * 140;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (Math.abs(x) > WORLD_HALF - 250 || Math.abs(z) > WORLD_HALF - 250)
      continue;
    if (nearBase(x, z, r * 1.6 + 150))
      continue;
    blobs.push({ x, z, r, amp: 0.6 + rand() * 0.35 });
    i++;
  }
  return { blobs, peaks, names };
}
var layoutSeed = WORLD_SEED;
var LAYOUT = layout(layoutSeed);
var ISLANDS = LAYOUT.names;
var N = MESH_SEGMENTS;
var STRIDE = N + 1;
var BOUND_BLOCK = 500;
var BN = WORLD_SIZE / BOUND_BLOCK;
var baked = null;
function bake(seed) {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const { blobs, peaks } = LAYOUT;
  const h = new Float32Array(STRIDE * STRIDE);
  const vx = new Float32Array(STRIDE * STRIDE);
  const vz = new Float32Array(STRIDE * STRIDE);
  const diag = new Uint8Array(N * N);
  const land = new Float32Array(STRIDE * STRIDE);
  const IB = 500, IN = WORLD_SIZE / IB;
  const blobIndex = [];
  for (let bz = 0;bz < IN; bz++)
    for (let bx = 0;bx < IN; bx++) {
      const cx = -WORLD_HALF + (bx + 0.5) * IB, cz = -WORLD_HALF + (bz + 0.5) * IB;
      blobIndex.push(blobs.filter((B) => Math.hypot(cx - B.x, cz - B.z) < B.r * 1.2 + 310 + 360));
    }
  for (let j = 0;j <= N; j++) {
    for (let i = 0;i <= N; i++) {
      const k = j * STRIDE + i;
      const edge = i === 0 || j === 0 || i === N || j === N;
      const jx = edge ? 0 : (hash2(i, j, seed ^ 4369) - 0.5) * 2 * JITTER * MESH_CELL;
      const jz = edge ? 0 : (hash2(i, j, seed ^ 8738) - 0.5) * 2 * JITTER * MESH_CELL;
      const x = -WORLD_HALF + i * MESH_CELL + jx, z = -WORLD_HALF + j * MESH_CELL + jz;
      vx[k] = x;
      vz[k] = z;
      const near = blobIndex[Math.min(IN - 1, Math.floor((z + WORLD_HALF) / IB)) * IN + Math.min(IN - 1, Math.floor((x + WORLD_HALF) / IB))];
      if (near.length === 0) {
        h[k] = SEA_FLOOR;
        continue;
      }
      const wx = x + fbm(x * 0.0009, z * 0.0009, seed + 7, 4) * 320;
      const wz = z + fbm(x * 0.0009 + 31.7, z * 0.0009 - 12.3, seed + 9, 4) * 320;
      let m = 0;
      for (let b = 0;b < near.length; b++) {
        const B = near[b];
        const dx = wx - B.x, dz = wz - B.z;
        const d2 = (dx * dx + dz * dz) / (B.r * B.r);
        if (d2 >= 1.44)
          continue;
        const v = (1 - smooth(0.25, 1.2, Math.sqrt(d2))) * B.amp;
        if (v > m)
          m = v;
      }
      if (m > 0)
        m -= (fbm(x * 0.0016, z * 0.0016, seed + 13, 3) * 0.5 + 0.25) * 0.42 * smooth(0, 0.6, m) * (1 - smooth(0.6, 1, m) * 0.5);
      if (m <= 0.001) {
        h[k] = SEA_FLOOR;
        continue;
      }
      land[k] = m;
      const hills = (fbm(x * 0.0011, z * 0.0011, seed + 21, 4) * 0.5 + 0.5) * 120;
      const mtn = ridged(wx * 0.0011, wz * 0.0011, seed + 33, 4) * 200 * smooth(0.45, 1, m);
      let e = -30 + m * 95 + (hills + mtn) * smooth(0.2, 0.75, m);
      for (const P of peaks) {
        const d = Math.hypot(x - P.x, z - P.z) / P.r;
        if (d < 1) {
          const f = 1 - d;
          e += P.h * f * f * (3 - 2 * f) * (0.8 + 0.4 * ridged(x * 0.002, z * 0.002, seed + 41, 2));
        }
      }
      const cn = Math.abs(noise2(wx * 0.0011 + 5.1, wz * 0.0011 - 2.7, seed + 55));
      const ch = 1 - smooth(0.035, 0.09, cn);
      if (ch > 0 && e > -2)
        e = e + (Math.min(e, -4 + cn * 120) - e) * ch * smooth(0.25, 0.5, m);
      h[k] = Math.max(SEA_FLOOR, e);
    }
  }
  erode(h, land, seed);
  const talus = 38;
  for (let j = 1;j < N; j++)
    for (let i = 1;i < N; i++) {
      const k = j * STRIDE + i;
      const avg = (h[k - 1] + h[k + 1] + h[k - STRIDE] + h[k + STRIDE]) * 0.25;
      if (h[k] - avg > talus)
        h[k] = avg + talus;
    }
  const tmp = new Float32Array(h.length);
  for (let pass = 0;pass < 3; pass++) {
    tmp.set(h);
    for (let j = 1;j < N; j++)
      for (let i = 1;i < N; i++) {
        const k = j * STRIDE + i;
        if (tmp[k] <= 0)
          continue;
        h[k] = tmp[k] * 0.4 + (tmp[k - 1] + tmp[k + 1] + tmp[k - STRIDE] + tmp[k + STRIDE]) * 0.15;
      }
  }
  for (let k = 0;k < h.length; k++) {
    if (h[k] <= -12)
      continue;
    const rc = Math.hypot(vx[k], vz[k]);
    if (rc < FLEET_ORBIT_RADIUS && rc > ARCHIPELAGO_RADIUS - 250)
      h[k] = Math.min(h[k], -1 - (rc - (ARCHIPELAGO_RADIUS - 250)) * 0.08);
    const d = fleetClearance(vx[k], vz[k]);
    if (d < 700) {
      const t = smooth(0, 700, d);
      h[k] = Math.min(h[k], -12 + (h[k] + 12) * t);
    }
  }
  for (let j = 0;j < N; j++)
    for (let i = 0;i < N; i++)
      diag[j * N + i] = hash2(i, j, seed ^ 13107) < 0.5 ? 0 : 1;
  const bound = new Float32Array(BN * BN).fill(WATER_LEVEL);
  for (let j = 0;j <= N; j++)
    for (let i = 0;i <= N; i++) {
      const k = j * STRIDE + i;
      const bx = Math.min(BN - 1, Math.floor((vx[k] + WORLD_HALF) / BOUND_BLOCK));
      const bz = Math.min(BN - 1, Math.floor((vz[k] + WORLD_HALF) / BOUND_BLOCK));
      for (let dz = -1;dz <= 1; dz++)
        for (let dx = -1;dx <= 1; dx++) {
          const X = bx + dx, Z = bz + dz;
          if (X < 0 || Z < 0 || X >= BN || Z >= BN)
            continue;
          const o = Z * BN + X;
          if (h[k] > bound[o])
            bound[o] = h[k];
        }
    }
  const ms = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
  return { seed, h, vx, vz, diag, bound, ms };
}
function erode(h, land, seed) {
  const rand = seededRandom(seed ^ 58381);
  const drops = 14000;
  const inertia = 0.3, capacityK = 3, depositK = 0.3, erodeK = 0.25, evap = 0.03, gravity = 4, maxSteps = 40;
  const hAt = (x, y) => {
    const i = x | 0, j = y | 0, u = x - i, v = y - j, k = j * STRIDE + i;
    return h[k] * (1 - u) * (1 - v) + h[k + 1] * u * (1 - v) + h[k + STRIDE] * (1 - u) * v + h[k + STRIDE + 1] * u * v;
  };
  for (let d = 0;d < drops; d++) {
    let x = 1 + rand() * (N - 2), y = 1 + rand() * (N - 2);
    if (land[(y | 0) * STRIDE + (x | 0)] < 0.3)
      continue;
    let dx = 0, dy = 0, speed = 1, water = 1, sediment = 0;
    for (let s = 0;s < maxSteps; s++) {
      const i = x | 0, j = y | 0, u = x - i, v = y - j, k = j * STRIDE + i;
      const h00 = h[k], h10 = h[k + 1], h01 = h[k + STRIDE], h11 = h[k + STRIDE + 1];
      const gx = (h10 - h00) * (1 - v) + (h11 - h01) * v;
      const gy = (h01 - h00) * (1 - u) + (h11 - h10) * u;
      const hOld = h00 * (1 - u) * (1 - v) + h10 * u * (1 - v) + h01 * (1 - u) * v + h11 * u * v;
      dx = dx * inertia - gx * (1 - inertia);
      dy = dy * inertia - gy * (1 - inertia);
      const len = Math.hypot(dx, dy);
      if (len < 0.000001)
        break;
      dx /= len;
      dy /= len;
      x += dx;
      y += dy;
      if (x < 1 || y < 1 || x >= N - 1 || y >= N - 1)
        break;
      const hNew = hAt(x, y);
      const dh = hNew - hOld;
      if (hOld < -2)
        break;
      const cap = Math.max(-dh * speed * water * capacityK, 0.01);
      if (sediment > cap || dh > 0) {
        const amt = dh > 0 ? Math.min(dh, sediment) : (sediment - cap) * depositK;
        sediment -= amt;
        h[k] += amt * (1 - u) * (1 - v);
        h[k + 1] += amt * u * (1 - v);
        h[k + STRIDE] += amt * (1 - u) * v;
        h[k + STRIDE + 1] += amt * u * v;
      } else {
        const amt = Math.min((cap - sediment) * erodeK, -dh);
        h[k] -= amt * (1 - u) * (1 - v);
        h[k + 1] -= amt * u * (1 - v);
        h[k + STRIDE] -= amt * (1 - u) * v;
        h[k + STRIDE + 1] -= amt * u * v;
        sediment += amt;
      }
      speed = Math.sqrt(Math.max(0, speed * speed - dh * gravity));
      water *= 1 - evap;
    }
  }
}
function world() {
  if (!baked || baked.seed !== layoutSeed)
    baked = bake(layoutSeed);
  return baked;
}
var triScratch = { h: 0 };
function inTri(w, k0, k1, k2, x, z) {
  const x0 = w.vx[k0], z0 = w.vz[k0], x1 = w.vx[k1], z1 = w.vz[k1], x2 = w.vx[k2], z2 = w.vz[k2];
  const det = (z1 - z2) * (x0 - x2) + (x2 - x1) * (z0 - z2);
  const l0 = ((z1 - z2) * (x - x2) + (x2 - x1) * (z - z2)) / det;
  const l1 = ((z2 - z0) * (x - x2) + (x0 - x2) * (z - z2)) / det;
  const l2 = 1 - l0 - l1;
  const e = -0.000001;
  if (l0 < e || l1 < e || l2 < e)
    return false;
  const h2 = w.h[k2];
  triScratch.h = h2 + l0 * (w.h[k0] - h2) + l1 * (w.h[k1] - h2);
  return true;
}
function cellHeight(w, i, j, x, z) {
  if (i < 0 || j < 0 || i >= N || j >= N)
    return false;
  const a = j * STRIDE + i, b = a + 1, c = a + STRIDE, d = c + 1;
  if (w.diag[j * N + i] === 0)
    return inTri(w, a, c, b, x, z) || inTri(w, b, c, d, x, z);
  return inTri(w, a, c, d, x, z) || inTri(w, a, d, b, x, z);
}
var SEARCH = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
function terrainMeshHeight(x, z) {
  if (!(x > -WORLD_HALF && x < WORLD_HALF && z > -WORLD_HALF && z < WORLD_HALF))
    return SEA_FLOOR;
  const w = world();
  const gx = (x + WORLD_HALF) / MESH_CELL, gz = (z + WORLD_HALF) / MESH_CELL;
  const i = Math.floor(gx), j = Math.floor(gz);
  const sx = gx - i < 0.5 ? -1 : 1, sz = gz - j < 0.5 ? -1 : 1;
  if (cellHeight(w, i, j, x, z))
    return triScratch.h;
  if (cellHeight(w, i + sx, j, x, z))
    return triScratch.h;
  if (cellHeight(w, i, j + sz, x, z))
    return triScratch.h;
  if (cellHeight(w, i + sx, j + sz, x, z))
    return triScratch.h;
  for (const [di, dj] of SEARCH)
    if (cellHeight(w, i + di, j + dj, x, z))
      return triScratch.h;
  const k = Math.min(N, Math.max(0, Math.round(gz))) * STRIDE + Math.min(N, Math.max(0, Math.round(gx)));
  return w.h[k];
}
function shipIndexAt(x, z) {
  for (let i = 0;i < NS; i++) {
    if (!ACTIVE[i])
      continue;
    const P = POSED[i].position, r = REACH[i];
    const dx = x - P[0], dz = z - P[2];
    if (dx > r || dx < -r || dz > r || dz < -r)
      continue;
    toLocal(i, x, z);
    const sp = SHIP_SPECS[FLEET[i].kind];
    if (Math.abs(L.x) <= sp.halfWidth && Math.abs(L.z) <= sp.halfLength)
      return i;
  }
  return -1;
}
function shipAt(x, z) {
  const i = shipIndexAt(x, z);
  return i < 0 ? null : POSED[i];
}
function shipHeightIdx(i) {
  const sp = SHIP_SPECS[FLEET[i].kind];
  const I = sp.island;
  if (Math.abs(L.x - I.center[0]) <= I.half[0] && Math.abs(L.z - I.center[2]) <= I.half[2])
    return I.center[1] + I.half[1];
  return sp.deckHeight;
}
var DECK_V = [0, 0, 0];
function deckVelocity(x, z) {
  const i = shipIndexAt(x, z);
  if (i < 0)
    return null;
  const w = FLEET_ANGULAR_SPEED;
  DECK_V[0] = w * z;
  DECK_V[1] = 0;
  DECK_V[2] = -w * x;
  return DECK_V;
}
function shipBound(x, z, margin) {
  let b = WATER_LEVEL;
  for (let i = 0;i < NS; i++) {
    if (!ACTIVE[i])
      continue;
    const P = POSED[i].position, r = REACH[i] + margin;
    if (Math.abs(x - P[0]) <= r && Math.abs(z - P[2]) <= r && TOP[i] > b)
      b = TOP[i];
  }
  return b;
}
function groundHeight(x, z) {
  if (!(x > -WORLD_HALF && x < WORLD_HALF && z > -WORLD_HALF && z < WORLD_HALF))
    return WATER_LEVEL;
  const i = shipIndexAt(x, z);
  if (i >= 0)
    return Math.max(shipHeightIdx(i), terrainGround(x, z));
  const w = world();
  const bi = Math.floor((x + WORLD_HALF) / BOUND_BLOCK), bj = Math.floor((z + WORLD_HALF) / BOUND_BLOCK);
  if (w.bound[bj * BN + bi] <= WATER_LEVEL)
    return WATER_LEVEL;
  return terrainGround(x, z);
}
function terrainGround(x, z) {
  const h = terrainMeshHeight(x, z);
  return h > WATER_LEVEL ? h : WATER_LEVEL;
}
function heightBound(x, z) {
  if (!(x > -WORLD_HALF && x < WORLD_HALF && z > -WORLD_HALF && z < WORLD_HALF))
    return WATER_LEVEL;
  const w = world();
  const t = w.bound[Math.floor((z + WORLD_HALF) / BOUND_BLOCK) * BN + Math.floor((x + WORLD_HALF) / BOUND_BLOCK)];
  const s = shipBound(x, z, BOUND_BLOCK);
  return s > t ? s : t;
}
function isWater(x, z) {
  if (shipIndexAt(x, z) >= 0)
    return false;
  return terrainMeshHeight(x, z) <= WATER_LEVEL;
}
function onRunway(x, z) {
  const i = shipIndexAt(x, z);
  if (i < 0 || FLEET[i].kind !== "carrier")
    return false;
  return shipHeightIdx(i) === CARRIER.deckHeight;
}
function inSafeZone(team, p) {
  if (p[1] > CEILING)
    return false;
  for (let i = 0;i < NS; i++) {
    if (!ACTIVE[i] || !ALIVE[i] || FLEET[i].team !== team)
      continue;
    const P = POSED[i].position;
    const dx = p[0] - P[0], dz = p[2] - P[2];
    if (dx * dx + dz * dz < AA_RANGE * AA_RANGE)
      return true;
  }
  return false;
}
function spawnPoint(team, kind, index) {
  const k = Math.max(0, Math.floor(index));
  let live = 0;
  for (const c of CARRIERS_OF[team])
    if (ALIVE[c])
      live++;
  let ci = CARRIERS_OF[team][0];
  if (live > 0) {
    let n = k % live;
    for (const c of CARRIERS_OF[team])
      if (ALIVE[c] && n-- === 0) {
        ci = c;
        break;
      }
  }
  const i = live > 0 ? Math.floor(k / live) : k;
  const deck = CARRIER.deckHeight;
  const position = [0, 0, 0];
  if (kind === "apache") {
    const spots = DECK_LAYOUT.heloSpots;
    const [x, z] = spots[i % spots.length];
    return { position: toWorldInto(ci, x, deck + SPAWN_CLEARANCE.heli, z, position), yaw: POSED[ci].heading, onGround: true };
  }
  const cats = DECK_LAYOUT.catapults;
  const [x, z] = cats[i % cats.length];
  return { position: toWorldInto(ci, x, deck + SPAWN_CLEARANCE.jet, z, position), yaw: POSED[ci].heading, onGround: true };
}
function segmentBox(i, a, b, center, half) {
  toLocal(i, a[0], a[2]);
  const { x: ax, z: az } = L;
  toLocal(i, b[0], b[2]);
  const { x: bx, z: bz } = L;
  let t0 = 0, t1 = 1;
  for (let k = 0;k < 3; k++) {
    const pa = k === 0 ? ax : k === 1 ? a[1] : az, pb = k === 0 ? bx : k === 1 ? b[1] : bz;
    const d = pb - pa, lo = center[k] - half[k], hi = center[k] + half[k];
    if (Math.abs(d) < 0.000000001) {
      if (pa < lo || pa > hi)
        return null;
      continue;
    }
    let u0 = (lo - pa) / d, u1 = (hi - pa) / d;
    if (u0 > u1) {
      const t = u0;
      u0 = u1;
      u1 = t;
    }
    if (u0 > t0)
      t0 = u0;
    if (u1 < t1)
      t1 = u1;
    if (t0 > t1)
      return null;
  }
  return t0;
}
var hullCenter = {};
var hullHalf = {};
for (const k of Object.keys(SHIP_SPECS)) {
  const sp = SHIP_SPECS[k];
  hullCenter[k] = [0, (sp.deckHeight - 15) / 2, 0];
  hullHalf[k] = [sp.halfWidth, (sp.deckHeight + 15) / 2, sp.halfLength];
}
function segmentHitsShip(a, b) {
  let best = null;
  for (let i = 0;i < NS; i++) {
    if (!ACTIVE[i])
      continue;
    const sp = SHIP_SPECS[FLEET[i].kind];
    const r = REACH[i] + 5;
    const P = POSED[i].position;
    if (Math.max(a[0], b[0]) < P[0] - r || Math.min(a[0], b[0]) > P[0] + r || Math.max(a[2], b[2]) < P[2] - r || Math.min(a[2], b[2]) > P[2] + r)
      continue;
    if (Math.min(a[1], b[1]) > TOP[i])
      continue;
    const hull = segmentBox(i, a, b, hullCenter[sp.kind], hullHalf[sp.kind]);
    if (hull !== null && (best === null || hull < best))
      best = hull;
    const isl = segmentBox(i, a, b, sp.island.center, sp.island.half);
    if (isl !== null && (best === null || isl < best))
      best = isl;
  }
  return best;
}
var MAX_SLOPE = 9;
function segmentHitsGround(a, b) {
  const t = segmentHitsTerrain(a, b), s = segmentHitsShip(a, b);
  return t === null ? s : s === null ? t : Math.min(t, s);
}
function segmentHitsTerrain(a, b) {
  const ax = a[0], ay = a[1], az = a[2];
  const dx = b[0] - ax, dy = b[1] - ay, dz = b[2] - az;
  const minY = ay < b[1] ? ay : b[1];
  const horiz = Math.sqrt(dx * dx + dz * dz);
  if (minY > WATER_LEVEL) {
    let bound = Math.max(heightBound(ax, az), heightBound(b[0], b[2]));
    if (horiz > BOUND_BLOCK * 0.5) {
      const n = Math.ceil(horiz / (BOUND_BLOCK * 0.5));
      for (let i = 1;i < n; i++)
        bound = Math.max(bound, heightBound(ax + dx * i / n, az + dz * i / n));
    }
    if (minY > bound)
      return null;
  }
  const g0 = ay - terrainGround(ax, az);
  if (g0 <= 0)
    return 0;
  const len = Math.sqrt(horiz * horiz + dy * dy);
  if (len < 0.000000001)
    return null;
  const vert = Math.abs(dy) / Math.max(horiz, 0.000000001);
  const minStep = Math.min(1, 1.5 / len);
  let t = 0, gap = g0;
  while (t < 1) {
    let step = horiz > 0.000000001 ? gap / (MAX_SLOPE + vert) / horiz : gap / Math.max(Math.abs(dy), 0.000000001);
    if (step < minStep)
      step = minStep;
    let t1 = t + step;
    if (t1 > 1)
      t1 = 1;
    const g1 = ay + dy * t1 - terrainGround(ax + dx * t1, az + dz * t1);
    if (g1 <= 0) {
      let lo = t, hi = t1;
      for (let k = 0;k < 18; k++) {
        const mid = (lo + hi) * 0.5;
        if (ay + dy * mid - terrainGround(ax + dx * mid, az + dz * mid) <= 0)
          hi = mid;
        else
          lo = mid;
      }
      return hi;
    }
    t = t1;
    gap = g1;
  }
  return null;
}
var worldQuery = { groundHeight, onRunway, isWater, half: WORLD_HALF, ceiling: CEILING };

// src/sim/flight.ts
var NEUTRAL_INPUT = { aim: null, throttle: 0, roll: 0, yaw: 0, pitch: 0, boost: false, brake: false };
var GRAVITY = 9.81;
var DEG = Math.PI / 180;
var CAT_DECK_MIN_HEIGHT = 10;
var CAT_END_SPEED = 1.3;
var CAT_STROKE_TIME = 2.2;
var YAW_TURN_GRIP = 25;
var DIRECT_LEVEL_GAIN = 1.5;
var AIRBRAKE_TURN_BONUS = 1.25;
var PARK_BRAKE = 6;
var HELI_STRAFE_ROLL = 0.45;
var HELI_FLIP_ROLL = 0.7;
var HOVER_COLLECTIVE = 0.5;
var JET = {
  fighter: {
    thrust: 20,
    throttleRate: 0.7,
    cornerSpeed: 92,
    cornerRate: 1.1,
    minRateFrac: 0.35,
    pushFrac: 0.6,
    rollRate: 4,
    yawRate: 0.44,
    rollRef: 70,
    yawTurnRate: 0.96,
    yawBank: 30 * DEG,
    pitchResponse: 11,
    rollResponse: 15,
    yawResponse: 8,
    pitchGain: 2.8,
    rollGain: 4,
    yawGain: 1.8,
    grip: 8,
    induced: 0.035,
    pathGravity: 0.5,
    airbrake: 3.5,
    wheelBrake: 10,
    sideLift: 0.6,
    bankTurn: 0.5,
    maxGroundPitch: 13 * DEG,
    gearHeight: 2,
    bellyHeight: 1
  },
  warthog: {
    thrust: 11,
    throttleRate: 0.55,
    cornerSpeed: 70,
    cornerRate: 1,
    minRateFrac: 0.4,
    pushFrac: 0.6,
    rollRate: 2.6,
    yawRate: 0.44,
    rollRef: 50,
    yawTurnRate: 0.79,
    yawBank: 28 * DEG,
    pitchResponse: 8,
    rollResponse: 11,
    yawResponse: 7,
    pitchGain: 2.2,
    rollGain: 3,
    yawGain: 1.7,
    grip: 8,
    induced: 0.04,
    pathGravity: 0.85,
    airbrake: 3.5,
    wheelBrake: 9,
    sideLift: 0.65,
    bankTurn: 0.5,
    maxGroundPitch: 12 * DEG,
    gearHeight: 2,
    bellyHeight: 1
  },
  blackbird: {
    thrust: 28,
    throttleRate: 0.5,
    cornerSpeed: 140,
    cornerRate: 0.46,
    minRateFrac: 0.35,
    pushFrac: 0.5,
    rollRate: 1.9,
    yawRate: 0.26,
    rollRef: 170,
    yawTurnRate: 0.44,
    yawBank: 22 * DEG,
    pitchResponse: 6,
    rollResponse: 8,
    yawResponse: 5,
    pitchGain: 1.5,
    rollGain: 2,
    yawGain: 0.9,
    grip: 7,
    induced: 0.06,
    pathGravity: 0.4,
    airbrake: 3,
    wheelBrake: 9,
    sideLift: 0.5,
    bankTurn: 0.5,
    maxGroundPitch: 12 * DEG,
    gearHeight: 2,
    bellyHeight: 1
  },
  bomber: {
    thrust: 9,
    throttleRate: 0.35,
    cornerSpeed: 110,
    cornerRate: 0.23,
    minRateFrac: 0.4,
    pushFrac: 0.5,
    rollRate: 0.8,
    yawRate: 0.09,
    rollRef: 100,
    yawTurnRate: 0.21,
    yawBank: 15 * DEG,
    pitchResponse: 3.5,
    rollResponse: 4.5,
    yawResponse: 3,
    pitchGain: 0.9,
    rollGain: 1.1,
    yawGain: 0.6,
    grip: 6,
    induced: 0.12,
    pathGravity: 0.7,
    airbrake: 2.5,
    wheelBrake: 8,
    sideLift: 0.5,
    bankTurn: 0.5,
    maxGroundPitch: 10 * DEG,
    gearHeight: 2.5,
    bellyHeight: 1.2
  }
};
var HELI = {
  apache: {
    collectiveRate: 0.8,
    collectiveReturn: 1.5,
    altitudeHold: 1.5,
    cushion: 3,
    cushionHeight: 10,
    maxTilt: 25 * DEG,
    boostTilt: 36 * DEG,
    backTilt: 18 * DEG,
    sideTilt: 22 * DEG,
    cyclicRate: 0.9,
    driftKill: 0.35,
    tiltGain: 4,
    maxTiltRate: 1.6,
    tiltResponse: 9,
    flipRate: 2.2,
    yawRate: 1.7,
    yawGain: 3,
    yawResponse: 7,
    cyclicGain: 1.8,
    dragQuad: 0.001063,
    dragLin: 0.03,
    dragVert: 0.6,
    grip: 0.9,
    gearHeight: 2
  }
};
var HELI_DIRECT = {
  apache: {
    collectiveRate: 1.2,
    detentWidth: 0.1,
    detentRate: 0.3,
    pitchRate: 1.5,
    rollRate: 1.6,
    yawRate: 1.5,
    cyclicResponse: 12,
    yawResponse: 10,
    strafeGain: 4,
    coordBank: 0.8,
    maxCoordBank: 25 * DEG,
    rightGain: 1.6,
    rightCap: 1,
    rightInverted: 0.35,
    rightUnderInput: 0.5,
    highCollective: 0.6,
    highReturnRate: 0.35,
    cyclicGain: 1.3,
    dragQuad: 0.0016,
    dragLin: 0.08,
    dragVert: 0.55,
    brakeGain: 0.6,
    brakeTilt: 30 * DEG,
    brakeAttitudeGain: 3,
    brakeRecoverRate: 3,
    brakeVertical: 1.5,
    brakeCollectiveRate: 0.8,
    cushion: 2,
    cushionHeight: 8,
    gearHeight: 2
  }
};
var clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
var axis = (v) => v > 1 ? 1 : v < -1 ? -1 : v === v ? v : 0;
var smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
var wrapAngle = (a) => {
  while (a > Math.PI)
    a -= 2 * Math.PI;
  while (a < -Math.PI)
    a += 2 * Math.PI;
  return a;
};
function rotInto(out, q, vx, vy, vz, inverse = false) {
  const qx = inverse ? -q[0] : q[0], qy = inverse ? -q[1] : q[1], qz = inverse ? -q[2] : q[2], qw = q[3];
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);
  out[0] = vx + qw * tx + (qy * tz - qz * ty);
  out[1] = vy + qw * ty + (qz * tx - qx * tz);
  out[2] = vz + qw * tz + (qx * ty - qy * tx);
}
function integrateOrientation(q, wx, wy, wz, dt) {
  const rate = Math.sqrt(wx * wx + wy * wy + wz * wz);
  if (rate < 0.000000001)
    return;
  const half = rate * dt * 0.5;
  const k = Math.sin(half) / rate;
  const bx = wx * k, by = wy * k, bz = wz * k, bw = Math.cos(half);
  const ax = q[0], ay = q[1], az = q[2], aw = q[3];
  let x = aw * bx + ax * bw + ay * bz - az * by;
  let y = aw * by - ax * bz + ay * bw + az * bx;
  let z = aw * bz + ax * by - ay * bx + az * bw;
  let w = aw * bw - ax * bx - ay * by - az * bz;
  const n = 1 / Math.sqrt(x * x + y * y + z * z + w * w);
  q[0] = x * n;
  q[1] = y * n;
  q[2] = z * n;
  q[3] = w * n;
}
function setYawPitchRoll(q, yaw, pitch, bank) {
  const cy = Math.cos(yaw / 2), sy = Math.sin(yaw / 2);
  const cp = Math.cos(pitch / 2), sp = Math.sin(pitch / 2);
  const cr = Math.cos(-bank / 2), sr = Math.sin(-bank / 2);
  const ax = cy * sp, ay = sy * cp, az = -sy * sp, aw = cy * cp;
  q[0] = ax * cr + ay * sr;
  q[1] = ay * cr - ax * sr;
  q[2] = aw * sr + az * cr;
  q[3] = aw * cr - az * sr;
}
var F = [0, 0, 0];
var U = [0, 0, 0];
var R = [0, 0, 0];
var TMP = [0, 0, 0];
var AIM = [0, 0, 0];
function basis(q) {
  rotInto(F, q, 0, 0, -1);
  rotInto(U, q, 0, 1, 0);
  rotInto(R, q, 1, 0, 0);
}
function createFlightState(kind, spawn) {
  const heli = VEHICLES[kind].flight === "heli";
  const orientation = [0, 0, 0, 1];
  setYawPitchRoll(orientation, spawn.yaw, 0, 0);
  const airSpeed = heli ? 0 : VEHICLES[kind].cruise;
  return {
    kind,
    position: [spawn.position[0], spawn.position[1], spawn.position[2]],
    velocity: spawn.onGround ? [0, 0, 0] : [-Math.sin(spawn.yaw) * airSpeed, 0, -Math.cos(spawn.yaw) * airSpeed],
    orientation,
    angularVelocity: [0, 0, 0],
    throttle: heli ? spawn.onGround ? 0.35 : 0.5 : spawn.onGround ? 0 : 1,
    onGround: spawn.onGround,
    gearDown: spawn.onGround || heli,
    crashed: null,
    tick: 0
  };
}
function stepFlight(state, input, dt, world) {
  if (state.crashed)
    return;
  state.tick++;
  const spec = VEHICLES[state.kind];
  let hasAim = false;
  const a = input.aim;
  if (a) {
    const len = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
    if (len > 0.000001) {
      AIM[0] = a[0] / len;
      AIM[1] = a[1] / len;
      AIM[2] = a[2] / len;
      hasAim = true;
    }
  }
  if (spec.flight === "heli") {
    if (hasAim)
      stepHeliAim(state, input, dt, world, HELI[state.kind]);
    else
      stepHeliDirect(state, input, dt, world, HELI_DIRECT[state.kind]);
  } else
    stepJet(state, input, hasAim, dt, world, spec, JET[state.kind]);
}
function airFactor(y, ceiling) {
  return clamp((ceiling - y) / 400, 0, 1);
}
function stepJet(s, inp, hasAim, dt, world, spec, h) {
  const { orientation: q, velocity: v, angularVelocity: w, position: p } = s;
  s.throttle = clamp(s.throttle + axis(inp.throttle) * h.throttleRate * dt, 0, 1);
  const inRoll = axis(inp.roll), inPitch = axis(inp.pitch), inYaw = axis(inp.yaw);
  basis(q);
  let speed = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  const vf = v[0] * F[0] + v[1] * F[1] + v[2] * F[2];
  const air = airFactor(p[1], world.ceiling);
  const stall = spec.stall;
  const lift = smoothstep(0.7 * stall, stall, vf) * air;
  const corner = h.cornerSpeed;
  const slowFrac = clamp(vf / corner, 0, 1);
  const pitchMax = h.cornerRate * Math.max(h.minRateFrac, vf <= corner ? slowFrac : corner / vf) * (inp.brake && !s.onGround ? AIRBRAKE_TURN_BONUS : 1);
  const yawMax = h.yawRate * Math.max(0.3, slowFrac);
  const rollMax = h.rollRate * (0.35 + 0.65 * clamp(vf / h.rollRef, 0, 1));
  const bank = Math.atan2(-R[1], U[1]);
  const pitchAngle = Math.asin(clamp(F[1], -1, 1));
  let pUp = 0, yRight = 0, rRight = 0;
  let yawTurn = 0;
  if (s.onGround) {
    const steerMax = 0.25 + 0.45 * (1 - clamp(speed / stall, 0, 1));
    if (inYaw !== 0)
      yRight = inYaw * steerMax;
    else if (hasAim && AIM[0] * AIM[0] + AIM[2] * AIM[2] > 0.000001) {
      const heading = Math.atan2(-F[0], -F[2]);
      const aimHeading = Math.atan2(-AIM[0], -AIM[2]);
      yRight = clamp(-wrapAngle(aimHeading - heading) * 2, -steerMax, steerMax);
    }
    let targetPitch = 0;
    if (vf > 0.88 * stall) {
      if (inPitch !== 0)
        targetPitch = Math.max(0, inPitch) * h.maxGroundPitch;
      else if (hasAim)
        targetPitch = clamp(Math.asin(clamp(AIM[1], -1, 1)), 0, h.maxGroundPitch);
      if (vf > stall && inPitch >= 0 && !inp.brake && (s.throttle > 0.6 || inp.boost) && !(hasAim && AIM[1] < -0.035))
        targetPitch = Math.max(targetPitch, 6 * DEG);
    }
    pUp = clamp((targetPitch - pitchAngle) * 3, -0.4, 0.4);
  } else {
    if (hasAim) {
      rotInto(TMP, q, AIM[0], AIM[1], AIM[2], true);
      const lx = TMP[0], ly = TMP[1], fz = -TMP[2];
      const ang = Math.acos(clamp(fz, -1, 1));
      const behind = fz < -0.6 ? (-0.6 - fz) * 2.5 : 0;
      const s2 = smoothstep(25 * DEG, 60 * DEG, ang);
      const absLy = Math.abs(ly);
      const uRoll = absLy + (ly - absLy) * s2 + behind;
      const rollToTarget = Math.atan2(lx, uRoll);
      const aggressive = smoothstep(4 * DEG, 20 * DEG, ang);
      const rollErr = aggressive * rollToTarget + (1 - aggressive) * -bank;
      const pitchErr = Math.atan2(ly + behind, fz);
      const yawErr = Math.atan2(lx, Math.max(fz, 0.2));
      pUp = h.pitchGain * pitchErr;
      rRight = h.rollGain * rollErr;
      yRight = h.yawGain * yawErr * (1 - aggressive);
      if (inPitch !== 0) {
        pUp = inPitch * pitchMax;
        if (inRoll === 0)
          rRight = 0;
        yRight = 0;
      }
      if (inYaw !== 0)
        yRight = inYaw * yawMax;
      if (inRoll !== 0)
        rRight = inRoll * rollMax;
      pUp = clamp(pUp, -pitchMax * h.pushFrac, pitchMax);
      yRight = clamp(yRight, -yawMax, yawMax);
      rRight = clamp(rRight, -rollMax, rollMax);
    } else {
      pUp = clamp(inPitch * pitchMax * (inPitch < 0 ? 0.75 : 1), -pitchMax, pitchMax);
      rRight = inRoll * rollMax;
      const absBank = Math.abs(bank), upright = absBank < 100 * DEG && Math.cos(pitchAngle) > 0.35;
      if (inYaw !== 0) {
        yawTurn = inYaw * h.yawTurnRate * Math.max(0.4, Math.min(1, vf / (0.7 * corner)));
        if (inRoll === 0 && upright)
          rRight = clamp(h.rollGain * (inYaw * h.yawBank - bank), -rollMax, rollMax);
      } else if (inRoll === 0 && Math.abs(inPitch) < 0.05 && upright) {
        rRight = clamp(-bank * DIRECT_LEVEL_GAIN, -rollMax, rollMax);
      }
    }
  }
  let tx = pUp, ty = -yRight, tz = -rRight;
  if (!s.onGround) {
    const turn = -h.bankTurn * GRAVITY * Math.sin(bank) * Math.max(0, Math.cos(pitchAngle)) * lift / Math.max(speed, stall);
    rotInto(TMP, q, 0, turn, 0, true);
    tx += TMP[0];
    ty += TMP[1];
    tz += TMP[2];
    if (yawTurn !== 0) {
      const uy = U[1], wy = smoothstep(0, 0.18, Math.abs(uy)), k = 1 - wy;
      const axX = U[0] * k, axY = (uy < 0 ? -wy : wy) + U[1] * k, axZ = U[2] * k;
      const n = Math.sqrt(axX * axX + axY * axY + axZ * axZ);
      if (n > 0.000001) {
        rotInto(TMP, q, axX / n * -yawTurn, axY / n * -yawTurn, axZ / n * -yawTurn, true);
        tx += TMP[0];
        ty += TMP[1];
        tz += TMP[2];
      }
    }
    const unlift = 1 - lift;
    if (unlift > 0) {
      rotInto(TMP, q, 0, -1, 0, true);
      const fwdDown = -TMP[2];
      tx += clamp(0.8 * Math.atan2(TMP[1], fwdDown), -0.6, 0.6) * unlift;
      ty += clamp(0.8 * Math.atan2(-TMP[0], fwdDown), -0.6, 0.6) * unlift;
      if (speed > 5) {
        rotInto(TMP, q, v[0], v[1], v[2], true);
        const bf = -TMP[2];
        if (bf > 0) {
          tx += clamp(Math.atan2(TMP[1], bf), -0.5, 0.5) * unlift;
          ty += clamp(Math.atan2(-TMP[0], bf), -0.5, 0.5) * unlift;
        }
      }
    }
  }
  const rollStep = w[2] * dt, cr = Math.cos(rollStep), sr = Math.sin(rollStep);
  const wx0 = w[0], wy0 = w[1];
  w[0] = wx0 * cr + wy0 * sr;
  w[1] = -wx0 * sr + wy0 * cr;
  w[0] += (tx - w[0]) * (1 - Math.exp(-h.pitchResponse * dt));
  w[1] += (ty - w[1]) * (1 - Math.exp(-h.yawResponse * dt));
  w[2] += (tz - w[2]) * (1 - Math.exp(-h.rollResponse * dt));
  integrateOrientation(q, w[0], w[1], w[2], dt);
  basis(q);
  const engine = 0.35 + 0.65 * air;
  let thrust = (inp.boost ? h.thrust * (spec.boost / spec.cruise) ** 2 : s.throttle * h.thrust) * engine;
  if (s.onGround && !inp.brake && (s.throttle > 0.5 || inp.boost) && world.groundHeight(p[0], p[2]) > CAT_DECK_MIN_HEIGHT && world.onRunway(p[0], p[2])) {
    const deck = world.deckVelocity?.(p[0], p[2]);
    const vRel = deck ? vf - (deck[0] * F[0] + deck[1] * F[1] + deck[2] * F[2]) : vf;
    if (vRel < CAT_END_SPEED * stall)
      thrust += CAT_END_SPEED * stall / CAT_STROKE_TIME;
  }
  const dragK = h.thrust / (spec.cruise * spec.cruise) * (inp.brake ? h.airbrake : 1);
  const turnRate = Math.sqrt(w[0] * w[0] + w[1] * w[1]);
  const inducedDecel = h.induced * turnRate * turnRate * (h.cornerSpeed * h.cornerSpeed) / (GRAVITY * GRAVITY);
  const resist = speed > 0.000001 ? (dragK * speed * speed + inducedDecel) / speed : 0;
  const liftU = lift * GRAVITY * U[1], liftR = lift * GRAVITY * h.sideLift * R[1];
  const pathG = GRAVITY * F[1] * (1 - h.pathGravity) * lift;
  let ax = F[0] * (thrust + pathG) - v[0] * resist + U[0] * liftU + R[0] * liftR;
  let ay = F[1] * (thrust + pathG) - v[1] * resist + U[1] * liftU + R[1] * liftR - GRAVITY;
  let az = F[2] * (thrust + pathG) - v[2] * resist + U[2] * liftU + R[2] * liftR;
  if (p[1] > world.ceiling)
    ay -= (p[1] - world.ceiling) * 0.3;
  v[0] += ax * dt;
  v[1] += ay * dt;
  v[2] += az * dt;
  speed = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  const along = v[0] * F[0] + v[1] * F[1] + v[2] * F[2];
  if (speed > 1 && along > 0) {
    const k = 1 - Math.exp(-(h.grip + Math.abs(yawTurn) * YAW_TURN_GRIP) * (0.2 + 0.8 * lift) * dt);
    v[0] += (F[0] * speed - v[0]) * k;
    v[1] += (F[1] * speed - v[1]) * k;
    v[2] += (F[2] * speed - v[2]) * k;
    const n = speed / Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    v[0] *= n;
    v[1] *= n;
    v[2] *= n;
  }
  if (p[1] > world.ceiling + 150 && v[1] > 0)
    v[1] = 0;
  p[0] += v[0] * dt;
  p[1] += v[1] * dt;
  p[2] += v[2] * dt;
  const wheelDecel = inp.brake ? h.wheelBrake : s.throttle < 0.05 && !inp.boost ? PARK_BRAKE : 0.4;
  const ground = resolveGround(s, world, false, h.gearHeight, h.bellyHeight, spec.stall, h.maxGroundPitch, wheelDecel, dt);
  if (s.crashed)
    return;
  const agl = p[1] - h.gearHeight - ground;
  const gs = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (s.onGround)
    s.gearDown = true;
  else if (s.gearDown && agl > 40)
    s.gearDown = false;
  else if (!s.gearDown && agl < 25 && gs < 1.4 * stall)
    s.gearDown = true;
  checkBoundary(s, world);
}
function stepHeliDirect(s, inp, dt, world, h) {
  const { orientation: q, velocity: v, angularVelocity: w, position: p } = s;
  const inCollective = axis(inp.throttle);
  const inRoll = axis(inp.roll), inPitch = axis(inp.pitch), inYaw = axis(inp.yaw);
  if (inCollective !== 0)
    s.throttle = clamp(s.throttle + inCollective * h.collectiveRate * dt, 0, 1);
  else if (!s.onGround) {
    const d = HOVER_COLLECTIVE - s.throttle;
    const pull = inp.brake ? h.brakeCollectiveRate : Math.abs(d) < h.detentWidth ? h.detentRate : s.throttle > h.highCollective ? h.highReturnRate : 0;
    const step = pull * dt;
    s.throttle += d > step ? step : d < -step ? -step : d;
  }
  basis(q);
  const pitchAngle = Math.asin(clamp(F[1], -1, 1));
  const bank = Math.atan2(-R[1], U[1]);
  let tx = inPitch * h.pitchRate;
  let ty = -inYaw * h.yawRate;
  let tz = -inRoll * h.rollRate;
  rotInto(TMP, q, 0, 1, 0, true);
  const tilt = Math.acos(clamp(TMP[1], -1, 1));
  let axX = TMP[2], axZ = -TMP[0];
  let axN = Math.sqrt(axX * axX + axZ * axZ);
  if (axN < 0.0001) {
    axX = 0;
    axZ = 1;
    axN = 1;
  }
  axX /= axN;
  axZ /= axN;
  if (inp.brake && !s.onGround && tilt > h.brakeTilt * 1.5) {
    const r = Math.min(h.brakeAttitudeGain * tilt, h.brakeRecoverRate);
    if (inPitch === 0)
      tx = axX * r;
    if (inRoll === 0)
      tz = axZ * r;
  } else if (inp.brake && !s.onGround) {
    const heading = Math.atan2(-F[0], -F[2]);
    const vF = v[0] * -Math.sin(heading) + v[2] * -Math.cos(heading);
    const vR = v[0] * Math.cos(heading) + v[2] * -Math.sin(heading);
    const pitchT = clamp(Math.atan(vF * h.brakeGain / GRAVITY), -h.brakeTilt, h.brakeTilt);
    const bankT = clamp(Math.atan(-vR * h.brakeGain / GRAVITY), -h.brakeTilt, h.brakeTilt);
    if (inPitch === 0)
      tx = clamp(h.brakeAttitudeGain * wrapAngle(pitchT - pitchAngle), -h.pitchRate, h.pitchRate);
    if (inRoll === 0)
      tz = -clamp(h.brakeAttitudeGain * wrapAngle(bankT - bank), -h.rollRate, h.rollRate);
  } else if (!s.onGround) {
    const strength = Math.min(h.rightGain * tilt, h.rightCap) + (h.rightInverted - h.rightCap) * smoothstep(100 * DEG, 170 * DEG, tilt);
    tx += axX * strength * (1 - h.rightUnderInput * Math.abs(inPitch));
    tz = -inRoll * h.rollRate + axZ * strength * (1 - h.rightUnderInput * Math.abs(inRoll));
    if (inRoll === 0 && inYaw !== 0) {
      const heading = Math.atan2(-F[0], -F[2]);
      const vF = v[0] * -Math.sin(heading) + v[2] * -Math.cos(heading);
      const coordBank = clamp(Math.atan(vF * inYaw * h.yawRate / GRAVITY) * h.coordBank, -h.maxCoordBank, h.maxCoordBank);
      const turnW = Math.abs(inYaw) * smoothstep(5, 30, vF);
      tz += (-clamp(h.strafeGain * wrapAngle(coordBank - bank), -h.rollRate, h.rollRate) - tz) * turnW;
    }
  }
  if (s.onGround && s.throttle < 0.3)
    ty = 0;
  const kc = 1 - Math.exp(-h.cyclicResponse * dt);
  w[0] += (tx - w[0]) * kc;
  w[1] += (ty - w[1]) * (1 - Math.exp(-h.yawResponse * dt));
  w[2] += (tz - w[2]) * kc;
  integrateOrientation(q, w[0], w[1], w[2], dt);
  basis(q);
  const air = airFactor(p[1], world.ceiling);
  const lift = GRAVITY * (s.throttle / HOVER_COLLECTIVE) * air;
  const hs = Math.sqrt(v[0] * v[0] + v[2] * v[2]);
  const hd = h.dragQuad * hs + h.dragLin;
  const ax = U[0] * lift * h.cyclicGain - v[0] * hd;
  let ay = U[1] * lift - GRAVITY - v[1] * h.dragVert;
  const az = U[2] * lift * h.cyclicGain - v[2] * hd;
  if (inp.brake)
    ay -= v[1] * h.brakeVertical;
  const agl = p[1] - h.gearHeight - world.groundHeight(p[0], p[2]);
  if (v[1] < 0 && agl < h.cushionHeight)
    ay -= v[1] * h.cushion * (1 - Math.max(agl, 0) / h.cushionHeight);
  if (p[1] > world.ceiling)
    ay -= (p[1] - world.ceiling) * 0.3;
  v[0] += ax * dt;
  v[1] += ay * dt;
  v[2] += az * dt;
  if (p[1] > world.ceiling + 150 && v[1] > 0)
    v[1] = 0;
  p[0] += v[0] * dt;
  p[1] += v[1] * dt;
  p[2] += v[2] * dt;
  s.gearDown = true;
  resolveGround(s, world, true, h.gearHeight, h.gearHeight, 0, 0, 0, dt);
  if (s.crashed)
    return;
  checkBoundary(s, world);
}
function stepHeliAim(s, inp, dt, world, h) {
  const hasAim = true;
  const { orientation: q, velocity: v, angularVelocity: w, position: p } = s;
  const inCollective = axis(inp.throttle);
  if (inCollective !== 0)
    s.throttle = clamp(s.throttle + inCollective * h.collectiveRate * dt, 0, 1);
  else if (!s.onGround) {
    const d = HOVER_COLLECTIVE - s.throttle, step = h.collectiveReturn * dt;
    s.throttle += d > step ? step : d < -step ? -step : d;
  }
  const inRoll = axis(inp.roll), inPitch = axis(inp.pitch), inYaw = axis(inp.yaw);
  basis(q);
  const heading = Math.atan2(-F[0], -F[2]);
  const pitchAngle = Math.asin(clamp(F[1], -1, 1));
  const bank = Math.atan2(-R[1], U[1]);
  const hfx = -Math.sin(heading), hfz = -Math.cos(heading);
  const hrx = Math.cos(heading), hrz = -Math.sin(heading);
  const vF = v[0] * hfx + v[2] * hfz;
  const vR = v[0] * hrx + v[2] * hrz;
  let yawLeft = 0;
  if (inYaw !== 0)
    yawLeft = -inYaw * h.yawRate;
  else if (hasAim) {
    const horiz = Math.sqrt(AIM[0] * AIM[0] + AIM[2] * AIM[2]);
    if (horiz > 0.0001) {
      const err = wrapAngle(Math.atan2(-AIM[0], -AIM[2]) - heading);
      yawLeft = clamp(h.yawGain * err * Math.min(1, horiz * 3), -h.yawRate, h.yawRate);
    }
  }
  if (s.onGround && s.throttle < 0.3)
    yawLeft = 0;
  const tiltLimit = inp.boost ? h.boostTilt : h.maxTilt;
  let pitchT = 0, bankT = 0;
  let hold = inp.brake ? 1 : 0;
  let holdGain = 1.2;
  let driftKill = 0;
  const nearLevel = Math.abs(pitchAngle) < 4 * DEG;
  if (!inp.brake && inPitch === 0 && inRoll === 0 && !inp.boost) {
    if (hasAim) {
      hold = 1 - smoothstep(2 * DEG, 6 * DEG, Math.abs(Math.asin(clamp(AIM[1], -1, 1))));
      holdGain = 0.35;
    } else if (nearLevel)
      driftKill = h.driftKill;
  }
  const holdPitch = clamp(Math.atan(vF * holdGain / (GRAVITY * h.cyclicGain)), -h.maxTilt, h.backTilt);
  const holdBank = clamp(Math.atan(-vR * holdGain / (GRAVITY * h.cyclicGain)), -h.sideTilt, h.sideTilt);
  pitchT = hasAim ? Math.asin(clamp(AIM[1], -1, 1)) : nearLevel ? 0 : pitchAngle;
  if (inp.boost)
    pitchT = Math.min(pitchT, -h.boostTilt);
  if (inPitch !== 0)
    pitchT = hasAim ? inPitch * (inPitch > 0 ? h.backTilt : h.maxTilt) : pitchAngle + inPitch * h.cyclicRate / h.tiltGain;
  pitchT = pitchT + (holdPitch - pitchT) * hold;
  bankT = holdBank * hold;
  const flipping = Math.abs(inRoll) > HELI_FLIP_ROLL;
  if (inRoll !== 0 && !flipping)
    bankT = clamp(inRoll / HELI_STRAFE_ROLL, -1, 1) * h.sideTilt;
  else if (inRoll === 0)
    bankT += clamp(-yawLeft * vF / GRAVITY * 0.7, -20 * DEG, 20 * DEG) * smoothstep(10, 40, vF);
  pitchT = clamp(pitchT, -tiltLimit, h.backTilt);
  let tx = clamp(h.tiltGain * (pitchT - pitchAngle), -h.maxTiltRate, h.maxTiltRate);
  let tz = flipping ? -inRoll * h.flipRate : -clamp(h.tiltGain * wrapAngle(bankT - bank), -h.maxTiltRate, h.maxTiltRate);
  rotInto(TMP, q, 0, yawLeft, 0, true);
  tx += TMP[0];
  const ty = TMP[1];
  tz += TMP[2];
  const kt = 1 - Math.exp(-h.tiltResponse * dt);
  w[0] += (tx - w[0]) * kt;
  w[1] += (ty - w[1]) * (1 - Math.exp(-h.yawResponse * dt));
  w[2] += (tz - w[2]) * kt;
  integrateOrientation(q, w[0], w[1], w[2], dt);
  basis(q);
  const air = airFactor(p[1], world.ceiling);
  const lift = GRAVITY * (s.throttle / HOVER_COLLECTIVE) * air / Math.max(U[1], 0.6);
  const hs = Math.sqrt(v[0] * v[0] + v[2] * v[2]);
  const hd = h.dragQuad * hs + h.dragLin + driftKill;
  let ax = U[0] * lift * h.cyclicGain - v[0] * hd;
  let ay = U[1] * lift - GRAVITY - v[1] * h.dragVert;
  let az = U[2] * lift * h.cyclicGain - v[2] * hd;
  if (inp.brake || inCollective === 0 && !s.onGround)
    ay -= v[1] * h.altitudeHold;
  const agl = p[1] - h.gearHeight - world.groundHeight(p[0], p[2]);
  if (v[1] < 0 && agl < h.cushionHeight)
    ay -= v[1] * h.cushion * (1 - Math.max(agl, 0) / h.cushionHeight);
  if (p[1] > world.ceiling)
    ay -= (p[1] - world.ceiling) * 0.3;
  v[0] += ax * dt;
  v[1] += ay * dt;
  v[2] += az * dt;
  if (inRoll === 0 && vF > 0 && hs > 1) {
    const k = 1 - Math.exp(-h.grip * smoothstep(15, 50, hs) * dt);
    if (k > 0) {
      const hs2 = Math.sqrt(v[0] * v[0] + v[2] * v[2]);
      v[0] += (hfx * hs2 - v[0]) * k;
      v[2] += (hfz * hs2 - v[2]) * k;
      const n = hs2 / Math.max(0.000000001, Math.sqrt(v[0] * v[0] + v[2] * v[2]));
      v[0] *= n;
      v[2] *= n;
    }
  }
  if (p[1] > world.ceiling + 150 && v[1] > 0)
    v[1] = 0;
  p[0] += v[0] * dt;
  p[1] += v[1] * dt;
  p[2] += v[2] * dt;
  s.gearDown = true;
  resolveGround(s, world, true, h.gearHeight, h.gearHeight, 0, 0, 0, dt);
  if (s.crashed)
    return;
  checkBoundary(s, world);
}
function resolveGround(s, world, heli, gearHeight, bellyHeight, stall, maxGroundPitch, wheelDecel, dt) {
  const { position: p, velocity: v, orientation: q, angularVelocity: w } = s;
  const ground = world.groundHeight(p[0], p[2]);
  const clearance = s.gearDown ? gearHeight : bellyHeight;
  if (p[1] - clearance > ground + 0.02) {
    s.onGround = false;
    return ground;
  }
  const runway = world.onRunway(p[0], p[2]);
  const water = !runway && ground <= WATER_LEVEL + 0.01;
  const deck = world.deckVelocity?.(p[0], p[2]);
  const dvx = deck ? deck[0] : 0, dvy = deck ? deck[1] : 0, dvz = deck ? deck[2] : 0;
  basis(q);
  const sink = dvy - v[1];
  const pitch = Math.asin(clamp(F[1], -1, 1));
  const bank = Math.atan2(-R[1], U[1]);
  const hs = Math.sqrt((v[0] - dvx) ** 2 + (v[2] - dvz) ** 2);
  if (water) {
    s.crashed = "water";
  } else if (heli) {
    if (sink > 7.5 || Math.abs(bank) > 35 * DEG || Math.abs(pitch) > 35 * DEG || hs > 30)
      s.crashed = "terrain";
  } else if (runway) {
    if (!s.gearDown || sink > 6 || Math.abs(bank) > 25 * DEG || pitch < -10 * DEG || pitch > 25 * DEG)
      s.crashed = "terrain";
  } else {
    if (!s.gearDown || sink > 4 || Math.abs(bank) > 20 * DEG || pitch < -8 * DEG || hs > 1.3 * stall)
      s.crashed = "terrain";
  }
  if (s.crashed) {
    p[1] = Math.max(p[1], ground);
    return ground;
  }
  s.onGround = true;
  p[1] = ground + gearHeight;
  if (v[1] < dvy)
    v[1] = dvy;
  const heading = Math.atan2(-F[0], -F[2]);
  const gp = heli ? 0 : clamp(pitch, 0, maxGroundPitch);
  setYawPitchRoll(q, heading, gp, 0);
  w[2] = 0;
  if (heli || gp <= 0 && w[0] < 0 || gp >= maxGroundPitch && w[0] > 0)
    w[0] = 0;
  const hfx = -Math.sin(heading), hfz = -Math.cos(heading);
  const rvx = v[0] - dvx, rvz = v[2] - dvz;
  let along = rvx * hfx + rvz * hfz;
  let latX = rvx - hfx * along, latZ = rvz - hfz * along;
  const latKeep = Math.exp(-(heli ? 4 : 12) * dt);
  latX *= latKeep;
  latZ *= latKeep;
  if (heli) {
    along *= Math.exp(-4 * dt);
    if (Math.hypot(along, latX, latZ) < 1)
      along = latX = latZ = 0;
  } else {
    const dec = (wheelDecel + (runway ? 0 : 2)) * dt;
    along = along > dec ? along - dec : along < -dec ? along + dec : 0;
  }
  v[0] = hfx * along + latX + dvx;
  v[2] = hfz * along + latZ + dvz;
  return ground;
}
function checkBoundary(s, world) {
  const p = s.position;
  if (p[0] > world.half || p[0] < -world.half || p[2] > world.half || p[2] < -world.half)
    s.crashed = "boundary";
}
var BOMB_DRAG = 0.0004;
var BOMB_STEP = 1 / 60;
var BOMB_MAX_TIME = 60;
function stepBomb(pos, vel, dt) {
  const sp = Math.sqrt(vel[0] * vel[0] + vel[1] * vel[1] + vel[2] * vel[2]);
  const k = BOMB_DRAG * sp;
  vel[0] -= vel[0] * k * dt;
  vel[1] -= (vel[1] * k + GRAVITY) * dt;
  vel[2] -= vel[2] * k * dt;
  pos[0] += vel[0] * dt;
  pos[1] += vel[1] * dt;
  pos[2] += vel[2] * dt;
}
var BP = [0, 0, 0];
var BV = [0, 0, 0];
function bombImpactPoint(pos, vel, out, world) {
  BP[0] = pos[0];
  BP[1] = pos[1];
  BP[2] = pos[2];
  BV[0] = vel[0];
  BV[1] = vel[1];
  BV[2] = vel[2];
  for (let t = 0;t < BOMB_MAX_TIME; t += BOMB_STEP) {
    const py = BP[1];
    stepBomb(BP, BV, BOMB_STEP);
    const g = world ? world.groundHeight(BP[0], BP[2]) : 0;
    if (BP[1] <= g) {
      const f = py - BP[1] > 0.000000001 ? (py - g) / (py - BP[1]) : 1;
      out[0] = BP[0] - BV[0] * BOMB_STEP * (1 - f);
      out[1] = g;
      out[2] = BP[2] - BV[2] * BOMB_STEP * (1 - f);
      return t + BOMB_STEP * f;
    }
  }
  out[0] = BP[0];
  out[1] = BP[1];
  out[2] = BP[2];
  return -1;
}

// src/sim/combat.ts
var MAX_PROJECTILES = 2000;
var MAX_MISSILES = 256;
var MAX_FLARES = 256;
var SPOTTED_DAMAGE_MULT = 1.2;
var ARMOR = { fighter: 1, apache: 1, warthog: 0.8, blackbird: 1, bomber: 1 };
var WEAPON_DAMAGE_MULT = {
  cannon20: 1.35,
  chaingun30: 1.1,
  gau8: 0.8,
  rockets: 1,
  aim9: 1,
  tvmissile: 1,
  hellfire: 1,
  maverick: 1,
  aim47: 1,
  radarpulse: 0,
  bomb: 1
};
var BOMB_STEER_ACCEL = 25;
var BOMB_STEER_DV = 15;
var BOMB_STEER_STALE = 0.25;
var BOMB_NEAR_MISS = 0.5;
function isHiddenStealth(v, now) {
  return !!VEHICLES[v.kind].stealth && v.spottedUntil <= now;
}
var CLASS_BONUS = {
  chaingun30: { apache: 1.6, warthog: 1.4 }
};
var MISSILE_TUNING = {
  aim9: { maxSpeed: 650, burn: 2, accel: 200, coastDecel: 35, fuse: 6, gimbal: 0.8, flareNear: 0.8, flareFar: 0.9, farDist: 600 },
  tvmissile: { maxSpeed: 620, burn: 2.5, accel: 150, coastDecel: 30, fuse: 6, gimbal: 0.8, flareNear: 0.6, flareFar: 0.7, farDist: 800 },
  hellfire: { maxSpeed: 420, burn: 3, accel: 100, coastDecel: 20, fuse: 4, gimbal: 0.9, flareNear: 0.75, flareFar: 0.85, farDist: 800 },
  maverick: { maxSpeed: 440, burn: 3, accel: 100, coastDecel: 20, fuse: 4, gimbal: 0.9, flareNear: 0.7, flareFar: 0.8, farDist: 800 },
  aim47: { maxSpeed: 750, burn: 4, accel: 110, coastDecel: 10, fuse: 10, gimbal: 0.9, flareNear: 0.7, flareFar: 0.9, farDist: 0 }
};
var TURRET_ARCS = {
  chaingun30: { yaw: 110 * Math.PI / 180, minEl: -85 * Math.PI / 180, maxEl: 12 * Math.PI / 180 }
};
var VIEW_DELAY_DEFAULT = 0.12;
var VIEW_DELAY_MAX = 0.3;
var HISTORY_TICKS = 24;
var HITBOX = { fuselageHalf: 1.1, fuselageRadius: 0.55, wingHalf: 1.1, wingRadius: 0.35 };
var GUN_FULL_RANGE = 800;
var GUN_MIN_DAMAGE = 0.4;
var BULLET_IMPACT_EVERY = 3;
var WATER_SPLASH_RADIUS = 4;
var WATER_SPLASH_DAMAGE = 0.3;
var GUN_GIMBAL = 15 * Math.PI / 180;
var PROPORTIONAL_NAV_GAIN = 4;
var MISSILE_MIN_SPEED = 120;
var MISSILE_LOAL_TIME = 1;
var ROCKET_GRAVITY = 9.81;
var SCANNER_CONE_MARGIN = 1.3;
var SCANNER_GRACE = 1.5;
var SCANNER_FLARE_CLOSE = 1000;
var FLARE_COOLDOWN = 2.5;
var FLARES_PER_BURST = 3;
var FLARE_TTL = 3.5;
var FLARE_TARGET_PREFIX = "flare:";
var RECON_KINDS = new Set(["blackbird"]);
var SPOT_CONE = 5 * Math.PI / 180;
var SPOT_RANGE = 6000;
var SPOT_TIME = 1.5;
var SPOT_DECAY = 1 / 0.4;
var SPOT_DURATION = 12;
var SPOT_COOLDOWN = 3;
var MARK_COOLDOWN = 10;
var MARK_DURATION = 8;
var MARK_RANGE = 4000;
var MARK_CONE = 0.08;
function createCombatState() {
  return {
    projectiles: [],
    missiles: [],
    flares: [],
    nextId: 1,
    turrets: createTurretStates(),
    bursts: [],
    ships: createShips(),
    shipDamageBy: [0, 0, 0, 0],
    craters: [],
    shells: []
  };
}
function markSpawned(vehicle, now) {
  vehicle.spawnedAt = now;
}
function isSpawnProtected(vehicle, now) {
  const t = vehicle.spawnedAt;
  return t !== undefined && now - t < SPAWN_PROTECTION;
}
function createWeapons(kind) {
  const seats = VEHICLES[kind].seatWeapons;
  const mk = (id) => {
    const ammo = id ? WEAPONS[id].ammo : 0;
    const rt = { ammo: Number.isFinite(ammo) ? ammo : -1, readyAt: 0, lockTarget: null, lock: 0, firedAt: -1e9, regen: 0 };
    return rt;
  };
  const out = [seats[0].map(mk), seats[1].map(mk)];
  for (let a = 0;a < 2; a++) {
    for (let b = 0;b < 2; b++) {
      const id = seats[0][a];
      if (id && seats[1][b] === id && WEAPONS[id].kind === "bomb")
        out[1][b] = out[0][a];
    }
  }
  return out;
}
function sharedWithPilot(v, rt) {
  return v.weapons[0][0] === rt || v.weapons[0][1] === rt;
}
function magazine(weapon) {
  const a = WEAPONS[weapon].ammo;
  return Number.isFinite(a) ? a : -1;
}
function launchedHardpoint(weapon, ammoAfter) {
  return ((WEAPONS[weapon].ammo - ammoAfter - 1) % 2 + 2) % 2;
}
function isHostile(a, b) {
  return a.team !== b.team;
}
function isLockKind(spec) {
  return spec.kind === "missile_lock" || spec.kind === "missile_scanner";
}
function rotate(q, x, y, z, out) {
  const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
  const tx = 2 * (qy * z - qz * y), ty = 2 * (qz * x - qx * z), tz = 2 * (qx * y - qy * x);
  out[0] = x + qw * tx + (qy * tz - qz * ty);
  out[1] = y + qw * ty + (qz * tx - qx * tz);
  out[2] = z + qw * tz + (qx * ty - qy * tx);
  return out;
}
function rotateInv(q, x, y, z, out) {
  const qx = -q[0], qy = -q[1], qz = -q[2], qw = q[3];
  const tx = 2 * (qy * z - qz * y), ty = 2 * (qz * x - qx * z), tz = 2 * (qx * y - qy * x);
  out[0] = x + qw * tx + (qy * tz - qz * ty);
  out[1] = y + qw * ty + (qz * tx - qx * tz);
  out[2] = z + qw * tz + (qx * ty - qy * tx);
  return out;
}
function len(v) {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}
function normalizeInto(v, out) {
  const l = len(v);
  if (!(l > 0.000000001))
    return false;
  out[0] = v[0] / l;
  out[1] = v[1] / l;
  out[2] = v[2] / l;
  return true;
}
function dist(a, b) {
  const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
function turnToward(dir, target, maxAngle) {
  let c = dir[0] * target[0] + dir[1] * target[1] + dir[2] * target[2];
  if (c > 1)
    c = 1;
  else if (c < -1)
    c = -1;
  const theta = Math.acos(c);
  if (theta <= maxAngle) {
    dir[0] = target[0];
    dir[1] = target[1];
    dir[2] = target[2];
    return;
  }
  let px = target[0] - dir[0] * c, py = target[1] - dir[1] * c, pz = target[2] - dir[2] * c;
  let pl = Math.sqrt(px * px + py * py + pz * pz);
  if (pl < 0.000001) {
    if (Math.abs(dir[1]) < 0.9) {
      px = -dir[2];
      py = 0;
      pz = dir[0];
    } else {
      px = 0;
      py = dir[2];
      pz = -dir[1];
    }
    pl = Math.sqrt(px * px + py * py + pz * pz);
  }
  const cs = Math.cos(maxAngle), sn = Math.sin(maxAngle) / pl;
  dir[0] = dir[0] * cs + px * sn;
  dir[1] = dir[1] * cs + py * sn;
  dir[2] = dir[2] * cs + pz * sn;
  const l = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]);
  dir[0] /= l;
  dir[1] /= l;
  dir[2] /= l;
}
function hash01(a, b) {
  let h = Math.imul(a ^ 2654435769, 2246822507) ^ Math.imul(b + 1663821227, 3266489909);
  h = Math.imul(h ^ h >>> 16, 2146121005);
  h = Math.imul(h ^ h >>> 15, 2221713035);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function applySpread(dir, spread, seed) {
  if (spread <= 0)
    return;
  const r = spread * Math.sqrt(hash01(seed, 1)), a = 2 * Math.PI * hash01(seed, 2);
  let ux = 0, uy = 1, uz = 0;
  if (Math.abs(dir[1]) > 0.99) {
    ux = 1;
    uy = 0;
  }
  let rx = dir[1] * uz - dir[2] * uy, ry = dir[2] * ux - dir[0] * uz, rz = dir[0] * uy - dir[1] * ux;
  const rl = Math.sqrt(rx * rx + ry * ry + rz * rz);
  rx /= rl;
  ry /= rl;
  rz /= rl;
  const vx = ry * dir[2] - rz * dir[1], vy = rz * dir[0] - rx * dir[2], vz = rx * dir[1] - ry * dir[0];
  const ca = Math.cos(a) * r, sa = Math.sin(a) * r;
  dir[0] += rx * ca + vx * sa;
  dir[1] += ry * ca + vy * sa;
  dir[2] += rz * ca + vz * sa;
  const l = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]);
  dir[0] /= l;
  dir[1] /= l;
  dir[2] /= l;
}
function sweptSphere(p0, p1, c1, cv, dt, r) {
  const sx = p0[0] - (c1[0] - cv[0] * dt), sy = p0[1] - (c1[1] - cv[1] * dt), sz = p0[2] - (c1[2] - cv[2] * dt);
  const dx = p1[0] - c1[0] - sx, dy = p1[1] - c1[1] - sy, dz = p1[2] - c1[2] - sz;
  const c = sx * sx + sy * sy + sz * sz - r * r;
  if (c <= 0)
    return 0;
  const a = dx * dx + dy * dy + dz * dz;
  if (a < 0.000000000001)
    return -1;
  const b = 2 * (sx * dx + sy * dy + sz * dz);
  if (b >= 0)
    return -1;
  const disc = b * b - 4 * a * c;
  if (disc < 0)
    return -1;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t <= 1 ? t : -1;
}
function damageFor(weapon, target, now) {
  const bonus = CLASS_BONUS[weapon]?.[target.kind] ?? 1;
  const spotted = target.spottedUntil > now ? SPOTTED_DAMAGE_MULT : 1;
  return WEAPONS[weapon].damage * WEAPON_DAMAGE_MULT[weapon] * ARMOR[target.kind] * bonus * spotted;
}
var _gim = [0, 0, 0];
function weaponDirection(vehicle, weapon, aim, out) {
  const q = vehicle.flight.orientation;
  const spec = WEAPONS[weapon];
  if (!spec.turret && aim && (spec.kind === "gun" || spec.kind === "rockets")) {
    rotate(q, 0, 0, -1, out);
    if (!normalizeInto(aim, _gim))
      return out;
    turnToward(out, _gim, GUN_GIMBAL);
    return out;
  }
  if (!spec.turret || !aim || spec.kind !== "gun")
    return rotate(q, 0, 0, -1, out);
  rotateInv(q, aim[0], aim[1], aim[2], out);
  if (!normalizeInto(out, out))
    return rotate(q, 0, 0, -1, out);
  const arc = TURRET_ARCS[weapon];
  if (arc) {
    let yaw = Math.atan2(out[0], -out[2]);
    let el = Math.asin(Math.max(-1, Math.min(1, out[1])));
    yaw = Math.max(-arc.yaw, Math.min(arc.yaw, yaw));
    el = Math.max(arc.minEl, Math.min(arc.maxEl, el));
    const ce = Math.cos(el);
    out[0] = Math.sin(yaw) * ce;
    out[1] = Math.sin(el);
    out[2] = -Math.cos(yaw) * ce;
  }
  return rotate(q, out[0], out[1], out[2], out);
}
function muzzlePosition(vehicle, seat, weapon, out, hardpoint = 0) {
  const r = VEHICLES[vehicle.kind].radius;
  const spec = WEAPONS[weapon];
  const p = vehicle.flight.position;
  if (spec.kind === "gun") {
    if (spec.turret)
      rotate(vehicle.flight.orientation, 0, -1.6, -r * 0.55, out);
    else
      rotate(vehicle.flight.orientation, 0, 0, -r * 0.8, out);
  } else {
    const side = hardpoint % 2 === 0 ? -1 : 1;
    rotate(vehicle.flight.orientation, side * r * 0.35, -1, -r * 0.1, out);
  }
  out[0] += p[0];
  out[1] += p[1];
  out[2] += p[2];
  return out;
}
function leadPoint(shooterPos, shooterVel, muzzleSpeed, targetPos, targetVel, out) {
  const rx = targetPos[0] - shooterPos[0], ry = targetPos[1] - shooterPos[1], rz = targetPos[2] - shooterPos[2];
  const vx = targetVel[0] - shooterVel[0], vy = targetVel[1] - shooterVel[1], vz = targetVel[2] - shooterVel[2];
  const a = vx * vx + vy * vy + vz * vz - muzzleSpeed * muzzleSpeed;
  const b = 2 * (rx * vx + ry * vy + rz * vz);
  const c = rx * rx + ry * ry + rz * rz;
  let t;
  if (Math.abs(a) < 0.000000001) {
    if (b >= 0)
      return -1;
    t = -c / b;
  } else {
    const disc = b * b - 4 * a * c;
    if (disc < 0)
      return -1;
    const s = Math.sqrt(disc);
    const t1 = (-b - s) / (2 * a), t2 = (-b + s) / (2 * a);
    t = t1 > 0 && t2 > 0 ? Math.min(t1, t2) : Math.max(t1, t2);
    if (!(t > 0))
      return -1;
  }
  out[0] = shooterPos[0] + rx + vx * t;
  out[1] = shooterPos[1] + ry + vy * t;
  out[2] = shooterPos[2] + rz + vz * t;
  return t;
}
var _lc = [0, 0, 0];
function seekerAngle(from, axis, to, outDist) {
  const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
  outDist.d = d;
  if (d < 0.000001)
    return 0;
  const c = (dx * axis[0] + dy * axis[1] + dz * axis[2]) / d;
  return Math.acos(Math.max(-1, Math.min(1, c)));
}
var _sd = { d: 0 };
function lockValid(vehicle, spec, axis, target, coneScale, now) {
  if (!target.alive || target === vehicle || !isHostile(vehicle, target))
    return -1;
  const range = spec.range ?? 2500;
  const cone = (spec.lockCone ?? 0.3) * coneScale;
  const tp = target.flight.position;
  const ang = seekerAngle(vehicle.flight.position, axis, tp, _sd);
  if (_sd.d > range || ang > cone)
    return -1;
  if (isSpawnProtected(target, now))
    return -1;
  return ang;
}
function seekerAxis(vehicle, seat, weapon, aim, out) {
  if (seat !== 0 && WEAPONS[weapon].turret && aim && normalizeInto(aim, out))
    return out;
  return rotate(vehicle.flight.orientation, 0, 0, -1, out);
}
function lockCandidate(vehicle, seat, weapon, aim, vehicles, now = 0) {
  const spec = WEAPONS[weapon];
  if (!isLockKind(spec))
    return null;
  const axis = seekerAxis(vehicle, seat, weapon, aim, _lc);
  let best = null;
  let bestAng = Infinity;
  for (let i = 0;i < vehicles.length; i++) {
    const ang = lockValid(vehicle, spec, axis, vehicles[i], 1, now);
    if (ang >= 0 && ang < bestAng) {
      bestAng = ang;
      best = vehicles[i];
    }
  }
  return best;
}
function findVehicle(vehicles, id) {
  for (let i = 0;i < vehicles.length; i++)
    if (vehicles[i].id === id)
      return vehicles[i];
  return null;
}
function killVehicle(vehicle, reason, killer, events, killerTeam) {
  if (!vehicle.alive)
    return false;
  vehicle.alive = false;
  vehicle.hp = 0;
  const p = vehicle.flight.position;
  const kill = {
    type: "kill",
    victim: vehicle.id,
    victimTeam: vehicle.team,
    killer: killer === undefined ? vehicle.lastDamagedBy : killer,
    weapon: reason,
    position: [p[0], p[1], p[2]]
  };
  if (killerTeam !== undefined)
    kill.killerTeam = killerTeam;
  events.push(kill);
  const low = p[1] - groundHeight(p[0], p[2]) < 15;
  pushExplosion(events, p, VEHICLES[vehicle.kind].radius * 3, low ? surfaceAt(p) : "air");
  return true;
}
function dealDamage(target, amount, weapon, owner, pos, now, events) {
  if (!target.alive || amount <= 0)
    return 0;
  if (isSpawnProtected(target, now))
    return 0;
  target.hp -= amount;
  target.lastDamagedBy = owner;
  events.push({ type: "hit", target: target.id, by: owner, weapon, damage: amount, position: [pos[0], pos[1], pos[2]] });
  if (target.hp <= 0)
    killVehicle(target, weapon, owner, events);
  return amount;
}
function splash(pos, weapon, owner, team, shooterId, direct, vehicles, now, events, radiusCap = Infinity, scale = 1) {
  const radius = Math.min(WEAPONS[weapon].splash, radiusCap);
  if (radius <= 0 || scale <= 0)
    return;
  for (let i = 0;i < vehicles.length; i++) {
    const v = vehicles[i];
    if (v === direct || !v.alive || v.team === team || v.id === shooterId)
      continue;
    const d = Math.max(0, dist(pos, v.flight.position) - VEHICLES[v.kind].radius);
    if (d >= radius)
      continue;
    dealDamage(v, damageFor(weapon, v, now) * scale * (1 - d / radius), weapon, owner, pos, now, events);
  }
}
function surfaceAt(p) {
  return isWater(p[0], p[2]) ? "water" : "ground";
}
function pushExplosion(events, p, size, surface, flak = false) {
  const e = { type: "explosion", position: [p[0], p[1], p[2]], size, surface };
  if (flak)
    e.kind = "flak";
  events.push(e);
}
function gunRangeFactor(weapon, age) {
  const spec = WEAPONS[weapon];
  const d = Math.max(0, age) * spec.speed;
  if (d <= GUN_FULL_RANGE)
    return 1;
  const max = Math.max(spec.speed * spec.ttl, GUN_FULL_RANGE + 1);
  return Math.max(GUN_MIN_DAMAGE, 1 - (1 - GUN_MIN_DAMAGE) * (d - GUN_FULL_RANGE) / (max - GUN_FULL_RANGE));
}
var _dir = [0, 0, 0];
var _muz = [0, 0, 0];
var _aim = [0, 0, 0];
function applySeatInput(cs, vehicle, seat, input, vehicles, now, events) {
  if (!vehicle.alive)
    return;
  const aim = input.aim && normalizeInto(input.aim, _aim) ? _aim : null;
  if (aim) {
    const stored = vehicle.aim[seat];
    if (stored) {
      stored[0] = aim[0];
      stored[1] = aim[1];
      stored[2] = aim[2];
    } else
      vehicle.aim[seat] = [aim[0], aim[1], aim[2]];
  }
  const kinds = VEHICLES[vehicle.kind].seatWeapons[seat];
  const runtimes = vehicle.weapons[seat];
  for (let slot = 0;slot < 2; slot++) {
    const id = kinds[slot];
    if (id && runtimes[slot] && isLockKind(WEAPONS[id]))
      updateLock(cs, vehicle, seat, WEAPONS[id], runtimes[slot], aim, vehicles, now, events);
  }
  if (input.steerBomb && aim)
    steerBomb(cs, vehicle, seat, aim, now);
  if (seat === 0 && RECON_KINDS.has(vehicle.kind))
    updateSpotting(vehicle, aim, vehicles, now, events);
  if (input.flares)
    deployFlares(cs, vehicle, vehicles, now, events);
  if (input.ability)
    triggerAbility(vehicle, seat, aim, vehicles, now, events);
  const protectedNow = isSpawnProtected(vehicle, now);
  for (let slot = 0;slot < 2; slot++) {
    if (!(slot === 0 ? input.firePrimary : input.fireSecondary))
      continue;
    const id = kinds[slot];
    const rt = runtimes[slot];
    if (!id || !rt)
      continue;
    const spec = WEAPONS[id];
    if (spec.kind === "pulse") {
      radarPulse(vehicle, seat, vehicles, now, events);
      continue;
    }
    if (protectedNow)
      continue;
    if (spec.kind === "gun" || spec.kind === "rockets")
      fireBallistic(cs, vehicle, seat, spec, rt, aim, now, events, viewDelayOf(input));
    else if (spec.kind === "bomb")
      fireBomb(cs, vehicle, seat, spec, rt, now, events);
    else
      fireMissile(cs, vehicle, seat, spec, rt, now, events);
  }
}
function spotValid(vehicle, axis, target, cone, now) {
  if (!target.alive || !isHostile(vehicle, target))
    return -1;
  if ((target.spotCooldownUntil ?? 0) > now)
    return -1;
  const ang = seekerAngle(vehicle.flight.position, axis, target.flight.position, _sd);
  if (ang > cone || _sd.d > SPOT_RANGE)
    return -1;
  if (segmentHitsGround(vehicle.flight.position, target.flight.position) !== null)
    return -1;
  return ang;
}
function markSpotted(spotter, target, until, events) {
  target.spottedUntil = Math.max(target.spottedUntil, until);
  events.push({ type: "spotted", by: spotter.id, team: spotter.team, target: target.id, until: target.spottedUntil });
}
function updateSpotting(vehicle, aim, vehicles, now, events) {
  let progress = vehicle.spotProgress ?? 0;
  let candidate = vehicle.spotCandidate ? findVehicle(vehicles, vehicle.spotCandidate) : null;
  let inView = false;
  if (aim) {
    if (candidate && spotValid(vehicle, aim, candidate, SPOT_CONE * 1.2, now) >= 0)
      inView = true;
    else {
      let best = null;
      let bestAng = Infinity;
      for (let i = 0;i < vehicles.length; i++) {
        const ang = spotValid(vehicle, aim, vehicles[i], SPOT_CONE, now);
        if (ang >= 0 && ang < bestAng) {
          bestAng = ang;
          best = vehicles[i];
        }
      }
      if (best) {
        if (best !== candidate)
          progress = 0;
        candidate = best;
        inView = true;
      }
    }
  }
  if (inView && candidate) {
    progress += TICK_DT / SPOT_TIME;
    if (progress >= 1 - 0.000000001) {
      markSpotted(vehicle, candidate, now + SPOT_DURATION, events);
      candidate.spotCooldownUntil = now + SPOT_COOLDOWN;
      progress = 0;
      candidate = null;
    }
  } else {
    progress = Math.max(0, progress - SPOT_DECAY * TICK_DT);
    if (progress === 0)
      candidate = null;
  }
  vehicle.spotProgress = progress;
  vehicle.spotCandidate = candidate ? candidate.id : null;
}
function viewDelayOf(input) {
  const d = input.viewDelay;
  if (d === undefined || !Number.isFinite(d))
    return VIEW_DELAY_DEFAULT;
  return Math.min(VIEW_DELAY_MAX, Math.max(0, d));
}
function updateLock(cs, vehicle, seat, spec, rt, aim, vehicles, now, events) {
  const axis = seekerAxis(vehicle, seat, spec.id, aim, _lc);
  let target = null;
  let shipTarget = null;
  if (rt.lockTarget) {
    if (rt.lockTarget.startsWith(SHIP_TARGET_PREFIX)) {
      if (shipLockAngle(cs, vehicle, spec, axis, rt.lockTarget.slice(SHIP_TARGET_PREFIX.length)) >= 0)
        shipTarget = rt.lockTarget;
    } else {
      const cur = findVehicle(vehicles, rt.lockTarget);
      if (cur && lockValid(vehicle, spec, axis, cur, 1, now) >= 0)
        target = cur;
    }
  }
  if (!target && !shipTarget)
    target = lockCandidate(vehicle, seat, spec.id, aim, vehicles, now);
  if (!target && !shipTarget && spec.kind === "missile_lock") {
    const sh = shipLockCandidate(cs, vehicle, spec, axis);
    if (sh)
      shipTarget = SHIP_TARGET_PREFIX + sh;
  }
  const newId = target ? target.id : shipTarget;
  if (newId !== rt.lockTarget) {
    if (rt.lockTarget && rt.lock >= 1)
      events.push({ type: "lock", vehicle: vehicle.id, target: rt.lockTarget, locked: false });
    rt.lockTarget = newId;
    rt.lock = 0;
  }
  if (!newId)
    return;
  const was = rt.lock;
  const stealthy = target !== null && isHiddenStealth(target, now);
  rt.lock = Math.min(1, rt.lock + TICK_DT / (stealthy ? Math.max(STEALTH_LOCK_TIME, spec.lockTime ?? 1) : spec.lockTime ?? 1));
  if (rt.lock > 1 - 0.000000001)
    rt.lock = 1;
  if (stealthy && rt.lock >= 1)
    markSpotted(vehicle, target, now + STEALTH_LOCK_SPOT, events);
  if (was < 1 && rt.lock >= 1)
    events.push({ type: "lock", vehicle: vehicle.id, target: newId, locked: true });
  else if (was === 0 || was < 0.5 && rt.lock >= 0.5)
    events.push({ type: "lock", vehicle: vehicle.id, target: newId, locked: false });
}
function ownerOf(vehicle, seat) {
  return vehicle.seats[seat] ?? vehicle.id;
}
function fireBallistic(cs, vehicle, seat, spec, rt, aim, now, events, viewDelay = VIEW_DELAY_DEFAULT) {
  const interval = 1 / spec.rate;
  const burstStart = rt.readyAt < now - interval;
  if (rt.readyAt < now - TICK_DT)
    rt.readyAt = now;
  const sv = vehicle.flight.velocity;
  let fired = 0;
  while (rt.readyAt <= now + 0.000000001 && (rt.ammo < 0 || rt.ammo >= 1) && fired < 8 && cs.projectiles.length < MAX_PROJECTILES) {
    const id = cs.nextId++;
    weaponDirection(vehicle, spec.id, aim, _dir);
    applySpread(_dir, spec.spread ?? 0, id);
    const hp = spec.kind === "rockets" ? launchedHardpoint(spec.id, rt.ammo - 1) : 0;
    muzzlePosition(vehicle, seat, spec.id, _muz, hp);
    const vx = sv[0] + _dir[0] * spec.speed, vy = sv[1] + _dir[1] * spec.speed, vz = sv[2] + _dir[2] * spec.speed;
    const back = now - rt.readyAt - TICK_DT;
    const proj = {
      id,
      weapon: spec.id,
      owner: ownerOf(vehicle, seat),
      vehicle: vehicle.id,
      team: vehicle.team,
      position: [_muz[0] + vx * back, _muz[1] + vy * back, _muz[2] + vz * back],
      velocity: [vx, vy, vz],
      age: back,
      ttl: spec.ttl
    };
    if (viewDelay > 0)
      proj.rewind = viewDelay;
    cs.projectiles.push(proj);
    consumeAmmo(rt, now);
    rt.readyAt += interval;
    fired++;
    if (spec.kind === "rockets")
      events.push({ type: "fire", vehicle: vehicle.id, seat, weapon: spec.id, hardpoint: hp });
  }
  if (fired > 0 && spec.kind === "gun" && (burstStart || Math.floor(now * 4) !== Math.floor((now - TICK_DT) * 4))) {
    events.push({ type: "fire", vehicle: vehicle.id, seat, weapon: spec.id });
  }
}
function fireBomb(cs, vehicle, seat, spec, rt, now, events) {
  if (rt.readyAt > now || rt.ammo >= 0 && rt.ammo < 1 || cs.projectiles.length >= MAX_PROJECTILES)
    return;
  rotate(vehicle.flight.orientation, 0, -3, 0, _muz);
  const p = vehicle.flight.position, v = vehicle.flight.velocity;
  const id = cs.nextId++;
  cs.projectiles.push({
    id,
    weapon: spec.id,
    owner: ownerOf(vehicle, seat),
    vehicle: vehicle.id,
    team: vehicle.team,
    position: [p[0] + _muz[0], p[1] + _muz[1], p[2] + _muz[2]],
    velocity: [v[0], v[1], v[2]],
    age: 0,
    ttl: spec.ttl
  });
  const ext = vehicle;
  if (!ext.lastBomb)
    ext.lastBomb = [-1, -1];
  ext.lastBomb[seat] = id;
  consumeAmmo(rt, now);
  rt.readyAt = now + 1 / spec.rate;
  events.push({ type: "fire", vehicle: vehicle.id, seat, weapon: spec.id });
}
function bombImpact(cs, p, pos, directShip, vehicles, now, events) {
  const spec = WEAPONS[p.weapon];
  const full = shipDamageFor(p.weapon);
  if (directShip) {
    if (directShip.team !== p.team)
      damageShip(cs, directShip.id, full, p.owner, p.team, pos, now, events);
  } else {
    const fleet = posedFleet();
    for (let i = 0;i < fleet.length; i++) {
      const sh = fleet[i];
      if (sh.team === p.team)
        continue;
      const sp = SHIP_SPECS[sh.kind];
      toShipLocal(sh, pos, _sl0);
      const dx = Math.max(0, Math.abs(_sl0[0]) - sp.halfWidth), dz = Math.max(0, Math.abs(_sl0[2]) - sp.halfLength);
      const dy = Math.max(0, _sl0[1] - sp.deckHeight);
      const d = Math.hypot(dx, dy, dz);
      if (d < spec.splash)
        damageShip(cs, sh.id, full * BOMB_NEAR_MISS * (1 - d / spec.splash), p.owner, p.team, pos, now, events);
    }
  }
  const surface = directShip ? "ground" : surfaceAt(pos);
  splash(pos, p.weapon, p.owner, p.team, p.vehicle, null, vehicles, now, events, surface === "water" ? spec.splash * 0.6 : Infinity);
  pushExplosion(events, pos, surface === "water" ? spec.splash * 0.5 : spec.splash, surface);
  if (!directShip && surface === "ground")
    addCrater(cs, pos, 15, events);
}
function consumeAmmo(rt, now) {
  const x = rt;
  if (rt.ammo > 0)
    rt.ammo--;
  x.firedAt = now;
  x.regen = 0;
}
function fireMissile(cs, vehicle, seat, spec, rt, now, events) {
  if (rt.readyAt > now || rt.ammo >= 0 && rt.ammo < 1 || cs.missiles.length >= MAX_MISSILES)
    return;
  if (rt.lockTarget && rt.lock < 1)
    return;
  const target = rt.lockTarget && rt.lock >= 1 ? rt.lockTarget : null;
  const hp = launchedHardpoint(spec.id, rt.ammo - 1);
  muzzlePosition(vehicle, seat, spec.id, _muz, hp);
  rotate(vehicle.flight.orientation, 0, 0, -1, _dir);
  const sv = vehicle.flight.velocity;
  const vx = sv[0] + _dir[0] * spec.speed, vy = sv[1] + _dir[1] * spec.speed, vz = sv[2] + _dir[2] * spec.speed;
  const scanner = spec.kind === "missile_scanner";
  const m = {
    id: cs.nextId++,
    weapon: spec.id,
    owner: ownerOf(vehicle, seat),
    vehicle: vehicle.id,
    team: vehicle.team,
    position: [_muz[0] - vx * TICK_DT, _muz[1] - vy * TICK_DT, _muz[2] - vz * TICK_DT],
    velocity: [vx, vy, vz],
    target,
    steered: scanner,
    seat,
    age: -TICK_DT,
    ttl: spec.ttl
  };
  if (scanner) {
    m.scanTarget = target;
    m.scanOff = 0;
  }
  cs.missiles.push(m);
  consumeAmmo(rt, now);
  rt.readyAt = now + 1 / spec.rate;
  events.push({ type: "fire", vehicle: vehicle.id, seat, weapon: spec.id, hardpoint: hp });
}
function deployFlares(cs, vehicle, vehicles, now, events) {
  if (vehicle.flaresReadyAt > now || vehicle.flareCount <= 0)
    return;
  vehicle.flareCount--;
  vehicle.flaresReadyAt = now + FLARE_COOLDOWN;
  const p = vehicle.flight.position, v = vehicle.flight.velocity, q = vehicle.flight.orientation;
  let firstId = -1;
  for (let i = 0;i < FLARES_PER_BURST && cs.flares.length < MAX_FLARES; i++) {
    const id = cs.nextId++;
    if (firstId < 0)
      firstId = id;
    const side = (i - (FLARES_PER_BURST - 1) / 2) * 18;
    rotate(q, side, -12, 8, _dir);
    cs.flares.push({
      id,
      vehicle: vehicle.id,
      position: [p[0], p[1] - 1, p[2]],
      velocity: [v[0] * 0.6 + _dir[0], v[1] * 0.6 + _dir[1], v[2] * 0.6 + _dir[2]],
      age: 0,
      ttl: FLARE_TTL
    });
  }
  events.push({ type: "flares", vehicle: vehicle.id });
  if (firstId < 0)
    return;
  for (let i = 0;i < cs.missiles.length; i++) {
    const m = cs.missiles[i];
    const t = MISSILE_TUNING[m.weapon];
    if (!t)
      continue;
    const d = dist(m.position, p);
    let chance;
    if (m.steered) {
      if (m.scanTarget !== vehicle.id)
        continue;
      const painted = m.target !== null && (m.scanOff ?? 0) === 0;
      chance = d <= SCANNER_FLARE_CLOSE ? t.flareNear : painted ? 0 : t.flareFar;
    } else {
      if (m.target !== vehicle.id)
        continue;
      chance = d > t.farDist ? t.flareFar : t.flareNear;
    }
    if (hash01(m.id, firstId) < chance) {
      m.target = FLARE_TARGET_PREFIX + firstId;
      if (m.steered)
        m.scanTarget = null;
    }
  }
  for (let i = 0;i < vehicles.length; i++) {
    const o = vehicles[i];
    for (let s = 0;s < 2; s++) {
      const rts = o.weapons[s];
      for (let k = 0;k < rts.length; k++) {
        const rt = rts[k];
        if (rt.lockTarget !== vehicle.id)
          continue;
        if (rt.lock >= 1)
          events.push({ type: "lock", vehicle: o.id, target: vehicle.id, locked: false });
        rt.lock = 0;
      }
    }
  }
}
function hasPulse(vehicle, seat) {
  const k = VEHICLES[vehicle.kind].seatWeapons[seat];
  return k[0] === "radarpulse" || k[1] === "radarpulse";
}
function triggerAbility(vehicle, seat, aim, vehicles, now, events) {
  if (hasPulse(vehicle, seat)) {
    radarPulse(vehicle, seat, vehicles, now, events);
    return;
  }
  if (seat !== 1 || !aim || vehicle.abilityReadyAt > now)
    return;
  let best = null;
  let bestAng = MARK_CONE;
  for (let i = 0;i < vehicles.length; i++) {
    const o = vehicles[i];
    if (!o.alive || !isHostile(vehicle, o))
      continue;
    const ang = seekerAngle(vehicle.flight.position, aim, o.flight.position, _sd);
    if (_sd.d <= MARK_RANGE && ang < bestAng) {
      bestAng = ang;
      best = o;
    }
  }
  if (!best)
    return;
  best.spottedUntil = Math.max(best.spottedUntil, now + MARK_DURATION);
  vehicle.abilityReadyAt = now + MARK_COOLDOWN;
}
function radarPulse(vehicle, seat, vehicles, now, events) {
  if (vehicle.abilityReadyAt > now)
    return;
  const spec = WEAPONS.radarpulse;
  vehicle.abilityReadyAt = now + 1 / spec.rate;
  const p = vehicle.flight.position;
  for (let i = 0;i < vehicles.length; i++) {
    const o = vehicles[i];
    if (!o.alive || !isHostile(vehicle, o))
      continue;
    if (dist(p, o.flight.position) <= spec.splash)
      markSpotted(vehicle, o, now + spec.ttl, events);
  }
  events.push({ type: "pulse", vehicle: vehicle.id, team: vehicle.team, position: [p[0], p[1], p[2]], radius: spec.splash });
  events.push({ type: "fire", vehicle: vehicle.id, seat, weapon: "radarpulse" });
}
var _p0 = [0, 0, 0];
var _p1 = [0, 0, 0];
var _hit = [0, 0, 0];
var _des = [0, 0, 0];
var _tp = [0, 0, 0];
var _tv = [0, 0, 0];
var _scan = [0, 0, 0];
var _sh = { t: 2, vehicle: null };
function sweepVehicles(p0, p1, team, shooterId, extra, vehicles, dt) {
  _sh.t = 2;
  _sh.vehicle = null;
  const mx = (p0[0] + p1[0]) * 0.5, my = (p0[1] + p1[1]) * 0.5, mz = (p0[2] + p1[2]) * 0.5;
  const halfSeg = dist(p0, p1) * 0.5;
  for (let i = 0;i < vehicles.length; i++) {
    const v = vehicles[i];
    if (!v.alive || v.team === team || v.id === shooterId)
      continue;
    const c = v.flight.position, cv = v.flight.velocity;
    const r = VEHICLES[v.kind].radius + extra;
    const dx = c[0] - mx, dy = c[1] - my, dz = c[2] - mz;
    const reach = r + halfSeg + Math.sqrt(cv[0] * cv[0] + cv[1] * cv[1] + cv[2] * cv[2]) * dt;
    if (dx * dx + dy * dy + dz * dz > reach * reach)
      continue;
    const t = sweptSphere(p0, p1, c, cv, dt, r);
    if (t >= 0 && t < _sh.t) {
      _sh.t = t;
      _sh.vehicle = v;
    }
  }
  return _sh;
}
function lerpInto(a, b, t, out) {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
  return out;
}
function stepCombat(cs, vehicles, dt, now, events) {
  regenAmmo(vehicles, dt, now);
  recordHistory(vehicles);
  stepProjectiles(cs, vehicles, dt, now, events);
  stepMissiles(cs, vehicles, dt, now, events);
  stepFlares(cs, dt);
  stepShells(cs, vehicles, dt, now, events);
  stepFleetAA(cs, vehicles, dt, now, events);
}
function regenAmmo(vehicles, dt, now) {
  for (let i = 0;i < vehicles.length; i++) {
    const v = vehicles[i];
    if (!v.alive)
      continue;
    const kinds = VEHICLES[v.kind].seatWeapons;
    for (let s = 0;s < 2; s++) {
      for (let k = 0;k < 2; k++) {
        const id = kinds[s][k];
        const rt = v.weapons[s][k];
        if (!id || !rt || s === 1 && sharedWithPilot(v, rt))
          continue;
        const spec = WEAPONS[id];
        const max = magazine(id);
        if (max < 0 || spec.refill <= 0)
          continue;
        if (rt.ammo >= max) {
          rt.ammo = max;
          rt.regen = 0;
          continue;
        }
        if (now - (rt.firedAt ?? -1e9) < spec.refillDelay - 0.000000001)
          continue;
        let acc = (rt.regen ?? 0) + max / spec.refill * dt;
        const whole = Math.floor(acc + 0.000001);
        if (whole > 0) {
          rt.ammo = Math.min(max, rt.ammo + whole);
          acc = Math.max(0, acc - whole);
        }
        rt.regen = rt.ammo >= max ? 0 : acc;
      }
    }
  }
}
function stepProjectiles(cs, vehicles, dt, now, events) {
  const list = cs.projectiles;
  let w = 0;
  for (let i = 0;i < list.length; i++) {
    const p = list[i];
    p.age += dt;
    if (p.age > p.ttl)
      continue;
    const spec = WEAPONS[p.weapon];
    if (spec.kind === "bomb") {
      stepBombProjectile(cs, p, vehicles, dt, now, events);
      if (p.age >= 0)
        list[w++] = p;
      continue;
    }
    const gun = spec.kind === "gun";
    if (!gun)
      p.velocity[1] -= ROCKET_GRAVITY * dt;
    const { position: pos, velocity: vel } = p;
    _p0[0] = pos[0];
    _p0[1] = pos[1];
    _p0[2] = pos[2];
    _p1[0] = pos[0] + vel[0] * dt;
    _p1[1] = pos[1] + vel[1] * dt;
    _p1[2] = pos[2] + vel[2] * dt;
    const hit = sweepRewound(_p0, _p1, p.team, p.vehicle, vehicles, dt, p.rewind ?? 0, gun);
    let g = segmentHitsGround(_p0, _p1);
    if (p.ship && g !== null) {
      const own = shipSegmentT(p.ship, _p0, _p1);
      if (own !== null && Math.abs(own - g) < 0.0001)
        g = null;
    }
    const sh = g !== null ? segmentHitsShipEx(cs, _p0, _p1, now, p.ship ?? null) : null;
    if (hit.vehicle && (g === null || hit.t <= g)) {
      const target = hit.vehicle;
      lerpInto(_p0, _p1, hit.t, _hit);
      const dmg = damageFor(p.weapon, target, now) * (gun ? gunRangeFactor(p.weapon, p.age) : 1);
      dealDamage(target, dmg, p.weapon, p.owner, _hit, now, events);
      splash(_hit, p.weapon, p.owner, p.team, p.vehicle, target, vehicles, now, events);
      if (!gun)
        pushExplosion(events, _hit, spec.splash, "air");
      continue;
    }
    if (g !== null && sh && sh.t <= g + 0.0001) {
      lerpInto(_p0, _p1, sh.t, _hit);
      const base = WEAPONS[p.weapon].damage * (gun ? gunRangeFactor(p.weapon, p.age) : 1);
      if (sh.ship.team !== p.team)
        damageShip(cs, sh.ship.id, base * shipScale(p.weapon), p.owner, p.team, _hit, now, events);
      if (!gun || p.id % BULLET_IMPACT_EVERY === 0)
        pushExplosion(events, _hit, gun ? 1 : spec.splash, "ground");
      continue;
    }
    if (g !== null) {
      lerpInto(_p0, _p1, g, _hit);
      const surface = surfaceAt(_hit);
      if (!gun && surface === "ground")
        addCrater(cs, _hit, craterRadius(p.weapon), events);
      if (gun) {
        if (surface === "ground")
          splash(_hit, p.weapon, p.owner, p.team, p.vehicle, null, vehicles, now, events);
        if (p.id % BULLET_IMPACT_EVERY === 0)
          pushExplosion(events, _hit, 1, surface);
      } else if (surface === "water") {
        splash(_hit, p.weapon, p.owner, p.team, p.vehicle, null, vehicles, now, events, WATER_SPLASH_RADIUS, WATER_SPLASH_DAMAGE);
        pushExplosion(events, _hit, spec.splash * 0.3, "water");
      } else {
        splash(_hit, p.weapon, p.owner, p.team, p.vehicle, null, vehicles, now, events);
        pushExplosion(events, _hit, spec.splash, "ground");
      }
      continue;
    }
    pos[0] = _p1[0];
    pos[1] = _p1[1];
    pos[2] = _p1[2];
    list[w++] = p;
  }
  list.length = w;
}
function steerableBomb(cs, vehicle, seat) {
  const id = vehicle.lastBomb?.[seat] ?? -1;
  if (id < 0)
    return null;
  for (let i = cs.projectiles.length - 1;i >= 0; i--)
    if (cs.projectiles[i].id === id)
      return cs.projectiles[i];
  return null;
}
var _sb = [0, 0, 0];
var _bi = [0, 0, 0];
function steerBomb(cs, vehicle, seat, aim, now) {
  const b = steerableBomb(cs, vehicle, seat);
  if (!b || aim[1] >= -0.02)
    return;
  const p = b.position;
  _sb[0] = p[0] + aim[0] * 20000;
  _sb[1] = p[1] + aim[1] * 20000;
  _sb[2] = p[2] + aim[2] * 20000;
  const t = segmentHitsGround(p, _sb);
  if (t === null)
    return;
  const target = b.steerTo ?? (b.steerTo = [0, 0, 0]);
  lerpInto(p, _sb, t, target);
  b.steerAt = now;
}
function bombGuidance(b, h, now) {
  const to = b.steerTo;
  if (!to || b.steerAt === undefined || now - b.steerAt > BOMB_STEER_STALE)
    return;
  const used = b.steerDv ?? 0;
  if (used >= BOMB_STEER_DV)
    return;
  const { position: p, velocity: v } = b;
  const tf = bombImpactPoint(p, v, _bi, worldQuery);
  if (!(tf > 0.2))
    return;
  const ex = to[0] - _bi[0], ez = to[2] - _bi[2];
  let ax = ex / tf / 0.5, az = ez / tf / 0.5;
  const a = Math.hypot(ax, az);
  const cap = Math.min(BOMB_STEER_ACCEL, (BOMB_STEER_DV - used) / h);
  if (a > cap) {
    ax *= cap / a;
    az *= cap / a;
  }
  v[0] += ax * h;
  v[2] += az * h;
  b.steerDv = used + Math.min(a, cap) * h;
}
function stepBombProjectile(cs, p, vehicles, dt, now, events) {
  const pos = p.position;
  _p0[0] = pos[0];
  _p0[1] = pos[1];
  _p0[2] = pos[2];
  let left = dt;
  while (left > 0.000000001) {
    const h = Math.min(BOMB_STEP, left);
    bombGuidance(p, h, now);
    stepBomb(pos, p.velocity, h);
    left -= h;
  }
  _p1[0] = pos[0];
  _p1[1] = pos[1];
  _p1[2] = pos[2];
  const g = segmentHitsGround(_p0, _p1);
  if (g === null && p.age <= p.ttl)
    return;
  if (g === null) {
    p.age = -1;
    return;
  }
  const sh = segmentHitsShipEx(cs, _p0, _p1, now, null);
  const direct = sh && sh.t <= g + 0.0001 ? sh.ship : null;
  lerpInto(_p0, _p1, direct ? sh.t : g, _hit);
  bombImpact(cs, p, _hit, direct, vehicles, now, events);
  p.age = -1;
}
function recordHistory(vehicles) {
  for (let i = 0;i < vehicles.length; i++) {
    const v = vehicles[i];
    if (!v.alive) {
      v.histCount = 0;
      continue;
    }
    const h = v.hist ?? (v.hist = new Float64Array(HISTORY_TICKS * 3));
    const head = v.histCount ? ((v.histHead ?? 0) + 1) % HISTORY_TICKS : 0;
    const p = v.flight.position;
    h[head * 3] = p[0];
    h[head * 3 + 1] = p[1];
    h[head * 3 + 2] = p[2];
    v.histHead = head;
    v.histCount = Math.min(HISTORY_TICKS, (v.histCount ?? 0) + 1);
  }
}
function rewoundPosition(v, back, out) {
  const x = v;
  const p = v.flight.position;
  const n = x.histCount ?? 0;
  if (!x.hist || n === 0 || back <= 0) {
    const u = v.flight.velocity, b = Math.max(0, back);
    out[0] = p[0] - u[0] * b;
    out[1] = p[1] - u[1] * b;
    out[2] = p[2] - u[2] * b;
    return out;
  }
  const k = Math.min(back / TICK_DT, n - 1);
  const i0 = Math.floor(k), f = k - i0, i1 = Math.min(i0 + 1, n - 1);
  const h = x.hist, head = x.histHead ?? 0;
  const a = ((head - i0) % HISTORY_TICKS + HISTORY_TICKS) % HISTORY_TICKS * 3;
  const b = ((head - i1) % HISTORY_TICKS + HISTORY_TICKS) % HISTORY_TICKS * 3;
  out[0] = h[a] + (h[b] - h[a]) * f;
  out[1] = h[a + 1] + (h[b + 1] - h[a + 1]) * f;
  out[2] = h[a + 2] + (h[b + 2] - h[a + 2]) * f;
  return out;
}
var _c0 = [0, 0, 0];
var _c1 = [0, 0, 0];
var _cv = [0, 0, 0];
var _ls0 = [0, 0, 0];
var _ls1 = [0, 0, 0];
var _segS = 0;
function segSegDist2(a, b, c, d) {
  const d1x = b[0] - a[0], d1y = b[1] - a[1], d1z = b[2] - a[2];
  const d2x = d[0] - c[0], d2y = d[1] - c[1], d2z = d[2] - c[2];
  const rx = a[0] - c[0], ry = a[1] - c[1], rz = a[2] - c[2];
  const A = d1x * d1x + d1y * d1y + d1z * d1z, E = d2x * d2x + d2y * d2y + d2z * d2z;
  const F = d2x * rx + d2y * ry + d2z * rz;
  let s, t;
  if (A <= 0.000000000001 && E <= 0.000000000001) {
    s = 0;
    t = 0;
  } else if (A <= 0.000000000001) {
    s = 0;
    t = clamp01(F / E);
  } else {
    const C = d1x * rx + d1y * ry + d1z * rz;
    if (E <= 0.000000000001) {
      t = 0;
      s = clamp01(-C / A);
    } else {
      const B = d1x * d2x + d1y * d2y + d1z * d2z;
      const den = A * E - B * B;
      s = den > 0.000000000001 ? clamp01((B * F - C * E) / den) : 0;
      t = (B * s + F) / E;
      if (t < 0) {
        t = 0;
        s = clamp01(-C / A);
      } else if (t > 1) {
        t = 1;
        s = clamp01((B - C) / A);
      }
    }
  }
  _segS = s;
  const px = a[0] + d1x * s - (c[0] + d2x * t), py = a[1] + d1y * s - (c[1] + d2y * t), pz = a[2] + d1z * s - (c[2] + d2z * t);
  return px * px + py * py + pz * pz;
}
function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
var _capA = [0, 0, 0];
var _capB = [0, 0, 0];
function hitboxSweep(s0, s1, R) {
  const segLen = dist(s0, s1);
  let best = 2;
  for (let k = 0;k < 2; k++) {
    const half = R * (k === 0 ? HITBOX.fuselageHalf : HITBOX.wingHalf);
    const r = R * (k === 0 ? HITBOX.fuselageRadius : HITBOX.wingRadius);
    if (k === 0) {
      _capA[0] = 0;
      _capA[1] = 0;
      _capA[2] = -half;
      _capB[0] = 0;
      _capB[1] = 0;
      _capB[2] = half;
    } else {
      _capA[0] = -half;
      _capA[1] = 0;
      _capA[2] = 0;
      _capB[0] = half;
      _capB[1] = 0;
      _capB[2] = 0;
    }
    const d2 = segSegDist2(s0, s1, _capA, _capB);
    if (d2 > r * r)
      continue;
    const t = segLen > 0.000000001 ? Math.max(0, _segS - Math.sqrt(r * r - d2) / segLen) : 0;
    if (t < best)
      best = t;
  }
  return best <= 1 ? best : -1;
}
function sweepRewound(p0, p1, team, shooterId, vehicles, dt, rewind, capsule) {
  _sh.t = 2;
  _sh.vehicle = null;
  const mx = (p0[0] + p1[0]) * 0.5, my = (p0[1] + p1[1]) * 0.5, mz = (p0[2] + p1[2]) * 0.5;
  const halfSeg = dist(p0, p1) * 0.5;
  for (let i = 0;i < vehicles.length; i++) {
    const v = vehicles[i];
    if (!v.alive || v.team === team || v.id === shooterId)
      continue;
    const R = VEHICLES[v.kind].radius;
    rewoundPosition(v, rewind, _c1);
    rewoundPosition(v, rewind + dt, _c0);
    const dx = _c1[0] - mx, dy = _c1[1] - my, dz = _c1[2] - mz;
    const reach = R * 1.7 + halfSeg + dist(_c0, _c1);
    if (dx * dx + dy * dy + dz * dz > reach * reach)
      continue;
    let t;
    if (capsule) {
      const q = v.flight.orientation;
      rotateInv(q, p0[0] - _c0[0], p0[1] - _c0[1], p0[2] - _c0[2], _ls0);
      rotateInv(q, p1[0] - _c1[0], p1[1] - _c1[1], p1[2] - _c1[2], _ls1);
      t = hitboxSweep(_ls0, _ls1, R);
    } else {
      _cv[0] = (_c1[0] - _c0[0]) / dt;
      _cv[1] = (_c1[1] - _c0[1]) / dt;
      _cv[2] = (_c1[2] - _c0[2]) / dt;
      t = sweptSphere(p0, p1, _c1, _cv, dt, R);
    }
    if (t >= 0 && t < _sh.t) {
      _sh.t = t;
      _sh.vehicle = v;
    }
  }
  return _sh;
}
function findFlare(cs, id) {
  for (let i = 0;i < cs.flares.length; i++)
    if (cs.flares[i].id === id)
      return cs.flares[i];
  return null;
}
function missileDirectDamage(weapon, target, now) {
  const k = WEAPONS[weapon].kind;
  if (k === "missile_lock" || k === "missile_scanner")
    return Math.max(target.hp, target.maxHp) + 1;
  return damageFor(weapon, target, now);
}
function detonate(m, pos, direct, vehicles, now, events, surface = "air") {
  const size = WEAPONS[m.weapon].splash;
  if (direct)
    dealDamage(direct, missileDirectDamage(m.weapon, direct, now), m.weapon, m.owner, pos, now, events);
  if (surface === "water") {
    splash(pos, m.weapon, m.owner, m.team, m.vehicle, direct, vehicles, now, events, WATER_SPLASH_RADIUS, WATER_SPLASH_DAMAGE);
    pushExplosion(events, pos, size * 0.3, "water");
    return;
  }
  splash(pos, m.weapon, m.owner, m.team, m.vehicle, direct, vehicles, now, events);
  pushExplosion(events, pos, size, surface);
}
function scannerOnTarget(m, target, vehicles) {
  const shooter = findVehicle(vehicles, m.vehicle);
  if (!shooter || !shooter.alive || !target.alive)
    return false;
  const seat = m.seat ?? 1;
  if (shooter.seats[seat] !== m.owner)
    return false;
  const aim = shooter.aim[seat];
  if (!aim || !normalizeInto(aim, _scan))
    return false;
  const spec = WEAPONS[m.weapon];
  const ang = seekerAngle(shooter.flight.position, _scan, target.flight.position, _sd);
  return ang <= (spec.lockCone ?? 0.12) * SCANNER_CONE_MARGIN && _sd.d <= (spec.range ?? 8000) * 1.1;
}
function scannerGuidance(m, vehicles, tune, dt, events) {
  if (!m.scanTarget)
    return null;
  const target = findVehicle(vehicles, m.scanTarget);
  if (!target || !target.alive) {
    m.scanTarget = null;
    m.target = null;
    return null;
  }
  if (scannerOnTarget(m, target, vehicles)) {
    m.scanOff = 0;
    if (m.target === null) {
      _dir[0] = m.velocity[0];
      _dir[1] = m.velocity[1];
      _dir[2] = m.velocity[2];
      if (normalizeInto(_dir, _dir) && seekerAngle(m.position, _dir, target.flight.position, _sd) <= tune.gimbal) {
        m.target = target.id;
        events.push({ type: "guidance", missile: m.id, vehicle: m.vehicle, target: target.id, guided: true });
      }
    }
  } else {
    m.scanOff = (m.scanOff ?? 0) + dt;
    if (m.scanOff > SCANNER_GRACE && m.target !== null) {
      m.target = null;
      events.push({ type: "guidance", missile: m.id, vehicle: m.vehicle, target: target.id, guided: false });
    }
  }
  return m.target === target.id ? target : null;
}
function stepMissiles(cs, vehicles, dt, now, events) {
  const list = cs.missiles;
  let w = 0;
  for (let i = 0;i < list.length; i++) {
    const m = list[i];
    const spec = WEAPONS[m.weapon];
    const tune = MISSILE_TUNING[m.weapon];
    m.age += dt;
    if (m.age > m.ttl) {
      detonate(m, m.position, null, vehicles, now, events);
      continue;
    }
    const { velocity: vel, position: pos } = m;
    let speed = len(vel);
    if (speed < 0.000001)
      speed = 0.000001;
    if (m.age <= tune.burn) {
      if (speed < tune.maxSpeed)
        speed = Math.min(tune.maxSpeed, speed + tune.accel * dt);
    } else
      speed = Math.max(MISSILE_MIN_SPEED, speed - tune.coastDecel * dt);
    const maxTurn = (spec.turnRate ?? 1) * dt;
    let flareTarget = null;
    let ok = false;
    if (m.target && m.target.startsWith(FLARE_TARGET_PREFIX)) {
      flareTarget = findFlare(cs, Number(m.target.slice(FLARE_TARGET_PREFIX.length)));
      if (flareTarget) {
        _tp[0] = flareTarget.position[0];
        _tp[1] = flareTarget.position[1];
        _tp[2] = flareTarget.position[2];
        _tv[0] = flareTarget.velocity[0];
        _tv[1] = flareTarget.velocity[1];
        _tv[2] = flareTarget.velocity[2];
        ok = true;
      } else
        m.target = null;
    } else if (m.target && m.target.startsWith(SHIP_TARGET_PREFIX)) {
      if (shipAimPoint(cs, m.target.slice(SHIP_TARGET_PREFIX.length), _tp)) {
        const dv = deckVelocity(_tp[0], _tp[2]);
        _tv[0] = dv ? dv[0] : 0;
        _tv[1] = 0;
        _tv[2] = dv ? dv[2] : 0;
        ok = true;
      } else
        m.target = null;
    } else {
      const t = m.steered ? scannerGuidance(m, vehicles, tune, dt, events) : m.target ? findVehicle(vehicles, m.target) : null;
      if (t && t.alive) {
        const fp = t.flight.position, fv = t.flight.velocity;
        _tp[0] = fp[0];
        _tp[1] = fp[1];
        _tp[2] = fp[2];
        _tv[0] = fv[0];
        _tv[1] = fv[1];
        _tv[2] = fv[2];
        ok = true;
      } else if (!m.steered)
        m.target = null;
    }
    _dir[0] = vel[0] / len(vel);
    _dir[1] = vel[1] / len(vel);
    _dir[2] = vel[2] / len(vel);
    if (ok && m.age > MISSILE_LOAL_TIME && seekerAngle(pos, _dir, _tp, _sd) > tune.gimbal) {
      ok = false;
      m.target = null;
      if (m.steered)
        m.scanTarget = null;
    }
    if (ok)
      proNav(pos, _dir, speed, _tp, _tv, dt, maxTurn);
    vel[0] = _dir[0] * speed;
    vel[1] = _dir[1] * speed;
    vel[2] = _dir[2] * speed;
    _p0[0] = pos[0];
    _p0[1] = pos[1];
    _p0[2] = pos[2];
    _p1[0] = pos[0] + vel[0] * dt;
    _p1[1] = pos[1] + vel[1] * dt;
    _p1[2] = pos[2] + vel[2] * dt;
    const hit = sweepVehicles(_p0, _p1, m.team, m.vehicle, tune.fuse, vehicles, dt);
    const g = segmentHitsGround(_p0, _p1);
    if (hit.vehicle && (g === null || hit.t <= g)) {
      detonate(m, lerpInto(_p0, _p1, hit.t, _hit), hit.vehicle, vehicles, now, events);
      continue;
    }
    if (g !== null) {
      const sh = segmentHitsShipEx(cs, _p0, _p1, now, null);
      if (sh && sh.t <= g + 0.0001) {
        lerpInto(_p0, _p1, sh.t, _hit);
        if (sh.ship.team !== m.team)
          damageShip(cs, sh.ship.id, shipDamageFor(m.weapon), m.owner, m.team, _hit, now, events);
        detonate(m, _hit, null, vehicles, now, events, "ground");
        continue;
      }
      lerpInto(_p0, _p1, g, _hit);
      const surface = surfaceAt(_hit);
      detonate(m, _hit, null, vehicles, now, events, surface);
      if (surface === "ground")
        addCrater(cs, _hit, craterRadius(m.weapon), events);
      continue;
    }
    if (flareTarget && dist(_p1, flareTarget.position) < tune.fuse + 4) {
      detonate(m, _p1, null, vehicles, now, events);
      continue;
    }
    pos[0] = _p1[0];
    pos[1] = _p1[1];
    pos[2] = _p1[2];
    list[w++] = m;
  }
  list.length = w;
}
function proNav(mp, dir, speed, tp, tv, dt, maxTurn) {
  const rx = tp[0] - mp[0], ry = tp[1] - mp[1], rz = tp[2] - mp[2];
  const r2 = rx * rx + ry * ry + rz * rz;
  if (r2 < 0.000001)
    return;
  const vmx = dir[0] * speed, vmy = dir[1] * speed, vmz = dir[2] * speed;
  const vrx = tv[0] - vmx, vry = tv[1] - vmy, vrz = tv[2] - vmz;
  const ox = (ry * vrz - rz * vry) / r2, oy = (rz * vrx - rx * vrz) / r2, oz = (rx * vry - ry * vrx) / r2;
  const n = PROPORTIONAL_NAV_GAIN;
  const ax = n * (oy * vmz - oz * vmy), ay = n * (oz * vmx - ox * vmz), az = n * (ox * vmy - oy * vmx);
  _des[0] = vmx + ax * dt;
  _des[1] = vmy + ay * dt;
  _des[2] = vmz + az * dt;
  if (rx * dir[0] + ry * dir[1] + rz * dir[2] < 0) {
    _des[0] = rx;
    _des[1] = ry;
    _des[2] = rz;
  }
  if (normalizeInto(_des, _des))
    turnToward(dir, _des, maxTurn);
}
function stepFlares(cs, dt) {
  const list = cs.flares;
  let w = 0;
  const drag = Math.exp(-1.2 * dt);
  for (let i = 0;i < list.length; i++) {
    const f = list[i];
    f.age += dt;
    if (f.age > f.ttl)
      continue;
    const { velocity: v, position: p } = f;
    v[0] *= drag;
    v[1] = v[1] * drag - 9.81 * dt;
    v[2] *= drag;
    p[0] += v[0] * dt;
    p[1] += v[1] * dt;
    p[2] += v[2] * dt;
    list[w++] = f;
  }
  list.length = w;
}
var SHIP_TARGET_PREFIX = "ship:";
var SHIP_LOCK_CONE_SCALE = 1.6;
var TURRET_HIT_RADIUS = 12;
var SHIP_DAMAGE_POINTS = 16;
var SHIP_SINK_COLLISION_TIME = 20;
var MAX_CRATERS = 300;
var MANNED_CIWS_RATE = 20;
var MANNED_GUN_RELOAD = 1.5;
var MANNED_GUN_FUSE = 18;
var SHELL_TTL = 3.5;
function createShips() {
  const out = {};
  for (const sh of FLEET) {
    const spec = SHIP_SPECS[sh.kind];
    const turrets = {};
    for (const t of spec.turrets)
      turrets[t.id] = { hp: TURRET_HP, manned: null, readyAt: 0 };
    out[sh.id] = { id: sh.id, team: sh.team, kind: sh.kind, hp: spec.maxHp, maxHp: spec.maxHp, sunk: false, sunkAt: 0, turrets, damage: [], damageCount: 0 };
  }
  return out;
}
function shipRuntime(cs, id) {
  if (!cs.ships)
    cs.ships = createShips();
  return cs.ships[id] ?? null;
}
function shipScale(weapon) {
  const spec = WEAPONS[weapon];
  return spec ? SHIP_DAMAGE_SCALE[spec.kind] ?? 0 : 0;
}
function shipDamageFor(weapon) {
  return (WEAPONS[weapon]?.damage ?? 0) * shipScale(weapon);
}
function craterRadius(weapon) {
  if (weapon === "flak")
    return 6;
  return Math.min(15, Math.max(6, (WEAPONS[weapon]?.splash ?? 8) * 0.8));
}
function addCrater(cs, p, radius, events) {
  if (!cs.craters)
    cs.craters = [];
  if (cs.craters.length >= MAX_CRATERS || isWater(p[0], p[2]) || shipAt(p[0], p[2]))
    return;
  const position = [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10, Math.round(p[2] * 10) / 10];
  const r = Math.round(radius * 10) / 10;
  cs.craters.push({ position, radius: r });
  events.push({ type: "crater", position: [position[0], position[1], position[2]], radius: r });
}
var _sl0 = [0, 0, 0];
var _sl1 = [0, 0, 0];
function boxT(a, b, cx, cy, cz, hx, hy, hz) {
  let t0 = 0, t1 = 1;
  for (let k = 0;k < 3; k++) {
    const pa = a[k], d = b[k] - pa;
    const c = k === 0 ? cx : k === 1 ? cy : cz, h = k === 0 ? hx : k === 1 ? hy : hz;
    const lo = c - h, hi = c + h;
    if (Math.abs(d) < 0.000000001) {
      if (pa < lo || pa > hi)
        return null;
      continue;
    }
    let u0 = (lo - pa) / d, u1 = (hi - pa) / d;
    if (u0 > u1) {
      const x = u0;
      u0 = u1;
      u1 = x;
    }
    if (u0 > t0)
      t0 = u0;
    if (u1 < t1)
      t1 = u1;
    if (t0 > t1)
      return null;
  }
  return t0;
}
function toShipLocal(ship, p, out) {
  const dx = p[0] - ship.position[0], dz = p[2] - ship.position[2];
  const c = Math.cos(ship.heading), s = Math.sin(ship.heading);
  out[0] = dx * c - dz * s;
  out[1] = p[1] - ship.position[1];
  out[2] = dx * s + dz * c;
  return out;
}
function shipBoxesT(ship, a, b) {
  const sp = SHIP_SPECS[ship.kind];
  const r = Math.hypot(sp.halfLength, sp.halfWidth) + 5;
  const P = ship.position;
  if (Math.max(a[0], b[0]) < P[0] - r || Math.min(a[0], b[0]) > P[0] + r || Math.max(a[2], b[2]) < P[2] - r || Math.min(a[2], b[2]) > P[2] + r)
    return null;
  toShipLocal(ship, a, _sl0);
  toShipLocal(ship, b, _sl1);
  const hull = boxT(_sl0, _sl1, 0, (sp.deckHeight - 15) / 2, 0, sp.halfWidth, (sp.deckHeight + 15) / 2, sp.halfLength);
  const I = sp.island;
  const isl = boxT(_sl0, _sl1, I.center[0], I.center[1], I.center[2], I.half[0], I.half[1], I.half[2]);
  return hull === null ? isl : isl === null ? hull : Math.min(hull, isl);
}
function shipSegmentT(id, a, b) {
  const ship = posedShip(id);
  return ship ? shipBoxesT(ship, a, b) : null;
}
var _shipHit = { t: 2, ship: null };
function segmentHitsShipEx(cs, a, b, now, skip) {
  const fleet = posedFleet();
  let best = null;
  let bestT = 2;
  for (let i = 0;i < fleet.length; i++) {
    const ship = fleet[i];
    if (ship.id === skip)
      continue;
    const rt = shipRuntime(cs, ship.id);
    if (rt && rt.sunk && now - rt.sunkAt > SHIP_SINK_COLLISION_TIME)
      continue;
    const t = shipBoxesT(ship, a, b);
    if (t !== null && t < bestT) {
      bestT = t;
      best = ship;
    }
  }
  if (!best)
    return null;
  _shipHit.t = bestT;
  _shipHit.ship = best;
  return _shipHit;
}
function shipAimPoint(cs, id, out) {
  const ship = posedShip(id);
  const rt = shipRuntime(cs, id);
  if (!ship || !rt || rt.sunk || ship.team >= fleetState().teams)
    return false;
  out[0] = ship.position[0];
  out[1] = SHIP_SPECS[ship.kind].deckHeight * 0.6;
  out[2] = ship.position[2];
  return true;
}
var _sap = [0, 0, 0];
function shipLockAngle(cs, vehicle, spec, axis, id) {
  const ship = posedShip(id);
  if (!ship || ship.team === vehicle.team || !shipAimPoint(cs, id, _sap))
    return -1;
  const ang = seekerAngle(vehicle.flight.position, axis, _sap, _sd);
  const range = spec.range ?? 2500;
  return _sd.d > range || ang > (spec.lockCone ?? 0.3) * SHIP_LOCK_CONE_SCALE ? -1 : ang;
}
function shipLockCandidate(cs, vehicle, spec, axis) {
  const fleet = posedFleet();
  let best = null;
  let bestAng = Infinity;
  for (let i = 0;i < fleet.length; i++) {
    const ang = shipLockAngle(cs, vehicle, spec, axis, fleet[i].id);
    if (ang >= 0 && ang < bestAng) {
      bestAng = ang;
      best = fleet[i].id;
    }
  }
  return best;
}
function damageShip(cs, id, amount, by, byTeam, worldPos, now, events) {
  const rt = shipRuntime(cs, id);
  const ship = posedShip(id);
  if (!rt || !ship || rt.sunk || amount <= 0 || rt.team === byTeam)
    return;
  const dealt = Math.min(amount, rt.hp);
  rt.hp -= dealt;
  if (!cs.shipDamageBy)
    cs.shipDamageBy = [0, 0, 0, 0];
  if (byTeam >= 0 && byTeam < 4)
    cs.shipDamageBy[byTeam] += dealt;
  const local = toShipLocal(ship, worldPos, [0, 0, 0]);
  const decal = [Math.round(local[0] * 10) / 10, Math.round(local[1] * 10) / 10, Math.round(local[2] * 10) / 10];
  if (rt.damage.length < SHIP_DAMAGE_POINTS)
    rt.damage.push(decal);
  else
    rt.damage[rt.damageCount % SHIP_DAMAGE_POINTS] = decal;
  rt.damageCount++;
  let hitTurret = null;
  let bestD = TURRET_HIT_RADIUS;
  for (const t of SHIP_SPECS[rt.kind].turrets) {
    const tr = rt.turrets[t.id];
    if (!tr || tr.hp <= 0)
      continue;
    const d = Math.hypot(local[0] - t.offset[0], local[1] - t.offset[1], local[2] - t.offset[2]);
    if (d <= bestD) {
      bestD = d;
      hitTurret = t.id;
    }
  }
  const e = { type: "ship-hit", ship: id, by, damage: Math.round(dealt * 10) / 10, position: [worldPos[0], worldPos[1], worldPos[2]] };
  if (hitTurret)
    e.turret = hitTurret;
  events.push(e);
  if (hitTurret) {
    const tr = rt.turrets[hitTurret];
    tr.hp = Math.max(0, tr.hp - amount);
    if (tr.hp <= 0)
      events.push({ type: "turret-destroyed", ship: id, turret: hitTurret, by });
  }
  if (rt.hp <= 0) {
    rt.hp = 0;
    rt.sunk = true;
    rt.sunkAt = now;
    events.push({ type: "ship-sunk", ship: id, team: rt.team, by, position: [ship.position[0], 0, ship.position[2]] });
  }
}
function turretOperational(cs, shipId, turretId) {
  const rt = shipRuntime(cs, shipId);
  if (!rt || rt.sunk)
    return false;
  const tr = rt.turrets[turretId];
  return !!tr && tr.hp > 0;
}
var _ta = [0, 0, 0];
var _tm = [0, 0, 0];
function findTurret(shipId, turretId) {
  for (let i = 0;i < AA_TURRETS.length; i++)
    if (AA_TURRETS[i].ship.id === shipId && AA_TURRETS[i].turret === turretId)
      return AA_TURRETS[i];
  return null;
}
function turretMuzzle(t, dir, out) {
  out[0] = t.position[0] + dir[0] * 3;
  out[1] = t.position[1] + dir[1] * 3;
  out[2] = t.position[2] + dir[2] * 3;
  return out;
}
function applyTurretInput(cs, shipId, turretId, player, input, now, events) {
  const t = findTurret(shipId, turretId);
  const rt = shipRuntime(cs, shipId);
  if (!t || !rt || !turretOperational(cs, shipId, turretId) || t.team >= fleetState().teams)
    return;
  const tr = rt.turrets[turretId];
  refreshTurret(t);
  if (!input.firePrimary || !input.aim || !normalizeInto(input.aim, _ta))
    return;
  if (tr.readyAt < now - TICK_DT)
    tr.readyAt = now;
  if (t.kind === "ciws") {
    const spec = WEAPONS.cannon20;
    let fired = 0;
    while (tr.readyAt <= now + 0.000000001 && fired < 4 && cs.projectiles.length < MAX_PROJECTILES) {
      const id = cs.nextId++;
      _dir[0] = _ta[0];
      _dir[1] = _ta[1];
      _dir[2] = _ta[2];
      applySpread(_dir, 0.004, id);
      turretMuzzle(t, _dir, _tm);
      const vx = _dir[0] * spec.speed, vy = _dir[1] * spec.speed, vz = _dir[2] * spec.speed;
      const proj = {
        id,
        weapon: "cannon20",
        owner: player,
        vehicle: shipId,
        team: t.team,
        position: [_tm[0] - vx * TICK_DT, _tm[1] - vy * TICK_DT, _tm[2] - vz * TICK_DT],
        velocity: [vx, vy, vz],
        age: -TICK_DT,
        ttl: spec.ttl,
        ship: shipId
      };
      cs.projectiles.push(proj);
      tr.readyAt += 1 / MANNED_CIWS_RATE;
      fired++;
    }
    if (fired && Math.floor(now * 4) !== Math.floor((now - TICK_DT) * 4))
      emitAa(t, null, aimPointAlong(t.position, _ta, 800), events);
  } else if (tr.readyAt <= now + 0.000000001) {
    tr.readyAt = now + MANNED_GUN_RELOAD;
    if (!cs.shells)
      cs.shells = [];
    turretMuzzle(t, _ta, _tm);
    cs.shells.push({
      id: cs.nextId++,
      owner: player,
      ship: shipId,
      team: t.team,
      position: [_tm[0], _tm[1], _tm[2]],
      velocity: [_ta[0] * AA_GUN_SHELL_SPEED, _ta[1] * AA_GUN_SHELL_SPEED, _ta[2] * AA_GUN_SHELL_SPEED],
      age: 0
    });
    emitAa(t, null, aimPointAlong(t.position, _ta, 1500), events);
  }
}
var _apa = [0, 0, 0];
function aimPointAlong(p, dir, d) {
  _apa[0] = p[0] + dir[0] * d;
  _apa[1] = p[1] + dir[1] * d;
  _apa[2] = p[2] + dir[2] * d;
  return _apa;
}
function stepShells(cs, vehicles, dt, now, events) {
  const list = cs.shells;
  if (!list || !list.length)
    return;
  let w = 0;
  for (let i = 0;i < list.length; i++) {
    const sh = list[i];
    sh.age += dt;
    const { position: pos, velocity: vel } = sh;
    _p0[0] = pos[0];
    _p0[1] = pos[1];
    _p0[2] = pos[2];
    _p1[0] = pos[0] + vel[0] * dt;
    _p1[1] = pos[1] + vel[1] * dt;
    _p1[2] = pos[2] + vel[2] * dt;
    let burstT = -1;
    for (let k = 0;k < vehicles.length; k++) {
      const v = vehicles[k];
      if (!v.alive || v.team === sh.team)
        continue;
      const t = sweptSphere(_p0, _p1, v.flight.position, v.flight.velocity, dt, MANNED_GUN_FUSE + VEHICLES[v.kind].radius);
      if (t >= 0 && (burstT < 0 || t < burstT))
        burstT = t;
    }
    let g = segmentHitsGround(_p0, _p1);
    if (g !== null) {
      const own = shipSegmentT(sh.ship, _p0, _p1);
      if (own !== null && Math.abs(own - g) < 0.0001 && sh.age < 0.5)
        g = null;
    }
    const impact = g !== null && (burstT < 0 || g < burstT);
    if (burstT < 0 && !impact && sh.age < SHELL_TTL) {
      pos[0] = _p1[0];
      pos[1] = _p1[1];
      pos[2] = _p1[2];
      list[w++] = sh;
      continue;
    }
    lerpInto(_p0, _p1, impact ? g : burstT >= 0 ? burstT : 1, _hit);
    if (impact) {
      const shp = segmentHitsShipEx(cs, _p0, _p1, now, sh.ship);
      if (shp && Math.abs(shp.t - g) < 0.001) {
        if (shp.ship.team !== sh.team)
          damageShip(cs, shp.ship.id, AA_GUN_DAMAGE * (SHIP_DAMAGE_SCALE.rockets ?? 1), sh.owner, sh.team, _hit, now, events);
        pushExplosion(events, _hit, AA_GUN_SPLASH * 0.5, "ground");
      } else {
        const surface = surfaceAt(_hit);
        pushExplosion(events, _hit, AA_GUN_SPLASH * 0.5, surface);
        if (surface === "ground")
          addCrater(cs, _hit, craterRadius("flak"), events);
      }
    } else
      pushExplosion(events, _hit, AA_GUN_SPLASH * 0.5, "air", true);
    for (let k = 0;k < vehicles.length; k++) {
      const v = vehicles[k];
      if (!v.alive || v.team === sh.team)
        continue;
      const dd = Math.max(0, dist(_hit, v.flight.position) - VEHICLES[v.kind].radius);
      if (dd >= AA_GUN_SPLASH)
        continue;
      dealDamage(v, aaDamage(v, AA_GUN_DAMAGE * (1 - dd / AA_GUN_SPLASH), now), AA_WEAPON, sh.owner, _hit, now, events);
    }
  }
  list.length = w;
}
var AA_WEAPON = "aa";
var AA_ACQUIRE = 1;
var AA_SCAN_INTERVAL = 0.1;
var CIWS_DPS = 52;
var CIWS_FULL_RANGE = 400;
var CIWS_MAX_RANGE = 900;
var AA_CROSSING_SCALE = 0.3;
var AA_MANEUVER_SCALE = 35;
var AA_SPEED_SCALE = 450;
var AA_EVENT_INTERVAL = 0.1;
var CIWS_TRACER_SPEED = 1100;
var AA_GUN_SHELL_SPEED = 800;
var AA_GUN_RELOAD = 2;
var AA_GUN_DAMAGE = 70;
var AA_GUN_SPLASH = 25;
var AA_GUN_DISPERSION = 0.035;
function ciwsFactor(d) {
  if (d >= CIWS_MAX_RANGE)
    return 0;
  if (d <= CIWS_FULL_RANGE)
    return 1;
  return 1 - (d - CIWS_FULL_RANGE) / (CIWS_MAX_RANGE - CIWS_FULL_RANGE);
}
function aaAccuracy(turretPos, targetPos, v, accel) {
  const dx = targetPos[0] - turretPos[0], dy = targetPos[1] - turretPos[1], dz = targetPos[2] - turretPos[2];
  const d = Math.max(1, Math.sqrt(dx * dx + dy * dy + dz * dz));
  const radial = (v[0] * dx + v[1] * dy + v[2] * dz) / d;
  const speed2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
  const crossing = Math.sqrt(Math.max(0, speed2 - radial * radial)) / d;
  const c = crossing / AA_CROSSING_SCALE, a = accel / AA_MANEUVER_SCALE, sp = Math.sqrt(speed2) / AA_SPEED_SCALE;
  return 1 / (1 + c * c + a * a + sp * sp);
}
var AA_TURRETS = FLEET.flatMap((ship) => SHIP_SPECS[ship.kind].turrets.map((t) => ({ ship, turret: t.id, kind: t.kind, team: ship.team, position: shipToWorld(ship, t.offset), offset: t.offset })));
function poseOf(ship) {
  return posedShip(ship.id) ?? ship;
}
function refreshTurret(t) {
  if (!t.offset)
    return;
  const ship = poseOf(t.ship);
  const c = Math.cos(ship.heading), s = Math.sin(ship.heading), o = t.offset;
  t.position[0] = ship.position[0] + o[0] * c + o[2] * s;
  t.position[1] = ship.position[1] + o[1];
  t.position[2] = ship.position[2] - o[0] * s + o[2] * c;
}
function createTurretStates() {
  return AA_TURRETS.map((_, i) => ({
    target: null,
    track: 0,
    pending: 0,
    nextEventAt: 0,
    readyAt: 0,
    nextScanAt: i % 6 * (AA_SCAN_INTERVAL / 6)
  }));
}
var _ls = [0, 0, 0];
var _lead = [0, 0, 0];
var _zero = [0, 0, 0];
function turretHasLOS(t, p) {
  const spec = SHIP_SPECS[t.ship.kind];
  refreshTurret(t);
  const ship = poseOf(t.ship);
  const a = worldToShip(ship, t.position), b = worldToShip(ship, p);
  const top = Math.max(spec.deckHeight, spec.island.center[1] + spec.island.half[1]) + 2;
  const lo = [-spec.halfWidth - 2, -5, -spec.halfLength - 2], hi = [spec.halfWidth + 2, top, spec.halfLength + 2];
  let tExit = 0;
  let tEnter = 0, tOut = 1, hits = true;
  for (let k = 0;k < 3; k++) {
    const d = b[k] - a[k];
    if (Math.abs(d) < 0.000000001) {
      if (a[k] < lo[k] || a[k] > hi[k]) {
        hits = false;
        break;
      }
      continue;
    }
    let t0 = (lo[k] - a[k]) / d, t1 = (hi[k] - a[k]) / d;
    if (t0 > t1) {
      const x = t0;
      t0 = t1;
      t1 = x;
    }
    if (t0 > tEnter)
      tEnter = t0;
    if (t1 < tOut)
      tOut = t1;
    if (tEnter > tOut) {
      hits = false;
      break;
    }
  }
  if (hits && tEnter <= 0)
    tExit = Math.min(1, tOut + 0.0001);
  if (tExit >= 1)
    return true;
  lerpInto(t.position, p, tExit, _ls);
  return segmentHitsGround(_ls, p) === null;
}
function aaEligible(t, v, now) {
  if (!v.alive || v.team === t.team || isSpawnProtected(v, now))
    return false;
  const p = v.flight.position;
  if (VEHICLES[v.kind].stealth && p[1] > STEALTH_AA_CEILING)
    return false;
  const dx = p[0] - t.position[0], dy = p[1] - t.position[1], dz = p[2] - t.position[2];
  return dx * dx + dy * dy + dz * dz <= AA_RANGE * AA_RANGE;
}
function aaScan(t, vehicles, now) {
  let lastD = -1;
  for (let attempt = 0;attempt < 3; attempt++) {
    let best = null;
    let bestD = Infinity;
    for (let i = 0;i < vehicles.length; i++) {
      const v = vehicles[i];
      if (!aaEligible(t, v, now))
        continue;
      const d = dist(t.position, v.flight.position);
      if (d > lastD && d < bestD) {
        bestD = d;
        best = v;
      }
    }
    if (!best)
      return null;
    if (turretHasLOS(t, best.flight.position))
      return best;
    lastD = bestD;
  }
  return null;
}
function aaDamage(v, amount, now) {
  const spotted = v.spottedUntil > now ? SPOTTED_DAMAGE_MULT : 1;
  return amount * ARMOR[v.kind] * spotted;
}
function applyAaDamage(t, v, amount, pos, now, events) {
  if (!v.alive || amount <= 0 || isSpawnProtected(v, now))
    return;
  v.hp -= amount;
  events.push({ type: "hit", target: v.id, by: t.ship.id, weapon: AA_WEAPON, damage: amount, position: [pos[0], pos[1], pos[2]] });
  if (v.hp <= 0)
    killVehicle(v, "aa", null, events, t.team);
}
function emitAa(t, target, aim, events) {
  events.push({
    type: "aa",
    ship: t.ship.id,
    turret: t.turret,
    kind: t.kind,
    target: target ? target.id : "",
    position: [t.position[0], t.position[1], t.position[2]],
    aim: [aim[0], aim[1], aim[2]]
  });
}
function stepFleetAA(cs, vehicles, dt, now, events) {
  if (!cs.turrets || cs.turrets.length !== AA_TURRETS.length)
    cs.turrets = createTurretStates();
  if (!cs.bursts)
    cs.bursts = [];
  const states = cs.turrets;
  const teams = fleetState().teams;
  for (let i = 0;i < AA_TURRETS.length; i++) {
    const t = AA_TURRETS[i], st = states[i];
    if (t.offset && t.team >= teams) {
      st.target = null;
      st.track = 0;
      st.pending = 0;
      continue;
    }
    const srt = t.offset ? shipRuntime(cs, t.ship.id) : null;
    const trt = srt ? srt.turrets[t.turret] : null;
    if (srt && (srt.sunk || !trt || trt.hp <= 0 || trt.manned)) {
      st.target = null;
      st.track = 0;
      st.pending = 0;
      continue;
    }
    refreshTurret(t);
    let target = st.target ? findVehicle(vehicles, st.target) : null;
    if (target && !aaEligible(t, target, now))
      target = null;
    if (now >= st.nextScanAt) {
      st.nextScanAt = now + AA_SCAN_INTERVAL;
      if (!target || !turretHasLOS(t, target.flight.position))
        target = aaScan(t, vehicles, now);
    }
    const id = target ? target.id : null;
    if (id !== st.target) {
      st.target = id;
      st.track = 0;
      st.pending = 0;
      st.accel = 0;
      st.lastVel = undefined;
    }
    if (!target)
      continue;
    const tp = target.flight.position, tv = target.flight.velocity;
    if (st.lastVel) {
      const ax = (tv[0] - st.lastVel[0]) / dt, ay = (tv[1] - st.lastVel[1]) / dt, az = (tv[2] - st.lastVel[2]) / dt;
      const sp = Math.max(0.000001, Math.sqrt(tv[0] * tv[0] + tv[1] * tv[1] + tv[2] * tv[2]));
      const along = (ax * tv[0] + ay * tv[1] + az * tv[2]) / sp;
      const lat = Math.sqrt(Math.max(0, ax * ax + ay * ay + az * az - along * along));
      st.accel = (st.accel ?? 0) + (Math.min(lat, 200) - (st.accel ?? 0)) * Math.min(1, dt / 0.3);
      st.lastVel[0] = tv[0];
      st.lastVel[1] = tv[1];
      st.lastVel[2] = tv[2];
    } else
      st.lastVel = [tv[0], tv[1], tv[2]];
    st.track += dt;
    if (st.track < AA_ACQUIRE * (isHiddenStealth(target, now) ? 2 : 1))
      continue;
    const d = dist(t.position, tp);
    const acc = aaAccuracy(t.position, tp, tv, st.accel ?? 0);
    if (t.kind === "ciws") {
      st.pending += aaDamage(target, CIWS_DPS * ciwsFactor(d) * acc, now) * dt;
      if (now >= st.nextEventAt) {
        st.nextEventAt = now + AA_EVENT_INTERVAL;
        if (leadPoint(t.position, _zero, CIWS_TRACER_SPEED, tp, tv, _lead) < 0) {
          _lead[0] = tp[0];
          _lead[1] = tp[1];
          _lead[2] = tp[2];
        }
        emitAa(t, target, _lead, events);
        const dmg = st.pending;
        st.pending = 0;
        applyAaDamage(t, target, dmg, tp, now, events);
      }
    } else if (now >= st.readyAt) {
      st.readyAt = now + AA_GUN_RELOAD;
      const tof = leadPoint(t.position, _zero, AA_GUN_SHELL_SPEED, tp, tv, _lead);
      if (tof < 0)
        continue;
      const seed = (i + 1) * 7919 + Math.floor(now * 60);
      const spread = AA_GUN_DISPERSION * d / Math.sqrt(acc);
      const ox = (hash01(seed, 11) * 2 - 1) * spread, oy = (hash01(seed, 12) * 2 - 1) * spread, oz = (hash01(seed, 13) * 2 - 1) * spread;
      emitAa(t, target, _lead, events);
      cs.bursts.push({ at: now + tof, position: [_lead[0] + ox, _lead[1] + oy, _lead[2] + oz], ship: t.ship.id, team: t.team });
    }
  }
  const bursts = cs.bursts;
  let w = 0;
  for (let i = 0;i < bursts.length; i++) {
    const b = bursts[i];
    if (b.at > now) {
      bursts[w++] = b;
      continue;
    }
    pushExplosion(events, b.position, AA_GUN_SPLASH * 0.5, "air", true);
    const t = AA_TURRETS.find((x) => x.ship.id === b.ship);
    if (!t)
      continue;
    for (let k = 0;k < vehicles.length; k++) {
      const v = vehicles[k];
      if (!v.alive || v.team === b.team)
        continue;
      const dd = Math.max(0, dist(b.position, v.flight.position) - VEHICLES[v.kind].radius);
      if (dd >= AA_GUN_SPLASH)
        continue;
      applyAaDamage(t, v, aaDamage(v, AA_GUN_DAMAGE * (1 - dd / AA_GUN_SPLASH), now), b.position, now, events);
    }
  }
  bursts.length = w;
}

// src/sim/bots.ts
var BOT_VISUAL_RANGE = 4500;
var BOT_PULSE_RANGE = 4000;
var HELI_LIFTOFF_ALT = 95;
var BOMBER_CRUISE_ALT = 1800;
var BOMBER_REATTACK_RANGE = 4000;
var STRIKE_LAUNCH_RANGE = 1500;
var STRIKE_BREAK_RANGE = 600;
var STRIKE_REATTACK_RANGE = 2600;
var DEFEND_FLEET_RANGE = 3000;
var STRIKE_SELF_DEFENSE = 1200;
function emptySeat(aim) {
  const seat = { aim, firePrimary: false, fireSecondary: false, flares: false, ability: false, viewDelay: 0 };
  return seat;
}
function createBotBrain(seed, skill) {
  const flightAim = [0, 0, -1], pilotAim = [0, 0, -1], gunnerAim = [0, 0, -1];
  const flight = { aim: flightAim, throttle: 0, roll: 0, yaw: 0, pitch: 0, boost: false, brake: false };
  const pilotSeat = emptySeat(pilotAim), gunnerSeat = emptySeat(gunnerAim);
  const brain = {
    memory: {},
    state: {
      rng: seed ^ 2654435769 | 0,
      skill: 0.5,
      vehicleId: null,
      phase: "takeoff",
      runwayDir: [0, -1],
      spawnPos: [0, 0, 0],
      targetId: null,
      retargetAt: 0,
      waypoint: [0, 1000, 0],
      waypointUntil: 0,
      jitterYaw: 0,
      jitterPitch: 0,
      jitterUntil: 0,
      threatId: -1,
      threatSeenAt: 0,
      breakSign: 1,
      extendUntil: 0,
      lastMissileAt: -1e9,
      guideTargetId: null,
      guideUntil: 0,
      engagedSince: -1,
      threatDelay: 1,
      burstUntil: 0,
      burstPauseUntil: 0,
      lastHp: -1,
      evadeUntil: 0,
      evadeCooldownUntil: 0,
      gunAimSet: false,
      steer: [0, 0, -1],
      steerAt: -1,
      role: "fighter",
      defender: false,
      strikeShip: null,
      strikePhase: "approach",
      strikeUntil: 0
    },
    out: {
      flight,
      pilotSeat,
      gunnerSeat,
      flightAim,
      pilotAim,
      gunnerAim,
      pilot: { flight, seat: pilotSeat },
      gunner: { seat: gunnerSeat }
    }
  };
  brain.state.skill = clamp2(skill ?? 0.35 + botRandom(brain) * 0.3, 0, 1);
  return brain;
}
function jitterAmp(skill) {
  return 0.11 - 0.1 * skill;
}
function reactionMin(skill) {
  return 1 - 0.8 * skill;
}
function missileInterval(skill) {
  return 11 - 6 * skill;
}
function gunRange(skill, w) {
  return Math.min(effectiveRange(w), 600 + 500 * skill);
}
function leadFactor(skill) {
  return 0.5 + 0.5 * skill;
}
function steerRate(skill) {
  return 0.8 + 1.2 * skill;
}
function steerLag(skill) {
  return 0.6 - 0.45 * skill;
}
function crewMissileAt(v) {
  return v.botMissileAt ?? -1e9;
}
var MAX_BOTS_PER_TARGET = 2;
var CLAIM_TTL = 1.5;
function botRandom(brain) {
  let t = brain.state.rng = brain.state.rng + 1831565813 | 0;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
var KIND_WEIGHT = { fighter: 3, apache: 2, warthog: 2, blackbird: 1.2, bomber: 0.9 };
var KINDS = Object.keys(KIND_WEIGHT);
function chooseBotVehicle(bot, teammates, vehicles, rng) {
  const counts = { fighter: 0, apache: 0, warthog: 0, blackbird: 0, bomber: 0 };
  for (const v of vehicles)
    if (v.alive && v.team === bot.team)
      counts[v.kind]++;
  let total = 0;
  for (const k of KINDS)
    total += kindWeight(k, counts);
  let r = clamp2(rng(), 0, 0.999999) * total;
  for (const k of KINDS) {
    r -= kindWeight(k, counts);
    if (r < 0)
      return k;
  }
  return KINDS[0];
}
function kindWeight(k, counts) {
  return KIND_WEIGHT[k] / (1 + counts[k] * 1.5) * ((k === "blackbird" || k === "bomber") && counts[k] >= 2 ? 0.1 : 1);
}
function clamp2(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
function set3(o, x, y, z) {
  o[0] = x;
  o[1] = y;
  o[2] = z;
  return o;
}
function copy3(o, v) {
  o[0] = v[0];
  o[1] = v[1];
  o[2] = v[2];
  return o;
}
function norm(v) {
  const l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (!(l > 0.000000001) || !Number.isFinite(l))
    return set3(v, 0, 0, -1);
  v[0] /= l;
  v[1] /= l;
  v[2] /= l;
  return v;
}
function dist2(a, b) {
  const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
function speedOf(v) {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}
function angleTo(u, from, to) {
  const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
  const l = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (l < 0.000001)
    return 0;
  return Math.acos(clamp2((u[0] * dx + u[1] * dy + u[2] * dz) / l, -1, 1));
}
function angleBetween(a, b) {
  const la = speedOf(a), lb = speedOf(b);
  if (la < 0.000000001 || lb < 0.000000001)
    return Math.PI;
  return Math.acos(clamp2((a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (la * lb), -1, 1));
}
function noseInto(q, out) {
  const [x, y, z, w] = q;
  return set3(out, -(2 * (x * z + w * y)), -(2 * (y * z - w * x)), -(1 - 2 * (x * x + y * y)));
}
function headingPitch(hx, hz, pitch, out) {
  let h = Math.sqrt(hx * hx + hz * hz);
  if (h < 0.000001) {
    hx = 0;
    hz = -1;
    h = 1;
  }
  const c = Math.cos(pitch);
  return set3(out, hx / h * c, Math.sin(pitch), hz / h * c);
}
function pitchOf(v) {
  return Math.atan2(v[1], Math.sqrt(v[0] * v[0] + v[2] * v[2]));
}
function setPitch(v, pitch) {
  return headingPitch(v[0], v[2], pitch, v);
}
function interceptTime(dx, dy, dz, vx, vy, vz, speed) {
  const a = vx * vx + vy * vy + vz * vz - speed * speed;
  const b = 2 * (dx * vx + dy * vy + dz * vz);
  const c = dx * dx + dy * dy + dz * dz;
  const straight = Math.sqrt(c) / Math.max(speed, 1);
  let t;
  if (Math.abs(a) < 0.000001)
    t = b < 0 ? -c / b : straight;
  else {
    const disc = b * b - 4 * a * c;
    if (disc < 0)
      return straight;
    const s = Math.sqrt(disc);
    const t1 = (-b - s) / (2 * a), t2 = (-b + s) / (2 * a);
    t = t1 > 0 && t2 > 0 ? Math.min(t1, t2) : t1 > 0 ? t1 : t2 > 0 ? t2 : straight;
  }
  return Math.min(t, 20);
}
function leadDirection(shooterPos, shooterVel, targetPos, targetVel, speed, gravity, out) {
  const dx = targetPos[0] - shooterPos[0], dy = targetPos[1] - shooterPos[1], dz = targetPos[2] - shooterPos[2];
  const vx = targetVel[0] - shooterVel[0], vy = targetVel[1] - shooterVel[1], vz = targetVel[2] - shooterVel[2];
  const t = interceptTime(dx, dy, dz, vx, vy, vz, speed);
  set3(out, dx + vx * t, dy + vy * t + 0.5 * gravity * t * t, dz + vz * t);
  norm(out);
  return t;
}
function terrainMinPitch(pos, vel, ground, clearance, lookahead, fallbackDir) {
  let hx = vel[0], hz = vel[2];
  const hs = Math.sqrt(hx * hx + hz * hz);
  if (hs < 20 && fallbackDir) {
    hx = fallbackDir[0];
    hz = fallbackDir[2];
  }
  const h = Math.sqrt(hx * hx + hz * hz);
  const dx = h > 0.000001 ? hx / h : 0, dz = h > 0.000001 ? hz / h : -1;
  const speed = Math.max(hs, 40);
  const sink = Math.min(vel[1], 0);
  let need = -1.2;
  const agl = pos[1] - ground.groundHeight(pos[0], pos[2]);
  if (agl < clearance)
    need = clamp2(0.15 + (1 - agl / clearance) * 0.45, 0.15, 0.6);
  for (let i = 1;i <= 6; i++) {
    const t = lookahead * i / 6;
    const d = speed * t;
    const g = ground.groundHeight(pos[0] + dx * d, pos[2] + dz * d);
    const y = pos[1] + sink * Math.min(t, 1.5);
    const n = Math.atan2(g + clearance - y, d);
    if (n > need)
      need = n;
  }
  return clamp2(need, -1.2, 1.2);
}
function groundAhead(pos, dir, speed, ground, lookahead) {
  const h = Math.sqrt(dir[0] * dir[0] + dir[2] * dir[2]);
  const dx = h > 0.000001 ? dir[0] / h : 0, dz = h > 0.000001 ? dir[2] / h : 0;
  const reach = Math.max(speed * lookahead, 300);
  let max = ground.groundHeight(pos[0], pos[2]);
  for (let i = 1;i <= 5; i++) {
    const d = reach * i / 5;
    const g = ground.groundHeight(pos[0] + dx * d, pos[2] + dz * d);
    if (g > max)
      max = g;
  }
  return max;
}
var BOT_NO_FLY_RADIUS = AA_RANGE + 300;
var NO_FLY_BUFFER = 500;
function hostileFleetDistance(team, x, z) {
  let best = Infinity;
  const fleet = posedFleet();
  for (let i = 0;i < fleet.length; i++) {
    const sh = fleet[i];
    if (sh.team === team)
      continue;
    const dx = x - sh.position[0], dz = z - sh.position[2];
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < best)
      best = d;
  }
  return best;
}
function shipClearanceAlt(pos, dx, dz, reach, margin) {
  const h = Math.sqrt(dx * dx + dz * dz);
  if (h < 0.000001) {
    dx = 0;
    dz = 0;
  } else {
    dx /= h;
    dz /= h;
  }
  let need = -Infinity;
  const fleet = posedFleet();
  for (let i = 0;i < fleet.length; i++) {
    const sh = fleet[i];
    const sp = SHIP_SPECS[sh.kind];
    const top = sp.island.center[1] + sp.island.half[1];
    if (pos[1] > top + margin + 60)
      continue;
    const rx = sh.position[0] - pos[0], rz = sh.position[2] - pos[2];
    const along = rx * dx + rz * dz;
    const lateral = Math.abs(rx * dz - rz * dx);
    const hit = sp.halfLength + 40;
    if (along < -0.3 * hit || along > reach + hit || lateral > hit)
      continue;
    if (top + margin > need)
      need = top + margin;
  }
  return need;
}
function applyAimSafety(aim, pos, vel, world, clearance, lookahead, team, jet = true) {
  norm(aim);
  const margin = Math.min(1200, world.half * 0.15);
  const edge = Math.max(Math.abs(pos[0]), Math.abs(pos[2])) - (world.half - margin);
  if (edge > 0) {
    const cl = Math.sqrt(pos[0] * pos[0] + pos[2] * pos[2]) || 1;
    const w = clamp2(edge / margin + 0.3, 0, 1);
    headingPitch(aim[0] * (1 - w) - pos[0] / cl * w, aim[2] * (1 - w) - pos[2] / cl * w, pitchOf(aim), aim);
  }
  if (team !== null) {
    const fleet = posedFleet();
    for (let i = 0;i < fleet.length; i++) {
      const sh = fleet[i];
      if (sh.team === team)
        continue;
      const bx = pos[0] - sh.position[0], bz = pos[2] - sh.position[2];
      const r = Math.sqrt(bx * bx + bz * bz);
      const reach = BOT_NO_FLY_RADIUS + NO_FLY_BUFFER;
      if (r >= reach || r < 0.001)
        continue;
      const ox = bx / r, oz = bz / r;
      const h = Math.sqrt(aim[0] * aim[0] + aim[2] * aim[2]) || 1;
      const inward = -(aim[0] * ox + aim[2] * oz) / h;
      const w = clamp2((reach - r) / NO_FLY_BUFFER, 0, 1);
      if (r < BOT_NO_FLY_RADIUS)
        headingPitch(ox, oz, pitchOf(aim), aim);
      else if (inward > -0.3 * w) {
        const push = (Math.max(inward, 0) + 0.3 * w) * (0.5 + w);
        headingPitch(aim[0] / h + ox * push, aim[2] / h + oz * push, pitchOf(aim), aim);
      }
    }
  }
  let minPitch = terrainMinPitch(pos, vel, world, clearance, lookahead, aim);
  const reach = Math.max(Math.sqrt(vel[0] * vel[0] + vel[2] * vel[2]) * lookahead, 300);
  const shipAlt = shipClearanceAlt(pos, aim[0], aim[2], reach, 40);
  if (shipAlt > pos[1])
    minPitch = Math.max(minPitch, Math.atan2(shipAlt - pos[1], 250));
  const p0 = pitchOf(aim);
  let p = p0 < minPitch ? minPitch : p0;
  if (pos[1] > world.ceiling - 350)
    p = Math.min(p, -0.08);
  else if (pos[1] > world.ceiling - 800)
    p = Math.min(p, 0.05);
  if (p !== p0)
    setPitch(aim, p);
  if (jet)
    jetEnvelope(aim, pos, vel, world);
  return aim;
}
function jetEnvelope(aim, pos, vel, world) {
  const hs = Math.sqrt(vel[0] * vel[0] + vel[2] * vel[2]);
  if (hs < 20)
    return;
  const agl = pos[1] - Math.max(world.groundHeight(pos[0], pos[2]), 0);
  const sink = -vel[1];
  if (sink > 20 && agl < 250 + sink * 6) {
    headingPitch(vel[0], vel[2], 0.35, aim);
    return;
  }
  if (agl > 700)
    return;
  const maxOff = 0.5 + agl / 700 * 0.6;
  const vh = Math.atan2(vel[0], vel[2]), ah = Math.atan2(aim[0], aim[2]);
  let d = ah - vh;
  d -= Math.round(d / (2 * Math.PI)) * 2 * Math.PI;
  if (Math.abs(d) <= maxOff)
    return;
  const h = vh + Math.sign(d) * maxOff;
  headingPitch(Math.sin(h), Math.cos(h), Math.max(pitchOf(aim), 0.05), aim);
}
var _t0 = [0, 0, 0];
var _t1 = [0, 0, 0];
var _t2 = [0, 0, 0];
var _nose = [0, 0, 0];
var _lead2 = [0, 0, 0];
function canEngage(target, myTeam, now) {
  if (!target.alive || target.team === myTeam || target.flight.crashed || isSpawnProtected(target, now))
    return false;
  if (VEHICLES[target.kind].stealth && target.spottedUntil <= now)
    return false;
  const p = target.flight.position;
  return !inSafeZone(target.team, p) && hostileFleetDistance(myTeam, p[0], p[2]) > BOT_NO_FLY_RADIUS;
}
function findVehicle2(vehicles, id) {
  if (!id)
    return null;
  for (let i = 0;i < vehicles.length; i++)
    if (vehicles[i].id === id)
      return vehicles[i];
  return null;
}
function selectTarget(self, vehicles, now, maxRange, currentId) {
  const me = self.flight.position;
  const heli = VEHICLES[self.kind].flight === "heli";
  let best = null;
  let bestScore = Infinity;
  for (let i = 0;i < vehicles.length; i++) {
    const v = vehicles[i];
    if (v === self || !canEngage(v, self.team, now))
      continue;
    if (v.id !== currentId && claimCount(v, self.id, now) >= MAX_BOTS_PER_TARGET)
      continue;
    const d = dist2(me, v.flight.position);
    const spotted = v.spottedUntil > now;
    if (d > maxRange || !spotted && d > BOT_VISUAL_RANGE)
      continue;
    let score = d;
    if (spotted)
      score *= 0.75;
    if (v.id === currentId)
      score *= 0.6;
    score *= 0.6 + 0.4 * (v.hp / Math.max(v.maxHp, 1));
    if (d < 1800 && angleTo(noseInto(v.flight.orientation, _t0), v.flight.position, me) < 0.45)
      score *= 0.5;
    if (heli && speedOf(v.flight.velocity) > 150)
      score *= 1.6;
    if (score < bestScore) {
      bestScore = score;
      best = v;
    }
  }
  return best;
}
function claimCount(target, selfId, now) {
  const c = target.botClaims;
  if (!c)
    return 0;
  let n = 0;
  for (const k in c)
    if (k !== selfId && c[k] > now)
      n++;
  return n;
}
function claimTarget(target, selfId, now) {
  const t = target;
  const c = t.botClaims ?? (t.botClaims = {});
  for (const k in c)
    if (c[k] <= now)
      delete c[k];
  c[selfId] = now + CLAIM_TTL;
}
function findThreat(self, missiles) {
  if (!missiles)
    return null;
  const me = self.flight.position;
  let best = null;
  let bestD = Infinity;
  for (let i = 0;i < missiles.length; i++) {
    const m = missiles[i];
    if (m.team === self.team)
      continue;
    if (m.target !== self.id && !(m.steered && m.scanTarget === self.id))
      continue;
    const d = dist2(me, m.position);
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}
function updateJitter(brain, now) {
  const s = brain.state;
  if (now < s.jitterUntil)
    return;
  const amp = jitterAmp(s.skill);
  s.jitterYaw = (botRandom(brain) * 2 - 1) * amp;
  s.jitterPitch = (botRandom(brain) * 2 - 1) * amp;
  s.jitterUntil = now + 0.3 + botRandom(brain) * 0.5;
}
function applyJitter(brain, aim, scale = 1) {
  const s = brain.state;
  const jy = s.jitterYaw * scale;
  const c = Math.cos(jy), sn = Math.sin(jy);
  const x = aim[0] * c + aim[2] * sn, z = -aim[0] * sn + aim[2] * c;
  aim[0] = x;
  aim[2] = z;
  return setPitch(aim, clamp2(pitchOf(aim) + s.jitterPitch * scale, -1.5, 1.5));
}
var GUN_AIM_JITTER_SCALE = 0.6;
function smoothSteer(brain, desired, now, from) {
  const s = brain.state;
  const dt = s.steerAt < 0 ? 0 : clamp2(now - s.steerAt, 0, 0.25);
  if (s.steerAt < 0 || now - s.steerAt > 0.5)
    copy3(s.steer, from);
  s.steerAt = now;
  const st = s.steer;
  const ang = angleBetween(st, desired);
  if (ang < 0.000001 || dt === 0) {
    if (dt === 0)
      copy3(desired, st);
    else
      copy3(st, desired);
    return;
  }
  const step = Math.min(ang, ang * (1 - Math.exp(-dt / steerLag(s.skill))), steerRate(s.skill) * dt);
  const t = step / ang;
  set3(st, st[0] + (desired[0] - st[0]) * t, st[1] + (desired[1] - st[1]) * t, st[2] + (desired[2] - st[2]) * t);
  norm(st);
  copy3(desired, st);
}
function burstAllowed(brain, now) {
  const s = brain.state;
  if (now < s.burstUntil)
    return true;
  if (now < s.burstPauseUntil)
    return false;
  s.burstUntil = now + 0.35 + 0.4 * s.skill + botRandom(brain) * 0.3;
  s.burstPauseUntil = s.burstUntil + (1.2 - 0.9 * s.skill) + botRandom(brain) * 0.5;
  return true;
}
function weaponReady(rt, now) {
  return !!rt && (rt.ammo < 0 || rt.ammo >= 1) && rt.readyAt <= now;
}
function effectiveRange(w) {
  switch (w.kind) {
    case "gun":
      return Math.min(w.speed * w.ttl * 0.8, GUN_FULL_RANGE);
    case "rockets":
      return Math.min(w.speed * w.ttl * 0.45, 1200);
    case "missile_lock":
      return (w.range ?? 2500) * 0.95;
    case "missile_scanner":
      return (w.range ?? 8000) * 0.9;
    case "pulse":
      return BOT_PULSE_RANGE;
    case "bomb":
      return 0;
  }
}
function resetSeat(seat, aimBuf, aim) {
  seat.aim = aim ? copy3(aimBuf, aim) : null;
  seat.firePrimary = false;
  seat.fireSecondary = false;
  seat.flares = false;
  seat.ability = false;
  seat.steerBomb = false;
  return seat;
}
function resetForVehicle(brain, vehicle) {
  const s = brain.state;
  s.vehicleId = vehicle.id;
  s.phase = vehicle.flight.onGround ? "takeoff" : "transit";
  noseInto(vehicle.flight.orientation, _t0);
  if (vehicle.flight.onGround) {
    const hd = carrierOf(vehicle.team).heading;
    set3(_t0, -Math.sin(hd), 0, -Math.cos(hd));
  }
  const h = Math.sqrt(_t0[0] * _t0[0] + _t0[2] * _t0[2]);
  s.runwayDir[0] = h > 0.000001 ? _t0[0] / h : 0;
  s.runwayDir[1] = h > 0.000001 ? _t0[2] / h : -1;
  copy3(s.spawnPos, vehicle.flight.position);
  s.targetId = null;
  s.retargetAt = 0;
  s.waypointUntil = 0;
  s.threatId = -1;
  s.extendUntil = 0;
  s.guideTargetId = null;
  s.guideUntil = 0;
  s.engagedSince = -1;
  s.breakSign = botRandom(brain) < 0.5 ? -1 : 1;
  s.role = hasAntiShip(vehicle.kind, 0) && botRandom(brain) < 0.65 ? "strike" : "fighter";
  s.defender = botRandom(brain) < 0.35;
  s.strikeShip = null;
  s.strikePhase = "approach";
  s.strikeUntil = 0;
}
function hasAntiShip(kind, seat) {
  for (const id of VEHICLES[kind].seatWeapons[seat]) {
    const k = id ? WEAPONS[id].kind : null;
    if (k === "rockets" || k === "missile_lock")
      return true;
  }
  return false;
}
function pickStrikeShip(team, pos, ships, preferEscort) {
  const fleet = posedFleet();
  let best = null;
  let bestScore = Infinity;
  for (let i = 0;i < fleet.length; i++) {
    const sh = fleet[i];
    if (sh.team === team || ships?.[sh.id]?.sunk)
      continue;
    let score = Math.hypot(sh.position[0] - pos[0], sh.position[2] - pos[2]);
    if (sh.kind === "carrier" === preferEscort)
      score *= 1.6;
    if (score < bestScore) {
      bestScore = score;
      best = sh;
    }
  }
  return best;
}
function fleetThreatened(team, target) {
  const fleet = posedFleet();
  const p = target.flight.position;
  for (let i = 0;i < fleet.length; i++) {
    const sh = fleet[i];
    if (sh.team === team && Math.hypot(sh.position[0] - p[0], sh.position[2] - p[2]) < DEFEND_FLEET_RANGE)
      return true;
  }
  return false;
}
function strike(brain, vehicle, ship, now, aim, heli) {
  const s = brain.state;
  const o = brain.out;
  const { flight, pilotSeat: seat } = o;
  const fs = vehicle.flight;
  const pos = fs.position;
  const sp = SHIP_SPECS[ship.kind];
  const tx = ship.position[0] - pos[0], tz = ship.position[2] - pos[2], ty = sp.deckHeight * 0.6 - pos[1];
  const hd = Math.sqrt(tx * tx + tz * tz);
  if (s.strikePhase === "egress") {
    if (hd > STRIKE_REATTACK_RANGE && now >= s.strikeUntil)
      s.strikePhase = "approach";
    else {
      const c = Math.cos(0.5 * s.breakSign), sn = Math.sin(0.5 * s.breakSign);
      headingPitch((-tx * c - tz * sn) / hd, (tx * sn - tz * c) / hd, heli ? -0.2 : 0.12, aim);
      flight.boost = !heli;
      return 1;
    }
  }
  if (hd < STRIKE_BREAK_RANGE) {
    s.strikePhase = "egress";
    s.strikeUntil = now + 6;
    s.breakSign = botRandom(brain) < 0.5 ? -1 : 1;
    headingPitch(-tx, -tz, 0.1, aim);
    return 1;
  }
  const cruiseAlt = heli ? 120 : 380;
  if (hd > STRIKE_LAUNCH_RANGE + 600) {
    headingPitch(tx, tz, clamp2(Math.atan2(cruiseAlt - pos[1], 1500), -0.3, 0.3), aim);
    flight.boost = !heli && hd > 4000;
    return heli ? 0.9 : 1;
  }
  norm(set3(aim, tx, ty, tz));
  const nose = noseInto(fs.orientation, _nose);
  const spec = VEHICLES[vehicle.kind];
  let fired = false;
  for (let slot = 0;slot < 2; slot++) {
    const id = spec.seatWeapons[0][slot];
    if (!id)
      continue;
    const w = WEAPONS[id];
    const rt = vehicle.weapons[0][slot];
    if (!weaponReady(rt, now))
      continue;
    if (w.kind === "missile_lock" && rt.lock >= 1 && rt.lockTarget?.startsWith("ship:") && now - crewMissileAt(vehicle) > 1.5)
      fired = true;
    else if (w.kind === "rockets" && hd < 1100 && angleBetween(nose, aim) < 0.06)
      fired = true;
    else
      continue;
    if (slot === 0)
      seat.firePrimary = true;
    else
      seat.fireSecondary = true;
    s.lastMissileAt = now;
    vehicle.botMissileAt = now;
  }
  if (fired && hd < STRIKE_LAUNCH_RANGE - 200 && botRandom(brain) < 0.05) {
    s.strikePhase = "egress";
    s.strikeUntil = now + 6;
  }
  return heli ? 0.8 : 0.55;
}
var _bomb = [0, 0, 0];
function bomberRun(brain, vehicle, ship, now, aim, world) {
  const s = brain.state;
  const fs = vehicle.flight, { position: pos, velocity: vel } = fs;
  const altPitch = clamp2(Math.atan2(BOMBER_CRUISE_ALT - pos[1], 1500), -0.25, 0.3);
  const tx = ship.position[0] - pos[0], tz = ship.position[2] - pos[2];
  const hd = Math.hypot(tx, tz);
  if (s.strikePhase === "egress") {
    if (hd > BOMBER_REATTACK_RANGE)
      s.strikePhase = "approach";
    else {
      headingPitch(vel[0] - tz * 0.15 * s.breakSign, vel[2] + tx * 0.15 * s.breakSign, altPitch, aim);
      return 0.9;
    }
  }
  const fall = bombImpactPoint(pos, vel, _bomb, world);
  const throwX = fall > 0 ? _bomb[0] - pos[0] : 0, throwZ = fall > 0 ? _bomb[2] - pos[2] : 0;
  const ax = tx - throwX, az = tz - throwZ;
  headingPitch(ax, az, altPitch, aim);
  if (Math.hypot(ax, az) < 250 && ax * vel[0] + az * vel[2] < 0) {
    s.strikePhase = "egress";
    s.breakSign = botRandom(brain) < 0.5 ? -1 : 1;
  }
  return 0.9;
}
function botInput(brain, bot, vehicle, vehicles, now, missiles, world = worldQuery, ships, projectiles) {
  const o = brain.out;
  if (!vehicle.alive || vehicle.flight.crashed || bot.seat !== 0 && bot.seat !== 1) {
    const f = o.flight;
    f.aim = null;
    f.throttle = 0;
    f.roll = 0;
    f.yaw = 0;
    f.pitch = 0;
    f.boost = false;
    f.brake = false;
    resetSeat(o.pilotSeat, o.pilotAim, null);
    resetSeat(o.gunnerSeat, o.gunnerAim, null);
    return bot.seat === 0 ? o.pilot : o.gunner;
  }
  if (brain.state.vehicleId !== vehicle.id)
    resetForVehicle(brain, vehicle);
  updateJitter(brain, now);
  if (bot.seat === 0) {
    const out = pilotInput(brain, bot, vehicle, vehicles, now, missiles, world, ships);
    if (!vehicle.seats[1])
      steerOwnBomb(bot, out.seat, o.pilotAim, projectiles, ships);
    return out;
  }
  gunnerInput(brain, bot, vehicle, vehicles, now, missiles, ships);
  steerOwnBomb(bot, o.gunnerSeat, o.gunnerAim, projectiles, ships);
  return o.gunner;
}
function pickWaypoint(brain, now, heli, half) {
  const s = brain.state;
  const ang = botRandom(brain) * Math.PI * 2;
  const r = botRandom(brain) * half * (heli ? 0.3 : 0.45);
  set3(s.waypoint, Math.cos(ang) * r, heli ? 180 : 900 + botRandom(brain) * 700, Math.sin(ang) * r);
  s.waypointUntil = now + 20 + botRandom(brain) * 20;
}
function pilotInput(brain, bot, vehicle, vehicles, now, missiles, world, ships) {
  const s = brain.state;
  const o = brain.out;
  const spec = VEHICLES[vehicle.kind];
  const heli = spec.flight === "heli";
  const fs = vehicle.flight;
  const { position: pos, velocity: vel } = fs;
  const nose = noseInto(fs.orientation, _nose);
  const speed = speedOf(vel);
  const ground = world.groundHeight(pos[0], pos[2]);
  const agl = pos[1] - ground;
  const flight = o.flight;
  flight.roll = 0;
  flight.yaw = 0;
  flight.pitch = 0;
  flight.boost = false;
  flight.brake = false;
  const seat = resetSeat(o.pilotSeat, o.pilotAim, null);
  s.gunAimSet = false;
  const aim = copy3(o.flightAim, nose);
  let desiredThrottle = 0.85;
  let heliAlt = pos[1];
  let clearance = heli ? 45 : 150;
  const lookahead = heli ? 4 : 7;
  let lookTarget = null;
  if (fs.onGround && s.phase !== "takeoff") {
    s.phase = "takeoff";
    copy3(s.spawnPos, pos);
  }
  if (s.phase === "takeoff" && !fs.onGround) {
    const fromSpawn = Math.hypot(pos[0] - s.spawnPos[0], pos[2] - s.spawnPos[2]);
    if (heli ? pos[1] > HELI_LIFTOFF_ALT : fromSpawn > LAUNCH_LANE_LENGTH * 0.5 && agl > 150 || fromSpawn > LAUNCH_LANE_LENGTH)
      s.phase = "transit";
  }
  if (s.phase === "takeoff") {
    const rd = s.runwayDir;
    if (heli) {
      headingPitch(rd[0], rd[1], 0, aim);
      heliAlt = HELI_LIFTOFF_ALT + 15;
      flight.brake = true;
    } else {
      const pitch = fs.onGround ? 0 : speed > spec.stall * 1.6 ? 0.15 : 0.07;
      headingPitch(rd[0], rd[1], pitch, aim);
      desiredThrottle = 1;
      flight.boost = fs.onGround || speed < spec.stall * 1.5;
      clearance = 25;
      if (!fs.onGround)
        applyAimSafety(aim, pos, vel, world, clearance, lookahead, null);
    }
    s.engagedSince = -1;
    return finishPilot(brain, vehicle, aim, heli, desiredThrottle, heliAlt, ground, world, null);
  }
  const threat = findThreat(vehicle, missiles);
  if (threat) {
    if (s.threatId !== threat.id) {
      s.threatId = threat.id;
      s.threatSeenAt = now;
      s.breakSign = botRandom(brain) < 0.5 ? -1 : 1;
      s.threatDelay = reactionMin(s.skill) + botRandom(brain) * 0.6;
    }
  } else
    s.threatId = -1;
  const defending = threat !== null && now >= s.threatSeenAt + s.threatDelay;
  const pressing = s.phase === "strike" && s.strikePhase === "approach";
  if (!pressing && s.lastHp >= 0 && vehicle.hp < s.lastHp - 0.5 && now >= s.evadeCooldownUntil && botRandom(brain) < 1 - 0.5 * s.skill) {
    s.evadeUntil = now + 2 + botRandom(brain) * 2;
    s.evadeCooldownUntil = s.evadeUntil + 4;
    s.breakSign = botRandom(brain) < 0.5 ? -1 : 1;
  }
  s.lastHp = vehicle.hp;
  const evading = now < s.evadeUntil;
  let target = findVehicle2(vehicles, s.targetId);
  if (now >= s.retargetAt || target && !canEngage(target, vehicle.team, now)) {
    const maxRange = vehicle.kind === "blackbird" ? 12000 : heli ? 5000 : 9000;
    target = selectTarget(vehicle, vehicles, now, maxRange, s.targetId);
    s.targetId = target ? target.id : null;
    s.retargetAt = now + 0.6 + (1 - s.skill) * 1.5 + botRandom(brain) * 0.4;
  }
  if (target && !canEngage(target, vehicle.team, now))
    target = null;
  if (target)
    claimTarget(target, vehicle.id, now);
  const inOwnSafe = inSafeZone(vehicle.team, pos);
  let striking = null;
  if (s.role === "strike" && !defending && !evading && !(target && (dist2(pos, target.flight.position) < STRIKE_SELF_DEFENSE || s.defender && fleetThreatened(vehicle.team, target)))) {
    const cur = s.strikeShip ? posedFleet().find((sh) => sh.id === s.strikeShip) ?? null : null;
    striking = cur && !ships?.[cur.id]?.sunk ? cur : pickStrikeShip(vehicle.team, pos, ships, botRandom(brain) < 0.3);
    s.strikeShip = striking ? striking.id : null;
  }
  if (vehicle.kind === "bomber" && !defending) {
    s.phase = "strike";
    const ship = pickStrikeShip(vehicle.team, pos, ships, false);
    if (ship)
      desiredThrottle = bomberRun(brain, vehicle, ship, now, aim, world);
    else
      headingPitch(-pos[0], -pos[2], 0, aim);
    const pilotBomb = spec.seatWeapons[0][0];
    if (!vehicle.seats[1] && pilotBomb && WEAPONS[pilotBomb].kind === "bomb")
      bombardier(vehicle, seat, null, ships, now, 0);
    flight.boost = false;
    lookTarget = null;
  } else if (striking) {
    s.phase = "strike";
    desiredThrottle = strike(brain, vehicle, striking, now, aim, heli);
    if (heli)
      heliAlt = ground + (s.strikePhase === "egress" ? 150 : 110);
    lookTarget = null;
  } else if (defending && threat) {
    s.phase = "defend";
    const lx = pos[0] - threat.position[0], lz = pos[2] - threat.position[2];
    headingPitch(-lz * s.breakSign, lx * s.breakSign, agl > 600 ? -0.2 : 0.1, aim);
    desiredThrottle = 1;
    flight.boost = true;
    const md = dist2(pos, threat.position);
    const flareAt = threat.steered ? SCANNER_FLARE_CLOSE : 1000 + 1500 * s.skill;
    if (md < flareAt && vehicle.flareCount > 0 && vehicle.flaresReadyAt <= now)
      seat.flares = true;
    heliAlt = Math.max(ground + 40, pos[1] - 30);
    lookTarget = target;
  } else if (evading) {
    s.phase = "defend";
    const hx = vel[0], hz = vel[2];
    headingPitch(hx * 0.3 - hz * s.breakSign, hz * 0.3 + hx * s.breakSign, agl > 700 ? -0.15 : 0.2, aim);
    desiredThrottle = 1;
    flight.boost = true;
    heliAlt = Math.max(ground + 50, pos[1] - 20);
    lookTarget = target;
  } else if (target) {
    if (s.phase !== "engage")
      s.engagedSince = now;
    s.phase = "engage";
    desiredThrottle = engage(brain, vehicle, target, now, aim, inOwnSafe);
    if (heli)
      heliAlt = clamp2(target.flight.position[1], ground + 60, ground + 600);
    lookTarget = target;
  } else {
    s.phase = "transit";
    if (now >= s.waypointUntil || Math.hypot(pos[0] - s.waypoint[0], pos[2] - s.waypoint[2]) < (heli ? 400 : 1000))
      pickWaypoint(brain, now, heli, world.half);
    const wp = s.waypoint;
    const dx = wp[0] - pos[0], dz = wp[2] - pos[2];
    const hd = Math.sqrt(dx * dx + dz * dz);
    if (heli) {
      heliAlt = ground + wp[1];
      headingPitch(dx, dz, hd > 300 ? -0.3 : 0, aim);
      flight.boost = hd > 3000;
    } else {
      const alt = Math.max(wp[1], ground + 450);
      headingPitch(dx, dz, clamp2(Math.atan2(alt - pos[1], 2000), -0.3, 0.35), aim);
      flight.boost = hd > 5000 && speed < spec.cruise * 1.2;
    }
  }
  if (s.phase !== "engage")
    s.engagedSince = -1;
  if ((s.phase === "engage" || s.phase === "strike") && vehicle.kind !== "blackbird")
    applyJitter(brain, aim, s.phase === "strike" ? 0.4 : 1);
  const runIn = s.phase === "strike" && (s.strikePhase === "approach" || vehicle.kind === "bomber");
  applyAimSafety(aim, pos, vel, world, runIn ? Math.min(clearance, 60) : clearance, lookahead, runIn ? null : bot.team, !heli);
  if (!heli && speed < spec.stall * 1.3) {
    desiredThrottle = 1;
    flight.boost = true;
  }
  return finishPilot(brain, vehicle, aim, heli, desiredThrottle, heliAlt, ground, world, lookTarget);
}
function finishPilot(brain, vehicle, aim, heli, desiredThrottle, heliAlt, ground, world, lookTarget) {
  const o = brain.out;
  const { flight, pilotSeat: seat } = o, fs = vehicle.flight, vel = fs.velocity;
  norm(aim);
  if (heli) {
    const hs = Math.hypot(vel[0], vel[2]);
    const floor = Math.max(groundAhead(fs.position, aim, hs, world, 4) + 45, shipClearanceAlt(fs.position, aim[0], aim[2], Math.max(hs * 5, 300), 30));
    const alt = clamp2(Math.max(heliAlt, floor), ground + 10, world.ceiling - 300);
    const err = alt - fs.position[1];
    flight.throttle = Math.abs(err) < 6 && Math.abs(vel[1]) < 1.5 ? 0 : clamp2(err * 0.03 - vel[1] * 0.2, -1, 1);
  } else {
    flight.throttle = clamp2((desiredThrottle - fs.throttle) * 4, -1, 1);
  }
  if (!Number.isFinite(flight.throttle))
    flight.throttle = 0;
  flight.aim = aim;
  if (brain.state.gunAimSet)
    seat.aim = o.pilotAim;
  else if (lookTarget) {
    const tp = lookTarget.flight.position, p = fs.position;
    seat.aim = norm(set3(o.pilotAim, tp[0] - p[0], tp[1] - p[1], tp[2] - p[2]));
  } else
    seat.aim = copy3(o.pilotAim, aim);
  return o.pilot;
}
function engage(brain, vehicle, target, now, aim, inOwnSafe) {
  const s = brain.state;
  const o = brain.out;
  const { flight, pilotSeat: seat } = o;
  const spec = VEHICLES[vehicle.kind];
  const heli = spec.flight === "heli";
  const fs = vehicle.flight;
  const { position: pos, velocity: vel } = fs;
  const tp = target.flight.position, tv = target.flight.velocity;
  const nose = _nose;
  const d = dist2(pos, tp);
  const tx = tp[0] - pos[0], ty = tp[1] - pos[1], tz = tp[2] - pos[2];
  const closing = -((tv[0] - vel[0]) * tx + (tv[1] - vel[1]) * ty + (tv[2] - vel[2]) * tz) / Math.max(d, 1);
  let throttle = 0.85;
  const pId = spec.seatWeapons[0][0], sId = spec.seatWeapons[0][1];
  const primary = pId ? WEAPONS[pId] : null;
  const steerW = primary && (primary.kind === "gun" || primary.kind === "rockets") ? primary : null;
  const lead = _lead2;
  if (steerW && d < 2500) {
    leadDirection(pos, vel, tp, tv, steerW.speed, steerW.kind === "rockets" ? ROCKET_GRAVITY : 0, lead);
    const f = leadFactor(s.skill);
    norm(set3(lead, tx / d * (1 - f) + lead[0] * f, ty / d * (1 - f) + lead[1] * f, tz / d * (1 - f) + lead[2] * f));
  } else
    norm(set3(lead, tx, ty, tz));
  smoothSteer(brain, lead, now, nose);
  if (vehicle.kind === "blackbird") {
    const hd = Math.sqrt(tx * tx + tz * tz);
    if (now < s.extendUntil || d < 2200) {
      if (now >= s.extendUntil)
        s.extendUntil = now + 6 + botRandom(brain) * 3;
      headingPitch(-tx, -tz, 0.05, aim);
      flight.boost = true;
      throttle = 1;
    } else if (d > 6500) {
      copy3(aim, lead);
      throttle = 1;
      flight.boost = d > 9000;
    } else {
      const c = Math.cos(0.7 * s.breakSign), sn = Math.sin(0.7 * s.breakSign);
      headingPitch((tx * c + tz * sn) / hd, (-tx * sn + tz * c) / hd, clamp2(Math.atan2(ty, hd), -0.25, 0.25), aim);
      throttle = 0.9;
    }
    return throttle;
  }
  if (heli) {
    const hd = Math.sqrt(tx * tx + tz * tz);
    if (hd > 1400) {
      headingPitch(tx, tz, -0.3, aim);
      flight.boost = hd > 3000;
    } else if (hd < 550) {
      headingPitch(-tz * s.breakSign - tx, tx * s.breakSign - tz, -0.3, aim);
    } else {
      copy3(aim, lead);
      setPitch(aim, clamp2(pitchOf(aim), -0.35, 0.3));
    }
    throttle = 0.8;
  } else {
    copy3(aim, lead);
    if (d < 200 && closing > 0)
      headingPitch(-tz * s.breakSign, tx * s.breakSign, 0.4, aim);
    if (d > 3000) {
      throttle = 1;
      flight.boost = true;
    } else if (d > 1200)
      throttle = 1;
    else if (d < 600 && closing > 40) {
      throttle = 0.35;
      flight.brake = closing > 80;
    } else
      throttle = 0.8;
  }
  if (steerW && d <= gunRange(s.skill, steerW)) {
    leadDirection(pos, vel, tp, tv, steerW.speed, steerW.kind === "rockets" ? ROCKET_GRAVITY : 0, o.pilotAim);
    applyJitter(brain, o.pilotAim, GUN_AIM_JITTER_SCALE);
    s.gunAimSet = true;
  }
  if (inOwnSafe)
    return throttle;
  for (let slot = 0;slot < 2; slot++) {
    const id = slot === 0 ? pId : sId;
    if (!id)
      continue;
    const w = WEAPONS[id];
    const rt = vehicle.weapons[0][slot];
    if (!weaponReady(rt, now))
      continue;
    if (w.kind === "gun" || w.kind === "rockets") {
      if (d > gunRange(s.skill, w) || !s.gunAimSet)
        continue;
      leadDirection(pos, vel, tp, tv, w.speed, w.kind === "rockets" ? ROCKET_GRAVITY : 0, _t1);
      const tol = Math.atan2(VEHICLES[target.kind].radius * (1.4 + 0.6 * s.skill), d);
      if (angleBetween(nose, _t1) < GUN_GIMBAL * 0.95 && angleBetween(o.pilotAim, _t1) < tol && burstAllowed(brain, now)) {
        if (slot === 0)
          seat.firePrimary = true;
        else
          seat.fireSecondary = true;
      }
    } else if (w.kind === "missile_lock") {
      if (rt.lock < 1 || !rt.lockTarget || now - crewMissileAt(vehicle) < missileInterval(s.skill))
        continue;
      if (slot === 0)
        seat.firePrimary = true;
      else
        seat.fireSecondary = true;
      s.lastMissileAt = now;
      vehicle.botMissileAt = now;
    }
  }
  return throttle;
}
function bombardier(vehicle, seat, aim, ships, now, crewSeat = 1) {
  const fs = vehicle.flight, pos = fs.position;
  if (bombImpactPoint(pos, fs.velocity, _bomb, worldQuery) < 0)
    return;
  if (aim)
    norm(set3(aim, _bomb[0] - pos[0], _bomb[1] - pos[1], _bomb[2] - pos[2]));
  if (!weaponReady(vehicle.weapons[crewSeat][0], now))
    return;
  const fleet = posedFleet();
  for (let i = 0;i < fleet.length; i++) {
    const sh = fleet[i];
    if (sh.team === vehicle.team || ships?.[sh.id]?.sunk)
      continue;
    const sp = SHIP_SPECS[sh.kind];
    const dx = _bomb[0] - sh.position[0], dz = _bomb[2] - sh.position[2];
    const c = Math.cos(sh.heading), sn = Math.sin(sh.heading);
    const lx = dx * c - dz * sn, lz = dx * sn + dz * c;
    if (Math.abs(lx) <= sp.halfWidth * 0.9 && Math.abs(lz) <= sp.halfLength * 0.9) {
      seat.firePrimary = true;
      return;
    }
  }
}
function steerOwnBomb(bot, seat, aimBuf, projectiles, ships) {
  if (!projectiles)
    return;
  let bomb = null;
  for (let i = 0;i < projectiles.length; i++) {
    const p = projectiles[i];
    if (p.weapon === "bomb" && p.owner === bot.id && (!bomb || p.id > bomb.id))
      bomb = p;
  }
  if (!bomb)
    return;
  const bp = bomb.position;
  if (bombImpactPoint(bp, bomb.velocity, _bomb, worldQuery) < 0)
    return;
  const ship = pickStrikeShip(bot.team, _bomb, ships, false);
  if (!ship || Math.hypot(ship.position[0] - _bomb[0], ship.position[2] - _bomb[2]) > 600)
    return;
  norm(set3(aimBuf, ship.position[0] - bp[0], SHIP_SPECS[ship.kind].deckHeight - bp[1], ship.position[2] - bp[2]));
  seat.aim = aimBuf;
  seat.steerBomb = true;
}
function myScannerMissile(bot, vehicle, missiles) {
  for (let i = 0;i < missiles.length; i++) {
    const m = missiles[i];
    if (m.steered && m.vehicle === vehicle.id && m.owner === bot.id && m.scanTarget)
      return m;
  }
  return null;
}
function gunnerInput(brain, bot, vehicle, vehicles, now, missiles, ships) {
  const s = brain.state;
  const o = brain.out;
  const spec = VEHICLES[vehicle.kind];
  const fs = vehicle.flight;
  const { position: pos, velocity: vel } = fs;
  const nose = noseInto(fs.orientation, _nose);
  const seat = resetSeat(o.gunnerSeat, o.gunnerAim, nose);
  const aim = o.gunnerAim;
  const ids = spec.seatWeapons[1];
  const inOwnSafe = inSafeZone(vehicle.team, pos);
  if (ids[0] && WEAPONS[ids[0]].kind === "bomb") {
    bombardier(vehicle, seat, aim, ships, now);
    return;
  }
  let hasPulse = false;
  let maxRange = 0;
  for (let slot = 0;slot < 2; slot++) {
    const id = ids[slot];
    if (!id)
      continue;
    if (WEAPONS[id].kind === "pulse")
      hasPulse = true;
    maxRange = Math.max(maxRange, effectiveRange(WEAPONS[id]));
  }
  if (hasPulse && vehicle.abilityReadyAt <= now) {
    for (let i = 0;i < vehicles.length; i++) {
      const v = vehicles[i];
      if (v.alive && v.team !== vehicle.team && v.spottedUntil <= now && dist2(pos, v.flight.position) < BOT_PULSE_RANGE) {
        seat.ability = true;
        break;
      }
    }
  }
  let scanning = null;
  if (missiles) {
    const m = myScannerMissile(bot, vehicle, missiles);
    if (m) {
      s.guideTargetId = m.scanTarget ?? null;
      s.guideUntil = now + 0.5;
    } else if (now - s.lastMissileAt > 0.5)
      s.guideUntil = Math.min(s.guideUntil, now);
  }
  if (now < s.guideUntil) {
    scanning = findVehicle2(vehicles, s.guideTargetId);
    if (scanning && !scanning.alive)
      scanning = null;
  }
  if (scanning) {
    const tp = scanning.flight.position;
    applyJitter(brain, norm(set3(aim, tp[0] - pos[0], tp[1] - pos[1], tp[2] - pos[2])));
    return;
  }
  let target = findVehicle2(vehicles, s.targetId);
  if (now >= s.retargetAt || target && !canEngage(target, vehicle.team, now)) {
    target = selectTarget(vehicle, vehicles, now, maxRange, s.targetId);
    s.targetId = target ? target.id : null;
    s.retargetAt = now + 0.6 + (1 - s.skill) * 1.5 + botRandom(brain) * 0.4;
  }
  if (!target || !canEngage(target, vehicle.team, now)) {
    if (!hasAntiShip(vehicle.kind, 1))
      return;
    const ship = pickStrikeShip(vehicle.team, pos, ships, false);
    if (!ship)
      return;
    const sx = ship.position[0] - pos[0], sz = ship.position[2] - pos[2];
    if (Math.hypot(sx, sz) > STRIKE_LAUNCH_RANGE + 300)
      return;
    norm(set3(aim, sx, SHIP_SPECS[ship.kind].deckHeight * 0.6 - pos[1], sz));
    smoothSteer(brain, aim, now, nose);
    for (let slot = 0;slot < 2; slot++) {
      const id = ids[slot];
      const rt = vehicle.weapons[1][slot];
      if (!id || WEAPONS[id].kind !== "missile_lock" || inOwnSafe)
        continue;
      if (weaponReady(rt, now) && rt.lock >= 1 && rt.lockTarget?.startsWith("ship:") && angleTo(nose, pos, ship.position) < 1.1 && now - crewMissileAt(vehicle) > 1.5) {
        if (slot === 0)
          seat.firePrimary = true;
        else
          seat.fireSecondary = true;
        s.lastMissileAt = now;
        vehicle.botMissileAt = now;
      }
    }
    return;
  }
  claimTarget(target, vehicle.id, now);
  const tp = target.flight.position, tv = target.flight.velocity;
  const d = dist2(pos, tp);
  const canFire = !inOwnSafe;
  const noseAngle = angleTo(nose, pos, tp);
  let aimed = false;
  for (let slot = 0;slot < 2; slot++) {
    const id = ids[slot];
    if (!id)
      continue;
    const w = WEAPONS[id];
    const rt = vehicle.weapons[1][slot];
    const range = effectiveRange(w);
    if (w.kind === "gun" && d <= gunRange(s.skill, w) && !aimed) {
      leadDirection(pos, vel, tp, tv, w.speed, 0, aim);
      smoothSteer(brain, aim, now, nose);
      applyJitter(brain, aim);
      aimed = true;
      leadDirection(pos, vel, tp, tv, w.speed, 0, _t1);
      weaponDirection(vehicle, id, aim, _t2);
      const tol = Math.atan2(VEHICLES[target.kind].radius * (0.8 + 0.4 * s.skill), d);
      if (canFire && weaponReady(rt, now) && angleBetween(_t2, _t1) < tol && burstAllowed(brain, now)) {
        if (slot === 0)
          seat.firePrimary = true;
        else
          seat.fireSecondary = true;
      }
    } else if ((w.kind === "missile_lock" || w.kind === "missile_scanner") && d <= range && d > 300) {
      if (!aimed) {
        norm(set3(aim, tp[0] - pos[0], tp[1] - pos[1], tp[2] - pos[2]));
        smoothSteer(brain, aim, now, nose);
        applyJitter(brain, aim);
        aimed = true;
      }
      if (canFire && weaponReady(rt, now) && rt.lock >= 1 && rt.lockTarget === target.id && noseAngle < (w.kind === "missile_scanner" ? 0.9 : 1.1) && now - crewMissileAt(vehicle) > missileInterval(s.skill)) {
        if (slot === 0)
          seat.firePrimary = true;
        else
          seat.fireSecondary = true;
        s.lastMissileAt = now;
        vehicle.botMissileAt = now;
        if (w.kind === "missile_scanner") {
          s.guideTargetId = target.id;
          s.guideUntil = now + Math.min(w.ttl, d / w.speed * 2 + 2);
        }
      }
    }
  }
  if (!aimed) {
    norm(set3(aim, tp[0] - pos[0], tp[1] - pos[1], tp[2] - pos[2]));
    smoothSteer(brain, aim, now, nose);
    applyJitter(brain, aim);
  }
  if (!hasPulse && vehicle.abilityReadyAt <= now && target.spottedUntil <= now && d < 4000 && angleTo(aim, pos, tp) < 0.06)
    seat.ability = true;
}

// src/sim/room-engine.ts
var MAX_CATCH_UP = 0.25;
var TICKS_PER_SNAPSHOT = Math.round(TICK_RATE / SNAPSHOT_RATE);
var WRECK_LINGER = 3;
var ABANDONED_DESTROY_DELAY = 20;
var PARKED_REMOVE_DELAY = 60;
var CRASH_CREDIT_WINDOW = 8;
var MATCH_RESTART_DELAY = 15;
var INPUT_QUEUE_MAX = 8;
var JITTER_TARGET_INITIAL = 2;
var JITTER_TARGET_MIN = 1;
var JITTER_TARGET_MAX = 4;
var JITTER_CATCHUP_MARGIN = 2;
var JITTER_WINDOW = 180;
var JITTER_MAX_SYNTH = 4;
var JITTER_STREAM_MIN = 10;
var PLAYERS_RESEND = 1;
var STALE_INPUT = 1;
var CHAT_MAX = 200;
var CHAT_BURST = 4;
var CHAT_REFILL = 1.5;
var NAME_MAX = 16;
var STEALTH_VISUAL_RANGE = 800;
var MAX_VIEW_DELAY = 0.3;
var SPAWN_SLOTS = 16;
function newJitterBuffer() {
  return {
    target: JITTER_TARGET_INITIAL,
    offset: 0,
    primed: false,
    streak: 0,
    starveRun: 0,
    windowTicks: 0,
    windowMinSlack: Infinity,
    windowUnderruns: 0,
    synthesized: 0,
    caughtUp: 0,
    dropped: 0,
    late: 0
  };
}
var BOT_GUNNER_DELAY = 5;
var BOT_SKILL_DEFAULT = 0.5;
var BOT_SYNC_INTERVAL = 1;
var BOT_NAMES = [
  "Viper",
  "Maverick",
  "Iceman",
  "Goose",
  "Phoenix",
  "Hangman",
  "Rooster",
  "Payback",
  "Fanboy",
  "Jester",
  "Cougar",
  "Merlin",
  "Slider",
  "Hollywood",
  "Wolfman",
  "Sundown",
  "Chipper",
  "Stinger",
  "Ghost",
  "Raven",
  "Talon",
  "Havoc",
  "Nomad",
  "Reaper",
  "Saber",
  "Banshee",
  "Comet",
  "Falcon",
  "Outlaw",
  "Spectre"
];
var worldQuery2 = worldQuery.deckVelocity ? worldQuery : { ...worldQuery, deckVelocity };
var NEUTRAL_SEAT = { aim: null, firePrimary: false, fireSecondary: false, flares: false, ability: false };
function sanitizeConfig(input, base = DEFAULT_ROOM_CONFIG) {
  const c = input && typeof input === "object" ? input : {};
  const int = (v, min, max, fallback) => typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;
  const name = typeof c.name === "string" ? cleanText(c.name, 32) : "";
  return {
    teams: int(c.teams, 2, 4, base.teams),
    bots: int(c.bots, 0, 10, base.bots),
    maxPerTeam: int(c.maxPerTeam, 1, 16, base.maxPerTeam),
    scoreLimit: int(c.scoreLimit, 1, 1000, base.scoreLimit),
    timeLimit: int(c.timeLimit, 60, 7200, base.timeLimit),
    listed: typeof c.listed === "boolean" ? c.listed : base.listed,
    name: name || base.name,
    ...extras(c, base)
  };
}
function extras(c, base) {
  const out = {};
  const skill = typeof c.botSkill === "number" && Number.isFinite(c.botSkill) ? c.botSkill : base.botSkill;
  if (skill !== undefined)
    out.botSkill = Math.min(1, Math.max(0, skill));
  const fill = typeof c.botFill === "number" && Number.isFinite(c.botFill) ? c.botFill : base.botFill;
  if (fill !== undefined)
    out.botFill = Math.min(16, Math.max(0, Math.round(fill)));
  return out;
}
function hashString(s) {
  let h = 2166136261;
  for (let i = 0;i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function cleanText(text, max) {
  return text.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function isTeam(v, teams) {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v < teams;
}
function isSeat(v) {
  return v === 0 || v === 1;
}
var clampAxis = (v) => typeof v === "number" && Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : null;
function readAim(v) {
  if (v === null || v === undefined)
    return null;
  if (!Array.isArray(v) || v.length !== 3)
    return;
  const [x, y, z] = v;
  if (typeof x !== "number" || typeof y !== "number" || typeof z !== "number")
    return;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z))
    return;
  const len = Math.hypot(x, y, z);
  if (len < 0.000001)
    return;
  return [x / len, y / len, z / len];
}
function readFlight(v) {
  if (!v || typeof v !== "object")
    return;
  const m = v;
  const aim = readAim(m.aim);
  const throttle = clampAxis(m.throttle ?? 0), roll = clampAxis(m.roll ?? 0), yaw = clampAxis(m.yaw ?? 0), pitch = clampAxis(m.pitch ?? 0);
  if (aim === undefined || throttle === null || roll === null || yaw === null || pitch === null)
    return;
  return { aim, throttle, roll, yaw, pitch, boost: m.boost === true, brake: m.brake === true };
}
function readSeat(v) {
  if (!v || typeof v !== "object")
    return;
  const m = v;
  const aim = readAim(m.aim);
  if (aim === undefined)
    return;
  const out = { aim, firePrimary: m.firePrimary === true, fireSecondary: m.fireSecondary === true, flares: m.flares === true, ability: m.ability === true };
  if (typeof m.viewDelay === "number" && Number.isFinite(m.viewDelay))
    out.viewDelay = Math.min(MAX_VIEW_DELAY, Math.max(0, m.viewDelay));
  if (m.steerBomb === true)
    out.steerBomb = true;
  return out;
}
function createRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

class RoomEngine {
  code;
  config;
  hooks;
  time = 0;
  tick = 0;
  vehicles = [];
  players = new Map;
  scores;
  combat = createCombatState();
  matchStartedAt = 0;
  matchEndedAt = null;
  winner = null;
  accumulator = 0;
  nextId = 1;
  meta = new Map;
  events = [];
  lastPlayersJson = "";
  lastPlayersAt = -Infinity;
  decoders = new Map;
  teamKills;
  cratersSent = 0;
  lastShipsJson = "";
  lastShipsAt = -Infinity;
  rng;
  botNames = 0;
  lastBotSync = -Infinity;
  constructor(code, config, hooks) {
    this.code = code;
    this.config = config;
    this.hooks = hooks;
    this.config = sanitizeConfig(config);
    this.scores = new Array(this.config.teams).fill(0);
    this.teamKills = new Array(this.config.teams).fill(0);
    this.rng = createRng(hashString(code));
    this.syncBots();
  }
  addPlayer(name, beforeWelcome) {
    const id = `p${this.nextId++}`;
    const team = this.balancedTeam(null);
    this.players.set(id, this.newPlayer(id, cleanText(String(name ?? ""), NAME_MAX) || "Pilot", team, false));
    beforeWelcome?.(id);
    this.hooks.send(id, { type: "welcome", playerId: id, room: this.code, config: { ...this.config } });
    this.syncBots();
    this.hooks.onChange?.();
    return id;
  }
  removePlayer(playerId) {
    const p = this.players.get(playerId);
    if (!p)
      return;
    this.leaveTurret(p.info);
    this.vacate(p.info);
    this.players.delete(playerId);
    this.decoders.delete(playerId);
    if (!p.info.bot) {
      this.syncBots();
      this.hooks.onChange?.();
    }
  }
  newPlayer(id, name, team, bot) {
    return {
      info: { id, name, team, vehicleId: null, seat: null, kills: 0, deaths: 0, bot, respawnAt: 0, turret: null },
      flight: NEUTRAL_INPUT,
      seat: NEUTRAL_SEAT,
      queue: [],
      jitter: newJitterBuffer(),
      seq: -1,
      ack: -1,
      lastInputAt: -Infinity,
      chatTokens: CHAT_BURST,
      chatAt: this.time,
      needsPlayers: !bot,
      brain: null,
      leaving: false
    };
  }
  humanCount() {
    let n = 0;
    for (const p of this.players.values())
      if (!p.info.bot)
        n++;
    return n;
  }
  playerCount() {
    return this.players.size;
  }
  botCount() {
    return this.players.size - this.humanCount();
  }
  summary() {
    return {
      code: this.code,
      name: this.config.name,
      teams: this.config.teams,
      players: this.playerCount(),
      humans: this.humanCount(),
      maxPlayers: this.config.teams * this.config.maxPerTeam
    };
  }
  isFull() {
    return this.humanCount() >= this.config.teams * this.config.maxPerTeam;
  }
  teamCounts(exclude) {
    const counts = new Array(this.config.teams).fill(0);
    for (const p of this.players.values())
      if (!p.info.bot && p.info.id !== exclude)
        counts[p.info.team]++;
    return counts;
  }
  balancedTeam(exclude) {
    const counts = this.teamCounts(exclude);
    let best = 0;
    for (let t = 1;t < counts.length; t++)
      if (counts[t] < counts[best])
        best = t;
    return best;
  }
  wantedBots(team, humans) {
    const room = Math.max(0, this.config.maxPerTeam - humans[team]);
    const fill = this.config.botFill;
    if (fill !== undefined && fill > 0) {
      const total = humans.reduce((a, b) => a + b, 0);
      return total >= fill ? 0 : Math.min(room, Math.max(0, fill - humans[team]));
    }
    return Math.min(room, this.config.bots);
  }
  addBot(team) {
    const id = `b${this.nextId++}`;
    const p = this.newPlayer(id, `${BOT_NAMES[this.botNames++ % BOT_NAMES.length]} [AI]`, team, true);
    p.brain = createBotBrain(Math.floor(this.rng() * 4294967296), this.config.botSkill ?? BOT_SKILL_DEFAULT);
    p.info.respawnAt = this.time + 0.5 + this.rng() * 2;
    this.players.set(id, p);
    return id;
  }
  syncBots() {
    this.lastBotSync = this.time;
    const humans = this.teamCounts(null);
    for (let t = 0;t < this.config.teams; t++) {
      const want = this.wantedBots(t, humans);
      const bots = [...this.players.values()].filter((p) => p.info.bot && p.info.team === t);
      const staying = bots.filter((b) => !b.leaving);
      if (staying.length < want) {
        let need = want - staying.length;
        for (const b of bots)
          if (b.leaving && need > 0) {
            b.leaving = false;
            need--;
          }
        for (let i = 0;i < need; i++)
          this.addBot(t);
      } else if (staying.length > want) {
        const rank = (b) => b.info.vehicleId === null ? 0 : b.info.seat === 1 ? 1 : 2;
        staying.sort((a, b) => rank(a) - rank(b));
        for (let i = 0;i < staying.length - want; i++)
          staying[i].leaving = true;
      }
    }
    this.retireBots();
  }
  retireBots() {
    for (const p of [...this.players.values()]) {
      if (!p.info.bot || !p.leaving)
        continue;
      const v = this.vehicleOf(p.info);
      if (!v || !v.alive) {
        this.removePlayer(p.info.id);
        continue;
      }
      if (!this.canLeave(v))
        continue;
      const otherId = v.seats[p.info.seat === 0 ? 1 : 0];
      this.removePlayer(p.info.id);
      if (!otherId)
        this.removeVehicleQuietly(v);
    }
  }
  removeVehicleQuietly(v) {
    const meta = this.meta.get(v.id);
    v.alive = false;
    if (meta)
      meta.diedAt = -Infinity;
  }
  evictBot(bot) {
    this.vacate(bot.info);
    bot.info.respawnAt = Math.max(bot.info.respawnAt, this.time + 1);
  }
  updateBots() {
    if (this.time - this.lastBotSync >= BOT_SYNC_INTERVAL)
      this.syncBots();
    else
      this.retireBots();
    if (this.matchEndedAt !== null)
      return;
    const now = this.time;
    for (const p of this.players.values()) {
      const bot = p.info;
      if (!bot.bot || p.leaving || bot.vehicleId || now < bot.respawnAt)
        continue;
      const ride = this.vehicles.find((v) => {
        if (!v.alive || v.team !== bot.team || v.seats[1] || !v.seats[0])
          return false;
        const pilot = this.players.get(v.seats[0]);
        return !!pilot && !pilot.info.bot && now - this.meta.get(v.id).gunnerEmptySince >= BOT_GUNNER_DELAY;
      });
      if (ride) {
        this.seatPlayer(bot, ride, 1);
        continue;
      }
      const teammates = [];
      for (const x of this.players.values())
        if (x.info.team === bot.team && x.info.id !== bot.id)
          teammates.push(x.info);
      let kind = chooseBotVehicle(bot, teammates, this.vehicles, this.rng);
      if (!VEHICLES[kind])
        kind = VEHICLE_KINDS[Math.floor(this.rng() * VEHICLE_KINDS.length)];
      this.spawnVehicle(bot, kind);
    }
  }
  canJoinTeam(playerId, team) {
    const counts = this.teamCounts(playerId);
    return counts[team] < this.config.maxPerTeam && counts[team] <= Math.min(...counts);
  }
  handle(playerId, message) {
    const p = this.players.get(playerId);
    if (!p || p.info.bot || !message || typeof message !== "object")
      return;
    const m = message;
    switch (m.type) {
      case "ping":
        if (typeof m.t === "number" && Number.isFinite(m.t))
          this.hooks.send(playerId, { type: "pong", t: m.t });
        return;
      case "input":
        return this.onInput(p, m);
      case "hello": {
        if (typeof m.name === "string")
          p.info.name = cleanText(m.name, NAME_MAX) || p.info.name;
        if (isTeam(m.team, this.config.teams) && m.team !== p.info.team && this.canJoinTeam(playerId, m.team))
          this.setTeam(p, m.team);
        this.hooks.onChange?.();
        return;
      }
      case "team":
        if (!isTeam(m.team, this.config.teams) || m.team === p.info.team)
          return;
        if (!this.canJoinTeam(playerId, m.team))
          return this.error(playerId, "That team is full.");
        this.setTeam(p, m.team);
        this.hooks.onChange?.();
        return;
      case "spawn":
        return this.onSpawn(p, m.kind);
      case "man-turret":
        return this.onManTurret(p, m.ship, m.turret);
      case "board":
        return this.onBoard(p, m.vehicle, m.seat);
      case "switch-seat":
        return this.onSwitchSeat(p, m.seat);
      case "leave-vehicle": {
        if (p.info.turret) {
          this.leaveTurret(p.info);
          return;
        }
        const v = this.vehicleOf(p.info);
        if (v && v.alive && !this.canLeave(v))
          return this.error(playerId, "You can only bail out at base.");
        this.vacate(p.info);
        return;
      }
      case "chat":
        return this.onChat(p, m.text);
    }
  }
  error(playerId, message) {
    this.hooks.send(playerId, { type: "error", message });
  }
  onInput(p, m) {
    const seq = m.seq;
    if (typeof seq !== "number" || !Number.isSafeInteger(seq) || seq < 0 || seq <= p.seq)
      return;
    if (seq <= p.ack) {
      p.jitter.streak = seq === p.seq + 1 ? p.jitter.streak + 1 : 0;
      p.seq = seq;
      p.jitter.late++;
      return;
    }
    const input = { seq, at: this.tick };
    if (m.flight !== undefined) {
      input.flight = readFlight(m.flight);
      if (!input.flight)
        return;
    }
    if (m.seat !== undefined) {
      input.seat = readSeat(m.seat);
      if (!input.seat)
        return;
    }
    p.jitter.streak = seq === p.seq + 1 ? p.jitter.streak + 1 : 0;
    p.seq = seq;
    p.lastInputAt = this.time;
    p.queue.push(input);
    while (p.queue.length > INPUT_QUEUE_MAX) {
      this.consume(p, p.queue.shift());
      p.jitter.dropped++;
    }
  }
  consumeTick(p) {
    const jb = p.jitter;
    const q = p.queue;
    while (q.length && q[0].seq <= p.ack) {
      q.shift();
      jb.late++;
    }
    if (!jb.primed) {
      if (!q.length)
        return;
      jb.offset = q[0].at - q[0].seq + jb.target;
      jb.primed = true;
      jb.starveRun = 0;
    }
    if (++jb.windowTicks >= JITTER_WINDOW) {
      if (jb.windowUnderruns === 0 && jb.windowMinSlack >= 1 && jb.windowMinSlack !== Infinity) {
        if (jb.target > JITTER_TARGET_MIN)
          jb.target--;
        jb.offset--;
      }
      jb.windowTicks = 0;
      jb.windowMinSlack = Infinity;
      jb.windowUnderruns = 0;
    }
    if (q.length > jb.target + JITTER_CATCHUP_MARGIN) {
      jb.offset--;
      jb.caughtUp++;
    }
    const due = this.tick - jb.offset;
    let consumed = 0;
    while (consumed < 2 && q.length && q[0].seq <= due) {
      const next = q.shift();
      const after = q[0];
      if (consumed === 0 && after && after.seq <= due && next.seat && after.seat) {
        after.seat = { ...after.seat, flares: after.seat.flares || next.seat.flares, ability: after.seat.ability || next.seat.ability };
      }
      this.consume(p, next);
      consumed++;
    }
    if (consumed) {
      jb.starveRun = 0;
      if (q.length < jb.windowMinSlack)
        jb.windowMinSlack = q.length;
      return;
    }
    if (p.ack >= due)
      return;
    if (jb.starveRun === 0)
      jb.windowUnderruns++;
    if (jb.starveRun < JITTER_MAX_SYNTH && p.ack >= 0 && jb.streak >= JITTER_STREAM_MIN && this.time - p.lastInputAt <= STALE_INPUT) {
      jb.starveRun++;
      jb.synthesized++;
      p.ack++;
      jb.windowMinSlack = 0;
      if ((jb.starveRun >= 2 || jb.windowUnderruns >= 2) && jb.target < JITTER_TARGET_MAX) {
        jb.target++;
        jb.offset++;
        jb.windowUnderruns = 0;
      }
    } else {
      jb.starveRun = 0;
      jb.primed = false;
    }
  }
  consume(p, input) {
    if (input.flight)
      p.flight = input.flight;
    if (input.seat)
      p.seat = input.seat;
    p.ack = input.seq;
  }
  onChat(p, text) {
    if (typeof text !== "string")
      return;
    const clean = cleanText(text, CHAT_MAX);
    if (!clean)
      return;
    p.chatTokens = Math.min(CHAT_BURST, p.chatTokens + (this.time - p.chatAt) / CHAT_REFILL);
    p.chatAt = this.time;
    if (p.chatTokens < 1)
      return this.error(p.info.id, "You're sending messages too fast.");
    p.chatTokens -= 1;
    this.events.push({ type: "chat", player: p.info.id, text: clean });
  }
  setTeam(p, team) {
    this.vacate(p.info);
    this.leaveTurret(p.info);
    p.info.team = team;
    this.syncBots();
  }
  onSpawn(p, kind) {
    if (typeof kind !== "string" || !VEHICLE_KINDS.includes(kind))
      return;
    if (this.matchEndedAt !== null)
      return this.error(p.info.id, "Match over — next round starting soon.");
    if (this.time < p.info.respawnAt)
      return this.error(p.info.id, "Respawn not ready.");
    const current = this.vehicleOf(p.info);
    if (current && current.alive && !this.canLeave(current))
      return this.error(p.info.id, "Return to base to change aircraft.");
    if (!this.spawnCarrier(p.info.team))
      return this.error(p.info.id, "Your carriers have been sunk.");
    this.vacate(p.info);
    this.leaveTurret(p.info);
    this.spawnVehicle(p.info, kind);
  }
  onManTurret(p, shipId, turretId) {
    if (typeof shipId !== "string" || typeof turretId !== "string")
      return;
    const ship = FLEET.find((s) => s.id === shipId);
    const mount = ship ? SHIP_SPECS[ship.kind].turrets.find((t) => t.id === turretId) : undefined;
    if (!ship || !mount || ship.team !== p.info.team || ship.team >= this.config.teams || !mount.mannable)
      return this.error(p.info.id, "Can't man that turret.");
    if (this.matchEndedAt !== null)
      return this.error(p.info.id, "Match over — next round starting soon.");
    if (this.time < p.info.respawnAt)
      return this.error(p.info.id, "Respawn not ready.");
    if (!turretOperational(this.combat, shipId, turretId))
      return this.error(p.info.id, "That turret is knocked out.");
    const tr = shipRuntime(this.combat, shipId).turrets[turretId];
    if (tr.manned && tr.manned !== p.info.id)
      return this.error(p.info.id, "That turret is already manned.");
    const current = this.vehicleOf(p.info);
    if (current && current.alive && !this.canLeave(current))
      return this.error(p.info.id, "Return to base first.");
    this.vacate(p.info);
    this.leaveTurret(p.info);
    tr.manned = p.info.id;
    p.info.turret = { ship: shipId, turret: turretId };
    p.seat = NEUTRAL_SEAT;
  }
  leaveTurret(player) {
    const t = player.turret;
    if (!t)
      return;
    const tr = shipRuntime(this.combat, t.ship)?.turrets[t.turret];
    if (tr && tr.manned === player.id)
      tr.manned = null;
    player.turret = null;
  }
  spawnCarrier(team) {
    for (const sh of FLEET) {
      if (sh.team !== team || sh.kind !== "carrier")
        continue;
      const rt = shipRuntime(this.combat, sh.id);
      if (rt && !rt.sunk)
        return sh.id;
    }
    return null;
  }
  spawnAt(team, kind, index) {
    const sp = spawnPoint(team, kind, index);
    const id = this.spawnCarrier(team);
    const primary = carrierOf(team);
    if (!id || id === primary.id)
      return sp;
    const other = posedShip(id);
    if (!other)
      return sp;
    const local = worldToShip(primary, sp.position);
    return { ...sp, position: shipToWorld(other, local), yaw: sp.yaw + other.heading - primary.heading };
  }
  spawnVehicle(player, kind) {
    this.syncFleet();
    const team = player.team;
    let index = 0;
    for (let i = 0;i < SPAWN_SLOTS; i++) {
      const sp = this.spawnAt(team, kind, i).position;
      const blocked = this.vehicles.some((v) => v.alive && Math.hypot(v.flight.position[0] - sp[0], v.flight.position[1] - sp[1], v.flight.position[2] - sp[2]) < 25);
      if (!blocked) {
        index = i;
        break;
      }
      index = i + 1;
    }
    const spec = VEHICLES[kind];
    const v = {
      id: `v${this.nextId++}`,
      kind,
      team,
      flight: createFlightState(kind, this.spawnAt(team, kind, index % SPAWN_SLOTS)),
      hp: spec.maxHp,
      maxHp: spec.maxHp,
      seats: [player.id, null],
      aim: [null, null],
      weapons: createWeapons(kind),
      flaresReadyAt: 0,
      flareCount: spec.flares,
      abilityReadyAt: 0,
      spottedUntil: 0,
      lastDamagedBy: null,
      alive: true
    };
    this.vehicles.push(v);
    this.meta.set(v.id, { emptySince: null, lastHp: v.hp, lastHitAt: -Infinity, diedAt: null, gunnerEmptySince: this.time });
    markSpawned(v, this.time);
    player.vehicleId = v.id;
    player.seat = 0;
    const ps = this.players.get(player.id);
    if (ps) {
      ps.flight = NEUTRAL_INPUT;
      ps.seat = NEUTRAL_SEAT;
    }
    return v;
  }
  onBoard(p, vehicleId, seat) {
    if (typeof vehicleId !== "string" || !isSeat(seat))
      return;
    const v = this.vehicles.find((x) => x.id === vehicleId);
    if (!v || !v.alive || v.team !== p.info.team)
      return this.error(p.info.id, "Can't board that aircraft.");
    if (this.time < p.info.respawnAt)
      return this.error(p.info.id, "Respawn not ready.");
    if (p.info.vehicleId === v.id)
      return this.onSwitchSeat(p, seat);
    const current = this.vehicleOf(p.info);
    if (current && current.alive && !this.canLeave(current))
      return;
    const occupant = v.seats[seat] ? this.players.get(v.seats[seat]) : undefined;
    if (v.seats[seat] && !occupant?.info.bot)
      return this.error(p.info.id, "Seat taken.");
    this.vacate(p.info);
    if (occupant) {
      this.evictBot(occupant);
      const other = 1 - seat;
      if (seat === 0 && !v.seats[other] && !occupant.leaving)
        this.seatPlayer(occupant.info, v, other);
    }
    this.seatPlayer(p.info, v, seat);
  }
  onSwitchSeat(p, seat) {
    if (!isSeat(seat))
      return;
    const v = this.vehicleOf(p.info);
    if (!v || !v.alive || p.info.seat === seat)
      return;
    const occupant = v.seats[seat] ? this.players.get(v.seats[seat]) : undefined;
    if (v.seats[seat] && !occupant?.info.bot)
      return this.error(p.info.id, "Seat taken.");
    const from = p.info.seat;
    v.seats[from] = null;
    v.aim[from] = null;
    if (from === 1)
      this.meta.get(v.id).gunnerEmptySince = this.time;
    if (occupant) {
      this.evictBot(occupant);
      if (from === 1)
        this.seatPlayer(occupant.info, v, 1);
    }
    this.seatPlayer(p.info, v, seat);
  }
  seatPlayer(player, v, seat) {
    v.seats[seat] = player.id;
    player.vehicleId = v.id;
    player.seat = seat;
    if (seat === 1) {
      const meta = this.meta.get(v.id);
      if (meta)
        meta.gunnerEmptySince = Infinity;
    }
    const ps = this.players.get(player.id);
    if (ps) {
      ps.flight = NEUTRAL_INPUT;
      ps.seat = NEUTRAL_SEAT;
    }
  }
  vacate(player) {
    const v = this.vehicleOf(player);
    if (v && player.seat !== null && v.seats[player.seat] === player.id) {
      v.seats[player.seat] = null;
      v.aim[player.seat] = null;
      if (player.seat === 1) {
        const meta = this.meta.get(v.id);
        if (meta)
          meta.gunnerEmptySince = this.time;
      }
    }
    player.vehicleId = null;
    player.seat = null;
    const ps = this.players.get(player.id);
    if (ps) {
      ps.flight = NEUTRAL_INPUT;
      ps.seat = NEUTRAL_SEAT;
    }
  }
  vehicleOf(player) {
    return player.vehicleId ? this.vehicles.find((v) => v.id === player.vehicleId) : undefined;
  }
  canLeave(v) {
    return this.onOwnDeck(v) || this.time - (v.spawnedAt ?? -Infinity) < SPAWN_PROTECTION;
  }
  onOwnDeck(v) {
    if (!v.flight.onGround)
      return false;
    const spec = SHIP_SPECS.carrier;
    this.syncFleet();
    for (const sh of FLEET) {
      if (sh.team !== v.team || sh.kind !== "carrier")
        continue;
      const rt = shipRuntime(this.combat, sh.id);
      const posed = posedShip(sh.id);
      if (!posed || rt && rt.sunk)
        continue;
      const l = worldToShip(posed, v.flight.position);
      if (Math.abs(l[0]) <= spec.halfWidth + 2 && Math.abs(l[2]) <= spec.halfLength + 2 && l[1] >= spec.deckHeight - 2 && l[1] <= spec.deckHeight + 10)
        return true;
    }
    return false;
  }
  advance(elapsed) {
    if (!Number.isFinite(elapsed) || elapsed <= 0)
      return;
    this.accumulator += Math.min(elapsed, MAX_CATCH_UP);
    while (this.accumulator >= TICK_DT - 0.000000001) {
      this.accumulator -= TICK_DT;
      this.step();
      if (this.events.length)
        this.flushEvents();
      if (this.tick % TICKS_PER_SNAPSHOT === 0)
        this.broadcastSnapshot();
    }
    if (this.accumulator < 0)
      this.accumulator = 0;
  }
  step() {
    this.tick++;
    this.time = this.tick * TICK_DT;
    this.syncFleet();
    const now = this.time;
    const events = this.events;
    const vehicles = this.vehicles;
    for (const p of this.players.values()) {
      if (p.info.bot)
        continue;
      this.consumeTick(p);
    }
    for (const v of vehicles) {
      if (!v.alive)
        continue;
      for (let i = 0;i < 2; i++) {
        const id = v.seats[i];
        const p = id ? this.players.get(id) : undefined;
        if (!p || !p.brain)
          continue;
        const out = botInput(p.brain, p.info, v, vehicles, now, this.combat.missiles, worldQuery2, this.combat.ships, this.combat.projectiles);
        p.seat = { ...out.seat, aim: out.seat.aim && [out.seat.aim[0], out.seat.aim[1], out.seat.aim[2]] };
        if (i === 0)
          p.flight = out.flight ? { ...out.flight, aim: out.flight.aim && [out.flight.aim[0], out.flight.aim[1], out.flight.aim[2]] } : NEUTRAL_INPUT;
        p.lastInputAt = now;
      }
    }
    for (const v of vehicles) {
      if (!v.alive)
        continue;
      const pilot = v.seats[0] ? this.players.get(v.seats[0]) : undefined;
      stepFlight(v.flight, pilot ? pilot.flight : NEUTRAL_INPUT, TICK_DT, worldQuery2);
      for (let i = 0;i < 2; i++) {
        const s = i;
        const id = v.seats[s];
        const p = id ? this.players.get(id) : undefined;
        if (!p)
          continue;
        const input = now - p.lastInputAt > STALE_INPUT ? { ...p.seat, firePrimary: false, fireSecondary: false, flares: false, ability: false } : p.seat;
        v.aim[s] = input.aim;
        applySeatInput(this.combat, v, s, input, vehicles, now, events);
      }
    }
    for (const p of this.players.values()) {
      const t = p.info.turret;
      if (!t)
        continue;
      const input = now - p.lastInputAt > STALE_INPUT ? { ...p.seat, firePrimary: false } : p.seat;
      applyTurretInput(this.combat, t.ship, t.turret, p.info.id, input, now, events);
    }
    const eventStart = events.length;
    stepCombat(this.combat, vehicles, TICK_DT, now, events);
    for (const p of this.players.values()) {
      const t = p.info.turret;
      if (!t || turretOperational(this.combat, t.ship, t.turret))
        continue;
      this.leaveTurret(p.info);
      p.info.deaths++;
      p.info.respawnAt = now + RESPAWN_DELAY;
      p.seat = NEUTRAL_SEAT;
    }
    for (const v of vehicles) {
      const meta = this.meta.get(v.id);
      if (v.hp < meta.lastHp)
        meta.lastHitAt = now;
      meta.lastHp = v.hp;
      if (v.alive && v.flight.crashed)
        killVehicle(v, "crash", this.crashCredit(v, meta), events);
    }
    for (const v of vehicles) {
      const meta = this.meta.get(v.id);
      if (v.alive || meta.diedAt !== null)
        continue;
      meta.diedAt = now;
      let killEvent;
      for (let i = eventStart;i < events.length; i++) {
        const e = events[i];
        if (e.type === "kill" && e.victim === v.id) {
          killEvent = e;
          break;
        }
      }
      const killer = killEvent ? killEvent.killer : this.crashCredit(v, meta);
      if (!killEvent) {
        v.alive = true;
        killVehicle(v, "crash", killer, events);
      }
      this.onVehicleDestroyed(v, killer, killEvent?.killerTeam);
    }
    this.cleanupVehicles();
    this.updateBots();
    if (this.matchEndedAt === null)
      this.updateScores();
    this.updateMatch();
  }
  crashCredit(v, meta) {
    return v.lastDamagedBy && this.time - meta.lastHitAt <= CRASH_CREDIT_WINDOW ? v.lastDamagedBy : null;
  }
  onVehicleDestroyed(v, killer, aaTeam) {
    for (let s = 0;s < 2; s++) {
      const id = v.seats[s];
      const p = id ? this.players.get(id) : undefined;
      if (p) {
        p.info.deaths++;
        p.info.vehicleId = null;
        p.info.seat = null;
        p.info.respawnAt = this.time + RESPAWN_DELAY;
        p.flight = NEUTRAL_INPUT;
        p.seat = NEUTRAL_SEAT;
      }
      v.seats[s] = null;
    }
    const kp = killer ? this.players.get(killer) : undefined;
    const killerTeam = kp ? kp.info.team : killer ? this.vehicles.find((x) => x.id === killer)?.team : aaTeam;
    if (killerTeam === undefined || killerTeam === v.team)
      return;
    if (kp)
      kp.info.kills++;
    if (this.matchEndedAt !== null)
      return;
    this.teamKills[killerTeam]++;
  }
  enemyFleetHp(team) {
    let hp = 0;
    for (const sh of FLEET)
      if (sh.team !== team && sh.team < this.config.teams)
        hp += SHIP_SPECS[sh.kind].maxHp;
    return hp;
  }
  updateScores() {
    const dealt = this.combat.shipDamageBy ?? [];
    let changed = false;
    for (let t = 0;t < this.config.teams; t++) {
      const pct = Math.round(1000 * (dealt[t] ?? 0) / Math.max(1, this.enemyFleetHp(t))) / 10;
      if (pct !== this.scores[t]) {
        this.scores[t] = pct;
        changed = true;
      }
    }
    if (changed)
      this.events.push({ type: "score", scores: [...this.scores] });
  }
  cleanupVehicles() {
    const now = this.time;
    let removed = false;
    for (const v of this.vehicles) {
      const meta = this.meta.get(v.id);
      if (!v.alive) {
        if (meta.diedAt !== null && now - meta.diedAt >= WRECK_LINGER)
          removed = true;
        continue;
      }
      if (!v.seats[0] && v.seats[1]) {
        const gunner = this.players.get(v.seats[1]);
        if (gunner?.info.bot)
          this.evictBot(gunner);
      }
      if (v.seats[0] || v.seats[1]) {
        meta.emptySince = null;
        continue;
      }
      if (meta.emptySince === null)
        meta.emptySince = now;
      const idle = now - meta.emptySince;
      if (this.onOwnDeck(v)) {
        if (idle >= PARKED_REMOVE_DELAY) {
          v.alive = false;
          meta.diedAt = -Infinity;
          removed = true;
        }
      } else if (idle >= ABANDONED_DESTROY_DELAY) {
        const killer = this.crashCredit(v, meta);
        killVehicle(v, "crash", killer, this.events);
        meta.diedAt = now;
        this.onVehicleDestroyed(v, killer);
      }
    }
    if (!removed)
      return;
    for (let i = this.vehicles.length - 1;i >= 0; i--) {
      const v = this.vehicles[i];
      const meta = this.meta.get(v.id);
      if (!v.alive && meta.diedAt !== null && now - meta.diedAt >= WRECK_LINGER) {
        for (const id of v.seats)
          if (id) {
            const p = this.players.get(id);
            if (p)
              this.vacate(p.info);
          }
        this.vehicles.splice(i, 1);
        this.meta.delete(v.id);
      }
    }
  }
  updateMatch() {
    const now = this.time;
    if (this.matchEndedAt !== null) {
      if (now - this.matchEndedAt >= MATCH_RESTART_DELAY)
        this.resetMatch();
      return;
    }
    const alive = [];
    for (let t = 0;t < this.config.teams; t++)
      if (this.spawnCarrier(t))
        alive.push(t);
    if (alive.length <= 1)
      return this.endMatch(alive.length === 1 ? alive[0] : null, "carriers-sunk");
    if (now - this.matchStartedAt >= this.config.timeLimit) {
      const dealt = this.combat.shipDamageBy ?? [];
      let best = null;
      let tie = false;
      for (const t of alive) {
        if (best === null) {
          best = t;
          continue;
        }
        const a = dealt[t] ?? 0, b = dealt[best] ?? 0;
        if (a > b + 0.000001 || Math.abs(a - b) <= 0.000001 && this.teamKills[t] > this.teamKills[best]) {
          best = t;
          tie = false;
        } else if (Math.abs(a - b) <= 0.000001 && this.teamKills[t] === this.teamKills[best])
          tie = true;
      }
      this.endMatch(tie ? null : best, "time");
    }
  }
  endMatch(winner, reason) {
    this.matchEndedAt = this.time;
    this.winner = winner;
    this.events.push({ type: "match-end", winner, reason });
    this.hooks.onChange?.();
  }
  resetMatch() {
    for (const p of this.players.values()) {
      p.info.vehicleId = null;
      p.info.seat = null;
      p.info.kills = 0;
      p.info.deaths = 0;
      p.info.respawnAt = p.info.bot ? this.time + 0.5 + this.rng() * 2 : 0;
      p.info.turret = null;
      p.flight = NEUTRAL_INPUT;
      p.seat = NEUTRAL_SEAT;
    }
    this.vehicles.length = 0;
    this.meta.clear();
    this.combat = createCombatState();
    this.scores = new Array(this.config.teams).fill(0);
    this.teamKills = new Array(this.config.teams).fill(0);
    this.cratersSent = 0;
    this.lastShipsJson = "";
    this.matchStartedAt = this.time;
    this.matchEndedAt = null;
    this.winner = null;
    this.events.push({ type: "score", scores: [...this.scores] });
    this.hooks.onChange?.();
  }
  matchTime() {
    return this.matchEndedAt !== null ? 0 : Math.max(0, this.time - this.matchStartedAt);
  }
  syncFleet() {
    setFleetState(this.matchTime(), this.config.teams);
    setShipStates(this.shipStates(), this.time);
  }
  matchEndsAt() {
    return this.matchEndedAt !== null ? this.matchEndedAt + MATCH_RESTART_DELAY : this.matchStartedAt + this.config.timeLimit;
  }
  flushEvents() {
    const batch = this.events;
    this.events = [];
    const message = { type: "events", events: batch };
    if (this.hooks.sendText) {
      const text = JSON.stringify(message);
      for (const p of this.players.values())
        if (!p.info.bot)
          this.hooks.sendText(p.info.id, text);
    } else {
      for (const p of this.players.values())
        if (!p.info.bot)
          this.hooks.send(p.info.id, message);
    }
  }
  snapshotFor(playerId) {
    const decode = createSnapshotDecoder();
    const p = this.players.get(playerId);
    const shared = this.wireShared(true);
    if (p)
      shared.vehicles = shared.vehicles.filter((_, i) => this.visibleTo(p.info.team, this.vehicles[i]));
    return decode({ ...shared, ...this.wirePersonal(p ?? null, false) });
  }
  visibleTo(team, v) {
    if (v.team === team || !isHiddenStealth(v, this.time))
      return true;
    const p = v.flight.position, r2 = STEALTH_VISUAL_RANGE * STEALTH_VISUAL_RANGE;
    for (const o of this.vehicles) {
      if (!o.alive || o.team !== team)
        continue;
      const q = o.flight.position;
      const dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2];
      if (dx * dx + dy * dy + dz * dz < r2)
        return true;
    }
    for (const sh of posedFleet()) {
      if (sh.team !== team || shipRuntime(this.combat, sh.id)?.sunk)
        continue;
      const dx = p[0] - sh.position[0], dy = p[1] - 20, dz = p[2] - sh.position[2];
      if (dx * dx + dy * dy + dz * dz < r2)
        return true;
    }
    return false;
  }
  wireShared(withPlayers) {
    const cs = this.combat;
    const now = this.time;
    const shared = {
      type: "snapshot",
      wire: 1,
      time: r3(now),
      tick: this.tick,
      vehicles: this.vehicles.map((v) => packVehicle(v, now)),
      projectiles: cs.projectiles.map(packProjectile),
      missiles: cs.missiles.map(packMissile),
      flares: cs.flares.map(packFlare),
      scores: this.scores,
      matchEndsAt: r3(this.matchEndsAt()),
      matchStartedAt: r3(this.matchStartedAt),
      intermission: this.matchEndedAt !== null
    };
    if (withPlayers) {
      shared.players = this.playerList();
      shared.ships = this.shipStates();
      shared.craters = (cs.craters ?? []).slice();
    }
    return shared;
  }
  shipStates() {
    const out = [];
    for (const sh of FLEET) {
      if (sh.team >= this.config.teams)
        continue;
      const rt = shipRuntime(this.combat, sh.id);
      if (!rt)
        continue;
      const turrets = {};
      for (const k in rt.turrets)
        turrets[k] = { hp: Math.round(rt.turrets[k].hp), manned: rt.turrets[k].manned };
      out.push({ id: sh.id, hp: Math.round(rt.hp), maxHp: rt.maxHp, sunk: rt.sunk, sunkAt: r2(rt.sunkAt), turrets, damage: rt.damage.map((d) => [d[0], d[1], d[2]]) });
    }
    return out;
  }
  playerList() {
    return [...this.players.values()].map((p) => ({ ...p.info, respawnAt: r2(p.info.respawnAt) }));
  }
  wirePersonal(p, full) {
    const out = { ack: p ? p.ack : -1 };
    const v = p ? this.vehicleOf(p.info) : undefined;
    if (v)
      out.own = packOwn(v);
    if (full) {
      out.players = this.playerList();
      out.ships = this.shipStates();
      out.craters = (this.combat.craters ?? []).slice();
    }
    return out;
  }
  broadcastSnapshot() {
    if (this.humanCount() === 0)
      return;
    const list = this.playerList();
    const listJson = JSON.stringify(list);
    const includePlayers = listJson !== this.lastPlayersJson || this.time - this.lastPlayersAt >= PLAYERS_RESEND;
    if (includePlayers) {
      this.lastPlayersJson = listJson;
      this.lastPlayersAt = this.time;
    }
    const shared = this.wireShared(false);
    if (includePlayers)
      shared.players = list;
    const ships = this.shipStates();
    const shipsJson = JSON.stringify(ships);
    if (shipsJson !== this.lastShipsJson || this.time - this.lastShipsAt >= PLAYERS_RESEND) {
      this.lastShipsJson = shipsJson;
      this.lastShipsAt = this.time;
      shared.ships = ships;
    }
    const craters = this.combat.craters ?? [];
    if (craters.length > this.cratersSent) {
      shared.craters = craters.slice(this.cratersSent);
      this.cratersSent = craters.length;
    }
    const parts = shared.vehicles.map((v) => JSON.stringify(v));
    const { vehicles: _omit, ...rest } = shared;
    const head = `${JSON.stringify(rest).slice(0, -1)},"vehicles":`;
    const all = `[${parts.join(",")}]`;
    const anyHidden = this.vehicles.some((v) => isHiddenStealth(v, this.time));
    const perTeam = new Map;
    const vehiclesFor = (team) => {
      if (!anyHidden)
        return all;
      let json = perTeam.get(team);
      if (json === undefined) {
        json = `[${parts.filter((_, i) => this.visibleTo(team, this.vehicles[i])).join(",")}]`;
        perTeam.set(team, json);
      }
      return json;
    };
    for (const p of this.players.values()) {
      if (p.info.bot)
        continue;
      const personal = this.wirePersonal(p, p.needsPlayers);
      p.needsPlayers = false;
      const text = `${head}${vehiclesFor(p.info.team)},${JSON.stringify(personal).slice(1)}`;
      if (this.hooks.sendText)
        this.hooks.sendText(p.info.id, text);
      else {
        let decode = this.decoders.get(p.info.id);
        if (!decode)
          this.decoders.set(p.info.id, decode = createSnapshotDecoder());
        this.hooks.send(p.info.id, decode(JSON.parse(text)));
      }
    }
  }
}
var r2 = (n) => Math.round(n * 100) / 100;
var r3 = (n) => Math.round(n * 1000) / 1000;
var r4 = (n) => Math.round(n * 1e4) / 1e4;
var v2 = (v) => [r2(v[0]), r2(v[1]), r2(v[2])];
var v3 = (v) => [r3(v[0]), r3(v[1]), r3(v[2])];
function packVehicle(v, now) {
  const f = v.flight;
  const q = f.orientation;
  const out = {
    id: v.id,
    k: v.kind,
    t: v.team,
    p: v2(f.position),
    v: v2(f.velocity),
    q: [r4(q[0]), r4(q[1]), r4(q[2]), r4(q[3])],
    w: v2(f.angularVelocity),
    th: r2(f.throttle),
    hp: Math.round(v.hp * 10) / 10,
    s: v.seats,
    am: [v.weapons[0].map((w) => w.ammo), v.weapons[1].map((w) => w.ammo)],
    fc: v.flareCount
  };
  if (f.onGround)
    out.g = 1;
  if (f.gearDown)
    out.gd = 1;
  if (f.crashed)
    out.c = f.crashed;
  if (v.aim[0] || v.aim[1])
    out.a = [v.aim[0] && v3(v.aim[0]), v.aim[1] && v3(v.aim[1])];
  if (v.spottedUntil > now)
    out.su = r2(v.spottedUntil);
  if (!v.alive)
    out.d = 1;
  return out;
}
function packOwn(v) {
  const pack = (w) => ({ ammo: w.ammo, readyAt: r3(w.readyAt), lockTarget: w.lockTarget, lock: r3(w.lock) });
  return {
    vehicle: v.id,
    ft: v.flight.tick,
    weapons: [v.weapons[0].map(pack), v.weapons[1].map(pack)],
    fr: r3(v.flaresReadyAt),
    ar: r3(v.abilityReadyAt),
    ld: v.lastDamagedBy,
    ...v.spotProgress !== undefined ? { sp: r3(v.spotProgress) } : {},
    ...v.spotCandidate !== undefined ? { sc: v.spotCandidate } : {}
  };
}
function packProjectile(x) {
  return { id: x.id, w: x.weapon, o: x.owner, vh: x.vehicle, t: x.team, p: v2(x.position), v: v2(x.velocity), a: r3(x.age), l: r3(x.ttl) };
}
function packMissile(x) {
  const out = {
    id: x.id,
    w: x.weapon,
    o: x.owner,
    vh: x.vehicle,
    t: x.team,
    p: v2(x.position),
    v: v2(x.velocity),
    a: r3(x.age),
    l: r3(x.ttl),
    tg: x.target
  };
  if (x.steered)
    out.st = 1;
  if (x.seat !== undefined)
    out.se = x.seat;
  return out;
}
function packFlare(x) {
  return { id: x.id, vh: x.vehicle, p: v2(x.position), v: v2(x.velocity), a: r3(x.age), l: r3(x.ttl) };
}
function createSnapshotDecoder() {
  let players = [];
  let ships;
  return (message) => {
    if (message.type !== "snapshot" || !("wire" in message))
      return message;
    const m = message;
    if (m.players)
      players = m.players;
    if (m.ships)
      ships = m.ships;
    const own = m.own;
    return {
      type: "snapshot",
      time: m.time,
      tick: m.tick,
      vehicles: m.vehicles.map((w) => {
        const mine = own && own.vehicle === w.id ? own : null;
        const v = {
          id: w.id,
          kind: w.k,
          team: w.t,
          flight: {
            kind: w.k,
            position: w.p,
            velocity: w.v,
            orientation: w.q,
            angularVelocity: w.w,
            throttle: w.th,
            onGround: w.g === 1,
            gearDown: w.gd === 1,
            crashed: w.c ?? null,
            tick: mine ? mine.ft : m.tick
          },
          hp: w.hp,
          maxHp: VEHICLES[w.k]?.maxHp ?? w.hp,
          seats: w.s,
          aim: w.a ?? [null, null],
          weapons: mine ? mine.weapons : [
            w.am[0].map((ammo) => ({ ammo, readyAt: 0, lockTarget: null, lock: 0 })),
            w.am[1].map((ammo) => ({ ammo, readyAt: 0, lockTarget: null, lock: 0 }))
          ],
          flaresReadyAt: mine ? mine.fr : 0,
          flareCount: w.fc,
          abilityReadyAt: mine ? mine.ar : 0,
          spottedUntil: w.su ?? 0,
          lastDamagedBy: mine ? mine.ld : null,
          alive: w.d !== 1
        };
        if (mine?.sp !== undefined)
          v.spotProgress = mine.sp;
        if (mine?.sc !== undefined)
          v.spotCandidate = mine.sc;
        return v;
      }),
      players,
      ...ships ? { ships } : {},
      ...m.craters ? { craters: m.craters } : {},
      projectiles: m.projectiles.map((x) => ({ id: x.id, weapon: x.w, owner: x.o, vehicle: x.vh, team: x.t, position: x.p, velocity: x.v, age: x.a, ttl: x.l })),
      missiles: m.missiles.map((x) => {
        const out = {
          id: x.id,
          weapon: x.w,
          owner: x.o,
          vehicle: x.vh,
          team: x.t,
          position: x.p,
          velocity: x.v,
          target: x.tg,
          steered: x.st === 1,
          age: x.a,
          ttl: x.l
        };
        if (x.se !== undefined)
          out.seat = x.se;
        return out;
      }),
      flares: m.flares.map((x) => ({ id: x.id, vehicle: x.vh, position: x.p, velocity: x.v, age: x.a, ttl: x.l })),
      scores: m.scores,
      matchEndsAt: m.matchEndsAt,
      matchStartedAt: m.matchStartedAt,
      intermission: m.intermission,
      ack: m.ack
    };
  };
}

// src/sim/loopback.ts
function createLoopbackRoom(config, name, handlers, options = {}) {
  const now = options.now ?? (() => performance.now());
  let open = true;
  const outbox = [];
  let flushing = false;
  const decode = createSnapshotDecoder();
  const flush = () => {
    flushing = false;
    const batch = outbox.splice(0);
    for (const raw of batch)
      if (open)
        handlers.onMessage(decode(JSON.parse(raw)));
  };
  const enqueue = (text) => {
    if (!open)
      return;
    outbox.push(text);
    if (!flushing) {
      flushing = true;
      queueMicrotask(flush);
    }
  };
  const engine = new RoomEngine(options.code ?? "local", sanitizeConfig({ ...DEFAULT_ROOM_CONFIG, listed: false, ...config }), {
    send: (_id, message) => enqueue(JSON.stringify(message)),
    sendText: (_id, text) => enqueue(text)
  });
  handlers.onStatus?.("connecting");
  const playerId = engine.addPlayer(name);
  queueMicrotask(() => {
    if (open)
      handlers.onStatus?.("open");
  });
  let last = now();
  const timer = options.manual ? undefined : setInterval(() => {
    const t = now();
    engine.advance((t - last) / 1000);
    last = t;
  }, options.intervalMs ?? 1000 / 60);
  return {
    engine,
    playerId,
    send(message) {
      if (!open)
        return;
      engine.handle(playerId, JSON.parse(JSON.stringify(message)));
    },
    close() {
      if (!open)
        return;
      open = false;
      if (timer !== undefined)
        clearInterval(timer);
      engine.removePlayer(playerId);
      handlers.onStatus?.("closed");
    },
    rtt: () => 0,
    step(seconds) {
      engine.advance(seconds);
    }
  };
}

// solo-check.ts
var messages = [];
var room = createLoopbackRoom({ teams: 2, bots: 0, listed: false }, "Solo check", {
  onMessage: (m) => messages.push(m.type)
}, { manual: true });
await Promise.resolve();
assert(messages.includes("welcome"));
room.send({ type: "spawn", kind: "fighter" });
var vehicle = room.engine.vehicles.find((v) => v.seats[0] === room.playerId);
assert(vehicle);
var start = [...vehicle.flight.position];
for (let i = 1;i <= 900; i++) {
  room.send({ type: "input", seq: i, flight: { aim: null, throttle: 1, roll: 0, yaw: 0, pitch: i > 120 ? 0.35 : 0, boost: true, brake: false } });
  room.step(TICK_DT);
}
await Promise.resolve();
var end = [...vehicle.flight.position];
console.log(JSON.stringify({ start, end, alive: vehicle.alive, onGround: vehicle.flight.onGround, speed: Math.hypot(...vehicle.flight.velocity), aircraft: room.engine.vehicles.length }));
assert(vehicle.alive, "aircraft must survive takeoff");
assert(!vehicle.flight.onGround, "aircraft must leave carrier deck");
assert(end[1] > start[1] + 50, "pitch input must produce a climb");
assert(Math.hypot(...end.map((n, i) => n - start[i])) > 300, "aircraft must move");
assert.equal(room.engine.vehicles.length, 1);
room.close();
var fresh = createLoopbackRoom({ teams: 2, bots: 0, listed: false }, "Fresh round", { onMessage() {} }, { manual: true });
await Promise.resolve();
assert.equal(fresh.engine.time, 0);
fresh.send({ type: "spawn", kind: "fighter" });
var dive = fresh.engine.vehicles.find((v) => v.seats[0] === fresh.playerId);
assert.deepEqual(dive.flight.position, start);
for (let i = 1;i <= 900 && dive.alive; i++) {
  fresh.send({ type: "input", seq: i, flight: { aim: null, throttle: 1, roll: 0, yaw: 0, pitch: -1, boost: true, brake: false } });
  fresh.step(TICK_DT);
}
assert(!dive.alive, "ordinary dive input must crash");
var crashAt = fresh.engine.time;
for (let i = 0;i < 600; i++)
  fresh.step(TICK_DT);
fresh.send({ type: "spawn", kind: "fighter" });
var respawn = fresh.engine.vehicles.find((v) => v.seats[0] === fresh.playerId && v.alive);
assert(respawn, "fighter must respawn after cooldown");
assert.notEqual(respawn.id, dive.id);
console.log(JSON.stringify({ freshTime: 0, crashAt, respawnAt: fresh.engine.time, respawnAlive: respawn.alive }));
fresh.close();
console.log("PASS: offline takeoff, fresh session, ordinary-input crash and respawn; rendering not tested");
