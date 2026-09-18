/* =========================================================================
 * Merge Cats Defender — Core: display presentation controller (PD.Display)
 *
 * Centralizes the presentation policy so engine scale defaults never silently
 * define the player experience. It owns the persisted display mode, applies the
 * matching Phaser scale policy, computes the currently visible logical rectangle
 * plus device safe-area insets, and emits ONE debounced layout notification per
 * viewport change. The 1280x720 logical coordinate system never changes; scenes
 * anchor critical controls to safeRect() instead of raw logical edges.
 *
 * Modes (Save.DISPLAY_MODES):
 *   fit  -> Phaser.Scale.FIT     : whole game view visible, letterboxing allowed.
 *   fill -> Phaser.Scale.ENVELOP : viewport covered (cover), edges may crop.
 * Both preserve source aspect ratio; neither stretches.
 * ========================================================================= */
window.PD = window.PD || {};

PD.Display = (function () {
  var GAME = null;                 // Phaser.Game instance (set in attach)
  var game = null;
  var mode = 'fit';
  var listeners = [];
  var debounceTimer = null;
  var probe = null;                // hidden element measuring CSS safe-area insets
  var current = null;              // last computed layout snapshot

  var W = function () { return PD.GAME.WIDTH; };
  var H = function () { return PD.GAME.HEIGHT; };

  function phaserMode(m) {
    return m === 'fill' ? Phaser.Scale.ENVELOP : Phaser.Scale.FIT;
  }

  // Hidden probe whose padding resolves the four CSS env(safe-area-inset-*)
  // values. Read back in page pixels, converted to logical px per layout.
  function ensureProbe() {
    if (probe || typeof document === 'undefined') return;
    probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right);' +
      'padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);';
    document.body.appendChild(probe);
  }

  function readInsetsPx() {
    ensureProbe();
    if (!probe || typeof getComputedStyle === 'undefined') {
      return { left: 0, right: 0, top: 0, bottom: 0 };
    }
    var cs = getComputedStyle(probe);
    return {
      left: parseFloat(cs.paddingLeft) || 0,
      right: parseFloat(cs.paddingRight) || 0,
      top: parseFloat(cs.paddingTop) || 0,
      bottom: parseFloat(cs.paddingBottom) || 0
    };
  }

  // Displayed pixels per logical pixel, from the live canvas box. In FIT the
  // canvas is <= viewport (letterboxed); in ENVELOP it is >= viewport (cover).
  function displayScale() {
    if (!game || !game.canvas || !game.canvas.getBoundingClientRect) return { x: 1, y: 1 };
    var r = game.canvas.getBoundingClientRect();
    return { x: (r.width || W()) / W(), y: (r.height || H()) / H() };
  }

  function viewportSize() {
    var parent = game && game.canvas && game.canvas.parentNode;
    var vw = (parent && parent.clientWidth) || (typeof window !== 'undefined' ? window.innerWidth : W());
    var vh = (parent && parent.clientHeight) || (typeof window !== 'undefined' ? window.innerHeight : H());
    return { w: vw, h: vh };
  }

  // Recompute the visible logical rectangle and the safe (inset) rectangle.
  function compute() {
    var sc = displayScale();
    var vp = viewportSize();
    // The portion of the 1280x720 world actually inside the viewport, centered.
    var visW = Math.min(W(), vp.w / (sc.x || 1));
    var visH = Math.min(H(), vp.h / (sc.y || 1));
    var offX = (W() - visW) / 2;
    var offY = (H() - visH) / 2;

    // Device safe-area insets (page px) -> logical px.
    var ins = readInsetsPx();
    var il = ins.left / (sc.x || 1), ir = ins.right / (sc.x || 1);
    var it = ins.top / (sc.y || 1), ib = ins.bottom / (sc.y || 1);

    var visible = { x: offX, y: offY, w: visW, h: visH };
    var safe = {
      x: offX + il,
      y: offY + it,
      w: Math.max(0, visW - il - ir),
      h: Math.max(0, visH - it - ib)
    };
    var aspect = vp.h > 0 ? vp.w / vp.h : (W() / H());
    current = {
      mode: mode,
      visible: visible,
      safe: safe,
      aspect: aspect,
      // Narrow/portrait battle guard fires below this viewport aspect ratio.
      portrait: aspect < PD.Display.PORTRAIT_GUARD_ASPECT
    };
    return current;
  }

  function emit() {
    compute();
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](current); } catch (e) { /* one bad listener must not break layout */ }
    }
  }

  // Coalesce bursts of resize/orientation events into a single layout update so
  // a scene never accumulates duplicate work or objects per raw DOM event.
  function scheduleEmit() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () { debounceTimer = null; emit(); }, PD.Display.DEBOUNCE_MS);
  }

  function applyMode() {
    if (!game || !game.scale) return;
    try {
      game.scale.scaleMode = phaserMode(mode);
      game.scale.refresh();
    } catch (e) { /* fall back handled by page reload path if ever needed */ }
  }

  return {
    DEBOUNCE_MS: 90,
    // Below this viewport aspect ratio an active battle shows the rotate guard.
    PORTRAIT_GUARD_ASPECT: 1.0,
    // Fill (ENVELOP) keeps all battle interactions usable within this landscape
    // aspect band; outside it, safe-rect anchoring still protects controls.
    FILL_USABLE_ASPECT: { min: 1.20, max: 2.40 },

    // Wire the controller to the running game and subscribe to viewport/
    // orientation changes exactly once. The user-facing display-mode setting was
    // removed; the game is fixed to Fit (whole view, letterboxed) so safeRect and
    // the layout system still compute correctly for all viewports.
    attach: function (phaserGame) {
      game = phaserGame; GAME = phaserGame;
      mode = 'fit';
      applyMode();
      var self = this;
      if (game.scale && game.scale.on) {
        game.scale.on(Phaser.Scale.Events.RESIZE, scheduleEmit);
        if (Phaser.Scale.Events.ORIENTATION_CHANGE) {
          game.scale.on(Phaser.Scale.Events.ORIENTATION_CHANGE, scheduleEmit);
        }
      }
      if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('resize', scheduleEmit);
        window.addEventListener('orientationchange', scheduleEmit);
      }
      compute();
      return self;
    },

    // Current mode ('fit' | 'fill').
    mode: function () { return mode; },

    // Change + persist the display mode, reapply scale policy, and notify scenes.
    setMode: function (m) {
      mode = PD.Save.setDisplayMode(m);   // validated + persisted
      applyMode();
      emit();
      return mode;
    },

    // Visible logical rectangle (portion of 1280x720 currently on screen).
    visibleRect: function () { return (current || compute()).visible; },

    // Safe logical rectangle: visible area minus device safe-area insets. Anchor
    // critical HUD/menu controls here rather than to raw logical edges.
    safeRect: function () { return (current || compute()).safe; },

    // True when the viewport is too narrow for usable lane play (portrait guard).
    isPortrait: function () { return (current || compute()).portrait; },

    layout: function () { return current || compute(); },

    // Subscribe to debounced layout updates. Returns an unsubscribe function;
    // scenes MUST call it on shutdown so handlers are not duplicated or leaked.
    onLayout: function (cb) {
      listeners.push(cb);
      return function () {
        var i = listeners.indexOf(cb);
        if (i !== -1) listeners.splice(i, 1);
      };
    },

    // Force a recompute + notify (e.g. right after a scene builds its UI).
    refresh: function () { emit(); },

    // Convenience for scenes: run `cb(layout)` now and on every debounced layout
    // change, and automatically drop the subscription on scene shutdown/destroy
    // so handlers are never duplicated or leaked across scene restarts.
    bindLayout: function (scene, cb) {
      cb(this.layout());
      var off = this.onLayout(cb);
      scene.events.once('shutdown', off);
      scene.events.once('destroy', off);
      return off;
    }
  };
})();
