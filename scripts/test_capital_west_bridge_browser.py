#!/usr/bin/env python3
"""Exercise mapped Capital Drive decks and underpasses with native browser input.

Use a fresh external output directory, Chromium, Node and Python Playwright.
Normal Free roam UI travel sets initial positions. The probe drives or walks
with keyboard input and records live support and camera positions. A second
pass compares the recorded camera rays against the production slab geometry.
"""
import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import math
from pathlib import Path
import subprocess
from threading import Thread
import time

from playwright.sync_api import sync_playwright

PREFLIGHT = """
import {loadCapitalMap} from './scripts/capital-map-fixture.mjs';
import {createTerrainSampler} from './Games/Capital Drive/terrain.js';
import {roadProfile} from './Games/Capital Drive/road-network.js';
const map=await loadCapitalMap(), terrain=createTerrainSampler(map);
const cases=JSON.parse(process.argv[2]).map(c=>{
  const road=map.roads.find(r=>r.id===c.road);
  const other=map.roads.find(r=>r.id===c.other);
  if(!road||!other) throw Error('Missing source road '+JSON.stringify(c));
  const project=(a,b,[sx,sz])=>{
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const dx=(b[0]-a[0])/length, dz=(b[1]-a[1])/length;
    const along=(sx-a[0])*dx+(sz-a[1])*dz,t=Math.min(length,Math.max(0,along));
    return {x:a[0]+dx*t,z:a[1]+dz*t,dx,dz,length,t,dist:Math.hypot(a[0]+dx*t-sx,a[1]+dz*t-sz)};
  };
  const p=road.points.slice(1).map((b,i)=>project(road.points[i],b,c.at)).sort((a,b)=>a.dist-b.dist)[0];
  const dir=road.oneway===-1?-1:1;
  const dx=p.dx*dir,dz=p.dz*dir, yaw=Math.atan2(-dx,-dz);
  const lane=Math.min(2.3,roadProfile(road).driveWidth*.23);
  const reach=dir===1?p.t:p.length-p.t;
  const startDist=Math.min(20,Math.max(7,reach-2));
  const compare=terrain.roadHeightAt(road,...c.at), otherY=terrain.roadHeightAt(other,...c.at);
  return {...c,dx,dz,yaw,lane,startDist,compare,otherY,ground:terrain.groundHeightAt(...c.at),
    // Pick the centre line away from the crossing. The normal Return to road
    // button will align the car to the correct left lane.
    start:[p.x-startDist*dx,p.z-startDist*dz]};
});
console.log(JSON.stringify(cases));
"""
CAMERA_SWEEP = """
import {loadCapitalMap} from './scripts/capital-map-fixture.mjs';
import {createTerrainSampler} from './Games/Capital Drive/terrain.js';
import {createShotObstacles} from './Games/Capital Drive/shot-obstacles.js';
const chunks=[];
for await(const chunk of process.stdin) chunks.push(chunk);
const traces=JSON.parse(Buffer.concat(chunks).toString());
const map=await loadCapitalMap(), terrain=createTerrainSampler(map);
const slabs=createShotObstacles({roads:map.roads},{groundHeightAt:()=>-1e6,heightAt:()=>-1e6,
  bridgeSegments:terrain.bridgeSegments});
const result={};
for(const [name, trace] of Object.entries(traces)){
  let inspected=0, blocked=0;
  for(const p of trace){
    const {x,z,y,camera}=p;
    const deck=terrain.bridgeHeightAt(x,z);
    // Follow the camera only while its focus is below a genuine deck and
    // compare the recorded camera pose, not the requested chase position.
    if(!Number.isFinite(deck)||deck-y<2.3) continue;
    const eye=y+1.45, dx=camera.x-x,dy=camera.y-eye,dz=camera.z-z;
    const range=Math.hypot(dx,dy,dz);
    if(range<.2) continue;
    inspected++;
    if(slabs.trace({x,y:eye,z,dx:dx/range,dy:dy/range,dz:dz/range,range})<range-.12) blocked++;
  }
  result[name]={inspected,blocked};
}
console.log(JSON.stringify(result));
"""

