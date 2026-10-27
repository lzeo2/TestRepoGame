// Original dependency-free measured fleet geometry. No renderer, asset loader or weapon authority.
const finite = x => typeof x === 'number' && Number.isFinite(x);
const vec = x => Array.isArray(x) && x.length === 3 && x.every(n => finite(n) && Math.abs(n) <= 100000);
const add = (a,b) => a.map((n,i)=>n+b[i]);
const sub = (a,b) => a.map((n,i)=>n-b[i]);
const norm = v => { const n=Math.hypot(...v); return n>1e-12?v.map(x=>x/n):null; };
export const yawRotate = (p,h) => [Math.cos(h)*p[0]+Math.sin(h)*p[2],p[1],-Math.sin(h)*p[0]+Math.cos(h)*p[2]];
export const yawQuaternion = h => [0,Math.sin(h/2),0,Math.cos(h/2)];
export const angleDelta = (a,b) => Math.atan2(Math.sin(a-b),Math.cos(a-b));
function rotate(p,a,t) {
  const c=Math.cos(t),s=Math.sin(t),dot=p.reduce((n,x,i)=>n+x*a[i],0);
  const cross=[a[1]*p[2]-a[2]*p[1],a[2]*p[0]-a[0]*p[2],a[0]*p[1]-a[1]*p[0]];
  return p.map((n,i)=>n*c+cross[i]*s+a[i]*dot*(1-c));
}
export function compileGeometry(d) {
  if (!d || !d.objective_only || d.player_vehicle_kind!==null || d.axes?.forward!=='-Z' || d.axes?.up!=='+Y' ||
      !Array.isArray(d.articulation) || d.articulation.length>16 || !d.collision?.hull) throw TypeError('Invalid measured descriptor');
  const boxes=[d.collision.hull,...(d.collision.deck?[d.collision.deck]:[]),...(d.collision.island_components??[])];
  if (boxes.length>24 || boxes.some(b=>!vec(b.min)||!vec(b.max)||b.min.some((n,i)=>n>=b.max[i]))) throw TypeError('Invalid fitted boxes');
  const full=[d.bounds,d.static_bounds_root,d.continuous_swept_bounds_root,
    ...d.articulation.map(c=>c.swept_bounds_root)].filter(Boolean);
  if(!full.length||full.some(b=>!vec(b.min)||!vec(b.max)||b.min.some((n,i)=>n>=b.max[i])))throw TypeError('Full measured clearance bounds required');
  const clearance={min:[0,1,2].map(i=>Math.min(...full.map(b=>b.min[i]))),max:[0,1,2].map(i=>Math.max(...full.map(b=>b.max[i])))};
  const controls=d.articulation.map(c=>{
    if(typeof c.node!=='string'||!vec(c.axis_local)||Math.abs(Math.hypot(...c.axis_local)-1)>1e-6||!vec(c.rest_translation)||
      (c.limits_rad!=null&&(!Array.isArray(c.limits_rad)||c.limits_rad.length!==2||!c.limits_rad.every(finite)||c.limits_rad[0]>c.limits_rad[1])))throw TypeError('Invalid articulation');
    if(c.mapping?.maximum_rad_s!==undefined&&(!finite(c.mapping.maximum_rad_s)||c.mapping.maximum_rad_s<=0||c.mapping.maximum_rad_s>100))throw TypeError('Invalid propeller limit');
    return structuredClone(c);
  });
  if(new Set(controls.map(c=>c.node)).size!==controls.length)throw TypeError('Duplicate articulation');
  const gun=d.main_gun_geometry;
  if(gun) {
    const yaw=controls.find(c=>c.node===gun.yaw_node),pitch=controls.find(c=>c.node===gun.pitch_node);
    if(!yaw?.limits_rad||!pitch?.limits_rad||!vec(gun.muzzle_pitch_local)||!vec(gun.bore_direction_pitch_local)||
      Math.abs(Math.hypot(...gun.bore_direction_pitch_local)-1)>1e-5)throw TypeError('Invalid measured gun');
    if([yaw,pitch].some(c=>c.rest_rotation&&c.rest_rotation.some((n,i)=>Math.abs(n-(i===3?1:0))>1e-8)))throw TypeError('Unsupported gun rest frame');
  }
  if(d.hull_loft_stations_z_radius!==undefined) {
    const stations=d.hull_loft_stations_z_radius;
    if(!finite(d.hull_center_y)||!Array.isArray(stations)||stations.length<2||stations.length>64||
      stations.some((s,i)=>!Array.isArray(s)||s.length!==2||!s.every(finite)||s[1]<0||s[1]>100||
        (i>0&&s[0]<=stations[i-1][0])))throw TypeError('Invalid measured loft');
  }
  const launches=d.launch_origins??[];
  if(!Array.isArray(launches)||launches.length>4||launches.some(l=>typeof l.node!=='string'||!vec(l.origin_rest_root)||!vec(l.direction_rest_root)||Math.abs(Math.hypot(...l.direction_rest_root)-1)>1e-5))throw TypeError('Invalid launch geometry');
  return { descriptor:structuredClone(d),boxes:structuredClone(boxes),clearance,controls,gun:gun?structuredClone(gun):null,
    clearanceHalf:[0,1,2].map(i=>Math.max(Math.abs(clearance.min[i]),Math.abs(clearance.max[i]))),
    launches:structuredClone(launches),half:[0,1,2].map(i=>Math.max(...boxes.flatMap(b=>[Math.abs(b.min[i]),Math.abs(b.max[i])])))};
}
export function mountPose(g,position,heading,key,angles={}) {
  let point,direction;
  if(key==='main_gun'&&g.gun) {
    const yaw=g.controls.find(c=>c.node===g.gun.yaw_node),pitch=g.controls.find(c=>c.node===g.gun.pitch_node);
    const ya=angles[yaw.node]??0,pa=angles[pitch.node]??0;
    point=add(yaw.rest_translation,rotate(add(pitch.rest_translation,rotate(g.gun.muzzle_pitch_local,pitch.axis_local,pa)),yaw.axis_local,ya));
    direction=rotate(rotate(g.gun.bore_direction_pitch_local,pitch.axis_local,pa),yaw.axis_local,ya);
  } else {
    const launch=g.launches.find(l=>l.node===key);if(!launch)return null;
    point=launch.origin_rest_root;direction=launch.direction_rest_root;
  }
  return {position:add(position,yawRotate(point,heading)),direction:yawRotate(direction,heading)};
}
// Straight-ray solution only. A signed pitch that cannot point at the candidate fails closed.
export function solveMount(g,position,heading,key,target) {
  if(!vec(target))return null;
  const angles={};
  if(key==='main_gun'&&g.gun) {
    const controls=[g.controls.find(c=>c.node===g.gun.yaw_node),g.controls.find(c=>c.node===g.gun.pitch_node)];
    let values=[0,0];
    function error(v) {
      const pose=mountPose(g,position,heading,key,Object.fromEntries(controls.map((c,i)=>[c.node,v[i]])));
      const wanted=norm(sub(target,pose.position));if(!wanted)return null;
      return [angleDelta(Math.atan2(wanted[0],-wanted[2]),Math.atan2(pose.direction[0],-pose.direction[2])),
        Math.atan2(wanted[1],Math.hypot(wanted[0],wanted[2]))-Math.atan2(pose.direction[1],Math.hypot(pose.direction[0],pose.direction[2]))];
    }
    for(let i=0;i<12;i++) {
      const f=error(values);if(!f)return null;if(Math.hypot(...f)<1e-9)break;
      const eps=1e-5,cols=values.map((_,j)=>{const n=[...values];n[j]+=eps;const e=error(n);return e.map((x,k)=>(x-f[k])/eps);});
      const det=cols[0][0]*cols[1][1]-cols[1][0]*cols[0][1];if(Math.abs(det)<1e-10)return null;
      values[0]-=(f[0]*cols[1][1]-f[1]*cols[1][0])/det;
      values[1]-=(cols[0][0]*f[1]-cols[0][1]*f[0])/det;
    }
    if(values.some((v,i)=>!finite(v)||v<controls[i].limits_rad[0]-1e-8||v>controls[i].limits_rad[1]+1e-8))return null;
    controls.forEach((c,i)=>{angles[c.node]=Math.max(c.limits_rad[0],Math.min(c.limits_rad[1],values[i]));});
  }
  const pose=mountPose(g,position,heading,key,angles);if(!pose)return null;
  const wanted=norm(sub(target,pose.position));
  if(!wanted||Math.hypot(...wanted.map((n,i)=>n-pose.direction[i]))>1e-6)return null;
  return {...pose,angles};
}
export function launchClear(g,position,heading,from,direction) {
  const stations=g.descriptor.hull_loft_stations_z_radius,cy=g.descriptor.hull_center_y;
  if(!Array.isArray(stations)||!finite(cy))return false;
  // This original submarine's forward outlet ray must clear its measured loft plus 0.25 m.
  for(let distance=0;distance<=12;distance+=.25) {
    const p=yawRotate(sub(from.map((n,i)=>n+direction[i]*distance),position),-heading);
    let radius=0;
    for(let i=1;i<stations.length;i++)if(p[2]>=stations[i-1][0]&&p[2]<=stations[i][0]) {
      const f=(p[2]-stations[i-1][0])/(stations[i][0]-stations[i-1][0]);radius=stations[i-1][1]*(1-f)+stations[i][1]*f;break;
    }
    if(Math.hypot(p[0],p[1]-cy)<=radius+.25)return false;
  }
  return true;
}
export function fittedHit(g,a,b,position,heading,previous=position) {
  // Exact OBB slab at this fixed-tick yaw; moving translation swept in the same local frame.
  const start=yawRotate(sub(a,previous),-heading),end=yawRotate(sub(b,position),-heading);
  let result=null;
  for(const box of g.boxes) {
    let lo=0,hi=1;
    for(let i=0;i<3;i++) {
      const delta=end[i]-start[i];
      if(Math.abs(delta)<1e-12){if(start[i]<box.min[i]||start[i]>box.max[i]){hi=-1;break;}}
      else{const x=[(box.min[i]-start[i])/delta,(box.max[i]-start[i])/delta].sort((a,b)=>a-b);lo=Math.max(lo,x[0]);hi=Math.min(hi,x[1]);}
    }
    if(lo<=hi&&(result===null||lo<result))result=lo;
  }
  return result;
}
export function clearanceBounds(g,heading) {
  return rotatedBounds([g.clearance],heading);
}
export function fittedBounds(g,heading) {
  return rotatedBounds(g.boxes,heading);
}
function rotatedBounds(boxes,heading) {
  const points=[];
  for(const box of boxes)for(const x of [box.min[0],box.max[0]])for(const y of [box.min[1],box.max[1]])for(const z of [box.min[2],box.max[2]])points.push(yawRotate([x,y,z],heading));
  return {min:[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),max:[0,1,2].map(i=>Math.max(...points.map(p=>p[i])))};
}
export function fittedTargets(g,position,heading) {
  return g.boxes.map(b=>add(position,yawRotate(b.min.map((n,i)=>(n+b.max[i])/2),heading)));
}
