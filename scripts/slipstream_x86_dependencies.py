#!/usr/bin/env python3
"""Authorized remote-only wheel extraction. Never installs/downloads a browser."""
import datetime
from email.parser import BytesParser
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import platform
import re
import signal
import stat
import sys
import tempfile
import time
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
LOCK = ROOT / 'scripts/slipstream_x86_wheels.json'
DRIVER = '3258d1cf334c6afc95f22aa9c292436cb976b391e0437f1359c83b84f0cb9d66'
BUDGETS = {'transfer_bytes': 60000000, 'extract_bytes': 250000000,
           'workspace_bytes': 350000000, 'setup_seconds': 120}


def need(ok, message):
    if not ok:
        raise RuntimeError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def check_wheel(size, sha, pin):
    need(size == pin['size'] and sha == pin['sha256'], 'downloaded wheel hash/size mismatch')


def check_driver(sha, expected):
    need(sha == DRIVER == expected, 'extracted audited driver SHA mismatch; no execution')


def guard(env):
    import slipstream_x86_ci as ci
    ci.context(env)
    need(platform.system() == 'Linux' and platform.machine() == 'x86_64'
         and os.getuid() != 0 and os.geteuid() != 0, 'dependency setup requires non-root Linux x86_64; no Pi setup')
    need(sys.version_info[:2] == (3, 10), 'dependency wheel ABI requires Python3.10')
    base = Path(env.get('RUNNER_TEMP', ''))
    need(base.is_absolute() and base.is_dir() and not base.is_symlink(), 'RUNNER_TEMP required')
    need(base.stat().st_uid == os.geteuid(), 'RUNNER_TEMP must be owned by runner')
    need(ci.shutil.disk_usage(base).free >= ci.FLOOR + BUDGETS['workspace_bytes'], 'insufficient dependency disk budget above2GiB')
    return base


def safe_members(archive, remaining, ignored_data=()):
    members = archive.infolist()
    need(len(members) <= 5000, 'wheel member-count budget')
    names, skipped, selected = set(), set(), []
    for member in members:
        name = member.filename.rstrip('/')
        parts = name.split('/')
        label = repr(name[:200])
        need(name and not PurePosixPath(name).is_absolute() and '\\' not in name
             and '\x00' not in name and all(p not in ('', '.', '..') for p in parts), 'unsafe wheel member: ' + label)
        need(name not in names and not name.endswith('.pth'), 'duplicate/injecting wheel member: ' + label)
        need(stat.S_IFMT(member.external_attr >> 16) in (0, stat.S_IFREG, stat.S_IFDIR), 'wheel special file rejected: ' + label)
        names.add(name)
        if any(p.endswith('.data') for p in parts):
            need(name in ignored_data, 'unapproved wheel data member: ' + label)
            skipped.add(name)  # Exact authenticated C headers, never copied or executed.
        else:
            selected.append(member)
    need(skipped == set(ignored_data), 'expected optional header members missing')
    size = sum(m.file_size for m in members)
    need(size <= remaining, 'wheel extraction budget exceeded')
    return selected, size


def runtime_requirements(metadata):
    result = []
    for value in metadata.get_all('Requires-Dist', []):
        if ';' in value:
            requirement, marker = value.split(';', 1)
            need('extra ==' in marker, 'unsupported runtime dependency marker')
            continue  # No optional extras are requested.
        result.append(re.sub(r'\s+', '', value))
    return sorted(result)


