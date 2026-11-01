#!/usr/bin/env python3
"""Stdlib only. No Playwright import, network or browser execution."""
import copy
import datetime as dt
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import slipstream_x86_ci as ci


class Guards(unittest.TestCase):
    def setUp(self):
        self.env = {'GITHUB_ACTIONS': 'true', 'GITHUB_RUN_NUMBER': '1', 'GITHUB_RUN_ATTEMPT': '1',
                    'GITHUB_ACTOR': 'lzeo2', 'GITHUB_REPOSITORY': 'lzeo2/TestRepoGame',
                    'GITHUB_REF': ci.BRANCH, 'GITHUB_EVENT_NAME': 'push', 'GITHUB_SHA': 'a' * 40}
        self.lease = {'task': ci.TASK, 'public_base_sha': ci.BASE, 'source_sha': ci.SOURCE,
                      'expires_at': '2099-01-01T00:00:00Z', 'files': copy.deepcopy(ci.PUBLIC),
                      'browser': {'path': '/usr/bin/chromium'},
                      'driver': {'sha256': 'c' * 64},
                      'dependencies': dict(__import__('slipstream_x86_dependencies').BUDGETS,
                                           lock_sha256=ci.digest(__import__('slipstream_x86_dependencies').LOCK)),
                      'sources': {k: {'path': p, 'sha256': 'd' * 64} for k, p in ci.SOURCES.items()}}

    def test_context(self):
        ci.context(self.env)
        for key in self.env.keys() - {'GITHUB_SHA'}:
            with self.subTest(key=key), self.assertRaises(RuntimeError):
                ci.context(dict(self.env, **{key: 'wrong'}))

    def test_paths(self):
        for path in ci.PUBLIC:
            self.assertEqual(ci.public_path(path), path)
        for path in ['/assets/fonts/a', 'assets/fonts/../private', 'assets/fonts//a',
                     'assets/fonts/./a', 'assets/fonts/.private/a', 'assets/fonts/a\\b',
                     'https://evil/a', 'private/a', 'assets/fonts/%2e%2e/a']:
            with self.subTest(path=path), self.assertRaises(RuntimeError):
                ci.public_path(path)

    def test_lease(self):
        self.assertNotEqual(self.lease['source_sha'], self.env['GITHUB_SHA'])
        ci.lease_check(self.lease, self.env)
        for key, value in [('public_base_sha', 'b' * 40), ('source_sha', 'a' * 8), ('source_sha', 'b' * 40),
                           ('expires_at', '2000-01-01T00:00:00Z'), ('files', {}),
                           ('driver', {'sha256': 'bad'}), ('sources', {})]:
            with self.subTest(key=key), self.assertRaises(RuntimeError):
                ci.lease_check(dict(self.lease, **{key: value}), self.env)

    def test_missing_driver_and_python(self):
        with patch.object(ci.os, 'geteuid', return_value=1000), \
             patch.object(ci.platform, 'system', return_value='Linux'), \
             patch.object(ci.platform, 'machine', return_value='x86_64'), \
             patch.object(ci.shutil, 'disk_usage', return_value=type('Disk', (), {'free': ci.FLOOR})()), \
             patch.object(ci.importlib.machinery.PathFinder, 'find_spec', return_value=None):
            with self.assertRaisesRegex(RuntimeError, 'Python Playwright is not installed'):
                ci.prerequisites(self.lease)
        with patch.object(ci.os, 'geteuid', return_value=1000), \
             patch.object(ci.platform, 'system', return_value='Linux'), \
             patch.object(ci.platform, 'machine', return_value='x86_64'), \
             patch.object(ci.shutil, 'disk_usage', return_value=type('Disk', (), {'free': ci.FLOOR})()), \
             patch.object(ci.importlib.machinery.PathFinder, 'find_spec',
                          return_value=type('Spec', (), {'origin': '/missing/playwright/__init__.py'})()):
            with self.assertRaisesRegex(RuntimeError, 'coreBundle.js missing'):
                ci.prerequisites(self.lease)

    def test_child_argv_veto(self):
        for flag in ['--no-sandbox', '--disable-gpu-sandbox', '--enable-unsafe-swiftshader',
                     '--disable-web-security', '--disable-features=IsolateOrigins,site-per-process']:
            self.assertEqual(ci.unsafe_switches(['chrome', '--type=gpu-process', flag]), [flag])
        self.assertEqual(ci.unsafe_switches(['chrome', '--type=gpu-process', '--headless']), [])

    def test_hash_and_environment(self):
        with tempfile.TemporaryDirectory(dir=ci.ROOT / '.tmp/slipstream-x86-ci-checks') as folder:
            path = Path(folder) / 'input'
            path.write_bytes(b'abc')
            self.assertEqual(ci.digest(path), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
        env = ci.clean_env(Path('/owned/home'), Path('/owned/tmp'))
        self.assertEqual(set(env), {'HOME', 'TMPDIR', 'PATH', 'LANG', 'PYTHONDONTWRITEBYTECODE', 'PYTHONNOUSERSITE'})

    @unittest.skipUnless(sys.platform == 'linux', 'Linux subreaper')
    def test_hard_cleanup_deadline(self):
        code = '''import subprocess,sys,time
import slipstream_x86_ci as ci
c=ci.Children()
p=subprocess.Popen([sys.executable,'-c',"import signal,time;signal.signal(signal.SIGTERM,signal.SIG_IGN);print('ready',flush=True);time.sleep(30)"],stdout=subprocess.PIPE,text=True)
assert p.stdout.readline().strip()=='ready'
started=time.monotonic()
c.close(started+.4)
assert c.closed and not c.scan()
assert time.monotonic()-started < .8, 'cleanup exceeded hard bound'
'''
        result = subprocess.run([sys.executable, '-B', '-c', code], cwd=Path(ci.__file__).parent,
                                capture_output=True, text=True, timeout=3)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    @unittest.skipUnless(sys.platform == 'linux', 'Linux subreaper')
    def test_fake_detached_child_timeout(self):
        # Run subreaper in its own process, never adopt or signal test-host children.
        code = '''import pathlib, sys, tempfile
import slipstream_x86_ci as ci
with tempfile.TemporaryDirectory(dir=ci.ROOT / '.tmp/slipstream-x86-ci-checks') as d:
 p = pathlib.Path(d)
 c = ci.Children()
 try:
  ci.execute([sys.executable, '-c', "import os,time; pid=os.fork(); os.setsid() if pid==0 else None; time.sleep(30)"], p, ci.clean_env(p,p), p, 'fake', c, limit=.3)
 except RuntimeError as e:
  assert 'external timeout' in str(e), str(e)
 else:
  raise AssertionError('timeout not enforced')
 assert c.closed and not c.scan(), 'descendant closure unproven'
 print('fake timeout + detached descendant closure PASS')
'''
        result = subprocess.run([sys.executable, '-B', '-c', code], cwd=Path(ci.__file__).parent,
                                env=ci.clean_env(Path('/nonexistent'), Path('/nonexistent')),
                                capture_output=True, text=True, timeout=35)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('closure PASS', result.stdout)


if __name__ == '__main__':
    (ci.ROOT / '.tmp/slipstream-x86-ci-checks').mkdir(parents=True, exist_ok=True)
    unittest.main(verbosity=2)
