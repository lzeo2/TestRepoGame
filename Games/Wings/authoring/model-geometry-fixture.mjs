// CPU-only fixture extracted from fleet-rig-check: actual GLB meshes/TRS, factor-only materials.
// No image decoding, textures, renderer, upstream loader, network, or native-material acceptance.
export function modelGeometryFixture(THREE, bytes) {
  const data = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  if (!ArrayBuffer.isView(data)) throw new TypeError('GLB bytes required');
  const header = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (header.byteLength < 28 || header.getUint32(0, true) !== 0x46546c67 ||
      header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== data.byteLength)
    throw new TypeError('Complete GLB 2 required');
  const jsonLength = header.getUint32(12, true);
  if (header.getUint32(16, true) !== 0x4e4f534a || 28+jsonLength > data.byteLength ||
      header.getUint32(24+jsonLength, true) !== 0x004e4942 ||
      header.getUint32(20+jsonLength, true)+28+jsonLength !== data.byteLength)
    throw new TypeError('Embedded JSON/BIN GLB required');
  const doc = JSON.parse(new TextDecoder().decode(data.subarray(20, 20+jsonLength)));
  const binary = new DataView(data.buffer, data.byteOffset+28+jsonLength, data.byteLength-28-jsonLength);
  function accessor(index) {
    const a = doc.accessors[index], view = doc.bufferViews[a.bufferView];
    if (a.sparse || view.buffer !== 0) throw new TypeError('Inspected embedded nonsparse accessors required');
    const width = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
    const format = { 5126: [Float32Array, 4, 'getFloat32'], 5125: [Uint32Array, 4, 'getUint32'],
      5123: [Uint16Array, 2, 'getUint16'], 5121: [Uint8Array, 1, 'getUint8'] }[a.componentType];
    if (!width || !format) throw new TypeError('Unsupported fixture accessor');
    const [ArrayType, size, readValue] = format;
    const array = new ArrayType(a.count*width), start = (view.byteOffset ?? 0)+(a.byteOffset ?? 0);
    const stride = view.byteStride ?? width*size;
    if (start+(a.count-1)*stride+width*size > (view.byteOffset ?? 0)+view.byteLength)
      throw new TypeError('Accessor outside buffer view');
    for (let i = 0; i < a.count; i++) for (let j = 0; j < width; j++)
      array[i*width+j] = binary[readValue](start+i*stride+j*size, true);
    return new THREE.BufferAttribute(array, width, a.normalized ?? false);
  }
  const materials = doc.materials.map((material, i) => {
    const pbr = material.pbrMetallicRoughness ?? {};
    const result = new THREE.MeshStandardMaterial({ color: new THREE.Color().fromArray(pbr.baseColorFactor ?? [1, 1, 1]),
      metalness: pbr.metallicFactor ?? 1, roughness: pbr.roughnessFactor ?? 1 });
    result.name = `CPU-factor-only:${material.name ?? i}`;
    return result;
  });
  let triangleCount = 0;
  const nodes = doc.nodes.map(node => {
    const object = new THREE.Group(); object.name = node.name;
    object.position.fromArray(node.translation ?? [0, 0, 0]);
    object.quaternion.fromArray(node.rotation ?? [0, 0, 0, 1]);
    object.scale.fromArray(node.scale ?? [1, 1, 1]);
    if (node.mesh !== undefined) for (const primitive of doc.meshes[node.mesh].primitives) {
      if ((primitive.mode ?? 4) !== 4) throw new TypeError('Triangle fixture required');
      const geometry = new THREE.BufferGeometry();
      for (const [semantic, index] of Object.entries(primitive.attributes)) {
        const name = { POSITION: 'position', NORMAL: 'normal', TEXCOORD_0: 'uv', TANGENT: 'tangent' }[semantic];
        if (!name) throw new TypeError('Unsupported fixture semantic');
        geometry.setAttribute(name, accessor(index));
      }
      if (primitive.indices !== undefined) geometry.setIndex(accessor(primitive.indices));
      triangleCount += (geometry.index?.count ?? geometry.attributes.position.count)/3;
      object.add(new THREE.Mesh(geometry, materials[primitive.material]));
    }
    return object;
  });
  doc.nodes.forEach((node, i) => node.children?.forEach(child => nodes[i].add(nodes[child])));
  const object = new THREE.Group();
  doc.scenes[doc.scene ?? 0].nodes.forEach(index => object.add(nodes[index]));
  return { object, triangleCount };
}
