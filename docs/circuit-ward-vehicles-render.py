"""Render two SVG concept illustrations. No game assets or gameplay are generated.

Run from the repository root: python3 docs/circuit-ward-vehicles-render.py
Existing local Chromium, Playwright, PIL and vendored fonts only.
"""
import asyncio
import html
import math
from pathlib import Path
import shutil
import sys
import tempfile

from PIL import Image
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(tempfile.gettempdir()) / 'circuit-vehicle-amendment'
INK, CREAM, BLUE, AMBER = '#17232d', '#eee8d9', '#527386', '#d69944'
TIERS = (
    ('Scout Hover-Runner', 1.65, .65, 2.40, 1600, '#527386'),
    ('Rail-Van', 2.05, .90, 3.00, 2400, '#6b8494'),
    ('Aegis-Goliath', 2.80, 1.25, 3.90, 4000, '#344f62'),
)


def shade(color, factor):
    return '#' + ''.join(f'{min(255, round(int(color[i:i+2], 16)*factor)):02x}' for i in (1, 3, 5))


def text(x, y, value, size=18, color=INK, display=False, bold=False):
    family = 'Bungee' if display else 'Atkinson'
    return (f'<text x="{x}" y="{y}" fill="{color}" font-family="{family}" '
            f'font-size="{size}" font-weight="{700 if bold else 400}">{html.escape(value)}</text>')


def rect(x, y, w, h, color, radius=4):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{color}"/>'


class Scene:
    """Tiny painter-sorted illustration helper, not runtime vehicle geometry."""
    def __init__(self, camera, target, center, focal):
        self.camera, self.center, self.focal = camera, center, focal
        delta = tuple(b-a for a, b in zip(camera, target))
        length = math.sqrt(sum(v*v for v in delta))
        self.forward = tuple(v/length for v in delta)
        fx, _, fz = self.forward
        length = math.hypot(fx, fz)
        self.right = (fz/length, 0, -fx/length)
        rx, _, rz = self.right
        self.up = (self.forward[1]*rz, fz*rx-fx*rz, -self.forward[1]*rx)
        self.faces = []

    def project(self, point):
        delta = tuple(a-b for a, b in zip(point, self.camera))
        dot = lambda vector: sum(a*b for a, b in zip(delta, vector))
        depth = dot(self.forward)
        if depth <= .08:
            return None
        return (self.center[0]+self.focal*dot(self.right)/depth,
                self.center[1]-self.focal*dot(self.up)/depth, depth)

    def polygon(self, points, color):
        projected = [self.project(p) for p in points]
        # ponytail: discard near-plane faces; fixed concept cameras avoid clipping,
        # use real clipping only if this becomes a general illustration tool.
        if any(p is None for p in projected):
            return
        xy = ' '.join(f'{x:.1f},{y:.1f}' for x, y, _ in projected)
        self.faces.append((sum(p[2] for p in projected)/len(projected),
                           f'<polygon points="{xy}" fill="{color}"/>'))

    def box(self, x, y, z, w, h, d, color):
        a, b, c, e = x-w/2, x+w/2, z-d/2, z+d/2
        self.polygon([(a,y+h,c),(b,y+h,c),(b,y+h,e),(a,y+h,e)], shade(color,1.12))
        face_z = c if self.camera[2] < z else e
        face_x = a if self.camera[0] < x else b
        self.polygon([(a,y,face_z),(b,y,face_z),(b,y+h,face_z),(a,y+h,face_z)],
                     shade(color,.79) if face_z==c else color)
        self.polygon([(face_x,y,c),(face_x,y,e),(face_x,y+h,e),(face_x,y+h,c)],
                     shade(color,.68 if face_x==a else .92))

    def pod(self, x, y, z, w, h, d, color):
        # Chamfered eight-corner extrusion with a broad, flat upper facet.
        a, b, c, e, cut = x-w/2, x+w/2, z-d/2, z+d/2, min(w,d)*.20
        ring = [(a+cut,c),(b-cut,c),(b,c+cut),(b,e-cut),
                (b-cut,e),(a+cut,e),(a,e-cut),(a,c+cut)]
        for i, (px,pz) in enumerate(ring):
            qx,qz = ring[(i+1)%8]
            if (qz-pz)*(self.camera[0]-(px+qx)/2) - (qx-px)*(self.camera[2]-(pz+qz)/2) > 0:
                self.polygon([(px,y,pz),(qx,y,qz),(qx,y+h,qz),(px,y+h,pz)],
                             shade(color,(.80,.72,.90,1,.85,.65,.72,.82)[i]))
        self.polygon([(px,y+h,pz) for px,pz in ring],shade(color,1.12))

    def shield(self, x, y, z, w, h, axis):
        corners = [(-.5,0),(-.27,-.5),(.27,-.5),(.5,0),(.27,.5),(-.27,.5)]
        def plane(offset):
            return [(x+offset if axis=='x' else x+a*w, y+b*h,
                     z+a*w if axis=='x' else z+offset) for a,b in corners]
        front, back = plane(.045), plane(-.045)
        self.polygon(back,shade(CREAM,.75))
        for i in range(len(corners)):
            following = (i+1)%len(corners)
            self.polygon([front[i],front[following],back[following],back[i]],BLUE)
        self.polygon(front,CREAM)

    def svg(self):
        return ''.join(s for _,s in sorted(self.faces, key=lambda face:-face[0]))


