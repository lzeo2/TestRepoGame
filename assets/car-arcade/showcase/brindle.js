import * as THREE from '../vendor/three.module.js';

// Original fictional study, not an OEM replica or a replacement for the live fleet.
export function createCar() {
  const car = new THREE.Group();
  car.name = 'brindle-realistic';
  const paint = new THREE.MeshPhysicalMaterial({color:0x557d79, metalness:.56, roughness:.21, clearcoat:1, clearcoatRoughness:.12});
  const roof = new THREE.MeshPhysicalMaterial({color:0xe6e1d3, metalness:.46, roughness:.23, clearcoat:1});
  const glass = new THREE.MeshPhysicalMaterial({color:0xb6cbd0, metalness:0, roughness:.08, transparent:true, opacity:.28, transmission:.32, thickness:.009, ior:1.48, depthWrite:false});
  const lens = new THREE.MeshPhysicalMaterial({color:0xf4f8fa, roughness:.06, transparent:true, opacity:.23, transmission:.45, thickness:.012, ior:1.48, depthWrite:false});
  const chrome = new THREE.MeshStandardMaterial({color:0xc1c7c9, metalness:.95, roughness:.22});
  const steel = new THREE.MeshStandardMaterial({color:0x6c7275, metalness:.86, roughness:.36});
  const rubber = new THREE.MeshStandardMaterial({color:0x191b1c, roughness:.84});
  const trim = new THREE.MeshStandardMaterial({color:0x292c2d, roughness:.57});
  const fabric = new THREE.MeshStandardMaterial({color:0x786b59, roughness:.94});
  const red = new THREE.MeshPhysicalMaterial({color:0xa51f25, roughness:.22, clearcoat:1});
  const amber = new THREE.MeshPhysicalMaterial({color:0xc67d25, roughness:.24, clearcoat:1});
  const batches = new Map();
  // Merge only within this invocation; wheels retain their own rotatable groups.
  const add = (g, material, parent = car) => {
    const key = parent.uuid + material.uuid;
    if (!batches.has(key)) batches.set(key, {parent, material, positions:[], normals:[], indices:[]});
    const b = batches.get(key), base = b.positions.length / 3;
    b.positions.push(...g.attributes.position.array); b.normals.push(...g.attributes.normal.array);
    if (g.index) for (const i of g.index.array) b.indices.push(base + i);
    else for (let i = 0; i < g.attributes.position.count; i++) b.indices.push(base + i);
    g.dispose();
  };
  const ellipsoid = (mat, x,y,z, a,b,c, parent=car) => {
    const rings = Math.abs(z)<1.7 && Math.max(a,b,c)>.18 ? 6 : 4;
    const g = new THREE.SphereGeometry(1,32,rings);
    g.rotateX(Math.PI/2); g.scale(a,b,c); g.translate(x,y,z);
    add(g,mat,parent);
  };
  const box = (mat,x,y,z,w,h,d,parent=car,rx=0) => {
    const g = new THREE.BoxGeometry(w,h,d); g.rotateX(rx); g.translate(x,y,z); add(g,mat,parent);
  };
  const tube = (mat, points, radius, segments=16, parent=car) => {
    const curve = new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    add(new THREE.TubeGeometry(curve,segments,radius,4,false),mat,parent);
  };
  const surface = (mat, sample, nu, nv, parent=car) => {
    const p=[], index=[];
    for(let j=0;j<=nv;j++) for(let i=0;i<=nu;i++) p.push(...sample(i/nu,j/nv));
    for(let j=0;j<nv;j++) for(let i=0;i<nu;i++) {
      const a=j*(nu+1)+i; index.push(a,a+nu+2,a+1,a,a+nu+1,a+nu+2);
    }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
    g.setIndex(index); g.computeVertexNormals(); add(g,mat,parent);
  };
  // Curved glazing has a closed 8 mm edge, rather than an opaque cabin volume.
  const window = (corners,axis,bulge) => {
    const point=(u,v,depth) => {
      const a=new THREE.Vector3(...corners[0]).lerp(new THREE.Vector3(...corners[1]),u);
      const b=new THREE.Vector3(...corners[3]).lerp(new THREE.Vector3(...corners[2]),u);
      const p=a.lerp(b,v); p[axis]+=bulge*Math.sin(Math.PI*u)*Math.sin(Math.PI*v)+depth;
      return p.toArray();
    };
    surface(glass,(u,v)=>point(u,v,0),12,4);
    surface(glass,(u,v)=>point(1-u,v,.008),12,4);
    for(const edge of [0,1,2,3]) surface(glass,(u,v)=> {
      const uv=edge===0?[u,0]:edge===1?[1,u]:edge===2?[1-u,1]:[0,1-u];
      return point(...uv,v*.008);
    },12,1);
  };
  const width=z=>.88-.20*Math.pow(Math.abs(z)/1.9,8);
  const belt=z=>.94-.14*Math.pow(Math.abs(z)/1.9,6);
  const bottom=z=> {
    let y=.27;
    for(const axle of [-1.21,1.21]) if(Math.abs(z-axle)<.385) y=Math.max(y,.325+Math.sqrt(.385**2-(z-axle)**2));
    return y;
  };
  // Stamped side skins follow actual open wheel wells. No hidden solid box hull.
  for(const side of [-1,1]) {
    surface(paint,(u,v)=> {
      const z=(side===1?u:1-u)*3.72-1.86, low=bottom(z), high=belt(z);
      return [side*(width(z)-.025*Math.sin(v*Math.PI)),low+(high-low)*v,z];
    },112,4);
    for(const axle of [-1.21,1.21]) {
      const points=[];
      for(let i=0;i<=24;i++) {const t=i*Math.PI/24; points.push([side*(width(axle)-.002),.325+.387*Math.sin(t),axle+.387*Math.cos(t)]);}
      tube(paint,points,.018,32);
    }
  }
  for(const [start,end] of [[-1.86,-.86],[1.51,1.86]]) surface(paint,(u,v)=> {
    const z=start+(end-start)*v, x=(u*2-1)*width(z);
    return [x,belt(z)+.035*Math.sin(Math.PI*u),z];
  },24,10);
  for(const side of [-1,1]) surface(paint,(u,v)=> {
    const x=(u*2-1)*width(1.86), z=side*(1.86+.025*Math.sin(Math.PI*u));
    return [-side*x,.29+v*(.80-.29),z];
  },32,4);
  box(trim,0,.25,0,1.35,.09,3.25);
  // Roof crown rises gently toward the rear passenger compartment.
  surface(roof,(u,v)=> {
    const z=-.68+2.07*v, w=.735-.075*Math.pow(Math.abs(v*2-1),8);
    return [(u*2-1)*w,1.49+.08*Math.sin(Math.PI*u)*Math.sin(Math.PI*v),z];
  },32,12);
  surface(roof,(u,v)=>[(1-u*2)*(.735-.075*Math.pow(Math.abs(v*2-1),8)),1.477,-.68+2.07*v],24,4);
  for(const z of [-.68,1.39]) tube(roof,[[-.66,1.49,z],[0,1.49,z],[.66,1.49,z]],.019,16);
  for(const side of [-1,1]) {
    tube(roof,[[side*.66,1.49,-.68],[side*.729,1.495,-.38],[side*.731,1.495,1.08],[side*.66,1.49,1.39]],.024,32);
    tube(paint,[[side*.80,.91,-.90],[side*.755,1.12,-.81],[side*.672,1.46,-.63]],.047);
    tube(paint,[[side*.83,.92,1.53],[side*.78,1.19,1.40],[side*.66,1.48,1.29]],.064);
    tube(paint,[[side*.845,.94,.18],[side*.775,1.18,.20],[side*.724,1.48,.22]],.043);
    window([[side*.824,.97,-.79],[side*.844,.97,.12],[side*.720,1.455,.15],[side*.688,1.445,-.61]],'x',side*.018);
    window([[side*.844,.97,.25],[side*.815,.97,1.33],[side*.676,1.445,1.22],[side*.720,1.455,.29]],'x',side*.018);
    tube(chrome,[[side*.81,.952,-.83],[side*.853,.956,.18],[side*.818,.956,1.40]],.007);
    for(const [front,rear] of [[-.85,.18],[.21,1.40]]) {
      tube(trim,[[side*.857,.925,front],[side*.881,.73,front+.015],[side*.879,.36,Math.max(front,-.74)],[side*.879,.315,(front+rear)/2],[side*.879,.36,Math.min(rear,.78)],[side*.864,.925,rear]],.0035,30);
      ellipsoid(chrome,side*.878,.854,rear-.13,.017,.022,.079);
    }
    tube(trim,[[side*.78,1.03,-.68],[side*.91,1.05,-.65]],.017,8);
    ellipsoid(paint,side*.925,1.065,-.63,.091,.057,.109);
    ellipsoid(chrome,side*.925,1.066,-.544,.072,.042,.012);
  }
  window([[-.76,.968,-.875],[.76,.968,-.875],[.65,1.455,-.65],[-.65,1.455,-.65]],'z',-.045);
  window([[.79,.973,1.56],[-.79,.973,1.56],[-.64,1.447,1.31],[.64,1.447,1.31]],'z',.04);
  for(const side of [-1,1]) tube(trim,[[side*.54,.982,-.89],[side*.27,1.004,-.91],[side*.05,1.007,-.916]],.007,12);
  tube(trim,[[-.72,.92,1.69],[-.59,.64,1.855],[0,.62,1.893],[.59,.64,1.855],[.72,.92,1.69]],.004,32);
  ellipsoid(chrome,0,.81,1.891,.10,.018,.012);
  // Four padded places sit wholly below the glazing, with individual headrests.
  for(const z of [-.18,.87]) for(const side of [-1,1]) {
    ellipsoid(fabric,side*.37,.57,z,.245,.085,.26);
    ellipsoid(fabric,side*.37,.79,z+.18,.24,.25,.085);
    ellipsoid(fabric,side*.37,1.08,z+.18,.13,.09,.065);
  }
  ellipsoid(trim,0,.905,-.70,.68,.085,.16);
  box(trim,0,.61,-.14,.16,.17,.62);
  const steering=new THREE.TorusGeometry(.135,.016,8,32); steering.rotateX(-.35); steering.translate(-.36,1.00,-.46); add(steering,trim);
  box(chrome,-.36,.993,-.463,.22,.018,.022,car,-.35);
  ellipsoid(trim,-.36,.998,-.461,.052,.048,.027);
  // Horizontal oval lamp housings deliberately avoid a single round perimeter.
  for(const side of [-1,1]) {
    ellipsoid(trim,side*.48,.745,-1.846,.243,.106,.042);
    for(const dx of [-.085,.085]) {
      ellipsoid(chrome,side*.48+dx,.751,-1.883,.075,.075,.023);
      ellipsoid(lens,side*.48+dx,.751,-1.904,.056,.056,.015);
    }
    ellipsoid(lens,side*.48,.748,-1.898,.228,.091,.022);
    ellipsoid(amber,side*.71,.64,-1.839,.061,.018,.014);
    ellipsoid(trim,side*.39,.46,-1.882,.30,.061,.018);
    for(let i=0;i<3;i++) box(steel,side*.39,.432+i*.026,-1.903,.49,.007,.008);
    ellipsoid(red,side*.69,.79,1.825,.054,.173,.037);
    ellipsoid(amber,side*.696,.815,1.856,.038,.028,.008);
    ellipsoid(lens,side*.696,.705,1.856,.038,.023,.008);
  }
  box(paint,0,.465,-1.906,.10,.16,.021);
  tube(chrome,[[-.66,.37,-1.83],[0,.365,-1.892],[.66,.37,-1.83]],.014);
  tube(trim,[[-.70,.37,1.79],[0,.35,1.885],[.70,.37,1.79]],.028);
  const exhaust=new THREE.CylinderGeometry(.029,.029,.22,32,1,true); exhaust.rotateX(Math.PI/2); exhaust.translate(.49,.25,1.76); add(exhaust,chrome);
  const wheels=[];
  for(const z of [-1.21,1.21]) for(const side of [-1,1]) {
    const wheel=new THREE.Group(); wheel.name=`${z<0?'front':'rear'}-${side<0?'left':'right'}`;
    wheel.position.set(side*.775,.325,z); car.add(wheel); wheels.push(wheel);
    const profile=[[.211,-.105],[.277,-.104],[.313,-.079],[.325,-.043],[.325,.043],[.313,.079],[.277,.104],[.211,.105]].map(p=>new THREE.Vector2(...p));
    const tire=new THREE.LatheGeometry(profile,32); tire.rotateZ(Math.PI/2); add(tire,rubber,wheel);
    for(let i=0;i<32;i++) { const a=i*Math.PI/16; const g=new THREE.BoxGeometry(.10,.004,.012); g.translate(0,.324,0); g.rotateX(a); add(g,trim,wheel); }
    const disc=new THREE.CylinderGeometry(.181,.181,.013,32); disc.rotateZ(Math.PI/2); disc.translate(side*.071,0,0); add(disc,steel,wheel);
    box(red,side*.083,.115,.083,.033,.10,.056,wheel);
    const rim=new THREE.TorusGeometry(.211,.018,6,32); rim.rotateY(Math.PI/2); rim.translate(side*.107,0,0); add(rim,chrome,wheel);
    for(let i=0;i<8;i++) {
      const a=i*Math.PI/4, g=new THREE.BoxGeometry(.019,.153,.035);
      g.translate(side*.112,.126,0); g.rotateX(a); add(g,chrome,wheel);
    }
    const hub=new THREE.CylinderGeometry(.062,.062,.028,32); hub.rotateZ(Math.PI/2); hub.translate(side*.112,0,0); add(hub,chrome,wheel);
    for(let i=0;i<5;i++) {const a=i*Math.PI*2/5; const g=new THREE.CylinderGeometry(.009,.009,.009,8); g.rotateZ(Math.PI/2); g.translate(side*.131,.043*Math.cos(a),.043*Math.sin(a)); add(g,steel,wheel);}
  }
  for(const b of batches.values()) {
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(b.positions,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(b.normals,3)); g.setIndex(b.indices);
    const mesh=new THREE.Mesh(g,b.material); mesh.castShadow=!b.material.transparent; mesh.receiveShadow=true; b.parent.add(mesh);
  }
  car.userData={name:'Brindle Borough / original retro hatch',wheels,front:'-Z',showcaseOnly:true};
  return car;
}
