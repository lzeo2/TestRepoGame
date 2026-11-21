const PROFILES=Object.freeze({
  performance:Object.freeze({width:640,height:360,fps:20}),
  low:Object.freeze({width:960,height:540,fps:30}),
  standard:Object.freeze({width:1440,height:900,fps:60}),
  realism:Object.freeze({width:1600,height:900,fps:45,exposure:.95}),
});
export const renderProfile=quality=>Object.hasOwn(PROFILES,quality)?PROFILES[quality]:PROFILES.low;
export function chooseRenderQuality(saved,renderer=''){
  return Object.hasOwn(PROFILES,saved)?saved:/swiftshader|llvmpipe|software rasterizer/i.test(renderer)?'performance':'low';
}

// Static menus need one fresh frame, not a continuous redraw of the city.
export function createRenderGate() {
  let idleRevision = null;
  return {
    shouldRender({ paused, hidden, cinematic, tracking, revision, pendingChunks = 0 }) {
      if (hidden) { idleRevision = null; return false; }
      if (!paused || cinematic || tracking) { idleRevision = null; return true; }
      if (pendingChunks > 0 || idleRevision !== revision) {
        idleRevision = revision;
        return true;
      }
      return false;
    },
  };
}

// Keep the intended cadence after small late frames; never render a burst to
// repay a long stall. The controller remains the only RAF owner.
export function createFramePacer(){
  let next=null,previousFps=null;
  return {ready(time,fps){
    if(!Number.isFinite(time)||!Number.isFinite(fps)||fps<=0)return false;
    const interval=1000/Math.max(1,Math.min(60,fps));
    if(next===null||fps!==previousFps){next=time;previousFps=fps;}
    if(time+.5<next)return false;
    next=time-next>interval*2?time+interval:next+interval;
    return true;
  },reset(){next=null;previousFps=null;}};
}
