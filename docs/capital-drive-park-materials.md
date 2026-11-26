# Capital Drive park masonry

Park barbecue plinths use the **Red Brick** scan by Rob Tuytel. The asset
metadata gives a square tile approximately 1.4 metres on each side. The
running bond and mortar come from the source material. It is a visual analogue
for weathered brick, with no claim that the source wall is in Canberra.
[Asset](https://polyhaven.com/a/red_brick) · [Dimensions and artist](https://api.polyhaven.com/info/red_brick)

Poly Haven publishes its assets under CC0 1.0, allowing redistribution and
adaptation. Both maps are bundled locally. The game positions one repeat every
1.4 metres horizontally and vertically. The base colour is sRGB. The
tangent-space OpenGL normal is sampled as linear data and keeps the original
green-channel orientation. [Poly Haven licence](https://polyhaven.com/license)
· [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)

## Sources and outputs

Both inputs are 1,024 × 1,024 PNGs from the asset publisher. The diffuse PNG
contains 16-bit RGB and the normal PNG contains 8-bit RGB.
[Upstream file manifest](https://api.polyhaven.com/files/red_brick)

| Map | SHA-256 of downloaded source |
| --- | --- |
| [Diffuse PNG](https://dl.polyhaven.org/file/ph-assets/Textures/png/1k/red_brick/red_brick_diff_1k.png) | `6cbeb81b1121713662835b863c0f71859d3b8cd51161d3ddb017631d0bf52d43` |
| [OpenGL normal PNG](https://dl.polyhaven.org/file/ph-assets/Textures/png/1k/red_brick/red_brick_nor_gl_1k.png) | `e1116366df05651cb54edea4977563a4c0d4ee7a523be61a51fb895c279fa9a8` |

| Bundled map | Dimensions | Bytes | SHA-256 |
| --- | ---: | ---: | --- |
| [Brick colour](../Games/Capital%20Drive/textures/park-brick-color.webp) | 512 × 512 | 30,500 | `ba694c82a170a6f05c944c9170e512ec76e0f4cdf83ca17dd71df6bc59d1f12c` |
| [Brick normal](../Games/Capital%20Drive/textures/park-brick-normal.webp) | 256 × 256 | 70,618 | `18a4293269db14fa7021894605922cd9802305e90bd84c851db361806af022c4` |

The pair occupies 101,118 compressed bytes. Including all mip levels, two
RGBA8 uploads would occupy 1,747,624 bytes, excluding GPU driver overhead.
The game shares the textures across plinths and uses maximum 2× anisotropy.
The plinth keeps a brick-coloured fallback while the photos decode.
The [loader](../Games/Capital%20Drive/park-materials.js) releases both textures
when its view is disposed.

A Chromium software WebGL check decoded both bundled maps, applied them to
a 1.4 m square lit through the production Three.js module, and rendered it
in one draw. The local server received exactly two image requests. Both
returned HTTP 200. Repeated disposal released each texture once. This was
a material-level check. It does not measure park frame time.

## Reproducing the images

Run in a scratch directory with Pillow 13.0.0 and libwebp 1.6.0. The published
source checksums above identify the exact inputs. Resize the diffuse with a
Lanczos filter. For the normal, average the vectors over each 4 × 4 block,
renormalize, round the red and green values to four-component-value increments
and reconstruct positive Z. Lossless WebP preserves those final components.

```sh
curl -fL --output diff.png https://dl.polyhaven.org/file/ph-assets/Textures/png/1k/red_brick/red_brick_diff_1k.png
curl -fL --output nor_gl.png https://dl.polyhaven.org/file/ph-assets/Textures/png/1k/red_brick/red_brick_nor_gl_1k.png
sha256sum diff.png nor_gl.png
```

```python
from math import sqrt
from PIL import Image

albedo = Image.open('diff.png').convert('RGB').resize((512, 512), Image.Resampling.LANCZOS)
albedo.save('park-brick-color.webp', 'WEBP', quality=82, method=6)

normal = Image.open('nor_gl.png').convert('RGB').resize((256, 256), Image.Resampling.BOX)
pixels = []
for pixel in normal.get_flattened_data():
    x, y, z = [value / 127.5 - 1 for value in pixel]
    length = sqrt(x*x + y*y + z*z)
    red, green = [max(0, min(255, 4 * round((component / length + 1)*127.5 / 4)))
                  for component in (x, y)]
    x, y = red/127.5 - 1, green/127.5 - 1
    blue = round((1 + sqrt(max(0, 1 - x*x - y*y))) * 127.5)
    pixels.append((red, green, blue))
normal.putdata(pixels)
normal.save('park-brick-normal.webp', 'WEBP', lossless=True, method=6)
```

Use `sha256sum park-brick-*.webp` to compare the result to the table.
