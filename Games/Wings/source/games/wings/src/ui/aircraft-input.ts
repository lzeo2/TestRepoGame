import type { AircraftView } from "../render/aircraft"
import type { SeatIndex, SeatInput } from "../sim/types"

/** Write a complete local-input frame so old seats never retain their last trigger. */
export function syncAircraftInput(
  view: Pick<AircraftView, "setFiring" | "setBoost">,
  seat: SeatIndex | null,
  input: Pick<SeatInput, "firePrimary" | "fireSecondary"> | null,
  pilotBoost: boolean,
): void {
  view.setFiring(0, 0, seat === 0 && !!input?.firePrimary)
  view.setFiring(0, 1, seat === 0 && !!input?.fireSecondary)
  view.setFiring(1, 0, seat === 1 && !!input?.firePrimary)
  view.setFiring(1, 1, seat === 1 && !!input?.fireSecondary)
  view.setBoost(seat === 0 && input !== null ? pilotBoost : null)
}
