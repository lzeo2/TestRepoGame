import { ShapeUtils, Vector2 } from '../../assets/car-arcade/vendor/three.module.js';

const MUSEUM = 'osm-5035476';
const LIBRARY = 'osm-5954392';
const MINT = 'osm-217376654';
const CONVENTION = 'osm-210305032';
export const NATIONAL_ARCHITECTURE_IDS = new Set([MUSEUM, LIBRARY, MINT, CONVENTION]);

const vertex = ([x, z], y) => [x, y, z];
const signedArea = ring => ring.reduce((s, [x, z], i) => {
  const next = ring[(i + 1) % ring.length];
  return s + x * next[1] - next[0] * z;
}, 0);
const atHeight = (height, point) => typeof height === 'function' ? height(point) : height;

// All coordinates are in the same metre grid as the source polygon. Heights are
// relative to its common datum so a facade never buckles across DEM triangles.
function shapes(context) {
  const { emitTriangle: triangle, base, footing, points } = context;
  const quad = (a, b, c, d, tint) => { triangle(a, b, c, tint); triangle(a, c, d, tint); };
  function shell(ring, low, high, wall, roof) {
    const rim = signedArea(ring) < 0 ? ring : [...ring].reverse();
    for (let i = 0; i < rim.length; i++) {
      const a = rim[i], b = rim[(i + 1) % rim.length];
      const color = typeof wall === 'function' ? wall(a, b) : wall;
      quad(vertex(a, base + low), vertex(b, base + low),
        vertex(b, base + atHeight(high, b)), vertex(a, base + atHeight(high, a)), color);
    }
    if (roof === undefined) return;
    // Earcut stays inside the Museum courtyard and the convention centre's
    // setbacks. A centre fan would roof the public open space on both sites.
    const faces = ShapeUtils.triangulateShape(rim.map(p => new Vector2(...p)), []);
    for (const [a, b, c] of faces) {
      const nodes = [rim[a], rim[b], rim[c]];
      if (signedArea(nodes) > 0) nodes.reverse();
      const color = typeof roof === 'function' ? roof(...nodes) : roof;
      triangle(...nodes.map(p => vertex(p, base + atHeight(high, p))), color);
    }
  }
  // Capped on both ends, with winding independent of the direction of the bar.
  function bar(a, b, width, depth, tint) {
    const dir = b.map((v, i) => v - a[i]);
    const length = Math.hypot(...dir);
    if (length < .001) return;
    const [dx, dy, dz] = dir.map(n => n / length);
    const h = Math.hypot(dx, dz);
    const side = h > .001 ? [dz / h, 0, -dx / h] : [1, 0, 0];
    const up = [dy * side[2], dz * side[0] - dx * side[2], -dy * side[0]];
    function corners(p) {
      return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, u]) =>
        p.map((n, i) => n + side[i] * width * s / 2 + up[i] * depth * u / 2));
    }
    const lo = corners(a), hi = corners(b);
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      quad(lo[i], lo[j], hi[j], hi[i], tint);
    }
    quad(lo[3], lo[2], lo[1], lo[0], tint);
    quad(...hi, tint);
  }
  shell(points, footing - base, 0, 0x858780);
  return { shell, quad, bar };
}

function basis(origin, direction) {
  const d = Math.hypot(...direction), ux = direction[0] / d, uz = direction[1] / d;
  return (along, left) => [origin[0] + along * ux + left * uz,
    origin[1] + along * uz - left * ux];
}

function corners(frame, a, b, c, d) {
  return [frame(a, c), frame(b, c), frame(b, d), frame(a, d)];
}

function facadeFrame(points, origin, direction) {
  const frame = basis(origin, direction);
  const u = frame(1, 0), v = frame(0, 1);
  const projections = axis => points.map(p => (p[0] - origin[0]) * (axis[0] - origin[0])
    + (p[1] - origin[1]) * (axis[1] - origin[1]));
  const along = projections(u), across = projections(v);
  return { frame, u0: Math.min(...along), u1: Math.max(...along), v0: Math.min(...across), v1: Math.max(...across) };
}

