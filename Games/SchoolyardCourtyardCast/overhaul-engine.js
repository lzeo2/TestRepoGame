/* Approved live launcher vertical slice.
 * Twenty authored source drafts, not a browser-reviewed 200-level campaign.
 * create(1..levelCount), input(pull,x,y | release | cancel | ability | restart), step(dt).
 * Mutable centers use pixels, positive y down; rotated blocks have angle/omega.
 * UI/renderers consume this state; progress.js owns saves/skins. Browser review pending.
 */
(function (root, factory) {
  'use strict';
  const api = factory(typeof module==='object'&&module.exports?require('./levels.js'):root.LauncherLevels);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LauncherOverhaul = api;
}(typeof window !== 'undefined' ? window : null, function (LEVELS) {
  'use strict';
  const H = 1 / 240, GROUND = 540, GRAVITY = 600;
  if(!Array.isArray(LEVELS)||!LEVELS.length)throw new Error('Authored launcher levels not loaded');
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function circle(kind, x, y, r, mass, id) {
    return { kind, id, x, y, r, mass, invMass: 1/mass, invI: 0,
      vx: 0, vy: 0, angle: 0, omega: 0, restitution: .18, friction: .65,
      sleeping: false, quiet: 0, minY: y };
  }
  function loadBall(s) {
    // ponytail: converted levels use a conservative enclosing circle for every human pose;
    // capsule/compound contacts if empty-space side contacts need tighter precision.
    s.ball = Object.assign(circle('character',s.anchor.x,s.anchor.y,s.presentation==='human-courtyard-v1'?24:16,1,'shot-'+(s.nextIndex+1)),
      { proxy:'enclosing-circle',character: s.queue[s.nextIndex], active: false, abilityUsed: false, pose: 'loaded', poseTime: 0 });
    s.phase = 'ready'; s.dragging = false;
  }
  function create(level = 1) {
    if (!Number.isInteger(level) || level < 1 || level > LEVELS.length) throw new RangeError('Authored draft level 1..'+LEVELS.length+' only');
    const spec = LEVELS[level-1];
    const s = { level, presentation:spec.presentation||'legacy',lesson: spec.lesson, width: 960, height: 600, groundY: GROUND,
      anchor: { x: 145, y: 420 }, maxPull: 90, pullScale: 6, queue: spec.queue.slice(),
      par: spec.par, nextIndex: 0, status: 'playing', phase: 'ready', dragging: false,
      time: 0, accumulator: 0, shotTime: 0, calm: 0, shotClears: 0,
      score: 0, stars: 0, clears: [], blocks: [], teachers: [], groundedContacts: [] };
    s.blocks = spec.blocks.map(([x,y,w,h,mass,material='metal'],i) => ({ kind: 'block', id: 'block-'+i,
      x,y,w,h,mass,material,invMass:1/mass,invI:12/(mass*(w*w+h*h)), angle:0,omega:0,vx:0,vy:0,
      friction:.7,restitution:.08,
      // These two authored floor crates begin at rest; genuine impulses wake them.
      sleeping:level===1&&s.presentation==='human-courtyard-v1'&&y+h/2===GROUND,quiet:0 }));
    s.teachers = spec.teachers.map(([x,y],i) => Object.assign(circle('teacher',x,y,s.presentation==='human-courtyard-v1'?24:16,.8,'teacher-'+i), { cleared:false }));
    loadBall(s);
    return s;
  }
  function input(s, action, x, y) {
    if (action === 'restart') { Object.assign(s, create(s.level)); return true; }
    if (s.status !== 'playing') return false;
    const b = s.ball;
    if (action === 'ability') {
      if (s.phase !== 'flight' || !b.active || b.abilityUsed || b.y+b.r >= GROUND-.5) return false;
      b.abilityUsed = true; b.poseTime = .24;
      if (b.character === 'jack') {
        const length = Math.hypot(b.vx,b.vy) || 1;
        b.vx += b.vx/length*150; b.vy += b.vy/length*150; b.pose = 'dash';
      } else if (b.character === 'ian') {
        b.mass = 2.4; b.invMass = 1/b.mass; b.restitution = .04; b.pose = 'brace';
      } else { b.vy -= 160; b.pose = 'hop'; }
      return true;
    }
    if (s.phase !== 'ready') return false;
    if (action === 'cancel') {
      b.x = s.anchor.x; b.y = s.anchor.y; s.dragging = false; return true;
    }
    if (action === 'pull') {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
      const dx = Math.min(0,x-s.anchor.x), dy = Math.max(0,y-s.anchor.y);
      const scale = Math.max(-dx,dy);
      const length = scale ? Math.hypot(dx/scale,dy/scale) : 1;
      const distance = Math.min(s.maxPull,scale*length);
      b.x = s.anchor.x + (scale ? dx/scale/length*distance : 0);
      b.y = s.anchor.y + (scale ? dy/scale/length*distance : 0);
      s.dragging = true; return true;
    }
    if (action === 'release') {
      const dx = s.anchor.x-b.x, dy = s.anchor.y-b.y;
      if (!s.dragging || Math.hypot(dx,dy) < 4) { input(s,'cancel'); return false; }
      b.vx = dx*s.pullScale; b.vy = dy*s.pullScale;
      b.active = true; b.pose = 'flight'; s.dragging = false; s.phase = 'flight';
      s.nextIndex++; s.shotTime = 0; s.calm = 0; s.shotClears = 0; return true;
    }
    return false;
  }
  function vertices(b) {
    const c = Math.cos(b.angle), s = Math.sin(b.angle);
    return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y]) => ({
      x:b.x+c*x*b.w/2-s*y*b.h/2, y:b.y+s*x*b.w/2+c*y*b.h/2 }));
  }
  function circleBox(a,b) {
    const c=Math.cos(b.angle), s=Math.sin(b.angle), dx=a.x-b.x, dy=a.y-b.y;
    const x=dx*c+dy*s, y=-dx*s+dy*c;
    let qx=clamp(x,-b.w/2,b.w/2), qy=clamp(y,-b.h/2,b.h/2);
    let nx=qx-x, ny=qy-y, length=Math.hypot(nx,ny), depth;
    if (length >= a.r) return null;
    if (length > 1e-9) { depth=a.r-length; nx/=length; ny/=length; }
    else {
      const ex=b.w/2-Math.abs(x), ey=b.h/2-Math.abs(y);
      if (ex < ey) { const side=x<0?-1:1; nx=-side; ny=0; depth=a.r+ex; qx=side*b.w/2; }
      else { const side=y<0?-1:1; nx=0; ny=-side; depth=a.r+ey; qy=side*b.h/2; }
    }
    return { nx:nx*c-ny*s, ny:nx*s+ny*c, depth, x:b.x+qx*c-qy*s, y:b.y+qx*s+qy*c };
  }
  function collision(a,b) {
    if (a.r && b.r) {
      const dx=b.x-a.x, dy=b.y-a.y, length=Math.hypot(dx,dy), total=a.r+b.r;
      if (length >= total) return null;
      const nx=length?dx/length:1, ny=length?dy/length:0;
      return { nx,ny,depth:total-length,x:a.x+nx*a.r,y:a.y+ny*a.r };
    }
    if (a.r) return circleBox(a,b);
    if (b.r) { const c=circleBox(b,a); return c && { ...c,nx:-c.nx,ny:-c.ny }; }
    const va=vertices(a), vb=vertices(b);
    // ponytail: one SAT contact per pair; clipped manifolds if larger stacks jitter.
    let best=null;
    for (const angle of [a.angle,b.angle]) for (const offset of [0,Math.PI/2]) {
      let nx=Math.cos(angle+offset), ny=Math.sin(angle+offset);
      if ((b.x-a.x)*nx+(b.y-a.y)*ny < 0) { nx=-nx; ny=-ny; }
      const pa=va.map(p=>p.x*nx+p.y*ny), pb=vb.map(p=>p.x*nx+p.y*ny);
      const overlap=Math.min(Math.max(...pa),Math.max(...pb))-Math.max(Math.min(...pa),Math.min(...pb));
      if (overlap <= 0) return null;
      if (!best || overlap<best.depth) {
        const tx=-ny, ty=nx, ta=va.map(p=>p.x*tx+p.y*ty), tb=vb.map(p=>p.x*tx+p.y*ty);
        const normal=(Math.max(...pa)+Math.min(...pb))/2;
        const tangent=(Math.max(Math.min(...ta),Math.min(...tb))+Math.min(Math.max(...ta),Math.max(...tb)))/2;
        best={ nx,ny,depth:overlap,x:nx*normal+tx*tangent,y:ny*normal+ty*tangent };
      }
    }
    return best;
  }
  function wakeContactIslands(s,bodies) {
    // ponytail: O(n²) contact graph for small scenes; broadphase if structures grow.
    const links=bodies.map(()=>[]), roots=[];
    for (let i=0;i<bodies.length;i++) {
      const b=bodies[i];
      if (b.r ? b.y+b.r>=GROUND : vertices(b).some(p=>p.y>=GROUND)) roots.push(i);
      for (let j=0;j<i;j++) if (collision(bodies[j],b)) { links[i].push(j); links[j].push(i); }
    }
    const reachable=new Set(roots), queue=roots.slice();
    for (let i=0;i<queue.length;i++) for (const j of links[queue[i]]) if (!reachable.has(j)) { reachable.add(j); queue.push(j); }
    const previous=new Set(s.groundedContacts);
    for (let i=0;i<bodies.length;i++) {
      const b=bodies[i];
      if (b.kind!=='block' || !b.sleeping || !previous.has(b.id) || reachable.has(i)) continue;
      const island=[i], seen=new Set(island);
      for (let k=0;k<island.length;k++) {
        const member=bodies[island[k]]; member.sleeping=false; member.quiet=0;
        for (const j of links[island[k]]) if (!seen.has(j)) { seen.add(j); island.push(j); }
      }
    }
    s.groundedContacts=[...reachable].map(i=>bodies[i].id);
  }
  function velocity(b,x,y) { return { x:b.vx-b.omega*(y-b.y), y:b.vy+b.omega*(x-b.x) }; }
  function clear(s,t,reason) {
    if (t.cleared) return;
    t.cleared=true; t.vx=t.vy=0;
    s.score += 100+(s.shotClears?50:0); s.shotClears++;
    s.clears.push({ id:t.id,reason,shot:s.nextIndex,time:s.time });
  }
  function teacherContact(s,a,b,c,impact,va,vb) {
    for (const [t,other,v] of [[a,b,vb],[b,a,va]]) {
      if (t.kind !== 'teacher' || t.cleared || impact < 40) continue;
      if (other.kind === 'character' && other.active) clear(s,t,'character');
      if (other.kind === 'block' && Math.hypot(v.x,v.y) >= 30) clear(s,t,'block');
    }
  }
  function resolve(s,a,b,c) {
    const va=velocity(a,c.x,c.y), vb=velocity(b,c.x,c.y);
    const vn=(vb.x-va.x)*c.nx+(vb.y-va.y)*c.ny;
    if (-vn > 20) { a.sleeping=b.sleeping=false; a.quiet=b.quiet=0; }
    const am=a.sleeping?0:a.invMass, bm=b.sleeping?0:b.invMass;
    const ai=a.sleeping?0:a.invI, bi=b.sleeping?0:b.invI;
    const sum=am+bm; if (!sum) return;
    const correction=Math.max(0,c.depth-.005)*.6/sum;
    a.x-=c.nx*correction*am; a.y-=c.ny*correction*am;
    b.x+=c.nx*correction*bm; b.y+=c.ny*correction*bm;
    if (vn < 0) {
      const ax=c.x-a.x, ay=c.y-a.y, bx=c.x-b.x, by=c.y-b.y;
      const ca=ax*c.ny-ay*c.nx, cb=bx*c.ny-by*c.nx;
      const j=-(1+Math.min(a.restitution,b.restitution))*vn/(sum+ca*ca*ai+cb*cb*bi);
      a.vx-=j*c.nx*am; a.vy-=j*c.ny*am; a.omega-=j*ca*ai;
      b.vx+=j*c.nx*bm; b.vy+=j*c.ny*bm; b.omega+=j*cb*bi;
      const tx=-c.ny, ty=c.nx, cat=ax*ty-ay*tx, cbt=bx*ty-by*tx;
      const vt=(vb.x-va.x)*tx+(vb.y-va.y)*ty;
      const friction=clamp(-vt/(sum+cat*cat*ai+cbt*cbt*bi),-j*.45,j*.45);
      a.vx-=friction*tx*am; a.vy-=friction*ty*am; a.omega-=friction*cat*ai;
      b.vx+=friction*tx*bm; b.vy+=friction*ty*bm; b.omega+=friction*cbt*bi;
      teacherContact(s,a,b,c,-vn,va,vb);
    }
  }
  const floor={ kind:'ground',x:0,y:GROUND,vx:0,vy:0,omega:0,invMass:0,invI:0,restitution:.12,sleeping:false,quiet:0 };
  function ground(s,b) {
    if (b.r) {
      const depth=b.y+b.r-GROUND;
      if (depth <= 0) return;
      if (b.kind==='teacher' && b.y-b.minY>=12 && b.vy>80) { clear(s,b,'ground'); return; }
      b.y=GROUND-b.r;
      if (b.vy>0) b.vy=b.vy>25 ? -b.vy*b.restitution : 0;
      b.vx*=Math.max(0,1-b.friction*H*8);
    } else {
      // Vertex contacts transfer angular impulse; no scripted block rotation.
      for (const p of vertices(b)) if (p.y>GROUND) resolve(s,b,floor,{ nx:0,ny:1,x:p.x,y:GROUND,depth:p.y-GROUND });
    }
  }
  function finish(s) {
    s.ball.active=false; s.ball.pose='settled'; s.phase='settled';
    if (s.teachers.every(t=>t.cleared)) {
      s.status='won'; s.score+=300+50*(s.queue.length-s.nextIndex);
      s.stars=s.nextIndex<s.par?3:s.nextIndex===s.par?2:1;
    } else if (s.nextIndex>=s.queue.length) s.status='over';
    else loadBall(s);
  }
  function advance(s) {
    s.time+=H;
    const bodies=[...s.blocks,...s.teachers.filter(t=>!t.cleared)];
    if (s.phase==='flight' && s.ball.active) bodies.push(s.ball);
    wakeContactIslands(s,bodies);
    for (const b of bodies) {
      if (b.sleeping) continue;
      b.vy=clamp(b.vy+GRAVITY*H,-900,900); b.vx=clamp(b.vx,-900,900); b.omega=clamp(b.omega,-12,12);
      b.x+=b.vx*H; b.y+=b.vy*H; b.angle+=b.omega*H; b.minY=Math.min(b.minY===undefined?b.y:b.minY,b.y);
      if (b.kind==='character' && b.poseTime>0) {
        b.poseTime=Math.max(0,b.poseTime-H);
        if (!b.poseTime && b.pose!=='brace') b.pose='flight';
      }
    }
    // ponytail: these small scenes use O(n^2) pairs; add broadphase before larger structures.
    for (let iteration=0;iteration<6;iteration++) {
      for (const b of bodies) if (!b.cleared) ground(s,b);
      for (let i=0;i<bodies.length;i++) for (let j=i+1;j<bodies.length;j++) {
        const a=bodies[i], b=bodies[j]; if (a.cleared || b.cleared) continue;
        const c=collision(a,b); if (c) resolve(s,a,b,c);
      }
    }
    for (const b of s.blocks) {
      b.quiet=Math.hypot(b.vx,b.vy)<6 && Math.abs(b.omega)<.06 ? b.quiet+H : 0;
      if (b.quiet>.5) { b.sleeping=true; b.vx=b.vy=b.omega=0; }
    }
    if (s.phase==='flight') {
      s.shotTime+=H;
      const b=s.ball, outside=b.x < -100 || b.x > 1060 || b.y > 700;
      const calm=bodies.every(body=>body.cleared || body===b && outside || Math.hypot(body.vx,body.vy)<20 && Math.abs(body.omega)<.15);
      s.calm=calm ? s.calm+H : 0;
      if (s.calm>=.4 || s.shotTime>=8) finish(s);
    }
  }
  function step(s,dt) {
    if (s.status!=='playing' || !Number.isFinite(dt) || dt<=0) return s;
    s.accumulator+=Math.min(dt,1/30);
    while (s.accumulator>=H-1e-10 && s.status==='playing') {
      s.accumulator=Math.max(0,s.accumulator-H); advance(s);
    }
    if (s.status!=='playing') s.accumulator=0;
    return s;
  }
  return Object.freeze({ create,input,step,levelCount:LEVELS.length,levelInfo:level=>LEVELS[level-1] });
}));
