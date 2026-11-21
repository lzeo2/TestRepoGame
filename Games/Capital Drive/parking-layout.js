import {roadProfile} from './road-network.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function distance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);}
// Decorative vehicles must have room beside the same lanes used by actual traffic.
export function generateParkedCars(map,{isClear=()=>true}={}){
 const cells=new Map(),size=48,roads=map.roads||[],cars=[],parkedCells=new Map();
 const cell=(x,z)=>`${Math.floor(x/size)},${Math.floor(z/size)}`;
 for(const road of roads){
  const profile=roadProfile(road);if(!profile.trafficAllowed)continue;
  for(let i=1;i<road.points.length;i++){
   const a=road.points[i-1],b=road.points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.1)continue;
   const offset=Math.min(profile.driveWidth*.23,3.2),nx=-dz/len,nz=dx/len;
   for(const side of [-1,1]){const lane={a:[a[0]+nx*offset*side,a[1]+nz*offset*side],b:[b[0]+nx*offset*side,b[1]+nz*offset*side]};
    for(let x=Math.floor((Math.min(a[0],b[0])-9)/size);x<=Math.floor((Math.max(a[0],b[0])+9)/size);x++)for(let z=Math.floor((Math.min(a[1],b[1])-9)/size);z<=Math.floor((Math.max(a[1],b[1])+9)/size);z++){
     const key=`${x},${z}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(lane);
    }
   }
  }
 }
 const clear=car=>{
  if(![car.x,car.z,car.yaw].every(Number.isFinite))return false;
  const b=map.bounds;if(b&&(car.x<b.minX+3||car.x>b.maxX-3||car.z<b.minZ+3||car.z>b.maxZ-3))return false;
  for(const t of [-2.2,0,2.2]){const x=car.x-Math.sin(car.yaw)*t,z=car.z-Math.cos(car.yaw)*t;
   if((cells.get(cell(x,z))||[]).some(lane=>distance(x,z,lane.a,lane.b)<2.55))return false;
  }
  for(let x=Math.floor(car.x/size)-1;x<=Math.floor(car.x/size)+1;x++)for(let z=Math.floor(car.z/size)-1;z<=Math.floor(car.z/size)+1;z++)if((parkedCells.get(`${x},${z}`)||[]).some(p=>Math.hypot(p.x-car.x,p.z-car.z)<6))return false;
  return isClear(car.x,car.z,2.6,car)!==false;
 };
 const add=car=>{if(!clear(car))return false;cars.push(car);const key=cell(car.x,car.z);if(!parkedCells.has(key))parkedCells.set(key,[]);parkedCells.get(key).push(car);return true;};
 let seed=731,serial=0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const palette=[0xe0e0d9,0xb9bdbb,0x72797b,0x344650,0x3d4843,0x934e40];
 for(const road of roads){
  const p=roadProfile(road),tags=road.sourceTags||{},parking=tags.service==='parking_aisle'||road.service==='parking_aisle';
  if(['private','no'].includes(tags.access)||['private','no'].includes(tags.motor_vehicle))continue;
  if(!parking&&(!road.name||!['residential','tertiary','unclassified'].includes(road.type)))continue;
  const offset=parking?p.driveWidth/2+1.25:p.driveWidth/2-.8;
  if(!parking&&(!p.trafficAllowed||offset-Math.min(p.driveWidth*.23,3.2)<2.55))continue;
  let along=12+random()*24;
  for(let i=1;i<road.points.length;i++){
   const a=road.points[i-1],b=road.points[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
   if(length<.1)continue;
   while(along<length-7){
    const side=random()<.5?1:-1,x=a[0]+dx*along/length+dz/length*offset*side,z=a[1]+dz*along/length-dx/length*offset*side,suv=random()<.43;
    add({id:`parked:${serial++}`,x,z,yaw:Math.atan2(-dx,-dz)+(side<0?Math.PI:0),suv,modelId:suv?'gravel':serial%4===0?'orchard':'lantern',color:palette[Math.floor(random()*palette.length)],sourceRoadId:road.sourceId||road.id,parkingType:parking?'source-parking-aisle':'wide-curb'});
    along+=parking?22+random()*25:90+random()*90;
   }
   along=Math.max(8,along-length);
  }
 }
 // The fictional recovery-job car stays near its original meeting point, off live lanes.
 const anchor={x:-298,z:-325.27};let mission=null;
 for(let r=3;r<=18&&!mission;r+=1.5)for(let i=0;i<32&&!mission;i++){
  const yaw=i*Math.PI/16,car={id:'mission-wagon',x:anchor.x+Math.cos(yaw)*r,z:anchor.z+Math.sin(yaw)*r,yaw:map.spawn?.yaw||0,suv:false,modelId:'orchard',color:0x394956,parkingType:'fictional-job'};
  if(add(car))mission=car;
 }
 return cars;
}
