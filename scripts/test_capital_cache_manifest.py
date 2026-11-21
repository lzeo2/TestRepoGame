#!/usr/bin/env python3
"""Focused offline closure checks, without a browser or installed dependencies."""

import hashlib
import json
import subprocess
import sys
from pathlib import Path
import tempfile
import unittest

from build_capital_cache import (
    ManifestError, build_manifest, check_manifest, js_references, render_manifest, check_build_stamps, write_build,
)


class ManifestTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.game = self.root / 'Games/Capital Drive'
        self.game.mkdir(parents=True)
        for name, content in {
            'index.html': '<code id="build-version">000000000000</code><link rel="stylesheet" href="style.css"><script type="module" src="script.js"></script>',
            'script.js': "import {x} from './module.js'; fetch('./data.json');",
            'module.js': "export {x} from './shared.js';",
            'shared.js': 'export const x = 1;',
            'data.json': '{}',
            'unused.json': '{"unused":true}',
            'style.css': "@font-face{src:url('../../assets/font.woff2')}",
            'credits.html': '<a href="https://example.invalid/source">source</a><a href="license.txt">license</a>',
            'license.txt': 'fixture license',
            'service-worker.js': "const buildId = '000000000000'; // Generated build ID\n/* worker version 1 */",
        }.items():
            (self.game / name).write_text(content, encoding='utf-8')
        (self.root / 'assets').mkdir()
        (self.root / 'assets/font.woff2').write_bytes(b'font')

    def test_deduplicated_sorted_closure_and_relative_urls(self):
        manifest = build_manifest(self.root)
        urls = [item['url'] for item in manifest['files']]
        self.assertEqual(urls, sorted(set(urls)))
        self.assertIn('../../assets/font.woff2', urls)
        self.assertIn('shared.js', urls)
        self.assertIn('license.txt', urls)
        self.assertNotIn('unused.json', urls)
        self.assertNotIn('service-worker.js', urls)
        self.assertTrue(all(not url.startswith('/') for url in urls))

    def test_stable_version_and_drift(self):
        manifest = build_manifest(self.root)
        output = self.game / 'cache-manifest.js'
        output.write_text(render_manifest(manifest), encoding='utf-8')
        self.assertEqual(manifest, build_manifest(self.root))
        self.assertTrue(check_manifest(output, manifest))
        (self.game / 'shared.js').write_text('export const x = 2;', encoding='utf-8')
        changed = build_manifest(self.root)
        self.assertNotEqual(manifest['version'], changed['version'])
        self.assertFalse(check_manifest(output, changed))

    def test_worker_logic_invalidates_version(self):
        before = build_manifest(self.root)
        path = self.game / 'service-worker.js'
        path.write_text(path.read_text().replace('version 1', 'version 2'), encoding='utf-8')
        after = build_manifest(self.root)
        self.assertEqual([f for f in before['files'] if f['url'] != 'index.html'],
                         [f for f in after['files'] if f['url'] != 'index.html'])
        self.assertNotEqual(before['build'], after['build'])
        self.assertNotEqual(before['version'], after['version'])

    def test_stamps_integrity_and_idempotent_write(self):
        manifest = build_manifest(self.root)
        self.assertRegex(manifest['build'], r'^[0-9a-f]{12}$')
        self.assertFalse(check_build_stamps(self.root, manifest))
        write_build(self.root, manifest)
        self.assertTrue(check_build_stamps(self.root, manifest))
        paths = [self.game / name for name in ('index.html', 'service-worker.js', 'cache-manifest.js')]
        written = [p.read_bytes() for p in paths]
        self.assertEqual(build_manifest(self.root), manifest)
        write_build(self.root, build_manifest(self.root))
        self.assertEqual(written, [p.read_bytes() for p in paths])
        self.assertIn(manifest['build'].encode(), paths[0].read_bytes())
        self.assertIn(manifest['build'].encode(), paths[1].read_bytes())
        for entry in manifest['files']:
            data = (self.game / entry['url']).read_bytes()
            self.assertEqual(entry['bytes'], len(data))
            self.assertEqual(entry['sha256'], hashlib.sha256(data).hexdigest())
        self.assertEqual(manifest['workerSha256'], hashlib.sha256(paths[1].read_bytes()).hexdigest())
        seed = {'files': manifest['files'], 'workerSha256': manifest['workerSha256']}
        self.assertEqual(manifest['version'], hashlib.sha256(json.dumps(seed, sort_keys=True, separators=(',', ':')).encode()).hexdigest())

    def test_stale_marker_does_not_seed_new_id_but_fails_check(self):
        manifest = build_manifest(self.root)
        write_build(self.root, manifest)
        for name in ('index.html', 'service-worker.js'):
            with self.subTest(name=name):
                path = self.game / name
                original = path.read_bytes()
                path.write_bytes(original.replace(manifest['build'].encode(), b'ffffffffffff'))
                self.assertEqual(build_manifest(self.root), manifest)
                self.assertFalse(check_build_stamps(self.root, manifest))
                path.write_bytes(original)

    def test_runtime_edits_change_build_but_generated_or_unused_files_do_not(self):
        manifest = build_manifest(self.root)
        write_build(self.root, manifest)
        for name in ('shared.js', 'index.html', 'style.css', 'data.json', 'credits.html'):
            with self.subTest(name=name):
                path = self.game / name
                original = path.read_bytes()
                path.write_bytes(original + b'\n ')
                self.assertNotEqual(build_manifest(self.root)['build'], manifest['build'])
                path.write_bytes(original)
        (self.game / 'cache-manifest.js').write_text('generated fixture metadata')
        (self.game / 'unused.json').write_text('unused fixture metadata')
        self.assertEqual(build_manifest(self.root), manifest)

    def test_missing_duplicate_and_malformed_markers_fail(self):
        for name in ('index.html', 'service-worker.js'):
            path = self.game / name
            original = path.read_text()
            for content in (original.replace('000000000000', 'not-a-build'), original + original):
                with self.subTest(name=name, content=content):
                    path.write_text(content)
                    with self.assertRaisesRegex(ManifestError, 'exactly one generated build ID marker'):
                        build_manifest(self.root)
            path.write_text(original)

    def test_cli_check_rejects_stale_stamps_even_with_expected_manifest(self):
        scripts = self.root / 'scripts'
        scripts.mkdir()
        builder = scripts / 'build_capital_cache.py'
        builder.write_bytes(Path(__file__).with_name('build_capital_cache.py').read_bytes())
        def run(mode):
            return subprocess.run([sys.executable, '-B', str(builder), mode], capture_output=True, text=True)
        self.assertNotEqual(run('--check').returncode, 0)
        self.assertEqual(run('--write').returncode, 0)
        self.assertEqual(run('--check').returncode, 0)
        path = self.game / 'service-worker.js'
        manifest = build_manifest(self.root)
        path.write_text(path.read_text().replace(manifest['build'], 'ffffffffffff'))
        self.assertTrue(check_manifest(self.game / 'cache-manifest.js', manifest))
        self.assertNotEqual(run('--check').returncode, 0)
        self.assertEqual(run('--write').returncode, 0)
        self.assertEqual(run('--check').returncode, 0)

    def test_direct_map_loader_and_url_base(self):
        source = "loadGameData(['./data.json','./shared.js']);new URL('./',import.meta.url);"
        self.assertEqual(js_references(source), ['./data.json','./shared.js','./'])
        (self.game/'script.js').write_text(source,encoding='utf-8')
        files=build_manifest(self.root)['files']
        self.assertTrue(any(file['url']=='data.json' for file in files))

    def test_missing_file_fails(self):
        (self.game / 'shared.js').unlink()
        with self.assertRaisesRegex(ManifestError, 'missing asset'):
            build_manifest(self.root)

    def test_external_runtime_and_repository_escape_fail(self):
        for reference in ('https://example.invalid/module.js', '../../../outside.js', '/absolute.js'):
            with self.subTest(reference=reference):
                (self.game / 'script.js').write_text(f"import '{reference}';", encoding='utf-8')
                with self.assertRaises(ManifestError):
                    build_manifest(self.root)

    def test_quoted_multiline_import_fetch_url_and_comments(self):
        source = '''// import './wrong.js';
        /* fetch("./wrong.json") */
        import {
          x
        } from "./right.js";
        import './side.js';
        export * from './export.js';
        fetch("./right.json");
        new URL('./asset.bin', import.meta.url);
        import('./lazy.js');'''
        self.assertEqual(js_references(source), [
            './right.js', './side.js', './export.js', './right.json', './asset.bin', './lazy.js',
        ])
        with self.assertRaisesRegex(ManifestError, 'dynamic imports'):
            js_references('import(moduleName)')


if __name__ == '__main__':
    unittest.main()
