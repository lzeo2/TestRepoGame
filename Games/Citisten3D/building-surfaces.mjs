// Delivered material names, not node-name guesses: a door can share the same
// glazing as a facade. Mobile models and the park's assembled tree stay authored.
const buildings = new Set(['residential_row', 'commercial', 'town_hall', 'police_station',
  'fire_station', 'industrial_shed', 'power_plant', 'water_tower', 'wall_segment', 'watchtower', 'park_lot']);
const masonry = new Set(['warm_brick', 'limestone', 'concrete', 'stone', 'pale_granite_edging']);
const metals = new Set(['patinated_metal', 'bolt', 'dark', 'rust', 'park_painted_iron']);

export function buildingSurfaceKind(material) {
  const [directory, slot] = material.name.split('__');
  if (!buildings.has(directory)) return 'authored';
  if (slot === 'warm_glazing' || slot === 'glass') return 'glass';
  if (masonry.has(slot)) return 'masonry';
  if (slot === 'slate') return 'roof';
  if (slot === 'steel') return 'sheet';
  if (metals.has(slot)) return 'metal';
  return 'authored';
}

const varyings = '\nvarying vec3 vBuildingPosition;\nvarying vec3 vBuildingNormal;\n';
function surfaceShader(kind, shader) {
  shader.vertexShader = varyings + shader.vertexShader.replace('#include <begin_vertex>', `
#include <begin_vertex>
vBuildingPosition = position;
vBuildingNormal = normal;
`);
  // Coordinates precede instance transforms, so dirt follows a rotated building.
  // No displacement or normal replacement: authored maps/UVs remain authoritative.
  shader.fragmentShader = varyings + shader.fragmentShader.replace('#include <color_fragment>', `
#include <color_fragment>
vec3 bp = vBuildingPosition;
float streak = 0.5 + 0.5 * sin(bp.x * 7.1 + sin(bp.z * 5.3));
float mottling = 0.5 + 0.5 * sin(bp.x * 2.3 + bp.z * 3.7 + sin(bp.y * 1.9));
float footDirt = 1.0 - smoothstep(0.0, 1.8, max(bp.y, 0.0));
float buildingWear = clamp(0.35 * mottling + 0.25 * streak + 0.4 * footDirt, 0.0, 1.0);
float buildingSeam = 0.0;
${kind === 'sheet' ? `
// Standing seams on upward-facing sheet metal only, filtered at distance.
float panel = bp.x * 1.6;
float seamDistance = abs(fract(panel + 0.5) - 0.5);
float seamWidth = max(fwidth(panel), 0.003);
buildingSeam = (1.0 - smoothstep(0.012, 0.012 + seamWidth, seamDistance))
  * smoothstep(0.55, 0.85, normalize(vBuildingNormal).y);
` : ''}
diffuseColor.rgb *= 1.0 - buildingWear * ${kind === 'masonry' ? '0.12' : '0.08'} - buildingSeam * 0.12;
`).replace('#include <roughnessmap_fragment>', `
#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + buildingWear * 0.06 + buildingSeam * 0.04, 0.0, 1.0);
`);
}

// One clone per source material in the kit, never per building. Textures remain
// borrowed from the loader and are disposed only by disposeExternalModels.
export function createBuildingSurface(original) {
  const material = original.clone(), kind = buildingSurfaceKind(original);
  if (!original.isMeshStandardMaterial) return material;
  if (kind === 'glass') {
    // Opaque architectural glazing avoids sorting/interior/transmission passes.
    // Standard's dielectric Fresnel reflects the shared scene.environment.
    material.metalness = 0;
    material.roughness = Math.min(original.roughness, 0.22);
    material.envMapIntensity = 1.15;
  } else if (kind !== 'authored') {
    const previous = original.onBeforeCompile, key = original.customProgramCacheKey();
    const shaderKind = kind === 'roof' ? 'metal' : kind;
    material.onBeforeCompile = function (shader, renderer) {
      previous.call(this, shader, renderer);
      surfaceShader(shaderKind, shader);
    };
    material.customProgramCacheKey = () => `${key}:citisten-building-surface-v1:${shaderKind}`;
  }
  return material;
}
