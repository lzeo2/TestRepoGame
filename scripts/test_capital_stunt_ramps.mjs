import assert from 'node:assert/strict';
import {createStuntRamps} from '../Games/Capital Drive/stunt-ramps.js';
const park=(id,x)=>({id,type:'park',points:[[x-100,-100],[x+100,-100],[x+100,100],[x-100,100]]});
const terrain={groundHeightAt:()=>7};
const map={areas:Array.from({length:7},(_,i)=>park(i,i*800)),roads:[],buildings:[]};
const stunts=createStuntRamps(map,terrain);assert.equal(stunts.ramps.length,6);
for(const r of stunts.ramps){assert.equal(stunts.heightAt(r.x,r.z),7);assert.equal(stunts.heightAt(r.x,r.z+r.length),10.2);assert.equal(stunts.supportAt({x:r.x,z:r.z+9}).slopeZ,3.2/18);for(const p of r.vertices)assert.equal(stunts.heightAt(p[0],p[2]),p[1]);}
assert.equal(stunts.heightAt(0,-1),null);
const blocked=createStuntRamps({...map,roads:[{width:10,points:[[-600,0],[6000,0]]}]},terrain);assert.equal(blocked.ramps.length,0,'long roads crossing corridor must block placement');
assert.equal(createStuntRamps({...map,areas:map.areas.map(a=>({...a,sourceTags:{access:'private'}}))},terrain).ramps.length,0);
console.log('Capital stunt ramps PASS: bounded six, mapped clearance, private exclusion and shared mesh/support heights.');
