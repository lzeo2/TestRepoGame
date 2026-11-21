import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

const CAMERA_MARKS=Object.freeze({
  watching:{colour:'#285843',symbol:'C',label:'Camera'},
  alert:{colour:'#a62827',symbol:'!',label:'Camera alert'},
  jammed:{colour:'#8b5011',symbol:'−',label:'Camera jammed'},
  offline:{colour:'#444d50',symbol:'×',label:'Camera offline'},
});

export function drawCameraMarks(ctx, marks, {w,h,sx,sz,full,label}) {
  const radius=full?10:8;
  for (const mark of marks) {
    const type=CAMERA_MARKS[mark.state],x=sx(mark.x),y=sz(mark.z);
    if (!type || ![x,y].every(Number.isFinite) || x<radius || x>w-radius || y<radius || y>h-radius) continue;
    ctx.save();ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);
    ctx.fillStyle=type.colour;ctx.fill();ctx.strokeStyle='#fff9ed';ctx.lineWidth=1.5;ctx.stroke();
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`bold ${full?13:11}px Arial`;ctx.fillStyle='#fff9ed';
    ctx.fillText(type.symbol,x,y+.5);ctx.restore();
    if (full) label(type.label,x,y,'bold 12px Arial');
  }
}

// Bounded pooled game-camera art. No lights, shadows or independent frame loop.
export function createSecurityCamerasView(scene) {
  const root = new THREE.Group(); root.name = 'Fictional storefront security cameras'; scene.add(root);
  const limit = 6;
  const housing = new THREE.InstancedMesh(new THREE.BoxGeometry(.4, .3, .65), new THREE.MeshLambertMaterial({ color: 0xd8d5c7 }), 2*limit);
  const lamp = new THREE.InstancedMesh(new THREE.BoxGeometry(.16, .1, .035), new THREE.MeshBasicMaterial({ color: 0xffffff }), limit);
  const colours={watching:0x56f17b,alert:0xff4239,jammed:0xffb62f,offline:0x515d62};
  const dummy = new THREE.Object3D(), colour=new THREE.Color(), meshes = [housing, lamp];
  for (const mesh of meshes) { mesh.count = 0; mesh.frustumCulled = false; root.add(mesh); }
  let disposed = false;
  function update(cameras = [], player, interiorId = null) {
    if (disposed) return;
    let count = 0;
    for (const c of cameras) {
      if (count===limit) break;
      if (!player || ![player.x, player.z, c.x, c.y, c.z, c.yaw].every(Number.isFinite) ||
        (c.interiorId ?? null) !== interiorId || Math.hypot(c.x - player.x, c.z - player.z) > 150) continue;
      dummy.scale.set(1,1,1);dummy.position.set(c.x,c.y,c.z);dummy.rotation.set(-.18,c.yaw,0,'YXZ');
      dummy.updateMatrix();housing.setMatrixAt(count*2,dummy.matrix);
      dummy.translateZ(-.34);dummy.updateMatrix();lamp.setMatrixAt(count,dummy.matrix);
      lamp.setColorAt(count,colour.setHex(colours[c.state]??colours.offline));
      dummy.rotation.set(0,c.yaw,0);
      dummy.position.set(c.x,c.y+.2,c.z);dummy.translateZ(.22);dummy.scale.set(.29,.86,.18);
      dummy.updateMatrix();housing.setMatrixAt(count*2+1,dummy.matrix);count++;
    }
    housing.count = 2*count; lamp.count = count;
    if(lamp.instanceColor)lamp.instanceColor.needsUpdate=true;
    for (const mesh of meshes) { mesh.visible = mesh.count > 0; mesh.instanceMatrix.needsUpdate = true; }
  }
  function dispose() {
    if (disposed) return; disposed = true; scene.remove(root);
    for (const mesh of meshes) { mesh.geometry.dispose(); mesh.material.dispose(); mesh.dispose(); }
    root.clear();
  }
  return Object.freeze({ update, dispose });
}
