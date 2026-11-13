#!/usr/bin/env python3
"""Build bounded parody-store sidecars from retained OSM tiles; never fetch or rewrite maps."""
import argparse
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / 'Games/Capital Drive'
# Exact public retail POIs, not address guesses. Names below are provenance only.
SELECTION = [
    (358293199, 'Coals', 'food', 'Manuka'),
    (439239650, 'Paperback Chain', 'retail', 'Manuka'),
    (439239719, 'Newsweak', 'retail', 'Manuka'),
    (6275666787, 'Scoot Wholefoods', 'food', 'Kingston'),
    (12918449444, 'The Book Moo', 'retail', 'Kingston'),
    (12918449448, 'Toe Boots', 'retail', 'Kingston'),
    (11906941518, 'Super Expressive', 'food', 'Red Hill'),
]


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def inside(p, points):
    hit = False
    for a, b in zip(points, points[1:] + points[:1]):
        if (a[1] > p[1]) != (b[1] > p[1]) and p[0] < (b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]:
            hit = not hit
    return hit


def closest(p, a, b):
    dx, dz = b[0]-a[0], b[1]-a[1]
    t = max(0, min(1, ((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz))) if dx or dz else 0
    return (a[0]+dx*t, a[1]+dz*t)


def distance(a, b):
    return math.hypot(a[0]-b[0], a[1]-b[1])


def public(road, profiles):
    tags = profiles.get(road['id'], {})
    access = tags.get('motor_vehicle', tags.get('vehicle', tags.get('access', '')))
    return bool(road.get('name')) and road['type'] != 'service' and access not in ('private', 'no') and tags.get('service') not in ('driveway', 'parking_aisle', 'drive-through', 'emergency_access')


def locate(source, world, profiles):
    lon0, lat0 = world['meta']['origin']
    point = ((source['lon']-lon0)*111320*math.cos(math.radians(lat0)), (lat0-source['lat'])*111320)
    # The containing source footprint is preferred; tiny source offsets may match a nearby outline.
    nearby = [b for b in world['buildings'] if min(distance(point, q) for q in b['points']) < 150]
    matches = sorted(nearby, key=lambda b: (0 if inside(point, b['points']) else 1, min(distance(point, closest(point,a,c)) for a,c in zip(b['points'],b['points'][1:]))))
    building = matches[0]
    gap = 0 if inside(point, building['points']) else min(distance(point,closest(point,a,b)) for a,b in zip(building['points'],building['points'][1:]))
    if gap > 6:
        raise ValueError(f'Unmatched footprint for {source["id"]}: {gap}')
    segments = [(r,a,b) for r in world['roads'] if public(r,profiles) for a,b in zip(r['points'],r['points'][1:]) if distance(point,closest(point,a,b)) < 130]
    def clear(p):
        return not any(inside(p,b['points']) for b in nearby)
    candidates = []
    for a,b in zip(building['points'],building['points'][1:]):
        length = distance(a,b)
        if length < 3:
            continue
        for t in (0.2,0.35,0.5,0.65,0.8):
            wall = (a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t)
            for sign in (-1,1):
                normal = (sign*(b[1]-a[1])/length, -sign*(b[0]-a[0])/length)
                face = (wall[0]+normal[0]*0.22,wall[1]+normal[1]*0.22)
                approach = (wall[0]+normal[0]*2.7,wall[1]+normal[1]*2.7)
                if not clear(face) or not clear(approach):
                    continue
                for road,ra,rb in segments:
                    centre = closest(wall,ra,rb)
                    d = distance(wall,centre)
                    if not 5 < d < 48 or (centre[0]-wall[0])*normal[0]+(centre[1]-wall[1])*normal[1] < d*0.78:
                        continue
                    # Stop on the public roadside, rather than sampling into the carriageway.
                    width = max(2.5,min(24,float(profiles.get(road['id'],{}).get('width',road['width']))))
                    stop = (centre[0]+(wall[0]-centre[0])*(width/2+1)/d,centre[1]+(wall[1]-centre[1])*(width/2+1)/d)
                    if distance(approach,centre) < width/2+0.6:
                        continue
                    if not all(clear((approach[0]+(stop[0]-approach[0])*i/30,approach[1]+(stop[1]-approach[1])*i/30)) for i in range(31)):
                        continue
                    candidates.append((d+distance(wall,point)*3,face,approach,normal,road,min(7,length*0.55),stop))
    if not candidates:
        raise ValueError(f'No clear public frontage for {source["id"]}')
    _, face, approach, normal, road, width, stop = min(candidates,key=lambda c:c[0])
    rnd = lambda v: round(v,3)
    return building, {'x':rnd(approach[0]),'z':rnd(approach[1]),'road':road['name'], 'roadId':road['id'],
        'sourcePosition':{'x':rnd(point[0]),'z':rnd(point[1])}, 'buildingMatch':{'method':'containing footprint' if gap == 0 else 'nearest footprint','distance':rnd(gap)},
        'frontage':{'x':rnd(face[0]),'z':rnd(face[1]),'yaw':rnd(math.atan2(-normal[0],-normal[1])),'width':rnd(width)},
        'publicApproach':{'x':rnd(stop[0]),'z':rnd(stop[1])}, 'entranceNote':'Estimated street-facing interaction frontage; not an observed OSM entrance.'}


def build(cache):
    map_bytes = (GAME/'data/canberra.json').read_bytes()
    profile_bytes = (GAME/'data/road-profiles.json').read_bytes()
    world, profiles = json.loads(map_bytes), json.loads(profile_bytes)['roads']
    elements, files, dates = {}, [], set()
    for path in sorted(cache.glob('osm-tile-*.json')):
        raw = path.read_bytes()
        expected = world['meta']['sourceHashes'].get(path.name)
        if digest(raw) != expected:
            raise ValueError('Unpinned source tile: '+path.name)
        payload = json.loads(raw)
        files.append({'file':path.name,'sha256':digest(raw)})
        if payload.get('osm3s',{}).get('timestamp_osm_base'):
            dates.add(payload['osm3s']['timestamp_osm_base'])
        for item in payload['elements']:
            key = (item['type'],item['id'])
            if key in elements and elements[key] != item:
                raise ValueError('Conflicting duplicate OSM element: '+str(key))
            elements[key] = item
    if len(files) != 18:
        raise ValueError('Expected all 18 pinned OSM tiles')
    stores = []
    for index,(osm_id,name,kind,district) in enumerate(SELECTION):
        source = elements[('node',osm_id)]
        if not source.get('tags',{}).get('shop'):
            raise ValueError('Source is not a retail POI')
        dates.add(source['timestamp'])
        building, location = locate(source,world,profiles)
        stores.append({'id':'store-'+str(osm_id),'name':name,'aliases':[name.lower()], 'type':kind,'radius':4.8,'price':35,'heal':35,'robbery':220+index*15,
            'sourceName':source['tags']['name'],'source':{key:source[key] for key in ('type','id','lat','lon','version','timestamp')},
            'buildingId':building['id'],'building':{'points':building['points'],'height':building['height']},'district':district,**location})
    return {'version':1,'meta':{'name':'OpenStreetMap contributors','license':'ODbL-1.0','url':'https://www.openstreetmap.org/copyright',
        'sourceDates':sorted(dates),'sourceSnapshotDate':world['meta']['date'],'sourceDateNote':'sourceDates are OSM element modification times; snapshot date is the retained map source date.','sourceFiles':files,'mapSha256':digest(map_bytes),'roadProfilesSha256':digest(profile_bytes),
        'geometryNote':'Exact retained map footprints; estimated street-facing interaction positions, not surveyed entrances.'},'stores':stores}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache',type=Path,required=True)
    parser.add_argument('--output',type=Path,default=GAME/'data/stores.json')
    parser.add_argument('--module-output',type=Path,default=GAME/'stores.js')
    args = parser.parse_args()
    payload = build(args.cache)
    args.output.write_text(json.dumps(payload,sort_keys=True,separators=(',',':'))+'\n')
    entries = json.dumps(payload['stores'],sort_keys=True,indent=2)
    args.module_output.write_text('// Generated by scripts/build_capital_stores.py from pinned retained source tiles.\n'
        '// sourceName is attribution only. Render name, which is an original parody.\n'
        'function freeze(value) {\n  if (value && typeof value === "object") {\n    Object.values(value).forEach(freeze);\n    Object.freeze(value);\n  }\n  return value;\n}\n'
        'export const MAPPED_STORES = freeze('+entries+');\n'
        'export const LEGACY_SHOP_IDS = Object.freeze(["crescent-kiosk", "manuka-store"]);\n')
    print(f'{len(payload["stores"])} exact-source retail POIs with clear public-road approaches')

if __name__ == '__main__':
    main()
