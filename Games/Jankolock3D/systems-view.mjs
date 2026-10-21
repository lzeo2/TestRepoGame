import * as THREE from './vendor/three.module.js';

// Attachable actor layer only. No map geometry, hero model, camera, or render loop.
export function createSystemsLayer(scene) {
  const actors = new Map(), box = new THREE.BoxGeometry(1, 1, 1),
    candle = new THREE.CylinderGeometry(0.16, 0.2, 1, 6), orb = new THREE.IcosahedronGeometry(0.65, 2);
  const materials = {
    carbon: new THREE.MeshBasicMaterial({ color: 0x242820 }),
    ivory: new THREE.MeshBasicMaterial({ color: 0xf7f3e8 }),
    candle: new THREE.MeshStandardMaterial({ color: 0x242820, emissive: 0x827762, emissiveIntensity: 0.6 }),
    soul: new THREE.MeshBasicMaterial({ color: 0x365a74 }),
    edge: new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide })
  };
  let disposed = false;
  function makeTrooper(t) {
    const group = new THREE.Group(), bodyMaterial = materials[t.team] ?? materials.carbon;
    const part = (x, y, z, sx, sy, sz) => {
      const m = new THREE.Mesh(box, bodyMaterial); m.position.set(x, y, z); m.scale.set(sx, sy, sz); group.add(m);
    };
    part(0, 0.9, 0, 0.8, 1, 0.5);
    part(-0.23, 0.25, 0, 0.25, 0.5, 0.3); part(0.23, 0.25, 0, 0.25, 0.5, 0.3);
    const head = new THREE.Mesh(candle, materials.candle.clone()); group.add(head);
    group.userData = { id: t.id, kind: 'trooper', head }; return group;
  }
  function makeOrb(o) {
    const mesh = new THREE.Mesh(orb, materials.soul), outline = new THREE.Mesh(orb, materials.edge);
    outline.scale.setScalar(1.09); mesh.add(outline);
    mesh.userData = { id: o.id, kind: 'orb' }; return mesh;
  }
  function sync(sim) {
    if (disposed) return;
    const present = new Set();
    for (const entity of [...sim.troopers.filter(t => t.alive), ...sim.orbs.filter(o => !o.claimed && sim.time < o.expiresAt)]) {
      present.add(entity.id);
      let actor = actors.get(entity.id);
      if (!actor) { actor = entity.kind === 'trooper' ? makeTrooper(entity) : makeOrb(entity); actors.set(entity.id, actor); scene.add(actor); }
      const p = entity.position; actor.position.set(p.x, p.y + (entity.kind === 'orb' && entity.type === 'ground' ? 0.4 : 0), p.z);
      if (entity.kind === 'trooper') {
        const scale = entity.candleScale ?? 1;
        actor.userData.head.scale.y = scale;
        actor.userData.head.material.emissiveIntensity = 0.6 * (entity.emissiveScale ?? scale);
        actor.userData.head.position.y = 1.4 + scale / 2;
        actor.rotation.y = entity.team === 'carbon' ? 0 : Math.PI;
      } else actor.scale.setScalar(entity.type === 'ground' ? 0.6 : 1);
    }
    for (const [id, actor] of actors) if (!present.has(id)) { actor.userData.head?.material.dispose(); actor.removeFromParent(); actors.delete(id); }
  }
  return { sync,
    shoot(sim, heroId, raycaster) {
      for (const hit of raycaster.intersectObjects([...actors.values()], true)) {
        let actor = hit.object;
        while (actor.parent && !actor.userData.id) actor = actor.parent;
        if (actor.userData.kind === 'orb') {
          const entity = sim.orbs.find(o => o.id === actor.userData.id);
          if (entity?.type === 'floating') return sim.shootOrb(heroId, entity.id);
        } else if (actor.userData.kind === 'trooper') return sim.damage(actor.userData.id, 24, heroId);
      }
      return { ok: false, reason: 'No shootable target under the pointer.' };
    },
    projections(camera) {
      return [...actors].map(([id, actor]) => {
        const v = actor.position.clone();
        if (actor.userData.kind === 'trooper') v.y += 0.9;
        v.project(camera);
        return { id, kind: actor.userData.kind, x: v.x, y: v.y, z: v.z };
      });
    },
    dispose() { if (disposed) return; disposed = true; for (const actor of actors.values()) { actor.userData.head?.material.dispose(); actor.removeFromParent(); } actors.clear(); [box, candle, orb].forEach(g => g.dispose()); Object.values(materials).forEach(m => m.dispose()); }
  };
}
