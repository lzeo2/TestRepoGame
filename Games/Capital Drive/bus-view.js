import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { mergeGeometries } from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';
import { PERSON_MODEL, appearanceForPerson, createPersonGeometries, emitPersonParts } from './person-model.js';

// Original unbranded low-floor city buses. Metres, adult-scale cabin and driver.
export function createBusView(scene, heightAt) {
  const root = new THREE.Group(); root.name = 'Ambient city buses'; scene.add(root);
  const geometry = new Set(), materials = new Set();
  const bodyMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
  const glassMaterial = new THREE.MeshLambertMaterial({ color: 0x79939c, transparent: true, opacity: .34, depthWrite: false });
  materials.add(bodyMaterial); materials.add(glassMaterial);
  const buses = [], personShapes = createPersonGeometries(), partPose = new THREE.Object3D();
  function personParts(parts, appearance, kind, x, y, z, fit = 1) {
    emitPersonParts(appearance,{kind,stride:0},(name,px,py,pz,sx,sy,sz,color,rx = 0) => {
      const shape = personShapes[PERSON_MODEL.shapes[name]].clone();
      partPose.position.set(x+px*fit,y+py*fit,z+pz*fit); partPose.rotation.set(rx,0,0);
      partPose.scale.set(sx*fit,sy*fit,sz*fit); partPose.updateMatrix(); shape.applyMatrix4(partPose.matrix);
      const shade = new THREE.Color(color), colors = new Float32Array(shape.attributes.position.count*3);
      for (let i=0; i<colors.length; i+=3) shade.toArray(colors,i);
      shape.setAttribute('color',new THREE.BufferAttribute(colors,3)); parts.push(shape);
    });
  }
  function build(index) {
    const group = new THREE.Group(); group.name = `Original city bus ${index + 1}`; root.add(group);
    const solid = [], glazing = [];
    function piece(name, color, x, y, z, w, h, d, glass = false, cylinder = false) {
      const shape = cylinder ? new THREE.CylinderGeometry(.48, .48, .25, 10) : new THREE.BoxGeometry(w, h, d);
      if (cylinder) shape.rotateZ(Math.PI / 2);
      shape.translate(x, y, z);
      if (!glass) {
        const rgb = new THREE.Color(color), colors = new Float32Array(shape.attributes.position.count * 3);
        for (let i = 0; i < colors.length; i += 3) rgb.toArray(colors, i);
        shape.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      }
      (glass ? glazing : solid).push(shape);
    }
    const livery = index ? 0xbb7448 : 0x547389;
    piece('Lower body', 0xe2dfd0, 0, .95, 0, 2.45, .9, 10.6);
    piece('Livery', livery, 0, 1.32, 0, 2.47, .28, 10.62);
    piece('Roof', 0xe7e3d7, 0, 2.95, 0, 2.45, .22, 10.6);
    piece('Rear', 0xe2dfd0, 0, 2.1, 5.2, 2.45, 1.55, .2);
    piece('Cabin floor', 0x424548, 0, 1.39, 0, 2.28, .08, 10.2);
    piece('Front bumper', 0x30383c, 0, .67, -5.35, 2.5, .22, .18);
    piece('Rear bumper', 0x30383c, 0, .67, 5.35, 2.5, .22, .18);
    for (const side of [-1, 1]) {
      for (let z = -4.85; z < 5.2; z += 1.25) piece('Window pillars', 0x353c3f, side * 1.18, 2.2, z, .12, 1.4, .09);
      piece('Window band', 0x79939c, side * 1.205, 2.18, 0, .025, 1.28, 10.15, true);
      for (const z of [-3.35, 3.1]) {
        piece('Tyre', 0x242628, side * 1.18, .5, z, 1, 1, 1, false, true);
        piece('Hub', 0xa7aaa6, side * 1.32, .5, z, .03, .33, .33);
      }
      piece('Mirror arm', 0x30383c, side * 1.39, 2.37, -4.88, .5, .06, .08);
      piece('Mirror', 0x343e41, side * 1.61, 2.3, -4.91, .12, .34, .2);
      piece('Headlamp', 0xf1e6b8, side * .89, .99, -5.32, .38, .2, .025);
      piece('Tail lamp', 0xaf3830, side * .95, 1.05, 5.32, .18, .36, .025);
    }
    // Left-side entrance and centre exit, with visible split glazing and step.
    for (const z of [-4.1, .15]) {
      piece('Door frame', 0x30383c, -1.236, 1.79, z, .035, 2.05, 1.18);
      piece('Door glazing', 0x79939c, -1.258, 1.88, z, .025, 1.65, 1.02, true);
      piece('Door split', 0xa5a8a2, -1.279, 1.79, z, .025, 2, .035);
      piece('Step', 0x858681, -.95, .57, z, .65, .12, 1.05);
    }
    piece('Windscreen', 0x79939c, 0, 2.2, -5.22, 2.16, 1.3, .025, true);
    piece('Front centre pillar', 0x30383c, 0, 2.2, -5.24, .07, 1.35, .035);
    piece('Dashboard', 0x353c40, .5, 1.65, -4.83, 1.28, .28, .55);
    piece('Driver seat', 0x354a58, .68, 1.71, -4.03, .52, .68, .2);
    const driverAppearance = appearanceForPerson(`city-bus-driver-${index}`);
    personParts(solid,driverAppearance,'driver',.68,2.48,-4.3,.9);
    group.userData.driverAppearance = driverAppearance;
    piece('Wheel', 0x282c2e, .68, 1.99, -4.72, .38, .06, .32);
    for (let z = -2.6; z < 4.6; z += 1.35) for (const x of [-.77, .77]) {
      piece('Seat', 0x4e6771, x, 1.65, z, .54, .17, .55);
      piece('Seat back', 0x4e6771, x, 1.93, z + .26, .54, .64, .1);
    }
    for (const [parts, material, name] of [[solid, bodyMaterial, 'Body cabin and driver'], [glazing, glassMaterial, 'Transparent window bands']]) {
      const merged = mergeGeometries(parts, false); parts.forEach(part => part.dispose()); geometry.add(merged);
      const mesh = new THREE.Mesh(merged, material); mesh.name = name; group.add(mesh);
    }
    return group;
  }
  for (let i = 0; i < 2; i++) buses.push(build(i));
  let passenger = null;
  const passengerPose = new THREE.Object3D();
  function passengerBatch() {
    if (passenger) return passenger;
    const parts = [];
    const appearance = appearanceForPerson('player');
    personParts(parts,appearance,'passenger',-.77,2.58,-2.6);
    const merged = mergeGeometries(parts, false); parts.forEach(shape => shape.dispose()); geometry.add(merged);
    passenger = new THREE.InstancedMesh(merged, bodyMaterial, 1); passenger.name = 'Seated bus player passenger'; passenger.userData.appearance = appearance;
    passenger.count = 0; passenger.visible = false; passenger.frustumCulled = false;
    passenger.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(passenger);
    return passenger;
  }
  passengerBatch();
  for (const shape of Object.values(personShapes)) shape.dispose();
  let disposed = false;
  const stats = { buses: 0, passengers: 0, drawCalls: 0, maxDrawCalls: 5, triangles: 0, geometries: geometry.size, materials: materials.size, disposed: false };
  geometry.forEach(value => { stats.triangles += value.index ? value.index.count / 3 : value.attributes.position.count / 3; });
  function update(vehicles, focus) {
    if (disposed) return;
    stats.buses = 0; stats.passengers = 0;
    if (passenger) { passenger.count = 0; passenger.visible = false; }
    buses.forEach((group, i) => {
      const bus = vehicles[i];
      group.visible = !!bus?.active && Number.isFinite(bus.x) && Number.isFinite(bus.z) && Number.isFinite(bus.yaw) &&
        (!focus || Math.hypot(bus.x - focus.x, bus.z - focus.z) < 650);
      if (!group.visible) return;
      const y = heightAt(bus.x, bus.z);
      group.visible = Number.isFinite(y);
      if (!group.visible) return;
      group.position.set(bus.x, y + .03, bus.z); group.rotation.y = bus.yaw; stats.buses++;
      if (bus.playerAboard && !stats.passengers) {
        const mesh = passengerBatch();
        passengerPose.position.copy(group.position); passengerPose.rotation.set(0, bus.yaw, 0); passengerPose.updateMatrix();
        mesh.setMatrixAt(0, passengerPose.matrix); mesh.instanceMatrix.needsUpdate = true; mesh.count = 1; mesh.visible = true;
        stats.passengers = 1;
      }
    });
    stats.drawCalls = stats.buses * 2 + stats.passengers;
  }
  function dispose() {
    if (disposed) return;
    disposed = true; root.removeFromParent(); passenger?.dispose(); geometry.forEach(value => value.dispose()); materials.forEach(value => value.dispose());
    stats.buses = 0; stats.passengers = 0; stats.drawCalls = 0; stats.disposed = true;
  }
  update([], null);
  return { update, stats, dispose };
}
