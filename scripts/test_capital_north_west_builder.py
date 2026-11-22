#!/usr/bin/env python3
"""Small offline source-import regression; no downloads or geospatial packages."""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from build_capital_north_west import build, footprint_overlap
from build_capital_north import xy


class SourceImport(unittest.TestCase):
    def test_pinned_source_exact_nodes_no_duplicate_or_invented_segments(self):
        with tempfile.TemporaryDirectory() as directory:
            cache = Path(directory)
            elements = [
                dict(type='node', id=1, lon=149.12, lat=-35.25, tags=dict(place='suburb', name='Lyneham')),
                dict(type='node', id=2, lon=149.13, lat=-35.26, tags=dict(place='suburb', name='Dickson')),
                dict(type='node', id=3, lon=149.125, lat=-35.27),
                dict(type='way', id=99, nodes=[1, 3, 2], tags=dict(highway='primary', oneway='-1', name='Source Street')),
            ]
            raw = json.dumps(dict(elements=elements)).encode()
            source = cache/'source.json'; source.write_bytes(raw)
            (cache/'manifest.json').write_text(json.dumps(dict(files=[dict(file=source.name, sha256=hashlib.sha256(raw).hexdigest())])))
            existing = cache/'existing.json'
            existing.write_text(json.dumps(dict(roads=[dict(nodes=[1, 3])], areas=[dict(sourceId='relation/3400115', points=[[-6000, 0], [-5900, 0], [-6000, 0]])])))
            first = build(cache, [existing])
            self.assertEqual(first, build(cache, [existing]), 'build output is deterministic')
            self.assertEqual(len(first['roads']), 1)
            road = first['roads'][0]
            self.assertEqual(road['nodes'], [3, 2], 'existing source segment is excluded, remaining endpoint IDs stay exact')
            self.assertEqual(road['oneway'], -1)
            self.assertEqual(road['sourceTags']['highway'], 'primary')
            self.assertNotIn('speed', road, 'untagged speed retains class-specific runtime defaults')
            self.assertEqual(first['bounds']['minX'], -6030, 'retained western shoreline is not clipped')
            self.assertEqual(first['buildings'], [])
            self.assertEqual(first['areas'], [])
            self.assertEqual({p['name'] for p in first['landmarks']}, {'Lyneham', 'Dickson'})
            source.write_bytes(raw+b' ')
            with self.assertRaisesRegex(AssertionError, 'Changed source'):
                build(cache, [existing])


    def test_selected_exact_footprints_duplicates_overlap_and_source_heights(self):
        with tempfile.TemporaryDirectory() as directory:
            cache = Path(directory)
            elements = [dict(type='node', id=1, lon=149.12, lat=-35.25, tags=dict(place='suburb', name='Lyneham')),
                        dict(type='node', id=2, lon=149.13, lat=-35.26, tags=dict(place='suburb', name='Dickson')),
                        dict(type='way', id=99, nodes=[1, 2], tags=dict(highway='primary'))]
            def rectangle(ident, west, east, south=-35.251, north=-35.25, **tags):
                refs=[]
                for index, (lon, lat) in enumerate([(west,south),(east,south),(east,north),(west,north)]):
                    ref=ident*10+index;refs.append(ref);elements.append(dict(type='node',id=ref,lon=lon,lat=lat))
                elements.append(dict(type='way',id=ident,nodes=refs+[refs[0]],tags={'building':'retail',**tags}))
                return [xy(dict(lon=lon,lat=lat)) for lon,lat in [(west,south),(east,south),(east,north),(west,north),(west,south)]]
            first=rectangle(901,149.135,149.136,name='Exact shop',**{'building:levels':'2','email':'excluded@example.invalid'})
            rectangle(902,149.135,149.136)
            rectangle(903,149.1355,149.1365)
            rectangle(904,149.136,149.137)
            rectangle(905,149.14,149.141,height='195.2',man_made='communications_tower')
            prior=rectangle(906,149.145,149.146)
            raw=json.dumps(dict(elements=elements)).encode();(cache/'source.json').write_bytes(raw)
            (cache/'manifest.json').write_text(json.dumps(dict(files=[dict(file='source.json',sha256=hashlib.sha256(raw).hexdigest())])))
            existing=cache/'existing.json';existing.write_text(json.dumps(dict(roads=[],buildings=[dict(id='act-prior',points=prior)])))
            result=build(cache,[existing],selected_ways=(901,902,903,904,905,906))
            self.assertEqual(result,build(cache,[existing],selected_ways=(901,902,903,904,905,906)))
            self.assertEqual([b['id']for b in result['buildings']],['osm-901','osm-904','osm-905'])
            shop=result['buildings'][0];self.assertEqual(shop['points'],first);self.assertEqual(shop['height'],6.4)
            self.assertEqual(shop['nodes'],[9010,9011,9012,9013,9010]);self.assertNotIn('email',shop['sourceTags'])
            self.assertEqual(result['buildings'][-1]['height'],195.2,'tall explicit source height is never clamped to an ordinary roof limit')
            self.assertEqual(result['meta']['selectedFootprints']['missing'],[])
            self.assertEqual(len(result['meta']['selectedFootprints']['skipped']),3)
            self.assertEqual(result['areas'],[],'footprint import cannot add unrelated water or parks')
            missing=build(cache,[existing],selected_ways=(999,));self.assertEqual(missing['meta']['selectedFootprints']['missing'],[999])

    def test_overlap_guard_allows_touching_but_rejects_interior_overlap(self):
        square=[[0,0],[2,0],[2,2],[0,2],[0,0]]
        self.assertFalse(footprint_overlap(square,[[2,0],[3,0],[3,2],[2,2],[2,0]]))
        self.assertTrue(footprint_overlap(square,[[1,0],[3,0],[3,2],[1,2],[1,0]]))
        self.assertTrue(footprint_overlap(square,[[0,0],[1,0],[1,2],[0,2],[0,0]]))


if __name__ == '__main__':
    unittest.main()
