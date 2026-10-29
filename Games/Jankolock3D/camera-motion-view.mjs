import { CameraBob } from './camera-bob.mjs';

/** Render-only companion for the existing unparented logical camera.
 * sample(sightPoint, {dt, distance?, speed?, grounded, aiming, zipping,
 *                    enabled, reducedMotion}) returns the same view camera.
 * Supply a world-space point on the logical center ray and actual horizontal
 * travel, excluding warps. Never pass this view to aiming or hit calculations.
 * reset() on warp/respawn/restart; dispose() owns no GPU resources.
 */
export class CameraMotionView {
  constructor(logicalCamera) {
    this.logicalCamera = logicalCamera;
    // Camera.clone() ignores the recursive flag in the vendored three.js.
    this.camera = new logicalCamera.constructor().copy(logicalCamera, false);
    this.bob = new CameraBob();
    this.disposed = false;
  }

  sample(sightPoint, {zipping = false, ...motion} = {}) {
    if (this.disposed) throw new Error('Camera motion view is disposed.');
    const view = this.camera.copy(this.logicalCamera, false);
    const offset = this.bob.sample({...motion, grounded: Boolean(motion.grounded) && !zipping});
    if (offset !== 0) {
      const focus=typeof sightPoint==='function'?sightPoint():sightPoint;
      // A sub-metre focus can turn millimetres of bob into a large camera tilt.
      if(!focus?.isVector3||![focus.x,focus.y,focus.z].every(Number.isFinite)||view.position.distanceToSquared(focus)<1){this.bob.reset();return view;}
      view.position.y += offset;
      view.lookAt(focus);
      view.updateMatrixWorld(true);
    }
    return view;
  }

  reset() {
    this.bob.reset();
    return this.camera.copy(this.logicalCamera, false);
  }

  dispose() {
    if (this.disposed) return;
    this.reset();
    this.disposed = true;
  }
}
