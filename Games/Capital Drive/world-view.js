import { coveredCentrePassage } from './covered-passage.js';
import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { NATIONAL_ARCHITECTURE_IDS, emitNationalArchitecture } from './national-architecture.js';
import { REGIONAL_ARCHITECTURE_IDS, emitRegionalArchitecture } from './regional-architecture.js';
import { createTerrainSampler } from './terrain.js';
import { placeFoliage } from './foliage-placement.js';
import { prepareWaterRing } from './water-contact.js';
import { roadProfile, roadMarkingOffsets, isLakeBridgeRoad, bridgeDeckEdges, BRIDGE_DECK_BOTTOM, BRIDGE_DECK_TOP } from './road-network.js';
import { retailDistrict, facesRetailStreet } from './districts.js';
import { suburbCharacter } from './suburb-character.js';
import { ROAD_TEXTURE_SIZE, SURFACE_TEXTURE_SIZE, ATLAS_INSET, ATLAS_SPAN, createRoadPixels, createSurfacePixels } from './exterior-materials.js';

// Metres, with east = +x and south = +z. All art is generated locally.
const CHUNK_SIZE = 350;
const VISIBILITY = 650;
const CELL_SIZE = 80;
const COLORS = {
  grass: 0x849565, park: 0x78905e, asphalt: 0x555654, path: 0xc3bcb0,
  kerb: 0xd5d0c2, paint: 0xe6e4d5, brick: 0x9c7560, cream: 0xd6c9ae,
  roof: 0x8e5643, metal: 0x737975, trunk: 0x796b57, green: 0x537158,
};

// Rendering ownership only: the source roads retain their traffic widths and IDs.
// Near-coincident lake ways share a seam instead of drawing skins over each other.
export function lakeBridgeRoadBands(segments) {
  const lake = segments.filter(s => isLakeBridgeRoad(s.road));
  const result = new Map();
  for (const s of lake) {
    const dx=(s.b[0]-s.a[0])/s.length,dz=(s.b[1]-s.a[1])/s.length,nx=-dz,nz=dx;
    const partners=[];const cuts=[0,1];
    for(const other of lake) {
      if(other===s || other.road===s.road)continue;
      const ox=(other.b[0]-other.a[0])/other.length,oz=(other.b[1]-other.a[1])/other.length;
      const alignment=dx*ox+dz*oz;if(Math.abs(alignment)<.995)continue;
      const sign=alignment<0?-1:1,onx=-oz*sign,onz=ox*sign;
      const start=((other.a[0]-s.a[0])*dx+(other.a[1]-s.a[1])*dz)/s.length;
      const end=((other.b[0]-s.a[0])*dx+(other.b[1]-s.a[1])*dz)/s.length;
      const lo=Math.max(0,Math.min(start,end)),hi=Math.min(1,Math.max(start,end));
      if(hi-lo<.001)continue;
      const mid=(lo+hi)/2,x=s.a[0]+dx*s.length*mid,z=s.a[1]+dz*s.length*mid;
      const gap=(other.a[0]-x)*onx+(other.a[1]-z)*onz;
      if(Math.abs(gap)<.1 || Math.abs(gap)>=(s.width+other.width)/2)continue;
      const boundary=(x,z)=>((other.a[0]-x)*onx+(other.a[1]-z)*onz)/(1+nx*onx+nz*onz);
      partners.push({lo,hi,boundary,side:Math.sign(gap)});cuts.push(lo,hi);
    }
    const sorted=[...new Set(cuts)].sort((a,b)=>a-b),bands=[];
    for(let i=1;i<sorted.length;i++) {
      const lo=sorted[i-1],hi=sorted[i];if(hi-lo<1e-8)continue;
      const active=partners.filter(p=>(lo+hi)/2>=p.lo-1e-8&&(lo+hi)/2<=p.hi+1e-8);
      const left=active.filter(p=>p.side<0),right=active.filter(p=>p.side>0);
      const point=t=>[s.a[0]+dx*s.length*t,s.a[1]+dz*s.length*t];
      bands.push({a:point(lo),b:point(hi),left:(x,z)=>Math.max(-s.width/2,...left.map(p=>p.boundary(x,z))),
        right:(x,z)=>Math.min(s.width/2,...right.map(p=>p.boundary(x,z))),leftOuter:!left.length,rightOuter:!right.length});
    }
    result.set(s,bands);
  }
  return result;
}

// Positions/UVs stay float32. Static lighting inputs need only bounded byte
// precision; Three normalizes these attributes before the shader uses them.
function compactAttribute(values, itemSize, signed = false) {
  const scale = signed ? 127 : 255;
  const output = signed ? new Int8Array(values.length) : new Uint8Array(values.length);
  for (let i = 0; i < values.length; i++) output[i] = Math.round(Math.max(signed ? -1 : 0, Math.min(1, values[i])) * scale);
  return new THREE.BufferAttribute(output, itemSize, true);
}