CASES = [
    {"name":"kent-lower", "road":"77004916-north-west-0", "other":"667672050-north-west-0", "at":[-3520.77,-478.12]},
    {"name":"kent-foot", "road":"77004916-north-west-0", "other":"667672050-north-west-0", "at":[-3520.77,-478.12], "onFoot":True},
    {"name":"kent-upper", "road":"667672050-north-west-0", "other":"77004916-north-west-0", "at":[-3520.77,-478.12]},
    {"name":"cotter-lower", "road":"77004917-north-west-0", "other":"26651010-north-west-0", "at":[-3934.18,-329.06]},
    {"name":"cotter-upper", "road":"26651010-north-west-0", "other":"77004917-north-west-0", "at":[-3934.18,-329.06]},
    {"name":"glenloch-lower", "road":"669690422-north-west-0", "other":"24147667-north-west-0", "at":[-4599.88,-4176.22]},
    {"name":"schlich-deck", "road":"77004377-north-west-0", "other":"77004377-north-west-0", "at":[-3232.5,-1575.28]},
    {"name":"scrivener-deck", "road":"west-bridge-76997565-0", "other":"west-bridge-76997565-0", "at":[-5779.98,-1979.82]},
    {"name":"glenloch-upper", "road":"24147667-north-west-0", "other":"669690422-north-west-0", "at":[-4599.88,-4176.22]},
]
SNAP = """()=>{const s=capitalDriveSnapshot(),p=s.player;return {
 started:s.started,paused:s.paused,gameMode:s.gameMode,rendering:s.rendering,
 player:Object.fromEntries(['x','z','yaw','speed','supportY','supportX','supportZ','crashes','odometer','offroad'].map(k=>[k,p[k]])),
 actor:s.gameplay.actor,mode:s.gameplay.mode,actorFeetY:s.actorFeetY??null,camera:s.camera,
 focus:{x:s.focus.x,z:s.focus.z},mapView:s.mapView,mapSelection:s.mapSelection,build:document.querySelector('#build-version').textContent}}"""
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*_):
        pass

def snapshot(page):
    return page.evaluate(SNAP)

def await_js(page, expression, seconds=16):
    deadline=time.monotonic()+seconds
    while time.monotonic()<deadline:
        if page.evaluate(expression):
            return
        page.wait_for_timeout(300)
    raise RuntimeError(f'Native state did not reach {expression}')

def select_on_map(page,x,z):
    page.keyboard.press('m')
    canvas=page.locator('#full-map')
    canvas.wait_for(state='visible')
    # At 1x the complete road map fits. Zoom to the mouse/world point,
    # preserving that point's position on screen without changing map data.
    while snapshot(page)['mapView']['zoom']>1.01:
        page.locator('#map-zoom-out').click()
    bounds=canvas.bounding_box()
    size=canvas.evaluate('(c)=>({width:c.width,height:c.height})')
    def point():
        m=snapshot(page)['mapView']
        return (bounds['x']+bounds['width']*((x-m['x'])*m['scale']/size['width']+.5),
                bounds['y']+bounds['height']*((z-m['z'])*m['scale']/size['height']+.5))
    for _ in range(5):
        page.mouse.move(*point())
        page.mouse.wheel(0,-120)
        page.wait_for_timeout(140)
    page.mouse.click(*point())
    selected=snapshot(page)['mapSelection']
    if not selected or math.hypot(selected['x']-x,selected['z']-z)>5:
        raise AssertionError(f'Source start selected {(x,z)} as {selected}')
    page.locator('#teleport-button').click()
    page.keyboard.press('p')
    page.locator('#recover-button').click()
    await_js(page,'!capitalDriveSnapshot().paused')
    page.wait_for_timeout(120)