def vehicle(scene, tier):
    _, w, h, d, _, hue = TIERS[tier-1]
    pod_w = w*.23
    zs = [0] if tier==1 else ([-d*.27,d*.27] if tier==2 else [-d*.31,0,d*.31])
    pod_d = d*.94 if tier==1 else d*(.39 if tier==2 else .29)
    for side in (-1,1):
        for z in zs:
            x = side*(w/2-pod_w/2)
            scene.pod(x,.09,z,pod_w,h*.42,pod_d,hue)
            scene.box(x,.09+h*.42,z,pod_w*.63,.028,pod_d*.62,CREAM)
            scene.box(x,.16,z+pod_d*.27,pod_w*.64,.045,.06,AMBER)
            for dz in (-.12,0,.12):
                scene.box(x,.105,z+dz,pod_w*.71,.026,.025,INK)
    scene.pod(0,.17,0,w*.70,h*.30,d*.74,hue)
    scene.pod(0,.17+h*.30,0,w*.60,.055,d*.68,CREAM)
    # Open seat/recess, no cockpit, glazing, roof or instrument cluster.
    scene.box(0,.22+h*.30,-d*.19,w*.24,.035,d*.23,INK)
    for side in (-1,1):
        scene.box(side*w*.24,h*.68,-d*.03,.06,.045,d*.48,CREAM)
    if tier==1:
        scene.box(0,h-.10,d*.17,.15,.10,d*.41,AMBER)
    elif tier==2:
        for side in (-1,1):
            scene.box(side*w*.16,h*.65,d*.25,.10,.09,d*.39,hue)
            scene.box(side*w*.16,h*.65+.09,d*.25,.065,.025,d*.35,CREAM)
            scene.box(side*w*.32,h*.50,0,.13,.05,d*.50,hue)
        scene.pod(0,h-.20,d*.10,.32,.20,d*.31,AMBER)
        scene.pod(0,h*.51,d*.33,w*.48,.12,.16,CREAM)
    else:
        scene.box(0,h*.61,d*.12,.23,.17,d*.55,AMBER)
        scene.box(0,h*.78,d*.12,.13,.045,d*.48,CREAM)
        for side in (-1,1):
            scene.shield(side*w*.35,h*.78,-d*.15,d*.29,h*.44,'x')
            scene.shield(side*w*.22,h*.78,d*.31,w*.29,h*.44,'z')
            scene.box(side*w*.26,h*.43,0,.18,.10,d*.57,hue)


