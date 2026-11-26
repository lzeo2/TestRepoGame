// References and footprint selection are recorded in docs/capital-drive-regional-exteriors.md.
// The anchors for precincts and school grounds are labels, never building polygons.
const palettes = {
  stadium: { wall:0x888b87, roof:0xb4b8b7, trim:0xcecebf, accent:0x314965, glass:0x546875 },
  universityHospital: { wall:0xc1b7aa, roof:0xa4a19d, trim:0xd7c9b8, accent:0x98664f, glass:0x475962 },
  hackett: { wall:0xa27c61, roof:0x877a6c, trim:0xd7ccb4, accent:0x555d51, glass:0x536461 },
  watson: { wall:0xb9a086, roof:0x938f83, trim:0xe0d9c2, accent:0x435f68, glass:0x576d70 },
  charnwood: { wall:0xa48b72, roof:0x937b6b, trim:0xd8c4a4, accent:0x765442, glass:0x536664 },
  kippax: { wall:0xd9d3c5, roof:0xa5a5a1, trim:0xe4e3dc, accent:0xad383a, glass:0x49595f },
  charlesWeston: { wall:0xb7aea0, roof:0xb3b7b2, trim:0xe0e1d7, accent:0x616f73, glass:0x465b68 },
  evelynScott: { wall:0xb8916b, roof:0x888782, trim:0xd2c5a6, accent:0x876949, glass:0x465658 },
  coombs: { wall:0xcbc8be, roof:0xacafab, trim:0xe5e5dc, accent:0xc66e34, glass:0x485b60 }
};
const way = n => 'osm-'+n;
const definitions = {
  'canberra-stadium': ['way/57769299','arena','stadium',[57769381,57769631,57769638,57769717,57769207,57769270].map(way)],
  'university-of-canberra-hospital': ['way/569916788','hospital','universityHospital',[way(519783390)]],
  'hackett-shops': ['way/51537737','mall','hackett',[way(256143627)],[-.5,-.86]],
  'watson-shops': ['way/543790961','mall','watson',[way(543790961)],[.73,.68]],
  'charnwood-shops': ['way/24785037','mall','charnwood',[way(372148527)],[-.36,.93]],
  'kippax-fair': ['relation/9912221','mall','kippax',['osm-relation-9912221'],[-.86,-.51]],
  'charles-weston-school': ['way/548101844','campus','charlesWeston',[548101848,548101852].map(way)],
  'evelyn-scott-school': ['way/771746220','campus','evelynScott',[1248982164,1248982162].map(way)],
  'coombs-community-centre': ['way/1134389463','exhibition','coombs',[way(1134389463)],[.22,-.98]]
};

export function regionalExteriorParts(place) {
  const site = definitions[place.id];
  if (!site || site[0] !== place.sourceId) return null;
  const [,design,variant,buildings,frontage] = site;
  return buildings.map((buildingId,i) => ({
    ...place, buildingId, design, variant, frontage, palette:palettes[variant],
    showLabel:i===0 && design==='mall', grandstand:variant==='stadium' && i>=4
  }));
}

