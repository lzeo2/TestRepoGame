// Coordinates are lot indices; world positions are metres, Y up, +Z south.
export class RoadGrid {
  constructor(size = 200, lotSize = 10) {
    if (!Number.isInteger(size) || size < 2 || size > 200 || !Number.isFinite(lotSize) || lotSize <= 0) throw new RangeError('Invalid grid');
    this.size = size;
    this.lotSize = lotSize;
    this.cells = new Set();
    this.version = 0;
  }
  valid(x, z) { return Number.isInteger(x) && Number.isInteger(z) && x >= 0 && z >= 0 && x < this.size && z < this.size; }
  key(x, z) { return z * this.size + x; }
  cell(key) { return { x: key % this.size, z: Math.floor(key / this.size) }; }
  center(x, z) { return { x: (x + 0.5 - this.size / 2) * this.lotSize, y: 0, z: (z + 0.5 - this.size / 2) * this.lotSize }; }
  worldToCell(x, z) {
    const cell = { x: Math.floor(x / this.lotSize + this.size / 2), z: Math.floor(z / this.lotSize + this.size / 2) };
    return this.valid(cell.x, cell.z) ? cell : null;
  }
  has(x, z) { return this.valid(x, z) && this.cells.has(this.key(x, z)); }
  hasRoad(x, z) { return this.has(x, z); }
  findPath(a, b) { return this.path(a, b); }
  set(x, z, present = true) {
    if (!this.valid(x, z)) throw new RangeError('Road outside grid');
    const key = this.key(x, z), before = this.cells.has(key);
    if (present) this.cells.add(key); else this.cells.delete(key);
    if (before !== Boolean(present)) this.version++;
    return before !== Boolean(present);
  }
  // Manhattan drag preview and placement share this exact X-then-Z policy.
  line(a, b) {
    if (!this.valid(a.x, a.z) || !this.valid(b.x, b.z)) throw new RangeError('Road outside grid');
    const cells = [{ ...a }];
    let { x, z } = a;
    while (x !== b.x) { x += Math.sign(b.x - x); cells.push({ x, z }); }
    while (z !== b.z) { z += Math.sign(b.z - z); cells.push({ x, z }); }
    return cells;
  }
  place(a, b, present = true) {
    const cells = this.line(a, b);
    for (const { x, z } of cells) this.set(x, z, present);
    return cells;
  }
  neighbors(x, z) {
    return [{ x: x + 1, z }, { x, z: z + 1 }, { x: x - 1, z }, { x, z: z - 1 }].filter(p => this.has(p.x, p.z));
  }
  path(a, b) {
    if (!this.has(a.x, a.z) || !this.has(b.x, b.z)) return [];
    const start = this.key(a.x, a.z), goal = this.key(b.x, b.z);
    const queue = [start], parent = new Map([[start, null]]);
    // ponytail: BFS is bounded to 40,000 lots; cache routes by version if traffic volume grows.
    for (let i = 0; i < queue.length; i++) {
      const key = queue[i];
      if (key === goal) {
        const result = [];
        for (let k = goal; k !== null; k = parent.get(k)) result.push(this.cell(k));
        return result.reverse();
      }
      const { x, z } = this.cell(key);
      for (const p of this.neighbors(x, z)) {
        const next = this.key(p.x, p.z);
        if (!parent.has(next)) { parent.set(next, key); queue.push(next); }
      }
    }
    return [];
  }
  lanePoints(path) {
    if (!Array.isArray(path) || path.some(p => !this.has(p.x, p.z))) throw new RangeError('Route must use current roads');
    const points = path.map(p => this.center(p.x, p.z));
    const offset = this.lotSize * 0.18;
    return points.map((p, i) => {
      const incoming = path[Math.max(0, i - 1)], outgoing = path[Math.min(path.length - 1, i + 1)], here = path[i];
      const prev = i ? { x: here.x - incoming.x, z: here.z - incoming.z } : { x: outgoing.x - here.x, z: outgoing.z - here.z };
      const next = i < path.length - 1 ? { x: outgoing.x - here.x, z: outgoing.z - here.z } : prev;
      if (path.length > 1 && (Math.abs(prev.x) + Math.abs(prev.z) !== 1 || Math.abs(next.x) + Math.abs(next.z) !== 1 || (prev.x === -next.x && prev.z === -next.z))) throw new RangeError('Route must be cardinal with no U-turn');
      // Right-hand lane; the sum is a square-corner miter at intersections.
      const turn = prev.x !== next.x || prev.z !== next.z;
      return { x: p.x - (turn ? prev.z + next.z : next.z) * offset, y: 0.08, z: p.z + (turn ? prev.x + next.x : next.x) * offset };
    });
  }
}
