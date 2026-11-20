import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

// Original pooled backpack and two exhaust cones. No particles or own clock.
export function createJetpackView(scene, heightAt) {
  const root = new THREE.Group(); root.name = 'Personal flight pack'; root.visible = false;
  const box = new THREE.BoxGeometry(.55, .65, .24), cone = new THREE.ConeGeometry(.09, .45, 5);
  const shell = new THREE.MeshLambertMaterial({ color: 0x555b63 });
  const flame = new THREE.MeshBasicMaterial({ color: 0xffbd58 });
  const pack = new THREE.Mesh(box, shell); pack.position.set(0, 1.14, .24); root.add(pack);
  const jets = [-.18, .18].map(x => {
    const mesh = new THREE.Mesh(cone, flame); mesh.rotation.z = Math.PI; mesh.position.set(x, .6, .25); root.add(mesh); return mesh;
  });
  scene.add(root); let disposed = false;
  return {
    update(actor, flight) {
      if (disposed) return;
      const floor = actor && heightAt(actor.x, actor.z);
      root.visible = Boolean(flight?.active && Number.isFinite(floor));
      if (!root.visible) return;
      root.position.set(actor.x, floor + (actor.jumpHeight || 0), actor.z); root.rotation.y = actor.yaw || 0;
      for (const jet of jets) jet.visible = Boolean(flight.thrust);
    },
    dispose() {
      if (disposed) return; disposed = true; scene.remove(root); box.dispose(); cone.dispose(); shell.dispose(); flame.dispose();
    }
  };
}
