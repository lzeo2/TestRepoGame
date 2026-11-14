#!/usr/bin/env python3
"""Export offline street assets from exact retained OSM manifests; never fetch."""
import argparse
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / 'Games/Capital Drive'
SOURCE_KEYS = ('type', 'id', 'version', 'timestamp')
TAG_KEYS = ('name', 'ref', 'gtfs:stop_id', 'shelter', 'bench', 'bus', 'highway', 'public_transport',
            'amenity', 'building', 'brand', 'operator', 'fuel:hydrogen', 'fuel:diesel', 'fuel:octane_91',
            'fuel:octane_95', 'fuel:octane_98', 'fuel:e10', 'fuel:lpg')


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def inside(p, points):
    hit = False
    for a, b in zip(points, points[1:] + points[:1]):
        if (a[1] > p[1]) != (b[1] > p[1]) and p[0] < (b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]:
            hit = not hit
    return hit


def nearest(p, a, b):
    dx, dz = b[0]-a[0], b[1]-a[1]
    t = max(0, min(1, ((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz))) if dx or dz else 0
    q = (a[0]+dx*t, a[1]+dz*t)
    return math.hypot(p[0]-q[0], p[1]-q[1]), q


def build(cache, north_cache):
    map_raw = (GAME/'data/canberra.json').read_bytes()
    north_raw = (GAME/'data/canberra-north.json').read_bytes()
    profile_raw = (GAME/'data/road-profiles.json').read_bytes()
    base, north = json.loads(map_raw), json.loads(north_raw)
    profiles = json.loads(profile_raw)['roads']
    lon0, lat0 = base['meta']['origin']
    def project(lat, lon):
        return [(lon-lon0)*111320*math.cos(math.radians(lat0)), (lat0-lat)*111320]
    def in_bounds(p):
        return any(b['minX'] <= p[0] <= b['maxX'] and b['minZ'] <= p[1] <= b['maxZ'] for b in [base['bounds'], north['bounds']])
    elements, files = {}, []
    manifest = [(cache, name, sha, 'base') for name, sha in base['meta']['sourceHashes'].items() if name.startswith('osm-tile-') and name.endswith('.json')]
    manifest += [(north_cache, f['file'], f['sha256'], 'north') for f in north['meta']['source']['files']]
    for directory, name, expected, region in sorted(manifest, key=lambda x: (x[3], x[1])):
        raw = (directory/name).read_bytes()
        if digest(raw) != expected:
            raise ValueError('Source hash mismatch: '+region+'/'+name)
        files.append({'region': region, 'file': name, 'sha256': expected})
        for e in json.loads(raw)['elements']:
            e = {**e, 'id': int(e['id'])}
            if 'nodes' in e: e['nodes'] = [int(n) for n in e['nodes']]
            key = (e['type'], e['id'])
            # API snapshots may add geometry to otherwise identical records. Compare
            # geographic/tag content, excluding contributor identities and API metadata.
            clean = {k:e[k] for k in ('type','id','version','timestamp','lat','lon','nodes','tags','geometry') if k in e}
            old = elements.get(key)
            if old and old.get('version', 0) == clean.get('version', 0):
                for field in ('lat','lon','nodes','tags'):
                    if field in old and field in clean and old[field] != clean[field]:
                        raise ValueError('Conflicting same-version source: '+str(key))
                clean = {**old, **clean}
            if not old or clean.get('version',0) >= old.get('version',0):
                elements[key] = clean
    def polygon(e):
        if e['type'] != 'way':
            return []
        if e.get('geometry'):
            points = [project(q['lat'], q['lon']) for q in e['geometry']]
        else:
            nodes = [elements.get(('node', key)) for key in e.get('nodes', [])]
            if not nodes or any(n is None for n in nodes):
                return []
            points = [project(n['lat'],n['lon']) for n in nodes]
        return points[:-1] if points and points[0] == points[-1] else points
    def point(e):
        if e['type'] == 'node':
            return project(e['lat'],e['lon'])
        points = polygon(e)
        if not points:
            raise ValueError('Missing way geometry: '+str(e['id']))
        # Area centroid; unlike node mean this does not overweight a detailed edge.
        cross = [a[0]*b[1]-b[0]*a[1] for a,b in zip(points,points[1:]+points[:1])]
        area = sum(cross)
        if abs(area) < .001:
            return [sum(p[i] for p in points)/len(points) for i in (0,1)]
        return [sum((a[i]+b[i])*c for a,b,c in zip(points,points[1:]+points[:1],cross))/(3*area) for i in (0,1)]
    def source(e):
        s = {k:e[k] for k in SOURCE_KEYS if k in e}
        if e['type'] == 'node':
            s.update(lat=e['lat'],lon=e['lon'])
        else:
            s['nodeIds'] = e['nodes']
        return s
    # Index exact world geometry once; safety considers the same exported widths
    # consumed by rendering, not a hard-coded assumption about highway classes.
    cells, buildings = {}, base['buildings']+north['buildings']
    segments = []
    for road in base['roads']+north['roads']:
        if road['type'] in ('footway','path','cycleway','steps','pedestrian','track'):
            continue
        tags = profiles.get(road['id'], road.get('sourceTags',{}))
        width = road['width']
        try:
            if tags.get('width'): width = min(24,max(2.5,float(tags['width'])))
        except (ValueError,TypeError): pass
        for a,b in zip(road['points'],road['points'][1:]):
            segment = (a,b,width,road)
            segments.append(segment)
            for cx in range(math.floor(min(a[0],b[0])/100)-1,math.floor(max(a[0],b[0])/100)+2):
                for cz in range(math.floor(min(a[1],b[1])/100)-1,math.floor(max(a[1],b[1])/100)+2):
                    cells.setdefault((cx,cz),[]).append(segment)
    building_cells = {}
    for building in buildings:
        pp=building['points']
        for cx in range(math.floor(min(q[0] for q in pp)/100),math.floor(max(q[0] for q in pp)/100)+1):
            for cz in range(math.floor(min(q[1] for q in pp)/100),math.floor(max(q[1] for q in pp)/100)+1):
                building_cells.setdefault((cx,cz),[]).append(building)
    def nearby(p): return cells.get((math.floor(p[0]/100),math.floor(p[1]/100)),[])
    def clear(p, margin=.15, ignore_roofs=False):
        if any(inside(p,b['points']) for b in building_cells.get((math.floor(p[0]/100),math.floor(p[1]/100)),[]) if not (ignore_roofs and b.get('type')=='roof')):
            return False
        return all(nearest(p,a,b)[0] > width/2+margin for a,b,width,_ in nearby(p))
    def facing(p):
        near = [(nearest(p,a,b)[0],a,b,width,road,nearest(p,a,b)[1]) for a,b,width,road in nearby(p)]
        if not near: return 0, (0,1), None
        _,a,b,width,road,q=min(near,key=lambda n:(n[0],n[4]['id']))
        length=math.hypot(b[0]-a[0],b[1]-a[1]); normal=((b[1]-a[1])/length,-(b[0]-a[0])/length) if length else (0,1)
        if (p[0]-q[0])*normal[0]+(p[1]-q[1])*normal[1]<0:normal=(-normal[0],-normal[1])
        return math.atan2(-normal[0],normal[1]),normal,road
    def rectangle_clear(x,z,w,d,yaw,ignore_roofs=False):
        radius=math.hypot(w,d)/2
        p=(x,z)
        if not clear(p,margin=radius+.15,ignore_roofs=ignore_roofs): return False
        # A circumscribed disc gives conservative clearance for the entire box,
        # including between its corners; sampling corners alone misses thin walls.
        for cx in range(math.floor((x-radius)/100),math.floor((x+radius)/100)+1):
            for cz in range(math.floor((z-radius)/100),math.floor((z+radius)/100)+1):
                for building in building_cells.get((cx,cz),[]):
                    if ignore_roofs and building.get('type')=='roof': continue
                    pp=building['points']
                    if inside(p,pp) or any(nearest(p,a,b)[0]<radius+.15 for a,b in zip(pp,pp[1:]+pp[:1])): return False
        return True
    stops=[];raw_stops=0;excluded=[]
    for e in sorted(elements.values(),key=lambda e:(e['type'],e['id'])):
        t=e.get('tags',{})
        if not (t.get('highway')=='bus_stop' or t.get('public_transport')=='platform'):continue
        raw_stops+=1
        # Bus/tram platforms are distinguishable. Unspecified bus_stop remains bus.
        if t.get('bus')=='no' or t.get('tram')=='yes' and t.get('bus')!='yes':
            excluded.append({'source':source(e),'reason':'non-bus platform'});continue
        p=point(e)
        if not in_bounds(p): excluded.append({'source':source(e),'reason':'outside playable union bounds'});continue
        ref=t.get('gtfs:stop_id',t.get('ref',''))
        duplicate=next((s for s in stops if (ref and ref==s['ref'] and math.hypot(p[0]-s['x'],p[1]-s['z'])<25) or (math.hypot(p[0]-s['x'],p[1]-s['z'])<1.5 and t.get('name')==s['sourceName'])),None)
        if duplicate:
            duplicate['duplicateSources'].append({**source(e),'tags':{k:v for k,v in t.items() if k in TAG_KEYS}});continue
        yaw,normal,road=facing(p)
        s={'id':'bus-stop-'+str(e['id']),'name':'Bus stop '+ref if ref else 'Bus stop','sourceName':t.get('name',''),'ref':ref,'source':source(e),'sourceTags':{k:v for k,v in t.items() if k in TAG_KEYS},'x':p[0],'z':p[1],'positionMethod':'exact source node' if e['type']=='node' else 'source platform polygon centroid','shelter':t.get('shelter','unknown'),'bench':t.get('bench','unknown'),'yaw':yaw,'roadId':road['id'] if road else None,'duplicateSources':[],'furniture':[]}
        def piece(role,x,z,w,d):
            if rectangle_clear(x,z,w,d,yaw):s['furniture'].append({'role':role,'x':x,'z':z,'yaw':yaw})
        piece('pole',*p,.12,.12)
        # Source tags establish presence; layout and dimensions remain estimates.
        if t.get('bench')=='yes':piece('bench',p[0]+normal[0]*.9,p[1]+normal[1]*.9,1.5,.5)
        if t.get('shelter')=='yes':piece('shelter',p[0]+normal[0]*1.1,p[1]+normal[1]*1.1,2.8,1.4)
        stops.append(s)
    fuel_raw=[e for e in elements.values() if e.get('tags',{}).get('amenity')=='fuel']
    fuel_raw.sort(key=lambda e:(not bool(e.get('tags',{}).get('name')),e['type']!='way',e['id']))
    fuels=[];roofs=[e for e in elements.values() if e['type']=='way' and e.get('tags',{}).get('building')=='roof'];claimed_roofs=set()
    for e in fuel_raw:
        t=e['tags'];p=point(e);points=polygon(e)
        if not in_bounds(p):excluded.append({'source':source(e),'reason':'fuel outside playable union bounds'});continue
        duplicate=next((f for f in fuels if inside(p,f['sourcePolygon']) or (points and inside([f['x'],f['z']],points)) or (not t.get('name') and math.hypot(p[0]-f['x'],p[1]-f['z'])<40)),None)
        if duplicate:
            duplicate['duplicateSources'].append({**source(e),'tags':{k:v for k,v in t.items() if k in TAG_KEYS}});continue
        category='hydrogen' if t.get('fuel:hydrogen')=='yes' else 'petrol'
        f={'id':'fuel-'+str(e['id']),'name':('Hydrogen station ' if category=='hydrogen' else 'Capital Fuel ')+str(len(fuels)+1),'category':category,'sourceName':t.get('name',''),'source':source(e),'sourceTags':{k:v for k,v in t.items() if k in TAG_KEYS},'x':p[0],'z':p[1],'positionMethod':'exact source node' if e['type']=='node' else 'source polygon area centroid','sourcePolygon':points,'duplicateSources':[],'canopy':None,'furniture':[]}
        if category=='petrol':
            candidates=[]
            for roof in roofs:
                rp=polygon(roof)
                if not rp:continue
                rc=point(roof);gap=math.hypot(p[0]-rc[0],p[1]-rc[1])
                if roof['id'] not in claimed_roofs and (points and inside(rc,points) or not points and gap<32):candidates.append((gap,roof,rp,rc))
            if candidates:
                _,roof,rp,rc=min(candidates,key=lambda q:(q[0],q[1]['id']));claimed_roofs.add(roof['id'])
                a,b=max(zip(rp,rp[1:]+rp[:1]),key=lambda edge:math.dist(*edge));yaw=math.atan2(b[1]-a[1],b[0]-a[0])
                world_matches=[bb['id'] for bb in buildings if bb.get('type')=='roof' and inside(rc,bb['points'])]
                f['canopy']={'source':source(roof),'points':rp,'x':rc[0],'z':rc[1],'yaw':yaw,'existingRoofIds':world_matches,'obstructingBuildingIds':[bb['id'] for bb in buildings if bb.get('type')!='roof' and inside(rc,bb['points'])],'height':4.2,'heightMethod':'authored estimate; existing source canopy retained'}
                # Existing map roof remains authoritative: do not draw another roof.
                # Original pumps fit inside the sourced canopy, clear all non-roof bodies.
                for offset in (-2,2):
                    q=(rc[0]+math.cos(yaw)*offset,rc[1]+math.sin(yaw)*offset)
                    if all(inside((q[0]+dx,q[1]+dz),rp) for dx in (-.5,.5) for dz in (-.35,.35)) and rectangle_clear(*q,.9,.6,yaw,True):
                        f['furniture'].append({'role':'pump','x':q[0],'z':q[1],'yaw':yaw})
            yaw,_,_=facing(p)
            if rectangle_clear(*p,.6,.2,yaw):f['furniture'].append({'role':'fuel-sign','x':p[0],'z':p[1],'yaw':yaw})
        fuels.append(f)
    return {'version':1,'meta':{'source':'OpenStreetMap contributors','license':'ODbL-1.0','url':'https://www.openstreetmap.org/copyright','mapSha256':digest(map_raw),'northMapSha256':digest(north_raw),'roadProfilesSha256':digest(profile_raw),'sourceFiles':files,'origin':base['meta']['origin'],'bounds':[base['bounds'],north['bounds']],'positionNote':'Source nodes unchanged. Way positions use area centroids; polygon coordinates projected directly. Furniture positions, dimensions and orientation are authored estimates; clearances tested against retained road widths and non-roof buildings. Existing roofs/buildings never replaced.','busRoutesNote':'Stop locations are sourced; ambient game bus circuits are fictional.','deduplicationNote':'Same ref within25m or same name within1.5m for stops; fuel nodes/ways contained by facility polygon, unnamed fuel bodies within40m. Duplicate source records retained.','rawBusStopPlatforms':raw_stops,'rawFuelElements':len(fuel_raw),'excluded':excluded},'busStops':stops,'fuelStations':fuels}


def module(payload):
    return '''// Generated by scripts/build_capital_street_assets.py; local ODbL source data.
function freeze(value) {
  if(value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
export const STREET_ASSETS = freeze('''+json.dumps(payload,separators=(',',':'),sort_keys=True)+''');
export const BUS_STOPS = STREET_ASSETS.busStops;
export const FUEL_STATIONS = STREET_ASSETS.fuelStations;
export const STREET_ASSET_STATS = freeze({stops:BUS_STOPS.length,fuelStations:FUEL_STATIONS.length,sourceFiles:STREET_ASSETS.meta.sourceFiles.length});
export function selectStreetAssets(focus, options={}) {
  if(!focus || !Number.isFinite(focus.x) || !Number.isFinite(focus.z)) return {stops:[],fuelStations:[]};
  const range=Number.isFinite(options.range)?Math.max(0,Math.min(600,options.range)):450;
  const pick=(items,limit,cap)=>items.map(item=>({item,d:(item.x-focus.x)**2+(item.z-focus.z)**2})).filter(v=>v.d<range*range).sort((a,b)=>a.d-b.d || a.item.id.localeCompare(b.item.id)).slice(0,Math.max(0,Math.min(cap,Number.isFinite(limit)?Math.floor(limit):cap))).map(v=>v.item);
  return {stops:pick(BUS_STOPS,options.stopLimit,80),fuelStations:pick(FUEL_STATIONS.filter(f=>f.category==='petrol'),options.fuelLimit,12)};
}
'''


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache',type=Path,required=True)
    parser.add_argument('--north-cache',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--module-output',type=Path,required=True)
    args=parser.parse_args();payload=build(args.cache,args.north_cache)
    args.output.write_text(json.dumps(payload,sort_keys=True,separators=(',',':'))+'\n')
    args.module_output.write_text(module(payload))
    print(json.dumps({'stops':len(payload['busStops']),'fuelStations':len(payload['fuelStations']),'sourceFiles':len(payload['meta']['sourceFiles']),'sha256':digest(args.output.read_bytes())},sort_keys=True))


if __name__=='__main__':main()
