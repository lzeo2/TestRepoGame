/* Original fictional figures. Coordinates are collision-radius units: y down,
 * z toward camera; box sizes are HALF extents, sphere sizes ellipsoid radii.
 * Adapters apply only the owning body's transform; articulation is baked here.
 * Palettes supply light/copper hair or blue helmet through the cap slot.
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LauncherHuman = factory();
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const roles = ['jack', 'ian', 'sim', 'teacher'];
  const poses = ['loaded', 'pulled', 'flight', 'dash', 'brace', 'hop', 'settled'];
  const proxy = Object.freeze({kind:'enclosing-circle', maxRadius:1});

  function sample(role, pose = 'loaded', options = {}) {
    if (!roles.includes(role)) throw new RangeError('Unknown human role: ' + role);
    if (!poses.includes(pose)) throw new RangeError('Unknown human pose: ' + pose);
    const active = pose === 'loaded' && options.dragging ? 'pulled' : pose;
    const reduced = !!options.reducedMotion;
    const time = Number.isFinite(options.time) ? options.time : 0;
    const age = Number.isFinite(options.poseTime) ? options.poseTime : 0;
    // No accumulated state or unbounded spin. Reduced motion freezes each pose.
    const sway = reduced ? 0 : Math.sin((time % (Math.PI*2))*2)*.018;
    const pulse = reduced ? 0 : Math.sin(Math.max(0, Math.min(1, age/.4))*Math.PI)*.06;
    let turn = sway;
    let elbows = [[-.32,-.06],[.32,-.06]];
    let hands = [[-.29,.21],[.29,.21]];
    let knees = [[-.13,.46],[.13,.46]];
    let ankles = [[-.15,.82],[.15,.82]];
    if (active === 'pulled') {
      turn = -.16 + sway;
      elbows = [[-.34,-.25],[.34,-.25]];
      hands = [[-.32,-.49],[.32,-.49]];
    } else if (active === 'flight') {
      turn = .65 + sway;
      elbows = [[-.36,-.23],[.36,-.23]];
      hands = [[-.48,-.06],[.48,-.06]];
      knees = [[-.24,.42],[.23,.39]];
      ankles = [[-.30,.72],[.31,.65]];
    } else if (active === 'dash') {
      turn = 1.18 + pulse;
      elbows = [[-.29,-.09],[.29,-.09]];
      hands = [[-.24,.15],[.24,.15]];
      knees = [[-.13,.40],[.23,.36]];
      ankles = [[-.17,.76],[.34,.63]];
    } else if (active === 'brace') {
      turn = .08;
      elbows = [[-.34,-.18],[.34,-.18]];
      hands = [[-.16,-.36],[.16,-.36]];
      knees = [[-.29,.31],[.29,.31]];
      ankles = [[-.19,.55],[.19,.55]];
    } else if (active === 'hop') {
      turn = .22 + pulse;
      elbows = [[-.34,-.43],[.34,-.43]];
      hands = [[-.29,-.64],[.29,-.64]];
      knees = [[-.29,.25],[.29,.25]];
      ankles = [[-.33,.51],[.33,.51]];
    } else if (active === 'settled') {
      turn = 0;
      elbows = [[-.29,-.1],[.29,-.1]];
      hands = [[-.12,-.3],[.12,-.3]];
    }
    const c = Math.cos(turn), s = Math.sin(turn), parts = [];
    function add(name, shape, material, x, y, z, sx, sy, sz, angle = 0) {
      parts.push({name, shape, material, x:c*x-s*y, y:s*x+c*y, z, sx, sy, sz, angle:angle+turn});
    }
    function limb(name, material, a, b, width, z) {
      const dx = b[0]-a[0], dy = b[1]-a[1];
      add(name, 'box', material, (a[0]+b[0])/2, (a[1]+b[1])/2, z,
        width, Math.hypot(dx,dy)/2, .065, -Math.atan2(dx,dy));
    }
    add('torso','box','body',0,-.18,0,.205,.235,.105);
    add('hips','box','pants',0,.105,0,.17,.065,.10);
    add('neck','box','skin',0,-.455,0,.065,.055,.07);
    add('head','sphere','skin',0,-.65,0,.18,.21,.135);
    add(role === 'ian' ? 'helmet' : role === 'teacher' ? 'cap' : 'hair',
      'box','cap',0,-.805,0,.185,.075,.14);
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 'left' : 'right', sign = i === 0 ? -1 : 1;
      add(side+'-eye','sphere','dark',sign*.067,-.65,.145,.022,.027,.018);
      limb(side+'-upper-arm','body',[sign*.205,-.35],elbows[i],.063,i ? .035 : -.035);
      limb(side+'-forearm','skin',elbows[i],hands[i],.052,i ? .035 : -.035);
      add(side+'-hand','sphere','skin',...hands[i],.04,.067,.075,.07);
      limb(side+'-upper-leg','pants',[sign*.105,.12],knees[i],.073,0);
      limb(side+'-lower-leg','pants',knees[i],ankles[i],.062,0);
      add(side+'-foot','box','dark',ankles[i][0],ankles[i][1]+.055,.035,.10,.045,.095);
    }
    if (role === 'ian') {
      add('goggles','box','dark',0,-.665,.15,.16,.06,.025);
      add('goggle-lens','box','white',0,-.675,.182,.125,.025,.012);
    } else if (role === 'sim') {
      add('vest','box','cap',0,-.19,.12,.16,.20,.025);
    } else if (role === 'teacher') {
      add('cap-brim','box','dark',.03,-.75,.10,.20,.025,.07);
      add('tie','box','dark',0,-.245,.125,.025,.13,.02,.08);
    }
    return {role, pose, parts};
  }
  function palette(role,body,cap){
    if(!roles.includes(role))throw new RangeError('Unknown human role');
    return {body,cap,skin:{jack:'#c3a080',ian:'#b28c73',sim:'#a7836a',teacher:'#b99d80'}[role],pants:'#293942',dark:'#17252d',white:'#edf0e9'};
  }
  return Object.freeze({sample, proxy, palette});
}));
