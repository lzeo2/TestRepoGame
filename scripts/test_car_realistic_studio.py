#!/usr/bin/env python3
"""Real original car geometry and studio rendering, not gameplay or legal certification."""
import functools
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import shutil
import tempfile
import threading
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SOURCES = sorted(str(p.relative_to(ROOT)) for p in (ROOT/'assets/car-arcade/showcase').iterdir() if p.suffix in {'.js','.html'})
INSPECT = '''async id => {
 const T = await import('/assets/car-arcade/vendor/three.module.js');
 const {createCar} = await import('/assets/car-arcade/showcase/'+id+'.js');
 const car=createCar(), box=new T.Box3().setFromObject(car), size=box.getSize(new T.Vector3());
 const geometries=new Set(), materials=new Set();let triangles=0, meshes=0;
 car.traverse(o=>{if(!o.isMesh)return;meshes++;geometries.add(o.geometry);triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;
 for(const a of Object.values(o.geometry.attributes))if(!Array.from(a.array).every(Number.isFinite))throw Error('Nonfinite geometry');
 if(o.geometry.attributes.uv?.count!==o.geometry.attributes.position.count)throw Error('Missing original material UVs');
 for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);
 });
 const factoryTextures=[...materials].filter(m=>m.map).length;
 const {decorateCar}=await import('/assets/car-arcade/showcase/realism.js');decorateCar(car);
 const textures=new Set();for(const m of materials)for(const v of Object.values(m))if(v?.isTexture)textures.add(v);
 const textureBytes=[...textures].reduce((sum,t)=>sum+(t.image?.width||0)*(t.image?.height||0)*4,0);
 const wheels=car.userData.wheels, cockpit=car.userData.cockpit;
 if(!cockpit || !['eye','target'].every(k=>Array.isArray(cockpit[k]) && cockpit[k].length===3 && cockpit[k].every(Number.isFinite)))throw Error('Missing finite physical cockpit pose');
 if(!box.containsPoint(new T.Vector3(...cockpit.eye)) || cockpit.target[2]>=cockpit.eye[2])throw Error('Cockpit is not inside or facing forward');
 const windows=[...materials].filter(m=>m.name==='window-glass');
 if(!windows.length || !windows.every(m=>m.transparent && m.opacity>=.45 && m.opacity<1 && m.transmission===0))throw Error('Tinted original glazing required');
 const row={factoryTextures,textureBytes,cockpit,name:car.userData.name,front:car.userData.front,showcaseOnly:car.userData.showcaseOnly,triangles,meshes,dimensions:size.toArray(),ground:box.min.y,wheels:wheels.length,wheelGround:wheels.map(w=>new T.Box3().setFromObject(w).min.y),physicalMaterials:[...materials].filter(m=>m.isMeshPhysicalMaterial).length,coatings:[...materials].filter(m=>m.clearcoat>0).length,textures:[...materials].filter(m=>m.map).length};
 const resources=[...geometries,...materials,...textures], counts=resources.map(()=>0);
 resources.forEach((r,i)=>r.addEventListener('dispose',()=>counts[i]++));resources.forEach(r=>r.dispose());
 if(!counts.every(n=>n===1))throw Error('Model resource ownership');return row;
}'''