function library(context, { shell, quad }) {
  const { points, base, lowGraphics } = context;
  // Long axis points SE. The entrance is on the short Parkes Place end.
  const { frame, u0, u1, v0, v1 } = facadeFrame(points, [-634.92, -2362.44], [89.94, 65.79]);
  const rect = (a,b,c,d) => corners(frame,a,b,c,d);
  const block = (a,b,c,d,lo,hi,w,r=w) => shell(rect(a,b,c,d),lo,hi,w,r);
  shell(points, 0, 1.25, 0x777670, 0x99958d);
  block(u0 + 3, u1 - 5.6, v0 + 2.8, v1 - 2.8, 1.25, 2.8, 0x777771, 0xb0aaa0);
  for (let step = 0; step < 5; step++) {
    block(u1 - 5.6, u1 - step * .89, v0 + 7, v1 - 7, 1.25, 1.54 + step * .29, 0x97948e, 0xbab6ad);
  }
  block(u0 + 6.1, u1 - 9, v0 + 5.1, v1 - 5.1, 2.8, 15.3, 0x535655, 0x6b6a60);
  for (let i = 0; i < 16; i++) for (let j = 0; j < 8; j++) {
    if (i !== 0 && i !== 15 && j !== 0 && j !== 7) continue;
    const u = u0 + 2 + (u1 - u0 - 4) * i / 15;
    const v = v0 + 1.9 + (v1 - v0 - 3.8) * j / 7;
    block(u - .65,u + .65,v - .66,v + .66,1.25,15.4,0xdddcd4);
  }
  // The glazing is set behind the free-standing marble colonnade. Shallow
  // spandrels and bronze mullions draw its stories without transparent surfaces.
  for (const h of [5.9, 9.04, 12.18]) {
    block(u0+5.99,u1-8.89,v0+4.99,v1-4.99,h,h+.44,0xbdbab0);
  }
  if (!lowGraphics) {
    for (let i = 1; i < 30; i++) {
      const u = u0 + 6.2 + (u1 - u0 - 15.4) * i / 30;
      for (const v of [v0 + 5.04,v1 - 5.04]) {
        block(u-.064,u+.064,v-.07,v+.07,2.81,15.12,0x908472);
      }
    }
  }
  const eaves = rect(u0+.12,u1-.12,v0+.12,v1-.12);
  shell(eaves,15.3,16.02,0xe6e5de,0x787573);
  quad(...eaves.map(point => vertex(point,base+15.3)).reverse(),0xbbb9ae);
  // A shallow hipped copper roof has a flat centre deck in the aerial reference.
  const cap = rect(u0+8.5,u1-8.5,v0+8.5,v1-8.5);
  for (let i = 0; i < 4; i++) {
    const j = (i+1)%4;
    quad(vertex(eaves[i],base+16.04),vertex(eaves[j],base+16.04),
      vertex(cap[j],base+18.7),vertex(cap[i],base+18.7),[0x756c66,0x827970,0x625f5e,0x776e65][i]);
  }
  shell(cap,18.7,18.91,0x777573,0x6c6866);
}

