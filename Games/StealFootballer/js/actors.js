import * as THREE from '../vendor/three.module.js';

const color = (value, fallback) => typeof value === 'string' ? (value.startsWith('#') ? value : `#${value}`) : fallback;
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

// Original web geometry: silhouette adaptations of the source appearance profiles.
// No Roblox catalog mesh, clothing image or face texture is redistributed here.
export class ActorFactory {
  constructor() {
    this.geometries = {
      box: new THREE.BoxGeometry(1, 1, 1),
      sphere: new THREE.SphereGeometry(.5, 10, 8),
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
    const a = def.appearance || {};
    const root = new THREE.Group();
    root.scale.set(scale * finite(a.buildScale, 1), scale * finite(a.heightScale, 1), scale);
    const body = new THREE.Group(); root.add(body);
    const skin = color(a.skinColor || def.skin, '#C99A73');
    const hair = color(a.hairColor || def.hair, '#33271F');
    const primary = color(kit.primary || def.color || def.shirt || def.primary || def.kitColor, '#3978C7');
    const secondary = color(kit.secondary || def.secondary || def.trim, '#F5F5E9');
    const shorts = color(kit.shorts || def.shorts, '#202C40');
    this.part(body, 'box', [2, 1.85, 1], [0, 3.18, 0], primary);
    this.part(body, 'box', [2.04, .22, 1.04], [0, 4, 0], secondary);
    this.part(body, 'box', [.18, 1.65, .025], [-.58, 3.2, -.515], secondary);
    this.part(body, 'box', [.18, 1.65, .025], [.58, 3.2, -.515], secondary);
    this.part(body, 'sphere', [.24, .3, .025], [-.72, 3.76, -.535], secondary);
    this.part(body, 'box', [2.02, .66, 1.02], [0, 2.04, 0], shorts);
    const head = new THREE.Group(); head.position.set(0, 4.56, 0); body.add(head);
    this.part(head, 'box', [1.78, 1.25, 1.1], [0, 0, 0], skin);
    for (const side of [-1, 1]) {
      this.part(head, 'sphere', [.2, .38, .28], [side * .92, -.04, 0], skin);
      this.part(head, 'box', [.16, .12, .035], [side * .39, .1, -.57], '#191C22');
      this.part(head, 'box', [.32, .055, .035], [side * .38, .29, -.57], hair);
    }
    this.part(head, 'box', [.19, .19, .12], [0, -.08, -.59], skin);
    this.part(head, 'box', [.44, .065, .035], [0, -.33, -.57], '#653D32');
    this.hair(head, a.hairStyle || 'cropped', hair, simple);
    const facial = a.facialHair || 'none';
    const beardColor = color(a.facialHairColor, hair);
    if (facial === 'beard' || facial === 'stubble') {
      this.part(head, 'box', [1.47, facial === 'beard' ? .44 : .24, .035], [0, -.46, -.576], beardColor);
      for (const side of [-1, 1]) this.part(head, 'box', [.1, .47, .99], [side * .85, -.36, .02], beardColor);
    }
    if (facial === 'goatee') this.part(head, 'box', [.45, .27, .035], [0, -.51, -.578], beardColor);
    if (facial !== 'none') this.part(head, 'box', [.47, .075, .035], [0, -.23, -.58], beardColor);
    if (a.headbandColor) this.part(head, 'box', [1.86, .13, 1.14], [0, .28, 0], color(a.headbandColor, '#FFFFFF'));
    const limbs = {};const feet=[];const owned=[];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(side * 1.48, 3.91, 0); body.add(arm);
      this.part(arm, 'box', [.83, .73, .91], [0, -.32, 0], primary);
      this.part(arm, 'box', [.79, 1.05, .83], [0, -1.18, 0], skin);
      if (a.goalkeeper) this.part(arm, 'box', [.84, .42, .88], [0, -1.57, 0], color(a.gloveColor, '#F3F3EC'));
      const leg = new THREE.Group(); leg.position.set(side * .53, 1.94, 0); body.add(leg);
      this.part(leg, 'box', [.87, .84, .89], [0, -.28, 0], skin);
      this.part(leg, 'box', [.9, .9, .91], [0, -1.04, 0], secondary);
      this.part(leg, 'box', [.93, .13, .94], [0, -.61, 0], primary);
      feet.push(this.part(leg, 'box', [.98, .38, 1.36], [0, -1.74, -.19], color(a.bootColor, '#17202B')));
      this.part(leg, 'box', [.65, .055, .73], [0, -1.53, -.38], color(a.bootAccent, '#F0F2F4'));
      limbs[side < 0 ? 'leftArm' : 'rightArm'] = arm;
      limbs[side < 0 ? 'leftLeg' : 'rightLeg'] = leg;
    }
    if (!simple && typeof document !== 'undefined') {
      const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = primary; ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = secondary; ctx.textAlign = 'center'; ctx.font = 'bold 16px sans-serif';
        ctx.fillText(String(a.kitName || def.name || '').slice(0, 15), 64, 23);
        ctx.font = 'bold 72px sans-serif'; ctx.fillText(String(number ?? a.number ?? def.number ?? 0), 64, 100);
        const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; this.textures.push(texture);
        const material = new THREE.MeshLambertMaterial({map: texture});owned.push({material,texture});
        const badge = new THREE.Mesh(this.geometries.box, material); badge.scale.set(1.45, 1.5, .01); badge.position.set(0, 3.18, .513); body.add(badge);
      }
    }
    const merged=[];for(const group of [body,head,...Object.values(limbs)])this.mergeParts(group,merged);
    // Foot transforms remain available for support checks after their meshes merge.
    return {root, body, head, ...limbs, feet, owned, merged, profile: a, definition: def};
  }

  mergeParts(group,merged) {
    const meshes=group.children.filter(o=>o.isMesh&&!o.material.map);if(meshes.length<2)return;
    const positions=[],normals=[],colors=[];
    for(const mesh of meshes){mesh.updateMatrix();const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(mesh.matrix);const p=g.attributes.position,n=g.attributes.normal,c=mesh.material.color;for(let i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));colors.push(c.r,c.g,c.b);}g.dispose();group.remove(mesh);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,this.mergedMaterial);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);merged.push(geometry);
  }

  hair(head, style, tint, simple) {
    if (style === 'bald') return;
    if (style === 'r9fringe') {
      this.part(head, 'sphere', [1.15, .23, .65], [0, .6, -.39], tint); return;
    }
    if (style === 'braids' || style === 'locs') {
      this.part(head, 'box', [1.8, .15, 1.09], [0, .64, .02], tint);
      const count = simple ? 4 : 8;
      for (let i = 0; i < count; i++) {
        const x = - .75 + i * 1.5 / (count - 1);
        const strand = this.part(head, 'cylinder', [style === 'locs' ? .22 : .11, style === 'locs' ? 1.35 : 1.13, .15], [x, style === 'locs' ? .07 : .7, style === 'locs' ? .58 : .05], tint);
        if (style === 'braids') strand.rotation.x = Math.PI / 2;
      }
      return;
    }
    if (style === 'curls' || style === 'afro') {
      const count = simple ? 5 : 11;
      for (let i = 0; i < count; i++) {
        const angle = i * 2.39996;
        const radius = i ? .7 : 0;
        this.part(head, 'sphere', [style === 'afro' ? .8 : .62, .65, .7], [Math.cos(angle) * radius, .72 + (i % 3) * .07, Math.sin(angle) * radius * .63], tint);
      }
      return;
    }
    this.part(head, 'box', [1.83, style === 'fade' ? .19 : .27, 1.14], [0, .64, .03], tint);
    if (style === 'cropped') this.part(head, 'box', [1.71, .13, .32], [0, .53, -.5], tint);
    if (style === 'quiff') {
      const front = this.part(head, 'sphere', [1.8, .55, .72], [0, .82, -.27], tint); front.rotation.z = -.13;
    }
    if (style === 'longslick' || style === 'pony') {
      this.part(head, 'box', [1.84, 1.07, .3], [0, .19, .53], tint);
      if (style === 'pony') this.part(head, 'sphere', [.57, 1.45, .52], [0, -.05, .87], tint);
    }
  }

  pose(actor, pose = 'idle', time = 0, speed = 1) {
    const kind = typeof pose === 'string' ? pose.toLowerCase() : String(pose?.type || pose?.kind || pose?.name || 'idle').toLowerCase();
    const phase = time * 9 * Math.max(.4, speed);
    const run = /run|dribble|sprint/.test(kind);
    const stride = run ? Math.sin(phase) * .7 : Math.sin(time * 1.8) * .025;
    actor.leftLeg.rotation.set(stride, 0, 0); actor.rightLeg.rotation.set(-stride, 0, 0);
    actor.leftArm.rotation.set(-stride * .7, 0, -.08); actor.rightArm.rotation.set(stride * .7, 0, .08);
    actor.body.rotation.set(0, 0, 0); actor.body.position.set(0, run ? Math.abs(Math.cos(phase)) * .12 : 0, 0);
    if (/kick|shoot|pass/.test(kind)) { actor.rightLeg.rotation.x = -1.13; actor.leftArm.rotation.x = -.5; actor.rightArm.rotation.x = .6; }
    if (/feint|stepover/.test(kind)) { actor.body.rotation.z = Math.sin(phase) * .22; actor.rightLeg.rotation.z = .4; }
    if (/tackle|slide/.test(kind)) { actor.body.rotation.x = -.8; actor.body.position.y = -.65; actor.rightLeg.rotation.x = -1.2; }
    if (/dive|save/.test(kind)) { actor.body.rotation.z = /left/.test(kind) ? 1.1 : -1.1; actor.body.position.y = .3; actor.leftArm.rotation.z = -1.7; actor.rightArm.rotation.z = 1.7; }
    if (/celebrat|victory/.test(kind)) { actor.leftArm.rotation.z = -2.4; actor.rightArm.rotation.z = 2.4; actor.body.position.y = Math.max(0, Math.sin(time * 5)) * .55; }
    // Place the lowest boot on the support plane after limb rotation.
    actor.body.updateMatrix();let bottom=Infinity;
    for(let i=0;i<actor.feet.length;i++){const foot=actor.feet[i],leg=i===0?actor.leftLeg:actor.rightLeg;foot.updateMatrix();leg.updateMatrix();const m=actor.body.matrix.clone().multiply(leg.matrix).multiply(foot.matrix);const box=new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5),new THREE.Vector3(.5,.5,.5)).applyMatrix4(m);bottom=Math.min(bottom,box.min.y);}
    if(bottom<0)actor.body.position.y-=bottom;
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
