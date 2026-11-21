// Original fictional depot, not a real defence installation or surveyed parcel.
const inside=(x,z,points)=>{let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
const distance=(p,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz);};
export function applyDefenceDepot(map) {
  if(map.defenceDepot||!map.airport)return map;
  const roads=map.roads||[],road=roads.find(r=>r.id==='5036453-airport-0');
  // Pin the proven source segment rather than searching the city at startup.
  // A changed snapshot must leave its map intact, never relocate the compound.
  const a=road?.points?.[1],b=road?.points?.[2];
  if(!a||!b||a[0]!==6014.85||a[1]!==-1307.29||b[0]!==5982.88||b[1]!==-1329.74||road.oneway||road.width!==7.5||['private','no'].includes(road.sourceTags?.access))return map;
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]),tx=(b[0]-a[0])/length,tz=(b[1]-a[1])/length;
  const nx=tz,nz=-tx,offset=(road.width||8)/2+12;
  const point=(u,v)=>[a[0]+tx*u+nx*(offset+v),a[1]+tz*u+nz*(offset+v)];
  const outline=[point(-45,0),point(45,0),point(45,100),point(-45,100)];
  const minX=Math.min(a[0],...outline.map(p=>p[0]))-10,maxX=Math.max(a[0],...outline.map(p=>p[0]))+10;
  const minZ=Math.min(a[1],...outline.map(p=>p[1]))-10,maxZ=Math.max(a[1],...outline.map(p=>p[1]))+10;
  if(!map.bounds||minX<map.bounds.minX||maxX>map.bounds.maxX||minZ<map.bounds.minZ||maxZ>map.bounds.maxZ)return map;
  const overlaps=points=>{let loX=Infinity,hiX=-Infinity,loZ=Infinity,hiZ=-Infinity;for(const p of points||[]){loX=Math.min(loX,p[0]);hiX=Math.max(hiX,p[0]);loZ=Math.min(loZ,p[1]);hiZ=Math.max(hiZ,p[1]);}return loX<=maxX&&hiX>=minX&&loZ<=maxZ&&hiZ>=minZ;};
  const obstacles=[...(map.buildings||[]),...(map.areas||[]).filter(o=>/water|park|pitch/.test(o.type||'')),...(map.airport.surfaces||[]).filter(s=>s.closed)].filter(o=>o?.points&&overlaps(o.points));
  const segments=[];
  for(const r of [...roads,...(map.airport.surfaces||[]).filter(s=>!s.closed)])for(let i=1;i<r.points.length;i++){
    const aa=r.points[i-1],bb=r.points[i],width=r.width||8;
    if(Math.max(aa[0],bb[0])+width<minX||Math.min(aa[0],bb[0])-width>maxX||Math.max(aa[1],bb[1])+width<minZ||Math.min(aa[1],bb[1])-width>maxZ)continue;
    segments.push({a:aa,b:bb,width,road:r});
  }
  for(let u=-45;u<=45;u+=5)for(let v=0;v<=100;v+=5){const p=point(u,v);if(obstacles.some(o=>inside(...p,o.points))||segments.some(s=>distance(p,s.a,s.b)<s.width/2+4))return map;}
  if(obstacles.some(o=>o.points.some(p=>inside(...p,outline))))return map;
  for(let d=0;d<=offset;d+=2){const p=[a[0]+nx*d,a[1]+nz*d];if(obstacles.some(o=>inside(...p,o.points))||segments.some(s=>s.road!==road&&distance(p,s.a,s.b)<s.width/2+4))return map;}
  const site={point,outline,connection:a,roadName:road.name||'Airport road',tx,tz,nx,nz};
  const rect=(u,v,w,d)=>[point(u-w/2,v-d/2),point(u+w/2,v-d/2),point(u+w/2,v+d/2),point(u-w/2,v+d/2)];
  const buildings=[{id:'fictional-depot-hangar-1',type:'defence_hangar',height:9,points:rect(-25,68,28,40)}, {id:'fictional-depot-hangar-2',type:'defence_hangar',height:9,points:rect(25,68,28,40)}, {id:'fictional-depot-guardhouse',type:'defence_guardhouse',height:3.2,points:rect(17,12,9,9)}];
  const fences=[[-25.5,0,39,.25],[25.5,0,39,.25],[-45,50,.25,100],[45,50,.25,100],[0,100,90,.25]].map(([u,v,w,d],i)=>({id:`fictional-depot-fence-${i}`,type:'fence',height:2.2,points:rect(u,v,w,d)}));
  const [x,z]=point(0,8),landmark={id:'capital-defence-depot',name:'Capital Defence Depot',aliases:['military base','army base','defence base','military depot'],x,z,radius:18,description:'Original fictional military vehicle depot near the airport. Public vehicle gateway.'};
  const depot={...site,buildings,fences,landmark,gate:point(0,0),gatewayWidth:12,apron:rect(0,36,80,62)};
  return {...map,defenceDepot:depot,buildings:[...(map.buildings||[]),...buildings],roads:[...roads,{id:'fictional-depot-access',name:'Capital Depot Access',type:'service',width:10,points:[site.connection,point(0,0),point(0,40)],fictional:true}],landmarks:[...(map.landmarks||[]),landmark]};
}
