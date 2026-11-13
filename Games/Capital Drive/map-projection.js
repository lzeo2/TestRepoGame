export function createMapProjection(bounds, width, height, view = {}) {
  const scale = Math.min((width - 50) / (bounds.maxX - bounds.minX), (height - 50) / (bounds.maxZ - bounds.minZ)) * (view.zoom || 1);
  const cx = view.x ?? (bounds.minX + bounds.maxX) / 2;
  const cz = view.z ?? (bounds.minZ + bounds.maxZ) / 2;
  return {
    scale, cx, cz, width, height,
    toCanvas(x, z) { return { x: (x - cx) * scale + width / 2, y: (z - cz) * scale + height / 2 }; },
    toWorld(x, y) { return { x: (x - width / 2) / scale + cx, z: (y - height / 2) / scale + cz }; },
  };
}

export function mapPointFromClient(projection, rect, clientX, clientY, bounds) {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const point = projection.toWorld((clientX - rect.left) * projection.width / rect.width, (clientY - rect.top) * projection.height / rect.height);
  if (!Number.isFinite(point.x) || !Number.isFinite(point.z)) return null;
  const tolerance = 1e-6;
  if (point.x < bounds.minX - tolerance || point.x > bounds.maxX + tolerance || point.z < bounds.minZ - tolerance || point.z > bounds.maxZ + tolerance) return null;
  return { x: Math.max(bounds.minX, Math.min(bounds.maxX, point.x)), z: Math.max(bounds.minZ, Math.min(bounds.maxZ, point.z)) };
}
