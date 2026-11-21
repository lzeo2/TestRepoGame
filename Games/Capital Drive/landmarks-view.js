import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { LANDMARKS, MANUKA_POOL_BASIN, POOL_BARRIERS, POOL_GATE_APPROACHES } from './landmarks.js';

const NEAR_RANGE = 850, FAR_RANGE = 4200;
const PALE = 0xd9d5c5, GRASS = 0x7e915d, GLASS = 0x526c72, METAL = 0xb9c1be;

// Original low-poly architectural studies. Two merged buffers per site, no textures.
export function createLandmarksView(scene, map, heightAt) {
  const root = new THREE.Group(); root.name = 'Canberra landmarks'; scene.add(root);
  const nearMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  // Original static metre-scale grain: pooled shader detail, no image or extra draw.
  nearMaterial.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 vLandmarkSurface;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvLandmarkSurface = position;');
    shader.fragmentShader = 'varying vec3 vLandmarkSurface;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float grain = fract(sin(dot(floor(vLandmarkSurface * 18.0), vec3(12.9898,78.233,37.719))) * 43758.5453);
      diffuseColor.rgb *= 0.965 + grain * 0.055;
    `);
  };
  nearMaterial.customProgramCacheKey = () => 'capital-landmark-grain-v1';
  const farMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false });
  const box = new THREE.BoxGeometry(1, 1, 1), cylinder = new THREE.CylinderGeometry(1, 1, 1, 8);
  const records = [], color = new THREE.Color(), v = new THREE.Vector3();
  const stats = { landmarks: 0, meshes: 0, triangles: 0, visibleNear: 0, visibleDistant: 0, nearRange: NEAR_RANGE, farRange: FAR_RANGE };
  let disposed = false;
  for (const site of LANDMARKS) {
    if (map.bounds && (site.x < map.bounds.minX || site.x > map.bounds.maxX || site.z < map.bounds.minZ || site.z > map.bounds.maxZ)) continue;
    const group = new THREE.Group(); group.name = site.name; group.position.set(site.x, heightAt(site.x, site.z), site.z);
    // Parliament's land axis is northeast, parallel to the Old Parliament facade axis.
    group.rotation.y = site.id.includes('parliament') ? -0.615 : site.id === 'kingston-powerhouse' ? 0.755 : 0;
    root.add(group);
    const batches = [{ positions: [], colors: [] }, { positions: [], colors: [] }];
    let detail = false;
    const groundY = (x, z) => heightAt(site.x + Math.cos(group.rotation.y) * x + Math.sin(group.rotation.y) * z, site.z - Math.sin(group.rotation.y) * x + Math.cos(group.rotation.y) * z) - group.position.y;
    const groundPoint = (x, z, lift = 0.18) => [x, groundY(x, z) + lift, z];
    function tri(a, b, c, tint) {
      const batch = batches[detail ? 0 : 1]; color.setHex(tint);
      batch.positions.push(...a, ...b, ...c);
      for (let i = 0; i < 3; i++) batch.colors.push(color.r, color.g, color.b);
    }
    function quad(a, b, c, d, tint) { tri(a, b, c, tint); tri(a, c, d, tint); }
    function primitive(geometry, x, y, z, sx, sy, sz, tint, rotation = 0) {
      const position = geometry.attributes.position, index = geometry.index;
      const matrix = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation), new THREE.Vector3(sx, sy, sz));
      for (let i = 0; i < (index ? index.count : position.count); i += 3) {
        const points = [];
        for (let k = 0; k < 3; k++) { v.fromBufferAttribute(position, index ? index.getX(i + k) : i + k).applyMatrix4(matrix); points.push(v.toArray()); }
        tri(...points, tint);
      }
    }
    const block = (x, y, z, sx, sy, sz, tint, rotation = 0) => primitive(box, x, y, z, sx, sy, sz, tint, rotation);
    function beam(a, b, radius, tint) {
      const direction = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
      const g = new THREE.CylinderGeometry(radius, radius, direction.length(), 6);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
      primitive(g, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, 1, 1, 1, tint); g.dispose();
    }
    function windows(width, z, y, columns, rows, spacing = 3.3) {
      for (let row = 0; row < rows; row++) for (let i = 0; i < columns; i++) block((i + 0.5) / columns * width - width / 2, y + row * spacing, z, width / columns * 0.48, 1.9, 0.18, GLASS);
    }
    if (site.id === 'parliament-house') {
      const MARBLE = 0xf5f3e9;
      // The raised lawn is split around the axial central hall, not a conical hill.
      for (const side of [-1, 1]) {
        for (let i = 0; i < 12; i++) {
          const x0 = side * (18 + i * 11), x1 = side * (18 + (i + 1) * 11);
          const y0 = 18 * (1 - i / 12), y1 = 18 * (1 - (i + 1) / 12);
          // Low lawn edges rise inward to the roof deck rather than a tall pale fascia.
          quad([x0,y0*0.12,-132],[x1,y1*0.12,-132],[x1,y1,0],[x0,y0,0],GRASS);
          quad([x0,y0,0],[x1,y1,0],[x1,y1*0.12,132],[x0,y0*0.12,132],GRASS);
          quad([x0,-13,-132],[x1,-13,-132],[x1,y1*0.12,-132],[x0,y0*0.12,-132],MARBLE);
          quad([x1,-13,132],[x0,-13,132],[x0,y0*0.12,132],[x1,y1*0.12,132],MARBLE);
        }
      }
      for (const side of [-1, 1]) quad([side*150,-13,-132],[side*150,-13,132],[side*150,0,132],[side*150,0,-132],MARBLE);
      block(0, 6, 0, 36, 22, 250, MARBLE);
      block(0, 18, 0, 29, 3, 180, GLASS);
      // Pale curved facade across the north forecourt, segmented for a real arc silhouette.
      for (let i = 0; i < 24; i++) {
        const a = -1.15 + i / 24 * 2.3, b = -1.15 + (i + 1) / 24 * 2.3;
        const p = t => [Math.sin(t)*150, -79-Math.cos(t)*74];
        const u=p(a), w=p(b);
        // Leave the axial entrance open: this wall used to hide the entire grid.
        if (Math.min(u[0],w[0]) < 36 && Math.max(u[0],w[0]) > -36) continue;
        const x=(u[0]+w[0])/2,z=(u[1]+w[1])/2;
        block(x,groundY(x,z)+3,z,Math.hypot(w[0]-u[0],w[1]-u[1])+0.2,6,3.5,MARBLE,-Math.atan2(w[1]-u[1],w[0]-u[0]));
      }
      // Four stainless legs converge into the mast, 81 metres above its roof deck.
      for (const x of [-19,19]) for (const z of [-19,19]) beam([x,18,z],[0,81,0],0.65,METAL);
      beam([0,70,0],[0,99,0],0.55,METAL);
      quad([0,96,0],[12.8,94.6,1.4],[12.8,88.2,1.4],[0,89.6,0],0x23395d);
      // Original flat flag markings, offset towards the forecourt to avoid z-fighting.
      let flagLayer=0.035;
      const flagPoint = (u,v) => [u*12.8,96-u*1.4-v*6.4,u*1.4-flagLayer];
      const flagQuad = (points,tint) => { flagLayer+=0.004; quad(...points.map(p=>flagPoint(...p)),tint); };
      const WHITE=0xffffff,RED=0xc53c40;
      // Canton diagonal bands, kept inside the upper-left quarter.
      flagQuad([[0,0.025],[0.025,0],[0.5,0.475],[0.475,0.5]],WHITE);
      flagQuad([[0,0.475],[0.025,0.5],[0.5,0.025],[0.475,0]],WHITE);
      flagQuad([[0,0.012],[0.012,0],[0.5,0.488],[0.488,0.5]],RED);
      flagQuad([[0,0.488],[0.012,0.5],[0.5,0.012],[0.488,0]],RED);
      flagQuad([[0.21,0],[0.29,0],[0.29,0.5],[0.21,0.5]],WHITE);
      flagQuad([[0,0.205],[0.5,0.205],[0.5,0.295],[0,0.295]],WHITE);
      flagQuad([[0.23,0],[0.27,0],[0.27,0.5],[0.23,0.5]],RED);
      flagQuad([[0,0.225],[0.5,0.225],[0.5,0.275],[0,0.275]],RED);
      function flagStar(u,v,radius,points=7) {
        flagLayer+=0.004;
        const ring=Array.from({length:points*2},(_,i)=>{
          const a=-Math.PI/2+i/points*Math.PI,r=i%2?radius*0.43:radius;
          return flagPoint(u+Math.cos(a)*r/12.8,v+Math.sin(a)*r/6.4);
        });
        for(let i=0;i<ring.length;i++)tri(flagPoint(u,v),ring[i],ring[(i+1)%ring.length],WHITE);
      }
      flagStar(0.25,0.75,0.66);
      for(const [u,v,r] of [[0.75,0.19,0.43],[0.62,0.44,0.43],[0.85,0.39,0.43],[0.75,0.81,0.43]])flagStar(u,v,r);
      flagStar(0.81,0.58,0.25,5);
      detail = true;
      quad(groundPoint(-72,-157),groundPoint(72,-157),groundPoint(72,-221),groundPoint(-72,-221),0xa16c55);
      const poolY=groundY(0,-193)+0.24;
      block(0,poolY,-193,38,0.12,26,0x66858a);
      block(0,4.3,-147,68,9,5,MARBLE);
      for (let i=-6;i<=6;i++) block(i*5,4.1,-150,1.1,8.6,3.8,MARBLE);
      block(0,10.4,-139,68,0.9,15,MARBLE);
      block(0,12.6,-123,53,0.9,16,MARBLE);
      windows(60,-152.05,3.2,12,2);
      for (let i=-6;i<=6;i++) block(i*10,groundY(i*10,-211)+0.5,-211,0.36,1,0.36,0x85877f);
    } else if (site.id === 'old-parliament-house') {
      block(0,2,0,146,12,84,PALE);
      block(0,7,-43,42,13,15,0xe5e0d0);
      for (const x of [-60,60]) block(x,4,-36,24,14,25,0xe8e2d2);
      block(0,14,-40,47,1.1,18,PALE);
      beam([0,14,-40],[0,28,-40],0.22,METAL);
      detail = true;
      windows(139,-42.2,3,30,2,4);
      for (let i=0;i<14;i++) {
        const x0=-70+i*10,x1=x0+10,y0=groundY(x0,-42.4),y1=groundY(x1,-42.4);
        quad([x0,y0-0.2,-42.4],[x1,y1-0.2,-42.4],[x1,y1+0.7,-42.4],[x0,y0+0.7,-42.4],0x995d45);
      }
      for (const x of [-45,45]) block(x,8.4,-37,38,0.7,12,PALE);
      for (let i=-3;i<=3;i++) block(i*4.8,7,-51,1,10,1.3,PALE);
      for (let i=0;i<7;i++) block(0,-1+i*0.3,-55-i*1.4,35+i*2,0.35,2,PALE);
      block(0,3,-51.5,6,5,0.3,0x716d58);
    } else if (site.id === 'manuka-oval') {
      // Oval is a ground surface, never the source footprint's solid ten-metre drum.
      const n=64;
      for(let i=0;i<n;i++) { const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2; tri(groundPoint(0,0,0.25),groundPoint(Math.cos(a)*85,Math.sin(a)*99,0.25),groundPoint(Math.cos(b)*85,Math.sin(b)*99,0.25),0x6c914f); }
      for (let i=0;i<6;i++) {
        const a=(i/6+0.08)*Math.PI*2,x=Math.cos(a)*104,z=Math.sin(a)*115;
        const inward = new THREE.Vector3(-Math.cos(a),0,-Math.sin(a));
        const tangent = new THREE.Vector3(-Math.sin(a),0,Math.cos(a));
        // Four low-sided sections make the inward bow legible against the sky.
        for (let k=0;k<4;k++) {
          const point = t => [x+inward.x*6*t*t,-3+47*t,z+inward.z*6*t*t];
          beam(point(k/4),point((k+1)/4),0.55-k*0.07,METAL);
        }
        const head = (u,y) => [x+inward.x*(6+u*u*0.014)+tangent.x*u,y,z+inward.z*(6+u*u*0.014)+tangent.z*u];
        for (let k=0;k<4;k++) {
          const u=-8+k*4,w=u+4;
          quad(head(u*0.78,42),head(w*0.78,42),head(w,47),head(u,47),0x6e7774);
          for (let row=0;row<3;row++) {
            const y=42.8+row*1.4,spread=0.8+row*0.09;
            quad(head(u*spread,y),head(w*spread,y),head(w*spread,y+0.65),head(u*spread,y+0.65),0xd4d5c5);
          }
        }
      }
      for (const side of [-1,1]) { block(side*88,5,0,17,13,74,0xb6b8ad); block(side*88,13,-3,24,2,80,0x697a76); }
      detail=true;
      block(0,0.32,0,3.2,0.1,24,0xb8a379);
      for(const side of [-1,1]) for(let i=0;i<5;i++) block(side*(77+i*2.3),2+i*1.6,0,2,0.6,68,0x647e86);
      for(let i=0;i<192;i++) {
        const a=i/192*Math.PI*2,b=(i+1)/192*Math.PI*2;
        const p=groundPoint(Math.cos(a)*94,Math.sin(a)*109,0),q=groundPoint(Math.cos(b)*94,Math.sin(b)*109,0);
        const dx=q[0]-p[0],dz=q[2]-p[2],length=Math.hypot(dx,dz),ex=dx/length*0.055,ez=dz/length*0.055;
        quad([p[0]-ex,p[1],p[2]-ez],[p[0]+ex,p[1],p[2]+ez],[p[0]+ex,p[1]+1.45,p[2]+ez],[p[0]-ex,p[1]+1.45,p[2]-ez],0x292e2b);
        for (const y of [0.45,1.18]) quad([p[0],p[1]+y,p[2]],[q[0],q[1]+y,q[2]],[q[0],q[1]+y+0.07,q[2]],[p[0],p[1]+y+0.07,p[2]],0x292e2b);
      }
    } else if (site.id === 'manuka-pool') {
      // The exact source boundary and fixed-open gate share collision descriptors.
      const CREAM=0xe3d8bf,TILE=0xa65c3e,IRON=0x333c36;
      const local=([x,z])=>[x-site.x,z-site.z];
      for(const barrier of POOL_BARRIERS) {
        const [ax,az]=local(barrier.a),[bx,bz]=local(barrier.b);
        if(barrier.kind==='pillar') {
          const x=barrier.x-site.x,z=barrier.z-site.z,y=groundY(x,z);
          block(x,y+barrier.height/2,z,barrier.width,barrier.height,barrier.depth,CREAM,barrier.yaw);
          block(x,y+3.45,z,0.63,0.18,0.63,PALE,barrier.yaw);
          continue;
        }
        if(barrier.kind==='building') {
          const x=barrier.x-site.x,z=barrier.z-site.z,y=groundY(x,z);
          block(x,y+barrier.height/2,z,barrier.width,barrier.height,barrier.depth,CREAM,barrier.yaw);
          const co=Math.cos(barrier.yaw),si=Math.sin(barrier.yaw);
          const roof=(u,h,v)=>[x+co*u+si*v,y+h,z-si*u+co*v];
          const w=barrier.width/2+0.25,d=barrier.depth/2+0.25,h=barrier.height;
          const a=roof(-w,h,-d),b=roof(w,h,-d),c=roof(w,h,d),e=roof(-w,h,d),r=roof(-w+d,h+1.65,0),t=roof(w-d,h+1.65,0);
          quad(a,b,t,r,TILE);quad(e,r,t,c,TILE);tri(a,r,e,TILE);tri(b,c,t,TILE);
          detail=true;
          // Original terracotta tile rows, dark grilles and cream pilasters.
          for(const side of [-1,1])for(let i=1;i<5;i++) {
            const v=side*d*i/5,yy=h+1.65*(1-i/5)+0.025;
            beam(roof(-w+d*(1-i/5),yy,v),roof(w-d*(1-i/5),yy,v),0.035,0x8e4936);
          }
          for(const u of [-2.7,0,2.7]) {
            const p=roof(u,1.9,barrier.depth/2+0.018);
            block(p[0],p[1],p[2],1.4,1.5,0.08,IRON,barrier.yaw);
            for(const offset of [-0.45,0,0.45]) { const q=roof(u+offset,1.9,barrier.depth/2+0.07);block(q[0],q[1],q[2],0.045,1.55,0.07,CREAM,barrier.yaw); }
          }
          detail=false;
          continue;
        }
        const pa=groundPoint(ax,az,0),pb=groundPoint(bx,bz,0),h=barrier.height;
        const nx=-(bz-az)/barrier.width*barrier.depth/2,nz=(bx-ax)/barrier.width*barrier.depth/2;
        const wall=(height,tint)=>{
          const a=[ax+nx,pa[1]-0.12,az+nz],b=[bx+nx,pb[1]-0.12,bz+nz],c=[bx-nx,pb[1]-0.12,bz-nz],d=[ax-nx,pa[1]-0.12,az-nz];
          const up=p=>[p[0],p[1]+height+0.12,p[2]];
          quad(a,b,up(b),up(a),tint);quad(d,up(d),up(c),c,tint);quad(up(a),up(b),up(c),up(d),tint);
          quad(a,up(a),up(d),d,tint);quad(b,c,up(c),up(b),tint);
        };
        wall(barrier.kind==='wall'?h:0.24,CREAM);
        if(barrier.kind==='fence') {
          for(const y of [0.48,1.65])quad([ax,pa[1]+y,az],[bx,pb[1]+y,bz],[bx,pb[1]+y+0.07,bz],[ax,pa[1]+y+0.07,az],IRON);
          const count=Math.ceil(barrier.width/0.65);
          for(let i=0;i<=count;i++) {
            const t=i/count,x=ax+(bx-ax)*t,z=az+(bz-az)*t;
            const y=groundY(x,z),ex=(bx-ax)/barrier.width*0.035,ez=(bz-az)/barrier.width*0.035;
            quad([x-ex,y,z-ez],[x+ex,y,z+ez],[x+ex,y+h,z+ez],[x-ex,y+h,z-ez],IRON);
            quad([x-ez,y,z+ex],[x+ez,y,z-ex],[x+ez,y+h,z-ex],[x-ez,y+h,z+ex],IRON);
          }
        }
      }
      const gate=POOL_GATE_APPROACHES[0],ga=local(gate.a),gb=local(gate.b),gateYaw=-Math.atan2(gb[1]-ga[1],gb[0]-ga[0]);
      // Raised header leaves more than three metres headroom and a 2.16m clear gap.
      const gx=gate.x-site.x,gz=gate.z-site.z,gy=Math.max(groundY(...ga),groundY(...gb));
      block(gx,gy+3.4,gz,gate.width+0.7,0.4,0.38,CREAM,gateYaw);
      detail=true;
      // Art Deco sun/shell rays are original geometric cues, not copied decoration.
      for(let i=0;i<7;i++) {
        const angle=(i/6)*Math.PI,dx=Math.cos(angle)*0.48,dy=Math.sin(angle)*0.48;
        const co=Math.cos(gateYaw),si=Math.sin(gateYaw);
        beam([gx,gy+3.55,gz-0.21],[gx+co*dx,gy+3.55+dy,gz-si*dx-0.21],0.025,IRON);
      }
      detail=false;
      // Water corners are source geometry; tiled deck and lanes are original art.
      const corners = MANUKA_POOL_BASIN.map(([x,z]) => [x-site.x,z-site.z]);
      const level = Math.max(...corners.map(([x,z]) => groundY(x,z))) + 0.3;
      const point = (u,v,y=level) => [
        corners[0][0]+(corners[1][0]-corners[0][0])*u+(corners[3][0]-corners[0][0])*v,
        y,
        corners[0][1]+(corners[1][1]-corners[0][1])*u+(corners[3][1]-corners[0][1])*v,
      ];
      quad(...corners.map(([x,z]) => [x,level,z]),0x57949e);
      for(let i=0;i<4;i++) {
        const a=corners[i],b=corners[(i+1)%4],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
        const nx=dz/length,nz=-dx/length;
        // One-metre rim sits outside the exact water polygon, with a low side foundation.
        quad([a[0],level+0.08,a[1]],[b[0],level+0.08,b[1]],[b[0]+nx,level+0.08,b[1]+nz],[a[0]+nx,level+0.08,a[1]+nz],0xd4cdbb);
        quad([a[0]+nx,groundY(a[0]+nx,a[1]+nz)-0.2,a[1]+nz],[b[0]+nx,groundY(b[0]+nx,b[1]+nz)-0.2,b[1]+nz],[b[0]+nx,level+0.08,b[1]+nz],[a[0]+nx,level+0.08,a[1]+nz],PALE);
      }
      detail=true;
      for(let lane=1;lane<6;lane++) {
        const u=lane/6,half=0.006;
        quad(point(u-half,0.03,level+0.012),point(u+half,0.03,level+0.012),point(u+half,0.97,level+0.012),point(u-half,0.97,level+0.012),0x315d68);
        for(const v of [0.06,0.94])quad(point(u-0.025,v-0.004,level+0.014),point(u+0.025,v-0.004,level+0.014),point(u+0.025,v+0.004,level+0.014),point(u-0.025,v+0.004,level+0.014),0x315d68);
      }
      // A level tiled apron joins the coping without filling the water polygon.
      const center=corners.reduce((p,q)=>[p[0]+q[0]/4,p[1]+q[1]/4],[0,0]);
      const deck=corners.map(([x,z])=>[center[0]+(x-center[0])*1.36,center[1]+(z-center[1])*1.18]);
      for(let i=0;i<4;i++) {
        const j=(i+1)%4,a=corners[i],b=corners[j],c=deck[j],d=deck[i];
        quad([a[0],level+0.04,a[1]],[b[0],level+0.04,b[1]],[c[0],level+0.04,c[1]],[d[0],level+0.04,d[1]],0xc3b49b);
        const count=Math.ceil(Math.hypot(c[0]-d[0],c[1]-d[1])/1.2);
        for(let k=0;k<=count;k++) {
          const t=k/count,p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],q=[d[0]+(c[0]-d[0])*t,d[1]+(c[1]-d[1])*t];
          quad([p[0],level+0.045,p[1]],[q[0],level+0.045,q[1]],[q[0]+0.025,level+0.045,q[1]],[p[0]+0.025,level+0.045,p[1]],0x9c947f);
        }
      }
      // Ground-following south lawn, backed by a high hedge beside the oval fence.
      for(const [x,z,w,d] of [[-88,-47,32,25],[-61,-69,14,38]]) {
        const lx=x-site.x,lz=z-site.z;
        quad(groundPoint(lx-w/2,lz-d/2,0.12),groundPoint(lx+w/2,lz-d/2,0.12),groundPoint(lx+w/2,lz+d/2,0.12),groundPoint(lx-w/2,lz+d/2,0.12),0x77904e);
      }
      for(let i=0;i<12;i++) {
        const x=-98+i*2.7,z=-24+i*0.35,lx=x-site.x,lz=z-site.z;
        block(lx,groundY(lx,lz)+1.25,lz,2.8,2.5,1.6,0x4c6740,-0.13);
        if(i%3===0) {
          const tx=lx+0.5,tz=lz+2;
          primitive(cylinder,tx,groundY(tx,tz)+3.3,tz,0.25,6.6,0.25,0x78654c);
          primitive(cylinder,tx,groundY(tx,tz)+7.3,tz,2.9,5,2.9,0x526f43);
        }
      }
    } else {
      block(0,4,0,28,16,50,0xa47553);
      block(0,13,0,29,2,51,0x77796f);
      // Contemporary glass chimney artwork on the historic demolished stack site.
      primitive(cylinder,-3,11.5,44,2.1,23,2.1,0xb8caca);
      block(-3,0.6,44,6,2.5,6,0x91684b);
      block(0,2.5,30,16,9,14,0xa47553);
      detail=true;
      for(const side of [-1,1]) for(let i=0;i<7;i++) {
        block(side*14.1,7,-21+i*7,0.15,7,3.6,GLASS);
        block(side*14.2,7,-21+i*7,0.2,0.2,3.8,PALE);
      }
      windows(25,-25.1,6,5,2,4);
      for(const side of [-1,1]) for(let i=0;i<8;i++) block(side*14.3,6,-24+i*7,0.7,13,0.8,0xc0966c);
    }
    // Near includes the silhouette batch; far renders only that coarse geometry.
    const meshes=[];
    for(let i=0;i<2;i++) {
      const batch=batches[i], geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(batch.positions,3));
      geometry.setAttribute('color',new THREE.Float32BufferAttribute(batch.colors,3)); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
      const mesh=new THREE.Mesh(geometry,i===0?nearMaterial:farMaterial); mesh.name=i===0?'Landmark nearby detail':'Landmark skyline'; group.add(mesh); meshes.push(mesh);
      stats.meshes++;stats.triangles+=batch.positions.length/9;
    }
    records.push({site,group,detail:meshes[0]});stats.landmarks++;
  }
  box.dispose();cylinder.dispose();
  function update(focus) {
    if(disposed)return;
    const x=focus?.x??focus?.position?.x??0,z=focus?.z??focus?.position?.z??0;
    stats.visibleNear=0;stats.visibleDistant=0;
    for(const record of records) {
      const distance=Math.hypot(record.site.x-x,record.site.z-z);
      record.group.visible=distance<FAR_RANGE+record.site.radius;
      record.detail.visible=distance<NEAR_RANGE+record.site.radius;
      if(record.group.visible) { if(record.detail.visible)stats.visibleNear++;else stats.visibleDistant++; }
    }
  }
  function dispose() {
    if(disposed)return;disposed=true;
    root.traverse(object=>{if(object.isMesh)object.geometry.dispose();});nearMaterial.dispose();farMaterial.dispose();root.removeFromParent();
    stats.visibleNear=0;stats.visibleDistant=0;
  }
  update(map.spawn);
  return {update,dispose,stats};
}
