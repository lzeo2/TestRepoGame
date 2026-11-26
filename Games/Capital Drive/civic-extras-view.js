import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { EXTRA_STORES, SKATEPARK, SKATEPARK_LANDMARK, RAMP_SURFACES, BARRIERS } from './civic-extras.js';

// Offline fallback lettering for renderers without a 2D canvas context.
const LETTERS=['01110 10001 10001 11111 10001 10001 10001','11110 10001 10001 11110 10001 10001 11110','01111 10000 10000 10000 10000 10000 01111','11110 10001 10001 10001 10001 10001 11110','11111 10000 10000 11110 10000 10000 11111','11111 10000 10000 11110 10000 10000 10000','01111 10000 10000 10111 10001 10001 01111','10001 10001 10001 11111 10001 10001 10001','11111 00100 00100 00100 00100 00100 11111','00111 00010 00010 00010 10010 10010 01100','10001 10010 10100 11000 10100 10010 10001','10000 10000 10000 10000 10000 10000 11111','10001 11011 10101 10101 10001 10001 10001','10001 11001 10101 10011 10101 10011 10001','01110 10001 10001 10001 10001 10001 01110','11110 10001 10001 11110 10000 10000 10000','01110 10001 10001 10001 10101 10010 01101','11110 10001 10001 11110 10100 10010 10001','01111 10000 10000 01110 00001 00001 11110','11111 00100 00100 00100 00100 00100 00100','10001 10001 10001 10001 10001 10001 01110','10001 10001 10001 10001 10001 01010 00100','10001 10001 10001 10101 10101 10101 01010','10001 10001 01010 00100 01010 10001 10001','10001 10001 01010 00100 00100 00100 00100','11111 00001 00010 00100 01000 10000 11111'];

