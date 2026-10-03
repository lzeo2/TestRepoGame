import * as THREE from '../vendor/three.module.js';

// Original fictional study, not an OEM replica or a replacement for the live fleet.
export function createCar() {
  const car = new THREE.Group();
  car.name = 'brindle-realistic';
  const paint = new THREE.MeshPhysicalMaterial({name:'body-paint', color:0x557d79, metalness:.32, roughness:.21, clearcoat:1, clearcoatRoughness:.12});
  const roof = new THREE.MeshPhysicalMaterial({name:'roof-paint', color:0xe6e1d3, metalness:.12, roughness:.23, clearcoat:1});
  const glass = new THREE.MeshPhysicalMaterial({name:'window-glass', color:0x52646e, metalness:0, roughness:.12, transparent:true, opacity:.55, transmission:0, side:THREE.DoubleSide, forceSinglePass:true, depthWrite:false});
  const lens = new THREE.MeshPhysicalMaterial({name:'lamp-lens', color:0xdbe8ee, roughness:.08, transparent:true, opacity:.38, transmission:0, forceSinglePass:true, depthWrite:false});
  const chrome = new THREE.MeshStandardMaterial({name:'chrome', color:0xc1c7c9, metalness:.95, roughness:.22});
  const steel = new THREE.MeshStandardMaterial({color:0x6c7275, metalness:.86, roughness:.36});
  const rubber = new THREE.MeshStandardMaterial({name:'rubber', color:0x191b1c, roughness:.84});
  const trim = new THREE.MeshStandardMaterial({name:'cab-plastic', color:0x292c2d, roughness:.57});
  const fabric = new THREE.MeshStandardMaterial({name:'seat-fabric', color:0x786b59, roughness:.94});
  const red = new THREE.MeshPhysicalMaterial({color:0xa51f25, roughness:.22, clearcoat:1});
  const amber = new THREE.MeshPhysicalMaterial({color:0xc67d25, roughness:.24, clearcoat:1});
  const batches = new Map();
  // Merge only within this invocation; wheels retain their own rotatable groups.
  const add = (g, material, parent = car) => {
    const key = parent.uuid + material.uuid;
    if (!batches.has(key)) batches.set(key, {parent, material, positions:[], normals:[], uvs:[], indices:[]});
    const b = batches.get(key), base = b.positions.length / 3;
    b.positions.push(...g.attributes.position.array); b.normals.push(...g.attributes.normal.array);
    b.uvs.push(...g.attributes.uv.array);
    if (g.index) for (const i of g.index.array) b.indices.push(base + i);
    else for (let i = 0; i < g.attributes.position.count; i++) b.indices.push(base + i);
    g.dispose();
  };
  const ellipsoid = (mat, x,y,z, a,b,c, parent=car) => {
    const rings = Math.abs(z)<1.7 && Math.max(a,b,c)>.18 ? 6 : 4;
    const g = new THREE.SphereGeometry(1,20,rings);
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
    const p=[], uv=[], index=[];
    for(let j=0;j<=nv;j++) for(let i=0;i<=nu;i++) { p.push(...sample(i/nu,j/nv)); uv.push(i/nu,j/nv); }
    for(let j=0;j<nv;j++) for(let i=0;i<nu;i++) {
      const a=j*(nu+1)+i; index.push(a,a+nu+2,a+1,a,a+nu+1,a+nu+2);
    }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    g.setIndex(index); g.computeVertexNormals(); add(g,mat,parent);
  };
  // Single thin panes: the same boundary samples also construct their metal frames.
  const patch = (mat, point, u0,u1,v0,v1, nu=12,nv=6) =>
    surface(mat,(u,v)=>point(u0+(u1-u0)*u,v0+(v1-v0)*v),nu,nv);
  const framedPane = (point, u0,u1) => {
    // Rounded inset glass corners cut into a continuous painted surround.
    const inset=v=>.014+.025*(Math.exp(-v*28)+Math.exp(-(1-v)*28));
    surface(glass,(u,v)=>point(u0+inset(v)+(u1-u0-2*inset(v))*u,.15+.70*v),12,6);
    patch(paint,point,u0,u1,0,.15,12,2);
    patch(roof,point,u0,u1,.85,1,12,3);
    for(const edge of [0,1]) surface(paint,(u,v)=>point(edge?u1-inset(v)*u:u0+inset(v)*u,.15+.70*v),2,8);
    for(const edge of [0,1]) {
      const line=[]; for(let i=0;i<=20;i++) {const v=i/20; line.push(point(edge?u1-inset(v):u0+inset(v),.15+.70*v));}
      tube(rubber,line,.004,12);
    }
    for(const v of [.15,.85]) {const line=[];for(let i=0;i<=20;i++) line.push(point(u0+inset(0)+(u1-u0-2*inset(0))*i/20,v));tube(rubber,line,.004,12);}
  };
  const width=z=>.88-.018*(z/1.96)**2-(Math.abs(z)>1.60?.30*(1-Math.sqrt(Math.max(0,1-((Math.abs(z)-1.60)/.36)**2))):0);
  const belt=z=>.99-.16*Math.pow(Math.abs(z)/1.96,6);
  const skin=(side,z,v)=>[side*(width(z)-.075*v**4-.025*(1-v)**3),bottom(z)+(belt(z)-bottom(z))*v,z];
  const bottom=z=> {
    let y=.27;
    for(const axle of [-1.21,1.21]) if(Math.abs(z-axle)<.385) y=Math.max(y,.325+Math.sqrt(.385**2-(z-axle)**2));
    return y;
  };
  // Stamped side skins follow actual open wheel wells. No hidden solid box hull.
  for(const side of [-1,1]) {
    surface(paint,(u,v)=> {
      const z=(side===1?u:1-u)*3.92-1.96;
      return skin(side,z,v);
    },96,6);
    for(const axle of [-1.21,1.21]) {
      surface(paint,(u,v)=>{const t=u*Math.PI, r=.387+.045*v, z=axle+r*Math.cos(t);return [side*(width(z)-.025+.016*Math.sin(Math.PI*v)),.325+r*Math.sin(t),z];},32,3);
      const points=[];
      for(let i=0;i<=24;i++) {const t=i*Math.PI/24,z=axle+.386*Math.cos(t); points.push([side*(width(z)-.023),.325+.386*Math.sin(t),z]);}
      tube(rubber,points,.004,24);
    }
  }
  for(const [start,end] of [[-1.96,-.88],[1.51,1.96]]) surface(paint,(u,v)=> {
    const z=start+(end-start)*v;
    return [(u*2-1)*(width(z)-.075),belt(z)+.065*Math.sin(Math.PI*u),z];
  },24,16);
  for(const side of [-1,1]) surface(paint,(u,v)=> {
    const z=side*1.96, t=side===1?1-u:u;
    return [(t*2-1)*(width(z)-.075*v**4-.025*(1-v)**3),.27+v*(belt(z)+.065*Math.sin(Math.PI*t)-.27),z+side*.018*Math.sin(Math.PI*t)*Math.sin(v*Math.PI)];
  },24,10);
  box(trim,0,.25,0,1.35,.09,3.25);
  roof.side=THREE.DoubleSide; paint.side=THREE.DoubleSide;
  surface(roof,(u,v)=>[(u*2-1)*(.655+.05*Math.sin(Math.PI*v)),1.49+.035*Math.sin(Math.PI*v)+.07*Math.sin(Math.PI*u),-.63+1.94*v+.10*(2*u-1)**8*(1-2*v)],20,12);
  for(const side of [-1,1]) {
    const cabin=(u,v)=> {
      const z=(-.88+.25*v)+(2.39-.45*v)*u+.10*v*(1-2*u);
      return [side*((width(z)-.075)*(1-v)+(.655+.05*Math.sin(Math.PI*u))*v+.025*Math.sin(Math.PI*v)),belt(z)*(1-v)+(1.49+.035*Math.sin(Math.PI*u))*v,z];
    };
    framedPane(cabin,.045,.48); framedPane(cabin,.535,.94);
    for(const [a,b] of [[0,.045],[.48,.535],[.94,1]]) patch(paint,cabin,a,b,0,1,2,10);
    const edge=[]; for(let i=0;i<=24;i++) edge.push(cabin(i/24,1));
    tube(roof,edge,.013,24);
    for(const [front,rear] of [[-.83,.32],[.35,1.39]]) {
      // Four real edges, with lower corners following the wheel opening.
      const outline=[], corners=[[front,.99],[rear,.99],[rear,.12],[rear-.06,.065],[front+.06,.065],[front,.12],[front,.99]];
      for(let k=1;k<corners.length;k++) for(let i=0;i<8;i++) {
        const t=i/8, a=corners[k-1],b=corners[k], p=skin(side,a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t);p[0]+=side*.0015;outline.push(p);
      }
      outline.push(skin(side,front,.99));
      tube(trim,outline,.0018,40);
      ellipsoid(chrome,side*(width(rear-.13)-.025),.85,rear-.13,.017,.018,.075);
    }
    tube(trim,[[side*.79,1.02,-.68],[side*.91,1.05,-.65]],.017,8);
    ellipsoid(paint,side*.925,1.065,-.63,.091,.057,.095);
    // Filled planar face sits beyond the shell, so its centre cannot show paint.
    const seal=new THREE.CircleGeometry(1,24);seal.scale(.073,.043,1);seal.translate(side*.925,1.066,-.533);add(seal,rubber);
    const mirror=new THREE.CircleGeometry(1,24);mirror.scale(.069,.039,1);mirror.translate(side*.925,1.066,-.531);add(mirror,chrome);
  }
  for(const rear of [false,true]) {
    const pane=(u,v)=> {
      const z=rear?1.51-.20*v:-.88+.25*v, w=(width(z)-.075)*(1-v)+.655*v+.025*Math.sin(Math.PI*v);
      return [(u*2-1)*w,belt(z)*(1-v)+1.49*v+(.065*(1-v)+.07*v)*Math.sin(Math.PI*u),z+(rear?-1:1)*.10*v*(2*u-1)**8+(rear?1:-1)*.035*Math.sin(Math.PI*u)*Math.sin(Math.PI*v)];
    };
    framedPane(pane,.045,.955);
    patch(paint,pane,0,.045,0,1,2,10); patch(paint,pane,.955,1,0,1,2,10);
  }
  for(const side of [-1,1]) tube(trim,[[side*.54,.982,-.89],[side*.27,1.004,-.91],[side*.05,1.007,-.916]],.007,12);
  ellipsoid(chrome,0,.79,1.956,.10,.018,.012);
  // Bevelled upholstery has cushion, back, side bolsters and separate headrests.
  const padded=(mat,x,y,z,w,h,d,r=.035,rx=0)=> {
    const shape=new THREE.Shape();
    shape.moveTo(-w/2+r,-h/2); shape.lineTo(w/2-r,-h/2);
    shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r); shape.lineTo(w/2,h/2-r);
    shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2); shape.lineTo(-w/2+r,h/2);
    shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r); shape.lineTo(-w/2,-h/2+r);
    shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
    const g=new THREE.ExtrudeGeometry(shape,{depth:d-2*r,bevelEnabled:true,bevelSize:r/2,bevelThickness:r,bevelSegments:2,steps:1,curveSegments:2});
    g.translate(0,0,-(d-2*r)/2); g.rotateX(rx); g.translate(x,y,z); add(g,mat);
  };
  box(trim,0,.32,.1,1.52,.055,2.9);
  for(const side of [-1,1]) {
    padded(trim,side*.78,.66,.29,.05,.48,2.1,.018);
    padded(fabric,side*.752,.73,.12,.04,.19,.68,.014);
    box(trim,side*.72,.69,.04,.10,.045,.46);
    for(const z of [-.02,.91]) {
      padded(fabric,side*.36,.54,z,.43,.12,.47);
      padded(fabric,side*.36,.79,z+.22,.41,.48,.11,.032,.10);
      for(const dx of [-.185,.185]) padded(fabric,side*.36+dx,.76,z+.15,.07,.40,.14,.022,.10);
      for(const dx of [-.07,.07]) box(steel,side*.36+dx,1.065,z+.245,.013,.13,.013);
      padded(fabric,side*.36,1.13,z+.25,.25,.15,.09,.027);
    }
  }
  padded(trim,0,.83,-.70,1.48,.19,.32,.045);
  padded(trim,-.36,.965,-.62,.43,.15,.19,.025);
  padded(trim,0,.53,-.10,.19,.25,.79,.025);
  // Gauge cylinder axes point along Z; both faces are physically toward the driver.
  for(const x of [-.465,-.255]) {
    const rim=new THREE.TorusGeometry(.074,.007,6,32); rim.translate(x,.967,-.512); add(rim,steel);
    const dial=new THREE.MeshStandardMaterial({name:x<-.36?'dial-speed':'dial-rpm',color:0x171a1b,roughness:.7});
    const face=new THREE.CylinderGeometry(.069,.069,.012,32); face.rotateX(Math.PI/2); face.translate(x,.967,-.518); add(face,dial);
    for(let i=0;i<11;i++) {
      const a=-Math.PI*.75+i*Math.PI*1.5/10;
      const tick=new THREE.BoxGeometry(.003,.010,.003); tick.translate(0,.058,0); tick.rotateZ(-a); tick.translate(x,.967,-.508); add(tick,chrome);
    }
    const needle=new THREE.BoxGeometry(.003,.053,.004); needle.translate(0,.023,0); needle.rotateZ(Math.PI*.75); needle.translate(x,.967,-.504); add(needle,amber);
  }
  for(const x of [-.66,.18,.59]) {
    box(rubber,x,.852,-.524,.115,.055,.015);
    for(let i=0;i<4;i++) box(steel,x,.835+i*.011,-.513,.102,.003,.008);
  }
  box(rubber,.035,.78,-.518,.18,.055,.012);
  for(const x of [-.035,.035,.105]) {
    const knob=new THREE.CylinderGeometry(.014,.014,.019,12); knob.rotateX(Math.PI/2); knob.translate(x,.73,-.505); add(knob,steel);
  }
  tube(steel,[[0,.61,-.27],[0,.73,-.30]],.012,4);
  ellipsoid(trim,0,.742,-.30,.033,.028,.033);
  for(const x of [-.48,-.36,-.23]) box(rubber,x,.41,-.65,.065,.09,.028,car,-.25);
  const steering=new THREE.TorusGeometry(.145,.014,8,32); steering.rotateX(-.22); steering.translate(-.36,.97,-.35); add(steering,trim);
  for(const a of [0,2.1,4.2]) {
    const spoke=new THREE.BoxGeometry(.025,.12,.018); spoke.translate(0,.065,0); spoke.rotateZ(a); spoke.rotateX(-.22); spoke.translate(-.36,.97,-.35); add(spoke,steel);
  }
  ellipsoid(trim,-.36,.97,-.347,.048,.047,.026);
  // Horizontal oval lamp housings deliberately avoid a single round perimeter.
  for(const side of [-1,1]) {
    ellipsoid(trim,side*.40,.745,-1.955,.196,.087,.018);
    for(const dx of [-.078,.078]) {
      ellipsoid(steel,side*.40+dx,.751,-1.968,.064,.064,.009);
      ellipsoid(lens,side*.40+dx,.751,-1.978,.052,.052,.007);
    }
    ellipsoid(amber,side*.43,.62,-1.973,.046,.012,.005);
    ellipsoid(trim,side*.26,.46,-1.971,.225,.058,.009);
    for(let i=0;i<3;i++) box(trim,side*.26,.432+i*.023,-1.982,.39,.008,.009);
    ellipsoid(red,side*.46,.69,1.967,.054,.12,.018);
    ellipsoid(amber,side*.46,.725,1.984,.038,.025,.006);
    ellipsoid(lens,side*.46,.625,1.984,.038,.023,.006);
  }
  box(paint,0,.465,-1.943,.10,.16,.021);
  tube(chrome,[[-.66,.37,-1.83],[0,.365,-1.892],[.66,.37,-1.83]],.014);
  tube(trim,[[-.70,.37,1.79],[0,.35,1.885],[.70,.37,1.79]],.028);
  const exhaust=new THREE.CylinderGeometry(.029,.029,.22,32,1,true); exhaust.rotateX(Math.PI/2); exhaust.translate(.49,.25,1.76); add(exhaust,chrome);
  const wheels=[];
  for(const z of [-1.21,1.21]) for(const side of [-1,1]) {
    const wheel=new THREE.Group(); wheel.name=`${z<0?'front':'rear'}-${side<0?'left':'right'}`;
    wheel.position.set(side*.775,.325,z); car.add(wheel); wheels.push(wheel);
    const profile=[[.211,-.105],[.277,-.104],[.313,-.079],[.325,-.043],[.325,.043],[.313,.079],[.277,.104],[.211,.105]].map(p=>new THREE.Vector2(...p));
    const tire=new THREE.LatheGeometry(profile,24); tire.rotateZ(Math.PI/2); add(tire,rubber,wheel);
    for(let i=0;i<16;i++) { const a=i*Math.PI/8; const g=new THREE.BoxGeometry(.10,.004,.012); g.translate(0,.324,0); g.rotateX(a); add(g,trim,wheel); }
    const disc=new THREE.CylinderGeometry(.181,.181,.013,32); disc.rotateZ(Math.PI/2); disc.translate(side*.071,0,0); add(disc,steel,wheel);
    box(red,side*.083,.115,.083,.033,.10,.056,wheel);
    const rim=new THREE.TorusGeometry(.211,.018,6,24); rim.rotateY(Math.PI/2); rim.translate(side*.107,0,0); add(rim,chrome,wheel);
    for(let i=0;i<8;i++) {
      const a=i*Math.PI/4, g=new THREE.BoxGeometry(.019,.153,.035);
      g.translate(side*.112,.126,0); g.rotateX(a); add(g,chrome,wheel);
    }
    const hub=new THREE.CylinderGeometry(.062,.062,.028,32); hub.rotateZ(Math.PI/2); hub.translate(side*.112,0,0); add(hub,chrome,wheel);
    for(let i=0;i<5;i++) {const a=i*Math.PI*2/5; const g=new THREE.CylinderGeometry(.009,.009,.009,8); g.rotateZ(Math.PI/2); g.translate(side*.131,.043*Math.cos(a),.043*Math.sin(a)); add(g,steel,wheel);}
  }
  for(const b of batches.values()) {
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(b.positions,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(b.normals,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(b.uvs,2)); g.setIndex(b.indices);
    const mesh=new THREE.Mesh(g,b.material); mesh.castShadow=!b.material.transparent; mesh.receiveShadow=true; b.parent.add(mesh);
  }
  car.userData={name:'Brindle Borough / original retro hatch',wheels,front:'-Z',showcaseOnly:true,cockpit:{eye:[-.36,1.14,.16],target:[-.36,1.12,-2]}};
  return car;
}
