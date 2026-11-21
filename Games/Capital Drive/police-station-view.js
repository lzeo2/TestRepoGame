import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

const MAX_BOXES=384, RANGE=410;
const NAVY=0x233b56, GLASS=0x477585, STONE=0xcac6b4, CONCRETE=0x666b68;
const SIGN=['110/101/110/100/100','111/101/101/101/111','100/100/100/100/111','111/010/010/010/111','111/100/100/100/111','111/100/110/100/111']
  .map(letter=>letter.split('/'));

export function createPoliceStationView(scene, stations) {
  const geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshLambertMaterial({color:0xffffff});
  const mesh=new THREE.InstancedMesh(geometry,material,MAX_BOXES),pose=new THREE.Object3D(),color=new THREE.Color();
  mesh.name='Fictional police posts and rubble';mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled=false;mesh.count=0;mesh.visible=false;scene.add(mesh);
  const stats={stations:0,ruins:0,instances:0,draws:0};
  let previous=0,disposed=false;
  function box(site,u,v,w,d,y,h,tint,turn=0){
    if(mesh.count>=MAX_BOXES)return;
    const [x,z]=site.point(u,v);
    pose.position.set(x,y+h/2,z);pose.rotation.y=-Math.atan2(site.tz,site.tx)+turn;pose.scale.set(w,h,d);pose.updateMatrix();
    mesh.setMatrixAt(mesh.count,pose.matrix);mesh.setColorAt(mesh.count++,color.setHex(tint));
  }
  function intact(site){
    const {width:w,depth:d,height:h,y}=site,front=-d/2;
    box(site,0,0,w,d,site.foundation,y-site.foundation,CONCRETE);
    box(site,0,0,w,d,y,h-.42,STONE);
    box(site,0,0,w+.1,d+.1,y+h-.42,.42,NAVY);
    box(site,0,front-.13,w,.23,y+.19,.46,CONCRETE);
    const damage=site.health<=60;
    for(const side of [-1,1]){
      box(site,side*3.31,front-.03,2.73,.06,y+1.28,1.6,NAVY);
      box(site,side*3.31,front-.07,2.37,.06,y+1.42,1.33,damage&&side<0?0x323f43:GLASS);
      box(site,side*3.31,front-.11,.055,.035,y+1.43,1.31,0xe0ded4);
    }
    box(site,0,front-.04,2.47,.1,y,2.84,NAVY);
    box(site,0,front-.11,2.03,.07,y+.18,2.34,GLASS);
    box(site,0,front-.16,.095,.025,y+.18,2.36,0xcad5d4);
    box(site,0,front-.32,2.99,.65,y+2.72,.2,0x809ca8);
    box(site,0,front-.13,5.9,.17,y+3.2,1.05,NAVY);
    const readingOrder = site.nx*site.tz-site.nz*site.tx>0?1:-1;
    for(const [letter,rows] of SIGN.entries())for(const [row,bits] of rows.entries())for(let col=0;col<bits.length;col++){
      if(bits[col]==='1')box(site,readingOrder*(letter*4+col-11)*.21,front-.225,.214,.055,y+3.82-row*.145,.15,0xf6efe0);
    }
  }
  function rubble(site){
    const {width:w,depth:d}=site;
    // A low, discontinuous rubble field keeps the former building traversable.
    for(let i=0;i<18;i++){
      const u=((i*31)%19/18-.5)*(w-1.8),v=((i*17)%23/22-.5)*(d-1.5);
      box(site,u,v,.48+(i%4)*.23,.5+(i%5)*.12,site.ground(u,v),.06+(i%4)*.04,i%5?0x7f7b71:0x3c4651,i*.62);
    }
  }
  function update(focus){
    if(disposed)return;
    let key=0;
    if(focus)for(const [index,site] of stations.sites.entries()){
      if((focus.x-site.x)**2+(focus.z-site.z)**2<RANGE**2)key|=(site.destroyed?3:site.health<=60?2:1)<<(index*2);
    }
    if(previous===key)return;previous=key;
    mesh.count=0;stats.ruins=stats.stations=0;
    for(const [index,site] of stations.sites.entries()){
      if(!(key&(3<<(index*2))))continue;
      stats.stations++;
      if(site.destroyed){rubble(site);stats.ruins++;}else intact(site);
    }
    mesh.visible=mesh.count>0;mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    stats.instances=mesh.count;stats.draws=Number(mesh.visible);
  }
  function dispose(){
    if(disposed)return;disposed=true;mesh.removeFromParent();mesh.dispose();geometry.dispose();material.dispose();
    stats.stations=stats.ruins=stats.instances=stats.draws=0;
  }
  return {update,dispose,get stats(){return {...stats};}};
}