def main():
    assert shutil.disk_usage(ROOT).free >= 2_000_000_000
    before = {p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in SOURCES}
    output = Path(tempfile.mkdtemp(prefix='car-realistic-studio-'))
    errors=[]
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self,*_): pass
    server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    origin=f'http://127.0.0.1:{server.server_port}'
    print('OUTPUT='+str(output),flush=True)
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
            context=browser.new_context(viewport={'width':1280,'height':1000},has_touch=True)
            page=context.new_page();page.set_default_timeout(20000)
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
            page.on('requestfailed',lambda r:errors.append(r.url+':'+str(r.failure)))
            page.on('response',lambda r:errors.append(f'HTTP {r.status} {r.url}') if r.status>=400 else None)
            def route(r):
                if urlsplit(r.request.url).netloc==urlsplit(origin).netloc:r.continue_()
                else:errors.append('External '+r.request.url);r.abort()
            page.route('**/*',route)
            page.goto(origin+'/assets/car-arcade/showcase/')
            page.wait_for_function('window.carStudioSnapshot?.frames>0 && !carStudioSnapshot.error')
            assert page.evaluate('carStudioSnapshot.refractingMaterials===0 && carStudioSnapshot.singlePassGlass && carStudioSnapshot.framed')
            rows=[]
            for car in ['pip','brindle']:
                row=page.evaluate(INSPECT,car);rows.append(row)
                assert row['front']=='-Z' and row['showcaseOnly'] is True
                assert 1.0<row['cockpit']['eye'][1]<1.4 and abs(row['cockpit']['eye'][0])<.6
                assert 0<row['triangles']<=30000 and row['meshes']<=75
                assert row['wheels']==4 and abs(row['ground'])<.015
                assert all(abs(y)<.015 for y in row['wheelGround'])
                assert row['physicalMaterials']>=1 and row['coatings']>=1 and row['factoryTextures']==0 and row['textures']>=2
                assert 0<row['textureBytes']<=1_048_576
                assert 1.2<row['dimensions'][0]<2.5 and 1<row['dimensions'][1]<2.2 and 2.5<row['dimensions'][2]<5
                frames=page.evaluate('carStudioSnapshot.frames')
                page.locator('#car').select_option(car)
                page.wait_for_function('args=>carStudioSnapshot.id===args.id && carStudioSnapshot.frames>args.frames',arg={'id':car,'frames':frames})
                assert page.evaluate('carStudioSnapshot.refractingMaterials===0 && carStudioSnapshot.singlePassGlass && carStudioSnapshot.framed')
                page.locator('#studio').screenshot(path=str(output/(car+'-front.png')))
                for _ in range(9):page.locator('#right').click()
                page.locator('#studio').screenshot(path=str(output/(car+'-rear.png')))
                page.locator('#reset').click();page.locator('#studio').focus();angle=page.evaluate('carStudioSnapshot.angle')
                page.keyboard.press('ArrowLeft');page.wait_for_function('angle=>carStudioSnapshot.angle<angle',arg=angle)
                # Actual in-car camera, not an overlay or a pose/state setter.
                previous=page.evaluate('carStudioSnapshot.angle')
                cockpit_frames=page.evaluate('carStudioSnapshot.frames')
                page.locator('#cockpit').click()
                page.wait_for_function('frames=>carStudioSnapshot.view==="cockpit" && carStudioSnapshot.frames>frames && !carStudioSnapshot.error',arg=cockpit_frames)
                assert page.locator('#cockpit').get_attribute('aria-pressed')=='true'
                pose=page.evaluate('carStudioSnapshot.cameraLocal')
                assert len(pose)==3 and all(abs(a-b)<.001 for a,b in zip(pose,row['cockpit']['eye'])), {'actual':pose,'expected':row['cockpit']['eye']}
                assert page.evaluate('Object.isFrozen(carStudioSnapshot) && Object.isFrozen(carStudioSnapshot.cameraLocal)')
                page.locator('#studio').screenshot(path=str(output/(car+'-cockpit.png')))
                page.locator('#studio').focus();look=page.evaluate('carStudioSnapshot.look')
                page.keyboard.press('ArrowRight')
                page.wait_for_function('look=>carStudioSnapshot.look<look',arg=look)
                assert abs(page.evaluate('carStudioSnapshot.angle')-previous)<.00001
                page.locator('#reset').click()
                page.wait_for_function('carStudioSnapshot.view==="cockpit" && Math.abs(carStudioSnapshot.look)<.00001')
                # Switch real models while staying inside; both seating poses work.
                other='brindle' if car=='pip' else 'pip'
                page.locator('#car').select_option(other)
                page.wait_for_function('id=>carStudioSnapshot.id===id && carStudioSnapshot.view==="cockpit"',arg=other)
                page.locator('#car').select_option(car)
                page.wait_for_function('id=>carStudioSnapshot.id===id && carStudioSnapshot.view==="cockpit"',arg=car)
                page.locator('#studio').focus();page.keyboard.press('Escape')
                page.wait_for_function('carStudioSnapshot.view==="exterior" && carStudioSnapshot.framed')
                assert page.locator('#cockpit').get_attribute('aria-pressed')=='false'
                page.keyboard.press('c');page.wait_for_function('carStudioSnapshot.view==="cockpit"')
                page.keyboard.press('c');page.wait_for_function('carStudioSnapshot.view==="exterior"')
                print(json.dumps(row),flush=True)
            assert page.evaluate('carStudioSnapshot.garageTriangles>100 && carStudioSnapshot.garageTriangles<=15000 && carStudioSnapshot.garageMeshes>4 && carStudioSnapshot.garageMeshes<=35')
            assert page.evaluate('carStudioSnapshot.textureCount>4 && carStudioSnapshot.textureCount<=24'), 'Generated-texture lifetime budget'
            # Real accessible touch controls at phone width, no pose/state setters.
            page.set_viewport_size({'width':390,'height':844})
            page.wait_for_function('document.documentElement.scrollWidth<=innerWidth && carStudioSnapshot.framed')
            angle=page.evaluate('carStudioSnapshot.angle');page.locator('#left').tap()
            page.wait_for_function('angle=>carStudioSnapshot.angle<angle',arg=angle)
            page.screenshot(path=str(output/'390-brindle.png'))
            page.locator('#cockpit').tap();page.wait_for_function('carStudioSnapshot.view==="cockpit"')
            look=page.evaluate('carStudioSnapshot.look');page.locator('#right').tap()
            page.wait_for_function('look=>carStudioSnapshot.look<look',arg=look)
            page.locator('#reset').tap();page.wait_for_function('Math.abs(carStudioSnapshot.look)<.00001')
            for selector in ['#cockpit','#left','#right','#reset']:
                box=page.locator(selector).bounding_box();assert box['width']>=44 and box['height']>=44
            page.screenshot(path=str(output/'390-cockpit.png'))
            page.locator('#cockpit').tap();page.wait_for_function('carStudioSnapshot.view==="exterior" && carStudioSnapshot.framed')
            page.reload();page.wait_for_function('carStudioSnapshot.frames>0 && !carStudioSnapshot.error')
            assert page.evaluate('carStudioSnapshot.id')=='pip'
            assert page.evaluate('carStudioSnapshot.revision')=='160'
            browser.close()
        after={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in SOURCES}
        assert before==after and not errors,errors
        assert sum(p.stat().st_size for p in output.glob('*.png'))<=10_000_000
        assert shutil.disk_usage(ROOT).free>=2_000_000_000
        result={'sources':before,'rows':rows,'errors':errors,'images':[p.name for p in output.glob('*.png')],'free_bytes':shutil.disk_usage(ROOT).free}
        (output/'results.json').write_text(json.dumps(result,indent=2)+'\n')
        print('PASS actual rounded geometry/tint/garage and physical cockpit; keyboard/touch/reset/selection/reload; no photorealism/hardware/legal certification.',flush=True)
    except Exception:
        print('FAIL errors='+json.dumps(errors),flush=True)
        raise
    finally:
        server.shutdown();server.server_close();thread.join(timeout=3)

if __name__=='__main__':main()
