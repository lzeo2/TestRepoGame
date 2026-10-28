import { Vector3 } from './vendor/three.module.js';
import { BUILD_TIMES, NEW_BUILDINGS } from './city-content.mjs';
import { MODEL_DIRECTORIES } from './external-assets.mjs';

const names = ['camera', 'projection', 'target', 'viewport', 'scene', 'projected', 'shading'];
const mobile = new Set(['citizen', 'zombie', 'car', 'patrol_car', 'utility_car']);
const staticDirectories = new Set(Object.entries(MODEL_DIRECTORIES).filter(([type]) => !mobile.has(type)).map(([, directory]) => directory));
const finite = value => Number.isFinite(value) ? value : null;
const matrix = value => value?.elements?.length === 16 ? Array.from(value.elements) : null;
const xyz = value => value ? [value.x, value.y, value.z] : null;

// Called at recording start, not world creation. All transforms belong to the
// existing render loop. Never refresh a matrix to make this observer look valid.
export function createRenderMotionSampler(world, canvas, { getState = () => null } = {}) {
  const cohort = [], pools = [], seen = new Set(), setupReasons = [];
  let scene, childrenCount = null, poolCount = null, layout = null, ground = null;
  const landmarks = [], candidates = [], expected = new Set(), selectedDirectories = new Set(), baseLabels = new Set();
  let scanned = 0, matched = 0, selected = 0;
  function add(label, node, current) {
    if (!node || seen.has(node)) return;
    if (cohort.length === 24) { setupReasons.push('cohort-cap'); return; }
    seen.add(node);
    cohort.push({ label, node, current, parent: node.parent, geometry: node.geometry,
      attribute: node.instanceMatrix, visible: node.visible, count: node.isInstancedMesh ? node.count : null });
  }
  try {
    scene = world?.scene;
    childrenCount = finite(scene?.children?.length);
    layout = world?.riverTerrain?.layout ?? null;
    add('root', scene, () => world?.scene);
    add('land', world?.landscape?.mesh, () => world?.landscape?.mesh);
    for (let i = 0; i < Math.min(4, world?.landscape?.batches?.length ?? 0); i++) {
      add(`land${i}`, world.landscape.batches[i], () => world?.landscape?.batches?.[i]);
    }
    add('road', world?.roadPool?.mesh, () => world?.roadPool?.mesh);
    add('bridge', world?.roadPool?.bridges?.mesh, () => world?.roadPool?.bridges?.mesh);
    add('water', world?.water?.mesh, () => world?.water?.mesh);
    // Ground is not public. Its AO map is: match that exact reference only.
    for (let i = 0; i < Math.min(128, scene?.children?.length ?? 0); i++) {
      const node = scene.children[i], materials = Array.isArray(node.material) ? node.material : [node.material];
      scanned++;
      if (!ground && world?.blockAO?.map && materials.slice(0, 4).some(m => m?.aoMap === world.blockAO.map)) {
        ground = node; add('ground', node, () => ground);
      }
      // Supplied directory__slot namespace survives createBuildingSurface's
      // clone and external-buildings' material batching. Never use node names.
      const parts = typeof node.material?.name === 'string' ? node.material.name.split('__') : [];
      if (node.isInstancedMesh && parts.length === 2 && parts[1] && staticDirectories.has(parts[0])) {
        candidates.push([node, parts[0]]); matched++;
      }
    }
    if (!ground) setupReasons.push('ground-unidentified');
    const map = world?.buildings?.pools;
    poolCount = finite(map?.size);
    if (map?.entries) {
      let visited = 0;
      for (const [type, pool] of map) {
        if (visited++ === 24) { setupReasons.push('pool-scan-cap'); break; }
        if (mobile.has(type)) continue;
        const label = `p${pools.length}`;
        pools.push({ label, type, pool, first: pool.handles?.[0], count: pool.handles?.length,
          batches: pool.batches?.length });
        for (let i = 0; i < Math.min(24, pool.batches?.length ?? 0); i++) {
          add(`${label}b${i}`, pool.batches[i], () => world?.buildings?.pools?.get(type)?.batches?.[i]);
        }
        // The city adapter's base GLB batches are private. Do not substitute
        // logical handle matrices for the actual rendered instance buffers.
        if (pool.handles?.[0]?.base) expected.add(MODEL_DIRECTORIES[NEW_BUILDINGS[type]?.modelType || type] ?? null);
      }
    } else setupReasons.push('building-pools-unavailable');
    for (const [node, directory] of candidates) {
      add(`base${selected}`, node, () => node);
      if (seen.has(node)) {
        selectedDirectories.add(directory); baseLabels.add(cohort.find(item => item.node === node).label);
        selected = baseLabels.size;
      }
    }
    if ([...expected].some(directory => !selectedDirectories.has(directory))) setupReasons.push('private-base-batches-unobserved');
    if (scanned < childrenCount) setupReasons.push('scene-scan-cap');
    const pose = map?.get('townhall')?.handles?.[0]?.pose;
    if (pose && [pose.x, pose.y, pose.z].every(Number.isFinite)) {
      landmarks.push(['hall', [pose.x, pose.y, pose.z]], ['hallTop', [pose.x, pose.y + 15, pose.z]]);
    }
    const extent = world?.roads?.size * world?.roads?.lotSize / 2;
    if (Number.isFinite(extent) && extent > 0) {
      landmarks.push(['center', [0, 0, 0]], ['west', [-extent / 4, 0, 0]], ['east', [extent / 4, 0, 0]]);
    }
  } catch { setupReasons.push('cohort-selection-failed'); }

  return { sample() {
    const result = { available: false, reasons: [...new Set(setupReasons)],
      groups: Object.fromEntries(names.map(name => [name, null])),
      keys: Object.fromEntries(names.map(name => [name, []])),
      input: { known: false, held: [], dragging: null, version: null },
      render: { frame: null, calls: null, triangles: null, geometries: null, textures: null }, sim: null,
      coverage: { health: 'unqueried', base: { scanned, matched, selected, sampled: selected,
        unmatched: [...expected].filter(directory => !selectedDirectories.has(directory)).length,
        capped: scanned < childrenCount || selected < matched, partial: true },
        cohort: cohort.length, nodes: [], pools: [],
        sceneChildren: null, poolCount: null, layoutChanged: null, changed: false,
        landmarks: landmarks.length, visibleLandmarks: 0, constructionScanned: 0,
        constructionTotal: null, constructionCapped: false, omittedSceneBlocks: 0 } };
    const reason = text => { if (!result.reasons.includes(text)) result.reasons.push(text); };
    const read = (label, fn) => { try { return fn(); } catch { reason(`${label}-read-failed`); return null; } };
    function append(group, key, values) {
      if (!values?.length || !values.every(Number.isFinite)) { reason(`${group}-${key}-missing-or-nonfinite`); return; }
      (result.groups[group] ??= []).push(...values);
      result.keys[group].push(key);
    }
    const scalar = (label, value) => {
      if (!Number.isFinite(value)) reason(`${label}-unknown`);
      return finite(value);
    };
    read('camera', () => {
      append('camera', 'world16', matrix(world?.camera?.matrixWorld));
      append('camera', 'view16', matrix(world?.camera?.matrixWorldInverse));
      append('projection', 'projection16', matrix(world?.camera?.projectionMatrix));
    });
    read('controls', () => {
      const controls = world?.controls, target = controls?.target, input = controls?.inputState;
      append('target', 'xyzYawPitch5', target && [target.x, target.y, target.z, target.yaw, target.pitch]);
      const version = input?.version ?? controls?.inputVersion;
      result.input.version = Number.isInteger(version) && version >= 0 ? version : null;
      if (Array.isArray(input?.held) && input.held.length <= 4 &&
          input.held.every(key => ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(key)) &&
          typeof input.dragging === 'boolean' && result.input.version !== null) {
        result.input = { known: true, held: [...new Set(input.held)].sort(), dragging: input.dragging, version };
      } else reason('held-input-unknown');
    });
    read('viewport', () => {
      append('viewport', 'client2', [canvas?.clientWidth, canvas?.clientHeight]);
      append('viewport', 'buffer2', [canvas?.width, canvas?.height]);
      const rect = read('rect', () => canvas?.getBoundingClientRect());
      append('viewport', 'rect4', rect && [rect.left, rect.top, rect.width, rect.height]);
      append('viewport', 'dpr1', [globalThis.devicePixelRatio]);
      // No renderer methods: a substituted/private renderer may not have the
      // vendor's pure getPixelRatio implementation. Buffer/client are separate.
      reason('render-pixel-ratio-unqueried');
      const viewport = globalThis.window?.visualViewport;
      append('viewport', 'visual5', viewport && [viewport.width, viewport.height, viewport.offsetLeft, viewport.offsetTop, viewport.scale]);
    });
    read('scene', () => {
      const c = result.coverage;
      c.sceneChildren = finite(world?.scene?.children?.length);
      c.poolCount = finite(world?.buildings?.pools?.size);
      c.layoutChanged = layout === null ? null : world?.riverTerrain?.layout !== layout;
      c.changed = c.sceneChildren !== childrenCount || c.poolCount !== poolCount || c.layoutChanged === true;
      for (const item of cohort) {
        const { node, label } = item, same = item.current() === node;
        const attached = node === scene ? world?.scene === scene : node.parent === item.parent && node.parent === scene;
        const count = node.isInstancedMesh ? finite(node.count) : null;
        const geometrySame = node.geometry === item.geometry, attributeSame = node.instanceMatrix === item.attribute;
        c.nodes.push([label, same && attached, count, node.visible === true, geometrySame, attributeSame]);
        if (!same || !attached || !geometrySame || !attributeSame || count !== item.count || node.visible !== item.visible) c.changed = true;
        if (!same || !attached) { reason('cohort-detached-or-replaced'); continue; }
        append('scene', `${label}.w16`, matrix(node.matrixWorld));
        if (node.isInstancedMesh && count > 0) {
          const array = node.instanceMatrix?.array;
          append('scene', `${label}.i16`, array?.length >= 16 ? Array.from(array.subarray(0, 16)) : null);
        }
      }
      for (const p of pools) {
        const current = world?.buildings?.pools?.get(p.type), same = current === p.pool;
        const count = finite(current?.handles?.length), batches = finite(current?.batches?.length);
        const firstSame = current?.handles?.[0] === p.first;
        c.pools.push([p.label, same, count, batches, firstSame]);
        if (!same || count !== p.count || batches !== p.batches || !firstSame) c.changed = true;
      }
      if (c.changed) reason('cohort-coverage-changed');
    });
    read('projected', () => {
      if (!result.groups.camera || !result.groups.projection || !(canvas?.clientWidth > 0 && canvas?.clientHeight > 0)) return;
      if (!matrix(world?.scene?.matrixWorld)?.every(Number.isFinite)) { reason('landmark-root-missing-or-nonfinite'); return; }
      for (const [label, point] of landmarks) {
        const v = new Vector3(...point).applyMatrix4(world.scene.matrixWorld).applyMatrix4(world.camera.matrixWorldInverse);
        if (!Number.isFinite(v.z) || !(v.z < -world.camera.near)) continue;
        v.applyMatrix4(world.camera.projectionMatrix);
        if (![v.x, v.y, v.z].every(Number.isFinite) || Math.abs(v.x) > 1 || Math.abs(v.y) > 1 || Math.abs(v.z) > 1) continue;
        append('projected', `${label}.visibleXY2`, [(v.x + 1) * canvas.clientWidth / 2, (1 - v.y) * canvas.clientHeight / 2]);
        result.coverage.visibleLandmarks++;
      }
    });
    if (!result.groups.projected) reason('no-valid-visible-landmarks');
    read('shading', () => {
      const day = world?.dayNight;
      append('shading', 'phaseDay2', [day?.phase, day?.daylight]);
      append('shading', 'sunDirection3', xyz(day?.sunDirection));
      for (const name of ['sun', 'moon']) {
        const light = day?.lights?.[name];
        append('shading', `${name}Shadow16`, matrix(light?.shadow?.matrix));
        append('shading', `${name}Intensity1`, [light?.intensity]);
      }
      const normal = world?.water?.mesh?.material?.normalMap;
      append('shading', 'waterUV4', normal && [normal.offset.x, normal.offset.y, normal.repeat.x, normal.repeat.y]);
      append('shading', 'weatherElapsed1', [world?.atmosphere?.particles?.material?.uniforms?.elapsed?.value]);
      append('shading', 'fog2', [world?.scene?.fog?.density, world?.atmosphere?.uniforms?.cityFogDensity?.value]);
    });
    read('render', () => {
      const info = world?.renderer?.info;
      for (const key of ['frame', 'calls', 'triangles']) result.render[key] = scalar(`render-${key}`, info?.render?.[key]);
      for (const key of ['geometries', 'textures']) result.render[key] = scalar(`render-${key}`, info?.memory?.[key]);
    });
    read('sim', () => {
      const state = getState();
      if (!state) { reason('sim-unavailable'); return; }
      result.sim = { time: scalar('sim-time', state.time), tick: scalar('sim-tick', state.tick),
        speed: scalar('sim-speed', state.speed), construction: [] };
      if (!Array.isArray(state.buildings)) { reason('construction-unavailable'); return; }
      result.coverage.constructionTotal = state.buildings.length;
      // Bounded scan even for a 10,000-building town. Later sites are explicitly
      // unobserved, not reported complete. No save/snapshot or derived state read.
      for (let i = 0; i < Math.min(256, state.buildings.length); i++) {
        result.coverage.constructionScanned++;
        const b = state.buildings[i];
        if (b?.constructionRemaining > 0) {
          result.sim.construction.push({ id: scalar('construction-id', b.id),
            type: Object.hasOwn(BUILD_TIMES, b.type) ? b.type : null,
            remaining: scalar('construction-remaining', b.constructionRemaining) });
          if (result.sim.construction.length === 8) break;
        }
      }
      result.coverage.constructionCapped = result.coverage.constructionScanned < state.buildings.length;
      if (result.coverage.constructionCapped) reason('construction-scan-capped');
    });
    result.available = Boolean(result.groups.camera?.length === 32 && result.groups.projection?.length === 16 && result.groups.scene);
    // Preserve full precision, not rounded fake stability. Each scene key denotes
    // one 16-number block. Drop tail blocks explicitly to keep even extreme
    // finite doubles and metadata below the recorder's 8 KiB sample budget.
    while (JSON.stringify(result).length >= 8000 && result.keys.scene.length) {
      result.keys.scene.pop(); result.groups.scene.splice(-16);
      result.coverage.omittedSceneBlocks++;
      reason('sample-byte-cap');
    }
    if (!result.keys.scene.length) result.groups.scene = null;
    if (JSON.stringify(result).length >= 8000) {
      result.groups.shading = null; result.keys.shading = [];
      reason('sample-byte-cap-shading');
    }
    result.coverage.base.sampled = result.keys.scene.filter(key => key.endsWith('.i16') && baseLabels.has(key.slice(0, -4))).length;
    result.available &&= result.groups.scene !== null;
    return result;
  } };
}
