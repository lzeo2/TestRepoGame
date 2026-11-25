#!/usr/bin/env python3
"""Build bounded actual housing outlines inside retained regional terrain only.
Raw hash-pinned OSM caches and Shapely are developer-only external inputs.
No invented parcels, roads, houses or geographical/terrain expansion.
"""
import argparse
import collections
import hashlib
import json
import math
from pathlib import Path
from shapely.geometry import Polygon
from shapely.strtree import STRtree
from build_capital_regions import load_source, RESIDENTIAL_TYPES, tagged_number
from build_capital_north import xy

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'Games/Capital Drive/data'
REGIONS=('belconnen','north','south')
LIMIT_PER_REGION=9000
BASES=('canberra.json','canberra-north.json','north-west.json','airport.json',
       'region-belconnen.json','region-north.json','region-south.json')


def build(cache_root,data_dir=DATA):
    prior=[];source_ids=set();ids=set();pins=[]
    for name in BASES:
        raw=(data_dir/name).read_bytes();d=json.loads(raw)
        pins.append(dict(file=name,sha256=hashlib.sha256(raw).hexdigest()))
        for b in d.get('buildings',[]):
            shape=Polygon(b['points'],[h.get('points',h) if isinstance(h,dict) else h for h in b.get('innerRings',[])])
            if shape.is_valid and shape.area>0:prior.append(shape)
            ids.add(str(b['id']));source_ids.add(b.get('sourceId'))
    index=STRtree(prior);added=[];reports=[];sources=[]
    for region in REGIONS:
        pack=json.loads((data_dir/f'region-{region}.json').read_text());bounds=pack['terrain']
        manifest,objects=load_source(cache_root/f'capital-regions-{region}')
        sources.append(dict(region=region,**manifest))
        nodes={e['id']:e for e in objects.values() if e['type']=='node'}
        relation_members={m['ref'] for e in objects.values() if e['type']=='relation' and e.get('tags',{}).get('type')=='multipolygon' and e.get('tags',{}).get('building') for m in e.get('members',[]) if m['type']=='way'}
        counters=collections.Counter();cells=collections.defaultdict(list)
        for e in sorted(objects.values(),key=lambda e:(e['type'],e['id'])):
            tags=e.get('tags',{})
            if e['type']!='way' or tags.get('building') not in RESIDENTIAL_TYPES:continue
            counters['sourceResidentialWays']+=1
            if e['id'] in relation_members:counters['multipolygonMembersOmitted']+=1;continue
            refs=e.get('nodes',[]);source=f'way/{e["id"]}';ident=f'osm-{e["id"]}'
            if source in source_ids or ident in ids:counters['alreadyRetained']+=1;continue
            if len(refs)<4 or len(refs)>160 or refs[0]!=refs[-1] or any(n not in nodes for n in refs):counters['incompleteOrComplex']+=1;continue
            points=[xy(nodes[n]) for n in refs]
            if not all(bounds['minX']<=x<=bounds['maxX'] and bounds['minZ']<=z<=bounds['maxZ'] for x,z in points):counters['outsideRetainedTerrain']+=1;continue
            shape=Polygon(points)
            if not shape.is_valid or not 20<=shape.area<=6000:counters['invalidOrNonHouseScale']+=1;continue
            if any(shape.intersection(prior[int(i)]).area>min(shape.area,prior[int(i)].area)*.05 for i in index.query(shape,predicate='intersects')):counters['overlapsRetained']+=1;continue
            height=tagged_number(tags.get('height'));levels=tagged_number(tags.get('building:levels'))
            height_source='OSM height tag' if height else 'OSM levels estimate' if levels else 'Original massing estimate'
            height=height or (levels*3.2 if levels else 4)
            if not 2<=height<=80:counters['invalidHeight']+=1;continue
            body=dict(id=ident,sourceId=source,source='osm',sourceVersion=e.get('version'),sourceTimestamp=e.get('timestamp'),
                type=tags['building'],height=round(height,2),heightSource=height_source,points=points,
                sourceTags={k:v for k,v in tags.items() if k in {'building','building:levels','height','roof:shape'}},residentialRegion=region)
            x,z=shape.centroid.coords[0];cells[(math.floor(x/250),math.floor(z/250))].append((e['id'],body,shape))
            counters['eligibleAdditional']+=1
        selected=[];new_shapes=[]
        # Stable round-robin across 250m cells avoids spending a quota on one suburb.
        buckets=[sorted(cells[key]) for key in sorted(cells)]
        for depth in range(max((len(b) for b in buckets),default=0)):
            for bucket in buckets:
                if len(selected)>=LIMIT_PER_REGION:break
                if depth>=len(bucket):continue
                _,body,shape=bucket[depth]
                # Existing source IDs across regional cache overlap remain unique.
                if body['sourceId'] in source_ids:counters['duplicateAcrossRegions']+=1;continue
                selected.append(body);new_shapes.append(shape);source_ids.add(body['sourceId']);ids.add(body['id'])
            if len(selected)>=LIMIT_PER_REGION:break
        # Verify the selected source polygons do not overlap one another substantially.
        accepted=[];accepted_shapes=[];local=STRtree(new_shapes)
        for i,(body,shape) in enumerate(zip(selected,new_shapes)):
            if any(j<i and shape.intersection(new_shapes[j]).area>min(shape.area,new_shapes[j].area)*.05 for j in map(int,local.query(shape,predicate='intersects'))):counters['overlapsAdditional']+=1;continue
            accepted.append(body);accepted_shapes.append(shape)
        counters['added']=len(accepted);counters['eligibleNotAdded']=counters['eligibleAdditional']-len(accepted)
        reports.append(dict(region=region,limit=LIMIT_PER_REGION,cells=len(cells),**dict(counters)))
        added.extend(accepted);prior.extend(accepted_shapes);index=STRtree(prior)
    return dict(meta=dict(origin=[149.137,-35.318],source='OpenStreetMap contributors',license='ODbL-1.0',
        licenseUrl='https://opendatacommons.org/licenses/odbl/1-0/',attributionUrl='https://www.openstreetmap.org/copyright',
        method='Actual closed residential ways; retained terrain only; 5 percent polygon overlap exclusion; 250m balanced cells; maximum 9000 per region.',
        requiredRegionIds=list(REGIONS),priorSnapshots=pins,sourceManifests=sources,reports=reports,
        limitations='Not citywide completeness. Untagged and relation-only homes, missing source coverage, invalid/overlapping outlines and quota excess are omitted. Heights and facade details may be estimates.'),roads=[],buildings=added)


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--cache-root',type=Path,required=True);p.add_argument('--output',type=Path,default=DATA/'residential-supplement.json');a=p.parse_args()
    data=build(a.cache_root);a.output.write_text(json.dumps(data,separators=(',',':'))+'\n')
    print(json.dumps(dict(buildings=len(data['buildings']),bytes=a.output.stat().st_size,reports=data['meta']['reports'])))
if __name__=='__main__':main()
