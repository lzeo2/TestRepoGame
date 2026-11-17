#!/usr/bin/env node
// Scripted physics workload. No renderer, native input, GPU or hardware claim.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { Session } from 'node:inspector';
import { performance } from 'node:perf_hooks';

const args = process.argv.slice(2), options = { frames: 18000, 'allocation-frames': 600, seed: 20261117, root: resolve(dirname(fileURLToPath(import.meta.url)), '..') };
for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace(/^--/, '');
  if (!['root', 'output', 'frames', 'seed', 'allocation-frames'].includes(key) || args[i+1] === undefined) throw new Error('Usage: --output <fresh-directory> [--root <exact-export>] [--frames <per-origin>] [--seed <integer>] [--allocation-frames <nonnegative-integer>]');
  options[key] = ['frames', 'seed', 'allocation-frames'].includes(key) ? Number(args[i+1]) : resolve(args[i+1]);
}
if (!Number.isInteger(options['allocation-frames']) || options['allocation-frames'] < 0) throw new Error('--allocation-frames must be a nonnegative integer');
if (!options.output || !Number.isInteger(options.frames) || options.frames < 1 || !Number.isInteger(options.seed)) throw new Error('Fresh --output and positive integer --frames required');
await mkdir(options.output); // Deliberately refuses to overwrite evidence.
const root = options.root, load = path => import(pathToFileURL(resolve(root, path)).href);
const fixturePath = 'scripts/capital-campaign-fixture.mjs';
const [{ createCampaignFixture }, { createSimulation, pointOnLane }, { createTerrainSampler }, { generateParkedCars }] = await Promise.all([
  load(fixturePath), load('Games/Capital Drive/simulation.js'), load('Games/Capital Drive/terrain.js'), load('Games/Capital Drive/parking-layout.js')]);
const hashes = {};
async function closure(path) {
  path = resolve(root, path); const name = relative(root, path).split('\\').join('/');
  if (hashes[name]) return;
  if (name.startsWith('../')) throw new Error('Dependency outside exact source root');
  const bytes = await readFile(path); hashes[name] = createHash('sha256').update(bytes).digest('hex');
  if (!/\.(?:m?js)$/.test(path)) return;
  for (const match of bytes.toString().matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g)) {
    if (match[1].startsWith('.')) await closure(resolve(dirname(path), match[1]));
  }
}
await closure(fixturePath);
await closure('Games/Capital Drive/parking-layout.js');
for (const name of ['canberra', 'canberra-north', 'road-profiles', 'north-terrain', 'airport']) await closure(`Games/Capital Drive/data/${name}.json`);
const harnessHash = createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
const { map, limits } = await createCampaignFixture();
const terrain = createTerrainSampler(map);
const { roadProfile } = await load('Games/Capital Drive/road-network.js');
const session = new Session(); session.connect();
const post = (method, params = {}) => new Promise((yes, no) => session.post(method, params, (error, result) => error ? no(error) : yes(result)));
await post('Profiler.enable'); await post('Profiler.setSamplingInterval', { interval: 1000 });
const heap = () => process.memoryUsage();
const forceGC = () => { if (global.gc) global.gc(); return heap(); };
const percentile = (values, p) => values[Math.min(values.length-1, Math.ceil(values.length*p)-1)];
const state = sim => [sim.player, ...sim.traffic, ...sim.parkedCars, ...sim.abandonedCars].map(car => ({
  ...Object.fromEntries(Object.entries(car).filter(([, value]) => value === null || ['number', 'string', 'boolean'].includes(typeof value))),
  edgeId: car.edge?.id ?? null }));
