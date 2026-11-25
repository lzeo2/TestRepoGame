import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

const PALETTES = {
  timber: { floor:0x967955, wall:0xe3dac6, wood:0x775438, fabric:0x9c755d, accent:0x526b64, linen:0xe6dcc5 },
  brick: { floor:0xa1886c, wall:0xdbd4c8, wood:0x6e5949, fabric:0x6f7d8a, accent:0xa17a4d, linen:0xe3ddcf },
  garden: { floor:0xb09977, wall:0xe0dfcc, wood:0x96754d, fabric:0x7c8a68, accent:0xb68a64, linen:0xebe4d1 },
  safehouse: { floor:0x88745e, wall:0xd2cbbb, wood:0x65513e, fabric:0x626e72, accent:0x9b7758, linen:0xd8d4c5 },
};
export const domesticPalette = style => PALETTES[style] || PALETTES.timber;

// All furniture stays inside the existing collision footprint. Curves are low-segment
// solids merged with the room; these fixtures add no lights, textures or scene nodes.
export function furnishDomestic(item, p, detail, addGeometry) {
  const {width:w, depth:d, height:h} = item;
  const part = (x,y,z,a,b,c,color) => detail(item,x,y,z,a,b,c,color);
  const round = (x,y,z,top,bottom,height,color,segments=8) => {
    const c=Math.cos(item.yaw),s=Math.sin(item.yaw);
    addGeometry(new THREE.CylinderGeometry(top,bottom,height,segments).translate(item.x+c*x+s*z,item.y+y,item.z-s*x+c*z),color);
  };
  const legs = (height=.2) => {
    for(const x of [-1,1])for(const z of [-1,1])part(x*w*.36,height/2,z*d*.36,.07,height,.07,p.wood);
  };
  if(item.kind==='sofa') {
    legs();part(0,.3,0,w,.25,d,p.wood);
    part(-w*.39,.69,0,w*.22,.68,d,p.fabric);
    for(const z of [-1,1])part(0,.6,z*d*.43,w,.48,d*.14,p.fabric);
    for(const z of [-1,1]) {
      part(w*.06,.49,z*d*.21,w*.72,.18,d*.39,p.fabric);
      part(-w*.23,.74,z*d*.23,w*.16,.4,d*.38,p.fabric);
    }
    part(-w*.13,.72,-d*.23,w*.26,.3,d*.24,p.accent);
    part(w*.14,.593,d*.25,w*.58,.025,d*.25,p.linen);
  } else if(item.kind==='bed') {
    legs(.18);part(0,.29,0,w,.25,d,p.wood);
    part(0,.49,0,w*.96,.2,d*.96,p.linen);
    part(0,.61,-d*.17,w*.96,.09,d*.58,p.accent);
    part(0,.74,d*.46,w,.95,.09,p.wood);
    for(const x of [-1,1])part(x*w*.23,.64,d*.3,w*.4,.15,d*.19,p.linen);
    part(0,.67,-d*.3,w*.97,.025,d*.16,p.fabric);
  } else if(item.kind==='wardrobe') {
    part(0,h/2,0,w,h,d,p.wood);
    for(const z of [-1,1]) {
      part(w/2+.012,h*.52,z*d*.245,.02,h*.87,d*.46,p.accent);
      part(w/2+.035,h*.48,z*d*.08,.035,.19,.035,0xc0ac79);
    }
    part(0,h+.035,0,w,.07,d,p.wood);
  } else if(item.kind==='kitchen-bench') {
    part(0,h*.47,0,w,h*.94,d,p.linen);
    part(0,h,0,w,.08,d,0xb6b1a1);
    for(const z of [-.32,0,.32]) {
      part(-w/2-.006,h*.45,z*d,.015,h*.78,d*.29,p.wood);
      part(-w/2-.025,h*.7,z*d,.025,.035,d*.17,0xc4bba5);
    }
    part(0,h+.045,-d*.23,w*.7,.025,d*.28,0x52616a);
    for(const x of [-1,1])for(const z of [-1,1])round(x*w*.16,h+.065,d*.25+z*d*.07,w*.09,w*.09,.02,0x353d3c);
    part(w*.25,h+.15,-d*.27,.035,.23,.035,0xa7b4b0);
    part(w*.13,h+.26,-d*.27,w*.28,.035,.035,0xa7b4b0);
  } else if(item.kind==='bath') {
    part(0,h*.48,0,w,h*.96,d,p.linen);
    part(0,h,0,w*.75,.03,d*.8,0x92aaa5);
    for(const x of [-1,1])part(x*w*.44,h+.025,0,w*.12,.12,d,p.linen);
    for(const z of [-1,1])part(0,h+.025,z*d*.45,w,.12,d*.1,p.linen);
  } else if(item.kind==='toilet') {
    round(0,.2,0,w*.29,w*.2,.4,p.linen);
    round(0,.46,0,w*.47,w*.38,.2,p.linen);
    part(0,.55,-d*.34,w*.8,.55,d*.25,p.linen);
  } else if(item.kind==='chair') {
    legs(.43);part(0,.46,0,w,.1,d,p.wood);part(0,.68,-d*.4,w,.4,.06,p.wood);
  } else return false;
  return true;
}

