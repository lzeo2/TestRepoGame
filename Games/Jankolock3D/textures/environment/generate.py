"""Original deterministic material paintings. Offline authoring only; Pillow, no downloads.
Run: python3 -B Games/Jankolock3D/textures/environment/generate.py
All motifs are algorithmic masonry, painted signs, metal and leaves, not reference pixels.
"""
from pathlib import Path
import random
import shutil
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).parent
FLOOR = 2178940928

def save(image, name):
    # Check immediately before every asset write, including regeneration.
    if shutil.disk_usage(OUT).free < FLOOR:
        raise SystemExit('Disk floor: stop asset generation')
    image.save(OUT / name, optimize=True)

for name, base, bw, bh in [('brick', (137, 79, 54), 128, 64), ('limestone', (190, 181, 154), 256, 128)]:
    rng = random.Random(92 if name == 'brick' else 38)
    color = Image.new('RGB', (512, 512)); rough = Image.new('L', (512, 512)); ao = Image.new('L', (512, 512))
    cp, rp, ap = color.load(), rough.load(), ao.load()
    for y in range(512):
        for x in range(512):
            xx = (x + (bw//2 if (y//bh)%2 else 0)) % bw
            yy = y % bh
            seam = min(xx, bw-1-xx, yy, bh-1-yy)
            grain = rng.randrange(-8, 9)
            block = random.Random((y//bh)*103 + (x + (bw//2 if (y//bh)%2 else 0))//bw).randrange(-12, 13)
            if seam < 3:
                cp[x,y] = tuple(max(0, c-36+grain) for c in (134,126,108)); rp[x,y] = 241; ap[x,y] = 125
            else:
                cp[x,y] = tuple(max(0,min(255,c+grain+block)) for c in base)
                rp[x,y] = min(255, 205+grain+seam%7); ap[x,y] = 196 if seam < 6 else 255
    save(color, name+'-color.png'); save(rough, name+'-rough.png'); save(ao, name+'-ao.png')

# One 1024px atlas, four authored signs. Typography and drafting motifs are original.
atlas = Image.new('RGB', (1024,1024)); d = ImageDraw.Draw(atlas)
font = ImageFont.load_default(size=64); small = ImageFont.load_default(size=30)
for i,(title,sub,bg,ink) in enumerate([
    ('GRAFT WORKS','PAPER / PRINT / REPAIR',(109,51,34),(237,213,164)),
    ('MIDWAY TRUST','EVERY SHEET ACCOUNTED FOR',(41,56,66),(222,204,155)),
    ('GREENHEDGE','SEEDS / STEMS / STATIONERY',(64,79,47),(231,220,171)),
    ('FOLD & FILE','A PLACE FOR LOOSE ENDS',(187,147,78),(48,43,37))]):
    y=i*256; d.rectangle((0,y,1023,y+255),fill=bg)
    d.rectangle((12,y+12,1011,y+243),outline=ink,width=5)
    d.rectangle((24,y+24,999,y+231),outline=ink,width=2)
    # Folded-sheet emblem, not borrowed advertising art.
    d.polygon([(45,y+60),(120,y+60),(147,y+86),(147,y+188),(45,y+188)],outline=ink,width=5)
    d.line([(120,y+60),(120,y+86),(147,y+86)],fill=ink,width=4)
    for yy in range(y+108,y+180,18): d.line((60,yy,130,yy),fill=ink,width=3)
    d.text((185,y+64),title,font=font,fill=ink)
    d.text((190,y+155),sub,font=small,fill=ink)
save(atlas,'signs-color.png')

rng=random.Random(314)
metal=Image.new('RGB',(512,512)); rough=Image.new('L',(512,512)); ao=Image.new('L',(512,512))
m,r,a=metal.load(),rough.load(),ao.load()
for y in range(512):
    for x in range(512):
        edge=min(x%128,127-x%128,y%64,63-y%64)
        n=rng.randrange(-9,10); groove=edge<3
        m[x,y]=(48+n,57+n,59+n) if groove else (93+n,101+n,100+n)
        r[x,y]=195 if groove else 145+n
        a[x,y]=135 if groove else (218 if edge<7 else 255)
save(metal,'metal-color.png');save(rough,'metal-rough.png');save(ao,'metal-ao.png')

# Dense leaf mosaic for the curved canopy meshes and inset ivy patches.
leaf=Image.new('RGB',(512,512),(49,67,30));d=ImageDraw.Draw(leaf)
for _ in range(2200):
    x,y=rng.randrange(-10,512),rng.randrange(-10,512);v=rng.randrange(-16,25)
    d.ellipse((x,y,x+rng.randrange(8,23),y+rng.randrange(5,15)),fill=(77+v,97+v,39+v//2))
save(leaf,'foliage-color.png')
print('environment textures:', sum(p.stat().st_size for p in OUT.glob('*.png')), 'bytes')
