/* =========================================================================
 * Merge Cats Defender — Entity: placeable defender Unit
 *
 * A unit is RENDERED at its illustrated box and TARGETS from its lane's
 * wall-edge combat origin (so range stays lane-stable), but a ranged shot is
 * rendered from the cat's own visible muzzle (see _muzzleOrigin).
 *   shooter -> fires pooled projectiles from its gun muzzle at enemies in lane
 *   melee   -> punches enemies that reach the wall in its lane (CatBoxing)
 *   wall    -> no attack; blocks/soaks by occupancy. A frontline Guardian stops
 *              enemies as a lane blocker; a behind-wall Scratch Post soaks
 *              routed wall damage (see routeWallDamage).
 * ========================================================================= */
window.PD = window.PD || {};

PD.Unit = class PD_Unit extends Phaser.GameObjects.Sprite {
  constructor(scene, def, pos, layout) {
    // Render the sprite `seatDy` px above the box anchor so the cat sits ON the
    // box instead of centered on it. The canonical `pos` (and its hit-rect) stay
    // put; the muzzle uses `this.y`, so it shifts with the sprite automatically.
    var seatDy = (layout && layout.seatDy) || 0;
    super(scene, pos.x, pos.y - seatDy, def.idleAnim, 0);
    scene.add.existing(this);

    this.def = def;
    this.pos = pos;
    this._seatDy = seatDy;
    this.lane = pos.lane;
    // `combat` is the TARGETING / range origin (kept at the wall edge for stable
    // lane balance); it is deliberately separate from where a shot is RENDERED,
    // which comes from the cat's visible muzzle (see _muzzleOrigin). Melee
    // targets from its own frontline position.
    this.combat = (def.kind === 'melee')
      ? { x: pos.x, y: pos.y }
      : { x: layout.combatX, y: layout.laneY[pos.lane] };
    this.maxhp = def.hp;
    this.hp = def.hp;
    this._alive = true;
    this._fireTimer = 0;
    this._shooting = false;

    this.setScale(def.scale);
    this.setDepth(30 + pos.lane);
    if (def.tint) this.setTint(def.tint);
    this.play(def.idleAnim);

    if (def.shootAnim) {
      var self = this;
      this.on('animationcomplete', function (anim) {
        if (anim.key === self.def.shootAnim && self._alive) {
          self._shooting = false;
          self.play(self.def.idleAnim);
        }
      });
    }
  }

  // Nearest living enemy in this unit's lane, measured from the wall-edge
  // combat origin (enemies are on the road, right of the origin).
  _nearestInLane(maxRange) {
    var enemies = this.scene.enemies, best = null, bestDx = Infinity;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e._alive || e.lane !== this.lane) continue;
      var dx = e.x - this.combat.x;
      if (dx >= -24 && dx <= maxRange && dx < bestDx) { bestDx = dx; best = e; }
    }
    return best;
  }

  step(delta) {
    if (!this._alive) return;

    if (this.def.kind === 'shooter') {
      this._fireTimer += delta;
      if (this._fireTimer >= this.def.fireRate) {
        if (this._nearestInLane(this.def.range)) { this._fireTimer = 0; this._shoot(); }
      }
    } else if (this.def.kind === 'melee') {
      this._fireTimer += delta;
      if (this._fireTimer >= this.def.fireRate) {
        var m = this._nearestInLane(this.def.meleeRange);
        if (m) {
          this._fireTimer = 0;
          m.takeDamage(this.def.damage, this.def.armorPierce || 0);
          this._shooting = true;
          this.play(this.def.shootAnim, true);
          this.scene.spawnShootFx(this.combat.x, this.combat.y);
          PD.Audio.hit();
        }
      }
    }
    // wall/guardian: no offensive behaviour; damage routed on wall contact
  }

  // World-space origin of this cat's visible weapon muzzle. Transforms the
  // sprite-local `def.muzzle` offset (px, pre-scale) by the deployed position,
  // configured scale, and horizontal orientation. Both the projectile and its
  // shoot effect spawn here so the player perceives one coherent shot.
  _muzzleOrigin() {
    var m = this.def.muzzle || { x: 0, y: 0 };
    var dir = this.flipX ? -1 : 1;   // cats face right (toward enemies) by default
    return { x: this.x + m.x * this.scaleX * dir, y: this.y + m.y * this.scaleY };
  }

  _shoot() {
    this._shooting = true;
    this.play(this.def.shootAnim, true);
    var o = this._muzzleOrigin();
    this.scene.spawnProjectile(o.x, o.y, this.lane, this.def);
    this.scene.spawnShootFx(o.x, o.y);
    PD.Audio.shoot();
  }

  takeDamage(dmg) {
    if (!this._alive) return;
    this.hp -= dmg;
    // Multiply tint only — FILL tint would paint transparent pixels solid,
    // leaving a bounding-box artifact if the unit dies mid-flash.
    this.setTint(0xff5555);
    var self = this;
    this.scene.time.delayedCall(60, function () {
      if (self.active) {
        if (self.def.tint) self.setTint(self.def.tint); else self.clearTint();
      }
    });
    if (this.hp <= 0) this.die();
  }

  die() {
    if (!this._alive) return;
    this._alive = false;
    this.scene.onUnitDied(this);
    this.scene.spawnExplosion(this.x, this.y, 0.28);
    this.clearTint();
    this.destroy();
  }
};