export function dressDomestic(plan,p,detail) {
  // Insets sit on the room side of existing shell walls, preserving original
  // outlines and their collision. No invented extension or outdoor floor is drawn.
  const inside = (x,z) => {
    const o=plan.origin,c=Math.cos(o.yaw),s=Math.sin(o.yaw),dx=x-o.x,dz=z-o.z;
    const px=c*dx-s*dz,pz=s*dx+c*dz;
    if(!plan.footprint)return Math.abs(px)<plan.width/2&&pz>0&&pz<plan.depth;
    let yes=false;
    for(let i=0,j=plan.footprint.length-1;i<plan.footprint.length;j=i++) {
      const a=plan.footprint[i],b=plan.footprint[j];
      if((a.z>pz)!==(b.z>pz)&&px<(b.x-a.x)*(pz-a.z)/(b.z-a.z)+a.x)yes=!yes;
    }
    return yes;
  };
  const shell=plan.walls.filter(w=>w.width>2.4&&w.depth<.2).slice(0,4);
  for(const wall of shell) {
    const nx=Math.sin(wall.yaw),nz=Math.cos(wall.yaw);
    const side=inside(wall.x+nx*.25,wall.z+nz*.25)?1:-1;
    const a={...wall,x:wall.x+nx*.105*side,z:wall.z+nz*.105*side,y:plan.floorY};
    const w=Math.min(1.65,wall.width-.5);
    detail(a,0,1.65,0,w,1.15,.025,0x829fa4);
    detail(a,-w*.23,1.8,side*.018,w*.42,.65,.015,0xc4d6cf);
    for(const x of [-1,1])detail(a,x*w*.53,1.63,side*.04,.09,1.32,.07,p.wood);
    for(const y of [1.02,2.26])detail(a,0,y,side*.05,w+.18,.07,.14,p.linen);
    detail(a,0,1.65,side*.04,.045,1.2,.04,p.linen);
    detail(a,0,2.34,side*.09,w+.4,.045,.045,p.wood);
    for(const x of [-1,1])for(const fold of [0,1])detail(a,x*(w*.49+fold*.065),1.61,side*.12,.13,1.4,.09,p.fabric);
  }
  for(const item of plan.furniture) {
    if(item.kind==='bedside-table'||item.kind==='wardrobe') {
      const y=item.height;
      detail(item,0,y+.04,0,.22,.08,.22,p.wood);
      detail(item,0,y+.2,0,.035,.32,.035,p.wood);
      detail(item,0,y+.39,0,.3,.24,.3,p.linen);
      detail(item,0,y+.26,0,.22,.025,.22,0xf3d9a5);
    }
    if(item.kind==='coffee-table'||item.kind==='dining-table') {
      detail(item,0,item.height+.025,0,item.width*.65,.035,item.depth*.65,p.linen);
      detail(item,0,item.height+.065,-item.depth*.12,item.width*.4,.05,item.depth*.25,p.accent);
    }
  }
}
