const LOGICAL_SIZE = 24;
const RASTER_SIZE = LOGICAL_SIZE * 2;
const WHITE = '#fff';
const COLORS = { petrol: '#075d73', rental: '#483781', 'player-drone': '#166756', 'police-drone': '#943a3d', helicopter: '#794237', 'depot-helicopter': '#435874', 'boat-shop': '#235f83', rail: '#943a3d', heist: '#805122' };

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

function drone(ctx) {
  ctx.beginPath();
  ctx.moveTo(6, 7);
  ctx.lineTo(18, 17);
  ctx.moveTo(18, 7);
  ctx.lineTo(6, 17);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = WHITE;
  for (const x of [4.3, 15.3]) for (const y of [5.5, 16.2]) ctx.fillRect(x, y, 4.4, 1.9);
  ctx.beginPath();
  ctx.roundRect(9, 9, 6, 6, 1.6);
  ctx.fill();
}

function helicopter(ctx) {
  ctx.fillStyle = WHITE;
  ctx.fillRect(4.5, 6.5, 15, 1.5);
  ctx.fillRect(11, 7.5, 1.5, 3);
  ctx.fillRect(5, 12.1, 6, 1.5);
  ctx.fillRect(4.3, 10.4, 1.4, 5);
  ctx.fillRect(9, 17.1, 9, 1.5);
  ctx.fillRect(10.8, 14.5, 1.2, 2.8);
  ctx.fillRect(15, 14.5, 1.2, 2.8);
  ctx.beginPath();
  ctx.roundRect(8.3, 10.3, 11, 5.3, 2.3);
  ctx.fill();
}

function boat(ctx) {
  ctx.fillStyle = WHITE;
  ctx.fillRect(8.5, 7, 6.5, 4.7);
  ctx.beginPath();
  ctx.moveTo(5, 11);
  ctx.lineTo(19, 11);
  ctx.lineTo(17, 16);
  ctx.lineTo(8, 16);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(5, 18.5);
  ctx.quadraticCurveTo(8.5, 16.5, 12, 18.5);
  ctx.quadraticCurveTo(15.5, 20, 19, 18.5);
  ctx.lineWidth = 1.1;
  ctx.stroke();
}

function rail(ctx, background) {
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.roundRect(6, 5.5, 12, 11, 2);
  ctx.fill();
  ctx.fillRect(8, 17, 8, 1.5);
  ctx.fillStyle = background;
  ctx.fillRect(8, 7.5, 8, 4);
  ctx.fillRect(8, 13.6, 2, 1.1);
  ctx.fillRect(14, 13.6, 2, 1.1);
}

function heist(ctx, background) {
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.roundRect(5.5, 8.5, 13, 9, 1.4);
  ctx.fill();
  ctx.fillRect(9, 5.9, 6, 2.9);
  ctx.fillStyle = background;
  ctx.fillRect(6.4, 12, 11.2, 1.3);
  ctx.fillRect(11, 11.5, 2, 2.7);
}

const GLYPHS = { petrol: pump, rental: car, 'player-drone': drone, 'police-drone': drone, helicopter, 'depot-helicopter': helicopter, 'boat-shop': boat, rail, heist };

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
    GLYPHS[kind](ctx, color);
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
