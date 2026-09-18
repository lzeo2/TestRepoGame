/* =========================================================================
 * Merge Cats Defender — Entity: Enemy walker
 *
 * Marches right -> left along its lane on the roadway. On reaching the wall it
 * stops and enters a persistent wall-attack state, chipping the base health on
 * its own attack interval. Behind-wall defenders are never targeted; a lane's
 * Guardian / Scratch Post soaks that damage first (see routeWallDamage).
 * ========================================================================= */
window.PD = window.PD || {};

PD.Enemy = class PD_Enemy extends Phaser.GameObjects.Sprite {
  constructor(scene, def, lane, layout) {
    super(scene, layout.spawnX, layout.laneY[lane], def.walkAnim, 0);
    scene.add.existing(this);

    this.def = def;
    this.lane = lane;
    this.wallX = layout.wallX;
    this.maxhp = def.hp;
    this.hp = def.hp;
    this.speed = def.speed;
    this.armor = def.armor || 0;
    this.bounty = def.bounty;
    this.isBoss = !!def.isBoss;
    this.wallDamage = def.isBoss ? 3 : 1;   // preserved 1 / 3 base-damage contract
    this._alive = true;
    this._state = 'walk';
    this._atkTimer = 0;
    this._contact = 34;   // stop this far in front of a frontline blocker

    this.setScale(def.scale);
    this.setDepth(20 + lane);
    this.hitR = this.displayWidth * 0.28;
    this.play(def.walkAnim);
    this.flipX = false;   // art is authored facing left
  }

  // A living defender (Guardian or melee) on this lane's frontline position,
  // else null.
  _blocker() {
    var f = this.scene.frontline[this.lane];
    var u = f && f.occupant;
    return (u && u._alive) ? u : null;
  }

  step(delta) {
    if (!this._alive) return;

    // Blocked by a frontline defender (Guardian or melee): attack it in place.
    if (this._state === 'block') {
      var m = this._blocker();
      if (!m) { this._state = 'walk'; this.play(this.def.walkAnim); return; }
      this._atkTimer += delta;
      if (this._atkTimer >= this.def.attackRate) {
        this._atkTimer = 0;
        m.takeDamage(this.def.damage);
        this.play(this.def.attackAnim, true);
      }
      return;
    }

    // Attacking the wall.
    if (this._state === 'wall') {
      this._atkTimer += delta;
      if (this._atkTimer >= this.def.attackRate) {
        this._atkTimer = 0;
        this.scene.routeWallDamage(this.lane, this.wallDamage);
        this.play(this.def.attackAnim, true);
      }
      return;
    }

    // Walking: stop on a living frontline blocker before reaching the wall.
    var blocker = this._blocker();
    if (blocker && this.x <= blocker.x + this._contact) {
      this.x = blocker.x + this._contact;
      this._state = 'block';
      this._atkTimer = this.def.attackRate * 0.5;
      this.play(this.def.attackAnim);
      return;
    }

    this.x -= this.speed * (delta / 1000);
    if (this.x <= this.wallX) {
      this.x = this.wallX;
      this._state = 'wall';
      this._atkTimer = this.def.attackRate * 0.5;
      this.play(this.def.attackAnim);
    }
  }

  takeDamage(dmg, armorPierce) {
    if (!this._alive) return;
    var armor = Math.max(0, this.armor - (armorPierce || 0));
    var eff = Math.max(1, dmg - armor);
    this.hp -= eff;
    this.scene.tweens.add({ targets: this, duration: 60, yoyo: true, alpha: 0.55 });
    // Multiply tint only — FILL tint would paint transparent pixels solid,
    // leaving a bounding-box artifact if the sprite dies mid-flash.
    this.setTint(0xffffff);
    var self = this;
    this.scene.time.delayedCall(45, function () { if (self.active) self.clearTint(); });
    if (this.hp <= 0) this.die();
  }

  die() {
    if (!this._alive) return;
    this._alive = false;
    this.scene.onEnemyKilled(this);
    this.scene.spawnExplosion(this.x, this.y, this.isBoss ? 0.6 : 0.34);
    PD.Audio.explode();
    if (this.isBoss) this.scene.cameras.main.shake(220, 0.012);
    this.clearTint();
    this.destroy();
  }
};
