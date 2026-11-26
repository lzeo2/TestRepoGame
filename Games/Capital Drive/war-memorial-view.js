import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

const NEAR_RANGE = 520, FAR_RANGE = 3000;
const STONE = 0xdacbbe, PALE = 0xe6d7c0, SHADOW = 0x9e907e;
const COPPER = 0x80988b, DARK_COPPER = 0x667e70, GLASS = 0x59666a;

function openRing(points) {
  const ring = points.map(point => [point[0], point[1]]);
  if (ring.length > 1 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1]) ring.pop();
  return ring;
}

// Two merged, locally owned buffers. Source outlines are kept in world metres;
// positions are centred for precision. There are no textures or interior meshes.
export function buildWarMemorialGeometry(site, heightAt) {
  if (!site || typeof heightAt !== 'function') throw new Error('War Memorial source and terrain required');
  const body = {positions: [], colors: []}, detail = {positions: [], colors: []};
  const color = new THREE.Color();
  const ground = (x, z) => {
    const y = heightAt(x, z);
    if (!Number.isFinite(y)) throw new Error('Non-finite War Memorial terrain height');
    return y;
  };
  const outer = openRing(site.main.points), court = openRing(site.courtyard.points);
  const baseY = Math.max(...outer.map(point => ground(...point))) + 0.12;
  const roofY = baseY + Number(site.main.sourceTags.height);
  function tri(batch, a, b, c, tint) {
    color.setHex(tint);
    for (const p of [a, b, c]) {
      batch.positions.push(p[0] - site.x, p[1], p[2] - site.z);
      batch.colors.push(color.r, color.g, color.b);
    }
  }
  function quad(batch, a, b, c, d, tint) {
    tri(batch, a, b, c, tint); tri(batch, a, c, d, tint);
  }
  function surface(batch, points, y, tint, holes = []) {
    const ring = openRing(points), inner = holes.map(openRing);
    const faces = THREE.ShapeUtils.triangulateShape(ring.map(p => new THREE.Vector2(...p)),
      inner.map(hole => hole.map(p => new THREE.Vector2(...p))));
    const vertices = ring.concat(...inner);
    for (const face of faces) tri(batch, ...face.map(i => [vertices[i][0], y, vertices[i][1]]), tint);
  }
  function walls(points, top, tint) {
    const ring = openRing(points);
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      quad(body, [a[0], ground(...a) - 0.18, a[1]], [b[0], ground(...b) - 0.18, b[1]],
        [b[0], top, b[1]], [a[0], top, a[1]], tint);
    }
  }
  walls(outer, roofY, STONE);
  walls(court, roofY, SHADOW);
  surface(body, outer, roofY, PALE, [court]);
  const towerTop = baseY + Number(site.tower.sourceTags.height);
  walls(site.tower.points, towerTop, STONE);
  surface(body, site.tower.points, towerTop, PALE);

  // The source dome base is retained rather than replaced by a generic circle.
  const domeRing = openRing(site.dome.points);
  const centre = domeRing.reduce((a, p) => [a[0] + p[0] / domeRing.length, a[1] + p[1] / domeRing.length], [0, 0]);
  const domeHeight = Number(site.dome.sourceTags['roof:height']);
  const domeTop = baseY + Number(site.dome.sourceTags.height);
  const domeBase = domeTop - domeHeight;
  const domePoint = (p, level) => {
    const angle = level / 7 * Math.PI / 2;
    return [centre[0] + (p[0] - centre[0]) * Math.cos(angle), domeBase + domeHeight * Math.sin(angle),
      centre[1] + (p[1] - centre[1]) * Math.cos(angle)];
  };
  for (let i = 0; i < domeRing.length; i++) for (let level = 0; level < 7; level++) {
    const a = domeRing[i], b = domeRing[(i + 1) % domeRing.length];
    quad(body, domePoint(a, level), domePoint(b, level), domePoint(b, level + 1), domePoint(a, level + 1),
      i % 4 === 0 ? DARK_COPPER : COPPER);
  }

  // A patinated copper crown sits over the stepped, sandstone Hall of
  // Memory. Narrow raised sheet seams catch light without a separate material.
  for(let i=0;i<domeRing.length;i++){
    const a=domeRing[i],b=domeRing[(i+1)%domeRing.length];
    const p=[a[0]*.966+b[0]*.034,a[1]*.966+b[1]*.034];
    for(let level=0;level<6;level++){
      const raised=(point,l)=>{const q=domePoint(point,l);q[1]+=.035;return q;};
      quad(detail,raised(a,level),raised(p,level),raised(p,level+1),raised(a,level+1),0xa9b8a7);
    }
  }
  const towerRing=openRing(site.tower.points),courtCenter=court.reduce(([x,z],p)=>[x+p[0]/court.length,z+p[1]/court.length],[0,0]);
  const edgeList=[];
  for(let i=0;i<towerRing.length;i++){
    const a=towerRing[i],b=towerRing[(i+1)%towerRing.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(length<.01)continue;
    const tx=(b[0]-a[0])/length,tz=(b[1]-a[1])/length;
    const prev=edgeList.at(-1);
    if(prev&&prev.tx*tx+prev.tz*tz>.998){prev.b=b;prev.length+=length;}
    else edgeList.push({a,b,tx,tz,length});
    const n=(x,z)=>{const r=Math.hypot(x-centre[0],z-centre[1]);return [(x-centre[0])/r,(z-centre[1])/r];};
    const cornice=(p,y,d)=>{const [nx,nz]=n(...p);return [p[0]+nx*d,y,p[1]+nz*d];};
    for(const h of [.9,.32])quad(detail,cornice(a,towerTop-h,.18),cornice(b,towerTop-h,.18),
      cornice(b,towerTop-h+.13,.18),cornice(a,towerTop-h+.13,.18),PALE);
  }
  const dist=e=>((e.a[0]+e.b[0])/2-courtCenter[0])**2+((e.a[1]+e.b[1])/2-courtCenter[1])**2;
  const facade=edgeList.filter(e=>e.length>10).sort((a,b)=>dist(a)-dist(b))[0];
  let archedWindows=0;
  if(facade){
    const {a,b,tx,tz}=facade,mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2,sign=(mx-centre[0])*tz-(mz-centre[1])*tx<0?-1:1;
    const wallPoint=(u,y,d)=>[mx+tx*u+tz*sign*d,y,mz+tz*u-tx*sign*d];
    const radius=Math.min(2.55,facade.length*.19),spring=towerTop-4.65,foot=roofY+.5;
    quad(detail,wallPoint(-radius,foot,.07),wallPoint(radius,foot,.07),wallPoint(radius,spring,.07),wallPoint(-radius,spring,.07),0x525d5f);
    const arch=(angle,r,d)=>wallPoint(Math.cos(angle)*r,spring+Math.sin(angle)*r,d);
    for(let i=0;i<12;i++){
      const a=i*Math.PI/12,b=(i+1)*Math.PI/12;
      tri(detail,wallPoint(0,spring,.07),arch(a,radius,.07),arch(b,radius,.07),0x525d5f);
      quad(detail,arch(a,radius,.14),arch(b,radius,.14),arch(b,radius+.28,.14),arch(a,radius+.28,.14),i%3?PALE:STONE);
    }
    for(const u of [-radius*.52,0,radius*.52]){
      const h=spring+Math.sqrt(radius**2-u**2);
      quad(detail,wallPoint(u-.05,foot,.17),wallPoint(u+.05,foot,.17),wallPoint(u+.05,h,.17),wallPoint(u-.05,h,.17),0x948d7f);
    }
    archedWindows++;
  }

  // Original ashlar courses, recessed window panels and narrow pilasters follow
  // each actual exterior wing edge. They do not describe observed entrances.
  const signedArea = outer.reduce((a, p, i) => {
    const q = outer[(i + 1) % outer.length]; return a + p[0] * q[1] - q[0] * p[1];
  }, 0);
  let panels = 0;
  for (let i = 0; i < outer.length; i++) {
    const a = outer[i], b = outer[(i + 1) % outer.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < 2) continue;
    const tx = (b[0] - a[0]) / length, tz = (b[1] - a[1]) / length;
    const nx = (signedArea > 0 ? tz : -tz), nz = (signedArea > 0 ? -tx : tx);
    function panel(start, end, low, high, offset, tint) {
      const p = (t, y) => [a[0] + tx * t + nx * offset, y, a[1] + tz * t + nz * offset];
      quad(detail, p(start, low), p(end, low), p(end, high), p(start, high), tint);
    }
    for (const y of [roofY - 0.9, roofY - 0.35]) panel(0, length, y, y + 0.16, 0.065, PALE);
    for (let y = baseY + 1; y < roofY - 1; y += 1.4) panel(0, length, y, y + 0.025, 0.025, SHADOW);
    const count = Math.floor(length / 5.2);
    for (let j = 0; j < count && panels < 180; j++, panels++) {
      const mid = (j + 0.5) * length / count;
      panel(mid - 0.67, mid + 0.67, baseY + 3.3, baseY + 6.2, 0.045, SHADOW);
      panel(mid - 0.49, mid + 0.49, baseY + 3.5, baseY + 5.95, 0.055, GLASS);
      panel(mid - 1.18, mid - 0.94, baseY + 0.7, roofY - 1.1, 0.11, PALE);
      panel(mid + 0.94, mid + 1.18, baseY + 0.7, roofY - 1.1, 0.11, PALE);
      panel(mid - 0.8, mid + 0.8, baseY + 6.28, baseY + 6.48, 0.09, PALE);
    }
  }

  // Public ground only: subdivide at build time to drape the existing terrain.
  // A common tiny lift avoids overlaps with the original terrain, without a
  // raised invented platform or changes to physical public approach heights.
  let groundTriangles = 0;
  function groundTriangle(a, b, c, tint, depth = 0) {
    const edges = [[a, b, c], [b, c, a], [c, a, b]];
    let longest = edges[0], distance = -1;
    for (const edge of edges) {
      const d = Math.hypot(edge[0][0] - edge[1][0], edge[0][1] - edge[1][1]);
      if (d > distance) { distance = d; longest = edge; }
    }
    if (distance > 7 && depth < 12) {
      const [p, q, r] = longest, mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      groundTriangle(p, mid, r, tint, depth + 1); groundTriangle(mid, q, r, tint, depth + 1); return;
    }
    tri(body, ...[a, b, c].map(p => [p[0], ground(...p) + 0.055, p[1]]), tint); groundTriangles++;
  }
  function groundPolygon(feature, tint) {
    const ring = openRing(feature.points);
    for (const f of THREE.ShapeUtils.triangulateShape(ring.map(p => new THREE.Vector2(...p)), [])) {
      groundTriangle(...f.map(i => ring[i]), tint);
    }
  }
  for (const feature of site.lawns) groundPolygon(feature, 0x7c8d5c);
  let terraceBands = 0;
  for (const feature of site.paved) {
    const stairs = feature.sourceTags['area:highway'] === 'steps';
    groundPolygon(feature, stairs ? 0xbeb2a0 : 0xc3b9a8);
    const ring = openRing(feature.points);
    if (!stairs || ring.length !== 4) continue;
    // Estimated tread joints within the exact public stair-area polygon. Their
    // heights are draped, not invented physical risers or a new access route.
    const point = (t, u) => {
      const a = ring[0], b = ring[1], c = ring[2], d = ring[3];
      const x = (a[0] * (1 - t) + b[0] * t) * (1 - u) + (d[0] * (1 - t) + c[0] * t) * u;
      const z = (a[1] * (1 - t) + b[1] * t) * (1 - u) + (d[1] * (1 - t) + c[1] * t) * u;
      return [x, ground(x, z) + 0.08, z];
    };
    for (let i = 1; i < 20; i++) {
      const t = i / 20;
      for (let j = 0; j < 5; j++) quad(detail, point(t, j / 5), point(t + 0.007, j / 5),
        point(t + 0.007, (j + 1) / 5), point(t, (j + 1) / 5), SHADOW);
      terraceBands++;
    }
  }
  for (const path of site.paths) for (let i = 1; i < path.points.length; i++) {
    const a = path.points[i - 1], b = path.points[i], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < 0.01) continue;
    const nx = -(b[1] - a[1]) / length, nz = (b[0] - a[0]) / length;
    const p = [a[0] + nx, a[1] + nz], q = [b[0] + nx, b[1] + nz];
    const r = [b[0] - nx, b[1] - nz], s = [a[0] - nx, a[1] - nz];
    groundTriangle(p, q, r, 0xc3b9a8); groundTriangle(p, r, s, 0xc3b9a8);
  }
  function geometry(batch) {
    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.Float32BufferAttribute(batch.positions, 3));
    result.setAttribute('color', new THREE.Float32BufferAttribute(batch.colors, 3));
    result.computeVertexNormals(); result.computeBoundingSphere(); return result;
  }
  const result = {body: geometry(body), detail: geometry(detail), baseY, roofY, domeTop,
    panels, terraceBands, archedWindows, domeSeams:domeRing.length, groundTriangles, triangles: (body.positions.length + detail.positions.length) / 9};
  if (result.triangles > 16000) {
    result.body.dispose(); result.detail.dispose(); throw new Error('War Memorial exterior triangle budget exceeded');
  }
  return result;
}