// A bowl is a curved strip around the pitch. Slice its *source polygon* at the
// vertex angles. Between two such angles the intersected edges cannot change.
// Samples are reused for the distant rake and for the near-only seat bands.
export function addStadiumStand({outer, place, ground, height, bodyQuad, detailQuad}) {
  const {x,z,grandstand} = place;
  const center = outer.reduce((c,p)=>[c[0]+p[0]/outer.length,c[1]+p[1]/outer.length],[0,0]);
  const axis = Math.atan2(center[1]-z,center[0]-x);
  const angles = outer.map(p => {
    const a=Math.atan2(p[1]-z,p[0]-x)-axis;
    return Math.atan2(Math.sin(a),Math.cos(a));
  }).sort((a,b)=>a-b);
  const slices=[];
  for(let i=1;i<angles.length;i++){
    const low=angles[i-1],high=angles[i],width=high-low;
    if(width<1e-6)continue;
    const count=Math.ceil(width/.15);
    for(let j=0;j<count;j++)slices.push([axis+low+width*j/count,axis+low+width*(j+1)/count]);
  }
  const edges=outer.map((a,i)=>{const b=outer[(i+1)%outer.length];return {x:a[0]-x,z:a[1]-z,dx:b[0]-a[0],dz:b[1]-a[1]};});
  function intersections(angle) {
    const cx=Math.cos(angle),cz=Math.sin(angle),hits=[];
    for(const edge of edges){
      const det=cx*edge.dz-cz*edge.dx;
      if(Math.abs(det)<1e-7)continue;
      const r=(edge.x*edge.dz-edge.z*edge.dx)/det,t=(edge.x*cz-edge.z*cx)/det;
      if(r>0&&t>=0&&t<1)hits.push({r,edge});
    }
    return hits.sort((a,b)=>a.r-b.r);
  }
  const base=ground+(grandstand?height*.65:.24),rise=height*(grandstand?1.1:.89);
  const rows=grandstand?4:5;
  const rake=(fraction)=>base+rise*fraction;
  let sections=0;
  for(const [a,b] of slices){
    const mid=(a+b)/2,hits=intersections(mid);
    // Handle a notch in the outline without spanning the empty piece.
    for(let h=0;h+1<hits.length;h+=2){
      const pair=[hits[h].edge,hits[h+1].edge];
      function column(angle) {
        const c=Math.cos(angle),s=Math.sin(angle);
        const r=pair.map(e=>(e.x*e.dz-e.z*e.dx)/(c*e.dz-s*e.dx));
        if(!r.every(Number.isFinite))return null;
        return (f,y)=>[x+c*(r[0]+(r[1]-r[0])*f),y,z+s*(r[0]+(r[1]-r[0])*f)];
      }
      const left=column(a),right=column(b);
      if(!left||!right)continue;
      bodyQuad(left(0,base),right(0,base),right(1,rake(1)),left(1,rake(1)),0x657583);
      bodyQuad(left(1,ground-.25),right(1,ground-.25),right(1,rake(1)),left(1,rake(1)),0x999992);
      // The named grandstands carry simple pale cantilevered roofs. The four
      // lower bowls remain open. Canopies stop inside their own footprint.
      if(grandstand){
        const head=rake(1)+3.2;
        bodyQuad(left(.24,head+.75),right(.24,head+.75),right(1,head),left(1,head),0xc4c6c2);
        bodyQuad(left(.24,head+.75),right(.24,head+.75),right(.24,head+.43),left(.24,head+.43),0x767e80);
        if(sections%4===0)bodyQuad(left(.95,rake(.95)),left(.97,rake(.97)),left(.97,head),left(.95,head),0x57616a);
      }
      const aisle=Math.floor((mid-axis+Math.PI)*9)%6===0;
      for(let row=0;row<rows;row++){
        const f0=row/rows,f1=(row+1)/rows,level=rake(f1)+.05;
        detailQuad(left(f0,level),right(f0,level),right(f1,level),left(f1,level),aisle?0xc0bcb0:(row%2?0x7892ac:0x586f8b));
        detailQuad(left(f0,rake(f0)+.04),right(f0,rake(f0)+.04),right(f0,level),left(f0,level),aisle?0x9a978b:0x354f6f);
      }
      sections++;
    }
  }
  return sections>0;
}

const shopAwning = {hackett:1.22,watson:1.55,charnwood:.98,kippax:1.72};
export function exteriorSign(place,height) {
  if(!place.showLabel)return null;
  const canopy=Math.min(3.15,height*.72);
  if(place.variant==='kippax')return {height:canopy+.51,depth:2.13,pixel:.23,text:'Kippax Fair',board:0xe1ded2,ink:0x9c353b};
  return {height:canopy,depth:shopAwning[place.variant]+.035,pixel:Math.min(.12,(height-canopy-.08)/5.8),
    text:place.variant==='kippax'?'Kippax Fair':place.name};
}

