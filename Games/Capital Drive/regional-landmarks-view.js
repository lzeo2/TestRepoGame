import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import {regionalExteriorParts,addRegionalFrontage,addStadiumStand,addSchoolSolar,exteriorSign} from './regional-streetscapes.js';

const MAX_SITES=41,MAX_VERTICES=1024,MAX_DETAIL_TRIANGLES=1600,BODY_RANGE=650,DETAIL_RANGE=280;
const DESIGNS={
  arena:{wall:0xb7b8ac,roof:0x6e7778,trim:0xddd9c8,accent:0x344d63,glass:0x5b7884,spacing:11},
  mall:{wall:0xc4b39a,roof:0x85887e,trim:0xe5dac3,accent:0x705444,glass:0x54747b,spacing:15},
  library:{wall:0xd6cbb7,roof:0x737e7d,trim:0xebe1c9,accent:0x354f64,glass:0x66858b,spacing:5},
  hospital:{wall:0xd3d3c7,roof:0x85918d,trim:0xe9e4d4,accent:0x496b7b,glass:0x68878d,spacing:6},
  campus:{wall:0xa88c74,roof:0x6c7978,trim:0xd9ceb4,accent:0x45584d,glass:0x58727b,spacing:5},
  exhibition:{wall:0xb4a58a,roof:0x7b8785,trim:0xd6d0b9,accent:0x5d626c,glass:0x587780,spacing:12},
};
// Original 3x5 facade lettering, never a supplied logo/font/texture.
const FONT={A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',J:'001001001101010',K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'101111111111101',O:'010101101101010',P:'110101110100100',Q:'010101101111011',R:'110101110101101',S:'011100010001110',T:'111010010010010',U:'101101101101111',V:'101101101101010',W:'101101111111101',X:'101101010101101',Y:'101101010010010',Z:'111001010100111','0':'111101101101111','1':'010110010010111','2':'110001010100111','3':'110001010001110','4':'101101111001001','5':'111100110001110','6':'011100111101111','7':'111001010010010','8':'111101111101111','9':'111101111001110','-':'000000111000000'};
const ring=points=>{
  if(!Array.isArray(points)||points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))return null;
  const copy=points.map(p=>[...p]);if(copy.length>1&&copy[0][0]===copy.at(-1)[0]&&copy[0][1]===copy.at(-1)[1])copy.pop();
  return copy.length>=3?copy:null;
};
const signedArea=points=>points.reduce((n,p,i)=>{const q=points[(i+1)%points.length];return n+p[0]*q[1]-q[0]*p[1];},0)/2;

