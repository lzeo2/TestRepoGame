import { WORLD } from './world.js';

// North-up, actual world coordinates. Highway uses distance relative to the car.
export function mapPoint(run, x, z, size = 144) {
  const margin = 8, span = size - margin * 2;
  const clip = n => Math.max(margin, Math.min(size - margin, n));
  return run.mode === 'roam' ? [clip(size / 2 + x / (WORLD.limit * 2) * span), clip(size / 2 + z / (WORLD.limit * 2) * span)] :
    [clip(size / 2 + x * span / 18), clip(size * .78 - (z - run.distance) * span / 320)];
}
export function drawMap(canvas, run) {
  const ctx = canvas.getContext('2d'), size = canvas.width;
  ctx.fillStyle = '#ece8dc'; ctx.fillRect(0, 0, size, size);
  const point = (x, z) => mapPoint(run, x, z, size);
  if (run.mode === 'roam') {
    ctx.fillStyle = '#9c9485';
    for (const b of WORLD.blocks) {
      const a = point(b.x - b.width / 2, b.z - b.depth / 2), c = point(b.x + b.width / 2, b.z + b.depth / 2);
      ctx.fillRect(a[0], a[1], c[0] - a[0], c[1] - a[1]);
    }
    ctx.fillStyle = '#222'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('N', 5, 13);
  } else {
    ctx.fillStyle = '#565c62'; ctx.fillRect(size * .2, 0, size * .6, size);
    ctx.strokeStyle = '#f7f1dd'; ctx.setLineDash([4, 5]);
    for (const x of [-3.5, 0, 3.5]) { const px = point(x, run.distance)[0]; ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, size); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.fillText(`${Math.floor(run.distance)}/${run.finishDistance} m`, 5, 13);
  }
  for (const [type, color] of [['traffic', '#326b89'], ['police', '#b34732'], ['rivals', '#746130']]) {
    ctx.fillStyle = color;
    for (const e of run[type]) {
      const [x, y] = point(run.mode === 'roam' ? e.world.x : e.x, run.mode === 'roam' ? e.world.z : e.distance);
      if (type === 'police') ctx.fillRect(x - 3, y - 3, 6, 6);
      else { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  const [x, y] = point(run.mode === 'roam' ? run.world.x : run.x, run.mode === 'roam' ? run.world.z : run.distance);
  ctx.save(); ctx.translate(x, y); ctx.rotate(run.mode === 'roam' ? -run.world.heading : 0);
  ctx.fillStyle = '#111'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4, 4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
}
