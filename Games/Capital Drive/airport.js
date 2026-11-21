import {applyMapExpansion} from './map-expansion.js';
import {createTerrainSampler} from './terrain.js';

// The existing source terrain remains authoritative west of its original edge.
// Only new eastern land receives an explicitly estimated approach/apron grid.
export function applyAirport(map, snapshot, elevation = null) {
  if (!snapshot?.airport || !snapshot.roads?.length) return map;
  if (map.airport) return map;
  const seam=map.bounds.maxX,source=createTerrainSampler(map),estimate=snapshot.airport.groundEstimate;
  const merged=applyMapExpansion(map,snapshot),cols=65;
  const dz=(map.terrain.maxZ-map.terrain.minZ)/(map.terrain.rows-1);
  const minZ=map.terrain.minZ-Math.ceil((map.terrain.minZ-snapshot.bounds.minZ)/dz)*dz;
  const rows=Math.ceil((snapshot.bounds.maxZ-minZ)/dz)+1;
  const grid={minX:seam,maxX:merged.bounds.maxX,minZ,maxZ:minZ+(rows-1)*dz,cols,rows,heights:[],estimated:true,
    preserveWestEdge:true,
    source:'OSM airport ele=575; uniform apron and approach interpolation are authored estimates',
    verticalDatum:'OSM elevation datum unverified; assumed compatible with existing 550m offset',heightOffsetMetres:550};
  const raw=elevation?.terrain;
  const surveyed=raw?.heights?.length===raw?.cols*raw?.rows&&raw.cols>1&&raw.rows>1;
  const airportSource=surveyed?createTerrainSampler({terrain:raw}):null;
  if(surveyed)Object.assign(grid,{estimated:false,source:raw.source,sourceUrl:raw.sourceUrl,sourceSha256:raw.sourceSha256,
    verticalDatum:raw.verticalDatum,nativeContourIntervalMetres:raw.nativeContourIntervalMetres,
    note:'Source contour interpolation with authored smooth seam and runway grading, not surveyed pavement elevations.'});
  const runways=(snapshot.airport.surfaces||[]).filter(s=>s.kind==='runway'&&!s.closed);
  function airportHeight(x,z) {
    let height=airportSource.groundHeightAt(x,z);
    for(const runway of runways)for(let i=1;i<runway.points.length;i++) {
      const a=runway.points[i-1],b=runway.points[i],dx=b[0]-a[0],dz=b[1]-a[1],lengthSquared=dx*dx+dz*dz;
      const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(lengthSquared||1)));
      const distance=Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz),half=runway.width/2;
      const weight=Math.max(0,Math.min(1,(half+45-distance)/45));
      const smooth=weight*weight*(3-2*weight);
      const grade=airportSource.groundHeightAt(...a)*(1-t)+airportSource.groundHeightAt(...b)*t;
      height=height*(1-smooth)+grade*smooth;
    }
    return height;
  }
  for(let z=0;z<rows;z++)for(let x=0;x<cols;x++) {
    const wx=grid.minX+(grid.maxX-grid.minX)*x/(cols-1),wz=grid.minZ+(grid.maxZ-grid.minZ)*z/(rows-1);
    const t=Math.min(1,Math.max(0,(wx-seam)/(surveyed?350:estimate.blendMetres))),smooth=t*t*(3-2*t);
    grid.heights.push(source.groundHeightAt(seam,wz)*(1-smooth)+(surveyed?airportHeight(wx,wz):estimate.relativeHeight)*smooth);
  }
  return {...merged,terrainRequirements:map.terrainRequirements,terrainTiles:[grid,...(map.terrainTiles||[])],airport:snapshot.airport,
    airportSource:snapshot.meta,airportTerrain:grid,
    landmarkBuildingIds:[...(map.landmarkBuildingIds||[]),snapshot.airport.terminalBuildingId],
    landmarkTreeExclusions:[...(map.landmarkTreeExclusions||[]),snapshot.airport.aerodrome.points]};
}
