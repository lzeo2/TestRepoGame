const LOGICAL_SIZE = 24;
const RASTER_SIZE = LOGICAL_SIZE * 2;
const WHITE = '#fff';
const COLORS = { petrol: '#075d73', rental: '#483781' };

function pump(ctx, background) {
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.roundRect(5.5, 5.7, 8.7, 12.3, 1);
  ctx.fill();
  ctx.fillRect(5, 17, 10, 1.6);
  ctx.beginPath();
  ctx.moveTo(14, 14.6);
  ctx.quadraticCurveTo(15.2, 14.6, 15.2, 16);
  ctx.quadraticCurveTo(18.7, 18, 18.7, 14.7);
  ctx.lineTo(18.7, 9.5);
  ctx.lineTo(16.4, 7.1);
  ctx.lineWidth = 1.5;
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.fillStyle = background;
  ctx.fillRect(7.2, 7.6, 5.3, 3.4);
}

function car(ctx, background) {
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.moveTo(7, 11.4);
  ctx.lineTo(8.7, 7.2);
  ctx.lineTo(15.3, 7.2);
  ctx.lineTo(17, 11.4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(5.5, 10.9, 13, 5.9, 1.4);
  ctx.fill();
  ctx.fillRect(7, 16, 2.1, 2.3);
  ctx.fillRect(14.9, 16, 2.1, 2.3);
  ctx.fillStyle = background;
  ctx.beginPath();
  ctx.moveTo(8.7, 10.9);
  ctx.lineTo(9.65, 8.6);
  ctx.lineTo(14.35, 8.6);
  ctx.lineTo(15.3, 10.9);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(7.2, 13, 2.4, 1.2);
  ctx.fillRect(14.4, 13, 2.4, 1.2);
}

export function createServiceMapIcons(document) {
  const rasters = new Map();
  for (const [kind, color] of Object.entries(COLORS)) {
    const raster = document.createElement('canvas');
    raster.width = raster.height = RASTER_SIZE;
    const ctx = raster.getContext('2d');
    if (!ctx) continue;
    ctx.scale(2, 2);
    ctx.beginPath();
    ctx.roundRect(1.15, 1.15, 21.7, 21.7, 5.3);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1.7;
    ctx.strokeStyle = WHITE;
    ctx.stroke();
    if (kind === 'petrol') pump(ctx, color);
    else car(ctx, color);
    rasters.set(kind, raster);
  }
  return {
    draw(ctx, kind, x, y, size) {
      const raster = rasters.get(kind);
      if (raster && size > 0) ctx.drawImage(raster, x - size / 2, y - size / 2, size, size);
    },
    createElement(kind) {
      const raster = rasters.get(kind);
      if (!raster) return null;
      const icon = document.createElement('canvas');
      icon.width = icon.height = RASTER_SIZE;
      icon.className = 'map-service-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.getContext('2d')?.drawImage(raster, 0, 0);
      return icon;
    },
  };
}