def walker(scene,x,z,friendly=False):
    hue = BLUE if friendly else '#bf884a'
    for side in (-1,1):
        scene.box(x+side*.28,0,z,.42,.20,.54,BLUE)
        scene.box(x+side*.28,.20,z,.22,.61,.24,hue)
        scene.box(x+side*.62,.88,z,.23,.49,.26,CREAM)
    scene.pod(x,.77,z,.85,.69,.48,hue)
    scene.box(x,1.03,z-.25,.48,.16,.035,INK)
    scene.pod(x,1.46,z,.59,.40,.39,CREAM)
    scene.box(x,1.61,z-.21,.43,.12,.035,INK)
    scene.box(x,1.62,z-.235,.25,.025,.015,AMBER)


def fps():
    s = Scene((0,1.18,-1.8),(0,1.18,15),(640,340),760)
    for x in range(-10,11,4):
        s.box(x,0,20,3.92,5,.35,CREAM)
        s.box(x,.25,19.8,3.75,.12,.05,BLUE)
        s.box(x,3.0,19.8,2.95,.09,.04,'#9b9b90')
    for side in (-1,1):
        for z in range(-2,16,2):
            s.box(side*12,0,z,.35,5,1.93,CREAM)
            s.box(side*11.8,.24,z,.05,.12,1.8,BLUE)
    for x in range(-12,13,2):
        s.polygon([(x-.012,0,1),(x+.012,0,1),(x+.012,0,20),(x-.012,0,20)],'#87949a')
    for z in range(2,21,2):
        s.polygon([(-12,0,z),(12,0,z),(12,0,z+.025),(-12,0,z+.025)],'#87949a')
    for x in (-4,4):
        s.polygon([(x-.04,.005,1),(x+.04,.005,1),(x+.04,.005,20),(x-.04,.005,20)],'#c0b69c')
    for x,z in ((-4,10),(4,12),(-7,17),(7,7)):
        s.pod(x,0,z,2.4,1.05,1.2,BLUE)
        for dx in (-.89,.89):
            s.box(x+dx,.17,z-.63,.16,.67,.07,CREAM)
        s.box(x,.77,z-.64,1.6,.12,.06,INK)
    walker(s,-2.2,12)
    walker(s,3.0,15)
    walker(s,-6.2,17,True)
    s.pod(1.8,2.5,11,1.5,.25,.6,CREAM)
    for side in (-1,1):
        s.pod(1.8+side*.52,2.62,11,.46,.10,.65,AMBER)
        s.box(1.8+side*.52,2.725,11,.29,.035,.40,INK)
    content = rect(0,0,1280,720,CREAM,0)+rect(0,340,1280,380,'#5b7483',0)+s.svg()
    # The foreground is a separate camera-composed cutaway illustration of
    # the same Scout's front pods/deck. It is not a GLB or game view-model.
    front = Scene((0,1.18,-1.8),(0,1.18,15),(640,340),760)
    for side in (-1,1):
        front.pod(side*.69,.09,.25,.36,.30,1.95,BLUE)
        front.box(side*.69,.40,.38,.23,.025,1.24,CREAM)
        front.box(side*.69,.23,1.1,.23,.045,.055,AMBER)
        for z in (.40,.53,.66):
            front.box(side*.69,.17,z,.27,.035,.035,INK)
    front.pod(0,.30,.40,1.10,.075,1.45,CREAM)
    front.box(0,.57,.83,.13,.08,.66,AMBER)
    front.box(0,.65,.83,.065,.035,.56,CREAM)
    content += front.svg()
    # Same cream/blue rectangular-muzzle and amber-strip coil-blaster design
    # as the original rendered proposal; this is hand-drawn SVG, not an asset.
    content += '''<path d="M972 655 929 602 879 489 915 462 1048 549 1146 655Z" fill="#17232d"/>
<path d="M879 489 915 462 1024 528 986 560Z" fill="#eee8d9"/>
<path d="M879 489 986 560 977 601 898 544Z" fill="#527386"/>
<path d="M915 462 1024 528 1018 549 910 487Z" fill="#d69944"/>
<path d="M869 480 893 459 925 480 900 507Z" fill="#17232d"/>
<path d="M879 480 894 468 913 481 899 495Z" fill="#eee8d9"/>
<path d="M981 579 1093 650 1047 670 969 614Z" fill="#6b8494"/>
<path d="M1000 583 1090 638 1080 653 991 599Z" fill="#d69944"/>
<path d="M628 360h7m10 0h7m-12-12v7m0 10v7" stroke="#eee8d9" stroke-width="2"/>'''
    content += rect(20,18,780,80,INK,6)
    content += text(36,49,'Circuit Ward / vehicle amendment',23,CREAM,True)
    content += text(36,80,'TIER I    HULL 84 / 100       SCORE 2,480       WAVE 5 / 6',20,CREAM,False,True)
    content += rect(906,18,354,46,INK,6)+text(922,48,'CONCEPT — NOT GAMEPLAY',18,CREAM,False,True)
    content += rect(20,590,310,42,INK,6)+text(36,618,'E  Exit  /  Open first-person seat',18,CREAM)
    labels = ('1  RAM','2  FLUX BURST','3  BARRIER CACHE','4  SPEED STACK')
    for i,label in enumerate(labels):
        content += rect(20+i*311,650,307,50,'#000000',4)+text(36+i*311,682,label,20,CREAM,False,True)
    return content


