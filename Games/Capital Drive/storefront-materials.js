// The two shop windows fit in the empty left/right margins of the existing
// lettering atlas. All colours and merchandise silhouettes are original.
const GROCERS = new Set(['Coals','Coals Dickson','Scoot Wholefoods','Super Expressive','Prawn Asian Grocery','Supper Express',"Iggy's O'Connor",'Braddon Suppermarket']);
const BOOKS = new Set(['Paperback Chain','Newsweak','The Book Moo']);
const BAKERS = new Set(['Patisseriously','Bake Pause','Up Town Milk Bar']);
const CERAMICS = [0xc6ad80,0xaf7753,0xd4b690,0x79867f,0xb7a693];
const COVERS = [0x9a755a,0x879392,0x637580,0xb4966a,0xae826a,0x8b6f67];
const PRODUCE = [0xbb9c58,0xa46d54,0x87945f,0xbf8654,0x8b8462];

const TAKEAWAY = new Set(['MacDawdles','Thrilld','Sombreroll','You Sushi']);
// Form describes the public facade treatment at the mapped unit. Distances are
// bounded visual estimates. Interactive doorways and source footprints stay put.
const FORMS={
  market:{depth:.74,door:1.54,bias:.04,sill:.22,piers:2,canopy:'flat'},
  books:{depth:.35,door:.97,bias:-.18,sill:.36,piers:3,canopy:'band'},
  arcade:{depth:.82,door:1.24,bias:.13,sill:.13,piers:1,canopy:'flat'},
  shop:{depth:.73,door:1.0,bias:.10,sill:.48,piers:1,canopy:'flat'},
  timber:{depth:.61,door:.95,bias:.15,sill:.59,piers:2,canopy:'band'},
  counter:{depth:.55,door:1.19,bias:-.15,sill:.29,piers:1,canopy:'band'},
  cafe:{depth:.86,door:1.05,bias:.13,sill:.20,piers:1,canopy:'fabric'},
  grille:{depth:.50,door:1.03,bias:.18,sill:.23,piers:2,canopy:'band'},
  chamfer:{depth:.86,door:1.16,bias:0,sill:.14,piers:2,canopy:'flat'},
};
const FORMS_BY_TENANT={
  'Coals':'market','Paperback Chain':'books','Newsweak':'timber','Scoot Wholefoods':'timber',
  'The Book Moo':'books','Toe Boots':'shop','Super Expressive':'market','MacDawdles':'counter',
  'You Sushi':'counter','Kismaybe':'counter','Plink':'shop','El Torogoose':'cafe','Your Cafe':'cafe',
  'Caps Lock':'arcade','Belloucies':'grille','Up Town Milk Bar':'chamfer','Thrilld':'counter',
  'Receipt Cafe':'cafe','Patisseriously':'cafe','Sombreroll':'arcade','Lambzhou 1919':'arcade',
  'Coals Dickson':'market','Dickson Oodle House':'arcade','Prawn Asian Grocery':'market',
  'Supper Express':'market','Bake Pause':'shop','Till We Meet Cafe':'cafe',
  "Iggy's O'Connor":'market','Braddon Suppermarket':'shop',
};
const SPECIAL_FRONTS = {
  'The Book Moo': {surround:0xdaceb3,fascia:0x535859,edge:0x3c4346,soffit:0x9b9c8a},
  'Scoot Wholefoods': {surround:0xa58563,fascia:0x5e6c5a,edge:0x524b3c,soffit:0xbfb299},
  'Belloucies': {surround:0x33373b,fascia:0x3b403e,edge:0x323636,soffit:0x665849},
  'Your Cafe': {surround:0xa07459,fascia:0x775c4b,edge:0x5b5146,soffit:0xe2dcce},
  'Up Town Milk Bar': {surround:0xbabcb5,fascia:0x69706c,edge:0xc0c0b4,soffit:0xdcd7c5},
  'Caps Lock': {surround:0x80634c,fascia:0x665040,edge:0x5b5045,soffit:0xc3a887},
  'Thrilld': {surround:0x92785b,fascia:0x4f5248,edge:0x55574a,soffit:0xae9678},
  'Bake Pause': {surround:0x443f3c,fascia:0x343837,edge:0x484841,soffit:0xc1b8a5},
  'Sombreroll': {surround:0x5c605b,fascia:0x40554b,edge:0xc9c6b9,soffit:0xb59371},
  'Coals Dickson': {surround:0x9c886c,fascia:0x555953,edge:0x434c47,soffit:0xaa8e72},
  'Super Expressive': {fascia:0xaa4948,edge:0xa84843,surround:0xa9a49b,soffit:0xcac3ae},
  'Braddon Suppermarket': {fascia:0x37496a,edge:0x39496a,surround:0xd6d2bb,soffit:0xbabdb2},
  "Iggy's O'Connor": {fascia:0x405347,edge:0x34483d,surround:0xaa947c,soffit:0xb0a587},
  'Till We Meet Cafe': {fascia:0x50473b,edge:0x413b31,surround:0x927566,soffit:0x9d8b72},
  'Supper Express': {fascia:0x353a37,edge:0xcfc9ba,surround:0x9a6e55,soffit:0xcdcbbd},
};
export function frontageProfile(store) {
  let display='dining';
  if(GROCERS.has(store.name))display='produce';
  else if(BOOKS.has(store.name))display='books';
  else if(BAKERS.has(store.name))display='bakery';
  else if(TAKEAWAY.has(store.name))display='counter';
  else if(store.name==='Toe Boots')display='boots';
  else if(store.type==='retail')display='wares';
  let architecture={surround:0xc2bbae,fascia:display==='produce'?0x4c6357:0x675954,soffit:0xb8a38c,edge:0x424d4c};
  if(store.district==='Kingston')architecture={surround:0xc1ab8e,fascia:0x495852,soffit:0xd1c7b6,edge:0x514b42};
  if(store.district==='Manuka')architecture={surround:0xd2c5ae,fascia:display==='books'?0x494e47:display==='produce'?0x755248:0x6f554b,soffit:0xd4c7aa,edge:0x403d38};
  if(store.district==='Dickson')architecture={surround:0xbbab98,fascia:0x4f6463,soffit:0xa58f73,edge:0x4b524e};
  const form=FORMS_BY_TENANT[store.name] || 'shop';
  return {display,form,layout:FORMS[form],...architecture,...SPECIAL_FRONTS[store.name]};
}

