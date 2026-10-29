// Node-only actual-GLB loader fixture. PNG dimensions are not decoded/rendered texels.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { VEHICLES, VEHICLE_KINDS } from './src/sim/vehicles'

export function installModelFixture(models: string): () => void {
  const saved = { fetch: globalThis.fetch, ProgressEvent: globalThis.ProgressEvent,
    self: globalThis.self, createImageBitmap: globalThis.createImageBitmap }
  globalThis.self = globalThis as any
  globalThis.ProgressEvent = class extends Event {
    constructor(type: string, init: any) { super(type); Object.assign(this, init) }
  } as any
  globalThis.createImageBitmap = (async (blob: Blob) => {
    const bytes = Buffer.from(await blob.arrayBuffer())
    assert.deepEqual(bytes.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20)
    assert(width > 0 && height > 0)
    return { width, height, close() {} }
  }) as any
  globalThis.fetch = async (input: any) => {
    const url = new URL(typeof input === 'string' ? input : input.url, 'http://wings.invalid/')
    if (url.protocol === 'blob:') return saved.fetch(input)
    assert.equal(url.origin, 'http://wings.invalid')
    assert(VEHICLE_KINDS.some(kind => `/${VEHICLES[kind].model}` === url.pathname), url.pathname)
    const bytes = readFileSync(resolve(models, url.pathname.slice('/models/'.length)))
    return new Response(bytes, { headers: { 'Content-Length': String(bytes.length) } })
  }
  return () => { Object.assign(globalThis, saved) }
}
