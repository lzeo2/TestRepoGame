const TYPES=new Set(['house','detached','residential','apartments','terrace','semidetached_house','bungalow','cabin']);
const point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
// Source-only infill: retained roads, bounds, terrain and gameplay anchors keep
// ownership. Run after regional terrain composition, before collision indexing.
export function applyResidentialExpansion(map,supplement) {
  if(map.residentialExpansion)return map;
  const meta=supplement?.meta;
  if(meta?.license!=='ODbL-1.0'||JSON.stringify(meta.origin)!==JSON.stringify(map.meta?.origin))throw new Error('Residential source/projection differs');
  if(!Array.isArray(supplement.buildings)||supplement.buildings.length>27000)throw new Error('Residential supplement exceeds bounded source allocation');
  const regions=new Set((map.regionalExpansion||[]).map(p=>p.regionId));
  if(!meta.requiredRegionIds?.length||meta.requiredRegionIds.some(id=>!regions.has(id)))throw new Error('Residential supplement requires retained regional terrain');
  const ids=new Set(map.buildings.map(b=>String(b.id))),sources=new Set(map.buildings.map(b=>b.sourceId).filter(Boolean));
  const added=[],tiles=[map.terrain,...(map.terrainTiles||[])];let duplicates=0;
  for(const b of supplement.buildings){
    if(!/^way\/\d+$/.test(b.sourceId)||!Number.isInteger(b.sourceVersion)||b.sourceVersion<1||typeof b.sourceTimestamp!=='string'||b.sourceTags?.building!==b.type||!TYPES.has(b.type)||!Number.isFinite(b.height)||b.height<2||b.height>80||
      !Array.isArray(b.points)||b.points.length<4||b.points.length>160||!b.points.every(point)||
      b.points[0][0]!==b.points.at(-1)[0]||b.points[0][1]!==b.points.at(-1)[1])throw new Error('Invalid source residential footprint');
    if(!tiles.some(t=>t&&b.points.every(([x,z])=>x>=t.minX&&x<=t.maxX&&z>=t.minZ&&z<=t.maxZ)))throw new Error('Residential footprint is outside retained terrain');
    if(ids.has(String(b.id))||sources.has(b.sourceId)){duplicates++;continue;}
    ids.add(String(b.id));sources.add(b.sourceId);added.push(b);
  }
  return {...map,buildings:[...map.buildings,...added],residentialExpansion:{addedBuildings:added.length,duplicateSources:duplicates,
    reports:meta.reports.map(report=>({...report})),method:meta.method,limitations:meta.limitations}};
}
