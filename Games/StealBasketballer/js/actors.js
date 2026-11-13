import * as THREE from '../vendor/three.module.js';

const color = (value, fallback) => typeof value === 'string' ? (value.startsWith('#') ? value : `#${value}`) : fallback;
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

// Original generic stylised athletes. Catalog names never select real likenesses.
// No portraits, logos, face textures or official uniforms are used.
export class ActorFactory {
  constructor() {
    this.geometries = {
      box: new THREE.BoxGeometry(1, 1, 1),
      sphere: new THREE.SphereGeometry(.5, 8, 6),
      taper: new THREE.CylinderGeometry(.5, .39, 1, 8),
      cylinder: new THREE.CylinderGeometry(.5, .5, 1, 10),
    };
    this.materials = new Map();
    this.textures = [];
    this.mergedMaterial=new THREE.MeshLambertMaterial({vertexColors:true});
  }

  material(tint) {
    if (!this.materials.has(tint)) this.materials.set(tint, new THREE.MeshLambertMaterial({color: tint}));
    return this.materials.get(tint);
  }

  part(parent, shape, size, position, tint) {
    const mesh = new THREE.Mesh(this.geometries[shape], this.material(tint));
    mesh.scale.set(...size); mesh.position.set(...position);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
    return mesh;
  }