def lineup():
    content = rect(0,0,1280,720,CREAM,0)
    content += text(28,48,'Circuit Ward / vehicle amendment',26,INK,True)
    content += text(28,81,'One open-seat family. Scale, extension plates and pod count change by tier.',20)
    content += rect(913,100,338,38,INK,6)+text(929,126,'CONCEPT — NOT GAMEPLAY',18,CREAM,False,True)
    for i,(name,w,h,d,tris,hue) in enumerate(TIERS):
        cx = 214+i*426
        # Identical camera distance/focal length preserves meaningful scale.
        s = Scene((5.3,4.3,6.3),(0,.35,0),(cx,340),650)
        s.polygon([(-1.60,0,-2.30),(1.60,0,-2.30),(1.60,0,2.30),(-1.60,0,2.30)],'#9aaebb')
        s.polygon([(-w*.48,.012,-d*.45),(w*.48,.012,-d*.45),(w*.48,.012,d*.45),(-w*.48,.012,d*.45)],'#718899')
        vehicle(s,i+1)
        content += s.svg()
        content += text(cx-186,176,f'TIER {("I","II","III")[i]}',22,INK,True)
        content += text(cx-186,209,name,23,INK,False,True)
        part = ('2 low pods / central coil rail','4 short pods / twin rail forks','6 low pods / 4 flat shield plates')[i]
        content += text(cx-186,500,part,18)
        content += text(cx-186,528,('Compact shared chassis','Shared chassis + extension plates','Unique broad boss-tier chassis')[i],17)
        # Small plan-view schematic is ancillary; the main illustration is 3D.
        content += rect(cx-186,553,69,91,hue,4)
        content += rect(cx-174,564,45,70,CREAM,2)
        content += rect(cx-154,567,6,26,AMBER,0)
        for side in (-1,1):
            for j in range(i+1):
                content += rect(cx-151+side*31,561+j*(64/max(1,i)),10,22,BLUE,2)
        content += text(cx-100,575,f'{w:.2f} W × {h:.2f} H × {d:.2f} D m',17,INK,False,True)
        content += text(cx-100,603,f'≤ {tris:,} triangles / one static mesh',16)
        content += text(cx-100,630,'Open deck / no cockpit',16)
    content += '<path d="M338 231h157m-8-6 8 6-8 6M764 231h157m-8-6 8 6-8 6" stroke="#17232d" stroke-width="1.5" fill="none"/>'
    content += text(368,224,'2× I → II',15)+text(785,224,'2× II → III',15)
    content += rect(20,668,1240,36,INK,6)+text(36,693,'COMPARISON VIEW ONLY  /  Play stays first-person  /  Model wishlist, not delivered assets',18,CREAM)
    return content