const W=208,H=58;
export function paintShopWindow(pixels,atlasWidth,atlasHeight,store,index,side,display) {
  const left=side<0?4:atlasWidth-W-4,top=index*64+3;
  const colorAt=(x,y)=>((atlasHeight-1-top-y)*atlasWidth+left+x)*4;
  function rect(x,y,w,h,c) {
    for(let row=Math.max(0,Math.floor(y));row<Math.min(H,Math.ceil(y+h));row++){
      let i=colorAt(Math.max(0,Math.floor(x)),row);
      for(let col=Math.max(0,Math.floor(x));col<Math.min(W,Math.ceil(x+w));col++,i+=4){
        pixels[i]=c>>16;pixels[i+1]=(c>>8)&255;pixels[i+2]=c&255;pixels[i+3]=255;
      }
    }
  }
  // Draw the visible rear wall and ceiling first. Offset the shop furniture in
  // each window, while keeping the shop's material palette continuous.
  const seed=(Number(store.source?.id)||0)%97+(side<0?7:23);
  rect(0,0,W,H,0x645744);
  for(let y=0;y<H;y++){
    const b=Math.floor(39*Math.sin(Math.PI*y/H));
    rect(0,y,W,1,((78+b)<<16)|((72+b)<<8)|(60+b));
  }
  rect(0,0,W,7,0x615747);
  for(let x=8+seed%14;x<W;x+=41){
    rect(x,4,16,2,0xb9a780);rect(x+2,4,12,1,0xdfcc9f);
  }
  if(display==='books'||display==='produce'||display==='wares'){
    const tiers=display==='books'?3:2;
    for(let j=0;j<tiers;j++){
      const y=25+j*(tiers===3?11:16);
      rect(3,y,W-6,3,0x776147);rect(3,y,W-6,1,0xb9a084);
      for(let i=0,x=7;x<W-9;i++){
        const n=(i*37+j*19+seed)%29;
        if(display==='books') {
          const width=3+n%6,height=6+n%5;
          rect(x,y-height,width,height,COVERS[n%COVERS.length]);
          rect(x+1,y-height+2,Math.max(1,width-2),1,0xc4b29a);x+=width+1;
        }else if(display==='produce'){
          const width=18+n%8;
          rect(x,y-6,width,6,0x805e45);
          for(let k=1;k<width-4;k+=5)rect(x+k,y-8+(k%2),5,4,PRODUCE[(n+j)%PRODUCE.length]);
          rect(x+2,y-3,4,2,0xd5ccb1);x+=width+3;
        }else{
          const width=10+n%8;rect(x,y-3,width,3,CERAMICS[n%CERAMICS.length]);
          rect(x+3,y-6,width-6,4,CERAMICS[n%CERAMICS.length]);x+=width+9;
        }
      }
    }
  }else if(display==='boots'){
    for(let tier=0;tier<3;tier++){
      const y=22+tier*12;
      rect(2,y,W-4,2,0x67816a);
      for(let j=0;j<9;j++){
        const x=5+j*23+(j+tier)%3;
        const leather=[0x8c684f,0x454943,0xaa7d58][(j+tier)%3];
        rect(x+2,y-8,6,7,leather);rect(x+5,y-4,10,4,leather);rect(x+1,y-1,15,1,0x3e4038);
      }
    }
  }else if(display==='counter'){
    for(let j=0;j<4;j++){
      const x=10+j*46;
      rect(x,12,42,13,0x3c4340);rect(x+2,14,17,8,0xb38566);
      rect(x+22,15,16,2,0xd4bea1);rect(x+22,19,11,1,0xd4bea1);
    }
    rect(0,32,W,3,0xcdbba1);rect(0,35,W,14,0x917b67);
    for(let j=0;j<3;j++)rect(24+j*65,29,7,5,0x414949);
  }else if(display==='bakery'){
    rect(7,29,W-15,21,0x816e53);rect(7,29,W-15,2,0xc5b7a1);
    for(let i=0;i<9;i++){
      const x=12+i*22;rect(x,33,18,10,0x5f594c);
      for(let k=1;k<14;k+=6)rect(x+k,36-k%2,6,4,0xc79b63);
    }
    rect(7,44,W-15,2,0xddcfb3);
  }else{
    // Tables, chair backs and pendant shades behind a restaurant window.
    for(let i=0;i<4;i++){
      const x=13+44*i+seed%9;
      rect(x+14,6,1,12,0x493e31);rect(x+10,17,10,3,0xc7a171);
      rect(x+7,20,16,2,0xe1c69b);
      rect(x,37,31,3,0xaa8e69);rect(x+13,40,3,12,0x594e3e);
      rect(x-3,36,3,15,0x7d7058);rect(x+29,35,3,16,0x7d7058);
      rect(x-3,42,9,2,0x8e795c);rect(x+24,42,8,2,0x8e795c);
    }
  }
  if(store.name==='Scoot Wholefoods'){
    for(let x=8;x<W-14;x+=19){
      rect(x,16,15,24,0x8f795d);rect(x+2,17,11,14,0xb69f79);
      rect(x+4,31,7,4,0xd8c5a5);rect(x+6,35,3,5,0x574e3f);
    }
  }
  if(store.name==='Newsweak'||store.name==='The Book Moo'){
    for(let row=0;row<2;row++)for(let j=0;j<9;j++){
      const x=9+j*22,y=15+15*row;
      rect(x,y,16,13,COVERS[(j+row+seed)%COVERS.length]);rect(x+2,y+2,12,2,0xd9cbb6);
      rect(x+3,y+6,7,4,0x9d8163);rect(x,y+13,18,2,0x8b785d);
    }
  }
  if(store.name==='Dickson Oodle House'){
    for(let j=0;j<3;j++){
      const x=14+j*33;
      rect(x,11,25,14,0x594735);rect(x+2,13,21,10,0xc7bca0);
      for(let y=15;y<22;y+=3)rect(x+4,y,13+(j+y)%5,1,0x807966);
    }
  }
  if(store.name==='Prawn Asian Grocery'){
    for(let tier=0;tier<2;tier++)for(let x=6,j=0;x<W-8;x+=11,j++){
      const y=22+tier*15;
      rect(x,y-7,8,7,CERAMICS[(j+tier)%CERAMICS.length]);rect(x+1,y-4,6,2,0xbcb284);
      rect(x+2,y-8,5,1,0x827462);
    }
  }
  if(store.name==='Plink'){
    for(let j=0;j<3;j++)for(let x=5;x<W-9;x+=10){
      const y=23+j*12;rect(x+3,y-8,3,3,0x5d5743);rect(x+1,y-5,7,6,0x706a45);
      rect(x+2,y-3,5,2,0xc2ad83);rect(x,y+1,9,1,0xa48d6e);
    }
  }
  if(store.name==='You Sushi'||store.name==='Sombreroll'||store.name==='Kismaybe'){
    rect(4,29,W-8,14,0xa6b1a4);rect(6,31,W-12,8,0x736f61);
    for(let x=9,j=0;x<W-10;x+=15,j++){
      rect(x,33,12,4,PRODUCE[(j+seed)%PRODUCE.length]);rect(x+1,32,9,1,0xd6caa9);
    }
    rect(4,39,W-8,2,0xdacbb8);
  }
  if(store.name==='Caps Lock'||store.name==='Thrilld'||store.name==='Belloucies'){
    for(let x=12;x<W-10;x+=37){
      const metal=store.name==='Belloucies',upholstery=store.name==='Thrilld'?0x945b52:0xaa8662;
      rect(x,39,14,3,metal?0xa3a29a:upholstery);rect(x+2,42,2,11,0x6f6c60);rect(x+11,42,2,11,0x6f6c60);
      if(!metal)rect(x,30,3,10,upholstery);
    }
  }
  if(store.name==='MacDawdles'||store.name==='Receipt Cafe'){
    rect(14,25,39,13,0x757a73);rect(16,24,34,2,0xcfccc0);
    for(const x of [18,27,37]){rect(x,32,5,6,0xcbbfa9);rect(x+1,30,3,2,0x48463e);}
  }
  if(store.name==='Patisseriously'){
    for(let x=13;x<W-10;x+=26){
      rect(x,34,15,4,0x986d50);rect(x+3,31,9,3,0xd9bd85);rect(x+6,29,4,2,0xa46659);
    }
  }
  if(store.name==='Till We Meet Cafe'){
    for(let j=0;j<3;j++){
      const x=10+j*70;
      rect(x,32,17,17,0x493f36);rect(x+43,32,17,17,0x493f36);
      rect(x+15,37,31,2,0xba9a71);rect(x+28,39,3,12,0x554838);
      rect(x+3,15,5,3,0xf0c47e);
    }
    for(const x of [5,W-21]){
      rect(x,48,16,7,0x655b4f);
      for(let row=0;row<23;row++){
        const half=2+row*.24;rect(x+8-half,25+row,2*half,1,row%4===0?0x6a7355:0x596649);
      }
    }
  }
  if(store.name==='Paperback Chain'){
    for(const x of [45,83,126,168]){
      rect(x-9,38,18,13,0x896a4e);rect(x-5,30,11,14,COVERS[(x+seed)%COVERS.length]);
      rect(x-3,33,7,2,0xdac7a7);
    }
  }
  if(store.name==='Braddon Suppermarket'){
    // Lowanna Street's broad pale shopfront panels sit below a blue sign band.
    rect(side<0?0:W-52,8,52,44,0xd1cbb0);
    for(let line=0;line<3;line++)rect(side<0?7:W-44,17+8*line,32-line*3,2,0x71726b);
  }
  // Light reflected from sky/pavement sits in front of the room. Make the
  // glass brighter at the top and retain enough interior contrast at eye level.
  const reflectedEdge=new Float32Array(W);
  for(let x=0;x<W;x++)reflectedEdge[x]=12+3*Math.sin((x+seed)/19)+1.8*Math.sin(x/7);
  for(let y=0;y<H;y++){
    let i=colorAt(0,y);
    for(let x=0;x<W;x++,i+=4){
      const sky=y<reflectedEdge[x];
      const t=sky?.39:.11;
      const light=sky?187:144;
      const value=(x+y*2+seed)%104;
      const glint=value<3?11:0;
      pixels[i]=pixels[i]*(1-t)+(light-20)*t+glint;
      pixels[i+1]=pixels[i+1]*(1-t)+light*t+glint;
      pixels[i+2]=pixels[i+2]*(1-t)+(light+8)*t+glint;
    }
  }
  return {u0:(left+.5)/atlasWidth,u1:(left+W-.5)/atlasWidth,v0:1-(top+H-.5)/atlasHeight,v1:1-(top+.5)/atlasHeight};
}