export function addRegionalFrontage({place,edges,front,ground,height,strip,ledge,at,face}) {
  const {variant,palette}=place,roof=ground+height;
  const long=edges.filter(e=>e.length>=4).sort((a,b)=>b.length-a.length).slice(0,10);
  const isShop=Object.hasOwn(shopAwning,variant);
  for(const edge of long){
    const length=edge.length;
    const frontFacing=edge===front||(front&&edge.nx*front.nx+edge.nz*front.nz>.63);
    const panel=(u,v,lo,hi,tint,d)=>strip(edge,u,v,ground+lo,ground+hi,tint,d);
    if(isShop){
      if(!frontFacing){
        if(length>=8&&variant!=='kippax'){
          // Mortar courses are spaced apart at this LOD to avoid shimmering.
          for(let y=.35;y<height-.1;y+=.36)panel(.04,length-.04,y,y+.025,0x967e69,.025);
          panel(.05,length-.05,.07,.21,palette.accent,.035);
        }
        continue;
      }
      const bays=Math.min(10,Math.max(1,Math.round(length/(variant==='kippax'?9:6))));
      const bay=length/bays,depth=shopAwning[variant],canopy=Math.min(3.15,height*.72);
      for(let i=0;i<bays;i++){
        const a=bay*i+.23,b=bay*(i+1)-.23;
        panel(a,b,.24,canopy-.13,palette.accent,.045);
        panel(a+.12,b-.12,.44,canopy-.23,palette.glass,.07);
        const door=a+(b-a)*.30;
        panel(door,door+.085,.22,canopy-.18,palette.trim,.095);
        panel(a+.1,b-.1,canopy*.77,canopy*.77+.07,palette.trim,.09);
        // At walking speed the counter, display cards and transoms separate
        // individual tenancies without inventing a tenant name or adding a prop.
        panel(a+.20,door-.12,.53,.76,i%2?0x9b9381:0xb2a08a,.085);
        if(bay>4){
          const poster=b-Math.min(1.24,bay*.2);
          panel(poster,b-.26,.83,1.54,0xd4ccac,.10);
          panel(poster+.08,b-.34,1.30,1.46,[0x92554c,0x57756c,0x7d805a][i%3],.115);
        }
      }
      // A shaded underside and projecting fascia give the shopping strips a
      // legible silhouette, even with no texture, transparency or new material.
      ledge(edge,.05,length-.05,ground+canopy,depth,.22,palette.trim);
      panel(.06,length-.06,canopy-.08,Math.min(height-.02,canopy+.56),palette.accent,depth+.008);
      if(variant==='hackett'||variant==='charnwood'){
        for(let i=1;i<bays;i++)panel(i*bay-.09,i*bay+.09,0,canopy-.12,palette.trim,depth-.06);
      }
      if(variant==='kippax'&&edge===front){
        // Low polygon arch over the central glazing, based on the public
        // Hardwick Crescent elevation. Coplanar rear caps are unnecessary.
        const mid=length/2,span=Math.min(length*.34,10.4);
        for(let i=0;i<12;i++){
          const u0=mid-span+2*span*i/12,u1=mid-span+2*span*(i+1)/12;
          const lift=u=>1.92*Math.sqrt(Math.max(0,1-((u-mid)/span)**2));
          const low=ground+canopy+.42,h0=low+lift(u0),h1=low+lift(u1);
          face(at(edge,u0,low,2.09),at(edge,u1,low,2.09),at(edge,u1,h1,2.09),at(edge,u0,h0,2.09),palette.trim);
          face(at(edge,u0,h0,2.09),at(edge,u1,h1,2.09),at(edge,u1,h1,0),at(edge,u0,h0,0),palette.roof);
        }
      }
      if(variant==='charnwood'){
        panel(.16,length-.16,height*.65,height*.85,palette.glass,.05);
        for(let i=1;i<bays*2;i++)panel(i*bay/2-.10,i*bay/2+.10,height*.65,height*.85,palette.wall,.07);
      }
      continue;
    }
    if(variant==='coombs'){
      panel(.15,length-.15,height*.48,height*.94,palette.trim,.03);
      for(let u=2;u<length;u+=2.9)panel(u,u+.045,height*.5,height*.93,0xa8aba6,.05);
      if(frontFacing){
        ledge(edge,.08,length*.81,ground+height*.51,.47,.11,palette.trim);
        panel(.22,length*.79,.12,height*.46,palette.glass,.06);
        for(let u=1.3;u<length*.79;u+=2.15)panel(u,u+.085,.12,height*.46,0x434843,.09);
        panel(length*.80,length*.92,.12,height-.02,palette.accent,.10);
      }
      continue;
    }
    if(variant==='universityHospital'){
      const count=Math.min(34,Math.max(1,Math.round(length/2.1))),size=length/count;
      const cladding=[0xaf9882,0xb97c56,0x977768,0xac9e94,0xbb9f89];
      for(let i=0;i<count;i++){
        const a=i*size+.035,b=(i+1)*size-.035;
        panel(a,b,.08,height*.97,cladding[(i*3)%cladding.length],.03+(i%3)*.018);
        if(i%3!==0)panel(a+.12,b-.12,height*.28,height*.76,palette.glass,.11);
      }
      continue;
    }
    const shaded=edge===front||length>15;
    if(!shaded)continue;
    const glazingLow=height*(variant==='charlesWeston'?.43:.32);
    const glazingHigh=height*(variant==='charlesWeston'?.82:.76);
    panel(.32,length-.32,glazingLow,glazingHigh,palette.glass,.035);
    const bays=Math.min(18,Math.max(1,Math.round(length/(variant==='charlesWeston'?2.9:4.1))));
    for(let i=1;i<bays;i++){
      const u=i*length/bays;
      panel(u-.085,u+.085,glazingLow-.04,glazingHigh+.04,palette.trim,.07);
    }
    if(variant==='charlesWeston'){
      ledge(edge,.15,length-.15,roof-.06,.55,.14,palette.trim);
      panel(.32,length-.32,glazingLow-.13,glazingLow,palette.accent,.06);
    }else{
      ledge(edge,.20,length-.20,roof-.13,frontFacing?1.35:.40,.20,palette.accent);
      if(frontFacing)for(let i=1;i<bays;i+=2){
        const u=i*length/bays;
        panel(u-.10,u+.10,.06,height-.29,palette.trim,1.20);
      }
    }
  }
}

