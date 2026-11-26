import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import {indexStreetlights, STREETLIGHT_CAP} from './streetlights.js';

export const STREETLIGHT_VIEW_LIMITS = Object.freeze({
  maxDrawCalls:2, maxPoleInstances:880, maxGlowInstances:440, poleHeight:5.6, range:520, refreshTile:55,
});

function glowTexture() {
  const pixels = new Uint8Array(32*32*4);
  for (let y=0;y<32;y++) for (let x=0;x<32;x++) {
    const i=(y*32+x)*4;
    pixels[i]=pixels[i+1]=pixels[i+2]=255;
    pixels[i+3]=Math.round(255*Math.max(0,1-Math.hypot((x-15.5)/15.5,(y-15.5)/15.5))**2);
  }
  const map=new THREE.DataTexture(pixels,32,32);
  map.magFilter=map.minFilter=THREE.LinearFilter;map.needsUpdate=true;
  return map;
}

export function createStreetlightsView(scene, lamps = [], heightAt = () => 0) {
  const limits=STREETLIGHT_VIEW_LIMITS;
  const poleGeometry=new THREE.CylinderGeometry(.48,.52,1,8);
  const poleMaterial=new THREE.MeshLambertMaterial({color:0xffffff});
  const poles=new THREE.InstancedMesh(poleGeometry,poleMaterial,limits.maxPoleInstances);
  poles.name='Streetlight columns, outreach arms and luminaires';
  const texture=glowTexture(), glowGeometry=new THREE.PlaneGeometry(1,1);
  glowGeometry.rotateX(-Math.PI/2);
  // Flat additive glows need no front/back transparency sorting.
  const glowMaterial=new THREE.MeshBasicMaterial({color:0xffffff,map:texture,transparent:true,opacity:0,
    blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,
    toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2});
  const glow=new THREE.InstancedMesh(glowGeometry,glowMaterial,limits.maxGlowInstances);
  glow.name='Streetlight lenses and road illumination';
  for (const mesh of [poles,glow]) {
    mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(mesh.instanceMatrix.count*3),3).setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);
  }
  const valid=lamps.filter(lamp=>[lamp.x,lamp.z,lamp.yaw].every(Number.isFinite));
  const query=indexStreetlights(valid,160), meshParts=new WeakMap();
  const stats={lamps:0,placedLamps:valid.length,sourceColumns:valid.filter(lamp=>lamp.source==='ACT').length,
    visibleColumns:0,poleInstances:0,glowInstances:0,drawCalls:0,glowDrawCalls:0,maxDrawCalls:2,night:0,
    geometries:2,materials:2,textures:1,lights:0,queries:0,matrixWrites:0,disposed:false};
  const pose=new THREE.Object3D(), color=new THREE.Color(), nearby=[];
  let visible=[],next=[],lastX,lastZ,lastNight=NaN;

  function prepare(lamp) {
    if (meshParts.has(lamp)) return meshParts.get(lamp);
    const y=heightAt(lamp.x,lamp.z);
    if (!Number.isFinite(y)) {meshParts.set(lamp,null);return null;}
    const h=lamp.height || limits.poleHeight;
    const arm=Number.isFinite(lamp.outreach)?Math.max(.15,lamp.outreach):lamp.column==='heritage'?.65:1.25;
    const sin=Math.sin(lamp.yaw),cos=Math.cos(lamp.yaw);
    const headX=lamp.x+sin*arm,headZ=lamp.z-cos*arm;
    const reach=arm+h*.30, poolX=lamp.x+sin*reach,poolZ=lamp.z-cos*reach;
    const poolY=heightAt(poolX,poolZ), front=heightAt(poolX+sin*3,poolZ-cos*3),back=heightAt(poolX-sin*3,poolZ+cos*3);
    const incline=Number.isFinite(front)&&Number.isFinite(back)?Math.atan2(front-back,6):0;
    function part(x,y,z,pitch,w,height,depth,shade) {
      pose.position.set(x,y,z);pose.rotation.set(pitch,-lamp.yaw,0,'YXZ');
      pose.scale.set(w,height,depth);pose.updateMatrix();return [pose.matrix.clone(),shade];
    }
    const mast=lamp.column==='timber'?0x625448:lamp.column==='concrete'?0x99998e:lamp.column==='heritage'?0x435349:0x677078;
    const diameter=lamp.column==='concrete'||lamp.column==='timber'?.22:h>8?.18:.13;
    const tint=lamp.tint==='led'?0xfff1da:lamp.tint==='sodium'?0xffb05a:0xffdfa9;
    const length=h>8?.9:.61;
    const parts=[
      part(lamp.x,y+h/2,lamp.z,0,diameter,h,diameter,mast),
      part((lamp.x+headX)/2,y+h-.13,(lamp.z+headZ)/2,Math.PI/2,.083,arm,.083,mast),
      part(headX,y+h-.1,headZ,0,.37,.14,length,0x49525a),
      part(poolX,(Number.isFinite(poolY)?poolY:y)+.11,poolZ,incline,h*.84,1,h*1.38,tint),
      part(headX,y+h-.185,headZ,0,.31,1,length*.81,tint),
    ];
    meshParts.set(lamp,parts);
    return parts;
  }
  function write(mesh,index,part) {
    mesh.setMatrixAt(index,part[0]);mesh.setColorAt(index,color.setHex(part[1]));stats.matrixWrites++;
  }
  function dirty(mesh,start,end) {
    for(const attribute of [mesh.instanceMatrix,mesh.instanceColor]) {
      const offset=start*attribute.itemSize, limit=end*attribute.itemSize, pending=attribute.updateRanges[0];
      if (pending) {
        const pendingEnd=pending.start+pending.count;
        pending.start=Math.min(pending.start,offset);pending.count=Math.max(limit,pendingEnd)-pending.start;
      } else attribute.addUpdateRange(offset,limit-offset);
      attribute.needsUpdate=true;
    }
  }
  function select(focus) {
    const ok=Number.isFinite(focus?.x)&&Number.isFinite(focus?.z);
    const tx=ok?Math.floor(focus.x/limits.refreshTile):null,tz=ok?Math.floor(focus.z/limits.refreshTile):null;
    if(tx===lastX&&tz===lastZ)return false;
    lastX=tx;lastZ=tz;next.length=0;
    if(ok) {
      const x=(tx+.5)*limits.refreshTile,z=(tz+.5)*limits.refreshTile;
      query(x,z,limits.range,nearby);stats.queries++;
      if(nearby.length>STREETLIGHT_CAP)nearby.sort((a,b)=>
        (a.x-x)**2+(a.z-z)**2-((b.x-x)**2+(b.z-z)**2)||a.id.localeCompare(b.id));
      for(const lamp of nearby) {
        if(prepare(lamp))next.push(lamp);
        if(next.length===STREETLIGHT_CAP)break;
      }
      next.sort((a,b)=>a.id.localeCompare(b.id));
    }
    let first=next.length,last=-1;
    for(let i=0;i<next.length;i++) {
      if(next[i]===visible[i])continue;
      const parts=meshParts.get(next[i]);
      for(let j=0;j<3;j++)write(poles,i*3+j,parts[j]);
      for(let j=0;j<2;j++)write(glow,i*2+j,parts[j+3]);
      first=Math.min(first,i);last=i;
    }
    if(last>=first) {dirty(poles,first*3,(last+1)*3);dirty(glow,first*2,(last+1)*2);}
    stats.lamps=next.length;stats.visibleColumns=next.filter(lamp=>lamp.source==='ACT').length;
    stats.poleInstances=poles.count=next.length*3;stats.glowInstances=glow.count=next.length*2;
    poles.visible=next.length>0;
    const old=visible;visible=next;next=old;
    return true;
  }
  function update(focus,{night=0}={}) {
    if(stats.disposed)return;
    const changed=select(focus),value=Number.isFinite(night)?Math.max(0,Math.min(1,night)):0;
    if(!changed&&value===lastNight)return;
    lastNight=value;
    const alpha=Math.max(0,Math.min(1,(value-.55)/.25));
    glow.visible=alpha>0&&glow.count>0;glowMaterial.opacity=.55*alpha;
    stats.night=value;stats.glowDrawCalls=glow.visible?1:0;stats.drawCalls=(poles.visible?1:0)+stats.glowDrawCalls;
  }
  function dispose() {
    if(stats.disposed)return;
    update(null);stats.disposed=true;
    for(const mesh of [poles,glow]) {mesh.removeFromParent();mesh.dispose();mesh.geometry.dispose();mesh.material.dispose();}
    texture.dispose();nearby.length=visible.length=next.length=0;
  }
  return {update,get stats(){return Object.freeze({...stats});},dispose};
}