def setup_packages(lease, env, audit):
    import slipstream_x86_ci as ci
    base = guard(env)  # Before network, mkdir, extraction or SDK import.
    raw_lock = LOCK.read_bytes()
    need(lease['dependencies'] == dict(BUDGETS, lock_sha256=digest(raw_lock)), 'dependency lease/pins mismatch')
    pins = json.loads(raw_lock)
    need(set(pins) == {'playwright', 'pyee', 'greenlet', 'typing_extensions'}, 'dependency closure mismatch')
    need(pins['playwright']['sha256'] == 'ba33bae6a13b3d9d354c751cb618af357d20fe1d57767cbcce52079bbef17ad3', 'Playwright wheel pin mismatch')
    work = Path(tempfile.mkdtemp(prefix='slipstream-deps-', dir=base))
    site = work / 'site'
    site.mkdir(mode=0o700)
    audit.update(downloadedBytes=0, extractedBytes=0, wheelHashes={}, completedWheels=[], droppedMembers={}, browserDownloads=0,
                 setupLocation='RUNNER_TEMP only', startedAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
    started = time.monotonic()
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), ci.NoRedirect())

    def check():
        need(time.monotonic() - started < BUDGETS['setup_seconds'], 'dependency setup deadline exceeded')
        need(ci.shutil.disk_usage(work).free >= ci.FLOOR, 'dependency disk floor reached')
        need(audit['downloadedBytes'] + audit['extractedBytes'] <= BUDGETS['workspace_bytes'], 'dependency workspace budget exceeded')

    def receive(url, limit, target=None):
        check()
        total, h, chunks = 0, hashlib.sha256(), []
        stream = target.open('xb') if target else None
        try:
            with opener.open(url, timeout=20) as response:
                need(response.status == 200 and response.url == url, 'dependency HTTPS response rejected')
                while True:
                    chunk = response.read(min(65536, limit - total + 1))
                    if not chunk:
                        break
                    total += len(chunk)
                    audit['downloadedBytes'] += len(chunk)
                    need(total <= limit and audit['downloadedBytes'] <= BUDGETS['transfer_bytes'], 'dependency transfer budget exceeded')
                    check()
                    h.update(chunk)
                    if stream:
                        stream.write(chunk)
                    else:
                        chunks.append(chunk)
        finally:
            if stream:
                stream.close()
        return total, h.hexdigest(), b''.join(chunks)

    def expired(*_):
        raise RuntimeError('120s dependency setup deadline')
    previous = signal.signal(signal.SIGALRM, expired)
    signal.setitimer(signal.ITIMER_REAL, BUDGETS['setup_seconds'])
    try:
        for name, pin in pins.items():
            audit.update(currentWheel=pin['filename'], stage='PyPI metadata', currentMember=None)
            _, _, body = receive('https://pypi.org/pypi/' + name + '/' + pin['version'] + '/json', 1000000)
            metadata = json.loads(body)
            info = metadata['info']
            need(info['name'].lower().replace('-', '_') == name and info['version'] == pin['version'], 'PyPI identity mismatch')
            published = [f for f in metadata['urls'] if f['filename'] == pin['filename']]
            need(len(published) == 1, 'PyPI wheel absent/ambiguous')
            official = published[0]
            need(official['url'] == pin['url'] and official['size'] == pin['size'] and
                 official['digests']['sha256'] == pin['sha256'] and pin['url'].startswith('https://files.pythonhosted.org/packages/'), 'PyPI provenance/hash mismatch')
            wheel = work / pin['filename']
            audit['stage'] = 'wheel download'
            size, sha, _ = receive(pin['url'], pin['size'], wheel)
            check_wheel(size, sha, pin)
            audit['wheelHashes'][name] = sha
            with zipfile.ZipFile(wheel) as archive:
                audit['stage'] = 'wheel identity'
                meta = [m for m in archive.infolist() if m.filename.endswith('.dist-info/METADATA')]
                need(len(meta) == 1 and meta[0].file_size <= 1000000, 'wheel metadata identity missing/oversize')
                package = BytesParser().parsebytes(archive.read(meta[0]))
                need(package['Name'].lower().replace('-', '_') == name and package['Version'] == pin['version'], 'wheel package identity mismatch')
                need(runtime_requirements(package) == sorted(re.sub(r'\s+', '', r) for r in pin['runtime_requires']), 'wheel runtime dependency closure mismatch')
                audit['stage'] = 'ZIP validation'
                ignored = pin.get('ignored_data_members', [])
                members, expanded = safe_members(archive, BUDGETS['extract_bytes'] - audit['extractedBytes'], ignored)
                audit['droppedMembers'][name] = ignored
                audit['stage'] = 'extraction'
                for member in members:
                    audit['currentMember'] = member.filename[:200]
                    check()
                    path = site / member.filename
                    if member.is_dir():
                        path.mkdir(parents=True, exist_ok=True)
                        continue
                    path.parent.mkdir(parents=True, exist_ok=True)
                    need(not path.exists(), 'cross-wheel file overwrite rejected')
                    with archive.open(member) as source, path.open('xb') as target:
                        while True:
                            chunk = source.read(65536)
                            if not chunk:
                                break
                            audit['extractedBytes'] += len(chunk)
                            need(audit['extractedBytes'] <= BUDGETS['extract_bytes'], 'actual extraction budget exceeded')
                            check()
                            target.write(chunk)
            need(audit['extractedBytes'] <= BUDGETS['extract_bytes'], 'extraction budget exceeded')
            audit['completedWheels'].append(name)
        audit.update(currentWheel=pins['playwright']['filename'], stage='driver verification', currentMember='playwright/driver/package/lib/coreBundle.js')
        driver = site / 'playwright/driver/package/lib/coreBundle.js'
        audit['driverSha256'] = ci.digest(driver)
        check_driver(audit['driverSha256'], lease['driver']['sha256'])
        node = site / 'playwright/driver/node'
        need(node.is_file() and not node.is_symlink(), 'bundled SDK Node missing')
        node.chmod(0o700)
        audit['elapsedSeconds'] = round(time.monotonic() - started, 3)
        return {'sitePath': str(site), 'setupRoot': str(work)}
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, previous)
