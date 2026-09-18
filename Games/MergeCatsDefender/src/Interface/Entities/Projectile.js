/* =========================================================================
 * Merge Cats Defender — Entity: Projectile (pooled)
 *
 * Travels rightward down its lane, hitting enemies as it goes. Behaviour is
 * driven by the firing unit's bullet definition:
 *   pierce > 1  -> passes through multiple enemies
 *   splash > 0  -> on impact, deals 60% area damage to nearby enemies in the
 *                  impact lane AND the two immediately adjacent lanes (within
 *                  the configured horizontal radius; no edge wrap)
 * ========================================================================= */
window.PD = window.PD || {};

PD.Projectile = class PD_Projectile extends Phaser.GameObjects.Sprite {
  constructor(scene) {
    super(scene, 0, 0, 'bullet0');
    scene.add.existing(this);
    this.setDepth(40);
    this.deactivate();
  }

  deactivate() {
    this.active = false;
    this.setVisible(false);
    this._alive = false;
  }

  fire(x, y, lane, def) {
    this.setTexture('bullet' + def.bullet);
    this.setPosition(x, y);
    this.lane = lane;
    this.vx = def.bulletSpeed;
    this.damage = def.damage;
    this.pierce = def.pierce || 1;
    this.splash = def.splash || 0;
    this.armorPierce = def.armorPierce || 0;
    this._hits = [];
    this._alive = true;
    this.active = true;
    this.setVisible(true);
    this.setScale(def.bullet === 1 ? 1.05 : 0.85);
    this.setRotation(0);
  }

  step(delta) {
    if (!this._alive) return;
    var dt = delta / 1000;
    this.x += this.vx * dt;
    this.rotation += 0.4 * dt * (this.vx > 0 ? 1 : -1);

    if (this.x > PD.GAME.WIDTH + 60) { this.deactivate(); return; }

    var enemies = this.scene.enemies;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e._alive || e.lane !== this.lane) continue;
      if (this._hits.indexOf(e) !== -1) continue;
      if (Math.abs(e.x - this.x) < (e.hitR + 10)) {
        this._impact(e, enemies);
        if (!this._alive) return;
      }
    }
  }

  _impact(enemy, enemies) {
    // Snapshot the enemies present at impact BEFORE any takeDamage can kill an
    // enemy and synchronously splice it out of the live array — walking the
    // mutating array would skip the candidate after each removal. The snapshot
    // considers each enemy present at impact exactly once; the _alive check
    // below still prevents damaging one that died earlier in this same impact.
    var candidates = this.splash > 0 ? enemies.slice() : null;

    enemy.takeDamage(this.damage, this.armorPierce);
    this._hits.push(enemy);
    PD.Audio.hit();

    if (this.splash > 0) {
      for (var i = 0; i < candidates.length; i++) {
        var o = candidates[i];
        // Uniform secondary predicate: alive, not the direct target, within one
        // lane of the impact (numeric difference — no wrap between opposite
        // edges), and strictly inside the horizontal splash radius.
        if (o === enemy || !o._alive) continue;
        if (Math.abs(o.lane - enemy.lane) > 1) continue;
        if (Math.abs(o.x - enemy.x) < this.splash) o.takeDamage(this.damage * 0.6, this.armorPierce);
      }
      this.scene.spawnExplosion(this.x, this.y, 0.18);
    }

    this.pierce -= 1;
    if (this.pierce <= 0) this.deactivate();
  }
};