// Interpretive facade architecture on exact mapped footprints and source heights.
// Silhouette additions and facade projections are visual only; physics keeps the source polygon.
export function createRegionalLandmarksView(scene,map,heightAt){
  if(typeof heightAt!=='function')throw new TypeError('Regional landmarks require terrain heights');
  const root=new THREE.Group();root.name='Regional source-footprint landmarks';scene.add(root);
  const body={positions:[],colors:[]},detail={positions:[],colors:[]},sites=[],managed=[],used=new Set();
  const color=new THREE.Color();let disposed=false,rejected=0;
  function tri(batch,a,b,c,tint){color.setHex(tint);for(const p of [a,b,c]){batch.positions.push(...p);batch.colors.push(color.r,color.g,color.b);}}
  const quad=(batch,a,b,c,d,tint)=>{tri(batch,a,b,c,tint);tri(batch,a,c,d,tint);};
  // At the tips of a seat bowl or arched fascia a quad can taper to a
  // triangle. Test at upload precision so zero-area faces never reach the GPU.
  function hasArea(p,q,r){
    const dx=Math.fround(q[0])-Math.fround(p[0]),dy=Math.fround(q[1])-Math.fround(p[1]),dz=Math.fround(q[2])-Math.fround(p[2]);
    const ex=Math.fround(r[0])-Math.fround(p[0]),ey=Math.fround(r[1])-Math.fround(p[1]),ez=Math.fround(r[2])-Math.fround(p[2]);
    return (dy*ez-dz*ey)**2+(dz*ex-dx*ez)**2+(dx*ey-dy*ex)**2>1e-12;
  }
  function taperedQuad(batch,a,b,c,d,tint){
    if(hasArea(a,b,c))tri(batch,a,b,c,tint);
    if(hasArea(a,c,d))tri(batch,a,c,d,tint);
  }
  const places=[],regionalParts=[];
  for(const place of map.regionalPlaces||[]){
    const parts=regionalExteriorParts(place);
    if(parts)regionalParts.push(...parts);
    else if(place.design&&places.length<24)places.push(place);
  }
  const dickson=map.landmarks?.find(place=>place.id==='dickson-library'&&place.sourceBuildingId==='osm-5124277');
  if(dickson)places.push({...dickson,design:'library',buildingId:dickson.sourceBuildingId});
  places.push(...regionalParts);
  const requested=new Set(places.map(place=>place.buildingId)),buildings=new Map();
  for(const building of map.buildings||[])if(requested.has(building.id)){
    buildings.set(building.id,building);
    if(buildings.size===requested.size)break;
  }
  let masts=0,stays=0;
  for(const place of places){
    if(!place.design)continue;
    if(sites.length>=MAX_SITES)break;
    if(!Object.hasOwn(DESIGNS,place.design)){rejected++;continue;}
    const source=buildings.get(place.buildingId);
    const heritage=place.id==='belconnen-library'||place.id==='dickson-library';
    const gallery=place.id==='belconnen-arts-centre';
    const palette=place.palette||(place.id==='dickson-library'?{...DESIGNS.library,wall:0x69534b,trim:0xc0beb4,accent:0x454541,glass:0x505d5e}:
      place.id==='belconnen-library'?{...DESIGNS.library,wall:0xd5d0ba,trim:0xe3ddcf,accent:0x544e40,glass:0x536565}:
      place.id==='ais-arena'?{...DESIGNS.arena,wall:0xc0b7a4,roof:0xb9b9b1,trim:0xd6d9d1,glass:0x75888a,accent:0x40566f}:
      gallery?{...DESIGNS.exhibition,wall:0x515453,roof:0x646867,trim:0x9c9d97,accent:0x393c3c,glass:0x576d72}:DESIGNS[place.design]);
    const outer=source&&ring(source.points),holes=source&&(source.innerRings||[]).map(h=>ring(h.points||h));
    const height=source?.height;
    if(!palette||!outer||holes.some(h=>!h)||!(Number.isFinite(height)&&height>0)||used.has(source.id)||
      outer.length+holes.reduce((n,h)=>n+h.length,0)>MAX_VERTICES||Math.abs(signedArea(outer))<.01){rejected++;continue;}
    const xs=outer.map(p=>p[0]),zs=outer.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
    const x=(minX+maxX)/2,z=(minZ+maxZ)/2;
    const ground=Number.isFinite(source.y)?source.y:heightAt(x,z),samples=[outer,...holes].flat().map(p=>heightAt(...p));
    if(!Number.isFinite(ground)||samples.some(y=>!Number.isFinite(y))){rejected++;continue;}
    const roof=ground+height,startBody=body.positions.length,startDetail=detail.positions.length;
    const stadium=place.variant==='stadium';
    const detailQuad=(...args)=>{if((detail.positions.length-startDetail)/9+2<=MAX_DETAIL_TRIANGLES)taperedQuad(detail,...args);};
    if(stadium&&!addStadiumStand({outer,place,ground,height,
      bodyQuad:(...args)=>taperedQuad(body,...args),
      detailQuad
    })){rejected++;continue;}
    const edges=[];
    if(!stadium)for(const [index,outline] of [outer,...holes].entries()){
      const orientation=(signedArea(outline)>0?1:-1)*(index===0?1:-1);
      for(let i=0;i<outline.length;i++){
        const a=outline[i],b=outline[(i+1)%outline.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
        if(length<.01)continue;
        const aBase=Math.min(heightAt(...a)-.12,ground),bBase=Math.min(heightAt(...b)-.12,ground);
        const points=[[a[0],aBase,a[1]],[a[0],roof,a[1]],[b[0],roof,b[1]],[b[0],bBase,b[1]]];
        if(orientation<0)points.reverse();quad(body,...points,index?palette.trim:palette.wall);
        if(!index)edges.push({a,b,length,tx:dx/length,tz:dz/length,nx:dz/length*orientation,nz:-dx/length*orientation});
      }
    }
    const flat=[...outer,...holes.flat()];
    const faces=stadium?[]:THREE.ShapeUtils.triangulateShape(outer.map(p=>new THREE.Vector2(...p)),holes.map(h=>h.map(p=>new THREE.Vector2(...p))));
    for(const face of faces){const points=face.map(i=>[flat[i][0],roof,flat[i][1]]);if(signedArea(points.map(p=>[p[0],p[2]]))>0)points.reverse();tri(body,...points,palette.roof);}
    if(place.id==='ais-arena'&&edges.length>=4){
      // Twelve external masts and 36 stays identify the AIS roof. Slice the
      // footprint instead of assuming a rectangular plan or a north-facing arena.
      const axis=edges.reduce((best,e)=>e.length>best.length?e:best);
      const uv=outer.map(([px,pz])=>[(px-x)*axis.tx+(pz-z)*axis.tz,(px-x)*axis.nx+(pz-z)*axis.nz]);
      const low=Math.min(...uv.map(p=>p[0])),high=Math.max(...uv.map(p=>p[0]));
      const point=(u,v,h)=>[x+axis.tx*u+axis.nx*v,roof+h,z+axis.tz*u+axis.nz*v];
      for(let column=0;column<6;column++){
        const u=low+(high-low)*(.11+column*.156),cross=[];
        for(let i=0;i<uv.length;i++){
          const a=uv[i],b=uv[(i+1)%uv.length];
          if((a[0]<=u&&u<b[0])||(b[0]<=u&&u<a[0]))cross.push(a[1]+(b[1]-a[1])*(u-a[0])/(b[0]-a[0]));
        }
        if(cross.length!==2)continue;
        const mid=(cross[0]+cross[1])/2;
        for(const v of cross){
          const sign=Math.sign(v-mid),foot=v+sign*3.2,head=v-sign*1.75,tip=7.2;
          // Dark compression masts rake from the grass past the pale roof. A
          // four-sided section and offset stay anchor read clearly at street level.
          const section=(v,y,r)=>[point(u-r,v-r,y),point(u+r,v-r,y),point(u+r,v+r,y),point(u-r,v+r,y)];
          const lower=section(foot,-height,.39),upper=section(head,tip,.27);
          for(let j=0;j<4;j++)quad(body,lower[j],lower[(j+1)%4],upper[(j+1)%4],upper[j],j%2?0x33383b:0x55585a);
          masts++;
          for(const offset of [-3.6,0,3.6]){
            const end=offset===0?foot+sign*1.2:head*.40+mid*.60,anchorY=offset===0?-height:.06;
            quad(body,point(u-.095,head,tip-.2),point(u+.095,head,tip-.2),point(u+offset+.095,end,anchorY),point(u+offset-.095,end,anchorY),0x444c50);stays++;
          }
        }
      }
    }
    // Edges and entry selection belong to this source outline, never an inferred
    // rectangular replacement or an extra physical footprint on the public road.
    const px=Number.isFinite(place.x)?place.x:x,pz=Number.isFinite(place.z)?place.z:z;
    const front=edges.filter(e=>e.length>=4).sort((a,b)=>{
      if(place.variant){
        const alignment=e=>place.frontage?Math.max(0,e.nx*place.frontage[0]+e.nz*place.frontage[1]):1;
        return b.length*alignment(b)-a.length*alignment(a);
      }
      const da=((a.a[0]+a.b[0])/2-px)**2+((a.a[1]+a.b[1])/2-pz)**2;
      const db=((b.a[0]+b.b[0])/2-px)**2+((b.a[1]+b.b[1])/2-pz)**2;return da-db||b.length-a.length;
    })[0];
    const at=(edge,u,y,depth)=>[edge.a[0]+edge.tx*u+edge.nx*depth,y,edge.a[1]+edge.tz*u+edge.nz*depth];
    function strip(edge,u0,u1,y0,y1,tint,depth=.045){
      if(u1<=u0||y1<=y0||(detail.positions.length-startDetail)/9+2>MAX_DETAIL_TRIANGLES)return;
      quad(detail,at(edge,u0,y0,depth),at(edge,u0,y1,depth),at(edge,u1,y1,depth),at(edge,u1,y0,depth),tint);
    }
    function ledge(edge,u0,u1,y,depth,thickness,tint){
      if(u1<=u0||(detail.positions.length-startDetail)/9+10>MAX_DETAIL_TRIANGLES)return;
      strip(edge,u0,u1,y-thickness,y,tint,depth);
      quad(detail,at(edge,u0,y,0),at(edge,u1,y,0),at(edge,u1,y,depth),at(edge,u0,y,depth),tint);
      quad(detail,at(edge,u0,y-thickness,depth),at(edge,u1,y-thickness,depth),at(edge,u1,y-thickness,0),at(edge,u0,y-thickness,0),0x504f49);
      for(const u of [u0,u1]){
        if((detail.positions.length-startDetail)/9+2>MAX_DETAIL_TRIANGLES)break;
        quad(detail,at(edge,u,y,0),at(edge,u,y,depth),at(edge,u,y-thickness,depth),at(edge,u,y-thickness,0),tint);
      }
    }
    if(place.variant&&!stadium)addRegionalFrontage({place,edges,front,ground,height,strip,ledge,at,face:detailQuad});
    if(place.variant&&place.design==='campus'&&!holes.length)addSchoolSolar({outer,roof,edge:front,face:detailQuad});
    if(front&&height>=3&&(!place.variant||place.showLabel)){
      const mid=front.length/2,entry=Math.min(5,front.length*.40),doorTop=ground+Math.min(3.3,height*.62);
      if(!place.variant){
        strip(front,mid-entry/2,mid+entry/2,ground+.1,doorTop,0x2b3b43,.09);
        strip(front,mid-entry/2-.16,mid-entry/2,ground+.05,doorTop+.2,palette.trim,.13);
        strip(front,mid+entry/2,mid+entry/2+.16,ground+.05,doorTop+.2,palette.trim,.13);
        strip(front,mid-entry/2-.16,mid+entry/2+.16,doorTop,doorTop+.2,palette.accent,.13);
        strip(front,mid-.04,mid+.04,ground+.1,doorTop,palette.trim,.14);
        if(front.length>8&&height>4) {
          const half=Math.min(front.length*.40,place.design==='mall'?7.5:4);
          ledge(front,mid-half,mid+half,doorTop+.35,place.design==='mall'?1.45:.8,.16,palette.trim);
        }
      }
      const sign=exteriorSign(place,height);
      const label=String(sign?.text||place.name||'').normalize('NFKD').replace(/[^A-Za-z0-9 -]/g,'').toUpperCase().slice(0,24);
      const pixel=Math.min(sign?.pixel??.17,(front.length-.8)/Math.max(1,label.length*4)),span=Math.max(0,(label.length*4-1)*pixel);
      const y=ground+(sign?.height??Math.min(height-1.12,Math.max(3.2,height*.72)));
      if(label&&pixel>.035){
        strip(front,mid-span/2-.18,mid+span/2+.18,y-.12,y+pixel*5+.12,sign?.board??palette.accent,sign?.depth??.15);
        // In XZ, screen right when looking at the exterior is (nz,-nx).
        // A clockwise source ring and a counterclockwise ring need opposite U.
        const reverseText=front.tx*front.nz-front.tz*front.nx<0;
        for(let letter=0;letter<label.length;letter++){
          const glyph=FONT[label[letter]];if(!glyph)continue;
          for(let row=0;row<5;row++)for(let col=0;col<3;col++)if(glyph[row*3+col]==='1'){
            const local=mid-span/2+(letter*4+col)*pixel;
            const u=reverseText?front.length-local-pixel*.88:local,low=y+(4-row)*pixel;
            strip(front,u,u+pixel*.88,low,low+pixel*.88,sign?.ink??0xf0e8d4,sign?sign.depth+.014:.16);
          }
        }
      }
    }
    const decorated=place.variant?[]:edges.filter(e=>e.length>=3).sort((a,b)=>Number(b===front)-Number(a===front)||b.length-a.length).slice(0,20);
    for(const edge of decorated){
      strip(edge,0,edge.length,roof-Math.min(.45,height*.10),roof,palette.trim,.025);
      if(heritage&&edge.length>5){
        // Taglietti's deep shadow line and off-form Dickson fascia differ
        // from Belconnen's off-white continuous horizontal concrete band.
        ledge(edge,.05,edge.length-.05,roof,place.id==='dickson-library'?1.25:1.6,
          Math.min(height*.18,place.id==='dickson-library'?.86:.60),palette.trim);
      }
      if(place.id==='ais-arena'&&edge.length>=12){
        strip(edge,edge.length*.05,edge.length*.45,ground+height*.31,ground+height*.60,0x52677e,.11);
        const panels=Math.min(18,Math.floor(edge.length/4));
        for(let i=0;i<panels;i++){
          const u0=i*edge.length/panels+.07,u1=(i+1)*edge.length/panels-.07;
          const y0=i%2?roof-.26:roof-1.45,y1=i%2?roof-1.45:roof-.26;
          if((detail.positions.length-startDetail)/9+2<=MAX_DETAIL_TRIANGLES)
            quad(detail,at(edge,u0,y0,.14),at(edge,u1,y1,.14),at(edge,u1,y1+.105,.14),at(edge,u0,y0+.105,.14),0xe1dfcf);
        }
      }
      if(edge.length<3||height<2.5)continue;
      const rows=place.design==='arena'||place.design==='exhibition'?1:Math.min(5,Math.max(1,Math.floor((height-1)/3.2)));
      const bays=Math.min(18,Math.max(1,Math.floor(edge.length/palette.spacing))),bay=edge.length/bays;
      for(let row=0;row<rows;row++){
        const low=ground+(place.design==='arena'?Math.min(height-1.8,Math.max(2,height*.62)):place.design==='exhibition'?Math.min(height-1.8,Math.max(1.5,height*.44)):Math.min(height-1.8,1.1+row*(height-2)/rows)),high=Math.min(roof-.65,low+Math.min(1.55,height*.22));
        strip(edge,.25,edge.length-.25,low,high,palette.glass);
        strip(edge,.25,edge.length-.25,high-.12,high,0xa2b7b5,.052);
        for(let column=1;column<bays;column++){
          strip(edge,column*bay-.06,column*bay+.06,low,high,palette.trim,.065);
        }
        if(row===0&&edge.length>=6){
          // A projecting sill with a shaded return remains legible in a moving car.
          ledge(edge,.25,edge.length-.25,low+.04,heritage?.28:.18,.13,palette.trim);
          if(gallery){
            for(let column=0;column<bays;column++)for(let j=1;j<=3;j++) {
              const u=(column+j/4)*bay;
              strip(edge,u-.045,u+.045,high+.12,roof-.25,0x818582,.065);
            }
          }
        }
      }
      if(['arena','campus','library','exhibition'].includes(place.design)){
        for(let i=1;i<bays;i++)strip(edge,i*bay-.13,i*bay+.13,ground+.2,roof-.5,palette.trim,.085);
      }
    }
    used.add(source.id);managed.push(source.id);
    sites.push({id:place.id,buildingId:source.id,design:place.design,minX,maxX,minZ,maxZ,
      bodyStart:startBody/3,bodyCount:(body.positions.length-startBody)/3,
      detailStart:startDetail/3,detailCount:(detail.positions.length-startDetail)/3,bodyShown:true,detailShown:true});
  }
  function batchMesh(batch,name){
    if(!batch.positions.length)return null;
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(batch.positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(batch.colors,3));geometry.computeVertexNormals();
    const vertices=geometry.attributes.position.count;
    const Index=vertices>65535?Uint32Array:Uint16Array;
    geometry.setIndex(new THREE.BufferAttribute(new Index(vertices),1).setUsage(THREE.DynamicDrawUsage));
    geometry.setDrawRange(0,0);
    const material=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.frustumCulled=false;root.add(mesh);
    return {mesh};
  }
  let bodyBatch=batchMesh(body,'Exact sourced landmark shells'),detailBatch=batchMesh(detail,'Original regional landmark facade accents');
  body.positions.length=body.colors.length=detail.positions.length=detail.colors.length=0;
  const batches=[bodyBatch,detailBatch].filter(Boolean);
  let visible=0,detailed=0,visibleTriangles=0,lastX,lastZ;
  // Each geometry is immutable. Rebuild its small index prefix only when a site
  // enters/leaves range. Distant sites consume neither draw calls nor vertex work.
  function select(batch,layer){
    if(!batch)return;
    const geometry=batch.mesh.geometry,index=geometry.index;
    let count=0;
    for(const site of sites)if(site[layer+'Shown']){
      const start=site[layer+'Start'],end=start+site[layer+'Count'];
      for(let i=start;i<end;i++)index.array[count++]=i;
    }
    geometry.setDrawRange(0,count);batch.mesh.visible=count>0;
    if(count){index.clearUpdateRanges();index.addUpdateRange(0,count);index.needsUpdate=true;}
  }
  function update(focus){
    if(disposed)return;
    const valid=focus&&Number.isFinite(focus.x)&&Number.isFinite(focus.z);
    const x=valid?focus.x:null,z=valid?focus.z:null;
    if(x===lastX&&z===lastZ)return;
    lastX=x;lastZ=z;visible=detailed=visibleTriangles=0;
    let bodiesChanged=false,detailsChanged=false;
    for(const site of sites){
      const dx=valid?Math.max(0,site.minX-focus.x,focus.x-site.maxX):Infinity;
      const dz=valid?Math.max(0,site.minZ-focus.z,focus.z-site.maxZ):Infinity;
      const distance=dx*dx+dz*dz,showBody=distance<BODY_RANGE**2,showDetail=distance<DETAIL_RANGE**2;
      if(showBody){visible++;visibleTriangles+=site.bodyCount/3;}if(showDetail){detailed++;visibleTriangles+=site.detailCount/3;}
      if(showBody!==site.bodyShown){site.bodyShown=showBody;bodiesChanged=true;}
      if(showDetail!==site.detailShown){site.detailShown=showDetail;detailsChanged=true;}
    }
    if(bodiesChanged)select(bodyBatch,'body');
    if(detailsChanged)select(detailBatch,'detail');
  }
  update(null);
  return {update,managedBuildingIds:Object.freeze(managed),
    get stats(){return {sites:sites.length,rejected,aisMasts:masts,aisStays:stays,visible,detailed,drawCalls:disposed?0:Number(visible>0&&!!bodyBatch)+Number(detailed>0&&!!detailBatch),
      triangles:disposed?0:batches.reduce((n,b)=>n+(b.mesh.visible?b.mesh.geometry.drawRange.count/3:0),0),visibleTriangles:disposed?0:visibleTriangles,
      geometryCount:disposed?0:batches.length,materialCount:disposed?0:batches.length,textureCount:0,bodyRange:BODY_RANGE,detailRange:DETAIL_RANGE,capacity:MAX_SITES,maxVerticesPerSite:MAX_VERTICES,maxDetailTrianglesPerSite:MAX_DETAIL_TRIANGLES,disposed};},
    dispose(){if(disposed)return;disposed=true;visible=detailed=visibleTriangles=0;scene.remove(root);for(const b of batches){b.mesh.geometry.dispose();b.mesh.material.dispose();}batches.length=0;bodyBatch=detailBatch=null;root.clear();},
  };
}
