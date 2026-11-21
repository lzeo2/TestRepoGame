const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createDrivingState() {
  return { nitroFuel: 1, nitroActive: false, driftActive: false, slipAngle: 0, lateralSpeed: 0, driftHold: 0 };
}

// Supplied-time arcade assists; ordinary tyre/engine tuning stays with Simulation.
export function prepareDriving(state, dt, { throttle, steer, forward, handbrake, boost, brake, airborne }) {
  const entry = handbrake && Math.abs(steer) > .15 && forward > 8 && !airborne;
  state.driftHold = entry ? .85 : Math.max(0, state.driftHold - dt);
  const sliding = state.driftHold > 0 && forward > 5 && !brake && !airborne;
  state.nitroFuel = clamp(Number.isFinite(state.nitroFuel) ? state.nitroFuel : 0, 0, 1);
  // Fuel is spent only when additional forward engine force can be applied.
  state.nitroActive = Boolean(boost && throttle > 0 && forward >= 0 && !brake && !handbrake && !airborne && state.nitroFuel >= dt / 5);
  if (state.nitroActive) state.nitroFuel = Math.max(0, state.nitroFuel - dt / 5);
  const countersteer = sliding && steer * state.lateralSpeed > .15;
  return { sliding, turnScale: sliding ? 1.5 : handbrake ? 1.42 : 1,
    lateralGrip: sliding ? countersteer ? 4 : 1.5 : handbrake ? 1.1 : null,
    handbrakeDrag: sliding ? .18 : handbrake ? .65 : 0 };
}

export function measureDriving(state, dt, { forward, lateral, boost, airborne, recharge = true }) {
  state.lateralSpeed = Number.isFinite(lateral) ? lateral : 0;
  state.slipAngle = Math.atan2(state.lateralSpeed, Math.max(.01, Math.abs(forward)));
  state.driftActive = Boolean(state.driftHold > 0 && forward > 5 && Math.abs(state.slipAngle) > .12 && !airborne);
  // Releasing boost refills in 20 seconds; an actual controlled slide doubles it.
  if (recharge && !boost) state.nitroFuel = Math.min(1, state.nitroFuel + dt * (state.driftActive ? .1 : .05));
}
