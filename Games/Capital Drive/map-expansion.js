// Snapshot composition only. Terrain and bridge deck integration are separate
// consumers of the explicit source requirements carried by the northern overlay.
function pointKey(point) {
  return `${point[0]},${point[1]}`;
}

export function expansionPlaces(map){
  const sites=[['commonwealth-bridge','Commonwealth Avenue Bridge','way/4878920'],['kings-bridge','Kings Avenue Bridge','way/4878927']];
  const places=[];
  for(const [id,name,sourceId] of sites){
    const road=map.roads.find(r=>r.sourceId===sourceId);
    if(!road)continue;
    const lengths=road.points.slice(1).map((p,i)=>Math.hypot(p[0]-road.points[i][0],p[1]-road.points[i][1]));
    let remaining=lengths.reduce((a,b)=>a+b,0)/2;
    for(let i=0;i<lengths.length;i++){
      if(remaining>lengths[i]){remaining-=lengths[i];continue;}
      const a=road.points[i],b=road.points[i+1],t=remaining/(lengths[i]||1);
      places.push({id,name,x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,radius:90,sourceId,description:'Public bridge viewpoint on the mapped road.'});break;
    }
  }
  const bridge=places.find(p=>p.id==='commonwealth-bridge');
  if(bridge)places.push({...bridge,id:'lake-burley-griffin',name:'Lake Burley Griffin',radius:230,description:'Lake viewpoint from Commonwealth Avenue Bridge.'});
  return places;
}

function segmentKey(road, index) {
  const a = pointKey(road.points[index]), b = pointKey(road.points[index + 1]);
  // Exact coordinates also catch a duplicated OSM way under another source ID.
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function footprintKey(points = []) {
  const ring = points.map(pointKey);
  if (ring.length > 1 && ring[0] === ring.at(-1)) ring.pop();
  if (!ring.length) return '';
  // Canonical rotation and winding deduplicate identical closed footprints.
  const first = ring.reduce((best, point, i) => point < ring[best] ? i : best, 0);
  const forward = ring.slice(first).concat(ring.slice(0, first));
  const reverse = [forward[0], ...forward.slice(1).reverse()];
  return [forward.join('|'), reverse.join('|')].sort()[0];
}

export function applyMapExpansion(base, north = {}) {
  if (!north.roads?.length) return base;
  if (JSON.stringify(base.meta?.origin) !== JSON.stringify(north.meta?.origin)) {
    throw new Error('Map expansion projection origin differs from base snapshot');
  }
  const sourceTags = new Map(north.roads.map(road => [road.sourceId, road.sourceTags]));
  const roads = base.roads.map(road => {
    const sourceId = road.sourceId || `way/${String(road.id).split('-')[0]}`;
    const tags = sourceTags.get(sourceId);
    return tags ? { ...road, sourceId, sourceTags: { ...road.sourceTags, ...tags } } : road;
  });
  const segments = new Set();
  for (const road of roads) for (let i = 0; i < road.points.length - 1; i++) segments.add(segmentKey(road, i));
  const ids = new Set(roads.map(road => String(road.id)));
  let addedSegments = 0;
  for (const road of north.roads) {
    let start = -1;
    function append(end) {
      if (start < 0) return;
      let id = road.id;
      if (start !== 0 || end !== road.points.length - 1 || ids.has(String(id))) id = `${road.id}:segment-${start}-${end}`;
      while (ids.has(String(id))) id += ':north';
      ids.add(String(id));
      roads.push({ ...road, id, points: road.points.slice(start, end + 1), nodes: road.nodes?.slice(start, end + 1) });
      start = -1;
    }
    for (let i = 0; i < road.points.length - 1; i++) {
      const key = segmentKey(road, i);
      if (segments.has(key)) {
        append(i);
      } else {
        segments.add(key);
        addedSegments++;
        if (start < 0) start = i;
      }
    }
    append(road.points.length - 1);
  }
  const buildingIds = new Set(base.buildings.map(building => String(building.id)));
  const footprints = new Set(base.buildings.map(building => footprintKey(building.points)));
  // Source-paired intersections are precomputed by the developer importer.
  // A suppression cannot hide an outline when its retained base body is absent.
  const overlapSuppressions = new Map((north.meta?.buildingOverlap?.suppressions || [])
    .filter(record => record.pairs.some(pair => buildingIds.has(String(pair.baseId))))
    .map(record => [record.northId, record.sourceId]));
  const buildings = [...base.buildings];
  let overlapSuppressedBuildings = 0;
  for (const building of north.buildings || []) {
    const key = footprintKey(building.points);
    if (buildingIds.has(String(building.id)) || footprints.has(key)) continue;
    if (overlapSuppressions.get(building.id) === building.sourceId && overlapSuppressions.has(building.id)) {
      overlapSuppressedBuildings++;
      continue;
    }
    buildingIds.add(String(building.id)); footprints.add(key); buildings.push(building);
  }
  // An old constituent shoreline must not coexist with its full multipolygon.
  const waterWayIds = new Set((north.areas || []).flatMap(area => [...(area.sourceWayIds || []),
    ...(area.innerRings || []).flatMap(ring => ring.sourceWayIds || [])]).map(String));
  const areas = base.areas.filter(area => !waterWayIds.has(String(area.id)));
  const areaKeys = new Set(areas.map(area => `${area.type}:${footprintKey(area.points)}`));
  const areaIds = new Set(areas.map(area => String(area.id)));
  for (const area of north.areas || []) {
    const key = `${area.type}:${footprintKey(area.points)}`;
    if (areaIds.has(String(area.id)) || areaKeys.has(key)) continue;
    areaKeys.add(key); areaIds.add(String(area.id)); areas.push(area);
  }
  const landmarks = [...base.landmarks], landmarkIds = new Set(landmarks.map(place => place.id));
  for (const place of north.landmarks || []) if (!landmarkIds.has(place.id)) {
    landmarks.push(place); landmarkIds.add(place.id);
  }
  const bounds = { ...base.bounds };
  for (const key of ['minX', 'minZ']) bounds[key] = Math.min(bounds[key], north.bounds[key]);
  for (const key of ['maxX', 'maxZ']) bounds[key] = Math.max(bounds[key], north.bounds[key]);
  return { ...base, bounds, roads, buildings, areas, landmarks,
    terrainRequirements: north.terrainRequirements,
    mapExpansion: { source: north.meta, addedSegments, addedBuildings: buildings.length - base.buildings.length, overlapSuppressedBuildings },
  };
}
