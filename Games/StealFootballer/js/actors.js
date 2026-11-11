import * as THREE from '../vendor/three.module.js';

const color = (value, fallback) => typeof value === 'string' ? (value.startsWith('#') ? value : `#${value}`) : fallback;
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

// Original web geometry: silhouette adaptations of the source appearance profiles.
// No Roblox catalog mesh, clothing image or face texture is redistributed here.
export class ActorFactory {
  constructor() {
    this.geometries = {
      box: new THREE.BoxGeometry(1, 1, 1),
      sphere: new THREE.SphereGeometry(.5, 8, 6),
      beard: new THREE.SphereGeometry(.5, 10, 4, Math.PI, Math.PI, Math.PI / 2, Math.PI / 2),
      shirt: new THREE.CylinderGeometry(.5, .37, 1, 8),
      shorts: new THREE.CylinderGeometry(.46, .5, 1, 8),
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
    // Adult athletic silhouette: long legs, a tapered torso and a smaller head.
    this.part(body, 'shirt', [1.65, 1.65, .76], [0, 4.04, 0], primary);
    this.part(body, 'sphere', [.64, .18, .57], [0, 4.82, 0], secondary);
    this.part(body, 'cylinder', [.34, .38, .34], [0, 4.99, 0], skin);
    for (const x of [-.4, .4]) this.part(body, 'box', [.09, 1.28, .025], [x, 4.02, -.354], secondary);
    if (kit.pattern === 'stripes') for (const x of [-.5, -.17, .17, .5]) this.part(body, 'box', [.12, 1.28, .025], [x, 4.02, -.367], secondary);
    if (kit.pattern === 'hoops') for (const y of [3.55, 4.02, 4.49]) this.part(body, 'shirt', [1.67, .13, .78], [0, y, 0], secondary);
    this.part(body, 'sphere', [.15, .2, .025], [-.47, 4.48, -.363], secondary);
    this.part(body, 'shorts', [1.2, .57, .68], [0, 3.05, 0], shorts);
    const head = new THREE.Group(); head.position.set(0, 5.56, 0);
    // Profile coordinates remain shared with the original source silhouette details.
    head.scale.set(.46, .76, .68); body.add(head);
    this.part(head, 'sphere', [1.78, 1.25, 1.1], [0, .02, 0], skin);
    this.part(head, 'sphere', [1.35, .65, 1.02], [0, -.29, -.025], skin);
    for (const side of [-1, 1]) {
      this.part(head, 'sphere', [.2, .38, .28], [side * .92, -.04, 0], skin);
      this.part(head, 'box', [.16, .12, .035], [side * .39, .1, -.57], '#191C22');
      this.part(head, 'box', [.32, .055, .035], [side * .38, .29, -.57], hair);
    }
    this.part(head, 'box', [.19, .19, .12], [0, -.08, -.59], skin);
    this.part(head, 'box', [.44, .065, .035], [0, -.33, -.57], '#653D32');
    this.hair(head, a.hairStyle || 'cropped', hair, simple, a.hairAccentColor ? color(a.hairAccentColor, hair) : null);
    const facial = a.facialHair || 'none';
    const beardColor = color(a.facialHairColor, hair);
    if (facial === 'beard' || facial === 'stubble') {
      this.part(head, 'beard', [1.64, facial === 'beard' ? 1.01 : .82, 1.18], [0, -.14, -.02], beardColor);
      for (const side of [-1, 1]) this.part(head, 'sphere', [.12, .46, .6], [side * .79, -.18, -.08], beardColor);
    }
    if (facial === 'goatee') this.part(head, 'box', [.45, .27, .035], [0, -.51, -.578], beardColor);
    if (facial !== 'none') this.part(head, 'box', [.47, .075, .035], [0, -.23, -.58], beardColor);
    if (a.headbandColor) this.part(head, 'box', [1.86, .13, 1.14], [0, .28, 0], color(a.headbandColor, '#FFFFFF'));
    const limbs = {};const feet=[];const owned=[];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(side * .91, 4.65, 0); body.add(arm);
      this.part(arm, 'sphere', [.49, .65, .52], [0, -.22, 0], primary);
      this.part(arm, 'sphere', [.33, 1.33, .36], [0, -1.02, 0], skin);
      this.part(arm, 'sphere', [.3, .38, .33], [0, -1.66, -.025], a.goalkeeper ? color(a.gloveColor, '#F3F3EC') : skin);
      const leg = new THREE.Group(); leg.position.set(side * .32, 3.02, 0); body.add(leg);
      this.part(leg, 'sphere', [.5, 1.55, .52], [0, -.65, 0], skin);
      this.part(leg, 'sphere', [.38, 1.5, .41], [0, -2.04, 0], secondary);
      this.part(leg, 'cylinder', [.39, .12, .42], [0, -1.42, 0], primary);
      feet.push(this.part(leg, 'box', [.43, .32, .82], [0, -2.85, -.16], color(a.bootColor, '#17202B')));
      this.part(leg, 'box', [.34, .035, .49], [0, -2.67, -.25], color(a.bootAccent, '#F0F2F4'));
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
        const kitName=String(kit.enabled&&kit.name?kit.name:a.kitName || def.name || '').slice(0,15);
        ctx.strokeText(kitName,64,23);ctx.fillText(kitName, 64, 23);
        ctx.font = 'bold 72px sans-serif'; ctx.fillText(String(number ?? a.number ?? def.number ?? 0), 64, 100);
        const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; this.textures.push(texture);
        const material = new THREE.MeshLambertMaterial({map: texture});owned.push({material,texture});
        const badge = new THREE.Mesh(this.geometries.box, material); badge.scale.set(.94, 1.28, .01); badge.position.set(0, 4.04, .36); body.add(badge);
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

  scalp(style) {
    const key='hair-'+style;
    if (this.geometries[key]) return key;
    const positions=[],indices=[],around=20,rows=7;
    for (let row=0;row<=rows;row++) for (let col=0;col<=around;col++) {
      const phi=col/around*Math.PI*2,front=(1-Math.cos(phi))/2;
      // The front edge clears the brows; the sides/back follow the cranium.
      const theta=row/rows*(style==='fade'?1.58-front*.58:1.72-front*.72);
      const crown=Math.sin(theta),ridge=Math.sin(phi*10+theta*8);
      const textured=['curls','afro','quiff','longslick','braids','locs'].includes(style);
      const volume=style==='afro'?.07:style==='curls'?.03:style==='quiff'?.035:0;
      const ripple=textured?(style==='afro'?.045:style==='curls'?.03:.012)*ridge*Math.sin(theta):0;
      const radius=1+(style==='cropped'?.015:style==='longslick'?.06:0)+volume+ripple;
      // Volume fades into the fitted edge, keeping one attached surface.
      const upper=1-(row/rows)**2;
      const lobe=Math.sin(theta)*Math.cos(phi*6+theta*13);
      const lift=style==='quiff'?upper*(.23+front*Math.sin(theta)*.2):
        style==='curls'?upper*(.21+lobe*.055):style==='afro'?upper*(.31+lobe*.065):0;
      const sweep=style==='quiff'?upper*(.09+Math.sin(phi)*Math.sin(theta)*.05):0;
      const width=style==='afro'?Math.sin(phi)*Math.sin(theta)*upper*.15:0;
      positions.push(Math.sin(phi)*crown*.91*radius+sweep+width,
        .02+Math.cos(theta)*.66*radius+lift,
        Math.cos(phi)*crown*.57*radius+(style==='longslick'?.035*Math.sin(theta):0));
    }
    for(let row=0;row<rows;row++)for(let col=0;col<around;col++) {
      const a=row*(around+1)+col,b=a+around+1;
      indices.push(a,b,a+1,a+1,b,b+1);
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
    this.geometries[key]=geometry;return key;
  }

  hair(head, style, tint, simple, accent=null) {
    if(style==='bald')return;
    if(style==='r9fringe') {
      const patch=this.part(head,'sphere',[.95,.13,.34],[0,.57,-.26],tint);
      patch.rotation.x=-.38;return;
    }
    this.part(head,this.scalp(style),[1,1,1],[0,0,0],tint);
    if(style==='longslick'||style==='pony') {
      // Rounded swept nape, with its upper end buried in the fitted scalp.
      this.part(head,'sphere',[1.47,1.05,.36],[0,.02,.48],tint);
      if(style==='pony') {
        const key='hair-tail';
        if(!this.geometries[key])this.geometries[key]=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
          new THREE.Vector3(0,.25,.51),new THREE.Vector3(0,.16,.78),new THREE.Vector3(.04,-.22,.87),new THREE.Vector3(.1,-.65,.78)
        ]),8,.16,6,false);
        this.part(head,key,[1,1,1],[0,0,0],tint);
      }
    }
    if(style==='braids'||style==='locs') {
      const count=simple?4:7;
      for(let i=0;i<count;i++) {
        const lane=(i-(count-1)/2)/((count-1)/2),x=lane*.63;
        const key='hair-'+style+'-'+count+'-'+i;
        if(!this.geometries[key]) {
          const points=style==='braids'?[
            new THREE.Vector3(x,.39,-.37),new THREE.Vector3(x,.61,.02),new THREE.Vector3(x,.35,.5),new THREE.Vector3(x,.02,.57)
          ]:[new THREE.Vector3(x,.5,.25),new THREE.Vector3(x*1.08,.25,.58),new THREE.Vector3(x*1.12,-.12,.62),new THREE.Vector3(x*1.1,-.63,.57)];
          // Side lanes sit lower on the rounded crown so each root is attached.
          points.forEach(point=>{point.y-=Math.abs(lane)*.13;});
          this.geometries[key]=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),8,style==='locs'?.075:.035,5,false);
        }
        this.part(head,key,[1,1,1],[0,0,0],accent&&i===count-2?accent:tint);
      }
    } else if(accent) {
      const strand=this.part(head,'sphere',[.15,.11,.62],[-.3,.56,-.04],accent);strand.rotation.z=-.2;
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
