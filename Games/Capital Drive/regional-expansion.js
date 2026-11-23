import {applyMapExpansion} from './map-expansion.js';

const finitePoint = point => Array.isArray(point) && point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]);
const validBounds = bounds => bounds && ['minX','minZ','maxX','maxZ'].every(key=>Number.isFinite(bounds[key])) && bounds.minX < bounds.maxX && bounds.minZ < bounds.maxZ;
function validateRegion(region,origin,seen) {
  const id=region?.meta?.regionId,tile=region?.terrain;
  if(typeof id!=='string'||!id||seen.has(id))throw new Error('Regional expansion requires unique region IDs.');
  if(JSON.stringify(region.meta.origin)!==JSON.stringify(origin))throw new Error(`Regional projection origin differs: ${id}`);
  if(!validBounds(region.bounds)||!validBounds(tile)||!Number.isInteger(tile.cols)||!Number.isInteger(tile.rows)||tile.cols<2||tile.rows<2||
    !Array.isArray(tile.heights)||tile.heights.length!==tile.cols*tile.rows||!tile.heights.every(Number.isFinite))throw new Error(`Invalid regional terrain: ${id}`);
  if(tile.minX>region.bounds.minX||tile.maxX<region.bounds.maxX||tile.minZ>region.bounds.minZ||tile.maxZ<region.bounds.maxZ)throw new Error(`Regional terrain does not cover overlay: ${id}`);
  for(const key of ['roads','buildings','areas','landmarks'])if(!Array.isArray(region[key])||(key==='roads'&&!region[key].length))throw new Error(`Invalid regional ${key}: ${id}`);
  for(const road of region.roads)if(road.id==null||!Array.isArray(road.points)||road.points.length<2||!road.points.every(finitePoint)||road.nodes&&(!Array.isArray(road.nodes)||road.nodes.length!==road.points.length))throw new Error(`Invalid regional road: ${id}`);
  for(const body of [...region.buildings,...region.areas])if(body.id==null||!Array.isArray(body.points)||body.points.length<3||!body.points.every(finitePoint))throw new Error(`Invalid regional polygon: ${id}`);
  for(const place of region.landmarks)if(typeof place.id!=='string'||!place.id||!Number.isFinite(place.x)||!Number.isFinite(place.z))throw new Error(`Invalid regional landmark: ${id}`);
  seen.add(id);
}

// Existing map composition owns source dedupe and water multipolygon replacement.
// Reuse it per zone, then restore retained road identities/tags before publication.
export function applyRegionalExpansion(base,regions) {
  if(!Array.isArray(regions))throw new TypeError('Regional expansion requires an array.');
  if(!regions.length)return base;
  const seen=new Set((base.regionalExpansion||[]).map(region=>region.regionId));
  for(const region of regions)validateRegion(region,base.meta?.origin,seen);
  let merged=base;
  const terrainTiles=[...(base.terrainTiles||[])],regionalPlaces=[...(base.regionalPlaces||[])],stats=[...(base.regionalExpansion||[])],artIds=new Set(base.landmarkBuildingIds||[]);
  const artKeys=new Set([...artIds].map(String));
  for(const region of regions) {
    const before=merged,previousPlaces=new Set(before.landmarks.map(place=>place.id)),previousAreas=new Set(before.areas.map(area=>String(area.id)));
    merged=applyMapExpansion(before,region);
    for(let i=0;i<before.roads.length;i++)merged.roads[i]=before.roads[i];
    const expansion=merged.mapExpansion,regionId=region.meta.regionId;
    const counts={regionId,title:region.meta.title||regionId,addedRoads:merged.roads.length-before.roads.length,
      addedSegments:expansion.addedSegments,addedBuildings:expansion.addedBuildings,
      addedAreas:merged.areas.filter(area=>!previousAreas.has(String(area.id))).length,
      addedLandmarks:0,promotedBuildings:0,skippedDesigns:0};
    const buildingIds=new Map(merged.buildings.map(body=>[String(body.id),body.id]));
    merged.landmarks=merged.landmarks.map(place=>{
      if(previousPlaces.has(place.id))return place;
      const copy={...place,regionId};
      if(place.design) {
        if(buildingIds.has(String(place.buildingId))) {
          const buildingId=buildingIds.get(String(place.buildingId));
          copy.buildingId=buildingId;
          if(!artKeys.has(String(buildingId))){artIds.add(buildingId);artKeys.add(String(buildingId));counts.promotedBuildings++;}
        } else {delete copy.design;counts.skippedDesigns++;}
      }
      regionalPlaces.push(copy);counts.addedLandmarks++;return copy;
    });
    terrainTiles.push({...region.terrain,blendPreviousMetres:150});stats.push(counts);
  }
  return {...merged,mapExpansion:base.mapExpansion,terrainRequirements:base.terrainRequirements,
    terrainTiles,regionalPlaces,regionalExpansion:stats,landmarkBuildingIds:[...artIds]};
}
