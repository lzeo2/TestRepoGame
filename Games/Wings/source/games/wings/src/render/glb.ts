import { LoaderUtils } from "three"
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"

// ponytail: default local loaders; forward transport/manager options if a caller configures them.
export async function loadGlb(loader: GLTFLoader, url: string) {
  const response = await fetch(url)
  if (response.status !== 200 && response.status !== 0) {
    throw new Error(`fetch for "${response.url}" responded with ${response.status}: ${response.statusText}`)
  }
  const bytes = await response.arrayBuffer()
  return loader.parseAsync(bytes, LoaderUtils.extractUrlBase(url))
}