const records = [];
for (const label of ['Telopea', 'Commonwealth Bridge', 'Civic']) {
  const sim = createSimulation(map, { trafficCount: 40, seed: options.seed, isOnBridge: terrain.isOnBridge, vehicleHeightAt: terrain.vehicleHeightAt });
  const parked = generateParkedCars(map, { isClear: (_x, _z, _radius, pose) => sim.canOccupy(pose, { length: 4.8, width: 2 }) });
  sim.setParkedCars(parked);
  let target, source;
  if (label === 'Commonwealth Bridge') {
    const roads = map.roads.filter(r => r.name === 'Commonwealth Avenue' && !['no', 'false', 'undefined'].includes(String(r.sourceTags?.bridge ?? r.tags?.bridge ?? r.bridge).toLowerCase()));
    if (!roads.length) throw new Error('No sourced Commonwealth bridge');
    const road = roads.slice().sort((a,b) => String(a.id).localeCompare(String(b.id)))[0], p = road.points[Math.floor(road.points.length/2)];
    target = { x: p[0], z: p[1] }; source = { roadId: road.id, sourceTags: road.sourceTags, selection: 'named tagged bridge road, source-id order, middle vertex' };
  } else {
    const id = label === 'Telopea' ? 'telopea' : 'canberra-centre';
    target = map.landmarks.find(p => p.id === id);
    if (!target) throw new Error(`Missing source landmark ${id}`);
    source = { landmarkId: id, x: target.x, z: target.z };
  }
  const candidates = [];
  for (const edge of sim.graph.edges) {
    const tags = edge.road.sourceTags || {};
    if (!roadProfile(edge.road).trafficAllowed || ['private', 'no'].includes(tags.access) || ['private', 'no'].includes(tags.motor_vehicle)) continue;
    for (const fraction of [.25, .5, .75]) {
      const offset = edge.length*fraction, pose = pointOnLane(edge, offset);
      candidates.push({ edge, offset, pose, distance: Math.hypot(pose.x-target.x, pose.z-target.z) });
    }
  }
  candidates.sort((a,b) => a.distance-b.distance);
  const start = candidates.find(c => sim.canOccupy({ ...sim.player, ...c.pose }, { ignoreId: 'player' }));
  if (!start) throw new Error('No clear public-road origin');
  sim.reset(start.pose);
  // Fixed standing adult bodies are a bounded collision fixture, not an NPC AI replay.
  const people = Array.from({ length: 36 }, (_, i) => {
    const p = pointOnLane(start.edge, Math.max(0, Math.min(start.edge.length, start.offset+(i-18)*3)));
    const side = i%2 ? 1 : -1;
    return { id: `profile-person-${i}`, x: p.x+Math.cos(p.yaw)*side*5, z: p.z-Math.sin(p.yaw)*side*5, radius: .35 };
  });
  sim.setExternalPeople(people);
  const beforeGC = heap(), afterGC = forceGC(), timings = [], positions = [], digest = createHash('sha256');
  const initial = state(sim); digest.update(JSON.stringify(initial));
  await post('Profiler.start');
  const begin = performance.now();
  for (let frame = 0; frame < options.frames; frame++) {
    const input = { throttle: .35, steer: Math.sin(frame/180)*.12, brake: frame%1800 >= 1740 };
    const t = performance.now(); sim.step(1/60, input); timings.push(performance.now()-t);
    if (frame%60 === 59 || frame === options.frames-1) {
      const snapshot = state(sim); digest.update(JSON.stringify(snapshot));
      positions.push({ frame: frame+1, x: sim.player.x, z: sim.player.z, yaw: sim.player.yaw, odometer: sim.player.odometer, crashes: sim.player.crashes });
    }
  }
  const replayWallMs = performance.now()-begin;
  const { profile } = await post('Profiler.stop');
  const finalState = state(sim), stateChecksum = digest.digest('hex'), finalTrafficCount = sim.traffic.length;
  const after = heap(), forcedAfter = forceGC();
  const slug = label.toLowerCase().replaceAll(' ', '-');
  await writeFile(resolve(options.output, `${slug}.cpuprofile`), JSON.stringify(profile));
  let allocation = { enabled: false, frames: 0 };
  if (options['allocation-frames'] > 0) {
    await post('HeapProfiler.enable');
    const samplingInterval = 32768;
    let collectedObjectsIncluded = true;
    try {
      await post('HeapProfiler.startSampling', { samplingInterval, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
    } catch (error) {
      if (!/invalid.*param|param.*invalid/i.test(error.message)) throw error;
      collectedObjectsIncluded = false;
      await post('HeapProfiler.startSampling', { samplingInterval });
    }
    // Continue the same state and deterministic trace after CPU and timing capture.
    for (let i = 0; i < options['allocation-frames']; i++) {
      const frame = options.frames+i;
      sim.step(1/60, { throttle: .35, steer: Math.sin(frame/180)*.12, brake: frame%1800 >= 1740 });
    }
    const { profile: allocationProfile } = await post('HeapProfiler.stopSampling');
    await writeFile(resolve(options.output, `${slug}.heapprofile`), JSON.stringify(allocationProfile));
    const callStacks = [];
    function allocationRows(node, ancestors = []) {
      const stack = [...ancestors, node.callFrame];
      if (node.selfSize) callStacks.push({ estimatedBytes: node.selfSize, stack });
      for (const child of node.children || []) allocationRows(child, stack);
    }
    allocationRows(allocationProfile.head);
    callStacks.sort((a,b) => b.estimatedBytes-a.estimatedBytes);
    allocation = { enabled: true, frames: options['allocation-frames'], suppliedSimulationSeconds: options['allocation-frames']/60,
      traceStartFrame: options.frames, samplingInterval, collectedObjectsIncluded,
      estimatedSampledAllocationBytes: callStacks.reduce((sum,row) => sum+row.estimatedBytes,0),
      samples: allocationProfile.samples?.length ?? null, callStacks, profile: `${slug}.heapprofile`,
      heapAfterProbe: heap(), heapAfterProbeForcedGC: forceGC(),
      limitations: 'Separate continuation after CPU/timing/checksum capture; statistical allocation estimates, not live heap, retained RAM or byte-precise total allocation. Collected-object flags requested where supported by inspector; no forced GC inside sampling phase.' };
  }
  timings.sort((a,b) => a-b);
  records.push({ label, frames: options.frames, suppliedSimulationSeconds: options.frames/60, source,
    origin: { ...start.pose, edgeId: start.edge.id, roadId: start.edge.road.id, roadName: start.edge.road.name, offsetMetres: start.offset, distanceFromSourceMetres: start.distance },
    trafficCount: finalTrafficCount, parkedCount: parked.length, peopleCount: people.length,
    replayWallMs, stepMs: { p50: percentile(timings,.5), p95: percentile(timings,.95), p99: percentile(timings,.99), sum: timings.reduce((a,b)=>a+b,0) },
    heap: { beforeGC, afterGC, after, forcedAfter, forcedGCAvailable: Boolean(global.gc) },
    allocation, initialState: initial, finalState, positions, stateChecksum, checksumCadence: 'initial and every 60 steps plus final; all cars, scalar state and edge IDs', profile: `${slug}.cpuprofile` });
  console.log(`${label}: ${options.frames} frames, ${(options.frames/60).toFixed(1)} supplied seconds, p95 ${percentile(timings,.95).toFixed(3)} ms`);
}
session.disconnect();
await writeFile(resolve(options.output, 'summary.json'), JSON.stringify({ workload: 'scripted physics workload; not native continuous driving',
  queryParameters: { framesPerOrigin: options.frames, allocationFramesPerOrigin: options['allocation-frames'], seed: options.seed, dt: 1/60, throttle: .35, steer: 'sin(frame/180)*.12', brake: 'frame%1800>=1740' },
  sourceIdentity: 'Exact dependency hashes are authoritative; no HEAD revision is inferred for exported sources.', sourceHashes: hashes, harnessSHA256: harnessHash,
  limitations: [...limits, 'No renderer, GPU, native input or Intel N100 evidence. Fixed 36-person collision bodies, no pedestrian AI. No mid-run teleport or manual reset; canonical simulation.step may perform its own recovery. CPU profiles include loop timing and one-second snapshot/checksum overhead. Forced GC only between measured phases.'], records }, null, 2)+'\n');