export function createWorldView(scene, map, { lowGraphics = false, streaming = false,
  terrainSampler = createTerrainSampler(map), rail = null, foliageTexture, openingChunks = Infinity } = {}) {
  const root = new THREE.Group();
  root.name = 'Canberra streets';
  scene.add(root);
  const bounds = map.bounds;
  const terrain = map.terrain;
  const chunks = new Map();
  // Sources contain references/primitive transforms only, never expanded vertices.
  // Eviction drops both renderer resources and the only typed-buffer references.
  const sources = new Map();
  let preparing = streaming, targetKey = null, targetBounds = null;
  const temporaryGeometry = [];
  const textures = [];
  const materials = [];
  const counters = { lowGraphics, bufferBytes: 0, buildings: 0, trees: 0, treesNearSpawn: 0, shrubs: 0, foliageTriangles: 0, windows: 0, roofFacets: 0, texturedBuildings: 0, balconies: 0, signs: 0, roadSegments: 0, triangles: 0, chunks: 0, meshes: 0 };
  const color = new THREE.Color();
  const matrix = new THREE.Matrix4();
  const normalMatrix = new THREE.Matrix3();
  const quaternion = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const vertex = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const edgeAB = new THREE.Vector3(), edgeAC = new THREE.Vector3();
  const tintCache = new Map();
  function setTint(tint) {
    if (typeof tint !== 'number') { color.set(tint); return; }
    if (!tintCache.has(tint)) tintCache.set(tint, new THREE.Color(tint));
    color.copy(tintCache.get(tint));
  }
  const opaque = new THREE.MeshLambertMaterial({ vertexColors: true });
  materials.push(opaque);
  const canopies = foliageTexture === null ? null : new THREE.MeshLambertMaterial({
    vertexColors: true, map: foliageTexture ?? null, alphaTest: .39, side: THREE.DoubleSide,
  });
  if (canopies) {
    // Cards represent a rounded leaf volume, so their baked outward normals
    // must not flip toward the camera when a card is seen from its reverse side.
    // Keep ordinary Lambert sun/hemisphere lighting, fog and alpha testing.
    canopies.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>',
        '#include <normal_fragment_begin>\nnormal *= faceDirection;\nnonPerturbedNormal = normal;');
    };
    canopies.customProgramCacheKey = () => 'capital-canopy-volume-light-v1';
    materials.push(canopies);
  }
  if (foliageTexture) textures.push(foliageTexture);
  const waterMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.3,metalness:.18});
  materials.push(waterMaterial);
  const glazing = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.16, metalness: 0 });
  materials.push(glazing);
  let roadMaterial = opaque;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = ROAD_TEXTURE_SIZE; canvas.height = ROAD_TEXTURE_SIZE;
    const context = canvas.getContext('2d');
    const pixels = context.createImageData(ROAD_TEXTURE_SIZE, ROAD_TEXTURE_SIZE);
    pixels.data.set(createRoadPixels());
    context.putImageData(pixels, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.push(texture);
    // Dry asphalt and concrete are matte: share one diffuse sample and keep
    // pavement on the same inexpensive lighting model as the opaque batch.
    roadMaterial = new THREE.MeshLambertMaterial({ map: texture, vertexColors: true });
    materials.push(roadMaterial);
  }

  let surfaceMaterial = opaque;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = SURFACE_TEXTURE_SIZE; canvas.height = SURFACE_TEXTURE_SIZE;
    const context = canvas.getContext('2d');
    const pixels = context.createImageData(SURFACE_TEXTURE_SIZE, SURFACE_TEXTURE_SIZE);
    pixels.data.set(createSurfacePixels());
    context.putImageData(pixels, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
    textures.push(texture);
    surfaceMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.92, metalness: 0, vertexColors: true });
    surfaceMaterial.onBeforeCompile = shader => {
      shader.vertexShader = 'attribute float surfaceKind; varying float vSurfaceKind;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvSurfaceKind = surfaceKind;');
      shader.fragmentShader = 'varying float vSurfaceKind;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        float surfaceIndex = floor(vSurfaceKind + 0.5);
        vec2 atlasOffset = vec2(mod(surfaceIndex, 2.0), floor(surfaceIndex / 2.0)) * 0.5;
        vec2 atlasUv = fract(vMapUv) * ${ATLAS_SPAN} + atlasOffset + ${ATLAS_INSET};
        diffuseColor *= texture2D(map, atlasUv);
      `);
    };
    surfaceMaterial.customProgramCacheKey = () => 'capital-surface-atlas-gutter-v3';
    materials.push(surfaceMaterial);
  }
  const shadowMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false });
  materials.push(shadowMaterial);

  const {heightAt,groundHeightAt:sourceGroundHeightAt,roadHeightAt,vehicleHeightAt}=terrainSampler;
  // One geometry load shares many exact terrain vertices. Never retain samples
  // between loads or cache the runtime authority exposed to the controller.
  const MAX_GROUND_SAMPLES=8192,negativeZero=Symbol('negative zero');
  let groundSampleCache=null,groundSampleCount=0;
  function groundHeightAt(x,z){
    if(!groundSampleCache)return sourceGroundHeightAt(x,z);
    const keyX=Object.is(x,-0)?negativeZero:x,keyZ=Object.is(z,-0)?negativeZero:z;
    let row=groundSampleCache.get(keyX);
    if(row?.has(keyZ))return row.get(keyZ);
    const y=sourceGroundHeightAt(x,z);
    if(groundSampleCount<MAX_GROUND_SAMPLES){
      if(!row)groundSampleCache.set(keyX,row=new Map());
      row.set(keyZ,y);groundSampleCount++;
    }
    return y;
  }

  const keyAt = (x, z) => `${Math.floor(x / CHUNK_SIZE)},${Math.floor(z / CHUNK_SIZE)}`;
  function deferSource(x, z, draw, extent) {
    if (!streaming || !preparing) { draw(); return; }
    const box = extent || [x, z, x, z];
    for (let cx = Math.floor(box[0] / CHUNK_SIZE); cx <= Math.floor(box[2] / CHUNK_SIZE); cx++) {
      for (let cz = Math.floor(box[1] / CHUNK_SIZE); cz <= Math.floor(box[3] / CHUNK_SIZE); cz++) {
        const key = `${cx},${cz}`;
        if (!sources.has(key)) sources.set(key, []);
        sources.get(key).push(draw);
      }
    }
  }
  const owns = (x, z) => !streaming || keyAt(x, z) === targetKey;
  function gridRange(origin, step, count, axis) {
    if (!targetBounds) return [0, count];
    return [Math.max(0, Math.floor((targetBounds[axis] - origin) / step)),
      Math.min(count, Math.ceil((targetBounds[axis + 2] - origin) / step))];
  }

  function chunkAt(x, z) {
    const cx = Math.floor(x / CHUNK_SIZE), cz = Math.floor(z / CHUNK_SIZE);
    const key = `${cx},${cz}`;
    if (!chunks.has(key)) {
      const group = new THREE.Group();
      group.name = `District ${key}`;
      root.add(group);
      chunks.set(key, { group, x: (cx + 0.5) * CHUNK_SIZE, z: (cz + 0.5) * CHUNK_SIZE, batches: new Map() });
    }
    return chunks.get(key);
  }

  function batchAt(x, z, kind = 'solid') {
    if (streaming && !owns(x, z)) return null;
    const chunk = chunkAt(x, z);
    if (!chunk.batches.has(kind)) chunk.batches.set(kind, { positions: [], normals: [], colors: [], uvs: [], kinds: [], indices: kind === 'canopy' ? [] : null });
    return chunk.batches.get(kind);
  }

  const roundedA = [0, 0, 0], roundedB = [0, 0, 0], roundedC = [0, 0, 0];
  function triangle(batch, a, b, c, tint, uv) {
    if (!batch) return;
    edgeAB.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    edgeAC.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
    normal.crossVectors(edgeAB, edgeAC);
    const intendedX = normal.x, intendedY = normal.y, intendedZ = normal.z;
    // World coordinates are uploaded as float32. Thin source roof facets can
    // collapse or reverse at that precision, so validate the submitted face.
    for (let i = 0; i < 3; i++) {
      roundedA[i] = Math.fround(a[i]); roundedB[i] = Math.fround(b[i]); roundedC[i] = Math.fround(c[i]);
    }
    a = roundedA; b = roundedB; c = roundedC;
    edgeAB.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    edgeAC.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
    normal.crossVectors(edgeAB, edgeAC);
    if (normal.lengthSq() === 0) return false;
    if (normal.x * intendedX + normal.y * intendedY + normal.z * intendedZ < 0) {
      [b, c] = [c, b];
      normal.negate();
      if (uv) uv = [...uv.slice(0, 2), ...uv.slice(4, 6), ...uv.slice(2, 4)];
    }
    normal.normalize();
    setTint(tint);
    for (const p of [a, b, c]) {
      batch.positions.push(...p);
      batch.normals.push(normal.x, normal.y, normal.z);
      batch.colors.push(color.r, color.g, color.b);
    }
    if (uv) batch.uvs.push(...uv);
    counters.triangles++;
    return true;
  }

  function quad(batch, a, b, c, d, tint, uv) {
    triangle(batch, a, b, c, tint, uv ? [...uv[0], ...uv[1], ...uv[2]] : null);
    triangle(batch, a, c, d, tint, uv ? [...uv[0], ...uv[2], ...uv[3]] : null);
  }

  function surfaceTriangle(x, z, a, b, c, tint, kind, uv) {
    const batch = batchAt(x, z, 'surface');
    if (!batch) return;
    if (!triangle(batch, a, b, c, tint, uv || [a[0] / 3, a[2] / 3, b[0] / 3, b[2] / 3, c[0] / 3, c[2] / 3])) return false;
    batch.kinds.push(kind, kind, kind);
    return true;
  }
  function softShadow(x, z, rx, rz, strength = 0.12) {
    if (lowGraphics) return;
    if (preparing) { deferSource(x, z, () => softShadow(x, z, rx, rz, strength)); return; }
    const batch = batchAt(x, z, 'shadow');
    if (!batch) return;
    for (let i = 0; i < 10; i++) {
      const points = [[x, z], [x + Math.cos(i / 10 * Math.PI * 2) * rx, z + Math.sin(i / 10 * Math.PI * 2) * rz],
        [x + Math.cos((i + 1) / 10 * Math.PI * 2) * rx, z + Math.sin((i + 1) / 10 * Math.PI * 2) * rz]];
      for (let j = 2; j >= 0; j--) {
        const p = points[j]; batch.positions.push(p[0], heightAt(...p) + 0.028, p[1]); batch.normals.push(0, 1, 0);
        batch.colors.push(0.12, 0.14, 0.1, j === 0 ? strength : 0);
      }
      counters.triangles++;
    }
  }

  function primitive(geometry, x, y, z, sx, sy, sz, tint, yaw = 0, kind = 'solid') {
    if (preparing) { deferSource(x, z, () => primitive(geometry, x, y, z, sx, sy, sz, tint, yaw, kind)); return; }
    const batch = batchAt(x, z, kind);
    if (!batch) return;
    position.set(x, y, z);
    scale.set(sx, sy, sz);
    quaternion.setFromAxisAngle(up, yaw);
    matrix.compose(position, quaternion, scale);
    normalMatrix.getNormalMatrix(matrix);
    const p = geometry.attributes.position;
    const n = geometry.attributes.normal;
    const uv = geometry.attributes.uv;
    const shades = geometry.attributes.color;
    if (kind === 'canopy') {
      const offset = batch.positions.length / 3;
      for (const index of geometry.index.array) batch.indices.push(offset + index);
    }
    setTint(tint);
    for (let i = 0; i < p.count; i++) {
      vertex.fromBufferAttribute(p, i).applyMatrix4(matrix);
      normal.fromBufferAttribute(n, i).applyMatrix3(normalMatrix).normalize();
      batch.positions.push(vertex.x, vertex.y, vertex.z);
      batch.normals.push(normal.x, normal.y, normal.z);
      const shade = shades ? shades.getX(i) : 1;
      batch.colors.push(color.r * shade, color.g * shade, color.b * shade);
      if (kind === 'canopy') batch.uvs.push(uv.getX(i), uv.getY(i));
    }
    counters.triangles += (geometry.index?.count ?? p.count) / 3;
  }

  function geometry(source) {
    const result = source.index ? source.toNonIndexed() : source;
    if (source !== result) source.dispose();
    temporaryGeometry.push(result);
    return result;
  }
  function smoothGeometry(vertices, indices) {
    const shape = new THREE.BufferGeometry();
    shape.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    shape.setIndex(indices);
    shape.computeVertexNormals();
    return geometry(shape);
  }
  function branchedTrunk(gum) {
    const vertices = [], indices = [], shades = [];
    function tube(sides, rings) {
      const first = vertices.length / 3;
      for (const [x, y, z, radius, shade] of rings) for (let side = 0; side < sides; side++) {
        const angle = (side + .35) * Math.PI * 2 / sides;
        vertices.push(x + Math.cos(angle) * radius, y, z + Math.sin(angle) * radius);
        shades.push(shade - (side % 3) * .045, 1, 1);
      }
      for (let ring = 0; ring < rings.length - 1; ring++) for (let side = 0; side < sides; side++) {
        const a = first + ring * sides + side, b = first + ring * sides + (side + 1) % sides;
        indices.push(a, a + sides, b, b, a + sides, b + sides);
      }
    }
    const shoulder = gum ? .035 : -.015;
    tube(lowGraphics ? 4 : 6, [[0,-.014,0,.03,.62], [shoulder,.46,.014,.0145,.91], [shoulder+.022,.91,-.04,.0028,.93]]);
    tube(3, [[shoulder,.49,.012,.012,.91], [-.24,.75,.074,.002,.95]]);
    tube(3, [[shoulder+.007,.57,-.006,.013,.89], [.25,.8,-.073,.002,.96]]);
    if (!lowGraphics) tube(3, [[shoulder,.62,-.015,.008,.87], [-.014,.86,-.23,.0018,.90]]);
    const shape = new THREE.BufferGeometry();
    shape.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    shape.setAttribute('color', new THREE.Float32BufferAttribute(shades, 3));
    shape.setIndex(indices);
    shape.computeVertexNormals();
    return geometry(shape);
  }
  function canopyGeometry(gum) {
    const vertices = [], normals = [], shades = [], uvs = [], indices = [];
    const clumps = gum ? [
      [-.205,.728,.08,.56,.34,1], [.236,.763,-.068,.55,.37,0], [.038,.91,-.025,.58,.35,0],
      [-.02,.822,-.21,.43,.32,1],
    ] : [
      [-.205,.716,.075,.57,.41,2], [.226,.742,-.075,.63,.44,3], [.018,.885,-.029,.68,.47,2],
      [-.036,.772,-.20,.59,.42,3],
    ];
    function leafCard([x,y,z,width,height,tile], yaw, pitch) {
      const first = vertices.length / 3;
      const rx = Math.cos(yaw) * width / 2, rz = Math.sin(yaw) * width / 2;
      const ux = Math.sin(yaw) * Math.sin(pitch) * height / 2;
      const uy = Math.cos(pitch) * height / 2, uz = -Math.cos(yaw) * Math.sin(pitch) * height / 2;
      for (const [right, up] of [[-1,-1],[1,-1],[1,1],[-1,1]]) {
        const vx = x + right*rx + up*ux, vy = y + up*uy, vz = z + right*rz + up*uz;
        vertices.push(vx, vy, vz);
        // Rounded clump normals provide a lit upper rim and a shaded underside
        // instead of nine unrelated, flat billboard lighting planes.
        normal.set((vx-x)/width + vx*.45, .26 + (vy-y)/height + (vy-.78)*.48,
          (vz-z)/width + vz*.45).normalize();
        normals.push(normal.x, normal.y, normal.z);
        const shade = Math.max(.62, Math.min(1, .66 + (up+1)*.14 + (y-.7)*.23));
        shades.push(shade, shade, shade);
      }
      const u = (tile % 2) / 2, v = tile < 2 ? .5 : 0;
      const inset = 2 / 512, right = u + .5 - inset, top = v + .5 - inset;
      uvs.push(u + inset,v + inset, right,v + inset, right,top, u + inset,top);
      indices.push(first,first+1,first+2, first,first+2,first+3);
    }
    clumps.forEach((clump, i) => {
      leafCard(clump, i * 1.63, i % 2 ? .21 : -.34);
      leafCard(clump, i * 1.63 + 1.49, i % 2 ? -.37 : .48);
    });
    // The angled upper card keeps a crown visible from bridges and aircraft.
    leafCard(clumps[2], .58, 1.30);
    const shape = new THREE.BufferGeometry();
    shape.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    shape.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    shape.setAttribute('color', new THREE.Float32BufferAttribute(shades, 3));
    shape.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    shape.setIndex(indices);
    temporaryGeometry.push(shape);
    return shape;
  }
  function patchyCrown(lobes) {
    const vertices = [], indices = [], shades = [];
    const irregularity = [1.05, .8, .98, 1.16, .86, 1.02, .85, 1.14, .96, .81];
    const rimHeights = [.08, -.16, .04, .21, -.08, .14, -.11, .06, .18, -.14];
    for (const { x, y, z, width, height, depth, sides, yaw } of lobes) {
      const first = vertices.length / 3;
      for (let i = 0; i < sides; i++) {
        const angle = yaw + i * Math.PI * 2 / sides, radius = irregularity[i];
        vertices.push(x + Math.cos(angle) * width * radius, y + height * rimHeights[i], z + Math.sin(angle) * depth * radius);
        const shade = .8 + rimHeights[i]*.2;
        shades.push(shade, shade, shade);
      }
      const top = first + sides, bottom = top + 1;
      vertices.push(x + width * .19, y + height * .99, z - depth * .12, x - width * .14, y - height * .79, z + depth * .13);
      shades.push(1,1,1, .62,.62,.62);
      for (let i = 0; i < sides; i++) {
        const a = first + i, b = first + (i + 1) % sides;
        indices.push(top, b, a, bottom, a, b);
      }
    }
    const result = smoothGeometry(vertices, indices);
    // smoothGeometry expands the index; retain the matching per-vertex shade.
    result.setAttribute('color', new THREE.Float32BufferAttribute(indices.flatMap(i => shades.slice(i*3,i*3+3)), 3));
    return result;
  }
  const box = geometry(new THREE.BoxGeometry(1, 1, 1));
  const trunk = geometry(new THREE.CylinderGeometry(0.65, 1, 1, 5));
  const crown = geometry(new THREE.IcosahedronGeometry(1, 0));
  const fallbackCrown = canopies ? null : geometry(new THREE.IcosahedronGeometry(1, 0));
  if (fallbackCrown) {
    const points = fallbackCrown.attributes.position, shades = [];
    for (let i=0;i<points.count;i++) {
      const shade = .62 + (points.getY(i)+1)*.19;
      shades.push(shade,shade,shade);
    }
    fallbackCrown.setAttribute('color', new THREE.Float32BufferAttribute(shades,3));
  }
  const gumTrunk = branchedTrunk(true), streetTrunk = branchedTrunk(false);
  const gumCrown = canopies && canopyGeometry(true), streetCrown = canopies && canopyGeometry(false);
  const shrubCrown = patchyCrown([{ x: 0, y: 0, z: 0, width: 1, height: 1, depth: 1, sides: 6, yaw: .14 }]);

  function hash(n) {
    const a = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return a - Math.floor(a);
  }

  function groundPolygon(area, tint, lift = 0.018) {
    const openRing=ring=>ring.length>1&&ring[0][0]===ring.at(-1)[0]&&ring[0][1]===ring.at(-1)[1]?ring.slice(0,-1):ring;
    const points=area.points&&openRing(area.points);
    if(!points||points.length<3)return;
    const lake=area.id==='osm-relation-3400115-0';
    const level=lake?(map.lakeWaterLevel??5.93):Number.isFinite(area.surfaceY)?area.surfaceY:Math.min(...points.map(p=>groundHeightAt(...p)))+lift;
    const rings=(area.innerRings||[]).map(r=>openRing(r.points||r)).filter(r=>r.length>=3);
    const flat=[...points,...rings.flat()];
    const faces=THREE.ShapeUtils.triangulateShape(points.map(p=>new THREE.Vector2(...p)),rings.map(r=>r.map(p=>new THREE.Vector2(...p))));
    function tile(a,b,c,depth=0){
      if (targetBounds && (Math.max(a[0],b[0],c[0]) < targetBounds[0] || Math.min(a[0],b[0],c[0]) >= targetBounds[2] || Math.max(a[1],b[1],c[1]) < targetBounds[1] || Math.min(a[1],b[1],c[1]) >= targetBounds[3])) return;
      const edges=[[a,b,c],[b,c,a],[c,a,b]].sort((u,v)=>Math.hypot(v[0][0]-v[1][0],v[0][1]-v[1][1])-Math.hypot(u[0][0]-u[1][0],u[0][1]-u[1][1]));
      const [p,q,r]=edges[0];
      if(depth<10&&Math.hypot(p[0]-q[0],p[1]-q[1])>180){const mid=[(p[0]+q[0])/2,(p[1]+q[1])/2];tile(p,mid,r,depth+1);tile(mid,q,r,depth+1);return;}
      const vertices=[a,b,c].map(p=>[p[0],level,p[1]]);
      if((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])>0)vertices.reverse();
      const x=(a[0]+b[0]+c[0])/3,z=(a[1]+b[1]+c[1])/3;
      triangle(batchAt(x,z,'water'),...vertices,tint);
    }
    for(const face of faces)tile(...face.map(i=>flat[i]));
  }

  // Visual floor correction only: the source DEM, roads and collision sampler
  // remain authoritative. Fixed regional water planes are not bathymetry.
  const waterFloors=(map.areas||[]).filter(a=>a.id!=='osm-relation-3400115-0'&&/water|lake|basin/.test(a.type)&&Number.isFinite(a.surfaceY)&&a.points?.length>=3).map(a=>({
    level:a.surfaceY, outer:prepareWaterRing(a.points), holes:(a.innerRings||[]).map(r=>prepareWaterRing(r.points||r)),
    minX:Math.min(...a.points.map(p=>p[0])),maxX:Math.max(...a.points.map(p=>p[0])),
    minZ:Math.min(...a.points.map(p=>p[1])),maxZ:Math.max(...a.points.map(p=>p[1])),
  }));
  const inWaterFloor=(w,x,z)=>w.outer.contains(x,z)&&!w.holes.some(h=>h.contains(x,z));
  // Only boundary cells refine: at most 32 subdivisions per axis, targeting 3m.
  const waterGroundStep=3,waterGroundMaxDepth=5;

  // Match bilinear terrain cells away from explicit water floors. Shoreline
  // refinement bounds the narrow transition between source land and visual floor.
  function terrainTile(x, z, dx, dz, depth=0) {
    const water=waterFloors.filter(w=>x+dx>=w.minX&&x<=w.maxX&&z+dz>=w.minZ&&z<=w.maxZ);
    if(depth<waterGroundMaxDepth&&Math.max(dx,dz)>waterGroundStep&&water.some(w=>{
      const samples=[[x,z],[x+dx,z],[x,z+dz],[x+dx,z+dz],[x+dx/2,z+dz/2]];
      if(!samples.some(p=>groundHeightAt(...p)-.18>w.level-.3))return false;
      const radius=Math.hypot(dx,dz)/2,px=x+dx/2,pz=z+dz/2;
      return [w.outer,...w.holes].some(r=>{const contact=r.contact(px,pz,radius);return contact&&contact.depth<2*radius;});
    })){
      for(let j=0;j<2;j++)for(let i=0;i<2;i++)terrainTile(x+i*dx/2,z+j*dz/2,dx/2,dz/2,depth+1);
      return;
    }
    const shade = new THREE.Color(COLORS.grass).multiplyScalar(0.98 + hash(x + z * 0.3) * 0.04);
    const point = (px, pz) => {
      let y=groundHeightAt(px,pz)-.18;
      for(const w of water)if(inWaterFloor(w,px,pz))y=Math.min(y,w.level-.3);
      return [px,y,pz];
    };
    const a = point(x, z), b = point(x, z + dz), c = point(x + dx, z + dz), d = point(x + dx, z);
    surfaceTriangle(x, z, a, b, c, shade, 3); surfaceTriangle(x, z, a, c, d, shade, 3);
  }
  // Coarse extension cells need the same bilinear-to-triangle error control as
  // the base grid. Keep fine source tiles byte-identical and cap mountain work.
  function extensionTerrainTile(x,z,dx,dz) {
    if(Math.max(dx,dz)<=28){terrainTile(x,z,dx,dz);return;}
    const mixed=Math.abs(groundHeightAt(x,z)+groundHeightAt(x+dx,z+dz)-groundHeightAt(x+dx,z)-groundHeightAt(x,z+dz));
    const divisions=Math.min(8,Math.max(2,Math.ceil(Math.sqrt(mixed/.28))));
    for(let j=0;j<divisions;j++)for(let i=0;i<divisions;i++)terrainTile(x+i*dx/divisions,z+j*dz/divisions,dx/divisions,dz/divisions);
  }
  function drawTerrain() {
    if (terrain?.cols > 1 && terrain?.rows > 1) {
      const dx = (terrain.maxX - terrain.minX) / (terrain.cols - 1);
      const dz = (terrain.maxZ - terrain.minZ) / (terrain.rows - 1);
      const [ix0, ix1] = gridRange(terrain.minX, dx, terrain.cols - 1, 0);
      const [iz0, iz1] = gridRange(terrain.minZ, dz, terrain.rows - 1, 1);
      for (let iz = iz0; iz < iz1; iz++) for (let ix = ix0; ix < ix1; ix++) {
        const x = terrain.minX + ix * dx, z = terrain.minZ + iz * dz;
        const mixed = Math.abs(groundHeightAt(x, z) + groundHeightAt(x + dx, z + dz) - groundHeightAt(x + dx, z) - groundHeightAt(x, z + dz));
        const divisions = Math.max(Math.max(dx, dz) > 28 ? 2 : 1, Math.ceil(Math.sqrt(mixed / 0.28)));
        for (let j = 0; j < divisions; j++) for (let i = 0; i < divisions; i++) terrainTile(x + i * dx / divisions, z + j * dz / divisions, dx / divisions, dz / divisions);
      }
    } else {
      const [ix0, ix1] = gridRange(bounds.minX, 35, Math.ceil((bounds.maxX - bounds.minX) / 35), 0);
      const [iz0, iz1] = gridRange(bounds.minZ, 35, Math.ceil((bounds.maxZ - bounds.minZ) / 35), 1);
      for (let iz = iz0; iz < iz1; iz++) for (let ix = ix0; ix < ix1; ix++) terrainTile(bounds.minX + ix * 35, bounds.minZ + iz * 35, 35, 35);
    }
    const earlierTerrain=terrain?[terrain]:[];
    for(const tile of map.terrainTiles||[]){
      // Regional grids are lower-priority overlays. Subtract earlier source
      // rectangles before tessellation; keep legacy tile geometry unchanged.
      const occluders=tile.gridSha256?earlierTerrain.filter(r=>r.minX<tile.maxX&&r.maxX>tile.minX&&r.minZ<tile.maxZ&&r.maxZ>tile.minZ):null;
      earlierTerrain.push(tile);
      const dx=(tile.maxX-tile.minX)/(tile.cols-1),dz=(tile.maxZ-tile.minZ)/(tile.rows-1);
      const [ix0, ix1] = gridRange(tile.minX, dx, tile.cols - 1, 0);
      const [iz0, iz1] = gridRange(tile.minZ, dz, tile.rows - 1, 1);
      for(let iz=iz0;iz<iz1;iz++)for(let ix=ix0;ix<ix1;ix++){
        const x=tile.minX+ix*dx,z=tile.minZ+iz*dz;
        if(occluders){
          let pieces=[[x,z,x+dx,z+dz]];
          for(const r of occluders){
            const next=[];
            for(const [a,b,c,d] of pieces){
              if(c<=r.minX||a>=r.maxX||d<=r.minZ||b>=r.maxZ){next.push([a,b,c,d]);continue;}
              const lo=Math.max(a,r.minX),hi=Math.min(c,r.maxX);
              if(lo>a)next.push([a,b,lo,d]);
              if(hi<c)next.push([hi,b,c,d]);
              if(b<r.minZ)next.push([lo,b,hi,Math.min(d,r.minZ)]);
              if(d>r.maxZ)next.push([lo,Math.max(b,r.maxZ),hi,d]);
            }
            pieces=next;if(!pieces.length)break;
          }
          for(const [a,b,c,d] of pieces)if(c-a>1e-8&&d-b>1e-8)extensionTerrainTile(a,b,c-a,d-b);
          continue;
        }
        if(!terrain){extensionTerrainTile(x,z,dx,dz);continue;}
        // Draw the cell outside the complete base rectangle. Left/right bands
        // own the corners; north/south strips use only the overlapping x span.
        // This retains the original north cells and also supports east tiles.
        const endX=x+dx,endZ=z+dz;
        const left=Math.min(endX,terrain.minX),right=Math.max(x,terrain.maxX);
        if(left-x>1e-8)extensionTerrainTile(x,z,left-x,dz);
        if(endX-right>1e-8)extensionTerrainTile(right,z,endX-right,dz);
        const middleX=Math.max(x,terrain.minX),middleEnd=Math.min(endX,terrain.maxX);
        if(middleEnd-middleX<=1e-8)continue;
        const middleWidth=middleX===x&&middleEnd===endX?dx:middleEnd-middleX;
        const northEnd=Math.min(endZ,terrain.minZ),southStart=Math.max(z,terrain.maxZ);
        if(northEnd-z>1e-8)extensionTerrainTile(middleX,z,middleWidth,northEnd-z);
        if(endZ-southStart>1e-8)extensionTerrainTile(middleX,southStart,middleWidth,endZ-southStart);
      }
    }
    const [outerX0, outerX1] = gridRange(bounds.minX - 245, 35, Math.ceil((bounds.maxX - bounds.minX + 490) / 35), 0);
    const [outerZ0, outerZ1] = gridRange(bounds.minZ - 245, 35, Math.ceil((bounds.maxZ - bounds.minZ + 490) / 35), 1);
    for (let iz = outerZ0; iz < outerZ1; iz++) for (let ix = outerX0; ix < outerX1; ix++) {
      const x = bounds.minX - 245 + ix * 35, z = bounds.minZ - 245 + iz * 35;
      if (x < bounds.minX || z < bounds.minZ || x >= bounds.maxX || z >= bounds.maxZ) terrainTile(x, z, 35, 35);
    }
  }
  if (!streaming) drawTerrain();
  // Grass polygons cannot be draped with boundary-only triangles on a hill.
  // Terrain already supplies grass; reserve overlays for the water itself.
  for (const area of map.areas || []) if (/water|lake|basin/.test(area.type) && area.points?.length) {
    const p = area.points, xs = p.map(v => v[0]), zs = p.map(v => v[1]);
    deferSource(p[0][0], p[0][1], () => groundPolygon(area, 0x547b82, -0.12), [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)]);
  }

  // Spatial indices keep avenue placement linear in the size of the map.
  const roadCells = new Map(), buildingCells = new Map();
  const roadSegments = [];
  function indexBounds(index, item, minX, minZ, maxX, maxZ) {
    for (let x = Math.floor(minX / CELL_SIZE); x <= Math.floor(maxX / CELL_SIZE); x++) {
      for (let z = Math.floor(minZ / CELL_SIZE); z <= Math.floor(maxZ / CELL_SIZE); z++) {
        const key = `${x},${z}`;
        if (!index.has(key)) index.set(key, []);
        index.get(key).push(item);
      }
    }
  }
  const nearby = (index, x, z) => index.get(`${Math.floor(x / CELL_SIZE)},${Math.floor(z / CELL_SIZE)}`) || [];
  function segmentDistance(x, z, a, b) {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const t = THREE.MathUtils.clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
  }
  function inside(x, z, points) {
    let contained = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i], b = points[j];
      if (((a[1] > z) !== (b[1] > z)) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) contained = !contained;
    }
    return contained;
  }
  for (const building of map.buildings || []) {
    const points = building.points;
    if (!points?.length) continue;
    indexBounds(buildingCells, building, Math.min(...points.map(p => p[0])) - 3, Math.min(...points.map(p => p[1])) - 3,
      Math.max(...points.map(p => p[0])) + 3, Math.max(...points.map(p => p[1])) + 3);
  }

  const nodes = new Map();
  for (const road of map.roads || []) {
    const profile = roadProfile(road), width = profile.driveWidth;
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length < 0.2) continue;
      const segment = { a, b, road, width, length, profile };
      roadSegments.push(segment);
      indexBounds(roadCells, segment, Math.min(a[0], b[0]) - width - 5, Math.min(a[1], b[1]) - width - 5,
        Math.max(a[0], b[0]) + width + 5, Math.max(a[1], b[1]) + width + 5);
    }
    for (const p of road.points) {
      const key = `${Math.round(p[0] / 3)},${Math.round(p[1] / 3)}`;
      if (!nodes.has(key)) nodes.set(key, { x: p[0], z: p[1], roads: new Map(), width });
      nodes.get(key).roads.set(road.name || road.id, road);
      nodes.get(key).width = Math.max(nodes.get(key).width, width);
    }
  }

  const bridgeBands=lakeBridgeRoadBands(roadSegments);
  const bridgeBandRoads=new Set([...bridgeBands.keys()].map(s=>s.road));
  const deckRoadIds=new Set(terrainSampler.bridgeSegments?.map(segment=>segment.roadId));

  // Subdivide only where a road triangle would cut through a bilinear hill.
  function drapedTriangle(batch, a, b, c, tint, lift, sampleHeight = heightAt, depth = 0) {
    const middle = (p, q) => {
      const x = (p[0] + q[0]) / 2, z = (p[2] + q[2]) / 2;
      return [x, sampleHeight(x, z) + lift, z];
    };
    const ab = middle(a, b), bc = middle(b, c), ca = middle(c, a);
    const x = (a[0] + b[0] + c[0]) / 3, z = (a[2] + b[2] + c[2]) / 3;
    const error = Math.max(Math.abs(ab[1] - (a[1] + b[1]) / 2), Math.abs(bc[1] - (b[1] + c[1]) / 2),
      Math.abs(ca[1] - (c[1] + a[1]) / 2), Math.abs(sampleHeight(x, z) + lift - (a[1] + b[1] + c[1]) / 3));
    if (depth < 4 && error > 0.045) {
      drapedTriangle(batch, a, ab, ca, tint, lift, sampleHeight, depth + 1);
      drapedTriangle(batch, ab, b, bc, tint, lift, sampleHeight, depth + 1);
      drapedTriangle(batch, ca, bc, c, tint, lift, sampleHeight, depth + 1);
      drapedTriangle(batch, ab, bc, ca, tint, lift, sampleHeight, depth + 1);
    } else triangle(batch, a, b, c, tint);
  }

  function ribbon(a, b, left, right, tint, lift, road, underside = false) {
    const sampleHeight = road ? (x,z)=>roadHeightAt(road,x,z) : heightAt;
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < 0.1) return;
    const nx = -(b[1] - a[1]) / length, nz = (b[0] - a[0]) / length;
    const pieces = Math.max(1, Math.ceil(length / 12));
    for (let i = 0; i < pieces; i++) {
      const t0 = i / pieces, t1 = (i + 1) / pieces;
      const x0 = THREE.MathUtils.lerp(a[0], b[0], t0), z0 = THREE.MathUtils.lerp(a[1], b[1], t0);
      const x1 = THREE.MathUtils.lerp(a[0], b[0], t1), z1 = THREE.MathUtils.lerp(a[1], b[1], t1);
      const p = (x, z, offset) => {
        const d=typeof offset==='function'?offset(x,z):offset;
        return [x + nx * d, sampleHeight(x + nx * d, z + nz * d) + lift, z + nz * d];
      };
      const batch = batchAt(x0, z0, underside ? 'solid' : tint === COLORS.asphalt ? 'road' : 'pavement');
      if (!batch) continue;
      const pa = p(x0, z0, right), pb = p(x1, z1, right), pc = p(x1, z1, left), pd = p(x0, z0, left);
      if (underside) {
        drapedTriangle(batch, pa, pc, pb, tint, lift, sampleHeight);
        drapedTriangle(batch, pa, pd, pc, tint, lift, sampleHeight);
      } else {
        drapedTriangle(batch, pa, pb, pc, tint, lift, sampleHeight);
        drapedTriangle(batch, pa, pc, pd, tint, lift, sampleHeight);
      }
    }
  }

  function drawBridgeBody(segment, left, right, leftOuter, rightOuter) {
    const { a, b, length, road, profile } = segment;
    const edges = bridgeDeckEdges(road, profile);
    const leftEdge = leftOuter ? () => edges.left : left;
    const rightEdge = rightOuter ? () => edges.right : right;
    // The concrete soffit is also the underside used by overhead cover.
    ribbon(a, b, leftEdge, rightEdge, 0x9b998a, BRIDGE_DECK_BOTTOM, road, true);
    if (isLakeBridgeRoad(road)) return; // The civic parapet supplies the outer fascia.
    const nx = -(b[1] - a[1]) / length, nz = (b[0] - a[0]) / length;
    const pieces = Math.max(1, Math.ceil(length / 12));
    for (const [outside, edge, isLeft] of [[leftOuter, leftEdge, true], [rightOuter, rightEdge, false]]) {
      if (!outside) continue;
      function point(fraction) {
        const x = THREE.MathUtils.lerp(a[0], b[0], fraction), z = THREE.MathUtils.lerp(a[1], b[1], fraction);
        const offset = edge(x, z), px = x + nx * offset, pz = z + nz * offset;
        return [px, roadHeightAt(road, px, pz), pz];
      }
      for (let i = 0; i < pieces; i++) {
        const [ax, ay, az] = point(i / pieces), [bx, by, bz] = point((i + 1) / pieces);
        const batch = batchAt(THREE.MathUtils.lerp(a[0], b[0], i / pieces), THREE.MathUtils.lerp(a[1], b[1], i / pieces));
        if (!batch) continue;
        const top = (isLeft ? profile.sidewalkLeft : profile.sidewalkRight) ? .045 : profile.hasKerb ? .065 : BRIDGE_DECK_TOP;
        const wall = [[ax, ay + BRIDGE_DECK_BOTTOM, az], [bx, by + BRIDGE_DECK_BOTTOM, bz], [bx, by + top, bz], [ax, ay + top, az]];
        if (isLeft) wall.reverse();
        quad(batch, ...wall, 0xa9a79a);
      }
    }
  }
  function drawRoad(s,band=null) {
    if(band)s={...s,a:band.a,b:band.b,length:Math.hypot(band.b[0]-band.a[0],band.b[1]-band.a[1])};
    const roadRibbon=(...args)=>ribbon(...args,s.road);
    const half = s.width / 2;
    const left=band?.left||(()=>-half),right=band?.right||(()=>half);
    const at=(fraction,offset=0)=>(x,z)=>left(x,z)+(right(x,z)-left(x,z))*fraction+offset;
    if (deckRoadIds.has(s.road.id)) drawBridgeBody(s,left,right,band?.leftOuter!==false,band?.rightOuter!==false);
    // Side strips avoid hidden duplicate pavement under the entire carriageway.
    const residentialPath = s.road.type === 'residential';
    const pathWidth = s.profile.pavementWidth;
    const kerbWidth = s.profile.hasKerb ? 0.18 : 0;
    if (pathWidth > 0) {
      if (s.profile.sidewalkLeft&&band?.leftOuter!==false) roadRibbon(s.a, s.b, -half - kerbWidth - pathWidth, -half - kerbWidth, residentialPath ? 0xb7b59c : COLORS.path, 0.045);
      if (s.profile.sidewalkRight&&band?.rightOuter!==false) roadRibbon(s.a, s.b, half + kerbWidth, half + kerbWidth + pathWidth, COLORS.path, 0.045);
    }
    if (kerbWidth) {
      if(band?.leftOuter!==false)roadRibbon(s.a, s.b, -half - kerbWidth, -half, COLORS.kerb, 0.065);
      if(band?.rightOuter!==false)roadRibbon(s.a, s.b, half, half + kerbWidth, COLORS.kerb, 0.065);
    }
    roadRibbon(s.a, s.b, left, right, COLORS.asphalt, BRIDGE_DECK_TOP);
    const marked = s.profile.markings;
    const schoolAnchor = (map.landmarks || []).find(l => l.id === 'telopea');
    const schoolApproach = schoolAnchor && /New South Wales Crescent/i.test(s.road.name || '') && Math.hypot((s.a[0] + s.b[0]) / 2 - schoolAnchor.x, (s.a[1] + s.b[1]) / 2 - schoolAnchor.z) < 350;
    if (marked && schoolApproach) {
      roadRibbon(s.a, s.b, -0.2, -0.09, COLORS.paint, 0.105);
      roadRibbon(s.a, s.b, 0.09, 0.2, COLORS.paint, 0.105);
    } else if (marked) {
      const dx = (s.b[0] - s.a[0]) / s.length, dz = (s.b[1] - s.a[1]) / s.length;
      const offsets = roadMarkingOffsets(s.road, s.profile);
      for (const offset of offsets) for (let d = 8; d < s.length - 6; d += 12) {
        const fraction=(offset+half)/s.width;
        roadRibbon([s.a[0] + dx * d, s.a[1] + dz * d], [s.a[0] + dx * Math.min(d + 3, s.length - 6), s.a[1] + dz * Math.min(d + 3, s.length - 6)], band?at(fraction,-.065):offset - .065, band?at(fraction,.065):offset + .065, COLORS.paint, 0.105);
      }
      if (s.profile.major) for (const side of [-1, 1]) roadRibbon(s.a, s.b, band?at(side<0?0:1,-side*.25-.06):side * (half - .25) - .06, band?at(side<0?0:1,-side*.25+.06):side * (half - .25) + .06, COLORS.paint, .105);
    }
    counters.roadSegments++;
  }
  for (const s of roadSegments) {
    const margin = s.width + s.profile.pavementWidth + 6;
    deferSource(s.a[0], s.a[1], () => {
      const bands=bridgeBands.get(s);
      if(bands)for(const band of bands)drawRoad(s,band);else drawRoad(s);
    }, [Math.min(s.a[0],s.b[0])-margin, Math.min(s.a[1],s.b[1])-margin, Math.max(s.a[0],s.b[0])+margin, Math.max(s.a[1],s.b[1])+margin]);
  }

  function nodeSurfaces(node) {
    const surfaces=[];
    for(const road of node.roads.values()) {
      // Straight source lake spans already meet at their shared ribbon ends.
      // Circular aprons would cover the ownership seam and duplicate its skin.
      if(bridgeBandRoads.has(road))continue;
      const y=roadHeightAt(road,node.x,node.z),width=roadProfile(road).driveWidth;
      const previous=surfaces.find(item=>Math.abs(item.y-y)<.02);
      if(!previous)surfaces.push({road,y,width});
      else if(width>previous.width)Object.assign(previous,{road,y,width});
    }
    return surfaces.map(item=>item.road);
  }
  // A small apron joins consecutive road segments at every bend, including
  // nodes on a single named way, rather than only named intersections.
  for (const node of nodes.values()) {
    deferSource(node.x, node.z, () => {
      for (const road of nodeSurfaces(node)) {
      const sampleHeight=(x,z)=>roadHeightAt(road,x,z);
      const radius = roadProfile(road).driveWidth / 2;
      const batch = batchAt(node.x, node.z, 'road');
      for (let i = 0; i < 10; i++) {
        const p = a => [node.x + Math.cos(a) * radius, sampleHeight(node.x + Math.cos(a) * radius, node.z + Math.sin(a) * radius) + 0.09, node.z + Math.sin(a) * radius];
        drapedTriangle(batch, [node.x, sampleHeight(node.x, node.z) + 0.09, node.z], p((i + 1) / 10 * Math.PI * 2), p(i / 10 * Math.PI * 2), COLORS.asphalt, 0.09, sampleHeight);
      }
      }
    });
  }
  const intersections = [...nodes.values()].filter(n => n.roads.size > 1);
  // Keep junction fill inside the widest participating carriageway; enlarged
  // discs used to turn small access junctions into broad asphalt plazas.
  for (const node of intersections) {
    deferSource(node.x, node.z, () => {
      for (const road of nodeSurfaces(node)) {
      const sampleHeight=(x,z)=>roadHeightAt(road,x,z);
      const radius = roadProfile(road).driveWidth / 2;
      const batch = batchAt(node.x, node.z, 'road');
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2, b = (i + 1) / 12 * Math.PI * 2;
        const p = angle => [node.x + Math.cos(angle) * radius, sampleHeight(node.x + Math.cos(angle) * radius, node.z + Math.sin(angle) * radius) + 0.115, node.z + Math.sin(angle) * radius];
        drapedTriangle(batch, [node.x, sampleHeight(node.x, node.z) + 0.115, node.z], p(b), p(a), COLORS.asphalt, 0.115, sampleHeight);
      }
      }
    });
  }

  for (const anchor of (map.landmarks || []).filter(l => /^(manuka|kingston)$/.test(l.id))) {
    const node = intersections.filter(n => n.width >= 7 && Math.hypot(n.x - anchor.x, n.z - anchor.z) < 140).sort((a, b) => Math.hypot(a.x - anchor.x, a.z - anchor.z) - Math.hypot(b.x - anchor.x, b.z - anchor.z))[0];
    if (!node) continue;
    const segment = roadSegments.find(s => Math.hypot(s.a[0] - node.x, s.a[1] - node.z) < 3 && s.length > 28);
    if (!segment) continue;
    deferSource(node.x, node.z, () => {
      const dx = (segment.b[0] - segment.a[0]) / segment.length, dz = (segment.b[1] - segment.a[1]) / segment.length;
      const cx = node.x + dx * 15, cz = node.z + dz * 15, half = segment.width / 2 - 0.5;
      ribbon([cx - dx * 1.9, cz - dz * 1.9], [cx + dx * 1.9, cz + dz * 1.9], -half, half, 0x986f58, 0.135);
      for (let side = -half + 0.3; side < half; side += 0.8) {
        ribbon([cx - dx * 1.5, cz - dz * 1.5], [cx + dx * 1.5, cz + dz * 1.5], side - 0.23, side + 0.23, COLORS.paint, 0.15);
      }
      const ix = node.x + dx * 7, iz = node.z + dz * 7, iy = heightAt(ix, iz);
      primitive(box, ix, iy + 0.15, iz, 0.85, 0.3, 3.2, COLORS.kerb, Math.atan2(dx, dz));
      primitive(box, ix, iy + 0.8, iz, 0.16, 1.2, 0.16, 0xe5e4d5);
      primitive(box, ix, iy + 1.28, iz, 0.45, 0.45, 0.1, 0x527d94, Math.atan2(dx, dz));
    }, [node.x - 50, node.z - 50, node.x + 50, node.z + 50]);
  }

  const school = (map.landmarks || []).find(l => l.id === 'telopea');
  const polygonArea = points => Math.abs(points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
  const schoolMain = school && (map.buildings || []).filter(b => /school|education/.test(b.type || '') && b.points?.length && Math.hypot(b.points[0][0] - school.x, b.points[0][1] - school.z) < 220).sort((a, b) => polygonArea(b.points) - polygonArea(a.points))[0];
  let schoolDetailed = false;
  const coveredPassage = coveredCentrePassage(map);
  function buildingView(building, index) {
    let points = building.points;
    if (!points || points.length < 3) return;
    if (points.length > 3 && points[0][0] === points.at(-1)[0] && points[0][1] === points.at(-1)[1]) points = points.slice(0, -1);
    const x = points.reduce((sum, p) => sum + p[0], 0) / points.length, z = points.reduce((sum, p) => sum + p[1], 0) / points.length;
    const national = NATIONAL_ARCHITECTURE_IDS.has(building.id);
    if (national || REGIONAL_ARCHITECTURE_IDS.has(building.id)) {
      if (!owns(x, z)) return;
      const floorHeights = points.map(p => heightAt(...p));
      const batch = batchAt(x, z);
      const emit = national ? emitNationalArchitecture : emitRegionalArchitecture;
      if (emit(building, {
        points, base: Math.max(...floorHeights) + .12, footing: Math.min(...floorHeights) - .3, lowGraphics,
        emitTriangle: (a, b, c, tint) => triangle(batch, a, b, c, tint),
      })) {
        counters.buildings++;
        return;
      }
    }
    if (String(building.id).startsWith('osm-') && nearby(buildingCells, x, z).some(b => String(b.id).startsWith('act-') && inside(x, z, b.points))) return;
    const isSchool = school && Math.hypot(x - school.x, z - school.z) < (school.radius || 140) && !/residential|house|apartment|diplomatic/.test(building.type || '');
    const shopping = Boolean(retailDistrict(map, x, z));
    const utility = /shed|garage|carport|roof/.test(building.type || '');
    const residential = !isSchool && !shopping && !/apartments|commercial|retail|industrial|school|public|office/.test(building.type || '');
    const passage = building === coveredPassage?.building ? coveredPassage : null;
    const lowShop = !passage && shopping && /commercial|retail/.test(building.type || '') && (Number(building.height) || 4) <= 10;
    // Low keeps footprint walls, roof form and school identity. Ordinary bays
    // use one coloured pane rather than layered frames, mullions and glazing.
    const simpleFacade = lowGraphics && !isSchool;
    const height = Math.max(2.5, Math.min(50, building === schoolMain ? 7.8 : lowShop ? 3.9 : isSchool ? Math.min(7.8, Number(building.height) || 4.2) : Number(building.height) || (residential ? 3.8 : 7)));
    const floorHeights = points.map(p => heightAt(...p));
    const base = (isSchool ? floorHeights.reduce((a, b) => a + b, 0) / points.length : Math.max(...floorHeights)) + 0.12;
    const footing = passage ? base + passage.clearance : Math.min(...floorHeights) - 0.3;
    if (passage) {
      // Ground walls use exactly the same clipped polygons as physical contacts.
      for (const part of passage.groundParts) for(let i=0;i<part.points.length;i++) {
        const a=part.points[i],b=part.points[(i+1)%part.points.length];
        const vertices=[[a[0],Math.min(...floorHeights)-.3,a[1]],[b[0],Math.min(...floorHeights)-.3,b[1]],
          [b[0],footing,b[1]],[a[0],footing,a[1]]];
        quad(batchAt(x,z),...vertices,building.color||0xc4bca9);
        quad(batchAt(x,z),...vertices.slice().reverse(),building.color||0xc4bca9);
      }
      // A visible underside makes the actual 4.8m opening legible from the street.
      const faces=THREE.ShapeUtils.triangulateShape(points.map(p=>new THREE.Vector2(...p)),[]);
      for(const face of faces) {
        const vertices=face.map(i=>[points[i][0],footing,points[i][1]]);
        triangle(batchAt(x,z),...vertices,0x777d79);triangle(batchAt(x,z),...vertices.slice().reverse(),0x777d79);
      }
    }
    if(building.type==='roof'){
      const faces=THREE.ShapeUtils.triangulateShape(points.map(p=>new THREE.Vector2(...p)),[]);
      for(const face of faces){
        const p=face.map(i=>[points[i][0],base+height,points[i][1]]);
        if((p[1][0]-p[0][0])*(p[2][2]-p[0][2])-(p[1][2]-p[0][2])*(p[2][0]-p[0][0])>0)p.reverse();
        triangle(batchAt(x,z),...p,0x85887d);
        triangle(batchAt(x,z),...p.slice().reverse(),0xaaa99a);
      }
      for(let i=0;i<points.length;i+=Math.max(1,Math.ceil(points.length/6))){
        const p=points[i],ground=groundHeightAt(...p);
        primitive(box,p[0],ground+(base+height-ground)/2,p[1],.16,base+height-ground,.16,0xaaa99a);
      }
      counters.buildings++;return;
    }

    const signedArea = points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0);
    const reverse = signedArea > 0;
    const character = suburbCharacter(map, x, z, building);
    const apartment = /apartments/.test(building.type || '');
    const walls = isSchool ? 0xe0d2b4 : lowShop ? 0xd6c9ae : building.color || (residential ? character.walls[index % character.walls.length] : 0xc4bca9);
    const roofColor = isSchool ? 0x9f5943 : residential ? character.roofs[index % character.roofs.length] : 0x777d79;
    const wallKind = isSchool || index % 3 === 0 || !residential ? 1 : 0;
    const pitched = !utility && (isSchool || residential && height < 10) && building.roof !== 'flat';
    const batch = batchAt(x, z);
    const floors = Math.min(8, Math.max(1, Math.floor((height + 0.2) / 3.1)));
    const windowColumns = points.map((a, i) => {
      const b = points[(i + 1) % points.length], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      return utility || length < 3 ? 0 : Math.min(simpleFacade ? 3 : residential ? 7 : 16, Math.floor(length / (isSchool ? 3 : residential ? 3.8 : 3.2)));
    });
    const eligibleSides = windowColumns.filter(Boolean).length;
    const columnBudget = Math.max(eligibleSides, Math.floor((residential ? 40 : 120) / floors));
    const requestedColumns = windowColumns.reduce((sum, n) => sum + n, 0);
    if (requestedColumns > columnBudget) {
      // Reserve one bay on every eligible side before dividing the rest by size.
      // Footprint order must not leave the last street-facing wings windowless.
      const remaining = columnBudget - eligibleSides, weights = requestedColumns - eligibleSides;
      const shares = windowColumns.map((count, index) => ({ index, share: count ? remaining * (count - 1) / weights : 0 }));
      for (const { index, share } of shares) if (windowColumns[index]) windowColumns[index] = 1 + Math.floor(share);
      let unassigned = columnBudget - windowColumns.reduce((sum, n) => sum + n, 0);
      shares.sort((a, b) => (b.share % 1) - (a.share % 1));
      for (const { index } of shares) if (unassigned && windowColumns[index]) { windowColumns[index]++; unassigned--; }
    }
    function faceQuad(vertices, tint, detail = false) { quad(detail ? batchAt(x, z, detail === 'glass' ? 'glass' : 'detail') : batch, ...(reverse ? vertices.slice().reverse() : vertices), tint); }
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length < 0.1) continue;
      const ex = (b[0] - a[0]) / length, ez = (b[1] - a[1]) / length;
      const nx = (reverse ? ez : -ez), nz = (reverse ? -ex : ex);
      let wall = [[a[0], footing, a[1]], [b[0], footing, b[1]], [b[0], base + height, b[1]], [a[0], base + height, a[1]]];
      let uv = [[0, 0], [length, 0], [length, base + height - footing], [0, base + height - footing]];
      if (reverse) { wall.reverse(); uv.reverse(); }
      surfaceTriangle(x, z, wall[0], wall[1], wall[2], walls, wallKind, [...uv[0], ...uv[1], ...uv[2]]);
      surfaceTriangle(x, z, wall[0], wall[2], wall[3], walls, wallKind, [...uv[0], ...uv[2], ...uv[3]]);
      if (isSchool) {
        let lower = [[a[0] + nx * 0.018, footing, a[1] + nz * 0.018], [b[0] + nx * 0.018, footing, b[1] + nz * 0.018],
          [b[0] + nx * 0.018, base + Math.min(3.25, height * 0.43), b[1] + nz * 0.018], [a[0] + nx * 0.018, base + Math.min(3.25, height * 0.43), a[1] + nz * 0.018]];
        let lowerUv = [[0, 0], [length, 0], [length, 3.25], [0, 3.25]];
        if (reverse) { lower.reverse(); lowerUv.reverse(); }
        surfaceTriangle(x, z, lower[0], lower[1], lower[2], 0xa16b55, 0, [...lowerUv[0], ...lowerUv[1], ...lowerUv[2]]);
        surfaceTriangle(x, z, lower[0], lower[2], lower[3], 0xa16b55, 0, [...lowerUv[0], ...lowerUv[2], ...lowerUv[3]]);
      }
      // Plinth, fascia and eaves are narrow planes rather than hundreds of boxes.
      function stripe(y0, y1, offset, tint) {
        faceQuad([[a[0] + nx * offset, y0, a[1] + nz * offset], [b[0] + nx * offset, y0, b[1] + nz * offset],
          [b[0] + nx * offset, y1, b[1] + nz * offset], [a[0] + nx * offset, y1, a[1] + nz * offset]], tint);
      }
      if (!simpleFacade) {
        if (!passage) stripe(base, base + 0.26, 0.025, isSchool ? 0xb2a58a : 0x8a8172);
        stripe(base + height - 0.18, base + height + (lowShop ? 0.5 : 0.05), 0.1, isSchool ? 0xded4bc : lowShop ? 0xe0d5bf : 0xc1b9a6);
        const eave = [[a[0], base + height - 0.05, a[1]], [b[0], base + height - 0.05, b[1]],
          [b[0] + nx * 0.28, base + height - 0.05, b[1] + nz * 0.28], [a[0] + nx * 0.28, base + height - 0.05, a[1] + nz * 0.28]];
        quad(batch, ...eave, 0x807c6d); quad(batch, ...eave.slice().reverse(), 0x807c6d);
      }
      if (utility || length < 3) continue;
      const columns = windowColumns[i];
      const midX=(a[0]+b[0])/2,midZ=(a[1]+b[1])/2;
      const retailFront=!shopping && building.type==='retail' && !passage && !isSchool && columns>0 &&
        facesRetailStreet(midX,midZ,nx,nz,nearby(roadCells,midX+nx*10,midZ+nz*10));
      const bay = (u, v, halfWidth, halfHeight, offset, tint, glass = false) => {
        const cx = a[0] + ex * u + nx * offset, cz = a[1] + ez * u + nz * offset;
        faceQuad([[cx - ex * halfWidth, v - halfHeight, cz - ez * halfWidth], [cx + ex * halfWidth, v - halfHeight, cz + ez * halfWidth],
          [cx + ex * halfWidth, v + halfHeight, cz + ez * halfWidth], [cx - ex * halfWidth, v + halfHeight, cz - ez * halfWidth]], tint, glass ? 'glass' : true);
      };
      for (let row = 0; row < floors; row++) for (let col = 0; col < columns; col++) {
        const displayWindow = retailFront && row===0;
        const u = (col + 0.5) / columns * length, y = base + (isSchool ? 1.7 : displayWindow ? 1.5 : 1.9) + row * (isSchool ? 3.55 : 3.0);
        const hw = Math.min(isSchool ? 1.0 : displayWindow ? 2.1 : shopping && row === 0 ? 1.25 : 0.82, length / columns * (displayWindow ? .44 : .34));
        if (passage && y - 1.3 < footing) continue;
        const hh = isSchool ? 0.95 : displayWindow ? 1.12 : shopping && row === 0 ? 1.2 : 0.72;
        if (simpleFacade) {
          bay(u, y, hw, hh, 0.055, [0x586b79, 0x71818a, 0x485c6c][(row + col + index) % 3]);
          counters.windows++;
          continue;
        }
        bay(u, y, hw + 0.09, hh + 0.1, 0.042, isSchool ? 0xe8dfc6 : 0xd4cec0);
        bay(u, y, hw, hh, 0.055, [0x586b79, 0x71818a, 0x485c6c][(row + col + index) % 3], true);
        bay(u, y + hh * 0.57, hw, hh * 0.18, 0.058, 0xa4b3bb);
        bay(u, y, 0.035, hh, 0.065, 0xc6c6b9);
        if (isSchool) bay(u, y - 0.08, hw, 0.035, 0.068, 0xc9cbbb);
        // Streamed facade detail cannot depend on which districts loaded first.
        if (apartment && row > 0 && col % 2 === 0 && length > 6 && (streaming || counters.balconies < 3000)) {
          // Slab and opaque rail planes suggest recessed balcony rhythm cheaply.
          bay(u, y - hh - 0.12, hw + 0.22, 0.07, 0.32, 0xbab4a5);
          bay(u, y - hh + 0.32, hw + 0.22, 0.3, 0.38, 0x8a938b);
          counters.balconies++;
        }
        counters.windows++;
      }
      if (lowShop && length > 7 && length < 70) {
        primitive(box, (a[0] + b[0]) / 2 + nx * 0.45, base + 3, (a[1] + b[1]) / 2 + nz * 0.45, 1.85, 0.18, length,
          0x414743, Math.atan2(ex, ez));
      }
    }
    if (building === schoolMain) {
      let front = null;
      for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (length < 12) continue;
        const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
        for (const road of roadSegments) {
          if (!/New South Wales Crescent/i.test(road.road.name || '')) continue;
          const dx = road.b[0] - road.a[0], dz = road.b[1] - road.a[1];
          const t = THREE.MathUtils.clamp(((mx - road.a[0]) * dx + (mz - road.a[1]) * dz) / (dx * dx + dz * dz), 0, 1);
          const qx = road.a[0] + t * dx, qz = road.a[1] + t * dz;
          const distance = Math.hypot(qx - mx, qz - mz);
          const nx = (reverse ? b[1] - a[1] : a[1] - b[1]) / length;
          const nz = (reverse ? a[0] - b[0] : b[0] - a[0]) / length;
          if ((qx - mx) * nx + (qz - mz) * nz < distance * 0.35) continue;
          if ([0.1, 0.3, 0.6].some(f => inside(mx + (qx - mx) * f, mz + (qz - mz) * f, points))) continue;
          if (!front || distance < front.distance) front = { a, b, length, mx, mz, distance, road };
        }
      }
      if (front) {
        const ex = (front.b[0] - front.a[0]) / front.length, ez = (front.b[1] - front.a[1]) / front.length;
        const nx = reverse ? ez : -ez, nz = reverse ? -ex : ex;
        function arch(u, bottom, width, tall, offset, tint) {
          const radius = width / 2, shoulder = bottom + tall - radius;
          const p = (du, y) => [front.mx + ex * (u + du) + nx * offset, y, front.mz + ez * (u + du) + nz * offset];
          faceQuad([p(-radius, bottom), p(radius, bottom), p(radius, shoulder), p(-radius, shoulder)], tint);
          for (let k = 0; k < 10; k++) {
            const a = k / 10 * Math.PI, b = (k + 1) / 10 * Math.PI;
            const fan = [p(0, shoulder), p(Math.cos(a) * radius, shoulder + Math.sin(a) * radius), p(Math.cos(b) * radius, shoulder + Math.sin(b) * radius)];
            triangle(batch, ...(reverse ? fan.reverse() : fan), tint);
          }
        }
        for (let i = -2; i <= 2; i++) {
          arch(i * 1.6, base + 3.7, 1.3, 3.25, 0.11, 0xeee9d8);
          arch(i * 1.6, base + 3.83, 1.02, 2.95, 0.125, 0x607c80);
        }
        const yaw = Math.atan2(ex, ez);
        primitive(box, front.mx + nx * 0.18, base + 1.45, front.mz + nz * 0.18, 0.24, 2.9, 3.3, 0xe0d4ba, yaw);
        primitive(box, front.mx + nx * 0.34, base + 1.32, front.mz + nz * 0.34, 0.12, 2.55, 2.7, 0x526d70, yaw);
      }
    }
    const faces = THREE.ShapeUtils.triangulateShape(points.map(p => new THREE.Vector2(...p)), []);
    const roofHeight = p => {
      if (!pitched) return base + height;
      let distance = Infinity;
      for (let i = 0; i < points.length; i++) distance = Math.min(distance, segmentDistance(p[0], p[1], points[i], points[(i + 1) % points.length]));
      return base + height + Math.min(isSchool ? 2.2 : 1.9, distance * (isSchool ? 0.48 : 0.42));
    };
    function roofTriangle(a, b, c, depth) {
      if (depth) {
        const ab = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], bc = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2], ca = [(c[0] + a[0]) / 2, (c[1] + a[1]) / 2];
        roofTriangle(a, ab, ca, depth - 1); roofTriangle(ab, b, bc, depth - 1); roofTriangle(ca, bc, c, depth - 1); roofTriangle(ab, bc, ca, depth - 1); return;
      }
      const vertices = [a, b, c].map(p => [p[0], roofHeight(p), p[1]]);
      const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (cross > 0) vertices.reverse();
      if (surfaceTriangle(x, z, ...vertices, roofColor, 2)) counters.roofFacets++;
    }
    for (const f of faces) roofTriangle(points[f[0]], points[f[1]], points[f[2]], pitched ? simpleFacade ? 1 : points.length <= 10 ? 2 : 1 : 0);
    if (!simpleFacade && residential && !utility && index % 3 === 0) {
      const top = roofHeight([x, z]);
      primitive(box, x, top + 0.4, z, 0.55, 1.0, 0.65, 0x9c7b61);
      primitive(box, x, top + 0.94, z, 0.7, 0.12, 0.8, 0x747366);
    }
    const minX = Math.min(...points.map(p => p[0])), maxX = Math.max(...points.map(p => p[0]));
    const minZ = Math.min(...points.map(p => p[1])), maxZ = Math.max(...points.map(p => p[1]));
    softShadow(x, z, (maxX - minX) * 0.6 + 1.5, (maxZ - minZ) * 0.6 + 1.5, 0.15);
    if (isSchool) schoolDetailed = true;
    counters.buildings++; counters.texturedBuildings++;
  }
  const landmarkBuildingIds = new Set(map.landmarkBuildingIds || []);
  (map.buildings || []).forEach((building, index) => {
    if (landmarkBuildingIds.has(building.id) || !building.points?.length) return;
    const p = building.points, xs = p.map(v => v[0]), zs = p.map(v => v[1]);
    const points = p.length > 3 && p[0][0] === p.at(-1)[0] && p[0][1] === p.at(-1)[1] ? p.slice(0, -1) : p;
    const x = points.reduce((sum, v) => sum + v[0], 0) / points.length;
    const z = points.reduce((sum, v) => sum + v[1], 0) / points.length;
    deferSource(x, z, () => {
      const before = { ...counters };
      buildingView(building, index);
      if (!owns(x, z)) for (const name of ['buildings', 'windows', 'roofFacets', 'texturedBuildings', 'balconies']) counters[name] = before[name];
    }, [Math.min(...xs)-2, Math.min(...zs)-2, Math.max(...xs)+2, Math.max(...zs)+2]);
  });

  // Signs are indexed before streamed bodies are built. Resolve source campus
  // presence now so a later district's load order cannot add extra sign posts.
  if (streaming && school) schoolDetailed = (map.buildings || []).some(building => {
    if (landmarkBuildingIds.has(building.id) || !building.points?.length || /residential|house|apartment|diplomatic/.test(building.type || '')) return false;
    let points = building.points;
    if (points.length > 3 && points[0][0] === points.at(-1)[0] && points[0][1] === points.at(-1)[1]) points = points.slice(0, -1);
    const x = points.reduce((sum, p) => sum + p[0], 0) / points.length;
    const z = points.reduce((sum, p) => sum + p[1], 0) / points.length;
    return Math.hypot(x - school.x, z - school.z) < (school.radius || 140);
  });

  // Shade original leaf clusters and branch forks together in scene daylight.
  const gumLeaves = [0xe1e7d9, 0xd7dfd4, 0xcddbc8, 0xe5eadf];
  const streetLeaves = [0xeef2d4, 0xdde6c4, 0xe3edda, 0xf5ebcf];
  const gumBark = [0xb9b19d, 0xacb0a2, 0xd3c7b5, 0xbeb7a3];
  const avenueBark = [0x7a6b54, 0x85735c, 0x745d4e];
  const scrubLeaves = [0x5f7251, 0x748463, 0x697850, 0x88885d];
  const vergeLeaves = [0x738755, 0x7d8e5e, 0x75835a, 0x818d63];
  const pick = (palette, seed) => palette[Math.floor(hash(seed) * palette.length)];
  function emitTree(plant, y, h, avenue) {
    const {x, z, seed, habitat} = plant;
    const park = habitat !== 'street';
    const eucalyptus = !avenue && (park || hash(seed + 19) > .32);
    const angle = hash(seed + 3) * Math.PI * 2;
    const width = h * (.88 + hash(seed + 23) * .22);
    const depth = h * (.84 + hash(seed + 31) * .24);
    const bark = pick(eucalyptus ? gumBark : avenueBark, seed + 29);
    primitive(eucalyptus ? gumTrunk : streetTrunk, x, y, z, width, h, depth, bark, angle);
    if (canopies) primitive(eucalyptus ? gumCrown : streetCrown, x, y, z, width, h, depth,
      pick(eucalyptus ? gumLeaves : streetLeaves, seed + 51), angle, 'canopy');
    else primitive(fallbackCrown, x, y + h * .79, z, width * .38, h * .23, depth * .33,
      eucalyptus ? 0x6b8362 : 0x73884e, angle);
    softShadow(x, z, h * .38, h * .32, .14);
  }
  function emitShrub(x, z, seed, y, habitat) {
    const wood = habitat === 'wood', scale = .25 + hash(seed + 7) * (.48 + Number(wood) * .37);
    primitive(shrubCrown, x, y + scale * .37, z, scale * 1.48, scale * .69, scale,
      pick(wood ? scrubLeaves : vergeLeaves, seed + 63), hash(seed + 4) * Math.PI * 2);
  }

  // Test foliage positions once at recipe creation. Each district retains one
  // recipe list and bakes trunks with opaque props and leaves into one canopy batch.
  const foliageChunks = new Map();
  {
    const exclusions = new Map(), railCells = new Map();
    function indexArea(points, contains) {
      if (!points || points.length < 3) return;
      const xs = points.map(p => p[0]), zs = points.map(p => p[1]);
      indexBounds(exclusions, contains, Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs));
    }
    for (const points of [...(map.landmarkTreeExclusions || []), ...(map.barriers || []).map(barrier => barrier.points)]) {
      indexArea(points, (x, z) => inside(x, z, points));
    }
    for (const area of map.areas || []) {
      if (!/water|lake|basin/.test(area.type) || !area.points?.length) continue;
      const outer = prepareWaterRing(area.points);
      const holes = (area.innerRings || []).map(ring => prepareWaterRing(ring.points || ring));
      indexArea(area.points, (x, z) => outer.contains(x, z) && !holes.some(hole => hole.contains(x, z)));
    }
    function indexRail(a, b, gap) {
      const clearance = gap + 1.25;
      indexBounds(railCells, { a, b, gap }, Math.min(a[0], b[0]) - clearance, Math.min(a[1], b[1]) - clearance,
        Math.max(a[0], b[0]) + clearance, Math.max(a[1], b[1]) + clearance);
    }
    for (const route of rail?.routes || []) {
      for (let i = 1; i < route.points.length; i++) indexRail(route.points[i - 1], route.points[i], 1.8);
    }
    for (const platform of rail?.platforms || []) {
      const ring=prepareWaterRing(platform.points);
      indexArea(platform.points,(x,z)=>ring.contains(x,z));
    }
    for (const stop of rail?.platforms ? [] : rail?.stops || []) {
      const dx = Math.sin(stop.yaw) * 13, dz = Math.cos(stop.yaw) * 13;
      indexRail([stop.x - dx, stop.z - dz], [stop.x + dx, stop.z + dz], stop.trackGap / 2 + 1.8);
    }
    function isClear(x, z, kind) {
      const gap = kind === 'tree' ? 1.25 : 0.65;
      return !nearby(roadCells, x, z).some(s => segmentDistance(x, z, s.a, s.b) < s.width / 2 + s.profile.pavementWidth + gap) &&
        !nearby(buildingCells, x, z).some(b => inside(x, z, b.points)) &&
        !nearby(exclusions, x, z).some(contains => contains(x, z)) &&
        !nearby(railCells, x, z).some(s => segmentDistance(x, z, s.a, s.b) < s.gap + gap);
    }
    for (const plant of placeFoliage(map, { isClear, chunkSize: CHUNK_SIZE })) {
      const key = keyAt(plant.x, plant.z);
      if (!foliageChunks.has(key)) foliageChunks.set(key, []);
      foliageChunks.get(key).push(plant);
    }
  }
  let totalTrees = 0, totalShrubs = 0;
  function drawFoliage(plants) {
    const before = counters.triangles;
    for (const plant of plants) {
      const {x, z, seed, kind, habitat} = plant;
      const y = groundHeightAt(x, z);
      if (kind === 'shrub') {
        emitShrub(x, z, seed, y, habitat);
        counters.shrubs++;
        continue;
      }
      const avenue = school && Math.hypot(x - school.x, z - school.z) < 250;
      const h = avenue ? 10.5 + hash(seed) * 6 :
        habitat === 'wood' ? 7 + hash(seed) * 9 : 5.8 + hash(seed) * 6.6;
      emitTree(plant, y, h, avenue);
      counters.trees++;
      if (map.spawn && Math.hypot(x - map.spawn.x, z - map.spawn.z) < 250) counters.treesNearSpawn++;
    }
    counters.foliageTriangles += counters.triangles - before;
  }
  for (const plants of foliageChunks.values()) {
    for (const plant of plants) {
      if (plant.kind === 'tree') totalTrees++;
      else totalShrubs++;
    }
    deferSource(plants[0].x, plants[0].z, () => drawFoliage(plants));
  }
  foliageChunks.clear();

  // One atlas and one sign mesh per neighbourhood keep readable names inexpensive.
  const labels = [];
  const labelIds = new Map();
  function labelId(text) {
    if (!labelIds.has(text) && labels.length < 128) {
      labelIds.set(text, labels.length);
      labels.push(text);
    }
    return labelIds.get(text);
  }
  const signPlacements = [];
  const signSpacing = [];
  for (const node of intersections) {
    if (signPlacements.length >= 84 || signSpacing.some(p => Math.hypot(p.x - node.x, p.z - node.z) < 95)) continue;
    const roads = [...node.roads.values()].filter(r => r.name);
    if (roads.length < 2) continue;
    signSpacing.push(node);
    const x = node.x + node.width / 2 + 2, z = node.z + node.width / 2 + 2;
    const y = heightAt(x, z);
    primitive(trunk, x, y + 1.7, z, 0.075, 3.4, 0.075, COLORS.metal);
    roads.slice(0, 2).forEach((r, i) => signPlacements.push({ x, z, y: y + 2.8 + i * 0.36, label: labelId(r.name), width: Math.max(2.2, Math.min(4.8, r.name.length * 0.15)), yaw: i * Math.PI / 2, height: 0.3 }));
    const major = roads.filter(r => /primary|secondary|tertiary/.test(r.type));
    if (major.length >= 2) {
      for (const side of [-1, 1]) {
        const lx = node.x + side * (node.width / 2 + 1), lz = node.z - side * (node.width / 2 + 1);
        const ly = heightAt(lx, lz);
        primitive(trunk, lx, ly + 2.2, lz, 0.11, 4.4, 0.11, COLORS.metal);
        primitive(box, lx, ly + 3.7, lz, 0.32, 0.95, 0.3, 0x303532);
        primitive(crown, lx, ly + 3.97, lz + 0.17, 0.09, 0.09, 0.04, 0xb94636);
        primitive(crown, lx, ly + 3.43, lz - 0.17, 0.09, 0.09, 0.04, 0x70a66b);
      }
    }
  }
  if (school) {
    const label = labelId('Telopea Park School');
    // Enrich an existing footprint rather than inventing a second school campus.
    let placement = null;
    for (const s of roadSegments) {
      const dx = (s.b[0] - s.a[0]) / s.length, dz = (s.b[1] - s.a[1]) / s.length;
      const along = THREE.MathUtils.clamp((school.x - s.a[0]) * dx + (school.z - s.a[1]) * dz, 3, Math.max(3, s.length - 3));
      const px = s.a[0] + along * dx, pz = s.a[1] + along * dz;
      const side = Math.sign((school.x - px) * -dz + (school.z - pz) * dx) || 1;
      const x = px - dz * side * (s.width / 2 + 6), z = pz + dx * side * (s.width / 2 + 6);
      const distance = Math.hypot(x - school.x, z - school.z);
      if (distance > (school.radius || 125) + 40 || (placement && distance >= placement.distance)) continue;
      if (nearby(roadCells, x, z).some(r => segmentDistance(x, z, r.a, r.b) < r.width / 2 + 3)) continue;
      if (nearby(buildingCells, x, z).some(b => inside(x, z, b.points))) continue;
      placement = { x, z, yaw: Math.atan2(dz, dx), distance };
    }
    const { x, z, yaw } = placement || { x: school.x, z: school.z, yaw: 0 };
    const y = heightAt(x, z);
    primitive(box, x, y + 0.8, z, 5.5, 1.6, 0.4, COLORS.cream, -yaw);
    signPlacements.push({ x: x - Math.sin(yaw) * 0.22, z: z + Math.cos(yaw) * 0.22, y: y + 1.0, label, width: 4.9, height: 0.65, yaw });
    if (!schoolDetailed) {
      // A sign remains useful when the source has no campus building footprints.
      primitive(box, x - 2.5, y + 1.1, z, 0.25, 2.2, 0.5, 0x8b664c);
      primitive(box, x + 2.5, y + 1.1, z, 0.25, 2.2, 0.5, 0x8b664c);
    }
  }
  let signMaterial = null;
  if (labels.length && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 2048; canvas.height = 2048;
    const context = canvas.getContext('2d');
    context.fillStyle = '#24503c'; context.fillRect(0, 0, 2048, 2048);
    context.textAlign = 'center'; context.textBaseline = 'middle';
    labels.forEach((label, i) => {
      const x = (i % 4) * 512, y = Math.floor(i / 4) * 64;
      context.strokeStyle = '#e9eee4'; context.lineWidth = 2; context.strokeRect(x + 5, y + 4, 502, 56);
      context.fillStyle = '#ffffff'; context.font = 'bold 32px sans-serif';
      context.fillText(label, x + 256, y + 32, 475);
    });
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 2;
    textures.push(texture);
    signMaterial = new THREE.MeshLambertMaterial({ map: texture, side: THREE.DoubleSide });
    materials.push(signMaterial);
    for (const p of signPlacements) {
      if (p.label === undefined) continue;
      deferSource(p.x, p.z, () => {
        const dx = Math.cos(p.yaw) * p.width / 2, dz = Math.sin(p.yaw) * p.width / 2;
        const a = [p.x - dx, p.y - p.height / 2, p.z - dz], b = [p.x + dx, p.y - p.height / 2, p.z + dz];
        const c = [b[0], p.y + p.height / 2, b[2]], d = [a[0], p.y + p.height / 2, a[2]];
        const u0 = (p.label % 4) / 4, u1 = u0 + 0.25;
        const v1 = 1 - Math.floor(p.label / 4) / 32, v0 = v1 - 1 / 32;
        quad(batchAt(p.x, p.z, 'sign'), a, b, c, d, 0xffffff, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]);
        counters.signs++;
      });
    }
  }

  function compileChunk(chunk) {
    for (const [kind, batch] of chunk.batches) {
      if (!batch.positions.length) continue;
      const meshGeometry = new THREE.BufferGeometry();
      meshGeometry.setAttribute('position', new THREE.Float32BufferAttribute(batch.positions, 3));
      meshGeometry.setAttribute('normal', compactAttribute(batch.normals, 3, true));
      if (kind === 'sign') meshGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(batch.uvs, 2));
      else {
        meshGeometry.setAttribute('color', compactAttribute(batch.colors, kind === 'shadow' ? 4 : 3));
        if (kind === 'canopy') {
          meshGeometry.setAttribute('uv', new THREE.Uint16BufferAttribute(batch.uvs.map(uv => Math.round(uv * 65535)), 2, true));
          meshGeometry.setIndex(new THREE.Uint16BufferAttribute(batch.indices, 1));
          counters.bufferBytes += meshGeometry.index.array.byteLength;
        }
        if (kind === 'surface') {
          meshGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(batch.uvs, 2));
          meshGeometry.setAttribute('surfaceKind', new THREE.Uint8BufferAttribute(batch.kinds, 1));
        }
        if (kind === 'road' || kind === 'pavement') {
          const uv = [];
          for (let i = 0; i < batch.positions.length; i += 3) uv.push(batch.positions[i] / 2, batch.positions[i + 2] / 2);
          meshGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        }
      }
      meshGeometry.computeBoundingSphere();
      for (const attribute of Object.values(meshGeometry.attributes)) counters.bufferBytes += attribute.array.byteLength;
      const mesh = new THREE.Mesh(meshGeometry, kind === 'sign' ? signMaterial : (kind === 'road' || kind === 'pavement') ? roadMaterial : kind === 'surface' ? surfaceMaterial : kind === 'canopy' ? canopies : kind === 'shadow' ? shadowMaterial : kind === 'glass' ? glazing : kind==='water'?waterMaterial:opaque);
      mesh.name = `Canberra ${kind}`;
      mesh.receiveShadow = false;
      mesh.castShadow = false;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      chunk.group.add(mesh);
      counters.meshes++;
    }
    // Release the temporary JavaScript arrays after uploading typed buffers.
    chunk.batches.clear();
  }
  if (!streaming) {
    for (const chunk of chunks.values()) compileChunk(chunk);
    for (const g of temporaryGeometry) g.dispose();
  } else {
    preparing = false;
    for (const key of Object.keys(counters)) if (key !== 'lowGraphics') counters[key] = 0;
  }
  counters.chunks = chunks.size;
  let peakResidentBytes = counters.bufferBytes, loads = 0, evictions = 0;
  let queue = [], lastCellX = NaN, lastCellZ = NaN, disposed = false;
  const MAX_RESIDENT = 36, LOAD_RADIUS = 575, EVICT_RADIUS = 1050;
  const countKeys = Object.keys(counters).filter(key => key !== 'lowGraphics' && key !== 'chunks');
  function loadChunk(key) {
    const [cx, cz] = key.split(',').map(Number);
    targetKey = key;
    targetBounds = [cx * CHUNK_SIZE, cz * CHUNK_SIZE, (cx + 1) * CHUNK_SIZE, (cz + 1) * CHUNK_SIZE];
    const before = { ...counters };
    // Empty source districts still contain terrain, so there are no blank holes.
    const chunk = chunkAt(targetBounds[0], targetBounds[1]);
    groundSampleCache=new Map();groundSampleCount=0;
    try {
      drawTerrain();
      for (const draw of sources.get(key) || []) draw();
      compileChunk(chunk);
    } finally {
      groundSampleCache=null;groundSampleCount=0;
      targetKey=targetBounds=null;
    }
    chunk.counts = Object.fromEntries(countKeys.map(name => [name, counters[name] - before[name]]));
    loads++;
    peakResidentBytes = Math.max(peakResidentBytes, counters.bufferBytes);
    counters.chunks = chunks.size;
  }
  function evictChunk(key) {
    const chunk = chunks.get(key);
    if (!chunk) return;
    for (const mesh of chunk.group.children) mesh.geometry.dispose();
    chunk.group.clear(); chunk.group.removeFromParent();
    for (const name of countKeys) counters[name] -= chunk.counts[name];
    chunks.delete(key);
    counters.chunks = chunks.size;
    evictions++;
  }
  function refreshQueue(x, z) {
    const wanted = [];
    const cx = Math.floor(x / CHUNK_SIZE), cz = Math.floor(z / CHUNK_SIZE);
    for (let ix = cx - 3; ix <= cx + 3; ix++) for (let iz = cz - 3; iz <= cz + 3; iz++) {
      const minX = ix * CHUNK_SIZE, minZ = iz * CHUNK_SIZE;
      if (minX > bounds.maxX + 245 || minX + CHUNK_SIZE < bounds.minX - 245 || minZ > bounds.maxZ + 245 || minZ + CHUNK_SIZE < bounds.minZ - 245) continue;
      const dx = Math.max(minX - x, 0, x - minX - CHUNK_SIZE), dz = Math.max(minZ - z, 0, z - minZ - CHUNK_SIZE);
      if (Math.hypot(dx, dz) <= LOAD_RADIUS) wanted.push({ key: `${ix},${iz}`, distance: Math.hypot(minX + CHUNK_SIZE / 2 - x, minZ + CHUNK_SIZE / 2 - z) });
    }
    wanted.sort((a, b) => a.distance - b.distance);
    queue = wanted.filter(item => !chunks.has(item.key)).map(item => item.key);
  }
  const statsSnapshot = () => Object.freeze({ ...counters, streaming, residentBytes: counters.bufferBytes,
    peakResidentBytes, residentChunks: chunks.size, queuedChunks: queue.length, evictions, loads, totalTrees, totalShrubs });
  function update(player, options) {
    if (disposed) return;
    const x = player.x ?? player.position?.x ?? 0;
    const z = player.z ?? player.position?.z ?? 0;
    if (streaming) {
      // Re-sort only after 80m movement. An idle update allocates no geometry.
      const cellX = Math.floor(x / CELL_SIZE), cellZ = Math.floor(z / CELL_SIZE);
      if (cellX !== lastCellX || cellZ !== lastCellZ) {
        lastCellX = cellX; lastCellZ = cellZ;
        for (const [key, chunk] of chunks) if (Math.hypot(chunk.x - x, chunk.z - z) > EVICT_RADIUS) evictChunk(key);
        refreshQueue(x, z);
      }
      const maxLoads=Number.isInteger(options?.maxLoads)?Math.max(0,Math.min(2,options.maxLoads)):2;
      for (let budget = 0; budget < maxLoads && queue.length; budget++) {
        if (chunks.size >= MAX_RESIDENT) {
          let farthest = null, distance = -1;
          for (const [key, chunk] of chunks) { const d = Math.hypot(chunk.x - x, chunk.z - z); if (d > distance) { farthest = key; distance = d; } }
          evictChunk(farthest);
        }
        loadChunk(queue.shift());
      }
    }
    for (const chunk of chunks.values()) {
      const distance = Math.hypot(chunk.x - x, chunk.z - z);
      chunk.group.visible = distance < (lowGraphics ? 500 : VISIBILITY) + CHUNK_SIZE * 0.71;
      for (const mesh of chunk.group.children) {
        const range = (mesh.name === 'Canberra detail' || mesh.name === 'Canberra glass') ? 280 : mesh.name === 'Canberra shadow' ? 350 : mesh.name === 'Canberra pavement' ? 450 : mesh.name === 'Canberra solid' || mesh.name === 'Canberra canopy' ? 475 : VISIBILITY;
        mesh.visible = distance < (lowGraphics ? Math.min(range, mesh.name === 'Canberra detail' || mesh.name === 'Canberra glass' ? 180 : 500) : range) + CHUNK_SIZE * 0.71;
      }
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    root.traverse(object => { if (object.isMesh) object.geometry.dispose(); });
    if (streaming) for (const g of temporaryGeometry) g.dispose();
    for (const material of materials) material.dispose();
    for (const texture of textures) texture.dispose();
    root.clear(); root.removeFromParent();
    chunks.clear(); sources.clear(); queue.length = 0;
    temporaryGeometry.length = materials.length = textures.length = 0;
    for (const name of Object.keys(counters)) if (name !== 'lowGraphics') counters[name] = 0;
    totalTrees = totalShrubs = 0;
  }
  if (streaming) {
    const spawn = map.spawn || { x: 0, z: 0 };
    refreshQueue(spawn.x, spawn.z);
    // Build the nearest opening districts first. The frame queue can finish the rest.
    for (let i = 0; i < openingChunks && queue.length; i++) loadChunk(queue.shift());
    lastCellX = Math.floor(spawn.x / CELL_SIZE); lastCellZ = Math.floor(spawn.z / CELL_SIZE);
  }
  update(map.spawn || { x: 0, z: 0 });
  return { heightAt,groundHeightAt,roadHeightAt,vehicleHeightAt, update, dispose, get pendingChunks() { return queue.length; }, get stats() { return statsSnapshot(); } };
}
