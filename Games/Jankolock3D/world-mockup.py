"""Flatten the second AI design, preserving its layout and lettering.

Exactly two image-generation attempts preceded this approved deterministic
transform. No image generation, browser, runtime screenshot or HTML is used.
Coordinates refer to the original 1672x941 design, not production UI geometry.
"""
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'docs/jank3d-design/ui-mockup-world-flat.png'
OUTPUT = ROOT / 'docs/jank3d-design/ui-mockup-world-normalized.png'
PANEL, BODY, ACCENT = '#25292b', '#f1eee5', '#e6bd4a'
BUTTON, WHITE, CANVAS = '#000000', '#ffffff', '#b6c9d0'


def main():
    available = int(subprocess.check_output(['df', '-B1', '/'], text=True).splitlines()[-1].split()[3])
    if available < 2178940928:
        raise RuntimeError(f'Storage floor: {available}')
    source = Image.open(SOURCE).convert('RGB')
    assert source.size == (1672, 941), source.size
    # Posterize then threshold only lettering interiors. Panel texture and
    # generated bevels never enter the output, including the panel boundaries.
    poster = ImageOps.posterize(source, 2)
    result = Image.new('RGB', source.size, CANVAS)
    draw = ImageDraw.Draw(result)
    for rect in [(29, 24, 1646, 189), (29, 651, 492, 761), (29, 793, 1646, 916)]:
        draw.rounded_rectangle(rect, radius=4, fill=PANEL)
    buttons = [(1124, 66, 1265, 132), (1276, 66, 1463, 132),
               (1474, 66, 1625, 132), (1283, 822, 1449, 888), (1461, 822, 1625, 888)]
    for rect in buttons:
        draw.rounded_rectangle(rect, radius=4, fill=BUTTON)
    draw.rectangle((30, 655, 38, 756), fill=ACCENT)
    pixels, out = poster.load(), result.load()
    # Text blocks exclude the noisy generated edges. Body and button letters
    # map to exact tokens, without dithering or antialiasing color ramps.
    regions = [(54, 43, 560, 173), (59, 675, 472, 739), (56, 826, 1050, 887)]
    regions += [(x+8, y+8, r-8, b-8) for x, y, r, b in buttons]
    for left, top, right, bottom in regions:
        for y in range(top, bottom):
            for x in range(left, right):
                r, g, b = pixels[x, y]
                if r >= 170 and g >= 170:
                    is_button = any(l < x < rr and t < y < bb for l, t, rr, bb in buttons)
                    token = ACCENT if x < 134 and y < 70 and b < 170 else WHITE if is_button else BODY
                    out[x, y] = tuple(bytes.fromhex(token[1:]))
    palette = {tuple(bytes.fromhex(c[1:])) for c in [PANEL, BODY, ACCENT, BUTTON, WHITE, CANVAS]}
    assert {color for _, color in result.getcolors()} <= palette
    result.save(OUTPUT)
    print(f'world-mockup: {OUTPUT.relative_to(ROOT)}; {len(result.getcolors())} exact colors; originals unchanged')


if __name__ == '__main__':
    main()
