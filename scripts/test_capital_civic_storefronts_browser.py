#!/usr/bin/env python3
"""Render and verify the five production Civic storefront meshes with local Chromium."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import io
from pathlib import Path
import shutil
import threading

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
SCENE = """async () => {
   const THREE=await import('/assets/car-arcade/vendor/three.module.js');
   const {createCivicExtrasView}=await import('/Games/Capital Drive/civic-extras-view.js');
   const {EXTRA_STORES}=await import('/Games/Capital Drive/civic-extras.js');
   const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(innerWidth,innerHeight);document.body.append(renderer.domElement);
   const scene=new THREE.Scene();scene.background=new THREE.Color(0xdbdee1);
   scene.add(new THREE.HemisphereLight(0xffffff,0xe2d6be,1.9));const sun=new THREE.DirectionalLight(0xfff0d4,1.45);sun.position.set(-8,11,-13);scene.add(sun);
   const pavement=new THREE.Mesh(new THREE.PlaneGeometry(200,160),new THREE.MeshLambertMaterial({color:0x999589}));pavement.rotation.x=-Math.PI/2;pavement.position.set(-420,-.02,-4405);scene.add(pavement);
   const seen=new Set();
   for(const s of EXTRA_STORES) {
     if(seen.has(s.buildingId))continue;seen.add(s.buildingId);
     const pts=s.building.points;const pos=[];
     for(let i=1;i<pts.length;i++){
       const [x,z]=pts[i-1],[x1,z1]=pts[i];pos.push(x,0,z,x1,0,z1,x1,s.building.height,z1,x,0,z,x1,s.building.height,z1,x,s.building.height,z);
     }
     const g=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();
     scene.add(new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:0xc3b5a2,side:THREE.DoubleSide})));
   }
   const view=createCivicExtrasView(scene,null,()=>0);
   const mesh=scene.getObjectByName('Civic parody storefronts and interpreted skatepark').children[0];
   let beforeCalls=0, beforeTriangles=0, submittedCalls=0, submittedTriangles=0;
   mesh.onBeforeRender=()=>{
     beforeCalls=renderer.info.render.calls;
     beforeTriangles=renderer.info.render.triangles;
   };
   mesh.onAfterRender=()=>{
     submittedCalls=renderer.info.render.calls-beforeCalls;
     submittedTriangles=renderer.info.render.triangles-beforeTriangles;
   };
   const atlas=mesh.material.map.image;
   const ctx=atlas.getContext('2d');
   for(let i=0; i<5; i++){
     const rgba=ctx.getImageData(16,3+25*i,480,20).data;
     let ink=0;for(let j=3;j<rgba.length;j+=4) if(rgba[j]>127)ink++;
     if(ink<650 || ink>8200)throw Error('Missing or filled sign row '+i);
   }
   if(atlas.width!==512 || atlas.height!==128 || view.stats.textureCount!==1)throw Error('Unexpected atlas size or count');
   window.verifyAway=()=>{
     view.update({x:10000,z:10000});
     if(view.stats.drawnTriangles || view.stats.drawCalls)throw Error('Distant geometry submitted');
     let releases=0;mesh.material.map.addEventListener('dispose',()=>releases++);
     view.dispose();view.dispose();
     if(releases!==1)throw Error('Atlas disposal count '+releases);
   };
   window.photo=i=>{
      const s=EXTRA_STORES[Math.min(i,4)],f=s.frontage,a=f.yaw+Math.PI,c=new THREE.PerspectiveCamera(i===5?61:33,innerWidth/innerHeight,.08,100);
      const d=s.name==="Chappy's"?5.1:6.7, u=s.name==="Landspin Records"?3.5:1.15;
      const pos=(u,y,d)=>new THREE.Vector3(f.x+Math.cos(a)*u+Math.sin(a)*d,y,f.z-Math.sin(a)*u+Math.cos(a)*d);
      if(i===5){
        const ref=EXTRA_STORES[1].frontage,an=ref.yaw+Math.PI;const p=(t,h,n)=>new THREE.Vector3(ref.x+Math.cos(an)*t+Math.sin(an)*n,h,ref.z-Math.sin(an)*t+Math.cos(an)*n);
        c.position.copy(p(3,2.0,8));c.lookAt(p(-4,1.68,0));view.update(ref);
      }else{c.position.copy(pos(u,1.78,d));c.lookAt(pos(0,1.72,0));view.update(f);}
      submittedCalls=0;submittedTriangles=0;
      renderer.render(scene,c);
      if(submittedTriangles!==view.stats.drawnTriangles)throw Error('GPU submission differs from culling range');
      return {name:s.name,drawn:submittedTriangles,total:view.stats.triangles,draws:submittedCalls};
   };
 }"""

CAPTIONS = [
    ('Wham Comics', 'GAREMA PLACE'), ('Landspin Records', 'GAREMA PLACE'),
    ('Via Doughce', 'BUNDA STREET'), ('Decent Games', 'GAREMA PLACE'),
    ('Chappy’s', 'GAREMA PLACE'), ('Garema Place', 'TWO ADJACENT TENANCIES'),
]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


def save_gallery(frames, path):
    from PIL import Image, ImageDraw, ImageFont
    sheet = Image.new('RGB', (984, 835), '#151b20')
    draw = ImageDraw.Draw(sheet)
    try:
        title = ImageFont.truetype('DejaVuSans.ttf', 18)
        detail = ImageFont.truetype('DejaVuSans.ttf', 10)
    except OSError:
        title = ImageFont.load_default(size=18)
        detail = ImageFont.load_default(size=10)
    for i, (raw, (shop, street)) in enumerate(zip(frames, CAPTIONS, strict=True)):
        photo = Image.open(io.BytesIO(raw)).convert('RGB')
        x, y = 12 + i % 2 * 486, 10 + i // 2 * 274
        sheet.paste(photo.resize((474, 238), Image.Resampling.LANCZOS), (x, y))
        draw.text((x, y + 245), shop, font=title, fill='white')
        draw.text((x + 470, y + 252), street, font=detail, anchor='rs', fill='#b7bfc3')
    sheet.save(path, quality=87, method=6)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--preview', type=Path, help='Optional WebP gallery path (requires Pillow)')
    parser.add_argument('--chromium', default=shutil.which('chromium'), help='Browser executable')
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    origin = f'http://127.0.0.1:{server.server_port}'
    threading.Thread(target=server.serve_forever, daemon=True).start()
    errors, frames = [], []

    def local_only(route):
        url = route.request.url
        if url == origin + '/study':
            route.fulfill(status=200, content_type='text/html',
                          body='<style>*{margin:0}canvas{display:block}</style>')
        elif url.startswith(origin + '/'):
            route.continue_()
        else:
            errors.append('Off-origin request ' + url)
            route.abort()

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                executable_path=args.chromium,
                args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
            )
            page = browser.new_page(viewport={'width': 640, 'height': 325}, device_scale_factor=1)
            page.route('**/*', local_only)
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('response', lambda r: errors.append(f'HTTP {r.status} {r.url}') if r.status >= 400 else None)
            page.goto(origin + '/study')
            page.evaluate(SCENE)
            for i, (shop, _) in enumerate(CAPTIONS):
                stats = page.evaluate('i => photo(i)', i)
                assert 0 < stats['drawn'] <= stats['total'] < 1200, (shop, stats)
                assert stats['draws'] == 1, (shop, stats)
                print(f"{shop}: {stats['drawn']} of {stats['total']} triangles")
                if args.preview:
                    frames.append(page.screenshot(timeout=18000))
            page.evaluate('verifyAway()')
            assert not errors, errors
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    if args.preview:
        save_gallery(frames, args.preview)


if __name__ == '__main__':
    main()