function mint(context, { shell, quad }) {
  const { points, base, lowGraphics } = context;
  // Public frontage turns toward the documented main entrance on the north side.
  const { frame, u0,u1,v0,v1 } = facadeFrame(points,[-4008.67,32.18],[89.36,1.41]);
  const rect = (a,b,c,d) => corners(frame,a,b,c,d);
  const block = (a,b,c,d,lo,hi,w,r=w) => shell(rect(a,b,c,d),lo,hi,w,r);
  shell(points,0,.68,0x81817a,0xaaaba2);
  block(u0+.8,u1-.8,v0+.8,v1-1.8,.68,9.12,0x596666);
  const sandstone = [0xcfbe9c,0xe0cfb0,0xd7c6a8,0xc5b597];
  const count = 15;
  for (let i=0;i<count;i++) {
    const pitch=(u1-u0-2)/count, start=u0+1+i*pitch;
    const entrance=i===7;
    if (!entrance) block(start+.38,start+pitch*.71,v1-1.88,v1-.97,.7,9.05,sandstone[i%4]);
    // Recessed glass slots between pale precast blades remain visible in Low.
    block(start+.05,start+.38,v1-1.85,v1-.31,.69,9.18,0xded7c7);
  }
  for (const u of [u0+1,u1-1]) for (let i=0;i<15;i++) {
    const pitch=(v1-v0-4)/15, v=v0+2+i*pitch;
    block(u-.27,u+.27,v+.5,v+pitch*.75,.7,8.97,sandstone[(i+1)%4]);
  }
  block(u0+.1,u1-.1,v0+.12,v1-.1,9.08,9.72,0xd5c7ad,0xb8b9b2);
  block(u0+3,u1-3,v0+3,v1-4,9.72,10.03,0xa3a49c,0x9b9e9c);
  // Long repeating northlights are visible across the actual production roof.
  // The short glazed face and broad light roof face share the same triangle batch.
  const span = (v1-v0-8) / 14;
  for(let i=0;i<14;i++) {
    const v=v0+4+i*span;
    const eave=10.05, peak=11.53;
    const at=(u,across,h)=>vertex(frame(u,across),base+h);
    const left=u0+4, right=u1-4;
    quad(at(left,v,eave),at(right,v,eave),at(right,v+span*.8,peak),at(left,v+span*.8,peak),0xc8cac3);
    quad(at(left,v+span*.8,peak),at(right,v+span*.8,peak),at(right,v+span,eave),at(left,v+span,eave),0x626f70);
    if(!lowGraphics) {
      for(const u of [left,right]) {
        const end=[at(u,v,eave),at(u,v+span*.8,peak),at(u,v+span,eave)];
        context.emitTriangle(...(u===left?end:end.reverse()),0xa1a6a1);
      }
    }
  }
  block(-5.5,5.5,v1-2.5,v1+.35,3.8,4.05,0xbdbbb0,0xd7d4c9);
}

