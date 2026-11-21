#!/usr/bin/env python3
"""Build a local OSM airport sidecar from nine pinned developer-only API tiles.
Raw downloads stay in --cache outside the repository. No runtime network source.
"""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path
from build_capital_north import ALLOWED, ROAD_TAGS, BUILDING_TAGS, xy

ROOT = Path(__file__).resolve().parents[1]
EXTENT = [149.169, -35.336, 149.217, -35.282]
TERMINAL = 66860402

def build(cache):
    manifest = json.loads((cache / 'manifest.json').read_text())
    objects = {}
    for item in manifest['files']:
        raw = (cache / item['file']).read_bytes()
        assert hashlib.sha256(raw).hexdigest() == item['sha256'], item['file']
        for e in json.loads(raw)['elements']:
            key = (e['type'], e['id'])
            if e.get('version', 0) >= objects.get(key, {}).get('version', 0):
                objects[key] = e
    nodes = {i: e for (kind, i), e in objects.items() if kind == 'node'}
    ways = {i: e for (kind, i), e in objects.items() if kind == 'way'}
    base = json.loads((ROOT / 'Games/Capital Drive/data/canberra.json').read_text())
    def within(n):
        return EXTENT[0] <= n['lon'] <= EXTENT[2] and EXTENT[1] <= n['lat'] <= EXTENT[3]
    roads, buildings, surfaces, areas = [], [], [], []
    aerodrome = None
    for ident, way in sorted(ways.items()):
        tags, refs = way.get('tags', {}), way['nodes']
        if not all(n in nodes for n in refs) or not any(within(nodes[n]) for n in refs):
            continue
        points = [xy(nodes[n]) for n in refs]
        if tags.get('highway') in ALLOWED:
            runs, run = [], []
            for i in range(len(refs)-1):
                if within(nodes[refs[i]]) or within(nodes[refs[i+1]]):
                    if not run: run = [i]
                    run.append(i+1)
                elif run:
                    runs.append(run); run = []
            if run: runs.append(run)
            for indices in runs:
                try: width = float(tags.get('width', '').replace(' m', ''))
                except ValueError:
                    try: width = float(tags.get('lanes', 1 if tags['highway'] == 'service' else 2))*3.25+1
                    except ValueError: width = 7.5
                try: speed = int(tags.get('maxspeed', 40))
                except ValueError: speed = 40
                roads.append(dict(id=f'{ident}-airport-{indices[0]}', sourceId=f'way/{ident}', name=tags.get('name', ''), type=tags['highway'], width=round(max(2.5,min(24,width)),1), speed=speed,
                    oneway=-1 if tags.get('oneway') == '-1' else 1 if tags.get('oneway') in {'yes','1','true'} or tags.get('junction') == 'roundabout' else 0,
                    roundabout=tags.get('junction') == 'roundabout', sourceTags={k:v for k,v in tags.items() if k in ROAD_TAGS}, nodes=[refs[i] for i in indices], points=[points[i] for i in indices]))
        if tags.get('building') and refs[0] == refs[-1] and min(p[0] for p in points) > base['bounds']['maxX']+10:
            try: height = float(tags.get('height', '').replace(' m',''))
            except ValueError:
                try: height = float(tags.get('building:levels', 2))*3.2
                except ValueError: height = 6.4
            if ident == TERMINAL: height = 14
            buildings.append(dict(id=f'osm-{ident}',sourceId=f'way/{ident}',source='osm',name=tags.get('name',''),type=tags['building'],sourceTags={k:v for k,v in tags.items() if k in BUILDING_TAGS or k == 'aeroway'},height=max(2,min(60,height)),heightSource='OSM height' if 'height' in tags else 'estimated terminal massing' if ident == TERMINAL else 'OSM levels estimate' if 'building:levels' in tags else 'visual estimate',points=points))
        if tags.get('aeroway') in {'runway','taxiway','apron'}:
            try: width = float(tags.get('width', 45 if tags['aeroway'] == 'runway' else 18))
            except ValueError: width = 18
            surfaces.append(dict(id=f'airport-surface-{ident}',sourceId=f'way/{ident}',kind=tags['aeroway'],ref=tags.get('ref',''),width=width,widthEstimated='width' not in tags,closed=refs[0] == refs[-1],points=points,sourceTags={k:v for k,v in tags.items() if k in {'aeroway','ref','width','length','surface','runway','heading'}}))
        if ident == 456858759:
            aerodrome=dict(sourceId=f'way/{ident}',points=points,elevationMetres=float(tags['ele']),name=tags['name'])
        if refs[0] == refs[-1] and tags.get('natural') == 'water' and min(p[0] for p in points) > base['bounds']['maxX']:
            areas.append(dict(id=f'airport-water-{ident}',sourceId=f'way/{ident}',type='water',points=points,source='osm'))
    terminal = next(b for b in buildings if b['id'] == f'osm-{TERMINAL}')
    # Anchor a source public terminal access road, never the centroid inside a building.
    candidates = [r for r in roads if r['name'] == 'Terminal Avenue' and not r['sourceTags'].get('access') in {'no','private'}]
    assert candidates and aerodrome
    cx,cz = [sum(p[i] for p in terminal['points'])/len(terminal['points']) for i in range(2)]
    road = min(candidates,key=lambda r:min((p[0]-cx)**2+(p[1]-cz)**2 for p in r['points']))
    p = min(road['points'][1:-1] or road['points'],key=lambda p:(p[0]-cx)**2+(p[1]-cz)**2)
    landmark=dict(id='canberra-airport',name='Canberra Airport',aliases=['CBR','YSCB','airport','terminal'],x=p[0],z=p[1],radius=160,sourceId=road['sourceId'],description='Mapped Terminal Avenue approach, terminal footprint and two runway axes. Original exterior; apron heights are estimates.')
    allpoints=[p for r in roads for p in r['points']]+[p for s in surfaces for p in s['points']]+aerodrome['points']
    bounds=dict(minX=min(p[0] for p in allpoints),maxX=max(p[0] for p in allpoints)+30,minZ=min(p[1] for p in allpoints)-30,maxZ=max(p[1] for p in allpoints)+30)
    return dict(meta=dict(title='Canberra Airport and public road approach',origin=base['meta']['origin'],projection='Local equirectangular metres; x east, z south',source=manifest,sourceExtent=EXTENT,notes=['Source roads retain shared nodes, one-way and access tags; no connecting roads invented.','Only complete OSM building rings strictly east of the existing snapshot are appended; existing geography stays unchanged.','Airport elevation is an OSM ele tag; a uniform apron and east approach interpolation are original estimates, not surveyed terrain or Street View observations.','Terminal height, glazing, canopies and roof details are original estimated geometry.']),bounds=bounds,roads=roads,buildings=buildings,areas=areas,landmarks=[landmark],airport=dict(terminalBuildingId=terminal['id'],aerodrome=aerodrome,surfaces=surfaces,groundEstimate=dict(relativeHeight=25,elevationTagMetres=575,existingDatumMetres=550,blendMetres=1000,status='estimated flat airport with interpolated approach; OSM elevation datum unverified')))

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--cache',type=Path,required=True);p.add_argument('--fetch',action='store_true',help='Download missing files from the existing pinned sidecar; changed live bytes fail verification');p.add_argument('--output',type=Path,default=ROOT/'Games/Capital Drive/data/airport.json');a=p.parse_args()
    assert not a.cache.resolve().is_relative_to(ROOT), 'Raw source cache must stay outside the repository'
    if a.fetch:
        manifest=json.loads(a.output.read_text())['meta']['source']
        a.cache.mkdir(parents=True,exist_ok=True)
        for item in manifest['files']:
            target=a.cache/item['file']
            if not target.exists():
                subprocess.run(['curl','-fsSL','--retry','1','--max-time','55',item['url'],'-o',str(target)],check=True)
            assert hashlib.sha256(target.read_bytes()).hexdigest() == item['sha256'], 'Live source changed: '+item['file']
        (a.cache/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    data=build(a.cache);a.output.write_text(json.dumps(data,separators=(',',':'))+'\n');print(json.dumps({k:len(data[k]) for k in ['roads','buildings','areas']}));print('surfaces',len(data['airport']['surfaces']))
if __name__ == '__main__': main()