// One small alpha atlas supplies all five styles without font files, network
// requests or an additional material. Unlettered geometry samples the white chip.
function makeSignAtlas() {
  const canvas = globalThis.document?.createElement?.('canvas');
  if (!canvas) return null;
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext?.('2d');
  const required = ['save', 'restore', 'fillRect', 'measureText', 'translate', 'scale', 'fillText'];
  if (!context || !required.every(name => typeof context[name] === 'function')) return null;
  if (!Number.isFinite(context.measureText('A').actualBoundingBoxAscent)) return null;
  context.fillStyle = '#fff';
  context.fillRect(0,0,8,8);
  const fonts = {
    'store-890228732': 'italic 900 30px sans-serif',
    'store-10679626475': 'italic 700 30px serif',
    'store-8196052995': '500 30px serif',
    'store-14065555895': '700 30px sans-serif',
    'store-2161998101': '700 30px serif'
  };
  const rows = new Map();
  for (const [i, store] of EXTRA_STORES.entries()) {
    context.save();
    context.font = fonts[store.id] || 'bold 30px sans-serif';
    const name = store.name.toUpperCase(), metrics = context.measureText(name);
    const top = 3+i*25, left = 16, width=480, height=20;
    const x = metrics.actualBoundingBoxLeft, y = metrics.actualBoundingBoxAscent;
    context.translate(left,top);
    context.scale(width/(x+metrics.actualBoundingBoxRight),height/(y+metrics.actualBoundingBoxDescent));
    context.fillText(name,x,y);
    context.restore();
    rows.set(store.id,[left/512,1-(top+height)/128,(left+width)/512,1-top/128]);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = 'Garema shop lettering';
  return {texture,rows};
}

export function createCivicExtrasView(scene,map,heightAt) {
  const root=new THREE.Group();root.name='Civic parody storefronts and interpreted skatepark';scene.add(root);
  const positions=[],colors=[],ranges=[];const tint=new THREE.Color();
  const atlas=makeSignAtlas(), signs=[];
  const ground=(x,z)=>{const y=heightAt(x,z);if(!Number.isFinite(y))throw new Error('Civic extras require finite terrain height');return y;};
  function tri(a,b,c,color) {tint.set(color);for(const p of [a,b,c]){positions.push(...p);colors.push(tint.r,tint.g,tint.b);}}
  function quad(a,b,c,d,color) {tri(a,b,c,color);tri(a,c,d,color);}
  function box(point,w,h,d,color) {
    const p=[[-w/2,0,-d/2],[w/2,0,-d/2],[w/2,h,-d/2],[-w/2,h,-d/2],[-w/2,0,d/2],[w/2,0,d/2],[w/2,h,d/2],[-w/2,h,d/2]].map(q=>point(...q));
    for(const f of [[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[1,5,6,2],[0,3,7,4]])quad(...f.map(i=>p[i]),color);
  }
  for (const store of EXTRA_STORES) {
    const start = positions.length / 3;
    const f = store.frontage, angle = f.yaw + Math.PI;
    const tx = Math.cos(angle), tz = -Math.sin(angle), nx = Math.sin(angle), nz = Math.cos(angle);
    const base = ground(f.x, f.z), width = f.width - .12;
    const at = (u, y, depth) => [f.x + tx*u + nx*depth, base + y, f.z + tz*u + nz*depth];
    const piece = (u, y, d, w, h, depth, color) => box((x,h1,z) => at(u+x, y+h1, d+z), w, h, depth, color);
    function panel(u, y, w, h, color, depth=.15) {
      quad(at(u-w/2,y,depth), at(u+w/2,y,depth), at(u+w/2,y+h,depth), at(u-w/2,y+h,depth), color);
    }
    function gradient(u, y, w, h, bottom, top, depth) {
      const corners=[at(u-w/2,y,depth),at(u+w/2,y,depth),at(u+w/2,y+h,depth),at(u-w/2,y+h,depth)];
      for (const i of [0,1,2,0,2,3]) {
        positions.push(...corners[i]);
        tint.set(i<2 ? bottom : top);
        colors.push(tint.r,tint.g,tint.b);
      }
    }
    function disc(u, y, radius, color, depth) {
      for (let i=0; i<10; i++) {
        const a=i*Math.PI/5,b=(i+1)*Math.PI/5;
        tri(at(u,y,depth),at(u+Math.cos(a)*radius,y+Math.sin(a)*radius,depth),at(u+Math.cos(b)*radius,y+Math.sin(b)*radius,depth),color);
      }
    }
    function word(label, available, y, d, ink, maxPixel=.078, slant=0) {
      const pixel = Math.min(maxPixel, available/(6*label.length-1));
      const left = -(6*label.length-1)*pixel/2;
      if (atlas) {
        signs.push({start:positions.length/3,uv:atlas.rows.get(store.id)});
        quad(at(left,y,d),at(-left,y,d),at(-left,y+7*pixel,d),at(left,y+7*pixel,d),ink);
        return;
      }
      for (let n=0; n<label.length; n++) {
        const char = label[n];
        const glyph = char === "'" ? '00100 00100 00000 00000 00000 00000 00000' : LETTERS[char.charCodeAt(0)-65];
        if (!glyph) continue;
        const rows = glyph.split(' ');
        // Coalesce horizontal runs. Even at walking distance the letters read
        // as solid ink, and three adjacent strokes still cost a single quad.
        for (let row=0; row<7; row++) {
          const base=y+(6-row)*pixel;
          for(const run of rows[row].matchAll(/1+/g)) {
            const start=left+(n*6+run.index+slant*(6-row))*pixel;
            const end=start+run[0].length*pixel;
            quad(at(start,base,d),at(end,base,d),at(end+slant*pixel,base+pixel,d),at(start+slant*pixel,base+pixel,d),ink);
          }
        }
      }
    }
    function glazing(frame, glass, doorWidth, sill) {
      piece(0, 0, 0, width, 2.63, .12, frame);
      const bay = (width-doorWidth)/2, middle = (doorWidth+bay)/2;
      for (const side of [-1,1]) {
        const x=side*middle, paneWidth=bay-.16;
        gradient(x,sill,paneWidth,2.45-sill,0x242e31,glass,.071);
        // Receding ceiling lines and a reflected band sit behind the window stock.
        const left=x-paneWidth/2,right=x+paneWidth/2;
        quad(at(left,1.48,.084),at(right,1.76,.084),at(right,1.84,.084),at(left,1.60,.084),0x45585c);
        for(const level of [1.82,2.24]) panel(x,level,paneWidth*.71,.025,0x9a967a,.086);
        panel(x,2.03,paneWidth,.055,frame,.098);
      }
      // The interaction origin in interiors.js is the centre of this opening.
      panel(0,.03,doorWidth-.07,2.4,0x232b2f,.074);
      gradient(0,.22,doorWidth-.18,1.9,0x273339,glass,.086);
      panel(0,.22,doorWidth-.18,.055,0x7c8582,.092);
      piece(doorWidth*.30,.88,.14,.045,.30,.05,0xd4cbb4);
    }
    function displayRow(centre, y, span, colors, depth, height=.33) {
      const step = span/colors.length;
      colors.forEach((color, i) => {
        const x = centre - span/2 + (i+.5)*step;
        panel(x,y,step*.82,height,color,depth);
        panel(x,y+height*.70,step*.52,height*.07,0xe2d7b7,depth+.006);
      });
    }
    const title = store.name.toUpperCase();
    if (store.id === 'store-890228732') { // Comic shop's two-tier billboard and dark window piers.
      glazing(0x242a29,0x334747,1.12,.19);
      piece(0,2.52,.17,width,.77,.36,0xf3ede1);
      piece(0,3.29,.10,width,.22,.24,0xe8b82c);
      panel(0,2.62,width*.92,.56,0xf2bc3a,.354);
      word(title,width*.82,2.67,.36,0x173143,.078,.16);
      for (const side of [-1,1]) {
        displayRow(side*width*.29,.39,width*.31,[0xab4451,0x60889c,0xd3a653],.12,.48);
        displayRow(side*width*.29,1.03,width*.31,[0x638f86,0xca7b47,0x98798c],.12,.45);
        for(let j=-1; j<=1; j++) {
          const u=side*width*.29+j*width*.31/3;
          tri(at(u-.12,.45,.135),at(u+.11,.45,.135),at(u+.03,.72,.135),0x52344a);
          disc(u-.04,1.19,.064,0xe3b476,.136);
        }
        piece(side*width*.29,.31,.17,width*.32,.055,.20,0x4b4845);
      }
    } else if (store.id === 'store-10679626475') { // Timber fascia, white transoms and a projecting blade.
      glazing(0xdddacc,0x526867,1.13,.13);
      piece(0,2.5,.13,width,.72,.30,0xa16b40);
      const boards=[0xaa7443,0xa66e3e,0xb17c48,0x956039,0xb17a47];
      for (let i=0; i<20; i++) {
        const u=(i-9.5)*width/20;
        gradient(u,2.51,width/20-.012,.70,boards[i%boards.length],0x9a693f,.283);
        panel(u-width/40+.015,2.51,.018,.70,0x714d31,.286);
      }
      word(title,width*.77,2.66,.30,0xffeed2,.064);
      piece(-width*.45,2.96,.54,.085,.07,1.00,0x383f3b);
      piece(-width*.45,2.54,.71,.065,.40,.83,0xeee2ca);
      for (const side of [-1,1]) {
        const u=-width*.45+side*.035;
        quad(at(u,2.66,.43),at(u,2.66,1.00),at(u,2.77,1.00),at(u,2.77,.43),0x9f3c32);
        displayRow(side*width*.29,.51,width*.31,[0x94785a,0x895663,0x708782,0x947d91],.12,.36);
        piece(side*width*.29,.41,.18,width*.32,.08,.20,0x837568);
        const sleeve=side*width*.27;
        panel(sleeve,1.12,.58,.52,0xc2b7a5,.125);
        disc(sleeve,1.39,.21,0x25282c,.134);
        disc(sleeve,1.39,.052,0xc17e60,.138);
      }
    } else if (store.id === 'store-8196052995') { // The corner cafe's black ribbon fascia and white fanlights.
      glazing(0xe7e0cd,0x3a4d52,1.07,.19);
      for (const side of [-1,1]) {
        const bay=(width-1.07)/2, centre=side*(width-bay)/2, radius=(bay-.12)/2;
        for (let i=0; i<10; i++) {
          const a=i*Math.PI/10, b=(i+1)*Math.PI/10;
          const curve=(t,r)=>at(centre+Math.cos(t)*r,1.86+Math.sin(t)*r*.66,.133);
          quad(curve(a,radius),curve(b,radius),curve(b,radius-.06),curve(a,radius-.06),0xf5ebd6);
        }
        for(const fraction of [-.33,.33]) panel(centre+radius*fraction,.2,.045,1.67,0xe7e0cd,.132);
        panel(centre,1.83,bay-.12,.055,0xf1e8d6,.14);
      }
      piece(0,2.61,.12,width,.68,.27,0x26282a);
      word(title,width*.85,2.71,.264,0xf2ece2,.066);
      // Gelato tubs sit inside the display bay, clear of the doorway and pedestrian path.
      const counter=width*.30;
      piece(counter,.45,.21,width*.28,.22,.34,0xe1d5c1);
      displayRow(counter,.67,width*.27,[0xc18f9a,0xa9ac81,0xe0c69c,0xbd9470],.28,.13);
    } else if (store.id === 'store-14065555895') { // Two-sided box displays below the broad shop fascia.
      glazing(0x393c3e,0x536263,1.27,.16);
      piece(0,2.55,.13,width,.76,.30,0xe5dfcd);
      piece(0,2.54,.25,width,.10,.58,0x854c53);
      word(title,width*.72,2.76,.292,0x34383f,.066);
      for (const side of [-1,1]) {
        const left=side*width*.30, span=width*.31;
        const boxes=[0x8b9fa8,0xa5a15d,0xb06a51,0x69758f];
        for(let row=0; row<3; row++) {
          displayRow(left,.32+row*.42,span,boxes,.122,.32);
          panel(left,.27+row*.42,span+.02,.045,0xab9977,.14);
          for(let j=0;j<4;j++) {
            const x=left+(j-1.5)*span/4, y=.36+row*.42;
            tri(at(x-.11,y,.139),at(x+.05,y,.139),at(x+.105,y+.14,.139),0xcebc96);
          }
          boxes.push(boxes.shift());
        }
      }
    } else if (store.id === 'store-2161998101') { // The restaurant is a compact signed portal in the shared building.
      const portal=Math.min(width,3.05);
      piece(0,0,.01,portal,2.86,.13,0xdcdacf);
      panel(0,.04,1.17,2.25,0x202a2c,.095);
      // Shaded recessed entrance with a visible threshold; the usable door stays centred.
      gradient(0,.045,1.04,2.13,0x42484b,0x1c2528,.101);
      quad(at(-.51,.05,.106),at(-.31,.30,.106),at(-.31,2.01,.106),at(-.51,2.17,.106),0x555f60);
      panel(0,.04,1.14,.035,0xb4ae9e,.135);
      for (const side of [-1,1]) {
        gradient(side*portal*.34,.16,portal*.24,2.08,0x343d41,0x697573,.11);
        if (side===1) for(let row=0;row<3;row++) {
          displayRow(portal*.34,.68+row*.35,portal*.20,[0xc59368,0x997362],.14,.23);
        }
      }
      piece(0,2.41,.16,portal,.70,.22,0xcaa45c);
      panel(0,2.46,portal-.10,.59,0xa23031,.28);
      word(title,portal-.35,2.54,.29,0xffd77c,.062);
      piece(-portal/2+.075,0,.13,.11,2.42,.16,0xad3738);
    }
    ranges.push({x:f.x,z:f.z,start,count:positions.length/3-start,visible:true});
  }
  const skateStart=positions.length/3,boundary=SKATEPARK.polygon.slice(0,-1);
  for(const indices of THREE.ShapeUtils.triangulateShape(boundary.map(p=>new THREE.Vector2(...p)),[])) {
    const p=indices.map(i=>{const [x,z]=boundary[i];return [x,ground(x,z)+.035,z];});tri(p[2],p[1],p[0],0xa8aaa3);
  }
  const rampEdges=new Map();
  for(const surface of RAMP_SURFACES)for(const triangle of surface.triangles) {
    tri(...triangle.map(([x,y,z])=>[x,ground(x,z)+.045+y,z]),0xbcbcb2);
    for(let i=0;i<3;i++) {
      const a=triangle[i],b=triangle[(i+1)%3],key=[a.join(','),b.join(',')].sort().join('|');
      const edge=rampEdges.get(key);if(edge)edge.count++;else rampEdges.set(key,{a,b,count:1});
    }
  }
  let copingEdges=0;
  for(const {a,b,count} of rampEdges.values())if(count===1&&(a[1]>0||b[1]>0)) {
    const ga=ground(a[0],a[2])+.045,gb=ground(b[0],b[2])+.045;
    quad([a[0],ga,a[2]],[b[0],gb,b[2]],[b[0],gb+b[1],b[2]],[a[0],ga+a[1],a[2]],0x90958f);
    const length=Math.hypot(b[0]-a[0],b[2]-a[2]);
    if(length>.08&&Math.min(a[1],b[1])>.45&&Math.abs(a[1]-b[1])/length<.10){
      // Metal coping follows the existing curved ramp and ledge crests. The
      // axle-worn crown catches the light above its darker steel shoulders.
      const nx=(a[2]-b[2])/length,nz=(b[0]-a[0])/length;
      const p=(v,base,offset,h)=>[v[0]+nx*offset,base+v[1]+h,v[2]+nz*offset];
      for(const [u,v,h,k,tint] of [[-.05,-.025,0,.033,0x777f82],[-.025,.025,.033,.033,0xcbd1cf],[.025,.05,.033,0,0x858c8b]])
        quad(p(a,ga,u,h),p(b,gb,u,h),p(b,gb,v,k),p(a,ga,v,k),tint);
      copingEdges++;
    }
  }
  for(const rail of BARRIERS) {
    const dx=rail.b[0]-rail.a[0],dz=rail.b[1]-rail.a[1],length=Math.hypot(dx,dz),tx=dx/length,tz=dz/length,nx=-tz,nz=tx;
    const centre=[(rail.a[0]+rail.b[0])/2,(rail.a[1]+rail.b[1])/2],base=ground(...centre);
    box((x,y,z)=>[centre[0]+tx*x+nx*z,base+rail.height+y,centre[1]+tz*x+nz*z],length,.09,.09,0x394147);
    for(const p of [rail.a,rail.b])box((x,y,z)=>[p[0]+x,ground(...p)+y,p[1]+z],.09,rail.height,.09,0x394147);
  }
  ranges.push({x:SKATEPARK_LANDMARK.x,z:SKATEPARK_LANDMARK.z,start:skateStart,count:positions.length/3-skateStart,visible:true});
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  if (atlas) {
    const uvs=new Float32Array(positions.length/3*2);
    for (let i=0; i<uvs.length; i+=2) { uvs[i]=4/512; uvs[i+1]=1-4/128; }
    for (const {start,uv:[u0,v0,u1,v1]} of signs) {
      uvs.set([u0,v0,u1,v0,u1,v1,u0,v0,u1,v1,u0,v1],start*2);
    }
    geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));
  }
  const material=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide,map:atlas?.texture??null,alphaTest:atlas?.texture ? .4 : 0});
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;root.add(mesh);
  // Static positions, colours and normals remain on the GPU. Pack just the
  // indices for nearby sites on a visibility change; hidden triangles never draw.
  const vertexCount = geometry.getAttribute('position').count;
  const IndexArray = vertexCount > 65535 ? Uint32Array : Uint16Array;
  const index = new THREE.BufferAttribute(new IndexArray(vertexCount), 1).setUsage(THREE.DynamicDrawUsage);
  for (let i=0; i<vertexCount; i++) index.array[i]=i;
  geometry.setIndex(index);
  let disposed = false, visible = 0;
  function update(focus) {
    if (disposed) return;
    let changed = false;
    for (const range of ranges) {
      const dx = focus ? focus.x-range.x : Infinity, dz = focus ? focus.z-range.z : Infinity;
      const show = dx*dx+dz*dz < 190*190;
      if (show !== range.visible) { range.visible = show; changed = true; }
    }
    if (!changed) return;
    let count = 0;
    visible = 0;
    for (const range of ranges) {
      if (!range.visible) continue;
      visible++;
      for (let i=range.start; i<range.start+range.count; i++) index.array[count++] = i;
    }
    index.clearUpdateRanges();
    if (count) {
      index.addUpdateRange(0, count);
      index.needsUpdate = true;
    }
    geometry.setDrawRange(0, count);
    mesh.visible = count > 0;
  }
  update(null);
  return {update,get stats(){return {sites:EXTRA_STORES.length,skateparks:1,copingEdges,visible,drawCalls:visible?1:0,triangles:vertexCount/3,drawnTriangles:disposed?0:geometry.drawRange.count/3,geometryCount:1,materialCount:1,textureCount:atlas?1:0,disposed};},
    dispose(){if(disposed)return;disposed=true;visible=0;scene.remove(root);geometry.dispose();material.dispose();atlas?.texture.dispose();}};
}
