import * as THREE from '../vendor/three.module.js';

// Only these exported decorative visuals are replaced. World keeps every source
// collision box, field, goal, rail and access surface, including HomeBench support.
export const REPLACED_STADIUM_PARTS=Object.freeze(['HomeBench','Seat','SeatBack','GrandstandRiser','CanopyPost','GrandstandCanopy','Floodlight','FloodlightPole','Scoreboard','ScoreboardPost','EntranceSign','EntranceSignPost']);
export const STADIUM_FEATURES=Object.freeze([
  Object.freeze(['Basic pitch']),Object.freeze(['Bleachers','Team benches']),
  Object.freeze(['Expanded stands','Live scoreboard']),Object.freeze(['Floodlights','Canopies','Entrance gate'])
]);
const tier=value=>Math.max(0,Math.min(3,Number.isFinite(value)?Math.trunc(value):0));

export class StadiumView {
  constructor() {
    this.root=new THREE.Group();this.root.name='stadium-upgrades';this.level=0;this.disposed=false;this.batches=[];
    this.geometry=new THREE.BoxGeometry(1,1,1);this.material=new THREE.MeshLambertMaterial({color:0xffffff});
    const levels=[[],[],[],[]];
    const box=(level,position,size,color)=>levels[level].push({position,size,color});
    const concrete='#65747C',blue='#246AC9',gold='#E4BD58',dark='#192A3F';
    // Long stepped terraces stay outside the touchline (Z +/-70). The old
    // north bench collider occupies Z76..80 and remains the first support step.
    for(const side of [-1,1]) {
      for(let row=0;row<3;row++) {
        const level=row===0?1:2,z=side*(78+row*4),y=1+row*2;
        box(level,[0,row+1,z],[168,2+row*2,4],concrete);
        for(let x=-70;x<=70;x+=20) {
          box(level,[x,y+1,z],[12,.5,2.6],blue);
          box(level,[x,y+1.9,z+side*1.3],[12,1.8,.3],blue);
        }
      }
      for(const x of [-58,58])box(1,[x,1.1,side*73],[20,1.2,2],gold);
      box(3,[0,15,side*84],[174,.65,20],dark);
      for(const x of [-82,0,82])box(3,[x,7.5,side*92],[.8,15,.8],concrete);
    }
    for(const x of [-20,20])box(2,[x,10,95],[1,20,1],concrete);
    box(2,[0,20,95],[46,10,1],dark);
    for(const x of [-104,104])for(const z of [-90,90]) {
      box(3,[x,14,z],[1,28,1],concrete);
      box(3,[x,28,z],[12,3,3],dark);
      for(const dx of [-4,0,4])box(3,[x+dx,28,z-1.6],[2.5,2,.2],'#FFF7DD');
    }
    // East entrance has a 24-unit clear opening and no new collision walls.
    for(const z of [-12,12])box(3,[115,6,z],[2,12,2],concrete);
    box(3,[115,12.5,0],[2,2,28],gold);
    const dummy=new THREE.Object3D();
    levels.forEach((items,level)=>{
      if(!items.length)return;
      const mesh=new THREE.InstancedMesh(this.geometry,this.material,items.length);
      for(const [i,item] of items.entries()) {
        dummy.position.set(...item.position);dummy.scale.set(...item.size);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new THREE.Color(item.color));
      }
      mesh.computeBoundingSphere();mesh.receiveShadow=true;this.root.add(mesh);this.batches.push({mesh,level});
    });
    this.scoreText='';this.scoreUpdates=0;
    if(typeof document!=='undefined') {
      const canvas=document.createElement('canvas');canvas.width=768;canvas.height=192;const context=canvas.getContext('2d');
      if(context) {
        this.canvas=canvas;this.context=context;this.texture=new THREE.CanvasTexture(canvas);this.texture.colorSpace=THREE.SRGBColorSpace;
        this.boardMaterial=new THREE.MeshBasicMaterial({map:this.texture,side:THREE.DoubleSide});this.boardGeometry=new THREE.PlaneGeometry(44,9);
        this.board=new THREE.Mesh(this.boardGeometry,this.boardMaterial);this.board.position.set(0,20,94.4);this.board.rotation.y=Math.PI;this.root.add(this.board);
      }
    }
    this.setLevel(0);this.update({});
  }
  setLevel(value) {if(this.disposed)return;this.level=tier(value);for(const batch of this.batches)batch.mesh.visible=batch.level<=this.level;if(this.board)this.board.visible=this.level>=2;}
  update({match}={}) {
    if(this.disposed)return;
    const scores=(match?.score||[0,0]).map(n=>Number.isFinite(n)?Math.max(0,Math.trunc(n)):0);
    const period=match?.finished?'FULL TIME':match?.penalties?`PENALTIES ${match.penalties.scores?.join(' : ')||'0 : 0'}`:({regulation:'MATCH',extra1:'EXTRA TIME 1',extra2:'EXTRA TIME 2',penalties:'PENALTIES'}[match?.period]||'HOME GROUND');
    const text=`${scores[0]} : ${scores[1]} | ${period}`;
    if(text===this.scoreText)return;this.scoreText=text;this.scoreUpdates++;
    if(!this.context)return;
    const ctx=this.context;ctx.fillStyle='#192A3F';ctx.fillRect(0,0,768,192);ctx.fillStyle='#FFF7DD';ctx.textAlign='center';ctx.font='bold 92px sans-serif';ctx.fillText(`${scores[0]} : ${scores[1]}`,384,110);ctx.fillStyle='#E4BD58';ctx.font='bold 30px sans-serif';ctx.fillText(period,384,165);this.texture.needsUpdate=true;
  }
  snapshot() {
    const visible=this.batches.filter(b=>b.mesh.visible);
    return {tier:this.level,capacity:[0,16,48,48][this.level],features:STADIUM_FEATURES.slice(0,this.level+1).flat(),drawCalls:visible.length+(this.board?.visible?1:0),triangles:visible.reduce((sum,b)=>sum+b.mesh.count*12,0)+(this.board?.visible?2:0),scoreText:this.scoreText,scoreUpdates:this.scoreUpdates,colliders:0};
  }
  dispose() {if(this.disposed)return;this.disposed=true;this.root.removeFromParent();for(const batch of this.batches)batch.mesh.dispose();this.root.clear();this.geometry.dispose();this.material.dispose();this.boardGeometry?.dispose();this.boardMaterial?.dispose();this.texture?.dispose();}
}