function museum(context, { shell, quad }) {
  const { points, base, lowGraphics } = context;
  const palette = [0xb24d42,0x292e30,0xb4b9b6,0xd19a4b,0x965145];
  function top([x,z]) {
    if(z < -2829) return 9.2 + Math.max(0,1-Math.abs(z+2854)/45)*5.9;
    if(z > -2770) return 10.9 + Math.max(0,1-Math.abs(z+2723)/56)*2.9;
    return 13.8 + Math.max(0,1-Math.hypot(x+1462,z+2808)/62)*6.4;
  }
  function panel(a,b) {
    const x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;
    if (z<-2881) return 0xa7ada9;
    if (z<-2828) return x< -1490 ? palette[1] : palette[4];
    if (z<-2774) return x < -1461 ? 0x566d72 : palette[1];
    if (z<-2737) return x> -1450 ? palette[3] : palette[0];
    if (z<-2690) return x> -1432 ? palette[0] : palette[2];
    return palette[4];
  }
  shell(points,0,top,panel,(a,b,c)=>{
    const z=(a[1]+b[1]+c[1])/3;
    return z < -2832 ? 0x55595c : z > -2770 ? 0x3f4147 : 0x494b50;
  });
  // White lakefront hall roof and its six lenticular skylights. The independent
  // roof stays inside the broad central wing between the two concave arms.
  const frame=basis([-1466,-2802],[.806,.592]);
  const roof=corners(frame,1,67,2,42);
  shell(roof,14.1,20.65,0xc5c8c5,0xe4e3d9);
  for(const u of [12,34,56]) for(const v of [12,31]) {
    const lens=[[-7,0],[-3.8,-1.9],[0,-2.45],[4.3,-1.75],[7,0],[3.8,1.85],[0,2.45],[-4.3,1.8]];
    const ring=lens.map(([a,b])=>frame(u+a,v+b));
    const peak=vertex(frame(u+.2,v+.2),base+22.16);
    const outline=signedArea(ring)<0?ring:[...ring].reverse();
    for(let i=0;i<outline.length;i++) {
      context.emitTriangle(vertex(outline[i],base+20.67),vertex(outline[(i+1)%outline.length],base+20.67),peak,
        i<4?0x576b67:0x85938b);
    }
  }
  const rim = signedArea(points)<0 ? points : [...points].reverse();
  for(let i=0;i<rim.length;i++) {
    const a=rim[i],b=rim[(i+1)%rim.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(length<4.5) continue;
    const dx=(b[0]-a[0])/length,dz=(b[1]-a[1])/length;
    const side=(t,h,off)=>[a[0]+dx*t-dz*off,base+h,a[1]+dz*t+dx*off];
    const zone=panel(a,b); const high=Math.min(top(a),top(b));
    const band=zone===0x566d72 || zone===0x292e30;
    if(band) quad(side(.18,2.1,.05),side(length-.18,2.1,.05),
      side(length-.18,high-1.7,.05),side(.18,high-1.7,.05),0x435e65);
    const pitch=lowGraphics?9:4.5;
    for(let t=pitch; t<length-.15;t+=pitch) {
      quad(side(t-.065,band?2.05:.3,.08),side(t+.065,band?2.05:.3,.08),
        side(t+.065,high-.4,.08),side(t-.065,high-.4,.08),band?0x9daba8:0x6c6964);
    }
  }
  // The kinked rectangular section joins the shelter at the mapped public
  // entrance, doubles back over the western forecourt, and reaches 30 m.
  const path=[[-1467,4,-2803],[-1484,5,-2814],[-1494,6,-2809],
    [-1507,9,-2805],[-1523,14,-2804],[-1540,21.5,-2805],
    [-1554,27.3,-2806],[-1561,29.2,-2805],[-1560,26.9,-2800],
    [-1558,19,-2791],[-1555,10,-2781],[-1551,3.3,-2774]];
  const sections=path.map(([x,y,z],i)=>{
    const a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)];
    const d=Math.hypot(b[0]-a[0],b[2]-a[2]),nx=-(b[2]-a[2])/d,nz=(b[0]-a[0])/d;
    const width=i<4 ? 3.6 : 2.75, thickness=i<4?.6:.84;
    return [[1,1],[-1,1],[-1,-1],[1,-1]].map(([s,h])=>[x+nx*width*s,base+y+h*thickness,z+nz*width*s]);
  });
  for(let i=1;i<sections.length;i++) for(let k=0;k<4;k++){
    const tints = i<4 ? [0xc34439,0xb43b32,0xae4630,0xcb4834] :
      i<8 ? [0xdcb581,0xeb7e2a,0xd9561f,0xe87127] : [0xf39738,0xda5522,0xb94024,0xe56921];
    const j=(k+1)%4;
    quad(sections[i-1][k],sections[i][k],sections[i][j],sections[i-1][j],tints[k]);
  }
  quad(...sections[0],0xca4937);quad(...sections.at(-1).slice().reverse(),0xda5522);
}

