// Original fictional stunt equipment, separate from all source geography.
const inside=(x,z,ring)=>{let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
const distance=(p,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz);};

/** Six bounded park placements. The entire approach/landing corridor is checked
 * against mapped buildings, roads and water. Public park classification is a
 * source hint, never permission or evidence of real-world stunt facilities. */
export function createStuntRamps(map,terrain) {
  const ramps=[];
  const boxed=items=>items.map(item=>({item,minX:Math.min(...item.points.map(p=>p[0])),maxX:Math.max(...item.points.map(p=>p[0])),minZ:Math.min(...item.points.map(p=>p[1])),maxZ:Math.max(...item.points.map(p=>p[1]))}));
  const buildingBounds=boxed(map.buildings||[]),roadBounds=boxed(map.roads||[]),waterBounds=boxed((map.areas||[]).filter(a=>a.type==='water'));
  for(const area of map.areas||[]) {
    if(area.type!=='park'||area.sourceTags?.access==='private'||!area.points?.length)continue;
    const xs=area.points.map(p=>p[0]),zs=area.points.map(p=>p[1]);
    const x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2;
    if(ramps.some(r=>Math.hypot(r.x-x,r.z-z)<650))continue;
    // A finite 120m by 18m corridor includes run-up and landing room.
    const nearby=items=>items.filter(b=>b.minX<x+150&&b.maxX>x-150&&b.minZ<z+150&&b.maxZ>z-150).map(b=>b.item);
    const buildings=nearby(buildingBounds),roads=nearby(roadBounds),water=nearby(waterBounds);
    let clear=true;
    for(let along=-45;along<=75&&clear;along+=5)for(let across=-9;across<=9;across+=3) {
      const p=[x+across,z+along];
      if(!inside(...p,area.points)){clear=false;break;}
      if(buildings.some(b=>inside(...p,b.points)||b.points.some((a,i)=>distance(p,a,b.points[(i+1)%b.points.length])<6))||
         roads.some(r=>r.points.slice(1).some((b,i)=>distance(p,r.points[i],b)<(Number(r.width)||8)/2+6))||
         water.some(a=>inside(...p,a.points))){clear=false;break;}
    }
    if(!clear)continue;
    const base=terrain.groundHeightAt(x,z),height=3.2,length=18,width=9;
    if(Math.abs(terrain.groundHeightAt(x,z+75)-base)>4||Math.abs(terrain.groundHeightAt(x,z-45)-base)>4)continue;
    const vertices=[[-width/2,0],[width/2,0],[width/2,length],[-width/2,length]].map(([dx,dz])=>[x+dx,base+height*dz/length,z+dz]);
    ramps.push(Object.freeze({id:`stunt-${ramps.length+1}`,x,z,width,length,height,base,sourceAreaId:String(area.id),fictional:true,vertices:Object.freeze(vertices.map(Object.freeze))}));
    if(ramps.length===6)break;
  }
  function supportAt(pose) {
    for(const r of ramps)if(Math.abs(pose.x-r.x)<=r.width/2&&pose.z>=r.z&&pose.z<=r.z+r.length) {
      const y=r.base+r.height*(pose.z-r.z)/r.length;
      return {id:r.id,height:y,slopeX:0,slopeZ:r.height/r.length};
    }
    return null;
  }
  return {ramps:Object.freeze(ramps),supportAt,heightAt(x,z){return supportAt({x,z})?.height??null;}};
}
