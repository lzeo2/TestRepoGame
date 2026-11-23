const cacheProps = [
  [-7, -4, 3.8, 1.1, 1.35, .16, 'barrier'],
  [7, 3, 3.6, 1.2, 1.3, -.24, 'barrier'],
  [5, -8, 2.1, 2.3, 1.65, .28, 'crate'],
  [-5, 7, 2.4, 1.9, 1.7, -.38, 'crate'],
];
const safeProps = [
  [-5, 1, 3.8, 1.05, 1.35, .22, 'barrier'],
  [6, -3, 2.4, 2.1, 1.65, -.34, 'crate'],
];

// Place cover beside objectives with open routes through each cluster.
export function createSkylineCover(layout, {heightAt, canOccupy, nearestRoad}) {
  const positions = [...layout.searches.map(point=>({point,parts:cacheProps})),{point:layout.safe,parts:safeProps}];
  return positions.flatMap(({point,parts})=>parts.flatMap(([side,depth,width,length,height,angle,kind],i)=>{
    const heading=point.yaw+i*.06,c=Math.cos(heading),s=Math.sin(heading);
    const x=point.x+c*side+s*depth,z=point.z-s*side+c*depth,yaw=heading+angle,y=heightAt(x,z);
    if(!Number.isFinite(y)||!canOccupy({x,z,yaw},{length,width}))return [];
    const road=nearestRoad(x,z);
    if(road&&road.distance<9+Math.hypot(width,length)/2)return [];
    const cos=Math.cos(yaw),sin=Math.sin(yaw);
    const points=[[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(([u,v])=>[
      x+(u*width*cos+v*length*sin)/2,z+(-u*width*sin+v*length*cos)/2,
    ]);
    return [{id:`${point.id}-cover-${i}`,kind,x,z,y,yaw,width,length,height,points,destructible:true}];
  }));
}
