const PROFILES=Object.freeze({
  performance:Object.freeze({width:640,height:360,fps:20}),
  low:Object.freeze({width:960,height:540,fps:30}),
  standard:Object.freeze({width:1440,height:900,fps:60}),
});
export const renderProfile=quality=>PROFILES[quality]||PROFILES.low;
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
