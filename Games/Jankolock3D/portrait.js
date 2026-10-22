import * as THREE from './vendor/three.module.js';

export const BYTES = 3228372;
export const HASH = '8463eee8276187cacaba912d9540279ad1bb338aa382e9448632aa9a33892514';
const BASE = new URL('.', import.meta.url);
const ASSET = 'models/portrait_relief.glb';

function requireValue(ok, message) {
  if (!ok) throw new Error(`Portrait: ${message}`);
}

// Only the optimizer's uncompressed, single-mesh GLB subset. No external resources.
export function parseGLB(buffer) {
  requireValue(buffer instanceof ArrayBuffer && buffer.byteLength >= 28, 'invalid GLB buffer');
  const view = new DataView(buffer);
  requireValue(view.getUint32(0, true) === 0x46546c67 && view.getUint32(4, true) === 2 &&
    view.getUint32(8, true) === buffer.byteLength, 'invalid GLB header');
  const jsonLength = view.getUint32(12, true);
  const binHeader = 20 + jsonLength;
  requireValue(jsonLength % 4 === 0 && binHeader + 8 <= buffer.byteLength &&
    view.getUint32(16, true) === 0x4e4f534a, 'invalid JSON chunk');
  const doc = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(
    new Uint8Array(buffer, 20, jsonLength)));
  const binLength = view.getUint32(binHeader, true);
  const binStart = binHeader + 8;
  requireValue(binLength % 4 === 0 && binStart + binLength === buffer.byteLength &&
    view.getUint32(binHeader + 4, true) === 0x004e4942, 'invalid BIN chunk');
  requireValue(doc.asset?.version === '2.0' && !doc.extensionsRequired?.length &&
    doc.buffers?.length === 1 && !('uri' in doc.buffers[0]) &&
    doc.buffers[0].byteLength === binLength, 'unsupported buffers or extensions');
  requireValue(doc.scene === 0 && doc.scenes?.length === 1 &&
    doc.scenes[0].nodes?.length === 1 && doc.scenes[0].nodes[0] === 0 &&
    doc.nodes?.length === 1 && doc.nodes[0].mesh === 0 &&
    Object.keys(doc.nodes[0]).every(key => key === 'mesh' || key === 'name') &&
    doc.meshes?.length === 1 && doc.meshes[0].primitives?.length === 1,
  'expected one untransformed mesh');
  const primitive = doc.meshes[0].primitives[0];
  requireValue(primitive.mode === 4 && !primitive.targets &&
    Object.keys(primitive.attributes || {}).sort().join(',') === 'COLOR_0,NORMAL,POSITION',
  'unsupported primitive');

  function attribute(index, type, componentType, width, ArrayType, normalized = false) {
    const acc = doc.accessors?.[index];
    const span = doc.bufferViews?.[acc?.bufferView];
    requireValue(acc && span && acc.type === type && acc.componentType === componentType &&
      Boolean(acc.normalized) === normalized && !acc.sparse && span.buffer === 0 &&
      !span.byteStride && Number.isSafeInteger(acc.count) && acc.count > 0,
    'unsupported accessor');
    const start = span.byteOffset ?? 0;
    const offset = acc.byteOffset ?? 0;
    const length = acc.count * width * ArrayType.BYTES_PER_ELEMENT;
    requireValue([start, offset, span.byteLength, length].every(Number.isSafeInteger) &&
      start >= 0 && offset >= 0 && span.byteLength >= 0 &&
      start + span.byteLength <= binLength && offset + length <= span.byteLength &&
      (binStart + start + offset) % ArrayType.BYTES_PER_ELEMENT === 0,
    'accessor out of bounds or misaligned');
    return new ArrayType(buffer, binStart + start + offset, acc.count * width);
  }
  const attrs = primitive.attributes;
  const positions = attribute(attrs.POSITION, 'VEC3', 5126, 3, Float32Array);
  const normals = attribute(attrs.NORMAL, 'VEC3', 5126, 3, Float32Array);
  const colors = attribute(attrs.COLOR_0, 'VEC4', 5121, 4, Uint8Array, true);
  const indices = attribute(primitive.indices, 'SCALAR', 5125, 1, Uint32Array);
  const vertices = positions.length / 3;
  requireValue(normals.length === positions.length && colors.length === vertices * 4 &&
    indices.length % 3 === 0 && positions.every(Number.isFinite) && normals.every(Number.isFinite),
  'invalid vertex data');
  requireValue(indices.every(index => index < vertices), 'index out of bounds');
  for (let i = 0; i < indices.length; i += 3) {
    requireValue(indices[i] !== indices[i + 1] && indices[i] !== indices[i + 2] &&
      indices[i + 1] !== indices[i + 2], 'collapsed triangle');
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4, true));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export async function verifyPortrait(buffer) {
  requireValue(buffer.byteLength === BYTES, 'asset byte count mismatch');
  requireValue(globalThis.crypto?.subtle, 'SHA-256 unavailable; use a secure context');
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', buffer));
  const hash = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
  requireValue(hash === HASH, 'asset SHA-256 mismatch');
  return hash;
}

// Native metres, about 0.3 m tall. The host owns transforms, lighting and rendering.
export async function mountPortrait(scene) {
  requireValue(scene?.isObject3D, 'scene must be a THREE scene/group');
  const response = await fetch(new URL('portrait-config.json', BASE), { redirect: 'error' });
  requireValue(response.ok, 'config unavailable');
  const config = await response.json();
  requireValue(config.enabled === true && config.url === ASSET &&
    config.bytes === BYTES && config.sha256 === HASH, 'config disabled or integrity mismatch');
  const asset = await fetch(new URL(ASSET, BASE), { redirect: 'error' });
  requireValue(asset.ok, 'asset unavailable');
  const buffer = await asset.arrayBuffer();
  await verifyPortrait(buffer);
  const geometry = parseGLB(buffer);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Supplied photo-derived relief';
  const group = new THREE.Group();
  group.name = 'Portrait relief';
  group.add(mesh);
  const metadata = Object.freeze({ bytes: BYTES, sha256: HASH,
    vertices: geometry.attributes.position.count, triangles: geometry.index.count / 3,
    units: 'm', source: 'in-house supplied photo-derived relief, not a scan' });
  group.userData.portrait = metadata;
  scene.add(group);
  let disposed = false;
  return { group, metadata, dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    geometry.dispose();
    material.dispose();
    group.clear();
  } };
}

// Runnable without a browser: node --experimental-default-type=module --input-type=module
// Import this module and call selfCheckPortrait(arrayBuffer) with the local GLB bytes.
export async function selfCheckPortrait(buffer) {
  await verifyPortrait(buffer);
  const geometry = parseGLB(buffer);
  requireValue(geometry.attributes.position.count === 61893 && geometry.index.count === 373536,
    'regression counts changed');
  requireValue(geometry.attributes.color.normalized && geometry.boundingBox.max.y -
    geometry.boundingBox.min.y > 0.3, 'regression attributes or native scale changed');
  geometry.dispose();
  const corrupt = buffer.slice(0);
  new Uint8Array(corrupt)[corrupt.byteLength - 1] ^= 1;
  let rejected = false;
  try { await verifyPortrait(corrupt); } catch { rejected = true; }
  requireValue(rejected, 'corruption was not rejected');
  const invalid = buffer.slice(0);
  new DataView(invalid).setUint32(0, 0, true);
  rejected = false;
  try { parseGLB(invalid); } catch { rejected = true; }
  requireValue(rejected, 'invalid GLB header was not rejected');
  return 'PASS: GLB geometry/counts/native scale, SHA-256 and corruption rejection';
}
