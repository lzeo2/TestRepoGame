#!/usr/bin/env python3
"""Tiny synthetic archives only: no network, SDK import, browser or driver."""
from email.parser import BytesParser
import io
import json
import os
from pathlib import Path
import stat
import unittest
from unittest.mock import patch
import zipfile

import slipstream_x86_dependencies as deps


def archive(names):
    body = io.BytesIO()
    with zipfile.ZipFile(body, 'w') as output:
        for name in names:
            output.writestr(name, b'test')
    body.seek(0)
    return zipfile.ZipFile(body)


class DependencyGuards(unittest.TestCase):
    def test_lock_closure_and_sizes(self):
        lock = json.loads(deps.LOCK.read_text())
        self.assertEqual(set(lock), {'playwright', 'pyee', 'greenlet', 'typing_extensions'})
        self.assertEqual(sum(p['size'] for p in lock.values()), 48444687)
        self.assertEqual(lock['playwright']['sha256'], 'ba33bae6a13b3d9d354c751cb618af357d20fe1d57767cbcce52079bbef17ad3')
        self.assertLess(sum(p['size'] for p in lock.values()) + 4000000, deps.BUDGETS['transfer_bytes'])
        self.assertEqual(deps.BUDGETS['setup_seconds'], 120)

    def test_safe_archive(self):
        with archive(['package/module.py', 'package-1.dist-info/METADATA']) as source:
            members, size = deps.safe_members(source, 100)
            self.assertEqual((len(members), size), (2, 8))

    def test_paths_and_budget(self):
        for name in ['../outside', '/absolute', 'a\\b', 'a/./b', 'a//b', 'inject.pth', 'package.data/purelib/a']:
            with self.subTest(name=name), archive([name]) as source, self.assertRaises(RuntimeError):
                deps.safe_members(source, 100)
        with archive(['large']) as source, self.assertRaisesRegex(RuntimeError, 'extraction budget'):
            deps.safe_members(source, 3)

    def test_only_exact_greenlet_headers_are_dropped(self):
        ignored = json.loads(deps.LOCK.read_text())['greenlet']['ignored_data_members']
        names = [ignored[0] + '/', ignored[1] + '/', ignored[2], 'greenlet/__init__.py']
        with archive(names) as source:
            selected, _ = deps.safe_members(source, 100, ignored)
            self.assertEqual([m.filename for m in selected], ['greenlet/__init__.py'])
        for bad in ['greenlet-3.2.4.data/scripts/run', 'greenlet-3.2.4.data/headers/inject.pth']:
            with archive(names + [bad]) as source, self.assertRaises(RuntimeError):
                deps.safe_members(source, 100, ignored)
        with archive(['other.data/scripts/run']) as source, self.assertRaises(RuntimeError):
            deps.safe_members(source, 100)

    def test_symlink(self):
        body = io.BytesIO()
        with zipfile.ZipFile(body, 'w') as output:
            info = zipfile.ZipInfo('link')
            info.external_attr = (stat.S_IFLNK | 0o777) << 16
            output.writestr(info, 'outside')
        body.seek(0)
        with zipfile.ZipFile(body) as source, self.assertRaisesRegex(RuntimeError, 'special file'):
            deps.safe_members(source, 100)

    def test_runtime_requirements(self):
        metadata = BytesParser().parsebytes(b'Requires-Dist: typing-extensions\nRequires-Dist: build; extra == "dev"\n')
        self.assertEqual(deps.runtime_requirements(metadata), ['typing-extensions'])
        unsupported = BytesParser().parsebytes(b'Requires-Dist: unknown; python_version < "3.12"\n')
        with self.assertRaises(RuntimeError):
            deps.runtime_requirements(unsupported)

    def test_local_setup_refused_before_network(self):
        with patch.object(deps.urllib.request, 'build_opener') as network:
            with self.assertRaises(RuntimeError):
                deps.setup_packages({}, {}, {})
            network.assert_not_called()

    def test_wrong_wheel_and_driver_refused(self):
        pin = {'size': 3, 'sha256': deps.digest(b'abc')}
        deps.check_wheel(3, pin['sha256'], pin)
        for size, sha in [(4, pin['sha256']), (3, 'a' * 64)]:
            with self.assertRaises(RuntimeError):
                deps.check_wheel(size, sha, pin)
        deps.check_driver(deps.DRIVER, deps.DRIVER)
        with self.assertRaises(RuntimeError):
            deps.check_driver('a' * 64, deps.DRIVER)
        with self.assertRaises(RuntimeError):
            deps.check_driver(deps.DRIVER, 'a' * 64)

    def test_digest(self):
        self.assertEqual(deps.digest(b'abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')


if __name__ == '__main__':
    unittest.main(verbosity=2)