def frame(content):
    css = ''.join(f"@font-face{{font-family:{family};src:url('{(ROOT/path).as_uri()}');font-weight:{weight}}}" for family,path,weight in (
        ('Bungee','assets/fonts/bungee/bungee-400-latin.woff2',400),
        ('Atkinson','assets/fonts/atkinson-hyperlegible/atkinson-hyperlegible-400-latin.woff2',400),
        ('Atkinson','assets/fonts/atkinson-hyperlegible/atkinson-hyperlegible-700-latin.woff2',700)))
    return f'<html><head><meta charset="utf-8"><style>{css}body{{margin:0}}svg{{display:block}}</style></head><body><svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">{content}</svg></body></html>'


def check():
    assert 6+2*len(range(-2,16,2)) == 24
    assert [t[4] for t in TIERS] == [1600,2400,4000]
    assert 4*TIERS[2][4] == 16000
    s = Scene((0,1,-2),(0,1,2),(640,360),760)
    assert s.project((0,1,2)) == (640,360,4)
    assert s.project((0,1,-3)) is None
    angled = Scene((5,4,6),(0,.35,0),(640,360),650)
    projected = angled.project((0,.35,0))
    assert abs(projected[0]-640)<1e-9 and abs(projected[1]-360)<1e-9
    sources = {'01-vehicle-fps':frame(fps()), '02-tier-lineup':frame(lineup())}
    assert sum(len(s.encode()) for s in sources.values()) < 80*1024
    assert all('CONCEPT — NOT GAMEPLAY' in s and '<script' not in s for s in sources.values())
    print(f'concept checks PASS; frames=2; HTML bytes={sum(len(s.encode()) for s in sources.values())}')
    return sources


async def main():
    sources = check()
    OUT.mkdir(parents=True,exist_ok=True)
    assert not list(OUT.glob('*.png')), 'Use an empty output directory; do not overwrite review evidence.'
    for name,source in sources.items():
        (OUT/f'{name}.html').write_text(source)
    network = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=shutil.which('chromium'),headless=True,
                                         args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
        try:
            for name in sources:
                page = await browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
                page.on('request',lambda request: network.append(request.url) if request.url.startswith(('http:','https:','ws:','wss:')) else None)
                await page.route('http://**/*',lambda route: route.abort())
                await page.route('https://**/*',lambda route: route.abort())
                await page.goto((OUT/f'{name}.html').as_uri())
                await page.evaluate("Promise.all([document.fonts.load('20px Bungee'),document.fonts.load('20px Atkinson'),document.fonts.load('700 20px Atkinson')])")
                assert await page.evaluate("[...document.fonts].every(f=>f.status==='loaded')")
                await page.screenshot(path=str(OUT/f'{name}.png'),animations='disabled')
                await page.close()
        finally:
            await browser.close()
    assert network == [], network
    for name in sources:
        path = OUT/f'{name}.png'
        with Image.open(path) as image:
            assert image.size == (1280,720)
            image.convert('RGB').quantize(colors=128).save(path,optimize=True)
        print(f'{name}.png: 1280x720; bytes={path.stat().st_size}')
    images = list(OUT.glob('*.png'))
    size = sum(path.stat().st_size for path in images)
    assert len(images)==2 and size<700*1024
    print(f'2 RENDERED CONCEPT illustrations; PNG bytes={size}; external requests=0; not gameplay or built assets')


if __name__ == '__main__':
    if '--check' in sys.argv:
        check()
    else:
        asyncio.run(main())
