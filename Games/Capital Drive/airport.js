import {applyMapExpansion} from './map-expansion.js';
import {createTerrainSampler} from './terrain.js';

// The existing source terrain remains authoritative west of its original edge.
// Only new eastern land receives an explicitly estimated approach/apron grid.
export function applyAirport(map, snapshot) {
  if (!snapshot?.airport || !snapshot.roads?.length) return map;
  if (map.airport) return map;
  const seam=map.bounds.maxX,source=createTerrainSampler(map),estimate=snapshot.airport.groundEstimate;
  const merged=applyMapExpansion(map,snapshot),cols=65;
  const dz=(map.terrain.maxZ-map.terrain.minZ)/(map.terrain.rows-1);
  const minZ=map.terrain.minZ-Math.ceil((map.terrain.minZ-snapshot.bounds.minZ)/dz)*dz;
  const rows=Math.ceil((snapshot.bounds.maxZ-minZ)/dz)+1;
  const grid={minX:seam,maxX:merged.bounds.maxX,minZ,maxZ:minZ+(rows-1)*dz,cols,rows,heights:[],estimated:true,
    source:'OSM airport ele=575; uniform apron and approach interpolation are authored estimates',
    verticalDatum:'OSM elevation datum unverified; assumed compatible with existing 550m offset',heightOffsetMetres:550};
  for(let z=0;z<rows;z++)for(let x=0;x<cols;x++) {
    const wx=grid.minX+(grid.maxX-grid.minX)*x/(cols-1),wz=grid.minZ+(grid.maxZ-grid.minZ)*z/(rows-1);
    const t=Math.min(1,Math.max(0,(wx-seam)/estimate.blendMetres)),smooth=t*t*(3-2*t);
    grid.heights.push(source.groundHeightAt(seam,wz)*(1-smooth)+estimate.relativeHeight*smooth);
  }
  return {...merged,terrainRequirements:map.terrainRequirements,terrainTiles:[grid,...(map.terrainTiles||[])],airport:snapshot.airport,
    airportSource:snapshot.meta,airportTerrain:grid,
    landmarkBuildingIds:[...(map.landmarkBuildingIds||[]),snapshot.airport.terminalBuildingId],
    landmarkTreeExclusions:[...(map.landmarkTreeExclusions||[]),snapshot.airport.aerodrome.points]};
}