export function createWarMemorialView(scene, map, heightAt) {
  const site = map.warMemorial;
  let disposed = false;
  const root = new THREE.Group(); root.name = 'Australian War Memorial exterior';
  const stats = {meshes: 0, triangles: 0, groundTriangles: 0, visibleMeshes: 0, nearRange: NEAR_RANGE, farRange: FAR_RANGE};
  let built = null, material = null, body = null, detail = null;
  if (site) {
    built = buildWarMemorialGeometry(site, heightAt);
    material = new THREE.MeshLambertMaterial({vertexColors: true, side: THREE.DoubleSide});
    body = new THREE.Mesh(built.body, material); detail = new THREE.Mesh(built.detail, material);
    root.position.set(site.x, 0, site.z); root.add(body, detail); scene.add(root);
    body.visible = false; detail.visible = false;
    stats.meshes = 2; stats.triangles = built.triangles; stats.groundTriangles = built.groundTriangles;
  }
  return {
    stats,
    update(focus) {
      if (disposed || !site) return;
      const distance = Number.isFinite(focus?.x) && Number.isFinite(focus?.z) ? Math.hypot(focus.x - site.x, focus.z - site.z) : Infinity;
      body.visible = distance <= FAR_RANGE; detail.visible = distance <= NEAR_RANGE;
      stats.visibleMeshes = Number(body.visible) + Number(detail.visible);
    },
    dispose() {
      if (disposed) return; disposed = true;
      built?.body.dispose(); built?.detail.dispose(); material?.dispose(); root.removeFromParent();
      stats.meshes = 0; stats.visibleMeshes = 0;
    }
  };
}
