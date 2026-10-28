import assert from 'node:assert/strict';
import { mapPoint, drawMap } from '../Games/Slipstream Borough/map.js';
import { WORLD } from '../Games/Slipstream Borough/world.js';
const city={mode:'roam',world:{x:0,z:0,heading:Math.PI/2},traffic:[],police:[{world:{x:50,z:0}}],rivals:[]};
assert.deepEqual(mapPoint(city,0,0),[72,72]);
assert(mapPoint(city,0,-50)[1]<72); assert(mapPoint(city,50,0)[0]>72);
assert.deepEqual(mapPoint(city,1e6,-1e6),[136,8]);
assert.deepEqual(mapPoint({...city,mode:'sandbox'},50,-50),mapPoint(city,50,-50));
const road={mode:'race',distance:600,finishDistance:1200,x:0,traffic:[],police:[],rivals:[{x:1.75,distance:650}]};
assert(mapPoint(road,0,650)[1]<mapPoint(road,0,600)[1]);
assert(mapPoint(road,0,550)[1]>mapPoint(road,0,600)[1]);
assert(mapPoint(road,-5.25,600)[0]<mapPoint(road,5.25,600)[0]);
const calls=[], ctx=new Proxy({}, {get:(_,key)=> (...args)=>calls.push([key,...args]),set:()=>true});
const canvas={width:144,getContext:type=>{assert.equal(type,'2d');return ctx;}};
const before=structuredClone(city);drawMap(canvas,city);assert.deepEqual(city,before);
assert.equal(calls.filter(c=>c[0]==='fillRect').length, WORLD.blocks.length + 2, 'all actual parcels and player/police markers, not the former uniform grid');
for (const b of WORLD.blocks) {
  const a = mapPoint(city,b.x-b.width/2,b.z-b.depth/2), c = mapPoint(city,b.x+b.width/2,b.z+b.depth/2);
  assert(calls.some(call=>call[0]==='fillRect'&&call[1]===a[0]&&call[2]===a[1]&&call[3]===c[0]-a[0]&&call[4]===c[1]-a[1]));
}
assert(calls.some(c=>c[0]==='rotate'&&c[1]===-Math.PI/2));
assert(calls.some(c=>c[0]==='fillRect'&&c[3]===6&&c[4]===6));
const testCity={...city,mode:'sandbox',police:[]};calls.length=0;drawMap(canvas,testCity);
assert(calls.some(c=>c[0]==='fillText'&&c[1]==='N'),'sandbox uses real city, not a highway map');
drawMap(canvas,road);assert(calls.some(c=>c[0]==='fillText'&&c[1]==='600/1200 m'));
console.log('PASS north-up actual world/relative highway projection, limits, police shape, heading and immutable map draw. Synthetic canvas only.');