def driving_trace(page,c,output):
    select_on_map(page,*c['start'])
    before=snapshot(page)
    initial=before['player']; x,z=c['at']; dx,dz=c['dx'],c['dz']
    progress=lambda q:(q['x']-x)*dx+(q['z']-z)*dz
    heading_error=lambda q:math.atan2(math.sin(c['yaw']-q['yaw']),math.cos(c['yaw']-q['yaw']))
    if progress(initial)>-4 or abs(heading_error(initial))>.5:
        raise AssertionError(f'Recovery start did not align: {initial}, progress={progress(initial)}')
    log=[]; held=set()
    on_foot=c.get('onFoot',False)
    target=-3 if on_foot else 9
    page.locator('#world canvas').focus()
    start=time.monotonic()
    try:
        while time.monotonic()-start<34:
            state=snapshot(page); q=state['player']; d=progress(q)
            log.append({"elapsed":round(time.monotonic()-start,3),"crossingDistance":d,"player":q,"camera":state["camera"]})
            if d>=target:
                break
            look=max(7,d+9)
            tx=x+dx*look+dz*c['lane']
            tz=z+dz*look-dx*c['lane']
            yaw=math.atan2(-(tx-q['x']),-(tz-q['z']))
            error=math.atan2(math.sin(yaw-q['yaw']),math.cos(yaw-q['yaw']))
            wanted=set()
            if q['speed']<(4 if on_foot else 7):
                wanted.add('w')
            if error<-.065:
                wanted.add('d')
            elif error>.065:
                wanted.add('a')
            for key in held-wanted:
                page.keyboard.up(key)
            for key in wanted-held:
                page.keyboard.down(key)
            held=wanted
            page.wait_for_timeout(180)
    finally:
        for key in held:
            page.keyboard.up(key)
    nearest=min(log,key=lambda s:abs(s['crossingDistance']))
    # Expected Y checks use live simulation supportY, not camera altitude.
    q=nearest['player']
    reached=log[-1]['crossingDistance']>=target
    foot_trace=[]
    exit_attempts=[]
    valid_y=abs(q.get('supportY',999)-c['compare'])<1.1
    if on_foot and reached:
        # E stops a moving car on the first press. Subsequent presses invoke the
        # actual exit interaction, including its support-layer and clearance checks.
        for _ in range(3):
            page.keyboard.press('e')
            page.wait_for_timeout(250)
            state=snapshot(page)
            exit_attempts.append({'mode':state['mode'],'player':state['player'],'feetY':state['actorFeetY']})
            if state['mode']=='foot':
                break
        if state['mode']=='foot':
            page.keyboard.down('w')
            try:
                deadline=time.monotonic()+16
                while time.monotonic()<deadline:
                    state=snapshot(page); distance=progress(state['actor'])
                    foot_trace.append({"crossingDistance":distance,"feetY":state["actorFeetY"],"actor":state["actor"],"camera":state["camera"]})
                    if distance>=8:
                        break
                    page.wait_for_timeout(270)
            finally:
                page.keyboard.up('w')
        reached=bool(foot_trace and foot_trace[-1]['crossingDistance']>=8)
        nearest_actor=min(foot_trace,key=lambda sample:abs(sample['crossingDistance']),default=None)
        valid_y=bool(nearest_actor and isinstance(nearest_actor['feetY'],(int,float)) and
                  abs(nearest_actor['feetY']-c['compare'])<1.1)
    page.screenshot(path=str(output/(c['name']+'.png')),timeout=18000)
    return {"before":before,"closest":nearest,"trace":log,"reached":reached,"expectedLayer":valid_y,
            "footTrace":foot_trace,"exitAttempts":exit_attempts,"newCrashes":log[-1]['player']['crashes']-initial['crashes']}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1])
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--cases',nargs='+',choices=[c['name'] for c in CASES],default=[c['name'] for c in CASES])
    parser.add_argument('--expected-build')
    parser.add_argument('--preflight',action='store_true')
    parser.add_argument('--allow-findings',action='store_true',help='Record baseline movement/clearance failures without a nonzero status.')
    args=parser.parse_args()
    specs=json.loads(subprocess.check_output(['node','--input-type=module','-',json.dumps([c for c in CASES if c['name'] in args.cases])],
        cwd=args.root,input=PREFLIGHT.encode(),timeout=75))
    if not args.preflight and any(p.exists() for p in [args.output/'receipt.json',*(args.output.glob('*.png'))]):
        parser.error('--output must not contain prior probe results')
    if args.preflight:
        print(json.dumps(specs,indent=2))
        return
    args.output.mkdir(parents=True,exist_ok=True)
    http=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=args.root))
    Thread(target=http.serve_forever,daemon=True).start()
    origin=f'http://127.0.0.1:{http.server_port}'
    report={'method':'Local Free roam UI teleport to return-to-road start with normal W/A/D; native player supportY and swept path','specs':specs,'results':{},'errors':[]}
    try:
        with sync_playwright() as pw:
            b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
            context=b.new_context(viewport={'width':1000,'height':675},service_workers='block')
            context.add_init_script('localStorage.setItem("capital-drive-rendering-v1","performance")')
            page=context.new_page()
            page.on('pageerror',lambda e:report['errors'].append(str(e)))
            page.goto(origin+'/Games/Capital%20Drive/',wait_until='domcontentloaded',timeout=60000)
            await_js(page,'window.capitalDriveSnapshot?.().ready',180)
            report['build']=snapshot(page)['build']
            if args.expected_build:
                assert report['build']==args.expected_build
            assert not snapshot(page)['rendering']['compatibility']
            page.locator('[data-game-mode="free"]').click()
            if page.locator('#guided-tutorial').is_checked():
                page.locator('#guided-tutorial').uncheck()
            page.locator('#start-button').click()
            await_js(page,'capitalDriveSnapshot().started&&!capitalDriveSnapshot().paused')
            for c in specs:
                try:
                    result=driving_trace(page,c,args.output)
                    report['results'][c['name']]=result
                    print(c['name'],result['reached'],result['expectedLayer'],result['newCrashes'],result['closest'],flush=True)
                except Exception as error:
                    report['results'][c['name']]={'error':str(error)}
                    print(c['name'],str(error),flush=True)
                finally:
                    (args.output/'receipt.json').write_text(json.dumps(report,indent=2)+'\n')
            b.close()
    finally:
        http.shutdown()
        (args.output/'receipt.json').write_text(json.dumps(report,indent=2)+'\n')
    tracks={}
    for name,result in report['results'].items():
        if name.endswith('-lower'):
            tracks[name]=[{"x":s['player']['x'],"z":s['player']['z'],"y":s['player'].get('supportY'),"camera":s['camera']}
                          for s in result.get('trace',[]) if isinstance(s['player'].get('supportY'),(int,float))]
        if name.endswith('-foot'):
            tracks[name]=[{"x":s['actor']['x'],"z":s['actor']['z'],"y":s['feetY'],"camera":s['camera']}
                          for s in result.get('footTrace',[]) if isinstance(s['feetY'],(int,float))]
    if tracks:
        report['bridgeCamera']=json.loads(subprocess.check_output(['node','--input-type=module','-e',CAMERA_SWEEP],
            cwd=args.root,input=json.dumps(tracks).encode(),timeout=75))
    (args.output/'receipt.json').write_text(json.dumps(report,indent=2)+'\n')
    for name,stats in report.get('bridgeCamera',{}).items():
        print(name,'camera clearance',stats,flush=True)
    passed=not report['errors'] and all(
        r.get('reached') and r.get('expectedLayer') and r.get('newCrashes')==0
        for r in report['results'].values()
    )
    camera_passed=all(s['inspected']>0 and s['blocked']==0 for s in report.get('bridgeCamera',{}).values())
    return 0 if (passed and camera_passed) or args.allow_findings else 1

if __name__=='__main__':
    raise SystemExit(main())