  create(def = {}, kit = {}, {scale = 1, number, simple = false} = {}) {
    const seed=[...String(def.id||'player')].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
    const a={skinColor:['#795036','#BB8961','#E9C19E','#9F6C4C'][seed%4],hairColor:'#33271F',hairStyle:['cropped','bald','fade','quiff'][seed%4],heightScale:1.08,buildScale:.94+(seed%5)*.025,number:1+seed%99};
    const root = new THREE.Group();
    root.scale.set(scale * finite(a.buildScale, 1), scale * finite(a.heightScale, 1), scale);
    const body = new THREE.Group(); root.add(body);
    const skin = color(a.skinColor || def.skin, '#C99A73');
    const hair = color(a.hairColor || def.hair, '#33271F');
    const primary = color(kit.primary || def.color || def.shirt || def.primary || def.kitColor, '#3978C7');
    const secondary = color(kit.secondary || def.secondary || def.trim, '#F5F5E9');
    const shorts = color(kit.shorts || def.shorts, '#202C40');
    // Narrow waist, broad shoulders and long legs keep the silhouette athletic.
    this.part(body, 'taper', [1.95, 1.65, 1.04], [0, 3.37, 0], primary);
    this.part(body, 'box', [1.65, .13, .93], [0, 2.57, 0], secondary);
    for (const side of [-1, 1]) {
      this.part(body, 'box', [.12, 1.32, .87], [side * .72, 3.26, 0], secondary);
      const trim = this.part(body, 'box', [.48, .11, .88], [side * .53, 4.13, 0], secondary);
      trim.rotation.z = side * -.16;
      this.part(body, 'box', [.78, .67, .86], [side * .43, 2.26, 0], shorts);
      this.part(body, 'box', [.79, .09, .88], [side * .43, 1.98, 0], secondary);
    }
    this.part(body, 'cylinder', [.42, .36, .42], [0, 4.26, 0], skin);
    const head = new THREE.Group(); head.position.set(0, 4.87, 0); body.add(head);
    this.part(head, 'sphere', [1.18, 1.36, 1.08], [0, 0, 0], skin);
    for (const side of [-1, 1]) {
      this.part(head, 'sphere', [.2, .3, .24], [side * .57, -.05, 0], skin);
      this.part(head, 'box', [.12, .085, .035], [side * .24, .07, -.49], '#191C22');
      this.part(head, 'box', [.22, .045, .035], [side * .24, .23, -.475], hair);
    }
    this.part(head, 'box', [.15, .19, .16], [0, -.08, -.51], skin);
    this.part(head, 'box', [.29, .045, .035], [0, -.3, -.475], '#653D32');
    this.hair(head, a.hairStyle, hair);
    const limbs = {}, feet = [], owned = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(side * 1.02, 3.94, 0); body.add(arm);
      this.part(arm, 'taper', [.48, .86, .5], [0, -.4, 0], skin);
      const elbow = new THREE.Group(); elbow.position.y = -.82; arm.add(elbow);
      this.part(elbow, 'taper', [.39, .77, .41], [0, -.36, 0], skin);
      this.part(elbow, 'sphere', [.42, .43, .42], [0, -.8, -.015], skin);
      if(side===1)this.part(elbow, 'cylinder', [.41, .14, .43], [0, -.58, 0], secondary);
      const leg = new THREE.Group(); leg.position.set(side * .44, 2.02, 0); body.add(leg);
      this.part(leg, 'taper', [.64, .88, .68], [0, -.38, 0], skin);
      const knee = new THREE.Group(); knee.position.y = -.82; leg.add(knee);
      this.part(knee, 'taper', [.46, .77, .49], [0, -.36, 0], skin);
      this.part(knee, 'cylinder', [.48, .35, .51], [0, -.64, 0], secondary);
      this.part(knee, 'box', [.49, .07, .52], [0, -.5, 0], primary);
      feet.push(this.part(knee, 'box', [.64, .32, 1.07], [0, -1.05, -.17], '#17202B'));
      this.part(knee, 'box', [.64, .08, 1.07], [0, -1.17, -.17], secondary);
      this.part(knee, 'box', [.42, .045, .4], [0, -.89, -.4], secondary);
      arm.userData.hinge = elbow; leg.userData.hinge = knee;
      limbs[side < 0 ? 'leftArm' : 'rightArm'] = arm;
      limbs[side < 0 ? 'leftLeg' : 'rightLeg'] = leg;
    }
    if (!simple && typeof document !== 'undefined') {
      const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = primary; ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle=secondary;
        if(kit.pattern==='stripes')for(let x=8;x<128;x+=32)ctx.fillRect(x,0,14,128);
        if(kit.pattern==='hoops')for(let y=12;y<128;y+=32)ctx.fillRect(0,y,128,12);
        ctx.fillStyle = kit.pattern&&kit.pattern!=='solid'?'#FFFFFF':secondary;ctx.strokeStyle='#17232B';ctx.lineWidth=3; ctx.textAlign = 'center'; ctx.font = 'bold 16px sans-serif';
        const kitName=String(kit.enabled&&kit.name?kit.name:'HOOPS').slice(0,15);
        ctx.strokeText(kitName,64,23);ctx.fillText(kitName, 64, 23);
        ctx.font = 'bold 72px sans-serif'; ctx.strokeText(String(number ?? a.number), 64, 100); ctx.fillText(String(number ?? a.number), 64, 100);
        const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; this.textures.push(texture);
        const material = new THREE.MeshLambertMaterial({map: texture});owned.push({material,texture});
        const badge = new THREE.Mesh(this.geometries.box, material); badge.scale.set(1.12, 1.24, .01); badge.position.set(0, 3.37, -.54); body.add(badge);
      }
    }
    const merged=[];for(const group of [body,head,...Object.values(limbs)])this.mergeParts(group,merged);
    // Foot transforms remain available for support checks after their meshes merge.
    return {root, body, head, ...limbs, feet, owned, merged, profile: a, definition: def};
  }

  mergeParts(group, merged) {
    const hinge = group.userData.hinge;
    const meshes = group.children.filter(o => o.isMesh && !o.material.map);
    if (hinge) meshes.push(...hinge.children.filter(o => o.isMesh));
    const positions = [], normals = [], colors = [], lower = [];
    for (const mesh of meshes) {
      mesh.updateMatrix();
      const isLower = mesh.parent === hinge;
      const matrix = mesh.matrix.clone();
      if (isLower) { hinge.updateMatrix(); matrix.premultiply(hinge.matrix); }
      const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      g.applyMatrix4(matrix);
      const p = g.attributes.position, n = g.attributes.normal, c = mesh.material.color;
      for (let i = 0; i < p.count; i++) {
        positions.push(p.getX(i), p.getY(i), p.getZ(i));
        normals.push(n.getX(i), n.getY(i), n.getZ(i));
        colors.push(c.r, c.g, c.b); lower.push(isLower);
      }
      g.dispose(); mesh.parent.remove(mesh);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    // Arrays are allocated once; lower segments bend without adding draw calls.
    if (hinge) group.userData.bend = {geometry, positions, normals, lower, y: hinge.position.y};
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, this.mergedMaterial);
    mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); merged.push(geometry);
  }

  bend(group, angle) {
    const b = group.userData.bend;
    const p = b.geometry.attributes.position, n = b.geometry.attributes.normal;
    const c = Math.cos(angle), s = Math.sin(angle);
    for (let i = 0; i < b.lower.length; i++) if (b.lower[i]) {
      const j = i * 3, y = b.positions[j + 1] - b.y, z = b.positions[j + 2];
      p.setXYZ(i, b.positions[j], b.y + y * c - z * s, y * s + z * c);
      n.setXYZ(i, b.normals[j], b.normals[j + 1] * c - b.normals[j + 2] * s, b.normals[j + 1] * s + b.normals[j + 2] * c);
    }
    p.needsUpdate = true; n.needsUpdate = true;
    group.userData.hinge.rotation.x = angle;
    b.geometry.computeBoundingSphere();
    b.geometry.computeBoundingBox();
  }

  hair(head, style, tint) {
    if (style === 'bald') return;
    this.part(head, 'sphere', [1.2, .51, 1.08], [0, .48, .025], tint);
    if (style === 'cropped') this.part(head, 'box', [.9, .13, .33], [0, .46, -.39], tint);
    if (style === 'quiff') {
      const front = this.part(head, 'sphere', [.92, .46, .58], [0, .69, -.21], tint);
      front.rotation.z = -.15;
    }
  }

  pose(actor, pose = 'idle', time = 0, speed = 1) {
    const kind = typeof pose === 'string' ? pose.toLowerCase() : String(pose?.type || pose?.kind || pose?.name || 'idle').toLowerCase();
    time = finite(time); speed = finite(speed, 1);
    const phase = time * 9 * Math.max(.4, speed);
    const run = /run|dribble|sprint/.test(kind);
    const stride = run ? Math.sin(phase) * .7 : Math.sin(time * 1.8) * .025;
    actor.leftLeg.rotation.set(stride, 0, 0); actor.rightLeg.rotation.set(-stride, 0, 0);
    actor.leftArm.rotation.set(-stride * .7, 0, -.08); actor.rightArm.rotation.set(stride * .7, 0, .08);
    actor.body.rotation.set(0, 0, 0); actor.body.position.set(0, run ? Math.abs(Math.cos(phase)) * .12 : 0, 0);
    let leftElbow = -.22, rightElbow = -.22, leftKnee = .06, rightKnee = .06;
    if(run) {leftElbow=-.85;rightElbow=-.85;leftKnee=Math.max(0,-stride)*1.1;rightKnee=Math.max(0,stride)*1.1;}
    if (/dribble/.test(kind)) {actor.rightArm.rotation.x = .35+Math.sin(phase)*.25;rightElbow=.5+Math.sin(phase)*.35;}
    if (/shoot|free.?throw/.test(kind)) {actor.leftArm.rotation.x=-2.5;actor.rightArm.rotation.x=-2.65;leftElbow=-.75;rightElbow=-1.05;}
    if (/pass/.test(kind)) {actor.leftArm.rotation.x=1.15;actor.rightArm.rotation.x=1.15;leftElbow=.45;rightElbow=.45;}
    if (/block|rebound/.test(kind)) {actor.leftArm.rotation.z=-2.8;actor.rightArm.rotation.z=2.8;leftElbow=-.18;rightElbow=-.18;}
    if (/steal|defen/.test(kind)) {actor.body.rotation.x=-.15;actor.leftArm.rotation.z=-1;actor.rightArm.rotation.z=1;leftKnee=.42;rightKnee=.42;actor.leftLeg.rotation.x=-.25;actor.rightLeg.rotation.x=-.25;}
    if (/celebrat|victory/.test(kind)) { actor.leftArm.rotation.z = -2.4; actor.rightArm.rotation.z = 2.4; actor.body.position.y = Math.max(0, Math.sin(time * 5)) * .55; }
    this.bend(actor.leftArm,leftElbow); this.bend(actor.rightArm,rightElbow);
    this.bend(actor.leftLeg,leftKnee); this.bend(actor.rightLeg,rightKnee);
    // Place the lowest boot on the support plane after limb rotation.
    actor.body.updateMatrix();let bottom=Infinity;
    for(let i=0;i<actor.feet.length;i++){const foot=actor.feet[i],leg=i===0?actor.leftLeg:actor.rightLeg;foot.updateMatrix();leg.updateMatrix();const knee=leg.userData.hinge;knee.updateMatrix();const m=actor.body.matrix.clone().multiply(leg.matrix).multiply(knee.matrix).multiply(foot.matrix);const box=new THREE.Box3(new THREE.Vector3(-.5,-.6,-.5),new THREE.Vector3(.5,.5,.5)).applyMatrix4(m);bottom=Math.min(bottom,box.min.y);}
    // Include the conservative transformed limb bounds used by Three's culling/tests.
    for(const leg of [actor.leftLeg,actor.rightLeg]) {
      const geometry=leg.userData.bend.geometry;
      const box=geometry.boundingBox.clone().applyMatrix4(actor.body.matrix.clone().multiply(leg.matrix));
      bottom=Math.min(bottom,box.min.y);
    }
    if(Number.isFinite(bottom))actor.body.position.y-=bottom;
  }

  release(actor) {
    for(const {texture,material}of actor.owned || []){texture.dispose();material.dispose();const i=this.textures.indexOf(texture);if(i>=0)this.textures.splice(i,1);}
    for(const geometry of actor.merged || [])geometry.dispose();actor.owned=[];actor.merged=[];
  }

  dispose() {
    Object.values(this.geometries).forEach(g => g.dispose());
    this.materials.forEach(m => m.dispose()); this.textures.forEach(t => t.dispose());
    this.materials.clear(); this.textures.length = 0;
    this.mergedMaterial.dispose();
  }
}
