import { createWorld, populateWorld } from './world.mjs';

const canvas = document.querySelector('#world');
try {
  const params = new URLSearchParams(location.search);
  const world = createWorld(canvas, { size: params.get('size') === '128' ? 128 : 200, pixelRatio: 1 });
  const fixture = populateWorld(world, { dense: params.has('perf') });
  const samples = [];
  let last = performance.now(), started = last, elapsed = 0, running = true, frameCount = 0;
  let tour = !params.has('manual'), lastInput = world.controls.inputVersion;
  world.dayNight.setPhase(params.get('night') === '1' ? 0 : .5);
  world.controls.setPose({ x: 100, y: 160, z: 180, yaw: .45, pitch: -.7 }, true);
  const api = {
    world, fixture, samples,
    get frameCount() { return frameCount; },
    stopTour() { tour = false; },
    stats() {
      const sorted = [...samples].sort((a, b) => a - b);
      const total = samples.reduce((sum, n) => sum + n, 0);
      return { size: world.roads.size, lots: world.roads.size ** 2, viewport: [canvas.width, canvas.height],
        frames: samples.length, sampleSeconds: total / 1000, fps: samples.length ? samples.length * 1000 / total : 0,
        medianMs: sorted[Math.floor(sorted.length / 2)] || 0, p95Ms: sorted[Math.floor(sorted.length * .95)] || 0,
        calls: world.renderer.info.render.calls, triangles: world.renderer.info.render.triangles,
        roadLots: world.roads.cells.size, modelInstances: [...world.buildings.pools.values()].reduce((n, p) => n + p.mesh.count, 0),
        cameraY: world.camera.position.y, measuredSeconds: (performance.now() - started) / 1000 };
    },
    dispose() { running = false; world.dispose(); },
  };
  window.citistenWorld = api;
  function frame(now) {
    if (!running) return;
    const delta = Math.max(0, now - last); last = now; elapsed += delta / 1000;
    if (world.controls.inputVersion !== lastInput) { tour = false; lastInput = world.controls.inputVersion; }
    if (tour) {
      const angle = elapsed * .07;
      world.controls.setPose({ x: Math.sin(angle) * 160, y: 75 + 55 * (1 + Math.sin(angle * .7)), z: Math.cos(angle) * 160, yaw: angle, pitch: -.65 });
    }
    world.render(delta / 1000);
    frameCount++;
    // Rolling diagnostics; the QA caller clears these after its measured warmup.
    samples.push(delta); if (samples.length > 4096) samples.shift();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  addEventListener('pagehide', () => api.dispose(), { once: true });
} catch (error) {
  const message = document.createElement('pre');
  message.textContent = `World renderer could not start: ${error.message}`;
  canvas.replaceWith(message);
  console.error(error);
}
