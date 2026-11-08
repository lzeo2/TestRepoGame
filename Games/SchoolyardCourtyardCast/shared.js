/* Fictional placeholders only. To swap locally, set Schoolyard.assets[id] to an
   already-loaded Image before drawing. Never place private reference photos here. */
(function (root) {
  'use strict';
  const roster = [
    { id: 'jack', name: 'Jack', color: '#d9ba79', shirt: '#667f64' },
    { id: 'ian', name: 'Ian', color: '#72a8bc', shirt: '#526e91' },
    { id: 'sim', name: 'Sim', color: '#bc8c7d', shirt: '#93736b' }
  ];
  let selected = 'jack';
  try { const saved = localStorage.getItem('schoolyard-character'); if (roster.some(p => p.id === saved)) selected = saved; } catch (_) {}
  const assets = Object.create(null);
  function select(id) {
    if (!roster.some(p => p.id === id)) return;
    selected = id;
    try { localStorage.setItem('schoolyard-character', id); } catch (_) {}
  }
  function drawAvatar(ctx, id, x, y, size) {
    const p = roster.find(p => p.id === id) || roster[0];
    const image = assets[p.id];
    if (image && image.complete && image.naturalWidth) {
      ctx.drawImage(image, x - size / 2, y - size, size, size); return;
    }
    ctx.save(); ctx.translate(x, y); ctx.scale(size / 60, size / 60);
    ctx.fillStyle = '#182029'; ctx.fillRect(-17, -15, 12, 15); ctx.fillRect(5, -15, 12, 15);
    ctx.fillStyle = p.shirt; ctx.fillRect(-20, -39, 40, 27);
    ctx.fillStyle = '#dfbc99'; ctx.beginPath(); ctx.arc(0, -48, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.color; ctx.fillRect(-16, -63, 32, 12);
    if (p.id === 'ian') { ctx.fillStyle = '#213644'; ctx.fillRect(-16, -51, 32, 9); ctx.fillStyle = '#d3e0e4'; ctx.fillRect(-13, -49, 11, 4); ctx.fillRect(2, -49, 11, 4); }
    else { ctx.fillStyle = '#202a32'; ctx.fillRect(-7, -49, 3, 3); ctx.fillRect(4, -49, 3, 3); }
    ctx.restore();
  }
  root.Schoolyard = { roster, assets, select, get selected() { return selected; }, drawAvatar };
})(typeof window === 'undefined' ? globalThis : window);
