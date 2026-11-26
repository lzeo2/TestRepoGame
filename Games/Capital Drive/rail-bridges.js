// Exact bridge-tagged ways in the pinned canberra and region-north OSM packs.
export const RAIL_BRIDGE_SOURCE = [
  {"source":"way/60738385","version":9,"snapshot":"canberra","points":[[2096.91,561.5],[2028.99,509.61]],"kind":"disused"},
  {"source":"way/60738389","version":7,"snapshot":"canberra","points":[[2042.99,583.55],[2063.99,590.21]],"kind":"disused"},
  {"source":"way/60738390","version":11,"snapshot":"canberra","points":[[2028.17,514.2],[2095.4,566.12]],"kind":"rail"},
  {"source":"way/664869275","version":8,"snapshot":"region-north","points":[[619.22,-10154.64],[625.77,-10120.72]],"kind":"tram","ref":"1409"},
  {"source":"way/684739960","version":8,"snapshot":"region-north","points":[[622.71,-10120.2],[616.19,-10154.12]],"kind":"tram","ref":"1409"},
  {"source":"way/767984382","version":2,"snapshot":"region-north","points":[[1175.14,-13387.02],[1181.88,-13421.52]],"kind":"tram","ref":"1407"},
  {"source":"way/767984384","version":2,"snapshot":"region-north","points":[[1185.6,-13420.81],[1178.88,-13386.31]],"kind":"tram","ref":"1407"},
  {"source":"way/796336968","version":1,"snapshot":"canberra","points":[[2347.4,3702.04],[2343.48,3695.29]],"kind":"miniature"},
  {"source":"way/796336971","version":1,"snapshot":"canberra","points":[[2310.05,3722.35],[2314.85,3728.95]],"kind":"miniature"},
  {"source":"way/796336976","version":1,"snapshot":"canberra","points":[[2309.26,3722.83],[2314.2,3729.57]],"kind":"miniature"},
  {"source":"way/796341089","version":1,"snapshot":"canberra","points":[[2207.58,3589.71],[2206.48,3590.82],[2204.88,3592.62],[2203.48,3594.49],[2202.29,3596.64],[2201.29,3599.04],[2200.81,3600.93],[2200.37,3602.77],[2200.13,3605.16],[2200.16,3607.0],[2200.46,3609.29],[2200.96,3611.45],[2201.75,3613.5],[2202.85,3615.77],[2204.53,3618.49]],"kind":"miniature"},
  {"source":"way/796341090","version":1,"snapshot":"canberra","points":[[2202.88,3619.51],[2201.96,3618.09],[2200.62,3615.74],[2199.54,3613.5],[2198.84,3611.1],[2198.43,3608.81],[2198.21,3605.94],[2198.35,3603.47],[2198.81,3600.69],[2199.62,3597.64],[2201.05,3594.87],[2202.62,3592.41],[2204.32,3590.23],[2206.21,3588.39]],"kind":"miniature"}
];

const RAMP=90;
const APPROACH_WIDTH=3;
const CORRIDORS=[
  {ref:'1409',rise:1.65,width:6.2},
  {ref:'1407',rise:3.15,width:8.7}
];

function average(a,b) {
  return [(a[0]+b[0])/2,(a[1]+b[1])/2];
}

function section(a,b,y0,y1) {
  const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
  return {a,b,y0,y1,length,dx:dx/length,dz:dz/length};
}

// These elevations are local game estimates. Tram stock and running rail
// use the same callback so their vertical positions agree over both spans.
export function prepareRailBridges(bounds,groundHeightAt,surfaceAt=groundHeightAt) {
  const inside=([x,z])=>bounds && x>=bounds.minX && x<=bounds.maxX && z>=bounds.minZ && z<=bounds.maxZ;
  const ways=RAIL_BRIDGE_SOURCE.filter(w=>w.points.every(inside));
  const decks=[], approaches=[];
  for(const {ref,rise,width} of CORRIDORS){
    const tracks=ways.filter(w=>w.ref===ref).map(w=>w.points[0][1]<w.points[1][1]?w.points:[...w.points].reverse());
    if(tracks.length!==2)continue;
    const a=average(tracks[0][0],tracks[1][0]),b=average(tracks[0][1],tracks[1][1]);
    const y0=Math.max(...tracks.map(points=>groundHeightAt(...points[0])))+rise;
    const y1=Math.max(...tracks.map(points=>groundHeightAt(...points[1])))+rise;
    decks.push({kind:'tram',ref,width,spans:[section(a,b,y0,y1)]});
    for(const points of tracks)approaches.push(section(points[0],points[1],y0,y1));
  }
  for(const {kind,source,points} of ways){
    if(kind==='tram')continue;
    const miniature=kind==='miniature',rise=miniature?.55:.16;
    const sampled=points.map(p=>groundHeightAt(...p));
    const spans=points.slice(1).map((b,i)=>section(points[i],b,sampled[i]+rise,sampled[i+1]+rise));
    decks.push({kind,source,width:miniature?.72:kind==='disused'?2.9:3.4,spans});
  }
  function heightAt(x,z){
    let selected=null,weight=0,along=0;
    for(const s of approaches){
      const rx=x-s.a[0],rz=z-s.a[1],u=rx*s.dx+rz*s.dz,d=Math.abs(rx*s.dz-rz*s.dx);
      if(d>APPROACH_WIDTH || u < -RAMP || u > s.length+RAMP)continue;
      const w=1-Math.max(0,-u,u-s.length)/RAMP;
      if(w>weight){selected=s;weight=w;along=u;}
    }
    if(!selected)return surfaceAt(x,z);
    const t=Math.max(0,Math.min(1,along/selected.length));
    const deck=selected.y0+(selected.y1-selected.y0)*t;
    if(weight>=1)return deck;
    const terrain=surfaceAt(x,z);
    const blend=weight*weight*(3-2*weight);
    return terrain+(deck-terrain)*blend;
  }
  return {decks,heightAt};
}
