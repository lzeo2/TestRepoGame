// CPU-only protocol/lifecycle regression. Bundle for Node with the source builder's Three resolver.
import assert from 'node:assert/strict'
import { MeshBasicMaterial, Vector3 } from 'three'
import { TerrainStreamer } from './src/render/world/streamer'
import { WORLD_QUALITY } from './src/render/world/settings'
import type { TreeResources } from './src/render/world/trees'
import type { WorkerRequest } from './src/render/world/terrain-worker'

class FakeWorker {
  static instances: FakeWorker[] = []
  onmessage: ((event: { data: unknown }) => void) | null = null
  onerror: ((event: { message: string }) => void) | null = null
  requests: WorkerRequest[] = []
  terminated = false
  constructor() { FakeWorker.instances.push(this) }
  postMessage(req: WorkerRequest) { this.requests.push(req) }
  emit(data: unknown) { this.onmessage?.({ data }) }
  error(message: string) { this.onerror?.({ message }) }
  terminate() { this.terminated = true }
}

type Result = { type: string; id?: number }
// Inspect existing queues only in this CPU fixture; no production test API or scheduling override.
type Internals = { results: Result[]; backend: { post(req: WorkerRequest): void; pump(deadline: number): void } }
const internals = (s: TerrainStreamer) => s as unknown as Internals
const material = new MeshBasicMaterial()
const streamers: TerrainStreamer[] = []
function makeStreamer() {
  const trees = { fade: { value: [0, 0] } } as unknown as TreeResources
  const s = new TerrainStreamer(WORLD_QUALITY.low, material, trees, () => {})
  streamers.push(s)
  return s
}
const workerDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'Worker')
const selfDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'self')
const unhandled: unknown[] = []
const onUnhandled = (error: unknown) => unhandled.push(error)
process.on('unhandledRejection', onUnhandled)
try {
  Object.defineProperty(globalThis, 'Worker', { configurable: true, writable: true, value: FakeWorker })
  const streamer = makeStreamer()
  const worker = FakeWorker.instances.at(-1)!
  let resolutions = 0
  const started = streamer.whenStarted()
  assert.equal(started, streamer.whenStarted(), 'startup must return the backend promise itself')
  void started.then(() => { resolutions++ })
  await Promise.resolve()
  assert.equal(resolutions, 0, 'constructing a worker is not boot completion')

  // Execute the real worker module with a CPU scope. Import is deferred until self exists.
  const posted: { message: Result; transfer: Transferable[] }[] = []
  const scope = {
    onmessage: null as ((event: { data: WorkerRequest }) => void) | null,
    postMessage(message: Result, transfer: Transferable[]) {
      assert.equal(typeof scope.onmessage, 'function', 'handler must exist before ready is posted')
      posted.push({ message, transfer })
    },
  }
  Object.defineProperty(globalThis, 'self', { configurable: true, writable: true, value: scope })
  await import('./src/render/world/terrain-worker')
  assert.equal(posted.length, 1, 'worker module must send exactly one startup handshake')
  assert.deepEqual(posted[0], { message: { type: 'ready' }, transfer: [] })

  streamer.update(new Vector3(4000, 900, 4000), 0)
  const jobs = streamer.debugJobs()
  assert.equal(jobs.length, WORLD_QUALITY.low.inflight, 'normal nearest jobs must still dispatch before ready')
  assert.equal(worker.requests.length, jobs.length)
  assert.equal(streamer.ready(), false, 'outstanding nearest terrain must not be ready')
  const request = worker.requests[0]
  assert.equal(request.type, 'cluster')
  scope.onmessage!({ data: request })
  const result = posted.at(-1)!
  assert.equal(result.message.type, request.type)
  assert.equal(result.message.id, request.id)
  worker.emit(result.message)
  await Promise.resolve()
  assert.equal(resolutions, 0, 'a normal generation result must NOT count as startup')
  for (let i = 0; i < 20 && streamer.debugJobs().some(j => j.id === request.id); i++) {
    streamer.update(new Vector3(4000, 900, 4000), 0)
  }
  assert(!streamer.debugJobs().some(j => j.id === request.id), 'normal result must retire its job')
  assert(streamer.terrainRoot.children.length > 0, 'normal result must still install its geometry')

  // All result kinds still pass through unchanged, rather than entering the ready branch.
  for (const req of [
    { type: 'trees', id: 10001, cx: 0, cz: 0, max: 1 },
    { type: 'shore', id: 10002, z0: 0, z1: 1 },
  ] satisfies WorkerRequest[]) {
    scope.onmessage!({ data: req })
    const reply = posted.at(-1)!.message
    worker.emit(reply)
    assert.equal(internals(streamer).results.at(-1), reply)
  }
  worker.emit(posted[0].message)
  await started
  assert.equal(resolutions, 1)
  const queued = internals(streamer).results.length
  worker.emit({ type: 'ready' })
  worker.error('late failure')
  await Promise.resolve()
  assert.equal(resolutions, 1, 'startup settles once')
  assert.equal(internals(streamer).results.length, queued, 'ready must not enter the result queue')
  assert.equal(streamer.ready(), false, 'boot completion must not grant world readiness')
  streamer.dispose()
  assert(worker.terminated)
  assert.equal(worker.onmessage, null)
  assert.equal(worker.onerror, null)
  assert.equal(internals(streamer).results.length, 0)

  const failed = makeStreamer()
  const failedWorker = FakeWorker.instances.at(-1)!
  failedWorker.error('module import failed')
  // Wait a turn before observing: optional callers must not cause an unhandled rejection.
  await new Promise(resolve => setImmediate(resolve))
  await assert.rejects(failed.whenStarted(), /Terrain worker startup failed: module import failed/)
  failedWorker.emit({ type: 'ready' })
  await assert.rejects(failed.whenStarted(), /module import failed/)
  failed.dispose()
  assert(failedWorker.terminated)

  const cancelled = makeStreamer()
  const cancelledWorker = FakeWorker.instances.at(-1)!
  cancelled.dispose()
  await assert.rejects(cancelled.whenStarted(), /disposed before startup/)
  assert(cancelledWorker.terminated)

  // No Worker and synchronous construction failure retain the existing fallback queue/pump.
  for (const value of [undefined, class { constructor() { throw new Error('worker blocked') } }]) {
    Object.defineProperty(globalThis, 'Worker', { configurable: true, writable: true, value })
    const fallback = makeStreamer()
    await fallback.whenStarted()
    const { backend, results } = internals(fallback)
    backend.post({ type: 'shore', id: 1, z0: 0, z1: 1 })
    assert.equal(results.length, 0, 'fallback startup must not execute queued generation')
    backend.pump(0)
    assert.equal(results.length, 0, 'expired pump deadline must preserve queued work')
    backend.pump(performance.now() + 1000)
    assert.equal(results.length, 1)
    assert.equal(results[0].type, 'shore')
    backend.post({ type: 'shore', id: 2, z0: 1, z1: 2 })
    fallback.dispose()
    backend.pump(performance.now() + 1000)
    assert.equal(results.length, 0, 'dispose must clear queued fallback work and results')
  }
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(unhandled, [])
  console.log('PASS CPU: real worker module posts ready after handler registration; startup pending until ready, normal results preserved, one settlement, error/dispose rejection, no unhandled rejection, queued bounded fallback pump/dispose')
  console.log('LIMIT: fake transport and CPU scope; no browser worker boot timing, scene timer, GPU, hardware or gameplay acceptance')
} finally {
  for (const streamer of streamers) streamer.dispose()
  material.dispose()
  if (workerDescriptor) Object.defineProperty(globalThis, 'Worker', workerDescriptor)
  else Reflect.deleteProperty(globalThis, 'Worker')
  if (selfDescriptor) Object.defineProperty(globalThis, 'self', selfDescriptor)
  else Reflect.deleteProperty(globalThis, 'self')
  process.off('unhandledRejection', onUnhandled)
}
