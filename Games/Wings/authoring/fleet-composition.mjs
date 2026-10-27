// Original map/weather/authority/session/rig composition. No upstream host or renderer imports.
import { createMap } from './map-pack/maps.mjs';
import { createWeather } from './weather/weather.mjs';
import { createFleetSession } from './fleet-session.mjs';
import { LIMITS } from './fleet-sim.mjs';
import { createFleetRig } from './fleet-rig.mjs';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function fields(value, allowed) {
  if (!object(value) || Object.keys(value).some(key => !allowed.includes(key))) throw new TypeError('Unexpected composition fields');
}
const clone = value => structuredClone(value);

// Called by a trusted host after loading authorized, rigid model assets. Not a browser entry/game.
export function createFactionsComposition(options) {
  if (options?.mode !== 'factions') return null;
  fields(options, ['mode', 'mapId', 'seed', 'profiles', 'models', 'aircraft', 'matchMs',
    'intermissionMs', 'weather', 'host', 'THREE', 'createPresentation']);
  const { host, THREE, createPresentation } = options;
  if (!object(host) || !object(host.identity) || typeof createPresentation !== 'function' ||
      THREE?.REVISION !== '186' || (host.stepAircraft !== undefined && typeof host.stepAircraft !== 'function'))
    throw new TypeError('Trusted host, Three 0.186.0 and presentation factory required');
  if (!Array.isArray(options.models) || options.models.length > 12) throw new TypeError('Bounded prepared models required');
  const models = new Map();
  for (const model of options.models) {
    fields(model, ['id', 'descriptor', 'object']);
    if (typeof model.id !== 'string' || models.has(model.id) || !model.object?.isObject3D ||
        !model.descriptor?.objective_only || model.descriptor.player_vehicle_kind !== null)
      throw new TypeError('Unique objective-only model/descriptor required');
    model.object.traverse(node => { if (node.isSkinnedMesh) throw new TypeError('Only inspected rigid assets supported'); });
    models.set(model.id, { object: model.object, descriptor: clone(model.descriptor) });
  }
  const map = createMap(options.mapId, options.seed);
  const geometry = [...models].map(([id, model]) => ({ id, descriptor: model.descriptor }));
  const units = map.placeFleet('factions', clone(options.profiles), geometry);
  for (const unit of units) if (unit.modelId !== undefined && !models.has(unit.modelId))
    throw new TypeError('Every measured unit requires its prepared model');
  const weatherOptions = options.weather ?? {};
  fields(weatherOptions, ['version', 'seed', 'initialPreset', 'holdMs', 'transitionMs', 'tuning',
    'baseVisibility', 'minimumTransmittance']);
  const { baseVisibility, minimumTransmittance, ...sampling } = weatherOptions;
  const weather = createWeather({ ...sampling, seed: sampling.seed ?? map.seed,
    allowedPresets: map.allowedWeatherPresets() });
  const config = { mode: 'factions', arena: map.arena(), units, geometry,
    aircraft: clone(options.aircraft), matchMs: options.matchMs ?? 120000,
    intermissionMs: options.intermissionMs ?? 3000,
    weather: { config: weather.config,
      ...(baseVisibility === undefined ? {} : { baseVisibility: clone(baseVisibility) }),
      ...(minimumTransmittance === undefined ? {} : { minimumTransmittance }) } };
  const identity = host.identity;
  const stepAircraft = host.stepAircraft;
  const trustedHost = { identity, authenticate: host.authenticate, deriveAircraftAttack: host.deriveAircraftAttack,
    stepAircraft: step => {
      // This is the session's existing fixed step, not a second flight/weather clock.
      if (stepAircraft) stepAircraft(Object.freeze({ ...step, worldQuery: map.worldQuery }));
    } };
  function environment(frame, presentation) {
    if (!object(frame.environment) || frame.environment.simulationMs !== frame.tick * LIMITS.tickMs)
      throw new TypeError('Authority weather frame/clock required');
    return { ...clone(frame.environment), weather: weather.sample(frame.environment.simulationMs, presentation) };
  }
  const session = createFleetSession({ mode: 'factions', config, host: trustedHost,
    createView(principal) {
      const target = createPresentation(principal);
      const disposeTarget = typeof target?.dispose === 'function' ? target.dispose : null;
      let rig, disposed = false;
      function dispose() {
        if (disposed) return;
        disposed = true;
        try { rig?.dispose(); } finally { disposeTarget?.call(target); }
      }
      try {
        fields(target, ['parent', 'applyEnvironment', 'presentation', 'dispose']);
        if (!target.parent?.isObject3D || typeof target.applyEnvironment !== 'function' ||
            (target.dispose !== undefined && !disposeTarget))
          throw new TypeError('Host scene, environment consumer and optional cleanup required');
        const presentation = clone(target.presentation ?? {});
        weather.sample(0, presentation); // Validate preferences before allocating a rig.
        target.parent.updateWorldMatrix(true, false);
        const expected = new THREE.Matrix4().elements;
        if (target.parent.matrixWorld.elements.some((n, i) => !Number.isFinite(n) || Math.abs(n - expected[i]) > 1e-8))
          throw new TypeError('Fleet presentation must share the authority world frame');
        rig = createFleetRig(THREE, { parent: target.parent, team: principal.team });
        for (const unit of units) if (unit.modelId !== undefined) {
          const model = models.get(unit.modelId);
          // Rigid clones retain the actual mesh/PBR resources. Caller still owns those resources.
          rig.bindUnit(unit.id, model.object.clone(true), model.descriptor);
        }
        return {
          update(frame) { rig.update(frame); target.applyEnvironment(environment(frame, presentation)); },
          reset() { rig.reset(); }, dispose,
        };
      } catch (error) {
        try { dispose(); }
        catch (cleanupError) { throw new AggregateError([error, cleanupError], 'Fleet presentation setup and cleanup failed'); }
        throw error;
      }
    } });
  return Object.freeze({ ...session,
    world(actor) {
      if (actor !== identity) throw new TypeError('Trusted host identity required');
      if (session.stats().status === 'disposed') throw new Error('Composition disposed');
      // Map buffers are shared read-only by the existing map contract; never transfer/detach them.
      return map;
    },
  });
}
