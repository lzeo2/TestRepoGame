// These replacements run only while the world streamer builds their source chunk.
export const REGIONAL_ARCHITECTURE_IDS = new Set(['osm-4970449', 'osm-663660535', 'osm-30160608']);

const upper = (p, y) => [p[0], y, p[1]];

function extent(points) {
  const xs = points.map(p => p[0]), zs = points.map(p => p[1]);
  return {left: Math.min(...xs), right: Math.max(...xs), north: Math.min(...zs), south: Math.max(...zs)};
}

function shineDome(building, {points, base, footing, lowGraphics, emitTriangle}) {
  // The source has twelve points per arch, alternating tips and recesses.
  // Subsampling the ring retains all sixteen feet and the recess between each.
  const stride = points.length === 192 ? (lowGraphics ? 3 : 2) : 1;
  const rim = points.filter((_, i) => i % stride === 0);
  const cx = rim.reduce((n, p) => n + p[0], 0) / rim.length;
  const cz = rim.reduce((n, p) => n + p[1], 0) / rim.length;
  const radius = Math.max(...rim.map(([x,z]) => Math.hypot(x-cx, z-cz)));
  const ringPoint = (p, fraction, height) => [cx+(p[0]-cx)*fraction, height, cz+(p[1]-cz)*fraction];
  const vertex = (p, fraction) => {
    const distance = Math.hypot(p[0]-cx, p[1]-cz)*fraction/radius;
    return ringPoint(p, fraction, base+.1+(building.height-.1)*(1-distance*distance));
  };
  const quad = (a,b,c,d,tint) => { emitTriangle(a,b,c,tint); emitTriangle(a,c,d,tint); };
  const copper = [0x886747,0x947454,0x907052,0x9a7a58];
  const layers = lowGraphics ? 4 : 6;
  const apex = [cx, base+building.height, cz];
  for (let i=0; i<rim.length; i++) {
    const a = rim[i], b = rim[(i+1)%rim.length];
    const finish = copper[Math.floor(i*16/rim.length)%copper.length];
    for (let j=0; j<layers; j++) {
      const outside = 1-j/layers, inside = 1-(j+1)/layers;
      const p = vertex(a,outside), q = vertex(b,outside);
      if (j===layers-1) emitTriangle(p,q,apex,finish);
      else quad(p,q,vertex(b,inside),vertex(a,inside),finish);
    }
    const p = vertex(a,1), q = vertex(b,1);
    const pi = ringPoint(a,.96,p[1]-.13), qi = ringPoint(b,.96,q[1]-.13);
    quad(p,pi,qi,q,0xc7b69c);
    // The recessed curtain wall can be seen through the open copper arches.
    const interior = (point,y,r) => {
      const factor = r/Math.hypot(point[0]-cx,point[1]-cz);
      return ringPoint(point,factor,y);
    };
    const r=radius*.745;
    const glassTop=base+building.height*.37;
    quad(interior(a,footing,r),interior(b,footing,r),interior(b,glassTop,r),interior(a,glassTop,r),
      i%4===0 ? 0x526469 : 0x3c4c4c);
    quad(interior(a,base+.03,radius*1.035),interior(b,base+.03,radius*1.035),
      interior(b,base+.03,radius*.88),interior(a,base+.03,radius*.88),0x526a68);
  }
}

// Split a concave outline into horizontal trapezoids. Vertex heights are also
// breaks, so overhanging an inlet or joining the two sides of a courtyard is avoided.
function roofPanels(points, breaks, draw) {
  const levels=[...new Set([...points.map(p=>p[1]), ...breaks])].sort((a,b)=>a-b);
  for(let j=1;j<levels.length;j++) {
    const z0=levels[j-1], z1=levels[j], mid=(z0+z1)/2;
    const crossings=[];
    for(let i=0;i<points.length;i++) {
      const a=points[i], b=points[(i+1)%points.length];
      if ((a[1]>mid)===(b[1]>mid)) continue;
      const at=z=>a[0]+(b[0]-a[0])*(z-a[1])/(b[1]-a[1]);
      crossings.push([at(z0),at(z1)]);
    }
    crossings.sort((a,b)=>(a[0]+a[1])-(b[0]+b[1]));
    for(let k=1;k<crossings.length;k+=2) {
      const [l0,l1]=crossings[k-1], [r0,r1]=crossings[k];
      if(Math.max(r0-l0,r1-l1)>.005) draw([l0,z0],[l1,z1],[r1,z1],[r0,z0],mid);
    }
  }
}

