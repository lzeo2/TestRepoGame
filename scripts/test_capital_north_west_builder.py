#!/usr/bin/env python3
"""Small offline source-import regression; no downloads or geospatial packages."""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from build_capital_north_west import build


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


if __name__ == '__main__':
    unittest.main()
