// Pointer-only adapter. The owner supplies touch-action:none and activation.
export function createTouchControls(root,onControl) {
  const pointers=new Map();
  const holds=['fire','aim','sprint','jump'],pulses=['interact','order','reload','pause'];
  let active=false,clearing=false;
  const neutral=type=>onControl(type==='move'?{type,forward:0,right:0}:{type,dx:0,dy:0});
  const held=action=>[...pointers.values()].some(p=>p.kind==='hold'&&p.action===action);
  function release(id,p) {
    // Capture may already have been lost, or the element removed.
    try{p.element.releasePointerCapture(id);}catch{}
  }
  function finish(id,element) {
    const p=pointers.get(id);
    if(!p||p.element!==element)return;
    pointers.delete(id); // A synchronous lostpointercapture must see no owner.
    release(id,p);
    if(p.kind==='move'||p.kind==='look')neutral(p.kind);
    else if(p.kind==='hold'&&!held(p.action))onControl({type:'button',action:p.action,down:false});
  }
  function move(p,e) {
    const x=(e.clientX-p.cx)/p.radius,y=(e.clientY-p.cy)/p.radius,length=Math.hypot(x,y);
    // Radial dead zone, rescaled continuously to full strength at the pad edge.
    const strength=Math.max(0,Math.min(1,(length-.12)/.88));
    onControl({type:'move',forward:strength?-y/length*strength:0,right:strength?x/length*strength:0});
  }
  function clear() {
    if(clearing)return;
    clearing=true;
    const previous=[...pointers],actions=new Set(previous.filter(([,p])=>p.kind==='hold').map(([,p])=>p.action));
    pointers.clear();
    try {
      for(const [id,p] of previous)release(id,p);
      neutral('move');neutral('look');
      for(const action of actions)onControl({type:'button',action,down:false});
    } finally {clearing=false;}
  }
  for(const element of root.querySelectorAll('[data-pad], [data-hold], [data-pulse]')) {
    const {pad,hold,pulse}=element.dataset;
    const kind=pad==='move'||pad==='look'?pad:holds.includes(hold)?'hold':pulses.includes(pulse)?'pulse':null;
    if(!kind)continue;
    const action=kind==='hold'?hold:pulse;
    element.addEventListener('pointerdown',e=>{
      if(!active||clearing||(e.pointerType==='mouse'&&e.button!==0))return;
      e.preventDefault();
      if(pointers.has(e.pointerId))return;
      if((kind==='move'||kind==='look')&&[...pointers.values()].some(p=>p.kind===kind))return;
      const alreadyHeld=kind==='hold'&&held(action);
      const p={kind,action,element,x:e.clientX,y:e.clientY};
      if(kind==='move') {
        const rect=element.getBoundingClientRect();
        p.cx=rect.left+rect.width/2;p.cy=rect.top+rect.height/2;
        p.radius=Math.max(1,Math.min(rect.width,rect.height)/2);
      }
      pointers.set(e.pointerId,p);
      try{element.setPointerCapture(e.pointerId);}catch{pointers.delete(e.pointerId);return;}
      if(pointers.get(e.pointerId)!==p)return;
      // Store/capture before calling out: pause may synchronously deactivate us.
      if(kind==='move')move(p,e);
      else if(kind==='hold'&&!alreadyHeld)onControl({type:'button',action,down:true});
      else if(kind==='pulse')onControl({type:'pulse',action});
    },{passive:false});
    element.addEventListener('pointermove',e=>{
      if(!active||clearing)return;
      const p=pointers.get(e.pointerId);
      if(!p||p.element!==element)return;
      e.preventDefault();
      if(e.pointerType==='mouse'&&(e.buttons&1)===0){finish(e.pointerId,element);return;}
      if(p.kind==='move')move(p,e);
      else if(p.kind==='look') {
        const dx=e.clientX-p.x,dy=e.clientY-p.y;
        p.x=e.clientX;p.y=e.clientY;
        if(dx||dy)onControl({type:'look',dx,dy});
      }
    },{passive:false});
    if(kind==='hold') {
      element.addEventListener('keydown',e=>{
        if(!active||clearing||!['Space','Enter'].includes(e.code))return;
        e.preventDefault();const id='key:'+e.code;
        if(e.repeat||pointers.has(id))return;
        const alreadyHeld=held(action);pointers.set(id,{kind,action,element});
        if(!alreadyHeld)onControl({type:'button',action,down:true});
      },{passive:false});
      element.addEventListener('keyup',e=>{if(['Space','Enter'].includes(e.code)){e.preventDefault();finish('key:'+e.code,element);}},{passive:false});
      element.addEventListener('blur',()=>{for(const [id,p] of pointers)if(typeof id==='string'&&p.element===element)finish(id,element);},{passive:false});
    }
    if(kind==='pulse')element.addEventListener('click',e=>{if(active&&!clearing&&e.detail===0)onControl({type:'pulse',action});},{passive:false});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(type,e=>{
      if(!pointers.has(e.pointerId))return;
      e.preventDefault();finish(e.pointerId,element);
    },{passive:false});
  }
  // clear() keeps activation; setActive(false) clears and ignores further input.
  // A clear always emits zero move/look plus one release per held action.
  return {setActive(value){active=!!value;if(!active)clear();},clear};
}
