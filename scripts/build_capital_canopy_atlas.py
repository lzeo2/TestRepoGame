#!/usr/bin/env python3
"""Build original cutout foliage, without photographs or external input assets.

Pillow is a build-time dependency only. Layout (image origin upper-left):
0 airy eucalyptus, 1 drooping eucalyptus, 2 broad deciduous, 3 compact deciduous.
Four 256-square tiles in a 512-square RGBA atlas, with 12px transparent gutters.
Run normally to regenerate; --check verifies bytes, alpha, gutters and mip detail.
"""
import argparse
import hashlib
import io
import math
from pathlib import Path
import random
from PIL import Image, ImageDraw

SIZE = 512
TILE = 256
GUTTER = 12
SCALE = 3
OUTPUT = Path(__file__).resolve().parents[1] / 'Games/Capital Drive/assets/canopy-clusters.png'


def leaf(draw, x, y, length, width, angle, tint, rng):
    """Asymmetric lance/oval with a pointed tip and a small lit folded edge."""
    c, s = math.cos(angle), math.sin(angle)
    def point(a, b):
        return ((x + a*c - b*s)*SCALE, (y + a*s + b*c)*SCALE)
    outline = [point(-length*.48, 0), point(-length*.2, -width*.48),
               point(length*.2, -width*.42), point(length*.55, 0),
               point(length*.12, width*.48), point(-length*.25, width*.32)]
    draw.polygon(outline, fill=(*tint, 255))
    if rng.random() < .4:
        light = tuple(min(255, int(v*1.12+3)) for v in tint)
        draw.line([point(-length*.3, 0), point(length*.33, 0)], fill=(*light, 255), width=1)


def tile(index):
    rng = random.Random(43170 + index*813)
    image = Image.new('RGBA', (TILE*SCALE, TILE*SCALE), (43, 65, 35, 0))
    draw = ImageDraw.Draw(image)
    eucalyptus = index < 2
    # Uneven tufts separated by real interior sky gaps, rather than a solid disk.
    centers = []
    for i in range(17 if eucalyptus else 23):
        angle = i*2.399963 + rng.uniform(-.22, .22)
        radius = math.sqrt((i+.5)/(17 if eucalyptus else 23))
        x = 128 + math.cos(angle)*radius*86 + rng.uniform(-8, 8)
        y = 121 + math.sin(angle)*radius*(72 if index == 1 else 82)
        centers.append((x, y, rng.uniform(18, 30) if eucalyptus else rng.uniform(23, 33)))
    # Thin grey-brown twig sprays show only through some gaps. No trunk painted in.
    for cx, cy, radius in centers:
        anchor = (128+rng.uniform(-17, 17), 175+rng.uniform(-8, 8))
        draw.line([(anchor[0]*SCALE,anchor[1]*SCALE),(cx*SCALE,cy*SCALE)],
                  fill=(74, 74, 54, 220), width=2 if eucalyptus else 3)
    # Back-to-front foliage gives dark interior leaves and warm daylight surfaces.
    for layer in range(3):
        for cx, cy, radius in sorted(centers, key=lambda v: -v[1]):
            for _ in range(67 if eucalyptus else 91):
                a = rng.random()*math.tau
                r = math.sqrt(rng.random())*radius
                x = cx + math.cos(a)*r
                y = cy + math.sin(a)*r*.79
                if not (GUTTER+5 < x < TILE-GUTTER-5 and GUTTER+5 < y < TILE-GUTTER-5):
                    continue
                tuft_light = .17*math.sin(cx*.071 + cy*.039) + .12*(128-cx)/128
                light = .53 + layer*.18 + .19*(1-y/TILE) + tuft_light + rng.uniform(-.2,.18)
                palette = (68, 91, 57) if eucalyptus else (52, 83, 35)
                tint = tuple(max(14, min(150, int(v*light))) for v in palette)
                length = rng.uniform(5.3, 10.1) if eucalyptus else rng.uniform(3.5, 7.5)
                width = length*rng.uniform(.16,.28) if eucalyptus else length*rng.uniform(.46,.75)
                angle = rng.uniform(.55, 1.6) if index == 1 else rng.uniform(-math.pi, math.pi)
                leaf(draw, x, y, length, width, angle, tint, rng)
    image = image.resize((TILE,TILE), Image.Resampling.LANCZOS)
    # Preserve modest colour complexity and RGBA output; alpha remains antialiased.
    rgb = image.convert('RGB').quantize(colors=48, method=Image.Quantize.MEDIANCUT).convert('RGB')
    rgb.putalpha(image.getchannel('A').point(lambda value: round(value/32)*32 if value<240 else 255))
    # Exact transparent gutter prevents the neighboring tile leaking at small mips.
    alpha = rgb.getchannel('A')
    ad = ImageDraw.Draw(alpha)
    for box in [(0,0,255,GUTTER-1),(0,256-GUTTER,255,255),
                (0,0,GUTTER-1,255),(256-GUTTER,0,255,255)]:
        ad.rectangle(box,fill=0)
    rgb.putalpha(alpha)
    return rgb


def build():
    atlas = Image.new('RGBA',(SIZE,SIZE),(43,65,35,0))
    for index in range(4):
        atlas.paste(tile(index),((index%2)*TILE,(index//2)*TILE))
    atlas=atlas.quantize(colors=40,method=Image.Quantize.FASTOCTREE).convert('RGBA')
    buf=io.BytesIO()
    atlas.save(buf,format='PNG',optimize=True,compress_level=9)
    return atlas,buf.getvalue()


def validate(atlas, payload):
    assert atlas.mode=='RGBA' and atlas.size==(512,512)
    assert len(payload)<=200*1024, f'Atlas over 200KiB: {len(payload)}'
    coverage=[]
    for i in range(4):
        a=atlas.crop(((i%2)*256,(i//2)*256,(i%2+1)*256,(i//2+1)*256)).getchannel('A')
        assert a.getbbox()[0]>=GUTTER and a.getbbox()[1]>=GUTTER
        assert a.getbbox()[2]<=256-GUTTER and a.getbbox()[3]<=256-GUTTER
        count=sum(v>=92 for v in a.tobytes())
        assert 14000<count<38000, f'Tile {i} coverage too sparse/dense: {count}'
        mip=a.resize((32,32),Image.Resampling.BOX)
        assert sum(v>=92 for v in mip.tobytes())>180, f'Tile {i} disappears at distance'
        coverage.append(round(count/65536,3))
    return coverage


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true')
    args=parser.parse_args()
    atlas,payload=build()
    coverage=validate(atlas,payload)
    if args.check:
        assert OUTPUT.read_bytes()==payload, 'Atlas differs from reproducible builder'
    else:
        OUTPUT.parent.mkdir(parents=True,exist_ok=True)
        OUTPUT.write_bytes(payload)
    print(f'PASS canopy atlas: 512x512 RGBA, {len(payload)} bytes, tile coverage {coverage}, sha256 {hashlib.sha256(payload).hexdigest()}')


if __name__=='__main__':
    main()