// Representative shallow roof arrays on the two solar-powered schools. A
// concave footprint can cut across a rectangle even if its corners are inside,
// so reject candidate cells that intersect a source edge as well.
export function addSchoolSolar({outer,roof,edge,face}){
  if(!edge)return;
  const center=outer.reduce((m,p)=>[m[0]+p[0]/outer.length,m[1]+p[1]/outer.length],[0,0]);
  const local=outer.map(([x,z])=>[(x-center[0])*edge.tx+(z-center[1])*edge.tz,(x-center[0])*edge.nx+(z-center[1])*edge.nz]);
  const proj=(u,v,y)=>[center[0]+edge.tx*u+edge.nx*v,y,center[1]+edge.tz*u+edge.nz*v];
  const inside=(x,z)=>local.reduce((cross,a,i)=>{
    const b=local[(i+1)%local.length];
    return ((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])?!cross:cross;
  },false);
  for(let row=-1;row<=1;row++)for(let col=-3;col<=3;col++){
    const u=col*2.7,v=row*2.4,w=2.58,d=1.7;
    if(![[u,v],[u+w,v],[u,v+d],[u+w,v+d]].every(p=>inside(...p)))continue;
    const crosses=local.some((a,i)=>{
      const b=local[(i+1)%local.length];
      return Math.min(a[0],b[0])<u+w&&Math.max(a[0],b[0])>u&&Math.min(a[1],b[1])<v+d&&Math.max(a[1],b[1])>v;
    });
    if(crosses)continue;
    face(proj(u,v,roof+.12),proj(u+w,v,roof+.12),proj(u+w,v+d,roof+.31),proj(u,v+d,roof+.31),row%2?0x3b5268:0x384c61);
    face(proj(u,v+d,roof+.07),proj(u+w,v+d,roof+.07),proj(u+w,v+d,roof+.31),proj(u,v+d,roof+.31),0x777e7b);
  }
}
