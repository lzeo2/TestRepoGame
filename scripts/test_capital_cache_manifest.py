#!/usr/bin/env python3
"""Focused offline closure checks, without a browser or installed dependencies."""

from pathlib import Path
import tempfile
import unittest

from build_capital_cache import (
    ManifestError, build_manifest, check_manifest, js_references, render_manifest,
)


class ManifestTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.game = self.root / 'Games/Capital Drive'
        self.game.mkdir(parents=True)
        for name, content in {
            'index.html': '<link rel="stylesheet" href="style.css"><script type="module" src="script.js"></script>',
            'script.js': "import {x} from './module.js'; fetch('./data.json');",
            'module.js': "export {x} from './shared.js';",
            'shared.js': 'export const x = 1;',
            'data.json': '{}',
            'unused.json': '{"unused":true}',
            'style.css': "@font-face{src:url('../../assets/font.woff2')}",
            'credits.html': '<a href="https://example.invalid/source">source</a><a href="license.txt">license</a>',
            'license.txt': 'fixture license',
            'service-worker.js': '/* worker version 1 */',
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
        (self.game / 'service-worker.js').write_text('/* worker version 2 */', encoding='utf-8')
        after = build_manifest(self.root)
        self.assertEqual(before['files'], after['files'])
        self.assertNotEqual(before['version'], after['version'])

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
