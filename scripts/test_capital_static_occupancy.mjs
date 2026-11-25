import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../Games/Capital Drive/simulation.js', import.meta.url), 'utf8');
const helpers = source.slice(source.indexOf('function polygonContact'), source.indexOf('function insideRing'));
let distances = 0;
const math = Object.create(Math);
math.hypot = (...args) => { distances++; return Math.hypot(...args); };
const { contact, occupied } = vm.runInNewContext(`const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  ${helpers}\n({contact:polygonContact,occupied:polygonIntersectsCircle})`, { Math: math });
let probes = 0;
const compare = (x,z,points,radius) => {
  assert.equal(occupied(x,z,points,radius),Boolean(contact(x,z,points,radius)));
  probes++;
};
for (let i=0;i<4000;i++) {
  const sides=3+i%11;
  const points=Array.from({length:sides},(_,j)=>{
    const angle=j/sides*Math.PI*2, reach=j%2?2:5;
    return [Math.cos(angle)*reach,Math.sin(angle)*reach];
  });
  if(i%2) points.reverse();
  if(i%7===0) points.splice(1,0,points[0]);
  compare((i*31%139)/10-7,(i*47%131)/10-6.5,points,.1+i%29/10);
}
for(const points of [[],[[0,0]],[[0,0],[0,0]],[[0,0],[4,0]],[[0,0],[4,0],[4,4],[0,4]]]) {
  for(const radius of [0,.5,1,2]) for(const x of [-1,-.5,0,1,4,4.5,5]) {
    for(const z of [0,1,4]) compare(x,z,points,radius);
  }
}
const square=[[0,0],[4,0],[4,4],[0,4]];
for(const radius of [1-Number.EPSILON,1,1+Number.EPSILON]) compare(-1,2,square,radius);
assert.equal(occupied(-1,2,square,1),false,'exact tangency stays clear');
assert.equal(occupied(-1,2,square,1+Number.EPSILON),true,'strictly closer edges obstruct');
assert.equal(occupied(2,2,square,.1),true,'interior parity obstructs beyond radius');
for(let i=0;i<20;i++) {
  square[0][0]=i/10;
  compare(.1,1,square,.5);
}
distances=0;
const firstEdgeOnly=[[0,0],[4,0],[4,4],[0,4]];
Object.defineProperty(firstEdgeOnly,1,{get(){assert.fail('a close first edge must end boolean feasibility immediately');}});
assert.equal(occupied(-.1,2,firstEdgeOnly,1),true);
assert.equal(distances,0,'boolean feasibility uses squared distance');
console.log(`Capital static occupancy: ${probes} exact contact-presence comparisons passed; live geometry, strict boundary and early exit passed`);

// Compare the real static feasibility owner against its original contact path.
const sourceURL = new URL('../Games/Capital Drive/simulation.js', import.meta.url);
const oldSource = source.replace(/const occupied = index !== waterIndex && !polygon\.innerRings\?\.length[\s\S]*?if \(occupied\) return false;/,
  'if (physicalContact(index,polygon,x,z,radius)) return false;');
assert.notEqual(oldSource,source,'baseline restores the original static contact call');
const load = text => import(`data:text/javascript;base64,${Buffer.from(text.replace(/from ['"]([^'"]+)['"]/g,
  (_,path)=>`from ${JSON.stringify(new URL(path,sourceURL).href)}`)).toString('base64')}`);
const [beforeModule,afterModule] = await Promise.all([load(oldSource),load(source)]);
const fixture = () => ({bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},roads:[],spawn:{x:-80,z:-80,yaw:0},
  buildings:[{id:'solid',points:[[0,0],[8,0],[8,8],[0,8]]},
    {id:'courtyard',points:[[20,0],[32,0],[32,12],[20,12]],innerRings:[[[23,3],[29,3],[29,9],[23,9]]]}],
  barriers:[{points:[[-15,-5],[-14,-5],[-14,5],[-15,5]]}],
  areas:[{type:'water',points:[[40,0],[50,0],[50,10],[40,10]]}]});
const beforeMap=fixture(),afterMap=fixture();
let bridge=false;
const before=beforeModule.createSimulation(beforeMap,{trafficCount:0,isOnBridge:()=>bridge});
const after=afterModule.createSimulation(afterMap,{trafficCount:0,isOnBridge:()=>bridge});
let occupancyProbes=0;
for(let phase=0;phase<3;phase++) {
  bridge=phase===1;
  beforeMap.buildings[0].points[0][0]=afterMap.buildings[0].points[0][0]=phase;
  for(let i=0;i<400;i++) {
    const pose={x:-20+i%80,z:-5+i%20,yaw:i*.31,length:1+i%10,width:.5+i%7/2};
    assert.equal(after.canOccupy(pose),before.canOccupy(pose));
    occupancyProbes++;
  }
}
console.log(`Capital integrated occupancy: ${occupancyProbes} building/barrier/courtyard/water/live-bridge comparisons passed`);
