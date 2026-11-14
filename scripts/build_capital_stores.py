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
    (318857045, 'MacDawdles', 'food', 'Manuka'),
    (318857112, 'You Sushi', 'food', 'Manuka'),
    (318857132, 'Kismaybe', 'food', 'Manuka'),
    (330163576, 'Plink', 'retail', 'Manuka'),
    (330163582, 'El Torogoose', 'food', 'Manuka'),
    (4069716453, 'Your Cafe', 'food', 'Manuka'),
    (4069716454, 'Caps Lock', 'food', 'Manuka'),
    (4069717184, 'Belloucies', 'food', 'Manuka'),
    (4069717215, 'Up Town Milk Bar', 'food', 'Manuka'),
    (4069724219, 'Thrilld', 'food', 'Manuka'),
    (4115262967, 'Receipt Cafe', 'food', 'Manuka'),
    (4926066423, 'Patisseriously', 'food', 'Manuka'),
    (9470234894, 'Sombreroll', 'food', 'Manuka'),
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


def locate(source, world, profiles, allocated):
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
        for t in sorted(set([max(0.1,min(0.9,distance(a,closest(point,a,b))/length))]+[i/40 for i in range(4,37)])):
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
                    width = min(6.2, length*0.7, length*t*2-0.5, length*(1-t)*2-0.5)
                    if width < 2.5 or any(distance(face,old_face) < (width+old_width)/2+0.8 for old_face,old_width in allocated):
                        continue
                    candidates.append((d+distance(wall,point)*3,face,approach,normal,road,width,stop))
    if not candidates:
        raise ValueError(f'No clear public frontage for {source["id"]}')
    _, face, approach, normal, road, width, stop = min(candidates,key=lambda c:c[0])
    allocated.append((face,width))
    rnd = lambda v: round(v,3)
    return building, {'x':rnd(approach[0]),'z':rnd(approach[1]),'road':road['name'], 'roadId':road['id'],
        'sourcePosition':{'x':rnd(point[0]),'z':rnd(point[1])}, 'buildingMatch':{'method':'containing footprint' if gap == 0 else 'nearest footprint','distance':rnd(gap)},
        'frontage':{'x':rnd(face[0]),'z':rnd(face[1]),'yaw':rnd(math.atan2(-normal[0],-normal[1])),'width':rnd(width),'confidence':'estimated','allocation':'nonoverlapping source-point-nearest public facade unit'},
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
    stores, allocated = [], []
    for index,(osm_id,name,kind,district) in enumerate(SELECTION):
        source = elements[('node',osm_id)]
        if not (source.get('tags',{}).get('shop') or source.get('tags',{}).get('amenity') in ('cafe','restaurant','fast_food')):
            raise ValueError('Source is not a retail POI')
        dates.add(source['timestamp'])
        building, location = locate(source,world,profiles,allocated)
        stores.append({'id':'store-'+str(osm_id),'name':name,'aliases':[name.lower()], 'type':kind,'radius':4.8,'price':35,'heal':35,'robbery':220+(index%9)*15,
            'sourceName':source['tags']['name'],'source':{key:source[key] for key in ('type','id','lat','lon','version','timestamp')},
            'buildingId':building['id'],'building':{'points':building['points'],'height':building['height']},'district':district,**location})
    return {'version':2,'meta':{'name':'OpenStreetMap contributors','license':'ODbL-1.0','url':'https://www.openstreetmap.org/copyright',
        'sourceDates':sorted(dates),'sourceSnapshotDate':world['meta']['date'],'sourceDateNote':'sourceDates are OSM element modification times; snapshot date is the retained map source date.','sourceFiles':files,'mapSha256':digest(map_bytes),'roadProfilesSha256':digest(profile_bytes),
        'geometryNote':'Exact retained map footprints; estimated street-facing interaction positions, not surveyed entrances.'},'stores':stores}, precincts(elements,world)


def add_north_store(payload, cache):
    """Add the corroborated ground-floor noodle POI without changing the base snapshot."""
    north_bytes = (GAME/'data/canberra-north.json').read_bytes()
    north = json.loads(north_bytes)
    filename = 'osm-map-2-2.json'
    expected = next(f['sha256'] for f in north['meta']['source']['files'] if f['file'] == filename)
    raw = (cache/filename).read_bytes()
    if digest(raw) != expected:
        raise ValueError('Unpinned northern source tile: '+filename)
    elements = {(e['type'],e['id']):e for e in json.loads(raw)['elements']}
    source = elements[('node',5656111023)]
    if source.get('tags',{}).get('amenity') != 'restaurant' or source['tags'].get('name') != '1919 Lanzhou Beef Noodle':
        raise ValueError('Expected retained Lanzhou restaurant POI')
    profiles = {r['id']:r.get('sourceTags',{}) for r in north['roads']}
    allocated = [((s['frontage']['x'],s['frontage']['z']),s['frontage']['width']) for s in payload['stores']]
    building, location = locate(source,north,profiles,allocated)
    if building['id'] != 'osm-584970594' or location['road'] != 'Bunda Street':
        raise ValueError('Noodle shop must match its retained Civic footprint and public frontage')
    payload['stores'].append({'id':'store-5656111023','name':'Lambzhou 1919',
        'aliases':['lambzhou 1919','Lanzhou 1919','1919 Lanzhou Beef Noodle','Lanhou 1919'],
        'type':'food','interiorType':'noodle-shop','radius':4.8,'price':35,'heal':35,'robbery':500,
        'sourceName':source['tags']['name'],'source':{k:source[k] for k in ('type','id','lat','lon','version','timestamp')},
        'buildingId':building['id'],'building':{'points':building['points'],'height':building['height']},'district':'Civic',
        'externalReferences':[
            {'url':'https://1919lanzhoubeefnoodle.com.au/store/canberra-centre/','note':'Official chain identifies Canberra Centre Shop EG11c.'},
            {'url':'https://canberracentre.qicre.com/eat-and-drink/1919-lanzhou-beef-noodle/','note':'Official centre identifies ground floor Bunda Street opposite Garema Place.'}],
        'addressNote':'Shop EG11c, Canberra Centre, Bunda Street: official external references, not an OSM address or surveyed tenant boundary.',
        **location})
    payload['meta']['northMapSha256'] = digest(north_bytes)
    payload['meta']['northSourceFiles'] = [{'file':filename,'sha256':expected}]


def precincts(elements, world):
    """Retain exact source ways; roles and levels are bounded exterior interpretations."""
    lon0, lat0 = world['meta']['origin']
    def points(way):
        return [[round((elements[('node', n)]['lon']-lon0)*111320*math.cos(math.radians(lat0)),3),
                 round((lat0-elements[('node', n)]['lat'])*111320,3)] for n in way['nodes']]
    def record(e):
        return {k:e[k] for k in ('type','id','version','timestamp')}
    retail = elements[('way',31974923)]
    boundary = points(retail)
    nearby_buildings = [b for b in world['buildings'] if any(inside(p,boundary) for p in b['points'])]
    def near(ps, boundary, margin=12):
        return any(inside(p,boundary) or min(distance(p,closest(p,a,b)) for a,b in zip(boundary,boundary[1:])) < margin for p in ps)
    exterior_buildings = [b for b in world['buildings'] if near(b['points'],boundary,150)]
    paths, parking = [], []
    for e in sorted(elements.values(),key=lambda e:(e['type'],e['id'])):
        if e['type'] != 'way' or not e.get('nodes') or not all(('node',n) in elements for n in e['nodes']):
            continue
        tags=e.get('tags',{})
        if tags.get('highway') not in ('footway','pedestrian','path') and tags.get('amenity') != 'parking':
            continue
        ps=points(e)
        if not near(ps,boundary):
            continue
        item={'id':'osm-'+str(e['id']),'points':ps,'sourceType':'osm-way','source':record(e)}
        if tags.get('amenity') == 'parking' and ps[0] == ps[-1]:
            parking.append(item)
        elif tags.get('highway') in ('footway','pedestrian','path'):
            # A mapped passage through an opaque retained footprint is not a walkable exterior.
            if any(inside((a[0]+(b[0]-a[0])*i/12,a[1]+(b[1]-a[1])*i/12),building['points'])
                   for a,b in zip(ps,ps[1:]) for i in range(13) for building in exterior_buildings):
                continue
            paths.append({**item,'width':2.4})
    roads=[{'id':r['id'],'name':r.get('name',''),'points':r['points'],'width':r['width']} for r in world['roads'] if near(r['points'],boundary,18)]
    def building(b,role,levels=None):
        return {'id':b['id'],'points':b['points'],'height':b['height'],'levels':levels or max(1,round(b['height']/3.4)),'role':role}
    result=[{'id':'manuka-retail','name':'Marnooka Village','sourceName':retail['tags']['name'],'boundary':boundary,
        'buildings':[building(b,'street-row') for b in nearby_buildings], 'paths':paths,'parking':parking,'roads':roads,
        'source':{**record(retail),'geometryNote':'Exact retained source geometry; roles are authored exterior interpretations.'}}]
    for way_id,name,role in [(28994904,'Marnooka Terrace','centre'),(220592690,'Marnooka Court','arcade'),(940856905,'Styleish Arcade','arcade'),(940856909,'Marnooka Arcade','arcade')]:
        e=elements[('way',way_id)]; ps=points(e)
        b=next(b for b in world['buildings'] if b['id']=='act-87705-0') if way_id==28994904 else {'id':'osm-'+str(way_id),'points':ps,'height':6.8,'source':'osm'}
        result.append({'id':'precinct-'+str(way_id),'name':name,'sourceName':e['tags']['name'],'boundary':ps,
            'buildings':[building(b,role,2)],'paths':[p for p in paths if near(p['points'],ps,9)],
            'parking':[p for p in parking if near(p['points'],ps,20)],'roads':[r for r in roads if near(r['points'],ps,25)],
            'source':{**record(e),'buildingSource':b.get('source',''),'levelsNote':'Two-level exterior interpretation; Terrace official current guide lower/upper, retained OSM tags one level. No interior plan.' if way_id==28994904 else 'Exact retained OSM outline; source building:levels=2, height estimated at 3.4m per level.'}})
    return result


def module(entries, export):
    return ('// Generated by scripts/build_capital_stores.py from pinned retained source tiles.\n'
        '// sourceName is attribution only. Display names are original parodies.\n'
        'function freeze(value) {\n  if (value && typeof value === "object") {\n    Object.values(value).forEach(freeze);\n    Object.freeze(value);\n  }\n  return value;\n}\n'
        'export const '+export+' = freeze('+json.dumps(entries,sort_keys=True,indent=2)+');\n')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache',type=Path,required=True)
    parser.add_argument('--north-cache',type=Path,required=True,help='Retained northern OSM source cache for Civic noodle shop')
    parser.add_argument('--output',type=Path,default=GAME/'data/stores.json')
    parser.add_argument('--module-output',type=Path,default=GAME/'stores.js')
    parser.add_argument('--precinct-output',type=Path,default=GAME/'data/shopping-precincts.json')
    parser.add_argument('--precinct-module-output',type=Path,default=GAME/'shopping-precincts.js')
    args = parser.parse_args()
    payload, sites = build(args.cache)
    precinct_meta = dict(payload['meta'])
    add_north_store(payload,args.north_cache)
    args.output.write_text(json.dumps(payload,sort_keys=True,separators=(',',':'))+'\n')
    args.module_output.write_text(module(payload['stores'],'MAPPED_STORES')+'export const LEGACY_SHOP_IDS = Object.freeze(["crescent-kiosk", "manuka-store"]);\n')
    args.precinct_output.write_text(json.dumps({'version':1,'meta':precinct_meta,'precincts':sites,'managedBuildingIds':['act-87705-0']},sort_keys=True,separators=(',',':'))+'\n')
    args.precinct_module_output.write_text(module(sites,'SHOPPING_PRECINCTS')+'export const SHOPPING_BUILDING_IDS = Object.freeze(["act-87705-0"]);\n')
    print(f'{len(payload["stores"])} exact-source retail/food POIs; {len(sites)} source precincts, {len(sites[0]["paths"])} clear source paths, {len(sites[0]["parking"])} source parking areas')

if __name__ == '__main__':
    main()
