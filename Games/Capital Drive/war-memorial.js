import {WAR_MEMORIAL_DATA} from './war-memorial-data.js';

export {WAR_MEMORIAL_DATA};

// Source buildings remain in the ordinary collision owner. This only replaces
// their generic presentation, and never opens or simulates a real interior.
export function prepareWarMemorial(map) {
  if (map.warMemorial) return map;
  const site = WAR_MEMORIAL_DATA;
  const main = map.buildings?.find(building => building.sourceId === site.main.sourceId);
  if (!main) return map;
  if (JSON.stringify(main.points) !== JSON.stringify(site.main.points)) throw new Error('War Memorial source footprint changed');
  const ids = new Set(map.landmarkBuildingIds || []);
  for (const feature of [site.main, site.courtyard, site.tower, site.dome]) {
    for (const building of map.buildings) if (building.sourceId === feature.sourceId) {
      if (JSON.stringify(building.points) !== JSON.stringify(feature.points)) throw new Error('War Memorial source footprint changed');
      ids.add(building.id);
    }
  }
  const pin = {id: site.id, name: site.name, x: site.x, z: site.z, radius: site.radius,
    sourceId: site.source.relationId, buildingId: main.id,
    description: 'Mapped Australian War Memorial exterior and public forecourt.'};
  return {...map, warMemorial: site, landmarkBuildingIds: [...ids],
    landmarks: [...(map.landmarks || []).filter(place => place.id !== site.id), pin],
    landmarkTreeExclusions: [...(map.landmarkTreeExclusions || []), site.main.points,
      ...site.paved.map(feature => feature.points)]};
}
