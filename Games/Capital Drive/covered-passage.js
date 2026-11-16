// Original architectural interpretation of the pinned OSM covered Bunda passage.
// Only this layer-1 Centre outline is opened; other elevated tags retain walls.
export function coveredCentrePassage(map) {
  const building=(map.buildings||[]).find(b=>b.id==='osm-46081156');
  const road=(map.roads||[]).find(r=>r.sourceId==='way/347384260'&&r.sourceTags?.covered==='yes');
  if(!building?.points?.length||building.type!=='commercial'||Number(building.sourceTags?.layer)!==1||!road?.points?.length||
    (map.collisionReplacedBuildingIds||[]).includes(building.id)) return null;
  const a=road.points[0],b=road.points.at(-1),length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  if(length<1) return null;
  const tx=(b[0]-a[0])/length,tz=(b[1]-a[1])/length,halfWidth=(Number(road.width)||7.5)/2+4;
  const along=p=>(p[0]-a[0])*tx+(p[1]-a[1])*tz;
  const across=p=>-(p[0]-a[0])*tz+(p[1]-a[1])*tx;
  // Include only the two source-adjacent Bunda approaches: the source outline
  // also overlaps their ground corridor, beyond the covered way's facade nodes.
  const corridorPoints=[...road.points,...(map.roads||[]).filter(r=>['way/380074148','way/701312042'].includes(r.sourceId)).flatMap(r=>r.points||[])];
  const minAlong=Math.min(...corridorPoints.map(along))-5,maxAlong=Math.max(...corridorPoints.map(along))+5;
  const planes=[p=>along(p)-minAlong,p=>maxAlong-along(p),p=>across(p)+halfWidth,p=>halfWidth-across(p)];
  function clip(points,plane,positive) {
    const result=[];
    for(let i=0;i<points.length;i++) {
      const a=points[i],b=points[(i+1)%points.length],da=plane(a),db=plane(b),ina=positive?da>=0:da<=0,inb=positive?db>=0:db<=0;
      if(ina) result.push(a);
      if(ina!==inb) {const t=da/(da-db);result.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
    }
    return result;
  }
  let remaining=building.points;const groundParts=[];
  for(const plane of planes) {
    const points=clip(remaining,plane,false);
    const area=Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2;
    if(points.length>=3&&area>0.01) groundParts.push({...building,points,innerRings:[]});
    remaining=clip(remaining,plane,true);
  }
  return {building,road,groundParts,clearance:4.8,halfWidth,a,b,tx,tz,length,minAlong,maxAlong};
}
