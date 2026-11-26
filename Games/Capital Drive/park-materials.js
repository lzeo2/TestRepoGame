import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

// Create once when the first park masonry comes into view. Model UVs span one
// repeat per 1.4 metres of wall in either direction.
export function createParkMaterials() {
  if (typeof document === 'undefined') {
    return { masonryMap: null, masonryNormalMap: null, dispose() {} };
  }

  const loader = new THREE.ImageLoader();
  let disposed = false;
  function loadMap(url, fallbackColor, colorSpace) {
    // Keep the brick plinth visible while loading, including offline cache misses.
    const fallback = document.createElement('canvas');
    fallback.width = fallback.height = 1;
    const context = fallback.getContext('2d');
    if (context) {
      context.fillStyle = fallbackColor;
      context.fillRect(0, 0, 1, 1);
    }
    const texture = new THREE.Texture(fallback);
    texture.colorSpace = colorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 2;
    texture.needsUpdate = true;
    loader.load(url.href, image => {
      if (disposed) return;
      texture.image = image;
      texture.needsUpdate = true;
    });
    return texture;
  }

  const masonryMap = loadMap(new URL('./textures/park-brick-color.webp', import.meta.url), '#93634e', THREE.SRGBColorSpace);
  const masonryNormalMap = loadMap(new URL('./textures/park-brick-normal.webp', import.meta.url), '#8080ff', THREE.NoColorSpace);
  return {
    masonryMap,
    masonryNormalMap,
    dispose() {
      if (disposed) return;
      disposed = true;
      masonryMap.dispose();
      masonryNormalMap.dispose();
    },
  };
}