function publicShell(building, {points,base,footing,lowGraphics,emitTriangle}, arboretum) {
  const {left,right,north,south}=extent(points);
  const span=south-north;
  const innerEdge=(x,z)=>{
    const arc=Math.sin(Math.PI*(z-north)/span);
    return arboretum ? base+2.5+Math.max(0,arc)*(2.2+6.9*(x-left)/(right-left)) : base+building.height;
  };
  const roofAt=(p)=>upper(p,innerEdge(...p));
  const quad=(a,b,c,d,tint)=>{emitTriangle(a,b,c,tint);emitTriangle(a,c,d,tint);};
  const breaks=[];
  if(arboretum) for(let i=1;i<10;i++) {
    const z=north+span*i/10;
    breaks.push(z-.26,z+.26);
  }
  roofPanels(points,breaks,(a,b,c,d,mid)=>{
    const phase=(mid-north)*10/span;
    const glass=arboretum && Math.abs(phase-Math.round(phase))<.26*10/span && phase>.5 && phase<9.5;
    const tint=arboretum ? (glass ? 0x748f94 : Math.floor(phase)%2 ? 0x929e9e : 0x9ca6a6) : 0x9c9c93;
    if(c[0]-b[0]>.000001) emitTriangle(roofAt(a),roofAt(b),roofAt(c),tint);
    if(d[0]-a[0]>.000001) emitTriangle(roofAt(a),roofAt(c),roofAt(d),tint);
  });
  const ccw=points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length];return sum+a[0]*b[1]-b[0]*a[1];},0)>0;
  for(let i=0;i<points.length;i++) {
    let a=points[i], b=points[(i+1)%points.length];
    if(!ccw) [a,b]=[b,a];
    const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    if(length<.03) continue;
    const nx=dz/length,nz=-dx/length;
    const on=(u,y,depth=0)=>[a[0]+u*dx+nx*depth,y,a[1]+u*dz+nz*depth];
    const ya=innerEdge(...a),yb=innerEdge(...b);
    // Match the changing roof height at every roof-strip crossing of this wall.
    const along=[0,1];
    if(arboretum && dz!==0) for(const z of [...breaks,...points.map(p=>p[1])]) {
      const u=(z-a[1])/dz;
      if(u>.0001 && u<.9999) along.push(u);
    }
    const knots=[...new Set(along)].sort((u,v)=>u-v);
    const eastGlass=arboretum && nx>.25;
    for(let k=1;k<knots.length;k++) {
      const u=knots[k-1],v=knots[k];
      const pu=on(u,0),pv=on(v,0);
      const wallTopU=innerEdge(pu[0],pu[2]),wallTopV=innerEdge(pv[0],pv[2]);
      quad(on(u,footing),on(u,wallTopU),on(v,wallTopV),on(v,footing),eastGlass?0x516c75:arboretum?0x797c73:0xcac7b6);
      if(eastGlass) quad(on(u,wallTopU-.21,.04),on(u,wallTopU,.04),on(v,wallTopV,.04),on(v,wallTopV-.21,.04),0xac8054);
    }
    if(eastGlass && length>1.2) {
      const count=Math.max(1,Math.ceil(length/(lowGraphics?4.2:3.1)));
      for(let k=0;k<count;k++) {
        const u=(k+.5)/count, w=.075/length;
        const p=on(u,0),h=innerEdge(p[0],p[2]);
        quad(on(u-w,base),on(u-w,h,.05),on(u+w,h,.05),on(u+w,base),0x9d754f);
      }
    }
    if(!arboretum && length>6) {
      quad(on(0,ya-.27,.025),on(0,ya,.025),on(1,yb,.025),on(1,yb-.27,.025),0x858880);
    }
  }
  if (!arboretum) outletEntry(points,base,emitTriangle);
}

function outletEntry(points,base,emitTriangle) {
  // Entrance visible from the geotagged public photograph on Iron Knob St.
  const anchor=[3838.4,2127.56], next=[3850.34,2133.18];
  if(!points.some(p=>Math.hypot(p[0]-anchor[0],p[1]-anchor[1])<.1)) return;
  const dx=next[0]-anchor[0],dz=next[1]-anchor[1],length=Math.hypot(dx,dz);
  const at=(u,y,out)=>[anchor[0]+(dx*u+dz*out)/length,base+y,anchor[1]+(dz*u-dx*out)/length];
  const quad=(a,b,c,d,tint)=>{emitTriangle(a,b,c,tint);emitTriangle(a,c,d,tint);};
  quad(at(.3,.06,.045),at(.3,2.85,.045),at(length-.3,2.85,.045),at(length-.3,.06,.045),0x374447);
  for(const u of [1,3.6,6.2,8.8,11.4]) {
    quad(at(u,.08,.06),at(u,2.84,.06),at(u+.10,2.84,.06),at(u+.10,.08,.06),0x859092);
  }
  quad(at(0,3.1,0),at(0,3.1,2.35),at(length,3.1,2.35),at(length,3.1,0),0xc5c4b2);
  quad(at(0,2.82,2.35),at(0,3.1,2.35),at(length,3.1,2.35),at(length,2.82,2.35),0xdad6bf);
  quad(at(0,2.82,0),at(length,2.82,0),at(length,2.82,2.35),at(0,2.82,2.35),0x767971);
  for(const [u,tint] of [[1.4,0x716483],[5.6,0x3f899b],[10.7,0x8d485c]]) {
    const foot=[[u-.14,1.56],[u+.14,1.56],[u+.14,1.84],[u-.14,1.84]];
    for(let j=0;j<4;j++){
      const k=(j+1)%4,[a,c]=foot[j],[b,d]=foot[k];
      quad(at(a,0,c),at(a+1.15,4.35,c+.18),at(b+1.15,4.35,d+.18),at(b,0,d),tint);
    }
  }
}

export function emitRegionalArchitecture(building,options) {
  if(!REGIONAL_ARCHITECTURE_IDS.has(building.id)||options.points.length<3) return false;
  if(building.id==='osm-4970449') shineDome(building,options);
  else publicShell(building,options,building.id==='osm-663660535');
  return true;
}
