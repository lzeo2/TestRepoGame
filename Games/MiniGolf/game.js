(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const strokesEl = document.getElementById('strokes');
  const holeEl = document.getElementById('hole');
  const bestEl = document.getElementById('best');
  const messageEl = document.getElementById('message');
  const restartEl = document.getElementById('restart');

  const W = canvas.width, H = canvas.height;
  const BEST_KEY = 'minigolf-best';

  let ball, hole, obstacles, strokes, holeNum, best, aiming, aimStart, mouse, sunk;

  function bestKey() { try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch (e) { return 0; } }

  function placeHole() {
    hole = { x: 60 + Math.random() * (W - 120), y: 60 + Math.random() * (H * 0.4), r: 14 };
  }

  function newHole(reset) {
    if (reset) { holeNum = 1; strokes = 0; }
    ball = { x: W / 2, y: H - 50, vx: 0, vy: 0, r: 9 };
    obstacles = [{ x: W / 2 - 90, y: H / 2 - 10, w: 180, h: 20 }];
    placeHole();
    aimStart = null; aiming = false; sunk = false;
    strokesEl.textContent = String(strokes); holeEl.textContent = String(holeNum);
    best = bestKey(); bestEl.textContent = best ? String(best) : '0';
    messageEl.textContent = 'Pull back from the ball and release to shoot.';
    draw();
  }

  function newGame() { holeNum = 1; strokes = 0; newHole(false); }

  function pos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (W / rect.width), y: (e.clientY - rect.top) * (H / rect.height) };
  }

  canvas.addEventListener('mousedown', e => {
    if (sunk) return;
    const p = pos(e);
    if (Math.hypot(p.x - ball.x, p.y - ball.y) < 40) { aiming = true; aimStart = p; mouse = p; }
  });
  canvas.addEventListener('mousemove', e => { if (aiming) mouse = pos(e); });
  function putt(ax, ay, mx, my) {
    const dx = ax - mx, dy = ay - my;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) return;
    const power = Math.min(dist, 120) * 0.12;
    ball.vx = (dx / dist) * power; ball.vy = (dy / dist) * power;
    strokes++; strokesEl.textContent = String(strokes);
    messageEl.textContent = 'Putt!';
  }

  canvas.addEventListener('mouseup', e => {
    if (!aiming) return; aiming = false;
    putt(aimStart.x, aimStart.y, mouse.x, mouse.y);
  });

  canvas.addEventListener('touchstart', e => {
    if (sunk) return;
    e.preventDefault();
    const t = e.touches[0];
    const p = pos(t);
    if (Math.hypot(p.x - ball.x, p.y - ball.y) < 60) { aiming = true; aimStart = p; mouse = p; }
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    if (!aiming) return;
    e.preventDefault();
    mouse = pos(e.touches[0]);
  }, { passive: false });
  canvas.addEventListener('touchend', e => {
    if (!aiming) return;
    e.preventDefault();
    aiming = false;
    putt(aimStart.x, aimStart.y, mouse.x, mouse.y);
  }, { passive: false });

  // keyboard: arrows pull the aim point, space putts
  const pull = { x: 0, y: 90 };
  function showKeyAim() {
    if (sunk) return;
    aiming = true;
    aimStart = { x: ball.x + pull.x, y: ball.y + pull.y };
    mouse = { x: ball.x, y: ball.y };
  }
  document.addEventListener('keydown', e => {
    const k = e.key;
    if (k === 'ArrowLeft') pull.x = Math.max(-120, pull.x - 15);
    else if (k === 'ArrowRight') pull.x = Math.min(120, pull.x + 15);
    else if (k === 'ArrowUp') pull.y = Math.max(-120, pull.y - 15);
    else if (k === 'ArrowDown') pull.y = Math.min(120, pull.y + 15);
    else if (k === ' ' || k === 'Enter') {
      if (sunk) return;
      e.preventDefault();
      if (!aiming) showKeyAim();
      aiming = false;
      putt(aimStart.x, aimStart.y, mouse.x, mouse.y);
      return;
    } else return;
    e.preventDefault();
    showKeyAim();
  });

  function update() {
    if (sunk) return;
    ball.x += ball.vx; ball.y += ball.vy;
    ball.vx *= 0.985; ball.vy *= 0.985;
    if (Math.abs(ball.vx) < 0.02) ball.vx = 0;
    if (Math.abs(ball.vy) < 0.02) ball.vy = 0;
    if (ball.x < ball.r) { ball.x = ball.r; ball.vx *= -0.7; }
    if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx *= -0.7; }
    if (ball.y < ball.r) { ball.y = ball.r; ball.vy *= -0.7; }
    if (ball.y > H - ball.r) { ball.y = H - ball.r; ball.vy *= -0.7; }
    for (const o of obstacles) {
      if (ball.x + ball.r > o.x && ball.x - ball.r < o.x + o.w && ball.y + ball.r > o.y && ball.y - ball.r < o.y + o.h) {
        // simple bounce: determine axis
        const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
        if (Math.abs(ball.x - cx) / o.w > Math.abs(ball.y - cy) / o.h) ball.vx *= -0.7; else ball.vy *= -0.7;
        ball.x += ball.vx; ball.y += ball.vy;
      }
    }
    if (Math.hypot(ball.x - hole.x, ball.y - hole.y) < hole.r && Math.hypot(ball.vx, ball.vy) < 2.2) {
      sunk = true;
      messageEl.textContent = `Sunk in ${strokes} strokes!`;
      if (!best || strokes < best) { best = strokes; bestEl.textContent = String(best); try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {} }
      setTimeout(() => { holeNum++; newHole(false); }, 1200);
    }
  }

  function draw() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1f6f4a'); g.addColorStop(1, '#14512f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 4; ctx.strokeRect(6, 6, W - 12, H - 12);

    for (const o of obstacles) { ctx.fillStyle = '#3a2a1c'; roundRect(ctx, o.x, o.y, o.w, o.h, 6); ctx.fill(); }

    // hole
    ctx.fillStyle = '#0a0c1d'; ctx.beginPath(); ctx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hole.x, hole.y); ctx.lineTo(hole.x, hole.y - 22); ctx.stroke();
    ctx.fillStyle = '#eef1ff';
    ctx.beginPath(); ctx.moveTo(hole.x, hole.y - 22); ctx.lineTo(hole.x + 14, hole.y - 17); ctx.lineTo(hole.x, hole.y - 12); ctx.closePath(); ctx.fill();

    // aim line
    if (aiming && aimStart) {
      const dx = aimStart.x - mouse.x, dy = aimStart.y - mouse.y;
      const dist = Math.min(Math.hypot(dx, dy), 120);
      const a = Math.atan2(dy, dx);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(ball.x, ball.y);
      ctx.lineTo(ball.x + Math.cos(a) * dist, ball.y + Math.sin(a) * dist); ctx.stroke();
    }

    // ball
    ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = '#fff';
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  restartEl.addEventListener('click', () => newHole(true));
  function loop() { update(); draw(); requestAnimationFrame(loop); }
  newGame(); requestAnimationFrame(loop);
})();
