import { worldPoints, REGIONS, routeTo } from './world.js';
import { RIVALS, FINALE_STAGES } from './campaign.js';

// Read-only advice for a canonical state, not a save-import or action boundary.
export function navigationObjective(state) {
  const result = (kind, text, action, targetRegion = state.region, target = null) => ({
    kind, text, action, targetRegion, target, navigation: null
  });
  if (state.pendingBattle) return result('battle', 'Continue the current battle.', { type: 'resume-battle' });

  const points = worldPoints(state, { exploration: true });
  let goal;
  if (!state.team.some(uid => state.roster.find(c => c.uid === uid)?.hp > 0)) {
    goal = result('recover', 'Rest at Rest Camp to recover your team for free.',
      { type: 'interact', label: 'Open camp and rest', pointId: 'camp' });
  } else if (state.defeatedRivals.length < RIVALS.length) {
    const nextRegion = state.defeatedRivals.length;
    if (state.region < nextRegion) {
      const exit = points.find(point => point.id === 'exit');
      goal = result('travel', `Take ${exit.label}.`,
        { type: 'interact', label: 'Take this path', pointId: exit.id }, state.region + 1);
    } else {
      const location = points.find(point => point.id === 'rival')?.locationName;
      goal = result('trial', `Meet ${RIVALS[nextRegion].name}${location ? ` at ${location}` : ''} for trial ${nextRegion + 1}/5. Interact to preview it.`,
        { type: 'interact', label: 'Preview trial', pointId: 'rival' });
    }
  } else {
    const stage = FINALE_STAGES[state.finaleStage];
    if (stage && state.region !== stage.region) {
      return result('travel', `Travel to ${REGIONS[stage.region].name}, then meet ${stage.host} at Rest Camp.`,
        { type: 'travel', label: `Travel to ${REGIONS[stage.region].name}`, region: stage.region }, stage.region);
    }
    goal = stage
      ? result('lesson', `Meet ${stage.host} at Rest Camp for return lesson ${stage.id + 1}/3.`,
        { type: 'interact', label: 'Open camp and choose the return lesson', pointId: stage.pointId })
      : result('complete', `Campaign complete. Explore freely or preview ${RIVALS[state.region].name}'s rematch.`,
        { type: 'interact', label: 'Preview rematch', pointId: 'rival' });
  }

  // Use the live adapter's labels/coordinates, never another copy of the map.
  const point = points.find(point => point.id === goal.action.pointId);
  if (!point) throw new RangeError('Objective point is not available in the current region.');
  const locationName = point.locationName ?? point.label;
  goal.target = { id: point.id, type: point.type, label: point.label, locationName, x: point.x, z: point.z };
  const distance = Math.hypot(point.x - state.position.x, point.z - state.position.z);
  const arrived = distance <= 1.8; // Same interaction radius as nearbyPoint/challengeFor.
  const route = arrived ? [] : routeTo(state.region, state.position, point);
  let routeDistance = 0, previous = state.position;
  for (const waypoint of route) {
    routeDistance += Math.hypot(waypoint.x - previous.x, waypoint.z - previous.z);
    previous = waypoint;
  }
  const reachable = arrived || route.length > 0;
  // Match controller movement: skip waypoints within its 0.3-unit tolerance.
  const next = route.find(p => Math.hypot(p.x - state.position.x, p.z - state.position.z) > 0.3);
  const bearing = next ? Math.atan2(next.x - state.position.x, state.position.z - next.z) : null;
  const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  const direction = arrived ? 'here' : bearing === null ? null
    : directions[(Math.round(bearing / (Math.PI / 4)) + 8) % 8];
  goal.navigation = {
    distance, routeDistance: reachable ? (arrived ? 0 : routeDistance) : null,
    bearing, direction, arrived, reachable, route,
    arrivalText: arrived ? `At ${locationName}${locationName === point.label ? '' : ` · ${point.label}`}. ${goal.action.label}.` : null
  };
  return goal;
}
