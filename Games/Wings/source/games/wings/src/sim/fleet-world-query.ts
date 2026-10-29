import type { WorldQuery } from "./types"

/** Overlay fitted FC hulls, never replacing terrain, launch decks or the base context. */
export function withFleetSurface(base: WorldQuery, heightAt?: (x: number, z: number) => number | null): WorldQuery {
  if (!heightAt) return base
  const height = (x: number, z: number) => {
    const h = heightAt(x, z)
    return h !== null && Number.isFinite(h) ? h : -Infinity
  }
  const above = (x: number, z: number) => height(x, z) > base.groundHeight(x, z)
  // ponytail: native vertical heightfield contact, not full wing/under-deck sweeps.
  // FC escorts are collision surfaces, not serviced runways or moving launch decks.
  return { ...base,
    groundHeight: (x, z) => Math.max(base.groundHeight(x, z), height(x, z)),
    onRunway: (x, z) => !above(x, z) && base.onRunway(x, z),
    isWater: (x, z) => !above(x, z) && (base.isWater?.(x, z) ?? base.groundHeight(x, z) <= 0),
    deckVelocity: (x, z) => above(x, z) ? null : base.deckVelocity?.(x, z) ?? null,
  }
}
