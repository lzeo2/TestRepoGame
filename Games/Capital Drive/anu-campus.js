import {ANU_CAMPUS} from './anu-campus-data.js';

// Source guard: a campus facade may only replace its already retained footprint.
// This supplements the existing Civic map; it never adds roads, terrain or bodies.
export function applyAnuCampus(map) {
  if(JSON.stringify(map.meta?.origin)!==JSON.stringify(ANU_CAMPUS.meta.origin))throw new Error('ANU projection differs');
  if(map.anuCampus)return map;
  const buildings=new Map((map.buildings||[]).map(b=>[b.sourceId,b]));
  const places=ANU_CAMPUS.places.map(place=>{
    if(!place.design)return {...place};
    const building=buildings.get(place.sourceId);
    if(!building||building.id!==place.buildingId)throw new Error(`Missing retained ANU footprint: ${place.sourceId}`);
    return {...place};
  });
  const prior=new Set((map.landmarks||[]).map(p=>p.id));
  const art=new Set(map.landmarkBuildingIds||[]);
  for(const p of places)if(p.design)art.add(p.buildingId);
  return {...map,landmarks:[...(map.landmarks||[]),...places.filter(p=>!prior.has(p.id))],
    // Keep campus facades within the existing renderer cap by placing them first.
    regionalPlaces:[...places.filter(p=>p.design),...(map.regionalPlaces||[])],landmarkBuildingIds:[...art],
    areas:[...(map.areas||[]),ANU_CAMPUS.lawn],anuCampus:ANU_CAMPUS};
}

// Layer-one bridge deck is an explicit endpoint-terrain interpolation estimate.
// Returns null off this walking span; never changes vehicle roads or terrain.
export function anuBridgeHeightAt(x,z,heightAt) {
  const path=ANU_CAMPUS.pedestrianPaths.find(p=>p.layer===1),[a,b]=path.points;
  const dx=b[0]-a[0],dz=b[1]-a[1],length2=dx*dx+dz*dz;
  const t=((x-a[0])*dx+(z-a[1])*dz)/length2;
  if(t<0||t>1||Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t)>path.width/2)return null;
  const low=heightAt(...a),high=heightAt(...b);
  return Number.isFinite(low)&&Number.isFinite(high)?low+(high-low)*t+.06:null;
}
