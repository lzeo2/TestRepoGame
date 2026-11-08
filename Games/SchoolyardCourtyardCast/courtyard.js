/* Original level-1 volumes, not reference imagery. Static geometry is instanced.
 * World units follow scene3d's engine/50 mapping, not a claim of real meters.
 */
(function(root,factory){'use strict';if(typeof module==='object'&&module.exports)module.exports=factory();else root.LauncherCourtyard=factory();}(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  return function(T,{cube,sphere,mat}){
    const root=new T.Group();root.name='human-courtyard';const batches=new Map();
    function add(name,color,shape,x,y,z,sx,sy,sz,rz=0){const key=name+color+shape;let b=batches.get(key);if(!b){b={name,color,shape,items:[]};batches.set(key,b);}b.items.push([x,y,z,sx,sy,sz,rz]);}
    const box=(name,color,w,h,d,x,y,z,angle=0)=>add(name,color,'box',x,y,z,w,h,d,angle);
    box('courtyard-paving','#65706b',26,.24,18,9.6,-.14,-2);
    // Diverging physical paving joints create foreground depth, not a picture quad.
    for(let x=-2;x<23;x+=1.6)box('courtyard-paving','#92998a',.025,.012,17,x,.002,-2);
    for(let z=-10;z<=6;z+=1.4)box('courtyard-paving','#92998a',26,.012,.025,9.6,.002,z);
    box('school-wings','#896d59',8.8,4.25,1.6,3.7,2.125,-6.2);
    box('school-wings','#927862',8,3.65,1.6,15.2,1.825,-6.2);
    box('recessed-entrance','#614d41',3.4,3.8,1.2,9.55,1.9,-6.55);
    box('roof-depth','#46545a',9.2,.25,2.1,3.7,4.35,-6.2,.025);
    box('roof-depth','#46545a',8.4,.25,2.1,15.2,3.8,-6.2,-.025);
    box('roof-depth','#46545a',3.9,.24,2.2,9.55,3.94,-6.25);
    for(const x of [.3,1.8,3.3,4.8,6.3,12.5,14,15.5,17,18.5])for(const y of [1.65,3.05]){
      box('window-frames','#b5b4a0',.91,.92,.15,x,y,-5.32);
      box('window-glass','#354e57',.73,.72,.08,x,y,-5.20);
      box('window-frames','#b5b4a0',.035,.73,.05,x,y,-5.14);
    }
    for(const x of [8.8,10.1]){box('recessed-entrance','#b5b4a0',1.05,1.65,.18,x,.825,-5.83);box('window-glass','#354e57',.85,1.45,.12,x,.825,-5.71);}
    box('recessed-entrance','#a6977e',3.4,.14,1.6,9.55,.08,-5.1);
    for(let row=1;row<17;row++){
      const y=row*.24;box('brick-joints','#a88c74',8.8,.018,.025,3.7,y,-5.385);
      if(y<3.65)box('brick-joints','#a88c74',8,.018,.025,15.2,y,-5.385);
    }
    for(const x of [-1.1,20.5]){
      box('trees','#625b43',.24,3.6,.24,x,1.8,-4.6);
      for(const [dx,y,z,rx,ry,rz]of [[-.6,3.4,-4.5,1,.9,.8],[.25,4.15,-4.9,1.1,1.1,.9],[.8,3.2,-4.6,1,.8,.8]])add('trees','#4c6957','sphere',x+dx,y,z,rx,ry,rz);
      box('planters','#8c8874',2.4,.34,1.1,x,.17,-4.55);
    }
    // Low planters and distant hills vary depth without obstructing the physics plane.
    for(const x of [2.5,16.5])box('planters','#8c8874',2.3,.28,.8,x,.14,-3.9);
    for(const x of [-3,5,14,23])add('distant-hills','#809285','sphere',x,1,-15,5,2.4,1.4);
    const transform=new T.Object3D();
    for(const b of batches.values()){
      const mesh=new T.InstancedMesh(b.shape==='box'?cube:sphere,mat(b.color),b.items.length);mesh.name=b.name;
      b.items.forEach(([x,y,z,sx,sy,sz,rz],i)=>{transform.position.set(x,y,z);transform.scale.set(sx,sy,sz);transform.rotation.set(0,0,rz);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);});
      mesh.instanceMatrix.needsUpdate=true;root.add(mesh);
    }
    root.userData.original=true;root.userData.textures=0;return root;
  };
}));