function convention(context, { shell, quad, bar }) {
  const { points,base,lowGraphics }=context;
  const u=[.81,.586],frame=basis([-243.81,-3675.41],u);
  // On Constitution Avenue the awning meets the two mapped angled street
  // faces. Positive v faces back into the building.
  const p=(along,back,h)=>vertex(frame(along,back),base+h);
  const rect=(a,b,c,d)=>corners(frame,a,b,c,d);
  const block=(a,b,c,d,lo,hi,w,r=w)=>shell(rect(a,b,c,d),lo,hi,w,r);
  shell(points,0,9.5,0xe4e5df,0xb7bcb7);
  block(-64,-12,5,37,9.5,14.7,0x9b9f9e,0xc4c7c2);
  block(-60,-16,8,34,14.7,15.1,0xaeb3af,0xc6c9c5);
  // The east end has an auditorium roof with chamfered corners and broad
  // sloping facets. It stays behind the curved source perimeter.
  const auditorium=[[15,4],[55,4],[64,6],[70,12],[72,20],[72,54],
    [66,64],[54,68],[41,64],[30,59],[17,55]].map(([a,b])=>frame(a,b));
  shell(auditorium,9.5,11.75,0xcbceca,0xcccfc9);
  const center=frame(44,33);
  const cap=auditorium.map(([x,z])=>[center[0]+(x-center[0])*.68,center[1]+(z-center[1])*.68]);
  const finish=[0xd4d5ce,0xd8dad4,0xc8ccc7,0xd1d3cd];
  for(let i=0;i<auditorium.length;i++) {
    const j=(i+1)%auditorium.length;
    quad(vertex(auditorium[i],base+11.78),vertex(auditorium[j],base+11.78),
      vertex(cap[j],base+14.08),vertex(cap[i],base+14.08),finish[i%4]);
  }
  shell(cap,14.08,14.21,0xcacdc8,0xd9dad2);
  if(!lowGraphics) for(const x of [-57,-47,-37,-27]) {
    block(x-2.5,x+2.5,13,30,15.11,15.44,0x959d9a,0xafb4b0);
  }
  for(const run of [[-67,-19],[16,56]]) {
    const [left,right]=run;
    // Slender horizontal ribbon windows, with deep white end piers.
    for(const h of [2.1,6.05]) {
      quad(p(left,-.21,h),p(right,-.21,h),p(right,-.21,h+1.6),p(left,-.21,h+1.6),0x52616b);
      if(!lowGraphics) for(let x=left+3.3;x<right;x+=4.8) {
        quad(p(x-.065,-.24,h),p(x+.065,-.24,h),p(x+.065,-.24,h+1.6),p(x-.065,-.24,h+1.6),0xb4b9b7);
      }
    }
  }
  block(-10.5,10.5,-.28,4.8,.05,9.48,0x49636c);
  block(-13,13,-.32,4.9,9.5,14.1,0x353c40,0x5c6264);
  // Blue steel entrance screen, modelled as an open truss so the shaded
  // glass and white foyer read through it from the avenue.
  const cobalt=0x265587,rail=0x3a6ca1;
  for(const x of [-12,12]) {
    bar(p(x,-5.5,0),p(x,-8.7,11.6),.5,.54,cobalt);
    bar(p(x,-1,5.15),p(x,-8.7,11.6),.22,.25,rail);
  }
  for(const h of [5.2,6.5,9.0,11.6]) {
    const back=-5.5-3.2*h/11.6;
    bar(p(-13.5,back,h),p(13.5,back,h),.25,.25,cobalt);
  }
  const pitch=lowGraphics?2.6:1.3;
  for(let x=-12.9;x<=13.1;x+=pitch) {
    bar(p(x,-6.9,5.2),p(x,-9.2,12.3),.16,.19,rail);
  }
  if(!lowGraphics) for(let x=-12;x<12;x+=4) {
    bar(p(x,-6.95,5.2),p(x+4,-8.62,11.3),.13,.16,cobalt);
  }
}

/** Emit opaque, outward-facing triangles directly into the owner's chunk batch. */
export function emitNationalArchitecture(building, context) {
  if (!NATIONAL_ARCHITECTURE_IDS.has(building.id) || context.points.length<3) return false;
  const model = { [MUSEUM]: museum, [LIBRARY]: library, [MINT]: mint, [CONVENTION]: convention }[building.id];
  model(context, shapes(context));
  return true;
}
